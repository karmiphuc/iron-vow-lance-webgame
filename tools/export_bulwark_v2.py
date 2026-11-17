"""Export the approved Bulwark-Aegis Combat scene through Blender MCP."""
import hashlib
from pathlib import Path

import bpy
from mathutils import Vector

from export_infantry_v2 import DATA_COLLECTIONS, base, batch_rigid_meshes

SOURCE_SHA = 'c0c8444dbd5ebe810d972b72b620b0d95cbdb61835d80c9a7743429e66fc603f'
SOURCE_SCENE = 'BULWARK-AEGIS | Default loadout'
JOINTS = {'Root': 'root', 'Pelvis': 'pelvis', 'Torso': 'spine', 'Head': 'neck'}
for side in ('L', 'R'):
    for original, canonical in (
        ('Upper arm', 'shoulder'), ('Forearm', 'elbow'), ('Hand', 'wrist'),
        ('Thigh', 'hip'), ('Shin', 'knee'), ('Foot', 'ankle'),
    ):
        JOINTS[f'{original}.{side}'] = f'{canonical}.{side}'
PAINT = {
    'Armor / forest green': 'paint_primary',
    'Armor / carbon black': 'paint_secondary',
    'Armor / crimson red': 'paint_accent',
    'Sensor / crimson glass': 'visor',
}


def chassis_part(bone):
    if bone == 'Head':
        return 'pilot'
    if bone in ('Pelvis', 'Torso'):
        return 'body'
    if bone.startswith(('Thigh.', 'Shin.', 'Foot.', 'Toe.')):
        return 'legs'
    if bone.endswith(('.L', '.R')):
        return 'left' if bone.endswith('.L') else 'right'
    raise ValueError(f'Unexpected Bulwark-Aegis attachment: {bone}')


