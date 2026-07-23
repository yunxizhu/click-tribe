/**
 * 各资源点初始计数值（baseMaxCount）与冷却（baseCooldown，毫秒）
 * 改这里即可，无需改 data.js / 重打 exe（打包后位于 exe 同级 config/）
 *
 * 可选字段：
 *   baseYield           每次产出基础量
 *   finalCooldownRatio  冷却升级满级后的倍率（如农场 0.25）
 */
window.RESOURCE_POINT_STATS = {
  berry_bush: { baseMaxCount: 12, baseCooldown: 250, baseYield: 1 },
  forest: { baseMaxCount: 15, baseCooldown: 2000, baseYield: 1 },
  quarry: { baseMaxCount: 24, baseCooldown: 2000, baseYield: 1 },
  clay_pit: { baseMaxCount: 24, baseCooldown: 2200, baseYield: 1 },
  copper_mine: { baseMaxCount: 45, baseCooldown: 3000, baseYield: 1 },
  iron_mine: { baseMaxCount: 75, baseCooldown: 4000, baseYield: 1 },
  coal_mine: { baseMaxCount: 40, baseCooldown: 2500, baseYield: 1 },
  gravel_bed: { baseMaxCount: 24, baseCooldown: 2000, baseYield: 1 },
  tin_mine: { baseMaxCount: 42, baseCooldown: 2800, baseYield: 1 },
  limestone_quarry: { baseMaxCount: 40, baseCooldown: 2600, baseYield: 1 },
  silver_mine: { baseMaxCount: 72, baseCooldown: 3500, baseYield: 1 },
  sulfur_vent: { baseMaxCount: 70, baseCooldown: 3200, baseYield: 1 },
  gold_mine: { baseMaxCount: 130, baseCooldown: 5000, baseYield: 1 },
  crystal_cave: { baseMaxCount: 130, baseCooldown: 5500, baseYield: 1 },
  resin_grove: { baseMaxCount: 22, baseCooldown: 2200, baseYield: 1 },
  zinc_mine: { baseMaxCount: 42, baseCooldown: 2700, baseYield: 1 },
  obsidian_deposit: { baseMaxCount: 72, baseCooldown: 3600, baseYield: 1 },
  meteor_crater: { baseMaxCount: 130, baseCooldown: 6000, baseYield: 1 },
  farm: {
    baseMaxCount: 5,
    baseCooldown: 1000,
    baseYield: 1,
    finalCooldownRatio: 0.25,
  },
  pasture: {
    baseMaxCount: 3,
    baseCooldown: 1000,
    baseYield: 1,
    finalCooldownRatio: 0.25,
  },
  treasure_chest: { baseMaxCount: 4, baseCooldown: 500 },
};

if (typeof applyResourcePointStats === 'function') {
  applyResourcePointStats(window.RESOURCE_POINT_STATS);
}
