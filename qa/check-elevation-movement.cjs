const assert=require('node:assert/strict');
const {run}=require('./sim-harness.cjs')();

async function main(){
 run(`createBattle(1,false,false,[0]);surveyTerrain(0);battle.cover.clear();
  const walker=current(),jet=battle.units.find(u=>u.kind==='helicopter');
  battle.units=[walker];
  function reset(ap=8,left=4){
   for(const cell of battle.field.cells)cell.level=0;
   battle.cover.clear();
   Object.assign(walker,{x:6,z:8,vx:6,vz:8,ap,moveLeft:left,heading:headingTo(1,0)});
  }
  const plan=(x,z)=>movementPlans(walker).get(x+','+z);
  reset();terrainCell(7,8).level=1;`);
 assert.equal(run('plan(7,8).ap'),2,'one uphill tile costs two AP');
 assert.equal(run('plan(8,8).ap'),4,'equal-cost routes prefer fewer tiles');
 assert.equal(run('plan(8,8).tiles'),2,'equal-cost routes consume fewer movement tiles');
 const uphill=run('moveUnit(walker,7,8)');
 assert.ok(run('walker.motion.jumpjet&&jumpjetHeight(walker,walker.motion.start+walker.motion.duration/2)>1'),'uphill step visibly boosts');
 await uphill;
 assert.equal(run('walker.ap'),6);
 assert.equal(run('walker.moveLeft'),3);
 assert.equal(run('plan(8,8).ap'),2,'one downhill tile costs two AP');
 await run('moveUnit(walker,8,8)');
 assert.equal(run('walker.ap'),4);
 run('reset(1,1);terrainCell(7,8).level=1');
 assert.equal(run('paths(walker).has("7,8")'),false,'one AP cannot pay for both the extra tile and elevation');
 await run('moveUnit(walker,7,8)');
 assert.equal(run('walker.ap'),1,'a rejected destination spends nothing');
 run('walker.ap=2');
 assert.equal(run('plan(7,8).ap'),2);
 await run('moveUnit(walker,7,8)');
 assert.ok(run('walker.ap===0&&walker.moveLeft===0'));
 run(`reset(1,2);terrainCell(7,8).level=1;
  for(const [x,z] of [[6,7],[6,9],[5,8]])battle.cover.add(x+','+z);`);
 assert.equal(run('paths(walker).has("8,8")'),false,'cannot cross two elevation edges with one AP even when destination is level');
 assert.equal(run('elevationCost({kind:"helicopter"},6,8,7,8)'),0,'airborne vehicles ignore elevation movement charges');
 run(`reset();walker.frame=AERO_FRAME;walker.jumpjetUsed=false;terrainCell(9,8).level=3;battle.cover.add('7,8');`);
 const jetMove=run('useJumpjet(walker,9,8)');
 assert.ok(run('walker.motion.jetLift>3'),'dedicated Jumpjet clears a much higher landing');
 await jetMove;
 assert.ok(run('walker.ap===5&&walker.moveLeft===1&&walker.jumpjetUsed&&walker.x===9'),'dedicated Jumpjet pays per tile and can bypass an obstacle');
 assert.equal(run('highGroundAim(walker,{x:6,z:8},weapon("rifle"))'),.20*3);
 console.log('PASS elevation AP uphill and downhill, cheap detours, AP preview legality, ground boosts, air exemption and higher Jumpjet landings');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
