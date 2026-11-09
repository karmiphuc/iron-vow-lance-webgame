const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const {run}=simulate({random:()=>0,reducedMotion:true});
 run(`const rifle=weapon('rifle'),missile=weapon('missile');
  function setupRidge(){
   createBattle(1,false,false,[0]);surveyTerrain(0);battle.cover.clear();
   const a=current(),t=battle.units[1];
   battle.units=[a,t];t.weapon='rifle';
   Object.assign(a,{x:6,z:8,vx:6,vz:8});
   Object.assign(t,{x:2,z:8,vx:2,vz:8});
   for(const cell of battle.field.cells)cell.level=0;
   terrainCell(4,8).level=2;
   return [a,t];
  }
  let [a,t]=setupRidge();`);
 assert.equal(run('attackObstruction(a,t,rifle)'), 'RIDGE BLOCK');
 assert.equal(run('attackObstruction(t,a,rifle)'), 'RIDGE BLOCK');
 assert.equal(run('attackObstruction(a,t,missile)'), '');
 assert.equal(run('attackObstruction(a,t,weapon("locust"))'), '');
 assert.equal(run('reactionWeapon(t,a)'),null);
 const before=run('JSON.stringify([a.ap,t.hp,t.reacted])');
 await run('engage(a,t,"body",rifle)');
 await run('shoot(a,t,"body",rifle)');
 assert.equal(run('JSON.stringify([a.ap,t.hp,t.reacted])'),before,'blocked attacks spend nothing and trigger no counter');
 await run('engage(a,t,"body",missile)');
 assert.ok(run('a.ap===ROUND_AP-missile.ap&&t.hp.body<t.max.body&&!t.reacted'),'missile hits without opening a blocked counter lane');

 run('[a,t]=setupRidge();terrainCell(4,8).level=0;const flat=hitChance(a,t,"pilot",rifle);terrainCell(6,8).level=2');
 assert.ok(run('Math.abs(hitChance(a,t,"pilot",rifle)-flat-.10*(1-dodgeChance(t)))<1e-8'));
 assert.equal(run('highGroundAim(a,t,missile)'),0);
 assert.equal(run('highGroundAim(a,t,weapon("cleaver"))'),0);
 assert.equal(run('highGroundAim({...a,kind:"tank"},t,rifle)'),0);
 assert.equal(run('highGroundAim(t,a,rifle)'),0);
 assert.equal(run('ridgeBlocks({...a,x:2,z:2},{...t,x:4,z:4})'),false);
 run('terrainCell(3,2).level=3');
 assert.equal(run('ridgeBlocks({...a,x:2,z:2},{...t,x:4,z:4})'),false,'a corner grazing a ridge does not block');
 run('terrainCell(3,3).level=3');
 assert.equal(run('ridgeBlocks({...a,x:2,z:2},{...t,x:4,z:4})'),true,'diagonal ridge blocks its actual tile');
 assert.equal(run('ridgeBlocks({...a,x:2,z:2,kind:"helicopter"},{...t,x:4,z:4,kind:"helicopter"})'),false);

 run('[a,t]=setupRidge()');
 await run('endTurn()');
 assert.ok(run('(t.x!==2||t.z!==8)&&!ridgeBlocks(t,a)&&targetParts(a).some(part=>a.hp[part]<a.max[part])'),'blocked AI moves to a clear firing lane and shoots');
 console.log('PASS high-ground aim, symmetric ridge sightlines, indirect fire, blocked AP and reactions, and AI repositioning');
})().catch(error=>{console.error(error);process.exitCode=1});
