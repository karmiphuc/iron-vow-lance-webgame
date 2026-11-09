const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

(async()=>{
 const sim=create({random:()=>0});
 for(const [i,count] of [7,8,10,12].entries()){
  sim.run(`createBattle(${i})`);
  assert.equal(sim.run('battle.size.width*battle.size.depth'),360);
  assert.equal(sim.run('battle.cover.size'),24);
  assert.equal(sim.run('battle.units.length'),count);
  assert.ok(sim.run("battle.units.every(u=>onBoard(u.x,u.z)&&!battle.cover.has(u.x+','+u.z))"));
  assert.ok(sim.run("new Set(battle.units.map(u=>u.x+','+u.z)).size===battle.units.length"));
  assert.ok(sim.run("battle.units.filter(u=>u.kind).every(u=>Object.keys(u.hp).join()==='body')"));
 }
 sim.run("createBattle(0);selected=0;persist()");
 const stored=sim.run('JSON.stringify(captureSortie())');
 const restored=create({storage:new Map(sim.storage)});
 assert.equal(restored.run('JSON.stringify(captureSortie())'),stored);
 assert.equal(restored.run('captureSortie().version'),7);

 assert.equal(restored.run('battle.contract.id'),'picket');
 assert.equal(restored.run("battle.units.slice(3).map(u=>u.kind||'mech').join()"),'mech,mech,tank,helicopter');
 assert.equal(restored.run("CONTRACTS[1].id"),'relay');
 assert.equal(restored.run("CONTRACTS[1].deployment.length"),5);
 assert.equal(restored.run("const reserve=save.credits;finish(true);save.credits-reserve"),2000);
 assert.equal(restored.run('save.history.at(-1).pay'),2000);

 for(const [oldIndex,id] of ['relay','corridor','frontier'].entries()){
  for(const oldVersion of [1,2]){
   const original=create();
   original.run(`createBattle(${oldIndex+1},${oldVersion===1},true);battle.units.forEach(u=>u.heading=defaultHeading(u));persist()`);
   const career=JSON.parse(original.storage.get('iron-vow-career'));
   career.sortie.version=oldVersion;
   career.sortie.contract=oldIndex;
   delete career.sortie.legacy;
   career.sortie.units.forEach(u=>delete u.hp.pilot);
   const migrated=create({storage:new Map([['iron-vow-career',JSON.stringify(career)]])});
   assert.equal(migrated.run('battle.contract.id'),id);
   assert.equal(migrated.run('battle.size.width'),oldVersion===1?10:18);
   assert.equal(migrated.run('JSON.stringify(captureSortie().units)'),original.run('JSON.stringify(captureSortie().units)'));
  }
 }

 const crashes=create();
 crashes.run("createBattle(0);globalThis.gunship=battle.units.find(u=>u.kind==='helicopter');gunship.hp.body=0;beginDestruction(gunship)");
 assert.equal(crashes.run("vehicleWreckVisible(gunship,.2)"),false);
 assert.equal(crashes.run("vehicleWreckVisible(gunship,.5)"),true);
 crashes.run('updateDestruction(gunship,.5);updateDestruction(gunship,.6);persist()');
 assert.equal(crashes.run("effects.filter(e=>e.type==='detonation').length"),1);
 const resumedWreck=create({storage:new Map(crashes.storage)});
 assert.ok(resumedWreck.run(`(()=>{
  const wreck=battle.units.find(u=>u.kind==='helicopter'), bounds=vehicleBounds(wreck,0), ground=project(wreck.vx,0,wreck.vz);
  return vehicleWreckVisible(wreck,0)&&Math.abs(bounds.y+bounds.h*.72-ground.y)<1e-6;
 })()`));

 sim.run("createBattle(0);selected=0;battle.units[0].x=17;battle.units[0].z=19");
 assert.equal(sim.run("onBoard(17,19)&&!onBoard(18,19)&&!onBoard(17,20)"),true);
 assert.ok(sim.run("[...paths(current()).keys()].every(key=>onBoard(...key.split(',').map(Number)))"));
 assert.ok(sim.run(`(()=>{
  const heli=battle.units.find(u=>u.kind==='helicopter');
  heli.x=9;heli.z=9;battle.cover=new Set(['10,9','9,8','9,10','8,9']);
  return !paths(heli).has('10,9')&&paths(heli).has('11,9')&&route(heli,11,9).length===2&&!inCover(heli)&&!canReachTarget(weapon('breaker'),heli);
 })()`));

 const range=create();
 range.run(`createBattle(0);action='fire';const drawnTargets=[];targetingTile=(x,z,locked=false)=>drawnTargets.push({x,z,locked});
  const contact=battle.units.find(u=>u.kind==='tank');contact.x=contact.vx=2;contact.z=contact.vz=16;lockedTarget=contact.id;battlefield(0)`);
 assert.ok(range.run("drawnTargets.some(tile=>tile.x===2&&tile.z===16&&tile.locked)"));
 assert.ok(range.run("drawnTargets.every(tile=>distance(current(),tile)>0&&distance(current(),tile)<=weapon(current().weapon).range)"));
 range.run("drawnTargets.length=0;battle.busy=true;battlefield(0)");
 assert.equal(range.run("drawnTargets.length"),0);

 const timers=new Map();let timerId=0;
 const live=create({random:()=>0,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id}});
 live.sandbox.clearTimeout=id=>timers.delete(id);
 live.run("createBattle(0);selected=0;battle.busy=true;current().weapon='rail';globalThis.vehicle=battle.units.find(u=>u.kind==='tank');current().heading=headingTo(vehicle.x-current().x,vehicle.z-current().z)");
 const kill=live.run("shoot(current(),vehicle,'right')");
 assert.equal(live.run("activeCinematic.phase"),'aim');
 assert.equal(live.run('current().ap'),3);
 assert.equal(live.run('vehicle.hp.body'),64);
 assert.equal([...timers.values()][0].ms,600);
 assert.equal(live.run('animationPose(current(),.3).primePhase'),'step');
 assert.equal(live.run('animationPose(current(),.3).primeProgress'),.5);
 assert.equal(live.run('current().attack.fireAt'),null);
 const [plantId,plant]=[...timers][0];timers.delete(plantId);
 live.run('draw(600)');plant.fn();await live.flush();
 assert.equal(live.run('animationPose(current(),clock).primePhase'),'planted');
 assert.equal(live.run('current().attack.fireAt'),null);
 assert.equal(live.run("effects.filter(e=>e.attackPlant).length"),1);
 assert.equal(live.run('vehicle.hp.body'),64);
 assert.equal([...timers.values()][0].ms,510);
 live.run('skipAttackCamera();skipAttackCamera()');
 await kill;
 assert.equal(live.run('activeCinematic'),null);
 assert.equal(live.run('vehicle.hp.body'),0);
 assert.equal(live.run('save.kills'),1);
 assert.equal(live.run('save.units[0].xp'),20);
 assert.equal(live.run('current().ap'),3);
 assert.equal(live.run("effects.filter(e=>e.type==='boom').length"),1);

 const exchanges=create({random:()=>0});
 exchanges.run(`createBattle(0,false,false,[0]);battle.busy=true;const ally=current(),foe=battle.units[1];
  foe.x=ally.x+1;foe.z=ally.z;ally.heading=FIELD_HEADINGS[2];
  const moments=[];const cue=waitAttack;
  waitAttack=(ms,sequence)=>{
   moments.push({active:!!activeCinematic&&activeCinematic===sequence,sequence,actor:sequence?.actor.id,
    reaction:sequence?.reaction,phase:sequence?.phase,prime:animationPose(sequence?.actor??ally,clock).primePhase});
   return cue(ms,sequence);
  };`);
 const exchange=exchanges.run("engage(ally,foe,'body',weapon('rifle'))");
 assert.equal(exchanges.run("activeCinematic?.actor===ally&&ally.turning"),true,'split screen opens before the turning beat');
 await exchange;
 assert.ok(exchanges.run("moments.every(m=>m.active&&m.sequence===moments[0].sequence)"),'one uninterrupted split screen');
 assert.ok(exchanges.run("moments.some(m=>m.actor===ally.id&&m.prime==='step')"),'initial attack plants inside split screen');
 assert.ok(exchanges.run("moments.some(m=>m.actor===foe.id&&m.reaction&&m.phase==='fire')"),'return shot is shown');
 assert.equal(exchanges.run('activeCinematic'),null);
 assert.equal(exchanges.run('ally.ap'),5);
 assert.equal(exchanges.run('foe.ap'),8);

 const hostile=create({random:()=>0});
 hostile.run(`createBattle(0,false,false,[0,1]);battle.busy=true;battle.phase='enemy';
  const [first,second,foe]=battle.units;first.x=foe.x+1;first.z=foe.z;second.x=foe.x;second.z=foe.z+1;
  const openings=[];const open=beginAttackCamera;
  beginAttackCamera=(...args)=>{const shot=open(...args);if(shot)openings.push(shot);return shot};
  const attack=target=>engage(foe,target,'body',weapon('rifle'));`);
 const skipped=hostile.run('const pending=attack(first);skipAttackCamera();pending');
 await skipped;
 assert.equal(hostile.run('activeCinematic'),null);
 assert.equal(hostile.run('first.reacted'),true,'skip still resolves the eligible counter');
 await hostile.run('attack(second)');
 assert.equal(hostile.run('openings.length'),2,'a later enemy exchange also opens the camera');
 assert.equal(hostile.run('openings[1].actor===second&&openings[1].reaction'),true);
 assert.equal(hostile.run('activeCinematic'),null);

 const miss=create({random:()=>.9999});
 miss.run('createBattle(0);battle.busy=true');
 await miss.run("shoot(current(),battle.units.find(u=>u.kind==='tank'),'body')");
 assert.equal(miss.run("battle.units.find(u=>u.kind==='tank').hp.body"),64);
 assert.equal(miss.run("effects.some(e=>e.type==='boom')"),false);

 const reduced=create({reducedMotion:true});
 reduced.run('createBattle(0);battle.busy=true');
 assert.equal(reduced.run("beginAttackCamera(current(),battle.units[3],weapon('rifle'),'body')"),null);
 const reducedAttack=reduced.run("shoot(current(),battle.units[3],'body')");
 assert.equal(reduced.run('current().attack.primeDuration'),0);
 await reducedAttack;

 for(const [actor,kind] of [['current()','breaker'],['battle.units[3]','rampart'],['battle.units[4]','rampart'],['current()','cleaver']]){
  const firing=create({random:()=>0});
  firing.run(`createBattle(0);globalThis.actor=${actor};globalThis.target=actor.team==='ally'?battle.units[3]:current();actor.heading=headingTo(target.x-actor.x,target.z-actor.z);`);
  if(kind==='cleaver')firing.run('actor.hp.legs=0');
  const willPrime=!firing.run('actor.kind')&&kind!=='cleaver';
  const attack=firing.run(`shoot(actor,target,'body',actor.kind?unitWeapon(actor):weapon('${kind}'))`);
  assert.equal(firing.run('actor.attack.primeDuration'),willPrime?.60:0);
  if(willPrime){
   assert.equal(firing.run('animationPose(actor,.25).primePhase'),'step');
   assert.equal(firing.run('animationPose(actor,.61).primePhase'),'planted');
   assert.equal(firing.run('animationPose(actor,.25).strikeProgress'),0);
  }
  await attack;
  assert.equal(firing.run('actor.attack'),null);
 }
 console.log('PASS: opening and original contract rosters, exact 2,000-credit payout, v1/v2/v3 checkpoint restore, grounded wreck after reload, one detonation, vehicle XP and air traversal, priming for allied and enemy mechs, attack skip and reduced motion.');
})().catch(e=>{console.error(e);process.exitCode=1});
