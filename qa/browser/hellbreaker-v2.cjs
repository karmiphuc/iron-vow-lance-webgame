const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const gap=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

module.exports=async function checkHellbreakerV2({page,mobile,origin,tap,out}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.evaluate(()=>{
  __ironVow.start({seed:4242,contract:3,frames:[0]});
  ruleRandom=()=>0;
  const foe=battle.units.find(unit=>unit.frame===HELLBREAKER),target=current();
  if(!foe||!target)throw Error('Frontier fixture needs Hellbreaker and a Warden');
  for(const unit of battle.units)if(unit!==foe&&unit!==target){unit.hp.body=0;unit.alive=false;}
  battle.cover.clear();
  Object.assign(foe,{x:8,z:9,vx:8,vz:9,heading:headingTo(1,0),face:1});
  Object.assign(target,{x:12,z:9,vx:12,vz:9});
  target.hp.right=target.hp.left=0;
  for(const part of ['body','legs','pilot'])target.hp[part]=target.max[part]=10000;
  IronVowScene.clear();focusBattleCamera(foe,true);
 });
 await page.waitForFunction(()=>{
  const foe=battle.units.find(unit=>unit.frame===HELLBREAKER),entry=IronVowScene.models.get(foe?.id)?.entry;
  return Boolean(IronVowScene.ready&&foe&&IronVowScene.isLive(foe)&&entry?.m.nativeV2&&entry.primary?.muzzle2&&entry.secondary?.tip);
 },null,{timeout:60000});
 const gait=await page.evaluate(async()=>{
  const foe=battle.units.find(unit=>unit.frame===HELLBREAKER),{entry}=IronVowScene.models.get(foe.id),m=entry.m,source=m.nativeV2.source;
  const node=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const pos=object=>object.getWorldPosition(new THREE.Vector3());
  if(!paths(foe).has('9,9'))throw Error('Hellbreaker fixture needs a legal one-tile move');
  const samples=[];let complete=false;
  const capture=new Promise(resolve=>{
   function sample(){
    if(complete){resolve();return;}
    if(foe.motion)samples.push(m.rig.legs.map((leg,index)=>{
     const state=m.legs[index],actual=pos(node('ankle.'+leg.side));
     return {actual:actual.toArray(),error:actual.distanceTo(pos(leg.an)),plant:state.planted.toArray(),swing:state.swing,moving:Boolean(state.swing||state.settle)};
    }));
    requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  await moveUnit(foe,9,9);complete=true;await capture;
  const combat=IronVowScene.combat,launch=combat.launch,landed=combat.landed;
  const shots=[],strikes=[],rest=entry.primary.mount.position.clone();
  combat.launch=function(...args){
   const result=launch.apply(this,args),event=this.history.at(-1);
   if(event?.type==='launch'&&event.actor===foe.id){
    const alternate=event.socket==='muzzle2',marker=alternate?entry.primary.muzzle2:entry.primary.muzzle;
    const original=node(marker.name),point=pos(original);
    shots.push({event,origin:point.toArray(),marker:pos(marker).toArray(),
     spacing:pos(node('muzzle.morrow.L')).distanceTo(pos(node('muzzle.morrow.R'))),
     barrelDistance:entry.primary.bounds().distanceToPoint(point),recoil:entry.primary.mount.position.distanceTo(rest)});
   }
   return result;
  };
  combat.landed=function(...args){
   landed.apply(this,args);
   if(args[0]!==foe||args[2].id!=='breach-gauntlet')return;
   const tip=node('strike.tip.breach-gauntlet'),point=pos(tip);
   strikes.push({damage:args[3].damage,anchorError:point.distanceTo(IronVowScene.attachmentPoint(foe,'meleeTip')),
    gauntlet:entry.secondary?.id,tracked:entry.m.wpn.muzzle===tip,tip:point.toArray()});
  };
  window.hellbreakerFixture={foe,entry,source,shots,strikes};
  return {samples,tile:[foe.x,foe.z],weapon:foe.weapon,melee:foe.melee};
 });
 assert.deepEqual([gait.tile,gait.weapon,gait.melee],[[9,9],'morrow','breach-gauntlet']);
 assert.ok(gait.samples.length>=2&&gait.samples.some(feet=>feet.some(foot=>foot.swing)),'Hellbreaker takes a real step with articulated ankles');
 let planted=0;
 for(const [index,feet] of gait.samples.entries())for(const [side,foot] of feet.entries()){
  assert.ok(foot.error<1e-5,'Authored ankle follows the live IK joint');
  const previous=gait.samples[index-1]?.[side];
  if(!previous||previous.moving||foot.moving||gap(foot.plant,previous.plant)>1e-5)continue;
  assert.ok(gap(foot.actual,previous.actual)<.002,'A planted authored ankle holds in world space');planted++;
 }
 assert.ok(planted>0);
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy,null,{timeout:60000});
 const ranged=await page.evaluate(()=>({shots:window.hellbreakerFixture.shots,
  damage:IronVowScene.combat.history.filter(event=>event.actor===window.hellbreakerFixture.foe.id&&event.type==='impact'&&event.weapon==='morrow')
   .reduce((total,event)=>total+event.damage,0)}));
 assert.ok(ranged.damage>0&&ranged.shots.length>=2,'Frontier Hellbreaker executes Morrow attacks against the live Warden');
 for(const [i,{event,origin,marker,spacing,barrelDistance}] of ranged.shots.entries()){
  assert.equal(event.socket,i%2?'muzzle2':'muzzle');
  assert.ok(event.mounted&&event.aimError<8*Math.PI/180&&gap(event.origin,origin)<1e-5&&gap(event.origin,marker)<1e-5&&barrelDistance<.12,JSON.stringify({event,barrelDistance}));
  assert.ok(Math.abs(spacing-.38*.9)<1e-5,'Both world exits preserve the authored carriage spacing');
 }
 if(out&&!mobile){
  fs.mkdirSync(out,{recursive:true});
  const png=await page.screenshot(),data=await page.evaluate(async png=>{
   const picture=new Image();picture.src='data:image/png;base64,'+png;await picture.decode();
   const frame=document.createElement('canvas');frame.width=picture.width;frame.height=picture.height;
   frame.getContext('2d').drawImage(picture,0,0);return frame.toDataURL('image/webp',.88).split(',')[1];
  },png.toString('base64'));
  fs.writeFileSync(join(out,'hellbreaker-sortie.webp'),data,'base64');
 }
 const brokenRight=await page.evaluate(()=>{
  const {foe,entry}=window.hellbreakerFixture,target=current();
  Object.assign(target,{x:foe.x+1,z:foe.z,vx:foe.x+1,vz:foe.z});
  const intact=entry.m.build.parts.right.filter(part=>part.detach&&part.m.visible).length;
  foe.hp.right=0;
  IronVowScene.render(clock,.016);
  return {intact,remaining:entry.m.build.parts.right.filter(part=>part.detach&&part.m.visible).length,
   ranged:canUseWeapon(foe,unitWeapon(foe)),melee:meleeWeapon(foe)?.id,
   tip:entry.secondary.tip.getWorldPosition(new THREE.Vector3()).toArray()};
 });
 assert.ok(brokenRight.intact>0&&brokenRight.remaining===0&&!brokenRight.ranged&&brokenRight.melee==='breach-gauntlet');
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===3&&!battle.busy,null,{timeout:60000});
 const close=await page.evaluate(()=>({strikes:window.hellbreakerFixture.strikes,reports:window.hellbreakerFixture.shots.length}));
 assert.equal(close.reports,ranged.shots.length,'A disabled cannon stops ranged shots');
 assert.ok(close.strikes.length>0&&close.strikes.every(event=>event.damage>0&&event.anchorError<1e-5&&event.tracked&&event.gauntlet==='breach-gauntlet'&&gap(event.tip,brokenRight.tip)>.2),JSON.stringify(close));
 const exit=await page.evaluate(()=>{
  const {foe,entry,source}=window.hellbreakerFixture;
  foe.hp.left=0;IronVowScene.render(clock,.016);
  const noStrike=!entry.secondary&&!canUseWeapon(foe,meleeWeapon(foe));
  const leftRemoved=entry.m.build.parts.left.some(part=>part.detach)&&entry.m.build.parts.left.every(part=>!part.detach||!part.m.visible);
  const geometries=new Map();
  source.traverse(node=>{
   if(!node.geometry||geometries.has(node.geometry))return;
   geometries.set(node.geometry,0);node.geometry.addEventListener('dispose',()=>geometries.set(node.geometry,geometries.get(node.geometry)+1));
  });
  foe.hp.body=0;foe.alive=false;finish(true);
  return {noStrike,leftRemoved,salvage:save.salvage?.[HELLBREAKER],market:hullOnMarket(HELLBREAKER),
   geometries:geometries.size,exactOnce:[...geometries.values()].every(count=>count===1),removed:!entry.m.cont.parent,contexts:IronVowRenderer.metrics().contexts};
 });
 assert.ok(exit.noStrike&&exit.leftRemoved&&exit.salvage===1&&!exit.market&&exit.geometries>0&&exit.exactOnce&&exit.removed&&exit.contexts===1,JSON.stringify(exit));
 return {planted,morrow:ranged.shots.length,morrowDamage:ranged.damage,maxAimDegrees:Math.max(...ranged.shots.map(({event})=>event.aimError))*180/Math.PI,
  slideTravel:Math.max(...ranged.shots.map(shot=>shot.recoil)),gauntlet:close.strikes.length,
  gauntletDamage:close.strikes.reduce((total,event)=>total+event.damage,0),geometries:exit.geometries};
};
