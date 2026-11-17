"""Prepare LI-01 R32 Service or LI-02 E7 with the right-hand carbine.

Call export_infantry(source, output) through Blender MCP. Appends an isolated
scene, exports a rest pose, then removes appended data and restores the scene.
The gait values are initial estimates; validate the result in the runtime.
"""
import re
from pathlib import Path
import bpy

DATA_COLLECTIONS = ('actions', 'armatures', 'cameras', 'collections', 'curves',
                    'images', 'lights', 'materials', 'meshes', 'node_groups',
                    'objects', 'scenes', 'textures', 'worlds')
BONE_NAMES = {'Root': 'root', 'Pelvis': 'pelvis', 'Torso': 'spine', 'Head': 'neck'}
for side in ('L', 'R'):
    for source, target in (('UpperArm', 'shoulder'), ('Forearm', 'elbow'),
                           ('Hand', 'wrist'), ('Socket.Weapon', 'socket'),
                           ('Thigh', 'hip'), ('Shin', 'knee'), ('Foot', 'ankle')):
        BONE_NAMES[f'{source}.{side}'] = f'{target}.{side}'
MATERIAL_NAMES = {
    'Service livery / shell': 'paint_primary',
    'LI-02 / slate armor plates': 'paint_primary',
    'Service livery / trim': 'paint_accent',
    'Service livery / inset': 'paint_secondary',
    'LI-02 / ceramic armor overlays': 'paint_secondary',
    'Service livery / crimson optics': 'visor',
    'Service weapons / crimson witness marks': 'stack',
}


def base(name):
    return re.sub(r'\.\d{3}$', '', name)


def part_for(bone):
    if bone == 'Head': return 'pilot'
    if bone in ('Pelvis', 'Torso'): return 'body'
    if bone.startswith(('Thigh.', 'Shin.', 'Foot.', 'Toe.')): return 'legs'
    if bone.endswith('.L'): return 'left'
    if bone.endswith('.R'): return 'right'
    raise ValueError(f'Unclassified infantry bone: {bone}')


def batch_rigid_meshes(meshes):
    """Join only meshes with identical rigid attachment and damage semantics.

    Joining preserves world transforms and material assignments. The rifle's
    pieces stay beneath the authored carbine empty, separate from the hand.
    """
    groups = {}
    for obj in meshes:
        key = (obj.parent, obj.parent_type, obj.parent_bone,
               obj.get('part'), bool(obj.get('detach', False)))
        groups.setdefault(key, []).append(obj)
    merged = []
    bpy.ops.object.select_all(action='DESELECT')
    for group in groups.values():
        active = group[0]
        if len(group) > 1:
            for obj in group: obj.select_set(True)
            bpy.context.view_layer.objects.active = active
            if bpy.ops.object.join() != {'FINISHED'}:
                raise RuntimeError(f'Failed to batch {active.name}')
            active.select_set(False)
        merged.append(active)
    return merged


