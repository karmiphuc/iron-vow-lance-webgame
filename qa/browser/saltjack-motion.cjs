const assert=require('node:assert/strict');

module.exports=async function checkSaltjackMotion({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('?bench=war&trial=salt-works',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>IronVowScene.ready&&battle?.units.length===2&&battle.units.every(unit=>
  IronVowScene.models.get(unit.id)?.entry?.primary?.id==='salt-rifle'),null,{timeout:90000});

 const checks=await page.evaluate(async()=>{
  const [hero,enemy]=battle.units;
  const rig=unit=>IronVowScene.models.get(unit.id).entry.m;
  const world=node=>node.getWorldPosition(new THREE.Vector3());
  const paint=(mech,pattern)=>mech.build.ownedMaterials.find(material=>pattern.test(material.name));
  const assetPath='rig-bench/rig-v2/saltjack.glb';
  const heroMotion=rig(hero),enemyMotion=rig(enemy);
  const shared=rig=>{
   let geometry;
   rig.body.traverse(node=>{if(node.isMesh&&!geometry)geometry=node.geometry;});
   return geometry;
  };
  const firstPaint=paint(heroMotion,/Cold porcelain/),secondPaint=paint(enemyMotion,/Cold porcelain/);
  const laterEnemy=IronVowRigV2.build(enemy);
  let sharedDisposed=false;
  const disposed=()=>{sharedDisposed=true;};
  const sharedGeometry=shared(heroMotion),sharedTexture=firstPaint.map;
  sharedGeometry.addEventListener('dispose',disposed);sharedTexture.addEventListener('dispose',disposed);
  laterEnemy.nativeV2.dispose();
  VowChassis.releaseOwnedMaterials(new Set(laterEnemy.build.ownedMaterials));
  sharedGeometry.removeEventListener('dispose',disposed);sharedTexture.removeEventListener('dispose',disposed);
  const asset={
   oneRequest:performance.getEntriesByType('resource').filter(entry=>entry.name.endsWith(assetPath)).length===1,
   cassettes:[heroMotion,enemyMotion].map(m=>['L','R'].map(side=>m.body.getObjectByName('Cassette_'+side).visible)),
   sharedMeshes:!sharedDisposed&&sharedGeometry===shared(enemyMotion)&&shared(laterEnemy)===shared(enemyMotion),
   independentFinish:firstPaint!==secondPaint&&firstPaint.map===secondPaint.map&&!firstPaint.color.equals(secondPaint.color),
   posesIndependent:heroMotion.rig.pelvis!==enemyMotion.rig.pelvis
  };
  battle.cover.clear();battle.field.cover={};
  const sameLevel=(unit,tile)=>terrainCell(unit.x,unit.z).level===terrainCell(tile.x,tile.z).level;
  const freeArmDrop=m=>{
   const arm=m.rig.arms.L;
   return world(arm.sh).y-arm.el.localToWorld(new THREE.Vector3(0,-.69,0)).y;
  };
  const motion=[];
  for(const unit of battle.units){
   const move=__ironVow.legalMoves(unit.id).find(tile=>tile.cost===1&&sameLevel(unit,tile));
   if(!move)throw Error('Salt Works trial needs a same-level, one-tile move for '+unit.name);
   const samples=[],plants=[];
   const combat=IronVowScene.combat,step=combat.step;
   combat.step=function(actor,m,p,side,amount){
    if(actor===unit)plants.push(side);
    return step(actor,m,p,side,amount);
   };
   let moving=true;
   const loop=new Promise(resolve=>{
    function frame(){
     if(!moving){resolve();return;}
     if(unit.motion){
      const {entry}=IronVowScene.models.get(unit.id),m=entry.m;
      samples.push({shift:m.rig.pelvis.position.x,freeArmDrop:freeArmDrop(m),
       carryUp:entry.primary.muzzle.getWorldDirection(new THREE.Vector3()).y,feet:m.rig.legs.map((leg,i)=>{
       const state=m.legs[i],pos=world(leg.an);
       const floor=IronVowScene.groundAt(pos.x,pos.z)+m.dims.ankleH*m.scale;
       return {pos:pos.toArray(),land:state.planted.toArray(),lift:state.swing,floor,
        error:pos.distanceTo(state.foot)};
      })});
     }
     requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
   });
   try{await moveUnit(unit,move.x,move.z);}finally{moving=false;combat.step=step;}
   await loop;
   motion.push({frame:unit.frame,arrived:unit.vx===move.x&&unit.vz===move.z,samples,plants});
  }

  // Set up a clear lane after movement so the aim and collapse checks use a
  // deterministic four-round exchange at the trial's normal firing pace.
  let lane;
  for(let z=1;z<battle.size.depth-1&&!lane;z++)
   for(let x=1;x<battle.size.width-3&&!lane;x++){
    const levels=[0,1,2].map(dx=>terrainCell(x+dx,z).level);
    if(levels.every(level=>level===levels[0]))lane=[x,z];
   }
  if(!lane)throw Error('Salt Works trial needs a clear two-tile firing lane');
  const [x,z]=lane;
  Object.assign(hero,{x,z,vx:x,vz:z,brace:true,braceBlend:1});
  Object.assign(enemy,{x:x+2,z,vx:x+2,vz:z});
  enemy.hp.body=enemy.max.body=10000;
  hero.ap=hero.apMax??10;
  await new Promise(resolve=>{
   const start=performance.now();
   function frame(t){if(t-start>=420)resolve();else requestAnimationFrame(frame);}
   requestAnimationFrame(frame);
  });
  const steady=rig(hero),brace=steady.rig.pelvis.position.y;
  const starts=IronVowScene.combat.history.length;
  const oldRandom=ruleRandom;ruleRandom=()=>.005;
  let monitoring=true,carriage=steady.nativeV2.source.getObjectByName('Carriage');
  const kicks=[],hits=[],arms=[];
  const monitor=new Promise(resolve=>{
   function frame(){
    if(!monitoring){resolve();return;}
    if(hero.attack&&Number.isFinite(hero.attack.fireAt)){
     kicks.push(carriage.position.y);
     hits.push(rig(enemy).s.pitch.x);
     arms.push(freeArmDrop(rig(hero)),freeArmDrop(rig(enemy)));
     __ironVow.snapshot();
    }
    requestAnimationFrame(frame);
   }
   requestAnimationFrame(frame);
  });
  try{await shoot(hero,enemy,'body');}finally{ruleRandom=oldRandom;monitoring=false;}
  await monitor;

  const log=IronVowScene.combat.history.slice(starts);
  const launch=log.filter(e=>e.type==='launch'&&e.actor===hero.id);
  const impact=log.filter(e=>e.type==='impact'&&e.target===enemy.id);
  const weapon={compression:steady.dims.py-brace,launch,impact,carriageKick:Math.max(...kicks)-Math.min(...kicks),
   hitPitch:Math.min(...hits),freeArmDrop:Math.min(...arms)};
  enemy.hp.body=0;beginDestruction(enemy);
  const death=[];
  for(const age of [0,.33,.55,.76,.92,1.5,2.2,4]){
   IronVowScene.render(enemy.deathTime+destructionTime(enemy,age),1/60);
   const m=rig(enemy),spine=world(m.rig.spine);
   const ground=IronVowScene.groundAt(spine.x,spine.z);
   death.push({age,root:m.cont.position.toArray(),roll:m.cont.rotation.z,
    height:spine.y-ground,
    matrix:m.cont.matrixWorld.toArray(),ankles:m.rig.legs.map(leg=>world(leg.an).toArray())});
  }
  return {asset,motion,weapon,death};
 });
 assert.deepEqual(checks.asset,{oneRequest:true,cassettes:[[false,false],[true,true]],sharedMeshes:true,independentFinish:true,posesIndependent:true});
 for(const move of checks.motion){
  assert.ok(move.arrived&&move.samples.length>=8,`Frame ${move.frame} completes its legal move`);
  assert.ok(move.plants.length>=3&&move.plants.every((side,i)=>i===0||side!==move.plants[i-1]),`Frame ${move.frame} alternates its footfalls: ${move.plants}`);
  const shifts=move.samples.map(sample=>sample.shift);
  assert.ok(Math.min(...shifts)<-.11&&Math.max(...shifts)>.11,'The chassis transfers weight to both sides');
  assert.ok(move.samples.every(sample=>sample.freeArmDrop>.70&&sample.carryUp>.98),'Marching keeps the free hand low and the carried rifle upright');
  let planted=0;
  for(const [i,sample] of move.samples.entries())for(const [side,foot] of sample.feet.entries()){
   if(foot.lift)continue;
   const prior=move.samples[i-1]?.feet[side];
   assert.ok(foot.error<.10&&Math.abs(foot.pos[1]-foot.floor)<.10,`Frame ${move.frame} reaches the terrain under its support foot: ${JSON.stringify(foot)}`);
   if(!prior||prior.lift||foot.land.some((value,index)=>Math.abs(value-prior.land[index])>.001))continue;
   assert.ok(Math.hypot(...foot.pos.map((value,index)=>value-prior.pos[index]))<.05,'A planted shoe stays in its foothold');
   planted++;
  }
  assert.ok(planted>=4,'The gait contains sustained footholds');
 }
 const {launch,impact,carriageKick,hitPitch,compression,freeArmDrop}=checks.weapon;
 assert.ok(compression>.14,`Brace compresses the suspension: ${compression}`);
 assert.equal(launch.length,4);
 assert.equal(impact.length,4);
 assert.ok(freeArmDrop>.70,'The free forearm stays low through the burst and hit reaction');
 for(const round of launch){
  assert.ok(round.mounted&&round.aimError<.012,'The actual mounted muzzle points along the shot');
  assert.deepEqual(round.origin,round.expectedOrigin);
 }
 assert.ok(carriageKick>.06&&hitPitch<-.04,`The firing carriage and receiving torso react: ${carriageKick}, ${hitPitch}`);
 const [standing,,kneel,,,,settled,held]=checks.death;
 assert.ok(standing.height-kneel.height>.6,'The wreck buckles before tipping');
 assert.ok(Math.abs(settled.roll)>1.4&&settled.height<2.7&&settled.height>0,'The wreck comes to rest on its side at board height');
 assert.deepEqual(held.matrix,settled.matrix);
 assert.deepEqual(held.ankles,settled.ankles);
 console.log(JSON.stringify({frames:checks.motion.map(({frame,plants})=>({frame,plants})),rounds:launch.length,
  impactCount:impact.length,carriageKick,hitPitch,death:checks.death.map(({age,height,roll})=>({age,height,roll}))}));
};
