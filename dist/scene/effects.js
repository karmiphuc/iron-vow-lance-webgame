/* Port of the merged PR #19 reference FX, directional impacts and electrical faults.
 * Source: docs/reference/claude/rig-bench.html (VowAnim). Owned per battle scene.
 * Integration is separate: this factory does not create another renderer or canvas.
 */
(function(root){
'use strict';
root.IronVowEffects={create(scene,options={}){
 let visualSeed=options.seed??947;const random=()=>{visualSeed=(Math.imul(visualSeed,1664525)+1013904223)>>>0;return visualSeed/4294967296;};
const T=THREE, PI=Math.PI, V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const smooth=q=>q*q*(3-2*q), smoother=q=>q*q*q*(q*(q*6-15)+10), rnd=(a,b)=>a+random()*(b-a);
const wrapA=a=>((a+PI)%(2*PI)+2*PI)%(2*PI)-PI;
const dampAngle=(a,b,k,dt)=>a+wrapA(b-a)*(1-Math.exp(-k*dt));
function spr(s,k,d,dt){s.v+=(-k*s.x-d*s.v)*dt;s.x+=s.v*dt;}
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=4;return t;}
const srgb=t=>{t.encoding=T.sRGBEncoding;return t;};
const glowTex=tex(64,64,g=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
const smokeTex=tex(128,128,g=>{for(let i=0;i<14;i++){const x=64+rnd(-22,22),y=64+rnd(-22,22),rr=rnd(22,40),r=g.createRadialGradient(x,y,0,x,y,rr);r.addColorStop(0,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);}});
const fireTex=tex(64,64,g=>{const r=g.createRadialGradient(32,36,0,32,32,32);r.addColorStop(0,'rgba(255,250,220,1)');r.addColorStop(.25,'rgba(255,200,90,.95)');r.addColorStop(.55,'rgba(240,90,20,.55)');r.addColorStop(1,'rgba(120,20,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
const scorchTex=tex(128,128,g=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(8,6,5,.85)');r.addColorStop(.5,'rgba(15,12,10,.55)');r.addColorStop(1,'rgba(20,15,10,0)');g.fillStyle=r;g.fillRect(0,0,128,128);for(let i=0;i<40;i++){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=rnd(1,3);g.beginPath();g.moveTo(64,64);const a=rnd(0,7),l=rnd(20,60);g.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);g.stroke();}});
// [bench] plasma ribbon cross-section, created once and shared by every arc ribbon: pale blue-white core, saturated blue falloff, transparent edges
const plasmaTex=tex(64,4,g=>{const gr=g.createLinearGradient(0,0,64,0),mid=a=>'rgba(40,110,255,'+a+')';
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.42,mid(.55));gr.addColorStop(.5,'rgba(170,215,255,1)');gr.addColorStop(.58,mid(.55));gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,4);});
plasmaTex.anisotropy=1;
const geoCache=new Map();
function bevelGeo(w,h,d,s0){const key=[w,h,d,s0].map(v=>(v||0).toFixed(3)).join('|');if(geoCache.has(key))return geoCache.get(key);
  const s=Math.min(s0||.06,w*.2,h*.2,d*.2),hw=w/2-s,hh=h/2-s,sh=new T.Shape();sh.moveTo(-hw,-hh);sh.lineTo(hw,-hh);sh.lineTo(hw,hh);sh.lineTo(-hw,hh);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,d-2*s),bevelEnabled:true,bevelThickness:s,bevelSize:s,bevelSegments:1,curveSegments:1});g.translate(0,0,-(d-2*s)/2);geoCache.set(key,g);return g;}
function mesh(p,geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,shadow=true){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o;}
const bx=(p,w,h,d,m,x,y,z,rx,ry,rz,sh)=>mesh(p,bevelGeo(w,h,d),m,x,y,z,rx,ry,rz,sh);
const cy=(p,r1,r2,h,m,x,y,z,rx,ry,rz,seg=14,sh)=>mesh(p,new T.CylinderGeometry(r1,r2,h,seg),m,x,y,z,rx,ry,rz,sh);
const MS=o=>new T.MeshStandardMaterial(o);
const MAT={ // [bench] subset of vow3d.js MAT used by FX
  graphite:MS({color:C(0x24292b),roughness:.45,metalness:.75}),
  amber:MS({color:C(0xe0621a),roughness:.5,metalness:.2}),
  white:MS({color:C(0xd8d3c2),roughness:.6,metalness:.05})};

const BS=.9,HEAVY=[1,.7,1.4,.85,1.15,.95],MEL={wind:.38,hit:.46,strike:.5,hold:.72,end:1.1};
const BT={fx:null,hitstop:0,cam:{shake:0},clock:0,floor:0,lowFx:false,groundAt:options.groundAt,sound:options.sound};
const pending=[],_a=V3(),_b=V3(),_c=V3();
const partPoint=(m,part)=>options.partPoint(m,part);
const stepSound=amount=>BT.sound?.('step',amount);
const JOINT_PARTS=['right','left','legs'],_jd=V3();
const FAULT_PAIRS=[['body','right'],['right','pilot'],['body','left'],['body','legs'],['pilot','body']];
const FAULT_BEATS=[.07,.25,.45,.67,.87,1.1,1.43,1.75],SLAM_AT=.95;
function faultFX(m,I,t){const fx=BT.fx;if(!fx||!fx.arc||fx.isNull||options.reducedMotion?.())return; // [bench] isNull: soak stub
  const F=m.fault||(m.fault={next:-1,beat:0,slam:false,pulse:0,seed:(random()*997)|0});
  const dead=!I.alive,pd=dead&&I.down==='pilot';
  if(!dead){F.beat=0;F.slam=false;}
  const critical=!dead&&((I.bodyRatio!==undefined&&I.bodyRatio<.24)||I.armDead||I.legsDead);
  let fire=false,strength=.67,bi=-1; // bi: index of the collapse beat that fires (-1 while merely critical)
  if(dead&&!pd){const age=I.deathAge||0;
    while(F.beat<FAULT_BEATS.length&&age>=FAULT_BEATS[F.beat]){F.beat++;if(age-FAULT_BEATS[F.beat-1]<.12){fire=true;strength=.95;bi=F.beat-1;}}
    if(!F.slam&&age>=SLAM_AT){F.slam=true;groundSlam(m);}}
  else if(critical){const period=1.35+(F.seed%5)*.1;if(F.next<0)F.next=t+period*random();if(t>=F.next){fire=true;F.next=t+period;}}
  else F.next=-1;
  if(!fire)return;
  // [bench] variant mix (visual only, Math.random, never the sim RNG): critical = B plasma 60 / C spark crawl 25 / D joint short 15;
  // collapse = mostly B, C/D on some beats, but the first and the last two beats are always B at full strength
  const rv=random(),dying=bi>=0,forceB=dying&&(bi===0||bi>=FAULT_BEATS.length-2);
  const kind=forceB?'B':dying?(rv<.7?'B':rv<.85?'C':'D'):(rv<.6?'B':rv<.85?'C':'D'),sc=strength*(m.scale||1),pi=F.pulse++ + F.seed;
  if(kind==='D'){const part=JOINT_PARTS[pi%JOINT_PARTS.length],j=surfacePoint(m,part);m.rig.spine.getWorldPosition(_jd);_jd.set(j.x-_jd.x,0,j.z-_jd.z);
    if(_jd.lengthSq()<.04)_jd.set(Math.sin(m.yaw),0,Math.cos(m.yaw));_jd.normalize();_jd.y=.35;fx.joint(j,_jd,sc);return;}
  const pair=FAULT_PAIRS[pi%FAULT_PAIRS.length],a=surfacePoint(m,pair[0]),b=surfacePoint(m,pair[1]);
  if(kind==='C'){fx.crawl(a,b,sc);return;}
  fx.arc(a,b,dead?.18:.24,sc);for(const q of [a,b])fx.sparks(q,Math.max(2,Math.round(4*(BT.lowFx?.6:1))),3,0x8fc8ff,.3,.25);fx.light(a.clone().lerp(b,.5),0x4f9fff,dead?7:4);}
// part anchors sit inside the armour: push them out radially from the spine axis to roughly the hull surface
function surfacePoint(m,part){const p=partPoint(m,part),c=m.rig.spine.getWorldPosition(V3()),d=V3(p.x-c.x,0,p.z-c.z);
  if(d.lengthSq()<.04)d.set(Math.sin(m.yaw),0,Math.cos(m.yaw));return p.addScaledVector(d.normalize(),.85*(m.scale||1));}
function groundSlam(m){const fx=BT.fx,p=m.rig.spine.getWorldPosition(V3());const g=V3(p.x,BT.groundAt?.(p.x,p.z)??m.cont.position.y,p.z),heavy=HEAVY[m.build?.mods?m.build.mods.legs:m.frame]??1;
  fx.airwave(g,8*heavy,.38,.4);fx.dustwave(g,Math.round(20*(BT.lowFx?.6:1)),6*heavy,2.4*heavy,0xb8ad99,.62,1.8,.6);fx.smoke(V3(g.x,g.y+.3,g.z),4,2.6*heavy,0x8f877b,.4,.6,1.8,.8);
  fx.spray(V3(g.x,g.y+.15,g.z),V3(Math.sin(m.yaw),.25,Math.cos(m.yaw)),12,7,1.1,SPARK_HOT,.5);BT.cam.shake=Math.max(BT.cam.shake,.5*heavy);}

/* [bench] directional impacts (new, after PR #4's 2D idea): white-hot flash plus a spark spray thrown back out of the hit
   along the incoming direction, with a per-weapon profile. back = unit vector from the hit toward the shooter. */
const SPARK_HOT=[0xfff4d6,0xffc17d,0xffdc9f,0xe98b49],SPARK_RAIL=[0xedffff,0xa6eaff,0x71c9e9,0xdff8ff];
const IMPACT={
  rifle:  {n:13,spd:9, cone:.55,flash:1.6,light:5, cols:SPARK_HOT},
  shotgun:{n:20,spd:7, cone:.95,flash:2.4,light:7, cols:SPARK_HOT,chips:2},
  missile:{n:28,spd:12,cone:1.15,flash:3.2,light:9, cols:SPARK_HOT,chips:3},
  rail:   {n:16,spd:15,cone:.38,flash:2.6,light:10,cols:SPARK_RAIL},
  blade:  {n:18,spd:7, cone:.7, flash:2.0,light:8, cols:SPARK_HOT}};
function impact(p,back,kind){const fx=BT.fx;if(!fx||!fx.spray||fx.isNull)return;const P=IMPACT[kind]||IMPACT.rifle,k=BT.lowFx?.6:1;
  const rail=P.cols===SPARK_RAIL,d=V3().copy(back).normalize();fx.glow(p,rail?0xdff8ff:0xfff0d0,P.flash,.14);fx.glow(p,rail?0x7fdcff:0xffa75d,P.flash*1.8,.22);fx.light(p,rail?0x9fe6ff:0xffa04a,P.light);
  fx.spray(p,d,Math.round(P.n*k),P.spd,P.cone,P.cols,.55);
  // molten blobs: a few glowing sprites thrown along the spray, outliving the flash
  for(let i=0;i<Math.round(5*k);i++){const v=V3(d.x+rnd(-1,1)*P.cone*.6,d.y+rnd(-.2,.6),d.z+rnd(-1,1)*P.cone*.6).normalize().multiplyScalar(P.spd*rnd(.25,.6));fx.glow(p.clone().addScaledVector(v,.02),i%2?P.cols[1]:P.cols[0],rnd(.35,.6),rnd(.22,.36),v);}
  if(P.chips){fx.debris(p,P.chips,4);fx.smoke(p,3,1.4,0x8a847a,.4,.6,1.1,.25);}
  else if(rail)fx.smoke(p,2,1.1,0x9fb3c0,.3,.5,.9,.15);}

function FX(scene,o){
  const f={};
  const mkPool=(n,make)=>{const a=[];for(let i=0;i<n;i++){const it=make();it.o.visible=false;scene.add(it.o);a.push(it);}a.i=0;a.next=()=>a[a.i++%a.length];return a;};
  const glow=mkPool(o.glow||90,()=>({o:new T.Sprite(new T.SpriteMaterial({map:glowTex,blending:T.AdditiveBlending,transparent:true,depthWrite:false})),v:V3(),life:0}));
  const fire=mkPool(o.fire||70,()=>({o:new T.Sprite(new T.SpriteMaterial({map:fireTex,blending:T.AdditiveBlending,transparent:true,depthWrite:false})),v:V3(),life:0}));
  const smoke=mkPool(o.smoke||120,()=>({o:new T.Sprite(new T.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false})),v:V3(),life:0}));
  const sparkG=new T.BoxGeometry(.05,.05,.38);
  const sparks=mkPool(o.sparks||220,()=>({o:new T.Mesh(sparkG,new T.MeshBasicMaterial({color:0xffb04a,blending:T.AdditiveBlending,transparent:true,depthWrite:false})),v:V3(),life:0}));
  const debG=new T.BoxGeometry(.22,.12,.3);
  const debris=mkPool(o.debris||40,()=>{const m=new T.Mesh(debG,MAT.graphite);m.castShadow=true;return{o:m,v:V3(),w:V3(),life:0};});
  const streakG=new T.BoxGeometry(1,1,1);
  const streaks=mkPool(o.streaks||40,()=>({o:new T.Mesh(streakG,new T.MeshBasicMaterial({blending:T.AdditiveBlending,transparent:true,depthWrite:false})),a:V3(),b:V3(),life:0}));
  const beamG=new T.CylinderGeometry(1,1,1,10,1,true);beamG.rotateX(PI/2);beamG.translate(0,0,.5);
  const beams=mkPool(6,()=>({o:new T.Mesh(beamG,new T.MeshBasicMaterial({blending:T.AdditiveBlending,transparent:true,depthWrite:false})),life:0}));
  const ringG=new T.RingGeometry(.85,1,64);ringG.rotateX(-PI/2);
  const rings=mkPool(12,()=>({o:new T.Mesh(ringG,new T.MeshBasicMaterial({blending:T.AdditiveBlending,transparent:true,depthWrite:false,side:T.DoubleSide})),life:0}));
  const decalG=new T.PlaneGeometry(1,1);decalG.rotateX(-PI/2);
  // [bench] air shockwave: an expanding hemisphere that is clear in the middle and only faintly visible at its rim (fresnel),
  // so it reads as a pressure wave in the air rather than a glowing ring. Dust is a separate, single wall (f.dustwave).
  const airG=new T.SphereGeometry(1,28,10,0,PI*2,0,PI/2);
  const airMat=()=>new T.ShaderMaterial({uniforms:{color:{value:new T.Color()},opacity:{value:0}},transparent:true,depthWrite:false,
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 color;uniform float opacity;varying vec3 vN;varying vec3 vV;void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);gl_FragColor=vec4(color,rim*opacity);}'});
  const airs=mkPool(o.airs||6,()=>({o:new T.Mesh(airG,airMat()),life:0}));
  const decals=mkPool(o.decals||16,()=>({o:new T.Mesh(decalG,new T.MeshBasicMaterial({map:scorchTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1})),life:0}));
  const misG=new T.Group();
  const missiles=mkPool(8,()=>{const g=new T.Group();cy(g,.08,.08,.7,MAT.white,0,0,0,PI/2,0,0,8,false);mesh(g,new T.ConeGeometry(.08,.22,8),MAT.amber,0,0,.46,PI/2,0,0,false);const fl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xffb050,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));fl.position.z=-.45;fl.scale.setScalar(.7);g.add(fl);return{o:g,a:V3(),b:V3(),c:V3(),pos:V3(),life:0,dur:1,trail:0,done:null};});
  // [bench] electrical arcs, "plasma tendril": two soft camera-facing ribbons (a wide one and a thin one) along smooth wavering paths,
  // blue-white band texture, additive. Each pooled slot owns two preallocated ribbon meshes (fixed-size BufferGeometry); nothing is
  // allocated per fire or per frame. The camera comes from o.cam. Depth-tested with a units-only bias so cover and mechs still occlude arcs.
  const ARC_P=24,cam=o.cam||null;
  const arcMat=()=>new T.MeshBasicMaterial({map:plasmaTex,blending:T.AdditiveBlending,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1});
  const mkRibbon=()=>{const g=new T.BufferGeometry(),pos=new Float32Array(ARC_P*2*3),uv=new Float32Array(ARC_P*2*2),idx=[];
    for(let i=0;i<ARC_P;i++){uv.set([0,i/(ARC_P-1),1,i/(ARC_P-1)],i*4);if(i<ARC_P-1){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
    g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
    const m=new T.Mesh(g,arcMat());m.frustumCulled=false;m.renderOrder=996;return {m,pts:Array.from({length:ARC_P},()=>V3())};};
  const arcs=mkPool(o.arcs||8,()=>{const g=new T.Group(),rb=[mkRibbon(),mkRibbon()];g.add(rb[0].m,rb[1].m);
    return {o:g,rb,a:V3(),b:V3(),life:0,max:1,strength:1,frame:-1};});
  const ARC_SPEC=[{amp:.35,w0:.16,w1:.12},{amp:.28,w0:.08,w1:.06}]; // approved look: wide + thin ribbon
  const _u=V3(),_w=V3(),_d=V3(),_t=V3(),_v=V3(),_s=V3();
  const lights=[];for(let i=0;i<(o.lights||3);i++){const l=new T.PointLight(0xffa040,0,28,2);scene.add(l);lights.push(l);}lights.i=0;
  const col=new T.Color();
  const CRAWL_N=11,crawlQ=Array.from({length:CRAWL_N*4},()=>({p:V3(),t:0,i:0,k:1,on:false}));crawlQ.i=0; // pooled crawl points (4 crawls in flight)
  const JOINT_COLS=[0x8fc4ff,0x5f9fff,0x4f8fff,0x7fb8ff,0x5f9fff,0x4f8fff,0x8fc4ff,0xffb070]; // mostly blue-white, one rare warm spark
  // [bench] directional spark spray: n sparks thrown along dir inside a cone, colours cycled from cols; the first 30% are fast, long, white-hot
  f.spray=(p,dir,n,spd,cone,cols,life=.45,sz=1)=>{_d.copy(dir).normalize();if(Math.abs(_d.y)<.95)_u.set(0,1,0);else _u.set(1,0,0);_u.cross(_d).normalize();_w.copy(_d).cross(_u).normalize();
    for(let k=0;k<n;k++){const s=sparks.next(),hot=k<n*.3,a=rnd(0,PI*2),r=cone*Math.sqrt(random())*(hot?.6:1);
      s.o.position.copy(p);s.v.copy(_d).addScaledVector(_u,Math.cos(a)*r).addScaledVector(_w,Math.sin(a)*r).normalize().multiplyScalar(spd*(hot?rnd(1.1,1.6):rnd(.45,1.1)));
      // sized to read at battle-camera distance: hot streaks ~15 cm thick and ~1 m long, the rest ~10 cm by ~0.6 m (base spark is 5 x 38 cm)
      s.life=s.max=life*rnd(.6,1.15)*(hot?.85:1);s.o.material.color.setHex(hot?cols[0]:cols[1+(k%(cols.length-1))]);s.o.scale.set((hot?3:2)*sz,(hot?3:2)*sz,(hot?2.6:rnd(1.2,1.9))*sz);s.o.visible=true;}};
  // plasma arc between a and b (signature unchanged; glowSize is optional: 0 = no endpoint glows). Single ribbon on BT.lowFx.
  f.arc=(a,b,life=.16,strength=1,glowSize=1.6)=>{const s=arcs.next();s.a.copy(a);s.b.copy(b);s.life=s.max=life;s.strength=strength;s.frame=-1;s.rb[1].m.visible=!BT.lowFx;s.o.visible=true;
    if(glowSize>0){f.glow(a,0x4f8fff,glowSize,.22);f.glow(b,0x4f8fff,glowSize,.22);}};
  // spark crawl: sparks and small glows walk along a jagged path from a to b over ~0.15-0.25 s, so current seems to creep across the hull
  f.crawl=(a,b,strength=1)=>{const n=CRAWL_N,dur=rnd(.15,.25),len=a.distanceTo(b),amp=Math.min(.4,len*.09);
    _d.subVectors(b,a).normalize();if(Math.abs(_d.y)<.95)_u.set(0,1,0);else _u.set(1,0,0);_u.cross(_d).normalize();_w.copy(_d).cross(_u).normalize();
    for(let i=0;i<n;i++){const q=i/(n-1),e=(i===0||i===n-1)?0:amp*(.5+.5*Math.sin(PI*q)),c=crawlQ[crawlQ.i++%crawlQ.length];
      c.p.copy(a).lerp(b,q).addScaledVector(_u,rnd(-1,1)*e).addScaledVector(_w,rnd(-1,1)*e).addScaledVector(_d,rnd(-.5,.5)*e);
      c.t=q*dur+rnd(0,.02);c.i=i;c.k=strength;c.on=true;}
    f.light(_t.copy(a).lerp(b,.5),0x5fa0ff,4);};
  // joint short: a directional burst of thin blue-white streaks, a short plasma flick, a brief small core glow, a blue light and a wisp of smoke
  f.joint=(p,dir,strength=1)=>{const k=(BT.lowFx?.6:1);_d.copy(dir).normalize();
    f.spray(p,_d,Math.max(6,Math.round(16*k*Math.min(1,.6+.4*strength))),6,.55,JOINT_COLS,.4,.3); // sz .3: thin streaks that stay separate instead of stacking into a white blob
    f.glow(p,0x9fd0ff,.45,.08);f.glow(p,0x4f8fff,.9,.18);f.light(p,0x8fc8ff,4);
    _t.set(rnd(-.3,.3),rnd(.15,.4),rnd(-.3,.3)).addScaledVector(_d,rnd(.45,.8)).add(p);f.arc(p,_t,.1,.7*strength,0);
    f.smoke(p,1,.7,0x7d8590,.3,.8,1.1,.1);};
  f.light=(p,c,i)=>{const l=lights[lights.i++%lights.length];l.position.copy(p);l.color.setHex(c);l.intensity=i;};
  f.glow=(p,c,size,life,v)=>{const g=glow.next();g.o.position.copy(p);g.o.material.color.setHex(c);g.size=size;g.o.scale.setScalar(size);g.life=g.max=life;g.v.copy(v||_a.set(0,0,0));g.o.visible=true;};
  f.fire=(p,size,life,v,rise)=>{const g=fire.next();g.o.position.copy(p);g.size=size;g.o.scale.setScalar(size*.3);g.life=g.max=life;g.v.copy(v||_a.set(0,rise||1,0));g.o.material.rotation=rnd(0,6);g.o.visible=true;};
  f.smoke=(p,n,size,c,op,rise,life,spread)=>{for(let k=0;k<n;k++){const s=smoke.next();s.o.position.copy(p).add(_a.set(rnd(-1,1)*spread,rnd(0,.3),rnd(-1,1)*spread));s.v.set(rnd(-1,1)*spread*.6,rise*rnd(.6,1.4),rnd(-1,1)*spread*.6);s.life=s.max=life*rnd(.7,1.3);s.size=size*rnd(.7,1.3);s.op=op;s.o.material.color.setHex(c);s.o.material.rotation=rnd(0,6);s.o.visible=true;}};
  f.sparks=(p,n,spd,c,up=0,life=.5,sz=1)=>{for(let k=0;k<n;k++){const s=sparks.next();s.o.position.copy(p);s.v.set(rnd(-1,1),rnd(-1,1)+up,rnd(-1,1)).normalize().multiplyScalar(spd*rnd(.35,1.2));s.life=s.max=life*rnd(.5,1.3);s.o.material.color.setHex(c);s.o.scale.set(sz,sz,sz);s.o.visible=true;}}; // [bench] scale reset: spray reuses the pool
  f.debris=(p,n,spd)=>{for(let k=0;k<n;k++){const d=debris.next();d.o.position.copy(p);d.v.set(rnd(-1,1),rnd(.6,1.6),rnd(-1,1)).multiplyScalar(spd*rnd(.5,1));d.w.set(rnd(-9,9),rnd(-9,9),rnd(-9,9));d.life=rnd(1.6,2.6);d.o.scale.setScalar(rnd(.6,1.6));d.o.visible=true;}};
  f.streak=(a,b,c,w,flight,len)=>{const s=streaks.next();s.a.copy(a);s.b.copy(b);s.life=s.max=flight;s.w=w;s.len=len;s.o.material.color.setHex(c);s.o.visible=true;};
  f.beam=(a,b,c,w,life)=>{const s=beams.next();s.o.position.copy(a);s.o.lookAt(b);s.len=a.distanceTo(b);s.w=w;s.o.scale.set(w,w,s.len);s.life=s.max=life;s.o.material.color.setHex(c);s.o.visible=true;};
  f.airwave=(p,r,life=.4,op=.35,c=0xe8eef2)=>{const s=airs.next();s.o.position.set(p.x,p.y||0,p.z);s.r=r;s.op=op;s.life=s.max=life;s.o.material.uniforms.color.value.setHex(c);s.o.scale.set(.2,.12,.2);s.o.visible=true;};
  // n soft puffs launched outward along the ground from a small starting ring; drag slows them, so they pile up into a rolling dust wall
  f.dustwave=(p,n,spd,size,c,op,life,r0=.4)=>{for(let k=0;k<n;k++){const s=smoke.next(),a=k/n*PI*2+rnd(-.25,.25),ca=Math.cos(a),sa=Math.sin(a);
    s.o.position.set(p.x+ca*r0,(p.y||0)+rnd(.05,.25)*size,p.z+sa*r0);s.v.set(ca*spd*rnd(.75,1.25),rnd(.15,.55)*spd*.25,sa*spd*rnd(.75,1.25));
    s.life=s.max=life*rnd(.75,1.2);s.size=size*rnd(.75,1.25);s.op=op;s.o.material.color.setHex(c);s.o.material.rotation=rnd(0,6);s.o.visible=true;}};
  f.ring=(p,c,r,life)=>{const s=rings.next();s.o.position.set(p.x,(p.y||0)+.06,p.z);s.r=r;s.life=s.max=life;s.o.material.color.setHex(c);s.o.scale.setScalar(.3);s.o.visible=true;};
  f.scorch=(p,size)=>{const s=decals.next();s.o.position.set(p.x,.035+random()*.01,p.z);s.o.rotation.y=rnd(0,6);s.o.scale.set(size,1,size);s.o.material.opacity=.9;s.o.visible=true;};
  f.missile=(a,b,h,dur,done)=>{const s=missiles.next();s.a.copy(a);s.b.copy(b);s.c.copy(a).lerp(b,.5);s.c.y=Math.max(a.y,b.y)+h;s.life=0;s.dur=dur;s.done=done;s.trail=0;s.o.visible=true;s.o.position.copy(a);};
  f.update=dt=>{
    for(const g of glow){if(!g.o.visible)continue;g.life-=dt;if(g.life<=0){g.o.visible=false;continue;}const u=g.life/g.max;g.o.material.opacity=u;g.o.scale.setScalar(g.size*(1.15-.15*u));g.o.position.addScaledVector(g.v,dt);}
    for(const g of fire){if(!g.o.visible)continue;g.life-=dt;if(g.life<=0){g.o.visible=false;continue;}const u=1-g.life/g.max;g.o.material.opacity=1-u;g.o.scale.setScalar(g.size*(.35+u*.9));g.o.position.addScaledVector(g.v,dt);g.v.multiplyScalar(Math.exp(-dt*2));}
    for(const s of smoke){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}const u=1-s.life/s.max;s.o.position.addScaledVector(s.v,dt);s.v.x*=Math.exp(-dt*1.5);s.v.z*=Math.exp(-dt*1.5);s.o.scale.setScalar(s.size*(.45+u*1.6));s.o.material.opacity=s.op*Math.min(1,u*6)*(1-u);}
    for(const s of sparks){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}s.v.y-=18*dt;s.o.position.addScaledVector(s.v,dt);_a.copy(s.o.position).add(s.v);s.o.lookAt(_a);s.o.material.opacity=s.life/s.max;const fl=(BT.groundAt?.(s.o.position.x,s.o.position.z)??BT.floor)+.03;if(s.o.position.y<fl){s.o.position.y=fl;s.v.y*=-.3;s.v.x*=.5;s.v.z*=.5;}} // [bench] BT.floor: bounce on the pad, not under it
    for(const c of crawlQ){if(!c.on)continue;c.t-=dt;if(c.t>0)continue;c.on=false;const lo=BT.lowFx?.6:1;
      f.sparks(c.p,Math.max(2,Math.round(3*lo*c.k)),3,c.i%2?0x6fa8ff:0x4f8fff,.25,.28,.6);f.glow(c.p,c.i%3?0x3f7fff:0x7fb8ff,.5+.3*random(),.22);}
    for(const s of arcs){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}
      const fr=Math.floor((s.max-s.life)/.045),rejit=fr!==s.frame;s.frame=fr;
      if(rejit){const len=s.a.distanceTo(s.b);_d.subVectors(s.b,s.a).normalize();_u.set(0,1,0).cross(_d);if(_u.lengthSq()<1e-4)_u.set(1,0,0).cross(_d);_u.normalize();_w.copy(_d).cross(_u).normalize();
        for(let r=0;r<2;r++){const sp=ARC_SPEC[r],amp=Math.min(sp.amp,len*.12),ph=rnd(0,6),pts=s.rb[r].pts;
          for(let i=0;i<ARC_P;i++){const q=i/(ARC_P-1),e=Math.sin(PI*q)*amp;pts[i].copy(s.a).lerp(s.b,q).addScaledVector(_u,Math.sin(q*7+ph)*e).addScaledVector(_w,Math.cos(q*5+ph*1.3)*e*.6);}}}
      const wk=.6+.4*s.strength,u=s.life/s.max,op=Math.min(1,u*2)*(random()<.25?.4:1);
      for(let r=0;r<2;r++){const rb=s.rb[r];if(!rb.m.visible)continue;rb.m.material.opacity=op;
        const sp=ARC_SPEC[r],pts=rb.pts,pa=rb.m.geometry.attributes.position;
        for(let i=0;i<ARC_P;i++){const p0=pts[Math.max(0,i-1)],p1=pts[Math.min(ARC_P-1,i+1)];_t.subVectors(p1,p0).normalize();
          if(cam)_v.subVectors(cam.position,pts[i]).normalize();else _v.set(0,1,0);_s.crossVectors(_t,_v).normalize();
          const w=(sp.w0+(sp.w1-sp.w0)*(i/(ARC_P-1)))*wk,P=pts[i];pa.setXYZ(i*2,P.x+_s.x*w,P.y+_s.y*w,P.z+_s.z*w);pa.setXYZ(i*2+1,P.x-_s.x*w,P.y-_s.y*w,P.z-_s.z*w);}
        pa.needsUpdate=true;}}
    for(const d of debris){if(!d.o.visible)continue;d.life-=dt;if(d.life<=0){d.o.visible=false;continue;}d.v.y-=18*dt;d.o.position.addScaledVector(d.v,dt);d.o.rotation.x+=d.w.x*dt;d.o.rotation.z+=d.w.z*dt;const df=(BT.groundAt?.(d.o.position.x,d.o.position.z)??BT.floor)+.08;if(d.o.position.y<df){d.o.position.y=df;d.v.y*=-.3;d.v.x*=.55;d.v.z*=.55;d.w.multiplyScalar(.5);}}
    for(const s of streaks){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}const q=1-s.life/s.max;const head=_a.copy(s.a).lerp(s.b,q),tail=_b.copy(s.a).lerp(s.b,Math.max(0,q-s.len));s.o.position.copy(head).lerp(tail,.5);s.o.lookAt(head);s.o.scale.set(s.w,s.w,Math.max(.05,head.distanceTo(tail)));s.o.material.opacity=1;}
    for(const s of beams){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}const u=s.life/s.max;s.o.material.opacity=u;s.o.scale.set(s.w*(.4+.6*u),s.w*(.4+.6*u),s.len);}
    for(const s of airs){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}const u=1-s.life/s.max,e=.2+(1-Math.pow(1-u,3))*s.r;s.o.scale.set(e,e*.55,e);s.o.material.uniforms.opacity.value=s.op*Math.pow(1-u,1.6);}
    for(const s of rings){if(!s.o.visible)continue;s.life-=dt;if(s.life<=0){s.o.visible=false;continue;}const u=1-s.life/s.max;s.o.scale.setScalar(.3+(1-Math.pow(1-u,2))*s.r);s.o.material.opacity=(1-u)*.9;}
    for(const s of missiles){if(!s.o.visible)continue;s.life+=dt;const q=Math.min(1,s.life/s.dur);const p0=_a.copy(s.a).lerp(s.c,q),p1=_b.copy(s.c).lerp(s.b,q);const pos=s.pos.copy(p0).lerp(p1,q);s.o.lookAt(pos);s.o.position.copy(pos);
      s.trail-=dt;if(s.trail<=0){s.trail=.025;f.smoke(pos,1,.9,0xb9b2a6,.45,.3,1.1,.05);}if(q>=1){s.o.visible=false;s.done&&s.done(pos.clone());}}
    for(const l of lights)l.intensity*=Math.exp(-dt*11);
  };
  f.clearDecals=()=>{decals.forEach(d=>d.o.visible=false);arcs.forEach(s=>s.o.visible=false);crawlQ.forEach(c=>c.on=false);};
  return f;
}

