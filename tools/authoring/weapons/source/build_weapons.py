"""Original IRON VOW weapon set. Blender 4.3+; run blender -b -P build_weapons.py.
Authoring coordinates: X right, Y up, +Z weapon forward. Grip at origin.
All meshes authored procedurally from original forms; no third-party art.
"""
import bpy, bmesh, math, os, json, struct, sys
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
# HAILSTORM: armored rotary drive, articulated feed and six open precision bores.
g=empty('hailstorm');P['hailstorm']=g;grip(g)
hull(g,'rotary_drive_housing',[(-.46,.20,.12,.57,.055),(-.28,.28,.08,.67,.065),(.59,.28,.10,.67,.055),(.92,.21,.17,.57,.045)],'gunmetal')
for side in [-1,1]:
 panel(g,'rotary_motor_cheek',[(.16,-.32),(.52,-.37),(.64,-.20),(.62,.39),(.45,.73),(.19,.66)],.033,side*.286,'gunmetal')
 panel(g,'ceramic_motor_shield',[(.39,-.27),(.58,-.24),(.60,.20),(.49,.43),(.36,.28)],.029,side*.311)
 panel(g,'lower_motor_service_cover',[(.15,-.10),(.31,-.10),(.38,.43),(.24,.60),(.14,.48)],.018,side*.309,'warmsteel')
 for z in [.10,.27,.44]:box(g,'motor_air_exhaust',(.009,.10,.073),(side*.326,.28,z),'rubber',.004)
 for y,z in [(.49,-.19),(.45,.55),(.18,.04)]:bolt(g,(side*.333,y,z),r=.019)
 idmarks(g,side*.331,.49,-.18)
box(g,'rotary_dorsal_backbone',(.31,.065,.95),(0,.702,.18),'gunmetal',.017)
for z in [-.18,.02,.22,.42]:box(g,'dorsal_heat_fin',(.37,.035,.075),(0,.752,z),'warmsteel',.008)
box(g,'drive_service_switch',(.11,.022,.12),(0,.734,.64),'service',.006)
# Faceted drum with separate rim, radial ribs and a recessed driven hub.
cyl(g,'ammunition_drum',.365,.49,(0,-.12,-.25),'frame','x',16)
for side in [-1,1]:
 cyl(g,'drum_armored_end',.38,.045,(side*.26,-.12,-.25),'gunmetal','x',12)
 ring(g,'drum_machined_rim',.393,.337,.035,(side*.289,-.12,-.25),'warmsteel',16,'x')
 ring(g,'drum_annular_insert',.32,.16,.015,(side*.295,-.12,-.25),'ceramic',12,'x')
 cyl(g,'drum_driven_hub',.12,.028,(side*.318,-.12,-.25),'frame','x',12)
 cyl(g,'drum_lock_pin',.043,.039,(side*.337,-.12,-.25),'steel','x',6)
 for j in range(6):
  a=j*math.tau/6
  bolt(g,(side*.312,-.12+.274*math.cos(a),-.25+.274*math.sin(a)),r=.018)
# Eight belt links are distinct solid cartridges along a bent feed path.
for i in range(8):
 t=i/7;x=-.334-.037*math.sin(t*math.pi);y=-.05+t*.36;z=-.05+t*.48
 box(g,'linked_cartridge',(.085,.085,.10),(x,y,z),'warmsteel',.012)
 box(g,'feed_link_clip',(.095,.027,.053),(x,y+.045,z),'frame',.006)
ring(g,'motor_front_flange',.296,.215,.12,(0,.36,.95),'gunmetal',12)
barrels=empty('barrels',(0,.36,1),g)
ring(barrels,'rotor_root',.292,.10,.24,(0,0,.12),'gunmetal',12)
for i in range(6):
 a=i*math.tau/6;x,y=.17*math.cos(a),.17*math.sin(a)
 cyl(barrels,'rotary_barrel',.063,1.66,(x,y,1.00),'warmsteel',n=12)
 for z in [.36,1.59]:ring(barrels,'barrel_collar',.071,.057,.075,(x,y,z),'gunmetal',8)
 ring(barrels,'deep_open_barrel',.067,.043,.23,(x,y,1.935),'gunmetal',12)
 ring(barrels,'bore_machined_edge',.068,.044,.024,(x,y,2.046),'steel',12)
for z in [.63,1.30,1.89]:
 ring(barrels,'rotor_lattice_brace',.281,.222,.075,(0,0,z),'gunmetal',12)
 ring(barrels,'brace_wear_band',.282,.271,.026,(0,0,z+.025),'warmsteel',12)
