"""Rebake the Line Infantry R32 Service or Elite E7 walk.

blender -b SOURCE.blend --python infantry_walk_grip.py -- OUTPUT
"""
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_part_pass import render_parts


FRAMES = (12, 16, 21, 25, 30, 34, 39, 43)
DIGITS = ("Index", "Middle", "Ring", "Little", "Thumb")
# R32 uses a shorter grip than Elite. These are knuckle and pad guides in
# its rifle's own frame, where +Y is forward and +Z is up.
STANDARD_GUIDES = {
    "Index": ((.135, -.164, .060), (.111, .013, .070), (.045, .113, .074)),
    "Middle": ((.153, -.151, -.006), (.103, .019, -.020), (.004, .065, -.028)),
    "Ring": ((.141, -.151, -.125), (.106, .016, -.127), (.004, .064, -.134)),
    "Little": ((.088, -.142, -.223), (.100, .025, -.213), (.005, .082, -.211)),
    "Thumb": ((-.183, -.152, .020), (-.114, -.022, -.018), (-.081, .057, -.014)),
}


def finger_fit(rig, socket, guides):
    """Build local phalanx rotations along the existing rigid bone chains."""
    bones = rig.data.bones
    into_socket = socket.inverted()
    fitted = {}
    for digit, targets in guides.items():
        first = bones[f"{digit}.01.R"]
        head = into_socket @ first.head_local
        parent = first.parent.matrix_local
        for index, target in enumerate(targets, 1):
            bone = bones[f"{digit}.{index:02d}.R"]
            direction = (Vector(target) - head).normalized()
            rest = (into_socket @ bone.matrix_local).to_quaternion()
            rotation = (rest @ Vector((0, 1, 0))).rotation_difference(direction) @ rest
            pose = socket @ Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
            predicted = parent @ bone.parent.matrix_local.inverted() @ bone.matrix_local
            fitted[bone.name] = (predicted.inverted() @ pose).to_quaternion()
            parent = pose
            head += direction * bone.length
    return fitted


def carry_arm(upper, shoulder, forearm, target):
    """Solve the two rigid links toward the restrained carry arc."""
    start, old_elbow = upper.head.copy(), forearm.head.copy()
    offset = target - start
    length_a, length_b = upper.length, forearm.length
    reach = max(abs(length_a - length_b) + .001, min(length_a + length_b - .001, offset.length))
    direction = offset.normalized()
    bend = old_elbow - start
    normal = (bend - direction * bend.dot(direction)).normalized()
    along = (reach * reach + length_a * length_a - length_b * length_b) / (2 * reach)
    elbow = start + direction * along + normal * math.sqrt(max(0, length_a * length_a - along * along))
    wrist = start + direction * reach

    def aim(bone, a, b):
        original = bone.matrix.to_quaternion()
        turn = (original @ Vector((0, 1, 0))).rotation_difference((b - a).normalized())
        pose = (turn @ original).to_matrix().to_4x4()
        pose.translation = a
        return pose, turn

    upper_pose, turn = aim(upper, start, elbow)
    forearm_pose, _ = aim(forearm, elbow, wrist)
    shoulder_pose = (Quaternion().slerp(turn, .26) @ shoulder.matrix.to_quaternion()).to_matrix().to_4x4()
    shoulder_pose.translation = shoulder.head
    upper.matrix = upper_pose
    shoulder.matrix = shoulder_pose
    bpy.context.view_layer.update()
    forearm.matrix = forearm_pose
    bpy.context.view_layer.update()


