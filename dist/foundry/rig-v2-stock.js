/* Kestrel and Basilisk use their authored rigid pivots with Workshop equipment. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3,arsenal=root.IronVowProductionArsenal;
function setup({bone,find,marker,bounds,rig,workshopMounts}){
 const sockets={L:rig.arms.L.so,R:rig.arms.R.so};
 const {fit,dispose}=workshopMounts(sockets);
 let pods;
 // The Basilisk generator welds the shells into the spine and leaves a
 // marker at each pod face (tools/authoring/basilisk/build_basilisk.py:410–417).
 if(find('pod.R')&&find('pod.L')){
  const carrier=rig.spine,mount=new T.Group();carrier.add(mount);
  pods={id:'missile',carrier,mount,muzzle:marker('pod.R',mount,[0,0,1]),muzzle2:marker('pod.L',mount,[0,0,1]),
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
   const melee=unit.shield?null:unit.melee,integrated=pods&&unit.weapon==='missile';
   const hand=fit('R',integrated?null:unit.weapon,armory),gun=integrated?pods:hand,blade=fit('L',melee,armory);
   if(gun)gun.mount.visible=unit.alive&&unit.hp.right>0;
   if(hand){
    if(arsenal.isExpansion(hand.id))arsenal.animate(hand,pose);
    else hand.recoil.position.z=-Math.abs(pose.recoil||0)*.22;
   }
   if(blade){blade.mount.visible=unit.alive&&unit.hp.left>0;arsenal.animate(blade,pose);}
   entry.primary=gun;entry.secondary=blade;
   return Boolean(gun&&(!melee||blade));
  },
  afterSync(){for(const {from,to,rest,axis:restAxis} of pistons){
   const direction=from.parent.worldToLocal(to.getWorldPosition(V3())).sub(from.position).normalize();
   from.quaternion.copy(delta.setFromUnitVectors(axis.copy(restAxis).applyQuaternion(rest),direction).multiply(rest));
  }},
  dispose
 };
}
for(const [frame,id] of [[1,'kestrel'],[2,'basilisk']])root.IronVowRigV2.register(frame,{id,assetPath:`rig-bench/rig-v2/${id}.glb`,factoryLivery:true,dimensions:{walkDrop:.55,stride:.6},setup});
})(window);
