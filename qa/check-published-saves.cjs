const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');
const key='iron-vow-career';

// Synthetic careers exported by the deployed builds.
for(const file of ['v31-corridor.json','v32-picket.json','v35-frontier.json','v53-picket.json','v55-corridor.json','ashigaru-picket.json','world-active-offer.json']){
 const raw=readFileSync(join(__dirname,'fixtures',file),'utf8'),{sortie:expected,...career}=JSON.parse(raw);
 const sim=simulate({storage:new Map([[key,raw]]),random:()=>0,reducedMotion:true});
 function check(){
  if(file==='v35-frontier.json')assert.equal(sim.run('battle.units[3].frame'),7,'existing Frontier keeps Behemoth');
  if(file==='v53-picket.json')assert.equal(sim.run('battle.units[1].frame'),0,'existing Picket keeps the original hostile');
  if(file==='v55-corridor.json')assert.equal(sim.run('battle.units[1].frame'),1,'existing Corridor keeps the original hostile');
  if(file==='ashigaru-picket.json')assert.equal(sim.run('battle.units.find(u=>u.id==="enemy1").frame'),sim.run('ASHIGARU_FRAME'),'Picket restores its Ashigaru');
  const {sortie,...actual}=JSON.parse(sim.run('JSON.stringify(save)'));
  assert.deepEqual(actual,career,file+' career, roster, hull and offer data');
  const {version,...checkpoint}=JSON.parse(sim.run('JSON.stringify(captureSortie())'));
  const {version:previousVersion,...previous}=expected;
  assert.deepEqual(checkpoint,previous,file+' battlefield state including active skill effects');
  assert.ok(version>=previousVersion,file+' checkpoint version');
 }
 check();
 sim.run('persist()');
 check();
 const imported=simulate({random:()=>0,reducedMotion:true});
 imported.run('let backup='+raw.trim());
 assert.equal(imported.run('importCareer(backup)'),true,file+' Career backup import');
 assert.deepEqual(JSON.parse(imported.run('JSON.stringify(captureSortie())')),JSON.parse(sim.run('JSON.stringify(captureSortie())')));
 console.log('PASS published save '+file);
}

// A transit report is a career state, not an active battlefield checkpoint.
{
 const raw=readFileSync(join(__dirname,'fixtures','world-pending-transit.json'),'utf8');
 const expected=JSON.parse(raw);
 const resumed=simulate({storage:new Map([[key,raw]]),random:()=>0,reducedMotion:true});
 const imported=simulate({random:()=>0,reducedMotion:true});
 imported.run('let backup='+raw.trim());
 assert.equal(imported.run('importCareer(backup)'),false,'transit import has no battle to restore');
 for(const [label,sim] of [['resume',resumed],['import',imported]]){
  assert.deepEqual(JSON.parse(sim.run('JSON.stringify(save)')),expected,label+' restores the exact pending report');
  assert.equal(sim.run('page'),'overworld');
  assert.equal(sim.run('validSave(save)'),true);
  assert.equal(sim.run('worldRules.pendingEvents(save.world)[0].kind'),'toll');
  const id=sim.run('worldRules.pendingEvents(save.world)[0].id');
  sim.run('persist()');
  const reloaded=simulate({storage:new Map(sim.storage),random:()=>0,reducedMotion:true});
  assert.deepEqual(JSON.parse(reloaded.run('JSON.stringify(save)')),expected,label+' reload preserves the report, day and credits');
  assert.equal(reloaded.run(`resolveTransitEvent(${JSON.stringify(id)},'pay')`),true);
  assert.equal(reloaded.run('save.day'),expected.day);
  assert.equal(reloaded.run('save.credits'),expected.credits-200);
  assert.equal(reloaded.run('save.transit===undefined'),true);
  assert.equal(reloaded.run(`resolveTransitEvent(${JSON.stringify(id)},'pay')`),false,'resolved incident cannot pay twice');
  const after=simulate({storage:new Map(reloaded.storage),random:()=>0,reducedMotion:true});
  assert.equal(after.run('validSave(save)'),true);
  assert.equal(after.run('save.day'),expected.day);
  assert.equal(after.run('save.credits'),expected.credits-200);
  assert.equal(after.run('save.transit===undefined'),true);
  assert.equal(after.run(`resolveTransitEvent(${JSON.stringify(id)},'pay')`),false,'reload cannot replay incident');
 }
 console.log('PASS published save world-pending-transit.json');
}
