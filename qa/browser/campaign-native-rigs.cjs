const assert=require('node:assert/strict');
const profiles=[
 {id:24,model:'husky',contract:'whiteout-patrol',weapon:'shotgun'},
 {id:25,model:'giza',contract:'kiln-nine',weapon:'rifle'},
 {id:26,model:'vyzov',contract:'broken-grid',weapon:null}
];
const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

module.exports=async function checkCampaignNativeRigs({page,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('/',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.IronVowFoundry&&window.IronVowRigV2&&typeof stockHull==='function');
 const previews=await page.evaluate(async()=>{
  const frame=24,unit={...stockHull(frame),frame};
  const viewer=IronVowFoundry;
  const built=[];
  for(let i=0;i<2;i++){
   viewer.retainPreview(frame);
   await IronVowRigV2.load([unit],'preview');
   let entry;
   for(let attempt=0;!entry&&attempt<120;attempt++){
    entry=viewer.preview(unit,foundryModel(frame));
    if(!entry)await new Promise(resolve=>requestAnimationFrame(resolve));
   }
   if(!entry)throw Error('Husky preview never rendered');
   const {ownedMaterials,visorMat,stackMat}=entry.m.build;
   const disposed=new Map([...new Set([...ownedMaterials,visorMat,stackMat])].map(mat=>[mat,0]));
   for(const mat of disposed.keys())mat.addEventListener('dispose',()=>disposed.set(mat,disposed.get(mat)+1));
   viewer.retainPreview(null);
   built.push({visor:visorMat.name,materials:ownedMaterials.length,exactOnce:[...disposed.values()].every(count=>count===1)});
  }
  return built;
 });
 assert.ok(previews.every(({visor,materials,exactOnce})=>visor==='Amber optical glass'&&materials>1&&exactOnce),
  'Each repeated Husky preview has its authored optic and disposes its owned materials once');
 for(const profile of profiles){
  await page.evaluate(({id,contract})=>__ironVow.start({
   seed:42,contract:CONTRACTS.findIndex(c=>c.id===contract),frames:[id],loadouts:[stockHull(id)]
  }),profile);
  await page.waitForFunction(frame=>IronVowScene.ready&&battle.units.filter(u=>u.frame===frame)
   .every(u=>IronVowScene.models.get(u.id)?.entry?.m?.nativeV2),profile.id,{timeout:60000});
  const setup=await page.evaluate(async id=>{
   const V=()=>new THREE.Vector3(),actor=current();
   const entry=u=>IronVowScene.models.get(u.id).entry;
   const sameFrame=battle.units.filter(u=>u.frame===id).map(u=>{
    const {m,primary}=entry(u);
    const point=primary?.muzzle.getWorldPosition(V());
    return {model:m.live,team:u.team,weapon:primary?.id??null,
     wrist:!primary||primary.mount.parent.parent===m.rig.arms.R.wr,
     clearance:point?point.y-IronVowScene.groundAt(m.cont.position.x,m.cont.position.z,false):null,
     mortar:m.nativeV2.mortar?.muzzle.getWorldDirection(V()).y,
     stowed:m.nativeV2.abilityWeapon?.muzzle.getWorldDirection(V()).y};
   });

   const paths=__ironVow.legalMoves(actor.id).filter(tile=>tile.cost===1);
   const initialLevel=terrainCell(actor.x,actor.z).level;
   const move=paths.find(tile=>terrainCell(tile.x,tile.z).level===initialLevel);
   if(!move)throw Error('Native rig fixture needs a level one-tile move');
   const samples=[];
   let moving=true;
   const monitor=new Promise(resolve=>{
    function step(){
     if(!moving){resolve();return;}
     if(actor.motion){
      const m=entry(actor).m;
      samples.push({hips:m.rig.pelvis.position.x,legs:m.rig.legs.map((leg,i)=>{
       const state=m.legs[i],at=leg.an.getWorldPosition(V());
       return {at:at.toArray(),plant:state.planted.toArray(),targetError:at.distanceTo(state.foot),
        swing:state.swing||Boolean(state.settle),ground:IronVowScene.groundAt(at.x,at.z)+m.dims.ankleH*m.scale};
      })});
     }
     requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
   });
   try{await __ironVow.move(actor.id,move.x,move.z);}finally{moving=false;}
   await monitor;
   return {sameFrame,samples,arrived:actor.vx===move.x&&actor.vz===move.z,idleHip:entry(actor).m.dims.py};
  },profile.id);

  assert.deepEqual(setup.sameFrame.map(({team,model,weapon})=>[team,model,weapon]),
   [['ally',profile.model,profile.weapon],['enemy',profile.model,profile.weapon]]);
  for(const unit of setup.sameFrame){
   assert.ok(unit.wrist,'A fitted weapon stays attached to the authored right wrist');
   if(profile.weapon)assert.ok(unit.clearance>.6,'The carried weapon clears its hull’s footing: '+JSON.stringify(unit));
   if(profile.id===25)assert.ok(unit.stowed>.95,'Giza keeps its cannons upright in Ready');
   if(profile.id===26)assert.ok(unit.mortar>.7,'Vyzov retains its elevated shoulder mortar');
  }
  assert.ok(setup.arrived&&setup.samples.length>=8,'A legal board step reaches its endpoint');
  assert.ok(setup.samples.some(sample=>sample.legs[0].swing&&!sample.legs[1].swing));
  assert.ok(setup.samples.some(sample=>sample.legs[1].swing&&!sample.legs[0].swing));
  let locked=0;
  for(const [i,sample] of setup.samples.entries())for(const [side,leg] of sample.legs.entries()){
   const prior=setup.samples[i-1]?.legs[side];
   if(!prior||prior.swing||leg.swing||distance(leg.plant,prior.plant)>.0001)continue;
   assert.ok(leg.targetError<.06&&Math.abs(leg.at[1]-leg.ground)<.06,'The actual planted ankle holds its terrain anchor');
   assert.ok(distance(leg.at,prior.at)<.05,'The support foot holds across consecutive game frames');
   locked++;
  }
  assert.ok(locked>=4);
  await tap('#brace');
  await page.waitForFunction(py=>IronVowScene.models.get(current().id)?.entry.m.rig.pelvis.position.y<py-.15,setup.idleHip,{timeout:8000});

  const after=await page.evaluate(async id=>{
   const actor=current(),foe=battle.units.find(u=>u.frame===id&&u.team==='enemy'),vertex=()=>new THREE.Vector3();
   foe.reacted=true;foe.hp.body=foe.max.body=2500;actor.ap=8;
   const entry=u=>IronVowScene.models.get(u.id).entry;
   let lane;
   for(let z=2;z<battle.size.depth-2&&!lane;z++)for(let x=2;x<battle.size.width-5&&!lane;x++){
    const levels=[0,1,2,3].map(dx=>terrainCell(x+dx,z).level);
    if(levels.every(level=>level===levels[0]))lane={x,z};
   }
   const gap=id===26?1:3;
   Object.assign(actor,{...lane,vx:lane.x,vz:lane.z,heading:headingTo(1,0),face:1});
   Object.assign(foe,{x:lane.x+gap,z:lane.z,vx:lane.x+gap,vz:lane.z,heading:headingTo(-1,0),face:-1});
   battle.cover.clear();battle.field.cover={};ruleRandom=()=>.002;
   renderBattle();
   const history=IronVowScene.combat.history,start=history.length;
   const gun=entry(actor).primary,ability=entry(actor).m.nativeV2.abilityWeapon;
   const mortar=entry(actor).m.nativeV2.mortar;
   const receiver=entry(foe).m;
   const restPitch=receiver.rig.spine.rotation.x;
   const response=[];
   let working=true;
   const sampled=new Promise(resolve=>{
    function frame(){
     if(!working){resolve();return;}
     response.push({kick:gun?.recoil.position.z,
      shoulderKick:ability&&Math.max(ability.mount.position.distanceTo(ability.rest),ability.alternate.mount.position.distanceTo(ability.alternate.rest)),
      mortarKick:mortar?.mount.position.distanceTo(mortar.rest),
      hit:clock-(foe.hitTime??-100)<.6?Math.abs(receiver.rig.spine.rotation.x-restPitch):0});
     requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
   });
   let knuckle;
   try{
    if(id===25)await executeTactical(actor,tacticalPlan(actor,{target:foe.id}));
    else if(id===26){
     await executeTactical(actor,tacticalPlan(actor,{x:foe.x,z:foe.z}));
     const combat=IronVowScene.combat,landed=combat.landed;
     combat.landed=function(...args){
      landed.apply(this,args);
      if(args[0]!==actor||args[2].id!=='vyzov-knuckle')return;
      const rig=entry(actor).m.nativeV2,contact=history.at(-1);
      knuckle={damage:contact.damage,point:contact.point,
       fist:rig.strikeContact(args[2].id).getWorldPosition(vertex()).toArray()};
     };
     try{await shoot(actor,foe,'body');}finally{combat.landed=landed;}
    }
    else await shoot(actor,foe,'body');
    if(id===25)await new Promise(resolve=>setTimeout(resolve,1150));
   }finally{working=false;}
   await sampled;
   const attacks=history.slice(start);
   const returnStow=ability?.muzzle.getWorldDirection(vertex()).y;
   const standing=entry(foe).m.rig.neck.getWorldPosition(vertex()).y;
   foe.hp.body=0;beginDestruction(foe);
   const age=elapsed=>{
    IronVowScene.render(foe.deathTime+destructionTime(foe,elapsed),0);
    const m=entry(foe).m;
    return {height:m.rig.neck.getWorldPosition(vertex()).y,
     chassis:m.campaignRig.chassis.matrixWorld.toArray(),knee:m.rig.legs[0].kn.matrixWorld.toArray()};
   };
   return {response,attacks,knuckle,mortarHits:battle.log.filter(text=>text.includes('mortar damage')).length,
    returnStow,standing,fall:[age(.44),age(1.1),age(1.92),age(3.7)]};
  },profile.id);

  const launches=after.attacks.filter(event=>event.type==='launch'&&event.actor==='ally0');
  if(profile.id===24){
   assert.equal(launches.length,1);
   assert.ok(after.response.some(sample=>sample.kick<-.04),'The fitted shotgun recoils in its mount');
   assert.ok(after.attacks.some(event=>event.type==='impact'&&event.target==='enemy0'));
   assert.ok(after.response.some(sample=>sample.hit>.018),'The receiving cockpit reacts to its armor hit');
  }else if(profile.id===25){
   assert.deepEqual(launches.map(event=>event.socket),['shoulderMuzzle','shoulderMuzzle2']);
   assert.ok(distance(launches[0].origin,launches[1].origin)>1,'The salvo comes from two independent cannons');
   assert.ok(after.response.some(sample=>sample.shoulderKick>.07));
   assert.ok(after.response.every(sample=>Math.abs(sample.kick)<.01),'Only the shoulder cannons recoil during the salvo');
   assert.ok(after.returnStow>.95,'The shoulder cannons return to travel position');
  }else{
   const launch=after.attacks.find(event=>event.type==='mortar-launch');
   assert.equal(launch?.tiles.length,5);
   assert.equal(after.attacks.filter(event=>event.type==='mortar-arrival').length,5);
   assert.ok(after.mortarHits>=1&&after.response.some(sample=>sample.mortarKick>.04));
   assert.ok(after.knuckle?.damage>0,'The built-in Pile Knuckle lands real damage');
   assert.deepEqual(after.knuckle.point,after.knuckle.fist,'The Pile Knuckle impact comes from the authored fist');
  }
  for(const launch of launches){
   assert.ok(launch.mounted&&launch.aimError<.015,'The rendered bore tracks the rule contact');
   assert.deepEqual(launch.origin,launch.expectedOrigin);
  }
  const [start,impact,settled,held]=after.fall;
  assert.ok(after.standing-settled.height>1,'The authored collapse takes the cockpit below standing height');
  assert.notDeepEqual(start.chassis,impact.chassis);
  assert.deepEqual(settled.chassis,held.chassis);
  assert.deepEqual(settled.knee,held.knee);
 }
};
