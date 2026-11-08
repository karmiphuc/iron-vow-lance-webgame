const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');
const key='iron-vow-career';

// Synthetic careers exported by the deployed v31 (3307f85) and v32 (75035d6) code.
for(const file of ['v31-corridor.json','v32-picket.json']){
 const raw=readFileSync(join(__dirname,'fixtures',file),'utf8'),{sortie:expected,...career}=JSON.parse(raw);
 const sim=simulate({storage:new Map([[key,raw]]),random:()=>0,reducedMotion:true});
 function check(){
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
