"""Bake tactical sprites and projected hardpoints from the shipped GLBs.

Run from the repository with Blender 4.3+ and Pillow available to its Python:
    blender -b -t 6 -P tools/render_warden.py
"""
import json
import math
import tempfile
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from PIL import Image

DIST = Path(__file__).resolve().parents[1] / "dist"
BENCH = DIST / "rig-bench"
ASSETS = DIST / "assets"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(BENCH / "warden.glb"))
bpy.ops.import_scene.gltf(filepath=str(BENCH / "weapons.glb"))
objects = bpy.data.objects
scene = bpy.context.scene

def descendant(root, name):
    return next(o for o in root.children_recursive if o.name.split(".")[0] == name)

# The game uses rifle and rail IDs. Both share the exact right-hand socket.
weapon_roots = {key: objects[name] for key, name in [("rifle", "kestrel"), ("rail", "longbow")]}
for name in ("hailstorm", "breaker", "cleaver", "piledriver"):
    objects[name].hide_render = True
    for child in objects[name].children_recursive:
        child.hide_render = True

for side, shoulder, elbow, wrist in [
    ("R", -.96, -math.pi / 2 + .96, 0),
    ("L", -.15, -.56, .06),
]:
    objects[f"shoulder.{side}"].rotation_euler.x = shoulder
    objects[f"elbow.{side}"].rotation_euler.x = elbow
    objects[f"wrist.{side}"].rotation_euler.x = wrist
    objects[f"pauldron.{side}"].rotation_euler.x = shoulder * .28

# Slight ready stance. Equal and opposite ankle rotation keeps the soles flat.
crouch = .24
objects["pelvis"].location.z -= (1.45 + 1.55) * (1 - math.cos(crouch))
for side in "LR":
    objects[f"hip.{side}"].rotation_euler.x = -crouch
    objects[f"knee.{side}"].rotation_euler.x = 2 * crouch
    objects[f"ankle.{side}"].rotation_euler.x = -crouch

for root in weapon_roots.values():
    root.parent = objects["socket.R"]
    root.location = (0, 0, 0)
    root.rotation_euler.x = math.pi / 2

for anchor in objects:
    if not anchor.name.startswith("piston.") or not anchor.name.endswith(".a"):
        continue
    partner = objects[anchor.name[:-1] + "b"]
    bpy.context.view_layer.update()
    for source, target in ((anchor, partner), (partner, anchor)):
        direction = source.parent.matrix_world.to_quaternion().inverted() @ (target.matrix_world.translation - source.matrix_world.translation)
        # glTF local +Z maps to Blender local -Y for these exported empties.
        source.rotation_mode = "QUATERNION"
        source.rotation_quaternion = direction.to_track_quat("-Y", "Z")

def point(x, y, z):
    return Vector((x, -z, y))

def aim(obj, at):
    obj.rotation_euler = (at - obj.location).to_track_quat("-Z", "Y").to_euler()

scene.world = bpy.data.worlds.new("Overcast fill")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes["Background"]
background.inputs["Color"].default_value = (.24, .32, .40, 1)
background.inputs["Strength"].default_value = .5
for name, pos, power, size, color in [
    ("Key", (2.5, 9, 7), 1300, 5, (1, .90, .78)),
    ("Fill", (-7, 6, 4), 1150, 6, (.58, .74, 1)),
    ("Rim", (4, 7, -6), 1750, 5, (.57, .75, 1)),
]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy, light.size, light.color = power, size, color
    lamp = objects.new(name, light)
    scene.collection.objects.link(lamp)
    lamp.location = point(*pos)
    aim(lamp, point(0, 3, .2))

camera_data = bpy.data.cameras.new("Tactical camera")
camera = objects.new("Tactical camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type, camera_data.ortho_scale = "ORTHO", 7.65
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = False
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"

def anchor(location):
    p = world_to_camera_view(scene, camera, location)
    return [round(p.x, 5), round(1 - p.y, 5)]

def position(name):
    return objects[name].matrix_world.translation.copy()

ground = .923
out = {}
with tempfile.TemporaryDirectory() as tmp:
    for face, sign in [("left", 1), ("right", -1)]:
        camera.location = point(10.2, 8.2, 13.5) if sign == 1 else point(-14, 8.2, 10)
        aim(camera, point(0, 3.45, .35))
        camera_data.shift_x = camera_data.shift_y = 0
        bpy.context.view_layer.update()
        base = world_to_camera_view(scene, camera, point(0, .10, .2))
        camera_data.shift_x, camera_data.shift_y = base.x - .5, base.y - (1 - ground)
        bpy.context.view_layer.update()
        for loadout, root in weapon_roots.items():
            for other in weapon_roots.values():
                for obj in other.children_recursive:
                    obj.hide_render = other != root
            key = f"warden-{loadout}-{face}"
            scene.render.filepath = str(Path(tmp) / f"{key}.png")
            bpy.ops.render.render(write_still=True)
            with Image.open(scene.render.filepath) as sprite:
                bounds = sprite.getchannel("A").getbbox()
                assert bounds and bounds[0] > 0 and bounds[2] < sprite.width and bounds[3] < sprite.height, (key, bounds)
                sprite.save(ASSETS / f"{key}.webp", quality=88, method=6)
            root_muzzle = descendant(root, "muzzle")
            hip = anchor(position("pelvis"))
            feet = sorted(anchor(position(f"ankle.{s}") - Vector((0, 0, .30))) for s in "LR")
            out.setdefault(loadout, {})[face] = {
                "key": key,
                "ground": ground,
                "hip": hip[1],
                "split": hip[0],
                "foot": [max(.90, p[1]) for p in feet],
                "muzzle": anchor(root_muzzle.matrix_world.translation),
                "body": anchor(position("spine") + point(0, 1.1, .63)),
                "right": anchor(position("shoulder.R").lerp(position("elbow.R"), .55)),
                "left": anchor(position("shoulder.L").lerp(position("elbow.L"), .55)),
                "legs": anchor(position("knee.L").lerp(position("knee.R"), .50)),
            }
(DIST / "warden-visuals.js").write_text(
    "// Generated by tools/render_warden.py from the rig bench GLBs.\n"
    "window.IRON_VOW_WARDEN_ART = " + json.dumps(out, indent=2) + ";\n"
)
