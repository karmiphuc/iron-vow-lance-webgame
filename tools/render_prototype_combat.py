"""Bake the playable prototype chassis from the editable Blender rigs.

blender -b --factory-startup --python-use-system-env --python-exit-code 1 -P tools/render_prototype_combat.py -- <rig-directory> <output-directory> [gatecrasher|cicada]
"""
import json
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from PIL import Image


CELL = 248
COLUMNS = 8
FIRE_CUES = (.42, .58)
STRIKE_CUE = .34
STRIKE_DURATION = 1.05


def rotate(rig, name, x=0, y=0, z=0):
    bone = rig.pose.bones[name]
    bone.rotation_euler = bone.bone.matrix_local.to_3x3().inverted() @ Vector((x, y, z))


def pulse(t, start, peak, end):
    if t <= start or t >= end:
        return 0
    v = (t - start) / (peak - start) if t <= peak else (end - t) / (end - peak)
    return v * v * (3 - 2 * v)


def strike(rig, progress, heavy):
    windup = pulse(progress, 0, .25, .53)
    hit = pulse(progress, .29, .54, .98)
    rotate(rig, "Torso", x=.09 * hit, z=-.25 * windup + .40 * hit)
    rotate(rig, "Shoulder.L", x=.18 * windup - .51 * hit, y=-.18 * hit)
    rotate(rig, "Elbow.L", x=-.25 * windup - .28 * hit)
    rotate(rig, "Pauldron.L", x=-.13 * hit)
    if heavy:
        for i in range(1, 5):
            rotate(rig, f"Finger {i}.L", x=.13 + .41 * max(windup, hit))
            rotate(rig, f"Finger {i} tip.L", x=.18 + .61 * max(windup, hit))


def add_strike_track(scene, rig, heavy):
    anim = rig.animation_data
    fire = anim.nla_tracks["Fire"]
    for track in anim.nla_tracks:
        track.mute = track != fire
    scene.frame_set(int(fire.strips[0].frame_start))
    controls = [rig.pose.bones[bone.name] for bone in rig.data.collections["Controls"].bones]
    baseline = {bone.name: (bone.location.copy(), bone.rotation_euler.copy()) for bone in controls}
    fire.mute = True
    action = bpy.data.actions.new("Field strike")
    anim.action = action
    for step in range(31):
        for bone in controls:
            bone.location, bone.rotation_euler = baseline[bone.name]
        strike(rig, step / 30, heavy)
        for bone in controls:
            bone.keyframe_insert("location", frame=1 + step, group=bone.name)
            bone.keyframe_insert("rotation_euler", frame=1 + step, group=bone.name)
    slot = anim.action_slot
    anim.action = None
    track = anim.nla_tracks.new()
    track.name = "Strike"
    track.strips.new("Strike", 1, action).action_slot = slot
    track.mute = True


