"""Build the game rig and review renders from the approved Raven-Clay-R3 blend."""

import argparse
import json
import sys
from math import cos, radians, sin
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "Raven-Clay-R3" / "Raven.blend"
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE))
from raven_motion import CLIPS, FPS, SIDES, STRIDE, bake_actions, rest_leg, sample


MATERIALS = ("paint_primary", "paint_secondary", "frame", "recess", "steel", "paint_accent", "visor")
PARTS = ("body", "pilot", "left", "right", "legs")
GROUND = .03  # R3 toe cleats: center z=.075, height=.09.


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
    bone("Pelvis", (0, .11, 3.30), (0, .11, 3.63), "Root")
    bone("Torso", (0, .08, 3.63), (0, .08, 5.02), "Pelvis")
    bone("Optics", (0, .155, 5.29), (0, -.24, 5.36), "Torso")
    for label, side in SIDES.items():
        hip, knee, ankle = rest_leg(side)
        shoulder = (side * 1.20, .06, 5.02)
        gimbal = (side * 2.10, .066, 5.62)
        arm = (side * 1.78, .075, 4.89)
        elbow = Vector((side * 2.16, -.022, 3.97))
        bend = Matrix.Translation(elbow) @ Matrix.Rotation(-.22, 4, "X") @ Matrix.Translation(-elbow)
        wrist = bend @ Vector((side * 2.58, -.28, 2.50))
        hand_axis = (wrist - elbow).normalized()
        bone(f"Shoulder.{label}", shoulder, (side * 1.88, .06, 5.06), "Torso")
        bone(f"Shield.{label}", gimbal, (side * 2.10, .405, 5.62), f"Shoulder.{label}")
        socket(f"ShieldFace.{label}", (side * 2.79, -.52, 5.40), (0, -1, 0), f"Shield.{label}")
        bone(f"Arm.{label}", arm, elbow, "Torso")
        bone(f"Elbow.{label}", elbow, wrist, f"Arm.{label}")
        bone(f"Hand.{label}", wrist, wrist + hand_axis * .38, f"Elbow.{label}")
        socket(f"Grip.{label}", bend @ Vector((side * 2.47, -.34, 2.22)), hand_axis, f"Hand.{label}")
        if label == "R":
            socket("Muzzle.R", bend @ Vector((-2.48, -.32, 2.04)), hand_axis, "Hand.R")
        else:
            socket("ClampTip.L", bend @ Vector((2.65, -.42, 1.24)), (0, 0, -1), "Hand.L")
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


def connect_parts(rig, assignments):
    for obj, (owner, part) in assignments.items():
        transform = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = owner
        obj.matrix_world = transform
        obj["rig_attachment"] = owner
        obj["part"] = part
    bpy.context.view_layer.update()


def export_live(rig, assignments):
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
    bpy.ops.export_scene.gltf(filepath=str(HERE / "Raven-Rig.glb"), use_selection=True,
                              export_extras=True, export_texcoords=False, export_animations=True,
                              export_anim_slide_to_zero=True, export_animation_mode="ACTIONS",
                              export_optimize_animation_keep_anim_armature=False)


def verify_pose(rig, assignments):
    bones = rig.pose.bones
    points = lambda names: {name: bones[name].head.copy() for name in names}
    feet = [f"Foot.{label}" for label in SIDES]
    shields = [f"ShieldFace.{label}" for label in SIDES]
    sample(rig, "Idle", 0)
    idle = points(feet + shields)
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


def renders(rig):
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
    proof = HERE / "Proof"
    proof.mkdir(exist_ok=True)
    views = {"angle": (9, -17, 7.4), "front": (0, -20, 3.95), "side": (19, 0, 5.6)}
    for clip, level, side, name in (
        ("Idle", 0, "angle", "01-idle"), ("BraceHold", 0, "angle", "02-brace"),
        ("Idle", 0, "front", "03-idle-front"), ("BraceHold", 0, "front", "04-brace-front"),
        ("BraceHold", 0, "side", "05-brace-side"), ("Walk", .20, "side", "06-walk"),
        ("Fire", .37, "angle", "07-fire"),
    ):
        sample(rig, clip, level)
        cam.location = views[side]
        cam.rotation_euler = (Vector((0, 0, 3.12)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(proof / f"{name}.jpg")
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE, help="Approved Raven-Clay-R3 blend")
    parser.add_argument("--render", action="store_true", help="Also render the Blender review views")
    tools = parser.add_mutually_exclusive_group()
    tools.add_argument("--render-only", action="store_true", help="Render the existing saved rig")
    tools.add_argument("--export-only", action="store_true", help="Export the existing rig without the R3 master")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.render_only or args.export_only:
        bpy.ops.wm.open_mainfile(filepath=str(HERE / "Raven-Rig.blend"))
        rig = bpy.data.objects["Raven Rig"]
        if args.render_only:
            renders(rig)
        else:
            sample(rig, "Idle", 0)
            bindings = {obj: (obj["rig_attachment"], obj["part"])
                        for collection in bpy.context.scene.collection.children for obj in collection.objects
                        if obj.parent == rig and obj.get("rig_attachment")}
            export_live(rig, bindings)
        return
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bindings = source_bindings()
    rig = make_rig()
    connect_parts(rig, bindings)
    bake_actions(rig)
    checks = verify_pose(rig, bindings)
    checks["brace_clearance"] = verify_brace_clearance(rig, bindings)
    (HERE / "rig-checks.json").write_text(json.dumps(checks, indent=2) + "\n", encoding="utf-8")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "Raven-Rig.blend"))
    if args.render:
        renders(rig)
        sample(rig, "Idle", 0)
    export_live(rig, bindings)


if __name__ == "__main__":
    main()
