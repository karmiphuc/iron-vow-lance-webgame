const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

const {run}=create({foundry:true});
run('createBattle(0,false,false,[0]);globalThis.subject=battle.units[1]');
const roster=JSON.parse(run(`JSON.stringify(FRAMES.map((frame,i)=>{
 const u={...subject,frame:i,hp:{...subject.hp},max:{...subject.max}};
 const pace=destructionPace(u);
 const atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(i)];
 function check(reason){
  u.alive=true;u.deathStyle=null;effects=[];
  beginDestruction(u,reason);
  const samples=[0,.27,.56,.95,1.92].map(age=>{
   const now=clock+age*pace,pose=animationPose(u,now),render=foundryRender(u,now);
   return {point:render?.anchors.body,stage:render?.index,collapse:!!render?.collapse,clip:!!render?.destruction,
    kneel:pose.kneel,blast:pose.explosion,tip:destructionRoot(u,pose).angle};
  });
  updateDestruction(u,clock+1.02*pace);
  const early=effects.filter(e=>e.type==='detonation'&&e.big).length;
  updateDestruction(u,clock+1.09*pace);
  updateDestruction(u,clock+1.15*pace);
  const blasts=effects.filter(e=>e.type==='detonation'&&e.big).length;
  const contact=Boolean(u.deathEvents&16);
  delete u.deathTime;
  const restored=foundryRender(u,clock);
  return {samples,early,blasts,contact,settled:restored?.anchors.body};
 }
 return {name:frame.name,pace,foundry:frame.foundry!=null,authored:!!atlas?.destruction,body:check('body'),pilot:check('pilot')};
}))`));
for(const entry of roster){
 const {name,body,pilot}=entry;
 assert.equal(body.early,0,name+' reactor waits for the collapse');
 assert.equal(body.blasts,1,name+' detonates once');
 assert.equal(pilot.blasts,0,name+' cockpit never detonates');
 assert.equal(body.contact,entry.pace>=1.5,name+' heavy ground impact');
 assert.equal(body.samples[0].kneel,0,name+' starts upright');
 assert.equal(body.samples.at(-1).blast,1,name+' body wreck');
 assert.equal(pilot.samples.at(-1).blast,0,name+' cockpit settles intact');
 if(entry.foundry){
  assert.ok(body.samples.every(s=>s.collapse||s.clip),name+' uses a staged renderer');
  assert.ok(body.samples[0].point[1]+.09<body.samples.at(-1).point[1],name+' chassis drops');
  assert.ok(body.samples.at(-1).point[1]>pilot.samples.at(-1).point[1]+.02,name+' body and cockpit poses differ');
  assert.deepEqual(body.settled,body.samples.at(-1).point,name+' restored wreck is settled');
  assert.deepEqual(pilot.settled,pilot.samples.at(-1).point,name+' restored cockpit is settled');
 }
}
const frame=name=>roster.find(entry=>entry.name===name);
assert.ok(frame('ASHIGARU').pace<1&&frame('ASHIGARU').authored);
for(const name of ['GATECRASHER','BEHEMOTH','BASTION','GRAVEMAW','BULWARK-AEGIS']){
 assert.ok(frame(name).pace>=1.5,name+' has a slower collapse');
}
for(const name of ['GRAVEMAW','REAVER','BULWARK-AEGIS','AERO'])assert.ok(frame(name).authored,name+' has baked joints');
console.log('PASS staged body and cockpit deaths for all '+roster.length+' chassis, heavy timing, settled reloads and one reactor blast');
