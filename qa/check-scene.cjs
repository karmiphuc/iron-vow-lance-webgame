/* Seeded campaign commands, real runtime bones, 30 Hz controlled clock. GPU captures run separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const url=process.env.IRON_VOW_URL||'http://127.0.0.1:5176/';
const rasterPair=process.env.IRON_VOW_SCENE_RASTER_PAIR==='1',cpuRaster=process.env.IRON_VOW_SCENE_CPU_RASTER==='1',skipProbes=process.env.IRON_VOW_SCENE_SKIP_PROBES==='1';
const count=rasterPair?2:Number(process.env.IRON_VOW_SCENE_BATTLES||30),out=path.resolve(process.env.IRON_VOW_SCENE_REPORT||'scene-report.json');
const startIndex=Number(process.env.IRON_VOW_SCENE_START_INDEX||0);
const combatGate=process.env.IRON_VOW_SCENE_COMBAT==='1',formal=process.env.IRON_VOW_SCENE_FORMAL==='1'||count>=30;
const live=[0,5,6,7,8,9,10,12];
(async()=>{
 const tileOverride=process.env.IRON_VOW_SCENE_TILE?Number(process.env.IRON_VOW_SCENE_TILE):null;
 const root=path.resolve(__dirname,'..'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const source={commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),distDirty:Boolean(git('status','--porcelain','--','dist')),checkerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')};
 if(formal){assert.equal(rasterPair,false,'Formal shards do not repeat seeds');assert.equal(skipProbes,false,'The formal soak includes all negative controls');assert.equal(source.distDirty,false,'The formal soak requires committed, immutable application source');assert.equal(tileOverride,null,'The formal soak tests the production pitch');}
 const report={schema:2,url,source,combatGate,formal,cpuRaster,rasterPair,skipProbes,rasterPolicy:'Optional CPU mode omits paints only into the main output canvas and temporary-body output canvases after their real alpha bounds/readiness are measured. Transforms, metrics, decoding, source masks, scratch canvases, readbacks and all geometry/anchor updates remain active. Paired mode compares identical seeded command, result and combat-event streams.',clockHz:30,tileOverride,renderPolicy:'First scene rendered at 0.5 DPR for software-GL correctness; subsequent bone soak skips unobserved GPU submissions and render-target readbacks. No performance claim.',overlapPolicy:'Reference 80% footprint radii, actual ankle-mesh footprint hulls with the same margin, and actual cover bounds with the reference half-radius margin.',battles:[],faultProbes:[],errors:[]};
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1024},deviceScaleFactor:.5});
  if(tileOverride)await page.route(/\/(scene\/battle|scene\/environment)\.js/,async route=>{
   const response=await route.fetch(),source=await response.text();assert.ok(/TILE=3\.4/.test(source),'Candidate tile override must match the reference pitch');
   await route.fulfill({response,body:source.replace('TILE=3.4','TILE='+tileOverride)});
  });
  await page.addInitScript(()=>{
   const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
   const get=HTMLCanvasElement.prototype.getContext,contexts=new Set();window.__sceneWebglContexts=0;
   HTMLCanvasElement.prototype.getContext=function(type,...args){const result=get.call(this,type,...args);if(/webgl/.test(type)&&result){contexts.add(result);window.__sceneWebglContexts=contexts.size;}return result;};
   window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
   window.__qaStopNativeFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
  });
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.setDefaultTimeout(120000);await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
  for(const frames of [[0,5,6],[7,8,9],[10,12,0]]){
   await page.evaluate(frames=>__ironVow.start({seed:4242,frames}),frames);
   await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
   await page.evaluate(()=>{IronVowRenderer.get().render=()=>{};IronVowRenderer.get().readRenderTargetPixels=()=>{};});
  }
  assert.equal(await page.evaluate(()=>__sceneWebglContexts),1,'One actual WebGL context across all eight frames and previews');
  await page.evaluate(()=>__qaStopNativeFrames());
  const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
  await page.evaluate(()=>{
   // No mock bones or animation inputs. Only discard the unobserved GPU submission in this CPU correctness run.
   const renderer=IronVowRenderer.get();renderer.render=()=>{};renderer.readRenderTargetPixels=()=>{};
   window.__qa={ticks:0,anomalies:[],keys:new Set(),feet:new Map(),motion:new Map(),frames:new Set(),weapons:new Set(),commands:[],commandErrors:[],circleCandidates:0,combatSeen:0,objects:new Map(),combatCounts:{}};
   // Read real pivot geometry at firing calls, without changing source or manufacturing FX records.
   const aimMounted=IronVowFoundry.aimMounted;
   IronVowFoundry.aimMounted=function(m,weapon,target,weight,node){
    if(weapon?.muzzle&&weight>0&&__qa.aimClearance){
     m.cont.updateMatrixWorld(true);const pivot=(node||m.rig.arms.R.wr).getWorldPosition(new THREE.Vector3()),muzzle=weapon.muzzle.getWorldPosition(new THREE.Vector3()),line=weapon.muzzle.getWorldDirection(new THREE.Vector3()),offset=muzzle.clone().sub(pivot),desired=target.clone().sub(pivot);
     const along=offset.dot(line),lateralSq=Math.max(0,offset.lengthSq()-along*along),discriminant=desired.lengthSq()-lateralSq,travel=Math.sqrt(Math.max(0,discriminant))-along,q=__qa.aimClearance;
     q.calls++;q.minimumDiscriminant=q.minimumDiscriminant===null?discriminant:Math.min(q.minimumDiscriminant,discriminant);q.minimumTravel=q.minimumTravel===null?travel:Math.min(q.minimumTravel,travel);
     if(discriminant<0||travel<0){q.infeasibleCount++;if(q.samples.length<20){const actor=[...IronVowScene.models].find(([,r])=>r.entry?.m===m)?.[0];q.samples.push({time:clock,actor,physicalAsset:weapon.id,discriminant,travel,pivot:pivot.toArray(),muzzle:muzzle.toArray(),axis:line.toArray(),target:target.toArray()});}}
    }
    return aimMounted.call(this,m,weapon,target,weight,node);
   };
   const hull=points=>{
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lower=[],upper=[];
    for(const point of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
    for(const point of p.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
    return lower.slice(0,-1).concat(upper.slice(0,-1));
   };
   const overlaps=(a,b)=>{
    const polygon=u=>hull(u.footprint.map(p=>[u.root[0]+(p[0]-u.root[0])*.8,u.root[2]+(p[1]-u.root[2])*.8])),A=polygon(a),B=polygon(b);
    if(A.length<3||B.length<3)throw Error('A live rig has no measurable foot geometry');
    for(const P of [A,B])for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],axis=[q[1]-p[1],p[0]-q[0]],length=Math.hypot(...axis);axis[0]/=length;axis[1]/=length;
     const x=A.map(v=>v[0]*axis[0]+v[1]*axis[1]),y=B.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.min(Math.max(...x),Math.max(...y))-Math.max(Math.min(...x),Math.min(...y))<=.01)return false;
    }return true;
   };
   const rasterContexts=new WeakSet();
   const omitRaster=context=>{if(!context||rasterContexts.has(context))return;rasterContexts.add(context);__qa.rasterContexts++;
    // Keep transforms, text metrics, source masks, image decoding and every readback intact.
    // Only discard paints into already-measured output canvases. Scratch canvases are untouched.
    for(const name of ['drawImage','fill','stroke','fillRect','strokeRect','clearRect','fillText','strokeText','putImageData'])context[name]=()=>{__qa.rasterOmitted++;};
   };
   const afterFrame=()=>{if(__qa.cpuRaster){omitRaster(ctx);for(const [id,record] of IronVowScene.models){const canvas=record.object?.material?.map?.image;
    if(canvas instanceof HTMLCanvasElement&&IronVowBillboards.ready(id)&&IronVowBillboards.bounds(id,IronVowScene.camera))omitRaster(canvas.getContext('2d'));
   }}
    const s=__ironVow.snapshot(),q=__qa;q.ticks++;const lower=s.size&&IronVowScene.world(-.5,-.5),upper=s.size&&IronVowScene.world(s.size.width-.5,s.size.depth-.5);
    const fail=(type,u,detail)=>{const key=type+'|'+u.id;if(q.keys.has(key))return;q.keys.add(key);q.anomalies.push({type,unit:u.id,frame:u.frame,time:s.time,detail});};
    for(const u of s.units.filter(u=>u.live)){
     q.frames.add(u.frame);
     if(!u.finite||![u.vx,u.vz,...(u.root||[]),...(u.matrix||[])].every(Number.isFinite))fail('nan',u,'non-finite unit or bone matrix');
     if(u.vx<-.5||u.vz<-.5||u.vx>s.size.width-.5||u.vz>s.size.depth-.5||u.root[0]<lower.x||u.root[0]>upper.x||u.root[2]<lower.z||u.root[2]>upper.z)fail('bounds',u,{logical:[u.vx,u.vz],root:u.root});
     if(u.alive)for(const f of u.feet){
      const key=u.id+'/'+f.side,planted=!f.swing&&!f.settle&&!u.motion?.jumpjet,previous=q.feet.get(key),error=f.ankle[1]-f.ground-f.ankleHeight;
      const m=IronVowScene.models.get(u.id)?.entry?.m,legIndex=m?.rig.legs.findIndex(l=>l.side===f.side),poseLift=Boolean(m?.legs[legIndex]?.poseLift);
      if(Math.hypot(...f.hip.map((n,i)=>n-f.ankle[i]))>f.reach+.01||!poseLift&&(Math.hypot(...f.ankle.map((n,i)=>n-f.target[i]))>.02||Math.hypot(...f.hip.map((n,i)=>n-f.target[i]))>f.reach+.01))fail('ikReach',u,{side:f.side,poseLift,ankle:f.ankle,hip:f.hip,target:f.target,reach:f.reach,kneeContact:f.kneeContact,moving:u.moving,attacking:u.attacking});
      if(planted&&Math.abs(error)>.15)fail('footGround',u,{side:f.side,error,ankle:f.ankle,goal:f.target,moving:u.moving,attacking:u.attacking});
      if(f.kneeContact&&Math.abs(f.kneeContact.point[1]-f.kneeContact.ground)>.15)fail('footGround',u,{side:f.side,kneeContact:f.kneeContact});
      if(planted&&previous){const drift=Math.hypot(f.ankle[0]-previous[0],f.ankle[2]-previous[2]);if(drift>.3)fail('footSlide',u,{side:f.side,drift,moving:u.moving,attacking:u.attacking,previous,foot:f});}
      if(planted){if(!previous)q.feet.set(key,f.ankle);}else q.feet.delete(key);
     }
     if(q.combatGate){
      if(!u.alive&&u.attacking)fail('wreckActs',u,'dead actor retains an active attack');
      if(u.muzzleDistance!==null&&u.muzzleDistance>.3)fail('muzzleFar',u,u.muzzleDistance);
      for(const [part,hp] of Object.entries(u.hp))if(!Number.isFinite(hp)||hp<0||hp>u.max[part])fail('hpRange',u,{part,hp,max:u.max[part]});
      const oldObject=q.objects.get(u.id);if(oldObject&&oldObject!==u.object)fail('popSwap',u,{before:oldObject,after:u.object});q.objects.set(u.id,u.object);
      if(u.armed){const profile=IronVowWeaponFX.get(u.weapon);if(profile.asset&&!u.weaponMounted)fail('weaponMount',u,{weapon:u.weapon,asset:u.primaryAsset});}
      for(const [part,v] of Object.entries(u.partVisual||{})){const want=u.hp[part]<=0?2:u.hp[part]<u.max[part]/2?1:0;
       if(v.state!==want||want===2&&v.visible>0)fail('partVisual',u,{part,want,visual:v});}
     }
     const prior=q.motion.get(u.id);
     if(u.moving&&u.alive){if(!prior||Math.hypot(u.root[0]-prior.x,u.root[2]-prior.z)>1)q.motion.set(u.id,{x:u.root[0],z:u.root[2],time:s.time});
      else if(s.time-prior.time>4)fail('stuck',u,'wanted to move for more than 4 seconds without crossing 1 metre');
     }else q.motion.delete(u.id);
    }
    if(q.combatGate)for(const e of IronVowScene.combat?.history||[]){if(e.sequence<=q.combatSeen)continue;q.combatSeen=e.sequence;q.combatCounts[e.type]=(q.combatCounts[e.type]||0)+1;if(q.combatTrace)q.combatTrace.push(Object.fromEntries(['type','actor','target','weapon','index','socket','planned','damage','before','after','shield'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])));
     const u=s.units.find(u=>u.id===e.actor);if(!u?.live)continue;
     if((e.type==='launch'||e.type==='impact')&&!e.actorAlive)fail('wreckActs',u,e);
     if(e.type==='launch'){
      if(e.archetype!=='missile')q.maximumLaunchAimError=Math.max(q.maximumLaunchAimError||0,e.aimError||0);
      if(!e.mounted)fail('weaponMount',u,e);
      if(e.archetype!=='missile'&&(e.aimError==null||e.aimError>.12))fail('aimOff',u,e);
      if(e.expectedOrigin&&Math.hypot(...e.origin.map((n,i)=>n-e.expectedOrigin[i]))>.3)fail('muzzleFar',u,e);
     }
     if(e.type==='impact'){
      if(e.damage!==e.before-e.after||e.before>0&&e.planned>0&&e.damage<=0)fail('noDamage',u,e);
      if(e.before<=0&&e.damage>0)fail('deadPartDamage',u,e);
     }
    }
    const units=s.units.filter(u=>u.live&&u.alive&&u.root);
    for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
     const a=units[i],b=units[j],d=Math.hypot(a.root[0]-b.root[0],a.root[2]-b.root[2]);
     if(d<(a.radius+b.radius)*.8){q.circleCandidates++;fail('overlap',a,{other:b.id,distance:d,threshold:(a.radius+b.radius)*.8,source:'reference footprint radii'});}
     if(overlaps(a,b))fail('overlap',a,{other:b.id,distance:d,footprintA:a.footprint,footprintB:b.footprint});
    }
    for(const u of units)for(const cover of s.covers){const x=Math.max(cover.min[0],Math.min(cover.max[0],u.root[0])),z=Math.max(cover.min[2],Math.min(cover.max[2],u.root[2]));
     if(Math.hypot(u.root[0]-x,u.root[2]-z)<u.radius*.5)fail('overlap',u,{source:'cover',cover});
    }
   };
   window.__qa.observe=afterFrame;
   const schedule=fn=>{const id=setTimeout(()=>{fn(performance.now());if(fn===draw)afterFrame();},1000/30);if(fn===draw)window.__qaFrameTimer=id;return id;};
   window.requestAnimationFrame=schedule;
   schedule(draw);
  });
  // Validate the observer against real bone/state corruption in separate disposable scenes.
  // These anomalies are evidence that the checks work, never part of the ordinary campaign result.
  for(const type of skipProbes?[]:['nan','footGround','footSlide','bounds','overlap','stuck','ikReach']){
   await page.evaluate(()=>{__ironVow.start({seed:4242,frames:[5,8,0]});});await page.clock.runFor(100);
   const probe=await page.evaluate(type=>{
    const q=__qa;q.anomalies=[];q.keys.clear();q.feet.clear();q.motion.clear();
    if(type==='stuck'){battle.cover.clear();for(const cell of battle.field.cells)cell.level=0;IronVowScene.clear();IronVowScene.render(clock,1);}
    const u=battle.units.find(u=>u.id==='ally0'),m=IronVowScene.models.get(u.id).entry.m;
    const shift=(node,delta)=>{const p=node.getWorldPosition(new THREE.Vector3()).add(delta);node.position.copy(node.parent.worldToLocal(p));m.cont.updateMatrixWorld(true);};
    if(type==='nan'){m.rig.arms.L.so.position.x=NaN;m.cont.updateMatrixWorld(true);}
    if(type==='footGround'||type==='footSlide'){
     const leg=m.rig.legs[0],state=m.legs[0];state.swing=false;state.poseLift=false;state.settle=null;
     q.observe();shift(leg.an,new THREE.Vector3(type==='footSlide'?.6:0,type==='footGround'?.8:0,0));
    }
    if(type==='ikReach'){shift(m.rig.legs[0].an,new THREE.Vector3(0,0,.1));}
    if(type==='bounds'){m.cont.position.x=IronVowScene.world(battle.size.width+1,u.z).x;m.cont.updateMatrixWorld(true);}
    if(type==='overlap'){
     const other=battle.units.find(v=>v.id==='ally1'),object=IronVowScene.models.get(other.id).object;
     other.x=other.vx=u.x;other.z=other.vz=u.z;object.position.copy(m.cont.position);object.updateMatrixWorld(true);
    }
    if(type==='stuck'){
     // A five-tile Valkyrie move really lasts longer than the four-second limit.
     const moves=__ironVow.legalMoves(u.id).map(p=>({...p,steps:route(u,p.x,p.z)}));
     const move=moves.filter(p=>p.steps.length>=5&&(p.x===u.x||p.z===u.z)).sort((a,b)=>b.steps.length-a.steps.length)[0];
     if(!move)throw Error('No long legal movement fixture');
     void __ironVow.move(u.id,move.x,move.z);
     return{type,move,id:u.id,root:m.cont.position.toArray()};
    }
    q.observe();return{type,anomalies:q.anomalies};
   },type);
   if(type==='stuck'){
    await page.clock.runFor(34);
    await page.evaluate(p=>{const object=IronVowScene.models.get(p.id).object,position=object.position,set=position.set.bind(position);window.__qaRestorePosition=()=>{position.set=set;};position.set=()=>set(...p.root);},probe);
    await page.clock.runFor(4500);
    probe.anomalies=await page.evaluate(()=>__qa.anomalies);
    await page.evaluate(()=>__qaRestorePosition());
    for(let i=0;i<30&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.runFor(1000);
   }
   assert.ok(probe.anomalies.some(a=>a.type===type),'Observer detects injected '+type+' in real bones/state: '+JSON.stringify(probe));
   report.faultProbes.push(probe);console.log('PASS real-state fault probe '+type);
  }
  if(combatGate&&!skipProbes)for(const type of ['aimOff','weaponMount','muzzleFar','noDamage','deadPartDamage','hpRange','wreckActs','partVisual','popSwap']){
   await page.evaluate(()=>{
    __ironVow.start({seed:4242,frames:[5,8,0],contract:0});
    const a=current(),target=battle.units.find(u=>u.team==='enemy');battle.units=[a,target];battle.cover.clear();
    for(const cell of battle.field.cells)cell.level=0;
    Object.assign(a,{x:3,z:15,vx:3,vz:15});Object.assign(target,{x:6,z:15,vx:6,vz:15});
    for(const part of Object.keys(target.hp))target.hp[part]=target.max[part]=1000;target.hp.right=0;ruleRandom=()=>0;
    IronVowScene.clear();IronVowScene.render(clock,1);
    __qa.anomalies=[];__qa.keys.clear();__qa.objects.clear();__qa.combatSeen=0;__qa.combatGate=true;
   });
   const readyBy=Date.now()+120000;
   while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<readyBy,'Combat fault fixture assets');await page.clock.runFor(34);await new Promise(resolve=>setTimeout(resolve,20));}
   const probe=await page.evaluate(type=>{
    const q=__qa,u=current(),target=battle.units.find(u=>u.team==='enemy'),record=IronVowScene.models.get(u.id),m=record.entry.m,weapon=record.entry.primary;
    IronVowScene.aimAt(u,target,'body');u.fireTime=clock-.1;u.attack={kind:'rifle',start:clock-1,fireAt:clock-.1,releaseAt:null,primeDuration:0,windup:.23};
    IronVowScene.render(clock,1);q.anomalies=[];q.keys.clear();q.observe();
    const baseline=q.anomalies.map(a=>a.type);q.anomalies=[];q.keys.clear();
    if(type==='aimOff'){const aim=IronVowFoundry.aimMounted;window.__qaRestoreAim=()=>{IronVowFoundry.aimMounted=aim;};IronVowFoundry.aimMounted=(...args)=>{const result=aim(...args);args[1].mount.rotation.y+=.6;args[0].cont.updateMatrixWorld(true);return result;};}
    if(type==='weaponMount'){m.cont.add(weapon.mount);m.cont.updateMatrixWorld(true);}
    if(type==='muzzleFar'){weapon.muzzle.position.x+=3;m.cont.updateMatrixWorld(true);}
    if(type==='hpRange')u.hp.body=u.max.body+10;
    if(type==='wreckActs')u.alive=false;
    if(type==='partVisual'){
     u.hp.right=0;IronVowFoundryRig.setPartState(m,'right',2);const plate=m.build.parts.right.find(p=>p.detach);
     if(!plate)throw Error('No actual detachable arm plate in the fixture');plate.m.visible=true;
    }
    if(type==='popSwap'){
     const replacement=new THREE.Sprite(new THREE.SpriteMaterial());replacement.position.copy(record.object.position);
     record.object.parent.add(replacement);record.object.visible=false;record.object=replacement;
    }
    if(type==='noDamage')Object.defineProperty(target.hp,'body',{configurable:true,enumerable:true,get:()=>1000,set:()=>{}});
    if(type==='aimOff'||type==='noDamage'||type==='deadPartDamage'){
     u.attack=null;void __ironVow.attack(u.id,target.id,'body','fire').catch(e=>q.commandErrors.push(String(e)));
    }else q.observe();
    return{type,baseline,anomalies:q.anomalies};
   },type);
   assert.ok(!probe.baseline.includes(type),'Clean fixture does not flag '+type+': '+JSON.stringify(probe));
   if(type==='deadPartDamage'){
    for(let i=0;i<300&&!await page.evaluate(()=>Number.isFinite(current().attack?.fireAt));i++)await page.clock.runFor(34);
    await page.evaluate(()=>{const target=battle.units.find(u=>u.team==='enemy');let hp=0;Object.defineProperty(target.hp,'body',{configurable:true,enumerable:true,get:()=>hp,set:()=>{hp=-5;}});});
   }
   if(type==='aimOff'||type==='noDamage'||type==='deadPartDamage'){
    for(let i=0;i<1200&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.runFor(34);
    probe.anomalies=await page.evaluate(()=>__qa.anomalies);
    if(type==='aimOff')await page.evaluate(()=>__qaRestoreAim());
   }
   assert.ok(probe.anomalies.some(a=>a.type===type),'Observer detects actual combat/bone/state corruption '+type+': '+JSON.stringify(probe));
   report.faultProbes.push(probe);console.log('PASS real combat fault probe '+type);
  }
  for(let index=startIndex;index<startIndex+count;index++){
   const wallStart=Date.now(),caseIndex=rasterPair?startIndex:index,seed=4242+caseIndex,frames=Array.from({length:3},(_,i)=>live[(caseIndex*3+i)%live.length]),contract=caseIndex%4;
   const weapons=combatGate?await page.evaluate(index=>{const catalog=WEAPONS.filter(w=>!w.builtIn&&!w.shoulder);return Array.from({length:3},(_,i)=>catalog[(index*3+i)%catalog.length].id);},caseIndex):null;
   if(rasterPair&&index===startIndex){
    await page.evaluate(options=>__ironVow.start(options),{seed,frames,contract,weapons});await page.clock.runFor(100);
    const deadline=Date.now()+120000;while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<deadline,'Exact paired scenario warmed');await page.clock.runFor(34);await new Promise(r=>setTimeout(r,20));}
   }
   await page.evaluate(({seed,frames,contract,weapons,cpuRaster,rasterPair})=>{
    if(rasterPair){let n=(seed^0xabc123)>>>0;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};clearTimeout(__qaFrameTimer);last=performance.now();requestAnimationFrame(draw);}
    __qa.cpuRaster=cpuRaster;__qa.rasterOmitted=0;__qa.rasterContexts=0;__qa.ticks=0;__qa.anomalies=[];__qa.keys.clear();__qa.feet.clear();__qa.motion.clear();__qa.frames.clear();__qa.weapons.clear();__qa.commands=[];__qa.commandErrors=[];__qa.circleCandidates=0;__qa.combatSeen=0;__qa.objects.clear();__qa.combatCounts={};__qa.combatTrace=[];__qa.maximumLaunchAimError=0;__qa.aimClearance={calls:0,infeasibleCount:0,minimumDiscriminant:null,minimumTravel:null,samples:[]};__qa.combatGate=Boolean(weapons);
    __ironVow.start({seed,frames,contract,...(weapons?{weapons}:{})});
   },{seed,frames,contract,weapons,cpuRaster:cpuRaster||rasterPair&&index>startIndex,rasterPair});
   await page.clock.runFor(100);
   // Each contract may introduce a temporary enemy atlas not present in the warmup.
   // Let real decoding finish while advancing the controlled animation clock.
   const readyDeadline=Date.now()+120000;
   while(!await page.evaluate(()=>IronVowScene.ready)){
    assert.ok(Date.now()<readyDeadline,'Battle assets did not become ready within 120 seconds');
    await page.clock.runFor(34);await new Promise(resolve=>setTimeout(resolve,20));
   }
   const terrainSeed=await page.evaluate(()=>battle.terrainSeed);assert.ok(Number.isInteger(terrainSeed),'Seeded terrain is present');
   let done=false,turn=0,used=new Set(),boneSamples=[];const bones=s=>s.units.filter(u=>u.live).map(u=>({id:u.id,root:u.root,matrix:u.matrix,feet:u.feet.map(f=>f.ankle)}));
   for(let decision=0;decision<1000;decision++){
    let s=await page.evaluate(()=>__ironVow.snapshot());
    assert.ok(Number.isInteger(s.terrainSeed)||!s.phase,'Real deployment surveyed its seeded terrain');
    if(!s.phase){done=true;break;}
    assert.ok(s.ready,'Live rig failed to load');assert.ok(s.turn<=40,'Campaign battle stalled');
    if(s.pending){await page.clock.runFor(1000);continue;}
    if(rasterPair){await page.clock.runFor(2000);s=await page.evaluate(()=>__ironVow.snapshot());}
    if(s.turn!==turn){turn=s.turn;used.clear();}
    const ally=s.units.find(u=>u.team==='ally'&&u.alive&&!used.has(u.id));
    if(!ally){await page.evaluate(()=>{void __ironVow.endTurn().catch(e=>__qa.commandErrors.push(String(e)));});await page.clock.runFor(1000);continue;}
    const choices=await page.evaluate(id=>{const u=battle.units.find(u=>u.id===id),choices=__ironVow.choices(id);choices.attacks=choices.attacks.filter(a=>!['BARRAGE NEXT ROUND','FIRE AT MARKER'].includes(barrageStatus(u,battle.units.find(t=>t.id===a.target),weapon(a.weapon))));return choices;},ally.id),attack=choices.attacks.sort((a,b)=>a.hp-b.hp)[0],move=choices.moves.sort((a,b)=>a.score-b.score)[0];
    if(attack){if(rasterPair)boneSamples.push(bones(s));await page.evaluate(({id,attack})=>{__qa.commands.push({type:'attack',id,...attack});__qa.weapons.add(attack.weapon);void __ironVow.attack(id,attack.target,attack.part,attack.mode).catch(e=>__qa.commandErrors.push(String(e)));},{id:ally.id,attack});}
    else if(move&&move.score<choices.currentScore){if(rasterPair)boneSamples.push(bones(s));await page.evaluate(({id,move})=>{__qa.commands.push({type:'move',id,...move});void __ironVow.move(id,move.x,move.z).catch(e=>__qa.commandErrors.push(String(e)));},{id:ally.id,move});}
    else{used.add(ally.id);continue;}
    await page.clock.runFor(1000);
   }
   if(!done)report.incompleteBattle=await page.evaluate(meta=>({...meta,snapshot:__ironVow.snapshot(),ticks:__qa.ticks,anomalies:__qa.anomalies,commands:__qa.commands,commandErrors:__qa.commandErrors}),{seed,frames,contract,terrainSeed});
   assert.ok(done,'Decision limit exceeded');
   const result=await page.evaluate(()=>({terrainSeed:battle?.terrainSeed??save.sortie?.terrainSeed,ticks:__qa.ticks,anomalies:__qa.anomalies,frames:[...__qa.frames],weapons:[...__qa.weapons],commands:__qa.commands,commandErrors:__qa.commandErrors,circleCandidates:__qa.circleCandidates,combatCounts:__qa.combatCounts,rasterOmitted:__qa.rasterOmitted,rasterContexts:__qa.rasterContexts,combatTrace:__qa.combatTrace,maximumLaunchAimError:__qa.maximumLaunchAimError,aimClearance:__qa.aimClearance,result:__ironVow.snapshot().result}));
   report.battles.push({seed,frames,contract,assignedWeapons:weapons,...result,...(rasterPair?{boneSamples}:{}),terrainSeed,wallMilliseconds:Date.now()-wallStart});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
   console.log(JSON.stringify({seed,frames,ticks:result.ticks,result:result.result?.win,anomalies:result.anomalies,errors:result.commandErrors}));
   assert.deepEqual(result.commandErrors,[]);assert.ok(result.ticks>0,'No animation ticks checked');
  }
  if(rasterPair){const [baseline,omitted]=report.battles;assert.deepEqual(omitted.commands,baseline.commands,'Paired raster omission preserves every real command');assert.deepEqual(omitted.result,baseline.result,'Paired raster omission preserves real battle outcome');assert.deepEqual(omitted.combatTrace,baseline.combatTrace,'Paired raster omission preserves ordered real combat events and HP');
   assert.equal(omitted.boneSamples.length,baseline.boneSamples.length,'Same settled actual-bone command boundaries');let maximumBoneDelta=0;
   const compare=(a,b)=>{if(typeof a==='number'){maximumBoneDelta=Math.max(maximumBoneDelta,Math.abs(a-b));return;}if(Array.isArray(a)){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)compare(a[i],b[i]);return;}if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))compare(a[k],b[k]);return;}assert.equal(a,b);};compare(baseline.boneSamples,omitted.boneSamples);
   // Procedural idle breath uses a visual random phase; a centimetre-scale pose difference is allowed.
   assert.ok(maximumBoneDelta<.05,'Paired settled actual roots, matrices and ankle poses agree within 5cm/0.05 matrix units: '+maximumBoneDelta);report.rasterPairMaximumBoneDelta=maximumBoneDelta;assert.ok(omitted.rasterOmitted>0,'Paired run really omitted output raster paints');report.rasterPairPassed=true;}
  report.webglContexts=await page.evaluate(()=>__sceneWebglContexts);assert.equal(report.webglContexts,1);
  assert.equal(git('rev-parse','HEAD:dist'),source.distTree,'Application tree stayed immutable during the run');assert.equal(Boolean(git('status','--porcelain','--','dist')),source.distDirty);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),source.checkerSha256,'Checker stayed immutable during the run');
  assert.deepEqual(report.errors,[],'Browser errors');assert.equal(report.battles.flatMap(b=>b.anomalies).length,0,'Scene anomalies');
  if(count>=3)assert.deepEqual([...new Set(report.battles.flatMap(b=>b.frames))].sort((a,b)=>a-b),live,'Every live frame covered');
  if(combatGate){report.weaponCoverage={assigned:[...new Set(report.battles.flatMap(b=>b.assignedWeapons||[]))],commanded:[...new Set(report.battles.flatMap(b=>b.weapons))],policy:'Campaign rotates all 24 Workshop weapons; actual all-weapon landed-contact coverage, built-ins and shoulder launcher are asserted separately by scene-combat.cjs.'};if(count>=30)assert.equal(report.weaponCoverage.assigned.length,24,'Every Workshop weapon assigned in campaign');}
  report.status='passed';
  console.log('PASS '+count+' seeded campaign battles, '+report.battles.reduce((n,b)=>n+b.ticks,0)+' actual-bone ticks');
 }finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
