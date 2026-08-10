/* Alex Neon — shared neural-field generator.

   Pure data: no DOM, no canvas, no colours applied. The page renderer
   (neural.mjs) and the social-card renderer (scripts/make-og.mjs) both build
   their figure from here, so the card shows the same field as the hero.

   The field is deliberately unwound rather than a dense ball: nodes gather in
   loose clusters spread across an ellipse, everything else is connections. */

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
 * @param {number} [o.scale]   unit scale (device pixel ratio) for radii/links
 * @param {number} [o.leftBias] 0–1: how much sparser the left edge gets, so
 *                              copy sitting on that side stays readable
 * @param {{x:number,y:number}[]} [o.anchors] explicit cluster centres
 * @returns {{count:number,x:Float32Array,y:Float32Array,r:Float32Array,
 *            core:Float32Array,edgeCount:number,ea:Int32Array,eb:Int32Array,
 *            elong:Uint8Array,rx:number,cx:number}}
 */
export function generateField(o) {
  const { cx, cy, rx, ry, nodes: target, seed = 0x5eed, scale = 1 } = o;
  const leftBias = o.leftBias ?? 0;
  const rng = mulberry32(seed);
  /* Geometric mean, not min(): a wide shallow band would otherwise get tiny
     clusters and hair-thin links driven by its short side. */
  const unit = Math.sqrt(rx * ry);

  /* ---- Cluster centres -------------------------------------------------
     Callers may anchor the clusters (the process steps each get their own
     knot, so hovering a step always has neurons to light). Otherwise a
     golden-angle spiral covers the area evenly. Few, well-separated clusters:
     many small ones average out into an even scatter, which reads as a
     particle background rather than as neurons gathering in places. */
  const clusters = [];
  const anchors = o.anchors ?? [];
  if (anchors.length) {
    for (const anchor of anchors) {
      clusters.push({
        x: anchor.x,
        y: anchor.y,
        radius: unit * (0.1 + rng() * 0.05),
        weight: 0.8 + rng() * 0.5,
        first: 0,
        last: 0
      });
    }
  } else {
    const clusterCount = Math.max(4, Math.min(18, Math.round(target / 90)));
    for (let i = 0; i < clusterCount; i++) {
      const angle = i * 2.39996 + rng() * 0.7;
      /* sqrt keeps the spiral area-uniform instead of centre-heavy */
      const spread = Math.sqrt((i + 0.55) / clusterCount);
      clusters.push({
        x: cx + Math.cos(angle) * spread * rx * 0.9,
        y: cy + Math.sin(angle) * spread * ry * 0.9,
        radius: unit * (0.07 + rng() * 0.07),
        weight: 0.55 + rng() * 0.9,
        first: 0,
        last: 0
      });
    }
  }

  const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
  const cap = Math.round(target * 1.25);
  const x = new Float32Array(cap);
  const y = new Float32Array(cap);
  const r = new Float32Array(cap);
  const core = new Float32Array(cap); /* 1 at a cluster centre, 0 out in the field */
  let count = 0;

  /* Sparser on one side so the headline never sits on a dense patch. */
  const keep = (px) => {
    if (!leftBias) return true;
    const t = clamp01((px - (cx - rx)) / (2 * rx));
    return rng() < 1 - leftBias * (1 - smoothstep(t));
  };

  const push = (px, py, coreness) => {
    if (count >= cap) return;
    if (!keep(px)) return;
    x[count] = px;
    y[count] = py;
    /* Cluster centres carry the larger somas; field nodes stay fine. */
    r[count] = (0.9 + coreness * 1.5 + rng() * 0.6) * scale;
    core[count] = coreness;
    count++;
  };

  /* ---- Cluster nodes: most of the field -------------------------------- */
  for (const cluster of clusters) {
    cluster.first = count;
    const n = Math.max(6, Math.round((target * 0.78 * cluster.weight) / totalWeight));
    for (let i = 0; i < n; i++) {
      /* pow > 0.5 pulls samples outward, so clusters read as loose knots */
      const t = Math.pow(rng(), 0.62);
      const angle = rng() * Math.PI * 2;
      const rr = t * cluster.radius;
      push(
        cluster.x + Math.cos(angle) * rr * (0.85 + rng() * 0.5),
        cluster.y + Math.sin(angle) * rr * (0.85 + rng() * 0.5),
        1 - t
      );
    }
    cluster.last = count;
  }

  /* ---- Field nodes: the sparse remainder, so clusters are not islands --- */
  const fieldNodes = Math.round(target * 0.22);
  for (let i = 0; i < fieldNodes; i++) {
    const angle = rng() * Math.PI * 2;
    const spread = Math.sqrt(rng());
    push(
      cx + Math.cos(angle) * spread * rx,
      cy + Math.sin(angle) * spread * ry,
      rng() * 0.25
    );
  }

  /* ---- Edges: short local links via a uniform grid --------------------- */
  const link = unit * 0.19;
  const cell = link;
  const cols = Math.max(1, Math.ceil((rx * 2 + link * 2) / cell));
  const rows = Math.max(1, Math.ceil((ry * 2 + link * 2) / cell));
  const originX = cx - rx - link;
  const originY = cy - ry - link;
  const buckets = new Map();
  const keyOf = (px, py) => {
    const col = Math.max(0, Math.min(cols - 1, Math.floor((px - originX) / cell)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((py - originY) / cell)));
    return row * cols + col;
  };
  for (let i = 0; i < count; i++) {
    const key = keyOf(x[i], y[i]);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }

  const ea = [];
  const eb = [];
  const elong = [];
  const seen = new Set();
  const addEdge = (i, j, isLong) => {
    if (i === j) return;
    const key = i < j ? i * cap + j : j * cap + i;
    if (seen.has(key)) return;
    seen.add(key);
    ea.push(i);
    eb.push(j);
    elong.push(isLong ? 1 : 0);
  };

  const near = [];
  for (let i = 0; i < count; i++) {
    near.length = 0;
    const col = Math.floor((x[i] - originX) / cell);
    const row = Math.floor((y[i] - originY) / cell);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const bucket = buckets.get((row + dr) * cols + (col + dc));
        if (!bucket) continue;
        for (const j of bucket) {
          if (j === i) continue;
          const d = Math.hypot(x[j] - x[i], y[j] - y[i]);
          if (d < link) near.push([d, j]);
        }
      }
    }
    near.sort((a, b) => a[0] - b[0]);
    /* Two links per node keeps the web airy; three would knit it solid. */
    const links = near.length > 5 ? 2 : 3;
    for (let k = 0; k < Math.min(links, near.length); k++) addEdge(i, near[k][1], false);
  }

  /* ---- Long links: cluster to cluster, the visible "connections" -------- */
  for (let a = 0; a < clusters.length; a++) {
    const ordered = clusters
      .map((c, index) => ({ index, d: Math.hypot(c.x - clusters[a].x, c.y - clusters[a].y) }))
      .filter((c) => c.index !== a)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const { index: b } of ordered) {
      let best = null;
      for (let i = clusters[a].first; i < clusters[a].last; i += 2) {
        for (let j = clusters[b].first; j < clusters[b].last; j += 2) {
          if (i >= count || j >= count) continue;
          const d = Math.hypot(x[j] - x[i], y[j] - y[i]);
          if (!best || d < best[0]) best = [d, i, j];
        }
      }
      if (best) addEdge(best[1], best[2], true);
    }
  }

  return {
    count,
    x: x.subarray(0, count),
    y: y.subarray(0, count),
    r: r.subarray(0, count),
    core: core.subarray(0, count),
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