def light(scene, name, location, energy, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.size = energy, color, size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 2.6)) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_render(scene, tmp):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 6
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_x = scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.use_persistent_data = True
    scene.world = bpy.data.worlds.new("Overcast sky")
    scene.world.color = (.26, .26, .26)
    scene.view_settings.view_transform = "AgX"
    light(scene, "Overcast key", (1, -6, 8), 1800, (.91, .96, 1), 6)
    light(scene, "Ground bounce", (-6, -3, 4), 1000, (.65, .77, 1), 5)
    light(scene, "Warm rim", (3, 4, 7), 1900, (1, .77, .57), 4)

    view = bpy.context.view_layer
    aov = view.aovs.add()
    aov.name, aov.type = "Plates", "VALUE"
    for mat in bpy.data.materials:
        role = mat.name.rsplit(" / ", 1)[-1]
        if mat.use_nodes and role in {"armor", "plate"}:
            node = mat.node_tree.nodes.new("ShaderNodeOutputAOV")
            node.aov_name = "Plates"
            node.inputs["Value"].default_value = .9 if role == "armor" else .62
    tree = bpy.data.node_groups.new("Battlefield color and plate mask", "CompositorNodeTree")
    scene.compositing_node_group = tree
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    layers = tree.nodes.new("CompositorNodeRLayers")
    tree.links.new(layers.outputs["Image"], tree.nodes.new("NodeGroupOutput").inputs["Image"])
    mask = tree.nodes.new("CompositorNodeOutputFile")
    mask.directory, mask.file_name = str(tmp), "paint"
    mask.format.media_type = "IMAGE"
    mask.format.file_format, mask.format.color_mode = "PNG", "BW"
    mask.save_as_render = False
    mask.file_output_items.new("FLOAT", "Plate")
    tree.links.new(layers.outputs["Plates"], mask.inputs["Plate"])

    data = bpy.data.cameras.new("Tactical orthographic camera")
    data.type, data.ortho_scale = "ORTHO", 8.4
    camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def render_sprite(scene, tmp, size):
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.filepath = str(tmp / "color.png")
    for previous in tmp.glob("paint*.png"):
        previous.unlink()
    bpy.ops.render.render(write_still=True)
    with Image.open(scene.render.filepath) as image:
        rgba = image.convert("RGBA")
    mask_file, = tmp.glob("paint*.png")
    with Image.open(mask_file) as image:
        return rgba, image.convert("L")


def hardpoints(scene, camera, rig, heavy):
    def project(world):
        screen = world_to_camera_view(scene, camera, world)
        return [round(screen.x, 5), round(1 - screen.y, 5)]

    def point(name, end=False):
        bone = rig.pose.bones[name]
        return rig.matrix_world @ (bone.tail if end else bone.head)

    body = point("Torso").lerp(point("Optics"), .51)
    left = point("Shoulder.L").lerp(point("Elbow.L"), .56)
    right = point("Shoulder.R").lerp(point("Elbow.R"), .56)
    legs = point("Knee.L").lerp(point("Knee.R"), .5)
    muzzle = point("Muzzle" if heavy else "Launch.L")
    muzzle2 = muzzle if heavy else point("Launch.R")
    if heavy and "Muzzle.Upper" in rig.pose.bones:
        muzzle, muzzle2 = point("Muzzle.Upper"), point("Muzzle.Lower")
        tip = point("Finger 2 tip.L", True)
    elif heavy:
        # The published cannon has a shared center socket and two parallel barrels.
        across = (rig.matrix_world @ rig.pose.bones["Cannon Slide"].matrix).to_3x3()
        offset = across @ Vector((.19, 0, 0))
        muzzle, muzzle2 = muzzle - offset, muzzle + offset
        tip = point("Finger 2 tip.L", True)
    else:
        wrist = rig.pose.bones["Wrist.L"]
        emitter = wrist.bone.head_local + Vector((0, -.528, -.09))
        tip = rig.matrix_world @ wrist.matrix @ wrist.bone.matrix_local.inverted() @ emitter
    return {key: project(pos) for key, pos in {
        "body": body, "left": left, "right": right, "legs": legs, "muzzle": muzzle,
        "muzzle2": muzzle2, "meleeTip": tip,
        "leadFoot": point("Foot.L") - Vector((0, 0, .40)),
    }.items()}


def save_pair(color, paint, destination, key, quality):
    color.save(destination / f"{key}.webp", quality=quality, method=4)
    paint.save(destination / f"{key}-paint.webp", lossless=True, method=4)


