/**
 * BGM 系统：使用纯 HTMLAudioElement 实现多轨背景音乐。
 * 不依赖 createMediaElementSource，兼容 file:// 协议。
 *
 * 独立时间线（可交叉重叠）：
 *   - 白天轨 6:00~18:00  曲目随机（音量 0.3 / 倍速 1.1）
 *   - 黄昏轨 18:00~22:00 曲目随机（音量 0.25 / 倍速 0.8）
 *   - 夜间轨 19:00~6:00  曲目随机（音量 0.65 / 倍速 1.0）
 *   - 休息轨 22:00~6:00  Satie Gymnopedie No 1（0.5x, 0.20 音量）
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
      this._dayAudio = null;       // 白天单轨（Positive2/3 / Harvest2 随机）
      this._dayAltAudio = null;    // 兼容旧槽位（不再使用）
      this._duskAudio = null;      // 黄昏单轨
      this._nightAudio = null;     // 夜间单轨
      this._restAudio = null;      // 休息单轨
      this._suspenseAudio = null;  // 袭击轨
      this._fightAudio = null;     // 战斗轨

      this._dayTrackFiles = [
        'かわいい・ほのぼのBGM「Lollipop_Lane」_Peritune_Lollipop_Lane.mp3',
        'ほのぼのした日常曲「Positive2」_PerituneMaterial_Positive2_loop.mp3',
        'ほのぼのとした日常BGM「Positive3」_PerituneMaterial_Positive3_loop.mp3',
        '牧歌的なケルト曲「Harvest2」_PerituneMaterial_Harvest2_loop.mp3',
        '切ないケルト曲「Nostalgic Jig」_PerituneMaterial_Nostalgic_Jig_loop.mp3',
      ];
      this._duskTrackFiles = [
        'Realm _ 王国の昼と夜_PerituneMaterial_Realm_Nighttime_loop.mp3',
        'Guitar_Melancholy _ 優しく切ないギターソロ_PerituneMaterial_Guitar_Melancholy_loop.mp3',
        '切ないピアノソロ「Piano_Melancholy」_PerituneMaterial_Piano_Melancholy.mp3',
      ];
      this._nightTrackFiles = [
        'night_bgm.mp3',
        'Shizima3 _ ピアノの静謐な和風曲_PerituneMaterial_Shizima3_Piano_loop.mp3',
      ];

      // 各轨目标音量
      this._dayVol = 0;
      this._dayAltVol = 0;
      this._duskVol = 0;
      this._nightVol = 0;
      this._restVol = 0;
      this._suspenseVol = 0;
      this._fightVol = 0;

      this._fadeDuration = 5;
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
      /** 上次 BGM 所见的日历日；用于跨日快进时强制重开白天/黄昏轨 */
      this._bgmCalDay = null;
      this._lastDayFile = '';
      this._lastDuskFile = '';
      this._lastNightFile = '';

      this._userPlayBgm = true;
      this._userMaster = 1;
      /** 新手教程期间额外压低 BGM（相对设置音量） */
      this._tutorialMul = 1;
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
        this._notifyNowPlaying();
        return;
      }
      this._refreshAllVolumes();
      // 重新按当前时段开轨（若已停干净）
      if (typeof this._tick === 'function') this._tick();
      this._notifyNowPlaying();
    }

    /** 新手教程 / 暂停菜单：渐变音量 */
    setTutorialDuck(active, durationMs = 2000) {
      const target = active ? 0.5 : 1;
      if (this._tutorialMul === target) return;
      this._tutorialMulTarget = target;
      const from = this._tutorialMul;
      const startTime = performance.now();
      const dur = Math.max(100, durationMs);
      if (this._tutorialFadeRaf) cancelAnimationFrame(this._tutorialFadeRaf);
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / dur);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        this._tutorialMul = from + (target - from) * ease;
        this._refreshAllVolumes();
        if (t < 1) {
          this._tutorialFadeRaf = requestAnimationFrame(step);
        } else {
          this._tutorialMul = target;
          this._tutorialFadeRaf = null;
          this._refreshAllVolumes();
        }
      };
      this._tutorialFadeRaf = requestAnimationFrame(step);
    }

    _volMul() {
      if (!this._userPlayBgm) return 0;
      const master = Math.max(0, Math.min(1, Number(this._userMaster) || 0));
      const tut = Math.max(0, Math.min(1, Number(this._tutorialMul) || 1));
      return master * tut;
    }

    _outVol(base) {
      return Math.max(0, Math.min(1, (Number(base) || 0) * this._volMul()));
    }

    /** 浮点小时（0~24），用于切轨前渐弱 */
    _getHoursFloat() {
      try {
        const t = this._owner.getGameTimeOfDay();
        if (Number.isFinite(t?.frac)) return Math.max(0, Math.min(24, t.frac * 24));
        return (t.hours || 0) + (t.minutes || 0) / 60 + (t.seconds || 0) / 3600;
      } catch (e) {
        return 12;
      }
    }

    /** 距下一指定整点还有多少小时（跨日则 +24） */
    _hoursUntilClock(endHour, now = this._getHoursFloat()) {
      let d = endHour - now;
      if (d <= 0) d += 24;
      return d;
    }

    /**
     * 切轨前音量倍率：以 1× 下「最后 0.5 游戏小时」为基准，并按当前倍速拉长游戏时间窗口，
     * 使真实经过时间大致不变（4× 时约提前 2 游戏小时开始渐弱），避免高速下跳过渐弱。
     * 最低 = 设置目标音量 × 20%。
     */
    _getGameTimeScale() {
      try {
        const s = Number(this._owner?.timeScale || this._owner?.devTimeScale) || 1;
        return Math.max(1, Math.min(32, s));
      } catch (_) {
        return 1;
      }
    }

    _endApproachTaper(hoursUntilEnd) {
      const scale = this._getGameTimeScale();
      const FADE_START_H = Math.min(4, 0.5 * scale);
      const MIN_HOLD_H = Math.min(FADE_START_H * 0.25, (5 / 60) * scale);
      const MIN_MUL = 0.2;
      const h = Number(hoursUntilEnd);
      if (!Number.isFinite(h) || h >= FADE_START_H) return 1;
      if (h <= MIN_HOLD_H || FADE_START_H <= MIN_HOLD_H) return MIN_MUL;
      const t = (h - MIN_HOLD_H) / (FADE_START_H - MIN_HOLD_H);
      return MIN_MUL + t * (1 - MIN_MUL);
    }

    /** 各时段音轨距结束的小时数；非渐弱轨返回 null */
    _hoursUntilSlotEnd(slotKey) {
      const now = this._getHoursFloat();
      if (slotKey === '_dayAudio' || slotKey === '_dayAltAudio') {
        if (!(now >= 6 && now < 18)) return null;
        return 18 - now;
      }
      if (slotKey === '_duskAudio') {
        if (!(now >= 18 && now < 22)) return null;
        return 22 - now;
      }
      if (slotKey === '_nightAudio') {
        if (!(now >= 19 || now < 6)) return null;
        return this._hoursUntilClock(6, now);
      }
      if (slotKey === '_restAudio') {
        if (!(now >= 22 || now < 6)) return null;
        return this._hoursUntilClock(6, now);
      }
      return null;
    }

    _slotTaperMul(slotKey) {
      const until = this._hoursUntilSlotEnd(slotKey);
      if (until == null) return 1;
      return this._endApproachTaper(until);
    }

    /**
     * 实际输出音量 = 该轨设置目标音量 × 切轨前渐弱倍率。
     * 设置目标 = 轨基音量 × 全局音量；最低为设置目标的 20%，不会压到绝对 20%。
     * 例：设置目标 0.35 → 最低 0.35×0.2=0.07。
     */
    _effectiveOutVol(baseVol, slotKey) {
      const setVol = this._outVol(baseVol);
      const mul = this._slotTaperMul(slotKey);
      return Math.max(0, Math.min(1, setVol * mul));
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
        try { a.volume = this._effectiveOutVol(this[vKey], aKey); } catch (_) { /* ignore */ }
      });
    }

    /** 每 tick 同步时段轨音量（切轨前渐弱），不打断淡入中的轨 */
    _syncPeriodEndVolumes() {
      if (!this._userPlayBgm) return;
      const slots = [
        ['_dayAudio', '_dayVol'],
        ['_dayAltAudio', '_dayAltVol'],
        ['_duskAudio', '_duskVol'],
        ['_nightAudio', '_nightVol'],
        ['_restAudio', '_restVol'],
      ];
      slots.forEach(([aKey, vKey]) => {
        const a = this[aKey];
        if (!a || a._bgmFadingIn) return;
        try { a.volume = this._effectiveOutVol(this[vKey], aKey); } catch (_) { /* ignore */ }
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
      try { audio.volume = this._effectiveOutVol(baseVol, slotKey); } catch (_) { /* ignore */ }
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }

    init(ctx, masterGain, game) {
      this._owner = game;
      this._loaded = true;
      console.log('[BGM] 初始化完成');
      // 预加载音频文件（异步加载，不阻塞）
      (this._dayTrackFiles || []).forEach((f) => this._preloadAudio(musicUrl(f)));
      (this._duskTrackFiles || []).forEach((f) => this._preloadAudio(musicUrl(f)));
      (this._nightTrackFiles || []).forEach((f) => this._preloadAudio(musicUrl(f)));
      this._preloadAudio(musicUrl('Satie Gymnopedie No 1.mp3'));
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
      // 倍速越高轮询越勤，避免渐弱采样过稀
      const scale = this._getGameTimeScale();
      const ms = scale >= 4 ? 100 : (scale >= 2 ? 200 : 500);
      this._updateTimer = setInterval(() => this._tick(), ms);
    }

    /** 每天小时数（整数，整点音效用）；渐弱请用 _getHoursFloat */
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

    /** 夜间轨是否应播放（19:00~22:00，22:00 后由休息轨替代） */
    _shouldNightPlay() {
      const h = this._getHours();
      return h >= 19 && h < 22;
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

      // 中转黑屏：全部静音
      if (this._owner._bootTransitionActive) {
        if (this._dayAudio || this._dayAltAudio || this._duskAudio || this._nightAudio
          || this._restAudio || this._suspenseAudio || this._fightAudio) {
          this.stop();
          this._prevDayActive = false;
          this._prevDuskActive = false;
          this._prevNightActive = false;
          this._prevRestActive = false;
          this._prevSuspenseActive = false;
          this._prevFightActive = false;
          this._startUpdateTimer();
        }
        return;
      }

      // 开场漫画：只播袭击预告轨，结束后由正常逻辑切白天轨
      if (this._owner._comicTimeHold) {
        if (!this._userPlayBgm) {
          if (this._suspenseAudio) {
            this._prevSuspenseActive = false;
            this._stopSuspense();
          }
          return;
        }
        if (this._dayAudio || this._dayAltAudio) {
          this._prevDayActive = false;
          this._stopDay();
        }
        if (this._duskAudio) {
          this._prevDuskActive = false;
          this._stopDusk();
        }
        if (this._nightAudio) {
          this._prevNightActive = false;
          this._stopNight();
        }
        if (this._restAudio) {
          this._prevRestActive = false;
          this._stopRest();
        }
        if (this._fightAudio) {
          this._prevFightActive = false;
          this._stopFight();
        }
        this._prevDayActive = false;
        this._prevDuskActive = false;
        this._prevNightActive = false;
        this._prevRestActive = false;
        this._prevFightActive = false;
        if (!this._suspenseAudio) {
          this._startSuspense({ forceVol: 0.12 });
        }
        this._prevSuspenseActive = true;
        return;
      }

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
        const nightShouldPlay = nightActive && !suspActive && !fightActive;
        const restShouldPlay = restActive && !suspActive && !fightActive;
        const suspShouldPlay = suspActive && !fightActive;

        const calDay = Number(this._owner.state?.day) || 1;
        if (this._bgmCalDay == null) this._bgmCalDay = calDay;
        const crossedCalDay = calDay !== this._bgmCalDay;

        // 每条轨独立控制开关；切入时重新随机并从头播放
        if (dayShouldPlay !== this._prevDayActive) {
          this._prevDayActive = dayShouldPlay;
          if (dayShouldPlay) this._startDay({ fresh: true });
          else this._stopDay();
        } else if (dayShouldPlay && crossedCalDay) {
          // 跨日但仍在白天（快进跳过了夜晚）：强制换曲重开
          this._startDay({ fresh: true });
        } else if (dayShouldPlay && !this._dayAudio && !this._dayAltAudio) {
          this._startDay({ fresh: true });
        }

        if (duskShouldPlay !== this._prevDuskActive) {
          this._prevDuskActive = duskShouldPlay;
          if (duskShouldPlay) this._startDusk({ fresh: true });
          else this._stopDusk();
        } else if (duskShouldPlay && crossedCalDay) {
          this._startDusk({ fresh: true });
        } else if (duskShouldPlay && !this._duskAudio) {
          this._startDusk({ fresh: true });
        }

        if (nightShouldPlay !== this._prevNightActive) {
          this._prevNightActive = nightShouldPlay;
          if (nightShouldPlay) this._startNight({ fresh: true });
          else this._stopNight();
        } else if (nightShouldPlay && !this._nightAudio) {
          this._startNight({ fresh: true });
        }

        if (restShouldPlay !== this._prevRestActive) {
          this._prevRestActive = restShouldPlay;
          if (restShouldPlay) this._startRest({ fresh: true });
          else this._stopRest();
        } else if (restShouldPlay && !this._restAudio) {
          this._startRest({ fresh: true });
        }

        if (suspShouldPlay !== this._prevSuspenseActive) {
          this._prevSuspenseActive = suspShouldPlay;
          if (suspShouldPlay) this._startSuspense({ fresh: true });
          else this._stopSuspense();
        } else if (suspShouldPlay && !this._suspenseAudio) {
          this._startSuspense({ fresh: true });
        }

        if (fightActive !== this._prevFightActive) {
          this._prevFightActive = fightActive;
          if (fightActive) this._startFight({ fresh: true });
          else this._stopFight();
        } else if (fightActive && !this._fightAudio) {
          this._startFight({ fresh: true });
        }

        this._bgmCalDay = calDay;

        // 切轨前半小时渐弱（最低 = 设置目标音量 × 20%，非绝对 20%）
        this._syncPeriodEndVolumes();

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

        this._notifyNowPlaying();

      } catch (e) {
        console.warn('[BGM] tick error:', e);
      }
    }

    // ========== 音量缓动工具 ==========

    _fadeIn(audio, targetVol, slotKey = null) {
      if (!audio) return;
      const gen = this._fadeGen;
      const durMs = this._fadeDuration * 1000;
      const stepMs = 50;
      const steps = Math.ceil(durMs / stepMs);
      let step = 0;
      audio._bgmFadingIn = true;
      audio.volume = 0;
      const tick = () => {
        if (gen !== this._fadeGen || !this._userPlayBgm) {
          audio._bgmFadingIn = false;
          return;
        }
        step++;
        const progress = Math.min(1, step / steps);
        const tapered = slotKey
          ? this._effectiveOutVol(targetVol, slotKey)
          : this._outVol(targetVol);
        audio.volume = progress * tapered;
        if (step < steps) {
          setTimeout(tick, stepMs);
        } else {
          audio._bgmFadingIn = false;
        }
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

    _pickFromList(list, lastFile) {
      const files = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!files.length) return '';
      if (files.length === 1) return files[0];
      const pool = lastFile ? files.filter((f) => f !== lastFile) : files;
      const use = pool.length ? pool : files;
      return use[Math.floor(Math.random() * use.length)];
    }

    /** 手动切歌：按列表顺序下一首 */
    _pickNextFromList(list, lastFile) {
      const files = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!files.length) return '';
      if (files.length === 1) return files[0];
      const idx = files.indexOf(lastFile);
      if (idx < 0) return files[0];
      return files[(idx + 1) % files.length];
    }

    _trackDisplayName(file) {
      const f = String(file || '');
      const map = {
        'night_bgm.mp3': 'Night BGM',
        'Satie Gymnopedie No 1.mp3': 'Gymnopédie No.1',
        'Suspense7_PerituneMaterial_Suspense7_loop.mp3': 'Suspense7',
        'Fight」_PerituneMaterial_Fight_loop.mp3': 'Fight',
        'Shizima3 _ ピアノの静謐な和風曲_PerituneMaterial_Shizima3_Piano_loop.mp3': 'Shizima3 · 静謐ピアノ',
        'Realm _ 王国の昼と夜_PerituneMaterial_Realm_Nighttime_loop.mp3': 'Realm · 王国の夜',
        'Guitar_Melancholy _ 優しく切ないギターソロ_PerituneMaterial_Guitar_Melancholy_loop.mp3': 'Guitar Melancholy',
      };
      if (map[f]) return map[f];
      const quoted = f.match(/「([^」]+)」/);
      if (quoted) return quoted[1].replace(/_/g, ' ');
      return f.replace(/\.mp3$/i, '').replace(/_/g, ' ').slice(0, 40);
    }

    _notifyNowPlaying() {
      try {
        const info = this.getNowPlayingInfo();
        const key = [info.off ? 1 : 0, info.period, info.file, info.name, info.playing ? 1 : 0, info.canCycle ? 1 : 0].join('|');
        if (key === this._lastNowPlayingKey) return;
        this._lastNowPlayingKey = key;
        this._owner?.syncBgmNowPlayingUI?.(info);
      } catch (_) { /* ignore */ }
    }

    /**
     * 当前应展示的主音轨（战斗 > 袭击 > 白天 > 黄昏 > 夜间 > 休息）
     * @returns {{ off?: boolean, playing: boolean, canCycle: boolean, period: string, file: string, name: string }}
     */
    getNowPlayingInfo() {
      if (!this._userPlayBgm || !this._loaded) {
        return { off: true, playing: false, canCycle: false, period: '', file: '', name: 'BGM 已关闭' };
      }
      const fightOn = this._shouldFightPlay() && this._fightAudio;
      if (fightOn) {
        const file = 'Fight」_PerituneMaterial_Fight_loop.mp3';
        return {
          playing: true, canCycle: false, period: 'fight', file,
          name: this._trackDisplayName(file),
        };
      }
      const suspOn = this._shouldSuspensePlay() && this._suspenseAudio;
      if (suspOn) {
        const file = 'Suspense7_PerituneMaterial_Suspense7_loop.mp3';
        return {
          playing: true, canCycle: false, period: 'suspense', file,
          name: this._trackDisplayName(file),
        };
      }
      const dayOn = this._shouldDayPlay() && !this._shouldSuspensePlay() && !this._shouldFightPlay()
        && (this._dayAudio || this._dayAltAudio);
      if (dayOn) {
        const file = this._lastDayFile || '';
        return {
          playing: true,
          canCycle: (this._dayTrackFiles || []).length > 1,
          period: 'day',
          file,
          name: this._trackDisplayName(file) || '白天 BGM',
        };
      }
      const duskOn = this._shouldDuskPlay() && !this._shouldSuspensePlay() && !this._shouldFightPlay()
        && this._duskAudio;
      if (duskOn) {
        const file = this._lastDuskFile || '';
        return {
          playing: true,
          canCycle: (this._duskTrackFiles || []).length > 1,
          period: 'dusk',
          file,
          name: this._trackDisplayName(file) || '黄昏 BGM',
        };
      }
      const nightOn = this._shouldNightPlay() && !this._shouldFightPlay() && this._nightAudio;
      if (nightOn) {
        const file = this._lastNightFile || '';
        return {
          playing: true,
          canCycle: (this._nightTrackFiles || []).length > 1,
          period: 'night',
          file,
          name: this._trackDisplayName(file) || '夜间 BGM',
        };
      }
      const restOn = this._shouldRestPlay() && !this._shouldFightPlay() && this._restAudio;
      if (restOn) {
        const file = 'Satie Gymnopedie No 1.mp3';
        return {
          playing: true, canCycle: false, period: 'rest', file,
          name: this._trackDisplayName(file),
        };
      }
      return { playing: false, canCycle: false, period: '', file: '', name: '暂无 BGM' };
    }

    /** 手动切换当前时段曲库中的下一首（与主菜单切歌同类） */
    cycleNowPlayingTrack() {
      if (!this._userPlayBgm || !this._loaded) return false;
      const info = this.getNowPlayingInfo();
      if (!info.canCycle) return false;
      if (info.period === 'day') {
        this._startDay({ fresh: true, preferNext: true });
        return true;
      }
      if (info.period === 'dusk') {
        this._startDusk({ fresh: true, preferNext: true });
        return true;
      }
      if (info.period === 'night') {
        this._startNight({ fresh: true, preferNext: true });
        return true;
      }
      return false;
    }

    _pickDayTrackFile(opts = {}) {
      const fallback = 'ほのぼのした日常曲「Positive2」_PerituneMaterial_Positive2_loop.mp3';
      if (opts.preferNext) {
        return this._pickNextFromList(this._dayTrackFiles, this._lastDayFile) || fallback;
      }
      return this._pickFromList(this._dayTrackFiles, this._lastDayFile) || fallback;
    }

    _killDayAudioImmediate() {
      const a = this._dayAudio;
      const b = this._dayAltAudio;
      this._dayAudio = null;
      this._dayAltAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
      this._destroyAudio(b);
    }

    _createDayAudios(opts = {}) {
      if (!this._userPlayBgm) return;
      if (this._dayAudio || this._dayAltAudio) return;
      const file = this._pickDayTrackFile(opts);
      this._lastDayFile = file;
      const urlDay = musicUrl(file);
      // 仅换曲目；音量/倍速沿用原白天轨
      const mainVol = 0.3;
      const rate = 1.1;

      this._dayVol = mainVol;
      this._dayAltAudio = null;

      const a = this._createAudio(urlDay, true, rate);
      // 先占坑，避免 play() 完成前每秒 tick 重复 _startDay 叠出多轨
      this._dayAudio = a;
      this._notifyNowPlaying();
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._dayAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_dayAudio', mainVol);
        if (this._dayAudio === a && this._initialFade !== 0) this._fadeIn(a, mainVol, '_dayAudio');
        console.log('[BGM] 白天音轨选用:', file);
        this._notifyNowPlaying();
      }).catch(e => {
        console.warn('[BGM] 白天音轨播放失败:', e);
        if (this._dayAudio === a) this._dayAudio = null;
        this._notifyNowPlaying();
      });
    }

    _startDay(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killDayAudioImmediate();
      else if (this._dayAudio || this._dayAltAudio) return; // 已在播放 / 启动中
      console.log('[BGM] 启动白天音轨（6:00~18:00）');
      this._createDayAudios(opts);
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

    _pickDuskTrackFile(opts = {}) {
      if (opts.preferNext) {
        return this._pickNextFromList(this._duskTrackFiles, this._lastDuskFile) || 'Satie Gymnopedie No 1.mp3';
      }
      return this._pickFromList(this._duskTrackFiles, this._lastDuskFile) || 'Satie Gymnopedie No 1.mp3';
    }

    _killDuskAudioImmediate() {
      const a = this._duskAudio;
      this._duskAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
    }

    _createDuskAudio(opts = {}) {
      if (!this._userPlayBgm) return;
      if (this._duskAudio) return;
      const file = this._pickDuskTrackFile(opts);
      this._lastDuskFile = file;
      const url = musicUrl(file);
      // 仅换曲目；音量/倍速沿用原黄昏轨
      const vol = 0.25;
      const rate = 0.8;
      this._duskVol = vol;
      const a = this._createAudio(url, true, rate);
      this._duskAudio = a;
      this._notifyNowPlaying();
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._duskAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_duskAudio', vol);
        if (this._duskAudio === a && this._initialFade !== 0) this._fadeIn(a, vol, '_duskAudio');
        console.log('[BGM] 黄昏音轨选用:', file);
        this._notifyNowPlaying();
      }).catch(e => {
        console.warn('[BGM] 黄昏音轨播放失败:', e);
        if (this._duskAudio === a) this._duskAudio = null;
        this._notifyNowPlaying();
      });
    }

    _startDusk(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killDuskAudioImmediate();
      else if (this._duskAudio) return;
      console.log('[BGM] 启动黄昏音轨（18:00~22:00）');
      this._createDuskAudio(opts);
    }

    _stopDusk() {
      if (!this._duskAudio) return;
      console.log('[BGM] 停止黄昏音轨');
      const a = this._duskAudio;
      this._duskAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 夜间轨（19:00~6:00） ==========

    _pickNightTrackFile(opts = {}) {
      if (opts.preferNext) {
        return this._pickNextFromList(this._nightTrackFiles, this._lastNightFile) || 'night_bgm.mp3';
      }
      return this._pickFromList(this._nightTrackFiles, this._lastNightFile) || 'night_bgm.mp3';
    }

    _killNightAudioImmediate() {
      const a = this._nightAudio;
      this._nightAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
    }

    _createNightAudio(opts = {}) {
      if (!this._userPlayBgm) return;
      if (this._nightAudio) return;
      const file = this._pickNightTrackFile(opts);
      this._lastNightFile = file;
      const url = musicUrl(file);
      // 仅换曲目；音量/倍速沿用原夜间轨
      const vol = 0.65;
      this._nightVol = vol;
      const a = this._createAudio(url, true, 1.0);
      this._nightAudio = a;
      this._notifyNowPlaying();
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._nightAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_nightAudio', vol);
        if (this._nightAudio === a && this._initialFade !== 0) this._fadeIn(a, vol, '_nightAudio');
        console.log('[BGM] 夜间音轨选用:', file);
        this._notifyNowPlaying();
      }).catch(e => {
        console.warn('[BGM] 夜间音轨播放失败:', e);
        if (this._nightAudio === a) this._nightAudio = null;
        this._notifyNowPlaying();
      });
    }

    _startNight(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killNightAudioImmediate();
      else if (this._nightAudio) return;
      console.log('[BGM] 启动夜间音轨（19:00~6:00）');
      this._createNightAudio(opts);
    }

    _stopNight() {
      if (!this._nightAudio) return;
      console.log('[BGM] 停止夜间音轨');
      const a = this._nightAudio;
      this._nightAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 休息轨（22:00~6:00） ==========

    _killRestAudioImmediate() {
      const a = this._restAudio;
      this._restAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
    }

    _startRest(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killRestAudioImmediate();
      else if (this._restAudio) return;
      console.log('[BGM] 启动休息音轨（22:00~6:00）');
      const url = musicUrl('Satie Gymnopedie No 1.mp3');
      const vol = 0.20;
      this._restVol = vol;
      const a = this._createAudio(url, true, 0.5);
      this._restAudio = a;
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._restAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_restAudio', vol);
        if (this._restAudio === a && this._initialFade !== 0) this._fadeIn(a, vol, '_restAudio');
      }).catch(e => {
        console.warn('[BGM] 休息音轨播放失败:', e);
        if (this._restAudio === a) this._restAudio = null;
      });
    }

    _stopRest() {
      if (!this._restAudio) return;
      console.log('[BGM] 停止休息音轨');
      const a = this._restAudio;
      this._restAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 袭击轨 ==========

    _killSuspenseAudioImmediate() {
      const a = this._suspenseAudio;
      this._suspenseAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
    }

    _startSuspense(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killSuspenseAudioImmediate();
      else if (this._suspenseAudio) return;
      const vol = opts.forceVol != null
        ? Number(opts.forceVol)
        : (this._shouldNightPlay() ? 0.05 : 0.10);
      this._suspenseVol = vol;
      console.log('[BGM] 启动袭击音轨, vol:', vol);
      const url = musicUrl('Suspense7_PerituneMaterial_Suspense7_loop.mp3');
      const a = this._createAudio(url, true, 1.0);
      this._suspenseAudio = a;
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._suspenseAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_suspenseAudio', vol);
        if (this._suspenseAudio === a) this._fadeIn(a, vol, '_suspenseAudio');
      }).catch(e => {
        console.warn('[BGM] Suspense 播放失败:', e);
        if (this._suspenseAudio === a) this._suspenseAudio = null;
      });
    }

    _stopSuspense() {
      if (!this._suspenseAudio) return;
      console.log('[BGM] 停止袭击音轨');
      const a = this._suspenseAudio;
      this._suspenseAudio = null;
      this._fadeOut(a, () => this._destroyAudio(a));
    }

    // ========== 战斗轨 ==========

    _killFightAudioImmediate() {
      const a = this._fightAudio;
      this._fightAudio = null;
      this._fadeGen = (this._fadeGen || 0) + 1;
      this._destroyAudio(a);
    }

    _startFight(opts = {}) {
      if (!this._userPlayBgm) return;
      if (opts.fresh) this._killFightAudioImmediate();
      else if (this._fightAudio) return;
      const vol = 0.30;
      this._fightVol = vol;
      console.log('[BGM] 启动战斗音轨, vol:', vol);
      const url = musicUrl('Fight」_PerituneMaterial_Fight_loop.mp3');
      const a = this._createAudio(url, true, 1.0);
      this._fightAudio = a;
      try { a.volume = 0; a.currentTime = 0; } catch (_) { /* ignore */ }
      a.play().then(() => {
        if (this._fightAudio !== a) {
          this._destroyAudio(a);
          return;
        }
        this._onTrackReady(a, '_fightAudio', vol);
        if (this._fightAudio === a && this._initialFade !== 0) this._fadeIn(a, vol, '_fightAudio');
      }).catch(e => {
        console.warn('[BGM] Fight 播放失败:', e);
        if (this._fightAudio === a) this._fightAudio = null;
      });
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
