const assert=require('node:assert/strict');
const {viewports,presets,setGamePreset}=require('./capture-presets.cjs');
const {options}=require('./capture.cjs');
const createSimulation=require('./sim-harness.cjs');
assert.deepEqual(viewports.map(v=>[v.width,v.height]),[[1366,1024],[1194,834],[1376,1032],[1210,834]]);
assert.equal(new Set(presets.map(p=>p.id)).size,presets.length);
assert.throws(()=>options(['--preset','missing']),/Unknown preset/);
assert.throws(()=>options(['--origin','https://user:secret@example.com']),/without credentials/);
assert.throws(()=>options(['--label','../escape']),/alphanumeric/);
assert.equal(options(['--plan']).plan,true);
for(const preset of presets.filter(p=>!p.path)){
 const sim=createSimulation({seed:101});
 sim.run('('+setGamePreset.toString()+')('+JSON.stringify(preset)+')');
 assert.equal(sim.run('clock'),5,preset.id+' fixed clock');
 if(preset.contract!==undefined){
  assert.ok(sim.run('battle.units.some(u=>u.team==="ally")'),preset.id+' deployed ally');
  if(preset.overview)assert.equal(sim.run('fieldCamera.overview'),true);
  if(preset.damage)assert.ok(sim.run('battle.units[0].hp.body/battle.units[0].max.body<.5'));
  if(preset.wreck)assert.ok(sim.run('battle.units.some(u=>!u.alive&&u.downReason==="body"&&u.hp.body===0)'));
  if(preset.weapon)assert.equal(sim.run('activeCinematic.w.id'),preset.weapon);
 }else assert.equal(sim.run('page'),preset.page);
}
console.log('PASS capture viewports, unique presets, input validation and all 18 isolated game fixtures (not browser captures)');
