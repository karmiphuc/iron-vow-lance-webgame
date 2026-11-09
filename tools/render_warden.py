"""Bake tactical sprites and projected hardpoints from the shipped GLBs.

Run from the repository with Blender 4.3+ and Pillow available to its Python:
    blender -b -t 6 -P tools/render_warden.py
Append -- --parts-only to bake lossless armor IDs from the same poses.
"""
import json
import math
import subprocess
import sys
import tempfile
from hashlib import sha256
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Quaternion, Vector
from PIL import Image

DIST = Path(__file__).resolve().parents[1] / "dist"
BENCH = DIST / "rig-bench"
ASSETS = DIST / "assets"
parts_only = "--parts-only" in sys.argv
if parts_only:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from bake_native_parts import verify_and_save
    from blender_part_mask import render_part_mask
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

motion = json.loads(subprocess.check_output(
    ["node", str(Path(__file__).with_name("sample_warden_motion.cjs"))]
))

for root in weapon_roots.values():
    root.parent = objects["socket.R"]
    root.location = (0, 0, 0)
    root.rotation_mode = "QUATERNION"
    root.rotation_quaternion = Quaternion((1, 0, 0), math.pi / 2)

def rotate(name, x=0, y=0, z=0):
    # The bench uses intrinsic XYZ. Map the ordered rotations to Blender's axes.
    obj = objects[name]
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (
        Quaternion((1, 0, 0), x) @ Quaternion((0, 0, 1), y) @ Quaternion((0, -1, 0), z)
    )

def apply_pose(pose, weapon):
    pelvis, gun = pose["pelvis"], pose["gun"]
    objects["pelvis"].location = point(*pelvis["position"])
    rotate("pelvis", z=pelvis["roll"])
    rotate("spine", x=pose["spinePitch"])
    for side, leg in zip("LR", pose["legs"]):
        rotate(f"hip.{side}", *leg["hip"])
        rotate(f"knee.{side}", x=leg["knee"])
        rotate(f"ankle.{side}", *leg["ankle"])
    rotate("shoulder.R", *gun["shoulder"])
    rotate("elbow.R", x=gun["elbow"])
    rotate("wrist.R", x=gun["wrist"])
    rotate("pauldron.R", x=gun["shoulder"][0] * .28, z=gun["shoulder"][2] * .4)
    rotate("shoulder.L", x=pose["leftShoulder"])
    rotate("elbow.L", x=-.56)
    rotate("wrist.L", x=.06)
    rotate("pauldron.L", x=pose["leftShoulder"] * .28)
    weapon.location.z = -gun["offset"]
    bpy.context.view_layer.update()
    for anchor in objects:
        if not anchor.name.startswith("piston.") or not anchor.name.endswith(".a"):
            continue
        partner = objects[anchor.name[:-1] + "b"]
        for source, target in ((anchor, partner), (partner, anchor)):
            direction = source.parent.matrix_world.to_quaternion().inverted() @ (
                target.matrix_world.translation - source.matrix_world.translation
            )
            source.rotation_mode = "QUATERNION"
            source.rotation_quaternion = direction.to_track_quat("-Y", "Z")
    bpy.context.view_layer.update()

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
camera_data.type, camera_data.ortho_scale = "ORTHO", 9.65
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

def hardpoints(muzzle):
    return {
        "muzzle": anchor(muzzle.matrix_world.translation),
        "body": anchor(objects["spine"].matrix_world @ point(0, 1.1, .63)),
        "right": anchor(position("shoulder.R").lerp(position("elbow.R"), .55)),
        "left": anchor(position("shoulder.L").lerp(position("elbow.L"), .55)),
        "legs": anchor(position("knee.L").lerp(position("knee.R"), .50)),
    }

def render_sprite(tmp, key, size):
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.cycles.samples = 40 if size >= 512 else 16
    scene.render.filepath = str(Path(tmp) / f"{key}.png")
    bpy.ops.render.render(write_still=True)
    with Image.open(scene.render.filepath) as source:
        sprite = source.convert("RGBA")
    bounds = sprite.getchannel("A").getbbox()
    if not bounds or min(bounds[0], bounds[1], size-bounds[2], size-bounds[3]) <= 0:
        sprite.save(Path(tempfile.gettempdir()) / "warden-clipped.png")
        raise ValueError((key, bounds))
    return sprite

