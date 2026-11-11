const assert=require('node:assert/strict');
module.exports=async function bastionSharedRig({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('#nav button').first().waitFor();
 await page.evaluate(()=>{save.credits+=FRAMES[BASTION_FRAME].cost;render();});
 await tap('[data-bay="market"]');assert.equal(await page.locator('[data-buy-hull="12"]').count(),0,'Citadel is absent from the market');
 await tap('[data-buy-hull="10"]');await tap('[data-bay="storage"]');await tap('[data-chassis="10"]');await tap('[data-bay="assigned"]');
 assert.equal(await page.evaluate(()=>save.units[0].weapon),'rifle');
 console.log('Bastion bought and assigned');
 await page.waitForFunction(()=>IronVowFoundry.preview({frame:10,weapon:'rifle',melee:'cleaver'},2,'bastion')?.secondary?.tip,null,{timeout:120000});
 console.log('Bastion shared preview ready');
 const fittings=await page.evaluate(()=>['cleaver','blade','breaker','piledriver'].map(melee=>{
  const entry=IronVowFoundry.preview({frame:10,weapon:'rifle',melee},2,'bastion'),m=entry.m,p=node=>node.getWorldPosition(new THREE.Vector3());
  return{left:p(entry.secondary.mount).distanceTo(p(m.rig.arms.L.so)),right:p(entry.primary.mount).distanceTo(p(m.rig.arms.R.so)),tip:Boolean(entry.secondary.tip),width:entry.surface.width,pistons:m.nativePistons.length};
 }));
 for(const sample of fittings){assert.ok(sample.left<1e-6&&sample.right<1e-6&&sample.tip,'Production weapons remain on the shared rig sockets');assert.equal(sample.width,640);assert.equal(sample.pistons,14,'Both halves of every native piston are bound');}
 console.log('Bastion fittings checked');
 await page.evaluate(()=>{const render=IronVowFoundry.previewAnimated;window.bastionPoseQA={first:null,changed:false};IronVowFoundry.previewAnimated=(...args)=>{const entry=render(...args);if(entry&&args[1]>.05){const image=entry.surface.toDataURL();bastionPoseQA.first??=image;bastionPoseQA.changed||=image!==bastionPoseQA.first;}return entry;};});
 await tap('#bastion-test-melee');await page.waitForFunction(()=>bastionPoseQA.changed,null,{timeout:120000});
 console.log('Bastion Test Strike animated');
 await page.evaluate(()=>__ironVow.start({seed:4242,frames:[10,8,7]}));await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 await page.evaluate(()=>{selected=1;action='fire';renderBattle();});
 const point=await page.evaluate(()=>IronVowScene.projectWorld(IronVowScene.partPoint(battle.units.find(u=>u.id==='ally0'))));
 if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 assert.equal(await page.evaluate(()=>selected),0,'A real raycast selects the visible Bastion');
};
