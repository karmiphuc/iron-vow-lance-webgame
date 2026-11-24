# Matching proportions and armor detail

Use this pass when a mech is recognizable but still looks wrong beside its source. Start with the feature the owner keeps noticing. Keep the last accepted view beside the work so a hip correction can be judged against the shoulders, feet and stance they already liked.

## Establish a common view

Match the stance, elbow bend, camera height, rotation and perspective. Align the supporting sole and a stable upper hull landmark, then scale the image uniformly. Use the same landmarks in both images. Exclude a raised weapon from the height measurement when its pose differs. Blink between the aligned images or trace the major edges over both. Stretching one axis, scaling individual crops separately, or aligning on the disputed joint can hide the error.

For a vertical comparison, use height above the common sole divided by the chosen hull height. For a segment, measure the line between its two pivots in the view that shows its length. A length seen end-on is foreshortened. Check another view or use the authored pivot positions to evaluate the sculpt. Label the exact visible edge on each image, including side and panel. If the cockpit crown blends into a mount, try a second plausible edge and see whether the diagnosis changes. Mark a hidden reference pivot as estimated. Compare the mismatch to the uncertainty from pose, perspective and picking a blurry edge before changing geometry.

## Diagnose the part responsible

| Complaint | Landmarks to compare | How to choose the edit |
| --- | --- | --- |
| Hip looks too low or too heavy | In front view, mark the hip axle if visible, top of each thigh, waist opening, bottom of center apron, and knee hinges. Check hip width at the axle and skirt width at its widest point. In profile, trace the hip forward or back relative to the load-bearing ankle. | If the axle and knees sit low, match knee flexion and stance width first. If the same discrepancy persists in a matched stance, inspect hip placement and thigh/shin lengths. If the axle lines up but the apron hangs low, correct its mounting height, drop or flare. Recheck thigh clearance in a loaded step. |
| Forearm looks short, thin or blunt | On the same arm, mark shoulder pivot, elbow hinge, wrist swivel, cuff edge and knuckles. Compare elbow–wrist to shoulder–elbow. Compare shell width just below the elbow, at its widest section and at the cuff. In profile check depth, taper and exposed wrist. | If the hinge-to-hinge span is short in a reliable view, lengthen that segment and move its wrist and hand attachment together. If the pivots match, correct shell coverage, cuff projection or taper. If only the fist ends high, check elbow bend and hand rotation. Retest carrying and aiming with the grip seated. |
| The outline matches but a panel feels generic | Pick a distinctive corner, seam termination, recess or overlap visible on the source. Locate it between two panel edges. Follow its direction, count repeated features and identify which plate sits on top. Check the same feature in three-quarter view. | Match the hosting plate’s planes and bevel first. Model a lip or cutout when it breaks the contour, reveals a joint or casts a visible shadow. A shallow engraved line can live in the surface finish. Restore paint after a plain-shaded comparison, then check the detail at its intended viewing size. |

For the close-detail pass, crop the same region on both views at the same enlargement. Describe a feature by its location, direction and end point, such as a stepped seam meeting the outer cuff band. An empty strip between two plates can be just as distinctive as a row of fasteners. Check the small shapes the owner can see in the Workshop as well as the shapes that survive the battle camera.

For an uncertain change, isolate one cause in a temporary pose or mesh version. Repeat the original view at the original scale. Keep the edit when its intended landmarks move closer and an approved neighboring landmark still holds. Bring back the marked before/after view with the two readings and a close crop of the repaired detail. If the difference survives only in a low-resolution or partly hidden area, identify it as unresolved in the review.

## Worked example from Husky

The archived pair is identified by the image digests in the [Husky contract](../examples/husky-front.contract.json) and [candidate observation](../examples/husky-front.candidate.json). Use the arm on the viewer’s right. The cuff landmark is the lower edge of the rigid shell above the wrist. The apron landmark is the bottom of the narrow center plate between the thighs. Black camo and cast shadows can otherwise look like plate edges.

| Projected front-view landmark | Reference | Sculpt |
| --- | ---: | ---: |
| Top and sole, image rows from top | 43 and 605 | 111 and 845 |
| Cuff lower edge, approximate row | 321 | 469 |
| Apron bottom, approximate row | 378 | 589 |
| Cuff height above sole / subject height | 51% | 51% |
| Apron height above sole / subject height | 40% | 35% |
| Vertical gap between cuff and apron / subject height | 10% | 16% |

Both cuff point estimates land at nearly the same relative height. With the recorded pixel uncertainty, the example checker leaves the cuff elevation in REVIEW. Most of the extra gap opens at the apron end. Inspect the apron attachment and depth, then measure the elbow–wrist span independently. This view alone cannot locate the covered hip axle. The figures describe these two renders and are rounded independently.

The same crop provides a small-detail check. The reference apron ends in a recessed pocket with three visible marks. There is an upright slot at the left, and a round mark above a horizontal slot at the right. On the sculpt, a single round mark occupies the lower tab. In a [scripted comparison](running-checks.md), audit each shape separately. An artist can correct the pocket, count and spacing while preserving the surrounding silhouette. On the forearm, follow the stepped seam down to the cuff band and inspect the outer-side circular housing in profile. Check that these features still read under the approved black-and-white coat.
