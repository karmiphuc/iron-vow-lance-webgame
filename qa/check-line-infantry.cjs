const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const {play}=require('./check-missions.cjs');

(async()=>{
 const options={foundry:true,random:()=>0,reducedMotion:true};
 const sim=simulate(options),{run}=sim;
 const frame=run('LINE_INFANTRY_FRAME');
 assert.equal(run('FRAMES[LINE_INFANTRY_FRAME].role'),'STANDARD');
 assert.equal(run('FRAMES[LINE_INFANTRY_FRAME].enemyOnly'),true);
 run('save.credits=100000;save.rep=100;workshopView="market"');
 assert.equal(run('chassisAssignments(0).includes("LINE INFANTRY")'),false);
 assert.equal(run('hullOnMarket(LINE_INFANTRY_FRAME)||acquireHull(LINE_INFANTRY_FRAME)||assignChassis(0,LINE_INFANTRY_FRAME,true)'),false);
 assert.equal(run('validSave({...save,reserve:{[LINE_INFANTRY_FRAME]:stockHull(LINE_INFANTRY_FRAME)}})'),false);
 assert.equal(run('validSave({...save,salvage:{[LINE_INFANTRY_FRAME]:1}})'),false);
 run('save.salvage={[LINE_INFANTRY_FRAME]:1};workshopView="salvage"');
 assert.equal(run('chassisAssignments(0).includes("LINE INFANTRY")||acquireHull(LINE_INFANTRY_FRAME,true)||recycleHullBody(LINE_INFANTRY_FRAME)'),false);
 run('save=fresh()');

 for(const slots of [[0],[0,1],[0,1,2]]){
  run(`createBattle(0,false,false,${JSON.stringify(slots)})`);
  assert.equal(run('battle.units.filter(u=>u.team==="enemy"&&u.frame===LINE_INFANTRY_FRAME).length'),1);
 }
 for(let i=1;i<run('CONTRACTS.length');i++){
  run(`createBattle(${i})`);
  assert.equal(run('battle.units.some(u=>u.frame===LINE_INFANTRY_FRAME)'),false);
 }
 assert.equal(run('hostileFrame(0,CONTRACTS[0],true)'),0);
 run('battle=null;deploy(0,false,[0]);closeModal()');
 await run('endTurn()');
 assert.ok(run('battle.log.some(line=>line.startsWith("LINE INFANTRY 1 → WARDEN"))'));
 assert.ok(run('targetParts(current()).some(part=>current().hp[part]<current().max[part])'));
 const resumed=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(resumed.run('battle.units.find(u=>u.team==="enemy").frame'),frame);
 assert.equal(resumed.run('JSON.stringify(captureSortie())'),run('JSON.stringify(captureSortie())'));

 const victory=simulate({seed:1,reducedMotion:true});
 assert.equal((await play(victory,0,[0])).win,true);
 assert.equal(victory.run('save.salvage?.[LINE_INFANTRY_FRAME]'),undefined);
 assert.equal(victory.run('save.reserve?.[LINE_INFANTRY_FRAME]'),undefined);
 console.log('PASS LI-01 enemy turn, checkpoint restore, market, rebuild and Picket victory salvage');
})().catch(error=>{console.error(error);process.exitCode=1});
