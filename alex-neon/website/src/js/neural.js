/* Alex Neon — interactive neural fields.

   A field is a static figure: loose clusters of neurons spread across an
   ellipse, joined by connections. Nothing rotates and nothing drifts. Every
   neuron can light up: energy is injected around the pointer and then travels
   along the connections, fading out over roughly a second. The unlit figure is
   rasterised once into an offscreen canvas; the loop runs only while energy is
   left, and each gate that stops it is documented where it sits.

   Where the figure goes is placement.js's question, not this file's. */

import { generateField, ramp, rampAt } from "./field.js";
import { measureShape } from "./placement.js";
import {
  BUCKETS,
  CORE_COLORS,
  EDGE_COLORS,
  LINK_COLORS,
  NODE_COLORS,
  SPRITES
} from "./palette.js";

const TAU = Math.PI * 2;
const DECAY = 0.925; /* per 60fps frame → a lit node fades in ~0.8s */
const TRANSFER = 0.6; /* share handed to a connected neighbour each frame */
const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
/* No hover means no pointer to light the field with — see the ambient pulses. */
const coarseQuery = window.matchMedia("(hover: none)");

/** Builds a field on `canvas`. Each option is explained where it is read; the
    two call sites at the bottom of this file carry the full sets. */
function createNeuralField(canvas, options) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const host = options.host ?? canvas.parentElement;
  const pointerRadius = options.pointerRadius ?? 150;
  let reduced = reduceQuery.matches;

  let field = null;
  let shape = null; /* last measured geometry, in device pixels */
  let energy = null;
  let next = null;
  let bucket = null; /* colour bucket per node */
  let adjacencyStart = null; /* CSR offsets into adjacency */
  let adjacency = null;
  let base = null;
  let dpr = 1;
  let W = 0;
  let H = 0;

  const clearFieldState = () => {
    field = null;
    shape = null;
    energy = null;
    next = null;
    bucket = null;
    adjacencyStart = null;
    adjacency = null;
    base = null;
  };

  function build() {
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight) {
      canvas.width = 0;
      canvas.height = 0;
      clearFieldState();
      return false;
    }

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(cssWidth * dpr);
    H = Math.round(cssHeight * dpr);
    canvas.width = W;
    canvas.height = H;

    shape = measureShape({ canvas, options, cssWidth, cssHeight, dpr, W, H });
    /* Too little room for a figure at all — draw nothing rather than a speck.
       A later resize rebuilds, since the observers are already attached. */
    if (shape.rx < 8 * dpr || shape.ry < 8 * dpr) {
      clearFieldState();
      return false;
    }

    /* Stacked, the budget follows the disc, not the canvas: on a short phone
       the clearance shrinks the dome to a fraction of the band, and a canvas-
       sized crowd packed into that arc is both opaque and paid for. The rate is
       per megapixel of disc and carries the doubling for the hidden half. */
    const nodes = shape.stacked
      ? Math.round((Math.PI * (shape.rx / dpr) ** 2 * (options.densityStacked ?? 0)) / 1e6)
      : Math.round(((cssWidth * cssHeight) / 1e6) * (options.densityPerMegapixel ?? 1500));

    field = generateField({
      cx: shape.cx,
      cy: shape.cy,
      rx: shape.rx,
      ry: shape.ry,
      rim: options.rim === true,
      /* The floor keeps a small figure from degenerating into a speck, but a
         shrunken dome is meant to be sparse — holding it to 120 would undo the
         scaling above on exactly the screens that need it. */
      nodes: Math.max(shape.stacked ? 48 : 120, Math.min(2200, nodes)),
      seed: options.seed ?? 0x5eed,
      scale: dpr,
      leftBias: options.leftBias ?? 0,
      anchors: options.anchors?.(canvas, dpr) ?? []
    });

    energy = new Float32Array(field.count);
    next = new Float32Array(field.count);
    bucket = new Uint8Array(field.count);
    for (let i = 0; i < field.count; i++) {
      bucket[i] = Math.round(rampAt(field, field.x[i]) * (BUCKETS - 1));
    }

    /* CSR adjacency, so energy can walk the connections cheaply. */
    const degree = new Int32Array(field.count + 1);
    for (let e = 0; e < field.edgeCount; e++) {
      degree[field.ea[e]]++;
      degree[field.eb[e]]++;
    }
    adjacencyStart = new Int32Array(field.count + 1);
    for (let i = 0; i < field.count; i++) adjacencyStart[i + 1] = adjacencyStart[i] + degree[i];
    adjacency = new Int32Array(adjacencyStart[field.count]);
    const cursor = adjacencyStart.slice(0, field.count);
    for (let e = 0; e < field.edgeCount; e++) {
      adjacency[cursor[field.ea[e]]++] = field.eb[e];
      adjacency[cursor[field.eb[e]]++] = field.ea[e];
    }

    drawBase();
    return true;
  }

  function drawBase() {
    base = document.createElement("canvas");
    base.width = W;
    base.height = H;
    const bc = base.getContext("2d");
    bc.lineCap = "round";
    /* The process field sits directly behind body copy, so its unlit state is
       quieter than the hero's. */
    bc.globalAlpha = options.baseOpacity ?? 1;

    /* Connections first, so the somas sit on top of their own web. */
    for (let pass = 0; pass < 2; pass++) {
      bc.lineWidth = Math.max(0.6, (pass ? 0.5 : 0.65) * dpr);
      for (let b = 0; b < BUCKETS; b++) {
        bc.strokeStyle = pass ? LINK_COLORS[b] : EDGE_COLORS[b];
        bc.beginPath();
        let drew = false;
        for (let e = 0; e < field.edgeCount; e++) {
          if (!!field.elong[e] !== !!pass) continue;
          const i = field.ea[e];
          if (bucket[i] !== b) continue;
          bc.moveTo(field.x[i], field.y[i]);
          bc.lineTo(field.x[field.eb[e]], field.y[field.eb[e]]);
          drew = true;
        }
        if (drew) bc.stroke();
      }
    }

    for (let b = 0; b < BUCKETS; b++) {
      bc.fillStyle = NODE_COLORS[b];
      bc.beginPath();
      let drew = false;
      for (let i = 0; i < field.count; i++) {
        if (bucket[i] !== b) continue;
        bc.moveTo(field.x[i] + field.r[i], field.y[i]);
        bc.arc(field.x[i], field.y[i], field.r[i], 0, TAU);
        drew = true;
      }
      if (drew) bc.fill();
    }
  }

  function renderStatic() {
    if (!base) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = "lighter";

    /* Lit connections: a link glows when the charge is crossing it. */
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.7, 0.75 * dpr);
    for (let e = 0; e < field.edgeCount; e++) {
      const i = field.ea[e];
      const j = field.eb[e];
      const level = Math.min(energy[i], energy[j]);
      if (level < 0.06) continue;
      const [r, g, b] = ramp(rampAt(field, (field.x[i] + field.x[j]) / 2));
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.5, level * 0.55)})`;
      ctx.beginPath();
      ctx.moveTo(field.x[i], field.y[i]);
      ctx.lineTo(field.x[j], field.y[j]);
      ctx.stroke();
    }

    /* On touch the figure is small and lit by single seeds rather than by a
       parked cursor, so the same energy reads dimmer. A mouse gets no scaling. */
    const lit = coarseQuery.matches ? options.touchGlow ?? 1 : 1;

    for (let i = 0; i < field.count; i++) {
      const e = energy[i];
      if (e < 0.02) continue;
      const b = bucket[i];
      /* The field is sparse, so a lit neuron has to carry more glow than it
         would inside a dense mass to read as "switched on". */
      const size = field.r[i] * (5 + 4 * e) * lit;
      ctx.globalAlpha = Math.min(1, e * lit) * 0.6;
      ctx.drawImage(SPRITES[b], field.x[i] - size / 2, field.y[i] - size / 2, size, size);
      ctx.globalAlpha = Math.min(1, 0.35 + 0.65 * e);
      ctx.fillStyle = CORE_COLORS[b];
      ctx.beginPath();
      ctx.arc(field.x[i], field.y[i], field.r[i] * (1 + 0.85 * e), 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- Energy ---------------------------------------------------------- */
  const pointer = { x: 0, y: 0, active: false };
  let raf = 0;
  let lastFrame = 0;
  let onScreen = true;

  const asleep = () => !onScreen || document.hidden;

  const isOnScreen = () => {
    const box = canvas.getBoundingClientRect();
    return box.top < window.innerHeight && box.bottom > 0;
  };

  /* A pointer event proves the field is on screen, so it clears a stale
     "off-screen" state: observer notifications can be withheld while the
     document is hidden, and the field must not stay frozen afterwards. */
  const wake = () => {
    onScreen = true;
    start();
  };

  function injectAt(px, py, radius, strength) {
    if (!field) return;
    const r2 = radius * radius;
    for (let i = 0; i < field.count; i++) {
      const dx = field.x[i] - px;
      const dy = field.y[i] - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const falloff = 1 - Math.sqrt(d2) / radius;
      const value = strength * falloff * falloff;
      if (value > energy[i]) energy[i] = value;
    }
  }

  /** Lights a rectangle of the field — used when a step is hovered. */
  function injectRect(rect, strength = 0.9) {
    if (!field || reduced) return;
    const box = canvas.getBoundingClientRect();
    const x0 = (rect.left - box.left) * dpr;
    const y0 = (rect.top - box.top) * dpr;
    const x1 = (rect.right - box.left) * dpr;
    const y1 = (rect.bottom - box.top) * dpr;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const halfW = Math.max(1, (x1 - x0) / 2);
    const halfH = Math.max(1, (y1 - y0) / 2);
    for (let i = 0; i < field.count; i++) {
      const dx = Math.abs(field.x[i] - cx) / halfW;
      const dy = Math.abs(field.y[i] - cy) / halfH;
      const d = Math.max(dx, dy);
      if (d > 1.15) continue;
      const value = strength * (1 - Math.min(1, d) * 0.55);
      if (value > energy[i]) energy[i] = value;
    }
    wake();
  }

  function frame(time) {
    raf = 0;
    const step = Math.min(48, time - lastFrame || 16.7);
    lastFrame = time;

    if (pointer.active) injectAt(pointer.x, pointer.y, pointerRadius * dpr, 0.85);
    if (scrollPending) seedFromScroll();

    /* Spread along the connections, then decay. Transfer < 1 keeps it stable. */
    const decay = Math.pow(DECAY, step / 16.7);
    let peak = 0;
    for (let i = 0; i < field.count; i++) {
      let value = energy[i] * decay;
      const end = adjacencyStart[i + 1];
      for (let a = adjacencyStart[i]; a < end; a++) {
        const carried = energy[adjacency[a]] * TRANSFER * decay;
        if (carried > value) value = carried;
      }
      next[i] = value;
      if (value > peak) peak = value;
    }
    energy.set(next);

    render();
    if ((peak > 0.015 || pointer.active) && !asleep()) raf = requestAnimationFrame(frame);
  }

  /* ---- Scroll ---------------------------------------------------------- */

  /* Scrolling is the one gesture every phone visitor makes, so the dome answers
     it: how far the hero has travelled decides how far round the rim the charge
     goes in, sweeping the light across the arc. The listener only raises a
     flag, so a fast flick costs one seed per frame, not one per event. */
  const scrollDriven = options.scrollDriven === true;
  let scrollPending = false;

  function seedFromScroll() {
    scrollPending = false;
    if (!field || !shape || reduced) return;
    const box = canvas.getBoundingClientRect();
    /* 0 while the hero is parked, 1 by the time it has scrolled fully out. */
    const travelled = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
    /* π → 0 walks the top of the circle from its left edge to its right one. */
    const angle = Math.PI * (1 - travelled);
    injectAt(
      shape.cx + Math.cos(angle) * shape.rx,
      shape.cy - Math.sin(angle) * shape.ry,
      pointerRadius * 0.8 * dpr,
      0.95
    );
  }

  if (scrollDriven) {
    window.addEventListener(
      "scroll",
      () => {
        if (reduced || !coarseQuery.matches || asleep()) return;
        scrollPending = true;
        start();
      },
      { passive: true }
    );
  }

  /* ---- Ambient pulses -------------------------------------------------- */

  /* A touch screen has no hover, so on a phone the field would only ever move
     under a deliberate tap — which nobody thinks to try. Every few seconds one
     neuron is seeded instead, and the charge walks the connections the way a
     pointer's does; the figure still never moves. The loop idles between
     pulses, so this costs about a quarter of a frame budget, not a whole one. */
  const ambientEvery = options.ambientEvery ?? 0;
  let ambientTimer = 0;

  const ambientDue = () =>
    ambientEvery > 0 && coarseQuery.matches && !reduced && !asleep() && !!field;

  /** A neuron inside the canvas box: most of the figure can sit below the fold. */
  function visibleNode() {
    for (let tries = 0; tries < 24; tries++) {
      const i = (Math.random() * field.count) | 0;
      if (field.x[i] >= 0 && field.x[i] <= W && field.y[i] >= 0 && field.y[i] <= H) return i;
    }
    return -1;
  }

  function pulse() {
    ambientTimer = 0;
    if (ambientDue()) {
      const i = visibleNode();
      if (i >= 0) {
        injectAt(field.x[i], field.y[i], pointerRadius * 0.9 * dpr, 1);
        start();
      }
    }
    scheduleAmbient();
  }

  function scheduleAmbient() {
    if (ambientTimer || !ambientDue()) return;
    /* Jittered, or repeated pulses read as a metronome. */
    ambientTimer = setTimeout(pulse, ambientEvery * (0.75 + Math.random() * 0.5));
  }

  function stopAmbient() {
    clearTimeout(ambientTimer);
    ambientTimer = 0;
  }

  function start() {
    scheduleAmbient();
    if (raf || reduced || asleep() || !field) return;
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    stopAmbient();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---- Input ----------------------------------------------------------- */
  const trackPointer = (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - box.left) * dpr;
    pointer.y = (event.clientY - box.top) * dpr;
    pointer.active = true;
  };

  host.addEventListener("pointermove", (event) => {
    if (reduced) return;
    trackPointer(event);
    wake();
  });
  host.addEventListener("pointerdown", (event) => {
    if (reduced) return;
    trackPointer(event);
    /* A tap is the only activation gesture on touch, so it lands wider. */
    injectAt(pointer.x, pointer.y, pointerRadius * 1.4 * dpr, 1);
    wake();
  });
  host.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  host.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse") pointer.active = false;
  });
  host.addEventListener("pointercancel", () => {
    pointer.active = false;
  });

  new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (asleep()) stop();
      else start();
    },
    { threshold: 0.02 }
  ).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) onScreen = isOnScreen();
    if (asleep()) stop();
    else start();
  });

  /* The clearance is measured against this element, so its height is geometry
     too. Fonts swap in after first paint: the copy rewraps and grows, and a
     dome measured a moment earlier would now reach into the text. */
  const keepOutNode = () =>
    (options.keepBelowStacked && document.querySelector(options.keepBelowStacked)) ||
    (options.keepBelow && document.querySelector(options.keepBelow)) ||
    null;
  const keepOutHeight = () => keepOutNode()?.getBoundingClientRect().height ?? 0;

  let resizeTimer = 0;
  let lastWidth = canvas.clientWidth;
  let lastHeight = canvas.clientHeight;
  let lastKeepOut = keepOutHeight();
  const resizes = new ResizeObserver(() => {
    if (
      Math.abs(canvas.clientWidth - lastWidth) < 2 &&
      Math.abs(canvas.clientHeight - lastHeight) < 2 &&
      Math.abs(keepOutHeight() - lastKeepOut) < 2
    ) {
      return;
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lastWidth = canvas.clientWidth;
      lastHeight = canvas.clientHeight;
      lastKeepOut = keepOutHeight();
      stop();
      if (build()) {
        renderStatic();
        /* stop() cancelled the pending pulse and a rebuilt field has no energy
           to keep the loop alive, so the beat would die at the first resize —
           on a phone, every time the URL bar slides away. */
        scheduleAmbient();
      }
    }, 200);
  });
  resizes.observe(canvas);
  const keepOut = keepOutNode();
  if (keepOut) resizes.observe(keepOut);

  const applyMotionPreference = () => {
    reduced = reduceQuery.matches;
    if (!reduced) {
      /* Motion allowed again: the pulses have to be put back on the clock. */
      scheduleAmbient();
      return;
    }
    stop();
    if (energy) energy.fill(0);
    pointer.active = false;
    renderStatic();
  };
  reduceQuery.addEventListener?.("change", applyMotionPreference);
  coarseQuery.addEventListener?.("change", () => {
    if (ambientDue()) start();
    else stopAmbient();
  });

  if (!build()) return null;
  renderStatic();
  return { injectRect };
}

/* ---- Hero: the wide crown beside the headline -------------------------- */
const heroCanvas = document.querySelector(".hero-canvas");
if (heroCanvas) {
  createNeuralField(heroCanvas, {
    host: heroCanvas.closest(".hero") ?? heroCanvas.parentElement,
    /* Gentle: beside the copy the clearance does the real work. */
    leftBias: 0.3,
    keepRightOf: ".hero-copy",
    keepBelow: ".site-header",
    keepBelowStacked: ".hero-copy",
    rim: true,
    densityPerMegapixel: 820,
    densityStacked: 3800,
    pointerRadius: 190,
    /* All three are touch-only, and all three exist because a phone shows the
       dome small, under a scrim and with no cursor to light it: it breathes on
       its own, it answers the scroll, and what it does light burns harder. */
    ambientEvery: 3400,
    scrollDriven: true,
    touchGlow: 1.5
  });
}

/* ---- Process: a quiet field that answers each hovered step ------------- */
const processCanvas = document.querySelector(".process-canvas");
if (processCanvas) {
  const shell = processCanvas.closest(".process-shell") ?? processCanvas.parentElement;
  const processField = createNeuralField(processCanvas, {
    host: shell,
    seed: 0x51e9,
    densityPerMegapixel: 700,
    pointerRadius: 130,
    baseOpacity: 0.6,
    /* One little neuron per step, so hovering a step always lights it. */
    anchors: (canvas, dpr) => {
      const box = canvas.getBoundingClientRect();
      return [...document.querySelectorAll(".process-step")].map((step) => {
        const rect = step.getBoundingClientRect();
        return {
          x: (rect.left + rect.width / 2 - box.left) * dpr,
          y: (rect.top + rect.height * 0.42 - box.top) * dpr
        };
      });
    }
  });
  if (processField) {
    for (const step of document.querySelectorAll(".process-step")) {
      step.addEventListener("pointerenter", () => {
        processField.injectRect(step.getBoundingClientRect());
      });
    }
  }
}
