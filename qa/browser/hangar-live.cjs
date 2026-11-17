const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function checkHangarLive({page,mobile,origin,tap}){
 const ready=()=>page.waitForFunction(()=>IronVowHangarRuntime.scene?.records.filter(r=>r.unit).some(r=>r.rig.object.children.length)&&
  IronVowHangarRuntime.scene.records.filter(r=>r.unit).every(r=>r.rig.object.children.length),null,{timeout:60000});
 const snapshot=()=>page.evaluate(()=>IronVowHangarRuntime.scene.cameraState());
 const goBay=async()=>{await tap('[data-hangar-deck="mechs"]');await ready();};
 const clickHull=async id=>{
  const point=await page.evaluate(id=>{
   const stage=IronVowHangarRuntime.scene,record=stage.records.find(r=>r.unit?.id===id),canvas=document.querySelector('#scene'),rect=canvas.getBoundingClientRect();
   const ndc=record.hit.localToWorld(new THREE.Vector3(0,-1.5,0)).project(stage.camera);
   const x=rect.left+(ndc.x+1)*rect.width/2,y=rect.top+(1-ndc.y)*rect.height/2;
   return {x,y,element:document.elementFromPoint(x,y)?.id};
  },id);
  assert.equal(point.element,'scene',JSON.stringify({id,point}));
  if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 };
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?view=mechs',origin).href,{waitUntil:'domcontentloaded'});
 await ready();
 assert.deepEqual(await page.evaluate(()=>IronVowHangarRuntime.scene.records.map(record=>record.unit.frame)),[0,1,2]);
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 assert.deepEqual(await page.evaluate(()=>{
  const catalog=IronVowHangarCatalog.create();
  return FRAMES.flatMap((frame,id)=>playerHull(id)&&!catalog.supports(id,foundryModel(id))?[frame.name]:[]);
 }),[],'Every player-accessible hull has a production rig in the catalogue');
 assert.equal(await page.locator('#hangar-art').count(),0);
 assert.equal(await page.locator('.hangar-scene-hotspot:visible').count(),3);
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:0})),undefined,'The hangar releases and loads its own assets independently of sorties');
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:0},'hangar')),'ready');
 // Inspect the real neck driver over one selected nine-second look-around cycle.
 const look=await page.evaluate(()=>{
  const stage=IronVowHangarRuntime.scene,record=stage.records.find(r=>r.unit?.id==='seat:0');
  stage.select('seat:0',false,false);
  const necks=[];record.rig.object.traverse(node=>{if(node.name==='neck')necks.push(node);});
  const start=Math.ceil((clock+1)/9)*9,samples=[];
  const renderer=IronVowRenderer.get(),draw=renderer.render;
  try{renderer.render=()=>{};
   for(let i=0;i<=180;i++){
    stage.render(start+i/20,.05,innerWidth,innerHeight);
    samples.push(necks.map(neck=>neck.quaternion.toArray()));
   }
   stage.render(start+9.5,.05,innerWidth,innerHeight);
   const selected=necks.map(neck=>neck.quaternion.clone());
   stage.select('seat:1',false,false);stage.render(start+9.5,.05,innerWidth,innerHeight);
   var selectedDifference=necks.map((neck,index)=>selected[index].angleTo(neck.quaternion));
  }finally{renderer.render=draw;}
  stage.select('seat:0',false,false);
  return {count:necks.length,selectedDifference,change:necks.map((_,index)=>{
   const initial=new THREE.Quaternion().fromArray(samples[0][index]);
   return Math.max(...samples.map(sample=>initial.angleTo(new THREE.Quaternion().fromArray(sample[index]))));
  })};
 });
 assert.ok(look.count>0&&Math.max(...look.change)>.01,'selected live rig neck moves through its look-around cycle');
 assert.ok(Math.max(...look.selectedDifference)>.005,'selected look-around changes the live neck beyond its idle pose');
 // Recreate the same Warden in place on either side of the threshold.
 const originalCondition=await page.evaluate(()=>save.units[0].condition);
 await page.evaluate(()=>{save.units[0].condition=30;render();});await ready();
 const intact=await page.evaluate(()=>{
  const stage=IronVowHangarRuntime.scene,record=stage.records.find(r=>r.unit?.id==='seat:0'),mesh=[];
  record.rig.object.traverse(node=>{if(node.isMesh&&node.material?.userData?.paint)mesh.push([node.name,node.material.color.toArray()]);});
  return {mesh,camera:stage.cameraState(),gantry:Boolean(record.group.getObjectByName('maintenance gantry'))};
 });
 assert.ok(intact.mesh.length>0,'live hull contains painted meshes');
 assert.equal(intact.gantry,false,'30% is above the maintenance threshold');
 await page.evaluate(()=>{save.units[0].condition=29;render();});await ready();
 const damaged=await page.evaluate(()=>{
  const stage=IronVowHangarRuntime.scene,record=stage.records.find(r=>r.unit?.id==='seat:0'),mesh=[];
  record.rig.object.traverse(node=>{if(node.isMesh&&node.userData.base?.userData?.paint)mesh.push([node.name,node.material.color.toArray(),node.userData.base.color.toArray()]);});
  return {mesh,gantry:Boolean(record.group.getObjectByName('maintenance gantry')),camera:stage.cameraState()};
 });
 assert.ok(damaged.gantry,'below 30% adds the maintenance gantry');
 assert.ok(damaged.mesh.every(([name,,base])=>intact.mesh.some(([other,color])=>name===other&&color.every((v,i)=>Math.abs(v-base[i])<1e-6))),
  'same hull retains its underlying paint at both conditions');
 assert.ok(damaged.mesh.length>0&&damaged.mesh.every(([,color,base])=>color.every((v,i)=>Math.abs(v-base[i]*.62)<1e-6)),
  'below 30% changes the actual hull paint to the Foundry scorch material');
 assert.deepEqual(damaged.camera,intact.camera,'condition change keeps the same mech camera');
 await page.evaluate(condition=>{save.units[0].condition=condition;render();},originalCondition);await ready();
 const activity=await page.evaluate(()=>{
  const stage=IronVowHangarRuntime.scene,scene=stage.scene;
  const walking=scene.getObjectByName('walking technician'),consoleWorker=scene.getObjectByName('console technician'),welder=scene.getObjectByName('welding technician');
  const light=scene.children.find(o=>o.isPointLight&&o.position.x===7&&o.position.z===-10);
  const sparks=scene.children.filter(o=>o.isMesh&&o.material?.color?.getHex()===0xd7efff);
  stage.render(0,.05,innerWidth,innerHeight);const first={x:walking.position.x,arm:consoleWorker.children.at(-1).rotation.x,light:light.intensity,visible:sparks.filter(s=>s.visible).length};
  stage.render(1,.05,innerWidth,innerHeight);const second={x:walking.position.x,arm:consoleWorker.children.at(-1).rotation.x,light:light.intensity,visible:sparks.filter(s=>s.visible).length};
  stage.render(4,.05,innerWidth,innerHeight);const off={light:light.intensity,visible:sparks.filter(s=>s.visible).length};
  return {workers:[Boolean(walking),Boolean(consoleWorker),Boolean(welder)],sparks:sparks.length,first,second,off};
 });
 assert.deepEqual(activity.workers,[true,true,true]);assert.equal(activity.sparks,8);
 assert.notEqual(activity.first.x,activity.second.x,'walking technician moves');
 assert.notEqual(activity.first.arm,activity.second.arm,'console technician moves');
 assert.ok(activity.first.light>0&&activity.first.visible===8&&activity.off.light===0&&activity.off.visible===0,'welding sparks and light turn on and off');
 const before=await snapshot();
 await clickHull('seat:1');
 await page.waitForFunction(()=>selected===1&&IronVowHangarRuntime.scene.cameraState()?.position[0]>.3);
 const focused=await snapshot();
 assert.equal(focused.selected,'seat:1');
 assert.ok(focused.position[0]>before.position[0]&&focused.position[0]<9,'Camera eases toward the actual active bay');

 // Compare on-screen projected controls to their real scene anchors before using them.
 await tap('#hangar-overview');
 await page.waitForFunction(()=>Math.abs(IronVowHangarRuntime.scene.camera.position.x)<.35);
 const projections=await page.evaluate(()=>{
  const stage=IronVowHangarRuntime.scene,rect=document.querySelector('#scene').getBoundingClientRect();
  return [...document.querySelectorAll('.hangar-scene-hotspot')].map(button=>{
   const [x,y,z]=stage.destinations[button.dataset.hangarHotspot],screen=new THREE.Vector3(x,y,z).project(stage.camera);
   return Math.hypot(Number.parseFloat(button.style.left)-rect.left-(screen.x+1)*rect.width/2,
    Number.parseFloat(button.style.top)-rect.top-(1-screen.y)*rect.height/2);
  });
 });
 assert.ok(projections.every(error=>error<.1));
 await tap('[data-hangar-hotspot="crew-cabin"]');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.baseRoom),'cabins');
 assert.ok(await page.locator('.base-page').isVisible());
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:0},'hangar')),undefined,'Facility panels do not keep idle mech geometry resident');
 await goBay();
 await tap('[data-hangar-hotspot="ship"]');
 assert.ok(await page.locator('.ship-page').isVisible());
 await goBay();
 await tap('[data-hangar-hotspot="facilities"]');
 assert.ok(await page.locator('.base-page').isVisible());

 await page.evaluate(()=>{
  save.credits+=FRAMES[6].cost+FRAMES[BASTION_FRAME].cost;
  if(!acquireHull(6)||!acquireHull(BASTION_FRAME))throw Error('Test needs two owned reserves');
  (save.ship??={levels:{}}).levels.drop=2;save.reserve[6].condition=29;persist();render();
 });
 await goBay();
 const expanded=await page.evaluate(()=>IronVowHangarRuntime.scene.records.map(r=>[r.unit?.id??null,r.isReserve,r.unit?.condition??null,
  Boolean(r.group.getObjectByName('maintenance gantry'))]));
 assert.deepEqual(expanded,[['seat:0',false,1,false],['seat:1',false,1,false],['seat:2',false,1,false],[null,false,null,false],
  ['reserve:6',true,.29,true],['reserve:10',true,1,false]]);
 const state=await page.evaluate(()=>JSON.stringify({save,selected}));
 const gl=await page.evaluate(()=>{
  const context=IronVowRenderer.get().getContext();
  window.hangarLostContext=context.getExtension('WEBGL_lose_context');
  if(!window.hangarLostContext)return false;
  window.hangarLostContext.loseContext();return true;
 });
 assert.ok(gl,'Chromium exposes actual WebGL context loss');
 await page.waitForFunction(()=>IronVowRenderer.lost);
 await page.evaluate(()=>window.hangarLostContext.restoreContext());
 await page.waitForFunction(()=>!IronVowRenderer.lost&&IronVowRenderer.generation===1,null,{timeout:30000});
 await ready();
 assert.equal(await page.evaluate(()=>JSON.stringify({save,selected})),state,'Context restoration preserves real career and pilot selection');

 if(process.env.IRON_VOW_HANGAR_PROOF&&!mobile){
  const data=await page.screenshot({type:'png'});
  const webp=await page.evaluate(async png=>{
   const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/webp',.88).split(',')[1];
  },data.toString('base64'));
  fs.mkdirSync(process.env.IRON_VOW_HANGAR_PROOF,{recursive:true});
  fs.writeFileSync(path.join(process.env.IRON_VOW_HANGAR_PROOF,'hangar.webp'),webp,'base64');
 }
 await page.evaluate(()=>{
  const record=IronVowHangarRuntime.scene.records.find(r=>r.unit?.frame===0);
  const armor=record.rig.object.getObjectByName('root');
  let geometry;
  armor.traverse(node=>{if(!geometry&&node.geometry)geometry=node.geometry;});
  window.hangarDisposeCount=0;geometry.addEventListener('dispose',()=>window.hangarDisposeCount++);
 });
 await clickHull('reserve:10');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.storedHullCard),'10','Tap opens the exact stored hull');
 assert.equal(await page.evaluate(()=>JSON.stringify({save,selected})),state,'Reserve browsing changes no career data or pilot selection');
 assert.equal(await page.evaluate(()=>IronVowHangarRuntime.scene),null);
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:0},'hangar')),undefined);
 assert.equal(await page.evaluate(()=>window.hangarDisposeCount),1,'Leaving the hangar releases its authored chassis buffer once');
 return {seats:4,reserve:2,contextRestorations:1,contexts:1};
};
