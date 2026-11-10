// Live painted Warden: an exact re-rig of the authored GLB on the Foundry skeleton, planted gait, carry and firing
// poses without armour clipping, three melee families, field framing, and the game's live/baked routing.
// Runs the shipped rig code under Node with a stub 2D canvas; no QA packages are required.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const create=require('./sim-harness.cjs');

const dist=join(__dirname,'../dist');
function context2d(width,height){
 const noop=()=>{},gradient={addColorStop:noop};
 const pixels=(w,h,fill)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(fill)});
 return new Proxy({canvas:{width,height},createImageData:(w,h)=>pixels(w,h,0),getImageData:(x,y,w,h)=>pixels(w,h,255),
  createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:10})},
  {get:(target,key)=>key in target?target[key]:noop,set:(target,key,value)=>(target[key]=value,true)});
}
globalThis.window=globalThis;globalThis.self=globalThis;
globalThis.document={createElement:()=>{const c={width:1,height:1,style:{}};c.getContext=()=>context2d(c.width,c.height);return c;}};
for(const file of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','foundry/production-arsenal.js',
 'foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js','foundry/warden-live.js'])
 vm.runInThisContext(readFileSync(join(dist,file),'utf8'),{filename:file});
const T=THREE,R=window.IronVowFoundryRig,W=window.IronVowWardenRig,A=window.IronVowProductionArsenal,V3=R.V3,dt=1/60;
const buffer=file=>{const b=readFileSync(join(dist,file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
const motion=JSON.parse(readFileSync(join(dist,'rig-bench/warden-painted-motion.json'),'utf8'));

async function main(){
 await W.load(buffer('rig-bench/warden-painted.glb'),motion);
 const armory=await A.load(buffer('rig-bench/weapons.glb'));
 const world=o=>o.getWorldPosition(V3());

 // 1. The re-rig is exact: every armour part sits where the authored GLB puts it in the bind stance.
 {
  const gltf=await new Promise((ok,no)=>new T.GLTFLoader().parse(buffer('rig-bench/warden-painted.glb'),'',ok,no));
  const authored=gltf.scene.getObjectByName('Painted_Warden');
  for(const [name,values] of Object.entries(motion.Aim.nodes)){const o=authored.getObjectByName(name);
   o.position.fromArray(values,0);o.quaternion.fromArray(values,3);o.scale.fromArray(values,7);}
  authored.updateMatrixWorld(true);
  const centres=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(new T.Box3().setFromObject(o).getCenter(V3()))});return out;};
  const bound=W.build('ally',null,{keepBind:true,scale:1,authoredElbows:true});bound.cont.updateMatrixWorld(true);
  const a=centres(authored),b=centres(bound.cont);
  assert.equal(b.length,a.length,'every authored Warden part is re-rigged');
  const unmatched=a.filter(p=>!b.some(q=>q.distanceTo(p)<.001));
  assert.equal(unmatched.length,0,`${unmatched.length} Warden parts moved during the re-rig`);
 }

 // 1b. The authored elbows bend ~25 degrees sideways; the live rig folds that into the forward hinge so each hand
 //     armour stays on its weapon socket in every pose.
 {
  const m=W.build('ally',null);m.cont.updateMatrixWorld(true);
  for(const side of ['L','R']){
   const arm=m.rig.arms[side],hand=new T.Box3();
   for(const o of arm.wr.children)if(o.isMesh)hand.expandByObject(o);
   assert.ok(hand.expandByScalar(.05).containsPoint(world(arm.so)),`Warden ${side} hand armour has left its weapon socket`);
  }
 }

 const make=(offhand,melee='cleaver')=>{
  const m=W.build('ally',null);m.offhand=offhand;
  m.primaryWeapon=A.mount(armory,'rifle',m.rig.arms.R.so);m.primaryWeapon.model.scale.setScalar(.62);
  if(offhand==='blade'){m.blade=A.mount(armory,melee,m.rig.arms.L.so);m.blade.model.scale.setScalar(.62);W.meleeStyle(m,melee);}
  return m;
 };
 let t=0;
 const step=(m,frames,input={},each)=>{for(let i=0;i<frames;i++){t+=dt;
  R.animateMech(m,{pos:V3(),face:0,heading:0,alive:true,brace:0,noPlant:true,...input},dt,t);W.afterAnimate(m);each&&each(i);}};
 // Points of the rifle mesh inside the pauldrons or head (local boxes shrunk by 3 cm).
 const clipping=m=>{
  m.cont.updateMatrixWorld(true);
  const boxes=[m.rig.arms.R.paul,m.rig.arms.L.paul,m.rig.neck].map(group=>{
   const box=new T.Box3(),inverse=new T.Matrix4().copy(group.matrixWorld).invert();
   group.traverse(o=>{if(o.isMesh&&o.parent===group){o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));}});
   return {box:box.expandByScalar(-.03),inverse};
  });
  let inside=0;
  m.primaryWeapon.model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i+=5){const v=V3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
    if(boxes.some(({box,inverse})=>box.containsPoint(v.clone().applyMatrix4(inverse))))inside++;}});
  return inside;
 };
 const onRifle=m=>{m.cont.updateMatrixWorld(true);
  const base=world(m.rig.arms.R.so),muzzle=world(m.primaryWeapon.muzzle),hand=world(m.rig.arms.L.so),axis=muzzle.clone().sub(base);
  const along=Math.max(0,Math.min(1,hand.clone().sub(base).dot(axis)/axis.lengthSq()));
  return {off:hand.distanceTo(base.clone().addScaledVector(axis,along)),along,axis:axis.normalize(),muzzle};};

 // 2. Walking: planted feet stay put, swing feet reach their IK goals, and the free hand stays on the rifle.
 {
  const m=make('free'),face=-.76,forward=V3(Math.sin(face),0,Math.cos(face));
  step(m,40,{face,heading:face});
  const previous=m.rig.legs.map(()=>null);let slide=0,error=0,offRifle=0,distance=0;
  for(let i=0;i<240;i++){t+=dt;distance+=2.6*dt;
   R.animateMech(m,{pos:forward.clone().multiplyScalar(distance),face,heading:face,moving:true,speed:2.6,stepLen:1.55,alive:true,brace:0},dt,t);
   W.afterAnimate(m);m.cont.updateMatrixWorld(true);
   m.rig.legs.forEach((leg,k)=>{const ankle=world(leg.an),state=m.legs[k];error=Math.max(error,ankle.distanceTo(state.foot));
    if(state.swing){previous[k]=null;return;}
    if(previous[k])slide=Math.max(slide,Math.hypot(ankle.x-previous[k].x,ankle.z-previous[k].z));previous[k]=ankle;});
   if(i>60)offRifle=Math.max(offRifle,onRifle(m).off);
  }
  assert.ok(slide<.001,`Warden planted foot slides ${(slide*1000).toFixed(1)} mm per frame`);
  assert.ok(error<.01,`Warden foot misses its IK goal by ${error.toFixed(3)} m`);
  assert.ok(offRifle<.03,`Warden's free hand leaves the rifle by ${offRifle.toFixed(3)} m while walking`);
 }

 // 3. Blade-hand guards keep the rifle clear of the armour; firing with a free hand leads with the left foot,
 //    lifts the right pauldron, puts the left hand on the under-barrel and holds an exact aim through recoil.
 for(const style of [0,1,2]){
  const m=make('blade');m.carryStyle=style;m.carryMoving=false;step(m,90);m.carryStyle=style;
  assert.equal(clipping(m),0,`Warden guard ${style} drives the rifle into its armour`);
  const hand=new T.Box3();for(const o of m.rig.arms.L.wr.children)if(o.isMesh)hand.expandByObject(o);
  assert.ok(hand.expandByScalar(.05).containsPoint(world(m.rig.arms.L.so)),`Warden guard ${style} hand lets go of its weapon`);
 }
 {
  const m=make('free');m.aim.point.set(0,4*1.415,20);let worst=0,gripOff=0;
  step(m,20);
  step(m,80,{ready:true},()=>{m.aim.until=t+.05;worst=Math.max(worst,clipping(m));});
  const grip=onRifle(m),error=grip.axis.angleTo(m.aim.point.clone().sub(grip.muzzle).normalize());
  const [lead,trail]=m.rig.legs.map(leg=>world(leg.an));
  assert.ok(lead.z-trail.z>.9,`Warden's left foot leads by only ${(lead.z-trail.z).toFixed(2)} m when firing`);
  assert.ok(grip.off<.03&&grip.along>.3,`Warden's left hand is ${grip.off.toFixed(2)} m off the rifle at ${grip.along.toFixed(2)}`);
  assert.ok(error<.026,`Warden's shouldered rifle misses its aim by ${(error*57.3).toFixed(1)} degrees`);
  m.recoil=.7;step(m,20,{ready:true},()=>{m.aim.until=t+.05;worst=Math.max(worst,clipping(m));gripOff=Math.max(gripOff,onRifle(m).off);});
  step(m,90,{},()=>{worst=Math.max(worst,clipping(m));});
  assert.equal(worst,0,'Warden firing stance drives the rifle into its armour');
  assert.ok(gripOff<.05,'Warden keeps the barrel through recoil');
  assert.ok(!m.fireStance&&m.fireStep<.05,'Warden leaves its firing stance after the shot');
 }

 // 4. Melee families: maul overhead then down in front, sweep raised then out in front, thrust cocked then extended.
 for(const [weapon,family] of [['breaker','maul'],['cleaver','sweep'],['piledriver','thrust']]){
  const m=make('blade',weapon);
  assert.equal(W.MELEE_FAMILY[weapon],family);
  const at=age=>{m.melee={age,thrust:false};step(m,3);m.cont.updateMatrixWorld(true);
   return {tip:world(m.blade.tip||m.blade.muzzle||m.blade.mount),shoulder:world(m.rig.arms.L.sh),head:world(m.rig.neck)};};
  const wind=at(R.MEL.wind),hit=at(R.MEL.hit);m.melee=null;
  if(family!=='thrust')assert.ok(wind.tip.y>wind.head.y,`Warden ${family} raises the ${weapon} above its head`);
  assert.ok(hit.tip.z>hit.shoulder.z+1.2,`Warden ${family} reaches forward with the ${weapon} at contact`);
  if(family==='maul')assert.ok(hit.tip.y<hit.shoulder.y-1,'Warden maul drives the head down in front');
 }

 // 5. Field framing: the renderer's tall Warden frame (1.3 x span 11.2, elevation .46, ground mapped to .84) keeps
 //    every guard and every maul swing inside the surface.
 {
  const tall=1.3,span=11.2*tall,camera=new T.OrthographicCamera(-span/2,span/2,span/2,-span/2,.1,100);
  camera.position.set(0,Math.sin(.46)*25+3.55,Math.cos(.46)*25);camera.lookAt(0,3.55,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const offset=(.84-(1-tall)/2)/tall-(.5-V3().project(camera).y*.5);
  const highest=m=>{m.cont.updateMatrixWorld(true);let top=Infinity;
   m.cont.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i+=3){const v=V3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);top=Math.min(top,.5-v.y*.5+offset);}});
   return top;};
  for(const style of [0,1,2]){
   const m=make('blade','breaker');m.carryStyle=style;m.carryMoving=false;step(m,90);m.carryStyle=style;
   assert.ok(highest(m)>0,`Warden guard ${style} leaves the field surface`);
   for(let p=0;p<=1;p+=.05){m.melee={age:p*R.MEL.end,thrust:false};step(m,1);assert.ok(highest(m)>0,'Warden maul leaves the field surface');}
  }
 }

 // 6. Game routing: a standing Warden draws live once the rig is ready, keeps the baked art otherwise and on death.
 {
  const {run}=create({foundry:true,travel:true});
  run('createBattle(0,false,false,[0]);globalThis.ally=battle.units.find(u=>u.team==="ally"&&u.frame===0)');
  assert.equal(run('Boolean(ally)'),true,'the opening lance fields a Warden');
  run('window.IronVowFoundry={wardenReady:()=>globalThis.wardenReady,draw:(u,t,pose,scope,model,custom)=>({surface:{},anchors:{body:[.5,.5]},primary:{},secondary:{},custom})}');
  run('globalThis.wardenReady=false');
  assert.equal(run('foundryRender(ally,clock)'),null,'baked Warden until the live rig is ready');
  run('globalThis.wardenReady=true');
  assert.equal(run('foundryRender(ally,clock)?.custom'),'warden','live Warden once ready');
  assert.ok(Math.abs(run('unitBounds(ally).w/scale')-11.2/3.65)<1e-9,'live Warden uses the shared Foundry world scale');
  run('ally.alive=false');
  assert.equal(run('foundryRender(ally,clock)'),null,'a destroyed Warden returns to its baked destruction');
 }
}

main().then(()=>console.log('PASS live Warden: exact re-rig, planted gait, two-hand carry, clear guards, left-foot firing stance, maul/sweep/thrust, field framing and live/baked routing'))
 .catch(error=>{console.error(error);process.exitCode=1;});
