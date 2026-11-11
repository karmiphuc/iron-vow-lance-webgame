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
 run('save.credits=rebuildPrice(HELLBREAKER)');
assert.equal(run('acquireHull(HELLBREAKER,true)'),true);
assert.equal(run('save.reserve[HELLBREAKER].condition'),55);
assert.equal(run('save.salvage[HELLBREAKER]'),undefined);
assert.equal(run('assignChassis(0,HELLBREAKER)'),true);
assert.equal(run('pilotFrame(0)'),11);
assert.equal(run('save.units[0].weapon'),'morrow');
assert.equal(run('validSave(save)'),true);
assert.equal(simulate({storage:new Map(sim.storage)}).run('pilotFrame(0)'),11);

for(const [model,prefix] of [['gatecrasher','gatecrasher-r2'],['gatecrasher-bare','gatecrasher-bare'],
 ['gatecrasher-cleaver','gatecrasher-cleaver'],['gatecrasher-vesper','gatecrasher-vesper'],['hellbreaker','gatecrasher']]){
 for(const face of ['left','right']){
  const art=JSON.parse(run(`JSON.stringify(prototypes[${JSON.stringify(model)}].${face})`));
  assert.equal(art.key,`${prefix}-combat-${face}`);
  assert.equal(art.motion.cell,448);
  assert.notDeepEqual(art.muzzle,art.muzzle2);
  for(const key of [art.key,art.motion.key])for(const suffix of ['','-paint'])
   assert.ok(existsSync(join(dist,'assets',key+suffix+'.webp')));
 }
 const atlas=JSON.parse(run(`JSON.stringify(window.IRON_VOW_TRAVEL[${JSON.stringify(model)}])`));
 assert.equal(atlas.points.length,8);
 assert.ok(atlas.points.every(row=>row.length===4));
 assert.ok(existsSync(join(dist,'assets',atlas.key+'.webp')));
 const gait=atlas.grounded;
 assert.equal(gait.detail.cell,384);
 assert.equal(gait.points.length,2+6*gait.samples+(gait.strike?.samples??0));
 for(const [heading,key] of gait.detail.keys.entries()){
  for(const suffix of ['','-paint'])assert.ok(existsSync(join(dist,'assets',key+suffix+'.webp')));
  for(const [kind,start] of Object.entries(gait.walk)){
   const points=gait.points.slice(start,start+gait.samples).map(row=>row[heading]);
   const side=kind.at(-1);
   const stance=points.map(p=>p.planted);
   const swing=points.map(p=>p['foot'+side]);
   const travel=(kind.startsWith('stride')?1/3:1/6)*3.65/gait.span;
   const sign=heading<2?1:-1,depth=heading%3===0?1:-1;
   for(const [i,foot] of stance.entries()){
    const distance=i/(gait.samples-1)*travel;
    assert.ok(Math.abs(foot[0]-stance[0][0]+sign*distance*.866)<.00001,`${model} ${kind} ${heading} stance x`);
    assert.ok(Math.abs(foot[1]-stance[0][1]+depth*distance*.42)<.00001,`${model} ${kind} ${heading} stance y`);
   }
   const mid=(gait.samples-1)/2;
   assert.ok(swing[mid][1]<(swing[0][1]+swing.at(-1)[1])/2-.018,'swing sole lifts off the floor');
  }
 }
 if(model.startsWith('gatecrasher-'))continue;
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
assert.equal(purchase("nativeHullKey(3,save.units[0])"),'gatecrasher-bare');
assert.equal(purchase("save.owned.includes('missile')&&!save.owned.includes('vesper-shoulder')"),true);
assert.equal(purchase(`(()=>{
 const old=JSON.parse(JSON.stringify(save));old.units[0].melee='breach-gauntlet';
 const restored=loadCareer(old);
 return restored.units[0].melee===undefined&&restored.credits===save.credits;
})()`),true);
purchase("equipWeapon('cleaver');equipWeapon('vesper-shoulder')");
assert.equal(purchase("nativeHullKey(3,save.units[0])"),'gatecrasher');
assert.equal(purchase("validSave(save)"),true);
assert.equal(purchase(`(()=>{
 const invalid=JSON.parse(JSON.stringify(save));invalid.owned=invalid.owned.filter(id=>id!=='vesper-shoulder');
 return validSave(invalid);
})()`),false);
purchase("assignChassis(0,0);assignChassis(0,3)");
assert.equal(purchase("nativeHullKey(3,save.units[0])"),'gatecrasher');
assert.equal(purchase("validSave(save)"),true);
console.log('PASS: four Gatecrasher kits, legacy save migration, ownership and hull storage; Hellbreaker salvage and rigs.');

const flagship=simulate({travel:true}).run;
assert.equal(flagship('FRAMES[SHOGUN_FRAME].name'),'SHOGUN');
assert.equal(flagship('FRAMES[SHOGUN_FRAME].cost>FRAMES[3].cost && FRAMES[SHOGUN_FRAME].hp>FRAMES[3].hp'),true);
assert.equal(flagship(`(()=>{
 save.credits=FRAMES[3].cost+FRAMES[SHOGUN_FRAME].cost+3600;
 if(!acquireHull(3)||!acquireHull(SHOGUN_FRAME)||!assignChassis(0,3)||!assignChassis(1,SHOGUN_FRAME))return false;
 selected=1;equipWeapon('cleaver');equipWeapon('vesper-shoulder');
 const restored=loadCareer(JSON.parse(JSON.stringify(save)));
 return !!restored&&pilotFrame(0,restored)===3&&pilotFrame(1,restored)===SHOGUN_FRAME&&
   nativeHullKey(3,restored.units[0])==='gatecrasher-bare'&&nativeHullKey(SHOGUN_FRAME,restored.units[1])==='shogun';
})()`),true);
for(const kit of ['shogun','shogun-bare','shogun-cleaver','shogun-vesper']){
 const entry=JSON.parse(flagship(`JSON.stringify({combat:prototypes[${JSON.stringify(kit)}],
  travel:window.IRON_VOW_TRAVEL[${JSON.stringify(kit)}]})`));
 assert.equal(entry.travel.key,'grid-travel-shogun');
 const keys=[entry.travel.key,...entry.travel.grounded.detail.keys];
 for(const face of ['left','right']){
  const view=entry.combat[face];
  assert.equal(view.key,`${kit}-combat-${face}`);
  assert.notDeepEqual(view.muzzle,view.muzzle2);
  keys.push(view.key,view.motion.key);
 }
 for(const key of keys)for(const suffix of ['','-paint','-parts'])
  assert.ok(existsSync(join(dist,'assets',key+suffix+'.webp')),key+suffix);
}
const shogunGlb=readFileSync(join(dist,'rig-bench/prototypes/shogun.glb'));
const shogun=JSON.parse(shogunGlb.subarray(20,20+shogunGlb.readUInt32LE(12)));
assert.ok(shogun.nodes.some(node=>node.name==='SHOGUN / Rig'));
assert.ok(shogun.nodes.some(node=>node.name==='Continuous hip skirt'));
assert.deepEqual(new Set(shogun.animations.map(a=>a.name)),new Set(['Idle','Walk','Deploy','Fire','Strike']));
console.log('PASS: Shogun owns separate art, loadouts and saved hull identity alongside Gatecrasher.');
