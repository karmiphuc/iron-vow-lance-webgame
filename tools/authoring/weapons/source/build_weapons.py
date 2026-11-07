"""Original IRON VOW weapon set. Blender 4.3+; run blender -b -P build_weapons.py.
Authoring coordinates: X right, Y up, +Z weapon forward. Grip at origin.
All meshes authored procedurally from original forms; no third-party art.
"""
import bpy, bmesh, math, os, json, struct
from mathutils import Vector
from collections import defaultdict
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets'); os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def mat(name,rgb,metal=0,rough=.5,emission=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=(*rgb,1);n.inputs['Emission Strength'].default_value=emission
 return m
M={
 'armor':mat('weapon_armor_olive',(.26,.30,.17),.65,.42),
 'armor2':mat('weapon_armor_dark_olive',(.14,.17,.105),.6,.45),
 'steel':mat('weapon_steel_brushed',(.40,.45,.47),.85,.31),
 'edge':mat('weapon_steel_cutting_edge',(.68,.72,.7),.9,.25),
 'frame':mat('weapon_frame_graphite',(.055,.072,.075),.75,.44),
 'rubber':mat('weapon_grip_rubber',(.025,.03,.028),.1,.77),
 'accent':mat('weapon_safety_amber',(.94,.28,.035),.45,.42),
 'stripe':mat('weapon_identification_white',(.83,.84,.73),.3,.5),
 'rail':mat('emissive_rail',(.075,.65,1),.4,.25,1.2),
 'heat':mat('emissive_edge',(1,.23,.02),.4,.3,2.2),
 'glass':mat('weapon_optic_cyan',(.05,.65,.85),.65,.16,.6)
}
M.update({
 'ceramic':mat('weapon_armor_warm_ceramic',(.47,.435,.36),.28,.60),
 'gunmetal':mat('weapon_armor_charcoal',(.075,.086,.091),.73,.42),
 'warmsteel':mat('weapon_steel_warm_machined',(.28,.29,.275),.85,.33),
 'gunmark':mat('weapon_identification_bone',(.67,.65,.56),.22,.56),
 'service':mat('weapon_service_ochre',(.48,.23,.07),.45,.5)
})
def cv(p):return (p[0],-p[2],p[1])
def empty(name,p=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=cv(p);o.parent=parent;return o
P={}; objs=[]
def mesh(name,vs,fs,ma,parent):
 me=bpy.data.meshes.new(name);me.from_pydata([cv(v) for v in vs],[],fs);me.materials.append(M[ma]);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=parent;objs.append(o);return o
def box(parent,name,dim,p,ma='frame',bev=.025,rot=0):
 x,y,z=[v/2 for v in dim];vs=[(a*x,b*y,c*z) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
 if rot:vs=[(v[0],v[1]*math.cos(rot)-v[2]*math.sin(rot),v[1]*math.sin(rot)+v[2]*math.cos(rot)) for v in vs]
 vs=[tuple(v[i]+p[i] for i in range(3)) for v in vs]
 o=mesh(name,vs,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],ma,parent)
 if bev:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  mod=o.modifiers.new('Manufactured chamfer','BEVEL');mod.width=min(bev,min(dim)*.28);mod.segments=1
  bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 return o
def cyl(parent,name,r,length,p,ma='steel',axis='z',n=12,r2=None):
 r2=r if r2 is None else r2
 vs=[]
 for h,rr in [(-length/2,r),(length/2,r2)]:
  for i in range(n):
   a=i*math.tau/n; v=(rr*math.cos(a),rr*math.sin(a),h)
   if axis=='x':v=(v[2],v[0],v[1])
   elif axis=='y':v=(v[0],v[2],v[1])
   vs.append(tuple(v[k]+p[k] for k in range(3)))
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,vs,fs,ma,parent)
def ring(parent,name,ro,ri,depth,p,ma='steel',n=16,axis='z'):
 vs=[]
 for z,r in [(-depth/2,ro),(depth/2,ro),(-depth/2,ri),(depth/2,ri)]:
  for i in range(n):
   a=i*math.tau/n;v=(r*math.cos(a),r*math.sin(a),z)
   if axis=='x':v=(v[2],v[0],v[1])
   elif axis=='y':v=(v[0],v[2],v[1])
   vs.append(tuple(v[k]+p[k] for k in range(3)))
 fs=[]
 for i in range(n):
  j=(i+1)%n;fs += [(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)]
 return mesh(name,vs,fs,ma,parent)
