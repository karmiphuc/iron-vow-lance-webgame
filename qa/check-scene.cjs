/* Seeded campaign commands, real runtime bones, 30 Hz controlled clock. GPU captures run separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const url=process.env.IRON_VOW_URL||'http://127.0.0.1:5176/';
const count=Number(process.env.IRON_VOW_SCENE_BATTLES||30),out=path.resolve(process.env.IRON_VOW_SCENE_REPORT||'scene-report.json');
const startIndex=Number(process.env.IRON_VOW_SCENE_START_INDEX||0);
const live=[0,5,6,7,8,9,10,12];
(async()=>{
 const tileOverride=process.env.IRON_VOW_SCENE_TILE?Number(process.env.IRON_VOW_SCENE_TILE):null;
 const root=path.resolve(__dirname,'..'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const source={commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),distDirty:Boolean(git('status','--porcelain','--','dist')),checkerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')};
 if(count>=30){assert.equal(source.distDirty,false,'The formal soak requires committed, immutable application source');assert.equal(tileOverride,null,'The formal soak tests the production pitch');}
 const report={schema:1,url,source,clockHz:30,tileOverride,renderPolicy:'First scene rendered at 0.5 DPR for software-GL correctness; subsequent bone soak skips unobserved GPU submissions and render-target readbacks. No performance claim.',overlapPolicy:'Reference 80% footprint radii, actual ankle-mesh footprint hulls with the same margin, and actual cover bounds with the reference half-radius margin.',battles:[],faultProbes:[],errors:[]};
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
   window.__qa={ticks:0,anomalies:[],keys:new Set(),feet:new Map(),motion:new Map(),frames:new Set(),weapons:new Set(),commands:[],commandErrors:[],circleCandidates:0};
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
   const afterFrame=()=>{
    const s=__ironVow.snapshot(),q=__qa;q.ticks++;const lower=s.size&&IronVowScene.world(-.5,-.5),upper=s.size&&IronVowScene.world(s.size.width-.5,s.size.depth-.5);
    const fail=(type,u,detail)=>{const key=type+'|'+u.id;if(q.keys.has(key))return;q.keys.add(key);q.anomalies.push({type,unit:u.id,frame:u.frame,time:s.time,detail});};
    for(const u of s.units.filter(u=>u.live)){
     q.frames.add(u.frame);
     if(!u.finite||![u.vx,u.vz,...(u.root||[]),...(u.matrix||[])].every(Number.isFinite))fail('nan',u,'non-finite unit or bone matrix');
     if(u.vx<-.5||u.vz<-.5||u.vx>s.size.width-.5||u.vz>s.size.depth-.5||u.root[0]<lower.x||u.root[0]>upper.x||u.root[2]<lower.z||u.root[2]>upper.z)fail('bounds',u,{logical:[u.vx,u.vz],root:u.root});
     if(u.alive)for(const f of u.feet){
      const key=u.id+'/'+f.side,planted=!f.swing&&!f.settle,previous=q.feet.get(key),error=f.ankle[1]-f.ground-f.ankleHeight;
      if(planted&&Math.abs(error)>.15)fail('footGround',u,{side:f.side,error,ankle:f.ankle,goal:f.target,moving:u.moving,attacking:u.attacking});
      if(f.kneeContact&&Math.abs(f.kneeContact.point[1]-f.kneeContact.ground)>.15)fail('footGround',u,{side:f.side,kneeContact:f.kneeContact});
      if(planted&&previous){const drift=Math.hypot(f.ankle[0]-previous[0],f.ankle[2]-previous[2]);if(drift>.3)fail('footSlide',u,{side:f.side,drift,moving:u.moving,attacking:u.attacking,previous,foot:f});}
      if(planted){if(!previous)q.feet.set(key,f.ankle);}else q.feet.delete(key);
     }
     const prior=q.motion.get(u.id);
     if(u.moving&&u.alive){if(!prior||Math.hypot(u.root[0]-prior.x,u.root[2]-prior.z)>1)q.motion.set(u.id,{x:u.root[0],z:u.root[2],time:s.time});
      else if(s.time-prior.time>4)fail('stuck',u,'wanted to move for more than 4 seconds without crossing 1 metre');
     }else q.motion.delete(u.id);
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
   const schedule=fn=>setTimeout(()=>{fn(performance.now());if(fn===draw)afterFrame();},1000/30);
   window.requestAnimationFrame=schedule;
   schedule(draw);
  });
  // Validate the observer against real bone/state corruption in separate disposable scenes.
  // These anomalies are evidence that the checks work, never part of the ordinary campaign result.
  for(const type of ['nan','footGround','footSlide','bounds','overlap','stuck']){
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
  for(let index=startIndex;index<startIndex+count;index++){
   const seed=4242+index,frames=Array.from({length:3},(_,i)=>live[(index*3+i)%live.length]),contract=index%4;
   await page.evaluate(({seed,frames,contract})=>{
    __qa.ticks=0;__qa.anomalies=[];__qa.keys.clear();__qa.feet.clear();__qa.motion.clear();__qa.frames.clear();__qa.weapons.clear();__qa.commands=[];__qa.commandErrors=[];__qa.circleCandidates=0;
    __ironVow.start({seed,frames,contract});
   },{seed,frames,contract});
   await page.clock.runFor(100);
   const terrainSeed=await page.evaluate(()=>battle.terrainSeed);assert.ok(Number.isInteger(terrainSeed),'Seeded terrain is present');
   let done=false,turn=0,used=new Set();
   for(let decision=0;decision<1000;decision++){
    const s=await page.evaluate(()=>__ironVow.snapshot());
    assert.ok(Number.isInteger(s.terrainSeed)||!s.phase,'Real deployment surveyed its seeded terrain');
    if(!s.phase){done=true;break;}
    assert.ok(s.ready,'Live rig failed to load');assert.ok(s.turn<=40,'Campaign battle stalled');
    if(s.pending){await page.clock.runFor(1000);continue;}
    if(s.turn!==turn){turn=s.turn;used.clear();}
    const ally=s.units.find(u=>u.team==='ally'&&u.alive&&!used.has(u.id));
    if(!ally){await page.evaluate(()=>{void __ironVow.endTurn().catch(e=>__qa.commandErrors.push(String(e)));});await page.clock.runFor(1000);continue;}
    const choices=await page.evaluate(id=>{const u=battle.units.find(u=>u.id===id),choices=__ironVow.choices(id);choices.attacks=choices.attacks.filter(a=>!['BARRAGE NEXT ROUND','FIRE AT MARKER'].includes(barrageStatus(u,battle.units.find(t=>t.id===a.target),weapon(a.weapon))));return choices;},ally.id),attack=choices.attacks.sort((a,b)=>a.hp-b.hp)[0],move=choices.moves.sort((a,b)=>a.score-b.score)[0];
    if(attack){await page.evaluate(({id,attack})=>{__qa.commands.push({type:'attack',id,...attack});__qa.weapons.add(attack.weapon);void __ironVow.attack(id,attack.target,attack.part,attack.mode).catch(e=>__qa.commandErrors.push(String(e)));},{id:ally.id,attack});}
    else if(move&&move.score<choices.currentScore){await page.evaluate(({id,move})=>{__qa.commands.push({type:'move',id,...move});void __ironVow.move(id,move.x,move.z).catch(e=>__qa.commandErrors.push(String(e)));},{id:ally.id,move});}
    else{used.add(ally.id);continue;}
    await page.clock.runFor(1000);
   }
   if(!done)report.incompleteBattle=await page.evaluate(meta=>({...meta,snapshot:__ironVow.snapshot(),ticks:__qa.ticks,anomalies:__qa.anomalies,commands:__qa.commands,commandErrors:__qa.commandErrors}),{seed,frames,contract,terrainSeed});
   assert.ok(done,'Decision limit exceeded');
   const result=await page.evaluate(()=>({terrainSeed:battle?.terrainSeed??save.sortie?.terrainSeed,ticks:__qa.ticks,anomalies:__qa.anomalies,frames:[...__qa.frames],weapons:[...__qa.weapons],commands:__qa.commands,commandErrors:__qa.commandErrors,circleCandidates:__qa.circleCandidates,result:__ironVow.snapshot().result}));
   report.battles.push({seed,frames,contract,...result,terrainSeed});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
   console.log(JSON.stringify({seed,frames,ticks:result.ticks,result:result.result?.win,anomalies:result.anomalies,errors:result.commandErrors}));
   assert.deepEqual(result.commandErrors,[]);assert.ok(result.ticks>0,'No animation ticks checked');
  }
  report.webglContexts=await page.evaluate(()=>__sceneWebglContexts);assert.equal(report.webglContexts,1);
  assert.equal(git('rev-parse','HEAD:dist'),source.distTree,'Application tree stayed immutable during the run');assert.equal(Boolean(git('status','--porcelain','--','dist')),source.distDirty);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),source.checkerSha256,'Checker stayed immutable during the run');
  assert.deepEqual(report.errors,[],'Browser errors');assert.equal(report.battles.flatMap(b=>b.anomalies).length,0,'Scene anomalies');
  if(count>=3)assert.deepEqual([...new Set(report.battles.flatMap(b=>b.frames))].sort((a,b)=>a-b),live,'Every live frame covered');
  console.log('PASS '+count+' seeded campaign battles, '+report.battles.reduce((n,b)=>n+b.ticks,0)+' actual-bone ticks');
 }finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
