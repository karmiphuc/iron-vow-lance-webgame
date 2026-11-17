# Phase 7 · Renderer release verification

The local release gate passed 58 simulation suites, 43 desktop Chromium cases and 43 touch Chromium cases. The run used the documented software rendering policy. Application tree `0a86fcda372000ad5bc99d356d332a1c0129c749` matches the merged Phase 6 runtime. See the [release report](summary.json).

The 30-seed campaign exercised all 21 chassis, all 24 Workshop weapons and both shields. It completed 126,288 observed ticks with zero anomalies and detected all 16 fault controls. [Phase 6 War and Bench evidence](../phase6/README.md)

The cleanup retired 38 sprite bake tools and support files plus the old animation sampler fixture. The Gatecrasher cleaver authoring routine generated its original 31-frame track in Blender and both Line Infantry grip inspections passed without changing the source files. The archive installers preserve the GLB geometry and animation chunks.

The release fixtures now sample the live gait cycle at the tile seam, wait for decoded portraits, preserve Three.js object randomness, and use exposed raycast targets in the campaign touch check.

Native iPad Pro Safari and Chrome performance and owner sign-off are unverified. [Device record](../../docs/release-verification.json)
