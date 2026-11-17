# Phase 3 asset export gate

Issue #13 starts with Gatecrasher. Gatecrasher R2, Cicada, Reaver, Gravemaw, Aero, both Line Infantry variants, the Lion trial, the tank and the gunship use live meshes.

The legacy Prototype Bay Gatecrasher draws 162,386 triangles. The new `dist/rig-bench/rig-v2/gatecrasher-r2-reference.glb` draws 54,252 triangles with the integral cannon, Arc Cleaver and Vesper pod. It is separate from the Prototype Bay model because that viewer requires its authored motion clips. The reference is equipped as one file, so no extra weapon GLB is passed to the gate for this configuration.

The exported `socket.L` and `mount.shoulderR` subtrees contain 1,040 and 3,330 triangles respectively, leaving 49,882 for the chassis and integral cannon. The browser gate exercised every distinct equipment combination with the production shield mounts. The heaviest configuration draws 56,608 triangles with the authored Vesper pod and Citadel shield. The shield and cleaver occupy the same slot.

`tools/export_gatecrasher_v2.py` exposes `export_gatecrasher(source, output)` for Blender MCP. Use the private `local-armed-r2/iron-vow-gatecrasher-r2.blend` source whose SHA-256 is `7ada236a0ab73c11111c2ce5f869822faf6ea201aadbe3c0e5cd386e24e3353f`. The script appends an isolated scene, simplifies the dense rigid assemblies, exports the named rig and paint materials with meshopt, and restores the previous scene. Its gait values are starting points for runtime tuning and the export is a rest pose with no authored overlay clips.

See the [Phase 3 evidence](../design/phase3/README.md) for the Chromium rig and loadout checks. The browser gate also checks shield grip alignment and shield disappearance after left-arm loss.

The sortie loads Gatecrasher's meshopt GLB on demand. A normalized joint hierarchy feeds the existing Foundry animator and transfers its pose to the authored skin. The two Morrow barrels, optional Vesper rack, cleaver tip and shield use the exported anchors. Vesper remains usable after right-arm loss because it draws from the body subsystem. Gatecrasher keeps the authored paint textures and the battle scene releases its geometry on sortie exit.

`tools/export_cicada_v2.py` exposes `export_cicada(source, output)` for Blender MCP. The input is the recovered `native-mask-source/cicada.blend`, SHA-256 `80e31189e9e072cc2c9c06514c3223a7f9dbd38a2770898896a1b1db21957023`. The meshopt export retains both integrated Locust racks and the Pulse Bash housing, with 49,978 triangles in the factory loadout. The isolated export restored the active scene and the input hash matched after export.

`tools/export_infantry_v2.py` exposes `export_infantry(source, output)` for Blender MCP. Use `Line-Infantry/R32/Line-Infantry-R32-Service.blend` (SHA-256 `66b8429c8a9634b5ab0aa02cb5d0d50cd9ce958d04661481d51b91b9b5beab38`) and `Line-Infantry/Elite/E7/Line-Infantry-Elite.blend` (SHA-256 `4523fb0470d0a297527a332a0590384adabd8a18b66e88e235e254e7091a317e`). Each export retains the right carbine and muzzle. Batching joins the pieces on the same bone only when their damage part and detach flag match. Source hashes and the active Blender scene were verified after both exports.

Cicada uses independent Locust rack pivots and the authored left Pulse Bash emitter. LI-01 and LI-02 use the same animator with their own authored carbine mounts and two-hand carry. The battle loads each rig when needed and releases its asset on exit.

`tools/export_reaver_v2.py` exposes `export_reaver(source, output)` for Blender MCP. Use `Reaver-Clay/R14/Reaver-R14-Hostile.blend` with SHA-256 `ac07e34e86d052805395f8a4ea714f1364bddf204948228bbbc67af96bebdfa2`. The 16,340-triangle export contains both factory autocannons. The untouched input hash and restored Blender scene were verified. The shared gait solver uses each leg's measured length and authored stance. The existing three-beat attack alternates right, left, right when both arms are intact. With the left arm lost it uses the right cannon for all three beats. Right-arm loss retains the existing firing lock. Damage and AP rules stay in the game.

