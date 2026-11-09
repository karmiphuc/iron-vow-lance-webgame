const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const options={foundry:true,reducedMotion:true,random:()=>0};
const sim=simulate(options),{run}=sim;
const scout='battle.units.find(u=>u.frame===ASHIGARU_FRAME)';
const carbine='needle-carbine',scatter='flechette-scattergun',knife='signal-knife';

(async()=>{
 for(let i=0;i<4;i++)for(let n=1;n<=3;n++){
  run(`createBattle(${i},false,false,LANCE_SLOTS.slice(0,${n}))`);
  assert.equal(run(`Boolean(${scout})`),i===0&&n===3);
 }
 run('createBattle(0,false,true);persist()');
 assert.equal(run('battle.units.find(u=>u.id==="enemy1").kind'),'tank');
 run('createBattle(0);persist()');
 const restored=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(restored.run(`${scout}.id`),'enemy1');
 assert.equal(restored.run('JSON.stringify(captureSortie())'),run('JSON.stringify(captureSortie())'));
 run('createBattle(0,false,false,LANCE_SLOTS,true,null,0,true,true,true,true,true,false);persist()');
 const old=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(old.run('battle.units.find(u=>u.id==="enemy1").kind'),'tank');
 assert.equal(old.run('JSON.stringify(captureSortie())'),run('JSON.stringify(captureSortie())'));
 assert.equal(run('playerHull(ASHIGARU_FRAME)||hullOnMarket(ASHIGARU_FRAME)||acquireHull(ASHIGARU_FRAME)||assignChassis(0,ASHIGARU_FRAME,true)'),false);
 assert.equal(run('RANGED.concat(MELEE).some(w=>w.scout)'),false);
 const seen=[];
 sim.sandbox.seen=seen;
 run(`const engageScout=engage;engage=(a,t,p,w)=>{if(a.frame===ASHIGARU_FRAME)seen.push(w.id);return engageScout(a,t,p,w)}`);
 for(const [range,right,left,expected,finishRange] of [[8,1,1,carbine,3],[2,1,1,scatter,2],[1,1,1,knife,1],
  [4,0,1,knife,1],[1,1,0,scatter,1],[1,0,0,null,1]]){
  seen.length=0;
  run(`createBattle(0);{
   const u=${scout},a=current();
   battle.units=battle.units.filter(x=>x===u||x===a);battle.cover.clear();
   Object.assign(u,{x:8,z:${15-range},vx:8,vz:${15-range},reacted:true});a.reacted=true;
   Object.assign(a,{x:8,z:15,vx:8,vz:15});
   if(!${right})u.hp.right=0;if(!${left})u.hp.left=0;
  }`);
  await run('endTurn()');
  assert.deepEqual(seen,expected?[expected]:[]);
  assert.equal(run(`distance(${scout},current())`),finishRange);
  assert.equal(run(`reactionWeapon(${scout},current())?.id??null`),finishRange<=2?expected:null);
 }
 run('createBattle(0);for(const u of battle.units)if(u.team==="enemy")u.alive=false;finish(true)');
 assert.equal(run('save.salvage?.[ASHIGARU_FRAME]'),undefined);
 console.log('PASS Ashigaru roster, legacy and new checkpoints, range switches, counters, arm loss, and enemy-only equipment');
})().catch(error=>{console.error(error);process.exitCode=1});