def bake(model, rigs, output, tmp):
    bpy.ops.wm.open_mainfile(filepath=str(rigs / f"iron-vow-{model}.blend"), load_ui=False)
    scene = bpy.context.scene
    rig, = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    tracks = rig.animation_data.nla_tracks
    assert all(name in tracks for name in ("Idle", "Walk", "Fire"))
    heavy = model in {"gatecrasher", "gatecrasher-r2"}
    studio = bpy.data.collections.get("Studio | Four reference views")
    if studio:
        studio.hide_render = True
    camera = configure_render(scene, tmp)
    dest = output / "assets"
    dest.mkdir(parents=True, exist_ok=True)
    fire_strip = tracks["Fire"].strips[0]
    fire_frames = round(fire_strip.frame_end - fire_strip.frame_start)
    add_strike_track(scene, rig, heavy)

    def sample(clip, progress):
        active = tracks[clip].strips[0]
        animation = rig.animation_data
        animation.use_nla = False
        animation.action = active.action
        animation.action_slot = active.action_slot
        time = active.action_frame_start + progress * (active.action_frame_end - active.action_frame_start)
        scene.frame_set(math.floor(time), subframe=time % 1)
        bpy.context.view_layer.update()

    gait = [i / 18 for i in range(18)]
    fire = sorted({i / 18 for i in range(19)} | set(FIRE_CUES))
    melee = sorted({i / 12 for i in range(13)} | {STRIKE_CUE, .54})
    frames = [("gait", "Walk", gait), ("fire", "Fire", fire), ("strike", "Strike", melee)]
    rows = math.ceil(sum(len(levels) for _, _, levels in frames) / COLUMNS)
    result = {}
    for face, sign in (("left", 1), ("right", -1)):
        camera.location = (sign * 11.0, -12.5, 9.2)
        camera.rotation_euler = (Vector((0, 0, 3.17)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        ground = world_to_camera_view(scene, camera, Vector((0, 0, 0)))
        key = f"{model}-combat-{face}"
        sample("Fire", 0)
        color, paint = render_sprite(scene, tmp, 512)
        save_pair(color, paint, dest, key, 89)
        visual = {
            "key": key, "native": True, "ground": round(1 - ground.y, 5),
            "groundX": round(ground.x, 5), "scale": 1.26, "hip": .58, "split": .5,
            "foot": [.89, .89], "mass": 1.56 if heavy else 1.11,
            **hardpoints(scene, camera, rig, heavy),
        }
        atlas_key = key + "-motion"
        visual["motion"] = {"key": atlas_key, "cell": CELL, "columns": COLUMNS}
        visual["timing"] = {
            "fire": {"duration": fire_frames / scene.render.fps, "cue": FIRE_CUES[0],
                     "beatGap": round((FIRE_CUES[1] - FIRE_CUES[0]) * fire_frames / scene.render.fps, 6)},
            "strike": {"duration": STRIKE_DURATION, "cue": STRIKE_CUE},
        }
        atlas = Image.new("RGBA", (CELL * COLUMNS, CELL * rows))
        matte = Image.new("L", atlas.size)
        index = 0
        for kind, clip, levels in frames:
            visual["motion"][kind] = []
            for progress in levels:
                sample(clip, progress)
                color, paint = render_sprite(scene, tmp, CELL)
                box = (index % COLUMNS * CELL, index // COLUMNS * CELL)
                atlas.paste(color, box)
                matte.paste(paint, box)
                visual["motion"][kind].append({
                    "index": index, "level": round(progress, 6),
                    **hardpoints(scene, camera, rig, heavy),
                })
                index += 1
        save_pair(atlas, matte, dest, atlas_key, 84)
        result[face] = visual
        print(f"Baked {model} {face}: {index} combat poses", flush=True)
    return result


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    rigs, output = (Path(arg).resolve() for arg in args[:2])
    data = {}
    for model in args[2:] or ("gatecrasher", "cicada"):
        with TemporaryDirectory() as directory:
            data[model] = bake(model, rigs, output, Path(directory))
        (output / f"{model}-combat.json").write_text(json.dumps(data[model], separators=(",", ":")), encoding="utf8")
    if len(data) == 2:
        (output / "prototype-combat.js").write_text(
            "// Generated by tools/render_prototype_combat.py.\nwindow.IRON_VOW_PROTOTYPES = "
            + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf8")


if __name__ == "__main__":
    main()
