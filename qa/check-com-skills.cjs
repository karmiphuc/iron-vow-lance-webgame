const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const fixture=require('./fixtures/com-readiness.json');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true});
 const {run}=sim;
 run(`
  const rookCom=pilotId(0),ghostCom=pilotId(1);
  save.comPilots={[rookCom]:{progress:{rof:6,covering:6,combo:6},installed:['rof','combo'],partner:ghostCom},
   [ghostCom]:{progress:{overwatch:6},installed:['overwatch']}};
  createBattle(1,false,false,[0,1]);
  startBattleCom(7);battle.cover.clear();battle.field={};
  const shooter=battle.units[0],wing=battle.units[1],enemy=battle.units.find(u=>u.kind);
  Object.assign(shooter,{x:4,z:5,ap:14,melee:'cleaver'});
  Object.assign(wing,{x:6,z:5,ap:0});
  Object.assign(enemy,{x:5,z:5});
  enemy.noCounter=true;enemy.hp.body=enemy.max.body=999;
  const rifleCom=weapon('rifle');
 `);
 assert.equal(run("comBoostWeapon(rifleCom,'rof').burst"),12);
 assert.equal(run("comBoostWeapon(rifleCom,'rof2').burst"),16);
 assert.ok(run("comAttackOptions(shooter,enemy,rifleCom).some(c=>c.id==='combo'&&c.w.id==='cleaver')"));
 assert.equal(run("comOdds(comAttackOptions(shooter,enemy,rifleCom).filter(c=>installedCom(shooter).includes(c.id))).reduce((sum,c)=>sum+c.rate,0)"),15);
 assert.equal(run("validComLoadout(['rof','rof2'],{progress:{rof:6,rof2:6}})"),false);
 assert.equal(run("comSupportOptions(enemy,shooter)[0].id"),'overwatch');
 run('wing.z=8');
 assert.equal(run("comSupportOptions(enemy,shooter)[0].id"),'overwatch','Overwatch does not require proximity to the ally');
 run("save.comPilots[ghostCom].progress.covering=6;save.comPilots[ghostCom].installed=['covering'];");
 assert.equal(run('comSupportOptions(enemy,shooter).length'),0,'Covering requires proximity to the ally');
 run('wing.z=5');
 assert.equal(run('comSupportOptions(enemy,shooter)[0].id'),'covering');
 const accuracy=run("(()=>{ruleRandom=()=>.70;const normal=planVolley(wing,enemy,'body',rifleCom,true);const reaction=planVolley(wing,enemy,'body',{...rifleCom,comAccuracy:.65},true);ruleRandom=()=>0;return normal.landed>0&&reaction.landed===0})()");
 assert.equal(accuracy,true,'Support accuracy uses a relative 35% reduction');
 await run('comSupport(enemy,shooter,null,{defence:new Set()})');
 assert.equal(run('wing.ap'),0,'the support shot is free at zero AP');
 assert.match(run("battle.log.join(' ')"),/Covering/);
 const normal=run("planVolley(shooter,enemy,'body',rifleCom,false)");
 const boosted=run("planVolley(shooter,enemy,'body',comBoostWeapon(rifleCom,'rof'),false)");
 assert.equal(normal.rounds.length,8);assert.equal(boosted.rounds.length,12);
 assert.ok(boosted.impacts[0].amount>=normal.impacts[0].amount*1.45);
 {
  await run("engage(shooter,enemy,'body',rifleCom)");
  assert.equal(run('shooter.ap'),11,'the opening volley is the only paid attack');
  assert.equal(run('shooter.attackAPSpent'),3,'a chained attack uses none of the attack budget');
  assert.match(run("battle.log.join(' ')"),/ROF Up I.*ROF Up I/);
 }
 run("battle.turn++;comPractice(wing,[{id:'overwatch'}]);battle.turn++;comPractice(wing,[{id:'overwatch'}]);");
 assert.equal(run("readinessWeek(7)"),1);
 assert.equal(run("readinessWeek(8)"),2);
 assert.equal(run("readinessWeek(22)"),4);

 const storage=new Map([['iron-vow-career',JSON.stringify(fixture)]]);
 const first=simulate({storage,persistedComRandom:true,reducedMotion:true});
 assert.equal(first.run('battle.com.week'),4);
 assert.ok(first.run("battle.units.some(u=>u.id==='enemy'+(battle.contract.deployment.length+3))"));
 const checkpoint=first.run("JSON.stringify(captureSortie())");
 const next=first.run("Array.from({length:5},comRandom).join('|')");
 const resumed=simulate({storage:new Map([['iron-vow-career',JSON.stringify(fixture)]]),persistedComRandom:true,reducedMotion:true});
 assert.equal(resumed.run('JSON.stringify(captureSortie())'),checkpoint);
 assert.equal(resumed.run("Array.from({length:5},comRandom).join('|')"),next);
 assert.ok(resumed.run("validSave(save)"));
 console.log('PASS COM volley math, free chains, support range and accuracy, slot limits, weekly reinforcement and deterministic checkpoints');
})().catch(error=>{console.error(error);process.exitCode=1});
