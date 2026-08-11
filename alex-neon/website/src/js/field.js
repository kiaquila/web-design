/* Alex Neon — shared neural-field generator.

   Pure data: no DOM, no canvas, no colours applied. The page renderer
   (neural.js) and the social-card renderer (scripts/make-og.mjs) both build
   their figure from here, so the card shows the same figure as the hero.

   Structure follows a real dendritic tree rather than a scatter of dots:
   filaments radiate from a hub, keep their curvature so they read as smooth
   arcs, branch as they go, and end in somas. Every point along a filament is a
   node, and their radii vary widely — hair-fine along the path, prominent at
   the endings — so no two branches look alike. */

export const TEAL = [46, 230, 214];
export const VIOLET = [139, 92, 246];

/** Deterministic PRNG, so a given seed always yields the same figure. */
export function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Returned for a degenerate box, so no caller has to divide by a zero axis. */
const EMPTY_FIELD = {
  count: 0,
  x: new Float32Array(0),
  y: new Float32Array(0),
  r: new Float32Array(0),
  edgeCount: 0,
  ea: new Int32Array(0),
  eb: new Int32Array(0),
  elong: new Uint8Array(0),
  cx: 0,
  rx: 1
};

/** Teal → violet across the figure's width, as 0–255 channels. */
export function ramp(t) {
  const s = smoothstep(clamp01(t));
  return [
    Math.round(TEAL[0] + (VIOLET[0] - TEAL[0]) * s),
    Math.round(TEAL[1] + (VIOLET[1] - TEAL[1]) * s),
    Math.round(TEAL[2] + (VIOLET[2] - TEAL[2]) * s)
  ];
}

/**
 * @param {object} o
 * @param {number} o.cx        field centre x, in render units
 * @param {number} o.cy        field centre y
 * @param {number} o.rx        half-width of the field ellipse
 * @param {number} o.ry        half-height of the field ellipse
 * @param {number} o.nodes     target node count
 * @param {number} [o.seed]
 * @param {number} [o.scale]   unit scale (device pixel ratio) for radii
 * @param {number} [o.leftBias] 0–1: how much the left side thins out, so copy
 *                              sitting there keeps its contrast
 * @param {{x:number,y:number}[]} [o.anchors] hubs to grow from; defaults to one
 *                              hub at the centre
 * @returns {{count:number,x:Float32Array,y:Float32Array,r:Float32Array,
 *            edgeCount:number,ea:Int32Array,eb:Int32Array,elong:Uint8Array,
 *            rx:number,cx:number}}
 */
