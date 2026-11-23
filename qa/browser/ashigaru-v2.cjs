const assert=require('node:assert/strict');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
module.exports=async function checkAshigaruV2({page,origin}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 const outcomes=[];
 for(const [range,expected] of [[8,'needle-carbine'],[2,'flechette-scattergun'],[1,'signal-knife']]){
  await page.evaluate(()=>__ironVow.start({seed:4242,contract:0,frames:[0,1,2]}));
  await page.waitForFunction(()=>{const u=battle?.units.find(x=>x.frame===ASHIGARU_FRAME),e=u&&IronVowScene.models.get(u.id)?.entry;return Boolean(IronVowScene.ready&&u&&IronVowScene.isLive(u)&&e?.m.nativeV2&&e.primary&&e.secondary)},null,{timeout:120000});
  if(range===8){
   const gait=await page.evaluate(async()=>{
    const u=battle.units.find(x=>x.frame===ASHIGARU_FRAME),m=IronVowScene.models.get(u.id).entry.m,src=m.nativeV2.source,node=n=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
    battle.cover.clear();const tile=__ironVow.legalMoves(u.id).find(p=>p.cost===1&&p.x===u.x+1&&p.z===u.z);if(!tile)throw Error('No scout gait tile');
    const vertex=new THREE.Vector3();
    function soleHeight(joint){
     // The ankle owns a rigid shoe. A rotated bounding box includes empty corners.
     joint.updateWorldMatrix(true,true);
     let lowest=Infinity;
     joint.traverseVisible(mesh=>{
      const positions=mesh.isMesh&&mesh.geometry.attributes.position;
      if(!positions)return;
      for(let i=0;i<positions.count;i++){
       vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
       lowest=Math.min(lowest,vertex.y);
      }
     });
     if(!Number.isFinite(lowest))throw Error('Scout ankle is missing visible shoe geometry');
     return lowest;
    }
    const samples=[];let moving=true;const record=new Promise(resolve=>{function sample(){if(!moving){resolve();return}if(u.motion)samples.push(m.rig.legs.map((leg,i)=>{const state=m.legs[i],joint=node('ankle.'+leg.side),p=joint.getWorldPosition(new THREE.Vector3()),sole=soleHeight(joint);return {p:p.toArray(),sole,floor:IronVowScene.groundAt(p.x,p.z),ankleHeight:m.dims.ankleH*m.scale,binding:p.distanceTo(leg.an.getWorldPosition(new THREE.Vector3())),goal:p.distanceTo(state.foot),swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()}}));requestAnimationFrame(sample)}requestAnimationFrame(sample)});
    try{await moveUnit(u,tile.x,tile.z)}finally{moving=false}await record;return {samples,py:m.dims.py,ankleH:m.dims.ankleH,frame:u.frame};
   });
   assert.ok(Math.abs(gait.py-3.032)<1e-3&&Math.abs(gait.ankleH-.49)<1e-3,JSON.stringify({py:gait.py,ankleH:gait.ankleH}));
   assert.ok(gait.samples.length>=2&&gait.samples.some(feet=>feet.some(f=>f.swing)),'Scout uses the live gait');let planted=0;
   for(const [i,feet] of gait.samples.entries())for(const [j,f] of feet.entries()){
    assert.ok(f.binding<1e-5&&f.goal<.04&&f.sole>=f.floor-.05,JSON.stringify(f));const prev=gait.samples[i-1]?.[j];
    if(!prev||f.swing||f.settle||prev.swing||prev.settle||distance(f.plant,prev.plant)>1e-5)continue;
    assert.ok(distance(f.p,prev.p)<.004&&Math.abs(f.p[1]-(f.floor+f.ankleHeight))<.04&&Math.abs(f.sole-f.floor)<.12,JSON.stringify(f));planted++;
   }assert.ok(planted>0,'Scout must plant at least one foot');console.log('Scout planted pairs',planted);
  }
  const fixture=await page.evaluate(range=>{
   const u=battle.units.find(x=>x.frame===ASHIGARU_FRAME),a=current(),e=IronVowScene.models.get(u.id).entry,source=e.m.nativeV2.source;
   for(const other of battle.units)if(other!==u&&other!==a){other.alive=false;other.hp.body=0}
   battle.cover.clear();Object.assign(u,{x:8,z:15-range,vx:8,vz:15-range,reacted:true});Object.assign(a,{x:8,z:15,vx:8,vz:15,reacted:true});
   for(const p of ['body','pilot','legs'])a.hp[p]=a.max[p]=10000;ruleRandom=()=>0;
   const node=n=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
   const shown=()=>['carbine','scatter'].filter(n=>node('module.'+n).visible);
   const intact={guns:shown(),knife:node('module.knife').visible,weapon:u.weapon,melee:u.melee};
   u.hp.right=0;IronVowScene.render(clock,.016);const rightLost={guns:shown(),knife:node('module.knife').visible};
   u.hp.right=u.max.right;u.hp.left=0;IronVowScene.render(clock,.016);const leftLost={guns:shown(),knife:node('module.knife').visible};
   u.hp.left=u.max.left;IronVowScene.render(clock,.016);
   const combat=IronVowScene.combat,launch=combat.launch,landed=combat.landed,events=[];
   combat.launch=function(...args){const result=launch.apply(this,args),event=this.history.at(-1);if(event?.type==='launch'&&event.actor===u.id){
    const e=IronVowScene.models.get(u.id).entry,gun=e.primary,id=event.weapon==='flechette-scattergun'?'scatter':'carbine',marker=node('muzzle.'+id);
    events.push({kind:'launch',weapon:event.weapon,origin:event.origin,expected:event.expectedOrigin,actual:marker.getWorldPosition(new THREE.Vector3()).toArray(),aim:event.aimError,mounted:event.mounted,guns:shown(),bounds:gun.bounds().distanceToPoint(marker.getWorldPosition(new THREE.Vector3()))});
   }return result;};
   combat.landed=function(...args){const result=landed.apply(this,args);if(args[0]===u){const e=IronVowScene.models.get(u.id).entry,p=e.secondary.tip.getWorldPosition(new THREE.Vector3()),tip=node('tip.knife');events.push({kind:'impact',weapon:args[2].id,damage:args[3].damage,tipError:p.distanceTo(tip.getWorldPosition(new THREE.Vector3())),bounds:e.secondary.bounds().distanceToPoint(p)});}return result;};
   window.__scoutFixture={u,a,e,events};return {intact,rightLost,leftLost};
  },range);
  assert.deepEqual(fixture.intact,{guns:['carbine'],knife:true,weapon:'needle-carbine',melee:'signal-knife'});
  assert.deepEqual(fixture.rightLost,{guns:[],knife:true});assert.deepEqual(fixture.leftLost,{guns:['carbine'],knife:false});
  await page.evaluate(()=>endTurn());await page.waitForFunction(()=>battle?.turn===2&&!battle.busy,null,{timeout:120000});
  const result=await page.evaluate(()=>({events:window.__scoutFixture.events,range:distance(window.__scoutFixture.u,window.__scoutFixture.a)}));
  const events=result.events.filter(e=>e.weapon===expected);assert.ok(events.length>0,JSON.stringify({expected,result}));
  for(const event of events){
   if(event.kind==='launch'){
    assert.deepEqual(event.guns,[expected==='flechette-scattergun'?'scatter':'carbine']);
    assert.ok(event.mounted&&event.aim<8*Math.PI/180&&distance(event.origin,event.actual)<1e-5&&distance(event.expected,event.actual)<1e-5&&event.bounds<.18,JSON.stringify(event));
   }else if(expected==='signal-knife')assert.ok(event.damage>0&&event.tipError<1e-5&&event.bounds<.18,JSON.stringify(event));
  }
  outcomes.push({range,expected,events:events.length});
 }
 const disposal=await page.evaluate(()=>{
  const {e}=window.__scoutFixture,geometries=new Map();e.m.nativeV2.source.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry)){geometries.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>geometries.set(o.geometry,geometries.get(o.geometry)+1));}});
  IronVowScene.clear();return {removed:!e.m.cont.parent,count:geometries.size,once:[...geometries.values()].every(n=>n===1),contexts:IronVowRenderer.metrics().contexts};
 });
 assert.ok(disposal.removed&&disposal.count>0&&disposal.once&&disposal.contexts===1,JSON.stringify(disposal));
 console.log('PASS Ashigaru live source guns, knife, arm loss, range-based combat and disposal');return outcomes;
};
