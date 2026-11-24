# Duel camera vs v121 terrain

Owner report (2026-11-23): duels fought next to a cliff showed nothing. The rock-cut cliffs hid or clipped the mechs.

**Cause.** Sites v121 raised the terraces from 1.55 m to 2.8 m. The duel lens sits low, at about a third of the mech's height, and its occlusion raycast skipped the ground tiles. Beside a raised tile the lens ended up inside the terrace, 1.3 m under its surface, or behind the terrace lip, and nothing flagged it.

**Fix** (`dist/scene/battle.js`):

1. The sightline test now counts every visible board surface: ground tiles, cliffs, cover, props and the landscape. Lines and see-through overlays don't block.
2. The lens is kept 1.1 m above the highest ground within 1.8 m of it, so it never sits inside a terrace or on a cliff lip.
3. A view must see the hull at 35, 50, 65 and 85% of its height. A single sample can slip under a rock overhang, or graze a lip.
4. The camera keeps its side of the screen and tries 16 views, gentlest first: raise the lens, swing wider, move closer, then a high crane. The first view that sees the whole hull wins; otherwise the view that sees the most of it.

**Evidence.** `before-after.webp` shows the reported position, contract 0, seed 77, ally at 10,4. On the left, the old lens is inside the terrace. On the right, the mech is in view.

| Sweep: real maps, 20 random pairs per map biased to cliffs, 8 beats each | Hidden beats |
|---|---|
| Old build, contracts 0 and 2 | 16 / 320, incl. lens under terrain |
| Fixed build, contracts 0–3 (all three theaters) | 0 / 640 |

**Regression test.** `qa/browser/duel-terrain.cjs` (checkDuelTerrain) uses three real-map positions where the old build failed. It fails on the old build ("lens clearance -1.27 m") and passes on desktop and touch.
