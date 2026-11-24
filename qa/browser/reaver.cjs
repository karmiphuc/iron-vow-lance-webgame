const navigate=require('./navigate.cjs');
const selectContract=require('./select-contract.cjs');
const ensureContractOffer=require('./contract-fixture.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const vectorDistance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

module.exports=async function checkReaver({page,mobile,origin,tap,out}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'REAVER',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>0;save.overworld={port:'corridor',arrears:0};save.dispatch={day:save.day,sizes:[1,1,3,3]}});
 await ensureContractOffer(page,2);
 await navigate(page,'contracts',tap,mobile);
 await selectContract(page,{template:2});await tap('[data-deploy="2"]');
 await tap('#modal-1');
 await tap('#modal-0');
 await page.waitForFunction(()=>{
  const foe=battle?.units.find(unit=>unit.frame===REAVER_FRAME),entry=foe&&IronVowScene.models.get(foe.id)?.entry;
  return Boolean(IronVowScene.ready&&foe&&IronVowScene.isLive(foe)&&entry?.m.nativeV2&&entry.primary?.muzzle2);
 },null,{timeout:60000});
 const gait=await page.evaluate(async()=>{
  const foe=battle.units.find(unit=>unit.frame===REAVER_FRAME),ally=current();
  for(const other of battle.units)if(other!==foe&&other!==ally){other.alive=false;other.hp.body=0;}
  const {entry}=IronVowScene.models.get(foe.id),m=entry.m,source=m.nativeV2.source;
  const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const world=node=>node.getWorldPosition(new THREE.Vector3());
  const locations=m.rig.legs.map(leg=>leg.side);
  battle.cover.clear();
  const move=__ironVow.legalMoves(foe.id).find(tile=>tile.cost===1&&tile.x===foe.x+1&&tile.z===foe.z);
  if(!move)throw Error('Reaver fixture requires a legal one-tile ground move');
  let moving=true;
  const samples=[];
  const sampled=new Promise(resolve=>{
   function sample(){
    if(!moving){resolve();return;}
    if(foe.motion)samples.push(m.rig.legs.map((leg,index)=>{
     const state=m.legs[index],position=world(authored('ankle.'+leg.side));
     return {position:position.toArray(),binding:position.distanceTo(world(leg.an)),
      floor:IronVowScene.groundAt(position.x,position.z)+m.dims.ankleH*m.scale,
      targetError:position.distanceTo(state.foot),swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()};
    }));
    requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  try{await moveUnit(foe,move.x,move.z);}finally{moving=false;}
  await sampled;
  const x=foe.x,z=foe.z+2;
  Object.assign(ally,{x,z,vx:x,vz:z});
  ally.hp.right=0;ally.hp.left=0;
  for(const part of ['body','pilot','legs'])ally.max[part]=ally.hp[part]=10000;
  lockedTarget=foe.id;renderBattle();focusBattleCamera(foe,true);
  return {contract:battle.contract.id,team:foe.team,name:foe.name,paint:foe.paint,trim:foe.trim,locations,
   armored:unitWeapon(foe).name,arrived:foe.x===move.x&&foe.z===move.z,samples};
 });
 assert.deepEqual([gait.contract,gait.team,gait.name,gait.paint,gait.trim,gait.armored],
  ['corridor','enemy','REAVER 3',null,null,'RV-04 Autocannon']);
 await tap('#target-toggle');
 const details=page.getByRole('complementary',{name:'Target subsystem details'});
 assert.equal(await details.isVisible(),true);
 assert.equal(await details.getByRole('heading',{name:gait.name,exact:true}).isVisible(),true);
 assert.match(await details.locator('.combat-status').innerText(),/MEDIUM\+ · 8 RD \/ GUN/);
 await tap('#close-target');
 assert.deepEqual(gait.locations,['LF','RF','LB','RB']);
 assert.ok(gait.arrived&&gait.samples.length>=2&&gait.samples.some(feet=>feet.some(foot=>foot.swing)),'The quad completes a legal step and articulates its ankles');
 let planted=0,worstTargetError=0;
 for(const [i,feet] of gait.samples.entries())for(const [side,foot] of feet.entries()){
  assert.ok(foot.binding<1e-5,'Each ankle follows its exported pivot');
  worstTargetError=Math.max(worstTargetError,foot.targetError);
  const previous=gait.samples[i-1]?.[side];
  if(!previous||foot.swing||foot.settle||previous.swing||previous.settle||vectorDistance(foot.plant,previous.plant)>1e-5)continue;
  assert.ok(vectorDistance(foot.position,previous.position)<.002,`A planted Reaver foot holds its world position: ${JSON.stringify({side,foot,previous})}`);
  assert.ok(Math.abs(foot.position[1]-foot.floor)<.02,`A planted Reaver foot rests at terrain height: ${JSON.stringify(foot)}`);
  planted++;
 }
 assert.ok(planted>0&&worstTargetError<.015,`The four actual ankles reach their gait goals: ${worstTargetError}`);

 await page.evaluate(()=>{
  const foe=battle.units.find(unit=>unit.frame===REAVER_FRAME),{entry}=IronVowScene.models.get(foe.id),source=entry.m.nativeV2.source;
  const observed=[];
  const combat=IronVowScene.combat,launch=combat.launch;
  combat.launch=function(...args){
   const result=launch.apply(this,args),event=this.history.at(-1);
   if(event?.type==='launch'&&event.actor===foe.id){
    const selected=event.socket==='muzzle2'?entry.primary.alternate:entry.primary;
    const marker=source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(selected.muzzle.name));
    const point=marker.getWorldPosition(new THREE.Vector3());
    const direction=new THREE.Vector3(0,0,-1).applyQuaternion(marker.getWorldQuaternion(new THREE.Quaternion()));
    const error=direction.angleTo(new THREE.Vector3(...event.targetPoint).sub(point));
    observed.push({event,ap:foe.ap,point:point.toArray(),error,name:selected.muzzle.name,bounds:selected.bounds().distanceToPoint(point)});
   }
   return result;
  };
  window.reaverFixture={foe,entry,source,observed,ally:current(),lastImpact:0};
 });
 const loadout=async(right,left)=>page.evaluate(({right,left})=>{
  const {foe,entry,source}=window.reaverFixture;
  foe.hp.right=right?foe.max.right:0;foe.hp.left=left?foe.max.left:0;
  IronVowScene.render(clock,.016);
  renderBattle();
  const ready={...foe,ap:roundAP(foe.training)};
  return {visible:['R','L'].map(side=>source.getObjectByName('RECOIL_CARRIAGE_'+side).visible),
   plates:['right','left'].map(part=>entry.m.build.parts[part].filter(item=>item.detach&&item.m.visible).length),
   armed:isArmed(foe),shoots:canUseWeapon(ready,unitWeapon(ready)),status:document.querySelector('#target-panel .combat-status').textContent};
 },{right,left});
 async function fire(turn,sides){
  const before=await page.evaluate(()=>window.reaverFixture.ally.hp.body);
  await tap('#end');
  await page.waitForFunction(turn=>battle?.turn===turn+1&&!battle.busy,turn,{timeout:60000});
  const {shots,impacts,after}=await page.evaluate(()=>{
   const fixture=window.reaverFixture;
   const impacts=IronVowScene.combat.history.filter(event=>event.sequence>fixture.lastImpact&&event.type==='impact'&&event.actor===fixture.foe.id);
   fixture.lastImpact=impacts.at(-1)?.sequence??fixture.lastImpact;
   return {shots:fixture.observed.splice(0),impacts,after:fixture.ally.hp.body};
  });
  const perBurst=8*sides.length;
  assert.equal(shots.length,2*perBurst,'The Reaver pays for two full bursts with its 8 AP');
  assert.equal(impacts.length,shots.length,'Every launched projectile in this all-hit fixture reaches its target');
  assert.equal(before-after,impacts.reduce((sum,event)=>sum+event.damage,0),'Applied body damage matches actual impacts');
  const damage=[];
  for(let offset=0;offset<shots.length;offset+=perBurst){
   const volley=shots.slice(offset,offset+perBurst);
   for(const [i,{event,point,name,error,bounds,ap}] of volley.entries()){
    assert.equal(name,'muzzle.'+sides[i%sides.length]);
    assert.equal(event.weapon,'reaver-autocannon');
    assert.equal(event.index,i);
    assert.equal(ap,5-3*offset/perBurst,'Each burst costs 3 AP once');
    assert.ok(event.mounted&&event.aimError<8*Math.PI/180&&error<8*Math.PI/180&&bounds<.1,JSON.stringify({event,name,error,bounds}));
    assert.ok(vectorDistance(event.origin,point)<1e-5,'The shot starts at the exported muzzle');
    if(i>=sides.length)assert.ok(event.time>volley[i-sides.length].event.time,'Consecutive beats launch on different frames');
    if(sides.length===2&&i%2===1){
     assert.equal(event.time,volley[i-1].event.time,'Both barrels launch on the same frame');
     assert.ok(vectorDistance(event.origin,volley[i-1].event.origin)>.1,'Paired rounds come from distinct barrels');
    }
   }
   damage.push(impacts.slice(offset,offset+perBurst).reduce((sum,event)=>sum+event.damage,0));
  }
  return {reports:shots.length,damage};
 }
 const intact=await loadout(true,true);
 assert.deepEqual(intact.visible,[true,true]);
 assert.ok(intact.plates.every(count=>count>0)&&intact.armed&&intact.shoots);
 const dual=await fire(1,['R','L']);
 assert.deepEqual(dual.damage,[32,32]);
 if(out&&!mobile){
  fs.mkdirSync(out,{recursive:true});
  const png=await page.screenshot();
  const encoded=await page.evaluate(async data=>{
   const source=new Image();source.src='data:image/png;base64,'+data;await source.decode();
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   canvas.getContext('2d').drawImage(source,0,0);
   return canvas.toDataURL('image/webp',.88).split(',')[1];
  },png.toString('base64'));
  fs.writeFileSync(join(out,'reaver-sortie.webp'),encoded,'base64');
 }
 const rightOnly=await loadout(true,false);
 assert.deepEqual(rightOnly.visible,[true,false]);
 assert.deepEqual(rightOnly.plates,[intact.plates[0],0]);
 assert.ok(rightOnly.armed);
 assert.match(rightOnly.status,/8 RD \/ R GUN/);
 const single=await fire(2,['R']);
 assert.deepEqual(single.damage,[16,16]);
 const leftOnly=await loadout(false,true);
 assert.deepEqual(leftOnly.visible,[false,true]);
 assert.deepEqual(leftOnly.plates,[0,intact.plates[1]]);
 assert.ok(leftOnly.armed&&leftOnly.shoots,'An intact left autocannon can fire after right-arm loss');
 assert.match(leftOnly.status,/8 RD \/ L GUN/);
 const leftBurst=await fire(3,['L']);
 assert.deepEqual(leftBurst.damage,[16,16]);
 const disarmed=await loadout(false,false);
 assert.deepEqual(disarmed.visible,[false,false]);
 assert.deepEqual(disarmed.plates,[0,0]);
 assert.ok(!disarmed.armed&&!disarmed.shoots,'Losing both arms disables the autocannons');
 assert.match(disarmed.status,/GUNS OFFLINE/);
 // Keep the disarmed unit on the board for a complete enemy turn.
 await page.evaluate(()=>{captureRandom=()=>1;});
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===5&&!battle.busy,null,{timeout:60000});
 const dispose=await page.evaluate(()=>{
  const {entry,source,observed}=window.reaverFixture;
  const geometries=new Map();
  source.traverse(node=>{
   if(!node.geometry||geometries.has(node.geometry))return;
   geometries.set(node.geometry,0);
   node.geometry.addEventListener('dispose',()=>geometries.set(node.geometry,geometries.get(node.geometry)+1));
  });
  const disarmed=['R','L'].every(side=>!source.getObjectByName('RECOIL_CARRIAGE_'+side).visible);
  IronVowScene.clear();
  return {disarmed,locked:observed.length===0,removed:!entry.m.cont.parent,
   geometries:geometries.size,disposedOnce:[...geometries.values()].every(count=>count===1),contexts:IronVowRenderer.metrics().contexts};
 });
 assert.ok(dispose.disarmed&&dispose.locked&&dispose.removed&&dispose.geometries>0&&dispose.disposedOnce&&dispose.contexts===1,JSON.stringify(dispose));
 return {planted,dual,rightOnly:single,leftOnly:leftBurst,geometries:dispose.geometries};
};
