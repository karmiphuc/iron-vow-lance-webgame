"""Author the original Gatecrasher cleaver strike in the Blender rig.

The motion and track layout originate in render_prototype_combat.py lines 26–151.
"""
import math

import bpy
from mathutils import Matrix, Quaternion, Vector


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
