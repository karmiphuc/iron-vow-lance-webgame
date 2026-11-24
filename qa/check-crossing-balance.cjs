const assert = require('node:assert/strict');
const simulate = require('./sim-harness.cjs');

// A stock lance screens at weapon range while the damaged ally uses the
// western service road. All moves, fire, counters and damage use battle rules.
const escortPolicy = `async () => {
 const flint = crew[2];
 if (flint.alive) {
  if (flint.z < 13) flint.distressOrder = {kind:'move',x:3,z:13};
  else delete flint.distressOrder;
 }
 for (const u of battle.units.filter(t => t.team === 'ally' && !t.distressAlly && t.alive)) {
  const w = unitWeapon(u), foes = battle.units.filter(t => t.team === 'enemy' && t.alive);
  const choices = [...movementPlans(u).values()].flatMap(plan => {
   const next = {...u,x:plan.x,z:plan.z,ap:u.ap-plan.ap};
   return foes.map(t => ({
    plan,t,
    reachable:canUseWeapon(next,w) && distance(next,t)<=combatRange(next,t,w) && !attackObstruction(next,t,w),
    score:(t.kind==='tank'?3:0)+Math.max(0,6-distance(t,flint))*3+(1-t.hp.body/t.max.body)*15-Math.abs(distance(next,t)-w.range)*2-plan.ap*.3+Number(inCover(next))*2
   }));
  });
  choices.sort((a,b) => Number(b.reachable)-Number(a.reachable) || b.score-a.score);
  const {plan,t} = choices[0];
  if (plan.x!==u.x || plan.z!==u.z) await moveUnit(u,plan.x,plan.z);
  while (u.alive && t.alive && canUseWeapon(u,w) && distance(u,t)<=combatRange(u,t,w) && !attackObstruction(u,t,w)) {
   await engage(u,t,'body',w);
  }
  if (checkEnd()) return;
 }
}`;

async function sortie(seed, assist) {
 const sim = simulate({seed,reducedMotion:true,persistedComRandom:true});
 sim.run(`
 const i = CONTRACTS.findIndex(c=>c.distress==='crossing'), port = CONTRACTS[i].port;
 save.overworld = {port, arrears:0};
 save.world = worldRules.createWorld(${seed},save.day);
 deploy(i,false,LANCE_SLOTS,null,null,availableOffers(port).find(o=>o.templateIndex===i));
 closeModal();
 const crew = battle.units.filter(u=>u.distressAlly);
 const support = ${escortPolicy};
 `);
 for (let round=1; round<=8 && sim.run('!!battle'); round++) {
  if (assist) await sim.run('support()');
  if (sim.run('!!battle')) await sim.run('endTurn()');
  if (round<=2) {
   assert.equal(sim.run('crew.filter(u=>u.alive).length'),3,'opening cannot kill or auto-extract anyone');
  }
 }
 return sim.run('crew.filter(u=>u.extracted).length');
}

(async () => {
 let idleFull=0, assistedFull=0;
 for (let seed=1; seed<=8; seed++) {
  if (await sortie(seed,false)===3) idleFull++;
  if (await sortie(seed,true)===3) assistedFull++;
 }
 assert.ok(idleFull<=2,'unattended bonus rescue should carry risk');
 assert.ok(assistedFull>=5 && assistedFull>idleFull,'the escort must materially improve full rescue outcomes');
 console.log('PASS Broken Crossing, all three rescued by round 8: idle '+idleFull+'/8, escorted '+assistedFull+'/8');
})().catch(error=>{console.error(error);process.exitCode=1});
