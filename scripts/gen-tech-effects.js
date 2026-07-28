/**
 * 为 config/tech-tree-table.js 每条科技生成 effects（机械实现声明）
 * 依据 data.js 科技定义 + 已知 getter 映射 + 资源点/配方反向引用
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function runFile(filePath, sandbox, extra = '') {
  vm.runInNewContext(fs.readFileSync(filePath, 'utf8') + extra, sandbox, { filename: filePath });
}

const sandbox = { console, window: {}, globalThis: null };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

runFile(path.join(root, 'data.js'), sandbox, `
  globalThis.GAME_DATA = GAME_DATA;
  globalThis.applyResourcePoints = applyResourcePoints;
  globalThis.applyTechTreeTable = applyTechTreeTable;
`);
runFile(path.join(root, 'config', 'resource-points.js'), sandbox);
runFile(path.join(root, 'config', 'tech-tree-table.js'), sandbox);

const GAME_DATA = sandbox.GAME_DATA;
const table = JSON.parse(JSON.stringify(sandbox.TECH_TREE_TABLE));
if (!GAME_DATA?.techTree || !table?.techs) {
  console.error('missing data');
  process.exit(1);
}

const SERIES_STAT = {
  unlock_tool_efficiency: { stat: 'toolGatherMultAdd', value: 0.05 },
  unlock_worker_efficiency: { stat: 'workerSpeedAdd', value: 0.01 },
  unlock_craft_efficiency: {
    stat: 'craftSpeedAdd',
    value: GAME_DATA.villagerWork?.craftSpeedPerTechLevel ?? 0.02,
  },
  unlock_food_gather_speed: { stat: 'foodGatherSpeedAdd', value: 0.01 },
  unlock_tool_durability: { stat: 'toolDurabilityMultAdd', value: 0.1 },
  unlock_efficient_repair: {
    stat: 'repairCostReduce',
    value: GAME_DATA.toolDurability?.repairCostReducePerLevel ?? 0.06,
  },
  unlock_house_build_discount: {
    stat: 'houseCostDiscount',
    value: GAME_DATA.housingTechBonuses?.houseCostDiscountPerLevel ?? 0.1,
  },
  unlock_house_work_speed: {
    stat: 'houseOrderReduce',
    value: GAME_DATA.housingTechBonuses?.houseOrderReducePerLevel ?? 2,
  },
  unlock_breed_saving: {
    stat: 'breedFoodSave',
    value: GAME_DATA.housingTechBonuses?.breedFoodSavePerLevel ?? 1,
  },
  unlock_combat_hp: {
    stat: 'combatHpMultAdd',
    value: GAME_DATA.defenseCombatBonuses?.hpPerLevel ?? 0.08,
  },
  unlock_combat_atk: {
    stat: 'combatAtkMultAdd',
    value: GAME_DATA.defenseCombatBonuses?.atkPerLevel ?? 0.06,
  },
  unlock_combat_aspd: {
    stat: 'combatAspdMultAdd',
    value: GAME_DATA.defenseCombatBonuses?.aspdPerLevel ?? 0.05,
  },
  unlock_gate_repair_speed: {
    stat: 'gateRepairMultAdd',
    value: GAME_DATA.defense?.gate?.repairEfficiencyPerTechLevel ?? 0.25,
  },
};

const SANCTUARY_ROLE = {
  unlock_sanctuary_gather_chance: { branch: 'gather', role: 'chance' },
  unlock_sanctuary_gather_power: { branch: 'gather', role: 'power' },
  unlock_sanctuary_craft_chance: { branch: 'craft', role: 'chance' },
  unlock_sanctuary_craft_power: { branch: 'craft', role: 'refund' },
  unlock_sanctuary_war_chance: { branch: 'war', role: 'chance' },
  unlock_sanctuary_war_power: { branch: 'war', role: 'critMult' },
  unlock_sanctuary_eff_chance: { branch: 'efficiency', role: 'chance' },
  unlock_sanctuary_eff_power: { branch: 'efficiency', role: 'power' },
  unlock_sanctuary_eff_duration: { branch: 'efficiency', role: 'duration' },
};

const FLAG_BY_ID = {
  unlock_workbench: 'workbench',
  unlock_auto_produce: 'autoProduce',
  unlock_tough_skin: 'toughSkin',
  unlock_furnace_upgrade: 'furnaceUpgrade',
  unlock_point_recovery: 'pointRecovery',
  unlock_house_capacity: 'houseCapacity',
};

const ON_UNLOCK_BY_ID = {
  unlock_treasure_chest: ['revealStarterChest'],
  unlock_workbench: ['flashWorkbench', 'maybeGrantStarterChest'],
};

function cloneEffects(list) {
  return list.map((e) => ({ ...e }));
}

function effectsForTech(tech) {
  const id = tech.id;
  const out = [];

  // point upgrades
  if (tech.pointId && tech.upgradeType) {
    out.push({
      type: 'pointUpgrade',
      pointId: tech.pointId,
      upgrade: tech.upgradeType,
    });
    return out;
  }

  // gate
  if (tech.gateLevel) {
    out.push({ type: 'gateLevel', level: tech.gateLevel });
    return out;
  }

  // house upgrade gate
  const houseMatch = /^unlock_house_upgrade_(\d+)$/.exec(id);
  if (houseMatch) {
    out.push({ type: 'houseUpgrade', level: Number(houseMatch[1]) });
    return out;
  }

  // series stat
  const series = tech.techSeries;
  if (series && SERIES_STAT[series]) {
    const s = SERIES_STAT[series];
    out.push({ type: 'stat', stat: s.stat, op: 'add', value: s.value, series });
    return out;
  }

  // sanctuary series
  if (series && SANCTUARY_ROLE[series]) {
    const s = SANCTUARY_ROLE[series];
    out.push({ type: 'sanctuary', branch: s.branch, role: s.role, series });
    return out;
  }

  // sanctuary unlock hubs
  if (id === 'unlock_sanctuary_gather') out.push({ type: 'sanctuary', branch: 'gather', role: 'unlock' });
  else if (id === 'unlock_sanctuary_craft') out.push({ type: 'sanctuary', branch: 'craft', role: 'unlock' });
  else if (id === 'unlock_sanctuary_war') out.push({ type: 'sanctuary', branch: 'war', role: 'unlock' });
  else if (id === 'unlock_sanctuary_efficiency') out.push({ type: 'sanctuary', branch: 'efficiency', role: 'unlock' });

  // flags + related stats
  if (FLAG_BY_ID[id]) {
    out.push({ type: 'unlockFlag', flag: FLAG_BY_ID[id] });
    if (id === 'unlock_tough_skin') {
      out.push({
        type: 'stat',
        stat: 'toughSkinFlatDr',
        op: 'add',
        value: GAME_DATA.defenseCombatBonuses?.toughSkinFlatDr ?? 1,
      });
    }
    if (id === 'unlock_house_capacity') {
      out.push({ type: 'stat', stat: 'houseCapacityAdd', op: 'add', value: 1 });
    }
    if (id === 'unlock_point_recovery') {
      out.push({ type: 'stat', stat: 'pointRecoveryMult', op: 'mul', value: 0.9 });
    }
    if (id === 'unlock_furnace_upgrade') {
      out.push({ type: 'stat', stat: 'furnaceOrderHalf', op: 'add', value: 1 });
    }
  }

  // repeatable click / hold
  if (id === 'unlock_click_power') {
    out.push({ type: 'stat', stat: 'clickPowerAdd', op: 'add', value: 1 });
  }
  if (id === 'unlock_auto_click') {
    out.push({ type: 'stat', stat: 'holdClickLevel', op: 'add', value: 1 });
  }

  // unlock points (from resource-points reverse)
  Object.entries(GAME_DATA.resourcePoints || {}).forEach(([pointId, def]) => {
    if (def.unlockRequires === id) {
      out.push({ type: 'unlockPoint', pointId });
    }
  });

  // unlock recipes reverse
  (GAME_DATA.recipes || []).forEach((r) => {
    if (r.requires === id) {
      out.push({ type: 'unlockRecipe', recipeId: r.id });
    }
  });

  // onUnlock actions
  (ON_UNLOCK_BY_ID[id] || []).forEach((action) => {
    out.push({ type: 'onUnlock', action });
  });

  // pure prereq hubs
  if (id === 'unlock_advanced_workbench' || id === 'unlock_defense_training' || id === 'unlock_tool_crafting') {
    if (!out.length) out.push({ type: 'prereqOnly' });
  }

  // altar is unlockPoint + sanctuary entry
  if (id === 'unlock_altar' && !out.some((e) => e.type === 'prereqOnly')) {
    // unlockPoint already added via resource-points
  }

  if (!out.length) out.push({ type: 'prereqOnly' });
  return out;
}

let n = 0;
GAME_DATA.techTree.forEach((tech) => {
  const row = table.techs[tech.id];
  if (!row) return;
  const effects = effectsForTech(tech);
  row.effects = effects;
  // 多级单节点：每级复用同一 effects（可日后细分）
  if (Array.isArray(row.levelEffects) && row.levelEffects.length) {
    row.levelEffects = row.levelEffects.map((le) => ({
      ...le,
      effects: cloneEffects(effects),
    }));
  }
  n++;
});

table.version = Math.max(Number(table.version) || 0, 22) + 1;

const body = [
  '/** Tech tree table: layout / requires / cost / maxRepeat / repeatCosts / description / levelEffects / effects. */',
  `window.TECH_TREE_TABLE = ${JSON.stringify(table, null, 2)};`,
  'if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'config', 'tech-tree-table.js'), body, 'utf8');
console.log(`wrote effects for ${n} techs, version=${table.version}`);
