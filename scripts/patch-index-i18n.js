/**
 * Patch index.html shell UI with data-i18n (UTF-8 safe).
 * Run: node scripts/patch-index-i18n.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');

if ((html.match(/\uFFFD/g) || []).length) {
  console.error('index.html already has replacement chars; abort');
  process.exit(1);
}

html = html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-i18n-document-title="app.title">');
html = html.replace('<title>点击部落</title>', '<title>Click Tribe</title>');

const mainMenuHome = `        <div class="main-menu-brand" id="main-menu-brand">
          <h1 class="main-menu-title mm-reveal" data-i18n="brand.name">Click Tribe</h1>
          <div class="main-menu-title-line mm-reveal" aria-hidden="true"></div>
        </div>
        <div class="main-menu-home" id="main-menu-home">
          <div class="main-menu-actions mm-reveal">
            <button type="button" class="main-menu-btn" id="mm-start" data-i18n="menu.newGame">New Game</button>
            <button type="button" class="main-menu-btn" id="mm-load" data-i18n="menu.load">Load Save</button>
            <button type="button" class="main-menu-btn" id="mm-settings" data-i18n="menu.settings">Settings</button>
            <button type="button" class="main-menu-btn" id="mm-achievements" data-i18n="menu.achievements">Achievements</button>
            <button type="button" class="main-menu-btn" id="mm-dev" data-i18n="menu.dev">Credits</button>
            <button type="button" class="main-menu-btn" id="mm-quit" data-i18n="menu.quit">Quit</button>
          </div>
        </div>`;

html = html.replace(
  /<div class="main-menu-brand"[\s\S]*?<\/div>\s*<div class="main-menu-home"[\s\S]*?<\/div>\s*(?=<div class="main-menu-panel hidden" id="main-menu-slots">)/,
  `${mainMenuHome}\n`
);

const slots = `      <div class="main-menu-panel hidden" id="main-menu-slots">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" id="mm-slots-title" data-i18n="slots.title">Select Save</h2>
        </div>
        <div class="save-slot-list" id="mm-slots-list" role="list"></div>
        <p class="pause-menu-hint" id="mm-slots-hint" data-i18n="slots.hintDefault">3 save slots (A / B / C)</p>
        <button type="button" class="pause-menu-back" id="mm-slots-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="main-menu-panel hidden" id="main-menu-slots">[\s\S]*?<\/div>\s*(?=\s*<div class="main-menu-panel pause-menu-wide hidden" id="main-menu-settings">)/,
  `${slots}\n\n\n`
);

const mmSettings = `      <div class="main-menu-panel pause-menu-wide hidden" id="main-menu-settings">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="settings.title">Settings</h2>
          <div class="pause-settings-tabs" role="tablist" data-i18n-aria="settings.tabsAria" aria-label="Settings categories">
            <button type="button" class="pause-settings-tab active" role="tab" aria-selected="true" data-mm-settings-tab="display" id="mm-tab-display" data-i18n="settings.tab.display">Display</button>
            <button type="button" class="pause-settings-tab" role="tab" aria-selected="false" data-mm-settings-tab="audio" id="mm-tab-audio" data-i18n="settings.tab.audio">Audio</button>
            <button type="button" class="pause-settings-tab" role="tab" aria-selected="false" data-mm-settings-tab="game" id="mm-tab-game" data-i18n="settings.tab.game">Game</button>
          </div>
        </div>
        <div class="pause-settings-body">
          <div class="pause-settings-pane" id="mm-pane-display" data-mm-settings-pane="display" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="mm-set-display-mode" data-i18n="settings.displayMode">Display mode</label>
              <select id="mm-set-display-mode" class="pause-select">
                <option value="fullscreen" data-i18n="display.fullscreen">Fullscreen</option>
                <option value="windowed" data-i18n="display.windowed">Windowed</option>
              </select>
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="mm-set-display-res" data-i18n="settings.displayRes">Window resolution (windowed mode)</label>
              <select id="mm-set-display-res" class="pause-select"></select>
            </div>
            <p class="pause-menu-hint" id="mm-pause-display-hint"></p>
          </div>
          <div class="pause-settings-pane hidden" id="mm-pane-audio" data-mm-settings-pane="audio" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-check"><input type="checkbox" id="mm-set-bgm-enabled" checked> <span data-i18n="settings.playBgm">Play BGM</span></label>
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="mm-set-vol-master"><span data-i18n="settings.masterVolume">Master volume</span> <span id="mm-set-vol-master-val">70%</span></label>
              <input type="range" id="mm-set-vol-master" class="pause-slider" min="0" max="100" value="70" step="1">
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="mm-set-vol-sfx"><span data-i18n="settings.sfxVolume">Resource SFX</span> <span id="mm-set-vol-sfx-val">100%</span></label>
              <input type="range" id="mm-set-vol-sfx" class="pause-slider" min="0" max="100" value="100" step="1">
            </div>
          </div>
          <div class="pause-settings-pane hidden" id="mm-pane-game" data-mm-settings-pane="game" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="mm-set-locale" data-i18n="settings.language">Language</label>
              <select id="mm-set-locale" class="pause-select"></select>
            </div>
            <div class="pause-setting-block" style="margin-top:16px;">
              <label class="pause-check"><input type="checkbox" id="mm-set-enable-tutorial" checked> <span data-i18n="settings.enableTutorial">Start tutorial</span></label>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.tutorialHint">Automatically start the tutorial on a new run (on by default).</p>
            <div class="pause-setting-block" style="margin-top:16px;">
              <label class="pause-check"><input type="checkbox" id="mm-set-resource-gain-notify" checked> <span data-i18n="settings.resourceGainNotify">Resource gain tips</span></label>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.resourceGainHint">Show tips when gathering, opening chests, or finishing craft jobs (on by default).</p>
            <div class="pause-setting-block" style="margin-top:16px;">
              <button type="button" class="pause-settings-action pause-settings-action-danger" id="mm-set-reset-save" data-i18n="settings.resetSave">Reset saves</button>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.resetSaveHintMain">Clear all A/B/C save progress. This cannot be undone.</p>
          </div>
        </div>
        <button type="button" class="pause-menu-back" id="mm-settings-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="main-menu-panel pause-menu-wide hidden" id="main-menu-settings">[\s\S]*?<button type="button" class="pause-menu-back" id="mm-settings-back">[\s\S]*?<\/button>\s*<\/div>/,
  mmSettings
);

const mmDev = `      <div class="main-menu-panel pause-menu-wide pause-menu-dev-panel hidden" id="main-menu-dev">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="dev.title">Credits</h2>
        </div>
        <div class="pause-settings-body pause-menu-dev-body">
          <p class="pause-menu-dev-status" data-i18n="dev.status">In development</p>
          <p class="pause-menu-dev-label" data-i18n="dev.label">Developer:</p>
          <p class="pause-menu-dev-name">夕云-朱</p>
        </div>
        <button type="button" class="pause-menu-back" id="mm-dev-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="main-menu-panel pause-menu-wide pause-menu-dev-panel hidden" id="main-menu-dev">[\s\S]*?<button type="button" class="pause-menu-back" id="mm-dev-back">[\s\S]*?<\/button>\s*<\/div>/,
  mmDev
);

const mmAch = `      <div class="main-menu-panel pause-menu-wide hidden" id="main-menu-achievements">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="achievements.title">Achievements</h2>
        </div>
        <div class="pause-settings-body achievements-body">
          <p class="achievements-summary" data-achievements-summary></p>
          <div class="achievements-list" data-achievements-list></div>
        </div>
        <button type="button" class="pause-menu-back" id="mm-achievements-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="main-menu-panel pause-menu-wide hidden" id="main-menu-achievements">[\s\S]*?<button type="button" class="pause-menu-back" id="mm-achievements-back">[\s\S]*?<\/button>\s*<\/div>/,
  mmAch
);

html = html.replace(
  /<button type="button" class="bgm-now-btn main-menu-bgm-now mm-reveal" id="mm-bgm-now"[^>]*>/,
  '<button type="button" class="bgm-now-btn main-menu-bgm-now mm-reveal" id="mm-bgm-now" data-i18n-title="bgm.switchTitle" data-i18n-aria="bgm.switchAria" title="Click to switch BGM" aria-label="Now playing, click to switch">'
);

const diff = `  <div id="difficulty-select" class="defense-intro boot-overlay hidden">
    <div class="defense-intro-dialog">
      <h3 data-i18n="diff.title">Choose Difficulty</h3>
      <p data-i18n="diff.subtitle">Pick a difficulty that fits you</p>
      <div class="difficulty-options" id="difficulty-options">
        <button type="button" class="diff-btn" data-difficulty="peaceful" data-i18n="diff.peaceful">☮️ Peaceful</button>
        <button type="button" class="diff-btn" data-difficulty="normal" data-i18n="diff.normal">⚖️ Normal</button>
        <button type="button" class="diff-btn" data-difficulty="hard" data-i18n="diff.hard">💀 Hard</button>
        <button type="button" class="diff-btn" data-difficulty="hell" data-i18n="diff.hell">🔥 Hell</button>
      </div>
      <p id="diff-desc" class="diff-desc"></p>
      <button type="button" class="diff-back-btn" id="diff-back" data-i18n="common.back">Back</button>
      <p class="diff-esc-hint" data-i18n="diff.escHint">Esc also goes back</p>
    </div>
  </div>`;

html = html.replace(
  /<div id="difficulty-select" class="defense-intro boot-overlay hidden">[\s\S]*?<\/div>\s*(?=\s*<!-- 选完难度)/,
  `${diff}\n\n`
);

const bootTrans = `  <div id="boot-transition" class="boot-transition hidden" aria-live="polite">
    <div class="boot-transition-inner">
      <div class="boot-spinner-wrap boot-spinner-wrap-lg" aria-hidden="true">
        <div class="boot-spinner boot-spinner-outer"></div>
        <div class="boot-spinner boot-spinner-inner"></div>
      </div>
      <p class="boot-transition-brand" data-i18n="brand.name">Click Tribe</p>
      <p class="boot-transition-text" id="boot-transition-text" data-i18n="boot.entering">Entering the village…</p>
      <p class="boot-transition-sub" data-i18n="boot.loading">Loading</p>
    </div>
  </div>`;

html = html.replace(
  /<div id="boot-transition" class="boot-transition hidden" aria-live="polite">[\s\S]*?<\/div>\s*(?=\s*<div id="app")/,
  `${bootTrans}\n\n`
);

html = html.replace(
  /<h1>🏕️ 点击部落 <span id="diff-label"/,
  '<h1>🏕️ <span data-i18n="brand.name">Click Tribe</span> <span id="diff-label"'
);

html = html.replace(
  /<button type="button" class="bgm-now-btn" id="game-bgm-now"[^>]*>/,
  '<button type="button" class="bgm-now-btn" id="game-bgm-now" data-i18n-title="bgm.switchTitle" data-i18n-aria="bgm.switchAria" title="Click to switch BGM" aria-label="Now playing, click to switch">'
);

const pauseHome = `      <div class="pause-menu-panel" id="pause-menu-home">
        <h2 id="pause-menu-title" data-i18n="pause.title">Game Menu</h2>
        <button type="button" class="pause-menu-btn" id="pause-resume" data-i18n="pause.resume">Resume</button>
        <button type="button" class="pause-menu-btn" id="pause-settings" data-i18n="pause.settings">Settings</button>
        <button type="button" class="pause-menu-btn" id="pause-achievements" data-i18n="pause.achievements">Achievements</button>
        <button type="button" class="pause-menu-btn" id="pause-to-main" data-i18n="pause.toMain">Main Menu</button>
        <button type="button" class="pause-menu-btn" id="pause-dev" data-i18n="pause.dev">Credits</button>
        <button type="button" class="pause-menu-btn pause-menu-btn-danger" id="pause-quit" data-i18n="pause.quit">Quit</button>
        <p class="pause-menu-hint" data-i18n="pause.escHint">Press Esc to close</p>
      </div>`;

html = html.replace(
  /<div class="pause-menu-panel" id="pause-menu-home">[\s\S]*?<\/div>\s*(?=\s*<div class="pause-menu-panel pause-menu-wide hidden" id="pause-menu-settings">)/,
  `${pauseHome}\n\n`
);

const pauseSettings = `      <div class="pause-menu-panel pause-menu-wide hidden" id="pause-menu-settings">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="settings.title">Settings</h2>
          <div class="pause-settings-tabs" role="tablist" data-i18n-aria="settings.tabsAria" aria-label="Settings categories">
            <button type="button" class="pause-settings-tab active" role="tab" aria-selected="true" data-settings-tab="display" id="pause-tab-display" data-i18n="settings.tab.display">Display</button>
            <button type="button" class="pause-settings-tab" role="tab" aria-selected="false" data-settings-tab="audio" id="pause-tab-audio" data-i18n="settings.tab.audio">Audio</button>
            <button type="button" class="pause-settings-tab" role="tab" aria-selected="false" data-settings-tab="game" id="pause-tab-game" data-i18n="settings.tab.game">Game</button>
          </div>
        </div>
        <div class="pause-settings-body">
          <div class="pause-settings-pane" id="pause-pane-display" data-settings-pane="display" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="set-display-mode" data-i18n="settings.displayMode">Display mode</label>
              <select id="set-display-mode" class="pause-select">
                <option value="fullscreen" data-i18n="display.fullscreen">Fullscreen</option>
                <option value="windowed" data-i18n="display.windowed">Windowed</option>
              </select>
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="set-display-res" data-i18n="settings.displayRes">Window resolution (windowed mode)</label>
              <select id="set-display-res" class="pause-select"></select>
            </div>
            <p class="pause-menu-hint" id="pause-display-hint"></p>
          </div>
          <div class="pause-settings-pane hidden" id="pause-pane-audio" data-settings-pane="audio" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-check"><input type="checkbox" id="set-bgm-enabled" checked> <span data-i18n="settings.playBgm">Play BGM</span></label>
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="set-vol-master"><span data-i18n="settings.masterVolume">Master volume</span> <span id="set-vol-master-val">70%</span></label>
              <input type="range" id="set-vol-master" class="pause-slider" min="0" max="100" value="70" step="1">
            </div>
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="set-vol-sfx"><span data-i18n="settings.sfxVolume">Resource SFX</span> <span id="set-vol-sfx-val">100%</span></label>
              <input type="range" id="set-vol-sfx" class="pause-slider" min="0" max="100" value="100" step="1">
            </div>
          </div>
          <div class="pause-settings-pane hidden" id="pause-pane-game" data-settings-pane="game" role="tabpanel">
            <div class="pause-setting-block">
              <label class="pause-setting-label" for="set-locale" data-i18n="settings.language">Language</label>
              <select id="set-locale" class="pause-select"></select>
            </div>
            <div class="pause-setting-block" style="margin-top:16px;">
              <label class="pause-check"><input type="checkbox" id="set-enable-tutorial" checked> <span data-i18n="settings.enableTutorial">Start tutorial</span></label>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.tutorialHint">Automatically start the tutorial on a new run (on by default).</p>
            <div class="pause-setting-block" style="margin-top:16px;">
              <label class="pause-check"><input type="checkbox" id="set-resource-gain-notify" checked> <span data-i18n="settings.resourceGainNotify">Resource gain tips</span></label>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.resourceGainHint">Show tips when gathering, opening chests, or finishing craft jobs (on by default).</p>
            <div class="pause-setting-block" style="margin-top:16px;">
              <button type="button" class="pause-settings-action pause-settings-action-danger" id="set-reset-save" data-i18n="settings.resetSave">Reset saves</button>
            </div>
            <p class="pause-menu-hint" data-i18n="settings.resetSaveHintPause">Clear current progress and pick difficulty again. This cannot be undone.</p>
          </div>
        </div>
        <button type="button" class="pause-menu-back" id="pause-settings-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="pause-menu-panel pause-menu-wide hidden" id="pause-menu-settings">[\s\S]*?<button type="button" class="pause-menu-back" id="pause-settings-back">[\s\S]*?<\/button>\s*<\/div>/,
  pauseSettings
);

const pauseDev = `      <div class="pause-menu-panel pause-menu-wide pause-menu-dev-panel hidden" id="pause-menu-dev">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="dev.title">Credits</h2>
        </div>
        <div class="pause-settings-body pause-menu-dev-body">
          <p class="pause-menu-dev-status" data-i18n="dev.status">In development</p>
          <p class="pause-menu-dev-label" data-i18n="dev.label">Developer:</p>
          <p class="pause-menu-dev-name">夕云-朱</p>
        </div>
        <button type="button" class="pause-menu-back" id="pause-dev-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="pause-menu-panel pause-menu-wide pause-menu-dev-panel hidden" id="pause-menu-dev">[\s\S]*?<button type="button" class="pause-menu-back" id="pause-dev-back">[\s\S]*?<\/button>\s*<\/div>/,
  pauseDev
);

const pauseAch = `      <div class="pause-menu-panel pause-menu-wide hidden" id="pause-menu-achievements">
        <div class="pause-sub-header">
          <h2 class="pause-sub-title" data-i18n="achievements.title">Achievements</h2>
        </div>
        <div class="pause-settings-body achievements-body">
          <p class="achievements-summary" data-achievements-summary></p>
          <div class="achievements-list" data-achievements-list></div>
        </div>
        <button type="button" class="pause-menu-back" id="pause-achievements-back" data-i18n="common.back">Back</button>
      </div>`;

html = html.replace(
  /<div class="pause-menu-panel pause-menu-wide hidden" id="pause-menu-achievements">[\s\S]*?<button type="button" class="pause-menu-back" id="pause-achievements-back">[\s\S]*?<\/button>\s*<\/div>/,
  pauseAch
);

html = html.replace(
  /<script src="data\.js\?v=[^"]+"><\/script>\s*<script src="boot\.js\?v=[^"]+"><\/script>/,
  '<script src="data.js?v=20260728.2"></script>\n  <script src="i18n.js?v=20260728.2"></script>\n  <script src="boot.js?v=20260728.2"></script>'
);

html = html.replace(/style\.css\?v=[0-9.]+/, 'style.css?v=20260728.2');
html = html.replace(/>v2026[0-9.]+</, '>v20260728.2<');

if ((html.match(/\uFFFD/g) || []).length) {
  console.error('patch introduced replacement chars');
  process.exit(1);
}
if (!html.includes('id="mm-set-locale"') || !html.includes('id="set-locale"')) {
  console.error('locale selects missing');
  process.exit(1);
}
if (!html.includes('i18n.js')) {
  console.error('i18n.js script tag missing');
  process.exit(1);
}

fs.writeFileSync(file, html, 'utf8');
console.log('patched index.html, data-i18n count', (html.match(/data-i18n=/g) || []).length);
