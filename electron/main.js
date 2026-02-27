import { app, BrowserWindow, dialog, ipcMain, nativeImage, protocol, shell, screen } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve, extname, basename } from 'path';
import { writeFileSync, readFileSync, mkdirSync, statSync, createReadStream } from 'fs';
import { randomBytes } from 'crypto';
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

// --- VDJ database parser ---

// Finds and returns raw metadata for a single song from the VDJ XML string.
// filePath must match the VDJ <Song FilePath="..."> attribute exactly
// (raw filesystem path, not URI-encoded).
function findVdjSong(xmlContent, filePath) {

  const searchStr = `FilePath="${filePath}"`;
  const filePathIdx = xmlContent.indexOf(searchStr);
  if (filePathIdx === -1) return null;

  const songStart = xmlContent.lastIndexOf('<Song ', filePathIdx);
  if (songStart === -1) return null;

  const songEnd = xmlContent.indexOf('</Song>', filePathIdx);
  if (songEnd === -1) return null;

  const block = xmlContent.slice(songStart, songEnd + 7);

  const getAttr = (str, name) => {
    const m = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(str);
    return m ? m[1] : null;
  };

  const tagsMatch  = /<Tags\b([^>]*)\/?>/i.exec(block);
  const infosMatch = /<Infos\b([^>]*)\/?>/i.exec(block);
  const scanMatch  = /<Scan\b([^>]*)\/?>/i.exec(block);
  const commentMatch = /<Comment>([^<]*)<\/Comment>/i.exec(block);

  const tagsAttrs  = tagsMatch  ? tagsMatch[1]  : '';
  const infosAttrs = infosMatch ? infosMatch[1] : '';
  const scanAttrs  = scanMatch  ? scanMatch[1]  : '';

  const scanBpm  = parseFloat(getAttr(scanAttrs,  'Bpm') ?? '0');
  const tagsBpm  = parseFloat(getAttr(tagsAttrs,  'Bpm') ?? '0');
  const bpmRaw   = scanBpm || tagsBpm || 0;

  return {
    title:        getAttr(tagsAttrs,  'Title'),
    author:       getAttr(tagsAttrs,  'Author'),
    bpm:          bpmRaw ? Math.round(60 / bpmRaw) : 0,
    totalTime:    Math.round(parseFloat(getAttr(infosAttrs, 'SongLength') ?? '0') * 1000),
    lastModified: parseInt(getAttr(infosAttrs, 'LastModified') ?? '0', 10),
    firstSeen:    parseInt(getAttr(infosAttrs, 'FirstSeen')    ?? '0', 10),
    comment:      commentMatch ? commentMatch[1].trim() : '',
  };
}

ipcMain.handle('add-track', (_event, filePath, vdjDbPath) => {
  try {
    const libraryDir = resolve(__dirname, '..', 'public', 'library');
    const tracksPath = resolve(libraryDir, 'tracks.json');

    const { tracks } = JSON.parse(readFileSync(tracksPath, 'utf-8'));

    // Return existing track if already in library (same location)
    const location = pathToFileURL(filePath).href;
    const existing = Object.values(tracks).find(t => t.location === location);
    if (existing) return { success: true, track: existing };

    // New track ID
    const ids = Object.keys(tracks).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
    const newId = ids.length ? Math.max(...ids) + 1 : 1;

    const persistentId = randomBytes(8).toString('hex').toUpperCase();

    // Metadata defaults — derived from filename if VDJ lookup fails
    let name     = basename(filePath, extname(filePath));
    let artist   = '';
    let bpm      = 0;
    let totalTime = 0;
    let comments  = '';
    let dateModified = new Date().toISOString();
    let dateAdded    = new Date().toISOString();

    if (vdjDbPath) {
      try {
        const vdjContent = readFileSync(vdjDbPath, 'utf-8');
        const song = findVdjSong(vdjContent, filePath);

        if (song) {
          if (song.title)        name     = song.title;
          if (song.author)       artist   = song.author;
          if (song.bpm)          bpm      = song.bpm;
          if (song.totalTime)    totalTime = song.totalTime;
          if (song.comment)      comments = song.comment;
          if (song.lastModified) dateModified = new Date(song.lastModified * 1000).toISOString();
          if (song.firstSeen)    dateAdded    = new Date(song.firstSeen    * 1000).toISOString();
        }
      } catch {}
    }

    const track = {
      trackId:     newId,
      name,
      artist,
      totalTime,
      bpm,
      structure:   [],
      beatgrid:    0,
      tags:        [],
      dateModified,
      dateAdded,
      comments,
      persistentId,
      trackType:   'File',
      location,
    };

    tracks[String(newId)] = track;
    writeFileSync(tracksPath, JSON.stringify({ tracks }, null, 2));

    return { success: true, track };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-tracks', (_event, trackIds) => {
  try {
    const tracksPath = resolve(__dirname, '..', 'public', 'library', 'tracks.json');
    const { tracks } = JSON.parse(readFileSync(tracksPath, 'utf-8'));

    for (const id of trackIds) delete tracks[String(id)];

    writeFileSync(tracksPath, JSON.stringify({ tracks }, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

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

ipcMain.handle('show-open-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return dialog.showOpenDialog(win, options);
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

  // Returns cursor position in window-local coordinates.
  // Called during native drag when pointer events stop firing in the renderer.
  ipcMain.handle('get-cursor-screen-point', () => {
    const { x, y } = screen.getCursorScreenPoint();
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return null;
    const bounds = win.getContentBounds();
    return { x: x - bounds.x, y: y - bounds.y };
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
