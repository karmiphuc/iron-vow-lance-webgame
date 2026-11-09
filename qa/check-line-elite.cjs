const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const options={foundry:true,random:()=>0,reducedMotion:true};
 const sim=simulate(options),{run}=sim;
 assert.equal(run('FRAMES[LINE_ELITE_FRAME].role'),'ELITE');
 assert.equal(run('FRAMES[LINE_ELITE_FRAME].enemyOnly'),true);
 for(const stat of ['hp','arm','leg','armor'])assert.ok(run(`FRAMES[LINE_ELITE_FRAME].${stat}>FRAMES[LINE_INFANTRY_FRAME].${stat}`),stat);
 assert.equal(run('hullOnMarket(LINE_ELITE_FRAME)||acquireHull(LINE_ELITE_FRAME)||assignChassis(0,LINE_ELITE_FRAME,true)'),false);
 assert.equal(run('validSave({...save,salvage:{[LINE_ELITE_FRAME]:1}})'),false);
 for(let i=0;i<run('CONTRACTS.length');i++){
  run(`createBattle(${i})`);
  assert.equal(run('battle.units.filter(u=>u.team==="enemy"&&u.frame===LINE_ELITE_FRAME).length'),i===2?1:0);
 }
 run('battle=null;deploy(2,false,[0]);closeModal()');
 const frame=run('LINE_ELITE_FRAME');
 const foe=run('battle.units[1].frame');
 assert.equal(foe,frame);
 await run('endTurn()');
 await run('endTurn()');
 assert.ok(run('battle.log.some(line=>line.startsWith("LINE INFANTRY ELITE 1 → WARDEN"))'));
 const resumed=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(resumed.run('battle.units[1].frame'),frame);
 assert.equal(resumed.run('JSON.stringify(captureSortie())'),run('JSON.stringify(captureSortie())'));
 run('for(const u of battle.units.filter(u=>u.team==="enemy")){u.alive=false;u.hp.body=0}finish(true)');
 assert.equal(run('save.salvage?.[LINE_ELITE_FRAME]'),undefined);
 console.log('PASS LI-02 Corridor AI fire, heavier armor, checkpoint, market and salvage exclusion');
})().catch(error=>{console.error(error);process.exitCode=1});
