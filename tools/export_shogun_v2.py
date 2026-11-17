"""Export the released Samurai/Shogun mounted assembly through Blender MCP.

Call export_shogun_batched(source, output). The source is the exact mounted R12 asset
whose `both export` bake matches the released Shogun mesh accessors. Output
contains Morrow, Cleaver and Vesper in a meshopt-compressed rest pose. Source
motion clips are deliberately not exported; runtime must supply animation.
"""
import hashlib,re
from pathlib import Path
import bpy

SOURCE_SHA='bc35401aff222fed152ba707177166d2001bef1bd72a8315e77fd642bfb189d1'
DATA_COLLECTIONS=('actions','armatures','cameras','collections','curves','images','lights','materials','meshes','node_groups','objects','scenes','textures','worlds')
BONE_NAMES={'ROOT':'root','Pelvis':'pelvis','Torso':'spine','Optics':'neck','Hardpoint.L':'socket.L','Shoulder Hardpoint.R':'mount.shoulderR','Muzzle':'muzzle.main','Muzzle.Upper':'muzzle.upper','Muzzle.Lower':'muzzle.lower','Shoulder Muzzle.R':'muzzle.vesper.1','Shoulder Muzzle2.R':'muzzle.vesper.2'}
for side in ('L','R'):
    for old,new in (('Shoulder','shoulder'),('Elbow','elbow'),('Wrist','wrist'),('Hip','hip'),('Knee','knee'),('Foot','ankle')):BONE_NAMES[f'{old}.{side}']=f'{new}.{side}'
MATERIAL_NAMES={'HV-09 Paint | Midnight blue ceramic':'paint_primary','HV-09 Paint | Deep blue ceramic':'paint_secondary','HV-09 Paint | Slate blue ceramic':'paint_accent','HV-09 Paint | Ion cyan emitters':'visor'}

def base(name):return re.sub(r'\.\d{3}$','',name)
def part_for(obj,bone):
    if obj.get('weighted_skirt') or obj.get('skirt_hardware'):return 'legs'
    if obj.name.startswith(('vesper__','Vesper / ')):return 'body'
    if obj.name.startswith('cleaver__'):return 'left'
    if bone=='Optics':return 'pilot'
    if bone.startswith(('Hip.','Knee.','Foot.','Toe.','Leg ram.','Ankle ram.')):return 'legs'
    if bone.startswith(('Shoulder.','Pauldron.','Elbow.','Wrist.','Finger ','Thumb.','Arm ram.','Hardpoint.')):return 'left' if '.L' in bone else 'right'
    if bone=='Cannon Slide':return 'right'
    if bone in ('Pelvis','Torso','Shoulder Cannon.L','Shoulder Hardpoint.L'):return 'body'
    raise ValueError(f'Unclassified assembly {obj.name} ({bone})')

