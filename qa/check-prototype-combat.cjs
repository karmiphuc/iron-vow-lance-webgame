const assert = require('node:assert/strict');
const createSimulation = require('./sim-harness.cjs');

let sim, capture = false, poses = [];
const setTimeout = (callback, ms) => {
 if(capture){
  const start = sim.run('clock'), end = start + ms/1000;
  for(let t = start + .021; t < end; t += .031){
   const sample = JSON.parse(sim.run(`JSON.stringify((()=>{
    clock=${t};
    const u=current();
    advanceUnitAnimation(u,clock,.031);
    const pose=animationPose(u,clock);
    return {phase:pose.phase,walking:!!u.motion,priming:pose.primePhase==='step',
     aim:pose.aim,strike:pose.strikeProgress,fired:Number.isFinite(u.attack?.fireAt),windup:u.attack?.windup,
     advanced:pose.primeProgress>0};
   })())`));
   poses.push(sample);
  }
  sim.run(`clock=${end}`);
 }
 callback();
 return 1;
};

(async()=>{
 sim = createSimulation({random:()=>0,setTimeout});
 const run = sim.run;
 run("save.credits=FRAMES[3].cost+FRAMES[4].cost;save.units[0].level=2;save.units[0].xp=33;save.units[0].condition=68;save.units[0].paint='#577eac';save.units[0].upgrade=1");
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
 run("save.owned.push('cleaver');save.units[0].melee='cleaver'");
 run('deploy(0);closeModal()');
 assert.equal(run("battle.units.filter(u=>u.team==='ally').map(u=>u.frame).join(',')"),'3,4,2');
 assert.equal(run('assignChassis(0,0)'),false);
 assert.equal(run('freeMovement(battle.units[0])'),3);
 assert.equal(run('freeMovement(battle.units[1])'),4);

 for(const [index,x,z,id] of [[0,2,16,'morrow'],[1,3,18,'locust']]){
  run(`selected=${index}`);
  poses=[];capture=true;
  await run(`moveUnit(current(),${x},${z},1)`);
  capture=false;
  assert.equal(run('current().ap'),8);
  assert.ok(new Set(poses.filter(p=>p.walking).map(p=>p.phase)).size>8,id+' advances the live gait clock');
  poses=[];
  const before=run('battle.units[4].hp.body');
  assert.ok(run('distance(current(),battle.units[4])<=unitWeapon(current()).range'));
  run('battle.busy=true');
  capture=true;
  await run("shoot(current(),battle.units[4],'body')");
  capture=false;
  run('battle.busy=false');
  assert.equal(run('current().ap'),4);
  assert.ok(run('battle.units[4].hp.body')<before);
  assert.ok(poses.some(p=>p.priming&&p.advanced),id+' takes a forward step before releasing');
  assert.ok(poses.some(p=>p.fired&&p.aim>.9&&Math.abs(p.windup-.42*56/30)<1e-6),id+' preserves its release timing');
  // browser/gatecrasher-v2 and browser/cicada-v2 verify distinct authored emitters.
 }
 assert.equal(run("hitChance(battle.units[1],battle.units[3],'body',weapon('locust'))"),
              run("hitChance(battle.units[1],battle.units[3],'body',weapon('missile'))"));
 run('selected=0;current().hp.right=0');
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'fire'))"),false);
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'strike'))"),true);
 run('current().hp.right=100;battle.units[3].x=3;battle.units[3].z=16');
 poses=[];capture=true;
 await run("shoot(current(),battle.units[3],'body',selectedWeapon(current(),'strike'))");
 capture=false;
 assert.equal(run('current().ap'),2);
 assert.ok(poses.some(p=>p.fired&&p.strike>.5&&Math.abs(p.windup-.34*1.05)<1e-6));
 run('selected=1;battle.units[5].x=4;battle.units[5].z=18');
 poses=[];capture=true;
 await run("shoot(current(),battle.units[5],'body',weapon('pulse-bash'))");
 capture=false;
 assert.equal(run('current().ap'),2);
 assert.ok(poses.some(p=>p.fired&&p.strike>.5&&Math.abs(p.windup-.34*1.05)<1e-6));
 assert.ok(run('battle.units[5].hp.body<battle.units[5].max.body'));
 run('persist()');
 const saved=run('JSON.stringify(captureSortie())');
 const restored=createSimulation({storage:new Map(sim.storage)});
 assert.equal(restored.run('JSON.stringify(captureSortie())'),saved);
 assert.equal(restored.run('current().name'),'CICADA');
 assert.equal(restored.run('save.reserve[0].condition'),68);
 assert.equal(restored.run('save.units[0].level'),2);
 assert.equal(restored.run("validSave({...save,units:[save.units[0],save.units[0],save.units[2]]})"),false);

 console.log('PASS: reserve swaps preserve career data, both hulls advance the live gait and retain salvo timing, strike and subsystem rules work, and the reassigned lance resumes from its checkpoint.');
})().catch(error=>{console.error(error);process.exitCode=1});