def plate(parent,name,poly,thick,x,ma='armor'):
 n=len(poly);vs=[(x+s*thick/2,y,z) for s in [-1,1] for y,z in poly]
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,vs,fs,ma,parent)
def bolt(parent,p,axis='x',r=.023):cyl(parent,'recessed_fastener',r,.016,p,'steel',axis,6)
def ribs(parent,z0,z1,y,width=.23,n=7):
 for i in range(n):box(parent,'receiver_cooling_rib',(width,.055,.045),(0,y,z0+(z1-z0)*i/max(n-1,1)),'frame',.009)
def stripes(parent,x,y,z,length=.25):
 for i in range(2):plate(parent,'diagonal_identification',[(y-.08,z+i*.12),(y-.08,z+i*.12+.065),(y+.08,z+i*.12+.15),(y+.08,z+i*.12+.085)],.005,x,'stripe')
def grip(parent):
 box(parent,'pistol_grip',(.19,.53,.24),(0,-.075,.015),'rubber',.035,.17)
 for i in range(4):box(parent,'grip_ridge',(.201,.03,.21),(0,-.23+i*.08,.015),'frame',.006,.17)
 # slim trigger guard keeps grip visually legible
 box(parent,'trigger_guard_lower',(.1,.055,.36),(0,-.27,.27),'frame',.015)
 box(parent,'trigger_guard_front',(.1,.22,.055),(0,-.15,.45),'frame',.015)
 box(parent,'trigger',(.065,.17,.06),(0,-.025,.27),'steel',.012,.18)
# Rifle upgrades: original swept armor and actual open structural windows.
def panel(parent,name,poly,thick,x,ma='ceramic',bevel=.008):
 o=plate(parent,name,poly,thick,x,ma)
 if bevel:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  mod=o.modifiers.new('Plate edge break','BEVEL');mod.width=min(bevel,thick*.3);mod.segments=1
  bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 return o
def hull(parent,name,sections,ma='gunmetal'):
 # sections are (Z, half-width, Y-bottom, Y-top, corner-cut).
 vs=[]
 for z,w,lo,hi,c in sections:
  vs.extend([(x,y,z) for x,y in [(-w+c,lo),(w-c,lo),(w,lo+c),(w,hi-c),(w-c,hi),(-w+c,hi),(-w,hi-c),(-w,lo+c)]])
 fs=[tuple(range(7,-1,-1)),tuple(range((len(sections)-1)*8,len(sections)*8))]
 for j in range(len(sections)-1):
  for i in range(8):fs.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 return mesh(name,vs,fs,ma,parent)
def wornseam(g,x,y,z,length=.25):
 # Fine pale metal edge fragments, modeled, not texture-dependent.
 for k in range(3):box(g,'machined_panel_edge',(.004,.009,length/(k+3)),(x,y,z+k*.105),'warmsteel',0)
def idmarks(g,x,y,z):
 for i in range(3):panel(g,'short_diagonal_id',[(y-.055,z+i*.07),(y-.055,z+i*.07+.027),(y+.055,z+i*.07+.070),(y+.055,z+i*.07+.043)],.004,x,'gunmark',0)
