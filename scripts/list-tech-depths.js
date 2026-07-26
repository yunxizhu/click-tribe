const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8')
  .replace(/\bconst GAME_DATA\b/, 'var GAME_DATA');
eval(code);

const byId = Object.fromEntries(GAME_DATA.techTree.map((t) => [t.id, t]));
function reqs(t) {
  if (!t || t.requires == null) return [];
  return Array.isArray(t.requires) ? t.requires : [t.requires];
}
function depthFirst(id, memo = new Map()) {
  if (memo.has(id)) return memo.get(id);
  if (!id || id === 'unlock_workbench') {
    memo.set(id, 0);
    return 0;
  }
  const r = reqs(byId[id])[0];
  const v = r ? 1 + depthFirst(r, memo) : 0;
  memo.set(id, v);
  return v;
}

const base = GAME_DATA.techTree.filter((t) => !t.id.startsWith('point_up_'));
base
  .map((t) => ({ id: t.id, d: depthFirst(t.id), req: reqs(t)[0], branch: t.branch }))
  .sort((a, b) => b.d - a.d || a.id.localeCompare(b.id))
  .forEach((x) => console.log(`${x.d}\t${x.id}\t<= ${x.req || '-'}\t(${x.branch})`));
