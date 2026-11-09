"""Bake the approved Lion melee rig as Iron Vow Canvas atlases.

blender --background --disable-autoexec --python-use-system-env <Lion-Rigged.blend>
        --python-exit-code 1 --python bake_lion.py -- <output-directory>
"""
import hashlib
import json
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from PIL import Image


CELL = 384
COLUMNS = 4
FRAMES = 32
FPS = 24
CONTACT = 18
FINISH = 22
PULLBACK = 25
ORTHO = 7.85
WEAPONS = {
    "Arc Cleaver": "cleaver",
    "Cinder Hatchet": "hatchet",
    "Breaker Maul": "breaker",
}


def vec(point):
    return [round(v, 7) for v in point]


def matrix_values(matrix):
    return [round(value, 7) for row in matrix for value in row]


def project(scene, camera, point):
    projected = world_to_camera_view(scene, camera, point)
    return [round(projected.x, 6), round(1 - projected.y, 6)]


def pose_sample(scene, rig, socket, mount, mounts, fingers, frame):
    scene.frame_set(frame)
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated_rig = rig.evaluated_get(graph)
    pose = evaluated_rig.pose.bones
    to_world = evaluated_rig.matrix_world

    def head(name):
        return to_world @ pose[name].head

    seat = socket.evaluated_get(graph).matrix_world.copy()
    actual = mount.evaluated_get(graph).matrix_world.copy()
    assert (actual.translation - seat.translation).length < 1e-5, (frame, "socket translation")
    assert abs(actual.to_quaternion().dot(seat.to_quaternion())) > .999999, (frame, "socket orientation")
    for candidate in mounts:
        assert all(child.evaluated_get(graph).hide_render == (candidate != mount)
                   for child in candidate.children), (frame, candidate.name, "weapon visibility")

    inv = actual.inverted()
    pads = {}
    for original in fingers:
        evaluated = original.evaluated_get(graph)
        to_grip = inv @ evaluated.matrix_world
        digit = original.parent_bone.split("_")[1]
        for vertex in evaluated.data.vertices:
            point = to_grip @ vertex.co
            if abs(point.z) < .177 and (digit not in pads or point.xy.length < pads[digit].xy.length):
                pads[digit] = point
    opposed = min(a.xy.normalized().dot(b.xy.normalized()) for a in pads.values() for b in pads.values())
    assert len(pads) == 5 and all(.035 < p.xy.length < .072 for p in pads.values()) and opposed < -.65, (
        frame, "grip contact", {digit: point.xy.length for digit, point in pads.items()})

    shoulder, elbow, wrist = [head(name) for name in ("upper_arm.L", "forearm.L", "hand.L")]
    tip = actual @ Vector(mount["strike_tip"])
    # Project the actual rendered pose, including the authored foot plant and seat.
    points = {
        "body": head("chest").lerp(head("neck"), .45),
        "pilot": head("head"),
        "left": shoulder.lerp(elbow, .54),
        "right": head("upper_arm.R").lerp(head("forearm.R"), .54),
        "legs": head("shin.L").lerp(head("shin.R"), .5),
        "gripL": seat.translation,
        "meleeTip": tip,
        "leadFoot": head("foot.L") - Vector((0, 0, .40)),
    }
    audit = {
        "sourceFrame": frame,
        "shoulder": vec(shoulder),
        "elbow": vec(elbow),
        "wrist": vec(wrist),
        "socketMatrix": matrix_values(seat),
        "mountMatrix": matrix_values(actual),
        "meleeTip": vec(tip),
        "leftFoot": vec(head("foot.L")),
        "rightFoot": vec(head("foot.R")),
        "fingerPadsInGrip": {digit: vec(point) for digit, point in sorted(pads.items())},
        "elbowFlex": round(math.degrees((elbow - shoulder).angle(wrist - elbow)), 6),
    }
    return points, audit


