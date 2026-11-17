"""Export approved Lion R15 extended-follow-through source through Blender MCP.

Call export_lion(source, output). The rig retains all three left melee mounts,
their authored strike tips, a closed grip from frame 101, and the three
evaluated left-hand strike clips at 24 frames per second.
"""
import json
import re
from pathlib import Path
import bpy
from mathutils import Matrix

DATA_COLLECTIONS=('actions','armatures','cameras','collections','curves','images','lights','materials','meshes','node_groups','objects','scenes','textures','worlds')
MATERIAL_NAMES={'01 Black | armor and frame':'paint_primary','02 Gold | machined accents':'paint_secondary','03 Red | core and inserts':'paint_accent'}
BONE_NAMES={'chest':'spine'}
for side in ('L','R'):
    for old,new in (('upper_arm','shoulder'),('forearm','elbow'),('hand','wrist'),('thigh','hip'),('shin','knee'),('foot','ankle')): BONE_NAMES[f'{old}.{side}']=f'{new}.{side}'

def base(name): return re.sub(r'\.\d{3}$','',name)

def part_for(bone):
    if bone=='head': return 'pilot'
    if bone in ('root','pelvis','waist','chest','neck') or bone.startswith(('pack.','pylon.','vane.')): return 'body'
    if bone.startswith(('thigh.','shin.','foot.','toe.')): return 'legs'
    if bone.endswith('.L'): return 'left'
    if bone.endswith('.R'): return 'right'
    raise ValueError(f'Unclassified Lion bone {bone}')

