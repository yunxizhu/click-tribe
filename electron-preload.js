/**
 * 仅由 electron-main 加载。
 * - 标记可用 tribe:// 外置资源协议
 * - 存档 / 设置 / 显示模式 / 退出
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__TRIBE_EXTERNAL_PROTOCOL__', true);

contextBridge.exposeInMainWorld('__TRIBE_SAVE_API__', {
  /** @param {'a'|'b'|'c'} [slot] */
  read: (slot) => ipcRenderer.invoke('tribe-save-read', slot || 'a'),
  /** @param {'a'|'b'|'c'} slot @param {string} raw */
  write: (slot, raw) => ipcRenderer.invoke('tribe-save-write', slot || 'a', raw),
  /** @param {'a'|'b'|'c'|'*'} [slot] 省略或 '*' 清空全部档位 */
  clear: (slot) => ipcRenderer.invoke('tribe-save-clear', slot == null ? '*' : slot),
  /** @param {'a'|'b'|'c'|'*'} [slot] 省略或 '*' 表示任一档是否存在 */
  exists: (slot) => ipcRenderer.invoke('tribe-save-exists', slot == null ? '*' : slot),
  listMeta: () => ipcRenderer.invoke('tribe-save-list-meta'),
  quit: () => ipcRenderer.invoke('tribe-app-quit'),
  settingsRead: () => ipcRenderer.invoke('tribe-settings-read'),
  settingsWrite: (raw) => ipcRenderer.invoke('tribe-settings-write', raw),
  displayGet: () => ipcRenderer.invoke('tribe-display-get'),
  displaySet: (opts) => ipcRenderer.invoke('tribe-display-set', opts),
});
