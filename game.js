// 开发者站点解锁顺序
const DEV_STATION_ORDER = [
  { type: 'point', id: 'berry_bush' },
  { type: 'point', id: 'forest' },
  { type: 'point', id: 'quarry' },
  { type: 'point', id: 'clay_pit' },
  { type: 'point', id: 'farm' },
  { type: 'point', id: 'treasure_chest' },
  { type: 'recipe', id: 'craft_plank' },
  { type: 'recipe', id: 'craft_brick' },
  { type: 'point', id: 'pasture' },
  { type: 'point', id: 'copper_mine' },
  { type: 'point', id: 'coal_mine' },
  { type: 'recipe', id: 'smelt_copper' },
  { type: 'recipe', id: 'craft_gear' },
  { type: 'point', id: 'iron_mine' },
  { type: 'recipe', id: 'smelt_iron' },
  { type: 'recipe', id: 'smelt_steel' },
];

/** 加载层最少停留、离场渐隐与黑屏间隔（毫秒） */
const LOADING_MIN_DWELL_MS = 2000;
const LOADING_FADE_MS = 700;
const LOADING_EXIT_BLACKOUT_MS = 500;

// 点击部落 - 核心游戏逻辑
class FactoryGame {
  constructor() {
    this.state = this.getDefaultState();
    this.lastTick = Date.now();
    this.holdClicking = false;
    this.holdTimer = null;
    this._spaceHolding = false;
    this._spaceHoldTimer = null;
    this._tutHighlightKey = '';
    this.paused = false;
    this._bootTransitionActive = false;
    this._comicTimeHold = false;
    this._starvationDialogOpen = false;
    this._pendingStarvationAlert = null;
    this.timeScale = 1;
    this.devTimeScale = 1;
    this._suppressSounds = false;
    this._unlockFlash = null;
    this._unlockFlashTimer = null;
    this._chestSparkLoop = null;
    this.sounds = new GameSounds();
    this.sounds.setGame(this);
    // init 由 startFactoryGame 异步调用（Electron 存档在 saves/ 需 await）
  }

  /** Electron：saves/factoryGame.json；浏览器：localStorage */
  _saveApi() {
    return window.__TRIBE_SAVE_API__ || null;
  }

  async hasSaveData() {
    const api = this._saveApi();
    if (api?.exists) {
      try {
        if (await api.exists()) return true;
      } catch (_) { /* fall through */ }
    }
    return localStorage.getItem('factoryGame') !== null;
  }

  init() {
    // 兼容旧调用；实际启动走 initAsync
    return this.initAsync();
  }

  async initAsync() {
    // 加载页期间不算主菜单，避免 loadSettings → applySettings 提前拉起菜单 BGM
    this._atMainMenu = false;
    this._inGameSession = false;
    this.paused = true;
    this.updateUiScale();
    if (!this._windowLifecycleBound) {
      this._windowLifecycleBound = true;
      window.addEventListener('beforeunload', () => this.save());
      window.addEventListener('resize', () => {
        this.updateUiScale();
        this.updateUnlockToastPosition();
        this.updateTutSpotlight();
      });
    }
    await this.loadSettings();
    this.setupMainMenu();
    this.setupPauseMenu();
    await this.showBootSequence();
  }

  /** 加载结束后：加载页至少 2s → 渐隐 → 黑屏 0.5s → 主菜单渐显 */
  async showBootSequence() {
    const loading = document.getElementById('boot-loading');
    const splash = document.getElementById('boot-splash');
    const main = document.getElementById('main-menu');
    const ver = document.getElementById('main-menu-version');
    if (ver) ver.textContent = 'v' + (window.__TRIBE_VERSION__ || '1.0.0');

    splash?.classList.add('hidden');
    this.prepareMainMenuEnter();
    main?.classList.add('main-menu-boot-wait', 'hidden');
    main?.classList.remove('main-menu-boot-fade-in');
    this.showMainMenuHome();
    await this.refreshMainMenuLoadButton();

    this._loadingVisibleSince = window.__BOOT_LOADING_SINCE__ || performance.now();
    this._activeLoadingEl = loading;

    await this.leaveLoadingScreenAndReveal(async ({ phase }) => {
      if (phase === 'prep') {
        main?.classList.add('main-menu-boot-wait');
        main?.classList.remove('hidden', 'main-menu-boot-fade-in');
        return;
      }
      if (phase === 'fadeIn') {
        try { window.__TRIBE_STOP_BOOT_SFX__?.(); } catch (_) { /* ignore */ }
        this.stopMenuBgm();
        this.stopGameBgm?.();
        this._atMainMenu = true;
        main?.classList.remove('main-menu-boot-wait');
        main?.classList.add('main-menu-boot-fade-in');
        this.playMainMenuEnterAnim();
        this.sounds?.ensureContext?.();
        this.startMenuBgm({ forceNew: true });
        this._ensureMenuBgmUnlock();
        setTimeout(() => {
          main?.classList.remove('main-menu-boot-fade-in');
        }, 900);
      }
    });
  }

  /** 显示主菜单前先定位置隐形，避免目标位闪现 */
  prepareMainMenuEnter() {
    const main = document.getElementById('main-menu');
    if (!main) return;
    if (this._mmEnterTimer) {
      clearTimeout(this._mmEnterTimer);
      this._mmEnterTimer = null;
    }
    main.classList.remove('mm-enter-play', 'mm-enter-done');
    main.classList.add('mm-enter-prep');
  }

  /** 主菜单：遮盖 1s → 标题 2.5s → 停顿 0.5s → 按钮区整体 1.5s */
  playMainMenuEnterAnim() {
    const main = document.getElementById('main-menu');
    if (!main) return;
    if (this._mmEnterTimer) {
      clearTimeout(this._mmEnterTimer);
      this._mmEnterTimer = null;
    }
    main.classList.remove('mm-enter-done', 'mm-enter-play');
    main.classList.add('mm-enter-prep');
    void main.offsetWidth;
    requestAnimationFrame(() => {
      main.classList.remove('mm-enter-prep');
      main.classList.add('mm-enter-play');
      // 1 + 2.5 + 0.5 + 1.5 = 5.5s
      this._mmEnterTimer = setTimeout(() => {
        main.classList.remove('mm-enter-play');
        main.classList.add('mm-enter-done');
        this._mmEnterTimer = null;
      }, 5600);
    });
  }

  showMainMenuHome() {
    document.getElementById('main-menu-home')?.classList.remove('hidden');
    document.getElementById('main-menu-brand')?.classList.remove('hidden');
    document.getElementById('main-menu-settings')?.classList.add('hidden');
    document.getElementById('main-menu-dev')?.classList.add('hidden');
    document.getElementById('main-menu-achievements')?.classList.add('hidden');
  }

  showMainMenuPage(id) {
    const pages = ['main-menu-home', 'main-menu-settings', 'main-menu-dev', 'main-menu-achievements'];
    pages.forEach((pid) => {
      document.getElementById(pid)?.classList.toggle('hidden', pid !== id);
    });
    document.getElementById('main-menu-brand')?.classList.toggle('hidden', id !== 'main-menu-home');
    if (id === 'main-menu-settings') {
      this.showMainSettingsTab(this._mmSettingsTab || 'display');
      this.syncSettingsForm();
    }
    if (id === 'main-menu-achievements') {
      this.renderAchievementsPanel();
    }
  }

  async refreshMainMenuLoadButton() {
    const loadBtn = document.getElementById('mm-load');
    const startBtn = document.getElementById('mm-start');
    const has = await this.hasSaveData();
    if (loadBtn) {
      loadBtn.disabled = !has;
      loadBtn.title = has ? '继续已有存档' : '暂无存档';
      loadBtn.classList.toggle('main-menu-btn-primary', has);
      loadBtn.classList.toggle('main-menu-btn-dim', false);
    }
    if (startBtn) {
      startBtn.classList.toggle('main-menu-btn-primary', !has);
      startBtn.classList.toggle('main-menu-btn-dim', has);
      startBtn.title = has ? '将覆盖当前存档开始新游戏' : '开始新游戏';
    }
    // 入场结束统一不透明；暗/禁用态靠底色与字色区分，避免整钮透明度被遮罩吞掉
    document.querySelectorAll('#main-menu .mm-reveal').forEach((el) => {
      el.style.setProperty('--mm-end-o', '1');
    });
  }

  enterGameShell({ holdForComic = false, keepCovered = false } = {}) {
    this._atMainMenu = false;
    document.getElementById('boot-shell')?.classList.add('hidden');
    if (keepCovered) {
      // 加载/黑屏仍在上层时不要提前揭开游戏，避免露馅闪一下
      document.getElementById('app')?.classList.add('app-beneath-shell');
    } else {
      document.getElementById('app')?.classList.remove('app-beneath-shell');
    }
    if (holdForComic) this.holdAppForComic(true);
    else this.holdAppForComic(false);
    this.syncBgmNowPlayingUI();
  }

  leaveGameToMainMenuShell({ keepBlackout = false, skipEnterAnim = false } = {}) {
    this._atMainMenu = true;
    this._inGameSession = false;
    this.paused = true;
    this.setPauseMenuOpen(false);
    document.getElementById('difficulty-select')?.classList.add('hidden');
    document.getElementById('boot-transition')?.classList.add('hidden');
    document.getElementById('boot-transition')?.classList.remove(
      'boot-transition-play', 'boot-transition-fade-in', 'boot-transition-fade-out'
    );
    if (!keepBlackout) {
      document.getElementById('scene-blackout')?.classList.add('hidden');
      document.getElementById('scene-blackout')?.classList.remove(
        'scene-blackout-visible', 'scene-blackout-fade-out'
      );
    }
    document.getElementById('defense-intro')?.classList.add('hidden');
    document.getElementById('defense-intro')?.classList.remove('comic-outro', 'comic-blackout');
    document.getElementById('app')?.classList.remove('app-awaiting-comic', 'app-fade-in');
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    document.getElementById('game-over')?.classList.add('hidden');
    document.getElementById('victory-screen')?.classList.add('hidden');
    document.getElementById('story-dialog')?.classList.add('hidden');
    document.getElementById('battle-screen')?.classList.add('hidden');
    document.getElementById('achievements-panel')?.classList.add('hidden');
    document.getElementById('main-menu-achievements')?.classList.add('hidden');
    document.getElementById('dev-panel')?.classList.add('hidden');
    document.getElementById('app')?.classList.add('app-beneath-shell');
    document.getElementById('boot-shell')?.classList.remove('hidden');
    document.getElementById('boot-loading')?.classList.add('hidden');
    document.getElementById('boot-splash')?.classList.add('hidden');
    this.prepareMainMenuEnter();
    document.getElementById('main-menu')?.classList.remove('hidden');
    this.showMainMenuHome();
    void this.refreshMainMenuLoadButton();
    if (!skipEnterAnim) this.playMainMenuEnterAnim();
    this.sounds?.bgm?.setTutorialDuck?.(false);
    this.sounds?.bgm?.setPauseDuck?.(false, 0);
    this.startMenuBgm({ forceNew: true });
  }

  async clearSaveFiles() {
    const api = this._saveApi();
    if (api?.clear) {
      try { await api.clear(); } catch (_) { /* ignore */ }
    }
    try { localStorage.removeItem('factoryGame'); } catch (_) { /* ignore */ }
  }

  stopGameBgm() {
    try {
      if (this.sounds?.bgm) {
        this.sounds.bgm.stop?.();
        this.sounds.bgm = null;
      }
    } catch (_) { /* ignore */ }
  }

  stopMenuBgm() {
    this._cancelMenuBgmFade();
    const a = this._menuBgmAudio;
    this._menuBgmAudio = null;
    if (!a) return;
    try {
      a.pause();
      a.src = '';
    } catch (_) { /* ignore */ }
  }

  _cancelMenuBgmFade() {
    if (this._menuBgmFadeTimer) {
      clearInterval(this._menuBgmFadeTimer);
      this._menuBgmFadeTimer = null;
    }
  }

  /** 主菜单 BGM 音量渐变到目标（新开轨默认 5s：0→目标） */
  _fadeMenuBgmTo(target, durationMs = 5000) {
    const a = this._menuBgmAudio;
    if (!a) return;
    this._cancelMenuBgmFade();
    const start = Math.max(0, Math.min(1, Number(a.volume) || 0));
    const end = Math.max(0, Math.min(1, Number(target) || 0));
    if (durationMs <= 0 || Math.abs(end - start) < 0.008) {
      a.volume = end;
      return;
    }
    const t0 = performance.now();
    this._menuBgmFadeTimer = setInterval(() => {
      if (this._menuBgmAudio !== a) {
        this._cancelMenuBgmFade();
        return;
      }
      const t = Math.min(1, (performance.now() - t0) / durationMs);
      a.volume = start + (end - start) * t;
      if (t >= 1) this._cancelMenuBgmFade();
    }, 40);
  }

  /** 主界面循环 BGM 曲库 */
  _menuBgmTracks() {
    return [
      {
        file: '可愛らしいハープのワルツ「Wish5」_PerituneMaterial_Wish5_HarpOnly.mp3',
        name: 'Wish5 · 可爱竖琴圆舞曲',
      },
      {
        file: '淋しげな森のBGM「Deep_Woods」_PerituneMaterial_Deep_Woods_loop.mp3',
        name: 'Deep Woods · 淋しげな森',
      },
    ];
  }

  _pickMenuBgmIndex(preferNext = false) {
    const list = this._menuBgmTracks();
    if (!list.length) return 0;
    if (preferNext) {
      const cur = Number.isFinite(this._menuBgmIndex) ? this._menuBgmIndex : -1;
      return (cur + 1) % list.length;
    }
    if (Number.isFinite(this._menuBgmIndex) && this._menuBgmIndex >= 0 && this._menuBgmIndex < list.length) {
      return this._menuBgmIndex;
    }
    return Math.floor(Math.random() * list.length);
  }

  _updateMenuBgmNowLabel() {
    const list = this._menuBgmTracks();
    const off = this.settings?.playBgm === false;
    const track = list[this._menuBgmIndex];
    this.applyBgmNowButton(document.getElementById('mm-bgm-now'), {
      off,
      playing: !off && !!track,
      canCycle: !off && list.length > 1,
      name: off ? 'BGM 已关闭' : (track?.name || '—'),
      title: off
        ? '请在设置中开启 BGM'
        : (list.length > 1 ? '点击切换下一首 BGM' : '当前 BGM'),
    });
  }

  /** 游戏顶栏 / 主菜单共用的「正在播放」按钮内容 */
  applyBgmNowButton(el, info = {}) {
    if (!el) return;
    if (!el.querySelector('.bgm-now-marquee')) {
      el.innerHTML = `
        <span class="bgm-now-icon" aria-hidden="true"><span class="bgm-disc"></span></span>
        <span class="bgm-now-marquee"><span class="bgm-now-text">—</span></span>
      `;
    }
    const textEl = el.querySelector('.bgm-now-text');
    const name = info.name || '—';
    const off = !!info.off;
    const playing = !!info.playing && !off;
    const canCycle = !!info.canCycle && !off;
    const key = [off ? 1 : 0, playing ? 1 : 0, canCycle ? 1 : 0, name, info.title || ''].join('|');
    if (el.dataset.bgmUiKey === key) return;
    el.dataset.bgmUiKey = key;

    el.classList.toggle('is-off', off);
    el.classList.toggle('is-playing', playing);
    el.disabled = off;
    el.title = info.title
      || (off ? '请在设置中开启 BGM' : (canCycle ? '点击切换下一首 BGM' : '当前 BGM'));
    if (textEl) textEl.textContent = name;
    requestAnimationFrame(() => this._syncBgmMarquee(el));
  }

  _syncBgmMarquee(el) {
    if (!el) return;
    const marquee = el.querySelector('.bgm-now-marquee');
    const text = el.querySelector('.bgm-now-text');
    if (!marquee || !text) return;
    text.style.animation = 'none';
    // 强制回流后再测宽度
    void text.offsetWidth;
    const overflow = text.scrollWidth - marquee.clientWidth;
    const need = overflow > 2;
    el.classList.toggle('is-scrolling', need);
    if (need) {
      text.style.setProperty('--bgm-scroll', `-${overflow}px`);
      text.style.animation = '';
    } else {
      text.style.removeProperty('--bgm-scroll');
      text.style.transform = '';
    }
  }

  syncBgmNowPlayingUI(info) {
    if (this._atMainMenu && !this._inGameSession) return;
    const bgm = this.sounds?.bgm;
    const data = info || bgm?.getNowPlayingInfo?.() || {
      off: this.settings?.playBgm === false,
      playing: false,
      canCycle: false,
      name: '—',
    };
    const off = !!data.off || this.settings?.playBgm === false;
    this.applyBgmNowButton(document.getElementById('game-bgm-now'), {
      off,
      playing: !off && !!data.playing,
      canCycle: !off && !!data.canCycle,
      name: off ? 'BGM 已关闭' : (data.name || '暂无 BGM'),
      title: off
        ? '请在设置中开启 BGM'
        : (data.canCycle ? '点击切换下一首 BGM' : '当前 BGM'),
    });
  }

  cycleGameBgm() {
    if (this._atMainMenu && !this._inGameSession) return;
    if (this.settings?.playBgm === false) return;
    const ok = this.sounds?.bgm?.cycleNowPlayingTrack?.();
    if (!ok) {
      const info = this.sounds?.bgm?.getNowPlayingInfo?.();
      if (info && !info.canCycle && info.playing) {
        this.showNotification('当前曲库仅一首，无法切换');
      }
    }
    this.syncBgmNowPlayingUI();
  }

  /** 手动切换主菜单 BGM */
  cycleMenuBgm() {
    if (!this._atMainMenu) return;
    if (this.settings?.playBgm === false) return;
    const list = this._menuBgmTracks();
    if (list.length < 2) return;
    this._menuBgmIndex = this._pickMenuBgmIndex(true);
    this.startMenuBgm({ forceNew: true, keepIndex: true });
  }

  startMenuBgm({ forceNew = false, keepIndex = false } = {}) {
    // 选难度期间仍算主菜单：BGM 继续播，确认难度后再停
    if (!this._atMainMenu || this._inGameSession) return;
    if (this.settings?.playBgm === false) {
      this.stopMenuBgm();
      this._updateMenuBgmNowLabel();
      return;
    }
    const targetVol = this._menuBgmVolume();
    if (this._menuBgmAudio && !forceNew) {
      try {
        this._updateMenuBgmNowLabel();
        if (this._menuBgmAudio.paused) {
          this._menuBgmAudio.volume = 0;
          void this._menuBgmAudio.play().then(() => {
            this._fadeMenuBgmTo(targetVol, 5000);
          }).catch(() => {});
        } else {
          this._fadeMenuBgmTo(targetVol, 900);
        }
        return;
      } catch (_) {
        this.stopMenuBgm();
      }
    }
    if (forceNew) this.stopMenuBgm();

    const list = this._menuBgmTracks();
    if (!list.length) {
      this._updateMenuBgmNowLabel();
      return;
    }
    if (!keepIndex || !Number.isFinite(this._menuBgmIndex)) {
      this._menuBgmIndex = Math.floor(Math.random() * list.length);
    }
    this._menuBgmIndex = Math.max(0, Math.min(list.length - 1, this._menuBgmIndex | 0));
    const track = list[this._menuBgmIndex];
    if (!track) {
      this._updateMenuBgmNowLabel();
      return;
    }
    const url = typeof window.tribeMusicUrl === 'function'
      ? window.tribeMusicUrl(track.file)
      : ('music/' + track.file);
    const a = new Audio(url);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    this._menuBgmAudio = a;
    this._updateMenuBgmNowLabel();
    void a.play().then(() => {
      console.log('[BGM] 主界面音轨选用:', track.name);
      this._fadeMenuBgmTo(this._menuBgmVolume(), 5000);
    }).catch(() => {
      // 等用户手势再播
    });
  }

  _menuBgmVolume() {
    const master = Math.max(0, Math.min(1, Number(this.settings?.masterVolume ?? 0.7)));
    return Math.max(0, Math.min(1, master * 0.4));
  }

  /** 绑定主菜单首次交互以解锁自动播放（已在播则只确保续播，不 forceNew） */
  _ensureMenuBgmUnlock() {
    if (this._menuBgmUnlockBound) return;
    this._menuBgmUnlockBound = true;
    const unlock = () => {
      this.sounds?.ensureContext?.();
      if (this._atMainMenu && !this._inGameSession) {
        // 不强制重建，避免刚播起的菜单 BGM 被打断重开
        this.startMenuBgm({ forceNew: false });
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  async startNewGameFromMenu() {
    const has = await this.hasSaveData();
    if (has && !confirm('开始新游戏将覆盖当前存档，确定吗？')) return;
    await this.clearSaveFiles();
    this.state = this.getDefaultState();
    this.state.difficulty = 'normal';
    this.timeScale = 1;
    this.devTimeScale = 1;
    this._starvationDialogOpen = false;
    this._pendingStarvationAlert = null;
    this.clearTutorialHighlights?.();
    // 仍留在主菜单壳上选难度；BGM 保持播放，确认难度后再停
    this._inGameSession = false;
    this._atMainMenu = true;
    this._difficultyFromMainMenu = true;
    document.getElementById('main-menu-settings')?.classList.add('hidden');
    document.getElementById('main-menu-dev')?.classList.add('hidden');
    document.getElementById('main-menu-home')?.classList.add('hidden');
    document.getElementById('main-menu-brand')?.classList.add('hidden');
    document.getElementById('main-menu-achievements')?.classList.add('hidden');
    this.showDifficultySelect();
  }

  async loadGameFromMenu() {
    const has = await this.hasSaveData();
    if (!has) {
      alert('没有可用存档');
      await this.refreshMainMenuLoadButton();
      return;
    }

    this._atMainMenu = false;
    this.stopMenuBgm();
    let needComic = false;

    try {
      await this.playSceneEnterTransition({
        message: '正在读取存档…',
        fadeOutSelectors: ['#main-menu'],
        onDuringLoading: async () => {
          const ok = await this.load();
          if (!ok) throw new Error('load failed');
          needComic = !this.state.defense?.introSeen;
          this.enterGameShell({ holdForComic: needComic, keepCovered: true });
          this._inGameSession = true;
          this.paused = true;
          if (needComic) this._comicTimeHold = true;
          this.sounds.ensureContext();
          this.sounds._initBGM();
          this.resumeAfterDifficultySetup({ deferIntro: true });
        },
        revealAfter: ({ phase }) => this._revealGameAfterLoading({ needComic, phase }),
      });
    } catch (_) {
      this._bootTransitionActive = false;
      this._activeLoadingEl = null;
      this._loadingVisibleSince = 0;
      await this._fadeOutLoadingElement(document.getElementById('boot-transition'));
      document.getElementById('scene-blackout')?.classList.add('hidden');
      document.getElementById('scene-blackout')?.classList.remove(
        'scene-blackout-visible', 'scene-blackout-fade-out'
      );
      this.leaveGameToMainMenuShell();
      alert('读取存档失败');
      await this.refreshMainMenuLoadButton();
    }
  }

  /** 登声 → 渐隐源界面 → 黑屏 1s → 渐显加载层 → 执行加载 → 离场过渡 → 渐显下一屏 */
  async playSceneEnterTransition({
    message = '正在进入村落…',
    fadeOutSelectors = ['#main-menu'],
    onDuringLoading = async () => {},
    revealAfter = async () => {},
  } = {}) {
    this._bootTransitionActive = true;
    this.paused = true;

    void this.sounds?.playClockMissSting?.();

    const fadeOutEls = fadeOutSelectors
      .map((sel) => document.querySelector(sel))
      .filter(Boolean);
    fadeOutEls.forEach((el) => {
      el.classList.remove('scene-exit-fade-out');
      void el.offsetWidth;
      el.classList.add('scene-exit-fade-out');
    });
    await this._sleep(LOADING_FADE_MS);
    fadeOutEls.forEach((el) => {
      el.classList.add('hidden');
      el.classList.remove('scene-exit-fade-out');
    });

    const blackout = document.getElementById('scene-blackout');
    if (blackout) {
      blackout.classList.remove('hidden', 'scene-blackout-fade-out');
      void blackout.offsetWidth;
      blackout.classList.add('scene-blackout-visible');
    }
    await this._sleep(1000);

    await this._fadeInLoadingScreen(message);
    if (blackout) blackout.classList.add('scene-blackout-fade-out');
    await this._sleep(LOADING_FADE_MS);
    if (blackout) {
      blackout.classList.add('hidden');
      blackout.classList.remove('scene-blackout-visible', 'scene-blackout-fade-out');
    }

    await onDuringLoading();
    await this.leaveLoadingScreenAndReveal(revealAfter);
  }

  /** 渐显 boot-transition 加载层并记录起始时间 */
  async _fadeInLoadingScreen(message) {
    const loading = document.getElementById('boot-transition');
    const text = document.getElementById('boot-transition-text');
    if (text) text.textContent = message;
    if (loading) {
      loading.classList.remove('hidden', 'boot-transition-fade-out', 'boot-transition-play');
      void loading.offsetWidth;
      loading.classList.add('boot-transition-fade-in');
    }
    this._loadingVisibleSince = performance.now();
    this._activeLoadingEl = loading;
  }

  /** 仅渐显加载层（如返回主菜单），不含入场黑屏 */
  async showLoadingScreen(message = '加载中…') {
    this._bootTransitionActive = true;
    this.paused = true;
    await this._fadeInLoadingScreen(message);
    await this._sleep(LOADING_FADE_MS);
  }

  /** 加载层至少停留 2s → 渐隐（底下已是黑屏）→ 黑屏 0.5s → 渐显下一屏 */
  async leaveLoadingScreenAndReveal(revealFn = async () => {}) {
    const loading = this._activeLoadingEl
      || document.getElementById('boot-transition')
      || document.getElementById('boot-loading');

    const since = this._loadingVisibleSince || performance.now();
    const remain = LOADING_MIN_DWELL_MS - (performance.now() - since);
    if (remain > 0) await this._sleep(remain);

    const blackout = document.getElementById('scene-blackout');
    const isBootLogo = !!(loading && loading.id === 'boot-loading');
    // boot-transition 在黑屏之上：先垫黑再渐隐，避免透出下一屏
    // boot-loading 在黑屏之下：若先垫黑会立刻盖住 logo，所以等渐隐后再接黑屏
    if (blackout && !isBootLogo) {
      blackout.classList.remove('hidden', 'scene-blackout-fade-out');
      blackout.classList.add('scene-blackout-visible');
    }

    await this._fadeOutLoadingElement(loading);

    if (blackout && isBootLogo) {
      blackout.classList.remove('hidden', 'scene-blackout-fade-out');
      blackout.classList.add('scene-blackout-visible');
    }
    await this._sleep(LOADING_EXIT_BLACKOUT_MS);

    await revealFn({ phase: 'prep' });

    if (blackout) {
      blackout.classList.remove('scene-blackout-fade-out');
      void blackout.offsetWidth;
      blackout.classList.add('scene-blackout-fade-out');
    }
    await revealFn({ phase: 'fadeIn' });
    await this._sleep(LOADING_FADE_MS);

    if (blackout) {
      blackout.classList.add('hidden');
      blackout.classList.remove('scene-blackout-visible', 'scene-blackout-fade-out');
    }

    this._activeLoadingEl = null;
    this._loadingVisibleSince = 0;
    this._bootTransitionActive = false;
  }

  async _fadeOutLoadingElement(el) {
    if (!el || el.classList.contains('hidden')) return;
    if (el.id === 'boot-loading') {
      el.classList.add('boot-loading-fade-out');
    } else {
      // 先加 fade-out（目标 opacity:0），再去掉 fade-in，避免 reflow 把当前态钉成 0 导致瞬间透底
      el.classList.add('boot-transition-fade-out');
      el.classList.remove('boot-transition-fade-in', 'boot-transition-play');
    }
    await this._sleep(LOADING_FADE_MS);
    el.classList.add('hidden');
    el.classList.remove('boot-loading-fade-out', 'boot-transition-fade-out');
  }

  /** 加载层消失后渐显游戏主界面或开场漫画 */
  async _revealGameAfterLoading({ needComic = false, phase } = {}) {
    if (phase === 'prep') {
      if (needComic && !this.state.defense?.introSeen) {
        this.showDefenseIntroIfNeeded();
        document.getElementById('defense-intro')?.classList.add('scene-enter-prep');
      } else {
        this.holdAppForComic(false);
        const app = document.getElementById('app');
        app?.classList.remove('app-beneath-shell');
        app?.classList.add('scene-enter-prep');
      }
      return;
    }
    if (phase === 'fadeIn') {
      if (needComic && !this.state.defense?.introSeen) {
        const root = document.getElementById('defense-intro');
        root?.classList.remove('scene-enter-prep');
        root?.classList.remove('scene-enter-fade-in');
        void root?.offsetWidth;
        root?.classList.add('scene-enter-fade-in');
        await this._sleep(850);
        root?.classList.remove('scene-enter-fade-in');
        return;
      }
      const app = document.getElementById('app');
      app?.classList.remove('scene-enter-prep');
      this.revealAppAfterComic();
      this.releaseGameTimeAfterComic();
    }
  }

  async fadeOutBootTransition() {
    await this._fadeOutLoadingElement(document.getElementById('boot-transition'));
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));
  }

  async playBootTransition(message = '正在进入村落…') {
    await this.showLoadingScreen(message);
    const remain = LOADING_MIN_DWELL_MS;
    await this._sleep(remain);
  }

  /** @deprecated 请用 leaveLoadingScreenAndReveal */
  hideBootTransition() {
    const el = document.getElementById('boot-transition');
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('boot-transition-play');
  }

  /** 难度确认后：登声 → 黑屏 → 加载 → 进入游戏 */
  async beginGameAfterDifficulty() {
    this._pickingDifficulty = false;
    const fromMenu = !!this._difficultyFromMainMenu;
    this._difficultyFromMainMenu = false;
    this.applyNewGameTutorialPreference();
    this.paused = true;
    this._comicTimeHold = true;
    this._atMainMenu = false;
    this.stopMenuBgm();

    const needComic = !this.state.defense?.introSeen;

    await this.playSceneEnterTransition({
      message: fromMenu ? '正在进入村落…' : '正在重新开始…',
      fadeOutSelectors: ['#main-menu', '#difficulty-select'],
      onDuringLoading: async () => {
        document.getElementById('main-menu')?.classList.add('hidden');
        document.getElementById('difficulty-select')?.classList.add('hidden');
        this.enterGameShell({ holdForComic: needComic, keepCovered: true });
        this._inGameSession = true;
        this.paused = true;
        this.sounds.ensureContext();
        this.sounds._initBGM();
        this.resumeAfterDifficultySetup({ deferIntro: true });
      },
      revealAfter: ({ phase }) => this._revealGameAfterLoading({ needComic, phase }),
    });
  }

  async returnToMainMenu({ skipConfirm = false } = {}) {
    if (this._returningToMainMenu) return;
    if (!skipConfirm && !confirm('返回主界面？当前进度将自动保存。')) return;
    this._returningToMainMenu = true;
    try {
      if (this._inGameSession) this.save();
      this.paused = true;
      this._pauseMenuPrevPaused = true;
      this.setPauseMenuOpen(false);
      this.stopGameBgm();
      await this.showLoadingScreen('正在返回主界面…');
      await this.leaveLoadingScreenAndReveal(async ({ phase }) => {
        const main = document.getElementById('main-menu');
        if (phase === 'prep') {
          this.leaveGameToMainMenuShell({ keepBlackout: true, skipEnterAnim: true });
          main?.classList.add('main-menu-boot-wait');
          return;
        }
        if (phase === 'fadeIn') {
          this._atMainMenu = true;
          main?.classList.remove('main-menu-boot-wait');
          main?.classList.add('main-menu-boot-fade-in');
          this.playMainMenuEnterAnim();
          this.sounds?.ensureContext?.();
          this.startMenuBgm({ forceNew: true });
          this._ensureMenuBgmUnlock();
          setTimeout(() => {
            main?.classList.remove('main-menu-boot-fade-in');
          }, 900);
        }
      });
    } finally {
      this._returningToMainMenu = false;
    }
  }

  async quitApp() {
    if (this._quittingApp) return;
    this._quittingApp = true;
    try {
      if (this._inGameSession) this.save();
      // 主菜单 / Esc 菜单共用：整界面锁死 0.5s 再退出
      this.paused = true;
      document.documentElement.classList.add('app-quitting');
      let veil = document.getElementById('quit-freeze-veil');
      if (!veil) {
        veil = document.createElement('div');
        veil.id = 'quit-freeze-veil';
        veil.className = 'quit-freeze-veil';
        veil.setAttribute('aria-hidden', 'true');
        document.body.appendChild(veil);
      }
      veil.classList.add('is-on');
      await new Promise((r) => setTimeout(r, 500));
      const api = this._saveApi();
      if (api?.quit) {
        await api.quit();
        return;
      }
      window.close();
    } finally {
      document.getElementById('quit-freeze-veil')?.classList.remove('is-on');
      document.documentElement.classList.remove('app-quitting');
      this._quittingApp = false;
    }
  }

  /** 主菜单 / Esc 菜单按钮：聚焦与点击音效 */
  bindMenuUiSounds(root) {
    if (!root || root.dataset.uiSfxBound === '1') return;
    root.dataset.uiSfxBound = '1';
    const sel = [
      'button.main-menu-btn',
      'button.pause-menu-btn',
      'button.pause-menu-back',
      'button.pause-settings-tab',
      'button.pause-settings-action',
      'button.main-menu-bgm-now',
    ].join(',');

    const isMenuBtn = (el) => {
      const btn = el?.closest?.(sel);
      if (!btn || !root.contains(btn) || btn.disabled) return null;
      return btn;
    };

    root.addEventListener('pointerover', (e) => {
      const btn = isMenuBtn(e.target);
      if (!btn) return;
      const from = e.relatedTarget;
      if (from && btn.contains(from)) return;
      this.sounds?.playUiFocus?.();
    });
    root.addEventListener('focusin', (e) => {
      if (!isMenuBtn(e.target)) return;
      this.sounds?.playUiFocus?.();
    });
    root.addEventListener('click', (e) => {
      if (!isMenuBtn(e.target)) return;
      this.sounds?.playUiClick?.();
    }, true);
  }

  setupMainMenu() {
    if (this._mainMenuBound) return;
    this._mainMenuBound = true;

    this.bindMenuUiSounds(document.getElementById('main-menu'));

    if (!this._globalEscBound) {
      this._globalEscBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.handleGlobalEscape();
      });
    }

    document.getElementById('mm-start')?.addEventListener('click', () => {
      void this.startNewGameFromMenu();
    });
    document.getElementById('mm-load')?.addEventListener('click', () => {
      void this.loadGameFromMenu();
    });
    document.getElementById('mm-settings')?.addEventListener('click', () => {
      this._mmSettingsTab = 'display';
      this.showMainMenuPage('main-menu-settings');
    });
    document.getElementById('mm-achievements')?.addEventListener('click', () => {
      void this.openAchievementsPanel();
    });
    document.getElementById('mm-achievements-back')?.addEventListener('click', () => {
      this.showMainMenuHome();
    });
    document.getElementById('mm-settings-back')?.addEventListener('click', () => {
      this.showMainMenuHome();
    });
    document.getElementById('mm-dev')?.addEventListener('click', () => {
      this.showMainMenuPage('main-menu-dev');
    });
    document.getElementById('mm-dev-back')?.addEventListener('click', () => {
      this.showMainMenuHome();
    });
    document.getElementById('mm-quit')?.addEventListener('click', () => { void this.quitApp(); });
    document.getElementById('mm-set-reset-save')?.addEventListener('click', () => {
      void this.resetSaveFromMainMenu();
    });
    document.getElementById('mm-bgm-now')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleMenuBgm();
    });
    document.getElementById('game-bgm-now')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleGameBgm();
    });
    this._updateMenuBgmNowLabel();
    this.syncBgmNowPlayingUI();

    const showMainSettingsTab = (tab) => {
      const key = (tab === 'audio' || tab === 'game') ? tab : 'display';
      this._mmSettingsTab = key;
      document.querySelectorAll('[data-mm-settings-tab]').forEach((btn) => {
        const on = btn.dataset.mmSettingsTab === key;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('[data-mm-settings-pane]').forEach((pane) => {
        pane.classList.toggle('hidden', pane.dataset.mmSettingsPane !== key);
      });
    };
    this.showMainSettingsTab = showMainSettingsTab;

    document.querySelectorAll('[data-mm-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showMainSettingsTab(btn.dataset.mmSettingsTab);
        this.syncSettingsForm();
      });
    });

    document.getElementById('mm-set-display-mode')?.addEventListener('change', (e) => {
      this.settings.displayMode = e.target.value === 'windowed' ? 'windowed' : 'fullscreen';
      void this.applySettings({ applyDisplay: true });
      this.syncSettingsForm();
    });
    document.getElementById('mm-set-display-res')?.addEventListener('change', (e) => {
      const m = String(e.target.value || '').match(/^(\d+)x(\d+)$/i);
      if (!m) return;
      this.settings.width = Number(m[1]);
      this.settings.height = Number(m[2]);
      void this.applySettings({ applyDisplay: this.settings.displayMode === 'windowed' });
      this.syncSettingsForm();
    });
    document.getElementById('mm-set-bgm-enabled')?.addEventListener('change', (e) => {
      this.settings.playBgm = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('mm-set-vol-master')?.addEventListener('input', (e) => {
      const pct = Number(e.target.value) || 0;
      this.settings.masterVolume = Math.max(0, Math.min(1, pct / 100));
      const label = document.getElementById('mm-set-vol-master-val');
      if (label) label.textContent = `${pct}%`;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('mm-set-vol-sfx')?.addEventListener('input', (e) => {
      const pct = Number(e.target.value) || 0;
      this.settings.sfxVolume = Math.max(0, Math.min(1, pct / 100));
      const label = document.getElementById('mm-set-vol-sfx-val');
      if (label) label.textContent = `${pct}%`;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('mm-set-enable-tutorial')?.addEventListener('change', (e) => {
      this.settings.enableTutorial = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
      this.syncSettingsForm();
    });
    document.getElementById('mm-set-resource-gain-notify')?.addEventListener('change', (e) => {
      this.settings.resourceGainNotify = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
      this.syncSettingsForm();
    });
  }

  /** 新开局时按设置决定是否跳过新手教程 */
  applyNewGameTutorialPreference() {
    if (!this.state.tutorial) this.state.tutorial = this.createDefaultTutorialState();
    if (this.settings?.enableTutorial === false) {
      this.state.tutorial.skipped = true;
      this.state.tutorial.completed = true;
      this.state.tutorial.stepIndex = 0;
    } else {
      this.state.tutorial = this.createDefaultTutorialState();
    }
  }

  getDefaultState() {
    const resources = {};
    Object.keys(GAME_DATA.resources).forEach(k => { resources[k] = 0; });
    const startRes = GAME_DATA.startingResources || {};
    Object.entries(startRes).forEach(([k, amt]) => {
      if (resources[k] !== undefined) resources[k] = amt;
    });
    if (!startRes.food) {
      resources.food = GAME_DATA.calendar?.startingFood || 7;
    }

    const resourcePoints = {};
    Object.keys(GAME_DATA.resourcePoints).forEach(k => {
      const def = GAME_DATA.resourcePoints[k];
      if (def.isTreasureChest) {
        resourcePoints[k] = {
          unlocked: false,
          stock: 0,
          _pendingDrops: [],
          currentCount: 0,
          cooldownRemaining: 0,
          upgrades: { dropRate: 0, rewardTypes: 0, rewardAmount: 0 },
          assignedWorkers: 0,
        };
      } else if (def.isAltar) {
        resourcePoints[k] = {
          unlocked: false,
          currentCount: 0,
          cooldownRemaining: 0,
          miningMultiplier: 1,
          upgradeCostScale: { countCd: 1, refine: 1, refineBumps: 0 },
          upgrades: { count: 0, cooldown: 0, double: 0, efficiency: 0 },
          assignedWorkers: 0,
        };
      } else {
        resourcePoints[k] = {
          unlocked: def.unlockRequires == null
            || (GAME_DATA.startingTechs || []).includes(def.unlockRequires),
          currentCount: 0,
          cooldownRemaining: 0,
          miningMultiplier: 1,
          upgradeCostScale: { countCd: 1, refine: 1, refineBumps: 0 },
          upgrades: { count: 0, cooldown: 0, double: 0, efficiency: 0 },
          assignedWorkers: 0,
          buildingCount: def.canBuildMultiple ? 0 : undefined,
        };
      }
    });

    const craftStations = {};
    GAME_DATA.recipes.forEach(r => {
      const st = {
        autoProduce: false,
        cooldownRemaining: 0,
      };
      if (r.isToolRecipe) {
        st.autoRepair = true;
        st.autoRepairThreshold = 10;
      }
      craftStations[r.id] = st;
    });

    const toolInventory = {};
    Object.keys(GAME_DATA.villagerTools || {}).forEach(k => { toolInventory[k] = {}; });
    (GAME_DATA.startingTools || []).forEach(({ id, level, amount }) => {
      if (!id || !GAME_DATA.villagerTools?.[id]) return;
      const lv = Number(level) || 1;
      const n = Math.max(0, Math.floor(Number(amount) || 0));
      if (n <= 0) return;
      if (!toolInventory[id]) toolInventory[id] = {};
      toolInventory[id][lv] = (toolInventory[id][lv] || 0) + n;
    });

    const housing = GAME_DATA.housing || {};
    const startingHouses = housing.startingHouses || 10;
    const startingVillagers = housing.startingVillagers || 10;
    const houses = [];
    for (let i = 0; i < startingHouses; i++) {
      houses.push({ id: `house_${i + 1}`, level: 0 });
    }
    const villagerAges = [];
    for (let i = 0; i < startingVillagers; i++) {
      villagerAges.push({ birthDay: -7, lastBreedDay: null });
    }

    const unlockedTech = [...(GAME_DATA.startingTechs || [])];

    return {
      resources,
      resourcePoints,
      craftStations,
      craftOrderQueue: [],
      craftOrderSeq: 0,
      pendingAutoRepairs: [],
      toolInventory,
      toolDurability: {},
      toolPieces: {},
      _toolSeq: 1,
      _toolPiecesMigratedV1: false,
      unlockedTech,
      workers: { total: startingVillagers, unassigned: startingVillagers, craftWorkers: 0 },
      houses,
      houseUpgradePurchases: { 1: 0, 2: 0 },
      houseBuildCount: startingHouses,
      nextHouseSeq: startingHouses + 1,
      pendingBreeds: 0,
      breedsOrderedToday: 0,
      // 房屋建造/升级进度
      houseBuildProgress: null,   // { progress: 0, startDay: day } or null
      houseUpgradeProgress: {},   // { [houseId]: { progress: 0, startDay: day } }
      // 村民年龄与繁殖冷却
      villagerAges,
      workerLayout: {},
      activeStation: { type: 'point', id: 'forest' },
      activeTab: 'warehouse',
      totalClicks: 0,
      day: 1,
      dayProgress: (() => {
        const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;
        const hour = GAME_DATA.calendar?.startHour ?? 8;
        return (Math.max(0, Math.min(23, hour)) / 24) * dayMs;
      })(),
      hungryCount: 0,
      unlockedAchievements: [],
      lastSaveTime: Date.now(),
      defense: this.createDefaultDefenseState(),
      tutorial: this.createDefaultTutorialState(),
      forestHarvestCount: 0,
      starterChestGranted: false,
      starterChestRevealed: false,
      difficulty: 'normal',
      playerTimeScale: 1,
      speedTipSeen: false,
      gameOver: false,
      gameOverReason: '',
      divineArtifactReady: false,
      finalBattleDay: 0,
      sidebarCollapsed: { forage: false, gather: false, craft: false },
    };
  }

  createDefaultDefenseState() {
    return {
      introSeen: false,
      stance: 'defend',
      posts: { bow: 0, crossbow: 0, sword: 0, spear: 0, shield: 0 },
      soldiers: [],
      _soldierSeq: 1,
      gate: { level: 1, hp: 200, repairWorkers: 0, repairProgress: 0 },
      raid: {
        phase: 'idle',
        nextRaidDay: GAME_DATA.defense?.firstRaidDay || 7,
        failStreak: 0,
        warningMsLeft: 0,
        combatMsLeft: 0,
        log: [],
      },
    };
  }

  /** 旧档可重复科技 → 拆分后的 v1..vn */
  migrateSplitTechSeries() {
    if (!Array.isArray(this.state.unlockedTech)) return;
    const bases = [
      'unlock_house_build_discount',
      'unlock_house_work_speed',
      'unlock_breed_saving',
      'unlock_combat_hp',
      'unlock_combat_atk',
      'unlock_combat_aspd',
      'unlock_gate_repair_speed',
      'unlock_tool_efficiency',
      'unlock_tool_durability',
      'unlock_worker_efficiency',
    ];
    bases.forEach((baseId) => {
      const members = GAME_DATA.techTree.filter((t) => t.techSeries === baseId);
      if (!members.length) return;
      const legacyCount = this.state.unlockedTech.filter((t) => t === baseId).length;
      if (legacyCount <= 0) return;
      this.state.unlockedTech = this.state.unlockedTech.filter((t) => t !== baseId);
      // 旧版「工具精进」单次 +15% → 迁到 v1~v3（每级 +5%）以保持同等加成
      const grant = baseId === 'unlock_tool_efficiency'
        ? Math.min(3, members.length)
        : Math.min(legacyCount, members.length);
      for (let i = 1; i <= grant; i++) {
        const vid = `${baseId}_v${i}`;
        if (!this.state.unlockedTech.includes(vid)) this.state.unlockedTech.push(vid);
      }
    });
  }

  createDefaultTutorialState() {
    return {
      completed: false,
      skipped: false,
      stepIndex: 0,
      berryHarvests: 0,
      forestHarvests: 0,
      starterChestOpened: false,
      axesCrafted: 0,
      weaponsCrafted: 0,
      planksCrafted: 0,
    };
  }

  /** 显示难度选择界面（主菜单开新局 / 重置存档） */
  showDifficultySelect() {
    const el = document.getElementById('difficulty-select');
    if (el) el.classList.remove('hidden');
    this.paused = true;
    this._pickingDifficulty = true;

    // 默认显示正常的因子说明
    const normalDef = GAME_DATA.difficulty?.levels?.normal;
    if (normalDef) {
      document.getElementById('diff-desc').textContent = this._formatDiffDetails('normal');
    }

    // 清除旧的事件（通过克隆替换）
    document.querySelectorAll('.diff-btn').forEach(b => {
      const clone = b.cloneNode(true);
      b.replaceWith(clone);
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
      // 悬停预览因子变化
      btn.addEventListener('mouseenter', () => {
        const diff = btn.dataset.difficulty;
        document.getElementById('diff-desc').textContent = this._formatDiffDetails(diff);
      });
      btn.addEventListener('mouseleave', () => {
        const cur = this.state.difficulty || 'normal';
        document.getElementById('diff-desc').textContent = this._formatDiffDetails(cur);
      });
      // 选定难度 → 中转动画 → 正式进游戏
      btn.addEventListener('click', () => {
        if (this._difficultyConfirming) return;
        this._difficultyConfirming = true;
        const diff = btn.dataset.difficulty;
        this.state.difficulty = diff;
        this.applyDifficultyStartingLoadout();
        void this.beginGameAfterDifficulty().finally(() => {
          this._difficultyConfirming = false;
        });
      });
    });

    const backBtn = document.getElementById('diff-back');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', () => this.cancelDifficultySelect());
    }
  }

  /** 取消难度选择，返回主菜单（或局内重置时回主界面） */
  cancelDifficultySelect() {
    const diffSel = document.getElementById('difficulty-select');
    if (!this._pickingDifficulty && (!diffSel || diffSel.classList.contains('hidden'))) return;
    if (this._difficultyConfirming) return;
    this._pickingDifficulty = false;
    this._difficultyConfirming = false;
    diffSel?.classList.add('hidden');
    if (this._difficultyFromMainMenu || this._atMainMenu) {
      this._difficultyFromMainMenu = false;
      this._inGameSession = false;
      this._atMainMenu = true;
      document.getElementById('boot-shell')?.classList.remove('hidden');
      document.getElementById('main-menu')?.classList.remove('hidden');
      this.showMainMenuHome();
      void this.refreshMainMenuLoadButton();
      this.startMenuBgm();
    } else {
      this._inGameSession = false;
      this.stopGameBgm();
      this.leaveGameToMainMenuShell();
    }
  }

  /** 按所选难度覆盖开局食物与起始工具 */
  applyDifficultyStartingLoadout() {
    const diff = this.state.difficulty || 'normal';
    const def = GAME_DATA.difficulty?.levels?.[diff] || {};
    const food = def.startingFood ?? GAME_DATA.calendar?.startingFood ?? 30;
    if (!this.state.resources) this.state.resources = {};
    this.state.resources.food = food;

    if (!this.state.toolInventory) this.state.toolInventory = {};
    Object.keys(GAME_DATA.villagerTools || {}).forEach((k) => {
      this.state.toolInventory[k] = {};
    });
    this.state.toolDurability = {};
    this.state.toolPieces = {};
    this.state._toolSeq = 1;
    this.state._toolPiecesMigratedV1 = true;
    this.state.armorPieces = [];
    this.state._armorSeq = 1;
    this.state._armorMigratedV1 = true;
    (def.startingTools || []).forEach(({ id, level, amount }) => {
      if (!id || !GAME_DATA.villagerTools?.[id]) return;
      const lv = Number(level) || 1;
      const n = Math.max(0, Math.floor(Number(amount) || 0));
      if (n > 0) this.addTool(id, n, lv);
    });
  }

  /** 格式化难度因子说明 */
  _formatDiffDetails(diffId) {
    const def = GAME_DATA.difficulty?.levels?.[diffId];
    if (!def) return '';
    const lines = [def.desc];
    if (def.foodMult !== undefined && def.foodMult !== 1) {
      const pct = Math.round((def.foodMult - 1) * 100);
      const sign = pct > 0 ? '+' : '';
      lines.push(`食物消耗: ${sign}${pct}%`);
    } else if (def.foodMult !== undefined) {
      lines.push(`食物消耗: ${Math.round(def.foodMult * 100)}%`);
    }
    if (def.startingFood != null) {
      lines.push(`开局食物: ${def.startingFood}`);
    }
    const tools = def.startingTools || [];
    if (tools.length > 0) {
      const labels = tools.map((t) => {
        const name = GAME_DATA.villagerTools?.[t.id]?.levelNames?.[t.level || 1]
          || GAME_DATA.villagerTools?.[t.id]?.name
          || t.id;
        return `${name}×${t.amount || 1}`;
      });
      lines.push(`开局工具: ${labels.join('、')}`);
    } else if (def.startingTools) {
      lines.push('开局工具: 无');
    }
    if (def.bossAtkMult !== undefined && def.bossAtkMult !== 1) {
      const pct = Math.round((def.bossAtkMult - 1) * 100);
      const sign = pct > 0 ? '+' : '';
      lines.push(`魔王攻击: ${sign}${pct}%`);
    }
    if (def.bossHpMult !== undefined && def.bossHpMult !== 1) {
      const pct = Math.round((def.bossHpMult - 1) * 100);
      const sign = pct > 0 ? '+' : '';
      lines.push(`魔王生命: ${sign}${pct}%`);
    }
    if (def.raidIntervalMult !== undefined && def.raidIntervalMult >= 10) {
      lines.push('袭击: 无');
    } else if (def.raidIntervalMult !== undefined && def.raidIntervalMult < 1) {
      const pct = Math.round((1 - def.raidIntervalMult) * 100);
      lines.push(`袭击频率: +${pct}%`);
    } else if (def.raidIntervalMult !== undefined && def.raidIntervalMult > 1) {
      const pct = Math.round((1 - def.raidIntervalMult) * 100);
      lines.push(`袭击频率: ${pct}%`);
    }
    if (def.firstRaidDay && def.firstRaidDay < 7) {
      lines.push(`首次袭击: 第${def.firstRaidDay}天`);
    }
    return lines.join('\n');
  }

  /** 难度选择后继续初始化流程 */
  resumeAfterDifficultySetup({ deferIntro = false } = {}) {
    this._pickingDifficulty = false;
    // 确保隐藏难度选择界面
    document.getElementById('difficulty-select')?.classList.add('hidden');
    // 开局/重置后固定落在森林采集，避免停在科技合屏导致点不到中间
    this.state.activeTab = 'warehouse';
    this.state.activeStation = { type: 'point', id: 'forest' };
    this._hideTechTreeOverlay?.();
    this._hideDefenseOverlay?.();
    // 根据难度同步首次袭击日
    if (typeof this.ensureDefenseState === 'function') {
      const d = this.ensureDefenseState();
      if (d.raid && d.raid.phase === 'idle') {
        d.raid.nextRaidDay = GAME_DATA.difficulty?.levels?.[this.state.difficulty]?.firstRaidDay
          ?? GAME_DATA.defense?.firstRaidDay ?? 7;
      }
    }
    this.checkAchievements(true);
    this.setupEventListeners();
    this.sounds.bindUnlock();
    if (!this._windowLifecycleBound) {
      this._windowLifecycleBound = true;
      window.addEventListener('beforeunload', () => this.save());
      window.addEventListener('resize', () => {
        this.updateUiScale();
        this.updateUnlockToastPosition();
        this.updateTutSpotlight();
      });
    }
    this.startGameLoop();
    this.updateUiScale();
    this.render();
    this.updateSpeedButtons();
    this.syncDevTimeScaleUI();
    this.updateUnlockToastPosition();
    this.syncGameOverUI();
    this._starvationDialogOpen = false;
    this._pendingStarvationAlert = null;
    this.checkPopulationGameOver(this.state.gameOverReason || '村落无法再延续');
    if (!deferIntro) this.showDefenseIntroIfNeeded();
    this.startTutorialIfNeeded();
  }

  // ========== 存档 ==========
  save() {
    if (!this._inGameSession) return;
    this.state.lastSaveTime = Date.now();
    const raw = JSON.stringify(this.state);
    const api = this._saveApi();
    if (api?.write) {
      void api.write(raw).catch((e) => console.warn('[save]', e));
      return;
    }
    try {
      localStorage.setItem('factoryGame', raw);
    } catch (e) { /* ignore */ }
  }

  async load() {
    try {
      let saved = null;
      const api = this._saveApi();
      if (api?.read) {
        saved = await api.read();
        // 首次切到目录存档：把旧 localStorage 迁过去
        if (!saved) {
          const legacy = localStorage.getItem('factoryGame');
          if (legacy) {
            await api.write(legacy);
            try { localStorage.removeItem('factoryGame'); } catch (_) { /* ignore */ }
            saved = legacy;
          }
        }
      } else {
        saved = localStorage.getItem('factoryGame');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.getDefaultState(), ...parsed };
        this.migrateState();
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  migrateState() {
    const defaults = this.getDefaultState();
    Object.keys(defaults.resources).forEach(k => {
      if (this.state.resources[k] === undefined) {
        this.state.resources[k] = k === 'food' ? (GAME_DATA.calendar?.startingFood || 20) : 0;
      }
    });
    Object.keys(defaults.resourcePoints).forEach(k => {
      if (!this.state.resourcePoints[k]) {
        this.state.resourcePoints[k] = defaults.resourcePoints[k];
      } else {
        const pt = this.state.resourcePoints[k];
        const def = GAME_DATA.resourcePoints[k];
        if (def?.isTreasureChest) {
          if (pt.stock === undefined) pt.stock = 0;
          if (!pt.upgrades) pt.upgrades = { dropRate: 0, rewardTypes: 0, rewardAmount: 0 };
          ['dropRate', 'rewardTypes', 'rewardAmount'].forEach(key => {
            if (pt.upgrades[key] === undefined) pt.upgrades[key] = 0;
          });
        } else if (def) {
          if (pt.miningMultiplier === undefined) pt.miningMultiplier = 1;
          if (!pt.upgradeCostScale) pt.upgradeCostScale = { countCd: 1, refine: 1, refineBumps: 0, countBaseOffset: 0, cooldownBaseOffset: 0 };
          if (pt.upgradeCostScale.countCd === undefined) pt.upgradeCostScale.countCd = 1;
          if (pt.upgradeCostScale.refine === undefined) pt.upgradeCostScale.refine = 1;
          if (pt.upgradeCostScale.refineBumps === undefined) pt.upgradeCostScale.refineBumps = 0;
          if (pt.upgradeCostScale.countBaseOffset === undefined) pt.upgradeCostScale.countBaseOffset = 0;
          if (pt.upgradeCostScale.cooldownBaseOffset === undefined) pt.upgradeCostScale.cooldownBaseOffset = 0;
          if (!pt.upgrades) pt.upgrades = { count: 0, cooldown: 0, double: 0, efficiency: 0 };
          if (pt.upgrades.efficiency === undefined) pt.upgrades.efficiency = 0;
          ['count', 'cooldown', 'double', 'efficiency'].forEach(key => {
            const max = def.maxUpgrades?.[key];
            if (max !== undefined && pt.upgrades[key] > max) pt.upgrades[key] = max;
          });
          if (def.canBuildMultiple) {
            if (pt.buildingCount === undefined || pt.buildingCount === null) {
              pt.buildingCount = pt.unlocked ? 1 : 0;
            }
          }
        }
      }
    });
    Object.keys(defaults.craftStations).forEach(k => {
      if (!this.state.craftStations[k]) {
        this.state.craftStations[k] = defaults.craftStations[k];
      } else {
        const st = this.state.craftStations[k];
        const legacyAuto = !!st.autoCraft;
        delete st.autoCraft;
        delete st.activated;
        delete st.currentCount;
        if (st.cooldownRemaining === undefined) st.cooldownRemaining = 0;
        if (st.assignedWorkers === undefined) st.assignedWorkers = 0;
        if (st.autoProduce === undefined) st.autoProduce = legacyAuto;
        if (st.autoMode === undefined) st.autoMode = 'always';
        if (st.autoThreshold === undefined) st.autoThreshold = 10;
        if (st.cooldownTotal === undefined) st.cooldownTotal = 0;
        const recipe = GAME_DATA.recipes.find(r => r.id === k);
        if (recipe?.isToolRecipe) {
          if (st.autoRepair === undefined) st.autoRepair = true;
          if (st.autoRepairThreshold === undefined) st.autoRepairThreshold = 10;
        }
      }
    });
    Object.entries(this.state.resourcePoints).forEach(([pointId, pt]) => {
      if (pt.cooldownRemaining > 0 && !pt.cooldownTotal) {
        pt.cooldownTotal = pt.cooldownRemaining;
      }
      if (pt.cooldownRemaining <= 0) pt.cooldownTotal = 0;
      // 存档中的采集动画不续播，结算到稳定状态
      if (pt._gatherAnim) {
        const anim = pt._gatherAnim;
        delete pt._gatherAnim;
        if (anim.phase === 'fill' && Number(anim.yieldAmount) > 0) {
          this._grantPointHarvestLoot(pointId, anim.yieldAmount);
        }
        if ((anim.phase === 'fill' || anim.phase === 'full') && !(pt.cooldownRemaining > 0)) {
          this.startCooldown('point', pointId);
        }
        pt.currentCount = Math.max(0, Number(anim.overflow) || 0);
      }
    });
    if (Array.isArray(this.state.craftOrders) && this.state.craftOrders.length > 0 && (!this.state.craftQueues || typeof this.state.craftQueues === 'object' && Object.keys(this.state.craftQueues).length === 0)) {
      // 旧版 craftOrders 数组 → craftQueues map
      if (!this.state.craftQueues) this.state.craftQueues = {};
      this.state.craftOrders.forEach(o => {
        const q = this.state.craftQueues[o.recipeId] || { quantity: 0, progress: 0 };
        if (q.quantity === 0) q.progress = o.progress || 0;
        q.quantity += 1;
        this.state.craftQueues[o.recipeId] = q;
      });
    }
    delete this.state.craftOrders;
    delete this.state.craftOrderSeq;
    // —— craftQueues map → craftOrderQueue 数组 ——
    if (this.state.craftQueues && typeof this.state.craftQueues === 'object' && !Array.isArray(this.state.craftQueues)) {
      const oldQueues = this.state.craftQueues;
      if (!this.state.craftOrderQueue) this.state.craftOrderQueue = [];
      // 旧格式：每个 recipe 的 quantity 合并为一个订单
      Object.entries(oldQueues).forEach(([recipeId, q]) => {
        if (q.quantity > 0) {
          this.state.craftOrderQueue.push({
            id: (this.state.craftOrderSeq = (this.state.craftOrderSeq || 0) + 1),
            recipeId,
            count: q.quantity,
            progress: q.progress || 0,
            assignedWorkers: 0,
            autoProduced: false,
          });
        }
      });
    }
    delete this.state.craftQueues;
    if (!this.state.craftOrderQueue) this.state.craftOrderQueue = [];
    if (this.state.craftOrderSeq == null) this.state.craftOrderSeq = 0;
    // —— 旧版 recipe assignedWorkers → 全局 craftWorkers ——
    if (!this.state.workers) this.state.workers = {};
    if (this.state.workers.craftWorkers === undefined) {
      const oldCraftWorkers = Object.values(this.state.craftStations || {}).reduce((sum, st) => sum + (st.assignedWorkers || 0), 0);
      this.state.workers.craftWorkers = Math.min(oldCraftWorkers, this.state.workers.total || 0);
    }
    // 清理旧版 recipe assignedWorkers
    Object.values(this.state.craftStations || {}).forEach(st => {
      if (st.assignedWorkers !== undefined) {
        st.assignedWorkers = undefined;
      }
    });

    if (!this.state.toolInventory) this.state.toolInventory = {};
    Object.keys(GAME_DATA.villagerTools || {}).forEach(k => {
      const v = this.state.toolInventory[k];
      if (typeof v === 'number') {
        this.state.toolInventory[k] = v > 0 ? { 1: v } : {};
      } else if (!v || typeof v !== 'object') {
        this.state.toolInventory[k] = {};
      }
    });
    if (!this.state.toolDurability) this.state.toolDurability = {};
    if (!this.state.toolPieces) this.state.toolPieces = {};
    if (this.state._toolSeq == null) this.state._toolSeq = 1;
    this.ensureArmorPieces();
    this.ensureToolPieces();
    this.purgeRemovedBasketTools();
    Object.keys(GAME_DATA.villagerTools || {}).forEach(toolId => {
      if (toolId === 'armor') return;
      const maxLv = GAME_DATA.villagerTools[toolId]?.maxLevel || 4;
      if (!this.state.toolDurability[toolId] || typeof this.state.toolDurability[toolId] !== 'object') {
        this.state.toolDurability[toolId] = {};
      }
      for (let lv = 1; lv <= maxLv; lv++) {
        const count = this.getToolCount(toolId, lv);
        if (count <= 0) {
          delete this.state.toolDurability[toolId][lv];
          continue;
        }
        // 兼容旧字段：用按件平均耐久回填共享池显示值
        const avg = this.getToolDurability(toolId, lv);
        this.state.toolDurability[toolId][lv] = avg;
      }
    });
    // 旧版工具等级折算为 1 级库存
    if (this.state.tools) {
      Object.entries(this.state.tools).forEach(([id, tool]) => {
        const level = tool?.level || 0;
        if (level < 1) return;
        let toolId = null;
        if (id.includes('axe')) toolId = 'axe';
        else if (id.includes('shovel')) toolId = 'shovel';
        else if (id.includes('pickaxe')) toolId = 'pickaxe';
        if (!toolId) return;
        const cur = this.getToolCount(toolId, 1);
        if (level > cur) this.setToolCount(toolId, 1, level);
      });
      delete this.state.tools;
    }

    // 旧工具配方 ID → 1 级配方
    const legacyToolRecipes = {
      craft_axe: 'craft_axe_1',
      craft_pickaxe: 'craft_pickaxe_1',
      craft_shovel: 'craft_shovel_1',
    };
    if (!this.state.workerLayout) this.state.workerLayout = {};
    if (!this.state.craftOrderQueue) this.state.craftOrderQueue = [];
    if (this.state.craftOrderSeq == null) this.state.craftOrderSeq = 0;
    Object.entries(legacyToolRecipes).forEach(([oldId, newId]) => {
      const oldQ = this.state.craftOrderQueue ? this.state.craftOrderQueue.filter(o => o.recipeId === oldId) : [];
      if (oldQ.length > 0) {
        const totalCount = oldQ.reduce((s, o) => s + o.count, 0);
        if (totalCount > 0) {
          this.state.craftOrderQueue.push({
            id: this.state.craftOrderSeq++,
            recipeId: newId,
            count: totalCount,
            progress: oldQ[0]?.progress || 0,
            assignedWorkers: 0,
            autoProduced: false,
          });
        }
        this.state.craftOrderQueue = this.state.craftOrderQueue.filter(o => o.recipeId !== oldId);
      }
      // 旧 tool recipe ID 已在 craftOrderQueue 中转换，清理可能的残留
      if (this.state.craftStations?.[oldId]) {
        if (!this.state.craftStations[newId]) {
          this.state.craftStations[newId] = this.state.craftStations[oldId];
        } else {
          this.state.craftStations[newId].assignedWorkers =
            (this.state.craftStations[newId].assignedWorkers || 0)
            + (this.state.craftStations[oldId].assignedWorkers || 0);
        }
        delete this.state.craftStations[oldId];
      }
      const oldKey = this.stationKey('recipe', oldId);
      const newKey = this.stationKey('recipe', newId);
      if (this.state.workerLayout?.[oldKey]) {
        this.state.workerLayout[newKey] =
          (this.state.workerLayout[newKey] || 0) + this.state.workerLayout[oldKey];
        delete this.state.workerLayout[oldKey];
      }
    });
    if (this.state.activeStation?.type === 'recipe' && legacyToolRecipes[this.state.activeStation.id]) {
      this.state.activeStation.id = legacyToolRecipes[this.state.activeStation.id];
    }

    // 旧档：木质武器曾并入工作台；现已拆为 unlock_weapons_lv*
    if (Array.isArray(this.state.unlockedTech)) {
      const mapped = [];
      for (const id of this.state.unlockedTech) {
        if (id === 'unlock_wood_weapons') {
          if (!mapped.includes('unlock_weapons_lv1')) mapped.push('unlock_weapons_lv1');
          continue;
        }
        mapped.push(id);
      }
      this.state.unlockedTech = mapped;
    }

    if (!this.state.workers) this.state.workers = { ...defaults.workers };
    if (!this.state.houses || !this.state.houses.length) {
      this.state.houses = defaults.houses.map(h => ({ ...h }));
      this.state.houseBuildCount = defaults.houseBuildCount;
      this.state.nextHouseSeq = defaults.nextHouseSeq;
    }
    if (!this.state.houseUpgradePurchases) this.state.houseUpgradePurchases = { 1: 0, 2: 0 };
    if (this.state.houseBuildCount === undefined) this.state.houseBuildCount = this.state.houses.length;
    if (this.state.nextHouseSeq === undefined) this.state.nextHouseSeq = this.state.houses.length + 1;
    if (this.state.pendingBreeds === undefined) this.state.pendingBreeds = 0;
    if (this.state.breedsOrderedToday === undefined) this.state.breedsOrderedToday = 0;
    delete this.state.breedProgress;

    // 旧雇工数量不足时补到起始村民数
    const startV = GAME_DATA.housing?.startingVillagers || 10;
    if ((this.state.workers.total || 0) < startV && !(this.state.unlockedTech || []).includes('unlock_hire_worker')) {
      const add = startV - this.state.workers.total;
      this.state.workers.total = startV;
      this.state.workers.unassigned = (this.state.workers.unassigned || 0) + add;
    }

    if (this.state.day === undefined) this.state.day = 1;
    if (this.state.dayProgress === undefined) this.state.dayProgress = 0;
    if (this.state.hungryCount === undefined) this.state.hungryCount = 0;
    if (!Array.isArray(this.state.unlockedAchievements)) this.state.unlockedAchievements = [];
    if (this.state.resourcePoints.berry_bush) this.state.resourcePoints.berry_bush.unlocked = true;

    if (!this.state.defense) {
      this.state.defense = this.createDefaultDefenseState();
    } else if (this.state.defense.introSeen === undefined) {
      this.state.defense.introSeen = false;
    }
    if (!this.state.tutorial) {
      // 旧档：不强制重做教程
      this.state.tutorial = { ...this.createDefaultTutorialState(), completed: true, skipped: true };
    } else {
      this.state.tutorial = { ...this.createDefaultTutorialState(), ...this.state.tutorial };
    }
    if (this.state.forestHarvestCount === undefined) this.state.forestHarvestCount = 0;
    if (this.state.starterChestGranted === undefined) this.state.starterChestGranted = false;
    if (this.state.starterChestRevealed === undefined) {
      // 旧档若已解锁宝箱入口，视为已揭示；新档等首次掉落后再展示
      this.state.starterChestRevealed = !!this.state.resourcePoints.treasure_chest?.unlocked;
    }
    this.migrateSplitTechSeries();
    // 已移除「自动化工厂」：清掉旧档标记与科技 id（效率由村民训练承担）
    if (this.state.autoFactory !== undefined) delete this.state.autoFactory;
    if (Array.isArray(this.state.unlockedTech)) {
      this.state.unlockedTech = this.state.unlockedTech.filter((t) => t !== 'unlock_auto_factory');
    }
    (GAME_DATA.startingTechs || []).forEach((techId) => {
      if (!this.state.unlockedTech.includes(techId)) {
        this.state.unlockedTech.push(techId);
      }
      Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
        if (def.unlockRequires === techId) this.unlockResourcePoint(id);
      });
    });
    // 费用为 0 的科技：前置已满足则自动跟随解锁（兼容旧档 / 编辑器改费用）
    this._autoUnlockFreeTechs();
    if (this.state.resourcePoints.forest) this.state.resourcePoints.forest.unlocked = true;
    // 旧存档迁移：已有库存但无 _pendingDrops，按当前等级补生成
    const chestPt = this.state.resourcePoints.treasure_chest;
    if (chestPt) {
      if (!Array.isArray(chestPt._pendingDrops)) chestPt._pendingDrops = [];
      const stock = chestPt.stock || 0;
      const missing = stock - chestPt._pendingDrops.length;
      for (let i = 0; i < missing; i++) {
        chestPt._pendingDrops.push(this.rollChestRewards());
      }
    }
    if (this.state.speedTipSeen === undefined) this.state.speedTipSeen = false;
    if (this.state.playerTimeScale === undefined) this.state.playerTimeScale = 1;
    this.ensureSidebarCollapsedState();
    {
      const pts = Number(this.state.playerTimeScale) || 1;
      this.timeScale = [1, 2, 4].includes(pts) ? pts : 1;
      this.state.playerTimeScale = this.timeScale;
      this.devTimeScale = this.timeScale;
    }

    // 人数上限站点：超出则退回空闲
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!def.maxWorkers) return;
      const pt = this.state.resourcePoints[id];
      if (!pt) return;
      const cap = this.getStationWorkerCap('point', id);
      if ((pt.assignedWorkers || 0) <= cap) return;
      const excess = pt.assignedWorkers - cap;
      pt.assignedWorkers = cap;
      this.state.workers.unassigned = (this.state.workers.unassigned || 0) + excess;
      const key = this.stationKey('point', id);
      if (this.state.workerLayout?.[key] > cap) this.state.workerLayout[key] = cap;
    });

    if (this.state.activePoint && !this.state.activeStation) {
      this.state.activeStation = { type: 'point', id: this.state.activePoint };
    }
    if (!this.state.activeStation) {
      this.state.activeStation = { type: 'point', id: 'forest' };
    }

    // —— 新增字段迁移 ——
    if (!this.state.houseBuildProgress) this.state.houseBuildProgress = null;
    if (!this.state.houseUpgradeProgress) this.state.houseUpgradeProgress = {};
    if (!this.state.villagerAges || !this.state.villagerAges.length) {
      this.state.villagerAges = [];
      for (let i = 0; i < (this.state.workers?.total || 0); i++) {
        this.state.villagerAges.push({ birthDay: -7, lastBreedDay: null });
      }
    }

    this.migratePointUpgradesToTech();
    this.migrateGateTechsFromLevel();
    this.migrateCooldownUpgradeCapTo5();
    this.migrateCountUpgradeCapTo5();
    this.migrateZincMineToIron();
    this.migrateMetalSimplify();
    this.migrateSmeltSlabTechs();
    this.migratePlankHouseUpgradeTechs();
    this.migrateGearLevelTechs();
    this.migrateCraftEfficiencyTechs();
    this.migrateRemovedHighResources();
    this.enforceAutoProduceTechGate();
    this.ensureSanctuaryState();
  }

  /** 旧存档：锌矿→铁矿；黄铜/青铜/锡清理为铜铁钢体系 */
  migrateZincMineToIron() {
    if (this.state._zincToIronMigrated) return;
    const res = this.state.resources;
    if (res && typeof res === 'object') {
      const zinc = Number(res.zinc_ore) || 0;
      if (zinc > 0) {
        res.iron_ingot = (Number(res.iron_ingot) || 0) + zinc;
      }
      delete res.zinc_ore;
    }
    if (this.state.resourcePoints && this.state.resourcePoints.zinc_mine) {
      this.state.resourcePoints.iron_mine = this.state.resourcePoints.zinc_mine;
      delete this.state.resourcePoints.zinc_mine;
    }
    if (Array.isArray(this.state.unlockedTech)) {
      this.state.unlockedTech = this.state.unlockedTech.map((id) => {
        if (id === 'unlock_zinc_mine') return 'unlock_iron_mine';
        if (typeof id === 'string' && id.startsWith('point_up_zinc_mine_')) {
          return id.replace('point_up_zinc_mine_', 'point_up_iron_mine_');
        }
        return id;
      });
    }
    this.state._zincToIronMigrated = true;
  }

  migrateMetalSimplify() {
    if (this.state._metalSimplifyMigrated) return;
    const res = this.state.resources;
    if (res && typeof res === 'object') {
      const add = (to, from) => {
        const n = Number(res[from]) || 0;
        if (n > 0) res[to] = (Number(res[to]) || 0) + n;
        delete res[from];
      };
      add('iron_ingot', 'brass');
      add('copper_ingot', 'bronze');
      add('copper_ore', 'tin_ore');
      // 旧版铁矿点直接产铁锭：库存保留；新产线用铁矿石
    }
    if (this.state.resourcePoints) {
      delete this.state.resourcePoints.tin_mine;
    }
    if (Array.isArray(this.state.unlockedTech)) {
      const drop = new Set([
        'unlock_tin_mine',
        'unlock_bronze_craft',
        'unlock_brass_craft',
        'unlock_copper_smelt',
      ]);
      const mapped = [];
      for (const id of this.state.unlockedTech) {
        if (drop.has(id)) {
          if (id === 'unlock_copper_smelt' && !mapped.includes('unlock_furnace')) {
            mapped.push('unlock_furnace');
          }
          continue;
        }
        if (typeof id === 'string' && id.startsWith('point_up_tin_mine_')) continue;
        mapped.push(id);
      }
      this.state.unlockedTech = mapped;
    }
    this.state._metalSimplifyMigrated = true;
  }

  /** 石板/铁锭/钢锭改为独立科技：旧存档按原前置补发解锁 */
  migrateSmeltSlabTechs() {
    if (this.state._smeltSlabTechsMigrated) return;
    const unlocked = this.state.unlockedTech;
    if (Array.isArray(unlocked)) {
      const grant = (ifHas, addId) => {
        if (unlocked.includes(ifHas) && !unlocked.includes(addId)) unlocked.push(addId);
      };
      grant('unlock_quarry', 'unlock_stone_slab');
      grant('unlock_furnace', 'unlock_iron_smelt');
      grant('unlock_furnace_upgrade', 'unlock_steel_smelt');
    }
    this.state._smeltSlabTechsMigrated = true;
  }

  /** 木板加工 / 房屋各级升级改为独立科技：旧档补发 */
  migratePlankHouseUpgradeTechs() {
    if (this.state._plankHouseUpgradeTechsMigrated) return;
    const unlocked = this.state.unlockedTech;
    if (Array.isArray(unlocked)) {
      const grant = (addId) => {
        if (!unlocked.includes(addId)) unlocked.push(addId);
      };
      // 旧版木板随工作台开放
      if (unlocked.includes('unlock_workbench')) grant('unlock_plank_craft');
      // 已达到过的房屋等级对应升级科技补发
      let maxLv = 0;
      (this.state.houses || []).forEach((h) => {
        maxLv = Math.max(maxLv, Number(h.level) || 0);
      });
      const purchases = this.state.houseUpgradePurchases || {};
      Object.keys(purchases).forEach((k) => {
        if ((Number(purchases[k]) || 0) > 0) maxLv = Math.max(maxLv, Number(k) || 0);
      });
      for (let lv = 1; lv <= maxLv; lv++) grant(`unlock_house_upgrade_${lv}`);
    }
    this.state._plankHouseUpgradeTechsMigrated = true;
  }

  /** 工具/武器分等级独立科技：按旧前置补发 */
  migrateGearLevelTechs() {
    if (this.state._gearLevelTechsMigrated) return;
    const unlocked = this.state.unlockedTech;
    if (Array.isArray(unlocked)) {
      const grant = (addId) => {
        if (!unlocked.includes(addId)) unlocked.push(addId);
      };
      if (unlocked.includes('unlock_tool_crafting') || unlocked.includes('unlock_workbench')) {
        grant('unlock_tools_lv1');
      }
      if (unlocked.includes('unlock_wood_weapons')) grant('unlock_weapons_lv1');
      if (unlocked.includes('unlock_quarry')) {
        grant('unlock_tools_lv2');
        grant('unlock_weapons_lv2');
      }
      if (unlocked.includes('unlock_iron_smelt') || unlocked.includes('unlock_furnace')) {
        grant('unlock_tools_lv3');
        grant('unlock_weapons_lv3');
      }
      if (unlocked.includes('unlock_steel_smelt') || unlocked.includes('unlock_furnace_upgrade')) {
        grant('unlock_tools_lv4');
        grant('unlock_weapons_lv4');
      }
    }
    this.state._gearLevelTechsMigrated = true;
  }

  /** 原高级工作台附带订单 0.2/人/秒：改为独立合成效率科技，旧档补发满级 */
  migrateCraftEfficiencyTechs() {
    if (this.state._craftEfficiencyTechsMigrated) return;
    const unlocked = this.state.unlockedTech;
    if (Array.isArray(unlocked) && unlocked.includes('unlock_advanced_workbench')) {
      for (let i = 1; i <= 5; i++) {
        const id = `unlock_craft_efficiency_v${i}`;
        if (!unlocked.includes(id)) unlocked.push(id);
      }
    }
    this.state._craftEfficiencyTechsMigrated = true;
  }

  /** 去掉高级/终极资源后：丢弃未知资源键与已删资源点/配方状态，清理已删科技 id */
  migrateRemovedHighResources() {
    if (this.state._highResourcesRemovedMigrated) return;
    const validRes = new Set(Object.keys(GAME_DATA.resources || {}));
    if (this.state.resources && typeof this.state.resources === 'object') {
      Object.keys(this.state.resources).forEach((k) => {
        if (!validRes.has(k)) delete this.state.resources[k];
      });
    }
    const validPoints = new Set(Object.keys(GAME_DATA.resourcePoints || {}));
    if (this.state.resourcePoints && typeof this.state.resourcePoints === 'object') {
      Object.keys(this.state.resourcePoints).forEach((k) => {
        if (!validPoints.has(k)) delete this.state.resourcePoints[k];
      });
    }
    const validRecipes = new Set((GAME_DATA.recipes || []).map((r) => r.id));
    if (this.state.craftStations && typeof this.state.craftStations === 'object') {
      Object.keys(this.state.craftStations).forEach((k) => {
        if (!validRecipes.has(k)) delete this.state.craftStations[k];
      });
    }
    const validTechs = new Set((GAME_DATA.techTree || []).map((t) => t.id));
    if (Array.isArray(this.state.unlockedTech)) {
      this.state.unlockedTech = this.state.unlockedTech.filter((t) => validTechs.has(t));
    }
    this.state._highResourcesRemovedMigrated = true;
  }

  /**
   * 将某类资源点升级从旧 10 级映射到新 5 级（效果按比例接近）
   * 旧 Lv10 → 新 Lv5 = 满级效果不变
   */
  _migratePointUpgradeCapTo5(type, flagKey) {
    if (this.state[flagKey]) return;
    if (!Array.isArray(this.state.unlockedTech)) this.state.unlockedTech = [];
    const OLD_MAX = 10;
    Object.keys(GAME_DATA.resourcePoints || {}).forEach((pointId) => {
      const def = GAME_DATA.resourcePoints[pointId];
      const newMax = def?.maxUpgrades?.[type] || 0;
      if (!(newMax > 0)) return;
      const techId = this.getPointUpgradeTechId(pointId, type);
      const oldLevel = this.state.unlockedTech.filter((t) => t === techId).length;
      if (oldLevel <= 0) return;
      const mapped = Math.min(newMax, Math.round((oldLevel * newMax) / OLD_MAX));
      this.state.unlockedTech = this.state.unlockedTech.filter((t) => t !== techId);
      for (let i = 0; i < mapped; i++) this.state.unlockedTech.push(techId);
    });
    this.state[flagKey] = true;
  }

  migrateCooldownUpgradeCapTo5() {
    this._migratePointUpgradeCapTo5('cooldown', '_cooldownUpgradeCap5Migrated');
  }

  migrateCountUpgradeCapTo5() {
    this._migratePointUpgradeCapTo5('count', '_countUpgradeCap5Migrated');
  }

  migrateGateTechsFromLevel() {
    if (this.state._gateTechMigrated) return;
    if (!Array.isArray(this.state.unlockedTech)) this.state.unlockedTech = [];
    const lv = this.state.defense?.gate?.level || 1;
    const map = {
      2: 'unlock_gate_lv2',
      3: 'unlock_gate_lv3',
      4: 'unlock_gate_lv4',
    };
    for (let i = 2; i <= lv; i++) {
      const id = map[i];
      if (id && !this.state.unlockedTech.includes(id)) this.state.unlockedTech.push(id);
    }
    this.state._gateTechMigrated = true;
  }

  migratePointUpgradesToTech() {
    if (this.state._pointUpgradeTechMigrated) return;
    if (!Array.isArray(this.state.unlockedTech)) this.state.unlockedTech = [];

    Object.entries(GAME_DATA.resourcePoints).forEach(([pointId, def]) => {
      const pt = this.state.resourcePoints[pointId];
      if (!pt?.upgrades) return;

      const pushRepeats = (legacyType, techType = legacyType) => {
        const lv = pt.upgrades[legacyType] || 0;
        const techId = this.getPointUpgradeTechId(pointId, techType);
        const existing = this.state.unlockedTech.filter(t => t === techId).length;
        for (let i = existing; i < lv; i++) this.state.unlockedTech.push(techId);
      };

      if (def.maxUpgrades?.count > 0) {
        pushRepeats('count', 'count');
        pushRepeats('cooldown', 'cooldown');
        const refineLv = Math.min(pt.upgrades.double || 0, 1);
        const refineId = this.getPointUpgradeTechId(pointId, 'refine');
        if (refineLv > 0 && !this.state.unlockedTech.includes(refineId)) {
          this.state.unlockedTech.push(refineId);
        }
      }
      if (def.maxUpgrades?.efficiency > 0) pushRepeats('efficiency', 'efficiency');
      if (def.isTreasureChest) {
        ['dropRate', 'rewardTypes', 'rewardAmount'].forEach(t => pushRepeats(t, t));
      }
    });

    this.state._pointUpgradeTechMigrated = true;
  }

  reset({ skipConfirm = false } = {}) {
    if (!skipConfirm && !confirm('确定要重置所有进度吗？此操作不可撤销！')) return;
    const api = this._saveApi();
    if (api?.clear) void api.clear().catch(() => {});
    try { localStorage.removeItem('factoryGame'); } catch (_) { /* ignore */ }
    this.state = this.getDefaultState();
    this.state.difficulty = 'normal';
    this.timeScale = 1;
    this.devTimeScale = 1;
    document.getElementById('game-over')?.classList.add('hidden');
    document.getElementById('story-dialog')?.classList.add('hidden');
    document.getElementById('defense-intro')?.classList.add('hidden');
    this._starvationDialogOpen = false;
    this._pendingStarvationAlert = null;
    // 重置难度选择（局内重置，不经主菜单）
    this._difficultyFromMainMenu = false;
    this.showDifficultySelect();
  }

  /** 主菜单设置：只清存档，不进入选难度 */
  async resetSaveFromMainMenu() {
    if (!confirm('确定要重置存档吗？此操作不可撤销！')) return;
    await this.clearSaveFiles();
    this.state = this.getDefaultState();
    this.state.difficulty = 'normal';
    document.getElementById('main-menu-achievements')?.classList.add('hidden');
    this.showMainMenuHome();
    await this.refreshMainMenuLoadButton();
    this.showNotification('存档已重置');
  }

  // ========== 背景介绍（两页漫画）/ 新手教程 ==========
  getComicTotalPanels() {
    return 9; // 第1页 5 格 + 第2页 4 格
  }

  setComicPage(page) {
    const root = document.getElementById('defense-intro');
    if (!root) return;
    root.querySelectorAll('.comic-page').forEach((el) => {
      el.classList.toggle('is-active', Number(el.dataset.page) === page);
    });
  }

  resetComicIntro() {
    this._comicPanelIndex = 1;
    this._comicDismissing = false;
    const root = document.getElementById('defense-intro');
    if (!root) return;
    root.classList.remove('comic-outro', 'comic-blackout');
    this.setComicPage(1);
    root.querySelectorAll('.comic-panel').forEach((panel) => {
      const n = Number(panel.dataset.panel || 0);
      panel.classList.toggle('is-visible', n === 1);
      panel.classList.remove('is-shaking');
    });
    const hint = document.getElementById('comic-hint');
    if (hint) {
      hint.classList.remove('hidden');
      hint.textContent = '点击继续';
    }
    document.getElementById('comic-skip')?.classList.remove('hidden');
  }

  shakeComicPanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-shaking');
    // 强制重触发动画
    void panel.offsetWidth;
    panel.classList.add('is-shaking');
    const onEnd = () => {
      panel.classList.remove('is-shaking');
      panel.removeEventListener('animationend', onEnd);
    };
    panel.addEventListener('animationend', onEnd);
  }

  /** 漫画页期间压住主界面，结束后再渐显 */
  holdAppForComic(hold) {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('app-fade-in');
    app.classList.toggle('app-awaiting-comic', !!hold);
  }

  revealAppAfterComic() {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('app-awaiting-comic');
    app.classList.remove('app-fade-in');
    void app.offsetWidth;
    app.classList.add('app-fade-in');
    const onEnd = () => {
      app.classList.remove('app-fade-in');
      app.removeEventListener('animationend', onEnd);
    };
    app.addEventListener('animationend', onEnd);
  }

  /**
   * 游戏内时间是否应冻结（日历/生产等模拟不推进）。
   * 主菜单、Esc 菜单、中转黑屏、开场漫画、科技树调整、显式 paused 均冻结。
   */
  shouldFreezeGameTime() {
    if (!this._inGameSession || this._atMainMenu) return true;
    if (this._bootTransitionActive) return true;
    if (this._pickingDifficulty) return true;
    if (this._comicTimeHold) return true;
    if (this._techEditMode) return true;
    if (this.isPauseMenuOpen?.()) return true;
    if (this.paused) return true;
    return false;
  }

  /** 漫画/加载流程结束后才放开游戏时间，并切回正常游戏 BGM */
  releaseGameTimeAfterComic() {
    this._comicTimeHold = false;
    if (this.isPauseMenuOpen?.() || this._bootTransitionActive || this._atMainMenu || !this._inGameSession) {
      return;
    }
    this.paused = false;
    this.lastTick = Date.now();
    this.sounds?.ensureContext?.();
    this.sounds?._initBGM?.();
    // 立刻切轨：停袭击预告 → 白天轨
    try { this.sounds?.bgm?._tick?.(); } catch (_) { /* ignore */ }
  }

  showDefenseIntroIfNeeded() {
    if (this.state.defense?.introSeen) {
      this.holdAppForComic(false);
      this.releaseGameTimeAfterComic();
      return;
    }
    if (!this.state.defense) this.state.defense = this.createDefaultDefenseState();
    this._comicTimeHold = true;
    this.paused = true;
    this.holdAppForComic(true);
    this.resetComicIntro();
    const root = document.getElementById('defense-intro');
    root?.classList.remove('hidden');
    const first = root?.querySelector('.comic-panel[data-panel="1"]');
    requestAnimationFrame(() => this.shakeComicPanel(first));
  }

  advanceComicIntro() {
    const root = document.getElementById('defense-intro');
    if (!root || root.classList.contains('hidden') || this._comicDismissing) return;
    const total = this.getComicTotalPanels();
    const idx = this._comicPanelIndex || 1;
    if (idx >= total) {
      this.dismissDefenseIntro();
      return;
    }
    const next = idx + 1;
    this._comicPanelIndex = next;
    // 第 6 格起切到第二页
    if (next === 6) this.setComicPage(2);
    const panel = root.querySelector(`.comic-panel[data-panel="${next}"]`);
    if (panel) {
      panel.classList.add('is-visible');
      this.shakeComicPanel(panel);
    }
    const hint = document.getElementById('comic-hint');
    if (hint) hint.textContent = next >= total ? '点击开始重建' : '点击继续';
  }

  async dismissDefenseIntro() {
    if (this._comicDismissing) return;
    if (!this.state.defense) this.state.defense = this.createDefaultDefenseState();
    this.state.defense.introSeen = true;
    this._comicDismissing = true;
    // 收尾期间先压住教程，避免蓝底上提前冒出提示框
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    this.clearTutorialHighlights?.();

    const root = document.getElementById('defense-intro');
    // 点击立刻开播；分镜约 1s 渐隐，黑屏等到音乐结束再淡入主界面
    const stingPromise = Promise.resolve()
      .then(() => this.sounds?.playComicFinishSting?.())
      .catch(() => {});

    if (root) {
      root.classList.remove('comic-blackout');
      root.classList.add('comic-outro');
      document.getElementById('comic-skip')?.classList.add('hidden');
    }

    await Promise.all([
      stingPromise,
      new Promise((r) => setTimeout(r, 1000)),
    ]);

    if (root) {
      root.classList.add('hidden');
      root.classList.remove('comic-outro', 'comic-blackout');
    }
    this.revealAppAfterComic();
    this.releaseGameTimeAfterComic();
    this.save();

    // 等主界面 2s 淡入完成后再出新手提示
    await new Promise((r) => setTimeout(r, 2000));
    this._comicDismissing = false;
    this.startTutorialIfNeeded();
  }

  isTutorialActive() {
    const t = this.state.tutorial;
    if (!t || t.completed || t.skipped) return false;
    if (this._comicDismissing) return false;
    if (this.state.defense && !this.state.defense.introSeen) return false;
    return true;
  }

  getTutorialSteps() {
    return GAME_DATA.tutorial?.steps || [];
  }

  getTutorialStep() {
    const steps = this.getTutorialSteps();
    const idx = Math.max(0, this.state.tutorial?.stepIndex || 0);
    return steps[idx] || null;
  }

  syncTutorialBgmDuck() {
    try {
      this.sounds?.bgm?.setTutorialDuck?.(!!this.isTutorialActive());
    } catch (_) { /* ignore */ }
  }

  startTutorialIfNeeded() {
    if (!this.state.tutorial) this.state.tutorial = this.createDefaultTutorialState();
    if (this.state.tutorial.completed || this.state.tutorial.skipped) {
      this.clearTutorialHighlights();
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      this.syncTutorialBgmDuck();
      return;
    }
    if (this._comicDismissing) return;
    if (this.state.defense && !this.state.defense.introSeen) return;
    this.render();
    this.syncTutorialBgmDuck();
  }

  skipTutorial() {
    if (!this.state.tutorial) this.state.tutorial = this.createDefaultTutorialState();
    this.state.tutorial.skipped = true;
    this.state.tutorial.completed = true;
    this.clearTutorialHighlights();
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    this.syncTutorialBgmDuck();
    this.showNotification('已跳过新手教程');
    this.save();
  }

  finishTutorial() {
    if (!this.state.tutorial) return;
    this.state.tutorial.completed = true;
    this.clearTutorialHighlights();
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    this.syncTutorialBgmDuck();
    this.showNotification('🎓 新手教程完成！');
    this.save();
  }

  advanceTutorialStep() {
    const steps = this.getTutorialSteps();
    const t = this.state.tutorial;
    if (!t || t.completed) return;
    const cur = steps[t.stepIndex];
    if (cur?.finishOnNext) {
      this.finishTutorial();
      return;
    }
    // 操作型步骤未完成时不允许靠「下一步」跳过（例如浆果丛未派工）
    const g = this.resolveTutorialGuidance(cur) || cur;
    if (cur && !g.finishOnNext && !this.isTutorialStepComplete(cur) && !g.requireNext) {
      return;
    }
    if (cur?.id === 'worker_manage' && !this.isTutorialStepComplete(cur)) {
      return;
    }
    t.stepIndex = Math.min(steps.length - 1, (t.stepIndex || 0) + 1);
    if (!steps[t.stepIndex]) {
      this.finishTutorial();
      return;
    }
    this.render();
    this.save();
  }

  clearTutorialHighlights() {
    if (this._tutFlashTimer) {
      clearTimeout(this._tutFlashTimer);
      this._tutFlashTimer = null;
    }
    document.querySelectorAll('.tut-highlight').forEach(el => {
      el.classList.remove('tut-highlight', 'tut-highlight-soft');
    });
    document.body.classList.remove('tut-interaction-lock');
    this.hideTutSpotlight();
    this._tutHighlightKey = '';
  }

  ensureTutSpotlight() {
    let spot = document.getElementById('tut-spotlight');
    if (!spot) {
      spot = document.createElement('div');
      spot.id = 'tut-spotlight';
      spot.className = 'tut-spotlight hidden';
      spot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(spot);
    }
    return spot;
  }

  hideTutSpotlight() {
    const spot = document.getElementById('tut-spotlight');
    if (!spot) return;
    spot.classList.add('hidden');
    spot.classList.remove('tut-spotlight-round');
    spot.style.left = '';
    spot.style.top = '';
    spot.style.width = '';
    spot.style.height = '';
  }

  updateTutSpotlight() {
    const spot = this.ensureTutSpotlight();
    const primary = document.querySelector('.tut-highlight:not(.tut-highlight-soft)')
      || document.querySelector('.tut-highlight');
    if (!document.body.classList.contains('tut-interaction-lock') || !primary) {
      this.hideTutSpotlight();
      return;
    }

    const r = primary.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      this.hideTutSpotlight();
      return;
    }

    const pad = 10;
    const isRound = primary.classList.contains('tech-node');
    if (isRound) {
      const size = Math.max(r.width, r.height) + pad * 2;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      spot.style.left = `${cx - size / 2}px`;
      spot.style.top = `${cy - size / 2}px`;
      spot.style.width = `${size}px`;
      spot.style.height = `${size}px`;
      spot.classList.add('tut-spotlight-round');
    } else {
      spot.style.left = `${Math.max(0, r.left - pad)}px`;
      spot.style.top = `${Math.max(0, r.top - pad)}px`;
      spot.style.width = `${r.width + pad * 2}px`;
      spot.style.height = `${r.height + pad * 2}px`;
      spot.classList.remove('tut-spotlight-round');
    }
    spot.classList.remove('hidden');
  }

  /** 侧栏/中间区滚轮滚动时，教程聚光跟随高亮目标 */
  setupTutSpotlightScrollSync() {
    if (this._tutSpotScrollBound) return;
    this._tutSpotScrollBound = true;
    const sync = () => {
      if (!document.body.classList.contains('tut-interaction-lock')) return;
      this.updateTutSpotlight();
    };
    document.addEventListener('scroll', sync, true);
    window.addEventListener('scroll', sync, true);
    document.addEventListener('wheel', () => {
      if (!document.body.classList.contains('tut-interaction-lock')) return;
      requestAnimationFrame(sync);
    }, { passive: true, capture: true });
  }

  applyTutorialHighlights(selectors = []) {
    const list = (selectors || []).filter(Boolean);
    const key = list.join('\0');

    if (!this.isTutorialActive() || !list.length) {
      this.clearTutorialHighlights();
      return;
    }

    const existing = document.querySelector('.tut-highlight');
    if (key === this._tutHighlightKey && existing && document.body.classList.contains('tut-interaction-lock')) {
      this.updateTutSpotlight();
      return;
    }

    document.querySelectorAll('.tut-highlight').forEach(el => {
      el.classList.remove('tut-highlight', 'tut-highlight-soft');
    });

    let primaryDone = false;
    list.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!primaryDone) {
          el.classList.add('tut-highlight');
          primaryDone = true;
        } else {
          el.classList.add('tut-highlight', 'tut-highlight-soft');
        }
      });
    });

    if (!primaryDone) {
      this.clearTutorialHighlights();
      return;
    }

    this._tutHighlightKey = key;
    document.body.classList.add('tut-interaction-lock');
    requestAnimationFrame(() => this.updateTutSpotlight());
  }

  /** 短暂高亮指示（不推进步骤），结束后恢复当前教程指引 */
  flashTutorialHighlight(selectors = [], durationMs = 1400) {
    const list = (selectors || []).filter(Boolean);
    if (!list.length) return;
    if (this._tutFlashTimer) {
      clearTimeout(this._tutFlashTimer);
      this._tutFlashTimer = null;
    }
    // 强制重刷高亮键，避免与当前步骤选择器相同而跳过
    this._tutHighlightKey = '';
    this.applyTutorialHighlights(list);
    this._tutFlashTimer = setTimeout(() => {
      this._tutFlashTimer = null;
      if (!this.isTutorialActive()) {
        this.clearTutorialHighlights();
        return;
      }
      const step = this.getTutorialStep();
      const g = step ? (this.resolveTutorialGuidance(step) || step) : null;
      this._tutHighlightKey = '';
      this.applyTutorialHighlights(g?.highlight || []);
    }, Math.max(400, durationMs | 0));
  }

  getToolStockTotal(toolId) {
    return this.getToolCount(toolId);
  }

  getTutorialProgressValue(kind) {
    const t = this.state.tutorial || {};
    if (kind === 'forestHarvests') return t.forestHarvests || this.state.forestHarvestCount || 0;
    if (kind === 'wood') return this.state.resources.wood || 0;
    if (kind === 'stone') return this.state.resources.stone || 0;
    if (kind === 'resin') return this.state.resources.resin || 0;
    if (kind === 'clay') return this.state.resources.clay || 0;
    if (kind === 'berries') return t.berryHarvests || 0;
    if (kind === 'plank') return t.planksCrafted || 0;
    if (kind === 'tool') {
      // 必须教程中亲手做出木斧；开局自带斧头不算完成
      return (t.axesCrafted || 0) >= 1 ? 1 : 0;
    }
    if (kind === 'weapon') {
      // 必须教程中亲手做出任意一件进攻武器（剑/矛/弓/弩）；库存不算
      return (t.weaponsCrafted || 0) >= 1 ? 1 : 0;
    }
    return 0;
  }

  resolveTutorialGuidance(step) {
    if (!step) return null;

    const onTab = (tab) => this.state.activeTab === tab;
    const leaveOverlayFirst = (text) => {
      if (onTab('tech') || onTab('defense')) {
        return {
          ...step,
          text: text || '当前合屏挡住了中间区域。先点右侧「仓库」（或其它非科技/防务页），再按指引操作。',
          highlight: ['.tab-btn[data-tab="warehouse"]'],
        };
      }
      return null;
    };

    // 旧教程：引导解锁木板加工科技
    if (step.id === 'unlock_plank') {
      if (this.isTechUnlocked('unlock_plank_craft')) {
        return {
          ...step,
          id: 'craft_plank',
          title: '制作木板',
          text: '木板加工已解锁。自己打开「合成」做 1 块木板即可。',
          highlight: ['.tab-btn[data-tab="craft"]', '.craft-overview-item[data-recipe-id="craft_plank"]'],
          progress: 'plank',
          target: 1,
        };
      }
      return {
        ...step,
        title: '解锁木板加工',
        text: '打开「科技」，找到并解锁「木板加工」。',
        highlight: ['.tab-btn[data-tab="tech"]', '.tech-node[data-tech-id="unlock_plank_craft"]'],
      };
    }

    if (step.id === 'chop_woods') {
      const blocked = leaveOverlayFirst('科技/防务合屏挡住了采集区。先点右侧「仓库」，再回左侧「森林」砍树。');
      if (blocked) return blocked;
      if (!this.isActiveStation('point', 'forest')) {
        return {
          ...step,
          text: '先点左侧「森林」，再点击进行砍树。',
          highlight: ['.station-btn[data-station-id="forest"]'],
        };
      }
      return {
        ...step,
        text: '尝试砍树，获取木头。',
        highlight: ['#click-area'],
      };
    }

    if (step.id === 'craft_plank') {
      if (!this.isTechUnlocked('unlock_plank_craft')) {
        return {
          ...step,
          id: 'unlock_plank',
          title: '解锁木板加工',
          text: '制作木板前需先解锁科技「木板加工」。打开「科技」找到并解锁它。',
          highlight: ['.tab-btn[data-tab="tech"]', '.tech-node[data-tech-id="unlock_plank_craft"]'],
        };
      }
      const queued = this.getCraftQueueCount('craft_plank') > 0;
      const made = (this.state.tutorial?.planksCrafted || 0) < (step.target || 1);
      // 用「本步是否已做出木板」判断，不能看库存：宝箱开局就有木板
      if (queued && made) {
        if (!this.isActiveStation('recipe', 'craft_plank')) {
          return {
            ...step,
            title: '加工木板',
            text: '订单已下好。点左侧「生产」里的木板订单，进入后再点击进行加工。',
            highlight: [
              '.craft-order-item[data-recipe-id="craft_plank"] .craft-order-btn',
            ],
          };
        }
        return {
          ...step,
          title: '加工木板',
          text: '点击区以加工木板。',
          highlight: ['#click-area'],
        };
      }
      if (!onTab('craft')) {
        return {
          ...step,
          text: '如果还想继续制作木质工具来提高采集效率，则要先制作木板。自己打开右侧「合成」页。',
          highlight: ['.tab-btn[data-tab="craft"]'],
        };
      }
      return {
        ...step,
        text: '先给「制作木板」下单，再去左侧「生产」加工出来。',
        highlight: ['.craft-overview-item[data-recipe-id="craft_plank"]'],
      };
    }

    if (step.id === 'unlock_weapons') {
      if (this.isTechUnlocked('unlock_weapons_lv1')) {
        return {
          ...step,
          id: 'craft_weapon',
          title: '制作第一件武器',
          text: '木质武器已解锁。自己打开「武器」页下单制作任意一件武器。',
          highlight: ['.tab-btn[data-tab="weapons"]', '#weapon-list .craft-overview-item'],
          progress: 'weapon',
          target: 1,
        };
      }
      return {
        ...step,
        title: '解锁木质武器',
        text: '打开「科技」，找到并解锁「木质武器」。',
        highlight: ['.tab-btn[data-tab="tech"]', '.tech-node[data-tech-id="unlock_weapons_lv1"]'],
      };
    }

    if (step.id === 'craft_weapon') {
      if (!this.isTechUnlocked('unlock_weapons_lv1')) {
        return {
          ...step,
          id: 'unlock_weapons',
          title: '解锁木质武器',
          text: '制作武器前需先解锁科技「木质武器」。打开「科技」找到并解锁它。',
          highlight: ['.tab-btn[data-tab="tech"]', '.tech-node[data-tech-id="unlock_weapons_lv1"]'],
        };
      }
      if (this.getTutorialProgressValue('weapon') >= 1) {
        return { ...step, highlight: [] };
      }
      const weaponRecipeId = this.getQueuedCombatWeaponRecipeId();
      if (weaponRecipeId && this.getTutorialProgressValue('weapon') < 1) {
        if (!this.isActiveStation('recipe', weaponRecipeId)) {
          return {
            ...step,
            title: '加工武器',
            text: '武器已下单。点左侧「生产」里的该订单，进入后再点击完成制作。',
            highlight: [
              `.craft-order-item[data-recipe-id="${weaponRecipeId}"] .craft-order-btn`,
            ],
          };
        }
        return {
          ...step,
          title: '加工武器',
          text: '到中间点击完成制作。做出一件武器后进入下一步。',
          highlight: ['#click-area'],
        };
      }
      if (!onTab('weapons')) {
        return {
          ...step,
          text: '自己点右侧「武器」，制作任意一件武器（剑/矛/弓/弩均可）。',
          highlight: ['.tab-btn[data-tab="weapons"]'],
        };
      }
      return {
        ...step,
        text: '在武器列表里下单制作任意一件武器（剑/矛/弓/弩，点「确定」）。',
        highlight: ['#weapon-list .craft-overview-item'],
      };
    }

    if (step.id === 'open_starter_chest') {
      const stock = this.state.resourcePoints.treasure_chest?.stock || 0;
      const revealed = !!this.state.starterChestRevealed;
      const granted = !!this.state.starterChestGranted;
      const opened = !!this.state.tutorial?.starterChestOpened;
      const blocked = leaveOverlayFirst('先点右侧「仓库」退出合屏，再按指引去开宝箱。');
      if (blocked) return blocked;
      if (opened) {
        return { ...step, highlight: [] };
      }
      if (!revealed) {
        if (granted || stock > 0) {
          return {
            ...step,
            text: '意外掉落了宝箱！确认提示后，左侧会出现「宝箱」，再自己点进去打开。',
            highlight: ['.station-btn[data-station-id="treasure_chest"]'],
          };
        }
        if (!this.isActiveStation('point', 'forest')) {
          return {
            ...step,
            text: '先点左侧「森林」，继续砍树，之后会有意外掉落……',
            highlight: ['.station-btn[data-station-id="forest"]'],
          };
        }
        return {
          ...step,
          text: '继续砍树，之后会有意外掉落……',
          highlight: ['#click-area'],
        };
      }
      // 已开箱、库存扣完，但剧情框尚未确认：勿回退到「继续砍树」
      if (stock <= 0) {
        return {
          ...step,
          text: '宝箱已打开。确认提示后，去解锁新科技。',
          highlight: [],
        };
      }
      if (!this.isActiveStation('point', 'treasure_chest')) {
        return {
          ...step,
          text: '左侧出现了「宝箱」。自己点进去，再点中间把它打开，里面有制作木斧的材料。',
          highlight: ['.station-btn[data-station-id="treasure_chest"]'],
        };
      }
      return {
        ...step,
        text: '点中间区域把它打开，里面有制作木斧的材料。',
        highlight: ['#click-area'],
      };
    }

    if (step.id === 'open_tech_tree') {
      if (!onTab('tech')) {
        return {
          ...step,
          text: '自己点右侧「科技」，打开科技树页面。',
          highlight: ['.tab-btn[data-tab="tech"]'],
        };
      }
      return {
        ...step,
        text: '科技树已打开，接下来需要解锁「工作台」。',
        highlight: [],
      };
    }

    if (step.id === 'unlock_workbench') {
      if (!onTab('tech')) {
        return {
          ...step,
          text: '自己点右侧「科技」，再解锁「工作台」。',
          highlight: ['.tab-btn[data-tab="tech"]'],
        };
      }
      return {
        ...step,
        text: '点「工作台」解锁。解锁后请先去做木斧，再去森林派工。',
        highlight: ['.tech-node[data-tech-id="unlock_workbench"]'],
      };
    }

    if (step.id === 'craft_tool') {
      const queued = this.getCraftQueueCount('craft_axe_1') > 0;
      if (queued && this.getTutorialProgressValue('tool') < 1) {
        if (!this.isActiveStation('recipe', 'craft_axe_1')) {
          return {
            ...step,
            title: '加工木斧',
            text: '木斧已下单。点左侧「生产」进入该订单，再点中间完成制作。',
            highlight: [
              '.craft-order-item[data-recipe-id="craft_axe_1"] .craft-order-btn',
            ],
          };
        }
        return {
          ...step,
          title: '加工木斧',
          text: '到中间点击完成制作。做好斧头后再去森林派工。',
          highlight: ['#click-area'],
        };
      }
      // 科技合屏时也可直接点「工具」退出合屏，无需先点仓库
      if (!onTab('tools')) {
        return {
          ...step,
          text: '工作台已解锁。直接点右侧「工具」，用宝箱材料下单制作「木斧」（再去森林派工）。',
          highlight: ['.tab-btn[data-tab="tools"]'],
        };
      }
      return {
        ...step,
        text: '下单制作「木斧」。做好后再去森林给村民派工。',
        highlight: ['.craft-overview-item[data-recipe-id="craft_axe_1"]'],
      };
    }

    if (step.id === 'assign_forest') {
      const assigned = this.state.resourcePoints.forest?.assignedWorkers || 0;
      const need = 2;
      const blocked = leaveOverlayFirst('先点右侧「仓库」退出合屏，再去森林派工。');
      if (blocked) return blocked;
      if (!this.isActiveStation('point', 'forest')) {
        return {
          ...step,
          text: '可以给资源点分配村民，他们会自动采集。先自己点左侧「森林」。',
          highlight: ['.station-btn[data-station-id="forest"]'],
        };
      }
      if (assigned < need) {
        return {
          ...step,
          text: `在下方工人栏点「+」，给森林派出 ${need} 人（当前 ${assigned}/${need}）。`,
          highlight: ['#point-workers'],
        };
      }
      return {
        ...step,
        text: `已派出 ${assigned} 人到森林自动采集。接下来看工具如何提升效率。`,
        highlight: ['#point-workers'],
      };
    }

    if (step.id === 'tool_efficiency_hint') {
      const blocked = leaveOverlayFirst('先点右侧「仓库」退出合屏，再看效率提示。');
      if (blocked) return blocked;
      if (!this.isActiveStation('point', 'forest')) {
        return {
          ...step,
          text: '先点左侧「森林」，看下方工人栏的效率提示。',
          highlight: ['.station-btn[data-station-id="forest"]'],
        };
      }
      return {
        ...step,
        text: '看下面效率提示——有斧头的村民效率远高于徒手。人手多于斧头时，多出的人仍是徒手效率。',
        highlight: ['#point-workers .hint'],
        requireNext: true,
      };
    }

    if (step.id === 'food_intro') {
      const blocked = leaveOverlayFirst('先点右侧「仓库」退出合屏，再去采浆果。');
      if (blocked) return blocked;
      if (!this.isActiveStation('point', 'berry_bush')) {
        return {
          ...step,
          text: '食物不够时村民会饥饿并降低效率；若连续缺粮，村民还会饿死。先自己点左侧「浆果丛」，再采集 3 次。',
          highlight: ['.station-btn[data-station-id="berry_bush"]'],
        };
      }
      return {
        ...step,
        text: '点击中间采集区采集食物，采满 3 次即可（也可按空格）。采完后再给浆果丛派工自动采集。',
        highlight: ['#click-area'],
      };
    }

    if (step.id === 'assign_berry') {
      const assigned = this.state.resourcePoints.berry_bush?.assignedWorkers || 0;
      const need = 4;
      const blocked = leaveOverlayFirst('先点右侧「仓库」退出合屏，再去浆果丛派工。');
      if (blocked) return blocked;
      if (!this.isActiveStation('point', 'berry_bush')) {
        return {
          ...step,
          text: '手动采够了。再点左侧「浆果丛」，给它分配村民自动采集。',
          highlight: ['.station-btn[data-station-id="berry_bush"]'],
        };
      }
      if (assigned < need) {
        return {
          ...step,
          text: `在下方工人栏点「+」，给浆果丛派出 ${need} 人自动采集（当前 ${assigned}/${need}）。`,
          highlight: ['#point-workers'],
        };
      }
      return {
        ...step,
        text: `浆果丛已派出 ${assigned} 人自动采集。食物采集全靠徒手效率，可在科技树升级「食物采集」加快。`,
        highlight: ['#point-workers'],
      };
    }

    if (step.id === 'warehouse_food') {
      return {
        ...step,
        text: '看右上角食物：库存 / 今日预计消耗（不足时会变红加粗）。之后每天都留意这个数字。',
        highlight: ['#header-food'],
      };
    }

    if (step.id === 'workers_visit' || step.id === 'workers_breed') {
      if (!onTab('workers')) {
        return {
          ...step,
          title: '打开村民页',
          text: '人口、房屋、繁衍和统一派工都在右侧「村民」里。先点开「村民」页。',
          highlight: ['.tab-btn[data-tab="workers"]'],
          requireNext: false,
        };
      }
      return {
        ...step,
        title: '村民页已打开',
        text: '顶栏是村民/空闲/工作中。继续点「下一步」看房屋与繁衍。',
        highlight: ['.worker-stats'],
        requireNext: true,
      };
    }

    if (step.id === 'workers_houses_breed') {
      if (!onTab('workers')) {
        return {
          ...step,
          text: '回到右侧「村民」页，查看房屋与繁衍。',
          highlight: ['.tab-btn[data-tab="workers"]'],
          requireNext: false,
        };
      }
      const empty = this.getEmptyHouseSlots();
      return {
        ...step,
        text: empty > 0
          ? '有空房位时可花食物「预约繁殖」：白天预约 → 晚上休息时段开始 → 次日加人。下方也能建造/升级房屋扩容。看完点「下一步」。'
          : '房屋目前满员。以后要加人：先建造或升级房屋腾出空位，再预约繁殖（白天预约，晚上开始，次日加人）。看完点「下一步」。',
        highlight: ['#tutorial-village-breed', '.house-build-panel', '.house-list'],
        requireNext: true,
      };
    }

    if (step.id === 'worker_manage') {
      if (!onTab('workers')) {
        return {
          ...step,
          text: '点右侧「村民」，查看统一派工列表与「全部收回 / 恢复分配」。',
          highlight: ['.tab-btn[data-tab="workers"]'],
          requireNext: false,
        };
      }
      return {
        ...step,
        title: '统一分配工作',
        text: '下方列表可统一加减各站点工人；上方还有「全部收回 / 恢复分配」。浆果丛若还没派满，也可在这里补派。看完点「下一步」。',
        highlight: ['#tutorial-worker-manage', '.worker-station-list'],
        requireNext: true,
      };
    }

    if (step.id === 'defense_open' || step.id === 'defense_setup') {
      if (!onTab('defense')) {
        return {
          ...step,
          title: '打开防务',
          text: '点右侧「防务」。',
          highlight: ['.tab-btn[data-tab="defense"]'],
          requireNext: false,
        };
      }
      return {
        ...step,
        title: '防务已打开',
        text: '上面是袭击日程，下面是姿态、编制与城门。点「下一步」开始逐项操作。',
        highlight: ['#defense-status-card'],
        requireNext: true,
      };
    }

    if (step.id === 'defense_stance') {
      if (!onTab('defense')) {
        return {
          ...step,
          text: '先回到「防务」页。',
          highlight: ['.tab-btn[data-tab="defense"]'],
          requireNext: false,
        };
      }
      if (!this.state.tutorial?.defenseStanceClicked) {
        return {
          ...step,
          text: '「防御」：远程站城、近战守门。「出击」：近战各自出城。「随军出击」：同兵种按最慢者齐步，接敌后恢复各自移速。请点一下任意姿态。',
          highlight: ['#defense-stance-card', '.btn-defense-stance'],
          requireNext: false,
        };
      }
      return {
        ...step,
        text: '姿态会在开战时生效，平时可随时改。点「下一步」去编人。',
        highlight: ['#defense-stance-card'],
        requireNext: true,
      };
    }

    if (step.id === 'defense_assign') {
      if (!onTab('defense')) {
        return {
          ...step,
          text: '先回到「防务」页，配置编制。',
          highlight: ['.tab-btn[data-tab="defense"]'],
          requireNext: false,
        };
      }
      const posts = this.state.defense?.posts || {};
      const posted = Object.values(posts).reduce((s, n) => s + (Number(n) || 0), 0);
      if (posted < 1) {
        return {
          ...step,
          text: '请至少编入 1 名战斗人员（弓/弩/剑/矛/盾等；人数受对应武器库存限制，开战才真正拿起武器）。',
          highlight: ['#defense-roster-card'],
          requireNext: false,
        };
      }
      return {
        ...step,
        text: '编制完成。其它兵种同理；多余村民开战会徒手参战。点「下一步」学习战场布阵。',
        highlight: ['#defense-roster-card'],
        requireNext: true,
      };
    }

    if (step.id === 'defense_gate') {
      if (!onTab('defense')) {
        return {
          ...step,
          text: '回到「防务」查看城门与袭击日程。',
          highlight: ['.tab-btn[data-tab="defense"]'],
          requireNext: false,
        };
      }
      return {
        ...step,
        text: '城门可升级；战时未编入战斗的村民自动修门。首次袭击约第 7 天，第 5 天预警。点「下一步」结束本节。',
        highlight: ['#defense-gate-card', '#defense-status-card'],
        requireNext: true,
      };
    }

    if (step.id === 'defense_formation') {
      if (!onTab('defense')) {
        return {
          ...step,
          text: '先打开右侧「防务」，再看战场布阵操作。',
          highlight: ['.tab-btn[data-tab="defense"]'],
          requireNext: false,
        };
      }
      return {
        ...step,
        title: '战场布阵',
        text: '左侧战场可操控友军：左键拖拽框选或点选；Ctrl+左键加减复选；右键下令移动到鼠标处；中键在鼠标位置切换列阵（竖列→横列→聚团）。下方提示条也会显示这些操作。看完点「下一步」。',
        highlight: ['#battle-embed-field', '#battle-embed-hint'],
        requireNext: true,
      };
    }

    return { ...step };
  }

  isTutorialStepComplete(step) {
    if (!step) return true;
    const id = step.id;
    if (id === 'chop_woods') {
      return (this.state.tutorial.forestHarvests || this.state.forestHarvestCount || 0) >= (step.target || 2);
    }
    if (id === 'open_starter_chest') return !!this.state.tutorial?.starterChestOpened;
    if (id === 'unlock_workbench') return (this.state.unlockedTech || []).includes('unlock_workbench');
    if (id === 'open_tech_tree') return this.state.activeTab === 'tech';
    if (id === 'craft_tool') return this.getTutorialProgressValue('tool') >= 1;
    if (id === 'unlock_weapons') return this.isTechUnlocked('unlock_weapons_lv1');
    if (id === 'craft_weapon') return this.getTutorialProgressValue('weapon') >= 1;
    if (id === 'craft_plank') {
      return (this.state.tutorial?.planksCrafted || 0) >= (step.target || 1);
    }
    if (id === 'unlock_plank') {
      return this.isTechUnlocked('unlock_plank_craft');
    }
    if (id === 'assign_forest') return (this.state.resourcePoints.forest?.assignedWorkers || 0) >= 2;
    if (id === 'assign_berry') return (this.state.resourcePoints.berry_bush?.assignedWorkers || 0) >= 4;
    if (id === 'food_intro') return (this.state.tutorial.berryHarvests || 0) >= (step.target || 3);
    if (id === 'tool_efficiency_hint') return true; // requireNext 控制推进
    if (id === 'workers_visit' || id === 'workers_breed') return this.state.activeTab === 'workers';
    if (id === 'worker_manage') return this.state.activeTab === 'workers'; // requireNext 控制推进
    if (id === 'defense_open' || id === 'defense_setup') return this.state.activeTab === 'defense';
    if (id === 'defense_stance') return !!this.state.tutorial?.defenseStanceClicked;
    if (id === 'defense_assign') {
      const posts = this.state.defense?.posts || {};
      return Object.values(posts).some((n) => (Number(n) || 0) > 0);
    }
    if (id === 'defense_formation' || id === 'defense_gate') return true; // requireNext 控制推进
    return false;
  }

  /** 教程禁止自动切页签/站点；入口高亮由 resolveTutorialGuidance 负责 */
  ensureTutorialContext(_step) {
    // intentionally no-op
  }

  /**
   * 旧逻辑会把玩家强行切到 ensureStation / 踢出科技合屏。
   * 现已取消：一律由玩家自己点高亮入口过去。
   */
  guardTutorialGatherView() {
    // intentionally no-op
  }

  autoAdvanceTutorialSteps() {
    if (!this.isTutorialActive()) return;
    let guard = 0;
    while (guard++ < 12) {
      const step = this.getTutorialStep();
      if (!step) break;
      const g = this.resolveTutorialGuidance(step) || step;
      if (g.requireNext || g.finishOnNext) break;
      if (!this.isTutorialStepComplete(step)) break;
      const steps = this.getTutorialSteps();
      this.state.tutorial.stepIndex = Math.min(steps.length - 1, (this.state.tutorial.stepIndex || 0) + 1);
    }
  }

  prepareTutorialForRender() {
    if (!this.isTutorialActive()) return;
    this.autoAdvanceTutorialSteps();
    this.guardTutorialGatherView();
  }

  /** 未揭示前不允许停在宝箱界面；房屋任务结束后切回默认点 */
  clampActiveStationVisibility() {
    const a = this.state.activeStation;
    if (a?.type === 'point' && a.id === 'treasure_chest') {
      const pt = this.state.resourcePoints.treasure_chest;
      if (!pt?.unlocked) {
        this.state.activeStation = { type: 'point', id: 'forest' };
      }
    }
    if (a?.type === 'house') {
      if (a.id === 'build' && !this.state.houseBuildProgress) {
        this.state.activeStation = { type: 'point', id: 'forest' };
      } else if (a.id !== 'build' && !this.state.houseUpgradeProgress?.[a.id]) {
        this.state.activeStation = { type: 'point', id: 'forest' };
      }
    }
  }

  syncTutorialUI() {
    if (!this.isTutorialActive()) {
      this.clearTutorialHighlights();
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      return;
    }
    const step = this.getTutorialStep();
    if (!step) {
      this.finishTutorial();
      return;
    }
    this.renderTutorialOverlay(step);
  }

  renderTutorialOverlay(step) {
    const overlay = document.getElementById('tutorial-overlay');
    const titleEl = document.getElementById('tutorial-title');
    const textEl = document.getElementById('tutorial-text');
    const progressEl = document.getElementById('tutorial-progress');
    const nextBtn = document.getElementById('tutorial-next');
    if (!overlay || !step) return;
    const g = this.resolveTutorialGuidance(step) || step;

    overlay.classList.remove('hidden');
    if (titleEl) titleEl.textContent = g.title || '新手指引';
    if (textEl) textEl.textContent = g.text || '';

    if (progressEl) {
      if (g.progress) {
        const cur = this.getTutorialProgressValue(g.progress);
        const max = g.target || 1;
        progressEl.textContent = `进度 ${Math.min(cur, max)} / ${max}`;
        progressEl.classList.remove('hidden');
      } else {
        progressEl.classList.add('hidden');
      }
    }

    if (nextBtn) {
      if (g.requireNext || g.finishOnNext) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = g.finishOnNext ? '完成教程' : '下一步';
      } else {
        nextBtn.classList.add('hidden');
      }
    }

    requestAnimationFrame(() => this.applyTutorialHighlights(g.highlight || []));
  }

  refreshTutorialProgressUI() {
    if (!this.isTutorialActive()) return;
    const step = this.getTutorialStep();
    if (!step) return;
    const g = this.resolveTutorialGuidance(step) || step;
    if (this.isTutorialStepComplete(step) && !g.requireNext && !g.finishOnNext) {
      this.render();
      return;
    }
    const progressEl = document.getElementById('tutorial-progress');
    const titleEl = document.getElementById('tutorial-title');
    const textEl = document.getElementById('tutorial-text');
    const nextBtn = document.getElementById('tutorial-next');
    if (titleEl && g.title) titleEl.textContent = g.title;
    if (textEl && g.text) textEl.textContent = g.text;
    if (progressEl) {
      if (g.progress) {
        const cur = this.getTutorialProgressValue(g.progress);
        const max = g.target || 1;
        progressEl.textContent = `进度 ${Math.min(cur, max)} / ${max}`;
        progressEl.classList.remove('hidden');
      } else {
        progressEl.classList.add('hidden');
      }
    }
    if (nextBtn) {
      if (g.requireNext || g.finishOnNext) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = g.finishOnNext ? '完成教程' : '下一步';
      } else {
        nextBtn.classList.add('hidden');
      }
    }
    // 仅在引导目标变化时才重建高亮，避免每 tick 拆遮罩导致整屏闪烁
    const key = (g.highlight || []).filter(Boolean).join('\0');
    if (key !== this._tutHighlightKey || !document.querySelector('.tut-highlight')) {
      this.applyTutorialHighlights(g.highlight || []);
    }
  }

  tryGrantStarterChest(fromPointId) {
    if (fromPointId !== 'forest') return;
    this.state.forestHarvestCount = (this.state.forestHarvestCount || 0) + 1;
    if (this.state.tutorial && !this.state.tutorial.completed) {
      this.state.tutorial.forestHarvests = this.state.forestHarvestCount;
    }
    this.maybeGrantStarterChest();
  }

  /** 砍够次数后弹出引导宝箱（宝箱科技开局已解锁，无需等工作台） */
  maybeGrantStarterChest() {
    if (this.state.starterChestGranted) return;
    const need = GAME_DATA.starterChest?.afterForestHarvests ?? 2;
    if ((this.state.forestHarvestCount || 0) < need) return;
    if (!this.isTechUnlocked('unlock_treasure_chest')) return;

    const chestPt = this.state.resourcePoints.treasure_chest;
    if (!chestPt) return;
    // 先入账库存，但不解锁入口/界面；确认弹窗后再揭示
    chestPt.stock = (chestPt.stock || 0) + 1;
    chestPt.nextOpenPreset = 'starter_axe';
    this.state.starterChestGranted = true;
    this.state.starterChestRevealed = false;
    this.showStoryDialog(
      GAME_DATA.starterChest?.dropDialog || '意外掉落了个宝箱，去打开看看',
      () => this.revealStarterChest()
    );
  }

  /** 确认掉落弹窗后：解锁宝箱入口（不强制跳转，由闪烁引导玩家自己点） */
  revealStarterChest() {
    if (!this.isTechUnlocked('unlock_treasure_chest')) {
      this.state.unlockedTech.push('unlock_treasure_chest');
    }
    const chestPt = this.state.resourcePoints.treasure_chest;
    if (chestPt) chestPt.unlocked = true;
    this.state.starterChestRevealed = true;
    this.render();
    this.save();
  }

  showStoryDialog(text, onConfirm) {
    const overlay = document.getElementById('story-dialog');
    const textEl = document.getElementById('story-dialog-text');
    let okBtn = document.getElementById('story-dialog-ok');
    if (!overlay || !okBtn) {
      if (typeof onConfirm === 'function') onConfirm();
      return;
    }
    if (textEl) textEl.textContent = text || '';
    overlay.classList.remove('hidden');
    // 换新按钮，避免连续弹窗叠 listener
    const fresh = okBtn.cloneNode(true);
    okBtn.replaceWith(fresh);
    okBtn = fresh;
    okBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      if (typeof onConfirm === 'function') onConfirm();
    }, { once: true });
  }

  /** 材料不足入库提醒：排队逐个弹框 */
  enqueueAutoRepairShortageAlert(text) {
    if (!this._repairAlertQueue) this._repairAlertQueue = [];
    this._repairAlertQueue.push(String(text || ''));
    this._pumpAutoRepairShortageAlerts();
  }

  _pumpAutoRepairShortageAlerts() {
    if (this._repairAlertBusy) return;
    const q = this._repairAlertQueue || [];
    if (!q.length) return;
    this._repairAlertBusy = true;
    const msg = q.shift();
    this.showStoryDialog(msg, () => {
      this._repairAlertBusy = false;
      this._pumpAutoRepairShortageAlerts();
    });
  }

  getStarterAxeChestRewards() {
    const list = GAME_DATA.starterChest?.rewards;
    if (list?.length) return list.map(r => ({ ...r }));
    return [{ res: 'wood', amt: 10 }, { res: 'plank', amt: 5 }];
  }

  // ========== 工作站 ==========
  getStationDef(type, id) {
    if (type === 'point') return GAME_DATA.resourcePoints[id];
    if (type === 'house') {
      if (id === 'build') {
        return {
          icon: '🏠',
          name: '建造房屋',
          description: '点击推进建造进度；村民也会自动建造',
          baseMaxCount: this.state.houseBuildProgress?.maxCount || this.getHouseOrderCount(),
        };
      }
      const p = this.state.houseUpgradeProgress?.[id];
      const lv = p?.targetLevel ?? '?';
      return {
        icon: '🏠',
        name: `升级房屋 Lv.${lv}`,
        description: '点击推进升级进度；村民也会自动升级',
        baseMaxCount: p?.maxCount || this.getHouseOrderCount(),
      };
    }
    return GAME_DATA.recipes.find(r => r.id === id);
  }

  getStationState(type, id) {
    if (type === 'point') return this.state.resourcePoints[id];
    if (type === 'house') {
      if (id === 'build') {
        const p = this.state.houseBuildProgress;
        if (!p) return null;
        return { currentCount: p.progress, cooldownRemaining: 0, assignedWorkers: 0 };
      }
      const p = this.state.houseUpgradeProgress?.[id];
      if (!p) return null;
      return { currentCount: p.progress, cooldownRemaining: 0, assignedWorkers: 0 };
    }
    return this.state.craftStations[id];
  }

  /**
   * 新增生产订单 / 房屋建造或升级后：展开「生产」、切到可点击中间栏，并滚动左侧到对应项
   * 教程进行中不强制切页/切站，只展开列表并滚动，由高亮引导玩家自己点进去
   */
  focusProductionOrder(target) {
    if (!target?.kind) return;
    this.ensureSidebarCollapsedState();
    this.state.sidebarCollapsed.craft = false;
    this._pendingCraftFocus = target;
    if (this.isTutorialActive()) return;
    if (this.state.activeTab === 'tech' || this.state.activeTab === 'defense') {
      this.state.activeTab = 'warehouse';
    }
    let next = null;
    if (target.kind === 'recipe' && target.recipeId) {
      next = { type: 'recipe', id: target.recipeId };
    } else if (target.kind === 'house_build') {
      next = { type: 'house', id: 'build' };
    } else if (target.kind === 'house_upgrade' && target.houseId) {
      next = { type: 'house', id: target.houseId };
    }
    if (next) {
      this.state.activeStation = next;
    }
  }

  applyPendingCraftFocus() {
    const f = this._pendingCraftFocus;
    if (!f) return;
    this._pendingCraftFocus = null;
    requestAnimationFrame(() => {
      let el = null;
      if (f.kind === 'recipe' && f.orderId != null) {
        el = document.querySelector(`#craft-station-list .craft-order-item[data-order-id="${f.orderId}"]`);
      } else if (f.kind === 'recipe' && f.recipeId) {
        el = document.querySelector(`#craft-station-list .craft-order-item[data-recipe-id="${f.recipeId}"]`);
      } else if (f.kind === 'house_build') {
        el = document.querySelector('#craft-station-list .craft-order-item[data-house-kind="build"]');
      } else if (f.kind === 'house_upgrade' && f.houseId) {
        el = document.querySelector(
          `#craft-station-list .craft-order-item[data-house-kind="upgrade"][data-house-id="${f.houseId}"]`
        );
      }
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  unlockResourcePoint(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || !pt) return;
    pt.unlocked = true;
    if (def.canBuildMultiple) {
      pt.buildingCount = Math.max(1, pt.buildingCount || 0);
    }
  }

  /** 合成栏 / 工具栏 / 武器栏：需先解锁工作台 */
  isWorkbenchTabUnlocked() {
    return this.isTechUnlocked('unlock_workbench');
  }

  isCombatGear(toolId) {
    return !!GAME_DATA.villagerTools?.[toolId]?.combat;
  }

  /** 配方对应右侧页签：合成 / 工具 / 武器 */
  getRecipeSidebarTab(recipe) {
    if (!recipe?.isToolRecipe) return 'craft';
    const toolId = recipe.outputTools && Object.keys(recipe.outputTools)[0];
    return this.isCombatGear(toolId) ? 'weapons' : 'tools';
  }

  isCraftOrToolsTab(tab) {
    return tab === 'craft' || tab === 'tools' || tab === 'weapons';
  }

  isTabUnlocked(tab) {
    if (this.isCraftOrToolsTab(tab)) return this.isWorkbenchTabUnlocked();
    return true;
  }

  isRecipeTechUnlocked(recipeId) {
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (!recipe || !this.isWorkbenchTabUnlocked()) return false;
    return this.isTechUnlocked(recipe.requires);
  }

  scaleCost(inputs, count) {
    const scaled = {};
    Object.entries(inputs || {}).forEach(([k, v]) => { scaled[k] = v * count; });
    return scaled;
  }

  getCraftQueue(recipeId) {
    // 从队列数组中找到第一个匹配该配方的订单
    if (!Array.isArray(this.state.craftOrderQueue)) return null;
    const orders = this.state.craftOrderQueue.filter(o => o.recipeId === recipeId);
    if (orders.length === 0) return null;
    // 只返回第一个订单的数据，不合并多个订单
    const head = orders[0];
    return {
      quantity: head.count,
      progress: head.progress,
      maxProgress: this.getCraftOrderMaxProgress(head),
      kind: head.kind || 'craft',
      orderId: head.id,
    };
  }

  getCraftQueueCount(recipeId) {
    const q = this.getCraftQueue(recipeId);
    return q ? q.quantity : 0;
  }

  /** 生产队列中第一件教程武器配方（剑/矛/弓/弩） */
  getQueuedCombatWeaponRecipeId() {
    const weaponIds = new Set(['bow', 'crossbow', 'sword', 'spear']);
    for (const order of this.state.craftOrderQueue || []) {
      if (order?.kind === 'repair') continue;
      const recipe = GAME_DATA.recipes.find(r => r.id === order.recipeId);
      if (!recipe?.isToolRecipe || !recipe.outputTools) continue;
      const toolId = Object.keys(recipe.outputTools)[0];
      if (toolId && weaponIds.has(toolId)) return order.recipeId;
    }
    return null;
  }

  /** 获取某个配方在队列中的所有订单（用于显示） */
  getCraftOrdersForRecipe(recipeId) {
    return (this.state.craftOrderQueue || []).filter(o => o.recipeId === recipeId);
  }

  /** 获取当前正在处理的订单（队列第一个） */
  getActiveCraftOrder() {
    const queue = this.state.craftOrderQueue || [];
    return queue.length > 0 ? queue[0] : null;
  }

  /** 获取队列中所有订单（按顺序） */
  getAllCraftOrders() {
    return this.state.craftOrderQueue || [];
  }

  /** 判断指定配方是否排在队列头部 */
  isCraftQueueActive(recipeId) {
    const order = this.getActiveCraftOrder();
    return !!order && order.recipeId === recipeId;
  }

  canAffordCraft(recipeId, count = 1) {
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (!recipe) return false;
    count = Math.max(1, count);
    if (!this.canAfford(this.scaleCost(recipe.inputs, count))) return false;
    return this.canAffordToolInputs(recipe.inputTools, count);
  }

  setAutoProduce(recipeId, enabled) {
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (recipe?.isToolRecipe) {
      // 工具配方改用自动修复，不再走自动生产
      st.autoProduce = false;
      this.save();
      return;
    }
    if (enabled && !this.isAutoProduceUnlocked()) {
      st.autoProduce = false;
      this.showNotification('需先解锁科技「自动生产」');
      this.save();
      return;
    }
    st.autoProduce = !!enabled;
    if (!enabled) {
      st.autoMode = 'always';
      st.autoThreshold = 10;
    }
    this.save();
    if (enabled && this.getCraftQueueCount(recipeId) <= 0) {
      this.tryAutoProduce(recipeId);
    }
  }

  isAutoProduceUnlocked() {
    return this.isTechUnlocked('unlock_auto_produce');
  }

  /** 未解锁时强制关闭所有自动生产开关 */
  enforceAutoProduceTechGate() {
    if (this.isAutoProduceUnlocked()) return;
    let changed = false;
    Object.values(this.state.craftStations || {}).forEach((st) => {
      if (st?.autoProduce) {
        st.autoProduce = false;
        changed = true;
      }
    });
    if (changed) this.save();
  }

  setAutoRepair(recipeId, enabled) {
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    st.autoRepair = !!enabled;
    this.save();
    if (enabled) this.scanAutoRepairs();
  }

  setAutoRepairThreshold(recipeId, value) {
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    st.autoRepairThreshold = Math.max(1, Math.min(99, Number(value) || 10));
    this.save();
  }

  setAutoMode(recipeId, mode) {
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    st.autoMode = mode;
    this.save();
    if (st.autoProduce && this.getCraftQueueCount(recipeId) <= 0) {
      this.tryAutoProduce(recipeId);
    }
  }

  setAutoThreshold(recipeId, value) {
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    st.autoThreshold = Math.max(1, value || 10);
    this.save();
    if (st.autoProduce && this.getCraftQueueCount(recipeId) <= 0) {
      this.tryAutoProduce(recipeId);
    }
  }

  tryAutoProduce(recipeId) {
    if (!this.isAutoProduceUnlocked()) return false;
    const st = this.state.craftStations[recipeId];
    if (!st?.autoProduce) return false;
    if (this.getCraftQueueCount(recipeId) > 0) return false;
    if (!this._checkAutoCondition(recipeId)) return false;
    return this.placeCraftOrder(recipeId, 1, { silent: true, autoProduced: true }) > 0;
  }

  /** 获得材料后：扫一遍自动生产（库存不足 / 一直生产且当前无单） */
  scanAutoProduces() {
    if (!this.isAutoProduceUnlocked()) return 0;
    if (this._scanningAutoProduces) return 0;
    this._scanningAutoProduces = true;
    let n = 0;
    try {
      Object.keys(this.state.craftStations || {}).forEach((recipeId) => {
        const st = this.state.craftStations[recipeId];
        if (!st?.autoProduce) return;
        const recipe = GAME_DATA.recipes.find((r) => r.id === recipeId);
        if (!recipe || recipe.isToolRecipe) return;
        if (this.tryAutoProduce(recipeId)) n += 1;
      });
    } finally {
      this._scanningAutoProduces = false;
    }
    return n;
  }

  /** 检查自动生产条件是否满足 */
  _checkAutoCondition(recipeId) {
    const st = this.state.craftStations[recipeId];
    if (!st) return false;
    const mode = st.autoMode || 'always';
    if (mode === 'always') return true;
    if (mode === 'stock') {
      const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
      if (!recipe) return true;
      // 工具配方：检查工具库存
      if (recipe.isToolRecipe && recipe.outputTools) {
        const [[toolId, out]] = Object.entries(recipe.outputTools);
        const cur = this.getToolCount(toolId, out.level);
        const threshold = st.autoThreshold ?? 10;
        return cur < threshold;
      }
      // 普通配方：检查输出资源库存
      if (recipe.outputs) {
        const resId = Object.keys(recipe.outputs)[0];
        if (resId) {
          const cur = this.state.resources[resId] || 0;
          const threshold = st.autoThreshold ?? 10;
          return cur < threshold;
        }
      }
    }
    return true;
  }

  /** 下单（普通/自动） */
  placeCraftOrder(recipeId, count = 1, { silent = false, autoProduced = false } = {}) {
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    count = Math.max(1, Math.floor(count));
    if (!recipe || !this.isRecipeTechUnlocked(recipeId)) return 0;
    if (!this.canAffordCraft(recipeId, count)) {
      if (!silent) this.showNotification('材料不足，无法生产');
      return 0;
    }
    this.spend(this.scaleCost(recipe.inputs, count));
    this.spendToolInputs(recipe.inputTools, count);
    if (!Array.isArray(this.state.craftOrderQueue)) this.state.craftOrderQueue = [];
    if (this.state.craftOrderSeq == null) this.state.craftOrderSeq = 0;
    const order = {
      id: this.state.craftOrderSeq++,
      recipeId,
      count,
      progress: 0,
      autoProduced,
    };
    this.state.craftOrderQueue.push(order);
    if (!silent && !this.isTutorialActive()) {
      this.focusProductionOrder({ kind: 'recipe', orderId: order.id, recipeId });
    }
    if (!silent) this.showNotification(`已加入生产队列：${recipe.name} ×${count}（材料已扣除）`);
    this.render();
    this.save();
    return count;
  }

  /** 取消指定订单（按 orderId），退还材料 */
  cancelCraftOrder(orderId) {
    const queue = this.state.craftOrderQueue;
    if (!Array.isArray(queue)) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    const recipe = GAME_DATA.recipes.find(r => r.id === order.recipeId);

    if (order.kind === 'repair') {
      const piece = this.findToolPiece(order.toolId, order.pieceId);
      if (piece) {
        piece.repairing = false;
        piece.repairOrderId = null;
      }
      Object.entries(order.paidCost || {}).forEach(([res, amt]) => this.addResource(res, amt));
      queue.splice(idx, 1);
      this.showNotification(`已取消修复：${this.formatToolLabel(order.toolId, order.level)}`);
      this.render();
      this.save();
      return;
    }

    if (!recipe) {
      queue.splice(idx, 1);
      this.render();
      this.save();
      return;
    }
    // 如果该订单是当前正在处理的（队列头），已消耗的进度不退
    const consumed = idx === 0 ? Math.min(1, Math.floor(order.progress / this.getMaxCount('recipe', order.recipeId))) : 0;
    const refundCount = order.count - consumed;
    if (refundCount > 0) {
      Object.entries(this.scaleCost(recipe.inputs, refundCount)).forEach(([res, amt]) => this.addResource(res, amt));
      this.refundToolInputs(recipe.inputTools, refundCount);
    }
    queue.splice(idx, 1);
    // 如果取消的是自动生产订单且依然满足条件，补一个订单
    let extraMsg = '';
    if (order.autoProduced && this.isAutoProduceUnlocked()) {
      const st = this.state.craftStations[order.recipeId];
      if (st?.autoProduce && this._checkAutoCondition(order.recipeId)) {
        this.placeCraftOrder(order.recipeId, 1, { silent: true, autoProduced: true });
        extraMsg = '（自动补单）';
      }
    }
    this.showNotification(`已取消订单：${recipe.name}${extraMsg}`);
    this.render();
    this.save();
  }

  /** 清空指定配方的所有订单 */
  cancelCraftQueue(recipeId) {
    const queue = this.state.craftOrderQueue;
    if (!Array.isArray(queue)) return;
    const toRemove = queue.filter(o => o.recipeId === recipeId);
    toRemove.forEach(o => this.cancelCraftOrder(o.id));
  }

  /** 移动订单在队列中的位置（0=置顶，-1=上移，+1=下移，Infinity=置底） */
  moveCraftOrder(orderId, direction) {
    if (!this._moveCraftOrderInQueue(orderId, direction)) return;
    this.render();
    this.save();
  }

  /** 仅调整队列顺序，不触发渲染/存档 */
  _moveCraftOrderInQueue(orderId, direction) {
    const queue = this.state.craftOrderQueue;
    if (!Array.isArray(queue) || queue.length <= 1) return false;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return false;
    let newIdx;
    if (direction === 0) newIdx = 0;
    else if (direction === Infinity) newIdx = queue.length - 1;
    else newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= queue.length || newIdx === idx) return false;
    const order = queue.splice(idx, 1)[0];
    queue.splice(newIdx, 0, order);
    return true;
  }

  /**
   * 工具库存下降后：若该工具配方开启了「库存<」自动生产且已低于阈值，
   * 则补单（若尚无订单）并上提至队列最前。
   */
  ensureToolAutoCraftPriority(toolId, level) {
    if (!this.isAutoProduceUnlocked()) return false;
    const recipe = this.getToolRecipe(toolId, level);
    if (!recipe) return false;
    const st = this.state.craftStations[recipe.id];
    if (!st?.autoProduce) return false;
    if ((st.autoMode || 'always') !== 'stock') return false;
    if (!this._checkAutoCondition(recipe.id)) return false;

    const queue = this.state.craftOrderQueue || [];
    let order = queue.find(o => o.recipeId === recipe.id);
    let changed = false;

    if (!order) {
      if (!this.canAffordCraft(recipe.id, 1)) return false;
      if (!Array.isArray(this.state.craftOrderQueue)) this.state.craftOrderQueue = [];
      if (this.state.craftOrderSeq == null) this.state.craftOrderSeq = 0;
      this.spend(this.scaleCost(recipe.inputs, 1));
      this.spendToolInputs(recipe.inputTools, 1, { skipAutoPromote: true });
      order = {
        id: this.state.craftOrderSeq++,
        recipeId: recipe.id,
        count: 1,
        progress: 0,
        autoProduced: true,
      };
      this.state.craftOrderQueue.push(order);
      changed = true;
    }

    if (this._moveCraftOrderInQueue(order.id, 0)) changed = true;
    return changed;
  }

  /** 批量处理若干工具库存变化后的自动生产上提 */
  promoteAutoCraftForToolStockChanges(pairs) {
    if (!pairs?.length) return false;
    const seen = new Set();
    const promoted = [];
    pairs.forEach(([toolId, level]) => {
      const key = `${toolId}::${level}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (this.ensureToolAutoCraftPriority(toolId, level)) {
        const recipe = this.getToolRecipe(toolId, level);
        if (recipe) promoted.push(recipe.name);
      }
    });
    if (!promoted.length) return false;
    const names = [...new Set(promoted)];
    this.showNotification(
      names.length === 1
        ? `${names[0]}库存不足，已上提生产订单`
        : `工具库存不足，已上提：${names.join('、')}`
    );
    return true;
  }

  completeCraftUnit(recipeId, opts = {}) {
    const silent = opts.silent || false;
    const customOrder = opts.order || null;
    const order = customOrder || this.getActiveCraftOrder();
    if (!order || order.recipeId !== recipeId) return;
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    if (order.kind === 'repair') {
      const piece = this.findToolPiece(order.toolId, order.pieceId);
      if (piece) {
        piece.dur = piece.maxDur;
        piece.repairing = false;
        piece.repairOrderId = null;
        piece.warehoused = false;
        this.removePendingAutoRepair?.(order.toolId, piece.id);
      }
      order.count -= 1;
      order.progress = 0;
      const st = this.state.craftStations[recipeId];
      if (st) this.startCooldown('recipe', recipeId);
      if (!silent) {
        this.showResourceGainNotification(`修复完成：${this.formatToolLabel(order.toolId, order.level)}`);
      }
      if (order.count <= 0) {
        const queue = this.state.craftOrderQueue;
        const idx = queue.findIndex(o => o.id === order.id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          const allOrders = this.getAllCraftOrders();
          if (allOrders.length > 0) {
            const nextIdx = idx < allOrders.length ? idx : 0;
            const nextOrder = allOrders[nextIdx];
            if (this.state.activeStation.type === 'recipe') {
              this.setActiveStation('recipe', nextOrder.recipeId);
            }
          }
        }
      }
      this._needToolUiRefresh = true;
      return;
    }

    Object.entries(recipe.outputs || {}).forEach(([res, amt]) => this.addResource(res, amt));
    this.applyOutputTools(recipe.outputTools);
    this.trySanctuaryCraftRefund(recipe, { silent });
    order.count -= 1;
    order.progress = 0;

    if (recipeId === 'craft_divine_artifact') {
      this.onArtifactCompleted();
    }

    if (this.state.tutorial && !this.state.tutorial.completed) {
      if (recipeId === 'craft_plank') {
        this.state.tutorial.planksCrafted = (this.state.tutorial.planksCrafted || 0) + 1;
      }
      if (recipeId === 'craft_axe_1') {
        this.state.tutorial.axesCrafted = (this.state.tutorial.axesCrafted || 0) + 1;
      }
      const outToolId = recipe.outputTools && Object.keys(recipe.outputTools)[0];
      if (outToolId && ['bow', 'crossbow', 'sword', 'spear'].includes(outToolId)) {
        this.state.tutorial.weaponsCrafted = (this.state.tutorial.weaponsCrafted || 0) + 1;
      }
    }

    const st = this.state.craftStations[recipeId];
    if (st) this.startCooldown('recipe', recipeId);

    if (!silent) {
      const parts = [];
      Object.entries(recipe.outputs || {}).forEach(([res, amt]) => {
        parts.push(`${GAME_DATA.resources[res]?.icon || res}×${amt}`);
      });
      this.forEachToolIO(recipe.outputTools, (toolId, level, amt) => {
        parts.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
      });
      this.showResourceGainNotification(`生产完成：${recipe.name} → ${parts.join('、')}`);
    }

    if (order.count <= 0) {
      const queue = this.state.craftOrderQueue;
      const idx = queue.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        queue.splice(idx, 1);

        // 自动跳转到下一个订单
        const allOrders = this.getAllCraftOrders();
        if (allOrders.length > 0) {
          // 如果移除的是最后一个，则跳到第一个；否则跳到原位置的订单
          const nextIdx = idx < allOrders.length ? idx : 0;
          const nextOrder = allOrders[nextIdx];
          if (this.state.activeStation.type === 'recipe') {
            this.setActiveStation('recipe', nextOrder.recipeId);
          }
        } else {
          // 没有后续订单：停留在生产界面，显示空队列状态（不自动跳回森林）
        }
      }
    }

    if (st?.autoProduce && !recipe.isToolRecipe && this.isAutoProduceUnlocked() && this._checkAutoCondition(recipeId)) {
      this.placeCraftOrder(recipeId, 1, { silent: true, autoProduced: true });
    }
  }

  /** 神器铸成：魔王无敌破除，3天后总攻 */
  onArtifactCompleted() {
    if (this.state.divineArtifactReady) return;
    this.state.divineArtifactReady = true;

    // 强制解锁魔王资源点（地图可见）
    const demonPt = this.state.resourcePoints.demon_king;
    if (demonPt) demonPt.unlocked = true;

    // 计算总攻日期
    const delayDays = GAME_DATA.endgame?.finalBattleDelayDays || 3;
    this.state.finalBattleDay = (this.state.day || 1) + delayDays;

    // 让玩家看到魔王已失去无敌
    this.showStoryDialog(
      GAME_DATA.endgame?.artifactDialog || '神器铸成！魔王的无敌护盾碎裂了——它震怒不已，三日后将亲率魔军灭村！',
      () => {
        this.render();
        this.save();
      }
    );
  }

  normalizeToolIO(spec) {
    if (spec == null) return null;
    if (typeof spec === 'number') return { level: 1, amount: spec };
    return { level: Math.max(1, spec.level || 1), amount: Math.max(1, spec.amount || 1) };
  }

  forEachToolIO(map, fn) {
    Object.entries(map || {}).forEach(([toolId, spec]) => {
      const n = this.normalizeToolIO(spec);
      if (n) fn(toolId, n.level, n.amount);
    });
  }

  formatToolLabel(toolId, level) {
    const t = GAME_DATA.villagerTools[toolId];
    const name = t?.levelNames?.[level] || `${t?.name || toolId} Lv.${level}`;
    return `${t?.icon || ''} ${name}`.trim();
  }

  getToolCount(toolId, level = null) {
    if (toolId === 'armor') {
      this.ensureArmorPieces();
      const pieces = this.state.armorPieces || [];
      if (level != null) return pieces.filter((p) => Number(p.level) === Number(level)).length;
      return pieces.length;
    }
    this.ensureToolPieces();
    const pieces = this.state.toolPieces?.[toolId] || [];
    if (level != null) return pieces.filter((p) => p && Number(p.level) === Number(level)).length;
    return pieces.filter(Boolean).length;
  }

  /** 可用件数：未在修复、未因缺料入库停用，且耐久>0 */
  getUsableToolCount(toolId, level = null) {
    if (toolId === 'armor') {
      this.ensureArmorPieces();
      const pieces = (this.state.armorPieces || []).filter((p) => this.isToolPieceUsable(p));
      if (level != null) return pieces.filter((p) => Number(p.level) === Number(level)).length;
      return pieces.length;
    }
    this.ensureToolPieces();
    const pieces = (this.state.toolPieces?.[toolId] || []).filter((p) => this.isToolPieceUsable(p));
    if (level != null) return pieces.filter((p) => Number(p.level) === Number(level)).length;
    return pieces.length;
  }

  /** 可被工人/士兵使用的件 */
  isToolPieceUsable(piece) {
    return !!(piece && !piece.repairing && !piece.warehoused && (piece.dur || 0) > 0);
  }

  setToolCount(toolId, level, amount) {
    if (toolId === 'armor') {
      this.ensureArmorPieces();
      const lv = Math.max(1, Number(level) || 1);
      const want = Math.max(0, Math.floor(amount));
      let guard = 0;
      while (this.getToolCount('armor', lv) < want && guard++ < 999) {
        this.createArmorPiece(lv);
      }
      guard = 0;
      while (this.getToolCount('armor', lv) > want && guard++ < 999) {
        const pool = (this.state.armorPieces || [])
          .filter((p) => Number(p.level) === lv)
          .sort((a, b) => {
            const ae = a.equippedBy ? 1 : 0;
            const be = b.equippedBy ? 1 : 0;
            if (ae !== be) return ae - be;
            const ar = a.repairing ? 0 : 1;
            const br = b.repairing ? 0 : 1;
            if (ar !== br) return ar - br;
            return (a.dur || 0) - (b.dur || 0);
          });
        if (!pool.length) break;
        this.destroyArmorPiece(pool[0].id);
      }
      return;
    }
    if (!GAME_DATA.villagerTools[toolId]) return;
    this.ensureToolPieces();
    const lv = Math.max(1, Number(level) || 1);
    const want = Math.max(0, Math.floor(amount));
    let guard = 0;
    while (this.getToolCount(toolId, lv) < want && guard++ < 999) {
      this.createToolPiece(toolId, lv);
    }
    guard = 0;
    while (this.getToolCount(toolId, lv) > want && guard++ < 999) {
      const pool = (this.state.toolPieces[toolId] || [])
        .filter((p) => p && Number(p.level) === lv)
        .sort((a, b) => {
          if (!!a.repairing !== !!b.repairing) return a.repairing ? -1 : 1;
          return (a.dur || 0) - (b.dur || 0);
        });
      if (!pool.length) break;
      this.destroyToolPiece(toolId, pool[0].id);
    }
    this.syncToolInventoryFromPieces(toolId);
  }

  addTool(toolId, amount = 1, level = 1) {
    if (!GAME_DATA.villagerTools[toolId]) return;
    const lv = Math.max(1, level || 1);
    const n = Math.max(0, Math.floor(amount));
    if (toolId === 'armor') {
      for (let i = 0; i < n; i++) this.createArmorPiece(lv);
      if (n > 0) this.checkAchievements();
      return;
    }
    this.ensureToolPieces();
    for (let i = 0; i < n; i++) this.createToolPiece(toolId, lv);
    this.syncToolInventoryFromPieces(toolId);
    if (n > 0) this.checkAchievements();
  }

  getBestToolLevel(toolId) {
    const def = GAME_DATA.villagerTools[toolId];
    if (!def) return 0;
    const max = def.maxLevel || 3;
    for (let lv = max; lv >= 1; lv--) {
      if (this.getUsableToolCount(toolId, lv) > 0) return lv;
    }
    return 0;
  }

  getToolSpeed(level) {
    const map = GAME_DATA.villagerWork.toolSpeedByLevel || {};
    let speed = map[level] ?? GAME_DATA.villagerWork.tooledSpeed ?? 0.25;
    const effLv = this.getTechRepeatLevel('unlock_tool_efficiency').current;
    if (effLv > 0) speed *= 1 + effLv * 0.05;
    return speed;
  }

  /** 村民徒手基础效率（科技「村民训练」：每级 +0.01） */
  getVillagerBaseSpeed() {
    const base = GAME_DATA.villagerWork.baseSpeed ?? 0.05;
    const lv = this.getTechRepeatLevel('unlock_worker_efficiency').current;
    return base + lv * 0.01;
  }

  /** 生产订单每人效率：徒手基础 + 合成效率科技（每级 +0.02） */
  getCraftWorkerSpeed() {
    const per = GAME_DATA.villagerWork?.craftSpeedPerTechLevel ?? 0.02;
    const lv = this.getTechRepeatLevel('unlock_craft_efficiency').current;
    return this.getVillagerBaseSpeed() + lv * per;
  }

  ensureSanctuaryState() {

    if (!this.state.sanctuary || typeof this.state.sanctuary !== 'object') {

      this.state.sanctuary = {

        lastEffCheckDay: 0,

        lastEffCheckHour: -1,

        workBuffMult: 1,

        workBuffExpiresAt: 0,

      };

    }

    const st = this.state.sanctuary;

    if (st.lastEffCheckHour === undefined) st.lastEffCheckHour = -1;

    if (st.lastEffCheckDay === undefined) st.lastEffCheckDay = 0;

    if (st.workBuffMult == null) st.workBuffMult = 1;

    if (st.workBuffExpiresAt == null) st.workBuffExpiresAt = 0;

    return st;

  }



  getGameAbsoluteMs() {

    const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;

    return ((this.state.day || 1) - 1) * dayMs + (this.state.dayProgress || 0);

  }



  getGameMinuteMs() {

    const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;

    return dayMs / (24 * 60);

  }



  _sanctuarySeriesLevel(seriesId) {

    return this.getTechRepeatLevel(seriesId).current;

  }



  isSanctuaryBranchUnlocked(branchKey) {

    const cfg = GAME_DATA.sanctuary?.[branchKey];

    return !!(cfg?.unlockTech && this.isTechUnlocked(cfg.unlockTech));

  }



  getSanctuaryGatherChance() {

    if (!this.isSanctuaryBranchUnlocked('gather')) return 0;

    const cfg = GAME_DATA.sanctuary.gather;

    return cfg.chanceBase + this._sanctuarySeriesLevel(cfg.chanceSeries) * cfg.chancePerLevel;

  }



  getSanctuaryGatherMult() {

    if (!this.isSanctuaryBranchUnlocked('gather')) return 1;

    const cfg = GAME_DATA.sanctuary.gather;

    return cfg.multBase + this._sanctuarySeriesLevel(cfg.multSeries) * cfg.multPerLevel;

  }



  rollSanctuaryGatherBonus() {

    const chance = this.getSanctuaryGatherChance();

    if (chance <= 0) return null;

    if (Math.random() >= chance) return null;

    return this.getSanctuaryGatherMult();

  }



  getSanctuaryCraftRefundChance() {

    if (!this.isSanctuaryBranchUnlocked('craft')) return 0;

    const cfg = GAME_DATA.sanctuary.craft;

    return cfg.chanceBase + this._sanctuarySeriesLevel(cfg.chanceSeries) * cfg.chancePerLevel;

  }



  getSanctuaryCraftRefundRate() {

    if (!this.isSanctuaryBranchUnlocked('craft')) return 0;

    const cfg = GAME_DATA.sanctuary.craft;

    return cfg.refundBase + this._sanctuarySeriesLevel(cfg.refundSeries) * cfg.refundPerLevel;

  }



  trySanctuaryCraftRefund(recipe, { silent = false } = {}) {

    const chance = this.getSanctuaryCraftRefundChance();

    const rate = this.getSanctuaryCraftRefundRate();

    if (chance <= 0 || rate <= 0) return null;

    if (Math.random() >= chance) return null;

    const refunded = {};

    Object.entries(recipe?.inputs || {}).forEach(([res, amt]) => {

      const n = Math.floor(Number(amt) * rate);

      if (n > 0) {

        this.addResource(res, n);

        refunded[res] = n;

      }

    });

    if (!Object.keys(refunded).length) return null;

    if (!silent) {

      const parts = Object.entries(refunded).map(([res, n]) =>

        `${GAME_DATA.resources[res]?.icon || res}×${n}`

      );

      this.showNotification(`🛠️ 生产庇护：返还 ${parts.join('、')}`);

    }

    return refunded;

  }



  getSanctuaryWarCritChance() {

    if (!this.isSanctuaryBranchUnlocked('war')) return 0;

    const cfg = GAME_DATA.sanctuary.war;

    return cfg.chanceBase + this._sanctuarySeriesLevel(cfg.chanceSeries) * cfg.chancePerLevel;

  }



  getSanctuaryWarCritMult() {

    if (!this.isSanctuaryBranchUnlocked('war')) return 1;

    const cfg = GAME_DATA.sanctuary.war;

    return cfg.critMultBase + this._sanctuarySeriesLevel(cfg.critMultSeries) * cfg.critMultPerLevel;

  }



  getSanctuaryEfficiencyChance() {

    if (!this.isSanctuaryBranchUnlocked('efficiency')) return 0;

    const cfg = GAME_DATA.sanctuary.efficiency;

    return cfg.chanceBase + this._sanctuarySeriesLevel(cfg.chanceSeries) * cfg.chancePerLevel;

  }



  getSanctuaryEfficiencyMult() {

    if (!this.isSanctuaryBranchUnlocked('efficiency')) return 1;

    const cfg = GAME_DATA.sanctuary.efficiency;

    return cfg.multBase + this._sanctuarySeriesLevel(cfg.multSeries) * cfg.multPerLevel;

  }



  getSanctuaryEfficiencyDurationMin() {

    if (!this.isSanctuaryBranchUnlocked('efficiency')) return 0;

    const cfg = GAME_DATA.sanctuary.efficiency;

    return cfg.durationMinBase + this._sanctuarySeriesLevel(cfg.durationSeries) * cfg.durationMinPerLevel;

  }



  getSanctuaryWorkSpeedFactor() {

    const st = this.ensureSanctuaryState();

    const mult = Number(st.workBuffMult) || 1;

    if (mult <= 1) return 1;

    if (this.getGameAbsoluteMs() >= (Number(st.workBuffExpiresAt) || 0)) return 1;

    return mult;

  }



  processSanctuaryEfficiencyTick() {

    if (!this.isSanctuaryBranchUnlocked('efficiency')) return;

    if (this.isVillagersResting()) return;

    const { hours } = this.getGameTimeOfDay();

    const day = this.state.day || 1;

    const st = this.ensureSanctuaryState();

    if (st.lastEffCheckDay === day && st.lastEffCheckHour === hours) return;

    st.lastEffCheckDay = day;

    st.lastEffCheckHour = hours;

    const chance = this.getSanctuaryEfficiencyChance();

    if (chance <= 0 || Math.random() >= chance) return;

    const mult = this.getSanctuaryEfficiencyMult();

    const mins = this.getSanctuaryEfficiencyDurationMin();

    st.workBuffMult = mult;

    st.workBuffExpiresAt = this.getGameAbsoluteMs() + mins * this.getGameMinuteMs();

    this.showNotification(`🌟 效率庇护发动！全工作效率 ×${mult.toFixed(2)}，持续 ${mins} 分钟（游戏时间）`);

  }



  formatAltarStatusHtml() {

    const unlocked = !!this.state.resourcePoints.altar?.unlocked;

    if (!unlocked) {

      return '神坛尚未建造。请先在科技树解锁「神坛」。';

    }

    const lines = ['神坛已启用。当前庇护状态：'];

    if (this.isSanctuaryBranchUnlocked('gather')) {

      lines.push(`🌾 采集：${(this.getSanctuaryGatherChance() * 100).toFixed(0)}% 概率 ×${this.getSanctuaryGatherMult().toFixed(1)}`);

    } else lines.push('🌾 采集庇护：未解锁');

    if (this.isSanctuaryBranchUnlocked('craft')) {

      lines.push(`🛠️ 生产：${(this.getSanctuaryCraftRefundChance() * 100).toFixed(0)}% 概率返还 ${(this.getSanctuaryCraftRefundRate() * 100).toFixed(0)}%`);

    } else lines.push('🛠️ 生产庇护：未解锁');

    if (this.isSanctuaryBranchUnlocked('war')) {

      lines.push(`🛡️ 战争：${(this.getSanctuaryWarCritChance() * 100).toFixed(0)}% 暴击 ×${this.getSanctuaryWarCritMult().toFixed(1)}`);

    } else lines.push('🛡️ 战争庇护：未解锁');

    if (this.isSanctuaryBranchUnlocked('efficiency')) {

      const active = this.getSanctuaryWorkSpeedFactor() > 1;

      lines.push(`🌟 效率：整点 ${(this.getSanctuaryEfficiencyChance() * 100).toFixed(0)}% / ×${this.getSanctuaryEfficiencyMult().toFixed(1)} / ${this.getSanctuaryEfficiencyDurationMin()} 分钟${active ? ' · <b>生效中</b>' : ''}`);

    } else lines.push('🌟 效率庇护：未解锁');

    return lines.join('<br>');

  }




  /** 食物采集科技：每级给所有食物点 +0.01/秒/人（最高 3 级） */
  getFoodGatherSpeedBonus() {
    const lv = this.getTechRepeatLevel('unlock_food_gather_speed').current;
    return Math.max(0, Math.min(3, lv)) * 0.01;
  }

  getToolMaxDurability(level) {
    const map = GAME_DATA.toolDurability?.maxByLevel || {};
    let base = map[level] ?? map[1] ?? 100;
    const durLv = this.getTechRepeatLevel('unlock_tool_durability').current;
    if (durLv > 0) base *= 1 + durLv * 0.1;
    return Math.floor(base);
  }

  getToolDurability(toolId, level) {
    const pieces = this.getToolPiecesList(toolId, level);
    if (!pieces.length) return 0;
    const usable = pieces.filter((p) => this.isToolPieceUsable(p));
    const list = usable.length ? usable : pieces;
    return list.reduce((s, p) => s + (p.dur || 0), 0) / list.length;
  }

  getToolPiecesList(toolId, level = null) {
    if (toolId === 'armor') {
      this.ensureArmorPieces();
      const list = this.state.armorPieces || [];
      if (level == null) return list.filter(Boolean);
      return list.filter((p) => p && Number(p.level) === Number(level));
    }
    this.ensureToolPieces();
    const list = this.state.toolPieces?.[toolId] || [];
    if (level == null) return list.filter(Boolean);
    return list.filter((p) => p && Number(p.level) === Number(level));
  }

  setToolDurability(toolId, level, value) {
    if (toolId === 'armor') return;
    this.ensureToolPieces();
    const max = this.getToolMaxDurability(level);
    const v = Math.max(0, Math.min(max, value));
    (this.state.toolPieces?.[toolId] || []).forEach((p) => {
      if (p && Number(p.level) === Number(level) && !p.repairing) p.dur = v;
    });
    if (!this.state.toolDurability) this.state.toolDurability = {};
    if (!this.state.toolDurability[toolId] || typeof this.state.toolDurability[toolId] !== 'object') {
      this.state.toolDurability[toolId] = {};
    }
    this.state.toolDurability[toolId][level] = v;
  }

  clearToolDurability(toolId, level) {
    if (!this.state.toolDurability?.[toolId]) return;
    delete this.state.toolDurability[toolId][level];
  }

  /** 铠甲血量上限 = armorStats.hp（即耐久上限） */
  getArmorMaxDurability(level) {
    const lv = Math.max(1, Number(level) || 1);
    return Math.max(1, Math.round(GAME_DATA.defense?.armorStats?.[lv]?.hp || 30));
  }

  ensureArmorPieces() {
    if (!this.state.armorPieces) this.state.armorPieces = [];
    if (this.state._armorSeq == null) this.state._armorSeq = 1;
    if (!this.state._armorMigratedV1) {
      const raw = this.state.toolInventory?.armor;
      if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([lvKey, n]) => {
          const level = Number(lvKey) || 1;
          const count = Math.max(0, Math.floor(Number(n) || 0));
          const maxDur = this.getArmorMaxDurability(level);
          const pooled = this.state.toolDurability?.armor?.[level];
          const startDur = pooled != null ? Math.max(0, Math.min(maxDur, Number(pooled))) : maxDur;
          for (let i = 0; i < count; i++) {
            this.state.armorPieces.push({
              id: 'armor_' + (this.state._armorSeq++),
              level,
              dur: startDur,
              maxDur,
              equippedBy: null,
              repairing: false,
              repairOrderId: null,
            });
          }
        });
      }
      if (this.state.toolInventory) this.state.toolInventory.armor = {};
      if (this.state.toolDurability?.armor) delete this.state.toolDurability.armor;
      this.state._armorMigratedV1 = true;
    }
    this.state.armorPieces.forEach((p) => {
      if (!p || !p.id) return;
      const maxDur = this.getArmorMaxDurability(p.level);
      const prevMax = Number(p.maxDur) || maxDur;
      const wasFull = p.dur == null || Number.isNaN(Number(p.dur)) || Number(p.dur) >= prevMax - 0.01;
      p.maxDur = maxDur;
      if (wasFull && !p.repairing) p.dur = maxDur;
      else p.dur = Math.max(0, Math.min(maxDur, Number(p.dur)));
      if (p.equippedBy === undefined) p.equippedBy = null;
      if (p.repairing === undefined) p.repairing = false;
      if (p.repairOrderId === undefined) p.repairOrderId = null;
      if (p.warehoused === undefined) p.warehoused = false;
    });
  }

  /** 非铠甲工具：按件迁移与规范化 */
  /** 已移除「篓子」：清理旧档库存、耐久、修复/生产订单 */
  purgeRemovedBasketTools() {
    if (this.state.toolInventory?.basket) delete this.state.toolInventory.basket;
    if (this.state.toolDurability?.basket) delete this.state.toolDurability.basket;
    if (this.state.toolPieces?.basket) delete this.state.toolPieces.basket;
    if (this.state.craftStations?.craft_basket_1) delete this.state.craftStations.craft_basket_1;
    const queue = this.state.craftOrderQueue;
    if (Array.isArray(queue)) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const o = queue[i];
        if (o?.recipeId === 'craft_basket_1' || o?.toolId === 'basket') {
          if (o.kind === 'repair' && o.paidCost) {
            Object.entries(o.paidCost).forEach(([res, amt]) => this.addResource(res, amt));
          }
          queue.splice(i, 1);
        }
      }
    }
  }

  ensureToolPieces() {
    if (!this.state.toolPieces) this.state.toolPieces = {};
    if (this.state._toolSeq == null) this.state._toolSeq = 1;
    if (!this.state._toolPiecesMigratedV1) {
      Object.keys(GAME_DATA.villagerTools || {}).forEach((toolId) => {
        if (toolId === 'armor') return;
        if (!Array.isArray(this.state.toolPieces[toolId])) this.state.toolPieces[toolId] = [];
        const stock = this.state.toolInventory?.[toolId];
        if (!stock || typeof stock !== 'object') return;
        Object.entries(stock).forEach(([lvKey, n]) => {
          const level = Number(lvKey) || 1;
          const count = Math.max(0, Math.floor(Number(n) || 0));
          if (count <= 0) return;
          const maxDur = this.getToolMaxDurability(level);
          const pooled = this.state.toolDurability?.[toolId]?.[level];
          const startDur = pooled != null ? Math.max(0, Math.min(maxDur, Number(pooled))) : maxDur;
          for (let i = 0; i < count; i++) {
            this.state.toolPieces[toolId].push({
              id: 'tool_' + (this.state._toolSeq++),
              level,
              dur: startDur,
              maxDur,
              repairing: false,
              repairOrderId: null,
            });
          }
        });
      });
      this.state._toolPiecesMigratedV1 = true;
    }
    Object.keys(GAME_DATA.villagerTools || {}).forEach((toolId) => {
      if (toolId === 'armor') return;
      if (!Array.isArray(this.state.toolPieces[toolId])) this.state.toolPieces[toolId] = [];
      this.state.toolPieces[toolId].forEach((p) => {
        if (!p) return;
        const maxDur = this.getToolMaxDurability(p.level);
        const prevMax = Number(p.maxDur) || maxDur;
        const wasFull = p.dur == null || Number.isNaN(Number(p.dur)) || Number(p.dur) >= prevMax - 0.01;
        p.maxDur = maxDur;
        if (wasFull && !p.repairing) p.dur = maxDur;
        else p.dur = Math.max(0, Math.min(maxDur, Number(p.dur) || 0));
        if (p.repairing === undefined) p.repairing = false;
        if (p.repairOrderId === undefined) p.repairOrderId = null;
        if (p.warehoused === undefined) p.warehoused = false;
      });
      this.syncToolInventoryFromPieces(toolId);
    });
  }

  syncToolInventoryFromPieces(toolId) {
    if (!toolId || toolId === 'armor') return;
    if (!this.state.toolInventory) this.state.toolInventory = {};
    const pieces = this.state.toolPieces?.[toolId] || [];
    const counts = {};
    pieces.forEach((p) => {
      if (!p) return;
      const lv = Number(p.level) || 1;
      counts[lv] = (counts[lv] || 0) + 1;
    });
    this.state.toolInventory[toolId] = {};
    Object.entries(counts).forEach(([lv, n]) => {
      if (n > 0) this.state.toolInventory[toolId][lv] = n;
    });
  }

  createToolPiece(toolId, level, dur) {
    this.ensureToolPieces();
    if (!toolId || toolId === 'armor' || !GAME_DATA.villagerTools[toolId]) return null;
    if (!Array.isArray(this.state.toolPieces[toolId])) this.state.toolPieces[toolId] = [];
    const lv = Math.max(1, Number(level) || 1);
    const maxDur = this.getToolMaxDurability(lv);
    const piece = {
      id: 'tool_' + (this.state._toolSeq++),
      level: lv,
      maxDur,
      dur: dur != null ? Math.max(0, Math.min(maxDur, Number(dur))) : maxDur,
      repairing: false,
      repairOrderId: null,
      warehoused: false,
    };
    this.state.toolPieces[toolId].push(piece);
    this.syncToolInventoryFromPieces(toolId);
    return piece;
  }

  findToolPiece(toolId, pieceId) {
    if (toolId === 'armor') return this.findArmorPiece(pieceId);
    this.ensureToolPieces();
    return (this.state.toolPieces?.[toolId] || []).find((p) => p && p.id === pieceId) || null;
  }

  destroyToolPiece(toolId, pieceId) {
    if (toolId === 'armor') return this.destroyArmorPiece(pieceId);
    this.ensureToolPieces();
    const list = this.state.toolPieces?.[toolId];
    if (!list) return null;
    const idx = list.findIndex((p) => p && p.id === pieceId);
    if (idx < 0) return null;
    const [removed] = list.splice(idx, 1);
    if (removed?.repairing && removed.repairOrderId != null) {
      this._removeRepairOrderSilent(removed.repairOrderId, { refund: true });
    }
    this.removePendingAutoRepair(toolId, pieceId);
    this.syncToolInventoryFromPieces(toolId);
    return removed;
  }

  createArmorPiece(level, dur) {
    this.ensureArmorPieces();
    const lv = Math.max(1, Number(level) || 1);
    const maxDur = this.getArmorMaxDurability(lv);
    const piece = {
      id: 'armor_' + (this.state._armorSeq++),
      level: lv,
      maxDur,
      dur: dur != null ? Math.max(0, Math.min(maxDur, Number(dur))) : maxDur,
      equippedBy: null,
      repairing: false,
      repairOrderId: null,
      warehoused: false,
    };
    this.state.armorPieces.push(piece);
    return piece;
  }

  findArmorPiece(pieceId) {
    this.ensureArmorPieces();
    return (this.state.armorPieces || []).find((p) => p && p.id === pieceId) || null;
  }

  destroyArmorPiece(pieceId) {
    this.ensureArmorPieces();
    const idx = (this.state.armorPieces || []).findIndex((p) => p && p.id === pieceId);
    if (idx < 0) return null;
    const [removed] = this.state.armorPieces.splice(idx, 1);
    if (removed?.repairing && removed.repairOrderId != null) {
      this._removeRepairOrderSilent(removed.repairOrderId, { refund: true });
    }
    this.removePendingAutoRepair('armor', pieceId);
    return removed;
  }

  /**
   * 着装：优先穿耐久不满的铠甲，其次高等级，再次更残的。
   */
  pickFreeArmorPiece() {
    this.ensureArmorPieces();
    const free = (this.state.armorPieces || []).filter((p) => p && !p.equippedBy && this.isToolPieceUsable(p));
    if (!free.length) return null;
    free.sort((a, b) => {
      const aFull = a.dur >= a.maxDur - 0.01;
      const bFull = b.dur >= b.maxDur - 0.01;
      if (aFull !== bFull) return aFull ? 1 : -1;
      if (b.level !== a.level) return b.level - a.level;
      return a.dur - b.dur;
    });
    return free[0];
  }

  unequipArmorFromSoldier(soldierId) {
    if (!soldierId) return;
    this.ensureArmorPieces();
    (this.state.armorPieces || []).forEach((p) => {
      if (p && p.equippedBy === soldierId) p.equippedBy = null;
    });
  }

  /** 为士兵分配铠甲；已有则保留（仍优先保证装备中） */
  allocateArmorForSoldier(soldierId) {
    if (!soldierId) return null;
    this.ensureArmorPieces();
    const existing = (this.state.armorPieces || []).find((p) => p && p.equippedBy === soldierId);
    if (existing && this.isToolPieceUsable(existing)) return existing;
    if (existing) {
      existing.equippedBy = null;
      if ((existing.dur || 0) <= 0 || existing.warehoused) this.tryAutoRepairPiece('armor', existing);
    }
    const piece = this.pickFreeArmorPiece();
    if (!piece) return null;
    piece.equippedBy = soldierId;
    return piece;
  }

  getArmorPieceEquippedBy(soldierId) {
    if (!soldierId) return null;
    this.ensureArmorPieces();
    return (this.state.armorPieces || []).find((p) => p && p.equippedBy === soldierId) || null;
  }

  /** 场下（未着装）可修的残甲：同级中最残的一件 */
  getRepairableArmorPiece(level) {
    this.ensureArmorPieces();
    const lv = Number(level);
    return (this.state.armorPieces || [])
      .filter((p) => p && Number(p.level) === lv && !p.equippedBy && !p.repairing && p.dur < p.maxDur - 0.01)
      .sort((a, b) => a.dur - b.dur)[0] || null;
  }

  countEquippedArmor(level) {
    this.ensureArmorPieces();
    const lv = Number(level);
    return (this.state.armorPieces || []).filter((p) => p && Number(p.level) === lv && p.equippedBy).length;
  }

  countRepairingTools(toolId, level) {
    return this.getToolPiecesList(toolId, level).filter((p) => p && p.repairing).length;
  }

  countWarehousedTools(toolId, level) {
    return this.getToolPiecesList(toolId, level).filter((p) => p && p.warehoused && !p.repairing).length;
  }

  getToolRecipe(toolId, level) {
    return GAME_DATA.recipes.find(r => {
      if (!r.isToolRecipe || !r.outputTools?.[toolId]) return false;
      return Number(r.outputTools[toolId].level) === Number(level);
    }) || null;
  }

  getRepairCostRatio() {
    const base = GAME_DATA.toolDurability?.repairCostRatio ?? 0.5;
    const per = GAME_DATA.toolDurability?.repairCostReducePerLevel ?? 0.06;
    const lv = this.getTechRepeatLevel('unlock_efficient_repair').current;
    return Math.max(0, base - lv * per);
  }

  getPieceRepairFactor(toolId, piece) {
    if (!piece) return null;
    const max = Math.max(1, Number(piece.maxDur)
      || (toolId === 'armor' ? this.getArmorMaxDurability(piece.level) : this.getToolMaxDurability(piece.level)));
    const cur = Math.max(0, Number(piece.dur) || 0);
    const missing = Math.max(0, Math.min(1, (max - cur) / max));
    const minMissing = GAME_DATA.toolDurability?.repairMinMissing ?? 0.01;
    if (missing < minMissing - 1e-9) return null;
    const ratio = this.getRepairCostRatio();
    return { factor: ratio * missing, missing, max, cur, ratio };
  }

  computeRepairCostFromFactor(recipe, factor) {
    const cost = {};
    Object.entries(recipe?.inputs || {}).forEach(([res, amt]) => {
      const n = Math.ceil(Number(amt) * factor * 10 - 1e-9) / 10;
      if (n > 0) cost[res] = this.roundResource(n);
    });
    return cost;
  }

  getRepairClicks(recipe, factor) {
    const base = Math.max(1, Number(recipe?.baseMaxCount) || 1);
    return Math.max(1, Math.ceil(base * factor));
  }

  getRepairablePieces(toolId, level) {
    const minMissing = GAME_DATA.toolDurability?.repairMinMissing ?? 0.01;
    return this.getToolPiecesList(toolId, level).filter((p) => {
      if (!p || p.repairing) return false;
      const max = Math.max(1, p.maxDur || 1);
      return (max - (p.dur || 0)) / max >= minMissing - 1e-9;
    });
  }

  getToolRepairCost(toolId, level) {
    const piece = toolId === 'armor'
      ? this.getRepairableArmorPiece(level)
      : this.getRepairablePieces(toolId, level).sort((a, b) => (a.dur || 0) - (b.dur || 0))[0];
    if (!piece) return {};
    const recipe = this.getToolRecipe(toolId, level);
    if (!recipe?.inputs) return {};
    const info = this.getPieceRepairFactor(toolId, piece);
    if (!info) return {};
    return this.computeRepairCostFromFactor(recipe, info.factor);
  }

  canRepairTool(toolId, level) {
    const pieces = this.getRepairablePieces(toolId, level);
    if (!pieces.length) return false;
    const recipe = this.getToolRecipe(toolId, level);
    if (!recipe) return false;
    const info = this.getPieceRepairFactor(toolId, pieces[0]);
    if (!info) return false;
    const cost = this.computeRepairCostFromFactor(recipe, info.factor);
    return Object.keys(cost).length > 0 && this.canAfford(cost);
  }

  /** 保留函数：改走修复订单 */
  repairTool(toolId, level) {
    return this.repairAllTools(toolId, level) > 0;
  }

  placeRepairOrder(toolId, level, pieceId, { silent = false, autoProduced = false } = {}) {
    const recipe = this.getToolRecipe(toolId, level);
    if (!recipe || !this.isRecipeTechUnlocked(recipe.id)) return 0;
    const piece = this.findToolPiece(toolId, pieceId);
    if (!piece || piece.repairing) return 0;
    const info = this.getPieceRepairFactor(toolId, piece);
    if (!info) return 0;
    const cost = this.computeRepairCostFromFactor(recipe, info.factor);
    if (!Object.keys(cost).length || !this.canAfford(cost)) {
      if (!silent) this.showNotification('材料不足，无法修复');
      return 0;
    }
    if (!this.spend(cost)) return 0;
    if (toolId === 'armor' && piece.equippedBy) piece.equippedBy = null;
    piece.warehoused = false;
    this.removePendingAutoRepair(toolId, piece.id);
    const repairClicks = this.getRepairClicks(recipe, info.factor);
    if (!Array.isArray(this.state.craftOrderQueue)) this.state.craftOrderQueue = [];
    if (this.state.craftOrderSeq == null) this.state.craftOrderSeq = 0;
    const order = {
      id: this.state.craftOrderSeq++,
      kind: 'repair',
      recipeId: recipe.id,
      toolId,
      level: Number(level),
      pieceId: piece.id,
      count: 1,
      progress: 0,
      repairClicks,
      paidCost: { ...cost },
      autoProduced: !!autoProduced,
    };
    piece.repairing = true;
    piece.repairOrderId = order.id;
    this.state.craftOrderQueue.push(order);
    if (!silent) {
      this.showNotification(`已加入修复队列：${this.formatToolLabel(toolId, level)}`);
      this.render();
      this.save();
    }
    return 1;
  }

  ensurePendingAutoRepairList() {
    if (!Array.isArray(this.state.pendingAutoRepairs)) this.state.pendingAutoRepairs = [];
    return this.state.pendingAutoRepairs;
  }

  removePendingAutoRepair(toolId, pieceId) {
    const list = this.ensurePendingAutoRepairList();
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].toolId === toolId && list[i].pieceId === pieceId) list.splice(i, 1);
    }
  }

  /**
   * 自动修复线以下但材料不够：收入仓库停用，防止继续磨损；并记入待修表。
   * 每件首次因缺料入库弹一次框。
   */
  warehousePieceAwaitingRepair(toolId, piece, { alert = true } = {}) {
    if (!piece || piece.repairing) return false;
    if (toolId === 'armor' && piece.equippedBy) {
      const unit = this.findRaidUnitHoldingArmor?.(piece)
        || (this.state.defense?.raid?.units || []).find((u) => u && u.armorPieceId === piece.id);
      if (unit && typeof this.stripUnitArmor === 'function') {
        this.stripUnitArmor(unit, false);
      } else {
        piece.equippedBy = null;
      }
    }
    piece.warehoused = true;
    piece._pendingRaidRepair = false;
    const list = this.ensurePendingAutoRepairList();
    const exists = list.some((e) => e.toolId === toolId && e.pieceId === piece.id);
    if (!exists) {
      list.push({ toolId, pieceId: piece.id, level: Number(piece.level) || 1 });
      if (alert) {
        const recipe = this.getToolRecipe(toolId, piece.level);
        const info = this.getPieceRepairFactor(toolId, piece);
        const cost = info && recipe ? this.computeRepairCostFromFactor(recipe, info.factor) : {};
        const label = this.formatToolLabel(toolId, piece.level);
        const costTxt = Object.keys(cost).length ? this.formatCostPlain(cost) : '（材料）';
        this.enqueueAutoRepairShortageAlert(
          `${label} 耐久已低于自动修复线，但材料不足，已暂时收入仓库停用（防止继续磨损）。\n修复需要：${costTxt}\n凑齐材料后将按顺序自动送修。`
        );
      }
    }
    this._needToolUiRefresh = true;
    return true;
  }

  /** 获得材料后：按待修表从前往后，够料的自动送修 */
  drainPendingAutoRepairs() {
    if (this._drainingAutoRepairs) return 0;
    this._drainingAutoRepairs = true;
    let n = 0;
    try {
    const list = this.ensurePendingAutoRepairList();
    if (!list.length) return 0;
    let i = 0;
    while (i < list.length) {
      const entry = list[i];
      const piece = this.findToolPiece(entry.toolId, entry.pieceId);
      if (!piece || piece.repairing) {
        list.splice(i, 1);
        continue;
      }
      const recipe = this.getToolRecipe(entry.toolId, piece.level);
      const st = recipe ? this.state.craftStations?.[recipe.id] : null;
      if (!recipe || !st || st.autoRepair === false) {
        i += 1;
        continue;
      }
      const info = this.getPieceRepairFactor(entry.toolId, piece);
      if (!info) {
        piece.warehoused = false;
        list.splice(i, 1);
        continue;
      }
      const cost = this.computeRepairCostFromFactor(recipe, info.factor);
      if (!Object.keys(cost).length || !this.canAfford(cost)) {
        i += 1;
        continue;
      }
      if (this.isRaidCombatActive?.() && this.isPieceRaidRepairBlocked?.(entry.toolId, piece)) {
        this.tryEnqueueRaidGearRepair?.(entry.toolId, piece);
        i += 1;
        continue;
      }
      const placed = this.placeRepairOrder(entry.toolId, piece.level, piece.id, {
        silent: true,
        autoProduced: true,
        allowDuringRaid: true,
      });
      if (placed > 0) {
        piece.warehoused = false;
        list.splice(i, 1);
        n += 1;
        this._needToolUiRefresh = true;
        this._needCraftListRefresh = true;
      } else {
        i += 1;
      }
    }
    if (n > 0) {
      this.showNotification(`材料已够，自动送修 ×${n}`);
      this.renderStationLists?.();
      this.save();
    }
    return n;
    } finally {
      this._drainingAutoRepairs = false;
    }
  }

  repairAllTools(toolId, level) {
    const recipe = this.getToolRecipe(toolId, level);
    if (!recipe) {
      this.showNotification('找不到对应配方');
      return 0;
    }
    const pieces = this.getRepairablePieces(toolId, level);
    if (!pieces.length) {
      this.showNotification('没有需要修复的装备');
      return 0;
    }
    const plans = [];
    const totalCost = {};
    pieces.forEach((piece) => {
      const info = this.getPieceRepairFactor(toolId, piece);
      if (!info) return;
      const cost = this.computeRepairCostFromFactor(recipe, info.factor);
      plans.push({ piece, cost });
      Object.entries(cost).forEach(([res, amt]) => {
        totalCost[res] = (totalCost[res] || 0) + amt;
      });
    });
    Object.keys(totalCost).forEach((k) => {
      totalCost[k] = this.roundResource(totalCost[k]);
    });
    if (!plans.length) {
      this.showNotification('没有需要修复的装备');
      return 0;
    }
    if (!this.canAfford(totalCost)) {
      this.showNotification('材料不足，无法修复全部');
      return 0;
    }
    let n = 0;
    let queuedSwap = 0;
    plans.forEach(({ piece }) => {
      if (this.isRaidCombatActive?.() && this.isPieceRaidRepairBlocked?.(toolId, piece)) {
        if (this.tryEnqueueRaidGearRepair?.(toolId, piece)) queuedSwap += 1;
        return;
      }
      n += this.placeRepairOrder(toolId, level, piece.id, { silent: true, allowDuringRaid: true });
    });
    if (n > 0 || queuedSwap > 0) {
      const parts = [];
      if (n > 0) parts.push(`修复队列 ×${n}`);
      if (queuedSwap > 0) parts.push(`换装送修 ×${queuedSwap}`);
      this.showNotification(parts.join(' · '));
      this.render();
      this.save();
    } else if (this.isRaidCombatActive?.()) {
      this.showNotification('袭击中：请先把士兵调回城墙内，再经换装冷却后送修');
    }
    return n + queuedSwap;
  }

  tryAutoRepairPiece(toolId, piece) {
    if (!piece || piece.repairing || piece._pendingRaidRepair) return false;
    const recipe = this.getToolRecipe(toolId, piece.level);
    if (!recipe) return false;
    const st = this.state.craftStations?.[recipe.id];
    if (!st || st.autoRepair === false) {
      // 关闭自动修复时解除仓禁，避免永久停用
      if (piece.warehoused) {
        piece.warehoused = false;
        this.removePendingAutoRepair(toolId, piece.id);
        this._needToolUiRefresh = true;
      }
      return false;
    }
    const threshold = st.autoRepairThreshold ?? 10;
    const max = Math.max(1, piece.maxDur || 1);
    const pct = ((piece.dur || 0) / max) * 100;
    // 已入库待修：等凑齐材料后由 drainPendingAutoRepairs 送修
    if (piece.warehoused) {
      if (pct >= threshold) {
        piece.warehoused = false;
        this.removePendingAutoRepair(toolId, piece.id);
        this._needToolUiRefresh = true;
      }
      return false;
    }
    if (pct >= threshold) return false;
    const info = this.getPieceRepairFactor(toolId, piece);
    if (!info) return false;

    // 袭击中：正被占用的装备不能直接送修；门内单位走换装冷却后再修
    if (this.isRaidCombatActive?.() && this.isPieceRaidRepairBlocked?.(toolId, piece)) {
      return !!this.tryEnqueueRaidGearRepair?.(toolId, piece);
    }

    const cost = this.computeRepairCostFromFactor(recipe, info.factor);
    if (!Object.keys(cost).length || !this.canAfford(cost)) {
      this.warehousePieceAwaitingRepair(toolId, piece, { alert: true });
      return false;
    }

    const placed = this.placeRepairOrder(toolId, piece.level, piece.id, {
      silent: true,
      autoProduced: true,
      allowDuringRaid: true,
    });
    if (placed > 0) {
      this._needToolUiRefresh = true;
      this._needCraftListRefresh = true;
    }
    return placed > 0;
  }

  scanAutoRepairs() {
    Object.keys(GAME_DATA.villagerTools || {}).forEach((toolId) => {
      this.getToolPiecesList(toolId).forEach((p) => this.tryAutoRepairPiece(toolId, p));
    });
  }

  /** 静默移除修复订单（件被销毁时）；可选退还材料 */
  _removeRepairOrderSilent(orderId, { refund = false } = {}) {
    const queue = this.state.craftOrderQueue;
    if (!Array.isArray(queue)) return;
    const idx = queue.findIndex((o) => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    if (refund && order?.paidCost) {
      Object.entries(order.paidCost).forEach(([res, amt]) => this.addResource(res, amt));
    }
    queue.splice(idx, 1);
  }

  getCraftOrderMaxProgress(order) {
    if (!order) return 1;
    if (order.kind === 'repair') return Math.max(1, Number(order.repairClicks) || 1);
    return this.getMaxCount('recipe', order.recipeId) || 1;
  }

  /** 轻量刷新工具/武器栏耐久条，避免每帧重建整块 DOM */
  updateToolDurabilityUI() {
    document.querySelectorAll('#tool-list, #weapon-list').forEach(container => {
      container.querySelectorAll('.tool-level-row.has-stock[data-tool-id]').forEach(row => {
      const toolId = row.dataset.toolId;
      const level = Number(row.dataset.toolLevel);
      if (!toolId || !level) return;
      const n = this.getToolCount(toolId, level);
      if (n <= 0) return;
      const usable = this.getUsableToolCount(toolId, level);
      const repairing = this.countRepairingTools(toolId, level);
      const warehoused = this.countWarehousedTools(toolId, level);
      const dur = this.getToolDurability(toolId, level);
      const maxDur = toolId === 'armor' ? this.getArmorMaxDurability(level) : this.getToolMaxDurability(level);
      const pct = maxDur > 0 ? Math.max(0, Math.min(100, (dur / maxDur) * 100)) : 0;
      const users = this.getToolActiveUsersByLevel(toolId)[level] || 0;
      const equippedN = toolId === 'armor' ? this.countEquippedArmor(level) : 0;
      const countEl = row.querySelector('.tool-level-count');
      if (countEl) {
        const tags = [];
        if (repairing > 0) tags.push(`修中${repairing}`);
        if (warehoused > 0) tags.push(`仓禁${warehoused}`);
        countEl.textContent = tags.length ? `×${n}（${tags.join('·')}）` : `×${n}`;
      }
      const repairHint = repairing > 0 ? ` · 修中×${repairing}` : '';
      const warehouseHint = warehoused > 0 ? ` · 仓禁×${warehoused}` : '';
      const armorHint = toolId === 'armor'
        ? (equippedN > 0 ? ` · 上场×${equippedN}` : '')
        : '';
      const usableHint = usable < n ? ` · 可用×${usable}` : '';
      row.classList.toggle('durability-low', pct < 35);
      const fill = row.querySelector('.tool-durability-fill');
      const bar = row.querySelector('.tool-durability-bar');
      const text = row.querySelector('.tool-durability-text');
      if (fill) fill.style.width = `${pct}%`;
      if (bar) bar.title = `耐久 ${dur.toFixed(0)}/${maxDur}${users ? ` · 使用中 ×${users}` : ''}${usableHint}${repairHint}${warehouseHint}${armorHint}`;
      if (text) text.textContent = `${Math.ceil(dur)}/${maxDur}${users ? ` · 用×${users}` : ''}${repairHint}${warehouseHint}`;
      row.querySelector('.btn-repair-tool')?.remove();
      row.querySelector('.tool-repair-cost')?.remove();
      });
    });
  }

  breakOneTool(toolId, level) {
    if (toolId === 'armor') {
      this.ensureArmorPieces();
      const pool = (this.state.armorPieces || [])
        .filter((p) => Number(p.level) === Number(level) && this.isToolPieceUsable(p))
        .sort((a, b) => {
          const ae = a.equippedBy ? 1 : 0;
          const be = b.equippedBy ? 1 : 0;
          if (ae !== be) return ae - be;
          return (a.dur || 0) - (b.dur || 0);
        });
      if (!pool.length) return;
      const label = this.formatToolLabel(toolId, level);
      this.destroyArmorPiece(pool[0].id);
      this._brokenToolsThisTick = this._brokenToolsThisTick || [];
      this._brokenToolsThisTick.push(label);
      this._brokenToolStockKeysThisTick = this._brokenToolStockKeysThisTick || [];
      this._brokenToolStockKeysThisTick.push([toolId, level]);
      return;
    }
    this.ensureToolPieces();
    const pool = (this.state.toolPieces?.[toolId] || [])
      .filter((p) => p && Number(p.level) === Number(level) && this.isToolPieceUsable(p))
      .sort((a, b) => (a.dur || 0) - (b.dur || 0));
    if (!pool.length) return;
    const label = this.formatToolLabel(toolId, level);
    this.destroyToolPiece(toolId, pool[0].id);
    this._brokenToolsThisTick = this._brokenToolsThisTick || [];
    this._brokenToolsThisTick.push(label);
    this._brokenToolStockKeysThisTick = this._brokenToolStockKeysThisTick || [];
    this._brokenToolStockKeysThisTick.push([toolId, level]);
  }

  getCombatToolDemand(toolId) {
    const posts = this.state.defense?.posts || {};
    switch (toolId) {
      case 'bow': return posts.bow || 0;
      case 'crossbow': return posts.crossbow || 0;
      case 'sword': return posts.sword || 0;
      case 'spear': return posts.spear || 0;
      case 'shield': return posts.shield || 0;
      case 'armor':
        return (posts.bow || 0) + (posts.crossbow || 0) + (posts.sword || 0)
          + (posts.spear || 0) + (posts.shield || 0);
      default: return 0;
    }
  }

  /** 各等级正在被使用的工具数量（采集分配 + 防务编制） */
  getToolActiveUsersByLevel(toolId) {
    const def = GAME_DATA.villagerTools[toolId];
    const result = {};
    if (!def) return result;

    const addCombatUsers = () => {
      let demand = this.getCombatToolDemand(toolId);
      const maxLevel = def.maxLevel || 4;
      for (let level = maxLevel; level >= 1; level--) {
        const supply = this.getUsableToolCount(toolId, level);
        const use = Math.min(supply, demand);
        if (use > 0) result[level] = (result[level] || 0) + use;
        demand -= use;
        if (demand <= 0) break;
      }
    };

    const hasGatherTargets = Array.isArray(def.targets) && def.targets.length > 0;

    // 采集 + 作战双用途工具（若有）
    if (def.combat && hasGatherTargets) {
      if (this.isRaidCombatActive()) {
        addCombatUsers();
      } else {
        const shares = this.getToolSharesByLevel(toolId);
        Object.values(shares).forEach((byLevel) => {
          Object.entries(byLevel || {}).forEach(([lv, n]) => {
            result[lv] = (result[lv] || 0) + n;
          });
        });
      }
      return result;
    }

    if (!def.combat) {
      const shares = this.getToolSharesByLevel(toolId);
      Object.values(shares).forEach((byLevel) => {
        Object.entries(byLevel || {}).forEach(([lv, n]) => {
          result[lv] = (result[lv] || 0) + n;
        });
      });
      return result;
    }

    addCombatUsers();
    return result;
  }

  processToolDurability(dt) {
    if (dt <= 0) return;
    if (this.isVillagersResting()) return;
    const seconds = dt / 1000;
    const wearRate = GAME_DATA.toolDurability?.wearPerUserPerSecond ?? 0.2;
    this._brokenToolsThisTick = [];
    this._brokenToolStockKeysThisTick = [];
    let anyWear = false;
    let anyBroken = false;

    Object.keys(GAME_DATA.villagerTools || {}).forEach(toolId => {
      if (toolId === 'armor') return; // 铠甲耐久=战斗血量，不按使用时间磨损
      const usersByLevel = this.getToolActiveUsersByLevel(toolId);
      Object.entries(usersByLevel).forEach(([level, users]) => {
        if (users <= 0) return;
        anyWear = true;
        const lv = Number(level);
        this.ensureToolPieces();
        const pieces = (this.state.toolPieces?.[toolId] || [])
          .filter((p) => p && Number(p.level) === lv && this.isToolPieceUsable(p))
          .sort((a, b) => (a.dur || 0) - (b.dur || 0));
        const n = Math.min(users, pieces.length);
        const wear = wearRate * seconds;
        for (let i = 0; i < n; i++) {
          const piece = pieces[i];
          piece.dur = Math.max(0, (piece.dur || 0) - wear);
          if (piece.dur <= 0) {
            piece.dur = 0;
            anyBroken = true;
            this._brokenToolsThisTick.push(this.formatToolLabel(toolId, lv));
          }
          this.tryAutoRepairPiece(toolId, piece);
        }
      });
    });

    this.scanAutoRepairs();

    if (this._needCraftListRefresh) {
      this._needCraftListRefresh = false;
      this.renderStationLists();
      this.save();
    }

    if (anyBroken && this._brokenToolsThisTick.length) {
      const list = this._brokenToolsThisTick;
      this.showNotification(
        list.length === 1
          ? `${list[0]} 耐久耗尽，已无法使用（可修复）`
          : `${list.length} 件装备耐久耗尽，已无法使用（可修复）`
      );
      this._needToolUiRefresh = true;
    } else if (anyWear || this._needToolUiRefresh) {
      this._needToolDurabilityPaint = true;
    }
  }

  canAffordToolInputs(inputTools, count = 1) {
    let ok = true;
    this.forEachToolIO(inputTools, (toolId, level, amt) => {
      if (this.getUsableToolCount(toolId, level) < amt * count) ok = false;
    });
    return ok;
  }

  spendToolInputs(inputTools, count = 1, { skipAutoPromote = false } = {}) {
    const affected = [];
    this.forEachToolIO(inputTools, (toolId, level, amt) => {
      const need = amt * count;
      for (let i = 0; i < need; i++) this.breakOneTool(toolId, level);
      affected.push([toolId, level]);
    });
    if (!skipAutoPromote && affected.length) {
      this.promoteAutoCraftForToolStockChanges(affected);
    }
  }

  refundToolInputs(inputTools, count = 1) {
    this.forEachToolIO(inputTools, (toolId, level, amt) => {
      this.addTool(toolId, amt * count, level);
    });
  }

  applyOutputTools(outputTools) {
    this.forEachToolIO(outputTools, (toolId, level, amt) => {
      this.addTool(toolId, amt, level);
    });
  }

  formatRecipeLine(recipe) {
    const partsIn = [];
    Object.entries(recipe.inputs || {}).forEach(([r, a]) => {
      partsIn.push(`<span class="cost-resource"><span class="cost-res-icon">${this.formatResourceIcon(r)}</span><span class="cost-res-name">${this.getResourceName(r)}</span>×${a}</span>`);
    });
    this.forEachToolIO(recipe.inputTools, (toolId, level, amt) => {
      partsIn.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
    });
    const outs = [];
    Object.entries(recipe.outputs || {}).forEach(([r, a]) => outs.push(`<span class="cost-resource"><span class="cost-res-icon">${this.formatResourceIcon(r)}</span><span class="cost-res-name">${this.getResourceName(r)}</span>×${a}</span>`));
    this.forEachToolIO(recipe.outputTools, (toolId, level, amt) => {
      outs.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
    });
    return `${partsIn.join(' + ') || '？'} → ${outs.join(' + ') || '？'}`;
  }

  getCraftQueueBarState(recipeId) {
    const order = this.getActiveCraftOrder();
    if (!order || order.recipeId !== recipeId) {
      return { width: 0, isCooldown: false };
    }
    const onCooldown = this.isOnCooldown('recipe', recipeId);
    if (onCooldown) {
      return {
        width: this.getCooldownProgressPct('recipe', recipeId),
        isCooldown: true,
      };
    }
    const max = this.getCraftOrderMaxProgress(order);
    return {
      width: max > 0 ? Math.min(100, (order.progress / max) * 100) : 0,
      isCooldown: false,
    };
  }

  isStationUnlocked(type, id) {
    if (type === 'point') {
      const def = GAME_DATA.resourcePoints[id];
      if (def?.isAltar) return true;
      const pt = this.state.resourcePoints[id];
      if (!pt?.unlocked) return false;
      if (def?.isTreasureChest) return (pt.stock || 0) > 0;
      return true;
    }
    if (type === 'house') {
      if (id === 'build') return !!this.state.houseBuildProgress;
      return !!this.state.houseUpgradeProgress?.[id];
    }
    return this.isRecipeTechUnlocked(id);
  }

  isPointVisibleInSidebar(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (def?.isAltar) return true;
    const pt = this.state.resourcePoints[pointId];
    if (!pt?.unlocked) return false;
    // 魔王始终在列表中可见（即使被无敌笼罩）
    return true;
  }

  isTreasureChestPoint(pointId) {
    return !!GAME_DATA.resourcePoints[pointId]?.isTreasureChest;
  }

  getChestDropRate() {
    const lv = this.getPointUpgradeLevel('treasure_chest', 'dropRate');
    const { baseDropRate, dropRatePerLevel, maxDropRate } = GAME_DATA.treasureChest;
    return Math.min(maxDropRate, baseDropRate + lv * dropRatePerLevel);
  }

  getChestRewardTypeRange() {
    const lv = this.getPointUpgradeLevel('treasure_chest', 'rewardTypes');
    const { baseRewardTypesMin, baseRewardTypesMax } = GAME_DATA.treasureChest;
    return {
      min: baseRewardTypesMin,
      max: baseRewardTypesMax + lv,
    };
  }

  getChestRewardAmountRange() {
    const lv = this.getPointUpgradeLevel('treasure_chest', 'rewardAmount');
    const cfg = GAME_DATA.treasureChest || {};
    const minPer = cfg.rewardAmountMinPerLevel ?? 2;
    const maxPer = cfg.rewardAmountMaxPerLevel ?? 4;
    return {
      min: (cfg.baseRewardAmountMin ?? 1) + lv * minPer,
      max: (cfg.baseRewardAmountMax ?? 6) + lv * maxPer,
    };
  }

  getDiscoveredResourceIds() {
    return Object.keys(GAME_DATA.resources).filter(id => this.isResourceDiscovered(id));
  }

  rollInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  rollChestRewards() {
    const pool = this.getDiscoveredResourceIds();
    if (!pool.length) return [{ res: 'wood', amt: 1 }];

    const typeRange = this.getChestRewardTypeRange();
    const numTypes = Math.min(pool.length, this.rollInt(typeRange.min, typeRange.max));
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, numTypes);
    const amountRange = this.getChestRewardAmountRange();

    return shuffled.map(res => ({
      res,
      amt: this.rollInt(amountRange.min, amountRange.max),
    }));
  }

  tryChestDrop(fromPointId) {
    if (fromPointId === 'treasure_chest') return;
    const def = GAME_DATA.resourcePoints[fromPointId];
    if (!def || def.isDemonKing || def.isBossPoint) return;
    // 觅食（浆果/农场/牧场）不掉宝箱，仅采集区可发现
    if (def.isFoodPoint || def.resource === 'food') return;
    if (!this.isTechUnlocked('unlock_treasure_chest')) return;
    const chestPt = this.state.resourcePoints.treasure_chest;
    if (!chestPt?.unlocked) return;

    if (Math.random() < this.getChestDropRate()) {
      chestPt.stock = (chestPt.stock || 0) + 1;
      // 掉落时立即生成奖励并冻结，后续升级不影响已掉落的宝箱
      if (!Array.isArray(chestPt._pendingDrops)) chestPt._pendingDrops = [];
      chestPt._pendingDrops.push(this.rollChestRewards());
      this.showNotification('🎁 发现了宝箱！可前往宝箱资源点开启');
      this.render();
      this.save();
    }
  }

  getCraftRecipesUnlocked() {
    return GAME_DATA.recipes.filter(r => this.isRecipeTechUnlocked(r.id));
  }

  setActiveStation(type, id) {
    this.state.activeStation = { type, id };
    this.render();
  }

  isActiveStation(type, id) {
    const a = this.state.activeStation;
    return a.type === type && a.id === id;
  }

  getAllUnlockedStations() {
    const list = [];
    Object.keys(GAME_DATA.resourcePoints).forEach(id => {
      const def = GAME_DATA.resourcePoints[id];
      if (def?.isDemonKing || def?.isBossPoint) return; // 魔王不可交互
      if (this.isStationUnlocked('point', id)) list.push({ type: 'point', id });
    });
    GAME_DATA.recipes.forEach(r => {
      if (this.isRecipeTechUnlocked(r.id)) list.push({ type: 'recipe', id: r.id });
    });
    return list;
  }

  // ========== 资源发现 / 科技 ==========
  isResourceDiscovered(resId) {
    if (resId === 'wood' || resId === 'food') return true;
    if ((this.state.resources[resId] || 0) > 0) return true;
    for (const def of Object.values(GAME_DATA.resourcePoints)) {
      if (def.resource === resId && this.state.resourcePoints[def.id]?.unlocked) return true;
    }
    for (const recipe of GAME_DATA.recipes) {
      if (recipe.outputs[resId] && this.isRecipeTechUnlocked(recipe.id)) return true;
    }
    return false;
  }

  /** 获取科技的主父节点 ID（用于树布局） */
  _getTechParentId(tech) {
    if (!tech.requires) return null;
    return Array.isArray(tech.requires) ? tech.requires[0] : tech.requires;
  }

  /** 检查科技的前置需求是否全部满足 */
  _areTechRequirementsMet(tech) {
    if (!tech.requires) return true;
    const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
    return reqs.every(r => this._isPointUpgradePrereqMet(r, tech.pointId));
  }

  /** 资源点升级科技前置：锚点科技须「生效解锁」（开局预解锁的森林/宝箱也要等工作台后才算） */
  _isPointUpgradePrereqMet(reqTechId, pointId) {
    return this._isTechActiveUnlocked(reqTechId);
  }

  isTechVisible(tech) {
    if (tech.gateLevel && (this.ensureDefenseState().gate?.level || 1) >= tech.gateLevel) return true;
    if (this._isTechActiveUnlocked(tech.id)) return true;
    if (tech.requiresPointLevels && tech.pointId) {
      if (this.getPointUpgradeLevel(tech.pointId, 'refine') > 0) return true;
      if (this.getPointUpgradeLevel(tech.pointId, 'count') < tech.requiresPointLevels.count) return false;
      if (this.getPointUpgradeLevel(tech.pointId, 'cooldown') < tech.requiresPointLevels.cooldown) return false;
    }
    if (tech.repeatable && tech.maxRepeat) {
      const times = this.state.unlockedTech.filter(t => t === tech.id).length;
      if (times >= tech.maxRepeat) return true;
    }
    if (tech.requires) {
      const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
      if (!reqs.every(r => this._isPointUpgradePrereqMet(r, tech.pointId))) return false;
    }
    // 前置科技满足即可显示；材料是否发现只影响费用展示（?×n），不隐藏节点
    return true;
  }

  /** 科技是否应显示为"?"状态（仅一层迷雾：父节点已正常可见但尚未生效解锁） */
  isTechHintVisible(tech) {
    if (!tech.requires) return false;
    // 以「生效解锁」为准；开局预写入的森林/宝箱/工具制作在工作台前仍应显示为 ?
    if (this._isTechActiveUnlocked(tech.id)) return false;

    // 资源精炼等：采集/恢复均满级前显示为 "?"，满级后才进入正常可解锁态
    if (tech.requiresPointLevels && tech.pointId) {
      if (this._arePointLevelRequirementsMet(tech)) return false;
      const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
      return reqs.every((r) => {
        const t = GAME_DATA.techTree.find((x) => x.id === r);
        return !!(t && (this.isTechVisible(t) || this.isTechUnlocked(r)));
      });
    }

    const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
    if (reqs.every(r => this._isTechActiveUnlocked(r))) return false;
    const primaryRequire = reqs[0];
    if (this._isTechActiveUnlocked(primaryRequire)) return false;
    const parentTech = GAME_DATA.techTree.find(t => t.id === primaryRequire);
    if (!parentTech) return false;
    // 只显示一层：母节点须为正常可见（非 hint），且尚未生效解锁
    return this.isTechVisible(parentTech) && !this._isTechActiveUnlocked(parentTech.id);
  }

  getVisibleTechIds() {
    return GAME_DATA.techTree.filter(t => this.isTechVisible(t)).map(t => t.id);
  }

  isTechUnlocked(techId) {
    return this.state.unlockedTech.includes(techId);
  }

  getPointUpgradeTechId(pointId, type) {
    if (type === 'double') type = 'refine';
    return `point_up_${pointId}_${type}`;
  }

  getPointUpgradeLevel(pointId, type) {
    if (type === 'double') type = 'refine';
    return this.state.unlockedTech.filter(t => t === this.getPointUpgradeTechId(pointId, type)).length;
  }

  _arePointLevelRequirementsMet(tech) {
    if (!tech?.requiresPointLevels || !tech.pointId) return true;
    const { count, cooldown } = tech.requiresPointLevels;
    if (count != null && this.getPointUpgradeLevel(tech.pointId, 'count') < count) return false;
    if (cooldown != null && this.getPointUpgradeLevel(tech.pointId, 'cooldown') < cooldown) return false;
    return true;
  }

  /** 科技是否已在树上视为已解锁（自身在列表中且全部前置也已生效） */
  _isTechActiveUnlocked(techId) {
    if (!techId || !this.isTechUnlocked(techId)) return false;
    const tech = GAME_DATA.techTree.find(t => t.id === techId);
    if (!tech?.requires) return true;
    const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
    if (tech.pointId) {
      if (!reqs.every(r => this._isPointUpgradePrereqMet(r, tech.pointId))) return false;
      if (tech.requiresPointLevels && !this._arePointLevelRequirementsMet(tech)) return false;
      return true;
    }
    return reqs.every(r => this._isTechActiveUnlocked(r));
  }

  isTechFullyComplete(tech) {
    if (tech.gateLevel) {
      const lv = this.ensureDefenseState().gate?.level || 1;
      if (lv >= tech.gateLevel) return true;
    }
    if (tech.repeatable) {
      if (!tech.maxRepeat) return false;
      const times = this.state.unlockedTech.filter(t => t === tech.id).length;
      return times >= tech.maxRepeat;
    }
    return this.isTechUnlocked(tech.id);
  }

  canUnlockTech(tech) {
    if (tech.requires && !this._areTechRequirementsMet(tech)) return false;
    if (!this._arePointLevelRequirementsMet(tech)) return false;
    if (!this._canUnlockGateTech(tech)) return false;
    if (!this.isTechVisible(tech)) return false;
    if (tech.repeatable) {
      if (tech.maxRepeat) {
        const times = this.state.unlockedTech.filter(t => t === tech.id).length;
        if (times >= tech.maxRepeat) return false;
      }
      return this.canAfford(this.getTechCost(tech));
    }
    if (this.isTechUnlocked(tech.id)) return false;
    // 费用为 0 / 空：由父节点解锁时自动跟随，不走手动解锁
    if (this._isTechCostFree(tech)) return false;
    return this.canAfford(this.getTechCost(tech));
  }

  /** 材料费用为空或全为 0：父节点解锁后自动跟随解锁 */
  _isTechCostFree(tech) {
    if (!tech || tech.repeatable || (tech.pointId && tech.upgradeType)) return false;
    const cost = tech.cost;
    if (!cost || typeof cost !== 'object') return true;
    return !Object.values(cost).some((v) => Number(v) > 0);
  }

  _canAutoUnlockFreeTech(tech) {
    if (!tech || this.isTechUnlocked(tech.id)) return false;
    if (!this._isTechCostFree(tech)) return false;
    if (tech.requires && !this._areTechRequirementsMet(tech)) return false;
    if (!this._arePointLevelRequirementsMet(tech)) return false;
    if (!this._canUnlockGateTech(tech)) return false;
    return true;
  }

  /** 授予科技（不扣材料），用于费用为 0 的跟随解锁 */
  _grantTechUnlockWithoutCost(tech) {
    if (!tech || this.isTechUnlocked(tech.id)) return false;
    const techId = tech.id;
    this.state.unlockedTech.push(techId);
    if (tech.gateLevel) this.applyGateTechLevel(tech);
    if (techId === 'unlock_treasure_chest') this.state.starterChestRevealed = true;
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (def.unlockRequires === techId) this.unlockResourcePoint(id);
    });
    return true;
  }

  /** 把所有「费用为 0 且前置已满足」的科技自动解锁（可连锁） */
  _autoUnlockFreeTechs() {
    let unlocked = [];
    let guard = 0;
    while (guard++ < 64) {
      const next = GAME_DATA.techTree.find((t) => this._canAutoUnlockFreeTech(t));
      if (!next) break;
      if (this._grantTechUnlockWithoutCost(next)) unlocked.push(next);
    }
    return unlocked;
  }

  formatUpgradeLevel(current, max) {
    return `Lv.${Math.max(0, current || 0)}/${Math.max(0, max || 0)}`;
  }

  getTechRepeatLevel(techOrId) {
    const id = typeof techOrId === 'string' ? techOrId : techOrId?.id;
    if (!id) return { current: 0, max: 0 };
    const tech = typeof techOrId === 'object' ? techOrId : GAME_DATA.techTree.find(t => t.id === id);

    // 拆分后的系列科技（筑梦术v1.. / 体魄锤炼v1.. 等）：按系列统计已解锁级数
    const seriesId = tech?.techSeries
      || (GAME_DATA.techTree.some(t => t.techSeries === id) ? id : null);
    if (seriesId) {
      const members = GAME_DATA.techTree.filter(t => t.techSeries === seriesId);
      const fromSeries = members.filter(t => this.isTechUnlocked(t.id)).length;
      const legacy = this.state.unlockedTech.filter(t => t === seriesId).length;
      const max = members.length || tech?.seriesMax || 0;
      return { current: Math.max(fromSeries, Math.min(legacy, max)), max };
    }

    const current = this.state.unlockedTech.filter(t => t === id).length;
    const max = tech?.maxRepeat || 0;
    return { current, max };
  }

  getTechCost(tech) {
    if (tech.pointId && tech.upgradeType) {
      const level = this.getPointUpgradeLevel(tech.pointId, tech.upgradeType);
      if (tech.upgradeType === 'efficiency') {
        return this.getEfficiencyUpgradeCost(tech.pointId, level);
      }
      const costType = tech.upgradeType === 'refine' ? 'double' : tech.upgradeType;
      return this.getPointUpgradeCost(tech.pointId, costType, level);
    }
    if (tech.repeatable) {
      const times = this.state.unlockedTech.filter(t => t === tech.id).length;
      if (Array.isArray(tech.repeatCosts) && tech.repeatCosts[times]) {
        return { ...tech.repeatCosts[times] };
      }
      if (this.isTechUnlocked(tech.id)) {
        const cost = tech.repeatCost || tech.cost;
        const scaled = {};
        Object.entries(cost).forEach(([k, v]) => {
          scaled[k] = Math.ceil(v * Math.pow(1.5, times));
        });
        return scaled;
      }
    }
    return tech.cost;
  }

  // ========== 村民效率与房屋 ==========
  getHouseCapacity(house) {
    const { baseCapacity, capacityPerLevel } = GAME_DATA.housing;
    let cap = (baseCapacity || 1) + (house?.level || 0) * (capacityPerLevel || 1);
    if ((house?.level || 0) === 0 && this._isTechActiveUnlocked('unlock_house_capacity')) {
      cap += 1;
    }
    return cap;
  }

  applyHouseCostDiscount(cost) {
    if (!cost) return cost;
    const lv = this.getTechRepeatLevel('unlock_house_build_discount').current;
    const per = GAME_DATA.housingTechBonuses?.houseCostDiscountPerLevel ?? 0.1;
    const discount = per * lv;
    if (discount <= 0) return { ...cost };
    const scaled = {};
    Object.entries(cost).forEach(([k, v]) => {
      scaled[k] = Math.max(1, Math.ceil(v * (1 - discount)));
    });
    return scaled;
  }

  getHouseOrderCount() {
    const base = GAME_DATA.housing.houseOrderCount || 20;
    const lv = this.getTechRepeatLevel('unlock_house_work_speed').current;
    const reduce = (GAME_DATA.housingTechBonuses?.houseOrderReducePerLevel ?? 2) * lv;
    const min = GAME_DATA.housingTechBonuses?.houseOrderMin ?? 8;
    return Math.max(min, base - reduce);
  }

  getAllyCombatMults() {
    const cfg = GAME_DATA.defenseCombatBonuses || {};
    const hpLv = this.getTechRepeatLevel('unlock_combat_hp').current;
    const atkLv = this.getTechRepeatLevel('unlock_combat_atk').current;
    const aspdLv = this.getTechRepeatLevel('unlock_combat_aspd').current;
    return {
      hp: 1 + hpLv * (cfg.hpPerLevel ?? 0.08),
      atk: 1 + atkLv * (cfg.atkPerLevel ?? 0.06),
      aspd: 1 + aspdLv * (cfg.aspdPerLevel ?? 0.05),
    };
  }

  /** 科技「坚韧皮肤」等提供的友军固定减伤 */
  getAllyFlatDrBonus() {
    if (!this.isTechUnlocked('unlock_tough_skin')) return 0;
    return GAME_DATA.defenseCombatBonuses?.toughSkinFlatDr ?? 1;
  }

  _canUnlockGateTech(tech) {
    if (!tech?.gateLevel) return true;
    const d = this.ensureDefenseState();
    const cur = d.gate?.level || 1;
    if (cur >= tech.gateLevel) return false;
    return cur === tech.gateLevel - 1;
  }

  applyGateTechLevel(tech) {
    if (!tech?.gateLevel) return;
    const d = this.ensureDefenseState();
    d.gate.level = tech.gateLevel;
    const gateDef = this.getGateLevelDef(d.gate.level);
    if (gateDef) d.gate.hp = gateDef.maxHp;
  }

  getVillageCapacity() {
    return (this.state.houses || []).reduce((sum, h) => sum + this.getHouseCapacity(h), 0);
  }

  getEmptyHouseSlots() {
    const reserved = this.state.pendingBreeds || 0;
    return Math.max(0, this.getVillageCapacity() - (this.state.workers?.total || 0) - reserved);
  }

  /** 每天最多预约繁殖：当前人口 / 2（向下取整） */
  getMaxDailyBreeds() {
    return Math.floor((this.state.workers?.total || 0) / 2);
  }

  getRemainingDailyBreedQuota() {
    return Math.max(0, this.getMaxDailyBreeds() - (this.state.breedsOrderedToday || 0));
  }

  applyCostBump(baseCost, times, bump = { mult: 1.2, add: 5 }) {
    let cost = { ...baseCost };
    const mult = bump.mult ?? 1.2;
    const add = bump.add ?? 5;
    for (let i = 0; i < times; i++) {
      const next = {};
      Object.entries(cost).forEach(([res, amt]) => {
        next[res] = Math.max(1, Math.round(amt * mult + add));
      });
      cost = next;
    }
    return cost;
  }

  getHouseBuildCost() {
    return this.applyHouseCostDiscount({ ...(GAME_DATA.housing.buildBaseCost || {}) });
  }

  getHouseUpgradeCost(targetLevel) {
    const cfg = GAME_DATA.housing.upgrades[targetLevel];
    if (!cfg) return null;
    return this.applyHouseCostDiscount({ ...(cfg.baseCost || {}) });
  }

  canBuildHouse() {
    if (this.state.houseBuildProgress) return false; // 已有进行中的建造
    return this.canAfford(this.getHouseBuildCost());
  }

  /** 开始建造房屋（扣材料，设进度） */
  buildHouse() {
    if (!this.canBuildHouse()) return;
    const cost = this.getHouseBuildCost();
    if (!this.spend(cost)) return;
    const orderCount = this.getHouseOrderCount();
    this.state.houseBuildProgress = { progress: 0, startDay: this.state.day || 1, maxCount: orderCount };
    this.showNotification(`开始建造房屋（需要 ${orderCount} 点建造进度）`);
    if (!this.isTutorialActive()) {
      this.focusProductionOrder({ kind: 'house_build' });
    }
    this.render();
    this.save();
  }

  /** 提交房屋建造进度 */
  submitHouseBuildProgress(amount) {
    if (!this.state.houseBuildProgress) return false;
    const p = this.state.houseBuildProgress;
    p.progress += amount;
    if (p.progress >= p.maxCount) {
      // 建造完成
      const id = `house_${this.state.nextHouseSeq++}`;
      this.state.houses.push({ id, level: 0 });
      this.state.houseBuildCount = (this.state.houseBuildCount || 0) + 1;
      this.state.houseBuildProgress = null;
      this.showNotification(`建成新房屋（人口上限 ${this.getVillageCapacity()}）`);
      this.render();
      this.save();
      return true;
    }
    this.renderTick();
    this.save();
    return false;
  }

  // ========== 村民年龄与工作能力 ==========

  /** 当前日龄（天数），birthDay=1 表示第1天出生；日结加人时 birthDay=新一天 */
  getVillagerAge(entry) {
    return (this.state.day || 1) - (entry.birthDay || 1);
  }

  /**
   * 成长期：出生后前 2 个完整日（日龄 0、1），劳动力按 0.5 计。
   * 例：第1天预约并夜间繁殖 → 第2/3天成长期工作 → 第4天天亮日龄到 2，转成人。
   */
  isVillagerGrowing(entry) {
    return this.getVillagerAge(entry) < 2;
  }

  /** 成人：日龄 >= 2 */
  isVillagerAdult(entry) {
    return this.getVillagerAge(entry) >= 2;
  }

  /** 村民能否参与繁殖（仅成人；冷却 3 天） */
  canVillagerBreed(entry) {
    if (!this.isVillagerAdult(entry)) return false;
    if (entry.lastBreedDay != null) {
      const daysSinceBreed = (this.state.day || 1) - entry.lastBreedDay;
      if (daysSinceBreed < 3) return false;
    }
    return true;
  }

  /** 获取年龄段统计（已取消婴儿段） */
  getVillagerAgeStats() {
    const ages = this.state.villagerAges || [];
    let growing = 0;
    let adult = 0;
    ages.forEach((a) => {
      if (this.isVillagerGrowing(a)) growing++;
      else adult++;
    });
    return { infants: 0, growing, adult };
  }

  /** 有效劳动力：成长期 0.5，成年人 1 */
  getEffectiveWorkforce() {
    const ages = this.state.villagerAges || [];
    let total = 0;
    for (const entry of ages) {
      if (this.isVillagerGrowing(entry)) total += 0.5;
      else total += 1;
    }
    return total;
  }

  /** 有效空闲劳动力 = 有效总劳动力 - 已分配人数（分配按人头计） */
  getEffectiveUnassigned() {
    const assigned = (this.state.workers.total || 0) - (this.state.workers.unassigned || 0);
    return Math.max(0, this.getEffectiveWorkforce() - assigned);
  }

  getHouseLevelLabel(level) {
    const lv = level || 0;
    if (lv <= 0) return '基础房屋';
    return GAME_DATA.housing.upgrades[lv]?.name || `Lv.${lv}`;
  }

  getHousesByLevel(level) {
    return (this.state.houses || []).filter(h => (h.level || 0) === level);
  }

  canUpgradeHouseLevel(level) {
    if (level >= (GAME_DATA.housing.maxHouseLevel || 2)) return false;
    const house = this.getHousesByLevel(level)[0];
    if (!house) return false;
    return this.canUpgradeHouse(house.id);
  }

  canUpgradeHouse(houseId) {
    if (this.state.houseUpgradeProgress?.[houseId]) return false; // 已有进行中的升级
    const house = (this.state.houses || []).find(h => h.id === houseId);
    if (!house) return false;
    const next = (house.level || 0) + 1;
    if (next > (GAME_DATA.housing.maxHouseLevel || 2)) return false;
    if (!this.isHouseUpgradeTechUnlocked(next)) return false;
    const cost = this.getHouseUpgradeCost(next);
    return !!cost && this.canAfford(cost);
  }

  /** 房屋升到 targetLevel 所需科技是否已解锁 */
  isHouseUpgradeTechUnlocked(targetLevel) {
    const lv = Number(targetLevel) || 0;
    if (lv <= 0) return true;
    return this.isTechUnlocked(`unlock_house_upgrade_${lv}`);
  }

  getHouseUpgradeTechId(targetLevel) {
    return `unlock_house_upgrade_${Number(targetLevel) || 0}`;
  }

  /** 开始升级房屋（扣材料，设进度） */
  upgradeHouse(houseId) {
    const house = (this.state.houses || []).find(h => h.id === houseId);
    if (!house || !this.canUpgradeHouse(houseId)) return;
    const next = (house.level || 0) + 1;
    const cost = this.getHouseUpgradeCost(next);
    if (!this.spend(cost)) return;
    const orderCount = this.getHouseOrderCount();
    if (!this.state.houseUpgradeProgress) this.state.houseUpgradeProgress = {};
    this.state.houseUpgradeProgress[houseId] = { progress: 0, startDay: this.state.day || 1, maxCount: orderCount, targetLevel: next };
    const name = GAME_DATA.housing.upgrades[next]?.name || `Lv.${next}`;
    this.showNotification(`开始升级房屋为「${name}」（需要 ${orderCount} 点建造进度）`);
    if (!this.isTutorialActive()) {
      this.focusProductionOrder({ kind: 'house_upgrade', houseId });
    }
    this.render();
    this.save();
  }

  /** 提交房屋升级进度 */
  submitHouseUpgradeProgress(houseId, amount) {
    if (!this.state.houseUpgradeProgress?.[houseId]) return false;
    const p = this.state.houseUpgradeProgress[houseId];
    p.progress += amount;
    if (p.progress >= p.maxCount) {
      // 升级完成
      const house = (this.state.houses || []).find(h => h.id === houseId);
      if (house) {
        house.level = p.targetLevel || (house.level || 0) + 1;
      }
      if (!this.state.houseUpgradePurchases) this.state.houseUpgradePurchases = { 1: 0, 2: 0 };
      this.state.houseUpgradePurchases[p.targetLevel] = (this.state.houseUpgradePurchases[p.targetLevel] || 0) + 1;
      delete this.state.houseUpgradeProgress[houseId];
      const name = GAME_DATA.housing.upgrades[p.targetLevel]?.name || `Lv.${p.targetLevel}`;
      this.showNotification(`房屋升级完成：${name}（人口上限 ${this.getVillageCapacity()}）`);
      this.render();
      this.save();
      return true;
    }
    this.renderTick();
    this.save();
    return false;
  }

  /** 处理房屋建造+升级的自动进度 */
  processHouseConstruction(dt) {
    if (this.isVillagersResting()) return;
    const seconds = dt / 1000;
    const speed = this.getVillagerBaseSpeed() * this.getSanctuaryWorkSpeedFactor();
    const progress = speed * seconds;

    // 建造进度
    if (this.state.houseBuildProgress) {
      this.submitHouseBuildProgress(progress);
    }

    // 升级进度（遍历副本避免修改中遍历问题）
    if (this.state.houseUpgradeProgress) {
      Object.keys(this.state.houseUpgradeProgress).forEach(houseId => {
        this.submitHouseUpgradeProgress(houseId, progress);
      });
    }
  }

  getToolIdForPoint(pointId) {
    for (const [toolId, def] of Object.entries(GAME_DATA.villagerTools || {})) {
      if ((def.targets || []).includes(pointId)) return toolId;
    }
    return null;
  }

  /** 同工具类型站点间按需求公平分配各等级工具（高等级优先） */
  getToolSharesByLevel(toolId) {
    const demandStations = Object.keys(GAME_DATA.resourcePoints).filter(pid => {
      if (this.getToolIdForPoint(pid) !== toolId) return false;
      return (this.state.resourcePoints[pid]?.assignedWorkers || 0) > 0;
    });
    const result = {};
    const remainingDemand = {};
    demandStations.forEach(pid => {
      result[pid] = {};
      remainingDemand[pid] = this.state.resourcePoints[pid].assignedWorkers || 0;
    });
    if (!demandStations.length) return result;

    const maxLevel = GAME_DATA.villagerTools[toolId]?.maxLevel || 3;
    for (let level = maxLevel; level >= 1; level--) {
      let supply = this.getUsableToolCount(toolId, level);
      const totalDemand = Object.values(remainingDemand).reduce((s, n) => s + n, 0);
      if (supply <= 0 || totalDemand <= 0) continue;

      const shares = {};
      demandStations.forEach(pid => {
        const need = remainingDemand[pid];
        const fair = Math.floor((supply * need) / totalDemand);
        shares[pid] = Math.min(need, fair);
      });
      let leftover = supply - Object.values(shares).reduce((s, n) => s + n, 0);
      for (const pid of demandStations) {
        if (leftover <= 0) break;
        const room = remainingDemand[pid] - shares[pid];
        if (room > 0) {
          const give = Math.min(room, leftover);
          shares[pid] += give;
          leftover -= give;
        }
      }
      demandStations.forEach(pid => {
        const n = shares[pid] || 0;
        if (n > 0) {
          result[pid][level] = n;
          remainingDemand[pid] -= n;
        }
      });
    }
    return result;
  }

  getStationToolAssignment(type, id) {
    const st = this.getStationState(type, id);
    const workers = st?.assignedWorkers || 0;
    if (workers <= 0 || type !== 'point') {
      return { byLevel: {}, tooled: 0, bare: workers };
    }
    const toolId = this.getToolIdForPoint(id);
    if (!toolId) return { byLevel: {}, tooled: 0, bare: workers };
    const byLevel = this.getToolSharesByLevel(toolId)[id] || {};
    const tooled = Object.values(byLevel).reduce((s, n) => s + n, 0);
    return { byLevel, tooled, bare: Math.max(0, workers - tooled), toolId };
  }

  getTooledVillagerCount(type, id) {
    return this.getStationToolAssignment(type, id).tooled;
  }

  getStationAutoSpeed(type, id, opts = {}) {
    if (!opts.ignoreRest && this.isVillagersResting()) return 0;
    const { baseSpeed } = GAME_DATA.villagerWork;
    let speed;
    if (type !== 'point') {
      // 合计全局生产工人
      const craftWorkers = this.state.workers?.craftWorkers || 0;
      if (craftWorkers <= 0) return 0;
      speed = craftWorkers * this.getCraftWorkerSpeed();
    } else if (GAME_DATA.resourcePoints[id]?.isAltar) {
      return 0;
    } else {
      const st = this.getStationState(type, id);
      const assign = this.getStationToolAssignment(type, id);
      const toolId = this.getToolIdForPoint(id);
      // 需要工具的站点：持工具者用工具效率，其余人仍有徒手 0.05（及效率升级）
      const bareSpeed = this.getPointBareWorkerSpeed(id);
      const workers = st?.assignedWorkers || 0;
      if (toolId) {
        speed = (assign.bare || 0) * bareSpeed;
        Object.entries(assign.byLevel).forEach(([level, count]) => {
          speed += count * this.getToolSpeed(Number(level));
        });
      } else {
        speed = workers * bareSpeed;
      }
    }
    speed *= this.getHungerWorkFactor();
    // 成长期村民工作效率减半
    speed *= this.getGrowthWorkFactor();
    speed *= this.getSanctuaryWorkSpeedFactor();
    return speed;
  }

  /** 成长期村民导致的工作效率因子 */
  getGrowthWorkFactor() {
    const stats = this.getVillagerAgeStats();
    const total = stats.growing + stats.adult;
    if (total <= 0) return 1;
    // 成长期半速，成人全速
    const effective = stats.adult + stats.growing * 0.5;
    return effective / total;
  }

  /** 一天中村民可自动工作的现实秒数（扣除夜间休息） */
  getDailyAutoWorkSeconds() {
    const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;
    const start = GAME_DATA.calendar?.restStartHour ?? 22;
    const end = GAME_DATA.calendar?.restEndHour ?? 6;
    let restHours = 0;
    if (start !== end) {
      restHours = start > end ? (24 - start) + end : (end - start);
    }
    const workFraction = Math.max(0, (24 - restHours) / 24);
    return (dayMs / 1000) * workFraction;
  }

  /**
   * 采集点当日预计产量 ≈ 自动效率 × 日间工作秒数 / 单次进度需求 × 单次产量
   * （效率取「非休息」状态下的自动速度；冷却会拉低实际吞吐，此处按效率×时间换算）
   */
  getPointDailyExpectedOutput(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def || def.isTreasureChest) return 0;
    const speed = this.getStationAutoSpeed('point', pointId, { ignoreRest: true });
    if (speed <= 0) return 0;
    const workSec = this.getDailyAutoWorkSeconds();
    const maxCount = this.getMaxCount('point', pointId);
    if (maxCount <= 0) return 0;
    const progressPerDay = speed * workSec;
    const harvests = progressPerDay / maxCount;
    return harvests * this.getHarvestYield(pointId);
  }

  formatDailyExpectedOutput(amount) {
    const n = this.roundResource(amount);
    if (n <= 0) return '0';
    if (n >= 1000) return this.formatNumber(n);
    if (n >= 10) return String(Math.round(n));
    return this.formatResourceAmount(n);
  }

  /** 夜间休息：22:00–06:00 自动工作暂停（手动点击仍可用） */
  isVillagersResting() {
    const start = GAME_DATA.calendar?.restStartHour ?? 22;
    const end = GAME_DATA.calendar?.restEndHour ?? 6;
    const { hours } = this.getGameTimeOfDay();
    return hours >= start || hours < end;
  }

  /** 资源点徒手村民每人每秒进度（农场/牧场效率升级后提升；食物点另加「食物采集」科技） */
  getPointBareWorkerSpeed(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const level = this.getPointUpgradeLevel(pointId, 'efficiency');
    const byLevel = def?.efficiencySpeedByLevel;
    let speed = (byLevel && byLevel[level] != null) ? byLevel[level] : this.getVillagerBaseSpeed();
    if (def?.isFoodPoint || def?.resource === 'food') {
      speed += this.getFoodGatherSpeedBonus();
    }
    return speed;
  }

  getHungryCount() {
    const total = this.state.workers.total || 0;
    return Math.max(0, Math.min(this.state.hungryCount || 0, total));
  }

  /** 饥饿村民效率减半后的全局工作效率系数 */
  getHungerWorkFactor() {
    const total = this.state.workers.total || 0;
    if (total <= 0) return 1;
    const hungry = this.getHungryCount();
    if (hungry <= 0) return 1;
    return (total - hungry * 0.5) / total;
  }

  getToolClickPower(level) {
    // 工具不再影响手动点击；保留函数避免旧调用报错
    return GAME_DATA.villagerWork.baseClickPower || 1;
  }

  getManualClickPower() {
    const base = GAME_DATA.villagerWork.baseClickPower || 1;
    const bonus = this.state.unlockedTech.filter(t => t === 'unlock_click_power').length;
    return base + bonus;
  }

  getClickPower(type, id) {
    if (type === 'point' && GAME_DATA.resourcePoints[id]?.isTreasureChest) return 1;
    return this.getManualClickPower();
  }

  getBreedCost() {
    const base = GAME_DATA.housing?.breedFoodCost ?? 10;
    const lv = this.getTechRepeatLevel('unlock_breed_saving').current;
    const save = (GAME_DATA.housingTechBonuses?.breedFoodSavePerLevel ?? 2) * lv;
    return { food: Math.max(1, base - save) };
  }

  canBreedVillager() {
    return this.getEmptyHouseSlots() > 0
      && this.getRemainingDailyBreedQuota() > 0
      && this.canAfford(this.getBreedCost());
  }

  /** 白天预约繁殖：扣食物入队，22:00 后开始，次日日结时加人 */
  breedVillager(amount = 1) {
    const times = Math.max(1, Math.floor(amount));
    let done = 0;
    while (done < times) {
      if (!this.canBreedVillager()) break;
      if (!this.spend(this.getBreedCost())) break;
      this.state.pendingBreeds = (this.state.pendingBreeds || 0) + 1;
      this.state.breedsOrderedToday = (this.state.breedsOrderedToday || 0) + 1;
      done++;
    }
    if (!done) {
      if (this.getRemainingDailyBreedQuota() <= 0) {
        this.showNotification(`今日繁殖已达上限（最多 ${this.getMaxDailyBreeds()} 人）`);
      } else if (this.getEmptyHouseSlots() <= 0) {
        this.showNotification('房屋已满员，无法繁殖');
      } else {
        this.showNotification('食物不足，无法繁殖');
      }
      return;
    }
    const pending = this.state.pendingBreeds || 0;
    const start = GAME_DATA.calendar?.restStartHour ?? 22;
    const when = this.isVillagersResting()
      ? '繁殖已开始，新生儿将于明日日结时加入'
      : `已预约，今晚 ${String(start).padStart(2, '0')}:00 后开始，明日日结时新增人口`;
    this.showNotification(
      done > 1
        ? `预约繁殖 ×${done}（队列 ${pending}，${when}）`
        : `预约繁殖 +1（队列 ${pending}，${when}）`
    );
    this.render();
    this.save();
  }

  /** 日结时结算昨夜繁殖队列，增加人口 */
  resolvePendingBreeds() {
    let pending = this.state.pendingBreeds || 0;
    this.state.breedsOrderedToday = 0;
    if (pending <= 0) return 0;

    const slots = Math.max(0, this.getVillageCapacity() - (this.state.workers?.total || 0));
    const born = Math.min(pending, slots);
    const lost = pending - born;
    this.state.pendingBreeds = 0;
    if (born > 0) {
      this.state.workers.total += born;
      this.state.workers.unassigned += born;
      // 添加新生儿年龄记录
      if (!this.state.villagerAges) this.state.villagerAges = [];
      for (let i = 0; i < born; i++) {
        this.state.villagerAges.push({ birthDay: this.state.day || 1, lastBreedDay: null });
      }
      // 标记参与繁殖的成人（冷却3天）
      const adults = this.state.villagerAges.filter(a => this.canVillagerBreed(a));
      for (let i = 0; i < Math.min(born, adults.length); i++) {
        adults[i].lastBreedDay = this.state.day || 1;
      }
      this.checkAchievements();
    }
    if (!this._suppressSounds) {
      if (born > 0) {
        this.showNotification(
          lost > 0
            ? `🐣 新生儿 +${born}（房屋不足，另有 ${lost} 未能入住）`
            : `🐣 新生儿 +${born}（成长期，现有 ${this.state.workers.total}/${this.getVillageCapacity()}）`
        );
      } else if (lost > 0) {
        this.showNotification(`繁殖失败：房屋已满，${lost} 名新生儿无处安顿`);
      }
    }
    return born;
  }

  getAchievementProgress(ach) {
    if (!ach) return { current: 0, target: 0 };
    if (ach.type === 'resource_stock') {
      return { current: this.state.resources[ach.targetId] || 0, target: ach.threshold };
    }
    if (ach.type === 'population') {
      return { current: this.state.workers?.total || 0, target: ach.threshold };
    }
    if (ach.type === 'tool_stock') {
      return { current: this.getToolCount(ach.targetId), target: ach.threshold };
    }
    return { current: 0, target: ach.threshold || 0 };
  }

  isAchievementUnlocked(id) {
    return (this.state.unlockedAchievements || []).includes(id);
  }

  unlockAchievement(ach, quiet = false) {
    if (!ach || this.isAchievementUnlocked(ach.id)) return false;
    if (!this.state.unlockedAchievements) this.state.unlockedAchievements = [];
    this.state.unlockedAchievements.push(ach.id);
    if (!quiet && !this._suppressSounds) {
      this.showNotification(`🏆 成就解锁：${ach.icon || ''} ${ach.name}`);
    }
    return true;
  }

  checkAchievements(quiet = false) {
    const list = GAME_DATA.achievements || [];
    let newly = 0;
    list.forEach(ach => {
      if (this.isAchievementUnlocked(ach.id)) return;
      const { current, target } = this.getAchievementProgress(ach);
      if (current >= target) {
        if (this.unlockAchievement(ach, quiet)) newly++;
      }
    });
    if (newly > 0) {
      const visible =
        !document.getElementById('pause-menu-achievements')?.classList.contains('hidden')
        || !document.getElementById('main-menu-achievements')?.classList.contains('hidden');
      if (visible) this.renderAchievementsPanel();
      if (this._inGameSession) this.save();
    }
    return newly;
  }

  openAchievementsPanel() {
    const show = () => {
      this.checkAchievements(true);
      this.renderAchievementsPanel();
      if (this._atMainMenu && !this._inGameSession) {
        this.showMainMenuPage('main-menu-achievements');
        return;
      }
      if (!this.isPauseMenuOpen()) this.setPauseMenuOpen(true);
      this._showPauseMenuPage?.('pause-menu-achievements');
    };
    if (this._atMainMenu && !this._inGameSession) {
      void this.hydrateAchievementsFromSave().then(show);
      return;
    }
    show();
  }

  async hydrateAchievementsFromSave() {
    try {
      let raw = null;
      const api = this._saveApi();
      if (api?.read) raw = await api.read();
      else raw = localStorage.getItem('factoryGame');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data?.unlockedAchievements)) {
        this.state.unlockedAchievements = data.unlockedAchievements.slice();
      }
    } catch (_) { /* ignore */ }
  }

  closeAchievementsPanel() {
    if (this._atMainMenu && !this._inGameSession) {
      this.showMainMenuHome();
      return;
    }
    if (this.isPauseMenuOpen()) {
      this._showPauseMenuHome?.();
      return;
    }
  }

  renderAchievementsPanel() {
    const list = GAME_DATA.achievements || [];
    const unlockedCount = list.filter(a => this.isAchievementUnlocked(a.id)).length;
    const summaryText = `已完成 ${unlockedCount} / ${list.length}`;
    document.querySelectorAll('[data-achievements-summary]').forEach((el) => {
      el.textContent = summaryText;
    });

    const buildItem = (ach) => {
      const unlocked = this.isAchievementUnlocked(ach.id);
      const { current, target } = this.getAchievementProgress(ach);
      const el = document.createElement('div');
      el.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
      el.innerHTML = `
        <div class="achievement-icon">${unlocked ? ach.icon : '🔒'}</div>
        <div class="achievement-info">
          <div class="achievement-name">${ach.name}</div>
          <div class="achievement-desc">${ach.description}</div>
          <div class="achievement-progress">${unlocked
            ? '已达成'
            : `进度 ${this.formatNumber(Math.min(current, target))} / ${this.formatNumber(target)}`}</div>
        </div>
        ${unlocked ? '<div class="achievement-badge">✓</div>' : ''}
      `;
      return el;
    };

    document.querySelectorAll('[data-achievements-list]').forEach((listEl) => {
      listEl.innerHTML = '';
      list.forEach((ach) => listEl.appendChild(buildItem(ach)));
    });
  }

  getDailyFoodNeed() {
    const per = GAME_DATA.calendar?.foodPerVillager ?? 1;
    const diffMult = this.getDifficultyMult('foodMult', 1);
    return (this.state.workers.total || 0) * per * diffMult;
  }

  /** 获取难度倍率 */
  getDifficultyMult(field, defaultVal = 1) {
    const diff = this.state.difficulty || 'normal';
    return GAME_DATA.difficulty?.levels?.[diff]?.[field] ?? defaultVal;
  }

  /** 一天进度换算为 24 小时制时刻 */
  getGameTimeOfDay() {
    const dayMs = GAME_DATA.calendar?.dayDurationMs || 600000;
    const frac = Math.min(1, Math.max(0, (this.state.dayProgress || 0) / dayMs));
    const totalSeconds = frac * 24 * 3600;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return { hours, minutes, seconds, frac };
  }

  formatGameClock24() {
    const { hours, minutes } = this.getGameTimeOfDay();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  updateCalendarDisplay() {
    const calEl = document.getElementById('calendar-display');
    const wrap = document.getElementById('calendar-wrap');
    const hourHand = document.getElementById('clock-hand-hour');
    const minuteHand = document.getElementById('clock-hand-minute');
    const timeStr = this.formatGameClock24();
    const { minutes, seconds, frac } = this.getGameTimeOfDay();
    const resting = this.isVillagersResting();

    wrap?.classList.toggle('villagers-resting', resting);
    if (calEl) {
      calEl.textContent = resting
        ? `第 ${this.state.day} 天 ${timeStr} · 🌙休息`
        : `第 ${this.state.day} 天 ${timeStr}`;
    }

    // 24 小时表盘：时针一天转一圈；分针按当前小时内分钟
    if (hourHand) {
      const hourDeg = frac * 360 + (minutes / 60) * (360 / 24) + (seconds / 3600) * (360 / 24);
      hourHand.style.transform = `rotate(${hourDeg}deg)`;
    }
    if (minuteHand) {
      const minuteDeg = (minutes / 60) * 360 + (seconds / 60) * 6;
      minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    }
  }

  updateHeaderFoodDisplay() {
    const el = document.getElementById('header-food');
    if (!el) return;
    const need = this.getDailyFoodNeed();
    const food = this.state.resources.food || 0;
    const hungry = this.getHungryCount();
    const low = food < need || hungry > 0;
    el.classList.toggle('food-low', low);
    el.textContent = hungry > 0
      ? `🍎 食物 ${this.formatNumber(food)} / 需 ${this.formatNumber(need)} · 饥饿 ${hungry}`
      : `🍎 食物 ${this.formatNumber(food)} / 需 ${this.formatNumber(need)}`;
    el.title = low
      ? '食物不足以支付今日预计消耗'
      : '今日食物库存与预计消耗';
  }

  updateWarehouseFoodDrain() {
    this.updateHeaderFoodDisplay();
  }

  getStationWorkerCap(type, id) {
    if (type !== 'point') return Infinity;
    const def = GAME_DATA.resourcePoints[id];
    const per = def?.maxWorkers;
    if (!(Number.isFinite(per) && per > 0)) return Infinity;
    if (def.canBuildMultiple) {
      const buildings = this.getPointBuildingCount(id);
      return per * Math.max(0, buildings);
    }
    return per;
  }

  getPointBuildingCount(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def?.canBuildMultiple || !pt) return 1;
    return Math.max(0, pt.buildingCount || 0);
  }

  getExtraPointBuildCost(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def?.canBuildMultiple || !def.extraBuildBaseCost) return null;
    const count = this.getPointBuildingCount(pointId);
    // 已有 N 座时，再建一座按 N-1 次涨价（第 2 座用基础价）
    const times = Math.max(0, count - 1);
    return this.applyCostBump(def.extraBuildBaseCost, times, def.extraBuildCostBump);
  }

  /** 按扩建涨价表，累加「再建 buildCount 座」的总价（从第 2 座算起） */
  getExtraPointBuildCostSum(pointId, buildCount) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def?.extraBuildBaseCost || buildCount <= 0) return null;
    const total = {};
    for (let i = 0; i < buildCount; i++) {
      const part = this.applyCostBump(def.extraBuildBaseCost, i, def.extraBuildCostBump);
      Object.entries(part).forEach(([res, amt]) => {
        total[res] = (total[res] || 0) + amt;
      });
    }
    return total;
  }

  getEfficiencyUpgradeCost(pointId, level = null) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def?.efficiencyUpgradeBuilds) return null;
    const lv = level !== null ? level : this.getPointUpgradeLevel(pointId, 'efficiency');
    const builds = def.efficiencyUpgradeBuilds[lv];
    if (!builds) return null;
    return this.getExtraPointBuildCostSum(pointId, builds);
  }

  canBuildExtraPoint(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def?.canBuildMultiple || !pt?.unlocked) return false;
    if (this.getPointBuildingCount(pointId) < 1) return false;
    const cost = this.getExtraPointBuildCost(pointId);
    return !!cost && this.canAfford(cost);
  }

  buildExtraPoint(pointId) {
    if (!this.canBuildExtraPoint(pointId)) return;
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    const cost = this.getExtraPointBuildCost(pointId);
    if (!this.spend(cost)) return;
    pt.buildingCount = this.getPointBuildingCount(pointId) + 1;
    const cap = this.getStationWorkerCap('point', pointId);
    this.showNotification(`${def.name}再建一座（共 ${pt.buildingCount} 座，人数上限 ${cap}）`);
    this.render();
    this.save();
  }

  processCalendar(dt) {
    const dayMs = GAME_DATA.calendar?.dayDurationMs;
    if (!dayMs || dt <= 0) return;
    const wasResting = this.isVillagersResting();
    this.state.dayProgress = (this.state.dayProgress || 0) + dt;
    let daysPassed = 0;
    let starvedTotal = 0;
    let lastNeed = 0;
    let lastHungry = 0;
    while (
      this.state.dayProgress >= dayMs
      && !this.state.gameOver
      && !this.shouldFreezeGameTime()
    ) {
      this.state.dayProgress -= dayMs;
      lastNeed = this.getDailyFoodNeed();
      const result = this.resolveEndOfDay(true);
      starvedTotal += result.deaths;
      lastHungry = result.hungry;
      daysPassed++;

      if (result.deaths > 0) {
        if (this.state.gameOver) break;
        if (this._suppressSounds) {
          const prev = this._pendingStarvationAlert || { deaths: 0, hungry: 0 };
          this._pendingStarvationAlert = {
            deaths: prev.deaths + result.deaths,
            hungry: result.hungry,
          };
        } else {
          this.pauseForStarvationAlert(result.deaths, result.hungry);
          break;
        }
      }
    }

    this.processSanctuaryEfficiencyTick();

    const resting = this.isVillagersResting();
    if (!this._suppressSounds && wasResting !== resting) {
      if (resting) {
        const pending = this.state.pendingBreeds || 0;
        this.showNotification(
          pending > 0
            ? `🌙 入夜了，村民休息；预约繁殖 ×${pending} 开始，新生儿明日日结时加入`
            : '🌙 入夜了，村民休息（22:00–06:00），自动工作暂停（仍可手动点击）'
        );
      } else {
        this.showNotification('☀️ 天亮了，村民开始自动工作');
      }
    }

    if (daysPassed <= 0 || this._suppressSounds) return;
    const endedDay = (this.state.day || 1) - 1;
    // 饿死人已用确认框提醒，此处不再重复 toast
    if (starvedTotal > 0) return;
    if (lastHungry > 0 && daysPassed === 1) {
      this.showNotification(`第 ${endedDay} 天：食物不足，${lastHungry} 名村民陷入饥饿（工作效率减半）`);
    } else if (daysPassed === 1) {
      this.showNotification(`第 ${endedDay} 天结束，消耗食物 ${lastNeed}`);
    }
  }

  /** 因饥荒死人：弹确认框并暂停时间 */
  pauseForStarvationAlert(deaths, hungry = 0) {
    if (deaths <= 0) return;
    // 已因饿死判负：不再弹中间确认，直接展示覆灭原因
    if (this.state.gameOver) {
      this.syncGameOverUI();
      return;
    }
    this.paused = true;
    if (this._starvationDialogOpen) {
      // 已有弹窗时合并文案数量
      this._pendingStarvationAlert = {
        deaths: (this._pendingStarvationAlert?.deaths || 0) + deaths,
        hungry,
      };
      return;
    }
    this._starvationDialogOpen = true;
    const total = this.state.workers?.total || 0;
    const hungryHint = hungry > 0 ? `\n另有 ${hungry} 名村民陷入饥饿（工作效率减半）。` : '';
    const text = `饿死了 ${deaths} 名村民！\n`
      + `食物不足，连续两天挨饿者会饿死。\n`
      + `当前幸存村民：${total}。${hungryHint}\n`
      + `请尽快采集或生产食物。确认后继续游戏。`;
    this.renderGlobalStats();
    this.showStoryDialog(text, () => {
      this._starvationDialogOpen = false;
      const pending = this._pendingStarvationAlert;
      this._pendingStarvationAlert = null;
      if (pending?.deaths > 0 && !this.state.gameOver) {
        this.pauseForStarvationAlert(pending.deaths, pending.hungry || 0);
        return;
      }
      // 若 Esc/主菜单/漫画等仍要求冻结，只清 paused，真正开时由 shouldFreezeGameTime 决定
      this.paused = false;
      this.lastTick = Date.now();
    });
  }

  flushPendingStarvationAlert() {
    const pending = this._pendingStarvationAlert;
    this._pendingStarvationAlert = null;
    if (!pending?.deaths || this.state.gameOver) return;
    this.pauseForStarvationAlert(pending.deaths, pending.hungry || 0);
  }

  /**
   * 日结扣粮：不够吃的村民陷入饥饿；若已处于饥饿再缺粮则饿死。
   * @returns {{ deaths: number, hungry: number }}
   */
  resolveEndOfDay(quiet = false) {
    const total = this.state.workers.total || 0;
    const per = GAME_DATA.calendar?.foodPerVillager ?? 1;
    const diffMult = this.getDifficultyMult('foodMult', 1);
    const perPerson = per * diffMult;
    const ages = this.state.villagerAges || [];
    let food = this.state.resources.food || 0;

    // 按年龄排序索引（最年轻优先）
    const indices = Array.from({ length: total }, (_, i) => i);
    indices.sort((a, b) => {
      const ageA = ages[a] ? (this.state.day || 1) - (ages[a].birthDay || 1) : 0;
      const ageB = ages[b] ? (this.state.day || 1) - (ages[b].birthDay || 1) : 0;
      return ageA - ageB;
    });

    let newHungry = 0;
    for (const i of indices) {
      const need = perPerson;
      if (food >= need) {
        food -= need;
      } else {
        newHungry++;
      }
    }

    this.state.resources.food = this.roundResource(food);
    this.state.day = (this.state.day || 1) + 1;

    const prevHungry = this.getHungryCount();
    let deaths = 0;
    let hungry = 0;

    if (newHungry <= 0) {
      this.state.hungryCount = 0;
    } else {
      // 连续第二次挨饿的原饥饿村民 → 死亡；其余挨饿村民进入/保持饥饿
      deaths = Math.min(newHungry, prevHungry);
      hungry = newHungry - deaths;
      if (deaths > 0) this.applyStarvation(deaths);
      this.state.hungryCount = Math.min(hungry, this.state.workers.total || 0);
      hungry = this.getHungryCount();
    }

    this.resolvePendingBreeds();

    if (!quiet && !this._suppressSounds) {
      if (deaths > 0) {
        this.showNotification(
          hungry > 0
            ? `饿死 ${deaths} 人！另有 ${hungry} 人陷入饥饿（工作效率减半）`
            : `饿死 ${deaths} 名村民！食物不足，连续饥饿致死`
        );
      } else if (hungry > 0) {
        this.showNotification(`食物不足：${hungry} 名村民陷入饥饿（工作效率减半）`);
      }
    }
    if (!this.state.gameOver) {
      this.checkPopulationGameOver('村民因饥荒饿死，部落无法维系');
    }
    return { deaths, hungry };
  }

  /** 人口只剩 0～1 人时判负（饥荒 / 战败等共用） */
  checkPopulationGameOver(reason = '村落无法再延续') {
    if (this.state.gameOver) return false;
    const total = this.state.workers?.total || 0;
    if (total > 1) return false;
    this.triggerGameOver(reason);
    return true;
  }

  triggerGameOver(reason) {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.gameOverReason = reason || '村落无法再延续';
    const overlay = document.getElementById('game-over');
    overlay?.classList.remove('hidden');
    const titleEl = document.getElementById('game-over-title');
    if (titleEl) {
      const r = this.state.gameOverReason || '';
      if (r.includes('饿死') && (r.includes('战败') || r.includes('兵力'))) {
        titleEl.textContent = '因饥荒战败';
      } else if (r.includes('饿死') || r.includes('饥荒')) {
        titleEl.textContent = '饥荒覆灭';
      } else if (r.includes('战败')) {
        titleEl.textContent = '战败覆灭';
      } else {
        titleEl.textContent = '部落覆灭';
      }
    }
    const pop = document.getElementById('game-over-pop');
    if (pop) pop.textContent = `幸存村民：${this.state.workers?.total || 0}`;
    const reasonEl = document.getElementById('game-over-reason');
    if (reasonEl) reasonEl.textContent = this.state.gameOverReason;
    this.save();
  }

  syncGameOverUI() {
    const overlay = document.getElementById('game-over');
    if (!overlay) return;
    if (this.state.gameOver) {
      overlay.classList.remove('hidden');
      const titleEl = document.getElementById('game-over-title');
      if (titleEl) {
        const r = this.state.gameOverReason || '';
        if (r.includes('饿死') && (r.includes('战败') || r.includes('兵力'))) {
          titleEl.textContent = '因饥荒战败';
        } else if (r.includes('饿死') || r.includes('饥荒')) {
          titleEl.textContent = '饥荒覆灭';
        } else if (r.includes('战败')) {
          titleEl.textContent = '战败覆灭';
        } else {
          titleEl.textContent = '部落覆灭';
        }
      }
      const pop = document.getElementById('game-over-pop');
      if (pop) pop.textContent = `幸存村民：${this.state.workers?.total || 0}`;
      const reasonEl = document.getElementById('game-over-reason');
      if (reasonEl) reasonEl.textContent = this.state.gameOverReason || '村落无法再延续';
    } else {
      overlay.classList.add('hidden');
    }
  }

  applyStarvation(count) {
    let remaining = Math.min(count, this.state.workers.total || 0);
    if (remaining <= 0) return 0;
    const killed = remaining;

    const fromIdle = Math.min(remaining, this.state.workers.unassigned || 0);
    this.state.workers.unassigned -= fromIdle;
    remaining -= fromIdle;

    if (remaining > 0) {
      const stations = [
        ...Object.keys(GAME_DATA.resourcePoints).map(id => ({ type: 'point', id })),
      ];
      for (const { type, id } of stations) {
        if (remaining <= 0) break;
        const st = this.getStationState(type, id);
        if (!st || !(st.assignedWorkers > 0)) continue;
        const take = Math.min(remaining, st.assignedWorkers);
        st.assignedWorkers -= take;
        remaining -= take;
        const key = this.stationKey(type, id);
        if (this.state.workerLayout) {
          this.state.workerLayout[key] = st.assignedWorkers;
        }
      }
    }

    // 饥饿优先减少生产工人和订单分配
    if (remaining > 0) {
      const cw = this.state.workers?.craftWorkers || 0;
      const fromCraft = Math.min(remaining, cw);
      this.state.workers.craftWorkers = Math.max(0, cw - fromCraft);
      remaining -= fromCraft;
    }

    this.state.workers.total = Math.max(0, (this.state.workers.total || 0) - killed);
    if (this.state.workers.unassigned > this.state.workers.total) {
      this.state.workers.unassigned = this.state.workers.total;
    }
    this.state.hungryCount = Math.min(this.state.hungryCount || 0, this.state.workers.total || 0);
    // 同步清理年龄记录
    if (Array.isArray(this.state.villagerAges)) {
      while (this.state.villagerAges.length > (this.state.workers.total || 0)) {
        this.state.villagerAges.pop();
      }
    }
    if ((this.state.pendingBreeds || 0) > 0) {
      const slots = Math.max(0, this.getVillageCapacity() - (this.state.workers?.total || 0));
      this.state.pendingBreeds = Math.min(this.state.pendingBreeds, slots);
    }
    this.state.starvedSinceLastRaid = (this.state.starvedSinceLastRaid || 0) + killed;
    this.checkPopulationGameOver(
      killed > 0
        ? `村民因饥荒饿死（本次 ${killed} 人），部落无法维系`
        : '村民因饥荒饿死，部落无法维系'
    );
    return killed;
  }

  getHoldClickLevel() {
    return Math.min(
      this.state.unlockedTech.filter(t => t === 'unlock_auto_click').length,
      GAME_DATA.holdClick.maxLevel
    );
  }

  getHoldClickCooldownMs() {
    const { baseCooldown, minCooldown, maxLevel } = GAME_DATA.holdClick;
    const level = this.getHoldClickLevel();
    if (level >= maxLevel) return minCooldown;
    return baseCooldown - (baseCooldown - minCooldown) * (level / maxLevel);
  }

  formatHoldClickCooldown() {
    return `${(this.getHoldClickCooldownMs() / 1000).toFixed(1)}秒/次`;
  }

  // ========== 资源计算 ==========
  /** 材料数量统一精确到小数点后 1 位 */
  roundResource(n) {
    return Math.round((Number(n) || 0) * 10) / 10;
  }

  canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([res, amt]) => {
      const need = this.roundResource(amt);
      return this.roundResource(this.state.resources[res] || 0) + 1e-9 >= need;
    });
  }

  spend(cost) {
    if (!this.canAfford(cost)) return false;
    Object.entries(cost).forEach(([res, amt]) => {
      this.state.resources[res] = this.roundResource((this.state.resources[res] || 0) - amt);
    });
    return true;
  }

  addResource(res, amount) {
    if (GAME_DATA.resources[res]) {
      this.state.resources[res] = this.roundResource((this.state.resources[res] || 0) + amount);
      this.checkAchievements();
      this.drainPendingAutoRepairs();
      this.scanAutoProduces();
    }
  }

  getPointRefineLevel(pointId) {
    return this.getPointUpgradeLevel(pointId, 'refine') > 0 ? 1 : 0;
  }

  getHarvestYield(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def || def.isTreasureChest) return 0;
    let baseYield = def.baseYield || 1;
    if (this.getPointRefineLevel(pointId) > 0) baseYield += 1;
    return baseYield;
  }

  getCountUpgradeRatio(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def) return 1;
    const maxLevel = def.maxUpgrades.count || 5;
    const level = Math.min(this.getPointUpgradeLevel(pointId, 'count'), maxLevel);
    const finalRatio = GAME_DATA.pointUpgradeMeta.count.finalMaxCountRatio;
    if (maxLevel <= 0) return 1;
    // 5 级满级与原 10 级满级同为 finalRatio；中间级把原 1~10 曲线平摊进 1~5
    return Math.pow(finalRatio, level / maxLevel);
  }

  getCooldownUpgradeRatio(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def) return 1;
    const maxLevel = def.maxUpgrades.cooldown || 5;
    const level = Math.min(this.getPointUpgradeLevel(pointId, 'cooldown'), maxLevel);
    const finalRatio = def.finalCooldownRatio
      ?? GAME_DATA.pointUpgradeMeta.cooldown.finalCooldownRatio;
    if (maxLevel <= 0) return 1;
    // level/maxLevel：5 级满级与原 10 级满级同为 finalRatio；中间级把原 1~10 曲线平摊进 1~5
    return Math.pow(finalRatio, level / maxLevel);
  }

  getMaxCount(type, id) {
    const def = this.getStationDef(type, id);
    if (type === 'house') {
      if (id === 'build') return this.state.houseBuildProgress?.maxCount || def?.baseMaxCount || this.getHouseOrderCount();
      return this.state.houseUpgradeProgress?.[id]?.maxCount || def?.baseMaxCount || this.getHouseOrderCount();
    }
    if (type === 'point' && def?.isTreasureChest) return def.baseMaxCount;
    if (type === 'point') {
      return Math.max(1, Math.round(def.baseMaxCount * this.getCountUpgradeRatio(id)));
    }
    if (type === 'recipe' && def?.usesFurnace && this.isTechUnlocked('unlock_furnace_upgrade')) {
      return Math.max(1, Math.round(def.baseMaxCount / 2));
    }
    return def.baseMaxCount;
  }

  getCooldown(type, id) {
    if (type === 'recipe') {
      return GAME_DATA.craftOrderCooldownMs ?? 250;
    }
    const def = this.getStationDef(type, id);
    if (!def?.baseCooldown) return 0;
    if (def.isTreasureChest) return def.baseCooldown;
    let cd = def.baseCooldown * this.getCooldownUpgradeRatio(id);
    if (this._isTechActiveUnlocked('unlock_point_recovery')) cd *= 0.9;
    return cd;
  }

  startCooldown(type, id) {
    const st = this.getStationState(type, id);
    if (!st) return;
    const duration = this.getCooldown(type, id);
    st.cooldownRemaining = duration;
    st.cooldownTotal = duration;
  }

  getCooldownDuration(type, id) {
    const st = this.getStationState(type, id);
    if (!st) return this.getCooldown(type, id);
    return st.cooldownTotal || this.getCooldown(type, id);
  }

  formatCooldownSeconds(ms) {
    return (Math.max(0, ms) / 1000).toFixed(1);
  }

  getYieldMultiplier(type, id) {
    if (type !== 'point') return 1;
    return this.getHarvestYield(id);
  }

  isOnCooldown(type, id) {
    const st = this.getStationState(type, id);
    if (!st) return false;
    // 采集点：计数填满动画 / 冷却回落期间都视为忙碌（不可再点）
    if (type === 'point' && st._gatherAnim) return true;
    return st.cooldownRemaining > 0;
  }

  getCooldownProgressPct(type, id) {
    const st = this.getStationState(type, id);
    if (!st) return 0;
    const max = this.getCooldownDuration(type, id);
    if (max <= 0) return 0;

    // 采集点冷却回落：用开启动画时的真实时间插值，避免 100ms 一跳
    if (type === 'point' && st._gatherAnim?.phase === 'cooldown') {
      const anim = st._gatherAnim;
      const dur = Math.max(1, anim.cdVisualMs || max);
      const scale = this.timeScale || this.devTimeScale || 1;
      const gameElapsed = Math.max(0, (performance.now() - (anim.cdVisualStart || performance.now())) * scale);
      const rem = Math.max(0, dur - gameElapsed);
      return Math.min(100, Math.max(0, (rem / dur) * 100));
    }

    if (st.cooldownRemaining <= 0) return 0;
    const remaining = Math.min(st.cooldownRemaining, max);
    // 采集点：满格回落；合成等：空→满
    if (type === 'point') {
      return Math.min(100, Math.max(0, (remaining / max) * 100));
    }
    return Math.min(100, Math.max(0, ((max - remaining) / max) * 100));
  }

  /** 采集点进度条/文案：填满动画 → 满格停顿 → 冷却回落 → 重置 */
  _getPointBarState(pointId) {
    const pt = this.state.resourcePoints[pointId];
    const max = this.getMaxCount('point', pointId) || 1;
    if (!pt) {
      return { width: 0, text: `0.0 / ${max}`, locked: false, cooling: false, instant: false };
    }
    const anim = pt._gatherAnim;
    if (anim?.phase === 'fill' || anim?.phase === 'full') {
      let count = max;
      if (anim.phase === 'fill') {
        const dur = Math.max(1, anim.fillMs || ((anim.fillUntil || 0) - (anim.fillStart || 0)));
        const t = Math.min(1, Math.max(0, (performance.now() - (anim.fillStart || 0)) / dur));
        const from = Math.max(0, Math.min(max, anim.fillFrom ?? 0));
        count = from + (max - from) * t;
      }
      return {
        width: Math.min(100, (count / max) * 100),
        text: `${count.toFixed(1)} / ${max}`,
        locked: true,
        cooling: false,
        instant: true,
      };
    }
    if (pt.cooldownRemaining > 0 || anim?.phase === 'cooldown') {
      const width = this.getCooldownProgressPct('point', pointId);
      const scale = this.timeScale || this.devTimeScale || 1;
      const remMs = anim?.phase === 'cooldown'
        ? Math.max(
          0,
          (anim.cdVisualMs || this.getCooldownDuration('point', pointId))
            - (performance.now() - (anim.cdVisualStart || 0)) * scale
        )
        : pt.cooldownRemaining;
      return {
        width,
        text: `冷却中 ${this.formatCooldownSeconds(remMs)}s`,
        locked: true,
        cooling: true,
        instant: true,
      };
    }
    return {
      width: Math.min(100, (pt.currentCount / max) * 100),
      text: `${Number(pt.currentCount || 0).toFixed(1)} / ${max}`,
      locked: false,
      cooling: false,
      instant: false,
    };
  }

  applyProgressBar(bar, { width, isCooldown, instant }) {
    if (!bar) return;
    if (instant) {
      bar.style.transition = 'none';
      bar.classList.add('no-transition');
    } else {
      bar.style.transition = '';
      bar.classList.remove('no-transition');
    }
    bar.style.width = `${width}%`;
    bar.classList.toggle('cooldown', !!isCooldown);
  }

  _kickGatherFillRaf() {
    if (this._gatherFillRaf) return;
    const step = () => {
      this.processPointGatherAnims();
      const anyAnim = Object.values(this.state.resourcePoints || {}).some((pt) => !!pt?._gatherAnim);
      if (!anyAnim) {
        this._gatherFillRaf = null;
        this.renderTick();
        return;
      }
      this.renderTick();
      this._gatherFillRaf = requestAnimationFrame(step);
    };
    this._gatherFillRaf = requestAnimationFrame(step);
  }

  /** 采集成功：中心图标 + 进度框放大抖动 */
  pulseHarvestSuccess() {
    const targets = [
      document.getElementById('point-icon'),
      document.getElementById('progress-container'),
    ];
    targets.forEach((el) => {
      if (!el) return;
      el.classList.remove('harvest-pop');
      void el.offsetWidth;
      el.classList.add('harvest-pop');
      const onEnd = () => {
        el.classList.remove('harvest-pop');
        el.removeEventListener('animationend', onEnd);
      };
      el.addEventListener('animationend', onEnd);
    });
  }

  canManualCraftClick(type, id) {
    if (type === 'house') return this.isStationUnlocked(type, id);
    if (type !== 'recipe') return false;
    if (!this.isRecipeTechUnlocked(id)) return false;
    const queue = this.getCraftQueue(id);
    if (!queue || queue.quantity <= 0) return false;
    if (this.isOnCooldown('recipe', id)) return false;
    return true;
  }

  addCraftQueueProgress(recipeId, amount, orderId = null) {
    const queue = this.state.craftOrderQueue || [];
    let order = null;
    if (orderId != null) {
      order = queue.find(o => o.id === orderId);
    } else if (queue[0] && queue[0].recipeId === recipeId) {
      order = queue[0];
    } else {
      order = queue.find(o => o.recipeId === recipeId);
    }
    if (!order || amount <= 0) return 0;

    const st = this.state.craftStations[recipeId];
    if (!st || st.cooldownRemaining > 0) return 0;

    order.progress += amount;
    const orderKey = order.id;

    let completed = 0;
    while (completed < 20) {
      const activeOrder = queue.find(o => o.id === orderKey);
      if (!activeOrder || st.cooldownRemaining > 0) break;
      if (activeOrder.kind === 'repair') {
        const piece = this.findToolPiece(activeOrder.toolId, activeOrder.pieceId);
        if (!piece || !piece.repairing) break;
      }
      const max = this.getCraftOrderMaxProgress(activeOrder);
      if (activeOrder.progress < max) break;
      activeOrder.progress -= max;
      this.completeCraftUnit(recipeId, { silent: completed > 0, order: activeOrder });
      completed++;
    }
    return completed;
  }

  // ========== 点击与自动进度 ==========
  clickStation(type, id) {
    if (type === 'house') {
      if (!this.isStationUnlocked(type, id)) return;
      const power = this.getClickPower(type, id);
      this.state.totalClicks += power;
      if (id === 'build') {
        this.submitHouseBuildProgress(power);
      } else {
        this.submitHouseUpgradeProgress(id, power);
      }
      return;
    }
    if (type === 'recipe') {
      if (!this.canManualCraftClick(type, id)) return;
      const power = this.getClickPower(type, id);
      this.state.totalClicks += power;
      const completed = this.addCraftQueueProgress(id, power);
      if (completed > 0) {
        this.render();
        this.save();
      } else {
        this.renderTick();
      }
      return;
    }

    const st = this.getStationState(type, id);
    if (!this.isStationUnlocked(type, id) || this.isOnCooldown(type, id)) return;

    const prevCount = st.currentCount;
    const power = this.getClickPower(type, id);
    st.currentCount += power;
    this.state.totalClicks += power;

    if (st.currentCount >= this.getMaxCount(type, id)) {
      const max = this.getMaxCount(type, id);
      const fillFrom = Math.min(max, prevCount);
      // 手动点击：超出本轮满格的部分直接舍弃，不带入下一轮
      st.currentCount = max;
      if (!this.isOnCooldown(type, id)) {
        this.tryCompleteStation(type, id, { fillFrom, overflow: 0 });
      }
      if (st._gatherAnim || st.currentCount === 0 || this.isOnCooldown(type, id)) {
        this.render();
        this.save();
      } else {
        this.renderTick();
      }
    } else {
      if (GAME_DATA.resourcePoints[id]?.isTreasureChest) {
        const max = this.getMaxCount(type, id);
        this.updateChestVisual(st.currentCount, max);
        this.pulseChestClick(st.currentCount, max);
      }
      this.renderTick();
    }
  }

  tryCompleteStation(type, id, opts = {}) {
    const st = this.getStationState(type, id);
    const maxCount = this.getMaxCount(type, id);
    if (st.currentCount < maxCount) return false;

    // 魔王点不可交互
    const def = this.getStationDef(type, id);
    if (def?.isDemonKing || def?.isBossPoint) {
      st.currentCount = 0;
      return false;
    }

    if (type === 'point') {
      if (GAME_DATA.resourcePoints[id]?.isAltar) return false;
      this.harvestResource(id, opts);
      return true;
    }
    return false;
  }

  /** 发放采集收益与掉落（填满动画结束后调用） */
  _grantPointHarvestLoot(pointId, yieldAmount) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def || def.isTreasureChest || def.isAltar) return;
    let amount = yieldAmount;
    let blessMult = null;
    const rolled = this.rollSanctuaryGatherBonus();
    if (rolled && rolled > 1) {
      blessMult = rolled;
      amount = Math.max(1, Math.floor(amount * rolled));
    }
    this.addResource(def.resource, amount);
    if (pointId === 'berry_bush' && this.state.tutorial && !this.state.tutorial.completed) {
      this.state.tutorial.berryHarvests = (this.state.tutorial.berryHarvests || 0) + amount;
    }
    const isActive = this.state.activeStation?.type === 'point' && this.state.activeStation?.id === pointId;
    if (!this._suppressSounds && isActive) this.sounds.playHarvest(def.resource);
    const resDef = GAME_DATA.resources[def.resource];
    const blessTxt = blessMult ? `（采集庇护 ×${blessMult.toFixed(1)}）` : '';
    this.showResourceGainNotification(`获得 ${resDef.icon} ${resDef.name} ×${amount}${blessTxt}`);
    this.tryGrantStarterChest(pointId);
    const starterAt = GAME_DATA.starterChest?.afterForestHarvests ?? 2;
    if (!(pointId === 'forest' && this.state.forestHarvestCount === starterAt)) {
      this.tryChestDrop(pointId);
    }
  }

  harvestResource(pointId, opts = {}) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];

    if (def.isTreasureChest) {
      if ((pt.stock || 0) <= 0) return;
      this.startCooldown('point', pointId);
      let rewards;
      let isStarterLoot = false;
      if (pt.nextOpenPreset === 'starter_axe') {
        rewards = this.getStarterAxeChestRewards();
        delete pt.nextOpenPreset;
        isStarterLoot = true;
      } else {
        // 优先使用掉落时冻结的奖励
        if (Array.isArray(pt._pendingDrops) && pt._pendingDrops.length > 0) {
          rewards = pt._pendingDrops.shift();
        } else {
          // 旧存档兼容：无冻结数据时实时生成
          rewards = this.rollChestRewards();
        }
      }
      pt.stock--;
      pt.currentCount = 0;
      this.playChestOpenComplete(() => {
        if (!this._suppressSounds && this.state.activeStation?.type === 'point' && this.state.activeStation?.id === 'treasure_chest') this.sounds.playHarvest('chest');
        rewards.forEach(({ res, amt }) => this.addResource(res, amt));
        const parts = rewards.map(({ res, amt }) => {
          const r = GAME_DATA.resources[res];
          return `${r?.icon || ''} ${r?.name || res} ×${amt}`;
        });
        this.showResourceGainNotification(`宝箱开启：获得 ${parts.join('、')}`);
        this.resetChestVisualAfterOpen();
        this.render();
        this.save();
        if (isStarterLoot) {
          this.showStoryDialog(
            GAME_DATA.starterChest?.lootDialog
              || GAME_DATA.starterChest?.afterOpenDialog
              || '拿到了不少材料，去解锁一下新科技',
            () => {
              if (this.state.tutorial) this.state.tutorial.starterChestOpened = true;
              this.render();
              this.save();
            }
          );
        }
      });
      return;
    }

    const yieldAmount = this.getHarvestYield(pointId);
    const max = this.getMaxCount('point', pointId);
    const overflow = Math.max(0, Number(opts.overflow) || 0);
    const fillFrom = Math.max(0, Math.min(max, opts.fillFrom ?? pt.currentCount));

    // 快进/静音模拟：跳过动画，沿用即时结算
    if (this._suppressSounds) {
      this._grantPointHarvestLoot(pointId, yieldAmount);
      pt.currentCount = overflow;
      this.startCooldown('point', pointId);
      return;
    }

    // 先播计数填满 → 满格停顿 → 再进冷却；冷却回落完才重置计数
    pt.currentCount = max;
    const from = Math.max(0, Math.min(max, fillFrom));
    // 点满涨格约 0.2s（一次 +5 也按这个节奏）
    const fillMs = 200;
    const now = performance.now();
    pt._gatherAnim = {
      phase: 'fill',
      fillStart: now,
      fillMs,
      fillUntil: now + fillMs,
      fillFrom: from,
      overflow,
      yieldAmount,
    };
    this._kickGatherFillRaf();
    this.renderTick();
  }

  /** 推进采集点填满/满格停顿/冷却收尾动画 */
  processPointGatherAnims() {
    const now = performance.now();
    Object.entries(this.state.resourcePoints || {}).forEach(([pointId, pt]) => {
      const anim = pt._gatherAnim;
      if (!anim) return;
      const def = GAME_DATA.resourcePoints[pointId];
      if (!def || def.isTreasureChest) {
        delete pt._gatherAnim;
        return;
      }

      if (anim.phase === 'fill') {
        const until = anim.fillUntil || ((anim.fillStart || 0) + (anim.fillMs || 0));
        if (now < until) return;
        // 进度条动画播完、计数值满 → 再震一下，然后短停再发奖/进冷却
        anim.phase = 'full';
        anim.fullUntil = now + 60;
        const isActive = this.state.activeStation?.type === 'point' && this.state.activeStation?.id === pointId;
        if (isActive) this.pulseHarvestSuccess();
        return;
      }

      if (anim.phase === 'full') {
        if (now < (anim.fullUntil || 0)) return;
        this._grantPointHarvestLoot(pointId, anim.yieldAmount);
        this.startCooldown('point', pointId);
        anim.phase = 'cooldown';
        anim.cdVisualStart = performance.now();
        anim.cdVisualMs = this.getCooldownDuration('point', pointId) || pt.cooldownTotal || pt.cooldownRemaining || 1;
        // 继续 rAF，让冷却回落按帧平滑更新
        this._kickGatherFillRaf();
        return;
      }

      if (anim.phase === 'cooldown') {
        // 以平滑视觉回落为准结束；结束后再清逻辑冷却并重置计数
        const scale = this.timeScale || this.devTimeScale || 1;
        const visualDone = (performance.now() - (anim.cdVisualStart || 0)) * scale >= (anim.cdVisualMs || 0);
        if (!visualDone) return;
        const overflow = Math.max(0, Number(anim.overflow) || 0);
        delete pt._gatherAnim;
        pt.currentCount = overflow;
        pt.cooldownRemaining = 0;
        pt.cooldownTotal = 0;
        const max = this.getMaxCount('point', pointId);
        if (overflow >= max && !this.isOnCooldown('point', pointId)) {
          this.addProgress('point', pointId, 0);
        }
      }
    });
  }

  processCraftOrderProgress(dt) {
    if (this.isVillagersResting()) return;
    const seconds = dt / 1000;
    const queue = this.state.craftOrderQueue || [];
    if (queue.length === 0) return;
    let changed = false;
    const baseSpeed = this.getCraftWorkerSpeed() * this.getSanctuaryWorkSpeedFactor();

    // 全局生产工人 → 处理队首订单
    const globalWorkers = this.state.workers?.craftWorkers || 0;
    if (globalWorkers > 0) {
      const firstOrder = queue[0];
      if (firstOrder && this._canProcessOrder(firstOrder)) {
        const globalSpeed = globalWorkers * baseSpeed;
        const completed = this.addCraftQueueProgress(
          firstOrder.recipeId,
          globalSpeed * seconds,
          firstOrder.id
        );
        if (completed > 0) changed = true;
      }
    }

    if (changed) {
      this.render();
      this.save();
    }
  }

  _canProcessOrder(order) {
    if (!order) return false;
    if (!this.isRecipeTechUnlocked(order.recipeId)) return false;
    const st = this.state.craftStations[order.recipeId];
    if (!st || st.cooldownRemaining > 0) return false;
    if (order.kind === 'repair') {
      const piece = this.findToolPiece(order.toolId, order.pieceId);
      return !!(piece && piece.repairing && piece.repairOrderId === order.id);
    }
    return true;
  }

  addProgress(type, id, amount) {
    if (type === 'recipe') return;
    const st = this.getStationState(type, id);
    if (!st || !this.isStationUnlocked(type, id) || this.isOnCooldown(type, id)) return;

    const prevCount = st.currentCount;
    if (amount > 0) st.currentCount += amount;
    const max = this.getMaxCount(type, id);
    let safety = 0;
    let fillFrom = Math.min(max, prevCount);
    while (st.currentCount >= max && safety < 100) {
      if (this.isOnCooldown(type, id)) break;
      // 超出本轮满格的部分舍弃，不带入冷却后的下一轮
      st.currentCount = max;
      if (!this.tryCompleteStation(type, id, { fillFrom, overflow: 0 })) break;
      if (st._gatherAnim) break;
      st.currentCount = 0;
      fillFrom = 0;
      safety++;
    }
  }

  processAutoProgress(dt) {
    const seconds = dt / 1000;
    Object.keys(GAME_DATA.resourcePoints).forEach(id => {
      const def = GAME_DATA.resourcePoints[id];
      if (def?.isTreasureChest || def?.isAltar || def?.isDemonKing || def?.isBossPoint) return;
      if (!this.isStationUnlocked('point', id)) return;
      const speed = this.getStationAutoSpeed('point', id);
      if (speed <= 0) return;
      this.addProgress('point', id, speed * seconds);
    });
    this.processCraftOrderProgress(dt);
  }

  processCooldowns(dt) {
    if (dt <= 0) return;
    let pointRecovered = false;

    Object.entries(this.state.resourcePoints).forEach(([, pt]) => {
      if (pt.cooldownRemaining > 0) {
        const before = pt.cooldownRemaining;
        pt.cooldownRemaining = Math.max(0, pt.cooldownRemaining - dt);
        if (before > 0 && pt.cooldownRemaining <= 0) {
          pt.cooldownTotal = 0;
          pointRecovered = true;
        }
      }
    });

    Object.values(this.state.craftStations || {}).forEach(st => {
      if (st.cooldownRemaining > 0) {
        st.cooldownRemaining = Math.max(0, st.cooldownRemaining - dt);
        if (st.cooldownRemaining <= 0) st.cooldownTotal = 0;
      }
    });

    if (pointRecovered && !this._suppressSounds) {
      // 恢复音效：仅当恢复的资源点是当前激活界面
      const active = this.state.activeStation;
      const recoveredActive = active?.type === 'point' && active?.id
        && this.state.resourcePoints[active.id]?.cooldownRemaining === 0
        && this.state.resourcePoints[active.id]?.cooldownTotal === 0;
      if (recoveredActive) this.sounds.playRecovery();
    }
  }

  runGameSimulation(dt) {
    if (dt <= 0 || this.state.gameOver || this.shouldFreezeGameTime()) return;
    const step = 200;
    let remaining = dt;
    while (remaining > 0 && !this.state.gameOver && !this.shouldFreezeGameTime()) {
      const chunk = Math.min(step, remaining);
      this.processCooldowns(chunk);
      this.processPointGatherAnims();
      this.processAutoProgress(chunk);
      this.processHouseConstruction(chunk);
      this.processToolDurability(chunk);
      this.processCalendar(chunk);
      remaining -= chunk;
    }
  }

  tickGame() {
    const now = Date.now();
    const frozen = this.shouldFreezeGameTime();
    const dt = Math.max(0, (now - this.lastTick) * (this.timeScale || this.devTimeScale || 1));
    // 冻结时仍刷新 lastTick，避免解冻瞬间一次性补算大段时间
    this.lastTick = now;
    // 填满动画按真实时间推进（不受暂停/加速影响）
    this.processPointGatherAnims();
    if (dt > 0 && !this.state.gameOver && !frozen) this.runGameSimulation(dt);
    // 跟手刷新 BGM：切轨前渐弱 + 过点立刻换轨（避免 setInterval 滞后导致满音切轨）
    try { this.sounds?.bgm?._tick?.(); } catch (_) { /* ignore */ }
    this.renderTick();
    this.renderGlobalStats();
    if (this.isTutorialActive()) {
      const step = this.getTutorialStep();
      const g = step ? (this.resolveTutorialGuidance(step) || step) : null;
      if (step && g && !g.requireNext && !g.finishOnNext && this.isTutorialStepComplete(step)) {
        this.render();
      } else {
        this.refreshTutorialProgressUI();
      }
    }
  }

  simulateTime(ms) {
    this._suppressSounds = true;
    this.runGameSimulation(ms);
    this._suppressSounds = false;
    // 开发者/离线快进若饿死人：结束后再弹一次汇总确认
    if (!this._suppressSounds) this.flushPendingStarvationAlert();
  }

  // ========== 科技解锁 ==========
  unlockTech(techId) {
    const tech = GAME_DATA.techTree.find(t => t.id === techId);
    if (!tech || !this.canUnlockTech(tech)) return;

    const cost = this.getTechCost(tech);
    if (!this.spend(cost)) return;

    this.state.unlockedTech.push(techId);

    if (tech.gateLevel) this.applyGateTechLevel(tech);

    if (techId === 'unlock_treasure_chest') this.state.starterChestRevealed = true;

    const newPointIds = [];
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (def.unlockRequires === techId) {
        this.unlockResourcePoint(id);
        newPointIds.push(id);
      }
    });
    const newRecipeIds = GAME_DATA.recipes
      .filter(r => r.requires === techId)
      .map(r => r.id);

    // 费用为 0 的子科技：父节点解锁后自动跟随
    const autoUnlocked = this._autoUnlockFreeTechs();
    autoUnlocked.forEach((t) => {
      Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
        if (def.unlockRequires === t.id && !newPointIds.includes(id)) {
          newPointIds.push(id);
        }
      });
    });

    if (!this._suppressSounds) this.sounds.playUnlock();
    // 不再弹出右上角解锁提醒

    // 工作台：开放合成/工具栏，并高亮已具备条件的配方（如开局工具制作）
    if (techId === 'unlock_workbench') {
      const openRecipeIds = GAME_DATA.recipes
        .filter(r => this.isRecipeTechUnlocked(r.id))
        .map(r => r.id);
      this.queueUnlockHighlights({ pointIds: newPointIds, recipeIds: openRecipeIds });
      this.flashWorkbenchTabs(openRecipeIds);
      // 砍够木头后再解锁工作台时，随即触发引导宝箱
      this.maybeGrantStarterChest();
    } else {
      this.queueUnlockHighlights({ pointIds: newPointIds, recipeIds: newRecipeIds });
    }

    this.render();
    this.scrollUnlockHighlightsIntoView();
    this.save();
  }

  /** 工作台解锁后强制开放并闪烁合成/工具/武器栏 */
  flashWorkbenchTabs(openRecipeIds = []) {
    if (!this._unlockFlash) {
      this._unlockFlash = {
        until: Date.now() + 2800,
        points: new Set(),
        recipes: new Set(openRecipeIds),
        sections: new Set(),
        tabs: new Set(['craft', 'tools', 'weapons']),
      };
      if (this._unlockFlashTimer) clearTimeout(this._unlockFlashTimer);
      this._unlockFlashTimer = setTimeout(() => {
        this._unlockFlash = null;
        this._unlockFlashTimer = null;
        document.querySelectorAll('.unlock-flash, .unlock-flash-menu, .flash-hint, .flash-hint-panel').forEach(el => {
          el.classList.remove('unlock-flash', 'unlock-flash-menu', 'flash-hint', 'flash-hint-panel');
        });
      }, 2800);
    } else {
      this._unlockFlash.tabs.add('craft');
      this._unlockFlash.tabs.add('tools');
      this._unlockFlash.tabs.add('weapons');
      openRecipeIds.forEach(id => this._unlockFlash.recipes.add(id));
    }
    // 只闪烁标签，不强制切页签
  }

  /** 新解锁采集点/制作项：高亮对应菜单与列表项约数秒 */
  queueUnlockHighlights({ pointIds = [], recipeIds = [] } = {}) {
    if (!pointIds.length && !recipeIds.length) return;

    const sections = new Set();
    const tabs = new Set();
    pointIds.forEach(id => {
      const def = GAME_DATA.resourcePoints[id];
      if (!def) return;
      sections.add(def.isFoodPoint ? 'forage' : 'gather');
    });
    recipeIds.forEach(id => {
      const recipe = GAME_DATA.recipes.find(r => r.id === id);
      if (!recipe) return;
      tabs.add(this.getRecipeSidebarTab(recipe));
    });

    this._unlockFlash = {
      until: Date.now() + 2800,
      points: new Set(pointIds),
      recipes: new Set(recipeIds),
      sections,
      tabs,
    };

    // 只闪烁标签，不强制切页签
    if (this._unlockFlashTimer) clearTimeout(this._unlockFlashTimer);
    this._unlockFlashTimer = setTimeout(() => {
      this._unlockFlash = null;
      this._unlockFlashTimer = null;
      document.querySelectorAll('.unlock-flash, .unlock-flash-menu, .flash-hint, .flash-hint-panel').forEach(el => {
        el.classList.remove('unlock-flash', 'unlock-flash-menu', 'flash-hint', 'flash-hint-panel');
      });
    }, 2800);
  }

  isUnlockFlashActive() {
    return !!(this._unlockFlash && Date.now() < this._unlockFlash.until);
  }

  shouldFlashUnlockPoint(pointId) {
    return this.isUnlockFlashActive() && this._unlockFlash.points.has(pointId);
  }

  shouldFlashUnlockRecipe(recipeId) {
    return this.isUnlockFlashActive() && this._unlockFlash.recipes.has(recipeId);
  }

  shouldFlashUnlockSection(section) {
    return this.isUnlockFlashActive() && this._unlockFlash.sections.has(section);
  }

  shouldFlashUnlockTab(tab) {
    return this.isUnlockFlashActive() && this._unlockFlash.tabs.has(tab);
  }

  scrollUnlockHighlightsIntoView() {
    if (!this.isUnlockFlashActive()) return;
    const flash = this._unlockFlash;
    const firstPoint = flash.points.values().next().value;
    if (firstPoint) {
      document
        .querySelector(`.station-btn[data-station-type="point"][data-station-id="${firstPoint}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    const firstRecipe = flash.recipes.values().next().value;
    if (firstRecipe) {
      document
        .querySelector(`.craft-overview-item[data-recipe-id="${firstRecipe}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  getPointUpgradeCostScale(pointId, type) {
    const pt = this.state.resourcePoints[pointId];
    if (!pt) return 1;
    const scale = pt.upgradeCostScale || { countCd: 1, refine: 1 };
    if (type === 'double') return scale.refine || 1;
    return scale.countCd || 1;
  }

  getPointBaseUpgradeCosts(pointId, type) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def) return [];
    if (def.isTreasureChest) return GAME_DATA.chestUpgradeCosts[type] || [];
    return def.upgradeCosts?.[type] || [];
  }

  getPointUpgradeCost(pointId, type, level = null) {
    if (type === 'efficiency') return this.getEfficiencyUpgradeCost(pointId, level);
    const costs = this.getPointBaseUpgradeCosts(pointId, type);
    const def = GAME_DATA.resourcePoints[pointId];
    const lv = level !== null ? level : this.getPointUpgradeLevel(pointId, type === 'double' ? 'refine' : type);
    const base = costs[lv];
    if (!base) return null;
    if (def?.isTreasureChest) return { ...base };

    const scale = this.getPointUpgradeCostScale(pointId, type);
    const sc = {};
    Object.keys(base).forEach((k) => {
      sc[k] = Math.max(1, Math.floor((base[k] || 0) * (scale || 1)));
    });
    return sc;
  }

  /** @deprecated 资源点升级已迁移至科技树 */
  canUpgradeRefine() {
    return false;
  }

  /** @deprecated 资源点升级已迁移至科技树 */
  canUpgradePoint() {
    return false;
  }

  /** @deprecated 精炼重置已移除 */
  canPrestigePoint() {
    return false;
  }

  /** @deprecated 精炼重置已移除 */
  prestigePoint() {}

  /** @deprecated 资源点升级已迁移至科技树 */
  upgradePoint() {}

  stationKey(type, id) {
    return `${type}:${id}`;
  }

  syncWorkerLayoutFromAssignments() {
    if (!this.state.workerLayout) this.state.workerLayout = {};
    this.getAllUnlockedStations().forEach(({ type, id }) => {
      if (type === 'recipe') return;
      const key = this.stationKey(type, id);
      this.state.workerLayout[key] = this.getStationState(type, id).assignedWorkers || 0;
    });
  }

  getWorkerLayoutCount(type, id) {
    if (type === 'recipe') return 0;
    const key = this.stationKey(type, id);
    if (this.state.workerLayout && this.state.workerLayout[key] !== undefined) {
      return this.state.workerLayout[key];
    }
    return this.getStationState(type, id).assignedWorkers || 0;
  }

  hasSavedWorkerLayout() {
    return Object.values(this.state.workerLayout || {}).some(n => n > 0);
  }

  recallAllWorkers() {
    this.syncWorkerLayoutFromAssignments();
    this.getAllUnlockedStations().forEach(({ type, id }) => {
      if (type !== 'recipe') {
        this.getStationState(type, id).assignedWorkers = 0;
      }
    });
    // 回收生产工人
    this.state.workers.craftWorkers = 0;
    this.state.workers.unassigned = this.state.workers.total;
    this.showNotification('已收回全部村民，分配方案已保留');
    this.render();
    this.save();
  }

  applyWorkerLayout() {
    if (!this.hasSavedWorkerLayout()) return;

    this.getAllUnlockedStations().forEach(({ type, id }) => {
      if (type !== 'recipe') this.getStationState(type, id).assignedWorkers = 0;
    });
    this.state.workers.unassigned = this.state.workers.total;

    this.getAllUnlockedStations().forEach(({ type, id }) => {
      if (type === 'recipe') return;
      const target = this.getWorkerLayoutCount(type, id);
      const st = this.getStationState(type, id);
      const cap = this.getStationWorkerCap(type, id);
      while (st.assignedWorkers < target && this.state.workers.unassigned > 0) {
        if (Number.isFinite(cap) && st.assignedWorkers >= cap) break;
        st.assignedWorkers++;
        this.state.workers.unassigned--;
      }
    });

    const assigned = this.state.workers.total - this.state.workers.unassigned;
    this.showNotification(`已恢复分配：${assigned} 名村民上岗`);
    this.render();
    this.save();
  }

  getTotalPlannedWorkers() {
    return Object.values(this.state.workerLayout || {}).reduce((sum, n) => sum + (n || 0), 0);
  }

  canIncreaseWorkerAllocation(type, id) {
    if (type === 'recipe' && id === '__global__') {
      return (this.state.workers.unassigned || 0) > 0;
    }
    // 采集点：只有真正有空闲村民才能增加，不能预占
    const st = this.getStationState(type, id);
    const cap = this.getStationWorkerCap(type, id);
    if (Number.isFinite(cap) && (st.assignedWorkers || 0) >= cap) return false;
    return (this.state.workers.unassigned || 0) > 0;
  }

  canDecreaseWorkerAllocation(type, id) {
    if (type === 'recipe' && id === '__global__') {
      return (this.state.workers?.craftWorkers || 0) > 0;
    }
    const st = this.getStationState(type, id);
    return (st.assignedWorkers || 0) > 0;
  }

  getBulkMultiplier(event) {
    return event?.ctrlKey ? 10 : 1;
  }

  changeWorkerAllocationStep(type, id, delta) {
    // 全局生产工人
    if (type === 'recipe' && id === '__global__') {
      const cw = this.state.workers?.craftWorkers || 0;
      if (delta > 0) {
        if (this.state.workers.unassigned > 0) {
          this.state.workers.craftWorkers = cw + 1;
          this.state.workers.unassigned--;
        } else {
          if (this.state.workers.total - (this.state.workers.unassigned || 0) < this.state.workers.total) {
            this.state.workers.craftWorkers = cw + 1;
          }
          return false;
        }
      } else {
        if (cw > 0) {
          this.state.workers.craftWorkers = cw - 1;
          this.state.workers.unassigned++;
        } else {
          return false;
        }
      }
      this.render();
      this.save();
      return true;
    }

    const st = this.getStationState(type, id);
    const key = this.stationKey(type, id);
    const cap = this.getStationWorkerCap(type, id);

    if (delta > 0) {
      if (Number.isFinite(cap) && (st.assignedWorkers || 0) >= cap) return false;
      if ((this.state.workers.unassigned || 0) > 0) {
        st.assignedWorkers = (st.assignedWorkers || 0) + 1;
        this.state.workers.unassigned--;
        if (this.state.workerLayout) this.state.workerLayout[key] = st.assignedWorkers;
        return true;
      }
      return false;
    }

    if (delta < 0) {
      if ((st.assignedWorkers || 0) > 0) {
        st.assignedWorkers--;
        this.state.workers.unassigned++;
        if (this.state.workerLayout) this.state.workerLayout[key] = st.assignedWorkers;
        return true;
      }
      return false;
    }
    return false;
  }

  changeWorkerAllocation(type, id, delta) {
    const steps = Math.abs(Math.floor(delta));
    if (!steps) return;
    const sign = delta > 0 ? 1 : -1;
    let changed = false;
    for (let i = 0; i < steps; i++) {
      if (!this.changeWorkerAllocationStep(type, id, sign)) break;
      changed = true;
    }
    if (!changed) return;
    this.render();
    this.save();
  }

  assignWorker(type, id, amount = 1) {
    this.changeWorkerAllocation(type, id, amount);
  }

  unassignWorker(type, id, amount = 1) {
    this.changeWorkerAllocation(type, id, -amount);
  }

  // ========== 游戏循环 ==========
  startGameLoop() {
    this.lastTick = Date.now();
    if (this._gameLoopStarted) return;
    this._gameLoopStarted = true;
    this._gameLoopTimer = setInterval(() => this.tickGame(), 100);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.tickGame();
    });
    setInterval(() => this.save(), 10000);
  }

  // ========== UI 事件 ==========
  setupEventListeners() {
    // 重置/失败后会再次走难度选择→resume，禁止重复绑定（否则点击会触发两次）
    if (this._eventListenersBound) return;
    this._eventListenersBound = true;
    this.setupGameMenu();
    this._setupTechTreeOverlayEvents();
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (!this.isTabUnlocked(tab)) return;
        this.state.activeTab = tab;
        // 科技树 → 全屏覆盖；其他 → 隐藏覆盖
        if (tab === 'tech') {
          this._showTechTreeOverlay();
        } else {
          this._hideTechTreeOverlay();
        }
        this.render();
      });
    });

    document.getElementById('defense-intro')?.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('#comic-skip')) return;
      this.advanceComicIntro();
    });
    document.getElementById('comic-skip')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dismissDefenseIntro();
    });
    document.getElementById('tutorial-skip')?.addEventListener('click', () => this.skipTutorial());
    document.getElementById('tutorial-next')?.addEventListener('click', () => this.advanceTutorialStep());

    document.getElementById('header-speed')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-speed]');
      if (!btn) return;
      const v = Number(btn.dataset.speed);
      if (![1, 2, 4].includes(v)) return;
      this.setTimeScale(v, { fromPlayer: true });
    });
    window.addEventListener('resize', () => {
      this.updateSpeedButtons();
      this.updateTutSpotlight();
    });
    this.setupTutSpotlightScrollSync();

    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+R → 开发者面板（放在最优先的位置，避免被其他代码异常阻挡）
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.toggleDevPanel();
        return;
      }
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      const cycle = [1, 2, 4];
      const idx = cycle.indexOf(this.timeScale);
      const next = cycle[(idx < 0 ? 0 : idx + 1) % cycle.length];
      this.setTimeScale(next, { fromPlayer: true });
    });

    this.setupSpaceRepeatClick();
    this.setupHoldClick();
    this.setupEventDelegation();
    this.setupDevPanel();
    document.getElementById('app').addEventListener('change', (e) => {
      if (e.target.classList.contains('craft-auto-produce')) {
        this.setAutoProduce(e.target.dataset.recipeId, e.target.checked);
        this.renderCraftOverview();
        this.renderTools();
      } else if (e.target.classList.contains('craft-auto-repair')) {
        this.setAutoRepair(e.target.dataset.recipeId, e.target.checked);
        this.renderCraftOverview();
        this.renderTools();
      } else if (e.target.classList.contains('craft-auto-mode')) {
        this.setAutoMode(e.target.dataset.recipeId, e.target.value);
        this.renderCraftOverview();
        this.renderTools();
      } else if (e.target.classList.contains('craft-auto-threshold')) {
        this.setAutoThreshold(e.target.dataset.recipeId, parseInt(e.target.value) || 10);
      } else if (e.target.classList.contains('craft-auto-repair-threshold')) {
        this.setAutoRepairThreshold(e.target.dataset.recipeId, parseInt(e.target.value) || 10);
      }
    });
    document.getElementById('app').addEventListener('input', (e) => {
      if (e.target.classList.contains('craft-auto-threshold')) {
        this.setAutoThreshold(e.target.dataset.recipeId, parseInt(e.target.value) || 10);
      } else if (e.target.classList.contains('craft-auto-repair-threshold')) {
        this.setAutoRepairThreshold(e.target.dataset.recipeId, parseInt(e.target.value) || 10);
      }
    });
  }

  stopMouseHold() {
    this.holdClicking = false;
    if (this.holdTimer) {
      clearInterval(this.holdTimer);
      this.holdTimer = null;
    }
  }

  stopSpaceHold() {
    this._spaceHolding = false;
    if (this._spaceHoldTimer) {
      clearInterval(this._spaceHoldTimer);
      this._spaceHoldTimer = null;
    }
  }

  /** 中间是否存在可交互的计数区（采集 / 订单加工 / 房屋建造） */
  hasActiveClickCountArea() {
    if (this._atMainMenu || this.isPauseMenuOpen?.()) return false;
    if (this.state.activeTab === 'tech' || this.state.activeTab === 'defense') return false;
    const el = document.getElementById('click-area');
    if (!el) return false;
    const { type, id } = this.state.activeStation || {};
    if (!type || !id) return false;
    return type === 'point' || type === 'recipe' || type === 'house';
  }

  /** 计数区仅因冷却而暂时点不动（空格应等待而非中断） */
  isClickCountAreaOnCooldown() {
    const { type, id } = this.state.activeStation || {};
    if (!type || !id) return false;
    if (type === 'recipe') {
      const queue = this.getCraftQueue(id);
      return !!(queue && queue.quantity > 0 && this.isRecipeTechUnlocked(id) && this.isOnCooldown('recipe', id));
    }
    if (type === 'point' || type === 'house') {
      return this.isStationUnlocked(type, id) && this.isOnCooldown(type, id);
    }
    return false;
  }

  performClickAreaAction() {
    const el = document.getElementById('click-area');
    if (!el || el.classList.contains('disabled')) return false;
    if (document.body.classList.contains('tut-interaction-lock')) {
      if (!el.classList.contains('tut-highlight') && !el.closest('.tut-highlight')) return false;
    }
    const { type, id } = this.state.activeStation || {};
    if (!type || !id) return false;
    if (type === 'recipe' || type === 'house') {
      if (!this.canManualCraftClick(type, id)) return false;
    } else if (!this.isStationUnlocked(type, id) || this.isOnCooldown(type, id)) {
      return false;
    }
    this.clickStation(type, id);
    return true;
  }

  startSpaceHold() {
    if (!this.hasActiveClickCountArea()) return;
    this.stopMouseHold();
    this.stopSpaceHold();
    this._spaceHolding = true;
    const tick = () => {
      if (!this._spaceHolding) return;
      if (!this.hasActiveClickCountArea()) {
        this.stopSpaceHold();
        return;
      }
      if (this.performClickAreaAction()) return;
      if (this.isClickCountAreaOnCooldown()) return;
      this.stopSpaceHold();
    };
    tick();
    this._spaceHoldTimer = setInterval(tick, this.getHoldClickCooldownMs());
  }

  /** 空格：有计数区则连点计数；否则无效（不再复读上次左键） */
  setupSpaceRepeatClick() {
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (!this.hasActiveClickCountArea()) return;
      e.preventDefault();
      if (e.repeat) return;
      this.startSpaceHold();
    });

    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      this.stopSpaceHold();
    });

    window.addEventListener('blur', () => this.stopSpaceHold());
  }

  setupGameMenu() {
    document.getElementById('game-over-reset')?.addEventListener('click', () => {
      this.reset({ skipConfirm: true });
    });
    document.getElementById('victory-reset')?.addEventListener('click', () => {
      this.reset({ skipConfirm: true });
    });

    this.setupPauseMenu();
  }

  // ========== 设置（显示 / 音量）==========
  getDefaultSettings() {
    return {
      displayMode: 'fullscreen',
      width: 1920,
      height: 1080,
      playBgm: true,
      masterVolume: 0.7,
      sfxVolume: 1,
      /** 新开局是否启动新手教程（默认开） */
      enableTutorial: true,
      /** 采集/开箱/生产完成时是否弹出下方资源获得提示（默认开） */
      resourceGainNotify: true,
    };
  }

  getDisplayResolutions() {
    return [
      { w: 1280, h: 720, label: '1280×720' },
      { w: 1366, h: 768, label: '1366×768' },
      { w: 1600, h: 900, label: '1600×900' },
      { w: 1920, h: 1080, label: '1920×1080' },
      { w: 2560, h: 1440, label: '2560×1440' },
      { w: 3840, h: 2160, label: '3840×2160' },
    ];
  }

  async loadSettings() {
    const defaults = this.getDefaultSettings();
    let raw = null;
    const api = this._saveApi();
    try {
      if (api?.settingsRead) raw = await api.settingsRead();
      if (!raw) raw = localStorage.getItem('clickTribeSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...defaults, ...parsed };
      } else {
        this.settings = { ...defaults };
      }
      // 缺省或非法值时默认开启 BGM
      if (typeof this.settings.playBgm !== 'boolean') this.settings.playBgm = true;
    } catch (_) {
      this.settings = { ...defaults };
    }
    await this.applySettings({ persist: false, applyDisplay: true });
  }

  async saveSettings() {
    if (!this.settings) this.settings = this.getDefaultSettings();
    const raw = JSON.stringify(this.settings);
    const api = this._saveApi();
    try {
      if (api?.settingsWrite) await api.settingsWrite(raw);
    } catch (e) {
      console.warn('[settings]', e);
    }
    try {
      localStorage.setItem('clickTribeSettings', raw);
    } catch (_) { /* ignore */ }
  }

  /**
   * @param {{ persist?: boolean, applyDisplay?: boolean }} [opts]
   */
  async applySettings(opts = {}) {
    if (!this.settings) this.settings = this.getDefaultSettings();
    const s = this.settings;
    this.sounds?.applyUserAudioSettings?.({
      playBgm: s.playBgm !== false,
      masterVolume: Number(s.masterVolume),
      sfxVolume: Number(s.sfxVolume),
    });
    if (opts.applyDisplay !== false) {
      const api = this._saveApi();
      if (api?.displaySet) {
        try {
          await api.displaySet({
            mode: s.displayMode === 'windowed' ? 'windowed' : 'fullscreen',
            width: s.width,
            height: s.height,
          });
        } catch (e) {
          console.warn('[display]', e);
        }
      }
    }
    if (opts.persist !== false) await this.saveSettings();
    if (this._atMainMenu) {
      if (s.playBgm !== false) this.startMenuBgm();
      else this.stopMenuBgm();
      this._updateMenuBgmNowLabel();
    } else {
      this.syncBgmNowPlayingUI();
    }
  }

  syncSettingsForm() {
    const s = this.settings || this.getDefaultSettings();
    const fillResSelect = (resSel) => {
      if (!resSel) return;
      if (!resSel.dataset.ready) {
        resSel.dataset.ready = '1';
        resSel.innerHTML = '';
        this.getDisplayResolutions().forEach((r) => {
          const opt = document.createElement('option');
          opt.value = `${r.w}x${r.h}`;
          opt.textContent = r.label;
          resSel.appendChild(opt);
        });
      }
      const key = `${s.width}x${s.height}`;
      const has = [...resSel.options].some((o) => o.value === key);
      if (!has) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${s.width}×${s.height}`;
        resSel.appendChild(opt);
      }
      resSel.value = key;
    };

    const modeSel = document.getElementById('set-display-mode');
    if (modeSel) modeSel.value = s.displayMode === 'windowed' ? 'windowed' : 'fullscreen';
    const mmMode = document.getElementById('mm-set-display-mode');
    if (mmMode) mmMode.value = s.displayMode === 'windowed' ? 'windowed' : 'fullscreen';

    fillResSelect(document.getElementById('set-display-res'));
    fillResSelect(document.getElementById('mm-set-display-res'));

    const hintText = this._saveApi()?.displaySet
      ? '全屏时分辨率选项仅在切回窗口化后生效。'
      : '浏览器打开时无法改窗口大小，设置仍会保存。';
    const hint = document.getElementById('pause-display-hint');
    if (hint) hint.textContent = hintText;
    const mmHint = document.getElementById('mm-pause-display-hint');
    if (mmHint) mmHint.textContent = hintText;

    const syncAudio = (bgmId, masterId, masterValId, sfxId, sfxValId) => {
      const bgm = document.getElementById(bgmId);
      if (bgm) bgm.checked = s.playBgm !== false;
      const master = document.getElementById(masterId);
      const masterVal = document.getElementById(masterValId);
      if (master) master.value = String(Math.round((s.masterVolume ?? 0.7) * 100));
      if (masterVal) masterVal.textContent = `${master?.value || 70}%`;
      const sfx = document.getElementById(sfxId);
      const sfxVal = document.getElementById(sfxValId);
      if (sfx) sfx.value = String(Math.round((s.sfxVolume ?? 1) * 100));
      if (sfxVal) sfxVal.textContent = `${sfx?.value || 100}%`;
    };
    syncAudio('set-bgm-enabled', 'set-vol-master', 'set-vol-master-val', 'set-vol-sfx', 'set-vol-sfx-val');
    syncAudio('mm-set-bgm-enabled', 'mm-set-vol-master', 'mm-set-vol-master-val', 'mm-set-vol-sfx', 'mm-set-vol-sfx-val');

    const tutOn = s.enableTutorial !== false;
    const tut = document.getElementById('set-enable-tutorial');
    if (tut) tut.checked = tutOn;
    const mmTut = document.getElementById('mm-set-enable-tutorial');
    if (mmTut) mmTut.checked = tutOn;

    const gainOn = s.resourceGainNotify !== false;
    const gain = document.getElementById('set-resource-gain-notify');
    if (gain) gain.checked = gainOn;
    const mmGain = document.getElementById('mm-set-resource-gain-notify');
    if (mmGain) mmGain.checked = gainOn;
  }

  setupPauseMenu() {
    const root = document.getElementById('pause-menu');
    if (!root || this._pauseMenuBound) return;
    this._pauseMenuBound = true;
    this.bindMenuUiSounds(root);

    const pages = [
      'pause-menu-home',
      'pause-menu-settings',
      'pause-menu-dev',
      'pause-menu-achievements',
    ];
    const showPage = (id) => {
      pages.forEach((pid) => {
        document.getElementById(pid)?.classList.toggle('hidden', pid !== id);
      });
      if (id === 'pause-menu-settings') {
        this.showSettingsTab(this._settingsTab || 'display');
        this.syncSettingsForm();
      }
      if (id === 'pause-menu-achievements') {
        this.renderAchievementsPanel();
      }
    };
    this._showPauseMenuPage = showPage;

    const showSettingsTab = (tab) => {
      const key = (tab === 'audio' || tab === 'game') ? tab : 'display';
      this._settingsTab = key;
      document.querySelectorAll('#pause-menu-settings [data-settings-tab]').forEach((btn) => {
        const on = btn.dataset.settingsTab === key;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('#pause-menu-settings [data-settings-pane]').forEach((pane) => {
        pane.classList.toggle('hidden', pane.dataset.settingsPane !== key);
      });
    };
    this.showSettingsTab = showSettingsTab;

    document.getElementById('pause-resume')?.addEventListener('click', () => {
      this.setPauseMenuOpen(false);
    });
    document.getElementById('pause-settings')?.addEventListener('click', () => {
      this._settingsTab = 'display';
      showPage('pause-menu-settings');
    });
    document.getElementById('pause-achievements')?.addEventListener('click', () => {
      void this.openAchievementsPanel();
    });
    document.getElementById('pause-achievements-back')?.addEventListener('click', () => {
      showPage('pause-menu-home');
    });
    document.getElementById('pause-settings-back')?.addEventListener('click', () => {
      showPage('pause-menu-home');
    });
    document.getElementById('set-reset-save')?.addEventListener('click', () => {
      this.setPauseMenuOpen(false);
      this.reset();
    });
    document.querySelectorAll('#pause-menu-settings [data-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showSettingsTab(btn.dataset.settingsTab);
        this.syncSettingsForm();
      });
    });
    document.getElementById('pause-dev')?.addEventListener('click', () => {
      showPage('pause-menu-dev');
    });
    document.getElementById('pause-dev-back')?.addEventListener('click', () => {
      showPage('pause-menu-home');
    });
    document.getElementById('pause-to-main')?.addEventListener('click', () => {
      void this.returnToMainMenu();
    });
    document.getElementById('pause-quit')?.addEventListener('click', () => {
      void this.quitApp();
    });

    document.getElementById('set-display-mode')?.addEventListener('change', (e) => {
      this.settings.displayMode = e.target.value === 'windowed' ? 'windowed' : 'fullscreen';
      void this.applySettings({ applyDisplay: true });
      this.syncSettingsForm();
    });
    document.getElementById('set-display-res')?.addEventListener('change', (e) => {
      const m = String(e.target.value || '').match(/^(\d+)x(\d+)$/i);
      if (!m) return;
      this.settings.width = Number(m[1]);
      this.settings.height = Number(m[2]);
      void this.applySettings({ applyDisplay: this.settings.displayMode === 'windowed' });
      this.syncSettingsForm();
    });
    document.getElementById('set-bgm-enabled')?.addEventListener('change', (e) => {
      this.settings.playBgm = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('set-vol-master')?.addEventListener('input', (e) => {
      const pct = Number(e.target.value) || 0;
      this.settings.masterVolume = Math.max(0, Math.min(1, pct / 100));
      const label = document.getElementById('set-vol-master-val');
      if (label) label.textContent = `${pct}%`;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('set-vol-sfx')?.addEventListener('input', (e) => {
      const pct = Number(e.target.value) || 0;
      this.settings.sfxVolume = Math.max(0, Math.min(1, pct / 100));
      const label = document.getElementById('set-vol-sfx-val');
      if (label) label.textContent = `${pct}%`;
      void this.applySettings({ applyDisplay: false });
    });
    document.getElementById('set-enable-tutorial')?.addEventListener('change', (e) => {
      this.settings.enableTutorial = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
      this.syncSettingsForm();
    });
    document.getElementById('set-resource-gain-notify')?.addEventListener('change', (e) => {
      this.settings.resourceGainNotify = !!e.target.checked;
      void this.applySettings({ applyDisplay: false });
      this.syncSettingsForm();
    });

    root.addEventListener('click', (e) => {
      if (e.target === root) this.setPauseMenuOpen(false);
    });
    this._showPauseMenuHome = () => showPage('pause-menu-home');
    this._showPauseMenuPage = showPage;
  }

  isPauseMenuOpen() {
    const el = document.getElementById('pause-menu');
    return !!(el && !el.classList.contains('hidden'));
  }

  setPauseMenuOpen(open) {
    const el = document.getElementById('pause-menu');
    if (!el) return;
    const show = !!open;
    const wasOpen = !el.classList.contains('hidden');
    el.classList.toggle('hidden', !show);
    if (show) {
      this._showPauseMenuHome?.();
      if (!this._pausedByMenu) {
        this._pausedByMenu = true;
        this._pauseMenuPrevPaused = !!this.paused;
      }
      this.paused = true;
      this.lastTick = Date.now();
      if (!wasOpen) this.sounds?.bgm?.setPauseDuck?.(true);
    } else if (this._pausedByMenu || wasOpen) {
      const restore = this._pauseMenuPrevPaused;
      this._pausedByMenu = false;
      this._pauseMenuPrevPaused = false;
      this._showPauseMenuHome?.();
      this.sounds?.bgm?.setPauseDuck?.(false);
      // 漫画/中转/主菜单仍冻结时不要误开时间
      if (restore || this._comicTimeHold || this._bootTransitionActive || this._atMainMenu || !this._inGameSession) {
        this.paused = true;
      } else {
        this.paused = false;
        this.lastTick = Date.now();
      }
    }
  }

  /** Esc：优先关掉上层弹层，否则开关暂停菜单 */
  handleGlobalEscape() {
    if (this._techEditMode) return;

    // 难度选择盖在主菜单之上，须优先于主菜单 Esc 分支处理
    const diffSel = document.getElementById('difficulty-select');
    if (this._pickingDifficulty || (diffSel && !diffSel.classList.contains('hidden'))) {
      this.cancelDifficultySelect();
      return;
    }

    if (this._atMainMenu) {
      const settings = document.getElementById('main-menu-settings');
      const dev = document.getElementById('main-menu-dev');
      const achPage = document.getElementById('main-menu-achievements');
      if (settings && !settings.classList.contains('hidden')) {
        this.showMainMenuHome();
        return;
      }
      if (dev && !dev.classList.contains('hidden')) {
        this.showMainMenuHome();
        return;
      }
      if (achPage && !achPage.classList.contains('hidden')) {
        this.showMainMenuHome();
        return;
      }
      return;
    }

    const picker = document.getElementById('dev-picker');
    if (picker && !picker.classList.contains('hidden')) {
      this.closeDevPicker();
      return;
    }
    const devPanel = document.getElementById('dev-panel');
    if (devPanel && !devPanel.classList.contains('hidden')) {
      this.toggleDevPanel(false);
      return;
    }
    const defenseHidden = document.getElementById('defense-overlay')?.classList.contains('hidden');
    if (!defenseHidden && this._selectedUnitIds?.size) {
      this._setFormationSelection?.([]);
      return;
    }
    const pauseOpen = this.isPauseMenuOpen();
    if (pauseOpen) {
      const settings = document.getElementById('pause-menu-settings');
      const dev = document.getElementById('pause-menu-dev');
      const achPage = document.getElementById('pause-menu-achievements');
      if (settings && !settings.classList.contains('hidden')) {
        this._showPauseMenuHome?.();
        return;
      }
      if (dev && !dev.classList.contains('hidden')) {
        this._showPauseMenuHome?.();
        return;
      }
      if (achPage && !achPage.classList.contains('hidden')) {
        this._showPauseMenuHome?.();
        return;
      }
    }
    this.setPauseMenuOpen(!pauseOpen);
  }

  // ========== Dev 后门 ==========
  setupDevPanel() {
    let overlay = document.getElementById('dev-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dev-overlay';
      overlay.className = 'dev-overlay hidden';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', () => this.toggleDevPanel(false));
    }
    this.devOverlay = overlay;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // 已在 setupMainMenu 全局绑定；此处保留兼容旧路径但不重复处理
        if (this._globalEscBound) return;
        this.handleGlobalEscape();
      }
    });

    document.getElementById('dev-close').addEventListener('click', () => this.toggleDevPanel(false));

    document.getElementById('dev-tech-edit')?.addEventListener('click', () => {
      this.enterTechTreeEditMode();
    });

    const scaleSlider = document.getElementById('dev-time-scale');
    const scaleLabel = document.getElementById('dev-time-label');
    if (scaleSlider) {
      scaleSlider.max = 200;
      scaleSlider.value = String(Math.min(200, Math.round(this.timeScale || 1)));
      scaleSlider.addEventListener('input', () => {
        this.setTimeScale(Number(scaleSlider.value), { fromDev: true });
        if (scaleLabel) scaleLabel.textContent = `${this.timeScale}×`;
      });
    }

    document.querySelectorAll('[data-time-scale]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.timeScale);
        if (scaleSlider) scaleSlider.value = String(v);
        this.setTimeScale(v, { fromDev: true });
        if (scaleLabel) scaleLabel.textContent = `${this.timeScale}×`;
      });
    });

    document.getElementById('dev-unlock-resources').addEventListener('click', () => this.showDevResourcePicker());
    document.getElementById('dev-unlock-stations').addEventListener('click', () => this.showDevStationPicker());
    document.getElementById('dev-unlock-tech').addEventListener('click', () => this.showDevTechPicker());
    document.getElementById('dev-add-all-100').addEventListener('click', () => this.devAddAllResources(100));
    document.getElementById('dev-add-all-1000').addEventListener('click', () => this.devAddAllResources(1000));
    document.getElementById('dev-add-tools-1')?.addEventListener('click', () => this.devAddAllGear(1, { combat: false }));
    document.getElementById('dev-add-weapons-1')?.addEventListener('click', () => this.devAddAllGear(1, { combat: true }));
    document.getElementById('dev-add-gear-10')?.addEventListener('click', () => this.devAddAllGear(10));
    document.getElementById('dev-workers-10').addEventListener('click', () => this.devAddWorkers(10));
    document.getElementById('dev-chest-1').addEventListener('click', () => this.devAddChests(1));
    document.getElementById('dev-chest-10').addEventListener('click', () => this.devAddChests(10));
    document.getElementById('dev-simulate-1h').addEventListener('click', () => {
      this.simulateTime(3600000);
      this.showNotification(`[Dev] 模拟推进 60 分钟`);
      this.render();
      this.save();
    });

    const setDevRaidCounts = (counts) => {
      const map = {
        bare: 'dev-raid-bare',
        sling: 'dev-raid-sling',
        raider: 'dev-raid-raider',
        ram: 'dev-raid-ram',
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.value = String(Math.max(0, Number(counts[key]) || 0));
      });
    };
    const readDevRaidCounts = () => ({
      bare: Number(document.getElementById('dev-raid-bare')?.value) || 0,
      sling: Number(document.getElementById('dev-raid-sling')?.value) || 0,
      raider: Number(document.getElementById('dev-raid-raider')?.value) || 0,
      ram: Number(document.getElementById('dev-raid-ram')?.value) || 0,
    });
    document.getElementById('dev-raid-preset-scout')?.addEventListener('click', () => {
      setDevRaidCounts({ bare: 6, sling: 0, raider: 0, ram: 0 });
    });
    document.getElementById('dev-raid-preset-raiders')?.addEventListener('click', () => {
      setDevRaidCounts({ bare: 8, sling: 3, raider: 0, ram: 0 });
    });
    document.getElementById('dev-raid-preset-warband')?.addEventListener('click', () => {
      setDevRaidCounts({ bare: 6, sling: 3, raider: 5, ram: 2 });
    });
    document.getElementById('dev-raid-start')?.addEventListener('click', () => {
      if (typeof this.startDevTestRaid === 'function') {
        this.startDevTestRaid(readDevRaidCounts());
      } else {
        this.showNotification('[Dev] 防务模块未加载');
      }
    });
    document.getElementById('dev-raid-end-win')?.addEventListener('click', () => {
      const d = this.ensureDefenseState?.();
      if (!d || d.raid?.phase !== 'combat') {
        this.showNotification('[Dev] 当前没有进行中的袭击');
        return;
      }
      this.endRaidCombat(true);
      this.render();
      this.save();
      this.showNotification('[Dev] 已强制胜利结束袭击');
    });
    document.getElementById('dev-raid-end-lose')?.addEventListener('click', () => {
      const d = this.ensureDefenseState?.();
      if (!d || d.raid?.phase !== 'combat') {
        this.showNotification('[Dev] 当前没有进行中的袭击');
        return;
      }
      this.endRaidCombat(false);
      this.render();
      this.save();
      this.showNotification('[Dev] 已强制战败结束袭击');
    });

    document.getElementById('dev-reset-game')?.addEventListener('click', () => {
      if (!confirm('确定要重置游戏吗？所有进度将丢失！')) return;
      const api = this._saveApi();
      if (api?.clear) void api.clear().catch(() => {});
      try { localStorage.removeItem('factoryGame'); } catch (_) { /* ignore */ }
      if (this.sounds.bgm) {
        this.sounds.bgm.stop();
        this.sounds.bgm = null;
      }
      this.state = this.getDefaultState();
      this.state.difficulty = 'normal';
      this.timeScale = 1;
      this.devTimeScale = 1;
      document.getElementById('game-over')?.classList.add('hidden');
      document.getElementById('victory-screen')?.classList.add('hidden');
      document.getElementById('story-dialog')?.classList.add('hidden');
      document.getElementById('defense-intro')?.classList.add('hidden');
      document.getElementById('battle-screen')?.classList.add('hidden');
      this.clearTutorialHighlights();
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      if (this.state.tutorial) {
        this.state.tutorial.completed = false;
        this.state.tutorial.skipped = false;
        this.state.tutorial.currentStep = 0;
        this.state.tutorial.defenseIntroClicked = false;
        this.state.tutorial.defenseStanceClicked = false;
      }
      this._starvationDialogOpen = false;
      this._pendingStarvationAlert = null;
      this._difficultyFromMainMenu = false;
      this.showDifficultySelect();
    });

    document.getElementById('dev-picker-close').addEventListener('click', () => this.closeDevPicker());
    document.getElementById('dev-picker').addEventListener('click', (e) => {
      if (e.target.id === 'dev-picker') this.closeDevPicker();
    });

    this.renderDevResourceList();
  }

  closeDevPicker() {
    document.getElementById('dev-picker').classList.add('hidden');
    this._devPickerOnAll = null;
  }

  openDevPicker(title, hint, items, onSelect, onSelectAll) {
    document.getElementById('dev-picker-title').textContent = title;
    document.getElementById('dev-picker-hint').textContent = hint;
    const list = document.getElementById('dev-picker-list');
    list.innerHTML = '';

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dev-picker-item ${item.unlocked ? 'unlocked' : ''} ${item.next ? 'next' : ''}`;
      btn.disabled = item.disabled;
      btn.innerHTML = `
        <span class="dev-picker-item-label">${item.icon || ''} ${item.label}</span>
        <span class="dev-picker-item-status">${item.status || ''}</span>
      `;
      if (!item.disabled && !item.unlocked) {
        btn.addEventListener('click', () => {
          onSelect(item.id);
          this.closeDevPicker();
        });
      }
      list.appendChild(btn);
    });

    const allBtn = document.getElementById('dev-picker-all');
    allBtn.onclick = () => {
      onSelectAll();
      this.closeDevPicker();
    };

    document.getElementById('dev-picker').classList.remove('hidden');
  }

  showDevResourcePicker() {
    const items = Object.entries(GAME_DATA.resources).map(([id, def]) => {
      const discovered = this.isResourceDiscovered(id);
      return {
        id,
        icon: def.icon,
        label: def.name,
        unlocked: discovered,
        disabled: discovered,
        status: discovered ? '已解锁' : '点击解锁',
      };
    });

    this.openDevPicker(
      '解锁资源类型',
      '选择要发现的资源类型，或点击下方全部解锁',
      items,
      (id) => this.devUnlockResourceSingle(id),
      () => this.devUnlockAllResources()
    );
  }

  showDevTechPicker() {
    const nextIndex = this.getNextDevTechIndex();
    const items = GAME_DATA.techTree.map((tech, index) => {
      const done = this.isTechSlotComplete(index);

      return {
        id: tech.id,
        icon: tech.icon,
        label: (() => {
          const times = this.state.unlockedTech.filter(t => t === tech.id).length;
          if (tech.repeatable && tech.maxRepeat) {
            return `${tech.name} ${this.formatUpgradeLevel(times, tech.maxRepeat)}`;
          }
          return tech.name;
        })(),
        unlocked: done,
        disabled: !done && index !== nextIndex,
        next: index === nextIndex,
        status: done
          ? (tech.repeatable && tech.maxRepeat
            ? this.formatUpgradeLevel(
              this.state.unlockedTech.filter(t => t === tech.id).length,
              tech.maxRepeat
            )
            : '已解锁')
          : index === nextIndex ? '可解锁' : '等待中',
      };
    });

    this.openDevPicker(
      '解锁科技',
      '按前置依赖解锁；可重复科技会升到满级。也可点「全部解锁」',
      items,
      (id) => {
        const idx = GAME_DATA.techTree.findIndex(t => t.id === id);
        if (idx === this.getNextDevTechIndex()) this.devApplyTechUnlock(id);
      },
      () => this.devUnlockAllTechInOrder()
    );
  }

  showDevStationPicker() {
    const nextIndex = this.getNextDevStationIndex();
    const items = DEV_STATION_ORDER.map((entry, index) => {
      const def = entry.type === 'point'
        ? GAME_DATA.resourcePoints[entry.id]
        : GAME_DATA.recipes.find(r => r.id === entry.id);
      const unlocked = entry.type === 'point'
        ? this.state.resourcePoints[entry.id]?.unlocked
        : this.isRecipeTechUnlocked(entry.id);
      const chestStock = def?.isTreasureChest
        ? (this.state.resourcePoints[entry.id]?.stock || 0)
        : null;

      return {
        id: `${entry.type}:${entry.id}`,
        icon: def?.icon || '',
        label: def?.name || entry.id,
        unlocked,
        disabled: !unlocked && index !== nextIndex,
        next: index === nextIndex,
        status: unlocked
          ? (chestStock != null ? `已解锁 · 库存 ${chestStock}` : '已解锁')
          : index === nextIndex ? '可解锁' : '等待中',
      };
    });

    this.openDevPicker(
      '解锁站点',
      '须按游戏进度顺序解锁，当前仅高亮项可点击；解锁宝箱会送 1 个库存',
      items,
      (key) => {
        const idx = DEV_STATION_ORDER.findIndex(e => `${e.type}:${e.id}` === key);
        if (idx === this.getNextDevStationIndex()) {
          const [type, id] = key.split(':');
          this.devUnlockStationSingle(type, id);
        }
      },
      () => this.devUnlockAllStationsInOrder()
    );
  }

  isTechSlotComplete(index) {
    const tech = GAME_DATA.techTree[index];
    if (!tech) return true;
    const times = this.state.unlockedTech.filter(t => t === tech.id).length;
    if (tech.repeatable && tech.maxRepeat) return times >= tech.maxRepeat;
    if (tech.gateLevel) {
      const lv = this.ensureDefenseState().gate?.level || 1;
      return times > 0 || lv >= tech.gateLevel;
    }
    return times > 0;
  }

  /**
   * 开发者面板：下一项可解锁科技（按前置依赖，而非 techTree 数组下标）
   */
  getNextDevTechIndex() {
    return GAME_DATA.techTree.findIndex((tech, index) => {
      if (this.isTechSlotComplete(index)) return false;
      if (tech.requires && !this._areTechRequirementsMet(tech)) return false;
      if (!this._arePointLevelRequirementsMet(tech)) return false;
      if (!this._canUnlockGateTech(tech)) return false;
      return true;
    });
  }

  canDevUnlockTechAt(index) {
    return index === this.getNextDevTechIndex();
  }

  getNextDevStationIndex() {
    return DEV_STATION_ORDER.findIndex((_, i) => this.canDevUnlockStationAt(i));
  }

  canDevUnlockStationAt(index) {
    const entry = DEV_STATION_ORDER[index];
    if (!entry) return false;

    const unlocked = entry.type === 'point'
      ? this.state.resourcePoints[entry.id]?.unlocked
      : this.isRecipeTechUnlocked(entry.id);
    if (unlocked) return false;

    if (index > 0) {
      const prev = DEV_STATION_ORDER[index - 1];
      const prevUnlocked = prev.type === 'point'
        ? this.state.resourcePoints[prev.id]?.unlocked
        : this.isRecipeTechUnlocked(prev.id);
      if (!prevUnlocked) return false;
    }

    // 开发者面板按站点顺序解锁时会自动补对应科技，此处不再卡科技门
    return true;
  }

  devApplyTechUnlock(techId) {
    const index = GAME_DATA.techTree.findIndex(t => t.id === techId);
    if (index < 0 || !this.canDevUnlockTechAt(index)) return;

    const tech = GAME_DATA.techTree[index];
    this.state.unlockedTech.push(techId);

    if (tech.gateLevel) this.applyGateTechLevel(tech);
    if (techId === 'unlock_treasure_chest') this.state.starterChestRevealed = true;

    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (def.unlockRequires === techId) this.unlockResourcePoint(id);
    });

    this.showNotification(`[Dev] 解锁科技：${tech.name}`);
    this.render();
    this.save();
  }

  devUnlockAllTechInOrder() {
    let count = 0;
    const safetyMax = GAME_DATA.techTree.reduce((s, t) => s + (t.maxRepeat || 1), 0) + 50;
    let safety = 0;
    while (safety < safetyMax) {
      const idx = this.getNextDevTechIndex();
      if (idx < 0) break;
      this.devApplyTechUnlock(GAME_DATA.techTree[idx].id);
      count++;
      safety++;
    }
    this.showNotification(`[Dev] 按依赖顺序解锁了 ${count} 项科技`);
    this.closeDevPicker?.();
    this.render();
    this.save();
  }

  devUnlockResourceSingle(resId) {
    if ((this.state.resources[resId] || 0) < 1) this.state.resources[resId] = 1;
    const name = GAME_DATA.resources[resId]?.name || resId;
    this.showNotification(`[Dev] 解锁资源：${name}`);
    this.renderDevResourceList();
    this.render();
    this.save();
  }

  devUnlockAllResources() {
    Object.keys(GAME_DATA.resources).forEach(id => {
      if ((this.state.resources[id] || 0) < 1) this.state.resources[id] = 1;
    });
    this.showNotification('[Dev] 已解锁全部资源类型');
    this.renderDevResourceList();
    this.render();
    this.save();
  }

  devUnlockStationSingle(type, id) {
    const index = DEV_STATION_ORDER.findIndex(e => e.type === type && e.id === id);
    if (index < 0 || !this.canDevUnlockStationAt(index)) return;

    if (type === 'point') {
      const def = GAME_DATA.resourcePoints[id];
      if (def?.unlockRequires && !this.isTechUnlocked(def.unlockRequires)) {
        this.state.unlockedTech.push(def.unlockRequires);
      }
      this.unlockResourcePoint(id);
      if (def?.isTreasureChest) {
        const pt = this.state.resourcePoints[id];
        if (pt) pt.stock = (pt.stock || 0) + 1;
        this.state.starterChestRevealed = true;
      }
    } else {
      const recipe = GAME_DATA.recipes.find(r => r.id === id);
      if (recipe?.requires && !this.isTechUnlocked(recipe.requires)) {
        this.state.unlockedTech.push(recipe.requires);
      }
    }

    const def = type === 'point' ? GAME_DATA.resourcePoints[id] : GAME_DATA.recipes.find(r => r.id === id);
    this.showNotification(`[Dev] 解锁站点：${def?.name || id}`);
    this.render();
    this.save();
  }

  /** 开发者：增加可开启的宝箱库存（必要时自动解锁宝箱点） */
  devAddChests(amount = 1) {
    const n = Math.max(1, Math.floor(Number(amount) || 1));
    if (!this.isTechUnlocked('unlock_treasure_chest')) {
      this.state.unlockedTech.push('unlock_treasure_chest');
    }
    this.unlockResourcePoint('treasure_chest');
    this.state.starterChestRevealed = true;
    const pt = this.state.resourcePoints.treasure_chest;
    if (!pt) return;
    pt.stock = (pt.stock || 0) + n;
    // 开发者添加宝箱也立即生成奖励冻结
    if (!Array.isArray(pt._pendingDrops)) pt._pendingDrops = [];
    for (let i = 0; i < n; i++) {
      pt._pendingDrops.push(this.rollChestRewards());
    }
    this.showNotification(`[Dev] 宝箱 +${n}（当前库存 ${pt.stock}）`);
    this.render();
    this.save();
  }

  devUnlockAllStationsInOrder() {
    let count = 0;
    let safety = 0;
    while (safety < 50) {
      const idx = this.getNextDevStationIndex();
      if (idx < 0) break;
      const entry = DEV_STATION_ORDER[idx];
      this.devUnlockStationSingle(entry.type, entry.id);
      count++;
      safety++;
    }
    this.showNotification(`[Dev] 按顺序解锁了 ${count} 个站点`);
    this.render();
    this.save();
  }

  toggleDevPanel(force) {
    const panel = document.getElementById('dev-panel');
    const show = force !== undefined ? force : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !show);
    this.devOverlay.classList.toggle('hidden', !show);
    if (show) this.renderDevResourceList();
  }

  setDevTimeScale(scale) {
    this.setTimeScale(scale, { fromDev: true });
  }

  /**
   * @param {number} scale
   * @param {{ fromPlayer?: boolean, fromDev?: boolean, silent?: boolean }} [opts]
   */
  setTimeScale(scale, opts = {}) {
    const raw = Number(scale);
    if (!Number.isFinite(raw)) return;

    if (opts.fromPlayer) {
      if (![1, 2, 4].includes(raw)) return;
      this.timeScale = raw;
      this.state.playerTimeScale = raw;
      if (!opts.silent && raw > 1 && !this.state.speedTipSeen) {
        this.state.speedTipSeen = true;
        this.showNotification('⏱ 时间加速：村民自动工作与昼夜会加快，手动点击的单次收益不变');
      }
      if (!opts.silent) this.save();
    } else {
      this.timeScale = Math.max(1, Math.min(200, Math.round(raw)));
    }
    this.devTimeScale = this.timeScale;
    this.updateSpeedButtons();
    this.syncDevTimeScaleUI();
    try { this.sounds?.bgm?._startUpdateTimer?.(); } catch (_) { /* ignore */ }
  }

  updateSpeedButtons() {
    const wrap = document.getElementById('header-speed');
    const thumb = document.getElementById('speed-thumb');
    if (!wrap) return;

    const cur = [1, 2, 4].includes(this.timeScale) ? this.timeScale : 0;
    wrap.classList.toggle('is-dev-speed', cur === 0 && (this.timeScale || 1) > 1);

    let activeBtn = null;
    wrap.querySelectorAll('[data-speed]').forEach(btn => {
      const v = Number(btn.dataset.speed);
      const on = cur === v;
      btn.classList.toggle('active', on);
      if (on) activeBtn = btn;
    });

    if (!thumb) return;
    if (!activeBtn) {
      // 开发者超高倍速时，滑块停在最右侧并略透明
      const last = wrap.querySelector('[data-speed="4"]') || wrap.querySelector('[data-speed]');
      if (!last) return;
      const wr = wrap.getBoundingClientRect();
      const br = last.getBoundingClientRect();
      thumb.style.width = `${br.width}px`;
      thumb.style.transform = `translateX(${br.left - wr.left - 3}px)`;
      return;
    }

    const wr = wrap.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    thumb.style.width = `${br.width}px`;
    thumb.style.transform = `translateX(${br.left - wr.left - 3}px)`;
  }

  syncDevTimeScaleUI() {
    const scaleSlider = document.getElementById('dev-time-scale');
    const scaleLabel = document.getElementById('dev-time-label');
    if (scaleSlider) {
      const v = Math.max(1, Math.min(200, Math.round(this.timeScale || 1)));
      scaleSlider.max = 200;
      scaleSlider.value = String(v);
    }
    if (scaleLabel) scaleLabel.textContent = `${this.timeScale || 1}×`;
  }

  renderDevResourceList() {
    const container = document.getElementById('dev-resource-list');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(GAME_DATA.resources).forEach(([id, def]) => {
      const row = document.createElement('div');
      row.className = 'dev-resource-row';
      row.innerHTML = `
        <span class="res-label">${def.icon} ${def.name}</span>
        <input type="number" class="dev-res-input" data-res="${id}" value="${this.state.resources[id] || 0}" min="0">
        <button class="dev-btn dev-add-btn" data-res="${id}" data-add="100">+100</button>
        <button class="dev-btn dev-add-btn" data-res="${id}" data-add="1000">+1K</button>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll('.dev-res-input').forEach(input => {
      input.addEventListener('change', () => {
        const res = input.dataset.res;
        this.state.resources[res] = Math.max(0, Number(input.value) || 0);
        this.checkAchievements();
        this.render();
        this.save();
      });
    });

    container.querySelectorAll('.dev-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = btn.dataset.res;
        const add = Number(btn.dataset.add);
        this.state.resources[res] = (this.state.resources[res] || 0) + add;
        this.checkAchievements();
        this.renderDevResourceList();
        this.render();
        this.save();
      });
    });

    this.renderDevToolList();
  }

  renderDevToolList() {
    const container = document.getElementById('dev-tool-list');
    if (!container) return;
    container.innerHTML = '';

    const tools = Object.values(GAME_DATA.villagerTools || {});
    const gather = tools.filter((t) => !t.combat);
    const combat = tools.filter((t) => !!t.combat);

    const appendGroup = (title, list) => {
      if (!list.length) return;
      const head = document.createElement('div');
      head.className = 'dev-tool-group-title';
      head.textContent = title;
      container.appendChild(head);
      list.forEach((def) => {
        const maxLv = def.maxLevel || 4;
        for (let lv = 1; lv <= maxLv; lv++) {
          const row = document.createElement('div');
          row.className = 'dev-resource-row';
          const label = this.formatToolLabel(def.id, lv);
          const count = this.getToolCount(def.id, lv);
          row.innerHTML = `
            <span class="res-label tool-label">${label}</span>
            <input type="number" class="dev-tool-input" data-tool="${def.id}" data-level="${lv}" value="${count}" min="0" step="1">
            <button class="dev-btn dev-add-btn dev-tool-add" data-tool="${def.id}" data-level="${lv}" data-add="1">+1</button>
            <button class="dev-btn dev-add-btn dev-tool-add" data-tool="${def.id}" data-level="${lv}" data-add="10">+10</button>
          `;
          container.appendChild(row);
        }
      });
    };

    appendGroup('采集工具', gather);
    appendGroup('武器 / 防具', combat);

    container.querySelectorAll('.dev-tool-input').forEach((input) => {
      input.addEventListener('change', () => {
        const toolId = input.dataset.tool;
        const level = Number(input.dataset.level);
        this.setToolCount(toolId, level, Math.max(0, Number(input.value) || 0));
        this.checkAchievements();
        this.render();
        this.save();
      });
    });

    container.querySelectorAll('.dev-tool-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolId = btn.dataset.tool;
        const level = Number(btn.dataset.level);
        const add = Number(btn.dataset.add) || 1;
        this.addTool(toolId, add, level);
        this.renderDevToolList();
        this.render();
        this.save();
      });
    });
  }

  /** @param {{ combat?: boolean }} [filter] combat=true 仅武器防具；false 仅采集工具；省略=全部 */
  devAddAllGear(amount, filter = {}) {
    const n = Math.max(0, Math.floor(amount) || 0);
    if (!n) return;
    Object.values(GAME_DATA.villagerTools || {}).forEach((def) => {
      if (filter.combat === true && !def.combat) return;
      if (filter.combat === false && def.combat) return;
      const maxLv = def.maxLevel || 4;
      for (let lv = 1; lv <= maxLv; lv++) this.addTool(def.id, n, lv);
    });
    const label = filter.combat === true
      ? '武器/防具'
      : (filter.combat === false ? '采集工具' : '全部装备');
    this.showNotification(`[Dev] ${label} 各等级 +${n}`);
    this.renderDevToolList();
    this.render();
    this.save();
  }

  devAddAllResources(amount) {
    Object.keys(GAME_DATA.resources).forEach(id => {
      this.state.resources[id] = (this.state.resources[id] || 0) + amount;
    });
    this.checkAchievements();
    this.showNotification(`[Dev] 全部资源 +${amount}`);
    this.renderDevResourceList();
    this.render();
    this.save();
  }

  devAddWorkers(n) {
    this.state.workers.total += n;
    this.state.workers.unassigned += n;
    this.checkAchievements();
    this.showNotification(`[Dev] 工人 +${n}`);
    this.render();
    this.save();
  }

  setupEventDelegation() {
    document.getElementById('app').addEventListener('click', (e) => {
      const unlockBtn = e.target.closest('.btn-unlock');
      if (unlockBtn) {
        e.stopPropagation();
        const item = unlockBtn.closest('[data-tech-id]');
        if (item) this.unlockTech(item.dataset.techId);
        return;
      }

      const upgradeBtn = e.target.closest('.btn-upgrade');
      if (upgradeBtn && !upgradeBtn.disabled) {
        const mult = this.getBulkMultiplier(e);
        if (upgradeBtn.classList.contains('btn-upgrade-house')) {
          const level = Number(upgradeBtn.dataset.houseLevel);
          if (Number.isFinite(level)) {
            const house = this.getHousesByLevel(level)[0];
            if (house) this.upgradeHouse(house.id);
          } else if (upgradeBtn.dataset.houseId) {
            this.upgradeHouse(upgradeBtn.dataset.houseId);
          }
          return;
        }
        const upgItem = upgradeBtn.closest('[data-point-id][data-upgrade-type]');
        if (upgItem) return;
      }

      const buildHouseBtn = e.target.closest('.btn-build-house');
      if (buildHouseBtn && !buildHouseBtn.disabled) {
        this.buildHouse();
        return;
      }

      const buildExtraPointBtn = e.target.closest('.btn-build-extra-point');
      if (buildExtraPointBtn && !buildExtraPointBtn.disabled) {
        this.buildExtraPoint(buildExtraPointBtn.dataset.pointId);
        return;
      }

      const breedBtn = e.target.closest('.btn-breed-villager');
      if (breedBtn && !breedBtn.disabled) {
        this.breedVillager(this.getBulkMultiplier(e));
        return;
      }

      const stationBtn = e.target.closest('.station-btn');
      if (stationBtn) {
        // 如果当前在科技树或防务界面，点击左侧站点先切换标签
        this._hideTechTreeOverlay();
        this._hideDefenseOverlay();
        if (this.state.activeTab === 'tech' || this.state.activeTab === 'defense') {
          this.state.activeTab = 'warehouse';
        }
        this.setActiveStation(stationBtn.dataset.stationType, stationBtn.dataset.stationId);
        return;
      }

      const sectionToggle = e.target.closest('.section-title-toggle');
      if (sectionToggle) {
        this.toggleSidebarSection(sectionToggle.dataset.section);
        return;
      }

      const assignBtn = e.target.closest('.btn-worker-assign');
      if (assignBtn && !assignBtn.disabled) {
        const mult = this.getBulkMultiplier(e);
        this.assignWorker(assignBtn.dataset.stationType, assignBtn.dataset.stationId, mult);
        if (
          !!assignBtn.closest('#worker-overview')
          && this.isTutorialActive()
          && mult > 0
          && assignBtn.dataset.stationId === 'berry_bush'
        ) {
          this.state.tutorial.workerListAssigned = true;
        }
        return;
      }

      const unassignBtn = e.target.closest('.btn-worker-unassign');
      if (unassignBtn && !unassignBtn.disabled) {
        const mult = this.getBulkMultiplier(e);
        this.unassignWorker(unassignBtn.dataset.stationType, unassignBtn.dataset.stationId, mult);
        return;
      }

      const recallBtn = e.target.closest('#recall-all-workers');
      if (recallBtn && !recallBtn.disabled) {
        this.recallAllWorkers();
        return;
      }

      const applyLayoutBtn = e.target.closest('#apply-worker-layout');
      if (applyLayoutBtn && !applyLayoutBtn.disabled) {
        this.applyWorkerLayout();
        return;
      }

      const gotoWorkerStation = e.target.closest('.worker-station-goto');
      if (gotoWorkerStation) {
        this.setActiveStation(gotoWorkerStation.dataset.stationType, gotoWorkerStation.dataset.stationId);
        return;
      }

      const repairAllBtn = e.target.closest('.btn-repair-all-tools');
      if (repairAllBtn) {
        this.repairAllTools(repairAllBtn.dataset.toolId, Number(repairAllBtn.dataset.toolLevel));
        return;
      }

      const repairToolBtn = e.target.closest('.btn-repair-tool');
      if (repairToolBtn && !repairToolBtn.disabled) {
        this.repairAllTools(repairToolBtn.dataset.toolId, Number(repairToolBtn.dataset.toolLevel));
        return;
      }

      const produceConfirmBtn = e.target.closest('.btn-craft-produce-confirm');
      if (produceConfirmBtn && !produceConfirmBtn.disabled) {
        const item = produceConfirmBtn.closest('[data-recipe-id]');
        const input = item?.querySelector('.craft-produce-input');
        const count = Math.max(1, parseInt(input?.value, 10) || 1) * this.getBulkMultiplier(e);
        this.placeCraftOrder(produceConfirmBtn.dataset.recipeId, count);
        return;
      }

      const cancelOrderBtn = e.target.closest('.btn-cancel-order');
      if (cancelOrderBtn) {
        const orderId = parseInt(cancelOrderBtn.dataset.orderId);
        this.cancelCraftOrder(orderId);
        return;
      }

      const moveUpBtn = e.target.closest('.btn-move-order-up');
      if (moveUpBtn) {
        this.moveCraftOrder(parseInt(moveUpBtn.dataset.orderId), -1);
        return;
      }

      const moveDownBtn = e.target.closest('.btn-move-order-down');
      if (moveDownBtn) {
        this.moveCraftOrder(parseInt(moveDownBtn.dataset.orderId), 1);
        return;
      }

      const moveTopBtn = e.target.closest('.btn-move-order-top');
      if (moveTopBtn) {
        this.moveCraftOrder(parseInt(moveTopBtn.dataset.orderId), 0);
        return;
      }

      const craftOrderBtn = e.target.closest('.craft-order-btn');
      if (craftOrderBtn) {
        this.setActiveStation(craftOrderBtn.dataset.stationType, craftOrderBtn.dataset.stationId);
        return;
      }

      const gotoBtn = e.target.closest('.station-goto-btn');
      if (gotoBtn) {
        this.setActiveStation(gotoBtn.dataset.stationType, gotoBtn.dataset.stationId);
      }
    });
  }

  setupHoldClick() {
    const area = document.getElementById('click-area');
    const tryClick = () => {
      const { type, id } = this.state.activeStation || {};
      if (!type || !id) {
        this.stopMouseHold();
        return false;
      }
      if (type === 'recipe' || type === 'house') {
        // 冷却中：跳过本拍，保持按住，恢复后继续连点
        if (type === 'recipe' && this.isOnCooldown('recipe', id)) {
          const queue = this.getCraftQueue(id);
          if (queue && queue.quantity > 0 && this.isRecipeTechUnlocked(id)) return true;
        }
        if (!this.canManualCraftClick(type, id)) {
          this.stopMouseHold();
          return false;
        }
      } else if (!this.isStationUnlocked(type, id)) {
        this.stopMouseHold();
        return false;
      } else if (this.isOnCooldown(type, id)) {
        return true;
      }
      this.clickStation(type, id);
      return true;
    };
    const startHold = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const { type, id } = this.state.activeStation || {};
      if (!type || !id) return;
      if (type === 'recipe' || type === 'house') {
        if (type === 'recipe') {
          if (!this.isRecipeTechUnlocked(id)) return;
          const queue = this.getCraftQueue(id);
          if (!queue || queue.quantity <= 0) return;
        } else if (!this.isStationUnlocked(type, id)) {
          return;
        }
      } else if (!this.isStationUnlocked(type, id)) {
        return;
      }
      e.preventDefault();
      this.stopSpaceHold();
      this.stopMouseHold();
      this.holdClicking = true;
      tryClick();
      this.holdTimer = setInterval(() => {
        if (!this.holdClicking) return this.stopMouseHold();
        if (!tryClick()) this.stopMouseHold();
      }, this.getHoldClickCooldownMs());
    };
    area.addEventListener('mousedown', startHold);
    area.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(e); }, { passive: false });
    document.addEventListener('mouseup', () => this.stopMouseHold());
    document.addEventListener('touchend', () => this.stopMouseHold());
    document.addEventListener('touchcancel', () => this.stopMouseHold());
    area.addEventListener('mouseleave', () => this.stopMouseHold());
  }

  showNotification(msg) {
    const el = document.getElementById('notification');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  /** 资源获得类底部提示（受设置「资源获得提示」控制，默认开启） */
  showResourceGainNotification(msg) {
    if (this.settings?.resourceGainNotify === false) return;
    this.showNotification(msg);
  }

  /** 按视口相对设计基准同步缩小字号（不用 zoom，避免非全屏裁切） */
  updateUiScale() {
    const refW = 1440;
    const refH = 860;
    const raw = Math.min(window.innerWidth / refW, window.innerHeight / refH, 1);
    const scale = Math.max(0.72, raw);
    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(4));
  }

  /** 解锁提示贴在右侧页签栏（入口）左侧，不挡导航 */
  updateUnlockToastPosition() {
    const nav = document.querySelector('.right-nav');
    const container = document.getElementById('unlock-toast-container');
    if (!container) return;

    const width = 200;
    const gap = 8;

    if (nav) {
      const rect = nav.getBoundingClientRect();
      // 紧贴右侧入口栏左侧
      const left = Math.max(8, rect.left - gap - width);
      container.style.left = `${left}px`;
      container.style.right = 'auto';
      container.style.top = `${Math.max(8, rect.top)}px`;
      return;
    }

    // 回退：贴屏幕右侧
    container.style.left = 'auto';
    container.style.right = '12px';
    const header = document.querySelector('.game-header');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 72;
    container.style.top = `${headerBottom + 8}px`;
  }

  showUnlockToast(tech, newlyVisibleIds, newResourcePoints) {
    this.updateUnlockToastPosition();
    const container = document.getElementById('unlock-toast-container');
    const toast = document.createElement('div');
    toast.className = 'unlock-toast';
    const extras = [];
    newResourcePoints.forEach(def => extras.push(`${def.icon} 新资源点：${def.name}`));
    newlyVisibleIds.forEach(tid => {
      const t = GAME_DATA.techTree.find(x => x.id === tid);
      if (t) extras.push(`${t.icon} 新科技：${t.name}`);
    });
    GAME_DATA.recipes.forEach(r => {
      if (r.requires === tech.id) {
        const where = r.isToolRecipe
          ? (this.getRecipeSidebarTab(r) === 'weapons' ? '武器页' : '工具页')
          : '合成页';
        extras.push(`${r.icon} 配方已解锁：${r.name}（前往${where}安排生产）`);
      }
    });
    if (tech.id === 'unlock_furnace_upgrade') extras.push('🔥 熔炉配方计数值减半');
    if (tech.id === 'unlock_workbench') {
      extras.push('🔨 开放合成、工具与武器栏；各级工具/武器需另解锁对应科技（木质工具开局已有）');
    }
    if (tech.id === 'unlock_plank_craft') {
      extras.push('🟫 配方已解锁：制作木板（前往合成页安排生产）');
    }
    if (/^unlock_house_upgrade_\d+$/.test(tech.id)) {
      const lv = Number(tech.id.replace('unlock_house_upgrade_', '')) || 0;
      const up = GAME_DATA.housing?.upgrades?.[lv];
      extras.push(`🏠 可升级房屋至「${up?.name || `Lv.${lv}`}」`);
    }
    if (/^unlock_tools_lv\d+$/.test(tech.id)) {
      extras.push('🪓 对应等级采集工具配方已解锁（前往工具页）');
    }
    if (/^unlock_weapons_lv\d+$/.test(tech.id)) {
      extras.push('🗡️ 对应等级武器与护甲配方已解锁（前往武器页）');
    }
    if (tech.id === 'unlock_auto_produce') {
      extras.push('🔁 合成页可勾选「自动生产」，队列清空后自动补单');
    }
    if (tech.id === 'unlock_altar') {
      extras.push('⛩️ 神坛已建造，可研发采集/生产/战争/效率庇护');
    }
    if (tech.id === 'unlock_sanctuary_gather') {
      extras.push(`🌾 采集庇护：${(this.getSanctuaryGatherChance() * 100).toFixed(0)}% 概率 ×${this.getSanctuaryGatherMult().toFixed(1)} 产量`);
    }
    if (tech.id === 'unlock_sanctuary_craft') {
      extras.push(`🛠️ 生产庇护：${(this.getSanctuaryCraftRefundChance() * 100).toFixed(0)}% 概率返还 ${(this.getSanctuaryCraftRefundRate() * 100).toFixed(0)}% 材料`);
    }
    if (tech.id === 'unlock_sanctuary_war') {
      extras.push(`🛡️ 战争庇护：${(this.getSanctuaryWarCritChance() * 100).toFixed(0)}% 暴击，×${this.getSanctuaryWarCritMult().toFixed(1)} 伤害`);
    }
    if (tech.id === 'unlock_sanctuary_efficiency') {
      extras.push(`🌟 效率庇护：日间整点 ${(this.getSanctuaryEfficiencyChance() * 100).toFixed(0)}% 触发，×${this.getSanctuaryEfficiencyMult().toFixed(1)} / ${this.getSanctuaryEfficiencyDurationMin()} 分钟`);
    }
    if (tech.techSeries === 'unlock_sanctuary_gather_chance' || tech.techSeries === 'unlock_sanctuary_gather_power') {
      extras.push(`🌾 采集庇护：${(this.getSanctuaryGatherChance() * 100).toFixed(0)}% → ×${this.getSanctuaryGatherMult().toFixed(1)}`);
    }
    if (tech.techSeries === 'unlock_sanctuary_craft_chance' || tech.techSeries === 'unlock_sanctuary_craft_power') {
      extras.push(`🛠️ 生产庇护：${(this.getSanctuaryCraftRefundChance() * 100).toFixed(0)}% → 返还 ${(this.getSanctuaryCraftRefundRate() * 100).toFixed(0)}%`);
    }
    if (tech.techSeries === 'unlock_sanctuary_war_chance' || tech.techSeries === 'unlock_sanctuary_war_power') {
      extras.push(`🛡️ 战争庇护：${(this.getSanctuaryWarCritChance() * 100).toFixed(0)}% 暴击 ×${this.getSanctuaryWarCritMult().toFixed(1)}`);
    }
    if (
      tech.techSeries === 'unlock_sanctuary_eff_chance'
      || tech.techSeries === 'unlock_sanctuary_eff_power'
      || tech.techSeries === 'unlock_sanctuary_eff_duration'
    ) {
      extras.push(`🌟 效率庇护：${(this.getSanctuaryEfficiencyChance() * 100).toFixed(0)}% / ×${this.getSanctuaryEfficiencyMult().toFixed(1)} / ${this.getSanctuaryEfficiencyDurationMin()} 分钟`);
    }
    if (tech.id === 'unlock_auto_click') {
      const { current, max } = this.getTechRepeatLevel(tech);
      extras.push(`👆 按住间隔：${this.formatHoldClickCooldown()}（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.id === 'unlock_click_power') {
      const { current, max } = this.getTechRepeatLevel(tech);
      extras.push(`🖱️ 手动点击：${this.getManualClickPower()}/次（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.id === 'unlock_treasure_chest') {
      extras.push('📦 宝箱资源点已解锁，采集区有概率掉落宝箱（觅食除外）');
    }
    if (tech.techSeries === 'unlock_worker_efficiency' || tech.id === 'unlock_worker_efficiency') {
      const { current, max } = this.getTechRepeatLevel('unlock_worker_efficiency');
      extras.push(`👷 徒手效率：${this.getVillagerBaseSpeed()}/秒（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.techSeries === 'unlock_food_gather_speed' || tech.id === 'unlock_food_gather_speed') {
      const { current, max } = this.getTechRepeatLevel('unlock_food_gather_speed');
      extras.push(`🫐 食物采集：+${(current * 0.01).toFixed(2)}/秒/人（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.techSeries === 'unlock_tool_efficiency' || tech.id === 'unlock_tool_efficiency') {
      const { current, max } = this.getTechRepeatLevel('unlock_tool_efficiency');
      extras.push(`⚡ 工具采集效率 +${current * 5}%（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.techSeries === 'unlock_craft_efficiency' || tech.id === 'unlock_craft_efficiency') {
      const { current, max } = this.getTechRepeatLevel('unlock_craft_efficiency');
      const per = GAME_DATA.villagerWork?.craftSpeedPerTechLevel ?? 0.02;
      extras.push(`⚙️ 生产订单：${this.getCraftWorkerSpeed().toFixed(2)}/人/秒（${this.formatUpgradeLevel(current, max)}，每级 +${per}）`);
    }
    if (tech.techSeries === 'unlock_tool_durability' || tech.id === 'unlock_tool_durability') {
      const { current, max } = this.getTechRepeatLevel('unlock_tool_durability');
      extras.push(`🛡️ 工具/武器耐久 +${current * 10}%（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (tech.techSeries === 'unlock_efficient_repair' || tech.id === 'unlock_efficient_repair') {
      const { current, max } = this.getTechRepeatLevel('unlock_efficient_repair');
      const pct = Math.round(this.getRepairCostRatio() * 100);
      extras.push(`🔧 近毁装备维修约需造价 ${pct}%（${this.formatUpgradeLevel(current, max)}，每级 −6%）`);
    }
    if (tech.id === 'unlock_point_recovery') {
      extras.push('💨 资源点恢复时间 −10%');
    }
    if (tech.id === 'unlock_house_capacity') {
      extras.push(`🏠 基础房屋容纳 ${GAME_DATA.housing.baseCapacity + 1} 人/户（人口上限 ${this.getVillageCapacity()}）`);
    }
    if (tech.techSeries === 'unlock_breed_saving' || tech.id === 'unlock_breed_saving') {
      const { current, max } = this.getTechRepeatLevel('unlock_breed_saving');
      extras.push(`🍖 繁殖消耗：${this.getBreedCost().food} 食物/人（${this.formatUpgradeLevel(current, max)}）`);
    }
    if (
      tech.techSeries === 'unlock_house_build_discount'
      || tech.techSeries === 'unlock_house_work_speed'
      || tech.id === 'unlock_house_build_discount'
      || tech.id === 'unlock_house_work_speed'
    ) {
      extras.push(`🏗️ 建房进度需求：${this.getHouseOrderCount()} 点`);
    }
    if (tech.gateLevel) {
      const gateDef = this.getGateLevelDef(tech.gateLevel);
      if (gateDef) extras.push(`🚪 城门：${gateDef.name}（${gateDef.maxHp} HP，减伤 ${Math.round(gateDef.damageReduction * 100)}%）`);
    }
    if (
      tech.techSeries === 'unlock_combat_hp'
      || tech.techSeries === 'unlock_combat_atk'
      || tech.techSeries === 'unlock_combat_aspd'
      || tech.id === 'unlock_combat_hp'
      || tech.id === 'unlock_combat_atk'
      || tech.id === 'unlock_combat_aspd'
    ) {
      const m = this.getAllyCombatMults();
      extras.push(`⚔️ 友军加成：生命 ×${m.hp.toFixed(2)} · 攻击 ×${m.atk.toFixed(2)} · 攻速 ×${m.aspd.toFixed(2)}`);
    }
    const seriesLv = tech.techSeries ? this.getTechRepeatLevel(tech.techSeries) : null;
    const toastLevel = (tech.repeatable && tech.maxRepeat)
      ? ` <small class="level-tag">${this.formatUpgradeLevel(
        this.getTechRepeatLevel(tech).current,
        tech.maxRepeat
      )}</small>`
      : (seriesLv && seriesLv.max
        ? ` <small class="level-tag">${this.formatUpgradeLevel(seriesLv.current, seriesLv.max)}</small>`
        : '');
    const toastIcon = tech.compositeIcon
      ? `<span class="tech-node-composite tech-tooltip-composite"><span class="tech-node-res">${tech.compositeIcon.resource}</span><span class="tech-node-type">${tech.compositeIcon.type}</span></span>`
      : tech.icon;
    toast.innerHTML = `
      <div class="unlock-toast-header"><span class="unlock-toast-icon">${toastIcon}</span><span>解锁成功：${tech.name}${toastLevel}</span></div>
      <div class="unlock-toast-body">${tech.description}</div>
      ${extras.length ? `<div class="unlock-toast-new"><div class="unlock-toast-new-title">新内容已开放</div>${extras.map(i => `<div class="unlock-toast-item">${i}</div>`).join('')}</div>` : ''}
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('fade-out'), 3500);
    setTimeout(() => toast.remove(), 3800);
  }

  updateChestVisual(currentCount, maxCount, onCooldown = false) {
    const visual = document.getElementById('chest-visual');
    const hint = document.getElementById('chest-open-hint');
    if (!visual) return;

    const pt = this.state.resourcePoints.treasure_chest;
    const opening = visual.classList.contains('chest-opening-complete');
    const pulsing = visual.classList.contains('chest-click-pulse');
    const depleted = (pt?.stock || 0) <= 0 && !opening;

    if (depleted) {
      this.stopChestSparkleLoop();
      visual.className = 'chest-visual progress-0 chest-depleted';
      if (hint) hint.textContent = '暂无宝箱，继续采集其他资源点';
      return;
    }

    const stage = Math.min(maxCount, Math.floor(currentCount));
    const parts = ['chest-visual', `progress-${stage}`];
    if (onCooldown) parts.push('chest-cooldown');
    if (opening) parts.push('chest-opening-complete');
    if (pulsing) parts.push('chest-click-pulse');
    visual.className = parts.join(' ');

    if (stage > 0 && !onCooldown && !opening) {
      this.startChestSparkleLoop(stage, maxCount);
    } else if (!opening) {
      this.stopChestSparkleLoop();
    }

    if (hint) {
      if (onCooldown) {
        hint.textContent = `冷却中 ${((pt?.cooldownRemaining || 0) / 1000).toFixed(1)}s`;
      } else if (opening) {
        hint.textContent = '宝箱已开启！';
      } else {
        hint.textContent = `点击开启宝箱（${stage}/${maxCount}）`;
      }
    }
  }

  pulseChestClick(stage = 1, maxCount = 4) {
    const visual = document.getElementById('chest-visual');
    if (!visual) return;
    const intensity = Math.max(1, Math.min(Math.floor(stage) || 1, maxCount || 4));
    const amp = 3 + intensity * 4;
    const rot = 1.5 + intensity * 2;
    visual.style.setProperty('--shake-x', `${amp}px`);
    visual.style.setProperty('--shake-r', `${rot}deg`);
    visual.classList.remove('chest-click-pulse');
    void visual.offsetWidth;
    visual.classList.add('chest-click-pulse');
    this.burstChestSparks(intensity, maxCount);
    setTimeout(() => visual.classList.remove('chest-click-pulse'), 320);
  }

  placeChestSparkRandom(el) {
    el.style.left = `${8 + Math.random() * 84}%`;
    el.style.top = `${8 + Math.random() * 84}%`;
    el.style.fontSize = `${12 + Math.random() * 10}px`;
  }

  ensureChestSparkNodes(count) {
    const wrap = document.getElementById('chest-sparkles');
    if (!wrap) return [];
    while (wrap.children.length < count) {
      const s = document.createElement('span');
      s.className = 'spark';
      wrap.appendChild(s);
    }
    return [...wrap.children];
  }

  playChestSparkBling(el, sizeClass = 'bling') {
    if (!el) return;
    this.placeChestSparkRandom(el);
    el.classList.remove('bling', 'bling-sm', 'bling-lg');
    void el.offsetWidth;
    el.classList.add(sizeClass);
    const onEnd = () => {
      el.classList.remove('bling', 'bling-sm', 'bling-lg');
      this.placeChestSparkRandom(el);
    };
    el.addEventListener('animationend', onEnd, { once: true });
  }

  burstChestSparks(intensity = 1, maxCount = 4) {
    const wrap = document.getElementById('chest-sparkles');
    if (!wrap) return;
    wrap.classList.add('active');
    const n = Math.min(10, 2 + intensity * 2);
    const nodes = this.ensureChestSparkNodes(n);
    nodes.forEach((el, i) => {
      if (i >= n) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const cls = intensity >= maxCount - 1 ? 'bling-lg' : (intensity <= 1 ? 'bling-sm' : 'bling');
      setTimeout(() => this.playChestSparkBling(el, cls), i * 35);
    });
  }

  startChestSparkleLoop(stage, maxCount) {
    this._chestSparkStage = stage;
    this._chestSparkMax = maxCount;
    const wrap = document.getElementById('chest-sparkles');
    wrap?.classList.add('active');
    if (this._chestSparkLoop) return;

    const tick = () => {
      const visual = document.getElementById('chest-visual');
      if (!visual || visual.classList.contains('chest-depleted')) {
        this.stopChestSparkleLoop();
        return;
      }
      const intens = Math.max(1, this._chestSparkStage || 1);
      const n = Math.min(6, 1 + intens);
      const nodes = this.ensureChestSparkNodes(Math.max(n, 6));
      nodes.slice(0, n).forEach((el, i) => {
        el.style.display = '';
        setTimeout(() => this.playChestSparkBling(el, intens >= 3 ? 'bling' : 'bling-sm'), i * 60);
      });
    };
    tick();
    this._chestSparkLoop = setInterval(tick, 420);
  }

  stopChestSparkleLoop(clearActive = true) {
    if (this._chestSparkLoop) {
      clearInterval(this._chestSparkLoop);
      this._chestSparkLoop = null;
    }
    if (clearActive) {
      document.getElementById('chest-sparkles')?.classList.remove('active');
    }
  }

  playChestOpenComplete(callback) {
    const visual = document.getElementById('chest-visual');
    const maxCount = this.getMaxCount('point', 'treasure_chest');
    if (visual) {
      visual.className = `chest-visual progress-${maxCount} chest-opening-complete`;
      visual.style.setProperty('--shake-x', `${3 + maxCount * 4}px`);
      visual.style.setProperty('--shake-r', `${1.5 + maxCount * 2}deg`);
    }
    this.burstChestSparks(maxCount, maxCount);
    this.startChestSparkleLoop(maxCount, maxCount);
    const hint = document.getElementById('chest-open-hint');
    if (hint) hint.textContent = '宝箱已开启！';
    setTimeout(() => {
      this.stopChestSparkleLoop();
      callback();
    }, 750);
  }

  resetChestVisualAfterOpen() {
    const visual = document.getElementById('chest-visual');
    visual?.classList.remove('chest-opening-complete');
    this.stopChestSparkleLoop();
    const pt = this.state.resourcePoints.treasure_chest;
    if (pt) {
      this.updateChestVisual(
        pt.currentCount,
        this.getMaxCount('point', 'treasure_chest'),
        this.isOnCooldown('point', 'treasure_chest')
      );
    }
  }

  /** 返回资源中文名（未发现的返回 ???） */
  getResourceName(resId) {
    if (!this.isResourceDiscovered(resId)) return '???';
    return GAME_DATA.resources[resId]?.name || resId;
  }

  formatResourceIcon(resId) {
    if (!this.isResourceDiscovered(resId)) return '?';
    return GAME_DATA.resources[resId]?.icon || resId;
  }

  /** 材料数量展示：整数原样，否则一位小数 */
  formatResourceAmount(n) {
    const x = this.roundResource(n);
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return x.toFixed(1);
  }

  /** 纯文本版成本显示（用于 title 等属性） */
  formatCostPlain(cost) {
    if (!cost) return '免费';
    return Object.entries(cost)
      .map(([res, amt]) => {
        const n = this.formatResourceAmount(amt);
        if (!this.isResourceDiscovered(res)) return `?×${n}`;
        return `${this.getResourceName(res)}×${n}`;
      })
      .join(' ');
  }

  formatCost(cost) {
    if (!cost) return '免费';
    const entries = Object.entries(cost).filter(([, amt]) => Number(amt) > 0);
    if (!entries.length) return '免费';
    return entries
      .map(([res, amt]) => {
        const n = this.formatResourceAmount(amt);
        if (!this.isResourceDiscovered(res)) {
          return `<span class="cost-resource cost-resource-unknown"><span class="cost-res-icon">?</span>×${n}</span>`;
        }
        return `<span class="cost-resource"><span class="cost-res-icon">${this.formatResourceIcon(res)}</span><span class="cost-res-name">${this.getResourceName(res)}</span>×${n}</span>`;
      })
      .join(' ');
  }

  formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return this.formatResourceAmount(n);
  }

  // ========== 渲染 ==========
  render() {
    this.prepareTutorialForRender();
    this.clampActiveStationVisibility();
    this.renderWarehouse();
    this.renderStationLists();
    this.renderActiveStation();
    this.renderTabs();
    this.renderTechTree();
    this.renderCraftOverview();
    this.renderTools();
    this.renderWorkers();
    this.renderGlobalStats();
    this.syncTutorialUI();
  }

  renderGlobalStats() {
    this.updateCalendarDisplay();
    this.updateWarehouseFoodDrain();
    this.updateSpeedButtons();
    this.updateDifficultyBadge();
  }

  updateDifficultyBadge() {
    const el = document.getElementById('diff-label');
    if (!el) return;
    const diff = this.state.difficulty || 'normal';
    const def = GAME_DATA.difficulty?.levels?.[diff];
    if (def) {
      el.textContent = `${def.icon} ${def.name}`;
    } else {
      el.textContent = '';
    }
  }

  renderTick() {
    this.updateHeaderFoodDisplay();
    this.updateCalendarDisplay();

    if (this._needToolUiRefresh && (this.state.activeTab === 'tools' || this.state.activeTab === 'weapons')) {
      this._needToolUiRefresh = false;
      this._needToolDurabilityPaint = false;
      this.renderTools();
    } else {
      this._needToolUiRefresh = false;
      if (this._needToolDurabilityPaint && (this.state.activeTab === 'tools' || this.state.activeTab === 'weapons')) {
        this._needToolDurabilityPaint = false;
        this.updateToolDurabilityUI();
      } else {
        this._needToolDurabilityPaint = false;
      }
    }

    document.querySelectorAll('.warehouse-item.discovered[data-res]').forEach(el => {
      const amountEl = el.querySelector('.warehouse-amount');
      if (amountEl) {
        amountEl.textContent = this.formatNumber(this.state.resources[el.dataset.res] || 0);
      }
    });
    this.updateWarehouseFoodDrain();

    this.updateStationCooldownBars();
    this.updateAffordabilityStyles();

    const { type, id } = this.state.activeStation;
    const st = this.getStationState(type, id);
    const def = this.getStationDef(type, id);
    if (!st || !def) return;

    const maxCount = this.getMaxCount(type, id);
    const onCooldown = this.isOnCooldown(type, id);
    const isCraft = type === 'recipe';
    const craftQueue = isCraft ? this.getCraftQueue(id) : null;
    const queueCount = craftQueue?.quantity || 0;
    const orderMax = isCraft
      ? (craftQueue?.maxProgress || this.getMaxCount('recipe', id))
      : maxCount;
    const orderProgress = craftQueue?.progress || 0;

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const clickArea = document.getElementById('click-area');
    const progressContainer = document.getElementById('progress-container');
    const chestUi = document.getElementById('chest-open-ui');
    const isChest = type === 'point' && def.isTreasureChest;

    if (isChest) {
      progressContainer?.classList.add('hidden');
      chestUi?.classList.remove('hidden');
      if (!document.getElementById('chest-visual')?.classList.contains('chest-opening-complete')) {
        this.updateChestVisual(st.currentCount, maxCount, onCooldown);
      }
    } else {
      progressContainer?.classList.remove('hidden');
      chestUi?.classList.add('hidden');

      if (isCraft) {
        if (queueCount > 0) {
          if (onCooldown) {
            this.applyProgressBar(progressBar, {
              width: this.getCooldownProgressPct('recipe', id),
              isCooldown: true,
            });
          } else {
            this.applyProgressBar(progressBar, {
              width: Math.min(100, (orderProgress / orderMax) * 100),
              isCooldown: false,
            });
          }
        } else {
          this.applyProgressBar(progressBar, { width: 0, isCooldown: false });
        }
      } else if (type === 'point') {
        const bar = this._getPointBarState(id);
        this.applyProgressBar(progressBar, {
          width: bar.width,
          isCooldown: false,
          instant: !!bar.instant,
        });
      } else if (onCooldown) {
        this.applyProgressBar(progressBar, {
          width: this.getCooldownProgressPct(type, id),
          isCooldown: false,
        });
      } else {
        this.applyProgressBar(progressBar, {
          width: Math.min(100, (st.currentCount / maxCount) * 100),
          isCooldown: false,
        });
      }

      if (progressText) {
        progressText.textContent = isCraft
          ? (queueCount > 0
            ? (onCooldown
              ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s · 剩余 ×${queueCount}`
              : `生产中 ${orderProgress.toFixed(1)} / ${orderMax} · 剩余 ×${queueCount}`)
            : (st.autoProduce ? '自动生产中，等待材料...' : '无可制作订单'))
          : (type === 'point'
            ? this._getPointBarState(id).text
            : onCooldown
              ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s`
              : `${st.currentCount.toFixed(1)} / ${maxCount}`);
      }
    }
    if (clickArea) {
      if (type === 'point' && !isChest) {
        clickArea.classList.toggle('cooldown', !!this._getPointBarState(id).cooling);
      } else {
        clickArea.classList.toggle('cooldown', onCooldown);
      }
    }
  }

  updateStationCooldownBars() {
    document.querySelectorAll('.station-btn .mini-progress').forEach(bar => {
      const t = bar.dataset.stationType;
      const sid = bar.dataset.stationId;
      if (!t || !sid) return;
      if (t === 'point' && !GAME_DATA.resourcePoints[sid]?.isTreasureChest) {
        const barState = this._getPointBarState(sid);
        if (barState.cooling) {
          this.applyProgressBar(bar, { width: 0, isCooldown: false, instant: true });
          bar.style.display = 'none';
          return;
        }
        bar.style.display = '';
        this.applyProgressBar(bar, { width: barState.width, isCooldown: false, instant: !!barState.instant });
        return;
      }
      const stationCooldown = this.isOnCooldown(t, sid);
      if (stationCooldown) {
        // 冷却中不显示进度条，只显示文字
        this.applyProgressBar(bar, { width: 0, isCooldown: false });
        bar.style.display = 'none';
        return;
      }
      bar.style.display = '';
      const sst = this.getStationState(t, sid);
      if (!sst) return;
      const smax = this.getMaxCount(t, sid) || 1;
      this.applyProgressBar(bar, {
        width: Math.min(100, (sst.currentCount / smax) * 100),
        isCooldown: false,
      });
      if (t === 'house') {
        const item = bar.closest('.craft-order-item');
        const status = item?.querySelector('.craft-order-status');
        if (status) status.textContent = `${sst.currentCount.toFixed(0)}/${smax}`;
      }
    });

    document.querySelectorAll('.craft-queue-progress').forEach(bar => {
      const orderId = bar.dataset.orderId;
      if (!orderId) return;
      const order = (this.state.craftOrderQueue || []).find(o => o.id === Number(orderId));
      if (!order) return;
      const recipeId = order.recipeId;
      const max = this.getCraftOrderMaxProgress(order);
      const maxWidth = max > 0 ? Math.min(100, (order.progress / max) * 100) : 0;
      const onCooldown = this.isOnCooldown('recipe', recipeId);
      const isHead = this.getActiveCraftOrder()?.id === order.id;

      // 队首或有进度的订单显示进度条
      let barWidth = 0;
      let isCooldown = false;
      if (onCooldown) {
        isCooldown = true;
        barWidth = this.getCooldownProgressPct('recipe', recipeId);
      } else if (isHead || order.progress > 0) {
        barWidth = maxWidth;
      }
      this.applyProgressBar(bar, { width: barWidth, isCooldown });

      const item = bar.closest('.craft-order-item');
      const status = item?.querySelector('.craft-order-status');
      if (status) {
        if (onCooldown) {
          status.textContent = `冷却 ${this.formatCooldownSeconds(this.state.craftStations[recipeId]?.cooldownRemaining)}s`;
        } else if (isHead || order.progress > 0) {
          status.textContent = `${order.progress.toFixed(0)}/${max}`;
        } else {
          status.textContent = '排队中';
        }
      }
      const countEl = item?.querySelector('.craft-queue-count');
      if (countEl) countEl.textContent = `×${order.count}`;
    });
  }

  updateAffordabilityStyles() {
    document.querySelectorAll('.craft-overview-item[data-recipe-id]').forEach(el => {
      const id = el.dataset.recipeId;
      const input = el.querySelector('.craft-produce-input');
      const count = Math.max(1, parseInt(input?.value, 10) || 1);
      const canOne = this.canAffordCraft(id, 1);
      const canN = this.canAffordCraft(id, count);
      el.classList.toggle('affordable', canOne);
      el.classList.toggle('unaffordable', !canOne);
      el.querySelector('.btn-craft-produce-confirm')?.toggleAttribute('disabled', !canN);
    });

    document.querySelectorAll('.upgrade-item[data-point-id]').forEach(el => {
      if (el.classList.contains('maxed')) return;
      const canUp = this.canUpgradePoint(el.dataset.pointId, el.dataset.upgradeType);
      el.classList.toggle('affordable', canUp);
      el.classList.toggle('unaffordable', !canUp);
      el.querySelector('.btn-upgrade')?.toggleAttribute('disabled', !canUp);
    });

    document.querySelectorAll('.tech-node[data-tech-id]').forEach(el => {
      const tech = GAME_DATA.techTree.find(t => t.id === el.dataset.techId);
      if (!tech) return;
      const state = this._getTechNodeVisualState(tech);
      el.classList.toggle('state-affordable', state === 'affordable');
      el.classList.toggle('state-unaffordable', state === 'unaffordable');
      el.classList.toggle('state-done', state === 'done');
    });
    if (this._techTooltipHoverId) this._refreshTechTooltipIfOpen();

    document.querySelectorAll('.house-item').forEach(el => {
      const btn = el.querySelector('.btn-upgrade-house');
      if (!btn || el.classList.contains('maxed')) return;
      const level = Number(btn.dataset.houseLevel);
      const canUp = Number.isFinite(level)
        ? this.canUpgradeHouseLevel(level)
        : this.canUpgradeHouse(btn.dataset.houseId);
      el.classList.toggle('affordable', canUp);
      el.classList.toggle('unaffordable', !canUp);
      btn.toggleAttribute('disabled', !canUp);
    });
    const buildPanel = document.querySelector('.house-build-panel');
    if (buildPanel) {
      const can = this.canBuildHouse();
      buildPanel.classList.toggle('affordable', can);
      buildPanel.classList.toggle('unaffordable', !can);
      buildPanel.querySelector('.btn-build-house')?.toggleAttribute('disabled', !can);
    }
    document.querySelectorAll('.point-build-panel').forEach(panel => {
      const btn = panel.querySelector('.btn-build-extra-point');
      if (!btn) return;
      const pointId = btn.dataset.pointId;
      const can = this.canBuildExtraPoint(pointId);
      panel.classList.toggle('affordable', can);
      panel.classList.toggle('unaffordable', !can);
      btn.toggleAttribute('disabled', !can);
      const costEl = panel.querySelector('.cost');
      if (costEl) costEl.innerHTML = this.formatCost(this.getExtraPointBuildCost(pointId));
    });
    const breedPanel = document.querySelector('.village-breed');
    if (breedPanel) {
      const canBreed = this.canBreedVillager();
      const hasSlot = this.getEmptyHouseSlots() > 0;
      breedPanel.classList.toggle('active', hasSlot);
      breedPanel.classList.toggle('affordable', canBreed);
      breedPanel.classList.toggle('unaffordable', !canBreed);
      breedPanel.querySelector('.btn-breed-villager')?.toggleAttribute('disabled', !canBreed);
    }
  }

  renderWarehouse() {
    const container = document.getElementById('warehouse-overview');
    if (!container) return;

    const entries = Object.entries(GAME_DATA.resources).sort(([a], [b]) => {
      if (a === 'food') return -1;
      if (b === 'food') return 1;
      return 0;
    });
    const discovered = entries.filter(([id]) => this.isResourceDiscovered(id));
    const undiscoveredCount = entries.length - discovered.length;

    container.innerHTML = `
      <div class="warehouse-header">
        <span class="warehouse-summary">已发现 ${discovered.length} / ${entries.length}</span>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'warehouse-grid';

    discovered.forEach(([id, def]) => {
      if (id === 'food') return; // 食物移至顶栏显示
      const amount = this.state.resources[id] || 0;
      const el = document.createElement('div');
      el.className = `warehouse-item discovered${amount > 0 ? ' has-stock' : ''}`;
      el.dataset.res = id;
      el.innerHTML = `
        <span class="warehouse-icon">${def.icon}</span>
        <span class="warehouse-name">${def.name}</span>
        <span class="warehouse-amount">${this.formatNumber(amount)}</span>
      `;
      el.style.setProperty('--res-color', def.color);
      grid.appendChild(el);
    });

    // 未发现资源最多只占 1 格提示，不逐项列出 ?
    if (undiscoveredCount > 0) {
      const el = document.createElement('div');
      el.className = 'warehouse-item undiscovered';
      el.innerHTML = `
        <span class="warehouse-icon">?</span>
        <span class="warehouse-name">未发现</span>
        <span class="warehouse-amount">${undiscoveredCount > 1 ? `还有 ${undiscoveredCount} 种` : '—'}</span>
      `;
      grid.appendChild(el);
    }

    container.appendChild(grid);
  }

  renderStationBtn(container, type, id, def) {
    const st = this.getStationState(type, id);
    const active = this.isActiveStation(type, id);
    const maxCount = this.getMaxCount(type, id);
    const onCooldown = this.isOnCooldown(type, id);
    const pointBar = type === 'point' && !def.isTreasureChest ? this._getPointBarState(id) : null;
    const barWidth = pointBar
      ? pointBar.width
      : (onCooldown ? 0 : Math.min(100, (st.currentCount / maxCount) * 100));
    const barClass = 'mini-progress';
    const isChest = def.isTreasureChest;
    const isAltar = !!def.isAltar;
    const altarLocked = isAltar && !st?.unlocked;
    const chestStock = isChest ? (st.stock || 0) : 0;
    const depleted = isChest && chestStock <= 0;
    const isDemon = def.isDemonKing || def.isBossPoint;

    let dailyEstHtml = '';
    if (!isChest && !isAltar && !isDemon && !depleted) {
      const daily = this.getPointDailyExpectedOutput(id);
      const resName = GAME_DATA.resources[def.resource]?.name || '';
      const workSec = this.getDailyAutoWorkSeconds();
      const daySpeed = this.getStationAutoSpeed('point', id, { ignoreRest: true });
      dailyEstHtml = `
        <span class="station-daily-est" title="预计产量 = 白天速度 ${daySpeed.toFixed(2)}/秒 × 日间工作 ${Math.round(workSec)} 秒（已扣夜间休息 8h）÷ 进度需求 × 单次产量">
          预计 ${resName} ${this.formatDailyExpectedOutput(daily)}/天
        </span>`;
    }

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `station-btn ${active ? 'active' : ''} ${depleted ? 'depleted' : ''}${altarLocked ? ' locked' : ''}${this.shouldFlashUnlockPoint(id) ? ' unlock-flash' : ''} ${isDemon ? 'station-boss' : ''}${isAltar ? ' station-altar' : ''}`;
    el.dataset.stationType = type;
    el.dataset.stationId = id;
    const demonStatus = isDemon
      ? (this.state.divineArtifactReady ? '⚡已破防·即将总攻' : '🛡️无敌姿态')
      : '';
    el.innerHTML = `
      <span class="station-btn-label">${def.icon} ${def.name}${isChest ? ` <small class="chest-stock">×${chestStock}</small>` : ''}${demonStatus ? ` <small class="demon-status">${demonStatus}</small>` : ''}</span>
      ${st.assignedWorkers > 0 && !depleted && !isDemon ? `<span class="worker-badge">👷${st.assignedWorkers}</span>` : ''}
      ${dailyEstHtml}
      ${!isDemon && !depleted ? `<div class="mini-progress-bg"><div class="${barClass}${onCooldown ? ' cooldown' : ''}" data-station-type="${type}" data-station-id="${id}" style="width:${barWidth}%"></div></div>` : ''}
    `;
    container.appendChild(el);
  }

  ensureSidebarCollapsedState() {
    if (!this.state.sidebarCollapsed || typeof this.state.sidebarCollapsed !== 'object') {
      this.state.sidebarCollapsed = { forage: false, gather: false, craft: false };
    }
    ['forage', 'gather', 'craft'].forEach((key) => {
      if (this.state.sidebarCollapsed[key] === undefined) {
        this.state.sidebarCollapsed[key] = false;
      }
    });
  }

  toggleSidebarSection(section) {
    if (!['forage', 'gather', 'craft'].includes(section)) return;
    this.ensureSidebarCollapsedState();
    this.state.sidebarCollapsed[section] = !this.state.sidebarCollapsed[section];
    this.applySidebarSectionCollapse(section);
  }

  applySidebarSectionCollapse(section) {
    const sectionEl = document.getElementById(`${section}-section`);
    const titleEl = document.getElementById(`${section}-section-title`);
    if (!sectionEl || !titleEl) return;
    const collapsed = !!this.state.sidebarCollapsed?.[section];
    sectionEl.classList.toggle('is-collapsed', collapsed);
    titleEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  renderStationLists() {
    const chestList = document.getElementById('chest-list');
    const forageList = document.getElementById('forage-list');
    const gatherList = document.getElementById('gather-list');
    const craftList = document.getElementById('craft-station-list');
    const chestSection = document.getElementById('chest-section');
    const forageSection = document.getElementById('forage-section');
    const gatherSection = document.getElementById('gather-section');
    const craftSection = document.getElementById('craft-section');
    const forageTitle = document.getElementById('forage-section-title');
    const gatherTitle = document.getElementById('gather-section-title');

    // 保存左侧生产列表的滚动位置
    const craftScrollTop = craftList ? craftList.scrollTop : 0;
    if (chestList) chestList.innerHTML = '';
    if (forageList) forageList.innerHTML = '';
    if (gatherList) gatherList.innerHTML = '';
    if (craftList) craftList.innerHTML = '';

    let chestCount = 0;
    let forageCount = 0;
    let gatherCount = 0;

    // 宝箱置顶，独立类别
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!def.isTreasureChest) return;
      if (!this.isPointVisibleInSidebar(id)) return;
      if (chestList) this.renderStationBtn(chestList, 'point', id, def);
      chestCount++;
    });

    // 神坛：独立在外侧（未解锁也可查看）
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!def.isAltar) return;
      if (!this.isPointVisibleInSidebar(id)) return;
      if (chestList) this.renderStationBtn(chestList, 'point', id, def);
      chestCount++;
    });

    // 先渲染魔王（特殊Boss条，始终在采集最前）
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!this.isPointVisibleInSidebar(id)) return;
      if (def.isDemonKing || def.isBossPoint) {
        if (gatherList) this.renderStationBtn(gatherList, 'point', id, def);
        gatherCount++;
      }
    });
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!this.isPointVisibleInSidebar(id)) return;
      if (def.isDemonKing || def.isBossPoint) return;
      if (def.isTreasureChest || def.isAltar) return;
      if (def.isFoodPoint) {
        if (forageList) this.renderStationBtn(forageList, 'point', id, def);
        forageCount++;
      } else {
        if (gatherList) this.renderStationBtn(gatherList, 'point', id, def);
        gatherCount++;
      }
    });

    if (chestSection) chestSection.style.display = chestCount > 0 ? '' : 'none';
    if (forageSection) forageSection.style.display = forageCount > 0 ? '' : 'none';
    if (gatherSection) gatherSection.style.display = gatherCount > 0 ? '' : 'none';

    if (forageTitle) {
      forageTitle.classList.toggle('unlock-flash-menu', this.shouldFlashUnlockSection('forage'));
    }
    if (gatherTitle) {
      gatherTitle.classList.toggle('unlock-flash-menu', this.shouldFlashUnlockSection('gather'));
    }

    let hasCraft = this.getCraftRecipesUnlocked().length > 0;

    const allOrders = this.getAllCraftOrders();
    const upgProg = this.state.houseUpgradeProgress || {};
    const buildProg = this.state.houseBuildProgress;
    const hasHouseWork = buildProg || Object.values(upgProg).some(p => p);
    const hasAnyWork = allOrders.length > 0 || hasHouseWork;

    if (!hasCraft) {
      if (craftSection) craftSection.style.display = 'none';
    } else if (!hasAnyWork) {
      if (craftSection) craftSection.style.display = '';
      if (craftList) craftList.innerHTML = '<p class="hint craft-order-empty">无可制作订单</p>';
    } else {
      if (craftSection) craftSection.style.display = '';
      // 生产订单
      allOrders.forEach((order, idx) => {
        const recipeId = order.recipeId;
        const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        const max = this.getCraftOrderMaxProgress(order);
        const barState = this.getCraftQueueBarState(recipeId);
        const isHead = idx === 0;
        const isRepair = order.kind === 'repair';
        const barClass = barState.isCooldown
          ? 'mini-progress craft-queue-progress cooldown'
          : 'mini-progress craft-queue-progress';
        const statusText = barState.isCooldown
          ? `冷却 ${this.formatCooldownSeconds(this.state.craftStations[recipeId]?.cooldownRemaining)}s`
          : (isHead ? `${order.progress.toFixed(0)}/${max}` : `排队中`);
        const active = this.isActiveStation('recipe', recipeId);
        const label = isRepair
          ? `🔧 修复 ${recipe.name}`
          : `${recipe.icon} ${recipe.name}`;
        const el = document.createElement('div');
        el.className = `craft-order-item ${active ? 'active' : ''}${isRepair ? ' craft-order-repair' : ''}`;
        el.dataset.recipeId = recipeId;
        el.dataset.orderId = order.id;
        el.innerHTML = `
          <button type="button" class="craft-order-btn station-btn ${active ? 'active' : ''}" data-station-type="recipe" data-station-id="${recipeId}" data-order-id="${order.id}">
            <span class="station-btn-label">${label} <span class="craft-queue-count">×${order.count}</span></span>
            <div class="mini-progress-bg"><div class="${barClass}" data-order-id="${order.id}" style="width:${isHead ? barState.width : 0}%"></div></div>
            <span class="craft-order-status">${statusText}</span>
          </button>
          <div class="craft-cancel-wrap">
            <button type="button" class="btn-cancel-order" data-order-id="${order.id}" title="取消此订单">×</button>
          </div>
          <div class="craft-order-move">
            ${idx > 0 ? `<button type="button" class="btn-move-order-up" data-order-id="${order.id}" title="前移一位">▲</button>` : ''}
            ${idx < allOrders.length - 1 ? `<button type="button" class="btn-move-order-down" data-order-id="${order.id}" title="后移一位">▼</button>` : ''}
            ${idx > 0 ? `<button type="button" class="btn-move-order-top" data-order-id="${order.id}" title="移至最前">⏫</button>` : ''}
          </div>
        `;
        craftList.appendChild(el);
      });

      // 房屋建造进度
      if (buildProg) {
        const pct = Math.min(100, (buildProg.progress / buildProg.maxCount) * 100);
        const active = this.isActiveStation('house', 'build');
        const el = document.createElement('div');
        el.className = `craft-order-item ${active ? 'active' : ''}`;
        el.dataset.houseKind = 'build';
        el.innerHTML = `
          <button type="button" class="craft-order-btn station-btn ${active ? 'active' : ''}" data-station-type="house" data-station-id="build">
            <span class="station-btn-label">🏠 建造房屋</span>
            <div class="mini-progress-bg"><div class="mini-progress" data-station-type="house" data-station-id="build" style="width:${pct}%"></div></div>
            <span class="craft-order-status">${buildProg.progress.toFixed(0)}/${buildProg.maxCount}</span>
          </button>
        `;
        craftList.appendChild(el);
      }

      // 房屋升级进度
      Object.entries(upgProg).forEach(([houseId, p]) => {
        if (!p) return;
        const pct = Math.min(100, (p.progress / p.maxCount) * 100);
        const active = this.isActiveStation('house', houseId);
        const el = document.createElement('div');
        el.className = `craft-order-item ${active ? 'active' : ''}`;
        el.dataset.houseKind = 'upgrade';
        el.dataset.houseId = houseId;
        el.innerHTML = `
          <button type="button" class="craft-order-btn station-btn ${active ? 'active' : ''}" data-station-type="house" data-station-id="${houseId}">
            <span class="station-btn-label">🏠 升级房屋 Lv.${p.targetLevel || '?'}</span>
            <div class="mini-progress-bg"><div class="mini-progress" data-station-type="house" data-station-id="${houseId}" style="width:${pct}%"></div></div>
            <span class="craft-order-status">${p.progress.toFixed(0)}/${p.maxCount}</span>
          </button>
        `;
        craftList.appendChild(el);
      });
    }

    this.ensureSidebarCollapsedState();
    this.applySidebarSectionCollapse('forage');
    this.applySidebarSectionCollapse('gather');
    this.applySidebarSectionCollapse('craft');

    // 新增订单焦点优先；否则恢复左侧生产列表滚动位置
    if (this._pendingCraftFocus) {
      this.applyPendingCraftFocus();
    } else if (craftList) {
      craftList.scrollTop = craftScrollTop;
    }
  }

  renderActiveStation() {
    const { type, id } = this.state.activeStation;
    const def = this.getStationDef(type, id);
    const st = this.getStationState(type, id);
    if (!def || !st) return;

    const maxCount = this.getMaxCount(type, id);
    const onCooldown = this.isOnCooldown(type, id);
    const clickPower = this.getClickPower(type, id);
    const autoSpeed = this.getStationAutoSpeed(type, id);
    const isCraft = type === 'recipe';
    const isHouse = type === 'house';
    const craftQueue = isCraft ? this.getCraftQueue(id) : null;
    const queueCount = craftQueue?.quantity || 0;
    const orderMax = isCraft
      ? (craftQueue?.maxProgress || this.getMaxCount('recipe', id))
      : maxCount;
    const orderProgress = craftQueue?.progress || 0;
    const pointBar = type === 'point' && !GAME_DATA.resourcePoints[id]?.isTreasureChest
      ? this._getPointBarState(id)
      : null;
    const mainBarWidth = isCraft
      ? (queueCount > 0
        ? (onCooldown ? this.getCooldownProgressPct('recipe', id) : Math.min(100, (orderProgress / orderMax) * 100))
        : 0)
      : pointBar
        ? pointBar.width
        : (onCooldown ? this.getCooldownProgressPct(type, id) : Math.min(100, (st.currentCount / maxCount) * 100));
    // 采集点冷却用回落条（非蓝冷却条）；合成仍用冷却样式
    const mainBarCooldown = onCooldown && isCraft && queueCount > 0;

    const isChest = type === 'point' && def.isTreasureChest;
    const isAltar = type === 'point' && !!def.isAltar;
    const chestStock = isChest ? (st.stock || 0) : 0;
    const isDemon = type === 'point' && (def.isDemonKing || def.isBossPoint);
    const demonInvincible = isDemon && !this.state.divineArtifactReady;

    document.getElementById('point-icon').textContent = def.icon;
    document.getElementById('point-name').textContent = def.name;
    document.getElementById('point-desc').innerHTML = isHouse
      ? `${def.description} | 进度 ${st.currentCount.toFixed(1)} / ${maxCount}`
      : isCraft
      ? `${def.description} | ${this.formatRecipeLine(def)}${queueCount > 0 ? ` | 生产中 ×${queueCount}` : ''}`
      : isChest
        ? `${def.description} | 待开启: ${chestStock} 个 | 爆率: ${(this.getChestDropRate() * 100).toFixed(1)}% | 升级见科技树`
        : (type === 'point' && def.isAltar)
        ? this.formatAltarStatusHtml()
        : isDemon
        ? demonInvincible
          ? '👹 魔王被「无敌之姿」笼罩——任何攻击都无效。必须先解锁「破魔神器」科技并铸成神器。'
          : '💥 魔王的无敌已被破除！它震怒不已，即将发动总攻。快去防务页整备编制！'
        : (def.canBuildMultiple
          ? `${def.description} | 已建 ${this.getPointBuildingCount(id)} 座 · 人数上限 ${this.getStationWorkerCap('point', id)}${
            (def.maxUpgrades?.efficiency || 0) > 0
              ? ` · 效率 ${this.formatUpgradeLevel(this.getPointUpgradeLevel(id, 'efficiency'), def.maxUpgrades.efficiency)}`
              : ''
          }${
            (def.maxUpgrades?.cooldown || 0) > 0
              ? ` · 恢复 ${this.formatUpgradeLevel(this.getPointUpgradeLevel(id, 'cooldown'), def.maxUpgrades.cooldown)}`
              : ''
          }`
          : def.description);

    const resting = this.isVillagersResting();
    const houseAutoSpeed = this.getVillagerBaseSpeed();
    const autoLabel = resting
      ? '自动: 休息中'
      : isHouse
        ? `自动: ${houseAutoSpeed.toFixed(2)}/秒`
        : `自动: ${autoSpeed.toFixed(1)}/秒`;
    const clickLv = this.getTechRepeatLevel('unlock_click_power');
    const clickLabel = clickLv.max > 0
      ? `点击: ${clickPower}/次（${this.formatUpgradeLevel(clickLv.current, clickLv.max)}）`
      : `点击: ${clickPower}/次`;
    const holdLv = this.getTechRepeatLevel('unlock_auto_click');
    const holdLabel = holdLv.max > 0
      ? `按住: ${this.formatHoldClickCooldown()}（${this.formatUpgradeLevel(holdLv.current, holdLv.max)}）`
      : `按住: ${this.formatHoldClickCooldown()}`;
    const stats = isHouse
      ? [clickLabel, autoLabel, holdLabel]
      : isCraft
      ? (queueCount > 0
        ? [
          clickLabel,
          autoLabel,
          holdLabel,
          `👷 ${this.state.workers?.craftWorkers || 0}`,
        ]
        : [
          st.autoProduce ? '自动生产' : '无可制作订单',
          autoLabel,
          `👷 ${this.state.workers?.craftWorkers || 0}`,
        ])
      : isChest
      ? [`待开启: ${chestStock}`, `开启: 4次点击`, `冷却: 0.5s`]
      : isAltar
      ? [st.unlocked ? '神坛已启用' : '神坛未建造', '查看庇护状态', '研发见科技树']
      : isDemon
      ? demonInvincible
        ? ['不可攻击', '无敌护盾', '需先铸就神器']
        : ['魔王已被破防', '即将总攻', '整备防务！']
      : [
        clickLabel,
        autoLabel,
        holdLabel,
      ];
    if (type === 'point' && !isChest && !isAltar && !isDemon) {
      stats.push(`单次采集: ${this.getHarvestYield(id)}`);
      const daily = this.getPointDailyExpectedOutput(id);
      const resName = GAME_DATA.resources[def.resource]?.name || '';
      stats.push(`预计今日 ${resName} ${this.formatDailyExpectedOutput(daily)}`);
    }
    document.getElementById('click-power').textContent = stats.slice(0, 2).join(' | ');
    document.getElementById('yield-info').textContent = stats.slice(2).join(' | ');

    const progressBarEl = document.getElementById('progress-bar');
    this.applyProgressBar(progressBarEl, {
      width: isChest ? 0 : mainBarWidth,
      isCooldown: isChest ? false : mainBarCooldown,
      instant: !!(pointBar && pointBar.instant),
    });
    const progressContainer = document.getElementById('progress-container');
    const chestUi = document.getElementById('chest-open-ui');
    if (isChest) {
      progressContainer?.classList.add('hidden');
      chestUi?.classList.remove('hidden');
      if (!document.getElementById('chest-visual')?.classList.contains('chest-opening-complete')) {
        this.updateChestVisual(st.currentCount, maxCount, onCooldown);
      }
    } else if (isAltar) {
      progressContainer?.classList.add('hidden');
      chestUi?.classList.add('hidden');
    } else {
      progressContainer?.classList.remove('hidden');
      chestUi?.classList.add('hidden');
      document.getElementById('progress-text').textContent = isHouse
        ? `${st.currentCount.toFixed(1)} / ${maxCount}`
        : isCraft
        ? (queueCount > 0
          ? (onCooldown
            ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s · 剩余 ×${queueCount}`
            : `生产中 ${orderProgress.toFixed(1)} / ${orderMax} · 剩余 ×${queueCount}`)
            : (st.autoProduce ? '自动生产中，等待材料...' : '无可制作订单'))
          : pointBar
          ? pointBar.text
          : onCooldown
            ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s`
            : `${st.currentCount.toFixed(1)} / ${maxCount}`;
    }

    const clickArea = document.getElementById('click-area');
    const craftClickable = isCraft && queueCount > 0;
    const houseClickable = isHouse && this.isStationUnlocked(type, id);
    const isDemonStation = isDemon;
    const pointCooling = !!(pointBar && pointBar.cooling);
    clickArea.className = `click-area ${(pointBar ? pointCooling : onCooldown) ? 'cooldown' : ''} ${isChest && chestStock <= 0 ? 'disabled' : ''} ${isChest ? 'chest-click-area' : ''} ${isDemonStation || isAltar ? 'disabled' : ''}`;
    clickArea.style.pointerEvents = (isCraft && !craftClickable) || (isHouse && !houseClickable) || (isChest && chestStock <= 0) || isDemonStation || isAltar ? 'none' : '';
    document.querySelector('.click-hint').textContent = isHouse
      ? '点击推进建造/升级进度'
      : isCraft
      ? queueCount > 0
        ? '点击以进行采集'
        : (st.autoProduce ? '开启自动生产后，队列清空会自动补单' : '无可制作订单')
      : isChest
        ? chestStock > 0
          ? onCooldown
            ? '宝箱冷却中，请稍候...'
            : '每次点击撬开宝箱一点，共需点击 4 次（也可按空格）'
          : ''
        : isAltar
        ? (st.unlocked ? '神坛状态见上方说明；庇护效果自动生效' : '请先在科技树解锁并建造神坛')
        : isDemonStation
        ? demonInvincible
          ? '👹 魔王被无敌护盾笼罩，无法攻击。需要铸成破魔神器。'
          : '⚔️ 魔王已将目光投向村落！前往防务页编制迎战。'
        : (resting
          ? '点击以进行采集'
          : (this.isTutorialActive() && this.getTutorialStep()?.id === 'chop_woods'
            ? '点击以进行采集'
            : '点击以进行采集'));

    document.getElementById('point-upgrades').style.display = type === 'point' && !isAltar ? 'block' : 'none';
    document.getElementById('point-workers').style.display = isChest || isAltar ? 'none' : 'block';
    if (type === 'point' && !isAltar) this.renderPointUpgrades(id);
    if (!isAltar) this.renderStationWorkers(type, id);
  }

  renderPointUpgrades(pointId) {
    const container = document.getElementById('point-upgrades');
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    container.innerHTML = '';
    container.style.display = 'none';

    const showBuild = !!def?.canBuildMultiple && pt?.unlocked;
    if (!showBuild) return;

    container.style.display = 'block';
    const buildings = this.getPointBuildingCount(pointId);
    const per = def.maxWorkers || 0;
    const cap = this.getStationWorkerCap('point', pointId);
    const cost = this.getExtraPointBuildCost(pointId);
    const canBuild = this.canBuildExtraPoint(pointId);
    const buildEl = document.createElement('div');
    buildEl.className = `point-build-panel ${canBuild ? 'affordable' : 'unaffordable'}`;
    buildEl.innerHTML = `
      <h4>扩建 ${def.name}</h4>
      <p class="upgrade-desc">当前 ${buildings} 座 · 每座上限 ${per} 人 · 合计上限 ${cap}</p>
      <div class="upgrade-action">
        <span class="cost">${this.formatCost(cost)}</span>
        <button type="button" class="btn-craft btn-build-extra-point" data-point-id="${pointId}" ${canBuild ? '' : 'disabled'}>再建一座</button>
      </div>
    `;
    container.appendChild(buildEl);
  }

  renderStationWorkers(type, id) {
    const container = document.getElementById('point-workers');
    const st = this.getStationState(type, id);
    const def = this.getStationDef(type, id);
    const autoSpeed = this.getStationAutoSpeed(type, id);
    const isCraft = type === 'recipe';
    const isHouse = type === 'house';
    if (isHouse) {
      const resting = this.isVillagersResting();
      const spd = this.getVillagerBaseSpeed();
      container.innerHTML = `
        <h4>房屋工程</h4>
        <p class="hint">${resting
          ? '🌙 夜间休息中，自动建造暂停；仍可手动点击推进。'
          : `村民自动推进 ${spd.toFixed(2)}/秒。手动点击可加快进度。`}</p>
      `;
      return;
    }
    if (isCraft) {
      const craftWorkers = this.state.workers?.craftWorkers || 0;
      const queue = this.state.craftOrderQueue || [];
      const orderList = queue.map(o => {
        const recipe = GAME_DATA.recipes.find(r => r.id === o.recipeId);
        return { ...o, name: recipe?.name || o.recipeId, icon: recipe?.icon || '📦' };
      });
      const hungry = this.getHungryCount();
      const hungerHint = hungry > 0 ? `<br>⚠ 饥饿 ${hungry} 人，效率 ×${this.getHungerWorkFactor().toFixed(2)}` : '';
      container.innerHTML = `
        <h4>生产工人</h4>
        <div class="worker-controls">
          <button type="button" class="btn-worker btn-worker-unassign" data-station-type="recipe" data-station-id="__global__" ${craftWorkers > 0 ? '' : 'disabled'}>−</button>
          <span class="worker-count">🧑 ${craftWorkers}</span>
          <button type="button" class="btn-worker btn-worker-assign" data-station-type="recipe" data-station-id="__global__" ${this.state.workers.unassigned > 0 ? '' : 'disabled'}>+</button>
        </div>
        <p class="hint">生产工人总速度：${autoSpeed.toFixed(2)}/秒。手动点击可生产任意订单。${hungerHint}</p>
        ${orderList.length > 0 ? `<div class="craft-order-assign-list">${orderList.map(o => {
          const max = this.getCraftOrderMaxProgress(o);
          const pct = max > 0 ? Math.min(100, (o.progress / max) * 100) : 0;
          const label = o.kind === 'repair'
            ? `🔧 修复 ${o.name}`
            : `${o.icon} ${o.name}`;
          return `<div class="craft-order-assign-row">
            <span class="craft-order-assign-label">${label} ×${o.count}</span>
            <div class="mini-progress-bg"><div class="mini-progress" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')}</div>` : '<p class="hint">暂无生产订单，前往合成页下订单</p>'}
      `;
      return;
    }

    const assign = type === 'point' ? this.getStationToolAssignment(type, id) : null;
    const toolId = assign?.toolId || null;
    const toolDef = toolId ? GAME_DATA.villagerTools[toolId] : null;
    const cap = this.getStationWorkerCap(type, id);
    const capHint = Number.isFinite(cap) ? `/${cap}` : '';
    let effHint = '未分配村民，无自动进度';
    if (st.assignedWorkers > 0) {
      if (this.isVillagersResting()) {
        const start = GAME_DATA.calendar?.restStartHour ?? 22;
        const end = GAME_DATA.calendar?.restEndHour ?? 6;
        effHint = `🌙 夜间休息（${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00），自动暂停 · 仍可手动点击`;
      } else if (toolDef && assign) {
        const bareSpd = this.getPointBareWorkerSpeed(id);
        const bits = Object.entries(assign.byLevel)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([lv, n]) => `${this.formatToolLabel(toolId, Number(lv))}×${n}（${this.getToolSpeed(Number(lv))}/秒）`);
        if (assign.bare > 0) {
          bits.push(`徒手 ${assign.bare}（${bareSpd}/秒）`);
        }
        effHint = bits.length
          ? `效率: ${bits.join(' + ')} = ${autoSpeed.toFixed(2)}/秒（持工具人数≤库存）`
          : `效率: 无可用工具 · 全员徒手 ${bareSpd}/秒 = ${autoSpeed.toFixed(2)}/秒`;
      } else {
        effHint = `效率: ${st.assignedWorkers} × ${this.getPointBareWorkerSpeed(id)}/秒 = ${autoSpeed.toFixed(2)}/秒`;
      }
    }
    const stockLine = toolDef
      ? `<br>库存: ${this.formatToolStockLine(toolId)}`
      : '';
    const hungry = this.getHungryCount();
    const hungerHint = hungry > 0
      ? `<br>⚠ 全局饥饿 ${hungry} 人，自动效率 ×${this.getHungerWorkFactor().toFixed(2)}`
      : '';
    container.innerHTML = `
      <h4>村民分配 <small class="worker-tab-link">（村民页统一管理）</small></h4>
      <div class="worker-controls">
        <button type="button" class="btn-worker btn-worker-unassign" data-station-type="${type}" data-station-id="${id}" ${this.canDecreaseWorkerAllocation(type, id) ? '' : 'disabled'}>−</button>
        <span class="worker-count">🧑 ${st.assignedWorkers}${capHint}</span>
        <button type="button" class="btn-worker btn-worker-assign" data-station-type="${type}" data-station-id="${id}" ${this.canIncreaseWorkerAllocation(type, id) ? '' : 'disabled'}>+</button>
      </div>
      <p class="hint">${effHint}${stockLine}${Number.isFinite(cap) ? `<br>本站点最多 ${cap} 人${def?.canBuildMultiple ? `（${this.getPointBuildingCount(id)} 座 ×${def.maxWorkers}）` : ''}` : ''}${hungerHint}</p>
    `;
  }

  formatToolStockLine(toolId) {
    const def = GAME_DATA.villagerTools[toolId];
    const max = def?.maxLevel || 3;
    const parts = [];
    for (let lv = 1; lv <= max; lv++) {
      const n = this.getToolCount(toolId, lv);
      if (n > 0) parts.push(`${def.levelNames?.[lv] || `Lv${lv}`}×${n}`);
    }
    return parts.length ? parts.join(' · ') : '无';
  }

  renderWorkerStationRow(type, id) {
    const def = this.getStationDef(type, id);
    const st = this.getStationState(type, id);
    const autoSpeed = this.getStationAutoSpeed(type, id);
    const isActive = this.state.activeStation.type === type && this.state.activeStation.id === id;
    const isCraft = type === 'recipe';

    if (isCraft) {
      const queue = this.state.craftOrderQueue || [];
      const orders = queue.filter(o => o.recipeId === id);
      const totalCount = orders.reduce((s, o) => s + o.count, 0);
      const globalCraft = this.state.workers?.craftWorkers || 0;
      const row = document.createElement('div');
      row.className = `worker-station-row ${isActive ? 'active' : ''}`;
      row.dataset.stationType = type;
      row.dataset.stationId = id;
      row.innerHTML = `
        <button type="button" class="worker-station-goto" data-station-type="${type}" data-station-id="${id}" title="前往此站点">
          <span class="worker-station-icon">${def.icon}</span>
          <span class="worker-station-info">
            <span class="worker-station-name">${def.name}</span>
            <span class="worker-station-speed">${autoSpeed > 0 ? `${autoSpeed.toFixed(2)}/秒` : '无自动进度'}</span>
          </span>
        </button>
        <span class="worker-count">×${totalCount}</span>
        <div class="worker-controls worker-controls-compact">
          <button type="button" class="btn-worker btn-worker-unassign" data-station-type="recipe" data-station-id="__global__" ${globalCraft > 0 ? '' : 'disabled'}>−</button>
          <span class="worker-count">🧑 ${globalCraft}</span>
          <button type="button" class="btn-worker btn-worker-assign" data-station-type="recipe" data-station-id="__global__" ${this.state.workers.unassigned > 0 ? '' : 'disabled'}>+</button>
        </div>
      `;
      return row;
    }

    const tooled = this.getTooledVillagerCount(type, id);
    const cap = this.getStationWorkerCap(type, id);
    const countLabel = Number.isFinite(cap)
      ? `${st.assignedWorkers}/${cap}`
      : `${st.assignedWorkers}`;
    const row = document.createElement('div');
    row.className = `worker-station-row ${isActive ? 'active' : ''}`;
    row.dataset.stationType = type;
    row.dataset.stationId = id;
    row.innerHTML = `
      <button type="button" class="worker-station-goto" data-station-type="${type}" data-station-id="${id}" title="前往此站点">
        <span class="worker-station-icon">${def.icon}</span>
        <span class="worker-station-info">
          <span class="worker-station-name">${def.name}</span>
          <span class="worker-station-speed">${st.assignedWorkers > 0
            ? (this.isVillagersResting()
              ? '🌙休息中'
              : `${autoSpeed.toFixed(2)}/秒${tooled ? ` · 🔧${tooled}` : ''}`)
            : '无自动进度'}</span>
        </span>
      </button>
      <div class="worker-controls worker-controls-compact">
        <button type="button" class="btn-worker btn-worker-unassign" data-station-type="${type}" data-station-id="${id}" ${this.canDecreaseWorkerAllocation(type, id) ? '' : 'disabled'}>−</button>
        <span class="worker-count">${countLabel}</span>
        <button type="button" class="btn-worker btn-worker-assign" data-station-type="${type}" data-station-id="${id}" ${this.canIncreaseWorkerAllocation(type, id) ? '' : 'disabled'}>+</button>
      </div>
    `;
    return row;
  }

  renderWorkers() {
    const container = document.getElementById('worker-overview');
    const working = this.state.workers.total - this.state.workers.unassigned;
    const capacity = this.getVillageCapacity();
    const empty = this.getEmptyHouseSlots();
    const savedLayout = this.hasSavedWorkerLayout();
    const canRestore = savedLayout && this.state.workers.unassigned > 0
      && this.getTotalPlannedWorkers() > working;
    const buildCost = this.getHouseBuildCost();
    const canBuild = this.canBuildHouse();
    const breedCost = this.getBreedCost();
    const canBreed = this.canBreedVillager();
    const hungry = this.getHungryCount();
    const pendingBreeds = this.state.pendingBreeds || 0;
    const dailyMax = this.getMaxDailyBreeds();
    const dailyLeft = this.getRemainingDailyBreedQuota();
    const restStart = GAME_DATA.calendar?.restStartHour ?? 22;
    const breedStatus = pendingBreeds > 0
      ? (this.isVillagersResting()
        ? `繁殖中 ×${pendingBreeds}，明日日结时新增人口`
        : `已预约 ×${pendingBreeds}，今晚 ${String(restStart).padStart(2, '0')}:00 后开始`)
      : `今日还可预约 ${dailyLeft}/${dailyMax}（上限为当前人口的一半）`;
    const ageStats = this.getVillagerAgeStats();

    const buildProgress = this.state.houseBuildProgress;
    const buildProgressHtml = buildProgress
      ? `<div class="hint">🏗️ 建造中：${(buildProgress.progress / buildProgress.maxCount * 100).toFixed(0)}%<div class="bar-track"><div class="bar-fill gate" style="width:${Math.min(100, buildProgress.progress / buildProgress.maxCount * 100)}%"></div></div></div>`
      : '';

    container.innerHTML = `
      <div class="worker-stats">
        <div class="stat"><span class="stat-label">村民</span><span class="stat-value">${this.state.workers.total}/${capacity}</span></div>
        <div class="stat"><span class="stat-label">空闲</span><span class="stat-value">${ageStats.growing > 0 ? this.getEffectiveUnassigned().toFixed(1) : this.state.workers.unassigned}</span></div>
        <div class="stat"><span class="stat-label">工作中</span><span class="stat-value">${working}</span></div>
        <div class="stat"><span class="stat-label">🧒成长期</span><span class="stat-value">${ageStats.growing}</span></div>
        ${ageStats.growing > 0 ? `<div class="stat"><span class="stat-label">有效总劳力</span><span class="stat-value">${this.getEffectiveWorkforce().toFixed(1)}</span></div>` : ''}
        ${hungry > 0 ? `<div class="stat hungry"><span class="stat-label">饥饿</span><span class="stat-value">${hungry}</span></div>` : ''}
        ${pendingBreeds > 0 ? `<div class="stat breed-pending"><span class="stat-label">预约繁殖</span><span class="stat-value">${pendingBreeds}</span></div>` : ''}
      </div>
      ${hungry > 0 ? `<p class="hint hunger-hint">⚠ ${hungry} 名村民饥饿中：自动工作效率减半；若明日仍缺粮将饿死</p>` : ''}
      ${this.isVillagersResting() ? '<p class="hint rest-hint">🌙 夜间休息（22:00–06:00）：自动工作已暂停，手动点击采集/制作仍可用</p>' : ''}
      <div class="village-breed ${empty > 0 && dailyLeft > 0 ? 'active' : ''} ${canBreed ? 'affordable' : 'unaffordable'}" id="tutorial-village-breed">
        <h4>🐣 繁殖村民</h4>
        <p class="hint">${empty > 0
          ? `白天预约，当晚开始，次日加人（直接进入成长期）。房屋空位 ${empty}（含预约占用）。${breedStatus}`
          : '房屋已满员（或已被预约占满），建造或升级房屋以增加人口上限'}</p>
        <div class="upgrade-action">
          <span class="cost">${this.formatCost(breedCost)}</span>
          <button type="button" class="btn-craft btn-breed-villager" ${canBreed ? '' : 'disabled'}>预约繁殖</button>
        </div>
      </div>
      <div class="house-build-panel ${canBuild ? 'affordable' : 'unaffordable'}">
        <h4>🏠 建造房屋</h4>
        <p class="hint">需要 20 点建造进度自动完成。容量：基础2，每升1级+2</p>
        <div class="upgrade-action">
          <span class="cost">${this.formatCost(buildCost)}</span>
          <button type="button" class="btn-craft btn-build-house" ${canBuild ? '' : 'disabled'}>${buildProgress ? '建造中...' : '开始建造'}</button>
        </div>
        ${buildProgressHtml}
      </div>
      <div class="worker-actions" id="tutorial-worker-manage">
        <button type="button" class="dev-btn worker-action-btn" id="recall-all-workers" ${working <= 0 ? 'disabled' : ''}>全部收回</button>
        <button type="button" class="dev-btn worker-action-btn worker-action-restore" id="apply-worker-layout" ${canRestore ? '' : 'disabled'}>恢复分配</button>
      </div>
      <div class="worker-section">
        <h4>🏭 生产工人</h4>
        <div class="worker-controls">
          <button type="button" class="btn-worker btn-worker-unassign" data-station-type="recipe" data-station-id="__global__" ${(this.state.workers?.craftWorkers || 0) > 0 ? '' : 'disabled'}>−</button>
          <span class="worker-count">🧑 ${this.state.workers?.craftWorkers || 0}</span>
          <button type="button" class="btn-worker btn-worker-assign" data-station-type="recipe" data-station-id="__global__" ${(this.state.workers.unassigned || 0) > 0 ? '' : 'disabled'}>+</button>
        </div>
        <p class="hint">分配到某个订单后该订单自动置顶。手动点击可生产任意订单。</p>
      </div>
      <p class="worker-actions-hint">持对应工具效率更高（等级越高越快）；徒手固定 ${this.getVillagerBaseSpeed()}/秒。工具在工具页制作/升级。新生村民直接进入成长期（约 2 天，劳动力按 0.5 计），第 3 个天亮转为成年人。</p>
    `;

    const houseSection = document.createElement('div');
    houseSection.className = 'worker-section';
    houseSection.innerHTML = '<h4>房屋（按等级合并）</h4>';
    const houseList = document.createElement('div');
    houseList.className = 'house-list';
    const maxLv = GAME_DATA.housing.maxHouseLevel || 2;
    const upgradeProgress = this.state.houseUpgradeProgress || {};
    for (let lv = 0; lv <= maxLv; lv++) {
      const group = this.getHousesByLevel(lv);
      if (!group.length) continue;
      const count = group.length;
      const capEach = this.getHouseCapacity(group[0]);
      const capTotal = capEach * count;
      const isMaxed = lv >= maxLv;
      const next = lv + 1;
      const upCost = !isMaxed ? this.getHouseUpgradeCost(next) : null;
      const techUnlocked = isMaxed || this.isHouseUpgradeTechUnlocked(next);
      const canUp = !isMaxed && techUnlocked && this.canUpgradeHouseLevel(lv);
      const upName = GAME_DATA.housing.upgrades[next]?.name || `升级至 Lv.${next}`;
      const techDef = !isMaxed ? GAME_DATA.techTree.find(t => t.id === this.getHouseUpgradeTechId(next)) : null;

      // 检查是否有进行中的升级
      let upgradingHtml = '';
      let upgradeBtnDisabled = !canUp;
      group.forEach(h => {
        const p = upgradeProgress[h.id];
        if (p) {
          const pct = Math.min(100, (p.progress / p.maxCount) * 100);
          upgradingHtml += `<div class="hint" style="margin-top:4px;font-size:0.75rem;">🏗️ 升级中（${h.id}）：${pct.toFixed(0)}%<div class="bar-track" style="height:6px;margin:2px 0;"><div class="bar-fill gate" style="width:${pct}%;height:100%;"></div></div></div>`;
          upgradeBtnDisabled = true; // 有进行中的升级则禁用升级按钮
        }
      });

      const el = document.createElement('div');
      el.className = `house-item ${isMaxed ? 'maxed' : (canUp ? 'affordable' : 'unaffordable')}`;
      el.dataset.houseLevel = String(lv);
      const descText = isMaxed
        ? '已满级'
        : (!techUnlocked
          ? `需先解锁科技「${techDef?.name || upName}」`
          : `${upName}：${GAME_DATA.housing.upgrades[next]?.desc || '人口容量 +2'}（消耗材料后自动升级）`);
      const costText = isMaxed
        ? '已满级'
        : (!techUnlocked ? `🔒 ${techDef?.name || '未解锁科技'}` : this.formatCost(upCost));
      const btnText = isMaxed
        ? '已满级'
        : (!techUnlocked
          ? '需科技'
          : (this.state.houseUpgradeProgress && Object.values(this.state.houseUpgradeProgress).some(p => p.targetLevel === next) ? '升级中' : '开始升级'));
      el.innerHTML = `
        <div class="upgrade-info">
          <span>🏠 ${this.getHouseLevelLabel(lv)} <strong>×${count}</strong>
            <small class="level-tag">${this.formatUpgradeLevel(lv, maxLv)}</small>
            <small> · ${capEach}/间 · 合计容量 ${capTotal}</small>
          </span>
          <span class="upgrade-desc">${descText}</span>
          ${upgradingHtml}
        </div>
        <div class="upgrade-action">
          <span class="cost">${costText}</span>
          <button type="button" class="btn-upgrade btn-upgrade-house" data-house-level="${lv}" ${upgradeBtnDisabled ? 'disabled' : ''}>${btnText}</button>
        </div>
      `;
      houseList.appendChild(el);
    }
    houseSection.appendChild(houseList);
    container.appendChild(houseSection);

    const allPoints = Object.keys(GAME_DATA.resourcePoints)
      .filter(id => this.isPointVisibleInSidebar(id) && !GAME_DATA.resourcePoints[id].isTreasureChest && !GAME_DATA.resourcePoints[id].isAltar && !GAME_DATA.resourcePoints[id].isDemonKing && !GAME_DATA.resourcePoints[id].isBossPoint);
    const foragePoints = allPoints
      .filter(id => GAME_DATA.resourcePoints[id].isFoodPoint)
      .map(id => ({ type: 'point', id }));
    const gatherPoints = allPoints
      .filter(id => !GAME_DATA.resourcePoints[id].isFoodPoint)
      .map(id => ({ type: 'point', id }));
    const recipes = this.getAllCraftOrders()
      .map(o => ({ type: 'recipe', id: o.recipeId }));

    const appendStationSection = (title, stations) => {
      if (!stations.length) return;
      const section = document.createElement('div');
      section.className = 'worker-section';
      section.innerHTML = `<h4>${title}</h4>`;
      const list = document.createElement('div');
      list.className = 'worker-station-list';
      stations.forEach(({ type, id }) => list.appendChild(this.renderWorkerStationRow(type, id)));
      section.appendChild(list);
      container.appendChild(section);
    };

    appendStationSection('觅食', foragePoints);
    appendStationSection('采集点', gatherPoints);
    appendStationSection('生产订单', recipes);
  }

  /** 合成/工具共用的订单卡片 */
  createCraftOrderCard(recipe) {
    const canCraftOne = this.canAffordCraft(recipe.id, 1);
    const st = this.state.craftStations[recipe.id];
    if (!st) return null;
    const queueCount = this.getCraftQueueCount(recipe.id);
    let toolLevelTag = '';
    let toolId = null;
    let toolLevel = 1;
    if (recipe.isToolRecipe && recipe.outputTools) {
      const [[tid, out]] = Object.entries(recipe.outputTools);
      toolId = tid;
      toolLevel = out?.level || 1;
      const max = GAME_DATA.villagerTools[toolId]?.maxLevel || 3;
      toolLevelTag = ` <small class="level-tag">${this.formatUpgradeLevel(toolLevel, max)}</small>`;
    }
    const el = document.createElement('div');
    el.className = `craft-overview-item ${canCraftOne ? 'affordable' : 'unaffordable'}${recipe.isToolRecipe ? ' craft-tool-recipe' : ''}${this.shouldFlashUnlockRecipe(recipe.id) ? ' unlock-flash' : ''}`;
    el.dataset.recipeId = recipe.id;
    if (toolId) {
      el.dataset.toolId = toolId;
      el.dataset.toolLevel = String(toolLevel);
    }

    let autoControlsHtml;
    if (recipe.isToolRecipe) {
      const autoRepair = st.autoRepair !== false;
      const threshold = st.autoRepairThreshold ?? 10;
      autoControlsHtml = `
        <div class="craft-auto-controls craft-auto-repair-controls">
          <label class="craft-auto-label">
            <input type="checkbox" class="craft-auto-repair" data-recipe-id="${recipe.id}" ${autoRepair ? 'checked' : ''}>
            自动修复
          </label>
          <span class="craft-auto-options" style="${autoRepair ? '' : 'display:none'}">
            <span class="craft-auto-threshold-label">低于</span>
            <input type="number" class="craft-auto-repair-threshold" data-recipe-id="${recipe.id}"
              min="1" max="99" value="${threshold}"
              title="耐久百分比低于此值时自动排队修复">
            <span class="craft-auto-threshold-unit">%</span>
          </span>
          <button type="button" class="btn-repair-all-tools" data-tool-id="${toolId}" data-tool-level="${toolLevel}">修复全部</button>
        </div>`;
    } else if (this.isAutoProduceUnlocked()) {
      autoControlsHtml = `
        <div class="craft-auto-controls">
          <label class="craft-auto-label">
            <input type="checkbox" class="craft-auto-produce" data-recipe-id="${recipe.id}" ${st.autoProduce ? 'checked' : ''}>
            自动生产
          </label>
          <span class="craft-auto-options" style="${st.autoProduce ? '' : 'display:none'}">
            <select class="craft-auto-mode" data-recipe-id="${recipe.id}">
              <option value="always" ${(st.autoMode || 'always') === 'always' ? 'selected' : ''}>一直生产</option>
              <option value="stock" ${st.autoMode === 'stock' ? 'selected' : ''}>库存&lt;</option>
            </select>
            <input type="number" class="craft-auto-threshold" data-recipe-id="${recipe.id}"
              min="1" max="9999" value="${st.autoThreshold ?? 10}"
              style="${st.autoMode === 'stock' ? '' : 'display:none'}"
              title="库存低于此值时自动生产">
          </span>
        </div>`;
    } else {
      autoControlsHtml = '';
    }

    el.innerHTML = `
      <div class="craft-overview-header">
        <span>${recipe.icon} ${recipe.name}${toolLevelTag}${queueCount > 0 ? ` <small class="craft-queue-inline">×${queueCount}</small>` : ''}</span>
        ${autoControlsHtml}
      </div>
      <div class="craft-overview-recipe">${this.formatRecipeLine(recipe)}</div>
      <div class="craft-order-hint">生产即扣材料 · 🧑${this.state.workers?.craftWorkers || 0}</div>
      <div class="craft-actions craft-produce-actions">
        <div class="craft-produce-input-wrap">
          <span class="craft-produce-label">生产</span>
          <input type="number" class="craft-produce-input" data-recipe-id="${recipe.id}" min="1" value="1" inputmode="numeric">
        </div>
        <button type="button" class="btn-craft btn-craft-produce-confirm" data-recipe-id="${recipe.id}" ${canCraftOne ? '' : 'disabled'}>确定</button>
      </div>
    `;
    return el;
  }

  renderTools() {
    this.renderGearPanel('tools');
    this.renderGearPanel('weapons');
  }

  /** @param {'tools'|'weapons'} kind */
  renderGearPanel(kind) {
    const combatOnly = kind === 'weapons';
    const container = document.getElementById(combatOnly ? 'weapon-list' : 'tool-list');
    if (!container) return;
    container.innerHTML = '';

    const title = combatOnly ? '武器' : '工具';
    const header = document.createElement('div');
    header.className = 'tools-panel-header';
    header.innerHTML = `
      <h4>${title}</h4>
      <div class="tools-panel-hint"></div>
    `;
    container.appendChild(header);

    const entries = Object.entries(GAME_DATA.villagerTools || {})
      .filter(([, def]) => !!def.combat === combatOnly);

    if (!this.isTechUnlocked('unlock_workbench')) {
      const hasAnyStock = entries.some(([id]) => this.getToolCount(id) > 0);
      if (!hasAnyStock) {
        const tip = document.createElement('p');
        tip.className = 'hint';
        tip.textContent = combatOnly
          ? '解锁「工作台」后，再解锁对应武器科技，即可制作武器与护甲。'
          : '解锁「工作台」后，再解锁对应工具科技，即可制作采集工具。';
        container.appendChild(tip);
        return;
      }
    }

    let anyShown = false;
    entries.forEach(([id, def]) => {
      const max = def.maxLevel || 3;
      const levels = [];
      for (let lv = 1; lv <= max; lv++) {
        const n = this.getToolCount(id, lv);
        const recipe = this.getToolRecipe(id, lv);
        const canCraft = !!(recipe && this.isRecipeTechUnlocked(recipe.id));
        // 未解锁且无库存的高阶档不显示
        if (n <= 0 && !canCraft) continue;
        levels.push({ lv, n, recipe: canCraft ? recipe : null });
      }
      if (!levels.length) return;
      if (!this.isTechUnlocked('unlock_workbench') && this.getToolCount(id) <= 0) return;

      anyShown = true;
      const total = this.getToolCount(id);
      const highestShown = levels[levels.length - 1].lv;
      const targets = (def.targets || [])
        .map(pid => GAME_DATA.resourcePoints[pid]?.name)
        .filter(Boolean)
        .join('、');
      const usersByLevel = this.getToolActiveUsersByLevel(id);

      const el = document.createElement('div');
      el.className = `tool-item ${total > 0 ? 'affordable' : 'unaffordable'}`;

      const icon = document.createElement('div');
      icon.className = 'tool-icon';
      icon.textContent = def.icon;

      const info = document.createElement('div');
      info.className = 'tool-info';
      info.innerHTML = `
        <div class="tool-name">${def.name} <strong>共 ${total}</strong>
          <small class="level-tag">当前可见 ${this.formatUpgradeLevel(highestShown, max)}</small>
        </div>
        <div class="tool-desc">${
          def.combat && targets
            ? `采集：${targets} · 亦可作战`
            : (def.combat ? '防务装备' : `适用：${targets || '—'}`)
        } · 耐久随使用消耗</div>
      `;

      const levelsWrap = document.createElement('div');
      levelsWrap.className = 'tool-levels';

      levels.forEach(({ lv, n, recipe }) => {
        const block = document.createElement('div');
        block.className = 'tool-level-block';

        const name = def.levelNames?.[lv] || `Lv.${lv}`;
        if (n <= 0) {
          const maxDurEmpty = this.getToolMaxDurability(lv);
          block.innerHTML = `
            <div class="tool-level-row" data-tool-id="${id}" data-tool-level="${lv}">
              <div class="tool-level-main">
                <span>${def.icon} ${name} <small class="level-tag">${this.formatUpgradeLevel(lv, max)}</small></span>
                <span>×0</span>
                <span class="tool-level-speed">${
                  def.combat && targets
                    ? `${this.getToolSpeed(lv)}/秒 · 可作战`
                    : (def.combat ? '战斗' : `${this.getToolSpeed(lv)}/秒`)
                } · 耐久${maxDurEmpty}</span>
              </div>
            </div>
          `;
        } else {
          const dur = this.getToolDurability(id, lv);
          const maxDur = id === 'armor' ? this.getArmorMaxDurability(lv) : this.getToolMaxDurability(lv);
          const pct = maxDur > 0 ? Math.max(0, Math.min(100, (dur / maxDur) * 100)) : 0;
          const users = usersByLevel[lv] || 0;
          const equippedN = id === 'armor' ? this.countEquippedArmor(lv) : 0;
          const repairing = this.countRepairingTools(id, lv);
          const warehoused = this.countWarehousedTools(id, lv);
          const usable = this.getUsableToolCount(id, lv);
          const tags = [];
          if (repairing > 0) tags.push(`修中${repairing}`);
          if (warehoused > 0) tags.push(`仓禁${warehoused}`);
          const countLabel = tags.length ? `×${n}（${tags.join('·')}）` : `×${n}`;
          const repairHint = repairing > 0 ? ` · 修中×${repairing}` : '';
          const warehouseHint = warehoused > 0 ? ` · 仓禁×${warehoused}` : '';
          const armorHint = id === 'armor'
            ? (equippedN > 0 ? ` · 上场×${equippedN}` : '')
            : '';
          const usableHint = usable < n ? ` · 可用×${usable}` : '';
          block.innerHTML = `
            <div class="tool-level-row has-stock ${pct < 35 ? 'durability-low' : ''}" data-tool-id="${id}" data-tool-level="${lv}">
              <div class="tool-level-main">
                <span>${def.icon} ${name} <small class="level-tag">${this.formatUpgradeLevel(lv, max)}</small></span>
                <span class="tool-level-count">${countLabel}</span>
                <span class="tool-level-speed">${
                  def.combat && targets
                    ? `${this.getToolSpeed(lv)}/秒 · 可作战`
                    : (def.combat ? (id === 'armor' ? `甲血=${maxDur}` : '战斗') : `${this.getToolSpeed(lv)}/秒`)
                }</span>
              </div>
              <div class="tool-durability-row">
                <div class="tool-durability-bar" title="耐久 ${dur.toFixed(0)}/${maxDur}${users ? ` · 使用中 ×${users}` : ''}${usableHint}${repairHint}${warehouseHint}${armorHint}">
                  <div class="tool-durability-fill" style="width:${pct}%"></div>
                </div>
                <span class="tool-durability-text">${Math.ceil(dur)}/${maxDur}${users ? ` · 用×${users}` : ''}${repairHint}${warehouseHint}</span>
              </div>
            </div>
          `;
        }

        if (recipe) {
          const craftWrap = document.createElement('div');
          craftWrap.className = 'tool-level-craft';
          const card = this.createCraftOrderCard(recipe);
          if (card) craftWrap.appendChild(card);
          block.appendChild(craftWrap);
        }

        levelsWrap.appendChild(block);
      });

      info.appendChild(levelsWrap);
      el.appendChild(icon);
      el.appendChild(info);
      container.appendChild(el);
    });

    if (!anyShown) {
      const tip = document.createElement('p');
      tip.className = 'hint';
      tip.textContent = combatOnly
        ? '解锁「工作台」或对应材料科技后，武器与护甲配方会显示在此。'
        : '解锁「工作台」或对应材料科技后，工具与配方会显示在此。';
      container.appendChild(tip);
    }
  }

  renderTabs() {
    // 合成/工具未解锁时切回仓库，切勿回落到科技合屏（会挡住中间采集）
    if (!this.isTabUnlocked(this.state.activeTab)) {
      this.state.activeTab = 'warehouse';
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const tab = btn.dataset.tab;
      const unlocked = this.isTabUnlocked(tab);
      btn.hidden = !unlocked;
      btn.classList.toggle('tab-locked', !unlocked);
      btn.classList.toggle('active', unlocked && tab === this.state.activeTab);
      btn.classList.toggle('flash-hint', unlocked && this.shouldFlashUnlockTab(tab));
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const tab = panel.id.replace(/^tab-/, '');
      const unlocked = this.isTabUnlocked(tab);
      panel.classList.toggle('active', unlocked && tab === this.state.activeTab);
      panel.classList.toggle('flash-hint-panel', unlocked && this.shouldFlashUnlockTab(tab));
    });
    // 科技树 / 防务：中+右合屏覆盖
    if (this.state.activeTab === 'tech') {
      this._showTechTreeOverlay();
      this._hideDefenseOverlay();
    } else if (this.state.activeTab === 'defense') {
      this._hideTechTreeOverlay();
      this._showDefenseOverlay();
    } else {
      this._hideTechTreeOverlay();
      this._hideDefenseOverlay();
    }
  }

  // ========== 科技树 / 防务覆盖（中+右2栏） ==========

  _techTreeOverlayShown() {
    return !document.getElementById('tech-tree-overlay')?.classList.contains('hidden');
  }

  _showTechTreeOverlay() {
    const overlay = document.getElementById('tech-tree-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  _hideTechTreeOverlay() {
    const overlay = document.getElementById('tech-tree-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  _showDefenseOverlay() {
    const overlay = document.getElementById('defense-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  _hideDefenseOverlay() {
    const overlay = document.getElementById('defense-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  _normalizeTechNodeSize(size) {
    return size === 'small' || size === 'large' ? size : 'medium';
  }

  _getTechNodeLayoutSize(techId) {
    const node = GAME_DATA.techTreeLayout?.nodes?.[techId];
    return this._normalizeTechNodeSize(node?.size);
  }

  _getTechNodeRadius(techId) {
    const size = this._getTechNodeLayoutSize(techId);
    const rootR = { small: 38, medium: 56, large: 75 };
    const nodeR = { small: 30, medium: 45, large: 60 };
    return techId === 'unlock_workbench' ? rootR[size] : nodeR[size];
  }

  _applyTechNodeSizeClass(el, techId) {
    if (!el) return;
    const size = this._getTechNodeLayoutSize(techId);
    el.classList.remove('tech-size-small', 'tech-size-medium', 'tech-size-large');
    el.classList.add(`tech-size-${size}`);
  }

  /** 点击科技树覆盖背景 → 不做任何事 */
  _setupTechTreeOverlayEvents() {
    const overlay = document.getElementById('tech-tree-overlay');
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === document.getElementById('tech-tree-canvas') || e.target.classList.contains('tech-connectors')) {
        // 点击空白区域不做任何操作
        return;
      }
    });
  }

  /** 应用科技树平移 + 缩放 */
  _applyTechTreeTransform() {
    const content = this._techNodes;
    if (!content) return;
    const z = this._techZoom ?? 1;
    content.style.transform = `translate(${this._panX}px, ${this._panY}px) scale(${z})`;
  }

  /** 将工作台节点置于画布视口中心 */
  _centerTechTreeOnRoot() {
    const canvas = document.getElementById('tech-tree-canvas');
    const wb = GAME_DATA.techTreeLayout?.nodes?.unlock_workbench;
    if (!canvas || !wb || !this._techNodes) return;
    const z = this._techZoom ?? 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    this._panX = rect.width / 2 - wb.x * z;
    this._panY = rect.height / 2 - wb.y * z;
    this._applyTechTreeTransform();
    return true;
  }

  /** 一次性初始化科技树的固定布局（所有节点位置冻结） */
  _initTechTreeLayout() {
    if (this._techTreeInited) return;
    this._techTreeInited = true;

    const canvas = document.getElementById('tech-tree-canvas');
    if (!canvas) return;
    const overlay = canvas.closest('.tech-tree-overlay');
    if (!overlay) return;

    // 拖拽平移 + 滚轮缩放状态
    this._panX = 0;
    this._panY = 0;
    this._techZoom = 1;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;

    // 清空并重建内容容器
    let content = document.getElementById('tech-tree-content');
    if (!content) {
      content = document.createElement('div');
      content.id = 'tech-tree-content';
      content.className = 'tech-tree-content';
    }

    // 保留 SVG 引用（canvas 清空后 getElementById 会找不到）
    let svg = canvas.querySelector('#tech-connectors');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'tech-connectors';
      svg.setAttribute('class', 'tech-connectors');
    }
    this._techSvg = svg;

    // 清空 canvas，只保留 content
    while (canvas.firstChild) canvas.removeChild(canvas.firstChild);
    canvas.appendChild(content);
    content.innerHTML = '';

    // 从 data.js 静态布局表读取坐标与连线关系
    const layout = GAME_DATA.techTreeLayout;
    if (!layout?.nodes) {
      console.warn('[TechTree] techTreeLayout 未配置');
      return;
    }

    const nodeRadius = (techId) => this._getTechNodeRadius(techId);

    content.style.width = (layout.canvas?.width || 1320) + 'px';
    content.style.height = (layout.canvas?.height || 1660) + 'px';

    // 创建所有节点 DOM（坐标来自布局表）
    GAME_DATA.techTree.forEach(tech => {
      const entry = layout.nodes[tech.id];
      if (!entry) {
        console.warn('[TechTree] 缺少布局项:', tech.id);
        return;
      }
      const isCenter = !entry.parent;
      const half = nodeRadius(tech.id);

      const el = document.createElement('div');
      el.className = 'tech-node';
      if (isCenter) el.classList.add('center-node');
      this._applyTechNodeSizeClass(el, tech.id);
      this._setTechNodeIcon(el, tech, isCenter);
      el.style.left = (entry.x - half) + 'px';
      el.style.top = (entry.y - half) + 'px';
      el.dataset.techId = tech.id;
      el.style.display = 'none';

      el.addEventListener('mouseenter', () => this._refreshTechTooltipForEl(el));
      el.addEventListener('mouseleave', () => this._hideTechTooltip());

      content.appendChild(el);
    });

    // 必须先挂上 _techNodes，再算焦点并写 transform（此前会因引用为空而跳过，导致首开跑偏）
    this._techNodes = content;
    if (!this._centerTechTreeOnRoot()) {
      requestAnimationFrame(() => this._centerTechTreeOnRoot());
    }

    content.addEventListener('click', (e) => {
      const node = e.target.closest('.tech-node');
      if (!node || node.classList.contains('state-hint')) return;
      e.stopPropagation();
      if (this._techEditMode) return;
      this._tryUnlockTechNode(node.dataset.techId);
    });

    // 画 SVG 直线（parent 来自布局表）
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const cw = layout.canvas?.width || 1320;
    const ch = layout.canvas?.height || 1660;
    svg.setAttribute('viewBox', `0 0 ${cw} ${ch}`);
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = cw + 'px';
    svg.style.height = ch + 'px';
    svg.style.right = 'auto';
    svg.style.bottom = 'auto';

    Object.entries(layout.nodes).forEach(([childId, entry]) => {
      // 无科技定义的布局节点不画线（已删高级矿 / unlock 残留）
      const hasTech = (GAME_DATA.techTree || []).some((t) => t.id === childId);
      if (!hasTech) return;
      const parents = this._getTechLayoutParents(childId, entry, layout.nodes);
      parents.forEach((parentId) => {
        const from = layout.nodes[parentId];
        if (!from) return;
        const ep = this._clipTechEdgeEndpoints(
          { x: from.x, y: from.y },
          { x: entry.x, y: entry.y },
          nodeRadius(parentId),
          nodeRadius(childId)
        );
        if (!ep) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ep.x0);
        line.setAttribute('y1', ep.y0);
        line.setAttribute('x2', ep.x1);
        line.setAttribute('y2', ep.y1);
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.10)');
        line.setAttribute('stroke-width', '2.25');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('class', 'tech-edge');
        line.dataset.from = parentId;
        line.dataset.to = childId;
        svg.appendChild(line);
      });
    });

    content.insertBefore(svg, content.firstChild);

    // 拖拽平移（新手教程期间禁止拖动/缩放，避免工作台高亮被挪走）
    canvas.addEventListener('mousedown', (e) => {
      if (this.isTutorialActive()) return;
      if (e.button !== 1) return;
      if (e.target.closest('.tech-node, .tech-tooltip, #tt-btn')) return;
      e.preventDefault();
      this._isDragging = false;
      this._dragStartX = e.clientX - this._panX;
      this._dragStartY = e.clientY - this._panY;
      this._dragMoved = false;
      const onMove = (ev) => {
        if (this.isTutorialActive()) return;
        const dx = ev.clientX - this._dragStartX;
        const dy = ev.clientY - this._dragStartY;
        if (Math.abs(ev.clientX - e.clientX) > 3 || Math.abs(ev.clientY - e.clientY) > 3) {
          this._dragMoved = true;
        }
        this._panX = dx;
        this._panY = dy;
        this._applyTechTreeTransform();
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!this._dragMoved) this._isDragging = false;
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    canvas.addEventListener('wheel', (e) => {
      if (this.isTutorialActive()) {
        e.preventDefault();
        return;
      }
      if (e.target.closest('.tech-tooltip, #tt-btn')) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const ZOOM_MIN = 0.15;
      const ZOOM_MAX = 4.5;
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this._techZoom * factor));
      if (nextZoom === this._techZoom) return;
      const wx = (mx - this._panX) / this._techZoom;
      const wy = (my - this._panY) / this._techZoom;
      this._techZoom = nextZoom;
      this._panX = mx - wx * nextZoom;
      this._panY = my - wy * nextZoom;
      this._applyTechTreeTransform();
    }, { passive: false });
  }

  /** 设置科技树节点图标（资源点升级为双图标叠加） */
  _setTechNodeIcon(el, tech, isCenter = false) {
    if (isCenter) {
      el.textContent = '🔨';
      el.classList.remove('has-composite-icon');
      return;
    }
    if (tech.compositeIcon) {
      el.classList.add('has-composite-icon');
      el.innerHTML = `<span class="tech-node-composite"><span class="tech-node-res">${tech.compositeIcon.resource}</span><span class="tech-node-type">${tech.compositeIcon.type}</span></span>`;
      return;
    }
    el.classList.remove('has-composite-icon');
    el.textContent = tech.icon || '?';
  }

  _renderTechTooltipIcon(tech) {
    const iconEl = document.getElementById('tt-icon');
    if (!iconEl) return;
    if (tech.compositeIcon) {
      iconEl.innerHTML = `<span class="tech-node-composite tech-tooltip-composite"><span class="tech-node-res">${tech.compositeIcon.resource}</span><span class="tech-node-type">${tech.compositeIcon.type}</span></span>`;
    } else {
      iconEl.textContent = tech.icon || '?';
    }
  }

  /** 点击科技节点尝试解锁 */
  _tryUnlockTechNode(techId) {
    if (!techId) return;
    const tech = GAME_DATA.techTree.find(t => t.id === techId);
    if (!tech || !this.isTechVisible(tech)) return;
    const { current, max } = this.getTechRepeatLevel(tech);
    const maxed = !!(tech.repeatable && max && current >= max);
    if (maxed || !this.canUnlockTech(tech)) return;
    this.unlockTech(techId);
  }

  /** 科技节点视觉状态：可重复升级未满级时仍参与 affordability 判定 */
  _getTechNodeVisualState(tech) {
    const isUnlocked = this._isTechActiveUnlocked(tech.id);
    const { current, max } = this.getTechRepeatLevel(tech);
    const isMaxed = !!(tech.repeatable && max && current >= max) || this.isTechFullyComplete(tech);
    const canUnlock = !isMaxed && this.canUnlockTech(tech);
    if (isMaxed || (isUnlocked && !tech.repeatable)) return 'done';
    if (canUnlock) return 'affordable';
    return 'unaffordable';
  }

  _refreshTechTooltipForEl(el) {
    const tech = GAME_DATA.techTree.find(x => x.id === el?.dataset?.techId);
    if (!tech) return;
    const isHint = el.classList.contains('state-hint');
    if (isHint) {
      // "?" 节点仍展示说明，但不给解锁按钮
      const unlocked = false;
      const maxed = false;
      const canUnlock = false;
      this._showTechTooltip(el, tech, false, unlocked, maxed, canUnlock);
      const iconEl = document.getElementById('tt-icon');
      if (iconEl) iconEl.textContent = '?';
      return;
    }
    const unlocked = this._isTechActiveUnlocked(tech.id);
    const { current, max } = this.getTechRepeatLevel(tech);
    const maxed = !!(tech.repeatable && max && current >= max) || this.isTechFullyComplete(tech);
    const canUnlock = !maxed && this.isTechVisible(tech) && this.canUnlockTech(tech);
    this._showTechTooltip(el, tech, false, unlocked, maxed, canUnlock);
  }

  _refreshTechTooltipIfOpen() {
    const tip = document.getElementById('tech-tooltip');
    if (!tip || tip.classList.contains('hidden')) return;
    const el = this._techTooltipHoverEl;
    if (!el || el.dataset.techId !== this._techTooltipHoverId) return;
    this._refreshTechTooltipForEl(el);
  }

  /** 更新科技树显示：仅控制节点显隐 + 状态样式，不重新布局 */
  _updateTechTreeDisplay() {
    const svg = this._techSvg;
    const container = this._techNodes;
    if (!container) return;

    container.querySelectorAll('.tech-node').forEach(el => {
      const tech = GAME_DATA.techTree.find(t => t.id === el.dataset.techId);
      if (!tech) { el.style.display = 'none'; return; }

      const isRoot = tech.id === 'unlock_workbench';
      // 调整模式：全部显示真实图标（不要用迷雾「?」占位）
      if (this._techEditMode) {
        el.style.display = '';
        el.className = 'tech-node' + (isRoot ? ' center-node' : '');
        this._applyTechNodeSizeClass(el, tech.id);
        this._setTechNodeIcon(el, tech, isRoot);
        if (!el.textContent && !el.querySelector('.tech-node-composite')) {
          el.textContent = (tech.name && tech.name[0]) || tech.id.slice(0, 2) || '#';
        }
        el.classList.add('state-done');
        if (tech.id === this._techEditSelectedId) el.classList.add('tech-edit-selected');
        return;
      }
      const isHint = !isRoot && this.isTechHintVisible(tech);
      const isVisible = isRoot || this.isTechVisible(tech) || isHint;
      if (!isVisible) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';

      if (isHint) {
        el.className = 'tech-node state-hint';
        if (isRoot) el.classList.add('center-node');
        this._applyTechNodeSizeClass(el, tech.id);
        el.textContent = '?';
        el.classList.remove('has-composite-icon');
        return;
      }

      el.className = 'tech-node';
      if (isRoot) el.classList.add('center-node');
      this._applyTechNodeSizeClass(el, tech.id);
      this._setTechNodeIcon(el, tech, isRoot);
      el.classList.add('state-' + this._getTechNodeVisualState(tech));
    });

    if (svg) {
      // 调整模式：画出全部连线，便于改依赖
      if (this._techEditMode) {
        svg.querySelectorAll('.tech-edge').forEach((edge) => {
          edge.style.display = '';
          edge.setAttribute('stroke', 'rgba(120, 200, 255, 0.35)');
        });
        return;
      }
      svg.querySelectorAll('.tech-edge').forEach(edge => {
        const fromActive = this._isTechActiveUnlocked(edge.dataset.from);
        const toActive = this._isTechActiveUnlocked(edge.dataset.to);
        const fromVisible = fromActive || (() => {
          const t = GAME_DATA.techTree.find(x => x.id === edge.dataset.from);
          return t ? (this.isTechVisible(t) || this.isTechHintVisible(t)) : false;
        })();
        const toVisible = toActive || (() => {
          const t = GAME_DATA.techTree.find(x => x.id === edge.dataset.to);
          return t ? (this.isTechVisible(t) || this.isTechHintVisible(t)) : false;
        })();
        if (fromActive && toActive) {
          edge.setAttribute('stroke', 'rgba(76, 175, 80, 0.35)');
          edge.style.display = '';
        } else if (fromVisible && toVisible) {
          edge.setAttribute('stroke', 'rgba(255, 255, 255, 0.10)');
          edge.style.display = '';
        } else {
          edge.style.display = 'none';
        }
      });
    }
  }

  /**
   * 连线父节点：
   * - 布局显式 parents（如资源精炼双前置）→ 画多根线
   * - 布局 parent 优先（编辑器调整后即时生效）
   * - 否则 requires 首项
   */
  _getTechLayoutParents(childId, entry, nodes) {
    if (Array.isArray(entry?.parents) && entry.parents.length) {
      return entry.parents.filter((r) => nodes[r]);
    }
    if (entry?.parent && nodes[entry.parent]) return [entry.parent];
    const tech = GAME_DATA.techTree.find((t) => t.id === childId);
    if (tech?.requires) {
      const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
      const primary = reqs[0];
      return primary && nodes[primary] ? [primary] : [];
    }
    return [];
  }

  /** 线段端点缩至圈缘；间距不足时不画穿心线 */
  _clipTechEdgeEndpoints(from, to, fromR, toR, pad = 2) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const inset = fromR + toR + pad * 2;
    if (len <= inset) return null;
    const ux = dx / len;
    const uy = dy / len;
    return {
      x0: from.x + ux * (fromR + pad),
      y0: from.y + uy * (fromR + pad),
      x1: to.x - ux * (toR + pad),
      y1: to.y - uy * (toR + pad),
    };
  }

  renderTechTree() {
    const canvas = document.getElementById('tech-tree-canvas');
    if (!canvas) return;
    const overlay = canvas.closest('.tech-tree-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    const LAYOUT_VERSION = 53;
    if (this._techTreeLayoutVersion !== LAYOUT_VERSION) {
      this._techTreeInited = false;
      this._techTreeLayoutVersion = LAYOUT_VERSION;
    }
    if (!this._techTreeInited) {
      this._initTechTreeLayout();
    }
    this._updateTechTreeDisplay();
    this._refreshTechTooltipIfOpen();
  }

  _showTechTooltip(el, tech, isPlaceholder, isUnlocked, isMaxed, canUnlock) {
    const tip = document.getElementById('tech-tooltip');
    if (!tip) return;
    // 占位符不显示详情
    if (isPlaceholder) return;
    this._techTooltipHoverId = tech.id;
    this._techTooltipHoverEl = el;
    tip.classList.remove('hidden');

    this._renderTechTooltipIcon(tech);
    const cost = this.getTechCost(tech);
    const { current, max } = this.getTechRepeatLevel(tech);
    const levelTag = tech.repeatable && max ? ` Lv.${current}/${max}` : '';

    document.getElementById('tt-name').textContent = tech.name + levelTag;
    document.getElementById('tt-desc').textContent = tech.description;

    const costEl = document.getElementById('tt-cost');
    const btn = document.getElementById('tt-btn');
    const isFreeFollow = !tech.repeatable && this._isTechCostFree(tech);

    if (isMaxed) {
      costEl.textContent = '✓ 已满级';
      btn.classList.add('hidden');
    } else if (isUnlocked && !tech.repeatable) {
      costEl.textContent = isFreeFollow ? '✓ 已解锁（随父节点自动解锁）' : '✓ 已解锁';
      btn.classList.add('hidden');
    } else if (isFreeFollow) {
      costEl.textContent = '免费 · 父节点解锁后自动解锁';
      btn.classList.add('hidden');
    } else if (canUnlock) {
      costEl.innerHTML = '费用：' + this.formatCost(cost);
      btn.classList.remove('hidden');
      btn.textContent = tech.repeatable ? '升级' : '解锁';
      btn.disabled = false;
      btn.onclick = (e) => { e.stopPropagation(); this.unlockTech(tech.id); };
    } else {
      // 显示具体需求，能展示费用的都展示出来
      if (tech.requiresPointLevels && !this._arePointLevelRequirementsMet(tech)) {
        const need = [];
        if (this.getPointUpgradeLevel(tech.pointId, 'count') < tech.requiresPointLevels.count) {
          need.push(`采集升级满级（${this.getPointUpgradeLevel(tech.pointId, 'count')}/${tech.requiresPointLevels.count}）`);
        }
        if (this.getPointUpgradeLevel(tech.pointId, 'cooldown') < tech.requiresPointLevels.cooldown) {
          need.push(`资源恢复满级（${this.getPointUpgradeLevel(tech.pointId, 'cooldown')}/${tech.requiresPointLevels.cooldown}）`);
        }
        costEl.textContent = '🔒 需先完成：' + need.join('、');
        btn.classList.add('hidden');
      } else if (tech.requires) {
        const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
        const unmet = reqs.filter(r => !this._isTechActiveUnlocked(r));
        if (unmet.length > 0) {
          const names = unmet.map(r => {
            const t = GAME_DATA.techTree.find(x => x.id === r);
            return t?.name || r;
          });
          costEl.textContent = '🔒 前置科技：' + names.join(', ') + ' 未解锁';
          btn.classList.add('hidden');
        } else if (!this._canUnlockGateTech(tech) && tech.gateLevel) {
          costEl.textContent = '🔒 需先在科技树解锁上一级城门';
          btn.classList.add('hidden');
        } else if (tech.cost || cost) {
          costEl.innerHTML = '费用：' + this.formatCost(cost || tech.cost) + '<span class="dim" style="margin-left:4px">（材料不足）</span>';
          btn.classList.remove('hidden');
          btn.textContent = tech.repeatable ? '升级' : '解锁';
          btn.disabled = true;
        } else {
          costEl.textContent = '🔒 暂不可解锁';
          btn.classList.add('hidden');
        }
      } else if (!this._canUnlockGateTech(tech) && tech.gateLevel) {
        costEl.textContent = '🔒 需先在科技树解锁上一级城门';
        btn.classList.add('hidden');
      } else if (tech.cost || cost) {
        costEl.innerHTML = '费用：' + this.formatCost(cost || tech.cost) + '<span class="dim" style="margin-left:4px">（材料不足）</span>';
        btn.classList.remove('hidden');
        btn.textContent = tech.repeatable ? '升级' : '解锁';
        btn.disabled = true;
      } else {
        costEl.textContent = '🔒 暂不可解锁';
        btn.classList.add('hidden');
      }
    }

    // 定位 tips：相对于节点
    const rect = el.getBoundingClientRect();
    const tipW = 240;
    let left = rect.right + 10;
    let top = rect.top - 10;
    if (left + tipW > window.innerWidth - 10) left = rect.left - tipW - 10;
    if (top < 10) top = 10;
    if (top + 200 > window.innerHeight) top = window.innerHeight - 210;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  _hideTechTooltip() {
    document.getElementById('tech-tooltip')?.classList.add('hidden');
    this._techTooltipHoverId = null;
    this._techTooltipHoverEl = null;
  }

  renderCraftOverview() {
    const container = document.getElementById('craft-overview');
    container.innerHTML = '<h4>合成配方</h4><p class="hint craft-tab-hint">安排生产后立即扣材料；同类型合并显示'
      + (this.isAutoProduceUnlocked()
        ? '；勾选自动生产后队列清空会自动补 1 单'
        : '（解锁科技「自动生产」后可勾选自动补单）')
      + '</p>';

    const materialRecipes = GAME_DATA.recipes.filter(r => !r.isToolRecipe && this.isRecipeTechUnlocked(r.id));
    materialRecipes.forEach(recipe => {
      const card = this.createCraftOrderCard(recipe);
      if (card) container.appendChild(card);
    });

    if (!materialRecipes.length) {
      container.innerHTML += '<p class="hint">解锁「工作台」与对应合成科技后，配方会显示在此</p>';
    }
  }


}

let game;
async function startFactoryGame() {
  if (game) return game;
  game = new FactoryGame();
  window.game = game;
  await game.initAsync();
  return game;
}
window.startFactoryGame = startFactoryGame;
// 不在此自动启动：须等 boot.js 加载完 defense.js 等补丁后再调用 startFactoryGame()

