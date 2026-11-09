const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkAero({page,mobile,origin,tap}){
 const ids=['cleaver','breaker','piledriver','blade'];
 await page.goto(new URL('rig-bench/aero.html',origin).href,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#weapons button').count(),4);
 for(const id of ids){
  await tap(`[data-weapon="${id}"]`);
  await page.waitForFunction(()=>!document.querySelector('#time').disabled);
  await page.locator('#time').fill('680');
  const view=await page.evaluate(()=>{
   const canvas=document.querySelector('#motion'),g=canvas.getContext('2d');
   return{index:Number(canvas.dataset.frame),pixels:g.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v===255)};
  });
  assert.ok(view.index>=10&&view.index<=17&&view.pixels);
 }

 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 const card=page.locator('.bay-card').filter({has:page.getByRole('heading',{name:'AERO',exact:true})});
 assert.match(await card.innerText(),/400,000 CR/);
 assert.match(await card.innerText(),/15% per incoming round or shell/);
 assert.ok(await page.locator('.bay-card').filter({hasText:'8% per incoming round or shell'}).count()>0);
 assert.equal(await card.getByRole('button').isDisabled(),true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>.5});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="1"]');
 await tap('#modal-1');
 await tap('#modal-0');
 for(const [index,id] of ids.entries()){
  if(index)await page.evaluate(day=>{battle=null;save.day=day;deploy(1,false,[0,1]);closeModal()},index+1);
  const setup=await page.evaluate(async()=>{
   const actor=battle.units.find(u=>u.frame===AERO_FRAME),target=current();
   await Promise.all(preloadNativeMotion(actor.frame,actor.paint,actor).map(im=>im.decode()));
   for(const u of battle.units)if(u!==actor&&u!==target){u.alive=false;u.hp.body=0}
   battle.cover.clear();
   Object.assign(actor,{x:7,z:11,vx:7,vz:11});
   Object.assign(target,{x:7,z:15,vx:7,vz:15});
   Math.random=()=>0;
   return {weapon:actor.melee,range:distance(actor,target),body:target.hp.body,paint:actor.paint};
  });
  assert.equal(setup.weapon,id);
  assert.equal(setup.paint,null,'uses the authored scout livery');
  assert.equal(setup.range,4);
  await tap('#end');
  await page.waitForFunction(id=>activeCinematic?.actor.frame===AERO_FRAME&&
   activeCinematic.actor.attack?.kind===id&&!Number.isFinite(activeCinematic.actor.attack?.fireAt),id);
  const windup=await page.evaluate(()=>{
   const actor=activeCinematic.actor,profile=attackProfile(actor,actor.attack.kind);
   return foundryRender(actor,actor.attack.start+profile.raise*.65).anchors.meleeTip;
  });
  await page.waitForFunction(id=>activeCinematic?.actor.frame===AERO_FRAME&&
   activeCinematic.actor.attack?.kind===id&&Number.isFinite(activeCinematic.actor.attack?.releaseAt),id);
  const impact=await page.evaluate(()=>{
   const actor=activeCinematic.actor,contact=actor.attack.releaseAt,view=foundryRender(actor,contact);
   const level=window.IRON_VOW_AERO_ART.strikes[actor.attack.kind].levels[view.index];
   return {range:distance(actor,activeCinematic.target),level,secondary:view.secondary,
    tip:view.anchors.meleeTip,body:activeCinematic.target.hp.body};
  });
  assert.equal(impact.range,1);
  assert.equal(impact.level,.70);
  assert.ok(impact.secondary&&Math.hypot(...impact.tip.map((v,i)=>v-windup[i]))>.08);
  assert.ok(impact.body<setup.body,id+' applies damage on contact');
  if(process.env.IRON_VOW_AERO_PROOF){
   await page.screenshot({path:join(process.env.IRON_VOW_AERO_PROOF,`aero-${id}-${mobile?'touch':'desktop'}.png`)});
  }
  await page.waitForFunction(()=>battle?.turn===2&&!battle.busy);
 }
 await page.evaluate(()=>{
  battle=null;effects=[];page='workshop';workshopView='market';save.credits=400000;render();
 });
 const frame=await page.evaluate(()=>AERO_FRAME);
 await tap(`[data-buy-hull="${frame}"]`);
 assert.equal(await page.evaluate(()=>save.credits===0&&Boolean(save.reserve[AERO_FRAME])),true);
 if(await page.locator(`[data-chassis="${frame}"]`).count()===0)await tap('[data-bay="storage"]');
 await tap(`[data-chassis="${frame}"]`);
 assert.equal(await page.evaluate(()=>pilotFrame(0)===AERO_FRAME),true);
 await page.evaluate(()=>{save.dispatch={day:save.day,sizes:[1,2,2,3]};Math.random=()=>0});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 if(await page.locator('#modal-0').isVisible())await tap('#modal-0');
 await page.waitForFunction(()=>battle?.phase==='player'&&current()?.frame===AERO_FRAME&&document.querySelector('#modal').hidden);
 const start=await page.evaluate(()=>{
  battle.field.cover={...battle.field.cover,'2,16':'ridge-rock'};
  battle.cover.add('2,16');
  return {ap:current().ap,move:freeMovement(current())};
 });
 await tap('#jumpjet');
 const landing=await page.evaluate(()=>{
  setFieldProjection();
  return project(4,0,16);
 });
 if(mobile)await page.touchscreen.tap(landing.x,landing.y);
 else await page.mouse.click(landing.x,landing.y);
 await page.waitForFunction(()=>!battle.busy&&current().jumpjetUsed&&current().x===4);
 assert.deepEqual(await page.evaluate(()=>[current().ap,freeMovement(current())]),[start.ap-2,start.move]);
 assert.equal(await page.locator('#jumpjet').isDisabled(),true);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('iron-vow-career')).sortie.units[0].jumpjetUsed===true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>current()?.jumpjetUsed&&current().x===4);
 assert.equal(await page.locator('#jumpjet').isDisabled(),true);
 const hp=await page.evaluate(()=>{
  const aero=current(),foe=battle.units.find(u=>u.team==='enemy');
  battle.cover.clear();
  Object.assign(foe,{x:aero.x,z:aero.z-1,vx:aero.x,vz:aero.z-1});
  Math.random=()=>.9;
  return aero.hp.body;
 });
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy);
 assert.equal(await page.evaluate(before=>current().hp.body===before&&battle.log.some(line=>line.includes('dodged')),hp),true);
 console.log('PASS Aero purchase and assignment, Jumpjet across cover and reload, four Rig Bench replays and Relay melee exchanges');
};
