/* HV-09X keeps the original twin Morrow and integral breach gripper. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3;
root.IronVowRigV2.register(11,{
 id:'hellbreaker',assetPath:'rig-bench/rig-v2/hellbreaker.glb',
 setup({bone,driver,marker,bounds,rig:{arms}}){
  const name='Cannon Slide',carrier=arms.R.wr,mount=driver(name,carrier);
  const muzzle=marker('muzzle.morrow.L',mount),muzzle2=marker('muzzle.morrow.R',mount);
  const slideRest=mount.position.clone();
  const forward=muzzle.getWorldDirection(V3()).applyQuaternion(carrier.getWorldQuaternion(new T.Quaternion()).invert());
  const primary={id:'morrow',carrier,mount,muzzle,muzzle2,bounds:()=>bounds(name)};
  // The published shot overlay used the second digit's tip joint, not a separate weapon prop.
  const gauntlet={id:'breach-gauntlet',mount:arms.L.so,tip:bone('strike.tip.breach-gauntlet')};
  return {
   boundsNames:[name],rams:['Arm ram','Leg ram'],
   pose(entry,unit,pose){
    entry.primary=primary;
    entry.secondary=unit.hp.left>0&&unit.melee==='breach-gauntlet'?gauntlet:null;
    mount.position.copy(slideRest).addScaledVector(forward,-Math.abs(pose.recoil)*.22);
   }
  };
 }
});
})(window);
