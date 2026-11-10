"""Export the approved Bastion motion as lightweight rigid glTF nodes for Iron Vow."""
import bpy
import json
from collections import defaultdict
from pathlib import Path
from mathutils import Matrix, Vector
root=Path(__file__).resolve().parents[3]
scene=bpy.context.scene
rig=bpy.data.objects['BST-04 | animation rig']
track=rig.animation_data.nla_tracks[0]
scene.frame_set(57)
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
rest={p.name:p.bone.matrix_local.copy() for p in rig.pose.bones}
bind_pose={p.name:p.matrix.copy() for p in rig.pose.bones}
export=bpy.data.collections.new('Bastion browser export')
scene.collection.children.link(export)
def empty(name,world,parent=None):
    o=bpy.data.objects.new(name,None);export.objects.link(o)
    if parent:o.parent=parent
    o.matrix_basis=parent.matrix_world.inverted()@world if parent else world
    bpy.context.view_layer.update()
    return o
nodes={}
for b in rig.pose.bones:
    nodes[b.name]=empty(b.name,rest[b.name],nodes[b.parent.name] if b.parent else None)
def socket(name,point,owner):
    return empty(name,Matrix.Translation(point),nodes[owner])
gun=bpy.data.objects['Kestrel rifle | game test weapon']
grip_point=Vector(rig['rifle_grip_model_point'])
grip_rest=rest['RifleMount']@bind_pose['RifleMount'].inverted()@gun.matrix_world@grip_point
socket('BastionGrip.R',grip_rest,'RifleMount')
socket('BastionGunPivot.R',rig.pose.bones['RifleMount'].bone.head_local,'RifleMount')
melee_grips=json.loads(rig['left_melee_grip_matrices'])
empty('BastionGrip.L',Matrix(melee_grips['blade']),nodes['Hand.L'])
empty('BastionRamGrip.L',Matrix(melee_grips['ram']),nodes['Hand.L'])
socket('BastionPart.body',(0,-.3,4.65),'Chest')
socket('BastionPart.pilot',(0,-.78,5.48),'Cockpit')
socket('BastionPart.right',(-2.32,-.2,3.73),'Forearm.R')
socket('BastionPart.left',(2.32,-.2,3.73),'Forearm.L')
socket('BastionPart.legs',(0,-.05,2.08),'Pelvis')
socket('BastionLeadFoot',(-1.58,-.35,.074),'Foot.R')
def region(name):
    if name=='Cockpit':return 'pilot'
    if name.startswith(('Thigh','Shin','Foot','HipArmor','Piston knee','Piston ankle')):return 'legs'
    if name.startswith(('UpperArm','Forearm','Hand','Pauldron','Piston elbow','Claw')):return 'left' if name.endswith('.L') or 'elbow L' in name else 'right'
    return 'body'
groups=defaultdict(list)
for o in scene.objects:
    if o.parent==rig and o.type in ('MESH','CURVE') and o.get('rig_owner'):
        owner=o['rig_owner'];groups[owner].append(o)
new_material={}
def web_material(mat):
    if mat.name not in new_material:
        m=mat.copy()
        m.name=mat.name+' (Web)'
        bs=m.node_tree.nodes.get('Principled BSDF')
        for pin in ('Base Color','Normal'):
            for link in tuple(bs.inputs[pin].links):m.node_tree.links.remove(link)
        if bs.inputs['Emission Strength'].default_value>3:bs.inputs['Emission Strength'].default_value=3
        new_material[mat.name]=m
    return new_material[mat.name]
