const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { zoomFactor: 1 },
  });
  win.maximize();
  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 2500));
  const info = await win.webContents.executeJavaScript(`(() => {
    const main = document.querySelector('.game-main');
    const cs = getComputedStyle(main);
    const L = document.querySelector('.sidebar.left')?.getBoundingClientRect();
    const R = document.querySelector('.sidebar.right')?.getBoundingClientRect();
    const C = document.querySelector('.center-panel')?.getBoundingClientRect();
    return {
      innerWidth,
      innerHeight,
      grid: cs.gridTemplateColumns,
      uiScale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
      fontSize: getComputedStyle(document.documentElement).fontSize,
      left: L && { x: L.x, w: L.width, y: L.y },
      center: C && { x: C.x, w: C.width },
      right: R && { x: R.x, w: R.width },
      threeCol: !!(L && C && R && L.width > 50 && C.width > 50 && R.width > 50 && C.x > L.x && R.x > C.x),
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));
  app.quit();
});