loop_only = "--loop-only" in sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else False
ground = .89
cell, columns = 320, 5
pose_count = sum(len(motion[k]) for k in ("gait","kicks","aims","deaths"))
out = {}
with tempfile.TemporaryDirectory() as tmp:
    for face, sign in [("left", 1), ("right", -1)]:
        if loop_only and face != "left":
            continue
        camera.location = point(10.2, 8.2, 13.5) if sign == 1 else point(-14, 8.2, 10)
        aim(camera, point(0, 3.45, .35))
        camera_data.shift_x = camera_data.shift_y = 0
        bpy.context.view_layer.update()
        ground_x = .54 if sign == 1 else .47
        base = world_to_camera_view(scene, camera, point(0, .10, .2))
        camera_data.shift_x, camera_data.shift_y = base.x - ground_x, base.y - (1 - ground)
        bpy.context.view_layer.update()
        for loadout, root in weapon_roots.items():
            make_loop = loadout == "rifle" and face == "left"
            if loop_only and not make_loop:
                continue
            for other in weapon_roots.values():
                for obj in other.children_recursive:
                    obj.hide_render = other != root
            key = f"warden-{loadout}-{face}"
            apply_pose(motion["idle"], root)
            if parts_only:
                verify_and_save(render_part_mask(scene, 640), key)
            elif not loop_only:
                render_sprite(tmp, key, 640).save(ASSETS / f"{key}.webp", quality=88, method=6)
            root_muzzle = descendant(root, "muzzle")
            hip = anchor(position("pelvis"))
            feet = sorted(anchor(position(f"ankle.{s}") - Vector((0, 0, .30))) for s in "LR")
            visual = {
                "key": key,
                "ground": ground,
                "scale": 1.24,
                "groundX": ground_x,
                "hip": hip[1],
                "split": hip[0],
                "foot": [max(.90, p[1]) for p in feet],
                **hardpoints(root_muzzle),
                "motion": {
                    "key": f"{key}-motion",
                    "cell": cell,
                    "columns": columns,
                    "gait": [],
                    "kick": [],
                    "aim": [],
                    "death": [],
                },
            }
            atlas = Image.new("RGBA", (cell * columns, cell * math.ceil(pose_count / columns)))
            poses = [("gait", None, pose) for pose in motion["gait"]] + [(kind, entry["level"], entry["pose"]) for kind, source in [("kick","kicks"),("aim","aims"),("death","deaths")] for entry in motion[source]]
            loop_frames = []
            for index, (kind, kick, pose) in enumerate(poses):
                apply_pose(pose, root)
                sprite = render_part_mask(scene, cell) if parts_only else render_sprite(tmp, f"{key}-{index}", 512 if make_loop and loop_only else cell)
                if make_loop and not parts_only:
                    loop_frames.append(sprite)
                if not loop_only:
                    atlas.paste(sprite.resize((cell, cell), Image.Resampling.LANCZOS),
                                (index % columns * cell, index // columns * cell))
                frame = {"index": index, **hardpoints(root_muzzle)}
                if kind == "gait":
                    visual["motion"][kind].append(frame)
                else:
                    visual["motion"][kind].append({"level": kick, **frame})
            if parts_only:
                verify_and_save(atlas, f"{key}-motion")
            elif not loop_only:
                atlas.save(ASSETS / f"{key}-motion.webp", quality=83, method=6)
            if make_loop and not parts_only:
                walk = list(range(len(motion["gait"])))
                kick = list(range(len(walk), len(walk)+len(motion["kicks"])))
                sequence = walk * 2 + kick + kick[-2::-1]
                frames = [loop_frames[i] for i in sequence]
                frames[0].save(ASSETS / "warden-rig-loop.webp", save_all=True,
                               append_images=frames[1:], duration=85, loop=0, quality=82, method=4)
            out.setdefault(loadout, {})[face] = visual
if loop_only or parts_only:
    sys.exit(0)
(DIST / "warden-visuals.js").write_text(
    "// Generated by tools/render_warden.py from the rig bench GLBs.\n"
    + "".join(f"// {name} {sha256((BENCH / name).read_bytes()).hexdigest()}\n"
              for name in ("warden.glb", "weapons.glb"))
    + "window.IRON_VOW_WARDEN_ART = " + json.dumps(out, separators=(",", ":")) + ";\n"
)
