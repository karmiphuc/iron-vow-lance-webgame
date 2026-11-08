"""Original Iron Vow expansion weapons; no external meshes or textures.

blender -b --disable-autoexec -t 6 --python-exit-code 1 -P tools/authoring/weapons/source/build_expansion.py
GLTF coordinates: metres, Y up, +Z forward, grip at root origin.
Rigid mechanical rigs use named object pivots, not deforming skin weights.
Original designs informed by the chunky military proportions of Front Mission 3;
no reference mesh, logo, texture or named weapon is reproduced.
"""
import json
import math
import site
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

import bpy
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError:
    # Blender omits user packages; use Pillow installed for its Python version.
    sys.path.append(site.getusersitepackages())
    from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[4]
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets'
BENCH = DIST / 'rig-bench'
bpy.ops.wm.read_factory_settings(use_empty=True)


def point(p):
    return Vector((p[0], -p[2], p[1]))


def material(name, rgb, metal=.65, rough=.4, emission=0):
    m = bpy.data.materials.new('armory_' + name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*rgb, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return m


M = {
    'frame': material('graphite', (.055, .072, .075), .75, .44),
    'plate': material('ceramic', (.47, .435, .36), .28, .60),
    'olive': material('olive', (.26, .30, .17), .65, .42),
    'steel': material('steel', (.40, .45, .47), .85, .31),
    'edge': material('edge', (.68, .72, .70), .9, .25),
    'black': material('rubber', (.025, .03, .028), .1, .77),
    'amber': material('ochre', (.48, .23, .07), .45, .5),
    'cyan': material('ion', (.07, .66, .81), .5, .25, .9),
    'heat': material('heat', (1, .24, .045), .4, .3, .8),
    'oxide': material('red_oxide', (.18,.12,.09), .60,.45),
    'navy': material('blue_slate', (.095,.125,.135), .65,.44),
    'sand': material('sand_casting', (.28,.29,.225), .60,.45),
    'warmsteel': material('warmsteel', (.28,.29,.275), .85,.33),
    'mark': material('identification', (.67,.65,.56), .22,.56),
}
roots, markers, mechanics = {}, {}, {}


def empty(name, p=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = point(p)
    obj.parent = parent
    return obj


def mesh(parent, name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([point(v) for v in vertices], [], faces)
    data.materials.append(M[mat])
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(parent.name + '.' + name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def box(parent, name, size, pos, mat='frame', bevel=.02):
    vertices = [(pos[0]+x*size[0]/2, pos[1]+y*size[1]/2, pos[2]+z*size[2]/2)
                for x, y, z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    obj = mesh(parent, name, vertices, [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)], mat)
    if bevel:
        mod = obj.modifiers.new('Edge break', 'BEVEL')
        mod.width, mod.segments = min(bevel, min(size)*.25), 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def ring(parent, name, outer, inner, length, pos, mat='steel', axis='z', n=12):
    vertices = []
    for z, radius in [(-length/2,outer),(length/2,outer),(-length/2,inner),(length/2,inner)]:
        for i in range(n):
            angle = i*math.tau/n
            p = (radius*math.cos(angle), radius*math.sin(angle), z)
            if axis == 'x': p = (p[2], p[0], p[1])
            if axis == 'y': p = (p[0], p[2], p[1])
            vertices.append(tuple(p[j]+pos[j] for j in range(3)))
    faces = []
    for i in range(n):
        j = (i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    return mesh(parent, name, vertices, faces, mat)


def cyl(parent, name, radius, length, pos, mat='steel', axis='z'):
    return ring(parent, name, radius, .001, length, pos, mat, axis)


def plate(parent, name, polygon, thickness, x=0, mat='plate'):
    count = len(polygon)
    vertices = [(x+s*thickness/2,y,z) for s in [-1,1] for y,z in polygon]
    faces = [tuple(range(count-1,-1,-1)), tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    return mesh(parent, name, vertices, faces, mat)


def weapon(name, tip=None, muzzle=None, muzzle2=None):
    root = roots[name] = empty(name)
    root['author'] = 'Original Iron Vow procedural geometry'
    root['forward_axis'] = '+Z'
    root['grip_origin'] = True
    markers[name] = {'grip': empty(name+'.grip', parent=root),
                     'axis': empty(name+'.axis', (0,0,1), root)}
    for role, p in [('tip',tip),('muzzle',muzzle),('muzzle2',muzzle2)]:
        if p: markers[name][role] = empty(name+'.'+role, p, root)
    return root


def pivot(root, role, pos, motion, travel):
    obj = empty(root.name+'.'+role, pos, root)
    obj['motion'], obj['axis'], obj['travel'] = motion, '+Z', travel
    mechanics[root.name] = {'node':obj.name,'motion':motion,'axis':[0,0,1],'travel':travel}
    return obj


def panel(parent,name,poly,thick,x=0,mat='plate',bevel=.025):
    obj=plate(parent,name,poly,thick,x,mat)
    if bevel:
        mod=obj.modifiers.new('Machined profile bevel','BEVEL')
        mod.width=min(bevel,thick*.28);mod.segments=1
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def hull(parent,name,sections,mat='frame'):
    # A continuous eight-sided casting, with independently tapered cross sections.
    vertices=[]
    for z,w,lo,hi,c in sections:
        vertices.extend([(x,y,z) for x,y in [(-w+c,lo),(w-c,lo),(w,lo+c),(w,hi-c),
                         (w-c,hi),(-w+c,hi),(-w,hi-c),(-w,lo+c)]])
    faces=[tuple(range(7,-1,-1)),tuple(range((len(sections)-1)*8,len(sections)*8))]
    for j in range(len(sections)-1):
        for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    return mesh(parent,name,vertices,faces,mat)


def shell(g,poly,width,mat='olive',inset=True):
    # A real open perimeter frame surrounds a lower inset face and gasket.
    cy=sum(y for y,z in poly)/len(poly);cz=sum(z for y,z in poly)/len(poly)
    for sign in [-1,1]:
        if not inset:
            panel(g,'casting_cheek',poly,.065,sign*width,mat)
            continue
        inner=[(cy+(y-cy)*.77,cz+(z-cz)*.83) for y,z in poly]
        n=len(poly)
        vs=[(sign*(width+depth),y,z) for shape,depth in [(poly,-.0325),(poly,.0325),
             (inner,-.0325),(inner,.0325)] for y,z in shape]
        faces=[]
        for i in range(n):
            j=(i+1)%n
            faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                          (n+i,n+j,3*n+j,3*n+i),(i,2*n+i,2*n+j,j)])
        mesh(g,'recessed_casting_rim',vs,faces,'frame')
        panel(g,'recess_gasket',inner,.012,sign*(width+.006),'black',.003)
        inner=[(cy+(y-cy)*.70,cz+(z-cz)*.76) for y,z in poly]
        panel(g,'inset_armour',inner,.014,sign*(width+.010),mat,.004)
        # Short machined lands on the cast rim, rather than a uniform bright outline.
        for i in range(0,n,2):
            a,b=poly[i],poly[(i+1)%n]
            ay,az=cy+(a[0]-cy)*.90,cz+(a[1]-cz)*.92
            by,bz=cy+(b[0]-cy)*.90,cz+(b[1]-cz)*.92
            dy,dz=by-ay,bz-az
            length=math.hypot(dy,dz)
            if length<.12:continue
            ny,nz=-dz/length*.009,dy/length*.009
            end=min(.46,.18/length)
            cut=[(ay+dy*t+ny*s,az+dz*t+nz*s) for t,s in [(.12,-1),(.12,1),(.12+end,1),(.12+end,-1)]]
            panel(g,'machined_rim_land',cut,.002,sign*(width+.034),'warmsteel',0)
        # Flush hex plugs sit on the inset, below the protective perimeter.
        for i in [0,n//2]:
            y,z=inner[i];y=cy+(y-cy)*.74;z=cz+(z-cz)*.74
            ring(g,'service_plug_recess',.034,.020,.003,(sign*(width+.019),y,z),'black','x',6)
            ring(g,'service_hex_plug',.020,.008,.004,(sign*(width+.020),y,z),'warmsteel','x',6)


def service_marks(g,width,y,z,count=3):
    for sign in [-1,1]:
        for k in range(count):
            zz=z+k*.065
            panel(g,'inspection_mark',[(y-.04,zz),(y+.04,zz+.027),
                  (y+.04,zz+.049),(y-.04,zz+.022)],.002,sign*width,'mark',0)


def forged_edge(g,profile):
    # Each profile vertex has its own half-thickness: a true sharpened wedge.
    n=len(profile)
    vertices=[(side*w,y,z) for side in [-1,1] for y,z,w in profile]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(g,'forged_cutting_bevel',vertices,faces,'edge')


def fasteners(g,width,points):
    for sign in [-1,1]:
        for y,z in points:
            ring(g,'counterbore',.043,.027,.018,(sign*width,y,z),'black','x',8)
            cyl(g,'hex_screw',.024,.021,(sign*(width+.008),y,z),'steel','x')


def saddle(g,mat='frame',wide=.30):
    # The contact witness is at the centre of the real crossbar. The guards bridge
    # into the receiver, enclosing a hand-size aperture rather than a thin stalk.
    cyl(g,'hand_crossbar',.105,wide*1.55,(0,0,0),'black','x')
    poly=[(-.34,-.28),(-.34,.39),(-.22,.51),(.35,.46),(.36,.24),
          (-.10,.24),(-.15,.13),(-.15,-.12),(.29,-.12),(.32,-.31)]
    for sign in [-1,1]:panel(g,'hand_saddle',poly,.09,sign*wide,mat)
    box(g,'palm_bridge',(wide*2+.09,.11,.26),(0,-.29,-.12),mat)
    box(g,'front_lock',(wide*2+.06,.12,.17),(0,.23,.37),'steel')
    empty(g.name+'.contact',(0,0,0),g)


def vents(g,width,y,z,length=.7,n=5):
    for sign in [-1,1]:
        for k in range(n):
            zz=z+k*length/max(1,n-1)
            panel(g,'sloped_exhaust',[(y-.055,zz-.028),(y+.055,zz+.006),
                  (y+.055,zz+.059),(y-.055,zz+.025)],.012,sign*width,'black',.002)


def hazard(g,width,y,z,count=3):
    for sign in [-1,1]:
        for k in range(count):
            zz=z+k*.13
            panel(g,'hazard_chevron',[(y-.09,zz),(y+.09,zz+.10),
                  (y+.09,zz+.15),(y-.09,zz+.05)],.009,sign*width,'amber',0)



# SIDEWINDER: compact casting over a substantial swept ammunition box.
g=weapon('sidewinder',muzzle=(0,.49,2.03));saddle(g,'olive')
hull(g,'receiver',[(-.62,.23,.28,.64,.06),(-.30,.32,.23,.81,.07),(.64,.30,.24,.75,.06),(1.10,.23,.34,.66,.04)])
shell(g,[(.30,-.47),(.64,-.48),(.76,-.18),(.70,.52),(.47,.88),(.30,.57)],.315,'olive')
panel(g,'swept_magazine',[(.28,.48),(.28,.95),(-.22,1.04),(-.64,1.31),(-.85,1.17),(-.78,.76),(-.30,.62)],.44,mat='frame',bevel=.045)
for sign in [-1,1]:
    panel(g,'magazine_inset',[(-.01,.61),(-.05,.86),(-.44,1.01),(-.69,1.11),(-.62,.87),(-.24,.72)],.03,sign*.235,'steel')
    for k in range(3):panel(g,'pressed_rib',[(-.18-k*.12,.69+k*.06),(-.20-k*.12,.86+k*.06),(-.25-k*.12,.88+k*.06),(-.23-k*.12,.70+k*.06)],.025,sign*.26,'frame',.006)
box(g,'magazine_heel',(.51,.11,.42),(0,-.76,1.06),'olive')
p=pivot(g,'bolt',(0,.50,.26),'translate',-.09)
for side in [-1,1]:box(p,'charging_slide',(.075,.12,.35),(side*.35,0,.07),'steel')
hull(g,'stub_handguard',[(.91,.22,.30,.68,.05),(1.23,.28,.22,.75,.06),(1.72,.26,.24,.72,.06)],'olive')
vents(g,.285,.49,1.20,.35,3)
ring(g,'bored_brake',.22,.12,.33,(0,.49,1.86),'frame',n=8)
ring(g,'bore_lip',.22,.12,.025,(0,.49,2.02),'steel',n=8)
panel(g,'folded_stock',[(.34,-.49),(.59,-.48),(.67,-.90),(.54,-1.10),(.24,-1.06),(.24,-.94),(.43,-.89)],.33,mat='olive')
fasteners(g,.36,[(.53,-.25),(.46,.58)])
service_marks(g,.337,.57,.05,3)

# TRIDENT: bullpup monocoque, rear ammunition shoe, open cast sight arch.
g=weapon('trident',muzzle=(0,.48,2.59));saddle(g,'sand',.29)
hull(g,'bullpup_casting',[(-1.0,.24,.24,.65,.06),(-.76,.35,.18,.85,.08),(.30,.32,.23,.80,.07),(.87,.28,.26,.68,.06),(1.16,.21,.34,.62,.04)])
shell(g,[(.27,-.90),(.69,-.90),(.80,-.65),(.77,-.06),(.57,.32),(.29,.35)],.35,'sand')
panel(g,'rear_magazine',[(-.03,-.86),(.28,-.80),(.29,-.40),(-.36,-.37),(-.43,-.65)],.49,mat='frame')
for side in [-1,1]:
    panel(g,'rear_feed_shoe',[(-.05,-.75),(.17,-.69),(.16,-.47),(-.28,-.46),(-.30,-.62)],.025,side*.255,'sand')
    panel(g,'open_sight_arch',[(.71,-.58),(.96,-.42),(1.02,.51),(.82,.86),(.75,.71),(.88,.46),(.84,-.29),(.70,-.43)],.07,side*.17,'frame')
box(g,'optic_bridge',(.39,.08,.37),(0,.97,.37),'sand')
hull(g,'forward_shroud',[(.81,.22,.32,.65,.04),(1.12,.30,.24,.72,.06),(1.91,.25,.26,.66,.04),(2.13,.18,.33,.60,.03)],'sand')
vents(g,.31,.49,1.16,.59,4)
ring(g,'bored_carbine',.115,.071,1.15,(0,.48,2.0),'steel')
ring(g,'brake',.19,.075,.18,(0,.48,2.50),'frame',n=8)
fasteners(g,.40,[(.53,-.69),(.44,-.03)])
service_marks(g,.372,.65,-.42,2)

# FORGE: ribbed siege bore, low return cylinder and wedge breech.
g=weapon('forge',muzzle=(0,.53,2.25));saddle(g,'oxide',.33)
hull(g,'breech_casting',[(-.74,.25,.20,.68,.06),(-.37,.43,.15,.93,.09),(.59,.40,.19,.86,.08),(.95,.30,.28,.73,.06)])
shell(g,[(.23,-.53),(.73,-.54),(.85,-.25),(.82,.38),(.58,.77),(.24,.51)],.435,'oxide')
p=pivot(g,'recoil',(0,.53,.78),'translate',-.19)
ring(p,'deep_slug_bore',.32,.205,1.35,(0,0,.78),'steel',n=16)
for z in [.20,.38,.56,.74,.92]:ring(p,'cooling_rib',.40,.31,.09,(0,0,z),'frame',n=12)
ring(p,'octagonal_brake',.43,.21,.30,(0,0,1.30),'oxide',n=8)
ring(p,'cut_bore_face',.43,.21,.028,(0,0,1.455),'edge',n=8)
cyl(g,'return_case',.18,.86,(0,.03,1.10),'frame')
cyl(p,'return_rod',.085,.76,(0,-.50,.63),'steel')
for side in [-1,1]:panel(g,'recoil_cheek',[(.13,.52),(.30,.51),(.36,1.28),(.25,1.56),(.06,1.44)],.075,side*.36,'oxide')
hazard(g,.48,.44,-.29,3);fasteners(g,.485,[(.68,-.25),(.39,.42)])

# EMBER: vented capacitor shoulders, exposed rotating induction cage and iris.
g=weapon('ember',muzzle=(0,.55,2.6675));saddle(g,'navy',.32)
hull(g,'capacitor_breech',[(-.80,.28,.25,.64,.05),(-.51,.40,.19,.99,.09),(.26,.39,.22,.96,.08),(.78,.28,.29,.76,.05)],'navy')
shell(g,[(.29,-.64),(.83,-.63),(.91,-.41),(.86,.14),(.51,.52),(.29,.37)],.40,'navy')
for side in [-1,1]:
    cyl(g,'external_capacitor',.15,.80,(side*.44,.49,-.14),'steel')
    for z in [-.45,.16]:ring(g,'capacitor_endcap',.18,.15,.10,(side*.44,.49,z),'frame')
vents(g,.46,.80,-.43,.46,4)
cyl(g,'plasma_core',.15,1.53,(0,.55,1.56),'heat')
p=pivot(g,'inductor',(0,.55,.94),'rotate',math.tau)
for z in [.10,.48,.86,1.24]:
    ring(p,'induction_rotor',.33,.21,.16,(0,0,z),'steel',n=12)
    for k in range(4):
        angle=k*math.tau/4
        box(p,'rotor_pickup',(.13,.13,.10),(.31*math.cos(angle),.31*math.sin(angle),z),'heat')
for side in [-1,1]:
    panel(g,'lower_emitter_cowl',[(.22,.65),(.37,.78),(.34,1.92),(.49,2.48),(.31,2.37),(.15,1.99)],.09,side*.38,'plate')
    panel(g,'upper_emitter_cowl',[(.76,.63),(.96,.94),(.94,1.81),(.79,2.42),(.67,2.37),(.79,1.78)],.10,side*.34,'navy')
ring(g,'iris_housing',.29,.13,.20,(0,.55,2.55),'frame')
ring(g,'iris_live_ring',.19,.13,.025,(0,.55,2.655),'heat')
fasteners(g,.45,[(.75,-.42),(.47,.29)])

# WATCHMAN: deep adjustable cheekstock, large optic and long tensioned barrel.
g=weapon('watchman',muzzle=(0,.49,3.93));saddle(g,'olive',.27)
hull(g,'marksman_action',[(-.60,.19,.29,.63,.04),(-.29,.28,.23,.76,.06),(.70,.26,.24,.72,.05),(1.10,.20,.33,.64,.035)])
shell(g,[(.32,-.45),(.64,-.45),(.69,.42),(.49,.88),(.30,.65)],.285,'olive')
panel(g,'skeletal_stock',[(.28,-.48),(.62,-.49),(.79,-.96),(.69,-1.25),(.22,-1.30),(.18,-1.12),(.48,-1.02),(.41,-.77)],.39,mat='olive')
box(g,'shoulder_pad',(.45,.53,.105),(0,.45,-1.32),'black')
panel(g,'box_magazine',[(.24,.40),(.20,.78),(-.34,.88),(-.40,.51)],.32,mat='frame')
for z in [.04,.65]:box(g,'scope_saddle',(.21,.20,.12),(0,.81,z),'frame')
cyl(g,'scope_body',.145,1.13,(0,1.0,.33),'frame')
for z in [-.25,.89]:ring(g,'optic_bell',.205,.145,.20,(0,1.0,z),'olive')
cyl(g,'recessed_lens',.14,.015,(0,1.0,.94),'cyan')
ring(g,'optic_lip',.207,.146,.035,(0,1.0,1.005),'steel')
cyl(g,'elevation_dial',.09,.15,(0,1.18,.33),'steel','y')
ring(g,'long_barrel',.105,.061,2.75,(0,.49,2.48),'steel',n=16)
for z in [1.04,1.42,1.79]:ring(g,'barrel_tensioner',.18,.108,.12,(0,.49,z),'olive')
for side in [-1,1]:panel(g,'floating_handguard',[(.31,.81),(.42,.94),(.35,2.10),(.23,1.94)],.055,side*.17,'frame')
ring(g,'precision_brake',.19,.065,.42,(0,.49,3.72),'frame',n=8)
vents(g,.195,.51,3.59,.25,3);fasteners(g,.33,[(.47,-.18),(.42,.54)])
service_marks(g,.307,.56,.17,3)

# FALCON: offset feed drum and triangulated barrel jacket around recoil sled.
g=weapon('falcon',muzzle=(0,.56,3.1225));saddle(g,'sand',.32)
hull(g,'autocannon_casting',[(-.72,.24,.25,.69,.06),(-.38,.37,.19,.91,.08),(.55,.36,.21,.88,.07),(.92,.26,.33,.72,.04)])
shell(g,[(.30,-.58),(.76,-.55),(.83,.31),(.56,.73),(.29,.49)],.385,'sand')
cyl(g,'offset_feed_drum',.39,.43,(-.48,.34,.04),'frame','x')
ring(g,'feed_drum_face',.40,.12,.065,(-.73,.34,.04),'sand','x')
cyl(g,'drum_latch',.10,.09,(-.77,.34,.04),'steel','x')
for k in range(5):box(g,'articulated_feed',(.10,.07,.12),(-.32-k*.08,.73-k*.035,.19),'steel',.008)
p=pivot(g,'recoil',(0,.56,.84),'translate',-.16)
ring(p,'autocannon_bore',.17,.10,2.16,(0,0,1.14),'steel')
ring(p,'brake',.27,.11,.30,(0,0,2.12),'frame',n=8)
ring(p,'brake_face',.27,.11,.025,(0,0,2.27),'edge',n=8)
for side in [-1,1]:
    panel(g,'jacket_upper_truss',[(.72,.71),(.90,.99),(.82,2.40),(.66,2.61),(.62,2.37),(.72,1.04)],.08,side*.28,'sand')
    panel(g,'jacket_lower_truss',[(.29,.72),(.39,1.02),(.34,2.42),(.18,2.41),(.19,1.00)],.075,side*.27,'frame')
    for z in [1.09,1.65,2.21]:panel(g,'jacket_bridge',[(.31,z),(.73,z+.11),(.76,z+.22),(.33,z+.11)],.085,side*.28,'sand')
hazard(g,.43,.52,-.32,2);fasteners(g,.43,[(.68,.10),(.38,.48)])

# CERBERUS: six actual recessed bores inside stepped armor and two firing sockets.
g=weapon('cerberus',muzzle=(-.32,.49,2.25),muzzle2=(.32,.84,2.25));saddle(g,'sand',.34)
hull(g,'launcher_cradle',[(-.50,.27,.23,.50,.04),(-.12,.48,.18,.48,.07),(1.58,.47,.18,.47,.07),(1.92,.37,.24,.45,.04)])
for x in [-.32,0,.32]:
    for y in [.49,.84]:
        ring(g,'launch_tube',.167,.125,1.79,(x,y,1.34),'frame',n=16)
        ring(g,'tube_liner',.131,.112,.28,(x,y,2.02),'steel',n=16)
        ring(g,'launch_lip',.176,.126,.065,(x,y,2.218),'edge',n=12)
        cyl(g,'recessed_rocket',.109,.06,(x,y,.65),'oxide')
for side in [-1,1]:
    panel(g,'pod_outer_cheek',[(.30,-.24),(.92,-.33),(1.12,.03),(1.10,1.66),(.93,2.10),(.34,2.10)],.10,side*.53,'sand')
    panel(g,'pod_inset',[(.46,.05),(.87,.05),(.98,.25),(.96,1.49),(.81,1.80),(.46,1.80)],.025,side*.59,'olive')
    vents(g,.615,.71,.35,.85,5)
box(g,'top_armour',(1.04,.13,1.48),(0,1.10,.83),'sand',.045)
box(g,'reload_access_gasket',(.62,.006,.72),(0,1.166,.82),'black',.002)
box(g,'reload_access_plate',(.56,.008,.66),(0,1.171,.82),'warmsteel',.002)
for x in [-.23,.23]:
    for z in [.55,1.09]:ring(g,'access_screw',.024,.009,.004,(x,1.177,z),'steel','y',6)
for z in [.18,1.47]:box(g,'tie_band',(1.22,.055,.14),(0,1.16,z),'frame')
for x in [-.50,.50]:box(g,'forward_bumper',(.13,.77,.13),(x,.67,2.20),'frame')
hazard(g,.59,.48,1.49,3);fasteners(g,.62,[(.90,.13),(.49,1.63)])
service_marks(g,.605,.88,1.10,2)

# OBELISK: wedge capacitors feeding tapered, open-channel accelerator tines.
g=weapon('obelisk',muzzle=(0,.56,3.84));saddle(g,'navy',.31)
hull(g,'rail_powerpack',[(-.78,.25,.24,.66,.06),(-.44,.40,.19,1.03,.09),(.28,.38,.22,.93,.08),(.86,.25,.32,.76,.05)])
shell(g,[(.31,-.62),(.84,-.62),(.96,-.29),(.83,.31),(.55,.66),(.28,.40)],.405,'navy')
for side in [-1,1]:
    cyl(g,'coolant_accumulator',.12,.99,(side*.43,.42,.08),'steel')
    panel(g,'accelerator_casting',[(.34,.66),(.81,.91),(.78,2.37),(.67,3.65),(.48,3.84),(.39,3.65),(.43,2.40)],.19,side*.25,'navy')
    panel(g,'inner_rail',[(.47,.91),(.65,.99),(.62,2.51),(.55,3.76),(.48,3.57)],.033,side*.145,'steel')
    box(g,'energy_channel',(.028,.055,2.72),(side*.125,.55,2.25),'cyan',.004)
    for z in [1.15,1.73,2.31,2.89]:panel(g,'ceramic_brace',[(.36,z),(.80,z+.04),(.79,z+.18),(.35,z+.15)],.23,side*.25,'plate')
vents(g,.45,.72,-.38,.57,4);fasteners(g,.45,[(.51,-.46),(.49,.38)])

# HATCHET: broad forged head, reinforced short haft and replaceable cutting edge.
g=weapon('hatchet',tip=(0,.97,2.12));saddle(g,'olive',.26)
hull(g,'axe_neck',[(-.25,.16,-.12,.19,.04),(.43,.18,-.13,.21,.04),(1.10,.19,-.16,.25,.04),(1.42,.29,-.20,.42,.05)])
for z in [.43,.64,.85]:ring(g,'shaft_collar',.22,.18,.07,(0,.04,z),'steel')
panel(g,'forged_head',[(-.35,1.13),(.23,1.08),(.76,1.20),(1.03,1.66),(.97,2.12),(.64,2.34),(.24,1.89),(-.26,1.66)],.40,mat='frame',bevel=.045)
shell(g,[(.02,1.25),(.37,1.27),(.73,1.43),(.77,1.77),(.55,1.99),(.28,1.69),(-.04,1.52)],.225,'olive')
forged_edge(g,[(.76,1.20,.035),(1.03,1.66,.025),(.97,2.12,.025),(.64,2.34,.03),
               (.61,2.19,.22),(.82,2.02,.23),(.89,1.69,.23),(.64,1.30,.21)])
panel(g,'rear_beak',[(-.19,1.15),(-.22,1.58),(-.64,1.82),(-.58,1.30)],.30,mat='steel')
fasteners(g,.28,[(.30,1.39),(.56,1.69)])

# PIKE: forearm-coupled pile bunker, pressure housing and crosshead guide rails.
g=weapon('pike',tip=(0,.37,2.42));saddle(g,'oxide',.34)
hull(g,'bunker_housing',[(-.67,.26,.17,.62,.07),(-.35,.42,.10,.86,.09),(.76,.41,.10,.81,.08),(1.37,.30,.17,.63,.06)])
shell(g,[(.20,-.48),(.69,-.49),(.81,-.24),(.75,.71),(.52,1.17),(.19,1.04)],.43,'oxide')
ring(g,'pressure_cylinder',.31,.22,1.34,(0,.37,.60),'steel',n=16)
ring(g,'guide_bearing',.36,.205,.20,(0,.37,1.40),'frame',n=12)
p=pivot(g,'lance',(0,.37,1.0),'translate',.95)
cyl(p,'pile_ram',.195,2.10,(0,0,.04),'steel')
mesh(p,'chisel_point',[(-.16,-.16,1.03),(.16,-.16,1.03),(.16,.16,1.03),(-.16,.16,1.03),(-.035,0,1.42),(.035,0,1.42)],[(0,1,2,3),(0,4,5,1),(1,5,2),(2,5,4,3),(3,4,0)],'edge')
for side in [-1,1]:
    cyl(g,'fixed_guide',.065,1.62,(side*.32,.37,.82),'steel')
    cyl(p,'sliding_guide',.043,1.20,(side*.32,0,0),'edge')
    box(p,'guide_crosshead',(.18,.30,.20),(side*.32,0,.38),'oxide')
    panel(g,'forearm_splint',[(.15,-.60),(.35,-.60),(.27,-.03),(-.18,.12),(-.28,-.21)],.10,side*.40,'oxide')
hazard(g,.48,.48,.42,3);fasteners(g,.48,[(.59,-.26),(.32,.82)])

# TONFA: long exposed baton, open forearm brace and a solid hardened strike cap.
g=weapon('tonfa',tip=(0,.30,2.62));saddle(g,'navy',.28)
hull(g,'baton_spine',[(-.64,.16,.14,.48,.04),(-.31,.22,.10,.55,.05),(1.90,.19,.13,.50,.05),(2.47,.15,.18,.45,.04)],'steel')
for z in [-.44,1.42,1.75,2.08]:ring(g,'shock_rib',.25,.19,.095,(0,.30,z),'frame',n=8)
for side in [-1,1]:
    panel(g,'open_forearm_brace',[(-.25,-.45),(.23,-.52),(.25,-.29),(-.02,-.20),(-.08,.48),(.22,1.03),(.23,1.30),(.02,1.24),(-.34,.61)],.09,side*.30,'navy')
    panel(g,'elbow_armour',[(.21,-.46),(.56,-.39),(.63,.20),(.51,.62),(.28,.68),(.19,.34)],.075,side*.25,'navy')
    panel(g,'armour_inset',[(.32,-.25),(.49,-.22),(.53,.20),(.44,.41),(.30,.40)],.022,side*.30,'plate')
ring(g,'impact_collar',.28,.17,.18,(0,.30,2.41),'frame',n=8)
cyl(g,'solid_strike_face',.23,.13,(0,.30,2.555),'edge')
for side in [-1,1]:box(g,'contact_rail',(.07,.09,1.03),(side*.15,.51,1.64),'amber')
fasteners(g,.34,[(.38,-.13),(.37,.42)])
service_marks(g,.313,.42,.04,2)
for side in [-1,1]:
    for z,length in [(.91,.17),(1.20,.11),(1.86,.15)]:
        box(g,'baton_machined_land',(.002,.017,length),(side*.192,.30,z),'warmsteel',0)

# ANCHOR HAMMER: asymmetric solid maul, short shaft and forward shock shoe.
g=weapon('anchor-hammer',tip=(0,.30,2.5875));saddle(g,'sand',.28)
hull(g,'reinforced_haft',[(-.33,.16,-.13,.22,.04),(.41,.21,-.15,.26,.04),(1.24,.20,-.13,.25,.04),(1.55,.29,-.23,.43,.06)])
for z in [.46,.70,.94]:ring(g,'haft_sleeve',.24,.18,.12,(0,.05,z),'steel',n=8)
panel(g,'maul_core',[(-.70,1.45),(-.40,1.30),(.74,1.32),(1.08,1.59),(1.04,2.11),(.72,2.31),(-.39,2.19),(-.72,1.90)],.70,mat='frame',bevel=.06)
shell(g,[(-.43,1.52),(.65,1.49),(.88,1.69),(.85,1.99),(.62,2.13),(-.33,2.02)],.38,'sand')
p=pivot(g,'striker',(0,.30,2.22),'translate',.18)
hull(p,'shock_shoe',[(-.15,.31,-.56,.59,.09),(.19,.44,-.65,.72,.10),(.32,.43,-.64,.71,.09)],'steel')
for x in [-.26,0,.26]:box(p,'strike_tooth',(.12,1.10,.055),(x,.03,.34),'edge',.012)
for side in [-1,1]:
    cyl(g,'shock_ram_case',.10,.38,(side*.29,.30,1.88),'frame')
    cyl(p,'shock_ram_rod',.056,.60,(side*.29,0,-.25),'edge')
    cyl(g,'head_lock',.11,.04,(side*.46,.27,1.70),'steel','x')
hazard(g,.43,.36,1.74,3)

# Move markers with their driven assemblies while preserving the authored pose.
bpy.context.view_layer.update()
for name, data in mechanics.items():
    if data['motion'] == 'translate' and name != 'sidewinder':
        marker = markers[name].get('muzzle') or markers[name].get('tip')
        world = marker.matrix_world.copy()
        marker.parent = bpy.data.objects[data['node']]
        marker.matrix_world = world

# Consolidate only within rigid pivots/materials, retaining mechanical hierarchy.
for parent in list(roots.values())+[bpy.data.objects[v['node']] for v in mechanics.values()]:
    groups = defaultdict(list)
    for obj in parent.children:
        if obj.type == 'MESH': groups[obj.data.materials[0].name].append(obj)
    for mat, group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group: obj.select_set(True)
        bpy.context.view_layer.objects.active = group[0]
        bpy.ops.object.join()
        group[0].name = parent.name+'__'+mat

bpy.context.view_layer.update()
stats = {}
for name, root in roots.items():
    meshes = [obj for obj in root.children_recursive if obj.type == 'MESH']
    triangles = sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in meshes)
    assert triangles < 8000, (name,triangles)
    assert root.location.length == 0 and root.scale == Vector((1,1,1))
    assert markers[name]['grip'].matrix_world.translation.length < 1e-6
    stats[name] = {'triangles':triangles,'meshes':len(meshes)}
    # Ordinary and extreme rigid travel must keep the grip fixed and move the tip.
    if name in mechanics:
        data = mechanics[name]
        moving = bpy.data.objects[data['node']]
        rest = moving.matrix_basis.copy()
        driven=markers[name].get('tip') or markers[name].get('muzzle')
        endpoint=driven.matrix_world.translation.copy()
        for amount in [.5,1.0]:
            if data['motion']=='translate': moving.location += point((0,0,data['travel']*amount))
            else: moving.rotation_euler[1] = -data['travel']*amount
            bpy.context.view_layer.update()
            assert markers[name]['grip'].matrix_world.translation.length < 1e-6
            assert (markers[name]['axis'].matrix_world.translation-point((0,0,1))).length < 1e-6
            expected=point((0,0,data['travel']*amount)) if data['motion']=='translate' and name!='sidewinder' else Vector((0,0,0))
            assert (driven.matrix_world.translation-endpoint-expected).length < 1e-5,(name,'attachment drift')
            assert all(math.isfinite(v) for obj in moving.children_recursive for row in obj.matrix_world for v in row)
            moving.matrix_basis = rest
        bpy.context.view_layer.update()

bpy.ops.object.select_all(action='DESELECT')
for root in roots.values():
    root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(BENCH/'expansion-weapons.glb'),export_format='GLB',use_selection=True,
                          export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True)
manifest={'authoring':'Original procedural geometry; no third-party assets','units':'metres; Y up; +Z forward; grip origin',
          'revision':'Wanzer-scale cast housings and seated hand saddles',
          'references':['https://db.hfsplay.fr/files/2019/08/06/Front_Mission_3_USA_ueYRtDe.pdf',
                        'https://frontmissionremake.com/front-mission-3/'],
          'weapons':stats,'mechanics':mechanics}
(BENCH/'expansion-weapons-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

# Match the existing weapon atlas cameras and pixel-space attachment convention.
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Expansion studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.24,.32,.40,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
def aim(obj,target): obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
for name,pos,energy,size,color in [('Key',(3,9,7),1500,5,(1,.92,.81)),('Fill',(-7,6,4),1250,6,(.61,.76,1)),('Rim',(4,7,-6),1750,5,(.57,.75,1))]:
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.size=size;light.color=color
    obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=point(pos);aim(obj,point((0,.2,1)))
camdata=bpy.data.cameras.new('Expansion camera');camera=bpy.data.objects.new('Expansion camera',camdata)
scene.collection.objects.link(camera);scene.camera=camera;camdata.type='ORTHO';camdata.ortho_scale=6.4
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
SIZE=768
scene.render.resolution_x=scene.render.resolution_y=SIZE;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
visuals={}
with tempfile.TemporaryDirectory() as tmp:
    for face,delta in [('left',(10.2,4.75,13.15)),('right',(-14,4.75,9.65))]:
        focus=point((0,.1,1.1));camera.location=focus+point(delta);aim(camera,focus)
        for name,root in roots.items():
            for other,assembly in roots.items():
                for obj in assembly.children_recursive: obj.hide_render=other!=name
            def bake(key):
                bpy.context.view_layer.update()
                scene.render.filepath=str(Path(tmp)/'weapon.png');bpy.ops.render.render(write_still=True)
                color=Image.open(scene.render.filepath).convert('RGBA');bounds=color.getbbox()
                assert bounds and min(bounds[:2])>2 and max(bounds[2:])<SIZE-2,(name,face,bounds)
                color.crop(bounds).save(ASSETS/(key+'.webp'),quality=94,method=4)
                def xy(marker):
                    p=world_to_camera_view(scene,camera,marker.matrix_world.translation)
                    return [round(p.x*SIZE-bounds[0],2),round((1-p.y)*SIZE-bounds[1],2)]
                return {'key':key,**{role:xy(obj) for role,obj in markers[name].items()},'pixelsPerMetre':SIZE/6.4}
            key='armory-'+name+'-'+face
            slot=bake(key)
            if name in ['pike','anchor-hammer']:
                moving=bpy.data.objects[mechanics[name]['node']]
                rest=moving.matrix_basis.copy()
                moving.location+=point((0,0,mechanics[name]['travel']))
                slot['impact']=bake(key+'-impact')
                moving.matrix_basis=rest
                bpy.context.view_layer.update()
            visuals.setdefault(name,{})[face]=slot
rigs={name:{'node':data['node'].split('.',1)[1],'amount':data['travel'],
            'kind':'spin' if data['motion']=='rotate' else 'strike' if name in ['pike','anchor-hammer'] else 'recoil'}
      for name,data in mechanics.items()}
(DIST/'armory-visuals.js').write_text('// Generated by tools/authoring/weapons/source/build_expansion.py.\nwindow.IRON_VOW_EXPANSION_ART='+json.dumps(visuals,separators=(',',':'))+';\nwindow.IRON_VOW_EXPANSION_RIG='+json.dumps(rigs,separators=(',',':'))+';\n')

# Art review sheet is a deliverable, not used by the game loader.
sheet=Image.new('RGB',(1440,1080),(18,27,32));draw=ImageDraw.Draw(sheet)
for i,name in enumerate(roots):
    x,y=(i%4)*360,(i//4)*360
    draw.rounded_rectangle((x+8,y+8,x+352,y+352),12,fill=(29,41,47),outline=(67,79,82))
    draw.text((x+23,y+25),name.upper(),fill=(232,185,108))
    for side,oy in [('left',60),('right',205)]:
        im=Image.open(ASSETS/('armory-'+name+'-'+side+'.webp')).convert('RGBA');im.thumbnail((310,130))
        sheet.paste(im,(x+(360-im.width)//2,y+oy+(130-im.height)//2),im)
sheet.save(ROOT.parent/'armory-expansion-review.png')

def paste_fit(sheet,path,rect):
    im=Image.open(path).convert('RGBA');x,y,w,h=rect
    scale=min(w/im.width,h/im.height)
    im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
    sheet.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2),im)

font=ImageFont.load_default(size=20);small=ImageFont.load_default(size=15)
before=ROOT.parent/'armory-before'
if before.exists():
    sheet=Image.new('RGB',(1800,1600),(16,24,30));draw=ImageDraw.Draw(sheet)
    for i,name in enumerate(roots):
        x,y=i%3*600,i//3*400
        draw.rounded_rectangle((x+8,y+8,x+592,y+392),12,fill=(29,40,47),outline=(65,81,85))
        draw.text((x+24,y+19),name.upper(),font=font,fill=(237,187,103))
        draw.text((x+22,y+57),'BEFORE',font=small,fill=(143,160,167))
        draw.text((x+22,y+222),'REBUILT',font=small,fill=(213,225,218))
        paste_fit(sheet,before/f'armory-{name}-left.webp',(x+105,y+51,465,142))
        paste_fit(sheet,ASSETS/f'armory-{name}-left.webp',(x+105,y+215,465,155))
    sheet.save(ROOT.parent/'armory-rebuild-comparison.png')
for title,group in [('melee',['pike','tonfa','anchor-hammer']),('assault',['sidewinder','trident','forge','falcon'])]:
    sheet=Image.new('RGB',(600*len(group),1040),(19,28,34));draw=ImageDraw.Draw(sheet)
    for i,name in enumerate(group):
        x=i*600;draw.text((x+25,24),name.upper(),font=font,fill=(237,187,103))
        for j,face in enumerate(['left','right']):
            draw.text((x+25,75+j*315),face.upper(),font=small,fill=(143,160,167))
            paste_fit(sheet,ASSETS/f'armory-{name}-{face}.webp',(x+45,108+j*315,510,265))
        if name in ['pike','anchor-hammer']:
            draw.text((x+25,710),'FULL STROKE',font=small,fill=(237,187,103))
            paste_fit(sheet,ASSETS/f'armory-{name}-left-impact.webp',(x+45,750,510,265))
    sheet.save(ROOT.parent/f'armory-{title}-detail.png')
print('EXPANSION_COMPLETE',json.dumps(stats),flush=True)
