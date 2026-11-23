const assert=require('node:assert/strict');

module.exports=async function checkSaltjackMotion({page,origin,mobile,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 const trial=new URL('?bench=war&trial=salt-works',origin).href;
 await page.goto(trial,{waitUntil:'domcontentloaded'});
 await checkCombatReady(page,mobile,tap);
 await page.goto(trial,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>IronVowScene.ready&&battle?.units.length===2&&battle.units.every(unit=>
  IronVowScene.models.get(unit.id)?.entry?.primary?.id==='rifle'),null,{timeout:90000});

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
      samples.push({shift:m.rig.pelvis.position.x,freeArmDrop:freeArmDrop(m),moveAge:entry.time-unit.motion.start,
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
  // deterministic stock-rifle exchange at the trial's normal firing pace.
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
  const dying=[enemy,hero];
  for(const unit of dying){
   unit.hp.body=0;beginDestruction(unit);
  }
  const death=dying.map(unit=>({frame:unit.frame,samples:[]}));
  const terrainGap=root=>{
   let gap=Infinity;
   const point=new THREE.Vector3();
   root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const position=mesh.geometry.attributes.position,data=position.array??position.data.array;
    const divisor=position.normalized&&data instanceof Int16Array?32767:1;
    for(let i=0;i<position.count;i++){
     point.fromBufferAttribute(position,i).divideScalar(divisor).applyMatrix4(mesh.matrixWorld);
     gap=Math.min(gap,point.y-IronVowScene.groundAt(point.x,point.z));
    }
   });
   return gap;
  };
  for(const age of [0,.33,.55,.76,.92,1.5,2.2,4]){
   // Render in increasing scene time for both field rigs.
   IronVowScene.render(enemy.deathTime+destructionTime(enemy,age),1/60);
   for(const [i,unit] of dying.entries()){
    const m=rig(unit),spine=world(m.rig.spine);
    const ground=IronVowScene.groundAt(spine.x,spine.z);
    const knees=m.rig.legs.map(leg=>leg.kn.rotation.x);
    const ankles=m.rig.legs.map(leg=>world(leg.an));
    const forward=new THREE.Vector3(Math.sin(m.yaw),0,Math.cos(m.yaw));
    death[i].samples.push({age,roll:m.cont.rotation.z,height:spine.y-ground,knees,
     forwardSplit:ankles[1].clone().sub(ankles[0]).dot(forward),
     matrix:m.cont.matrixWorld.toArray(),ankles:ankles.map(ankle=>ankle.toArray())});
    if(age===1.5){
     const gun=IronVowScene.models.get(unit.id).entry.primary.mount;
     const weapon=terrainGap(gun);
     gun.visible=false;
     try{death[i].contact={weapon,hull:terrainGap(m.body)};}finally{gun.visible=true;}
    }
   }
  }
  return {asset,motion,weapon,death};
 });
 assert.deepEqual(checks.asset,{oneRequest:true,cassettes:[[false,false],[true,true]],sharedMeshes:true,independentFinish:true,posesIndependent:true});
 for(const move of checks.motion){
  assert.ok(move.arrived&&move.samples.length>=8,`Frame ${move.frame} completes its legal move`);
  assert.ok(move.plants.length>=3&&move.plants.every((side,i)=>i===0||side!==move.plants[i-1]),`Frame ${move.frame} alternates its footfalls: ${move.plants}`);
  const shifts=move.samples.map(sample=>sample.shift);
  assert.ok(Math.min(...shifts)<-.11&&Math.max(...shifts)>.11,'The chassis transfers weight to both sides');
  assert.ok(move.samples.every(sample=>sample.freeArmDrop>.70),'Marching keeps the free hand low');
  const marching=move.samples.filter(sample=>sample.moveAge>=.12);
  assert.ok(marching.length>=4&&marching.every(sample=>sample.carryUp<.60),
   `Frame ${move.frame} lowers the rifle for the sustained march: ${JSON.stringify(marching.map(({moveAge,carryUp})=>({moveAge,carryUp})))}`);
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
 assert.equal(launch.length,8);
 assert.equal(impact.length,8);
 assert.ok(freeArmDrop>.70,'The free forearm stays low through the burst and hit reaction');
 for(const round of launch){
  assert.ok(round.mounted&&round.aimError<.012,'The actual mounted muzzle points along the shot');
  assert.deepEqual(round.origin,round.expectedOrigin);
 }
 assert.ok(carriageKick>.06&&hitPitch<-.04,`The firing carriage and receiving torso react: ${carriageKick}, ${hitPitch}`);
 for(const {frame,samples,contact} of checks.death){
  const [standing,givingWay,kneel,,,,settled,held]=samples;
  assert.ok(givingWay.knees[0]-givingWay.knees[1]>.28,`Frame ${frame} loses the left knee first: ${givingWay.knees}`);
  assert.ok(standing.height-Math.min(givingWay.height,kneel.height)>.50,
   `Frame ${frame} buckles before tipping: standing ${standing.height}, folding ${givingWay.height}, kneeling ${kneel.height}`);
  assert.ok(Math.abs(settled.roll)>1.4&&settled.height>0,
   `Frame ${frame} comes to rest on its side: roll ${settled.roll}, spine height ${settled.height}`);
  assert.ok(settled.knees[0]-settled.knees[1]>1&&settled.forwardSplit>1,
   `Frame ${frame} rests with one leg folded and the other ahead: ${settled.knees}, ${settled.forwardSplit}`);
  assert.ok(Math.abs(contact.hull)<.08&&contact.weapon>.20,
   `Frame ${frame} puts its armor on the terrain with its rifle clear: ${JSON.stringify(contact)}`);
  assert.deepEqual(held.matrix,settled.matrix);
  assert.deepEqual(held.ankles,settled.ankles);
 }
 console.log(JSON.stringify({frames:checks.motion.map(({frame,plants})=>({frame,plants})),rounds:launch.length,
  impactCount:impact.length,carriageKick,hitPitch,death:checks.death.map(({frame,samples,contact})=>({frame,contact,
   samples:samples.map(({age,height,roll,knees,forwardSplit})=>({age,height,roll,knees,forwardSplit}))}))}));
};

