/**
 * 启动加载器：按顺序拉取外置配置 + 游戏脚本。
 * - 正式 Electron（preload 标记）：tribe://config|music → exe/项目同级外置目录
 * - 直接打开 HTML / 无协议的测试窗：相对路径 config/、music/
 *
 * 【新增配置文件时】必须同步改三处：
 *   1) 下方 EXTERNAL_CONFIGS
 *   2) scripts/pack-game.js → CONFIG_FILES
 *   3) config/说明.txt
 * 打包脚本会校验 pack 清单与 boot 是否一致。
 */

(function () {
  'use strict';

  const isElectron = /Electron/i.test(navigator.userAgent || '');
  const useTribe = !!(window.__TRIBE_EXTERNAL_PROTOCOL__);
  window.__TRIBE_IS_ELECTRON__ = isElectron;
  window.__TRIBE_VERSION__ = '1.0.0';

  if (isElectron || useTribe) {
    document.documentElement.classList.add('electron-shell');
  }

  window.__TRIBE_CONFIG_BASE__ = useTribe ? 'tribe://config/' : 'config/';
  window.__TRIBE_MUSIC_BASE__ = useTribe ? 'tribe://music/' : 'music/';

  window.tribeMusicUrl = function tribeMusicUrl(fileName) {
    const base = window.__TRIBE_MUSIC_BASE__ || 'music/';
    const name = String(fileName || '').replace(/^music\//, '');
    return base + name;
  };

  const cfg = window.__TRIBE_CONFIG_BASE__;
  // 改脚本/配置后递增，避免浏览器强缓存
  const bust = '?v=20260723bi';

  /** 外置配置（须在 game.js 之前加载；顺序可影响互相依赖） */
  const EXTERNAL_CONFIGS = [
    'tool-recipes.js',
    'resource-points.js',
    'combat-units.js',
    'tech-tree-table.js',
  ];
  window.__TRIBE_EXTERNAL_CONFIGS__ = EXTERNAL_CONFIGS.slice();

  const scriptGroups = [
    {
      pct: 30,
      label: '正在加载配置…',
      holdMs: 480,
      files: EXTERNAL_CONFIGS.map((f) => cfg + f + bust),
    },
    {
      pct: 70,
      label: '正在加载游戏核心…',
      holdMs: 560,
      files: ['sounds.js' + bust, 'game.js' + bust],
    },
    {
      pct: 95,
      label: '正在准备界面…',
      holdMs: 520,
      files: [
        'tech-tree-editor.js' + bust,
        'defense.js' + bust,
        'bgm.js' + bust,
      ],
    },
  ];

  function setBootProgressPct(pct, label) {
    const n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    const bar = document.getElementById('boot-progress-bar');
    const progress = document.getElementById('boot-progress');
    const pctEl = document.getElementById('boot-loading-pct');
    const text = document.getElementById('boot-loading-text');
    if (bar) bar.style.width = n + '%';
    if (progress) progress.setAttribute('aria-valuenow', String(n));
    if (pctEl) pctEl.textContent = n + '%';
    if (text && label) text.textContent = label;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));
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

  (async function boot() {
    try {
      setBootProgressPct(0, '正在加载资源…');
      await sleep(280);

      for (const group of scriptGroups) {
        setBootProgressPct(group.pct, group.label);
        const started = Date.now();
        for (const src of group.files) {
          await loadScript(src);
        }
        const left = group.holdMs - (Date.now() - started);
        if (left > 0) await sleep(left);
      }

      setBootProgressPct(100, '加载完成');
      await sleep(420);

      // 等 game.js / tech-tree-editor.js / defense.js 全部挂好补丁后再开壳
      if (typeof window.startFactoryGame === 'function') {
        await window.startFactoryGame();
      } else {
        throw new Error('startFactoryGame 未定义（game.js 可能加载失败）');
      }
    } catch (err) {
      console.error('[boot]', err);
      const tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#f66;font:16px/1.5 sans-serif;padding:24px;text-align:center;z-index:99999';
      const hint = useTribe
        ? '。请确认 exe 同级存在 config/ 与 music/ 文件夹。'
        : '。请确认 index.html 同级存在 config/ 与 music/ 文件夹。';
      tip.textContent = '资源加载失败：' + (err && err.message ? err.message : err) + hint;
      document.body.appendChild(tip);
    }
  })();
})();
