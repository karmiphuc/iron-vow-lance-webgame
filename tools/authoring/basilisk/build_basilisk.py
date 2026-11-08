"""BASILISK / original rigid support walker. Blender 4.3+, reproducible.
Run: blender -b --python build_basilisk.py
All authored coordinates are metres, X left, Y up, Z forward.
No third party geometry or imagery. Textures are procedurally authored here.
"""
import bpy, bmesh, math, os, random, json, struct
from mathutils import Vector, Matrix
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
OUT=os.path.dirname(os.path.abspath(__file__))
random.seed(7)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in bpy.data.materials: bpy.data.materials.remove(d)

# A compact, reusable trim/panel atlas. Four-by-four 512 px cells.
N=2048; T=512
colors=[(184,183,171),(40,53,72),(26,31,39),(112,120,128),
        (127,88,42),(210,211,195),(17,22,28),(152,155,153),
        (40,53,72),(37,48,65),(38,49,65),(30,38,49),
        (166,170,166),(46,61,81),(35,43,54),(173,175,164)]
base=Image.new('RGB',(N,N)); orm=Image.new('RGB',(N,N),(255,180,60)); height=Image.new('L',(N,N),128)
# Original monoline industrial stencil glyphs, drawn as separated polygon strokes.
# These coordinates are authored here, not derived from a font or external asset.
GLYPHS={
 'A':[[(0,1),(.5,0),(1,1)],[(.21,.6),(.79,.6)]],
 'B':[[(0,1),(0,0),(.75,0),(1,.18),(.8,.47),(0,.47)],[(.8,.47),(1,.7),(.8,1),(0,1)]],
 'C':[[(1,.12),(.8,0),(.2,0),(0,.2),(0,.8),(.2,1),(.8,1),(1,.88)]],
 'D':[[(0,1),(0,0),(.7,0),(1,.25),(1,.75),(.7,1),(0,1)]],
 'E':[[(1,0),(0,0),(0,1),(1,1)],[(0,.5),(.8,.5)]],
 'F':[[(0,1),(0,0),(1,0)],[(0,.48),(.8,.48)]],
 'G':[[(1,.16),(.8,0),(.2,0),(0,.2),(0,.8),(.2,1),(1,1),(1,.56),(.55,.56)]],
 'H':[[(0,0),(0,1)],[(1,0),(1,1)],[(0,.5),(1,.5)]],
 'I':[[(0,0),(1,0)],[(.5,0),(.5,1)],[(0,1),(1,1)]],
 'J':[[(0,0),(1,0),(1,.8),(.8,1),(.2,1),(0,.8)]],
 'K':[[(0,0),(0,1)],[(1,0),(0,.52),(1,1)]],
 'L':[[(0,0),(0,1),(1,1)]],
 'M':[[(0,1),(0,0),(.5,.55),(1,0),(1,1)]],
 'N':[[(0,1),(0,0),(1,1),(1,0)]],
 'O':[[(.2,0),(.8,0),(1,.2),(1,.8),(.8,1),(.2,1),(0,.8),(0,.2),(.2,0)]],
 'P':[[(0,1),(0,0),(.8,0),(1,.2),(1,.35),(.8,.53),(0,.53)]],
 'Q':[[(.2,0),(.8,0),(1,.2),(1,.8),(.8,1),(.2,1),(0,.8),(0,.2),(.2,0)],[(.6,.7),(1.1,1.1)]],
 'R':[[(0,1),(0,0),(.8,0),(1,.2),(1,.35),(.8,.5),(0,.5)],[(.5,.5),(1,1)]],
 'S':[[(1,.12),(.8,0),(.2,0),(0,.18),(0,.36),(.2,.5),(.8,.5),(1,.66),(1,.82),(.8,1),(.2,1),(0,.88)]],
 'T':[[(0,0),(1,0)],[(.5,0),(.5,1)]],
 'U':[[(0,0),(0,.8),(.2,1),(.8,1),(1,.8),(1,0)]],
 'V':[[(0,0),(.5,1),(1,0)]],
 'W':[[(0,0),(.2,1),(.5,.48),(.8,1),(1,0)]],
 'X':[[(0,0),(1,1)],[(1,0),(0,1)]],
 'Y':[[(0,0),(.5,.5),(1,0)],[(.5,.5),(.5,1)]],
 'Z':[[(0,0),(1,0),(0,1),(1,1)]],
 '0':[[(.18,0),(.82,0),(1,.18),(1,.82),(.82,1),(.18,1),(0,.82),(0,.18),(.18,0)]],
 '7':[[(0,0),(1,0),(.35,1)]],
 '6':[[(1,.07),(.75,0),(.2,0),(0,.22),(0,.8),(.2,1),(.8,1),(1,.8),(1,.6),(.8,.47),(0,.47)]],
 '3':[[(0,0),(1,0),(.56,.47),(1,.67),(1,.83),(.8,1),(0,1)],[(.35,.47),(.56,.47)]],
 '/':[[(0,1),(1,0)]], '.':[[(.5,.91),(.5,1)]]
}
def stencil(draw,center,text,height,fill,max_width=440,weight=.055):
    widths=[.34 if ch==' ' else .32 if ch in 'I.' else .82 if ch in 'WM' else .62 for ch in text]
    total=sum(widths)+.21*max(0,len(text)-1)
    scale=min(height,max_width/total);left=center[0]-total*scale/2;top=center[1]-scale/2
    for ch,gw in zip(text,widths):
        for path in GLYPHS.get(ch,[]):
            for a,b in zip(path,path[1:]):
                ax=left+a[0]*gw*scale;ay=top+a[1]*scale;bx=left+b[0]*gw*scale;by=top+b[1]*scale
                dx=bx-ax;dy=by-ay;length=math.hypot(dx,dy)
                if length<.001:continue
                ux=dx/length;uy=dy/length;gap=min(scale*.018,length*.10);half=scale*weight
                ax+=ux*gap;ay+=uy*gap;bx-=ux*gap;by-=uy*gap
                draw.polygon([(ax-uy*half,ay+ux*half),(bx-uy*half,by+ux*half),(bx+uy*half,by-ux*half),(ax+uy*half,ay-ux*half)],fill=fill)
        left+=(gw+.21)*scale
