const assert=require('node:assert/strict');
module.exports=async function bastionSharedRig({page,mobile,origin,tap}){
 await page.addInitScript(()=>{const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};window.__stopBastionFrames=()=>{for(const id of pending)cancel(id);pending.clear();};});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('#nav button').first().waitFor();
 await page.evaluate(()=>{save.credits+=FRAMES[BASTION_FRAME].cost;render();});
 await tap('[data-bay="market"]');assert.equal(await page.locator('[data-buy-hull="12"]').count(),0,'Citadel is absent from the market');
 await tap('[data-buy-hull="10"]');await tap('[data-bay="storage"]');await tap('[data-chassis="10"]');await tap('[data-bay="assigned"]');
 assert.equal(await page.evaluate(()=>save.units[0].weapon),'rifle');
 console.log('Bastion bought and assigned');
 await page.waitForFunction(()=>IronVowFoundry.preview({frame:10,weapon:'rifle',melee:'cleaver'},2)?.secondary?.tip,null,{timeout:120000});
 console.log('Bastion shared preview ready');
 const fittings=await page.evaluate(()=>['cleaver','blade','breaker','piledriver'].map(melee=>{
  const entry=IronVowFoundry.preview({frame:10,weapon:'rifle',melee},2),m=entry.m,p=node=>node.getWorldPosition(new THREE.Vector3());
  const source=m.nativeV2.source,node=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const pistons=JSON.parse(node('root').userData.pistons);
  const left=entry.secondary.model.isMesh||melee==='blade'?m.rig.arms.L.so:node('weapon.'+melee);
  return {left:p(entry.secondary.mount).distanceTo(p(left)),right:p(entry.primary.mount).distanceTo(p(m.rig.arms.R.so)),
    tip:Boolean(entry.secondary.tip),width:entry.surface.width,pistons:pistons.filter(pair=>pair.every(node)).length};
 }));
 for(const sample of fittings){assert.ok(sample.left<1e-6&&sample.right<1e-6&&sample.tip,'Production weapons remain on the shared rig sockets');assert.equal(sample.width,640);assert.equal(sample.pistons,14,'Both halves of every native piston are bound');}
 console.log('Bastion fittings checked');
 await page.locator('#paint-preview').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.armed);
 await page.evaluate(()=>{
  const draw=IronVowFoundry.draw;
  window.bastionPoseQA={first:null,changed:false};
  IronVowFoundry.draw=(...args)=>{
   const entry=draw(...args);
   if(args[2].stage==='workshop'&&entry?.secondary?.tip){
    const tip=entry.secondary.tip.getWorldPosition(new THREE.Vector3());
    bastionPoseQA.first??=tip;
    bastionPoseQA.changed||=tip.distanceTo(bastionPoseQA.first)>.1;
   }
   return entry;
  };
 });
 await page.evaluate(()=>__stopBastionFrames());const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{last=performance.now();requestAnimationFrame(draw);document.querySelector('#bastion-test-melee').click();});
 for(let i=0;i<20&&!await page.evaluate(()=>bastionPoseQA.changed);i++)await page.clock.fastForward(100);
 assert.equal(await page.evaluate(()=>bastionPoseQA.changed),true,'Test Strike moves the equipped tip in the live turntable');
 await page.clock.resume();
 console.log('Bastion Test Strike animated');
 await page.evaluate(()=>__ironVow.start({seed:4242,frames:[10,8,7]}));await page.waitForFunction(()=>IronVowScene.ready&&IronVowScene.models.get('ally0')?.entry?.m.nativeV2,null,{timeout:120000});
 await page.evaluate(()=>{selected=1;action='fire';renderBattle();});
 const point=await page.evaluate(()=>IronVowScene.projectWorld(IronVowScene.partPoint(battle.units.find(u=>u.id==='ally0'))));
 if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 assert.equal(await page.evaluate(()=>selected),0,'A real raycast selects the visible Bastion');
 const battleRig=await page.evaluate(async()=>{
  const unit=battle.units.find(u=>u.id==='ally0'),target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const entry=IronVowScene.models.get(unit.id).entry,m=entry.m,source=m.nativeV2.source;
  const node=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const preview=IronVowFoundry.preview({frame:10,weapon:'rifle',melee:'piledriver'},foundryModel(10),'rig-v2',0,'battle');
  const oldMeshes=new Set(),disposed=new Map();
  source.traverse(o=>{if(o.isMesh)oldMeshes.add(o.geometry)});
  for(const geometry of oldMeshes){disposed.set(geometry,0);geometry.addEventListener('dispose',()=>disposed.set(geometry,disposed.get(geometry)+1));}
  const move=[...__ironVow.legalMoves(unit.id)].find(p=>p.cost===2&&p.x===unit.x+2&&p.z===unit.z);
  if(!move)throw Error('Missing Bastion walk fixture');
  const gait=[];let moving=true;
  const samples=new Promise(resolve=>{function sample(){
   if(!moving){resolve();return}
   if(unit.motion)gait.push(m.rig.legs.map((leg,i)=>{
    const ankle=node('ankle.'+leg.side),p=ankle.getWorldPosition(new THREE.Vector3()),state=m.legs[i];
    return {position:p.toArray(),binding:p.distanceTo(leg.an.getWorldPosition(new THREE.Vector3())),
     goal:p.distanceTo(state.foot),swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()};
   }));
   requestAnimationFrame(sample);
  }requestAnimationFrame(sample);});
  try{await moveUnit(unit,move.x,move.z)}finally{moving=false}await samples;
  const original={weapon:unit.weapon,melee:unit.melee,shield:unit.shield,hp:{...unit.hp}};
  const before=JSON.stringify(captureSortie());
  unit.hp.right=unit.hp.left=0;IronVowScene.render(clock,.016);
  const damaged={rifle:node('weapon.rifle').visible,plates:['right','left'].map(k=>m.build.parts[k].filter(p=>p.detach).some(p=>!p.m.visible))};
  Object.assign(unit,original);unit.hp=original.hp;IronVowScene.render(clock,.016);
  const restored=before===JSON.stringify(captureSortie())&&node('weapon.rifle').visible;
  attackCameraEnabled=false;battle.cover.clear();ruleRandom=()=>0;
  Object.assign(unit,{x:7,z:11,vx:7,vz:11,weapon:'missile',ap:20});
  Object.assign(target,{x:7,z:13,vx:7,vz:13});
  for(const p of Object.keys(target.hp))target.hp[p]=target.max[p]=10000;
  IronVowScene.render(clock,.016);
  const launcher=node('mount.shoulderR'),launcherFitted=launcher.visible&&entry.primary.model===launcher;
  const combat=IronVowScene.combat,launch=combat.launch,launches=[];
  combat.launch=function(...args){
   const result=launch.apply(this,args),event=this.history.at(-1);
   if(event?.type==='launch'&&event.actor===unit.id&&event.weapon==='missile'){
    const barrel=entry.primary,p=event.index%2?barrel.muzzle2:barrel.muzzle;
    launches.push({event,port:p.name,point:p.getWorldPosition(new THREE.Vector3()).toArray()});
   }
   return result;
  };
  await shoot(unit,target,'body',weapon('missile'),false,null);
  combat.launch=launch;
  unit.ap=20;unit.weapon='rifle';IronVowScene.render(clock,.016);
  const launcherStowed=!launcher.visible;
  const {muzzle,grip}=entry.primary,receiver=muzzle.getWorldPosition(new THREE.Vector3()).sub(grip.getWorldPosition(new THREE.Vector3()));
  const rifleForward=muzzle.getWorldDirection(new THREE.Vector3()).dot(receiver.normalize());
  await shoot(unit,target,'body',weapon('rifle'),false,null);
  const rifles=combat.history.filter(e=>e.type==='launch'&&e.actor===unit.id&&e.weapon==='rifle');
  IronVowScene.clear();
  return {damaged,restored,launcherFitted,launcherStowed,launches,rifles,rifleExpected:weapon('rifle').burst,rifleForward,gait,preview:Boolean(preview?.m.nativeV2),
   disposed:disposed.size>0&&[...disposed.values()].every(n=>n===1),
   contexts:IronVowRenderer.metrics().contexts};
 });
 assert.ok(battleRig.launcherFitted&&battleRig.launcherStowed,'The authored launcher follows the selected primary weapon');
 assert.deepEqual(battleRig.damaged,{rifle:false,plates:[true,true]});
 const {restored,disposed,preview}=battleRig;
 assert.ok(restored&&disposed&&preview,JSON.stringify({restored,disposed,preview}));
 assert.equal(battleRig.contexts,1);
 assert.deepEqual(battleRig.launches.map(l=>l.port),['muzzle.vesper.01','muzzle.vesper.04']);
 for(const {event,point} of battleRig.launches){
  assert.ok(event.mounted&&event.aimError<8*Math.PI/180,JSON.stringify(event));
  assert.ok(Math.hypot(...event.origin.map((n,i)=>n-point[i]))<1e-5,JSON.stringify(event));
 }
 assert.ok(battleRig.rifleForward>.9&&battleRig.rifles.length===battleRig.rifleExpected,JSON.stringify({count:battleRig.rifles.length,forward:battleRig.rifleForward}));
 for(const event of battleRig.rifles)assert.ok(event.mounted&&event.aimError<8*Math.PI/180,JSON.stringify(event));
 const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
 let plantedPairs=0;
 for(const [i,feet] of battleRig.gait.entries())for(const [j,foot] of feet.entries()){
  assert.ok(foot.binding<1e-5&&foot.goal<.04,JSON.stringify(foot));
  const prior=battleRig.gait[i-1]?.[j];
  if(prior&&!prior.swing&&!prior.settle&&!foot.swing&&!foot.settle&&distance(prior.plant,foot.plant)<1e-5){
   assert.ok(distance(prior.position,foot.position)<.004,JSON.stringify(foot));plantedPairs++;
  }
 }
 assert.ok(plantedPairs>0&&battleRig.gait.some(feet=>feet.some(foot=>foot.swing)));
 return {fittings:fittings.length,pistons:fittings[0].pistons,missileReports:battleRig.launches.length,
  rifleReports:battleRig.rifles.length,plantedPairs,disposed:battleRig.disposed};
};