def export_shogun_batched(source,output):
    source,output=Path(source).expanduser().resolve(strict=True),Path(output).expanduser().resolve()
    if source.suffix!='.blend' or output.suffix!='.glb' or output.exists():raise ValueError('Use a source and a new GLB output')
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('Source does not match released Shogun mounted blend')
    window=bpy.context.window
    if not window or bpy.context.mode!='OBJECT':raise RuntimeError('Run in Object Mode')
    previous=window.scene;existing={key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS};displaced=[]
    try:
        for name in (*MATERIAL_NAMES.values(),'stack'):
            mat=bpy.data.materials.get(name)
            if mat:displaced.append((mat,name));mat.name='__shogun_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,staged):
            if len(available.scenes)!=1:raise ValueError('Expected one mounted Shogun scene')
            staged.scenes=available.scenes
        scene=staged.scenes[0];window.scene=scene
        rigs=[o for o in scene.objects if o.type=='ARMATURE']
        if len(rigs)!=1 or base(rigs[0].name)!='GATECRASHER / Rig':raise ValueError('Expected fitted Samurai rig')
        rig=rigs[0];meshes=[o for o in scene.objects if o.type=='MESH' and o.parent==rig]
        if len(meshes)!=457:raise ValueError(f'Unexpected fitted assembly {len(meshes)}')
        for marker in ('Cannon Slide / rigid assembly','Morrow / wrist receiver','cleaver__','vesper__'):
            if not any(base(o.name).startswith(marker) for o in meshes):raise ValueError(f'Missing equipment {marker}')
        rig.data.pose_position='REST';rig.animation_data_clear()
        bones=rig.data.bones;hip,knee,ankle=(bones[n].head_local.copy() for n in ('Hip.L','Knee.L','Foot.L'));pelvis,spine=(bones[n].head_local.copy() for n in ('Pelvis','Torso'))
        dimensions=dict(py=pelvis.z,spY=spine.z-pelvis.z,legA=(hip-knee).length,legB=(knee-ankle).length,ankleH=ankle.z,restX=abs(ankle.x),restZ=-ankle.y,lift=.5,stance=.86,toe=.17,reverse=False,quad=False,reach=0.,phases=[0.,.5],sway=.16)
        owners={o:o.get('rig_attachment',o.parent_bone) for o in meshes}
        bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
        for old,new in BONE_NAMES.items():bones[old].name=new
        for key,value in dimensions.items():bones['root'][key]=value
        bpy.ops.object.mode_set(mode='EDIT')
        wrist=rig.data.edit_bones['wrist.R'];socket=rig.data.edit_bones.new('socket.R');socket.parent=wrist;socket.head=wrist.tail;socket.tail=wrist.tail+(wrist.tail-wrist.head).normalized()*.2;socket.roll=wrist.roll;socket.use_deform=False
        bpy.ops.object.mode_set(mode='OBJECT')
        # Source has cyan optics but no separate exhaust emissive. Preserve the
        # outlet housing and assign a restrained glow only to its dark recess.
        recess=next(o for o in meshes if base(o.name)=='Recessed jet outlet.L')
        dark=next(m for m in recess.data.materials if base(m.name)=='HV-09 Paint | Carbon recesses')
        stack=dark.copy();stack.name='stack';shader=next((n for n in stack.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not shader:raise ValueError('Missing outlet shader')
        shader.inputs['Emission Color'].default_value=(.03,.06,.08,1);shader.inputs['Emission Strength'].default_value=.35
        for obj in meshes:
            owner=owners[obj];part=part_for(obj,owner);obj['part']=obj.data['part']=part
            if owner.startswith('Pauldron.'):obj['detach']=obj.data['detach']=True
            obj.hide_render=obj.hide_viewport=False;obj.select_set(True)
            for slot in obj.material_slots:
                mat=slot.material
                if not mat:continue
                if base(obj.name).startswith('Recessed jet outlet.') and base(mat.name)=='HV-09 Paint | Carbon recesses':slot.material=stack
                elif base(mat.name) in MATERIAL_NAMES:mat.name=MATERIAL_NAMES[base(mat.name)]
        # Original glTF export ignores non-skin modifiers on skinned pieces.
        # Remove those before joining so raw geometry stays identical.
        # A batch is restricted to one
        # source bone/parent, identical damage semantics and deform groups.
        # The multi-weight skirt and its hardware deliberately stay separate.
        groups={}
        for obj in meshes:
            if obj.get('weighted_skirt') or obj.get('skirt_hardware'):continue
            # Joining these three n-gon pieces changes Blender's tessellation.
            if base(obj.name) in ('Vesper / pauldron saddle','Vesper / saddle insert','Calf rear service plate.L'):continue
            key=(obj.parent,obj.parent_type,obj.parent_bone,owners[obj],obj['part'],bool(obj.get('detach',False)),tuple(g.name for g in obj.vertex_groups))
            groups.setdefault(key,[]).append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for group in groups.values():
            if len(group)<2:continue
            for obj in group:
                obj.hide_viewport=False;obj.hide_set(False)
                bpy.context.view_layer.objects.active=obj
                for mod in list(obj.modifiers):
                    if mod.type=='ARMATURE':continue
                    obj.modifiers.remove(mod)
                obj.select_set(True)
            bpy.context.view_layer.objects.active=group[0]
            if bpy.ops.object.join()!={'FINISHED'}:raise RuntimeError(f'Cannot batch {group[0].name}')
            group[0].select_set(False)
        bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.get('part'):obj.select_set(True)
        bpy.context.view_layer.objects.active=rig
        result=bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,use_active_scene=True,export_meshopt_compression_enable=True,export_animations=False,export_extras=True,export_yup=True,export_def_bones=False,export_rest_position_armature=True,export_cameras=False,export_lights=False)
        if result!={'FINISHED'} or not output.is_file():raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene=previous
        added=[block for key,prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for mat,name in displaced:mat.name=name
