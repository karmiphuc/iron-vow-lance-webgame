"""Deterministic separate wreck bake; leaves live sprites and renderer untouched.
blender -b -t 6 -P tools/render_wrecks.py
Canvas 448, ground anchor (.5,.72), display size 3.9192 tiles.
"""
from pathlib import Path
import random
from mathutils import Matrix
# Reuse original modeling helpers and exact camera without running the live export loop.
source=Path(__file__).with_name('render_vehicles.py').read_text()
exec(compile(source.split('previews=[];metadata={}')[0],str(Path(__file__).with_name('render_vehicles.py')),'exec'))
rng=random.Random(901)
char=material('Scorched charcoal metal',(.018,.016,.016),.12,.95)
ash=material('Ash gray torn steel',(.16,.17,.17),.48,.78)
oxide=material('Burnt crimson remnants',(.055,.009,.013),.18,.88)

def meshes():return [o for o in bpy.data.objects if o.type=='MESH']
def recolor(o,m):o.data.materials.clear();o.data.materials.append(m)
def warp(o,fn):
 bpy.context.view_layer.update();w=o.matrix_world.copy();inv=w.inverted()
 for v in o.data.vertices:v.co=inv@fn(w@v.co)
def remove(o):bpy.data.objects.remove(o,do_unlink=True)
def shard(n,p,scale,rot=(0,0,0),m=ash):
 o=box(n,p,scale,m,.003);o.rotation_euler=rot;return o

def tank_wreck():
 tank();bpy.context.view_layer.update()
 turret_tokens=['Long low wedge turret','Sloped composite cheek','Turret red','Turret side','Turret bustle','Bustle rack','Flush crew','Hatch lifting','Independent commander','Commander thermal','Gunner armored','Gunner optic','Cannon armored mantlet','Smoke launcher']
 for o in list(meshes()):
  if any(t in o.name for t in ['Smooth bore cannon','Thermal sleeve','Fume extractor','Muzzle reinforced','Dark cannon','Low radio mast']):remove(o);continue
  if any(t in o.name for t in turret_tokens):
   pivot=Vector((0,.10,.42));rot=Matrix.Rotation(.52,4,'Y')@Matrix.Rotation(-.76,4,'Z')
   warp(o,lambda w:rot@(w-pivot)+Vector((.12,.48,.28)))
   recolor(o,oxide if 'turret' in o.name.lower() or 'cheek' in o.name else char)
  else:
   recolor(o,char if rng.random()<.7 else oxide)
   if 'Track' in o.name or 'track' in o.name or 'Road wheel' in o.name or 'road wheel' in o.name:
    if o.location.x>.25 and o.location.y<-.1:remove(o);continue
   # Hull bows down at the ruptured front right, leaving the rear intact.
   if any(t in o.name for t in ['hull','glacis','skirt','cassette']):
    warp(o,lambda w:Vector((w.x+(max(0,-w.y)*.12 if w.x>0 else 0),w.y,max(.025,w.z-max(0,-w.y)*.14))))
 # Wide black torn turret ring and bright peeled armor make the destroyed state unmistakable.
 cylinder('Empty ruptured turret well',(0,-.12,.355),.275,.025,char,v=24)
 for k in range(11):
  a=k*math.tau/11;r=.26
  shard('Jagged turret ring lip',(math.cos(a)*r,-.12+math.sin(a)*r,.37+rng.uniform(-.035,.05)),(.13,.055,.025),(.25+rng.random()*.65,.15,a),ash if k%3 else oxide)
 for k in range(5):
  shard('Split hull plate',(.28+k*.035,-.48+k*.03,.16+k*.045),(.22,.12,.022),(.4,-.25,k*.3),ash)
 # Snapped barrel stub protrudes sideways from displaced turret.
 rod('Snapped gun root',(.20,.32,.32),(.48,.20,.26),.043,char)
 rod('Broken cannon fallen nearby',(-.32,-.47,.055),(-.54,-.76,.055),.030,ash)
 # Slack detached tread links within the original footprint.
 for k in range(6):
  shard('Torn tread shoe',(.48+math.sin(k*.65)*.06,-.48+k*.10,.035),(.16,.065,.03),(0,0,.25+k*.15),char)
 cylinder('Detached road wheel',(.38,-.58,.055),.082,.035,char,(.18,0,.2),20)

