"""Build the game rig and review renders from the approved Raven-Clay-R3 blend."""

import argparse
import json
import sys
from math import cos, degrees, radians, sin
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


HERE = Path(__file__).resolve().parent
SOURCE = next((folder / "Raven-Clay-R3" / "Raven.blend" for folder in HERE.parents
               if (folder / "Raven-Clay-R3" / "Raven.blend").is_file()), None)
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE))
from raven_motion import CLIPS, FPS, HIP_RISE, SIDES, STRIDE, bake_actions, r3_leg, rest_leg, sample


MATERIALS = ("paint_primary", "paint_secondary", "frame", "recess", "steel", "paint_accent", "visor")
PARTS = ("body", "pilot", "left", "right", "legs")
GROUND = .03  # R3 toe cleats: center z=.075, height=.09.
TORSO_TOP = 5.57954  # Top of the R3 wraparound collar, below the optical hood.
TORSO_SHAPE = Matrix.Diagonal((.88, 1, .85, 1))
TORSO_SHAPE.translation.z = TORSO_TOP * .15
REAR_KNEE_LINKAGE = ("Rear knee ", "Knee carriage sliding pin", "Knee eye flange")


def arm_shift(side):
    mount = Vector((side * 1.78, .075, 4.89))
    return TORSO_SHAPE @ mount - mount


def shield_shift(side):
    # The hinged wings follow the inboard trunnions while retaining the crown line.
    return Vector((-side * 1.20 * .12, 0, 0))


def make_rig():
    scene = bpy.context.scene
    data = bpy.data.armatures.new("Raven rigid articulation")
    rig = bpy.data.objects.new("Raven Rig", data)
    scene.collection.objects.link(rig)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.show_in_front = True
    data.display_type = "STICK"
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name, head, tail, parent=None, deform=True):
        item = data.edit_bones.new(name)
        item.head, item.tail = head, tail
        if parent:
            item.parent = data.edit_bones[parent]
        item.use_deform = deform

    def socket(name, head, direction, parent):
        bone(name, head, Vector(head) + Vector(direction).normalized() * .25, parent, False)

    bone("Root", (0, 0, GROUND), (0, 0, .55), deform=False)
    torso_base = TORSO_SHAPE @ Vector((0, .08, 3.63))
    bone("Pelvis", (0, .11, 3.30 + HIP_RISE), (0, .11, torso_base.z), "Root")
    bone("Torso", torso_base, TORSO_SHAPE @ Vector((0, .08, 5.02)), "Pelvis")
    bone("Optics", (0, .155, 5.29), (0, -.24, 5.36), "Torso")
    for label, side in SIDES.items():
        hip, knee, ankle = rest_leg(side)
        wing = shield_shift(side)
        shoulder = Vector((side * 1.20, .06, 5.02)) + wing
        gimbal = Vector((side * 2.10, .066, 5.62)) + wing
        shift = arm_shift(side)
        arm = Vector((side * 1.78, .075, 4.89)) + shift
        elbow = Vector((side * 2.16, -.022, 3.97))
        bend = Matrix.Translation(elbow) @ Matrix.Rotation(-.22, 4, "X") @ Matrix.Translation(-elbow)
        wrist = bend @ Vector((side * 2.58, -.28, 2.50))
        hand_axis = (wrist - elbow).normalized()
        bone(f"Shoulder.{label}", shoulder, Vector((side * 1.88, .06, 5.06)) + wing, "Torso")
        bone(f"Shield.{label}", gimbal, Vector((side * 2.10, .405, 5.62)) + wing, f"Shoulder.{label}")
        socket(f"ShieldFace.{label}", Vector((side * 2.79, -.52, 5.40)) + wing, (0, -1, 0), f"Shield.{label}")
        bone(f"Arm.{label}", arm, elbow + shift, "Torso")
        bone(f"Elbow.{label}", elbow + shift, wrist + shift, f"Arm.{label}")
        bone(f"Hand.{label}", wrist + shift, wrist + shift + hand_axis * .38, f"Elbow.{label}")
        socket(f"Grip.{label}", bend @ Vector((side * 2.47, -.34, 2.22)) + shift, hand_axis, f"Hand.{label}")
        if label == "R":
            socket("Muzzle.R", bend @ Vector((-2.48, -.32, 2.04)) + shift, hand_axis, "Hand.R")
        else:
            socket("ClampTip.L", bend @ Vector((2.65, -.42, 1.24)) + shift, (0, 0, -1), "Hand.L")
        bone(f"Hip.{label}", hip, knee, "Pelvis")
        bone(f"Knee.{label}", knee, ankle, f"Hip.{label}")
        bone(f"Patella.{label}", knee, knee + Vector((0, -.42, 0)), f"Hip.{label}")
        toe_forward = Vector((side * sin(radians(42)), -cos(radians(42)), 0))
        toe_axis = Vector((cos(radians(42)), side * sin(radians(42)), 0))
        bone(f"Foot.{label}", ankle, ankle + toe_forward * .96, f"Knee.{label}")
        for index, (u, v) in enumerate(((-.46, .51), (.46, .50)), 1):
            pivot = Vector((ankle.x, ankle.y, .32)) + side * u * toe_axis + v * toe_forward
            bone(f"Toe{index}.{label}", pivot, pivot + toe_forward * .63, f"Foot.{label}")
    bpy.ops.object.mode_set(mode="OBJECT")
    for item in rig.pose.bones:
        item.rotation_mode = "QUATERNION"
    rig["forward"] = "-Y in Blender, +Z in glTF"
    rig["walk_stride_per_step"] = STRIDE
    rig["fire_cue"] = .37
    return rig


