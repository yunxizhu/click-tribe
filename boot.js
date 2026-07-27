/**
 * ??????????????? + ?????
 * - ?? Electron?preload ????tribe://config|music|image ? exe/????????
 * - ???? HTML / ???????????? config/?music/?image/
 *
 * ?????????????????
 *   1) ?? EXTERNAL_CONFIGS
 *   2) scripts/pack-game.js ? CONFIG_FILES
 *   3) config/??.txt
 * ??????? pack ??? boot ?????
 */

(function () {
  'use strict';

  const isElectron = /Electron/i.test(navigator.userAgent || '');
  const useTribe = !!(window.__TRIBE_EXTERNAL_PROTOCOL__);
  window.__TRIBE_IS_ELECTRON__ = isElectron;
  window.__TRIBE_VERSION__ = '20260727.3';

  if (isElectron || useTribe) {
    document.documentElement.classList.add('electron-shell');
  }

  // ??? logo ? rem????? --ui-scale
  (function earlyUiScale() {
    const refW = 1440;
    const refH = 860;
    const raw = Math.min(window.innerWidth / refW, window.innerHeight / refH, 1);
    const scale = Math.max(0.72, raw);
    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(4));
  })();

  window.__TRIBE_CONFIG_BASE__ = useTribe ? 'tribe://config/' : 'config/';
  window.__TRIBE_MUSIC_BASE__ = useTribe ? 'tribe://music/' : 'music/';
  window.__TRIBE_IMAGE_BASE__ = useTribe ? 'tribe://image/' : 'image/';

  window.tribeMusicUrl = function tribeMusicUrl(fileName) {
    const base = window.__TRIBE_MUSIC_BASE__ || 'music/';
    const name = String(fileName || '').replace(/^music\//, '');
    return base + name;
  };

  window.tribeImageUrl = function tribeImageUrl(relPath) {
    const base = window.__TRIBE_IMAGE_BASE__ || 'image/';
    const name = String(relPath || '').replace(/^image\//, '');
    return base + name;
  };

  /** ??? CSS ?? image/ ??? asar ????????? tribe://image/ */
  (function applyImageCssVars() {
    const b = window.__TRIBE_IMAGE_BASE__ || 'image/';
    const root = document.documentElement;
    root.style.setProperty('--tribe-bg-menu', `url("${b}cafee80e0ce868.png")`);
    root.style.setProperty('--tribe-boot-logo', `url("${b}icon/loadingicon.png")`);
    for (let i = 1; i <= 9; i++) {
      root.style.setProperty(
        `--tribe-comic-${i}`,
        `url("${b}background_introduction/Background_Introduction_${i}.jpg")`
      );
    }
  })();

  const cfg = window.__TRIBE_CONFIG_BASE__;
  // ???/??????????????
  const bust = '?v=20260727.3';

  /** ??????????? music/????????????????? BGM ?? */
  const BOOT_LOADING_SFX = '????????????????Jingle_Anime?_Jingle_Cute_2.mp3';
  let bootLoadingAudio = null;
  let bootLoadingTried = false;
  let bootLoadingClosed = false;

  /** ??????? game.js ??????????????? */
  const EXTERNAL_CONFIGS = [
    'tool-recipes.js',
    'resource-points.js',
    'combat-units.js',
    'tech-tree-table.js',
  ];
  window.__TRIBE_EXTERNAL_CONFIGS__ = EXTERNAL_CONFIGS.slice();

  const scriptGroups = [
    {
      files: EXTERNAL_CONFIGS.map((f) => cfg + f + bust),
    },
    {
      files: ['sounds.js' + bust, 'game.js' + bust],
    },
    {
      files: [
        'tech-tree-editor.js' + bust,
        'defense.js' + bust,
        'bgm.js' + bust,
      ],
    },
  ];

  function setBootProgressPct(pct) {
    const n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    const bar = document.getElementById('boot-progress-bar');
    const progress = document.getElementById('boot-progress');
    const pctEl = document.getElementById('boot-loading-pct');
    if (bar) bar.style.width = n + '%';
    if (progress) progress.setAttribute('aria-valuenow', String(n));
    if (pctEl) pctEl.textContent = n + '%';
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));
  }

  /** ??????????? / ?????? */
  function stopBootLoadingSfx() {
    bootLoadingClosed = true;
    const a = bootLoadingAudio;
    bootLoadingAudio = null;
    if (!a) return;
    try {
      a.pause();
      a.removeAttribute('src');
      a.load?.();
    } catch (_) { /* ignore */ }
  }
  window.__TRIBE_STOP_BOOT_SFX__ = stopBootLoadingSfx;

  /** ???????????????? Audio????? */
  function playBootLoadingSfx() {
    const file = String(BOOT_LOADING_SFX || '').trim();
    if (!file || bootLoadingTried || bootLoadingClosed) return;
    bootLoadingTried = true;
    const url = typeof window.tribeMusicUrl === 'function'
      ? window.tribeMusicUrl(file)
      : ((window.__TRIBE_MUSIC_BASE__ || 'music/') + file.replace(/^music\//, ''));

    const tryPlay = () => {
      if (bootLoadingClosed) return;
      if (bootLoadingAudio) {
        void bootLoadingAudio.play().catch(() => {});
        return;
      }
      try {
        const a = new Audio(url);
        a.preload = 'auto';
        a.loop = false;
        bootLoadingAudio = a;
        void a.play().catch(() => {});
      } catch (_) { /* ignore */ }
    };

    tryPlay();
    const unlock = () => {
      tryPlay();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error('Failed to load: ' + src));
      document.body.appendChild(el);
    });
  }

  async function loadAllScripts() {
    for (const group of scriptGroups) {
      for (const src of group.files) {
        await loadScript(src);
      }
    }
  }

  /**
   * ??????? 4s???? 0.5s ????0?100 ?????
   * ???????????????????
   */
  async function runBootProgress(totalMs = 4000) {
    const pauseMs = 500;
    const pauseCount = 2;
    const moveMs = Math.max(500, totalMs - pauseMs * pauseCount);

    // ?????????? (12~42) ? (55~88)?????
    let a = 12 + Math.random() * 30;
    let b = 55 + Math.random() * 33;
    if (a > b) {
      const t = a;
      a = b;
      b = t;
    }
    if (b - a < 12) b = Math.min(90, a + 12);
    const pauses = [a, b];

    setBootProgressPct(0);
    const start = performance.now();
    let pausedAccum = 0;
    let pauseIdx = 0;
    let displayed = 0;

    await new Promise((resolve) => {
      const step = async (now) => {
        const moved = Math.max(0, now - start - pausedAccum);
        let pct = Math.min(100, (moved / moveMs) * 100);

        if (pauseIdx < pauses.length && displayed < pauses[pauseIdx] && pct >= pauses[pauseIdx]) {
          const holdAt = pauses[pauseIdx];
          setBootProgressPct(holdAt);
          displayed = holdAt;
          const pauseStarted = performance.now();
          await sleep(pauseMs);
          pausedAccum += performance.now() - pauseStarted;
          pauseIdx += 1;
          requestAnimationFrame(step);
          return;
        }

        displayed = pct;
        setBootProgressPct(pct);
        if (pct >= 100) {
          setBootProgressPct(100);
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  window.__BOOT_LOADING_SINCE__ = performance.now();

  (async function boot() {
    try {
      setBootProgressPct(0);
      playBootLoadingSfx();

      // ??????????????????? 4s
      await Promise.all([loadAllScripts(), runBootProgress(4000)]);
      setBootProgressPct(100);

      // ? game.js / tech-tree-editor.js / defense.js ??????????
      if (typeof window.startFactoryGame === 'function') {
        await window.startFactoryGame();
      } else {
        throw new Error('startFactoryGame ????game.js ???????');
      }
    } catch (err) {
      console.error('[boot]', err);
      const tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#f66;font:16px/1.5 sans-serif;padding:24px;text-align:center;z-index:99999';
      const hint = useTribe
        ? '???? exe ???? config/?music/?image/ ????'
        : '???? index.html ???? config/?music/?image/ ????';
      tip.textContent = '???????' + (err && err.message ? err.message : err) + hint;
      document.body.appendChild(tip);
    }
  })();
})();
