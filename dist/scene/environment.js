/* Environment and cover helpers ported from mercenary-command.html; board dimensions follow game state. */
(function(root){
'use strict';
root.IronVowSceneKit=function(renderer){
const T=root.THREE,PI=Math.PI,C=h=>new T.Color(h).convertSRGBToLinear();
let TILE=7.4;
let seed=97,width=10,depth=10;
const rnd=(a,b)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return a+(b-a)*seed/4294967296;};
const tileW=(x,z)=>new T.Vector3((x-(width-1)/2)*TILE,0,(z-(depth-1)/2)*TILE);
const pmrem=new T.PMREMGenerator(renderer);
const envTargets=[];
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=4;return t;}
const srgb=t=>{t.encoding=T.sRGBEncoding;return t;};
const hazardTex=srgb(tex(64,64,(g,w,h)=>{g.fillStyle='#d6a22c';g.fillRect(0,0,w,h);g.fillStyle='#1c1a16';for(let x=-64;x<=128;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x+16,0);g.lineTo(x+16-64,64);g.lineTo(x-64,64);g.closePath();g.fill();}},[1,1]));
function stencilTex(text,bg,fg,w=256,h=128,size=64){return srgb(tex(w,h,g=>{g.fillStyle=bg;g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(0,0,0,${rnd(0,.12)})`;g.fillRect(rnd(0,w),rnd(0,h),2,2);}g.fillStyle=fg;g.font=`700 ${size}px Barlow,"Arial Narrow",Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+4);}));}
function wearTex(base,rep){return srgb(tex(256,256,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=rnd(-28,28);g.fillStyle=v>0?`rgba(255,255,255,${v/280})`:`rgba(0,0,0,${-v/200})`;g.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(1,3));}for(let i=0;i<10;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(10,50),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(20,16,10,.25)');gr.addColorStop(1,'rgba(20,16,10,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}for(let i=0;i<22;i++){g.fillStyle='rgba(15,12,8,.12)';g.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(20,70));}},rep));}
function imgTex(key,rep,fallback){
 const loader=new T.TextureLoader(),url=k=>root.IRON_VOW_INLINE_ASSETS?.[k]||k;
 const t=loader.load(url(key),undefined,undefined,fallback?()=>new T.ImageLoader().load(url(fallback),image=>{t.image=image;t.needsUpdate=true;}):undefined);t.encoding=T.sRGBEncoding;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=8;return t;}
const geoCache=new Map();
function bevelGeo(w,h,d,s0){const key=[w,h,d,s0].map(v=>(v||0).toFixed(3)).join('|');if(geoCache.has(key))return geoCache.get(key);
  const s=Math.min(s0||.06,w*.2,h*.2,d*.2),hw=w/2-s,hh=h/2-s,sh=new T.Shape();sh.moveTo(-hw,-hh);sh.lineTo(hw,-hh);sh.lineTo(hw,hh);sh.lineTo(-hw,hh);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,d-2*s),bevelEnabled:true,bevelThickness:s,bevelSize:s,bevelSegments:1,curveSegments:1});g.translate(0,0,-(d-2*s)/2);geoCache.set(key,g);return g;}
