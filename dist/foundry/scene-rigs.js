/* Procedural chassis render into the Sites battle compositor, using its camera, depth order and UI. */
(function(){
'use strict';
if(!window.IronVowFoundryRig)return;
const T=THREE, VC=window.VowChassis, PI=Math.PI;
const {V3,pixels,ground,worldSpan,parts,buildRig,animateMech,lungeK,MEL,behemothBrace,setPartState,wreckMech,mountPoints}=window.IronVowFoundryRig;
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let renderer,scene,camera,failed=false;
const combat=new Map(),previews=new Map();
function clearPreviews(){for(const entry of previews.values())disposeRig(entry.m);previews.clear();}
let previewTarget,studioTarget;
const arsenal=window.IronVowProductionArsenal,bastion=window.IronVowBastion;

let armory,armoryRequested=false;
const clearCombat=()=>{for(const entry of combat.values()){entry.m.cont.parent?.remove(entry.m.cont);disposeRig(entry.m);}combat.clear()};
let combatScope;
const studioLights=[[0xffe6bf,-5,7,5],[0x9fc9e0,6,5,-5]];
function configure(target,size){
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
 const pmrem=new T.PMREMGenerator(target);studioTarget=pmrem.fromScene(env,.045);const texture=studioTarget.texture;
 pmrem.dispose();
 env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
 return texture;
}

function init(){
 if(renderer||failed)return Boolean(renderer);
 try{
  renderer=window.IronVowRenderer.get();
  configure(renderer,pixels);
  window.IronVowRenderer.subscribe(({type})=>{if(type==='restored'){
   clearCombat();clearPreviews();
   previewTarget?.dispose();previewTarget=null;
   studioTarget?.dispose();scene.environment=studioEnvironment(renderer);
  }});
  scene=new T.Scene();
  for(const [color,x,y,z] of studioLights){
   const light=new T.DirectionalLight(C(color),x<0?2.5:1.7);light.position.set(x,y,z);scene.add(light);
  }
  scene.add(new T.HemisphereLight(C(0xd6e4eb),C(0x42434a),1.0));
  scene.environment=studioEnvironment(renderer);
  if(arsenal&&!armoryRequested){
   armoryRequested=true;
   const url=path=>window.IRON_VOW_INLINE_ASSETS?.[path]||path;
   // The live Warden loads beside the arsenal; until it is ready the field keeps the baked Warden.
   if(window.IronVowWardenRig)window.IronVowWardenRig.load(url('rig-bench/warden-painted.glb'),url('rig-bench/warden-painted-motion.json'))
    .then(()=>{if(window.Event)window.dispatchEvent?.(new window.Event('bastion-art-ready'))},()=>{});
   arsenal.load(url('rig-bench/weapons.glb'),url('rig-bench/expansion-weapons.glb?rev=heavy-ordnance'),url('rig-bench/shields.glb'))
    .then(scene=>{armory=scene;clearPreviews();if(window.Event)window.dispatchEvent?.(new window.Event('bastion-art-ready'))},()=>{});
  }
  camera=new T.OrthographicCamera(-worldSpan/2,worldSpan/2,worldSpan/2,-worldSpan/2,.1,100);
  return true;
 }catch(error){disable(error);return false}
}
function disable(error){
 if(failed)return;
 failed=true;
 clearCombat();
 window.IronVowRenderer.fatal(error||Error('Shared scene rendering failed'));renderer=null;

 if(error)console.warn('Foundry switched to baked rendering',error);
}
function setCamera(elevation,azimuth=0){
 const targetY=3.55;
 camera.position.set(Math.sin(azimuth)*25,Math.sin(elevation)*25+targetY,Math.cos(azimuth)*25);
 camera.lookAt(0,targetY,0);
 camera.updateMatrixWorld(true);
}
function disposeRig(m){
 const unique=new Set([m.build.visorMat,m.build.stackMat,...(m.build.ownedMaterials||[])]);
 if(m.live)for(const entries of Object.values(m.build.parts))
  for(const entry of entries)unique.add(entry.m.material);
 // The kit caches shared geometries. Merged per-rig buffers are uniquely owned.
 m.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose()});
 if(m.live)VC.releaseOwnedMaterials(unique);
 else unique.forEach(material=>material.dispose());
}
function makeSurface(){
 const surface=document.createElement('canvas');surface.width=surface.height=640;return surface;
}
function paintRig(m,surface,target=renderer,groundRow=ground){
 const size=surface.width,center=V3().project(camera),offsetY=Math.round(size*(groundRow-(.5-center.y*.5)));
 if(!previewTarget){previewTarget=new T.WebGLRenderTarget(size,size);previewTarget.texture.encoding=T.sRGBEncoding;}
 if(previewTarget.width!==size)previewTarget.setSize(size,size);
 const pixels=new Uint8Array(size*size*4),previous=target.getRenderTarget(),parent=m.cont.parent;
 scene.add(m.cont);
 try{
  target.setRenderTarget(previewTarget);target.render(scene,camera);
  window.IronVowPerformance?.recordRender(target.info);
  target.readRenderTargetPixels(previewTarget,0,0,size,size,pixels);
  const g=surface.getContext('2d'),image=g.createImageData(size,size);
  for(let y=0;y<size;y++)image.data.set(pixels.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);
  g.clearRect(0,0,size,size);g.putImageData(image,0,offsetY);
 }finally{target.setRenderTarget(previous);scene.remove(m.cont);if(parent)parent.add(m.cont);}
}
function projectedAnchor(point){
 const p=point.project(camera);
 const center=V3().project(camera);
 return [.5+(p.x-center.x)*.5,ground-(p.y-center.y)*.5];
}
function anchor(o){return projectedAnchor(o.getWorldPosition(V3()));}
const WARDEN_SPAN=1.3;
// Project with the Warden's tall frame (camera still enlarged), then map the surface point into the unit's bounds.
function wardenAnchor(point,groundRow){
 camera.left=camera.bottom=-worldSpan*WARDEN_SPAN/2;camera.right=camera.top=worldSpan*WARDEN_SPAN/2;camera.updateProjectionMatrix();
 try{
  const p=point.clone().project(camera),center=V3().project(camera);
  const x=.5+(p.x-center.x)*.5,y=groundRow-(p.y-center.y)*.5;
  return [.5+(x-.5)*WARDEN_SPAN,(1-WARDEN_SPAN)/2+y*WARDEN_SPAN];
 }finally{camera.left=camera.bottom=-worldSpan/2;camera.right=camera.top=worldSpan/2;camera.updateProjectionMatrix();}
}


