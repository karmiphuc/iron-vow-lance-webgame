const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const game=simulate({seed:31,reducedMotion:true}),{run}=game;
assert.equal(run("RAVEN_FRAME===30&&portStock('iron').frames.includes(RAVEN_FRAME)"),true);
run('save.credits=400000');
assert.equal(run('assignChassis(0,RAVEN_FRAME,true)&&validSave(save)&&save.credits===0'),true);
assert.equal(run("save.units[0].weapon==='raven-gauntlet'&&save.units[0].melee==='raven-clamp'"),true);
run('persist()');
const restored=simulate({storage:game.storage});
assert.equal(restored.run('pilotFrame(0)===RAVEN_FRAME&&validSave(save)'),true);
run("createBattle(0);const t=battle.units.find(u=>u.frame===RAVEN_FRAME),a=battle.units.find(u=>u.team==='enemy'),w=weapon('rifle');Object.assign(t,{x:3,z:3,heading:FIELD_HEADINGS[0]});Object.assign(a,{x:4,z:3});");
for(const brace of [false,true]){
 run('t.brace='+brace);
 for(const part of ['left','right','body','legs']){
  const p=JSON.stringify(part),amount=run('damage(a,t,w,'+p+')');
  assert.equal(run('partDamage(a,t,'+p+',w)'),['right','left'].includes(part)?Math.round(amount*.75):amount);
 }
}
// Fixed-location COM volleys make every route observable with the game's actual planner.
run("const student={...t,frame:0,brace:false,shield:'bulwark-shield',mechSkills:[RAVEN_FRAME]},rail=weapon('rail');");
for(const [shield,factor] of [['bulwark-shield',.75],['citadel-shield',.65]]){
 run('student.shield='+JSON.stringify(shield));
 assert.equal(run("partDamage(a,student,'left',rail)"),Math.round(run("damage(a,student,rail,'left')")*factor));
}
assert.equal(run("student.shield=null;partDamage(a,student,'left',rail)===damage(a,student,rail,'left')&&!ravenGuardArm(a,student)"),true);
run("const probe={...w,comMelee:{parts:['body','legs','pilot','left','right']}};comRandom=()=>0;const ravenRoute=()=>planVolley(a,t,'body',probe,false).rounds.map(r=>r.part).join();");
assert.equal(run('ravenRoute()'),'left,right,pilot,left,right');
assert.equal(run("t.hp.left=0;ravenRoute()"),'right,right,pilot,left,right');
assert.equal(run("t.hp.right=0;ravenRoute()"),'body,legs,pilot,left,right');
run('t.hp.left=t.max.left;t.hp.right=t.max.right');
for(const [dx,dz,heading] of [[1,0,0],[0,-1,1],[-1,0,2],[0,1,3]]){
 run(`t.heading=FIELD_HEADINGS[${heading}];a.x=t.x+${dx};a.z=t.z+${dz}`);
 assert.equal(run('ravenRoute()'),'left,right,pilot,left,right');
 run(`a.x=t.x-(${dx});a.z=t.z-(${dz})`);
 assert.equal(run('ravenRoute()'),'body,legs,pilot,left,right');
 run(`a.x=t.x+${dz};a.z=t.z-(${dx})`);
 assert.equal(run('ravenRoute()'),'body,legs,pilot,left,right');
}
run("a.x=t.x;a.z=t.z+1;t.brace=false");
assert.equal(run('ravenRoute()'),'body,legs,pilot,left,right');
run('braceUnit(t);comRandom=()=>1');
assert.equal(run("planVolley(a,t,'body',probe,false).rounds.some(r=>r.hit||r.intercepted)"),false);
async function liveExchange(){
 run("comRandom=()=>0;Object.assign(a,{ap:16,attackAPSpent:0});battle.cover.clear();battle.field={};const beforeRaven={...t.hp},incoming={skipped:true};");
 await run("shoot(a,t,'body',w,false,incoming)");
 assert.ok(run("incoming.contacts.length===8&&incoming.contacts.every(c=>c.hit&&['left','right'].includes(c.part))"));
 assert.ok(run('t.hp.body===beforeRaven.body&&t.hp.legs===beforeRaven.legs&&t.hp.left<beforeRaven.left&&t.hp.right<beforeRaven.right'));
 run("Object.assign(t,{ap:16,attackAPSpent:0});const outgoing={skipped:true},clampStrike={skipped:true};");
 await run("shoot(t,a,'body',unitWeapon(t),false,outgoing)");
 assert.equal(run('outgoing.contacts.length'),8);
 await run("shoot(t,a,'body',meleeWeapon(t),false,clampStrike)");
 assert.equal(run('clampStrike.contacts.length'),1);
 console.log('Raven purchase, save, armor, four facings, brace interception, lost arms, misses, gauntlet and clamp passed.');
}
liveExchange().catch(error=>{console.error(error);process.exitCode=1});
