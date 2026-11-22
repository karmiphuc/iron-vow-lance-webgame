const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');

const key='iron-vow-career';
const raw=readFileSync(join(__dirname,'fixtures','field-paint-career.json'),'utf8');
const career=JSON.parse(raw);
const plain=value=>JSON.parse(JSON.stringify(value));
const sim=simulate({storage:new Map([[key,raw]]),random:()=>0,reducedMotion:true});
const {run}=sim;
assert.deepEqual(plain(run('save')),career,'Career reload preserves patterns and custom colors');
assert.deepEqual(plain(run('save.units.map(fieldPaint.finish)')),['splinter','solid','factory']);
assert.equal(run('fieldPaint.finish(stockHull(0))'),'block');
for(const bad of ['unknown',null,42,['block'],{id:'survey'}]){
 assert.equal(run(`validHull({...save.units[0],paintFinish:${JSON.stringify(bad)}},0,save.owned)`),false);
}
assert.ok(run('assignChassis(0,6)'),'Transfer the painted spare to the active roster');
assert.equal(run('save.units[0].paintFinish'),'survey');
assert.equal(run('save.reserve[0].paintFinish'),'splinter');
assert.equal(run('save.reserve[0].paint'),'#6a6d78');
assert.equal(run('save.reserve[0].trim.a'),'#8a5044');
assert.ok(run('assignChassis(0,0)'),'Transfer the original hull back from storage');
assert.deepEqual(plain(run('save.units[0]')),{...career.units[0],frame:0});

const storage=()=>new Map(sim.storage);
const imported=simulate({random:()=>0,reducedMotion:true});
assert.equal(imported.run('importCareer('+raw.trim()+')'),false,'Career import has no active sortie');
assert.deepEqual(plain(imported.run('save')),career);
run('createBattle(1)');
const units=()=>plain(run("battle.units.filter(u=>u.team==='ally').map(u=>[fieldPaint.finish(u),u.paint,u.trim??null])"));
assert.deepEqual(units(),[['splinter','#6a6d78',{s:'#3c4640',a:'#8a5044'}],['solid','#708657',null],['factory',null,null]]);
run('persist()');
const restored=simulate({storage:storage(),random:()=>0,reducedMotion:true});
assert.deepEqual(plain(restored.run("battle.units.filter(u=>u.team==='ally').map(u=>[fieldPaint.finish(u),u.paint,u.trim??null])")),units());
assert.ok(run("battle.units.filter(u=>u.team==='enemy'&&!u.kind).every(u=>fieldPaint.finish(u)==='block')"));
assert.ok(run("validHull({...save.units[0],paintFinish:'worn'},0,save.owned)"));
console.log('PASS field paint: optional finish validation, old colors, hull swaps, import, deployment and sortie restore');
