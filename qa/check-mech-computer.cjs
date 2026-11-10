const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const fixture=require('./fixtures/mech-mastery.json');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true}),{run}=sim;
 run(`
  const rook=pilotId(0);
  save.mechMastery={[rook]:{kills:{0:4,1:5}}};
  const equip=(slot,id)=>equipMechSkill(0,0,slot,id);
  const learnFight=()=>{
   createBattle(1,false,false,[0]);enableMechComputers();
   const ally=current(),foe=battle.units[1];
   Object.assign(foe,{x:ally.x+1,vx:ally.x+1,z:ally.z,vz:ally.z});
   foe.hp.body=1;
   return [ally,foe];
  };
 `);
 assert.equal(run('equip(0,1)'),true);
 assert.equal(run('equip(1,1)'),false);
 assert.equal(run('equip(0,0)'),false,'native skill occupies its own slot');
 assert.equal(run('equip(0,2)'),false,'unlearned skills cannot be equipped');
 await run('let [ally,foe]=learnFight();shoot(ally,foe,"body")');
 assert.equal(run('mechKills(0,0)'),5);
 assert.match(run('battle.log.join(" ")'),/learned Steady Aim/);
 assert.ok(run('hasMechSkill(ally,0)&&hasMechSkill(ally,1)'));
 assert.equal(run('mechKills(0,1)'),5,'kills count for the frame worn');

 await run(`[ally,foe]=learnFight();const tank=battle.units.find(u=>u.kind);
  Object.assign(tank,{x:ally.x+2,vx:ally.x+2,z:ally.z,vz:ally.z});tank.hp.body=1;
  shoot(ally,tank,'body')`);
 assert.equal(run('mechKills(0,0)'),5,'vehicles never count');
 await run(`save.mechMastery[rook].kills[0]=24;[ally,foe]=learnFight();
  shoot(ally,foe,'body',weapon('rifle'),true)`);
 assert.equal(run('mechKills(0,0)'),25,'counter kills count');
 assert.match(run('battle.log.join(" ")'),/Mech Mastery/);
 run('battle=null;save.mechMastery[rook].kills[2]=5');
 assert.equal(run('equip(1,2)'),true);
 assert.equal(run('equip(1,1)'),false,'a learned skill cannot fill both slots');
 assert.equal(run('equipMechSkill(0,1,1,2)'),false,'mastery belongs to the pilot and chassis pairing');
 run('save.credits=999999;hirePilot(3);assignPilot(0,3)');
 assert.equal(run('mechKills(pilotClass(0),0)'),0,'a different pilot has independent progress');
 run('seatPilot(0,rook)');
 assert.equal(run('mechKills(pilotClass(0),0)'),25,'mastery follows the pilot through reserve');
 assert.ok(run('validSave(save)'));
 assert.equal(run(`(()=>{const invalid=JSON.parse(JSON.stringify(save));invalid.mechMastery[rook].slots[0]=[1,1];return validSave(invalid)})()`),false);

 const resumed=simulate({reducedMotion:true,storage:new Map([['iron-vow-career',JSON.stringify(fixture)]])});
 assert.equal(resumed.run('JSON.stringify(captureSortie())'),JSON.stringify(fixture.sortie));
 assert.ok(resumed.run('current().jumpjetUsed&&hasMechSkill(current(),AERO_FRAME)&&hasMechSkill(current(),1)&&hasMechSkill(current(),0)'));
 assert.ok(resumed.run('current().mechState.moved===1'));
 console.log('PASS mech kill credit, skill learning, two-slot mastery, pilot transfers and portable Jumpjet checkpoint');
})().catch(error=>{console.error(error);process.exitCode=1});
