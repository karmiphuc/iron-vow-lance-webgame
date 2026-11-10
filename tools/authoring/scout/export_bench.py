"""Export IV-S07 and its three weapon trials from the approved Grip-Stride rig."""
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
parts = [obj for obj in scene.objects if obj.type == "MESH" and obj.parent == rig]
sockets = {side: bpy.data.objects[f"SOCKET_Weapon.{side}"] for side in "RL"}
carbine = next(obj for obj in sockets["R"].children if obj.name.startswith("W01"))
knife = next(obj for obj in sockets["L"].children if obj.name.startswith("W02"))
scene.frame_set(1)
sole_points = {}
sole_height = {}
for side in "RL":
    sole = bpy.data.objects[f"Foot / shaped rubber sole.{side}"]
    evaluated = sole.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    ankle = rig.pose.bones[f"foot.{side}"].head
    sole_points[side] = [evaluated.matrix_world @ vertex.co - ankle for vertex in mesh.vertices]
    sole_height[side] = min(point.z + ankle.z for point in sole_points[side])
    evaluated.to_mesh_clear()


def baked_pose():
    result = {}
    for bone in rig.pose.bones:
        relative = bone.bone.matrix_local
        if bone.parent:
            relative = bone.parent.matrix @ bone.parent.bone.matrix_local.inverted() @ relative
        result[bone.name] = relative.inverted() @ bone.matrix
    return result


def shift(name, displacement):
    pose = rig.pose.bones[name]
    pose.location = pose.bone.matrix_local.to_3x3().inverted() @ Vector(displacement)


def turn(name, axis, angle):
    pose = rig.pose.bones[name]
    local_axis = pose.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    pose.rotation_quaternion = Quaternion(local_axis, math.radians(angle))


def plant(side, progress, stride):
    """Move the swing foot with a low arc and roll to a level heel plant."""
    t = min(1, max(0, progress))
    travel = stride * (t * t * (3 - 2 * t))
    lift = .205 * math.sin(math.pi * t) ** 1.3
    pitch = 15 * math.sin(2 * math.pi * t) if 0 < t < 1 else 0
    rotation = Matrix.Rotation(math.radians(pitch), 3, "X")
    ankle = rig.data.bones[f"CTRL_Foot.{side}"].head_local
    bottom = min((rotation @ point).z + ankle.z for point in sole_points[side])
    shift(f"CTRL_Foot.{side}", (0, -travel, lift + sole_height[side] - bottom))
    turn(f"CTRL_Foot.{side}", (1, 0, 0), pitch)


def quickstep():
    frames = []
    max_ik_error = 0
    for f in range(25):
        scene.frame_set(1)
        plant("L", (f - 1) / 10, 1.51)
        plant("R", (f - 11) / 10, 1.66)
        t = f / 24
        phase = math.sin((f - 1) / 10 * math.pi) if 1 < f < 21 else 0
        travel = 1.77 * (t + .025 * math.sin(math.tau * t))
        hip_z = -.05 + .085 * abs(phase) - .045 * math.exp(-((f - 11) / 1.5) ** 2)
        shift("pelvis", (-.23 * phase, -travel, hip_z))
        turn("spine", (1, 0, 0), 7 + 6 * abs(phase))
        turn("chest", (0, 0, 1), 9 * phase)
        turn("head", (0, 0, 1), -5 * phase)
        for side, sign in (("R", -1), ("L", 1)):
            turn(f"upper_arm.{side}", (1, 0, 0), 23 * phase * sign)
            turn(f"forearm.{side}", (1, 0, 0), -9 + 13 * phase * sign)
        bpy.context.view_layer.update()
        for side in "RL":
            goal = rig.pose.bones[f"CTRL_Foot.{side}"].head
            max_ik_error = max(max_ik_error, (rig.pose.bones[f"shin.{side}"].tail - goal).length)
        frames.append(baked_pose())
    assert max_ik_error < .008, f"Quickstep targets exceeded reach by {max_ik_error:.3f} m"
    print(f"Quickstep: 24 intervals, 1.77 m body travel, max IK error {max_ik_error:.6f}", flush=True)
    return frames


