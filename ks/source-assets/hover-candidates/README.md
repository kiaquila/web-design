# Hover frame candidates — considered and rejected

Two frames from the owner's own session of the same shoot, both 1139×1381:

| File | Frame |
| --- | --- |
| `session-calm.png` | calm face, matches the published calm frame |
| `session-open-mouth.png` | open mouth, proposed as a replacement hover frame |

`session-calm.png` is the same photograph as the published `calm-776.jpg`, at a
wider crop and a higher resolution. It registers onto the published crop at
**scale 0.787, offset (75, 39)**, with a mean absolute difference of 4.6/255 —
so the transform that maps this session into the published pair is known, and
applying it to `session-open-mouth.png` produces a drop-in 776×971 hover frame.

**It was not used.** The two exposures are separate photographs and the owner
leaned between them, so the swap moves more than the face. Measured against the
calm frame:

| Landmark | Movement |
| --- | --- |
| headband centre | 24 px |
| crown hair | 32 px |
| left shoulder | 40 px |
| right shoulder | 12 px |
| collar centre | 40 px, and out of shape |

They move in different directions, so this is not a rigid displacement: no
single scale, offset or rotation holds the face, the crown and the shoulders
still at once. Fitting on the body drops the face lower and smaller; fitting on
the face shifts the crown and shoulders. The published pair matches on every one
of these landmarks to 1.000, because its hover frame is the calm frame with only
the face composited in.

The owner reviewed all three side by side and kept the published composite. Use
these files if that is ever revisited — either accepting the head movement, or
compositing this expression onto the calm body the way the published frame was
made.
