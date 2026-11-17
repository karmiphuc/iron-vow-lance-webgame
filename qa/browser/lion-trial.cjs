const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const reference=require('../fixtures/lion-export.json');
const savedCareer=require('../fixtures/v55-corridor.json');
const gap=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

module.exports=async function checkLionTrial({page,mobile,origin,out}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 const requested=[];
 page.on('request',request=>{if(/lion-(cleaver|hatchet|breaker)-(left|right)\.webp/.test(request.url()))requested.push(request.url());});
 await page.addInitScript(career=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.__stopLionFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
  localStorage.setItem('iron-vow-attack-camera','off');
  localStorage.setItem('iron-vow-career',JSON.stringify(career));
 },savedCareer);
 await page.goto(new URL('?lion=cleaver',origin).href);
 await page.getByRole('heading',{name:'LION WEAPONS TRIAL'}).waitFor();
 await page.waitForFunction(()=>IronVowScene.ready&&IronVowScene.models.get(current().id)?.entry?.m.nativeV2?.authoredStrike('cleaver'),null,{timeout:60000});
 await page.evaluate(()=>window.__stopLionFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{
  const renderer=IronVowRenderer.get();window.__lionRender=renderer.render;renderer.render=(scene,camera)=>{scene.updateMatrixWorld();camera.updateMatrixWorld();};
  requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/60);last=performance.now();requestAnimationFrame(draw);
 });
 const clickAt=({x,y})=>mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
 const click=async selector=>{const box=await page.locator(selector).boundingBox();if(!box)throw Error('Missing trial control '+selector);await clickAt({x:box.x+box.width/2,y:box.y+box.height/2});};
 const ready=async()=>{for(let i=0;i<200;i++){await page.clock.runFor(34);if(await page.evaluate(()=>IronVowScene.ready&&IronVowScene.models.get(current().id)?.entry?.m.nativeV2?.authoredStrike(current().melee)))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Lion live strike did not load');};
 const career=await page.evaluate(()=>localStorage.getItem('iron-vow-career'));
 await page.evaluate(()=>{Math.random=()=>0});
 const summary={};
 for(const id of ['cleaver','hatchet','breaker']){
  await click(`[data-lion-weapon="${id}"]`);await ready();
  await click('#strike');
  const status=await page.evaluate(id=>{
   const unit=current(),foe=battle.units[1],entry=IronVowScene.models.get(unit.id).entry,m=entry.m;
   const target=IronVowScene.models.get(foe.id),native=m.nativeV2,source=native.source;
   const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   const p=IronVowScene.projectWorld(IronVowScene.partPoint(foe));
   if(IronVowScene.pick(p.x,p.y)!==foe)throw Error('Visible practice target failed its actual raycast');
   const origin=IronVowScene.world(foe.x,foe.z),drawn=target.object.getWorldPosition(new THREE.Vector3());
   const proxy=target.proxy.getWorldPosition(new THREE.Vector3());
   const expectedAP=unit.ap-paidAttackAP(unit,meleeWeapon(unit));
   window.lionSamples=[];
   const original=IronVowScene.render,tip=authored('strike.tip.'+id),grip=authored('weapon_socket.L');
   const targetParts=target.entry.m.build.parts;
   const floor=node=>node.getWorldPosition(new THREE.Vector3());
   const local=node=>source.worldToLocal(floor(node)).toArray();
   const weaponMount=entry.secondary.mount;
   function targetDistance(point){
    const triangle=new THREE.Triangle(),candidate=new THREE.Vector3();
    let nearest=Infinity;
    for(const part of ['body','right','left','legs'])for(const {m:mesh} of targetParts[part]){
     if(!mesh.visible||!mesh.geometry)continue;
     const box=new THREE.Box3().setFromObject(mesh);
     if(box.distanceToPoint(point)>nearest)continue;
     const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
     for(let i=0,length=index?.count??position.count;i+2<length;i+=3){
      for(const [offset,vertex] of [triangle.a,triangle.b,triangle.c].entries())vertex.fromBufferAttribute(position,index?index.getX(i+offset):i+offset).applyMatrix4(mesh.matrixWorld);
      const distance=triangle.closestPointToPoint(point,candidate).distanceTo(point);
      if(Number.isFinite(distance))nearest=Math.min(nearest,distance);
     }
    }
    return nearest;
   }
   IronVowScene.render=function(t,dt){
    const result=original.call(this,t,dt);
    const {attack}=unit;if(!attack)return result;
    const time=hitstopTime(unit,t);
    const frame=Number.isFinite(attack.releaseAt)?Math.min(31,18+Math.max(0,time-attack.releaseAt)*24):
     Number.isFinite(attack.fireAt)?Math.min(18,15+Math.max(0,time-attack.fireAt)*24):Math.min(15,Math.max(0,time-attack.start)*24);
    const weaponTip=floor(tip),start=floor(grip),direction=weaponTip.clone().sub(start),length=direction.length();
    const ray=new THREE.Raycaster(start,direction.normalize(),.10,length);
    const clips=ray.intersectObjects(m.build.parts.body.filter(item=>item.m.visible).map(item=>item.m),false).length;
    const points={frame,weapon:entry.secondary.id,meleeTip:local(tip),shoulder:local(authored('shoulder.L')),elbow:local(authored('elbow.L')),wrist:local(authored('wrist.L')),
     left:floor(authored('ankle.L')).toArray(),right:floor(authored('ankle.R')).toArray(),worldTip:weaponTip.toArray(),
     gripError:floor(weaponMount).distanceTo(start),tipError:IronVowScene.attachmentPoint(unit,'meleeTip').distanceTo(weaponTip),clips};
    if(Math.abs(frame-18)<.16&&!window.lionSamples.some(sample=>sample.contactGap!==undefined))points.contactGap=targetDistance(weaponTip);
    window.lionSamples.push(points);
    return result;
   };
   window.lionOriginalRender=original;
   return {p,expectedAP,xy:[unit.x,unit.z,foe.x,foe.z],offset:drawn.clone().sub(origin).toArray(),proxyGap:Math.hypot(drawn.x-proxy.x,drawn.z-proxy.z),
    shown:['cleaver','hatchet','breaker'].filter(gear=>authored('melee.'+gear).visible)};
  },id);
  assert.deepEqual(status.xy,[1,16,2,16]);
  assert.deepEqual(status.shown,[id]);
  assert.ok(status.proxyGap<1e-5&&status.offset[0]<-2.9,JSON.stringify(status));
  await clickAt(status.p);
  await page.clock.runFor(2600);
  const result=await page.evaluate(()=>{
   IronVowScene.render=window.lionOriginalRender;
   return {samples:window.lionSamples,ap:current().ap,busy:battle.busy,damage:200-battle.units[1].hp.body,
    contacts:IronVowScene.combat.history.filter(event=>event.type==='impact'&&event.actor===current().id)};
  });
  assert.ok(!result.busy&&result.ap===status.expectedAP&&result.damage>0&&result.contacts.length===1,id+' uses the real attack and existing AP cost');
  for(const sample of result.samples){
   assert.ok(sample.weapon===id&&sample.gripError<1e-5&&sample.tipError<1e-5,`${id} binds the actual gear and tip throughout the strike`);
  }
  const keyframes=reference.strikes[id].frames;
  let poseError=0;
  for(const frame of [0,6,13,18,22,25,31]){
   const nearest=result.samples.reduce((best,sample)=>!best||Math.abs(sample.frame-frame)<Math.abs(best.frame-frame)?sample:best,null);
   assert.ok(nearest&&Math.abs(nearest.frame-frame)<.6,`${id} renders authored tick ${frame}`);
   for(const part of ['shoulder','elbow','wrist','meleeTip']){
    const i=Math.floor(nearest.frame),t=nearest.frame-i,a=keyframes[i][part],b=keyframes[Math.min(31,i+1)][part];
    const [x,y,z]=a.map((value,index)=>value+(b[index]-value)*t),error=gap(nearest[part],[x,z,-y]);
    poseError=Math.max(poseError,error);
   }
  }
  assert.ok(poseError<.09,`${id} matches the approved authored joints and tip (${poseError})`);
  const rearDrift=Math.max(...result.samples.map(sample=>gap(sample.right,result.samples[0].right)));
  const planted=result.samples.filter(sample=>sample.frame>=13.05&&sample.frame<=24),leadDrift=Math.max(...planted.map(sample=>gap(sample.left,planted[0].left)));
  assert.ok(rearDrift<.002&&leadDrift<.002,`${id} authored plants drifted ${rearDrift} rear / ${leadDrift} lead`);
  const contactSample=result.samples.find(sample=>sample.contactGap!==undefined);
  const contactGap=contactSample?.contactGap;
  assert.ok(contactSample&&gap(result.contacts[0].point,contactSample.worldTip)<.09,`${id} impact effects come from the contact tip`);
  const bodyIntersections=result.samples.filter(sample=>sample.clips>0).length;
  assert.ok(Number.isFinite(contactGap)&&contactGap<.22,`${id} clears to the visible practice target at contact (${contactGap})`);
  assert.equal(bodyIntersections,0,`${id} grip-to-tip segment clears the Lion torso throughout the strike`);
  summary[id]={poseError,rearDrift,leadDrift,contactGap,bodyIntersections,damage:result.damage};
 }
 assert.deepEqual(requested,[],'live trial plays without loading Lion sprite art');
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),career,'trial does not overwrite the career');
 await click('#end');await page.clock.runFor(100);await ready();
 assert.equal(await page.evaluate(()=>battle.units[1].hp.body===200&&current().melee==='breaker'),true);
 await page.evaluate(()=>{IronVowRenderer.get().render=window.__lionRender;});await page.clock.runFor(34);
 if(out&&!mobile){
  fs.mkdirSync(out,{recursive:true});
  const png=await page.screenshot(),encoded=await page.evaluate(async data=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/webp',.88).split(',')[1];
  },png.toString('base64'));
  fs.writeFileSync(join(out,'lion-trial.webp'),encoded,'base64');
 }
 return summary;
};
