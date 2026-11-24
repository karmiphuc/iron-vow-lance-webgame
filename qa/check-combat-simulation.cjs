const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dist/combat-simulation.js'),'utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(source,context);
const create=context.window.IRON_VOW_SIM.createVolleyPlanner;
function planner(rolls,{shield=false,chance=.8,dodge=0,budget=30}={}){
 let calls=0;
 const plan=create({hitChance:()=>chance,dodgeChance:()=>dodge,activeShield:()=>shield,
  targetParts:()=>['body','pilot','right'],attackBudget:()=>budget,
  ruleRandom:()=>{assert.ok(calls<rolls.length,'unexpected random draw');return rolls[calls++]}});
 return {plan,calls:()=>calls};
}
const target={hp:{body:10,pilot:10,right:10}};
// Draw order: one to-hit roll per round and a location roll for each landed round (body below .815 here, right above),
// then one cockpit check per attack that struck the body (>=0.97 turns one body round into a cockpit round).
let p=planner([.1,.1,.7,.999,.95,.999]);
let result=p.plan({},target,'body',{burst:3},false);
assert.equal(p.calls(),6);assert.equal(result.landed,2);assert.equal(result.impacts.reduce((n,x)=>n+x.amount,0),20);
assert.deepEqual(Array.from(result.rounds,x=>x.part),['pilot','right','body']);
// No cockpit check when nothing struck the body.
p=planner([.1,.999,.95]);result=p.plan({},target,'body',{burst:2},false);
assert.equal(p.calls(),3,'no cockpit check without a body hit');assert.deepEqual(Array.from(result.rounds,x=>x.part),['right','body']);
// A scatter shell rolls to hit once, then every pellet rolls its own location; one cockpit check for the shell.
p=planner([.2,0,.9,.1,.5]);result=p.plan({},target,'body',{scatter:true,burst:3},false);
assert.equal(p.calls(),5);assert.equal(result.landed,3);assert.deepEqual(Array.from(result.rounds,x=>x.part),['body','right','body']);
assert.deepEqual(Array.from(result.impacts,x=>[x.part,x.amount]),[['body',20],['right',10]]);
p=planner([.95],{dodge:.1});result=p.plan({},target,'body',{},false);
assert.equal(result.dodged,true);assert.equal(result.impacts.length,0);
p=planner([.1],{shield:true});result=p.plan({},target,'body',{},false);
assert.equal(p.calls(),1,'a shield takes the hit without location draws');
assert.equal(result.guard,true);assert.equal(result.impacts[0].part,'left');
// A 119% solution caps hit probability at 99%, with a 20% crit roll on landed rounds.
const odds=context.window.IRON_VOW_SIM.hitOdds;
assert.equal(odds(1.19).hit,.99);
assert.ok(Math.abs(odds(1.19).crit-.20)<1e-10);
assert.equal(odds(3).crit,1);
assert.equal(odds(.99).crit,0);
p=planner([.9],{chance:1.19,shield:true});
result=p.plan({},target,'body',{},false);
assert.equal(result.rounds[0].critical,true);
assert.equal(result.impacts[0].amount,45);
p=planner([.9,.1,.995],{chance:1.19,shield:true});
result=p.plan({},target,'body',{burst:3},false);
assert.deepEqual(Array.from(result.rounds,r=>[r.hit,!!r.critical]),[[true,true],[true,false],[false,false]]);
assert.equal(result.impacts[0].amount,30,'only the critical round doubles damage');
p=planner([.10,.81,.79,.79],{chance:1.19,shield:true});
result=p.plan({},target,'body',{burst:3,scatter:true},false);
assert.equal(result.impacts[0].amount,40,'pellets share shell accuracy and roll crits individually');
p=planner([.95],{chance:1.19,dodge:.10});
assert.equal(p.plan({},target,'body',{},false).dodged,true,'overflow cannot override a dodge');
const host=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const simulationScript=host.search(/src="combat-simulation\.js[?"]/);
const gameScript=host.search(/src="game\.js[?"]/);
assert.ok(simulationScript>=0&&gameScript>simulationScript);
const bench=fs.readFileSync(path.join(root,'dist/rig-bench/index.html'),'utf8');
assert.match(bench,/bench\.searchParams\.set\('bench','rig'\)/,'Rig Bench opens the same engine host');
// Golden result for seed 42: includes a braced target, reaction bonus, aircraft target and the production
// volley path. The volley was re-recorded when hit location moved to a roll per landed round and the cockpit check to one per body-hitting attack (the first
// four values are unchanged from the pre-extraction game).
const sim=require('./sim-harness.cjs')({seed:42});
sim.run(`createBattle(0);var a=current(),t=battle.units[3],v=battle.units.find(u=>u.kind==='helicopter');
 a.x=5;a.z=5;t.x=6;t.z=5;v.x=7;v.z=5;a.weapon='rifle';
 a.training={rangedHit:.1,rangedPower:.2,reactionPower:.15};t.brace=true;`);
