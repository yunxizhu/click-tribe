const { app, BrowserWindow, protocol, net, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

/**
 * 外置资源根目录：
 * - 开发：项目根目录（含 music/、config/）
 * - 打包后：exe 同级目录（可单独替换 music、配置，无需重打 exe）
 */
function getExternalRoot() {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  return __dirname;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tribe',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

function resolveExternalFile(kind, relPath) {
  const root = path.resolve(getExternalRoot(), kind);
  const full = path.resolve(root, relPath);
  const rel = path.relative(root, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return full;
}

function createWindow() {
  const work = screen.getPrimaryDisplay().workAreaSize;
  // 按工作区给足宽度，避免 <1180px 触发 CSS 单列布局（与浏览器全屏/大窗不一致）
  const width = Math.min(1680, Math.max(1280, Math.floor(work.width * 0.92)));
  const height = Math.min(1000, Math.max(800, Math.floor(work.height * 0.92)));

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 1200,
    minHeight: 720,
    useContentSize: true,
    show: false,
    title: '点击部落',
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      zoomFactor: 1,
    },
  });

  win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
  });

  win.once('ready-to-show', () => {
    // 默认最大化，视口接近浏览器全屏打开 HTML 的体验
    win.maximize();
    win.show();
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  protocol.handle('tribe', (request) => {
    try {
      const url = new URL(request.url);
      const kind = url.hostname;
      if (kind !== 'music' && kind !== 'config') {
        return new Response('Not Found', { status: 404 });
      }
      const rel = decodeURIComponent((url.pathname || '/').replace(/^\/+/, ''));
      if (!rel) return new Response('Not Found', { status: 404 });
      const full = resolveExternalFile(kind, rel);
      if (!full) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(full).href);
    } catch (err) {
      console.error('[tribe protocol]', err);
      return new Response('Error', { status: 500 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