# KESTREL: full-length open tactical handguard and stepped monocoque receiver.
g=empty('kestrel');P['kestrel']=g;grip(g)
hull(g,'kestrel_receiver',[(-.45,.145,.15,.50,.025),(-.28,.185,.10,.61,.045),(.62,.185,.10,.61,.035),(.87,.17,.16,.59,.035)],'gunmetal')
box(g,'receiver_lower_spine',(.23,.10,.68),(0,.14,.28),'frame',.02)
for side in [-1,1]:
 panel(g,'rear_receiver_ceramic',[(.24,-.32),(.49,-.35),(.58,-.19),(.58,.20),(.44,.31),(.24,.22)],.026,side*.187)
 panel(g,'front_receiver_cheek',[(.15,.34),(.49,.32),(.55,.45),(.55,.79),(.26,.89),(.15,.72)],.025,side*.189,'gunmetal')
 panel(g,'receiver_bolt_cover',[(.37,.32),(.47,.32),(.49,.62),(.43,.69),(.36,.61)],.014,side*.205,'warmsteel')
 box(g,'ejection_port_recess',(.008,.074,.21),(side*.215,.412,.5),'rubber',.006)
 box(g,'charging_handle',(.052,.042,.10),(side*.227,.49,.39),'warmsteel',.01)
 for y,z in [(.28,-.20),(.51,.08),(.22,.72)]:bolt(g,(side*.211,y,z),r=.019)
 idmarks(g,side*.205,.40,-.19);wornseam(g,side*.205,.555,-.18,.17)
 # A three-window handguard assembled as structural rails, so slots are genuinely open.
 panel(g,'handguard_top_rail',[(.51,.80),(.63,.93),(.61,2.18),(.51,2.44),(.48,2.25)],.034,side*.172,'gunmetal')
 panel(g,'handguard_lower_rail',[(.13,.87),(.17,2.27),(.25,2.44),(.29,2.24),(.25,1.03)],.038,side*.165,'gunmetal')
 panel(g,'forearm_ceramic_slab',[(.55,1.05),(.65,1.17),(.64,1.83),(.55,2.05),(.51,1.18)],.025,side*.195)
 for z in [1.02,1.43,1.87,2.27]:
  panel(g,'angled_handguard_bridge',[(.21,z-.055),(.28,z+.07),(.55,z+.12),(.58,z+.045)],.042,side*.174,'gunmetal')
 for z in [1.20,1.70]:bolt(g,(side*.214,.58,z),r=.017)
 # Thin lower accessory interface and short metal wear caps.
 box(g,'handguard_accessory_strip',(.019,.045,.91),(side*.193,.232,1.63),'warmsteel',.008)
 for z in [1.27,1.53,1.79,2.03]:box(g,'accessory_slot',(.021,.023,.10),(side*.205,.231,z),'rubber',.003)
box(g,'continuous_optics_rail',(.19,.055,1.81),(0,.655,.91),'frame',.012)
for i in range(14):box(g,'picatinny_tooth',(.225,.032,.041),(0,.695,.04+i*.13),'warmsteel',.006)
# Barrel floats inside the open handguard and steps down before a deeply bored brake.
cyl(g,'free_floating_barrel',.069,2.0,(0,.36,1.96),'warmsteel',n=16)
cyl(g,'gas_piston_tube',.031,1.55,(0,.49,1.79),'steel',n=10)
ring(g,'front_gas_block',.113,.071,.15,(0,.36,2.43),'gunmetal',12)
box(g,'gas_block_sight',(.12,.13,.10),(0,.51,2.43),'gunmetal',.015)
ring(g,'muzzle_brake_body',.145,.078,.39,(0,.36,3.025),'gunmetal',8)
ring(g,'muzzle_bright_bore',.146,.079,.025,(0,.36,3.22),'warmsteel',8)
# Long exposed barrel-end channels terminate before the bore rim.
for side in [-1,1]:
 for z in [2.91,3.06]:panel(g,'muzzle_side_port',[(.31,z-.035),(.40,z-.025),(.40,z+.045),(.31,z+.035)],.005,side*.146,'rubber',0)
ring(g,'barrel_lock_nut',.105,.072,.09,(0,.36,2.79),'steel',12)
# Tapered magazine with stamped channels, remaining inside previous clearance envelope.
magpoly=[(.18,.63),(.18,.91),(-.31,1.05),(-.405,.94),(-.405,.76),(-.18,.69)]
panel(g,'curved_magazine',magpoly,.25,0,'gunmetal',.025)
for side in [-1,1]:
 panel(g,'magazine_inset',[(.08,.70),(.08,.86),(-.29,.97),(-.34,.88),(-.32,.80)],.009,side*.131,'warmsteel',.002)
 for z in [.76,.83]:box(g,'magazine_pressed_rib',(.009,.27,.022),(side*.139,-.12,z),'frame',.003,.18)
