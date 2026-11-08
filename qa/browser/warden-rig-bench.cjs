const assert=require('node:assert/strict');

module.exports=async function checkWardenRigBench({page,origin,tap}){
 const url=new URL('/rig-bench/',origin).href;
 await page.route(url,async route=>{
  const response=await route.fetch();
  const html=(await response.text()).replace('  const I=inst.gun; I.muzzle.getWorldPosition(tmp);',
   '  window.rigBenchShots=(window.rigBenchShots||0)+1; const I=inst.gun; I.muzzle.getWorldPosition(tmp);');
  await route.fulfill({response,body:html.replace('loadProductionAssets();',`
   window.benchState=()=>{
     const slots=Object.fromEntries(['gun','melee'].map(slot=>{
       const I=inst[slot],socket=weaponSocket(slot,rig);
       const center=slot==='gun'||I.def.id==='piledriver'?V3(0,-.075,.015):V3(0,0,0);
       const pos=socket.getWorldPosition(V3());
       return [slot,{id:I.def.id,parent:socket.parent.name,pos:pos.toArray(),gap:I.model.localToWorld(center).distanceTo(pos)}];
     }));
     return {root:rig.root.name,shots:window.rigBenchShots||0,ready:gun.state==='idle'&&rig.aim<.01,
       impact:melee.active&&melee.impactDone,walk:rig.walkTime,...slots};
   };
   loadProductionAssets();
  `)});
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body[data-rig-model=painted]');
 const snapshot=()=>page.evaluate(()=>window.benchState());
 const travel=(a,b)=>Math.hypot(...a.pos.map((value,i)=>value-b.pos[i]));
 function contact(state){
  assert.equal(state.root,'Painted_Warden');
  assert.equal(state.gun.parent,'Bench_Hand_R');
  assert.equal(state.melee.parent,'Bench_Hand_L');
  assert.ok(state.gun.gap<.001&&state.melee.gap<.001,JSON.stringify(state));
 }
 for(const id of ['kestrel','hailstorm','longbow']){
  await page.waitForFunction(()=>window.benchState().ready);
  const before=await snapshot();
  assert.equal(before.gun.id,id);
  await tap('#btnFire');
  await page.waitForFunction(shots=>window.benchState().shots>shots,before.shots);
  const during=await snapshot();
  contact(during);
  assert.ok(travel(before.gun,during.gun)>.025,id+' right hand moves to firing pose');
  await tap('#gunNext');
 }
 for(const id of ['breaker','cleaver','piledriver']){
  const before=await snapshot();
  assert.equal(before.melee.id,id);
  await tap('#btnStrike');
  await page.waitForFunction(()=>window.benchState().impact);
  const during=await snapshot();
  contact(during);
  assert.ok(travel(before.melee,during.melee)>.035,'left hand moves to strike pose');
  await tap('#meleeNext');
 }
 await tap('#btnWalk');
 await page.waitForFunction(()=>window.benchState().walk>.1);
 contact(await snapshot());
 await tap('#btnRig');
 assert.equal(await page.locator('#btnRig').getAttribute('aria-pressed'),'true');
};
