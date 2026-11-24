---
name: sculpt-game-mechs
description: Build or revise articulated hard-surface mech models for games. Use for reference-matched silhouettes, hip and forearm proportions, armor panel details, grounded walking stances, and visual review of Blender or exported game rigs. Includes the Saltjack and Garrison benchmark for Iron Vow.
---

# Sculpt game mechs

For Iron Vow, start with the [Salt Works benchmark](references/salt-works.md). For campaign loadouts and mounted weapons, see the [Iron Vow field checks](references/salt-works.md#campaign-field-checks). For another game, use its own art direction, camera, and best accepted model. Size the work to the request. A still sculpt can be checked with temporary poses. A walk-cycle revision can start from the accepted mesh.

## Run the reusable checks

From the Iron Vow repository root, run `python3 .agents/skills/sculpt-game-mechs/scripts/run_checks.py`. In a standalone copy, run `python3 scripts/run_checks.py` from the skill directory. Use Python 3.9+, FFmpeg and Blender with Python 3.11+ on PATH. Set `BLENDER_BIN` to the executable when Blender is installed elsewhere. The suites generate annotated images and a two-sided rig locally. To check an actual sculpt, use the [image review instructions](references/running-checks.md) and [rig contract](references/rig-check.md). Both include optional Husky archive replays.

## Read the reference in the working pose

Open the actual reference and current model. Pick the view that best reveals the requested quality. Match camera height, angle, subject size and pose before judging proportions. Use a second angle to resolve depth and parts hidden by the near arm. When revising a model, keep a before frame and identify what the user already likes. Carry those features through the next pass.

For a likeness pass, use the [proportion and armor-detail guide](references/proportion-review.md). When a proportion is disputed or another agent will verify the revision, follow the [scripted review and handoff](references/running-checks.md). Freeze the reference and tolerances before evaluating the candidate. For an asymmetric mech, lock a signed left–right landmark in the matched view. For disputed fasteners or slots, have two readers mark each center on the clean render and resolve any disagreement over which plate carries it. For repeat revisions, [measure the Blender pivots](references/rig-check.md) alongside the rendered shell. Match the reference stance and camera, align the two views at a common scale, and mark the joint centers and shell edges separately. For each disputed proportion, record the reference, the sculpt and the direction of the difference. Correct the part responsible, render again from the same camera, and check an angle that could disprove the fix. The guide includes a measured Husky example where lengthening the arm would address the wrong end of a gap.

Read the small cockpit between the shoulders, the shape of the space around the waist and elbows, and the toe and heel in profile at player scale. Then compare the identity-bearing panel edges, recesses and overlaps in a close crop. Bring the before/after comparison and any unresolved detail to review. Treat a resemblance percentage as the user’s judgment unless a measurement was agreed. When the user wants one frame approved at a time, show that frame before starting the next.

## Shape the machine around its joints

- Block the head, cockpit, shoulders, pelvis, limbs and feet in the ready stance. Put the hip, knee, ankle, shoulder, elbow and wrist pivots where the parts appear to turn. Move them through a loaded pose while the forms are still cheap to change.
- Construct distinctive outlines in profile as well as from the front. Use tapered, offset sections and shaped side plates where the reference changes width or depth. Give overlapping armor a visible edge, attachment and clearance. Keep the joint recognizable when its covers close.
- Trace the weight from cockpit through pelvis and supporting leg to the sole. Check the foot contact from the side. Pose each arm around its own job. Inspect the thumb side, palm and elbow from the reverse angle, including the free hand. A convincing grip can hide an inverted opposite wrist.
- Add broad paint divisions once the silhouette reads in plain shading. Separate moving structure from shell with value and material changes. Place wear where parts meet or edges rub. Recheck at game size before spending time on fasteners or decals.

## Test the pose in motion when relevant

For a walk, mark a foothold on the ground. Follow the supporting sole relative to that mark through consecutive frames as the pelvis travels over it and the opposite foot swings through. Inspect both sides at contact, mid-stance and lift-off, then play at normal speed. Sliding with a planted-looking knee points to the contact solve or root travel. A locked foot with a snapping knee points to reach, pelvis height or bend direction. Also watch at travel speed from the front. If planted feet hold but the mech still looks like it is dancing, compare hip sway, shoulder roll and step width to its line of travel.

For a combat rig, read each action from the gameplay camera. Bracing should visibly transfer load into the legs before the shot. Distinguish the firing mechanism's short recoil from the receiver's impact and recovery. For a fall, follow which leg gives way, where the other foot catches or drags, and which armor plate first meets the ground. Scrub past impact to catch knees snapping straight or both legs returning to the standing pose. Drive reactions from the game's actual events when integrating into a game.

## Review the delivered asset

Render the current pass beside the target at matched framing, then inspect it at player scale. For an integrated model, load the shipped asset through the normal game path. Capture the first visible frame on deployment and reload for both sides. On a held gun, compare the optic, grip and muzzle from the side to catch a barrel pointing forward with the whole weapon rolled upside down. Play idle → aim → fire → recovery at normal speed. Watch for lost rest transforms, reversed hands, detached fittings and foot drift. Repair the largest visible discrepancy and repeat the same shot so the change can be judged. Own this loop before asking for another art-direction decision.

Show the comparison or short clip that supports the result. Distinguish what was checked in Blender from what was seen in the game, and name any visible compromise. Passing rig tests establishes that the joints function. Aesthetic acceptance rests on the rendered result and the user's judgment.