def export_lion(source,output):
    source,output=Path(source).expanduser().resolve(strict=True),Path(output).expanduser().resolve()
    if source.suffix!='.blend' or output.suffix!='.glb' or output.exists(): raise ValueError('Use existing source and new output')
    window=bpy.context.window
    if not window or bpy.context.mode!='OBJECT': raise RuntimeError('Run in Object Mode')
    previous=window.scene; existing={key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS}; displaced=[]
    try:
        for name in (*MATERIAL_NAMES.values(),'visor','stack'):
            mat=bpy.data.materials.get(name)
            if mat: displaced.append((mat,name));mat.name='__lion_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,staged):
            if len(available.scenes)!=1: raise ValueError('Expected one approved Lion scene')
            staged.scenes=available.scenes
        scene=staged.scenes[0];window.scene=scene
        if scene.get('Melee grip')!='Closed palm' or scene.get('Melee finish')!='Extended follow-through': raise ValueError('Expected approved Lion closed grip source')
        if {x[0]:x[2] for x in json.loads(scene['Melee clips']) if x[1]=='L'}!={'Arc Cleaver':101,'Cinder Hatchet':231,'Breaker Maul':311}: raise ValueError('Unexpected source clips')
        rigs=[o for o in scene.objects if o.type=='ARMATURE']
        if len(rigs)!=1 or base(rigs[0].name)!='LION Rig': raise ValueError('Expected Lion rig')
        rig=rigs[0];objects={base(o.name):o for o in scene.objects}
        meshes=[(o,o.parent_bone) for o in scene.objects if o.type=='MESH' and o.parent==rig]
        if len(meshes)!=551: raise ValueError(f'Expected 551 chassis pieces, got {len(meshes)}')
        # Snapshot evaluated constraints and IK before clearing the source action.
        # Finger geometry is already frozen in the closed grip below; other
        # bone matrices are converted from evaluated armature space to basis.
        samples={}
        for label,start in (('cleaver',101),('hatchet',231),('breaker',311)):
            frames=[]
            for frame in range(start,start+32):
                scene.frame_set(frame);bpy.context.view_layer.update(); pose={}
                evaluated=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
                for pb in evaluated.pose.bones:
                    if pb.name.startswith('finger_'): continue
                    rest=pb.bone.matrix_local
                    posed=pb.matrix.copy()
                    if pb.parent:
                        rest=pb.parent.bone.matrix_local.inverted()@rest
                        posed=pb.parent.matrix.inverted()@posed
                    pose[pb.name]=rest.inverted()@posed
                frames.append(pose)
            samples[label]=frames
        # Capture the constrained, closed hand from approved frame 101 relative
        # to its wrist. Bone parenting remains intact for subsequent pose drivers.
        scene.frame_set(101);bpy.context.view_layer.update()
        fingers=[o for o,b in meshes if b.startswith('finger_') and b.endswith('.L')]
        graph=bpy.context.evaluated_depsgraph_get();evaluated=rig.evaluated_get(graph)
        hand=evaluated.matrix_world @ evaluated.pose.bones['hand.L'].matrix
        relative={o:hand.inverted()@o.evaluated_get(graph).matrix_world for o in fingers}
        rig.animation_data_clear();rig.data.pose_position='REST'
        for pb in rig.pose.bones:
            for c in list(pb.constraints): pb.constraints.remove(c)
        bpy.context.view_layer.update();hand_rest=rig.matrix_world @ rig.data.bones['hand.L'].matrix_local
        for obj,matrix in relative.items(): obj.matrix_world=hand_rest@matrix
        bpy.context.view_layer.update()
        if max(abs(v) for o in fingers for row in (hand_rest.inverted()@o.matrix_world-relative[o]) for v in row)>1e-4: raise RuntimeError('Failed to preserve grip')
        selected=[rig];socket=objects['weapon_socket.L']
        if socket.parent!=rig or socket.parent_bone!='hand.L': raise ValueError('Unexpected left socket')
        selected.append(socket)
        for label,key in (('Arc Cleaver','cleaver'),('Cinder Hatchet','hatchet'),('Breaker Maul','breaker')):
            mount=objects[f'{label} | L'];tip_position=mount.get('strike_tip')
            if tip_position is None or len(tip_position)!=3: raise ValueError('Missing authored strike tip')
            mount.animation_data_clear()
            for c in list(mount.constraints): mount.constraints.remove(c)
            mount.parent=socket;mount.matrix_parent_inverse=Matrix.Identity(4);mount.matrix_basis=Matrix.Identity(4)
            mount.name=f'melee.{key}';mount.hide_viewport=mount.hide_render=False;selected.append(mount)
            pieces=[o for o in mount.children if o.type=='MESH']
            if len(pieces)<7 or any(min(abs(v) for v in o.scale)<1e-5 for o in pieces): raise ValueError(f'Invalid {key} pieces')
            meshes.extend((o,'hand.L') for o in pieces)
            tip=bpy.data.objects.new(f'strike.tip.{key}',None);scene.collection.objects.link(tip);tip.parent=mount;tip.location=tip_position;selected.append(tip)
        # Include the source clevis pieces, fixed at rest for later piston work.
        for side in ('L','R'):
            for where in ('upper','lower'):
                for which in ('inboard','outboard'):
                    anchor=objects[f'Calf / {where} clevis {which}.{side}'];selected.append(anchor)
                    for c in list(anchor.constraints): anchor.constraints.remove(c)
                    meshes.extend((o,f'shin.{side}') for o in anchor.children if o.type=='MESH')
        bones=rig.data.bones;hip,knee,ankle=(bones[n].head_local.copy() for n in ('thigh.L','shin.L','foot.L'));pelvis,spine=(bones[n].head_local.copy() for n in ('pelvis','chest'))
        dimensions=dict(py=pelvis.z,spY=spine.z-pelvis.z,legA=(hip-knee).length,legB=(knee-ankle).length,ankleH=ankle.z,restX=abs(ankle.x),restZ=-ankle.y,lift=.5,stance=.86,toe=.17,reverse=False,quad=False,reach=0.,phases=[0.,.5],sway=.16)
        bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
        for old,new in BONE_NAMES.items():bones[old].name=new
        for key,value in dimensions.items():bones['root'][key]=value
        bpy.ops.object.mode_set(mode='EDIT')
        for side in ('L','R'):
            wrist=rig.data.edit_bones[f'wrist.{side}'];b=rig.data.edit_bones.new(f'socket.{side}');b.parent=wrist;b.head=wrist.tail;b.tail=wrist.tail+(wrist.tail-wrist.head).normalized()*.1;b.use_deform=False
        bpy.ops.object.mode_set(mode='OBJECT')
        # The optics and calf exhausts have shared three-slot materials in the
        # source. Assign dedicated emissive copies only to these small pieces.
        template=objects['Head / raised optical slit.L'].data.materials[2]
        visor=template.copy();visor.name='visor';stack=template.copy();stack.name='stack'
        for mat in (visor,stack):
            shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if not shader: raise ValueError('Missing emission shader')
            shader.inputs['Emission Color'].default_value=shader.inputs['Base Color'].default_value;shader.inputs['Emission Strength'].default_value=.5
        for obj,bone in meshes:
            part=part_for(bone);obj['part']=obj.data['part']=part
            obj.hide_render=obj.hide_viewport=False;obj.hide_set(False);obj.animation_data_clear()
            if bone.startswith('pauldron.'):obj['detach']=obj.data['detach']=True
            if obj.name.startswith('Head / raised optical slit'):obj.data.materials.clear();obj.data.materials.append(visor)
            elif obj.name.startswith('Calf / nozzle bore'):obj.data.materials.clear();obj.data.materials.append(stack)
            else:
                for slot in obj.material_slots:
                    if slot.material and base(slot.material.name) in MATERIAL_NAMES:slot.material.name=MATERIAL_NAMES[base(slot.material.name)]
            obj.data.calc_loop_triangles()
            if obj.name.startswith('Pelvis / helical binding') or len(obj.data.loop_triangles)>=500:
                mod=obj.modifiers.new('Lion web triangle budget','DECIMATE');mod.ratio=.18 if obj.name.startswith('Pelvis / helical binding') else .33;mod.use_collapse_triangulate=True
                obj.modifiers.move(len(obj.modifiers)-1,0);bpy.context.view_layer.objects.active=obj
                if bpy.ops.object.modifier_apply(modifier=mod.name)!={'FINISHED'}:raise RuntimeError('Decimation failed')
        groups={}
        for obj,bone in meshes:groups.setdefault((obj.parent,obj.parent_type,obj.parent_bone,obj['part'],bool(obj.get('detach',False))),[]).append(obj)
        for group in groups.values():
            if len(group)<2:continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in group:obj.select_set(True)
            if min(abs(v) for v in group[0].scale)<1e-5:raise ValueError(f'Degenerate batch donor {group[0].name}')
            bpy.context.view_layer.objects.active=group[0]
            if bpy.ops.object.join()!={'FINISHED'}:raise RuntimeError('Batch join failed')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected:obj.select_set(True)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.get('part'):obj.select_set(True)
        bpy.context.view_layer.objects.active=rig
        # Bake each evaluated local basis into a separate NLA track. Every
        # clip begins at frame 0 so glTF timestamps run from zero to 31/24 s.
        rig.data.pose_position='POSE';rig.animation_data_create()
        for label,frames in samples.items():
            action=bpy.data.actions.new(f'lion.{label}')
            rig.animation_data.action=action
            for frame,pose in enumerate(frames,0):
                for name,basis in pose.items():
                    pb=rig.pose.bones.get(BONE_NAMES.get(name,name))
                    pb.rotation_mode='QUATERNION';pb.matrix_basis=basis
                    for path in ('location','rotation_quaternion','scale'): pb.keyframe_insert(data_path=path,frame=frame,group=pb.name)
            rig.animation_data.action=None
            track=rig.animation_data.nla_tracks.new();track.name=f'lion.{label}'
            strip=track.strips.new(f'lion.{label}',0,action)
        scene.frame_set(0);bpy.context.view_layer.update()
        result=bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,use_active_scene=True,export_meshopt_compression_enable=True,export_animations=True,export_animation_mode="NLA_TRACKS",export_optimize_animation_size=False,export_extras=True,export_yup=True,export_def_bones=False,export_rest_position_armature=True,export_cameras=False,export_lights=False)
        if result!={'FINISHED'} or not output.is_file():raise RuntimeError(f'Export failed {result}')
    finally:
        window.scene=previous
        added=[block for key,prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for mat,name in displaced:mat.name=name
