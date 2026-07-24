// 游戏数据定义
const POINT_UPGRADE_CAPS = { count: 10, cooldown: 10, double: 1 };

const POINT_UPGRADE_TYPE_META = {
  count: { label: '采集升级', typeIcon: '⚡' },
  cooldown: { label: '资源恢复', typeIcon: '⏱️' },
  refine: { label: '资源精炼', typeIcon: '✨' },
  efficiency: { label: '村民效率', typeIcon: '💪' },
  dropRate: { label: '宝箱爆率', typeIcon: '🎲' },
  rewardTypes: { label: '奖励种类', typeIcon: '🎁' },
  rewardAmount: { label: '奖励数量', typeIcon: '📈' },
};

function pointUpgradeTechId(pointId, type) {
  return `point_up_${pointId}_${type}`;
}

/**
 * 将可重复科技拆成 v1..vn 串联节点（点击强化 / 连点加速除外，仍用 repeatable）
 * @param {{ id: string, name: string, icon: string, description: string, requires: string|string[], branch: string, costs: object[] }} spec
 */
function expandTechSeries(spec) {
  const costs = spec.costs || [];
  return costs.map((cost, i) => {
    const n = i + 1;
    return {
      id: `${spec.id}_v${n}`,
      name: `${spec.name}v${n}`,
      icon: spec.icon,
      description: spec.description,
      cost: { ...cost },
      requires: i === 0 ? spec.requires : `${spec.id}_v${i}`,
      branch: spec.branch,
      techSeries: spec.id,
      seriesIndex: n,
      seriesMax: costs.length,
    };
  });
}

function getPointAnchorTech(def) {
  return def.unlockRequires || 'unlock_workbench';
}

/** 生成资源点升级科技条目 */
function generatePointUpgradeTechEntries(resourcePoints, chestUpgradeCosts) {
  const entries = [];
  Object.entries(resourcePoints).forEach(([pointId, def]) => {
    const anchor = getPointAnchorTech(def);
    const resIcon = def.icon || '?';
    const costs = def.upgradeCosts || {};

    const pushCooldownTech = () => {
      const meta = POINT_UPGRADE_TYPE_META.cooldown;
      const max = def.maxUpgrades.cooldown;
      if (!(max > 0)) return;
      entries.push({
        id: pointUpgradeTechId(pointId, 'cooldown'),
        name: `${def.name}${meta.label}`,
        icon: resIcon,
        compositeIcon: { resource: resIcon, type: meta.typeIcon },
        description: '缩短资源恢复冷却时间',
        requires: anchor,
        repeatable: true,
        maxRepeat: max,
        repeatCosts: (costs.cooldown || []).slice(0, max),
        cost: (costs.cooldown || [])[0] || {},
        pointId,
        upgradeType: 'cooldown',
      });
    };

    if (def.maxUpgrades?.count > 0) {
      ['count', 'cooldown'].forEach((type) => {
        if (type === 'cooldown') {
          pushCooldownTech();
          return;
        }
        const meta = POINT_UPGRADE_TYPE_META[type];
        const max = def.maxUpgrades[type];
        entries.push({
          id: pointUpgradeTechId(pointId, type),
          name: `${def.name}${meta.label}`,
          icon: resIcon,
          compositeIcon: { resource: resIcon, type: meta.typeIcon },
          description: '提升单次采集进度上限',
          requires: anchor,
          repeatable: true,
          maxRepeat: max,
          repeatCosts: (costs[type] || []).slice(0, max),
          cost: (costs[type] || [])[0] || {},
          pointId,
          upgradeType: type,
        });
      });
      entries.push({
        id: pointUpgradeTechId(pointId, 'refine'),
        name: `${def.name}资源精炼`,
        icon: resIcon,
        compositeIcon: { resource: resIcon, type: POINT_UPGRADE_TYPE_META.refine.typeIcon },
        description: '基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）',
        requires: [
          pointUpgradeTechId(pointId, 'count'),
          pointUpgradeTechId(pointId, 'cooldown'),
        ],
        requiresPointLevels: { count: def.maxUpgrades.count, cooldown: def.maxUpgrades.cooldown },
        cost: (costs.double || [])[0] || {},
        pointId,
        upgradeType: 'refine',
      });
    } else if (def.maxUpgrades?.cooldown > 0) {
      // 农场/牧场等：仅有资源恢复，无采集/精炼
      pushCooldownTech();
    }

    if (def.maxUpgrades?.efficiency > 0) {
      const meta = POINT_UPGRADE_TYPE_META.efficiency;
      entries.push({
        id: pointUpgradeTechId(pointId, 'efficiency'),
        name: `${def.name}效率升级`,
        icon: resIcon,
        compositeIcon: { resource: resIcon, type: meta.typeIcon },
        description: '提升该资源点徒手村民采集效率',
        requires: anchor,
        repeatable: true,
        maxRepeat: def.maxUpgrades.efficiency,
        cost: {},
        pointId,
        upgradeType: 'efficiency',
        dynamicCost: true,
      });
    }

    if (def.isTreasureChest) {
      ['dropRate', 'rewardTypes', 'rewardAmount'].forEach((type) => {
        const meta = POINT_UPGRADE_TYPE_META[type];
        const chestCosts = chestUpgradeCosts[type] || [];
        entries.push({
          id: pointUpgradeTechId(pointId, type),
          name: meta.label,
          icon: '📦',
          compositeIcon: { resource: '📦', type: meta.typeIcon },
          description: type === 'dropRate'
            ? '提高采集区资源点掉落宝箱的概率（觅食除外）'
            : type === 'rewardTypes'
              ? '提高宝箱奖励资源种类上限'
              : '提高宝箱每种资源的奖励数量',
          requires: anchor,
          repeatable: true,
          maxRepeat: def.maxUpgrades[type],
          repeatCosts: chestCosts,
          cost: chestCosts[0] || {},
          pointId,
          upgradeType: type,
        });
      });
    }
  });
  return entries;
}

/** 生成资源点升级科技布局（碰撞避让，相对各资源解锁节点偏移） */
function generatePointUpgradeTechLayout(resourcePoints, existingNodes) {
  const layout = {};
  const NODE_R = 22;
  const CENTER_R = 28;
  const GAP = 6;
  const SAFE_MIN_X = 60;
  const SAFE_MIN_Y = 60;
  const SAFE_MAX_X = Math.max(...Object.values(existingNodes).map(n => n.x)) + 420;
  const SAFE_MAX_Y = Math.max(...Object.values(existingNodes).map(n => n.y)) + 420;
  const CENTER_ID = 'unlock_workbench';

  const occupied = Object.entries(existingNodes).map(([id, n]) => ({
    id,
    x: n.x,
    y: n.y,
    r: id === CENTER_ID ? CENTER_R : NODE_R,
  }));

  const nodeRadius = (idOrR) => (typeof idOrR === 'number' ? idOrR : (idOrR === CENTER_ID ? CENTER_R : NODE_R));

  const distPointToSeg = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  const clipEndpoints = (from, to, fromId, toId, pad = 2) => {
    const fromR = nodeRadius(fromId);
    const toR = nodeRadius(toId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    return {
      x0: from.x + ux * (fromR + pad),
      y0: from.y + uy * (fromR + pad),
      x1: to.x - ux * (toR + pad),
      y1: to.y - uy * (toR + pad),
    };
  };

  // 仅用于避让：主干连线（existingNodes）经过候选点的情况
  const mainEdges = [];
  Object.entries(existingNodes).forEach(([childId, entry]) => {
    if (!entry?.parent) return;
    const from = existingNodes[entry.parent];
    if (!from) return;
    const ep = clipEndpoints(from, entry, entry.parent, childId);
    if (!ep) return;
    mainEdges.push(ep);
  });
  const dynamicEdges = [...mainEdges];

  const segIntersect = (a, b, c, d) => {
    const orient = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);
    return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0))
      && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
  };

  const buildCandidateEdges = (anchorId, anchor, pointId, pos) => {
    const edges = [];
    Object.entries(pos).forEach(([id, p]) => {
      const parentIds = id.endsWith('_refine')
        ? [pointUpgradeTechId(pointId, 'count'), pointUpgradeTechId(pointId, 'cooldown')]
        : [anchorId];
      parentIds.forEach((parentId) => {
        const from = pos[parentId] || existingNodes[parentId] || layout[parentId] || anchor;
        if (!from) return;
        const ep = clipEndpoints(from, p, parentId, id);
        if (!ep) return;
        edges.push({ id, parentId, ...ep });
      });
    });
    return edges;
  };

  const collidesAt = (x, y, ignoreIds = new Set()) => {
    for (const o of occupied) {
      if (ignoreIds.has(o.id)) continue;
      // 更严格安全距离：66/72 的基础上再留出额外裕量（约 +4）
      const minDist = NODE_R + o.r + NODE_R + 4;
      if (Math.hypot(x - o.x, y - o.y) < minDist) return true;
    }
    for (const [id, n] of Object.entries(layout)) {
      if (ignoreIds.has(id)) continue;
      if (Math.hypot(x - n.x, y - n.y) < (NODE_R + NODE_R + NODE_R + 4)) return true;
    }
    // 避让：主干连线离候选点太近（否则会“穿线”）
    for (const e of mainEdges) {
      const d = distPointToSeg(x, y, e.x0, e.y0, e.x1, e.y1);
      if (d < NODE_R + 6) return true;
    }
    return false;
  };

  const clusterPositions = (anchor, pointId, hasStd, hasCdOnly, hasEff, isChest, variant = {}) => {
    const pos = {};
    const ax = anchor.x + (variant.ax || 0);
    const ay = anchor.y + (variant.ay || 0);
    const dx = variant.dx || 0;
    const dy = variant.dy || 0;
    const fx = variant.fx || 0;
    const fy = variant.fy || 0;
    if (hasStd) {
      const countPos = { x: ax - dx, y: ay - dy };
      const cooldownPos = { x: ax, y: ay };
      // 精炼默认放在采集/恢复中点的侧向，避免三线共线
      const refinePos = (fx || fy)
        ? { x: ax + fx, y: ay + fy }
        : {
            x: (countPos.x + cooldownPos.x) / 2 + (-dy || 80),
            y: (countPos.y + cooldownPos.y) / 2 + (dx || 0),
          };
      pos[pointUpgradeTechId(pointId, 'count')] = countPos;
      pos[pointUpgradeTechId(pointId, 'cooldown')] = cooldownPos;
      pos[pointUpgradeTechId(pointId, 'refine')] = refinePos;
    } else if (hasCdOnly) {
      pos[pointUpgradeTechId(pointId, 'cooldown')] = { x: ax, y: ay };
    }
    if (hasEff) {
      pos[pointUpgradeTechId(pointId, 'efficiency')] = {
        x: anchor.x + (variant.ex || 0),
        y: anchor.y + (variant.ey || 0),
      };
    }
    if (isChest) {
      const chestOffsets = variant.chest || [];
      ['dropRate', 'rewardTypes', 'rewardAmount'].forEach((t, ti) => {
        const off = chestOffsets[ti] || { x: 0, y: 0 };
        pos[pointUpgradeTechId(pointId, t)] = { x: anchor.x + off.x, y: anchor.y + off.y };
      });
    }
    return pos;
  };

  const inBounds = (p) => (
    p.x >= SAFE_MIN_X && p.y >= SAFE_MIN_Y && p.x <= SAFE_MAX_X && p.y <= SAFE_MAX_Y
  );

  const center = existingNodes[CENTER_ID];
  const getBranch = (anchorId) => {
    if (anchorId === CENTER_ID) return 'root';
    const anchor = existingNodes[anchorId];
    if (!anchor || !center) return 'down';
    const dx = anchor.x - center.x;
    const dy = anchor.y - center.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  };

  const getCandidates = (branch, slot = 0) => {
    const spread = slot * 104;
    const SCALE = 1.0;
    const scaleChest = (arr) => (arr || []).map(p => ({ x: Math.round(p.x * SCALE), y: Math.round(p.y * SCALE) }));
    const scaleVariant = (v) => ({
      ax: Math.round((v.ax || 0) * SCALE),
      ay: Math.round((v.ay || 0) * SCALE),
      dx: Math.round((v.dx || 0) * SCALE),
      dy: Math.round((v.dy || 0) * SCALE),
      fx: Math.round((v.fx || 0) * SCALE),
      fy: Math.round((v.fy || 0) * SCALE),
      ex: Math.round((v.ex || 0) * SCALE),
      ey: Math.round((v.ey || 0) * SCALE),
      chest: scaleChest(v.chest),
    });
    const common = {
      right: [
        { ax: 190, ay: spread, dx: 0, dy: 86, fx: 94, fy: 0, ex: 270, ey: 96 + spread, chest: [{ x: 190, y: -96 + spread }, { x: 190, y: 0 + spread }, { x: 190, y: 96 + spread }] },
        { ax: 210, ay: -110 + spread, dx: 0, dy: 86, fx: 94, fy: 0, ex: 290, ey: -14 + spread, chest: [{ x: 210, y: -196 + spread }, { x: 210, y: -100 + spread }, { x: 210, y: -4 + spread }] },
        { ax: 246, ay: 56 + spread, dx: 0, dy: 96, fx: 108, fy: 0, ex: 360, ey: 150 + spread, chest: [{ x: 246, y: -58 + spread }, { x: 246, y: 56 + spread }, { x: 246, y: 170 + spread }] },
      ],
      left: [
        { ax: -190, ay: spread, dx: 0, dy: 86, fx: -94, fy: 0, ex: -270, ey: 96 + spread, chest: [{ x: -190, y: -96 + spread }, { x: -190, y: 0 + spread }, { x: -190, y: 96 + spread }] },
        { ax: -210, ay: 110 + spread, dx: 0, dy: 86, fx: -94, fy: 0, ex: -290, ey: 206 + spread, chest: [{ x: -210, y: 14 + spread }, { x: -210, y: 110 + spread }, { x: -210, y: 206 + spread }] },
        { ax: -246, ay: -56 + spread, dx: 0, dy: 96, fx: -108, fy: 0, ex: -360, ey: 38 + spread, chest: [{ x: -246, y: -170 + spread }, { x: -246, y: -56 + spread }, { x: -246, y: 58 + spread }] },
      ],
      up: [
        { ax: spread, ay: -190, dx: 86, dy: 0, fx: 0, fy: -94, ex: 96 + spread, ey: -270, chest: [{ x: -96 + spread, y: -190 }, { x: 0 + spread, y: -190 }, { x: 96 + spread, y: -190 }] },
        { ax: -110 + spread, ay: -210, dx: 86, dy: 0, fx: 0, fy: -94, ex: -14 + spread, ey: -290, chest: [{ x: -206 + spread, y: -210 }, { x: -110 + spread, y: -210 }, { x: -14 + spread, y: -210 }] },
        { ax: 56 + spread, ay: -246, dx: 96, dy: 0, fx: 0, fy: -108, ex: 150 + spread, ey: -360, chest: [{ x: -58 + spread, y: -246 }, { x: 56 + spread, y: -246 }, { x: 170 + spread, y: -246 }] },
      ],
      down: [
        { ax: spread, ay: 190, dx: 86, dy: 0, fx: 0, fy: 94, ex: 96 + spread, ey: 270, chest: [{ x: -96 + spread, y: 190 }, { x: 0 + spread, y: 190 }, { x: 96 + spread, y: 190 }] },
        { ax: 110 + spread, ay: 210, dx: 86, dy: 0, fx: 0, fy: 94, ex: 206 + spread, ey: 290, chest: [{ x: 14 + spread, y: 210 }, { x: 110 + spread, y: 210 }, { x: 206 + spread, y: 210 }] },
        { ax: -56 + spread, ay: 246, dx: 96, dy: 0, fx: 0, fy: 108, ex: 38 + spread, ey: 360, chest: [{ x: -170 + spread, y: 246 }, { x: -56 + spread, y: 246 }, { x: 58 + spread, y: 246 }] },
      ],
      root: [
        { ax: 180, ay: 130, dx: 58, dy: 58, fx: 108, fy: 48, ex: 260, ey: 220, chest: [{ x: 120, y: 180 }, { x: 200, y: 220 }, { x: 280, y: 260 }] },
        { ax: -180, ay: 130, dx: 58, dy: 58, fx: -108, fy: 48, ex: -260, ey: 220, chest: [{ x: -280, y: 260 }, { x: -200, y: 220 }, { x: -120, y: 180 }] },
      ],
    };
    const list = common[branch] || common.down;
    const base = list.map(scaleVariant);

    const shiftCfg = {
      right: { ax: 120, ex: 120, ay: 0, ey: 0, chestX: 120, chestY: 0 },
      left: { ax: -120, ex: -120, ay: 0, ey: 0, chestX: -120, chestY: 0 },
      up: { ax: 0, ex: 0, ay: -140, ey: -140, chestX: 0, chestY: -140 },
      down: { ax: 0, ex: 0, ay: 140, ey: 140, chestX: 0, chestY: 140 },
      root: { ax: 0, ex: 0, ay: 0, ey: 0, chestX: 0, chestY: 0 },
    }[branch] || { ax: 0, ex: 0, ay: 0, ey: 0, chestX: 0, chestY: 0 };

    const shiftVariant = (v) => ({
      ...v,
      ax: v.ax + shiftCfg.ax,
      ex: v.ex + shiftCfg.ex,
      ay: v.ay + shiftCfg.ay,
      ey: v.ey + shiftCfg.ey,
      chest: (v.chest || []).map(p => ({ x: p.x + shiftCfg.chestX, y: p.y + shiftCfg.chestY })),
    });

    const shifted = base.map(shiftVariant);
    return base.concat(shifted);
  };

  const anchorGroups = {};
  Object.entries(resourcePoints).forEach(([pointId, def]) => {
    const hasStd = def.maxUpgrades?.count > 0;
    const hasCdOnly = !hasStd && def.maxUpgrades?.cooldown > 0;
    const hasEff = def.maxUpgrades?.efficiency > 0;
    const isChest = def.isTreasureChest;
    if (!hasStd && !hasCdOnly && !hasEff && !isChest) return;
    const anchor = getPointAnchorTech(def);
    if (!anchorGroups[anchor]) anchorGroups[anchor] = [];
    anchorGroups[anchor].push({ pointId, hasStd, hasCdOnly, hasEff, isChest });
  });

  Object.entries(anchorGroups).forEach(([anchor, points]) => {
    const parent = existingNodes[anchor];
    if (!parent) return;
    const branch = getBranch(anchor);

    points.forEach((item, idx) => {
      const { pointId, hasStd, hasCdOnly, hasEff, isChest } = item;
      const slot = idx - Math.floor(points.length / 2);
      const candidates = getCandidates(branch, slot);

      let bestPos = null;
      let bestScore = -Infinity;

      const scorePos = (pos) => {
        const pointsList = Object.values(pos);
        const candidateEdges = buildCandidateEdges(anchor, parent, pointId, pos);
        let minToOccupied = Infinity;
        let minToEdges = Infinity;
        let edgeCrossPenalty = 0;
        let edgeNodePenalty = 0;
        let backwardPenalty = 0;
        const branchVec = { x: parent.x - center.x, y: parent.y - center.y };
        const anchorDist = Math.hypot(branchVec.x, branchVec.y) || 1;

        for (const p of pointsList) {
          for (const o of occupied) {
            const d = Math.hypot(p.x - o.x, p.y - o.y);
            if (d < minToOccupied) minToOccupied = d;
          }
          for (const [_, n] of Object.entries(layout)) {
            const d = Math.hypot(p.x - n.x, p.y - n.y);
            if (d < minToOccupied) minToOccupied = d;
          }
          for (const e of mainEdges) {
            const d = distPointToSeg(p.x, p.y, e.x0, e.y0, e.x1, e.y1);
            if (d < minToEdges) minToEdges = d;
          }
          const childDist = Math.hypot(p.x - center.x, p.y - center.y);
          if (childDist < anchorDist - 18) backwardPenalty += (anchorDist - childDist) * 3;
          const edgeVec = { x: p.x - parent.x, y: p.y - parent.y };
          const dot = branchVec.x * edgeVec.x + branchVec.y * edgeVec.y;
          if (dot < 0) backwardPenalty += (-dot) * 0.35;
        }

        const allNodes = occupied.concat(Object.entries(layout).map(([id, n]) => ({ id, x: n.x, y: n.y, r: NODE_R })));
        for (const e of candidateEdges) {
          for (const o of allNodes) {
            if (o.id === e.id || o.id === e.parentId) continue;
            const d = distPointToSeg(o.x, o.y, e.x0, e.y0, e.x1, e.y1);
            if (d < NODE_R + 8) edgeNodePenalty += (NODE_R + 8 - d) * 8;
          }
          for (const other of dynamicEdges) {
            if (other.parentId && (other.id === e.id || other.id === e.parentId || other.parentId === e.id || other.parentId === e.parentId)) continue;
            if (segIntersect(
              { x: e.x0, y: e.y0 },
              { x: e.x1, y: e.y1 },
              { x: other.x0, y: other.y0 },
              { x: other.x1, y: other.y1 }
            )) edgeCrossPenalty += 180;
          }
        }

        // 优先视觉干净：强惩罚穿线/压线/逆流，再考虑点间距
        return minToOccupied + minToEdges * 0.15 - edgeCrossPenalty - edgeNodePenalty - backwardPenalty;
      };

      for (const variant of candidates) {
        const pos = clusterPositions(parent, pointId, hasStd, hasCdOnly, hasEff, isChest, variant);
        const allInBounds = Object.values(pos).every(p => inBounds(p));
        if (!allInBounds) continue;

        const score = scorePos(pos);
        if (score > bestScore) {
          bestScore = score;
          bestPos = pos;
        }
      }

      if (!bestPos) bestPos = clusterPositions(parent, pointId, hasStd, hasCdOnly, hasEff, isChest, candidates[0]);
      const placed = bestPos;

      Object.entries(placed).forEach(([id, p]) => {
        if (existingNodes[id]) return;
        const isRefine = id.endsWith('_refine');
        const countId = pointUpgradeTechId(pointId, 'count');
        const cooldownId = pointUpgradeTechId(pointId, 'cooldown');
        layout[id] = {
          x: Math.round(p.x),
          y: Math.round(p.y),
          parent: isRefine ? cooldownId : anchor,
          ...(isRefine ? { parents: [countId, cooldownId] } : {}),
        };
        occupied.push({ id, x: layout[id].x, y: layout[id].y, r: NODE_R });
      });
      buildCandidateEdges(anchor, parent, pointId, placed).forEach((e) => {
        dynamicEdges.push(e);
      });
    });
  });

  return layout;
}

