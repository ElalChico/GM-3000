// Puente seguro entre el proceso principal de Electron y el renderizador (React)
// contextIsolation: false — asignamos directamente a window
const { ipcRenderer } = require('electron');

window.electronAPI = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  openTransmissionsWindow: () => ipcRenderer.send('open-transmissions-window'),

  // Export data (PGN, analysis, audio)
  exportData: (options) => ipcRenderer.invoke('export-data', options),

  // Confirm exit
  onConfirmExitRequest: (callback) => ipcRenderer.on('confirm-exit-request', callback),
  confirmExitActual: () => ipcRenderer.send('confirm-exit-actual'),
  removeConfirmExitListener: () => ipcRenderer.removeAllListeners('confirm-exit-request'),

  // TTS synthesis via main process (edge-tts)
  synthesizeSpeech: (options) => ipcRenderer.invoke('tts-synthesize', options),
  listVoices: () => ipcRenderer.invoke('tts-list-voices'),
};
