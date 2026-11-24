const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

function checkTraining(){
 for(let kind=0;kind<8;kind++)for(const foundation of [0,1,2]){
  const sim=simulate(),run=sim.run,slot=kind<3?kind:0;
  if(kind>=3)assert.ok(run(`hirePilot(${kind})&&assignPilot(0,${kind})`));
  const paths=JSON.parse(run(`JSON.stringify(PILOT_TREES[${kind}].map(p=>p.nodes.map(n=>n.id)))`));
  const alternatives=paths.filter((_,index)=>index!==foundation).map(path=>path[1]);
  run(`save.units[${slot}].level=3`);
  const learn=id=>run(`learnTraining(${slot},${JSON.stringify(id)})`);
  for(const path of paths){
   assert.equal(run(`trainingStatus(${kind},${JSON.stringify(path[1])},[],3)`),'NEEDS LV 1 SKILL');
   assert.equal(learn(path[1]),false);
  }
  assert.equal(learn(paths[foundation][0]),true);
  for(const id of alternatives)assert.equal(learn(id),true);
  assert.equal(run(`trainingPoints(${slot})`),0);
  const reload=simulate({storage:new Map(sim.storage)});
  assert.deepEqual(Array.from(reload.run(`learnedTraining(${slot})`)),[paths[foundation][0],...alternatives]);
  run(`save.units[${slot}].level=5`);
  assert.equal(learn(paths[(foundation+1)%3][2]),true,'either foundation can lead to either doctrine');
  assert.equal(learn(paths[foundation][2]),false,'one level 5 doctrine');
 }
 console.log('PASS all eight pilots can cross-train any level 3 skill from any foundation, with points and reload preserved');
}

async function checkCounters(){
 const sim=simulate({random:()=>0,reducedMotion:true}),run=sim.run;
 run(`createBattle(0);const ally=current(),foe=battle.units[3],gunship=battle.units.find(u=>u.kind==='helicopter');
  ally.x=6;ally.z=6;foe.x=7;foe.z=6;gunship.x=7;gunship.z=6;ally.ap=14;ally.melee=null`);
 for(const missile of ['missile','locust']){
  run(`ally.weapon='${missile}';ally.brace=true;ally.training={range:2,braceCounterRange:3}`);
  assert.equal(run('counterRange(unitWeapon(ally),ally.training,true)'),0);
  assert.equal(run('reactionWeapon(ally,foe).id'),'free-hand');
  assert.equal(run('reactionWeapon(ally,gunship)'),null,'a free hand cannot hit a gunship');
  run('foe.x=8');
  assert.equal(run('reactionWeapon(ally,foe)'),null,'no missile retaliation at range');
  run('foe.x=7;foe.z=7');
  assert.equal(run('reactionWeapon(ally,foe)'),null,'no diagonal punch');
  run('foe.z=6;ally.hp.left=0');
  assert.equal(run('reactionStatus(ally)'),'UNAVAILABLE','a working launcher alone cannot counter');
  run('ally.hp.left=ally.max.left;ally.melee="cleaver"');
  assert.equal(run('reactionWeapon(ally,foe).id'),'cleaver','equipped melee has priority');
  run('ally.melee=null');
 }
 run('ally.weapon="rifle";ally.hp.right=0;ally.training={};ally.brace=false');
 assert.equal(run('reactionWeapon(ally,foe).id'),'free-hand','a destroyed weapon arm leaves the other hand available');
 run('ally.hp.right=ally.max.right');
 assert.equal(run('reactionWeapon(ally,foe).id'),'rifle','an eligible gun takes priority over a punch');

 for(const side of ['ally','enemy']){
  run(`battle=null;createBattle(0);selected=0;
   var attacker=${side==='ally'?'battle.units[3]':'current()'},defender=${side==='ally'?'current()':'battle.units[3]'};
   attacker.x=6;attacker.z=6;defender.x=7;defender.z=6;attacker.weapon='rifle';
   defender.weapon='missile';defender.melee=null;defender.ap=4;defender.level=10;
   var hpBefore=attacker.hp.body`);
  await run("engage(attacker,defender,'body',unitWeapon(attacker))");
  assert.ok(run('hpBefore-attacker.hp.body>=5&&hpBefore-attacker.hp.body<=10'),side+' real punch damage');
  assert.equal(run('defender.ap'),2);
  assert.equal(run('defender.reacted'),true);
  assert.equal(run('Boolean(attacker.reacted)'),false,'no chain counters');
  assert.match(run('battle.log.join()'),/counters with a free hand/);
  run('persist()');
  const restored=simulate({storage:new Map(sim.storage)});
  assert.equal(restored.run(`reactionStatus(battle.units[${side==='ally'?0:3}])`),'READY');
  run('hpBefore=attacker.hp.body');
  await run("engage(attacker,defender,'body',unitWeapon(attacker))");
  assert.ok(run('attacker.hp.body<hpBefore&&defender.ap===0'),'second counter spends the last 2 AP');
  assert.equal(run('reactionWeapon(defender,attacker)'),null);
 }
 console.log('PASS Vesper and Locust missile lockout, 5-10 damage paid punches on both sides, range, arms, priorities and reload');
}

(async()=>{checkTraining();await checkCounters()})().catch(error=>{console.error(error);process.exitCode=1});