cyl(barrels,'central_rotary_shaft',.064,1.72,(0,0,.98),'frame',n=10)
cyl(barrels,'front_drive_lock',.077,.055,(0,0,1.97),'warmsteel',n=8)
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
# BREACHER: compact twin-bore assault shotgun with a low angular pump carriage.
g=empty('breacher');P['breacher']=g;grip(g)
hull(g,'breacher_monocoque',[(-.84,.16,.13,.48,.045),(-.59,.24,.02,.63,.06),(.56,.24,.03,.65,.055),(.92,.21,.13,.57,.045)],'gunmetal')
for side in [-1,1]:
 panel(g,'rear_breach_shell',[(.22,-.63),(.51,-.62),(.64,-.38),(.64,.06),(.48,.25),(.20,.09)],.034,side*.247)
 panel(g,'breech_locking_cheek',[(.16,.19),(.51,.22),(.59,.48),(.46,.89),(.17,.76)],.035,side*.248,'gunmetal')
 panel(g,'breech_lock_cam',[(.32,.29),(.45,.29),(.46,.62),(.35,.70),(.27,.60)],.019,side*.273,'warmsteel')
 box(g,'ejection_recess',(.008,.092,.22),(side*.287,.42,.42),'rubber',.004)
 box(g,'action_release_lever',(.038,.045,.12),(side*.297,.27,.65),'warmsteel',.008)
 for y,z in [(.49,-.38),(.28,-.40),(.21,.67)]:bolt(g,(side*.273,y,z),r=.020)
 idmarks(g,side*.27,.43,-.32)
 # Magazine slot and armored curved ammunition heel remain in front of the grip.
 panel(g,'compact_magazine',[(.10,.59),(.10,.86),(-.22,.92),(-.29,.79),(-.22,.64)],.12,side*.09,'gunmetal')
 box(g,'magazine_stamped_channel',(.012,.18,.06),(side*.156,-.08,.75),'warmsteel',.008)
box(g,'shotgun_recoil_pad',(.35,.40,.095),(0,.27,-.825),'rubber',.024)
box(g,'rear_cheek_liner',(.29,.055,.31),(0,.655,-.35),'gunmetal',.012)
# Twin barrels are visible inside a vented, low-profile front assembly.
for x in [-.13,.13]:
 cyl(g,'twin_barrel',.104,1.13,(x,.37,1.35),'warmsteel',n=12)
 ring(g,'breech_barrel_seat',.126,.106,.13,(x,.37,.91),'gunmetal',12)
 ring(g,'deep_bore',.137,.091,.29,(x,.37,2.045),'gunmetal',12)
 ring(g,'bore_machined_lip',.138,.092,.028,(x,.37,2.189),'steel',12)
for side in [-1,1]:
 panel(g,'upper_barrel_heat_shield',[(.46,.94),(.58,1.08),(.57,1.79),(.46,1.95),(.45,1.70)],.035,side*.228,'gunmetal')
 panel(g,'ceramic_barrel_guard',[(.48,1.04),(.59,1.17),(.58,1.48),(.49,1.63)],.022,side*.252)
 for z in [1.13,1.39,1.65]:box(g,'upper_heat_port',(.012,.055,.12),(side*.25,.49,z),'rubber',.003)
 # A scalloped pump carriage gives the Breacher a characteristic underslung wedge.
 panel(g,'pump_carriage',[(.10,.91),(.24,1.01),(.23,1.59),(.10,1.78),(-.035,1.58),(-.035,1.08)],.045,side*.21,'gunmetal')
 panel(g,'pump_hand_surface',[(.06,1.07),(.16,1.14),(.16,1.47),(.05,1.61),(.00,1.49),(.00,1.16)],.027,side*.244,'rubber')
 for z in [1.16,1.31,1.46]:box(g,'pump_grip_rib',(.013,.13,.035),(side*.263,.08,z),'warmsteel',.005)
box(g,'pump_bottom_bridge',(.39,.065,.62),(0,-.048,1.31),'frame',.015)
box(g,'upper_sight_rail',(.15,.047,1.25),(0,.68,.61),'gunmetal',.010)
for z in [.10,.28,.46,.64,.82,1.0]:box(g,'sight_rail_tooth',(.20,.027,.044),(0,.714,z),'warmsteel',.006)
box(g,'rear_ghost_sight',(.19,.12,.09),(0,.765,.04),'gunmetal',.014)
box(g,'front_blade_sight',(.07,.085,.07),(0,.653,1.81),'warmsteel',.008)
box(g,'tiny_service_lock',(.073,.022,.09),(0,.690,-.44),'service',.005)
empty('muzzle',(0,.37,2.22),g);empty('eject',(-.27,.42,.42),g)

