/* Live battle rigs and cached UI previews share one WebGL renderer. */
(function(){
'use strict';
if(!window.IronVowFoundryRig)return;
const T=THREE, VC=window.VowChassis, PI=Math.PI;
const {V3,pixels,ground,worldSpan,parts,buildRig,animateMech,lungeK,MEL,behemothBrace,setPartState,wreckMech,mountPoints}=window.IronVowFoundryRig;
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let renderer,scene,camera,failed=false;
const combat=new Map(),previews=new Map(),stageModels={hangar:new Map(),workshop:new Map(),bench:new Map()},objectPortraits=new Map();
function clearPreviews(scope){
 for(const [key,entry] of previews)if(!scope||entry.previewScope===scope){disposeEntry(entry);previews.delete(key);}
}
let previewTarget,studioTarget;
const arsenal=window.IronVowProductionArsenal,rigV2=window.IronVowRigV2;

let armory,armoryLoading;
const clearCombat=()=>{for(const entry of combat.values()){entry.m.cont.parent?.remove(entry.m.cont);disposeEntry(entry);}combat.clear();clearPreviews('battle');};
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
  window.IronVowRenderer.subscribe(({type})=>{
   if(type==='lost'){
    clearCombat();clearPreviews();clearInspection(false);
    previewTarget?.dispose();previewTarget=null;
    studioTarget?.dispose();studioTarget=null;
   }
   if(type==='restored')scene.environment=studioEnvironment(renderer);
  });
  scene=new T.Scene();
  for(const [color,x,y,z] of studioLights){
   const light=new T.DirectionalLight(C(color),x<0?2.5:1.7);light.position.set(x,y,z);scene.add(light);
  }
  scene.add(new T.HemisphereLight(C(0xd6e4eb),C(0x42434a),1.0));
  scene.environment=studioEnvironment(renderer);
  if(arsenal&&!armoryLoading){
   const url=path=>window.IRON_VOW_INLINE_ASSETS?.[path.split('?')[0]]||path;
   armoryLoading=arsenal.load(url('rig-bench/weapons.glb'),url('rig-bench/expansion-weapons.glb?rev=heavy-ordnance'),url('rig-bench/shields.glb'))
    .then(scene=>{armory=scene;clearPreviews();if(window.Event)window.dispatchEvent?.(new window.Event('rig-art-ready'))},()=>{});
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

 if(error)console.warn('Shared live rig rendering failed',error);
}
function setCamera(elevation,azimuth=0){
 const targetY=3.55;
 camera.position.set(Math.sin(azimuth)*25,Math.sin(elevation)*25+targetY,Math.cos(azimuth)*25);
 camera.lookAt(0,targetY,0);
 camera.updateMatrixWorld(true);
}
function disposeEntry({m,primary,secondary,shield}){
 m.cont.parent?.remove(m.cont);
 m.nativeV2?.dispose();
 if(!m.nativeV2?.pose)for(const weapon of [primary,secondary])for(const material of weapon?.ownedMaterials||[])material.dispose();
 for(const material of shield?.ownedMaterials||[])material.dispose();
 const unique=new Set([m.build.visorMat,m.build.stackMat,...(m.build.ownedMaterials||[])]);
 if(m.live)for(const entries of Object.values(m.build.parts))
  for(const entry of entries)unique.add(entry.m.material);
 // The kit caches shared geometries. Merged per-rig buffers are uniquely owned.
 m.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose()});
 VC.releaseOwnedMaterials(unique);
}
function makeSurface(){
 const surface=document.createElement('canvas');surface.width=surface.height=640;return surface;
}
function paintRig(m,surface,target=renderer,groundRow=ground){
 const size=surface.width,center=V3().project(camera),offsetY=Math.round(size*(groundRow-(.5-center.y*.5)));
 paintPreview(m.cont,surface,camera,target,offsetY);
}
function paintPreview(object,surface,view,target=renderer,offsetY=0){
 const size=surface.width;
 if(!previewTarget){previewTarget=new T.WebGLRenderTarget(size,size);previewTarget.texture.encoding=T.sRGBEncoding;}
 if(previewTarget.width!==size)previewTarget.setSize(size,size);
 const pixels=new Uint8Array(size*size*4),previous=target.getRenderTarget(),parent=object.parent;
 scene.add(object);
 try{
  target.setRenderTarget(previewTarget);target.render(scene,view);
  window.IronVowPerformance?.recordRender(target.info);
  target.readRenderTargetPixels(previewTarget,0,0,size,size,pixels);
  const g=surface.getContext('2d'),image=g.createImageData(size,size);
  for(let y=0;y<size;y++)image.data.set(pixels.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);
  g.clearRect(0,0,size,size);g.putImageData(image,0,offsetY);
 }finally{target.setRenderTarget(previous);scene.remove(object);if(parent)parent.add(object);}
}
function objectPortrait(key,object){
 object.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(object);
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(V3()),radius=Math.max(.05,bounds.getSize(V3()).length()*.5);
 const half=radius*1.14,view=new T.OrthographicCamera(-half,half,half,-half,radius,radius*7);
 view.position.copy(center).addScaledVector(V3(4,2.8,6).normalize(),radius*4);
 view.lookAt(center);
 const surface=makeSurface();
 paintPreview(object,surface,view);
 const url=surface.toDataURL('image/png');
 objectPortraits.set(key,url);
 if(objectPortraits.size>32)objectPortraits.delete(objectPortraits.keys().next().value);
 return url;
}
function equipmentThumbnail(kind,id){
 if(!init()||!armory||window.IronVowRenderer.lost)return;
 const key=kind+':'+id;
 if(objectPortraits.has(key))return objectPortraits.get(key);
 const socket=new T.Group();
 const item=kind==='shield'?arsenal.mountShield(armory,id,socket):
  arsenal.mount(armory,window.IronVowWeaponFX?.get(id).asset??id,socket);
 if(!item)return;
 try{return objectPortrait(key,socket);}
 finally{for(const material of item.ownedMaterials||[])material.dispose();}
}
function vehicleThumbnail(kind,facing){
 const vehicles=window.IronVowVehicles;
 if(vehicles?.status(kind)!=='ready'||!init()||window.IronVowRenderer.lost)return;
 const key=kind+':'+facing;
 if(objectPortraits.has(key))return objectPortraits.get(key);
 const record=vehicles.create(kind);
 if(!record)return;
 try{
  const unit={kind,index:0,alive:true,hp:{body:100},max:{body:100}};
  vehicles.update(record,unit,0,V3(),facing>0?.68:-.68,true);
  return objectPortrait(key,record.object);
 }finally{vehicles.release(record);}
}
function projectedAnchor(point){
 const p=point.project(camera);
 const center=V3().project(camera);
 return [.5+(p.x-center.x)*.5,ground-(p.y-center.y)*.5];
}
function anchor(o){return projectedAnchor(o.getWorldPosition(V3()));}
// Remap anchors framing a tall chassis back into the nominal UI surface.
function tallAnchor(point,groundRow,span){
 camera.left=camera.bottom=-worldSpan*span/2;camera.right=camera.top=worldSpan*span/2;camera.updateProjectionMatrix();
 try{
  const p=point.clone().project(camera),center=V3().project(camera);
  const x=.5+(p.x-center.x)*.5,y=groundRow-(p.y-center.y)*.5;
  return [.5+(x-.5)*span,(1-span)/2+y*span];
 }finally{camera.left=camera.bottom=-worldSpan/2;camera.right=camera.top=worldSpan/2;camera.updateProjectionMatrix();}
}