box(g,'magazine_reinforced_heel',(.278,.06,.27),(0,-.386,.88),'frame',.012)
# Adjustable rear stock has a large visible triangular opening.
box(g,'buffer_tube',(.15,.115,.55),(0,.405,-.67),'warmsteel',.018)
for side in [-1,1]:
 panel(g,'stock_upper_shell',[(.39,-1.27),(.54,-1.16),(.55,-.73),(.46,-.54),(.38,-.69)],.046,side*.122,'gunmetal')
 panel(g,'stock_lower_strut',[(.105,-1.22),(.18,-1.22),(.34,-.69),(.27,-.67)],.045,side*.108,'gunmetal')
 panel(g,'stock_cheek_pad',[(.46,-1.16),(.58,-1.09),(.58,-.83),(.53,-.73),(.46,-.81)],.025,side*.149)
box(g,'stock_recoil_pad',(.31,.42,.095),(0,.28,-1.285),'rubber',.025)
box(g,'stock_adjustment_latch',(.17,.042,.11),(0,.175,-.94),'service',.008)
# Low armored prism sight, under original optic height.
box(g,'optic_mount',(.17,.08,.28),(0,.757,.28),'gunmetal',.014)
hull(g,'prism_optic',[(.03,.083,.79,.96,.025),(.44,.094,.79,.97,.025),(.57,.082,.80,.95,.02)],'gunmetal')
cyl(g,'optic_lens',.060,.009,(0,.875,.579),'glass',n=12)
ring(g,'optic_front_rim',.077,.061,.025,(0,.875,.58),'warmsteel',12)
box(g,'optic_elevation_knob',(.09,.035,.10),(0,.984,.28),'warmsteel',.008)
empty('muzzle',(0,.36,3.25),g);empty('eject',(-.2,.4,.5),g)
# HAILSTORM: six independent bores, ring bracing and feed drum.
g=empty('hailstorm');P['hailstorm']=g;grip(g)
box(g,'rotary_receiver',(.56,.56,1.40),(0,.36,.24),'frame',.09)
box(g,'upper_armor',(.59,.18,1.06),(0,.59,.27),'armor',.045)
box(g,'rotary_safety_latch',(.38,.055,.22),(0,.707,.54),'accent',.015)
for s in [-1,1]:
 plate(g,'receiver_cheek',[(.16,-.38),(.52,-.38),(.59,.35),(.41,.84),(.16,.77)],.035,s*.288,'armor2')
 stripes(g,s*.309,.40,-.30)
 for z in [.2,.37,.54]:box(g,'motor_cooling_vent',(.009,.12,.07),(s*.309,.32,z),'rubber',0)
 for z in [-.28,.65]:bolt(g,(s*.31,.20,z))
cyl(g,'ammunition_drum',.38,.49,(0,-.12,-.25),'frame','x',16)
for s in [-1,1]:
 cyl(g,'drum_armored_end',.395,.045,(s*.258,-.12,-.25),'armor','x',12)
 ring(g,'drum_outer_rim',.405,.34,.025,(s*.286,-.12,-.25),'steel',16,'x')
 cyl(g,'drum_center_boss',.13,.045,(s*.302,-.12,-.25),'accent','x',8)
 for a in [0,math.pi/2,math.pi,3*math.pi/2]:bolt(g,(s*.314,-.12+.26*math.cos(a),-.25+.26*math.sin(a)),r=.025)
for i in range(6):
 t=i/5;box(g,'linked_ammunition_belt',(.10,.105,.13),(-.32-.055*math.sin(t*math.pi),-.05+t*.34,-.05+t*.4),'steel',.015)
barrels=empty('barrels',(0,.36,1),g)
ring(barrels,'rotor_root',.30,.12,.27,(0,0,.12),'frame',12)
for i in range(6):
 a=i*math.tau/6;x,y=.17*math.cos(a),.17*math.sin(a)
 cyl(barrels,'rotary_barrel',.063,1.77,(x,y,1.055),'steel',n=8)
 ring(barrels,'barrel_bore',.068,.043,.18,(x,y,1.96),'frame',8)
 ring(barrels,'bore_machined_edge',.069,.044,.022,(x,y,2.047),'steel',8)
