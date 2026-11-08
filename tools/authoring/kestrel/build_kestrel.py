"""KESTREL / original reconnaissance walker. Blender 4.3+, reproducible.
Run: blender -b --python build_kestrel.py
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
colors=[(183,167,137),(48,53,53),(27,31,33),(116,122,120),
        (165,85,43),(215,207,183),(17,21,23),(199,187,159),
        (183,167,137),(49,55,55),(49,55,55),(44,51,49),
        (183,169,141),(98,100,73),(42,48,50),(165,157,128)]
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
 '-':[[(.05,.5),(.95,.5)]], '/':[[(0,1),(1,0)]], '.':[[(.5,.91),(.5,1)]]
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
        stencil(d,(252,223),'K-07',118,(43,48,48),424,.082)
        d.rectangle((66,410,433,419),fill=(54,58,56));stencil(d,(252,452),'KESTREL / RECON',27,(54,58,56))
    if i==9:
        for px in range(-600,1100,145):d.polygon([(px,0),(px+65,0),(px+577,512),(px+512,512)],fill=(216,218,196))
    if i==10:
        stencil(d,(256,220),'IRON VOW',64,(217,220,197))
        stencil(d,(256,300),'RECON / 07',30,(190,199,168))
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
base.save(os.path.join(OUT,'kestrel_basecolor.jpg'),quality=91,subsampling=0,optimize=True)
orm.save(os.path.join(OUT,'kestrel_orm.png'),optimize=True)
h=np.array(height.filter(ImageFilter.GaussianBlur(.65)),dtype=float)/255
dy,dx=np.gradient(h);norm=np.stack([-dx*5,dy*5,np.ones_like(h)],axis=2);norm/=np.linalg.norm(norm,axis=2,keepdims=True)
Image.fromarray(np.uint8(np.clip(norm*.5+.5,0,1)*255)).save(os.path.join(OUT,'kestrel_normal.png'),optimize=True)

mat=bpy.data.materials.new('warden_atlas');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
def texture(filename,noncolor=False):
    t=nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(os.path.join(OUT,filename));t.image.colorspace_settings.name='Non-Color' if noncolor else 'sRGB';return t
bc=texture('kestrel_basecolor.jpg');links.new(bc.outputs['Color'],p.inputs['Base Color'])
ot=texture('kestrel_orm.png',True);sep=nodes.new('ShaderNodeSeparateColor');links.new(ot.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
# glTF recognizes this named group as the AO texture channel.
g=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');g.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');gn=nodes.new('ShaderNodeGroup');gn.node_tree=g;links.new(sep.outputs['Red'],gn.inputs['Occlusion'])
nt=texture('kestrel_normal.png',True);nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.24;links.new(nt.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
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
        mod=o.modifiers.new('machined chamfer','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
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

# Kestrel: light modular scout armor on a narrow, visible mechanical chassis.
loft(pelvis,[(-.32,.56,.32,-.34),(.10,.65,.39,-.39),(.22,.49,.30,-.31)],2,.025)
cyl(pelvis,.20,1.43,(0,-.08,0),2,(1,0,0),16)
for side in [1,-1]:
    panel_outline(pelvis,[(side*.06,.01),(side*.48,-.04),(side*.51,-.42),(side*.27,-.61),(side*.08,-.42)],.48,0,.10,.11)
    panel_outline(pelvis,[(side*.60,.06),(side*.80,-.05),(side*.83,-.52),(side*.65,-.63)],.13,1,.15,-.10)
    fasteners(pelvis,[(side*.16,-.14,.49),(side*.39,-.17,.49)])
cyl(spine,.38,.25,(0,.11,0),2,vertices=20)
for y in [.22,.34,.46]:cyl(spine,.33,.055,(0,y,0),3,vertices=16)

# Compact triangular thorax, twin floating clavicles and a separate serial plate.
loft(spine,[(.43,.49,.28,-.31),(.79,.78,.49,-.53),(1.43,.89,.52,-.56),(1.91,.72,.10,-.50)],1,.03)
for side in [1,-1]:
    panel_outline(spine,[(side*.13,.73),(side*.68,.78),(side*.87,1.17),(side*.72,1.76),(side*.49,1.91),(side*.30,1.46)],.83,0,.13,-.17)
    panel_outline(spine,[(side*.42,1.30),(side*.70,1.34),(side*.61,1.69),(side*.45,1.78)],.87,7,.055,-.17)
    fasteners(spine,[(side*.71,1.14,.65),(side*.53,1.67,.59)])
    box(spine,(.22,.075,.09),(side*.66,.99,.64),2,.009)
    for y in [.91,1.06,1.21]:box(spine,(.045,.05,.24),(side*.89,y,-.04),2,.006)
panel_outline(spine,[(-.33,.63),(.34,.63),(.45,.96),(.30,1.29),(-.29,1.27),(-.45,.95)],.86,7,.18,-.07)
panel_outline(spine,[(.42,.89),(.85,.94),(.85,1.34),(.43,1.38)],.86,8,.07,-.09)
box(spine,(.31,.065,.03),(0,1.15,.80),2,.006)
fasteners(spine,[(-.26,1.18,.79),(.28,.77,.815),(-.30,.78,.815),(.49,1.3,.76),(.78,1.0,.785)])
for side in [1,-1]:
    hose(spine,[(side*.66,.77,.12),(side*.58,.52,.38),(side*.40,.36,.31)],.038,3)

# Low heat exchangers replace Warden's heavy stacks. Original stack anchors remain.
loft(spine,[(.83,.57,-.49,-.96),(1.57,.65,-.47,-1.02),(1.91,.48,-.43,-.85)],2,.025)
box(spine,(.90,.50,.095),(0,1.30,-1.05),11,.014)
for side in [1,-1]:
    ring(spine,.17,.115,.37,(side*.38,1.98,-.75),1)
    ring(spine,.187,.115,.07,(side*.38,2.16,-.75),3)
    cyl(spine,.11,.012,(side*.38,1.99,-.75),2,material=stackmat)
    empty('stackTop.'+('L' if side>0 else 'R'),spine,(side*.38,2.20,-.75),False)
    hose(spine,[(side*.57,1.65,-.77),(side*.91,1.83,-.65),(side*1.31,1.62,-.38)],.046,6)

# Asymmetric recon sensor, a protected short mast and whip antenna.
cyl(spine,.10,.27,(.66,1.96,-.56),3,vertices=12)
box(spine,(.58,.27,.31),(.66,2.17,-.53),1,.045)
box(spine,(.54,.21,.055),(.66,2.17,-.345),7,.02)
for xx,rr in [(.52,.07),(.74,.045)]:
    cyl(spine,rr,.075,(xx,2.17,-.30),2,(0,0,1),16)
    cyl(spine,rr*.62,.012,(xx,2.17,-.257),0,(0,0,1),16,material=visor)
box(spine,(.14,.13,.13),(.88,2.17,-.28),4,.012)
cyl(spine,.055,.28,(-.63,2.03,-.65),1,vertices=12)
cyl(spine,.022,.73,(-.63,2.48,-.65),3,vertices=8)
cyl(spine,.036,.10,(-.63,2.11,-.65),4,vertices=10)
box(spine,(.29,.22,.26),(-.40,1.97,-.51),7,.025)
handle(spine,(-.48,1.98,-.63),(-.27,1.98,-.63),.027)

# Long, low optical head with a projecting scout brow and an inset amber slit.
cyl(neck,.17,.18,(0,-.09,-.06),2,vertices=16)
loft(neck,[(-.18,.27,.38,-.36),(.04,.34,.47,-.39),(.25,.27,.22,-.30)],1,.02)
panel_outline(neck,[(-.37,.11),(.37,.11),(.27,.30),(.05,.38),(-.25,.31)],.50,0,.13,-.75)
box(neck,(.58,.135,.06),(0,.015,.47),6,.012)
box(neck,(.43,.05,.022),(0,.025,.510),0,.007,material=visor)
panel_outline(neck,[(-.26,-.18),(.24,-.18),(.29,-.075),(-.29,-.075)],.40,7,.095,.07)
box(neck,(.13,.13,.10),(.37,.025,.12),7,.016)
cyl(neck,.056,.035,(.44,.025,.13),2,(1,0,0),12)
fasteners(neck,[(-.25,.21,.35),(.23,.21,.35)])

arms={};legs={}
for side,L in [(1,'L'),(-1,'R')]:
    sh=empty('shoulder.'+L,spine,(side*1.4,1.6,0));el=empty('elbow.'+L,sh,(0,-1.1,0));wr=empty('wrist.'+L,el,(0,-1.08,0));empty('socket.'+L,wr,(0,-.22,0))
    paul=empty('pauldron.'+L,spine,(side*1.4,1.6,0),False)
    # Split tapered vanes protect the actuator without a heavy shoulder cap.
    outline=[(-.16,-.22),(.32,-.42),(.60,-.18),(.56,.44),(.25,.64),(-.13,.50)]
    panel_outline(paul,[(side*x,y) for x,y in outline],.35,0,.13,-.55)
    panel_outline(paul,[(side*.37,-.48),(side*.63,-.63),(side*.73,-.26),(side*.63,.25),(side*.50,.38)],.12,7,.14,-.25)
    crown=loft(paul,[(.34,.35,.04,-.51),(.53,.31,-.04,-.55),(.62,.20,-.18,-.39)],1,.024);crown.location.x=side*.20
    for x,y in [(-.08,.32),(.39,.34),(.27,-.24)]:bolt(paul,(side*x,y,.363-.55*y),r=.025)
    # Minimal recon chevrons, mirrored only in placement.
    for xx in [.14,.29]:box(paul,(.065,.25,.014),(side*xx,.04,.342),1,.004,rot=(.50,0,-.25))
    box(paul,(.075,.10,.02),(side*.42,-.14,.43),4,.005,rot=(.5,0,0))
    handle(paul,(side*.04,.55,-.36),(side*.29,.60,-.36),.026)
    # Shoulder actuator and a tapered humeral shell expose steel at the elbow.
    cyl(sh,.36,.68,(0,0,0),2,(1,0,0),20);cyl(sh,.26,.75,(0,0,0),3,(1,0,0),16)
    for x in [-.33,.33]:cyl(sh,.30,.06,(x,0,0),1,(1,0,0),16)
    loft(sh,[(-.90,.20,.23,-.22),(-.72,.31,.32,-.32),(-.20,.30,.31,-.31),(-.07,.24,.19,-.24)],2,.025)
    panel_outline(sh,[(-.32,-.22),(.30,-.18),(.28,-.65),(.13,-.81),(-.27,-.74)],.40,0,.12,-.05)
    fasteners(sh,[(-.22,-.33,.43),(.19,-.62,.435)])
    # Forearm is a faceted gauntlet with an inset service plate and a dark cuff.
    cyl(el,.29,.75,(0,0,0),2,(1,0,0),20);cyl(el,.205,.80,(0,0,0),3,(1,0,0),16)
    loft(el,[(-1.01,.23,.22,-.26),(-.83,.34,.35,-.37),(-.37,.39,.43,-.34),(-.12,.30,.24,-.24)],1,.025)
    panel_outline(el,[(-.30,-.27),(.32,-.24),(.41,-.62),(.25,-.88),(-.24,-.91),(-.38,-.62)],.50,0,.16,.10)
    panel_outline(el,[(-.19,-.35),(.21,-.33),(.25,-.60),(-.19,-.63)],.53,7,.045,.1)
    panel_outline(el,[(side*.29,-.23),(side*.45,-.40),(side*.41,-.82),(side*.25,-.91)],.10,0,.29,0)
    fasteners(el,[(-.26,-.40,.475),(.27,-.43,.478),(-.19,-.79,.438),(.20,-.78,.44)])
    box(el,(.22,.055,.03),(0,-.38,.537),2,.006)
    box(el,(.09,.12,.025),(side*.29,-.67,.45),4,.006)
    cyl(wr,.20,.19,(0,-.06,0),3,vertices=16)
    box(wr,(.49,.30,.46),(0,-.20,0),2,.025)
    for xx in [-.17,0,.17]:
        box(wr,(.14,.23,.17),(xx,-.36,.19),1,.02,rot=(.12,0,0));box(wr,(.13,.11,.16),(xx,-.46,.12),2,.015)
    box(wr,(.14,.24,.19),(-side*.27,-.23,.10),1,.02,rot=(0,0,-side*.25))
    arms[L]=(sh,el,wr)
    hip=empty('hip.'+L,pelvis,(side*.62,-.1,0));kn=empty('knee.'+L,hip,(0,-1.45,0));an=empty('ankle.'+L,kn,(0,-1.55,0));legs[L]=(hip,kn,an)
    # Wide thighs taper into a visible circular knee bearing.
    cyl(hip,.31,.70,(0,0,0),2,(1,0,0),20)
    loft(hip,[(-1.20,.25,.27,-.27),(-.91,.43,.39,-.35),(-.30,.45,.42,-.37),(-.08,.31,.27,-.28)],2,.025)
    panel_outline(hip,[(-.37,-.17),(.33,-.13),(.48,-.62),(.34,-1.03),(.12,-1.16),(-.34,-1.04),(-.46,-.65)],.55,0,.20,.06)
    panel_outline(hip,[(-.24,-.43),(.28,-.39),(.30,-.72),(-.26,-.74)],.59,7,.045,.06)
    panel_outline(hip,[(side*.34,-.18),(side*.58,-.32),(side*.61,-.92),(side*.32,-1.10)],.06,1,.34,-.02)
    fasteners(hip,[(-.29,-.31,.57),(.26,-.30,.57),(-.25,-.94,.51),(.25,-.94,.51)])
    box(hip,(.30,.055,.025),(0,-.57,.605),2,.004)
    cyl(kn,.29,.76,(0,0,0),2,(1,0,0),20);cyl(kn,.19,.82,(0,0,0),3,(1,0,0),16)
    # Offset knee shield, narrow shin rails, and prominent external boot pistons.
    panel_outline(kn,[(-.32,.26),(.26,.29),(.43,-.03),(.24,-.43),(-.19,-.48),(-.43,-.16)],.55,0,.20,-.22)
    fasteners(kn,[(-.22,.16,.535),(.20,.16,.535)])
    loft(kn,[(-1.43,.24,.17,-.24),(-1.13,.31,.21,-.33),(-.50,.28,.16,-.28),(-.28,.22,.17,-.21)],2,.018)
    for xx in [-.20,.20]:
        cyl(kn,.075,.78,(xx,-.91,.31),3,vertices=12)
        cyl(kn,.108,.30,(xx,-1.19,.31),2,vertices=12)
        cyl(kn,.105,.06,(xx,-.50,.31),1,vertices=12)
    box(kn,(.15,.78,.13),(0,-.89,.21),1,.014)
    for yy in [-.60,-.77,-.94,-1.11]:box(kn,(.13,.055,.15),(0,yy,.29),2,.006)
    panel_outline(kn,[(side*.23,-.44),(side*.49,-.35),(side*.60,-.77),(side*.41,-1.11),(side*.25,-1.08)],.12,1,.29,.04)
    hose(kn,[(side*.32,-.29,-.32),(side*.55,-.49,-.42),(side*.58,-1.04,-.39),(side*.30,-1.29,-.21)],.063,6)
    hose(kn,[(side*.23,-.36,-.36),(side*.42,-.56,-.50),(side*.45,-1.11,-.46),(side*.24,-1.33,-.24)],.047,3)
    # Compact ankle hinge, split ceramic toes and narrow heel.
    cyl(an,.225,.65,(0,0,0),2,(1,0,0),16)
    box(an,(.88,.10,1.49),(0,-.25,.20),6,.018)
    loft(an,[(-.20,.40,.68,-.48),(.05,.36,.60,-.42),(.20,.27,.34,-.26)],1,.025)
    panel_outline(an,[(-.28,.37),(.28,.38),(.36,.12),(.21,.02),(-.29,.05),(-.35,.18)],.38,0,.12,-.18)
    fasteners(an,[(-.21,.25,.346),(.19,.25,.346)])
    for toe in [-1,1]:
        cap=loft(an,[(-.22,.185,1.10,.39),(-.04,.185,1.06,.39),(.14,.145,.73,.36)],0,.025);cap.location.x=toe*.23
        box(an,(.29,.05,.23),(toe*.23,.12,.59),7,.012,rot=(.26,0,0))
        box(an,(.25,.05,.24),(toe*.23,.035,.86),1,.012,rot=(.28,0,0))
        bolt(an,(toe*.23,.14,.58),(0,1,0),.024)
    box(an,(.48,.20,.36),(0,-.12,-.49),1,.025)

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
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=parent+'.geometry'+('' if material=='warden_atlas' else '.'+material)
    # bake local object transform, keep parent-relative vertices. Origin at parent.
    local=ob.matrix_local.copy()
    for vert in ob.data.vertices:vert.co=local@vert.co
    ob.matrix_basis=Matrix.Identity(4)
    ob.select_set(False)

# Recon envelopes remain thin while every animation pivot stays unmodified.
for ob in bpy.data.objects:
    if ob.type!='MESH' or not ob.parent:continue
    name=ob.parent.name
    if name.startswith(('shoulder.','elbow.','hip.','knee.')):
        for vertex in ob.data.vertices:vertex.co.x*=.78;vertex.co.y*=.80
    elif name.startswith('wrist.'):
        for vertex in ob.data.vertices:vertex.co.x*=.9;vertex.co.y*=.9

# The outer scout vane has a small inner relief for the unchanged Cleaver sweep.
# Matrix is the existing forearm-to-shoulder pose, authored here for reproducibility.
clearance_matrix=Matrix([[0.4954354717975629, -0.7798919123690637, -0.38250790620070885, 0.841266531966995], [0.3568627279344298, -0.21873118527831034, 0.9081881203792211, -0.6726524005641914], [-0.7919549776950222, -0.5864514247642932, 0.16994716736682353, 0.2231802851866873], [0.0, 0.0, 0.0, 1.0]])
points=[]
for vert in bpy.data.objects['elbow.L.geometry'].data.vertices:
    q=C.transposed()@vert.co;pt=clearance_matrix@Vector((q.x,q.y,q.z,1));points.append(v(pt[:3]))
center=sum(points,Vector())/len(points);points=[center+(p-center)*1.018 for p in points]
cut_mesh=bpy.data.meshes.new('recon vane clearance');bm=bmesh.new()
for p in points:bm.verts.new(p)
bm.verts.ensure_lookup_table();bmesh.ops.convex_hull(bm,input=list(bm.verts));bm.to_mesh(cut_mesh);bm.free()
cut=bpy.data.objects.new('temporary vane cutter',cut_mesh);bpy.context.collection.objects.link(cut)
target=bpy.data.objects['pauldron.L.geometry'];cut.parent=target.parent;cut_mesh.materials.append(mat)
uv=cut_mesh.uv_layers.new(name='AtlasUV')
for item in uv.data:item.uv=(.625,.875)
bpy.context.view_layer.objects.active=target;target.select_set(True)
mod=target.modifiers.new('forearm sweep relief','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;mod.use_self=True
bpy.ops.object.modifier_apply(modifier=mod.name);target.select_set(False);bpy.data.objects.remove(cut,do_unlink=True)

root['asset']='KESTREL RECON MARK II / IRON VOW';root['license']='Original procedural geometry and textures';root['units']='metres';root['forward']='+Z';root['sole_y_relative_ankle']=-.30
bpy.context.view_layer.update()
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
for o in bpy.data.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'kestrel.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_image_format='AUTO',export_materials='EXPORT',export_normals=True,export_texcoords=True)
exported=open(os.path.join(OUT,'kestrel.glb'),'rb').read();gltf=json.loads(exported[20:20+struct.unpack_from('<I',exported,12)[0]]);triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
stats={'triangles':triangles,'glb_bytes':os.path.getsize(os.path.join(OUT,'kestrel.glb')),'rig':joint_contract,'pistons':pairs,'materials':[m.name for m in [mat,visor,stackmat]]}
with open(os.path.join(OUT,'kestrel_contract.json'),'w') as f:json.dump(stats,f,indent=2)

# Studio preview and editable native source; lights are excluded from shipped GLB.
def aim(o,point):o.rotation_euler=(v(point)-o.location).to_track_quat('-Z','Y').to_euler()
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.10,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,pos,power,size,col in [('key',(5,10,8),2100,6,(1,.94,.85)),('fill',(-6,7,3),1300,6,(.65,.78,1)),('rim',(2,8,-5),1800,5,(1,.80,.58))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=col;ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=v(pos);aim(ob,(0,3.2,0))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Preview camera';cam.location=v((10,7.0,15));aim(cam,(0,3.2,0));cam.data.type='ORTHO';cam.data.ortho_scale=8.2;bpy.context.scene.camera=cam
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview ground';floor.location.z=.095
fm=bpy.data.materials.new('Preview only ground');fm.diffuse_color=(.055,.065,.075,1);floor.data.materials.append(fm)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'kestrel_preview.png')
scene.view_settings.view_transform='AgX'
for im in bpy.data.images:
    if im.filepath:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'kestrel.blend'))
bpy.ops.render.render(write_still=True)
print('KESTREL_STATS',json.dumps(stats))
