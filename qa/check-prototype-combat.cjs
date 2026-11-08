const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const createSimulation = require('./sim-harness.cjs');

let sim, capture = false, poses = [];
const setTimeout = (callback, ms) => {
 if(capture){
  const start = sim.run('clock'), end = start + ms/1000;
  for(let t = start + .021; t < end; t += .031){
   const sample = JSON.parse(sim.run(`JSON.stringify((()=>{
    clock=${t};
    const u=current(), visual=activeWardenVisual(u);
    advanceUnitAnimation(u,clock,.031);
    const pose=animationPose(u,clock,visual),frame=wardenMotionFrame(u,visual,pose)?.frame;
    drawUnit(u,clock);
    for(const e of effects.filter(e=>e.type==='shot'))drawAttackEffect(e,clock);
    if(activeCinematic)drawAttackCamera(clock);
    return {index:frame?.index,level:frame?.level,clip:u.attack?.native?.clip,walking:!!u.motion,priming:pose.primePhase==='step'&&visual.motion.gait.includes(frame),
     advanced:recoilingBounds(u,unitBounds(u,visual),clock).x!==unitBounds(u,visual).x};
   })())`));
   if(sample.index!==undefined)poses.push(sample);
  }
  sim.run(`clock=${end}`);
 }
 callback();
 return 1;
};

(async()=>{
 sim = createSimulation({random:()=>0,setTimeout});
 const run = sim.run;
 run("save.units[0].level=2;save.units[0].xp=33;save.units[0].condition=68;save.units[0].paint='#577eac';save.units[0].upgrade=1");
 assert.equal(run('assignChassis(0,3)'),true);
 assert.equal(run('assignChassis(1,3)'),false);
 assert.equal(run('assignChassis(1,4)'),true);
 assert.equal(run("save.units.map(u=>u.weapon).join(',')"),'morrow,locust,missile');
 assert.equal(run('save.units[0].xp'),33);
 assert.equal(run('save.units[0].condition'),100);
 assert.equal(run('save.reserve[0].condition'),68);
 assert.equal(run('save.reserve[0].paint'),'#577eac');
 assert.equal(run('validSave(save)'),true);
 assert.equal(run("save.owned.includes('morrow')"),false);
 assert.equal(run('assignChassis(0,0)'),true);
 assert.equal(run('save.units[0].upgrade'),1);
 assert.equal(run('save.units[0].condition'),68);
 assert.equal(run('save.units[0].level'),2);
 assert.equal(run('assignChassis(0,3)'),true);
 run('deploy(0);closeModal()');
 assert.equal(run("battle.units.filter(u=>u.team==='ally').map(u=>u.frame).join(',')"),'3,4,2');
 assert.equal(run('assignChassis(0,0)'),false);
 assert.equal(run('movementLimit(battle.units[0])'),3);
 assert.equal(run('movementLimit(battle.units[1])'),4);

 for(const [index,x,z,id] of [[0,2,16,'morrow'],[1,3,18,'locust']]){
  run(`selected=${index}`);
  poses=[];capture=true;
  await run(`moveUnit(current(),${x},${z},1)`);
  capture=false;
  assert.equal(run('current().ap'),7);
  assert.ok(new Set(poses.filter(p=>p.walking).map(p=>p.index)).size>8,id+' uses animated gait');
  poses=[];
  const before=run('battle.units[4].hp.body');
  assert.ok(run('distance(current(),battle.units[4])<=unitWeapon(current()).range'));
  run('battle.busy=true');
  capture=true;
  await run("shoot(current(),battle.units[4],'body')");
  capture=false;
  run('battle.busy=false');
  assert.equal(run('current().ap'),3);
  assert.ok(run('battle.units[4].hp.body')<before);
  assert.ok(poses.some(p=>p.priming&&p.advanced),id+' takes a forward step before releasing');
  assert.ok(poses.some(p=>p.clip==='fire'&&p.level===.42),id+' reaches the first release pose');
  assert.ok(poses.some(p=>p.clip==='fire'&&p.level===.58),id+' reaches the second release pose');
  assert.ok(run(`(()=>{
   const shot=effects.find(e=>e.kind==='${id}'&&e.type==='shot');
   return shot.origins.length===2 && Math.hypot(shot.origins[0].ox-shot.origins[1].ox,shot.origins[0].oy-shot.origins[1].oy)>.04;
  })()`),id+' uses distinct emitter origins');
 }
 assert.equal(run("hitChance(battle.units[1],battle.units[3],'body',weapon('locust'))"),
              run("hitChance(battle.units[1],battle.units[3],'body',weapon('missile'))"));
 run('selected=0;current().hp.right=0');
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'fire'))"),false);
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'strike'))"),true);
 run('current().hp.right=100;battle.units[3].x=3;battle.units[3].z=16');
 poses=[];capture=true;
 await run("shoot(current(),battle.units[3],'body',weapon('breach-gauntlet'))");
 capture=false;
 assert.equal(run('current().ap'),0);
 assert.ok(poses.some(p=>p.clip==='strike'&&p.level===.54));
 run('selected=1;battle.units[5].x=4;battle.units[5].z=18');
 poses=[];capture=true;
 await run("shoot(current(),battle.units[5],'body',weapon('pulse-bash'))");
 capture=false;
 assert.equal(run('current().ap'),1);
 assert.ok(poses.some(p=>p.clip==='strike'&&p.level===.54));
 assert.ok(run('battle.units[5].hp.body<battle.units[5].max.body'));
 run('persist()');
 const saved=run('JSON.stringify(captureSortie())');
 const restored=createSimulation({storage:new Map(sim.storage)});
 assert.equal(restored.run('JSON.stringify(captureSortie())'),saved);
 assert.equal(restored.run('current().name'),'CICADA');
 assert.equal(restored.run('save.reserve[0].condition'),68);
 assert.equal(restored.run('save.units[0].level'),2);
 assert.equal(restored.run("validSave({...save,units:[save.units[0],save.units[0],save.units[2]]})"),false);

 for(const model of ['gatecrasher','cicada']){
  for(const face of ['left','right']){
   const data=JSON.parse(run(`JSON.stringify(prototypes.${model}.${face})`));
   assert.ok(data.ground>.7&&data.ground<.95);
   for(const clip of ['gait','fire','strike'])assert.ok(data.motion[clip].length>=15);
   for(const key of [data.key,data.motion.key]){
    for(const suffix of ['', '-paint'])assert.ok(fs.existsSync(path.join(__dirname,'../dist/assets',key+suffix+'.webp')));
   }
  }
 }
 console.log('PASS: reserve swaps preserve career data, both native gaits and salvos render in combat, strike and subsystem rules work, and the reassigned lance resumes from its checkpoint.');
})().catch(error=>{console.error(error);process.exitCode=1});
