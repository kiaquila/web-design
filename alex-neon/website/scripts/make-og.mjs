#!/usr/bin/env node
/* Renders assets/og.png — the 1200×630 social card for the Alex Neon landing.
   The card carries the same neural crown as the hero plus the "A" monogram;
   the wording comes from og:title / og:description, so no text is rasterised
   here and no font is needed. Pure Node: a float framebuffer is supersampled
   and written as a PNG by hand, so the asset is reproducible in CI.

   Run from the project: npm run og */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const OUT = resolve(import.meta.dirname, "..", "assets", "og.png");
const W = 1200;
const H = 630;
const SS = 2; /* supersampling factor: rendered at 2×, box-filtered down */

const BG = [5 / 255, 6 / 255, 10 / 255];
const TEAL = [46 / 255, 230 / 255, 214 / 255];
const VIOLET = [139 / 255, 92 / 255, 246 / 255];

/* The card carries no text, so the crown is centred rather than offset the
   way the hero places it beside the headline. */
const CX = W * 0.5;
const CY = H * 0.5;
const R = 250;

const w = W * SS;
const h = H * SS;
const buf = new Float32Array(w * h * 3);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Deterministic PRNG, same generator family as the hero script. */
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function fill(colorAt) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = colorAt(x / SS, y / SS);
      const i = (y * w + x) * 3;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
}

/** Additive plot with bilinear coverage, in supersampled space. */
function plot(x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const weights = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x0 + 1, y0, fx * (1 - fy)],
    [x0, y0 + 1, (1 - fx) * fy],
    [x0 + 1, y0 + 1, fx * fy]
  ];
  for (const [px, py, wt] of weights) {
    const i = (py * w + px) * 3;
    const a = alpha * wt;
    buf[i] += (color[0] - buf[i]) * a;
    buf[i + 1] += (color[1] - buf[i + 1]) * a;
    buf[i + 2] += (color[2] - buf[i + 2]) * a;
  }
}

function line(x1, y1, x2, y2, color, alpha) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) * SS));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    plot((x1 + dx * t) * SS, (y1 + dy * t) * SS, color, alpha);
  }
}

function disc(cx, cy, radius, color, alpha) {
  const rs = radius * SS;
  const x0 = Math.floor((cx - radius) * SS);
  const x1 = Math.ceil((cx + radius) * SS);
  const y0 = Math.floor((cy - radius) * SS);
  const y1 = Math.ceil((cy + radius) * SS);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx * SS, y - cy * SS);
      /* One-pixel soft edge keeps the dots from looking stair-stepped. */
      const cover = clamp01(rs - d + 0.5);
      if (cover > 0) plot(x, y, color, alpha * cover);
    }
  }
}

/** Teal → violet across the figure, matching the hero's horizontal ramp. */
function hue(x) {
  let t = clamp01((x - (CX - R)) / (2 * R));
  t = t * t * (3 - 2 * t);
  return [lerp(TEAL[0], VIOLET[0], t), lerp(TEAL[1], VIOLET[1], t), lerp(TEAL[2], VIOLET[2], t)];
}

/* ---- Background: near-black plus the two-tint corona ------------------- */
fill((x, y) => {
  const out = [...BG];
  const add = (px, py, radius, color, peak) => {
    const d = Math.hypot(x - px, y - py) / radius;
    if (d >= 1) return;
    const k = (1 - d) * (1 - d) * peak;
    for (let i = 0; i < 3; i++) out[i] += color[i] * k;
  };
  add(CX - 60, CY - 30, 500, TEAL, 0.14);
  add(CX + 140, CY + 80, 420, VIOLET, 0.16);
  return out;
});

/* ---- Dendrites -------------------------------------------------------- */
const rng = mulberry32(0x5eed);
const nodes = [];

