"""Original Iron Vow hostile miniatures. blender -b -t 6 -P tools/render_vehicles.py
448px square RGBA; anchor (.5,.72); draw square at 3.9192 * tile scale.
Right sprites are exact mirrored counterparts, including projected muzzle anchors.
"""
import bpy, math, json, tempfile, sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image, ImageDraw, ImageOps
OUT=Path(__file__).resolve().parents[1]/'dist/assets'
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene

def material(name,color,metal=.5,rough=.62):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
armor=material('Deep crimson ceramic armor',(.105,.008,.016),.25,.50);steel=material('Blackened machined metal',(.068,.082,.09),.65,.43);dark=material('Graphite secondary armor',(.009,.013,.018),.25,.55);red=material('Crimson identification panels',(.26,.012,.025),.25,.49);glass=material('Near-black armored canopy',(.004,.012,.018),.12,.34);warm=material('Amber optic lens',(.75,.20,.018),.4,.24)
glass.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.18


def finish(o,m,bevel=.01):
 o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Machined edge bevel','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def box(n,p,s,m=armor,b=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,m,b)
def cylinder(n,p,r,d,m=steel,rot=(0,0,0),v=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=p,rotation=rot);o=bpy.context.object;o.name=n;return finish(o,m,.005)
def sphere(n,p,s,m=armor):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=p);o=bpy.context.object;o.name=n;o.scale=s;return finish(o,m,0)
def rod(n,a,b,r,m=steel):
 a,b=Vector(a),Vector(b);o=cylinder(n,(a+b)/2,r,(b-a).length,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def loft(n,rings,m=armor,bevel=.018):
 # Four-sided cross sections (y,halfwidth,bottom,top), original armor geometry.
 vertices=[]
 for y,w,b,t in rings:vertices.extend([(-w,y,b),(w,y,b),(w,y,t),(-w,y,t)])
 faces=[(3,2,1,0)]
 for i in range(len(rings)-1):
  for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
 faces.append(tuple(range((len(rings)-1)*4,len(rings)*4)))
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(n,mesh);scene.collection.objects.link(o);return finish(o,m,bevel)

def tank():
 # Wide low armored hull, sloped glacis and faceted composite turret.
 for side in [-1,1]:
  x=side*.365
  box('Continuous track belt',(x,.025,.145),(.225,1.30,.27),dark,.085)
  for y in [-.49,-.29,-.09,.11,.31,.51]:
   cylinder('Recessed road wheel',(side*.484,y,.14),.086,.016,steel,(0,math.pi/2,0),24)
   cylinder('Road wheel armored hub',(side*.497,y,.14),.045,.018,dark,(0,math.pi/2,0),16)
  for y in [i*.075-.55 for i in range(16)]:
   box('Track steel shoe',(x,y,.025),(.23,.038,.025),steel,.003)
  box('Full length side skirt',(x,.02,.33),(.245,1.28,.17),armor,.028)
  for y in [-.43,-.15,.13,.41]:
   box('Composite skirt cassette',(side*.495,y,.29),(.032,.26,.17),armor,.013)
   box('Skirt latch',(side*.517,y+.08,.33),(.012,.045,.02),steel,.003)
  box('Forward fender marker',(x,-.61,.393),(.14,.065,.012),red,.003)
 loft('Low swept armored hull',[(-.64,.32,.20,.30),(-.39,.39,.20,.43),(.43,.39,.20,.42),(.68,.32,.22,.35)],armor,.025)
 loft('Composite glacis',[(-.64,.30,.30,.325),(-.27,.34,.405,.45)],armor,.012)
 for x in [-.26,.26]:
  box('Shielded headlight',(x,-.58,.35),(.10,.035,.04),dark,.01)
  box('Amber lamp slit',(x,-.601,.35),(.068,.006,.014),warm,.001)
  box('Front towing eye',(x,-.644,.23),(.055,.04,.045),steel,.006)
 cylinder('Turret bearing',(0,.03,.445),.30,.055,dark,v=40)
 # Ring-to-roof slope has a broad armored shoulder and narrow upper plane.
 loft('Long low wedge turret',[(-.43,.24,.47,.55),(-.20,.38,.45,.67),(.37,.34,.47,.65),(.57,.28,.49,.60)],armor,.035)
 for side in [-1,1]:
  cheek=loft('Sloped composite cheek',[(-.41,.06,.49,.56),(-.16,.12,.46,.65),(.06,.10,.47,.64)],armor,.02);cheek.location.x=side*.245
  box('Turret red recognition band',(side*.27,.15,.666),(.055,.32,.008),red,.002)
  for y in [-.18,-.09,0]:
   o=cylinder('Smoke launcher',(side*.365,y,.55),.024,.075,dark,(0,side*.65,0),12)
  box('Turret side rail',(side*.36,.30,.55),(.025,.32,.025),steel,.004)
 box('Cannon armored mantlet',(0,-.40,.56),(.21,.19,.15),armor,.028)
 cylinder('Smooth bore cannon',(0,-.86,.565),.029,.90,steel,(math.pi/2,0,0),24)
 cylinder('Thermal sleeve',(0,-.64,.565),.043,.35,armor,(math.pi/2,0,0),24)
 cylinder('Fume extractor',(0,-.68,.565),.051,.12,steel,(math.pi/2,0,0),24)
 cylinder('Muzzle reinforced collar',(0,-1.305,.565),.038,.075,armor,(math.pi/2,0,0),24)
 cylinder('Dark cannon aperture',(0,-1.347,.565),.026,.008,dark,(math.pi/2,0,0),24)
 cylinder('Flush crew hatch',(-.10,.18,.674),.104,.022,steel,v=24)
 box('Hatch lifting handle',(-.10,.18,.692),(.09,.018,.018),dark,.004)
 cylinder('Independent commander sight',(.17,.15,.704),.055,.10,armor,v=12)
 box('Commander thermal window',(.17,.091,.72),(.06,.012,.03),glass,.002)
 box('Gunner armored sight',(.10,-.14,.683),(.12,.11,.07),dark,.012)
 box('Gunner optic strip',(.10,-.199,.692),(.084,.008,.024),warm,.001)
 # Bustle rack and lower rear power pack visible behind turret.
 box('Turret bustle bin',(0,.52,.54),(.57,.20,.12),dark,.012)
 for x in [-.26,0,.26]:box('Bustle rack rib',(x,.63,.56),(.025,.025,.16),steel,.004)
 for x in [-.24,.24]:
  box('Engine cooling well',(x,.54,.39),(.18,.23,.028),dark,.006)
  for y in [.46,.50,.54,.58,.62]:box('Engine vent louver',(x,y,.41),(.18,.012,.009),steel,.001)
 rod('Low radio mast',(-.23,.35,.65),(-.24,.37,.92),.005,dark)
 # Bake deliberate low, long proportions into all meshes, including fitted details.
 bpy.context.view_layer.update()
 for o in [o for o in bpy.data.objects if o.type=='MESH']:
  cannon=any(token in o.name for token in ['Smooth bore cannon','Thermal sleeve','Fume extractor','Muzzle reinforced','Dark cannon'])
  sy=1.30 if cannon else 1.20
  world=o.matrix_world.copy();inv=world.inverted()
  for v in o.data.vertices:
   w=world@v.co;w.y*=sy;w.z*=.80;v.co=inv@w
  if any(token in o.name for token in ['Full length side skirt','Composite skirt cassette','Cannon armored mantlet','Turret bustle','Engine cooling','Sloped composite cheek']):
   o.data.materials.clear();o.data.materials.append(dark)
 return [(0,-1.354*1.30,.565*.80)]

def helicopter():
 # Narrow angular fuselage and two distinct stepped crew canopy volumes.
 loft('Armored gunship fuselage',[(-.72,.095,.32,.43),(-.53,.18,.24,.56),(-.17,.19,.25,.64),(.20,.17,.29,.59),(.40,.10,.36,.50)],armor,.035)
 loft('Forward gunner canopy',[(-.61,.11,.44,.48),(-.43,.16,.48,.65),(-.23,.155,.52,.66)],glass,.009)
 loft('Raised pilot canopy',[(-.23,.155,.53,.64),(-.07,.15,.57,.77),(.09,.13,.56,.73)],glass,.009)
 for y,w,z0,z1 in [(-.61,.11,.44,.48),(-.43,.16,.48,.65),(-.23,.155,.52,.66),(-.07,.15,.57,.77),(.09,.13,.56,.73)]:
  rod('Canopy armored transverse frame',(-w,y,z1),(w,y,z1),.011,armor)
  for side in [-1,1]:rod('Canopy side post',(side*w,y,z0),(side*w,y,z1),.010,armor)
 for side in [-1,1]:
  for a,b in [((.11,-.61,.48),(.16,-.43,.65)),((.16,-.43,.65),(.155,-.23,.66)),((.155,-.23,.64),(.15,-.07,.77)),((.15,-.07,.77),(.13,.09,.73))]:
   rod('Canopy longitudinal sill',(a[0]*side,a[1],a[2]),(b[0]*side,b[1],b[2]),.009,armor)
  box('Cockpit cheek recognition stripe',(side*.185,-.27,.425),(.012,.30,.055),red,.002)
 # Nose optical turret, ventral chain gun.
 sphere('Nose sensor armored ball',(0,-.686,.385),(.105,.09,.08),dark)
 for x in [-.043,.043]:
  cylinder('Nose sensor window',(x,-.765,.40),.027,.014,glass,(math.pi/2,0,0),16)
 sphere('Chin gun pivot',(0,-.48,.23),(.08,.075,.065),steel)
 box('Chain gun receiver',(0,-.60,.205),(.075,.21,.06),dark,.008)
 cylinder('Long chin gun',(0,-.80,.205),.018,.30,steel,(math.pi/2,0,0),16)
 cylinder('Chin muzzle',(0,-.965,.205),.027,.04,dark,(math.pi/2,0,0),16)
 # Thin tail with swept fin, stabilizer, four-blade tail rotor.
 loft('Tapered tail boom',[(.24,.10,.37,.53),(.64,.055,.45,.56),(1.02,.027,.50,.57)],armor,.015)
 fin=loft('Swept vertical tail',[(.82,.022,.53,.67),(1.03,.022,.53,.93),(1.11,.018,.55,.91)],armor,.008)
 box('Tail tip recognition',(0,1.055,.915),(.045,.11,.04),red,.002)
 box('Horizontal tail plane',(0,.79,.54),(.51,.16,.025),armor,.008)
 cylinder('Tail rotor hub',(.065,1.02,.71),.025,.14,steel,(0,math.pi/2,0),16)
 for angle in [.4,.4+math.pi/2]:
  o=box('Tail rotor blade',(.14,1.02,.71),(.014,.34,.026),dark,.003);o.rotation_euler[0]=angle
 # Shoulder turboshafts, swept weapons wings, pods and missile rails.
 for side in [-1,1]:
  x=side*.23
  nacelle=loft('Turbine armored nacelle',[(-.05,.075,.48,.64),(.10,.105,.46,.68),(.38,.085,.49,.64),(.48,.06,.52,.61)],armor,.025);nacelle.location.x=x
  box('Turbine intake',(x,-.064,.565),(.12,.022,.09),dark,.018)
  for dx in [-.035,0,.035]:box('Intake splitter',(x+dx,-.078,.57),(.009,.012,.066),steel,.002)
  box('Suppressed turbine exhaust',(x,.48,.56),(.12,.07,.075),dark,.018)
  box('Exhaust lip',(x,.52,.59),(.13,.015,.018),steel,.003)
  o=box('Swept weapon stub wing',(side*.345,.03,.40),(.40,.20,.035),armor,.01);o.rotation_euler[2]=side*.16
  # Seven tube rocket pod, immediately recognizable at battlefield scale.
  cylinder('Rocket pod',(side*.405,-.035,.32),.087,.35,armor,(math.pi/2,0,0),20)
  for k in range(7):
   a=k*math.tau/6;r=0 if k==6 else .049
   px=side*.405+math.cos(a)*r;pz=.32+math.sin(a)*r
   cylinder('Rocket tube bore',(px,-.216,pz),.018,.012,dark,(math.pi/2,0,0),10)
  for z in [.29,.36]:
   cylinder('Guided missile',(side*.56,.015,z),.022,.37,steel,(math.pi/2,0,0),12)
   sphere('Missile seeker',(side*.56,-.18,z),(.022,.035,.022),dark)
   box('Missile tail fin',(side*.56,.16,z),(.083,.045,.009),armor,.001)
  # Apache-like wheeled landing gear, no sled skids.
  rod('Main landing leg',(side*.15,-.12,.30),(side*.28,-.16,.10),.018,steel)
  cylinder('Main landing wheel',(side*.29,-.16,.075),.065,.050,dark,(0,math.pi/2,0),20)
  cylinder('Landing wheel hub',(side*.32,-.16,.075),.025,.010,steel,(0,math.pi/2,0),16)
 rod('Tail wheel strut',(0,.73,.48),(0,.81,.11),.013,steel)
 cylinder('Tail wheel',(0,.82,.075),.055,.035,dark,(0,math.pi/2,0),16)
 cylinder('Rotor transmission',(0,.11,.73),.095,.16,armor,v=24)
 cylinder('Rotor mast',(0,.11,.855),.025,.16,steel,v=20)
 cylinder('Rotor hub',(0,.11,.94),.09,.04,dark,v=20)
 for angle in [.24,.24+math.pi/2]:
  o=box('Composite rotor blade',(0,.11,.96),(2.05,.061,.014),dark,.003);o.rotation_euler[2]=angle
  for sign in [-1,1]:
   x=sign*.94*math.cos(angle);y=.11+sign*.94*math.sin(angle)
   o=box('Rotor tip marking',(x,y,.962),(.12,.064,.016),red,.001);o.rotation_euler[2]=angle
 # Extend the entire tail assembly coherently from its root, preserving attachments.
 bpy.context.view_layer.update()
 for o in [o for o in bpy.data.objects if o.type=='MESH']:
  if any(token in o.name for token in ['tail','Tail']):
   # World-space vertex transform also handles rotated rotor and wheel geometry.
   world=o.matrix_world.copy();inv=world.inverted()
   for v in o.data.vertices:
    w=world@v.co;w.y=.30+(w.y-.30)*1.30;v.co=inv@w
  if any(token in o.name for token in ['Swept weapon','Rocket pod','Canopy armored','Canopy side','Canopy longitudinal','Rotor transmission','Armored gunship fuselage']):
   o.data.materials.clear();o.data.materials.append(dark)
 # Red cheeks and the canopy surround keep the gunship's faction legible against black armor.
 return [(0,-.988,.205),(-.405,-.223,.32),(.405,-.223,.32)]

if "--export-motion" in sys.argv:
 out=Path(sys.argv[sys.argv.index("--export-motion")+1])
 out.mkdir(parents=True,exist_ok=True)
 for name,build in [('tank',tank),('helicopter',helicopter)]:
  for obj in list(bpy.data.objects):
   bpy.data.objects.remove(obj,do_unlink=True)
  muzzles=build()
  for label,position in [('muzzle',muzzles[0]),('body',(0,0,.38 if name=='tank' else .42))]:
   marker=bpy.data.objects.new(label,None)
   marker.location=position
   scene.collection.objects.link(marker)
  bpy.ops.export_scene.gltf(filepath=str(out/f'{name}.glb'),export_format='GLB')
 raise SystemExit(0)

world=bpy.data.worlds.new('Ambient');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.52,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
for pos,power,size,col in [((-3,-4,7),800,4,(1,.88,.72)),((4,1,5),650,3,(.6,.77,1))]:
 l=bpy.data.lights.new('Softbox','AREA');l.energy=power;l.size=size;l.color=col;o=bpy.data.objects.new('Softbox',l);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
c=bpy.data.cameras.new('Isometric');cam=bpy.data.objects.new('Isometric',c);scene.collection.objects.link(cam);scene.camera=cam;cam.location=(8,-8,5.49);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();c.type='ORTHO';c.ortho_scale=3.2;c.shift_y=.22
scene.render.engine='CYCLES';scene.cycles.samples=80;scene.cycles.use_denoising=False;scene.render.resolution_x=scene.render.resolution_y=448;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
previews=[];metadata={}
with tempfile.TemporaryDirectory() as td:
 for name,build in [('tank',tank),('helicopter',helicopter)]:
  for o in list(bpy.data.objects):
   if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
  muzzles=build();bpy.context.view_layer.update();points=[]
  for point in muzzles:
   p=world_to_camera_view(scene,cam,Vector(point));points.append([round(p.x,5),round(1-p.y,5)])
  scene.render.filepath=f'{td}/{name}.png';bpy.ops.render.render(write_still=True);im=Image.open(scene.render.filepath).convert('RGBA')
  bounds=im.getchannel('A').getbbox();assert bounds and min(bounds)>0 and bounds[2]<448 and bounds[3]<448,(name,bounds)
  for facing,sprite in [('left',im),('right',ImageOps.mirror(im))]:
   key=f'hostile-{name}-{facing}';sprite.save(OUT/f'{key}.webp',quality=90,method=6)
   metadata[key]={'anchor':[.5,.72],'size':448,'tileScale':3.9192,'opaqueBounds':sprite.getchannel('A').getbbox(),'muzzles':points if facing=='left' else [[round(1-x,5),y] for x,y in points]}
   p=Image.new('RGBA',(448,480),'#26343c');p.alpha_composite(sprite);ImageDraw.Draw(p).text((15,456),key,fill='white');previews.append(p)
 sheet=Image.new('RGB',(896,960))
 for i,p in enumerate(previews):sheet.paste(p,((i%2)*448,(i//2)*480))
 sheet.save('/tmp/iron-vow-vehicles-preview.jpg')
print(json.dumps(metadata,indent=2));print('Total bytes',sum(p.stat().st_size for p in OUT.glob('hostile-*.webp')))