function mesh(p,geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,shadow=true){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o;}
const bx=(p,w,h,d,m,x,y,z,rx,ry,rz,sh)=>mesh(p,bevelGeo(w,h,d),m,x,y,z,rx,ry,rz,sh);
const cy=(p,r1,r2,h,m,x,y,z,rx,ry,rz,seg=14,sh)=>mesh(p,new T.CylinderGeometry(r1,r2,h,seg),m,x,y,z,rx,ry,rz,sh);
const MS=o=>new T.MeshStandardMaterial(o);
const MAT={
  olive:MS({color:C(0x5c6640),map:wearTex('#c9c9c9',[1,1]),roughness:.62,metalness:.35}),
  oliveDark:MS({color:C(0x444c30),map:wearTex('#c9c9c9',[1,1]),roughness:.66,metalness:.3}),
  graphite:MS({color:C(0x24292b),roughness:.45,metalness:.75}),
  steel:MS({color:C(0x8b9396),roughness:.28,metalness:.92}),
  rubber:MS({color:C(0x141617),roughness:.85,metalness:.05}),
  amber:MS({color:C(0xe0621a),roughness:.5,metalness:.2}),
  white:MS({color:C(0xd8d3c2),roughness:.6,metalness:.05}),
  concrete:MS({color:C(0x8a8780),map:wearTex('#d8d4cc',[1,1]),roughness:.9,metalness:.02}),
  hazard:MS({map:hazardTex,roughness:.7}),
  yellow:MS({color:C(0xc89322),roughness:.55,metalness:.45}),
  wall:MS({color:C(0x2d2f30),map:wearTex('#bdbdbd',[3,3]),roughness:.8,metalness:.35}),
  beacon:MS({color:0x110500,emissive:C(0xff8a1c),emissiveIntensity:2.5}),
  beaconRed:MS({color:0x110000,emissive:C(0xff2a1a),emissiveIntensity:2.5}),
  screen:MS({color:0x050a0c,emissive:C(0x4fd8e8),emissiveIntensity:1.6,roughness:.3}),
  rock:MS({color:C(0x626865),roughness:1,flatShading:true}),
  rockLight:MS({color:C(0x85877c),roughness:1,flatShading:true}),
  foliage:MS({color:C(0x344c3e),roughness:1,flatShading:true}),
  foliageLight:MS({color:C(0x49614c),roughness:1,flatShading:true}),
  bark:MS({color:C(0x594b3c),roughness:1})
};
function envFrom(cols,pm=pmrem){const s=new T.Scene();s.background=C(cols[0]);
  const add=(w,h,c,x,y,z,ry)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:C(c),side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry||0;s.add(m);};
  add(16,6,cols[1],0,10,-14);add(16,6,cols[2],14,8,0,-PI/2);add(12,4,cols[3],-14,6,4,PI/2);
  const fl=new T.Mesh(new T.PlaneGeometry(50,50),new T.MeshBasicMaterial({color:C(cols[4])}));fl.rotation.x=-PI/2;fl.position.y=-3;s.add(fl);
  const target=pm.fromScene(s,.04);envTargets.push(target);
  s.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});return target.texture;}
