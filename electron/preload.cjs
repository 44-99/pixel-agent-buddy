const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  moveWindow: (screenX, screenY, deltaX, deltaY) => {
    ipcRenderer.send('move-window', deltaX, deltaY);
  },
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  hideWindow: () => ipcRenderer.send('hide-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  getCurrentAgentState: () => ipcRenderer.invoke('get-current-agent-state'),
  onAgentState: (callback) => {
    const handler = (event, snapshot) => callback(snapshot);
    ipcRenderer.on('agent-state', handler);
    return () => ipcRenderer.removeListener('agent-state', handler);
  }
});
