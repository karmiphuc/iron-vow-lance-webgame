/* Aero's native loadouts share the exported hand grips and twin jump nozzles. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3;
const arsenal=root.IronVowProductionArsenal;
root.IronVowRigV2.register(19,{
 id:'aero',assetPath:'rig-bench/rig-v2/aero.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig,workshopMounts}){
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
   const meleeStyle=id==='piledriver'?'thrust':id==='breaker'?'maul':'sweep';
   blades.set(id,{id,model,mount,meleeStyle,tip:marker('strike.tip.'+id,mount),bounds:()=>bounds(name)});
  }
  const shoulder=new T.Group();
  shoulder.position.set(rig.arms.R.sh.position.x,rig.arms.R.sh.position.y+.6,-.35);
  rig.spine.add(shoulder);
  const {fit,dispose}=workshopMounts({...sockets,shoulder});
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
    const rightMelee=unit.meleeHand==='right',melee=unit.shield&&!rightMelee?null:unit.melee;
    const rackId=unit.shoulder??(['missile','cerberus'].includes(unit.weapon)?unit.weapon:null);
    const nativeRifle=unit.weapon==='rifle',nativeBlade=!rightMelee&&blades.get(melee);
    const handId=nativeRifle||unit.weapon===rackId?null:unit.weapon;
    rifleMount.visible=rifleModel.visible=right&&nativeRifle;
    for(const weapon of blades.values())weapon.mount.visible=weapon.model.visible=left&&weapon===nativeBlade;
    const gear=fit('R',rightMelee?melee:handId,armory);
    const offhand=fit('L',rightMelee||nativeBlade?null:melee,armory);
    const otherRifle=rightMelee?null:gear,otherBlade=rightMelee?gear:offhand;
    const rack=fit('shoulder',rackId==='vesper-shoulder'?'missile':rackId,armory);
    if(rack){rack.mount.rotation.x=0;rack.mount.visible=right&&unit.hp.body>0;rack.subsystem='right';rack.aimPivot=()=>rack.mount;}
    if(otherRifle){
     otherRifle.mount.visible=right;
     if(arsenal.isExpansion(otherRifle.id))arsenal.animate(otherRifle,pose);
     else otherRifle.recoil.position.z=-Math.abs(pose.recoil)*.22;
    }
    if(otherBlade){otherBlade.mount.visible=rightMelee?right:left;arsenal.animate(otherBlade,pose);}
    entry.shoulderWeapon=rack;
    entry.primary=(nativeRifle?rifle:otherRifle)??rack;
    entry.secondary=nativeBlade||otherBlade;
    const age=time-dodgeAt;
    const evade=unit.alive&&!pose.reducedMotion&&age>=0&&age<.48?dodgeSide*Math.sin(Math.PI*age/.48)**2:0;
    spine.position.copy(spineRest);spine.position.x+=.32*evade;
    spine.rotation.z-=.32*evade;
    return (!handId||rightMelee||Boolean(otherRifle))&&(!melee||Boolean(entry.secondary))&&(!rackId||Boolean(rack));
   },
   dispose
  };
 }
});
})(window);
