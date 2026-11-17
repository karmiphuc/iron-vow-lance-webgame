"""Reproducible Blender carrier authoring; preserves the active scene and selection.

Blender: --python create_halyard.py -- [--out model.glb] [--source private.blend]
The editable source defaults to ~/Projs/iron-vow-private-sources/halyard/halyard.blend.
"""
import argparse
import bpy, math, os, sys
from pathlib import Path
from mathutils import Vector

REPOSITORY = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, default=REPOSITORY / 'dist/assets/overworld/halyard.glb')
parser.add_argument('--source', type=Path, default=Path.home() / 'Projs/iron-vow-private-sources/halyard/halyard.blend')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUTPUT = str(args.out.expanduser().resolve())
SOURCE = str(args.source.expanduser().resolve())
original = bpy.context.window.scene
original_view_layer = bpy.context.window.view_layer
original_active = original_view_layer.objects.active
original_selected = list(bpy.context.selected_objects)
try:
    scene = bpy.data.scenes.new('Halyard authored carrier')
    bpy.context.window.scene = scene
    collection = bpy.data.collections.new('IVS Halyard · export only')
    scene.collection.children.link(collection)
    objects=[]
    def material(name, color, metallic=0.0):
        m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
        p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=.68
        return m
    hull=material('Soot olive lifting envelope',(.31,.34,.28),.18)
    steel=material('Dark carrier structure',(.095,.12,.13),.45)
    edge=material('Worn steel ribs',(.46,.48,.41),.35)
    black=material('Open hangar darkness',(.014,.021,.024))
    amber=material('Restrained safety ochre',(.72,.46,.15),.1)
    glass=material('Bridge blue glass',(.12,.28,.30),.35)
    def mesh(name,verts,faces,mat):
        me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
        ob=bpy.data.objects.new(name,me); collection.objects.link(ob); ob.data.materials.append(mat); objects.append(ob); return ob
    def box(name,loc,scale,mat,bevel=.05):
        x,y,z=scale; vs=[(a*x/2,b*y/2,c*z/2) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        ob=mesh(name,vs,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat); ob.location=loc
        if bevel:
            mod=ob.modifiers.new('Soft manufactured corners','BEVEL'); mod.width=bevel; mod.segments=2
            ob.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
        return ob
    def beam(name,a,b,width,mat):
        d=Vector(b)-Vector(a); ob=box(name,(Vector(a)+Vector(b))/2,(width,width,d.length),mat,.015); ob.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return ob
    # Broad blunt lifting body, with a flat lower shoulder; x is fore/aft.
    stations=[(-5,.34,.27),(-4.65,1.12,.74),(-3.6,1.55,1.0),(-1.5,1.67,1.08),(1.3,1.65,1.04),(3.4,1.32,.84),(4.5,.66,.5),(4.8,.24,.25)]
    verts=[]; rings=16
    for x,w,h in stations:
        for i in range(rings):
            a=i/rings*math.tau; verts.append((x,math.cos(a)*w,2.3+math.sin(a)*h))
    faces=[tuple(reversed(range(rings)))]
    for j in range(len(stations)-1):
        for i in range(rings):
            a=j*rings+i; b=j*rings+(i+1)%rings; faces.append((a,b,b+rings,a+rings))
    faces.append(tuple(range((len(stations)-1)*rings,len(stations)*rings)))
    body=mesh('Blunt heavy lift envelope',verts,faces,hull)
    for p in body.data.polygons: p.use_smooth=True
    # Raised longitudinal seams and sparse transverse frames read as airship fabric/plate.
    for side in [-1,1]:
        beam('Envelope lower seam',(-4.2,side*1.1,1.85),(3.8,side*1.05,1.85),.055,edge)
    for j in [2,3,4,5]:
        x,w,h=stations[j]
        for i in range(rings):
            a=i/rings*math.tau; b=(i+1)/rings*math.tau
            beam('Envelope hoop', (x,math.cos(a)*(w+.018),2.3+math.sin(a)*(h+.018)),(x,math.cos(b)*(w+.018),2.3+math.sin(b)*(h+.018)),.027,edge)
    # Deep rectangular keel with a visibly open belly; no solid box over the opening.
    box('Keel roof',(-.2,0,1.2),(6.7,1.4,.35),steel)
    for side in [-1,1]:
        box('Hangar sidewall',(-.15,side*.65,.66),(6.6,.18,1.05),steel)
        box('Hangar sill',(-.15,side*.53,.13),(6.5,.18,.18),edge)
        for x in [-2.7,-1.4,0,1.4,2.7]: box('Hangar frame',(x,side*.77,.67),(.12,.17,1.1),edge,.025)
    box('Belly recess shadow',(-.1,0,1.0),(5.8,1.05,.06),black,0)
    box('Forward under bridge',(-3.6,0,.9),(1.25,1.45,.72),steel,.13)
    box('Bridge glazing',(-4.23,0,1.03),(.07,1.23,.24),glass,.025)
    for side in [-1,1]:
        beam('Engine outrigger',(-.8,side*.6,1.05),(-.8,side*2.0,1.0),.16,edge)
        box('Side diesel nacelle',(-.7,side*2.0,1.02),(2.0,.62,.65),steel,.18)
        box('Engine intake',(-1.72,side*2.0,1.03),(.06,.46,.44),black,.08)
        for x in [-.6,-.3,0]: box('Engine vent',(x,side*2.32,1.06),(.12,.025,.37),edge,.01)
        fin=box('Paired upright tail fin',(3.5,side*.86,3.2),(1.7,.13,1.65),steel,.07); fin.rotation_euler[1]=-.32
        box('Tail warning band',(3.4,side*.94,3.65),(.6,.03,.14),amber,.01)
    # Suspended cargo gantry, cables and modest warning slashes.
    for x in [-1.5,1.4]:
        for side in [-1,1]: beam('Cargo lowering cable',(x,side*.46,.95),(x,side*.46,-.25),.025,edge)
        box('Cargo hoist crossbar',(x,0,-.27),(.15,1.2,.15),edge,.02)
    for x in [-2.6,-2.3,-2.0]:
        ob=box('Hazard slash',(x,-.752,.45),(.12,.025,.32),amber,.005); ob.rotation_euler[1]=-.4
    # Preview camera and lights are isolated from the exported collection.
    camdata=bpy.data.cameras.new('Halyard preview camera'); cam=bpy.data.objects.new('Halyard preview camera',camdata); scene.collection.objects.link(cam); cam.location=(-12,-15,10); cam.rotation_euler=(Vector((0,0,1.5))-cam.location).to_track_quat('-Z','Y').to_euler(); camdata.type='ORTHO'; camdata.ortho_scale=13; scene.camera=cam
    for name,loc,power,size in [('Key',(-5,-7,11),1900,8),('Rim',(5,4,8),1500,6)]:
        ld=bpy.data.lights.new(name,'AREA'); ld.energy=power; ld.shape='DISK'; ld.size=size; lo=bpy.data.objects.new(name,ld); scene.collection.objects.link(lo); lo.location=loc; lo.rotation_euler=(Vector((0,0,1.5))-lo.location).to_track_quat('-Z','Y').to_euler()
    scene.world=bpy.data.worlds.new('Halyard preview world'); scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.11,.14,.16,1)
    scene.render.resolution_x=1000; scene.render.resolution_y=700; scene.render.resolution_percentage=100
    try: scene.render.engine='CYCLES'; scene.cycles.samples=24
    except TypeError: pass
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active=body
    os.makedirs(os.path.dirname(OUTPUT),exist_ok=True); os.makedirs(os.path.dirname(SOURCE),exist_ok=True)
    formats=[i.identifier for i in bpy.ops.export_scene.gltf.get_rna_type().properties['export_format'].enum_items]
    # Blender dynamic enums can report no items through RNA.
    if not formats:
        try: bpy.ops.export_scene.gltf(export_format='__inspect__')
        except TypeError as exc: formats = ['GLB'] if 'GLB' in str(exc) else []
    assert 'GLB' in formats
    bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True)
    bpy.data.libraries.write(SOURCE,{scene})
    triangles=0
    deps=bpy.context.evaluated_depsgraph_get()
    for ob in objects:
        me=ob.evaluated_get(deps).to_mesh(); me.calc_loop_triangles(); triangles+=len(me.loop_triangles); ob.evaluated_get(deps).to_mesh_clear()
    print({'objects':len(objects),'triangles':triangles,'glb_bytes':os.path.getsize(OUTPUT),'private_source':SOURCE,'original_scene':original.name})
finally:
    bpy.context.window.scene = original
    bpy.context.window.view_layer = original_view_layer
    for ob in original_view_layer.objects:
        ob.select_set(ob in original_selected)
    original_view_layer.objects.active = original_active
