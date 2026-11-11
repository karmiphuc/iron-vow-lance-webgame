/* Environment and cover helpers ported from mercenary-command.html; board dimensions follow game state. */
(function(root){
'use strict';
root.IronVowSceneKit=function(renderer){
const T=root.THREE,PI=Math.PI,TILE=6.8,C=h=>new T.Color(h).convertSRGBToLinear();
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
function imgTex(key,rep){const t=new T.TextureLoader().load(key);t.encoding=T.sRGBEncoding;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=8;return t;}
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
  screen:MS({color:0x050a0c,emissive:C(0x4fd8e8),emissiveIntensity:1.6,roughness:.3})
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
  {bg:0x1a232b,fog:[0x1e2830,70,190],sun:[0xc9dbe8,2.0],hemi:[0x9fb3c4,0x1d2124,.55],ground:0x6c7378,wet:.42,env:[0x1d242a,0xbfd3e0,0x8aa3b3,0x5a7080,0x333a3f],dir:[-28,40,18]},
  {bg:0x2a1f19,fog:[0x3a2a20,70,190],sun:[0xffb878,2.6],hemi:[0xe0b48a,0x221812,.5],ground:0x857565,wet:.75,env:[0x2a2019,0xffc08a,0xe0905a,0x6a5040,0x3a3028],dir:[-34,26,-8]},
  {bg:0x16222a,fog:[0x1c2c33,70,190],sun:[0xb9e4ea,1.7],hemi:[0x8fb8c0,0x14191c,.55],ground:0x67706f,wet:.5,env:[0x18232a,0xa8d8e0,0x7aa8b0,0x46606a,0x2c3438],dir:[-22,38,24]}
];
function buildProps(s,ci){
  const g=new T.Group();s.add(g);const H=Math.max(width,depth)*TILE/2;
  const rock=MS({color:C(ci===1?0x5a4c3f:0x434a4d),roughness:1,metalness:0,flatShading:true,map:wearTex('#bdbdbd',[1,1])});
  const ring=(n,rad,fn)=>{for(let i=0;i<n;i++){const a=i/n*PI*2+rnd(-.1,.1),r=rad+rnd(0,10);fn(Math.cos(a)*r,Math.sin(a)*r,a,i);}};
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
    const sb=MS({color:C(0x7d7258),roughness:.95});for(let i=0;i<30;i++){const a=i/30*PI*2;mesh(g,T.CapsuleGeometry?new T.CapsuleGeometry(.35,.6,4,8):new T.SphereGeometry(.5,8,6),sb,Math.cos(a)*(H+3.5),.35,Math.sin(a)*(H+3.5),0,a,PI/2);}
    ring(16,H+12,(x,z)=>{const geo=new T.DodecahedronGeometry(rnd(1.2,3),0);mesh(g,geo,rock,x,.5,z,rnd(0,3),rnd(0,3),0);});
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=o.position.length()<H+12;}});
}
function buildCover(key){const [x,z]=key.split(',').map(Number),p=tileW(x,z),g=new T.Group();g.position.copy(p);const v=(x*31+z*17)%3;
  if(v===0){const jg=new T.Group();jg.scale.set(1.25,1.7,1);g.add(jg);for(const dz of [-.6,.6]){const j=jersey(jg,MAT.concrete,TILE*.86);j.position.x=dz;}bx(jg,.05,.22,TILE*.8,MAT.hazard,-.6+.215,.75,0,0,0,-.2,false);bx(jg,.05,.22,TILE*.8,MAT.hazard,.6-.215,.75,0,0,0,.2,false);}
  else if(v===1){bx(g,TILE*.82,2.2,TILE*.5,MAT.olive,0,1.1,0);bx(g,TILE*.84,.14,TILE*.52,MAT.amber,0,1.95,0);bx(g,TILE*.82,.6,TILE*.5,MAT.oliveDark,0,2.5,0,0,0,0);for(const s of [-1,1])bx(g,.12,2.1,.12,MAT.graphite,s*TILE*.38,1.1,TILE*.26);const st=new T.Mesh(new T.PlaneGeometry(1.6,.8),MS({map:stencilTex('VOW-07','#4b5334','#d8d2bd',256,128,56),roughness:.8}));st.position.set(0,1.2,TILE*.251);g.add(st);}
  else{const sb=MS({color:C(0x7a6f55),roughness:.95});for(let r=0;r<3;r++)for(let i=0;i<4;i++){const m=mesh(g,new T.SphereGeometry(.5,9,7),sb,(i-1.5)*.78+(r%2)*.39,.3+r*.5,0);m.scale.set(.85,.5,1.35);}bx(g,TILE*.8,2.4,.18,MAT.steel,0,1.2,-.9);}
  g.rotation.y=((x+z)%2)?PI/2:0;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
function groundMaterial(P){
 const rough=tex(256,256,(g,w,h)=>{g.fillStyle='#e0e0e0';g.fillRect(0,0,w,h);for(let i=0;i<26;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(10,46),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(0,0,0,${P.wet})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}},[6,6]);
 return MS({color:C(P.ground),map:imgTex('assets/concrete.webp',[14,14]),roughnessMap:rough,roughness:1,metalness:.08,envMapIntensity:.7});
}
return {TILE,PAL,C,MAT,MS,mesh,bx,cy,bevelGeo,tileW,envFrom,groundMaterial,imgTex,buildProps,buildCover,random:rnd,setSize(w,d){width=w;depth=d;},dispose(){
 const seen=new Set();for(const m of Object.values(MAT)){for(const t of [m.map,m.normalMap,m.roughnessMap])if(t&&!seen.has(t)){seen.add(t);t.dispose();}m.dispose();}
 for(const geo of geoCache.values())geo.dispose();for(const target of envTargets)target.dispose();pmrem.dispose();
}};
};
})(window);
