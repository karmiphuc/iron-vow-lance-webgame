# Automatic hit locations and target UX

Reviewed Claude PR #33 against the current main branch. The application tree in `summary.json` identifies the tested build. The remaining commit adds QA assertions and this compact evidence.

The target panel shows subsystem health as readouts. Selecting a hostile from Move switches to Fire while preserving the battlefield. The next tap fires. Touch details open through the target toggle. The three WebP captures show desktop details, collapsed touch details, and expanded touch details.

## Verification

All 62 simulation suites passed. The 44 browser scenarios passed on desktop and touch, giving 88 passing checks after focused War and health-style reruns. The combined campaign passed 30 unique seeds, 167,778 actual-bone ticks, all 21 observed live chassis, 24 Workshop weapon assignments and both shields. Each of the four disjoint batches verified all 16 negative controls. Software rendering supplied behavioral and geometry evidence. Native iPad measurements remain unverified.

## Regression fixes

- The merge retained the Star Map, travel costs, wages, upkeep and saved-career handling from main.
- The career bot failed sortie five while ranking damaged arms it could no longer aim at. It now prioritizes body HP and buys the Trident burst weapon. The existing five-sortie victory assertions and win thresholds pass.
- War expected Picket to finish in two rounds and skipped animation frames during clock advancement. It now checks the three-round result with chronological frame advancement and strict VM/browser parity.
- Seed 4249 stalled with the last surviving mech immobilized outside enemy range. The campaign bot now uses the existing withdrawal controls when a fresh turn offers neither mobility nor attacks. The extraction helper has regression assertions.
- The combiner rejected optional live Citadel observations. It now requires every Phase 3 frame and validates additional observations against the live catalog. Fixtures verify optional acceptance and rejection of missing required frames.
- The original PR CSS repeated the combat-panel ancestor, hiding destroyed-part backgrounds. The maintained browser assertion reproduces the failure with that stylesheet and passes with the corrected selector.

## Review findings

The automated five-sortie career sample completed the full ladder in 3 of 24 seeds. Three seeds reached the bot's 30-round limit. This sample uses the current body-priority and Trident/Watchman policy. It leaves campaign balance as a follow-up concern.

Seed 4264 recorded four negative-travel samples in the close-range Parallax aim-clearance diagnostic. The actual launch-angle observer passed. The summary records the clearance counts and minimum travel for follow-up.
