const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');
const key='iron-vow-career';

// Synthetic careers exported by the deployed v31, v32, v35 and v53 code.
for(const file of ['v31-corridor.json','v32-picket.json','v35-frontier.json','v53-picket.json']){
 const raw=readFileSync(join(__dirname,'fixtures',file),'utf8'),{sortie:expected,...career}=JSON.parse(raw);
 const sim=simulate({storage:new Map([[key,raw]]),random:()=>0,reducedMotion:true});
 function check(){
  if(file==='v35-frontier.json')assert.equal(sim.run('battle.units[3].frame'),7,'existing Frontier keeps Behemoth');
  if(file==='v53-picket.json')assert.equal(sim.run('battle.units[1].frame'),0,'existing Picket keeps the original hostile');
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
