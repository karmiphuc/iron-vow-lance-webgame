/* Bastion's Weapon-Sockets source provides the fitted carbine, melee variants and pistons. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3,arsenal=root.IronVowProductionArsenal;
root.IronVowRigV2.register(10,{
 id:'bastion',assetPath:'rig-bench/rig-v2/bastion.glb',factoryLivery:true,
 // The original Bastion mount used the Rig Bench scale for Workshop equipment.
 shieldScale:.62,
 setup({bone,driver,marker,bounds,rig,workshopMounts}){
  const sockets={L:rig.arms.L.so,R:rig.arms.R.so};
  const {fit,dispose}=workshopMounts(sockets);
  const name='weapon.rifle',rifleModel=bone(name),rifleMount=driver(name,sockets.R);
  const muzzle=marker('muzzle.main',rifleMount,[0,0,1]);
  const rifle={id:'rifle',model:rifleModel,mount:rifleMount,carrier:sockets.R,grip:rifleMount,muzzle,bounds:()=>bounds(name)};
  const rifleRest=rifleMount.position.clone(),rifleAxis=muzzle.getWorldDirection(V3())
   .applyQuaternion(sockets.R.getWorldQuaternion(new T.Quaternion()).invert());
  const blades=new Map();
  // The production 'blade' ID uses the energized version of the stock cleaver.
  for(const id of ['cleaver','breaker','piledriver']){
   const weaponName='weapon.'+id,model=bone(weaponName),mount=driver(weaponName,sockets.L);
   const auger=id==='piledriver'?driver('auger.piledriver',mount):null;
   const tip=marker('strike.tip.'+id,auger||mount);
   const augerRest=auger?.position.clone(),augerAxis=auger
    ?mount.worldToLocal(tip.getWorldPosition(V3())).sub(augerRest).normalize():null;
   blades.set(id,{id,model,mount,carrier:sockets.L,tip,auger,augerRest,augerAxis,bounds:()=>bounds(weaponName)});
  }
  const launcherName='mount.shoulderR',launcher=bone(launcherName),rack=driver(launcherName,rig.spine);
  const rackRest=rack.quaternion.clone();
  const ports=Array.from({length:6},(_,i)=>marker('muzzle.vesper.0'+(i+1),rack,[0,0,-1]));
  const missile={id:'missile',model:launcher,mount:rack,carrier:rig.spine,muzzle:ports[0],muzzle2:ports[3],
   aimPivot:()=>rack,bounds:()=>bounds(launcherName)};
  const pistons=JSON.parse(bone('root').userData.pistons).flatMap(([nameA,nameB])=>{
   const a=bone(nameA),b=bone(nameB);
   return [[a,b],[b,a]].map(([from,to])=>({
    from,to,rest:from.quaternion.clone(),axis:from.worldToLocal(to.getWorldPosition(V3())).normalize()
   }));
  });
  const axis=V3(),turn=new T.Quaternion();
  return {
   shieldSocket:sockets.L,
   boundsNames:[name,launcherName,...[...blades.keys()].map(id=>'weapon.'+id)],
   pose(entry,u,pose,t,armory){
    const right=u.alive&&u.hp.right>0,left=u.alive&&u.hp.left>0,melee=u.shield?null:u.melee;
    const nativeRifle=u.weapon==='rifle',nativeMissile=u.weapon==='missile',nativeBlade=blades.get(melee);
    rifleModel.visible=rifleMount.visible=right&&nativeRifle;
    rifleMount.position.copy(rifleRest).addScaledVector(rifleAxis,-Math.abs(pose.recoil||0)*.22);
    launcher.visible=rack.visible=right&&nativeMissile;
    rack.quaternion.copy(rackRest);
    for(const blade of blades.values())blade.model.visible=blade.mount.visible=left&&blade===nativeBlade;
    if(nativeBlade?.auger){
     const {auger,augerRest,augerAxis}=nativeBlade,progress=pose.strikeProgress||0;
     auger.position.copy(augerRest).addScaledVector(augerAxis,progress>=.61&&progress<=.81?.5:0);
    }
    const gun=fit('R',nativeRifle||nativeMissile?null:u.weapon,armory);
    const blade=fit('L',nativeBlade?null:melee,armory);
    if(gun){
     gun.model.scale.setScalar(.62);
     gun.mount.visible=right;
     if(arsenal.isExpansion(gun.id))arsenal.animate(gun,pose);
     else gun.recoil.position.z=-Math.abs(pose.recoil||0)*.22;
    }
    if(blade){blade.model.scale.setScalar(.62);blade.mount.visible=left;arsenal.animate(blade,pose);}
    entry.primary=nativeRifle?rifle:nativeMissile?missile:gun;
    entry.secondary=nativeBlade||blade;
    return Boolean(entry.primary&&(!melee||entry.secondary));
   },
   afterSync(){
    for(const {from,to,rest,axis:restAxis} of pistons){
     const direction=from.parent.worldToLocal(to.getWorldPosition(V3())).sub(from.position).normalize();
     from.quaternion.copy(turn.setFromUnitVectors(axis.copy(restAxis).applyQuaternion(rest),direction).multiply(rest));
    }
   },
   dispose
  };
 }
});
})(window);
