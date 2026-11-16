"""Export the recovered Cicada ML-14 factory loadout from an isolated scene.

In Blender MCP, use runpy.run_path(path)["export_cicada"](source, output).
The source contains both integrated Locust racks and the Pulse Bash housing.
The output is a meshopt-compressed rest pose without authored motion clips.
"""
import re
from pathlib import Path

import bpy


BONE_NAMES = {
    "ROOT": "root", "Pelvis": "pelvis", "Torso": "spine", "Optics": "neck",
    "Hardpoint.L": "socket.L", "Hardpoint.R": "socket.R",
    "Launch.L": "muzzle.locust.L", "Launch.R": "muzzle.locust.R",
}
for side in ("L", "R"):
    for authored, exported in (
        ("Shoulder", "shoulder"), ("Elbow", "elbow"), ("Wrist", "wrist"),
        ("Hip", "hip"), ("Knee", "knee"), ("Foot", "ankle"),
    ):
        BONE_NAMES[f"{authored}.{side}"] = f"{exported}.{side}"

MATERIAL_NAMES = {
    "paint": "paint_primary", "armor": "paint_secondary", "plate": "paint_accent",
    "optic": "visor", "signal": "stack",
}
# Initial biped gait values; tune against the runtime's planted-foot behavior.
GAIT = dict(lift=0.5, stance=0.86, toe=0.17, reverse=False, quad=False,
            reach=0.0, phases=[0.0, 0.5], sway=0.16)
DATA_COLLECTIONS = (
    "actions", "armatures", "cameras", "collections", "curves", "images",
    "lights", "materials", "meshes", "node_groups", "objects", "scenes",
    "textures", "worlds",
)


def authored_name(name):
    return re.sub(r"\.\d{3}$", "", name)


def part_for(bone):
    if bone == "Optics":
        return "pilot"
    if bone in {"Pelvis", "Torso"}:
        return "body"
    if bone.startswith(("Hip.", "Knee.", "Foot.", "Toe.", "Leg ram.")):
        return "legs"
    if bone.startswith(("Shoulder.", "Elbow.", "Wrist.", "Pauldron.",
                        "Arm ram.", "Pod.", "Shutter.")):
        if ".L" in bone:
            return "left"
        if ".R" in bone:
            return "right"
    raise ValueError(f"Unclassified Cicada assembly: {bone}")


def configure_bones(rig):
    bones = rig.data.bones
    hip, knee, ankle = (bones[name].head_local for name in ("Hip.L", "Knee.L", "Foot.L"))
    pelvis, spine = (bones[name].head_local for name in ("Pelvis", "Torso"))
    dimensions = dict(py=pelvis.z, spY=spine.z - pelvis.z, legA=(hip - knee).length,
                      legB=(knee - ankle).length, ankleH=ankle.z, restX=abs(ankle.x),
                      restZ=-ankle.y, **GAIT)
    for old, new in BONE_NAMES.items():
        bones[old].name = new
    for key, value in dimensions.items():
        bones["root"][key] = value


def configure_mesh(obj, bone):
    part = part_for(bone)
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
    # 124,484 of 127,172 source triangles are in these assemblies. A .38
    # collapse targets about 50k including both integrated missile racks.
    modifier = obj.modifiers.new("Cicada web triangle budget", "DECIMATE")
    modifier.ratio = 0.38
    modifier.use_collapse_triangulate = True
    obj.modifiers.move(len(obj.modifiers) - 1, 0)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def export_cicada(source, output):
    source = Path(source).expanduser().resolve(strict=True)
    output = Path(output).expanduser().resolve()
    if source.suffix != ".blend" or output.suffix != ".glb" or output.exists():
        raise ValueError("Use a Blender source and a new GLB output path")

    window = bpy.context.window
    if not window or bpy.context.mode != "OBJECT":
        raise RuntimeError("Run with a Blender window in Object Mode")
    previous_scene = window.scene
    existing = {key: set(getattr(bpy.data, key)) for key in DATA_COLLECTIONS}
    # Blender names are global. Temporarily move aside user materials with the
    # required export names, then restore them after the isolated scene is removed.
    displaced = []
    try:
        for name in MATERIAL_NAMES.values():
            material = bpy.data.materials.get(name)
            if material:
                displaced.append((material, name))
                material.name = f"__cicada_export_saved_{name}"
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if len(available.scenes) != 1:
                raise ValueError("Expected the Cicada source with one scene")
            staged.scenes = available.scenes
        scene = staged.scenes[0]
        window.scene = scene
        rigs = [obj for obj in scene.objects if obj.type == "ARMATURE"]
        if len(rigs) != 1 or authored_name(rigs[0].name) != "CICADA / Rig":
            raise ValueError("Expected the recovered Cicada ML-14 armature")
        rig = rigs[0]
        meshes = []
        for obj in scene.objects:
            if obj.type != "MESH" or obj.parent != rig:
                continue
            if len(obj.vertex_groups) != 1:
                raise ValueError(f"Expected one rigid vertex group on {obj.name}")
            bone = obj.vertex_groups[0].name
            part_for(bone)
            meshes.append((obj, bone))
        if len(meshes) != 31 or not all(
            any(bone == f"{kind}.{side}" for _, bone in meshes)
            for kind in ("Pod", "Shutter") for side in ("L", "R")
        ):
            raise ValueError("Expected 31 rigid assemblies including both Locust racks")
        rig.data.pose_position = "REST"
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        bpy.context.view_layer.objects.active = rig
        configure_bones(rig)
        for obj, bone in meshes:
            configure_mesh(obj, bone)
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
        for material, name in displaced:
            material.name = name
