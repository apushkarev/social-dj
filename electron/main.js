import { app, BrowserWindow, ipcMain, nativeImage, protocol, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, extname } from 'path';
import { writeFileSync, mkdirSync, statSync, createReadStream } from 'fs';
import { Readable } from 'stream';
import plist from 'plist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#00141a',
    headerStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }
}

// --- iTunes Library parser ---

function toCamelCase(key) {
  return key.split(' ').map((word, i) => {
    const lower = word.toLowerCase();
    return i === 0 ? lower : lower[0].toUpperCase() + lower.slice(1);
  }).join('');
}

function convertTrack(raw) {
  const track = {};
  for (const [key, value] of Object.entries(raw)) {
    track[toCamelCase(key)] = value;
  }
  return track;
}

function convertPlaylist(raw) {
  const item = {
    id: raw['Playlist Persistent ID'],
    name: raw['Name'] ?? '',
    parentId: raw['Parent Persistent ID'] ?? null,
  };

  if (raw['Folder'] === true) {
    item.type = 'folder';
    item.children = [];
  } else {
    item.type = 'playlist';
    item.trackIds = (raw['Playlist Items'] ?? []).map(t => t['Track ID']);
  }

  if (raw['Description'])        item.description      = raw['Description'];
  if (raw['Master'] === true)    item.master           = true;
  if (raw['Visible'] === false)  item.visible          = false;
  if (raw['Smart Info'])         item.smart            = true;
  if (raw['Distinguished Kind'] != null) item.distinguishedKind = raw['Distinguished Kind'];

  return item;
}

function buildHierarchy(flatItems) {
  const byId = new Map();
  flatItems.forEach(item => byId.set(item.id, item));

  const roots = [];

  for (const item of flatItems) {
    if (item.parentId && byId.has(item.parentId)) {
      const parent = byId.get(item.parentId);
      if (!parent.children) parent.children = [];
      parent.children.push(item);
    } else {
      roots.push(item);
    }
  }

  const index = {};

  function walk(nodes, pathSoFar) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const currentPath = [...pathSoFar, i];
      index[node.id] = currentPath;
      if (node.children) walk(node.children, currentPath);
    }
  }

  walk(roots, []);

  return { hierarchy: roots, index };
}

ipcMain.handle('save-hierarchy', (_event, data) => {
  try {
    const libraryDir = resolve(__dirname, '..', 'public', 'library');
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(resolve(libraryDir, 'hierarchy.json'), JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

const DRAG_ICON = nativeImage.createFromPath(
  resolve(__dirname, '..', 'public', 'drag_image.png')
);

ipcMain.on('start-file-drag', (event, fileUrlPaths) => {
  const filePaths = fileUrlPaths.map(url => {
    try { return fileURLToPath(url); } catch { return null; }
  }).filter(Boolean);

  if (filePaths.length) {
    try { event.sender.startDrag({ files: filePaths, icon: DRAG_ICON }); } catch {}
  }

  event.returnValue = null;
});

ipcMain.on('show-in-folder', (_event, fileUrl) => {
  try {
    shell.showItemInFolder(fileURLToPath(fileUrl));
  } catch {}
});

ipcMain.on('write-app-state', (_event, data) => {
  try {
    const publicDir = resolve(__dirname, '..', 'public');
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(resolve(publicDir, 'app-state.json'), JSON.stringify(data, null, 2));
  } catch {}
});

ipcMain.handle('parse-itunes-library', async (_event, xmlContent) => {
  try {
    const lib = plist.parse(xmlContent);

    const rawTracks = lib['Tracks'] ?? {};
    const tracks = {};
    for (const [id, rawTrack] of Object.entries(rawTracks)) {
      tracks[id] = convertTrack(rawTrack);
    }

    const rawPlaylists = lib['Playlists'] ?? [];
    const flatItems = rawPlaylists.map(convertPlaylist);
    const { hierarchy, index } = buildHierarchy(flatItems);

    const libraryDir = resolve(__dirname, '..', 'public', 'library');
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(resolve(libraryDir, 'tracks.json'), JSON.stringify({ tracks }));
    writeFileSync(resolve(libraryDir, 'hierarchy.json'), JSON.stringify({ hierarchy, index }));

    return { success: true, data: { tracks, hierarchy, index } };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.setName('Social DJ');
app.whenReady().then(() => {

  // Proxy media:// -> file:// so the renderer can stream local audio files.
  // Handles Range requests manually (net.fetch ignores Range for file:// URLs),
  // which is required for seeking in large/VBR files that aren't fully buffered.
  protocol.handle('media', (request) => {

    let filePath;
    try {
      filePath = fileURLToPath(request.url.replace(/^media:\/\//, 'file://'));
    } catch {
      return new Response(null, { status: 400 });
    }

    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      return new Response(null, { status: 404 });
    }

    const fileSize = stat.size;

    const mimeMap = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/ogg',
      '.aiff': 'audio/aiff',
      '.aif': 'audio/aiff',
    };
    const contentType = mimeMap[extname(filePath).toLowerCase()] ?? 'audio/mpeg';

    const rangeHeader = request.headers.get('Range');

    if (rangeHeader) {
      const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const webStream = Readable.toWeb(createReadStream(filePath, { start, end }));

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': contentType,
          },
        });
      }
    }

    const webStream = Readable.toWeb(createReadStream(filePath));

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
      },
    });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
