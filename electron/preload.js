const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  parseLibrary: (xmlContent) => ipcRenderer.invoke('parse-itunes-library', xmlContent),
  writeAppState: (data) => ipcRenderer.send('write-app-state', data),
});
