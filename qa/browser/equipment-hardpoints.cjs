const assert=require('node:assert/strict');

module.exports=async function checkEquipmentHardpoints({page,origin}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 for(const [frame,weapon,melee,expected] of [
  [2,'rifle',null,['rifle','missile',null,'bulwark-shield']],
  [2,null,'cleaver',['missile','missile','cleaver','bulwark-shield']],
  [4,'rifle',null,['rifle','locust',null,'bulwark-shield']],
  [4,null,'cleaver',['locust','locust','cleaver','bulwark-shield']],
  [10,null,'cleaver',['missile','missile','cleaver','bulwark-shield']]
 ]){
  const params={frame,weapon,melee,meleeHand:melee?'right':null,shoulder:frame===4?'locust':'missile',shield:'bulwark-shield'};
  const mounted=await page.waitForFunction(params=>{
   const preview=IronVowFoundry.preview(params,0,'rig-v2');
   if(!preview?.m.nativeV2||!preview.armed||!preview.shield)return false;
   const {primary,shoulderWeapon,secondary,shield}=preview,arms=preview.m.rig.arms;
   const point=node=>node.getWorldPosition(new THREE.Vector3());
   return {
    ids:[primary?.id??null,shoulderWeapon?.id??null,secondary?.id??null,preview.shieldId],
    shieldLeft:point(shield.grip).distanceTo(point(arms.L.so))<.01,
    meleeRight:!params.melee||secondary?.mount.parent===arms.R.so,
    shoulderClear:shoulderWeapon?.mount.parent!==arms.R.so&&shoulderWeapon?.mount.parent!==arms.L.so
   };
  },params,{timeout:120000});
  assert.deepEqual(await mounted.jsonValue(),{ids:expected,shieldLeft:true,meleeRight:true,shoulderClear:true});
 }
};