for z in [.59,1.15,1.72]:ring(barrels,'barrel_brace',.279,.218,.075,(0,0,z),'frame',12)
ring(barrels,'front_brace',.28,.225,.08,(0,0,1.94),'armor',12)
cyl(barrels,'central_drive_shaft',.07,1.55,(0,0,.94),'frame',n=8)
empty('muzzle',(0,.36,3.05),g);empty('eject',(-.3,.3,.4),g)
# LONGBOW: tapered capacitor breech, split ceramic armor, exposed accelerator windows.
g=empty('longbow');P['longbow']=g;grip(g)
hull(g,'rail_breech_monocoque',[(-.69,.16,.14,.52,.04),(-.48,.215,.10,.65,.045),(.43,.215,.12,.63,.045),(.76,.15,.19,.54,.03)],'gunmetal')
hull(g,'raised_capacitor_spine',[(-.58,.18,.54,.78,.04),(-.36,.235,.53,.91,.045),(.04,.235,.53,.90,.035),(.33,.17,.53,.76,.04)],'gunmetal')
for side in [-1,1]:
 panel(g,'capacitor_ceramic_cheek',[(.55,-.49),(.76,-.48),(.88,-.30),(.87,.01),(.73,.24),(.55,.17)],.032,side*.238)
 panel(g,'lower_breech_armor',[(.19,-.55),(.44,-.59),(.52,-.42),(.52,.05),(.40,.25),(.18,.09)],.028,side*.220,'gunmetal')
 panel(g,'forward_breech_panel',[(.19,.20),(.47,.24),(.57,.41),(.48,.72),(.24,.67)],.025,side*.219)
 idmarks(g,side*.240,.35,-.38)
 for y,z in [(.71,-.30),(.67,.08),(.25,.43)]:bolt(g,(side*.262 if y>.6 else side*.241,y,z),r=.020)
 for z in [-.32,-.16,0]:box(g,'capacitor_air_slot',(.008,.055,.058),(side*.26,.73,z),'rubber',.004)
 # Low accumulator shafts remain tucked into the former side envelope.
 cyl(g,'breech_accumulator',.065,.82,(side*.287,.36,-.12),'warmsteel',n=12)
 for z in [-.48,.22]:ring(g,'accumulator_clamp',.080,.065,.075,(side*.287,.36,z),'gunmetal',10)
 box(g,'charge_gauge_recess',(.008,.057,.21),(side*.239,.435,.47),'frame',.005)
 for z in [.405,.465,.525]:box(g,'charge_gauge_bar',(.012,.033,.025),(side*.245,.435,z),'rail',.003)
box(g,'capacitor_ridge',(.20,.047,.40),(0,.935,-.15),'warmsteel',.009)
box(g,'capacitor_service_lock',(.085,.022,.09),(0,.965,-.20),'service',.006)
# Two long, load-bearing rail spines form the visual direction. The beam path stays open.
for yy in [.14,.58]:
 box(g,'precision_acceleration_rail',(.145,.105,2.96),(0,yy,1.90),'warmsteel',.016)
 box(g,'rail_contact_edge',(.068,.020,2.82),(0,yy+(.06 if yy<.3 else -.06),1.90),'steel',.005)
box(g,'ionization_core',(.052,.052,2.87),(0,.36,1.875),'rail',.01)
# Four rectangular coil packs replace the toy-like rings with staggered armored stations.
for i,z in enumerate([.90,1.53,2.16,2.79]):
 ring(g,'accelerator_field_shell',.294,.239,.14,(0,.36,z),'gunmetal',12)
 ring(g,'recessed_field_winding',.264,.237,.102,(0,.36,z+.009),'rail',12)
 for side in [-1,1]:
  panel(g,'coil_station_ceramic',[(.15,z-.10),(.25,z-.16),(.52,z-.14),(.59,z-.04),(.54,z+.13),(.25,z+.13)],.046,side*.281,'ceramic')
  box(g,'coil_station_lateral_recess',(.008,.18,.10),(side*.308,.37,z),'gunmetal',.008)
  bolt(g,(side*.319,.49,z-.02),r=.018)
 for yy in [.66,.06]:box(g,'coil_bridge_insulator',(.17,.075,.16),(0,yy,z),'gunmark',.012)
