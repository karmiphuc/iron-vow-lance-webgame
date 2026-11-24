const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

const {run}=create();
run('createBattle(0,false,false,[0]);globalThis.subject=battle.units[1]');
const restoredYaw=run(`(()=>{
 selected=0;action="move";createBattle(0,false,true);
 const target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
 window.IronVowScene={mechYaw:()=>-2.6};
 target.hp.body=0;beginDestruction(target);
 const id=target.id;
 save.sortie=JSON.parse(JSON.stringify(captureSortie()));
 window.IronVowScene=undefined;
 if(!restoreSortie())throw Error("Could not restore test sortie");
 return battle.units.find(u=>u.id===id).deathYaw;
})()`);
assert.ok(Math.abs(restoredYaw+2.6)<1e-10,'checkpoint preserves rendered destruction yaw');
run('createBattle(0,false,false,[0]);globalThis.subject=battle.units[1]');
const roster=JSON.parse(run(`JSON.stringify(FRAMES.map((frame,i)=>{
 const u={...subject,frame:i,hp:{...subject.hp},max:{...subject.max}};
 const pace=destructionPace(u);
 function check(reason){
  u.alive=true;u.deathStyle=null;effects=[];
  beginDestruction(u,reason);
  const samples=[0,.27,.56,.95,1.92].map(age=>{
   const pose=animationPose(u,clock+destructionTime(u,age));   // ages -> real seconds through DEATH_TIME
   return {kneel:pose.kneel,blast:pose.explosion,death:pose.death};
  });
  updateDestruction(u,clock+destructionTime(u,1.02));
  const early=effects.filter(e=>e.type==='detonation'&&e.big).length;
  updateDestruction(u,clock+destructionTime(u,1.09));
  updateDestruction(u,clock+destructionTime(u,1.15));
  const blasts=effects.filter(e=>e.type==='detonation'&&e.big).length;
  const contact=Boolean(u.deathEvents&16);
  delete u.deathTime;
  const restored=animationPose(u,clock);
  return {samples,early,blasts,contact,settled:{kneel:restored.kneel,blast:restored.explosion,death:restored.death}};
 }
 return {name:frame.name,pace,body:check('body'),pilot:check('pilot')};
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
 assert.equal(body.samples[2].kneel,1,name+' completes its kneel stage');
 assert.equal(body.samples[1].blast,0,name+' does not explode during the kneel');
 assert.ok(body.samples[2].death>0&&body.samples[2].death<1,name+' progresses through collapse');
 assert.deepEqual(body.settled,body.samples.at(-1),name+' restored body retains its settled pose');
 assert.deepEqual(pilot.settled,pilot.samples.at(-1),name+' restored pilot retains its settled pose');
}
const frame=name=>roster.find(entry=>entry.name===name);
assert.ok(frame('ASHIGARU').pace<1);
for(const name of ['GATECRASHER','BEHEMOTH','BASTION','GRAVEMAW','BULWARK-AEGIS']){
 assert.ok(frame(name).pace>=1.5,name+' has a slower collapse');
}
// Live damaged meshes and planted feet are checked in check-scene.cjs and browser rig suites.
console.log('PASS staged body and cockpit deaths for all '+roster.length+' chassis, heavy timing, settled reloads and one reactor blast');
