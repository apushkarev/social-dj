const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  parseLibrary: (xmlContent) => ipcRenderer.invoke('parse-itunes-library', xmlContent),
  startFileDrag: (fileUrlPaths) => ipcRenderer.sendSync('start-file-drag', fileUrlPaths),
  writeAppState: (data) => ipcRenderer.send('write-app-state', data),
  saveHierarchy: (data) => ipcRenderer.invoke('save-hierarchy', data),
  showInFolder: (fileUrl) => ipcRenderer.send('show-in-folder', fileUrl),
});
