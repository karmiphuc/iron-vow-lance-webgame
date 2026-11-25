const assert=require('node:assert/strict');

module.exports=async function checkComSkills({page,mobile,origin,tap}){
 if(mobile)await page.setViewportSize({width:820,height:1180});
 await page.goto(new URL('?view=pilots',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-com-pilot]').first().waitFor();
 const pilot=await page.locator('[data-com-pilot]').first().getAttribute('data-com-pilot');
 await page.evaluate(kind=>{
  save.comPilots={[pilotId(Number(kind))]:{progress:{rof:6,covering:6},installed:['rof']}};
 },pilot);
 const open=()=>tap('[data-com-pilot="'+pilot+'"]');
 await open();
 const panel=page.locator('#modal .mech-computer');
 assert.match(await panel.innerText(),/MEMORY 1 \/ 3/);
 await tap('[data-com-skill="covering"]');
 assert.match(await panel.innerText(),/MEMORY 2 \/ 3/);
 assert.ok(await panel.locator('[data-com-skill="rof"]').evaluate(el=>el.getBoundingClientRect().height>=44));
 if(mobile){
  await page.setViewportSize({width:1180,height:820});
  assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 }
 await tap('#modal-0');
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 await open();
 assert.match(await panel.innerText(),/MEMORY 2 \/ 3/);
 await tap('[data-com-skill="rof"]');
 assert.match(await panel.innerText(),/MEMORY 1 \/ 3/);
 await tap('#modal-0');
 await page.evaluate(()=>{save.day=8;save.readinessStart=1;page='overworld';render()});
 assert.match(await page.locator('.readiness-note').innerText(),/Week 2/);
};
