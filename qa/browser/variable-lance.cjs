const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const sortie=readFileSync(join(__dirname,'..','fixtures','frontier-staged-reserve-v9.json'),'utf8');

module.exports=async function checkVariableLance({page,origin,tap,mobile}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof importCareer==='function');
 await page.evaluate(async record=>{
  const career=JSON.parse(record),snapshot=career.sortie;
  snapshot.units.splice(5,1);
  snapshot.slots.pop();
  snapshot.selected=0;
  snapshot.operation.called=false;
  importCareer(career);
  closeModal();
  await pendingCareerWrite;
 },sortie);
 if(mobile)await page.setViewportSize({width:820,height:1180});
 await page.locator('#call-sortie-reserve').waitFor();
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 await tap('#call-sortie-reserve');
 await page.locator('[data-unit="5"]').waitFor();
 await page.waitForFunction(()=>IronVowScene.models.get('ally5')?.entry?.armed,null,{timeout:120000});
 assert.equal(await page.locator('.unitbuttons button').count(),6);
 assert.equal(await page.locator('.operation-marker').count(),2);
 assert.match(await page.locator('.battle-top').innerText(),/GUNSHIP|AIR SUPPORT/);
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 if(mobile)await tap('[data-unit="4"]');
 else await page.keyboard.press('5');
 assert.equal(await page.evaluate(()=>selected),4);
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-unit="4"].active').waitFor();
 assert.equal(await page.evaluate(()=>battle.units.filter(u=>u.kind==='helicopter').length),3);
 if(mobile)await page.setViewportSize({width:1180,height:820});
 assert.ok(await page.locator('.unitbuttons').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
};