for side in [-1,1]:
 # Angled upper and lower spars create long windows between coil stations.
 panel(g,'upper_cage_spar',[(.57,.68),(.69,.91),(.69,2.83),(.57,3.14),(.55,2.86),(.58,.96)],.042,side*.128,'gunmetal')
 panel(g,'lower_cage_spar',[(.15,.68),(.03,.91),(.03,2.83),(.15,3.14),(.17,2.86),(.14,.96)],.042,side*.128,'gunmetal')
 panel(g,'forward_rail_fairing',[(.60,2.43),(.70,2.54),(.69,2.91),(.54,3.19),(.54,2.83)],.025,side*.155)
 for z in [1.12,1.75,2.38]:box(g,'rail_dissipator_pad',(.035,.032,.24),(side*.154,.71,z),'warmsteel',.006)
# Open muzzle with nested machining shoulders; nothing caps its beam aperture.
ring(g,'muzzle_external_shoulder',.285,.225,.14,(0,.36,3.32),'gunmetal',12)
ring(g,'muzzle_machined_lip',.282,.224,.033,(0,.36,3.413),'warmsteel',12)
for side in [-1,1]:panel(g,'muzzle_side_cheek',[(.19,3.15),(.51,3.15),(.57,3.27),(.48,3.39),(.24,3.39),(.15,3.27)],.025,side*.253,'gunmetal')
empty('muzzle',(0,.36,3.45),g)
# BREAKER: compact piled hammer, reinforced strike shoe and ribbed haft.
g=empty('breaker');P['breaker']=g
cyl(g,'hammer_structural_haft',.085,2.2,(0,0,.77),'steel',n=10)
cyl(g,'hammer_handgrip',.13,.57,(0,0,0),'rubber',n=10)
for z in [-.22,-.12,-.02,.08,.18]:ring(g,'grip_ring',.138,.12,.025,(0,0,z),'frame',10)
cyl(g,'hammer_pommel',.15,.10,(0,0,-.35),'accent',n=8)
for z in [.57,1.10,1.57]:cyl(g,'haft_collar',.13,.11,(0,0,z),'frame',n=8)
box(g,'impact_head_core',(.74,1.20,.78),(0,0,2.2),'frame',.095)
for s in [-1,1]:
 plate(g,'hammer_cheek_armor',[(-.60,1.88),(-.46,1.77),(.43,1.77),(.60,1.94),(.60,2.46),(.42,2.63),(-.46,2.63),(-.60,2.50)],.055,s*.393,'armor')
 box(g,'hammer_recess',(.012,.40,.46),(s*.429,.01,2.2),'frame',.015)
 for y in [-.13,0,.13]:box(g,'hammer_side_vent',(.016,.035,.32),(s*.438,y,2.2),'steel',.003)
 stripes(g,s*.435,.41,1.98)
 for y in [-.46,.46]:
  for z in [1.92,2.49]:bolt(g,(s*.434,y,z),r=.031)
box(g,'impact_shoe_mount',(.84,.18,.88),(0,-.62,2.2),'frame',.05)
box(g,'striking_face',(.9,.22,.95),(0,-.74,2.2),'steel',.045)
for x in [-.30,0,.30]:box(g,'impact_face_teeth',(.16,.035,.70),(x,-.845,2.2),'edge',.008)
box(g,'counterweight',(.49,.29,.51),(0,.76,2.2),'frame',.045)
box(g,'counterweight_armor',(.51,.08,.47),(0,.92,2.2),'armor2',.02)
for y in [-.31,.31]:box(g,'head_safety_band',(.84,.085,.85),(0,y,2.2),'accent',.013)
for s in [-1,1]:
 cyl(g,'impact_tension_rod',.055,.84,(s*.455,0,2.2),'steel','y',8)
 for y in [-.43,.43]:cyl(g,'tension_rod_seat',.078,.06,(s*.455,y,2.2),'frame','y',8)
