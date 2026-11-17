const assert=require('node:assert/strict');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

module.exports=async function checkWardenRigBench({page,origin}){
 const requests=new Set();
 page.on('request',request=>requests.add(new URL(request.url()).pathname));
 await page.goto(new URL('rig-bench/',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__bench?.state?.model==='warden'&&__bench.state.loaded);
 const state=()=>page.evaluate(()=>__bench.state);
 for(const id of ['rifle','hailstorm','rail']){
  await page.locator('#bench-primary').selectOption(id);
  await page.waitForFunction(id=>__bench.state.mounts?.primary?.id===id,id);
  const before=await state();
  await page.locator('#bench-fire').click();
  await page.waitForFunction(shots=>__bench.state.shots>shots,before.shots);
  const after=await state();
  assert.ok(after.mounts.primary.seated&&distance(before.mounts.primary.point,after.mounts.primary.point)>.025,id+' visibly moves while firing');
 }
 for(const id of ['breaker','cleaver','piledriver']){
  await page.locator('#bench-melee').selectOption(id);
  await page.waitForFunction(id=>__bench.state.mounts?.melee?.id===id,id);
  const before=await state();
  await page.locator('#bench-strike').click();
  await page.waitForFunction(strikes=>__bench.state.strikes>strikes,before.strikes);
  const after=await state();
  assert.ok(after.mounts.melee.seated&&distance(before.mounts.melee.point,after.mounts.melee.point)>.035,id+' visibly moves at contact');
 }
 const before=await state();
 await page.locator('#bench-walk').click();
 await page.waitForFunction(before=>Math.abs(__bench.state.metrics.feet[0].ankle[2]-before)>.15,before.metrics.feet[0].ankle[2]);
 await page.locator('#bench-walk').click();
 await page.locator('#bench-rig').check();
 await page.waitForFunction(()=>Number.isFinite(__bench.state.rigLines)&&__bench.state.rigLines>=12);
 const specs=page.locator('details').filter({hasText:'Specs & metrics'}).locator('summary');
 await specs.click();assert.equal(await page.locator('#bench-metrics').isVisible(),false);
 await specs.click();assert.equal(await page.locator('#bench-metrics').isVisible(),true);
 await page.locator('#bench-sound').click();
 assert.equal(await page.locator('#bench-sound').getAttribute('aria-pressed'),'true');
 await page.locator('#bench-clip-source').selectOption('archive');
 await page.waitForFunction(()=>__bench.state.clipSource==='archive'&&__bench.state.clips.length===7);
 assert.ok(requests.has('/rig-bench/warden-painted.glb'));
 for(const asset of ['/rig-bench/rig-motion.js','/rig-bench/painted-warden.js','/rig-bench/warden-painted-motion.json',
  '/assets/warden-rig-loop.webp','/assets/warden-rifle-left.webp'])
  assert.ok(!requests.has(asset),'Bench still requested '+asset);
};