def source_bindings():
    def index(objects, prefix):
        return next(i for i, obj in enumerate(objects) if obj.name.startswith(prefix))

    assignments = {}
    for collection in bpy.context.scene.collection.children:
        name = collection.name
        objects = list(collection.objects)
        if name.startswith("01 |"):
            for obj in objects:
                assignments[obj] = ("Torso" if obj.name.startswith(("Lumbar ", "Spinal core")) else "Pelvis", "body")
        elif name.startswith(("02 |", "03 |", "04 |")):
            owner, part = ("Optics", "pilot") if name.startswith("04 |") else ("Torso", "body")
            assignments.update((obj, (owner, part)) for obj in objects)
        elif "Arm and end effector" in name:
            label = name[0]
            arm = index(objects, "Gauntlet counter-rotating shell")
            hand = index(objects, "Clamp swivel" if label == "L" else "Fist palm")
            for start, end, owner in ((0, arm, "Arm"), (arm, hand, "Elbow"), (hand, len(objects), "Hand")):
                assignments.update((obj, (f"{owner}.{label}", "left" if label == "L" else "right"))
                                   for obj in objects[start:end])
        elif "Load-bearing leg" in name:
            label = name[0]
            upper = index(objects, "Rear knee upper hinge")
            lower = index(objects, "Tibial chassis")
            ankle = index(objects, "Exposed dark ankle strut")
            groups = ((0, upper, "Hip"), (upper, lower, "Patella"), (lower, ankle, "Knee"),
                      (ankle, len(objects), "Foot"))
            for start, end, owner in groups:
                assignments.update((obj, (f"{owner}.{label}", "legs")) for obj in objects[start:end])
            for obj in objects[upper:lower]:
                if obj.name.startswith(REAR_KNEE_LINKAGE):
                    assignments[obj] = (f"Knee.{label}", "legs")
            for digit in (1, 2):
                start = index(objects, f"Articulated talon {digit}")
                for offset in (0, 4, 5, 6, 7):
                    obj = objects[start + offset]
                    assert obj.name.startswith(("Articulated talon", "Toe nose seam", "Toe sole cleat")), obj.name
                    assignments[obj] = (f"Toe{digit}.{label}", "legs")
        elif "Wing shield and shoulder yoke" in name:
            label = "L" if name.startswith("Port") else "R"
            fold = index(objects, "Recessed structural wing box")
            for i, obj in enumerate(objects):
                owner = "Shoulder" if i < fold else "Shield"
                assignments[obj] = (f"{owner}.{label}", "left" if label == "L" else "right")
    missing = {obj.name for obj in bpy.context.scene.objects if obj.type == "MESH"
               and obj not in assignments and not any(c.name == "Studio" for c in obj.users_collection)}
    assert not missing, f"Unbound source parts: {missing}"
    assert assignments
    return assignments


