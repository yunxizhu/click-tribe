/**
 * 资源点完整定义表（名称/图标/解锁/产量/冷却/升级上限等）
 * 改这里即可，无需改 data.js / 重打 exe（打包后位于 exe 同级 config/）
 *
 * 采集/恢复/精炼费用见 point-upgrade-costs.js
 * maxUpgrades 常用：采集 count=5、资源恢复 cooldown=5、精炼 double=1（仅 low/mid 资源点）
 */
window.RESOURCE_POINTS = {
  berry_bush: {
    id: "berry_bush",
    name: "浆果丛",
    icon: "🫐",
    description: "采集浆果作为食物",
    resource: "food",
    maxUpgrades: { count: 0, cooldown: 0, double: 0 },
    unlockRequires: null,
    isFoodPoint: true,
    baseMaxCount: 10,
    baseCooldown: 1000,
    baseYield: 1,
  },

  forest: {
    id: "forest",
    name: "森林",
    icon: "🌲",
    description: "砍伐树木获取木头",
    resource: "wood",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_forest",
    baseMaxCount: 15,
    baseCooldown: 2000,
    baseYield: 1,
  },

  quarry: {
    id: "quarry",
    name: "采石场",
    icon: "⛏️",
    description: "开采石头",
    resource: "stone",
    tier: "low",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_quarry",
    baseMaxCount: 24,
    baseCooldown: 2000,
    baseYield: 1,
  },

  clay_pit: {
    id: "clay_pit",
    name: "黏土坑",
    icon: "🟠",
    description: "挖掘黏土",
    resource: "clay",
    tier: "low",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_clay_pit",
    baseMaxCount: 24,
    baseCooldown: 2200,
    baseYield: 1,
  },

  copper_mine: {
    id: "copper_mine",
    name: "铜矿",
    icon: "🏔️",
    description: "开采铜矿石",
    resource: "copper_ore",
    tier: "mid",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_copper_mine",
    baseMaxCount: 45,
    baseCooldown: 3000,
    baseYield: 1,
  },


  coal_mine: {
    id: "coal_mine",
    name: "煤矿",
    icon: "🕳️",
    description: "开采煤炭",
    resource: "coal",
    tier: "mid",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_coal_mine",
    baseMaxCount: 40,
    baseCooldown: 2500,
    baseYield: 1,
  },

  gravel_bed: {
    id: "gravel_bed",
    name: "砂砾滩",
    icon: "🏜️",
    description: "采集砂砾",
    resource: "gravel",
    tier: "low",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_gravel",
    baseMaxCount: 24,
    baseCooldown: 2000,
    baseYield: 1,
  },

  limestone_quarry: {
    id: "limestone_quarry",
    name: "石灰岩场",
    icon: "▫️",
    description: "开采石灰石",
    resource: "limestone",
    tier: "mid",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_limestone",
    baseMaxCount: 40,
    baseCooldown: 2600,
    baseYield: 1,
  },





  resin_grove: {
    id: "resin_grove",
    name: "松脂林",
    icon: "🍯",
    description: "采集树脂",
    resource: "resin",
    tier: "low",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_resin",
    baseMaxCount: 22,
    baseCooldown: 2200,
    baseYield: 1,
  },

  iron_mine: {
    id: "iron_mine",
    name: "铁矿",
    icon: "⛏️",
    description: "开采铁矿石",
    resource: "iron_ore",
    tier: "mid",
    maxUpgrades: { count: 5, cooldown: 5, double: 1 },
    unlockRequires: "unlock_iron_mine",
    baseMaxCount: 42,
    baseCooldown: 2700,
    baseYield: 1,
  },



  farm: {
    id: "farm",
    name: "农场",
    icon: "🌾",
    description: "耕作产出食物",
    resource: "food",
    maxWorkers: 4,
    canBuildMultiple: true,
    extraBuildBaseCost: { wood: 25, clay: 18, food: 12 },
    extraBuildCostBump: { mult: 1.3, add: 8 },
    maxUpgrades: { count: 0, cooldown: 5, double: 0, efficiency: 2 },
    efficiencyUpgradeBuilds: [2, 5],
    efficiencySpeedByLevel: { 1: 0.15, 2: 0.3 },
    unlockRequires: "unlock_farm",
    isFoodPoint: true,
    baseMaxCount: 16,
    baseCooldown: 1000,
    baseYield: 2,
    finalCooldownRatio: 0.25,
  },

  pasture: {
    id: "pasture",
    name: "牧场",
    icon: "🐄",
    description: "畜牧产出食物",
    resource: "food",
    maxWorkers: 8,
    canBuildMultiple: true,
    extraBuildBaseCost: { brick: 15, plank: 20, food: 25 },
    extraBuildCostBump: { mult: 1.3, add: 10 },
    maxUpgrades: { count: 0, cooldown: 5, double: 0, efficiency: 2 },
    efficiencyUpgradeBuilds: [2, 5],
    efficiencySpeedByLevel: { 1: 0.15, 2: 0.3 },
    unlockRequires: "unlock_pasture",
    isFoodPoint: true,
    baseMaxCount: 24,
    baseCooldown: 1000,
    baseYield: 4,
    finalCooldownRatio: 0.25,
  },

  treasure_chest: {
    id: "treasure_chest",
    name: "宝箱",
    icon: "📦",
    description: "开启宝箱获得随机资源",
    isTreasureChest: true,
    maxUpgrades: { dropRate: 8, rewardTypes: 3, rewardAmount: 3 },
    unlockRequires: "unlock_treasure_chest",
    baseMaxCount: 4,
    baseCooldown: 500,
  },

  /** 庇护神坛：默认存在于外侧列表，未解锁前仅可查看 */
  altar: {
    id: "altar",
    name: "神坛",
    icon: "⛩️",
    description: "部落庇护的核心。解锁建造后，可研发采集 / 生产 / 战争 / 效率庇护",
    isAltar: true,
    unlockRequires: "unlock_altar",
    maxUpgrades: { count: 0, cooldown: 0, double: 0 },
    maxWorkers: 0,
    baseMaxCount: 1,
    baseCooldown: 0,
  },
};

if (typeof applyResourcePoints === 'function') {
  applyResourcePoints(window.RESOURCE_POINTS);
}
