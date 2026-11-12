"""Fit the shipped Gatecrasher weapons to the Samurai Blender rig."""
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

source, output = (Path(s).resolve() for s in sys.argv[sys.argv.index("--")+1:])
scene = bpy.context.scene
rig = next(o for o in scene.objects if o.type == "ARMATURE")
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
rig.data.pose_position = "REST"
scene.frame_set(1)
with bpy.data.libraries.load(str(source)) as (old, new):
    new.objects = [name for name in old.objects if name == rig.name or
                   name == "Cannon Slide / rigid assembly" or
                   name.startswith(("cleaver__", "vesper__", "Vesper /"))]
donor = next(o for o in new.objects if o.type == "ARMATURE")
weapons = [o for o in new.objects if o.type == "MESH"]
bay = bpy.data.collections.new("HV-09 | Equipment")
scene.collection.children.link(bay)
bay.objects.link(donor)
for part in weapons:
    bay.objects.link(part)
donor.data.pose_position = "REST"
bpy.context.view_layer.update()

old = {b.name: (b.head_local.copy(), b.tail_local.copy(), b.matrix_local.to_3x3().col[2].copy())
       for b in donor.data.bones}
old_wrist = donor.data.bones["Wrist.L"].matrix_local.to_quaternion()
new_wrist = rig.data.bones["Wrist.L"].matrix_local.to_quaternion()
rig["cleaver_wrist_correction"] = tuple(old_wrist.inverted() @ new_wrist)
rest = {o.name: o.matrix_world.copy() for o in weapons}
wrist = rig.data.bones["Wrist.R"].head_local.copy()
grip = rig.data.bones["Hardpoint.L"].head_local.copy()
offsets = {
    "Cannon Slide": wrist - old["Wrist.R"][0] + Vector((0, -.14, -.12)),
    "Hardpoint.L": grip - old["Hardpoint.L"][0],
    "Shoulder Hardpoint.R": Vector((.02, .015, .02)),
}

bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bones = rig.data.edit_bones
unused = bones.get("Hardpoint.R")
if unused is not None:
    bones.remove(unused)
slide = bones["Cannon Slide"]
slide.head = wrist
slide.tail = wrist + old["Cannon Slide"][1] - old["Cannon Slide"][0]
slide.align_roll(old["Cannon Slide"][2])
for name, parent, socket in [
    ("Muzzle", "Cannon Slide", "Cannon Slide"),
    ("Muzzle.Upper", "Cannon Slide", "Cannon Slide"),
    ("Muzzle.Lower", "Cannon Slide", "Cannon Slide"),
    ("Cleaver Tip.L", "Hardpoint.L", "Hardpoint.L"),
    ("Shoulder Hardpoint.R", "Pauldron.R", "Shoulder Hardpoint.R"),
    ("Shoulder Muzzle.R", "Shoulder Hardpoint.R", "Shoulder Hardpoint.R"),
    ("Shoulder Muzzle2.R", "Shoulder Hardpoint.R", "Shoulder Hardpoint.R"),
]:
    bone = bones.get(name) or bones.new(name)
    bone.parent = bones[parent]
    bone.use_connect = False
    bone.use_deform = False
    head, tail, roll = old[name]
    bone.head, bone.tail = head + offsets[socket], tail + offsets[socket]
    bone.align_roll(roll)
    rig.data.collections["Sockets"].assign(bone)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()

for part in weapons:
    name = part.name
    socket = ("Hardpoint.L" if name.startswith("cleaver__") else
              "Cannon Slide" if name.startswith("Cannon Slide") else "Shoulder Hardpoint.R")
    for modifier in list(part.modifiers):
        if modifier.type == "ARMATURE":
            part.modifiers.remove(modifier)
    part.vertex_groups.clear()
    part.parent, part.parent_type, part.parent_bone = rig, "BONE", socket
    part.matrix_parent_inverse.identity()
    part.matrix_world = Matrix.Translation(offsets[socket]) @ rest[name]
    part["equipment"] = {"Hardpoint.L":"cleaver","Shoulder Hardpoint.R":"vesper","Cannon Slide":"morrow"}[socket]
bpy.data.objects.remove(donor, do_unlink=True)

# The receiver joins the black right gripper to the two recoiling barrels.
bpy.ops.mesh.primitive_cube_add(size=1, location=wrist+Vector((0,-.40,-.13)))
receiver = bpy.context.object
receiver.name = "Morrow / wrist receiver"
receiver.dimensions = (.68,.72,.59)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
receiver.data.materials.append(bpy.data.materials["HV-09 Paint | Black titanium mechanisms"])
bevel = receiver.modifiers.new("Receiver bevel","BEVEL")
bevel.width, bevel.segments = .047, 3
matrix = receiver.matrix_world.copy()
receiver.parent, receiver.parent_type, receiver.parent_bone = rig, "BONE", "Wrist.R"
receiver.matrix_world = matrix
receiver["equipment"] = "morrow"
for collection in list(receiver.users_collection):
    collection.objects.unlink(receiver)
bay.objects.link(receiver)

# The production strike baker expects the original control collection.
controls = rig.data.collections["Controls"]
for group in ("01 Body and aim","02 Arms and pauldrons","03 Feet and knees","04 Hands"):
    for bone in rig.data.collections[group].bones:
        if bone.name.startswith(("Finger","Thumb")):
            continue
        controls.assign(bone)
rig.data.pose_position = "POSE"
studio = bpy.data.collections["Studio | Four reference views"]
studio.hide_render = True
rig.animation_data.use_nla = True
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(output))
