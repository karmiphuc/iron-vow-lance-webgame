const assert=require('node:assert/strict');
const arrived=require('../fixtures/overworld-relay.json');
const restedArrival=require('../fixtures/overworld-transit-rest.json');

module.exports=async function checkOverworld({context,page,mobile,origin,tap}){
 const nav=view=>tap('#nav [data-page="'+view+'"]');
 const snapshot=()=>page.evaluate(async()=>{
  await pendingCareerWrite;
  return JSON.parse(localStorage.getItem(CAREER_STORAGE));
 });
 const amount=async selector=>Number((await page.locator(selector).innerText()).replace(/[^\d-]/g,''));
 const arrivalDay=async()=>page.locator('[data-chart-arrival]').evaluate(el=>Number(el.childNodes[0].textContent.match(/\d+/)?.[0]));
 const camera=()=>page.evaluate(()=>IronVowChart.snapshot());
 const cameraOnly=state=>({zoom:state.zoom,tilt:state.tilt,yaw:state.yaw,panX:state.panX,panZ:state.panZ});
 const noOverflow=async selector=>assert.ok(
  await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1),
  selector+' fits the viewport'
 );
 const forecast=async({cost,cash,day})=>{
  assert.equal(await amount('[data-chart-cost]'),cost,'forecast cost');
  assert.equal(await amount('[data-chart-cash]'),cash,'forecast cash on arrival');
  assert.equal(await arrivalDay(),day,'forecast arrival day');
 };
 const targetsAtLeast44=async selector=>{
  const controls=page.locator(selector),count=await controls.count();
  assert.ok(count>0,selector+' controls exist');
  for(let i=0;i<count;i++){
   const box=await controls.nth(i).boundingBox();
   assert.ok(box&&box.width>=44&&box.height>=44,selector+' control '+i+' is at least 44 by 44 CSS px: '+JSON.stringify(box));
  }
 };
 const checkChartLayout=async()=>{
  const layout=await page.evaluate(()=>{
   const rect=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};};
   return{chart:rect('#chart-viewport'),forecast:rect('.chart-forecast'),height:innerHeight,nav:rect('#nav')};
  });
  assert.ok(layout.chart&&layout.forecast&&layout.chart.height>120,'chart and forecast remain visible');
  assert.ok(Math.min(layout.chart.bottom,layout.forecast.top)-layout.chart.top>100,'chart remains visible above the forecast');
  assert.ok(layout.forecast.bottom<=layout.height+1,'forecast remains within the viewport');
  if(mobile&&layout.nav.top>layout.height/2)assert.ok(layout.forecast.bottom<=layout.nav.top+1,'forecast docks above the touch navigation');
 };
 const blankPinchPoints=async()=>page.evaluate(()=>{
  const host=document.querySelector('#chart-viewport'),rect=host.getBoundingClientRect();
  for(const [fx,fy] of [[.5,.55],[.3,.34],[.34,.72],[.66,.34],[.72,.7],[.18,.8],[.84,.4]]){
   const cx=rect.left+rect.width*fx,cy=rect.top+rect.height*fy;
   const a={x:cx-42,y:cy},b={x:cx+42,y:cy};
   const clear=point=>{
    const target=document.elementFromPoint(point.x,point.y);
    return target&&(target===host||host.contains(target))&&!target.closest('button,a,input,summary');
   };
   if(clear(a)&&clear(b))return{center:{x:cx,y:cy},a,b};
  }
  throw Error('No blank chart area is available for a touch gesture');
 });
 const assertNoTransitModal=async()=>assert.equal(await page.getByRole('dialog',{name:'CONFIRM TRANSIT'}).count(),0);

 if(mobile)await page.setViewportSize({width:320,height:735});
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-page="overworld"]').first().waitFor();
 await page.evaluate(async()=>{save.world=worldRules.createWorld(0,save.day);persist();await pendingCareerWrite});
 const initial=await page.evaluate(()=>({credits:save.credits,day:save.day,overworld:save.overworld,world:save.world}));
 assert.equal(initial.credits,4500);
 assert.equal(initial.day,1);
 assert.equal(initial.overworld?.port||'picket','picket');
 assert.equal(initial.world.seed,0);
 assert.equal(initial.world.day,1);
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),initial.world),true);

 // The deterministic local pool starts with template zero. A remote job is reached through the chart.
 await nav('contracts');
 await page.locator('[data-world-offer][data-deploy="0"]').waitFor();
 await tap('[data-world-offer][data-deploy="0"]');
 await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).waitFor();
 await noOverflow('.modalbox');
 await tap('#modal-0');
 await tap('.pagehead [data-page="overworld"]');
 await page.locator('#chart-viewport').waitFor();
 await page.locator('[data-overworld-port="relay"]').waitFor();
 await tap('[data-overworld-port="relay"]');
 assert.equal(await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).count(),0);
 assert.equal(await page.evaluate(()=>!!battle),false);
 let state=await snapshot();
 assert.equal(state.day,1);
 assert.equal(state.credits,4500);
 assert.equal(state.overworld?.port||'picket','picket');
 assert.deepEqual(state.world,initial.world,'opening the chart keeps the seeded world unchanged');
 await forecast({cost:510,cash:3990,day:2});
 await noOverflow('#ui');
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1,'chart uses the shared WebGL context');

 // Inline arming and cancellation retain the chart and leave the save untouched.
 const beforeRelayConfirm=JSON.stringify(state);
 await tap('[data-overworld-travel]');
 await page.locator('[data-overworld-confirm]').waitFor();
 await assertNoTransitModal();
 assert.ok(await page.locator('#chart-viewport').isVisible(),'chart remains visible while confirming');
 assert.deepEqual(await snapshot(),JSON.parse(beforeRelayConfirm));
 await tap('[data-overworld-cancel]');
 await assertNoTransitModal();
 assert.deepEqual(await snapshot(),JSON.parse(beforeRelayConfirm),'cancel leaves the career untouched');
 await tap('[data-overworld-travel]');
 await tap('[data-overworld-confirm]');
 await page.waitForFunction(()=>save.overworld?.port==='relay');
 assert.ok(await page.locator('#chart-viewport').isVisible(),'chart remains visible during departure');
 await assertNoTransitModal();
 state=await snapshot();
 assert.equal(state.day,2);
 assert.equal(state.credits,3990);
 const {world:relayWorld,...relayLegacyFields}=state;
 assert.deepEqual(relayLegacyFields,arrived,'one-hop Relay travel keeps its existing career fields');
 assert.deepEqual(relayWorld,await page.evaluate(()=>worldRules.createWorld(0,2)),'travel advances the seeded world by one day');
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),relayWorld),true);
 const relayArrival=JSON.parse(JSON.stringify(state));
 assert.equal(state.overworld.lastExpense.total,510);
 assert.equal(state.overworld.lastExpense.days,1);
 assert.equal(state.overworld.lastExpense.fuel,120);
 assert.equal(await page.evaluate(()=>!!battle),false);
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);

 // The arrival is durable. The selected port card opens its local contract board.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 state=await snapshot();
 assert.deepEqual(state,relayArrival,'the Relay arrival including its world reloads exactly');
 assert.match(await page.locator('#ui').innerText(),/relay/i);
 await tap('[data-page="overworld"]');
 await page.locator('#chart-viewport').waitFor();
 await tap('[data-chart-contracts="relay"]');
 await page.locator('.contract-grid').waitFor();
 const relayOffer=await page.evaluate(()=>availableOffers('relay').find(offer=>offer.templateIndex===1));
 assert(relayOffer,'seed zero posts the template-one Relay offer on day two');
 await tap(`[data-world-offer="${relayOffer.id}"]`);
 await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).waitFor();
 await tap('#modal-1');
 await tap('#modal-0');
 await tap('#withdraw');
 await tap('#modal-1');
 const debrief=page.getByRole('dialog',{name:'LANCE EXTRACTED.'});
 assert.match(await debrief.innerText(),/CREW WAGES[\s\S]*210 CR[\s\S]*SHIP UPKEEP[\s\S]*75 CR[\s\S]*HULL UPKEEP[\s\S]*105 CR/);
 const afterWithdrawal=await snapshot();
 assert.equal(afterWithdrawal.day,3);
 assert.equal(afterWithdrawal.credits,3600);
 assert.equal(afterWithdrawal.overworld.lastExpense.kind,'sortie');
 assert.equal(afterWithdrawal.overworld.lastExpense.paid,390);
 assert.equal(afterWithdrawal.overworld.port,'relay');
 assert.equal(afterWithdrawal.world.day,3);
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),afterWithdrawal.world),true);
 assert(afterWithdrawal.world.consumed.includes(relayOffer.id),'the accepted Relay offer stays consumed after withdrawal');
 assert.equal(afterWithdrawal.history.at(-1).offerId,relayOffer.id);
 assert.equal(afterWithdrawal.history.at(-1).port,'relay');
 await tap('#modal-0');

 // Reset to a fresh company for the Vanta choice and arrival-readiness forecast.
 await page.evaluate(async()=>{
  save=fresh();save.world=worldRules.createWorld(0,save.day);overworldSelection=null;persist();await pendingCareerWrite;showOverworld('picket');
 });
 await page.locator('#chart-viewport').waitFor();
 await tap('[data-overworld-port="corridor"]');
 await page.locator('[data-overworld-route-option="picket>corridor"]').waitFor();
 assert.deepEqual(await page.locator('[data-overworld-route-option]').evaluateAll(nodes=>nodes.map(node=>node.dataset.overworldRouteOption)),
  ['picket>corridor','picket>relay>corridor'],'express appears before the Relay stopover');
 const freshSnapshot=await snapshot();
 await forecast({cost:1240,cash:3260,day:2});
 await tap('[data-overworld-route-option="picket>relay>corridor"]');
 await forecast({cost:1080,cash:3420,day:3});
 assert.deepEqual(await snapshot(),freshSnapshot,'selecting route alternatives does not mutate the career');

 // Confirm the bottom strip stays docked on iPad portrait and landscape, with large touch targets.
 await page.setViewportSize({width:1024,height:1366});
 await checkChartLayout();
 await page.setViewportSize({width:1366,height:1024});
 await checkChartLayout();
 await targetsAtLeast44('[data-overworld-port]');
 await targetsAtLeast44('[data-overworld-route-option]');
 await targetsAtLeast44('[data-overworld-travel]');
 await targetsAtLeast44('[data-chart-reset]');
 await targetsAtLeast44('.chart-detail summary');

 // Keyboard pan and the visible Recenter control restore the exact default camera.
 await page.locator('#chart-viewport').focus();
 const careerBeforeCamera=await snapshot(),cameraBefore=cameraOnly(await camera());
 await page.keyboard.press('ArrowRight');
 const panned=cameraOnly(await camera());
 assert.ok(panned.panX!==cameraBefore.panX,'keyboard pans the chart');
 assert.deepEqual(await snapshot(),careerBeforeCamera,'keyboard movement leaves career data unchanged');
 await tap('[data-chart-reset]');
 assert.deepEqual(cameraOnly(await camera()),{zoom:1,tilt:.8,yaw:-.04,panX:0,panZ:0},'Recenter restores the chart camera');
 assert.deepEqual(await snapshot(),careerBeforeCamera,'recentering leaves career data unchanged');

 // A two-finger pinch and twist change bounded camera values without touching the career.
 if(mobile){
  const points=await blankPinchPoints(),cdp=await context.newCDPSession(page);
  const touch=(point,id)=>({id,x:Math.round(point.x),y:Math.round(point.y),radiusX:3,radiusY:3,force:1});
  const angle=Math.PI*50/180,radius=60,{x:cx,y:cy}=points.center;
  const movedA={x:cx-radius*Math.cos(angle),y:cy-radius*Math.sin(angle)};
  const movedB={x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle)};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(points.a,1),touch(points.b,2)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(movedA,1),touch(movedB,2)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
  const twisted=cameraOnly(await camera());
  assert.ok(twisted.zoom>1&&twisted.zoom<=1.65,'pinch zoom stays within its bounds: '+JSON.stringify(twisted));
  assert.ok(twisted.tilt>.8&&twisted.tilt<=1.1,'twist tilt stays within its bounds: '+JSON.stringify(twisted));
  assert.deepEqual(await snapshot(),careerBeforeCamera,'pinch and twist leave career data unchanged');
  await tap('[data-chart-reset]');
  assert.deepEqual(cameraOnly(await camera()),{zoom:1,tilt:.8,yaw:-.04,panX:0,panZ:0});
 }

 // Add a damaged lance and service decks. Forecasted restoration must match the saved arrival.
 await page.evaluate(async()=>{
  save.ship={levels:{repair:1,crew:1}};
  save.units[0].condition=25;save.units[1].condition=95;save.units[2].condition=30;
  save.owned.push('blade');
  save.reserve={'6':{weapon:'rifle',melee:'blade',condition:40,upgrade:0}};
  save.wounds={rook:2,ghost:1};persist();await pendingCareerWrite;render();
 });
 await tap('[data-overworld-route-option="picket>relay>corridor"]');
 await forecast({cost:1190,cash:3310,day:3});
 const beforeRestTravel=await snapshot();
 assert.deepEqual(await snapshot(),beforeRestTravel,'readiness forecast does not mutate the career');
 await tap('.chart-lance-detail summary');
 const readiness=await page.locator('.chart-lance-detail .chart-detail-card').innerText();
 assert.match(readiness,/49%[\s\S]*\+24 serviced/);
 assert.match(readiness,/100%/);
 assert.doesNotMatch(readiness,/Wounded/,'two travel days restore the wounded pilots');
 await tap('[data-overworld-travel]');
 await page.locator('[data-overworld-confirm]').waitFor();
 await assertNoTransitModal();
 assert.ok(await page.locator('#chart-viewport').isVisible());
 assert.deepEqual(await snapshot(),beforeRestTravel,'inline confirmation is still only a preview');
 await tap('[data-overworld-cancel]');
 assert.deepEqual(await snapshot(),beforeRestTravel,'cancel does not service hulls or heal wounds');
 await tap('[data-overworld-travel]');
 await tap('[data-overworld-confirm]');
 await page.waitForFunction(()=>save.overworld?.port==='corridor');
 state=await snapshot();
 const {world:restedWorld,...restedLegacyFields}=state;
 assert.deepEqual(restedLegacyFields,restedArrival,'two-day transit preserves the existing rest and expense values');
 assert.deepEqual(restedWorld,await page.evaluate(()=>worldRules.createWorld(0,3)),'successful two-day travel advances the world exactly once');
 assert.equal(await page.evaluate(world=>window.IronVowWorld.validWorld(world),restedWorld),true);
 const restedWorldArrival=JSON.parse(JSON.stringify(state));
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1,'chart and hangar share one WebGL context');

 // Reopening validates the new fixture through the normal career migration path.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 assert.deepEqual(await snapshot(),restedWorldArrival,'the serviced arrival and world reload exactly');
 await tap('[data-page="overworld"]');
 await page.locator('#chart-viewport').waitFor();
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
};
