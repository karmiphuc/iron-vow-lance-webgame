/* Aero's native loadouts share the exported hand grips and twin jump nozzles. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3;
const arsenal=root.IronVowProductionArsenal;
root.IronVowRigV2.register(19,{
 id:'aero',assetPath:'rig-bench/rig-v2/aero.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig}){
  const sockets={};
  for(const side of ['L','R']){
   const wrist=rig.arms[side].wr;
   sockets[side]=driver('Socket.Weapon.'+side,wrist,wrist.getWorldQuaternion(new T.Quaternion()));
  }
  const rifleName='MODULE | Kestrel scout carbine',rifleModel=bone(rifleName),carrier=sockets.R;
  const rifleMount=driver(rifleName,carrier);
  const rifle={id:'rifle',carrier,mount:rifleMount,muzzle:marker('muzzle.main',rifleMount),bounds:()=>bounds(rifleName)};
  const blades=new Map();
  for(const id of ['blade','breaker','cleaver','piledriver']){
   const name='melee.'+id,model=bone(name),mount=driver(name,sockets.L);
   blades.set(id,{id,model,mount,tip:marker('strike.tip.'+id,mount),bounds:()=>bounds(name)});
  }
  const alternate={};
  function unmount(slot){
   const weapon=alternate[slot];
   if(!weapon)return;
   weapon.carrier.remove(weapon.mount);
   for(const material of weapon.chargeMaterials)material.dispose();
   delete alternate[slot];
  }
  function fit(slot,id,armory){
   if(alternate[slot]?.fitId!==id)unmount(slot);
   if(id&&armory&&!alternate[slot]){
    const asset=root.IronVowWeaponFX?.get(id).asset??id;
    const weapon=arsenal.mount(armory,asset,sockets[slot]);
    if(weapon)alternate[slot]={...weapon,carrier:sockets[slot],fitId:id};
   }
   return alternate[slot];
  }
  const spine=rig.spine,spineRest=spine.position.clone(),worldRight=V3();
  const rotation=new T.Quaternion();
  let dodgeAt=-Infinity,dodgeSide=1;
  return {
   boundsNames:[rifleName,...[...blades.keys()].map(id=>'melee.'+id)],
   shieldSocket:sockets.L,jetNozzles:['L','R'].map(side=>bone('jet.nozzle.'+side)),
   dodge(at,incoming){
    dodgeAt=at;
    dodgeSide=worldRight.set(1,0,0).applyQuaternion(spine.parent.getWorldQuaternion(rotation)).dot(incoming)>0?-1:1;
   },
   pose(entry,unit,pose,time,armory){
    const right=unit.alive&&unit.hp.right>0,left=unit.alive&&unit.hp.left>0;
    const melee=unit.shield?null:unit.melee,nativeRifle=unit.weapon==='rifle';
    const nativeBlade=blades.get(melee);
    rifleMount.visible=rifleModel.visible=right&&nativeRifle;
    for(const [id,weapon] of blades)weapon.mount.visible=weapon.model.visible=left&&id===melee;
    const otherRifle=fit('R',nativeRifle?null:unit.weapon,armory);
    const otherBlade=fit('L',nativeBlade?null:melee,armory);
    if(otherRifle){
     otherRifle.mount.visible=right;
     if(arsenal.isExpansion(otherRifle.id))arsenal.animate(otherRifle,pose);
     else otherRifle.recoil.position.z=-Math.abs(pose.recoil)*.22;
    }
    if(otherBlade){otherBlade.mount.visible=left;arsenal.animate(otherBlade,pose);}
    entry.primary=nativeRifle?rifle:otherRifle;
    entry.secondary=nativeBlade||otherBlade;
    const age=time-dodgeAt;
    const evade=unit.alive&&!pose.reducedMotion&&age>=0&&age<.48?dodgeSide*Math.sin(Math.PI*age/.48)**2:0;
    spine.position.copy(spineRest);spine.position.x+=.32*evade;
    spine.rotation.z-=.32*evade;
    return Boolean(entry.primary&&(!melee||entry.secondary));
   },
   dispose(){unmount('L');unmount('R');}
  };
 }
});
})(window);
