const assert=require('node:assert/strict');
const createSimulation=require('./sim-harness.cjs');
const stock=require('./fixtures/stock-career.json');

const sim=createSimulation({newCareer:true});
assert.equal(sim.run('validSave(save)'),true);
assert.equal(sim.storage.get('iron-vow-career'),sim.run('JSON.stringify(save)'),'First career is saved immediately');
assert.equal(createSimulation({storage:sim.storage,newCareer:true}).run('JSON.stringify(save)'),sim.storage.get('iron-vow-career'));
assert.deepEqual(JSON.parse(createSimulation().run('JSON.stringify(save)')),{...stock,readinessStart:stock.day});

const coverage=sim.run(`(()=>{
 const variants=LANCE_SLOTS.map(()=>({pilot:new Set(),kit:new Set(),livery:new Set(),training:new Set()}));
 for(let run=0;run<512;run++){
  const career=newCareer();
  const roundTrip=loadCareer(JSON.parse(JSON.stringify(career)));
  if(!roundTrip||JSON.stringify(career)!==JSON.stringify(roundTrip))throw Error('Invalid starting career round trip');
  if(career.owned.length!==fittedItems(career).length||career.owned.some(id=>availableCopies(id,career)!==0))
   throw Error('Inventory must own exactly one copy per mounted item');
  if(new Set(career.units.map(unit=>unit.paint)).size!==3)throw Error('Starter colors must be distinct');
  for(const [slot,unit] of career.units.entries()){
   const {pilotId,paint,weapon,melee,shield,shoulder}=unit;
   const kind=pilotClass(slot,career),[perk]=career.training[slot];
   if(trainingStatus(kind,perk,[],unit.level)!=='TRAIN'||career.training[slot].length!==earnedTraining(unit.level))
    throw Error('Expected one legal level-one skill per pilot');
   if(pilotFrame(slot,career)!==slot||unit.condition!==100||unit.level!==1)throw Error('Starter hull or level changed');
   const loadout={...unit,frame:slot},gun=unitWeapon(loadout),pod=shoulderWeapon(loadout);
   if(gun.range<3||gun.ap>roundAP(effectsForTraining(kind,[perk])))throw Error('Starter primary must be usable');
   if(slot===2&&Math.max(gun.range,pod?.range??0)<7)throw Error('Missing long-range support');
   for(const [field,value] of Object.entries({pilot:pilotId,kit:JSON.stringify([weapon,melee,shield,shoulder]),livery:paint,training:perk}))
    variants[slot][field].add(value);
  }
 }
 return JSON.stringify(variants.map(slot=>Object.fromEntries(Object.entries(slot).map(([key,values])=>[key,values.size]))));
})()`);
assert.deepEqual(JSON.parse(coverage),Array.from({length:3},()=>({pilot:2,kit:2,livery:6,training:6})));
sim.run('save=newCareer(()=>.99)');
for(const kind of [0,1,2]){
 assert.equal(sim.run(`hirePilot(${kind})`),true,'Unrolled original pilots remain recruitable');
 assert.equal(sim.run(`hirePilot(${kind})`),false,'A pilot can join only once');
}
assert.equal(sim.run('validSave(save)'),true);
console.log('PASS 512 starting lances, real item counts, training coverage and save round trips');
