const assert=require('node:assert/strict');
const navigate=require('./navigate.cjs');
const selectContract=require('./select-contract.cjs');

module.exports=async function checkRegionalFrames({page,mobile,origin,tap}){
 for(const [frame,port,mission] of [[24,'ridge','whiteout-patrol'],[25,'corridor','kiln-nine'],[26,'frontier','broken-grid']]){
  await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof save==='object'&&save);
  // Place a funded company at each seller, then use the retail and deployment controls.
  await page.evaluate(async port=>{
   battle=null;save=fresh();save.credits=400000;save.world=worldRules.createWorld(42,1);
   save.overworld={port,arrears:0};persist();await pendingCareerWrite;showOverworld(port);
  },port);
  await tap(`[data-port-services="${port}"]`);
  await tap('[data-port-tab="market"]');
  await tap(`[data-port-buy-frame="${frame}"]`);
  await page.waitForFunction(frame=>!!save.reserve?.[frame],frame);
  await tap('[data-port-close]');
  await navigate(page,'workshop',tap,mobile);
  await tap('[data-workshop-detail="compare"] > summary');
  await tap('[data-bay="storage"]');
  await tap(`[data-chassis="${frame}"]`);
  await page.waitForFunction(frame=>pilotFrame(0)===frame,frame);
  await navigate(page,'contracts',tap,mobile);
  const offer=await page.evaluate(({port,mission})=>availableOffers(port).find(o=>CONTRACTS[o.templateIndex].id===mission).id,{port,mission});
  await selectContract(page,{id:offer});
  await tap(`[data-world-offer="${offer}"]`);
  await tap('#modal-1');
  const waitForRigs=()=>page.waitForFunction(({frame,mission})=>{
   if(battle?.contract.id!==mission||!IronVowScene.ready)return false;
   return ['ally','enemy'].every(team=>battle.units.some(u=>u.team===team&&u.frame===frame&&IronVowScene.models.get(u.id)?.entry?.m.campaignRig));
  },{frame,mission},{timeout:90000});
  await waitForRigs();
  await page.evaluate(()=>pendingCareerWrite);
  await page.reload({waitUntil:'domcontentloaded'});
  await waitForRigs();
  assert.equal(await page.evaluate(()=>battle.offer.id),offer);
 }
};
