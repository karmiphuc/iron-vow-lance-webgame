# Salt Works benchmark for Iron Vow

The owner singled out the legs, arms, stances and opposing Garrison. Use those as the quality benchmark. Preserve the silhouette and gait that distinguish a scout, heavy or other frame.

## Inspect the accepted work

Open Workshop → Rig Bench → Salt Works Trial to see both actors together. For reviewers with the private Saltjack archive, `review/Workshop comparison.jpg` shows the reference and result, and `review/Salt Works - Iron Vow.mp4` shows the walk, brace, hit and fall. The workshop reference views appear at 7m32s and 7m08s.

## What to borrow

| Look at | Decision behind the result |
| --- | --- |
| Hip to ground | Flared hip doors overlap narrow femurs. Compact knee castings leave room for the leg to fold. The toe forks and heel extend on either side of the ankle, so the footprint reads in profile. |
| Arms in three-quarter view | Tapered, overlapping forearm splints leave an open channel along the wrist. The rifle arm and free arm have different resting poses. During integration the free hand needed a correction visible in motion. |
| Identifying the opponent | Saltjack and Garrison use the same chassis. The Garrison's olive enamel and red optics read up close. Its two shoulder cassettes change the outline from across the yard and follow the shoulder pivots. |
| Mid-stride | The pelvis shifts toward the planted foot and a two-link leg solve reaches the world-space ankle target. The supporting sole and the body's balance are both visible from the game camera. |

In this repository, compare the runtime adapter in `dist/foundry/rig-v2-saltjack.js` with the gameplay checks in `qa/browser/saltjack-motion.cjs`. With private authoring access, `source/forge.py` shows hull sections, side plates and pivots, and `source/motion.js` shows the pose authoring.

## Campaign field checks

Use the approved stock loadout when comparing a Workshop preview to a deployed unit. An alternate weapon belongs in its own comparison. Saltjack and Garrison carry the Kestrel rifle by default. Check the optic sits above the grip on the very first visible frame for both actors. An occasional high guard can work as an idle pose. At engagement, the muzzle should acquire the target before the shot.

| Chassis | What to look for in the game |
| --- | --- |
| Husky | Black-and-white blocks break up the armor at game scale. The shotgun sits in the right hand. With that arm disabled, confirm the fallback punch and its damage in the combat log. |
| Giza | Check cockpit visibility and pauldron size against the torso. The shoulder cannons travel upright. On Double Cannon, both lower, fire from separate barrels and return upright. The hand rifle holds still through the salvo. |
| Vyzov | The shoulder mortar leaves the right fist free. Trace a mortar launch to the shoulder and a punch to the wrist. Follow the planted foot through a moving step to judge how much the hips sway. |

When a new attack ships with the rig, exercise it against the same target as its closest existing attack. Record the actual HP change, armor and AP cost. Check which weapon fired and, for a stated cap, include a boosted critical. For a limited-use special, cancel once, confirm once, reload, then start a new battle and check the charge. See the first-frame rifle regression in `qa/browser/salt-rifle-roll.cjs`.