/**
 * 资源点升级费用：
 * - 采集 / 恢复 / 精炼：只消耗本资源
 * - 精炼重置：自身加工品 + 同档其他资源
 * @param {{ resource: string, processed: string, others?: string[], scale?: number }} cfg
 */
function getPointUpgradeBaseScale(pointIndex = 1) {
  return 1 + Math.max(0, pointIndex - 1) * 0.2;
}

function makePointUpgradeCosts(cfg) {
  const { resource, processed, others = [], pointIndex = 1 } = cfg;
  const scale = getPointUpgradeBaseScale(pointIndex);
  const amt = (n) => Math.max(1, Math.round(n * scale));

  // 自资源价格基数（count 类型）
  const countBases = [4, 5, 6, 8, 10, 12, 15, 19, 24, 30];
  // 资源恢复价格基数（cooldown 类型）
  const cdBases = [7, 9, 11, 14, 18, 22, 28, 35, 44, 55];
  // 精炼价格基数
  const refineBase = amt(85);   // 一级精炼
  const refineBase2 = amt(107); // 二级精炼
  const prestigeBase = amt(192);

  // 用公式 *1.08+1.5（向下取整）扩展到 200 级（足够 20 轮重置）
  const extend = (arr) => {
    let last = arr[arr.length - 1];
    const result = [...arr];
    for (let i = arr.length; i < 200; i++) {
      const v = Math.floor(last * 1.08 + 1.5);
      result.push(Math.max(1, v));
      last = v;
    }
    return result;
  };

  const countRaw = extend(countBases);
  const cdRaw = extend(cdBases);

  const self = (n) => ({ [resource]: amt(n) });
  const countArr = countRaw.map(n => self(n));
  const cdArr = cdRaw.map(n => self(n));
  const doubleArr = [self(refineBase)];
  const prestigeCost = self(prestigeBase);

  const a = others[0];
  const b = others[1] || others[0];
  const mixed = (p, x, y) => {
    const cost = { [processed]: amt(p) };
    if (x > 0 && a) cost[a] = amt(x);
    if (y > 0 && b) cost[b] = amt(y);
    return cost;
  };

  return {
    count: countArr,
    cooldown: cdArr,
    double: doubleArr,
    prestige: prestigeCost,
  };
}