export function generateField(o) {
  const { cx, cy, rx, ry, nodes: target, seed = 0x5eed, scale = 1 } = o;
  const leftBias = o.leftBias ?? 0;
  const rng = mulberry32(seed);
  if (!(rx > 0) || !(ry > 0) || !(target > 0)) return EMPTY_FIELD;
  /* Geometric mean, not min(): a wide shallow band would otherwise get
     hair-thin filaments driven by its short side. */
  const unit = Math.sqrt(rx * ry);
  const hubs = o.anchors?.length ? o.anchors : [{ x: cx, y: cy }];

  const cap = Math.round(target * 1.6) + 64;
  const x = new Float32Array(cap);
  const y = new Float32Array(cap);
  const r = new Float32Array(cap);
  let count = 0;
  const ea = [];
  const eb = [];
  const elong = [];

  /* 0 = full density, 1 = nothing. Thins the side the copy sits on. */
  const thinning = (px) => {
    if (!leftBias) return 0;
    const t = clamp01((px - (cx - rx)) / (2 * rx));
    return leftBias * (1 - smoothstep(t));
  };

  /** 0 at the centre, 1 on the boundary. */
  const radial = (px, py) => {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return Math.min(1, Math.sqrt(dx * dx + dy * dy));
  };

  const outside = (px, py) => radial(px, py) >= 1;

  const addNode = (px, py, radius) => {
    if (count >= cap) return -1;
    x[count] = px;
    y[count] = py;
    r[count] = radius * scale;
    return count++;
  };

  const addEdge = (a, b, long) => {
    if (a < 0 || b < 0 || a === b) return;
    ea.push(a);
    eb.push(b);
    elong.push(long ? 1 : 0);
  };

  /* Short steps: a straight line between neighbours then reads as a curve. */
  const STEP = unit * 0.05;
  const MAX_DEPTH = 6;

  /**
   * Grows one dendrite. `curve` is a persistent turn rate, which is what makes
   * the filament an arc instead of a random walk.
   */
  /** Turns a node into a visible ending. Squaring the random part skews the
      sizes so a few somas are much larger than the rest. */
  const makeSoma = (node) => {
    if (node < 0) return;
    r[node] = (1.5 + rng() * rng() * 3.4) * scale;
  };

  /** Adds an ending owned by this branch instead of enlarging its shared fork. */
  const addTerminal = (previous, px, py, budgetEnd) => {
    if (count >= budgetEnd) return;
    const terminal = addNode(px, py, 1);
    if (terminal < 0) return;
    addEdge(previous, terminal, false);
    makeSoma(terminal);
  };

  function grow(fromIndex, startX, startY, angle, curve, depth, budgetEnd) {
    const segments = 3 + Math.floor(rng() * 3);
    let previous = fromIndex;
    let px = startX;
    let py = startY;

    for (let s = 0; s < segments; s++) {
      if (count >= budgetEnd) {
        if (previous !== fromIndex) makeSoma(previous);
        return;
      }
      angle += curve + (rng() - 0.5) * 0.05;
      /* Long strides near the middle, short ones out by the rim: the inside of
         the circle then holds fewer neurons than its edge. */
      const t = radial(px, py);
      const step = STEP * (0.8 + rng() * 0.5) * (1 + depth * 0.15) * (1.75 - 0.85 * t);
      const insideX = px;
      const insideY = py;
      px += Math.cos(angle) * step;
      py += Math.sin(angle) * step;
      /* A filament that leaves the field still ends in a soma — most of them
         end this way, and without it the figure has no visible endings. Place
         a child-owned node just inside the boundary: the preceding node may be
         a fork shared with a sibling and must remain a junction bead. */
      if (outside(px, py)) {
        let low = 0;
        let high = 1;
        for (let i = 0; i < 10; i++) {
          const mid = (low + high) / 2;
          const probeX = insideX + (px - insideX) * mid;
          const probeY = insideY + (py - insideY) * mid;
          if (outside(probeX, probeY)) high = mid;
          else low = mid;
        }
        addTerminal(
          previous,
          insideX + (px - insideX) * low,
          insideY + (py - insideY) * low,
          budgetEnd
        );
        return;
      }
      /* Wandering into the thinned side ends the filament early, so the copy
         gets real emptiness rather than fainter clutter. */
      if (rng() < thinning(px) * 0.4) {
        addTerminal(previous, px, py, budgetEnd);
        return;
      }
      /* Along the path the nodes are hair-fine; the last one of a run is a
         little junction bead. Both shrink towards the centre. */
      const isJoint = s === segments - 1;
      const inner = 0.5 + 0.5 * radial(px, py);
      const node = addNode(
        px,
        py,
        (isJoint ? 0.9 + rng() * 0.7 : 0.4 + rng() * 0.45) * inner
      );
      addEdge(previous, node, false);
      previous = node;
    }

    if (depth >= MAX_DEPTH || count >= budgetEnd || count >= cap) {
      makeSoma(previous);
      return;
    }

    /* Branching thins out over the copy side, and deeper twigs fork less. */
    const forkChance = 0.82 - thinning(px) * 0.55 - depth * 0.07;
    const children = rng() < forkChance ? 2 : 1;
    const spread = 0.3 + rng() * 0.32;
    for (let c = 0; c < children && count < budgetEnd; c++) {
      const turn = children === 1 ? (rng() - 0.5) * 0.55 : c === 0 ? -spread : spread;
      grow(
        previous,
        px,
        py,
        angle + turn,
        curve * (0.55 + rng() * 0.8) + (rng() - 0.5) * 0.02,
        depth + 1,
        budgetEnd
      );
    }
  }

  /* ---- Core: a small mesh of somas per hub -------------------------------
     Trunks grow out of these, not out of a single point — a lone convergence
     point reads as a starburst, while a spread core reads as a nucleus. */
  const coreRadius = unit * 0.17;
  /* Grouped per hub, so the trunk loop can serve the hubs in turn: a flat list
     would spend the whole node budget on the first hub. */
  const nuclei = hubs.map((hub) => {
    const somas = [];
    const total = 7 + Math.floor(rng() * 6);
    for (let i = 0; i < total; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = coreRadius * Math.sqrt(rng());
      const node = addNode(
        hub.x + Math.cos(angle) * distance,
        hub.y + Math.sin(angle) * distance,
        1.1 + rng() * 1.5
      );
      somas.push({ node, x: x[node], y: y[node], hub });
    }
    /* Web the nucleus together so charge can cross it. */
    for (let i = 1; i < somas.length; i++) {
      addEdge(somas[i].node, somas[i - 1].node, false);
      if (rng() < 0.45) {
        addEdge(somas[i].node, somas[Math.floor(rng() * i)].node, false);
      }
    }
    return somas;
  });

  let trunk = 0;
  /* One recursive tree used to consume the entire global budget. A bounded
     slice per trunk makes the outer loop a real round robin across hubs. */
  const trunkBudget = Math.max(
    8,
    Math.min(32, Math.floor(target / Math.max(1, nuclei.length * 3)))
  );
  while (count < target && trunk < 260) {
    const nucleus = nuclei[trunk % nuclei.length];
    const round = Math.floor(trunk / nuclei.length);
    const root = nucleus[round % nucleus.length];
    const angle = trunk * 2.39996 + rng() * 0.4;

    /* Skip trunks aimed into the thinned side instead of shortening them: a
       gap between filaments reads calmer than a row of stubs. */
    const heading = root.x + Math.cos(angle) * rx * 0.55;
    if (rng() < thinning(heading)) {
      trunk++;
      continue;
    }

    /* Head outward from the nucleus rather than straight along the raw angle,
       so filaments fan out instead of crossing back through the core. */
    const outward = Math.atan2(root.y - root.hub.y, root.x - root.hub.x);
    const bias = Number.isFinite(outward) ? outward : angle;
    const heading2 = angle + (((bias - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.45;
    grow(
      root.node,
      root.x,
      root.y,
      heading2,
      (rng() - 0.5) * 0.24,
      0,
      Math.min(target, count + trunkBudget)
    );
    trunk++;
  }

  /* ---- Rim: the boundary drawn by the network itself --------------------
     Dense on purpose — the edge is where the reference figure is busiest. The
     fringe grows inward, so the outer silhouette stays exactly on the radius
     and the clearances the caller measured still hold. */
  if (o.rim) {
    const ring = Math.min(rx, ry);
    const steps = Math.max(48, Math.round((Math.PI * 2 * ring) / (unit * 0.032)));
    let previous = -1;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const band = 1 - rng() * 0.05;
      const px = cx + Math.cos(angle) * ring * band;
      const py = cy + Math.sin(angle) * ring * band;
      /* Breaks in the ring keep it from reading as a drawn circle. */
      if (rng() < 0.07 + thinning(px)) {
        previous = -1;
        continue;
      }
      const node = addNode(px, py, 0.4 + rng() * 0.85);
      addEdge(previous, node, false);
      previous = node;

      if (rng() > 0.55) continue;
      let hairX = px;
      let hairY = py;
      let last = node;
      const hairs = 1 + Math.floor(rng() * 2);
      for (let h = 0; h < hairs; h++) {
        const inward = angle + Math.PI + (rng() - 0.5) * 0.7;
        const length = unit * (0.022 + rng() * 0.03);
        hairX += Math.cos(inward) * length;
        hairY += Math.sin(inward) * length;
        const tip = addNode(
          hairX,
          hairY,
          h === hairs - 1 ? 0.65 + rng() * 1.2 : 0.35 + rng() * 0.3
        );
        addEdge(last, tip, false);
        last = tip;
      }
    }
  }

  return {
    count,
    x: x.subarray(0, count),
    y: y.subarray(0, count),
    r: r.subarray(0, count),
    edgeCount: ea.length,
    ea: Int32Array.from(ea),
    eb: Int32Array.from(eb),
    elong: Uint8Array.from(elong),
    cx,
    rx
  };
}

/** Colour ramp position for a node, given the field's horizontal extent. */
export function rampAt(field, px) {
  return clamp01((px - (field.cx - field.rx)) / (2 * field.rx));
}
