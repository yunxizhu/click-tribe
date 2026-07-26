const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const ctx = {};
vm.runInNewContext(`${code}\nthis.GAME_DATA=GAME_DATA;`, ctx);
const G = ctx.GAME_DATA;
const techs = {};
G.techTree.forEach((t) => {
  if (String(t.id).startsWith('point_up_')) return;
  const n = G.techTreeLayout.nodes[t.id] || {};
  techs[t.id] = {
    x: n.x ?? 0,
    y: n.y ?? 0,
    parent: n.parent ?? null,
    requires: t.requires === undefined ? null : JSON.parse(JSON.stringify(t.requires)),
    cost: t.cost ? JSON.parse(JSON.stringify(t.cost)) : {},
  };
});
const table = { version: 1, canvas: G.techTreeLayout.canvas, techs };
const out = [
  '/** 科技树数据表：布局 / 依赖 / 费用。由编辑器导出，运行时优先读取。 */',
  `window.TECH_TREE_TABLE = ${JSON.stringify(table, null, 2)};`,
  'if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'config', 'tech-tree-table.js'), out);
console.log('exported', Object.keys(techs).length, 'techs');