def bake(output):
    scene = bpy.context.scene
    assert scene["Melee finish"] == "Extended follow-through"
    assert scene["Melee grip"] == "Closed palm"
    assert scene.render.fps == FPS and scene.render.fps_base == 1
    source = Path(bpy.data.filepath)
    clip_data = json.loads(scene["Melee clips"])
    clips = {label: start for label, side, start in clip_data if side == "L"}
    assert clips == {"Arc Cleaver": 101, "Cinder Hatchet": 231, "Breaker Maul": 311}, clips
    rig = bpy.data.objects["LION Rig"]
    socket = bpy.data.objects["weapon_socket.L"]
    mounts = [bpy.data.objects[f"{label} | {side}"] for label, side, _ in clip_data]
    fingers = [o for o in bpy.data.collections["01  Chassis meshes"].objects
               if o.type == "MESH" and o.parent_bone.startswith("finger_") and o.parent_bone.endswith(".L")]

    camera = bpy.data.objects["Motion / sabre review"]
    scene.camera = camera
    camera.data.ortho_scale = ORTHO
    scene.render.resolution_x = scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.display.render_aa = "5"
    scene.display.shading.color_type = "MATERIAL"

    assets = output / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    data = {"fps": FPS, "contact": CONTACT, "finish": FINISH, "pullback": PULLBACK,
            "cell": CELL, "columns": COLUMNS, "ortho": ORTHO, "strikes": {}}
    audit = {"source": source.name, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
             "fps": FPS, "hand": "L", "plant": 13, "contact": CONTACT, "finish": FINISH, "pullback": PULLBACK,
             "matrixOrder": "row-major", "strikes": {}}
    with TemporaryDirectory(prefix="iron-vow-lion-") as temp:
        scene.render.filepath = str(Path(temp) / "frame.png")
        for label, weapon in WEAPONS.items():
            start = clips[label]
            mount = bpy.data.objects[f"{label} | L"]
            data["strikes"][weapon] = {}
            audit["strikes"][weapon] = {"frames": [], "atlases": {}}
            for direction, sign in (("left", 1), ("right", -1)):
                key = f"lion-{weapon}-{direction}"
                camera.location = (sign * 12, -13, 7.35)
                camera.rotation_euler = (Vector((0, 0, 3.15)) - camera.location).to_track_quat("-Z", "Y").to_euler()
                bpy.context.view_layer.update()
                ground_x, ground_y = project(scene, camera, Vector())
                assert ground_x == .5 and data.get("ground", ground_y) == ground_y
                data["ground"] = ground_y
                atlas = Image.new("RGBA", (CELL * COLUMNS, CELL * (FRAMES // COLUMNS)))
                projected_frames = []
                box_list = []
                for tick in range(FRAMES):
                    points, sample = pose_sample(scene, rig, socket, mount, mounts, fingers, start + tick)
                    if direction == "left":
                        audit["strikes"][weapon]["frames"].append(sample)
                    projected = {name: project(scene, camera, pos) for name, pos in points.items()}
                    projected_frames.append(projected)
                    bpy.ops.render.render(write_still=True)
                    with Image.open(scene.render.filepath) as raw:
                        rgba = raw.convert("RGBA")
                    box = rgba.getchannel("A").getbbox()
                    assert box and min(box[0], box[1], CELL - box[2], CELL - box[3]) >= 2, (key, tick, box)
                    box_list.append(box)
                    atlas.paste(rgba, (tick % COLUMNS * CELL, tick // COLUMNS * CELL))
                assert sign * (projected_frames[CONTACT]["gripL"][0] - projected_frames[CONTACT]["meleeTip"][0]) > .04
                dest = assets / (key + ".webp")
                atlas.save(dest, quality=94, method=5, exact=True, alpha_quality=100)
                with Image.open(dest) as packed:
                    assert packed.mode == "RGBA" and packed.size == atlas.size
                    assert packed.getchannel("A").tobytes() == atlas.getchannel("A").tobytes()
                data["strikes"][weapon][direction] = {"key": key, "frames": projected_frames}
                audit["strikes"][weapon]["atlases"][direction] = {
                    "key": key, "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
                    "alphaBounds": box_list,
                }
                print(f"Baked {key}: {FRAMES} poses, {dest.stat().st_size} bytes", flush=True)
    for weapon, entry in audit["strikes"].items():
        frames = entry["frames"]
        elbow_angles = [frame["elbowFlex"] for frame in frames[CONTACT:FINISH + 1]]
        assert max(elbow_angles) - min(elbow_angles) < .01
        assert frames[PULLBACK]["elbowFlex"] - frames[FINISH]["elbowFlex"] > 20
        assert frames[CONTACT]["meleeTip"][2] - frames[FINISH]["meleeTip"][2] > .7
        print(f"{weapon}: elbow {frames[CONTACT]['elbowFlex']:.3f} / {frames[FINISH]['elbowFlex']:.3f} / "
              f"{frames[PULLBACK]['elbowFlex']:.3f} degrees", flush=True)
    (output / "lion-art.js").write_text(
        "// Generated by bake_lion.py from the approved Lion rig.\nwindow.IRON_VOW_LION_ART="
        + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf8")
    (output / "lion-export-audit.json").write_text(json.dumps(audit, separators=(",", ":")) + "\n", encoding="utf8")


if __name__ == "__main__":
    bake(Path(sys.argv[sys.argv.index("--") + 1]).resolve())