# VESPER: four-cell guided launcher, open blast frame and replaceable side cassettes.
g=empty('vesper');P['vesper']=g;grip(g)
hull(g,'launcher_rear_chassis',[(-.82,.25,.02,.67,.08),(-.55,.43,-.08,.85,.085),(.33,.43,-.08,.85,.075),(.62,.35,.02,.76,.07)],'gunmetal')
# The front is assembled from rails and individual cells, avoiding a solid cap over the tubes.
for side in [-1,1]:
 panel(g,'launcher_outer_beam',[(.00,.37),(.13,.28),(.76,.36),(.86,.56),(.79,1.27),(.67,1.34),(.09,1.31),(-.02,1.13)],.065,side*.406,'gunmetal')
 panel(g,'launcher_ceramic_cassette',[(.08,-.47),(.65,-.56),(.82,-.27),(.78,.34),(.60,.57),(.20,.53)],.045,side*.455)
 panel(g,'cassette_forward_retainer',[(.10,.57),(.63,.57),(.76,.69),(.69,1.03),(.17,.97)],.033,side*.454,'gunmetal')
 box(g,'cassette_locking_rail',(.032,.10,.77),(side*.489,.25,.04),'warmsteel',.014)
 box(g,'launcher_service_latch',(.040,.15,.14),(side*.495,.53,.29),'service',.011)
 for y,z in [(.19,-.31),(.67,-.20),(.63,.42),(.27,.78)]:bolt(g,(side*.485,y,z),r=.021)
 idmarks(g,side*.483,.56,-.32)
 for z in [-.32,-.12,.08]:box(g,'cassette_air_slot',(.009,.075,.082),(side*.481,.42,z),'rubber',.004)
box(g,'blast_frame_top',(.76,.09,.68),(0,.85,.99),'gunmetal',.025)
box(g,'blast_frame_bottom',(.76,.09,.68),(0,-.025,.99),'gunmetal',.025)
box(g,'front_frame_upper_wear',(.71,.025,.04),(0,.812,1.306),'warmsteel',.006)
box(g,'front_frame_lower_wear',(.71,.025,.04),(0,.018,1.306),'warmsteel',.006)
for x in [-.20,.20]:
 for y in [.23,.59]:
  ring(g,'launch_cell_housing',.177,.125,.63,(x,y,.995),'gunmetal',12)
  ring(g,'launch_tube_front',.171,.124,.084,(x,y,1.310),'warmsteel',12)
  ring(g,'inner_cell_insulator',.127,.111,.045,(x,y,1.277),'gunmark',12)
  cyl(g,'recessed_missile_nose',.103,.26,(x,y,1.09),'gunmetal',n=12,r2=.040)
  cyl(g,'missile_seeker_cap',.041,.024,(x,y,1.232),'glass',n=10)
# Recessed rear service bulkhead, low carry handle and angled sight block.
box(g,'rear_service_panel',(.60,.57,.07),(0,.39,-.815),'frame',.024)
for y in [.20,.33,.46,.59]:box(g,'rear_exhaust_louver',(.45,.043,.022),(0,y,-.860),'warmsteel',.006)
for z in [-.35,.48]:box(g,'carry_handle_stanchion',(.10,.13,.10),(0,.90,z),'gunmetal',.014)
box(g,'carry_handle',(.13,.067,.92),(0,.994,.065),'warmsteel',.018)
hull(g,'launcher_prism_sight',[(-.05,.09,.875,1.00,.02),(.29,.09,.875,1.00,.02)],'gunmetal')
cyl(g,'targeting_optic',.048,.012,(0,.935,.302),'glass',n=10)
empty('muzzle',(-.20,.41,1.36),g);empty('muzzle2',(.20,.41,1.36),g)

# RAMPART: long 40 mm recoil cannon, exposed dampers and armored side ammunition cassette.
g=empty('rampart');P['rampart']=g;grip(g)
hull(g,'autocannon_breech',[(-.91,.18,.13,.53,.045),(-.59,.31,-.06,.77,.085),(.48,.33,-.07,.80,.085),(.93,.27,.04,.67,.06),(1.19,.20,.14,.58,.045)],'gunmetal')
for side in [-1,1]:
 panel(g,'breech_ceramic_cheek',[(.20,-.51),(.60,-.51),(.75,-.29),(.74,.16),(.55,.43),(.21,.32)],.041,side*.334)
 panel(g,'breech_locking_plate',[(.14,.39),(.53,.35),(.66,.58),(.53,.94),(.26,.91)],.036,side*.345,'gunmetal')
 panel(g,'bolt_slide_cover',[(.32,.28),(.47,.28),(.51,.56),(.42,.72),(.30,.64)],.021,side*.368,'warmsteel')
 box(g,'cannon_ejection_port',(.008,.091,.20),(side*.382,.40,.34),'rubber',.004)
 for y,z in [(.54,-.35),(.27,-.35),(.55,.61)]:bolt(g,(side*.363,y,z),r=.024)
 idmarks(g,side*.359,.48,-.28)
 for z in [-.03,.15]:box(g,'breech_vent',(.010,.075,.075),(side*.361,.65,z),'rubber',.004)
