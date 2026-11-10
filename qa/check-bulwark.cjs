const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');

const options={foundry:true,random:()=>0,reducedMotion:true};
const sim=simulate(options),{run}=sim;
const aegis='battle.units.find(u=>u.frame===BULWARK_FRAME)';
const cut='aegis-cleave',bash='aegis-bash';

(async()=>{
 for(let contract=0;contract<4;contract++)for(let seats=1;seats<=3;seats++){
  run(`createBattle(${contract},false,false,LANCE_SLOTS.slice(0,${seats}))`);
  assert.equal(run(`Boolean(${aegis})`),contract===3&&seats===3);
 }
 for(const args of ['3,true','3,false,true']){
  run(`createBattle(${args})`);
  assert.equal(run(`Boolean(${aegis})`),false);
 }
 const oldCareer=readFileSync(join(__dirname,'fixtures/v61-frontier.json'),'utf8');
 const old=simulate({...options,storage:new Map([['iron-vow-career',oldCareer]])});
 assert.equal(old.run(`Boolean(${aegis})`),false);
 assert.equal(old.run('JSON.stringify(captureSortie())'),JSON.stringify(JSON.parse(oldCareer).sortie));
 run('createBattle(3);persist()');
 const loaded=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(loaded.run(`Boolean(${aegis})`),true);
 assert.equal(loaded.run('JSON.stringify(captureSortie())'),run('JSON.stringify(captureSortie())'));

 run('save.credits=100000;save.rep=100;workshopView="market"');
 assert.equal(run('hullOnMarket(BULWARK_FRAME)||acquireHull(BULWARK_FRAME)||assignChassis(0,BULWARK_FRAME,true)'),false);
 assert.ok(run('validSave({...save,reserve:{[BULWARK_FRAME]:stockHull(BULWARK_FRAME)}})'));
 assert.ok(run('validSave({...save,salvage:{[BULWARK_FRAME]:1}})'));
 const observed=[];
 sim.sandbox.observed=observed;
 run('const engageAegis=engage;engage=(a,t,p,w)=>{if(a.frame===BULWARK_FRAME)observed.push(w.id);return engageAegis(a,t,p,w)}');
 const arrange=`createBattle(3);{
  const u=${aegis},a=current();
  battle.units=battle.units.filter(x=>x===u||x===a);
  battle.cover.clear();
  Object.assign(u,{x:7,z:11,vx:7,vz:11});
  Object.assign(a,{x:7,z:15,vx:7,vz:15});
 }`;
 for(const [lost,expected] of [[[],[cut,bash]],[['right'],[bash,bash]],[['left'],[cut,cut]],[['right','left'],[]]]){
  run(arrange);
  for(const arm of lost)run(`${aegis}.hp.${arm}=0`);
  assert.equal(run(`Boolean(activeShield(${aegis}))`),!lost.includes('left'));
  assert.equal(run(`canReachTarget(unitWeapon(${aegis}),{kind:'helicopter'})`),false);
  observed.length=0;
  await run('endTurn()');
  await run('endTurn()');
  assert.deepEqual(observed,expected);
  if(expected.length)assert.equal(run(`distance(${aegis},current())`),1);
 }
 run('for(const u of battle.units)if(u.team==="enemy")u.alive=false;finish(true)');
 assert.equal(run('save.salvage?.[BULWARK_FRAME]'),undefined);
 console.log('PASS Bulwark Frontier roster, checkpoints, independent shield and cleaver arms, melee pursuit and acquisition gates');
})().catch(error=>{console.error(error);process.exitCode=1});
