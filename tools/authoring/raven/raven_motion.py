"""Raven FK controls, analytic planted-foot solve, and game action sampling."""

from math import cos, pi, radians, sin, sqrt, tau

import bpy
from mathutils import Matrix, Quaternion, Vector


SIDES = {"L": 1, "R": -1}
FPS = 30
# Frame counts include both endpoints when baked.
CLIPS = {"Idle": 60, "Walk": 36, "BraceEnter": 21, "BraceHold": 30,
         "BraceExit": 21, "Fire": 24}
STRIDE = 0.82


def rest_leg(side):
    return tuple(Vector(point) for point in (
        (side * .76, .11, 3.30),
        (side * 1.26, -.49, 2.20),
        (side * 1.435, .17 - side * .035, .68),
    ))


def ease(value):
    value = min(1.0, max(0.0, value))
    return value ** 3 * (10 - 15 * value + 6 * value ** 2)


def ramp(value, start, end):
    return ease((value - start) / (end - start))


def rotation(axis, angle):
    return Quaternion(axis, radians(angle))


def rotate(bone, offset):
    rest = bone.bone.matrix_local.to_quaternion()
    bone.rotation_quaternion = rest.inverted() @ offset @ rest


def move(bone, delta):
    bone.location = bone.bone.matrix_local.to_quaternion().inverted() @ Vector(delta)


def place_leg(bones, label, pelvis_delta, foot_delta, toe_pitch=0):
    """Solve fixed links while holding the sculpt's outward bearing and foot orientation."""
    hip, rest_knee, rest_foot = rest_leg(SIDES[label])
    upper, lower = rest_knee - hip, rest_foot - rest_knee
    start = hip + Vector(pelvis_delta)
    end = rest_foot + Vector(foot_delta)
    target = end - start
    length = target.length
    assert abs(upper.length - lower.length) < length < upper.length + lower.length, (label, target)
    axis = target / length
    pole = upper - upper.dot(axis) * axis
    along = (upper.length_squared - lower.length_squared + length * length) / (2 * length)
    knee = start + along * axis + sqrt(upper.length_squared - along * along) * pole.normalized()
    femur = upper.rotation_difference(knee - start)
    shin = lower.rotation_difference(end - knee)
    rotate(bones[f"Hip.{label}"], femur)
    rotate(bones[f"Knee.{label}"], femur.inverted() @ shin)
    rotate(bones[f"Patella.{label}"], femur.inverted() @ femur.slerp(shin, .5))
    rotate(bones[f"Foot.{label}"], shin.inverted())
    toe_axis = Vector((cos(radians(42)), SIDES[label] * sin(radians(42)), 0))
    for index in (1, 2):
        rotate(bones[f"Toe{index}.{label}"], rotation(toe_axis, toe_pitch))


def pose_walk(rig, phase, *, feet=None, load=1.0):
    """In-place cycle. One local stance covers STRIDE units during half a cycle."""
    bones = rig.pose.bones
    wave = sin(tau * phase)
    support = cos(tau * phase)
    pelvis_delta = (.085 * wave * load, 0, load * (-.08 + .038 * cos(2 * tau * phase)))
    move(bones["Pelvis"], pelvis_delta)
    rotate(bones["Torso"], rotation((0, 0, 1), -5 * support * load) @ rotation((1, 0, 0), 2.5 * load))
    rotate(bones["Optics"], rotation((0, 0, 1), 4 * support * load))
    for label, side in SIDES.items():
        t = (phase + (.5 if label == "L" else 0)) % 1
        if t < .5:
            foot_delta = (0, STRIDE * (2 * t - .5) * load, 0)
            toe_pitch = 0
        else:
            travel = 2 * t - 1
            lift = sin(pi * travel) ** 2
            foot_delta = (0, STRIDE * (.5 - ease(travel)) * load, .34 * lift * load)
            toe_pitch = 10 * sin(tau * travel) * lift * load
        place_leg(bones, label, pelvis_delta, feet[label] if feet is not None else foot_delta, toe_pitch)
        rotate(bones[f"Arm.{label}"], rotation((1, 0, 0), side * 8 * support * load))
        rotate(bones[f"Elbow.{label}"], rotation((1, 0, 0), (-5 + side * 4 * wave) * load))
        rotate(bones[f"Shoulder.{label}"], rotation((1, 0, side * .0658), side * 3.0 * support * load))
        rotate(bones[f"Shield.{label}"], rotation((0, 1, 0), side * (2.7 + 1.6 * wave) * load))