empty('tip',(0,-.85,2.2),g);empty('base',(0,0,1.4),g)
# CLEAVER: straight heated cutting line exactly tracks base and tip attachments.
g=empty('cleaver');P['cleaver']=g
cyl(g,'cleaver_handgrip',.095,.62,(0,0,0),'rubber',n=10)
for z in [-.22,-.10,.02,.14]:ring(g,'cleaver_grip_ring',.102,.088,.025,(0,0,z),'frame',10)
cyl(g,'cleaver_pommel',.12,.075,(0,0,-.35),'steel',n=8)
box(g,'cleaver_guard',(.40,.48,.15),(0,0,.36),'frame',.035)
box(g,'guard_amber_tab',(.42,.07,.10),(0,.16,.37),'accent',.015)
blade=[(-.16,.53),(-.20,.70),(-.20,3.05),(.17,2.91),(.30,2.58),(.30,.72),(.15,.53)]
plate(g,'cleaver_forged_blade',blade,.105,0,'steel')
for s in [-1,1]:
 plate(g,'blade_recessed_fuller',[(.035,.77),(.035,2.69),(.12,2.77),(.18,2.58),(.18,.77)],.008,s*.057,'frame')
 plate(g,'blade_sharpened_bevel',[(-.195,.70),(-.195,3.05),(-.105,2.92),(-.105,.72)],.012,s*.060,'edge')
 for z in [.86,1.44,2.02,2.57]:bolt(g,(s*.066,.235,z),r=.018)
box(g,'heated_cutting_edge',(.116,.035,2.35),(0,-.20,1.875),'heat',.005)
plate(g,'reinforced_blade_spine',[(.235,.59),(.34,.70),(.34,2.50),(.24,2.68),(.22,.74)],.15,0,'armor2')
for z in [.82,1.35,1.88,2.38]:box(g,'spine_heat_sink',(.16,.06,.15),(0,.36,z),'frame',.008)
box(g,'blade_power_coupler',(.145,.17,.29),(0,.08,.62),'accent',.018)
for s in [-1,1]:stripes(g,s*.079,.17,.64)
empty('tip',(0,-.2,3.05),g);empty('base',(0,-.2,.7),g)
# PILE DRIVER: boxed hydraulic receiver, parallel rods, translating steel ram.
g=empty('piledriver');P['piledriver']=g;grip(g)
receiver_start=len(objs)
box(g,'hydraulic_receiver',(.59,.54,1.58),(0,.58,-.35),'frame',.07)
box(g,'upper_ram_armor',(.62,.15,1.05),(0,.82,-.32),'armor',.035)
box(g,'ram_safety_tab',(.40,.045,.23),(0,.915,-.37),'accent',.012)
for s in [-1,1]:
 plate(g,'hydraulic_side_armor',[(.37,-1.12),(.74,-1.12),(.80,-.42),(.70,.35),(.44,.44),(.32,.14)],.03,s*.307,'armor2')
 stripes(g,s*.327,.58,-.99)
 # Nest the inboard hydraulic guide inside the cheek to clear the torso at full windup.
 guide_x=-.26 if s<0 else .35
 cyl(g,'external_piston_rod',.052,1.32,(guide_x,.58,-.29),'steel',n=10)
 for z in [-.89,.32]:cyl(g,'piston_rod_mount',.085,.12,(guide_x,.58,z),'frame',n=8)
 for z in [-.67,-.51,-.35]:box(g,'hydraulic_cooling_slot',(.008,.09,.065),(s*.326,.70,z),'rubber',0)
# Compact the fixed hydraulic pack into a forward gauntlet. Nose, grip and moving ram
# retain their contract coordinates; only receiver shell and its attached detailing move.
for receiver_part in objs[receiver_start:]:
 for vertex in receiver_part.data.vertices:
  old_z=-vertex.co.y
  vertex.co.y=-(-.25+(old_z+1.14)*(.75/1.58))
 receiver_part.data.update()
