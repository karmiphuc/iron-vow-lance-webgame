const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const simulate=require('./sim-harness.cjs');
const savedKey='iron-vow-career';
const dist=path.join(__dirname,'../dist');

(async()=>{
 const sim=simulate({random:()=>0}),{run}=sim;
 assert.equal(run('FRAMES.length'),11);
 assert.equal(run('assignChassis(0,6,true)'),true);
 assert.equal(run('save.credits'),1300);
 assert.equal(run("save.owned.includes('blade')"),true);
 assert.equal(run('assignChassis(0,7,true)'),false);
 run("save.units[0].paint='#577eac';save.units[0].trim={s:'#30343b',a:'#ff9944'};save.units[0].condition=81;save.units[0].xp=22");
 assert.equal(run('assignChassis(1,6,true)'),true);
 assert.equal(run('save.units[0].xp'),22);
 assert.equal(run('save.units[1].condition'),81);
 assert.equal(run('save.units[1].trim.a'),'#ff9944');
 assert.equal(run('save.credits'),1300);
 assert.equal(run('validSave(save)'),true);
 for(let i=0;i<4;i++){
  run(`createBattle(${i});draw(1000);battle=null`);
 }
 run("createBattle(3);selected=1;const target=battle.units[3];target.hp.pilot=1;target.x=current().x+1;target.z=current().z;");
 const body=run('target.hp.body');
 await run("shoot(current(),target,'pilot',weapon('blade'))");
 assert.equal(run('target.alive'),false);
 assert.equal(run('target.downReason'),'pilot');
 assert.equal(run('target.hp.body'),body);
 assert.equal(run("effects.some(e=>e.type==='detonation')"),false);
 run('persist()');
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run('battle.units[3].downReason'),'pilot');
 assert.equal(restored.run('battle.units[3].frame'),7);
 assert.equal(restored.run('current().name'),'ONI');

 const older=simulate({random:()=>0});
 older.run('createBattle(3,false,true);persist()');
 const career=JSON.parse(older.storage.get(savedKey));
 career.sortie.version=3;
 delete career.sortie.stockHostiles;
 career.sortie.units.forEach(u=>delete u.hp.pilot);
 const migrated=simulate({storage:new Map([[savedKey,JSON.stringify(career)]])});
 assert.equal(migrated.run('battle.units[3].frame'),0);
 assert.equal(migrated.run('battle.units[3].hp.pilot'),70);
 assert.equal(migrated.run('captureSortie().stockHostiles'),true);
 const generated={};
 new Function('window',fs.readFileSync(path.join(dist,'foundry/baked.js'),'utf8'))(generated);
 for(const visual of generated.IRON_VOW_FOUNDRY_ART){
  assert.equal(visual.frames.length,16);
  assert.ok(visual.frames.every(f=>f.pilot.every(Number.isFinite)&&f.meleeTip.every(Number.isFinite)));
  for(const suffix of ['', '-paint'])assert.ok(fs.existsSync(path.join(dist,'assets',visual.key+suffix+'.webp')));
 }
 console.log('PASS: procurement, swap, paint, Raijin pilot disable, four contract render paths, checkpoint migration and all Foundry motion atlases.');
})().catch(error=>{console.error(error);process.exitCode=1});
