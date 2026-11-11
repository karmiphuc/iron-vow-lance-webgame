/* Live hangar rigs. IDs without Phase 3 assets are deliberately unsupported. */
(function(root){
'use strict';
const models={5:3,6:4,7:5,8:0,9:1,12:2};
const supported=new Set([0,5,6,7,8,9,10,12]);
function create(){
 const T=root.THREE,R=root.IronVowFoundryRig,arsenal=root.IronVowProductionArsenal;
 const entries=new Set();let disposed=false,wardenRequested=false,armoryRequested=false,armory=null,armoryMaterials=null;
 const url=path=>root.IRON_VOW_INLINE_ASSETS?.[path]||path;
 function requestWarden(){
  if(wardenRequested)return;wardenRequested=true;
  root.IronVowWardenRig.load(url('rig-bench/warden-painted.glb'),url('rig-bench/warden-painted-motion.json')).catch(error=>console.warn('Hangar Warden unavailable',error));
 }
 function requestArmory(){
  if(armoryRequested||!arsenal)return;armoryRequested=true;
  arsenal.load(url('rig-bench/weapons.glb'),url('rig-bench/expansion-weapons.glb?rev=heavy-ordnance'),url('rig-bench/shields.glb')).then(scene=>{
   if(disposed)return;armory=scene;armoryMaterials=new Set();
   scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>armoryMaterials.add(m));});
  }).catch(error=>console.warn('Hangar arsenal unavailable',error));
 }
 function releaseRig(rig){
  const materials=new Set([rig.build.visorMat,rig.build.stackMat,...(rig.build.ownedMaterials||[])]);
  if(rig.live)for(const list of Object.values(rig.build.parts))for(const part of list)materials.add(part.m.material);
  // The Foundry kit owns cached geometry; only merged buffers belong to a rig.
  rig.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose();});
  materials.delete(null);materials.delete(undefined);
  if(rig.live)root.VowChassis.releaseOwnedMaterials(materials);else materials.forEach(m=>m.dispose());
 }
 function make(unit){
  if(disposed)return null;
  if(!supported.has(unit.frame))throw Error('Unsupported hangar frame: '+unit.frame);
  const holder=new T.Group(),ownedWeaponMaterials=new Set();let rig=null,dead=false,armed=false,shield=null;
  if(unit.frame===0)requestWarden();
  if(unit.weapon||unit.melee||unit.shield)requestArmory();
  function build(){
   if(dead||rig)return;
   rig=unit.frame===0?root.IronVowWardenRig.build('ally',unit.paint,{trim:unit.trim}):unit.frame===10?root.IronVowBastion.buildRuntime('ally',unit.paint,unit.trim):R.buildRig(models[unit.frame],'ally',unit.paint,null,unit.upgrade,unit.trim);
   if(!rig)return;
   holder.add(rig.cont);
   if(unit.condition<.3)for(const part of R.parts)R.setPartState(rig,part,1);
  }
  function equip(){
   if(armed||!rig||!armory)return;armed=true;
   const profile=unit.weapon&&root.IronVowWeaponFX?.get(unit.weapon);let socket=rig.rig.arms.R.so;
   if(profile?.socket?.startsWith('shoulder')){socket=new T.Object3D();socket.position.set(rig.dims.shX,rig.dims.shY+.55,-.25);rig.rig.spine.add(socket);}
   const primary=arsenal.mount(armory,profile?.asset??unit.weapon,socket);
   const meleeProfile=unit.melee&&root.IronVowWeaponFX?.get(unit.melee);
   const secondary=arsenal.mount(armory,meleeProfile?.asset??unit.melee,rig.rig.arms.L.so);
   shield=arsenal.mountShield(armory,unit.shield,rig.rig.arms.L.so);
   if(unit.frame===0||unit.frame===10){for(const weapon of [primary,secondary])weapon?.model.scale.setScalar(.62);shield?.mount.scale.setScalar(.62);}
   // Arsenal clones share source materials except for per-instance effects.
   for(const item of [primary?.mount,secondary?.mount,shield?.mount])item?.traverse(o=>{if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(!armoryMaterials.has(m))ownedWeaponMaterials.add(m);});
   rig.wpn=primary||{};
   rig.offhand=shield?'shield':secondary?'blade':'free';
   rig.primaryWeapon=socket===rig.rig.arms.R.so?primary:null;
  }
  const entry={object:holder,update({time,dt,selected}){
   if(dead)return;build();if(!rig)return;equip();
   const look=selected&&time%9<1.6;rig.aim.until=look?time+.3:-1;rig.aim.blend=look?.35:0;rig.aim.point.set(Math.sin(time*.7)*8,6,20);
   R.animateMech(rig,{pos:new T.Vector3(),ground:0,face:.3,heading:.3,moving:false,speed:0,stepLen:2,brace:0,alive:true,bodyRatio:1,pilotRatio:1,noPlant:true},dt,time);
   if(shield)arsenal.poseShield(shield,{alive:true,hp:{left:1}},.3);
   if(unit.frame===0)root.IronVowWardenRig.afterAnimate(rig);else if(unit.frame===10)root.IronVowBastion.afterAnimate(rig);
  },dispose(){
   if(dead)return;dead=true;entries.delete(entry);
   if(rig){holder.remove(rig.cont);releaseRig(rig);rig=null;}
   ownedWeaponMaterials.forEach(m=>m.dispose());ownedWeaponMaterials.clear();
  }};
  entries.add(entry);return entry;
 }
 return {create:make,supports:frame=>supported.has(frame),dispose(){if(disposed)return;disposed=true;for(const entry of [...entries])entry.dispose();armory=null;armoryMaterials=null;}};
}
root.IronVowHangarCatalog={create};
})(typeof window==='undefined'?globalThis:window);
