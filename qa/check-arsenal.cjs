const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true}),{run}=sim;
 const control=(dataset={})=>({dataset,setAttribute(){},focus(){},onclick:null,oninput:null,onchange:null,value:''});
 const paintPreset=control({livery:12}),custom=control({customChannel:'p'}),equip=control(),removeMelee=control();
 const controls=new Map([['#custom-paint',custom],['#remove-melee',removeMelee]]);
 sim.sandbox.document.querySelector=selector=>controls.get(selector)||sim.node(selector);
 const lists={'[data-livery]':[paintPreset],'[data-custom-channel]':[custom],'[data-equip]':[equip]};
 sim.sandbox.document.querySelectorAll=selector=>lists[selector]??[];

 const renderWorkshop=()=>run("page='workshop';workshopView='assigned';render()");
 const html=()=>sim.node('#ui').innerHTML;
 const equipItem=id=>{
  const group=run(`armoryClass(weapon('${id}'))`);
  run(`armoryGroup='${group}';render()`);
  assert.ok(html().includes(`data-weapon-card="${id}"`),id+' is listed in its armory class');
  equip.dataset.equip=id;
  assert.equal(typeof equip.onclick,'function',id+' has the bound purchase action');
  equip.onclick();
 };

 renderWorkshop();
 const listed=new Set();
 for(const [group,count] of Object.entries({assault:8,strike:8,melee:8})){
  run(`armoryGroup='${group}';render()`);
  const cards=[...html().matchAll(/data-weapon-card="([^"]+)"/g)].map(([,id])=>id);
  assert.equal(cards.length,count);
  for(const id of cards){
   assert.equal(run(`armoryClass(weapon('${id}'))`),group,id);
   listed.add(id);
  }
 }
 assert.equal(listed.size,24);

 run("armoryGroup='assault';render()");
 assert.equal(typeof paintPreset.onclick,'function','Preset paint has a bound action');
 paintPreset.onclick();
 assert.equal(run('save.units[0].paint'),'#577eac');
 const painted=JSON.parse(sim.storage.get('iron-vow-career')).units[0];
 assert.equal(painted.paint,'#577eac');
 assert.deepEqual(painted.trim,{s:'#303a4b',a:'#d09450'});
 equipItem('hailstorm');equipItem('cleaver');
 assert.equal(run("save.units[0].weapon+' '+save.units[0].melee"),'hailstorm cleaver');

 run('selected=1;render()');
 assert.equal(run('save.units[1].paint'),undefined);
 custom.value='#335544';custom.oninput();custom.onchange();
 assert.equal(run('save.units[1].paint'),'#335544');
 assert.equal(JSON.parse(sim.storage.get('iron-vow-career')).units[1].paint,'#335544');

 run('selected=2;save.credits=20000;render()');
 equipItem('breaker');equipItem('piledriver');equipItem('rampart');
 assert.equal(typeof removeMelee.onclick,'function','Equipped melee has a bound unequip action');
 removeMelee.onclick();assert.equal(run('save.units[2].melee'),undefined);

 run("createBattle(0,false,true);selected=0;action='move';renderBattle();Math.random=()=>0");
 assert.ok(run("battle.units.filter(u=>u.team==='enemy'&&!u.kind).every(u=>HOSTILE_LIVERIES.some(([p,s])=>u.paint===p&&u.trim.s===s))"));
 run("action='strike';persist()");
 assert.equal(run("JSON.parse(localStorage.getItem('iron-vow-career')).sortie.action"),'strike');
 for(const id of ['breaker','cleaver','piledriver','hailstorm','rampart']){
  assert.ok(await run(`(async()=>{
   const u=current(),target=battle.units[3],w=weapon('${id}');u.ap=8;
   const effectStart=effects.length,total=()=>Object.values(target.hp).reduce((sum,hp)=>sum+hp,0),before=total();
   await shoot(u,target,'body',w);
   return u.ap===8-w.ap&&total()<before&&
    effects.slice(effectStart).some(effect=>effect.type==='shot'&&effect.kind===w.id);
  })()`),id);
 }
 // The live rig uses these shared phase boundaries for the prime and return.
 for(const frame of [0,1,2]){
  run(`selected=${frame};current().attack={kind:'rifle',start:0,primeDuration:.60}`);
  assert.equal(run("animationPose(current(),.3).primePhase"),'step');
  assert.equal(run("animationPose(current(),.3).primeProgress"),.5);
  run("current().attack.fireAt=.9;current().attack.releaseAt=1.1");
  assert.equal(run("animationPose(current(),1.25).primePhase"),'planted');
  assert.equal(run("animationPose(current(),1.6).primePhase"),'return');
  run("current().attack=null");
 }
 for(const [index,name] of ['relay','corridor','frontier'].entries()){
  run(`effects=[];createBattle(${index+1});fieldCamera.overview=true;action='move'`);
  assert.equal(run('battle.field.ground'),name);
  assert.equal(run('new Set(Object.values(battle.field.cover)).size'),2);
  assert.ok(run(`Array.from(battle.cover).every(key=>{
   const [x,z]=key.split(',').map(Number);
   return !paths(current()).has(key)&&inCover({x:x-1,z});
  })`));
 }
 console.log('PASS: live attack phase timing, 24 classified weapon options, independent saved paint and loadouts, purchases and melee unequip, strike save, attack AP/damage, and three theater rules with cover and pathing.');
})().catch(error=>{console.error(error);process.exitCode=1});
