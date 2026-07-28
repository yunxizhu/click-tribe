/**
 * 将 data.js 中科技 description 迁入 config/tech-tree-table.js
 *（单级 → description；多级 → levelEffects[]）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function runFile(filePath, sandbox, extra = '') {
  const code = fs.readFileSync(filePath, 'utf8') + extra;
  vm.runInNewContext(code, sandbox, { filename: filePath });
}

const sandbox = {
  console,
  window: {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

runFile(path.join(root, 'data.js'), sandbox, `
  globalThis.GAME_DATA = GAME_DATA;
  globalThis.applyResourcePoints = applyResourcePoints;
  globalThis.applyTechTreeTable = applyTechTreeTable;
  globalThis.injectPointUpgradeTechs = injectPointUpgradeTechs;
`);

runFile(path.join(root, 'config', 'resource-points.js'), sandbox);
runFile(path.join(root, 'config', 'tech-tree-table.js'), sandbox);

const GAME_DATA = sandbox.GAME_DATA;
const table = JSON.parse(JSON.stringify(sandbox.TECH_TREE_TABLE || sandbox.window.TECH_TREE_TABLE));
if (!GAME_DATA?.techTree || !table?.techs) {
  console.error('missing GAME_DATA.techTree or TECH_TREE_TABLE');
  process.exit(1);
}

function multiMax(tech, row) {
  const max = Math.max(Number(row.maxRepeat) || 0, Number(tech.maxRepeat) || 0);
  if (max > 1 && (tech.repeatable || tech.pointId)) return max;
  return 0;
}

let nDesc = 0;
let nLevels = 0;

GAME_DATA.techTree.forEach((tech) => {
  const row = table.techs[tech.id];
  if (!row) return;
  const max = multiMax(tech, row);
  const baseDesc = String(tech.description || '');
  if (max > 0) {
    const existing = Array.isArray(row.levelEffects) ? row.levelEffects : [];
    const techEffects = Array.isArray(tech.levelEffects) ? tech.levelEffects : [];
    row.maxRepeat = max;
    row.levelEffects = [];
    for (let i = 0; i < max; i++) {
      const fromRow = existing[i];
      const fromTech = techEffects[i];
      row.levelEffects.push({
        ...(fromRow && typeof fromRow === 'object' ? { ...fromRow } : {}),
        ...(fromTech && typeof fromTech === 'object' ? { ...fromTech } : {}),
        description: String(
          fromRow?.description
          || fromTech?.description
          || baseDesc
          || ''
        ),
      });
    }
    row.description = row.levelEffects[0]?.description || baseDesc;
    nLevels++;
  } else {
    if (row.description == null || row.description === '') {
      row.description = baseDesc;
    }
    delete row.levelEffects;
    nDesc++;
  }
});

table.version = Math.max(Number(table.version) || 0, 21) + 1;

const body = [
  '/** Tech tree table: layout / requires / cost / maxRepeat / repeatCosts / description / levelEffects. */',
  `window.TECH_TREE_TABLE = ${JSON.stringify(table, null, 2)};`,
  'if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'config', 'tech-tree-table.js'), body, 'utf8');
console.log(`migrated descriptions: single=${nDesc}, multi=${nLevels}, version=${table.version}`);