def export_infantry(source, output):
    source, output = Path(source).expanduser().resolve(strict=True), Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists():
        raise ValueError('Use an existing Blender source and a new GLB output path')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT':
        raise RuntimeError('Run with a Blender window in Object Mode')
    previous_scene = window.scene
    existing = {key: set(getattr(bpy.data, key)) for key in DATA_COLLECTIONS}
    displaced = []
    try:
        for name in set(MATERIAL_NAMES.values()):
            material = bpy.data.materials.get(name)
            if material:
                displaced.append((material, name)); material.name = '__infantry_saved_' + name
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if len(available.scenes) != 1: raise ValueError('Expected one source scene')
            staged.scenes = available.scenes
        scene = staged.scenes[0]
        window.scene = scene
        rigs = [o for o in scene.objects if o.type == 'ARMATURE']
        if len(rigs) != 1 or base(rigs[0].name) not in ('LI-01 | LINE INFANTRY', 'LI-02 | LINE INFANTRY ELITE'):
            raise ValueError('Expected the LI-01 R32 Service or LI-02 E7 source')
        rig = rigs[0]
        objects = {base(o.name): o for o in scene.objects}
        rifle = objects['Carbine.R | snap-to-grip origin']
        muzzle = next(o for o in rifle.children if base(o.name) == 'Carbine.R | muzzle +Y')
        socket = objects['WEAPON_SOCKET_R']
        if rifle.parent != socket or socket.parent != rig or socket.parent_bone != 'Socket.Weapon.R':
            raise ValueError('Unexpected carbine attachment')
        meshes = [(o, o.parent_bone) for o in scene.objects if o.type == 'MESH' and o.parent == rig]
        weapon = [o for o in rifle.children if o.type == 'MESH']
        if len(meshes) < 500 or len(weapon) != 32:
            raise ValueError(f'Unexpected source assembly: {len(meshes)} chassis, {len(weapon)} carbine meshes')
        rig.data.pose_position = 'REST'
        rig.animation_data_clear()
        for obj in [socket, rifle, muzzle] + weapon:
            if obj.animation_data: obj.animation_data_clear()
            obj.hide_viewport = False; obj.hide_render = False
        muzzle.name = 'muzzle.main'
        bones = rig.data.bones
        hip, knee, ankle = (bones[name].head_local.copy() for name in ('Thigh.L', 'Shin.L', 'Foot.L'))
        pelvis, spine = (bones[name].head_local.copy() for name in ('Pelvis', 'Torso'))
        dims = dict(py=pelvis.z, spY=spine.z-pelvis.z, legA=(hip-knee).length,
                    legB=(knee-ankle).length, ankleH=ankle.z, restX=abs(ankle.x),
                    restZ=-ankle.y, lift=.5, stance=.86, toe=.17, reverse=False,
                    quad=False, reach=0., phases=[0., .5], sway=.16)
        bpy.ops.object.select_all(action='DESELECT')
        rig.select_set(True); bpy.context.view_layer.objects.active = rig
        for old, new in BONE_NAMES.items(): bones[old].name = new
        for key, value in dims.items(): bones['root'][key] = value
        for obj, bone in meshes + [(obj, 'Hand.R') for obj in weapon]:
            part = part_for(bone)
            obj['part'] = obj.data['part'] = part
            if bone.startswith(('ShoulderShell.', 'Osode.')):
                obj['detach'] = obj.data['detach'] = True
            for slot in obj.material_slots:
                if slot.material and base(slot.material.name) in MATERIAL_NAMES:
                    # Names may already have been changed for earlier objects.
                    target = MATERIAL_NAMES[base(slot.material.name)]
                    existing_material = bpy.data.materials.get(target)
                    if existing_material and existing_material != slot.material:
                        slot.material = existing_material
                    else:
                        slot.material.name = target
            obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles) >= 300:
                mod = obj.modifiers.new('Infantry web triangle budget', 'DECIMATE')
                mod.ratio = .12; mod.use_collapse_triangulate = True
                obj.modifiers.move(len(obj.modifiers)-1, 0)
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=mod.name)
            obj.select_set(True)
        merged = batch_rigid_meshes([obj for obj, _ in meshes] + weapon)
        for obj in merged: obj.select_set(True)
        # The recovered optics and weapon witness marks are non-emissive in
        # the source. Give the two contract light channels a restrained glow.
        for name in ('visor', 'stack'):
            material = bpy.data.materials.get(name)
            if not material or not material.use_nodes:
                raise ValueError(f'Missing node material {name}')
            principled = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not principled:
                raise ValueError(f'Missing principled shader in {name}')
            principled.inputs['Emission Color'].default_value = principled.inputs['Base Color'].default_value
            principled.inputs['Emission Strength'].default_value = 0.5
        for obj in (rig, socket, rifle, muzzle): obj.select_set(True)
        bpy.context.view_layer.objects.active = rig
        result = bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
            use_selection=True, use_active_scene=True, export_meshopt_compression_enable=True,
            export_animations=False, export_extras=True, export_yup=True,
            export_def_bones=False, export_rest_position_armature=True,
            export_cameras=False, export_lights=False)
        if result != {'FINISHED'} or not output.is_file(): raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene = previous_scene
        added = [block for key, prior in existing.items() for block in getattr(bpy.data, key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material, name in displaced: material.name = name
