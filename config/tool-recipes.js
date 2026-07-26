/** 工具/武器/护甲：制作配方 + 持工具效率 + 耐久 */

/** 持工具工作效率（仅村民自动采集；手动点击不受影响） */
window.TOOL_EFFICIENCY = {
  /** 各工具等级对应效率（次/秒） */
  toolSpeedByLevel: { 1: 0.25, 2: 0.5, 3: 1.0, 4: 1.75 },
  /** 无等级映射时的兜底效率 */
  tooledSpeed: 0.25,
};

/** 工具耐久 */
window.TOOL_DURABILITY = {
  maxByLevel: { 1: 150, 2: 300, 3: 600, 4: 1200 },
  repairMinMissing: 0.01,
  repairCostRatio: 0.5,
  wearPerUserPerSecond: 0.040,
};

/** 从 CRAFT_RECIPES 配置表生成 TOOL_RECIPES 数组 */
function buildToolRecipes(cfg) {
  if (!cfg) return [];
  const recipes = [];
  Object.entries(cfg).forEach(([toolId, tool]) => {
    Object.entries(tool.levels).forEach(([lv, def]) => {
      const level = Number(lv);
      const inputs = {};
      Object.entries(def.inputs).forEach(([r, n]) => { inputs[r] = n; });
      recipes.push({
        id: `craft_${toolId}_${level}`,
        name: `${tool.name}${['一','二','三','四'][level - 1]}级`,
        icon: tool.icon,
        description: `${tool.name}：${Object.entries(def.inputs).map(([r, n]) => `${n}${r}`).join('+')}`,
        inputs,
        outputs: {},
        outputTools: { [toolId]: { level, amount: 1 } },
        requires: def.requires,
        baseMaxCount: def.baseMaxCount,
        baseCooldown: def.baseCooldown,
        isToolRecipe: true,
      });
    });
  });
  return recipes;
}

window.TOOL_RECIPES = buildToolRecipes(window.CRAFT_RECIPES);

if (typeof applyToolRecipes === 'function') applyToolRecipes(window.TOOL_RECIPES);
if (typeof applyToolEfficiency === 'function') applyToolEfficiency(window.TOOL_EFFICIENCY);
if (typeof applyToolDurability === 'function') applyToolDurability(window.TOOL_DURABILITY);
