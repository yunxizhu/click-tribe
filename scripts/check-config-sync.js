const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const boot = fs.readFileSync(path.join(root, 'boot.js'), 'utf8');
const bootMatch = boot.match(/EXTERNAL_CONFIGS\s*=\s*\[([\s\S]*?)\]/);
if (!bootMatch) {
  console.error('boot EXTERNAL_CONFIGS missing');
  process.exit(1);
}
const bootConfigs = [...bootMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);

const pack = fs.readFileSync(path.join(root, 'scripts', 'pack-game.js'), 'utf8');
const packMatch = pack.match(/CONFIG_FILES\s*=\s*\[([\s\S]*?)\]/);
const packConfigs = [...packMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);

console.log('boot', bootConfigs.join(', '));
console.log('pack', packConfigs.join(', '));
const missingInBoot = packConfigs.filter((f) => !bootConfigs.includes(f));
const extraInBoot = bootConfigs.filter((f) => !packConfigs.includes(f));
if (missingInBoot.length || extraInBoot.length) {
  console.error('OUT_OF_SYNC', { missingInBoot, extraInBoot });
  process.exit(1);
}
for (const f of packConfigs) {
  if (!fs.existsSync(path.join(root, 'config', f))) {
    console.error('MISSING_FILE', f);
    process.exit(1);
  }
}
console.log('CONFIG_SYNC_OK');
