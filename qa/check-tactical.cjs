const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

(async()=>{
 const sim=create({random:()=>0});
 for(let i=0;i<3;i++){
  sim.run(`createBattle(${i})`);
  assert.equal(sim.run('battle.size.width*battle.size.depth'),360);
  assert.equal(sim.run('battle.cover.size'),24);
  assert.equal(sim.run('battle.units.length'),8+i*2);
  assert.ok(sim.run("battle.units.every(u=>onBoard(u.x,u.z)&&!battle.cover.has(u.x+','+u.z))"));
  assert.ok(sim.run("new Set(battle.units.map(u=>u.x+','+u.z)).size===battle.units.length"));
  assert.ok(sim.run("battle.units.filter(u=>u.kind).every(u=>Object.keys(u.hp).join()==='body')"));
 }
 sim.run("createBattle(0);selected=0;persist()");
 const stored=sim.run('JSON.stringify(captureSortie())');
 const restored=create({storage:new Map(sim.storage)});
 assert.equal(restored.run('JSON.stringify(captureSortie())'),stored);
 assert.equal(restored.run('captureSortie().version'),2);

 sim.run("createBattle(0);selected=0;battle.units[0].x=17;battle.units[0].z=19");
 assert.equal(sim.run("onBoard(17,19)&&!onBoard(18,19)&&!onBoard(17,20)"),true);
 assert.ok(sim.run("[...paths(current()).keys()].every(key=>onBoard(...key.split(',').map(Number)))"));
 assert.ok(sim.run(`(()=>{
  const heli=battle.units.find(u=>u.kind==='helicopter');
  heli.x=9;heli.z=9;battle.cover=new Set(['10,9','9,8','9,10','8,9']);
  return !paths(heli).has('10,9')&&paths(heli).has('11,9')&&route(heli,11,9).length===2&&!inCover(heli)&&!canReachTarget(weapon('breaker'),heli);
 })()`));

 const timers=new Map();let timerId=0;
 const live=create({random:()=>0,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id}});
 live.sandbox.clearTimeout=id=>timers.delete(id);
 live.run("createBattle(0);selected=0;battle.busy=true;current().weapon='rail';globalThis.vehicle=battle.units.find(u=>u.kind==='tank')");
 const kill=live.run("shoot(current(),vehicle,'right')");
 assert.equal(live.run("activeCinematic.phase"),'aim');
 assert.equal(live.run('current().ap'),3);
 assert.equal(live.run('vehicle.hp.body'),64);
 assert.ok([...timers.values()][0].ms>800);
 live.run('draw(16);skipAttackCamera();skipAttackCamera()');
 await kill;
 assert.equal(live.run('activeCinematic'),null);
 assert.equal(live.run('vehicle.hp.body'),0);
 assert.equal(live.run('save.kills'),1);
 assert.equal(live.run('save.units[0].xp'),20);
 assert.equal(live.run('current().ap'),3);
 assert.equal(live.run("effects.filter(e=>e.type==='boom').length"),1);

 const miss=create({random:()=>.9999});
 miss.run('createBattle(0);battle.busy=true');
 await miss.run("shoot(current(),battle.units.find(u=>u.kind==='tank'),'body')");
 assert.equal(miss.run("battle.units.find(u=>u.kind==='tank').hp.body"),64);
 assert.equal(miss.run("effects.some(e=>e.type==='boom')"),false);

 const reduced=create({reducedMotion:true});
 reduced.run('createBattle(0);battle.busy=true');
 assert.equal(reduced.run("beginAttackCamera(current(),battle.units[3],weapon('rifle'),'body')"),null);
 console.log('PASS: expanded deployment, vehicle HP and XP, air traversal, version-2 restore, attack skip and exactly-once damage, miss, and reduced motion.');
})().catch(e=>{console.error(e);process.exitCode=1});
