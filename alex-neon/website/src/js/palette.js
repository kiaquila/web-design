/* Alex Neon — the neural field's palette, precomputed once.

   Every neuron sits somewhere on the accent ramp (teal → violet) according to
   its x position, quantised into BUCKETS steps. Quantising is what makes the
   field cheap to draw: instead of a fill style per node, the renderer walks the
   buckets and issues one path per bucket. So each bucket needs its colours and
   its glow sprite ready before the first frame — that is all this module is.

   Nothing here touches a field or a canvas element from the page; it is a table
   built at import time and then only read. */

import { ramp } from "./field.js";

export const BUCKETS = 14;

/** Pre-rendered radial glow sprites, one per colour bucket. */
function makeSprites() {
  const sprites = [];
  for (let b = 0; b < BUCKETS; b++) {
    const [r, g, bl] = ramp(b / (BUCKETS - 1));
    const size = 64;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const sc = sprite.getContext("2d");
    const grad = sc.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.5)");
    grad.addColorStop(0.3, `rgba(${r},${g},${bl},0.3)`);
    grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
    sc.fillStyle = grad;
    sc.fillRect(0, 0, size, size);
    sprites.push(sprite);
  }
  return sprites;
}

export const SPRITES = makeSprites();
export const CORE_COLORS = [];
export const NODE_COLORS = [];
export const EDGE_COLORS = [];
export const LINK_COLORS = [];

for (let b = 0; b < BUCKETS; b++) {
  const [r, g, bl] = ramp(b / (BUCKETS - 1));
  /* The filaments carry the structure now, so they are drawn a touch stronger
     than the beads sitting on them. */
  NODE_COLORS.push(`rgba(${r},${g},${bl},0.8)`);
  EDGE_COLORS.push(`rgba(${r},${g},${bl},0.3)`);
  LINK_COLORS.push(`rgba(${r},${g},${bl},0.14)`);
  CORE_COLORS.push(
    `rgb(${Math.round(r + (255 - r) * 0.5)},${Math.round(g + (255 - g) * 0.5)},${Math.round(bl + (255 - bl) * 0.5)})`
  );
}