def mesh_data(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    faces = [tuple(face.vertices) for face in mesh.polygons]
    evaluated.to_mesh_clear()
    return vertices, faces


def grip_report(scene, rig, rifle, contact_reference):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    posed = rig.evaluated_get(depsgraph)
    weapon = rifle.evaluated_get(depsgraph)
    into_rifle = weapon.matrix_world.inverted() @ posed.matrix_world
    joints = [into_rifle @ posed.pose.bones[f"{digit}.{index:02d}.R"].tail
              for digit in DIGITS for index in range(1, 4)]
    drift = max((a - b).length for a, b in zip(joints, contact_reference or joints))
    grip = bpy.data.objects["Carbine.R / textured grip"]
    trigger = bpy.data.objects["Carbine.R / trigger lever"]
    surfaces = [BVHTree.FromPolygons(*mesh_data(obj, depsgraph)) for obj in (grip, trigger)]
    contacts = {}
    for digit in DIGITS:
        pads = [obj for obj in scene.objects if obj.name.startswith(("Digit shell", "Digit distal cap"))
                and obj.parent_bone.startswith(digit + ".") and obj.parent_bone.endswith(".R")]
        vertices = [vertex for obj in pads for vertex in mesh_data(obj, depsgraph)[0]]
        meshes = surfaces if digit == "Index" else surfaces[:1]
        contacts[digit] = min(tree.find_nearest(v)[3] for tree in meshes for v in vertices)
    return joints, drift, contacts


def render_paint(scene, channels, name):
    slots = [(slot, slot.material) for ob in scene.objects if ob.type == "MESH"
             for slot in ob.material_slots]
    settings = scene.view_settings
    view = settings.view_transform, settings.look, settings.exposure, settings.gamma
    try:
        for slot, material in slots:
            slot.material = channels[material.get("paint_channel") if material else None]
        settings.view_transform, settings.look, settings.exposure, settings.gamma = "Standard", "None", 0, 1
        scene.render.filepath = str(name)
        bpy.ops.render.render(write_still=True)
    finally:
        for slot, material in slots:
            slot.material = material
        settings.view_transform, settings.look, settings.exposure, settings.gamma = view


def bake():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = Path(args[0]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE" and obj.get("enemyOnly"))
    model = rig.get("foundry_index", 6)
    if model not in (6, 7):
        raise ValueError("Expected a Line Infantry service rig")
    rifle = bpy.data.objects["Carbine.R | snap-to-grip origin"]
    muzzle = bpy.data.objects["Carbine.R | muzzle +Y"]
    drawn = [obj for obj in rifle.children if obj.type == "MESH"]
    for obj in drawn:
        if obj.animation_data:
            obj.animation_data_clear()
        obj.hide_viewport = False
    p = rig.pose.bones
    dense = "--dense" in args
    samples = tuple(12 + i * 1.5 for i in range(24)) if dense else FRAMES
    hand, forearm, upper, shoulder, torso = (p[name] for name in
        ("Hand.R", "Forearm.R", "UpperArm.R", "ShoulderShell.R", "Torso"))
    # Keep the original unarmed swing and the authored rifle-ready orientation.
    # For the standard, turn the grip against the palm like the Elite socket,
    # without changing the original armature or the firing pose.
    attachment = Matrix.Rotation(-math.pi / 2, 4, "X") if model == 6 else Matrix.Identity(4)
    socket = p["Socket.Weapon.R"].bone.matrix_local @ attachment
    hand_to_rifle = hand.bone.matrix_local.inverted() @ socket
    fingers = finger_fit(rig, socket, STANDARD_GUIDES) if model == 6 else {}
    scene.frame_set(60)
    bpy.context.view_layer.update()
    ready = (rig.matrix_world.inverted() @ rifle.matrix_world).to_quaternion()
    forearm_ready = forearm.matrix.to_quaternion().inverted() @ ready
    torso_ready = torso.matrix.to_quaternion().inverted() @ ready
    stride = Vector()
    for frame in FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        stride += torso.matrix.inverted() @ hand.head
    stride /= len(FRAMES)

    camera = scene.camera
    target = Vector((0, 0, 2.46))
    az = math.radians(rig.get("art_azimuth", -52))
    mirror = az < 0
    camera.location = target + Vector((math.sin(az), -math.cos(az), .32)) * 14
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = 7.45
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = 320
    scene.cycles.samples = 8 if dense else 12
    bpy.data.objects["Studio cyclorama floor"].hide_render = True
    if model == 6:
        bpy.data.materials["Service livery / shell"]["paint_channel"] = 0
        bpy.data.materials["Service livery / trim"]["paint_channel"] = 1
    channels = {}
    for channel, rgb in ((None, (0, 0, 0)), (0, (1, 0, 0)), (1, (0, 1, 0))):
        material = bpy.data.materials.new(f"Walk paint mask {channel}")
        material.use_nodes = True
        nodes = material.node_tree.nodes
        emission = nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (*rgb, 1)
        material.node_tree.links.new(emission.outputs[0], nodes.get("Material Output").inputs["Surface"])
        channels[channel] = material

    def project(point):
        pixel = world_to_camera_view(scene, camera, point)
        return [round(1 - pixel.x if mirror else pixel.x, 5), round(1 - pixel.y, 5)]

    def points():
        right_socket = rifle.matrix_world
        left_socket = bpy.data.objects["WEAPON_SOCKET_L"].matrix_world
        anchors = {
            "gripR": project(right_socket.translation),
            "axisR": project(right_socket @ Vector((0, .35, 0))),
            "muzzle": project(muzzle.matrix_world.translation),
            "right": project(rig.matrix_world @ forearm.head.lerp(hand.head, .45)),
            "gripL": project(left_socket.translation),
            "axisL": project(left_socket @ Vector((0, .35, 0))),
        }
        if dense:
            def bone(name, fraction=0):
                pose = p[name]
                return rig.matrix_world @ pose.head.lerp(pose.tail, fraction)

            anchors.update(body=project(bone("Torso", .40)), pilot=project(bone("Head", .35)),
                           left=project(bone("Forearm.L", .45)), legs=project(bone("Shin.L", .38)),
                           leadFoot=project(bone("Foot.L", .45)),
                           footL=project(bone("Foot.L", .45)), footR=project(bone("Foot.R", .45)))
        return anchors

    def pose_carry():
        from_forearm = forearm.matrix.to_quaternion() @ forearm_ready
        from_torso = torso.matrix.to_quaternion() @ torso_ready
        # Bank the carbine out of the wrist guard while holding it low.
        yaw, roll = (4, 20) if model == 6 else (14, 40)
        turn = Quaternion((0, 0, 1), math.radians(yaw)) @ Quaternion((1, 0, 0), math.radians(-4))
        bank = Quaternion((0, 1, 0), math.radians(roll))
        aimed = turn @ from_forearm.slerp(from_torso, .72) @ bank
        matrix = (aimed @ hand_to_rifle.to_quaternion().inverted()).to_matrix().to_4x4()
        matrix.translation = hand.head.copy()
        hand.matrix = matrix
        rifle.matrix_basis = attachment
        if model == 7:
            rig["Grip_R"], rig["Trigger_R"] = 1.0, 0.0
            rig.update_tag()
        else:
            for name, rotation in fingers.items():
                p[name].rotation_quaternion = rotation
        bpy.context.view_layer.update()
        return aimed

    def render(name):
        scene.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        render_paint(scene, channels, out / f"{name}-paint.png")
        engine = scene.render.engine
        settings = scene.view_settings
        view = settings.view_transform, settings.look, settings.exposure, settings.gamma
        dither = scene.render.dither_intensity
        try:
            scene.render.filepath = str(out / f"{name}-parts.png")
            render_parts(write_still=True)
        finally:
            scene.render.engine = engine
            settings.view_transform, settings.look, settings.exposure, settings.gamma = view
            scene.render.dither_intensity = dither

    frames = []
    contact_reference = None
    report = []
    animation = rig.animation_data
    action, slot, use_nla = animation.action, animation.action_slot, animation.use_nla
    for index, frame in enumerate(samples):
        animation.action = action
        animation.action_slot = slot
        animation.use_nla = use_nla
        scene.frame_set(int(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        # The render engine reevaluates the timeline. Keep the sampled pose
        # while applying the carry, then restore the source action to advance.
        basis = {bone.name: bone.matrix_basis.copy() for bone in p}
        animation.use_nla = False
        animation.action = None
        for name, matrix in basis.items():
            p[name].matrix_basis = matrix
        rifle.matrix_basis = Matrix.Identity(4)
        for obj in drawn:
            obj.hide_render = True
        bpy.context.view_layer.update()
        free = torso.matrix.inverted() @ hand.head
        carry_arm(upper, shoulder, forearm, torso.matrix @ stride.lerp(free, .30))
        if "--inspect" not in args:
            render(f"{index:02d}-unarmed")
        expected = pose_carry()
        for obj in drawn:
            obj.hide_render = False
        bpy.context.view_layer.update()
        actual = (rig.matrix_world.inverted() @ rifle.matrix_world).to_quaternion()
        assert abs(actual.dot(expected)) > .99999, (model, frame, actual, expected)
        joints, drift, contacts = grip_report(scene, rig, rifle, contact_reference)
        contact_reference = contact_reference or joints
        assert drift < 1e-5, (model, frame, drift)
        assert max(contacts.values()) < .008, (model, frame, contacts)
        report.append({"frame": frame, "drift": drift, "gripDistances": contacts})
        frames.append(points())
        if "--inspect" not in args:
            render(f"{index:02d}")
    (out / "walk.json").write_text(json.dumps({"model": model, "mirror": mirror, "frames": frames,
                                                "grip": report}, indent=2), encoding="utf-8")
    print(model, "maximum grip drift", max(row["drift"] for row in report), "grip contact", report[0]["gripDistances"])


if __name__ == "__main__":
    bake()
