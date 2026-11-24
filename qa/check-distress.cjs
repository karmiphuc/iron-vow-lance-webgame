const assert = require('node:assert/strict');
const simulate = require('./sim-harness.cjs');

const missions = {crossing: 8, lift: 7, quarry: 8};
const seeds = [1, 42, 20261125];
const snapshot = sim => JSON.parse(sim.run('JSON.stringify(captureSortie())'));
const helpers = `
 globalThis.escorts = () => battle.units.filter(u => u.distressAlly);
 globalThis.foes = () => battle.units.filter(u => u.team === 'enemy');
 globalThis.goal = () => window.IRON_VOW_DISTRESS_MAPS[battle.contract.distress].goal;
 globalThis.place = (u, [x,z]) => Object.assign(u, {x,z,vx:x,vz:z});
 globalThis.disable = u => { u.hp.body = 0; u.alive = false; };
`;

function launch(key, seed = 1) {
 const sim = simulate({seed, reducedMotion: true, persistedComRandom: true});
 sim.run(helpers);
 sim.run(`const contractIndex = CONTRACTS.findIndex(c => c.distress === '${key}');
  const port = CONTRACTS[contractIndex].port;
  save.overworld = {port, arrears: 0};
  save.world = worldRules.createWorld(${seed},save.day);
  const offer = availableOffers(port).find(o => o.templateIndex === contractIndex);
  deploy(contractIndex,false,LANCE_SLOTS,null,null,offer); closeModal();`);
 assert.equal(sim.run('battle?.offer?.id'),sim.run('offer.id'));
 assert.equal(sim.run('!!worldOfferById(offer.id)'),false,'accepted job was removed from the board');
 assert.equal(sim.run('battle?.contract?.distress'), key);
 assert.equal(sim.run('escorts().length'), 3);
 assert.equal(sim.run('foes().length'), missions[key]);
 assert.equal(sim.run('battle.units.filter(u => u.team === "ally" && !u.distressAlly).length'), 3);
 assert.equal(sim.run('new Set(battle.units.map(u => u.id)).size'), missions[key]+6);
 assert.equal(sim.run('new Set(battle.units.map(u => [u.x,u.z].join())).size'), missions[key]+6);
 return sim;
}

function reload(sim) {
 const restored = simulate({storage: new Map(sim.storage), reducedMotion: true, persistedComRandom: true});
 assert.equal(restored.run('!!battle'), true, 'active distress checkpoint restores');
 assert.deepEqual(snapshot(restored), snapshot(sim));
 restored.run(helpers);
 return restored;
}

function focusFire(key) {
 const sim = launch(key);
 sim.run(`globalThis.target = escorts()[0];
  globalThis.hit = part => applyImpact(target,{part,amount:target.max[part]*3});`);
 for (const turn of [1, 2, 3]) {
  sim.run(`battle.turn = ${turn}; for(const foe of foes()){hit('body');hit('pilot');hit('right');}`);
  assert.equal(sim.run('target.hp.body > 0 && target.hp.pilot > 0'), turn < 3,
   key + ' focus fire on protected systems, round ' + turn);
  assert.equal(sim.run('target.hp.right'), 0, 'weapons remain vulnerable throughout the opening');
 }
}

async function openings() {
 for (const key of Object.keys(missions)) {
  focusFire(key);
  for (const seed of seeds) {
   let sim = launch(key, seed);
   for (let turn = 1; turn <= 2; turn++) {
    await sim.run('endTurn()');
    assert.equal(sim.run('battle?.turn'), turn+1, key+' idle opening, seed '+seed);
    assert.equal(sim.run('escorts().filter(u => u.alive || u.extracted).length'), 3);
    if (seed === seeds[0]) sim = reload(sim);
   }
  }
 }
}

function settled(sim, win, rescued) {
 assert.equal(sim.run('battle'), null);
 assert.equal(sim.run('save.history.at(-1).win'), win);
 if (win) assert.equal(sim.run('save.history.at(-1).rescued'), rescued);
 assert.equal(sim.run('validSave(save)'), true);
 const again = simulate({storage:new Map(sim.storage)});
 assert.equal(again.run('save.credits'), sim.run('save.credits'));
 assert.equal(again.run('save.history.length'), sim.run('save.history.length'));
 assert.equal(again.run('battle'), null);
}

