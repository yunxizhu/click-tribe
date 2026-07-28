/**
 * 校验 tech-tree-table 中每条科技都有 description（或 levelEffects）且至少一条 effects；
 * 未知 type / stat / flag / onUnlock 报错。
 *
 * 用法: node scripts/check-tech-effects.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(file, sandbox, append = '') {
  const code = fs.readFileSync(path.join(root, file), 'utf8') + append;
  vm.runInNewContext(code, sandbox, { filename: file });
}

const sandbox = {
  console,
  window: {},
  globalThis: null,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

loadScript('data.js', sandbox, `
globalThis.GAME_DATA = GAME_DATA;
globalThis.TECH_EFFECT_TYPES = TECH_EFFECT_TYPES;
globalThis.TECH_EFFECT_STATS = TECH_EFFECT_STATS;
globalThis.TECH_EFFECT_FLAGS = TECH_EFFECT_FLAGS;
globalThis.TECH_EFFECT_ON_UNLOCK = TECH_EFFECT_ON_UNLOCK;
globalThis.validateTechEffectShape = validateTechEffectShape;
globalThis.applyTechTreeTable = applyTechTreeTable;
globalThis.applyResourcePoints = typeof applyResourcePoints === 'function' ? applyResourcePoints : null;
`);
loadScript('config/resource-points.js', sandbox);
loadScript('config/tech-tree-table.js', sandbox);

const {
  GAME_DATA,
  TECH_EFFECT_TYPES,
  TECH_EFFECT_STATS,
  TECH_EFFECT_FLAGS,
  TECH_EFFECT_ON_UNLOCK,
  validateTechEffectShape,
} = sandbox;

if (!GAME_DATA?.techTree?.length) {
  console.error('FAIL: GAME_DATA.techTree 为空（表未加载？）');
  process.exit(1);
}

const errors = [];
const warnings = [];

function checkEffectList(effects, pathLabel) {
  if (!Array.isArray(effects) || !effects.length) return;
  effects.forEach((e, i) => {
    const p = `${pathLabel}[${i}]`;
    const err = validateTechEffectShape(e, p);
    if (err) errors.push(err);
    if (e?.type === 'stat' && e.stat && !TECH_EFFECT_STATS[e.stat]) {
      errors.push(`${p}: 未知 stat=${e.stat}`);
    }
    if (e?.type === 'unlockFlag' && e.flag && !TECH_EFFECT_FLAGS[e.flag]) {
      errors.push(`${p}: 未知 flag=${e.flag}`);
    }
    if (e?.type === 'onUnlock' && e.action && !TECH_EFFECT_ON_UNLOCK[e.action]) {
      errors.push(`${p}: 未知 onUnlock=${e.action}`);
    }
    if (e?.type && !TECH_EFFECT_TYPES[e.type]) {
      errors.push(`${p}: 未知 type=${e.type}`);
    }
  });
}

function hasDescription(tech) {
  if (String(tech.description || '').trim()) return true;
  if (Array.isArray(tech.levelEffects) && tech.levelEffects.some((le) => String(le?.description || '').trim())) {
    return true;
  }
  return false;
}

function hasEffects(tech) {
  if (Array.isArray(tech.effects) && tech.effects.length) return true;
  if (Array.isArray(tech.levelEffects)
    && tech.levelEffects.some((le) => Array.isArray(le?.effects) && le.effects.length)) {
    return true;
  }
  return false;
}

GAME_DATA.techTree.forEach((tech) => {
  const id = tech.id;
  if (!hasDescription(tech)) {
    errors.push(`${id}: 缺少 description / levelEffects[].description`);
  }
  if (!hasEffects(tech)) {
    errors.push(`${id}: 缺少 effects（纯前置请写 [{ type: "prereqOnly" }]）`);
  }
  checkEffectList(tech.effects, `${id}.effects`);
  if (Array.isArray(tech.levelEffects)) {
    tech.levelEffects.forEach((le, i) => {
      checkEffectList(le?.effects, `${id}.levelEffects[${i}].effects`);
    });
  }
});

const typeCounts = Object.create(null);
GAME_DATA.techTree.forEach((tech) => {
  (tech.effects || []).forEach((e) => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });
  (tech.levelEffects || []).forEach((le) => {
    (le.effects || []).forEach((e) => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });
  });
});

if (errors.length) {
  console.error(`FAIL: ${errors.length} issue(s) across ${GAME_DATA.techTree.length} techs`);
  errors.slice(0, 80).forEach((e) => console.error(' -', e));
  if (errors.length > 80) console.error(` ... and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`OK: ${GAME_DATA.techTree.length} techs, all have description + effects`);
console.log('effect type counts:', JSON.stringify(typeCounts));
if (warnings.length) {
  warnings.forEach((w) => console.warn('warn:', w));
}
process.exit(0);