async function checkCombatReady(page,mobile,tap){
 await page.waitForFunction(()=>IronVowScene.ready&&battle?.units.length===2,null,{timeout:90000});
 const setup=await page.evaluate(async()=>{
  const [hero,enemy]=battle.units;
  const actors=[hero,enemy];
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const bore=unit=>IronVowScene.models.get(unit.id).entry.primary.muzzle.getWorldDirection(new THREE.Vector3());
  const sample=()=>actors.map(unit=>bore(unit).y);
  const idle=async pick=>{
   const random=Math.random;
   Math.random=()=>pick;
   try{
    for(const unit of actors)Object.assign(unit,{brace:true,braceBlend:1});
    await wait(230);
    for(const unit of actors)Object.assign(unit,{brace:false,braceBlend:0});
    await wait(650);
    const first=sample();
    await wait(250);
    return [first,sample()];
   }finally{Math.random=random;}
  };
  const guard=await idle(.01);
  // The move clock comes from the game. Drop the opening GPU frames to exercise
  // the first visible pose on a slow render, while the move still runs normally.
  const move=__ironVow.legalMoves(hero.id).find(tile=>tile.cost===1&&terrainCell(hero.x,hero.z).level===terrainCell(tile.x,tile.z).level);
  if(!move)throw Error('Expected one clear same-level step from the trial start');
  const render=IronVowScene.render;
  let lateWalk=null;
  IronVowScene.render=function(time,dt){
   const age=hero.motion?time-hero.motion.start:null;
   if(age!==null&&age<.18)return;
   render(time,dt);
   if(age!==null&&!lateWalk)lateWalk={age,carryUp:bore(hero).y};
  };
  try{await moveUnit(hero,move.x,move.z);}finally{IronVowScene.render=render;}
  const rest=await idle(.99);
  battle.cover.clear();battle.field.cover={};
  for(const cell of battle.field.cells)cell.level=0;
  const x=Math.floor(battle.size.width/2),z=Math.floor(battle.size.depth/2);
  Object.assign(hero,{x:x-1,z,vx:x-1,vz:z,ap:15});
  Object.assign(enemy,{x:x+1,z,vx:x+1,vz:z,ap:15});
  hero.hp.body=hero.max.body=10000;
  enemy.hp.body=enemy.max.body=10000;
  action='move';lockedTarget=null;
  Object.assign(fieldCamera,{x:enemy.x,z:enemy.z,overview:false});
  IronVowScene.clear();
  await wait(900);
  const projected=IronVowScene.projectWorld(IronVowScene.models.get(enemy.id).proxy.position);
  const points=[0,8,-8,16,-16].flatMap(dx=>[0,8,-8,16,-16].map(dy=>({x:projected.x+dx,y:projected.y+dy})));
  const point=points.find(({x,y})=>document.elementFromPoint(x,y)===document.querySelector('#scene')&&IronVowScene.pick(x,y)===enemy);
  return {guard,rest,point,lateWalk};
 });
 assert.ok(setup.guard.flat().every(up=>up>.95),`Both randomly selected guards carry upright: ${setup.guard}`);
 assert.ok(setup.rest.flat().every(up=>up>.15&&up<.60),`Both other idle samples carry the rifle forward: ${setup.rest}`);
 assert.ok(setup.lateWalk&&setup.lateWalk.carryUp<.60,
  `The first late march frame already has the weapon lowered: ${JSON.stringify(setup.lateWalk)}`);
 assert.ok(setup.point,'The Garrison is selectable through the visible battle canvas');
 const {x,y}=setup.point;
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.waitForFunction(()=>action==='fire'&&lockedTarget===battle.units[1].id);
 const alignment=async()=>page.evaluate(()=>{
  const [hero,enemy]=battle.units,entry=IronVowScene.models.get(hero.id).entry,muzzle=entry.primary.muzzle;
  const direction=IronVowScene.partPoint(enemy,'body').sub(muzzle.getWorldPosition(new THREE.Vector3())).normalize();
  return muzzle.getWorldDirection(new THREE.Vector3()).dot(direction);
 });
 await page.waitForFunction(()=>IronVowScene.models.get(current().id).entry.m.saltMotion.shouldered>.995);
 assert.ok(await alignment()>.995,'Selecting the Garrison shoulders the actual rifle and tracks its body');
 await tap('#brace');
 assert.ok(await alignment()>.995,'Bracing keeps the rifle on the acquired target');
 const enemyAttack=await page.evaluate(async()=>{
  const [hero,enemy]=battle.units;
  const random=ruleRandom,visualRandom=Math.random;
  ruleRandom=()=>.005;Math.random=()=>.99;
  const start=IronVowScene.combat.history.length;
  try{await shoot(enemy,hero,'body');await new Promise(resolve=>setTimeout(resolve,650));}
  finally{ruleRandom=random;Math.random=visualRandom;}
  const shots=IronVowScene.combat.history.slice(start).filter(event=>event.type==='launch'&&event.actor===enemy.id);
  const entry=IronVowScene.models.get(enemy.id).entry;
  return {error:Math.max(...shots.map(event=>event.aimError)),shots:shots.length,
   recovery:entry.primary.muzzle.getWorldDirection(new THREE.Vector3()).y};
 });
 assert.equal(enemyAttack.shots,8,'The Garrison fires a real stock volley');
 assert.ok(enemyAttack.error<.012,`Garrison mounted weapon follows the real attack line: ${enemyAttack.error}`);
 assert.ok(enemyAttack.recovery>.15&&enemyAttack.recovery<.60,`Garrison recovers to its sampled idle: ${enemyAttack.recovery}`);
 console.log(JSON.stringify({readyPose:{idle:setup.guard,carry:setup.rest,lateWalk:setup.lateWalk,garrison:enemyAttack,selectedAim:await alignment()}}));
}
