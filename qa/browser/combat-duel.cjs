const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkCombatDuel({page,origin,mobile,out}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.stopDuelFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);

 async function fixture(range){
  const attack=await page.evaluate(range=>{
   const weapon=range===7?'missile':'rail';
   __ironVow.start({seed:4242,contract:0,frames:[0,1],loadouts:[{weapon,condition:100,upgrade:0}]});
   const [actor,bystander]=battle.units.filter(u=>u.team==='ally');
   const target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
   battle.units=[actor,bystander,target];
   battle.cover.clear();
   for(const cell of battle.field.cells)cell.level=0;
   for(const [unit,x,z] of [[actor,4,8],[target,4+range,8],[bystander,3,10]]){
    Object.assign(unit,{x,z,vx:x,vz:z,ap:20});
   }
   if(range===7)target.hp.right=0;
   else{
    Object.assign(target,{frame:0,weapon:'rifle',melee:null,shield:null});
    for(const unit of [actor,target])for(const part in unit.hp)unit.hp[part]=unit.max[part]=1000;
   }
   ruleRandom=()=>0;
   IronVowScene.clear();IronVowScene.render(clock,1);
   const choice=__ironVow.choices(actor.id).attacks.find(a=>a.target===target.id&&a.mode==='fire'&&a.part==='body');
   window.duelWatch=choice?{choice,range,actor:actor.id,target:target.id,bystander:bystander.id,frames:{}}:null;
   return Boolean(choice);
  },range);
  assert.ok(attack,'The '+range+'-tile shot is legal');
 }
 const advanceUntil=async(predicate,message)=>{
  for(let i=0;i<180;i++){
   if(await page.evaluate(predicate))return;
   await page.clock.runFor(34);
  }
  throw Error(message);
 };
 await fixture(7);
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:90000});
 await page.evaluate(()=>stopDuelFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');
 await page.clock.install({time:epoch});
 await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{
  const render=IronVowScene.render;
  IronVowScene.render=function(t,dt){
   const result=render.call(this,t,dt),shot=activeCinematic,watch=window.duelWatch;
   if(!shot||!watch||shot.phase==='aim')return result;
   if(shot.phase==='result'&&!(t-shot.resultAt>=.10))return result;
   const beat=watch.range===7&&shot.phase==='fire'&&t-shot.fireAt>=.16?'flight':shot.phase;
   const key=shot.actor.id===watch.actor?beat:'counter-'+beat;
   if(watch.frames[key])return result;
   const {camera,scene,models}=IronVowScene;
   const direction=models.get(watch.target).proxy.position.clone().sub(models.get(watch.actor).proxy.position);
   const screenDirection=Math.sign(direction.dot(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0)));
   const bounds=[watch.actor,watch.target].map(id=>{
    const box=new THREE.Box3().setFromObject(models.get(id).proxy),{min,max}=box;
    let edge=0,depth=0,top=-Infinity,bottom=Infinity;
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
     const point=new THREE.Vector3(x,y,z),ndc=point.clone().project(camera);
     edge=Math.max(edge,Math.abs(ndc.x),Math.abs(ndc.y));
     depth=Math.max(depth,-point.applyMatrix4(camera.matrixWorldInverse).z);
     top=Math.max(top,ndc.y);bottom=Math.min(bottom,ndc.y);
    }
    return {edge,depth,height:(top-bottom)/2,bottom,center:box.getCenter(new THREE.Vector3()).project(camera).toArray()};
   });
   watch.frames[key]={bounds,screenDirection,dt,fogNear:scene.fog.near,bystanderVisible:models.get(watch.bystander).object.visible,
    overlays:IronVowScene.overlayInfo()};
   return result;
  };
  last=performance.now();requestAnimationFrame(draw);
 });
 const fire=()=>page.evaluate(()=>{
  const {actor,choice}=window.duelWatch;
  void __ironVow.attack(actor,choice.target,choice.part,choice.mode);
 });
 const assertCinematic=frame=>{
  assert.ok(frame.dt>0&&frame.dt<=.05,'The camera was sampled at normal frame deltas');
  assert.equal(frame.bystanderVisible,false);
  assert.equal(frame.overlays.selected||frame.overlays.target,false);
 };
 const assertTwoShot=frame=>{
  assertCinematic(frame);
  for(const box of frame.bounds){
   assert.ok(box.edge<1,'Both hulls fit in the firing lane: '+JSON.stringify(frame.bounds));
   assert.ok(box.depth<frame.fogNear,'Both hulls are clear of the fog');
  }
  assert.ok(Math.abs(frame.bounds[0].center[0]-frame.bounds[1].center[0])>.35,'The two hull silhouettes stay apart');
 };
 const order=frame=>Math.sign(frame.bounds[0].center[0]-frame.bounds[1].center[0]);
 const skip=async()=>{
  await page.evaluate(()=>document.querySelector('#skip-shot').click());
  await advanceUntil(()=>!__ironVow.pending&&!activeCinematic,'Skip did not return to the tactical board');
  await page.clock.runFor(34);
  assert.equal(await page.evaluate(()=>IronVowScene.models.get(window.duelWatch.bystander).object.visible),true);
 };

 await fire();
 await advanceUntil(()=>window.duelWatch.frames.fire,'The missile never reached its first firing frame');
 const launch=await page.evaluate(()=>window.duelWatch.frames.fire),shooter=launch.bounds[0];
 assertCinematic(launch);
 assert.ok(shooter.edge<1&&shooter.height>.33,'The launch fills the frame with the shooter: '+JSON.stringify(shooter));
 if(out)await page.screenshot({path:join(out,mobile?'missile-release-touch.png':'missile-release-desktop.png')});
 await advanceUntil(()=>window.duelWatch.frames.flight,'The missile never reached the flight camera');
 const wide=await page.evaluate(()=>window.duelWatch.frames.flight);
 assertTwoShot(wide);
 assert.equal(launch.screenDirection,wide.screenDirection,'The missile continues across the screen in its established direction');
 if(out)await page.screenshot({path:join(out,mobile?'missile-flight-touch.png':'missile-flight-desktop.png')});
 await advanceUntil(()=>window.duelWatch.frames.result,'The missile never reached the result camera');
 const close=await page.evaluate(()=>window.duelWatch.frames.result.bounds[1]);
 assert.ok(Math.abs(close.center[0])<.35&&close.height>.33&&close.height>wide.bounds[1].height*1.5,'The result frames the defending hull: '+JSON.stringify(close));
 if(out){
  await page.clock.runFor(120);
  await page.screenshot({path:join(out,mobile?'missile-result-touch.png':'missile-result-desktop.png')});
 }
 await skip();

 await fixture(2);
 for(let i=0;i<120&&!await page.evaluate(()=>IronVowScene.ready);i++){
  await new Promise(resolve=>setTimeout(resolve,20));await page.clock.runFor(34);
 }
 assert.equal(await page.evaluate(()=>IronVowScene.ready),true,'The short exchange rigs are ready');
 await fire();
 await advanceUntil(()=>window.duelWatch.frames['counter-fire'],'The defender did not return fire');
 const frames=await page.evaluate(()=>window.duelWatch.frames);
 assertTwoShot(frames.fire);assertTwoShot(frames['counter-fire']);
 assert.equal(order(frames['counter-fire']),order(frames.fire),'Return fire keeps both hulls on their established screen sides');
 if(out)await page.screenshot({path:join(out,mobile?'counter-touch.png':'counter-desktop.png')});
 await skip();
 console.log('PASS first-frame release, long-range result, reverse-fire screen order, and tactical return');
};
