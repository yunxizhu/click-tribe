const { app, BrowserWindow, protocol, net, screen, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/**
 * 外置资源根目录：
 * - 开发：项目根目录（含 music/、config/、image/、saves/）
 * - 打包后：exe 同级目录（可单独替换 music、image、配置、存档，无需重打 exe）
 */
function getExternalRoot() {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  return __dirname;
}

function getSavesDir() {
  const dir = path.join(getExternalRoot(), 'saves');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSaveFilePath() {
  return path.join(getSavesDir(), 'factoryGame.json');
}

function getSettingsFilePath() {
  return path.join(getSavesDir(), 'settings.json');
}

const SAVE_MAX_BYTES = 8 * 1024 * 1024;

function getMainWindow() {
  const wins = BrowserWindow.getAllWindows();
  return wins.find((w) => !w.isDestroyed()) || null;
}

function registerSaveIpc() {
  ipcMain.handle('tribe-save-read', () => {
    const p = getSaveFilePath();
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  });
  ipcMain.handle('tribe-save-write', (_evt, raw) => {
    if (typeof raw !== 'string') throw new Error('save payload must be string');
    if (Buffer.byteLength(raw, 'utf8') > SAVE_MAX_BYTES) {
      throw new Error('save too large');
    }
    const p = getSaveFilePath();
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, raw, 'utf8');
    fs.renameSync(tmp, p);
    return true;
  });
  ipcMain.handle('tribe-save-clear', () => {
    const p = getSaveFilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  });
  ipcMain.handle('tribe-save-exists', () => fs.existsSync(getSaveFilePath()));
  ipcMain.handle('tribe-app-quit', () => {
    app.quit();
    return true;
  });

  ipcMain.handle('tribe-settings-read', () => {
    const p = getSettingsFilePath();
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  });
  ipcMain.handle('tribe-settings-write', (_evt, raw) => {
    if (typeof raw !== 'string') throw new Error('settings payload must be string');
    if (Buffer.byteLength(raw, 'utf8') > 256 * 1024) throw new Error('settings too large');
    const p = getSettingsFilePath();
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, raw, 'utf8');
    fs.renameSync(tmp, p);
    return true;
  });

  ipcMain.handle('tribe-display-get', () => {
    const win = getMainWindow();
    const display = screen.getPrimaryDisplay();
    const area = display.workAreaSize;
    if (!win) {
      return {
        fullscreen: app.isPackaged,
        width: area.width,
        height: area.height,
        screenWidth: area.width,
        screenHeight: area.height,
      };
    }
    const [width, height] = win.getSize();
    return {
      fullscreen: win.isFullScreen(),
      width,
      height,
      screenWidth: area.width,
      screenHeight: area.height,
    };
  });

  ipcMain.handle('tribe-display-set', (_evt, opts = {}) => {
    const win = getMainWindow();
    if (!win) return false;
    const display = screen.getPrimaryDisplay();
    const area = display.workArea;
    const mode = opts.mode === 'windowed' ? 'windowed' : 'fullscreen';
    if (mode === 'fullscreen') {
      win.setFullScreen(true);
      return true;
    }
    win.setFullScreen(false);
    let w = Math.max(1280, Math.floor(Number(opts.width) || 1280));
    let h = Math.max(720, Math.floor(Number(opts.height) || 720));
    w = Math.min(w, area.width);
    h = Math.min(h, area.height);
    const x = area.x + Math.max(0, Math.floor((area.width - w) / 2));
    const y = area.y + Math.max(0, Math.floor((area.height - h) / 2));
    win.setBounds({ x, y, width: w, height: h });
    return true;
  });
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
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const packaged = app.isPackaged;

  const win = new BrowserWindow({
    x: work.x,
    y: work.y,
    width: Math.max(1200, work.width),
    height: Math.max(720, work.height),
    minWidth: 1200,
    minHeight: 720,
    show: false,
    title: '点击部落',
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
    // 发行包：无系统标题栏 + 真全屏；开发时保留窗口边框方便调试
    frame: !packaged,
    fullscreen: packaged,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      zoomFactor: 1,
      backgroundThrottling: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
    win.webContents.insertCSS('html,body{background:#1a1a2e!important;margin:0;width:100%;height:100%;overflow:hidden;}').catch(() => {});
  });

  win.once('ready-to-show', () => {
    if (packaged) {
      win.setFullScreen(true);
    } else {
      const wa = screen.getPrimaryDisplay().workArea;
      win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
    }
    win.show();
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerSaveIpc();
  protocol.handle('tribe', (request) => {
    try {
      const url = new URL(request.url);
      const kind = url.hostname;
      if (kind !== 'music' && kind !== 'config' && kind !== 'image') {
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