function jersey(p,m,len){const sh=new T.Shape();sh.moveTo(-.55,0);sh.lineTo(.55,0);sh.lineTo(.42,.35);sh.lineTo(.2,.55);sh.lineTo(.2,1.1);sh.lineTo(-.2,1.1);sh.lineTo(-.2,.55);sh.lineTo(-.42,.35);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:len,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1});g.translate(0,0,-len/2);return mesh(p,g,m);}
const PAL=[ // relay, corridor, frontier
  {bg:0x89807c,fog:[0x89807c,88,212],sun:[0xffd097,2.9],hemi:[0xcad9fa,0x9a6e49,.74],ground:0x7d6b58,wet:.42,env:[0x554e47,0xffcf91,0xb8c9ea,0x889bb2,0x573e30],dir:[-26,12,5],soil:0xa18c74,road:0x817c6e},
  {bg:0x756053,fog:[0x756053,84,209],sun:[0xffc18b,2.7],hemi:[0xd2d5e4,0x926e50,.67],ground:0x827362,wet:.75,env:[0x51443b,0xffc08a,0xb8c2d4,0x846a56,0x453629],dir:[-34,17,-8],soil:0x9b846c,road:0x777b74},
  {bg:0x62747a,fog:[0x62747a,80,206],sun:[0xc4dce0,1.9],hemi:[0xb0c6cf,0x66736a,.66],ground:0x67706f,wet:.5,env:[0x34434a,0xb5d7df,0x9eb3be,0x526a74,0x424b46],dir:[-24,23,23],soil:0x849188,road:0x7d8987}
];
function buildProps(s,ci){
  const g=new T.Group();g.name='theater-props';s.add(g);const H=Math.max(width,depth)*TILE/2;
  const rock=MS({color:C(ci===1?0x5a4c3f:0x434a4d),roughness:1,metalness:0,flatShading:true,map:wearTex('#bdbdbd',[1,1])});
  const outsideBoard=(x,z,clearance=7)=>{
    const edgeX=(width/2)*TILE+clearance,edgeZ=(depth/2)*TILE+clearance;
    if(Math.abs(x)<=edgeX&&Math.abs(z)<=edgeZ){
      const scaleX=Math.abs(x)>0?edgeX/Math.abs(x):Infinity,scaleZ=Math.abs(z)>0?edgeZ/Math.abs(z):Infinity;
      const scale=Math.min(scaleX,scaleZ);
      if(Number.isFinite(scale)){x*=scale*1.001;z*=scale*1.001;}
    }
    return [x,z];
  };
  const ring=(n,rad,fn)=>{for(let i=0;i<n;i++){const a=i/n*PI*2+rnd(-.1,.1),r=rad+rnd(0,10);const [x,z]=outsideBoard(Math.cos(a)*r,Math.sin(a)*r);fn(x,z,a,i);}};
  if(ci===0){ // karst relay: boulders, lattice tower, puddles
    ring(26,H+7,(x,z)=>{const geo=new T.DodecahedronGeometry(rnd(1.4,3.6),0);const pa=geo.attributes.position;for(let k=0;k<pa.count;k++)pa.setXYZ(k,pa.getX(k)*rnd(.85,1.15),pa.getY(k)*rnd(.8,1.1),pa.getZ(k)*rnd(.85,1.15));geo.computeVertexNormals();const m=mesh(g,geo,rock,x,rnd(.1,.6),z,rnd(0,3),rnd(0,3),0);m.scale.y=rnd(.45,.9);});
    const tw=new T.Group();tw.position.set(-H-9,0,-H-6);g.add(tw);
    for(const [x,z] of [[-1.6,-1.6],[1.6,-1.6],[1.6,1.6],[-1.6,1.6]])cy(tw,.12,.18,26,MAT.graphite,x*.55,13,z*.55,x*.012,0,-z*.012,6);
    for(let y=2;y<26;y+=3)for(const r of [0,PI/2,PI,PI*1.5]){const m=bx(tw,2.2-y*.04,.08,.08,MAT.graphite,0,y,0,0,r,0);m.position.x=Math.sin(r)*(1.55-y*.02);m.position.z=Math.cos(r)*(1.55-y*.02);}
    mesh(tw,new T.SphereGeometry(.25,10,8),MAT.beaconRed,0,26.5,0,0,0,0,false);cy(tw,.9,.9,.2,MAT.white,0,22,1.2,PI/2,0,0,16);
    for(let i=0;i<5;i++){bx(g,rnd(3,6),rnd(2,3),rnd(2,3),MAT.concrete,rnd(-1,1)*H,1,-H-rnd(6,14),0,rnd(-.3,.3),0);}
  }else if(ci===1){ // refinery corridor: pipes, tanks
    const pipeM=MS({color:C(0x8a7a64),roughness:.5,metalness:.7,map:wearTex('#cfcfcf',[4,1])});
    for(const z of [-H-5,-H-7.5]){cy(g,.9,.9,90,pipeM,0,1.6,z,0,0,PI/2,16);for(let x=-40;x<=40;x+=8)bx(g,.5,1.4,2.6,MAT.graphite,x,.7,z);}
    for(const [x,z,r,h] of [[-H-12,-H+4,6,10],[-H-12,-H+18,5,8],[H+12,-H-10,7,12],[H+14,6,5,9]]){cy(g,r,r,h,MAT.concrete,x,h/2,z,0,0,0,28);cy(g,r+.15,r+.15,.4,MAT.amber,x,h*.82,z,0,0,0,28,false);cy(g,r*.3,r*.3,1.2,MAT.graphite,x,h+.6,z,0,0,0,12);}
    for(let i=0;i<8;i++){const c=bx(g,6,2.6,2.6,[MAT.olive,MAT.oliveDark,MAT.yellow][i%3],H+rnd(4,10),1.3+(i%2)*2.6,rnd(-H,H),0,rnd(-.2,.2),0);}
    ring(12,H+9,(x,z)=>{const geo=new T.DodecahedronGeometry(rnd(1,2.2),0);mesh(g,geo,rock,x,.4,z,rnd(0,3),rnd(0,3),0);});
  }else{ // frontier outpost: walls, bunker, watch tower
    for(let i=-4;i<=4;i++){bx(g,TILE*1.2,3.2,1.1,MAT.concrete,i*TILE*1.25,1.6,-H-6);if(i%2)bx(g,TILE*1.2,.3,1.15,MAT.amber,i*TILE*1.25,3.1,-H-6,0,0,0,false);}
    for(let i=-3;i<=3;i++)bx(g,1.1,3.2,TILE*1.2,MAT.concrete,H+6,1.6,i*TILE*1.25);
    const tw=new T.Group();tw.position.set(H+7,0,-H-7);g.add(tw);for(const [x,z] of [[-1.5,-1.5],[1.5,-1.5],[1.5,1.5],[-1.5,1.5]])cy(tw,.18,.18,12,MAT.graphite,x,6,z,0,0,0,6);
    bx(tw,4.4,2.4,4.4,MAT.oliveDark,0,13,0);bx(tw,5,.3,5,MAT.graphite,0,14.4,0);mesh(tw,new T.SphereGeometry(.3,10,8),MAT.beaconRed,0,15,0,0,0,0,false);
    const sb=MS({color:C(0x7d7258),roughness:.95});for(let i=0;i<30;i++){const a=i/30*PI*2,[x,z]=outsideBoard(Math.cos(a)*(H+3.5),Math.sin(a)*(H+3.5),1);mesh(g,T.CapsuleGeometry?new T.CapsuleGeometry(.35,.6,4,8):new T.SphereGeometry(.5,8,6),sb,x,.35,z,0,a,PI/2);}
    ring(16,H+12,(x,z)=>{const geo=new T.DodecahedronGeometry(rnd(1.2,3),0);mesh(g,geo,rock,x,.5,z,rnd(0,3),rnd(0,3),0);});
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=o.position.length()<H+12;}});
}
// A single spruce has an irregular skirt of drooping boughs at each whorl.
// The same vertex-colored geometry serves tactical cover and the forest belts.
let spruceGeometry;
function spruce(){
 if(spruceGeometry)return spruceGeometry;
 const pos=[],colors=[];
 const tri=(a,b,c,tint)=>{pos.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(...tint);};
 const point=(angle,r,y)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
 for(let j=0;j<6;j++){
  const a=j*PI/3,b=(j+1)*PI/3;
  tri(point(a,.035,0),point(b,.035,0),[0,.92,0],[.16,.092,.045]);
 }
 for(let tier=0;tier<8;tier++){
  const y=.15+tier*.097,r=(1-y)*.34,count=9-tier%2;
  for(let j=0;j<count;j++){
   const a=j*PI*2/count+tier*2.4,b=a+PI*2/count,mid=(a+b)*.5;
   const tip=point(mid,r*(.85+.15*Math.sin(j*9+tier)),y-.04-.025*Math.cos(j+tier));
   const l=point(a,r*.5,y+.035),rt=point(b,r*.5,y+.035),c=[0,Math.min(1,y+.24),0];
   const green=.032+.005*tier+.009*Math.sin(j*12.2+tier);
   tri(l,c,tip,[green*.73,green,green*.48]);tri(tip,c,rt,[green*.85,green*1.12,green*.57]);
   tri(l,tip,rt,[green*.44,green*.62,green*.29]);
  }
 }
 spruceGeometry=new T.BufferGeometry();
 spruceGeometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 spruceGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 spruceGeometry.computeVertexNormals();spruceGeometry.computeBoundingSphere();return spruceGeometry;
}
let treeMaterial;
function needles(){
 return treeMaterial??=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide});
}
function buildLandscape(board,ci,rockMap){
 const landscape=new T.Group();landscape.name='theater-landscape';board.add(landscape);
 const hx=width*TILE/2,hz=depth*TILE/2,positions=[],colors=[],uvs=[];
 // Each massif follows an independent curved spine. Broad gaps between the
 // near slopes reveal the longer, cooler ridges on the far side of the valley.
 const massifs=[
  // Bearing, angular span, setback, summit height, depth.
  [-2.55,1.00,25,24,24],[-1.42,.89,17,21,27],[-.28,.63,32,13,22],
  [1.48,.48,40,7,21],[2.55,.71,23,18,25],
  [-2.04,1.47,57,42,40],[-.84,.94,66,34,35],[2.96,.91,67,30,37]
 ];
 const diagonal=Math.hypot(hx,hz);
 for(const [id,[bearing,span,setback,summit,depth]] of massifs.entries()){
  const columns=[],n=36,phase=id*1.94+ci*.63;
  for(let i=0;i<=n;i++){
   const t=i/n,a=bearing+(t-.5)*span,c=Math.cos(a),s=Math.sin(a);
   const envelope=Math.pow(Math.sin(PI*t),.84);
   const crag=.81+.22*Math.sin(t*11+phase)+.15*Math.sin(t*21-phase)+.09*Math.sin(t*49+phase);
   const height=envelope*summit*crag;
   const radius=diagonal+setback+6*Math.sin(t*6+phase)+3*Math.sin(t*13-phase);
   const row=[];
   for(const [j,[spread,h]] of [[0,-.08],[.14,.13],[.30,.36],[.35,.68],[.54,1],[.74,.63],[1,-.08]].entries()){
    const r=radius+depth*spread*(.49+.51*envelope)+Math.sin(t*21+j*.47+phase)*2.2;
    row.push([c*r,height*h-.36,s*r]);
   }
   columns.push(row);
  }
  const tones=[0x716e5c,0x64695b,0x767366,0xa39883,0xb3ac98,0x7c8374];
  for(let i=0;i<n;i++)for(let j=0;j<6;j++){
   const tint=C(tones[j]).multiplyScalar(.91+.12*Math.sin(i*.63+phase));
   if(id>=5)tint.lerp(C(0x889291),.40);
   const emit=(k,v)=>{const p=columns[k][v];positions.push(...p);colors.push(tint.r,tint.g,tint.b);uvs.push(k*.48,(p[1]+v)*.14);};
   emit(i,j);emit(i,j+1);emit(i+1,j);emit(i+1,j);emit(i,j+1);emit(i+1,j+1);
  }
 }
 const cliffs=new T.BufferGeometry();
 cliffs.setAttribute('position',new T.Float32BufferAttribute(positions,3));cliffs.setAttribute('color',new T.Float32BufferAttribute(colors,3));cliffs.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));cliffs.computeVertexNormals();
 const ridge=new T.Mesh(cliffs,new T.MeshStandardMaterial({map:rockMap,vertexColors:true,side:T.DoubleSide,roughness:.98}));ridge.name='mountain-escarpments';landscape.add(ridge);
 const placements=[];
 for(let belt=0;belt<18;belt++){
  const center=belt*PI/9+.14*Math.sin(3*belt+ci);
  for(let i=0;i<24;i++){
   const a=center+rnd(-.14,.14),c=Math.cos(a),s=Math.sin(a);
   const radius=Math.min(hx/Math.max(.001,Math.abs(c)),hz/Math.max(.001,Math.abs(s)));
   const clearance=rnd(3.9,16)+2*Math.cos(a*8+ci);
   const r=radius+clearance/Math.max(Math.abs(c),Math.abs(s));
   const height=rnd(2.6,7.1)*(c+s>.6?.72:1);
   placements.push([r*c,r*s,height,rnd(0,PI*2),rnd(.85,1.16)]);
  }
 }
 const forest=new T.InstancedMesh(spruce(),needles(),placements.length),dummy=new T.Object3D();
 placements.forEach(([x,z,h,a,w],i)=>{
  dummy.position.set(x,-.19,z);dummy.rotation.y=a;dummy.scale.set(h*w,h,h*w);dummy.updateMatrix();forest.setMatrixAt(i,dummy.matrix);
 });
 forest.name='perimeter-conifer-belts';forest.frustumCulled=false;forest.receiveShadow=true;landscape.add(forest);
}
function outcrop(x,z,strata){
 const positions=[],uvs=[],colors=[];
 // Tilted beds share one strike direction across the fractured slabs.
 for(const [cx,cz,length,depth,height] of [[-1.58,-.32,1.40,1.27,2.55],[-.02,.25,1.63,1.37,3.6],[1.66,-.14,1.42,1.1,2.85],[-.96,1.22,1.13,.62,1.20],[1.25,1.04,.97,.68,1.65]]){
  const phase=x*.78+z*.51+cx*2.1,sections=[];
  for(const [band,[y,radius]] of [[-.018,.94],[.21,1],[.29,.89],[.58,.86],[.64,.75],[.87,.74],[1,.52]].entries()){
   const row=[];
   for(let i=0;i<7;i++){
    const a=i*PI*2/7+.12*Math.sin(phase+i),r=radius*(.94+.06*Math.sin(i*5+phase));
    const dx=Math.cos(a)*r*length,dz=Math.sin(a)*r*depth;
    row.push([cx+dx+y*.18,Math.max(-.04,y*height+dx*.28+dz*.14+.08*Math.sin(phase+band+i)),cz+dz]);
   }
   sections.push(row);
  }
  const emit=(v,u,shade)=>{positions.push(...v);uvs.push(u*.16+phase,v[1]*.24);colors.push(shade*.84,shade*.85,shade*.78);};
  for(let band=0;band<6;band++){
   const shade=[.65,.48,.73,.53,.81,.71][band];
   for(let i=0;i<7;i++){
    const j=(i+1)%7,a=sections[band][i],b=sections[band][j],c=sections[band+1][i],d=sections[band+1][j];
    emit(a,i,shade);emit(c,i,shade);emit(b,i+1,shade);
    emit(b,i+1,shade);emit(c,i,shade);emit(d,i+1,shade);
   }
  }
  const cap=sections[6];
  for(let i=1;i<6;i++)for(const v of [cap[0],cap[i+1],cap[i]]){
   positions.push(...v);uvs.push(v[0]*.28,v[2]*.28);colors.push(.52,.57,.42);
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const stone=new T.Mesh(geo,new T.MeshStandardMaterial({map:strata,vertexColors:true,roughness:.96,side:T.DoubleSide}));
 stone.name='jointed-rock-outcrop';stone.castShadow=stone.receiveShadow=true;return stone;
}
function buildCover(key,type,strata){
  const [x,z]=key.split(',').map(Number),g=new T.Group();g.position.copy(tileW(x,z));
  // All shapes fit within 85% of a 7.4-unit cell, then scale with the chosen pitch.
  const types=['ridge-rock','relay-shield','cargo','transformer','conifer','bunker'];
  type=types.includes(type)?type:types[((x*31+z*17)%types.length+types.length)%types.length];
  g.userData.coverType=type;g.userData.blocking=true;
  const shape=new T.Group();shape.scale.setScalar(TILE/7.4);g.add(shape);
  const box=(w,h,d,m,x,y,z)=>bx(shape,w,h,d,m,x,y,z);
  if(type==='ridge-rock'){
    shape.add(outcrop(x,z,strata));
  }else if(type==='relay-shield'){
    box(5.7,2.75,.8,MAT.concrete,0,1.375,0);
    box(5.9,.3,1,MAT.graphite,0,2.85,0);
    for(const sx of [-2.25,2.25]){box(.65,2.1,2.6,MAT.concrete,sx,1.05,0);box(.7,.22,2.65,MAT.hazard,sx,.3,0);}
    box(1.1,.55,.08,MAT.amber,0,1.7,.44);
  }else if(type==='cargo'){
    box(5.7,2.85,3.5,MAT.olive,0,1.425,0);
    for(let xx=-2.45;xx<=2.46;xx+=.55)for(const zz of [-1.77,1.77])box(.12,2.45,.08,MAT.oliveDark,xx,1.43,zz);
    for(const xx of [-2.78,2.78])for(const zz of [-1.7,1.7])box(.22,2.95,.22,MAT.graphite,xx,1.48,zz);
    // Paired end doors, locking bars and corner castings give a human-scale reference.
    for(const zz of [-.72,.72]){box(.08,2.25,1.28,MAT.oliveDark,2.89,1.35,zz);box(.1,2.05,.09,MAT.steel,2.95,1.35,zz);}
    for(const yy of [.16,2.74])for(const zz of [-1.62,1.62])box(.32,.28,.3,MAT.yellow,2.83,yy,zz);
  }else if(type==='transformer'){
    box(5.6,.35,3.5,MAT.concrete,0,.175,0);
    box(4.4,2.45,2.5,MAT.graphite,0,1.55,0);
    box(4.65,.25,2.75,MAT.steel,0,2.9,0);
    for(const xx of [-1.25,1.25]){
      cy(shape,.28,.36,1.45,MAT.white,xx,3.75,0,0,0,0,10);
      for(const yy of [3.25,3.62,3.99,4.34])cy(shape,.48,.48,.11,MAT.white,xx,yy,0,0,0,0,10);
      cy(shape,.15,.15,.22,MAT.steel,xx,4.55,0,0,0,0,10);
    }
    box(.9,1.45,.09,MAT.oliveDark,-1.25,1.35,1.3);
    for(let yy=.8;yy<2.15;yy+=.27)box(1.15,.08,.09,MAT.steel,1.05,yy,1.3);
  }else if(type==='conifer'){
    for(const [tx,tz,h,angle] of [[-1.48,-.58,4.6,.8],[1.4,-.7,4.25,2],[.05,1.12,4.9,1.6],[-1.3,1.1,2.5,.2]]){
      const tree=new T.Mesh(spruce(),needles());tree.position.set(tx,0,tz);tree.rotation.y=angle;tree.scale.setScalar(h);
      tree.castShadow=tree.receiveShadow=true;shape.add(tree);
    }
  }else{
    box(5.7,2.3,3.5,MAT.concrete,0,1.15,0);
    box(5.9,.45,3.7,MAT.oliveDark,0,2.525,0);
    // Dark inset reads as an embrasure, with a small access door and vents.
    box(2.5,.34,.08,MAT.rubber,0,1.65,1.79);
    box(.72,1.38,.1,MAT.graphite,-2,1,1.8);
    for(let yy=.85;yy<=1.5;yy+=.2)box(.65,.07,.1,MAT.steel,1.95,yy,1.8);
  }
  g.rotation.y=((x+z)%2)?PI/2:0;
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function groundMaterial(P){
 const rough=tex(256,256,(g,w,h)=>{g.fillStyle='#e0e0e0';g.fillRect(0,0,w,h);for(let i=0;i<26;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(10,46),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(0,0,0,${P.wet})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}},[6,6]);
 return MS({color:C(P.ground),map:imgTex('assets/concrete.webp',[14,14]),roughnessMap:rough,roughness:1,metalness:.08,envMapIntensity:.7});
}
function fieldSurface(material,strata,theater){
 // World-space grit and wind ripples from the Warden field trial. Keep all
 // height/cover rules on the board geometry and fade the fine detail at range.
 material.extensions={derivatives:true};
 material.onBeforeCompile=shader=>{
  shader.uniforms.fieldStrata={value:strata};
  shader.uniforms.fieldMoss={value:[new T.Vector3(.47,.66,.30),new T.Vector3(.61,.59,.34),new T.Vector3(.42,.63,.47)][theater]};
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nvarying vec2 fieldGround;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nfieldGround=(modelMatrix*vec4(position,1.)).xz;');
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>',`#include <common>
    varying vec2 fieldGround;
    uniform sampler2D fieldStrata;
    uniform vec3 fieldMoss;
    float fieldHash(vec2 p){
     p=fract(p*vec2(123.34,345.45));
     return fract((p.x+p.y)*dot(p,p+34.345));
    }
    float fieldNoise(vec2 p){
     vec2 c=floor(p),f=fract(p);
     vec2 u=f*f*(3.-2.*f);
     return mix(mix(fieldHash(c),fieldHash(c+vec2(1.,0.)),u.x),
      mix(fieldHash(c+vec2(0.,1.)),fieldHash(c+vec2(1.)),u.x),u.y);
    }`)
   .replace('#include <map_fragment>', `
    vec2 p=fieldGround;
    float broad=fieldNoise(p*.055+vec2(fieldNoise(p*.031),fieldNoise(p*.037+7.))*1.65);
    float drift=broad*.62+fieldNoise(p*.138)*.27+fieldNoise(p*.47)*.11;
    // Two unaligned samples keep recognizable stones from repeating in rows.
    vec3 fine=mapTexelToLinear(texture2D(map,p*.137)).rgb;
    vec3 coarse=mapTexelToLinear(texture2D(map,mat2(.80,.60,-.60,.80)*p*.070+vec2(.31,.47))).rgb;
    vec3 soil=mix(fine,coarse,smoothstep(.24,.76,broad)*.63);
    vec3 stone=mapTexelToLinear(texture2D(fieldStrata,p*.113)).rgb;
    float road=smoothstep(.10,.89,vColor.r+(fieldNoise(p*.83)-.5)*.20);
    float exposed=smoothstep(.56,.81,drift+.20*vColor.g)*(1.-road);
    float grass=smoothstep(.28,.60,drift-.04*vColor.g)*(1.-road);
    vec3 earth=soil*mix(vec3(.84,.60,.39),fieldMoss*vec3(.76,1.0,.62),grass);
    vec3 gravel=vec3(dot(soil,vec3(.26,.58,.16)))*vec3(.94,.87,.71);
    diffuseColor.rgb*=mix(mix(earth,stone*vec3(.61,.59,.52),exposed*.76),gravel,road)*( .82+.35*broad);
    float microHeight=mix(dot(soil,vec3(.3,.5,.2)),stone.r,exposed)*.19;
   `)
   .replace('#include <color_fragment>','')
   .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.91,.99,grass)-.12*road-.09*exposed;')
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 groundX=dFdx(-vViewPosition),groundY=dFdy(-vViewPosition);
    vec3 acrossX=cross(groundY,normal),acrossY=cross(normal,groundX);
    float area=dot(groundX,acrossX);
    vec3 relief=dFdx(microHeight)*acrossX+dFdy(microHeight)*acrossY;
    normal=normalize(max(abs(area),1e-8)*normal-sign(area)*relief);`);
 };
 return material;
}
return {get TILE(){return TILE;},PAL,C,MAT,MS,mesh,bx,cy,bevelGeo,tileW,envFrom,groundMaterial,fieldSurface,imgTex,buildProps,buildLandscape,buildCover,random:rnd,setSize(w,d,tile=7.4){width=w;depth=d;TILE=tile;},dispose(){
 const seen=new Set();for(const m of Object.values(MAT)){for(const t of [m.map,m.normalMap,m.roughnessMap])if(t&&!seen.has(t)){seen.add(t);t.dispose();}m.dispose();}
 for(const geo of geoCache.values())geo.dispose();for(const target of envTargets)target.dispose();pmrem.dispose();
}};
};
})(window);
