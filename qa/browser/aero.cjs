const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

async function ready(page,team){
 await page.waitForFunction(team=>{
  const unit=battle?.units.find(unit=>unit.frame===AERO_FRAME&&unit.team===team);
  const entry=unit&&IronVowScene.models.get(unit.id)?.entry;
  return Boolean(IronVowScene.ready&&entry?.m.nativeV2&&entry.primary);
 },team,{timeout:60000});
}

module.exports=async function checkAero({page,mobile,origin,tap,out}){
 const ids=['cleaver','breaker','piledriver','blade'];
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 const card=page.locator('.bay-card').filter({has:page.getByRole('heading',{name:'AERO',exact:true})});
 assert.match(await card.innerText(),/400,000 CR/);
 assert.match(await card.innerText(),/15% per incoming round or shell/);
 assert.equal(await card.getByRole('button').isDisabled(),true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 const relay={};
 for(const [index,id] of ids.entries()){
  await page.evaluate(day=>{
   battle=null;save.day=day;save.dispatch={day,sizes:[1,2,3,3]};Math.random=()=>0;
   deploy(1,false,[0,1]);closeModal();
   const actor=battle.units.find(unit=>unit.frame===AERO_FRAME),target=current();
   for(const unit of battle.units)if(unit!==actor&&unit!==target){unit.alive=false;unit.hp.body=0;}
   battle.cover.clear();
   Object.assign(actor,{x:7,z:11,vx:7,vz:11});
   Object.assign(target,{x:7,z:13,vx:7,vz:13});
   target.hp.right=target.hp.left=0;
   for(const part of ['body','pilot','legs'])target.hp[part]=target.max[part]=10000;
   focusBattleCamera(actor,true);
  },index+1);
  await ready(page,'enemy');
  const setup=await page.evaluate(ids=>{
   const actor=battle.units.find(unit=>unit.frame===AERO_FRAME),target=current();
   const {entry}=IronVowScene.models.get(actor.id),{source}=entry.m.nativeV2;
   const node=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   const pos=object=>object.getWorldPosition(new THREE.Vector3());
   const marker=node('strike.tip.'+actor.melee),box=entry.secondary.bounds();
   const combat=IronVowScene.combat,landed=combat.landed;
   const impacts=[];
   combat.landed=function(...args){
    landed.apply(this,args);
    if(args[0]!==actor||args[2].id!==actor.melee)return;
    const mountTip=pos(entry.secondary.tip),actualTip=pos(marker);
    const grip=pos(node('Socket.Weapon.L'));
    impacts.push({range:distance(actor,target),damage:args[3].damage,tip:actualTip.clone().sub(grip).toArray(),
     tipError:actualTip.distanceTo(mountTip),bounds:entry.secondary.bounds().distanceToPoint(actualTip),
     gripError:grip.distanceTo(pos(entry.secondary.mount.parent))});
   };
   window.aeroRelayImpacts=impacts;
   return {melee:actor.melee,paint:actor.paint,shown:ids.filter(id=>node('melee.'+id).visible),
    tip:pos(marker).sub(pos(node('Socket.Weapon.L'))).toArray(),bounds:box.distanceToPoint(pos(marker))};
  },ids);
  assert.equal(setup.melee,id);
  assert.equal(setup.paint,null);
  assert.deepEqual(setup.shown,[id]);
  assert.ok(setup.bounds<.12,`${id} tip is anchored in its visible geometry (${setup.bounds})`);
  await tap('#end');
  await page.waitForFunction(()=>battle?.turn===2&&!battle.busy,null,{timeout:60000});
  const hits=await page.evaluate(()=>window.aeroRelayImpacts);
  assert.ok(hits.length>0&&hits.every(hit=>hit.range===1&&hit.damage>0&&hit.tipError<1e-5&&hit.gripError<1e-5&&hit.bounds<.12&&distance(hit.tip,setup.tip)>.15),
   `${id} uses the authored grip and tip throughout an actual adjacent Relay strike: ${JSON.stringify(hits)}`);
  relay[id]=hits.length;
 }

 await page.evaluate(()=>{battle=null;effects=[];page='workshop';workshopView='market';save.credits=400000;render();});
 const frame=await page.evaluate(()=>AERO_FRAME);
 await tap(`[data-buy-hull="${frame}"]`);
 assert.equal(await page.evaluate(()=>save.credits===0&&Boolean(save.reserve[AERO_FRAME])),true);
 if(await page.locator(`[data-chassis="${frame}"]`).count()===0)await tap('[data-bay="storage"]');
 await tap(`[data-chassis="${frame}"]`);
 assert.equal(await page.evaluate(()=>pilotFrame(0)===AERO_FRAME),true);
 await page.evaluate(()=>{battle=null;save.dispatch={day:save.day,sizes:[1,2,2,3]};Math.random=()=>0;deploy(0,false,[0]);closeModal();});
 await ready(page,'ally');
 const fits=await page.evaluate(()=>{
  const unit=current(),entry=IronVowScene.models.get(unit.id).entry,{source}=entry.m.nativeV2;
  const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const socket=side=>authored('Socket.Weapon.'+side).getWorldPosition(new THREE.Vector3());
  const error=(mount,side)=>mount.parent.getWorldPosition(new THREE.Vector3()).distanceTo(socket(side));
  const shown=()=>['cleaver','breaker','piledriver','blade'].some(id=>authored('melee.'+id).visible);
  const first={primary:entry.primary.id,secondary:entry.secondary.id,muzzle:entry.primary.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(authored('muzzle.main').getWorldPosition(new THREE.Vector3()))};
  const render=()=>IronVowScene.render(clock,.016);
  Object.assign(unit,{weapon:'rail',melee:'pike'});render();
  const swapped={gun:entry.primary.id,blade:entry.secondary.id,gunGrip:error(entry.primary.mount,'R'),bladeGrip:error(entry.secondary.mount,'L'),nativeMelee:shown(),nativeGun:authored('MODULE | Kestrel scout carbine').visible};
  Object.assign(unit,{melee:null,shield:'citadel-shield'});render();
  const shield={fit:error(entry.shield.mount,'L'),shown:entry.shield.mount.visible};
  const prevRight=unit.hp.right,prevLeft=unit.hp.left;
  unit.hp.right=unit.hp.left=0;render();
  const damage={gun:entry.primary.mount.visible,shield:entry.shield.mount.visible,
   plates:['right','left'].map(part=>entry.m.build.parts[part].filter(item=>item.detach).every(item=>!item.m.visible))};
  Object.assign(unit,{weapon:'rifle',melee:'blade',shield:null});unit.hp.right=prevRight;unit.hp.left=prevLeft;render();
  return {first,swapped,shield,damage};
 });
 assert.deepEqual([fits.first.primary,fits.first.secondary],['rifle','blade']);
 assert.ok(fits.first.muzzle<1e-5);
 assert.deepEqual([fits.swapped.gun,fits.swapped.blade,fits.swapped.nativeGun,fits.swapped.nativeMelee],['rail','pike',false,false]);
 assert.ok(fits.swapped.gunGrip<1e-5&&fits.swapped.bladeGrip<1e-5&&fits.shield.fit<1e-5&&fits.shield.shown,JSON.stringify(fits));
 assert.deepEqual(fits.damage,{gun:false,shield:false,plates:[true,true]});

 const jumpStart=await page.evaluate(()=>{
  const aero=current(),entry=IronVowScene.models.get(aero.id).entry,m=entry.m;
  const nozzles=m.nativeV2.jetNozzles;
  battle.cover.clear();battle.cover.add('2,16');
  focusBattleCamera({x:4,z:16},true);
  const samples=[];window.aeroThrustSamples=samples;
  const fire=IronVowScene.combat.fx.fire;
  IronVowScene.combat.fx.fire=function(origin,size,life,velocity,...rest){
   if(aero.motion?.jumpjet){
    const worlds=nozzles.map(node=>({origin:node.getWorldPosition(new THREE.Vector3()),axis:new THREE.Vector3(0,1,0).applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()))}));
    const index=worlds.findIndex(node=>node.origin.distanceTo(origin)<1e-5);
    samples.push({index,axis:index<0?null:velocity.clone().normalize().dot(worlds[index].axis),
     elevation:m.cont.position.y-IronVowScene.world(aero.vx,aero.vz).y});
   }
   return fire.call(this,origin,size,life,velocity,...rest);
  };
  return {ap:aero.ap,move:freeMovement(aero)};
 });
 await tap('#jumpjet');
 const landing=await page.evaluate(()=>{
  IronVowScene.render(clock,.5);
  if(!jumpjetLanding(current(),4,16))throw Error('Jump should clear the intervening cover');
  for(const oz of [0,-.2,.2,-.4,.4])for(const ox of [0,-.2,.2,-.4,.4]){
   const point=IronVowScene.projectWorld(IronVowScene.world(4+ox,16+oz));
   const x=Math.round(point.x),y=Math.round(point.y),tile=screenTile(x,y);
   if(tile?.x===4&&tile.z===16&&document.elementFromPoint(x,y)===canvas)return{x,y};
  }
  throw Error('Aero fixture needs a raycastable landing on the live board');
 });
 if(mobile)await page.touchscreen.tap(landing.x,landing.y);
 else await page.mouse.click(landing.x,landing.y);
 await page.waitForFunction(()=>!battle.busy&&current().jumpjetUsed&&current().x===4);
 const jump=await page.evaluate(()=>{
  const aero=current();
  return {samples:window.aeroThrustSamples,ap:aero.ap,move:freeMovement(aero),tile:[aero.x,aero.z]};
 });
 assert.ok(jump.ap===jumpStart.ap-2&&jump.move===jumpStart.move);
 assert.deepEqual(jump.tile,[4,16]);
 assert.ok(jump.samples.some(sample=>sample.elevation>.5)&&jump.samples.every(sample=>sample.index>=0&&sample.axis>.99));
 assert.deepEqual([...new Set(jump.samples.map(sample=>sample.index))].sort(),[0,1]);
 assert.equal(await page.locator('#jumpjet').isDisabled(),true);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('iron-vow-career')).sortie.units[0].jumpjetUsed===true);
 await page.reload({waitUntil:'domcontentloaded'});
 await ready(page,'ally');
 assert.equal(await page.locator('#jumpjet').isDisabled(),true);
 const before=await page.evaluate(()=>{
  const aero=current(),foe=battle.units.find(unit=>unit.team==='enemy');
  const {entry}=IronVowScene.models.get(aero.id),m=entry.m;
  battle.cover.clear();Object.assign(foe,{x:aero.x,z:aero.z-2,vx:aero.x,vz:aero.z-2});
  for(const unit of battle.units)if(unit!==aero&&unit!==foe){unit.alive=false;unit.hp.body=0;}
  Math.random=()=>.95;
  const samples=[];window.aeroDodgeSamples=samples;
  const monitor=()=>{
   if(battle?.turn!==1)return;
   if(battle.busy)samples.push({lean:m.rig.spine.position.x,feet:m.rig.legs.map((leg,index)=>{
    const state=m.legs[index],point=leg.an.getWorldPosition(new THREE.Vector3());
    return {moving:Boolean(state.swing||state.settle),point:point.toArray(),plant:state.planted.toArray()};
   })});
   requestAnimationFrame(monitor);
  };
  requestAnimationFrame(monitor);
  focusBattleCamera(aero,true);
  return {...aero.hp};
 });
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy,null,{timeout:60000});
 const dodge=await page.evaluate(()=>({hp:current().hp,count:IronVowScene.combat.history.filter(event=>event.type==='dodge'&&event.actor===current().id).length,samples:window.aeroDodgeSamples}));
 assert.deepEqual(dodge.hp,before);
 const leans=dodge.samples.filter(sample=>Math.abs(sample.lean)>.1);
 assert.ok(dodge.count>0&&leans.length>1,'A real, fully dodged attack produces an upper-body evade');
 let planted=0;
 for(const [i,sample] of leans.entries())for(const [side,foot] of sample.feet.entries()){
  const previous=leans[i-1]?.feet[side];
  if(!previous||foot.moving||previous.moving||distance(foot.plant,previous.plant)>1e-5)continue;
  assert.ok(distance(foot.point,previous.point)<.002,'The dodge leaves planted ankles at their world contacts');
  planted++;
 }
 assert.ok(planted>0);
 const ranged=await page.evaluate(async()=>{
  const unit=current(),foe=battle.units.find(unit=>unit.team==='enemy'&&unit.alive);
  const entry=IronVowScene.models.get(unit.id).entry;
  foe.hp.body=foe.max.body=10000;Math.random=()=>0;
  const tested={};
  for(const id of ['rifle','rail']){
   unit.weapon=id;unit.ap=8;foe.reacted=true;
   IronVowScene.render(clock,.02);
   const initial=IronVowScene.combat.history.at(-1)?.sequence??0;
   await __ironVow.attack(unit.id,foe.id,'body','fire');
   const actions=IronVowScene.combat.history.filter(event=>event.sequence>initial&&event.actor===unit.id&&event.weapon===id);
   const authored=entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('muzzle.main'));
   tested[id]={reports:actions.filter(event=>event.type==='launch'),damage:actions.filter(event=>event.type==='impact').reduce((sum,event)=>sum+event.damage,0),
    physicalMuzzle:id==='rifle'?entry.primary.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(authored.getWorldPosition(new THREE.Vector3())):
     new THREE.Box3().setFromObject(entry.primary.model).distanceToPoint(entry.primary.muzzle.getWorldPosition(new THREE.Vector3()))};
  }
  unit.weapon='rifle';IronVowScene.render(clock,.02);
  return tested;
 });
 for(const [id,result] of Object.entries(ranged)){
  assert.ok(result.damage>0&&result.physicalMuzzle<.12&&result.reports.length>0,`${id} uses a physical muzzle and deals damage`);
  assert.ok(result.reports.every(event=>event.mounted&&event.aimError<8*Math.PI/180&&distance(event.origin,event.expectedOrigin)<1e-5),JSON.stringify(result.reports));
 }
 if(out&&!mobile){
  fs.mkdirSync(out,{recursive:true});
  const png=await page.screenshot();
  const encoded=await page.evaluate(async data=>{
   const source=new Image();source.src='data:image/png;base64,'+data;await source.decode();
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   canvas.getContext('2d').drawImage(source,0,0);
   return canvas.toDataURL('image/webp',.88).split(',')[1];
  },png.toString('base64'));
  fs.writeFileSync(join(out,'aero-sortie.webp'),encoded,'base64');
 }
 return {relay,ranged:Object.fromEntries(Object.entries(ranged).map(([id,result])=>[id,result.reports.length])),jetBursts:jump.samples.length,dodges:dodge.count,planted};
};
