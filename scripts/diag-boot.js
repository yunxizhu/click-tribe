/**
 * 用裸 Electron 加载 index.html（无 tribe 协议）验证游戏能启动。
 * boot 在无 preload 时应走相对路径 config/。
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { zoomFactor: 1 },
  });
  win.webContents.on('console-message', (_e, level, message) => {
    console.log('CON', level, message);
  });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    ready = await win.webContents.executeJavaScript('!!window.game');
    if (ready) break;
  }

  const tip = await win.webContents.executeJavaScript(`({
    hasGame: !!window.game,
    useTribe: !!window.__TRIBE_EXTERNAL_PROTOCOL__,
    cfg: window.__TRIBE_CONFIG_BASE__,
    bootError: !!document.body.innerText.includes('资源加载失败'),
    forestCount: GAME_DATA?.resourcePoints?.forest?.baseMaxCount,
    forestCd: GAME_DATA?.resourcePoints?.forest?.baseCooldown,
    toolSpd1: GAME_DATA?.villagerWork?.toolSpeedByLevel?.[1],
    toolDur1: GAME_DATA?.toolDurability?.maxByLevel?.[1],
    externalConfigs: window.__TRIBE_EXTERNAL_CONFIGS__,
  })`);

  console.log(JSON.stringify({ ready, ...tip }, null, 2));
  if (!ready || tip.bootError) {
    console.error('BOOT_FAILED');
    app.exit(1);
    return;
  }
  if (tip.forestCount !== 15 || tip.toolSpd1 !== 0.25) {
    console.error('CONFIG_APPLY_FAILED', tip);
    app.exit(1);
    return;
  }
  console.log('BOOT_OK');
  app.exit(0);
});
