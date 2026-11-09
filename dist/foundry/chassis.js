/* Iron Vow chassis kit: three procedurally modelled hard-surface mechs and four weapons.
   Warden (assault, knee-forward brawler), Kestrel (recon, reverse-joint walker), Basilisk (support, squat heavy).
   Each build returns a rig contract used by the animation layer plus per-part mesh registries for damage states. */
(function(){
'use strict';
const T=THREE,PI=Math.PI,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const C=h=>new T.Color(h).convertSRGBToLinear();

/* ---------- deterministic noise for textures ---------- */
let sd=1234567;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
function canvasTex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(srgb)t.encoding=T.sRGBEncoding;return t;}
const SEAMS=[[0,0,512,0],[0,0,0,512],[0,292,512,292],[214,0,214,292],[396,292,396,512],[118,292,118,512],[214,150,512,150]];
const RIVETS=[];for(const [x1,y1,x2,y2] of SEAMS){const n=Math.round(Math.hypot(x2-x1,y2-y1)/46);for(let i=1;i<n;i++){const t=i/n;RIVETS.push([x1+(x2-x1)*t+(y1===y2?0:9),y1+(y2-y1)*t+(y1===y2?9:0)]);}}
const grime=canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#f2f2f2';g.fillRect(0,0,w,h);
  for(let i=0;i<46;i++){const x=R()*w,y=R()*h,r=12+R()*46,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(60,54,44,${.03+R()*.05})`);gr.addColorStop(1,'rgba(60,54,44,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
  for(let i=0;i<14000;i++){const v=R();g.fillStyle=v>.5?`rgba(255,255,255,${(v-.5)*.16})`:`rgba(28,24,18,${(.5-v)*.16})`;g.fillRect(R()*w,R()*h,1,1);}
  for(let i=0;i<60;i++){const x=R()*w,y=R()*h,l=30+R()*150,gr=g.createLinearGradient(0,y,0,y+l);gr.addColorStop(0,'rgba(36,30,22,.13)');gr.addColorStop(1,'rgba(36,30,22,0)');g.fillStyle=gr;g.fillRect(x,y,1+R()*2,l);}
  g.lineCap='round';for(const [x1,y1,x2,y2] of SEAMS){g.strokeStyle='rgba(20,18,15,.55)';g.lineWidth=2.4;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
    g.strokeStyle='rgba(255,250,235,.22)';g.lineWidth=1;g.beginPath();g.moveTo(x1+1.8,y1+1.8);g.lineTo(x2+1.8,y2+1.8);g.stroke();
    for(let k=0;k<6;k++){const t=R(),cx=x1+(x2-x1)*t,cy=y1+(y2-y1)*t;g.fillStyle='rgba(255,248,230,.35)';g.fillRect(cx-3+R()*6,cy-2,4+R()*10,1.4);}}
  for(const [x,y] of RIVETS){g.fillStyle='rgba(18,16,13,.55)';g.beginPath();g.arc(x,y,2.6,0,7);g.fill();g.fillStyle='rgba(255,250,235,.3)';g.beginPath();g.arc(x-.6,y-.6,1.1,0,7);g.fill();}
  g.lineWidth=1;for(let i=0;i<160;i++){g.strokeStyle=`rgba(255,248,230,${.1+R()*.22})`;const x=R()*w,y=R()*h,a=R()*PI,l=3+R()*12;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
});
const panelNormal=(()=>{const N=512,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,N,N);g.strokeStyle='#000';g.lineWidth=3;g.lineCap='round';for(const [x1,y1,x2,y2] of SEAMS){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
  for(const [x,y] of RIVETS){const gr=g.createRadialGradient(x,y,0,x,y,4);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(160,160,160,0)');g.fillStyle='#9a9a9a';g.beginPath();g.arc(x,y,4.4,0,7);g.fill();g.fillStyle=gr;g.beginPath();g.arc(x,y,4,0,7);g.fill();}
  g.filter='blur(1px)';g.drawImage(c,0,0);g.filter='none';
  const src=g.getImageData(0,0,N,N).data,out=g.createImageData(N,N),H=(x,y)=>src[(((y+N)%N)*N+((x+N)%N))*4]/255,k=2.2;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=(H(x+1,y)-H(x-1,y))*k,dy=(H(x,y+1)-H(x,y-1))*k,l=Math.hypot(dx,dy,1),i=(y*N+x)*4;out.data[i]=(-dx/l*.5+.5)*255;out.data[i+1]=(dy/l*.5+.5)*255;out.data[i+2]=(1/l*.5+.5)*255;out.data[i+3]=255;}
  g.putImageData(out,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;})();
const metalTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#e6e6e6';g.fillRect(0,0,w,h);for(let i=0;i<4000;i++){const v=R();g.fillStyle=`rgba(${v>.5?255:0},${v>.5?255:0},${v>.5?255:0},${Math.abs(v-.5)*.16})`;g.fillRect(R()*w,R()*h,1,1+R()*6);}for(let i=0;i<18;i++){const x=R()*w,y=R()*h,r=10+R()*40,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(40,30,20,.18)');gr.addColorStop(1,'rgba(40,30,20,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}});
const scorchMap=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#8a8580';g.fillRect(0,0,w,h);for(let i=0;i<40;i++){const x=R()*w,y=R()*h,r=20+R()*120,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(10,8,6,.7)');gr.addColorStop(1,'rgba(10,8,6,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
  for(let i=0;i<9000;i++){const v=R();g.fillStyle=`rgba(${v>.6?190:20},${v>.6?160:16},${v>.6?120:12},${R()*.25})`;g.fillRect(R()*w,R()*h,1+R()*2,1+R()*2);}
  g.lineWidth=1.4;for(let i=0;i<120;i++){g.strokeStyle=`rgba(225,220,205,${.2+R()*.4})`;const x=R()*w,y=R()*h,a=R()*PI,l=6+R()*30;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}});
function chip(g,w,h,n=60){g.globalCompositeOperation='destination-out';for(let i=0;i<n;i++){g.fillStyle=`rgba(0,0,0,${.4+R()*.6})`;g.beginPath();g.arc(R()*w,R()*h,1+R()*4,0,7);g.fill();}g.globalCompositeOperation='source-over';}
const decalCache=new Map();
const scarTex=seed=>decal('scar'+seed,(g,w,h)=>{let z=seed*9301+49297;const r=()=>(z=(z*9301+49297)%233280)/233280;
  for(let i=0;i<3;i++){const x=40+r()*176,y=40+r()*176,rr=30+r()*60,gr=g.createRadialGradient(x,y,0,x,y,rr);gr.addColorStop(0,'rgba(18,14,10,.75)');gr.addColorStop(.5,'rgba(30,24,18,.35)');gr.addColorStop(1,'rgba(30,24,18,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
  g.lineCap='round';for(let i=0;i<9;i++){const x=20+r()*200,y=20+r()*200,a=r()*.8-.4+(r()<.5?0:1.4),L=30+r()*110;g.strokeStyle=r()<.6?'rgba(205,200,190,.85)':'rgba(20,18,16,.8)';g.lineWidth=1+r()*3;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);g.stroke();}});
function decal(key,draw){if(!decalCache.has(key)){const t=canvasTex(256,256,(g,w,h)=>{draw(g,w,h);chip(g,w,h);});t.wrapS=t.wrapT=T.ClampToEdgeWrapping;decalCache.set(key,t);}return decalCache.get(key);}
const stripeTex=col=>decal('st'+col,(g,w,h)=>{g.fillStyle=col;for(const o of [40,120]){g.beginPath();g.moveTo(o,256);g.lineTo(o+56,256);g.lineTo(o+56+110,0);g.lineTo(o+110,0);g.closePath();g.fill();}});
const numTex=(txt,col)=>decal('n'+txt+col,(g,w,h)=>{g.fillStyle=col;g.font='700 150px Barlow,"Arial Narrow",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,128,138);});
const wingTex=col=>decal('w'+col,(g,w,h)=>{g.fillStyle=col;g.beginPath();g.moveTo(20,70);g.lineTo(128,150);g.lineTo(236,70);g.lineTo(206,128);g.lineTo(128,206);g.lineTo(50,128);g.closePath();g.fill();g.beginPath();g.moveTo(98,130);g.lineTo(128,156);g.lineTo(158,130);g.lineTo(148,178);g.lineTo(128,236);g.lineTo(108,178);g.closePath();g.fill();});
const clawTex=col=>decal('c'+col,(g,w,h)=>{g.fillStyle=col;for(let i=0;i<3;i++){const x=60+i*50;g.beginPath();g.moveTo(x,30);g.lineTo(x+26,30);g.lineTo(x+6,226);g.lineTo(x-8,226);g.closePath();g.fill();}});
const hazardTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#d9a52a';g.fillRect(0,0,w,h);g.fillStyle='#1d1b17';for(let x=-128;x<=256;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x+32,0);g.lineTo(x+32-128,128);g.lineTo(x-128,128);g.closePath();g.fill();}});
const ventTex=canvasTex(64,64,(g,w,h)=>{g.fillStyle='#202224';g.fillRect(0,0,w,h);for(let y=4;y<64;y+=10){g.fillStyle='#0b0c0d';g.fillRect(3,y,58,5);g.fillStyle='#3a3d40';g.fillRect(3,y+5,58,1.5);}},true);

/* ---------- materials ---------- */
const MS=o=>new T.MeshStandardMaterial(o);
const SH={
  frame:MS({color:C(0x2b2f32),map:metalTex,roughness:.48,metalness:.82,envMapIntensity:1}),
  joint:MS({color:C(0x1a1c1e),map:metalTex,roughness:.38,metalness:.9,envMapIntensity:1.1}),
  steel:MS({color:C(0x9aa2a6),roughness:.22,metalness:1,envMapIntensity:1.35}),
  rubber:MS({color:C(0x121314),roughness:.85,metalness:.05}),
  black:MS({color:C(0x0a0b0c),roughness:.7,metalness:.3}),
  vent:MS({map:ventTex,roughness:.6,metalness:.7}),
  glass:MS({color:C(0x0d1c22),roughness:.06,metalness:.9,envMapIntensity:2.2,emissive:C(0x0c2a30),emissiveIntensity:.6}),
  hazard:MS({map:hazardTex,roughness:.62,metalness:.2}),
  lamp:MS({color:0x111111,emissive:C(0xfff0d0),emissiveIntensity:2.2}),
  red:MS({color:0x110000,emissive:C(0xff2a1a),emissiveIntensity:2.6}),
  gold:MS({color:C(0xd9a62e),roughness:.32,metalness:.85,envMapIntensity:1.3})
};
const G2=()=>SH.gold;
const PAL={
  ally:[{p:0x4f5839,s:0x343a28,a:0xe0621a,deco:0xe8e2cf,eye:0xffa53a,num:'07'},
        {p:0x9a8b68,s:0x5c5446,a:0xe0621a,deco:0x2c2a26,eye:0x5fe0ff,num:'12'},
        {p:0x52606a,s:0x323c43,a:0xf0b030,deco:0xe8e2cf,eye:0xa6ff6a,num:'04'},
        {p:0xd9dcd8,s:0x2b4f9e,a:0xc8302a,deco:0xe8e2cf,eye:0x6dff9a,num:'01'},
        {p:0x474a51,s:0x1e1f23,a:0xc0283a,deco:0xe8e2cf,eye:0xff3a2a,num:'09'},
        {p:0x7a7556,s:0x45422f,a:0xe0621a,deco:0xe8e2cf,eye:0xffa53a,num:'22'}],
  enemy:[{p:0x4a4540,s:0x252628,a:0xc4352a,deco:0xc4352a,eye:0xff3424},
         {p:0x3b4249,s:0x202427,a:0xc4352a,deco:0xc4352a,eye:0xff3424},
         {p:0x5b4034,s:0x2b2421,a:0xcc4630,deco:0xd5d0c4,eye:0xff3424},
         {p:0x4b4f55,s:0x1f2124,a:0xc4352a,deco:0xc4352a,eye:0xff3424},
         {p:0x3a2626,s:0x151516,a:0xb12a2a,deco:0xc4352a,eye:0xff3424},
         {p:0x4d4a3e,s:0x2a2823,a:0xc4352a,deco:0xc4352a,eye:0xff3424}]
};
const matCache=new Map();
function paint(hex,rough=.58,metal=.34){const k='p'+hex+rough;if(matCache.has(k))return matCache.get(k);const c0=C(hex),lum=c0.r*.3+c0.g*.59+c0.b*.11,ns=lum>.45?.35:lum>.25?.6:.9;const m=MS({color:c0,map:grime,normalMap:panelNormal,normalScale:new T.Vector2(ns,ns),roughness:rough,metalness:metal,envMapIntensity:1.0});m.userData.paint=true;matCache.set(k,m);return m;}
function hazardMat(rep){const k='hz'+rep;if(matCache.has(k))return matCache.get(k);const t=hazardTex.clone();t.needsUpdate=true;t.repeat.set(rep,1);const m=MS({map:t,roughness:.62,metalness:.2});matCache.set(k,m);return m;}
function damagedOf(m){const k='dmg'+m.uuid;if(matCache.has(k))return matCache.get(k);const d=m.clone();d.map=scorchMap;d.color=m.color.clone().multiplyScalar(.62);d.roughness=.85;matCache.set(k,d);return d;}
function wreckOf(m){const k='wr'+m.uuid;if(matCache.has(k))return matCache.get(k);const d=m.clone();d.map=scorchMap;d.color=C(0x2a2622);d.roughness=.95;d.metalness=.2;if(d.emissive)d.emissive.setHex(0);matCache.set(k,d);return d;}

/* ---------- geometry kit ---------- */
const gc=new Map();
function prism(pts,depth,axis,bev){
  const b=Math.min(bev??.06,depth*.3);
  const key=axis+'|'+depth.toFixed(3)+'|'+b.toFixed(3)+'|'+pts.map(p=>p[0].toFixed(3)+','+p[1].toFixed(3)).join(';');
  if(gc.has(key))return gc.get(key);
  const sh=new T.Shape(pts.map(p=>new T.Vector2(p[0],p[1])));
  const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.002,depth-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelOffset:-b,bevelSegments:1,curveSegments:6});
  g.translate(0,0,-(depth-2*b)/2);if(axis==='x')g.rotateY(-PI/2);else if(axis==='y')g.rotateX(PI/2);
  gc.set(key,g);return g;
}
const rectPts=(w,h)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
const mir=(pts,s)=>pts.map(p=>[p[0]*s,p[1]]);
let B=null; // active build context
function reg(m,mat,o){m.castShadow=o.shadow!==false;m.receiveShadow=true;if(mat.userData&&mat.userData.paint&&B)B.parts[o.part||B.part].push({m,detach:!!o.detach});if(o.detach&&B&&!(mat.userData&&mat.userData.paint))B.parts[o.part||B.part].push({m,detach:true,np:true});return m;}
function place(m,p,x,y,z,rx,ry,rz){m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);p.add(m);return m;}
function P(p,mat,pts,depth,axis,x,y,z,rx,ry,rz,o={}){return reg(place(new T.Mesh(prism(pts,depth,axis,o.bev),mat),p,x,y,z,rx,ry,rz),mat,o);}
function S(p,mat,w,h,d,x,y,z,rx,ry,rz,o={}){return reg(place(new T.Mesh(prism(rectPts(w,h),d,'z',o.bev),mat),p,x,y,z,rx,ry,rz),mat,o);}
const cylCache=new Map();
function cylGeo(r1,r2,h,seg){const k=[r1,r2,h,seg].join('|');if(!cylCache.has(k))cylCache.set(k,new T.CylinderGeometry(r1,r2,h,seg));return cylCache.get(k);}
function Cy(p,mat,r1,r2,h,x,y,z,rx,ry,rz,seg=16,o={}){return reg(place(new T.Mesh(cylGeo(r1,r2,h,seg),mat),p,x,y,z,rx,ry,rz),mat,o);}
const CX=(p,mat,r,len,x,y,z,seg=16,o)=>Cy(p,mat,r,r,len,x,y,z,0,0,PI/2,seg,o);
const CZ=(p,mat,r,len,x,y,z,seg=16,o)=>Cy(p,mat,r,r,len,x,y,z,PI/2,0,0,seg,o);
const planeG=new T.PlaneGeometry(1,1);
function Dec(p,tex,w,h,x,y,z,rx,ry,rz,o={}){const k='d'+tex.uuid+(o.em||'');let m=matCache.get(k);if(!m){m=MS({map:tex,transparent:true,roughness:.8,metalness:0,polygonOffset:true,polygonOffsetFactor:-4,depthWrite:false});if(o.em){m.emissive=C(o.em);m.emissiveMap=tex;m.emissiveIntensity=1.6;}matCache.set(k,m);}
  const d=place(new T.Mesh(planeG,m),p,x,y,z,rx,ry,rz);d.scale.set(w,h,1);if(B&&o.detachWith)B.parts[o.detachWith].push({m:d,detach:true,np:true});return d;}
function bolts(p,pts,axis,r=.032){const g=cylGeo(r,r,.04,6);for(const [x,y,z] of pts){const b=new T.Mesh(g,SH.frame);b.position.set(x,y,z);if(axis==='x')b.rotation.z=PI/2;else if(axis==='z')b.rotation.x=PI/2;p.add(b);}}
function slats(p,w,n,step,x,y,z,axis='z',rot=0){for(let i=0;i<n;i++){const s=S(p,SH.black,axis==='z'?w:.03,.035,axis==='z'?.04:w,x,y-i*step,z,rot,axis==='x'?PI/2*0:0,0,{bev:0,shadow:false});}}
function tube(p,mat,pts,r,seg=20){const c=new T.CatmullRomCurve3(pts.map(q=>V3(...q)));const m=new T.Mesh(new T.TubeGeometry(c,seg,r,7,false),mat);m.castShadow=true;p.add(m);return c;}
function ribbedTube(p,pts,r){const c=tube(p,SH.rubber,pts,r,24);for(let i=1;i<6;i++){const q=c.getPointAt(i/6),tg=c.getTangentAt(i/6);const ring=new T.Mesh(cylGeo(r*1.35,r*1.35,.06,10),SH.frame);ring.position.copy(q);ring.quaternion.setFromUnitVectors(V3(0,1,0),tg);p.add(ring);}}
function piston(pa,a,pb,b,r){B.pistons.push({pa,a,pb,b,r});}
function lamp(p,mat,r,x,y,z){const m=new T.Mesh(new T.SphereGeometry(r,10,8),mat);m.position.set(x,y,z);p.add(m);return m;}

/* ---------- skeleton ---------- */
function J(name,parent,x,y,z){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function skeleton(D){
  const root=new T.Group(),pelvis=J('pelvis',root,0,D.py,0),spine=J('spine',pelvis,0,D.spY,0),neck=J('neck',spine,...D.neck);
  const arms={},legs=[];
  for(const s of [1,-1]){const L=s>0?'L':'R';const sh=J('shoulder.'+L,spine,s*D.shX,D.shY,D.shZ||0);const paul=new T.Group();paul.position.copy(sh.position);spine.add(paul);
    const el=J('elbow.'+L,sh,0,-D.up,0),wr=J('wrist.'+L,el,0,-D.fo,0),so=J('socket.'+L,wr,0,-(D.so||.26),0);arms[L]={sh,el,wr,so,paul};}
  if(D.quad){[[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz],i)=>{const L=(sx>0?'L':'R')+(sz>0?'F':'B'),mount=new T.Group();mount.position.set(sx*D.hipX,D.hipY,sz*D.hipZ);mount.rotation.y=Math.atan2(sx,sz);pelvis.add(mount);
      const hip=J('hip.'+L,mount,0,0,0),kn=J('knee.'+L,hip,0,-D.legA,0),an=J('ankle.'+L,kn,0,-D.legB,0),r=D.reach*Math.SQRT1_2;legs.push({hip,kn,an,restX:sx*(D.hipX+r),restZ:sz*(D.hipZ+r),side:L,phase:D.phases[i]});});}
  else for(const s of [1,-1]){const L=s>0?'L':'R';const hip=J('hip.'+L,pelvis,s*D.hipX,D.hipY??-.1,0),kn=J('knee.'+L,hip,0,-D.legA,0),an=J('ankle.'+L,kn,0,-D.legB,0);legs.push({hip,kn,an,restX:s*D.restX,restZ:s*D.restZ,side:L,phase:s>0?0:.5,toe:s*(D.toe||0)});}
  return {root,pelvis,spine,neck,arms,legs};
}


/* ---------- general 2-bone leg IK (biped or quad yaw mounts). t = foot target in rig-root space ---------- */
const _IM=new T.Matrix4(),_IQ=new T.Quaternion(),_IQ2=new T.Quaternion(),_IV=new T.Vector3(),_IE=new T.Euler();
function solveLeg(rig,D,leg,t,pitch){
  const p=rig.pelvis,hp=leg.hip.parent,A=D.legA,Bl=D.legB;
  p.updateMatrix();_IM.copy(p.matrix);_IQ.copy(p.quaternion);
  if(hp!==p){hp.updateMatrix();_IM.multiply(hp.matrix);_IQ.multiply(hp.quaternion);}
  _IV.copy(t).applyMatrix4(_IM.invert());
  const vx=_IV.x-leg.hip.position.x,vy=_IV.y-leg.hip.position.y,vz=_IV.z-leg.hip.position.z;
  const roll=Math.atan2(vx,-vy),L=Math.min(Math.hypot(vx,vy,vz),A+Bl-.001),phi=Math.atan2(vz,Math.hypot(vx,vy));
  const al=Math.acos(Math.max(-1,Math.min(1,(A*A+L*L-Bl*Bl)/(2*A*L)))),bend=PI-Math.acos(Math.max(-1,Math.min(1,(A*A+Bl*Bl-L*L)/(2*A*Bl))));
  if(D.reverse){leg.hip.rotation.set(-(phi-al),0,roll,'ZXY');leg.kn.rotation.set(-bend,0,0);}
  else{leg.hip.rotation.set(-(phi+al),0,roll,'ZXY');leg.kn.rotation.set(bend,0,0);}
  // roll (Z) is applied outside pitch (X): the angles above are only exact in ZXY order
  // keep the sole flat on the ground, aligned with its mount's yaw
  _IQ2.copy(_IQ).multiply(leg.hip.quaternion).multiply(leg.kn.quaternion).invert();
  if(hp!==p)_IQ2.multiply(hp.quaternion);
  if(leg.toe)_IQ2.multiply(_IQ.setFromEuler(_IE.set(0,leg.toe,0)));
  if(pitch)_IQ2.multiply(_IQ.setFromEuler(_IE.set(pitch,0,0)));
  leg.an.quaternion.copy(_IQ2);
}

/* ======================= WARDEN: assault brawler ======================= */
const DIMS=[
  {stance:.92,py:3.2,spY:.32,neck:[0,2.12,.42],shX:1.5,shY:1.78,up:1.1,fo:1.1,hipX:.84,legA:1.5,legB:1.55,ankleH:.36,restX:.74,restZ:.1,lift:.7,reverse:false,scale:1},
  {py:3.32,spY:.25,neck:[0,.95,.72],shX:1.14,shY:1.1,up:.98,fo:1.0,hipX:.5,legA:1.45,legB:1.72,ankleH:.3,restX:.54,restZ:.04,lift:.9,reverse:true,scale:.98},
  {stance:.86,py:2.68,spY:.36,neck:[0,1.86,.62],shX:1.86,shY:1.5,up:1.0,fo:1.0,hipX:1.04,legA:1.25,legB:1.3,ankleH:.42,restX:.96,restZ:.08,lift:.5,reverse:false,scale:1},
  {py:3.3,spY:.3,neck:[0,1.98,.18],shX:1.35,shY:1.62,up:1.05,fo:1.05,hipX:.68,legA:1.55,legB:1.6,ankleH:.34,restX:.6,restZ:.08,lift:.85,reverse:false,scale:1},
  {py:3.05,spY:.38,neck:[0,1.66,.7],shX:1.62,shY:1.55,up:1.08,fo:1.15,hipX:.8,legA:1.45,legB:1.5,ankleH:.34,restX:.76,restZ:.14,lift:.8,reverse:false,scale:1,duty:.6,stride:.8,walkDrop:.16,
   // Feet under the shoulders and pointed forward: no splayed, toes-out gait.
   stance:.62,toe:.03,sway:.1,
   // Predator carry: chest forward, chin down, a shoulder roll with each step.
   carry:{lean:.14,swagger:.07,chin:.08,supportYaw:-.4,supportIdle:false,
    gunUp:[-.35,-2.65,-.12],cross:[-.5,-.6,.9],bladeForward:[-1.25,.05,-.3,1.32],
    dual:[['gunUp'],['bladeForward'],['gunUp','bladeForward']]},
   // Duelist cut: high guard beside the head, then a diagonal downward stroke that ends at chest height.
   // The blade sits across the fist, so blade pitch = forearm pitch + 90deg - wrist: guard ~3.2 rad, contact ~1.22 rad.
   melee:{wind:{sx:-2.3,sz:-.3,el:-.6,wr:1.27,yaw:-.25,lean:-.1},hit:{sx:-1.3,sz:.1,el:-.12,wr:1.77,yaw:.28,lean:.2},offArm:-.3}},
  {quad:true,py:2.7,spY:.6,neck:[0,1.52716,1.15736],shX:1.86,shY:1.55,shZ:0,up:1.0,fo:1.05,so:.26,hipX:.95,hipY:-.05,hipZ:1.05,legA:1.55,legB:1.9,ankleH:.315,reach:1.45,lift:.55,reverse:false,scale:.8,phases:[.25,.75,0,.5],duty:.75,stride:.65,walkDrop:.14,sway:.05}
];
function warden(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,s,a,frame,joint,steel}=M,s2=M.s;
  /* pelvis */
  B.part='body';
  S(pelvis,frame,1.2,.55,.9,0,0,0);CX(pelvis,joint,.26,1.78,0,-.1,0,18);
  hipsWarden(pelvis,legs,M);
  /* torso */
  Cy(spine,joint,.46,.5,.36,0,.12,0,0,0,0,20);
  S(spine,s2,.92,.2,.32,0,.3,.36);S(spine,s2,.86,.2,.32,0,.52,.4);
  P(spine,p,[[-.72,.62],[.5,.62],[.85,.95],[.85,1.6],[.6,2.05],[-.62,2.08],[-.86,1.6],[-.82,.95]],2.15,'x',0,0,0,0,0,0,{bev:.07});
  P(spine,s2,[[.84,1.58],[.92,1.62],[.66,2.1],[.56,2.07]],1.9,'x');
  for(const x of [1,-1]){
    P(spine,p,mir([[.1,1.7],[1.0,1.66],[1.04,1.18],[.74,.96],[.16,1.02]],x),.13,'z',0,0,.9);
    bolts(spine,[[x*.9,1.58,.97],[x*.9,1.12,.97],[x*.22,1.62,.97]],'z');
    S(spine,SH.vent,.05,.55,.62,x*1.08,1.25,-.05,0,0,0,{bev:.01});
    S(spine,joint,.4,.42,.4,x*1.28,1.78,0);
  }
  S(spine,frame,.2,.6,.12,0,1.32,.9);slats(spine,.16,5,.1,0,1.53,.97);
  Dec(spine,stripeTex('#e9e3d0'),.5,.5,.6,1.33,.968,0,0,0,{detachWith:'body'});
  S(spine,M.a,.28,.12,.06,-.66,1.56,.97);
  Dec(spine,wingTex('#d9d2be'),.34,.34,-.58,1.25,.968);
  /* backpack + stacks */
  S(spine,s2,1.7,1.25,.65,0,1.4,-1.05);S(spine,frame,1.5,1.0,.16,0,1.35,-1.4);
  S(spine,SH.vent,1.2,.6,.03,0,1.32,-1.49,0,0,0,{bev:0});
  for(const x of [1,-1]){
    Cy(spine,s2,.3,.34,1.3,x*.52,2.35,-1.02,-.12,0,0,6);Cy(spine,M.a,.355,.355,.1,x*.52,2.5,-1.04,-.12,0,0,6);
    Cy(spine,joint,.25,.25,.08,x*.52,3.0,-1.1,-.12,0,0,14);const gl=Cy(spine,M.stack,.21,.21,.02,x*.52,3.045,-1.105,-.12,0,0,14,{shadow:false});
    const top=new T.Object3D();top.position.set(x*.52,3.1,-1.11);spine.add(top);B.stackTops.push(top);
    ribbedTube(spine,[[x*.85,1.95,-1.25],[x*1.2,2.3,-.95],[x*1.52,2.1,-.55],[x*1.5,1.86,-.24]],.075);
  }
  /* head = cockpit */
  B.part='pilot';
  Cy(neck,joint,.27,.3,.32,0,-.06,0,0,0,0,16);
  const hd=new T.Group();hd.scale.setScalar(1.22);hd.position.set(0,.04,.04);neck.add(hd);{const neck=hd;
  P(neck,p,[[-.42,-.08],[.36,-.1],[.58,.18],[.5,.48],[-.36,.56],[-.5,.25]],.98,'x',0,0,0,0,0,0,{bev:.05});
  P(neck,s2,[[.06,.4],[.6,.36],[.64,.5],[0,.62],[-.4,.6]],1.06,'x',0,0,0,0,0,0,{detach:true});
  S(neck,joint,.74,.17,.1,0,.22,.55);B.visor.push(S(neck,M.visor,.64,.06,.04,0,.23,.6,0,0,0,{bev:0,shadow:false}));
  P(neck,s2,[[.18,-.12],[.55,0],[.5,.12],[.18,.05]],.72,'x');
  for(const x of [1,-1]){CZ(neck,frame,.09,.2,x*.43,.12,.52,12);const l=CZ(neck,M.visor,.055,.02,x*.43,.12,.62,12,{shadow:false});B.visor.push(l);}
  Cy(neck,steel,.02,.022,.95,-.34,.95,-.25,0,0,0,6);S(neck,frame,.18,.1,.18,-.34,.52,-.25);B.beacons.push(lamp(neck,SH.red,.04,-.34,1.44,-.25));
  S(neck,frame,.16,.24,.3,.52,.28,-.18);}
  /* arms */
  for(const x of [1,-1]){const A=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    pauldron(A,x,M,{w:.9,top:.96,bot:-.12,d:1.34,style:'mil',dec:x>0?M.numTex:stripeTex('#e9e3d0'),decS:.56});
    S(A.paul,M.a,.06,.22,.2,x*.5,.78,.69,0,0,0,{bev:.01});
    CX(A.sh,joint,.3,.56,0,0,0,18);CX(A.sh,steel,.18,.62,0,0,0,12);
    S(A.sh,frame,.42,1.0,.46,0,-.55,0);
    P(A.sh,p,[[-.32,-.15],[.36,-.12],[.4,-.72],[.2,-.88],[-.3,-.8]],.66,'x');
    S(A.sh,s2,.06,.5,.5,x*.35,-.46,.02,0,0,0,{detach:true});
    piston(A.sh,[0,-.3,-.3],A.el,[0,-.48,-.4],.07);
    CX(A.el,joint,.27,.6,0,0,0,18);
    P(A.el,p,[[-.4,-.08],[.36,-.05],[.5,-.38],[.46,-.92],[-.36,-.98],[-.46,-.5]],.76,'x',0,0,0,0,0,0,{bev:.05});
    P(A.el,s2,[[.34,-.12],[.56,-.4],[.52,-.86],[.44,-.86],[.46,-.4],[.3,-.14]],.6,'x',0,0,0,0,0,0,{detach:true});
    S(A.el,M.a,.06,.12,.6,x*.385,-.3,0);S(A.el,SH.vent,.5,.45,.03,0,-.55,-.475,0,0,0,{bev:0});
    S(A.wr,frame,.46,.34,.5,0,-.16,0);S(A.wr,s2,.5,.16,.22,0,-.28,.24);
    for(const fx of [-.15,0,.15])S(A.wr,joint,.12,.26,.14,fx,-.43,.15,.4);
    S(A.wr,joint,.12,.24,.14,-x*.27,-.28,.12,0,0,-x*.4);
  }
  /* legs */
  B.part='legs';
  legs.forEach((L,i)=>{const x=i===0?1:-1;
    CX(L.hip,joint,.3,.56,0,0,0,18);S(L.hip,frame,.46,1.3,.5,0,-.72,0);
    P(L.hip,p,[[-.3,-.22],[.42,-.2],[.5,-.6],[.38,-1.2],[-.18,-1.22],[-.42,-.72]],.78,'x',0,0,0,0,0,0,{bev:.06});
    P(L.hip,s2,[[-.25,-.28],[.35,-.28],[.4,-.95],[-.15,-1.0]],.07,'x',x*.42,0,0,0,0,0,{detach:true,bev:.02});
    bolts(L.hip,[[x*.465,-.4,-.15],[x*.465,-.4,.25],[x*.465,-.85,.25]],'x');
    piston(L.hip,[0,-.55,-.3],L.kn,[0,-.42,-.5],.08);
    CX(L.kn,joint,.3,.68,0,0,0,18);CX(L.kn,steel,.2,.74,0,0,0,12);
    P(L.kn,s2,[[.18,.38],[.55,.15],[.62,-.25],[.3,-.38],[.15,0]],.7,'x',0,0,0,0,0,0,{detach:true});
    S(L.kn,M.a,.3,.08,.06,0,.18,.57,-.5);
    P(L.kn,p,[[-.42,-.12],[.32,-.2],[.52,-.55],[.46,-1.3],[-.3,-1.36],[-.5,-.75]],.84,'x',0,0,0,0,0,0,{bev:.06});
    P(L.kn,s2,[[.36,-.3],[.58,-.55],[.54,-1.2],[.44,-1.22],[.45,-.58]],.64,'x',0,0,0,0,0,0,{detach:true});
    Dec(L.kn,stripeTex('#e9e3d0'),.42,.5,0,-.88,.588,-.06,0,0,{detachWith:'legs'});
    S(L.kn,frame,.6,.9,.2,0,-.75,-.52);S(L.kn,SH.vent,.46,.6,.03,0,-.75,-.625,0,0,0,{bev:0});
    piston(L.kn,[x*.47,-.9,.3],L.an,[x*.47,.08,.5],.06);
    CX(L.an,joint,.24,.62,0,0,0,16);S(L.an,s2,.62,.3,.32,0,.06,.36);
    P(L.an,s2,[[-.62,-.36],[.98,-.36],[1.02,-.2],[.6,-.04],[.25,.12],[-.4,.12],[-.66,-.12]],1.0,'x',0,0,0,0,0,0,{bev:.05});
    for(const tx of [-.24,.24])P(L.an,p,[[.42,-.33],[1.12,-.33],[1.14,-.2],[.62,0],[.42,-.05]],.42,'x',tx,0,0);
    S(L.an,joint,1.04,.06,1.72,0,-.335,.2,0,0,0,{bev:.02});
    P(L.an,frame,[[-.55,-.3],[-.95,-.36],[-.9,-.22],[-.5,-.05]],.4,'x');
  });
  /* reinforcement kits */
  B.kit(1,()=>{for(const x of [1,-1]){const A=arms[x>0?'L':'R'];S(A.paul,s2,.12,.55,1.1,x*.98,.4,.02);S(A.paul,M.a,.13,.08,1.12,x*.985,.7,.02,0,0,0,{bev:.01});bolts(A.paul,[[x*1.045,.2,-.4],[x*1.045,.2,.4],[x*1.045,.6,-.4],[x*1.045,.6,.4]],'x');}});
  legs.forEach(L=>greave(L,M,{w:1.0,fz:.56,bz:-.58,top:-.16,bot:-1.38}));
  B.kit(2,()=>legs.forEach(L=>{P(L.kn,s2,[[.5,-.42],[.7,-.6],[.66,-1.18],[.56,-1.2],[.58,-.6]],.7,'x');bolts(L.kn,[[.2,-.6,.68],[-.2,-.6,.68],[.2,-1.05,.66],[-.2,-1.05,.66]],'z');}));
  B.kit(3,()=>{for(const x of [1,-1]){S(spine,s2,.7,.5,.12,x*.55,1.42,1.03);bolts(spine,[[x*.32,1.6,1.1],[x*.78,1.6,1.1]],'z');}S(spine,M.a,1.5,.08,.13,0,1.7,1.03,0,0,0,{bev:.01});});
  /* shield */
  B.part='left';const sh=new T.Group();sh.position.set(.62,-.55,.12);arms.L.el.add(sh);
  S(sh,p,.16,1.95,1.5,0,0,0,0,0,0,{bev:.06});S(sh,s2,.18,1.7,.14,.02,0,.7);S(sh,M.a,.06,.18,1.4,.1,.82,0);
  Dec(sh,stripeTex('#e9e3d0'),.9,.9,.091,-.15,-.15,0,PI/2,0);S(sh,frame,.26,.5,.36,-.14,.2,0);
  bolts(sh,[[.1,.75,-.62],[.1,.75,.62],[.1,-.75,-.62],[.1,-.75,.62]],'x');B.shield=sh;
}

/* ======================= KESTREL: recon walker ======================= */
function kestrel(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,frame,joint,steel}=M,s2=M.s;
  B.part='body';
  S(pelvis,frame,.92,.46,.78,0,0,0);CX(pelvis,joint,.22,1.25,0,-.1,0,16);
  hipsKestrel(pelvis,legs,M);
  P(pelvis,s2,[[-.35,.15],[-1.1,.5],[-1.18,.36],[-.42,-.18]],.1,'x',0,0,0);
  Cy(spine,joint,.32,.36,.3,0,.08,0,0,0,0,16);S(spine,s2,.62,.2,.28,0,.22,.3);
  P(spine,p,[[-.7,.26],[.35,.2],[.8,.5],[.82,.95],[.35,1.35],[-.5,1.32],[-.85,.85]],1.35,'x',0,0,0,0,0,0,{bev:.06});
  S(spine,s2,.32,.1,1.15,0,1.38,-.1,0,0,0,{bev:.03});
  for(const x of [1,-1]){P(spine,s2,[[-.55,.45],[.55,.35],[.7,.75],[.3,1.15],[-.5,1.1]],.08,'x',x*.705,0,0,0,0,0,{bev:.025});
    S(spine,joint,.3,.32,.32,x*.95,1.1,0);}
  Dec(spine,M.numTex,.5,.5,.751,.78,.02,0,PI/2,0,{detachWith:'body'});
  Dec(spine,wingTex('#2c2a26'),.36,.36,-.751,.8,.05,0,-PI/2,0);
  /* sensor pack, fins, thrusters */
  S(spine,s2,.92,.72,.5,0,.95,-.95);S(spine,SH.vent,.7,.4,.03,0,.95,-1.21,0,0,0,{bev:0});
  for(const x of [1,-1]){
    P(spine,p,[[-.2,0],[.25,0],[-.62,1.25],[-.88,1.3]],.06,'x',x*.38,1.25,-.95,0,0,-x*.28,{bev:.02});
    B.beacons.push(lamp(spine,SH.red,.035,x*.62,2.45,-1.75));
    Cy(spine,joint,.13,.2,.36,x*.28,.68,-1.32,PI/2,0,0,14);Cy(spine,M.stack,.11,.11,.02,x*.28,.68,-1.5,PI/2,0,0,14,{shadow:false});
    const top=new T.Object3D();top.position.set(x*.28,.68,-1.55);spine.add(top);B.stackTops.push(top);
  }
  Cy(spine,steel,.02,.025,1.4,-.3,2.0,-.6,0,0,0,6);Cy(spine,steel,.012,.016,1.0,.25,1.85,-.75,0,0,.08,6);
  const dish=new T.Group();dish.position.set(.0,1.48,-.55);spine.add(dish);Cy(dish,frame,.05,.05,.25,0,.12,0,0,0,0,8);
  const dm=new T.Mesh(new T.SphereGeometry(.32,18,8,0,PI*2,0,PI*.32),SH.steel);dm.rotation.x=-PI/2-.5;dm.position.set(0,.3,.05);dm.castShadow=true;dish.add(dm);B.spinners.push(dish);
  ribbedTube(spine,[[.4,1.2,-.7],[.8,1.3,-.4],[1.05,1.15,-.15]],.05);ribbedTube(spine,[[-.4,1.2,-.7],[-.8,1.3,-.4],[-1.05,1.15,-.15]],.05);
  /* cockpit pod */
  B.part='pilot';
  P(neck,p,[[-.35,-.3],[.35,-.38],[.85,-.12],[.82,.12],[.45,.38],[-.3,.35]],.9,'x',0,0,0,0,0,0,{bev:.06});
  P(neck,SH.glass,[[-.12,.3],[.42,.39],[.82,.12],[.84,.03],[.5,.22],[-.12,.24]],.62,'x',0,.02,0,0,0,0,{detach:true,bev:.03});
  S(neck,joint,.36,.3,.2,0,-.12,.8);
  B.visor.push(CZ(neck,M.visor,.1,.04,0,-.12,.92,16,{shadow:false}));
  for(const x of [1,-1]){CZ(neck,frame,.075,.12,x*.2,-.04,.86,12);B.visor.push(CZ(neck,M.visor,.05,.03,x*.2,-.04,.93,12,{shadow:false}));
    S(neck,s2,.06,.3,.6,x*.46,0,.15,0,0,0,{detach:true});}
  S(neck,SH.vent,.4,.06,.3,0,-.36,.4,0,0,0,{bev:0});
  /* arms */
  for(const x of [1,-1]){const A=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    pauldron(A,x,M,{w:.5,top:.56,bot:.0,d:.7,style:'light'});
    CX(A.sh,joint,.23,.46,0,0,0,16);S(A.sh,frame,.3,.85,.32,0,-.5,0);
    P(A.sh,p,[[-.22,-.12],[.26,-.1],[.28,-.65],[-.2,-.72]],.46,'x');
    piston(A.sh,[0,-.28,-.22],A.el,[0,-.4,-.3],.05);
    CX(A.el,joint,.21,.48,0,0,0,16);
    P(A.el,p,[[-.25,-.05],[.25,-.05],[.32,-.4],[.26,-.88],[-.22,-.92],[-.3,-.42]],.5,'x',0,0,0,0,0,0,{bev:.045});
    P(A.el,s2,[[.24,-.1],[.38,-.4],[.34,-.84],[.28,-.84],[.3,-.4],[.2,-.12]],.4,'x',0,0,0,0,0,0,{detach:true});
    S(A.wr,frame,.36,.3,.4,0,-.14,0);for(const fx of [-.11,0,.11])S(A.wr,joint,.09,.22,.11,fx,-.36,.12,.4);S(A.wr,joint,.09,.2,.11,-x*.21,-.24,.1,0,0,-x*.4);
  }
  /* reverse-joint legs */
  B.part='legs';
  legs.forEach((L,i)=>{const x=i===0?1:-1;
    CX(L.hip,joint,.25,.46,0,0,0,16);S(L.hip,frame,.32,1.28,.34,0,-.72,0);
    P(L.hip,p,[[-.26,-.16],[.3,-.14],[.34,-.62],[.18,-1.22],[-.12,-1.26],[-.3,-.7]],.56,'x',0,0,0,0,0,0,{bev:.05});
    P(L.hip,s2,[[-.18,-.25],[.22,-.25],[.25,-.85],[-.1,-.95]],.06,'x',x*.3,0,0,0,0,0,{detach:true,bev:.02});
    piston(L.hip,[0,-.55,.3],L.kn,[0,-.6,.28],.065);
    CX(L.kn,joint,.25,.52,0,0,0,16);CX(L.kn,steel,.16,.56,0,0,0,12);
    P(L.kn,s2,[[-.08,.24],[-.55,.02],[-.5,-.16],[-.05,-.26]],.36,'x',0,0,0,0,0,0,{detach:true});
    S(L.kn,frame,.28,1.5,.28,0,-.82,0);
    P(L.kn,p,[[.05,-.1],[.3,-.25],[.32,-1.38],[.12,-1.5],[-.16,-1.3],[-.2,-.3]],.46,'x',0,0,0,0,0,0,{bev:.05});
    P(L.kn,s2,[[.28,-.32],[.4,-.45],[.38,-1.2],[.3,-1.25]],.3,'x',0,0,0,0,0,0,{detach:true});
    S(L.kn,M.a,.32,.06,.06,0,-.4,.36,-.1);
    piston(L.kn,[0,-1.0,-.22],L.an,[0,.1,-.28],.05);
    CX(L.an,joint,.2,.44,0,0,0,14);S(L.an,p,.38,.28,.46,0,.02,.08);
    for(const t of [-1,1])P(L.an,s2,[[-.05,-.3],[.85,-.3],[.9,-.2],[.55,-.05],[0,.06]],.2,'x',t*.18,0,0,0,t*.16,0);
    for(const t of [-1,1])S(L.an,frame,.16,.1,.18,t*.32,-.25,.9,0,t*.16,0);
    P(L.an,frame,[[.05,-.3],[-.6,-.3],[-.62,-.2],[-.1,.02]],.22,'x');
    S(L.an,joint,.75,.05,.4,0,-.3,.2,0,0,0,{bev:.01});
  });
  B.kit(1,()=>{for(const x of [1,-1]){const A=arms[x>0?'L':'R'];S(A.paul,s2,.08,.36,.7,x*.5,.18,.02);bolts(A.paul,[[x*.545,.08,-.25],[x*.545,.08,.25]],'x');}});
  B.kit(2,()=>legs.forEach(L=>{S(L.kn,s2,.36,.6,.08,0,-.95,.36,-.04);bolts(L.kn,[[.12,-.72,.41],[-.12,-.72,.41]],'z');}));
  B.kit(3,()=>{for(const x of [1,-1])S(spine,s2,.08,.5,.8,x*.77,.8,.1);S(spine,M.a,.3,.06,.5,0,1.44,.3,0,0,0,{bev:.01});});
  B.part='left';const sh=new T.Group();sh.position.set(.4,-.5,.1);arms.L.el.add(sh);
  P(sh,p,[[-.45,.5],[.4,.5],[.5,.1],[.3,-.55],[-.3,-.55],[-.5,.1]],.1,'x',0,0,0,0,0,0,{bev:.03});S(sh,M.a,.04,.1,.7,.06,.38,0,0,0,0,{bev:.01});S(sh,frame,.18,.3,.3,-.08,.1,0);
  B.shield=sh;
}

/* ======================= BASILISK: support heavy ======================= */
function basilisk(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,frame,joint,steel}=M,s2=M.s;
  B.part='body';
  S(pelvis,frame,1.6,.6,1.0,0,0,0);CX(pelvis,joint,.3,2.3,0,-.12,0,18);
  hipsBasilisk(pelvis,legs,M);
  Cy(spine,joint,.58,.62,.4,0,.12,0,0,0,0,20);S(spine,s2,1.2,.24,.36,0,.32,.45);
  P(spine,p,[[-.9,.15],[.7,.15],[1.05,.5],[1.05,1.4],[.7,1.85],[-.85,1.9],[-1.05,1.3]],2.9,'x',0,0,0,0,0,0,{bev:.08});
  S(spine,s2,2.4,.82,.16,0,.98,1.1,.04,0,0);S(spine,hazardMat(10),2.42,.14,.17,0,.62,1.11,.04,0,0,{bev:.01});
  for(const x of [1,-1]){bolts(spine,[[x*1.1,1.32,1.2],[x*1.1,.74,1.2],[x*.4,1.32,1.2]],'z');S(spine,SH.vent,.06,.7,.8,x*1.46,1.0,-.1,0,0,0,{bev:0});S(spine,joint,.42,.5,.5,x*1.62,1.5,0);}
  Dec(spine,stripeTex('#e9e3d0'),.55,.55,.75,1.05,1.19,0,0,0,{detachWith:'body'});
  Dec(spine,wingTex('#d9d2be'),.4,.4,-.75,1.05,1.19);
  /* support module: VLS + radar + crane */
  S(spine,s2,2.0,1.2,.9,0,1.45,-1.25);S(spine,hazardMat(8),2.02,.12,.92,0,2.0,-1.25,0,0,0,{bev:.01});
  for(let r=0;r<2;r++)for(let c=0;c<4;c++)S(spine,frame,.38,.06,.32,-.66+c*.44,2.08,-1.47+r*.42,0,0,0,{bev:.015});
  for(const x of [1,-1]){Cy(spine,s2,.24,.28,.5,x*.82,2.25,-.6,0,0,0,8);Cy(spine,joint,.2,.2,.05,x*.82,2.52,-.6,0,0,0,12);Cy(spine,M.stack,.17,.17,.02,x*.82,2.55,-.6,0,0,0,12,{shadow:false});const top=new T.Object3D();top.position.set(x*.82,2.6,-.6);spine.add(top);B.stackTops.push(top);}
  const mast=new T.Group();mast.position.set(-.55,2.05,-1.5);spine.add(mast);Cy(mast,frame,.06,.08,.9,0,.45,0,0,0,0,8);
  const dish=new T.Group();dish.position.y=.95;mast.add(dish);const dm=new T.Mesh(new T.SphereGeometry(.55,20,8,0,PI*2,0,PI*.3),SH.steel);dm.rotation.x=-PI/2-.35;dm.castShadow=true;dish.add(dm);Cy(dish,frame,.03,.03,.5,0,.05,.25,PI/2-.35,0,0,6);B.spinners.push(dish);
  B.beacons.push(lamp(mast,SH.red,.05,0,.92,0));
  const crane=new T.Group();crane.position.set(.75,2.08,-1.6);spine.add(crane);Cy(crane,joint,.12,.12,.2,0,0,0,0,0,0,10);
  S(crane,M.a,.16,.16,1.2,0,.25,.35,-.55);S(crane,M.a,.13,.13,.9,0,.62,.95,.75);S(crane,frame,.12,.3,.08,0,.35,1.25);
  ribbedTube(spine,[[.9,1.8,-.85],[1.45,1.95,-.5],[1.8,1.75,-.2]],.08);ribbedTube(spine,[[-.9,1.8,-.85],[-1.45,1.95,-.5],[-1.8,1.75,-.2]],.08);
  /* turret cockpit */
  B.part='pilot';
  Cy(neck,joint,.55,.6,.2,0,-.02,0,0,0,0,20);
  P(neck,p,[[-.5,0],[.45,0],[.62,.22],[.45,.5],[-.45,.52],[-.58,.25]],1.15,'x',0,0,0,0,0,0,{bev:.06});
  P(neck,s2,[[-.3,.48],[.36,.46],[.3,.6],[-.25,.62]],.9,'x',0,0,0,0,0,0,{detach:true});
  S(neck,SH.glass,.86,.16,.06,0,.27,.555,-.35,0,0,{bev:.01,detach:true});
  B.visor.push(S(neck,M.visor,.8,.04,.03,0,.18,.59,-.35,0,0,{bev:0,shadow:false}));
  for(const x of [1,-1]){CZ(neck,frame,.09,.14,x*.42,.08,.56,12);B.visor.push(CZ(neck,SH.lamp,.065,.03,x*.42,.08,.63,12,{shadow:false}));}
  Cy(neck,steel,.02,.02,.7,.35,.85,-.3,0,0,0,6);
  /* arms */
  for(const x of [1,-1]){const A=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    pauldron(A,x,M,{w:1.0,top:1.12,bot:-.1,d:1.4,style:'heavy',dec:x>0?M.numTex:null,decS:.6});
    CX(A.sh,joint,.34,.66,0,0,0,18);S(A.sh,frame,.5,.95,.55,0,-.52,0);
    P(A.sh,p,[[-.36,-.14],[.4,-.12],[.44,-.7],[-.34,-.78]],.74,'x',0,0,0,0,0,0,{bev:.05});
    piston(A.sh,[x*.26,-.3,-.34],A.el,[x*.26,-.45,-.46],.08);
    CX(A.el,joint,.3,.7,0,0,0,18);
    P(A.el,p,[[-.45,-.05],[.42,-.05],[.5,-.4],[.48,-.95],[-.42,-1.0],[-.5,-.5]],.88,'x',0,0,0,0,0,0,{bev:.06});
    P(A.el,s2,[[.4,-.1],[.6,-.36],[.58,-.9],[.48,-.9],[.5,-.36],[.36,-.12]],.7,'x',0,0,0,0,0,0,{detach:true});
    S(A.el,hazardMat(3),.9,.1,.92,0,-.12,0,0,0,0,{bev:.01});
    S(A.wr,frame,.56,.4,.6,0,-.18,0);for(const fx of [-.18,0,.18])S(A.wr,joint,.15,.3,.17,fx,-.48,.16,.4);S(A.wr,joint,.15,.28,.17,-x*.33,-.32,.12,0,0,-x*.4);
  }
  /* stocky legs, elephant feet */
  B.part='legs';
  legs.forEach((L,i)=>{const x=i===0?1:-1;
    CX(L.hip,joint,.34,.62,0,0,0,18);S(L.hip,frame,.55,1.1,.6,0,-.62,0);
    P(L.hip,p,[[-.36,-.2],[.48,-.18],[.56,-.5],[.42,-1.0],[-.26,-1.05],[-.48,-.55]],.94,'x',0,0,0,0,0,0,{bev:.07});
    P(L.hip,s2,[[-.3,-.25],[.38,-.25],[.42,-.85],[-.2,-.9]],.08,'x',x*.5,0,0,0,0,0,{detach:true,bev:.025});
    piston(L.hip,[0,-.45,-.36],L.kn,[0,-.4,-.56],.1);
    CX(L.kn,joint,.34,.78,0,0,0,18);
    P(L.kn,s2,[[.15,.44],[.64,.2],[.72,-.3],[.36,-.46],[.1,0]],.88,'x',0,0,0,0,0,0,{detach:true,bev:.06});
    S(L.kn,hazardMat(2),.6,.12,.08,0,.08,.73,-.6,0,0,{bev:.01});
    Cy(L.kn,p,.46,.52,1.15,0,-.68,0,0,0,0,8);for(const y of [-.32,-.68,-1.04])Cy(L.kn,joint,.53,.53,.07,0,y,0,0,0,0,8);
    P(L.kn,s2,[[.3,-.2],[.6,-.35],[.58,-1.1],[.4,-1.18]],.6,'x',0,0,0,0,0,0,{detach:true});
    piston(L.kn,[x*.48,-.85,.1],L.an,[x*.48,.06,.35],.07);
    CX(L.an,joint,.28,.7,0,0,0,16);
    Cy(L.an,s2,.66,.76,.3,0,-.27,.05,0,0,0,8);Cy(L.an,p,.52,.66,.22,0,-.04,.05,0,0,0,8);
    for(const t of [-1,0,1])P(L.an,p,[[.4,-.42],[1.0,-.42],[1.02,-.28],[.55,-.1]],.3,'x',t*.36,0,0,0,t*.35,0);
    S(L.an,joint,1.3,.05,1.4,0,-.42,.12,0,0,0,{bev:.01});
  });
  B.kit(1,()=>{for(const x of [1,-1]){const A=arms[x>0?'L':'R'];S(A.paul,s2,.4,.5,1.2,x*.38,1.45,0);bolts(A.paul,[[x*.2,1.71,-.4],[x*.56,1.71,.4]],'y');}});
  legs.forEach(L=>greave(L,M,{w:1.14,fz:.64,bz:-.62,top:-.14,bot:-1.24}));
  B.kit(2,()=>legs.forEach(L=>{S(L.kn,s2,.7,.7,.1,0,-.75,.6);bolts(L.kn,[[.25,-.5,.66],[-.25,-.5,.66],[.25,-1.0,.66],[-.25,-1.0,.66]],'z');}));
  B.kit(3,()=>{S(spine,s2,2.0,.5,.12,0,1.6,1.15,-.35);S(spine,M.a,2.0,.06,.13,0,1.82,1.08,-.35,0,0,{bev:.01});});
  B.part='left';const sh=new T.Group();sh.position.set(.68,-.55,.15);arms.L.el.add(sh);
  S(sh,p,.2,2.3,1.5,0,0,0,0,0,0,{bev:.07});S(sh,hazardMat(5),.22,.18,1.52,.01,1.0,0,0,0,0,{bev:.01});S(sh,SH.black,.21,.08,.6,.02,.55,0,0,0,0,{bev:0});
  S(sh,s2,.22,1.6,.14,.02,-.2,.72);S(sh,frame,.3,.5,.4,-.16,.2,0);bolts(sh,[[.12,.8,-.62],[.12,.8,.62],[.12,-.9,-.62],[.12,-.9,.62]],'x');
  B.shield=sh;
}
/* ---------- extra detail kit ---------- */


/* ======================= HIP / GROIN ARMOR (legs module) =======================
   Each chassis gets a solution that matches its role:
   WARDEN   late-medieval plate: telescoping fauld, strapped tassets, culet, steel codpiece
   KESTREL  pteryges logic for a scout: narrow hanging strips, mobility before coverage
   BASILISK tank logic: sloped glacis with ERA bricks, spaced skirt panels on brackets, bar armor at the rear
   VALKYRIE mobile-suit skirts: hinged front plates, fin side skirts, rear skirt, verniers, V crotch block
   ONI      do-maru lamellar: eight kusazuri wrapping the hips, six laced kozane rows each, haidate on the thighs */
// a hinged armor group; weights say how it follows the thigh: wp forward swing, wb back swing, wr outward roll
function hinge(parent,x,y,z,ry,flare,leg,side,wt){const g=new T.Group();g.rotation.order='YXZ';g.position.set(x,y,z);g.rotation.set(flare,ry,0);parent.add(g);
  return g;}
function skirtPose(sk){for(const q of sk){const h=q.leg.hip.rotation;q.g.rotation.x=q.base+Math.min(0,h.x)*q.wp-Math.max(0,h.x)*q.wb-Math.max(0,q.side*h.z)*q.wr-Math.abs(h.x)*q.wa;}}
const legOn=(legs,sx)=>legs.find(L=>(L.side[0]==='L')===(sx>0));
function bulkGroup(pelvis,sc){const g=new T.Group();g.scale.set(...sc);pelvis.add(g);return g;}
// heavy pelvic girdle: narrow at the waist, flaring over the hip joints like an iliac crest, deep front to back
function girdle(p,M,w,d,bt,o={}){const pts=[[0,bt+.02],[w*.7,bt+.02],[w*1.02,bt-.2],[w*1.1,bt-.42],[w*.92,bt-.66],[w*.5,bt-.8],[0,bt-.86]];
  P(p,M.s,pts.concat(pts.slice(1,-1).reverse().map(q=>[-q[0],q[1]])),d*2.1,'z',0,0,0,0,0,0,{bev:.06});
  for(const sx of [1,-1]){P(p,M.p,mir([[w*.62,bt-.04],[w*1.0,bt-.22],[w*1.08,bt-.44],[w*.9,bt-.6],[w*.66,bt-.3]],sx),d*2.24,'z',0,0,0,0,0,0,{bev:.05});
    P(p,SH.frame,mir([[w*.7,bt-.12],[w*.96,bt-.26],[w*1.0,bt-.42],[w*.8,bt-.36]],sx),d*2.32,'z',0,0,0,0,0,0,{bev:.02});
    bolts(p,[[sx*w*.86,bt-.24,d*1.13],[sx*w*.96,bt-.44,d*1.13],[sx*w*.86,bt-.24,-d*1.13],[sx*w*.96,bt-.44,-d*1.13]],'z',.03);}
  if(o.ridge!==false)S(p,M.a,.06,.5,.05,0,bt-.35,d*1.06,0,0,0,{bev:.01});}
// elliptical band around the waist: arc of radius R scaled to half-width w, spanning +-span radians from the front
function band(p,mat,w,d,span,h,y,t,o={}){const N=o.n||14,out=[],inn=[];for(let i=0;i<=N;i++){const q=-span+2*span*i/N;out.push([Math.sin(q)*(d+t),Math.cos(q)*(d+t)]);inn.push([Math.sin(q)*d,Math.cos(q)*d]);}
  const m=P(p,mat,out.concat(inn.reverse()),h,'y',0,y,0,0,o.ry||0,0,{bev:Math.min(.014,t*.3),detach:o.detach});m.scale.x=w/d;return m;}
function rivetsOn(p,w,d,span,y,n,r=.026,ry=0){for(let i=0;i<n;i++){const q=-span+2*span*i/(n-1)+ry;const b=new T.Mesh(cylGeo(r,r,.04,6),SH.steel);b.position.set(Math.sin(q)*(d+.02)*w/d,y,Math.cos(q)*(d+.02));b.rotation.set(PI/2,0,0);b.rotation.y=q;p.add(b);}}
function hipBearing(L,M,x,r){const sx=L.side[0]==='L'?1:-1;Cy(L.hip,SH.joint,r,r,.12,sx*x,0,0,0,0,PI/2,18);Cy(L.hip,M.s,r*.82,r*1.06,.1,sx*(x+.08),0,0,0,0,PI/2,8);
  Cy(L.hip,SH.frame,r*.36,r*.36,.06,sx*(x+.15),0,0,0,0,PI/2,10);for(let k=0;k<6;k++){const q=k/6*PI*2;bolts(L.hip,[[sx*(x+.14),Math.sin(q)*r*.7,Math.cos(q)*r*.7]],'x',.022);}}

/* ---- shared fauld: heavy telescoping lames that wrap the entire hip, each lower lame wider so the skirt flares ---- */
function fauld(pel,M,c){const {w,d,bt,n,h,t,step,mats}=c,out=[];
  {const cap=Cy(pel,M.s,d+t*.6,d+t*.9,.07,0,bt-.035,0,0,0,0,28);cap.scale.x=w/d;const lip=Cy(pel,SH.frame,d*.62,d*.7,.05,0,bt+.01,0,0,0,0,24);lip.scale.x=w/d;}
  for(let k=0;k<n;k++){const wk=w+k*step,dk=d+k*step,y=bt-k*h*.82;
    band(pel,mats[k%mats.length],wk,dk,PI*.985,h,y-h/2,t,{n:28,detach:k===n-1&&c.detachLast});
    band(pel,k===n-1?M.a:SH.frame,wk+.02,dk+.02,PI*.985,.035,y-h+.03,.03,{n:28});           // rolled lower edge
    for(const q of c.rivetAt||[-2.6,-1.6,-.55,.55,1.6,2.6]){const r=dk+t+.01;const b=new T.Mesh(cylGeo(.032,.032,.05,8),SH.steel);b.position.set(Math.sin(q)*r*wk/dk,y-h*.3,Math.cos(q)*r);b.rotation.set(PI/2,0,0);b.rotation.y=q;pel.add(b);}
    if(c.ridge)S(pel,M.a,.06,h*.8,.05,0,y-h*.5,dk+t,0,0,0,{bev:.01});
    out.push({wk,dk,y});}
  return out;}

/* ---- WARDEN: plate harness — five-lame fauld wrapping the hips, strapped tassets, steel codpiece ---- */
function hipsWarden(pel,legs,M){const pelvis=bulkGroup(pel,[1.18,1.12,1.16]);const p=M.p,s2=M.s,A=M.a,w=.8,d=.52,bt=.26;girdle(pelvis,M,w,d,bt);
  const L5=fauld(pelvis,M,{w:w*1.16,d:d*1.3,bt:bt+.04,n:5,h:.19,t:.11,step:.075,mats:[p,s2],ridge:true});
  // buckled straps where the tassets hang from the bottom lame
  const last=L5[4],yb=last.y-.19;
  // steel codpiece under the front of the fauld
  const cp=new T.Group();cp.position.set(0,yb-.08,last.dk+.02);pelvis.add(cp);
  const cup=new T.Mesh(new T.SphereGeometry(.24,16,8,0,PI*2,0,PI*.55),SH.steel);cup.scale.set(1,1.3,.9);cup.rotation.x=PI/2+.25;cp.add(cup);cup.castShadow=true;
  Cy(cp,SH.frame,.25,.25,.05,0,0,-.02,PI/2+.25,0,0,16);for(let k=0;k<6;k++){const q=k/6*PI*2;bolts(cp,[[Math.sin(q)*.22,Math.cos(q)*.28,0]],'z',.022);}
  // tassets: four heavy lames each, fluted, riveted, rolled edge
  for(const sx of [1,-1]){const g=new T.Group();g.rotation.order='YXZ';g.position.set(sx*.44,yb+.04,last.dk+.06);g.rotation.set(-.2,sx*.22,0);pelvis.add(g);
    for(const fx of [-.16,.16]){S(g,SH.rubber,.07,.16,.03,fx,.02,0,0,0,0,{bev:0});S(g,SH.steel,.1,.07,.04,fx,-.04,.02,0,0,0,{bev:.008});}
    for(let k=0;k<4;k++){const hw=.32+k*.03,y=-.06-k*.17;
      P(g,k%2?s2:p,[[-hw,0],[hw,0],[hw+.03,-.2],[-hw-.02,-.19]],.1,'z',0,y,k*.04,0,0,0,{bev:.02,detach:k===3});
      for(const fx of [-.4,0,.4])S(g,SH.frame,.024,.16,.02,fx*hw,y-.1,k*.04+.055,0,0,fx*.25,{bev:0,shadow:false});
      bolts(g,[[-hw*.85,y-.05,k*.04+.055],[hw*.85,y-.05,k*.04+.055]],'z',.022);}
    S(g,A,.74,.04,.05,0,-.06-3*.17-.19,.14,0,0,0,{bev:0});}
  legs.forEach(L=>hipBearing(L,M,.5,.34));}

/* ---- BASILISK: tank-heavy fauld — four thick bolted lames all round, ERA bricks on the front arc, short tassets ---- */
function hipsBasilisk(pel,legs,M){const pelvis=bulkGroup(pel,[1.2,1.14,1.18]);const p=M.p,s2=M.s,A=M.a,w=1.0,d=.58,bt=.3;girdle(pelvis,M,w,d,bt);
  const L4=fauld(pelvis,M,{w:w*1.14,d:d*1.32,bt:bt+.04,n:4,h:.24,t:.15,step:.09,mats:[p,s2,p],rivetAt:[-2.8,-2.1,-1.4,-.7,.7,1.4,2.1,2.8]});
  band(pelvis,hazardMat(12),L4[3].wk+.03,L4[3].dk+.03,PI*.985,.06,L4[3].y-.2,.02,{n:28});
  // explosive-reactive bricks along the front arc of the top two lames
  for(let r=0;r<2;r++){const Lr=L4[r],R=Lr.dk+.15;for(let c=0;c<5;c++){const q=(c-2)*.3;const g2=new T.Group();g2.position.set(Math.sin(q)*R*Lr.wk/Lr.dk,Lr.y-.12,Math.cos(q)*R);g2.rotation.y=q;pelvis.add(g2);
    S(g2,s2,.3,.19,.1,0,0,0,0,0,0,{bev:.015,detach:r===0&&c===2});S(g2,SH.frame,.3,.025,.11,0,-.07,0,0,0,0,{bev:0});bolts(g2,[[-.11,.06,.055],[.11,.06,.055]],'z',.016);}}
  const last=L4[3],yb=last.y-.24;
  P(pelvis,SH.frame,[[-.26,0],[.26,0],[.2,-.34],[-.2,-.34]],.3,'z',0,yb,last.dk-.06,.2,0,0,{bev:.03});
  legs.forEach(L=>hipBearing(L,M,.6,.4));}

/* ---- VALKYRIE: mobile-suit skirts, enlarged to enclose the whole hip ---- */
function hipsValkyrie(pel,legs,M){const pelvis=bulkGroup(pel,[1.2,1.12,1.16]);const p=M.p,s2=M.s,A=M.a,G=SH.gold,w=.6,d=.44,bt=.2;girdle(pelvis,M,w,d,bt,{ridge:false});
  // heavy waist ring the skirts hang from
  band(pelvis,p,w*1.2,d*1.32,PI*.985,.2,bt-.08,.1,{n:28});{const cap=Cy(pelvis,s2,d*1.36,d*1.4,.06,0,bt+.0,0,0,0,0,28);cap.scale.x=w*1.2/(d*1.32);}band(pelvis,s2,w*1.2+.03,d*1.32+.03,PI*.985,.05,bt-.2,.03,{n:28});
  const R0=d*1.32+.1,W0=w*1.2+.1;
  // V crotch block
  const cb=new T.Group();cb.position.set(0,bt-.24,R0-.08);pelvis.add(cb);
  P(cb,A,[[-.24,.04],[.24,.04],[.22,-.22],[.08,-.56],[-.08,-.56],[-.22,-.22]],.46,'z',0,0,-.12,0,0,0,{bev:.04});
  P(cb,s2,[[-.17,0],[.17,0],[.15,-.18],[.05,-.42],[-.05,-.42],[-.15,-.18]],.06,'z',0,0,.13,0,0,0,{bev:.015});S(cb,G,.14,.09,.04,0,-.07,.17,0,0,0,{bev:.01});
  // big front skirts
  for(const sx of [1,-1]){const g=new T.Group();g.rotation.order='YXZ';g.position.set(sx*.36,bt-.2,R0);g.rotation.set(-.22,sx*.2,0);pelvis.add(g);
    P(g,p,mir([[-.14,.02],[.44,.02],[.46,-.66],[.3,-.84],[-.14,-.72]],sx),.13,'z',0,0,.05,0,0,0,{bev:.04,detach:true});
    P(g,s2,mir([[-.07,-.05],[.36,-.05],[.38,-.52],[-.07,-.5]],sx),.04,'z',0,0,.13,0,0,0,{bev:.012});
    P(g,p,mir([[.0,-.1],[.3,-.1],[.31,-.44],[.0,-.42]],sx),.03,'z',0,0,.16,0,0,0,{bev:.01});
    S(g,G,.1,.1,.03,sx*.12,-.24,.19,0,0,0,{bev:.006});S(g,SH.frame,.4,.02,.02,sx*.15,-.58,.13,0,0,0,{bev:0,shadow:false});S(g,A,.5,.04,.05,sx*.15,-.76,.1,0,0,sx*.32,{bev:0});
    S(g,SH.frame,.48,.6,.07,sx*.15,-.34,-.04,0,0,0,{bev:.015});nozzle(g,M.stack,.07,.14,sx*.15,-.56,-.07,.6,0,0);
    // big side skirts covering the flank
    const sg=new T.Group();sg.rotation.order='YXZ';sg.position.set(sx*W0,bt-.18,0);sg.rotation.set(-.18,sx*PI/2,0);pelvis.add(sg);
    P(sg,p,[[-.56,.02],[.58,.02],[.5,-.6],[.12,-.84],[-.48,-.66]],.12,'z',0,0,.04,0,0,0,{bev:.04,detach:true});
    P(sg,s2,[[-.44,-.06],[.46,-.06],[.38,-.46],[-.36,-.48]],.04,'z',0,0,.11,0,0,0,{bev:.012});
    S(sg,SH.frame,.86,.06,.06,0,-.28,.14,0,0,0,{bev:0});S(sg,A,.07,.26,.05,.42,-.28,.14,0,0,0,{bev:0});
    bolts(sg,[[-.4,-.1,.13],[.4,-.1,.13]],'z',.022);nozzle(sg,M.stack,.08,.16,0,-.74,-.05,.5,0,0);}
  // large rear skirt with twin verniers
  const rg=new T.Group();rg.rotation.order='YXZ';rg.position.set(0,bt-.18,-R0);rg.rotation.set(-.24,PI,0);pelvis.add(rg);
  P(rg,p,[[-.7,.02],[.7,.02],[.62,-.68],[-.62,-.68]],.13,'z',0,0,.05,0,0,0,{bev:.04});P(rg,s2,[[-.56,-.06],[.56,-.06],[.48,-.5],[-.48,-.5]],.04,'z',0,0,.13,0,0,0,{bev:.012});
  for(const sx of [1,-1])nozzle(rg,M.stack,.1,.22,sx*.28,-.7,-.04,.55,0,0);
  legs.forEach(L=>hipBearing(L,M,.38,.3));}

/* ---- KESTREL: pteryges strips for a scout ---- */
function hipsKestrel(pel,legs,M){const pelvis=bulkGroup(pel,[1.08,1.06,1.08]);const p=M.p,s2=M.s,w=.56,d=.42,bt=.24;girdle(pelvis,M,w,d*.9,bt,{ridge:false});
  S(pelvis,SH.frame,w*1.8,.18,d*1.8,0,bt-.08,0,0,0,0,{bev:.03});band(pelvis,p,w,d,2.4,.12,bt-.06,.05);band(pelvis,M.a,w+.02,d+.02,2.3,.025,bt-.13,.01);
  for(const sx of [1,-1]){const L=legOn(legs,sx);
    for(const [ry,kind] of [[sx*.25,'f'],[sx*1.2,'s']]){const g=hinge(pelvis,Math.sin(ry)*(d+.02)*w/d,bt-.14,Math.cos(ry)*(d+.02),ry,-.12,L,sx,kind==='f'?{wp:.9,wr:.3}:{wr:.8,wa:.2});
      for(let i=0;i<3;i++){const x=(i-1)*.11,len=.42-Math.abs(i-1)*.06;S(g,i===1?s2:p,.095,len,.035,x,-len/2,i===1?.02:0,0,0,0,{bev:.012});S(g,SH.frame,.1,.025,.04,x,-len+.02,.02,0,0,0,{bev:0});
        S(g,SH.rubber,.03,.08,.02,x,.02,0,0,0,0,{bev:0});}}}
  legs.forEach(L=>hipBearing(L,M,.33,.2));}

/* ---- ONI: do-maru lamellar ---- */
function kozaneRow(g,mat,cord,hw,R,h,y,z,n,t,knots,knotMat){const sw=2*hw/n*1.22;
  {const m=band(g,SH.frame,hw*1.02,R,hw*1.04/R,h*.9,y-h*.5,t*.9,{n:5});m.position.z+=z-R-t*.2;m.scale.x=1;}
  for(let i=0;i<n;i++){const a=(-hw+(i+.5)*2*hw/n)/R,x=Math.sin(a)*R,zz=Math.cos(a)*R-R+z+(i%2)*.012;
    P(g,mat,[[-sw/2,-h],[sw/2,-h],[sw/2,-h*.2],[sw*.18,-h*.04],[0,0],[-sw*.18,-h*.04],[-sw/2,-h*.2]],t,'z',x,y,zz,0,a,0,{bev:0});
    S(g,cord,.022,h*.62,.012,x,y-h*.55,zz+t/2+.006,0,a,0,{bev:0,shadow:false});
    if(knots)for(const r of [.75,-.75])S(g,knotMat,.018,.08,.01,x,y-h*.84,zz+t/2+.01,0,a,r,{bev:0,shadow:false});}
  // braided edge cord across the top of the row
  const N=3;for(let i=0;i<N;i++){const a=(-hw+(i+.5)*2*hw/N)/R;S(g,cord,2*hw/N*1.02,.025,.016,Math.sin(a)*R,y-h*.12,Math.cos(a)*R-R+z+t/2+.012,0,a,0,{bev:0,shadow:false});}}
function hipsOni(pel,legs,M){const pelvis=bulkGroup(pel,[1.16,1.1,1.14]);const p=M.p,s2=M.s,A=M.a,w=.78,d=.54,bt=.3;girdle(pelvis,M,w,d,bt);
  S(pelvis,SH.frame,w*1.9,.26,d*1.9,0,bt-.1,0,0,0,0,{bev:.03});
  band(pelvis,s2,w,d,PI,.16,bt-.06,.07);band(pelvis,A,w+.03,d+.03,PI,.03,bt-.14,.012);band(pelvis,A,w+.03,d+.03,PI,.03,bt+.01,.012);
  // eight kusazuri around the waist (do-maru), six kozane rows each, dense lacing, cross-knots on the hem
  const secs=[[.36,'f'],[-.36,'f'],[1.08,'fs'],[-1.08,'fs'],[1.85,'bs'],[-1.85,'bs'],[2.6,'b'],[-2.6,'b']];
  for(const [q,kind] of secs){const sx=q>0?1:-1,L=legOn(legs,sx),wt=kind==='f'?{wp:.85,wr:.25}:kind==='fs'?{wp:.45,wr:.7,wa:.1}:kind==='bs'?{wb:.4,wr:.55}:{wb:.75,wr:.15};
    const g=hinge(pelvis,Math.sin(q)*(d+.08)*w/d,bt-.15,Math.cos(q)*(d+.08),q,kind==='f'?-.26:-.18,L,sx,wt);
    S(g,A,.05,.12,.03,-.16,.03,.02,0,0,0,{bev:0});S(g,A,.05,.12,.03,.16,.03,.02,0,0,0,{bev:0});
    for(let k=0;k<6;k++){const hw=.31+k*.018;kozaneRow(g,k%3===2?s2:p,A,hw,1.4,.19,-k*.15,k*.05,5,.09,k===5,SH.gold);}
    S(g,s2,.68,.07,.12,0,-5*.15-.19,5*.05+.03,0,0,0,{bev:.02});}
  // haidate: kozane apron over each thigh
  legs.forEach(L=>{const sx=L.side[0]==='L'?1:-1,hg=new T.Group();hg.position.set(0,-.34,.5);hg.rotation.x=-.08;L.hip.add(hg);
    for(let k=0;k<4;k++)kozaneRow(hg,k%2?s2:p,A,.32,1.0,.17,-k*.14,k*.04,4,.08,k===3,SH.gold);
    hipBearing(L,M,.5,.34);});
  // codpiece: lacquered plate behind the front kusazuri
  P(pelvis,s2,[[-.2,0],[.2,0],[.16,-.36],[0,-.46],[-.16,-.36]],.16,'z',0,bt-.22,d-.02,.15,0,0,{bev:.03});}

/* ---------- greaves: wraparound shin armor (legs module) ---------- */
function greave(L,M,c){const k=L.kn,{w,fz,bz,top,bot}=c,p=M.p,s2=M.s,tr=M.a,H=top-bot,fl=c.flare??1,X=w/2;
  // front shell: broad under the knee, waisted mid-shin, flared over the ankle
  P(k,p,[[-X,top],[X,top],[X*1.1,top-H*.28],[X*.9,bot+H*.24],[X*(1+.2*fl),bot],[-X*(1+.2*fl),bot],[-X*.9,bot+H*.24],[-X*1.1,top-H*.28]],.13,'z',0,0,fz,0,0,0,{bev:.04,detach:true});
  P(k,s2,[[-X*.34,top-.06],[X*.34,top-.06],[X*.22,bot+.14],[0,bot+.06],[-X*.22,bot+.14]],.06,'z',0,0,fz+.09,0,0,0,{bev:.018});
  S(k,SH.frame,w*.9,.025,.02,0,top-H*.28,fz+.075,0,0,0,{bev:0,shadow:false});
  S(k,tr,w*(.92+.2*fl),.05,.05,0,bot+.05,fz+.07,0,0,0,{bev:0});
  // side shells wrapping back to the calf, with an inner layer and rivets
  for(const sx of [1,-1]){const g=new T.Group();g.position.set(sx*(X*1.06),0,0);g.rotation.z=sx*.04;k.add(g);
    P(g,p,[[fz+.02,top-.02],[bz*.7,top-.1],[bz,top-H*.3],[bz*.92,bot+H*.3],[bz*.6,bot+.02],[fz+.04,bot]],.11,'x',0,0,0,0,0,0,{bev:.035});
    P(g,s2,[[fz-.1,top-.16],[bz*.55,top-.2],[bz*.72,bot+H*.42],[fz-.08,bot+H*.3]],.04,'x',sx*.065,0,0,0,0,0,{bev:.012});
    S(g,tr,.03,.04,(fz-bz)*.7,sx*.065,bot+.08,(fz+bz)/2,0,0,0,{bev:0});
    bolts(g,[[sx*.07,top-.14,fz-.1],[sx*.07,top-.14,bz*.6],[sx*.07,bot+.16,fz-.06],[sx*.07,bot+.16,bz*.5]],'x',.028);}
  // rear calf guard with vent slats
  P(k,s2,[[-X*.86,top-.12],[X*.86,top-.12],[X,top-H*.36],[X*.7,bot+.1],[-X*.7,bot+.1],[-X,top-H*.36]],.1,'z',0,0,bz-.02,0,0,0,{bev:.03});
  for(let i=0;i<4;i++)S(k,SH.black,w*.5,.03,.02,0,top-H*.3-i*.11,bz-.08,0,0,0,{bev:0,shadow:false});
}
/* ---------- layered, angled pauldron (arms module) ---------- */
function pauldron(Ar,x,M,c){const {w,top,bot,d}=c,p=c.mat||M.p,s2=M.s,tr=M.a,g=Ar.paul,X=v=>v*x,H=top-.5-bot;
  P(g,p,mir([[-.14,top-.24],[-.14,top],[w*.5,top+.06],[w*.94,top-.2],[w+.04,top-.56],[w-.16,top-.6],[w*.76,top-.36],[w*.42,top-.22]],x),d,'z',0,0,0,0,0,0,{bev:.06});
  P(g,s2,mir([[-.04,top+.02],[w*.48,top+.09],[w*.82,top-.1],[w*.5,top-.03],[-.04,top-.06]],x),d*.8,'z',0,.02,0,0,0,0,{bev:.03});
  for(const z of [1,-1]){P(g,s2,mir([[.04,top-.2],[w*.72,top-.32],[w*.84,top-.56],[w*.3,top-.5]],x),.05,'z',0,0,z*(d/2+.005),0,0,0,{bev:.015});
    S(g,SH.frame,.05,.05,.04,X(w*.6),top-.3,z*(d/2+.03),0,0,0,{bev:0});}
  P(g,SH.frame,mir([[.02,top-.28],[w*.74,top-.4],[w*.86,top-.62],[w*.62,bot+.12],[w*.18,bot+.2]],x),d*.86,'z',0,0,0,0,0,0,{bev:.03});
  P(g,s2,mir([[.08,top-.34],[w*.62,top-.44],[w*.7,top-.62],[w*.5,bot+.22],[w*.2,bot+.28]],x),d*.94,'z',0,0,0,0,0,0,{bev:.03});
  const og=new T.Group();og.position.set(X(w),top-.5,0);og.rotation.z=X(.16);g.add(og);
  P(og,p,[[-d*.5,.1],[d*.48,.1],[d*.42,-H*.85],[d*.12,-H-.04],[-d*.4,-H*.9]],.1,'x',X(.02),0,0,0,0,0,{bev:.03,detach:true});
  P(og,s2,[[-d*.38,0],[d*.36,0],[d*.3,-H*.66],[-d*.3,-H*.7]],.05,'x',X(.08),0,0,0,0,0,{bev:.015});
  S(og,tr,.06,.05,d*.84,X(.06),-H*.88,0,0,0,0,{bev:0});
  S(g,SH.frame,w*.62,.08,d*.72,X(w*.44),top-.64,0,0,0,0,{bev:.02});
  const st=c.style||'mil';
  if(st==='mil'||st==='heavy'){bolts(og,[[X(.11),-.06,-d*.38],[X(.11),-.06,d*.38],[X(.11),-H*.75,-d*.3],[X(.11),-H*.75,d*.3]],'x');}
  if(st==='heavy'){P(g,s2,mir([[.1,top+.07],[w*.6,top+.14],[w*.78,top+.02],[w*.3,top]],x),d*.6,'z',0,.04,0,0,0,0,{bev:.03});S(og,hazardMat(4),.11,.1,d*.8,X(.04),-.02,0,0,0,0,{bev:0});}
  if(st==='hero'){P(g,s2,[[-.36,0],[.2,0],[-.5,.5],[-.56,.46]],.06,'x',X(w*.42),top+.04,0,0,0,X(-.12),{bev:.012});for(let k=0;k<3;k++)S(og,SH.frame,.03,H*.32,.035,X(.11),-H*.42,-d*.16+k*.16,0,0,0,{bev:0});}
  if(st==='samurai'){for(let k=0;k<3;k++){const y=-H-.04-k*.24;P(og,k%2?p:s2,[[-d*.42+k*.05,.1],[d*.42-k*.05,.1],[d*.38-k*.05,-.16],[-d*.38+k*.05,-.16]],.08,'x',X(.03+k*.04),y,0,0,0,X(.08*k),{bev:.02,detach:k===2});S(og,tr,.09,.03,d*.7-k*.1,X(.05+k*.04),y-.15,0,0,0,X(.08*k),{bev:0});}}
  if(c.dec)Dec(og,c.dec,c.decS||.5,c.decS||.5,X(.081),-H*.4,0,0,x*PI/2,0,{detachWith:B.part});
  return og;}
function nozzle(p,mat,r,len,x,y,z,rx,ry,rz){const g=new T.Group();g.position.set(x,y,z);g.rotation.set(rx||0,ry||0,rz||0);p.add(g);
  Cy(g,SH.frame,r*.78,r,len,0,0,0,0,0,0,16);Cy(g,SH.joint,r*1.12,r*1.12,len*.22,0,len*.4,0,0,0,0,16);Cy(g,SH.steel,r*1.02,r*1.02,.025,0,-len*.48,0,0,0,0,16);
  Cy(g,mat,r*.72,r*.72,.02,0,-len/2+.02,0,0,0,0,16,{shadow:false});Cy(g,SH.black,r*.5,r*.62,len*.6,0,-len*.12,0,0,0,0,12,{shadow:false});return g;}
function vent(p,mat,w,h,n,x,y,z,rx,ry,rz,d=.06){const g=new T.Group();g.position.set(x,y,z);g.rotation.set(rx||0,ry||0,rz||0);p.add(g);
  S(g,mat,w,h,d,0,0,0,0,0,0,{bev:.012});S(g,SH.black,w*.84,h*.8,.02,0,0,d/2,0,0,0,{bev:0,shadow:false});
  for(let i=0;i<n;i++)S(g,SH.frame,w*.86,h*.8/n*.45,.03,0,-h*.4+h*.8*(i+.5)/n,d/2+.012,-.5,0,0,{bev:0,shadow:false});return g;}
function hand(p,x,frameM,jointM,s=1){const fx=[-.13,-.045,.045,.13].map(v=>v*s);
  S(p,frameM,.38*s,.28*s,.36*s,0,-.12*s,0,0,0,0,{bev:.03});S(p,jointM,.4*s,.1*s,.3*s,0,-.27*s,.02*s);
  for(const f of fx){const a=new T.Group();a.position.set(f,-.3*s,.1*s);a.rotation.x=.35;p.add(a);S(a,frameM,.075*s,.15*s,.1*s,0,-.07*s,0,0,0,0,{bev:.015});
    const b=new T.Group();b.position.y=-.15*s;b.rotation.x=.55;a.add(b);S(b,jointM,.07*s,.13*s,.09*s,0,-.06*s,0,0,0,0,{bev:.012});}
  const th=new T.Group();th.position.set(-x*.19*s,-.2*s,.12*s);th.rotation.set(.4,0,-x*.5);p.add(th);S(th,frameM,.08*s,.18*s,.1*s,0,-.08*s,0,0,0,0,{bev:.015});}
function stencil(p,txt,col,w,h,x,y,z,rx,ry,rz,o){return Dec(p,numTex(txt,col),w,h,x,y,z,rx,ry,rz,o);}

/* ======================= VALKYRIE: battle-worn hero striker ======================= */
function valkyrie(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,frame,joint,steel}=M,s2=M.s,G=SH.gold,A=M.a;
  /* ---- pelvis & skirts ---- */
  B.part='body';
  S(pelvis,frame,.78,.42,.66,0,0,0,0,0,0,{bev:.04});CX(pelvis,joint,.22,1.24,0,-.08,0,16);
  hipsValkyrie(pelvis,legs,M);
  for(const x of [1,-1])nozzle(pelvis,M.stack,.08,.18,x*.2,-.3,-.56,-.5,0,0);
  /* ---- abdomen & chest ---- */
  Cy(spine,joint,.3,.34,.32,0,.1,0,0,0,0,18);
  P(spine,frame,mir([[0,.14],[.34,.14],[.4,.7],[0,.7]],1).concat(mir([[0,.7],[.4,.7],[.34,.14],[0,.14]],-1)),.5,'z',0,0,.06,0,0,0,{bev:.03});
  for(const x of [1,-1])P(spine,p,mir([[.12,.2],[.36,.18],[.44,.66],[.14,.7]],x),.12,'z',0,0,.3,0,0,0,{bev:.025,detach:true});
  P(spine,A,[[-.1,.2],[.1,.2],[.13,.66],[-.13,.66]],.1,'z',0,0,.32,0,0,0,{bev:.02});for(const y of [.32,.46])S(spine,frame,.3,.02,.02,0,y,.37,0,0,0,{bev:0,shadow:false});
  P(spine,s2,[[-.55,.68],[.44,.68],[.7,1.02],[.74,1.48],[.54,1.9],[-.52,1.92],[-.64,1.42]],1.6,'x',0,0,0,0,0,0,{bev:.06});
  for(const x of [1,-1]){
    P(spine,p,[[-.5,.72],[.42,.72],[.66,1.04],[.7,1.46],[.5,1.86],[-.48,1.86],[-.6,1.4]],.16,'x',x*.86,0,0,0,0,0,{bev:.04,detach:true});
    P(spine,frame,[[-.3,.9],[.3,.9],[.4,1.3],[-.2,1.4]],.04,'x',x*.95,0,0);
    P(spine,s2,mir([[.06,1.88],[.84,1.8],[.88,1.36],[.32,1.12],[.06,1.28]],x),.12,'z',0,0,.73,0,0,0,{bev:.035});
    P(spine,p,mir([[.08,1.94],[.6,1.92],[.66,1.84],[.12,1.84]],x),.18,'z',0,0,.7,0,0,0,{bev:.02});
    const v=vent(spine,G,.34,.24,4,x*.44,1.5,.8,0,0,0,.07);v.rotation.z=x*-.05;
    S(spine,frame,.12,.06,.06,x*.7,1.22,.76,0,0,0,{bev:.01});
    S(spine,joint,.38,.38,.38,x*1.12,1.62,0,0,0,0,{bev:.05});CX(spine,frame,.14,.5,x*1.0,1.62,0,12);
  }
  for(const x of [1,-1]){P(spine,s2,mir([[.04,1.28],[.3,1.36],[.74,1.1],[.7,.86],[.36,.92],[.04,.8]],x),.12,'z',0,0,.74,0,0,0,{bev:.03,detach:true});
    S(spine,frame,.4,.02,.02,x*.4,1.02,.81,0,0,x*-.42,{bev:0,shadow:false});}
  // cockpit hatch with seams
  P(spine,s2,[[-.24,1.24],[.24,1.24],[.28,.96],[.18,.86],[-.18,.86],[-.28,.96]],.1,'z',0,0,.77,0,0,0,{bev:.02,part:'pilot',detach:true});
  S(spine,frame,.4,.025,.02,0,1.1,.83,0,0,0,{bev:0,shadow:false});
  P(spine,A,[[-.14,.82],[.14,.82],[.1,.66],[-.1,.66]],.12,'z',0,0,.76,0,0,0,{bev:.02});
  Dec(spine,M.numTex,.26,.26,.52,1.0,.76,0,.35,0,{detachWith:'body'});
  // collar
  P(spine,p,[[.3,1.86],[.58,1.94],[.44,2.1],[-.3,2.1],[-.42,1.98]],1.3,'x',0,0,0,0,0,0,{bev:.04});
  S(spine,frame,.5,.1,.3,0,2.05,.1,0,0,0,{bev:.02});
  /* ---- backpack: main thrusters + saber hilts ---- */
  const bp=new T.Group();bp.position.set(0,1.38,-.78);spine.add(bp);
  P(bp,p,[[-.24,-.5],[.2,-.5],[.3,.1],[.2,.56],[-.24,.6]],1.0,'x',0,0,0,0,0,0,{bev:.05});
  S(bp,frame,.86,.9,.2,0,0,-.28,0,0,0,{bev:.03});vent(bp,frame,.5,.3,4,0,.32,-.39,0,PI,0);
  for(const x of [1,-1]){nozzle(bp,M.stack,.2,.46,x*.27,-.62,-.12,.25,0,0);nozzle(bp,M.stack,.1,.24,x*.46,-.1,-.3,.6,0,x*.3);
    const top=new T.Object3D();top.position.set(x*.27,-.9,-.05);bp.add(top);B.stackTops.push(top);
    const sb=new T.Group();sb.position.set(x*.3,.56,-.06);sb.rotation.set(-.42,0,-x*.32);bp.add(sb);
    Cy(sb,joint,.07,.07,.16,0,0,0,0,0,0,10);Cy(sb,M.p,.075,.075,.62,0,.38,0,0,0,0,12);for(let k=0;k<4;k++)Cy(sb,frame,.082,.082,.03,0,.18+k*.12,0,0,0,0,12);
    Cy(sb,steel,.09,.07,.1,0,.74,0,0,0,0,12);Cy(sb,SH.black,.05,.05,.02,0,.8,0,0,0,0,10);
    // wing binders
    const wg=new T.Group();wg.position.set(x*.5,.2,-.2);wg.rotation.set(-.35,x*-.35,x*-.5);bp.add(wg);
    P(wg,s2,[[-.1,0],[.12,0],[.06,1.3],[-.12,1.1]],.07,'x',0,0,0,0,0,0,{bev:.02});P(wg,p,[[-.06,.1],[.08,.1],[.04,1.0],[-.08,.9]],.04,'x',x*.05,0,0,0,0,0,{bev:.01});
    nozzle(wg,M.stack,.07,.14,0,-.02,0);
  }
  /* ---- head ---- */
  B.part='pilot';
  const hd=new T.Group();hd.scale.setScalar(1.12);neck.add(hd);{const n=hd;
    Cy(n,joint,.16,.18,.22,0,-.04,0,0,0,0,14);
    P(n,p,[[-.3,0],[.28,-.02],[.36,.2],[.3,.42],[-.2,.48],[-.34,.25]],.62,'x',0,0,0,0,0,0,{bev:.04});
    P(n,frame,[[-.26,.04],[.2,.02],[.24,.36],[-.18,.4]],.66,'x',0,0,0);
    P(n,p,[[-.16,.2],[.16,.2],[.1,.02],[0,-.07],[-.1,.02]],.08,'z',0,0,.33,0,0,0,{bev:.02,detach:true});
    for(const fx of [-.05,0,.05])S(n,SH.black,.02,.06,.02,fx,.08,.37,0,0,0,{bev:0,shadow:false});
    S(n,A,.08,.06,.06,0,-.02,.34,0,0,0,{bev:.01});
    for(const x of [1,-1]){B.visor.push(P(n,M.visor,mir([[.03,.24],[.2,.29],[.2,.22],[.05,.19]],x),.04,'z',0,0,.36,0,0,0,{bev:0,shadow:false}));
      P(n,frame,mir([[.02,.3],[.22,.33],[.22,.18],[.04,.15]],x),.03,'z',0,0,.345,0,0,0,{bev:0});
      P(n,G,mir([[0,.36],[.1,.4],[.66,.8],[.63,.84],[.06,.5]],x),.05,'z',0,0,.3,0,0,0,{bev:.012});
      CX(n,frame,.06,.1,x*.33,.3,.14,10);CX(n,steel,.035,.12,x*.36,.3,.14,8);  // vulcans
      P(n,p,[[-.24,.06],[.16,.06],[.12,.36],[-.2,.36]],.05,'x',x*.33,0,0,0,0,0,{bev:.015});
      CX(n,M.visor,.03,.02,x*.375,.22,-.08,8,{shadow:false});
    }
    S(n,A,.08,.12,.06,0,.4,.33,0,0,0,{bev:.01});P(n,p,[[-.28,.44],[.2,.44],[.12,.56],[-.22,.54]],.16,'x',0,0,0,0,0,0,{bev:.02});
    Cy(n,frame,.02,.02,.4,-.16,.62,-.22,-.4,0,.2,6);Cy(n,SH.red,.025,.025,.03,-.2,.8,-.3,0,0,0,6);  // rear sensor whip (asymmetric)
  }
  /* ---- arms ---- */
  for(const x of [1,-1]){const Ar=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    // layered pauldron
    pauldron(Ar,x,M,{w:.78,top:.86,bot:-.14,d:1.06,style:'hero',dec:x>0?M.numTex:null,decS:.42});
    nozzle(Ar.paul,M.stack,.07,.14,x*.5,-.1,-.3,.4,0,0);
    // upper arm
    CX(Ar.sh,joint,.24,.48,0,0,0,16);S(Ar.sh,frame,.32,.95,.36,0,-.52,0,0,0,0,{bev:.03});
    P(Ar.sh,p,[[-.22,-.15],[.24,-.12],[.26,-.8],[-.2,-.86]],.48,'x',0,0,0,0,0,0,{bev:.04});
    P(Ar.sh,frame,[[-.16,-.3],[.18,-.3],[.18,-.7],[-.14,-.72]],.04,'x',x*.25,0,0);
    piston(Ar.sh,[0,-.3,-.24],Ar.el,[0,-.42,-.32],.055);
    // elbow + forearm
    CX(Ar.el,joint,.22,.5,0,0,0,16);
    P(Ar.el,p,[[-.34,.12],[-.16,.12],[-.14,-.2],[-.38,-.1]],.44,'x',0,0,0,0,0,0,{bev:.03});
    P(Ar.el,p,[[-.26,-.05],[.28,-.05],[.36,-.55],[.3,-.95],[-.26,-.98],[-.32,-.5]],.56,'x',0,0,0,0,0,0,{bev:.05});
    P(Ar.el,p,[[-.2,-.12],[.22,-.12],[.28,-.52],[.22,-.86],[-.2,-.88]],.06,'x',x*.3,0,0,0,0,0,{bev:.02,detach:true});
    S(Ar.el,frame,.03,.6,.03,x*.34,-.5,.12,0,0,0,{bev:0});
    S(Ar.el,s2,.6,.15,.62,0,-.88,0,0,0,0,{bev:.03,detach:true});S(Ar.el,G,.62,.04,.64,0,-.79,0,0,0,0,{bev:0});
    P(Ar.el,A,[[.2,-.1],[.42,-.3],[.36,-.6],[.26,-.6]],.4,'x');
    bolts(Ar.el,[[x*.33,-.3,-.15],[x*.33,-.3,.15]],'x');
    hand(Ar.wr,x,frame,joint);
  }
  /* ---- legs ---- */
  B.part='legs';
  legs.forEach((L,i)=>{const x=i===0?1:-1;
    CX(L.hip,joint,.26,.5,0,0,0,16);S(L.hip,frame,.38,1.3,.4,0,-.72,0,0,0,0,{bev:.03});
    P(L.hip,p,[[-.26,-.2],[.32,-.18],[.36,-.7],[.26,-1.25],[-.2,-1.28],[-.32,-.7]],.62,'x',0,0,0,0,0,0,{bev:.05});
    P(L.hip,s2,[[-.2,-.3],[.24,-.3],[.26,-.9],[-.16,-.95]],.06,'x',x*.33,0,0,0,0,0,{detach:true,bev:.02});
    P(L.hip,p,[[.2,-.3],[.38,-.36],[.36,-1.0],[.24,-1.06]],.5,'x',0,0,0,0,0,0,{bev:.03,detach:true});
    vent(L.hip,frame,.22,.28,3,x*.32,-.66,-.1,0,x*PI/2,0,.04);
    piston(L.hip,[0,-.5,-.28],L.kn,[0,-.4,-.48],.065);
    CX(L.kn,joint,.26,.56,0,0,0,16);
    P(L.kn,p,[[.1,.52],[.58,.2],[.6,-.32],[.3,-.42],[.08,0]],.6,'x',0,0,0,0,0,0,{detach:true});
    P(L.kn,s2,[[-.16,.3],[.16,.3],[.12,-.02],[0,-.18],[-.12,-.02]],.06,'z',0,0,.62,-.5,0,0,{bev:.015});
    P(L.kn,p,[[-.38,-.1],[.3,-.18],[.42,-.6],[.36,-1.35],[-.34,-1.4],[-.56,-.7]],.72,'x',0,0,0,0,0,0,{bev:.06});
    P(L.kn,p,[[.32,-.5],[.5,-.58],[.46,-1.2],[.34,-1.24]],.52,'x',0,0,0,0,0,0,{detach:true,bev:.03});
    P(L.kn,s2,[[.34,-.66],[.47,-.7],[.44,-1.1],[.36,-1.12]],.3,'x',0,0,0,0,0,0,{bev:.015});
    P(L.kn,p,[[-.3,-.3],[.2,-.36],[.28,-1.1],[-.36,-1.16],[-.5,-.7]],.05,'x',x*.37,0,0,0,0,0,{detach:true,bev:.02});
    vent(L.kn,frame,.5,.6,5,0,-.8,-.6,.12,PI,0,.08);
    for(const sx of [1,-1])P(L.kn,p,mir([[.02,-.5],[.26,-.56],[.4,-1.32],[.02,-1.38]],sx),.08,'z',0,0,.4,0,0,0,{bev:.025,detach:sx>0});
    S(L.kn,frame,.02,.82,.02,0,-.95,.45,0,0,0,{bev:0,shadow:false});
    nozzle(L.kn,M.stack,.1,.2,0,-1.25,-.42,.3,0,0);
    S(L.kn,A,.04,.5,.06,x*.39,-.75,.2,0,0,0,{bev:0});
    CX(L.an,joint,.22,.52,0,0,0,14);S(L.an,A,.5,.32,.3,0,.04,.3,0,0,0,{bev:.04});S(L.an,G,.14,.08,.04,0,.1,.46,0,0,0,{bev:.01});
    P(L.an,A,[[-.5,-.34],[.92,-.34],[1.02,-.24],[.45,.02],[.2,.12],[-.35,.12],[-.55,-.1]],.62,'x',0,0,0,0,0,0,{bev:.05});
    P(L.an,s2,[[.5,-.2],[.98,-.26],[.5,-.04]],.5,'x',0,0,0,0,0,0,{bev:.02});
    P(L.an,frame,[[-.55,-.3],[-.72,-.34],[-.7,-.16],[-.5,-.08]],.4,'x');
    S(L.an,joint,.64,.06,1.5,0,-.33,.22,0,0,0,{bev:.02});
  });
  B.kit(1,()=>{for(const x of [1,-1]){S(arms[x>0?'L':'R'].paul,p,.1,.4,.8,x*.8,.3,0);bolts(arms[x>0?'L':'R'].paul,[[x*.85,.4,-.3],[x*.85,.4,.3]],'x');}});
  legs.forEach(L=>greave(L,M,{w:.88,fz:.5,bz:-.62,top:-.22,bot:-1.42}));
  B.kit(2,()=>legs.forEach(L=>{S(L.kn,s2,.3,.5,.08,0,-.9,.5,-.06);bolts(L.kn,[[.1,-.72,.55],[-.1,-.72,.55]],'z');}));
  B.kit(3,()=>{S(spine,p,.9,.26,.1,0,1.25,.83);});
  Dec(spine,scarTex(3),.5,.5,-.3,1.5,.82,0,0,.4,{detachWith:'body'});Dec(arms.L.paul,scarTex(5),.5,.5,.778,.1,.2,0,PI/2,0,{detachWith:'left'});
  Dec(legs[1].kn,scarTex(7),.5,.6,0,-.9,.49,0,0,1.2,{detachWith:'legs'});Dec(legs[0].hip,scarTex(11),.4,.4,.0,-.6,.34,0,0,0,{detachWith:'legs'});
  /* ---- shield ---- */
  B.part='left';const sh=new T.Group();sh.position.set(.46,-.55,.1);arms.L.el.add(sh);
  P(sh,p,[[-.62,1.06],[.62,1.06],[.7,-.3],[0,-1.5],[-.7,-.3]],.12,'x',0,0,0,0,0,0,{bev:.04});
  P(sh,A,[[-.5,.94],[.5,.94],[.57,-.26],[0,-1.3],[-.57,-.26]],.06,'x',.07,0,0,0,0,0,{bev:.02,detach:true});
  S(sh,G,.04,.9,.12,.11,.0,0,0,0,0,{bev:.01});S(sh,G,.04,.12,.7,.11,.5,0,0,0,0,{bev:.01});
  S(sh,frame,.2,.5,.3,-.1,.1,0,0,0,0,{bev:.02});S(sh,frame,.06,1.6,.12,-.08,-.1,0,0,0,0,{bev:.01});Dec(sh,scarTex(13),.9,.9,.141,-.2,-.1,0,PI/2,0,{detachWith:'left'});Dec(sh,scarTex(17),.6,.6,.141,.6,.3,0,PI/2,0,{detachWith:'left'});
  bolts(sh,[[.13,.9,-.4],[.13,.9,.4],[.13,-.2,-.5],[.13,-.2,.5]],'x');
  B.shield=sh;
}

/* ---------- lamellar plate stack (samurai tassets / sode) ---------- */
function lamellar(p,mats,trim,w,n,x,y,z,rx,ry,rz,o={}){const g=new T.Group();g.position.set(x,y,z);g.rotation.set(rx||0,ry||0,rz||0);p.add(g);const h=o.h||.24,fl=o.flare??.05;
  for(let k=0;k<n;k++){const ww=w*(1+k*fl),yy=-k*h*.78,zz=k*.035;P(g,mats[k%mats.length],[[-ww/2,.02],[ww/2,.02],[ww/2+.02,-h],[-ww/2-.02,-h]],.07,'z',0,yy,zz,0,0,0,{bev:.022,detach:o.detach&&k===n-1});
    S(g,SH.frame,ww*.92,.022,.02,0,yy-h*.55,zz+.045,0,0,0,{bev:0,shadow:false});}
  S(g,trim,w*(1+(n-1)*fl)+.04,.05,.08,0,-(n-1)*h*.78-h+.01,(n-1)*.035+.005,0,0,0,{bev:.01});
  for(const sx of [-1,1])Cy(g,SH.frame,.022,.022,.05,sx*w*.36,-.02,.05,PI/2,0,0,6);return g;}
function spike(p,mat,r,len,x,y,z,rx,ry,rz){const m=Cy(p,mat,0,r,len,x,y,z,rx,ry,rz,6);return m;}

/* ======================= ONI: heavy melee assassin (AC heavyweight) ======================= */
function oni(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,frame,joint,steel}=M,s2=M.s,A=M.a;
  /* ---- pelvis, belt, tassets ---- */
  B.part='body';
  S(pelvis,frame,1.05,.5,.8,0,0,0,0,0,0,{bev:.04});CX(pelvis,joint,.26,1.62,0,-.1,0,18);
  hipsOni(pelvis,legs,M);
  /* ---- abdomen & hunched core ---- */
  Cy(spine,joint,.42,.48,.38,0,.12,0,0,0,0,20);for(let i=0;i<3;i++)Cy(spine,frame,.5-i*.02,.5-i*.02,.05,0,.08+i*.12,0,0,0,0,20);
  S(spine,s2,.82,.22,.34,0,.32,.36,0,0,0,{bev:.03});
  P(spine,p,[[-.75,.5],[.45,.55],[.85,.85],[.95,1.35],[.75,1.75],[-.45,1.95],[-.9,1.5],[-.85,.9]],2.0,'x',0,0,0,0,0,0,{bev:.07});
  for(const x of [1,-1]){
    P(spine,s2,mir([[.05,1.72],[.98,1.6],[1.05,1.22],[.56,.94],[.12,.82],[.05,1.3]],x),.14,'z',0,0,.96,0,0,0,{bev:.04,detach:true});
    P(spine,p,mir([[.12,1.62],[.86,1.52],[.9,1.3],[.54,1.12],[.14,1.24]],x),.08,'z',0,0,1.05,0,0,0,{bev:.025});
    S(spine,A,.5,.03,.02,x*.5,1.18,1.1,0,0,x*.42,{bev:0});
    for(let k=0;k<3;k++)B.visor.push(S(spine,M.visor,.18,.03,.03,x*(.66-k*.05),1.0-k*.08,1.02,0,0,x*.25,{bev:0,shadow:false}));
    // raised collar that buries the head
    P(spine,s2,[[-.4,1.55],[.52,1.6],[.6,2.18],[.1,2.3],[-.3,2.0]],.12,'x',x*.5,0,0,0,0,x*-.22,{bev:.03});
    P(spine,p,[[-.3,1.62],[.44,1.66],[.5,2.08],[.12,2.18]],.05,'x',x*.58,0,0,0,0,x*-.22,{bev:.015});
    vent(spine,frame,.5,.42,4,x*1.0,1.2,0,0,x*PI/2,0,.06);
    S(spine,joint,.44,.48,.48,x*1.25,1.55,0,0,0,0,{bev:.05});
  }
  P(spine,A,[[-.12,1.7],[.12,1.7],[0,.88]],.18,'z',0,0,1.04,0,0,0,{bev:.03});
  Dec(spine,clawTex('#e6dfca'),.34,.34,-.38,1.42,1.06,0,0,0,{detachWith:'body'});Dec(spine,scarTex(21),.6,.6,.5,1.25,1.1,0,0,.6,{detachWith:'body'});
  // back: hump, boosters, scabbard, cables
  P(spine,s2,[[-.3,-.6],[.3,-.55],[.36,.3],[-.2,.42]],1.3,'x',0,1.2,-.9,0,0,0,{bev:.05});
  for(const x of [1,-1]){nozzle(spine,M.stack,.24,.5,x*.4,.75,-1.1,.45,0,0);const top=new T.Object3D();top.position.set(x*.4,.45,-1.3);spine.add(top);B.stackTops.push(top);
    tube(spine,SH.rubber,[[x*.62,1.55,-.7],[x*.75,1.1,-.95],[x*.5,.75,-1.05]],.05,12);}
  vent(spine,frame,.7,.4,5,0,1.45,-1.2,0,PI,0,.07);
  for(const x of [1,-1]){nozzle(spine,M.stack,.16,.36,x*.32,1.55,-1.32,.7,0,x*.2);S(spine,frame,.34,.5,.3,x*.32,1.75,-1.2,.3,0,0,{bev:.03});}
  /* ---- head: kabuto + mempo + mono-eye ---- */
  B.part='pilot';
  const hd=new T.Group();hd.scale.setScalar(1.08);neck.add(hd);{const n=hd;
    Cy(n,joint,.24,.28,.26,0,-.06,0,0,0,0,14);
    P(n,s2,[[-.38,-.05],[.32,-.08],[.48,.12],[.36,.38],[-.3,.42],[-.44,.2]],.82,'x',0,0,0,0,0,0,{bev:.05});
    P(n,p,[[-.42,.3],[.3,.34],[.44,.46],[-.1,.6],[-.5,.46]],.9,'x',0,0,0,0,0,0,{bev:.04});
    P(n,p,[[-.28,.22],[.28,.22],[.24,0],[.1,-.12],[0,-.04],[-.1,-.12],[-.24,0]],.1,'z',0,0,.42,0,0,0,{bev:.02,detach:true});
    for(const fx of [-.08,0,.08])S(n,SH.black,.03,.08,.02,fx,.02,.48,0,0,0,{bev:0,shadow:false});
    S(n,SH.black,.52,.08,.06,0,.29,.45,0,0,0,{bev:0});B.visor.push(S(n,M.visor,.16,.05,.03,.05,.29,.48,0,0,0,{bev:0,shadow:false}));
    for(const x of [1,-1]){P(n,A,mir([[.16,.44],[.32,.48],[.66,1.0],[.6,1.02],[.2,.56]],x),.07,'z',0,0,.2,0,0,0,{bev:.015});
      P(n,s2,[[-.36,-.02],[.24,-.02],[.3,.3],[-.3,.34]],.08,'x',x*.42,0,0,0,0,x*.2,{bev:.02});}
    P(n,A,[[-.05,.52],[.05,.52],[0,.82]],.06,'z',0,0,.32,0,0,0,{bev:.01});}
  /* ---- arms: asymmetric ---- */
  for(const x of [1,-1]){const Ar=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    if(x>0){ // big layered sode on the guard side
      pauldron(Ar,x,M,{w:1.08,top:1.02,bot:-.12,d:1.42,style:'samurai',dec:scarTex(23),decS:.6});
      spike(Ar.paul,A,.09,.55,x*.62,1.14,.25,0,0,x*-.4);spike(Ar.paul,s2,.07,.4,x*.42,1.1,-.38,0,0,x*-.25);
    }else{ // compact strike shoulder with exposed actuator
      pauldron(Ar,x,M,{w:.74,top:.8,bot:.0,d:1.1,style:'mil'});CZ(Ar.paul,joint,.16,.5,x*.3,-.1,-.6,12);CZ(Ar.paul,steel,.07,.7,x*.3,-.1,-.75,10);
      spike(Ar.paul,A,.07,.4,x*.5,.85,0,0,0,x*-.5);
    }
    CX(Ar.sh,joint,.32,.6,0,0,0,18);S(Ar.sh,frame,.48,1.0,.5,0,-.55,0,0,0,0,{bev:.04});
    P(Ar.sh,s2,[[-.34,-.14],[.38,-.12],[.42,-.76],[-.32,-.84]],.66,'x',0,0,0,0,0,0,{bev:.05});
    P(Ar.sh,p,[[-.24,-.2],[.3,-.2],[.32,-.66],[-.2,-.7]],.05,'x',x*.35,0,0,0,0,0,{bev:.015});
    piston(Ar.sh,[0,-.3,-.34],Ar.el,[0,-.45,-.46],.08);
    CX(Ar.el,joint,.3,.66,0,0,0,18);
    P(Ar.el,p,[[-.45,-.05],[.42,-.05],[.55,-.45],[.5,-1.0],[-.4,-1.08],[-.5,-.5]],.82,'x',0,0,0,0,0,0,{bev:.06});
    P(Ar.el,s2,[[-.36,-.15],[.36,-.15],[.46,-.48],[.4,-.9],[-.32,-.95]],.06,'x',x*.43,0,0,0,0,0,{bev:.02,detach:true});
    S(Ar.el,s2,.88,.12,.9,0,-.16,0,0,0,0,{bev:.02});S(Ar.el,A,.9,.03,.92,0,-.1,0,0,0,0,{bev:0});
    P(Ar.el,s2,[[-.5,.15],[-.2,.12],[-.2,-.25],[-.56,-.12]],.5,'x',0,0,0,0,0,0,{bev:.03});
    if(x>0)for(let k=0;k<3;k++)P(Ar.el,A,[[-.1,0],[.2,0],[-.25,.42]],.05,'z',x*.5,-.3-k*.24,-.1+k*.1,0,0,x*-1.25,{bev:.01});
    else{S(Ar.el,frame,.2,.7,.5,x*.48,-.55,0,0,0,0,{bev:.02});for(let k=0;k<4;k++)S(Ar.el,A,.22,.03,.52,x*.48,-.28-k*.16,0,0,0,0,{bev:0});}
    bolts(Ar.el,[[x*.46,-.3,-.2],[x*.46,-.3,.2],[x*.46,-.8,0]],'x',.035);
    hand(Ar.wr,x,frame,joint,1.25);
  }
  /* ---- legs ---- */
  B.part='legs';
  legs.forEach((L,i)=>{const x=i===0?1:-1;
    CX(L.hip,joint,.32,.6,0,0,0,18);S(L.hip,frame,.5,1.25,.55,0,-.7,0,0,0,0,{bev:.04});
    P(L.hip,s2,[[-.32,-.2],[.44,-.18],[.52,-.6],[.4,-1.18],[-.2,-1.22],[-.44,-.7]],.8,'x',0,0,0,0,0,0,{bev:.06});
    P(L.hip,p,[[-.1,-.25],[.48,-.24],[.52,-1.0],[.2,-1.1]],.6,'x',0,0,0,0,0,0,{bev:.04,detach:true});
    P(L.hip,p,[[-.26,-.3],[.36,-.3],[.4,-.98],[-.16,-1.02]],.06,'x',x*.43,0,0,0,0,0,{bev:.02});
    piston(L.hip,[0,-.55,-.32],L.kn,[0,-.42,-.5],.08);piston(L.hip,[x*.3,-.3,.1],L.kn,[x*.38,-.3,.2],.05);
    CX(L.kn,joint,.3,.68,0,0,0,18);
    P(L.kn,p,[[.1,.5],[.82,.28],[.66,-.24],[.2,-.3]],.6,'x',0,0,0,0,0,0,{detach:true,bev:.04});
    P(L.kn,s2,[[.2,.4],[.7,.22],[.6,-.1],[.24,-.14]],.66,'x',0,0,0,0,0,0,{bev:.03});S(L.kn,A,.62,.035,.04,0,.02,.74,-.9,0,0,{bev:0});
    spike(L.kn,A,.1,.5,0,.36,.66,PI/2-.6,0,0);
    P(L.kn,p,[[-.42,-.12],[.32,-.2],[.52,-.55],[.44,-1.3],[-.3,-1.36],[-.52,-.75]],.84,'x',0,0,0,0,0,0,{bev:.06});
    for(const sx of [1,-1])P(L.kn,s2,mir([[.02,-.28],[.36,-.34],[.46,-1.3],[.02,-1.36]],sx),.1,'z',0,0,.5,0,0,0,{bev:.03,detach:sx>0});
    S(L.kn,A,.04,.95,.04,0,-.82,.56,0,0,0,{bev:0});
    P(L.kn,p,[[-.36,-.3],[.3,-.36],[.36,-1.2],[-.3,-1.26],[-.5,-.75]],.06,'x',x*.45,0,0,0,0,0,{bev:.02});
    vent(L.kn,frame,.56,.5,4,0,-.7,-.56,.15,PI,0,.07);nozzle(L.kn,M.stack,.12,.24,x*.15,-1.2,-.4,.35,0,0);
    piston(L.kn,[x*.48,-.9,.3],L.an,[x*.48,.08,.5],.06);
    CX(L.an,joint,.25,.64,0,0,0,16);S(L.an,s2,.6,.34,.4,0,.04,.32,0,0,0,{bev:.04});
    P(L.an,s2,[[-.6,-.34],[1.15,-.34],[1.26,-.26],[.6,0],[.2,.14],[-.4,.12],[-.62,-.1]],.94,'x',0,0,0,0,0,0,{bev:.05});
    for(const fx of [-.3,0,.3])P(L.an,A,[[.9,-.32],[1.55,-.34],[1.12,-.12]],.18,'x',fx,0,0,0,fx*.3,0,{bev:.015});
    S(L.an,joint,.98,.06,1.86,0,-.33,.3,0,0,0,{bev:.02});P(L.an,frame,[[-.55,-.3],[-1.0,-.36],[-.92,-.2],[-.5,-.04]],.4,'x');
  });
  Dec(legs[0].kn,scarTex(29),.6,.6,0,-.9,.56,0,0,0,{detachWith:'legs'});
  B.kit(1,()=>{for(const x of [1,-1])S(arms[x>0?'L':'R'].paul,s2,.12,.6,1.2,x*(x>0?1.12:.84),.4,0);});
  legs.forEach(L=>greave(L,M,{w:1.02,fz:.6,bz:-.6,top:-.16,bot:-1.38}));
  B.kit(2,()=>legs.forEach(L=>{P(L.kn,s2,[[.5,-.42],[.72,-.6],[.68,-1.18],[.56,-1.2],[.58,-.6]],.72,'x');}));
  B.kit(3,()=>{for(const x of [1,-1])S(spine,s2,.62,.42,.12,x*.56,1.42,1.1);});
  /* ---- guard vambrace (shield) ---- */
  B.part='left';const sh=new T.Group();sh.position.set(.6,-.55,.14);arms.L.el.add(sh);
  P(sh,s2,[[-.66,.46],[.54,.52],[.68,-.2],[.14,-1.0],[-.56,-.32]],.1,'x',0,0,0,0,0,0,{bev:.03});
  P(sh,p,[[-.5,.36],[.42,.4],[.54,-.16],[.1,-.8],[-.42,-.26]],.05,'x',.07,0,0,0,0,0,{bev:.015,detach:true});
  S(sh,A,.04,.06,.9,.1,.3,0,0,0,0,{bev:0});S(sh,frame,.22,.3,.3,-.1,0,0);bolts(sh,[[.11,.2,-.35],[.11,.2,.35],[.11,-.4,0]],'x');
  B.shield=sh;
}

/* Authored Gatecrasher core, refitted to Behemoth's spine. Decode geometry lazily
   so the other Foundry chassis do not allocate the imported vertex buffers. */
let behemothCoreGeometry;
function gatecrasherCore(spine,neck,M){
  const source=window.IronVowBehemothCore;
  if(!source)throw Error('Behemoth core geometry is unavailable');
  if(!behemothCoreGeometry){
    const unpack=(s,Type)=>{const raw=atob(s),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);};
    behemothCoreGeometry=source.meshes.map(spec=>{
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.BufferAttribute(Float32Array.from(unpack(spec.positions,Int16Array),v=>v/4096),3));
      g.setAttribute('normal',new T.BufferAttribute(Float32Array.from(unpack(spec.normals,Int8Array),v=>v/127),3));
      g.setAttribute('uv',new T.BufferAttribute(unpack(spec.uvs,Float32Array),2));
      g.setIndex(new T.BufferAttribute(unpack(spec.index,Uint16Array),1));
      g.computeBoundingSphere();return g;
    });
  }
  const materials={armor:M.p,plate:M.s,paint:M.a,badge:M.a,frame:M.frame,steel:M.steel,
    chrome:M.steel,void:SH.black,rubber:SH.rubber,optic:M.visor,signal:SH.red};
  source.meshes.forEach((spec,i)=>{
    // The raised number belongs to Gatecrasher; Behemoth keeps its own 22 decal.
    if(spec.material==='mark')return;
    const mat=materials[spec.material];
    if(!mat)throw Error('Unmapped Behemoth core material '+spec.material);
    B.part=spec.part;
    const mesh=new T.Mesh(behemothCoreGeometry[i],mat);
    mesh.name='BHM Gatecrasher '+spec.part+' / '+spec.material;
    (spec.part==='pilot'?neck:spine).add(mesh);
    reg(mesh,mat,{part:spec.part,detach:spec.material==='plate'||spec.material==='badge'});
    if(spec.material==='optic')B.visor.push(mesh);
  });
  B.part='body';
  Dec(spine,M.numTex,.396,.396,-.8547,1.818,1.0258,0,0,0,{detachWith:'body'});
}

/* ======================= BEHEMOTH: Gatecrasher core on a tetrapod artillery base ======================= */
function behemoth(K,M){
  const {pelvis,spine,neck,arms,legs}=K,{p,frame,joint,steel}=M,s2=M.s,A=M.a;
  B.part='body';
  /* ---- hull: sloped glacis, side skirts, engine deck ---- */
  P(pelvis,p,[[-1.5,-.28],[1.25,-.3],[1.75,.05],[1.45,.5],[-1.35,.56],[-1.72,.15]],1.9,'x',0,0,0,0,0,0,{bev:.09});
  S(pelvis,frame,1.6,.3,2.7,0,-.42,0,0,0,0,{bev:.04});for(let k=0;k<5;k++)S(pelvis,joint,1.64,.04,.08,0,-.5,-1.1+k*.55,0,0,0,{bev:0});
  P(pelvis,s2,[[1.2,.45],[1.62,.08],[1.78,.1],[1.5,.56]],1.7,'x',0,0,0,0,0,0,{bev:.03});
  for(let k=0;k<3;k++)S(pelvis,frame,1.3,.025,.02,0,.18+k*.1,1.6-k*.08,-.85,0,0,{bev:0,shadow:false});
  for(const x of [1,-1]){
    P(pelvis,s2,[[-1.3,.42],[1.25,.42],[1.38,-.1],[1.0,-.35],[-1.0,-.35],[-1.38,-.05]],.1,'x',x*1.0,0,0,0,0,x*.06,{bev:.03,detach:true});
    P(pelvis,p,[[-1.1,.36],[1.0,.36],[1.1,-.04],[-1.14,-.02]],.05,'x',x*1.06,0,0,0,0,x*.06,{bev:.015});
    S(pelvis,hazardMat(6),.11,.1,2.0,x*1.08,.4,0,0,0,x*.06,{bev:.01});
    for(const z of [-.7,0,.7])bolts(pelvis,[[x*1.09,.2,z]],'x',.04);
    for(const z of [1,-1]){const hm=new T.Group();hm.position.set(x*.95,-.05,z*1.05);pelvis.add(hm);
      Cy(hm,joint,.42,.46,.36,0,.05,0,0,0,0,20);Cy(hm,frame,.5,.5,.1,0,.26,0,0,0,0,20);Cy(hm,s2,.36,.44,.18,0,.36,0,0,0,0,8);
      for(let k=0;k<6;k++){const a=k/6*PI*2;S(hm,frame,.08,.3,.05,Math.cos(a)*.47,.05,Math.sin(a)*.47,0,-a,0,{bev:0});}}
  }
  Dec(pelvis,M.numTex,.6,.6,1.12,.05,.4,0,PI/2,0,{detachWith:'body'});Dec(pelvis,stripeTex('#e9e3d0'),.6,.6,-1.12,.05,.4,0,-PI/2,0,{detachWith:'body'});
  Dec(pelvis,scarTex(31),.8,.8,-1.12,.1,-.5,0,-PI/2,0,{detachWith:'body'});
  // glacis ERA bricks, spaced side skirts on brackets, V-hull belly, bar armor around the engine
  for(let r=0;r<2;r++)for(let c=0;c<5;c++){const g2=new T.Group();g2.position.set((c-2)*.32,.17+r*.2,1.63-r*.13);g2.rotation.x=-.58;pelvis.add(g2);
    S(g2,s2,.29,.17,.09,0,0,0,0,0,0,{bev:.012,detach:r===1&&c===3});S(g2,frame,.29,.02,.1,0,-.06,0,0,0,0,{bev:0});bolts(g2,[[-.1,.05,.05],[.1,.05,.05]],'z',.015);}
  for(const x of [1,-1]){const sg=new T.Group();sg.position.set(x*1.26,.3,0);pelvis.add(sg);
    S(sg,frame,.06,.06,1.1,0,0,0,0,0,0,{bev:.01});for(const z of [-.4,.4])S(sg,frame,.16,.06,.06,-x*.08,0,z,0,0,0,{bev:0});
    [-.27,.27].forEach((z,i)=>{const pg=new T.Group();pg.position.set(0,-.03,z);pg.rotation.z=x*(i?.05:.02);sg.add(pg);
      S(pg,i?s2:p,.05,.58,.5,0,-.3,0,0,0,0,{bev:.012,detach:i===1});S(pg,M.a,.055,.03,.5,0,-.58,0,0,0,0,{bev:0});bolts(pg,[[x*.03,-.08,-.18],[x*.03,-.08,.18],[x*.03,-.5,-.18],[x*.03,-.5,.18]],'x',.018);});}
  P(pelvis,s2,[[-.95,0],[.95,0],[0,-.36]],2.3,'z',0,-.52,0,0,0,0,{bev:.03});for(const z of [-.8,0,.8])P(pelvis,frame,[[-.9,0],[.9,0],[0,-.34]],.05,'z',0,-.53,z);
  {const sl=new T.Group();sl.position.set(0,.2,-2.18);pelvis.add(sl);for(const x of [1,-1])S(sl,frame,.05,.7,.05,x*.8,-.15,0,0,0,0,{bev:0});for(let k=0;k<5;k++)S(sl,steel,1.66,.03,.03,0,.15-k*.13,0,0,0,0,{bev:0});
    for(const x of [1,-1])S(sl,frame,.05,.05,.3,x*.8,.15,.15,0,0,0,{bev:0});}
  for(const x of [1,-1])for(const z of [1,-1])Cy(pelvis,p,.5,.56,.1,x*.95,.4,z*1.05,0,0,0,8);
  // rear engine block
  S(pelvis,s2,1.5,.6,.5,0,.15,-1.75,0,0,0,{bev:.05});vent(pelvis,frame,1.1,.4,6,0,.18,-2.0,0,PI,0,.06);
  for(const x of [1,-1]){Cy(pelvis,joint,.18,.24,.5,x*.55,.4,-1.95,PI/2+.3,0,0,14);Cy(pelvis,M.stack,.16,.16,.02,x*.55,.32,-2.19,PI/2+.3,0,0,14,{shadow:false});const top=new T.Object3D();top.position.set(x*.55,.3,-2.25);pelvis.add(top);B.stackTops.push(top);
    tube(pelvis,SH.rubber,[[x*.75,.5,-1.5],[x*.95,.62,-1.0],[x*1.05,.5,-.6]],.05,12);}
  /* Gatecrasher's inset cockpit and layered chest sit on the tetrapod slew ring. */
  B.part='body';
  Cy(spine,joint,.68,.79,.27,0,.07,0,0,0,0,24);
  Cy(spine,frame,.78,.78,.078,0,.22,0,0,0,0,24);
  gatecrasherCore(spine,neck,M);
  // Raised rear saddle clears the cockpit and preserves the independent mortar track.
  const gun=J('mortar.elevation',spine,-.847,2.61,-1.095);
  for(const x of [-1.144,-.55])S(spine,frame,.13,.42,.61,x,2.346,-1.095,0,0,0,{bev:.025});
  S(spine,s2,.79,.16,.80,-.847,2.522,-1.095,0,0,0,{bev:.045});
  CX(gun,steel,.237,.68,0,0,0,18);
  S(gun,frame,.47,.41,.67,0,0,.18,0,0,0,{bev:.066});
  const barrel=J('mortar.recoil',gun,0,0,0);
  CZ(barrel,steel,.217,.56,0,.015,.50,20);
  Cy(barrel,s2,.103,.229,1.09,0,.015,1.16,PI/2,0,0,20);
  CZ(barrel,frame,.135,.069,0,.015,1.704,20);
  CZ(barrel,SH.black,.077,.020,0,.015,1.744,18,{shadow:false});
  S(barrel,A,.23,.045,.22,0,.205,.55,0,0,0,{bev:.012});
  J('mortar.muzzle',barrel,0,.015,1.76);
  gun.rotation.x=-.18;
  B.motionAnchors.push(gun,barrel);
  /* ---- heavy arms ---- */
  for(const x of [1,-1]){const Ar=arms[x>0?'L':'R'];B.part=x>0?'left':'right';
    pauldron(Ar,x,M,{w:.96,top:.96,bot:-.12,d:1.3,style:'heavy',dec:x>0?M.numTex:stripeTex('#e9e3d0'),decS:.56});
    CX(Ar.sh,joint,.32,.6,0,0,0,18);S(Ar.sh,frame,.46,.95,.5,0,-.52,0,0,0,0,{bev:.04});
    P(Ar.sh,p,[[-.34,-.14],[.38,-.12],[.42,-.74],[-.32,-.8]],.64,'x',0,0,0,0,0,0,{bev:.05});
    P(Ar.sh,s2,[[-.24,-.24],[.3,-.24],[.32,-.66],[-.2,-.7]],.05,'x',x*.34,0,0,0,0,0,{bev:.015,detach:true});
    piston(Ar.sh,[0,-.3,-.32],Ar.el,[0,-.45,-.44],.075);
    CX(Ar.el,joint,.29,.64,0,0,0,18);
    P(Ar.el,p,[[-.42,-.05],[.4,-.05],[.5,-.42],[.46,-.98],[-.38,-1.04],[-.48,-.5]],.8,'x',0,0,0,0,0,0,{bev:.06});
    P(Ar.el,s2,[[-.32,-.15],[.34,-.15],[.42,-.46],[.36,-.88],[-.3,-.92]],.06,'x',x*.42,0,0,0,0,0,{bev:.02,detach:true});
    S(Ar.el,s2,.84,.12,.86,0,-.16,0,0,0,0,{bev:.02});S(Ar.el,hazardMat(3),.86,.06,.88,0,-.08,0,0,0,0,{bev:0});
    CX(Ar.el,frame,.2,.2,x*.48,-.55,-.1,12);CX(Ar.el,steel,.12,.24,x*.5,-.55,-.1,10);
    bolts(Ar.el,[[x*.45,-.3,-.22],[x*.45,-.3,.22],[x*.45,-.82,0]],'x',.035);
    hand(Ar.wr,x,frame,joint,1.15);
  }
  /* Deep greave shells with a flat, bevel-edged strike face. */
  B.part='legs';
  legs.forEach(L=>{
    CX(L.hip,joint,.29,.64,0,0,0,18);
    S(L.hip,frame,.36,1.46,.42,0,-.74,0,0,0,0,{bev:.035});
    S(L.hip,p,.61,1.17,.55,0,-.70,.055,0,0,0,{bev:.083});
    S(L.hip,s2,.53,.97,.16,0,-.70,.36,0,0,0,{bev:.042});
    piston(L.hip,[.29,-.50,-.14],L.kn,[.29,-.38,-.16],.077);
    piston(L.hip,[-.29,-.50,-.14],L.kn,[-.29,-.38,-.16],.077);
    CX(L.kn,joint,.25,.67,0,0,0,18);
    for(const x of [-1,1])CX(L.kn,steel,.132,.092,x*.351,0,0,16);
    P(L.kn,frame,[[-.33,-.26],[.33,-.26],[.39,-.48],[.32,-1.52],[.17,-1.70],[-.18,-1.70],[-.32,-1.54],[-.39,-.48]],.54,'z',0,0,.028,0,0,0,{bev:.053});
    P(L.kn,p,[[-.34,-.31],[.34,-.31],[.43,-.48],[.37,-1.48],[.22,-1.67],[-.22,-1.67],[-.37,-1.48],[-.43,-.48]],.23,'z',0,0,.31,0,0,0,{bev:.047});
    P(L.kn,s2,[[-.26,-.45],[.26,-.45],[.32,-.56],[.27,-1.34],[.17,-1.49],[-.17,-1.49],[-.27,-1.34],[-.32,-.56]],.082,'z',0,0,.46,0,0,0,{bev:.016});
    S(L.kn,p,.47,.45,.064,0,-.81,.521,0,0,0,{bev:.018});
    S(L.kn,A,.46,.055,.036,0,-1.358,.519,0,0,0,{bev:.01});
    for(const x of [-.22,.22])for(const y of [-.52,-1.24])bolts(L.kn,[[x,y,.515]],'z',.028);
    for(const x of [-1,1])S(L.kn,s2,.119,.85,.22,x*.393,-.86,.215,0,0,0,{bev:.029});
    CX(L.an,joint,.166,.47,0,0,0,14);
    S(L.an,frame,.64,.18,.70,0,-.16,.11,0,0,0,{bev:.047});
    S(L.an,p,.66,.115,.58,0,-.081,.18,0,0,0,{bev:.038});
    S(L.an,SH.rubber,.66,.09,.75,0,-.270,.11,0,0,0,{bev:.022});
    for(const x of [-.19,.19])S(L.an,A,.093,.034,.07,x,-.13,.48,0,0,0,{bev:.007});
    if(L.side.endsWith('F')){
      const pad=J('BHM knee shoe '+L.side,L.kn,0,0,0);
      S(pad,frame,.67,.12,.48,0,-.236,.035,0,0,0,{bev:.015});
      S(pad,SH.rubber,.67,.035,.48,0,-.298,.035,0,0,0,{bev:.005});
      for(const x of [-.236,.236])S(pad,A,.065,.043,.029,x,-.232,.288,0,0,0,{bev:.006});
      B.motionAnchors.push(pad);
    }
  });
  Dec(legs[2].hip,scarTex(37),.5,.5,.0,-.7,.35,0,0,0,{detachWith:'legs'});
  B.kit(1,()=>{for(const x of [1,-1])S(arms[x>0?'L':'R'].paul,s2,.12,.5,1.0,x*1.08,.5,0);});

  B.kit(2,()=>legs.forEach(L=>S(L.kn,s2,.36,.6,.08,0,-.95,.26,-.04)));
  B.kit(3,()=>{S(pelvis,s2,1.6,.12,1.6,0,.66,.9,0,0,0);for(const x of [1,-1])S(spine,s2,.6,.4,.12,x*.5,1.4,1.0);});
}

const hazardDecal=()=>decal('hz',(g)=>{g.fillStyle='#d9a52a';g.fillRect(0,0,256,256);g.fillStyle='#1d1b17';for(let x=-256;x<=512;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x+32,0);g.lineTo(x+32-256,256);g.lineTo(x-256,256);g.closePath();g.fill();}});


/* ---------- draw-call reduction: merge static meshes that share a bone, material and damage part ---------- */
function mergeStatic(root,Bc,anchors){root.updateMatrixWorld(true);const anc=o=>{let p=o.parent;while(p&&!anchors.has(p))p=p.parent;return p;},_mi=new T.Matrix4();const skip=new Set();Bc.kits.forEach(a=>a.forEach(o=>skip.add(o)));Bc.visor.forEach(o=>skip.add(o));
  const partOf=new Map();for(const k in Bc.parts)for(const e of Bc.parts[k])partOf.set(e.m,{k,d:!!e.detach,np:!!e.np});
  const groups=new Map();root.traverse(o=>{if(!o.isMesh||skip.has(o)||o.visible===false||!o.parent)return;const g=o.geometry;if(!g.attributes.normal||!g.attributes.uv)return;const A=anc(o);if(!A)return;o.userData.anchor=A;
    const pe=partOf.get(o),key=A.uuid+'|'+o.material.uuid+'|'+(pe?pe.k+pe.d+pe.np:'-')+'|'+(o.castShadow?1:0);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
  for(const list of groups.values()){if(list.length<2)continue;const pos=[],nor=[],uv=[];
    for(const o of list){const A=o.userData.anchor;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(_mi.copy(A.matrixWorld).invert().multiply(o.matrixWorld));
      pos.push(g.attributes.position.array);nor.push(g.attributes.normal.array);uv.push(g.attributes.uv.array);g.dispose();}
    const cat=(arrs)=>{let n=0;for(const a of arrs)n+=a.length;const r=new Float32Array(n);let i=0;for(const a of arrs){r.set(a,i);i+=a.length;}return r;};
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(cat(pos),3));geo.setAttribute('normal',new T.BufferAttribute(cat(nor),3));geo.setAttribute('uv',new T.BufferAttribute(cat(uv),2));geo.computeBoundingSphere();
    const a=list[0],m=new T.Mesh(geo,a.material);m.castShadow=a.castShadow;m.receiveShadow=a.receiveShadow;m.userData.foundryMerged=true;a.userData.anchor.add(m);
    const pe=partOf.get(a);for(const o of list)o.parent.remove(o);
    if(pe){Bc.parts[pe.k]=Bc.parts[pe.k].filter(e=>!list.includes(e.m));Bc.parts[pe.k].push(pe.np?{m,detach:pe.d,np:true}:{m,detach:pe.d});}}
}
const BUILDERS=[warden,kestrel,basilisk,valkyrie,oni,behemoth];
/* Every chassis is three modules: LEGS (pelvis, hips, legs, gait), CORE (torso, head, back units) and ARMS (pauldrons, arms, hands).
   Dimensions are split the same way, so any legs can carry any core and any arms. */
const LEG_KEYS=['stance','py','spY','hipX','hipY','hipZ','legA','legB','ankleH','restX','restZ','lift','reverse','quad','reach','phases','duty','stride','walkDrop','sway','scale','toe'],CORE_KEYS=['neck','shX','shY','shZ'],ARM_KEYS=['up','fo','so','melee','carry'];
function composeDims(l,c,a){const D={};for(const [src,keys] of [[l,LEG_KEYS],[c,CORE_KEYS],[a,ARM_KEYS]])for(const k of keys)if(DIMS[src][k]!==undefined)D[k]=DIMS[src][k];
  // combat stance: biped feet planted wider than the shoulders, toes turned out, limited by what the legs can reach with a bent knee
  if(!D.quad){const vert=D.py+(D.hipY??-.1)-D.ankleH,maxH=Math.sqrt(Math.max(0,(.95*(D.legA+D.legB))**2-vert*vert));D.restX=Math.max(D.restX,Math.min(D.shX*(D.stance??1.1),D.hipX+maxH));D.toe=D.toe??.17;}
  return D;}
function build(frame,team,tag,paintOverride,mods){
  const mo=Object.assign({legs:frame,core:frame,arms:frame},mods||{});
  const base=PAL[team][mo.core],pal=paintOverride?Object.assign({},base,paintOverride):base,D=composeDims(mo.legs,mo.core,mo.arms);
  const visor=MS({color:0x0a0503,emissive:C(pal.eye),emissiveIntensity:3,roughness:.3});
  const stack=MS({color:0x0a0503,emissive:C(0xff6a1a),emissiveIntensity:.5,roughness:.9});
  const M={p:paint(pal.p),s:paint(pal.s,.64,.34),a:paint(pal.a,.5,.2),frame:SH.frame,joint:SH.joint,steel:SH.steel,visor,stack,
    numTex:team==='ally'?numTex(pal.num,'#e6dfca'):numTex(tag||'X','#c4352a')};
  if(team==='enemy')M.numTex=numTex(tag||'??','#d6cfc0');
  const K=skeleton(D);
  B={part:'body',parts:{body:[],pilot:[],right:[],left:[],legs:[]},skirts:[],pistons:[],motionAnchors:[],stackTops:[],spinners:[],beacons:[],visor:[],kits:[[],[],[]],shield:null,
    kit(level,fn){const before=new Set();K.root.traverse(o=>before.add(o));fn();const added=[];K.root.traverse(o=>{if(o.isMesh&&!before.has(o))added.push(o);});added.forEach(o=>o.visible=false);this.kits[level-1].push(...added);}};
  // run each source chassis once; modules it does not own are built onto a throwaway skeleton and discarded
  for(const f of [...new Set([mo.legs,mo.core,mo.arms])]){const own={legs:mo.legs===f,core:mo.core===f,arms:mo.arms===f},all=own.legs&&own.core&&own.arms,dm=all?null:skeleton(DIMS[f]);
    BUILDERS[f](all?K:{root:K.root,pelvis:own.legs?K.pelvis:dm.pelvis,legs:own.legs?K.legs:dm.legs,spine:own.core?K.spine:dm.spine,neck:own.core?K.neck:dm.neck,arms:own.arms?K.arms:dm.arms},M);
    if(B.shield){B.shield.parent&&B.shield.parent.remove(B.shield);B.shield=null;}}  // shields are separate modular items, not part of a chassis
  {const live=new Set();K.root.traverse(o=>live.add(o));for(const k in B.parts)B.parts[k]=B.parts[k].filter(e=>live.has(e.m));
    B.kits=B.kits.map(a=>a.filter(o=>live.has(o)));for(const k of ['visor','stackTops','spinners','beacons'])B[k]=B[k].filter(o=>live.has(o));B.skirts=B.skirts.filter(q=>live.has(q.g));B.pistons=B.pistons.filter(q=>live.has(q.pa)&&live.has(q.pb));}
  frame=mo.core;
  if(team==='enemy'&&frame<3){const ins=frame===2?wingTex('#cc4630'):clawTex('#c4352a');const sp=K.spine;const z=[1.0,.85,1.2][frame],y=[1.62,.6,1.4][frame];Dec(sp,ins,.36,.36,frame===1?.0:-.62,y,z,0,0,0);}
  K.root.updateMatrixWorld(true);
  const pistons=B.pistons.map(q=>{const wa=q.pa.localToWorld(V3(...q.a)),wb=q.pb.localToWorld(V3(...q.b)),L=wa.distanceTo(wb);
    const ha=new T.Group();ha.position.set(...q.a);q.pa.add(ha);const hb=new T.Group();hb.position.set(...q.b);q.pb.add(hb);
    const h=new T.Mesh(cylGeo(q.r,q.r,L*.6,12),SH.joint);h.rotation.x=PI/2;h.position.z=L*.3;h.castShadow=true;ha.add(h);
    const c=new T.Mesh(cylGeo(q.r*1.3,q.r*1.3,.08,12),SH.frame);c.rotation.x=PI/2;c.position.z=.04;ha.add(c);
    const r=new T.Mesh(cylGeo(q.r*.55,q.r*.55,L*.62,10),SH.steel);r.rotation.x=PI/2;r.position.z=L*.31;r.castShadow=true;hb.add(r);
    const c2=new T.Mesh(cylGeo(q.r*1.1,q.r*1.1,.08,12),SH.frame);c2.rotation.x=PI/2;c2.position.z=.04;hb.add(c2);return [ha,hb];});
  K.root.traverse(o=>{if(o.isMesh&&o.castShadow===undefined)o.castShadow=true;});
  {const an=new Set([K.root,K.pelvis,K.spine,K.neck]);for(const k in K.arms)for(const n of Object.values(K.arms[k]))an.add(n);for(const L of K.legs){an.add(L.hip);an.add(L.kn);an.add(L.an);}
   B.motionAnchors.forEach(o=>an.add(o));B.skirts.forEach(q=>an.add(q.g));B.spinners.forEach(o=>an.add(o));pistons.forEach(([a,b])=>{an.add(a);an.add(b);});mergeStatic(K.root,B,an);}
  const out={root:K.root,rig:{pelvis:K.pelvis,spine:K.spine,neck:K.neck,arms:K.arms,legs:K.legs,pistons,skirts:B.skirts,stackTops:B.stackTops,spinners:B.spinners,beacons:B.beacons},
    dims:D,mods:mo,parts:B.parts,kits:B.kits,shield:null,visor:B.visor,visorMat:visor,stackMat:stack,pal};
  B=null;return out;
}

/* ======================= WEAPONS ======================= */
function weapon(id,team,mp){
  const pal=PAL[team][0],g=new T.Group(),acc=paint(mp?mp.a:team==='ally'?0xe0621a:0xc4352a,.5,.2),body=paint(mp?mp.s:team==='ally'?0x3b4230:0x2a2b2d,.6,.35),{frame,joint,steel}=SH;
  const o={model:g};const at=(x,y,z)=>{const m=new T.Object3D();m.position.set(x,y,z);g.add(m);return m;};
  if(id==='rifle'){
    P(g,body,[[-1.0,.16],[.9,.16],[1.0,.36],[.92,.64],[-.6,.64],[-1.1,.44]],.32,'x',0,0,0,0,0,0,{bev:.035});
    S(g,frame,.22,.08,1.4,0,.7,.1,0,0,0,{bev:.01});for(let i=0;i<9;i++)S(g,joint,.24,.04,.06,0,.75,-.5+i*.15,0,0,0,{bev:0});
    CZ(g,frame,.12,1.2,0,.38,1.55,10);for(const z of [1.2,1.5,1.8])CZ(g,joint,.135,.06,0,.38,z,10);
    CZ(g,steel,.065,.9,0,.38,2.4,12);S(g,frame,.22,.22,.34,0,.38,2.92,0,0,0,{bev:.03});for(const y of [.32,.44])S(g,SH.black,.24,.03,.24,0,y,2.94,0,0,0,{bev:0});
    S(g,body,.24,.62,.38,0,-.12,.55,.25,0,0);S(g,frame,.18,.5,.22,0,-.08,0,.22,0,0);
    CZ(g,frame,.085,.55,0,.86,.2,12);const lens=CZ(g,MS({color:0x050a0c,emissive:C(0x5fe0ff),emissiveIntensity:1.6}),.06,.02,0,.86,.48,12);
    S(g,frame,.3,.4,.8,0,.42,-1.4,0,0,0,{bev:.04});S(g,acc,.33,.08,.42,0,.6,.5,0,0,0,{bev:.01});S(g,acc,.33,.08,.3,0,.6,-1.3,0,0,0,{bev:.01});
    o.muzzle=at(0,.38,3.1);o.eject=at(-.2,.45,.3);
  }else if(id==='shotgun'){
    P(g,body,[[-.9,.1],[.8,.1],[.95,.35],[.85,.7],[-.6,.72],[-1.0,.45]],.46,'x',0,0,0,0,0,0,{bev:.04});
    for(const y of [.5,.24]){CZ(g,steel,.12,1.45,0,y,1.55,14);S(g,frame,.32,.12,.24,0,y,2.3,0,0,0,{bev:.02});}
    S(g,frame,.34,.42,1.1,0,.38,1.35,0,0,0,{bev:.03});for(let i=0;i<6;i++)S(g,SH.black,.36,.05,.06,0,.6,.9+i*.16,0,0,0,{bev:0});
    CX(g,frame,.3,.32,0,-.18,.45,16);CX(g,acc,.31,.06,.17,-.18,.45,16);
    S(g,frame,.2,.5,.24,0,-.08,0,.22,0,0);S(g,frame,.3,.4,.6,0,.38,-1.15,0,0,0,{bev:.04});S(g,acc,.48,.08,.4,0,.74,.3,0,0,0,{bev:.01});
    o.muzzle=at(0,.38,2.45);o.eject=at(-.25,.45,.2);
  }else if(id==='missile'){
    S(g,body,.95,.9,1.5,0,.45,.35,0,0,0,{bev:.06});S(g,acc,.97,.1,1.0,0,.92,.3,0,0,0,{bev:.01});
    for(let i=0;i<6;i++){const x=(i%3-1)*.28,y=.3+Math.floor(i/3)*.3;CZ(g,frame,.11,.14,x,y,1.13,12);CZ(g,SH.black,.085,.02,x,y,1.205,12);const tip=Cy(g,MS({color:C(0xd8d3c2),roughness:.5}),.0,.07,.12,x,y,1.17,PI/2,0,0,10);}
    S(g,frame,.98,.18,.45,0,.0,-.35,0,0,0,{bev:.02});S(g,body,.08,.5,1.0,.5,.45,.3,0,0,0,{bev:.02});S(g,body,.08,.5,1.0,-.5,.45,.3,0,0,0,{bev:.02});
    S(g,frame,.2,.55,.26,0,-.05,.05,.2,0,0);S(g,SH.vent,.6,.4,.03,0,.5,-.41,0,0,0,{bev:0});
    o.muzzle=at(0,.45,1.25);
  }else if(id==='blade'){
    const edge=MS({color:0x110500,emissive:C(0xff6a1a),emissiveIntensity:2.4,roughness:.3});
    CZ(g,frame,.09,.62,0,0,-.05,10);CZ(g,acc,.1,.08,0,0,-.38,10);for(const z of [-.2,0,.15])CZ(g,joint,.1,.04,0,0,z,10);
    P(g,body,[[-.38,.16],[.38,.16],[.3,-.14],[-.3,-.14]],.26,'z',0,0,.32,0,0,0,{bev:.03});
    P(g,steel,[[0,.5],[.17,.4],[.13,-2.2],[0,-3.2],[-.06,-2.4],[-.06,.5]],.07,'x',0,0,0,-PI/2,0,0,{bev:.015});
    P(g,edge,[[0,.45],[.04,.45],[.04,-2.3],[0,-3.15],[-.02,-2.3]],.075,'x',0,-.11,0,-PI/2,0,0,{bev:0});
    S(g,frame,.1,.2,1.0,0,.12,1.1,0,0,0,{bev:.02});
    o.muzzle=at(0,-.05,3.4);o.glow=edge;o.base=at(0,-.05,.6);
  }else{ // rail
    const glow=MS({color:0x050a0c,emissive:C(0x58d8ff),emissiveIntensity:1.4,roughness:.3});
    S(g,frame,.44,.56,1.4,0,.36,0,0,0,0,{bev:.04});P(g,body,[[-.7,.62],[.5,.62],[.62,.8],[-.6,1.0]],.5,'x',0,0,0,0,0,0,{bev:.03});S(g,acc,.52,.08,.4,0,.98,-.2,0,0,0,{bev:.01});
    S(g,frame,.2,.55,.26,0,-.05,.05,.15,0,0);
    for(const y of [.6,.12])S(g,steel,.12,.1,3.0,0,y,1.9,0,0,0,{bev:.02});
    S(g,glow,.06,.06,2.9,0,.36,1.85,0,0,0,{bev:0});
    for(let i=0;i<5;i++){const t=new T.Mesh(new T.TorusGeometry(.3,.06,8,20),i%2?frame:glow);t.position.set(0,.36,.8+i*.5);t.castShadow=true;g.add(t);}
    for(const x of [1,-1])CZ(g,joint,.08,1.0,x*.28,.36,-.1,10);
    S(g,frame,.36,.42,.5,0,.36,-1.0,0,0,0,{bev:.04});
    o.muzzle=at(0,.36,3.45);o.glow=glow;
  }
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
  return o;
}

window.VowChassis={skirtPose,composeDims,solveLeg,build,weapon,DIMS,PAL,damagedOf,wreckOf,SH};
})();
