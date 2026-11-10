const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkLineInfantry({page,mobile,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'LINE INFANTRY',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>0});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 await tap('#modal-0');
 assert.equal(await page.evaluate(()=>battle.contract.id),'picket');
 const atlases=await page.evaluate(async()=>{
  const unit=battle.units.find(u=>u.frame===LINE_INFANTRY_FRAME);
  const armed=motionImages['foundry-6-motion'],unarmed=motionImages['foundry-6-unarmed'];
  await Promise.all([armed,unarmed,moduleImage('foundry-6-motion-paint'),moduleImage('foundry-6-unarmed-paint')].map(im=>im.decode()));
  const view=foundryRender(unit,clock);
  const armHP=unit.hp.right;
  unit.hp.right=0;
  const disabled=foundryRender(unit,clock).surface===foundryPaint(unarmed,'foundry-6-unarmed',unit.paint,unit.trim,true);
  unit.hp.right=armHP;
  return {name:unit.name,painted:view.surface!==armed,livery:HOSTILE_LIVERIES.some(([p,s])=>unit.paint===p&&unit.trim.s===s),armed:armed.naturalWidth,unarmed:unarmed.naturalWidth,primary:view.primary,
   muzzle:view.anchors.muzzle,disabled};
 });
 assert.equal(atlases.name,'LINE INFANTRY 1');
 assert.equal(atlases.livery,true);
 assert.equal(atlases.painted,true);
 assert.equal(atlases.armed,1280);
 assert.equal(atlases.unarmed,1280);
 assert.equal(atlases.disabled,true);
 assert.equal(atlases.primary,true);
 assert.ok(atlases.muzzle.every(Number.isFinite));
 await tap('#end');
 await page.waitForFunction(()=>activeCinematic?.actor.frame===LINE_INFANTRY_FRAME&&activeCinematic.phase==='fire');
 if(process.env.IRON_VOW_LI01_PROOF){
  await page.screenshot({path:join(process.env.IRON_VOW_LI01_PROOF,mobile?'picket-r32-touch.png':'picket-r32-desktop.png')});
 }
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy);
 const result=await page.evaluate(()=>({log:battle.log.find(line=>line.startsWith('LINE INFANTRY 1 → WARDEN')),
  damaged:targetParts(current()).some(part=>current().hp[part]<current().max[part])}));
 assert.ok(result.log&&result.damaged);
 console.log('PASS Picket hostile phase '+result.log);
};
