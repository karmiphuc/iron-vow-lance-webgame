const assert=require('node:assert/strict');

module.exports=async function checkWanzerAP({page,mobile,origin,tap}){
 if(mobile)await page.setViewportSize({width:1024,height:1366});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 const open=page.locator('#ap-allocation');
 await open.waitFor();
 assert.ok((await open.boundingBox()).height>=44);
 await tap('#ap-allocation');
 const form=page.locator('.ap-allocation-form');
 await form.locator('#defc-type').selectOption('flame');
 await form.locator('[data-ap-part="body"]').selectOption('1');
 await form.locator('[data-ap-part="legs"]').selectOption('1');
 assert.match(await form.locator('#ap-allocation-summary').innerText(),/12\/14 usable AP · 12 at deployment · 5% matching damage reduction · 10% status resistance/);
 if(mobile){
  await page.setViewportSize({width:1366,height:1024});
  assert.ok(await form.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 }
 await tap('#modal-1');
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 await tap('#ap-allocation');
 assert.equal(await form.locator('#defc-type').inputValue(),'flame');
 assert.equal(await form.locator('[data-ap-part="body"]').inputValue(),'1');
 await tap('#modal-0');
 await page.evaluate(()=>{
  save.comPilots={[pilotId(pilotClass(0))]:{progress:{ap0:6},installed:['ap0']}};
  deploy(0,false,[0]);closeModal();
 });
 const skill=page.locator('#ap-skill');
 await page.waitForFunction(()=>window.IronVowScene?.ready&&document.querySelector('#ap-skill')?.disabled===false);
 assert.match(await page.locator('[data-unit="0"]').innerText(),/12\/12 AP/);
 await tap('#ap-skill');
 await tap('[data-prime-ap="ap0"]');
 assert.match(await skill.innerText(),/AP-0 READY/);
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await skill.innerText(),/AP-0 READY/);
};
