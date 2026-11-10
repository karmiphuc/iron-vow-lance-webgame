"""Bake campaign sprites from the approved Ashigaru GLB."""
import json
from pathlib import Path
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


source, output = map(Path, sys.argv[sys.argv.index("--") + 1:][:2])
output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps = 24
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
rig = next(o for o in scene.objects if o.type == "ARMATURE")
body = next(o for o in scene.objects if o.name.startswith("IV-S07 armor"))
weapons = {o["scout_weapon"]: o for o in scene.objects if "scout_weapon" in o}
sockets = {o["scout_socket"]: o for o in scene.objects if "scout_socket" in o}
muzzles = {o["scout_muzzle"]: o for o in scene.objects if "scout_muzzle" in o}
knife_mesh = next(o for o in weapons["knife"].children_recursive if o.type == "MESH")
knife_tip = max((v.co.copy() for v in knife_mesh.data.vertices),
                key=lambda v: (knife_mesh.matrix_local @ v).z)
rest = rig.matrix_world.copy()
anim = rig.animation_data
anim.use_nla = False


def pose(name, frame):
    action = bpy.data.actions[name]
    rig.matrix_world = rest
    anim.action = action
    anim.action_slot = action.slots[0]
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def bone(name, t=0):
    b = rig.pose.bones[name]
    return rig.matrix_world @ b.head.lerp(b.tail, t)


def ground_height():
    obj = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return min((obj.matrix_world @ v.co).z for v in obj.data.vertices)


pose("Idle", 0)
origin = Vector((0, 0, ground_height()))
pose("Quickstep", 0)
stride_origin = bone("pelvis").y
camera = bpy.data.objects.new("Campaign camera", bpy.data.cameras.new("Campaign camera"))
scene.collection.objects.link(camera)
scene.camera = camera
target = origin + Vector((0, -.25, 3.05))
camera.location = target + Vector((.72, -1, .31)).normalized() * 18
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 8.9
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = scene.render.resolution_y = 304
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.display.render_aa = "8"
shading = scene.display.shading
shading.color_type = "MATERIAL"
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.curvature_ridge_factor = 1.25
shading.curvature_valley_factor = .9
bpy.context.view_layer.update()


def project(point):
    p = world_to_camera_view(scene, camera, point)
    return [round(p.x, 5), round(1 - p.y, 5)]


def capture(label, name, f, loadout):
    pose(name, f)
    if name == "Quickstep":
        rig.location.y += stride_origin - bone("pelvis").y
    if label == "wreck":
        rig.matrix_world = Matrix.Translation(Vector((2.25, 0, 0))) @ Matrix.Rotation(-1.41, 4, "Y") @ rest
    bpy.context.view_layer.update()
    if label == "wreck":
        rig.location.z += origin.z - ground_height()
        bpy.context.view_layer.update()
    for key, mount in weapons.items():
        for mesh in mount.children_recursive:
            mesh.hide_render = key != loadout
    r, l = (sockets[k].matrix_world.translation for k in "RL")
    tip = knife_mesh.matrix_world @ knife_tip
    muzzle = muzzles[loadout].matrix_world.translation if loadout in muzzles else r
    points = {"body": bone("chest", .42) + Vector((0, -.68, 0)), "pilot": bone("head", .30),
              "right": bone("forearm.R", .47), "left": bone("forearm.L", .47),
              "legs": bone("shin.L", .32).lerp(bone("shin.R", .32), .5),
              "leadFoot": bone("foot.R", .5), "gripR": r, "gripL": l,
              "muzzle": muzzle, "meleeTip": tip, "bladeTip": tip}
    index = len(meta["frames"])
    meta["frames"].append({"name": label, **{k: project(v) for k, v in points.items()}})
    scene.render.filepath = str((output / f"{index:03}.png").resolve())
    bpy.ops.render.render(write_still=True)
    return index


meta = {"cell": scene.render.resolution_x, "key": "ashigaru-combat", "frames": [],
        "ground": project(origin), "primary": True, "secondary": True,
        "views": [{"key": "ashigaru"}]}
meta["idle"] = capture("idle", "Idle", 0, "carbine")
if "probe" in sys.argv[sys.argv.index("--") + 3:]:
    sys.exit(0)
meta["bare"] = capture("idle", "Idle", 0, None)
meta["walk"] = [capture("walk", "Quickstep", f, None) for f in range(24)]
meta["pilotDown"] = capture("pilot-down", "Strike", 14, None)
meta["wreck"] = capture("wreck", "Idle", 0, None)
meta["attacks"] = {}
for key, action in (("carbine", "Fire"), ("scatter", "Burst"), ("knife", "Strike")):
    last = int(bpy.data.actions[action].frame_range[1])
    meta["attacks"][key] = [capture(key, action, f, key) for f in range(last + 1)]
(output / "frames.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
