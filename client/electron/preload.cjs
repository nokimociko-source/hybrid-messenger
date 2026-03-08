const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC API to renderer
contextBridge.exposeInMainWorld('electron', {
    showNotification: (options) => ipcRenderer.invoke('show-notification', options)
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('Hybrid Messenger Preload Loaded');
});