def fit_link(start, end, posed_start, posed_end):
    source = end - start
    target = posed_end - posed_start
    # Stretch along the load axis so fitted plates, rods, and fasteners share their mounts.
    axis = source.normalized()
    extension = target.length / source.length - 1
    stretch = Matrix.Identity(4)
    for row in range(3):
        for column in range(3):
            stretch[row][column] += extension * axis[row] * axis[column]
    rotate = source.rotation_difference(target).to_matrix().to_4x4()
    return Matrix.Translation(posed_start) @ rotate @ stretch @ Matrix.Translation(-start)


def shape_transforms():
    shapes = {"Torso": TORSO_SHAPE, "Pelvis": Matrix.Translation((0, 0, HIP_RISE))}
    for label, side in SIDES.items():
        old_hip, old_knee, ankle = r3_leg(side)
        hip, knee, _ = rest_leg(side)
        shapes.update({f"{owner}.{label}": Matrix.Translation(arm_shift(side))
                       for owner in ("Arm", "Elbow", "Hand")})
        shapes.update({f"{owner}.{label}": Matrix.Translation(shield_shift(side))
                       for owner in ("Shoulder", "Shield")})
        shapes[f"Hip.{label}"] = fit_link(old_hip, old_knee, hip, knee)
        shapes[f"Knee.{label}"] = fit_link(old_knee, ankle, knee, ankle)
        old_shin, shin = ankle - old_knee, ankle - knee
        old_thigh, thigh = old_knee - old_hip, knee - hip
        tilt = old_thigh.rotation_difference(thigh).slerp(old_shin.rotation_difference(shin), .5)
        shapes[f"Patella.{label}"] = (Matrix.Translation(knee) @ tilt.to_matrix().to_4x4()
                                      @ Matrix.Translation(-old_knee))
    return shapes


def connect_parts(rig, assignments):
    shapes = shape_transforms()
    linkages = {}
    for label, side in SIDES.items():
        _, old_knee, _ = r3_leg(side)
        # Seat the rear toggle on the top of the calf as one rigid moving assembly.
        seat = Matrix.Diagonal((1, .74, 1, 1))
        seat[2][1] = -.07
        linkages[f"Knee.{label}"] = (shapes[f"Knee.{label}"] @ Matrix.Translation(old_knee)
                                     @ seat @ Matrix.Translation(-old_knee))
    for obj, (owner, part) in assignments.items():
        shape = linkages[owner] if obj.name.startswith(REAR_KNEE_LINKAGE) else shapes.get(owner, Matrix.Identity(4))
        transform = shape @ obj.matrix_world
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = owner
        bone = rig.data.bones[owner]
        # Keep the affine fit in the binding so bevels and the editable source meshes survive.
        parent = rig.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))
        obj.matrix_parent_inverse = parent.inverted() @ transform @ obj.matrix_basis.inverted()
        obj["rig_attachment"] = owner
        obj["part"] = part
    bpy.context.view_layer.update()


