const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkBulwarkCombat({page,mobile,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'BULWARK-AEGIS',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{save.dispatch={day:save.day,sizes:[1,1,2,3]};Math.random=()=>0});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="3"]');
 await tap('#modal-1');
 await tap('#modal-0');
 const setup=await page.evaluate(async()=>{
  const u=battle.units.find(u=>u.frame===BULWARK_FRAME),a=current();
  const atlas=window.IRON_VOW_FOUNDRY_ART[10],images=atlas.variants.map(key=>motionImages[key]);
  await Promise.all(images.map(image=>image.decode()));
  const frames=[foundryRender(u,clock)],hp={...u.hp};
  u.hp.right=0;frames.push(foundryRender(u,clock));
  u.hp.right=hp.right;u.hp.left=0;frames.push(foundryRender(u,clock));
  u.hp.right=0;frames.push(foundryRender(u,clock));
  u.hp=hp;
  battle.cover.clear();
  for(const other of battle.units)if(other!==u&&other!==a){other.alive=false;other.hp.body=0}
  Object.assign(u,{x:7,z:11,vx:7,vz:11});
  Object.assign(a,{x:7,z:15,vx:7,vz:15});
  window.aegisTrace=[];
  const trace=()=>{
   const hit=u.attack,sequence=activeCinematic;
   if(hit&&sequence?.actor===u){
    const item={kind:hit.kind,stage:hit.stage,time:clock,hp:a.hp.body,range:distance(u,a),
     frame:foundryRender(u,clock).index,stop:u.hitstop?.until-u.hitstop?.at||0,log:battle.log.at(-1)};
    const last=window.aegisTrace.at(-1);
    if(last?.kind!==item.kind||last.stage!==item.stage)window.aegisTrace.push(item);
   }
   if(battle?.turn<=2)requestAnimationFrame(trace);
  };
  requestAnimationFrame(trace);
  return {name:u.name,types:frames.map(f=>images.indexOf(f.surface)),shield:frames[0].shield,
   anchor:frames[0].anchors.shieldCore,blade:frames[0].anchors.bladeCore,hp:a.hp.body};
 });
 assert.match(setup.name,/^BULWARK-AEGIS/);
 assert.deepEqual(setup.types,[0,1,2,3]);
 assert.ok(setup.shield&&setup.anchor.every(Number.isFinite)&&setup.blade.every(Number.isFinite));
 for(const [round,kind] of [[2,'aegis-cleave'],[3,'aegis-bash']]){
  await tap('#end');
  if(process.env.IRON_VOW_AEGIS_PROOF){
   await page.waitForFunction(kind=>activeCinematic?.actor.attack?.kind===kind&&activeCinematic.actor.attack.stage==='charge',kind);
   await page.screenshot({path:join(process.env.IRON_VOW_AEGIS_PROOF,kind+(mobile?'-touch':'-desktop')+'.png')});
  }
  await page.waitForFunction(round=>battle?.turn===round&&!battle.busy,round);
 }
 const result=await page.evaluate(()=>({trace:window.aegisTrace,hp:current().hp.body}));
 let before=setup.hp;
 for(const kind of ['aegis-cleave','aegis-bash']){
  const stages=result.trace.filter(s=>s.kind===kind);
  assert.deepEqual(stages.map(s=>s.stage),['pullback','charge','release','impact','recovery']);
  const [pull,charge,release,impact,recover]=stages;
  assert.ok(stages.every(s=>s.range===1));
  assert.ok(charge.time-pull.time>=.5&&release.time-charge.time>=.20&&impact.time-release.time>=.19);
  assert.ok(impact.stop>=.09&&recover.time-impact.time>=.06);
  assert.deepEqual([pull.hp,charge.hp,release.hp],[before,before,before]);
  assert.ok(impact.hp<before&&recover.hp===impact.hp);
  assert.ok(impact.log.startsWith(setup.name+' →'));
  assert.ok(new Set([pull.frame,charge.frame,impact.frame]).size>=2);
  before=impact.hp;
 }
 assert.equal(result.hp,before);
 console.log('PASS both powered melee cinematics, four atlas variants, held charge, contact damage and hitstop');
};
