/* Kestrel and Basilisk use their authored rigid pivots with Workshop equipment. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3,arsenal=root.IronVowProductionArsenal;
function setup({bone,find,marker,bounds,rig,workshopMounts}){
 const sockets={L:rig.arms.L.so,R:rig.arms.R.so};
 const shoulder=new T.Group();
 shoulder.position.set(rig.arms.R.sh.position.x,rig.arms.R.sh.position.y+.6,-.35);
 rig.spine.add(shoulder);
 const {fit,dispose}=workshopMounts({...sockets,shoulder});
 let pods,launchers,emitters;
 // Each Basilisk pod is separate from the spine and keeps its authored emitter.
 if(find('pod.R')&&find('pod.L')){
  const carrier=rig.spine,mount=new T.Group();carrier.add(mount);
  launchers={left:bone('launcher.L'),right:bone('launcher.R')};
  emitters={left:marker('pod.L',mount,[0,0,1]),right:marker('pod.R',mount,[0,0,1])};
  pods={id:'missile',subsystem:'right',carrier,mount,muzzle:emitters.right,muzzle2:emitters.left,
   aimPivot:()=>carrier,bounds:()=>bounds('spine')};
 }
 // The source build scripts author ten paired cylinder pivots; keep each
 // half pointing at its mate as the rigid shoulder and leg joints move.
 const pistons=[];
 for(let i=1;i<=10;i++){
  const a=bone(`piston.${i}.a`),b=bone(`piston.${i}.b`);
  for(const [from,to] of [[a,b],[b,a]])pistons.push({from,to,rest:from.quaternion.clone(),axis:from.worldToLocal(to.getWorldPosition(V3())).normalize()});
 }
 const axis=V3(),delta=new T.Quaternion();
 return {shieldSocket:sockets.L,boundsNames:pods?['spine']:[],
  pose(entry,unit,pose,time,armory){
   const rackId=unit.shoulder??(['missile','cerberus'].includes(unit.weapon)?unit.weapon:null);
   const handId=unit.weapon===rackId?null:unit.weapon;
   const rightMelee=unit.meleeHand==='right',melee=!unit.shield||rightMelee?unit.melee:null;
   const hand=fit('R',rightMelee?melee:handId,armory),left=fit('L',rightMelee?null:melee,armory);
   const retail=rackId==='vesper-shoulder'?'missile':rackId;
   const added=fit('shoulder',pods&&retail==='missile'?null:retail,armory);
   const rack=pods&&retail==='missile'?pods:added;
   if(added){added.mount.rotation.x=0;added.subsystem='right';added.aimPivot=()=>added.mount;}
   const online=unit.alive&&unit.hp.body>0,rightOnline=unit.hp.right>0,leftOnline=unit.hp.left>0;
   if(pods){
    launchers.right.visible=rack===pods&&online&&rightOnline;
    launchers.left.visible=rack===pods&&online&&leftOnline;
    pods.subsystem=rightOnline?'right':'left';
    pods.muzzle=rightOnline?emitters.right:emitters.left;
    pods.muzzle2=leftOnline?emitters.left:pods.muzzle;
    pods.mount.visible=online&&(rightOnline||leftOnline);
   }
   if(added)added.mount.visible=online&&rightOnline;
   if(hand){
    hand.mount.visible=unit.alive&&unit.hp.right>0;
    if(rightMelee||arsenal.isExpansion(hand.id))arsenal.animate(hand,pose);
    else hand.recoil.position.z=-Math.abs(pose.recoil||0)*.22;
   }
   if(left){left.mount.visible=unit.alive&&unit.hp.left>0;arsenal.animate(left,pose);}
   entry.shoulderWeapon=rack;
   entry.primary=(rightMelee?null:hand)??rack;
   entry.secondary=rightMelee?hand:left;
   return (!handId||rightMelee||Boolean(hand))&&(!melee||Boolean(entry.secondary))&&(!rackId||Boolean(rack));
  },
  afterSync(){for(const {from,to,rest,axis:restAxis} of pistons){
   const direction=from.parent.worldToLocal(to.getWorldPosition(V3())).sub(from.position).normalize();
   from.quaternion.copy(delta.setFromUnitVectors(axis.copy(restAxis).applyQuaternion(rest),direction).multiply(rest));
  }},
  dispose
 };
}
for(const [frame,id,scale] of [[1,'kestrel',1],[2,'basilisk',.95]]){
 root.IronVowRigV2.register(frame,{id,assetPath:`rig-bench/rig-v2/${id}.glb`,factoryLivery:true,scale,
  dimensions:{walkDrop:.55,stride:.6},setup});
}
})(window);