const actual=JSON.parse(sim.run(`JSON.stringify([hitChance(a,t,'body'),damage(a,t),
 partDamage(a,t,'pilot',weapon('rifle')),attackBudget(a,t,'body',weapon('rifle'),true),
 hitChance(a,v,'body',weapon('rifle'),true),planVolley(a,t,'body',weapon('rifle'),false)])`));
assert.deepEqual(actual,[.9568000000000001,20,10,25,1.02,{
 rounds:[['body',true],['body',true],['body',true],['body',true],['legs',true],['body',true],['legs',true],['body',true]].map(([part,hit])=>({part,hit})),
 impacts:[{part:'body',amount:17},{part:'legs',amount:6}],landed:8,dodged:false,guard:false
}]);
sim.run("a.level=1;a.training={rangedHit:.30};a.x=5;v.x=7;battle.cover.clear()");
assert.match(sim.run("attackPreview(a,v,weapon('rifle'))"),/99%\/ROUND · 23% CRIT\/ROUND/);
for(const id of ['rifle','shotgun','rail','morrow','blade']){
 const loss=sim.run(`hitChance(a,{...v,x:a.x+1},'body',weapon('${id}'))-hitChance(a,{...v,x:a.x+2},'body',weapon('${id}'))`);
 assert.ok(Math.abs(loss-(['rifle','shotgun'].includes(id)?.02:0))<1e-9,id+' per-tile range adjustment');
}
const damageSplit=sim.run("shotContacts(weapon('morrow'),attackProfile(a,'morrow'),[{part:'body',hit:true,critical:true},{part:'body',hit:true}],[{part:'body',amount:60}]).map(round=>round.amount).join(',')");
assert.equal(damageSplit,'40,20','the cinematic applies extra damage at the critical round’s own impact');
// Exercise reaction selection through the reusable API, including blocked shots,
// broken arms, shields, ranged counters and the two specialized frames.
const rifle={id:'rifle'},blade={id:'blade',melee:true},hand={id:'hand',melee:true};
const reactions=context.window.IRON_VOW_SIM.createReactionRules({
 isArmed:u=>u.hp.left>0||u.hp.right>0,equippedShield:u=>u.shield,
 counterRange:(w,training,brace)=>training?.reach??0,unitWeapon:()=>rifle,
 distance:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z),
 scoutWeapon:()=>blade,attackObstruction:(a,t,w)=>a.blocked?'RIDGE BLOCK':'',
 meleeWeapon:()=>blade,BULWARK_FRAME:4,ASHIGARU_FRAME:5,FREE_HAND_COUNTER:hand
});
const unit=(extra={})=>({alive:true,x:0,z:0,hp:{left:10,right:10},training:{reach:3},...extra});
const attacker=unit({x:1});
assert.equal(reactions.reactionStatus(unit({blackout:true})),'JAMMED');
assert.equal(reactions.reactionStatus(unit({reacted:true})),'USED');
assert.equal(reactions.reactionStatus(unit({kind:'helicopter'})),'UNAVAILABLE');
assert.equal(reactions.reactionWeapon(unit({melee:true}),attacker),blade);
assert.equal(reactions.reactionWeapon(unit({shield:true}),attacker),rifle);
assert.equal(reactions.reactionWeapon(unit({hp:{left:10,right:0}}),attacker),hand);
assert.equal(reactions.reactionWeapon(unit({blocked:true}),attacker),null);
assert.equal(reactions.reactionWeapon(unit({frame:4}),attacker),blade);
assert.equal(reactions.reactionWeapon(unit({frame:4,hp:{left:0,right:10}}),attacker),rifle);
assert.equal(reactions.reactionWeapon(unit({frame:5}),unit({x:2})),blade);
assert.equal(reactions.reactionWeapon(unit({frame:5}),unit({x:3})),null);
assert.equal(reactions.reactionWeapon(unit(),unit({alive:false})),null);
// The production game calls the same extracted API for reaction eligibility.
assert.deepEqual(JSON.parse(sim.run(`JSON.stringify([reactionStatus(a),reactionStatus({...a,reacted:true}),
 reactionStatus({...a,blackout:{}}),reactionWeapon({...a,alive:false},t)])`)),
 ['READY','USED','JAMMED',null]);
// Motion capture temporarily wraps the planner to force deterministic hits.
assert.equal(sim.run(`(()=>{const original=planVolley;let called=false;
 try{planVolley=(...args)=>{called=true;return original(...args)};
 planVolley(a,t,'body',weapon('rifle'),false);return called}
 finally{planVolley=original}})()`),true);
console.log('PASS shared combat rules: baseline parity, burst, scatter, dodge, shields, reactions and both entry points');
