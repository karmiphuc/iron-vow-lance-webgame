# Phase 2 visual review

Visual evidence is complete: **128 main images across fifty source-scoped combat cases**, three natural-fault frames, historical and final actual-counter frames, four final matching-preset images, and one actual Assigned Workshop image. The 138 captured images retain individual source, render-policy and lossless-encoding metadata; copied Phase 0 baseline files and derivative sheets are additional review aids.

## Evidence

| Scope | Cases | Captured images |
| --- | ---: | ---: |
| Desktop catalog, including built-ins and shoulder item | 34 | 52 |
| Shield, critical damage, arm destruction, body death, pilot kneel, jumpjet, future mortar presentation | 7 | 40 |
| Reduced-motion missile, rail and blade | 3 | 12 |
| Touch-capable tablet rifle, shotgun, missile, rail, blade and Parallax | 6 | 24 |
| Natural plasma/crawl/joint dispatch supplement | 1 | 3 |
| Actual near-Parallax counter, historical working fix and final source | 2 | 2 |
| Existing selected-move and Workshop-1 baseline presets, two viewports | 4 | 4 |
| Actual Assigned Workshop / Kestrel chassis | 1 | 1 |

- [Main contact sheet](../design/phase2/combat/contact-sheet.html) links the actual-command images and filmstrips.
- [Natural fault supplement](../design/phase2/fault-mix/contact-sheet.html) records original dispatches after a real rail attack, without forcing a random branch.
- [Actual counter](../design/phase2/counter-regression/contact-sheet.html) distinguishes the historical working source from [the final committed-source frame](../design/phase2/counter-regression/final-source/manifest.json).
- [Baseline comparisons](../design/phase2/matched-presets/contact-sheet.html) copy existing reviewed Phase 0 images; no baseline is recaptured.
- [Assigned Workshop](../design/phase2/ui-preview/contact-sheet.html) shows the larger native Kestrel body with its physical rifle preview.

## Source and render scope

The main set contains thirteen images from `6786df4`, 111 from `f68b5df`, and four final tablet Parallax images from `fa9f835` / application tree `edac44e5b054d0e507a409ee039b4400b6420788`. Natural faults retain `f68b5df`; matching presets, the Assigned UI route and the final real counter use the final tree. Historical images are not relabelled as later geometry or minimum-range evidence. Current clearance and campaign acceptance are established separately in the [requirements review](phase2-requirements-review.md).

Forty retained main images omitted unobserved intermediate render-target work. Their saved main-scene meshes and contacts are actual GPU output, but these images do not prove cached UI previews. The other eighty-eight main images preserve native render-target draws/readbacks, as do the final UI and matching-preset captures. Every saved frame restores the native main render at device scale 1. Software WebGL provides correctness evidence, not native-device performance.

All images were encoded as lossless WebP and decoded byte-for-byte against the original PNG RGBA before PNG removal. Raw PNG, WebP and decoded RGBA hashes remain in the manifests. Final offline verification checks the WebP bytes and decoded RGBA hashes again. Filmstrips/contact sheets are derivatives.

## Actual workflows and observations

Catalog and damage fixtures issue real game attacks with unchanged AP, action timing, hit/contact and HP rules. Catalog targets have declared 1000-HP parts to avoid truncating bursts. Death/kneel fixtures retain a live offscreen hostile so ordinary mission completion does not clear the aftermath.

The final counter frame is the actual enemy-phase seed-4264 event 361, Behemoth `ally1` to `enemy1`, immediately after a Piledriver hit reduces **pilot** HP from 55 to 19. It preserves the actual Parallax miss, records zero launch-axis error and uses a real 1194×834 DPR-1 renderer-canvas frame with UI excluded. The older working-fix frame remains explicitly historical; a far initiating player action was not substituted for the automatic counter. Archived source/checker bytes and original event data accompany both frames.

The matching Workshop preset initially shows small comparison thumbnails. Its native render-target guard passes, but that view does not establish a large weapon silhouette. The separate Assigned image uses actual Workshop, Kestrel and Assigned controls, then scrolls the chassis into view. Root inspection confirms a visible rifle held at the hand, plausible body/weapon scale and readable controls. The manifest records the actual frame 1/rifle/Assigned state and native preview pixels. No production code was changed for the image.

Rifle contact, missile travel/smoke/arrival, rail and melee effects are visible in the reviewed sequences. The Aero jumpjet frame separates body/feet from the ground ring. Actual death-age samples near 13.8 and 14.2 seconds show the smoke aftermath; particles may linger after emission stops. Future mortar is the named no-damage presentation hook, not an invented gameplay action.

## Limits retained for review

The shoulder camera crops the actor, may obscure the target or weapon, and brief contact bloom can saturate white. The actual counter frame does not prove the complete body/joint/foot pose; geometry checks supply that evidence. The temporary Aero sprite casts a broad rectangular shadow. Mixed legacy bodies differ in apparent size/style from live rigs. Natural crawl/joint effects can be self-occluded by armor. These composition/adapter limitations are documented for Phase 3; neither static comparisons nor these images imply cross-phase pixel/style parity or complete rig-v2 conversion.

Reproduction tools are `qa/capture-phase2.cjs`, `qa/capture-phase2-matched.cjs` and `qa/summarize-phase2-visuals.cjs`. The formal checker has a bounded actual-counter capture option. The manifests record exact sources, runner hashes, UI steps, viewport dimensions and policies. No restored-state/RNG counter reconstruction is used.
