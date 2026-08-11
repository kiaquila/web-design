#!/usr/bin/env node
/* Renders assets/og.png — the 1200×630 social card for the Alex Neon landing.

   The figure comes from the same generator the hero uses (src/js/field.js), so
   the card cannot drift away from the page. Wording is left to og:title and
   og:description, so nothing here needs a font: only the neural field and the
   "A" monogram, drawn as strokes.

   Pure Node — a float framebuffer, supersampled and encoded as a PNG by hand —
   so the asset is reproducible in CI.

   Run from the project: npm run og */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { ramp, rampAt, TEAL, VIOLET } from "../src/js/field.js";
import {
  CARD_FINGERPRINT_KEY,
  createSocialField,
  fingerprintSocialCard,
  SOCIAL_HEIGHT,
  SOCIAL_WIDTH
} from "./social-field.mjs";

const OUT = resolve(import.meta.dirname, "..", "assets", "og.png");
const W = SOCIAL_WIDTH;
const H = SOCIAL_HEIGHT;
const SS = 2; /* rendered at 2×, then box-filtered down */

const BG = [5 / 255, 6 / 255, 10 / 255];
const TEAL_UNIT = TEAL.map((v) => v / 255);
const VIOLET_UNIT = VIOLET.map((v) => v / 255);

const w = W * SS;
const h = H * SS;
const buf = new Float32Array(w * h * 3);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Additive plot with bilinear coverage, in supersampled space. */
function plot(x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  for (const [px, py, weight] of [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x0 + 1, y0, fx * (1 - fy)],
    [x0, y0 + 1, (1 - fx) * fy],
    [x0 + 1, y0 + 1, fx * fy]
  ]) {
    const i = (py * w + px) * 3;
    const a = alpha * weight;
    buf[i] += (color[0] - buf[i]) * a;
    buf[i + 1] += (color[1] - buf[i + 1]) * a;
    buf[i + 2] += (color[2] - buf[i + 2]) * a;
  }
}

function line(x1, y1, x2, y2, color, alpha) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * SS));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    plot((x1 + (x2 - x1) * t) * SS, (y1 + (y2 - y1) * t) * SS, color, alpha);
  }
}

function disc(cx, cy, radius, color, alpha) {
  const rs = radius * SS;
  for (let y = Math.floor((cy - radius) * SS); y <= Math.ceil((cy + radius) * SS); y++) {
    for (let x = Math.floor((cx - radius) * SS); x <= Math.ceil((cx + radius) * SS); x++) {
      /* One-pixel soft edge keeps the dots from looking stair-stepped. */
      const cover = clamp01(rs - Math.hypot(x - cx * SS, y - cy * SS) + 0.5);
      if (cover > 0) plot(x, y, color, alpha * cover);
    }
  }
}

/* ---- Background: near-black plus the two-tint corona ------------------- */
const CX = W * 0.5;
const CY = H * 0.5;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const px = x / SS;
    const py = y / SS;
    const out = [...BG];
    const add = (gx, gy, radius, color, peak) => {
      const d = Math.hypot(px - gx, py - gy) / radius;
      if (d >= 1) return;
      const k = (1 - d) * (1 - d) * peak;
      for (let i = 0; i < 3; i++) out[i] += color[i] * k;
    };
    add(CX - 120, CY - 40, 520, TEAL_UNIT, 0.13);
    add(CX + 180, CY + 90, 460, VIOLET_UNIT, 0.15);
    const i = (y * w + x) * 3;
    buf[i] = out[0];
    buf[i + 1] = out[1];
    buf[i + 2] = out[2];
  }
}

/* ---- The field, from the generator the page uses ---------------------- */
const field = createSocialField();
const cardFingerprint = fingerprintSocialCard(field);

const colorOf = (px) => ramp(rampAt(field, px)).map((v) => v / 255);

for (let e = 0; e < field.edgeCount; e++) {
  const i = field.ea[e];
  const j = field.eb[e];
  line(
    field.x[i],
    field.y[i],
    field.x[j],
    field.y[j],
    colorOf((field.x[i] + field.x[j]) / 2),
    field.elong[e] ? 0.16 : 0.26
  );
}

for (let i = 0; i < field.count; i++) {
  const color = colorOf(field.x[i]);
  disc(field.x[i], field.y[i], field.r[i] * 3, color, 0.05); /* soft halo */
  disc(field.x[i], field.y[i], field.r[i] * 1.35, color, 0.85);
}

/* ---- Monogram: bordered square with an "A", drawn as strokes ----------- */
const mx = 72;
const my = 64;
const ms = 46;
const stroke = (x1, y1, x2, y2, color, alpha, weight) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const nx = (y2 - y1) / length;
  const ny = -(x2 - x1) / length;
  const steps = Math.ceil(weight * SS * 2);
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
const apexX = mx + ms / 2;
const apexY = my + 12;
stroke(apexX, apexY, mx + 12, my + ms - 11, TEAL_UNIT, 0.95, 2.4);
stroke(apexX, apexY, mx + ms - 12, my + ms - 11, VIOLET_UNIT, 0.95, 2.4);
stroke(mx + 15, my + ms - 20, mx + ms - 15, my + ms - 20, [0.55, 0.72, 0.95], 0.9, 2);

/* ---- Downsample and encode -------------------------------------------- */
const rows = [];
const byte = (v) => Math.round(clamp01(v) * 255);
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
    row[1 + x * 3] = byte(r / n);
    row[2 + x * 3] = byte(g / n);
    row[3 + x * 3] = byte(b / n);
  }
  rows.push(row);
}

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  let crc = -1;
  for (const value of body) crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ -1) >>> 0);
  return Buffer.concat([length, body, checksum]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; /* bit depth */
ihdr[9] = 2; /* truecolor */

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk(
    "tEXt",
    Buffer.from(`${CARD_FINGERPRINT_KEY}\0${cardFingerprint}`, "latin1")
  ),
  chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

writeFileSync(OUT, png);
console.log(
  `Wrote ${join("assets", "og.png")} — ${W}×${H}, ${field.count} nodes, ${(png.length / 1024).toFixed(0)} KB, card ${cardFingerprint.slice(0, 12)}`
);
