"""Bake native armor IDs from the same sources and poses as the color atlases.

blender -b --python-use-system-env -P tools/bake_native_parts.py -- <asset-name> <source.blend>
Use `--close-only` or `--field-only` when the original sources differ.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image, ImageChops, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_part_mask import render_part_mask, save_part_mask
from render_breach_gait import ELEVATION, sample, walk
from render_prototype_combat import add_strike_track

DIST = Path(__file__).resolve().parents[1] / "dist"
ASSETS = DIST / "assets"


def registry(file, name):
    return json.loads((DIST / file).read_text(encoding="utf-8").split(name, 1)[1].strip().rstrip(";"))


def open_source(source, span):
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    rig, = (obj for obj in scene.objects if obj.type == "ARMATURE")
    data = bpy.data.cameras.new("Part mask camera")
    data.type, data.ortho_scale = "ORTHO", span
    camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene, rig, camera


def sheet(key):
    with Image.open(ASSETS / (key + ".webp")) as color:
        return Image.new("RGBA", color.size)


def verify_and_save(mask, key):
    with Image.open(ASSETS / (key + ".webp")) as color:
        alpha = color.convert("RGBA").getchannel("A")
    m = mask.getchannel("A")
    core = alpha.point(lambda x: 255 if x >= 200 else 0).filter(ImageFilter.MinFilter(3))
    outer = alpha.point(lambda x: 255 if x >= 20 else 0).filter(ImageFilter.MaxFilter(3))
    missing = ImageChops.subtract(core, m).histogram()[255]
    extra = ImageChops.subtract(m, outer).histogram()[255]
    count = core.histogram()[255]
    if not count or (missing + extra) / count > .012:
        raise ValueError(f"{key} does not match color geometry: {missing} missing, {extra} extra / {count}")
    mask.putalpha(ImageChops.multiply(m, alpha.point(lambda x: 255 if x else 0)))
    save_part_mask(mask, ASSETS / (key + "-parts.webp"))
    print(f"{key}: {missing} missing, {extra} extra / {count} interior pixels", flush=True)


def bake_field(source, grounded):
    scene, rig, camera = open_source(source, grounded["span"])
    details = grounded["detail"]
    cell, columns = details["cell"], details["columns"]
    plan = [("Fire", None, 0), ("Fire", None, .42)] + [None] * (len(grounded["points"]) - 2)
    samples = grounded["samples"]
    for kind_side, start in grounded["walk"].items():
        for index in range(samples):
            plan[start + index] = (kind_side[:-1], kind_side[-1], index / (samples - 1))
    strike = grounded.get("strike")
    if strike:
        add_strike_track(scene, rig, True)
        for index, level in enumerate(strike["levels"], strike["first"]):
            plan[index] = ("Strike", None, level)
    target = Vector((0, 0, (grounded["ground"] - .5) * grounded["span"] / math.cos(ELEVATION)))
    for heading, key in enumerate(details["keys"]):
        angle = (1 + 2 * heading) * math.pi / 4
        camera.location = target + Vector((-math.sin(angle), -math.cos(angle), math.tan(ELEVATION))) * 14
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        mask = sheet(key)
        for index, (kind, side, level) in enumerate(plan):
            if side:
                walk(scene, rig, kind, side, level)
            else:
                sample(scene, rig, kind, level)
            mask.paste(render_part_mask(scene, cell), (index % columns * cell, index // columns * cell))
        verify_and_save(mask, key)


def bake_close(source, name, views):
    scene, rig, camera = open_source(source, 8.4)
    if any(view["motion"].get("strike") for view in views.values()):
        add_strike_track(scene, rig, name != "cicada")
    for face, sign in (("left", 1), ("right", -1)):
        camera.location = (sign * 11.0, -12.5, 9.2)
        camera.rotation_euler = (Vector((0, 0, 3.17)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        view = views[face]
        key = view["key"]
        sample(scene, rig, "Fire", 0)
        static = sheet(key)
        verify_and_save(render_part_mask(scene, static.width), key)
        motion = view["motion"]
        cell, columns, key = motion["cell"], motion["columns"], motion["key"]
        mask = sheet(key)
        for group, clip in (("gait", "Walk"), ("fire", "Fire"), ("strike", "Strike")):
            for frame in motion.get(group, []):
                sample(scene, rig, clip, frame["level"])
                index = frame["index"]
                mask.paste(render_part_mask(scene, cell), (index % columns * cell, index // columns * cell))
        verify_and_save(mask, key)


if __name__ == "__main__":
    name, source, *modes = sys.argv[sys.argv.index("--") + 1:]
    source = Path(source).resolve()
    if "--field-only" not in modes:
        views = registry("prototype-combat.js", "window.IRON_VOW_PROTOTYPES = ")[name]
        bake_close(source, name, views)
    if "--close-only" not in modes:
        travel = registry("grid-travel-visuals.js", "window.IRON_VOW_TRAVEL=")[name]
        if "grounded" in travel:
            bake_field(source, travel["grounded"])
