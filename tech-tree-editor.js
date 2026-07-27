/**
 * Tech tree visual editor (dev)
 * Drag / edit parents(cost/requires) / Ctrl+Z; save via header button
 */
(function attachTechTreeEditor() {
  const Ctor = typeof FactoryGame !== 'undefined' ? FactoryGame : null;
  if (!Ctor) {
    console.warn('[TechTreeEditor] FactoryGame missing');
    return;
  }

  const STORAGE_KEY = 'techTreeTable';
  const NODE_RADII = { small: 30, medium: 45, large: 60 };
  const CENTER_RADII = { small: 38, medium: 56, large: 75 };

  function normalizeNodeSize(size) {
    return size === 'small' || size === 'large' ? size : 'medium';
  }

  function getLayoutNodeSize(node) {
    return normalizeNodeSize(node?.size);
  }

  function setLayoutNodeSize(node, size) {
    const next = normalizeNodeSize(size);
    if (next === 'medium') delete node.size;
    else node.size = next;
  }

  function nodeHalf(techId) {
    const node = GAME_DATA.techTreeLayout?.nodes?.[techId];
    const size = getLayoutNodeSize(node);
    return techId === 'unlock_workbench' ? CENTER_RADII[size] : NODE_RADII[size];
  }

  function applyNodeSizeClass(el, node) {
    if (!el) return;
    const size = getLayoutNodeSize(node);
    el.classList.remove('tech-size-small', 'tech-size-medium', 'tech-size-large');
    el.classList.add(`tech-size-${size}`);
  }

  function isPointUpgradeTechId(id) {
    return !!id && String(id).startsWith('point_up_');
  }

  /** 可选中编辑布局的节点（含资源精炼等 point_up） */
  function isSelectableTechId(id) {
    return !!id && !!(GAME_DATA.techTreeLayout?.nodes?.[id]);
  }

  function parseIdList(raw) {
    return String(raw || '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function normalizeParents(list) {
    const out = [];
    const seen = new Set();
    (list || []).forEach((id) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out;
  }

  function setLayoutParents(node, parentIds) {
    const parents = normalizeParents(parentIds);
    if (parents.length > 1) {
      node.parents = parents;
      node.parent = parents[0];
    } else if (parents.length === 1) {
      node.parent = parents[0];
      delete node.parents;
    } else {
      node.parent = null;
      delete node.parents;
    }
  }

  function getLayoutParents(node) {
    if (!node) return [];
    if (Array.isArray(node.parents) && node.parents.length) return [...node.parents];
    if (node.parent) return [node.parent];
    return [];
  }

  function getTechRequiresList(tech) {
    if (!tech || !tech.requires) return [];
    return Array.isArray(tech.requires) ? [...tech.requires] : [tech.requires];
  }

  Ctor.prototype.buildTechTreeTableSnapshot = function buildTechTreeTableSnapshot() {
    const layout = GAME_DATA.techTreeLayout;
    const techs = {};
    const ids = new Set([
      ...GAME_DATA.techTree.map((t) => t.id),
      ...Object.keys(layout.nodes || {}),
    ]);
    ids.forEach((id) => {
      const n = layout.nodes[id];
      if (!n) return;
      const tech = GAME_DATA.techTree.find((t) => t.id === id);
      const row = {
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
        parent: n.parent ?? null,
      };
      row.size = getLayoutNodeSize(n);
      const parents = getLayoutParents(n);
      if (parents.length > 1) row.parents = parents;
      if (tech && !isPointUpgradeTechId(id)) {
        row.cost = tech.cost ? { ...tech.cost } : {};
        if (tech.requires) {
          row.requires = Array.isArray(tech.requires) ? [...tech.requires] : tech.requires;
        }
      }
      techs[id] = row;
    });
    return {
      version: (window.TECH_TREE_TABLE?.version || 1) + 1,
      canvas: { ...(layout.canvas || { width: 5600, height: 5800 }) },
      techs,
    };
  };

  Ctor.prototype.exportTechTreeTableFile = function exportTechTreeTableFile(table) {
    const body = [
      '/** Tech tree table: layout / requires / cost. Runtime reads this first. */',
      `window.TECH_TREE_TABLE = ${JSON.stringify(table, null, 2)};`,
      'if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);',
      '',
    ].join('\n');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
    } catch (_) { /* ignore */ }
    window.TECH_TREE_TABLE = table;

    const blob = new Blob([body], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tech-tree-table.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return body;
  };

  Ctor.prototype.enterTechTreeEditMode = function enterTechTreeEditMode() {
    if (this._techEditMode) return;
    this.toggleDevPanel(false);
    this.state.activeTab = 'tech';
    this._showTechTreeOverlay();
    this._techEditMode = true;
    this._techEditSelectedId = null;
    this._techEditSelectedIds = [];
    this._techEditLinkSource = null;
    this._techEditUndoStack = [];

    this._techTreeInited = false;
    this.renderTabs();
    this.renderTechTree();
    this._ensureTechEditHud();
    this._ensureTechEditMarquee();
    this._bindTechEditInteractions();
    this._ensureTechEditExitButton();
    this._updateTechTreeDisplay();
    this._refreshTechEditHud();
    this.showNotification('Tech edit: click node / edit xy&parents / Ctrl+Z');
  };

  Ctor.prototype.exitTechTreeEditMode = function exitTechTreeEditMode(opts = {}) {
    if (!this._techEditMode) return;
    const save = opts.save !== false;
    this._techEditMode = false;
    this._techEditSelectedId = null;
    this._techEditSelectedIds = [];
    this._techEditLinkSource = null;
    this._techEditDragging = null;
    this._techEditMarquee = null;
    this._techEditUndoStack = [];
    document.getElementById('tech-edit-hud')?.classList.add('hidden');
    document.getElementById('tech-edit-exit-btn')?.classList.add('hidden');
    document.body.classList.remove('tech-edit-mode');

    if (save) {
      const table = this.buildTechTreeTableSnapshot();
      this.exportTechTreeTableFile(table);
      applyTechTreeTable(table);
      this.showNotification('已导出 tech-tree-table.js（请放到 config/ 目录替换）+ localStorage');
    }

    this._techTreeInited = false;
    this.render();
    this._resumeGameTimeAfterTechEdit();
  };

  /** 退出科技树调整后恢复日历时间（编辑期间由 shouldFreezeGameTime 冻结） */
  Ctor.prototype._resumeGameTimeAfterTechEdit = function _resumeGameTimeAfterTechEdit() {
    this.lastTick = Date.now();
    const storyEl = document.getElementById('story-dialog');
    const storyOpen = !!(storyEl && !storyEl.classList.contains('hidden'));
    if (
      !this._inGameSession
      || this._atMainMenu
      || this._comicTimeHold
      || this._bootTransitionActive
      || this._pickingDifficulty
      || this.isPauseMenuOpen?.()
      || this._starvationDialogOpen
      || storyOpen
    ) {
      return;
    }
    this.paused = false;
  };

  Ctor.prototype._ensureTechEditExitButton = function _ensureTechEditExitButton() {
    const btn = document.getElementById('tech-edit-exit-btn');
    if (!btn) return;
    btn.classList.remove('hidden');
    if (btn.dataset.techEditBound === '1') return;
    btn.dataset.techEditBound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this._techEditMode) return;
      this.exitTechTreeEditMode({ save: true });
    });
  };

  Ctor.prototype._ensureTechEditHud = function _ensureTechEditHud() {
    let hud = document.getElementById('tech-edit-hud');
    if (hud) {
      hud.remove();
      hud = null;
    }
    hud = document.createElement('div');
    hud.id = 'tech-edit-hud';
    hud.className = 'tech-edit-hud';
    hud.innerHTML = `
      <div class="tech-edit-hud-head">
        <strong>科技树调整</strong>
        <span class="tech-edit-hud-tip">点选节点·改动即时生效·方向键微调1px·Ctrl+Z撤销·时钟旁保存退出</span>
      </div>
      <div class="tech-edit-hud-body">
        <div class="tech-edit-current">
          <span class="tech-edit-current-label">当前节点</span>
          <div id="tech-edit-current" class="tech-edit-current-value">(点击科技树节点选择)</div>
        </div>
        <div class="tech-edit-current">
          <span class="tech-edit-current-label">科技作用</span>
          <div id="tech-edit-desc" class="tech-edit-current-value tech-edit-desc">(点击科技树节点查看作用)</div>
        </div>
        <div class="tech-edit-xy-row">
          <label>X
            <input id="tech-edit-x" type="number" step="1">
          </label>
          <label>Y
            <input id="tech-edit-y" type="number" step="1">
          </label>
        </div>
        <label>圆圈大小
          <select id="tech-edit-size">
            <option value="small">小</option>
            <option value="medium">中</option>
            <option value="large">大</option>
          </select>
        </label>
        <label>布局父节点 id（多个用逗号，如精炼双线）
          <input id="tech-edit-parents" type="text" spellcheck="false" placeholder="id_a, id_b">
        </label>
        <label>解锁依赖（独立于布局父节点，多个用逗号）
          <input id="tech-edit-requires" type="text" spellcheck="false" placeholder="id_a, id_b">
        </label>
        <div class="tech-edit-cost-head">
          <span>材料费用</span>
          <button type="button" class="dev-btn" id="tech-edit-cost-add">+材料</button>
        </div>
        <div class="tech-edit-cost-hint">清空或全为 0 = 父节点解锁时自动解锁（改动即时生效）</div>
        <div id="tech-edit-cost-list" class="tech-edit-cost-list"></div>
        <div class="tech-edit-hud-actions">
          <button type="button" class="dev-btn" id="tech-edit-link-mode">点选添加父节点</button>
          <button type="button" class="dev-btn" id="tech-edit-distribute-x">X轴均匀排列</button>
          <button type="button" class="dev-btn" id="tech-edit-distribute-y">Y轴均匀排列</button>
          <button type="button" class="dev-btn" id="tech-edit-align-x">X轴对齐</button>
          <button type="button" class="dev-btn" id="tech-edit-align-y">Y轴对齐</button>
          <button type="button" class="dev-btn" id="tech-edit-rotate-left">向左旋转15°</button>
          <button type="button" class="dev-btn" id="tech-edit-rotate-right">向右旋转15°</button>
          <button type="button" class="dev-btn" id="tech-edit-flip-h">左右翻转</button>
          <button type="button" class="dev-btn" id="tech-edit-flip-v">上下翻转</button>
        </div>
      </div>
    `;
    document.body.appendChild(hud);
    document.body.classList.add('tech-edit-mode');

    document.getElementById('tech-edit-cost-add').addEventListener('click', () => {
      this._addTechEditCostRow();
      this._applyTechEditForm({ pushUndo: true, silent: true, refreshHud: false });
    });
    document.getElementById('tech-edit-distribute-x')?.addEventListener('click', () => {
      this._distributeSelectedTechNodes('x');
    });
    document.getElementById('tech-edit-distribute-y')?.addEventListener('click', () => {
      this._distributeSelectedTechNodes('y');
    });
    document.getElementById('tech-edit-align-x')?.addEventListener('click', () => {
      this._alignSelectedTechNodes('x');
    });
    document.getElementById('tech-edit-align-y')?.addEventListener('click', () => {
      this._alignSelectedTechNodes('y');
    });
    document.getElementById('tech-edit-rotate-left')?.addEventListener('click', () => {
      this._rotateSelectedTechNodes(-15);
    });
    document.getElementById('tech-edit-rotate-right')?.addEventListener('click', () => {
      this._rotateSelectedTechNodes(15);
    });
    document.getElementById('tech-edit-flip-h')?.addEventListener('click', () => {
      this._flipSelectedTechNodes('h');
    });
    document.getElementById('tech-edit-flip-v')?.addEventListener('click', () => {
      this._flipSelectedTechNodes('v');
    });
    document.getElementById('tech-edit-link-mode').addEventListener('click', () => {
      if (!this._techEditSelectedId) {
        this.showNotification('请先点选一个节点');
        return;
      }
      this._techEditLinkSource = this._techEditSelectedId;
      this.showNotification(`再点击目标，加入「${this._techEditSelectedId}」的父节点列表`);
    });
    this._bindTechEditHudLiveApply();
  };

  Ctor.prototype._bindTechEditHudLiveApply = function _bindTechEditHudLiveApply() {
    const hud = document.getElementById('tech-edit-hud');
    if (!hud || hud.dataset.liveBound === '1') return;
    hud.dataset.liveBound = '1';

    const markUndo = () => {
      this._techEditFormUndoReady = true;
    };
    const liveApply = () => {
      if (this._techEditHudSyncing || !this._techEditMode || !this._techEditSelectedId) return;
      const pushUndo = !!this._techEditFormUndoReady;
      this._techEditFormUndoReady = false;
      this._applyTechEditForm({ pushUndo, silent: true, refreshHud: false });
    };

    ['tech-edit-x', 'tech-edit-y', 'tech-edit-parents', 'tech-edit-requires'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', markUndo);
      el.addEventListener('input', liveApply);
      el.addEventListener('change', liveApply);
    });

    const sizeInput = document.getElementById('tech-edit-size');
    sizeInput?.addEventListener('change', () => {
      if (this._techEditHudSyncing || !this._techEditSelectedId) return;
      this._applyTechEditForm({ pushUndo: true, silent: true, refreshHud: false });
    });

    const costList = document.getElementById('tech-edit-cost-list');
    costList?.addEventListener('focusin', markUndo);
    costList?.addEventListener('input', liveApply);
    costList?.addEventListener('change', liveApply);
  };

  Ctor.prototype._getTechEditSelectedIds = function _getTechEditSelectedIds() {
    const list = Array.isArray(this._techEditSelectedIds) ? this._techEditSelectedIds : [];
    const seen = new Set();
    return list.filter((id) => {
      if (!isSelectableTechId(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  Ctor.prototype._setTechEditSelection = function _setTechEditSelection(ids, primaryId = null) {
    const next = normalizeParents(ids || []).filter((id) => isSelectableTechId(id));
    this._techEditSelectedIds = next;
    this._techEditSelectedId = next.length
      ? (next.includes(primaryId) ? primaryId : next[next.length - 1])
      : null;
    this._refreshTechEditHud();
    this._highlightTechEditSelection();
  };

  Ctor.prototype._toggleTechEditSelection = function _toggleTechEditSelection(id) {
    if (!isSelectableTechId(id)) return;
    const cur = this._getTechEditSelectedIds();
    if (cur.includes(id)) {
      const next = cur.filter((x) => x !== id);
      this._setTechEditSelection(next, this._techEditSelectedId === id ? next[next.length - 1] : this._techEditSelectedId);
      return;
    }
    cur.push(id);
    this._setTechEditSelection(cur, id);
  };

  Ctor.prototype._getTechEditDescription = function _getTechEditDescription(id) {
    const tech = GAME_DATA.techTree.find((t) => t.id === id);
    if (!tech) return id || '';
    return tech.description || '(无描述)';
  };

  Ctor.prototype._refreshTechEditHud = function _refreshTechEditHud() {
    const id = this._techEditSelectedId;
    const selectedIds = this._getTechEditSelectedIds();
    const cur = document.getElementById('tech-edit-current');
    const desc = document.getElementById('tech-edit-desc');
    const xInput = document.getElementById('tech-edit-x');
    const yInput = document.getElementById('tech-edit-y');
    const sizeInput = document.getElementById('tech-edit-size');
    const parentsInput = document.getElementById('tech-edit-parents');
    const reqInput = document.getElementById('tech-edit-requires');
    const costList = document.getElementById('tech-edit-cost-list');
    const costAdd = document.getElementById('tech-edit-cost-add');
    const distributeXBtn = document.getElementById('tech-edit-distribute-x');
    const distributeYBtn = document.getElementById('tech-edit-distribute-y');
    const alignXBtn = document.getElementById('tech-edit-align-x');
    const alignYBtn = document.getElementById('tech-edit-align-y');
    const rotateLeftBtn = document.getElementById('tech-edit-rotate-left');
    const rotateRightBtn = document.getElementById('tech-edit-rotate-right');
    const flipHBtn = document.getElementById('tech-edit-flip-h');
    const flipVBtn = document.getElementById('tech-edit-flip-v');
    if (!cur || !desc || !xInput || !yInput || !sizeInput || !parentsInput || !reqInput || !costList) return;

    this._techEditHudSyncing = true;
    try {
      if (!id) {
        cur.textContent = '(点击科技树节点选择)';
        desc.textContent = '(点击科技树节点查看作用)';
        xInput.value = '';
        yInput.value = '';
        sizeInput.value = 'medium';
        parentsInput.value = '';
        reqInput.value = '';
        costList.innerHTML = '';
        reqInput.disabled = true;
        if (costAdd) costAdd.disabled = false;
        if (distributeXBtn) distributeXBtn.disabled = true;
        if (distributeYBtn) distributeYBtn.disabled = true;
        if (alignXBtn) alignXBtn.disabled = true;
        if (alignYBtn) alignYBtn.disabled = true;
        if (rotateLeftBtn) rotateLeftBtn.disabled = true;
        if (rotateRightBtn) rotateRightBtn.disabled = true;
        if (flipHBtn) flipHBtn.disabled = true;
        if (flipVBtn) flipVBtn.disabled = true;
        return;
      }

      const tech = GAME_DATA.techTree.find((t) => t.id === id);
      const node = GAME_DATA.techTreeLayout.nodes[id] || {};
      const currentLabel = tech
        ? `${tech.icon || ''} ${tech.name} (${id})`.trim()
        : id;
      cur.textContent = selectedIds.length > 1
        ? `${currentLabel} · 已选 ${selectedIds.length} 个`
        : currentLabel;
      desc.textContent = selectedIds.length > 1
        ? `主选中：${this._getTechEditDescription(id)}\n批量拖动：${selectedIds.length} 个节点`
        : this._getTechEditDescription(id);
      xInput.value = Math.round(node.x || 0);
      yInput.value = Math.round(node.y || 0);
      sizeInput.value = getLayoutNodeSize(node);
      parentsInput.value = getLayoutParents(node).join(', ');

      const isPointUp = isPointUpgradeTechId(id);
      const multiSelected = selectedIds.length > 1;
      reqInput.disabled = isPointUp || multiSelected;
      if (costAdd) costAdd.disabled = isPointUp || multiSelected;
      if (distributeXBtn) distributeXBtn.disabled = !multiSelected;
      if (distributeYBtn) distributeYBtn.disabled = !multiSelected;
      if (alignXBtn) alignXBtn.disabled = !multiSelected;
      if (alignYBtn) alignYBtn.disabled = !multiSelected;
      if (rotateLeftBtn) rotateLeftBtn.disabled = !multiSelected;
      if (rotateRightBtn) rotateRightBtn.disabled = !multiSelected;
      if (flipHBtn) flipHBtn.disabled = !multiSelected;
      if (flipVBtn) flipVBtn.disabled = !multiSelected;
      xInput.disabled = false;
      yInput.disabled = false;
      sizeInput.disabled = false;
      parentsInput.disabled = false;

      if (isPointUp) {
        reqInput.value = getLayoutParents(node).join(', ');
        costList.innerHTML = '';
        const hint = document.createElement('div');
        hint.className = 'tech-edit-cost-hint';
        hint.textContent = '资源点升级节点：可改坐标与多父连线；费用/依赖由数据生成';
        costList.appendChild(hint);
        return;
      }

      costList.innerHTML = '';
      if (multiSelected) {
        const hint = document.createElement('div');
        hint.className = 'tech-edit-cost-hint';
        hint.textContent = '当前为多选：可左键拖动整组节点；表单仍仅编辑主选中节点。';
        costList.appendChild(hint);
      }

      reqInput.value = getTechRequiresList(tech).join(', ');
      const costEntries = Object.entries(tech?.cost || {}).filter(([, amt]) => Number(amt) > 0);
      costEntries.forEach(([res, amt]) => this._addTechEditCostRow(res, amt));
    } finally {
      this._techEditHudSyncing = false;
      this._techEditFormUndoReady = false;
    }
  };

  Ctor.prototype._addTechEditCostRow = function _addTechEditCostRow(resId = '', amt = 0) {
    const list = document.getElementById('tech-edit-cost-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'tech-edit-cost-row';
    const resOptions = Object.entries(GAME_DATA.resources)
      .map(([id, def]) => `<option value="${id}" ${id === resId ? 'selected' : ''}>${def.icon} ${def.name}</option>`)
      .join('');
    row.innerHTML = `
      <select class="tech-edit-cost-res">${resOptions}</select>
      <input type="number" class="tech-edit-cost-amt" min="0" step="1" value="${amt || 0}">
      <button type="button" class="dev-btn tech-edit-cost-del">x</button>
    `;
    row.querySelector('.tech-edit-cost-del').addEventListener('click', () => {
      row.remove();
      this._applyTechEditForm({ pushUndo: true, silent: true, refreshHud: false });
    });
    list.appendChild(row);
  };

  Ctor.prototype._applyTechEditForm = function _applyTechEditForm(opts = {}) {
    const pushUndo = opts.pushUndo !== false;
    const silent = !!opts.silent;
    const refreshHud = !!opts.refreshHud;
    const id = this._techEditSelectedId;
    if (!id) return;
    const tech = GAME_DATA.techTree.find((t) => t.id === id);
    const node = GAME_DATA.techTreeLayout.nodes[id];
    if (!node) return;
    if (pushUndo) this._pushTechEditUndo();

    const x = Number(document.getElementById('tech-edit-x')?.value);
    const y = Number(document.getElementById('tech-edit-y')?.value);
    if (Number.isFinite(x)) node.x = Math.round(x);
    if (Number.isFinite(y)) node.y = Math.round(y);
    setLayoutNodeSize(node, document.getElementById('tech-edit-size')?.value || 'medium');

    const parentIds = parseIdList(document.getElementById('tech-edit-parents')?.value || '')
      .filter((pid) => pid !== id);
    setLayoutParents(node, parentIds);

    if (tech && !isPointUpgradeTechId(id)) {
      const requireIds = parseIdList(document.getElementById('tech-edit-requires')?.value || '')
        .filter((rid) => rid !== id);
      tech.requires = requireIds.length === 0
        ? null
        : (requireIds.length === 1 ? requireIds[0] : [...requireIds]);

      const cost = {};
      document.querySelectorAll('#tech-edit-cost-list .tech-edit-cost-row').forEach((rowEl) => {
        const res = rowEl.querySelector('.tech-edit-cost-res')?.value;
        const amt = Number(rowEl.querySelector('.tech-edit-cost-amt')?.value);
        if (res && Number.isFinite(amt) && amt > 0) cost[res] = Math.floor(amt);
      });
      tech.cost = cost;
      if (typeof this._autoUnlockFreeTechs === 'function') this._autoUnlockFreeTechs();
    }

    const half = nodeHalf(id);
    const el = this._techNodes?.querySelector(`.tech-node[data-tech-id="${id}"]`);
    if (el) {
      applyNodeSizeClass(el, node);
      el.style.left = `${node.x - half}px`;
      el.style.top = `${node.y - half}px`;
    }

    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();

    if (refreshHud) this._refreshTechEditHud();
    if (!silent) this.showNotification(`已更新：${tech?.name || id}`);
  };

  Ctor.prototype._highlightTechEditSelection = function _highlightTechEditSelection() {
    const content = this._techNodes;
    if (!content) return;
    const ids = new Set(this._getTechEditSelectedIds());
    content.querySelectorAll('.tech-node').forEach((el) => {
      const id = el.dataset.techId;
      el.classList.toggle('tech-edit-selected', ids.has(id));
      el.classList.toggle('tech-edit-selected-primary', id === this._techEditSelectedId);
    });
  };

  Ctor.prototype._clearTechEditSelection = function _clearTechEditSelection() {
    if (!this._techEditSelectedId && !this._techEditLinkSource && !this._getTechEditSelectedIds().length) return;
    this._techEditSelectedId = null;
    this._techEditSelectedIds = [];
    this._techEditLinkSource = null;
    this._refreshTechEditHud();
    this._highlightTechEditSelection();
  };

  Ctor.prototype._pushTechEditUndo = function _pushTechEditUndo() {
    if (!this._techEditUndoStack) this._techEditUndoStack = [];
    const snap = this.buildTechTreeTableSnapshot();
    this._techEditUndoStack.push(JSON.parse(JSON.stringify(snap)));
    if (this._techEditUndoStack.length > 80) this._techEditUndoStack.shift();
  };

  Ctor.prototype._syncTechEditNodePositionsFromLayout = function _syncTechEditNodePositionsFromLayout() {
    const content = this._techNodes;
    if (!content) return;
    content.querySelectorAll('.tech-node').forEach((el) => {
      const id = el.dataset.techId;
      const n = GAME_DATA.techTreeLayout.nodes[id];
      if (!n) return;
      const half = nodeHalf(id);
      el.style.left = `${n.x - half}px`;
      el.style.top = `${n.y - half}px`;
    });
  };

  Ctor.prototype._distributeSelectedTechNodes = function _distributeSelectedTechNodes(axis = 'x') {
    if (!this._techEditMode) return;
    const key = axis === 'y' ? 'y' : 'x';
    const selectedIds = this._getTechEditSelectedIds();
    if (selectedIds.length < 3) {
      this.showNotification(`${key.toUpperCase()}轴均匀排列至少需要选中 3 个节点`);
      return;
    }
    const entries = selectedIds
      .map((id) => ({ id, node: GAME_DATA.techTreeLayout.nodes[id] }))
      .filter((entry) => entry.node && Number.isFinite(entry.node[key]));
    if (entries.length < 3) {
      this.showNotification('可排列的节点不足');
      return;
    }

    entries.sort((a, b) => a.node[key] - b.node[key]);
    const min = entries[0].node[key];
    const max = entries[entries.length - 1].node[key];
    if (Math.abs(max - min) < 1) {
      this.showNotification(`${key.toUpperCase()}轴跨度过小，无法均匀排列`);
      return;
    }

    this._pushTechEditUndo();
    const step = (max - min) / (entries.length - 1);
    entries.forEach((entry, index) => {
      entry.node[key] = Math.round(min + step * index);
    });

    this._syncTechEditNodePositionsFromLayout();
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();
    this._refreshTechEditHud();
    this.showNotification(`已按${key.toUpperCase()}轴均匀排列 ${entries.length} 个节点`);
  };

  Ctor.prototype._alignSelectedTechNodes = function _alignSelectedTechNodes(axis = 'x') {
    if (!this._techEditMode) return;
    const key = axis === 'y' ? 'y' : 'x';
    const selectedIds = this._getTechEditSelectedIds();
    if (selectedIds.length < 2) {
      this.showNotification(`${key.toUpperCase()}轴对齐至少需要选中 2 个节点`);
      return;
    }
    const entries = selectedIds
      .map((id) => ({ id, node: GAME_DATA.techTreeLayout.nodes[id] }))
      .filter((entry) => entry.node && Number.isFinite(entry.node[key]));
    if (entries.length < 2) {
      this.showNotification('可对齐的节点不足');
      return;
    }

    const avg = Math.round(entries.reduce((sum, entry) => sum + entry.node[key], 0) / entries.length);
    this._pushTechEditUndo();
    entries.forEach((entry) => {
      entry.node[key] = avg;
    });

    this._syncTechEditNodePositionsFromLayout();
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();
    this._refreshTechEditHud();
    this.showNotification(`已按${key.toUpperCase()}轴对齐 ${entries.length} 个节点`);
  };

  Ctor.prototype._getSelectedTechLayoutEntries = function _getSelectedTechLayoutEntries() {
    return this._getTechEditSelectedIds()
      .map((id) => ({ id, node: GAME_DATA.techTreeLayout.nodes[id] }))
      .filter((entry) => entry.node
        && Number.isFinite(entry.node.x)
        && Number.isFinite(entry.node.y));
  };

  Ctor.prototype._getSelectedTechLayoutCenter = function _getSelectedTechLayoutCenter(entries) {
    const list = entries || this._getSelectedTechLayoutEntries();
    if (!list.length) return null;
    const cx = list.reduce((sum, entry) => sum + entry.node.x, 0) / list.length;
    const cy = list.reduce((sum, entry) => sum + entry.node.y, 0) / list.length;
    return { x: cx, y: cy };
  };

  Ctor.prototype._commitSelectedTechLayoutChange = function _commitSelectedTechLayoutChange(message) {
    this._syncTechEditNodePositionsFromLayout();
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();
    this._refreshTechEditHud();
    if (message) this.showNotification(message);
  };

  /** degrees: 正数=向右(顺时针)，负数=向左(逆时针)；绕最后选中的节点旋转 */
  Ctor.prototype._rotateSelectedTechNodes = function _rotateSelectedTechNodes(degrees = 15) {
    if (!this._techEditMode) return;
    const entries = this._getSelectedTechLayoutEntries();
    if (entries.length < 2) {
      this.showNotification('旋转布局至少需要选中 2 个节点');
      return;
    }
    const pivotId = this._techEditSelectedId;
    const pivotEntry = entries.find((entry) => entry.id === pivotId) || entries[entries.length - 1];
    if (!pivotEntry?.node) {
      this.showNotification('找不到旋转基准节点');
      return;
    }
    const center = { x: pivotEntry.node.x, y: pivotEntry.node.y };
    const rad = (Number(degrees) || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    this._pushTechEditUndo();
    entries.forEach((entry) => {
      if (entry.id === pivotEntry.id) return;
      const dx = entry.node.x - center.x;
      const dy = entry.node.y - center.y;
      // 屏幕坐标 y 向下：正角度为顺时针
      entry.node.x = Math.round(center.x + dx * cos - dy * sin);
      entry.node.y = Math.round(center.y + dx * sin + dy * cos);
    });
    this._commitSelectedTechLayoutChange(
      `已绕「${pivotEntry.id}」${degrees > 0 ? '向右' : '向左'}旋转 ${Math.abs(degrees)}°（${entries.length} 个）`
    );
  };

  /** mode: 'h' 左右翻转（关于中心竖轴），'v' 上下翻转（关于中心横轴） */
  Ctor.prototype._flipSelectedTechNodes = function _flipSelectedTechNodes(mode = 'h') {
    if (!this._techEditMode) return;
    const entries = this._getSelectedTechLayoutEntries();
    if (entries.length < 2) {
      this.showNotification('翻转布局至少需要选中 2 个节点');
      return;
    }
    const center = this._getSelectedTechLayoutCenter(entries);
    if (!center) return;
    const horizontal = mode !== 'v';

    this._pushTechEditUndo();
    entries.forEach((entry) => {
      if (horizontal) entry.node.x = Math.round(2 * center.x - entry.node.x);
      else entry.node.y = Math.round(2 * center.y - entry.node.y);
    });
    this._commitSelectedTechLayoutChange(
      `已${horizontal ? '左右' : '上下'}翻转 ${entries.length} 个节点`
    );
  };

  Ctor.prototype._nudgeSelectedTechNodes = function _nudgeSelectedTechNodes(dx = 0, dy = 0, opts = {}) {
    if (!this._techEditMode) return false;
    const selectedIds = this._getTechEditSelectedIds();
    if (!selectedIds.length) return false;
    const stepX = Math.trunc(dx) || 0;
    const stepY = Math.trunc(dy) || 0;
    if (!stepX && !stepY) return false;

    if (opts.pushUndo !== false) this._pushTechEditUndo();
    selectedIds.forEach((id) => {
      const node = GAME_DATA.techTreeLayout.nodes[id];
      if (!node) return;
      node.x = Math.round((Number(node.x) || 0) + stepX);
      node.y = Math.round((Number(node.y) || 0) + stepY);
    });

    this._syncTechEditNodePositionsFromLayout();
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();
    this._refreshTechEditHud();
    return true;
  };

  Ctor.prototype._undoTechEdit = function _undoTechEdit() {
    if (!this._techEditMode) return;
    const stack = this._techEditUndoStack;
    if (!stack || !stack.length) {
      this.showNotification('没有可撤销的操作');
      return;
    }
    const snap = stack.pop();
    applyTechTreeTable(snap);
    this._syncTechEditNodePositionsFromLayout();
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._refreshTechEditHud();
    this._highlightTechEditSelection();
    this.showNotification('已撤销');
  };

  Ctor.prototype._quickLinkSelectedTechTo = function _quickLinkSelectedTechTo(targetId) {
    if (!this._techEditMode || !isSelectableTechId(targetId)) return false;
    const selectedIds = this._getTechEditSelectedIds();
    const childId = this._techEditSelectedId;
    if (!childId || selectedIds.length !== 1 || childId === targetId) return false;
    const childNode = GAME_DATA.techTreeLayout.nodes[childId];
    if (!childNode) return false;

    const parents = getLayoutParents(childNode);
    const child = GAME_DATA.techTree.find((t) => t.id === childId);
    const canEditRequires = !!(child && !isPointUpgradeTechId(childId));
    const alreadyLinked = parents.includes(targetId);

    this._pushTechEditUndo();

    if (alreadyLinked) {
      setLayoutParents(childNode, parents.filter((pid) => pid !== targetId));
      if (canEditRequires) {
        const curReqs = getTechRequiresList(child);
        const nextReqs = curReqs.filter((rid) => rid !== targetId);
        child.requires = nextReqs.length === 0 ? null
          : (nextReqs.length === 1 ? nextReqs[0] : nextReqs);
      }
      this.showNotification(`已从 ${childId} 移除父节点：${targetId}`);
    } else {
      if (!parents.includes(targetId)) parents.push(targetId);
      setLayoutParents(childNode, parents);
      if (canEditRequires) {
        const curReqs = getTechRequiresList(child);
        if (!curReqs.includes(targetId)) curReqs.push(targetId);
        child.requires = curReqs.length === 1 ? curReqs[0] : curReqs;
      }
      this.showNotification(`已为 ${childId} 添加父节点：${targetId}`);
    }

    this._techEditLinkSource = null;
    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._refreshTechEditHud();
    this._highlightTechEditSelection();
    return true;
  };

  Ctor.prototype._bindTechEditInteractions = function _bindTechEditInteractions() {
    const content = this._techNodes;
    if (!content || content.dataset.techEditBound === '1') return;
    content.dataset.techEditBound = '1';

    content.addEventListener('mousedown', (e) => {
      if (!this._techEditMode) return;
      if (e.button !== 0) return;
      const node = e.target.closest('.tech-node');
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      const id = node.dataset.techId;
      if (!isSelectableTechId(id)) return;

      if (e.ctrlKey || e.metaKey) {
        this._toggleTechEditSelection(id);
        return;
      }

      if (this._techEditLinkSource && this._techEditLinkSource !== id) {
        const childId = this._techEditLinkSource;
        const child = GAME_DATA.techTree.find((t) => t.id === childId);
        const childNode = GAME_DATA.techTreeLayout.nodes[childId];
        if (childNode) {
          this._pushTechEditUndo();
          const parents = getLayoutParents(childNode);
          if (!parents.includes(id)) parents.push(id);
          setLayoutParents(childNode, parents);
          if (child && !isPointUpgradeTechId(childId)) {
            const curReqs = getTechRequiresList(child);
            if (!curReqs.includes(id)) curReqs.push(id);
            child.requires = curReqs.length === 1 ? curReqs[0] : curReqs;
          }
          this._techEditSelectedId = childId;
          this._techEditLinkSource = null;
          this._rebuildTechTreeEdges();
          this._refreshTechEditHud();
          this._highlightTechEditSelection();
          this.showNotification(`Parents of ${childId} -> ${parents.join(', ')}`);
        }
        return;
      }

      const prevSelected = this._getTechEditSelectedIds();
      const keepGroup = prevSelected.length > 1 && prevSelected.includes(id);
      if (keepGroup) {
        // 多选中拖已选节点：整组一起动，主选中切到当前节点
        this._setTechEditSelection(prevSelected, id);
      } else {
        this._setTechEditSelection([id], id);
      }

      const selectedIds = this._getTechEditSelectedIds();
      const startLayouts = Object.fromEntries(selectedIds.map((sid) => {
        const n = GAME_DATA.techTreeLayout.nodes[sid];
        return [sid, { x: n.x, y: n.y }];
      }));
      const undoSnap = JSON.parse(JSON.stringify(this.buildTechTreeTableSnapshot()));
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const z = this._techZoom || 1;
      let moved = false;

      const onMove = (ev) => {
        const dx = (ev.clientX - startClientX) / z;
        const dy = (ev.clientY - startClientY) / z;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        selectedIds.forEach((sid) => {
          const layout = GAME_DATA.techTreeLayout.nodes[sid];
          const start = startLayouts[sid];
          if (!layout || !start) return;
          layout.x = Math.round(start.x + dx);
          layout.y = Math.round(start.y + dy);
          const el = this._techNodes?.querySelector(`.tech-node[data-tech-id="${sid}"]`);
          if (!el) return;
          const half = nodeHalf(sid);
          el.style.left = `${layout.x - half}px`;
          el.style.top = `${layout.y - half}px`;
        });
        this._rebuildTechTreeEdges();
        const xInput = document.getElementById('tech-edit-x');
        const yInput = document.getElementById('tech-edit-y');
        const active = GAME_DATA.techTreeLayout.nodes[this._techEditSelectedId];
        if (xInput && active) xInput.value = active.x;
        if (yInput && active) yInput.value = active.y;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (moved) {
          if (!this._techEditUndoStack) this._techEditUndoStack = [];
          this._techEditUndoStack.push(undoSnap);
          if (this._techEditUndoStack.length > 80) this._techEditUndoStack.shift();
          this.showNotification(selectedIds.length > 1
            ? `已移动 ${selectedIds.length} 个节点`
            : `${id} -> (${GAME_DATA.techTreeLayout.nodes[id].x}, ${GAME_DATA.techTreeLayout.nodes[id].y})`);
          return;
        }
        // 仅点击未拖动：多选中点某个节点时，收成单选该节点
        if (keepGroup) this._setTechEditSelection([id], id);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }, true);

    content.addEventListener('contextmenu', (e) => {
      if (!this._techEditMode) return;
      const node = e.target.closest('.tech-node');
      if (!node) return;
      const targetId = node.dataset.techId;
      if (!isSelectableTechId(targetId)) return;
      if (!this._quickLinkSelectedTechTo(targetId)) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    const canvas = document.getElementById('tech-tree-canvas');
    if (canvas && canvas.dataset.techEditBlankBound !== '1') {
      canvas.dataset.techEditBlankBound = '1';
      canvas.addEventListener('mousedown', (e) => {
        if (!this._techEditMode) return;
        if (e.button !== 0) {
          this._techEditBlankPointer = null;
          return;
        }
        if (e.target.closest('.tech-node, #tech-edit-hud, .tech-tooltip, #tt-btn')) {
          this._techEditBlankPointer = null;
          return;
        }
        const rect = canvas.getBoundingClientRect();
        const box = document.getElementById('tech-edit-marquee');
        this._techEditBlankPointer = { x: e.clientX, y: e.clientY, ctrl: !!(e.ctrlKey || e.metaKey) };
        if (box) {
          box.classList.remove('hidden');
          box.style.left = `${e.clientX - rect.left}px`;
          box.style.top = `${e.clientY - rect.top}px`;
          box.style.width = '0px';
          box.style.height = '0px';
        }
        const onMove = (ev) => {
          if (!this._techEditBlankPointer || !box) return;
          const x0 = this._techEditBlankPointer.x - rect.left;
          const y0 = this._techEditBlankPointer.y - rect.top;
          const x1 = ev.clientX - rect.left;
          const y1 = ev.clientY - rect.top;
          box.style.left = `${Math.min(x0, x1)}px`;
          box.style.top = `${Math.min(y0, y1)}px`;
          box.style.width = `${Math.abs(x1 - x0)}px`;
          box.style.height = `${Math.abs(y1 - y0)}px`;
        };
        const onUp = (ev) => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          const start = this._techEditBlankPointer;
          this._techEditBlankPointer = null;
          if (box) box.classList.add('hidden');
          if (!start) return;
          if (ev.target.closest('.tech-node, #tech-edit-hud, .tech-tooltip, #tt-btn')) return;
          const moved = Math.abs(ev.clientX - start.x) > 3 || Math.abs(ev.clientY - start.y) > 3;
          if (!moved) {
            if (!start.ctrl) this._clearTechEditSelection();
            return;
          }
          const z = this._techZoom || 1;
          const xMin = Math.min(start.x, ev.clientX);
          const xMax = Math.max(start.x, ev.clientX);
          const yMin = Math.min(start.y, ev.clientY);
          const yMax = Math.max(start.y, ev.clientY);
          const picked = [];
          (this._techNodes?.querySelectorAll('.tech-node') || []).forEach((el) => {
            const r = el.getBoundingClientRect();
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            if (cx >= xMin && cx <= xMax && cy >= yMin && cy <= yMax) {
              const tid = el.dataset.techId;
              if (isSelectableTechId(tid)) picked.push(tid);
            }
          });
          if (!picked.length) {
            if (!start.ctrl) this._clearTechEditSelection();
            return;
          }
          const next = start.ctrl ? [...this._getTechEditSelectedIds(), ...picked] : picked;
          this._setTechEditSelection(next, picked[picked.length - 1]);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    if (!this._techEditKeyBound) {
      this._techEditKeyBound = true;
      document.addEventListener('keydown', (e) => {
        if (!this._techEditMode) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          this._undoTechEdit();
          return;
        }

        const arrowMap = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const delta = arrowMap[e.key];
        if (!delta) return;
        if (!this._getTechEditSelectedIds().length) return;
        e.preventDefault();
        // 连按只记一次撤销，松手后再按会重新入栈
        this._nudgeSelectedTechNodes(delta[0], delta[1], { pushUndo: !e.repeat });
      });
    }
  };

  Ctor.prototype._rebuildTechTreeEdges = function _rebuildTechTreeEdges() {
    const svg = this._techSvg;
    const layout = GAME_DATA.techTreeLayout;
    if (!svg || !layout?.nodes) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const nodeRadius = (techId) => nodeHalf(techId);
    Object.entries(layout.nodes).forEach(([childId, entry]) => {
      // 无对应科技定义的布局节点不画线（避免已删科技留下幽灵连线）
      const hasTech = (GAME_DATA.techTree || []).some((t) => t.id === childId)
        || isPointUpgradeTechId(childId);
      if (!hasTech) return;
      const parents = this._getTechLayoutParents(childId, entry, layout.nodes);
      parents.forEach((parentId) => {
        const from = layout.nodes[parentId];
        if (!from) return;
        const ep = this._clipTechEdgeEndpoints(
          { x: from.x, y: from.y },
          { x: entry.x, y: entry.y },
          nodeRadius(parentId),
          nodeRadius(childId)
        );
        if (!ep) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ep.x0);
        line.setAttribute('y1', ep.y0);
        line.setAttribute('x2', ep.x1);
        line.setAttribute('y2', ep.y1);
        line.setAttribute('stroke', 'rgba(120, 200, 255, 0.35)');
        line.setAttribute('stroke-width', '2.25');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('class', 'tech-edge');
        line.dataset.from = parentId;
        line.dataset.to = childId;
        svg.appendChild(line);
      });
    });
  };

  Ctor.prototype._ensureTechEditMarquee = function _ensureTechEditMarquee() {
    let box = document.getElementById('tech-edit-marquee');
    if (box) return box;
    const canvas = document.getElementById('tech-tree-canvas');
    if (!canvas) return null;
    box = document.createElement('div');
    box.id = 'tech-edit-marquee';
    box.className = 'tech-edit-marquee hidden';
    canvas.appendChild(box);
    return box;
  };

  let bootPatched = false;
  const _origResume = Ctor.prototype.resumeAfterDifficultySetup;
  if (_origResume && !bootPatched) {
    bootPatched = true;
    Ctor.prototype.resumeAfterDifficultySetup = function resumeAfterDifficultySetupPatched(...args) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const table = JSON.parse(raw);
          if (table?.techs) {
            // 丢掉已删科技 / 已删高级矿 point_up，避免幽灵连线写回布局
            const valid = new Set((GAME_DATA.techTree || []).map((t) => t.id));
            Object.keys(table.techs).forEach((id) => {
              if (!valid.has(id)) delete table.techs[id];
            });
            applyTechTreeTable(table);
            window.TECH_TREE_TABLE = table;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(table)); } catch (_) { /* ignore */ }
          }
        }
      } catch (_) { /* ignore */ }
      return _origResume.apply(this, args);
    };
  }
})();