`tools/export_vanguard_v2.py` exposes `export_vanguard(source, output)` for Blender MCP. Use `Vanguard-Brawler/R10/Vanguard-Brawler-R10-Rigged.blend` with SHA-256 `a68aadaac114b3bfe7bf61ce6deb8ef4fd9800bf99eb3ccbec079361a104b310`. Gravemaw's 20,158-triangle factory rig retains Hailstorm's six-barrel rotor and the Piledriver's translating auger and strike tip.

`tools/export_aero_v2.py` exposes `export_aero(source, output)` for Blender MCP. Use `IronVow-Aero-Melee/Skirmisher-Aero-R10-Melee.blend` with SHA-256 `d80d6c9088622251b5124b032dd2372a3f3e66411bbf9a15d3c3861f557ee159`. The 52,798-triangle file includes the Kestrel carbine and all four Relay melee groups. The sortie shows only the equipped weapons. The gate checks the production arsenal's legal slot combinations. Hailstorm and the Citadel shield form the heaviest loadout at 59,592 triangles. Jumpjet plumes use both authored exhaust anchors, and successful dodges use the game's existing hit result.

`tools/export_lion_v2.py` exposes `export_lion(source, output)` for Blender MCP. Use `Lion-Clay/Extended-Follow-Through/Lion-Rigged.blend` with SHA-256 `f58a636c677f1b78bac248ddf8280df737d7d9d4db21df5e11792a4e2e9e268a`, which matches the approved bake fixture. The 58,753-triangle GLB contains separate left-hand Cleaver, Hatchet and Breaker meshes, their authored tips and three 32-frame strike clips. The trial moves the practice target's rendered position within its tile to give the weapons reach. Its pick proxy, markers and damage effects follow the rendered position. The source file hash matched after export.

`tools/render_vehicles.py` exposes `export_vehicle_motion(output)` for Blender MCP. It builds the procedural Javelin tank and Kite gunship in a temporary scene with body and muzzle anchors. Each GLB batches the original motion geometry by material. The sortie loads the models it needs and releases the shared geometry on exit. The existing sprites cover failed loads, and the offline package embeds both GLBs.

Run the checkpoint using the local QA dependencies.

```sh
node qa/gate-phase3.cjs --out /tmp/iron-vow-phase3
```

After export, run `node qa/check-rig-v2.cjs path/to/chassis.glb path/to/mounted-weapon.glb ...` for each actual equipped configuration. Arguments after the chassis must contain only the weapon geometry actually mounted; library GLBs holding multiple unused weapons overcount. The tool counts mesh instances in the default scene, includes supplied weapons, checks exact names, limb hierarchy, dimensions' presence, paint material names, part tags, and meshopt extension declaration. It exits 1 for contract failures and 2 for unreadable or unsupported input. `node qa/check-rig-v2-test.cjs` verifies instance and equipment accounting and failure reporting.

A passing static gate is necessary, not sufficient: review dimension values and units, socket/muzzle placement and required optional mounts, emissive materials, plate selection, compression contents, rig deformation, visual quality and planted-foot behavior in the runtime. Check every legal loadout against the 60,000-triangle limit. Commit each GLB with its Blender MCP export script as #13 requires; regenerate the full renderer inventory and run the scene anomaly and visual gates before removing any adapter.


Static gate updates, 12 November 2026 Singapore time: required rig nodes must be reachable from the actual default scene, and that scene must contain mesh geometry. Name lookup and duplicate detection use that same reachable set, so an inactive scene cannot supply missing bones or falsely reject a valid rig by reusing names. Fixtures reproduce the former orphaned-rig acceptance and inactive-name rejection and verify the corrected behavior. Sibling geometry/skeleton scenes remain supported. These checks do not claim any model conversion or certify deformation.
