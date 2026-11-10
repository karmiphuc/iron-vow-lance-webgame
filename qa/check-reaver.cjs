const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');

const options={foundry:true,random:()=>0,reducedMotion:true};
const {run}=simulate(options);
assert.equal(run('REAVER_FRAME'),16);
assert.equal(run('foundryModel(REAVER_FRAME)'),9);
assert.equal(run('FRAMES[REAVER_FRAME].role'),'MEDIUM+');
run('save.credits=100000;save.rep=100;workshopView="market"');
assert.equal(run('chassisAssignments(0).includes("REAVER")||hullOnMarket(REAVER_FRAME)||acquireHull(REAVER_FRAME)||assignChassis(0,REAVER_FRAME,true)'),false);
assert.ok(run('validSave({...save,reserve:{[REAVER_FRAME]:stockHull(REAVER_FRAME)}})'));
assert.ok(run('validSave({...save,salvage:{[REAVER_FRAME]:1}})'));
run('save.salvage={[REAVER_FRAME]:1};workshopView="salvage"');
assert.ok(run('chassisAssignments(0).includes("REAVER")&&acquireHull(REAVER_FRAME,true)&&assignChassis(0,REAVER_FRAME)'));
run('save=fresh()');
for(const slots of [[0],[0,1],[0,1,2]])for(let i=0;i<4;i++){
 run(`createBattle(${i},false,false,${JSON.stringify(slots)})`);
 const found=run('battle.units.filter(u=>u.frame===REAVER_FRAME).map(u=>u.team+":"+u.index).join(",")');
 assert.equal(found,slots.length!==3?'':i===2?'enemy:2':i===3?'enemy:4':'');
 if(i>=2&&slots.length>=2)assert.equal(run('battle.units.find(u=>u.id==="enemy1").frame'),15);
 if(found)assert.equal(run('battle.units.find(u=>u.frame===REAVER_FRAME).paint'),null);
}
run('createBattle(2,true,true)');
assert.equal(run('battle.units.some(u=>u.frame===REAVER_FRAME)'),false);
run('createBattle(2,false,false,[0,1,2]);for(const foe of battle.units.filter(u=>u.team==="enemy")){foe.alive=false;foe.hp.body=0}finish(true)');
assert.equal(run('save.salvage?.[REAVER_FRAME]'),undefined);
assert.equal(run('save.reserve?.[REAVER_FRAME]'),undefined);

for(const [file,id,frame] of [['v56-corridor.json','enemy1',6],['reaver-corridor.json','enemy2',16]]){
 const raw=readFileSync(join(__dirname,'fixtures',file),'utf8');
 const {run:resume}=simulate({...options,storage:new Map([['iron-vow-career',raw]])});
 assert.equal(resume(`battle.units.find(u=>u.id==="${id}").frame`),frame);
 assert.deepEqual(JSON.parse(resume('JSON.stringify(captureSortie())')),JSON.parse(raw).sortie);
}
console.log('PASS Reaver Medium+ hostile rosters, acquisition exclusions, victory salvage and old/new checkpoint restore');
