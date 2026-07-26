/**
 * 仅由 electron-main 加载。
 * - 标记可用 tribe:// 外置资源协议
 * - 存档 / 设置 / 显示模式 / 退出
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__TRIBE_EXTERNAL_PROTOCOL__', true);

contextBridge.exposeInMainWorld('__TRIBE_SAVE_API__', {
  read: () => ipcRenderer.invoke('tribe-save-read'),
  write: (raw) => ipcRenderer.invoke('tribe-save-write', raw),
  clear: () => ipcRenderer.invoke('tribe-save-clear'),
  exists: () => ipcRenderer.invoke('tribe-save-exists'),
  quit: () => ipcRenderer.invoke('tribe-app-quit'),
  settingsRead: () => ipcRenderer.invoke('tribe-settings-read'),
  settingsWrite: (raw) => ipcRenderer.invoke('tribe-settings-write', raw),
  displayGet: () => ipcRenderer.invoke('tribe-display-get'),
  displaySet: (opts) => ipcRenderer.invoke('tribe-display-set', opts),
});
