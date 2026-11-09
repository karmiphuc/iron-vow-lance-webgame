"""Bake the Vanguard-Brawler factory kit from the approved R10 rig."""
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

scene = bpy.context.scene
rig = bpy.data.objects["VANGUARD | pose rig"]
assert scene["accepted_clay"].startswith("R7")
assert scene["exact_handle_pad_fit"]
out = Path(sys.argv[sys.argv.index("--")+1]).resolve()
out.mkdir(parents=True, exist_ok=True)
camera = scene.camera
target = Vector((0, -.12, 3.00))
camera.location = target + Vector((.54, -.84, .185)) * 16
camera.rotation_euler = (target-camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.ortho_scale = 8.72
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.display.render_aa = "16"
scene.display.shading.color_type = "MATERIAL"
weapon_meshes = {}
for side, key in (("R", "hailstorm"), ("L", "piledriver")):
    carrier = bpy.data.objects[key + " | fitted carrier"]
    weapon_meshes[side] = [o for o in carrier.children_recursive if o.type == "MESH"]
    for obj in weapon_meshes[side]:
        obj.driver_remove("hide_render")
body = [o for o in scene.objects if o.type == "MESH" and o.get("rigid_driver") and
        o.parent == rig and not o.name.startswith(("Digit ", "Hand R | wrist bridge", "Hand L | wrist bridge"))]
for col in list(scene.collection.children):
    if col.name.startswith(("05A ", "05B ", "05C ", "CONTROL SHAPES")):
        col.hide_render = True

def world(point):
    return rig.matrix_world @ Vector(point)

def projection(point):
    p = world_to_camera_view(scene, camera, point)
    return [round(p.x, 5), round(1-p.y, 5)]

def place(name, displacement):
    bone = rig.pose.bones[name]
    bone.location = bone.bone.matrix_local.to_3x3().inverted() @ Vector(displacement)

def gait(index):
    phase = index / 8
    place("pelvis", (.025*math.cos(math.tau*phase), 0, -.070+.025*math.cos(2*math.tau*phase)))
    for side, offset in (("L", 0), ("R", .5)):
        t = (phase+offset)%1
        if t < .5:
            y, z = .43-.86*t*2, .21*math.sin(math.tau*t)
        else:
            y, z = -.43+.86*(t-.5)*2, 0
        place("CTRL.foot."+side, (0, y, z))
        place("CTRL.knee."+side, (0, y*.28, 0))

def turn_torso(angle):
    p = rig.pose.bones["torso"]
    m = (Matrix.Rotation(angle, 3, "X") @ p.matrix.to_3x3()).to_4x4()
    m.translation = p.head
    p.matrix = m

def anchors():
    def bone(name, at=.0):
        p = rig.pose.bones[name]
        return world(p.head.lerp(p.tail, at))
    def mount(side):
        return bpy.data.objects["SOCKET.weapon."+side].matrix_world
    r,l = mount("R"),mount("L")
    muzzle = bpy.data.objects["Muzzle.hailstorm"].matrix_world
    result = {"body":projection(bone("torso", .45)+rig.matrix_world.to_3x3() @ Vector((0,-.64,0))),
        "pilot":projection(bone("head", .54)),
        "right":projection(bone("fore.R", .43)), "left":projection(bone("fore.L", .43)),
        "legs":projection(bone("shin.R", .3).lerp(bone("shin.L", .3), .45)),
        "gripR":projection(r.translation), "axisR":projection(r @ Vector((0,0,.4))),
        "gripL":projection(l.translation), "axisL":projection(l @ Vector((0,0,.4))),
        "muzzle":projection(muzzle.translation),
        "meleeTip":projection(bpy.data.objects["Tip.piledriver"].matrix_world.translation),
        "leadFoot":projection(bone("foot.L", .58))}
    for index in range(1, 7):
        a = (index-1) * math.tau/6
        b = bpy.data.objects["Hailstorm | six-barrel rotor"].matrix_world
        result["muzzle"+str(index)] = projection(b @ Vector((.209*math.cos(a), .209*math.sin(a), 1.915)))
    return result

states = [("walk",1)]*8 + [("idle",1), ("pilot-down",13), ("wreck",1)]
parts = {
    "prime": [25,31,36,43],
    "strike": [43,45,47,49,51,57,65,73,80],
    "aim": [81,86,90,94,96],
    "kick": [99,102,107],
}
clips = {}
for clip, samples in parts.items():
    clips[clip] = list(range(len(states),len(states)+len(samples)))
    states += [(clip,f) for f in samples]
levels = {"strike":[0,.15,.32,.52,.7,.80,.89,.95,1]}
variants = {"full":set(), "right-down":{"R"}, "left-down":{"L"}, "disarmed":{"R","L"}}
frames = []
for i,(name,n) in enumerate(states):
    rig.matrix_world = Matrix.Identity(4)
    scene.frame_set(2)
    scene.frame_set(n)
    if name == "walk":
        gait(i)
    elif name == "pilot-down":
        turn_torso(.30)
    elif name == "wreck":
        rig.matrix_world = Matrix.Rotation(-1.44,4,"Y")
        bpy.context.view_layer.update()
        low = min((o.matrix_world @ Vector(c)).z for o in body if not o.hide_render for c in o.bound_box)
        rig.location = camera.rotation_euler.to_matrix() @ Vector((1.37,0,0)) + Vector((0,0,.028-low))
    bpy.context.view_layer.update()
    frames.append({"name":name, **anchors()})
    for key, lost in variants.items():
        for side, meshes in weapon_meshes.items():
            for obj in meshes:
                obj.hide_render = side in lost or name in ("wreck","pilot-down")
        scene.render.filepath = str(out / f"{key}-{i:02}.png")
        bpy.ops.render.render(write_still=True)
meta = {"key":"foundry-8-motion","cell":320,"frames":frames,"clips":clips,"levels":levels,
        "idle":8,"pilotDown":9,"wreck":10,"ground":projection(Vector((0,0,0)))[1]}
(out/"atlas.json").write_text(json.dumps(meta,separators=(",",":")),encoding="utf-8")

