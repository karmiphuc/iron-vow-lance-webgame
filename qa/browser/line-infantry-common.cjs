const selectContract=require('./select-contract.cjs');
const ensureContractOffer=require('./contract-fixture.cjs');
const assert=require('node:assert/strict');
const {join}=require('node:path');

async function waitForInfantry(page,frame){
 await page.waitForFunction(frame=>{
  const unit=battle?.units.find(unit=>unit.frame===frame&&unit.team==='enemy');
  const entry=unit&&IronVowScene.models.get(unit.id)?.entry;
  return Boolean(unit&&IronVowScene.ready&&IronVowScene.isLive(unit)&&entry?.m.nativeV2&&entry.primary?.muzzle);
 },frame,{timeout:60000});
}

async function checkInfantry({page,mobile,origin,tap},{contract,frame,name,turns,proof}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name,exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(contract=>{Math.random=()=>0;save.overworld={port:CONTRACTS[contract].id,arrears:0};},contract);
 await ensureContractOffer(page,contract);
 await tap('#nav [data-page="contracts"]');
 await selectContract(page,{template:contract});await tap(`[data-deploy="${contract}"]`);
 await tap('#modal-1');
 await tap('#modal-0');
 await waitForInfantry(page,frame);

 const fit=await page.evaluate(frame=>{
  const unit=battle.units.find(unit=>unit.frame===frame),entry=IronVowScene.models.get(unit.id).entry;
  const {source}=entry.m.nativeV2,{primary}=entry,socket=source.getObjectByName('WEAPON_SOCKET_R');
  const paint=entry.m.build.ownedMaterials.filter(material=>material.userData.paint);
  const material=name=>paint.find(material=>material.name===name);
  const hex=color=>color?.clone().convertLinearToSRGB().getHexString();
  const paints=Object.fromEntries(['paint_primary','paint_secondary','paint_accent'].map(name=>[name,hex(material(name)?.color)]));
  const slots=new Set();
  const weaponMaterials=[];
  socket.traverse(node=>{if(node.isMesh)weaponMaterials.push(node.material.name)});
  source.traverse(node=>{if(node.isMesh)slots.add(node.material.name);});
  window.infantryLaunches=[];
  const combat=IronVowScene.combat,launch=combat.launch;
  combat.launch=function(...args){
   const result=launch.apply(this,args),event=this.history.at(-1);
   if(event?.type==='launch'&&event.actor===unit.id){
    const authored=source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('muzzle.main'));
    const point=authored.getWorldPosition(new THREE.Vector3());
    const direction=new THREE.Vector3(0,0,-1).applyQuaternion(authored.getWorldQuaternion(new THREE.Quaternion()));
    window.infantryLaunches.push({event,authored:point.toArray(),direction:direction.toArray(),
     marker:primary.muzzle.getWorldPosition(new THREE.Vector3()).toArray(),
     resolved:IronVowScene.attachmentPoint(unit,event.socket).toArray(),
     bounds:primary.bounds().distanceToPoint(point)});
   }
   return result;
  };
  return {name:unit.name,contract:battle.contract.id,weapon:unit.weapon,model:FRAMES[frame].model,
   unitPaint:unit.paint.slice(1),unitTrim:unit.trim.s.slice(1),paint:paints,
   paintedWithTextures:paint.every(material=>material.map&&material.normalMap),
   bareWeapon:weaponMaterials.length>0&&weaponMaterials.every(name=>!name.startsWith('paint_')),
   chassisMaterials:slots.size,authoredRifle:socket.visible&&primary.mount.parent===entry.m.rig.arms.R.so};
 },frame);
 assert.equal(fit.name,`${name} 1`);
 assert.equal(fit.contract,contract===0?'picket':'corridor');
 assert.equal(fit.model,contract===0?'LI-01':'LI-02');
 assert.equal(fit.weapon,'rifle');
 assert.equal(fit.paint.paint_primary,fit.unitPaint);
 assert.equal(fit.paint.paint_secondary,fit.unitTrim);
 assert.match(fit.paint.paint_accent,/^[0-9a-f]{6}$/);
 assert.ok(fit.paintedWithTextures&&fit.bareWeapon&&fit.chassisMaterials>=6&&fit.authoredRifle,JSON.stringify(fit));

 for(let turn=1;turn<=turns;turn++){
  await tap('#end');
  if(turn===turns&&proof){
   await page.waitForFunction(frame=>activeCinematic?.actor.frame===frame&&activeCinematic.phase==='fire',frame);
   await page.screenshot({path:join(proof,mobile?`${fit.model}-touch.png`:`${fit.model}-desktop.png`)});
  }
  await page.waitForFunction(turn=>battle?.turn===turn+1&&!battle.busy,turn,{timeout:60000});
 }
 const attack=await page.evaluate(frame=>{
  const unit=battle.units.find(unit=>unit.frame===frame),entry=IronVowScene.models.get(unit.id).entry;
  const damaged=targetParts(current()).some(part=>current().hp[part]<current().max[part]);
  const log=battle.log.some(line=>line.startsWith(`${unit.name} → WARDEN`));
  unit.hp.right=0;
  IronVowScene.render(clock,.016);
  const plates=entry.m.build.parts.right.filter(part=>part.detach);
  const socket=entry.m.nativeV2.source.getObjectByName('WEAPON_SOCKET_R');
  return {launches:window.infantryLaunches,log,damaged,rightState:entry.m.partState.right,
   plates:plates.length,platesVisible:plates.some(part=>part.m.visible),carbineVisible:socket.visible,
   armed:isArmed(unit)};
 },frame);
 assert.ok(attack.log&&attack.damaged,`${fit.model} deals damage on its normal enemy turn`);
 assert.ok(attack.launches.length>0,`${fit.model} fires with an authored carbine`);
 for(const {event,authored,marker,resolved,direction,bounds} of attack.launches){
  const close=(a,b)=>a.every((value,index)=>Math.abs(value-b[index])<1e-5);
  const toward=event.targetPoint.map((value,index)=>value-authored[index]);
  const angle=Math.acos(Math.max(-1,Math.min(1,direction.reduce((sum,value,index)=>sum+value*toward[index],0)/Math.hypot(...toward))));
  assert.equal(event.weapon,'rifle');
  assert.ok(event.mounted&&event.aimError<8*Math.PI/180&&angle<8*Math.PI/180,
   `${fit.model} mounts and aims the actual barrel ${JSON.stringify(event)}`);
  assert.ok(close(event.origin,authored)&&close(event.origin,marker)&&close(event.origin,resolved),
   `${fit.model} launches from its exported muzzle`);
  assert.ok(bounds<.1,`${fit.model} muzzle is on the posed carbine (${bounds})`);
 }
 assert.equal(attack.rightState,2);
 assert.ok(attack.plates>0&&!attack.platesVisible&&!attack.carbineVisible&&!attack.armed,
  `${fit.model} loses its plates and carbine when its firing arm is destroyed`);
 return {launches:attack.launches.length,worstAimDegrees:Math.max(...attack.launches.map(({event})=>event.aimError))*180/Math.PI,detachedPlates:attack.plates};
}

module.exports={waitForInfantry,checkInfantry};