const GAME_DATA = {
  resources: {
    wood: { id: 'wood', name: '木头', icon: '🪵', color: '#8B6914' },
    plank: { id: 'plank', name: '木板', icon: '🟫', color: '#C4A35A' },
    stone: { id: 'stone', name: '石头', icon: '🪨', color: '#888' },
    stone_slab: { id: 'stone_slab', name: '石板', icon: '▦', color: '#707070' },
    clay: { id: 'clay', name: '黏土', icon: '🟠', color: '#B56A3C' },
    brick: { id: 'brick', name: '砖', icon: '🧱', color: '#A0522D' },
    gravel: { id: 'gravel', name: '砂砾', icon: '🏜️', color: '#C2B280' },
    glass: { id: 'glass', name: '玻璃', icon: '🪟', color: '#A8D8FF' },
    resin: { id: 'resin', name: '树脂', icon: '🍯', color: '#B8860B' },
    pitch: { id: 'pitch', name: '松香', icon: '🟤', color: '#8B4513' },
    copper_ore: { id: 'copper_ore', name: '铜矿', icon: '🟤', color: '#B87333' },
    copper_ingot: { id: 'copper_ingot', name: '铜锭', icon: '🔶', color: '#DA8A67' },
    tin_ore: { id: 'tin_ore', name: '锡矿', icon: '🪙', color: '#A8B4C0' },
    bronze: { id: 'bronze', name: '青铜', icon: '🥉', color: '#CD7F32' },
    zinc_ore: { id: 'zinc_ore', name: '锌矿', icon: '🔘', color: '#9AA5B0' },
    brass: { id: 'brass', name: '黄铜', icon: '🟡', color: '#B5A642' },
    limestone: { id: 'limestone', name: '石灰石', icon: '▫️', color: '#E8E0D0' },
    lime: { id: 'lime', name: '石灰', icon: '⬜', color: '#F5F5DC' },
    coal: { id: 'coal', name: '煤炭', icon: '⚫', color: '#333' },
    coke: { id: 'coke', name: '焦炭', icon: '⬛', color: '#2A2A2A' },
    iron_ore: { id: 'iron_ore', name: '铁矿', icon: '⬛', color: '#555' },
    iron_ingot: { id: 'iron_ingot', name: '铁锭', icon: '⬜', color: '#AAA' },
    steel: { id: 'steel', name: '钢', icon: '🔩', color: '#6B7B8C' },
    silver_ore: { id: 'silver_ore', name: '银矿', icon: '🔹', color: '#C0C0C0' },
    silver_ingot: { id: 'silver_ingot', name: '银锭', icon: '⬜', color: '#E8E8E8' },
    sulfur: { id: 'sulfur', name: '硫磺', icon: '🟡', color: '#E6D600' },
    gunpowder: { id: 'gunpowder', name: '火药', icon: '💥', color: '#4A4A4A' },
    obsidian: { id: 'obsidian', name: '黑曜石', icon: '🖤', color: '#1a1a1a' },
    gold_ore: { id: 'gold_ore', name: '金矿', icon: '🟨', color: '#DAA520' },
    gold_ingot: { id: 'gold_ingot', name: '金锭', icon: '🥇', color: '#FFD700' },
    crystal: { id: 'crystal', name: '水晶', icon: '💎', color: '#7FDBFF' },
    polished_crystal: { id: 'polished_crystal', name: '抛光水晶', icon: '💠', color: '#B0E0FF' },
    meteorite: { id: 'meteorite', name: '陨石', icon: '☄️', color: '#4B0082' },
    star_metal: { id: 'star_metal', name: '陨铁', icon: '🌟', color: '#6A5ACD' },
    gear: { id: 'gear', name: '齿轮', icon: '⚙️', color: '#777' },
    food: { id: 'food', name: '食物', icon: '🍖', color: '#C75B39' },
  },

  /**
   * 资源点定义（名称/解锁/升级费用等）
   * 初始 baseMaxCount / baseCooldown / baseYield 由 config/resource-points.js 覆盖
   */
  resourcePoints: {
    berry_bush: {
      id: 'berry_bush',
      name: '浆果丛',
      icon: '🫐',
      description: '采集浆果作为食物',
      resource: 'food',
      baseYield: 1,
      baseMaxCount: 12,
      baseCooldown: 250,
      maxUpgrades: { count: 0, cooldown: 0, double: 0 },
      upgradeCosts: { count: [], cooldown: [], double: [] },
      unlockRequires: null,
      isFoodPoint: true,
    },
    forest: {
      id: 'forest',
      name: '森林',
      icon: '🌲',
      description: '砍伐树木获取木头',
      resource: 'wood',
      baseYield: 1,
      baseMaxCount: 15,
      baseCooldown: 2000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'wood', processed: 'plank', others: ['stone_slab', 'resin'], pointIndex: 1 }),
      unlockRequires: 'unlock_forest',
    },
    quarry: {
      id: 'quarry',
      name: '采石场',
      icon: '⛏️',
      description: '开采石头',
      resource: 'stone',
      baseYield: 1,
      tier: 'low',
      baseMaxCount: 24,
      baseCooldown: 2000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'stone', processed: 'stone_slab', others: ['clay', 'brick'], pointIndex: 2 }),
      unlockRequires: 'unlock_quarry',
    },
    clay_pit: {
      id: 'clay_pit',
      name: '黏土坑',
      icon: '🟠',
      description: '挖掘黏土',
      resource: 'clay',
      baseYield: 1,
      tier: 'low',
      baseMaxCount: 24,
      baseCooldown: 2200,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'clay', processed: 'brick', others: ['stone_slab', 'gravel'], pointIndex: 3 }),
      unlockRequires: 'unlock_clay_pit',
    },
    copper_mine: {
      id: 'copper_mine',
      name: '铜矿',
      icon: '🏔️',
      description: '开采铜矿石',
      resource: 'copper_ore',
      baseYield: 1,
      tier: 'mid',
      baseMaxCount: 45,
      baseCooldown: 3000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'copper_ore', processed: 'copper_ingot', others: ['coal', 'limestone'], pointIndex: 4 }),
      unlockRequires: 'unlock_copper_mine',
    },
    iron_mine: {
      id: 'iron_mine',
      name: '铁矿',
      icon: '🗻',
      description: '开采铁矿石',
      resource: 'iron_ore',
      baseYield: 1,
      tier: 'high',
      baseMaxCount: 75,
      baseCooldown: 4000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'iron_ore', processed: 'iron_ingot', others: ['coke', 'limestone'], pointIndex: 5 }),
      unlockRequires: 'unlock_iron_mine',
    },
    coal_mine: {
      id: 'coal_mine',
      name: '煤矿',
      icon: '🕳️',
      description: '开采煤炭',
      resource: 'coal',
      baseYield: 1,
      tier: 'mid',
      baseMaxCount: 40,
      baseCooldown: 2500,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'coal', processed: 'coke', others: ['limestone', 'clay'], pointIndex: 6 }),
      unlockRequires: 'unlock_coal_mine',
    },
    gravel_bed: {
      id: 'gravel_bed',
      name: '砂砾滩',
      icon: '🏜️',
      description: '采集砂砾',
      resource: 'gravel',
      baseYield: 1,
      tier: 'low',
      baseMaxCount: 24,
      baseCooldown: 2000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'gravel', processed: 'glass', others: ['clay', 'stone'], pointIndex: 7 }),
      unlockRequires: 'unlock_gravel',
    },
    tin_mine: {
      id: 'tin_mine',
      name: '锡矿',
      icon: '🪙',
      description: '开采锡矿',
      resource: 'tin_ore',
      baseYield: 1,
      tier: 'mid',
      baseMaxCount: 42,
      baseCooldown: 2800,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'tin_ore', processed: 'bronze', others: ['copper_ore', 'coal'], pointIndex: 8 }),
      unlockRequires: 'unlock_tin_mine',
    },
    limestone_quarry: {
      id: 'limestone_quarry',
      name: '石灰岩场',
      icon: '▫️',
      description: '开采石灰石',
      resource: 'limestone',
      baseYield: 1,
      tier: 'mid',
      baseMaxCount: 40,
      baseCooldown: 2600,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'limestone', processed: 'lime', others: ['gravel', 'clay'], pointIndex: 9 }),
      unlockRequires: 'unlock_limestone',
    },
    silver_mine: {
      id: 'silver_mine',
      name: '银矿',
      icon: '🔹',
      description: '开采银矿',
      resource: 'silver_ore',
      baseYield: 1,
      tier: 'high',
      baseMaxCount: 72,
      baseCooldown: 3500,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'silver_ore', processed: 'silver_ingot', others: ['coal', 'iron_ore'], pointIndex: 10 }),
      unlockRequires: 'unlock_silver_mine',
    },
    sulfur_vent: {
      id: 'sulfur_vent',
      name: '硫气孔',
      icon: '🟡',
      description: '采集硫磺',
      resource: 'sulfur',
      baseYield: 1,
      tier: 'high',
      baseMaxCount: 70,
      baseCooldown: 3200,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'sulfur', processed: 'gunpowder', others: ['coal', 'limestone'], pointIndex: 11 }),
      unlockRequires: 'unlock_sulfur',
    },
    gold_mine: {
      id: 'gold_mine',
      name: '金矿',
      icon: '🟨',
      description: '开采金矿',
      resource: 'gold_ore',
      baseYield: 1,
      tier: 'ultimate',
      baseMaxCount: 130,
      baseCooldown: 5000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'gold_ore', processed: 'gold_ingot', others: ['glass', 'polished_crystal'], pointIndex: 12 }),
      unlockRequires: 'unlock_gold_mine',
    },
    crystal_cave: {
      id: 'crystal_cave',
      name: '水晶洞',
      icon: '💎',
      description: '开采水晶',
      resource: 'crystal',
      baseYield: 1,
      tier: 'ultimate',
      baseMaxCount: 130,
      baseCooldown: 5500,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'crystal', processed: 'polished_crystal', others: ['glass', 'gold_ore'], pointIndex: 13 }),
      unlockRequires: 'unlock_crystal',
    },
    resin_grove: {
      id: 'resin_grove',
      name: '松脂林',
      icon: '🍯',
      description: '采集树脂',
      resource: 'resin',
      baseYield: 1,
      tier: 'low',
      baseMaxCount: 22,
      baseCooldown: 2200,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'resin', processed: 'pitch', others: ['wood', 'plank'], pointIndex: 14 }),
      unlockRequires: 'unlock_resin',
    },
    zinc_mine: {
      id: 'zinc_mine',
      name: '锌矿',
      icon: '🔘',
      description: '开采锌矿',
      resource: 'zinc_ore',
      baseYield: 1,
      tier: 'mid',
      baseMaxCount: 42,
      baseCooldown: 2700,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'zinc_ore', processed: 'brass', others: ['copper_ore', 'coal'], pointIndex: 15 }),
      unlockRequires: 'unlock_zinc_mine',
    },
    obsidian_deposit: {
      id: 'obsidian_deposit',
      name: '黑曜岩',
      icon: '⬛',
      description: '开采黑曜石',
      resource: 'obsidian',
      baseYield: 1,
      tier: 'high',
      baseMaxCount: 72,
      baseCooldown: 3600,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'obsidian', processed: 'obsidian', others: ['iron_ingot', 'gunpowder'], pointIndex: 16 }),
      unlockRequires: 'unlock_obsidian',
    },
    meteor_crater: {
      id: 'meteor_crater',
      name: '陨石坑',
      icon: '☄️',
      description: '采集陨石',
      resource: 'meteorite',
      baseYield: 1,
      tier: 'ultimate',
      baseMaxCount: 130,
      baseCooldown: 6000,
      maxUpgrades: { ...POINT_UPGRADE_CAPS },
      upgradeCosts: makePointUpgradeCosts({ resource: 'meteorite', processed: 'star_metal', others: ['gold_ingot', 'polished_crystal'], pointIndex: 17 }),
      unlockRequires: 'unlock_meteor',
    },
    farm: {
      id: 'farm',
      name: '农场',
      icon: '🌾',
      description: '耕作产出食物',
      resource: 'food',
      baseYield: 1,
      baseMaxCount: 5,
      baseCooldown: 1000,
      /** 资源恢复满级后冷却倍率（1s → 0.25s） */
      finalCooldownRatio: 0.25,
      maxWorkers: 4,
      canBuildMultiple: true,
      extraBuildBaseCost: { wood: 25, clay: 18, food: 12 },
      extraBuildCostBump: { mult: 1.3, add: 8 },
      maxUpgrades: { count: 0, cooldown: 10, double: 0, efficiency: 2 },
      upgradeCosts: {
        count: [],
        cooldown: makePointUpgradeCosts({ resource: 'food', processed: 'food', pointIndex: 2 }).cooldown.slice(0, 10),
        double: [],
      },
      /** 升到对应等级时的单价：约等于按涨价累加「再建 N 座」的总价 */
      efficiencyUpgradeBuilds: [2, 5],
      efficiencySpeedByLevel: { 1: 0.15, 2: 0.3 },
      unlockRequires: 'unlock_farm',
      isFoodPoint: true,
    },
    pasture: {
      id: 'pasture',
      name: '牧场',
      icon: '🐄',
      description: '畜牧产出食物',
      resource: 'food',
      baseYield: 1,
      baseMaxCount: 3,
      baseCooldown: 1000,
      finalCooldownRatio: 0.25,
      maxWorkers: 8,
      canBuildMultiple: true,
      extraBuildBaseCost: { brick: 15, plank: 20, food: 25 },
      extraBuildCostBump: { mult: 1.3, add: 10 },
      maxUpgrades: { count: 0, cooldown: 10, double: 0, efficiency: 2 },
      upgradeCosts: {
        count: [],
        cooldown: makePointUpgradeCosts({ resource: 'food', processed: 'food', pointIndex: 3 }).cooldown.slice(0, 10),
        double: [],
      },
      efficiencyUpgradeBuilds: [2, 5],
      efficiencySpeedByLevel: { 1: 0.15, 2: 0.3 },
      unlockRequires: 'unlock_pasture',
      isFoodPoint: true,
    },
    treasure_chest: {
      id: 'treasure_chest',
      name: '宝箱',
      icon: '📦',
      description: '开启宝箱获得随机资源',
      isTreasureChest: true,
      baseMaxCount: 4,
      baseCooldown: 500,
      maxUpgrades: { dropRate: 8, rewardTypes: 3, rewardAmount: 3 },
      unlockRequires: 'unlock_treasure_chest',
    },
  },

  recipes: [
    {
      id: 'craft_plank',
      name: '制作木板',
      icon: '🟫',
      description: '5木头合成1木板',
      inputs: { wood: 5 },
      outputs: { plank: 1 },
      requires: 'unlock_workbench',
      baseMaxCount: 12,
      baseCooldown: 2000,
    },
    {
      id: 'craft_brick',
      name: '烧制砖块',
      icon: '🧱',
      description: '5黏土烧制1砖',
      inputs: { clay: 5 },
      outputs: { brick: 1 },
      requires: 'unlock_brick_craft',
      baseMaxCount: 10,
      baseCooldown: 2500,
    },
    {
      id: 'smelt_copper',
      name: '冶炼铜锭',
      icon: '🔶',
      description: '2铜矿冶炼1铜锭',
      inputs: { copper_ore: 2 },
      outputs: { copper_ingot: 1 },
      requires: 'unlock_copper_smelt',
      usesFurnace: true,
      baseMaxCount: 8,
      baseCooldown: 3000,
    },
    {
      id: 'craft_gear',
      name: '制造齿轮',
      icon: '⚙️',
      description: '2铜锭+1松香制造1齿轮',
      inputs: { copper_ingot: 2, pitch: 1 },
      outputs: { gear: 1 },
      requires: 'unlock_gear_craft',
      baseMaxCount: 12,
      baseCooldown: 4000,
    },
    {
      id: 'smelt_iron',
      name: '冶炼铁锭',
      icon: '⬜',
      description: '2铁矿+1煤炭冶炼1铁锭',
      inputs: { iron_ore: 2, coal: 1 },
      outputs: { iron_ingot: 1 },
      requires: 'unlock_iron_smelt',
      usesFurnace: true,
      baseMaxCount: 12,
      baseCooldown: 4000,
    },
    {
      id: 'smelt_steel',
      name: '锻造钢材',
      icon: '🔩',
      description: '2铁锭+1焦炭锻造1钢（需升级熔炉）',
      inputs: { iron_ingot: 2, coke: 1 },
      outputs: { steel: 1 },
      requires: 'unlock_steel_smelt',
      usesFurnace: true,
      baseMaxCount: 14,
      baseCooldown: 5000,
    },
    {
      id: 'craft_lime',
      name: '烧制石灰',
      icon: '⬜',
      description: '4石灰石烧制1石灰',
      inputs: { limestone: 4 },
      outputs: { lime: 1 },
      requires: 'unlock_lime_craft',
      usesFurnace: true,
      baseMaxCount: 10,
      baseCooldown: 3000,
    },
    {
      id: 'craft_bronze',
      name: '铸造青铜',
      icon: '🥉',
      description: '2铜锭+1锡矿铸成1青铜',
      inputs: { copper_ingot: 2, tin_ore: 1 },
      outputs: { bronze: 1 },
      requires: 'unlock_bronze_craft',
      usesFurnace: true,
      baseMaxCount: 10,
      baseCooldown: 3500,
    },
    {
      id: 'smelt_silver',
      name: '冶炼银锭',
      icon: '🪞',
      description: '2银矿+1煤炭冶炼1银锭',
      inputs: { silver_ore: 2, coal: 1 },
      outputs: { silver_ingot: 1 },
      requires: 'unlock_silver_smelt',
      usesFurnace: true,
      baseMaxCount: 12,
      baseCooldown: 4000,
    },
    {
      id: 'craft_gunpowder',
      name: '配制火药',
      icon: '💥',
      description: '2硫磺+1煤炭配制1火药',
      inputs: { sulfur: 2, coal: 1 },
      outputs: { gunpowder: 1 },
      requires: 'unlock_gunpowder',
      baseMaxCount: 10,
      baseCooldown: 3500,
    },
    {
      id: 'smelt_gold',
      name: '冶炼金锭',
      icon: '🥇',
      description: '2金矿+1煤炭冶炼1金锭',
      inputs: { gold_ore: 2, coal: 1 },
      outputs: { gold_ingot: 1 },
      requires: 'unlock_gold_smelt',
      usesFurnace: true,
      baseMaxCount: 14,
      baseCooldown: 5000,
    },
    {
      id: 'craft_polished_crystal',
      name: '抛光水晶',
      icon: '💠',
      description: '1水晶+1玻璃抛光为1抛光水晶',
      inputs: { crystal: 1, glass: 1 },
      outputs: { polished_crystal: 1 },
      requires: 'unlock_crystal_polish',
      baseMaxCount: 12,
      baseCooldown: 4500,
    },
    {
      id: 'craft_pitch',
      name: '提炼松香',
      icon: '🟤',
      description: '3树脂提炼1松香',
      inputs: { resin: 3 },
      outputs: { pitch: 1 },
      requires: 'unlock_pitch',
      baseMaxCount: 8,
      baseCooldown: 2500,
    },
    {
      id: 'craft_stone_slab',
      name: '切割石板',
      icon: '▦',
      description: '4石头加工为1石板',
      inputs: { stone: 4 },
      outputs: { stone_slab: 1 },
      requires: 'unlock_quarry',
      baseMaxCount: 8,
      baseCooldown: 2200,
    },
    {
      id: 'craft_glass',
      name: '烧制玻璃',
      icon: '🪟',
      description: '3砂砾+1石灰烧制1玻璃',
      inputs: { gravel: 3, lime: 1 },
      outputs: { glass: 1 },
      requires: 'unlock_lime_craft',
      usesFurnace: true,
      baseMaxCount: 9,
      baseCooldown: 2800,
    },
    {
      id: 'craft_coke',
      name: '煅烧焦炭',
      icon: '⬛',
      description: '3煤炭煅烧1焦炭（资源点升级材料）',
      inputs: { coal: 3 },
      outputs: { coke: 1 },
      requires: 'unlock_coal_mine',
      usesFurnace: true,
      baseMaxCount: 9,
      baseCooldown: 2800,
    },
    {
      id: 'craft_brass',
      name: '铸造黄铜',
      icon: '🟡',
      description: '1铜锭+1锌矿铸成1黄铜',
      inputs: { copper_ingot: 1, zinc_ore: 1 },
      outputs: { brass: 1 },
      requires: 'unlock_brass_craft',
      usesFurnace: true,
      baseMaxCount: 10,
      baseCooldown: 3200,
    },
    {
      id: 'smelt_star_metal',
      name: '冶炼陨铁',
      icon: '🌟',
      description: '2陨石+1煤炭冶炼1陨铁',
      inputs: { meteorite: 2, coal: 1 },
      outputs: { star_metal: 1 },
      requires: 'unlock_star_metal',
      usesFurnace: true,
      baseMaxCount: 14,
      baseCooldown: 5500,
    },
    // 工具/武器/护甲配方见 config/tool-recipes.js（由 applyToolRecipes 合并）

  ],
  villagerTools: {
    axe: {
      id: 'axe',
      name: '斧头',
      icon: '🪓',
      targets: ['forest', 'resin_grove'],
      maxLevel: 4,
      levelNames: { 1: '木斧', 2: '青铜斧', 3: '钢斧', 4: '金斧' },
    },
    pickaxe: {
      id: 'pickaxe',
      name: '镐子',
      icon: '⛏️',
      targets: [
        'quarry', 'copper_mine', 'iron_mine', 'coal_mine',
        'tin_mine', 'limestone_quarry', 'zinc_mine',
        'silver_mine', 'sulfur_vent', 'obsidian_deposit',
        'gold_mine', 'crystal_cave', 'meteor_crater',
      ],
      maxLevel: 4,
      levelNames: { 1: '木镐', 2: '黄铜镐', 3: '银镐', 4: '晶镐' },
    },
    shovel: {
      id: 'shovel',
      name: '铲子',
      icon: '🥄',
      targets: ['clay_pit', 'gravel_bed'],
      maxLevel: 4,
      levelNames: { 1: '木铲', 2: '灰浆铲', 3: '曜石铲', 4: '陨铲' },
    },
    sword: {
      id: 'sword',
      name: '剑',
      icon: '🗡️',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木剑', 2: '青铜剑', 3: '铁剑', 4: '钢剑' },
    },
    spear: {
      id: 'spear',
      name: '长矛',
      icon: '🔱',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木矛', 2: '青铜矛', 3: '铁矛', 4: '钢矛' },
    },
    bow: {
      id: 'bow',
      name: '弓',
      icon: '🏹',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木弓', 2: '青铜弓', 3: '铁弓', 4: '钢弓' },
    },
    crossbow: {
      id: 'crossbow',
      name: '弩',
      icon: '🎯',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木弩', 2: '青铜弩', 3: '铁弩', 4: '钢弩' },
    },
    shield: {
      id: 'shield',
      name: '盾',
      icon: '🛡️',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木盾', 2: '青铜盾', 3: '铁盾', 4: '钢盾' },
    },
    armor: {
      id: 'armor',
      name: '铠甲',
      icon: '🥋',
      targets: [],
      combat: true,
      maxLevel: 4,
      levelNames: { 1: '木甲', 2: '青铜甲', 3: '铁甲', 4: '钢甲' },
    },
  },

  housing: {
    startingVillagers: 10,
    /** 初始 10 间 × 容量 2 = 人口上限 20 */
    startingHouses: 10,
    /** 基础房屋人口上限；每升 1 级翻倍 */
    baseCapacity: 2,
    maxHouseLevel: 4,
    breedFoodCost: 10,
    /** 建造与升级所需计数点 */
    houseOrderCount: 20,
    /** 固定价格（不涨价）：原价的 1/3 */
    buildBaseCost: { wood: 7, stone: 5 },
    buildCostBump: null,
    upgrades: {
      1: {
        name: '木石基座',
        desc: '人口上限翻倍（2→4）：木板铺装 + 石板打底',
        baseCost: { plank: 5, stone_slab: 4 },
        costBump: null,
      },
      2: {
        name: '砖瓦开窗',
        desc: '人口上限翻倍（4→8）：砖墙 + 玻璃窗 + 中级矿料',
        baseCost: { brick: 5, glass: 3, copper_ore: 4, coal: 3 },
        costBump: null,
      },
      3: {
        name: '灰浆厅堂',
        desc: '人口上限翻倍（8→16）：石灰砂浆 + 青铜构件 + 铁矿骨架',
        baseCost: { lime: 5, bronze: 3, glass: 3, iron_ore: 5 },
        costBump: null,
      },
      4: {
        name: '精钢堡垒',
        desc: '人口上限翻倍（16→32）：钢梁 + 银饰 + 黑曜加固',
        baseCost: { steel: 3, iron_ingot: 5, silver_ingot: 3, obsidian: 3 },
        costBump: null,
      },
    },
  },

  /** 民生/防务科技数值 */
  housingTechBonuses: {
    breedFoodSavePerLevel: 1,
    houseCostDiscountPerLevel: 0.1,
    houseOrderReducePerLevel: 2,
    houseOrderMin: 8,
  },

  defenseCombatBonuses: {
    hpPerLevel: 0.08,
    atkPerLevel: 0.06,
    aspdPerLevel: 0.05,
    /** 科技「坚韧皮肤」：全体友军固定减伤 */
    toughSkinFlatDr: 1,
  },

  villagerWork: {
    baseSpeed: 0.05,
    // 持工具效率：默认值；正式以 config/tool-recipes.js → TOOL_EFFICIENCY 为准
    toolSpeedByLevel: { 1: 0.25, 2: 0.5, 3: 1.0, 4: 1.75 },
    baseClickPower: 1,
    // 手动点击由科技「点击强化」升级，不再由工具提供
    tooledSpeed: 0.25,
  },

  // 工具耐久默认值；正式以 config/tool-recipes.js → TOOL_DURABILITY 为准
  toolDurability: {
    maxByLevel: { 1: 150, 2: 300, 3: 600, 4: 1200 },
    repairMinMissing: 0.01,
    repairCostRatio: 0.5,
    wearPerUserPerSecond: 0.2,
  },

  /**
   * 日期与食物平衡（徒手采集速度 0.05/秒）：
   * 浆果丛 maxCount=12 → 单人约 0.05/12 食物/秒
   * 4 人采集 → 1/60 食物/秒
   * 一天现实时长 900 秒；夜间 22:00–06:00（占 1/3）村民休息不自动工作
   * → 日间自动工作约 600 秒 → 10 食物，刚好够 10 人口（每人 1 份/天）
   * 农场每座 4 人 maxCount=5 → 约 24 食物/天；可多座，人数上限叠加
   * 牧场每座 maxCount=3：4 人 → 40；满 8 人 → 80；可多座叠加上限
   */
  calendar: {
    dayDurationMs: 900000,
    foodPerVillager: 1,
    startingFood: 30,
    /** 新开局游戏内时刻（避开 6:00 日出单次音乐，开局直接进白天持续轨） */
    startHour: 8,
    /** 休息时段 [restStartHour, 24) ∪ [0, restEndHour) */
    restStartHour: 22,
    restEndHour: 6,
  },

  /** 新开档初始库存（难度选择后会再按难度覆盖食物与工具） */
  startingResources: {
    food: 30,
    wood: 3,
  },

  /** 难度配置 */
  difficulty: {
    levels: {
      peaceful: {
        id: 'peaceful',
        name: '和平',
        icon: '☮️',
        desc: '没有袭击，魔王数值大幅降低，食物需求减半；开局物资更充裕',
        foodMult: 0.5,
        bossAtkMult: 0.4,
        bossHpMult: 0.4,
        raidIntervalMult: 999,
        firstRaidDay: 9999,
        startingFood: 30,
        startingTools: [
          { id: 'axe', level: 1, amount: 2 },
          { id: 'pickaxe', level: 1, amount: 2 },
        ],
      },
      normal: {
        id: 'normal',
        name: '正常',
        icon: '⚖️',
        desc: '标准游戏体验',
        foodMult: 1,
        bossAtkMult: 1,
        bossHpMult: 1,
        raidIntervalMult: 1,
        firstRaidDay: 7,
        startingFood: 30,
        startingTools: [
          { id: 'axe', level: 1, amount: 1 },
        ],
      },
      hard: {
        id: 'hard',
        name: '困难',
        icon: '💀',
        desc: '袭击更多，魔王更强，食物消耗增加30%',
        foodMult: 1.3,
        bossAtkMult: 1.3,
        bossHpMult: 1.3,
        raidIntervalMult: 0.7,
        firstRaidDay: 5,
        startingFood: 15,
        startingTools: [],
      },
      hell: {
        id: 'hell',
        name: '地狱',
        icon: '🔥',
        desc: '袭击非常频繁，魔王极为强大，食物消耗激增60%',
        foodMult: 1.6,
        bossAtkMult: 1.6,
        bossHpMult: 1.6,
        raidIntervalMult: 0.4,
        firstRaidDay: 4,
        startingFood: 10,
        startingTools: [],
      },
    },
  },

  /** 新开档已解锁科技（教程必备：森林、宝箱、工具制作） */
  startingTechs: ['unlock_forest', 'unlock_treasure_chest', 'unlock_tool_crafting'],

  /**
   * 首次攒够第 N 次森林砍伐时，固定掉落引导宝箱（含一把木斧的材料）
   */
  starterChest: {
    afterForestHarvests: 2,
    tip: '🎁 采集区资源点有概率掉落宝箱（觅食点除外）！这次固定掉了一个——打开后可获得制作木斧的材料。',
    lootDialog: '拿到了不少材料，去解锁一下新科技',
    rewards: [
      { res: 'wood', amt: 10 },
      { res: 'plank', amt: 5 },
    ],
  },

  /** 生产订单完成后固定冷却（毫秒） */
  craftOrderCooldownMs: 250,

  toolUnlockMap: {},

  techTree: [
    {
      id: 'unlock_workbench',
      name: '工作台',
      icon: '🔨',
      description: '解锁工作台，开启科技研发',
      cost: { wood: 5 },
      requires: null,
      branch: 'root',
    },
    {
      id: 'unlock_forest',
      name: '森林',
      icon: '🌲',
      description: '开局已解锁。砍伐树木获取木头，并可在此升级森林采集',
      cost: {},
      requires: 'unlock_workbench',
      branch: 'mining',
    },
    {
      id: 'unlock_house_capacity',
      name: '房屋扩容',
      icon: '🏠',
      description: '基础房屋（未升级）每户容纳人数 +1（2→3）',
      cost: { wood: 18, plank: 8, stone: 6 },
      requires: 'unlock_auto_click',
      branch: 'workers',
    },
    ...expandTechSeries({
      id: 'unlock_house_build_discount',
      name: '筑梦术',
      icon: '🏗️',
      description: '建造与升级房屋材料消耗 −10%（可叠加）',
      requires: 'unlock_house_capacity',
      branch: 'workers',
      costs: [
        { plank: 12, stone: 10 },
        { brick: 15, stone_slab: 8 },
        { brick: 25, iron_ingot: 5, lime: 8 },
      ],
    }),
    ...expandTechSeries({
      id: 'unlock_house_work_speed',
      name: '速建脚手架',
      icon: '🔨',
      description: '房屋建造/升级所需进度 −2（可叠加）',
      requires: 'unlock_house_build_discount_v1',
      branch: 'workers',
      costs: [
        { wood: 20, plank: 10 },
        { wood: 30, plank: 15, stone: 10 },
        { plank: 25, stone_slab: 12 },
        { brick: 20, pitch: 8 },
        { iron_ingot: 8, gear: 3 },
      ],
    }),
    {
      id: 'unlock_tool_crafting',
      name: '工具制作',
      icon: '🪓',
      description: '开局已解锁。解锁工作台后可在「工具」页制作斧/镐/铲，在「武器」页制作弓/弩/剑/矛/盾/铠甲',
      cost: {},
      requires: 'unlock_workbench',
      branch: 'tools',
    },
    {
      id: 'unlock_farm',
      name: '开设农场',
      icon: '🌾',
      description: '解锁农场（每座最多 4 人，可再建多座叠加上限）。单座满员约供 25 人一天口粮',
      cost: { wood: 20, clay: 15, brick: 8, food: 10 },
      requires: 'unlock_auto_click',
      branch: 'workers',
    },
    ...expandTechSeries({
      id: 'unlock_food_gather_speed',
      name: '食物采集',
      icon: '🫐',
      description: '所有食物采集点（浆果丛/农场/牧场）每人效率 +0.01/秒（最高 3 级）',
      requires: 'unlock_farm',
      branch: 'workers',
      costs: [
        { food: 20, wood: 12, plank: 6 },
        { food: 35, plank: 12, brick: 8 },
        { food: 55, brick: 12, glass: 6 },
      ],
    }),
    ...expandTechSeries({
      id: 'unlock_breed_saving',
      name: '节粮繁衍',
      icon: '🍖',
      description: '每次繁殖消耗食物 −1（可叠加）',
      requires: 'unlock_pasture',
      branch: 'workers',
      costs: [
        { food: 25, wood: 10 },
        { food: 40, plank: 15 },
        { food: 60, brick: 12 },
        { food: 90, glass: 10, copper_ingot: 5 },
        { food: 120, iron_ingot: 4, glass: 12 },
      ],
    }),
    {
      id: 'unlock_pasture',
      name: '开设牧场',
      icon: '🐄',
      description: '解锁牧场（每座最多 8 人，可再建多座叠加上限）。单座 4 人约供 40，满员约 80',
      cost: { brick: 18, plank: 20, glass: 8, food: 30 },
      requires: 'unlock_farm',
      branch: 'workers',
    },
    {
      id: 'unlock_auto_click',
      name: '连点加速',
      icon: '👆',
      description: '按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）',
      requires: 'unlock_click_power',
      branch: 'root',
      repeatable: true,
      maxRepeat: 10,
      cost: { wood: 5 },
      repeatCosts: [
        { wood: 5 },
        { plank: 2, stone: 8 },
        { stone_slab: 3, clay: 11 },
        { brick: 4, gravel: 14 },
        { glass: 5, resin: 17 },
        { pitch: 6 },
        { copper_ore: 25, coal: 25 },
        { copper_ingot: 15, iron_ore: 25 },
        { iron_ingot: 15, coke: 10 },
        { steel: 15 },
      ],
    },
    {
      id: 'unlock_click_power',
      name: '点击强化',
      icon: '🖱️',
      description: '提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击',
      requires: 'unlock_workbench',
      branch: 'root',
      repeatable: true,
      maxRepeat: 4,
      cost: { wood: 10 },
      repeatCosts: [
        { wood: 10 },
        { plank: 5, stone: 15, clay: 15 },
        { stone_slab: 10, brick: 10, gravel: 20 },
        { glass: 15, stone_slab: 15, brick: 15, plank: 15 },
      ],
    },
    ...(() => {
      const list = expandTechSeries({
        id: 'unlock_tool_durability',
        name: '工具耐久提高',
        icon: '🛡️',
        description: '所有工具和武器耐久 +10%（可叠加）',
        requires: 'unlock_tool_crafting',
        branch: 'tools',
        costs: [
          { wood: 10, stone: 10, gravel: 10, clay: 10, resin: 10 },
          { plank: 12, stone: 14, clay: 12, gravel: 10 },
          { plank: 10, stone_slab: 8, brick: 6, resin: 8 },
          { stone_slab: 10, glass: 8, brick: 10, pitch: 4 },
          { plank: 10, stone_slab: 10, glass: 10, brick: 10, rosin: 10, copper_ingot: 5 },
        ],
      });
      // 较高耐久级仍要求松香与高级工作台（承接原 v2 门槛）
      list[4].requires = ['unlock_tool_durability_v4', 'unlock_pitch', 'unlock_advanced_workbench'];
      return list;
    })(),
    ...expandTechSeries({
      id: 'unlock_tool_efficiency',
      name: '工具精进',
      icon: '⚡',
      description: '所有工具提供的采集效率 +5%（可叠加）',
      requires: 'unlock_tool_durability_v1',
      branch: 'tools',
      costs: [
        { plank: 14, stone_slab: 10, clay: 8 },
        { plank: 18, brick: 8, gravel: 12 },
        { stone_slab: 12, brick: 10, pitch: 4 },
        { brick: 14, copper_ingot: 4, glass: 8 },
        { iron_ingot: 4, gear: 2, pitch: 6 },
      ],
    }),
    {
      id: 'unlock_quarry',
      name: '采石场',
      icon: '⛏️',
      description: '解锁采石场资源点',
      cost: { wood: 12, plank: 5 },
      requires: 'unlock_forest',
      branch: 'mining',
    },
    {
      id: 'unlock_clay_pit',
      name: '黏土坑',
      icon: '🟠',
      description: '解锁黏土坑资源点（前期资源，与石头同级）',
      cost: { wood: 10, plank: 3 },
      requires: 'unlock_forest',
      branch: 'mining',
    },
    {
      id: 'unlock_gravel',
      name: '砂砾滩',
      icon: '🏜️',
      description: '解锁砂砾滩（低级资源点，铲子采集）',
      cost: { wood: 12, plank: 4, stone: 6 },
      requires: 'unlock_quarry',
      branch: 'mining',
    },
    {
      id: 'unlock_resin',
      name: '松脂林',
      icon: '🍯',
      description: '解锁松脂林（低级），斧头采集树脂',
      cost: { wood: 14, stone: 6 },
      requires: ['unlock_forest', 'unlock_tool_efficiency_v1'],
      branch: 'mining',
    },
    {
      id: 'unlock_pitch',
      name: '松香提炼',
      icon: '🟤',
      description: '解锁松香配方（3树脂→1松香），用于齿轮等合成',
      cost: { resin: 12, wood: 8 },
      requires: 'unlock_brick_craft',
      branch: 'craft',
    },
    {
      id: 'unlock_brick_craft',
      name: '砖块烧制',
      icon: '🧱',
      description: '解锁砖配方，在合成页安排生产（5黏土→1砖）',
      cost: { clay: 8, wood: 5 },
      requires: 'unlock_workbench',
      branch: 'craft',
    },
    {
      id: 'unlock_treasure_chest',
      name: '宝箱',
      icon: '📦',
      description: '开局已解锁。砍够木头后会固定掉落引导宝箱；之后采集区资源点有1%概率掉落宝箱（觅食除外）',
      cost: {},
      requires: 'unlock_workbench',
      branch: 'mining',
    },
    {
      id: 'unlock_advanced_workbench',
      name: '高级工作台',
      icon: '🏗️',
      description: '解锁更高级的合成配方与熔炉前置（需砖块与石灰岩等中级材料）',
      cost: { brick: 12, limestone: 10, plank: 15, stone_slab: 10, gravel: 8 },
      requires: 'unlock_brick_craft',
      branch: 'craft',
    },
    {
      id: 'unlock_furnace',
      name: '熔炉',
      icon: '🔥',
      description: '解锁熔炉，可冶炼金属',
      cost: { stone_slab: 16, plank: 10, pitch: 4 },
      requires: 'unlock_advanced_workbench',
      branch: 'smelting',
    },
    {
      id: 'unlock_copper_mine',
      name: '铜矿',
      icon: '🏔️',
      description: '解锁铜矿资源点（中级采矿，需先打通石灰岩产线）',
      cost: { plank: 12, stone_slab: 12, limestone: 8 },
      requires: ['unlock_limestone', 'unlock_lime_craft'],
      branch: 'mining',
    },
    {
      id: 'unlock_copper_smelt',
      name: '铜锭冶炼',
      icon: '🔶',
      description: '解锁铜锭配方，在合成页安排生产',
      cost: { copper_ore: 5 },
      requires: 'unlock_furnace',
      branch: 'smelting',
    },
    {
      id: 'unlock_coal_mine',
      name: '煤矿',
      icon: '🕳️',
      description: '解锁煤矿资源点',
      cost: { stone_slab: 14, plank: 10, coal: 5 },
      requires: ['unlock_copper_mine', 'unlock_furnace'],
      branch: 'mining',
    },
    {
      id: 'unlock_tin_mine',
      name: '锡矿',
      icon: '🪙',
      description: '解锁锡矿（中级），可铸造青铜',
      cost: { plank: 18, stone: 14, copper_ore: 8 },
      requires: 'unlock_copper_mine',
      branch: 'mining',
    },
    {
      id: 'unlock_zinc_mine',
      name: '锌矿',
      icon: '🔘',
      description: '解锁锌矿（中级），可铸造黄铜',
      cost: { plank: 16, stone: 12, copper_ore: 10 },
      requires: 'unlock_copper_mine',
      branch: 'mining',
    },
    {
      id: 'unlock_brass_craft',
      name: '黄铜铸造',
      icon: '🟡',
      description: '解锁黄铜：1铜锭+1锌矿→1黄铜',
      cost: { copper_ingot: 5, zinc_ore: 8 },
      requires: 'unlock_copper_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_limestone',
      name: '石灰岩场',
      icon: '▫️',
      description: '解锁石灰石采集（中级）',
      cost: { stone: 16, plank: 10, gravel: 12 },
      requires: 'unlock_gravel',
      branch: 'mining',
    },
    {
      id: 'unlock_lime_craft',
      name: '石灰烧制',
      icon: '⬜',
      description: '解锁石灰配方（4石灰石→1石灰，需已有熔炉）',
      cost: { limestone: 12, coal: 5, brick: 6 },
      requires: 'unlock_furnace',
      branch: 'smelting',
    },
    {
      id: 'unlock_bronze_craft',
      name: '青铜铸造',
      icon: '🥉',
      description: '解锁青铜：2铜锭+1锡矿→1青铜',
      cost: { copper_ingot: 6, tin_ore: 5 },
      requires: 'unlock_copper_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_gear_craft',
      name: '齿轮制造',
      icon: '⚙️',
      description: '解锁齿轮配方，在合成页安排生产',
      cost: { copper_ingot: 8, pitch: 6 },
      requires: 'unlock_furnace',
      branch: 'craft',
    },
    {
      id: 'unlock_defense_training',
      name: '村民训战',
      icon: '⚔️',
      description: '开启防务强化科技线（生命/攻击/攻速/坚韧皮肤）',
      cost: { gear: 4, plank: 20, copper_ingot: 5 },
      requires: ['unlock_tool_durability_v5', 'unlock_gear_craft'],
      branch: 'defense',
    },
    ...expandTechSeries({
      id: 'unlock_combat_hp',
      name: '体魄锤炼',
      icon: '❤️',
      description: '友军生命 +8%（可叠加）',
      requires: 'unlock_defense_training',
      branch: 'defense',
      costs: [
        { food: 30, plank: 15 },
        { food: 45, brick: 12, stone_slab: 10 },
        { food: 60, iron_ingot: 6, bronze: 8 },
        { food: 80, steel: 4, lime: 12 },
        { food: 100, steel: 8, silver_ingot: 4 },
      ],
    }),
    ...expandTechSeries({
      id: 'unlock_combat_atk',
      name: '锋刃研磨',
      icon: '🗡️',
      description: '友军攻击 +6%（可叠加）',
      requires: 'unlock_defense_training',
      branch: 'defense',
      costs: [
        { copper_ingot: 6, stone_slab: 10 },
        { iron_ingot: 5, bronze: 8 },
        { iron_ingot: 10, gear: 4 },
        { steel: 6, pitch: 10 },
        { steel: 10, gold_ingot: 3 },
      ],
    }),
    ...expandTechSeries({
      id: 'unlock_combat_aspd',
      name: '快攻战术',
      icon: '💨',
      description: '友军攻速 +5%（可叠加）',
      requires: 'unlock_defense_training',
      branch: 'defense',
      costs: [
        { resin: 10, plank: 12 },
        { pitch: 8, plank: 18 },
        { pitch: 12, gear: 3 },
        { gear: 6, iron_ingot: 4 },
        { gear: 10, steel: 4 },
      ],
    }),
    {
      id: 'unlock_tough_skin',
      name: '坚韧皮肤',
      icon: '🪵',
      description: '所有己方单位固定减伤 +1（仅一级）',
      cost: { food: 40, resin: 12, copper_ingot: 6 },
      requires: 'unlock_defense_training',
      branch: 'defense',
    },
    {
      id: 'unlock_gate_lv2',
      name: '石板城门',
      icon: '🚪',
      compositeIcon: { resource: '🚪', type: '▦' },
      description: '城门升级为石板门（耐久360，减伤45%）',
      cost: { plank: 15, stone: 20 },
      requires: 'unlock_brick_craft',
      branch: 'defense',
      gateLevel: 2,
    },
    {
      id: 'unlock_gate_lv3',
      name: '砖铁城门',
      icon: '🚪',
      compositeIcon: { resource: '🚪', type: '🧱' },
      description: '城门升级为砖铁门（耐久560，减伤60%）',
      cost: { stone_slab: 20, brick: 15, pitch: 6 },
      requires: 'unlock_gate_lv2',
      branch: 'defense',
      gateLevel: 3,
    },
    {
      id: 'unlock_gate_lv4',
      name: '精钢城门',
      icon: '🚪',
      compositeIcon: { resource: '🚪', type: '🔩' },
      description: '城门升级为精钢门（耐久840，减伤70%）',
      cost: { brick: 25, iron_ingot: 12, lime: 10 },
      requires: 'unlock_gate_lv3',
      branch: 'defense',
      gateLevel: 4,
    },
    ...expandTechSeries({
      id: 'unlock_gate_repair_speed',
      name: '抢修训练',
      icon: '🔧',
      description: '修门队效率 +25%（每名村民每10秒基础修复2点耐久，可叠加）',
      requires: 'unlock_gate_lv2',
      branch: 'defense',
      costs: [
        { brick: 12, plank: 16, stone: 10 },
        { brick: 18, iron_ingot: 4, pitch: 6 },
        { iron_ingot: 8, lime: 8, gear: 2 },
        { steel: 4, brick: 20, gear: 4 },
      ],
    }),
    {
      id: 'unlock_iron_mine',
      name: '铁矿',
      icon: '🗻',
      description: '解锁铁矿资源点',
      cost: { copper_ingot: 10, gear: 3, plank: 20 },
      requires: ['unlock_coal_mine', 'unlock_gear_craft'],
      branch: 'mining',
    },
    {
      id: 'unlock_iron_smelt',
      name: '铁锭冶炼',
      icon: '⬜',
      description: '解锁铁锭配方，在合成页安排生产',
      cost: { iron_ore: 5, coal: 3 },
      requires: 'unlock_gear_craft',
      branch: 'smelting',
    },
    {
      id: 'unlock_silver_mine',
      name: '银矿',
      icon: '🔹',
      description: '解锁银矿（高级）',
      cost: { iron_ingot: 8, bronze: 6, gear: 4 },
      requires: ['unlock_tin_mine', 'unlock_bronze_craft', 'unlock_iron_smelt'],
      branch: 'mining',
    },
    {
      id: 'unlock_sulfur',
      name: '硫气孔',
      icon: '🟡',
      description: '解锁硫磺采集（高级）',
      cost: { iron_ore: 12, coal: 10, brick: 15 },
      requires: 'unlock_iron_mine',
      branch: 'mining',
    },
    {
      id: 'unlock_obsidian',
      name: '黑曜岩',
      icon: '🖤',
      description: '解锁黑曜石采集（高级）',
      cost: { iron_ingot: 6, sulfur: 8, lime: 8 },
      requires: 'unlock_sulfur',
      branch: 'mining',
    },
    {
      id: 'unlock_silver_smelt',
      name: '银锭冶炼',
      icon: '🪞',
      description: '解锁银锭：2银矿+1煤炭→1银锭',
      cost: { silver_ore: 8, coal: 5 },
      requires: 'unlock_iron_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_gunpowder',
      name: '火药配制',
      icon: '💥',
      description: '解锁火药：2硫磺+1煤炭→1火药',
      cost: { sulfur: 10, coal: 8 },
      requires: 'unlock_furnace_upgrade',
      branch: 'craft',
    },
    {
      id: 'unlock_furnace_upgrade',
      name: '熔炉升级',
      icon: '🔥',
      description: '升级熔炉：所有熔炉配方所需计数值减半，并可锻造钢材',
      cost: { iron_ingot: 10, coke: 12, brick: 15 },
      requires: 'unlock_iron_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_steel_smelt',
      name: '钢材锻造',
      icon: '🔩',
      description: '解锁钢配方：2铁锭+1焦炭→1钢（需已升级熔炉）',
      cost: { iron_ingot: 8, coke: 6, brick: 8 },
      requires: 'unlock_furnace_upgrade',
      branch: 'smelting',
    },
    {
      id: 'unlock_gold_mine',
      name: '金矿',
      icon: '🟨',
      description: '解锁金矿（终极资源点，计数 130）',
      cost: { steel: 12, silver_ingot: 8, gunpowder: 6 },
      requires: ['unlock_silver_mine', 'unlock_steel_smelt'],
      branch: 'mining',
    },
    {
      id: 'unlock_crystal',
      name: '水晶洞',
      icon: '💎',
      description: '解锁水晶洞（终极资源点，计数 130）',
      cost: { steel: 10, glass: 12, silver_ingot: 6 },
      requires: ['unlock_silver_mine', 'unlock_steel_smelt'],
      branch: 'mining',
    },
    {
      id: 'unlock_meteor',
      name: '陨石坑',
      icon: '☄️',
      description: '解锁陨石坑（终极资源点，计数 130）',
      cost: { steel: 12, gunpowder: 8, obsidian: 10 },
      requires: ['unlock_obsidian', 'unlock_steel_smelt'],
      branch: 'mining',
    },
    {
      id: 'unlock_star_metal',
      name: '陨铁冶炼',
      icon: '🌟',
      description: '解锁陨铁：2陨石+1煤炭→1陨铁',
      cost: { meteorite: 8, coal: 8 },
      requires: 'unlock_steel_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_gold_smelt',
      name: '金锭冶炼',
      icon: '🥇',
      description: '解锁金锭：2金矿+1煤炭→1金锭',
      cost: { gold_ore: 8, coal: 6 },
      requires: 'unlock_silver_smelt',
      branch: 'smelting',
    },
    {
      id: 'unlock_crystal_polish',
      name: '水晶抛光',
      icon: '💠',
      description: '解锁抛光水晶：1水晶+1玻璃→1抛光水晶',
      cost: { crystal: 6, glass: 12 },
      requires: 'unlock_silver_smelt',
      branch: 'craft',
    },
    ...expandTechSeries({
      id: 'unlock_worker_efficiency',
      name: '村民训练',
      icon: '👷',
      description: '村民徒手基础效率 +0.01/秒（可叠加）',
      requires: 'unlock_breed_saving_v1',
      branch: 'workers',
      costs: [
        { wood: 16, stone: 12, plank: 6 },
        { plank: 12, stone: 16, food: 20 },
        { brick: 10, plank: 15, food: 30 },
        { glass: 8, copper_ingot: 4, food: 40 },
        { iron_ingot: 4, gear: 2, food: 50 },
      ],
    }),
    {
      id: 'unlock_point_recovery',
      name: '快速恢复',
      icon: '💨',
      description: '所有资源点恢复时间 −10%',
      cost: { stone: 16, gravel: 12, plank: 10, coal: 8 },
      requires: 'unlock_furnace_upgrade',
      branch: 'craft',
    },
    {
      id: 'unlock_harvest_bounty',
      name: '丰饶祝福',
      icon: '🌟',
      description: '采集区每次基础产量 +1（浆果丛/农场/牧场等食物点除外）',
      cost: { steel: 10, gold_ingot: 5, polished_crystal: 4, star_metal: 3 },
      requires: 'unlock_worker_efficiency_v5',
      branch: 'workers',
    },
  ],

  /**
   * 科技树 UI 布局表（固定坐标 + 展示连线父节点）
   * - x/y：节点中心坐标（像素）
   * - parent：与 techTree.requires 首项一致（根为 null）
   *
   * 布局原则：
   * 1) 右 = 采集点解锁；下 = 合成/冶炼；上 = 工具训战；左 = 点击/房屋/农场
   * 2) 主干间距 260；支线正交或 45° 展开
   * 3) 合成/冶炼不挂采集点解锁（材料够即可研）；首项决定主干归属与连线
   */
  techTreeLayout: {
    canvas: { width: 6400, height: 6000 },
    nodes: {
      // 中心
      unlock_workbench: { x: 2000, y: 2000, parent: null },

      // ========== 上：工具耐久主干 + 精进左支 → 训战 ==========
      unlock_tool_crafting: { x: 2000, y: 1740, parent: 'unlock_workbench' },
      unlock_tool_durability_v1: { x: 2000, y: 1580, parent: 'unlock_tool_crafting' },
      unlock_tool_durability_v2: { x: 2000, y: 1420, parent: 'unlock_tool_durability_v1' },
      unlock_tool_durability_v3: { x: 2000, y: 1260, parent: 'unlock_tool_durability_v2' },
      unlock_tool_durability_v4: { x: 2000, y: 1100, parent: 'unlock_tool_durability_v3' },
      unlock_tool_durability_v5: { x: 2000, y: 940, parent: 'unlock_tool_durability_v4' },
      unlock_tool_efficiency_v1: { x: 1760, y: 1580, parent: 'unlock_tool_durability_v1' },
      unlock_tool_efficiency_v2: { x: 1760, y: 1420, parent: 'unlock_tool_efficiency_v1' },
      unlock_tool_efficiency_v3: { x: 1760, y: 1260, parent: 'unlock_tool_efficiency_v2' },
      unlock_tool_efficiency_v4: { x: 1760, y: 1100, parent: 'unlock_tool_efficiency_v3' },
      unlock_tool_efficiency_v5: { x: 1760, y: 940, parent: 'unlock_tool_efficiency_v4' },
      unlock_defense_training: { x: 2000, y: 780, parent: 'unlock_tool_durability_v5' },
      unlock_combat_hp_v1: { x: 2000, y: 620, parent: 'unlock_defense_training' },
      unlock_combat_hp_v2: { x: 2000, y: 480, parent: 'unlock_combat_hp_v1' },
      unlock_combat_hp_v3: { x: 2000, y: 340, parent: 'unlock_combat_hp_v2' },
      unlock_combat_hp_v4: { x: 2000, y: 200, parent: 'unlock_combat_hp_v3' },
      unlock_combat_hp_v5: { x: 2000, y: 60, parent: 'unlock_combat_hp_v4' },
      unlock_combat_atk_v1: { x: 1780, y: 620, parent: 'unlock_defense_training' },
      unlock_combat_atk_v2: { x: 1560, y: 480, parent: 'unlock_combat_atk_v1' },
      unlock_combat_atk_v3: { x: 1340, y: 340, parent: 'unlock_combat_atk_v2' },
      unlock_combat_atk_v4: { x: 1120, y: 200, parent: 'unlock_combat_atk_v3' },
      unlock_combat_atk_v5: { x: 900, y: 60, parent: 'unlock_combat_atk_v4' },
      unlock_combat_aspd_v1: { x: 2220, y: 620, parent: 'unlock_defense_training' },
      unlock_combat_aspd_v2: { x: 2440, y: 480, parent: 'unlock_combat_aspd_v1' },
      unlock_combat_aspd_v3: { x: 2660, y: 340, parent: 'unlock_combat_aspd_v2' },
      unlock_combat_aspd_v4: { x: 2880, y: 200, parent: 'unlock_combat_aspd_v3' },
      unlock_combat_aspd_v5: { x: 3100, y: 60, parent: 'unlock_combat_aspd_v4' },
      unlock_tough_skin: { x: 2440, y: 620, parent: 'unlock_defense_training' },
      // 上右：宝箱独立支
      unlock_treasure_chest: { x: 2300, y: 1740, parent: 'unlock_workbench' },

      // ========== 左：点击 → 房屋 / 农场 ==========
      unlock_click_power: { x: 1740, y: 2000, parent: 'unlock_workbench' },
      unlock_auto_click: { x: 1480, y: 2000, parent: 'unlock_click_power' },
      unlock_house_capacity: { x: 1220, y: 2000, parent: 'unlock_auto_click' },
      unlock_house_build_discount_v1: { x: 960, y: 2000, parent: 'unlock_house_capacity' },
      unlock_house_build_discount_v2: { x: 700, y: 2000, parent: 'unlock_house_build_discount_v1' },
      unlock_house_build_discount_v3: { x: 440, y: 2000, parent: 'unlock_house_build_discount_v2' },
      // 速建：再下移，避开城门横轴
      unlock_house_work_speed_v1: { x: 960, y: 1740, parent: 'unlock_house_build_discount_v1' },
      unlock_house_work_speed_v2: { x: 700, y: 1740, parent: 'unlock_house_work_speed_v1' },
      unlock_house_work_speed_v3: { x: 440, y: 1740, parent: 'unlock_house_work_speed_v2' },
      unlock_house_work_speed_v4: { x: 200, y: 1740, parent: 'unlock_house_work_speed_v3' },
      unlock_house_work_speed_v5: { x: 80, y: 1740, parent: 'unlock_house_work_speed_v4' },
      unlock_farm: { x: 1600, y: 1620, parent: 'unlock_auto_click' },
      unlock_food_gather_speed_v1: { x: 1600, y: 1400, parent: 'unlock_farm' },
      unlock_food_gather_speed_v2: { x: 1600, y: 1220, parent: 'unlock_food_gather_speed_v1' },
      unlock_food_gather_speed_v3: { x: 1600, y: 1040, parent: 'unlock_food_gather_speed_v2' },
      unlock_pasture: { x: 560, y: 1620, parent: 'unlock_farm' },
      unlock_breed_saving_v1: { x: 560, y: 1360, parent: 'unlock_pasture' },
      unlock_breed_saving_v2: { x: 360, y: 1360, parent: 'unlock_breed_saving_v1' },
      unlock_breed_saving_v3: { x: 180, y: 1360, parent: 'unlock_breed_saving_v2' },
      unlock_breed_saving_v4: { x: 40, y: 1360, parent: 'unlock_breed_saving_v3' },
      unlock_breed_saving_v5: { x: 40, y: 1160, parent: 'unlock_breed_saving_v4' },
      unlock_worker_efficiency_v1: { x: 560, y: 1100, parent: 'unlock_breed_saving_v1' },
      unlock_worker_efficiency_v2: { x: 360, y: 1100, parent: 'unlock_worker_efficiency_v1' },
      unlock_worker_efficiency_v3: { x: 180, y: 1100, parent: 'unlock_worker_efficiency_v2' },
      unlock_worker_efficiency_v4: { x: 40, y: 980, parent: 'unlock_worker_efficiency_v3' },
      unlock_worker_efficiency_v5: { x: 40, y: 820, parent: 'unlock_worker_efficiency_v4' },
      unlock_harvest_bounty: { x: 40, y: 660, parent: 'unlock_worker_efficiency_v5' },
      point_up_farm_efficiency: { x: 1400, y: 1340, parent: 'unlock_farm' },
      point_up_farm_cooldown: { x: 1400, y: 1120, parent: 'unlock_farm' },
      point_up_pasture_efficiency: { x: 720, y: 1320, parent: 'unlock_pasture' },
      point_up_pasture_cooldown: { x: 880, y: 1320, parent: 'unlock_pasture' },

      // ========== 右：采集点解锁 ==========
      unlock_forest: { x: 2260, y: 2000, parent: 'unlock_workbench' },
      unlock_resin: { x: 2780, y: 1740, parent: 'unlock_forest' },
      unlock_quarry: { x: 2520, y: 2000, parent: 'unlock_forest' },
      unlock_gravel: { x: 2780, y: 2000, parent: 'unlock_quarry' },
      unlock_limestone: { x: 3040, y: 2000, parent: 'unlock_gravel' },
      unlock_copper_mine: { x: 3300, y: 2000, parent: 'unlock_limestone' },
      unlock_tin_mine: { x: 3560, y: 2000, parent: 'unlock_copper_mine' },
      unlock_silver_mine: { x: 3820, y: 2000, parent: 'unlock_tin_mine' },
      unlock_gold_mine: { x: 4080, y: 2000, parent: 'unlock_silver_mine' },
      unlock_crystal: { x: 3820, y: 1740, parent: 'unlock_silver_mine' },
      unlock_clay_pit: { x: 2520, y: 2260, parent: 'unlock_forest' },
      unlock_zinc_mine: { x: 3300, y: 2260, parent: 'unlock_copper_mine' },
      unlock_coal_mine: { x: 3560, y: 2260, parent: 'unlock_copper_mine' },
      unlock_iron_mine: { x: 3820, y: 2260, parent: 'unlock_coal_mine' },
      unlock_sulfur: { x: 4080, y: 2260, parent: 'unlock_iron_mine' },
      unlock_obsidian: { x: 4340, y: 2260, parent: 'unlock_sulfur' },
      unlock_meteor: { x: 4600, y: 2260, parent: 'unlock_obsidian' },

      // ========== 下：合成 / 冶炼主干（x=2000）==========
      unlock_brick_craft: { x: 2000, y: 2260, parent: 'unlock_workbench' },
      unlock_advanced_workbench: { x: 2000, y: 2520, parent: 'unlock_brick_craft' },
      unlock_furnace: { x: 2000, y: 2780, parent: 'unlock_advanced_workbench' },
      unlock_gear_craft: { x: 2000, y: 3040, parent: 'unlock_furnace' },
      unlock_iron_smelt: { x: 2000, y: 3300, parent: 'unlock_gear_craft' },
      unlock_furnace_upgrade: { x: 2000, y: 3560, parent: 'unlock_iron_smelt' },
      unlock_steel_smelt: { x: 2000, y: 3820, parent: 'unlock_furnace_upgrade' },
      unlock_star_metal: { x: 2000, y: 4080, parent: 'unlock_steel_smelt' },

      // 下左：城门横轴 + 抢修再下一层（与左侧房屋速建分离）
      unlock_gate_lv2: { x: 1740, y: 2260, parent: 'unlock_brick_craft' },
      unlock_gate_lv3: { x: 1480, y: 2260, parent: 'unlock_gate_lv2' },
      unlock_gate_lv4: { x: 1220, y: 2260, parent: 'unlock_gate_lv3' },
      unlock_gate_repair_speed_v1: { x: 1740, y: 2520, parent: 'unlock_gate_lv2' },
      unlock_gate_repair_speed_v2: { x: 1480, y: 2520, parent: 'unlock_gate_repair_speed_v1' },
      unlock_gate_repair_speed_v3: { x: 1220, y: 2520, parent: 'unlock_gate_repair_speed_v2' },
      unlock_gate_repair_speed_v4: { x: 960, y: 2520, parent: 'unlock_gate_repair_speed_v3' },

      // 下右：松香 / 石灰 / 铜锭与合金 / 银金抛光 / 火药 / 快速恢复
      unlock_pitch: { x: 2260, y: 2520, parent: 'unlock_brick_craft' },
      unlock_lime_craft: { x: 2260, y: 2780, parent: 'unlock_furnace' },
      unlock_copper_smelt: { x: 2260, y: 3040, parent: 'unlock_furnace' },
      unlock_bronze_craft: { x: 2520, y: 3040, parent: 'unlock_copper_smelt' },
      unlock_brass_craft: { x: 2780, y: 3040, parent: 'unlock_copper_smelt' },
      unlock_silver_smelt: { x: 2260, y: 3300, parent: 'unlock_iron_smelt' },
      unlock_gold_smelt: { x: 2520, y: 3300, parent: 'unlock_silver_smelt' },
      unlock_crystal_polish: { x: 2780, y: 3300, parent: 'unlock_silver_smelt' },
      unlock_gunpowder: { x: 2260, y: 3560, parent: 'unlock_furnace_upgrade' },
      unlock_point_recovery: { x: 2260, y: 3820, parent: 'unlock_furnace_upgrade' },
    },
  },

  chestUpgradeCosts: {
    dropRate: [
      { wood: 20, stone: 10 },
      { wood: 30, stone: 15, plank: 5 },
      { wood: 45, stone: 25, plank: 10 },
      { wood: 60, stone: 35, plank: 15, copper_ore: 5 },
      { wood: 80, stone: 50, plank: 25, copper_ingot: 3 },
      { wood: 100, stone: 70, plank: 35, copper_ingot: 8 },
      { wood: 130, stone: 90, plank: 50, gear: 2 },
      { wood: 160, stone: 120, plank: 70, gear: 5, iron_ingot: 3 },
    ],
    rewardTypes: [
      { wood: 25, plank: 10 },
      { wood: 40, stone: 20, plank: 15 },
      { wood: 60, stone: 30, plank: 25, copper_ingot: 5 },
    ],
    rewardAmount: [
      { wood: 25, stone: 15 },
      { wood: 40, plank: 20, stone: 10 },
      { wood: 60, plank: 30, copper_ingot: 5 },
    ],
  },

  treasureChest: {
    baseDropRate: 0.01,
    dropRatePerLevel: 0.005,
    maxDropRate: 0.05,
    baseRewardTypesMin: 1,
    baseRewardTypesMax: 2,
    baseRewardAmountMin: 1,
    baseRewardAmountMax: 2,
  },

  /**
   * 村落防务：城门 + 来袭 + 战争（守卫从采集抽调，可徒手）
   * 游戏小时 = dayDurationMs / 24
   */
  defense: {
    introSeenKey: 'defenseIntroSeen',
    /** 首次袭击开战日（第 7 天）；预警提前 warningGameDays 天弹出 */
    firstRaidDay: 7,
    /** 袭击结束后距下次袭击：1～2 星期 */
    raidIntervalMinDays: 7,
    raidIntervalMaxDays: 14,
    minIntervalDays: 7,
    /** 预警提前天数（首次：第 5 天预警 → 第 7 天开战） */
    warningGameDays: 2,
    /** 战斗中换装/换编制：每人耗时（秒）；多人排队累加 */
    rosterSwapSecPerPerson: 1,
    /** 袭击开战窗口起始时刻（游戏内小时）；窗口为 [combatStartHour, combatStartHour+2) */
    combatStartHour: 10,
    combatMaxGameHours: 24,
    /** 战场长度（单位） */
    fieldLength: 100,
    /** 战场纵向半幅（y∈[-fieldYLimit, fieldYLimit] ≈ 覆盖场地上下 5%~95%） */
    fieldYLimit: 30,
    /** 城门/城墙位置（相对 fieldLength；略靠右给城内更多布阵空间） */
    wallX: 14,
    /** 敌对碰撞半径（战场坐标）；仅敌我相遇时互推，同阵营可穿越；也作列阵间距基准 */
    unitRadius: 1.15,
    /** 列阵/默认布阵间距相对「最小分离距离」的倍率（越大站位越疏） */
    formationGapMult: 1.75,
    /** 敌方出生线 */
    spawnX: 92,
    /** 敌人可砸门的距离 */
    gateReach: 4,
    // 敌我单位/铠甲/波次数据见 config/combat-units.js（由 applyCombatUnitsData 合并）
    gate: {
      maxLevel: 4,
      /** level 1..4（基础耐久已相对旧版翻倍） */
      levels: {
        1: {
          name: '木栅门',
          maxHp: 200,
          damageReduction: 0.25,
          upgradeCost: { plank: 15, stone: 20 },
        },
        2: {
          name: '石板门',
          maxHp: 360,
          damageReduction: 0.45,
          upgradeCost: { stone_slab: 20, brick: 15, pitch: 6 },
        },
        3: {
          name: '砖铁门',
          maxHp: 560,
          damageReduction: 0.6,
          upgradeCost: { brick: 25, iron_ingot: 12, lime: 10 },
        },
        4: {
          name: '精钢门',
          maxHp: 840,
          damageReduction: 0.7,
          upgradeCost: null,
        },
      },
      /** 每名修门村民每 10 秒（模拟时间）修复的基础耐久 */
      repairHpPerWorkerPer10s: 2,
      /** 「抢修训练」每级额外效率 */
      repairEfficiencyPerTechLevel: 0.25,
    },
    // waves 见 config/combat-units.js
    failPenalty: {
      lootRatio: 0.2,
      lootMinKeep: 1,
      villagersLostMin: 1,
      villagersLostMax: 3,
      foodPanicExtra: 5,
      houseDowngradeChance: 0.55,
    },
  },

  pointUpgradeMeta: {
    count: { label: '采集升级', finalMaxCountRatio: 0.5 },
    cooldown: { label: '资源恢复', finalCooldownRatio: 1 / 16 },
    double: { label: '资源精炼', bonusPerLevel: 1 },
    // 采集/恢复/精炼只花本资源
  },

  autoSpeed: {
    base: 0.1,
    perLevel: 0.1,
    maxLevel: 9,
    max: 1.0,
  },

  workerSpeedUpgrade: {
    costs: [
      { wood: 20 },
      { wood: 30, plank: 10 },
      { wood: 45, plank: 15 },
      { wood: 60, plank: 20, stone: 10 },
      { wood: 80, plank: 30, stone: 15 },
      { wood: 100, plank: 40, stone: 20, copper_ingot: 5 },
      { wood: 130, plank: 55, stone: 30, copper_ingot: 10 },
      { wood: 160, plank: 70, stone: 40, copper_ingot: 15, gear: 3 },
      { wood: 200, plank: 90, stone: 50, copper_ingot: 20, gear: 5 },
    ],
  },


  holdClick: {
    baseCooldown: 1000,
    minCooldown: 200,
    maxLevel: 10,
  },

  /**
   * 新手教程：可随时跳过；步骤靠操作完成或「下一步」推进。
   * 禁止自动切页签/站点——只高亮入口，由玩家自己点过去。
   * highlight: CSS 选择器数组；check/progress 由游戏逻辑解释
   */
  tutorial: {
    steps: [
      {
        id: 'chop_woods',
        title: '采集木头',
        text: '点左侧「森林」，再点击中间继续砍树，再砍满 2 次。',
        highlight: ['.station-btn[data-station-id="forest"]', '#click-area'],
        progress: 'forestHarvests',
        target: 2,
      },
      {
        id: 'open_starter_chest',
        title: '开启宝箱',
        text: '第二根木头时固定掉了一个宝箱。自己去左侧「宝箱」打开，里面是制作木斧的材料。',
        highlight: ['.station-btn[data-station-id="treasure_chest"]'],
      },
      {
        id: 'open_tech_tree',
        title: '打开科技树',
        text: '自己点右侧「科技」，打开科技树页面，可以看到各项科技。',
        highlight: ['.tab-btn[data-tab="tech"]'],
      },
      {
        id: 'unlock_workbench',
        title: '解锁工作台',
        text: '打开「科技」后，找到「工作台」并点击解锁。解锁后请先制作木斧，再去森林派工。',
        highlight: ['.tab-btn[data-tab="tech"]', '.tech-node[data-tech-id="unlock_workbench"]'],
      },
      {
        id: 'craft_tool',
        title: '制作木斧',
        text: '工作台已解锁。先打开「工具」页，用宝箱材料下单并加工出「木斧」，做好后再去森林派工。',
        highlight: ['.tab-btn[data-tab="tools"]', '.craft-overview-item[data-recipe-id="craft_axe_1"]'],
        progress: 'tool',
        target: 1,
      },
      {
        id: 'assign_forest',
        title: '分配村民',
        text: '木斧做好了。可以给森林分配村民，他们会自动砍树。先点左侧「森林」，再在下方工人栏点「+」派出至少 2 人。',
        highlight: ['.station-btn[data-station-id="forest"]', '#point-workers'],
      },
      {
        id: 'tool_efficiency_hint',
        title: '工具提升效率',
        text: '森林已有村民在自动砍树。看下方效率提示——有斧头的村民效率远高于徒手。',
        highlight: ['.station-btn[data-station-id="forest"]', '#point-workers .hint'],
        requireNext: true,
      },
      {
        id: 'food_intro',
        title: '别忘了食物',
        text: '记得采集食物！食物不够时村民会饥饿并降低效率；若连续缺粮，村民还会饿死。自己点左侧「浆果丛」采集 3 次。',
        highlight: ['.station-btn[data-station-id="berry_bush"]'],
        progress: 'berries',
        target: 3,
      },
      {
        id: 'assign_berry',
        title: '浆果丛派工',
        text: '手动采够了。再给「浆果丛」分配村民自动采集：在下方工人栏点「+」，派出至少 4 人。',
        highlight: ['.station-btn[data-station-id="berry_bush"]', '#point-workers'],
      },
      {
        id: 'warehouse_food',
        title: '今日口粮',
        text: '看右上角食物显示：库存 / 今日预计消耗。不足时会变红加粗，记得每天盯着它安排采集。',
        highlight: ['#header-food'],
        requireNext: true,
      },
      {
        id: 'workers_breed',
        title: '村民繁衍',
        text: '自己打开「村民」页。有空余房屋、且食物足够时，可预约繁衍；村民会在晚上休息时段繁衍，次日加人。',
        highlight: ['.tab-btn[data-tab="workers"]', '#tutorial-village-breed'],
        requireNext: true,
      },
      {
        id: 'worker_manage',
        title: '统一分配工作',
        text: '「村民」页下方可统一查看/收回/恢复各站点派工。看完点「下一步」。',
        highlight: ['.tab-btn[data-tab="workers"]', '#tutorial-worker-manage', '.worker-station-list'],
        requireNext: true,
      },
      {
        id: 'craft_plank',
        title: '第一件加工品',
        text: '自己打开「合成」页下单制作木板。下单后请再点左侧「生产」进入加工界面，点击做出 1 块即可。',
        highlight: ['.tab-btn[data-tab="craft"]', '.craft-overview-item[data-recipe-id="craft_plank"]'],
        progress: 'plank',
        target: 1,
      },
      {
        id: 'craft_weapon',
        title: '制作第一件武器',
        text: '自己打开「武器」页下单制作任意一件武器（如木弓、木剑）。下单后点左侧「生产」进入并点击做出一件。',
        highlight: ['.tab-btn[data-tab="weapons"]', '#weapon-list .craft-overview-item'],
        progress: 'weapon',
        target: 1,
      },
      {
        id: 'defense_open',
        title: '打开防务',
        text: '自己点右侧「防务」，查看袭击日程与战场。',
        highlight: ['.tab-btn[data-tab="defense"]'],
      },
      {
        id: 'defense_stance',
        title: '指挥姿态',
        text: '打开「防务」后，试着点一下「防御 / 出击 / 随军出击」任意姿态。',
        highlight: ['.tab-btn[data-tab="defense"]', '#defense-stance-card', '.btn-defense-stance'],
      },
      {
        id: 'defense_assign',
        title: '出战编制',
        text: '打开「防务」后，请至少编入 1 名战斗人员（弓/剑等，受武器库存限制）。',
        highlight: ['.tab-btn[data-tab="defense"]', '#defense-roster-card'],
      },
      {
        id: 'defense_formation',
        title: '战场布阵',
        text: '打开「防务」后看左侧战场：左键拖拽框选/点选；Ctrl+左键加减选；右键下令移动；中键在鼠标处切换列阵（竖列→横列→聚团）。看完点「下一步」。',
        highlight: ['.tab-btn[data-tab="defense"]', '#battle-embed-field', '#battle-embed-hint'],
        requireNext: true,
      },
      {
        id: 'defense_gate',
        title: '城门与袭击',
        text: '打开「防务」后查看城门与日程：城门可升级；战时未编入战斗的村民自动修门。首次袭击约第 7 天，第 5 天预警。点「下一步」。',
        highlight: ['.tab-btn[data-tab="defense"]', '#defense-gate-card', '#defense-status-card'],
        requireNext: true,
      },
      {
        id: 'done',
        title: '教程完成',
        text: '你已学会采集、工具、分配、口粮、加工与防务布阵。魔王爪牙还会来袭——记得多备武器与编制。祝重建顺利！',
        highlight: [],
        requireNext: true,
        finishOnNext: true,
      },
    ],
  },
};