for bone,objs in groups.items():
    verts=[];faces=[];norms=[];mats=[];indices=[];smoothing=[]
    # Evaluated rigid meshes already carry the animated bone transform at the bind sample.
    inv=bind_pose[bone].inverted()
    for o in objs:
        evaluated=o.evaluated_get(deps)
        src=evaluated.to_mesh()
        if src is None or not src.polygons:
            evaluated.to_mesh_clear()
            continue
        base=len(verts)
        mtx=inv@evaluated.matrix_world
        nmat=mtx.to_3x3().inverted().transposed()
        verts.extend(mtx@v.co for v in src.vertices)
        normals=src.corner_normals
        for f in src.polygons:
            faces.append(tuple(base+i for i in f.vertices))
            norms.extend((nmat@normals[i].vector).normalized() for i in f.loop_indices)
            smoothing.append(f.use_smooth)
            material=web_material(src.materials[f.material_index])
            if material not in mats:mats.append(material)
            indices.append(mats.index(material))
        evaluated.to_mesh_clear()
    if not faces:continue
    mesh=bpy.data.meshes.new('Batch '+bone);mesh.from_pydata(verts,[],faces);mesh.update()
    for m in mats:mesh.materials.append(m)
    for f,i,s in zip(mesh.polygons,indices,smoothing):f.material_index=i;f.use_smooth=s
    mesh.normals_split_custom_set(norms)
    o=bpy.data.objects.new('Batch '+bone,mesh);export.objects.link(o);o.parent=nodes[bone]
    o['part']=region(bone)
    if bone.startswith(('Missile.','Exhaust.')):o['projectile']=True
# Export scene animation, including the separate rigid children. There is no skin to clone or retarget.
track.mute=False
prior={}
for f in range(scene.frame_start,scene.frame_end+1):
    scene.frame_set(f)
    posed={p.name:p.matrix.copy() for p in rig.pose.bones}
    for b in rig.pose.bones:
        o=nodes[b.name]
        local=posed[b.parent.name].inverted()@posed[b.name] if b.parent else posed[b.name]
        loc,rot,scale=local.decompose()
        if b.name in prior and rot.dot(prior[b.name])<0:rot.negate()
        prior[b.name]=rot.copy()
        o.rotation_mode='QUATERNION'
        o.location,o.rotation_quaternion,o.scale=loc,rot,scale
        o.keyframe_insert('location',frame=f);o.keyframe_insert('rotation_quaternion',frame=f)
        if b.name.startswith('Exhaust.'):o.keyframe_insert('scale',frame=f)
for a in bpy.data.actions:
    if a.name in {'Walk','Brace','Shoulder Missile Fire','Rifle Fire','Left-hand Strike'}:continue
    for layer in a.layers:
        for st in layer.strips:
            for bag in st.channelbags:
                for curve in bag.fcurves:
                    for k in curve.keyframe_points:k.interpolation='LINEAR'
bpy.ops.object.select_all(action='DESELECT')
for o in export.objects:o.select_set(True)
scene.frame_set(1)
path=root/'dist/rig-bench/bastion-bst04.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='SCENE',export_frame_range=True,
    export_frame_step=1,export_extras=True,export_yup=True,
    export_cameras=False,export_lights=False,export_normals=True,export_texcoords=False)
print('BASTION GLB',path.stat().st_size,'bytes;',len(groups),'rigid geometry batches')

# This fitted carbine shares the Kestrel's gameplay ID. Keep the stock model for other chassis.
gun=bpy.data.objects['Kestrel rifle | game test weapon']
bpy.ops.object.select_all(action='DESELECT')
gun.name='kestrel'
gun.parent=None
gun.matrix_world=Matrix.Identity(4)
grip=bpy.data.objects.new('BastionGripContact',None)
scene.collection.objects.link(grip)
grip.parent=gun
grip.location=grip_point
for o in [gun,*gun.children_recursive]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'dist/rig-bench/bastion-carbine.glb'),
    export_format='GLB',use_selection=True,export_animations=False,export_extras=False,
    export_cameras=False,export_lights=False)

bpy.ops.object.select_all(action='DESELECT')
for prop in [o for o in scene.objects if o.get('bastion_melee_asset')]:
    prop.name=prop['bastion_melee_asset']
    prop.parent=None
    prop.matrix_world=Matrix.Identity(4)
    for o in [prop,*prop.children_recursive]:
        o.hide_set(False)
        o.hide_render=False
        label=o.name.split('.')[0]
        if o.type=='EMPTY' and label in {'tip','base','spike'}:
            o['bastion_socket']=label
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'dist/rig-bench/bastion-melee.glb'),
    export_format='GLB',use_selection=True,export_animations=False,export_extras=True,
    export_cameras=False,export_lights=False)