def export_live(rig, assignments, output):
    scene = bpy.context.scene
    depsgraph = bpy.context.evaluated_depsgraph_get()
    bpy.ops.object.select_all(action="DESELECT")
    copies = {part: [] for part in PARTS}
    for original, (owner, part) in assignments.items():
        rendered = original.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(rendered, preserve_all_data_layers=True, depsgraph=depsgraph)
        # Model vertices are flattened into armature space before joining.
        mesh.transform(original.matrix_world)
        obj = bpy.data.objects.new(f"Export {original.name}", mesh)
        scene.collection.objects.link(obj)
        group = obj.vertex_groups.new(name=owner)
        group.add(list(range(len(mesh.vertices))), 1, "REPLACE")
        copies[part].append(obj)

    meshes = []
    for part, objects in copies.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        mesh = bpy.context.object
        mesh.name = mesh.data.name = part
        mesh["part"] = mesh.data["part"] = part
        mesh.parent = rig
        modifier = mesh.modifiers.new("Rigid articulation", "ARMATURE")
        modifier.object = rig
        assert all(len(vert.groups) == 1 and vert.groups[0].weight == 1 for vert in mesh.data.vertices), part
        meshes.append(mesh)

    for i, name in enumerate(MATERIALS, 1):
        next(material for material in bpy.data.materials if material.name.startswith(f"{i:02d} |")).name = name
    rig.location.z = -GROUND
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(output), use_selection=True,
                              export_extras=True, export_texcoords=False, export_animations=True,
                              export_anim_slide_to_zero=True, export_animation_mode="ACTIONS",
                              export_optimize_animation_keep_anim_armature=False)


def measured_shape(assignments):
    graph = bpy.context.evaluated_depsgraph_get()
    groups = {key: [] for key in ("torso", "head", "subject")}
    for obj, (owner, _) in assignments.items():
        evaluated = obj.evaluated_get(graph)
        points = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
        groups["subject"].extend(points)
        if owner == "Torso":
            groups["torso"].extend(points)
        if owner == "Optics":
            groups["head"].extend(points)
    torso, head, subject = (groups[name] for name in ("torso", "head", "subject"))
    return {"torso_width": max(point.x for point in torso) - min(point.x for point in torso),
            "torso_height": max(point.z for point in torso) - min(point.z for point in torso),
            "head_z": max(point.z for point in head), "crown_z": max(point.z for point in subject),
            "floor_z": min(point.z for point in subject)}


def leg_dimensions(points):
    hip, knee, ankle = points
    upper, lower = knee - hip, ankle - knee
    pitch = degrees(Vector((upper.y, upper.z)).angle(Vector((lower.y, lower.z))))
    return {"hip_to_ankle": (ankle - hip).length, "loaded_height": hip.z - ankle.z,
            "link_length": upper.length + lower.length, "bend": degrees(upper.angle(lower)),
            "sagittal_bend": pitch, "ankle_xyz": list(ankle)}


