const assert=require('node:assert/strict');

module.exports=async function checkCombatDuel({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.stopDuelFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);
 const attack=await page.evaluate(()=>{
  __ironVow.start({seed:4242,contract:0,frames:[0,1],loadouts:[{weapon:'missile',condition:100,upgrade:0}]});
  const [actor,bystander]=battle.units.filter(u=>u.team==='ally');
  const target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  battle.units=[actor,bystander,target];
  battle.cover.clear();
  for(const cell of battle.field.cells)cell.level=0;
  for(const [unit,x,z] of [[actor,4,8],[target,11,8],[bystander,3,10]]){
   Object.assign(unit,{x,z,vx:x,vz:z});
  }
  actor.ap=20;target.hp.right=0;
  IronVowScene.clear();IronVowScene.render(clock,1);
  const choice=__ironVow.choices(actor.id).attacks.find(a=>a.target===target.id&&a.mode==='fire'&&a.part==='body');
  return choice?{choice,actor:actor.id,target:target.id,bystander:bystander.id}:null;
 });
 assert.ok(attack,'The seven-tile missile shot is legal');
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:90000});
 await page.evaluate(()=>stopDuelFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');
 await page.clock.install({time:epoch});
 await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(({actor,choice})=>{
  last=performance.now();requestAnimationFrame(draw);
  void __ironVow.attack(actor,choice.target,choice.part,choice.mode);
 },attack);
 for(let i=0;i<70&&!await page.evaluate(()=>activeCinematic?.phase==='fire');i++)await page.clock.runFor(34);
 const projection=await page.evaluate(({actor,target,bystander})=>{
  if(activeCinematic?.phase!=='fire')throw Error('The missile never reached the fire phase');
  IronVowScene.render(clock,1);
  const {camera,scene,models}=IronVowScene;
  const bounds=[actor,target].map(id=>{
   const {min,max}=new THREE.Box3().setFromObject(models.get(id).proxy);
   let edge=0,depth=0;
   for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
    const point=new THREE.Vector3(x,y,z),ndc=point.clone().project(camera);
    edge=Math.max(edge,Math.abs(ndc.x),Math.abs(ndc.y));
    depth=Math.max(depth,-point.applyMatrix4(camera.matrixWorldInverse).z);
   }
   return {edge,depth};
  });
  return {bounds,fogNear:scene.fog.near,bystanderVisible:models.get(bystander).object.visible,overlays:IronVowScene.overlayInfo()};
 },attack);
 for(const box of projection.bounds){
  assert.ok(box.edge<1,'Both complete hull bounds fit the duel frame: '+JSON.stringify(projection.bounds));
  assert.ok(box.depth<projection.fogNear,'Neither combatant fades into the field fog: '+JSON.stringify(projection));
 }
 assert.equal(projection.bystanderVisible,false);
 assert.equal(projection.overlays.selected||projection.overlays.target,false);
 await page.evaluate(()=>document.querySelector('#skip-shot').click());
 for(let i=0;i<20&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.fastForward(1000);
 assert.equal(await page.evaluate(id=>{
  IronVowScene.render(clock,1);
  return !activeCinematic&&IronVowScene.models.get(id).object.visible;
 },attack.bystander),true,'Closing the duel restores the bystander');
 console.log('PASS seven-tile duel fits both hulls without fog, hides bystanders and restores the field');
};
