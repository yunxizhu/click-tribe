/** 工具/武器/护甲制作配方表（改这里即可） */
window.CRAFT_RECIPES = {
  axe: {
    name: '斧',
    icon: '🪓',
    levels: {
      1: { inputs: { wood: 3, plank: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 3 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  pickaxe: {
    name: '镐',
    icon: '⛏️',
    levels: {
      1: { inputs: { wood: 3, plank: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 3 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  shovel: {
    name: '铲',
    icon: '🥄',
    levels: {
      1: { inputs: { wood: 2, plank: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 2 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 1 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  bow: {
    name: '弓',
    icon: '🏹',
    levels: {
      1: { inputs: { wood: 2, plank: 1, resin: 2 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 2, resin: 2 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 1, resin: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1, resin: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  crossbow: {
    name: '弩',
    icon: '🎯',
    levels: {
      1: { inputs: { wood: 3, plank: 1, stone: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2200 },
      2: { inputs: { plank: 2, stone_slab: 3, resin: 2 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2700 },
      3: { inputs: { plank: 2, iron_ingot: 2, gear: 1 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3200 },
      4: { inputs: { plank: 2, steel: 1, gear: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3600 },
    },
  },
  sword: {
    name: '剑',
    icon: '🗡️',
    levels: {
      1: { inputs: { wood: 3, plank: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 3 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  spear: {
    name: '矛',
    icon: '🔱',
    levels: {
      1: { inputs: { wood: 3, plank: 1 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 2, stone_slab: 3 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  shield: {
    name: '盾',
    icon: '🛡️',
    levels: {
      1: { inputs: { wood: 4, plank: 2 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2000 },
      2: { inputs: { plank: 3, stone_slab: 4 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2500 },
      3: { inputs: { plank: 2, iron_ingot: 2 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3000 },
      4: { inputs: { plank: 2, steel: 1 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3500 },
    },
  },
  armor: {
    name: '甲',
    icon: '🥋',
    levels: {
      1: { inputs: { wood: 4, plank: 2 }, requires: 'unlock_tool_crafting', baseMaxCount: 8, baseCooldown: 2400 },
      2: { inputs: { plank: 3, stone_slab: 5 }, requires: 'unlock_quarry', baseMaxCount: 9, baseCooldown: 2800 },
      3: { inputs: { plank: 3, iron_ingot: 3 }, requires: 'unlock_iron_smelt', baseMaxCount: 10, baseCooldown: 3200 },
      4: { inputs: { plank: 3, steel: 2 }, requires: 'unlock_steel_smelt', baseMaxCount: 12, baseCooldown: 3600 },
    },
  },
};
