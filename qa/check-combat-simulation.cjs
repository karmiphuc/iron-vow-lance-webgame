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
  ruleRandom:()=>{assert.ok(calls<rolls.length,'unexpected random draw');return rolls[calls++]},BURST_AIM_SHARE:.85});
 return {plan,calls:()=>calls};
}
const target={hp:{body:10,pilot:10,right:10}};
let p=planner([.1,.7,.95]);
let result=p.plan({},target,'body',{burst:3},false);
assert.equal(p.calls(),3);assert.equal(result.landed,2);assert.equal(result.impacts.reduce((n,x)=>n+x.amount,0),20);
assert.deepEqual(Array.from(result.rounds,x=>x.part),['body','pilot','body']);
p=planner([.2]);result=p.plan({},target,'body',{scatter:true,burst:3},false);
assert.equal(p.calls(),1);assert.equal(result.landed,3);assert.deepEqual(Array.from(result.impacts,x=>x.amount),[12,6,12]);
p=planner([.95],{dodge:.1});result=p.plan({},target,'body',{},false);
assert.equal(result.dodged,true);assert.equal(result.impacts.length,0);
p=planner([.1],{shield:true});result=p.plan({},target,'body',{},false);
assert.equal(result.guard,true);assert.equal(result.impacts[0].part,'left');
for(const [file,script] of [['dist/index.html','combat-simulation.js'],['dist/rig-bench/index.html','../combat-simulation.js']])
 assert.ok(fs.readFileSync(path.join(root,file),'utf8').includes('src="'+script+'"'),file+' must load shared simulation');
// Golden result captured from the pre-extraction game with seed 42: includes a
// braced target, reaction bonus, aircraft target and the production volley path.
const sim=require('./sim-harness.cjs')({seed:42});
sim.run(`createBattle(0);var a=current(),t=battle.units[3],v=battle.units.find(u=>u.kind==='helicopter');
 a.x=5;a.z=5;t.x=6;t.z=5;v.x=7;v.z=5;a.weapon='rifle';
 a.training={rangedHit:.1,rangedPower:.2,reactionPower:.15};t.brace=true;`);
const actual=JSON.parse(sim.run(`JSON.stringify([hitChance(a,t,'body'),damage(a,t),
 partDamage(a,t,'pilot',weapon('rifle')),attackBudget(a,t,'body',weapon('rifle'),true),
 hitChance(a,v,'body',weapon('rifle'),true),planVolley(a,t,'body',weapon('rifle'),false)])`));
assert.deepEqual(actual,[.9016000000000001,20,10,25,.98,{
 rounds:Array.from({length:8},()=>({part:'body',hit:true})),
 impacts:[{part:'body',amount:23}],landed:8,dodged:false,guard:false
}]);
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
