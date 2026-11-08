const assert=require('node:assert/strict');
const {existsSync,readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');
const sim=simulate({random:()=>0,reducedMotion:true,travel:true});
const {run}=sim;
const dist=join(__dirname,'../dist');

assert.equal(run('HELLBREAKER'),11);
assert.equal(run('FRAMES[3].name'),'GATECRASHER');
assert.equal(run('FRAMES[HELLBREAKER].native'),'hellbreaker');
assert.equal(run('hullOnMarket(3)'),true);
assert.equal(run('hullOnMarket(HELLBREAKER)'),false);
assert.equal(run('acquireHull(HELLBREAKER)'),false);
assert.equal(run('assignChassis(0,HELLBREAKER)'),false);
assert.equal(run('acquireHull(HELLBREAKER,true)'),false);
assert.equal(run('workshopView="market";chassisAssignments(0,trainingEffects(0)).includes("HELLBREAKER")'),false);

for(const slots of [[0],[0,2],[0,1,2]]){
 run(`battle=null;createBattle(3,false,false,${JSON.stringify(slots)});selected=0;persist()`);
 assert.equal(run('battle.units.find(u=>u.team==="enemy").frame'),11);
 assert.match(run('battle.units.find(u=>u.team==="enemy").name'),/^HELLBREAKER /);
 assert.equal(run('battle.units.some(u=>u.team==="ally"&&u.frame===HELLBREAKER)'),false);
 assert.equal(run(`(()=>{
  const foe=battle.units.find(u=>u.frame===HELLBREAKER);
  return [-1,1].every(face=>{
   const close={...foe,face,headingOverride:face*Math.PI/4};
   return Object.values(unitBounds(close)).every(Number.isFinite)&&
    ['left','muzzle','muzzle2'].every(part=>Object.values(mechAttachmentPoint(close,part)).every(Number.isFinite));
  });
 })()`),true,'Hellbreaker has finite close-combat bounds and hit anchors');
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run('battle.units.find(u=>u.team==="enemy").frame'),11);
}

run('for(const u of battle.units)if(u.team==="enemy"){u.alive=false;u.hp.body=u.frame===HELLBREAKER?0:30}finish(true)');
assert.equal(run('save.salvage[HELLBREAKER]'),1);
assert.equal(run('acquireHull(HELLBREAKER)'),false);
assert.equal(run('assignChassis(0,HELLBREAKER)'),false);
assert.equal(run('workshopView="salvage";chassisAssignments(0,trainingEffects(0)).includes("HELLBREAKER")'),true);
assert.equal(run('acquireHull(HELLBREAKER,true)'),true);
assert.equal(run('save.reserve[HELLBREAKER].condition'),55);
assert.equal(run('save.salvage[HELLBREAKER]'),undefined);
assert.equal(run('assignChassis(0,HELLBREAKER)'),true);
assert.equal(run('pilotFrame(0)'),11);
assert.equal(run('save.units[0].weapon'),'morrow');
assert.equal(run('validSave(save)'),true);
assert.equal(simulate({storage:new Map(sim.storage)}).run('pilotFrame(0)'),11);

for(const [model,prefix] of [['gatecrasher','gatecrasher-r2'],['hellbreaker','gatecrasher']]){
 for(const face of ['left','right']){
  const art=JSON.parse(run(`JSON.stringify(prototypes.${model}.${face})`));
  assert.equal(art.key,`${prefix}-combat-${face}`);
  assert.notDeepEqual(art.muzzle,art.muzzle2);
  for(const key of [art.key,art.motion.key])for(const suffix of ['','-paint'])
   assert.ok(existsSync(join(dist,'assets',key+suffix+'.webp')));
 }
 const atlas=JSON.parse(run(`JSON.stringify(window.IRON_VOW_TRAVEL.${model})`));
 assert.equal(atlas.points.length,8);
 assert.ok(atlas.points.every(row=>row.length===4));
 assert.ok(existsSync(join(dist,'assets',atlas.key+'.webp')));
 const glb=readFileSync(join(dist,'rig-bench/prototypes',model+'.glb'));
 const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
 assert.deepEqual(new Set(json.animations.map(a=>a.name)),new Set(['Idle','Walk','Deploy','Fire']));
 assert.ok(json.nodes.some(node=>node.name===model.toUpperCase()+' / Rig'));
 if(model==='gatecrasher'){
  assert.ok(json.materials.some(material=>material.name==='HV-09 / badge'),'raised torso badge has its paint role');
  for(const socket of ['Muzzle.Upper','Muzzle.Lower','Hardpoint.L'])
   assert.ok(json.nodes.some(node=>node.name===socket),socket);
  assert.ok(!json.nodes.some(node=>node.name==='Hardpoint.R'));
 }
}
console.log('PASS: R2 Gatecrasher routes, Hellbreaker Frontier spawn, salvage-only acquisition and reload, and four exported clips.');
