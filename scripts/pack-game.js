/**
 * Electron 打包：
 * - 游戏代码打进 asar（白名单，避免打入 node_modules/dist 等）
 * - config/、music/、image/ 放在 exe 同级，可单独替换
 * - 输出：output/点击部落-win32-x64/
 *
 * 用法：npm run pack  或双击 一键打包.bat
 */
const packager = require('electron-packager');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'output');
const productName = '点击部落';
const platform = 'win32';
const arch = 'x64';
const releaseDir = path.join(outDir, `${productName}-${platform}-${arch}`);

const KEEP_FILES = new Set([
  'package.json',
  'electron-main.js',
  'electron-preload.js',
  'index.html',
  'boot.js',
  'data.js',
  'i18n.js',
  'game.js',
  'defense.js',
  'bgm.js',
  'sounds.js',
  'style.css',
  'tech-tree-editor.js',
]);

const CONFIG_FILES = [
  'tool-recipes.js',
  'resource-points.js',
  'combat-units.js',
  'tech-tree-table.js',
  'lang/zh-CN.js',
  'lang/en.js',
  'lang/ja.js',
];

const KEEP_LOCALES = new Set(['zh-CN.pak', 'en-US.pak']);

function fail(msg) {
  console.error('[pack]', msg);
  process.exit(1);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function dirSizeMb(dir) {
  let sum = 0;
  if (!fs.existsSync(dir)) return 0;
  const walk = (p) => {
    for (const name of fs.readdirSync(p)) {
      const full = path.join(p, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else sum += st.size;
    }
  };
  walk(dir);
  return sum / (1024 * 1024);
}

/** electron-packager 在 Windows 上路径常为 /xxx，需规范化 */
function toRelPosix(filePath) {
  let s = String(filePath || '').replace(/\\/g, '/');
  const rootPosix = root.replace(/\\/g, '/').replace(/\/$/, '');
  if (s.toLowerCase().startsWith(rootPosix.toLowerCase() + '/')) {
    s = s.slice(rootPosix.length + 1);
  }
  return s.replace(/^\.\//, '').replace(/^\/+/, '');
}

function shouldIgnore(filePath) {
  const rel = toRelPosix(filePath);
  if (!rel || rel === '.' || rel === '') return false;
  const parts = rel.split('/').filter(Boolean);
  if (parts.length > 1) return true;
  return !KEEP_FILES.has(parts[0]);
}

function pruneLocales(builtDir) {
  const localesDir = path.join(builtDir, 'locales');
  if (!fs.existsSync(localesDir)) return 0;
  let removed = 0;
  for (const name of fs.readdirSync(localesDir)) {
    if (KEEP_LOCALES.has(name)) continue;
    const full = path.join(localesDir, name);
    try {
      removed += fs.statSync(full).size;
      fs.unlinkSync(full);
    } catch (_) { /* ignore */ }
  }
  return removed / (1024 * 1024);
}

async function main() {
  const configSrc = path.join(root, 'config');
  const musicSrc = path.join(root, 'music');
  const imageSrc = path.join(root, 'image');

  if (!fs.existsSync(configSrc)) fail('缺少 config/ 目录');
  for (const f of CONFIG_FILES) {
    if (!fs.existsSync(path.join(configSrc, f))) {
      fail(`缺少配置文件 config/${f}`);
    }
  }

  // 防止再漏接：pack 清单必须与 boot.js EXTERNAL_CONFIGS 一致
  const bootSrc = fs.readFileSync(path.join(root, 'boot.js'), 'utf8');
  const bootMatch = bootSrc.match(/EXTERNAL_CONFIGS\s*=\s*\[([\s\S]*?)\]/);
  if (!bootMatch) fail('boot.js 未找到 EXTERNAL_CONFIGS，请与 CONFIG_FILES 同步');
  const bootConfigs = [...bootMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const missingInBoot = CONFIG_FILES.filter((f) => !bootConfigs.includes(f));
  const extraInBoot = bootConfigs.filter((f) => !CONFIG_FILES.includes(f));
  if (missingInBoot.length || extraInBoot.length) {
    fail(
      'config 清单不一致：\n'
      + (missingInBoot.length ? `  pack 有、boot 无: ${missingInBoot.join(', ')}\n` : '')
      + (extraInBoot.length ? `  boot 有、pack 无: ${extraInBoot.join(', ')}\n` : '')
      + '请同步 scripts/pack-game.js CONFIG_FILES 与 boot.js EXTERNAL_CONFIGS'
    );
  }

  if (!fs.existsSync(musicSrc)) {
    console.warn('[pack] 警告：缺少 music/，将打出空音乐目录');
  }
  if (!fs.existsSync(imageSrc)) {
    console.warn('[pack] 警告：缺少 image/，主菜单/漫画背景将缺失');
  }

  console.log('[pack] electron-packager …');
  let appPaths;
  try {
    appPaths = await packager({
      dir: root,
      name: productName,
      platform,
      arch,
      out: outDir,
      overwrite: true,
      asar: true,
      ignore: shouldIgnore,
      prune: true,
      electronLanguages: ['zh-CN', 'en-US'],
    });
  } catch (err) {
    console.error(err);
    fail('electron-packager 失败');
  }

  const built = appPaths && appPaths[0] ? appPaths[0] : releaseDir;
  if (!fs.existsSync(built)) fail(`未找到输出目录：${built}`);

  const asarPath = path.join(built, 'resources', 'app.asar');
  if (fs.existsSync(asarPath)) {
    const asarMb = fs.statSync(asarPath).size / (1024 * 1024);
    console.log(`[pack] app.asar ≈ ${asarMb.toFixed(1)} MB`);
    if (asarMb > 20) {
      console.warn('[pack] 警告：asar 偏大，可能误打入多余文件');
    }
  }

  const localeSaved = pruneLocales(built);
  if (localeSaved > 0) {
    console.log(`[pack] 已裁剪多余语言包，约省 ${localeSaved.toFixed(1)} MB`);
  }

  console.log('[pack] 复制外置 config/ …');
  const configDest = path.join(built, 'config');
  ensureDir(configDest);
  for (const f of CONFIG_FILES) {
    copyFile(path.join(configSrc, f), path.join(configDest, f));
  }
  fs.writeFileSync(
    path.join(configDest, '说明.txt'),
    [
      '外置配置（改完后重启游戏生效，无需重打 exe）',
      '',
      '  tool-recipes.js     — 工具/武器/护甲配方、持工具效率、工具耐久',
      '  resource-points.js  — 各资源点初始计数值与冷却',
      '  combat-units.js     — 敌我单位属性、武器表、波次',
      '  tech-tree-table.js  — 科技树布局 / 依赖 / 费用',
      '',
    ].join('\r\n'),
    'utf8'
  );

  console.log('[pack] 复制外置 music/ …');
  const musicDest = path.join(built, 'music');
  if (fs.existsSync(musicSrc)) copyDir(musicSrc, musicDest);
  else ensureDir(musicDest);
  fs.writeFileSync(
    path.join(musicDest, '说明.txt'),
    ['背景音乐目录（与 exe 同级）', '可替换同名 mp3，重启后生效。', ''].join('\r\n'),
    'utf8'
  );

  console.log('[pack] 复制外置 image/ …');
  const imageDest = path.join(built, 'image');
  if (fs.existsSync(imageSrc)) copyDir(imageSrc, imageDest);
  else ensureDir(imageDest);
  fs.writeFileSync(
    path.join(imageDest, '说明.txt'),
    [
      '图片资源目录（与 exe 同级）',
      '',
      '  cafee80e0ce868.png              — 主菜单背景',
      '  background_introduction/       — 开局漫画分镜 1~9',
      '',
      '可替换同名文件，重启后生效。',
      '',
    ].join('\r\n'),
    'utf8'
  );

  console.log('[pack] 准备外置 saves/（始终空档，不拷贝开发存档）…');
  const savesDest = path.join(built, 'saves');
  ensureDir(savesDest);
  // 清空目录内一切内容，保证发行包固定为空存档
  for (const name of fs.readdirSync(savesDest)) {
    fs.rmSync(path.join(savesDest, name), { recursive: true, force: true });
  }
  fs.writeFileSync(
    path.join(savesDest, '说明.txt'),
    [
      '游戏存档目录（与 exe 同级）',
      '',
      '  factoryGame.json  — 旧单档（启动时自动迁到 slot-a.json）',
      '  slot-a/b/c.json   — A/B/C 三档存档（运行后自动生成）',
      '  settings.json     — 显示/音量设置（运行后自动生成）',
      '',
      '打包时此目录为空；首次运行后生成上述文件。',
      '备份/换机：复制本文件夹即可。删除 json 等于清空进度或重置设置。',
      '',
    ].join('\r\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(built, '外置资源说明.txt'),
    [
      '点击部落 — Electron 版',
      '',
      '【可单独替换】config/  music/  image/  saves/',
      '【勿改】exe 与 resources/ 等运行库',
      '',
      '替换配置、音乐或图片后请完全关闭再重新打开。',
      '',
    ].join('\r\n'),
    'utf8'
  );

  console.log(`[pack] 完成 → ${built}`);
  console.log(`[pack] 总大小约 ${dirSizeMb(built).toFixed(0)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
