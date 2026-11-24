const assert=require('node:assert/strict');
const checkpoint=require('../fixtures/distress-partial-evac.json');

module.exports=async function checkDistress({page,origin,mobile,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof importCareer==='function');
 await page.evaluate(async career=>{importCareer(career);closeModal();await pendingCareerWrite;},checkpoint);
 if(mobile)await page.setViewportSize({width:820,height:1180});
 await page.waitForFunction(()=>IronVowScene.ready);
 assert.match(await page.locator('.distress-readout').innerText(),/1 rescued/i);
 assert.equal(await page.locator('[data-unit]').count(),3);
 await tap('#distress-radio');
 const ally=page.locator('[data-radio-ally]').first();
 const index=await ally.getAttribute('data-radio-ally');
 await tap('[data-radio-ally="'+index+'"]');
 await tap('#radio-hold');
 await page.evaluate(async()=>{await pendingCareerWrite;});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#distress-radio').waitFor();
 assert.equal(await page.evaluate(i=>battle.units.find(u=>u.index===Number(i)&&u.distressAlly).distressOrder.kind,index),'hold');
 if(mobile)await page.setViewportSize({width:1180,height:820});
 await tap('#withdraw');
 const confirm=page.getByRole('button',{name:'WITHDRAW WITH SURVIVORS'});
 if(mobile)await confirm.tap();else await confirm.click();
 assert.match(await page.locator('#modal').innerText(),/1 of 3 allied units rescued/i);
 assert.equal(await page.evaluate(()=>save.history.at(-1).win),true);
};