def verify_pose(rig, assignments, baseline):
    bones = rig.pose.bones
    points = lambda names: {name: bones[name].head.copy() for name in names}
    feet = [f"Foot.{label}" for label in SIDES]
    shields = [f"ShieldFace.{label}" for label in SIDES]
    sample(rig, "Idle", 0)
    idle = points(feet + shields)
    revised = measured_shape(assignments)
    for name, ratio in (("torso_width", .88), ("torso_height", .85),
                        ("head_z", 1), ("crown_z", 1), ("floor_z", 1)):
        assert abs(revised[name] - baseline[name] * ratio) < .00001, (name, baseline, revised)
    legs = {}
    for label, side in SIDES.items():
        old = leg_dimensions(r3_leg(side))
        new = leg_dimensions(tuple(bones[f"{name}.{label}"].head for name in ("Hip", "Knee", "Foot")))
        assert new["hip_to_ankle"] > old["hip_to_ankle"] and new["link_length"] > old["link_length"], (old, new)
        assert 10 < new["sagittal_bend"] < 25 < old["sagittal_bend"], (old, new)
        assert (Vector(old["ankle_xyz"]) - Vector(new["ankle_xyz"])).length < .00001, (old, new)
        legs[label] = {"R3": old, "standing": new}
    body_parts = {part: sum(group == part for _, group in assignments.values()) for part in PARTS}
    max_foot_drift = 0
    for clip in ("Idle", "BraceEnter", "BraceHold", "BraceExit", "Fire"):
        for index in range(CLIPS[clip] + 1):
            sample(rig, clip, index / CLIPS[clip])
            max_foot_drift = max(max_foot_drift, *((bones[name].head - idle[name]).length for name in feet))
    assert max_foot_drift < .0001, max_foot_drift
    sample(rig, "BraceHold", 0)
    brace = points(shields)
    assert all(brace[name].y < idle[name].y - .6 for name in shields), (idle, brace)
    for label in SIDES:
        legs[label]["brace"] = leg_dimensions(tuple(bones[f"{name}.{label}"].head
                                                   for name in ("Hip", "Knee", "Foot")))
        assert legs[label]["brace"]["sagittal_bend"] > legs[label]["standing"]["sagittal_bend"] + 20
    sample(rig, "Walk", 0)
    start = points(feet)
    sample(rig, "Walk", 1)
    assert all((start[name] - bones[name].head).length < .0001 for name in feet)
    max_stance_drift = 0
    for index in range(CLIPS["Walk"] + 1):
        t = index / CLIPS["Walk"]
        sample(rig, "Walk", t)
        label = "R" if t < .5 or t == 1 else "L"
        foot = bones[f"Foot.{label}"].head
        phase = (t + (.5 if label == "L" else 0)) % 1
        expected = idle[f"Foot.{label}"] + Vector((0, STRIDE * (phase * 2 - .5), 0))
        max_stance_drift = max(max_stance_drift, (foot - expected).length)
    assert max_stance_drift < .0001, max_stance_drift
    sample(rig, "Idle", 0)
    return {"bound_source_objects": body_parts, "bones": len(bones),
            "mesh_dimensions": {"R3": baseline, "revised": revised}, "leg_dimensions": legs,
            "planted_foot_max_error": max_foot_drift, "walk_stance_max_error": max_stance_drift,
            "shield_face_idle_xyz": {name: list(idle[name]) for name in shields},
            "shield_face_brace_xyz": {name: list(brace[name]) for name in shields},
            "clips_seconds": {name: frames / FPS for name, frames in CLIPS.items()}}


def verify_brace_clearance(rig, assignments):
    """Sweep the beveled castings that must pass each other during deployment."""
    sample(rig, "Idle", 0)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    pairs = [("Shield.L", "Shield.R")]
    for side in SIDES:
        legs = [f"{part}.{side}" for part in ("Hip", "Knee", "Patella", "Foot")]
        pairs += [(f"Shield.{side}", part) for part in ("Torso", "Optics", *legs)]
        pairs += [(f"Shield.{side}", f"{part}.{side}") for part in ("Arm", "Elbow", "Hand")]
        pairs += [(f"{part}.{side}", leg) for part in ("Hand", "Elbow") for leg in legs]
    geometry = {name: ([], []) for pair in pairs for name in pair}
    for obj, (owner, _) in assignments.items():
        if owner not in geometry:
            continue
        target_verts, target_polys = geometry[owner]
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        offset = len(target_verts)
        target_verts.extend(obj.matrix_world @ vertex.co for vertex in mesh.vertices)
        target_polys.extend(tuple(i + offset for i in poly.vertices) for poly in mesh.polygons)
        evaluated.to_mesh_clear()
    inverse = {name: rig.data.bones[name].matrix_local.inverted() for name in geometry}
    levels = [("BraceEnter", i / 42) for i in range(43)] + [("BraceHold", .5)]
    for clip, level in levels:
        sample(rig, clip, level)
        trees = {}
        for name, (verts, polys) in geometry.items():
            transform = rig.pose.bones[name].matrix @ inverse[name]
            trees[name] = BVHTree.FromPolygons([transform @ point for point in verts], polys)
        for first, second in pairs:
            assert not trees[first].overlap(trees[second]), (clip, level, first, second)
    sample(rig, "Idle", 0)
    return {"samples": len(levels), "part_pairs_per_sample": len(pairs), "overlapping_pairs": 0}


