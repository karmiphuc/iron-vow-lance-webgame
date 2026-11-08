/* Procedural chassis render into the Sites battle compositor, using its camera, depth order and UI. */
(function(){
'use strict';
if(!window.IronVowFoundryRig)return;
const T=THREE, VC=window.VowChassis, PI=Math.PI;
const {V3,pixels,ground,worldSpan,parts,buildRig,animateMech,lungeK,MEL,setPartState,wreckMech}=window.IronVowFoundryRig;
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let renderer, scene, camera, failed=false;
const combat=new Map(), thumbs=new Map();
let combatScope;
function init(){
 if(renderer||failed)return Boolean(renderer);
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setSize(pixels,pixels,false);
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.setClearColor(0,0);
  renderer.domElement.addEventListener('webglcontextlost',()=>{failed=true;renderer=null},{once:true});
  scene=new T.Scene();
  const env=new T.Scene();
  env.background=new T.Color(0x34383b);
  for(const [color,x,y,z] of [[0xffe6bf,-5,7,5],[0x9fc9e0,6,5,-5]]){
   const panel=new T.Mesh(new T.PlaneGeometry(9,6),new T.MeshBasicMaterial({color,side:T.DoubleSide}));
   panel.position.set(x,y,z);panel.lookAt(0,2,0);env.add(panel);
   const light=new T.DirectionalLight(C(color),x<0?2.5:1.7);light.position.copy(panel.position);scene.add(light);
  }
  scene.add(new T.HemisphereLight(C(0xd6e4eb),C(0x42434a),1.0));
  const pmrem=new T.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(env,.045).texture;
  pmrem.dispose();
  env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
  camera=new T.OrthographicCamera(-worldSpan/2,worldSpan/2,worldSpan/2,-worldSpan/2,.1,100);
  return true;
 }catch(error){renderer?.dispose();renderer=null;failed=true;console.warn('Foundry WebGL unavailable',error);return false}
}
function setCamera(elevation,azimuth=0){
 const targetY=3.55;
 camera.position.set(Math.sin(azimuth)*25,Math.sin(elevation)*25+targetY,Math.cos(azimuth)*25);
 camera.lookAt(0,targetY,0);
 camera.updateMatrixWorld(true);
}
function disposeRig(m){
 const unique=new Set([m.build.visorMat,m.build.stackMat]);
 // The kit caches shared geometries. Merged per-rig buffers are uniquely owned.
 m.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose()});
 unique.forEach(material=>material.dispose());
}
function makeSurface(){
 const surface=document.createElement('canvas');surface.width=surface.height=pixels;return surface;
}
function paintRig(m,surface){
 const center=V3().project(camera),offsetY=pixels*(ground-(.5-center.y*.5));
 scene.add(m.cont);
 try{
  renderer.render(scene,camera);
  const g=surface.getContext('2d');
  g.clearRect(0,0,pixels,pixels);
  g.drawImage(renderer.domElement,0,offsetY);
 }finally{scene.remove(m.cont)}
}
function anchor(o){
 const p=o.getWorldPosition(V3()).project(camera);
 const center=V3().project(camera);
 return [.5+(p.x-center.x)*.5,ground-(p.y-center.y)*.5];
}
function thumb(model,team='ally',paint=null,primary='rifle',melee=null,trim=null,angle=-.54,elevation=.18){
 const key=[model,team,paint,primary,melee,trim?.s,trim?.a,angle,elevation].join('/');
 if(thumbs.has(key))return thumbs.get(key);
 if(!init())return null;
 const m=buildRig(model,team,paint,primary,melee,null,0,trim),surface=makeSurface();
 setCamera(elevation);
 if(m.blade)m.wpn.mount.visible=false;
 animateMech(m,{pos:V3(),face:angle,noPlant:true,alive:true,brace:0},.016,0);
 paintRig(m,surface);
 const url=surface.toDataURL('image/webp',.90);
 disposeRig(m);
 if(thumbs.size>=36)thumbs.delete(thumbs.keys().next().value);
 thumbs.set(key,url);
 return url;
}
function draw(u,t,pose,scope,model){
 if(!init())return null;
 if(combatScope!==scope){
  for(const entry of combat.values())disposeRig(entry.m);
  combat.clear();combatScope=scope;
 }
 const facing=u.face??(u.team==='enemy'?1:-1), key=u.id+'|'+facing;
 let entry=combat.get(key);
 if(!entry){
  const m=buildRig(model,u.team,u.paint,u.weapon,u.melee,u.team==='enemy'?'F'+(u.index+1):null,u.upgrade,u.trim);
  entry={m,surface:makeSurface(),stamp:null,anchors:{}};combat.set(key,entry);
 }
 if(entry.time>t)return {...entry,anchors:entry.previousAnchors||entry.anchors};
 const m=entry.m,dt=entry.time==null?1/60:clamp(t-entry.time,0,.042);
 const stamp=[u.alive,pose.death,pose.kneel,pose.impact,pose.cycle,pose.aim,pose.brace,pose.recoil,pose.primePhase,pose.primeProgress,pose.strikeProgress,...parts.map(p=>u.hp[p])].join('/');
 if(entry.stamp===stamp)return entry;
 entry.time=t;entry.stamp=stamp;entry.previousAnchors={...entry.anchors};
 for(const part of parts){
  if(!u.max[part])continue;
  const hp=u.hp[part];
  setPartState(m,part,hp<=0?2:hp<u.max[part]/2?1:0);
 }
 if(!u.alive&&u.downReason!=='pilot'&&!m.wrecked){wreckMech(m);m.wrecked=true}
 const face=facing*.76, aim=pose.aim;
 const step=pose.phase>0&&u.motion;
 const prime=pose.primeProgress;
 const primeLift=pose.primePhase==='step'||pose.primePhase==='return'?Math.sin(PI*prime)*.5:0;
 const melee=Boolean(pose.strikeKind), meleeAge=pose.strikeProgress<=.7
  ?pose.strikeProgress/.7*MEL.hit:MEL.hit+(pose.strikeProgress-.7)/.3*(MEL.end-MEL.hit);
 const lunge=melee?lungeK(meleeAge)*1.25:0;
 const travel=step?(pose.phase-.5)*1.8:0;
 const pos=V3(Math.sin(face)*(lunge+travel),0,Math.cos(face)*(lunge+travel));
 if(!step&&m.wasMoving){
  for(const L of m.legs){L.swing=false;L.settle=null;L.planted.sub(m.cont.position);L.foot.copy(L.planted)}
 }
 m.wasMoving=Boolean(step);
 m.aim.until=aim>.01?t+.01:-1;m.aim.blend=aim;
 m.aim.point.set(Math.sin(face)*20,4,Math.cos(face)*20);
 m.recoil=Math.abs(pose.recoil)*.58;
 m.melee=melee?{age:meleeAge}:null;
 m.s.comp.x=-Math.max(0,pose.land||0)*.23-prime*.14;
 m.s.arm.x=pose.impact*.75;
 animateMech(m,{pos,face,heading:face,moving:Boolean(step),speed:2.6,stepLen:1.55,brace:pose.brace,
  alive:u.alive,down:u.downReason,deathAge:pose.deathAge,pilotRatio:u.hp.pilot/u.max.pilot,
  armDead:u.hp.right<=0,legsDead:u.hp.legs<=0,noPlant:!step},dt,t);
 if(prime>0&&u.alive){
  const lead=m.rig.legs[1];
  const target=V3(lead.restX,m.dims.ankleH+primeLift,lead.restZ+prime*.82);
  VC.solveLeg(m.rig,m.dims,lead,target,-primeLift*.32);
 }
 // The battle tile is already moving on the 2D board. Use the rig's travel only to solve its planted gait.
 if(step)m.cont.position.set(0,0,0);
 m.wpn.mount.visible=u.hp.right>0;
 if(m.blade)m.blade.mount.visible=(melee||model===4&&!aim)&&u.hp.left>0;
 if(m.blade?.mount.visible&&model===4)m.wpn.mount.visible=false;
 m.cont.updateMatrixWorld(true);
 setCamera(.46);
 paintRig(m,entry.surface);
 const r=m.rig;
 for(const [name,object] of Object.entries({muzzle:m.wpn.muzzle,muzzle2:m.wpn.muzzle,body:r.spine,pilot:r.neck,
  right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,meleeTip:m.blade?.muzzle||r.arms.L.so})){
  entry.anchors[name]=anchor(object);
 }
 return entry;
}
window.IronVowFoundry={draw,thumb};
})();
