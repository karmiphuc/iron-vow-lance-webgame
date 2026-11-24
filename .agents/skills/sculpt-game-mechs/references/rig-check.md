# Check a posed object's joint spans and shell drop

Run [check_rig.py](../scripts/check_rig.py) on a Z-up Blender rig with named joint objects. The [Husky fixture](../examples/husky-rig.json) locks the supplied source at frame 1. Its two sides have independent targets. The routine suite generates an original rig and runs all seven cases without private files. To replay the archived Husky measurements, place the authorized `Husky.blend` in the ignored `examples/private/` directory. Run the examples below from the skill directory with Blender on PATH.

```sh
blender --background --factory-startup --disable-autoexec \
  examples/private/Husky.blend --python-exit-code 1 \
  --python scripts/check_rig.py -- examples/husky-rig.json examples/private/husky-geometry-report.json \
  --contract-sha256 f19e858712e6e3392cf54a6766446ec4ce4ddedb550af6cf9581db58c716d0b5 \
  --asset-sha256 a017246bab6d73dab773119c196ce205e6b0b596e7e8dec9e37939c14a47ccbc
```

Both pins are optional. Keep the approved contract pin when testing a revision. Supply that candidate's independently recorded file digest for the asset pin. The report records the exact file digests as `contract_sha256` and `asset_sha256`. The latter covers the on-disk blend file. Linked resources and unsaved in-memory edits fall outside it.

Use a fresh report path for each candidate. A completed geometry run writes the source path, frame, pivot coordinates, mesh minima, measured ratios, targets, tolerances and status. Read both the current process exit code and its report. A stale pin, missing joint, missing scene, render-disabled armor object or invalid target gives `unknown`. Both `unknown` and a numerical `fail` exit nonzero with the invocation above. Choosing either input or an alias as the output stops the process before any report is written. A Blender startup or output-write failure may also produce no report.

## Choose the lock

Map the named object origins to actual joint centers and the shell names to the intended meshes. When checking multiple sides, each side needs its own limb pivots and forearm shell. Both sides can share the central pelvis and pelvis shell. Check the resolved names under each side in the report when setting up a new rig. The fixture uses evaluated world transforms and deformed mesh vertices from the active scene at the configured integer frame. Match the action, stance and Z-up orientation when authoring a new fixture. For bone rigs, expose named objects at the evaluated pivots or adapt the reader to obtain the bone head or tail used as the hinge.

Each target pair contains two finite JSON numbers for the expected ratio and its absolute tolerance. Freeze them from an independently accepted pose, design dimensions or a clearly labeled historical baseline. Alter targets only when the design or review decision changes. The Husky sample allows ±0.01 in each dimensionless ratio to demonstrate regression detection. Its source hash identifies the starting model. Agreement with that model cannot establish likeness to concept art.

| Measurement | Geometry evaluated on each side |
| --- | --- |
| Forearm / upper arm | 3D elbow–wrist distance divided by 3D shoulder–elbow distance |
| Thigh / shin | 3D hip–knee distance divided by 3D knee–ankle distance |
| Pelvis height and hip height over ankle | Each origin's vertical distance above the ankle divided by the combined 3D thigh and shin lengths |
| Forearm shell drop | Elbow height minus the lowest evaluated face vertex of the elbow assembly, divided by elbow–wrist distance |
| Pelvis shell drop | Pelvis height minus the lowest evaluated face vertex of the pelvis assembly, divided by combined thigh and shin lengths |

The ratios are translation-invariant. A whole rig lifted one unit still passes. Test groundedness separately by measuring the supporting sole relative to the ground plane at contact frames. The floor uses vertices referenced by evaluated mesh faces. A loose vertex can sit well below the visible plate or survive where the old apron ended. The checker ignores those vertices and requires the named armor mesh to have faces and its object render flag enabled. Collection visibility, camera occlusion, materials and render-specific modifiers still need a rendered frame. The lowest face vertex belongs to the entire named assembly. A cuff or apron needs a more precise landmark when another plate hangs below it. Compare independently annotated views for width, taper, small openings and seam counts. Recesses can change while every ratio stays inside its tolerance.

## Reproduce the failure checks

For each case, insert its snippet immediately before `--python scripts/check_rig.py` in the command above and choose a separate report path. Each invocation opens the source afresh and makes its change in memory. The source file is never saved.

| In-memory change | Observed result with the Husky fixture |
| --- | --- |
| No change | 12 passes, exit 0 |
| `--python-expr 'import bpy; bpy.data.objects["Wrist_L"].delta_location.z += 0.3'` | Left forearm / upper arm falls from 1.167426 to 0.853058. Forearm shell drop / forearm also fails. Exit 1. |
| `--python-expr 'import bpy; bpy.data.objects["Hip_R"].delta_location.z -= 0.25'` | Right pelvis height above ankle / leg rises from 0.934256 to 1.020761 because the ankle follows its hip parent. Exit 1. |
| `--python-expr 'import bpy; bpy.data.objects["Pelvis assembly"].delta_location.z -= 0.25'` | Pelvis shell drop / leg rises from 0.418685 to 0.505190 on both sides. Joint-span checks pass. Exit 1. |
| `--python-expr 'import bpy; bpy.data.objects["Knee_L"].name = "Unavailable"'` | Missing left knee gives `unknown`. Exit 1. |

## Repeat the Husky regression suite

```sh
blender --background --factory-startup --disable-autoexec examples/private/Husky.blend --python-exit-code 1 --python scripts/test_rig.py
```

Seven tests start from the same pinned archive. They include a shortened right forearm, overlapping side mappings and malformed tolerances. The unchanged rig and a loose vertex below the shell must pass. Raising the apron with a loose vertex at its old floor must fail both pelvis-shell ratios. Disabling the required left forearm shell for rendering must invalidate the measurement. Each mutation lives only in the background Blender process.