function aimMounted(m,weapon,target,weight,node){
 if(!weapon?.muzzle||weight<=0)return;
 const wrist=node||m.rig.arms.R.wr,worldQ=new T.Quaternion(),parentQ=new T.Quaternion(),delta=new T.Quaternion();
 // A long gun can extend past a nearby target. Pull the articulated arm back
 // around its shoulder until the target lies beyond the muzzle's pivot radius;
 // the weapon stays attached to the hand throughout the adjustment.
 const shoulder=wrist===m.rig?.arms.R.wr?m.rig.arms.R.sh:wrist===m.rig?.arms.L.wr?m.rig.arms.L.sh:null;
 if(shoulder){
  m.cont.updateMatrixWorld(true);
  let pivot=wrist.getWorldPosition(V3());const muzzle=weapon.muzzle.getWorldPosition(V3()),radius=muzzle.distanceTo(pivot)+.05;
  if(pivot.distanceTo(target)<radius){
   const spine=m.rig.spine,shoulderPoint=shoulder.getWorldPosition(V3()),armLength=pivot.distanceTo(shoulderPoint);
   if(spine&&shoulderPoint.distanceTo(target)+armLength<radius){
    const origin=spine.getWorldPosition(V3()),lever=shoulderPoint.clone().sub(origin),away=origin.clone().sub(target);
    if(lever.lengthSq()>1e-8&&away.lengthSq()>1e-8){
     const turn=new T.Quaternion().setFromUnitVectors(lever.clone().normalize(),away.normalize()),angle=2*Math.acos(Math.min(1,Math.abs(turn.w))),limit=angle?Math.min(1,.9/angle):0,base=spine.quaternion.clone();
     const place=f=>{spine.quaternion.copy(base);spine.getWorldQuaternion(worldQ);spine.parent.getWorldQuaternion(parentQ);delta.identity().slerp(turn,f);spine.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));m.cont.updateMatrixWorld(true);return shoulder.getWorldPosition(V3()).distanceTo(target)+armLength;};
     if(place(limit)>=radius){let low=0,high=limit;for(let i=0;i<16;i++){const mid=(low+high)/2;if(place(mid)>=radius)high=mid;else low=mid;}place(high*Math.min(1,weight));}else place(limit*Math.min(1,weight));
     pivot=wrist.getWorldPosition(V3());
    }
   }
   const origin=shoulder.getWorldPosition(V3()),arm=pivot.clone().sub(origin),away=origin.clone().sub(target);
   if(arm.lengthSq()>1e-8&&away.lengthSq()>1e-8){
    const turn=new T.Quaternion().setFromUnitVectors(arm.clone().normalize(),away.normalize()),base=shoulder.quaternion.clone();
    const place=f=>{shoulder.quaternion.copy(base);shoulder.getWorldQuaternion(worldQ);shoulder.parent.getWorldQuaternion(parentQ);delta.identity().slerp(turn,f);shoulder.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));m.cont.updateMatrixWorld(true);return wrist.getWorldPosition(V3()).distanceTo(target);};
    if(place(1)>=radius){let low=0,high=1;for(let i=0;i<16;i++){const mid=(low+high)/2;if(place(mid)>=radius)high=mid;else low=mid;}place(high*Math.min(1,weight));}else place(Math.min(1,weight));
   }
  }
 }
 // Rotate the whole muzzle offset as well as its axis. Aiming the axis alone
 // repeatedly can oscillate when the target is close to the end of the gun.
 for(let i=0;i<3;i++){
  m.cont.updateMatrixWorld(true);
  const pivot=wrist.getWorldPosition(V3()),muzzle=weapon.muzzle.getWorldPosition(V3()),line=weapon.muzzle.getWorldDirection(V3()),offset=muzzle.clone().sub(pivot),desired=target.clone().sub(pivot);
  const along=offset.dot(line),lateralSq=Math.max(0,offset.lengthSq()-along*along),distanceSq=desired.lengthSq();
  if(line.lengthSq()<.5||distanceSq<1e-10)break;
  const travel=Math.sqrt(Math.max(0,distanceSq-lateralSq))-along,reachable=distanceSq>=lateralSq&&travel>=0;
  const ray=reachable?offset.addScaledVector(line,travel).normalize():line;
  if(!reachable)desired.sub(offset);
  if(desired.lengthSq()<1e-10)break;
  delta.setFromUnitVectors(ray,desired.normalize());delta.slerp(new T.Quaternion(),1-weight);
  wrist.getWorldQuaternion(worldQ);wrist.parent.getWorldQuaternion(parentQ);
  wrist.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
 }
}
// Carry fit depends on physical mounts and weapon length, independently of the shot effects archetype.
const oneHandGuns=new Set(['rifle','shotgun','sidewinder','trident','forge','ember']);
const longGuns=new Set(['rail','obelisk','watchman','rampart','falcon']);
const cuttingWeapons=new Set(['blade','cleaver','hatchet']);
const shieldPoses={'bulwark-shield':'buckler','citadel-shield':'tower'};
function combatReadyPose(u,{m,primary,secondary,shield,shoulderWeapon}){
 if(!primary?.muzzle||u.lionTrial)return;
 const {spine,arms}=m.rig;
 if(u.frame===2)return primary===shoulderWeapon||primary.carrier===spine?'pod':undefined;
 if(primary.mount.parent!==arms.R.so)return;
 const compact=oneHandGuns.has(primary.id),striker=u.frame===5||m.cairn;
 if(u.shield){
  if(compact&&(u.frame===0||striker)&&shield?.mount.parent===arms.L.so)return shieldPoses[u.shield];
 }else if(u.melee){
  if(compact&&(u.frame===6||striker)&&secondary?.mount.parent===arms.L.so){
   if(window.IronVowWeaponFX?.profiles[u.melee]?.style==='maul')return 'maul';
   if(cuttingWeapons.has(secondary.id))return 'sword';
  }
 }else{
  if((u.frame===9||striker)&&longGuns.has(primary.id))return 'rail';
  if(striker&&compact)return 'striker';
 }
}
function draw(u,t,pose,scope,model,custom){
 if(!init())return null;
 if(!pose.preview&&!pose.stage&&combatScope!==scope){clearCombat();combatScope=scope;}
 const cache=pose.stage?stageModels[pose.stage]:pose.preview?previews:combat;

 const facing=u.face??(u.team==='enemy'?1:-1),key=pose.preview||pose.stage?u.id:u.id+(pose.cinematic?'|shot|'+facing:'|field');
 let entry=cache.get(key);

 if(!entry){
  const m=custom==='rig-v2'?rigV2.build(u,pose.stage||pose.previewScope||'battle'):
   buildRig(model,u.team,u.paint,u.team==='enemy'?'F'+(u.index+1):null,u.upgrade,u.trim,pose.modules);
  if(!m)return null;
  // foundry/walk-tuning.js: approved step length, foot track, toe-out and footfall mass for this hull (the Lion trial rig keeps its own)
  window.IronVowWalk?.apply(m,u.lionTrial?null:u.frame,typeof MECH_MOTION!=='undefined'?MECH_MOTION[u.frame]?.mass:undefined);
  if(window.IronVowCairn?.applies(u.frame))window.IronVowCairn.fit(m,u,window.IronVowFieldPaint.finish(u));
  const coat=window.IronVowFieldPaint.create(u);
  if(coat)coat(m.body,m.build.ownedMaterials??=[]);
  entry={m,coat,surface:pose.stage?null:makeSurface(),stamp:null,anchors:{},previewScope:pose.previewScope};cache.set(key,entry);
 }
 if(entry.time>t)return {...entry,anchors:entry.previousAnchors||entry.anchors};
 const m=entry.m,v2=m.nativeV2,standardEquipment=!v2?.pose,equipmentScale=m.equipmentScale??1;
 const elapsed=entry.time==null?1/60:t-entry.time,dt=Math.min(elapsed,.042);
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
 if(!world)m.yaw=face;else{m.scale=v2?.worldScale??.9;m.cont.scale.setScalar(m.scale);}
 const paired=!world&&u.motion?.stepBeats!=null;
 const step=u.hp.legs>0&&!pose.reducedMotion&&Boolean(world?u.motion&&!world.airborne:paired||pose.phase>0&&u.motion);
 const prime=pose.primeProgress;
 const primeLift=pose.primePhase==='step'||pose.primePhase==='return'?Math.sin(PI*prime)*.5:0;
 const melee=Boolean(pose.strikeKind),authoredStrike=v2?.authoredStrike?.(pose.strikeKind),meleeAge=pose.strikeProgress<=.7
  ?pose.strikeProgress/.7*MEL.hit:MEL.hit+(pose.strikeProgress-.7)/.3*(MEL.end-MEL.hit);
 const lunge=u.hp.legs>0&&melee&&!authoredStrike?lungeK(meleeAge)*1.25:0;
 const travel=step?(pose.phase-.5)*1.8:0;
 const pos=world?V3(world.x,0,world.z):paired?V3((u.vx-u.vz)*1.8*Math.SQRT1_2,0,(u.vx+u.vz)*1.8*Math.SQRT1_2):
  V3(Math.sin(face)*(lunge+travel),0,Math.cos(face)*(lunge+travel));
 if(world&&u.hp.legs>0&&melee&&!authoredStrike&&world.lungeLimit){const direction=world.targetRoot.clone().sub(pos).setY(0).normalize();pos.addScaledVector(direction,lungeK(meleeAge)*world.lungeLimit);}
 if(paired&&!m.wasMoving)m.init=false;
 if(!world&&!step&&m.wasMoving){
  for(const L of m.legs){L.swing=false;L.settle=null;L.planted.sub(m.travelRoot??m.cont.position);L.foot.copy(L.planted)}
 }
 m.wasMoving=Boolean(step);
 m.travelRoot=paired?pos:null;
 m.aim.until=aim>.01?t+.01:-1;m.aim.blend=aim;
 // Aim at chest height of a like-sized target: level for every rig, including the larger live Warden.
 if(world)m.aim.point.copy(world.aim);else m.aim.point.set(Math.sin(face)*20,4*(m.scale||1),Math.cos(face)*20);
 m.recoil=world?Math.max(m.recoil,Math.abs(pose.recoil)*.58):Math.abs(pose.recoil)*.58;
 if(melee){
  if(!m.melee||m.melee.action!==u.attack)m.melee={action:u.attack,age:meleeAge,prev:null};
  m.melee.age=meleeAge;m.melee.side=v2?.meleeSide?.(pose.strikeKind)||(u.meleeHand==='right'?'R':'L');m.melee.thrust=window.IronVowWeaponFX?window.IronVowWeaponFX.get(pose.strikeKind).style==='thrust':pose.strikeKind==='pike';
 }else m.melee=null;
 v2?.beforeAnimate?.(m,pose.strikeKind||u.melee);
 if(!world){m.s.comp.x=-Math.max(0,pose.land||0)*.23-prime*.14;m.s.arm.x=pose.impact*.75;}
 else if(pose.land>0)m.s.comp.x=Math.min(m.s.comp.x,-pose.land*.23);
 if(!standardEquipment){
  entry.armed=v2.pose(entry,u,pose,t,armory)!==false&&(!u.shield||Boolean(armory));
 }else if(armory&&!entry.armed){
  const shoulderId=u.shoulder??(['missile','cerberus'].includes(u.weapon)?u.weapon:null);
  const handId=u.weapon===shoulderId?null:u.weapon;
  const profile=handId?window.IronVowWeaponFX?.get(handId):null;
  if(shoulderId){
   const socket=new T.Object3D();socket.name='mount.shoulderR';socket.position.set(m.dims.shX,m.dims.shY+.55,-.25);m.rig.spine.add(socket);
   const pod=arsenal.mount(armory,shoulderId==='vesper-shoulder'?'missile':shoulderId,socket);
   if(pod){
    pod.mount.rotation.x=0;
    entry.shoulderWeapon={...pod,carrier:socket,subsystem:'right',aimPivot:()=>pod.mount};
   }
   if(!handId)entry.primarySocket=socket;
  }
  entry.primary=handId?arsenal.mount(armory,profile?.asset??handId,m.rig.arms.R.so):entry.shoulderWeapon;
  entry.secondary=arsenal.mount(armory,u.melee?(window.IronVowWeaponFX?.get(u.melee).asset??u.melee):null,m.rig.arms[u.meleeHand==='right'?'R':'L'].so);
  if(m.cairn)window.IronVowCairn.fitRifle(entry.primary);
  entry.armed=true;
  if(equipmentScale!==1)for(const weapon of [entry.primary,entry.secondary])weapon?.model.scale.setScalar(equipmentScale);
 }
 if(!v2?.nativeShield&&armory&&entry.shieldId!==u.shield){
  entry.shieldId=u.shield;
  if(entry.shield){
   entry.shield.mount.parent?.remove(entry.shield.mount);
   for(const material of entry.shield.ownedMaterials||[])material.dispose();
  }
  entry.shield=arsenal.mountShield(armory,u.shield,v2?.shieldSocket||m.rig.arms.L.so);
  entry.shield?.mount.scale.setScalar(v2?.shieldScale??equipmentScale);
  if(!entry.shield)delete entry.anchors.shield;
 }
 if(entry.coat)for(const gear of [entry.primary,entry.secondary,entry.shoulderWeapon,entry.shield]){
  if(gear)entry.coat(gear.mount,gear.ownedMaterials??=[]);
 }
 const shoulderAttack=entry.shoulderWeapon&&(u.attack?.kind===entry.shoulderWeapon.id||u.attack?.kind==='missile'&&u.shoulder==='vesper-shoulder')?entry.shoulderWeapon:null;
 const barrel=shoulderAttack||entry.primary;
 // Both the brace and the carry solve use the equipment fitted for this frame.
 const {primary:fittedGun,secondary:fittedMelee,shield:fittedShield}=entry,{L,R}=m.rig.arms;
 const holdingShield=fittedShield?.mount.parent===L.so;
 const holdingMelee=fittedMelee?.mount.parent===L.so;
 m.offhand=u.hp.left<=0?'none':holdingShield?'shield':holdingMelee?'blade':u.shield||u.melee?'none':'free';
 m.primaryWeapon=standardEquipment&&u.hp.right>0&&fittedGun?.mount.parent===R.so&&
  (oneHandGuns.has(fittedGun.id)||longGuns.has(fittedGun.id))?fittedGun:null;
 const readyPose=!pose.stage&&!pose.preview&&world?.groundAt?combatReadyPose(u,entry):undefined;
 const aimFromArm=barrel?.carrier!==m.rig.spine&&!(barrel&&(barrel===entry.shoulderWeapon||barrel.mount.parent===entry.primarySocket));
 const playbackRate=world&&step?(u.motion.playbackRate??1):1;
 const input={pos,ground:world?.y,groundAt:world?.groundAt,face,heading:world?.heading??face,moving:Boolean(step),speed:(world?.speed??2.6)/playbackRate,stepLen:world?1.7:paired?.90:1.55,cycle:paired?pose.cycle:undefined,brace:pose.brace,
  alive:u.alive||u.surrendered,down:u.downReason,deathAge:pose.reducedMotion&&!u.alive?2:pose.deathAge,pilotRatio:u.hp.pilot/u.max.pilot,
  bodyRatio:u.hp.body/u.max.body,onStep:world?.onStep,armDead:u.hp.right<=0,leftDead:u.hp.left<=0,legsDead:u.hp.legs<=0,noPlant:world?world.noPlant||world.airborne:!step,
  airborne:world?.airborne,artillery,mortarAge,aimFromArm,ready:prime>0||aim>.01,readyPose,readyRelease:Math.max(aim??0,prime??0),
  readyMeleeMountPitch:entry.secondary?.mount.rotation.x??0,reducedMotion:pose.reducedMotion};
 const animate=v2?.animate??animateMech;
 const previous=entry.groundRoot;
 // Subdivide elapsed playback so slow render frames do not skip foot plants
 // or send a large integration step through the existing springs.
 if(playbackRate>1&&previous&&elapsed>0){
  const realTime=Math.min(elapsed,.1),gaitTime=realTime*playbackRate;
  const count=Math.ceil(gaitTime*60),stepTime=gaitTime/count;
  const distance=Math.hypot(pos.x-previous.x,world.y-previous.y,pos.z-previous.z);
  const sample={...input,pos:V3(),speed:distance/gaitTime};
  for(let i=1;i<=count;i++){
   const fraction=i/count;
   sample.pos.copy(previous).lerp(pos,fraction);
   sample.ground=previous.y+(world.y-previous.y)*fraction;
   animate(m,sample,stepTime,t-realTime*(1-fraction));
  }
 }else animate(m,input,dt,t);
 if(world)(entry.groundRoot??=V3()).set(pos.x,world.y,pos.z);
 // A rig with its own firing stance (m.fireStance) leads with its left foot instead of this generic right-foot step.
 if(!world&&prime>0&&u.hp.legs>0&&u.alive&&!artillery&&!Number.isFinite(mortarAge)&&!m.fireStance){
  const lead=m.rig.legs[1];
  const target=V3(lead.restX,m.dims.ankleH+primeLift,lead.restZ+prime*.82);
  VC.solveLeg(m.rig,m.dims,lead,target,-primeLift*.32);
 }
 // UI previews keep the body centered while the shared animator solves the gait.
 if(!world&&step)m.cont.position.set(0,0,0);
 m.wpn=melee?{...entry.secondary,muzzle:entry.secondary?.tip||m.rig.arms.L.so}:barrel||{};
 if(!v2?.nativeShield)arsenal.poseShield(entry.shield,u,face+m.readyShieldTurn);
 if(standardEquipment&&entry.primary&&entry.primary!==entry.shoulderWeapon){
  entry.primary.mount.visible=u.alive&&u.hp.right>0;
  if(arsenal.isExpansion(u.weapon))arsenal.animate(entry.primary,pose);
  else entry.primary.recoil.position.z=-Math.abs(pose.recoil)*.22;
 }
 if(standardEquipment&&entry.shoulderWeapon)entry.shoulderWeapon.mount.visible=u.alive&&u.hp.body>0&&u.hp.right>0;
 if(standardEquipment&&entry.secondary){
  entry.secondary.mount.visible=u.alive&&u.hp[u.meleeHand==='right'?'right':'left']>0;
  arsenal.animate(entry.secondary,pose);
 }
 if(world&&u.alive&&u.hp[barrel?.subsystem||'right']>0&&!melee&&aim>.01){
  const pivot=barrel?.aimPivot?.(barrel.muzzle)||(entry.primarySocket?entry.primary.mount:null);
  aimMounted(m,barrel,world.aim,Math.min(1,aim),pivot);
  if(v2&&barrel?.muzzle2&&barrel.aimPivot&&barrel.aimPivot(barrel.muzzle2)!==pivot){
   aimMounted(m,{muzzle:barrel.muzzle2},world.aim,Math.min(1,aim),barrel.aimPivot(barrel.muzzle2));
  }
 }
 v2?.sync();
 if(v2&&u.upgrade&&!m.build.kits&&(pose.preview||pose.stage))VC.fitReinforcement(m,u.upgrade);
 if(pose.stage==='bench'&&pose.clip)v2?.scrub?.(pose.clip,pose.clipTime);
 m.cont.updateMatrixWorld(true);
 const span=m.previewSpan,groundRow=span?(ground-(1-span)/2)/span:ground;
 if(pose.stage)return entry;
 if(!world){
  setCamera(.46);
  if(span){camera.left=camera.bottom=-worldSpan*span/2;camera.right=camera.top=worldSpan*span/2;camera.updateProjectionMatrix();}
  try{paintRig(m,entry.surface,renderer,groundRow);}finally{camera.left=camera.bottom=-worldSpan/2;camera.right=camera.top=worldSpan/2;camera.updateProjectionMatrix();}
 }
 entry.span=span;
 const r=m.rig,mounts=mountPoints(m),primary=entry.primary,secondary=entry.secondary;
 for(const [name,object] of Object.entries({...mounts,body:r.spine,pilot:r.neck,
  right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,
  muzzle:primary?.muzzle,muzzle2:primary?.muzzle2,meleeTip:secondary?.tip,mortarMuzzle:m.mortar?.muzzle,shield:entry.shield?.face})){
  if(object)entry.anchors[name]=span?tallAnchor(object.getWorldPosition(V3()),groundRow,span):anchor(object);
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
let previewFrame;
function retainPreview(frame){
 if(frame===previewFrame)return;
 previewFrame=frame;
 clearPreviews('preview');rigV2.clear('preview');
}
function requestPreview(unit){
 const status=rigV2.status(unit,'preview');
 if(!status)rigV2.load([unit],'preview').then(([loaded])=>{
  if(loaded)window.dispatchEvent?.(new window.Event('rig-art-ready'));
 });
 return status==='ready';
}
function metrics(){return window.IronVowRenderer.metrics();}
function previewHealth(unit){
 const max=unit.max||{body:100,pilot:100,right:100,left:100,legs:100};
 const condition=unit.condition??100;
 const hp=unit.hp||Object.fromEntries(parts.map(part=>[part,part==='pilot'?max[part]:max[part]*condition/100]));
 return {hp,max};
}
function previewKey(u,scope,angle){
 const {hp,max}=previewHealth(u);
 return JSON.stringify([scope,u.frame,u.team||'ally',Boolean(u.lionTrial),u.paintFinish,u.paint,u.trim,u.weapon,u.melee,u.shoulder,u.shield,u.upgrade,hp,max,angle]);
}
function preview(u,model,custom,angle=0,scope='preview'){
 if(rigV2?.applies(u))custom='rig-v2';
 if(custom==='rig-v2'&&!(scope==='preview'?requestPreview(u):rigV2.status(u,scope)==='ready'))return null;
 const {hp,max}=previewHealth(u),key=previewKey(u,scope,angle);
 if(previews.has(key))return previews.get(key);
 const unit={...u,id:key,index:u.index||0,team:u.team||'ally',alive:true,hp,max};
 const pose={preview:true,previewScope:scope,heading:[-.68,.68,2.46,-2.46][angle]||-.68,reducedMotion:true,phase:0,primeProgress:0,strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0};
 const entry=draw(unit,0,pose,null,model,custom);
 if(entry){entry.url=entry.surface.toDataURL('image/png');if(previews.size>16){const [first,value]=previews.entries().next().value;disposeEntry(value);previews.delete(first);}}
 return entry;
}

const portraitImages=new Map(),portraitPending=new Set();
let portraitQueue=Promise.resolve();
function portrait(unit,model,angle=0){
 const key=encodeURIComponent(previewKey(unit,'portrait',angle));
 const url=portraitImages.get(key);
 if(url||portraitPending.has(key))return {key,url};
 portraitPending.add(key);
 // Keep at most one catalog rig resident, even when the market opens many cards.
 portraitQueue=portraitQueue.then(()=>new Promise(done=>requestAnimationFrame(done))).then(async()=>{
  if(!init()||window.IronVowRenderer.lost)return;
  await armoryLoading;
  if(rigV2.applies(unit)&&!(await rigV2.load([unit],'portrait'))[0])return;
  if(window.IronVowRenderer.lost)return;
  const image=preview(unit,model,undefined,angle,'portrait')?.url;
  if(!image)return;
  portraitImages.set(key,image);
  if(portraitImages.size>48)portraitImages.delete(portraitImages.keys().next().value);
  window.dispatchEvent(new CustomEvent('rig-portrait-ready',{detail:{key,url:image}}));
 }).catch(error=>console.warn('Mech portrait unavailable',error)).finally(()=>{
  clearPreviews('portrait');rigV2.clear('portrait');portraitPending.delete(key);
 });
 return {key};
}
function previewAnimated(u,t,pose,model,custom,angle=0){
 if(rigV2?.applies(u)){custom='rig-v2';if(!requestPreview(u))return null;}
 const hp=u.hp||{body:100,pilot:100,right:100,left:100,legs:100},max=u.max||{...hp};
 return draw({...u,hp,max},t,{phase:0,primeProgress:0,strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0,...pose,preview:true,previewScope:'preview',heading:[-.68,.68,2.46,-2.46][angle]||-.68},null,model,custom);
}
function releaseStageRig(scope,id){
 const cache=stageModels[scope],entry=cache.get(id);
 if(entry){entry.m.cont.parent?.remove(entry.m.cont);disposeEntry(entry);cache.delete(id);}
}
function inspect(unit,model,time,pose){
 if(!init()||!armory)return null;
 const authored=rigV2.applies(unit),status=rigV2.status(unit,'bench');
 if(authored&&status!=='ready'){
  if(!status)void rigV2.load([unit],'bench');
  return null;
 }
 return draw(unit,time,{...pose,stage:'bench'},null,model,authored?'rig-v2':undefined);
}
function clearInspection(frameChanged){
 for(const id of stageModels.bench.keys())releaseStageRig('bench',id);
 if(frameChanged)rigV2.clear('bench');
}
function renderInspection(objects,view){
 if(!init()||window.IronVowRenderer.lost)return;
 window.IronVowRenderer.resize(innerWidth,innerHeight);
 window.IronVowRenderer.show(true);
 for(const object of objects)scene.add(object);
 scene.background=new T.Color(0x152128);
 try{renderer.render(scene,view);return {...renderer.info.render};}
 finally{scene.background=null;for(const object of objects)scene.remove(object);}
}
window.IronVowFoundry={releaseStageRig,metrics,draw:withFallback(draw),preview:withFallback(preview),portrait,previewAnimated:withFallback(previewAnimated),
 equipmentThumbnail:withFallback(equipmentThumbnail),vehicleThumbnail:withFallback(vehicleThumbnail),aimMounted,entry:id=>combat.get(id+'|field'),clearCombat,retainPreview,inspect:withFallback(inspect),clearInspection,renderInspection:withFallback(renderInspection)};
})();
