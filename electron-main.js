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

const SAVE_SLOTS = ['a', 'b', 'c'];

function normalizeSaveSlot(slot) {
  const s = String(slot || 'a').toLowerCase();
  return SAVE_SLOTS.includes(s) ? s : 'a';
}

function getSaveFilePath(slot) {
  return path.join(getSavesDir(), `slot-${normalizeSaveSlot(slot)}.json`);
}

function getLegacySaveFilePath() {
  return path.join(getSavesDir(), 'factoryGame.json');
}

/** 旧单档 factoryGame.json → A 档（仅当三档皆空时迁移） */
function migrateLegacySaveFile() {
  const legacy = getLegacySaveFilePath();
  if (!fs.existsSync(legacy)) return;
  const anySlot = SAVE_SLOTS.some((s) => fs.existsSync(getSaveFilePath(s)));
  if (anySlot) return;
  try {
    fs.renameSync(legacy, getSaveFilePath('a'));
  } catch (_) {
    try {
      fs.copyFileSync(legacy, getSaveFilePath('a'));
      fs.unlinkSync(legacy);
    } catch (__) { /* ignore */ }
  }
}

function readSaveMeta(slot) {
  const p = getSaveFilePath(slot);
  if (!fs.existsSync(p)) return { slot, empty: true };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      slot,
      empty: false,
      day: Number(data.day) || 1,
      difficulty: data.difficulty || 'normal',
      lastSaveTime: data.lastSaveTime || null,
      gameOver: !!data.gameOver,
      villagers: Number(data.workers?.total) || 0,
    };
  } catch (_) {
    return { slot, empty: false, corrupt: true };
  }
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
  migrateLegacySaveFile();

  ipcMain.handle('tribe-save-read', (_evt, slot) => {
    migrateLegacySaveFile();
    const p = getSaveFilePath(slot);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  });
  ipcMain.handle('tribe-save-write', (_evt, slot, raw) => {
    // 兼容旧调用：只传 raw 字符串时写入 A 档
    if (typeof slot === 'string' && raw === undefined && slot.trim().startsWith('{')) {
      raw = slot;
      slot = 'a';
    }
    if (typeof raw !== 'string') throw new Error('save payload must be string');
    if (Buffer.byteLength(raw, 'utf8') > SAVE_MAX_BYTES) {
      throw new Error('save too large');
    }
    const p = getSaveFilePath(slot);
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, raw, 'utf8');
    fs.renameSync(tmp, p);
    return true;
  });
  ipcMain.handle('tribe-save-clear', (_evt, slot) => {
    migrateLegacySaveFile();
    if (slot == null || slot === '' || slot === '*') {
      SAVE_SLOTS.forEach((s) => {
        const p = getSaveFilePath(s);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      const legacy = getLegacySaveFilePath();
      if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
      return true;
    }
    const p = getSaveFilePath(slot);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  });
  ipcMain.handle('tribe-save-exists', (_evt, slot) => {
    migrateLegacySaveFile();
    if (slot == null || slot === '' || slot === '*') {
      return SAVE_SLOTS.some((s) => fs.existsSync(getSaveFilePath(s)));
    }
    return fs.existsSync(getSaveFilePath(slot));
  });
  ipcMain.handle('tribe-save-list-meta', () => {
    migrateLegacySaveFile();
    return SAVE_SLOTS.map((s) => readSaveMeta(s));
  });
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
