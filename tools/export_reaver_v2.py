"""Export Reaver R14 Hostile with a selectable module on each arm via Blender MCP.

Call export_reaver(source, output, left='Autocannon', right='Autocannon').
The source stays untouched; the isolated rest-pose scene is removed afterward.
Weapon options are Autocannon and Pulse pod. Gait dimensions are initial values.
"""
import re
from pathlib import Path
import bpy

DATA_COLLECTIONS = ('actions', 'armatures', 'cameras', 'collections', 'curves', 'images', 'lights', 'materials', 'meshes', 'node_groups', 'objects', 'scenes', 'textures', 'worlds')
MATERIAL_NAMES = {'Shell': 'paint_primary', 'Edge': 'paint_secondary', 'Raised': 'paint_accent', 'Sensor': 'visor', 'Flash': 'stack'}
BONE_NAMES = {'Root': 'root', 'Chassis': 'pelvis', 'Torso.Turret': 'spine', 'Optic': 'neck'}
for side in ('L', 'R'):
    for old, new in (('Shoulder', 'shoulder'), ('Elbow', 'elbow'), ('Hand', 'wrist')):
        BONE_NAMES[f'{old}.{side}'] = f'{new}.{side}'
    BONE_NAMES[f'Hardpoint_{side}H'] = f'socket.{side}'
for location, suffix in (('Front.L', 'LF'), ('Front.R', 'RF'), ('Rear.L', 'LB'), ('Rear.R', 'RB')):
    for old, new in (('Thigh', 'hip'), ('Greave', 'knee'), ('Foot', 'ankle')):
        BONE_NAMES[f'{old}.{location}'] = f'{new}.{suffix}'

def base(name): return re.sub(r'\.\d{3}$', '', name)

def part_for(bone):
    if bone == 'Optic': return 'pilot'
    if bone in ('Chassis', 'Torso.Turret'): return 'body'
    if bone.startswith(('Thigh.', 'Greave.', 'Foot.', 'Toe.', 'Sleeve.')): return 'legs'
    if bone.endswith('.L'): return 'left'
    if bone.endswith('.R'): return 'right'
    raise ValueError(f'Unclassified Reaver bone {bone}')

