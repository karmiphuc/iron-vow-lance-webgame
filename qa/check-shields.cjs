const assertLegacySortie=require('./legacy-sortie-check.cjs');
const assert=require('node:assert/strict');
const fixture=require('./fixtures/shields-arm-lost.json');
const simulate=require('./sim-harness.cjs');

(async()=>{
 let roll=0;
 const {run,storage}=simulate({random:()=>roll,reducedMotion:true});
 run(`equipWeapon('cleaver');equipWeapon('bulwark-shield');equipWeapon('citadel-shield')`);
 assert.equal(run('save.credits'),150);
 assert.equal(run('save.units[0].meleeHand'), 'right');
 run(`equipWeapon('cleaver');equipWeapon('bulwark-shield');equipWeapon('citadel-shield')`);
 assert.equal(run('save.credits'),150,'re-equipping owned kits is free');
 run(`save.credits=FRAMES[BASTION_FRAME].cost+FRAMES[3].cost+FRAMES[4].cost+20000;assignChassis(0,BASTION_FRAME);equipWeapon('bulwark-shield');
  assignChassis(0,0);assignChassis(1,3);selected=1;equipWeapon('bulwark-shield');equipWeapon('vesper-shoulder')`);
 assert.equal(run('save.units[0].shield'),'citadel-shield');
 assert.equal(run('save.units[1].shield'),'bulwark-shield');
 assert.equal(run('save.units[1].shoulder'),'vesper-shoulder');
 assert.equal(run('save.reserve[BASTION_FRAME].shield'),'bulwark-shield');
 run(`assignChassis(1,4);equipWeapon('bulwark-shield')`);
 assert.equal(run('save.units[1].melee'),undefined);
 assert.equal(run('save.units[1].shield'),'bulwark-shield');
 assert.equal(run('shoulderWeapon({...save.units[1],frame:4}).id'),'locust','the integral launcher remains');
 assert.ok(run('validSave(save)'));
 for(const bad of [
  `s.units[0].shield='rifle'`,
  `delete s.units[0].meleeHand`,
  `s.owned=s.owned.filter(id=>id!=='citadel-shield')`,
  `s.owned=s.owned.filter(id=>id!=='bulwark-shield')`
 ])assert.equal(run(`(()=>{const s=JSON.parse(JSON.stringify(save));${bad};return validSave(s)})()`),false,bad);

 run(`selected=0;createBattle(0,false,false,[0]);const target=current(),foe=battle.units[1];
  const shootAt=(part,id='rifle',reaction=false)=>{foe.ap=BASE_AP;foe.attackAPSpent=0;return shoot(foe,target,part,weapon(id),reaction)};
  const hp=()=>JSON.stringify(target.hp);target.ap=0;
  delete target.melee;delete target.meleeHand;const original={...target.hp}`);
 const left=run('target.hp.left'),initial=run('hp()');
 roll=.999;
 await run(`shootAt('pilot')`);
 assert.equal(run('hp()'),initial,'a miss causes no arm wear');
 roll=0;
 assert.equal(run(`(()=>{target.shield='bulwark-shield';const blocked=partDamage(foe,target,'pilot',weapon('rifle'));target.shield='citadel-shield';return blocked})()`),25);
 assert.equal(run(`partDamage(foe,target,'pilot',weapon('rifle'))`),20);
 await run(`shootAt('pilot')`);
 assert.equal(run('target.hp.left'),left-23);
 assert.equal(run('target.hitPart'),'left');
 assert.equal(run('target.ap'),0,'passive block works at zero AP');
 await run(`shootAt('right','missile')`);
 await run(`shootAt('legs','cleaver',true)`);
 assert.ok(run(`['body','pilot','right','legs'].every(p=>target.hp[p]===original[p])`),'missiles and reaction melee cannot bypass the shield');
 assert.ok(run(`effects.filter(e=>e.type==='shot'&&e.kind!=='rifle').every(e=>e.part==='left')`));
 assert.equal(run(`reactionWeapon(target,foe)?.id`),undefined,'the target is outside counter range');
 run(`foe.x=target.x+1;foe.z=target.z;target.weapon='missile'`);
 assert.equal(run(`reactionWeapon(target,foe)`),null,'shield hand cannot punch');
 run(`target.weapon='rifle';target.ap=6;target.hp.left=1;target.brace=true`);
 assert.equal(run(`reactionWeapon(target,foe).id`),'rifle');
 assert.equal(run(`partDamage(foe,target,'pilot',weapon('rail'))`),21,'brace compounds with shield reduction');
 await run(`shootAt('pilot','rail')`);
 assert.equal(run('target.hp.left'),0);
 assert.equal(run('target.hp.pilot'),run('original.pilot'),'no spillover on a breaking hit');
 assert.match(run('battle.log.at(-1)'),/shield arm lost/);
 assert.equal(run('target.alive'),true);
 assert.equal(run(`reactionWeapon(target,foe).id`),'rifle','loss of left arm leaves the primary gun');
 // With the shield arm gone nothing diverts the volley. Script eight body rounds (to-hit 0, location .1) then the one cockpit check (.999 = cockpit).
 run('Math.random=(()=>{let i=0;return()=>{const n=i++;return n===16?.999:n<16?(n%2?.1:0):0}})()');
 await run(`shootAt('body','rifle')`);
 run('Math.random=()=>0');
 assert.ok(run('target.hp.pilot<original.pilot'),'once the shield arm is gone the next hit rolls its own part');
 assert.ok(run("effects.some(e=>e.type==='boom'&&e.part==='pilot')"),'one body round became a cockpit hit');
 run(`recoverLimbs(target,{});target.brace=false`);
 assert.equal(run('target.hp.left'),30);
 const pilot=run('target.hp.pilot');
 await run(`shootAt('pilot')`);
 assert.equal(run('target.hp.pilot'),pilot,'field repair restores the same shield');
 run('persist()');
 assert.equal(simulate({storage:new Map(storage)}).run('current().shield'),'citadel-shield');

 const resumed=simulate({storage:new Map([['iron-vow-career',JSON.stringify(fixture)]])});
 assert.equal(resumed.run('current().shield'),'citadel-shield');
 assert.equal(resumed.run('current().hp.left'),0);
 assert.equal(resumed.run('activeShield(current())'),undefined);
 resumed.run(`const raider=battle.units.find(u=>u.team==='enemy'),broken=planVolley(raider,current(),'body',weapon('rifle'),false)`);
 assert.equal(resumed.run('broken.guard'),false,'a lost shield arm no longer takes hits');
 assert.ok(resumed.run("broken.landed>0&&broken.impacts.every(i=>i.part!=='left')"));
 assertLegacySortie(assert,JSON.parse(resumed.run('JSON.stringify(captureSortie())')),fixture.sortie);
 console.log('PASS shield ownership, mount compatibility, armor and Brace stacking, misses, gun, missile and melee interception, break without overflow, counters, repair and save resume');
})().catch(error=>{console.error(error);process.exitCode=1});
