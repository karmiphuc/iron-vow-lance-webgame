const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const fixture=require('./fixtures/aero-relay.json');
let roll=0;
const options={random:()=>roll};
const sim=simulate(options),{run}=sim;
const ids=['cleaver','breaker','piledriver','blade'];

(async()=>{
 assert.equal(run('FRAMES[AERO_FRAME].name'),'AERO');
 assert.equal(run('FRAMES[AERO_FRAME].cost'),400000);
 assert.equal(run('hullOnMarket(AERO_FRAME)&&!acquireHull(AERO_FRAME)'),true);
 assert.equal(run('validSave({...save,salvage:{[AERO_FRAME]:1}})'),false);

 for(let day=1;day<=4;day++){
  const id=ids[day-1];
  run(`save.day=${day}; createBattle(1,false,false,[0,1])`);
  assert.equal(run('battle.aeroMelee'),id);
  assert.equal(run('battle.units.find(u=>u.frame===AERO_FRAME).melee'),id);
  assert.equal(run('captureSortie().aeroMelee'),id);
  run(`{
   const u=battle.units.find(u=>u.frame===AERO_FRAME),t=current(),profile=attackProfile(u,"${id}");
   Object.assign(u,{attack:{kind:"${id}",start:10,fireAt:10+profile.raise,releaseAt:10+profile.raise+profile.travel}});
   const pose=animationPose(u,u.attack.releaseAt);
   if(pose.strikeKind!=="${id}"||Math.abs(pose.strikeProgress-.7)>1e-6)throw Error("Incorrect impact phase");
   u.attack=null;
   if(save.day===3)u.hp.right=0;
   battle.units=[t,u];battle.cover.clear();
   Object.assign(u,{x:7,z:11,vx:7,vz:11});
   Object.assign(t,{x:7,z:15,vx:7,vz:15});
   if(save.day===2)for(const [x,z] of neighborTiles(u.x,u.z))battle.cover.add(x+","+z);
  }`);
  if(day===3)assert.equal(run('isArmed(battle.units[1])&&canUseWeapon(battle.units[1],meleeWeapon(battle.units[1]))'),true);
  await run('endTurn()');
  assert.equal(run('distance(battle.units.find(u=>u.frame===AERO_FRAME),current())'),1);
  if(day===2)assert.equal(run('battle.units[1].jumpjetUsed'),true,'hostile Aero clears blocked terrain');
  assert.ok(run('current().hp.body<current().max.body'),id+' resolves damage through enemy combat');
 }
 run('createBattle(1,false,false,[0])');
 assert.equal(run('battle.units.some(u=>u.frame===AERO_FRAME)'),false);
 run('createBattle(1,false,false,[0,1],true,null,0,true,true,true,true,true,true,null);persist()');
 const old=simulate({...options,storage:new Map(sim.storage)});
 assert.equal(old.run('battle.units.some(u=>u.frame===AERO_FRAME)'),false);
 const restored=simulate({...options,storage:new Map([['iron-vow-career',JSON.stringify(fixture)]])});
 assert.equal(restored.run('battle.units.find(u=>u.frame===AERO_FRAME).melee'),'piledriver');
 assert.equal(restored.run('captureSortie().aeroMelee'),'piledriver');
 restored.run('save.sortie.aeroMelee="rifle"');
 assert.equal(restored.run('restoreSortie()'),null);

 const player=simulate(options);
 const play=player.run;
 assert.equal(play('save.credits=400000;acquireHull(AERO_FRAME)'),true);
 assert.equal(play('save.credits===0&&save.reserve[AERO_FRAME].melee==="blade"&&!hullOnMarket(AERO_FRAME)'),true);
 assert.equal(play('assignChassis(0,AERO_FRAME,true)'),true);
 play('createBattle(0,false,false,[0]);let aero=current(),attacker=battle.units.find(u=>u.team==="enemy");battle.cover.clear();battle.cover.add("2,16")');
 assert.equal(play('aero.melee'),'blade');
 assert.equal(play('movementLimit(aero)'),7);
 assert.equal(play('jumpjetLanding(aero,2,16)||jumpjetLanding(aero,7,16)||jumpjetLanding(aero,1,16)'),false);
 assert.equal(await play('useJumpjet(aero,4,16)'),true);
 assert.equal(play('aero.x===4&&aero.z===16&&aero.ap===11&&movementLimit(aero)===4&&aero.jumpjetUsed'),true);
 assert.equal(await play('useJumpjet(aero,5,16)'),false);

 const jetSave=require('./fixtures/aero-jumpjet.json');
 const resumed=simulate({...options,storage:new Map([['iron-vow-career',JSON.stringify(jetSave)]])});
 assert.equal(resumed.run('current().frame===AERO_FRAME&&current().jumpjetUsed&&current().x===4&&current().ap===6'),true);
 assert.equal(resumed.run('resetMovement(current());current().ap=8;canJumpjet(current())'),false);
 assert.equal(resumed.run('createBattle(0,false,false,[0]);canJumpjet(current())'),true);
 assert.equal(resumed.run('current().hp.legs=0;canJumpjet(current())'),false);

 play('battle.cover.clear();attacker.x=aero.x+1;attacker.z=aero.z');
 assert.equal(play('hitChance(attacker,aero,"body")'),play('hitChance(attacker,{...aero,frame:null},"body")*.85'));
 const initialHP=play('aero.hp.body');
 roll=.86;
 for(const id of ['rifle','missile','breaker']){
  await play(`attacker.ap=8;attacker.attackAPSpent=0;shoot(attacker,aero,"body",weapon("${id}"))`);
  assert.equal(play('aero.hp.body'),initialHP,id+' dodge');
  assert.ok(play('battle.log.at(-1).includes("dodged")'));
 }
 await play('attacker.ap=8;shoot(attacker,aero,"body",weapon("rifle"),true)');
 assert.equal(play('aero.hp.body'),initialHP,'counter dodge');
 roll=.5;
 await play('attacker.ap=8;attacker.attackAPSpent=0;shoot(attacker,aero,"body",weapon("rifle"))');
 assert.ok(play('aero.hp.body')<initialHP,'normal hit still lands outside dodge band');
 console.log('PASS Aero purchase, saved Jumpjet, ranged/melee/counter dodge and all four Relay attacks');
})().catch(error=>{console.error(error);process.exitCode=1});
