const assert=require('node:assert/strict'),createSimulation=require('./sim-harness.cjs');
const projection='JSON.stringify(captureSortie())';
(async()=>{
 const sim=createSimulation({random:()=>0});sim.run('deploy(1,true);closeModal();skill()');await sim.run('moveUnit(current(),1,4,4)');await sim.run("shoot(current(),battle.units[3],'body')");sim.run("selected=1;skill();action='fire';targetPart='right';persist()");
 assert.equal(sim.run('battle.units[0].ap'),7);assert.equal(sim.run('battle.units[3].hp.body'),124);
 const expected=sim.run(projection),credits=sim.run('save.credits');
 for(let i=0;i<3;i++){const restored=createSimulation({storage:new Map(sim.storage),random:()=>0});assert.equal(restored.run('!!battle'),true);assert.equal(restored.run(projection),expected);assert.equal(restored.run('current().boost'),true);assert.equal(restored.run('save.credits'),credits)}
 // A pending enemy phase must replay once and return control with refreshed ally AP.
 sim.run('persist(true)');const pendingStorage=new Map(sim.storage);await sim.run('endTurn()');const afterEnemy=sim.run(projection);
 const resumedEnemy=createSimulation({storage:pendingStorage,random:()=>0});await resumedEnemy.flush();assert.equal(resumedEnemy.run('battle.phase'),'player');assert.equal(resumedEnemy.run('battle.turn'),2);assert.equal(resumedEnemy.run(projection),afterEnemy);
 const replayAgain=createSimulation({storage:new Map(resumedEnemy.storage),random:()=>0});await replayAgain.flush();assert.equal(replayAgain.run('battle.turn'),2);assert.equal(replayAgain.run(projection),afterEnemy);
 // Corrupt checkpoint data must not wipe the valid company record.
 const corrupt=new Map(sim.storage),record=JSON.parse(corrupt.get('iron-vow-career'));record.sortie.units[0].x=2;record.sortie.units[0].z=3;corrupt.set('iron-vow-career',JSON.stringify(record));const recovered=createSimulation({storage:corrupt});assert.equal(recovered.run('battle'),null);assert.equal(recovered.run('save.credits'),credits);assert.equal(recovered.run('save.sortie'),undefined);
 sim.run('finish(true);closeModal()');assert.equal(sim.run('save.sortie'),undefined);assert.equal(sim.run('save.wins'),1);const paid=sim.run('save.credits');const afterVictory=createSimulation({storage:new Map(sim.storage)});assert.equal(afterVictory.run('battle'),null);assert.equal(afterVictory.run('save.wins'),1);assert.equal(afterVictory.run('save.credits'),paid);
 // Reaching level 100 must remain a valid saved career, rather than reset at load.
 const veteran=createSimulation();veteran.run('save.units[0].level=99;save.units[0].xp=9899;deploy(0);closeModal();finish(true);closeModal()');assert.equal(veteran.run('save.units[0].level'),100);assert.equal(veteran.run('validSave(save)'),true);const restoredVeteran=createSimulation({storage:new Map(veteran.storage)});assert.equal(restoredVeteran.run('save.units[0].level'),100);
 const shared=new Map(),hangar=createSimulation({storage:shared}),staleShip=createSimulation({storage:shared});
 assert.equal(hangar.run('queueHangarUpgrade("fabrication")'),true);
 const currentSave=shared.get('iron-vow-career');
 staleShip.run('queueShipUpgrade("office");closeModal()');
 assert.equal(shared.get('iron-vow-career'),currentSave,'an earlier snapshot cannot write even before the storage event');
 assert.equal(staleShip.run('careerStale'),true);
 assert.equal(staleShip.node('#modal').hidden,false);
 console.log('PASS: exact sortie and enemy replay, corrupt checkpoint recovery, single payout, level-100 career and stale tab save protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