# Distinct asymmetric ammunition cassette and armored belt throat.
box(g,'ammunition_feed_throat',(.22,.25,.32),(.36,.05,.40),'frame',.025)
panel(g,'side_ammunition_cassette',[(.31,-.04),(.35,.51),(.19,.73),(-.18,.66),(-.29,.46),(-.27,.02)],.22,.402,'gunmetal',.018)
panel(g,'cassette_outer_armor',[(.23,.07),(.25,.47),(.12,.60),(-.17,.53),(-.19,.12)],.027,.526)
for z in [.17,.39]:box(g,'cassette_stamped_recess',(.008,.19,.042),(.544,-.00,z),'frame',.005)
for y,z in [(.17,.14),(-.12,.47)]:bolt(g,(.548,y,z),r=.020)
box(g,'cassette_release',(.030,.06,.11),(.54,.20,.51),'service',.006)
box(g,'cannon_butt_buffer',(.37,.40,.10),(0,.32,-.91),'rubber',.026)
# A low integrated sight and segmented upper heat spine.
box(g,'receiver_upper_keel',(.27,.055,.95),(0,.834,.06),'gunmetal',.013)
for z in [-.27,-.07,.13,.33]:box(g,'receiver_cooling_cap',(.34,.038,.081),(0,.88,z),'warmsteel',.009)
box(g,'armored_sight_mount',(.16,.065,.21),(0,.92,-.12),'gunmetal',.010)
cyl(g,'low_bore_sight',.065,.31,(0,.98,-.04),'gunmetal',n=8)
cyl(g,'bore_sight_glass',.045,.009,(0,.98,.119),'glass',n=10)
# Floating large bore with twin external recoil dampers and an open skeletal jacket.
ring(g,'breech_recoil_flange',.235,.135,.18,(0,.38,1.10),'gunmetal',12)
ring(g,'large_bore_tube',.118,.077,1.67,(0,.38,2.095),'warmsteel',16)
for side in [-1,1]:
 cyl(g,'recoil_damper_body',.065,.67,(side*.174,.57,1.53),'gunmetal',n=12)
 cyl(g,'exposed_recoil_rod',.035,.63,(side*.174,.57,2.04),'steel',n=10)
 for z in [1.24,1.82]:ring(g,'damper_end_collar',.072,.038,.067,(side*.174,.57,z),'warmsteel',10)
 panel(g,'barrel_jacket_side',[(.22,1.14),(.30,1.24),(.29,2.20),(.19,2.37),(.12,2.23),(.14,1.33)],.038,side*.18,'gunmetal')
 panel(g,'barrel_jacket_ceramic',[(.18,1.37),(.25,1.45),(.25,1.91),(.17,2.08)],.025,side*.206)
for z in [1.35,1.94,2.39]:
 ring(g,'barrel_support_ring',.204,.126,.07,(0,.38,z),'gunmetal',12)
 ring(g,'support_ring_wear_edge',.206,.195,.024,(0,.38,z+.02),'warmsteel',12)
ring(g,'cannon_brake_locknut',.15,.10,.10,(0,.38,2.65),'steel',12)
ring(g,'deep_muzzle_brake',.193,.12,.36,(0,.38,2.90),'gunmetal',8)
ring(g,'muzzle_machined_lip',.195,.122,.026,(0,.38,3.078),'warmsteel',8)
for side in [-1,1]:
 for z in [2.82,2.96]:box(g,'muzzle_lateral_gas_port',(.008,.095,.073),(side*.194,.38,z),'rubber',.004)
empty('muzzle',(0,.38,3.10),g);empty('eject',(-.31,.40,.34),g)

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
if '--export-only' in sys.argv:
 sys.exit(0)
# Four-up studio sheet for upgraded remaining ranged weapons.
if '--arsenal-review' in sys.argv:
 selected=['hailstorm','breacher','vesper','rampart']
 for name,root in P.items():
  if name not in selected:
   for ob in [root]+list(root.children_recursive):ob.hide_render=True
 for i,name in enumerate(selected):P[name].location=cv(((i%2)*2.7,0,-(i//2)*4.65))
 world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.065,.080,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
 target=Vector((1.35,1.3,.25))
 for pos,power,size in [((1,-2,9),1500,7),((-5,3,5),1200,6),((7,6,6),1700,6)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(9,-11,15));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=10.7;bpy.context.scene.camera=cam
 sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=False;sc.render.resolution_x=1600;sc.render.resolution_y=1600;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX';sc.render.filepath=os.path.join(OUT,'ranged-upgrades-review.png');bpy.ops.render.render(write_still=True)
 sys.exit(0)
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