def sequence(frames):
    result = []
    for f in frames:
        scene.frame_set(f)
        result.append(baked_pose())
    return result


clips = {
    "Idle": sequence([1] * 4 + list(range(12, 22)) + list(range(20, 11, -1)) + [1] * 4),
    "Quickstep": quickstep(),
    "Fire": sequence(range(40, 59)),
    "Burst": sequence([43, 44, 46, 47, 48, 50, 52, 44, 45, 47, 48, 50, 52, 54, 56, 58, 59]),
    "Strike": sequence(range(88, 125)),
}

export_scene = bpy.data.scenes.new("IV-S07 Prototype Bay")
export_scene.render.fps = 24
export_rig = bpy.data.objects.new("IV-S07 skeleton", rig.data.copy())
export_scene.collection.objects.link(export_rig)
export_rig.location.z = -.30
export_rig.location.y = .86


def batch(name, items, parent, source_parent, skin=False):
    """Batch rigid parts by material and keep their owning bone weights."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    vertices, faces, normals, materials, slots, smooth, weights = [], [], [], [], [], [], {}
    inverse = source_parent.matrix_world.inverted()
    for part in items:
        evaluated = part.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        transform = inverse @ evaluated.matrix_world
        if skin:
            bone = rig.pose.bones[part.parent_bone]
            transform = bone.bone.matrix_local @ bone.matrix.inverted() @ transform
        normal_matrix = transform.to_3x3().inverted().transposed()
        start = len(vertices)
        vertices.extend(transform @ v.co for v in mesh.vertices)
        if skin:
            weights.setdefault(part.parent_bone, []).extend(range(start, len(vertices)))
        for polygon in mesh.polygons:
            material = mesh.materials[polygon.material_index]
            if material not in materials:
                materials.append(material)
            slots.append(materials.index(material))
            smooth.append(polygon.use_smooth)
            faces.append(tuple(start + i for i in polygon.vertices))
            normals.extend((normal_matrix @ mesh.corner_normals[i].vector).normalized() for i in polygon.loop_indices)
        evaluated.to_mesh_clear()
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    for material in materials:
        mesh.materials.append(material)
    for polygon, slot, shading in zip(mesh.polygons, slots, smooth):
        polygon.material_index, polygon.use_smooth = slot, shading
    mesh.normals_split_custom_set(normals)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    export_scene.collection.objects.link(obj)
    obj.parent = parent
    if skin:
        for bone, indices in weights.items():
            obj.vertex_groups.new(name=bone).add(indices, 1, "REPLACE")
        obj.modifiers.new("Rigid plate binding", "ARMATURE").object = export_rig
    return obj


def new_socket(side):
    original = sockets[side]
    socket = bpy.data.objects.new(f"Scout socket {side}", None)
    socket.parent = export_rig
    socket.parent_type = "BONE"
    socket.parent_bone = original.parent_bone
    socket.matrix_parent_inverse = original.matrix_parent_inverse
    socket.matrix_basis = original.matrix_basis
    socket["scout_socket"] = side
    export_scene.collection.objects.link(socket)
    return socket


def module(name, socket):
    obj = bpy.data.objects.new(name, None)
    obj.parent = socket
    obj["scout_weapon"] = name
    export_scene.collection.objects.link(obj)
    return obj


def muzzle(parent, name, location):
    obj = bpy.data.objects.new(f"{name} muzzle", None)
    obj.parent = parent
    obj.location = location
    obj["scout_muzzle"] = name
    export_scene.collection.objects.link(obj)


scene.frame_set(1)
batch("IV-S07 armor", parts, export_rig, rig, skin=True)
right, left = new_socket("R"), new_socket("L")
carbine_out = module("carbine", right)
scatter_out = module("scatter", right)
knife_out = module("knife", left)
scene.frame_set(43)
carbine_parts = [p for p in carbine.children if p.type == "MESH" and not p.name.startswith("Attack")]
batch("Needle carbine", carbine_parts, carbine_out, carbine)
grip = [p for p in carbine_parts if any(key in p.name for key in
        ("hand grip", "grip insert", "grip stop", "trigger guard", "trigger lever", "receiver tang"))]
batch("Scattergun grip", grip, scatter_out, carbine)
muzzle(carbine_out, "carbine", (0, 1.23, .235))
scene.frame_set(103)
batch("Signal knife", [p for p in knife.children if p.type == "MESH"], knife_out, knife)

black = next(p for p in carbine_parts if "bevelled receiver" in p.name).data.materials[0]
green = next(p for p in carbine_parts if "green armour" in p.name).data.materials[0]
red = next(p for p in carbine_parts if "identification stripe" in p.name).data.materials[0]
metal = next(p for p in carbine_parts if "bore sleeve" in p.name).data.materials[0]
dark = next(p for p in carbine_parts if "muzzle interior" in p.name).data.materials[0]
bpy.context.window.scene = export_scene


def scatter_box(name, location, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Housing bevel", "BEVEL")
    bevel.width, bevel.segments = .018, 2
    obj.data.materials.append(material)
    obj.parent = scatter_out


scatter_box("Flechette receiver", (0, .23, .196), (.355, .79, .253), black)
scatter_box("Green receiver shell", (0, .25, .279), (.373, .59, .127), green)
scatter_box("Crimson shell latch", (0, .38, .351), (.31, .096, .037), red)
scatter_box("Shell cassette", (0, .394, .083), (.274, .235, .204), green)
for x in (-.076, .076):
    for name, y, length, radius, material in [
        ("Barrel", .648, .238, .074, metal), ("Muzzle", .77, .045, .077, black),
        ("Bore", .794, .006, .048, dark),
    ]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=length,
                                            location=(x, y, .213), rotation=(math.pi / 2, 0, 0))
        obj = bpy.context.object
        obj.name = name
        obj.data.materials.append(material)
        obj.parent = scatter_out
muzzle(scatter_out, "scatter", (0, .80, .213))

for name, frames in clips.items():
    action = bpy.data.actions.new(name)
    data = export_rig.animation_data_create()
    data.action = action
    previous = {}
    for f, pose in enumerate(frames):
        for bone in export_rig.pose.bones:
            if bone.name.startswith("CTRL_"):
                continue
            position, rotation, _ = pose[bone.name].decompose()
            if bone.name in previous and rotation.dot(previous[bone.name]) < 0:
                rotation.negate()
            previous[bone.name] = rotation.copy()
            bone.rotation_mode = "QUATERNION"
            bone.location = position
            bone.rotation_quaternion = rotation
            bone.keyframe_insert("rotation_quaternion", frame=f, group=bone.name)
            bone.keyframe_insert("location", frame=f, group=bone.name)
    slot = data.action_slot
    for curve in action.layers[0].strips[0].channelbag(slot).fcurves:
        for key in curve.keyframe_points:
            key.interpolation = "LINEAR"
    track = data.nla_tracks.new()
    track.name = name
    data.action = None
    strip = track.strips.new(name, 0, action)
    strip.action_slot = slot
    track.mute = True

for bone in export_rig.pose.bones:
    bone.matrix_basis = Matrix.Identity(4)
export_scene.frame_start, export_scene.frame_end = 0, max(map(len, clips.values())) - 1
export_scene.frame_set(0)
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", use_active_scene=True,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_frame_range=False,
    export_frame_step=1, export_extras=True, export_yup=True, export_texcoords=False,
    export_cameras=False, export_lights=False, export_normals=True)
print(f"Exported {out.name}: {out.stat().st_size:,} bytes", flush=True)
