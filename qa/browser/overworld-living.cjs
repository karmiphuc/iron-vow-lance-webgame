const navigate=require('./navigate.cjs');
const selectContract=require('./select-contract.cjs');
const assert=require('node:assert/strict');

module.exports=async function checkOverworldLiving({page,mobile,origin,tap}){
 if(mobile)await page.setViewportSize({width:320,height:735});
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('#nav [data-primary="bridge"]').waitFor();
 await page.evaluate(async()=>{
  save.world=worldRules.createWorld(0,save.day);
  save.ship={levels:{office:2}};
  persist();await pendingCareerWrite;
 });
 await navigate(page,'overworld',tap,mobile);
 await page.locator('#chart-viewport').waitFor();
 await page.waitForFunction(()=>IronVowChart.snapshot().ready&&IronVowChart.snapshot().portCount===6);

 const assertMastLayout=async(label)=>{
  await page.waitForTimeout(120);
  const layout=await page.locator('[data-overworld-port]').evaluateAll(nodes=>nodes.map(node=>{
   const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
   return{id:node.dataset.overworldPort,visible:style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0,
    left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};
  }));
  assert.equal(layout.length,6,label+' renders all six port controls');
  const visible=layout.filter(port=>port.visible),overlaps=[];
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i],b=visible[j],width=Math.min(a.right,b.right)-Math.max(a.left,b.left),height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
   if(width>1&&height>1)overlaps.push([a.id,b.id,width,height]);
  }
  assert.deepEqual(overlaps,[],label+' has no overlapping visible mast controls');
 };
 const checkSensor=async()=>{
  const expected=await page.evaluate(()=>4.5+shipLevel('office')*2.5),actual=(await page.evaluate(()=>IronVowChart.snapshot())).sensorRange;
  assert.equal(expected,9.5,'the test career has the Office Deck at tier two');
  assert.equal(actual,expected,'the chart draws the coverage radius for the current mooring and deck');
 };

 assert.equal(await page.locator('[data-overworld-port]').count(),6,'all six moorings have chart controls');
 await page.setViewportSize({width:320,height:735});
 await assertMastLayout('phone chart');
 await page.setViewportSize({width:1024,height:1366});
 await assertMastLayout('iPad portrait chart');
 await page.setViewportSize({width:1366,height:1024});
 await assertMastLayout('iPad landscape chart');
 await checkSensor();

 const beforeHold=await page.evaluate(()=>({day:save.day,credits:save.credits,cost:window.IronVowOverworld.operatingRates(save).total,world:save.world}));
 const markersBefore=await page.evaluate(()=>IronVowChart.snapshot().markers);
 assert(markersBefore.length>0,'the current sensor radius reveals at least one route marker before holding');
 await tap('[data-chart-hold]');
 await page.locator('[data-overworld-confirm]').waitFor();
 await tap('[data-overworld-confirm]');
 await page.waitForFunction(day=>save.day===day+1,beforeHold.day);
 await page.waitForFunction(()=>IronVowChart.snapshot().markers.some(marker=>marker.day===save.day));
 const afterHold=await page.evaluate(()=>({day:save.day,credits:save.credits,world:save.world}));
 assert.equal(afterHold.day,beforeHold.day+1);
 assert.equal(afterHold.world.day,afterHold.day,'a paid hold advances world and career time together');
 assert.equal(afterHold.credits,beforeHold.credits-beforeHold.cost,'holding settles one daily operating cost');
 const markersAfter=await page.evaluate(()=>IronVowChart.snapshot().markers);
 const moved=markersBefore.some(before=>{
  const after=markersAfter.find(marker=>marker.id===before.id);
  return after&&(Math.hypot(after.x-before.x,after.z-before.z)>.001||after.from!==before.from||after.to!==before.to);
 });
 assert(moved,'visible route markers move after the paid hold advances the day');
 await checkSensor();
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),afterHold.world),true);

 await tap('[data-chart-contracts="picket"]');
 await page.locator('.contract-grid').waitFor();
 const scoutOffer=await page.evaluate(()=>availableOffers('picket').find(offer=>offer.availableOnArrival));
 assert(scoutOffer,'the opening offer remains available at the current port');
 const scoutCredits=afterHold.credits;
 await selectContract(page,{id:scoutOffer.id});await tap(`[data-scout-offer="${scoutOffer.id}"]`);
 await page.waitForFunction(({id,credits})=>save.world.scouted.includes(id)&&save.credits===credits-90,{id:scoutOffer.id,credits:scoutCredits});
 assert.equal(await page.locator(`[data-scout-offer="${scoutOffer.id}"]`).count(),0,'successful scouting removes its paid action');
 assert.equal(await page.locator('.offer-intel').count(),1,'the local contact report appears');
 const contactControl=await page.locator('.offer-intel .contract-intel summary').boundingBox();
 assert(contactControl&&contactControl.height>=44&&contactControl.width>=44,'the restored contact disclosure meets the 44-pixel touch target');
 assert(await page.locator('.offer-intel .contract-intel li').count()>0,'paid scouting reveals actual hostile names');
 const scouted=await page.evaluate(async()=>{await pendingCareerWrite;return JSON.parse(JSON.stringify(save));});

 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 await navigate(page,'overworld',tap,mobile);
 await page.locator('#chart-viewport').waitFor();
 await page.waitForFunction(()=>IronVowChart.snapshot().ready);
 await tap('[data-chart-contracts="picket"]');
 await page.locator('.contract-grid').waitFor();
 const restoredOffer=await page.evaluate(id=>availableOffers('picket').find(offer=>offer.id===id),scoutOffer.id);
 assert(restoredOffer?.scouted,'scouted intel survives reload');
 assert.equal(await page.evaluate(()=>save.credits),scouted.credits,'reload preserves the single scout charge');
 const duplicateScout=await page.evaluate(id=>scoutWorldOffer(id),scoutOffer.id);
 assert.equal(duplicateScout,false,'scouting the same offer again is rejected');
 assert.equal(await page.evaluate(()=>save.credits),scouted.credits,'a duplicate scout cannot charge again');

 await selectContract(page,{id:scoutOffer.id});await tap(`[data-world-offer="${scoutOffer.id}"]`);
 await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).waitFor();
 await tap('#modal-1');
 await page.waitForFunction(id=>save.sortie?.offer?.id===id,scoutOffer.id);
 const checkpoint=await page.evaluate(async()=>{await pendingCareerWrite;return JSON.parse(JSON.stringify(save));});
 assert(checkpoint.world.consumed.includes(scoutOffer.id),'deployment consumes the accepted offer');
 assert.equal(checkpoint.sortie.offer.acceptedDay,checkpoint.day);
 const checkpointWorld=checkpoint.world;

 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(id=>battle?.offer?.id===id,scoutOffer.id);
 assert.equal(await page.evaluate(()=>Object.isFrozen(battle.offer)),true,'the accepted terms restore as a snapshot');
 const payout=await page.evaluate(()=>({credits:save.credits,reward:worldContractPay(battle.contract,battle.slots.length,battle.offer)+(regionalReward(battle.offer,battle.offer.acceptedDay)?.available?regionalReward(battle.offer,battle.offer.acceptedDay).credits??0:0),cost:window.IronVowOverworld.operatingRates(save).total}));
 assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(save.world))),checkpointWorld,'the consumed offer remains stable in the active checkpoint');
 await page.evaluate(async()=>{finish(true);closeModal();await pendingCareerWrite});
 await page.waitForFunction(id=>save.history.at(-1)?.offerId===id&&save.day===3,scoutOffer.id);
 const paid=await page.evaluate(async()=>{await pendingCareerWrite;return JSON.parse(JSON.stringify(save));});
 assert.equal(paid.history.at(-1).port,'picket');
 assert.equal(paid.history.at(-1).pay,payout.reward,'the saved offer terms determine payout after reload');
 assert.equal(paid.credits,payout.credits+payout.reward-payout.cost,'the accepted offer pays once before daily costs');
 assert.equal(paid.world.day,paid.day);
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),paid.world),true);

 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 const reloadedPaid=await page.evaluate(()=>JSON.parse(JSON.stringify(save)));
 assert.equal(await page.evaluate(()=>Boolean(battle)),false,'a finished sortie is not restored');
 assert.equal(reloadedPaid.credits,paid.credits,'a completed payout is not credited a second time');
 assert.deepEqual(reloadedPaid.history,paid.history);
};
