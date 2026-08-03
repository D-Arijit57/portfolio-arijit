# 3D Document Preview — deviations from the specification

Sprint 18, plus the 18.1 refinement pass and the 18.2 square-on pass.
Companion to *"Premium 3D Document Preview — Design & Engineering
Specification"*. Everything the implementation does differently from that
document, and why. Anything not listed here was implemented as written.

Measurements come from `scratchpad/compare.mjs`, `look.mjs`, `clipcheck.mjs`,
`states.mjs` and `behaviour.mjs` — Playwright against a real WebGL render,
sampling pixels and GL draw calls. Not from inspection.

---

## The governing decision: the sheet is viewed square-on

This supersedes both the specification's angled hero composition (§11: yaw
12–20°) **and** the reference mockup, which the 18.1 pass had matched to
within ~1% on every geometric metric.

**Why it changed.** The angle was the direct cause of the one acceptance
criterion that had never passed — §15's "body text on the sheet is legible
in the default `staged` state at 100% browser zoom". A yawed page is
foreshortened, so it occupied ~55% of the pane's width, and its texture was
sampled across a tilted plane. Square-on it occupies ~62%, is sampled square,
and the body copy resolves. **§15's legibility item is now met.**

**Why it went to exactly 0° rather than a shallower angle.** Spec §13.4
observes that rotation under ~8° reads as a rendering mistake rather than a
decision, so the honest choice is a committed angle or none. This takes
none.

**What it costs.** The "staged product still-life" character §1.1 builds the
whole document around. Physicality now has to come from the modelled edge
thickness, the contact shadow, the bow's swept highlight and the receding
floor rather than from the pose. Pointer parallax still swings the sheet a
few degrees either side of square, so it moves like an object without
resting like a tilted one.

Resulting geometry: edge-height ratio **1.000**, both edge slopes **0**,
optical centre **49.9%** from the left.

---

## 1. Rendering stack: imperative Three.js, not React Three Fiber

**Spec:** §8.2 recommends React Three Fiber plus the drei ecosystem.

**Built:** hand-rolled imperative Three.js, matching the convention every
other subsystem in this codebase follows.

**Why:** adopting r3f + drei is a full rewrite of an existing module plus two
large dependencies, against a brief that asks to preserve the Journey
architecture. Nothing the spec asks for visually requires r3f —
`RectAreaLight`, `PMREMGenerator`, `ShaderMaterial` and `NeutralToneMapping`
are all core Three. The drei helpers are hand-rolled in `scene/lightRig.ts`
and `scene/shadows.ts`.

**Cost:** more glue code; §6.2's accumulated-shadow option is not
implemented (see 6 below).

**Also not adopted from §8.2:** WebGPU behind a flag, and the grid in TSL.

---

## 2. Camera: 2.15 page heights, not 3.6–4.2; elevation 4°, not 8–14°

**Distance.** Set so the page fills ~92% of the stage's height with enough
headroom that parallax and the hover lift never clip it. The spec's distance
measured 56.9% — the "too small" result that started the refinement work.

**Elevation** is 4° rather than the spec's 8–14°, and the constraint is the
floor rather than the page: at 0° the camera lies in the ground plane, which
then projects to a single line and takes the grid and the contact shadow
with it. A few degrees keeps both readable. Vertical convergence from a
slightly high camera reads as natural — it is yaw and roll that make a
square-on page look crooked.

`REST_PITCH_DEG` matches the elevation so the page's face stays
perpendicular to the view axis.

---

## 3. Margins: ~3–4%, not ≥8–10%

A consequence of filling the pane. Verified not to clip in any reachable
state; the tightest case is hover at the top-right, at **2.32%**:

```
rest       top=3.33% bottom=4.34% left=17.58% right=17.72%
hover-TL   top=2.60% bottom=4.92%
hover-TR   top=2.32% bottom=5.07%   <- tightest
hover-BL   top=2.60% bottom=4.05%
hover-BR   top=2.60% bottom=3.91%
```

Sides are symmetric by intent. The 18.1 pass had deliberately offset the
sheet left, because an *angled* composition with equal margins looks
accidental (§11). A square-on document wants the opposite: deliberate
symmetry, like a page held up to be read. `CAMERA_TARGET_X` is now 0.

---

## 4. The `focused` state is now emphasis, not rescue

**Spec §9.3** designs focus to rotate an angled sheet near-frontal and dolly
in 12%, "converting the decorative render into a readable one on demand".
Square-on framing does the rotating half by default.

The dolly is also necessarily small: the resting page already occupies ~92%
of the stage's height, so a 12% push would take it past 100% and clip. At
0.95 it gains ~5% and the grid recedes further, which still reads as "the
document is the subject now" without breaking §15's never-clip rule.

