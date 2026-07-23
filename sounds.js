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

    // 监听 AudioContext 状态：一旦变为 running 就初始化 BGM
    if (this.ctx) {
      this.ctx.addEventListener('statechange', () => {
        if (this.ctx.state === 'running' && !this.bgm) {
          this._initBGM();
        }
      });
      // 立即尝试 resume — 若浏览器允许自动播放（或之前授权过）会直接成功
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (!this.bgm) this._initBGM();
        }).catch(() => {});
      }
      if (this.ctx.state === 'running') {
        this._initBGM();
      }
    }

    const unlock = () => {
      this.ensureContext();
      if (!this.bgm) {
        this._initBGM();
      } else {
        // BGM 已初始化但可能因自动播放策略被阻止，现在有用户手势了，强制刷新
        if (this.bgm._tick) this.bgm._tick();
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
}
