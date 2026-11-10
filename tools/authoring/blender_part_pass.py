"""Replay a Blender sprite bake with flat colors for its damage parts.

Usage: blender --background SOURCE.blend --python blender_part_pass.py --
    BAKE.py [the original bake script's arguments]
"""
import re
import sys
from pathlib import Path

import bpy


def bone_part(bone):
    if not isinstance(bone, str) or not bone:
        return None
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", "_", bone).lower()
    if name in ("right", "left"):
        return 3 if name == "right" else 4
    if re.search(r"(^|[._ |/-])(head|helm(?:et)?|cockpit|optic|visor|pilot)([._ |/-]|$)", name):
        return 2
    if re.search(r"(^|[._ |/-])(thigh|shin|greave|foot|feet|toe|leg|hock|knee|ankle|link)([._ |/-]|$)", name):
        return 5
    if re.search(r"(^|[._ |/-])(shoulder|pauldron|lame|arm|elbow|forearm|hand|wrist|weapon|autocannon|humerus|osode|digit\w*|thumb|pinky|ring|middle|index)([._ |/-]|$)", name):
        if re.search(r"(^|[._ |/-])(r|right)([._ |/-]|$)", name):
            return 3
        if re.search(r"(^|[._ |/-])(l|left)([._ |/-]|$)", name):
            return 4
    if re.search(r"(^|[._ |/-])(torso|pelvis|chest|root|chassis|back|wing|jetpack|spine|turret|abdomen|neck)([._ |/-]|$)", name):
        return 1
    return None


def damage_part(obj):
    parents = []
    current = obj
    while current and current.type != "ARMATURE":
        parents.append(current)
        current = current.parent
    for node in parents:
        if node.name.startswith("Melee grip | "):
            return 4  # The Aero bake puts these melee variants in its left hand.
        if node.get("scout_weapon"):
            return 4 if node["scout_weapon"] == "knife" else 3
        for tag in ("damage_part", "rigid_driver"):
            part = bone_part(node.get(tag))
            if part:
                return part
        if node.parent_type == "BONE":
            binding = node.parent.data.bones.get(node.parent_bone)
            while binding:
                part = bone_part(binding.name)
                if part:
                    return part
                binding = binding.parent
    if obj.vertex_groups:
        weights = {}
        for vertex in obj.data.vertices:
            for group in vertex.groups:
                part = bone_part(obj.vertex_groups[group.group].name)
                if part:
                    weights[part] = weights.get(part, 0) + group.weight
        if weights:
            return max(weights, key=weights.get)
    for node in parents:
        part = bone_part(node.name)
        if part:
            return part
    return None


_assigned = {}


def color(part):
    return (bool(part & 1), bool(part & 2), bool(part & 4), 1)


def paint_geometry(obj):
    mesh = obj.data
    if mesh.users > 1:
        obj.data = mesh = mesh.copy()
    attr = mesh.color_attributes.new(name="Damage IDs", type="BYTE_COLOR", domain="CORNER")
    mesh.color_attributes.active_color = attr
    part = damage_part(obj)
    if part is None:
        print("UNBOUND PART", obj.name, obj.parent_bone, flush=True)
    rgba = color(part or 0)
    pixels = list(rgba) * len(mesh.loops)
    if obj.name.startswith("IV-S07 armor"):
        # This GLB combines multiple rigid plates into one weighted mesh.
        groups = [bone_part(group.name) for group in obj.vertex_groups]
        parts = []
        for vertex in mesh.vertices:
            weights = [0.] * 6
            for group in vertex.groups:
                weights[groups[group.group] or 0] += group.weight
            parts.append(max(range(6), key=weights.__getitem__))
        for poly in mesh.polygons:
            votes = [parts[i] for i in poly.vertices]
            face = max(votes, key=votes.count)
            for loop in poly.loop_indices:
                pixels[loop*4:loop*4+4] = color(face)
    attr.data.foreach_set("color", pixels)
    mesh.update()


def render_parts(*args, **kwargs):
    scene = bpy.context.scene
    if scene.render.filepath.endswith("-paint.png"):
        return  # The original paint-channel pass is unrelated to damage parts.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.dither_intensity = 0
    scene.display.render_aa = "OFF"
    shade = scene.display.shading
    shade.light = "FLAT"
    weighted_atlas = any(obj.name.startswith("IV-S07 armor") for obj in scene.objects)
    shade.color_type = "VERTEX" if weighted_atlas else "OBJECT"
    shade.show_shadows = shade.show_cavity = shade.show_object_outline = False
    shade.show_specular_highlight = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    for obj in scene.objects:
        if obj.type not in {"MESH", "CURVE", "FONT", "SURFACE", "META"} or obj.hide_render:
            continue
        if obj.name not in _assigned:
            if weighted_atlas and obj.type == "MESH":
                paint_geometry(obj)
            else:
                part = damage_part(obj)
                if part is None:
                    print("UNBOUND PART", obj.name, obj.parent_bone, flush=True)
                obj.color = color(part or 0)
            _assigned[obj.name] = True
    bpy.ops.render.render(*args, **kwargs)


def replay():
    start = sys.argv.index("--")
    source = Path(sys.argv.pop(start + 1)).resolve()
    code = source.read_text(encoding="utf-8")
    target = "bpy.ops.render.render("
    if target not in code:
        raise ValueError(f"Bake has no Blender render call: {source}")
    code = code.replace(target, "render_parts(")
    exec(compile(code, str(source), "exec"),
         {"__file__": str(source), "__name__": "__main__", "render_parts": render_parts})


if __name__ == "__main__":
    replay()
