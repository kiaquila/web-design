# Dish image hooks

The build knows these optional filenames. Existing files are rendered as circular
medallions; absent files are omitted without a broken-image placeholder. Run
`npm run build` after adding an image.

- `chaijana-experiences.webp` *(client photo)*
- `draniki-salmon.webp` *(client photo)*
- `crispy-eggplant.webp` *(missing)*
- `adjarian-khachapuri.webp` *(client photo)*
- `borscht.webp` *(client photo)*
- `lula-kebab.webp` *(missing)*
- `uzbek-plov.webp` *(client photo)*
- `manti.webp` *(client photo)*
- `kids-menu.webp` *(client photo)*
- `medovik.webp` *(client photo)*
- `uzbek-tea.webp` *(client photo)*
- `fruit-shakes.webp` *(PDF extract — replace)*
- `cocktails.webp` *(missing)*
- `wine.webp` *(missing)*
- `hookah.webp` *(PDF extract — replace)*

Use the restaurant's exact dish photographs (or identical dishes with explicit
approval). Export as **square 1:1 WebP, under 250 KB, at least 1200 px** — the
medallion renders at 330 CSS px, so anything smaller is visibly soft on a retina
screen. Shoot on a black ground: the medallion is a circular crop with only a
light inner vignette, so a photograph on any other background shows a hard disc
edge.

**Leave the dish room to breathe.** The crop is the circle inscribed in the
square, and the inner vignette shades the rim on top of that, so the dish has to
stay inside roughly **0.90 of the frame radius** — measured corner to corner, not
just left to right. A diagonal dish that fills the square will have its ends
sliced off; that is what happened to the khachapuri, whose boat reached 1.012 of
the radius before it was re-exported at 0.86. To check a candidate file:

```sh
python3 - <<'PY'
import math, subprocess
p = "adjarian-khachapuri.webp"
w, h = (int(v) for v in subprocess.run(
    ["magick", "identify", "-format", "%w %h", p],
    capture_output=True, text=True).stdout.split())
g = subprocess.run(["magick", p, "-colorspace", "Gray", "-depth", "8", "gray:-"],
                   capture_output=True).stdout
cx, cy, r = (w - 1) / 2, (h - 1) / 2, min(w, h) / 2
far = max((math.hypot(x - cx, y - cy)
           for y in range(h) for x in range(w) if g[y * w + x] > 70), default=0)
print(f"{p}: dish reaches {far / r:.3f} of the radius (keep under 0.90)")
PY
```

**If a delivered file is too tight, ask for a re-export with the air already in
it.** Padding in post is a stopgap, not the house method: there is no real
photograph outside the frame, so whatever fills the gap is invented, and how well
it hides depends on the ground. It got away with it on the khachapuri only
because that ground is near-black and almost featureless.

When you do have to pad, scale about the centre and extend the ground outward
rather than recomposing the shot:

```sh
magick master.png -virtual-pixel edge -distort SRT '0.85 0' padded.png
cwebp -q 84 -m 6 -sharp_yuv padded.png -o dish.webp
```

`edge` replicates the outermost row and column outward, which is flat along each
ray — on a lighter or more textured ground that reads as visible streaks. Two
alternatives were tried on the khachapuri and are worse, so don't reach for them
first: `-virtual-pixel mirror` reflects the dish back into frame as ghost tips
when it sits within the mirrored band, and compositing over a blurred copy of the
same frame leaves a square seam plus colour halos bleeding off the dish.

Whichever fill you use, **check it under a brightness stretch before shipping** —
averages over the ring hide directional structure, so look at it rather than
measuring means:

```sh
magick padded.webp -level 0%,14% -resize 420x420 stretch.png   # then open it
```

Compare against an untouched medallion given the same stretch. Structure that
survives at the delivery size of 330 px is a reject; if the fill only shows up
under an 18× stretch and the file measures no more angular variation than an
untouched frame at the same radii, it is below the visible floor.

The client-supplied files are 1254 × 1254 masters delivered 2026-08-07, plus
`borscht.webp` supplied 2026-08-08. The two remaining PDF extracts were pulled
from the printed carta at 100–130 ppi and are still placeholders.

Shooting direction, per-file priorities and the website slots are in
[`../../../PHOTO-BRIEF.md`](../../../PHOTO-BRIEF.md). Provenance of the current
extracts is recorded in `mapping.json`.