function fireFX(ma,mt,kind,part){
  const fx=BT.fx,muzzle=ma.wpn.muzzle.getWorldPosition(V3()),tp=mt.isVector3?mt.clone():partPoint(mt,part); // [bench] target may be a point
  const beat=(d,fn)=>pending.push({at:BT.clock+d,fn}); // [bench] BT.clock
  const flash=(p,c,s)=>{fx.glow(p,c,s,.09);fx.light(p,c,6);fx.smoke(p,2,1.2,0x8f8a80,.35,.6,.9,.15);};
  if(kind==='rifle'){for(let i=0;i<3;i++)beat(i*.085,()=>{const m0=ma.wpn.muzzle.getWorldPosition(V3()),j=tp.clone().add(V3(rnd(-.3,.3),rnd(-.3,.3),rnd(-.3,.3)));fx.streak(m0,j,0xffd27a,.09,.13,.35);flash(m0,0xffc070,2.4);ma.recoil=Math.min(1.6,ma.recoil+.55);ma.s.pitch.v-=.4;
      if(ma.wpn.eject){const e=ma.wpn.eject.getWorldPosition(V3());fx.sparks(e,2,3,0xd9b45a,.8,.6);}});}
  else if(kind==='shotgun'){flash(muzzle,0xffc070,4);fx.light(muzzle,0xffa040,10);for(let i=0;i<9;i++){const j=tp.clone().add(V3(rnd(-1,1),rnd(-.7,.9),rnd(-1,1)));fx.streak(muzzle,j,0xffe0a0,.06,.12,.4);}ma.recoil=1.5;ma.s.pitch.v-=1;ma.spin=30;fx.smoke(muzzle,5,1.6,0x9a948a,.4,.5,1.2,.3);}
  else if(kind==='missile'){for(let i=0;i<3;i++)beat(i*.07,()=>{const m0=ma.wpn.muzzle.getWorldPosition(V3()).add(V3(rnd(-.2,.2),rnd(-.1,.2),0));fx.glow(m0,0xffb050,2,.12);fx.smoke(m0,4,1.4,0xc4bdb0,.5,.8,1.4,.3);
      fx.missile(m0,tp.clone().add(V3(rnd(-.5,.5),rnd(-.3,.3),rnd(-.5,.5))),rnd(4,6.5),.36-i*.05,null);ma.recoil=Math.min(1.4,ma.recoil+.35);});}
  else if(kind==='blade'){ma.melee={age:0,target:mt,part,hit:false,prev:null};if(ma.wpn.glow)ma.wpn.glow.emissiveIntensity=2.4;}
  else if(kind==='rail'){fx.glow(muzzle,0x9fefff,3,.25);beat(.06,()=>{const m0=ma.wpn.muzzle.getWorldPosition(V3());fx.beam(m0,tp,0x7fdcff,.5,.4);fx.beam(m0,tp,0xffffff,.14,.28);fx.glow(m0,0xb5f8ff,6,.18);fx.light(m0,0x7fe6ff,14);fx.ring(V3(m0.x,0,m0.z),0x7fdcff,5,.5);
      ma.recoil=1.8;ma.s.pitch.v-=1.8;ma.s.kx.v-=Math.sin(ma.yaw)*3;ma.s.kz.v-=Math.cos(ma.yaw)*3;for(let i=1;i<8;i++){const p=m0.clone().lerp(tp,i/8);fx.sparks(p,2,2,0x9fefff,.3,.4);}});
    if(ma.wpn.glow){ma.wpn.glow.emissiveIntensity=6;setTimeout(()=>ma.wpn.glow&&(ma.wpn.glow.emissiveIntensity=1.4),500);}}
}
function meleeUpdate(m,t,dt){const M=m.melee;if(!M)return;M.age+=dt;const a=M.age,fx=BT.fx;
  const tip=m.wpn.muzzle.getWorldPosition(V3());
  if(a>MEL.wind-.06&&a<MEL.strike+.06){if(M.prev)for(let k=1;k<=4;k++){const p=M.prev.clone().lerp(tip,k/4);fx.glow(p,0xff8a2a,1.5,.26);}if(m.wpn.base){const b=m.wpn.base.getWorldPosition(V3());fx.glow(b.lerp(tip,.55),0xffc070,1.1,.16);}if(m.wpn.glow)m.wpn.glow.emissiveIntensity=5;}
  else if(m.wpn.glow)m.wpn.glow.emissiveIntensity=damp(m.wpn.glow.emissiveIntensity,1.6,4,dt);
  M.prev=tip;
  if(!M.hit&&a>=MEL.hit){M.hit=true;const mt=M.target,p=mt.isVector3?tip.clone():partPoint(mt,M.part); // [bench] point target
impact(p,V3(m.cont.position.x-p.x,.6,m.cont.position.z-p.z),'blade');fx.sparks(p,14,8,0xfff0c0,.3,.4);fx.glow(p,0xffd090,5,.16);fx.light(p,0xff9a40,16); // [bench] directional blade impact
    const tc=mt.isVector3?mt:mt.cont.position,dir=V3(tc.x-m.cont.position.x,0,tc.z-m.cont.position.z).normalize();if(!mt.isVector3){mt.s.kx.v+=dir.x*3.6;mt.s.kz.v+=dir.z*3.6;mt.s.pitch.v-=2;} // [bench] point target
    BT.onMeleeContact&&BT.onMeleeContact(m,p);m.s.comp.v-=1.4;
    BT.hitstop=.085;BT.cam.shake=Math.max(BT.cam.shake,.6);}
}
function explode(p,big,m){const fx=BT.fx;
  fx.light(p,0xff9a40,big?28:12);fx.glow(p,0xfff0c0,big?9:4,.18);
  for(let i=0;i<(big?14:6);i++)fx.fire(p.clone().add(V3(rnd(-1,1),rnd(-.5,1),rnd(-1,1)).multiplyScalar(big?1.4:.6)),big?rnd(5,8):rnd(2.4,3.8),rnd(.4,.8),V3(rnd(-1,1),rnd(.5,2),rnd(-1,1)).multiplyScalar(big?2.5:1.4));
  fx.sparks(p,big?60:22,big?16:10,0xffb04a,.5,.7);fx.debris(p,big?14:5,big?9:6);
  fx.smoke(p,big?14:5,big?4.5:2.6,0x3a3632,.65,big?2.2:1.4,big?3.5:2,big?1.4:.6);
  if(big){const g=V3(p.x,BT.groundAt?.(p.x,p.z)??BT.floor,p.z);fx.airwave(g,12,.42,.45,0xf4e6d2);fx.dustwave(g,22,8,2.8,0x8c8274,.65,2.1,.9);fx.scorch(p,6.5);BT.cam.shake=Math.max(BT.cam.shake,.9);}
  else BT.cam.shake=Math.max(BT.cam.shake,.35);
  if(m){m.s.pitch.v-=big?0:1.2;m.s.comp.v-=big?0:.9;}
}
function onStep(m,p,i,amt=1){const fx=BT.fx,heavy=(HEAVY[m.build?.mods?m.build.mods.legs:m.frame]??1)*amt; // [bench] step weight follows the LEGS module (the game never mixes modules)
  fx.smoke(V3(p.x,(BT.groundAt?.(p.x,p.z)??BT.floor)+.2,p.z),3,2*heavy,0x9e968a,.32,.35,1.3,.5);{const g=V3(p.x,BT.groundAt?.(p.x,p.z)??BT.floor,p.z);fx.dustwave(g,Math.max(3,Math.round((6+3*heavy)*(BT.lowFx?.5:1))),2.6*heavy,1.05*heavy,0xc0b5a1,.42,1.2,.35);}m.s.comp.v-=1.4*heavy;m.s.pitch.v+=.4*heavy;stepSound(Math.min(1,.55*heavy)*(m.team==='ally'?1:.75));m.s.arm.v+=1.1*heavy;BT.cam.shake=Math.max(BT.cam.shake,.09*heavy*(m.team==='ally'?1:.7));}


