/* Alex Neon — интерактивная «нейронная корона» в hero.
   Статичная фигура из дендритных ветвей с узлами на кончиках; узлы
   «загораются» у курсора или касания и плавно гаснут. Генерация
   детерминированная (сидированный PRNG), базовый слой рендерится один раз
   в offscreen-canvas, rAF работает только пока есть энергия или активность.
   prefers-reduced-motion: reduce → только статичный рендер. */
(() => {
  "use strict";

  const canvas = document.querySelector(".hero-canvas");
  if (!canvas || !canvas.getContext) return;
  const hero = canvas.closest(".hero") || canvas.parentElement;
  const ctx = canvas.getContext("2d");

  const SEED = 0x5eed;
  const TAU = Math.PI * 2;
  const TEAL = [46, 230, 214];
  const VIOLET = [139, 92, 246];
  const BUCKETS = 12;
  const DECAY = 0.94; /* per 60fps frame → затухание ~0.6–0.7 c */
  const POINTER_RADIUS = 105; /* CSS px */
  const POINTER_STRENGTH = 0.85;

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reduceQuery.matches;

  /* ---- Состояние фигуры --------------------------------------------------- */
  let dpr = 1;
  let W = 0;
  let H = 0;
  let count = 0;
  let px = null; /* координаты узлов (device px) */
  let py = null;
  let pr = null; /* радиус узла */
  let pb = null; /* цветовой bucket */
  let pe = null; /* энергия 0..1 */
  let pt = null; /* id ствола — соседи по массиву внутри ствола связаны */
  let base = null; /* offscreen с базовым слоем */
  let sprites = []; /* пререндеренные радиальные спрайты свечения */
  let coreColors = [];
  let lineColors = [];
  let dotColors = [];

  /* ---- Утилиты -------------------------------------------------------------- */
  const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const mix = (t) =>
    [0, 1, 2].map((i) => Math.round(lerp(TEAL[i], VIOLET[i], t)));

  const cssFraction = (name, fallback) => {
    const raw = parseFloat(getComputedStyle(canvas).getPropertyValue(name));
    return Number.isFinite(raw) ? raw : fallback;
  };

  for (let b = 0; b < BUCKETS; b++) {
    const t = b / (BUCKETS - 1);
    const [r, g, bl] = mix(t);
    lineColors.push(`rgba(${r},${g},${bl},0.34)`);
    dotColors.push(`rgba(${r},${g},${bl},0.88)`);
    const cr = Math.round(lerp(r, 255, 0.55));
    const cg = Math.round(lerp(g, 255, 0.55));
    const cb = Math.round(lerp(bl, 255, 0.55));
    coreColors.push(`rgb(${cr},${cg},${cb})`);
  }

  const makeSprites = () => {
    sprites = [];
    for (let b = 0; b < BUCKETS; b++) {
      const t = b / (BUCKETS - 1);
      const [r, g, bl] = mix(t);
      const size = 64;
      const s = document.createElement("canvas");
      s.width = size;
      s.height = size;
      const sc = s.getContext("2d");
      const grad = sc.createRadialGradient(
        size / 2, size / 2, 0, size / 2, size / 2, size / 2
      );
      grad.addColorStop(0, "rgba(255,255,255,0.55)");
      grad.addColorStop(0.3, `rgba(${r},${g},${bl},0.32)`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      sc.fillStyle = grad;
      sc.fillRect(0, 0, size, size);
      sprites.push(s);
    }
  };

  /* ---- Генерация дендритов ---------------------------------------------------- */
  const generate = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(w * dpr);
    H = Math.round(h * dpr);
    canvas.width = W;
    canvas.height = H;

    const rng = mulberry32(SEED);
    const cx = cssFraction("--nx", 0.7) * W;
    const cy = cssFraction("--ny", 0.5) * H;
    const R = cssFraction("--nr", 0.44) * Math.min(W, H);

    const target = Math.max(
      900, Math.min(2700, Math.round((w * h) / 380))
    );
    const cap = Math.round(target * 1.2);
    const maxDepth = 5;

    const nx = new Float32Array(cap);
    const ny = new Float32Array(cap);
    const nr = new Float32Array(cap);
    const nb = new Uint8Array(cap);
    const nt = new Int16Array(cap);
    const segs = [];
    const segBucket = [];
    count = 0;

    const bucketAt = (x) => {
      let t = (x - (cx - R)) / (2 * R);
      t = Math.max(0, Math.min(1, t));
      t = t * t * (3 - 2 * t);
      return Math.round(t * (BUCKETS - 1));
    };

    const addNode = (x, y, trunkId) => {
      if (count >= cap) return;
      nx[count] = x;
      ny[count] = y;
      nr[count] = (1.3 + rng() * 1.7) * dpr;
      nb[count] = Math.max(
        0,
        Math.min(BUCKETS - 1, bucketAt(x) + Math.round((rng() - 0.5) * 2))
      );
      nt[count] = trunkId;
      count++;
    };

    const grow = (x, y, angle, depth, trunkId, inward) => {
      const segLen = R * 0.048 * (0.8 + rng() * 0.5) * Math.pow(0.94, depth);
      for (let s = 0; s < 3; s++) {
        const radial = Math.atan2(y - cy, x - cx) + (inward ? Math.PI : 0);
        let delta = ((radial - angle + Math.PI * 3) % TAU) - Math.PI;
        angle += delta * 0.18 + (rng() - 0.5) * 0.55;
        const x2 = x + Math.cos(angle) * segLen;
        const y2 = y + Math.sin(angle) * segLen;
        segs.push(x, y, x2, y2);
        segBucket.push(bucketAt((x + x2) / 2));
        x = x2;
        y = y2;
      }
      const dist = Math.hypot(x - cx, y - cy);
      const done = inward
        ? depth >= maxDepth || dist < R * 0.14
        : depth >= maxDepth || dist > R * (1 + rng() * 0.08);
      if (done) {
        addNode(x, y, trunkId);
        return;
      }
      const children = rng() < 0.85 ? 2 : 1;
      const spread = Math.max(0.2, 0.5 - depth * 0.05);
      if (children === 1) {
        grow(x, y, angle + (rng() - 0.5) * 0.3, depth + 1, trunkId, inward);
      } else {
        grow(x, y, angle - spread * (0.5 + rng() * 0.7), depth + 1, trunkId, inward);
        grow(x, y, angle + spread * (0.5 + rng() * 0.7), depth + 1, trunkId, inward);
      }
    };

    let trunkId = 0;
    while (count < target && trunkId < 360) {
      const a = trunkId * 2.39996 + rng() * 0.2;
      const rr = R * (0.22 + rng() * 0.14);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const inward = rng() < 0.12;
      grow(x, y, inward ? a + Math.PI : a, inward ? maxDepth - 2 : 0, trunkId, inward);
      trunkId++;
    }

    px = nx;
    py = ny;
    pr = nr;
    pb = nb;
    pt = nt;
    pe = new Float32Array(count);

    /* Базовый слой: рисуем один раз, пакетами по цвету. */
    base = document.createElement("canvas");
    base.width = W;
    base.height = H;
    const bc = base.getContext("2d");
    const segLen = segs.length / 4;
    bc.lineWidth = Math.max(0.7, 0.55 * dpr);
    bc.lineCap = "round";
    for (let b = 0; b < BUCKETS; b++) {
      bc.strokeStyle = lineColors[b];
      bc.beginPath();
      for (let i = 0; i < segLen; i++) {
        if (segBucket[i] !== b) continue;
        bc.moveTo(segs[i * 4], segs[i * 4 + 1]);
        bc.lineTo(segs[i * 4 + 2], segs[i * 4 + 3]);
      }
      bc.stroke();
      bc.fillStyle = dotColors[b];
      bc.beginPath();
      for (let i = 0; i < count; i++) {
        if (pb[i] !== b) continue;
        bc.moveTo(px[i] + pr[i], py[i]);
        bc.arc(px[i], py[i], pr[i], 0, TAU);
      }
      bc.fill();
    }

    makeSprites();
    return true;
  };

  /* ---- Рендер ------------------------------------------------------------------- */
  const renderStatic = () => {
    if (!base) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
  };

  const render = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const e = pe[i];
      if (e < 0.02) continue;
      const b = pb[i];
      /* Halo stays close to the node so a lit cluster still reads as separate
         neurons instead of one blown-out blob under `lighter`. */
      const s = pr[i] * (3.2 + 2.4 * e);
      ctx.globalAlpha = Math.min(1, e) * 0.4;
      ctx.drawImage(sprites[b], px[i] - s / 2, py[i] - s / 2, s, s);
      ctx.globalAlpha = Math.min(1, 0.3 + 0.6 * e);
      ctx.fillStyle = coreColors[b];
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i] * (1 + 0.45 * e), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  /* ---- Энергия и цикл --------------------------------------------------------------- */
  const pointer = { x: 0, y: 0, active: false };
  let raf = 0;
  let lastT = 0;
  let visible = true;
  let shimmerTimer = 0;

  const paused = () => !visible || document.hidden;

  const inject = (x, y, radius, strength) => {
    const r2 = radius * radius;
    for (let i = 0; i < count; i++) {
      const dx = px[i] - x;
      const dy = py[i] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      /* Squared falloff: the drop of light stays tight around the cursor. */
      const f = 1 - Math.sqrt(d2) / radius;
      const v = strength * f * f;
      if (v > pe[i]) pe[i] = v;
    }
  };

  const frame = (t) => {
    raf = 0;
    const dt = Math.min(48, t - lastT || 16.7);
    lastT = t;
    if (pointer.active) {
      inject(pointer.x, pointer.y, POINTER_RADIUS * dpr, POINTER_STRENGTH);
    }

    /* Лёгкое перетекание энергии к соседям по ветви + затухание. */
    const k = Math.pow(DECAY, dt / 16.7);
    let maxE = 0;
    for (let i = 0; i < count; i++) {
      const e = pe[i];
      if (e > 0.04) {
        if (i > 0 && pt[i - 1] === pt[i] && pe[i - 1] < e * 0.8) {
          pe[i - 1] += (e * 0.8 - pe[i - 1]) * 0.06;
        }
        if (i + 1 < count && pt[i + 1] === pt[i] && pe[i + 1] < e * 0.8) {
          pe[i + 1] += (e * 0.8 - pe[i + 1]) * 0.06;
        }
      }
      pe[i] *= k;
      if (pe[i] > maxE) maxE = pe[i];
    }

    render();
    if ((maxE > 0.015 || pointer.active) && !paused()) {
      raf = requestAnimationFrame(frame);
    }
  };

  const ensureRunning = () => {
    if (raf || reduced || paused() || !count) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  /* ---- Спокойное редкое мерцание одиночных узлов ------------------------------------- */
  const scheduleShimmer = () => {
    clearTimeout(shimmerTimer);
    shimmerTimer = setTimeout(() => {
      if (!reduced && !paused() && count) {
        const n = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < n; j++) {
          const i = Math.floor(Math.random() * count);
          pe[i] = Math.max(pe[i], 0.5 + Math.random() * 0.35);
        }
        ensureRunning();
      }
      scheduleShimmer();
    }, 500 + Math.random() * 900);
  };

  /* ---- Указатель и касание -------------------------------------------------------------- */
  const updatePointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) * dpr;
    pointer.y = (event.clientY - rect.top) * dpr;
    pointer.active = true;
  };

  hero.addEventListener("pointermove", (event) => {
    if (reduced) return;
    updatePointer(event);
    ensureRunning();
  });
  hero.addEventListener("pointerdown", (event) => {
    if (reduced) return;
    updatePointer(event);
    /* A tap is the only activation gesture on touch, so it lands wider. */
    inject(pointer.x, pointer.y, POINTER_RADIUS * 1.4 * dpr, 1);
    ensureRunning();
  });
  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  hero.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse") pointer.active = false;
  });
  hero.addEventListener("pointercancel", () => {
    pointer.active = false;
  });

  /* ---- Пауза вне вьюпорта и на скрытой вкладке ------------------------------------------- */
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (paused()) stop();
      else ensureRunning();
    },
    { threshold: 0.02 }
  ).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (paused()) stop();
    else ensureRunning();
  });

  /* ---- Ресайз: дебаунс 200 мс, регенерация с тем же сидом --------------------------------- */
  let resizeTimer = 0;
  let lastW = 0;
  let lastH = 0;
  new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lastW = canvas.clientWidth;
      lastH = canvas.clientHeight;
      stop();
      if (generate()) renderStatic();
    }, 200);
  }).observe(canvas);

  /* ---- Reduced motion: статичный рендер, без цикла и мерцания ------------------------------ */
  const applyMotionPreference = () => {
    reduced = reduceQuery.matches;
    if (reduced) {
      stop();
      clearTimeout(shimmerTimer);
      if (pe) pe.fill(0);
      pointer.active = false;
      renderStatic();
    } else {
      scheduleShimmer();
    }
  };
  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", applyMotionPreference);
  }

  /* ---- Старт --------------------------------------------------------------------------------- */
  lastW = canvas.clientWidth;
  lastH = canvas.clientHeight;
  if (generate()) {
    renderStatic();
    if (!reduced) scheduleShimmer();
  }
})();
