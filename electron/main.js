import { app, BrowserWindow, ipcMain, nativeImage, protocol, net } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
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

  // Proxy media:// -> file:// so the renderer can stream local audio files
  protocol.handle('media', (request) => {
    return net.fetch(request.url.replace(/^media:\/\//, 'file://'));
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
