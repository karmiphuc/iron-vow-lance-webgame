const ensureContractOffer=require('./contract-fixture.cjs');
const assert=require('node:assert/strict');

module.exports=async function checkHangar({context,page,mobile,origin,tap}){
 const nav=view=>tap('#nav [data-page="'+view+'"]');
 const baseUrl=new URL('?view=hangar',origin).href;
 const fit=selector=>page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1);
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('.ship-page').waitFor();
 await nav('hangar');
 assert.equal(await page.locator('.base-room').count(),4);
 assert.ok(await fit('.base-page'));
 assert.ok(await fit('#nav'));
 const tip=page.locator('[data-base-room="personnel"] .ship-next-title [data-help]');
 if(mobile){
  await tip.scrollIntoViewIfNeeded();
  const box=await tip.boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.locator('#game-help').waitFor({state:'visible'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else await tip.hover();
 assert.match(await page.locator('#game-help').innerText(),/without changing the lance/i);
 await tap('[data-hangar-deck="mechs"]');
 assert.equal(await page.locator('#hangar-reserves').count(),0,'No reserves control with empty Storage');
 await tap('#inspect');
 await page.locator('.unit-inspect').waitFor();
 await tap('[data-hangar-deck="base"]');
 await page.evaluate(()=>{save.credits=22000;save.rep=30;save.history=[{name:CONTRACTS[0].name,day:1,win:true,pay:1300}];hirePilot(3);persist();render()});
 await tap('[data-build-room="personnel"]');
 await nav('ship');
 await tap('[data-build-facility="office"]');
 await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
 assert.match(await page.locator('.base-queue h2').innerText(),/reserve academy/i);
 assert.ok(await page.locator('[data-build-room="recon"]').isDisabled());
 await ensureContractOffer(page,0);
 await nav('contracts');
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 await page.evaluate(()=>{for(const u of battle.units)if(u.team==='enemy'){u.alive=false;u.hp.body=0}finish(true)});
 assert.match(await page.locator('.modalbox').innerText(),/HANGAR FACILITY ONLINE[\s\S]*Reserve Academy/i);
 assert.match(await page.locator('.modalbox').innerText(),/SHIP UPGRADE ONLINE[\s\S]*Broker Uplink/i);
 await page.getByRole('button',{name:'HANGAR',exact:true}).last().click();
 await tap('[data-reserve-training="scout"]');
 await tap('[data-learn="scout-optics"]');
 await tap('#modal-0');
 assert.equal(await page.evaluate(()=>save.reservePilots.scout.training[0]),'scout-optics');
 assert.equal(await page.evaluate(()=>pilotId(pilotClass(0))),'rook');
 // Jump to the finished facilities to exercise the later services in the browser.
 await page.evaluate(()=>{
  save.hangar.levels={personnel:2,fabrication:2,recon:2};
  save.wounds={rook:2,scout:2};
  save.credits+=FRAMES[6].cost+FRAMES[7].cost;acquireHull(6);acquireHull(7);save.reserve[6].condition=30;
  save.dispatch={day:save.day,sizes:[1,2,3,2]};
  persist();render();
 });
 await tap('[data-pilot-treatment="scout"]');
 assert.ok(await page.locator('[data-pilot-treatment="rook"]').isDisabled());
 assert.equal(await page.evaluate(()=>woundDays('scout')),0);
 await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
 assert.ok(await page.locator('[data-pilot-treatment="rook"]').isDisabled());
 const beforeNavigation=await page.evaluate(()=>JSON.stringify({save,selected}));
 await tap('[data-hangar-deck="mechs"]');
 await tap('#hangar-reserves');
 assert.equal(await page.locator('[data-open-stored-hull]').count(),2);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'hangar-reserves','Dismissal returns focus to Reserves');
 if(mobile){
  await tap('#hangar-reserves');
  await tap('[data-open-stored-hull="7"]');
 }else{
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.openStoredHull),'6');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
 }
 assert.equal(await page.locator('[data-bay="storage"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.storedHullCard),'7','Focus lands on the exact stored hull');
 const visibleHeading=await page.locator('[data-stored-hull-card="7"] h3').evaluate(heading=>{
  const cardTitle=heading.getBoundingClientRect(),viewport=heading.closest('.page').getBoundingClientRect();
  return cardTitle.top>=viewport.top&&cardTitle.bottom<=viewport.bottom;
 });
 assert.ok(visibleHeading,'The focused hull name scrolls into view');
 assert.equal(await page.evaluate(()=>JSON.stringify({save,selected})),beforeNavigation,'Browsing a reserve never reassigns a seat or changes the career');
 await tap('[data-patch-storage="6"]');
 assert.equal(await page.evaluate(()=>save.reserve[6].condition),65);
 await ensureContractOffer(page,0);
 await nav('contracts');
 await tap('.contract-grid article:first-child .contract-intel summary');
 assert.equal(await page.locator('.contract-grid article:first-child .contract-intel li').count(),1);
 await tap('[data-rescan="0"]');
 assert.ok([2,3].includes(await page.evaluate(()=>save.dispatch.sizes[0])));
 assert.ok(await page.locator('[data-rescan="0"]').isDisabled(),'Only one local scan is available per company day');
 assert.equal(await page.locator('[data-rescan="1"]').count(),0,'Remote contracts cannot charge for a local survey');
 assert.ok(await page.locator('[data-world-offer]').count()>0,'Local board displays available offers');
 await tap('[data-deploy="0"]');
 assert.ok(await fit('.modalbox'));
 assert.equal(await page.locator('[data-sortie-seat][aria-pressed="true"]').count(),await page.evaluate(()=>save.dispatch.sizes[0]));
};
