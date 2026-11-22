/* LI-01 R32 and LI-02 E7 use the same production weapon fit and articulated hands. */
(function(root){
'use strict';
const T=root.THREE,arsenal=root.IronVowProductionArsenal;
const digits=['Index','Middle','Ring','Little','Thumb'];
const axis=new T.Vector3(0,1,0);
// Directions for each phalanx in the normalized right wrist frame.
// Keep the index forward at the trigger, curl the three lower digits around
// the grip, and bring the thumb across the back of the hand.
const pistolGrip=[
 [[.36,-.93,-.12],[.86,-.50,-.16],[-.60,-.72,-.20]],
 [[.52,-.85,0],[.98,.17,0],[-.20,.98,0]],
 [[.55,-.83,.08],[.97,.22,.09],[-.24,.97,.12]],
 [[.60,-.79,.20],[.93,.34,.18],[-.28,.94,.19]],
 [[.60,-.76,-.16],[-.14,-.85,-.51],[-.80,-.59,-.10]]
];
// The Trident has a transverse crossbar, so its four fingers curl down
// together and the thumb opposes them from above.
const crossbarGrip=pistolGrip.map((chain,index)=>index===4?chain.map(([x,y,z])=>[x,y,z*.65]):
 [[.49,-.86,0],[.98,.21,-.06],[-.27,.96,-.06]]);
function captureGrip(chain,guide,wristBasis){
 const rest=chain.map(joint=>joint.quaternion.clone());
 const posed=chain.map((joint,index)=>{
  const current=joint.getWorldQuaternion(new T.Quaternion());
  const from=axis.clone().applyQuaternion(current);
  const to=new T.Vector3(...guide[index]).normalize().applyQuaternion(wristBasis);
  const turn=new T.Quaternion().setFromUnitVectors(from,to);
  joint.quaternion.copy(joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(turn.multiply(current)));
  return joint.quaternion.clone();
 });
 chain.forEach((joint,index)=>joint.quaternion.copy(rest[index]));
 return posed;
}
function setup({bone,rig,workshopMounts}){
 const right=rig.arms.R;
 const bakedCarbine=bone('WEAPON_SOCKET_R');
 bakedCarbine.visible=false;
 const {fit,dispose}=workshopMounts({R:right.so});
 const basis=right.wr.getWorldQuaternion(new T.Quaternion());
 const fingers=digits.map((name,index)=>{
  const joints=[1,2,3].map(n=>bone(`${name}.0${n}.R`));
  return {joints,rest:joints.map(joint=>joint.quaternion.clone()),
   pistol:captureGrip(joints,pistolGrip[index],basis),
   crossbar:captureGrip(joints,crossbarGrip[index],basis)};
 });
 let lastGun,grip;
 return {
  pose(entry,unit,pose,time,armory){
   const gun=fit('R',unit.weapon,armory);
   const held=Boolean(gun&&unit.alive&&unit.hp.right>0);
   if(gun&&gun!==lastGun){
    // The normalized socket supplies the palm pivot. The production assets
    // share a forward barrel axis but the Trident's grip sits higher.
    gun.mount.position.set(-.02,-.025,gun.id==='trident'?0:.095);
    gun.mount.scale.setScalar(.8);
    lastGun=gun;
   }
   if(gun){
    gun.mount.visible=held;
    arsenal.animate(gun,pose);
   }
   grip=held?(gun.id==='trident'?'crossbar':'pistol'):'rest';
   entry.primary=gun;
   return Boolean(gun);
  },
  afterSync(){
   for(const finger of fingers)finger.joints.forEach((joint,index)=>joint.quaternion.copy(finger[grip??'rest'][index]));
  },
  dispose
 };
}
for(const [frame,id] of [[13,'li-01'],[14,'li-02']]){
 root.IronVowRigV2.register(frame,{id,assetPath:`rig-bench/rig-v2/${id}.glb`,setup});
}
})(window);
