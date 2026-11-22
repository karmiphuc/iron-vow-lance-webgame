const assert=require('node:assert/strict');

module.exports=async function checkEquipmentHardpoints({page,origin}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 for(const [frame,weapon,melee,expected] of [
  [2,'rifle',null,['rifle','missile',null,'bulwark-shield']],
  [2,null,'cleaver',['missile','missile','cleaver','bulwark-shield']],
  [4,'rifle',null,['rifle','locust',null,'bulwark-shield']],
  [4,null,'cleaver',['locust','locust','cleaver','bulwark-shield']],
  [10,null,'cleaver',['missile','missile','cleaver','bulwark-shield']],
  [19,null,'cleaver',['missile','missile','cleaver','bulwark-shield']]
 ]){
  const params={frame,weapon,melee,meleeHand:melee?'right':null,shoulder:frame===4?'locust':'missile',shield:'bulwark-shield'};
  const mounted=await page.waitForFunction(params=>{
   const preview=IronVowFoundry.preview(params,0,'rig-v2');
   if(!preview?.m.nativeV2||!preview.armed||!preview.shield)return false;
   const {primary,shoulderWeapon,secondary,shield}=preview,arms=preview.m.rig.arms;
   const point=node=>node.getWorldPosition(new THREE.Vector3());
   return {
    ids:[primary?.id??null,shoulderWeapon?.id??null,secondary?.id??null,preview.shieldId],
    shieldLeft:point(shield.grip).distanceTo(point(preview.m.nativeV2.shieldSocket??arms.L.so))<.01,
    meleeRight:!params.melee||(secondary?.mount.parent===arms.R.so||secondary?.mount.parent.parent===arms.R.wr),
    shoulderClear:shoulderWeapon?.mount.parent!==arms.R.so&&shoulderWeapon?.mount.parent!==arms.L.so
   };
  },params,{timeout:120000});
  assert.deepEqual(await mounted.jsonValue(),{ids:expected,shieldLeft:true,meleeRight:true,shoulderClear:true});
 }
 for(const [frame,launcher,shell,emitters] of [
  [2,'missile',['launcher.L','launcher.R'],['pod.L','pod.R']],
  [4,'locust',['Pod.L / rigid assembly','Pod.R / rigid assembly'],['muzzle.locust.L','muzzle.locust.R']],
  [10,'missile',['mount.shoulderR'],['muzzle.vesper.01']]
 ]){
  for(const side of ['left','right']){
   const asset=await page.waitForFunction(({frame,launcher,shell,side})=>{
    const hp={body:100,pilot:100,legs:100,left:100,right:100};
    hp[side]=0;
    const entry=IronVowFoundry.preview({frame,weapon:'rifle',shoulder:launcher,hp},0,'rig-v2');
    if(!entry?.armed||!entry.shoulderWeapon)return false;
    const find=name=>entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    return {visible:shell.map(name=>find(name).visible),muzzle:entry.shoulderWeapon.muzzle.name};
   },{frame,launcher,shell,side},{timeout:120000});
   const result=await asset.jsonValue();
   assert.deepEqual(result.visible,frame===10?[side==='left']:[side==='right',side==='left']);
   assert.equal(result.muzzle,emitters[frame!==10&&side==='left'?1:0]);
  }
 }
 await page.locator('[data-armory-class="melee"]').click();
 const choice=page.locator('[data-refit-choice="cleaver"]');
 if(await choice.count()&&await choice.getAttribute('aria-pressed')!=='true')await choice.click();
 const fitRight=page.locator('[data-equip-right="cleaver"]');
 for(const [width,height] of [[768,1024],[1024,768]]){
  await page.setViewportSize({width,height});
  await fitRight.scrollIntoViewIfNeeded();
  const area=await fitRight.boundingBox();
  assert.ok(area&&area.width>=44&&area.height>=44&&area.x>=0&&area.x+area.width<=width);
 }
};
