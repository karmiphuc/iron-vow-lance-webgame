const assert=require('node:assert/strict');

module.exports=async function checkCareerTabs({context,page,mobile,origin,tap}){
 const checkStale=async tab=>{
  await tab.getByRole('dialog',{name:'CAREER UPDATED'}).waitFor();
  assert.ok(await tab.evaluate(()=>document.querySelector('#ui').inert));
 };
 const reloadCareer=async tab=>{
  const ready=tab.waitForNavigation({waitUntil:'domcontentloaded'});
  const button=tab.getByRole('button',{name:'RELOAD CAREER'});
  if(mobile)await button.tap();else await button.click();
  await ready;
 };
 const saved=tab=>tab.evaluate(async()=>{await pendingCareerWrite;return JSON.parse(localStorage.getItem('iron-vow-career'))});
 await page.setViewportSize({width:320,height:735});
 await page.goto(new URL('?view=hangar',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('.base-page').waitFor();
 assert.ok(await page.locator('#nav').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'eight tabs fit at 320px');
 await tap('[data-hangar-deck="mechs"]');
 assert.ok(await page.evaluate(()=>{
  const status=document.querySelector('.hangar-status').getBoundingClientRect();
  const controls=document.querySelector('.hangar-top-right').getBoundingClientRect();
  return status.top>=controls.bottom||status.right<=controls.left;
 }),'Mech Bay status and controls do not overlap');
 await tap('#inspect');
 await page.locator('.unit-inspect').waitFor();
 await tap('[data-hangar-deck="base"]');
 await page.evaluate(()=>localStorage.setItem(CAREER_STORAGE,JSON.stringify({...save,day:4,wins:3,rep:30})));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.base-page').waitFor();
 assert.equal(await page.evaluate(()=>save.day),4,'a legacy localStorage career still loads before its first transaction');

 const other=await context.newPage();
 try{
  await other.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
  await other.locator('[data-build-facility="office"]').waitFor();
  const reloaded=page.waitForNavigation({waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   document.querySelector('[data-build-room="fabrication"]').click();
   window.location.reload();
  });
  await reloaded;
  await page.locator('.base-queue').waitFor();
  await checkStale(other);
  await other.keyboard.press('Escape');
  await checkStale(other);
  await other.evaluate(()=>{save.credits=1;persist()});
  assert.equal((await saved(page)).credits,2400,'stale writes leave the newest balance intact');
  assert.equal((await saved(page)).hangar.project.room,'fabrication');
  await reloadCareer(other);
  const office=other.locator('[data-build-facility="office"]');
  if(mobile)await office.tap();else await office.click();
  await checkStale(page);
  const both=await saved(page);
  assert.equal(both.credits,600);
  assert.equal(both.day,4);
  assert.equal(both.wins,3);
  assert.equal(both.hangar.project.room,'fabrication');
  assert.equal(both.ship.project.facility,'office');

  await reloadCareer(page);
  await tap('#nav [data-page="contracts"]');
  await tap('[data-deploy="0"]');
  await tap('#modal-1');
  await tap('#modal-0');
  assert.ok((await saved(page)).sortie,'deployment is durably saved before the other tab reloads');
  await reloadCareer(other);
  await other.locator('#brace').waitFor();
  await tap('#brace');
  await checkStale(other);
  const sortie=(await saved(page)).sortie;
  assert.equal(sortie.units[0].brace,true);
  await reloadCareer(other);
  await other.locator('#brace').waitFor();
  assert.deepEqual(await other.evaluate(()=>JSON.parse(JSON.stringify(captureSortie()))),sortie);

  const compete=(tab,amount)=>tab.evaluate(async cost=>{save.credits-=cost;await persist();return careerStale},amount);
  const oldCareer=await saved(page),beforeRace=oldCareer.credits;
  const results=await Promise.all([compete(page,100),compete(other,200)]);
  assert.equal(results.filter(Boolean).length,1,'exactly one tab can save from the shared checkpoint');
  const winning=beforeRace-(results[0]?200:100);
  assert.equal((await saved(page)).credits,winning);
  await other.evaluate(career=>localStorage.setItem(CAREER_STORAGE,JSON.stringify(career)),oldCareer);
  await other.reload({waitUntil:'domcontentloaded'});
  await other.locator('#brace').waitFor();
  assert.equal(await other.evaluate(()=>save.credits),winning,'the committed checkpoint takes precedence over a legacy tab write');

  await other.addInitScript(()=>{
   indexedDB.open=()=>{throw new DOMException('Injected storage failure','UnknownError')};
  });
  await other.reload({waitUntil:'domcontentloaded'});
  await other.getByRole('dialog',{name:'CAREER STORAGE UNAVAILABLE'}).waitFor();
  await other.evaluate(()=>{save.credits=0;persist()});
  assert.equal((await saved(other)).credits,oldCareer.credits,'failed startup cannot write a fallback career');
  assert.equal(await page.evaluate(async()=>JSON.parse(await readCareerDB(careerDB)).credits),winning);
 }finally{await other.close()}
};
