const assertLegacySortie=require('./legacy-sortie-check.cjs');
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
 assertLegacySortie(assert,JSON.parse(resume('JSON.stringify(captureSortie())')),JSON.parse(raw).sortie);
 if(frame===16)assert.equal(resume(`unitWeapon(battle.units.find(u=>u.id==="${id}")).rounds`),16);
}
console.log('PASS Reaver Medium+ hostile rosters, acquisition exclusions, victory salvage and old/new checkpoint restore');

(async()=>{
 run(`createBattle(2,false,false,[0,1,2]);
  const reaver=battle.units.find(u=>u.frame===REAVER_FRAME),target=current(),reaverGun=unitWeapon(reaver);
  Object.assign(reaver,{x:5,z:9,vx:5,vz:9});Object.assign(target,{x:5,z:11,vx:5,vz:11,armor:6});
  battle.cover.clear();
  const hitPlan=(reaction=false)=>planVolley(reaver,target,'body',salvoWeapon(reaver,reaverGun),reaction);
  const volleyDamage=p=>p.impacts.reduce((n,{amount})=>n+amount,0);
  const totalHP=u=>Object.values(u.hp).reduce((a,b)=>a+b,0);
  const fullHealth={...target.hp};
  const oldGun={...weapon('rifle'),burst:0};
 `);
 const dualBeats=JSON.parse(run('JSON.stringify(attackProfile(reaver,reaverGun.id).beats)'));
 assert.equal(dualBeats.length,16);
 assert.equal(new Set(dualBeats).size,8);
 for(let i=0;i<dualBeats.length;i+=2)assert.equal(dualBeats[i],dualBeats[i+1]);
 const stock=JSON.parse(run(`JSON.stringify({rounds:hitPlan().rounds.length,damage:volleyDamage(hitPlan()),
  prior:volleyDamage(planVolley(reaver,target,'body',oldGun,false)),preview:attackPreview(reaver,target,reaverGun)})`));
 assert.deepEqual([stock.rounds,stock.damage,stock.prior],[16,28,32]);
 assert.match(stock.preview,/\/ROUND.*28 DMG/);
 assert.equal(run('target.brace=true;volleyDamage(hitPlan())'),14);
 assert.equal(run("target.brace=false;target.shield='citadel-shield';const shielded=hitPlan();shielded.guard&&shielded.impacts.length===1&&shielded.impacts[0].part==='left'&&volleyDamage(shielded)"),18);
 assert.equal(run('delete target.shield;reaver.training={rangedPower:.2,reactionPower:.15};volleyDamage(hitPlan())'),34);
 assert.equal(run('volleyDamage(hitPlan(true))'),39);
 assert.equal(run('reaver.boost=true;volleyDamage(hitPlan())'),54);
 run('reaver.boost=false;delete reaver.training');
 assert.ok(run('ruleRandom=()=>.99;const dodge=hitPlan();dodge.dodged&&!dodge.landed&&!volleyDamage(dodge)'));
 assert.equal(run('let drawCount=0;ruleRandom=()=>drawCount++<2||drawCount===18?0:.99;const grazed=hitPlan();grazed.landed===1&&volleyDamage(grazed)'),2);
 run('ruleRandom=()=>0');

 for(const offline of ['left','right']){
  run(`Object.assign(reaver.hp,reaver.max);reaver.hp.${offline}=0;reaver.ap=8;target.hp={...fullHealth}`);
  assert.equal(run('hitPlan().rounds.length'),8);
  assert.equal(run('volleyDamage(hitPlan())'),14);
  assert.equal(run('attackProfile(reaver,reaverGun.id).beats.length'),8);
  assert.match(run('attackPreview(reaver,target,reaverGun)'),/\/ROUND.*14 DMG/);
  assert.ok(run('canUseWeapon(reaver,reaverGun)&&reactionWeapon(reaver,target)===reaverGun'));
  await run("shoot(reaver,target,'body')");
  assert.deepEqual(JSON.parse(run('JSON.stringify([reaver.ap,fullHealth.body-target.hp.body])')),[5,14]);
 }
 run('reaver.hp.right=reaver.hp.left=0;reaver.ap=8;target.hp={...fullHealth}');
 assert.ok(run('!canUseWeapon(reaver,reaverGun)&&!reactionWeapon(reaver,target)&&!isArmed(reaver)'));
 await run("shoot(reaver,target,'body')");
 assert.ok(run('reaver.ap===8&&target.hp.body===fullHealth.body'));

 run('reaver.hp.left=reaver.max.left;reaver.ap=counterCost(reaver,target,reaverGun)');
 await run("engage(target,reaver,'body',unitWeapon(target))");
 assert.ok(run('reaver.reacted&&reaver.ap===0&&fullHealth.body-target.hp.body===14'));
 await run("engage(target,reaver,'body',unitWeapon(target))");
 assert.equal(run('fullHealth.body-target.hp.body'),14,'No second counter after spending the last AP');

 run(`Object.assign(reaver.hp,reaver.max);reaver.ap=8;target.hp={...fullHealth};
  reaver.order={discount:1,power:.2,shots:1};const totalOrderDamage=volleyDamage(hitPlan())`);
 await run("shoot(reaver,target,'body')");
 assert.ok(run('reaver.ap===6&&reaver.order===undefined&&fullHealth.body-target.hp.body===totalOrderDamage&&totalOrderDamage===34'));
 console.log('PASS Reaver 16/8 projectiles, 8 paired beats, armor/brace/shield/dodge and buffs, 3 AP burst, paid counter, and zero-arm lockout');
})().catch(error=>{console.error(error);process.exitCode=1});
