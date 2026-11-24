const assert=require('node:assert/strict');

module.exports=async function checkPilotClasses({page,mobile,origin,tap}){
 if(mobile)await page.setViewportSize({width:820,height:1180});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof trainingTree==='function');
 await page.evaluate(()=>{
  save.units[0].level=5;
  learnTraining(0,'pathfinder');
  hirePilot(3);
  page='pilots';render();
 });
 await page.locator('[data-reserve-training="scout"]').waitFor();
 await tap('#train-pilot-0');
 assert.equal(await page.locator('.training-path').count(),3);
 assert.equal(await page.locator('[data-license]').count(),3);
 assert.ok(await page.locator('.modalbox').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 await tap('[data-license="guard"]');
 assert.equal(await page.locator('[data-license="guard"]').getAttribute('aria-pressed'),'true');
 await tap('#pilot-retrain');
 await tap('#modal-1');
 assert.equal(await page.evaluate(()=>learnedTraining(0).length),0);
 assert.equal(await page.locator("#pilot-retrain").count(),0);
 assert.equal(await page.locator('[data-license="guard"]').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>{
  closeModal();createBattle(0);
  const ally=battle.units[1],pilot=current();
  ally.x=pilot.x+1;ally.z=pilot.z;
  render();
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 await tap('#field-license');
 await tap('[data-license-target="0"]');
 assert.equal(await page.evaluate(()=>current().licenseUsed&&battle.units[1].brace&&!current().skill),true);
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#field-license').waitFor();
 assert.match(await page.locator('#field-license').innerText(),/USED/);
 assert.equal(await page.locator('#field-license').isDisabled(),true);
};
