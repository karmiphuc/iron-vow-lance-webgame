"""Fit existing arsenal geometry to the editable Gatecrasher R2."""
import sys
from math import copysign, pi
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_prototype_combat import add_strike_track


arsenal, output = (Path(arg).resolve() for arg in sys.argv[sys.argv.index("--")+1:])
scene = bpy.context.scene
rig = bpy.data.objects["GATECRASHER / Rig"]
scene.frame_set(1)
if bpy.context.object and bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
existing = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(arsenal))
imported = set(bpy.data.objects)-existing


def weapon_group(name):
    return next(obj for obj in imported if obj.name == name or obj.get("name") == name)


def remove_hand_controls(obj, basis):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    unseen = set(mesh.verts)
    discard = []
    while unseen:
        queue = [unseen.pop()]
        for vertex in queue:
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in unseen:
                    unseen.remove(other)
                    queue.append(other)
        points = [basis @ v.co for v in queue]
        if (max(abs(p.x) for p in points)<.12 and max(p.y for p in points)<.21
                and min(p.y for p in points)<-.045 and min(p.z for p in points)>-.2
                and max(p.z for p in points)<.49):
            discard.extend(queue)
    bmesh.ops.delete(mesh, geom=discard, context="VERTS")
    mesh.to_mesh(obj.data)
    mesh.free()


def place(name, socket, transform):
    group = weapon_group(name)
    inverse = Matrix.Rotation(-pi/2, 4, "X") @ group.matrix_world.inverted()
    parts = [(obj, inverse @ obj.matrix_world) for obj in group.children_recursive if obj.type == "MESH"]
    for obj, basis in parts:
        if name == "vesper":
            remove_hand_controls(obj, basis)
            if not obj.data.vertices:
                continue
        else:
            # Lengthen the grip between its guard and pommel to clear the hand shell.
            restore = basis.inverted()
            for vertex in obj.data.vertices:
                point = basis @ vertex.co
                point.z += copysign(.30*min(1, abs(point.z)/.285), point.z)
                vertex.co = restore @ point
        imported.remove(obj)
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = socket
        obj.matrix_world = transform @ basis
    return [obj for obj, _ in parts if obj not in imported]


grip = rig.data.bones["Hardpoint.L"].matrix_local
blade_axis = -grip.to_3x3().col[0]
blade_face = grip.to_3x3().col[1]
blade = Matrix((blade_face.cross(blade_axis), blade_face, blade_axis)).transposed().to_4x4()
blade = blade @ Matrix.Scale(.60, 4)
blade.translation = grip.translation + Vector((0, -.012, 0))

pod = Matrix.Rotation(pi/2, 4, "X") @ Matrix.Scale(.83, 4)
pod.translation = Vector((-1.83, .01, 5.38))
socket = pod.translation.copy()

bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for name, parent, point, axis in (
    ("Shoulder Hardpoint.R", "Pauldron.R", socket, Vector((0, -.3, 0))),
    ("Shoulder Muzzle.R", "Shoulder Hardpoint.R", pod @ Vector((-.20, .59, 1.36)), Vector((0, -.25, 0))),
    ("Shoulder Muzzle2.R", "Shoulder Hardpoint.R", pod @ Vector((.20, .59, 1.36)), Vector((0, -.25, 0))),
    ("Cleaver Tip.L", "Hardpoint.L", blade @ Vector((0, -.20, 3.35)), blade_axis*.22),
):
    bone = rig.data.edit_bones.new(name)
    bone.head, bone.tail = point, point+axis
    bone.parent = rig.data.edit_bones[parent]
    bone.use_deform = False
    rig.data.collections["Sockets"].assign(bone)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()

blade_parts = place("cleaver", "Hardpoint.L", blade)
pod_parts = place("vesper", "Shoulder Hardpoint.R", pod)
for obj in imported:
    bpy.data.objects.remove(obj, do_unlink=True)


def bracket(name, center, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(bpy.data.materials[material])
    bevel = obj.modifiers.new("Mount edge bevel", "BEVEL")
    bevel.width, bevel.segments = .038, 2
    bevel = obj.modifiers.new("Machined normals", "WEIGHTED_NORMAL")
    matrix = obj.matrix_world.copy()
    obj.parent, obj.parent_type, obj.parent_bone = rig, "BONE", "Shoulder Hardpoint.R"
    obj.matrix_world = matrix
    return obj


bracket("Vesper / pauldron saddle", (-1.83, .015, 5.255), (.62, .67, .32), "HV-09 / frame")
bracket("Vesper / saddle insert", (-1.83, .025, 5.34), (.70, .74, .14), "HV-09 / steel")
rig["Equipment"] = "Local R2: Arc Cleaver at Hardpoint.L and Vesper at Shoulder Hardpoint.R."
add_strike_track(scene, rig, True)
scene.frame_set(1)
assert blade_parts and pod_parts
print("Mounted parts", [o.name for o in blade_parts], [o.name for o in pod_parts])
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(output))
