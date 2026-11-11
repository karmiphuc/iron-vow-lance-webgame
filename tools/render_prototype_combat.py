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
from mathutils import Matrix, Quaternion, Vector
from PIL import Image


CELL = 248
COLUMNS = 8
FIRE_CUES = (.42, .58)
STRIKE_CUE = .34
STRIKE_DURATION = 1.05
CLEAVER_CLOSE_LEVELS = (0,.08,.16,.24,.28,.31,.34,.37,.40,.43,.46,.49,.52,.54,.57,.60,.63,.68,.73,.78,.85,.93,1)
CLEAVER_FIELD_LEVELS = (0,.14,.25,.31,.36,.42,.49,.56,.63,.73,.86,1)


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


def cleaver_orientation(blade, palm):
    x = -Vector(blade).normalized()
    y = Vector(palm)
    y = (y - x*y.dot(x)).normalized()
    return Matrix((x, y, x.cross(y))).transposed().to_quaternion()


def cleaver_pose(rig, phase, reference, limit_reach=False):
    shoulder, elbow, wrist = (rig.pose.bones[name] for name in ("Shoulder.L", "Elbow.L", "Wrist.L"))
    shoulder_rest, elbow_rest, wrist_rest = reference
    neutral = wrist_rest.to_quaternion()
    guard = wrist_rest.translation
    correction = Quaternion(rig.get("cleaver_wrist_correction", (1,0,0,0)))
    # Wrist targets in armature space. The cut runs out from the left flank,
    # through the target lane, then across the front of the chassis.
    keys = (
        (0, guard, neutral, 0, 0, 0),
        (.31, Vector((2.40, -.40, 3.68)), cleaver_orientation((.67,.23,.70),(.12,-.98,.18)) @ correction, .29, -.04, 0),
        (.49, Vector((1.83,-1.72,3.66)), cleaver_orientation((-.31,-.94,-.13),(.67,-.20,-.74)) @ correction, -.37, .12, .20),
        (.63, Vector((1.07,-1.66,3.22)), cleaver_orientation((-.77,-.53,-.35),(.51,-.36,-.78)) @ correction, -.46, .08, .15),
        (.78, Vector((1.69,-1.05,3.07)), cleaver_orientation((.16,-.35,-.92),(.16,-.96,.15)) @ correction, -.18, .04, .07),
        (1, guard, neutral, 0, 0, 0),
    )
    for a,b in zip(keys,keys[1:]):
        if phase <= b[0]:
            u = (phase-a[0])/(b[0]-a[0])
            u = u*u*(3-2*u)
            break
    mix = lambda index: a[index]+(b[index]-a[index])*u
    target = a[1].lerp(b[1],u)
    hand = a[2].slerp(b[2],u)
    rotate(rig, "Torso", x=mix(4), z=mix(3))
    # Advance the hips over the fixed foot controls.
    pelvis = rig.pose.bones["Pelvis"]
    pelvis.location = pelvis.bone.matrix_local.to_3x3().inverted() @ Vector((0,-mix(5),-.42*mix(5)))
    rotate(rig,"Pauldron.L",x=-.22*max(0,-mix(3)),y=-.18*abs(mix(3)))
    bpy.context.view_layer.update()

    head = shoulder.head.copy()
    delta = target-head
    distance = delta.length
    arm = elbow_rest.translation-shoulder_rest.translation
    forearm = wrist_rest.translation-elbow_rest.translation
    upper, lower = arm.length, forearm.length
    if limit_reach and distance > upper+lower-.012:
        target = head + delta.normalized()*(upper+lower-.012)
        delta = target-head
        distance = delta.length
    assert abs(upper-lower) < distance < upper+lower-.005, (phase,distance,upper+lower)
    direction = delta.normalized()
    pole = (arm-direction*arm.dot(direction)).normalized()
    along = (distance*distance+upper*upper-lower*lower)/(2*distance)
    joint = head+direction*along+pole*math.sqrt(upper*upper-along*along)
    shoulder.matrix = Matrix.LocRotScale(head,arm.rotation_difference(joint-head) @ shoulder_rest.to_quaternion(),None)
    bpy.context.view_layer.update()
    elbow.matrix = Matrix.LocRotScale(joint,forearm.rotation_difference(target-joint) @ elbow_rest.to_quaternion(),None)
    bpy.context.view_layer.update()
    wrist.matrix = Matrix.LocRotScale(target,hand,None)
    bpy.context.view_layer.update()
    assert (wrist.head-target).length < .001, (phase,wrist.head[:],target[:])


def add_strike_track(scene, rig, heavy, limit_reach=False):
    anim = rig.animation_data
    if anim.nla_tracks.get("Strike"):
        return
    fire = anim.nla_tracks["Fire"]
    for track in anim.nla_tracks:
        track.mute = track != fire
    scene.frame_set(int(fire.strips[0].frame_start))
    controls = [rig.pose.bones[bone.name] for bone in rig.data.collections["Controls"].bones]
    baseline = {bone.name: (bone.location.copy(), bone.rotation_euler.copy()) for bone in controls}
    armed = "Cleaver Tip.L" in rig.pose.bones
    reference = tuple(rig.pose.bones[name].matrix.copy() for name in ("Shoulder.L","Elbow.L","Wrist.L"))
    previous = {}
    fire.mute = True
    action = bpy.data.actions.new("Field strike")
    anim.action = action
    for step in range(31):
        for bone in controls:
            bone.location, bone.rotation_euler = baseline[bone.name]
        if armed:
            cleaver_pose(rig, step / 30, reference, limit_reach)
            for name in ("Shoulder.L","Elbow.L","Wrist.L"):
                bone = rig.pose.bones[name]
                if name in previous:
                    angles = bone.rotation_euler.copy()
                    angles.make_compatible(previous[name])
                    bone.rotation_euler = angles
                previous[name] = bone.rotation_euler.copy()
        else:
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
    scene.cycles.samples = 10 if CELL > 248 else 6
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
        if mat.use_nodes and role in {"armor", "plate", "badge"}:
            node = mat.node_tree.nodes.new("ShaderNodeOutputAOV")
            node.aov_name = "Plates"
            node.inputs["Value"].default_value = .62 if role == "plate" else .9
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
    anchors = {key: project(pos) for key, pos in {
        "body": body, "left": left, "right": right, "legs": legs, "muzzle": muzzle,
        "muzzle2": muzzle2, "meleeTip": tip,
        "leadFoot": point("Foot.L") - Vector((0, 0, .40)),
    }.items()}
    if "Cleaver Tip.L" in rig.pose.bones:
        anchors.update(meleeTip=project(point("Cleaver Tip.L")),
                       shoulderMuzzle=project(point("Shoulder Muzzle.R")),
                       shoulderMuzzle2=project(point("Shoulder Muzzle2.R")))
    return anchors


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
    melee = (CLEAVER_CLOSE_LEVELS if "Cleaver Tip.L" in rig.pose.bones else
             sorted({i / 12 for i in range(13)} | {STRIKE_CUE, .54}))
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
        color, paint = render_sprite(scene, tmp, 768 if CELL > 248 else 512)
        save_pair(color, paint, dest, key, 94 if CELL > 248 else 89)
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
        save_pair(atlas, matte, dest, atlas_key, 94 if CELL > 248 else 84)
        result[face] = visual
        print(f"Baked {model} {face}: {index} combat poses", flush=True)
    return result


def main():
    global CELL
    args = sys.argv[sys.argv.index("--") + 1:]
    if "--hd" in args:
        args.remove("--hd")
        CELL = 448
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
