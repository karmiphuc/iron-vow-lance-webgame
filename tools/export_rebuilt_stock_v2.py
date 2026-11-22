"""Export regenerated Kestrel or Basilisk rigid source through Blender MCP.

Call export_stock(source, output, model), model = 'kestrel' or 'basilisk'.
Generate the source with the corresponding isolated tools/authoring build
script. Atlas texture images must be present next to the generated .blend.
Source and active scene are preserved. Gait values are starting estimates.
"""
import re
from pathlib import Path
import bpy

DATA_COLLECTIONS=('actions','armatures','cameras','collections','curves','images','lights','materials','meshes','node_groups','objects','scenes','textures','worlds')
NAMES=('root','pelvis','spine','neck',*(f'{bone}.{side}' for side in ('L','R') for bone in ('shoulder','elbow','wrist','socket','hip','knee','ankle')))
PAINT_TILES={'kestrel':{0:'paint_primary',7:'paint_secondary',8:'paint_primary',12:'paint_accent',15:'paint_accent'},'basilisk':{0:'paint_primary',7:'paint_secondary',12:'paint_accent',15:'paint_accent'}}

def base(name):return re.sub(r'\.\d{3}$','',name)
def descendants(root):
    yield root
    for child in root.children:yield from descendants(child)
def damage_part(obj):
    node=obj.parent
    while node:
        name=base(node.name)
        if name=='neck':return 'pilot'
        if name.startswith(('hip.','knee.','ankle.')):return 'legs'
        if name.startswith(('shoulder.','elbow.','wrist.','socket.','pauldron.','launcher.')):
            return 'left' if name.endswith('.L') else 'right'
        node=node.parent
    return 'body'

def export_stock(source,output,model):
    source,output=Path(source).expanduser().resolve(strict=True),Path(output).expanduser().resolve()
    if model not in PAINT_TILES or source.suffix!='.blend' or output.suffix!='.glb' or output.exists():raise ValueError('Use a generated stock source, model and new GLB')
    window=bpy.context.window
    if not window or bpy.context.mode!='OBJECT':raise RuntimeError('Run in Object Mode')
    previous=window.scene;existing={key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS};displaced=[];displaced_objects=[]
    try:
        for name in ('paint_primary','paint_secondary','paint_accent','visor','stack'):
            material=bpy.data.materials.get(name)
            if material:displaced.append((material,name));material.name='__stock_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,staged):
            if len(available.scenes)!=1:raise ValueError('Expected one generated scene')
            staged.scenes=available.scenes
        scene=staged.scenes[0];window.scene=scene
        roots=[o for o in scene.objects if base(o.name)=='root' and o.type=='EMPTY' and o.parent is None]
        if len(roots)!=1 or model.upper() not in roots[0].get('asset','').upper():raise ValueError(f'Expected {model} generated source')
        root=roots[0];nodes=list(descendants(root));named={base(o.name):o for o in nodes if o.type=='EMPTY'}
        if any(n not in named for n in NAMES):raise ValueError('Incomplete generated rig')
        # Names are globally unique in Blender; temporarily move aside names in
        # the previously active scene so exported pivots retain exact names.
        for name in named:
            obj=named[name];other=bpy.data.objects.get(name)
            if other and other!=obj:displaced_objects.append((other,name));other.name='__stock_saved_'+name
            obj.name=name
        for image in bpy.data.images:
            if image not in existing['images'] and image.source=='FILE' and not image.packed_file:
                if not Path(bpy.path.abspath(image.filepath)).is_file():raise ValueError(f'Missing atlas image {image.filepath}')
                image.pack()
        mats={base(m.name):m for m in bpy.data.materials if m not in existing['materials']}
        atlas=mats['warden_atlas' if model=='kestrel' else 'basilisk_atlas']
        for name in ('visor','stack'):mats['emissive_'+name].name=name
        paints={}
        for name in ('paint_primary','paint_secondary','paint_accent'):
            material=atlas.copy();material.name=name;paints[name]=material
        scene.view_layers[0].update()
        point=lambda name:named[name].matrix_world.translation.copy()
        hip,knee,ankle=(point(n) for n in ('hip.L','knee.L','ankle.L'));pelvis,spine=(point(n) for n in ('pelvis','spine'))
        dims=dict(py=pelvis.z,spY=spine.z-pelvis.z,legA=(hip-knee).length,legB=(knee-ankle).length,ankleH=ankle.z,restX=abs(ankle.x),restZ=-ankle.y,lift=.5,stance=.86,toe=.17,reverse=False,quad=False,reach=0.,phases=[0.,.5],sway=.16)
        for key,val in dims.items():root[key]=val
        meshes=[o for o in nodes if o.type=='MESH']
        if len(meshes)!=(42 if model=='basilisk' else 40):raise ValueError(f'Unexpected generated mesh count {len(meshes)}')
        for obj in meshes:
            part=damage_part(obj);obj['part']=obj.data['part']=part
            if obj.parent and base(obj.parent.name).startswith(('pauldron.','launcher.')):obj['detach']=obj.data['detach']=True
            if len(obj.data.materials)==1 and obj.data.materials[0]==atlas:
                uv=obj.data.uv_layers.active
                if not uv:raise ValueError(f'Missing atlas UV on {obj.name}')
                indices={name:len(obj.data.materials)+i for i,name in enumerate(paints)}
                for mat in paints.values():obj.data.materials.append(mat)
                for poly in obj.data.polygons:
                    u=sum(uv.data[i].uv.x for i in poly.loop_indices)/len(poly.loop_indices)
                    v=sum(uv.data[i].uv.y for i in poly.loop_indices)/len(poly.loop_indices)
                    column=min(3,max(0,int(u*4)));row=min(3,max(0,int((1-v)*4)))
                    target=PAINT_TILES[model].get(row*4+column)
                    if target:poly.material_index=indices[target]
            obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles)>=400:
                mod=obj.modifiers.new('Stock web triangle budget','DECIMATE');mod.ratio=.62;mod.use_collapse_triangulate=True
                bpy.context.view_layer.objects.active=obj
                if bpy.ops.object.modifier_apply(modifier=mod.name)!={'FINISHED'}:raise RuntimeError('Decimation failed')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in nodes:obj.select_set(True)
        bpy.context.view_layer.objects.active=root
        meshopt={'export_meshopt_compression_enable':True} if 'export_meshopt_compression_enable' in bpy.ops.export_scene.gltf.get_rna_type().properties else {}
        result=bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,use_active_scene=True,**meshopt,export_animations=False,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
        if result!={'FINISHED'} or not output.is_file():raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene=previous
        added=[block for key,prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material,name in displaced:material.name=name
        for obj,name in displaced_objects:obj.name=name
