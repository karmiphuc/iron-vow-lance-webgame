# Raven heavy assault hero

The Mech Bay lists Raven at 400,000 credits. Iron Pass also stocks it at the local port price. The rotary gauntlet and clamp are part of the chassis. The two shoulder shields share the health of their respective arms.

The revised torso is 12% narrower and 15% shorter. Longer legs give Raven a straighter stance while keeping its crowns, optics and feet at the same heights. The knees flex when walking and bracing.

Both arms take 25% less damage after ordinary armor and Brace reduction, rounded to whole HP. When braced, Raven redirects frontal body and leg hits onto its working arms. A volley starts with the healthier shield and alternates between working shields. A single surviving arm covers the front alone. Side, rear, and cockpit hits keep their original locations.

![The arms tuck and both shoulder shields pivot forward during Brace](brace.webp)

Factory paint assigns each purchased Raven one of three arrangements of dark-crimson seam inlays on midnight-black armor. The arrangement stays with the hull through storage, reassignment and reload. Workshop paint can override it, and Factory restores the hull's original inlays.

![Three Raven midnight factory finishes in the game renderer](midnight-inlays.webp)

Luminous crimson wing inlays and indigo bevels sit on matte armor. A faint glow follows the surrounding metal on the same moving plate. Baked occlusion shades the close gaps around the shields, chest and joints. Foot shadows follow the soles on the battlefield and in Mech Bay. [Same-camera lighting comparison](lighting-comparison.webp).

Open `tools/authoring/raven/Raven-Rig.blend` to edit the six actions. The shield bones articulate independently from the upper arms. Rebuild the compressed battle asset from the repository root with Blender.

```sh
blender -b tools/authoring/raven/Raven-Rig.blend --python tools/export_raven_v2.py
```

Run `node qa/check-raven.cjs` to verify purchase, save, defensive arcs, damage, and both built-in attacks. Run `node qa/check-rig-v2.cjs dist/rig-bench/rig-v2/raven.glb` to verify the exported game asset. Use `?bench=rig&frame=30` to inspect the clips interactively.

Set `IRON_VOW_QA_SCENARIOS=checkRavenVisuals` when running `npm run test:browser` to exercise Raven in the battlefield, Mech Bay, Workshop and Rig Bench. [Browser capture of the deployed shields](rig-bench.webp).
