"""Bake grounded battlefield poses from the two editable breach rigs."""
import json
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_prototype_combat import CLEAVER_FIELD_LEVELS, add_strike_track, configure_render, hardpoints, render_sprite, rotate, save_pair


CELL, COLUMNS, SAMPLES = 384, 8, 11
SPAN, GROUND = 10.2, .84
ELEVATION = math.asin(.42 / .866)
METERS_PER_TILE = .866 * math.sqrt(2) * 3.65
PACE = METERS_PER_TILE / 3
STAGES = {"start": (0, PACE), "stride": (PACE, PACE), "settle": (PACE, 0)}


def sample(scene, rig, name, level):
    animation = rig.animation_data
    strip = animation.nla_tracks[name].strips[0]
    animation.use_nla = False
    animation.action = strip.action
    animation.action_slot = strip.action_slot
    frame = strip.action_frame_start + level * (strip.action_frame_end - strip.action_frame_start)
    scene.frame_set(int(frame), subframe=frame % 1)
    bpy.context.view_layer.update()


def move(bone, x=0, y=0, z=0):
    bone.location = bone.bone.matrix_local.to_3x3().inverted() @ Vector((x, y, z))


def walk(scene, rig, kind, side, t):
    sample(scene, rig, "Fire", 0)
    controls = [rig.pose.bones[bone.name] for bone in rig.data.collections["Controls"].bones]
    baseline = [(bone.location.copy(), bone.rotation_euler.copy()) for bone in controls]
    rig.animation_data.action = None
    for bone, (position, rotation) in zip(controls, baseline):
        bone.location, bone.rotation_euler = position, rotation
    previous, following = STAGES[kind]
    planted = "R" if side == "L" else "L"
    ease = t**3 * (10 + t * (-15 + 6*t))
    root = (-previous + (previous+following)*t) / 2
    swing = -previous + (previous+following)*ease - root
    lift = math.sin(math.pi*t)**2
    load = min(1, 2*t) if not previous else min(1, 2*(1-t)) if not following else 1
    lean = .055 * math.cos(math.pi*t) * (1 if side == "L" else -1) * load
    move(rig.pose.bones["Pelvis"], x=lean, z=-.105*load-.05*lift)
    rotate(rig, "Torso", x=.04*load, z=-lean)
    for leg in ("L", "R"):
        is_swing = leg == side
        move(rig.pose.bones["Foot IK."+leg], y=-(swing if is_swing else -root),
             z=(.31 if previous and following else .25)*lift if is_swing else 0)
        arm = (.08 if leg == "R" else .18) * (1 if is_swing else -1) * math.cos(math.pi*t)*load
        rotate(rig, "Shoulder."+leg, x=arm)
        rotate(rig, "Elbow."+leg, x=-abs(arm)*.35)
    bpy.context.view_layer.update()
    for leg in ("L", "R"):
        actual = rig.pose.bones["Foot."+leg].head
        target = rig.pose.bones["Foot IK."+leg].head
        assert (actual-target).length < .002, (kind, side, t, leg, actual[:], target[:])
    return planted


def project(scene, camera, point):
    screen = world_to_camera_view(scene, camera, point)
    return [round(screen.x, 6), round(1-screen.y, 6)]


def bake(model, source, output):
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    rig, = (obj for obj in scene.objects if obj.type == "ARMATURE")
    armed = "Cleaver Tip.L" in rig.pose.bones
    if armed:
        add_strike_track(scene, rig, True)
    studio = bpy.data.collections.get("Studio | Four reference views")
    if studio:
        studio.hide_render = True
    with TemporaryDirectory() as directory:
        tmp = Path(directory)
        camera = configure_render(scene, tmp)
        scene.cycles.samples = 10
        camera.data.ortho_scale = SPAN
        key = "grid-travel-"+model
        plan = [(None, None, 0), (None, None, .42)]
        starts = {}
        for kind in STAGES:
            for side in "LR":
                starts[kind+side] = len(plan)
                plan.extend((kind, side, n/(SAMPLES-1)) for n in range(SAMPLES))
        strike_start = len(plan)
        if armed:
            plan.extend(("Strike", None, level) for level in CLEAVER_FIELD_LEVELS)
        rows = math.ceil(len(plan)/COLUMNS)
        points = [[] for _ in plan]
        keys = []
        target = Vector((0, 0, (GROUND-.5)*SPAN/math.cos(ELEVATION)))
        for heading in range(4):
            angle = (1+2*heading)*math.pi/4
            camera.location = target+Vector((-math.sin(angle), -math.cos(angle), math.tan(ELEVATION)))*14
            camera.rotation_euler = (target-camera.location).to_track_quat("-Z", "Y").to_euler()
            color = Image.new("RGBA", (CELL*COLUMNS, CELL*rows))
            matte = Image.new("L", color.size)
            bpy.context.view_layer.update()
            assert project(scene, camera, Vector((0, 0, 0))) == [.5, GROUND]
            for index, (kind, side, level) in enumerate(plan):
                if kind == "Strike":
                    sample(scene, rig, kind, level)
                    plant = None
                elif kind:
                    plant = walk(scene, rig, kind, side, level)
                else:
                    sample(scene, rig, "Fire", level)
                    plant = None
                ankle_before = rig.pose.bones["Foot.L"].head.copy()
                sprite, mask = render_sprite(scene, tmp, CELL)
                assert (rig.pose.bones["Foot.L"].head-ankle_before).length < .0001
                box = (index%COLUMNS*CELL, index//COLUMNS*CELL)
                color.paste(sprite, box)
                matte.paste(mask, box)
                anchors = hardpoints(scene, camera, rig, True)
                for foot in "LR":
                    ankle = rig.matrix_world @ rig.pose.bones["Foot."+foot].head
                    anchors["foot"+foot] = project(scene, camera, ankle-Vector((0, 0, .43)))
                if plant:
                    anchors["planted"] = anchors["foot"+plant]
                points[index].append(anchors)
            heading_key = f"{key}-ground-{heading}"
            save_pair(color, matte, output, heading_key, 94)
            keys.append(heading_key)
            print(f"Baked {model} heading {heading}: {len(plan)} poses", flush=True)
        return {"span":SPAN, "ground":GROUND, "samples":SAMPLES, "walk":starts,
                **({"strike":{"first":strike_start, "samples":len(CLEAVER_FIELD_LEVELS),
                             "levels":CLEAVER_FIELD_LEVELS}} if armed else {}),
                "points":points, "detail":{"cell":CELL, "columns":COLUMNS, "keys":keys}}


if __name__ == "__main__":
    model, source, destination = sys.argv[sys.argv.index("--")+1:]
    output = Path(destination).resolve()
    output.mkdir(parents=True, exist_ok=True)
    data = bake(model, Path(source).resolve(), output)
    (output / (model+"-ground.json")).write_text(json.dumps(data, separators=(",", ":")), encoding="utf8")
