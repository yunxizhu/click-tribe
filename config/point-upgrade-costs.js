/**
 * 各资源点升级费用表（采集 count / 资源恢复 cooldown / 资源精炼 double）
 * 改这里即可，无需改 data.js / 重打 exe（打包后位于 exe 同级 config/）
 *
 * 生成规则（采集与恢复均为 5 级）：
 * 1) 采集：第 1 级基数 = 6，其后 next = ceil(prev × 1.2 + 3) → 6,11,17,24,32
 * 2) 恢复：第 1 级基数 = 7，其后同样递推 → 7,12,18,25,33
 * 3) 档位缩放 scale = 1 + (pointIndex-1)×0.2，表内费用 = ceil(基数 × scale)
 * 4) 精炼 double = 该点「采集第5级费用 + 恢复第5级费用」
 *    （例：森林 = 32 + 33 = 65）
 * 满级效果：5 级 = 原 10 级（由游戏内 level/maxLevel 曲线平摊）
 */
window.POINT_UPGRADE_COSTS = {
  forest: {
    count: [
      { wood: 6 },
      { wood: 11 },
      { wood: 17 },
      { wood: 24 },
      { wood: 32 },
    ],
    cooldown: [
      { wood: 7 },
      { wood: 12 },
      { wood: 18 },
      { wood: 25 },
      { wood: 33 },
    ],
    double: [
      { wood: 65 },
    ],
  },

  quarry: {
    count: [
      { stone: 8 },
      { stone: 14 },
      { stone: 21 },
      { stone: 29 },
      { stone: 39 },
    ],
    cooldown: [
      { stone: 9 },
      { stone: 15 },
      { stone: 22 },
      { stone: 30 },
      { stone: 40 },
    ],
    double: [
      { stone: 79 },
    ],
  },

  clay_pit: {
    count: [
      { clay: 9 },
      { clay: 16 },
      { clay: 24 },
      { clay: 34 },
      { clay: 45 },
    ],
    cooldown: [
      { clay: 10 },
      { clay: 17 },
      { clay: 26 },
      { clay: 35 },
      { clay: 47 },
    ],
    double: [
      { clay: 92 },
    ],
  },

  copper_mine: {
    count: [
      { copper_ore: 10 },
      { copper_ore: 18 },
      { copper_ore: 28 },
      { copper_ore: 39 },
      { copper_ore: 52 },
    ],
    cooldown: [
      { copper_ore: 12 },
      { copper_ore: 20 },
      { copper_ore: 29 },
      { copper_ore: 40 },
      { copper_ore: 53 },
    ],
    double: [
      { copper_ore: 105 },
    ],
  },


  coal_mine: {
    count: [
      { coal: 12 },
      { coal: 22 },
      { coal: 34 },
      { coal: 48 },
      { coal: 64 },
    ],
    cooldown: [
      { coal: 14 },
      { coal: 24 },
      { coal: 36 },
      { coal: 50 },
      { coal: 66 },
    ],
    double: [
      { coal: 130 },
    ],
  },

  gravel_bed: {
    count: [
      { gravel: 14 },
      { gravel: 25 },
      { gravel: 38 },
      { gravel: 53 },
      { gravel: 71 },
    ],
    cooldown: [
      { gravel: 16 },
      { gravel: 27 },
      { gravel: 40 },
      { gravel: 56 },
      { gravel: 73 },
    ],
    double: [
      { gravel: 144 },
    ],
  },

  tin_mine: {
    count: [
      { tin_ore: 15 },
      { tin_ore: 27 },
      { tin_ore: 41 },
      { tin_ore: 58 },
      { tin_ore: 77 },
    ],
    cooldown: [
      { tin_ore: 17 },
      { tin_ore: 29 },
      { tin_ore: 44 },
      { tin_ore: 61 },
      { tin_ore: 80 },
    ],
    double: [
      { tin_ore: 157 },
    ],
  },

  limestone_quarry: {
    count: [
      { limestone: 16 },
      { limestone: 29 },
      { limestone: 45 },
      { limestone: 63 },
      { limestone: 84 },
    ],
    cooldown: [
      { limestone: 19 },
      { limestone: 32 },
      { limestone: 47 },
      { limestone: 65 },
      { limestone: 86 },
    ],
    double: [
      { limestone: 170 },
    ],
  },





  resin_grove: {
    count: [
      { resin: 22 },
      { resin: 40 },
      { resin: 62 },
      { resin: 87 },
      { resin: 116 },
    ],
    cooldown: [
      { resin: 26 },
      { resin: 44 },
      { resin: 65 },
      { resin: 90 },
      { resin: 119 },
    ],
    double: [
      { resin: 235 },
    ],
  },

  zinc_mine: {
    count: [
      { zinc_ore: 23 },
      { zinc_ore: 42 },
      { zinc_ore: 65 },
      { zinc_ore: 92 },
      { zinc_ore: 122 },
    ],
    cooldown: [
      { zinc_ore: 27 },
      { zinc_ore: 46 },
      { zinc_ore: 69 },
      { zinc_ore: 95 },
      { zinc_ore: 126 },
    ],
    double: [
      { zinc_ore: 248 },
    ],
  },



  farm: {
    count: [],
    cooldown: [
      { wood: 10, stone: 8,clay: 6},
      { wood: 20, stone: 16,clay: 12},
      { food: 22 },
      { food: 30 },
      { food: 40 },
    ],
    double: [],
  },

  pasture: {
    count: [],
    cooldown: [
      { food: 10 },
      { food: 17 },
      { food: 26 },
      { food: 35 },
      { food: 47 },
    ],
    double: [],
  },
};

if (typeof applyPointUpgradeCosts === 'function') {
  applyPointUpgradeCosts(window.POINT_UPGRADE_COSTS);
}
