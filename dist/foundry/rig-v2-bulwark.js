/* Bulwark's shield and cleaver are fitted parts of the original rig. */
(function(root){
'use strict';
root.IronVowRigV2.register(17,{
 id:'bulwark',assetPath:'rig-bench/rig-v2/bulwark.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig}){
  const left=rig.arms.L.so,right=rig.arms.R.so;
  const shieldName='module.aegis-shield',cleaverName='module.aegis-cleaver';
  const shieldModel=bone(shieldName),cleaverModel=bone(cleaverName);
  const shieldMount=driver(shieldName,left),cleaverMount=driver(cleaverName,right);
  const bashTip=marker('strike.tip.aegis-bash',shieldMount),cleaveTip=marker('strike.tip.aegis-cleave',cleaverMount);
  const shield={mount:shieldMount,face:bashTip};
  const bash={id:'aegis-bash',carrier:left,mount:shieldMount,tip:bashTip,bounds:()=>bounds(shieldName)};
  const cleave={id:'aegis-cleave',carrier:right,mount:cleaverMount,tip:cleaveTip,bounds:()=>bounds(cleaverName)};
  return {
   boundsNames:[shieldName,cleaverName],nativeShield:true,
   meleeSide:id=>id==='aegis-cleave'?'R':'L',
   strikeContact:id=>id==='aegis-cleave'?cleaveTip:id==='aegis-bash'?bashTip:null,
   pose(entry,unit,pose){
    shieldMount.visible=shieldModel.visible=unit.alive&&unit.hp.left>0;
    cleaverMount.visible=cleaverModel.visible=unit.alive&&unit.hp.right>0;
    entry.shield=shield;entry.primary=cleave;
    entry.secondary=pose.strikeKind==='aegis-cleave'?cleave:bash;
   }
  };
 }
});
})(window);
