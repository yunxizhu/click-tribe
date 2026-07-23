/**
 * 用 Chromium 用户代理加载 index.html（等同直接打开 HTML），探测防务侧栏点击命中。
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    webPreferences: { zoomFactor: 1 },
  });
  // 故意不加载 electron-preload：应走相对路径 config/（与直接打开 HTML 一致）
  win.webContents.on('console-message', (_e, level, message) => {
    console.log('CON', level, message);
  });

  const indexPath = path.join(__dirname, '..', 'index.html');
  await win.loadFile(indexPath);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const ready = await win.webContents.executeJavaScript('!!window.game');
    console.log('t', i, 'game', ready);
    if (ready) break;
  }

  const info = await win.webContents.executeJavaScript(`(() => {
    const g = window.game;
    if (!g) return { hasGame: false };
    try {
      // 等同已选难度、已关介绍后的正常游玩
      document.getElementById('difficulty-select')?.classList.add('hidden');
      document.getElementById('defense-intro')?.classList.add('hidden');
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      document.body.classList.remove('tut-interaction-lock');
      g.paused = false;
      if (g.state.defense) g.state.defense.introSeen = true;
      if (g.state.tutorial) { g.state.tutorial.completed = true; g.state.tutorial.skipped = true; }
      g.state.activeTab = 'defense';
      g._showDefenseOverlay?.();
      g.render?.();
    } catch (e) {
      return { hasGame: true, err: String(e) };
    }
    const overlay = document.getElementById('defense-overlay');
    const side = overlay?.querySelector('.defense-side');
    const stance = document.querySelector('.btn-defense-stance');
    const inc = document.querySelector('.btn-defense-post-inc');
    const sidebar = document.querySelector('.sidebar.right');
    const panel = document.querySelector('.sidebar-panel-main');
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return { empty: true, r: { x: r.x, y: r.y, w: r.width, h: r.height } };
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      const chain = [];
      let n = hit;
      for (let i = 0; i < 8 && n; i++) {
        chain.push(n.id || (typeof n.className === 'string' ? n.className.slice(0, 40) : n.tagName));
        n = n.parentElement;
      }
      return {
        x, y,
        r: { x: r.x, y: r.y, w: r.width, h: r.height },
        hitTag: hit?.tagName,
        hitId: hit?.id,
        hitCls: String(hit?.className || '').slice(0, 80),
        chain,
        same: hit === el || el.contains(hit),
      };
    };
    const pe = (el) => el && getComputedStyle(el).pointerEvents;
    const zi = (el) => el && getComputedStyle(el).zIndex;
    // 探测委托是否挂上：模拟点击姿态按钮
    let stanceBefore = g.ensureDefenseState?.()?.stance;
    g.setDefenseStance('defend');
    stanceBefore = g.ensureDefenseState?.()?.stance;
    // 用侧栏中心命中的真实按钮触发 click()
    const sideHit = pick(side);
    const liveBtn = document.elementFromPoint(sideHit.x, sideHit.y);
    const stanceEl = liveBtn?.closest?.('.btn-defense-stance');
    // 找出击按钮真实节点
    const attackLive = [...document.querySelectorAll('.btn-defense-stance[data-stance="attack"]')]
      .find((b) => b.getClientRects().length && b.getBoundingClientRect().width > 0);
    attackLive?.click();
    let stanceAfter = g.ensureDefenseState?.()?.stance;
    const incLive = [...document.querySelectorAll('.btn-defense-post-inc')]
      .find((b) => b.getClientRects().length && b.getBoundingClientRect().width > 0);
    const postsBefore = { ...(g.ensureDefenseState()?.posts || {}) };
    incLive?.click();
    const postsAfter = { ...(g.ensureDefenseState()?.posts || {}) };
    return {
      hasGame: true,
      tab: g.state.activeTab,
      overlayHidden: overlay?.classList.contains('hidden'),
      overlayPE: pe(overlay),
      overlayZI: zi(overlay),
      sidePE: pe(side),
      sidebarPE: pe(sidebar),
      panelPE: pe(panel),
      rightNavZI: zi(document.querySelector('.right-nav')),
      hasStance: !!stance,
      hasInc: !!inc,
      hitStance: pick(attackLive),
      hitInc: pick(incLive),
      hitSide: sideHit,
      hitPanel: pick(panel),
      stanceBefore,
      stanceAfter,
      postsBefore,
      postsAfter,
      stanceElCls: stanceEl && String(stanceEl.className),
      patchedDeleg: String(g.setupEventDelegation?.name || ''),
      formationBound: !!g._formationDragBound,
      bodyTutLock: document.body.classList.contains('tut-interaction-lock'),
      diffHidden: document.getElementById('difficulty-select')?.classList.contains('hidden'),
      introHidden: document.getElementById('defense-intro')?.classList.contains('hidden'),
    };
  })()`);

  console.log(JSON.stringify(info, null, 2));
  app.quit();
});