ring(g,'ram_guide_collar',.22,.145,.53,(0,.58,.68),'frame',12)
ring(g,'front_seal',.23,.14,.08,(0,.58,.97),'steel',12)
ring(g,'seal_warning_ring',.233,.216,.05,(0,.58,.91),'accent',12)
spike=empty('spike',(0,.58,.95),g)
cyl(spike,'moving_ram_shaft',.115,1.0,(0,0,-.20),'steel',n=12)
ring(spike,'ram_shoulder',.17,.112,.13,(0,0,.23),'frame',12)
cyl(spike,'forged_piercing_spike',.17,1.0,(0,0,.70),'edge',n=8,r2=0)
# Dark longitudinal inset across shaft is kept on translating assembly.
for s in [-1,1]:box(spike,'ram_groove',(.008,.055,.49),(s*.114,0,-.25),'frame',0)
empty('tip',(0,0,1.2),spike)
# Consolidate each rigid assembly into one mesh per material: modest draw count.
assembly_stats={}
for parent in list(P.values())+[barrels,spike]:
 groups=defaultdict(list)
 for o in list(parent.children):
  if o.type=='MESH':groups[o.data.materials[0].name].append(o)
 for material,group in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=group[0];o.name=parent.name+'__'+material
  # normals retain sharp, faceted manufactured appearance
  for p in o.data.polygons:p.use_smooth=False
for name,root in P.items():
 nodes=list(root.children_recursive);meshes=[o for o in nodes if o.type=='MESH'];tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 assembly_stats[name]={'triangles':tri,'meshes':len(meshes),'nodes':len(nodes)+1}
assert all(d['triangles']<=8000 for d in assembly_stats.values()),assembly_stats
bpy.ops.object.select_all(action='DESELECT')
for root in P.values():
 root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'weapons.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True)
# Restore exact per-subtree attachment names; runtime restores GLTFLoader userData.name.
glbpath=os.path.join(OUT,'weapons.glb')
data=open(glbpath,'rb').read();jsonlen=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+jsonlen]);tail=data[20+jsonlen:]
def normalize_attach(idx,weapon):
 node=doc['nodes'][idx];name=node.get('name','');base=name.split('.')[0]
 if base in ['muzzle','eject','tip','base']:node['name']=base
 for child in node.get('children',[]):normalize_attach(child,weapon)
for idx,node in enumerate(doc.get('nodes',[])):
 if node.get('name') in P:normalize_attach(idx,node['name'])
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
open(glbpath,'wb').write(struct.pack('<III',0x46546C67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4E4F534A)+payload+tail)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'source','weapons.blend'))
with open(os.path.join(OUT,'weapons-manifest.json'),'w') as f:json.dump({'authoring':'Original procedural geometry, no external assets','units':'meters; Y up; +Z forward; grip origin','weapons':assembly_stats,'moving_nodes':{'hailstorm':'barrels (0,0.36,1), rotates local Z','piledriver':'spike (0,0.58,0.95), translates local Z to 2.2'},'emissive_materials':['emissive_rail','emissive_edge']},f,indent=2)
print('WEAPON_STATS',json.dumps(assembly_stats));print('GLB_BYTES',os.path.getsize(os.path.join(OUT,'weapons.glb')))
# Candidate comparison render; hide unchanged weapons only after GLB/Blend export.
for name,root in P.items():
 if name not in ['kestrel','longbow']:
  for obj in [root]+list(root.children_recursive):obj.hide_render=True
P['kestrel'].location=cv((-1.20,0,0));P['longbow'].location=cv((1.20,0,-.1))
world=bpy.context.scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.065,.080,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for pos,power,size in [((0,-2,8),1100,6),((-5,3,4),1000,5),((6,4,5),1500,5)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,-.8,.3))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(7,-9,12));cam=bpy.context.object;target=Vector((0,-.9,.3));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6.7;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=64;sc.cycles.use_denoising=False;sc.render.resolution_x=1600;sc.render.resolution_y=1600;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False;sc.view_settings.view_transform='AgX';sc.render.filepath=os.path.join(OUT,'rifles-review.png');bpy.ops.render.render(write_still=True)
# Orthographic side view also exposes all silhouette and cutout changes.
cam.location=(8,-.9,2.4);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
P['kestrel'].location=cv((0,.95,0));P['longbow'].location=cv((0,-1.0,0));cam.location=(8,-.9,.3);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=5.5
sc.render.resolution_x=1800;sc.render.resolution_y=1300;sc.render.filepath=os.path.join(OUT,'rifles-side-review.png');bpy.ops.render.render(write_still=True)