function grow(x, y, angle, depth, inward) {
  const segLen = R * 0.05 * (0.8 + rng() * 0.5) * Math.pow(0.94, depth);
  for (let s = 0; s < 3; s++) {
    const radial = Math.atan2(y - CY, x - CX) + (inward ? Math.PI : 0);
    const delta = ((radial - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    angle += delta * 0.18 + (rng() - 0.5) * 0.55;
    const x2 = x + Math.cos(angle) * segLen;
    const y2 = y + Math.sin(angle) * segLen;
    line(x, y, x2, y2, hue((x + x2) / 2), 0.3);
    x = x2;
    y = y2;
  }
  const dist = Math.hypot(x - CX, y - CY);
  const done = inward
    ? depth >= 5 || dist < R * 0.14
    : depth >= 5 || dist > R * (1 + rng() * 0.08);
  if (done) {
    nodes.push([x, y, 0.65 + rng() * 0.85]);
    return;
  }
  const spread = Math.max(0.2, 0.5 - depth * 0.05);
  if (rng() < 0.15) {
    grow(x, y, angle + (rng() - 0.5) * 0.3, depth + 1, inward);
  } else {
    grow(x, y, angle - spread * (0.5 + rng() * 0.7), depth + 1, inward);
    grow(x, y, angle + spread * (0.5 + rng() * 0.7), depth + 1, inward);
  }
}

for (let trunk = 0; trunk < 280; trunk++) {
  const a = trunk * 2.39996 + rng() * 0.2;
  const rr = R * (0.22 + rng() * 0.14);
  const inward = rng() < 0.12;
  grow(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, inward ? a + Math.PI : a, inward ? 3 : 0, inward);
}

for (const [x, y, radius] of nodes) {
  const color = hue(x);
  disc(x, y, radius * 2.6, color, 0.055); /* soft halo, kept off saturation */
  disc(x, y, radius, color, 0.82);
}

/* ---- Monogram: bordered square with an "A", drawn as strokes ----------- */
const mx = 72;
const my = 64;
const ms = 46;
const stroke = (x1, y1, x2, y2, color, alpha, weight) => {
  const steps = Math.ceil(weight * SS * 2);
  const nx = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
  const ny = -(x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
  for (let s = 0; s <= steps; s++) {
    const off = (s / steps - 0.5) * weight;
    line(x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off, color, alpha);
  }
};
const border = [0.16, 0.18, 0.22];
stroke(mx, my, mx + ms, my, border, 0.9, 1.2);
stroke(mx, my + ms, mx + ms, my + ms, border, 0.9, 1.2);
stroke(mx, my, mx, my + ms, border, 0.9, 1.2);
stroke(mx + ms, my, mx + ms, my + ms, border, 0.9, 1.2);
const apex = [mx + ms / 2, my + 12];
stroke(apex[0], apex[1], mx + 12, my + ms - 11, TEAL, 0.95, 2.4);
stroke(apex[0], apex[1], mx + ms - 12, my + ms - 11, VIOLET, 0.95, 2.4);
stroke(mx + 15, my + ms - 20, mx + ms - 15, my + ms - 20, [0.55, 0.72, 0.95], 0.9, 2);

/* ---- Downsample and encode -------------------------------------------- */
const rows = [];
const gamma = (v) => Math.round(clamp01(v) * 255);
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(W * 3 + 1);
  row[0] = 0; /* PNG filter: none */
  for (let x = 0; x < W; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * w + (x * SS + sx)) * 3;
        r += buf[i];
        g += buf[i + 1];
        b += buf[i + 2];
      }
    }
    const n = SS * SS;
    row[1 + x * 3] = gamma(r / n);
    row[2 + x * 3] = gamma(g / n);
    row[3 + x * 3] = gamma(b / n);
  }
  rows.push(row);
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crcTable = (chunk.table ??= (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE((crc ^ -1) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; /* bit depth */
ihdr[9] = 2; /* truecolor */

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

writeFileSync(OUT, png);
console.log(
  `Wrote ${join("assets", "og.png")} — ${W}×${H}, ${nodes.length} nodes, ${(png.length / 1024).toFixed(0)} KB`
);