def pose_brace(rig, tuck, swing, fold, hold=0.0):
    bones = rig.pose.bones
    pelvis_delta = (0, .12 * tuck, -.51 * tuck - .012 * hold)
    move(bones["Pelvis"], pelvis_delta)
    rotate(bones["Torso"], rotation((1, 0, 0), 7 * tuck))
    rotate(bones["Optics"], rotation((1, 0, 0), -9 * tuck))
    for label, side in SIDES.items():
        place_leg(bones, label, pelvis_delta, (0, 0, 0))
        # Pull the lower tools back around the knees before folding the elbows inward.
        rear, elbow = (65, 100) if label == "L" else (58, 88)
        pullback = ramp(tuck, 0, .72)
        close = ramp(tuck, .36, 1)
        rotate(bones[f"Arm.{label}"], rotation((0, 1, 0), side * 18 * ramp(tuck, .62, 1))
               @ rotation((1, 0, 0), rear * pullback))
        rotate(bones[f"Elbow.{label}"], rotation((1, 0, 0), -elbow * close))
        rotate(bones[f"Shoulder.{label}"], rotation((0, 0, 1), side * -90 * swing)
               @ rotation((1, 0, side * .0658), -19 * swing))
        rotate(bones[f"Shield.{label}"], rotation((0, 1, 0), side * 6 * fold))


def pose_fire(rig, level):
    bones = rig.pose.bones
    presentation = ramp(level, 0, .36) * (1 - ramp(level, .56, 1))
    recoil = ramp(level, .37, .44) * (1 - ramp(level, .44, .62))
    pelvis_delta = (0, .11 * presentation, -.17 * presentation)
    move(bones["Pelvis"], pelvis_delta)
    rotate(bones["Torso"], rotation((0, 0, 1), -10 * presentation)
           @ rotation((1, 0, 0), 4 * presentation - 5 * recoil))
    rotate(bones["Optics"], rotation((0, 0, 1), 8 * presentation))
    for label in SIDES:
        place_leg(bones, label, pelvis_delta, (0, 0, 0))
    rotate(bones["Arm.R"], rotation((0, 1, 0), -9 * presentation)
           @ rotation((1, 0, 0), -31 * presentation + 5 * recoil))
    rotate(bones["Elbow.R"], rotation((1, 0, 0), -46 * presentation - 12 * recoil))
    rotate(bones["Hand.R"], rotation((1, 0, 0), -3 * presentation + 7 * recoil))
    rotate(bones["Shoulder.R"], rotation((1, 0, -.0658), 8 * presentation))
    rotate(bones["Arm.L"], rotation((1, 0, 0), 7 * presentation))
    rotate(bones["Elbow.L"], rotation((1, 0, 0), -7 * presentation))


def reset(rig):
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)


def pose(rig, clip, level):
    reset(rig)
    if clip == "Idle":
        drift = sin(pi * level) ** 2
        rotate(rig.pose.bones["Optics"], rotation((0, 0, 1), 3 * sin(tau * level)))
        rotate(rig.pose.bones["Torso"], rotation((1, 0, 0), .45 * drift))
    elif clip == "Walk":
        pose_walk(rig, level)
    elif clip == "Fire":
        pose_fire(rig, level)
    elif clip == "BraceHold":
        pose_brace(rig, 1, 1, 1, sin(pi * level) ** 2)
    else:
        t = level if clip == "BraceEnter" else 1 - level
        pose_brace(rig, ramp(t, 0, .55), ramp(t, .24, .87), ramp(t, .45, 1))


def sample(rig, clip, level):
    """Set the normalized time of an action on a saved Raven armature."""
    action = bpy.data.actions[clip]
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    frame = start + (end - start) * min(1, max(0, level))
    bpy.context.scene.frame_set(int(frame), subframe=frame % 1)


def bake_actions(rig):
    rig.animation_data_create()
    for clip, frames in CLIPS.items():
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(frames + 1):
            pose(rig, clip, frame / frames)
            for bone in rig.pose.bones:
                if bone.name == "Pelvis":
                    bone.keyframe_insert(data_path="location", frame=frame + 1, group=bone.name)
                if bone.bone.use_deform:
                    bone.keyframe_insert(data_path="rotation_quaternion", frame=frame + 1, group=bone.name)
        for layer in action.layers:
            for strip in layer.strips:
                for channelbag in strip.channelbags:
                    for curve in channelbag.fcurves:
                        for key in curve.keyframe_points:
                            key.interpolation = "LINEAR"
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = max(CLIPS.values()) + 1
    sample(rig, "Idle", 0)