for i,c in enumerate(colors):
    x=(i%4)*T;y=(i//4)*T
    a=np.zeros((T,T,3),dtype=np.int16);a[:]=c
    rng=np.random.default_rng(i+27); noise=rng.normal(0,2.0,(T,T,1)); dirt=Image.fromarray(rng.integers(0,255,(32,32),dtype=np.uint8)).resize((T,T),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(6)); noise+=((np.asarray(dirt,dtype=float)-128)/13)[:,:,None];a=np.clip(a+noise,0,255).astype('uint8')
    tile=Image.fromarray(a);d=ImageDraw.Draw(tile)
    # Original chipped ceramic and rubbed industrial paint, generated without images.
    # Dark fractures concentrate at exposed panel edges; long scratches vary in depth.
    light=tuple(min(255,v+19) for v in c);dark=tuple(max(0,int(v*.42)) for v in c)
    for k in range(370):
        xx=random.randrange(T);yy=random.choice([random.randrange(3,36),random.randrange(476,509)])
        if k%2:xx,yy=yy,xx
        rr=random.randrange(1,5);d.polygon([(xx-rr,yy),(xx,yy-rr),(xx+rr*2,yy-1),(xx+rr,yy+rr)],fill=(70,65,52) if i in (0,7,8,12,15) else (111,104,83))
        if k%3==0:d.line((xx-rr,yy+rr+1,xx+rr,yy+rr+1),fill=light,width=1)
    for k in range(100):
        xx=random.randrange(24,488);yy=random.randrange(24,488);ln=random.randrange(5,40)
        d.line((xx,yy,xx+ln,yy+random.randrange(-20,20)),fill=tuple(int(v*.77) for v in c),width=1)
    for k in range(24):
        xx=random.randrange(25,480);yy=random.randrange(25,480)
        d.ellipse((xx,yy,xx+random.randrange(1,4),yy+random.randrange(1,5)),fill=dark)
    if i not in (3,4,5,6):
        d.line((12,16,498,16),fill=dark,width=2);d.line((16,16,16,496),fill=dark,width=2)
    if i==8:
        stencil(d,(252,225),'06',260,(193,198,188),380,.082)
        d.rectangle((66,410,433,419),fill=(54,58,56));stencil(d,(252,452),'BASILISK / 06',27,(193,198,188))
    if i==9:
        for px in range(-600,1100,145):d.polygon([(px,0),(px+65,0),(px+577,512),(px+512,512)],fill=(216,218,196))
    if i==10:
        stencil(d,(256,220),'IRON VOW',64,(217,220,197))
        stencil(d,(256,300),'SUPPORT  /  6.3',30,(190,199,168))
        for k in range(13):d.rectangle((76+k*28,372,84+k*28,427 if k%3 else 410),fill=(207,213,186))
    if i==11:
        d.rectangle((40,85,472,425),outline=(26,34,26),width=9)
        for k in range(7):d.rectangle((70,110+k*43,442,128+k*43),fill=(19,25,23));d.line((72,130+k*43,442,130+k*43),fill=(91,104,73),width=3)
    if i==12:
        d.rectangle((38,55,474,459),outline=(35,45,29),width=5)
        stencil(d,(256,186),'CAUTION',54,(53,57,51))
        stencil(d,(256,263),'HYDRAULIC',37,(53,57,51))
        stencil(d,(256,319),'HIGH PRESSURE',28,(53,57,51))
    base.paste(tile,(x,y))
    rough=[175,157,121,66,182,182,218,178,175,165,157,185,175,178,127,175][i]
    metal=[35,178,220,240,70,35,18,50,35,155,178,200,45,150,225,40][i]
    ot=Image.new('RGB',(T,T),(255,rough,metal));od=ImageDraw.Draw(ot)
    od.rectangle((0,0,511,511),outline=(225,min(255,rough+20),metal),width=6)
    orm.paste(ot,(x,y))
    hd=ImageDraw.Draw(height);hd.rectangle((x+12,y+12,x+500,y+500),outline=118,width=3)
    if i==11:
        for k in range(7):hd.rectangle((x+70,y+110+k*43,x+442,y+128+k*43),fill=80)
base.save(os.path.join(OUT,'basilisk_basecolor.jpg'),quality=87,subsampling=0,optimize=True)
orm.save(os.path.join(OUT,'basilisk_orm.png'),optimize=True)
h=np.array(height.filter(ImageFilter.GaussianBlur(.65)),dtype=float)/255
dy,dx=np.gradient(h);norm=np.stack([-dx*5,dy*5,np.ones_like(h)],axis=2);norm/=np.linalg.norm(norm,axis=2,keepdims=True)
Image.fromarray(np.uint8(np.clip(norm*.5+.5,0,1)*255)).save(os.path.join(OUT,'basilisk_normal.png'),optimize=True)

mat=bpy.data.materials.new('basilisk_atlas');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
def texture(filename,noncolor=False):
    t=nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(os.path.join(OUT,filename));t.image.colorspace_settings.name='Non-Color' if noncolor else 'sRGB';return t
bc=texture('basilisk_basecolor.jpg');links.new(bc.outputs['Color'],p.inputs['Base Color'])
ot=texture('basilisk_orm.png',True);sep=nodes.new('ShaderNodeSeparateColor');links.new(ot.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
# glTF recognizes this named group as the AO texture channel.
g=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');g.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');gn=nodes.new('ShaderNodeGroup');gn.node_tree=g;links.new(sep.outputs['Red'],gn.inputs['Occlusion'])
nt=texture('basilisk_normal.png',True);nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.24;links.new(nt.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
def emissive(name,color,strength):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*[v*.1 for v in color],1);n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=strength;n.inputs['Roughness'].default_value=.24;return m
visor=emissive('emissive_visor',(1,.33,.035),3.0);stackmat=emissive('emissive_stack',(1,.11,.009),.7)

C=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
def v(p):return C@Vector(p)
groups={};joint_contract={};buckets={}
def empty(name,parent=None,pos=(0,0,0),joint=True):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=v(pos);o.empty_display_size=.12;groups[name]=o
    if joint:joint_contract[name]={'parent':parent.name if parent else None,'translation':list(pos)}
    return o
root=empty('root');pelvis=empty('pelvis',root,(0,3.5,0));spine=empty('spine',pelvis,(0,.3,0));neck=empty('neck',spine,(0,1.95,.45))
def finish(o,parent,tile=0,material=None,bevel=0):
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
    if bevel:
        mod=o.modifiers.new('machined chamfer','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.clear();o.data.materials.append(material or mat)
    # Box projection into a tile; bevels deliberately retain separate hard normals.
    uv=o.data.uv_layers.new(name='AtlasUV') if not o.data.uv_layers else o.data.uv_layers[0]
    uv.name='AtlasUV'
    coords=[vert.co for vert in o.data.vertices];lo=[min(p[i] for p in coords) for i in range(3)];hi=[max(p[i] for p in coords) for i in range(3)]
    for face in o.data.polygons:
        axis=max(range(3),key=lambda k:abs(face.normal[k]));axes={0:(1,2),1:(0,2),2:(0,1)}[axis]
        for li in face.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co;a,b=axes
            uu=(co[a]-lo[a])/max(.00001,hi[a]-lo[a]);vv=(co[b]-lo[b])/max(.00001,hi[b]-lo[b])
            if axis==0 and face.normal.x<0:uu=1-uu
            uv.data[li].uv=((tile%4+(10+uu*492)/512)/4,1-(tile//4+1)/4+(10+vv*492)/2048)
    o.parent=parent
    buckets.setdefault((parent.name,(material or mat).name),[]).append(o)
    o.select_set(False);return o
def box(parent,dim,pos=(0,0,0),tile=0,bevel=.035,rot=(0,0,0),material=None):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name='plate';o.scale=(dim[0],dim[2],dim[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,parent,tile,material,bevel);o.location=v(pos)
    from mathutils import Euler
    o.rotation_euler=(C@Euler(rot,'XYZ').to_matrix()@C.transposed()).to_euler();return o
def cyl(parent,r,depth,pos=(0,0,0),tile=2,axis=(0,1,0),vertices=12,r2=None,material=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=depth);o=bpy.context.object;o.name='machined';finish(o,parent,tile,material,.012 if r>.06 else 0);o.location=v(pos);o.rotation_euler=v(axis).to_track_quat('Z','Y').to_euler();return o
def prism(parent,outline,zback,zfront,tile=0,bevel=.04):
    verts=[tuple(v((x,y,z))) for z in [zback,zfront] for x,y in outline];n=len(outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    me=bpy.data.meshes.new('forged panel');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('forged panel',me);bpy.context.collection.objects.link(o);return finish(o,parent,tile,None,bevel)
def bolt(parent,pos,axis=(0,0,1),r=.036):cyl(parent,r,.035,pos,3,axis,6)
def hose(parent,points,r=.045,tile=6):
    cu=bpy.data.curves.new('armored conduit','CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=1
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for bp,pt in zip(sp.bezier_points,points):bp.co=v(pt);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
    o=bpy.data.objects.new('conduit',cu);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');finish(o,parent,tile)
def ring(parent,outer,inner,depth,pos,tile=2):
    vs=[];N=12
    for yy,rr in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
        for i in range(N):a=i*math.tau/N;vs.append(tuple(v((pos[0]+rr*math.cos(a),pos[1]+yy,pos[2]+rr*math.sin(a)))))
    fs=[]
    for i in range(N):j=(i+1)%N;fs.extend([(i,j,j+N,i+N),(i+2*N,i+3*N,j+3*N,j+2*N),(i+N,j+N,j+3*N,i+3*N),(i,i+2*N,j+2*N,j)])
    me=bpy.data.meshes.new('hollow exhaust');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('hollow exhaust',me);bpy.context.collection.objects.link(o);finish(o,parent,tile,None,.012)

# Mark II: a heavy ceramic shell over an articulated charcoal chassis.
# Each section uses sloped polygon plates and tapered housings, not box stacks.
def plate(parent,outline,depth=.12,tile=0,bevel=.025):
    # outline contains xyz front-face points; constant-depth back face.
    n=len(outline);vs=[tuple(v((x,y,z-depth))) for x,y,z in outline]+[tuple(v(p)) for p in outline]
    fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    me=bpy.data.meshes.new('sculpted armor');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('sculpted armor',me);bpy.context.collection.objects.link(o);return finish(o,parent,tile,None,bevel)
def loft(parent,sections,tile=1,bevel=.025):
    # y,width,front,back: chamfered octagonal horizontal rings.
    vs=[]
    for y,w,f,b in sections:
        for x,z in [(-w*.78,f), (w*.78,f),(w,f-.16),(w,b+.16),(w*.78,b),(-w*.78,b),(-w,b+.16),(-w,f-.16)]:vs.append(tuple(v((x,y,z))))
    count=len(sections);fs=[tuple(range(7,-1,-1)),tuple(range((count-1)*8,count*8))]
    for j in range(count-1):
        for i in range(8):a=j*8+i;b=j*8+(i+1)%8;fs.append((a,b,b+8,a+8))
    me=bpy.data.meshes.new('tapered casing');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('tapered casing',me);bpy.context.collection.objects.link(o);return finish(o,parent,tile,None,bevel)
def fasteners(parent,points):
    for p in points:
        cyl(parent,.027,.014,p,2,(0,0,1),10);cyl(parent,.014,.019,(p[0],p[1],p[2]+.010),3,(0,0,1),6)
def panel_outline(parent,xy,z,tile=0,thick=.12,slope=0):
    return plate(parent,[(x,y,z+slope*y) for x,y in xy],thick,tile)
def handle(parent,a,b,r=.035):
    mid=((a[0]+b[0])/2,(a[1]+b[1])/2+.09,(a[2]+b[2])/2)
    hose(parent,[a,(a[0],a[1]+.09,a[2]),(b[0],b[1]+.09,b[2]),b],r,3)

# Compact waist and overlapping hip skirt leave a dark, convincing joint cavity.
loft(pelvis,[(-.35,.68,.42,-.46),(.1,.79,.48,-.48),(.25,.65,.38,-.40)],2,.03)
cyl(pelvis,.24,1.72,(0,-.08,0),2,(1,0,0),16)
for s in [1,-1]:
    panel_outline(pelvis,[(s*.08,.05),(s*.67,.02),(s*.72,-.45),(s*.51,-.68),(s*.10,-.52)],.58,7,.13,.16)
    panel_outline(pelvis,[(s*.76,.12),(s*1.0,-.01),(s*1.13,-.65),(s*.86,-.79),(s*.73,-.43)],.17,1,.24,-.10)
    fasteners(pelvis,[(s*.18,-.13,.59),(s*.56,-.15,.59)])
cyl(spine,.49,.26,(0,.11,0),2,vertices=20)
for y in [.23,.36,.49]:cyl(spine,.43,.065,(0,y,0),3,vertices=16)

# Basilisk armored support breastplate: broad shoulders, inset ceramic center and low sensor well.
loft(spine,[(.38,.65,.40,-.45),(.76,1.0,.64,-.70),(1.48,1.22,.68,-.80),(1.98,1.06,.14,-.74)],1,.045)
for side in [1,-1]:
    panel_outline(spine,[(side*.15,.62),(side*.91,.68),(side*1.15,1.14),(side*1.02,1.78),(side*.64,1.99),(side*.39,1.48)],1.03,1,.22,-.21)
    panel_outline(spine,[(side*.60,1.05),(side*.99,1.12),(side*.92,1.49),(side*.69,1.65),(side*.52,1.42)],.94,7,.09,-.18)
    panel_outline(spine,[(side*.16,1.51),(side*.42,1.70),(side*.59,1.98),(side*.33,2.07)],.38,1,.16,-.10)
    for yy in [.88,1.02,1.16]:box(spine,(.055,.075,.34),(side*1.18,yy,-.02),2,.008)
    fasteners(spine,[(side*.98,1.20,.655),(side*.75,1.69,.56),(side*.43,.86,.76)])
    box(spine,(.34,.47,.09),(side*.99,1.48,-.51),11,.018,rot=(0,side*.35,0))
panel_outline(spine,[(-.50,.54),(.50,.54),(.65,.92),(.44,1.48),(-.44,1.48),(-.65,.92)],1.03,1,.30,-.11)
panel_outline(spine,[(-.29,.63),(.29,.63),(.43,.91),(.28,1.18),(-.28,1.18),(-.43,.91)],1.07,0,.10,-.11)
box(spine,(.34,.055,.035),(0,1.32,.894),2,.006)
box(spine,(.15,.018,.038),(0,1.32,.915),3,.004)
fasteners(spine,[(-.36,1.29,.91),(.36,1.29,.91),(-.38,.80,.965),(.38,.80,.965)])
box(spine,(.19,.075,.022),(-.83,.91,.765),4,.006)
# A stacked abdomen protects the vertical waist actuator without obscuring it.
for yy,ww in [(.31,.34),(.45,.40),(.59,.47)]:
    box(spine,(ww,.075,.12),(0,yy,.40),1,.015)

# Rear power module and short exhaust cans: head and shoulders dominate the silhouette.
loft(spine,[(.77,.76,-.68,-1.25),(1.57,.88,-.64,-1.28),(2.06,.69,-.60,-1.10)],2,.03)
box(spine,(1.20,.59,.11),(0,1.26,-1.32),11,.018)
for side in [1,-1]:
    ring(spine,.23,.16,.58,(side*.51,2.12,-.91),1)
    ring(spine,.25,.16,.085,(side*.51,2.40,-.91),3)
    cyl(spine,.153,.014,(side*.51,2.15,-.91),2,material=stackmat)
    empty('stackTop.'+('L' if side>0 else 'R'),spine,(side*.51,2.45,-.91),False)
    box(spine,(.17,.79,.20),(side*.84,1.40,-1.20),7,.025)
    hose(spine,[(side*.67,1.79,-1.02),(side*1.03,1.97,-.89),(side*1.38,1.85,-.63),(side*1.38,1.57,-.41)],.065,6)
    hose(spine,[(side*.69,.86,-1.11),(side*.92,.61,-.97),(side*.75,.40,-.51)],.048,6)

# Small recessed face; the cream brow is a continuous wedge, not a separate hat.
cyl(neck,.21,.20,(0,-.10,-.07),2,vertices=16)
loft(neck,[(-.22,.31,.32,-.40),(.03,.41,.39,-.43),(.31,.31,.10,-.39)],1,.025)
panel_outline(neck,[(-.46,.11),(.46,.11),(.36,.29),(.14,.39),(-.26,.33)],.43,1,.17,-.85)
box(neck,(.64,.17,.07),(0,-.005,.398),6,.018)
box(neck,(.49,.065,.025),(0,.015,.443),0,.008,material=visor)
box(neck,(.17,.11,.04),(.22,.01,.457),2,.008)
panel_outline(neck,[(-.29,-.22),(.28,-.22),(.34,-.10),(-.34,-.10)],.39,7,.12,.1)
for side in [1,-1]:
    cyl(neck,.105,.13,(side*.41,.00,.02),2,(1,0,0));bolt(neck,(side*.49,.00,.02),(side,0,0),.05)
fasteners(neck,[(-.32,.18,.303),(.29,.18,.303)])

arms={};legs={}
for side,L in [(1,'L'),(-1,'R')]:
    sh=empty('shoulder.'+L,spine,(side*1.4,1.6,0));el=empty('elbow.'+L,sh,(0,-1.1,0));wr=empty('wrist.'+L,el,(0,-1.08,0));empty('socket.'+L,wr,(0,-.22,0))
    paul=empty('pauldron.'+L,spine,(side*1.4,1.6,0),False)
    # An offset saddle with a long downward shield; left/right cut-lines differ.
    outline=[(-.22,-.30),(.59,-.45),(.94,-.18),(.85,.56),(.49,.83),(-.15,.72)] if L=='L' else [(-.17,-.45),(.59,-.56),(.84,-.12),(.77,.52),(.40,.77),(-.15,.65)]
    panel_outline(paul,[(side*x,y) for x,y in outline],.48,1,.22,-.65)
    panel_outline(paul,[(side*.15,-.17),(side*.57,-.23),(side*.67,.09),(side*.56,.35),(side*.18,.29)],.505,7,.065,-.65)
    # No box lid: the rear crown follows a three-level armored saddle.
    crown=loft(paul,[(.40,.50,.12,-.72),(.64,.46,.01,-.76),(.77,.32,-.18,-.55)],1,.03);crown.location.x=side*.28
    panel_outline(paul,[(side*.69,-.56),(side*.96,-.49),(side*1.04,.30),(side*.88,.53),(side*.79,-.01)],.20,7,.21,-.32)
    if L=='R':panel_outline(paul,[(side*.01,-.35),(side*.55,-.43),(side*.66,-.17),(side*.14,-.09)],.505,7,.055,-.65)
    for x,y in [(-.12,.42),(.57,.49),(.54,-.30),(.08,-.24)]:bolt(paul,(side*x,y,.49-.65*y))
    box(paul,(.09,.16,.025),(side*.65,-.17,.607),4,.006,rot=(.57,0,0))
    handle(paul,(side*.12,.69,-.48),(side*.51,.76,-.48),.036)
    # Shoulder actuator and a tapered humeral shell expose steel at the elbow.
    cyl(sh,.36,.68,(0,0,0),2,(1,0,0),20);cyl(sh,.26,.75,(0,0,0),3,(1,0,0),16)
    for x in [-.33,.33]:cyl(sh,.30,.06,(x,0,0),1,(1,0,0),16)
    loft(sh,[(-.90,.20,.23,-.22),(-.72,.31,.32,-.32),(-.20,.30,.31,-.31),(-.07,.24,.19,-.24)],2,.025)
    panel_outline(sh,[(-.32,-.22),(.30,-.18),(.28,-.65),(.13,-.81),(-.27,-.74)],.40,1,.12,-.05)
    fasteners(sh,[(-.22,-.33,.43),(.19,-.62,.435)])
    # Forearm is a faceted gauntlet with an inset service plate and a dark cuff.
    cyl(el,.29,.75,(0,0,0),2,(1,0,0),20);cyl(el,.205,.80,(0,0,0),3,(1,0,0),16)
    loft(el,[(-1.01,.23,.22,-.26),(-.83,.34,.35,-.37),(-.37,.39,.43,-.34),(-.12,.30,.24,-.24)],1,.025)
    panel_outline(el,[(-.30,-.27),(.32,-.24),(.41,-.62),(.25,-.88),(-.24,-.91),(-.38,-.62)],.50,1,.16,.10)
    panel_outline(el,[(-.19,-.35),(.21,-.33),(.25,-.60),(-.19,-.63)],.53,7,.045,.1)
    panel_outline(el,[(side*.29,-.23),(side*.45,-.40),(side*.41,-.82),(side*.25,-.91)],.10,1,.29,0)
    fasteners(el,[(-.26,-.40,.475),(.27,-.43,.478),(-.19,-.79,.438),(.20,-.78,.44)])
    box(el,(.22,.055,.03),(0,-.38,.537),2,.006)
    box(el,(.09,.12,.025),(side*.29,-.67,.45),4,.006)
    cyl(wr,.20,.19,(0,-.06,0),3,vertices=16)
    box(wr,(.49,.30,.46),(0,-.20,0),2,.025)
    for xx in [-.17,0,.17]:
        box(wr,(.14,.23,.17),(xx,-.36,.19),1,.02,rot=(.12,0,0));box(wr,(.13,.11,.16),(xx,-.46,.12),2,.015)
    box(wr,(.14,.24,.19),(-side*.27,-.23,.10),1,.02,rot=(0,0,-side*.25))
    # Lateral support gauntlet, segmented, keeping the wrist and weapon channel free.
    panel_outline(el,[(side*.31,-.25),(side*.54,-.38),(side*.52,-.79),(side*.28,-.95)],.04,1,.32,-.04)
    for yy in [-.42,-.59,-.76]:box(el,(.10,.045,.27),(side*.48,yy,-.13),3,.008)
    arms[L]=(sh,el,wr)
    hip=empty('hip.'+L,pelvis,(side*.62,-.1,0));kn=empty('knee.'+L,hip,(0,-1.45,0));an=empty('ankle.'+L,kn,(0,-1.55,0));legs[L]=(hip,kn,an)
    # Wide thighs taper into a visible circular knee bearing.
    cyl(hip,.31,.70,(0,0,0),2,(1,0,0),20)
    loft(hip,[(-1.20,.25,.27,-.27),(-.91,.43,.39,-.35),(-.30,.45,.42,-.37),(-.08,.31,.27,-.28)],2,.025)
    panel_outline(hip,[(-.37,-.17),(.33,-.13),(.48,-.62),(.34,-1.03),(.12,-1.16),(-.34,-1.04),(-.46,-.65)],.55,1,.20,.06)
    panel_outline(hip,[(-.24,-.43),(.28,-.39),(.30,-.72),(-.26,-.74)],.59,7,.045,.06)
    panel_outline(hip,[(side*.34,-.18),(side*.58,-.32),(side*.61,-.92),(side*.32,-1.10)],.06,1,.34,-.02)
    fasteners(hip,[(-.29,-.31,.57),(.26,-.30,.57),(-.25,-.94,.51),(.25,-.94,.51)])
    box(hip,(.30,.055,.025),(0,-.57,.605),2,.004)
    cyl(kn,.29,.76,(0,0,0),2,(1,0,0),20);cyl(kn,.19,.82,(0,0,0),3,(1,0,0),16)
    # Offset knee shield, narrow shin rails, and prominent external boot pistons.
    panel_outline(kn,[(-.32,.26),(.26,.29),(.43,-.03),(.24,-.43),(-.19,-.48),(-.43,-.16)],.55,1,.20,-.22)
    fasteners(kn,[(-.22,.16,.535),(.20,.16,.535)])
    loft(kn,[(-1.43,.24,.17,-.24),(-1.13,.31,.21,-.33),(-.50,.28,.16,-.28),(-.28,.22,.17,-.21)],2,.018)
    for xx in [-.20,.20]:
        cyl(kn,.075,.78,(xx,-.91,.31),3,vertices=12)
        cyl(kn,.108,.30,(xx,-1.19,.31),2,vertices=12)
        cyl(kn,.105,.06,(xx,-.50,.31),1,vertices=12)
    box(kn,(.15,.78,.13),(0,-.89,.21),1,.014)
    for yy in [-.60,-.77,-.94,-1.11]:box(kn,(.13,.055,.15),(0,yy,.29),2,.006)
    panel_outline(kn,[(side*.23,-.44),(side*.49,-.35),(side*.60,-.77),(side*.41,-1.11),(side*.25,-1.08)],.12,1,.29,.04)
    # Deep outboard shin shield is divided around an exposed silver support ram.
    panel_outline(kn,[(side*.29,-.48),(side*.53,-.43),(side*.61,-.80),(side*.48,-1.23),(side*.24,-1.18)],.22,1,.22,.05)
    panel_outline(kn,[(side*.33,-.62),(side*.48,-.57),(side*.52,-.81),(side*.42,-.99),(side*.29,-.96)],.27,7,.055,.05)
    hose(kn,[(side*.32,-.29,-.32),(side*.55,-.49,-.42),(side*.58,-1.04,-.39),(side*.30,-1.29,-.21)],.063,6)
    hose(kn,[(side*.23,-.36,-.36),(side*.42,-.56,-.50),(side*.45,-1.11,-.46),(side*.24,-1.33,-.24)],.047,3)
    # Articulated ankle hood and tall stepped sabot, sole still exactly -.30.
    cyl(an,.25,.76,(0,0,0),2,(1,0,0),20)
    box(an,(1.03,.10,1.73),(0,-.25,.25),6,.018)
    loft(an,[(-.21,.49,1.08,-.55),(.03,.48,1.01,-.51),(.25,.36,.64,-.32)],1,.035)
    panel_outline(an,[(-.43,.49),(.36,.50),(.48,.18),(.29,.04),(-.39,.09),(-.49,.24)],.46,7,.18,-.22)
    fasteners(an,[(-.32,.34,.40),(.26,.35,.39)])
    # Three sloped toe courses are flush along the wedge, not separate block toes.
    for z,y,w in [(.58,.21,.69),(.83,.12,.77),(1.045,.025,.75)]:
        box(an,(w,.07,.24),(0,y,z),1,.018,rot=(.25,0,0))
        for xx in [-w*.38,w*.38]:bolt(an,(xx,y+.04,z+.045),(0,1,0),.025)
    for sidefoot in [-1,1]:
        plate(an,[(sidefoot*.34,-.20,1.04),(sidefoot*.55,-.19,.82),(sidefoot*.56,.04,.42),(sidefoot*.39,.23,.48)],.17,1,.025)
    box(an,(.64,.20,.40),(0,-.12,-.54),1,.03)

# Twin rear-set six-cell launch packs identify Basilisk at game scale.
# Both are static children of the spine, leaving all shared animation pivots exact.
def zring(parent,outer,inner,depth,pos,tile=3,n=12):
    verts=[]
    for zz,rr in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
        for i in range(n):
            ang=i*math.tau/n;verts.append(tuple(v((pos[0]+rr*math.cos(ang),pos[1]+rr*math.sin(ang),pos[2]+zz))))
    faces=[]
    for i in range(n):
        j=(i+1)%n;faces.extend([(i,j,j+n,i+n),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    me=bpy.data.meshes.new('launcher machined annulus');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('launcher machined annulus',me);bpy.context.collection.objects.link(o);return finish(o,parent,tile,None,.008)
def podshell(parent,cx,cy):
    # Structural case narrows aft; open front frame is made from eight longitudinal plates.
    w=.75;h=.52;c=.15
    xy=[(-w+c,-h),(w-c,-h),(w,-h+c),(w,h-c),(w-c,h),(-w+c,h),(-w,h-c),(-w,-h+c)]
    inn=[(-w+c+.035,-h+.07),(w-c-.035,-h+.07),(w-.07,-h+c+.035),(w-.07,h-c-.035),(w-c-.035,h-.07),(-w+c+.035,h-.07),(-w+.07,h-c-.035),(-w+.07,-h+c+.035)]
    for i in range(8):
        j=(i+1)%8
        verts=[]
        for z,pts in [(-1.55,xy),(.25,xy),(-1.55,inn),(.25,inn)]:
            for k in [i,j]:verts.append(tuple(v((cx+pts[k][0],cy+pts[k][1],z))))
        fs=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
        me=bpy.data.meshes.new('launcher shell segment');me.from_pydata(verts,[],fs);me.update();o=bpy.data.objects.new('launcher shell segment',me);bpy.context.collection.objects.link(o);finish(o,parent,1,None,.016)
    # Recessed charcoal blast bulkhead, tube lips and capped munitions visible through the frame.
    box(parent,(1.31,.88,.11),(cx,cy,-.02),2,.04)
    for xx in [-.43,0,.43]:
        for yy in [-.225,.225]:
            zring(parent,.192,.153,.18,(cx+xx,cy+yy,.15),3,12)
            zring(parent,.154,.136,.09,(cx+xx,cy+yy,.065),2,12)
            cyl(parent,.131,.026,(cx+xx,cy+yy,.025),14,(0,0,1),12)
            cyl(parent,.046,.012,(cx+xx,cy+yy,.044),3,(0,0,1),10)
            box(parent,(.040,.010,.010),(cx+xx,cy+yy,.055),4,.002)
    # Crown armor and lateral field-replaceable magazines follow the chamfered case.
    for z in [-1.20,-.57,.02]:
        box(parent,(1.13,.085,.48),(cx,cy+.55,z),1,.024)
        for xx in [-.43,.43]:bolt(parent,(cx+xx,cy+.60,z),(0,1,0),.025)
    for side in [-1,1]:
        box(parent,(.085,.61,.70),(cx+side*.77,cy,-.76),1,.025)
        box(parent,(.094,.35,.46),(cx+side*.78,cy-.02,-.75),7,.018)
        for z in [-1.32,-.20]:
            box(parent,(.07,.77,.13),(cx+side*.76,cy,z),1,.018)
            for yy in [-.23,.23]:bolt(parent,(cx+side*.805,cy+yy,z),(side,0,0),.025)
        box(parent,(.098,.14,.27),(cx+side*.783,cy+.25,-.74),10,.009)
    box(parent,(1.21,.75,.15),(cx,cy,-1.58),11,.035)
    handle(parent,(cx-.28,cy+.60,-.72),(cx+.28,cy+.60,-.72),.033)
for side in [-1,1]:
    cx=side*1.70;cy=2.77
    # Rear swept pedestal places the launcher above and behind shoulder swing volume.
    cyl(spine,.28,.56,(cx,2.13,-.72),2,vertices=16)
    cyl(spine,.33,.09,(cx,2.38,-.72),3,vertices=16)
    box(spine,(.51,.18,1.04),(cx,2.35,-.70),1,.035)
    podshell(spine,cx,cy)
    empty('pod.'+('L' if side>0 else 'R'),spine,(cx,cy,.25),False)
    hose(spine,[(side*.82,1.73,-1.05),(side*1.20,1.96,-1.26),(cx,2.23,-1.15),(cx,2.35,-.94)],.075,6)
# Central rangefinder/radio pack bridges the shoulder systems without obscuring the head.
loft(spine,[(2.03,.29,-.61,-1.16),(2.32,.36,-.66,-1.20),(2.54,.23,-.72,-1.10)],1,.025)
box(spine,(.37,.10,.025),(0,2.34,-.653),6,.012)
box(spine,(.21,.035,.021),(0,2.34,-.634),0,.005,material=visor)

# Ten live telescoping pairs. Each half is a separate rigid node, local +Z at its mate.
pairs=[]
def piston(pa,a,pb,b,r=.07):
    idx=len(pairs)+1;ha=empty('piston.%d.a'%idx,pa,a,False);hb=empty('piston.%d.b'%idx,pb,b,False)
    bpy.context.view_layer.update();wa=ha.matrix_world.translation.copy();wb=hb.matrix_world.translation.copy();dist=(wb-wa).length
    for ob,target in [(ha,wb),(hb,wa)]:
        direction=ob.parent.matrix_world.inverted().to_3x3()@(target-ob.matrix_world.translation)
        ob.rotation_mode='QUATERNION';ob.rotation_quaternion=direction.to_track_quat('-Y','Z')
    cyl(ha,r,dist*.58,(0,0,dist*.29),2,(0,0,1));cyl(ha,r*1.25,.09,(0,0,.055),3,(0,0,1))
    cyl(ha,r*1.12,.07,(0,0,dist*.56),4,(0,0,1))
    cyl(hb,r*.58,dist*.61,(0,0,dist*.305),3,(0,0,1));cyl(hb,r*1.15,.085,(0,0,.045),2,(0,0,1))
    pairs.append({'a':ha.name,'b':hb.name,'rest_length':dist})
for s,L in [(1,'L'),(-1,'R')]:
    sh,el,wr=arms[L];hip,kn,an=legs[L]
    piston(sh,(0,-.3,-.41),el,(0,-.64,-.44),.075)
    piston(hip,(0,-.52,-.39),kn,(0,-.70,-.65),.085)
    piston(kn,(s*.32,-1.0,.51),an,(s*.32,.06,.64),.06)
    piston(spine,(s*.93,1.54,-.43),sh,(s*.30,-.40,-.40),.065)
    piston(pelvis,(s*.67,.14,-.47),spine,(s*.75,.62,-.50),.062)

# One primitive per joint/material, while attachment empties remain explicit.
for (parent,material),objs in list(buckets.items()):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=parent+'.geometry'+('' if material=='basilisk_atlas' else '.'+material)
    # bake local object transform, keep parent-relative vertices. Origin at parent.
    local=ob.matrix_local.copy()
    for vert in ob.data.vertices:vert.co=local@vert.co
    ob.matrix_basis=Matrix.Identity(4)
    ob.select_set(False)

# Recess the head shell inside the armored collar; neck pivot stays exact.
for ob in bpy.data.objects:
    if ob.type=='MESH' and ob.parent==neck:
        for vert in ob.data.vertices:vert.co.z-=.15;vert.co.y+=.08

# Clearance relief is derived from the unchanged production Cleaver/Piledriver poses.
# The small convex cutters carve the inner shoulder/chest faces only.
profile=json.load(open(os.path.join(OUT,'clearance_profile.json')))
def relief(target_name,points):
    target=bpy.data.objects[target_name+'.geometry']
    center=sum(points,Vector())/len(points);points=[center+(p-center)*1.018 for p in points]
    mesh=bpy.data.meshes.new('sweep clearance cutter');bm=bmesh.new()
    for p in points:bm.verts.new(p)
    bm.verts.ensure_lookup_table();bmesh.ops.convex_hull(bm,input=list(bm.verts));bm.to_mesh(mesh);bm.free()
    cutter=bpy.data.objects.new('temporary clearance volume',mesh);bpy.context.collection.objects.link(cutter);cutter.parent=target.parent;cutter.data.materials.append(mat)
    uv=mesh.uv_layers.new(name='AtlasUV')
    for item in uv.data:item.uv=(.625,.875)
    bpy.context.view_layer.objects.active=target;target.select_set(True)
    mod=target.modifiers.new('service sweep relief','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;mod.use_self=True
    bpy.ops.object.modifier_apply(modifier=mod.name);target.select_set(False);bpy.data.objects.remove(cutter,do_unlink=True)
M=Matrix(profile['elbow_to_pauldron'])
points=[]
for vert in bpy.data.objects['elbow.L.geometry'].data.vertices:
    q=C.transposed()@vert.co;pos=M@Vector((q.x,q.y,q.z,1));points.append(v(pos[:3]))
relief('pauldron.L',points)
for target,vertices in profile['weapon_cutters'].items():relief(target,[v(p) for p in vertices])

root['asset']='BASILISK MARK II / IRON VOW';root['license']='Original procedural geometry and textures';root['units']='metres';root['forward']='+Z';root['sole_y_relative_ankle']=-.30
bpy.context.view_layer.update()
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
for o in bpy.data.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'basilisk.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_image_format='AUTO',export_materials='EXPORT',export_normals=True,export_texcoords=True)
exported=open(os.path.join(OUT,'basilisk.glb'),'rb').read();gltf=json.loads(exported[20:20+struct.unpack_from('<I',exported,12)[0]]);triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
stats={'triangles':triangles,'glb_bytes':os.path.getsize(os.path.join(OUT,'basilisk.glb')),'rig':joint_contract,'pistons':pairs,'materials':[m.name for m in [mat,visor,stackmat]],'paintable_tiles':[0,7,12,15],'pods':{'L':[1.7,2.77,.25],'R':[-1.7,2.77,.25]}}
assert triangles<=60000, triangles
assert stats['glb_bytes']<=4000000, stats['glb_bytes']
with open(os.path.join(OUT,'basilisk_contract.json'),'w') as f:json.dump(stats,f,indent=2)

# Studio preview and editable native source; lights are excluded from shipped GLB.
def aim(o,point):o.rotation_euler=(v(point)-o.location).to_track_quat('-Z','Y').to_euler()
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.10,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,pos,power,size,col in [('key',(5,10,8),2100,6,(1,.94,.85)),('fill',(-6,7,3),1300,6,(.65,.78,1)),('rim',(2,8,-5),1800,5,(1,.80,.58))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=col;ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=v(pos);aim(ob,(0,3.2,0))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Preview camera';cam.location=v((10,8.0,16));aim(cam,(0,3.55,0));cam.data.type='ORTHO';cam.data.ortho_scale=8.2;bpy.context.scene.camera=cam
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview ground';floor.location.z=.095
fm=bpy.data.materials.new('Preview only ground');fm.diffuse_color=(.055,.065,.075,1);floor.data.materials.append(fm)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'basilisk_preview.png')
scene.view_settings.view_transform='AgX'
for im in bpy.data.images:
    if im.filepath:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'basilisk.blend'))
bpy.ops.render.render(write_still=True)
print('BASILISK_STATS',json.dumps(stats))
