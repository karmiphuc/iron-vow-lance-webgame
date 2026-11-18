/* Cairn bodywork from the approved proving-sortie study. */
(() => {
'use strict';
const T=THREE,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),C=h=>new T.Color(h).convertSRGBToLinear();

function plateUV(flat){
 const p=flat.attributes.position,n=flat.attributes.normal,uv=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.abs(n.getX(i)),b=Math.abs(n.getY(i)),c=Math.abs(n.getZ(i));
  uv.push((b>a&&b>c?x:a>c?z:x)*.8+.43,(b>a&&b>c?z:y)*.8+.48);}
 flat.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
}
function wornSteel(){
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');let n=62341;
 const rand=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);
 g.fillStyle='#cccac2';g.fillRect(0,0,256,256);
 for(let i=0;i<130;i++){const x=rand()*256,y=rand()*256,r=5+rand()*37,g0=g.createRadialGradient(x,y,0,x,y,r);g0.addColorStop(0,'rgba(34,33,28,.12)');g0.addColorStop(1,'rgba(39,37,32,0)');g.fillStyle=g0;g.fillRect(x-r,y-r,2*r,2*r);}
 for(let i=0;i<3200;i++){const x=rand()*256,y=rand()*256;g.fillStyle=rand()>.4?'rgba(48,44,38,.14)':'rgba(252,245,214,.34)';g.fillRect(x,y,1+4*rand(),1+rand());}
 for(let i=0;i<75;i++){const x=rand()*256,y=rand()*256;g.strokeStyle='rgba(238,228,201,.38)';g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*14,y-rand()*3);g.stroke();}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;return t;
}
let mill;
function coat(hex,name=''){
 const material=new T.MeshStandardMaterial({name,color:C(hex),map:(mill??=wornSteel()),roughness:.86,metalness:.16,envMapIntensity:.38,flatShading:true});
 if(name.startsWith('paint_'))material.userData.paint=true;
 return material;
}
// Each section is a chamfered cross-section of a single armor casting. Narrow the front
// off-centre to leave daylight between collar, head and weapon-side shoulder.
function casting(parent,mat,sections,x,y,z){
 const pts=[],faces=[],ring=([z,w,b,t,c,dx=0])=>[[-w+c,b], [w-c,b],[w,b+c],[w,t-c],[w-c,t],[-w+c,t],[-w,t-c],[-w,b+c]].map(([x,y])=>[x+dx,y,z]);
 const rings=sections.map(ring);for(const r of rings)pts.push(...r.flat());
 for(let k=0;k<rings.length-1;k++)for(let i=0;i<8;i++){const a=k*8+i,b=k*8+(i+1)%8;faces.push(a,b,b+8,a,b+8,a+8)}
 for(let i=1;i<7;i++){faces.push(0,i+1,i);let j=(rings.length-1)*8;faces.push(j,j+i,j+i+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setIndex(faces);const flat=geo.toNonIndexed();flat.computeVertexNormals();plateUV(flat);geo.dispose();
 const obj=new T.Mesh(flat,mat);obj.position.set(x,y,z);obj.receiveShadow=obj.castShadow=true;parent.add(obj);return obj;
}
function bar(parent,mat,x,y,z,w,h,d,roll=0){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.rotation.z=roll;o.castShadow=o.receiveShadow=true;parent.add(o);return o}
function rack(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
const palette=['#899aa2','#41505a','#a39b76'];
function bodywork(m,colors){
 const r=m.rig,d=m.dims,groups=[];
 const p={plate:coat(colors[0],'paint_primary'),lip:coat('#a6a28a'),deep:coat('#3f4441'),rubber:coat('#242b2b'),
  lens:m.build.visorMat,stripe:coat('#c5b796')};
 const mount=(parent,part,x,y,z)=>{
  const group=rack(parent,x,y,z);
  groups.push({group,part});
  return group;
 };
 const graphite=coat('#323a37'),rim=coat('#afac91');
 const head=mount(r.neck,'pilot',0,-.03,.12);
 const w=.255;head.scale.set(1,.81,1.14);
 casting(head,p.rubber,[[-.38,w*.67,-.10,.51,.07],[.2,w,-.10,.49,.09],[.43,w*.78,-.04,.37,.07]],0,0,0);
 casting(head,p.plate,[[-.38,w*.85,.27,.55,.07],[.13,w*1.08,.29,.65,.07],[.49,w*.86,.27,.49,.06]],0,0,0);
 casting(head,p.plate,[[-.23,w*.78,-.17,.13,.05],[.21,w*.93,-.20,.10,.06],[.45,w*.63,-.10,.07,.04]],0,0,0);
 for(const sign of [-1,1]){const cheek=bar(head,p.deep,sign*w*.86,.08,.26,.07,.21,.29);cheek.rotation.x=-.20;}
 bar(head,p.rubber,0,.205,.42,w*1.75,.14,.12);
 bar(head,p.lens,-.045,.222,.491,w*1.15,.048,.018);
 casting(head,p.deep,[[-.12,w*.84,-.12,.14,.05],[.43,w*.8,-.06,.14,.045],[.48,w*.53,-.01,.09,.03]],0,0,0);
 for(const s of [-1,1]){
  const g=mount(r.spine,'body',.52*s,1.22,.53);g.rotation.z=s*.095;g.rotation.y=s*.11;
  casting(g,p.plate,[[-.53,.56,-.32,.50,.11],[.18,.54,-.39,.54,.12],[.61,.43,-.20,.37,.09],[.74,.35,-.08,.22,.06]],0,0,0);
  for(let j=0;j<3;j++)bar(g,p.deep,s*.05,.03+j*.085,.73,.43,.047,.042);
  const bank=mount(r.spine,'body',s*.64,1.71,-.57);bank.rotation.x=-.24;
  casting(bank,p.deep,[[-.40,.29,-.36,.48,.07],[.03,.34,-.37,.61,.08],[.27,.25,-.25,.48,.055]],0,0,0);
  for(let k=0;k<5;k++)bar(bank,p.lip,0,.01+k*.083,.26,.42,.033,.058);
  bank.scale.set(.63,.54,1.18);
  const arm=r.arms[s>0?'L':'R'],part=s>0?'left':'right',sh=mount(arm.paul,part,0,.005,-.03);
  casting(sh,p.deep,[[-.66,.49,-.29,.29,.09],[.23,.67,-.38,.36,.14],[.69,.42,-.25,.14,.06]],0,0,0);
  casting(sh,p.plate,[[-.74,.46,-.12,.41,.1],[.12,.69,-.23,.45,.11],[.78,.52,-.28,.16,.08]],s*.09,.04,0);
  sh.scale.set(.80,.76,1.06);sh.rotation.z=-s*.20;sh.position.x-=s*.09;
  // A stepped collar reaches from the cab to the outer housing. Both shells have
  // a deep cut directly below the top facet, a joint gap, and a clipped nose.
  const collar=mount(r.spine,'body',s*.95,1.60,.16);
  collar.rotation.z=-s*.20;
  casting(collar,graphite,[[-.46,.26,-.18,.22,.07],[.32,.31,-.22,.18,.06],[.63,.22,-.16,.08,.05]],0,0,0);
  casting(collar,p.plate,[[-.48,.26,.02,.32,.06],[.25,.32,-.00,.29,.07],[.65,.23,-.05,.16,.05]],0,.025,0);
  casting(g,graphite,[[-.25,.54,-.09,.035,.04],[.30,.55,-.11,.035,.035],[.67,.41,-.12,.00,.03]],0,.25,.01);
  casting(g,p.plate,[[-.29,.54,.025,.28,.06],[.32,.54,.012,.27,.06],[.67,.42,-.01,.17,.045]],0,.27,.015);
  // The cap's lower seam wraps onto its outer face, visible from above as
  // well as beside the mech. Two plate levels give the pale edge real thickness.
  const cap=[[-.70,.50,.055,.32,.07],[.11,.73,.025,.38,.09],[.82,.53,-.005,.17,.06]];
  casting(sh,graphite,cap,s*.095,.075,.012).scale.set(.995,1.02,1.015);
  casting(sh,rim,cap,s*.095,.156,.010).scale.set(1.005,.9,1.025);
  const topCoat=p.plate.clone();
  if(s<0)topCoat.userData.cairnRecognition=true;
  casting(sh,topCoat,cap,s*.095,.196,.002).scale.set(1.014,.92,1.045);

  // A second skirt rolls down the outside of the shoulder, leaving a visible black
  // joint between shoulder and forearm. The dark cut and lip describe thickness.
  casting(sh,p.deep,[[-.52,.10,-.47,.24,.055],[.25,.12,-.58,.18,.055],[.63,.10,-.28,.05,.045]],s*.60,-.01,0);
  casting(sh,p.plate,[[-.58,.09,-.38,.24,.05],[.19,.11,-.52,.20,.05],[.56,.09,-.25,.09,.04]],s*.69,0,0);
  for(let j=0;j<3;j++)bar(sh,p.rubber,s*.70,.07-j*.11,.12,.03,.042,.55);
  bar(sh,p.deep,0,-.13,.772,.77,.09,.036);
  for(const u of [-1,1]){bar(sh,p.lip,u*.33,-.13,.803,.065,.045,.022);}
  if(s===1)for(let j=0;j<2;j++)bar(sh,p.stripe,.07+j*.18,-.005,.785,.085,.23,.014,-.32);

  const fore=mount(arm.el,part,0,-d.fo*.5,.07);
  casting(fore,p.plate,[[-.30,.30,-.40,.40,.09],[.17,.39,-.45,.40,.09],[.46,.30,-.34,.29,.075 ]],0,0,0);
  bar(fore,p.deep,0,.12,.47,.45,.16,.05);for(let k=0;k<4;k++)bar(fore,p.lip,-.15+.1*k,.12,.507,.036,.115,.018);
  casting(fore,graphite,[[-.28,.32,.08,.20,.045],[.23,.405,.08,.20,.045],[.49,.31,.05,.16,.035]],0,.035,-.004);
  casting(fore,p.plate,[[-.28,.32,.18,.39,.055],[.23,.405,.18,.39,.07],[.49,.31,.15,.27,.04]],0,.045,-.002);
  const leg=r.legs.find(l=>l.side===(s>0?'L':'R'));
  const shin=mount(leg.kn,'legs',0,-.62,.27);shin.rotation.x=-.12;
  casting(shin,p.deep,[[-.22,.29,-.59,.47,.09],[.14,.37,-.5,.55,.1],[.32,.29,-.42,.37,.07]],0,0,0);
  casting(shin,p.plate,[[-.11,.29,-.50,.48,.09],[.18,.33,-.45,.50,.09],[.39,.24,-.32,.31,.06 ]],s*.055,.0,.045);
  bar(shin,graphite,s*.035,.14,.455,.47,.088,.043,-s*.14);
  bar(shin,rim,s*.035,.21,.459,.44,.029,.04,-s*.14);
 }
 return groups;
}

// Factory armor uses the proving sortie's splinter fields. The shoulder band
// stays on the casting when a workshop finish is applied over the rest.
function finishMaterial(material,factory,armor){
 const band=material.userData.cairnRecognition;
 if(!factory&&!band)return;
 material.onBeforeCompile=shader=>{
  const declarations='varying vec3 cairnPosition; varying vec3 cairnNormal;\n';
  shader.vertexShader=declarations+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ncairnPosition=position; cairnNormal=normal;');
  shader.fragmentShader=declarations+
   'float cairnNoise(vec3 a){return fract(sin(dot(a,vec3(14.71,37.11,92.41)))*42758.5);}\n'+
   shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 coatingNormal=normalize(cairnNormal);
   vec3 ab=abs(coatingNormal);
   vec2 uv=ab.y>ab.z && ab.y>ab.x ? cairnPosition.xz : ab.x>ab.z ? cairnPosition.zy : cairnPosition.xy;
   float grain=cairnNoise(floor(vec3(uv*vec2(28.,65.),3.0)));
   ${factory?`
    float variation=cairnNoise(floor(vec3(uv*vec2(2.5,2.0),7.0)));
    float castingNoise=cairnNoise(floor(cairnPosition*7.0));
    float seam=smoothstep(.016,.055,abs(fract(uv.y*.84+uv.x*.045+.17)-.5));
    float edge=max(0.,1.-abs(fract(uv.y*.84+uv.x*.045+.17)-.535)*62.)*step(.42,grain);
    diffuseColor.rgb*=mix(.72,1.,seam)*(.89+.15*variation+.08*grain+.06*castingNoise)*(.68+.40*clamp(coatingNormal.y*.73+.5,0.,1.));
    diffuseColor.rgb+=vec3(.13,.119,.096)*edge;
   `:''}
   ${factory&&armor?`
    vec2 field=vec2(uv.x*.85+uv.y*.56,uv.y*.94-uv.x*.22);
    float cut=fract(field.x*.66+.3*floor(field.y*1.5)+.16*floor(field.x*1.3+field.y*1.5)+.27);
    float stripe=smoothstep(.60,.615,cut)*(1.-smoothstep(.92,.935,cut));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.49,.56,.46),stripe*.68);
   `:''}
   ${band?`
    float mark=cairnPosition.x-.34*cairnPosition.z+.14;
    float bandPaint=(1.-smoothstep(.072,.086,abs(mark)))+.65*(1.-smoothstep(.017,.024,abs(mark+.158)));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.51,.49,.37)*(.72+.24*grain),clamp(bandPaint,0.,1.)*.91);
   `:''}`);
 };
 material.customProgramCacheKey=()=>['cairn',factory,armor,Boolean(band)].join('/');
}
function fit(m,unit,finish){
 const {rig:r,build}=m,removed=new Set();
 for(const root of [r.neck,r.arms.L.paul,r.arms.R.paul]){
  root.traverse(mesh=>{if(mesh.isMesh)removed.add(mesh);});
 }
 for(const part of Object.keys(build.parts))build.parts[part]=build.parts[part].filter(entry=>!removed.has(entry.m));
 for(const mesh of removed){
  mesh.parent.remove(mesh);
  if(mesh.userData.foundryMerged)mesh.geometry.dispose();
 }

 const factory=finish==='factory';
 const colors=factory?palette:[unit.paint||palette[0],unit.trim?.s||palette[1],unit.trim?.a||palette[2]];
 const channels=['paint_primary','paint_secondary','paint_accent'];
 const mapped=new Map(),owned=new Set(build.ownedMaterials||[]);
 // Each group belongs to its moving subsystem. Keep the enclosing joint and
 // mark the outer shell for the same damage and detach path as other chassis.
 const lens=build.visorMat;
 lens.color.copy(C('#d7a959'));lens.emissive.copy(C('#cc792c')).multiplyScalar(.12);
 lens.metalness=.1;
 for(const {group,part} of bodywork(m,colors)){
  group.traverse(mesh=>{
   if(!mesh.isMesh)return;
   mesh.userData.part=part;
   mesh.userData.detach=true;
   mesh.userData.foundryMerged=true;
   build.parts[part].push(mesh.material===lens?{m:mesh,detach:true,np:true}:{m:mesh,detach:true});
   if(mesh.material!==lens)owned.add(mesh.material);
  });
 }
 m.body.traverse(mesh=>{
  const source=mesh.isMesh&&mesh.material;
  if(!source||source===lens)return;
  const channel=channels.indexOf(source.name);
  if(owned.has(source)){
   if(!mapped.has(source)){
    finishMaterial(source,factory,channel===0);
    mapped.set(source,source);
   }
   return;
  }
  if(channel<0)return;
  if(!mapped.has(source)){
   const material=source.clone();
   material.color.copy(C(colors[channel]));
   material.map=mill;material.normalMap=null;material.roughness=.89;material.metalness=.14;material.envMapIntensity=.35;
   finishMaterial(material,factory,channel!==2);
   mapped.set(source,material);owned.add(material);
  }
  mesh.material=mapped.get(source);
 });
 build.ownedMaterials=[...owned];
 r.neck.scale.setScalar(.95);
 for(const leg of r.legs)leg.an.scale.set(1.08,1,1.14);
 // Keep the inherited gait, sockets and firing grip. Cairn only changes the cast armor.
 m.dims={...m.dims,carry:{...VowChassis.DIMS[4].carry,supportIdle:true,lean:.11}};
 m.cairn=true;
}
function fitRifle(gun){
 if(gun?.id!=='rifle'||!gun.model||!gun.muzzle)return;
 const root=gun.recoil;
 root.updateWorldMatrix(true,true);
 // The stock Kestrel GLB uses its weapon origin as the grip point.
 const grip=gun.grip||gun.model;
 const rear=root.worldToLocal(grip.getWorldPosition(V())),front=root.worldToLocal(gun.muzzle.getWorldPosition(V()));
 const axis=front.clone().sub(rear),len=axis.length(),g=rack(root,0,0,0);
 g.quaternion.setFromUnitVectors(V(0,0,1),axis.normalize());g.position.copy(rear).lerp(front,.13);g.scale.setScalar(len);
 const shroud=coat('#4f554e','weapon_armor_cairn'),iron=coat('#303635'),mark=coat('#b79159');
 casting(g,shroud,[[-.11,.067,-.055,.081,.017],[.22,.083,-.060,.089,.018],[.54,.060,-.038,.062,.013],[.60,.045,-.026,.046,.009]],0,.008,0);
 for(const s of [-1,1]){
  for(let j=0;j<4;j++)bar(g,iron,s*.079,.019,.12+j*.068,.009,.058,.031);
  bar(g,mark,s*.084,.058,.012,.008,.024,.086);
 }
 gun.ownedMaterials.push(shroud,iron,mark);
 g.traverse(mesh=>{if(mesh.isMesh)mesh.userData.foundryMerged=true;});
}
const applies=frame=>typeof FRAMES!=='undefined'&&FRAMES[frame]?.rig==='cairn';
window.IronVowCairn={applies,fit,fitRifle};
})();
