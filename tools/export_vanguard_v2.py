"""Export Vanguard R10 with Hailstorm right and Piledriver left through Blender MCP.

Call export_vanguard(source, output). Source and active scene stay unchanged.
Only this fitted configuration is exported; gait and rest pose require review.
"""
import re
from pathlib import Path
import bpy

DATA_COLLECTIONS = ('actions', 'armatures', 'cameras', 'collections', 'curves', 'images', 'lights', 'materials', 'meshes', 'node_groups', 'objects', 'scenes', 'textures', 'worlds')
MATERIAL_NAMES = {'Paint 01 | Onyx ceramic':'paint_primary', 'Paint 02 | Deep field green':'paint_secondary', 'Paint 03 | Crimson red':'paint_accent', 'Optic | Crimson filter':'visor', 'emissive_rail':'stack'}
BONE_NAMES = {'torso':'spine','head':'neck'}
for side in ('L','R'):
    for old,new in (('upper','shoulder'),('fore','elbow'),('hand','wrist'),('thigh','hip'),('shin','knee'),('foot','ankle')): BONE_NAMES[f'{old}.{side}'] = f'{new}.{side}'

def base(name): return re.sub(r'\.\d{3}$','',name)

def part_for(bone):
    if bone == 'head': return 'pilot'
    if bone in ('root','pelvis','torso'): return 'body'
    if bone.startswith(('thigh.','shin.','foot.')): return 'legs'
    if bone.endswith('.L'): return 'left'
    if bone.endswith('.R'): return 'right'
    raise ValueError(f'Unclassified Vanguard bone {bone}')

