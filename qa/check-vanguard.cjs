const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const options={foundry:true,random:()=>0,reducedMotion:true};
const sim=simulate(options),{run}=sim;
const frame=run('VANGUARD_FRAME');
const count=()=>run('battle.units.filter(u=>u.frame===VANGUARD_FRAME).length');
const vanguard='battle.units.find(u=>u.frame===VANGUARD_FRAME)';

(async()=>{
 for(const [contract,counts] of [[0,[0,0,0]],[1,[0,0,0]],[2,[0,1,1]],[3,[0,1,1]]]){
  for(const n of [1,2,3]){
   run('createBattle('+contract+',false,false,LANCE_SLOTS.slice(0,'+n+'))');
   assert.equal(count(),counts[n-1]);
   if(contract===2)assert.equal(run('battle.units.find(u=>u.team==="enemy").frame'),run('LINE_ELITE_FRAME'));
   if(contract===3)assert.equal(run('battle.units.find(u=>u.team==="enemy").frame'),run('HELLBREAKER'));
  }
 }
 run('createBattle(2,true)');
 assert.equal(count(),0);
 run('createBattle(2,false,true)');
 assert.equal(count(),0);
 run('save.credits=100000;save.rep=100;workshopView="market"');
 assert.equal(run('hullOnMarket(VANGUARD_FRAME)||acquireHull(VANGUARD_FRAME)||assignChassis(0,VANGUARD_FRAME,true)'),false);
 assert.equal(run('chassisAssignments(0).includes("GRAVEMAW")'),false);
 assert.ok(run('validSave({...save,reserve:{[VANGUARD_FRAME]:stockHull(VANGUARD_FRAME)}})'));
 assert.ok(run('validSave({...save,salvage:{[VANGUARD_FRAME]:1}})'));

 for(const upgraded of [false,true]){
  const fixture=simulate(options);
  fixture.run('createBattle(2,false,false,[0,1],true,null,0,true,true,'+upgraded+');persist()');
  const restored=simulate({...options,storage:new Map(fixture.storage)});
  assert.equal(restored.run('battle.units.some(u=>u.frame===VANGUARD_FRAME)'),upgraded);
  assert.equal(restored.run('JSON.stringify(captureSortie())'),fixture.run('JSON.stringify(captureSortie())'));
  assert.equal(restored.run('battle.units.find(u=>u.team==="enemy").max.body'),fixture.run('battle.units.find(u=>u.team==="enemy").max.body'));
 }
 run('save=fresh();battle=null;deploy(2,false,[0,1]);closeModal()');
 assert.equal(run(vanguard+'.weapon'),'hailstorm');
 assert.equal(run(vanguard+'.melee'),'piledriver');
 assert.equal(run(vanguard+'.paint'),null);
 assert.equal(run('captureSortie().hardVanguard'),true);

 const arrange=`{
  const u=${vanguard},a=current();
  battle.units=battle.units.filter(x=>x===u||x===a);
  battle.cover.clear();
  Object.assign(u,{x:7,z:11,vx:7,vz:11});
  a.max.body=a.max.pilot=500;
  Object.assign(a,{x:7,z:15,vx:7,vz:15,hp:{...a.max},alive:true});
 }`;
 run(arrange);
 const shotKinds=[];
 sim.sandbox.observedWeapons=shotKinds;
 run('const realEngage=engage;engage=(a,t,p,w)=>{if(a.frame===VANGUARD_FRAME)observedWeapons.push(w.id);return realEngage(a,t,p,w)}');
 await run('endTurn()');
 assert.equal(run('distance('+vanguard+',current())'),1);
 assert.equal(shotKinds[0],'piledriver');
 assert.ok(run('Object.keys(current().hp).some(part=>current().hp[part]<current().max[part])'));
 run(arrange);
 run(vanguard+'.hp.left=0');
 shotKinds.length=0;
 await run('endTurn()');
 assert.equal(run('distance('+vanguard+',current())'),4);
 assert.deepEqual(shotKinds,['hailstorm','hailstorm']);
 run(arrange);
 run(vanguard+'.hp.left='+vanguard+'.max.left;'+vanguard+'.hp.right=0');
 shotKinds.length=0;
 await run('endTurn()');
 assert.equal(shotKinds[0],'piledriver');

 run('for(const u of battle.units)if(u.team==="enemy")u.alive=false;finish(true)');
 assert.equal(run('save.salvage?.[VANGUARD_FRAME]'),1);
 console.log('PASS Vanguard Hard+ roster, existing and new checkpoints, melee pursuit, Hailstorm fallback and acquisition gates');
})().catch(error=>{console.error(error);process.exitCode=1});

