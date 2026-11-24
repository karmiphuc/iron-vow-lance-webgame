const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const sortie=readFileSync(join(__dirname,'..','fixtures','frontier-staged-reserve-v9.json'),'utf8');

module.exports=async function checkVariableLance({page,origin,tap,mobile}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof importCareer==='function');
 await page.evaluate(async record=>{
  importCareer(JSON.parse(record));
  closeModal();
  await pendingCareerWrite;
 },sortie);
 await page.locator('[data-unit="5"]').waitFor();
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
 assert.ok(await page.locator('.unitbuttons').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
};
