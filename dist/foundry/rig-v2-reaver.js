/* RV-04 retains both authored autocannons and independent recoil carriages. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3;
root.IronVowRigV2.register(16,{
 id:'reaver',assetPath:'rig-bench/rig-v2/reaver.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig}){
  const cannons={},actuators=[];
  for(const side of ['L','R']){
   const arm=rig.arms[side],carrier=arm.so,name='RECOIL_CARRIAGE_'+side,authored=bone(name);
   const mount=driver(name,carrier),muzzle=marker('muzzle.'+side,mount,[0,0,-1]);
   const rest=mount.position.clone();
   const recoilDirection=muzzle.getWorldDirection(V3()).applyQuaternion(carrier.getWorldQuaternion(new T.Quaternion()).invert());
   let firedAt=-Infinity;
   const cannon={id:'rifle',subsystem:side==='L'?'left':'right',mount,carrier,muzzle,bounds:()=>bounds(name),
    onLaunch(time){firedAt=time;},
    pose(visible,time){
     const age=time-firedAt;
     const kick=age>=0&&age<.4?(1-Math.exp(-100*age))*Math.exp(-10*age):0;
     mount.position.copy(rest).addScaledVector(recoilDirection,-.22*kick);
     mount.visible=authored.visible=visible;
    }};
   cannons[side]=cannon;
   const torso=bone('Actuator torso clevis '+side),clevis=bone('Actuator arm clevis '+side);
   for(const [from,to] of [[torso,clevis],[clevis,torso]]){
    actuators.push({from,to,rest:from.quaternion.clone(),axis:from.worldToLocal(to.getWorldPosition(V3())).normalize()});
   }
  }
  const right=cannons.R,left=cannons.L;
  right.aimPivot=marker=>marker===left.muzzle?rig.arms.L.wr:undefined;
  left.aimPivot=()=>rig.arms.L.wr;
  const axis=V3(),delta=new T.Quaternion();
  return {
   boundsNames:['RECOIL_CARRIAGE_R','RECOIL_CARRIAGE_L'],
   pose(entry,unit,_,time){
    const useLeft=unit.alive&&unit.hp.left>0;
    right.pose(unit.alive&&unit.hp.right>0,time);left.pose(useLeft,time);
    right.muzzle2=useLeft?left.muzzle:undefined;
    right.alternate=useLeft?left:undefined;
    entry.primary=unit.hp.right>0?right:left;
   },
   afterSync(){
    for(const {from,to,rest,axis:restAxis} of actuators){
     const direction=from.parent.worldToLocal(to.getWorldPosition(V3())).sub(from.position).normalize();
     from.quaternion.copy(delta.setFromUnitVectors(axis.copy(restAxis).applyQuaternion(rest),direction).multiply(rest));
    }
   }
  };
 }
});
})(window);
