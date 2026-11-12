const assert=require('node:assert/strict');
const fixture=require('./fixtures/terrain-sortie.json');
const simulate=require('./sim-harness.cjs');
const key='iron-vow-career';
const {run}=simulate({reducedMotion:true});
const checks=JSON.parse(run(`JSON.stringify(CONTRACTS.map((_,i)=>{
 const maps=new Set();
 let valid=true;
 for(let seed=0;seed<24;seed++){
  createBattle(i);surveyTerrain(seed);
  const {width,depth}=battle.size,{cells}=battle.field;
  maps.add(JSON.stringify([cells.map(cell=>[cell.level,cell.links]),[...battle.cover].sort()]));
  setFieldProjection();
  const open=([x,z])=>onBoard(x,z)&&!battle.cover.has(x+','+z);
  const queue=[[0,19]],seen=new Set(['0,19']);
  for(const [x,z] of queue)for(const [a,b] of neighborTiles(x,z)){
   if(open([a,b])&&!seen.has(a+','+b)){seen.add(a+','+b);queue.push([a,b])}
  }
  valid&&=battle.units.every(u=>open([u.x,u.z]))&&seen.size+battle.cover.size===cells.length&&
   battle.cover.size>=15&&cells.some(cell=>cell.level>=2)&&cells.some(cell=>cell.links);
  for(let x=0;x<width;x++)for(let z=0;z<depth;z++){
   const cell=terrainCell(x,z);
   valid&&=neighborTiles(x,z).every(([a,b])=>!onBoard(a,b)||Math.abs(terrainCell(a,b).level-cell.level)<=1);
  }
 }
 return {valid,unique:maps.size};
}))`));
assert.deepEqual(checks,Array(4).fill({valid:true,unique:24}),'all contracts vary terrain, preserve deployment and connected ground, and retain valid slopes');
const saved=JSON.stringify(fixture);
const resumed=simulate({storage:new Map([[key,saved]]),reducedMotion:true});
assert.equal(resumed.run('JSON.stringify(captureSortie())'),JSON.stringify(fixture.sortie));
assert.ok(resumed.run('terrainHeight(current().x,current().z)>0'),'fixture resumes on a raised tile');
const terrain=resumed.run('JSON.stringify(battle.field.cells)');
resumed.run('persist()');
const again=simulate({storage:new Map(resumed.storage),random:()=>.94,reducedMotion:true});
assert.equal(again.run('JSON.stringify(battle.field.cells)'),terrain,'terrain is independent of the reload RNG');
const corrupt=JSON.parse(saved);
corrupt.sortie.terrainSeed=-1;
assert.equal(simulate({storage:new Map([[key,JSON.stringify(corrupt)]])}).run('battle'),null);
console.log('PASS 96 seeded maps, connected terrain, valid slopes and save-stable terrain; raycast picking is tested in Chromium');
