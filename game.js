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

// 点击部落 - 核心游戏逻辑
class FactoryGame {
  constructor() {
    this.state = this.getDefaultState();
    this.lastTick = Date.now();
    this.holdClicking = false;
    this.holdTimer = null;
    this.devTimeScale = 1;
    this._suppressSounds = false;
    this._unlockFlash = null;
    this._unlockFlashTimer = null;
    this._chestSparkLoop = null;
    this.sounds = new GameSounds();
    this.init();
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
          currentCount: 0,
          cooldownRemaining: 0,
          upgrades: { dropRate: 0, rewardTypes: 0, rewardAmount: 0 },
          assignedWorkers: 0,
        };
      } else {
        resourcePoints[k] = {
          unlocked: def.unlockRequires == null,
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
      craftStations[r.id] = {
        assignedWorkers: 0,
        cooldownRemaining: 0,
        autoProduce: false,
      };
    });

    const toolInventory = {};
    Object.keys(GAME_DATA.villagerTools || {}).forEach(k => { toolInventory[k] = {}; });

    const housing = GAME_DATA.housing || {};
    const startingHouses = housing.startingHouses || 10;
    const startingVillagers = housing.startingVillagers || 10;
    const houses = [];
    for (let i = 0; i < startingHouses; i++) {
      houses.push({ id: `house_${i + 1}`, level: 0 });
    }

    const unlockedTech = [...(GAME_DATA.startingTechs || [])];
    if (unlockedTech.includes('unlock_treasure_chest') && resourcePoints.treasure_chest) {
      resourcePoints.treasure_chest.unlocked = true;
    }

    return {
      resources,
      resourcePoints,
      craftStations,
      craftQueues: {},
      toolInventory,
      unlockedTech,
      workers: { total: startingVillagers, unassigned: startingVillagers },
      houses,
      houseUpgradePurchases: { 1: 0, 2: 0 },
      houseBuildCount: startingHouses,
      nextHouseSeq: startingHouses + 1,
      pendingBreeds: 0,
      breedsOrderedToday: 0,
      workerLayout: {},
      activeStation: { type: 'point', id: 'forest' },
      activeTab: 'tech',
      totalClicks: 0,
      day: 1,
      dayProgress: 0,
      hungryCount: 0,
      unlockedAchievements: [],
      lastSaveTime: Date.now(),
      defense: this.createDefaultDefenseState(),
      tutorial: this.createDefaultTutorialState(),
      forestHarvestCount: 0,
      starterChestGranted: false,
      playerTimeScale: 1,
      speedTipSeen: false,
      gameOver: false,
      gameOverReason: '',
    };
  }

  createDefaultDefenseState() {
    return {
      introSeen: false,
      stance: 'defend',
      posts: { bow: 0, crossbow: 0, sword: 0, swordShield: 0, shield: 0 },
      gate: { level: 1, hp: 100, repairWorkers: 0, repairProgress: 0 },
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

  createDefaultTutorialState() {
    return {
      completed: false,
      skipped: false,
      stepIndex: 0,
      berryHarvests: 0,
      forestHarvests: 0,
      starterChestOpened: false,
    };
  }

  init() {
    this.load();
    this.applyOfflineProgress();
    this.checkAchievements(true);
    this.setupEventListeners();
    this.sounds.bindUnlock();
    window.addEventListener('beforeunload', () => this.save());
    window.addEventListener('resize', () => this.updateUnlockToastPosition());
    this.startGameLoop();
    this.render();
    this.updateUnlockToastPosition();
    this.showDefenseIntroIfNeeded();
    this.startTutorialIfNeeded();
  }

  // ========== 存档 ==========
  save() {
    this.state.lastSaveTime = Date.now();
    try {
      localStorage.setItem('factoryGame', JSON.stringify(this.state));
    } catch (e) { /* ignore */ }
  }

  load() {
    try {
      const saved = localStorage.getItem('factoryGame');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.getDefaultState(), ...parsed };
        this.migrateState();
      }
    } catch (e) { /* ignore */ }
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
          if (!pt.upgradeCostScale) pt.upgradeCostScale = { countCd: 1, refine: 1, refineBumps: 0 };
          if (pt.upgradeCostScale.countCd === undefined) pt.upgradeCostScale.countCd = 1;
          if (pt.upgradeCostScale.refine === undefined) pt.upgradeCostScale.refine = 1;
          if (pt.upgradeCostScale.refineBumps === undefined) pt.upgradeCostScale.refineBumps = 0;
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
        if (st.cooldownTotal === undefined) st.cooldownTotal = 0;
      }
    });
    Object.values(this.state.resourcePoints).forEach(pt => {
      if (pt.cooldownRemaining > 0 && !pt.cooldownTotal) {
        pt.cooldownTotal = pt.cooldownRemaining;
      }
      if (pt.cooldownRemaining <= 0) pt.cooldownTotal = 0;
    });
    if (!this.state.craftQueues) {
      this.state.craftQueues = {};
      (this.state.craftOrders || []).forEach(o => {
        const q = this.state.craftQueues[o.recipeId] || { quantity: 0, progress: 0 };
        if (q.quantity === 0) q.progress = o.progress || 0;
        q.quantity += 1;
        this.state.craftQueues[o.recipeId] = q;
      });
    }
    delete this.state.craftOrders;
    delete this.state.craftOrderSeq;

    if (!this.state.toolInventory) this.state.toolInventory = {};
    Object.keys(GAME_DATA.villagerTools || {}).forEach(k => {
      const v = this.state.toolInventory[k];
      if (typeof v === 'number') {
        this.state.toolInventory[k] = v > 0 ? { 1: v } : {};
      } else if (!v || typeof v !== 'object') {
        this.state.toolInventory[k] = {};
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
    if (!this.state.craftQueues) this.state.craftQueues = {};
    Object.entries(legacyToolRecipes).forEach(([oldId, newId]) => {
      const oldQ = this.state.craftQueues?.[oldId];
      if (oldQ?.quantity > 0) {
        const q = this.state.craftQueues[newId] || { quantity: 0, progress: 0 };
        q.quantity += oldQ.quantity;
        if (!q.progress) q.progress = oldQ.progress || 0;
        this.state.craftQueues[newId] = q;
      }
      delete this.state.craftQueues?.[oldId];
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
    if (this.state.speedTipSeen === undefined) this.state.speedTipSeen = false;
    if (this.state.playerTimeScale === undefined) this.state.playerTimeScale = 1;

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

    // 无订单配方上不应挂着村民
    GAME_DATA.recipes.forEach(r => this.releaseRecipeWorkersIfNoOrder(r.id));
  }

  reset() {
    if (confirm('确定要重置所有进度吗？此操作不可撤销！')) {
      localStorage.removeItem('factoryGame');
      this.state = this.getDefaultState();
      this.timeScale = 1;
      this.devTimeScale = 1;
      this.render();
      this.showDefenseIntroIfNeeded();
      this.startTutorialIfNeeded();
      this.save();
    }
  }

  // ========== 背景介绍 / 新手教程 ==========
  showDefenseIntroIfNeeded() {
    if (this.state.defense?.introSeen) return;
    if (!this.state.defense) this.state.defense = this.createDefaultDefenseState();
    document.getElementById('defense-intro')?.classList.remove('hidden');
  }

  dismissDefenseIntro() {
    if (!this.state.defense) this.state.defense = this.createDefaultDefenseState();
    this.state.defense.introSeen = true;
    document.getElementById('defense-intro')?.classList.add('hidden');
    this.save();
    this.startTutorialIfNeeded();
  }

  isTutorialActive() {
    const t = this.state.tutorial;
    if (!t || t.completed || t.skipped) return false;
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

  startTutorialIfNeeded() {
    if (!this.state.tutorial) this.state.tutorial = this.createDefaultTutorialState();
    if (this.state.tutorial.completed || this.state.tutorial.skipped) {
      this.clearTutorialHighlights();
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      return;
    }
    if (this.state.defense && !this.state.defense.introSeen) return;
    this.render();
  }

  skipTutorial() {
    if (!this.state.tutorial) this.state.tutorial = this.createDefaultTutorialState();
    this.state.tutorial.skipped = true;
    this.state.tutorial.completed = true;
    this.clearTutorialHighlights();
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    this.showNotification('已跳过新手教程');
    this.save();
  }

  finishTutorial() {
    if (!this.state.tutorial) return;
    this.state.tutorial.completed = true;
    this.clearTutorialHighlights();
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
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
    t.stepIndex = Math.min(steps.length - 1, (t.stepIndex || 0) + 1);
    if (!steps[t.stepIndex]) {
      this.finishTutorial();
      return;
    }
    this.render();
    this.save();
  }

  clearTutorialHighlights() {
    document.querySelectorAll('.tut-highlight').forEach(el => {
      el.classList.remove('tut-highlight', 'tut-highlight-soft');
    });
  }

  applyTutorialHighlights(selectors = []) {
    this.clearTutorialHighlights();
    let primaryDone = false;
    (selectors || []).forEach(sel => {
      if (!sel) return;
      document.querySelectorAll(sel).forEach(el => {
        if (!primaryDone) {
          el.classList.add('tut-highlight');
          primaryDone = true;
        } else {
          el.classList.add('tut-highlight', 'tut-highlight-soft');
        }
      });
    });
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
    if (kind === 'plank') return this.state.resources.plank || 0;
    if (kind === 'tool') {
      return ['axe', 'pickaxe', 'shovel'].some(id => this.getToolStockTotal(id) > 0) ? 1 : 0;
    }
    if (kind === 'weapon') {
      return ['bow', 'crossbow', 'sword', 'shield', 'armor'].some(id => this.getToolStockTotal(id) > 0) ? 1 : 0;
    }
    return 0;
  }

  resolveTutorialGuidance(step) {
    if (!step) return null;
    if (step.id === 'craft_plank') {
      const queued = this.getCraftQueueCount('craft_plank') > 0;
      if (queued && (this.state.resources.plank || 0) < 1) {
        return {
          ...step,
          title: '加工木板',
          text: '订单已下好。在中间点击区加工木板（或派工人）。',
          highlight: ['#click-area'],
          ensureTab: null,
          ensureStation: { type: 'recipe', id: 'craft_plank' },
        };
      }
    }
    if (step.id === 'craft_tool') {
      const queued = this.getCraftQueueCount('craft_axe_1') > 0;
      if (queued && this.getTutorialProgressValue('tool') < 1) {
        return {
          ...step,
          title: '加工木斧',
          text: '木斧已下单。在中间点击完成制作。',
          highlight: ['#click-area'],
          ensureTab: null,
          ensureStation: { type: 'recipe', id: 'craft_axe_1' },
        };
      }
    }
    if (step.id === 'craft_weapon') {
      const ids = ['craft_bow_1', 'craft_sword_1', 'craft_shield_1', 'craft_crossbow_1', 'craft_armor_1'];
      const queued = ids.find(id => this.getCraftQueueCount(id) > 0);
      if (queued && this.getTutorialProgressValue('weapon') < 1) {
        return {
          ...step,
          title: '加工武器',
          text: '订单已下好。在中间点击完成加工。',
          highlight: ['#click-area'],
          ensureTab: null,
          ensureStation: { type: 'recipe', id: queued },
        };
      }
    }
    if (step.id === 'open_starter_chest') {
      const stock = this.state.resourcePoints.treasure_chest?.stock || 0;
      if (stock <= 0 && !this.state.tutorial?.starterChestOpened) {
        return {
          ...step,
          text: '还没有宝箱库存。继续砍树，第二根木头会固定掉落宝箱。',
          highlight: ['.station-btn[data-station-id="forest"]', '#click-area'],
          ensureStation: { type: 'point', id: 'forest' },
        };
      }
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
    if (id === 'craft_tool') return this.getTutorialProgressValue('tool') >= 1;
    if (id === 'assign_forest') return (this.state.resourcePoints.forest?.assignedWorkers || 0) >= 1;
    if (id === 'food_intro') return (this.state.tutorial.berryHarvests || 0) >= (step.target || 3);
    if (id === 'unlock_plank') return (this.state.unlockedTech || []).includes('unlock_plank_craft');
    if (id === 'craft_plank') return (this.state.resources.plank || 0) >= (step.target || 1);
    if (id === 'craft_weapon') return this.getTutorialProgressValue('weapon') >= 1;
    return false;
  }

  ensureTutorialContext(step) {
    const g = this.resolveTutorialGuidance(step) || step;
    if (!g) return;
    if (g.ensureTab) this.state.activeTab = g.ensureTab;
    if (g.ensureStation) {
      this.state.activeStation = { type: g.ensureStation.type, id: g.ensureStation.id };
    }
  }

  autoAdvanceTutorialSteps() {
    if (!this.isTutorialActive()) return;
    let guard = 0;
    while (guard++ < 12) {
      const step = this.getTutorialStep();
      if (!step || step.requireNext || step.finishOnNext) break;
      if (!this.isTutorialStepComplete(step)) break;
      const steps = this.getTutorialSteps();
      this.state.tutorial.stepIndex = Math.min(steps.length - 1, (this.state.tutorial.stepIndex || 0) + 1);
    }
  }

  prepareTutorialForRender() {
    if (!this.isTutorialActive()) return;
    this.autoAdvanceTutorialSteps();
    const step = this.getTutorialStep();
    if (!step) return;
    this.ensureTutorialContext(step);
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
    if (this.isTutorialStepComplete(step) && !step.requireNext && !step.finishOnNext) {
      this.render();
      return;
    }
    const g = this.resolveTutorialGuidance(step) || step;
    const needSwitch = (g.ensureTab && this.state.activeTab !== g.ensureTab)
      || (g.ensureStation && !this.isActiveStation(g.ensureStation.type, g.ensureStation.id));
    if (needSwitch) {
      this.render();
      return;
    }
    const progressEl = document.getElementById('tutorial-progress');
    const titleEl = document.getElementById('tutorial-title');
    const textEl = document.getElementById('tutorial-text');
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
    requestAnimationFrame(() => this.applyTutorialHighlights(g.highlight || []));
  }

  tryGrantStarterChest(fromPointId) {
    if (fromPointId !== 'forest') return;
    if (this.state.starterChestGranted) return;
    const need = GAME_DATA.starterChest?.afterForestHarvests ?? 2;
    this.state.forestHarvestCount = (this.state.forestHarvestCount || 0) + 1;
    if (this.state.tutorial && !this.state.tutorial.completed) {
      this.state.tutorial.forestHarvests = this.state.forestHarvestCount;
    }
    if (this.state.forestHarvestCount < need) return;

    if (!this.isTechUnlocked('unlock_treasure_chest')) {
      this.state.unlockedTech.push('unlock_treasure_chest');
    }
    const chestPt = this.state.resourcePoints.treasure_chest;
    if (!chestPt) return;
    chestPt.unlocked = true;
    chestPt.stock = (chestPt.stock || 0) + 1;
    chestPt.nextOpenPreset = 'starter_axe';
    this.state.starterChestGranted = true;
    this.showNotification(GAME_DATA.starterChest?.tip || '🎁 发现了宝箱！');
  }

  getStarterAxeChestRewards() {
    const list = GAME_DATA.starterChest?.rewards;
    if (list?.length) return list.map(r => ({ ...r }));
    return [{ res: 'wood', amt: 10 }, { res: 'resin', amt: 6 }];
  }

  // ========== 工作站 ==========
  getStationDef(type, id) {
    if (type === 'point') return GAME_DATA.resourcePoints[id];
    return GAME_DATA.recipes.find(r => r.id === id);
  }

  getStationState(type, id) {
    if (type === 'point') return this.state.resourcePoints[id];
    return this.state.craftStations[id];
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

  isRecipeTechUnlocked(recipeId) {
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    return recipe && this.isTechUnlocked(recipe.requires);
  }

  scaleCost(inputs, count) {
    const scaled = {};
    Object.entries(inputs || {}).forEach(([k, v]) => { scaled[k] = v * count; });
    return scaled;
  }

  getCraftQueue(recipeId) {
    return (this.state.craftQueues || {})[recipeId];
  }

  getCraftQueueCount(recipeId) {
    return this.getCraftQueue(recipeId)?.quantity || 0;
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
    st.autoProduce = !!enabled;
    this.save();
    if (enabled && this.getCraftQueueCount(recipeId) <= 0) {
      this.tryAutoProduce(recipeId);
    }
  }

  tryAutoProduce(recipeId) {
    const st = this.state.craftStations[recipeId];
    if (!st?.autoProduce) return false;
    return this.placeCraftOrder(recipeId, 1, { silent: true }) > 0;
  }

  /** 订单结束后释放该配方上的村民（计划人数保留，便于再下单后恢复） */
  releaseRecipeWorkersIfNoOrder(recipeId) {
    if (this.getCraftQueueCount(recipeId) > 0) return;
    const st = this.state.craftStations[recipeId];
    if (!st || !(st.assignedWorkers > 0)) return;
    this.state.workers.unassigned += st.assignedWorkers;
    st.assignedWorkers = 0;
  }

  /** 有新订单时，按计划人数尝试补岗 */
  restoreRecipeWorkersFromLayout(recipeId) {
    if (this.getCraftQueueCount(recipeId) <= 0) return;
    const st = this.state.craftStations[recipeId];
    if (!st) return;
    const planned = this.getWorkerLayoutCount('recipe', recipeId);
    while (st.assignedWorkers < planned && this.state.workers.unassigned > 0) {
      st.assignedWorkers++;
      this.state.workers.unassigned--;
    }
  }

  placeCraftOrder(recipeId, count = 1, { silent = false } = {}) {
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    count = Math.max(1, Math.floor(count));
    if (!recipe || !this.isRecipeTechUnlocked(recipeId)) return 0;
    if (!this.canAffordCraft(recipeId, count)) {
      if (!silent) this.showNotification('材料不足，无法生产');
      return 0;
    }
    this.spend(this.scaleCost(recipe.inputs, count));
    this.spendToolInputs(recipe.inputTools, count);
    if (!this.state.craftQueues) this.state.craftQueues = {};
    const queue = this.state.craftQueues[recipeId] || { quantity: 0, progress: 0 };
    queue.quantity += count;
    this.state.craftQueues[recipeId] = queue;
    this.restoreRecipeWorkersFromLayout(recipeId);
    this.state.activeStation = { type: 'recipe', id: recipeId };
    if (!silent) this.showNotification(`已加入生产：${recipe.name} ×${count}（材料已扣除）`);
    this.render();
    this.save();
    return count;
  }

  cancelCraftQueue(recipeId, count = 1) {
    const queue = this.getCraftQueue(recipeId);
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (!queue || !recipe || queue.quantity <= 0) return;

    count = Math.min(Math.max(1, Math.floor(count)), queue.quantity);
    Object.entries(this.scaleCost(recipe.inputs, count)).forEach(([res, amt]) => this.addResource(res, amt));
    this.refundToolInputs(recipe.inputTools, count);
    queue.quantity -= count;
    if (queue.quantity <= 0) {
      delete this.state.craftQueues[recipeId];
      this.releaseRecipeWorkersIfNoOrder(recipeId);
    }
    this.showNotification(`已取消：${recipe.name} ×${count}（材料已返还）`);
    this.render();
    this.save();
  }

  completeCraftUnit(recipeId, { silent = false } = {}) {
    const queue = this.getCraftQueue(recipeId);
    const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
    if (!queue || !recipe || queue.quantity <= 0) return;

    Object.entries(recipe.outputs || {}).forEach(([res, amt]) => this.addResource(res, amt));
    this.applyOutputTools(recipe.outputTools);
    queue.quantity -= 1;

    const st = this.state.craftStations[recipeId];
    if (st) this.startCooldown('recipe', recipeId);

    const autoProduce = st?.autoProduce;
    const remaining = queue.quantity;
    if (remaining <= 0) {
      delete this.state.craftQueues[recipeId];
    }

    if (!silent) {
      const parts = [];
      Object.entries(recipe.outputs || {}).forEach(([res, amt]) => {
        parts.push(`${GAME_DATA.resources[res]?.icon || res}×${amt}`);
      });
      this.forEachToolIO(recipe.outputTools, (toolId, level, amt) => {
        parts.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
      });
      const suffix = remaining > 0 ? `，剩余 ${remaining} 个` : '';
      this.showNotification(`生产完成：${recipe.name} → ${parts.join('、')}${suffix}`);
    }

    if (remaining <= 0) {
      if (autoProduce) this.tryAutoProduce(recipeId);
      this.releaseRecipeWorkersIfNoOrder(recipeId);
    }
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

  setToolCount(toolId, level, amount) {
    if (!GAME_DATA.villagerTools[toolId]) return;
    if (!this.state.toolInventory) this.state.toolInventory = {};
    if (!this.state.toolInventory[toolId] || typeof this.state.toolInventory[toolId] !== 'object') {
      this.state.toolInventory[toolId] = {};
    }
    const n = Math.max(0, Math.floor(amount));
    if (n <= 0) delete this.state.toolInventory[toolId][level];
    else this.state.toolInventory[toolId][level] = n;
  }

  addTool(toolId, amount = 1, level = 1) {
    if (!GAME_DATA.villagerTools[toolId]) return;
    const lv = Math.max(1, level || 1);
    this.setToolCount(toolId, lv, this.getToolCount(toolId, lv) + amount);
    if (amount > 0) this.checkAchievements();
  }

  getToolCount(toolId, level = null) {
    const stock = this.state.toolInventory?.[toolId];
    if (!stock || typeof stock !== 'object') return 0;
    if (level != null) return stock[level] || 0;
    return Object.values(stock).reduce((sum, n) => sum + (n || 0), 0);
  }

  getBestToolLevel(toolId) {
    const def = GAME_DATA.villagerTools[toolId];
    if (!def) return 0;
    const max = def.maxLevel || 3;
    for (let lv = max; lv >= 1; lv--) {
      if (this.getToolCount(toolId, lv) > 0) return lv;
    }
    return 0;
  }

  getToolSpeed(level) {
    const map = GAME_DATA.villagerWork.toolSpeedByLevel || {};
    return map[level] ?? GAME_DATA.villagerWork.tooledSpeed ?? 0.25;
  }

  canAffordToolInputs(inputTools, count = 1) {
    let ok = true;
    this.forEachToolIO(inputTools, (toolId, level, amt) => {
      if (this.getToolCount(toolId, level) < amt * count) ok = false;
    });
    return ok;
  }

  spendToolInputs(inputTools, count = 1) {
    this.forEachToolIO(inputTools, (toolId, level, amt) => {
      this.setToolCount(toolId, level, this.getToolCount(toolId, level) - amt * count);
    });
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
      partsIn.push(`${this.formatResourceIcon(r)}×${a}`);
    });
    this.forEachToolIO(recipe.inputTools, (toolId, level, amt) => {
      partsIn.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
    });
    const outs = [];
    Object.entries(recipe.outputs || {}).forEach(([r, a]) => outs.push(`${this.formatResourceIcon(r)}×${a}`));
    this.forEachToolIO(recipe.outputTools, (toolId, level, amt) => {
      outs.push(`${this.formatToolLabel(toolId, level)}×${amt}`);
    });
    return `${partsIn.join(' + ') || '？'} → ${outs.join(' + ') || '？'}`;
  }

  getCraftQueueBarState(recipeId) {
    const queue = this.getCraftQueue(recipeId);
    if (!queue || queue.quantity <= 0) {
      return { width: 0, isCooldown: false };
    }
    const onCooldown = this.isOnCooldown('recipe', recipeId);
    if (onCooldown) {
      return {
        width: this.getCooldownProgressPct('recipe', recipeId),
        isCooldown: true,
      };
    }
    const max = this.getMaxCount('recipe', recipeId);
    return {
      width: max > 0 ? Math.min(100, (queue.progress / max) * 100) : 0,
      isCooldown: false,
    };
  }

  isStationUnlocked(type, id) {
    if (type === 'point') {
      const pt = this.state.resourcePoints[id];
      if (!pt?.unlocked) return false;
      const def = GAME_DATA.resourcePoints[id];
      if (def?.isTreasureChest) return (pt.stock || 0) > 0;
      return true;
    }
    return this.isRecipeTechUnlocked(id);
  }

  isPointVisibleInSidebar(pointId) {
    const pt = this.state.resourcePoints[pointId];
    if (!pt?.unlocked) return false;
    return true;
  }

  isTreasureChestPoint(pointId) {
    return !!GAME_DATA.resourcePoints[pointId]?.isTreasureChest;
  }

  getChestDropRate() {
    const pt = this.state.resourcePoints.treasure_chest;
    if (!pt) return 0;
    const lv = pt.upgrades?.dropRate || 0;
    const { baseDropRate, dropRatePerLevel, maxDropRate } = GAME_DATA.treasureChest;
    return Math.min(maxDropRate, baseDropRate + lv * dropRatePerLevel);
  }

  getChestRewardTypeRange() {
    const lv = this.state.resourcePoints.treasure_chest?.upgrades?.rewardTypes || 0;
    const { baseRewardTypesMin, baseRewardTypesMax } = GAME_DATA.treasureChest;
    return {
      min: baseRewardTypesMin,
      max: baseRewardTypesMax + lv,
    };
  }

  getChestRewardAmountRange() {
    const lv = this.state.resourcePoints.treasure_chest?.upgrades?.rewardAmount || 0;
    const { baseRewardAmountMin, baseRewardAmountMax } = GAME_DATA.treasureChest;
    return {
      min: baseRewardAmountMin,
      max: baseRewardAmountMax + lv,
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
    if (!this.isTechUnlocked('unlock_treasure_chest')) return;
    const chestPt = this.state.resourcePoints.treasure_chest;
    if (!chestPt?.unlocked) return;

    if (Math.random() < this.getChestDropRate()) {
      chestPt.stock = (chestPt.stock || 0) + 1;
      this.showNotification('🎁 发现了宝箱！可前往宝箱资源点开启');
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

  isTechVisible(tech) {
    if (tech.requires && !this.isTechUnlocked(tech.requires)) return false;
    if (tech.id === 'unlock_offline_cap' && !this.hasOfflineIncome()) return false;
    if (tech.repeatable) {
      if (tech.maxRepeat) {
        const times = this.state.unlockedTech.filter(t => t === tech.id).length;
        if (times >= tech.maxRepeat) return true;
      }
      return true;
    }
    if (this.isTechUnlocked(tech.id)) return true;
    return Object.keys(tech.cost || {}).every(r => this.isResourceDiscovered(r));
  }

  getVisibleTechIds() {
    return GAME_DATA.techTree.filter(t => this.isTechVisible(t)).map(t => t.id);
  }

  isTechUnlocked(techId) {
    return this.state.unlockedTech.includes(techId);
  }

  isTechFullyComplete(tech) {
    if (tech.repeatable) {
      if (!tech.maxRepeat) return false;
      const times = this.state.unlockedTech.filter(t => t === tech.id).length;
      return times >= tech.maxRepeat;
    }
    return this.isTechUnlocked(tech.id);
  }

  canUnlockTech(tech) {
    if (tech.requires && !this.isTechUnlocked(tech.requires)) return false;
    if (!this.isTechVisible(tech)) return false;
    if (tech.id === 'unlock_offline_cap' && !this.hasOfflineIncome()) return false;
    if (tech.repeatable) {
      if (tech.maxRepeat) {
        const times = this.state.unlockedTech.filter(t => t === tech.id).length;
        if (times >= tech.maxRepeat) return false;
      }
      return this.canAfford(this.getTechCost(tech));
    }
    if (this.isTechUnlocked(tech.id)) return false;
    return this.canAfford(tech.cost);
  }

  formatUpgradeLevel(current, max) {
    return `Lv.${Math.max(0, current || 0)}/${Math.max(0, max || 0)}`;
  }

  getTechRepeatLevel(techOrId) {
    const id = typeof techOrId === 'string' ? techOrId : techOrId?.id;
    if (!id) return { current: 0, max: 0 };
    const tech = typeof techOrId === 'object' ? techOrId : GAME_DATA.techTree.find(t => t.id === id);
    const current = this.state.unlockedTech.filter(t => t === id).length;
    const max = tech?.maxRepeat || 0;
    return { current, max };
  }

  getTechCost(tech) {
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
    return (baseCapacity || 1) + (house?.level || 0) * (capacityPerLevel || 1);
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
    const cfg = GAME_DATA.housing;
    const built = Math.max(0, (this.state.houseBuildCount || 0) - (cfg.startingHouses || 0));
    return this.applyCostBump(cfg.buildBaseCost, built, cfg.buildCostBump);
  }

  getHouseUpgradeCost(targetLevel) {
    const cfg = GAME_DATA.housing.upgrades[targetLevel];
    if (!cfg) return null;
    const purchased = this.state.houseUpgradePurchases?.[targetLevel] || 0;
    return this.applyCostBump(cfg.baseCost, purchased, cfg.costBump);
  }

  canBuildHouse() {
    return this.canAfford(this.getHouseBuildCost());
  }

  buildHouse() {
    if (!this.canBuildHouse()) return;
    const cost = this.getHouseBuildCost();
    if (!this.spend(cost)) return;
    const id = `house_${this.state.nextHouseSeq++}`;
    this.state.houses.push({ id, level: 0 });
    this.state.houseBuildCount = (this.state.houseBuildCount || 0) + 1;
    this.showNotification(`建成新房屋（人口上限 ${this.getVillageCapacity()}）`);
    this.render();
    this.save();
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
    const house = this.getHousesByLevel(level)[0];
    return house ? this.canUpgradeHouse(house.id) : false;
  }

  canUpgradeHouse(houseId) {
    const house = (this.state.houses || []).find(h => h.id === houseId);
    if (!house) return false;
    const next = (house.level || 0) + 1;
    if (next > (GAME_DATA.housing.maxHouseLevel || 2)) return false;
    const cost = this.getHouseUpgradeCost(next);
    return !!cost && this.canAfford(cost);
  }

  upgradeHousesOfLevel(level, amount = 1) {
    const maxLv = GAME_DATA.housing.maxHouseLevel || 2;
    if (level >= maxLv) return;
    const times = Math.max(1, Math.floor(amount));
    let done = 0;
    while (done < times) {
      const house = this.getHousesByLevel(level)[0];
      if (!house || !this.canUpgradeHouse(house.id)) break;
      const next = (house.level || 0) + 1;
      const cost = this.getHouseUpgradeCost(next);
      if (!this.spend(cost)) break;
      house.level = next;
      if (!this.state.houseUpgradePurchases) this.state.houseUpgradePurchases = { 1: 0, 2: 0 };
      this.state.houseUpgradePurchases[next] = (this.state.houseUpgradePurchases[next] || 0) + 1;
      done++;
    }
    if (!done) return;
    const name = GAME_DATA.housing.upgrades[level + 1]?.name || `Lv.${level + 1}`;
    this.showNotification(
      done > 1
        ? `房屋升级 ×${done}：${name}（人口上限 ${this.getVillageCapacity()}）`
        : `房屋升级：${name}（人口上限 ${this.getVillageCapacity()}）`
    );
    this.render();
    this.save();
  }

  upgradeHouse(houseId) {
    const house = (this.state.houses || []).find(h => h.id === houseId);
    if (!house) return;
    this.upgradeHousesOfLevel(house.level || 0, 1);
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
      let supply = this.getToolCount(toolId, level);
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

  getStationAutoSpeed(type, id) {
    if (this.isVillagersResting()) return 0;
    const st = this.getStationState(type, id);
    const workers = st?.assignedWorkers || 0;
    if (workers <= 0) return 0;
    const { baseSpeed } = GAME_DATA.villagerWork;

    let speed;
    if (type !== 'point') {
      speed = workers * (GAME_DATA.villagerWork.baseSpeed || 0.05);
    } else {
      const assign = this.getStationToolAssignment(type, id);
      const bareSpeed = this.getPointBareWorkerSpeed(id);
      speed = assign.bare * bareSpeed;
      Object.entries(assign.byLevel).forEach(([level, count]) => {
        speed += count * this.getToolSpeed(Number(level));
      });
    }
    if (this.state.autoFactory) speed *= 2;
    speed *= this.getHungerWorkFactor();
    return speed;
  }

  /** 夜间休息：22:00–06:00 自动工作暂停（手动点击仍可用） */
  isVillagersResting() {
    const start = GAME_DATA.calendar?.restStartHour ?? 22;
    const end = GAME_DATA.calendar?.restEndHour ?? 6;
    const { hours } = this.getGameTimeOfDay();
    return hours >= start || hours < end;
  }

  /** 资源点徒手村民每人每秒进度（农场/牧场效率升级后提升） */
  getPointBareWorkerSpeed(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    const level = pt?.upgrades?.efficiency || 0;
    const byLevel = def?.efficiencySpeedByLevel;
    if (byLevel && level > 0 && byLevel[level] != null) return byLevel[level];
    return GAME_DATA.villagerWork.baseSpeed || 0.05;
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
    const amount = GAME_DATA.housing?.breedFoodCost ?? 10;
    return { food: amount };
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
      this.checkAchievements();
    }
    if (!this._suppressSounds) {
      if (born > 0) {
        this.showNotification(
          lost > 0
            ? `🐣 新生儿 +${born}（房屋不足，另有 ${lost} 未能入住）`
            : `🐣 新生儿 +${born}（现有 ${this.state.workers.total}/${this.getVillageCapacity()}）`
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
      const panel = document.getElementById('achievements-panel');
      if (panel && !panel.classList.contains('hidden')) this.renderAchievementsPanel();
      this.save();
    }
    return newly;
  }

  openAchievementsPanel() {
    this.checkAchievements(true);
    this.renderAchievementsPanel();
    document.getElementById('achievements-panel')?.classList.remove('hidden');
  }

  closeAchievementsPanel() {
    document.getElementById('achievements-panel')?.classList.add('hidden');
  }

  renderAchievementsPanel() {
    const listEl = document.getElementById('achievements-list');
    const summaryEl = document.getElementById('achievements-summary');
    if (!listEl) return;
    const list = GAME_DATA.achievements || [];
    const unlockedCount = list.filter(a => this.isAchievementUnlocked(a.id)).length;
    if (summaryEl) summaryEl.textContent = `已完成 ${unlockedCount} / ${list.length}`;

    listEl.innerHTML = '';
    list.forEach(ach => {
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
      listEl.appendChild(el);
    });
  }

  getDailyFoodNeed() {
    const per = GAME_DATA.calendar?.foodPerVillager ?? 1;
    return (this.state.workers.total || 0) * per;
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

  updateWarehouseFoodDrain() {
    const el = document.querySelector('.warehouse-item[data-res="food"]');
    if (!el || !el.classList.contains('discovered')) return;
    const need = this.getDailyFoodNeed();
    const food = this.state.resources.food || 0;
    const hungry = this.getHungryCount();
    el.classList.toggle('food-low', food < need || hungry > 0);
    let sub = el.querySelector('.warehouse-food-drain');
    if (!sub) {
      sub = document.createElement('span');
      sub.className = 'warehouse-food-drain';
      el.appendChild(sub);
    }
    sub.textContent = hungry > 0
      ? `今日预计消耗 ${this.formatNumber(need)} · 饥饿 ${hungry}`
      : `今日预计消耗 ${this.formatNumber(need)}`;
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
    const pt = this.state.resourcePoints[pointId];
    if (!def?.efficiencyUpgradeBuilds) return null;
    const lv = level !== null ? level : (pt?.upgrades?.efficiency || 0);
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
    while (this.state.dayProgress >= dayMs) {
      this.state.dayProgress -= dayMs;
      lastNeed = this.getDailyFoodNeed();
      const result = this.resolveEndOfDay(true);
      starvedTotal += result.deaths;
      lastHungry = result.hungry;
      daysPassed++;
    }

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
    if (starvedTotal > 0) {
      const hungryHint = lastHungry > 0 ? `，另有 ${lastHungry} 人处于饥饿` : '';
      this.showNotification(`跨日结算：饿死 ${starvedTotal} 名村民${hungryHint}（现第 ${this.state.day} 天）`);
    } else if (lastHungry > 0 && daysPassed === 1) {
      this.showNotification(`第 ${endedDay} 天：食物不足，${lastHungry} 名村民陷入饥饿（工作效率减半）`);
    } else if (daysPassed === 1) {
      this.showNotification(`第 ${endedDay} 天结束，消耗食物 ${lastNeed}`);
    }
  }

  /**
   * 日结扣粮：不够吃的村民陷入饥饿；若已处于饥饿再缺粮则饿死。
   * @returns {{ deaths: number, hungry: number }}
   */
  resolveEndOfDay(quiet = false) {
    const need = this.getDailyFoodNeed();
    const have = this.state.resources.food || 0;
    const spend = Math.min(have, need);
    this.state.resources.food = have - spend;
    const deficit = need - spend;
    this.state.day = (this.state.day || 1) + 1;

    const prevHungry = this.getHungryCount();
    let deaths = 0;
    let hungry = 0;

    if (deficit <= 0) {
      this.state.hungryCount = 0;
    } else {
      // 连续第二次缺粮的原饥饿村民 → 死亡；其余缺粮村民进入/保持饥饿
      deaths = Math.min(deficit, prevHungry);
      hungry = deficit - deaths;
      if (deaths > 0) this.applyStarvation(deaths);
      this.state.hungryCount = Math.min(hungry, this.state.workers.total || 0);
      hungry = this.getHungryCount();
    }

    this.resolvePendingBreeds();

    if (!quiet && !this._suppressSounds) {
      if (deaths > 0) {
        this.showNotification(
          hungry > 0
            ? `食物不足！连续饥饿饿死 ${deaths} 人，另有 ${hungry} 人陷入饥饿`
            : `食物不足！连续饥饿饿死 ${deaths} 名村民`
        );
      } else if (hungry > 0) {
        this.showNotification(`食物不足：${hungry} 名村民陷入饥饿（工作效率减半）`);
      }
    }
    return { deaths, hungry };
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
        ...GAME_DATA.recipes.map(r => ({ type: 'recipe', id: r.id })),
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

    this.state.workers.total = Math.max(0, (this.state.workers.total || 0) - killed);
    if (this.state.workers.unassigned > this.state.workers.total) {
      this.state.workers.unassigned = this.state.workers.total;
    }
    this.state.hungryCount = Math.min(this.state.hungryCount || 0, this.state.workers.total || 0);
    if ((this.state.pendingBreeds || 0) > 0) {
      const slots = Math.max(0, this.getVillageCapacity() - (this.state.workers?.total || 0));
      this.state.pendingBreeds = Math.min(this.state.pendingBreeds, slots);
    }
    return killed;
  }

  // ========== 速度与离线 ==========
  getOfflineCapMinutes() {
    if (!this.hasOfflineIncome()) return 0;
    const { baseMinutes, perLevelMinutes, maxMinutes, maxLevel } = GAME_DATA.offline;
    const level = Math.min(
      this.state.unlockedTech.filter(t => t === 'unlock_offline_cap').length,
      maxLevel
    );
    return Math.min(maxMinutes, baseMinutes + level * perLevelMinutes);
  }

  hasOfflineIncome() {
    return (this.state.workers?.total || 0) > 0;
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
  canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([res, amt]) => (this.state.resources[res] || 0) >= amt);
  }

  spend(cost) {
    if (!this.canAfford(cost)) return false;
    Object.entries(cost).forEach(([res, amt]) => { this.state.resources[res] -= amt; });
    return true;
  }

  addResource(res, amount) {
    if (GAME_DATA.resources[res]) {
      this.state.resources[res] = (this.state.resources[res] || 0) + amount;
      this.checkAchievements();
    }
  }

  getPointRefineLevel(pointId) {
    return this.state.resourcePoints[pointId]?.upgrades?.double || 0;
  }

  getPointMiningMultiplier(pointId) {
    return this.state.resourcePoints[pointId]?.miningMultiplier || 1;
  }

  getHarvestYield(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def || def.isTreasureChest) return 0;
    const refine = this.getPointRefineLevel(pointId);
    const miningMult = this.getPointMiningMultiplier(pointId);
    return (1 + refine) * miningMult * (def.baseYield || 1);
  }

  getCountUpgradeRatio(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || !pt) return 1;
    const level = pt.upgrades.count || 0;
    const maxLevel = def.maxUpgrades.count || 10;
    const finalRatio = GAME_DATA.pointUpgradeMeta.count.finalMaxCountRatio;
    if (maxLevel <= 0) return 1;
    return Math.pow(finalRatio, level / maxLevel);
  }

  getCooldownUpgradeRatio(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || !pt) return 1;
    const level = pt.upgrades.cooldown || 0;
    const maxLevel = def.maxUpgrades.cooldown || 10;
    const finalRatio = GAME_DATA.pointUpgradeMeta.cooldown.finalCooldownRatio;
    if (maxLevel <= 0) return 1;
    return Math.pow(finalRatio, level / maxLevel);
  }

  getMaxCount(type, id) {
    const def = this.getStationDef(type, id);
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
    return def.baseCooldown * this.getCooldownUpgradeRatio(id);
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
    return this.getStationState(type, id).cooldownRemaining > 0;
  }

  getCooldownProgressPct(type, id) {
    const st = this.getStationState(type, id);
    if (!st || st.cooldownRemaining <= 0) return 0;
    const max = this.getCooldownDuration(type, id);
    if (max <= 0) return 0;
    const remaining = Math.min(st.cooldownRemaining, max);
    return Math.min(100, Math.max(0, ((max - remaining) / max) * 100));
  }

  applyProgressBar(bar, { width, isCooldown }) {
    if (!bar) return;
    bar.style.width = `${width}%`;
    bar.classList.toggle('cooldown', isCooldown);
  }

  canManualCraftClick(type, id) {
    if (type !== 'recipe') return false;
    if (!this.isRecipeTechUnlocked(id)) return false;
    const queue = this.getCraftQueue(id);
    if (!queue || queue.quantity <= 0) return false;
    if (this.isOnCooldown('recipe', id)) return false;
    return true;
  }

  addCraftQueueProgress(recipeId, amount) {
    const queue = this.getCraftQueue(recipeId);
    if (!queue || queue.quantity <= 0 || amount <= 0) return 0;

    const st = this.state.craftStations[recipeId];
    if (!st || st.cooldownRemaining > 0) return 0;

    queue.progress += amount;

    let completed = 0;
    while (completed < 20) {
      const current = this.getCraftQueue(recipeId);
      if (!current?.quantity || st.cooldownRemaining > 0) break;
      const max = this.getMaxCount('recipe', recipeId);
      if (current.progress < max) break;
      current.progress -= max;
      this.completeCraftUnit(recipeId, { silent: completed > 0 });
      completed++;
    }
    return completed;
  }

  // ========== 点击与自动进度 ==========
  clickStation(type, id) {
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

    const power = this.getClickPower(type, id);
    st.currentCount += power;
    this.state.totalClicks += power;

    if (st.currentCount >= this.getMaxCount(type, id)) {
      const max = this.getMaxCount(type, id);
      let safety = 0;
      while (st.currentCount >= max && safety < 20) {
        if (this.isOnCooldown(type, id)) break;
        const overflow = st.currentCount - max;
        if (!this.tryCompleteStation(type, id)) break;
        st.currentCount = overflow;
        safety++;
      }
      if (safety > 0) {
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

  tryCompleteStation(type, id) {
    const st = this.getStationState(type, id);
    const maxCount = this.getMaxCount(type, id);
    if (st.currentCount < maxCount) return false;

    if (type === 'point') {
      this.harvestResource(id);
      return true;
    }
    return false;
  }

  harvestResource(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];

    if (def.isTreasureChest) {
      if ((pt.stock || 0) <= 0) return;
      this.startCooldown('point', pointId);
      let rewards;
      if (pt.nextOpenPreset === 'starter_axe') {
        rewards = this.getStarterAxeChestRewards();
        delete pt.nextOpenPreset;
        if (this.state.tutorial) this.state.tutorial.starterChestOpened = true;
      } else {
        rewards = this.rollChestRewards();
      }
      pt.stock--;
      pt.currentCount = 0;
      this.playChestOpenComplete(() => {
        if (!this._suppressSounds) this.sounds.playHarvest('chest');
        rewards.forEach(({ res, amt }) => this.addResource(res, amt));
        const parts = rewards.map(({ res, amt }) => {
          const r = GAME_DATA.resources[res];
          return `${r?.icon || ''} ${r?.name || res} ×${amt}`;
        });
        this.showNotification(`宝箱开启：获得 ${parts.join('、')}`);
        this.resetChestVisualAfterOpen();
        this.render();
        this.save();
      });
      return;
    }

    const yieldAmount = this.getHarvestYield(pointId);

    this.addResource(def.resource, yieldAmount);
    if (pointId === 'berry_bush' && this.state.tutorial && !this.state.tutorial.completed) {
      this.state.tutorial.berryHarvests = (this.state.tutorial.berryHarvests || 0) + yieldAmount;
    }
    pt.currentCount = 0;
    this.startCooldown('point', pointId);
    if (!this._suppressSounds) this.sounds.playHarvest(def.resource);
    const resDef = GAME_DATA.resources[def.resource];
    this.showNotification(`获得 ${resDef.icon} ${resDef.name} ×${yieldAmount}`);
    this.tryGrantStarterChest(pointId);
    const starterAt = GAME_DATA.starterChest?.afterForestHarvests ?? 2;
    if (!(pointId === 'forest' && this.state.forestHarvestCount === starterAt)) {
      this.tryChestDrop(pointId);
    }
    this.render();
  }

  processCraftOrderProgress(dt) {
    const seconds = dt / 1000;
    GAME_DATA.recipes.forEach(recipe => {
      const recipeId = recipe.id;
      if (!this.isRecipeTechUnlocked(recipeId)) return;

      const queue = this.getCraftQueue(recipeId);
      if (!queue || queue.quantity <= 0) return;

      const st = this.state.craftStations[recipeId];
      if (!st || st.cooldownRemaining > 0) return;

      const workers = st.assignedWorkers || 0;
      if (workers <= 0) return;

      const speed = this.getStationAutoSpeed('recipe', recipeId);
      const completed = this.addCraftQueueProgress(recipeId, speed * seconds);
      if (completed > 0) {
        this.render();
        this.save();
      }
    });
  }

  addProgress(type, id, amount) {
    if (type === 'recipe') return;
    const st = this.getStationState(type, id);
    if (!st || !this.isStationUnlocked(type, id) || this.isOnCooldown(type, id)) return;

    st.currentCount += amount;
    const max = this.getMaxCount(type, id);
    let safety = 0;
    while (st.currentCount >= max && safety < 100) {
      if (this.isOnCooldown(type, id)) break;
      const overflow = st.currentCount - max;
      if (!this.tryCompleteStation(type, id)) break;
      st.currentCount = overflow;
      safety++;
    }
  }

  processAutoProgress(dt) {
    const seconds = dt / 1000;
    Object.keys(GAME_DATA.resourcePoints).forEach(id => {
      if (GAME_DATA.resourcePoints[id]?.isTreasureChest) return;
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
      this.sounds.playRecovery();
    }
  }

  applyOfflineProgress() {
    if (!this.hasOfflineIncome()) return;

    const last = this.state.lastSaveTime || Date.now();
    const elapsed = Date.now() - last;
    const cap = this.getOfflineCapMinutes() * 60 * 1000;
    const effective = Math.min(elapsed, cap);
    if (effective < 1000) return;

    this.simulateTime(effective);

    const mins = (effective / 60000).toFixed(1);
    this.showNotification(`离线收益已结算（${mins} 分钟）`);
    this.save();
  }

  runGameSimulation(dt) {
    if (dt <= 0) return;
    const step = 200;
    let remaining = dt;
    while (remaining > 0) {
      const chunk = Math.min(step, remaining);
      this.processCooldowns(chunk);
      this.processAutoProgress(chunk);
      this.processCalendar(chunk);
      remaining -= chunk;
    }
  }

  tickGame() {
    const now = Date.now();
    const dt = Math.max(0, (now - this.lastTick) * (this.timeScale || this.devTimeScale || 1));
    this.lastTick = now;
    if (dt > 0) this.runGameSimulation(dt);
    this.renderTick();
    this.renderGlobalStats();
    if (this.isTutorialActive()) {
      const step = this.getTutorialStep();
      if (step && !step.requireNext && !step.finishOnNext && this.isTutorialStepComplete(step)) {
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
  }

  // ========== 科技解锁 ==========
  unlockTech(techId) {
    const tech = GAME_DATA.techTree.find(t => t.id === techId);
    if (!tech || !this.canUnlockTech(tech)) return;

    const visibleBefore = new Set(this.getVisibleTechIds());
    const cost = this.getTechCost(tech);
    if (!this.spend(cost)) return;

    this.state.unlockedTech.push(techId);

    if (techId === 'unlock_auto_factory') this.state.autoFactory = true;

    const newResourcePoints = [];
    const newPointIds = [];
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (def.unlockRequires === techId) {
        this.unlockResourcePoint(id);
        newResourcePoints.push(def);
        newPointIds.push(id);
      }
    });
    const newRecipeIds = GAME_DATA.recipes
      .filter(r => r.requires === techId)
      .map(r => r.id);

    const newlyVisible = this.getVisibleTechIds().filter(id => !visibleBefore.has(id) && id !== techId);
    if (!this._suppressSounds) this.sounds.playUnlock();
    this.showUnlockToast(tech, newlyVisible, newResourcePoints);
    this.queueUnlockHighlights({ pointIds: newPointIds, recipeIds: newRecipeIds });
    this.render();
    this.scrollUnlockHighlightsIntoView();
    this.save();
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
      tabs.add(recipe.isToolRecipe ? 'tools' : 'craft');
    });

    this._unlockFlash = {
      until: Date.now() + 2800,
      points: new Set(pointIds),
      recipes: new Set(recipeIds),
      sections,
      tabs,
    };

    // 制作项解锁时切到对应页，便于看到条目高亮
    if (tabs.has('craft')) this.state.activeTab = 'craft';
    else if (tabs.has('tools')) this.state.activeTab = 'tools';

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
    const scale = pt.upgradeCostScale || { countCd: 1, refine: 1, refineBumps: 0 };
    if (type === 'double') return scale.refine || 1;
    return scale.countCd || 1;
  }

  getPointRefineCostBumps(pointId) {
    return this.state.resourcePoints[pointId]?.upgradeCostScale?.refineBumps || 0;
  }

  getPointBaseUpgradeCosts(pointId, type) {
    const def = GAME_DATA.resourcePoints[pointId];
    if (!def) return [];
    if (def.isTreasureChest) return GAME_DATA.chestUpgradeCosts[type] || [];
    return def.upgradeCosts?.[type] || [];
  }

  applyRefineCostBump(amount, bumps) {
    const cfg = GAME_DATA.pointUpgradeMeta.refineCostBump || { mult: 1.2, add: 5 };
    const mult = cfg.mult ?? 1.2;
    const add = cfg.add ?? 5;
    let amt = amount;
    for (let i = 0; i < bumps; i++) {
      amt = amt * mult + add;
    }
    return Math.max(1, Math.round(amt));
  }

  scaleUpgradeCost(cost, scale, refineBumps = 0) {
    if (!cost) return cost;
    const scaled = {};
    Object.entries(cost).forEach(([res, amt]) => {
      let value = amt * (scale || 1);
      if (refineBumps > 0) value = this.applyRefineCostBump(value, refineBumps);
      else value = Math.max(1, Math.round(value));
      scaled[res] = Math.max(1, value);
    });
    return scaled;
  }

  getPointUpgradeCost(pointId, type, level = null) {
    if (type === 'efficiency') return this.getEfficiencyUpgradeCost(pointId, level);
    const costs = this.getPointBaseUpgradeCosts(pointId, type);
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    const lv = level !== null ? level : (pt?.upgrades?.[type] || 0);
    const base = costs[lv];
    if (!base) return null;
    if (def?.isTreasureChest) return { ...base };
    const refineBumps = (type === 'count' || type === 'cooldown') ? this.getPointRefineCostBumps(pointId) : 0;
    return this.scaleUpgradeCost(base, this.getPointUpgradeCostScale(pointId, type), refineBumps);
  }

  getPointUpgradeCosts(pointId, type) {
    if (type === 'efficiency') {
      const def = GAME_DATA.resourcePoints[pointId];
      const builds = def?.efficiencyUpgradeBuilds || [];
      return builds.map((_, i) => this.getEfficiencyUpgradeCost(pointId, i));
    }
    const costs = this.getPointBaseUpgradeCosts(pointId, type);
    const def = GAME_DATA.resourcePoints[pointId];
    if (def?.isTreasureChest) return costs;
    const scale = this.getPointUpgradeCostScale(pointId, type);
    const refineBumps = (type === 'count' || type === 'cooldown') ? this.getPointRefineCostBumps(pointId) : 0;
    return costs.map(c => this.scaleUpgradeCost(c, scale, refineBumps));
  }

  bumpPointUpgradeCostScale(pointId, { countCd = false, refine = false, factor = 1 } = {}) {
    const pt = this.state.resourcePoints[pointId];
    if (!pt || factor <= 1) return;
    if (!pt.upgradeCostScale) pt.upgradeCostScale = { countCd: 1, refine: 1, refineBumps: 0 };
    if (countCd) pt.upgradeCostScale.countCd = (pt.upgradeCostScale.countCd || 1) * factor;
    if (refine) pt.upgradeCostScale.refine = (pt.upgradeCostScale.refine || 1) * factor;
  }

  bumpPointRefineCost(pointId) {
    const pt = this.state.resourcePoints[pointId];
    if (!pt) return;
    if (!pt.upgradeCostScale) pt.upgradeCostScale = { countCd: 1, refine: 1, refineBumps: 0 };
    pt.upgradeCostScale.refineBumps = (pt.upgradeCostScale.refineBumps || 0) + 1;
  }

  canUpgradeRefine(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || def.isTreasureChest || !pt) return false;
    return pt.upgrades.count >= def.maxUpgrades.count
      && pt.upgrades.cooldown >= def.maxUpgrades.cooldown;
  }

  canUpgradePoint(pointId, type) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || !pt) return false;
    if (def.isTreasureChest) {
      if (pt.upgrades[type] >= def.maxUpgrades[type]) return false;
      return this.canAfford(GAME_DATA.chestUpgradeCosts[type][pt.upgrades[type]]);
    }
    if (pt.upgrades[type] >= def.maxUpgrades[type]) return false;
    if (type === 'double' && !this.canUpgradeRefine(pointId)) return false;
    if (type === 'efficiency' && !(def.maxUpgrades?.efficiency > 0)) return false;
    const cost = this.getPointUpgradeCost(pointId, type);
    return !!cost && this.canAfford(cost);
  }

  canPrestigePoint(pointId) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || def.isTreasureChest || !pt) return false;
    if (!(def.maxUpgrades?.count > 0)) return false;
    return pt.upgrades.count >= def.maxUpgrades.count
      && pt.upgrades.cooldown >= def.maxUpgrades.cooldown
      && pt.upgrades.double >= def.maxUpgrades.double;
  }

  prestigePoint(pointId) {
    if (!this.canPrestigePoint(pointId)) return;
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    const mult = GAME_DATA.pointUpgradeMeta.prestigeMultiplier || 2;
    const costBump = GAME_DATA.pointUpgradeMeta.prestigeCostBump || mult;
    pt.upgrades.count = 0;
    pt.upgrades.cooldown = 0;
    pt.upgrades.double = 0;
    pt.currentCount = 0;
    pt.cooldownRemaining = 0;
    pt.cooldownTotal = 0;
    pt.miningMultiplier = (pt.miningMultiplier || 1) * mult;
    this.bumpPointUpgradeCostScale(pointId, { countCd: true, refine: true, factor: costBump });
    this.showNotification(`${def.name}：精炼重置完成，开采倍率 ×${pt.miningMultiplier}，单次采集 ${this.getHarvestYield(pointId)}`);
    this.render();
    this.save();
  }

  upgradePoint(pointId, type, amount = 1) {
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    if (!def || !pt) return;

    const times = Math.max(1, Math.floor(amount));
    let done = 0;
    for (let i = 0; i < times; i++) {
      if (!this.canUpgradePoint(pointId, type)) break;
      if (def.isTreasureChest) {
        if (!this.spend(GAME_DATA.chestUpgradeCosts[type][pt.upgrades[type]])) break;
      } else {
        const cost = this.getPointUpgradeCost(pointId, type);
        if (!cost || !this.spend(cost)) break;
      }
      pt.upgrades[type]++;
      done++;
      if (!def.isTreasureChest && type === 'double') {
        pt.upgrades.count = 0;
        pt.currentCount = 0;
        this.bumpPointRefineCost(pointId);
      }
    }
    if (!done) return;

    const chestNames = {
      dropRate: '宝箱爆率',
      rewardTypes: '奖励种类',
      rewardAmount: '奖励数量',
    };
    const names = { count: '采集升级', cooldown: '资源恢复', double: '资源精炼', efficiency: '村民效率', ...chestNames };
    this.showNotification(
      done > 1
        ? `${def.name}：${names[type]} +${done} → Lv.${pt.upgrades[type]}`
        : `${def.name}：${names[type]} Lv.${pt.upgrades[type]}`
    );
    this.render();
    this.save();
  }

  stationKey(type, id) {
    return `${type}:${id}`;
  }

  syncWorkerLayoutFromAssignments() {
    if (!this.state.workerLayout) this.state.workerLayout = {};
    this.getAllUnlockedStations().forEach(({ type, id }) => {
      const key = this.stationKey(type, id);
      this.state.workerLayout[key] = this.getStationState(type, id).assignedWorkers || 0;
    });
  }

  getWorkerLayoutCount(type, id) {
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
      this.getStationState(type, id).assignedWorkers = 0;
    });
    this.state.workers.unassigned = this.state.workers.total;
    this.showNotification('已收回全部村民，分配方案已保留');
    this.render();
    this.save();
  }

  applyWorkerLayout() {
    if (!this.hasSavedWorkerLayout()) return;

    this.getAllUnlockedStations().forEach(({ type, id }) => {
      this.getStationState(type, id).assignedWorkers = 0;
    });
    this.state.workers.unassigned = this.state.workers.total;

    this.getAllUnlockedStations().forEach(({ type, id }) => {
      if (type === 'recipe' && this.getCraftQueueCount(id) <= 0) return;
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
    const st = this.getStationState(type, id);
    const cap = this.getStationWorkerCap(type, id);
    const planned = Math.max(st.assignedWorkers || 0, this.getWorkerLayoutCount(type, id));
    if (Number.isFinite(cap) && planned >= cap) return false;
    if (this.state.workers.unassigned > 0) return true;
    return this.getTotalPlannedWorkers() < this.state.workers.total;
  }

  canDecreaseWorkerAllocation(type, id) {
    const st = this.getStationState(type, id);
    return st.assignedWorkers > 0 || this.getWorkerLayoutCount(type, id) > 0;
  }

  getBulkMultiplier(event) {
    return event?.ctrlKey ? 10 : 1;
  }

  changeWorkerAllocationStep(type, id, delta) {
    const st = this.getStationState(type, id);
    const key = this.stationKey(type, id);
    if (!this.state.workerLayout) this.state.workerLayout = {};
    const cap = this.getStationWorkerCap(type, id);

    if (delta > 0) {
      const planned = Math.max(st.assignedWorkers || 0, this.getWorkerLayoutCount(type, id));
      if (Number.isFinite(cap) && planned >= cap) return false;
      if (this.state.workers.unassigned > 0) {
        st.assignedWorkers++;
        this.state.workers.unassigned--;
        this.state.workerLayout[key] = st.assignedWorkers;
        return true;
      }
      if (this.getTotalPlannedWorkers() < this.state.workers.total) {
        this.state.workerLayout[key] = this.getWorkerLayoutCount(type, id) + 1;
        return true;
      }
      return false;
    }

    if (delta < 0) {
      if (st.assignedWorkers > 0) {
        st.assignedWorkers--;
        this.state.workers.unassigned++;
        this.state.workerLayout[key] = st.assignedWorkers;
        return true;
      }
      const layout = this.getWorkerLayoutCount(type, id);
      if (layout > 0) {
        this.state.workerLayout[key] = layout - 1;
        return true;
      }
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
    this._gameLoopTimer = setInterval(() => this.tickGame(), 100);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.tickGame();
    });
    setInterval(() => this.save(), 10000);
  }

  // ========== UI 事件 ==========
  setupEventListeners() {
    this.setupGameMenu();
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    document.getElementById('defense-intro-ok')?.addEventListener('click', () => this.dismissDefenseIntro());
    document.getElementById('tutorial-skip')?.addEventListener('click', () => this.skipTutorial());
    document.getElementById('tutorial-next')?.addEventListener('click', () => this.advanceTutorialStep());

    this.setupHoldClick();
    this.setupEventDelegation();
    this.setupDevPanel();
    document.getElementById('app').addEventListener('change', (e) => {
      if (e.target.classList.contains('craft-auto-produce')) {
        this.setAutoProduce(e.target.dataset.recipeId, e.target.checked);
        this.renderCraftOverview();
        this.renderTools();
      }
    });
  }

  setupGameMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const dropdown = document.getElementById('menu-dropdown');
    const resetItem = document.getElementById('menu-reset');

    const closeMenu = () => {
      dropdown.classList.add('hidden');
      menuBtn.classList.remove('active');
    };

    const toggleMenu = () => {
      const open = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden', !open);
      menuBtn.classList.toggle('active', open);
    };

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    resetItem.addEventListener('click', () => {
      closeMenu();
      this.reset();
    });

    document.getElementById('menu-achievements')?.addEventListener('click', () => {
      closeMenu();
      this.openAchievementsPanel();
    });
    document.getElementById('achievements-close')?.addEventListener('click', () => this.closeAchievementsPanel());
    document.getElementById('achievements-panel')?.addEventListener('click', (e) => {
      if (e.target.id === 'achievements-panel') this.closeAchievementsPanel();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.game-menu')) closeMenu();
    });
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
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.toggleDevPanel();
        return;
      }
      if (e.key === 'Escape') {
        if (!document.getElementById('dev-picker').classList.contains('hidden')) {
          this.closeDevPicker();
        } else {
          this.toggleDevPanel(false);
        }
      }
    });

    document.getElementById('dev-close').addEventListener('click', () => this.toggleDevPanel(false));

    const scaleSlider = document.getElementById('dev-time-scale');
    const scaleLabel = document.getElementById('dev-time-label');
    scaleSlider.max = 10;
    scaleSlider.addEventListener('input', () => {
      this.setDevTimeScale(Number(scaleSlider.value));
      scaleLabel.textContent = `${this.devTimeScale}×`;
    });

    document.querySelectorAll('[data-time-scale]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.timeScale);
        scaleSlider.value = v;
        this.setDevTimeScale(v);
        scaleLabel.textContent = `${v}×`;
      });
    });

    document.getElementById('dev-unlock-resources').addEventListener('click', () => this.showDevResourcePicker());
    document.getElementById('dev-unlock-stations').addEventListener('click', () => this.showDevStationPicker());
    document.getElementById('dev-unlock-tech').addEventListener('click', () => this.showDevTechPicker());
    document.getElementById('dev-add-all-100').addEventListener('click', () => this.devAddAllResources(100));
    document.getElementById('dev-add-all-1000').addEventListener('click', () => this.devAddAllResources(1000));
    document.getElementById('dev-workers-10').addEventListener('click', () => this.devAddWorkers(10));
    document.getElementById('dev-chest-1').addEventListener('click', () => this.devAddChests(1));
    document.getElementById('dev-chest-10').addEventListener('click', () => this.devAddChests(10));
    document.getElementById('dev-simulate-1h').addEventListener('click', () => this.devSimulateOffline(3600000));

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
      '须按科技树顺序逐项解锁，当前仅高亮项可点击',
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
    const times = this.state.unlockedTech.filter(t => t === tech.id).length;
    return times > 0;
  }

  getNextDevTechIndex() {
    return GAME_DATA.techTree.findIndex((tech, index) => {
      if (this.isTechSlotComplete(index)) return false;
      for (let j = 0; j < index; j++) {
        if (!this.isTechSlotComplete(j)) return false;
      }
      if (tech.requires && !this.isTechUnlocked(tech.requires)) return false;
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

    if (techId === 'unlock_auto_factory') this.state.autoFactory = true;

    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (def.unlockRequires === techId) this.unlockResourcePoint(id);
    });

    this.showNotification(`[Dev] 解锁科技：${tech.name}`);
    this.render();
    this.save();
  }

  devUnlockAllTechInOrder() {
    let count = 0;
    let safety = 0;
    while (safety < 200) {
      const idx = this.getNextDevTechIndex();
      if (idx < 0) break;
      this.devApplyTechUnlock(GAME_DATA.techTree[idx].id);
      count++;
      safety++;
    }
    this.showNotification(`[Dev] 按顺序解锁了 ${count} 项科技`);
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
    const pt = this.state.resourcePoints.treasure_chest;
    if (!pt) return;
    pt.stock = (pt.stock || 0) + n;
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
    this.devTimeScale = Math.max(1, Math.min(10, scale));
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

  devSimulateOffline(ms) {
    this.simulateTime(ms);
    this.showNotification(`[Dev] 模拟推进 ${(ms / 60000).toFixed(0)} 分钟`);
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
          if (Number.isFinite(level)) this.upgradeHousesOfLevel(level, mult);
          else if (upgradeBtn.dataset.houseId) this.upgradeHouse(upgradeBtn.dataset.houseId);
          return;
        }
        const upgItem = upgradeBtn.closest('[data-point-id][data-upgrade-type]');
        if (upgItem) {
          this.upgradePoint(upgItem.dataset.pointId, upgItem.dataset.upgradeType, mult);
          return;
        }
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

      const prestigeBtn = e.target.closest('.btn-point-prestige');
      if (prestigeBtn) {
        this.prestigePoint(prestigeBtn.dataset.pointId);
        return;
      }

      const stationBtn = e.target.closest('.station-btn');
      if (stationBtn) {
        this.setActiveStation(stationBtn.dataset.stationType, stationBtn.dataset.stationId);
        return;
      }

      const assignBtn = e.target.closest('.btn-worker-assign');
      if (assignBtn && !assignBtn.disabled) {
        const mult = this.getBulkMultiplier(e);
        this.assignWorker(assignBtn.dataset.stationType, assignBtn.dataset.stationId, mult);
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

      const produceConfirmBtn = e.target.closest('.btn-craft-produce-confirm');
      if (produceConfirmBtn && !produceConfirmBtn.disabled) {
        const item = produceConfirmBtn.closest('[data-recipe-id]');
        const input = item?.querySelector('.craft-produce-input');
        const count = Math.max(1, parseInt(input?.value, 10) || 1) * this.getBulkMultiplier(e);
        this.placeCraftOrder(produceConfirmBtn.dataset.recipeId, count);
        return;
      }

      const cancelAllBtn = e.target.closest('.btn-cancel-all-order');
      if (cancelAllBtn) {
        const recipeId = cancelAllBtn.dataset.recipeId;
        this.cancelCraftQueue(recipeId, this.getCraftQueueCount(recipeId));
        return;
      }

      const cancelOrderBtn = e.target.closest('.btn-cancel-order');
      if (cancelOrderBtn) {
        this.cancelCraftQueue(cancelOrderBtn.dataset.recipeId, this.getBulkMultiplier(e));
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
    const stopHold = () => {
      this.holdClicking = false;
      if (this.holdTimer) { clearInterval(this.holdTimer); this.holdTimer = null; }
    };
    const tryClick = () => {
      const { type, id } = this.state.activeStation;
      if (type === 'recipe') {
        if (!this.canManualCraftClick(type, id)) {
          stopHold();
          return false;
        }
      } else if (!this.isStationUnlocked(type, id) || this.isOnCooldown(type, id)) {
        stopHold();
        return false;
      }
      this.clickStation(type, id);
      return true;
    };
    const startHold = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const { type, id } = this.state.activeStation;
      if (type === 'recipe') {
        if (!this.canManualCraftClick(type, id)) return;
      } else if (this.isOnCooldown(type, id)) return;
      e.preventDefault();
      stopHold();
      this.holdClicking = true;
      tryClick();
      this.holdTimer = setInterval(() => {
        if (!this.holdClicking) return stopHold();
        if (!tryClick()) stopHold();
      }, this.getHoldClickCooldownMs());
    };
    area.addEventListener('mousedown', startHold);
    area.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(e); }, { passive: false });
    document.addEventListener('mouseup', stopHold);
    document.addEventListener('touchend', stopHold);
    document.addEventListener('touchcancel', stopHold);
    area.addEventListener('mouseleave', stopHold);
  }

  showNotification(msg) {
    const el = document.getElementById('notification');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  updateUnlockToastPosition() {
    const sidebar = document.querySelector('.sidebar.right');
    const container = document.getElementById('unlock-toast-container');
    if (!sidebar || !container) return;

    const rect = sidebar.getBoundingClientRect();
    const gap = 10;
    const width = 200;
    const rightSpace = window.innerWidth - rect.right;

    if (rightSpace >= width + gap) {
      container.style.left = `${rect.right + gap}px`;
      container.style.right = 'auto';
    } else {
      container.style.left = 'auto';
      container.style.right = `${Math.max(12, window.innerWidth - rect.left + gap)}px`;
    }

    const header = document.querySelector('.game-header');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 72;
    container.style.top = `${Math.max(headerBottom + 8, rect.top)}px`;
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
        const where = r.isToolRecipe ? '工具页' : '合成页';
        extras.push(`${r.icon} 配方已解锁：${r.name}（前往${where}安排生产）`);
      }
    });
    if (tech.id === 'unlock_furnace_upgrade') extras.push('🔥 熔炉配方计数值减半');
    if (tech.id === 'unlock_tool_crafting') extras.push('🪓 工具页订单制作工具；可再消耗低级工具升级');
    if (tech.id === 'unlock_offline_cap' && this.hasOfflineIncome()) {
      const { current, max } = this.getTechRepeatLevel(tech);
      extras.push(`🌙 离线上限：${this.getOfflineCapMinutes()} 分钟（${this.formatUpgradeLevel(current, max)}）`);
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
      extras.push('📦 宝箱资源点已解锁，开采其他资源点有概率掉落宝箱');
    }

    const toastLevel = tech.repeatable && tech.maxRepeat
      ? ` <small class="level-tag">${this.formatUpgradeLevel(
        this.getTechRepeatLevel(tech).current,
        tech.maxRepeat
      )}</small>`
      : '';
    toast.innerHTML = `
      <div class="unlock-toast-header"><span class="unlock-toast-icon">${tech.icon}</span><span>解锁成功：${tech.name}${toastLevel}</span></div>
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
      if (hint) hint.textContent = '暂无宝箱，继续开采其他资源点';
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

  formatResourceIcon(resId) {
    if (!this.isResourceDiscovered(resId)) return '?';
    return GAME_DATA.resources[resId]?.icon || resId;
  }

  formatCost(cost) {
    if (!cost) return '免费';
    return Object.entries(cost).map(([res, amt]) => `${this.formatResourceIcon(res)}×${amt}`).join(' ');
  }

  formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
  }

  // ========== 渲染 ==========
  render() {
    this.prepareTutorialForRender();
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
  }

  renderTick() {
    const clicksEl = document.getElementById('total-clicks-display');
    if (clicksEl) clicksEl.textContent = `总点击: ${this.formatNumber(this.state.totalClicks)}`;

    this.updateCalendarDisplay();

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
    const orderMax = isCraft ? this.getMaxCount('recipe', id) : maxCount;
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
      } else if (onCooldown) {
        this.applyProgressBar(progressBar, {
          width: this.getCooldownProgressPct(type, id),
          isCooldown: true,
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
            : (st.autoProduce ? '自动生产中，等待材料...' : `前往${def.isToolRecipe ? '工具页' : '合成页'}安排生产`))
          : onCooldown
            ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s`
            : `${st.currentCount.toFixed(1)} / ${maxCount}`;
      }
    }
    if (clickArea) clickArea.classList.toggle('cooldown', onCooldown);
  }

  updateStationCooldownBars() {
    document.querySelectorAll('.station-btn .mini-progress').forEach(bar => {
      const t = bar.dataset.stationType;
      const sid = bar.dataset.stationId;
      if (!t || !sid) return;
      const stationCooldown = this.isOnCooldown(t, sid);
      if (stationCooldown) {
        this.applyProgressBar(bar, {
          width: this.getCooldownProgressPct(t, sid),
          isCooldown: true,
        });
        return;
      }
      const sst = this.getStationState(t, sid);
      const smax = this.getMaxCount(t, sid);
      this.applyProgressBar(bar, {
        width: Math.min(100, (sst.currentCount / smax) * 100),
        isCooldown: false,
      });
    });

    document.querySelectorAll('.craft-queue-progress').forEach(bar => {
      const recipeId = bar.dataset.recipeId;
      if (!recipeId) return;
      const barState = this.getCraftQueueBarState(recipeId);
      this.applyProgressBar(bar, barState);
      const max = this.getMaxCount('recipe', recipeId);
      const queue = this.getCraftQueue(recipeId);
      const item = bar.closest('.craft-order-item');
      const status = item?.querySelector('.craft-order-status');
      if (status && queue) {
        status.textContent = barState.isCooldown
          ? `冷却 ${this.formatCooldownSeconds(this.state.craftStations[recipeId]?.cooldownRemaining)}s`
          : `${queue.progress.toFixed(0)}/${max}`;
      }
      const countEl = item?.querySelector('.craft-queue-count');
      if (countEl && queue) countEl.textContent = `×${queue.quantity}`;
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

    document.querySelectorAll('.tech-item[data-tech-id]').forEach(el => {
      if (el.classList.contains('maxed')) return;
      const tech = GAME_DATA.techTree.find(t => t.id === el.dataset.techId);
      if (!tech) return;
      const canUnlock = this.canUnlockTech(tech);
      el.classList.toggle('affordable', canUnlock);
      el.classList.toggle('unaffordable', !canUnlock);
    });

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
      const amount = this.state.resources[id] || 0;
      const el = document.createElement('div');
      el.className = `warehouse-item discovered${amount > 0 ? ' has-stock' : ''}`;
      el.dataset.res = id;
      const need = id === 'food' ? this.getDailyFoodNeed() : 0;
      const hungry = id === 'food' ? this.getHungryCount() : 0;
      el.innerHTML = `
        <span class="warehouse-icon">${def.icon}</span>
        <span class="warehouse-name">${def.name}</span>
        <span class="warehouse-amount">${this.formatNumber(amount)}</span>
        ${id === 'food'
          ? `<span class="warehouse-food-drain">${hungry > 0
            ? `今日预计消耗 ${this.formatNumber(need)} · 饥饿 ${hungry}`
            : `今日预计消耗 ${this.formatNumber(need)}`}</span>`
          : ''}
      `;
      el.style.setProperty('--res-color', def.color);
      if (id === 'food') el.classList.toggle('food-low', amount < need || hungry > 0);
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
    const barWidth = onCooldown
      ? this.getCooldownProgressPct(type, id)
      : Math.min(100, (st.currentCount / maxCount) * 100);
    const barClass = onCooldown ? 'mini-progress cooldown' : 'mini-progress';
    const isChest = def.isTreasureChest;
    const chestStock = isChest ? (st.stock || 0) : 0;
    const depleted = isChest && chestStock <= 0;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `station-btn ${active ? 'active' : ''} ${depleted ? 'depleted' : ''}${this.shouldFlashUnlockPoint(id) ? ' unlock-flash' : ''}`;
    el.dataset.stationType = type;
    el.dataset.stationId = id;
    el.innerHTML = `
      <span class="station-btn-label">${def.icon} ${def.name}${isChest ? ` <small class="chest-stock">×${chestStock}</small>` : ''}</span>
      ${st.assignedWorkers > 0 && !depleted ? `<span class="worker-badge">👷${st.assignedWorkers}</span>` : ''}
      ${!depleted ? `<div class="mini-progress-bg"><div class="${barClass}" data-station-type="${type}" data-station-id="${id}" style="width:${barWidth}%"></div></div>` : '<div class="station-waiting">等待掉落</div>'}
    `;
    container.appendChild(el);
  }

  renderStationLists() {
    const forageList = document.getElementById('forage-list');
    const gatherList = document.getElementById('gather-list');
    const craftList = document.getElementById('craft-station-list');
    const forageTitle = document.getElementById('forage-section-title');
    if (forageList) forageList.innerHTML = '';
    gatherList.innerHTML = '';
    craftList.innerHTML = '';

    let forageCount = 0;
    let gatherCount = 0;
    Object.entries(GAME_DATA.resourcePoints).forEach(([id, def]) => {
      if (!this.isPointVisibleInSidebar(id)) return;
      if (def.isFoodPoint) {
        if (forageList) this.renderStationBtn(forageList, 'point', id, def);
        forageCount++;
      } else {
        this.renderStationBtn(gatherList, 'point', id, def);
        gatherCount++;
      }
    });
    if (forageTitle) forageTitle.style.display = forageCount > 0 ? '' : 'none';
    if (forageList) forageList.style.display = forageCount > 0 ? '' : 'none';

    const gatherTitle = document.getElementById('gather-section-title');
    if (forageTitle) {
      forageTitle.classList.toggle('unlock-flash-menu', this.shouldFlashUnlockSection('forage'));
    }
    if (gatherTitle) {
      gatherTitle.classList.toggle('unlock-flash-menu', this.shouldFlashUnlockSection('gather'));
    }

    let hasCraft = this.getCraftRecipesUnlocked().length > 0;
    const titleEl = document.getElementById('craft-section-title');
    if (titleEl) titleEl.textContent = '生产中';

    const queues = this.state.craftQueues || {};
    const activeQueues = Object.entries(queues).filter(([, q]) => q.quantity > 0);
    if (!hasCraft) {
      craftList.style.display = 'none';
      if (titleEl) titleEl.style.display = 'none';
    } else if (!activeQueues.length) {
      craftList.innerHTML = '<p class="hint craft-order-empty">暂无生产任务，前往合成页安排生产</p>';
      craftList.style.display = 'flex';
      if (titleEl) titleEl.style.display = 'block';
    } else {
      activeQueues.forEach(([recipeId, queue]) => {
        const recipe = GAME_DATA.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        const max = this.getMaxCount('recipe', recipeId);
        const barState = this.getCraftQueueBarState(recipeId);
        const barClass = barState.isCooldown
          ? 'mini-progress craft-queue-progress cooldown'
          : 'mini-progress craft-queue-progress';
        const statusText = barState.isCooldown
          ? `冷却 ${this.formatCooldownSeconds(this.state.craftStations[recipeId]?.cooldownRemaining)}s`
          : `${queue.progress.toFixed(0)}/${max}`;
        const active = this.isActiveStation('recipe', recipeId);
        const el = document.createElement('div');
        el.className = `craft-order-item ${active ? 'active' : ''}`;
        el.dataset.recipeId = recipeId;
        el.innerHTML = `
          <button type="button" class="craft-order-btn station-btn ${active ? 'active' : ''}" data-station-type="recipe" data-station-id="${recipeId}">
            <span class="station-btn-label">${recipe.icon} ${recipe.name} <span class="craft-queue-count">×${queue.quantity}</span></span>
            <div class="mini-progress-bg"><div class="${barClass}" data-recipe-id="${recipeId}" style="width:${barState.width}%"></div></div>
            <span class="craft-order-status">${statusText}</span>
          </button>
          <div class="craft-cancel-wrap">
            <button type="button" class="btn-cancel-order" data-recipe-id="${recipeId}" title="取消1个并返还材料">×</button>
            ${queue.quantity > 1 ? `
            <div class="craft-cancel-menu">
              <button type="button" class="btn-cancel-all-order" data-recipe-id="${recipeId}" title="取消全部并返还材料">取消全部</button>
            </div>` : ''}
          </div>
        `;
        craftList.appendChild(el);
      });
      craftList.style.display = 'flex';
      if (titleEl) titleEl.style.display = 'block';
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
    const craftQueue = isCraft ? this.getCraftQueue(id) : null;
    const queueCount = craftQueue?.quantity || 0;
    const orderMax = isCraft ? this.getMaxCount('recipe', id) : maxCount;
    const orderProgress = craftQueue?.progress || 0;
    const mainBarWidth = isCraft
      ? (queueCount > 0
        ? (onCooldown ? this.getCooldownProgressPct('recipe', id) : Math.min(100, (orderProgress / orderMax) * 100))
        : 0)
      : (onCooldown ? this.getCooldownProgressPct(type, id) : Math.min(100, (st.currentCount / maxCount) * 100));
    const mainBarCooldown = onCooldown && (!isCraft || queueCount > 0);

    const isChest = type === 'point' && def.isTreasureChest;
    const chestStock = isChest ? (st.stock || 0) : 0;

    document.getElementById('point-icon').textContent = def.icon;
    document.getElementById('point-name').textContent = def.name;
    document.getElementById('point-desc').textContent = isCraft
      ? `${def.description} | ${this.formatRecipeLine(def)}${queueCount > 0 ? ` | 生产中 ×${queueCount}` : ''}`
      : isChest
        ? `${def.description} | 待开启: ${chestStock} 个 | 爆率: ${(this.getChestDropRate() * 100).toFixed(1)}%`
        : (def.canBuildMultiple
          ? `${def.description} | 已建 ${this.getPointBuildingCount(id)} 座 · 人数上限 ${this.getStationWorkerCap('point', id)}${
            (def.maxUpgrades?.efficiency || 0) > 0
              ? ` · 效率 ${this.formatUpgradeLevel(st.upgrades?.efficiency || 0, def.maxUpgrades.efficiency)}`
              : ''
          }`
          : def.description);

    const resting = this.isVillagersResting();
    const autoLabel = resting ? '自动: 休息中' : `自动: ${autoSpeed.toFixed(1)}/秒`;
    const clickLv = this.getTechRepeatLevel('unlock_click_power');
    const clickLabel = clickLv.max > 0
      ? `点击: ${clickPower}/次（${this.formatUpgradeLevel(clickLv.current, clickLv.max)}）`
      : `点击: ${clickPower}/次`;
    const holdLv = this.getTechRepeatLevel('unlock_auto_click');
    const holdLabel = holdLv.max > 0
      ? `按住: ${this.formatHoldClickCooldown()}（${this.formatUpgradeLevel(holdLv.current, holdLv.max)}）`
      : `按住: ${this.formatHoldClickCooldown()}`;
    const stats = isCraft
      ? (queueCount > 0
        ? [
          clickLabel,
          autoLabel,
          holdLabel,
          `👷 ${st.assignedWorkers}`,
        ]
        : [
          st.autoProduce ? '自动生产' : '无生产任务',
          autoLabel,
          `👷 ${st.assignedWorkers}`,
        ])
      : isChest
      ? [`待开启: ${chestStock}`, `开启: 4次点击`, `冷却: 0.5s`]
      : [
        clickLabel,
        autoLabel,
        holdLabel,
      ];
    if (type === 'point' && !isChest) {
      stats.push(`单次采集: ${this.getHarvestYield(id)}`);
      const miningMult = this.getPointMiningMultiplier(id);
      if (miningMult > 1) stats.push(`开采倍率×${miningMult}`);
    }
    document.getElementById('click-power').textContent = stats.slice(0, 2).join(' | ');
    document.getElementById('yield-info').textContent = stats.slice(2).join(' | ');

    const progressBarEl = document.getElementById('progress-bar');
    this.applyProgressBar(progressBarEl, {
      width: isChest ? 0 : mainBarWidth,
      isCooldown: isChest ? false : mainBarCooldown,
    });
    const progressContainer = document.getElementById('progress-container');
    const chestUi = document.getElementById('chest-open-ui');
    if (isChest) {
      progressContainer?.classList.add('hidden');
      chestUi?.classList.remove('hidden');
      if (!document.getElementById('chest-visual')?.classList.contains('chest-opening-complete')) {
        this.updateChestVisual(st.currentCount, maxCount, onCooldown);
      }
    } else {
      progressContainer?.classList.remove('hidden');
      chestUi?.classList.add('hidden');
      document.getElementById('progress-text').textContent = isCraft
        ? (queueCount > 0
          ? (onCooldown
            ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s · 剩余 ×${queueCount}`
            : `生产中 ${orderProgress.toFixed(1)} / ${orderMax} · 剩余 ×${queueCount}`)
          : (st.autoProduce ? '自动生产中，等待材料...' : `前往${def.isToolRecipe ? '工具页' : '合成页'}安排生产`))
        : onCooldown
          ? `冷却中 ${this.formatCooldownSeconds(st.cooldownRemaining)}s`
          : `${st.currentCount.toFixed(1)} / ${maxCount}`;
    }

    const clickArea = document.getElementById('click-area');
    const craftClickable = isCraft && queueCount > 0;
    clickArea.className = `click-area ${onCooldown ? 'cooldown' : ''} ${isChest && chestStock <= 0 ? 'disabled' : ''} ${isChest ? 'chest-click-area' : ''}`;
    clickArea.style.pointerEvents = (isCraft && !craftClickable) || (isChest && chestStock <= 0) ? 'none' : '';
    document.querySelector('.click-hint').textContent = isCraft
      ? queueCount > 0
        ? (resting
          ? '🌙 夜间休息：自动暂停，点击或按住仍可加速生产'
          : '点击或按住加速生产，工人也会自动推进进度')
        : (st.autoProduce ? '开启自动生产后，队列清空会自动补单' : `前往${def.isToolRecipe ? '工具页' : '合成页'}安排生产，材料会立即扣除`)
      : isChest
        ? chestStock > 0
          ? onCooldown
            ? '宝箱冷却中，请稍候...'
            : '每次点击撬开宝箱一点，共需点击 4 次'
          : '宝箱已用完，继续开采其他资源点等待掉落'
        : (resting
          ? '🌙 夜间休息：自动采集暂停，仍可点击或按住手动采集'
          : '点击或按住采集，分配工人后才会自动累积进度');

    document.getElementById('point-upgrades').style.display = type === 'point' ? 'block' : 'none';
    document.getElementById('point-workers').style.display = isChest ? 'none' : 'block';
    if (type === 'point') this.renderPointUpgrades(id);
    this.renderStationWorkers(type, id);
  }

  renderPointUpgrades(pointId) {
    const container = document.getElementById('point-upgrades');
    const def = GAME_DATA.resourcePoints[pointId];
    const pt = this.state.resourcePoints[pointId];
    container.innerHTML = '';
    container.style.display = 'none';

    const caps = def.maxUpgrades || {};
    const showBuild = !!def.canBuildMultiple && pt?.unlocked;
    const hasStdUpgrades = !!(caps.count > 0 || caps.cooldown > 0 || caps.double > 0);
    const hasEffUpgrade = (caps.efficiency || 0) > 0;
    const showUpgrades = def.isTreasureChest || hasStdUpgrades || hasEffUpgrade;
    if (!showBuild && !showUpgrades) return;

    container.style.display = 'block';

    if (showBuild) {
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
      if (!showUpgrades) return;
    }

    if (!showUpgrades) return;

    let upgradeList = [];
    if (def.isTreasureChest) {
      upgradeList = [
        {
          type: 'dropRate',
          name: '宝箱爆率',
          icon: '🎲',
          desc: () => `当前: ${(this.getChestDropRate() * 100).toFixed(1)}%`,
          costs: GAME_DATA.chestUpgradeCosts.dropRate,
        },
        {
          type: 'rewardTypes',
          name: '奖励种类',
          icon: '🎁',
          desc: () => `当前: ${this.getChestRewardTypeRange().min}~${this.getChestRewardTypeRange().max} 种`,
          costs: GAME_DATA.chestUpgradeCosts.rewardTypes,
        },
        {
          type: 'rewardAmount',
          name: '奖励数量',
          icon: '📈',
          desc: () => `当前: 每种 ${this.getChestRewardAmountRange().min}~${this.getChestRewardAmountRange().max}`,
          costs: GAME_DATA.chestUpgradeCosts.rewardAmount,
        },
      ];
    } else if (hasStdUpgrades) {
      upgradeList = [
        {
          type: 'cooldown',
          name: '资源恢复',
          icon: '⏱️',
          desc: () => `当前: ${(this.getCooldown('point', pointId) / 1000).toFixed(2)}s（精炼升级不重置）`,
          costs: this.getPointUpgradeCosts(pointId, 'cooldown'),
        },
        {
          type: 'count',
          name: '采集升级',
          icon: '⚡',
          desc: () => {
            const ratio = this.getCountUpgradeRatio(pointId);
            return `当前: ${this.getMaxCount('point', pointId)}次（进度需求 ${Math.round(ratio * 100)}%）`;
          },
          costs: this.getPointUpgradeCosts(pointId, 'count'),
        },
        {
          type: 'double',
          name: '资源精炼',
          icon: '✨',
          desc: () => {
            const refine = this.getPointRefineLevel(pointId);
            const miningMult = this.getPointMiningMultiplier(pointId);
            const base = `单次采集 ${this.getHarvestYield(pointId)}（(1+${refine})×${miningMult}）`;
            if (pt.upgrades.double >= def.maxUpgrades.double) return base;
            if (!this.canUpgradeRefine(pointId)) return `${base} · 需先满级采集升级与资源恢复`;
            return `${base} · 升级后将重置采集升级（资源恢复保留）`;
          },
          costs: this.getPointUpgradeCosts(pointId, 'double'),
        },
      ];
    }

    if (hasEffUpgrade) {
      upgradeList.push({
        type: 'efficiency',
        name: '村民效率',
        icon: '💪',
        desc: () => {
          const speed = this.getPointBareWorkerSpeed(pointId);
          const lv = pt.upgrades.efficiency || 0;
          const next = def.efficiencySpeedByLevel?.[lv + 1];
          if (lv >= (caps.efficiency || 0)) return `当前: ${speed}/秒/人（已满级）`;
          if (next != null) return `当前: ${speed}/秒/人 → 升级后 ${next}/秒/人`;
          return `当前: ${speed}/秒/人`;
        },
        costs: this.getPointUpgradeCosts(pointId, 'efficiency'),
      });
    }

    if (!upgradeList.length) return;

    container.style.display = 'block';
    const upgradeTitle = document.createElement('h4');
    upgradeTitle.textContent = def.isTreasureChest
      ? '宝箱升级'
      : hasEffUpgrade && !hasStdUpgrades
        ? `${def.name}效率升级`
        : '资源点升级';
    container.appendChild(upgradeTitle);

    upgradeList.forEach(({ type, name, icon, desc, costs }) => {
      const level = pt.upgrades[type] || 0;
      const maxLevel = def.maxUpgrades[type] || 0;
      const isMaxed = level >= maxLevel;
      const canUp = !isMaxed && this.canUpgradePoint(pointId, type);
      const el = document.createElement('div');
      el.className = `upgrade-item ${isMaxed ? 'maxed' : (canUp ? 'affordable' : 'unaffordable')}`;
      el.dataset.pointId = pointId;
      el.dataset.upgradeType = type;
      el.innerHTML = `
        <div class="upgrade-info">
          <span>${icon} ${name} <small class="level-tag">${this.formatUpgradeLevel(level, maxLevel)}</small></span>
          <span class="upgrade-desc">${desc()}</span>
        </div>
        <div class="upgrade-action">
          <span class="cost">${isMaxed ? '已满级' : this.formatCost(costs[level])}</span>
          <button class="btn-upgrade" ${canUp ? '' : 'disabled'}>${isMaxed ? '已满级' : '升级'}</button>
        </div>`;
      container.appendChild(el);
    });

    if (!def.isTreasureChest && this.canPrestigePoint(pointId)) {
      const nextMult = this.getPointMiningMultiplier(pointId) * (GAME_DATA.pointUpgradeMeta.prestigeMultiplier || 2);
      const prestigeEl = document.createElement('div');
      prestigeEl.className = 'point-prestige-panel';
      prestigeEl.innerHTML = `
        <p class="upgrade-desc">采集升级、资源恢复、资源精炼均已满级，可重置全部升级，开采倍率升至 ×${nextMult}</p>
        <button type="button" class="btn-craft btn-point-prestige" data-point-id="${pointId}">精炼重置</button>
      `;
      container.appendChild(prestigeEl);
    }
  }

  renderStationWorkers(type, id) {
    const container = document.getElementById('point-workers');
    const st = this.getStationState(type, id);
    const def = this.getStationDef(type, id);
    const autoSpeed = this.getStationAutoSpeed(type, id);
    const layout = this.getWorkerLayoutCount(type, id);
    const layoutHint = layout > st.assignedWorkers
      ? `<span class="worker-layout-hint">计划 ${layout}</span>`
      : '';
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
        const bits = Object.entries(assign.byLevel)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([lv, n]) => `${this.formatToolLabel(toolId, Number(lv))}×${n}（${this.getToolSpeed(Number(lv))}/秒）`);
        if (assign.bare > 0) bits.push(`徒手 ${assign.bare}（${this.getPointBareWorkerSpeed(id)}/秒）`);
        effHint = bits.length
          ? `效率: ${bits.join(' + ')} = ${autoSpeed.toFixed(2)}/秒`
          : `效率: ${st.assignedWorkers} 名徒手 = ${autoSpeed.toFixed(2)}/秒`;
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
        <span class="worker-count">🧑 ${st.assignedWorkers}${capHint} ${layoutHint}</span>
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
    const layout = this.getWorkerLayoutCount(type, id);
    const isActive = this.state.activeStation.type === type && this.state.activeStation.id === id;
    const tooled = this.getTooledVillagerCount(type, id);
    const cap = this.getStationWorkerCap(type, id);
    const countLabel = Number.isFinite(cap)
      ? `${st.assignedWorkers}/${cap}`
      : `${st.assignedWorkers}${layout > st.assignedWorkers ? `<small>/${layout}</small>` : ''}`;
    const row = document.createElement('div');
    row.className = `worker-station-row ${isActive ? 'active' : ''}`;
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

    container.innerHTML = `
      <div class="worker-stats">
        <div class="stat"><span class="stat-label">村民</span><span class="stat-value">${this.state.workers.total}/${capacity}</span></div>
        <div class="stat"><span class="stat-label">空闲</span><span class="stat-value">${this.state.workers.unassigned}</span></div>
        <div class="stat"><span class="stat-label">工作中</span><span class="stat-value">${working}</span></div>
        ${hungry > 0 ? `<div class="stat hungry"><span class="stat-label">饥饿</span><span class="stat-value">${hungry}</span></div>` : ''}
        ${pendingBreeds > 0 ? `<div class="stat breed-pending"><span class="stat-label">预约繁殖</span><span class="stat-value">${pendingBreeds}</span></div>` : ''}
      </div>
      ${hungry > 0 ? `<p class="hint hunger-hint">⚠ ${hungry} 名村民饥饿中：自动工作效率减半；若明日仍缺粮将饿死</p>` : ''}
      ${this.isVillagersResting() ? '<p class="hint rest-hint">🌙 夜间休息（22:00–06:00）：自动工作已暂停，手动点击采集/制作仍可用</p>' : ''}
      <div class="village-breed ${empty > 0 && dailyLeft > 0 ? 'active' : ''} ${canBreed ? 'affordable' : 'unaffordable'}" id="tutorial-village-breed">
        <h4>🐣 繁殖村民</h4>
        <p class="hint">${empty > 0
          ? `白天预约，当晚开始，次日加人。房屋空位 ${empty}（含预约占用）。${breedStatus}`
          : '房屋已满员（或已被预约占满），建造或升级房屋以增加人口上限'}</p>
        <div class="upgrade-action">
          <span class="cost">${this.formatCost(breedCost)}</span>
          <button type="button" class="btn-craft btn-breed-villager" ${canBreed ? '' : 'disabled'}>预约繁殖</button>
        </div>
      </div>
      <div class="house-build-panel ${canBuild ? 'affordable' : 'unaffordable'}">
        <h4>🏠 建造房屋</h4>
        <p class="hint">木头建造；每多盖一间涨价。容量：基础1，每次升级+1</p>
        <div class="upgrade-action">
          <span class="cost">${this.formatCost(buildCost)}</span>
          <button type="button" class="btn-craft btn-build-house" ${canBuild ? '' : 'disabled'}>建造</button>
        </div>
      </div>
      <div class="worker-actions" id="tutorial-worker-manage">
        <button type="button" class="dev-btn worker-action-btn" id="recall-all-workers" ${working <= 0 ? 'disabled' : ''}>全部收回</button>
        <button type="button" class="dev-btn worker-action-btn worker-action-restore" id="apply-worker-layout" ${canRestore ? '' : 'disabled'}>恢复分配</button>
      </div>
      <p class="worker-actions-hint">持对应工具的村民效率高（等级越高越快）；徒手很低。工具在工具页订单制作/升级。</p>
    `;

    const houseSection = document.createElement('div');
    houseSection.className = 'worker-section';
    houseSection.innerHTML = '<h4>房屋（按等级合并）</h4>';
    const houseList = document.createElement('div');
    houseList.className = 'house-list';
    const maxLv = GAME_DATA.housing.maxHouseLevel || 2;
    for (let lv = 0; lv <= maxLv; lv++) {
      const group = this.getHousesByLevel(lv);
      if (!group.length) continue;
      const count = group.length;
      const capEach = this.getHouseCapacity(group[0]);
      const capTotal = capEach * count;
      const isMaxed = lv >= maxLv;
      const next = lv + 1;
      const upCost = !isMaxed ? this.getHouseUpgradeCost(next) : null;
      const canUp = !isMaxed && this.canUpgradeHouseLevel(lv);
      const upName = GAME_DATA.housing.upgrades[next]?.name || `升级至 Lv.${next}`;
      const el = document.createElement('div');
      el.className = `house-item ${isMaxed ? 'maxed' : (canUp ? 'affordable' : 'unaffordable')}`;
      el.dataset.houseLevel = String(lv);
      el.innerHTML = `
        <div class="upgrade-info">
          <span>🏠 ${this.getHouseLevelLabel(lv)} <strong>×${count}</strong>
            <small class="level-tag">${this.formatUpgradeLevel(lv, maxLv)}</small>
            <small> · ${capEach}/间 · 合计容量 ${capTotal}</small>
          </span>
          <span class="upgrade-desc">${isMaxed ? '已满级' : `${upName}：${GAME_DATA.housing.upgrades[next]?.desc || '人口容量 +1'}（升级其中 1 间）`}</span>
        </div>
        <div class="upgrade-action">
          <span class="cost">${isMaxed ? '已满级' : this.formatCost(upCost)}</span>
          <button type="button" class="btn-upgrade btn-upgrade-house" data-house-level="${lv}" ${canUp ? '' : 'disabled'}>${isMaxed ? '已满级' : '升级'}</button>
        </div>
      `;
      houseList.appendChild(el);
    }
    houseSection.appendChild(houseList);
    container.appendChild(houseSection);

    const allPoints = Object.keys(GAME_DATA.resourcePoints)
      .filter(id => this.isPointVisibleInSidebar(id) && !GAME_DATA.resourcePoints[id].isTreasureChest);
    const foragePoints = allPoints
      .filter(id => GAME_DATA.resourcePoints[id].isFoodPoint)
      .map(id => ({ type: 'point', id }));
    const gatherPoints = allPoints
      .filter(id => !GAME_DATA.resourcePoints[id].isFoodPoint)
      .map(id => ({ type: 'point', id }));
    const recipes = Object.entries(this.state.craftQueues || {})
      .filter(([, q]) => (q?.quantity || 0) > 0)
      .map(([id]) => ({ type: 'recipe', id }));

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
    if (recipe.isToolRecipe && recipe.outputTools) {
      const [[toolId, out]] = Object.entries(recipe.outputTools);
      const max = GAME_DATA.villagerTools[toolId]?.maxLevel || 3;
      const lv = out?.level || 1;
      toolLevelTag = ` <small class="level-tag">${this.formatUpgradeLevel(lv, max)}</small>`;
    }
    const el = document.createElement('div');
    el.className = `craft-overview-item ${canCraftOne ? 'affordable' : 'unaffordable'}${recipe.isToolRecipe ? ' craft-tool-recipe' : ''}${this.shouldFlashUnlockRecipe(recipe.id) ? ' unlock-flash' : ''}`;
    el.dataset.recipeId = recipe.id;
    el.innerHTML = `
      <div class="craft-overview-header">
        <span>${recipe.icon} ${recipe.name}${toolLevelTag}${queueCount > 0 ? ` <small class="craft-queue-inline">×${queueCount}</small>` : ''}</span>
        <label class="craft-auto-label">
          <input type="checkbox" class="craft-auto-produce" data-recipe-id="${recipe.id}" ${st.autoProduce ? 'checked' : ''}>
          自动生产
        </label>
      </div>
      <div class="craft-overview-recipe">${this.formatRecipeLine(recipe)}</div>
      <div class="craft-order-hint">生产即扣材料 · 🧑${st.assignedWorkers} · ${this.getStationAutoSpeed('recipe', recipe.id).toFixed(1)}/秒</div>
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
    const container = document.getElementById('tool-list');
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'tools-panel-header';
    header.innerHTML = `
      <h4>工具</h4>
      <div class="tools-panel-hint">在此下单制作/升级工具。升级消耗 1 把低一级工具；高等级优先分配给村民。</div>
    `;
    container.appendChild(header);

    const toolRecipes = GAME_DATA.recipes.filter(r => r.isToolRecipe && this.isRecipeTechUnlocked(r.id));
    if (toolRecipes.length) {
      const section = document.createElement('div');
      section.className = 'tool-craft-section';
      const label = document.createElement('h5');
      label.className = 'craft-section-label';
      label.textContent = '制作 / 升级';
      section.appendChild(label);
      toolRecipes.forEach(recipe => {
        const card = this.createCraftOrderCard(recipe);
        if (card) section.appendChild(card);
      });
      container.appendChild(section);
    } else if (!this.isTechUnlocked('unlock_tool_crafting')) {
      const tip = document.createElement('p');
      tip.className = 'hint';
      tip.textContent = '解锁科技「工具制作」后，可在此订单制作斧/镐/铲，并升级更高效率工具';
      container.appendChild(tip);
    }

    const stockHeader = document.createElement('h5');
    stockHeader.className = 'craft-section-label';
    stockHeader.textContent = '库存';
    container.appendChild(stockHeader);

    let anyStockShown = false;
    Object.entries(GAME_DATA.villagerTools || {}).forEach(([id, def]) => {
      if (!this.isTechUnlocked('unlock_tool_crafting') && this.getToolCount(id) <= 0) return;
      anyStockShown = true;
      const max = def.maxLevel || 3;
      const total = this.getToolCount(id);
      const targets = (def.targets || [])
        .map(pid => GAME_DATA.resourcePoints[pid]?.name)
        .filter(Boolean)
        .join('、');
      const levelRows = [];
      for (let lv = 1; lv <= max; lv++) {
        const n = this.getToolCount(id, lv);
        const name = def.levelNames?.[lv] || `Lv.${lv}`;
        levelRows.push(`
          <div class="tool-level-row ${n > 0 ? 'has-stock' : ''}">
            <span>${def.icon} ${name} <small class="level-tag">${this.formatUpgradeLevel(lv, max)}</small></span>
            <span>×${n}</span>
            <span class="tool-level-speed">${this.getToolSpeed(lv)}/秒</span>
          </div>
        `);
      }
      const el = document.createElement('div');
      el.className = `tool-item ${total > 0 ? 'affordable' : 'unaffordable'}`;
      el.innerHTML = `
        <div class="tool-icon">${def.icon}</div>
        <div class="tool-info">
          <div class="tool-name">${def.name} <strong>共 ${total}</strong> <small class="level-tag">最高 Lv.${max}</small></div>
          <div class="tool-desc">适用：${targets || '—'}（仅提升村民自动效率）</div>
          <div class="tool-levels">${levelRows.join('')}</div>
        </div>
      `;
      container.appendChild(el);
    });
    if (!anyStockShown && this.isTechUnlocked('unlock_tool_crafting') && !toolRecipes.length) {
      const tip = document.createElement('p');
      tip.className = 'hint';
      tip.textContent = '解锁对应材料科技后，将显示工具升级配方';
      container.appendChild(tip);
    }
  }

  renderTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.state.activeTab);
      btn.classList.toggle('flash-hint', this.shouldFlashUnlockTab(btn.dataset.tab));
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${this.state.activeTab}`);
      const tab = panel.id.replace(/^tab-/, '');
      panel.classList.toggle('flash-hint-panel', this.shouldFlashUnlockTab(tab));
    });
  }

  renderTechTree() {
    const container = document.getElementById('tech-tree');
    container.innerHTML = '';
    const visibleTechs = GAME_DATA.techTree.filter(t => {
      if (!this.isTechVisible(t)) return false;
      // 可多级科技始终显示等级标签（含已满级）
      if (t.repeatable && t.maxRepeat) return true;
      return !this.isTechFullyComplete(t);
    });
    if (!visibleTechs.length) {
      container.innerHTML = '<p class="hint">继续发展以解锁更多科技</p>';
      return;
    }
    const branches = {};
    visibleTechs.forEach(tech => {
      const b = tech.branch || 'other';
      if (!branches[b]) branches[b] = [];
      branches[b].push(tech);
    });
    const branchNames = {
      root: '🌱 基础', tools: '🔧 工具', craft: '📦 合成',
      mining: '⛏️ 采矿', smelting: '🔥 冶炼', workers: '🏡 村落', endgame: '🏭 终极',
    };
    Object.entries(branches).forEach(([branch, techs]) => {
      const section = document.createElement('div');
      section.className = 'tech-branch';
      section.innerHTML = `<h4>${branchNames[branch] || branch}</h4>`;
      techs.forEach(tech => {
        const { current, max } = this.getTechRepeatLevel(tech);
        const isMaxed = !!(tech.repeatable && max && current >= max);
        const canUnlock = !isMaxed && this.canUnlockTech(tech);
        const el = document.createElement('div');
        el.className = `tech-item ${isMaxed ? 'maxed' : (canUnlock ? 'affordable' : 'unaffordable')}`;
        el.dataset.techId = tech.id;
        const cost = this.getTechCost(tech);
        const levelTag = tech.repeatable && max
          ? ` <small class="level-tag">${this.formatUpgradeLevel(current, max)}</small>`
          : '';
        el.innerHTML = `
          <div class="tech-icon">${tech.icon}</div>
          <div class="tech-info">
            <div class="tech-name">${tech.name}${levelTag}</div>
            <div class="tech-desc">${tech.description}</div>
            <div class="tech-cost">${isMaxed ? '已满级' : this.formatCost(cost)}</div>
          </div>
          ${isMaxed
            ? '<button class="btn-unlock" disabled>已满级</button>'
            : (canUnlock ? '<button class="btn-unlock">解锁</button>' : '')}`;
        section.appendChild(el);
      });
      container.appendChild(section);
    });
  }

  renderCraftOverview() {
    const container = document.getElementById('craft-overview');
    container.innerHTML = '<h4>合成配方</h4><p class="hint craft-tab-hint">安排生产后立即扣材料；同类型合并显示；勾选自动生产后队列清空会自动补 1 单</p>';

    const materialRecipes = GAME_DATA.recipes.filter(r => !r.isToolRecipe && this.isRecipeTechUnlocked(r.id));
    materialRecipes.forEach(recipe => {
      const card = this.createCraftOrderCard(recipe);
      if (card) container.appendChild(card);
    });

    if (!materialRecipes.length) {
      container.innerHTML += '<p class="hint">解锁「木板加工」等科技后，配方会显示在此</p>';
    }
  }


}

let game;
document.addEventListener('DOMContentLoaded', () => { game = new FactoryGame(); });
