const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

async function main(){
 const sim=simulate({seed:42,reducedMotion:true});
 const state=code=>JSON.parse(sim.run('JSON.stringify('+code+')'));
 sim.run(`
  Object.assign(save.units[0],stockHull(GIZA_FRAME),{frame:GIZA_FRAME});
  Object.assign(save.units[1],stockHull(VYZOV_FRAME),{frame:VYZOV_FRAME});
  createBattle(1,true,true);
  battle.cover.clear();
  var giza=battle.units[0],vyzov=battle.units[1],ally=battle.units[2],hostiles=battle.units.filter(u=>u.team==='enemy');
  var place=(u,x,z)=>Object.assign(u,{x,z,vx:x,vz:z});
  place(giza,2,4);place(vyzov,5,4);place(ally,6,4);place(hostiles[0],4,3);place(hostiles[1],6,3);
  var launches=[],landings=[];
  window.IronVowScene={aimAt(){},attachmentPoint(){return {x:0,y:0};},projectWorld(point){return point;},project(){return {x:0,y:0};},combat:{launch(a,t,w,index){launches.push([a.id,t.id,w.id,index]);},landed(a,t,w,event){landings.push([t.id,event.before,event.after]);}}};
  ruleRandom=()=>.005;
 `);
 assert.deepEqual(state('mortarCross(0,0)'),[{x:0,z:0},{x:1,z:0},{x:0,z:1}]);
 assert.deepEqual(state('mortarCross(0,4)'),[{x:0,z:4},{x:0,z:3},{x:1,z:4},{x:0,z:5}]);
 assert.equal(sim.run('mortarCross(4,3).length'),5);
 assert.equal(sim.run("tacticalPlan(giza,{target:ally.id})"),null);
 assert.equal(sim.run('tacticalPlan(vyzov,{x:9,z:9})'),null);
 assert.equal(sim.run('tacticalPlan(vyzov,{x:-1,z:4})'),null);
 assert.equal(sim.run('tacticalPlan(vyzov,{x:1.5,z:4})'),null);
 assert.equal(sim.run("giza.hp.left=0;canTactical(giza)"),false);
 sim.run('giza.hp.left=giza.max.left;hostiles[0].reacted=true;var gizaAp=giza.ap,foeHp=hostiles[0].hp.body');
 await sim.run('executeTactical(giza,tacticalPlan(giza,{target:hostiles[0].id}))');
 assert.deepEqual(state('launches'),[['ally0','enemy0','giza-salvo',0],['ally0','enemy0','giza-salvo',1]]);
 assert.equal(sim.run('landings.length'),2,'two separately resolved impacts');
 assert.ok(sim.run('hostiles[0].hp.body<foeHp&&giza.ap===gizaAp-3&&giza.tacticalUsed&&!canTactical(giza)'));
 sim.run(`
  var cross=tacticalPlan(vyzov,{x:5,z:3});
  var mortarAp=vyzov.ap,vyzovHp=vyzov.hp.body,bystanderHp=ally.hp.body,preKills=save.kills;
  hostiles[0].hp.body=1;hostiles[1].hp.body=1;
 `);
 assert.deepEqual(state('cross.affected.map(u=>u.id)'),['ally1','enemy0','enemy1'],'empty center, three orthogonal units, diagonal excluded');
 assert.deepEqual(state('cross.friendly.map(u=>u.id)'),['ally1'],'the caster also counts as friendly damage');
 await sim.run('executeTactical(vyzov,cross)');
 assert.ok(sim.run('vyzov.ap===mortarAp-3&&vyzov.hp.body<vyzovHp&&ally.hp.body===bystanderHp&&vyzov.tacticalUsed&&!canTactical(vyzov)'));
 assert.ok(sim.run('!hostiles[0].alive&&!hostiles[1].alive&&hostiles[0].downReason==="body"&&save.kills===preKills+2'));
 sim.run('action="tactical";tacticalAim={actor:giza.id,target:"other"};save.sortie=captureSortie()');
 assert.ok(sim.run('save.sortie.action==="move"&&save.sortie.units[0].tacticalUsed&&save.sortie.units[1].tacticalUsed'));
 assert.ok(sim.run('restoreSortie()!==null&&battle.units[0].tacticalUsed&&battle.units[1].tacticalUsed'),'used flags survive a real sortie reload');
 assert.ok(sim.run('completeRound();battle.units[0].tacticalUsed&&battle.units[1].tacticalUsed'),'a new round keeps both charges spent');
 assert.ok(sim.run('createBattle(1,true,true);!battle.units[0].tacticalUsed&&!battle.units[1].tacticalUsed'),'new sortie resets both abilities');

 sim.run(`
  giza=battle.units[0];vyzov=battle.units[1];ally=battle.units[2];hostiles=battle.units.filter(u=>u.team==='enemy');
  battle.cover.clear();place(vyzov,4,4);place(hostiles[0],4,5);place(ally,4,3);
 `);
 await sim.run('enemyTactical(vyzov,[hostiles[0]])');
 assert.ok(sim.run('vyzov.tacticalUsed&&vyzov.hp.body===vyzov.max.body'),'AI picks the safe aim beyond its target and avoids self damage');
 sim.run(`
  createBattle(1,true,true);battle.cover.clear();
  vyzov=battle.units[1];hostiles=battle.units.filter(u=>u.team==='enemy');
  place(vyzov,4,4);place(hostiles[0],4,6);
  for(const foe of hostiles.slice(1)){foe.alive=false;foe.hp.body=0}
  hostiles[0].hp.body=1;
  selected=1;action='tactical';tacticalAim={actor:vyzov.id,x:4,z:6};
  var winsBefore=save.wins,creditsBefore=save.credits;
 `);
 await sim.run('commitTactical()');
 assert.ok(sim.run('!battle&&save.history.at(-1).win&&save.wins===winsBefore+1&&save.credits>creditsBefore'),
  'the final mortar KO follows normal victory, debrief and payout');
 console.log('PASS tactical specials: split cannon impacts, cross clipping, empty center, actual friendly damage and KOs, safe AI aim, persisted charges and new-sortie reset');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
