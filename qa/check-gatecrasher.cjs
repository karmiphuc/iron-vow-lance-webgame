const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');
const sim=simulate({random:()=>0,reducedMotion:true});
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
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run('battle.units.find(u=>u.team==="enemy").frame'),11);
}

run('for(const u of battle.units)if(u.team==="enemy"){u.alive=false;u.hp.body=30;if(u.frame===HELLBREAKER)u.hp.pilot=0}finish(true)');
assert.equal(run('save.salvage[HELLBREAKER]'),1);
assert.equal(run('acquireHull(HELLBREAKER)'),false);
assert.equal(run('assignChassis(0,HELLBREAKER)'),false);
assert.equal(run('workshopView="salvage";chassisAssignments(0,trainingEffects(0)).includes("HELLBREAKER")'),true);
 run('save.credits=rebuildPrice(HELLBREAKER)');
assert.equal(run('acquireHull(HELLBREAKER,true)'),true);
assert.equal(run('save.reserve[HELLBREAKER].condition'),55);
assert.equal(run('save.salvage[HELLBREAKER]'),undefined);
assert.equal(run('assignChassis(0,HELLBREAKER)'),true);
assert.equal(run('pilotFrame(0)'),11);
assert.equal(run('save.units[0].weapon'),'morrow');
assert.equal(run('validSave(save)'),true);
assert.equal(simulate({storage:new Map(sim.storage)}).run('pilotFrame(0)'),11);

// Actual live mounts, movement and damaged parts are exercised in browser/gatecrasher-v2.cjs.
for(const model of ['gatecrasher','hellbreaker']){
 const glb=readFileSync(join(dist,'rig-bench/prototypes',model+'.glb'));
 const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
 assert.deepEqual(new Set(json.animations.map(a=>a.name)),new Set(['Idle','Walk','Deploy','Fire',...(model==='gatecrasher'?['Strike']:[])]));
 assert.ok(json.nodes.some(node=>node.name===model.toUpperCase()+' / Rig'));
 if(model==='gatecrasher'){
  assert.ok(json.materials.some(material=>material.name==='HV-09 / badge'),'raised torso badge has its paint role');
  for(const socket of ['Muzzle.Upper','Muzzle.Lower','Hardpoint.L','Cleaver Tip.L','Shoulder Hardpoint.R','Shoulder Muzzle.R','Shoulder Muzzle2.R'])
   assert.ok(json.nodes.some(node=>node.name===socket),socket);
  assert.ok(!json.nodes.some(node=>node.name==='Hardpoint.R'));
 }
}
const purchase=simulate({random:()=>0}).run;
purchase("save.credits=FRAMES[3].cost+10000;assignChassis(0,3);selected=0;page='workshop'");
assert.equal(purchase("save.units[0].melee"),undefined);
assert.equal(purchase("save.units[0].shoulder"),undefined);
assert.equal(purchase("save.owned.includes('missile')&&!save.owned.includes('vesper-shoulder')"),true);
assert.equal(purchase(`(()=>{
 const old=JSON.parse(JSON.stringify(save));old.units[0].melee='breach-gauntlet';
 const restored=loadCareer(old);
 return restored.units[0].melee===undefined&&restored.credits===save.credits;
})()`),true);
purchase("equipWeapon('cleaver');equipWeapon('vesper-shoulder')");
assert.equal(purchase("save.units[0].melee==='cleaver'&&save.units[0].shoulder==='vesper-shoulder'"),true);
assert.equal(purchase("validSave(save)"),true);
assert.equal(purchase(`(()=>{
 const invalid=JSON.parse(JSON.stringify(save));invalid.owned=invalid.owned.filter(id=>id!=='missile');
 return validSave(invalid);
})()`),false);
purchase("assignChassis(0,0);assignChassis(0,3)");
assert.equal(purchase("save.units[0].melee==='cleaver'&&save.units[0].shoulder==='vesper-shoulder'"),true);
assert.equal(purchase("validSave(save)"),true);
console.log('PASS: four Gatecrasher kits, legacy save migration, ownership and hull storage; Hellbreaker salvage and rigs.');

const flagship=simulate().run;
assert.equal(flagship('FRAMES[SHOGUN_FRAME].name'),'SHOGUN');
assert.equal(flagship('FRAMES[SHOGUN_FRAME].cost>FRAMES[3].cost && FRAMES[SHOGUN_FRAME].hp>FRAMES[3].hp'),true);
assert.equal(flagship(`(()=>{
 save.credits=FRAMES[3].cost+FRAMES[SHOGUN_FRAME].cost+3600;
 if(!acquireHull(3)||!acquireHull(SHOGUN_FRAME)||!assignChassis(0,3)||!assignChassis(1,SHOGUN_FRAME))return false;
 selected=1;equipWeapon('cleaver');equipWeapon('vesper-shoulder');
 const restored=loadCareer(JSON.parse(JSON.stringify(save)));
 return !!restored&&pilotFrame(0,restored)===3&&pilotFrame(1,restored)===SHOGUN_FRAME&&
   restored.units[0].melee===undefined&&restored.units[0].shoulder===undefined&&
   restored.units[1].melee==='cleaver'&&restored.units[1].shoulder==='vesper-shoulder';
})()`),true);
// browser/shogun-v2.cjs exercises the same live sortie checks for Shogun.
const shogunGlb=readFileSync(join(dist,'rig-bench/prototypes/shogun.glb'));
const shogun=JSON.parse(shogunGlb.subarray(20,20+shogunGlb.readUInt32LE(12)));
assert.ok(shogun.nodes.some(node=>node.name==='SHOGUN / Rig'));
assert.ok(shogun.nodes.some(node=>node.name==='Continuous hip skirt'));
assert.deepEqual(new Set(shogun.animations.map(a=>a.name)),new Set(['Idle','Walk','Deploy','Fire','Strike']));
console.log('PASS: Shogun owns separate rig, loadouts and saved hull identity alongside Gatecrasher.');
