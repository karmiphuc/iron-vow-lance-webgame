/* Procedural chassis render into the Sites battle compositor, using its camera, depth order and UI. */
(function(){
'use strict';
if(!window.IronVowFoundryRig)return;
const T=THREE, VC=window.VowChassis, PI=Math.PI;
const {V3,pixels,ground,worldSpan,parts,buildRig,animateMech,lungeK,MEL,behemothBrace,setPartState,wreckMech,mountPoints}=window.IronVowFoundryRig;
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let renderer, scene, camera, failed=false, bastionRenderer, bastionEnvironment, bastionHDFailed=false;
const combat=new Map();
const arsenal=window.IronVowProductionArsenal,bastion=window.IronVowBastion;
let bastionPreview;
let armory,armoryRequested=false;
const clearCombat=()=>{for(const entry of combat.values())disposeRig(entry.m);combat.clear()};
let combatScope;
const studioLights=[[0xffe6bf,-5,7,5],[0x9fc9e0,6,5,-5]];
function configure(target,size){
 target.setSize(size,size,false);
 target.outputEncoding=T.sRGBEncoding;
 target.toneMapping=T.ACESFilmicToneMapping;
 target.setClearColor(0,0);
}
function studioEnvironment(target){
 const env=new T.Scene();
 env.background=new T.Color(0x34383b);
 for(const [color,x,y,z] of studioLights){
  const panel=new T.Mesh(new T.PlaneGeometry(9,6),new T.MeshBasicMaterial({color,side:T.DoubleSide}));
  panel.position.set(x,y,z);panel.lookAt(0,2,0);env.add(panel);
 }
 const pmrem=new T.PMREMGenerator(target),texture=pmrem.fromScene(env,.045).texture;
 pmrem.dispose();
 env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
 return texture;
}
function hdRenderer(){
 if(!bastionRenderer&&!bastionHDFailed){
  try{
   bastionRenderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
   configure(bastionRenderer,window.matchMedia?.('(max-width: 760px)').matches?704:896);
   bastionEnvironment=studioEnvironment(bastionRenderer);
   bastionRenderer.domElement.addEventListener('webglcontextlost',()=>{
    bastionHDFailed=true;bastionRenderer=null;
   },{once:true});
  }catch(error){bastionHDFailed=true;bastionRenderer?.dispose();bastionRenderer=null;console.warn('Bastion using standard resolution',error)}
 }
 return bastionRenderer||renderer;
}
function init(){
 if(renderer||failed)return Boolean(renderer);
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
  configure(renderer,pixels);
  renderer.domElement.addEventListener('webglcontextlost',()=>disable(),{once:true});
  scene=new T.Scene();
  for(const [color,x,y,z] of studioLights){
   const light=new T.DirectionalLight(C(color),x<0?2.5:1.7);light.position.set(x,y,z);scene.add(light);
  }
  scene.add(new T.HemisphereLight(C(0xd6e4eb),C(0x42434a),1.0));
  scene.environment=studioEnvironment(renderer);
  if(arsenal&&!armoryRequested){
   armoryRequested=true;
   const url=path=>window.IRON_VOW_INLINE_ASSETS?.[path]||path;
   arsenal.load(url('rig-bench/weapons.glb'),url('rig-bench/expansion-weapons.glb?rev=undercarry'),url('rig-bench/shields.glb'))
    .then(scene=>{armory=scene;if(window.Event)window.dispatchEvent?.(new window.Event('bastion-art-ready'))},()=>{});
  }
  camera=new T.OrthographicCamera(-worldSpan/2,worldSpan/2,worldSpan/2,-worldSpan/2,.1,100);
  return true;
 }catch(error){disable(error);return false}
}
function disable(error){
 if(failed)return;
 failed=true;
 clearCombat();
 renderer?.dispose();renderer=null;
 bastionRenderer?.dispose();bastionRenderer=null;
 bastionEnvironment?.dispose();bastionEnvironment=null;
 if(error)console.warn('Foundry switched to baked rendering',error);
}
function setCamera(elevation,azimuth=0){
 const targetY=3.55;
 camera.position.set(Math.sin(azimuth)*25,Math.sin(elevation)*25+targetY,Math.cos(azimuth)*25);
 camera.lookAt(0,targetY,0);
 camera.updateMatrixWorld(true);
}
function disposeRig(m){
 if(m.mixer){bastion.dispose(m);return}
 const unique=new Set([m.build.visorMat,m.build.stackMat]);
 // The kit caches shared geometries. Merged per-rig buffers are uniquely owned.
 m.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose()});
 unique.forEach(material=>material.dispose());
}
function makeSurface(){
 const surface=document.createElement('canvas');surface.width=surface.height=pixels;return surface;
}
function paintRig(m,surface,target=renderer){
 const size=surface.width,center=V3().project(camera),offsetY=size*(ground-(.5-center.y*.5));
 const environment=scene.environment;
 if(target===bastionRenderer)scene.environment=bastionEnvironment;
 scene.add(m.cont);
 try{
  target.render(scene,camera);
  const g=surface.getContext('2d');
  g.clearRect(0,0,size,size);
  g.drawImage(target.domElement,0,offsetY,size,size);
 }finally{scene.remove(m.cont);scene.environment=environment}
}
function projectedAnchor(point){
 const p=point.project(camera);
 const center=V3().project(camera);
 return [.5+(p.x-center.x)*.5,ground-(p.y-center.y)*.5];
}
function anchor(o){return projectedAnchor(o.getWorldPosition(V3()));}
function drawBastion(u,t,pose,entry){
 const target=hdRenderer(),size=target.domElement.width;
 if(entry.surface.width!==size)entry.surface.width=entry.surface.height=size;
 const stamp=[bastion.frame(u,t,pose),pose.heading,u.alive,Boolean(armory),u.team,u.weapon,u.melee,u.shield,u.paint,
  size,pose.strikeKind,pose.strikeProgress,pose.weaponKick,pose.weaponSpin,u.trim?.s,u.trim?.a,...parts.map(p=>u.hp[p]),u.alive?0:pose.deathAge].join('/');
 if(entry.stamp===stamp)return entry;
 entry.stamp=stamp;
 const {frame,anchors,primary,secondary,shield}=bastion.animate(entry.m,u,t,pose,armory);
 entry.frame=frame;entry.primary=primary;entry.secondary=secondary;entry.shield=shield;
 setCamera(.46);
 paintRig(entry.m,entry.surface,target);
 for(const [key,o] of Object.entries(anchors))if(o)entry.anchors[key]=anchor(o);else delete entry.anchors[key];
 return entry;
}
function previewBastion(u,angle,previewFrame,previewPose){
 if(!bastion||!init())return null;
 if(!bastionPreview){
  const m=bastion.build();
  if(!m)return null;
  bastionPreview={m,surface:makeSurface(),anchors:{}};
 }
 const hp={body:100,pilot:100,right:100,left:100,legs:100};
 const unit={...u,team:'ally',alive:true,max:hp,hp};
 return drawBastion(unit,0,{...previewPose,previewFrame,heading:[-.68,.68,2.46,-2.46][angle]??-.68},bastionPreview);
}
function draw(u,t,pose,scope,model,custom){
 if(!init())return null;
 if(combatScope!==scope){
  clearCombat();combatScope=scope;
 }
 const facing=u.face??(u.team==='enemy'?1:-1), key=u.id+(pose.cinematic?'|shot|'+facing:'|field');
 let entry=combat.get(key);
 if(custom==='bastion'&&bastion){
  if(!entry){const m=bastion.build();if(!m)return null;entry={m,surface:makeSurface(),anchors:{}};combat.set(key,entry)}
  return drawBastion(u,t,pose,entry);
 }
 if(!entry){
  const m=buildRig(model,u.team,u.paint,u.team==='enemy'?'F'+(u.index+1):null,u.upgrade,u.trim);
  entry={m,surface:makeSurface(),stamp:null,anchors:{}};combat.set(key,entry);
 }
 if(entry.time>t)return {...entry,anchors:entry.previousAnchors||entry.anchors};
 const m=entry.m,dt=entry.time==null?1/60:clamp(t-entry.time,0,.042);
 const canBrace=u.alive&&u.hp.legs>0&&!u.motion;
 const artillery=canBrace&&!pose.strikeKind?behemothBrace(m,u.attack,t):null;
 const mortarAge=canBrace?pose.mortarAge:undefined;
 const stamp=[pose.heading,Boolean(armory),u.alive,u.shield,pose.death,pose.kneel,pose.impact,pose.cycle,pose.aim,pose.brace,pose.recoil,pose.weaponKick,pose.weaponSpin,pose.primePhase,pose.primeProgress,pose.strikeProgress,pose.strikeKind,Boolean(u.motion),artillery,mortarAge,...parts.map(p=>u.hp[p])].join('/');
 if(entry.stamp===stamp)return entry;
 entry.time=t;entry.stamp=stamp;entry.previousAnchors={...entry.anchors};
 for(const part of parts){
  if(!u.max[part])continue;
  const hp=u.hp[part];
  setPartState(m,part,hp<=0?2:hp<u.max[part]/2?1:0);
 }
 if(!u.alive&&u.downReason!=='pilot'&&pose.explosion>=.65&&!m.wrecked){wreckMech(m);m.wrecked=true}
 const face=pose.heading??facing*Math.PI/4, aim=pose.aim;
 m.yaw=face;
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
 m.melee=melee?{age:meleeAge,thrust:pose.strikeKind==='pike'}:null;
 m.s.comp.x=-Math.max(0,pose.land||0)*.23-prime*.14;
 m.s.arm.x=pose.impact*.75;
 animateMech(m,{pos,face,heading:face,moving:Boolean(step),speed:2.6,stepLen:1.55,brace:pose.brace,
  alive:u.alive,down:u.downReason,deathAge:pose.reducedMotion&&!u.alive?2:pose.deathAge,pilotRatio:u.hp.pilot/u.max.pilot,
  armDead:u.hp.right<=0,legsDead:u.hp.legs<=0,noPlant:!step,artillery,mortarAge},dt,t);
 if(prime>0&&u.alive&&!artillery&&!Number.isFinite(mortarAge)){
  const lead=m.rig.legs[1];
  const target=V3(lead.restX,m.dims.ankleH+primeLift,lead.restZ+prime*.82);
  VC.solveLeg(m.rig,m.dims,lead,target,-primeLift*.32);
 }
 // The battle tile is already moving on the 2D board. Use the rig's travel only to solve its planted gait.
 if(step)m.cont.position.set(0,0,0);
 if(armory&&!entry.armed){
  entry.primary=arsenal.mount(armory,u.weapon,m.rig.arms.R.so);
  entry.secondary=arsenal.mount(armory,u.melee,m.rig.arms.L.so);
  entry.armed=true;
 }
 if(armory&&entry.shieldId!==u.shield){
  entry.shieldId=u.shield;
  if(entry.shield)entry.shield.mount.removeFromParent();
  entry.shield=arsenal.mountShield(armory,u.shield,m.rig.arms.L.so);
  if(!entry.shield)delete entry.anchors.shield;
 }
 arsenal.poseShield(entry.shield,u,face);
 if(entry.primary){
  entry.primary.mount.visible=u.alive&&u.hp.right>0;
  if(arsenal.isExpansion(u.weapon))arsenal.animate(entry.primary,pose);
  else entry.primary.recoil.position.z=-Math.abs(pose.recoil)*.22;
 }
 if(entry.secondary){
  entry.secondary.mount.visible=u.alive&&u.hp.left>0&&(melee||(model===4&&aim<.2));
  if(entry.secondary.spike)entry.secondary.spike.position.z=entry.secondary.spikeRest+(pose.strikeProgress>=.61&&pose.strikeProgress<=.81?.50:0);
  arsenal.animate(entry.secondary,pose);
 }
 m.cont.updateMatrixWorld(true);
 setCamera(.46);
 paintRig(m,entry.surface);
 const r=m.rig,mounts=mountPoints(m),primary=entry.primary,secondary=entry.secondary;
 for(const [name,object] of Object.entries({...mounts,body:r.spine,pilot:r.neck,
  right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,
  muzzle:primary?.muzzle,muzzle2:primary?.muzzle2,meleeTip:secondary?.tip,mortarMuzzle:m.mortar?.muzzle,shield:entry.shield?.face})){
  if(object)entry.anchors[name]=anchor(object);
 }
 if(m.artilleryBrace){
  const shoes=r.legs.filter(leg=>leg.kneeShoe).map(leg=>leg.kneeShoe.localToWorld(V3(0,-.3155,.035)));
  if(shoes.length===2)entry.anchors.leadFoot=projectedAnchor(shoes[0].lerp(shoes[1],.5));
 }
 return entry;
}
// A driver error or context loss must leave the tactical UI and its animation loop usable.
function withFallback(render){
 return (...args)=>{
  try{return render(...args)}catch(error){disable(error);return null}
 };
}
window.IronVowFoundry={draw:withFallback(draw),previewBastion:withFallback(previewBastion),clearCombat};
})();
