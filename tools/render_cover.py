"""Original Iron Vow cover miniatures. blender -b -t 6 -P tools/render_cover.py
Six transparent 384px sprites; anchor (192,276.48), ortho 2.6 world units.
Display square at 3.1843 * tile scale to match .866 isometric ground projection.
"""
import bpy, math, random, sys, tempfile
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image, ImageDraw
OUT=Path(__file__).resolve().parents[1]/'dist/assets'
random.seed(410)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene

def mat(name,color,metal=0,rough=.75,noise=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 n=m.node_tree.nodes; p=n.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=35;tex.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.035
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
stone=mat('Layered blue slate',(.23,.30,.33),noise=.8); stone2=mat('Pale fracture',(.38,.43,.43),noise=.7)
steel=mat('Weathered petrol armor',(.12,.23,.26),.65,noise=.35); edge=mat('Exposed iron',(.34,.42,.43),.75,.45,noise=.2)
dark=mat('Recesses',(.025,.045,.055),.4); yellow=mat('Safety ochre',(.78,.46,.09),.25,noise=.2)
rust=mat('Oxide red cargo',(.36,.12,.065),.45,noise=.5); concrete=mat('Bunker cast concrete',(.34,.37,.32),noise=.9)
leaf=mat('Conifer deep needles',(.022,.068,.049),noise=.48)
leaf2=mat('Conifer exposed boughs',(.044,.103,.072),noise=.47)
bark=mat('Bark',(.11,.077,.044),noise=.8)
shelter=mat('Weathered bunker concrete',(.22,.25,.23),noise=.86)

def finish(o,m,bevel=0):
 o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Worn edge radius','BEVEL');mod.width=bevel;mod.segments=2
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def box(name,loc,scale,m,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,m,bevel)
def cyl(name,loc,radius,depth,m,rot=(0,0,0),vertices=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;return finish(o,m,.008)
def rock(loc,scale,m=stone):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc);o=bpy.context.object;o.name='Angular sedimentary outcrop'
 for v in o.data.vertices: v.co*=random.uniform(.8,1.15)
 o.scale=scale;return finish(o,m)
def bolts_y(xvals,y,zvals):
 for x in xvals:
  for z in zvals: cyl('Rivet', (x,y,z),.015,.012,edge,(math.pi/2,0,0),8)
def stripes_y(y,z,width=.1):
 for x in [-.32,-.16,0,.16,.32]:
  o=box('Hazard marking',(x,y,z),(width,.008,.1),yellow,.001);o.rotation_euler[1]=-.35

def ridge():
 rock((-.13,.07,.35),(.46,.38,.44));rock((.23,.02,.23),(.29,.34,.29),stone2);rock((-.23,-.28,.12),(.24,.19,.16));rock((.26,.30,.13),(.2,.22,.18))
 # mineral seam ledges emphasize geological silhouette
 for z,x in [(.2,-.12),(.36,-.16),(.49,-.18)]:
  o=box('Fracture shelf',(x,-.23,z),(.4,.06,.018),stone2,.006);o.rotation_euler[1]=-.15

def shield():
 box('Foundation',(0,0,.06),(.92,.63,.12),dark)
 for x in [-.35,.35]:
  box('Buttress',(x,.05,.3),(.16,.51,.5),edge)
 box('Blast armor',(0,-.08,.42),(.87,.15,.65),steel,.045)
 box('Upper reinforced lip',(0,-.09,.75),(.96,.2,.07),edge)
 box('Recessed identifier',(0,-.163,.49),(.3,.012,.15),dark)
 for x in [-.09,0,.09]:box('ID tally',(x,-.175,.5),(.025,.008,.07),yellow,.002)
 stripes_y(-.168,.19);bolts_y([-.34,.34],-.17,[.3,.61])
 cyl('Relay mast',(.28,.16,.92),.028,.55,edge)
 box('Signal head',(.28,.16,1.2),(.16,.10,.17),steel)
 for z in [1.16,1.2,1.24]:box('Transceiver slots',(.28,.102,z),(.11,.01,.014),yellow,.001)

def cargo():
 box('Cargo armored enclosure',(0,0,.4),(.91,.69,.72),rust,.035)
 for x in [-.44,.44]:
  for y in [-.34,.34]:box('Corner reinforced casting',(x,y,.4),(.085,.075,.78),edge)
 for x in [-.32,-.2,-.08,.04,.16,.28]:box('Corrugated front',(x,-.35,.4),(.035,.025,.60),rust,.006)
 for x in [-.3,-.15,0,.15,.3]:box('Roof rib',(x,0,.774),(.027,.60,.018),edge,.004)
 for y in [-.18,.18]:
  box('End door',(.462,y,.4),(.012,.29,.59),steel,.004)
  cyl('Lock bar',(.48,y,.41),.012,.5,edge)
 box('Cargo stencil',(-.16,-.371,.52),(.26,.006,.13),yellow,.002)
 for x in [-.24,-.17,-.10]:box('Stencil cut',(x,-.378,.52),(.018,.006,.08),dark,.001)


def pipes():
 box('Transformer skid',(0,0,.06),(.94,.78,.12),edge)
 box('Power housing',(.19,.05,.43),(.42,.55,.7),steel,.025)
 for z in [.22,.3,.38,.46,.54,.62]:box('Cooling fin',(.41,.05,z),(.06,.63,.025),edge,.004)
 for y in [-.15,.12]:
  cyl('Ceramic neck',(.19,y,.86),.04,.16,dark)
  for z in [.82,.86,.90]:cyl('Insulator disc',(.19,y,z),.075,.021,concrete)
 for x in [-.36,-.17]:
  cyl('Vertical pipe',(x,.12,.4),.07,.66,edge)
  cyl('Pipe flange',(x,.12,.69),.105,.035,rust)
  cyl('Pipe end',(x,-.08,.75),.07,.4,edge,(math.pi/2,0,0))
  cyl('Dark bore',(x,-.285,.75),.05,.006,dark,(math.pi/2,0,0))
 box('Electrical warning',(.19,-.232,.48),(.19,.01,.19),yellow,.003)
 box('Warning slit',(.19,-.24,.49),(.026,.01,.11),dark,.001)

def forest():
 rock((.2,-.15,.21),(.32,.3,.27));rock((-.25,-.22,.13),(.2,.18,.17),stone2)
 rng=random.Random(81)
 for x,y,h in [(-.18,.1,1.35),(.27,.24,.93)]:
  cyl('Trunk',(x,y,h*.40),.037,h*.8,bark,vertices=9)
  for height,radius in [(.36,.26),(.47,.29),(.59,.24),(.71,.20),(.82,.15),(.92,.105)]:
   n=20; vertices=[]; faces=[]; angle=rng.random()*math.tau
   for ring,(rise,spread) in enumerate(((0,.78),(.055,1),(.16,.48),(.25,.055))):
    for j in range(n):
     a=angle+j*math.tau/n
     jag=1.16 if j%2 else .79
     r=radius*h/1.35*spread*jag*rng.uniform(.83,1.16)
     vertices.append((x+r*math.cos(a),y+r*math.sin(a),h*(height+rise+rng.uniform(-.035,.035))))
     if ring:
      b=(ring-1)*n
      faces.append((b+j,b+(j+1)%n,b+n+(j+1)%n,b+n+j))
   faces.extend([tuple(reversed(range(n))),tuple(range(3*n,4*n))])
   mesh=bpy.data.meshes.new('Jagged conifer bough');mesh.from_pydata(vertices,[],faces);mesh.update()
   obj=bpy.data.objects.new('Conifer bough',mesh);scene.collection.objects.link(obj)
   finish(obj,leaf if height<.7 else leaf2)

def bunker():
 box('Concrete base',(0,0,.17),(.96,.81,.34),shelter,.04)
 box('Armored bunker',(0,.07,.41),(.84,.63,.51),shelter,.06)
 box('Firing recess',(0,-.257,.45),(.68,.02,.15),dark,.012)
 box('Recess top lip',(0,-.29,.55),(.79,.1,.07),edge)
 box('Roof armor',(0,.045,.705),(.98,.84,.12),steel,.025)
 for x in [-.32,.32]:box('Roof seam',(x,.04,.775),(.025,.76,.025),edge,.002)
 cyl('Roof hatch',(.12,.09,.78),.19,.04,edge)
 box('Hatch grip',(.12,.09,.815),(.13,.025,.025),dark,.004)
 for x in [-.33,.33]:box('Front armor pillar',(x,-.3,.35),(.12,.14,.42),shelter)
 stripes_y(-.382,.16,.075)
 for x in [-.28,.28]:
  box('Concrete pour join',(x,-.411,.21),(.018,.012,.16),dark,.002)
  box('Brace plate',(x,-.334,.405),(.11,.047,.29),steel,.011)
 bolts_y([-.38,.38],-.34,[.24,.48])

world=bpy.data.worlds.new('Cool ambient');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.52,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for pos,power,size,col in [((-3,-4,7),700,4,(1,.88,.72)),((4,1,5),500,3,(.60,.77,1))]:
 l=bpy.data.lights.new('Studio softbox','AREA');l.energy=power;l.shape='DISK';l.size=size;l.color=col;o=bpy.data.objects.new('Studio softbox',l);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
c=bpy.data.cameras.new('Isometric');cam=bpy.data.objects.new('Isometric',c);scene.collection.objects.link(cam);scene.camera=cam;cam.location=(8,-8,5.49);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();c.type='ORTHO';c.ortho_scale=2.6;c.shift_y=.22
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=False
scene.render.resolution_x=scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
only=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
with tempfile.TemporaryDirectory() as td:
 previews=[]
 for name,build in [('ridge-rock',ridge),('relay-shield',shield),('cargo',cargo),('transformer',pipes),('conifer',forest),('bunker',bunker)]:
  for o in list(bpy.data.objects):
   if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
  build()
  if only and name not in only:continue
  scene.render.filepath=f'{td}/{name}.png';bpy.ops.render.render(write_still=True)
  im=Image.open(scene.render.filepath).convert('RGBA');bbox=im.getchannel('A').getbbox();assert bbox and min(bbox)>0 and bbox[2]<384 and bbox[3]<384,(name,bbox)
  im.save(OUT/f'cover-{name}.webp',quality=88,method=6)
  p=Image.new('RGBA',(384,410),'#26343c');p.alpha_composite(im);ImageDraw.Draw(p).text((15,386),name,fill='white');previews.append(p)
 sheet=Image.new('RGB',(1152,820));
 for i,p in enumerate(previews):sheet.paste(p,((i%3)*384,(i//3)*410))
 if not only:sheet.save('/tmp/iron-vow-cover-preview.jpg')
print('Ground anchor',tuple(world_to_camera_view(scene,cam,Vector((0,0,0)))))
print('Total WebP bytes',sum(p.stat().st_size for p in OUT.glob('cover-*.webp')))
