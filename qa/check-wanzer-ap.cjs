const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const fixture=require('./fixtures/wanzer-ap-sortie.json');

(async()=>{
 const storage=new Map([['iron-vow-career',JSON.stringify(fixture)]]);
 let roll=.9;
 const {run}=simulate({storage,reducedMotion:true,random:()=>roll});
 const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 assert.deepEqual(json('captureSortie()'),fixture.sortie,'current AP allocations, primed skill and limb bonus resume exactly');
 assert.deepEqual(json('[current().ap,current().apBase,apCapacity(current())]'),[5,20,17]);
 assert.deepEqual(json('[1,2,3,4,100].map(level=>permanentAP(level))'),[14,15,15,16,30]);
 assert.deepEqual(json("['cleaver','blade','shotgun','forge','rifle','watchman','sidewinder','salt-mg','missile','cerberus'].map(id=>weapon(id).ap)"),
  [1,2,2,3,3,4,3,5,4,5]);
 assert.equal(run("validHull({...save.units[0],apAllocation:{type:'flame',body:4,arms:0,legs:0}},0,save.owned)"),false);
 run(`battle.cover.clear();battle.field={};const a=current(),t=battle.units.find(u=>u.team==='enemy');
  Object.assign(t,{x:a.x+1,z:a.z,ap:2,noCounter:true});a.ap=0;
  const originalBaseAP=a.apBase,rifle=weapon('rifle');`);
 assert.deepEqual(json("['ap30','ap60','ap0'].map(apSkill=>actionAP({apSkill},5))"),[3,2,0]);
 assert.equal(run('counterCost(a,t,rifle)'),0);
 assert.equal(run('canUseWeapon(a,rifle)&&!spent(a)'),true);
 assert.equal(run('movementPlans(a).get(a.x+","+(a.z+1)).ap'),0);
 await run('moveUnit(a,a.x,a.z+1)');
 assert.deepEqual(json('[a.ap,a.apSkill??null,canUseWeapon(a,rifle),canPrimeAP(a,"ap0")]'),[0,null,false,false]);
 run('a.ap=2;completeRound()');
 assert.deepEqual(json('[a.ap,t.ap]'),[14,14],'both sides recover 12 after the full round');
 run('a.ap=10;completeRound()');
 assert.equal(run('a.ap'),17);
 assert.equal(run('counterCost(a,t,rifle)'),4);
 assert.equal(run('counterCost(a,{...t,x:t.x+6},rifle)'),4);
 run('a.apSkill="ap60";a.ap=1;spendAttack(a,t,rifle,"body",true)');
 assert.deepEqual(json('[a.ap,a.apSkill??null,a.attackAPSpent]'),[0,null,0]);
 run('a.ap=14;a.apSkill="ap30";spendAttack(a,t,rifle,"body",false)');
 assert.deepEqual(json('[a.ap,a.apSkill??null,a.attackAPSpent]'),[12,null,2]);

 assert.ok(run('damage(t,a,rifle)<damage(t,{...a,apAllocation:undefined},rifle)'));
 assert.ok(run('damage(t,a,weapon("missile"))===damage(t,{...a,apAllocation:undefined},weapon("missile"))'));
 assert.ok(run('hitChance(a,t,"body",rifle)>hitChance({...a,apAllocation:undefined},t,"body",rifle)'));
 assert.equal(run('Math.round((dodgeChance(a)-dodgeChance({...a,apAllocation:undefined}))*100)'),2);
 assert.equal(run('dodgeChance({...a,hp:{...a.hp,legs:0}})'),run('dodgeChance({...a,apAllocation:undefined})'));
 assert.equal(run('statusResistance(a)'),.2);
 assert.equal(run('resistsStatus(a)'),false);
 roll=.1;
 assert.equal(run('resistsStatus(a)'),true);
 assert.deepEqual(json("allocateAIAP(20,4,[rifle,rifle,weapon('missile')])"),{type:'penetration',body:2,arms:0,legs:0});
 assert.equal(run('allocateAIAP(18,4,[rifle,rifle])'),undefined);
 assert.equal(run('allocateAIAP(17,4,[rifle,rifle],true).body'),1);

 run(`t.x=a.x+1;t.z=a.z;t.hp.left=1;a.ap=9;a.attackAPSpent=0;
  planVolley=()=>({rounds:[{part:'left',hit:true}],impacts:[{part:'left',amount:15}],landed:1,dodged:false,guard:false});`);
 await run('shoot(a,t,"body",weapon("cleaver"))');
 assert.deepEqual(json('[a.ap,a.apBase,a.limbAP,apCapacity(a),t.hp.left]'),[8,20,2,18,0]);
 run('t.hp.left=1;');
 await run('shoot(a,t,"body",weapon("cleaver"))');
 assert.equal(run('a.limbAP'),2,'a repaired limb cannot award capacity twice');
 run('createBattle(0)');
 assert.deepEqual(json('[current().ap,current().apBase,apCapacity(current()),current().limbAP??0]'),[14,20,16,0]);
 console.log('PASS Wanzer AP growth, allocation, Def-C, action and counter discounts, both phases, limb credits, AI reserve and checkpoint');
})().catch(error=>{console.error(error);process.exitCode=1;});
