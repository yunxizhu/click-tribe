/**
 * BGM 系统：使用纯 HTMLAudioElement 实现多轨背景音乐。
 * 不依赖 createMediaElementSource，兼容 file:// 协议。
 *
 * 独立时间线（可交叉重叠）：
 *   - 白天轨 6:00~18:00  Satie Gymnopedie No 1（双轨错位）
 *   - 黄昏轨 18:00~22:00 Satie Gymnopedie No 1（单轨）
 *   - 夜间轨 19:00~6:00  night_bgm.mp3
 *   - 休息轨 22:00~6:00  Satie Gymnopedie No 1（0.5x, 0.25 音量）
 *   - 袭击轨 任意时段    Suspense7（叠加在背景轨之上；袭击期间暂停白天/黄昏轨）
 *   - 战斗轨 战斗期间      Fight（独占播放，暂停其他所有音轨）
 */
(function () {
  'use strict';

  function musicUrl(fileName) {
    if (typeof window.tribeMusicUrl === 'function') {
      return window.tribeMusicUrl(fileName);
    }
    const name = String(fileName || '').replace(/^music\//, '');
    return 'music/' + name;
  }

  class BGMPlayer {
    constructor() {
      this._owner = null;
      this._loaded = false;

      // 独立音轨
      this._dayAudio = null;       // [trackA, trackB] 白天双轨
      this._dayAltAudio = null;
      this._duskAudio = null;      // 黄昏单轨
      this._nightAudio = null;     // 夜间单轨
      this._restAudio = null;      // 休息单轨
      this._suspenseAudio = null;  // 袭击轨
      this._fightAudio = null;     // 战斗轨

      // 各轨目标音量
      this._dayVol = 0;
      this._dayAltVol = 0;
      this._duskVol = 0;
      this._nightVol = 0;
      this._restVol = 0;
      this._suspenseVol = 0;
      this._fightVol = 0;

      this._fadeDuration = 2;
      this._updateTimer = null;

      // 特殊音效冷却
      this._heartwarmingPlayed = false;
      this._healingPlayed = false;

      // 上一次 tick 的状态（用于检测变化）
      this._prevDayActive = false;
      this._prevDuskActive = false;
      this._prevNightActive = false;
      this._prevRestActive = false;
      this._prevSuspenseActive = false;
      this._prevFightActive = false;

      this._userPlayBgm = true;
      this._userMaster = 1;
      this._fadeGen = 0;
    }

    /** 用户设置：是否播 BGM、全局音量 0~1 */
    applyUserAudioSettings(opts = {}) {
      if (opts.playBgm != null) this._userPlayBgm = !!opts.playBgm;
      if (opts.masterVolume != null) {
        const n = Number(opts.masterVolume);
        this._userMaster = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
      }
      this._fadeGen = (this._fadeGen || 0) + 1;
      if (!this._userPlayBgm) {
        this._hardStopAllTracks();
        return;
      }
      this._refreshAllVolumes();
      // 重新按当前时段开轨（若已停干净）
      if (typeof this._tick === 'function') this._tick();
    }

    _volMul() {
      if (!this._userPlayBgm) return 0;
      return Math.max(0, Math.min(1, Number(this._userMaster) || 0));
    }

    _outVol(base) {
      return Math.max(0, Math.min(1, (Number(base) || 0) * this._volMul()));
    }

    _allTrackSlots() {
      return [
        ['_dayAudio', '_dayVol'],
        ['_dayAltAudio', '_dayAltVol'],
        ['_duskAudio', '_duskVol'],
        ['_nightAudio', '_nightVol'],
        ['_restAudio', '_restVol'],
        ['_suspenseAudio', '_suspenseVol'],
        ['_fightAudio', '_fightVol'],
      ];
    }

    _refreshAllVolumes() {
      this._allTrackSlots().forEach(([aKey, vKey]) => {
        const a = this[aKey];
        if (!a) return;
        try { a.volume = this._outVol(this[vKey]); } catch (_) { /* ignore */ }
      });
    }

    _hardStopAllTracks() {
      this._fadeGen = (this._fadeGen || 0) + 1;
      const keys = ['_dayAudio', '_dayAltAudio', '_duskAudio', '_nightAudio', '_restAudio', '_suspenseAudio', '_fightAudio'];
      keys.forEach((k) => {
        const a = this[k];
        this[k] = null;
        if (a) this._destroyAudio(a);
      });
      this._prevDayActive = false;
      this._prevDuskActive = false;
      this._prevNightActive = false;
      this._prevRestActive = false;
      this._prevSuspenseActive = false;
      this._prevFightActive = false;
    }

    /** play() 成功后挂轨；若中途关掉 BGM 则立刻销毁 */
    _onTrackReady(audio, slotKey, baseVol) {
      if (!audio) return;
      if (!this._userPlayBgm || !this._loaded) {
        this._destroyAudio(audio);
        return;
      }
      this[slotKey] = audio;
      try { audio.volume = this._outVol(baseVol); } catch (_) { /* ignore */ }
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }

    init(ctx, masterGain, game) {
      this._owner = game;
      this._loaded = true;
      console.log('[BGM] 初始化完成');
      // 预加载音频文件（异步加载，不阻塞）
      this._preloadAudio(musicUrl('Satie Gymnopedie No 1.mp3'));
      this._preloadAudio(musicUrl('night_bgm.mp3'));
      this._preloadAudio(musicUrl('Suspense7_PerituneMaterial_Suspense7_loop.mp3'));
      this._preloadAudio(musicUrl('Fight」_PerituneMaterial_Fight_loop.mp3'));
      // 立即执行一次 tick，按当前时间马上开始播放（无淡入）
      this._initialFade = 0;
      this._tick();
      this._initialFade = null;
      this._startUpdateTimer();
    }

    _preloadAudio(url) {
      const a = new Audio(url);
      a.preload = 'auto';
      a.load();
    }

    _startUpdateTimer() {
      if (this._updateTimer) clearInterval(this._updateTimer);
      this._updateTimer = setInterval(() => this._tick(), 1000);
    }

    /** 每天小时数（浮点） */
    _getHours() {
      try {
        return this._owner.getGameTimeOfDay().hours;
      } catch (e) {
        return 12;
      }
    }

    /** 白天轨是否应播放（6:00~18:00） */
    _shouldDayPlay() {
      const h = this._getHours();
      return h >= 6 && h < 18;
    }

    /** 黄昏轨是否应播放（18:00~22:00） */
    _shouldDuskPlay() {
      const h = this._getHours();
      return h >= 18 && h < 22;
    }

    /** 夜间轨是否应播放（19:00~6:00） */
    _shouldNightPlay() {
      const h = this._getHours();
      return h >= 19 || h < 6;
    }

    /** 休息轨是否应播放（22:00~6:00） */
    _shouldRestPlay() {
      const h = this._getHours();
      return h >= 22 || h < 6;
    }

    /** 袭击轨是否应播放（预警或战斗中，且非休息时段） */
    _shouldSuspensePlay() {
      try {
        const game = this._owner;
        if (game.isVillagersResting()) return false;
        const raid = game.ensureDefenseState().raid;
        return raid.phase === 'warning';
      } catch (e) {
        return false;
      }
    }

    /** 战斗轨是否应播放（正式战斗期间） */
    _shouldFightPlay() {
      try {
        const raid = this._owner.ensureDefenseState().raid;
        return raid.phase === 'combat';
      } catch (e) {
        return false;
      }
    }

    _tick() {
      if (!this._loaded || !this._owner) return;
      if (!this._userPlayBgm) {
        if (this._dayAudio || this._dayAltAudio || this._prevDayActive) {
          this._prevDayActive = false;
          this._stopDay();
        }
        if (this._duskAudio || this._prevDuskActive) {
          this._prevDuskActive = false;
          this._stopDusk();
        }
        if (this._nightAudio || this._prevNightActive) {
          this._prevNightActive = false;
          this._stopNight();
        }
        if (this._restAudio || this._prevRestActive) {
          this._prevRestActive = false;
          this._stopRest();
        }
        if (this._suspenseAudio || this._prevSuspenseActive) {
          this._prevSuspenseActive = false;
          this._stopSuspense();
        }
        if (this._fightAudio || this._prevFightActive) {
          this._prevFightActive = false;
          this._stopFight();
        }
        return;
      }
      try {
        const dayActive = this._shouldDayPlay();
        const duskActive = this._shouldDuskPlay();
        const nightActive = this._shouldNightPlay();
        const restActive = this._shouldRestPlay();
        const suspActive = this._shouldSuspensePlay();
        const fightActive = this._shouldFightPlay();

        // 战斗期间独占播放；预警期间暂停白天/黄昏，只保留袭击音轨
        const dayShouldPlay = dayActive && !suspActive && !fightActive;
        const duskShouldPlay = duskActive && !suspActive && !fightActive;
        const nightShouldPlay = nightActive && !fightActive;
        const restShouldPlay = restActive && !fightActive;
        const suspShouldPlay = suspActive && !fightActive;

        // 每条轨独立控制开关（仅在状态变化时启停）
        if (dayShouldPlay !== this._prevDayActive) {
          this._prevDayActive = dayShouldPlay;
          if (dayShouldPlay) this._startDay();
          else this._stopDay();
        } else if (dayShouldPlay && !this._dayAudio && !this._dayAltAudio) {
          // 应在播放但音轨对象为 null（上次 play() 被浏览器阻止），重试
          this._startDay();
        }

        if (duskShouldPlay !== this._prevDuskActive) {
          this._prevDuskActive = duskShouldPlay;
          if (duskShouldPlay) this._startDusk();
          else this._stopDusk();
        } else if (duskShouldPlay && !this._duskAudio) {
          this._startDusk();
        }

        if (nightShouldPlay !== this._prevNightActive) {
          this._prevNightActive = nightShouldPlay;
          if (nightShouldPlay) this._startNight();
          else this._stopNight();
        } else if (nightShouldPlay && !this._nightAudio) {
          this._startNight();
        }

        if (restShouldPlay !== this._prevRestActive) {
          this._prevRestActive = restShouldPlay;
          if (restShouldPlay) this._startRest();
          else this._stopRest();
        } else if (restShouldPlay && !this._restAudio) {
          this._startRest();
        }

        if (suspShouldPlay !== this._prevSuspenseActive) {
          this._prevSuspenseActive = suspShouldPlay;
          if (suspShouldPlay) this._startSuspense();
          else this._stopSuspense();
        } else if (suspShouldPlay && !this._suspenseAudio) {
          this._startSuspense();
        }

        if (fightActive !== this._prevFightActive) {
          this._prevFightActive = fightActive;
          if (fightActive) this._startFight();
          else this._stopFight();
        } else if (fightActive && !this._fightAudio) {
          this._startFight();
        }

        // 特殊整点音效（6:00 Heartwarming，22:00 Healing）
        const hours = this._getHours();
        if (hours === 6 && !this._heartwarmingPlayed) {
          this._playOneShot(musicUrl('Heartwarming1-3_PerituneMaterial_J_Heartwarming2.mp3'));
          this._heartwarmingPlayed = true;
        }
        if (hours !== 6) this._heartwarmingPlayed = false;

        if (hours === 22 && !this._healingPlayed) {
          this._playOneShot(musicUrl('Healing1-3_PerituneMaterial_J_Healing1a.mp3'));
          this._healingPlayed = true;
        }
        if (hours !== 22) this._healingPlayed = false;

      } catch (e) {
        console.warn('[BGM] tick error:', e);
      }
    }

    // ========== 音量缓动工具 ==========

    _fadeIn(audio, targetVol) {
      if (!audio) return;
      const gen = this._fadeGen;
      const durMs = this._fadeDuration * 1000;
      const stepMs = 50;
      const steps = Math.ceil(durMs / stepMs);
      let step = 0;
      audio.volume = 0;
      const tick = () => {
        if (gen !== this._fadeGen || !this._userPlayBgm) return;
        step++;
        const progress = Math.min(1, step / steps);
        audio.volume = progress * this._outVol(targetVol);
        if (step < steps) setTimeout(tick, stepMs);
      };
      tick();
    }

    _fadeOut(audio, callback) {
      if (!audio) { if (callback) callback(); return; }
      const gen = this._fadeGen;
      const durMs = this._fadeDuration * 1000;
      const stepMs = 50;
      const steps = Math.ceil(durMs / stepMs);
      let step = 0;
      const startVol = audio.volume;
      const tick = () => {
        if (gen !== this._fadeGen) {
          if (callback) callback();
          return;
        }
        step++;
        const progress = Math.min(1, step / steps);
        audio.volume = (1 - progress) * startVol;
        if (step >= steps) {
          if (callback) callback();
        } else {
          setTimeout(tick, stepMs);
        }
      };
      tick();
    }

    // ========== 白天轨（6:00~18:00） ==========

    _createDayAudios() {
      if (!this._userPlayBgm) return;
      const urlDay = musicUrl('Satie Gymnopedie No 1.mp3');
      const mainVol = 0.3;

      this._dayVol = mainVol;

      // Track A：从头播放，1x
      const a = this._createAudio(urlDay, true, 1.1);
      a.play().then(() => {
        this._onTrackReady(a, '_dayAudio', mainVol);
        if (this._dayAudio === a && this._initialFade !== 0) this._fadeIn(a, mainVol);
      }).catch(e => console.warn('[BGM] 白天 Track A 播放失败:', e));

    }

    _startDay() {
      if (!this._userPlayBgm) return;
      if (this._dayAudio || this._dayAltAudio) return; // 已在播放
      console.log('[BGM] 启动白天音轨（6:00~18:00）');
      this._createDayAudios();
    }

    _stopDay() {
      if (!this._dayAudio) return;
      console.log('[BGM] 停止白天音轨');
      const a = this._dayAudio;
      this._dayAudio = null;
      this._dayAltAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 黄昏轨（18:00~22:00） ==========

    _createDuskAudio() {
      if (!this._userPlayBgm) return;
      const url = musicUrl('Satie Gymnopedie No 1.mp3');
      const vol = 0.25;
      this._duskVol = vol;
      const a = this._createAudio(url, true, 0.8);
      a.play().then(() => {
        this._onTrackReady(a, '_duskAudio', vol);
        if (this._duskAudio === a && this._initialFade !== 0) this._fadeIn(a, vol);
      }).catch(e => console.warn('[BGM] 黄昏音轨播放失败:', e));
    }

    _startDusk() {
      if (!this._userPlayBgm) return;
      if (this._duskAudio) return;
      console.log('[BGM] 启动黄昏音轨（18:00~22:00）');
      this._createDuskAudio();
    }

    _stopDusk() {
      if (!this._duskAudio) return;
      console.log('[BGM] 停止黄昏音轨');
      const a = this._duskAudio;
      this._duskAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 夜间轨（19:00~6:00） ==========

    _startNight() {
      if (!this._userPlayBgm) return;
      if (this._nightAudio) return;
      console.log('[BGM] 启动夜间音轨（19:00~6:00）');
      const url = musicUrl('night_bgm.mp3');
      const vol = 0.65;
      this._nightVol = vol;
      const a = this._createAudio(url, true, 1.0);
      a.play().then(() => {
        this._onTrackReady(a, '_nightAudio', vol);
        if (this._nightAudio === a && this._initialFade !== 0) this._fadeIn(a, vol);
      }).catch(e => console.warn('[BGM] 夜间音轨播放失败:', e));
    }

    _stopNight() {
      if (!this._nightAudio) return;
      console.log('[BGM] 停止夜间音轨');
      const a = this._nightAudio;
      this._nightAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 休息轨（22:00~6:00） ==========

    _startRest() {
      if (!this._userPlayBgm) return;
      if (this._restAudio) return;
      console.log('[BGM] 启动休息音轨（22:00~6:00）');
      const url = musicUrl('Satie Gymnopedie No 1.mp3');
      const vol = 0.20;
      this._restVol = vol;
      const a = this._createAudio(url, true, 0.5);
      a.play().then(() => {
        this._onTrackReady(a, '_restAudio', vol);
        if (this._restAudio === a && this._initialFade !== 0) this._fadeIn(a, vol);
      }).catch(e => console.warn('[BGM] 休息音轨播放失败:', e));
    }

    _stopRest() {
      if (!this._restAudio) return;
      console.log('[BGM] 停止休息音轨');
      const a = this._restAudio;
      this._restAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 袭击轨 ==========

    _startSuspense() {
      if (!this._userPlayBgm) return;
      if (this._suspenseAudio) return;
      const vol = this._shouldNightPlay() ? 0.05 : 0.10;
      this._suspenseVol = vol;
      console.log('[BGM] 启动袭击音轨, vol:', vol);
      const url = musicUrl('Suspense7_PerituneMaterial_Suspense7_loop.mp3');
      const a = this._createAudio(url, true, 1.0);
      a.play().then(() => {
        this._onTrackReady(a, '_suspenseAudio', vol);
        if (this._suspenseAudio === a) this._fadeIn(a, vol);
      }).catch(e => console.warn('[BGM] Suspense 播放失败:', e));
    }

    _stopSuspense() {
      if (!this._suspenseAudio) return;
      console.log('[BGM] 停止袭击音轨');
      const a = this._suspenseAudio;
      this._suspenseAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 战斗轨 ==========

    _startFight() {
      if (!this._userPlayBgm) return;
      if (this._fightAudio) return;
      const vol = 0.30;
      this._fightVol = vol;
      console.log('[BGM] 启动战斗音轨, vol:', vol);
      const url = musicUrl('Fight」_PerituneMaterial_Fight_loop.mp3');
      const a = this._createAudio(url, true, 1.0);
      a.play().then(() => {
        this._onTrackReady(a, '_fightAudio', vol);
        if (this._fightAudio === a && this._initialFade !== 0) this._fadeIn(a, vol);
      }).catch(e => console.warn('[BGM] Fight 播放失败:', e));
    }

    _stopFight() {
      if (!this._fightAudio) return;
      console.log('[BGM] 停止战斗音轨');
      const a = this._fightAudio;
      this._fightAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 通用 Audio 管理 ==========

    _createAudio(url, loop, playbackRate, currentTime) {
      const a = new Audio(url);
      a.loop = loop;
      a.preload = 'auto';
      a.playbackRate = playbackRate;
      a.volume = 0;
      if (currentTime != null) a.currentTime = currentTime;
      return a;
    }

    _destroyAudio(audio) {
      if (!audio) return;
      try { audio.pause(); audio.src = ''; } catch (e) { /* ignore */ }
    }

    // ========== 特殊音效（整点曲） ==========

    _playOneShot(url) {
      if (!this._userPlayBgm) return;
      console.log('[BGM] 播放特殊音效:', url);
      const a = new Audio(url);
      a.preload = 'auto';
      a.loop = false;
      a.volume = this._outVol(0.3);
      a.play().catch(e => console.warn('[BGM] one-shot play failed:', url, e));
    }

    // ========== 工具 ==========

    stop() {
      this._destroyAudio(this._dayAudio);
      this._dayAudio = null;
      this._destroyAudio(this._dayAltAudio);
      this._dayAltAudio = null;
      this._destroyAudio(this._duskAudio);
      this._duskAudio = null;
      this._destroyAudio(this._nightAudio);
      this._nightAudio = null;
      this._destroyAudio(this._restAudio);
      this._restAudio = null;
      this._destroyAudio(this._suspenseAudio);
      this._suspenseAudio = null;
      this._destroyAudio(this._fightAudio);
      this._fightAudio = null;
      if (this._updateTimer) {
        clearInterval(this._updateTimer);
        this._updateTimer = null;
      }
    }

    onGameOver() {
      this.stop();
    }
  }

  window.BGMPlayer = BGMPlayer;
})();
