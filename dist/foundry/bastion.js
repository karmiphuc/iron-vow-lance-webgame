/* BST-04 uses rigid glTF animation, with production weapons attached to its authored hand sockets. */
(function(){
'use strict';
const T=window.THREE, arsenal=window.IronVowProductionArsenal;
if(!T?.GLTFLoader)return;
const path='rig-bench/bastion-bst04.glb',carbinePath='rig-bench/bastion-carbine.glb',meleePath='rig-bench/bastion-melee.glb';
let asset, pending;
function load(){
 if(!pending){
  const url=file=>window.IRON_VOW_INLINE_ASSETS?.[file]||file+'?rev=weapon-sockets';
  const loader=new T.GLTFLoader();
  pending=Promise.all([path,carbinePath,meleePath].map(file=>loader.loadAsync(url(file)))).then(([data,carbine,melee])=>{
   if(!data.animations.length)throw Error('BST-04 combat animation missing');
   melee.scene.traverse(o=>{if(o.userData.bastion_socket)o.name=o.userData.bastion_socket});
   const tracks=data.animations.flatMap(clip=>clip.tracks);
   asset={...data,carbine:carbine.scene,melee:melee.scene,clip:new T.AnimationClip('BST-04 Combat',-1,tracks),
    start:Math.min(...tracks.map(track=>track.times[0]))};
   window.dispatchEvent(new window.Event('bastion-art-ready'));
  }).catch(error=>console.warn('Bastion using still art',error));
 }
 return pending;
}
const name=(root,id)=>root.getObjectByName(T.PropertyBinding.sanitizeNodeName(id));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const points=['body','pilot','right','left','legs'];
const base=t=>new T.Color(t).convertSRGBToLinear();
function build(){
 if(!asset){load();return null}
 const cont=new T.Group(),body=asset.scene.clone(true),mixer=new T.AnimationMixer(body);
 cont.add(body);
 const action=mixer.clipAction(asset.clip);
 action.play();action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
 const materials=new Map();
 body.traverse(o=>{
  if(!o.isMesh)return;
  const region=o.parent.userData.part||o.userData.part;
  const old=o.material,k=old.uuid+'|'+region;
  if(!materials.has(k)){
   const mat=old.clone();
   materials.set(k,{mat,original:old.color.clone(),name:old.name,region});
  }
  const next=materials.get(k);
  o.material=next.mat;
 });
 return {cont,body,mixer,action,materials,root:name(body,'ROOT'),weapon:null,
  sockets:{R:name(body,'BastionGrip.R'),gun:name(body,'BastionGunPivot.R'),L:name(body,'BastionGrip.L'),ram:name(body,'BastionRamGrip.L')},
  anchors:Object.fromEntries([...points.map(k=>[k,name(body,'BastionPart.'+k)]),
    ['leadFoot',name(body,'BastionLeadFoot')],['pod1',name(body,'MissileSocket.01')],['pod2',name(body,'MissileSocket.04')]])};
}
function fit(m,armory,id,side){
 if(!armory||!id||id==='missile'&&side==='R')return null;
 const adapter=new T.Group(),added=arsenal.isExpansion(id);
 adapter.scale.setScalar(.62);
 if(!['breaker','cleaver','blade'].includes(id))adapter.rotation.x=-Math.PI/2;
 const socket=side==='L'&&['piledriver','pike','tonfa'].includes(id)?m.sockets.ram:side==='R'&&!added&&id!=='rifle'?m.sockets.gun:m.sockets[side];
 socket.add(adapter);
 const mount=arsenal.mount(added?armory:side==='L'?asset.melee:id==='rifle'?asset.carbine:armory,id,adapter);
 if(!mount){adapter.parent.remove(adapter);return null}
 const grip=id==='rifle'&&side==='R'?mount.model.getObjectByName('BastionGripContact'):mount.grip;
 if(grip&&!added){
  m.cont.updateMatrixWorld(true);
  const local=mount.model.worldToLocal(grip.getWorldPosition(new T.Vector3()));
  mount.model.position.sub(local.multiply(mount.model.scale).applyQuaternion(mount.model.quaternion));
 }
 return {...mount,adapter,grip};
}
function frame(u,t,pose){
 if(pose.previewFrame!=null)return pose.previewFrame;
 if(!u.alive)return u.downReason==='pilot'?95:97;
 const braceAge=t-(u.braceTime??-100);
 if(u.motion&&pose.phase>0&&!pose.reducedMotion)return 1+48*clamp(pose.phase,0,1);
 if(u.attack){
  const age=u.attack.fireAt!=null?t-u.attack.fireAt:null;
  if(age==null&&u.brace&&u.hp.legs>0&&!pose.reducedMotion&&braceAge<1.22)
   return 57+40*clamp(braceAge/1.22,0,1);
  if(pose.strikeKind){
   const p=pose.strikeProgress||0;
   if(pose.reducedMotion)return u.brace?(p<.7?273:303):(p<.7?217:247);
   if(u.brace)return 273+48*(p<=.7?p*.9:.63+(p-.7)*(.37/.3));
   if(pose.primePhase==='step')return 217+48*.42*(pose.primeProgress||0);
   if(pose.primePhase==='return')return 265-48*.18*(pose.primeProgress||0);
   return 217+48*(.42+p*.40);
  }
  const progress=clamp(Math.max(pose.aim||0,pose.primeProgress||0, (t-u.attack.start)/.75),0,1);
  if(u.attack.kind==='missile')return age==null?105+10*progress:clamp(116+24*age,116,153);
  if(age==null)return (u.brace?181:161)+(u.brace?6:26)*progress;
  return clamp(188+24*age,188,u.brace?200:209);
 }
 if(u.brace&&u.hp.legs>0)return pose.reducedMotion?97:57+40*clamp(braceAge/1.22,0,1);
 return 57;
}
function paint(m,u){
 const overrides={bone:u.paint&&base(u.paint),trim:u.trim?.s&&base(u.trim.s),accent:u.trim?.a&&base(u.trim.a)};
 for(const {mat,original,name,region} of m.materials.values()){
  const value=/bone ceramic|Warm face/.test(name)?overrides.bone:/Blue charcoal/.test(name)?overrides.trim:/Safety amber/.test(name)?overrides.accent:null;
  mat.color.copy(value||original);
  const max=u.max?.[region],hp=u.hp?.[region];
  if(max&&hp<max*.5)mat.color.multiplyScalar(hp>0?.49:.23);
 }
}
function animate(m,u,t,pose,armory){
 const f=frame(u,t,pose);
 m.action.enabled=true;m.action.paused=false;
 m.mixer.setTime(Math.min(asset.clip.duration-1e-6,asset.start+(f-1)/24));
 if(u.motion)m.root.position.z=0; // Board travel already translates the unit.
 m.cont.rotation.y=pose.heading??0;
 if(!u.alive){
  const fall=clamp((pose.deathAge||0)*1.5,0,1);
  m.cont.rotation.z=fall*(u.downReason==='pilot'?.19:.53);
 }else m.cont.rotation.z=0;
 if(m.weaponId!==u.weapon&&armory){
  m.weaponId=u.weapon;
  if(m.weapon)m.weapon.adapter.parent.remove(m.weapon.adapter);
  m.weapon=fit(m,armory,u.weapon,'R');
 }
 if(m.meleeId!==u.melee&&armory){
  m.meleeId=u.melee;
  if(m.melee)m.melee.adapter.parent.remove(m.melee.adapter);
  m.melee=fit(m,armory,u.melee,'L');
 }
 if(m.shieldId!==u.shield&&armory){
  m.shieldId=u.shield;
  if(m.shield)m.shield.mount.removeFromParent();
  m.shield=arsenal.mountShield(armory,u.shield,m.sockets.L);
  m.shield?.mount.scale.setScalar(.78);
 }
 arsenal.poseShield(m.shield,u,pose.heading??0);
 if(m.weapon){
  m.weapon.mount.visible=u.alive&&u.hp.right>0;
  arsenal.animate(m.weapon,pose);
 }
 if(m.melee){
  m.melee.mount.visible=u.alive&&u.hp.left>0;
  if(m.melee.spike){const p=pose.strikeProgress||0;m.melee.spike.position.z=m.melee.spikeRest+(p>=.61&&p<=.81?.50:0)}
  arsenal.animate(m.melee,pose);
 }
 paint(m,u);
 m.cont.updateMatrixWorld(true);
 return {frame:f,anchors:{...m.anchors,muzzle:u.weapon==='missile'?m.anchors.pod1:m.weapon?.muzzle,
  muzzle2:u.weapon==='missile'?m.anchors.pod2:m.weapon?.muzzle2,meleeTip:m.melee?.tip,
  gripR:m.sockets.R,gripL:m.sockets.L,shield:m.shield?.face},primary:m.weapon||u.weapon==='missile',secondary:m.melee,shield:m.shield};
}
function dispose(m){
 m.mixer.stopAllAction();
 m.mixer.uncacheRoot(m.body);
 for(const {mat} of m.materials.values())mat.dispose();
}
window.IronVowBastion={build,animate,dispose,frame};
})();