def simplify_assembly(scene, objects, owners, rig, shield, blade):
    # Preserve the full authored shield and cleaver. A single bevel segment on
    # the rigid chassis preserves its chamfers and leaves room for both modules.
    for obj in owners:
        for modifier in obj.modifiers:
            if modifier.type == 'BEVEL':
                modifier.segments = 1
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    stage = scene.collection
    floor = float('inf')
    copied = []
    shield_front = None
    vent_material = None
    for obj in objects:
        rendered = obj.evaluated_get(graph)
        mesh = bpy.data.meshes.new_from_object(rendered, preserve_all_data_layers=True, depsgraph=graph)
        copy = bpy.data.objects.new(obj.name, mesh)
        stage.objects.link(copy)
        copy.parent = obj.parent
        copy.parent_type = obj.parent_type
        copy.parent_bone = obj.parent_bone
        copy.matrix_parent_inverse = obj.matrix_parent_inverse.copy()
        copy.matrix_basis = obj.matrix_basis.copy()
        if obj.parent == rig:
            owner = owners[obj]
            part = chassis_part(owner)
            if owner.startswith('Foot.'):
                floor = min(floor, min((rendered.matrix_world @ vert.co).z for vert in mesh.vertices))
            if owner.startswith('Pauldron.') and 'removable plate' in obj.name:
                copy['detach'] = mesh['detach'] = True
            if obj.name.startswith('Back / vent recess.'):
                if vent_material is None:
                    vent_material = mesh.materials[0].copy()
                    vent_material.name = 'stack'
                    shader = next(n for n in vent_material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
                    shader.inputs['Emission Color'].default_value = (.08, .027, .013, 1)
                    shader.inputs['Emission Strength'].default_value = .4
                mesh.materials[0] = vent_material
        elif obj.parent == shield:
            part = 'left'
            if obj.name.startswith('Aegis / removable upper strike tile'):
                # The center of the tile's forward face is the bash contact.
                to_shield = shield.matrix_world.inverted() @ rendered.matrix_world
                vertices = [to_shield @ vertex.co for vertex in mesh.vertices]
                min_x, max_x = min(v.x for v in vertices), max(v.x for v in vertices)
                min_z, max_z = min(v.z for v in vertices), max(v.z for v in vertices)
                front = max(vertices, key=lambda v: abs(v.y))
                shield_front = Vector(((min_x + max_x) / 2, front.y, (min_z + max_z) / 2))
        elif obj.parent == blade:
            part = 'right'
        else:
            raise ValueError(f'Unexpected Bulwark-Aegis mesh: {obj.name}')
        copy['part'] = mesh['part'] = part
        for slot in copy.material_slots:
            if slot.material and base(slot.material.name) in PAINT:
                slot.material.name = PAINT[base(slot.material.name)]
        copied.append(copy)
    if shield_front is None or vent_material is None or not 0 <= floor < .1:
        raise ValueError('Expected the authored shield strike tile, vents and floor')
    return copied, shield_front, floor


def export_bulwark(source, output):
    """Append the source into an isolated scene, export, then restore the active scene."""
    source, output = Path(source).expanduser().resolve(strict=True), Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists():
        raise ValueError('Use the Combat source and a new GLB output path')
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA:
        raise ValueError('Expected the approved Bulwark-Aegis Combat scene')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT':
        raise RuntimeError('Run Blender in Object Mode')
    previous = window.scene
    existing = {name: set(getattr(bpy.data, name)) for name in (*DATA_COLLECTIONS, 'fonts')}
    displaced = []
    try:
        for name in (*PAINT.values(), 'stack'):
            material = bpy.data.materials.get(name)
            if material:
                displaced.append((material, name))
                material.name = f'__bulwark_saved_{name}'
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if SOURCE_SCENE not in available.scenes:
                raise ValueError('Missing the default Bulwark-Aegis loadout scene')
            staged.scenes = [SOURCE_SCENE]
        scene = staged.scenes[0]
        window.scene = scene
        rig = next(o for o in scene.objects if o.type == 'ARMATURE')
        if base(rig.name) != 'BULWARK-AEGIS | Enemy melee rig' or len(rig.data.bones) != 58:
            raise ValueError('Expected the Bulwark-Aegis Combat rig')
        socket_l, socket_r, shield, blade = (
            next(o for o in scene.objects if base(o.name) == name) for name in (
                'Socket.Hand.L', 'Socket.Hand.R', 'Aegis | Tower shield module',
                'Arc Cleaver | Existing Iron Vow module',
            )
        )
        if shield.parent != socket_l or blade.parent != socket_r:
            raise ValueError('Expected the left shield and right-hand cleaver')
        tip = next(o for o in blade.children if base(o.name) == 'tip')
        rig.animation_data_clear()
        rig.data.pose_position = 'REST'
        objects = [o for o in scene.objects if o.type in {'MESH', 'FONT'} and o.parent in (rig, shield, blade)]
        owners = {o: o.parent_bone for o in objects if o.parent == rig}
        copies, shield_front, floor = simplify_assembly(scene, objects, owners, rig, shield, blade)
        bones = rig.data.bones
        pelvis, spine = (bones[name].head_local.copy() for name in ('Pelvis', 'Torso'))
        hip, knee, ankle = (bones[name].head_local.copy() for name in ('Thigh.L', 'Shin.L', 'Foot.L'))
        for old, new in JOINTS.items():
            bones[old].name = new
        extras = dict(py=pelvis.z-floor, spY=spine.z-pelvis.z,
                      legA=(hip-knee).length, legB=(knee-ankle).length, ankleH=ankle.z-floor,
                      restX=abs(ankle.x), restZ=-ankle.y, lift=.43, stance=.88,
                      toe=.15, reverse=False, quad=False, reach=0., phases=[0., .5], sway=.13)
        for key, value in extras.items():
            bones['root'][key] = value
        bones['root']['sourceSha256'] = SOURCE_SHA
        rig.location.z -= floor
        socket_l.name, socket_r.name = 'socket.L', 'socket.R'
        shield.name, blade.name = 'module.aegis-shield', 'module.aegis-cleaver'
        tip.name = 'strike.tip.aegis-cleave'
        bash = bpy.data.objects.new('strike.tip.aegis-bash', None)
        scene.collection.objects.link(bash)
        bash.parent = shield
        bash.location = shield_front
        optic = bpy.data.materials['visor']
        shader = next(n for n in optic.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        shader.inputs['Emission Color'].default_value = shader.inputs['Base Color'].default_value
        shader.inputs['Emission Strength'].default_value = .55

        meshes = batch_rigid_meshes(copies)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [*meshes, rig, socket_l, socket_r, shield, blade, tip, bash]:
            obj.select_set(True)
        result = bpy.ops.export_scene.gltf(
            filepath=str(output), export_format='GLB', use_selection=True, use_active_scene=True,
            export_meshopt_compression_enable=True, export_animations=False, export_extras=True,
            export_yup=True, export_def_bones=False, export_rest_position_armature=True,
            export_cameras=False, export_lights=False,
        )
        if result != {'FINISHED'} or not output.is_file():
            raise RuntimeError(f'Failed to export Bulwark-Aegis: {result}')
    finally:
        window.scene = previous
        bpy.data.batch_remove(ids=[
            block for name, prior in existing.items() for block in getattr(bpy.data, name) if block not in prior
        ])
        for material, original in displaced:
            material.name = original
