const fs = require('fs');
const path = require('path');
const https = require('https');

// Collect all emoji from source files
const files = [
  'index.html', 'game.js', 'data.js', 'defense.js', 'style.css',
  'config/tool-recipes.js', 'config/combat-units.js',
  'config/resource-points.js', 'config/tech-tree-table.js'
];

const srcDir = 'C:\\Users\\Galaxy\\OneDrive\\桌面\\1232123\\click-tribe';
const outDir = path.join(srcDir, 'image', 'icon');

// Emoji ranges
function isEmoji(cp) {
  return (cp >= 0x2600 && cp <= 0x27BF) ||    // Misc symbols, dingbats
         (cp >= 0x2300 && cp <= 0x23FF) ||    // Misc technical
         (cp >= 0x25A0 && cp <= 0x25FF) ||    // Geometric shapes
         (cp >= 0x2700 && cp <= 0x27BF) ||    // Dingbats
         (cp >= 0x2B00 && cp <= 0x2BFF) ||    // Misc symbols and arrows
         (cp >= 0x1F000 && cp <= 0x1FFFF) ||  // Supplemental symbols
         (cp >= 0x200D && cp <= 0x200D) ||    // ZWJ
         (cp >= 0xFE00 && cp <= 0xFE0F) ||    // Variation selectors
         cp === 0x00A9 || cp === 0x00AE ||     // © ®
         (cp >= 0x203C && cp <= 0x3299);
}

function charToHexSeq(ch) {
  const cps = [];
  for (const cp of ch) {
    cps.push(cp.codePointAt(0).toString(16));
  }
  // Filter out FE0F (variation selector-16) for twemoji
  return cps.filter(cp => cp !== 'fe0f').join('-');
}

// Read all files and extract emoji
const allEmoji = new Set();
const emojiDetails = [];

function processFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) { return; }
  
  for (let i = 0; i < content.length; i++) {
    const cp = content.codePointAt(i);
    if (cp === undefined) continue;
    
    if (isEmoji(cp)) {
      const ch = String.fromCodePoint(cp);
      // Handle surrogate pairs
      const end = ch.length;
      const actual = content.slice(i, i + end);
      // Check for VS16 following
      let fullSeq = actual;
      while (i + fullSeq.length < content.length) {
        const next = content.codePointAt(i + fullSeq.length);
        if (next === 0xFE0F) {
          fullSeq += String.fromCodePoint(0xFE0F);
        } else {
          break;
        }
      }
      
      if (!allEmoji.has(fullSeq)) {
        allEmoji.add(fullSeq);
        const hex = charToHexSeq(fullSeq);
        emojiDetails.push({ char: fullSeq, hex, file: path.relative(srcDir, filePath), context: content.slice(Math.max(0, i - 10), i + 20).replace(/\n/g, ' ') });
      }
    }
  }
}

for (const f of files) {
  processFile(path.join(srcDir, f));
}

console.log(`Found ${emojiDetails.length} unique emoji sequences`);
emojiDetails.forEach(e => console.log(`  ${e.char} → ${e.hex}.png  (${e.file})`));

// Download from twemoji CDN
const baseUrl = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72';
let downloaded = 0;
let failed = 0;

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false);
      }
    }).on('error', err => {
      file.close();
      fs.unlink(dest, () => {});
      resolve(false);
    });
  });
}

(async () => {
  console.log('\nDownloading...');
  for (const e of emojiDetails) {
    const dest = path.join(outDir, `${e.hex}.png`);
    if (fs.existsSync(dest)) {
      downloaded++;
      continue;
    }
    const url = `${baseUrl}/${e.hex}.png`;
    const ok = await download(url, dest);
    if (ok) {
      downloaded++;
    } else {
      failed++;
      console.log(`  FAILED: ${e.char} (${e.hex})`);
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`\nDone: ${downloaded} downloaded/skipped, ${failed} failed`);
  // Write mapping file
  const map = {};
  emojiDetails.forEach(e => { map[e.char] = e.hex; });
  fs.writeFileSync(path.join(outDir, '_mapping.json'), JSON.stringify(map, null, 2));
  console.log('Mapping saved to image/icon/_mapping.json');
})();