function draw(u,t,pose,scope,model,custom){
 if(!init())return null;
 if(!pose.preview&&combatScope!==scope){clearCombat();combatScope=scope;}
 const cache=pose.preview?previews:combat;

 const facing=u.face??(u.team==='enemy'?1:-1),key=pose.preview?u.id:u.id+(pose.cinematic?'|shot|'+facing:'|field');
 let entry=cache.get(key);

 if(!entry){
  const m=custom==='warden'?window.IronVowWardenRig?.build(u.team,u.paint,{trim:u.trim}):custom==='bastion'?bastion.buildRuntime(u.team,u.paint,u.trim):buildRig(model,u.team,u.paint,u.team==='enemy'?'F'+(u.index+1):null,u.upgrade,u.trim);
  if(!m)return null;
  entry={m,surface:makeSurface(),stamp:null,anchors:{}};cache.set(key,entry);
 }
 if(entry.time>t)return {...entry,anchors:entry.previousAnchors||entry.anchors};
 const m=entry.m,dt=entry.time==null?1/60:clamp(t-entry.time,0,.042);
 const canBrace=u.alive&&u.hp.legs>0&&!u.motion;
 const artillery=canBrace&&!pose.strikeKind?behemothBrace(m,u.attack,t):null;
 const mortarAge=canBrace?pose.mortarAge:undefined;
 const stamp=[pose.heading,Boolean(armory),u.alive,u.shield,pose.death,pose.kneel,pose.impact,pose.cycle,pose.aim,pose.brace,pose.recoil,pose.weaponKick,pose.weaponSpin,pose.weaponFeed,pose.weaponCharge,pose.primePhase,pose.primeProgress,pose.strikeProgress,pose.strikeKind,Boolean(u.motion),artillery,mortarAge,...parts.map(p=>u.hp[p])].join('/');
 if(!pose.world&&entry.stamp===stamp)return entry;
 entry.time=t;entry.stamp=stamp;entry.previousAnchors={...entry.anchors};
 for(const part of parts){
  if(!u.max[part])continue;
  const hp=u.hp[part];
  setPartState(m,part,hp<=0?2:hp<u.max[part]/2?1:0);
 }
 if(!u.alive&&u.downReason!=='pilot'&&pose.explosion>=.65&&!m.wrecked){wreckMech(m);m.wrecked=true}
 const world=pose.world,face=world?.face??pose.heading??facing*Math.PI/4,aim=pose.aim;
 if(!world)m.yaw=face;else{m.scale=.9;m.cont.scale.setScalar(.9);}
 const paired=!world&&u.motion?.stepBeats!=null;
 const step=!pose.reducedMotion&&Boolean(world?u.motion:paired||pose.phase>0&&u.motion);
 const prime=pose.primeProgress;
 const primeLift=pose.primePhase==='step'||pose.primePhase==='return'?Math.sin(PI*prime)*.5:0;
 const melee=Boolean(pose.strikeKind), meleeAge=pose.strikeProgress<=.7
  ?pose.strikeProgress/.7*MEL.hit:MEL.hit+(pose.strikeProgress-.7)/.3*(MEL.end-MEL.hit);
 const lunge=melee?lungeK(meleeAge)*1.25:0;
 const travel=step?(pose.phase-.5)*1.8:0;
 const pos=world?V3(world.x,0,world.z):paired?V3((u.vx-u.vz)*1.8*Math.SQRT1_2,0,(u.vx+u.vz)*1.8*Math.SQRT1_2):
  V3(Math.sin(face)*(lunge+travel),0,Math.cos(face)*(lunge+travel));
 if(paired&&!m.wasMoving)m.init=false;
 if(!world&&!step&&m.wasMoving){
  for(const L of m.legs){L.swing=false;L.settle=null;L.planted.sub(m.travelRoot??m.cont.position);L.foot.copy(L.planted)}
 }
 m.wasMoving=Boolean(step);
 m.travelRoot=paired?pos:null;
 m.aim.until=aim>.01?t+.01:-1;m.aim.blend=aim;
 // Aim at chest height of a like-sized target: level for every rig, including the larger live Warden.
 if(world)m.aim.point.copy(world.aim);else m.aim.point.set(Math.sin(face)*20,4*(m.scale||1),Math.cos(face)*20);
 m.recoil=Math.abs(pose.recoil)*.58;
 m.melee=melee?{age:meleeAge,thrust:pose.strikeKind==='pike'}:null;
 if(custom==='warden')window.IronVowWardenRig.meleeStyle(m,pose.strikeKind||u.melee);
 m.s.comp.x=-Math.max(0,pose.land||0)*.23-prime*.14;
 m.s.arm.x=pose.impact*.75;
 // The rig's carry poses depend on what the left hand holds and on the rifle the free hand can grip.
 m.offhand=!entry.armed||u.hp.left<=0?'none':entry.shield?'shield':entry.secondary?'blade':'free';
 m.primaryWeapon=entry.primary&&u.hp.right>0?entry.primary:null;
 animateMech(m,{pos,ground:world?.y,groundAt:world?.groundAt,face,heading:world?.heading??face,moving:Boolean(step),speed:world?.speed??2.6,stepLen:world?1.7:paired?.90:1.55,cycle:paired?pose.cycle:undefined,brace:pose.brace,
  alive:u.alive,down:u.downReason,deathAge:pose.reducedMotion&&!u.alive?2:pose.deathAge,pilotRatio:u.hp.pilot/u.max.pilot,
  armDead:u.hp.right<=0,legsDead:u.hp.legs<=0,noPlant:world?false:!step,artillery,mortarAge,ready:prime>0||aim>.01},dt,t);
 if(custom==='warden')window.IronVowWardenRig.afterAnimate(m);else if(custom==='bastion')bastion.afterAnimate(m);
 // A rig with its own firing stance (m.fireStance) leads with its left foot instead of this generic right-foot step.
 if(!world&&prime>0&&u.alive&&!artillery&&!Number.isFinite(mortarAge)&&!m.fireStance){
  const lead=m.rig.legs[1];
  const target=V3(lead.restX,m.dims.ankleH+primeLift,lead.restZ+prime*.82);
  VC.solveLeg(m.rig,m.dims,lead,target,-primeLift*.32);
 }
 // The battle tile is already moving on the 2D board. Use the rig's travel only to solve its planted gait.
 if(!world&&step)m.cont.position.set(0,0,0);
 if(armory&&!entry.armed){
  entry.primary=arsenal.mount(armory,u.weapon,m.rig.arms.R.so);
  entry.secondary=arsenal.mount(armory,u.melee,m.rig.arms.L.so);
  entry.armed=true;
  // The Warden carries the production arsenal at its Rig Bench scale.
  if(custom==='warden'||custom==='bastion')for(const w of [entry.primary,entry.secondary])w?.model.scale.setScalar(.62);
 }
 if(armory&&entry.shieldId!==u.shield){
  entry.shieldId=u.shield;
  if(entry.shield)entry.shield.mount.parent?.remove(entry.shield.mount);
  entry.shield=arsenal.mountShield(armory,u.shield,m.rig.arms.L.so);
  if(custom==='warden'||custom==='bastion')entry.shield?.mount.scale.setScalar(.62);
  if(!entry.shield)delete entry.anchors.shield;
 }
 arsenal.poseShield(entry.shield,u,face);
 if(entry.primary){
  entry.primary.mount.visible=u.alive&&u.hp.right>0;
  if(arsenal.isExpansion(u.weapon))arsenal.animate(entry.primary,pose);
  else entry.primary.recoil.position.z=-Math.abs(pose.recoil)*.22;
 }
 if(entry.secondary){
  entry.secondary.mount.visible=u.alive&&u.hp.left>0&&(melee||model===4||custom==='warden');
  if(entry.secondary.spike)entry.secondary.spike.position.z=entry.secondary.spikeRest+(pose.strikeProgress>=.61&&pose.strikeProgress<=.81?.50:0);
  arsenal.animate(entry.secondary,pose);
 }
 m.cont.updateMatrixWorld(true);
 if(!world){
  setCamera(.46);
  const tall=custom==='warden',target=renderer,groundRow=tall?(ground-(1-WARDEN_SPAN)/2)/WARDEN_SPAN:ground;
  if(tall){camera.left=camera.bottom=-worldSpan*WARDEN_SPAN/2;camera.right=camera.top=worldSpan*WARDEN_SPAN/2;camera.updateProjectionMatrix();}
  try{paintRig(m,entry.surface,target,groundRow);}finally{camera.left=camera.bottom=-worldSpan/2;camera.right=camera.top=worldSpan/2;camera.updateProjectionMatrix();}
 }
 const tall=custom==='warden',groundRow=tall?(ground-(1-WARDEN_SPAN)/2)/WARDEN_SPAN:ground;
 entry.span=tall?WARDEN_SPAN:undefined;
 const r=m.rig,mounts=mountPoints(m),primary=entry.primary,secondary=entry.secondary;
 for(const [name,object] of Object.entries({...mounts,body:r.spine,pilot:r.neck,
  right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,
  muzzle:primary?.muzzle,muzzle2:primary?.muzzle2,meleeTip:secondary?.tip,mortarMuzzle:m.mortar?.muzzle,shield:entry.shield?.face})){
  if(object)entry.anchors[name]=tall?wardenAnchor(object.getWorldPosition(V3()),groundRow):anchor(object);
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
// The eight live frames require WebGL.
function wardenReady(){return !failed&&init()&&Boolean(window.IronVowWardenRig?.ready());}
function metrics(){return window.IronVowRenderer.metrics();}
function preview(u,model,custom,angle=0){
 const hp=u.hp||{body:100,pilot:100,right:100,left:100,legs:100},max=u.max||{...hp};
 const key=JSON.stringify([u.frame,u.team,u.paint,u.trim,u.weapon,u.melee,u.shield,u.upgrade,hp,max,angle]);
 if(previews.has(key))return previews.get(key);
 const unit={...u,id:key,index:u.index||0,team:u.team||'ally',alive:true,hp,max};
 const pose={preview:true,heading:[-.68,.68,2.46,-2.46][angle]||-.68,reducedMotion:true,phase:0,primeProgress:0,strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0};
 const entry=draw(unit,0,pose,null,model,custom);
 if(entry){entry.url=entry.surface.toDataURL('image/png');if(previews.size>16){const [first,value]=previews.entries().next().value;disposeRig(value.m);previews.delete(first);}}
 return entry;
}
function previewAnimated(u,t,pose,model,custom,angle=0){
 const hp=u.hp||{body:100,pilot:100,right:100,left:100,legs:100},max=u.max||{...hp};
 return draw({...u,hp,max},t,{phase:0,primeProgress:0,strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0,...pose,preview:true,heading:[-.68,.68,2.46,-2.46][angle]||-.68},null,model,custom);
}
window.IronVowFoundry={metrics,draw:withFallback(draw),preview:withFallback(preview),previewAnimated:withFallback(previewAnimated),entry:id=>combat.get(id+'|field'),clearCombat,wardenReady};
})();
