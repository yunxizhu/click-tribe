/** 检查科技树布局：连线是否穿过其他节点 */
const layout = {
  canvas: { width: 1320, height: 1200 },
  nodes: {
    unlock_workbench: { x: 640, y: 480, parent: null },
    unlock_tool_crafting: { x: 640, y: 360, parent: 'unlock_workbench' },
    unlock_tool_durability_v1: { x: 640, y: 240, parent: 'unlock_tool_crafting' },
    unlock_tool_efficiency: { x: 720, y: 200, parent: 'unlock_tool_durability_v1' },
    unlock_tool_durability_v2: { x: 640, y: 120, parent: 'unlock_tool_durability_v1' },
    unlock_click_power: { x: 500, y: 360, parent: 'unlock_workbench' },
    unlock_auto_click: { x: 500, y: 240, parent: 'unlock_click_power' },
    unlock_resin: { x: 780, y: 360, parent: 'unlock_workbench' },
    unlock_pitch: { x: 780, y: 240, parent: 'unlock_resin' },
    unlock_sulfur: { x: 780, y: 120, parent: 'unlock_pitch' },
    unlock_gunpowder: { x: 900, y: 180, parent: 'unlock_sulfur' },
    unlock_obsidian: { x: 900, y: 60, parent: 'unlock_gunpowder' },
    unlock_advanced_workbench: { x: 460, y: 530, parent: 'unlock_workbench' },
    unlock_furnace: { x: 380, y: 480, parent: 'unlock_advanced_workbench' },
    unlock_point_recovery: { x: 200, y: 560, parent: 'unlock_furnace' },
    unlock_coal_mine: { x: 380, y: 600, parent: 'unlock_furnace' },
    unlock_copper_smelt: { x: 260, y: 480, parent: 'unlock_furnace' },
    unlock_gear_craft: { x: 140, y: 480, parent: 'unlock_copper_smelt' },
    unlock_iron_mine: { x: 140, y: 600, parent: 'unlock_gear_craft' },
    unlock_iron_smelt: { x: 140, y: 720, parent: 'unlock_iron_mine' },
    unlock_furnace_upgrade: { x: 260, y: 720, parent: 'unlock_iron_smelt' },
    unlock_steel_smelt: { x: 140, y: 840, parent: 'unlock_furnace_upgrade' },
    unlock_gold_mine: { x: 260, y: 840, parent: 'unlock_steel_smelt' },
    unlock_gold_smelt: { x: 140, y: 960, parent: 'unlock_gold_mine' },
    unlock_quarry: { x: 780, y: 480, parent: 'unlock_workbench' },
    unlock_worker_efficiency: { x: 840, y: 420, parent: 'unlock_quarry' },
    unlock_gravel: { x: 900, y: 480, parent: 'unlock_quarry' },
    unlock_limestone: { x: 1020, y: 480, parent: 'unlock_gravel' },
    unlock_lime_craft: { x: 1140, y: 480, parent: 'unlock_limestone' },
    unlock_copper_mine: { x: 1140, y: 600, parent: 'unlock_lime_craft' },
    unlock_tin_mine: { x: 1020, y: 600, parent: 'unlock_copper_mine' },
    unlock_bronze_craft: { x: 900, y: 600, parent: 'unlock_tin_mine' },
    unlock_zinc_mine: { x: 1020, y: 720, parent: 'unlock_copper_mine' },
    unlock_brass_craft: { x: 1140, y: 720, parent: 'unlock_zinc_mine' },
    unlock_silver_mine: { x: 1020, y: 840, parent: 'unlock_brass_craft' },
    unlock_silver_smelt: { x: 1140, y: 840, parent: 'unlock_silver_mine' },
    unlock_clay_pit: { x: 640, y: 600, parent: 'unlock_workbench' },
    unlock_treasure_chest: { x: 520, y: 600, parent: 'unlock_workbench' },
    unlock_brick_craft: { x: 640, y: 680, parent: 'unlock_clay_pit' },
    unlock_farm: { x: 640, y: 760, parent: 'unlock_brick_craft' },
    unlock_pasture: { x: 760, y: 760, parent: 'unlock_farm' },
    unlock_crystal: { x: 640, y: 880, parent: 'unlock_pasture' },
    unlock_crystal_polish: { x: 780, y: 880, parent: 'unlock_crystal' },
    unlock_meteor: { x: 640, y: 1000, parent: 'unlock_crystal_polish' },
    unlock_harvest_bounty: { x: 520, y: 1040, parent: 'unlock_meteor' },
    unlock_star_metal: { x: 780, y: 1000, parent: 'unlock_meteor' },
    unlock_auto_factory: { x: 640, y: 1120, parent: 'unlock_star_metal' },
  },
};

const NODE_R = 22;
const CENTER_R = 28;
const nodeRadius = (id) => (id === 'unlock_workbench' ? CENTER_R : NODE_R);

function distPointToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function clipEndpoints(from, to, fromId, toId) {
  const fromR = nodeRadius(fromId);
  const toR = nodeRadius(toId);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const pad = 2;
  return {
    x0: from.x + ux * (fromR + pad),
    y0: from.y + uy * (fromR + pad),
    x1: to.x - ux * (toR + pad),
    y1: to.y - uy * (toR + pad),
  };
}

const ids = Object.keys(layout.nodes);
const issues = [];
for (const childId of ids) {
  const entry = layout.nodes[childId];
  if (!entry.parent) continue;
  const from = layout.nodes[entry.parent];
  const to = entry;
  const ep = clipEndpoints(from, to, entry.parent, childId);
  if (!ep) continue;
  for (const otherId of ids) {
    if (otherId === childId || otherId === entry.parent) continue;
    const o = layout.nodes[otherId];
    const d = distPointToSeg(o.x, o.y, ep.x0, ep.y0, ep.x1, ep.y1);
    if (d < nodeRadius(otherId) + 6) {
      issues.push({ edge: `${entry.parent} -> ${childId}`, through: otherId, dist: Math.round(d) });
    }
  }
}
console.log('line crossings:', JSON.stringify(issues, null, 2));

const overlaps = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = layout.nodes[ids[i]];
    const b = layout.nodes[ids[j]];
    const need = nodeRadius(ids[i]) + 22 + nodeRadius(ids[j]);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < need) overlaps.push({ a: ids[i], b: ids[j], dist: Math.round(d), need });
  }
}
console.log('overlaps:', JSON.stringify(overlaps, null, 2));
