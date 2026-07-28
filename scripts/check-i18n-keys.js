/**
 * Ensure zh-CN / en / ja locale packs share the same flat keys.
 * Usage: node scripts/check-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ids = ['zh-CN', 'en', 'ja'];
const sandbox = { window: {}, console };
sandbox.window = sandbox;

ids.forEach((id) => {
  const code = fs.readFileSync(path.join(root, 'config', 'lang', `${id}.js`), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: `${id}.js` });
});

const packs = sandbox.TRIBE_LOCALES || {};
const base = packs['zh-CN'];
if (!base) {
  console.error('FAIL: missing zh-CN pack');
  process.exit(1);
}

const baseKeys = Object.keys(base).filter((k) => k !== 'meta').sort();
let failed = false;

ids.forEach((id) => {
  const pack = packs[id];
  if (!pack) {
    console.error(`FAIL: missing pack ${id}`);
    failed = true;
    return;
  }
  if (!pack.meta?.label) {
    console.error(`FAIL: ${id} missing meta.label`);
    failed = true;
  }
  const keys = Object.keys(pack).filter((k) => k !== 'meta').sort();
  const missing = baseKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !baseKeys.includes(k));
  if (missing.length || extra.length) {
    console.error(`FAIL: ${id} key mismatch`);
    if (missing.length) console.error('  missing', missing.join(', '));
    if (extra.length) console.error('  extra', extra.join(', '));
    failed = true;
  }
});

if (failed) process.exit(1);
console.log(`OK: ${ids.length} packs, ${baseKeys.length} UI keys each`);
process.exit(0);