def heli_wreck():
 helicopter();bpy.context.view_layer.update()
 for o in list(meshes()):
  if any(t in o.name for t in ['Composite rotor blade','Rotor tip marking','Forward gunner canopy','Raised pilot canopy','Canopy armored','Canopy side','Canopy longitudinal','Rotor mast','Rotor hub','Chin gun','Long chin','Chin muzzle','Main landing','Landing wheel']):remove(o);continue
  is_tail=any(t in o.name for t in ['tail','Tail'])
  recolor(o,oxide if any(t in o.name for t in ['Turbine armored','Recognition','recognition','vertical tail']) else char)
  if is_tail:
   # Severed rear assembly lies sideways alongside the wreck, compact footprint.
   rot=Matrix.Rotation(-.9,4,'Z')@Matrix.Rotation(.5,4,'Y')
   warp(o,lambda w:rot@Vector((w.x,(w.y-.65)*.60,(w.z-.50)*.50))+Vector((.24,.43,.10)))
  else:
   # Collapsed cabin rolls onto the starboard side, crushing the belly.
   rot=Matrix.Rotation(.47,4,'Y')
   warp(o,lambda w:Vector(((rot@Vector((w.x,w.y,(w.z-.30)*.5))).x,w.y,max(.035,(rot@Vector((w.x,w.y,(w.z-.30)*.5))).z+.12))))
 # Exposed open cockpit, twisted canopy sills, splintered structural frames.
 box('Black open cockpit',(0,-.34,.24),(.24,.40,.05),char,.01)
 for side in [-1,1]:
  for y in [-.50,-.29,-.08]:
   rod('Shattered canopy strut',(side*.14,y,.18),(side*(.15+rng.random()*.09),y+.03,.31+rng.random()*.08),.012,ash)
 rod('Bent exposed cockpit spar',(-.16,-.54,.25),(.13,-.42,.35),.012,ash)
 rod('Broken rotor spindle',(0,.08,.27),(.15,.12,.39),.025,ash)
 shard('Snapped rotor blade',(.25,.12,.22),(.47,.06,.013),(.15,.2,-.35),char)
 shard('Detached rotor segment',(-.30,-.19,.035),(.44,.055,.014),(.03,0,-.8),char)
 for k in range(6):
  shard('Peeled fuselage skin',(.1+(k%2)*.09,-.16+k*.06,.22),(.15,.07,.017),(.25*k,.4,k*.6),ash if k%2 else oxide)
 rod('Exposed broken tail spar',(0,.37,.17),(.19,.51,.08),.023,ash)
 cylinder('Dislodged landing wheel',(-.25,-.45,.045),.065,.035,char,(0,0,.3),20)

previews=[];metadata={}
with tempfile.TemporaryDirectory() as td:
 for name,build in [('tank',tank_wreck),('helicopter',heli_wreck)]:
  for o in list(meshes()):remove(o)
  build();bpy.context.view_layer.update()
  scene.render.filepath=f'{td}/wreck-{name}.png';bpy.ops.render.render(write_still=True)
  im=Image.open(scene.render.filepath).convert('RGBA');bounds=im.getchannel('A').getbbox()
  assert bounds and min(bounds)>0 and bounds[2]<448 and bounds[3]<448,(name,bounds)
  for facing,sprite in [('left',im),('right',ImageOps.mirror(im))]:
   key=f'wreck-{name}-{facing}';sprite.save(OUT/f'{key}.webp',quality=90,method=6)
   metadata[key]={'anchor':[.5,.72],'size':448,'tileScale':3.9192,'opaqueBounds':sprite.getchannel('A').getbbox()}
   p=Image.new('RGBA',(448,480),'#26343c');p.alpha_composite(sprite);ImageDraw.Draw(p).text((15,456),key,fill='white');previews.append(p)
 sheet=Image.new('RGB',(896,960))
 for i,p in enumerate(previews):sheet.paste(p,((i%2)*448,(i//2)*480))
 sheet.save('/tmp/iron-vow-wrecks-preview.jpg')
 small=Image.new('RGB',(784,230),'#26343c')
 for i,p in enumerate(previews):small.paste(p.resize((196,210),Image.Resampling.LANCZOS),(i*196,0))
 small.save('/tmp/iron-vow-wrecks-tactical.jpg')
print(json.dumps(metadata,indent=2));print('Wreck bytes',sum(p.stat().st_size for p in OUT.glob('wreck-*.webp')))
