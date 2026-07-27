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
  const CENTER_R = 28;
  const NODE_R = 22;

  function nodeHalf(techId) {
    return techId === 'unlock_workbench' ? CENTER_R : NODE_R;
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
      const parents = getLayoutParents(n);
      if (parents.length > 1) row.parents = parents;
      if (tech && !isPointUpgradeTechId(id)) {
        row.requires = tech.requires == null
          ? null
          : (Array.isArray(tech.requires) ? [...tech.requires] : tech.requires);
        row.cost = tech.cost ? { ...tech.cost } : {};
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
        <span class="tech-edit-hud-tip">点选节点·改坐标/多父节点·Ctrl+Z撤销·时钟旁保存退出</span>
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
        <label>布局父节点 id（多个用逗号，如精炼双线）
          <input id="tech-edit-parents" type="text" spellcheck="false" placeholder="id_a, id_b">
        </label>
        <label>解锁依赖 id（逗号分隔）
          <input id="tech-edit-requires" type="text" spellcheck="false" placeholder="unlock_a, unlock_b">
        </label>
        <div class="tech-edit-cost-head">
          <span>材料费用</span>
          <button type="button" class="dev-btn" id="tech-edit-cost-add">+材料</button>
        </div>
        <div class="tech-edit-cost-hint">清空或全为 0 = 父节点解锁时自动解锁</div>
        <div id="tech-edit-cost-list" class="tech-edit-cost-list"></div>
        <div class="tech-edit-hud-actions">
          <button type="button" class="dev-btn" id="tech-edit-link-mode">点选添加父节点</button>
          <button type="button" class="dev-btn" id="tech-edit-apply">应用修改</button>
        </div>
      </div>
    `;
    document.body.appendChild(hud);
    document.body.classList.add('tech-edit-mode');

    document.getElementById('tech-edit-apply').addEventListener('click', () => this._applyTechEditForm());
    document.getElementById('tech-edit-cost-add').addEventListener('click', () => this._addTechEditCostRow());
    document.getElementById('tech-edit-link-mode').addEventListener('click', () => {
      if (!this._techEditSelectedId) {
        this.showNotification('请先点选一个节点');
        return;
      }
      this._techEditLinkSource = this._techEditSelectedId;
      this.showNotification(`再点击目标，加入「${this._techEditSelectedId}」的父节点列表`);
    });
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
    const parentsInput = document.getElementById('tech-edit-parents');
    const reqInput = document.getElementById('tech-edit-requires');
    const costList = document.getElementById('tech-edit-cost-list');
    const costAdd = document.getElementById('tech-edit-cost-add');
    if (!cur || !desc || !xInput || !yInput || !parentsInput || !reqInput || !costList) return;

    if (!id) {
      cur.textContent = '(点击科技树节点选择)';
      desc.textContent = '(点击科技树节点查看作用)';
      xInput.value = '';
      yInput.value = '';
      parentsInput.value = '';
      reqInput.value = '';
      costList.innerHTML = '';
      reqInput.disabled = false;
      if (costAdd) costAdd.disabled = false;
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
    parentsInput.value = getLayoutParents(node).join(', ');

    const isPointUp = isPointUpgradeTechId(id);
    const multiSelected = selectedIds.length > 1;
    reqInput.disabled = isPointUp || multiSelected;
    if (costAdd) costAdd.disabled = isPointUp || multiSelected;
    xInput.disabled = false;
    yInput.disabled = false;
    parentsInput.disabled = false;

    if (isPointUp) {
      const reqs = tech?.requires;
      reqInput.value = reqs == null
        ? ''
        : (Array.isArray(reqs) ? reqs.join(', ') : String(reqs));
      costList.innerHTML = '';
      const hint = document.createElement('div');
      hint.className = 'tech-edit-cost-hint';
      hint.textContent = '资源点升级节点：可改坐标与多父连线；费用/依赖由数据生成';
      costList.appendChild(hint);
      return;
    }

    if (multiSelected) {
      const hint = document.createElement('div');
      hint.className = 'tech-edit-cost-hint';
      hint.textContent = '当前为多选：可左键拖动整组节点；表单仍仅编辑主选中节点。';
      costList.appendChild(hint);
    }

    const reqs = tech?.requires;
    reqInput.value = reqs == null
      ? ''
      : (Array.isArray(reqs) ? reqs.join(', ') : String(reqs));
    costList.innerHTML = '';
    const costEntries = Object.entries(tech?.cost || {}).filter(([, amt]) => Number(amt) > 0);
    costEntries.forEach(([res, amt]) => this._addTechEditCostRow(res, amt));
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
    row.querySelector('.tech-edit-cost-del').addEventListener('click', () => row.remove());
    list.appendChild(row);
  };

  Ctor.prototype._applyTechEditForm = function _applyTechEditForm() {
    const id = this._techEditSelectedId;
    if (!id) return;
    const tech = GAME_DATA.techTree.find((t) => t.id === id);
    const node = GAME_DATA.techTreeLayout.nodes[id];
    if (!node) return;
    this._pushTechEditUndo();

    const x = Number(document.getElementById('tech-edit-x')?.value);
    const y = Number(document.getElementById('tech-edit-y')?.value);
    if (Number.isFinite(x)) node.x = Math.round(x);
    if (Number.isFinite(y)) node.y = Math.round(y);

    const parentIds = parseIdList(document.getElementById('tech-edit-parents')?.value || '');
    setLayoutParents(node, parentIds.filter((pid) => pid !== id));

    if (tech && !isPointUpgradeTechId(id)) {
      const reqRaw = (document.getElementById('tech-edit-requires')?.value || '').trim();
      let requires = null;
      if (reqRaw) {
        const parts = parseIdList(reqRaw);
        requires = parts.length <= 1 ? (parts[0] || null) : parts;
      }
      // 布局父节点默认并入解锁依赖（可再手动改）
      if (parentIds.length) {
        if (requires == null) {
          requires = parentIds.length <= 1 ? parentIds[0] : [...parentIds];
        } else {
          const arr = Array.isArray(requires) ? [...requires] : [requires];
          parentIds.forEach((pid) => {
            if (!arr.includes(pid)) arr.push(pid);
          });
          requires = arr.length <= 1 ? arr[0] : arr;
        }
      } else if (id === 'unlock_workbench') {
        requires = null;
      }
      tech.requires = requires;

      const cost = {};
      document.querySelectorAll('#tech-edit-cost-list .tech-edit-cost-row').forEach((row) => {
        const res = row.querySelector('.tech-edit-cost-res')?.value;
        const amt = Number(row.querySelector('.tech-edit-cost-amt')?.value);
        if (res && Number.isFinite(amt) && amt > 0) cost[res] = Math.floor(amt);
      });
      tech.cost = cost;
      if (typeof this._autoUnlockFreeTechs === 'function') this._autoUnlockFreeTechs();
    }

    const half = nodeHalf(id);
    const el = this._techNodes?.querySelector(`.tech-node[data-tech-id="${id}"]`);
    if (el) {
      el.style.left = `${node.x - half}px`;
      el.style.top = `${node.y - half}px`;
    }

    this._rebuildTechTreeEdges();
    this._updateTechTreeDisplay();
    this._highlightTechEditSelection();
    this._refreshTechEditHud();
    this.showNotification(`Applied: ${tech?.name || id}`);
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
            const prev = child.requires;
            if (prev == null) child.requires = parents.length <= 1 ? parents[0] : [...parents];
            else if (Array.isArray(prev)) {
              parents.forEach((pid) => {
                if (!prev.includes(pid)) prev.push(pid);
              });
              child.requires = prev;
            } else if (prev !== id) {
              child.requires = normalizeParents([prev, ...parents]);
            }
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

      this._setTechEditSelection([id], id);

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
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
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
        if (!(e.ctrlKey || e.metaKey) || (e.key !== 'z' && e.key !== 'Z')) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
        e.preventDefault();
        this._undoTechEdit();
      });
    }
  };

  Ctor.prototype._rebuildTechTreeEdges = function _rebuildTechTreeEdges() {
    const svg = this._techSvg;
    const layout = GAME_DATA.techTreeLayout;
    if (!svg || !layout?.nodes) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const nodeRadius = (techId) => (techId === 'unlock_workbench' ? CENTER_R : NODE_R);
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
        line.setAttribute('stroke-width', '1.5');
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
