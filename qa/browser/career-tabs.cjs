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
 const saved=tab=>tab.evaluate(()=>JSON.parse(localStorage.getItem('iron-vow-career')));
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

 const other=await context.newPage();
 try{
  await other.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
  await other.locator('[data-build-facility="office"]').waitFor();
  await tap('[data-build-room="fabrication"]');
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
  assert.equal(both.hangar.project.room,'fabrication');
  assert.equal(both.ship.project.facility,'office');

  await reloadCareer(page);
  await tap('#nav [data-page="contracts"]');
  await tap('[data-deploy="0"]');
  await tap('#modal-1');
  await tap('#modal-0');
  await reloadCareer(other);
  await other.locator('#brace').waitFor();
  await tap('#brace');
  await checkStale(other);
  const sortie=(await saved(page)).sortie;
  assert.equal(sortie.units[0].brace,true);
  await reloadCareer(other);
  await other.locator('#brace').waitFor();
  assert.deepEqual(await other.evaluate(()=>JSON.parse(JSON.stringify(captureSortie()))),sortie);
 }finally{await other.close()}
};
