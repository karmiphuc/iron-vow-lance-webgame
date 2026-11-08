const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

function doctrine(i,path){
 const sim=simulate({random:()=>0,reducedMotion:true});
 assert.equal(sim.run(`save.units[${i}].level=10;
  PILOT_TREES[${i}][${path}].nodes.every(node=>learnTraining(${i},node.id))`),true);
 sim.run(`createBattle(0);battle.cover.clear();selected=${i};const pilot=current(),hostile=battle.units[3]`);
 return sim;
}

(async()=>{
 const veteran=simulate({random:()=>0,reducedMotion:true}),v=veteran.run;
 v(`const old=fresh();old.units[0].level=10;
  old.training=[['pathfinder','point-plate','redline','close-quarters','breach-drill'],[],[]];
  save=loadCareer(old)`);
 assert.equal(v('trainingPoints(0)'),3);
 assert.equal(v("learnTraining(0,'close-guard')"),false);
 assert.equal(v("learnTraining(0,'spearhead')"),false);
 assert.equal(v("learnTraining(0,'marching-orders')"),true);
 assert.equal(v("learnTraining(0,'brace-drill')"),true);
 assert.equal(v("learnTraining(0,'spearhead')"),true);
 assert.equal(v('trainingPoints(0)'),0);
 assert.equal(v('learnedTraining(0).length'),8);
 assert.equal(v("(pilotWiki().match(/<li>/g)||[]).length"),96);
 assert.equal(v("pilotWiki().includes('Shield Net')"),true);
 assert.deepEqual(Array.from(v('[4,5,6,7,8,9,10].map(nextLevelXP)')),[400,400,425,450,475,500,1000]);
 v("save.units[1].level=5;save.units[1].xp=330;createBattle(0);finish(true)");
 assert.equal(v('save.units[1].level'),6);
 assert.equal(v('trainingPoints(1)'),6);
 assert.match(veteran.node('#modal').innerHTML,/GHOST LV 6/);
 console.log('PASS: v29 perk migration, advanced gates, readable wiki and faster real promotion into level 6.');

 const vanguard=doctrine(0,0),r=vanguard.run;
 r('skill();persist()');
 assert.equal(r('pilot.ap'),12);
 assert.equal(r('pilot.brace'),true);
 assert.equal(r('freeMovement(pilot)'),6);
 assert.equal(r('braceCost(pilot.training)'),1);
 const restored=simulate({storage:new Map(vanguard.storage)});
 assert.equal(restored.run('current().ap'),12);
 assert.equal(restored.run('current().brace'),true);
 assert.equal(restored.run('freeMovement(current())'),6);
 assert.equal(restored.run('current().skill'),true);

 const breacher=doctrine(0,1),b=breacher.run;
 b("pilot.melee='cleaver';pilot.ap=1;hostile.hp.body=1");
 assert.ok(b("damage(pilot,hostile,weapon('cleaver'))>damage({...pilot,training:{...pilot.training,meleePierce:0}},hostile,weapon('cleaver'))"));
 assert.equal(b("damage(pilot,hostile,weapon('piledriver'))"),b("damage({...pilot,training:{...pilot.training,meleePierce:0}},hostile,weapon('piledriver'))"));
 await b("shoot(pilot,hostile,'body',weapon('cleaver'))");
 assert.equal(b('pilot.brace'),true);
 assert.equal(b('pilot.ap'),1,'a lethal strike refunds the discounted AP');
 assert.equal(b('hostile.alive'),false);
 console.log('PASS: Vanguard retains movement and Braces on Overdrive; Breacher pierces, Braces and earns lethal refunds.');

 const marksman=doctrine(1,0),m=marksman.run;
 m("pilot.x=1;pilot.z=16;hostile.x=1;hostile.z=9;battle.cover.add('2,9')");
 assert.equal(m('weaponRange(unitWeapon(pilot),pilot.training)'),6);
 assert.equal(m("reactionWeapon(pilot,hostile).id"),'rifle');
 m('hostile.z=8');
 assert.equal(m('reactionWeapon(pilot,hostile)'),null);
 m("hostile.z=9;const unbraced=hitChance(pilot,hostile,'pilot');braceUnit(pilot)");
 assert.ok(m("hitChance(pilot,hostile,'pilot')>unbraced"));
 m('hostile.z=10;hostile.hp.body=1;skill()');
 await m("shoot(pilot,hostile,'body',unitWeapon(pilot))");
 assert.equal(m('pilot.ap'),8);
 assert.equal(m('pilot.boost'),false);

 const saboteur=doctrine(1,1),s=saboteur.run;
 s("hostile.x=pilot.x+1;hostile.z=pilot.z;hostile.melee='blade';hostile.hp.right=1;hostile.hp.legs=1;skill()");
 assert.ok(s("partDamage(pilot,hostile,'legs',unitWeapon(pilot))>partDamage({...pilot,training:{...pilot.training,limbPierce:0}},hostile,'legs',unitWeapon(pilot))"));
 await s("engage(pilot,hostile,'right',unitWeapon(pilot))");
 assert.equal(s('hostile.hp.right'),0);
 assert.equal(s('Boolean(hostile.reacted)'),false);
 assert.equal(s('pilot.boost'),true);
 assert.match(s('battle.log.at(-1)'),/counter jammed/);
 await s("engage(pilot,hostile,'legs',unitWeapon(pilot))");
 assert.equal(s('hostile.reacted'),true,'jam does not consume or disable a later counter');
 assert.equal(s('pilot.boost'),true,'a destroyed limb retains Deadeye');
 console.log('PASS: Marksman cover, counter reach and refunds; Saboteur limb penetration, jam and Deadeye chaining.');

 const engineer=doctrine(2,0),e=engineer.run;
 e('pilot.hp.body=1;pilot.hp.right=0;pilot.hp.left=0;pilot.hp.legs-=30');
 await e("shoot(hostile,pilot,'body',unitWeapon(hostile))");
 assert.deepEqual(Array.from(e('[pilot.alive,pilot.skill,pilot.brace,pilot.hp.body,pilot.hp.right,pilot.hp.left,pilot.hp.legs]')),[true,true,true,65,30,30,90]);
 e('pilot.hp.body=1');
 await e("shoot(hostile,pilot,'body',unitWeapon(hostile))");
 assert.equal(e('pilot.alive'),false,'Failsafe can only consume the unused repair once');

 const sentinel=doctrine(2,1),g=sentinel.run;
 g("pilot.x=5;pilot.z=10;hostile.x=5;hostile.z=2;const ally=battle.units[0];ally.x=6;ally.z=10;const before=damage(hostile,ally)");
 assert.equal(g('reactionWeapon(pilot,hostile)'),null);
 g('braceUnit(pilot)');
 assert.equal(g("reactionWeapon(pilot,hostile).id"),'missile');
 assert.equal(g('shieldProtection(ally)'),.2);
 assert.equal(g('damage(hostile,ally)'),Math.round(g('before')*.8));
 g('ally.x++;pilot.brace=false;hostile.z=9');
 assert.equal(g('shieldProtection(ally)'),0);
 await g("engage(hostile,pilot,'body',unitWeapon(hostile))");
 assert.equal(g('pilot.brace'),true,'Counterguard Braces after a real counter');
 assert.equal(g('pilot.ap'),9);
 console.log('PASS: Engineer repairs all limbs and has one Failsafe; Sentinel extends counters and shields adjacent allies.');
})().catch(error=>{console.error(error);process.exitCode=1});
