"""Export the recovered Gatecrasher R2 reference loadout from an isolated Blender scene.

Run export_gatecrasher(source, output) through Blender MCP on the authoring Mac.
Blender 5.2 exports EXT_meshopt_compression directly.
"""
import re
from pathlib import Path

import bpy


BONE_NAMES = {
    "ROOT": "root",
    "Pelvis": "pelvis",
    "Torso": "spine",
    "Optics": "neck",
    "Hardpoint.L": "socket.L",
    "Shoulder Hardpoint.R": "mount.shoulderR",
    "Muzzle": "muzzle.main",
    "Muzzle.Upper": "muzzle.upper",
    "Muzzle.Lower": "muzzle.lower",
    "Shoulder Muzzle.R": "muzzle.vesper.1",
    "Shoulder Muzzle2.R": "muzzle.vesper.2",
}
for side in ("L", "R"):
    for authored, exported in (
        ("Shoulder", "shoulder"), ("Elbow", "elbow"), ("Wrist", "wrist"),
        ("Hip", "hip"), ("Knee", "knee"), ("Foot", "ankle"),
    ):
        BONE_NAMES[f"{authored}.{side}"] = f"{exported}.{side}"

MATERIAL_NAMES = {
    "HV-09 / paint": "paint_primary",
    "HV-09 / armor": "paint_secondary",
    "HV-09 / plate": "paint_accent",
    "HV-09 / optic": "visor",
    "HV-09 / signal": "stack",
}
# Preserve source position and orientation in kit units. These are the biped
# gait starting values, to be tuned when the runtime adapter is exercised.
GAIT = dict(lift=0.5, stance=0.86, toe=0.17, reverse=False, quad=False,
            reach=0.0, phases=[0.0, 0.5], sway=0.16)
DATA_COLLECTIONS = (
    "actions", "armatures", "cameras", "collections", "curves", "images",
    "lights", "materials", "meshes", "node_groups", "objects", "scenes",
    "textures", "worlds",
)


def authored_name(name):
    return re.sub(r"\.\d{3}$", "", name)


def part_for(name, bone):
    if name.startswith("cleaver__"):
        return "left"
    if name.startswith(("vesper__", "Vesper / ")):
        return "right"
    if bone == "Optics":
        return "pilot"
    if bone.startswith(("Hip.", "Knee.", "Foot.", "Toe.", "Leg ram.", "Ankle ram.")):
        return "legs"
    if bone.startswith(("Shoulder.", "Elbow.", "Wrist.", "Pauldron.", "Arm ram.", "Finger ", "Thumb.")):
        return "left" if ".L" in bone else "right"
    if bone == "Cannon Slide":
        return "right"
    if bone in {"Pelvis", "Torso", "Shoulder Cannon.L"}:
        return "body"
    raise ValueError(f"Unclassified Gatecrasher assembly: {name} ({bone})")


def configure_bones(rig):
    bones = rig.data.bones
    hip, knee, ankle = (bones[name].head_local for name in ("Hip.L", "Knee.L", "Foot.L"))
    pelvis = bones["Pelvis"].head_local
    spine = bones["Torso"].head_local
    dimensions = dict(py=pelvis.z, spY=spine.z - pelvis.z, legA=(hip - knee).length,
                      legB=(knee - ankle).length, ankleH=ankle.z, restX=abs(ankle.x),
                      restZ=-ankle.y, **GAIT)
    for old, new in BONE_NAMES.items():
        bones[old].name = new
    for key, value in dimensions.items():
        bones["root"][key] = value

    bpy.ops.object.mode_set(mode="EDIT")
    try:
        wrist = rig.data.edit_bones["wrist.R"]
        socket = rig.data.edit_bones.new("socket.R")
        socket.parent = wrist
        socket.head = wrist.tail
        socket.tail = wrist.tail + (wrist.tail - wrist.head).normalized() * 0.2
        socket.roll = wrist.roll
        socket.use_deform = False
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")


def configure_mesh(obj, name, bone):
    part = part_for(name, bone)
    obj.data["part"] = obj["part"] = part
    if bone.startswith("Pauldron."):
        obj.data["detach"] = obj["detach"] = True
    for slot in obj.material_slots:
        if slot.material:
            source_name = authored_name(slot.material.name)
            if source_name in MATERIAL_NAMES:
                slot.material.name = MATERIAL_NAMES[source_name]
    obj.data.calc_loop_triangles()
    if len(obj.data.loop_triangles) < 800:
        return
    # Simplify dense rigid assemblies before armature evaluation. The optional
    # bolt-on weapon pieces are already small and keep their authored geometry.
    if not obj.vertex_groups:
        return
    modifier = obj.modifiers.new("Gatecrasher web triangle budget", "DECIMATE")
    modifier.ratio = 0.27 if bone == "Torso" else 0.31
    modifier.use_collapse_triangulate = True
    obj.modifiers.move(len(obj.modifiers) - 1, 0)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def export_gatecrasher(source, output):
    source = Path(source).expanduser().resolve(strict=True)
    output = Path(output).expanduser().resolve()
    if source.suffix != ".blend" or output.suffix != ".glb" or output.exists():
        raise ValueError("Use a Blender source and a new GLB output path")

    window = bpy.context.window
    if not window or bpy.context.mode != "OBJECT":
        raise RuntimeError("Run with a Blender window in Object Mode")
    previous_scene = window.scene
    existing = {key: set(getattr(bpy.data, key)) for key in DATA_COLLECTIONS}
    try:
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if len(available.scenes) != 1:
                raise ValueError("Expected the Gatecrasher R2 source with one scene")
            staged.scenes = available.scenes
        scene = staged.scenes[0]
        window.scene = scene
        rigs = [obj for obj in scene.objects if obj.type == "ARMATURE"]
        if len(rigs) != 1 or authored_name(rigs[0].name) != "GATECRASHER / Rig":
            raise ValueError("Expected the Gatecrasher R2 armature")
        rig = rigs[0]
        meshes = []
        for obj in scene.objects:
            name = authored_name(obj.name)
            if obj.type != "MESH" or obj.parent != rig or name.startswith("Shoulder Missile.L"):
                continue
            bone = obj.vertex_groups[0].name if obj.vertex_groups else obj.parent_bone
            meshes.append((obj, name, bone))
        if not meshes or not any(name.startswith("vesper__") for _, name, _ in meshes):
            raise ValueError("Expected the recovered armed R2 reference loadout")

        rig.data.pose_position = "REST"
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        bpy.context.view_layer.objects.active = rig
        configure_bones(rig)

        for obj, name, bone in meshes:
            configure_mesh(obj, name, bone)
            obj.select_set(True)
        bpy.context.view_layer.objects.active = rig
        result = bpy.ops.export_scene.gltf(
            filepath=str(output), export_format="GLB", use_selection=True,
            use_active_scene=True, export_meshopt_compression_enable=True,
            export_animations=False, export_extras=True, export_yup=True,
            export_def_bones=False, export_rest_position_armature=True,
            export_cameras=False, export_lights=False,
        )
        if result != {"FINISHED"} or not output.is_file():
            raise RuntimeError(f"Blender did not produce {output}")
    finally:
        window.scene = previous_scene
        added = [block for key, prior in existing.items()
                 for block in getattr(bpy.data, key) if block not in prior]
        bpy.data.batch_remove(ids=added)
