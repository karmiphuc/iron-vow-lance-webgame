const assert=require('node:assert/strict');
const {waitForInfantry}=require('./line-infantry-common.cjs');

async function waitForControlledInfantry(page,frame){
 for(let i=0;i<400;i++){
  if(await page.evaluate(frame=>{
   const unit=battle?.units.find(unit=>unit.frame===frame&&unit.team==='enemy');
   const entry=unit&&IronVowScene.models.get(unit.id)?.entry;
   return Boolean(unit&&IronVowScene.ready&&IronVowScene.isLive(unit)&&entry?.m.nativeV2&&entry.primary?.muzzle);
  },frame))return;
  await page.clock.runFor(34);
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 throw Error('Controlled infantry rig did not become ready');
}

async function moveAndSample(page,delta){
 const target=await page.evaluate(delta=>{
  const {unit}=window.__infantryCarryFixture;
  resetMovement(unit);
  const x=unit.x+delta,z=unit.z;
  if(!paths(unit).has(`${x},${z}`))throw Error('Expected a legal enemy move for the live carry fixture');
  window.__infantryCarryMove={x,z,done:false,error:null};
  moveUnit(unit,x,z).then(()=>window.__infantryCarryMove.done=true,
   error=>window.__infantryCarryMove.error=String(error));
  return {x,z};
 },delta);
 const samples=[];
 let state;
 for(let tick=0;tick<400;tick++){
  await page.clock.runFor(17);
  state=await page.evaluate(()=>{
   const {unit,entry,primary,source,stockGrip}=window.__infantryCarryFixture,move=window.__infantryCarryMove;
   if(move.error)return {error:move.error};
   if(!unit.motion)return {done:move.done};
   IronVowScene.render(clock,.016);
   const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   const world=node=>node.getWorldPosition(new THREE.Vector3());
   const current=IronVowScene.models.get(unit.id).entry;
   const weapon=world(authored('WEAPON_SOCKET_R'));
   const muzzle=world(authored('muzzle.main'));
   return {done:move.done,sample:{
    sameRig:current===entry&&current.primary===primary,
    gripError:Math.abs(weapon.distanceTo(world(authored('socket.R')))-stockGrip),
    muzzleError:muzzle.distanceTo(world(primary.muzzle)),
    visible:authored('WEAPON_SOCKET_R').visible,
    feet:entry.m.rig.legs.map((leg,index)=>{
     const legState=entry.m.legs[index],actual=world(authored('ankle.'+leg.side));
     return {swing:legState.swing,moving:Boolean(legState.swing||legState.settle),
      binding:actual.distanceTo(world(leg.an)),position:actual.toArray(),plant:legState.planted.toArray()};
    })
   }};
  });
  if(state.error)throw Error('Live carry move failed: '+state.error);
  if(state.sample)samples.push(state.sample);
  if(state.done)break;
 }
 const arrived=await page.evaluate(({x,z})=>{
  const {unit}=window.__infantryCarryFixture,move=window.__infantryCarryMove;
  return move.done&&unit.x===x&&unit.z===z;
 },target);
 return {samples,arrived};
}

module.exports=async function checkInfantryCarry({page,origin}){
 await page.addInitScript(()=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.__stopInfantryFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
 });
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&window.IronVowScene);
 const results={};let controlled=false;
 for(const [contract,frame,model] of [[0,13,'li-01'],[2,14,'li-02']]){
  await page.evaluate(contract=>__ironVow.start({seed:4242,contract}),contract);
  if(!controlled){
   await waitForInfantry(page,frame);
   await page.evaluate(()=>__stopInfantryFrames());
   const epoch=new Date('2026-11-11T00:00:00Z');
   await page.clock.install({time:epoch});
   await page.clock.pauseAt(new Date(epoch.getTime()+10000));
   await page.evaluate(()=>{requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/60);last=performance.now();requestAnimationFrame(draw);});
   controlled=true;
  }else await waitForControlledInfantry(page,frame);
  await page.evaluate(frame=>{
   const unit=battle.units.find(unit=>unit.frame===frame&&unit.team==='enemy'),{entry}=IronVowScene.models.get(unit.id);
   const {m,primary}=entry,{source}=m.nativeV2;
   const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   const world=node=>node.getWorldPosition(new THREE.Vector3());
   const stockGrip=world(authored('WEAPON_SOCKET_R')).distanceTo(world(authored('socket.R')));
   battle.cover.clear();
   window.__infantryCarryFixture={unit,entry,primary,source,stockGrip};
  },frame);
  // Step game timers at 60 Hz and explicitly render the real rig before each geometry sample.
  const arms=[];
  for(const delta of [1,-1])arms.push(await moveAndSample(page,delta));
  let plantedPairs=0;
  const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
  for(const {samples,arrived} of arms){
   assert.equal(arrived,true,`${model} reaches the neighboring tile`);
   assert.ok(samples.length>=2,`${model} produces animated travel samples`);
   assert.ok(samples.some(({feet})=>feet.some(foot=>foot.swing)),`${model} swings an articulated ankle`);
   for(const [i,{sameRig,gripError,muzzleError,visible,feet}] of samples.entries()){
    assert.ok(sameRig&&visible&&gripError<1e-5&&muzzleError<1e-5,`${model} keeps the authored carbine in grip throughout travel`);
    for(const [side,foot] of feet.entries()){
     assert.ok(foot.binding<1e-5,`${model} posed ankle tracks the exported joint`);
     const previous=samples[i-1]?.feet[side];
     if(!previous||foot.moving||previous.moving||distance(previous.plant,foot.plant)>1e-5)continue;
     assert.ok(distance(previous.position,foot.position)<.002,`${model} planted foot holds its world position`);
     plantedPairs++;
    }
   }
  }
  assert.ok(plantedPairs>0,`${model} recorded consecutive planted-foot samples`);
  results[model]={traversals:arms.length,plantedPairs};
 }
 return results;
};