/** 成就表：资源囤积 / 人口 / 工具库存 */
GAME_DATA.achievements = (() => {
  const list = [];
  Object.values(GAME_DATA.resources).forEach(r => {
    list.push({
      id: `stock_${r.id}_10000`,
      name: `${r.name}囤积者`,
      description: `${r.icon} ${r.name}存量达到 10,000`,
      icon: r.icon,
      type: 'resource_stock',
      targetId: r.id,
      threshold: 10000,
    });
  });
  list.push({
    id: 'pop_1000',
    name: '千人村落',
    description: '村民总数达到 1,000',
    icon: '👥',
    type: 'population',
    threshold: 1000,
  });
  Object.values(GAME_DATA.villagerTools || {}).forEach(t => {
    list.push({
      id: `tool_${t.id}_200`,
      name: `${t.name}储备`,
      description: `${t.icon} ${t.name}库存合计达到 200`,
      icon: t.icon,
      type: 'tool_stock',
      targetId: t.id,
      threshold: 200,
    });
  });
  return list;
})();

/** 四向主干布局已在 techTreeLayout 中固定，这里只保证画布尺寸，并同步 parent=requires[0] */
(function rebalanceBaseTechTreeLayout() {
  const layout = GAME_DATA.techTreeLayout;
  if (!layout?.nodes) return;
  layout.canvas = { width: 6400, height: 6000 };
  const byId = Object.fromEntries(GAME_DATA.techTree.map((t) => [t.id, t]));
  Object.keys(layout.nodes).forEach((id) => {
    if (id.startsWith('point_up_')) return;
    const tech = byId[id];
    if (!tech) return;
    if (tech.requires == null) {
      layout.nodes[id].parent = null;
      return;
    }
    const reqs = Array.isArray(tech.requires) ? tech.requires : [tech.requires];
    if (reqs[0]) layout.nodes[id].parent = reqs[0];
  });
})();

