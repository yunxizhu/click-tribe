/** 验证资源点升级科技与布局 */
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8')
  .replace(/\bconst GAME_DATA\b/, 'var GAME_DATA');
eval(code);

const nodes = GAME_DATA.techTreeLayout.nodes;
const techIds = GAME_DATA.techTree.map(t => t.id);
const missingLayout = techIds.filter(id => !nodes[id]);
const pointUp = techIds.filter(id => id.startsWith('point_up_'));

console.log('tech count:', techIds.length);
console.log('layout count:', Object.keys(nodes).length);
console.log('point upgrade techs:', pointUp.length);
console.log('missing layout:', missingLayout.length, missingLayout.slice(0, 8));

const NODE_R = 22;
const overlaps = [];
const ids = Object.keys(nodes);
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = nodes[ids[i]];
    const b = nodes[ids[j]];
    const need = NODE_R + 22 + NODE_R;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < need) overlaps.push({ a: ids[i], b: ids[j], dist: Math.round(d), need });
  }
}
console.log('overlaps:', overlaps.length);
if (overlaps.length) console.log(JSON.stringify(overlaps.slice(0, 15), null, 2));