---

## 5. A fifth light: floor bounce

**Spec §6.1** specifies four contributions — environment, key, fill, rim.

**Added:** a dim upward-facing area light under the sheet's base. Every light
in the specified rig sits at or above the sheet's own height, so its bottom
cut edge — which faces straight down — received nothing and went to black.
The sheet ended in a hard silhouette and read as a plane.

Kept dim and aimed steeply, so the downward-facing edge sees it head-on
while the page's face only catches it at a grazing angle. At a shallower
angle it lit the lower half of the page and collapsed the luminance gradient
from 15% to under 3%.

---

## 6. Shadows: baked two-part, not accumulated

**Spec §6.2** offers accumulated soft shadows or baked contact shadows.
**Built:** the baked half only — a tight contact term and a wide ambient
term. Accumulation is what drei packages as `AccumulativeShadows`; hand-
rolling a jittered multi-pass buffer is substantial work for a softer
penumbra on a scene with one caster.

At this shallow elevation the contact term reads as ambient occlusion at the
join rather than as a cast shadow. Two real bugs were fixed here in 18.1:
the contact plane's dark core sat most of a page height in front of the
sheet (a flat `PlaneGeometry` maps v=0 to its *near* edge), and
`setOffset()` was overwriting the plane's depth every frame with a stale
hardcoded value. A third: the shadow's linear tint encoded to ~0.094 display
against a local backdrop of ~0.067, so it was *brightening* the floor it
fell on.

Contact core measures **2.3%** luminance against §11's stated 3–5% —
slightly darker, because a contact line seen near edge-on has to carry
grounding that a spread-out cast shadow would otherwise provide.

---

## 7. Sheet luminance gradient

The spec (§6.3) wants a 12–18% top-to-bottom falloff. **The reference mockup
has 1.1%** — near-uniform white paper. Both were asked for at different
times: stop reading flat, and match the reference.

Implemented at **8.6%**, deliberately between them. At 12% the sheet's lower
third read visibly grey next to the reference in a side-by-side, which
undercuts the "paper is the brightest object" quality; at 1% there is no
form at all. The lower edge sits at 0.879 luminance — still unmistakably
white — with a readable falloff. Chosen against a rendered side-by-side
rather than either number in isolation.

---

## Verified

| Item | Target | Measured |
|---|---|---|
| square-on: edge-height ratio | 1.000 | **1.000** |
| square-on: top / bottom edge slope | 0 / 0 | **0 / 0** |
| optical centre from left | centred | **49.9%** |
| sheet height vs stage | fill without clipping | **92.3%** |
| sheet width vs stage | — | **62%** (was 55%) |
| §15 body-text legibility | legible at 100% zoom | **met** |
| §6.3 luminance gradient | 12–18% (reference 1.1%) | 8.6% — see 7 |
| §11 sheet upper | 90–95% | 96.1% |
| sheet lower | — | 87.9% |
| paper neutrality | neutral white | +0.8% warm (was +8.0%) |
| §11 backdrop corner | 4–7% | 5.9% |
| paper : backdrop contrast | ~10:1 | 11.7:1 |
| §10.2 idle GPU work | 0 | **0 draw calls over 2.5s** |
| §15 settled after pointer exit | nothing renders | **0 draw calls** |
| §10.2 draw calls | <10 | 6 |
| §10.2 texture VRAM | <32MB | ~23MB |
| §5.5 texel density | 2.5–3.5 / screen px | ~2.9 |
| §15 wheel scrolls page | not captured | `defaultPrevented: false` |
| §7.4 reduced motion | parallax disabled | 0 draw calls on pointer move |
| §9.5 Reset View dirty-gating | disabled until dirty | staged/inspect disabled; focused enabled |
| §15 no-WebGL | readable + downloadable | verified |
| §13.31 refresh leak | no growth | 0 MB over 6 refreshes |

Interaction verified end to end: staged → focused (click) → staged (Esc) →
inspect (tab) → reset → PREVIEW, returning to identical staged geometry
(471×638, ratio 1.000).

**Not verifiable here:** §15's "show it to someone cold and they describe it
as a photo of a printed resume" needs a human — and is the criterion most
affected by the square-on decision, since a face-on page reads more as a
document scan than as a photographed object.

---

## Remaining limit

Body text is legible but small: a full A4 page in a 691px-tall pane caps the
rendered page at ~638px, which puts 10pt body copy near 5–6px of cap height.
Square-on maximises it and `focused` adds ~5%; beyond that the only lever is
showing less than a full page, which is out of scope.
