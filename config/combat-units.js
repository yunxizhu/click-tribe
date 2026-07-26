/** 敌我单位战斗数据：友军表、铠甲、敌军模板与波次（独立配置） */
window.COMBAT_UNITS_DATA = {
  /**
   * move = 每游戏小时移动距离；range = 攻击距离
   * 近战整体快于远程；铠甲有 movePenalty
   * 友军正式数值以 allyStats 为准（含武器效果预计算）
   */
  /** 友军属性表（预计算，含武器+盾+剑减伤，不含铠甲；flatDr=固定减伤） */
  allyStats: {
    bare: { atk: 3, hp: 50, aspd: 1.5, drMelee: 0, drRanged: 0, flatDr: 0, range: 4, move: 4.5 },
    bow: {
      1: { atk: 10, hp: 50, aspd: 0.8, drMelee: 0, drRanged: 0, flatDr: 0, range: 20, move: 2.4 },
      2: { atk: 16, hp: 50, aspd: 0.8, drMelee: 0, drRanged: 0, flatDr: 0, range: 22, move: 2.4 },
      3: { atk: 22, hp: 50, aspd: 0.8, drMelee: 0, drRanged: 0, flatDr: 0, range: 24, move: 2.4 },
      4: { atk: 28, hp: 50, aspd: 0.8, drMelee: 0, drRanged: 0, flatDr: 0, range: 26, move: 2.4 },
    },
    crossbow: {
      1: { atk: 18, hp: 50, aspd: 0.3, drMelee: 0, drRanged: 0, flatDr: 0, range: 35, move: 2 },
      2: { atk: 25, hp: 50, aspd: 0.3, drMelee: 0, drRanged: 0, flatDr: 0, range: 37, move: 2 },
      3: { atk: 32, hp: 50, aspd: 0.3, drMelee: 0, drRanged: 0, flatDr: 0, range: 39, move: 2 },
      4: { atk: 40, hp: 50, aspd: 0.3, drMelee: 0, drRanged: 0, flatDr: 0, range: 41, move: 2 },
    },
    sword: {
      1: { atk: 15, hp: 50, aspd: 1.2, drMelee: 0, drRanged: 0, flatDr: 0, range: 6, move: 3.8 },
      2: { atk: 21, hp: 50, aspd: 1.2, drMelee: 0, drRanged: 0, flatDr: 0, range: 6, move: 3.8 },
      3: { atk: 27, hp: 50, aspd: 1.2, drMelee: 0, drRanged: 0, flatDr: 0, range: 6, move: 3.8 },
      4: { atk: 33, hp: 50, aspd: 1.2, drMelee: 0, drRanged: 0, flatDr: 0, range: 6, move: 3.8 },
    },
    /** 长矛兵：射程长于剑，攻速略低（数值可改） */
    spear: {
      1: { atk: 20, hp: 50, aspd: 0.85, drMelee: 0, drRanged: 0, flatDr: 0, range: 8, move: 3.8 },
      2: { atk: 28, hp: 50, aspd: 0.85, drMelee: 0, drRanged: 0, flatDr: 0, range: 8, move: 3.8 },
      3: { atk: 36, hp: 50, aspd: 0.85, drMelee: 0, drRanged: 0, flatDr: 0, range: 9, move: 3.8 },
      4: { atk: 44, hp: 50, aspd: 0.85, drMelee: 0, drRanged: 0, flatDr: 0, range: 9, move: 3.8 },
    },
    shield: {
      1: { atk: 1, hp: 50, aspd: 0.8, drMelee: 0.20, drRanged: 0.35, flatDr: 1, range: 3, move: 4 },
      2: { atk: 2, hp: 50, aspd: 0.85, drMelee: 0.22, drRanged: 0.37, flatDr: 2, range: 3, move: 4 },
      3: { atk: 3, hp: 50, aspd: 0.9, drMelee: 0.24, drRanged: 0.39, flatDr: 3, range: 3, move: 4 },
      4: { atk: 4, hp: 50, aspd: 0.95, drMelee: 0.26, drRanged: 0.41, flatDr: 4, range: 3, move: 4 },
    },
  },
  /** 铠甲增益表（叠加到友军基础属性上；movePenalty=移速降低比例；flatDr=固定减伤，可改） */
  armorStats: {
    1: { hp: 80, drMelee: 0.05, drRanged: 0.14, flatDr: 1, movePenalty: 0.08 },
    2: { hp: 140, drMelee: 0.08, drRanged: 0.17, flatDr: 1.5, movePenalty: 0.10 },
    3: { hp: 220, drMelee: 0.11, drRanged: 0.20, flatDr: 2, movePenalty: 0.12 },
    4: { hp: 340, drMelee: 0.14, drRanged: 0.23, flatDr: 2.5, movePenalty: 0.14 },
  },
  /** 敌人默认移速/射程（与友军同量级） */
  enemyDefaults: {
    melee: { move: 4.0, range: 4 },
    ranged: { move: 2.4, range: 20 },
    siege: { move: 2.2, range: 5 },
  },
  /**
   * 敌军模板对标友军 allyStats：
   * 流寇≈徒手/弱近战，投石手≈弓 L1~L2，持刃≈剑/矛中阶，锤手≈厚血慢速攻城
   */
  enemyTemplates: {
    bare: { id: 'bare', name: '流寇', role: 'melee', icon: '👺', atk: 5, hp: 60, aspd: 1.2, move: 4.2, range: 4 },
    sling: { id: 'sling', name: '投石手', role: 'ranged', icon: '🥌', atk: 8, hp: 60, aspd: 0.8, move: 2.4, range: 20 },
    raider: { id: 'raider', name: '持刃爪牙', role: 'melee', icon: '👹', atk: 18, hp: 96, aspd: 1.1, move: 3.6, range: 6 },
    // 工程单位：全体 +20% 血后再额外 +20% 血，攻击 -20%
    ram: { id: 'ram', name: '破门锤手', role: 'siege', icon: '🔨', atk: 11, hp: 173, aspd: 0.45, move: 2.2, range: 5 },
  },
  /** 波次：数值对标 allyStats；后期波次在同模板上小幅加强 */
  waves: [
    {
      id: 'scout',
      name: '斥候袭扰',
      minDay: 1,
      composition: [
        { id: 'bare', name: '流寇', role: 'melee', icon: '👺', count: 6, atk: 5, hp: 60, aspd: 1.2, move: 4.2, range: 4 },
      ],
      tip: '近战需守门内。木弓（atk10）约 6 箭可杀一流寇（60 血）。',
    },
    {
      id: 'raiders',
      name: '匪徒冲阵',
      minDay: 4,
      composition: [
        { id: 'bare', name: '流寇', role: 'melee', icon: '👺', count: 8, atk: 6, hp: 66, aspd: 1.2, move: 4.2, range: 4 },
        { id: 'sling', name: '投石手', role: 'ranged', icon: '🥌', count: 3, atk: 10, hp: 60, aspd: 0.8, move: 2.4, range: 22 },
      ],
      tip: '投石手对标弓手：会停在远处射击，近战仍冲城门。',
    },
    {
      id: 'warband',
      name: '爪牙战团',
      minDay: 8,
      composition: [
        { id: 'bare', name: '流寇', role: 'melee', icon: '👺', count: 6, atk: 6, hp: 72, aspd: 1.2, move: 4.2, range: 4 },
        { id: 'raider', name: '持刃爪牙', role: 'melee', icon: '👹', count: 5, atk: 19, hp: 108, aspd: 1.1, move: 3.6, range: 6 },
        { id: 'sling', name: '投石手', role: 'ranged', icon: '🥌', count: 3, atk: 11, hp: 66, aspd: 0.8, move: 2.4, range: 22 },
        { id: 'ram', name: '破门锤手', role: 'siege', icon: '🔨', count: 2, atk: 13, hp: 187, aspd: 0.45, move: 2.2, range: 5 },
      ],
      tip: '持刃≈中阶剑矛，锤手厚血慢速。优先修门或出击拦截锤手。',
    },
  ],
};

if (typeof applyCombatUnitsData === 'function') applyCombatUnitsData(window.COMBAT_UNITS_DATA);
