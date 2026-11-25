const assert=require('node:assert/strict');

module.exports=async function checkOverworldPortEvents({page,mobile,origin,tap}){
 if(mobile)await page.setViewportSize({width:390,height:844});
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 await page.evaluate(async()=>{
  save=fresh();save.world=worldRules.createWorld(2,save.day);save.credits=100000;
  save.ship={levels:{repair:1}};save.units[0].condition=50;persist();await pendingCareerWrite;
  showOverworld('picket');
 });
 await page.locator('#chart-viewport').waitFor();

 // The service sheet repairs the current hull and purchases only local stock.
 await tap('[data-port-services="picket"]');
 await page.getByRole('dialog').filter({has:page.locator('[data-port-repair]')}).waitFor();
 const repairCost=await page.evaluate(()=>portRepairCost('active:0','picket'));
 const beforeRepair=await page.evaluate(()=>save.credits);
 assert.equal(await page.locator('[data-port-repair]').isDisabled(),false);
 await tap('[data-port-repair]');
 await page.waitForFunction(()=>save.units[0].condition===100);
 assert.equal(await page.evaluate(()=>save.credits),beforeRepair-repairCost,'local repair charges its quoted price once');
 await tap('[data-port-tab="market"]');
 const weaponPrice=await page.evaluate(()=>portServicesData('picket').items.find(item=>item.id==='sidewinder').price);
 const beforeBuy=await page.evaluate(()=>save.credits);
 const buySidewinder='[data-port-buy-weapon="sidewinder"]';
 const sidewinderRow=page.locator('li').filter({has:page.locator(buySidewinder)});
 assert.equal(await sidewinderRow.getAttribute('data-stock-state'),'available');
 const availableBackground=await sidewinderRow.evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.evaluate(()=>{save.credits=0;render()});
 assert.equal(await sidewinderRow.getAttribute('data-stock-state'),'unavailable');
 assert.equal(await page.locator(buySidewinder).isDisabled(),true);
 assert.match(await sidewinderRow.innerText(),/Insufficient credits/);
 assert.notEqual(await sidewinderRow.evaluate(el=>getComputedStyle(el).backgroundColor),availableBackground);
 await page.evaluate(credits=>{save.credits=credits;render()},beforeBuy);
 assert.equal(await page.evaluate(()=>save.owned.filter(id=>id==='sidewinder').length),0);
 for(const count of [1,2]){
  assert.equal(await page.locator(buySidewinder).isEnabled(),true,'the market offers another physical copy');
  await tap(buySidewinder);
  await page.waitForFunction(count=>save.owned.filter(id=>id==='sidewinder').length===count,count);
  assert.equal(await page.evaluate(()=>save.credits),beforeBuy-count*weaponPrice,'each purchase charges the displayed price once');
  assert.match(await page.locator('li').filter({has:page.locator(buySidewinder)}).innerText(),new RegExp('\\b'+count+' owned\\b'));
 }
 await tap('[data-port-close]');

 // Departure remains an inline confirmation while the chart stays visible.
 const creditsBeforeTravel=await page.evaluate(()=>save.credits),dayBeforeTravel=await page.evaluate(()=>save.day);
 await tap('[data-overworld-port="ridge"]');
 await page.locator('[data-overworld-travel]').waitFor();
 const routeCost=await page.evaluate(()=>window.IronVowOverworld.itineraryQuote(['picket','ridge'],window.IronVowOverworld.operatingRates(save),save.credits,save.overworld?.arrears??0,careerNetwork()).total);
 assert.equal(await page.locator('[data-chart-cost]').innerText(),`${routeCost.toLocaleString('en-US')} CR`,'the chart displays the calculated route total');
 await tap('[data-overworld-travel]');
 await page.locator('[data-overworld-confirm]').waitFor();
 assert.equal(await page.locator('#chart-viewport').isVisible(),true);
 assert.equal(await page.getByRole('dialog',{name:'CONFIRM TRANSIT'}).count(),0);
 await tap('[data-overworld-confirm]');
 await page.locator('[data-transit-choice="pay"]').waitFor();
 await page.evaluate(async()=>{await pendingCareerWrite});
 const pending=await page.evaluate(()=>JSON.parse(JSON.stringify(save)));
 assert.equal(pending.transit.arrivalDay,dayBeforeTravel+1);
 assert.deepEqual(pending.transit.choices,{});
 assert.equal(pending.credits,creditsBeforeTravel-routeCost);
 const eventId=pending.world.pendingEvents[0];

 // A reload resumes the same report and permits exactly one choice.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#chart-viewport').waitFor();
 await page.locator(`[data-transit-choice="pay"][data-event-id="${eventId}"]`).waitFor();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(save))),pending,'reload restores the pending crossing exactly');
 await tap(`[data-transit-choice="pay"][data-event-id="${eventId}"]`);
 await page.waitForFunction(()=>save.transit===undefined);
 const paid=await page.evaluate(()=>JSON.parse(JSON.stringify(save)));
 assert.equal(paid.day,pending.day,'a toll choice does not add a travel day');
 assert.equal(paid.credits,pending.credits-200,'the selected toll is charged once');
 assert.equal(paid.world.standings.ridge,1,'the resolved event records its standing effect');
 assert.equal(paid.world.pendingEvents.includes(eventId),false,'the selected incident leaves the pending queue');
 assert.equal(await page.evaluate(id=>resolveTransitEvent(id,'pay'),eventId),false,'the UI cannot replay a resolved report');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(save))),paid,'replay leaves the saved career unchanged');
 assert.equal(await page.evaluate(()=>validSave(save)),true);
};