const before=new Set(scene.children),fx=BT.fx=FX(scene,{...options.pools,cam:options.camera}),owned=scene.children.filter(node=>!before.has(node));
return {fx,impact,faultFX,surfacePoint,groundSlam,fireFX,meleeUpdate,explode,onStep,MEL,IMPACT,
 later(delay,fn){pending.push({at:BT.clock+delay,fn});},
 update(t,dt){BT.clock=t;BT.lowFx=Boolean(options.low?.());for(let i=pending.length-1;i>=0;i--)if(t>=pending[i].at){const task=pending.splice(i,1)[0];task.fn();}fx.update(dt);if(!options.reducedMotion?.()){options.shake?.(BT.cam.shake);if(BT.hitstop)options.hitstop?.(BT.hitstop);}BT.hitstop=0;BT.cam.shake*=Math.exp(-dt*8);},
 clear(){pending.length=0;for(const node of owned){if(node.isLight)node.intensity=0;else node.visible=false;}fx.clearDecals();},
 dispose(){pending.length=0;const geometries=new Set(geoCache.values()),materials=new Set(Object.values(MAT)),textures=new Set([glowTex,smokeTex,fireTex,scorchTex,plasmaTex]);for(const node of owned){node.parent?.remove(node);node.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of [o.material].flat().filter(Boolean)){materials.add(material);for(const key of ['map','normalMap','roughnessMap','emissiveMap'])if(material[key])textures.add(material[key]);}});}for(const resource of [...textures,...materials,...geometries])resource.dispose();}
};
}};
})(window);
