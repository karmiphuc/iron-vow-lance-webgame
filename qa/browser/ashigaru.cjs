const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkAshigaru({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{save.dispatch={day:save.day,sizes:[3,1,2,3]};Math.random=()=>0});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 await tap('#modal-0');
 const setup=await page.evaluate(async()=>{
  const u=battle.units.find(u=>u.frame===ASHIGARU_FRAME),a=current();
  lockedTarget=u.id;targetPanelOpen=true;renderBattle();
  const portrait=document.querySelector('.combat-target img').getAttribute('src');
  targetPanelOpen=false;renderBattle();
  const atlas=window.IRON_VOW_ASHIGARU_ART,image=motionImages[atlas.key];
  await image.decode();
  battle.cover.clear();
  for(const other of battle.units)if(other!==u&&other!==a){other.alive=false;other.hp.body=0}
  Object.assign(a,{x:8,z:15,vx:8,vz:15});
  Object.assign(u,{x:8,z:7,vx:8,vz:7});
  window.ashTrace={walk:[],attacks:[]};
  const trace=()=>{
   const rendered=foundryRender(u,clock),attack=u.attack;
   if(u.motion)window.ashTrace.walk.push({frame:rendered.index,step:u.motion.duration});
   if(attack&&activeCinematic?.actor===u){
    const clip=atlas.attacks[weapon(attack.kind).scout];
    window.ashTrace.attacks.push({id:attack.kind,frame:rendered.index,belongs:clip.includes(rendered.index),
     fired:Number.isFinite(attack.fireAt),hit:Number.isFinite(attack.releaseAt),range:distance(u,a),
     anchor:rendered.anchors[attack.kind==='signal-knife'?'meleeTip':'muzzle'],
     grip:rendered.anchors[attack.kind==='signal-knife'?'gripL':'gripR']});
   }
   if(battle?.turn<=3)requestAnimationFrame(trace);
  };
  requestAnimationFrame(trace);
  return {name:u.name,model:FRAMES[u.frame].model,id:u.id,primary:foundryRender(u,clock).primary,
   atlas:image.naturalWidth,ground:atlas.ground,authored:u.paint===null&&u.trim===null,portrait};
 });
 assert.deepEqual([setup.name,setup.model,setup.id],['ASHIGARU 2','IV-S07','enemy1']);
 assert.ok(setup.authored&&setup.primary&&setup.atlas>=1200&&setup.ground[1]>.75&&setup.ground[1]<.9);
 assert.equal(setup.portrait,'assets/ashigaru.webp');
 for(const [round,range,id] of [[2,8,'needle-carbine'],[3,2,'flechette-scattergun'],[4,1,'signal-knife']]){
  await page.evaluate(range=>{
   const u=battle.units.find(u=>u.frame===ASHIGARU_FRAME),a=current();
   Object.assign(u,{x:8,z:15-range,vx:8,vz:15-range});
   a.reacted=true;a.hp={...a.max};
  },range);
  await tap('#end');
  if(process.env.IRON_VOW_ASHIGARU_PROOF){
   await page.waitForFunction(id=>activeCinematic?.actor.attack?.kind===id&&activeCinematic.phase==='fire',id);
   await page.screenshot({path:join(process.env.IRON_VOW_ASHIGARU_PROOF,id+(mobile?'-touch':'-desktop')+'.png')});
  }
  await page.waitForFunction(round=>battle?.turn===round&&!battle.busy,round);
 }
 const trace=await page.evaluate(()=>window.ashTrace);
 assert.ok(new Set(trace.walk.map(f=>f.frame)).size>=12,'both quickstep halves are played');
 assert.ok(trace.walk.every(f=>f.step===.29),'scout tile traversal takes 290 ms');
 for(const [id,range,reach] of [['needle-carbine',3,.07],['flechette-scattergun',2,.04],['signal-knife',1,.11]]){
  const clip=trace.attacks.filter(f=>f.id===id);
  assert.ok(clip.some(f=>!f.fired)&&clip.some(f=>f.fired&&!f.hit)&&clip.some(f=>f.hit));
  assert.ok(new Set(clip.map(f=>f.frame)).size>=5);
  assert.ok(clip.every(f=>f.belongs&&f.range===range&&f.anchor.every(Number.isFinite)));
  assert.ok(clip.some(f=>Math.hypot(f.anchor[0]-f.grip[0],f.anchor[1]-f.grip[1])>reach),
   id+' anchors its effects at the weapon tip, clear of the grip');
 }
 console.log('PASS Ashigaru quickstep and three weapon cinematics at their intended ranges');
};
