const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const sim=simulate({random:()=>{throw Error('Paint must not consume combat randomness')}});
const {run}=sim;
run(`const paints=()=>battle.units.filter(u=>u.team==='enemy'&&!u.kind&&u.paint).map(u=>[u.paint,u.trim.s]);
 const seen=new Set();
 for(let day=1;day<=16;day++){
  save.day=day;
  for(const i of CONTRACTS.keys()){
   createBattle(i);for(const pair of paints())seen.add(pair.join('/'));
  }
 }`);
assert.equal(run('seen.size'),run('HOSTILE_LIVERIES.length'),'encounters use the full paint pool');
run('createBattle(2,false,false,[0,1])');
assert.equal(run('battle.units.find(u=>u.frame===VANGUARD_FRAME).paint'),null);
assert.equal(run('battle.units.find(u=>u.frame===VANGUARD_FRAME).trim'),null);
run(`save.dispatch={day:save.day,sizes:[1,2,3,1]};save.units[0].paint='#577eac';
 createBattle(0,false,false,[0]);persist();`);
assert.equal(run('current().paint'),'#577eac');
const expected=run('JSON.stringify(paints())');
const resume=simulate({storage:new Map(sim.storage)});
assert.equal(resume.run("JSON.stringify(battle.units.filter(u=>u.team==='enemy'&&!u.kind&&u.paint).map(u=>[u.paint,u.trim.s]))"),expected);
assert.ok(run(`(()=>{
 const variants=new Set();
 for(const n of [1,2,3]){
  save.dispatch.sizes[0]=n;createBattle(0,false,false,[0]);variants.add(JSON.stringify(paints()));
 }
 return variants.size>1;
})()`),'random contract offers contribute to livery selection');
console.log('PASS varied hostile liveries, seeded contract offers, no combat RNG consumption, and exact reload colors');
