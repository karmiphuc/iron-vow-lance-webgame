"""Export IV-S07 Grip-Stride and its three scout modules through Blender MCP.

Call export_ashigaru(source,output). Source is the original signed rig; the
Flechette is reconstructed from its grip and the dimensions/materials in
`tools/authoring/scout/export_bench.py:187-239`. It is recipe-derived, not an
independently recovered weapon. Export is rest-pose; runtime provides motion.
"""
import hashlib,math,re
from pathlib import Path
import bpy
from mathutils import Vector

SOURCE_SHA='6d8d14ecc0513a87a29e28e26c64d267ef0a3bf7645ec6232a7dedffc7f2fa23'
DATA_COLLECTIONS=('actions','armatures','cameras','collections','curves','images','lights','materials','meshes','node_groups','objects','scenes','textures','worlds')
MATERIAL_NAMES={'01 / Recon green ceramic':'paint_primary','02 / Dark olive plate':'paint_secondary','04 / Crimson IFF armor':'paint_accent','08 / Ruby coated sensor glass':'visor'}
BONES={'head':'neck'}
for side in ('L','R'):
    for old,new in (('upper_arm','shoulder'),('forearm','elbow'),('hand','wrist'),('thigh','hip'),('shin','knee'),('foot','ankle')):BONES[f'{old}.{side}']=f'{new}.{side}'

def base(name):return re.sub(r'\.\d{3}$','',name)
def part_for(bone):
    if bone=='head':return 'pilot'
    if bone in ('root','pelvis','spine','chest') or bone.startswith('clavicle.'):return 'body'
    if bone.startswith(('thigh.','shin.','foot.')):return 'legs'
    if bone.endswith('.L'):return 'left'
    if bone.endswith('.R'):return 'right'
    raise ValueError(f'Unclassified scout bone {bone}')

