const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

function veteran(){
 const sim=simulate({random:()=>0,reducedMotion:true});
 sim.run('save.units.forEach(u=>u.level=5)');
 return sim;
}
function train(sim,i,ids){
 for(const id of ids)assert.equal(sim.run(`learnTraining(${i},'${id}')`),true,id);
}

(async()=>{
 const recruit=simulate({random:()=>0,reducedMotion:true});
 assert.equal(recruit.run('totalTrainingPoints()'),3);
 assert.equal(recruit.run("learnTraining(0,'point-plate')"),false,'rank locked at level 1');
 assert.equal(recruit.run("learnTraining(0,'sighter')"),false,'wrong pilot');
 train(recruit,0,['pathfinder']);
 assert.equal(recruit.run("learnTraining(0,'pathfinder')"),false,'duplicate unlock');
 assert.equal(recruit.run("learnTraining(0,'close-quarters')"),false,'point already spent');
 recruit.run("createBattle(0);save.units[0].xp=30");
 assert.equal(recruit.run('freeMovement(current())'),6);
 assert.equal(recruit.run("learnTraining(1,'sighter')"),false,'sortie loadout is locked');
 recruit.run('finish(true)');
 assert.equal(recruit.run('save.units[0].level'),2);
 assert.equal(recruit.run('trainingPoints(0)'),1);
 assert.match(recruit.node('#modal').innerHTML,/ROOK LV 2/);
 assert.match(recruit.node('#modal').innerHTML,/TRAIN PILOTS/);
 train(recruit,0,['close-quarters']);
 assert.equal(recruit.run('trainingPoints(0)'),0);
 console.log('PASS: starting points, real sortie promotion, prerequisites, pilot ownership and mission training entry.');

 const lance=veteran();
 assert.equal(lance.run("learnTraining(0,'redline')"),false,'veterans still need prerequisites');
 train(lance,0,['pathfinder','point-plate','redline','close-quarters','breach-drill']);
 train(lance,1,['sighter','ballistics','rangefinder','weak-points','cockpit-read']);
 train(lance,2,['bulkhead','spare-parts','rebuild','reserve-cell','reactive-brace']);
 assert.equal(lance.run("trainingStatus(0,'follow-through',learnedTraining(0),5)"),'CAPSTONE CHOSEN');
 assert.equal(lance.run("learnTraining(2,'return-fire')"),false,'a pilot gets one capstone');
 assert.equal(lance.run('totalTrainingPoints()'),0);
 lance.run("assignChassis(0,1,true);save.units[0].condition=80;page='workshop';render()");
 const workshop=lance.node('#ui').innerHTML;
 assert.match(workshop,/<dt>Free movement<\/dt><dd>7 tiles<\/dd>/);
 assert.match(workshop,/<dt>Armor<\/dt><dd>4<\/dd>/);
 assert.match(workshop,/\+4 AP this turn/);
 assert.equal(lance.run('learnedTraining(1).includes("rangefinder")'),true);
 lance.run('createBattle(0);persist()');
 const ready=simulate({storage:new Map(lance.storage)});
 assert.equal(ready.run('freeMovement(current())'),7,'trained move allowance resumes');
 assert.equal(ready.run('battle.units[2].max.body'),200);
 assert.equal(ready.run('battle.units[2].ap'),9);
 lance.run('skill();persist()');
 const used=simulate({storage:new Map(lance.storage)});
 assert.equal(used.run('current().ap'),12,'Redline AP accepted by checkpoint');
 assert.equal(used.run('current().skill'),true);
 assert.equal(used.run('freeMovement(current())'),0);
 assert.equal(used.run('learnedTraining(0).length'),5);
 assert.equal(used.run('pilotFrame(0)'),1,'trained pilot keeps new chassis');
 console.log('PASS: veteran points, exclusive capstones, chassis swaps, Workshop parity and exact trained AP/movement restore.');

 lance.run(`battle.cover.clear();const g=battle.units[1],target=battle.units[3];
  g.x=1;g.z=16;target.x=1;target.z=10;selected=1;action='fire';lockedTarget=target.id;renderBattle()`);
 assert.equal(lance.run("weaponRange(unitWeapon(g),g.training)"),6);
 assert.equal(lance.run("reactionWeapon(g,target).id"),'rifle');
 assert.match(lance.node('#ui').innerHTML,/IN WEAPON RANGE/);
 lance.run("target.z=9;renderBattle()");
 assert.equal(lance.run('reactionWeapon(g,target)'),null);
 assert.match(lance.node('#ui').innerHTML,/OUT OF RANGE/);
 assert.ok(Math.abs(lance.run("hitChance(g,target,'pilot')")-.93)<1e-10);
 assert.ok(lance.run("partDamage(g,target,'right',unitWeapon(g))>partDamage(g,target,'body',unitWeapon(g))"));
 assert.ok(lance.run("partDamage(g,target,'body',unitWeapon(g))>partDamage({...g,training:{}},target,'body',unitWeapon(g))"));
 lance.run('selected=2;const anchor=current();anchor.hp.body-=80;anchor.hp.right=0;anchor.hp.left=5;skill()');
 assert.equal(lance.run('anchor.hp.body'),185);
 assert.equal(lance.run('anchor.hp.right'),30);
 assert.equal(lance.run('anchor.hp.left'),5);
 lance.run('anchor.skill=false;anchor.hp.body=anchor.max.body;anchor.hp.legs=0;skill()');
 assert.equal(lance.run('anchor.hp.legs'),30,'Rebuild can repair a limb at full body HP');
 assert.ok(lance.run("(()=>{anchor.brace=true;return damage(target,anchor)<damage(target,{...anchor,training:{}})})()"));
 console.log('PASS: trained range and reactions, ranged/limb power and accuracy, brace, and actual body and limb repair.');

 const alternate=veteran();
 train(alternate,0,['close-quarters','breach-drill','follow-through']);
 train(alternate,1,['weak-points','cockpit-read','killshot']);
 train(alternate,2,['reserve-cell','reactive-brace','return-fire']);
 alternate.run(`save.units[0].melee='cleaver';createBattle(0);battle.cover.clear();
  const r=current(),foe=battle.units[3],a=battle.units[2];
  foe.x=r.x;foe.z=r.z-1;r.ap=1;const cleaver=weapon('cleaver')`);
 assert.equal(alternate.run('canUseWeapon(r,cleaver)'),true);
 assert.ok(alternate.run("hitChance(r,foe,'pilot',cleaver)>hitChance({...r,training:{}},foe,'pilot',cleaver)"));
 assert.ok(alternate.run('damage(r,foe,cleaver)>damage({...r,training:{}},foe,cleaver)'));
 await alternate.run("shoot(r,foe,'body',cleaver)");
 assert.equal(alternate.run('r.ap'),0,'Follow Through reduces real strike AP');
 alternate.run("selected=1;skill()");
 assert.ok(alternate.run("damage(current(),foe)>damage({...current(),training:{}},foe)"));
 alternate.run('a.weapon="rifle";foe.hp.body=foe.max.body;foe.x=a.x+1;foe.z=a.z;const before=a.ap;const counterDamage=partDamage(a,foe,"body",unitWeapon(a),true)');
 assert.ok(alternate.run("counterDamage>partDamage(a,foe,'body',unitWeapon(a))"));
 await alternate.run("engage(foe,a,'body',unitWeapon(foe))");
 assert.equal(alternate.run('a.ap'),alternate.run('before'),'trained reaction still costs no AP');
 assert.equal(alternate.run('foe.max.body-foe.hp.body'),alternate.run('Math.round(counterDamage*1.15)'));
 assert.equal(alternate.run('a.reacted'),true);
 alternate.run("foe.x=17;foe.z=1;battle.units=battle.units.slice(0,4);a.ap=2");
 await alternate.run('endTurn()');
 assert.equal(alternate.run('a.ap'),9,'Reserve Cell refreshes each round');
 assert.equal(alternate.run('a.reacted'),false);
 console.log('PASS: discounted strikes, Deadeye capstone, actual boosted counter and recurring AP.');

 const imported=JSON.parse(alternate.run(`JSON.stringify(loadCareer({
  ...fresh(),credits:9000,training:[['redline','pathfinder','pathfinder'],null,['return-fire','bulkhead']]
 }))`));
 assert.equal(imported.credits,9000);
 assert.deepEqual(imported.training,[['pathfinder'],[],['bulkhead']]);
 assert.equal(alternate.run('loadCareer(fresh()).training'),undefined);
 console.log('PASS: older careers load and malformed training preserves the valid career.');
})().catch(error=>{console.error(error);process.exitCode=1});
