/**
 * 仅由 electron-main 加载。标记「可用 tribe:// 外置资源协议」。
 * 直接打开 HTML、或未走主进程的 Electron 脚本都没有此标记，boot 会用相对路径 config/、music/。
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__TRIBE_EXTERNAL_PROTOCOL__', true);