def export_ashigaru(source,output):
    source,output=Path(source).expanduser().resolve(strict=True),Path(output).expanduser().resolve()
    if source.suffix!='.blend' or output.suffix!='.glb' or output.exists():raise ValueError('Use the approved source and a new GLB')
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('Unexpected source fingerprint')
    window=bpy.context.window
    if not window or bpy.context.mode!='OBJECT':raise RuntimeError('Run in Object Mode')
    previous=window.scene;existing={key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS};displaced=[]
    try:
        for name in (*MATERIAL_NAMES.values(),'stack'):
            mat=bpy.data.materials.get(name)
            if mat:displaced.append((mat,name));mat.name='__scout_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,staged):
            if len(available.scenes)!=1:raise ValueError('Expected one scout scene')
            staged.scenes=available.scenes
        scene=staged.scenes[0];window.scene=scene
        rigs=[o for o in scene.objects if o.type=='ARMATURE']
        if len(rigs)!=1 or base(rigs[0].name)!='IV-S07 | SCOUT CONTROL RIG':raise ValueError('Unexpected source rig')
        rig=rigs[0];objects={base(o.name):o for o in scene.objects}
        parts=[(o,o.parent_bone) for o in scene.objects if o.type=='MESH' and o.parent==rig]
        if len(parts)!=708:raise ValueError(f'Unexpected chassis assembly {len(parts)}')
        rig.animation_data_clear();rig.data.pose_position='REST'
        for pb in rig.pose.bones:
            for c in list(pb.constraints):pb.constraints.remove(c)
        selected=[rig];sockets={side:objects[f'SOCKET_Weapon.{side}'] for side in ('L','R')}
        carbine=objects['W01 / Needle carbine [right]'];knife=objects['W02 / Signal knife [left]']
        if carbine.parent!=sockets['R'] or knife.parent!=sockets['L']:raise ValueError('Unexpected weapon attachment')
        source_carbine=[o for o in carbine.children if o.type=='MESH' and not o.name.startswith('Attack')]
        source_knife=[o for o in knife.children if o.type=='MESH']
        if len(source_carbine)<25 or len(source_knife)!=8:raise ValueError('Unexpected source weapons')
        def material(key):return next(o.data.materials[0] for o in source_carbine if key in o.name)
        black,green,red,metal,dark=(material(k) for k in ('bevelled receiver','green armour','identification stripe','bore sleeve','muzzle interior'))
        for side,root,items,name in (('R',carbine,source_carbine,'module.carbine'),('L',knife,source_knife,'module.knife')):
            root.name=name;root.animation_data_clear();root.hide_render=root.hide_viewport=False;selected.extend((sockets[side],root))
            for o in items:
                o.animation_data_clear();o.hide_render=o.hide_viewport=False;o.hide_set(False)
                if min(abs(x) for x in o.scale)<1e-5:raise ValueError(f'Zero-scale weapon piece {o.name}')
                parts.append((o,f'hand.{side}'))
        scatter=bpy.data.objects.new('module.scatter',None);scene.collection.objects.link(scatter);scatter.parent=sockets['R'];selected.append(scatter)
        grip=[p for p in source_carbine if any(k in p.name for k in ('hand grip','grip insert','grip stop','trigger guard','trigger lever','receiver tang'))]
        if not grip:raise ValueError('Missing original scatter grip')
        for original in grip:
            obj=original.copy();obj.data=original.data.copy();scene.collection.objects.link(obj);obj.parent=scatter;obj.animation_data_clear();obj.hide_render=obj.hide_viewport=False;parts.append((obj,'hand.R'))
        def scatter_box(name,location,size,mat):
            bpy.ops.mesh.primitive_cube_add(size=1,location=location);obj=bpy.context.object;obj.name=name;obj.scale=size
            bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            bevel=obj.modifiers.new('Housing bevel','BEVEL');bevel.width=.018;bevel.segments=2
            obj.data.materials.append(mat);obj.parent=scatter;parts.append((obj,'hand.R'))
        scatter_box('Flechette receiver',(0,.23,.196),(.355,.79,.253),black)
        scatter_box('Green receiver shell',(0,.25,.279),(.373,.59,.127),green)
        scatter_box('Crimson shell latch',(0,.38,.351),(.31,.096,.037),red)
        scatter_box('Shell cassette',(0,.394,.083),(.274,.235,.204),green)
        for x in (-.076,.076):
            for name,y,length,radius,mat in (('Barrel',.648,.238,.074,metal),('Muzzle',.77,.045,.077,black),('Bore',.794,.006,.048,dark)):
                bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=length,location=(x,y,.213),rotation=(math.pi/2,0,0));obj=bpy.context.object;obj.name=name;obj.data.materials.append(mat);obj.parent=scatter;parts.append((obj,'hand.R'))
        def marker(parent,name,location):
            obj=bpy.data.objects.new(name,None);scene.collection.objects.link(obj);obj.parent=parent;obj.location=location;selected.append(obj)
        marker(carbine,'muzzle.carbine',(0,1.23,.235));marker(scatter,'muzzle.scatter',(0,.80,.213))
        # Original knife uses +Z forward; derive a tip at its furthest blade vertex.
        blade=next(o for o in source_knife if 'forged knife blade' in o.name)
        points=[blade.matrix_local@v.co for v in blade.data.vertices];tip=max(points,key=lambda v:v.z)
        marker(knife,'tip.knife',tip)
        bones=rig.data.bones;hip,knee,ankle=(bones[n].head_local.copy() for n in ('thigh.L','shin.L','foot.L'));pelvis,spine=(bones[n].head_local.copy() for n in ('pelvis','spine'))
        # The source has a .30 m presentation plinth; use the actual sole-to-
        # ankle height, not the ankle's absolute source elevation.
        bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();heights=[];floors=[]
        for side in ('L','R'):
            sole=objects[f'Foot / shaped rubber sole.{side}'].evaluated_get(graph);mesh=sole.to_mesh()
            try: floor=min((sole.matrix_world@v.co).z for v in mesh.vertices)
            finally: sole.to_mesh_clear()
            heights.append((rig.matrix_world@bones[f'foot.{side}'].head_local).z-floor);floors.append(floor)
        if abs(heights[0]-heights[1])>1e-4:raise ValueError('Source soles have inconsistent heights')
        dims=dict(py=pelvis.z-sum(floors)/2,spY=spine.z-pelvis.z,legA=(hip-knee).length,legB=(knee-ankle).length,ankleH=sum(heights)/2,restX=abs(ankle.x),restZ=-ankle.y,lift=.5,stance=.86,toe=.17,reverse=False,quad=False,reach=0.,phases=[0.,.5],sway=.16)
        bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
        for old,new in BONES.items():bones[old].name=new
        for key,value in dims.items():bones['root'][key]=value
        bpy.ops.object.mode_set(mode='EDIT')
        for side in ('L','R'):
            wrist=rig.data.edit_bones[f'wrist.{side}'];socket=rig.data.edit_bones.new(f'socket.{side}');socket.parent=wrist;socket.head=wrist.tail;socket.tail=wrist.tail+(wrist.tail-wrist.head).normalized()*.1;socket.use_deform=False
        bpy.ops.object.mode_set(mode='OBJECT')
        exhaust=next(o for o,b in parts if base(o.name)=='Backpack / lower center exhaust / closed interior')
        stack=exhaust.data.materials[0].copy();stack.name='stack';shader=next((n for n in stack.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not shader:raise ValueError('Missing source exhaust shader')
        shader.inputs['Emission Color'].default_value=(.08,.025,.01,1);shader.inputs['Emission Strength'].default_value=.4
        for obj,bone in parts:
            part=part_for(bone);obj['part']=obj.data['part']=part
            if bone.startswith(('pauldron.','lame_')):obj['detach']=obj.data['detach']=True
            if obj==exhaust:obj.data.materials.clear();obj.data.materials.append(stack)
            else:
                for slot in obj.material_slots:
                    if slot.material and base(slot.material.name) in MATERIAL_NAMES:slot.material.name=MATERIAL_NAMES[base(slot.material.name)]
            obj.hide_viewport=obj.hide_render=False;obj.hide_set(False)
        # Bake the authored bevels first, then join only identical rigid bone,
        # attachment and damage groups. Decimate joined rigid groups to the web budget.
        groups={}
        for obj,bone in parts:groups.setdefault((obj.parent,obj.parent_type,obj.parent_bone,obj['part'],bool(obj.get('detach',False))),[]).append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for group in groups.values():
            for obj in group:
                bpy.context.view_layer.objects.active=obj
                for mod in list(obj.modifiers):
                    if bpy.ops.object.modifier_apply(modifier=mod.name)!={'FINISHED'}:raise RuntimeError(f'Cannot apply {mod.name}')
                obj.select_set(True)
            bpy.context.view_layer.objects.active=group[0]
            if len(group)>1 and bpy.ops.object.join()!={'FINISHED'}:raise RuntimeError('Batch failed')
            obj=group[0];obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles)>=400:
                mod=obj.modifiers.new('Scout web triangle budget','DECIMATE');mod.ratio=.27;mod.use_collapse_triangulate=True
                if bpy.ops.object.modifier_apply(modifier=mod.name)!={'FINISHED'}:raise RuntimeError('Decimation failed')
            obj.select_set(False)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected:obj.select_set(True)
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
