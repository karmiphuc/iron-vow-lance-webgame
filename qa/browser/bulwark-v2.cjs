const selectContract=require('./select-contract.cjs');
const ensureContractOffer=require('./contract-fixture.cjs');
const assert=require('node:assert/strict');
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
module.exports=async function checkBulwark({page,origin,tap}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{save.overworld={port:'frontier',arrears:0};save.dispatch={day:save.day,sizes:[1,1,3,3]}});
 await ensureContractOffer(page,3);
 await tap('#nav [data-page="contracts"]');await selectContract(page,{template:3});await tap('[data-deploy="3"]');await tap('#modal-1');await tap('#modal-0');
 await page.waitForFunction(()=>{const u=battle?.units.find(x=>x.frame===BULWARK_FRAME),e=u&&IronVowScene.models.get(u.id)?.entry;return Boolean(IronVowScene.ready&&u&&IronVowScene.isLive(u)&&e?.m.nativeV2&&e.shield)},null,{timeout:15000});
 const info=await page.evaluate(async()=>{
  ruleRandom=()=>0;
  const u=battle.units.find(x=>x.frame===BULWARK_FRAME),ally=current(),entry=IronVowScene.models.get(u.id).entry,m=entry.m,src=m.nativeV2.source;
  for(const other of battle.units)if(other!==u&&other!==ally){other.alive=false;other.hp.body=0}
  const obj=name=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)),world=o=>o.getWorldPosition(new THREE.Vector3());
  const fixed={right:u.hp.right,left:u.hp.left};
  function state(right,left){u.hp.right=right?fixed.right:0;u.hp.left=left?fixed.left:0;IronVowScene.render(clock,.016);return [obj('module.aegis-cleaver').visible,obj('module.aegis-shield').visible,Boolean(activeShield(u))]}
  const states=[state(true,true),state(false,true),state(true,false),state(false,false)];state(true,true);
  const attachment=[['aegis-cleave','strike.tip.aegis-cleave'],['aegis-bash','strike.tip.aegis-bash']].map(([kind,name])=>distances(m.nativeV2.strikeContact(kind),obj(name)));
  function distances(a,b){return world(a).distanceTo(world(b))}
  const shield=entry.shield.mount.parent===m.rig.arms.L.so&&entry.shield.face===m.nativeV2.strikeContact('aegis-bash');
  battle.cover.clear();const move=__ironVow.legalMoves(u.id).find(p=>p.cost===1&&p.x===u.x+1&&p.z===u.z);
  if(!move)throw Error('Missing one-tile Bulwark step');const samples=[];let moving=true;
  const sampled=new Promise(resolve=>{function sample(){if(!moving){resolve();return}if(u.motion)samples.push(m.rig.legs.map((leg,i)=>{const p=world(obj('ankle.'+leg.side)),state=m.legs[i];return {p:p.toArray(),binding:p.distanceTo(world(leg.an)),goal:p.distanceTo(state.foot),floor:IronVowScene.groundAt(p.x,p.z)+m.dims.ankleH*m.scale,swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()}}));requestAnimationFrame(sample)}requestAnimationFrame(sample)});
  try{await moveUnit(u,move.x,move.z)}finally{moving=false}await sampled;
  Object.assign(u,{x:7,z:11,vx:7,vz:11});Object.assign(ally,{x:7,z:15,vx:7,vz:15});ally.max.body=ally.hp.body=10000;ally.max.pilot=ally.hp.pilot=10000;
  window.bulwarkFixture={u,entry,ally,frames:[],hits:[]};
  const fixture=window.bulwarkFixture,combat=IronVowScene.combat,landed=combat.landed;
  combat.landed=function(...args){const result=landed.apply(this,args),event=this.history.at(-1);if(event?.actor===u.id&&event.type==='impact')fixture.hits.push({event,tip:world(m.nativeV2.strikeContact(event.weapon)).toArray()});return result};
  function record(){if(u.attack&&m.melee)fixture.frames.push({kind:u.attack.kind,side:m.melee.side,tip:world(m.nativeV2.strikeContact(u.attack.kind)).toArray()});requestAnimationFrame(record)}requestAnimationFrame(record);
  return {states,attachment,shield,samples};
 });
 assert.deepEqual(info.states,[[true,true,true],[false,true,true],[true,false,false],[false,false,false]]);
 assert.ok(info.shield);assert.ok(info.attachment.every(x=>x<1e-5),JSON.stringify(info.attachment));
 assert.ok(info.samples.length>=2&&info.samples.some(feet=>feet.some(f=>f.swing)),'Ground movement swings a leg');
 let planted=0;for(const [i,feet] of info.samples.entries())for(const [j,foot] of feet.entries()){
  assert.ok(foot.binding<1e-5&&foot.goal<.04,JSON.stringify(foot));const prev=info.samples[i-1]?.[j];
  if(!prev||foot.swing||foot.settle||prev.swing||prev.settle||dist(foot.plant,prev.plant)>1e-5)continue;
  assert.ok(dist(foot.p,prev.p)<.004&&Math.abs(foot.p[1]-foot.floor)<.04,JSON.stringify(foot));planted++;
 }assert.ok(planted>0,'At least one planted foot was sampled');
 const after=[];for(let i=0;i<2;i++){
  await tap('#end');await page.waitForFunction(turn=>battle?.turn===turn&&!battle.busy,i+2,{timeout:60000});
  after.push(await page.evaluate(()=>({x:bulwarkFixture.ally.x,z:bulwarkFixture.ally.z})));
  await page.evaluate(()=>{const {u,ally}=bulwarkFixture;battle.cover.clear();Object.assign(u,{x:7,z:11,vx:7,vz:11});Object.assign(ally,{x:7,z:15,vx:7,vz:15})});
 }
 const result=await page.evaluate(()=>IronVowScene.combat.history.filter(e=>e.actor===bulwarkFixture.u.id&&e.type==='impact'));
 assert.ok(result.some(e=>e.weapon==='aegis-cleave'&&e.damage>0),JSON.stringify(result));
 assert.ok(result.some(e=>e.weapon==='aegis-bash'&&e.damage>0),JSON.stringify(result));
 assert.ok(after.some(p=>p.x!==7||p.z!==15),'The bash pushes the target');
 const observed=await page.evaluate(()=>({frames:bulwarkFixture.frames,hits:bulwarkFixture.hits}));
 for(const [kind,side] of [['aegis-cleave','R'],['aegis-bash','L']]){
  const frames=observed.frames.filter(f=>f.kind===kind);assert.ok(frames.length>=2&&frames.every(f=>f.side===side),JSON.stringify({kind,frames:frames.length}));
  assert.ok(frames.some(f=>dist(f.tip,frames[0].tip)>.05),kind+' active weapon tip moves');
 }
 assert.ok(observed.hits.length>=2&&observed.hits.every(h=>dist(h.tip,h.event.point)<1e-5),JSON.stringify(observed.hits));
 const dispose=await page.evaluate(()=>{const entry=bulwarkFixture.entry,geometries=new Map();entry.m.nativeV2.source.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry)){geometries.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>geometries.set(o.geometry,geometries.get(o.geometry)+1));}});IronVowScene.clear();return {removed:!entry.m.cont.parent,geometries:geometries.size,once:[...geometries.values()].every(n=>n===1)}});
 assert.ok(dispose.removed&&dispose.geometries>0&&dispose.once,JSON.stringify(dispose));
 console.log('PASS Bulwark native mounted equipment, independent arm loss, grounded movement, both AI strikes, bash push and disposal');
 return {planted,impacts:result.length};
};