def verify_rear_knee_mounts(assignments):
    graph = bpy.context.evaluated_depsgraph_get()
    for label in SIDES:
        owner = f"Knee.{label}"
        parts = {obj.name.partition(".")[0]: obj for obj, (bone, _) in assignments.items() if bone == owner}

        def surface(name):
            evaluated = parts[name].evaluated_get(graph)
            return BVHTree.FromPolygons([evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices],
                                        [tuple(poly.vertices) for poly in evaluated.data.polygons])

        calf = surface("Rearward deep calf casting")
        for name in ("Rear knee lower hinge", "Rear knee hinge guide"):
            assert calf.overlap(surface(name)), (label, name)
    return {"seated_surfaces_per_side": 2, "owner": "calf"}


def renders(rig, proof):
    scene = bpy.context.scene
    cam = scene.camera
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 9.8
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.render.resolution_x = 750
    scene.render.resolution_y = 630
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 93
    proof.mkdir(parents=True, exist_ok=True)
    views = {"angle": (9, -17, 7.4), "front": (0, -20, 3.12), "side": (19, 0, 3.12)}
    for clip, level, side, name in (
        ("Idle", 0, "angle", "01-idle"), ("BraceHold", 0, "angle", "02-brace"),
        ("Idle", 0, "front", "03-idle-front"), ("BraceHold", 0, "front", "04-brace-front"),
        ("BraceHold", 0, "side", "05-brace-side"), ("Walk", .20, "side", "06-walk"),
        ("Fire", .37, "angle", "07-fire"), ("Idle", 0, "side", "08-idle-side"),
    ):
        sample(rig, clip, level)
        cam.location = views[side]
        cam.rotation_euler = (Vector((0, 0, 3.12)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(proof / f"{name}.jpg")
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE, help="Approved Raven-Clay-R3 blend")
    parser.add_argument("--output-dir", type=Path, default=HERE, help="Directory for the packed rig and full-detail GLB")
    parser.add_argument("--proof-dir", type=Path, help="Directory for review renders")
    parser.add_argument("--render", action="store_true", help="Also render the Blender review views")
    tools = parser.add_mutually_exclusive_group()
    tools.add_argument("--render-only", action="store_true", help="Render the existing saved rig")
    tools.add_argument("--export-only", action="store_true", help="Export the existing rig without the R3 master")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    path = output / "Raven-Rig.blend"
    proof = (args.proof_dir or output / "Proof").resolve()
    if args.render_only or args.export_only:
        bpy.ops.wm.open_mainfile(filepath=str(path))
        rig = bpy.data.objects["Raven Rig"]
        if args.render_only:
            renders(rig, proof)
        else:
            sample(rig, "Idle", 0)
            bindings = {obj: (obj["rig_attachment"], obj["part"])
                        for collection in bpy.context.scene.collection.children for obj in collection.objects
                        if obj.parent == rig and obj.get("rig_attachment")}
            export_live(rig, bindings, output / "Raven-Rig.glb")
        return
    if args.source is None:
        parser.error("Pass --source with the path to the approved Raven-Clay-R3 blend")
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bindings = source_bindings()
    baseline = measured_shape(bindings)
    rig = make_rig()
    connect_parts(rig, bindings)
    bake_actions(rig)
    checks = verify_pose(rig, bindings, baseline)
    checks["rear_knee_mounts"] = verify_rear_knee_mounts(bindings)
    checks["brace_clearance"] = verify_brace_clearance(rig, bindings)
    (output / "rig-checks.json").write_text(json.dumps(checks, indent=2) + "\n", encoding="utf-8")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    if args.render:
        renders(rig, proof)
        sample(rig, "Idle", 0)
    export_live(rig, bindings, output / "Raven-Rig.glb")


if __name__ == "__main__":
    main()
