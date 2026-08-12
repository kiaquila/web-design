/* Alex Neon — where a neural figure sits on its canvas. Composition stays a
   styling decision: --nx / --ny place the centre, --nr (or --nrx / --nry)
   sizes it, all as fractions. What CSS cannot say is "stay off the copy", so
   the keep-out selectors below are resolved against the live layout. */

/** Reads a numeric custom property off the canvas. */
export function cssNumber(canvas, name, fallback) {
  const raw = parseFloat(getComputedStyle(canvas).getPropertyValue(name));
  return Number.isFinite(raw) ? raw : fallback;
}

/**
 * Where the figure sits, in device pixels. `--nr` asks for a circle whose
 * radius is a fraction of the canvas height; without it the figure is the
 * ellipse given by `--nrx` / `--nry`.
 *
 * `keepRightOf` centres the circle in the column left over beside that element
 * and shrinks it until it clears both the copy and the canvas edge. When the
 * copy spans the canvas — the one-column layout — there is no such column and
 * the CSS placement stands. It is then shrunk again to clear a ceiling:
 * `keepBelow` beside the copy, where only the header is overhead, and
 * `keepBelowStacked` under it, where the copy itself is.
 *
 * @param {{canvas: HTMLCanvasElement, options: object, cssWidth: number,
 *          cssHeight: number, dpr: number, W: number, H: number}} context
 */
export function measureShape({ canvas, options, cssWidth, cssHeight, dpr, W, H }) {
  const nx = cssNumber(canvas, "--nx", 0.5);
  const ny = cssNumber(canvas, "--ny", 0.5);
  const circle = cssNumber(canvas, "--nr", NaN);

  if (!Number.isFinite(circle)) {
    return {
      cx: nx * W,
      cy: ny * H,
      rx: cssNumber(canvas, "--nrx", 0.5) * W,
      ry: cssNumber(canvas, "--nry", 0.5) * H
    };
  }

  let radius = circle * cssHeight;
  let centreX = nx * cssWidth;
  const centreY = ny * cssHeight;
  const box = canvas.getBoundingClientRect();

  let stacked = true;
  const beside = options.keepRightOf && document.querySelector(options.keepRightOf);
  if (beside) {
    const keepOut = beside.getBoundingClientRect();
    const left = keepOut.right - box.left + 40;
    /* Leave the far edge some room too, or the rim gets sliced flat by it. */
    const column = cssWidth - left - 28;
    /* Below roughly a third of the width the copy owns the canvas. */
    if (column > cssWidth * 0.34) {
      radius = Math.min(radius, column / 2);
      centreX = left + column / 2;
      stacked = false;
    }
  }

  const ceilingSelector = (stacked && options.keepBelowStacked) || options.keepBelow;
  const above = ceilingSelector && document.querySelector(ceilingSelector);
  if (above) {
    const keepOut = above.getBoundingClientRect();
    const ceiling = keepOut.bottom - box.top + 24;
    /* On a viewport too short to hold both, the clearance wins and the radius
       floors at zero rather than going negative and poisoning the geometry. */
    radius = Math.max(0, Math.min(radius, centreY - ceiling));
  }

  /* Stacked, width is what actually limits the dome: the band under the copy is
     taller than it is wide, so a radius of half the width would leave a strip
     of dead space above the crown. A little over half lets it fill the band and
     crops only the sphere's shoulders, which still reads as a sphere — the
     shallow arc this replaced is what happens when the crop goes further. */
  if (stacked) radius = Math.min(radius, cssWidth * 0.62);

  /* Everything above is in CSS pixels; the field wants device pixels. `stacked`
     goes back out because the caller budgets its nodes off it. */
  return {
    cx: centreX * dpr,
    cy: centreY * dpr,
    rx: radius * dpr,
    ry: radius * dpr,
    stacked
  };
}
