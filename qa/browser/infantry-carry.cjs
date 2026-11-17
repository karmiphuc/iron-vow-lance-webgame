const assert=require('node:assert/strict');
const {waitForInfantry}=require('./line-infantry-common.cjs');

module.exports=async function checkInfantryCarry({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&window.IronVowScene);
 const results={};
 for(const [contract,frame,model] of [[0,13,'li-01'],[2,14,'li-02']]){
  await page.evaluate(contract=>__ironVow.start({seed:4242,contract}),contract);
  await waitForInfantry(page,frame);
  const arms=await page.evaluate(async frame=>{
   const unit=battle.units.find(unit=>unit.frame===frame),{entry}=IronVowScene.models.get(unit.id);
   const {m,primary}=entry,{source}=m.nativeV2;
   const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   const world=node=>node.getWorldPosition(new THREE.Vector3());
   const stockGrip=world(authored('WEAPON_SOCKET_R')).distanceTo(world(authored('socket.R')));
   battle.cover.clear();
   // Keep both routes deterministic and inside the board while exercising normal movement and world gait.
   const traversals=[];
   for(const delta of [1,-1]){
    const x=unit.x+delta,z=unit.z;
    resetMovement(unit);
    if(!paths(unit).has(`${x},${z}`))throw Error('Expected a legal enemy move for the live carry fixture');
    const samples=[];
    let moving=true;
    const sampled=new Promise(resolve=>{
     function sample(){
      if(!moving){resolve();return;}
      if(unit.motion){
       const current=IronVowScene.models.get(unit.id).entry;
       const weapon=world(authored('WEAPON_SOCKET_R'));
       const muzzle=world(authored('muzzle.main'));
       samples.push({
        sameRig:current===entry&&current.primary===primary,
        gripError:Math.abs(weapon.distanceTo(world(authored('socket.R')))-stockGrip),
        muzzleError:muzzle.distanceTo(world(primary.muzzle)),
        visible:authored('WEAPON_SOCKET_R').visible,
        feet:m.rig.legs.map((leg,index)=>{
         const state=m.legs[index],actual=world(authored('ankle.'+leg.side));
         return {swing:state.swing,moving:Boolean(state.swing||state.settle),
          binding:actual.distanceTo(world(leg.an)),position:actual.toArray(),plant:state.planted.toArray()};
        })
       });
      }
      requestAnimationFrame(sample);
     }
     requestAnimationFrame(sample);
    });
    try{await moveUnit(unit,x,z);}finally{moving=false;}
    await sampled;
    traversals.push({samples,arrived:unit.x===x&&unit.z===z});
   }
   return traversals;
  },frame);
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