def export_vanguard(source, output):
    source,output=Path(source).expanduser().resolve(strict=True),Path(output).expanduser().resolve()
    if source.suffix!='.blend' or output.suffix!='.glb' or output.exists(): raise ValueError('Use an existing source and a new GLB')
    window=bpy.context.window
    if not window or bpy.context.mode!='OBJECT': raise RuntimeError('Run in Object Mode')
    previous=window.scene
    existing={key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS}; displaced=[]
    try:
        for name in MATERIAL_NAMES.values():
            mat=bpy.data.materials.get(name)
            if mat: displaced.append((mat,name)); mat.name='__vanguard_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,staged):
            if len(available.scenes)!=1: raise ValueError('Expected one source scene')
            staged.scenes=available.scenes
        scene=staged.scenes[0]; window.scene=scene
        rigs=[o for o in scene.objects if o.type=='ARMATURE']
        if len(rigs)!=1 or base(rigs[0].name)!='VANGUARD | pose rig': raise ValueError('Expected Vanguard R10')
        rig=rigs[0]; objects={base(o.name):o for o in scene.objects}
        rig.animation_data_clear(); rig.data.pose_position='REST'
        for pb in rig.pose.bones:
            for c in list(pb.constraints): pb.constraints.remove(c)
        meshes=[(o,o.parent_bone) for o in scene.objects if o.type=='MESH' and o.parent==rig and o.visible_get() and not o.hide_render]
        if len(meshes)<200: raise ValueError(f'Unexpected chassis assembly {len(meshes)}')
        selected=[rig]
        for side,carrier,child,marker in (('R','hailstorm | fitted carrier','Hailstorm | six-barrel rotor','Muzzle.hailstorm'),('L','piledriver | fitted carrier','Piledriver | translating auger','Tip.piledriver')):
            socket,carrier_obj,child_obj,marker_obj=(objects[n] for n in (f'SOCKET.weapon.{side}',carrier,child,marker))
            if socket.parent!=rig or socket.parent_bone!=f'hand.{side}' or carrier_obj.parent!=socket or child_obj.parent!=carrier_obj: raise ValueError('Unexpected fitted weapon hierarchy')
            marker_obj.name='muzzle.main' if side=='R' else 'tip.piledriver'
            for obj in (socket,carrier_obj,child_obj,marker_obj):
                obj.animation_data_clear(); obj.hide_viewport=obj.hide_render=False
                for c in list(obj.constraints): obj.constraints.remove(c)
                selected.append(obj)
            for obj in scene.objects:
                if obj.type=='MESH' and obj.parent in (carrier_obj,child_obj): meshes.append((obj,f'hand.{side}'))
        bones=rig.data.bones
        hip,knee,ankle=(bones[n].head_local.copy() for n in ('thigh.L','shin.L','foot.L'))
        pelvis,spine=(bones[n].head_local.copy() for n in ('pelvis','torso'))
        dimensions=dict(py=pelvis.z,spY=spine.z-pelvis.z,legA=(hip-knee).length,legB=(knee-ankle).length,ankleH=ankle.z,restX=abs(ankle.x),restZ=-ankle.y,lift=.5,stance=.86,toe=.17,reverse=False,quad=False,reach=0.,phases=[0.,.5],sway=.16)
        bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
        for old,new in BONE_NAMES.items(): bones[old].name=new
        for key,value in dimensions.items(): bones['root'][key]=value
        bpy.ops.object.mode_set(mode='EDIT')
        for side in ('L','R'):
            wrist=rig.data.edit_bones[f'wrist.{side}']; socket=rig.data.edit_bones.new(f'socket.{side}')
            socket.parent=wrist; socket.head=wrist.tail; socket.tail=wrist.tail+(wrist.tail-wrist.head).normalized()*.1; socket.use_deform=False
        bpy.ops.object.mode_set(mode='OBJECT')
        bore = next((o for o,b in meshes if o.name.startswith('Back | exhaust bore')), None)
        if not bore or not bore.data.materials: raise ValueError('Missing exhaust geometry')
        stack = bore.data.materials[0].copy(); stack.name = 'stack'
        shader = next((n for n in stack.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not shader: raise ValueError('Missing exhaust shader')
        shader.inputs['Emission Color'].default_value = (.12, .18, .25, 1.)
        shader.inputs['Emission Strength'].default_value = .5
        for obj,bone in meshes:
            part=part_for(bone); obj['part']=obj.data['part']=part
            if obj.name not in scene.collection.objects: scene.collection.objects.link(obj)
            obj.hide_viewport=obj.hide_render=False; obj.hide_set(False); obj.hide_select=False
            if 'sloping scalloped upper guard' in obj.name: obj['detach']=obj.data['detach']=True
            if obj.name.startswith('Back | exhaust bore'): obj.data.materials.clear(); obj.data.materials.append(stack)
            for slot in obj.material_slots:
                if slot.material and base(slot.material.name) in MATERIAL_NAMES: slot.material.name=MATERIAL_NAMES[base(slot.material.name)]
            obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles)>=300:
                mod=obj.modifiers.new('Vanguard web triangle budget','DECIMATE'); mod.ratio=.35; mod.use_collapse_triangulate=True
                obj.modifiers.move(len(obj.modifiers)-1,0); bpy.context.view_layer.objects.active=obj
                if bpy.ops.object.modifier_apply(modifier=mod.name)!={'FINISHED'}: raise RuntimeError('Decimation failed')
        bpy.context.view_layer.update()
        groups={}
        for obj,bone in meshes: groups.setdefault((obj.parent,obj.parent_type,obj.parent_bone,obj['part'],bool(obj.get('detach',False))),[]).append(obj)
        for group in groups.values():
            if len(group)<2: continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in group: obj.select_set(True)
            if min(abs(v) for v in group[0].scale)<1e-5: raise ValueError(f'Degenerate donor {group[0].name}')
            bpy.context.view_layer.objects.active=group[0]
            if bpy.ops.object.join()!={'FINISHED'}: raise RuntimeError(f'Batch join failed: {group[0].name} size {len(group)} visible {group[0].visible_get()}')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected: obj.select_set(True)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.get('part'): obj.select_set(True)
        bpy.context.view_layer.objects.active=rig
        result=bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,use_active_scene=True,export_meshopt_compression_enable=True,export_animations=False,export_extras=True,export_yup=True,export_def_bones=False,export_rest_position_armature=True,export_cameras=False,export_lights=False)
        if result!={'FINISHED'} or not output.is_file(): raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene=previous
        added=[block for key,prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material,name in displaced: material.name=name
