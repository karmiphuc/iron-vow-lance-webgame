/* Warden's exported joints already use the measured Foundry hinge axes. */
(function(root){
'use strict';
const family={
 breaker:'maul','anchor-hammer':'maul','breach-gauntlet':'maul',
 cleaver:'sweep',blade:'sweep',hatchet:'sweep','signal-knife':'sweep','aegis-cleave':'sweep',
 piledriver:'thrust',pike:'thrust',tonfa:'thrust','pulse-bash':'thrust','free-hand':'thrust'
};
root.IronVowRigV2.register(0,{
 id:'warden',assetPath:'rig-bench/rig-v2/warden.glb',canonical:true,authoredPaint:true,
 accentInheritsSecondary:true,scale:1.13,equipmentScale:.62,
 setup({bone,rig}){
  for(const arm of Object.values(rig.arms))for(const joint of [arm.sh,arm.el,arm.wr])joint.rotation.set(0,0,0);
  for(const leg of rig.legs)leg.cap=bone('kneecap.'+leg.side);
  return {
   beforeAnimate(mech,weapon){mech.dims.melee=mech.dims.meleeStyles[family[weapon]||'sweep'];},
   afterSync(){for(const leg of rig.legs)leg.cap.quaternion.identity().slerp(leg.kn.quaternion,.5);}
  };
 }
});
})(window);