def export_reaver(source, output, left='Autocannon', right='Autocannon'):
    source, output = Path(source).expanduser().resolve(strict=True), Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists(): raise ValueError('Use an existing source and new GLB')
    if left not in ('Autocannon', 'Pulse pod') or right not in ('Autocannon', 'Pulse pod'): raise ValueError('Invalid weapon')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT': raise RuntimeError('Run in Object Mode')
    previous = window.scene
    existing = {key: set(getattr(bpy.data, key)) for key in DATA_COLLECTIONS}
    displaced = []
    try:
        for name in MATERIAL_NAMES.values():
            mat = bpy.data.materials.get(name)
            if mat: displaced.append((mat, name)); mat.name = '__reaver_saved_' + name
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if len(available.scenes) != 1: raise ValueError('Expected one source scene')
            staged.scenes = available.scenes
        scene = staged.scenes[0]; window.scene = scene
        rigs = [o for o in scene.objects if o.type == 'ARMATURE']
        if len(rigs) != 1 or base(rigs[0].name) != 'REAVER | mechanical rig': raise ValueError('Expected Reaver R14 rig')
        rig = rigs[0]; objects = {base(o.name): o for o in scene.objects}
        rig.data.pose_position = 'REST'; rig.animation_data_clear()
        for pb in rig.pose.bones:
            for constraint in list(pb.constraints): pb.constraints.remove(constraint)
        meshes = [(o, o.parent_bone) for o in scene.objects if o.type == 'MESH' and o.parent == rig]
        if len(meshes) != 280: raise ValueError(f'Unexpected chassis mesh count {len(meshes)}')
        selected = [rig]
        for side, kind in (('L', left), ('R', right)):
            carriage = objects[f'RECOIL_CARRIAGE_{side}']; module = objects[f'{kind}.{side} | standard module origin']; muzzle = objects[f'{kind}.{side} | MUZZLE']
            if module.parent != carriage or carriage.parent != rig: raise ValueError('Unexpected weapon attachment')
            muzzle.name = f'muzzle.{side}'
            for obj in (carriage, module, muzzle):
                if obj.animation_data: obj.animation_data_clear()
                obj.hide_viewport = obj.hide_render = False
                selected.append(obj)
            meshes.extend((o, f'Hand.{side}') for o in module.children if o.type == 'MESH')
        # Include the two actuator pieces for each arm; their source constraints
        # animate mechanical struts, so export their rest state with the arm.
        for side in ('L', 'R'):
            for anchor in (f'Actuator torso clevis {side}', f'Actuator arm clevis {side}'):
                obj = objects[anchor]; selected.append(obj)
                for c in list(obj.constraints): obj.constraints.remove(c)
                meshes.extend((child, f'Hand.{side}') for child in obj.children if child.type == 'MESH')
        bones = rig.data.bones
        hip, knee, ankle = (bones[n].head_local.copy() for n in ('Thigh.Front.L', 'Greave.Front.L', 'Foot.Front.L'))
        pelvis, spine = (bones[n].head_local.copy() for n in ('Chassis', 'Torso.Turret'))
        dimensions = dict(py=pelvis.z, spY=spine.z-pelvis.z, legA=(hip-knee).length, legB=(knee-ankle).length, ankleH=ankle.z, restX=abs(ankle.x), restZ=-ankle.y, lift=.5, stance=.86, toe=.17, reverse=False, quad=True, reach=0., phases=[0., .5, .5, 0.], sway=.16)
        bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active = rig
        for old, new in BONE_NAMES.items(): bones[old].name = new
        for key, value in dimensions.items(): bones['root'][key] = value
        bpy.ops.object.mode_set(mode='EDIT')
        for suffix in ('LF', 'RF', 'LB', 'RB'):
            hipbone = rig.data.edit_bones[f'hip.{suffix}']; mount = rig.data.edit_bones.new(f'mount.{suffix}')
            mount.head = hipbone.head; mount.tail = hipbone.head + (hipbone.tail-hipbone.head).normalized() * .1
            mount.parent = hipbone.parent; hipbone.parent = mount; mount.use_deform = False
        bpy.ops.object.mode_set(mode='OBJECT')
        sensor = objects['Inset rangefinder'].material_slots[0].material
        if not sensor or base(sensor.name) != 'Sensor': raise ValueError('Missing source sensor material')
        stack = sensor.copy(); stack.name = 'stack'
        for obj, bone in meshes:
            part = part_for(bone); obj['part'] = obj.data['part'] = part
            obj.hide_viewport = obj.hide_render = False
            if obj.name.startswith(('Shoulder | faceted cap', 'Shoulder panel bevel')):
                obj['detach'] = obj.data['detach'] = True
            for slot in obj.material_slots:
                if slot.material and base(slot.material.name) in MATERIAL_NAMES: slot.material.name = MATERIAL_NAMES[base(slot.material.name)]
            if 'muzzle brake' in obj.name or 'emitter element' in obj.name:
                obj.data.materials.clear(); obj.data.materials.append(stack)
            selected.append(obj)
        for name in ('visor', 'stack'):
            mat = bpy.data.materials.get(name)
            if not mat or not mat.use_nodes: raise ValueError(f'Missing light material {name}')
            shader = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not shader: raise ValueError(f'Missing shader in {name}')
            shader.inputs['Emission Color'].default_value = shader.inputs['Base Color'].default_value
            shader.inputs['Emission Strength'].default_value = .5
        # Batch only pieces that share rigid attachment and damage semantics.
        groups = {}
        for obj, bone in meshes:
            groups.setdefault((obj.parent, obj.parent_type, obj.parent_bone, obj['part'], bool(obj.get('detach', False))), []).append(obj)
        for group in groups.values():
            if len(group) < 2: continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in group: obj.select_set(True)
            bpy.context.view_layer.objects.active = group[0]
            if bpy.ops.object.join() != {'FINISHED'}: raise RuntimeError('Batch join failed')
        # Rebuild selection after joins; removed Blender object references are invalid.
        bpy.ops.object.select_all(action='DESELECT')
        for obj in scene.objects:
            if obj == rig or (obj.type == 'MESH' and obj.get('part')) or (obj.type == 'EMPTY' and (base(obj.name).startswith(('RECOIL_CARRIAGE_', 'Actuator ')) or obj.name.startswith('muzzle.') or 'standard module origin' in obj.name and any(obj.name.startswith(f'{kind}.{side} |') for side, kind in (('L', left), ('R', right))))): obj.select_set(True)
        bpy.context.view_layer.objects.active = rig
        result = bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, use_active_scene=True, export_meshopt_compression_enable=True, export_animations=False, export_extras=True, export_yup=True, export_def_bones=False, export_rest_position_armature=True, export_cameras=False, export_lights=False)
        if result != {'FINISHED'} or not output.is_file(): raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene = previous
        added = [block for key, prior in existing.items() for block in getattr(bpy.data, key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material, name in displaced: material.name = name
