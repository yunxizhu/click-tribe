// 游戏音效（Web Audio API 合成音）
class GameSounds {
  constructor() {
    this.ctx = null;
    this._bound = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgm = null;
    this._game = null;
    this._masterVolume = 0.7;
    this._sfxVolume = 1;
    this._playBgm = true;
  }

  /** 设置游戏实例引用（用于 BGM 获取游戏状态） */
  setGame(game) {
    this._game = game;
  }

  /**
   * @param {{ masterVolume?: number, sfxVolume?: number, playBgm?: boolean }} opts
   * master/sfx: 0~1
   */
  applyUserAudioSettings(opts = {}) {
    if (opts.masterVolume != null) {
      const n = Number(opts.masterVolume);
      this._masterVolume = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.7));
    }
    if (opts.sfxVolume != null) {
      const n = Number(opts.sfxVolume);
      this._sfxVolume = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
    }
    if (opts.playBgm != null) this._playBgm = !!opts.playBgm;
    this.ensureContext();
    if (this.masterGain) {
      // 允许静音到 0（WebAudio 用极小值避免部分浏览器异常）
      this.masterGain.gain.value = this._masterVolume <= 0 ? 0.0001 : this._masterVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxVolume <= 0 ? 0.0001 : this._sfxVolume;
    }
    if (this.bgm && typeof this.bgm.applyUserAudioSettings === 'function') {
      this.bgm.applyUserAudioSettings({
        playBgm: this._playBgm,
        masterVolume: this._masterVolume,
      });
    }
  }

  bindUnlock() {
    if (this._bound) return;
    this._bound = true;

    // 立即尝试创建 AudioContext（浏览器可能返回 suspended 状态）
    this.ensureContext();

    const canStartGameBgm = () => {
      const g = this._game;
      if (!g || !g._inGameSession || g._atMainMenu) return false;
      // 中转黑屏不启；漫画期间可启（只会播袭击预告轨）
      if (g._bootTransitionActive) return false;
      return true;
    };

    // 监听 AudioContext 状态：一旦变为 running 就初始化 BGM（漫画/中转期间除外）
    if (this.ctx) {
      this.ctx.addEventListener('statechange', () => {
        if (this.ctx.state === 'running' && !this.bgm && canStartGameBgm()) {
          this._initBGM();
        }
      });
      // 立即尝试 resume — 若浏览器允许自动播放（或之前授权过）会直接成功
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (!this.bgm && canStartGameBgm()) this._initBGM();
        }).catch(() => {});
      }
      if (this.ctx.state === 'running' && canStartGameBgm()) {
        this._initBGM();
      }
    }

    const unlock = () => {
      this.ensureContext();
      if (canStartGameBgm()) {
        if (!this.bgm) this._initBGM();
        else if (this.bgm._tick) this.bgm._tick();
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  /** 在 AudioContext 就绪后初始化 BGM */
  _initBGM() {
    if (!this.ctx || !this.masterGain || !this._game) return;
    if (this.bgm) return; // 只初始化一次
    this.bgm = new BGMPlayer();
    this.bgm.init(this.ctx, this.masterGain, this._game);
    this.bgm.applyUserAudioSettings({
      playBgm: this._playBgm,
      masterVolume: this._masterVolume,
    });
  }

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = Math.max(0.0001, this._masterVolume);
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = Math.max(0.0001, this._sfxVolume);
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  tone(freq, start, duration, {
    type = 'sine',
    volume = 0.2,
    attack = 0.01,
    release = 0.08,
    detune = 0,
  } = {}) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const peak = Math.max(0.0001, volume);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.start(start);
    osc.stop(start + duration + release);
  }

  noiseBurst(start, duration, volume = 0.06) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, start);
    filter.Q.setValueAtTime(0.6, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(start);
    source.stop(start + duration);
  }

  playUnlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone(freq, t + i * 0.07, 0.18, { type: 'triangle', volume: 0.16, attack: 0.008, release: 0.12 });
    });
    this.tone(1318.5, t + 0.3, 0.28, { type: 'sine', volume: 0.1, attack: 0.02, release: 0.2 });
  }

  playHarvest(resourceId) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    const pitchMap = {
      wood: 440,
      plank: 493.88,
      stone: 392,
      clay: 370,
      brick: 415.3,
      copper_ore: 466.16,
      coal: 349.23,
      iron_ore: 415.3,
      copper_ingot: 554.37,
      iron_ingot: 587.33,
      steel: 659.25,
      gear: 622.25,
      food: 523.25,
    };
    const base = pitchMap[resourceId] || 480;
    this.tone(base * 1.5, t, 0.07, { type: 'square', volume: 0.05, attack: 0.002, release: 0.04 });
    this.tone(base, t + 0.02, 0.1, { type: 'triangle', volume: 0.14, attack: 0.004, release: 0.07 });
    this.noiseBurst(t, 0.04, 0.04);
  }

  playRecovery() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    this.tone(330, t, 0.12, { type: 'sine', volume: 0.08, attack: 0.02, release: 0.1 });
    this.tone(440, t + 0.08, 0.14, { type: 'sine', volume: 0.1, attack: 0.02, release: 0.12 });
    this.tone(554.37, t + 0.16, 0.18, { type: 'triangle', volume: 0.09, attack: 0.02, release: 0.14 });
  }

  /** 菜单按钮悬停 / 聚焦 */
  playUiFocus() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = performance.now();
    if (this._lastUiFocusAt && now - this._lastUiFocusAt < 35) return;
    this._lastUiFocusAt = now;
    const t = ctx.currentTime + 0.003;
    this.tone(920, t, 0.04, { type: 'sine', volume: 0.04, attack: 0.003, release: 0.035 });
    this.tone(1240, t + 0.012, 0.035, { type: 'triangle', volume: 0.028, attack: 0.002, release: 0.03 });
  }

  /** 菜单按钮点击 */
  playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime + 0.003;
    this.tone(480, t, 0.055, { type: 'triangle', volume: 0.18, attack: 0.002, release: 0.04 });
    this.tone(720, t + 0.018, 0.07, { type: 'sine', volume: 0.12, attack: 0.002, release: 0.05 });
    this.noiseBurst(t, 0.025, 0.05);
  }

  /**
   * 开场漫画结束：播放 clock_miss.mp3，返回 Promise（播完后 resolve）
   */
  playComicFinishSting() {
    this.ensureContext();
    const file = 'clock_miss.mp3';
    const url = typeof window.tribeMusicUrl === 'function'
      ? window.tribeMusicUrl(file)
      : (`music/${file}`);

    if (this._comicStingAudio) {
      try {
        this._comicStingAudio.pause();
        this._comicStingAudio.onended = null;
        this._comicStingAudio.onerror = null;
        this._comicStingAudio.src = '';
      } catch (_) { /* ignore */ }
      this._comicStingAudio = null;
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      try {
        const a = new Audio(url);
        a.preload = 'auto';
        const vol = Math.max(0, Math.min(1, (this._masterVolume || 0.7) * (this._sfxVolume ?? 1) * 0.85));
        a.volume = vol <= 0 ? 0 : vol;
        this._comicStingAudio = a;
        const fallback = setTimeout(done, 12000);
        const clearFb = () => clearTimeout(fallback);
        a.addEventListener('ended', () => { clearFb(); done(); }, { once: true });
        a.addEventListener('error', () => { clearFb(); done(); }, { once: true });
        void a.play().catch(() => { clearFb(); done(); });
      } catch (_) {
        done();
      }
    });
  }
}
