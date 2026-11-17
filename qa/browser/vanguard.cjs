const ensureContractOffer=require('./contract-fixture.cjs');
const assert=require('node:assert/strict');
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
module.exports=async function checkVanguard({page,mobile,origin,tap}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');assert.equal(await page.getByRole('heading',{name:'GRAVEMAW',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>0;save.overworld={port:'corridor',arrears:0};save.dispatch={day:save.day,sizes:[1,1,3,3]}});
 await ensureContractOffer(page,2);
 await tap('#nav [data-page="contracts"]');await tap('[data-deploy="2"]');await tap('#modal-1');await tap('#modal-0');
 await page.waitForFunction(()=>{const u=battle?.units.find(x=>x.frame===VANGUARD_FRAME),e=u&&IronVowScene.models.get(u.id)?.entry;return Boolean(IronVowScene.ready&&u&&IronVowScene.isLive(u)&&e?.m.nativeV2&&e.primary?.muzzles?.length===6)},null,{timeout:60000});
 const info=await page.evaluate(async()=>{
  const u=battle.units.find(x=>x.frame===VANGUARD_FRAME),ally=current(),entry=IronVowScene.models.get(u.id).entry,m=entry.m,src=m.nativeV2.source;
  for(const other of battle.units)if(other!==u&&other!==ally){other.alive=false;other.hp.body=0}
  const obj=name=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)),world=o=>o.getWorldPosition(new THREE.Vector3());
  const fixed={right:u.hp.right,left:u.hp.left};
  function state(right,left){u.hp.right=right?fixed.right:0;u.hp.left=left?fixed.left:0;IronVowScene.render(clock,.016);return [obj('SOCKET.weapon.R').visible,obj('SOCKET.weapon.L').visible];}
  const states=[state(true,true),state(false,true),state(true,false),state(false,false)];state(true,true);
  const pose={strikeKind:'piledriver',strikeProgress:0};m.nativeV2.pose(entry,u,pose,clock);m.nativeV2.sync();
  const base=world(obj('tip.piledriver')).toArray();
  m.nativeV2.pose(entry,u,{...pose,strikeProgress:.5},clock);m.nativeV2.sync();
  const stroke=world(obj('tip.piledriver')).toArray();
  const muzzles=entry.primary.muzzles.map(x=>world(x).toArray());
  const authoredMuzzles=muzzles.map((_,i)=>{const a=i*Math.PI/3;return obj('Hailstorm | six-barrel rotor').localToWorld(new THREE.Vector3(.209*Math.cos(a),1.915,-.209*Math.sin(a))).toArray()});
  battle.cover.clear();const move=__ironVow.legalMoves(u.id).find(p=>p.cost===1&&p.x===u.x+1&&p.z===u.z);
  if(!move)throw Error('Missing one-tile Vanguard step');const samples=[];let moving=true;
  const sampled=new Promise(resolve=>{function sample(){if(!moving){resolve();return}if(u.motion)samples.push(m.rig.legs.map((leg,i)=>{const p=world(obj('ankle.'+leg.side)),state=m.legs[i];return {p:p.toArray(),binding:p.distanceTo(world(leg.an)),goal:p.distanceTo(state.foot),floor:IronVowScene.groundAt(p.x,p.z)+m.dims.ankleH*m.scale,swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()}}));requestAnimationFrame(sample)}requestAnimationFrame(sample)});
  try{await moveUnit(u,move.x,move.z)}finally{moving=false}await sampled;
  const fixture=[...paths(u)].find(([key,n])=>n===4&&!battle.cover.has(key)&&!occupied(...key.split(',').map(Number)));
  if(!fixture)throw Error('Missing four-tile pursuit');const [x,z]=fixture[0].split(',').map(Number);Object.assign(ally,{x,z,vx:x,vz:z});ally.max.body=ally.hp.body=500;ally.max.pilot=ally.hp.pilot=500;
  window.vanguardFixture={u,entry};return {name:u.name,states,base,stroke,muzzles,authoredMuzzles,samples};
 });
 assert.equal(info.name,'GRAVEMAW 2');assert.deepEqual(info.states,[[true,true],[false,true],[true,false],[false,false]]);
 assert.ok(dist(info.base,info.stroke)>.1,'Piledriver auger moves its authored tip');
 assert.equal(info.muzzles.length,6);for(let i=0;i<6;i++)assert.ok(dist(info.muzzles[i],info.authoredMuzzles[i])<.01,JSON.stringify({i,marker:info.muzzles[i],authored:info.authoredMuzzles[i]}));assert.ok(dist(info.muzzles[0],info.muzzles[3])>.15,'Six barrel origins differ');
 assert.ok(info.samples.length>=2&&info.samples.some(feet=>feet.some(f=>f.swing)),'Ground movement swings a leg');
 let planted=0;for(const [i,feet] of info.samples.entries())for(const [j,foot] of feet.entries()){
  assert.ok(foot.binding<1e-5&&foot.goal<.04,JSON.stringify(foot));const prev=info.samples[i-1]?.[j];
  if(!prev||foot.swing||foot.settle||prev.swing||prev.settle||dist(foot.plant,prev.plant)>1e-5)continue;
  assert.ok(dist(foot.p,prev.p)<.004&&Math.abs(foot.p[1]-foot.floor)<.04,JSON.stringify(foot));planted++;
 }assert.ok(planted>0,'At least one planted foot was sampled');
 await tap('#end');await page.waitForFunction(()=>battle?.turn===2&&!battle.busy,null,{timeout:60000});
 const attack=await page.evaluate(()=>({damage:Object.keys(current().hp).some(p=>current().hp[p]<current().max[p]),attacks:IronVowScene.combat.history.filter(e=>e.actor===vanguardFixture.u.id)}));
 assert.ok(attack.damage,'Pursuit and melee dealt real damage');
 await page.evaluate(()=>{
  const {u,entry}=window.vanguardFixture,a=current();battle.cover.clear();
  Object.assign(u,{x:7,z:11,vx:7,vz:11});u.hp.left=0;
  Object.assign(a,{x:7,z:15,vx:7,vz:15});a.max.body=a.hp.body=10000;a.max.pilot=a.hp.pilot=10000;
  const rotor=entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Hailstorm | six-barrel rotor'));
  const rest=rotor.quaternion.clone(),combat=IronVowScene.combat,launch=combat.launch;window.vanguardShots=[];
  combat.launch=function(...args){const result=launch.apply(this,args),event=this.history.at(-1);if(event?.type==='launch'&&event.actor===u.id){
   const marker=entry.primary.muzzles[event.index%6],p=marker.getWorldPosition(new THREE.Vector3());
   window.vanguardShots.push({event,position:p.toArray(),markerIndex:entry.primary.muzzles.indexOf(marker),spin:rest.angleTo(rotor.quaternion)});
  }return result;};
 });
 await tap('#end');await page.waitForFunction(()=>battle?.turn===3&&!battle.busy,null,{timeout:60000});
 const shots=await page.evaluate(()=>window.vanguardShots);
 assert.ok(shots.length>=2,'Hailstorm fired after left-arm loss');
 for(const {event,position,markerIndex} of shots){assert.equal(event.weapon,'hailstorm');assert.equal(markerIndex,event.index%6);assert.ok(event.mounted&&event.aimError<8*Math.PI/180&&dist(event.origin,position)<1e-5,JSON.stringify({event,position}));}
 assert.ok(new Set(shots.map(s=>s.markerIndex)).size>1,'Burst uses individual barrel origins');
 assert.ok(shots.some(({spin})=>spin>.2),'The actual Hailstorm salvo turns its authored rotor');
 console.log('PASS Vanguard live rig, both limb states, rotor, auger, grounded pursuit, melee and six-barrel volley');
 return {planted,launches:shots.length};
};
