const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  moveWindow: (screenX, screenY, deltaX, deltaY) => {
    ipcRenderer.send('move-window', deltaX, deltaY);
  },
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  showPetMenu: () => ipcRenderer.send('show-pet-menu'),
  getCurrentAgentState: () => ipcRenderer.invoke('get-current-agent-state'),
  getSetupStatus: () => ipcRenderer.invoke('setup:get-status'),
  installDetectedHooks: () => ipcRenderer.invoke('setup:install-hooks'),
  sendTestEvent: (agent) => ipcRenderer.invoke('setup:test-event', agent),
  checkForUpdates: () => ipcRenderer.invoke('setup:check-updates'),
  openRelease: (url) => ipcRenderer.invoke('setup:open-release', url),
  finishSetup: () => ipcRenderer.send('setup:finish'),
  onSetupStatusChanged: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('setup-status-changed', handler);
    return () => ipcRenderer.removeListener('setup-status-changed', handler);
  },
  onAgentState: (callback) => {
    const handler = (event, snapshot) => callback(snapshot);
    ipcRenderer.on('agent-state', handler);
    return () => ipcRenderer.removeListener('agent-state', handler);
  }
});