function publishedCheckpoint() {
 const career = require('./fixtures/distress-partial-evac.json');
 const storage = new Map([['iron-vow-career',JSON.stringify(career)]]);
 const sim = simulate({storage, reducedMotion:true});
 assert.deepEqual(snapshot(sim),career.sortie,'published partial evacuation resumes exactly');
 sim.run('renderBattle()');
 sim.node('#withdraw').onclick();
 assert.match(sim.node('#modal').innerHTML,/WITHDRAW WITH 1 RESCUED/);
 sim.node('#modal-1').onclick();
 settled(sim,true,1);

 const invalid = structuredClone(career);
 invalid.sortie.units[0].extracted = true;
 const broken = simulate({storage:new Map([['iron-vow-career',JSON.stringify(invalid)]])});
 assert.equal(broken.run('battle'),null,'player hull cannot be counted as rescued');
 assert.equal(broken.run('save.credits'),invalid.credits,'rejecting the checkpoint preserves the company');
}

async function liftRadio() {
 for (const [orderAt,expected] of [[0,1],[1,3],[3,2]]) {
  let sim = launch('lift',42);
  for (let turn=1; turn<=4; turn++) {
   if (turn===orderAt) {
    sim.run(`for(const gunner of escorts().slice(1)) {
     openDistressRadio(gunner); document.querySelector('#radio-objective').onclick();
    }`);
    sim = reload(sim);
   }
   await sim.run('endTurn()');
  }
  settled(sim,true,expected);
 }
}

function objectives() {
 for (const key of Object.keys(missions)) {
  const simultaneous = launch(key);
  simultaneous.run('escorts().forEach(disable); foes().forEach(disable); checkEnd()');
  settled(simultaneous, false);
  const cleared = launch(key);
  cleared.run('foes().forEach(disable); checkEnd()');
  settled(cleared, true, 3);
 }
 let crossing = launch('crossing');
 crossing.run('place(escorts()[0],goal()[0]);checkEnd();persist();');
 assert.equal(crossing.run('escorts()[0].extracted'), true);
 crossing = reload(crossing);
 crossing.run('escorts().filter(u=>u.alive).forEach(disable);checkEnd()');
 settled(crossing, true, 1);

 const liftOutcomes = [];
 for (const rescued of [0,1,2,3]) {
  const lift = launch('lift');
  lift.run(`for (const part of ["body","left","right","legs"]) current().hp[part] = 1;
   escorts().forEach((u,i) => place(u,i<${rescued}?goal()[i]:[10+i,16]));
   battle.turn=3;checkEnd(true);`);
  assert.equal(lift.run('!!battle'), true, 'lift cannot depart early');
  lift.run('battle.turn=4;checkEnd();');
  assert.equal(lift.run('!!battle'), true, 'enemies still act during round four');
  lift.run('checkEnd(true)');
  settled(lift,rescued>0,rescued);
  liftOutcomes.push({pay:lift.run('save.history.at(-1).pay'),
   condition:lift.run('save.units[0].condition'),scouted:lift.run('save.world.scouted.length')});
 }
 const [,one,two,three] = liftOutcomes;
 assert.ok(one.pay>0);
 assert.equal(one.pay,two.pay);
 assert.equal(two.pay,three.pay);
 assert.equal(two.condition-one.condition,12);
 assert.equal(three.condition,two.condition);
 assert.equal(two.scouted,one.scouted);
 assert.equal(three.scouted,two.scouted+1);
}

(async()=>{
 await openings();
 await liftRadio();
 objectives();
 publishedCheckpoint();
 console.log('PASS three distress contracts, nine seeded two-round openings, concentrated subsystem damage, checkpoints, losses, extraction, lift timing and clearance payouts');
})().catch(error=>{console.error(error);process.exitCode=1;});
