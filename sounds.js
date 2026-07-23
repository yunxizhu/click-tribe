// 游戏音效（Web Audio API 合成音）
class GameSounds {
  constructor() {
    this.ctx = null;
    this._bound = false;
    this.masterGain = null;
  }

  bindUnlock() {
    if (this._bound) return;
    this._bound = true;
    const unlock = () => {
      this.ensureContext();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
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
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    osc.connect(gain);
    gain.connect(this.masterGain);

    const peak = Math.max(0.0001, volume);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.start(start);
    osc.stop(start + duration + release);
  }

  noiseBurst(start, duration, volume = 0.06) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

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
    gain.connect(this.masterGain);
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
