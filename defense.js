/**
 * 村落防务：平时可配置编制（仅袭击时生效）；
 * 袭击期间全体停工抗敌。
 */
(function attachDefenseSystem() {
  if (typeof FactoryGame === 'undefined') return;
  const P = FactoryGame.prototype;

  const POST_DEFS = [
    { id: 'bow', name: '弓手', icon: '🏹', tool: 'bow', role: 'ranged' },
    { id: 'crossbow', name: '弩手', icon: '🎯', tool: 'crossbow', role: 'ranged' },
    { id: 'sword', name: '剑士', icon: '🗡️', tool: 'sword', role: 'melee' },
    { id: 'spear', name: '长矛兵', icon: '🔱', tool: 'spear', role: 'melee' },
    { id: 'shield', name: '盾卫', icon: '🛡️', tool: 'shield', role: 'melee' },
    { id: 'bare', name: '徒手', icon: '✊', role: 'melee', bare: true },
  ];

  // 敌人角色对应的默认图标
  const ENEMY_ICONS = {
    melee: '👺',
    ranged: '👻',
    siege: '👹',
  };

  /* ============ 个体化战斗系统 ============ */

  /** 创建单个战斗单位对象 */
  function createUnit(spec) {
    const bodyMaxHp = spec.bodyMaxHp != null ? spec.bodyMaxHp : (spec.maxHp != null ? spec.maxHp : (spec.hp != null ? spec.hp : 10));
    const bodyHp = spec.bodyHp != null ? spec.bodyHp : (spec.hp != null ? spec.hp : bodyMaxHp);
    const armorHp = spec.armorHp != null ? spec.armorHp : 0;
    const armorMaxHp = spec.armorMaxHp != null ? spec.armorMaxHp : 0;
    return {
      id: spec.id,
      isAlly: spec.isAlly,
      postId: spec.postId || '',
      role: spec.role || 'melee',
      name: spec.name || '',
      icon: spec.icon || '?',
      atk: spec.atk || 1,
      bodyHp,
      bodyMaxHp,
      armorHp,
      armorMaxHp,
      armorPieceId: spec.armorPieceId || null,
      armorLevel: spec.armorLevel || 0,
      hp: bodyHp + armorHp,
      maxHp: bodyMaxHp + armorMaxHp,
      aspd: spec.aspd || 1,
      cooldown: spec.cooldown != null ? spec.cooldown : 0,
      range: spec.range || 4,
      move: spec.move || 10,
      baseMove: spec.baseMove != null ? spec.baseMove : (spec.move || 10),
      x: spec.x || 50,
      y: spec.y || 0,
      drMelee: spec.drMelee || 0,
      drRanged: spec.drRanged || 0,
      flatDr: spec.flatDr || 0,
      baseDrMelee: spec.baseDrMelee != null ? spec.baseDrMelee : (spec.drMelee || 0),
      baseDrRanged: spec.baseDrRanged != null ? spec.baseDrRanged : (spec.drRanged || 0),
      baseFlatDr: spec.baseFlatDr != null ? spec.baseFlatDr : (spec.flatDr || 0),
      soldierId: spec.soldierId || null,
      target: null,
      isDead: false,
    };
  }

  /** 两单位距离（战斗索敌：沿纵深 X，保持原战斗手感） */
  function unitDist(a, b) {
    return Math.abs(a.x - b.x);
  }

  /** 两单位平面距离（布阵碰撞用） */
  function unitDist2d(a, b) {
    const dy = (Number(a?.y) || 0) - (Number(b?.y) || 0);
    return Math.hypot((Number(a?.x) || 0) - (Number(b?.x) || 0), dy);
  }

  /** 友军是否算在城门内（可撤编）；换装中不可再操作 */
  P.isAllyInsideGate = function isAllyInsideGate(unit) {
    const wallX = GAME_DATA.defense?.wallX || 14;
    return !!unit && unit.isAlly && !unit.isDead && !unit._rosterSwapping && unit.x <= wallX - 0.5;
  };

  P.countLivingAlliesByPost = function countLivingAlliesByPost(postId) {
    const units = this.ensureDefenseState().raid?.units || [];
    return units.filter(u => u.isAlly && !u.isDead && u.postId === postId).length;
  };

  P.countInsideAlliesByPost = function countInsideAlliesByPost(postId) {
    const units = this.ensureDefenseState().raid?.units || [];
    return units.filter(u => u.postId === postId && this.isAllyInsideGate(u)).length;
  };

  P.getRosterSwapSec = function getRosterSwapSec() {
    return Math.max(0.05, Number(GAME_DATA.defense?.rosterSwapSecPerPerson) || 1);
  };

  P.countPendingRosterAdds = function countPendingRosterAdds(postId) {
    const q = this.ensureDefenseState().raid?.rosterSwapQueue || [];
    return q.filter((j) => j.kind === 'add' && (!postId || j.postId === postId)).length;
  };

  P.countPendingRosterRemoves = function countPendingRosterRemoves(postId) {
    const q = this.ensureDefenseState().raid?.rosterSwapQueue || [];
    return q.filter((j) => j.kind === 'remove' && (!postId || j.postId === postId)).length;
  };

  /** 战斗编制显示人数：在场存活 + 排队换装增援 */
  P.countRosterDisplayByPost = function countRosterDisplayByPost(postId) {
    return this.countLivingAlliesByPost(postId) + this.countPendingRosterAdds(postId);
  };

  P.getRosterSwapQueueEtaSec = function getRosterSwapQueueEtaSec() {
    const d = this.ensureDefenseState();
    const q = d.raid.rosterSwapQueue || [];
    if (!q.length) return 0;
    const per = this.getRosterSwapSec();
    const curLeft = Math.max(0, Number(d.raid.rosterSwapMsLeft) || 0) / 1000;
    return curLeft + Math.max(0, q.length - 1) * per;
  };

  P.enqueueRosterSwapJobs = function enqueueRosterSwapJobs(jobs) {
    const d = this.ensureDefenseState();
    if (!Array.isArray(d.raid.rosterSwapQueue)) d.raid.rosterSwapQueue = [];
    const wasEmpty = d.raid.rosterSwapQueue.length === 0;
    jobs.forEach((j) => d.raid.rosterSwapQueue.push(j));
    if (wasEmpty && d.raid.rosterSwapQueue.length > 0) {
      d.raid.rosterSwapMsLeft = this.getRosterSwapSec() * 1000;
    }
  };

  /** 战斗结束或中断时：撤销未完成的换装占用 */
  P.clearRosterSwapQueue = function clearRosterSwapQueue() {
    const d = this.ensureDefenseState();
    const q = d.raid.rosterSwapQueue || [];
    q.forEach((job) => {
      if (job.kind === 'add') {
        d.raid.activeRepairWorkers = (d.raid.activeRepairWorkers || 0) + 1;
        if (d.raid.activePosts) {
          d.raid.activePosts[job.postId] = Math.max(0, (d.raid.activePosts[job.postId] || 0) - 1);
        }
        d.posts[job.postId] = Math.max(0, (d.posts[job.postId] || 0) - 1);
        if (job.postId === 'bare') {
          d.raid.bareFighters = Math.max(0, (d.raid.bareFighters || 0) - 1);
        }
      } else if (job.kind === 'remove') {
        const u = (d.raid.units || []).find((x) => x && x.id === job.unitId);
        if (u) delete u._rosterSwapping;
      }
    });
    d.raid.rosterSwapQueue = [];
    d.raid.rosterSwapMsLeft = 0;
  };

  P.completeRosterSwapJob = function completeRosterSwapJob(job) {
    if (!job) return;
    const d = this.ensureDefenseState();
    if (!Array.isArray(d.raid.units)) d.raid.units = [];
    const postName = POST_DEFS.find((p) => p.id === job.postId)?.name || job.postId;

    if (job.kind === 'add') {
      let maxUid = 0;
      d.raid.units.forEach((u) => {
        const m = String(u.id || '').match(/(\d+)$/);
        if (m) maxUid = Math.max(maxUid, parseInt(m[1], 10) + 1);
      });
      const living = this.countLivingAlliesByPost(job.postId);
      this.syncDefenseSoldiersFromPosts(d);
      const linked = new Set(
        (d.raid.units || []).filter((u) => u?.isAlly && u.soldierId).map((u) => u.soldierId)
      );
      let soldier = (d.soldiers || []).find((s) => s.postId === job.postId && !linked.has(s.id));
      if (!soldier) {
        soldier = this.createDefenseSoldier(job.postId);
        d.soldiers.push(soldier);
      }
      const unit = this.buildAllyCombatUnit(job.postId, maxUid, living, true, {
        soldierId: soldier.id,
        hp: soldier.hp,
      });
      if (unit) {
        d.raid.units.push(unit);
        this.pushRaidLog(`➕ ${postName}换装完成，加入防线`);
      } else {
        // 生成失败：退回修门名额与编制占用
        d.raid.activeRepairWorkers = (d.raid.activeRepairWorkers || 0) + 1;
        if (d.raid.activePosts) {
          d.raid.activePosts[job.postId] = Math.max(0, (d.raid.activePosts[job.postId] || 0) - 1);
        }
        d.posts[job.postId] = Math.max(0, (d.posts[job.postId] || 0) - 1);
        this.removeDefenseSoldier(soldier.id, false);
        if (job.postId === 'bare') {
          d.raid.bareFighters = Math.max(0, (d.raid.bareFighters || 0) - 1);
        }
        this.pushRaidLog(`⚠️ ${postName}换装失败，已退回修门队`);
      }
      return;
    }

    if (job.kind === 'remove') {
      const idx = d.raid.units.findIndex((u) => u && u.id === job.unitId);
      if (idx < 0) return;
      const unit = d.raid.units[idx];
      if (unit.isDead) {
        delete unit._rosterSwapping;
        return;
      }
      const postId = unit.postId || job.postId;
      if (unit.soldierId) this.removeDefenseSoldier(unit.soldierId, false);
      d.raid.units.splice(idx, 1);
      d.raid.activeRepairWorkers = (d.raid.activeRepairWorkers || 0) + 1;
      if (d.raid.activePosts) {
        d.raid.activePosts[postId] = Math.max(0, (d.raid.activePosts[postId] || 0) - 1);
      }
      d.posts[postId] = Math.max(0, (d.posts[postId] || 0) - 1);
      if (postId === 'bare') {
        d.raid.bareFighters = Math.max(0, (d.raid.bareFighters || 0) - 1);
      }
      this.pushRaidLog(`🔙 ${POST_DEFS.find((p) => p.id === postId)?.name || postId}卸装完成，转入修门队`);
    }
  };

  P.processRosterSwapQueue = function processRosterSwapQueue(dt) {
    const d = this.ensureDefenseState();
    if (d.raid.phase !== 'combat') return;
    if (!Array.isArray(d.raid.rosterSwapQueue)) d.raid.rosterSwapQueue = [];
    const queue = d.raid.rosterSwapQueue;

    // 换装中阵亡：取消卸装任务（人已死，不回修门名额）
    for (let i = queue.length - 1; i >= 0; i--) {
      const job = queue[i];
      if (job.kind !== 'remove') continue;
      const u = (d.raid.units || []).find((x) => x && x.id === job.unitId);
      if (!u || u.isDead) {
        if (u) delete u._rosterSwapping;
        queue.splice(i, 1);
      }
    }
    if (!queue.length) {
      d.raid.rosterSwapMsLeft = 0;
      return;
    }

    const needMs = this.getRosterSwapSec() * 1000;
    if (!(d.raid.rosterSwapMsLeft > 0)) d.raid.rosterSwapMsLeft = needMs;
    // dt 已含游戏倍速
    d.raid.rosterSwapMsLeft -= dt;
    let finished = false;
    while (queue.length && d.raid.rosterSwapMsLeft <= 0) {
      this.completeRosterSwapJob(queue.shift());
      finished = true;
      d.raid.rosterSwapMsLeft += queue.length ? needMs : 0;
    }
    if (!queue.length) d.raid.rosterSwapMsLeft = 0;
    if (finished) {
      this.updateBattleScreenVisuals?.();
      if (this.state.activeTab === 'defense') this.renderDefenseOverview?.();
    }
  };

  /** 按编制生成单个友军单位（开战生成 / 战时从修门队增援共用）
   * @param {boolean} [readyToFire] 为 true 时冷却为 0（增援立即出手）；开战默认需先蓄力
   * @param {{ soldierId?: string, hp?: number, x?: number, y?: number }} [opts]
   */
  P.buildAllyCombatUnit = function buildAllyCombatUnit(postId, uid, yIndex, readyToFire, opts) {
    const cfg = GAME_DATA.defense || {};
    const wallX = cfg.wallX || 10;
    const snap = this.getAllyPostStatSnapshot(postId);
    if (!snap) return null;
    const { postDef, isRanged, isBare, atk, aspd, range } = snap;
    const bodyMaxHp = snap.bodyMaxHp || snap.maxHp;
    const baseMove = snap.move;
    const baseDrMelee = snap.drMelee || 0;
    const baseDrRanged = snap.drRanged || 0;
    const baseFlatDr = snap.flatDr || 0;
    const baseX = isBare ? wallX - 5 : (isRanged ? wallX - 3 : wallX - 1);
    const yi = yIndex || 0;

    let bodyHp = bodyMaxHp;
    if (opts?.hp != null && !Number.isNaN(Number(opts.hp))) {
      bodyHp = Math.max(0, Math.min(bodyMaxHp, Number(opts.hp)));
    }

    let armorPiece = null;
    let armorHp = 0;
    let armorMaxHp = 0;
    let armorLevel = 0;
    let move = baseMove;
    let drMelee = baseDrMelee;
    let drRanged = baseDrRanged;
    let flatDr = baseFlatDr;

    if (!isBare && opts?.soldierId) {
      armorPiece = this.allocateArmorForSoldier?.(opts.soldierId) || null;
    } else if (!isBare) {
      armorPiece = this.pickFreeArmorPiece?.() || null;
      if (armorPiece) armorPiece.equippedBy = opts?.soldierId || ('ally_' + uid);
    }

    if (armorPiece) {
      armorLevel = armorPiece.level;
      armorMaxHp = armorPiece.maxDur || this.getArmorMaxDurability?.(armorLevel) || 30;
      armorHp = Math.max(0, Math.min(armorMaxHp, armorPiece.dur ?? armorMaxHp));
      armorPiece.dur = armorHp;
      const armed = this.applyArmorStatsToSnap?.({
        drMelee: baseDrMelee,
        drRanged: baseDrRanged,
        flatDr: baseFlatDr,
        move: baseMove,
      }, armorLevel);
      if (armed) {
        drMelee = armed.drMelee;
        drRanged = armed.drRanged;
        flatDr = armed.flatDr;
        move = armed.move;
      }
    }

    return createUnit({
      id: 'ally_' + uid,
      isAlly: true,
      postId: postDef.id,
      role: postDef.role,
      name: postDef.name,
      icon: postDef.icon,
      atk,
      bodyHp,
      bodyMaxHp,
      armorHp,
      armorMaxHp,
      armorPieceId: armorPiece?.id || null,
      armorLevel,
      aspd,
      cooldown: readyToFire ? 0 : (1 / aspd),
      range,
      move,
      baseMove,
      x: opts?.x != null ? opts.x : baseX,
      y: opts?.y != null ? opts.y : ((yi % 7) - 3 + (Math.floor(yi / 7)) * 0.8),
      drMelee,
      drRanged,
      flatDr,
      baseDrMelee,
      baseDrRanged,
      baseFlatDr,
      soldierId: opts?.soldierId || null,
    });
  };

  P.spawnCombatUnits = function spawnCombatUnits(wave) {
    const d = this.ensureDefenseState();
    const cfg = GAME_DATA.defense || {};
    const units = [];
    let uid = 0;

    // ---- 生成友军（按士兵档案保留血量） ----
    this.syncDefenseSoldiersFromPosts(d);
    const posts = d.raid.activePosts || {};
    const usedSoldierIds = new Set();
    const allyOccupied = [];
    POST_DEFS.forEach(postDef => {
      const count = posts[postDef.id] || 0;
      const pool = d.soldiers.filter((s) => s.postId === postDef.id && !usedSoldierIds.has(s.id));
      for (let i = 0; i < count; i++) {
        let soldier = pool[i];
        if (!soldier) {
          soldier = this.createDefenseSoldier(postDef.id);
          d.soldiers.push(soldier);
          d.posts[postDef.id] = (d.posts[postDef.id] || 0) + 1;
        }
        usedSoldierIds.add(soldier.id);
        const maxHp = this.getAllyPostMaxHp(postDef.id);
        this.applySoldierHpAgainstMax(soldier, maxHp);
        const savedPos = d.unitPositions?.[soldier.id];
        const prefer = (savedPos && Number.isFinite(savedPos.x) && Number.isFinite(savedPos.y))
          ? { x: savedPos.x, y: savedPos.y }
          : this.pickDefaultSlotForSoldier(soldier, allyOccupied);
        const free = this.findNonOverlappingBattlePos(prefer.x, prefer.y, allyOccupied);
        allyOccupied.push(free);
        if (!d.unitPositions) d.unitPositions = {};
        d.unitPositions[soldier.id] = { x: free.x, y: free.y };
        const unit = this.buildAllyCombatUnit(postDef.id, uid++, i, false, {
          soldierId: soldier.id,
          hp: soldier.hp,
          x: free.x,
          y: free.y,
        });
        if (unit) units.push(unit);
      }
    });
    // 同阵营无碰撞；站位已按列阵槽位排开，不再互推

    units.filter((u) => u.isAlly).forEach((u) => {
      if (u.soldierId) {
        if (!d.unitPositions) d.unitPositions = {};
        d.unitPositions[u.soldierId] = { x: u.x, y: u.y || 0 };
      }
    });

    // ---- 生成敌军 ----
    const isBossWave = wave?.id === 'demon_king';
    const bossAtkMult = isBossWave ? (this.getDifficultyMult?.('bossAtkMult', 1) || 1) : 1;
    const bossHpMult = isBossWave ? (this.getDifficultyMult?.('bossHpMult', 1) || 1) : 1;
    const spawnX = cfg.spawnX || 92;
    let enemyIdx = 0;
    (wave?.composition || []).forEach(comp => {
      const icon = comp.icon || ENEMY_ICONS[comp.role] || '👺';
      const compMove = comp.move != null ? comp.move : (cfg.enemyDefaults?.[comp.role]?.move || 12);
      const compRange = comp.range != null ? comp.range : (cfg.enemyDefaults?.[comp.role]?.range || 4);
      for (let i = 0; i < (comp.count || 0); i++) {
        const formationIdx = enemyIdx++;
        const xPos = spawnX - (formationIdx % 12) * 2.5;
        const yPos = ((formationIdx % 15) - 7) * 1.8;
        units.push(createUnit({
          id: 'enemy_' + (uid++),
          isAlly: false,
          role: comp.role || 'melee',
          name: comp.name || '敌人',
          icon: icon,
          atk: Math.round((comp.atk || 3) * bossAtkMult),
          hp: Math.round((comp.hp || 10) * bossHpMult),
          maxHp: Math.round((comp.hp || 10) * bossHpMult),
          aspd: comp.aspd || 1,
          range: compRange,
          move: compMove,
          x: xPos,
          y: yPos,
          drMelee: 0,
          drRanged: 0,
          flatDr: comp.flatDr || 0,
        }));
      }
    });

    // ---- 添加上次撤退的残敌 ----
    let carryoverIdx = enemyIdx + 100;
    const carryover = d.raid.carryoverEnemies || [];
    for (const ce of carryover) {
      if (ce.hp <= 0) continue;
      const ci = carryoverIdx++;
      units.push(createUnit({
        id: 'enemy_' + (uid++),
        isAlly: false,
        role: ce.role || 'melee',
        name: (ce.name || '残敌') + '(残)',
        icon: ce.icon || '👺',
        atk: ce.atk || 3,
        hp: ce.hp || 10,
        maxHp: ce.maxHp || ce.hp || 10,
        aspd: ce.aspd || 1,
        range: ce.range || 4,
        move: ce.move || 10,
        x: (cfg.spawnX || 92) - (ci % 12) * 2.5,
        y: ((ci % 15) - 7) * 1.8,
        drMelee: 0,
        drRanged: 0,
        flatDr: ce.flatDr || 0,
      }));
    }

    d.raid.units = units;
  };

  /** 获得某编制可用的最高级武器数据 */
  P.getAllocatedWeaponForPost = function getAllocatedWeaponForPost(postDef, idx, totalCount) {
    const cfg = GAME_DATA.defense || {};
    const weapons = cfg.weapons || {};
    if (postDef.tool) {
      const lv = this.getBestToolLevel(postDef.tool);
      const wd = weapons[postDef.tool]?.[lv] || weapons[postDef.tool]?.[1];
      if (wd) return wd;
    }
    if (postDef.tools) {
      // 用主武器（剑）
      const lv = this.getBestToolLevel(postDef.tools[0]);
      const wd = weapons[postDef.tools[0]]?.[lv] || weapons[postDef.tools[0]]?.[1];
      if (wd) return wd;
    }
    return { atk: 2, def: 0, hp: 12, aspd: 1.1, range: 4, move: 14 };
  };

  /** 获得某种工具当前库存的最高等级 */
  P.getBestToolLevel = function getBestToolLevel(toolId) {
    const toolDef = GAME_DATA.villagerTools?.[toolId];
    const maxLv = toolDef?.maxLevel || 4;
    for (let lv = maxLv; lv >= 1; lv--) {
      if (this.getToolCount(toolId, lv) > 0) return lv;
    }
    return 1;
  };

  /* ============ 个体战斗 AI 系统 ============ */

  /** 单位 AI 寻敌：友军找最近的敌军 */
  P.findAllyTarget = function findAllyTarget(unit) {
    const d = this.ensureDefenseState();
    const enemies = d.raid.units.filter(u => !u.isAlly && !u.isDead);
    if (!enemies.length) return null;

    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      const dist = unitDist(unit, e);
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  };

  /** 单位 AI 寻敌：敌军找最近的友军或门 */
  P.findEnemyTarget = function findEnemyTarget(unit) {
    const d = this.ensureDefenseState();
    const cfg = GAME_DATA.defense || {};
    const wallX = cfg.wallX || 10;
    const stance = d.stance || 'defend';

    // 门还立着时，敌人只能攻击城门或城外的单位
    if ((d.gate.hp || 0) > 0) {
      // 找在城门外的友军（x > wallX + 5, 即出击出去的近战）
      const outsideAllies = d.raid.units.filter(u => u.isAlly && !u.isDead && u.x > wallX + 5);
      if (outsideAllies.length > 0) {
        let best = null;
        let bestDist = Infinity;
        for (const a of outsideAllies) {
          const dist = unitDist(unit, a);
          if (dist < bestDist) {
            bestDist = dist;
            best = a;
          }
        }
        return best;
      }
      // 城外没有友军 → 打门
      return { id: '__gate__', x: wallX, isGate: true, name: '城门' };
    }

    // 城门已破 → 找最近的任何友军
    const allies = d.raid.units.filter(u => u.isAlly && !u.isDead);
    if (!allies.length) return { id: '__gate__', x: wallX, isGate: true, name: '城门' };

    let best = null;
    let bestDist = Infinity;
    for (const a of allies) {
      const dist = unitDist(unit, a);
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  };

  /** 计算伤害：百分比减伤后，再扣固定减伤；至少造成 1 点。友军铠甲血量先吸收，吸干则铠甲损坏。 */
  P.dealDamage = function dealDamage(attacker, target) {
    const isRanged = attacker.role === 'ranged';
    const dr = isRanged ? (target.drRanged || 0) : (target.drMelee || 0);
    let flatDr = target.flatDr || 0;
    if (target.isAlly && typeof this.getAllyFlatDrBonus === 'function') {
      flatDr += this.getAllyFlatDrBonus();
    }
    let finalDmg = Math.max(1, attacker.atk * (1 - dr) - flatDr);

    if (target.isAlly && (target.armorHp || 0) > 0) {
      const absorbed = Math.min(target.armorHp, finalDmg);
      target.armorHp -= absorbed;
      finalDmg -= absorbed;
      const piece = target.armorPieceId ? this.findArmorPiece?.(target.armorPieceId) : null;
      if (piece) piece.dur = Math.max(0, target.armorHp);
      if (target.armorHp <= 0) {
        this.stripUnitArmor?.(target, true);
      }
    }

    if (finalDmg > 0) {
      if (target.bodyHp == null) target.bodyHp = target.hp;
      target.bodyHp = Math.max(0, target.bodyHp - finalDmg);
    }
    target.hp = Math.max(0, (target.bodyHp || 0) + (target.armorHp || 0));
    target.maxHp = Math.max(1, (target.bodyMaxHp || target.maxHp || 1) + (target.armorMaxHp || 0));
    if (target.hp <= 0 || (target.bodyHp != null && target.bodyHp <= 0 && !(target.armorHp > 0))) {
      target.hp = 0;
      target.bodyHp = 0;
      target.isDead = true;
    }
    return Math.max(1, attacker.atk * (1 - dr) - flatDr);
  };

  /** 铠甲耐久打空：损毁该件，并移除减伤/移速惩罚 */
  P.stripUnitArmor = function stripUnitArmor(unit, destroyed) {
    if (!unit) return;
    const pieceId = unit.armorPieceId;
    const level = unit.armorLevel || 0;
    if (destroyed && pieceId) {
      this.destroyArmorPiece?.(pieceId);
      const name = GAME_DATA.villagerTools?.armor?.levelNames?.[level] || '铠甲';
      this.pushRaidLog?.(`🥋 ${unit.icon || ''} ${unit.name || '士兵'} 的${name}损毁了`);
    } else if (pieceId) {
      const piece = this.findArmorPiece?.(pieceId);
      if (piece) {
        piece.dur = Math.max(0, unit.armorHp || 0);
        piece.equippedBy = null;
      }
    }
    unit.armorHp = 0;
    unit.armorMaxHp = 0;
    unit.armorPieceId = null;
    unit.armorLevel = 0;
    unit.drMelee = unit.baseDrMelee || 0;
    unit.drRanged = unit.baseDrRanged || 0;
    unit.flatDr = unit.baseFlatDr || 0;
    if (unit.baseMove != null) unit.move = unit.baseMove;
    unit.maxHp = unit.bodyMaxHp || unit.maxHp;
    unit.hp = unit.bodyHp != null ? unit.bodyHp : unit.hp;
  };

  /** 处理单帧战斗 AI（移动、攻击、伤害） */
  P.processCombatTick = function processCombatTick(realDt) {
    const d = this.ensureDefenseState();
    const cfg = GAME_DATA.defense || {};
    const wallX = cfg.wallX || 10;
    const fieldLen = cfg.fieldLength || 100;
    const gateReach = cfg.gateReach || 7;
    const realSec = realDt / 1000;
    const stance = d.stance || 'defend';

    if (!d.raid.units) return;

    // 初始化攻击事件队列
    if (!d.raid._attackEvents) d.raid._attackEvents = [];

    // 应用时间倍速
    const timeScale = this.timeScale || 1;

    // 随军出击：近战/远程各自取在场最慢移速（接敌前齐步）
    let marchMeleeMin = Infinity;
    let marchRangedMin = Infinity;
    if (stance === 'march') {
      for (const u of d.raid.units) {
        if (!u.isAlly || u.isDead || u._rosterSwapping) continue;
        const mv = u.move || 0;
        if (u.role === 'ranged') {
          if (mv < marchRangedMin) marchRangedMin = mv;
        } else if (mv < marchMeleeMin) {
          marchMeleeMin = mv;
        }
      }
    }

    // 遍历所有存活单位
    for (const unit of d.raid.units) {
      if (unit.isDead) continue;
      // 换装中：不移动、不攻击（仍可被敌人打到）
      if (unit._rosterSwapping) continue;

      // 冷却倒计时（aspd = 攻击次数/秒）
      // 无论是否在射程内都走表：远程可在接敌前完成蓄力，进圈立刻开火
      unit.cooldown = Math.max(0, unit.cooldown - realSec * timeScale);

      // 玩家右键/中键队列指令：优先生效，到达前不走姿态 AI 位移
      if (unit.isAlly && this.hasUnitMoveOrder?.(unit.id)) {
        let target = this.findAllyTarget(unit);
        unit.target = target?.id || null;
        if (target) {
          const distToTarget = unitDist(unit, target);
          const atkPeriod = 1 / Math.max(0.05, unit.aspd || 1);
          if (distToTarget <= unit.range && unit.cooldown <= 0) {
            this.dealDamage(unit, target);
            unit.cooldown = atkPeriod;
            const isRanged = unit.role === 'ranged';
            d.raid._attackEvents.push({
              type: isRanged ? 'projectile' : 'melee',
              sx: unit.x,
              sy: unit.y || 0,
              tx: target.x,
              ty: target.y || 0,
              isAlly: true,
            });
            if (target.isDead) {
              this.pushRaidLog(`💀 ${target.icon} ${target.name} 阵亡`);
            }
          }
        }
        continue;
      }

      // 防御姿态：门外友军优先撤回门内（暂不接战）
      if (unit.isAlly && stance === 'defend') {
        const insideLine = wallX - 0.5;
        if (unit.x > insideLine) {
          const homeX = unit.role === 'ranged' ? wallX - 2 : insideLine;
          const dx = homeX - unit.x;
          const step = unit.move * realSec * timeScale;
          if (Math.abs(dx) > 0.01) {
            const delta = Math.sign(dx) * Math.min(step, Math.abs(dx));
            unit.x = Math.max(0, Math.min(fieldLen, unit.x + delta));
          }
          continue;
        }
      }

      // 获取目标
      let target = null;
      if (unit.isAlly) {
        target = this.findAllyTarget(unit);
      } else {
        target = this.findEnemyTarget(unit);
      }
      unit.target = target?.id || null;

      if (!target) continue;

      const isGateTarget = target.isGate;
      const distToTarget = isGateTarget
        ? Math.abs(unit.x - target.x)
        : unitDist(unit, target);
      const inRange = distToTarget <= unit.range;
      const atkPeriod = 1 / Math.max(0.05, unit.aspd || 1);

      // 在射程内且冷却完毕 → 立刻攻击（进圈前已读完条则可零延迟出手）
      if (inRange && unit.cooldown <= 0) {
        if (unit.isAlly && stance === 'march' && !isGateTarget) {
          unit._marchEngaged = true;
        }
        if (isGateTarget) {
          // 敌人攻击门
          const gateDef = this.getGateLevelDef(d.gate.level);
          const dr = gateDef?.damageReduction || 0;
          const gateDmg = Math.max(1, unit.atk * (1 - dr));
          const prevGateHp = d.gate.hp || 0;
          d.gate.hp = Math.max(0, prevGateHp - gateDmg);
          unit.cooldown = atkPeriod;
          if (prevGateHp > 0 && d.gate.hp <= 0) {
            this.pushRaidLog('💥 城门告破！');
          }
          d.raid._attackEvents.push({
            type: 'gate',
            x: wallX,
            y: 0,
            isAlly: false,
          });
        } else {
          // 单位间攻击
          this.dealDamage(unit, target);
          unit.cooldown = atkPeriod;
          const isRanged = unit.role === 'ranged';
          d.raid._attackEvents.push({
            type: isRanged ? 'projectile' : 'melee',
            sx: unit.x,
            sy: unit.y || 0,
            tx: target.x,
            ty: target.y || 0,
            isAlly: unit.isAlly,
          });
          if (target.isDead) {
            this.pushRaidLog(`💀 ${target.icon} ${target.name} 阵亡`);
          }
        }
        continue;
      }

      // 射程内但冷却中：也算已接敌
      if (unit.isAlly && stance === 'march' && !isGateTarget && inRange) {
        unit._marchEngaged = true;
      }

      // 不在射程内 → 移动（冷却仍在上方走表，不在此处重置）
      if (!inRange) {
        let targetX;
        if (unit.isAlly) {
          if (unit.role === 'ranged') {
            if (target && !target.isGate) {
              const desireX = target.x - unit.range + 1;
              if (stance === 'defend') {
                targetX = Math.max(wallX - 4, Math.min(wallX - 0.5, desireX));
              } else if (stance === 'march') {
                // 随军：远程也随队前压到交战射程
                targetX = Math.max(wallX - 1, desireX);
              } else if (unit.x > wallX + 5) {
                targetX = Math.min(desireX, unit.x);
              } else {
                targetX = Math.max(wallX - 4, Math.min(wallX - 0.5, desireX));
              }
            } else {
              targetX = wallX - 2;
            }
          } else if (stance === 'attack' || stance === 'march') {
            const pushX = wallX + 30;
            targetX = target.isGate
              ? pushX
              : Math.max(wallX + 6, Math.min(target.x - unit.range + 1, pushX));
          } else {
            targetX = wallX - 0.5;
          }
        } else {
          if (unit.role === 'siege') {
            targetX = wallX - 1;
          } else if (unit.role === 'ranged') {
            if (target && !target.isGate) {
              targetX = Math.min(target.x + unit.range - 1, unit.x);
            } else {
              targetX = wallX - 3;
            }
          } else {
            if (target && !target.isGate) {
              targetX = target.x + unit.range - 1;
            } else {
              targetX = wallX - 1;
            }
          }
        }

        if (targetX !== undefined && targetX !== unit.x) {
          const dx = targetX - unit.x;
          let moveRate = unit.move || 0;
          // 随军出击：接敌前近战/远程各自按最慢者齐步
          if (unit.isAlly && stance === 'march' && !unit._marchEngaged) {
            const groupMin = unit.role === 'ranged' ? marchRangedMin : marchMeleeMin;
            if (Number.isFinite(groupMin)) moveRate = groupMin;
          }
          const step = moveRate * realSec * timeScale;
          const delta = Math.sign(dx) * Math.min(step, Math.abs(dx));
          unit.x = Math.max(0, Math.min(fieldLen, unit.x + delta));
        }
      }
    }

    // 仅敌对单位互撞；同阵营可穿越（含友军队列路过）
    this.separateBattleUnits?.(d.raid.units, {
      hostileOnly: true,
      iterations: 3,
    });
  };

  /** 实时战场可视化：在 #battle-units 中渲染个体单位 */
  P.updateBattleScreenVisuals = function updateBattleScreenVisuals() {
    const unitsContainer = document.getElementById('battle-embed-units');
    if (!unitsContainer) return;
    const d = this.ensureDefenseState();
    const allUnits = d.raid.units || [];

    // 统计信息：存活数量
    let allyAlive = 0, enemyAlive = 0;
    allUnits.forEach(u => {
      if (u.isDead) return;
      if (u.isAlly) allyAlive++;
      else enemyAlive++;
    });

    document.getElementById('battle-ally-count') && (document.getElementById('battle-ally-count').textContent = '' + allyAlive);
    document.getElementById('battle-enemy-count') && (document.getElementById('battle-enemy-count').textContent = '' + enemyAlive);

    // 增量更新单位 DOM（避免完全重建导致拖拽状态丢失）
    const existing = new Map();
    unitsContainer.querySelectorAll('.bf-unit').forEach(el => {
      existing.set(el.dataset.unitId, el);
    });

    // 标记所有已存在的单位为"待移除"
    const toRemove = new Set(existing.keys());

    allUnits.forEach(unit => {
      if (unit.isDead) return;
      const uid = unit.id;
      toRemove.delete(uid);

      let el = existing.get(uid);
      const isNew = !el;
      if (isNew) {
        el = document.createElement('div');
        el.className = 'bf-unit' + (unit.isAlly ? '' : ' enemy');
        el.dataset.unitId = uid;
        el.dataset.isAlly = unit.isAlly ? '1' : '0';
        el.dataset.role = unit.role || 'melee';
        el.innerHTML = `
          <span class="bf-icon">${unit.icon}</span>
          <div class="bf-hp"><i></i></div>
          <div class="bf-cd" title="攻击冷却"><i></i></div>
        `;
        unitsContainer.appendChild(el);
      } else if (!el.querySelector('.bf-cd')) {
        const cd = document.createElement('div');
        cd.className = 'bf-cd';
        cd.title = '攻击冷却';
        cd.innerHTML = '<i></i>';
        el.appendChild(cd);
      }
      if (unit.isAlly) {
        el.dataset.role = unit.role || 'melee';
        el.classList.toggle('is-selected', !!(this._selectedUnitIds && this._selectedUnitIds.has(uid)));
      }

      // 更新位置
      const pct = (unit.x / (GAME_DATA.defense?.fieldLength || 100)) * 100;
      el.style.left = pct + '%';
      el.style.top = this.battleYToTopPct(unit.y) + '%';
      el.classList.toggle('is-swapping', !!unit._rosterSwapping);

      // 更新血条
      const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
      const hpI = el.querySelector('.bf-hp i');
      if (hpI) {
        hpI.style.width = hpPct + '%';
        hpI.style.background = '';
      }

      // 攻击冷却读条：蓄满=可出手（cooldown 降至 0）
      const period = 1 / Math.max(0.05, unit.aspd || 1);
      const cdLeft = Math.max(0, Number(unit.cooldown) || 0);
      const readyPct = Math.max(0, Math.min(100, (1 - Math.min(cdLeft, period) / period) * 100));
      const cdI = el.querySelector('.bf-cd i');
      if (cdI) cdI.style.width = readyPct + '%';
      el.classList.toggle('atk-ready', readyPct >= 99.5 && !unit._rosterSwapping);
    });

    // 移除已死亡的单位
    toRemove.forEach(id => {
      const el = existing.get(id);
      if (el) el.remove();
      this.clearUnitMoveOrder?.(id);
      if (this._selectedUnitIds?.has(id)) this._selectedUnitIds.delete(id);
    });

    this._ensureFormationDragBound?.();
    this._syncMoveOrderLines?.();
    this._syncBattleHeroChrome?.(d);

    // 渲染攻击动画
    const events = d.raid._attackEvents || [];
    if (events.length > 0) {
      const fieldLength = GAME_DATA.defense?.fieldLength || 100;
      const fieldEl = unitsContainer.closest('.battle-embed-field');
      const fieldRect = fieldEl?.getBoundingClientRect();
      events.forEach(evt => {
        const fx = document.createElement('div');
        if (evt.type === 'gate') {
          fx.className = 'atk-fx gate-hit';
          const gpct = (evt.x / fieldLength) * 100;
          fx.style.left = gpct + '%';
          fx.style.top = '50%';
          fx.style.transform = 'translate(-50%,-50%)';
          unitsContainer.appendChild(fx);
          setTimeout(() => fx.remove(), 450);
        } else if (evt.type === 'projectile' && fieldRect) {
          fx.className = `atk-fx ${evt.isAlly ? 'ranged-ally' : 'ranged-enemy'}`;
          fx.style.position = 'fixed';
          fx.style.zIndex = '1100';
          fx.style.pointerEvents = 'none';
          const fieldW = fieldRect.width;
          const fieldH = fieldRect.height;
          const startPx = fieldRect.left + (evt.sx / fieldLength) * fieldW;
          const endPx = fieldRect.left + (evt.tx / fieldLength) * fieldW;
          const startPy = fieldRect.top + fieldH * (this.battleYToTopPct(evt.sy) / 100);
          const endPy = fieldRect.top + fieldH * (this.battleYToTopPct(evt.ty) / 100);
          fx.style.left = startPx + 'px';
          fx.style.top = startPy + 'px';
          document.body.appendChild(fx);
          const duration = 250;
          const startTime = performance.now();
          const tick = () => {
            const t = Math.min(1, (performance.now() - startTime) / duration);
            const cx = startPx + (endPx - startPx) * t;
            const cy = startPy + (endPy - startPy) * t;
            fx.style.left = cx + 'px';
            fx.style.top = cy + 'px';
            if (t < 1) requestAnimationFrame(tick);
            else fx.remove();
          };
          requestAnimationFrame(tick);
        } else {
          // 近战：在目标位置闪光
          fx.className = `atk-fx ${evt.isAlly ? 'melee-ally' : 'melee-enemy'}`;
          const tpct = (evt.tx / fieldLength) * 100;
          fx.style.left = tpct + '%';
          fx.style.top = this.battleYToTopPct(evt.ty) + '%';
          fx.style.transform = 'translate(-50%,-50%)';
          unitsContainer.appendChild(fx);
          setTimeout(() => fx.remove(), 400);
        }
      });
      d.raid._attackEvents = [];
    }
  };

  P.ensureDefenseState = function ensureDefenseState() {
    if (!this.state.defense) this.state.defense = this.createDefaultDefenseState();
    const d = this.state.defense;
    if (!d.posts) d.posts = { bow: 0, crossbow: 0, sword: 0, spear: 0, shield: 0, bare: 0 };
    // 旧存档：剑盾编制并入剑士
    if (d.posts.swordShield) {
      d.posts.sword = (d.posts.sword || 0) + (d.posts.swordShield || 0);
      delete d.posts.swordShield;
    }
    // 旧存档：斧兵编制并入长矛兵
    if (d.posts.axe) {
      d.posts.spear = (d.posts.spear || 0) + (d.posts.axe || 0);
      delete d.posts.axe;
    }
    if (d.raid?.activePosts?.swordShield) {
      d.raid.activePosts.sword = (d.raid.activePosts.sword || 0) + (d.raid.activePosts.swordShield || 0);
      delete d.raid.activePosts.swordShield;
    }
    if (d.raid?.activePosts?.axe) {
      d.raid.activePosts.spear = (d.raid.activePosts.spear || 0) + (d.raid.activePosts.axe || 0);
      delete d.raid.activePosts.axe;
    }
    POST_DEFS.forEach(p => { if (d.posts[p.id] == null) d.posts[p.id] = 0; });
    delete d.posts.swordShield;
    delete d.posts.axe;
    // 战场上残留的斧兵单位改标为长矛兵（敌军斧头单位不动）
    if (Array.isArray(d.raid?.units)) {
      d.raid.units.forEach((u) => {
        if (u?.isAlly && u.postId === 'axe') {
          u.postId = 'spear';
          u.name = '长矛兵';
          u.icon = '🔱';
        }
      });
    }
    if (!d.gate) d.gate = { level: 1, hp: 200, repairWorkers: 0, repairProgress: 0 };
    if (!d._gateHpDoubledV1) {
      d.gate.hp = Math.min(
        this.getGateLevelDef(d.gate.level)?.maxHp || (d.gate.hp || 0) * 2,
        Math.round((d.gate.hp || 0) * 2)
      );
      d._gateHpDoubledV1 = true;
    }
    {
      const gateDef = this.getGateLevelDef(d.gate.level);
      if (gateDef && (d.gate.hp || 0) > gateDef.maxHp) d.gate.hp = gateDef.maxHp;
    }
    if (!d.raid) {
      const firstDay = this.getFirstRaidDay();
      d.raid = {
        phase: 'idle',
        nextRaidDay: firstDay,
        failStreak: 0,
        warningMsLeft: 0,
        combatMsLeft: 0,
        log: [],
        units: [],
        carryoverEnemies: [], // 上次未杀完撤退的残敌
      };
    }
    if (!d.raid.carryoverEnemies) d.raid.carryoverEnemies = [];
    if (!Array.isArray(d.raid.rosterSwapQueue)) d.raid.rosterSwapQueue = [];
    if (d.raid.rosterSwapMsLeft == null) d.raid.rosterSwapMsLeft = 0;
    if (!d.unitPositions) d.unitPositions = {};
    if (d.stance !== 'attack' && d.stance !== 'defend' && d.stance !== 'march') d.stance = 'defend';
    if (!Array.isArray(d.soldiers)) d.soldiers = [];
    if (d._soldierSeq == null) d._soldierSeq = 1;
    this.syncDefenseSoldiersFromPosts(d);
    return d;
  };

  /** 下一枚士兵稳定 ID */
  P.allocDefenseSoldierId = function allocDefenseSoldierId() {
    const d = this.state.defense || this.ensureDefenseState();
    if (d._soldierSeq == null) d._soldierSeq = 1;
    return 'soldier_' + (d._soldierSeq++);
  };

  /** 当前编制本体最大生命（不含铠甲血量；铠甲血量即该件耐久） */
  P.getAllyPostMaxHp = function getAllyPostMaxHp(postId) {
    const snap = this.getAllyPostStatSnapshot(postId);
    return snap?.bodyMaxHp || snap?.maxHp || 10;
  };

  P.getAllyPostStatSnapshot = function getAllyPostStatSnapshot(postId) {
    const cfg = GAME_DATA.defense || {};
    const postDef = POST_DEFS.find(p => p.id === postId);
    if (!postDef) return null;
    const allyTable = cfg.allyStats || {};
    const combatMult = this.getAllyCombatMults?.() || { hp: 1, atk: 1, aspd: 1 };
    const isRanged = postDef.role === 'ranged';
    const isBare = !!postDef.bare;
    let lv = 1;
    if (!isBare) {
      const mainTool = postDef.tool || postDef.tools?.[0] || '';
      lv = this.getBestToolLevel(mainTool);
    }
    const baseStat = isBare ? allyTable.bare : (allyTable[postDef.id]?.[lv] || allyTable[postDef.id]?.[1]);
    if (!baseStat) return null;
    const stat = { ...baseStat };
    stat.atk = Math.max(1, Math.round((stat.atk || 1) * combatMult.atk));
    const bodyMaxHp = Math.max(1, Math.round((stat.hp || 10) * combatMult.hp));
    stat.aspd = (stat.aspd || 1) * combatMult.aspd;
    return {
      postDef,
      isRanged,
      isBare,
      atk: stat.atk || 1,
      bodyMaxHp,
      maxHp: bodyMaxHp,
      aspd: Math.max(0.05, stat.aspd || 1),
      range: stat.range || (isRanged ? 35 : 4),
      move: stat.move || (isRanged ? 10 : 12),
      drMelee: stat.drMelee || 0,
      drRanged: stat.drRanged || 0,
      flatDr: stat.flatDr || 0,
    };
  };

  /** 把某件铠甲的减伤/移速叠到快照上（不把铠甲血加进 bodyMaxHp） */
  P.applyArmorStatsToSnap = function applyArmorStatsToSnap(snap, armorLevel) {
    if (!snap || !armorLevel) return snap;
    const armorStat = GAME_DATA.defense?.armorStats?.[armorLevel];
    if (!armorStat) return snap;
    snap.drMelee = Math.min((snap.drMelee || 0) + (armorStat.drMelee || 0), 0.9);
    snap.drRanged = Math.min((snap.drRanged || 0) + (armorStat.drRanged || 0), 0.9);
    snap.flatDr = (snap.flatDr || 0) + (armorStat.flatDr || 0);
    const penalty = Math.max(0, Math.min(0.95, armorStat.movePenalty || 0));
    snap._armorMovePenalty = penalty;
    if (penalty > 0) {
      snap.move = Math.max(0.1, (snap.move || 1) * (1 - penalty));
    }
    snap.armorMaxHp = this.getArmorMaxDurability?.(armorLevel) || armorStat.hp || 30;
    return snap;
  };

  /**
   * 装备/科技变更时只更新上限：当前血量不回满，仅在超过新上限时下调。
   */
  P.applySoldierHpAgainstMax = function applySoldierHpAgainstMax(soldier, maxHp) {
    if (!soldier) return;
    const cap = Math.max(1, Math.round(Number(maxHp) || 10));
    if (soldier.hp == null || Number.isNaN(Number(soldier.hp))) {
      soldier.hp = cap;
    } else {
      soldier.hp = Math.max(0, Math.min(cap, Number(soldier.hp)));
    }
  };

  P.createDefenseSoldier = function createDefenseSoldier(postId, hp) {
    const maxHp = this.getAllyPostMaxHp(postId);
    const soldier = {
      id: this.allocDefenseSoldierId(),
      postId,
      hp: hp != null ? Math.max(0, Math.min(maxHp, Number(hp))) : maxHp,
    };
    return soldier;
  };

  /** 按编制人数同步士兵列表；新兵满血，换装不回满老兵血量 */
  P.syncDefenseSoldiersFromPosts = function syncDefenseSoldiersFromPosts(defenseState) {
    const d = defenseState || this.ensureDefenseState();
    if (!Array.isArray(d.soldiers)) d.soldiers = [];
    if (!d.unitPositions) d.unitPositions = {};

    POST_DEFS.forEach((postDef) => {
      const want = Math.max(0, d.posts[postDef.id] || 0);
      const list = d.soldiers.filter((s) => s && s.postId === postDef.id);
      const maxHp = this.getAllyPostMaxHp(postDef.id);
      list.forEach((s) => this.applySoldierHpAgainstMax(s, maxHp));

      while (list.length < want) {
        const soldier = this.createDefenseSoldier(postDef.id);
        d.soldiers.push(soldier);
        list.push(soldier);
        // 尽量继承旧 preview_ 站位
        const oldKey = `preview_${postDef.id}_${list.length - 1}`;
        if (d.unitPositions[oldKey] && !d.unitPositions[soldier.id]) {
          d.unitPositions[soldier.id] = d.unitPositions[oldKey];
          delete d.unitPositions[oldKey];
        }
      }
      while (list.length > want) {
        const removed = list.pop();
        const idx = d.soldiers.findIndex((s) => s && s.id === removed.id);
        if (idx >= 0) d.soldiers.splice(idx, 1);
        if (removed?.id && d.unitPositions[removed.id]) delete d.unitPositions[removed.id];
      }
    });

    // 清理无效编制 / 旧 preview 键
    d.soldiers = d.soldiers.filter((s) => s && POST_DEFS.some((p) => p.id === s.postId));
    Object.keys(d.unitPositions).forEach((key) => {
      if (key.startsWith('preview_')) delete d.unitPositions[key];
      else if (key.startsWith('soldier_') && !d.soldiers.some((s) => s.id === key)) {
        delete d.unitPositions[key];
      }
    });

    // 铠甲着装：非徒手优先穿耐久不满的；徒手/已撤编卸下
    this.ensureArmorPieces?.();
    const livingIds = new Set((d.soldiers || []).map((s) => s.id));
    (this.state.armorPieces || []).forEach((p) => {
      if (p?.equippedBy && !livingIds.has(p.equippedBy)) p.equippedBy = null;
    });
    (d.soldiers || []).forEach((s) => {
      const postDef = POST_DEFS.find((p) => p.id === s.postId);
      if (!postDef || postDef.bare) {
        this.unequipArmorFromSoldier?.(s.id);
        return;
      }
      this.allocateArmorForSoldier?.(s.id);
    });
  };

  P.findDefenseSoldier = function findDefenseSoldier(soldierId) {
    if (!soldierId) return null;
    return (this.ensureDefenseState().soldiers || []).find((s) => s && s.id === soldierId) || null;
  };

  P.removeDefenseSoldier = function removeDefenseSoldier(soldierId, adjustPosts) {
    const d = this.ensureDefenseState();
    if (!soldierId || !Array.isArray(d.soldiers)) return null;
    const idx = d.soldiers.findIndex((s) => s && s.id === soldierId);
    if (idx < 0) return null;
    const [removed] = d.soldiers.splice(idx, 1);
    this.unequipArmorFromSoldier?.(soldierId);
    if (adjustPosts !== false && removed?.postId) {
      d.posts[removed.postId] = Math.max(0, (d.posts[removed.postId] || 0) - 1);
    }
    if (d.unitPositions?.[removed.id]) delete d.unitPositions[removed.id];
    return removed;
  };

  /** 战斗结束：存活回写本体血量与铠甲耐久，阵亡移出编制 */
  P.commitSoldiersAfterCombat = function commitSoldiersAfterCombat() {
    const d = this.ensureDefenseState();
    if (!Array.isArray(d.soldiers)) d.soldiers = [];
    const units = d.raid?.units || [];

    units.forEach((u) => {
      if (!u?.isAlly || !u.soldierId) return;
      if (u.isDead) {
        // 阵亡：卸下未毁铠甲回库存（残耐久保留）
        if (u.armorPieceId) {
          const piece = this.findArmorPiece?.(u.armorPieceId);
          if (piece) {
            piece.dur = Math.max(0, u.armorHp || 0);
            if (piece.dur <= 0) this.destroyArmorPiece?.(piece.id);
            else piece.equippedBy = null;
          }
        }
        this.removeDefenseSoldier(u.soldierId);
        return;
      }
      const soldier = this.findDefenseSoldier(u.soldierId);
      if (!soldier) return;
      const maxHp = this.getAllyPostMaxHp(soldier.postId);
      const bodyHp = u.bodyHp != null ? u.bodyHp : Math.max(0, (u.hp || 0) - (u.armorHp || 0));
      soldier.hp = Math.max(0, Math.min(maxHp, bodyHp));
      soldier.postId = u.postId || soldier.postId;
      if (u.armorPieceId) {
        const piece = this.findArmorPiece?.(u.armorPieceId);
        if (piece) {
          piece.dur = Math.max(0, u.armorHp || 0);
          piece.equippedBy = u.soldierId;
          if (piece.dur <= 0) {
            this.destroyArmorPiece?.(piece.id);
          }
        }
      }
    });

    // 保险：编制计数与士兵列表对齐
    POST_DEFS.forEach((p) => {
      d.posts[p.id] = d.soldiers.filter((s) => s.postId === p.id).length;
    });
  };

  /** 根据难度获取首次袭击日 */
  P.getFirstRaidDay = function getFirstRaidDay() {
    const diff = this.state.difficulty || 'normal';
    const diffDef = GAME_DATA.difficulty?.levels?.[diff];
    if (diffDef?.firstRaidDay !== undefined) return diffDef.firstRaidDay;
    return GAME_DATA.defense?.firstRaidDay || 7;
  };

  P.isRaidCombatActive = function isRaidCombatActive() {
    return this.ensureDefenseState().raid.phase === 'combat';
  };

  P.isRaidWorkPaused = function isRaidWorkPaused() {
    return this.isRaidCombatActive();
  };

  P.getDefensePostedCount = function getDefensePostedCount() {
    const d = this.ensureDefenseState();
    const posts = Object.values(d.posts).reduce((s, n) => s + (n || 0), 0);
    return posts;
  };

  P.getPostWeaponCap = function getPostWeaponCap(postId) {
    const def = POST_DEFS.find(p => p.id === postId);
    if (!def) return 0;
    if (def.bare) return 99999; // 徒手无限制
    if (def.tools) {
      return Math.min(...def.tools.map(t => this.getToolStockTotal(t)));
    }
    return this.getToolStockTotal(def.tool);
  };

  P.getGateLevelDef = function getGateLevelDef(level) {
    const lv = level || this.ensureDefenseState().gate.level || 1;
    return GAME_DATA.defense?.gate?.levels?.[lv] || null;
  };

  P.getRaidWaveForDay = function getRaidWaveForDay(day) {
    const waves = GAME_DATA.defense?.waves || [];
    let best = waves[0] || null;
    waves.forEach(w => {
      if ((w.minDay || 1) <= day) best = w;
    });
    return best;
  };

  P.getGameHourMs = function getGameHourMs() {
    return (GAME_DATA.calendar?.dayDurationMs || 900000) / 24;
  };

  /** 袭击最早开战时刻（游戏内小时） */
  P.getRaidCombatStartHour = function getRaidCombatStartHour() {
    return GAME_DATA.defense?.combatStartHour ?? 10;
  };

  /** 预警弹出时刻：天亮后（避免与跨日 00:00 叠在一起，造成“时间被重置”的错觉） */
  P.getRaidWarningHour = function getRaidWarningHour() {
    return GAME_DATA.calendar?.restEndHour
      ?? GAME_DATA.calendar?.startHour
      ?? 6;
  };

  /**
   * 距指定开战日 combatStartHour 的剩余毫秒（按当前 day + dayProgress 精确计算）
   * 不会改写 dayProgress。
   */
  P.getMsUntilRaidCombat = function getMsUntilRaidCombat(raidDay) {
    const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;
    const hourMs = dayMs / 24;
    const startHour = this.getRaidCombatStartHour();
    const day = this.state.day || 1;
    const progress = Math.max(0, Math.min(dayMs, this.state.dayProgress || 0));
    const targetDay = Math.max(day, raidDay || day);
    const targetProgress = startHour * hourMs;

    if (day > targetDay) return hourMs;
    if (day === targetDay) {
      return Math.max(hourMs, targetProgress - progress);
    }
    const restOfToday = dayMs - progress;
    const fullDaysBetween = targetDay - day - 1;
    return restOfToday + fullDaysBetween * dayMs + targetProgress;
  };

  /** 是否已到可弹出预警的时刻 */
  P._canTriggerRaidWarning = function _canTriggerRaidWarning(nextRaidDay, warnLead) {
    const day = this.state.day || 1;
    const next = nextRaidDay || 7;
    const warnDay = next - (warnLead ?? 2);
    if (day > warnDay && day < next) return true;
    if (day !== warnDay || day >= next) return false;
    const { hours } = this.getGameTimeOfDay();
    return hours >= this.getRaidWarningHour();
  };

  P.pushRaidLog = function pushRaidLog(msg) {
    const raid = this.ensureDefenseState().raid;
    if (!Array.isArray(raid.log)) raid.log = [];
    raid.log.unshift(msg);
    if (raid.log.length > 40) raid.log.length = 40;
  };

  P.setDefenseStance = function setDefenseStance(stance) {
    if (stance !== 'defend' && stance !== 'attack' && stance !== 'march') return;
    const d = this.ensureDefenseState();
    const prev = d.stance || 'defend';
    d.stance = stance;
    if (this.state.tutorial && !this.state.tutorial.completed) {
      this.state.tutorial.defenseStanceClicked = true;
    }
    // 切到随军：重新齐步，接敌标记清零
    if (stance === 'march' && Array.isArray(d.raid?.units)) {
      d.raid.units.forEach((u) => {
        if (u?.isAlly) u._marchEngaged = false;
      });
    }
    // 切回防御：检查站位，门外单位撤回城内
    if (stance === 'defend' && prev !== 'defend') {
      this.recallUnitsInsideGate();
    } else {
      this.render();
      this.save();
    }
  };

  /** 预览单位默认站位（门内） */
  P.getPreviewUnitHomeX = function getPreviewUnitHomeX(unitId) {
    const wallX = GAME_DATA.defense?.wallX || 10;
    const soldier = this.findDefenseSoldier(unitId);
    let postDef = soldier ? POST_DEFS.find(p => p.id === soldier.postId) : null;
    if (!postDef) {
      const m = String(unitId || '').match(/^preview_(.+)_(\d+)$/);
      if (m) postDef = POST_DEFS.find(p => p.id === m[1]);
    }
    if (!postDef) return wallX - 1;
    if (postDef.bare) return wallX - 5;
    if (postDef.role === 'ranged') return wallX - 3;
    return wallX - 1;
  };

  /** 友军门内默认 X（编制预览 / 回撤终点） */
  P.getAllyHomeXByUnit = function getAllyHomeXByUnit(unitOrId) {
    const wallX = GAME_DATA.defense?.wallX || 14;
    if (unitOrId && typeof unitOrId === 'object') {
      const u = unitOrId;
      if (u.postId) {
        const postDef = POST_DEFS.find((p) => p.id === u.postId);
        if (postDef?.bare) return wallX - 5;
        if (postDef?.role === 'ranged' || u.role === 'ranged') return wallX - 3;
        return wallX - 1;
      }
      if (u.role === 'ranged') return wallX - 3;
      return wallX - 1;
    }
    return this.getPreviewUnitHomeX(unitOrId);
  };

  /**
   * 防御姿态：把城门外的友军撤回门内
   * 统一走移动指令：显示路线，且回撤途中仍可选中/改道指挥
   */
  P.recallUnitsInsideGate = function recallUnitsInsideGate() {
    const d = this.ensureDefenseState();
    const wallX = GAME_DATA.defense?.wallX || 14;
    const outsideLine = wallX - 0.5;
    const orders = [];

    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      d.raid.units.forEach((u) => {
        if (!u?.isAlly || u.isDead || u._rosterSwapping) return;
        if (!(u.x > outsideLine)) return;
        orders.push({
          id: u.id,
          x: this.getAllyHomeXByUnit(u),
          y: u.y || 0,
        });
      });
    } else {
      if (!d.unitPositions) d.unitPositions = {};
      const seen = new Set();
      const consider = (uid) => {
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        const pos = d.unitPositions[uid] || this._readUnitBattlePos?.(uid);
        if (!pos || !(pos.x > outsideLine)) return;
        orders.push({
          id: uid,
          x: this.getAllyHomeXByUnit(uid),
          y: pos.y || 0,
        });
      };
      Object.keys(d.unitPositions).forEach(consider);
      (d.soldiers || []).forEach((s) => { if (s?.id) consider(s.id); });
    }

    // 废弃旧回撤锁，改用移动指令
    this._formationRecallTargets = null;
    this._formationRecalling = false;
    document.querySelectorAll('#battle-embed-units .bf-unit.is-recalling').forEach((el) => {
      el.classList.remove('is-recalling');
    });

    if (orders.length > 0) {
      this.issueUnitMoveOrders(orders);
      this.showNotification(`防御姿态：${orders.length} 名门外单位正在撤回城内（可随时改道）`);
    }
    this.render();
    this.save();
  };

  /** 布阵预览单位移速（与战斗 allyStats.move 一致，含铠甲减速） */
  P.getPreviewUnitMoveSpeed = function getPreviewUnitMoveSpeed(unitId) {
    const soldier = this.findDefenseSoldier(unitId);
    let postId = soldier?.postId;
    if (!postId) {
      const m = String(unitId || '').match(/^preview_(.+)_(\d+)$/);
      postId = m?.[1];
    }
    const snap = postId ? this.getAllyPostStatSnapshot(postId) : null;
    return Math.max(0.1, snap?.move || 12);
  };

  /** 布阵回城：按战斗同样公式逐步移动 unitPositions */
  P.processFormationRecall = function processFormationRecall(dt) {
    if (!this._formationRecallTargets || dt <= 0) return;
    if (this._draggingUnitId || this._formationBusy) return;

    const d = this.ensureDefenseState();
    if (!d.unitPositions) d.unitPositions = {};
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const realSec = dt / 1000;
    const timeScale = this.timeScale || 1;
    const container = document.getElementById('battle-embed-units');
    const left = [];

    Object.entries(this._formationRecallTargets).forEach(([uid, t]) => {
      if (this.hasUnitMoveOrder?.(uid)) return;
      const pos = d.unitPositions[uid];
      if (!pos) return; // 目标已不在编制里，下面会从 targets 剔除
      const dx = t.toX - pos.x;
      const step = (t.move || 12) * realSec * timeScale;
      if (Math.abs(dx) <= 0.05 || step >= Math.abs(dx)) {
        pos.x = t.toX;
        pos.y = t.toY;
      } else {
        pos.x = Math.max(0, Math.min(fieldLen, pos.x + Math.sign(dx) * step));
        left.push(uid);
      }
      const el = container?.querySelector(`.bf-unit[data-unit-id="${uid}"]`);
      if (el) {
        el.classList.add('is-recalling');
        this._applyUnitDomPos(el, pos.x, pos.y || 0);
      }
    });

    if (left.length === 0) {
      container?.querySelectorAll('.bf-unit.is-recalling').forEach((el) => {
        el.classList.remove('is-recalling');
      });
      this._formationRecallTargets = null;
      this._formationRecalling = false;
      if (!this._draggingUnitId) this.refreshEmbeddedBattlefield();
      this.save();
    } else {
      const next = {};
      left.forEach((uid) => { next[uid] = this._formationRecallTargets[uid]; });
      this._formationRecallTargets = next;
      this._formationRecalling = true;
    }
    this._syncMoveOrderLines?.();
  };

  P.adjustDefensePost = function adjustDefensePost(postId, delta) {
    const d = this.ensureDefenseState();
    if (!Object.prototype.hasOwnProperty.call(d.posts, postId)) return;
    if (!delta) return;

    // 战斗中：增员只能从修门队抽；减员只能撤城门内单位
    if (this.isRaidCombatActive()) {
      if (delta > 0) this.addCombatReinforcementFromRepair(postId, delta);
      else this.demoteCombatUnitsInsideGate(postId, -delta);
      this.render();
      this.save();
      return;
    }

    const next = (d.posts[postId] || 0) + delta;
    if (next < 0) return;
    if (delta > 0) {
      if (this.getDefensePostedCount() >= (this.state.workers.total || 0)) {
        this.showNotification('编制人数不能超过村民总数');
        return;
      }
      const cap = this.getPostWeaponCap(postId);
      if (cap < 99999 && next > cap) {
        this.showNotification('对应武器库存不足，无法再增加编制');
        return;
      }
    }
    d.posts[postId] = next;
    this.syncDefenseSoldiersFromPosts(d);
    this.render();
    this.save();
  };

  /** 战时：从修门队抽人加入指定编制（排队换装，每人约 1 秒） */
  P.addCombatReinforcementFromRepair = function addCombatReinforcementFromRepair(postId, want) {
    const d = this.ensureDefenseState();
    if (!d.raid.units) d.raid.units = [];
    if (!d.raid.activePosts) d.raid.activePosts = { ...(d.posts || {}) };

    let repair = d.raid.activeRepairWorkers || 0;
    if (repair <= 0) {
      this.showNotification('战时增援只能从修门队调人');
      return;
    }

    const committed = this.countRosterDisplayByPost(postId);
    const cap = this.getPostWeaponCap(postId);
    let room = want;
    if (cap < 99999) room = Math.min(room, Math.max(0, cap - committed));
    room = Math.min(room, repair);
    if (room <= 0) {
      this.showNotification(cap < 99999 && committed >= cap
        ? '对应武器库存不足，无法再增援'
        : '修门队无人可调');
      return;
    }

    const jobs = [];
    for (let i = 0; i < room; i++) {
      jobs.push({ kind: 'add', postId });
    }
    d.raid.activeRepairWorkers = Math.max(0, repair - room);
    d.raid.activePosts[postId] = (d.raid.activePosts[postId] || 0) + room;
    d.posts[postId] = (d.posts[postId] || 0) + room;
    if (postId === 'bare') {
      d.raid.bareFighters = (d.raid.bareFighters || 0) + room;
    }
    this.enqueueRosterSwapJobs(jobs);
    const eta = Math.ceil(this.getRosterSwapQueueEtaSec());
    const name = POST_DEFS.find(p => p.id === postId)?.name || postId;
    this.pushRaidLog(`➕ 安排 ${room} 名修门队员换装为${name}（约 ${eta} 秒）`);
    this.showNotification(`换装增援 ${room} 人，约 ${eta} 秒`);
    this.updateBattleScreenVisuals?.();
  };

  /** 战时：仅撤下城门内的该编制单位，排队卸装后转回修门队 */
  P.demoteCombatUnitsInsideGate = function demoteCombatUnitsInsideGate(postId, want) {
    const d = this.ensureDefenseState();
    if (!Array.isArray(d.raid.units)) return;
    if (!d.raid.activePosts) d.raid.activePosts = { ...(d.posts || {}) };

    const candidates = d.raid.units
      .filter(u => u.postId === postId && this.isAllyInsideGate(u))
      .sort((a, b) => (a.x || 0) - (b.x || 0));
    if (candidates.length <= 0) {
      const living = this.countLivingAlliesByPost(postId);
      this.showNotification(living > 0
        ? '城门外单位无法撤编，请先调回门内'
        : '没有可撤编的单位');
      return;
    }

    const removeN = Math.min(want, candidates.length);
    const jobs = [];
    for (let i = 0; i < removeN; i++) {
      const u = candidates[i];
      u._rosterSwapping = true;
      jobs.push({ kind: 'remove', postId, unitId: u.id });
    }
    this.enqueueRosterSwapJobs(jobs);
    const eta = Math.ceil(this.getRosterSwapQueueEtaSec());
    const name = POST_DEFS.find(p => p.id === postId)?.name || postId;
    this.pushRaidLog(`🔙 安排 ${removeN} 名门内${name}卸装回修门队（约 ${eta} 秒）`);
    this.showNotification(`卸装撤回 ${removeN} 人，约 ${eta} 秒`);
    this.updateBattleScreenVisuals?.();
  };

  P.adjustGateRepairWorkers = function adjustGateRepairWorkers(delta) {
    // 修门队已改为自动分配，手动调整无效
    this.showNotification('修门队由剩余村民自动补充，无需手动调整');
  };

  P.upgradeGate = function upgradeGate() {
    this.showNotification('城门升级已移至科技树（砖块烧制后可解锁石板城门）');
  };

  P.manualRepairGate = function manualRepairGate() {
    this.showNotification('城门由修门队自动修复，无需手动维修');
  };

  /** 修门效率倍率（抢修训练科技） */
  P.getGateRepairEfficiencyMult = function getGateRepairEfficiencyMult() {
    const per = GAME_DATA.defense?.gate?.repairEfficiencyPerTechLevel ?? 0.25;
    const lv = this.getTechRepeatLevel?.('unlock_gate_repair_speed')?.current || 0;
    return 1 + lv * per;
  };

  /** 开战时按配置生成实际出战编制；剩余村民全部进入修门队 */
  P.syncCombatRosterFromConfig = function syncCombatRosterFromConfig() {
    const d = this.ensureDefenseState();
    const total = this.state.workers.total || 0;
    const posts = { ...d.posts };
    let used = 0;
    // 按编制分配（含徒手编制）
    POST_DEFS.forEach(p => {
      const want = posts[p.id] || 0;
      if (want <= 0) return;
      let n;
      if (p.bare) {
        n = Math.min(want, Math.max(0, total - used));
      } else {
        const cap = this.getPostWeaponCap(p.id);
        n = Math.max(0, Math.min(want, cap, Math.max(0, total - used)));
      }
      posts[p.id] = n;
      used += n;
    });
    // 剩余未分配的村民全部自动进入修门队（无需手动分配）
    const repair = Math.max(0, total - used);
    d.raid.activeRepairWorkers = repair;
    d.raid.activePosts = posts;
    d.raid.bareFighters = posts.bare || 0;
  };

  P.startRaidCombat = function startRaidCombat(overrideWave) {
    const d = this.ensureDefenseState();
    // 终局：如果已进入 finalBattleDay，强制使用魔王波次（开发者覆盖除外）
    const finalDay = this.state.finalBattleDay || 0;
    const isFinal = !overrideWave && finalDay > 0 && (this.state.day || 1) >= finalDay;
    const wave = overrideWave
      || (isFinal
        ? GAME_DATA.defense?.waves?.find(w => w.id === 'demon_king') || this.getRaidWaveForDay(99999)
        : this.getRaidWaveForDay(this.state.day || 1));
    d.raid.phase = 'combat';
    d.raid.waveId = wave?.id || 'scout';
    d.raid.waveName = wave?.name || '来袭';
    const hourMs = this.getGameHourMs();
    const maxHours = GAME_DATA.defense?.combatMaxGameHours || 10;
    d.raid.combatMsLeft = maxHours * hourMs;
    d.raid.warningMsLeft = 0;
    d.raid.log = [];

    // 全员撤出采集/制作，进入抗敌（保留原分配方案，战后恢复）
    if (typeof this.syncWorkerLayoutFromAssignments === 'function') {
      this.syncWorkerLayoutFromAssignments();
    }
    this.getAllUnlockedStations().forEach(({ type, id }) => {
      const st = this.getStationState(type, id);
      if (st) st.assignedWorkers = 0;
    });
    this.state.workers.unassigned = this.state.workers.total || 0;

    this.syncCombatRosterFromConfig();

    const gateDef = this.getGateLevelDef(d.gate.level);
    if (gateDef && (d.gate.hp == null || d.gate.hp <= 0)) d.gate.hp = gateDef.maxHp;
    if (gateDef && d.gate.hp > gateDef.maxHp) d.gate.hp = gateDef.maxHp;

    // 生成个体单位
    d.raid.units = [];
    // 开发者测试波次：不混入上次残敌，方便单独测数量
    const savedCarry = d.raid.carryoverEnemies;
    if (wave?.id === 'dev_test') d.raid.carryoverEnemies = [];
    this.spawnCombatUnits(wave);
    if (wave?.id === 'dev_test') d.raid.carryoverEnemies = savedCarry;

    // 兼容旧字段（给战斗画面统计用）
    const enemyUnits = d.raid.units.filter(u => !u.isAlly);
    d.raid.enemyHp = enemyUnits.reduce((s, u) => s + u.hp, 0);
    d.raid.enemyMaxHp = d.raid.enemyHp;

    this.pushRaidLog(`${wave?.name || '敌人'}兵临城下！全体村民投入抗敌，采集与制作暂停。`);
    this.showNotification(`⚔️ ${wave?.name || '袭击'}开始！生产已全部暂停`);
    this.updateBattleScreen();
    this._kickBattleAnimLoop();
    this.render();
    this.save();
  };

  /** 开发者面板：敌军兵种模板（与 config/combat-units.js enemyTemplates 同步） */
  P.getDevRaidEnemyTemplates = function getDevRaidEnemyTemplates() {
    const t = GAME_DATA.defense?.enemyTemplates || {};
    return {
      bare: { ...(t.bare || { id: 'bare', name: '流寇', role: 'melee', icon: '👺', atk: 5, hp: 60, aspd: 1.2, move: 4.2, range: 4 }) },
      sling: { ...(t.sling || { id: 'sling', name: '投石手', role: 'ranged', icon: '🥌', atk: 8, hp: 60, aspd: 0.8, move: 2.4, range: 20 }) },
      raider: { ...(t.raider || { id: 'raider', name: '持刃爪牙', role: 'melee', icon: '👹', atk: 18, hp: 96, aspd: 1.1, move: 3.6, range: 6 }) },
      ram: { ...(t.ram || { id: 'ram', name: '破门锤手', role: 'siege', icon: '🔨', atk: 11, hp: 173, aspd: 0.45, move: 2.2, range: 5 }) },
    };
  };

  /**
   * 开发者：按自定义数量立即开战
   * @param {{ bare?: number, sling?: number, raider?: number, ram?: number }} counts
   */
  P.startDevTestRaid = function startDevTestRaid(counts) {
    const templates = this.getDevRaidEnemyTemplates();
    const composition = [];
    let total = 0;
    Object.keys(templates).forEach((key) => {
      const n = Math.max(0, Math.min(500, Math.floor(Number(counts?.[key]) || 0)));
      if (n <= 0) return;
      composition.push({ ...templates[key], count: n });
      total += n;
    });
    if (total <= 0) {
      this.showNotification('[Dev] 请至少设置 1 名敌军');
      return false;
    }

    const d = this.ensureDefenseState();
    // 打断预警/现有战斗，不结算胜负奖惩
    if (d.raid.phase === 'combat' || d.raid.phase === 'warning') {
      this.clearRosterSwapQueue();
      d.raid.phase = 'idle';
      d.raid.combatMsLeft = 0;
      d.raid.warningMsLeft = 0;
      d.raid.units = [];
      d.raid.activePosts = null;
      d.raid.bareFighters = 0;
      d.raid.activeRepairWorkers = 0;
      d.raid._mobilized = false;
      d.raid.log = [];
    }

    if (typeof this.state.gameOver !== 'undefined') this.state.gameOver = false;
    document.getElementById('game-over')?.classList.add('hidden');

    this.startRaidCombat({
      id: 'dev_test',
      name: `测试袭击（${total}人）`,
      composition,
      tip: '开发者自定义敌军数量',
    });

    this.state.activeTab = 'defense';
    this.render();
    this.showNotification(`[Dev] 测试袭击已开始：敌军 ${total}`);
    return true;
  };

  P.endRaidCombat = function endRaidCombat(won) {
    const d = this.ensureDefenseState();
    this.clearRosterSwapQueue();
    this._moveOrders = {};
    this._syncMoveOrderLines?.();
    const minD = GAME_DATA.defense?.raidIntervalMinDays ?? 7;
    const maxD = GAME_DATA.defense?.raidIntervalMaxDays ?? 14;
    const baseGap = minD + Math.floor(Math.random() * (maxD - minD + 1));
    // 和平难度无袭击（间隔极大）；困难/地狱频率加快
    const raidMult = this.getDifficultyMult?.('raidIntervalMult', 1) || 1;
    const gap = Math.max(1, Math.round(baseGap * raidMult));
    d.raid.nextRaidDay = (this.state.day || 1) + gap;
    d.raid.phase = 'idle';
    d.raid.combatMsLeft = 0;
    d.raid.warningMsLeft = 0;
    d.raid.activePosts = null;
    d.raid.bareFighters = 0;
    d.raid.activeRepairWorkers = 0;
    d.raid._mobilized = false;

    // --- 统计阵亡人数并扣除人口 ---
    this.commitSoldiersAfterCombat();
    const units = d.raid.units || [];
    let died = 0;
    for (const u of units) {
      if (u.isAlly && u.isDead) died++;
    }
    if (died > 0) {
      const pop = this.state.workers.total || 0;
      this.state.workers.total = Math.max(0, pop - died);
      this.state.workers.unassigned = Math.min(this.state.workers.unassigned || 0, this.state.workers.total);
      this.pushRaidLog(`😵 ${died} 名村民在战斗中牺牲`);
    }
    // -----------------------------

    d.raid.units = [];
    d.raid.log = [];

    if (won) {
      // 完美胜利：清空残敌
      d.raid.carryoverEnemies = [];
      d.raid.failStreak = 0;
      this.pushRaidLog('胜利！敌人退去。编制配置已保留，下次来袭仍会生效。');
      this.showNotification('🛡️ 防守成功！村民可以继续生产了');
    } else {
      d.raid.failStreak = (d.raid.failStreak || 0) + 1;
      this.applyRaidFailPenalty();
      d.raid.carryoverEnemies = []; // 战败后残敌已劫掠完毕
      const starved = this.state.starvedSinceLastRaid || 0;
      if (starved > 0) {
        this.pushRaidLog(`城门告破……此前饥荒已饿死 ${starved} 人，兵力不足难以抵挡。`);
        this.showNotification(`💀 防守失败：因饿死 ${starved} 人导致兵力不足`);
      } else {
        this.pushRaidLog('城门告破，村落遭受洗劫……');
        this.showNotification('💀 防守失败，资源与人口受损');
      }
    }

    // 战斗结束后刷新战场（显示空的战场）
    this.refreshEmbeddedBattlefield();
    if (typeof this.applyWorkerLayout === 'function' && this.hasSavedWorkerLayout?.()) {
      this.applyWorkerLayout();
    } else {
      this.state.workers.unassigned = this.state.workers.total || 0;
      this.render();
      this.save();
    }
    this.checkGameOverAfterRaid();
    if (!this.state.gameOver) this.state.starvedSinceLastRaid = 0;
  };

  /** 夜间撤退：无惩罚，保存 carryover，恢复生产 */
  P.endRaidCombatDraw = function endRaidCombatDraw() {
    const d = this.ensureDefenseState();
    this.clearRosterSwapQueue();
    this._moveOrders = {};
    this._syncMoveOrderLines?.();
    const minD = GAME_DATA.defense?.raidIntervalMinDays ?? 7;
    const maxD = GAME_DATA.defense?.raidIntervalMaxDays ?? 14;
    const baseGap = minD + Math.floor(Math.random() * (maxD - minD + 1));
    const raidMult = this.getDifficultyMult?.('raidIntervalMult', 1) || 1;
    const gap = Math.max(1, Math.round(baseGap * raidMult));
    d.raid.nextRaidDay = Math.min((this.state.day || 1) + gap, (this.state.day || 1) + 7);
    d.raid.phase = 'idle';
    d.raid.combatMsLeft = 0;
    d.raid.warningMsLeft = 0;
    d.raid.activePosts = null;
    d.raid.bareFighters = 0;
    d.raid.activeRepairWorkers = 0;
    d.raid._mobilized = false;

    // 统计阵亡（但不扣惩罚资源）
    this.commitSoldiersAfterCombat();
    const units = d.raid.units || [];
    let died = 0;
    for (const u of units) {
      if (u.isAlly && u.isDead) died++;
    }
    if (died > 0) {
      const pop = this.state.workers.total || 0;
      this.state.workers.total = Math.max(0, pop - died);
      this.state.workers.unassigned = Math.min(this.state.workers.unassigned || 0, this.state.workers.total);
      this.pushRaidLog(`😵 ${died} 名村民在战斗中牺牲`);
    }

    d.raid.units = [];
    d.raid.log = [];

    d.raid.failStreak = 0;

    this.refreshEmbeddedBattlefield();
    if (typeof this.applyWorkerLayout === 'function' && this.hasSavedWorkerLayout?.()) {
      this.applyWorkerLayout();
    } else {
      this.state.workers.unassigned = this.state.workers.total || 0;
      this.render();
      this.save();
    }
    this.checkGameOverAfterRaid();
    if (!this.state.gameOver) this.state.starvedSinceLastRaid = 0;
  };

  P.applyRaidFailPenalty = function applyRaidFailPenalty() {
    const pen = GAME_DATA.defense?.failPenalty || {};
    const ratio = pen.lootRatio ?? 0.2;
    const keep = pen.lootMinKeep ?? 1;
    Object.keys(this.state.resources || {}).forEach(id => {
      const cur = this.state.resources[id] || 0;
      if (cur <= keep) return;
      const lose = Math.floor((cur - keep) * ratio);
      this.state.resources[id] = Math.max(keep, cur - lose);
    });
    const minLost = pen.villagersLostMin ?? 1;
    const maxLost = pen.villagersLostMax ?? 3;
    const loseN = Math.min(
      this.state.workers.total || 0,
      minLost + Math.floor(Math.random() * (maxLost - minLost + 1))
    );
    if (loseN > 0) {
      this.state.workers.total = Math.max(0, (this.state.workers.total || 0) - loseN);
      this.state.workers.unassigned = Math.min(this.state.workers.unassigned || 0, this.state.workers.total);
      // 同步清理年龄记录
      if (Array.isArray(this.state.villagerAges)) {
        while (this.state.villagerAges.length > (this.state.workers.total || 0)) {
          this.state.villagerAges.pop();
        }
      }
      // 清掉超编岗
      Object.values(this.state.resourcePoints || {}).forEach(pt => {
        if ((pt.assignedWorkers || 0) > 0) {
          const take = Math.min(pt.assignedWorkers, loseN);
          // 简化：全部收回后按布局恢复
          pt.assignedWorkers = 0;
        }
      });
      Object.values(this.state.craftStations || {}).forEach(st => { st.assignedWorkers = 0; });
      this.state.workers.unassigned = this.state.workers.total;
    }
    this.state.resources.food = Math.max(0, (this.state.resources.food || 0) - (pen.foodPanicExtra || 0));
  };

  P.checkGameOverAfterRaid = function checkGameOverAfterRaid() {
    if ((this.state.workers?.total || 0) > 1) return;
    const starved = this.state.starvedSinceLastRaid || 0;
    if (starved > 0) {
      this.checkPopulationGameOver(
        `因饥荒饿死 ${starved} 人，兵力不足而战败，部落无法维系`
      );
    } else {
      this.checkPopulationGameOver('战败后人口过少，部落无法维系');
    }
  };

  P.computeAllyCombatDps = function computeAllyCombatDps() {
    const d = this.ensureDefenseState();
    const cfg = GAME_DATA.defense || {};
    const weapons = cfg.weapons || {};
    const posts = d.raid.activePosts || d.posts;
    let dps = 0;

    const addWeaponUsers = (weaponKey, count, mult = 1) => {
      let left = count;
      const table = weapons[weaponKey] || {};
      const maxLv = Math.max(...Object.keys(table).map(Number), 1);
      for (let lv = maxLv; lv >= 1 && left > 0; lv--) {
        const stock = weaponKey === 'bare' ? left : this.getToolCount(weaponKey, lv);
        const use = Math.min(left, stock || 0);
        if (use <= 0) continue;
        const w = table[lv] || table[1];
        if (!w) continue;
        dps += use * (w.atk || 1) * (w.aspd || 1) * mult;
        left -= use;
      }
      return left;
    };

    let leftover = 0;
    leftover += addWeaponUsers('bow', posts.bow || 0);
    leftover += addWeaponUsers('crossbow', posts.crossbow || 0);
    leftover += addWeaponUsers('sword', posts.sword || 0, 1);
    leftover += addWeaponUsers('spear', posts.spear || 0, 1);
    leftover += addWeaponUsers('shield', posts.shield || 0, 0.35);
    leftover += addWeaponUsers('bare', (d.raid.bareFighters || 0) + leftover);
    return Math.max(0.5, dps);
  };

  /** 是否需要战场平滑动画帧（移动指令 / 回城 / 战斗位移） */
  P._battleAnimNeeds = function _battleAnimNeeds() {
    if (this.state?.defense?.raid?.phase === 'combat') return true;
    if (this._formationRecalling) return true;
    if (this._moveOrders && Object.keys(this._moveOrders).length) return true;
    return false;
  };

  /**
   * 用 rAF 按显示器刷新率推进单位位移，避免 10Hz 逻辑 tick 造成高速单位卡顿。
   * dt 约定与 processDefense 一致：已含 timeScale 的仿真毫秒。
   */
  P._kickBattleAnimLoop = function _kickBattleAnimLoop() {
    if (this._battleAnimRaf) return;
    if (!this._battleAnimNeeds()) return;
    const frame = (ts) => {
      if (!this._battleAnimNeeds()) {
        this._battleAnimRaf = null;
        this._battleAnimLastTs = 0;
        return;
      }

      const last = this._battleAnimLastTs || ts;
      this._battleAnimLastTs = ts;
      let wallDt = ts - last;
      if (!(wallDt > 0) || wallDt > 250) wallDt = 16.67;
      wallDt = Math.min(64, wallDt);

      if (!this.state?.gameOver && !(this.shouldFreezeGameTime?.() ?? this.paused)) {
        const simDt = wallDt * (this.timeScale || this.devTimeScale || 1);
        this.processUnitMoveOrders(simDt);
        this.processFormationRecall(simDt);

        const raid = this.state?.defense?.raid;
        if (raid?.phase === 'combat') {
          // 战斗位移也按帧推进；胜负/修门仍由 100ms processDefense 判定
          this.processCombatTick(simDt);
          this.updateBattleScreenVisuals();
        }
      }

      // 保持 _battleAnimRaf 非空直到确认不再需要，避免与 processDefense 叠 tick
      if (this._battleAnimNeeds()) {
        this._battleAnimRaf = requestAnimationFrame(frame);
      } else {
        this._battleAnimRaf = null;
        this._battleAnimLastTs = 0;
      }
    };
    this._battleAnimRaf = requestAnimationFrame(frame);
  };

  P.processDefense = function processDefense(dt) {
    if (dt <= 0 || this.state.gameOver) return;
    // 单位移动 / 回城 / 战斗位移改由 rAF 平滑推进；页签隐藏时回退到本 tick
    if (document.hidden) {
      this.processUnitMoveOrders(dt);
      this.processFormationRecall(dt);
    } else {
      this._kickBattleAnimLoop();
    }
    const d = this.ensureDefenseState();
    const raid = d.raid;
    const day = this.state.day || 1;
    const warnLead = GAME_DATA.defense?.warningGameDays ?? 2;
    const hourMs = this.getGameHourMs();

    // 终局：神器完成后，finalBattleDay 当天强制触发魔王总攻
    const finalDay = this.state.finalBattleDay || 0;
    if (finalDay > 0 && raid.phase === 'idle' && day >= finalDay) {
      // 用演示之王波次替换当前袭击
      const demonWave = { ...this.getRaidWaveForDay(99999) };
      if (!demonWave) return;
      d.raid.nextRaidDay = day;
      this.startRaidCombat();
      return;
    }

    if (raid.phase === 'idle') {
      const next = raid.nextRaidDay || 7;
      if (this._canTriggerRaidWarning(next, warnLead)) {
        raid.phase = 'warning';
        // 按距开战日 10:00 的真实剩余时间计时，不改写当天 dayProgress
        raid.warningMsLeft = this.getMsUntilRaidCombat(next);
        this.showNotification('⚠️ 斥候来报：爪牙即将袭来，请尽快编制防务！');
        this.pushRaidLog('预警：敌人正在接近，编制将在开战时生效。');
      } else if (day >= next) {
        // 在 10:00~12:00 之间才开始袭击
        const { hours } = this.getGameTimeOfDay();
        const startH = this.getRaidCombatStartHour();
        if (hours >= startH && hours < startH + 2) {
          this.startRaidCombat();
          return;
        }
        // 当天已过开战窗口但还没打 → 把 nextRaidDay 推到明天
        if (hours >= startH + 2) {
          raid.nextRaidDay = day + 1;
        }
      }
    }

    if (raid.phase === 'warning') {
      raid.warningMsLeft = Math.max(0, (raid.warningMsLeft || 0) - dt);
      const next = raid.nextRaidDay || 7;
      const { hours } = this.getGameTimeOfDay();
      const startH = this.getRaidCombatStartHour();
      const dueByDay = day > next || (day === next && hours >= startH);
      const dueByTimer = (raid.warningMsLeft || 0) <= 0 && day >= next;
      if (dueByDay || dueByTimer) {
        if (hours >= startH && hours < startH + 2) {
          this.startRaidCombat();
          return;
        }
        // 当天已过开战窗口但还没打 → 延到明天，保持预警（不再 idle 后立刻用整日长度重算）
        if (hours >= startH + 2) {
          raid.nextRaidDay = day + 1;
          raid.warningMsLeft = this.getMsUntilRaidCombat(day + 1);
        }
      }
    }

    if (raid.phase !== 'combat') return;

    raid.combatMsLeft = Math.max(0, (raid.combatMsLeft || 0) - dt);
    const hours = dt / hourMs;
    if (hours <= 0) return;

    // 修门自动进度：每名村民每 10 秒基础修复 2 点，受抢修训练科技加成，无材料消耗
    const repairN = raid.activeRepairWorkers || 0;
    const gateDef = this.getGateLevelDef(d.gate.level);
    if (repairN > 0 && gateDef && d.gate.hp < gateDef.maxHp) {
      const per10s = GAME_DATA.defense?.gate?.repairHpPerWorkerPer10s ?? 2;
      const rate = (per10s / 10) * this.getGateRepairEfficiencyMult();
      const prevFloor = Math.floor(d.gate.hp || 0);
      d.gate.hp = Math.min(gateDef.maxHp, (d.gate.hp || 0) + repairN * rate * (dt / 1000));
      const newFloor = Math.floor(d.gate.hp);
      const lastLog = d.gate._lastRepairLogHp ?? prevFloor;
      if (newFloor > lastLog && (newFloor - lastLog >= 10 || d.gate.hp >= gateDef.maxHp)) {
        this.pushRaidLog(`修门队修复城门（${newFloor}/${gateDef.maxHp}）`);
        d.gate._lastRepairLogHp = newFloor;
      }
    }

    // ---- 编制换装队列（每人约 1 秒，排队累加） ----
    this.processRosterSwapQueue(dt);

    // ---- 个体战斗 Tick：可见时由 rAF 推进，隐藏页签时在此回退 ----
    if (document.hidden) {
      this.processCombatTick(dt);
    } else {
      this._kickBattleAnimLoop();
    }

    // 城门告破 → 修门队员自动转为徒手战斗人员（仅一次）
    if ((d.gate.hp || 0) <= 0 && (raid.activeRepairWorkers || 0) > 0 && !raid._mobilized) {
      raid._mobilized = true;
      const mobilizing = raid.activeRepairWorkers || 0;
      raid.bareFighters = (raid.bareFighters || 0) + mobilizing;
      raid.activeRepairWorkers = 0;
      // 追加徒手战斗单位
      if (d.raid.units) {
        const cfg = GAME_DATA.defense || {};
        const bareStat = cfg.allyStats?.bare || { atk: 5, hp: 30, aspd: 1.0, drMelee: 0, drRanged: 0, range: 4, move: 12 };
        const combatMult = this.getAllyCombatMults?.() || { hp: 1, atk: 1, aspd: 1 };
        const wallX = cfg.wallX || 10;
        let uid = 0;
        d.raid.units.forEach(u => {
          const m = parseInt(u.id.replace(/\D/g, ''), 10);
          if (m >= uid) uid = m + 1;
        });
        for (let i = 0; i < mobilizing; i++) {
          d.raid.units.push(createUnit({
            id: 'ally_' + (uid++),
            isAlly: true,
            postId: 'bare',
            role: 'melee',
            name: '徒手村民',
            icon: '✊',
            atk: Math.max(1, Math.round(bareStat.atk * combatMult.atk)),
            hp: Math.max(1, Math.round(bareStat.hp * combatMult.hp)),
            maxHp: Math.max(1, Math.round(bareStat.hp * combatMult.hp)),
            aspd: bareStat.aspd * combatMult.aspd,
            cooldown: 1 / Math.max(0.05, bareStat.aspd * combatMult.aspd || 1),
            range: bareStat.range,
            move: bareStat.move,
            x: wallX - 5,
            y: (i % 7) - 3 + (Math.floor(i / 7)) * 0.8,
            drMelee: bareStat.drMelee || 0,
            drRanged: bareStat.drRanged || 0,
            flatDr: bareStat.flatDr || 0,
          }));
        }
      }
      this.pushRaidLog(`😤 城门已破！${mobilizing} 名修门队员抄家伙加入战斗！`);
    }

    // ---- 胜负判定 ----
    const enemiesAlive = d.raid.units ? d.raid.units.filter(u => !u.isAlly && !u.isDead).length : 0;
    const alliesAlive = d.raid.units ? d.raid.units.filter(u => u.isAlly && !u.isDead).length : 0;

    let ended = false;
    if (enemiesAlive === 0) {
      if (raid.waveId === 'demon_king') {
        this.triggerVictory();
      } else {
        this.endRaidCombat(true);
      }
      ended = true;
    } else if (alliesAlive === 0) {
      if (raid.waveId === 'demon_king') {
        this.triggerGameOver('守卫全部阵亡，魔王踏平了村落……');
      } else {
        this.endRaidCombat(false);
      }
      ended = true;
    } else if ((raid.combatMsLeft || 0) <= 0) {
      // 超时
      const totalEnemyHp = d.raid.units.filter(u => !u.isAlly).reduce((s, u) => s + u.maxHp, 1);
      const curEnemyHp = d.raid.units.filter(u => !u.isAlly && !u.isDead).reduce((s, u) => s + u.hp, 0);
      this.endRaidCombat(curEnemyHp < totalEnemyHp * 0.35);
      ended = true;
    }

    // 22:00 后城门未破且还有敌人 → 撤退（残敌累计到下次）魔王战不撤退
    if (!ended && (d.gate.hp || 0) > 0 && raid.waveId !== 'demon_king') {
      const { hours: currentHour } = this.getGameTimeOfDay();
      if (currentHour >= 22) {
        const survivors = d.raid.units.filter(u => !u.isAlly && !u.isDead);
        const newCarryover = survivors.map(u => ({
          role: u.role,
          name: u.name,
          icon: u.icon,
          atk: u.atk,
          hp: u.hp,
          maxHp: u.maxHp,
          aspd: u.aspd,
          range: u.range,
          move: u.move,
          flatDr: u.flatDr || 0,
        }));
        raid.carryoverEnemies = newCarryover;
        this.pushRaidLog(`🌙 夜幕降临，${survivors.length} 个敌人撤退，将随下次袭击一并来袭！`);
        this.showNotification(`🌙 入夜敌人退去，但 ${survivors.length} 个残敌会加入下次袭击`);
        this.endRaidCombatDraw();
        ended = true;
      }
    }

    if (ended) {
      d.raid.units = [];
      return;
    }
  };

  /** 游戏胜利 */
  P.triggerVictory = function triggerVictory() {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.gameOverReason = '胜利！魔王已被击败';
    document.getElementById('victory-screen')?.classList.remove('hidden');
    const statsEl = document.getElementById('victory-stats');
    if (statsEl) {
      const d = this.state.day || 1;
      const pop = this.state.workers?.total || 0;
      statsEl.textContent = `历经 ${d} 天，凭借 ${pop} 名村民的浴血奋战，魔王终被击败！`;
    }
    this.save();
  };

  P.openBattleScreen = function openBattleScreen() {
    document.getElementById('battle-screen')?.classList.remove('hidden');
    this.updateBattleScreen();
  };

  P.closeBattleScreen = function closeBattleScreen() {
    document.getElementById('battle-screen')?.classList.add('hidden');
  };

  /** 刷新内嵌战场：战斗时显示实况，非战斗时从编制生成预览 */
  P.refreshEmbeddedBattlefield = function refreshEmbeddedBattlefield() {
    const d = this.ensureDefenseState();
    const raid = d.raid;
    const unitsContainer = document.getElementById('battle-embed-units');
    if (unitsContainer) {
      unitsContainer.classList.toggle('is-combat', raid.phase === 'combat');
    }

    // 战斗中：直接使用 raid.units
    if (raid.phase === 'combat' && Array.isArray(raid.units)) {
      this.updateBattleScreenVisuals();
      return;
    }

    // 拖拽布阵 / 框选 / 回城 / 移动指令中：不要重建坐标（交给 rAF 写 DOM）
    if (
      this._draggingUnitId
      || this._formationRecalling
      || this._formationBusy
      || (this._moveOrders && Object.keys(this._moveOrders).length)
    ) return;

    // 非战斗：从士兵档案生成预览（保留每人血量；换装只改上限）
    const cfg = GAME_DATA.defense || {};
    const wallX = cfg.wallX || 14;
    this.syncDefenseSoldiersFromPosts(d);
    const previewUnits = [];
    if (!d.unitPositions) d.unitPositions = {};
    const savedPos = d.unitPositions;
    const occupied = [];

    (d.soldiers || []).forEach((soldier) => {
      const snap = this.getAllyPostStatSnapshot(soldier.postId);
      if (!snap) return;
      const bodyMax = snap.bodyMaxHp || snap.maxHp;
      this.applySoldierHpAgainstMax(soldier, bodyMax);
      const postDef = snap.postDef;
      const pos = savedPos[soldier.id];
      let x;
      let y;
      const sep = this.getMinUnitSeparation();
      const overlaps = (px, py) => occupied.some((o) => unitDist2d(o, { x: px, y: py }) < sep - 0.02);
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) && !overlaps(pos.x, pos.y)) {
        x = pos.x;
        y = pos.y;
      } else if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        const free = this.findNonOverlappingBattlePos(pos.x, pos.y, occupied);
        x = free.x;
        y = free.y;
      } else {
        const free = this.pickDefaultSlotForSoldier(soldier, occupied);
        x = free.x;
        y = free.y;
      }
      savedPos[soldier.id] = { x, y };
      occupied.push({ x, y });
      const piece = !snap.isBare ? this.getArmorPieceEquippedBy?.(soldier.id) : null;
      const armorMax = piece ? (piece.maxDur || 0) : 0;
      const armorHp = piece ? Math.max(0, piece.dur || 0) : 0;
      previewUnits.push({
        id: soldier.id,
        soldierId: soldier.id,
        isAlly: true,
        postId: postDef.id,
        role: postDef.role,
        name: postDef.name,
        icon: postDef.icon,
        atk: snap.atk,
        hp: (soldier.hp || 0) + armorHp,
        maxHp: bodyMax + armorMax,
        aspd: snap.aspd,
        range: snap.range,
        move: snap.move,
        x,
        y,
        drMelee: snap.drMelee || 0,
        drRanged: snap.drRanged || 0,
        isDead: false,
        target: null,
        cooldown: 0,
      });
    });

    // 同阵营无碰撞体积，预览不再互推

    // 更新预览
    this._renderEmbeddedPreviewUnits(previewUnits);
  };

  /** 战场纵向：y∈[-30,30] 对应 top 约 5%~95%，可布满整块场地 */
  P.getBattleYLimit = function getBattleYLimit() {
    return GAME_DATA.defense?.fieldYLimit ?? 30;
  };

  P.clampBattleY = function clampBattleY(y) {
    const lim = this.getBattleYLimit();
    return Math.max(-lim, Math.min(lim, Number(y) || 0));
  };

  /** 单位碰撞半径（战场坐标） */
  P.getUnitCollisionRadius = function getUnitCollisionRadius() {
    const r = Number(GAME_DATA.defense?.unitRadius);
    return Number.isFinite(r) && r > 0 ? r : 1.15;
  };

  /** 两单位中心最小间距（不可重叠） */
  P.getMinUnitSeparation = function getMinUnitSeparation() {
    return this.getUnitCollisionRadius() * 2;
  };

  /** 列阵/默认布阵槽位间距（大于碰撞直径，避免走位挤兑） */
  P.getFormationSpacing = function getFormationSpacing() {
    const mult = Number(GAME_DATA.defense?.formationGapMult);
    return this.getMinUnitSeparation() * (Number.isFinite(mult) && mult > 1 ? mult : 1.5);
  };

  /**
   * 从中点往两侧交替生成偏移：0, +g, -g, +2g, -2g…
   */
  P._centerOutYSlots = function _centerOutYSlots(count, gap) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    const g = Math.max(0.1, Number(gap) || this.getFormationSpacing());
    const out = [];
    if (n <= 0) return out;
    out.push(0);
    for (let k = 1; out.length < n; k++) {
      out.push(k * g);
      if (out.length < n) out.push(-k * g);
    }
    return out;
  };

  /**
   * 默认编制落点：前排靠近城门、后排远离城门；每排从中间往两侧摆。
   * 前排=近战；后排=远程/徒手。
   */
  P.pickDefaultSlotForSoldier = function pickDefaultSlotForSoldier(soldier, occupied) {
    const wallX = GAME_DATA.defense?.wallX || 14;
    const gap = this.getFormationSpacing();
    const sep = this.getMinUnitSeparation();
    const snap = this.getAllyPostStatSnapshot(soldier?.postId);
    const frontX = wallX - 1.2;
    const backX = frontX - gap;
    const rowX = (snap?.isRanged || snap?.isBare) ? backX : frontX;
    const others = Array.isArray(occupied) ? occupied : [];
    const hits = (x, y) => others.some((o) => o && unitDist2d({ x, y }, o) < sep - 0.02);

    for (let k = 0; k < 36; k++) {
      const ys = k === 0 ? [0] : [k * gap, -k * gap];
      for (const rawY of ys) {
        const y = this.clampBattleY(rawY);
        if (!hits(rowX, y)) return { x: rowX, y };
      }
    }
    return this.findNonOverlappingBattlePos(rowX, 0, others);
  };

  /**
   * 在已有占位中找不重叠落点；优先靠近 preferred。
   * occupied: [{x,y}, ...]
   */
  P.findNonOverlappingBattlePos = function findNonOverlappingBattlePos(preferredX, preferredY, occupied) {
    const sep = this.getMinUnitSeparation();
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const px = Math.max(0, Math.min(fieldLen, Number(preferredX) || 0));
    const py = this.clampBattleY(preferredY);
    const others = Array.isArray(occupied) ? occupied : [];
    const hits = (x, y) => others.some((o) => {
      if (!o) return false;
      return unitDist2d({ x, y }, o) < sep - 0.02;
    });
    if (!hits(px, py)) return { x: px, y: py };
    const step = this.getFormationSpacing();
    for (let ring = 1; ring <= 28; ring++) {
      const n = Math.max(6, ring * 6);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const x = Math.max(0, Math.min(fieldLen, px + Math.cos(ang) * step * ring));
        const y = this.clampBattleY(py + Math.sin(ang) * step * ring);
        if (!hits(x, y)) return { x, y };
      }
    }
    return { x: px, y: py };
  };

  /**
   * 单位碰撞推开。
   * 默认仅敌对双方互推（同阵营可重叠穿越）；hostileOnly:false 且 sameSideOnly:true 时才推同阵营。
   * pinnedIds：钉住的单位不被动推离。
   */
  P.separateBattleUnits = function separateBattleUnits(units, opts = {}) {
    const list = (units || []).filter((u) => u && !u.isDead && !u._rosterSwapping);
    if (list.length < 2) return false;
    const sep = this.getMinUnitSeparation();
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const sameSideOnly = opts.sameSideOnly === true;
    const hostileOnly = !sameSideOnly && opts.hostileOnly !== false;
    const pinned = opts.pinnedIds instanceof Set
      ? opts.pinnedIds
      : new Set(opts.pinnedIds || []);
    let moved = false;
    const iters = Math.max(1, Math.min(8, opts.iterations || 5));
    for (let iter = 0; iter < iters; iter++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const sameSide = !!a.isAlly === !!b.isAlly;
          if (hostileOnly && sameSide) continue;
          if (sameSideOnly && !sameSide) continue;
          const aPin = pinned.has(a.id) || (a.soldierId && pinned.has(a.soldierId));
          const bPin = pinned.has(b.id) || (b.soldierId && pinned.has(b.soldierId));
          if (aPin && bPin) continue;
          let dx = (a.x || 0) - (b.x || 0);
          let dy = (a.y || 0) - (b.y || 0);
          let dist = Math.hypot(dx, dy);
          if (dist >= sep) continue;
          moved = true;
          if (dist < 1e-4) {
            const nudge = sep * 0.55;
            if (!aPin) a.y = this.clampBattleY((a.y || 0) + nudge);
            if (!bPin) b.y = this.clampBattleY((b.y || 0) - nudge);
            continue;
          }
          const push = (sep - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          if (!aPin && bPin) {
            a.x = Math.max(0, Math.min(fieldLen, (a.x || 0) + nx * push * 2));
            a.y = this.clampBattleY((a.y || 0) + ny * push * 2);
          } else if (aPin && !bPin) {
            b.x = Math.max(0, Math.min(fieldLen, (b.x || 0) - nx * push * 2));
            b.y = this.clampBattleY((b.y || 0) - ny * push * 2);
          } else {
            a.x = Math.max(0, Math.min(fieldLen, (a.x || 0) + nx * push));
            a.y = this.clampBattleY((a.y || 0) + ny * push);
            b.x = Math.max(0, Math.min(fieldLen, (b.x || 0) - nx * push));
            b.y = this.clampBattleY((b.y || 0) - ny * push);
          }
        }
      }
    }
    return moved;
  };

  /** 把当前友军站位写回 unitPositions（并刷新 DOM） */
  P._syncAllyPositionsAfterSeparate = function _syncAllyPositionsAfterSeparate(units) {
    const d = this.ensureDefenseState();
    if (!d.unitPositions) d.unitPositions = {};
    (units || []).forEach((u) => {
      if (!u || u.isDead || !u.isAlly) return;
      const key = u.soldierId || u.id;
      if (!key) return;
      d.unitPositions[key] = { x: u.x, y: u.y || 0 };
      const el = document.querySelector(`#battle-embed-units .bf-unit[data-unit-id="${CSS.escape(u.id)}"]`);
      if (el) this._applyUnitDomPos(el, u.x, u.y || 0);
    });
  };

  P.battleYToTopPct = function battleYToTopPct(y) {
    return Math.max(5, Math.min(95, 50 + this.clampBattleY(y) * 1.5));
  };

  P.topPctToBattleY = function topPctToBattleY(pct) {
    return this.clampBattleY(((Number(pct) || 50) - 50) / 1.5);
  };

  /** 把战场坐标写到单位 DOM（百分比定位） */
  P._applyUnitDomPos = function _applyUnitDomPos(el, x, y) {
    if (!el) return;
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    el.style.left = ((x / fieldLen) * 100) + '%';
    el.style.top = this.battleYToTopPct(y) + '%';
  };

  /** 屏幕坐标 → 战场坐标 */
  P.clientToBattlePos = function clientToBattlePos(clientX, clientY, field) {
    const rect = (field || document.getElementById('battle-embed-field'))?.getBoundingClientRect();
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    if (!rect || rect.width < 1 || rect.height < 1) {
      return { x: 0, y: 0 };
    }
    const x = ((clientX - rect.left) / rect.width) * fieldLen;
    const topPct = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(fieldLen, x)),
      y: this.topPctToBattleY(topPct),
    };
  };

  P._getUnitRoleById = function _getUnitRoleById(unitId) {
    const d = this.ensureDefenseState();
    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      const u = d.raid.units.find((x) => x && x.id === unitId);
      if (u?.role) return u.role;
    }
    const soldier = this.findDefenseSoldier(unitId);
    if (soldier) {
      const postDef = POST_DEFS.find(p => p.id === soldier.postId);
      if (postDef) return postDef.role || 'melee';
    }
    const m = String(unitId || '').match(/^preview_(.+)_(\d+)$/);
    if (m) {
      const postDef = POST_DEFS.find(p => p.id === m[1]);
      if (postDef) return postDef.role || 'melee';
    }
    const el = document.querySelector(`#battle-embed-units .bf-unit[data-unit-id="${CSS.escape(unitId)}"]`);
    return el?.dataset.role || 'melee';
  };

  P._syncFormationSelectionClass = function _syncFormationSelectionClass() {
    const selected = this._selectedUnitIds || new Set();
    document.querySelectorAll('#battle-embed-units .bf-unit').forEach((el) => {
      el.classList.toggle('is-selected', selected.has(el.dataset.unitId));
    });
  };

  P._setFormationSelection = function _setFormationSelection(ids, opts = {}) {
    this._selectedUnitIds = new Set((ids || []).filter(Boolean));
    this._syncFormationSelectionClass();
    // 重新框选/点选时重置中键列阵循环（竖列起）；列阵下发后保持计数则传 keepFormationMode
    if (!opts.keepFormationMode) this._formationModeIdx = 0;
  };

  P._getSelectedOrAllAllyIds = function _getSelectedOrAllAllyIds() {
    if (this._selectedUnitIds?.size) return [...this._selectedUnitIds];
    return [...document.querySelectorAll('#battle-embed-units .bf-unit[data-is-ally="1"]')]
      .map((el) => el.dataset.unitId)
      .filter(Boolean);
  };

  P._readUnitBattlePos = function _readUnitBattlePos(unitId) {
    const d = this.ensureDefenseState();
    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      const u = d.raid.units.find((x) => x && x.id === unitId);
      if (u) return { x: u.x || 0, y: u.y || 0 };
    }
    if (!d.unitPositions) d.unitPositions = {};
    if (d.unitPositions[unitId]) {
      return { x: d.unitPositions[unitId].x, y: d.unitPositions[unitId].y || 0 };
    }
    const el = document.querySelector(`#battle-embed-units .bf-unit[data-unit-id="${CSS.escape(unitId)}"]`);
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    if (!el) return { x: (GAME_DATA.defense?.wallX || 10) - 1, y: 0 };
    return {
      x: ((parseFloat(el.style.left) || 0) / 100) * fieldLen,
      y: this.topPctToBattleY(parseFloat(el.style.top) || 50),
    };
  };

  P._writeUnitBattlePos = function _writeUnitBattlePos(unitId, x, y, opts = {}) {
    const d = this.ensureDefenseState();
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    let pos = {
      x: Math.max(0, Math.min(fieldLen, x)),
      y: this.clampBattleY(y),
    };
    // 同阵营无碰撞：拖放/写入默认允许与友军重叠；仅显式 resolveOverlap 时避让
    if (opts.resolveOverlap === true) {
      const occupied = [];
      if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
        d.raid.units.forEach((u) => {
          if (!u || u.isDead || !u.isAlly || u.id === unitId) return;
          occupied.push({ x: u.x, y: u.y || 0 });
        });
      } else {
        Object.entries(d.unitPositions || {}).forEach(([id, p]) => {
          if (id === unitId || !p) return;
          occupied.push({ x: p.x, y: p.y || 0 });
        });
      }
      pos = this.findNonOverlappingBattlePos(pos.x, pos.y, occupied);
    }
    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      const u = d.raid.units.find((x) => x && x.id === unitId);
      if (u) {
        u.x = pos.x;
        u.y = pos.y;
        if (u.soldierId) {
          if (!d.unitPositions) d.unitPositions = {};
          d.unitPositions[u.soldierId] = { x: pos.x, y: pos.y };
        }
      }
    } else {
      if (!d.unitPositions) d.unitPositions = {};
      d.unitPositions[unitId] = pos;
    }
    const el = document.querySelector(`#battle-embed-units .bf-unit[data-unit-id="${CSS.escape(unitId)}"]`);
    if (el) this._applyUnitDomPos(el, pos.x, pos.y);
    return pos;
  };

  P._getUnitMoveSpeed = function _getUnitMoveSpeed(unitId) {
    const d = this.ensureDefenseState();
    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      const u = d.raid.units.find((x) => x && x.id === unitId);
      if (u) return Math.max(0.1, u.move || 12);
    }
    return this.getPreviewUnitMoveSpeed(unitId);
  };

  /** 下发移动/队列目标（每人独立终点；同阵营无碰撞，终点保持列阵间距即可） */
  P.issueUnitMoveOrders = function issueUnitMoveOrders(orders) {
    if (!this._moveOrders) this._moveOrders = {};
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const list = (orders || []).filter((o) => o?.id).map((o) => ({
      id: o.id,
      x: Math.max(0, Math.min(fieldLen, o.x)),
      y: this.clampBattleY(o.y),
      isAlly: true,
    }));
    list.forEach((o) => {
      this._moveOrders[o.id] = { x: o.x, y: o.y };
      if (this._formationRecallTargets?.[o.id]) {
        delete this._formationRecallTargets[o.id];
      }
    });
    if (this._formationRecallTargets && !Object.keys(this._formationRecallTargets).length) {
      this._formationRecallTargets = null;
      this._formationRecalling = false;
    }
    this._syncMoveOrderLines();
    this._kickBattleAnimLoop();
  };

  P.clearUnitMoveOrder = function clearUnitMoveOrder(unitId) {
    if (!this._moveOrders || !unitId) return;
    delete this._moveOrders[unitId];
  };

  P.hasUnitMoveOrder = function hasUnitMoveOrder(unitId) {
    return !!(this._moveOrders && this._moveOrders[unitId]);
  };

  /** 推进移动指令，并刷新连线 */
  P.processUnitMoveOrders = function processUnitMoveOrders(dt) {
    if (!this._moveOrders) this._moveOrders = {};
    const ids = Object.keys(this._moveOrders);
    if (!ids.length) {
      this._syncMoveOrderLines();
      return;
    }
    if (dt <= 0) {
      this._syncMoveOrderLines();
      return;
    }
    const realSec = dt / 1000;
    const timeScale = this.timeScale || 1;
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const arriveEps = Math.max(0.2, this.getMinUnitSeparation() * 0.12);
    const arrived = [];

    ids.forEach((id) => {
      const order = this._moveOrders[id];
      if (!order) return;
      const pos = this._readUnitBattlePos(id);
      const speed = this._getUnitMoveSpeed(id) * realSec * timeScale;
      const dx = order.x - pos.x;
      const dy = order.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= arriveEps || speed >= dist) {
        // 精确落到预定格，途中不做碰撞打断
        this._writeUnitBattlePos(id, order.x, order.y, { resolveOverlap: false });
        arrived.push(id);
        return;
      }
      const nx = pos.x + (dx / dist) * speed;
      const ny = pos.y + (dy / dist) * speed;
      this._writeUnitBattlePos(
        id,
        Math.max(0, Math.min(fieldLen, nx)),
        this.clampBattleY(ny),
        { resolveOverlap: false }
      );
    });

    arrived.forEach((id) => delete this._moveOrders[id]);

    // 队列移动中与敌对单位互撞；同阵营可穿越，不做友军互推
    const d = this.ensureDefenseState();
    if (d.raid?.phase === 'combat' && Array.isArray(d.raid.units)) {
      if (this.separateBattleUnits(d.raid.units, { hostileOnly: true, iterations: 2 })) {
        this._syncAllyPositionsAfterSeparate(d.raid.units);
      }
    }

    this._syncMoveOrderLines();
  };

  /** 单位 → 各自目标点的连线（含回撤/右键/中键队列） */
  P._syncMoveOrderLines = function _syncMoveOrderLines() {
    const container = document.getElementById('battle-embed-units');
    if (!container) return;
    let svg = document.getElementById('battle-move-lines');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'battle-move-lines';
      svg.classList.add('battle-move-lines');
      svg.setAttribute('aria-hidden', 'true');
      container.appendChild(svg);
    }

    const orders = { ...(this._moveOrders || {}) };
    // 兼容旧回撤目标：一并画线
    Object.entries(this._formationRecallTargets || {}).forEach(([id, t]) => {
      if (orders[id] || !t) return;
      orders[id] = { x: t.toX, y: t.toY };
    });
    const ids = Object.keys(orders);
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const existing = new Map();
    svg.querySelectorAll('[data-move-id]').forEach((n) => existing.set(n.getAttribute('data-move-id'), n));

    const used = new Set();
    ids.forEach((id, idx) => {
      const order = orders[id];
      const pos = this._readUnitBattlePos(id);
      const x1 = (pos.x / fieldLen) * 100;
      const y1 = this.battleYToTopPct(pos.y);
      const x2 = (order.x / fieldLen) * 100;
      const y2 = this.battleYToTopPct(order.y);
      const hue = (idx * 47 + (id.length * 13)) % 360;
      const stroke = `hsla(${hue}, 75%, 62%, 0.85)`;

      let line = existing.get(`line:${id}`);
      if (!line) {
        line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('data-move-id', `line:${id}`);
        svg.appendChild(line);
      }
      line.setAttribute('x1', `${x1}%`);
      line.setAttribute('y1', `${y1}%`);
      line.setAttribute('x2', `${x2}%`);
      line.setAttribute('y2', `${y2}%`);
      line.setAttribute('stroke', stroke);
      used.add(`line:${id}`);

      let dot = existing.get(`dot:${id}`);
      if (!dot) {
        dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('data-move-id', `dot:${id}`);
        dot.setAttribute('r', '3.5');
        svg.appendChild(dot);
      }
      dot.setAttribute('cx', `${x2}%`);
      dot.setAttribute('cy', `${y2}%`);
      dot.setAttribute('fill', stroke);
      used.add(`dot:${id}`);
    });

    existing.forEach((node, key) => {
      if (!used.has(key)) node.remove();
    });
  };

  /**
   * 按模式生成站位（以鼠标点为基准）：
   * 0 竖列 / 1 横列 / 2 聚团方阵
   * 前排近战靠近城门（更大 x），后排远程远离；纵向上从点击处往上下交替摆
   */
  P._computeFormationPositions = function _computeFormationPositions(unitIds, mode, cx, cy) {
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const clampX = (x) => Math.max(0, Math.min(fieldLen, x));
    const baseY = this.clampBattleY(cy);
    const units = unitIds.map((id) => ({
      id,
      role: this._getUnitRoleById(id),
    }));
    // 近战先排（前排），远程后排
    units.sort((a, b) => {
      const ar = a.role === 'ranged' ? 1 : 0;
      const br = b.role === 'ranged' ? 1 : 0;
      if (ar !== br) return ar - br;
      return String(a.id).localeCompare(String(b.id));
    });

    const n = units.length;
    if (n <= 0) return [];
    const gap = this.getFormationSpacing();
    const sx = gap;
    const sy = gap;
    const out = [];
    const yAt = (offset) => this.clampBattleY(baseY + (offset || 0));

    if (mode === 0) {
      // 竖列：前排靠城门、后排远离；每列从中线往上下摆
      const melee = units.filter((u) => u.role !== 'ranged');
      const ranged = units.filter((u) => u.role === 'ranged');
      const hasBoth = melee.length > 0 && ranged.length > 0;
      const frontX = clampX(cx);
      const backX = clampX(cx - gap);
      const placeCol = (list, x) => {
        const ys = this._centerOutYSlots(list.length, sy);
        list.forEach((u, i) => out.push({ id: u.id, x, y: yAt(ys[i]) }));
      };
      placeCol(melee, frontX);
      placeCol(ranged, hasBoth ? backX : frontX);
    } else if (mode === 1) {
      // 横列：沿纵深（X）从点击处往两侧交替；同一排 y
      const xs = this._centerOutYSlots(n, sx);
      units.forEach((u, i) => {
        out.push({
          id: u.id,
          x: clampX(cx + (xs[i] || 0)),
          y: baseY,
        });
      });
    } else {
      // 聚团：靠城门的列为前排，列内从中线上下展开
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      const rows = Math.max(1, Math.ceil(n / cols));
      const startX = clampX(cx - ((cols - 1) * sx) / 2);
      let idx = 0;
      for (let c = 0; c < cols; c++) {
        const colUnits = [];
        for (let r = 0; r < rows; r++) {
          if (idx >= n) break;
          colUnits.push(units[idx++]);
        }
        const ys = this._centerOutYSlots(colUnits.length, sy);
        // c=0 为后排（远离城门），末列为前排
        const x = clampX(startX + (cols - 1 - c) * sx);
        colUnits.forEach((u, ri) => {
          out.push({ id: u.id, x, y: yAt(ys[ri]) });
        });
      }
    }
    return out;
  };

  P._applyFormationAtPoint = function _applyFormationAtPoint(cx, cy) {
    const ids = this._getSelectedOrAllAllyIds();
    if (!ids.length) {
      this.showNotification('没有可排布的部队');
      return;
    }
    if (this._formationModeIdx == null) this._formationModeIdx = 0;
    const mode = this._formationModeIdx % 3;
    const labels = ['竖列排布', '横列排布', '聚团方阵'];
    const positions = this._computeFormationPositions(ids, mode, cx, cy);
    // 中键：以鼠标点为基准，每人去各自队列槽位（非瞬移）
    this.issueUnitMoveOrders(positions);
    this._setFormationSelection(ids, { keepFormationMode: true });
    this._formationModeIdx = (mode + 1) % 3;
    this.showNotification(`${labels[mode]}（下次中键：${labels[this._formationModeIdx]}）`);
    this.save();
  };

  /** 右键：选中部队保持相对队形，质心移到点击处 */
  P._moveSelectedUnitsTo = function _moveSelectedUnitsTo(tx, ty) {
    const ids = [...(this._selectedUnitIds || [])];
    if (!ids.length) return false;
    const fieldLen = GAME_DATA.defense?.fieldLength || 100;
    const poses = ids.map((id) => ({ id, ...this._readUnitBattlePos(id) }));
    const cx = poses.reduce((s, p) => s + p.x, 0) / poses.length;
    const cy = poses.reduce((s, p) => s + p.y, 0) / poses.length;
    const dx = tx - cx;
    const dy = ty - cy;
    this.issueUnitMoveOrders(poses.map((p) => ({
      id: p.id,
      x: Math.max(0, Math.min(fieldLen, p.x + dx)),
      y: this.clampBattleY(p.y + dy),
    })));
    this.save();
    return true;
  };

  /** 布阵交互：框选 / Ctrl 加减选 / 右键移动 / 中键队列 */
  P._ensureFormationDragBound = function _ensureFormationDragBound() {
    if (this._formationDragBound) return;
    const field = document.getElementById('battle-embed-field');
    if (!field) return;
    this._formationDragBound = true;
    this._selectedUnitIds = this._selectedUnitIds || new Set();
    this._formationModeIdx = this._formationModeIdx || 0;
    this._moveOrders = this._moveOrders || {};

    let marquee = field.querySelector('.battle-marquee');
    if (!marquee) {
      marquee = document.createElement('div');
      marquee.className = 'battle-marquee';
      field.appendChild(marquee);
    }

    // 禁止中键滚动、右键菜单
    field.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) e.preventDefault();
    });
    field.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    field.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    field.addEventListener('pointerdown', (e) => {
      // 回撤已改为移动指令，途中仍可框选/右键改道/中键列阵

      // 中键：在鼠标位置循环竖列 → 横列 → 聚团（战斗/非战斗均可）
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        const pos = this.clientToBattlePos(e.clientX, e.clientY, field);
        this._applyFormationAtPoint(pos.x, pos.y);
        return;
      }

      // 右键：选中单位移向鼠标位置
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        if (!this._selectedUnitIds?.size) {
          this.showNotification('请先框选或点选部队');
          return;
        }
        const pos = this.clientToBattlePos(e.clientX, e.clientY, field);
        this._moveSelectedUnitsTo(pos.x, pos.y);
        return;
      }

      if (e.button !== 0) return;

      const unitEl = e.target.closest?.('.bf-unit');
      if (unitEl && unitEl.dataset.isAlly === '1') {
        const uid = unitEl.dataset.unitId;
        if (!uid) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          const next = new Set(this._selectedUnitIds || []);
          if (next.has(uid)) next.delete(uid);
          else next.add(uid);
          this._setFormationSelection([...next]);
          return;
        }
        this._setFormationSelection([uid]);
        return;
      }

      // 空白左键：仅框选 / 清空，不再拖拽移动
      this._startFormationBoxSelect(e, field, marquee);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this._selectedUnitIds?.size) return;
      if (document.getElementById('defense-overlay')?.classList.contains('hidden')) return;
      this._setFormationSelection([]);
    });
  };

  P._startFormationBoxSelect = function _startFormationBoxSelect(e, field, marquee) {
    e.preventDefault();
    try { window.getSelection()?.removeAllRanges(); } catch (_) { /* ignore */ }
    const startX = e.clientX;
    const startY = e.clientY;
    const fieldRect = field.getBoundingClientRect();
    let dragging = false;
    const DRAG_THRESH = 5;

    this._formationBusy = true;
    try { field.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    const updateMarquee = (clientX, clientY) => {
      const left = Math.min(startX, clientX) - fieldRect.left;
      const top = Math.min(startY, clientY) - fieldRect.top;
      const width = Math.abs(clientX - startX);
      const height = Math.abs(clientY - startY);
      marquee.classList.add('active');
      marquee.style.left = `${left}px`;
      marquee.style.top = `${top}px`;
      marquee.style.width = `${width}px`;
      marquee.style.height = `${height}px`;
    };

    const onMove = (ev) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!dragging && dist >= DRAG_THRESH) dragging = true;
      if (dragging) updateMarquee(ev.clientX, ev.clientY);
    };

    const end = (ev) => {
      field.removeEventListener('pointermove', onMove);
      field.removeEventListener('pointerup', end);
      field.removeEventListener('pointercancel', end);
      try { field.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      marquee.classList.remove('active');
      marquee.style.width = '0';
      marquee.style.height = '0';
      this._formationBusy = false;

      const endX = ev?.clientX ?? startX;
      const endY = ev?.clientY ?? startY;

      if (dragging) {
        const left = Math.min(startX, endX);
        const right = Math.max(startX, endX);
        const top = Math.min(startY, endY);
        const bottom = Math.max(startY, endY);
        const hit = [];
        document.querySelectorAll('#battle-embed-units .bf-unit[data-is-ally="1"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const cx = (r.left + r.right) / 2;
          const cy = (r.top + r.bottom) / 2;
          if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
            hit.push(el.dataset.unitId);
          }
        });
        if ((e.shiftKey || e.ctrlKey || e.metaKey) && this._selectedUnitIds?.size) {
          const next = new Set(this._selectedUnitIds);
          hit.forEach((id) => next.add(id));
          this._setFormationSelection([...next]);
        } else {
          this._setFormationSelection(hit);
        }
        return;
      }

      // 单击空白：清空选中
      this._setFormationSelection([]);
    };

    field.addEventListener('pointermove', onMove);
    field.addEventListener('pointerup', end);
    field.addEventListener('pointercancel', end);
  };

  /** 渲染非战斗时的预览单位（不修改 raid.units） */
  P._renderEmbeddedPreviewUnits = function _renderEmbeddedPreviewUnits(previewUnits) {
    const unitsContainer = document.getElementById('battle-embed-units');
    if (!unitsContainer) return;
    this._ensureFormationDragBound();

    let allyAlive = 0;
    previewUnits.forEach(u => { if (!u.isDead) allyAlive++; });
    const allyCountEl = document.querySelector('#battle-embed #battle-ally-count')
      || document.getElementById('battle-ally-count');
    const enemyCountEl = document.querySelector('#battle-embed #battle-enemy-count')
      || document.getElementById('battle-enemy-count');
    if (allyCountEl) allyCountEl.textContent = '' + allyAlive;
    if (enemyCountEl) enemyCountEl.textContent = '0';

    const d = this.ensureDefenseState();
    const savedPos = d.unitPositions || {};

    // 增量更新 DOM
    const existing = new Map();
    unitsContainer.querySelectorAll('.bf-unit').forEach(el => {
      existing.set(el.dataset.unitId, el);
    });
    const toRemove = new Set(existing.keys());

    previewUnits.forEach(unit => {
      if (unit.isDead) return;
      const uid = unit.id;
      toRemove.delete(uid);
      let el = existing.get(uid);
      if (!el) {
        el = document.createElement('div');
        el.className = 'bf-unit';
        el.dataset.unitId = uid;
        el.dataset.isAlly = '1';
        el.innerHTML = `
          <span class="bf-icon">${unit.icon}</span>
          <div class="bf-hp"><i style="width:100%"></i></div>
        `;
        el.style.cursor = 'grab';
        unitsContainer.appendChild(el);
      }
      el.dataset.role = unit.role || 'melee';
      el.dataset.postId = unit.postId || '';
      el.classList.toggle('is-selected', !!(this._selectedUnitIds && this._selectedUnitIds.has(uid)));
      const hpI = el.querySelector('.bf-hp i');
      if (hpI) {
        const maxHp = Math.max(1, unit.maxHp || 1);
        const hpPct = Math.max(0, Math.min(100, ((unit.hp != null ? unit.hp : maxHp) / maxHp) * 100));
        hpI.style.width = hpPct + '%';
      }
      // 正在拖拽：交给 pointer 管位置
      if (this._draggingUnitId === uid || this._draggingUnitIds?.has(uid) || el.classList.contains('is-dragging')) return;
      const pos = savedPos[uid];
      const x = pos ? pos.x : unit.x;
      const y = pos ? pos.y : (unit.y || 0);
      this._applyUnitDomPos(el, x, y);
    });

    toRemove.forEach(id => {
      if (this._draggingUnitId === id || this._draggingUnitIds?.has(id)) return;
      const el = existing.get(id);
      if (el) el.remove();
      if (this._selectedUnitIds?.has(id)) this._selectedUnitIds.delete(id);
      this.clearUnitMoveOrder?.(id);
    });
    this._syncMoveOrderLines?.();
    this._syncBattleHeroChrome?.(this.ensureDefenseState());
  };

  P.updateBattleScreen = function updateBattleScreen() {
    // 非战斗时也刷新内嵌战场
    this.refreshEmbeddedBattlefield();
    const d = this.ensureDefenseState();
    this._syncBattleHeroChrome(d);
    if (d.raid.phase !== 'combat') return;
    const gateDef = this.getGateLevelDef(d.gate.level);
    const title = document.getElementById('battle-title');
    const timer = document.getElementById('battle-timer');
    const gateBar = document.getElementById('battle-gate-bar');
    const logEl = document.getElementById('battle-log');

    if (title) {
      const carryN = (d.raid.carryoverEnemies || []).length;
      title.textContent = (d.raid.waveName || '战争') + (carryN > 0 ? ` (含 ${carryN} 残敌)` : '');
    }
    if (timer) {
      const hrs = (d.raid.combatMsLeft || 0) / this.getGameHourMs();
      timer.textContent = `剩余 ${hrs.toFixed(1)} 时`;
    }
    if (gateBar && gateDef) {
      gateBar.style.width = `${Math.max(0, Math.min(100, (d.gate.hp / gateDef.maxHp) * 100))}%`;
    }

    // 个体单位可视化
    this.updateBattleScreenVisuals();

    if (logEl) {
      logEl.innerHTML = (d.raid.log || []).slice(0, 8).map(l => `<li>${l}</li>`).join('');
    }
  };

  /** 防务合屏：城门/残敌进度条与站位提示 */
  P._syncBattleHeroChrome = function _syncBattleHeroChrome(d) {
    d = d || this.ensureDefenseState();
    const raid = d.raid || {};
    const gateDef = this.getGateLevelDef(d.gate.level);
    const hint = document.getElementById('battle-embed-hint');
    const field = document.getElementById('battle-embed-field');
    const gateBar = document.getElementById('battle-embed-gate-bar');
    const gateText = document.getElementById('battle-embed-gate-text');
    const enemyMeter = document.getElementById('battle-embed-enemy-meter');
    const enemyBar = document.getElementById('battle-embed-enemy-bar');
    const enemyText = document.getElementById('battle-embed-enemy-text');
    const inCombat = raid.phase === 'combat';

    if (field) {
      field.classList.toggle('is-combat', inCombat);
      const fieldLen = GAME_DATA.defense?.fieldLength || 100;
      const wallX = GAME_DATA.defense?.wallX || 14;
      field.style.setProperty('--battle-wall-pct', `${(wallX / fieldLen) * 100}%`);
    }

    if (hint) {
      hint.textContent = inCombat
        ? '战斗中可框选 · 右键移动 · 中键队列 · 竖线左侧为城内'
        : '左键框选/点选 · Ctrl加减选 · 右键移动 · 中键队列（鼠标处） · Esc取消';
    }

    if (gateDef && gateBar && gateText) {
      const hp = Math.max(0, d.gate.hp || 0);
      const max = Math.max(1, gateDef.maxHp || 1);
      const pct = Math.max(0, Math.min(100, (hp / max) * 100));
      gateBar.style.width = `${pct}%`;
      gateText.textContent = `城门 ${Math.ceil(hp)} / ${max}`;
    }

    const enemies = (raid.units || []).filter((u) => !u.isAlly && !u.isDead);
    const enemyMax = Math.max(
      enemies.length,
      (raid._enemySpawnTotal != null ? raid._enemySpawnTotal : 0),
      1
    );
    if (enemyMeter) enemyMeter.classList.toggle('hidden', !inCombat && enemies.length === 0);
    if (enemyBar && enemyText) {
      if (inCombat || enemies.length > 0) {
        const alive = enemies.length;
        const pct = Math.max(0, Math.min(100, (alive / enemyMax) * 100));
        enemyBar.style.width = `${pct}%`;
        enemyText.textContent = `残敌 ${alive}`;
      } else {
        enemyBar.style.width = '0%';
        enemyText.textContent = '残敌 —';
      }
    }
  };

  /** 格式化剩余时间：>= 24小时显示"约 X 天后"，< 24小时显示"约 X 小时后" */
  P._formatRaidCountdown = function _formatRaidCountdown(raid) {
    const dayMs = GAME_DATA.calendar?.dayDurationMs || 900000;
    const frac = Math.min(1, Math.max(0, (this.state.dayProgress || 0) / dayMs));
    const currentHour = frac * 24;
    const fromDay = this.state.day || 1;
    const toDay = raid.nextRaidDay || 7;
    const dayDiff = toDay - fromDay;
    const startH = this.getRaidCombatStartHour?.() ?? 10;

    let totalHours;
    if (raid.phase === 'warning') {
      // 预警阶段：按距开战日 10:00 的真实剩余时间（与 warningMsLeft 同源逻辑）
      const ms = typeof this.getMsUntilRaidCombat === 'function'
        ? this.getMsUntilRaidCombat(toDay)
        : (raid.warningMsLeft || 0);
      totalHours = Math.ceil(ms / dayMs * 24);
    } else if (dayDiff > 0) {
      // 隔天：完整天数 + 到开战时刻的剩余小时
      totalHours = dayDiff * 24 + (startH - currentHour);
    } else {
      // 同天：到开战时刻的小时数
      totalHours = startH - currentHour;
    }
    totalHours = Math.max(1, Math.ceil(totalHours));

    if (totalHours >= 24) {
      const displayDays = Math.round(totalHours / 24);
      return `约 ${displayDays} 天后`;
    }
    return `约 ${totalHours} 小时后`;
  };

  P.updateRaidStatus = function updateRaidStatus() {
    const el = document.getElementById('raid-status');
    if (!el) return;
    const d = this.ensureDefenseState();
    const raid = d.raid;
    el.classList.remove('warning', 'combat');
    if (raid.phase === 'combat') {
      el.textContent = '交战中';
      el.classList.add('combat');
      el.title = '袭击进行中：生产已暂停，点击防务可调整编制';
    } else if (raid.phase === 'warning') {
      el.textContent = '预警';
      el.classList.add('warning');
      el.title = this._formatRaidCountdown(raid) + '开战，请配置编制';
    } else {
      const left = Math.max(0, (raid.nextRaidDay || 7) - (this.state.day || 1));
      if (left > 2) {
        el.textContent = '和平';
        el.title = '';
      } else if (left <= 0) {
        el.textContent = '临战';
        el.title = '';
      } else {
        el.textContent = '和平';
        el.title = '下次袭击日：第 ' + (raid.nextRaidDay || 7) + ' 天';
      }
    }
  };

  P.renderDefenseOverview = function renderDefenseOverview() {
    const root = document.getElementById('defense-overview');
    if (!root) return;
    const d = this.ensureDefenseState();
    const raid = d.raid;
    const gateDef = this.getGateLevelDef(d.gate.level);
    const wave = this.getRaidWaveForDay(Math.max(this.state.day || 1, raid.nextRaidDay || 7));
    const posted = this.getDefensePostedCount();
    const total = this.state.workers.total || 0;
    const phaseClass = raid.phase === 'combat' ? 'combat' : (raid.phase === 'warning' ? 'warning' : '');

    let statusHtml = '';
    if (raid.phase === 'combat') {
      const enemiesAlive = d.raid.units ? d.raid.units.filter(u => !u.isAlly && !u.isDead).length : 0;
      statusHtml = `
        <div class="defense-card raid-preview combat" id="defense-status-card">
          <h4>⚔️ 正在交战：${raid.waveName || '来袭'}</h4>
          <p class="defense-timer">战斗中 · 采集与制作已全部暂停，全体村民抗敌</p>
          <p class="defense-comp">残敌 ${enemiesAlive} 个</p>
          <p class="hint">${wave?.tip || ''}</p>
        </div>`;
    } else if (raid.phase === 'warning') {
      const carryN = (raid.carryoverEnemies || []).length;
      const carryHtml = carryN > 0 ? `<p class="defense-comp" style="color:#e07060;">⚠️ 上次撤退的 ${carryN} 个残敌将随本次袭击一同来袭！</p>` : '';
      statusHtml = `
        <div class="defense-card raid-preview warning" id="defense-status-card">
          <h4>⚠️ 袭击预警</h4>
          <p class="defense-timer">${this._formatRaidCountdown(raid)}开战（第 ${raid.nextRaidDay} 天）</p>
          <p class="defense-comp">预计来犯：${(wave?.composition || []).map(u => `${u.name}×${u.count}`).join('、') || '不明'}</p>
          ${carryHtml}
          <p class="hint">下方编制现在即可配置，开战瞬间生效。</p>
        </div>`;
    } else {
      statusHtml = `
        <div class="defense-card raid-preview" id="defense-status-card">
          <h4>🕊️ 和平时期</h4>
          <p class="defense-timer">下次袭击：第 ${raid.nextRaidDay} 天</p>
          <p class="defense-comp">预警波次预览：${wave?.name || '—'} · ${(wave?.composition || []).map(u => `${u.name}×${u.count}`).join('、') || '尚早'}</p>
          <p class="hint">袭击在 10:00~12:00 开始。22:00 未破门则敌人撤退并累计到下次。全歼敌人 = 完美解决。</p>
        </div>`;
    }

    const stance = d.stance || 'defend';
    const inCombat = raid.phase === 'combat';
    const repairN = inCombat
      ? (raid.activeRepairWorkers || 0)
      : Math.max(0, total - posted);
    const swapQ = inCombat ? (raid.rosterSwapQueue || []) : [];
    const swapEta = inCombat ? Math.ceil(this.getRosterSwapQueueEtaSec()) : 0;
    const swapHint = swapQ.length > 0
      ? `<p class="hint defense-swap-hint">换装队列 ${swapQ.length} 人 · 约剩 ${swapEta} 秒（每人 ${this.getRosterSwapSec()} 秒）</p>`
      : '';
    const troops = POST_DEFS.map(p => {
      const n = inCombat ? this.countRosterDisplayByPost(p.id) : (d.posts[p.id] || 0);
      const cap = this.getPostWeaponCap(p.id);
      const insideN = inCombat ? this.countInsideAlliesByPost(p.id) : n;
      const pendingAdd = inCombat ? this.countPendingRosterAdds(p.id) : 0;
      const pendingRm = inCombat ? this.countPendingRosterRemoves(p.id) : 0;
      const canDec = inCombat ? insideN > 0 : n > 0;
      const canInc = inCombat
        ? (repairN > 0 && (cap >= 99999 || n < cap))
        : (posted < total && n < cap);
      const pendingHint = (pendingAdd || pendingRm)
        ? ` · 换装中 +${pendingAdd}/−${pendingRm}`
        : '';
      return `
        <div class="troop-row" data-post-id="${p.id}">
          <div class="troop-row-head">
            <span>${p.icon} ${p.name}</span>
            <span class="hint">${inCombat ? `门内可撤 ${insideN}${pendingHint}` : `武器可用 ${cap}`}</span>
          </div>
          <div class="worker-assign-row">
            <button type="button" class="btn-worker btn-defense-post-dec" data-post-id="${p.id}" ${canDec ? '' : 'disabled'} title="${inCombat && !canDec ? '仅城门内单位可撤编' : ''}">−</button>
            <span class="worker-count">${n}</span>
            <button type="button" class="btn-worker btn-defense-post-inc" data-post-id="${p.id}" ${canInc ? '' : 'disabled'} title="${inCombat && !canInc ? '只能从修门队增援' : ''}">+</button>
          </div>
        </div>`;
    }).join('');

    const upgradeCost = gateDef?.upgradeCost;
    const gateTechHint = (d.gate.level || 1) >= (GAME_DATA.defense?.gate?.maxLevel || 4)
      ? '<span class="hint">城门已满级</span>'
      : '<span class="hint">更高等级城门请在科技树解锁（砖块烧制后）</span>';

    root.innerHTML = `
      ${statusHtml}
      <div class="defense-card" id="defense-stance-card">
        <h4>指挥姿态</h4>
        <div class="worker-assign-row defense-stance-row">
          <button type="button" class="btn-craft btn-defense-stance ${stance === 'defend' ? 'stance-active' : ''}" data-stance="defend">防御</button>
          <button type="button" class="btn-craft btn-defense-stance ${stance === 'attack' ? 'stance-active' : ''}" data-stance="attack">出击</button>
          <button type="button" class="btn-craft btn-defense-stance ${stance === 'march' ? 'stance-active' : ''}" data-stance="march">随军出击</button>
        </div>
        <p class="hint">防御：远程压制、近战守门。出击：近战各自出城纠缠。随军出击：近战/远程分别按最慢者齐步前进，接敌后恢复各自移速。</p>
      </div>
      <div class="defense-card" id="defense-roster-card">
        <h4>出战编制 <small class="hint">已编 ${inCombat ? POST_DEFS.reduce((s, p) => s + this.countRosterDisplayByPost(p.id), 0) : posted}/${total}</small></h4>
        <p class="hint">${inCombat
          ? '战时：只能从修门队增援；减员仅限城门内单位。换装/卸装每人约 1 秒，多人排队累加。'
          : '战时全体停工。编制内的上岗战斗（含徒手），其余全部修门。门破后修门队员自动参战。'}</p>
        ${swapHint}
        ${troops}
        <div class="troop-row">
          <div class="troop-row-head">
            <span>🔧 修门队</span>
            <span class="hint">${inCombat ? '战时增援来源' : '未编入战斗的村民自动修门'}</span>
          </div>
          <div class="worker-assign-row">
            <span class="worker-count">${repairN}</span>
          </div>
        </div>
      </div>
      <div class="defense-card" id="defense-gate-card">
        <h4>🚪 ${gateDef?.name || '城门'} · Lv${d.gate.level}</h4>
        <div class="bar-track tall"><div class="bar-fill gate" style="width:${gateDef ? Math.max(0, Math.min(100, (d.gate.hp / gateDef.maxHp) * 100)) : 0}%"></div></div>
        <p class="hint">耐久 ${Math.floor(d.gate.hp || 0)} / ${gateDef?.maxHp || '—'} · 减伤 ${Math.round((gateDef?.damageReduction || 0) * 100)}%</p>
        <p class="hint">修门队自动修复（每人每10秒 ${((GAME_DATA.defense?.gate?.repairHpPerWorkerPer10s ?? 2) * this.getGateRepairEfficiencyMult()).toFixed(1)} 点，当前效率 ×${this.getGateRepairEfficiencyMult().toFixed(2)}）</p>
        <div class="worker-assign-row">
          ${gateTechHint}
        </div>
      </div>
    `;
  };

  // —— 挂到既有流程上的小补丁 ——
  const _setup = P.setupEventListeners;
  P.setupEventListeners = function setupEventListenersDefense() {
    const already = !!this._eventListenersBound;
    _setup.call(this);
    this._ensureFormationDragBound();
    if (already || this._defenseRaidStatusBound) return;
    this._defenseRaidStatusBound = true;
    document.getElementById('raid-status')?.addEventListener('click', () => {
      if (!this.isTabUnlocked('defense')) return;
      this.state.activeTab = 'defense';
      this.render();
    });
  };

  /** 姿态/编制按钮：挂在 document 上且只绑一次，避免 game 早于本文件启动时漏绑 */
  function bindDefenseUiClicksOnce() {
    if (window.__defenseUiClicksBound) return;
    window.__defenseUiClicksBound = true;
    document.addEventListener('click', (e) => {
      const g = window.game;
      if (!g || typeof g.setDefenseStance !== 'function') return;
      const stanceBtn = e.target.closest?.('.btn-defense-stance');
      if (stanceBtn) {
        g.setDefenseStance(stanceBtn.dataset.stance);
        return;
      }
      const inc = e.target.closest?.('.btn-defense-post-inc');
      if (inc && !inc.disabled) {
        g.adjustDefensePost(inc.dataset.postId, g.getBulkMultiplier(e));
        return;
      }
      const dec = e.target.closest?.('.btn-defense-post-dec');
      if (dec && !dec.disabled) {
        g.adjustDefensePost(dec.dataset.postId, -g.getBulkMultiplier(e));
      }
    });
  }
  bindDefenseUiClicksOnce();

  const _deleg = P.setupEventDelegation;
  P.setupEventDelegation = function setupEventDelegationDefense() {
    _deleg.call(this);
    bindDefenseUiClicksOnce();
  };

  // 若因缓存旧版 game.js 已提前 new 过，补上布阵绑定
  if (window.game && typeof window.game._ensureFormationDragBound === 'function') {
    window.game._ensureFormationDragBound();
  }

  const _render = P.render;
  P.render = function renderDefense() {
    _render.call(this);
    this.renderDefenseOverview();
    this.updateRaidStatus();
    if (!this._draggingUnitId && !this._formationRecalling) this.updateBattleScreen();
  };

  const _tick = P.renderTick;
  P.renderTick = function renderTickDefense() {
    _tick.call(this);
    this.updateRaidStatus();
    if (!this._draggingUnitId && !this._formationRecalling) this.updateBattleScreen();
    if (
      this.state.activeTab === 'defense'
      && this.isRaidCombatActive()
      && (this.ensureDefenseState().raid.rosterSwapQueue || []).length > 0
    ) {
      this.updateRosterSwapHint();
    }
  };

  /** 轻量刷新换装队列剩余时间（避免每帧重建整个编制面板） */
  P.updateRosterSwapHint = function updateRosterSwapHint() {
    const card = document.getElementById('defense-roster-card');
    if (!card) return;
    const q = this.ensureDefenseState().raid.rosterSwapQueue || [];
    let el = card.querySelector('.defense-swap-hint');
    if (!q.length) {
      el?.remove();
      return;
    }
    const eta = Math.ceil(this.getRosterSwapQueueEtaSec());
    const text = `换装队列 ${q.length} 人 · 约剩 ${eta} 秒（每人 ${this.getRosterSwapSec()} 秒）`;
    if (!el) {
      el = document.createElement('p');
      el.className = 'hint defense-swap-hint';
      const firstHint = card.querySelector(':scope > p.hint');
      if (firstHint) firstHint.insertAdjacentElement('afterend', el);
      else card.insertBefore(el, card.querySelector('.troop-row'));
    }
    el.textContent = text;
  };

  const _sim = P.runGameSimulation;
  P.runGameSimulation = function runGameSimulationDefense(dt) {
    _sim.call(this, dt);
    this.processDefense(dt);
  };

  const _auto = P.getStationAutoSpeed;
  P.getStationAutoSpeed = function getStationAutoSpeedDefense(type, id) {
    if (this.isRaidWorkPaused()) return 0;
    return _auto.call(this, type, id);
  };

  const _click = P.clickStation;
  P.clickStation = function clickStationDefense(type, id) {
    if (this.isRaidWorkPaused()) {
      this.showNotification('袭击进行中，采集与制作已暂停，请先抗敌！');
      return;
    }
    return _click.call(this, type, id);
  };

  const _order = P.placeCraftOrder;
  P.placeCraftOrder = function placeCraftOrderDefense(recipeId, count, opts) {
    if (this.isRaidWorkPaused()) {
      if (!opts?.silent) this.showNotification('袭击进行中，无法安排生产');
      return 0;
    }
    return _order.call(this, recipeId, count, opts);
  };

  const _manual = P.canManualCraftClick;
  P.canManualCraftClick = function canManualCraftClickDefense(type, id) {
    if (this.isRaidWorkPaused()) return false;
    return _manual.call(this, type, id);
  };

  P.getCombatToolDemand = function getCombatToolDemandDefense(toolId) {
    if (!this.isRaidCombatActive()) return 0;
    const posts = this.ensureDefenseState().raid.activePosts
      || this.ensureDefenseState().posts
      || {};
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
  };
})();
