const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8')
  .replace(/\bconst GAME_DATA\b/, 'var GAME_DATA');
eval(code);

const nodes = GAME_DATA.techTreeLayout.nodes;
const ids = Object.keys(nodes);
const CENTER = 'unlock_workbench';
const NODE_R = 22;
const CENTER_R = 28;
const rad = (id) => (id === CENTER ? CENTER_R : NODE_R);

const depthMemo = {};
const depth = (id) => {
  if (depthMemo[id] != null) return depthMemo[id];
  const n = nodes[id];
  if (!n || !n.parent) return (depthMemo[id] = 0);
  return (depthMemo[id] = depth(n.parent) + 1);
};

const branchOf = (id) => {
  let cur = id;
  while (nodes[cur]?.parent && nodes[cur].parent !== CENTER) cur = nodes[cur].parent;
  const n = nodes[cur];
  const c = nodes[CENTER];
  const dx = n.x - c.x;
  const dy = n.y - c.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
};

const branches = { up: [], down: [], left: [], right: [] };
ids.filter((id) => id !== CENTER && !id.startsWith('point_up_')).forEach((id) => {
  branches[branchOf(id)].push({ id, d: depth(id) });
});

console.log('=== layout-parent depth by branch (base techs) ===');
for (const q of ['up', 'right', 'down', 'left']) {
  const arr = branches[q];
  const max = Math.max(0, ...arr.map((a) => a.d));
  console.log(q, 'maxDepth', max, 'count', arr.length);
  console.log(
    ' ',
    arr
      .sort((a, b) => b.d - a.d)
      .slice(0, 8)
      .map((a) => `${a.id}@${a.d}`)
      .join(', ')
  );
}

// parent sync check
const byId = Object.fromEntries(GAME_DATA.techTree.map((t) => [t.id, t]));
const mismatches = [];
ids.filter((id) => !id.startsWith('point_up_')).forEach((id) => {
  const tech = byId[id];
  if (!tech) return;
  const req = tech.requires == null ? null : Array.isArray(tech.requires) ? tech.requires[0] : tech.requires;
  const parent = nodes[id].parent ?? null;
  if (req !== parent) mismatches.push({ id, req, parent });
});
console.log('parent/requires[0] mismatches', mismatches.length, mismatches.slice(0, 10));

// overlaps
let overlaps = 0;
const overlapSamples = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = nodes[ids[i]];
    const b = nodes[ids[j]];
    const need = rad(ids[i]) + 22 + rad(ids[j]);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < need) {
      overlaps++;
      if (overlapSamples.length < 12) overlapSamples.push([ids[i], ids[j], Math.round(d)]);
    }
  }
}
console.log('overlaps', overlaps, overlapSamples);

// missing layout
const missing = GAME_DATA.techTree.map((t) => t.id).filter((id) => !nodes[id]);
console.log('missing layout', missing.length, missing.slice(0, 10));
