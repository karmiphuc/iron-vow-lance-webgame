# Phase 2 requirements review

The production runtime is `fa9f835`, application tree `edac44e5b054d0e507a409ee039b4400b6420788`. Phase 1 is merged in #18. Claude’s merged #19 effects and #20 corrected gait remain the reference baseline; the author’s 150-battle evidence is accepted, with the focused reference verification preserved separately.

## Final runtime verification

- [Thirty distinct campaign battles](../design/phase2/qa/campaign-final-30.json) passed 123,420 actual-bone ticks with zero anomalies/errors. Four disjoint batches use the same immutable application/checker, cover all eight live rigs and detect all sixteen intentional faults in each batch. They record 4,238 launch and 4,371 impact hooks; maximum physical launch error is 2.58e-8 radians.
- [Current weapon coverage](../design/phase2/qa/current-weapon-coverage.json) separates assignment from execution: the campaign commands eighteen Workshop IDs, and six targeted melee fixtures execute the remaining six. All twenty-four Workshop entries therefore execute on the final tree. The targeted run also passes existing shield/counter/lockout, damage, jumpjet, no-damage mortar, staged wreck/smoke and dynamic reduced-motion checks.
- [Actual GPU context restoration](../design/phase2/qa/context-restore.json) passes with a framebuffer redraw and unchanged checkpoint. Its existing shared-scene case also exercises picking, camera controls, a real attack/Skip and the legacy 10×10 sortie. Repeated campaign sorties exercise teardown/rebuild independently.
- [Clearance evidence](../design/phase2/qa/clearance-evidence-manifest.json) covers 423 tested legal part/miss/shield endpoints and ninety weighted poses. Grip transforms, joint lengths and planted ankles remain intact. Conservative armor-box corners and incompatible loadouts are diagnostics, not accepted launch endpoints.

The final candidate retains springs, gait, settling, authored carry/fire/melee data, target-part aim, directional contacts, damage materials/plates, electrical faults, staged destruction, fourteen-second smoke, shields, counters and reduced-motion behavior. The [34-entry mapping](phase2-weapon-mapping.md) documents each archetype/alias and timing compatibility: logical rounds, AP, damage, audio and action profiles remain unchanged; landed melee hitstop is .085 seconds. Reduced motion keeps 3D and aim while suppressing shake, zoom and hitstop.

## Regressions corrected

The airborne fix in `9af2015` makes actual ankles follow the raised chassis and settle onto terrain; positive fixtures measure ankles rather than root height alone. The pooled-missile endpoint owns its vector, preventing smoke emission from corrupting arrival coordinates.

The stricter actual-launch observer exposed wrist/muzzle-offset oscillation. `f68b5df` replaces iterative axis-only aiming with a geometric solution. A later automatic Parallax counter after a Piledriver pilot hit exposed a target inside the barrel’s wrist radius. The final fix adds connected, continuously weighted spine/shoulder clearance. The owner-authorized horizontal pitch is 7.4 m, compared with Phase 1’s 6.8 m; .9 chassis scale and 3.4 m terrain scale remain. The 7.2 m study still failed a legal shield endpoint. Actual-launch tolerance remains .12 radians; it was not widened.

Observer corrections separately distinguish intentional folded-leg targets from active walking IK and recovery frames from actual firing. Negative controls physically corrupt the real barrel/rig/state rather than fabricate events. Final seed 4264 and its actual counter image preserve the real incoming **pilot** HP transition 55→19 and Parallax miss; a far initiating player action is not presented as that counter.

## Historical evidence and visual scope

[Action evidence](../design/phase2/qa/action-evidence-manifest.json) preserves full 34-entry desktop and touch/reduced runs on `6786df4`, with 137 landed contacts per mode; five representative commands per mode and strengthened specials subsequently passed on `9af2015`. [Forty-eight pure suites](../design/phase2/qa/simulation-evidence-manifest.json) passed on `f68b5df`. Those results retain their original identities; they are not relabelled as reruns of the later clearance source. The later changes have the targeted geometry, current-command, campaign and GPU restoration checks above.

The [visual review](phase2-visual-review.md) and per-image manifests identify historical and final-source cases, natural fault dispatches, the actual counter, and matching baseline presets. Earlier captures that omitted unobserved render-target work support main-scene geometry/contact observations only; they do not prove UI previews. Final matching Workshop evidence preserves native render-target rendering/readbacks. Static presets do not replace actual-command evidence or imply pixel/style parity across renderer phases.

## Remaining boundaries

Temporary native body art/adapters and their composition/shadow limitations remain until Phase 3; the old `roster-destruction.js` path is retained only for those frames. The removed 2D combat helpers are replaced by the shared scene; floating text remains an overlay. Behemoth mortar is explicitly future presentation with an actual muzzle cue and unchanged HP, not a newly added damage rule.

Native iPad metrics remain untested and owner-approved nonblocking. Phase 3 requires the specified Blender MCP and missing authoring sources. This review does not claim converted assets, a production Phase 4 hangar, or a Site publication.