/** 注入资源点升级科技与布局 */
(function injectPointUpgradeTechs() {
  const entries = generatePointUpgradeTechEntries(
    GAME_DATA.resourcePoints,
    GAME_DATA.chestUpgradeCosts
  );
  GAME_DATA.techTree.push(...entries);
  const pointLayout = generatePointUpgradeTechLayout(
    GAME_DATA.resourcePoints,
    GAME_DATA.techTreeLayout.nodes
  );
  Object.assign(GAME_DATA.techTreeLayout.nodes, pointLayout);
})();

/**
 * 资源点升级簇：一律向右侧展开（采集区在右），解锁点分出采集/恢复两叉，精炼更外侧汇合
 */
function rebalancePointUpgradeClusters() {
  const nodes = GAME_DATA.techTreeLayout?.nodes;
  if (!nodes) return;
  const setNode = (id, x, y, parent = nodes[id]?.parent) => {
    if (!nodes[id]) return;
    nodes[id] = { ...nodes[id], x, y, parent };
  };
  const DIRS = {
    right: { dx: 1, dy: 0 },
    left: { dx: -1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    'up-right': { dx: 1, dy: -1 },
    'up-left': { dx: -1, dy: -1 },
    'down-right': { dx: 1, dy: 1 },
    'down-left': { dx: -1, dy: 1 },
  };
  const STEP = 200;
  const placeStd = (pointId, ax, ay, dirName, start = 1, anchorId) => {
    const d = DIRS[dirName] || DIRS.right;
    const perp = { dx: -d.dy, dy: d.dx };
    const len = Math.hypot(d.dx, d.dy) || 1;
    const ux = d.dx / len;
    const uy = d.dy / len;
    const px = perp.dx / (Math.hypot(perp.dx, perp.dy) || 1);
    const py = perp.dy / (Math.hypot(perp.dx, perp.dy) || 1);
    const baseX = ax + ux * STEP * start;
    const baseY = ay + uy * STEP * start;
    const spread = STEP * 0.62;
    const pCount = { x: baseX + px * spread, y: baseY + py * spread };
    const pCooldown = { x: baseX - px * spread, y: baseY - py * spread };
    // 精炼再往外一档，减少与下一解锁点打架
    const pRefine = {
      x: ax + ux * STEP * (start + 1.35),
      y: ay + uy * STEP * (start + 1.35),
    };
    const countId = pointUpgradeTechId(pointId, 'count');
    const cooldownId = pointUpgradeTechId(pointId, 'cooldown');
    const refineId = pointUpgradeTechId(pointId, 'refine');
    const parentId = anchorId || nodes[countId]?.parent;
    setNode(countId, Math.round(pCount.x), Math.round(pCount.y), parentId);
    setNode(cooldownId, Math.round(pCooldown.x), Math.round(pCooldown.y), parentId);
    setNode(refineId, Math.round(pRefine.x), Math.round(pRefine.y), cooldownId);
    if (nodes[refineId]) {
      nodes[refineId].parents = [countId, cooldownId];
    }
  };
  const placeChest = (ax, ay, dirName) => {
    const d = DIRS[dirName] || DIRS.right;
    const ids = ['dropRate', 'rewardTypes', 'rewardAmount'];
    ids.forEach((t, i) => {
      const n = i + 1;
      setNode(
        pointUpgradeTechId('treasure_chest', t),
        Math.round(ax + d.dx * STEP * n),
        Math.round(ay + d.dy * STEP * n),
        'unlock_treasure_chest'
      );
    });
  };
  const A = (id) => nodes[id] || { x: 2000, y: 2000 };

  // 森林升级向上；宝箱向左上，避开森林簇
  placeStd('forest', A('unlock_forest').x, A('unlock_forest').y, 'up', 1.15, 'unlock_forest');
  placeStd('resin_grove', A('unlock_resin').x, A('unlock_resin').y, 'up-right', 1, 'unlock_resin');
  placeChest(A('unlock_treasure_chest').x, A('unlock_treasure_chest').y, 'up-right');

  placeStd('quarry', A('unlock_quarry').x, A('unlock_quarry').y, 'up-right', 1, 'unlock_quarry');
  placeStd('gravel_bed', A('unlock_gravel').x, A('unlock_gravel').y, 'up-right', 1, 'unlock_gravel');
  placeStd('limestone_quarry', A('unlock_limestone').x, A('unlock_limestone').y, 'up-right', 1, 'unlock_limestone');
  placeStd('copper_mine', A('unlock_copper_mine').x, A('unlock_copper_mine').y, 'up-right', 1, 'unlock_copper_mine');
  placeStd('tin_mine', A('unlock_tin_mine').x, A('unlock_tin_mine').y, 'up-right', 1, 'unlock_tin_mine');
  placeStd('zinc_mine', A('unlock_zinc_mine').x, A('unlock_zinc_mine').y, 'down-right', 1, 'unlock_zinc_mine');
  placeStd('silver_mine', A('unlock_silver_mine').x, A('unlock_silver_mine').y, 'up-right', 1, 'unlock_silver_mine');
  placeStd('gold_mine', A('unlock_gold_mine').x, A('unlock_gold_mine').y, 'up-right', 1, 'unlock_gold_mine');
  placeStd('crystal_cave', A('unlock_crystal').x, A('unlock_crystal').y, 'up-right', 1, 'unlock_crystal');

  placeStd('clay_pit', A('unlock_clay_pit').x, A('unlock_clay_pit').y, 'down-right', 1, 'unlock_clay_pit');
  placeStd('coal_mine', A('unlock_coal_mine').x, A('unlock_coal_mine').y, 'down-right', 1, 'unlock_coal_mine');
  placeStd('iron_mine', A('unlock_iron_mine').x, A('unlock_iron_mine').y, 'down-right', 1, 'unlock_iron_mine');
  placeStd('sulfur_vent', A('unlock_sulfur').x, A('unlock_sulfur').y, 'down-right', 1, 'unlock_sulfur');
  placeStd('obsidian_deposit', A('unlock_obsidian').x, A('unlock_obsidian').y, 'down-right', 1, 'unlock_obsidian');
  placeStd('meteor_crater', A('unlock_meteor').x, A('unlock_meteor').y, 'down-right', 1, 'unlock_meteor');

  // 农场/牧场：升级簇错位，牧场向右上（躲开繁殖链），农场向左上（躲开工具）
  const placeFoodUp = (pointId, unlockId) => {
    const a = A(unlockId);
    if (pointId === 'pasture') {
      setNode('point_up_pasture_efficiency', a.x + 160, a.y - 300, unlockId);
      setNode('point_up_pasture_cooldown', a.x + 320, a.y - 300, unlockId);
    } else {
      setNode('point_up_farm_efficiency', a.x - 200, a.y - 280, unlockId);
      setNode('point_up_farm_cooldown', a.x - 200, a.y - 500, unlockId);
    }
  };
  placeFoodUp('farm', 'unlock_farm');
  placeFoodUp('pasture', 'unlock_pasture');
}
rebalancePointUpgradeClusters();


/**
 * 合并工具/武器/护甲制作配方（config/tool-recipes.js）
 * 会替换 GAME_DATA.recipes 中已有的 isToolRecipe 条目
 */
function applyToolRecipes(list) {
  if (!Array.isArray(list) || !GAME_DATA?.recipes) return;
  const kept = GAME_DATA.recipes.filter((r) => !r.isToolRecipe);
  GAME_DATA.recipes = kept.concat(list.map((r) => ({ ...r, isToolRecipe: true })));
}

/** 合并持工具效率（config/tool-recipes.js → TOOL_EFFICIENCY） */
function applyToolEfficiency(data) {
  if (!data || !GAME_DATA?.villagerWork) return;
  if (data.toolSpeedByLevel && typeof data.toolSpeedByLevel === 'object') {
    GAME_DATA.villagerWork.toolSpeedByLevel = { ...data.toolSpeedByLevel };
  }
  if (data.tooledSpeed != null) GAME_DATA.villagerWork.tooledSpeed = Number(data.tooledSpeed);
}

/** 合并工具耐久（config/tool-recipes.js → TOOL_DURABILITY） */
function applyToolDurability(data) {
  if (!data || !GAME_DATA) return;
  if (!GAME_DATA.toolDurability) GAME_DATA.toolDurability = {};
  if (data.maxByLevel && typeof data.maxByLevel === 'object') {
    GAME_DATA.toolDurability.maxByLevel = { ...data.maxByLevel };
  }
  ['repairMinMissing', 'repairCostRatio', 'wearPerUserPerSecond'].forEach((k) => {
    if (data[k] != null) GAME_DATA.toolDurability[k] = Number(data[k]);
  });
}

/**
 * 合并资源点初始计数/冷却等（config/resource-points.js）
 * 只覆盖表内出现的字段，不影响解锁、升级费用等其它定义
 */
function applyResourcePointStats(table) {
  if (!table || !GAME_DATA?.resourcePoints) return;
  Object.entries(table).forEach(([id, stats]) => {
    if (!stats || typeof stats !== 'object') return;
    const pt = GAME_DATA.resourcePoints[id];
    if (!pt) {
      console.warn('[config] resource-points 未知资源点 id:', id);
      return;
    }
    ['baseMaxCount', 'baseCooldown', 'baseYield', 'finalCooldownRatio'].forEach((k) => {
      if (stats[k] != null) pt[k] = Number(stats[k]);
    });
  });
}

/**
 * 合并敌我单位战斗数据（config/combat-units.js）
 * 覆盖 allyStats / armorStats / enemyDefaults / enemyTemplates / waves
 */
function applyCombatUnitsData(data) {
  if (!data || !GAME_DATA?.defense) return;
  const keys = ['allyStats', 'armorStats', 'enemyDefaults', 'enemyTemplates', 'waves'];
  keys.forEach((k) => {
    if (data[k] != null) GAME_DATA.defense[k] = data[k];
  });
  // 清理旧档/旧配置残留的冗余 weapons 表
  if (GAME_DATA.defense.weapons) delete GAME_DATA.defense.weapons;
}

/**
 * 应用科技树数据表（布局 / 依赖 / 费用）
 * 由 config/tech-tree-table.js 或编辑器导出覆盖 data.js 中的默认值
 */
function applyTechTreeTable(table) {
  if (!table || !table.techs || !GAME_DATA?.techTreeLayout?.nodes) return;
  if (table.canvas) {
    GAME_DATA.techTreeLayout.canvas = { ...GAME_DATA.techTreeLayout.canvas, ...table.canvas };
  }
  const byId = Object.fromEntries(GAME_DATA.techTree.map((t) => [t.id, t]));

  const applyLayoutRow = (id, row) => {
    if (!row) return;
    if (!GAME_DATA.techTreeLayout.nodes[id]) {
      GAME_DATA.techTreeLayout.nodes[id] = { x: 0, y: 0, parent: null };
    }
    const node = GAME_DATA.techTreeLayout.nodes[id];
    if (row.x != null) node.x = row.x;
    if (row.y != null) node.y = row.y;
    if (Object.prototype.hasOwnProperty.call(row, 'parents')) {
      if (Array.isArray(row.parents) && row.parents.length > 1) {
        node.parents = [...row.parents];
        node.parent = row.parents[0];
      } else if (Array.isArray(row.parents) && row.parents.length === 1) {
        node.parent = row.parents[0];
        delete node.parents;
      } else if (!row.parents || (Array.isArray(row.parents) && !row.parents.length)) {
        delete node.parents;
        if (Object.prototype.hasOwnProperty.call(row, 'parent')) node.parent = row.parent;
      }
    } else if (Object.prototype.hasOwnProperty.call(row, 'parent')) {
      node.parent = row.parent;
      delete node.parents;
    }
  };

  Object.entries(table.techs).forEach(([id, row]) => {
    if (!row) return;
    // point_up：只覆盖布局（含多父连线），费用/依赖由生成逻辑管
    if (id.startsWith('point_up_')) {
      applyLayoutRow(id, row);
      return;
    }
    const tech = byId[id];
    if (tech) {
      if (Object.prototype.hasOwnProperty.call(row, 'requires')) {
        tech.requires = row.requires == null
          ? null
          : (Array.isArray(row.requires) ? [...row.requires] : row.requires);
      }
      if (row.cost && typeof row.cost === 'object') {
        tech.cost = { ...row.cost };
      }
    }
    applyLayoutRow(id, row);
  });

  if (typeof rebalancePointUpgradeClusters === 'function') {
    rebalancePointUpgradeClusters();
  }
  // rebalance 可能改写 point_up 布局：再覆盖一次表内坐标/多父节点
  Object.entries(table.techs).forEach(([id, row]) => {
    if (!row) return;
    applyLayoutRow(id, row);
  });
}

