/* Seeded campaign commands, real runtime bones, 30 Hz controlled clock. GPU captures run separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const campaign=require('./scene-campaign.cjs');
const url=process.env.IRON_VOW_URL||'http://127.0.0.1:5176/';
const rasterPair=process.env.IRON_VOW_SCENE_RASTER_PAIR==='1',cpuRaster=process.env.IRON_VOW_SCENE_CPU_RASTER==='1',skipProbes=process.env.IRON_VOW_SCENE_SKIP_PROBES==='1';
const count=rasterPair?2:Number(process.env.IRON_VOW_SCENE_BATTLES||30),out=path.resolve(process.env.IRON_VOW_SCENE_REPORT||'scene-report.json');
const startIndex=Number(process.env.IRON_VOW_SCENE_START_INDEX||0);
const formal=process.env.IRON_VOW_SCENE_FORMAL==='1'||count>=30;
const root=path.resolve(__dirname,'..'),captureMode=Boolean(process.env.IRON_VOW_SCENE_COUNTER_CAPTURE);
const fullFinalCampaign=count===campaign.DEFAULT_BATTLES&&startIndex===0&&!rasterPair;
const combatGate=fullFinalCampaign||process.env.IRON_VOW_SCENE_COMBAT==='1';
const compactCampaign=fullFinalCampaign;
const resumeCampaign=!rasterPair&&!captureMode&&process.env.IRON_VOW_SCENE_RESUME!=='0'&&(fullFinalCampaign||process.env.IRON_VOW_SCENE_RESUME==='1');
const phase3FinalReady=fullFinalCampaign||process.env.IRON_VOW_SCENE_PHASE3_FINAL_READY==='1';
assert.ok(Number.isInteger(count)&&count>0,'Campaign battle count must be a positive integer');
assert.ok(Number.isInteger(startIndex)&&startIndex>=0,'Campaign start index must be a non-negative integer');
function browserPath(){
 if(process.env.IRON_VOW_CHROME)return path.resolve(process.env.IRON_VOW_CHROME);
 if(fs.existsSync(chromium.executablePath()))return undefined;
 return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
}
(async()=>{
 const tileOverride=process.env.IRON_VOW_SCENE_TILE?Number(process.env.IRON_VOW_SCENE_TILE):null;
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const source={commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),url,distDirty:Boolean(git('status','--porcelain','--','dist')),qaDirty:Boolean(git('status','--porcelain','--','qa/check-scene.cjs','qa/scene-campaign.cjs','qa/combine-scene.cjs','qa/check-scene-campaign.cjs')),checkerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),campaignSha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve('./scene-campaign.cjs'))).digest('hex')};
 const scratchDirectory=campaign.assertScratchOutsideRepository(root,path.resolve(process.env.IRON_VOW_SCENE_CAMPAIGN_DIR||path.join(os.tmpdir(),'iron-vow-scene-campaign')));
 if(formal){assert.equal(rasterPair,false,'Formal shards do not repeat seeds');assert.equal(skipProbes,false,'The formal soak includes all negative controls');assert.equal(source.distDirty,false,'The formal soak requires committed, immutable application source');assert.equal(source.qaDirty,false,'The formal soak requires committed, immutable campaign QA');assert.equal(tileOverride,null,'The formal soak tests the production pitch');}
 const report={schema:3,url,source,combatGate,formal,phase3FinalReady,cpuRaster,rasterPair,skipProbes,rasterPolicy:'Optional CPU mode omits paints only into the main output canvas and temporary-body output canvases after their real alpha bounds/readiness are measured. Transforms, metrics, decoding, source masks, scratch canvases, readbacks and all geometry/anchor updates remain active. Paired mode compares identical seeded command, result and combat-event streams.',clockHz:30,tileOverride,renderPolicy:'First scene rendered at the declared page DPR (0.5 normally; 1 for the bounded counter capture); subsequent bone soak skips unobserved GPU submissions and render-target readbacks. No performance claim.',overlapPolicy:'Reference 80% footprint radii, actual ankle-mesh footprint hulls with the same margin, and actual cover bounds with the reference half-radius margin.',frameCatalog:[],liveFrames:[],phase3ExpectedFrames:[],weaponCatalog:{all:[],workshop:[],workshopItems:[],shields:[]},battles:[],faultProbes:[],errors:[]};
 const command=[`IRON_VOW_URL=${url}`,`IRON_VOW_SCENE_START_INDEX=${startIndex}`,`IRON_VOW_SCENE_BATTLES=${count}`,...(combatGate?['IRON_VOW_SCENE_COMBAT=1']:[]),...(formal?['IRON_VOW_SCENE_FORMAL=1']:[]),...(cpuRaster?['IRON_VOW_SCENE_CPU_RASTER=1']:[]),...(skipProbes?['IRON_VOW_SCENE_SKIP_PROBES=1']:[]),...(resumeCampaign?['IRON_VOW_SCENE_RESUME=1',`IRON_VOW_SCENE_CAMPAIGN_DIR=${scratchDirectory}`]:[]),...(phase3FinalReady?['IRON_VOW_SCENE_PHASE3_FINAL_READY=1']:[]),'node qa/check-scene.cjs'].join(' ');
 const persist=()=>{
  if(compactCampaign||process.env.IRON_VOW_SCENE_SUMMARY){
   const target=path.resolve(process.env.IRON_VOW_SCENE_SUMMARY||out);
   const summary=campaign.summarize(report,{count,startIndex,liveFrames:report.liveFrames,workshopWeapons:combatGate?report.weaponCatalog.workshop:[],command,status:report.status});
   campaign.writeCompactSummary(target,summary);
   if(target!==out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  }else fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 };
 const executablePath=browserPath();
 if(!executablePath&&!fs.existsSync(chromium.executablePath()))throw Error('Install Chromium with npx playwright install chromium in qa, or set IRON_VOW_CHROME.');
 const browser=await chromium.launch({executablePath,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:captureMode?{width:1194,height:834}:{width:1366,height:1024},deviceScaleFactor:captureMode?1:.5});
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
  page.on('response',response=>{
   if(response.status()>=400)report.errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('console',message=>{
   if(message.type()==='error'&&!message.text().startsWith('Failed to load resource: the server responded with a status'))report.errors.push(message.text());
  });
  page.setDefaultTimeout(120000);await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
  await page.evaluate(()=>__ironVow.start({seed:4242,frames:[0]}));
  await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
  await page.evaluate(()=>{const r=IronVowRenderer.get();window.__qaActualRender??=r.render;window.__qaActualRead??=r.readRenderTargetPixels;r.render=()=>{};r.readRenderTargetPixels=()=>{};});
  const catalogs=await page.evaluate(()=>{
   const probe=battle.units.find(unit=>unit.team==='ally'),originalFrame=probe.frame;
   const workshopItems=WEAPONS.filter(weapon=>!weapon.builtIn&&!weapon.shoulder).map(weapon=>({id:weapon.id,slot:weapon.shield?'shield':weapon.melee?'melee':'primary'}));
   const shields=[...new Set([...SHIELDS.map(shield=>shield.id),...workshopItems.filter(item=>item.slot==='shield').map(item=>item.id)])].map(id=>({id,slot:'shield'}));
   const allItems=[...new Map([...workshopItems,...shields].map(item=>[item.id,item])).values()];
   try{return{
    frames:FRAMES.map((frame,index)=>{
     probe.frame=index;
     const player=playerHull(index),breach=breachLoadout(index),shieldAllowed=canFitShield(index),generalConfigurable=player&&!frame.native&&!frame.fixedWeapons;
     const legalItems=!player||frame.fixedWeapons?[]:generalConfigurable?allItems.filter(item=>item.slot!=='shield'||shieldAllowed):breach?allItems.filter(item=>item.id==='cleaver'||item.slot==='shield'&&shieldAllowed):[];
     return{frame:index,name:frame.name,live:IronVowScene.isLive(probe),playerHull:player,native:frame.native||null,fixedWeapons:Boolean(frame.fixedWeapons),enemyOnly:Boolean(frame.enemyOnly),salvageOnly:Boolean(frame.salvageOnly),weapon:frame.weapon||null,factoryMelee:frame.melee||null,generalConfigurable,configurableItems:legalItems.map(item=>item.id),phase3Expected:index!==CITADEL_FRAME};
    }),
    weaponCatalog:{all:WEAPONS.map(({id,builtIn,shoulder,melee})=>({id,builtIn:Boolean(builtIn),shoulder:Boolean(shoulder),melee:Boolean(melee)})),workshop:workshopItems.filter(item=>item.slot!=='shield').map(item=>item.id),workshopItems:workshopItems.filter(item=>item.slot!=='shield'),shields},
   };}
   finally{probe.frame=originalFrame;}
  });
  report.frameCatalog=catalogs.frames;
  report.liveFrames=report.frameCatalog.filter(frame=>frame.live);
  report.phase3ExpectedFrames=report.frameCatalog.filter(frame=>frame.phase3Expected).map(({frame,name})=>({frame,name}));
  report.weaponCatalog=catalogs.weaponCatalog;
  report.lionTrial={finalReady:phase3FinalReady,requiredForPhase3:true,includedInSeededFrames:false,checker:['qa/check-lion-trial.cjs','qa/browser/lion-trial.cjs']};
  assert.ok(report.liveFrames.length,'The runtime reports at least one live chassis');
  if(fullFinalCampaign){
   const missingRigFrames=report.phase3ExpectedFrames.filter(expected=>!report.liveFrames.some(frame=>frame.frame===expected.frame));
   assert.deepEqual(missingRigFrames,[],'The final 30-seed campaign requires every FRAMES chassis except Citadel to use a live runtime rig');
   if(phase3FinalReady){const lionOutput=execFileSync(process.execPath,[path.join(__dirname,'check-lion-trial.cjs')],{cwd:root,encoding:'utf8'}).trim();report.lionTrial.status='passed';report.lionTrial.output=lionOutput;}
  }
  const warmupFrames=report.liveFrames.filter(frame=>frame.playerHull).map(frame=>frame.frame);
  for(let index=0;index<warmupFrames.length;index+=3){
   const frames=warmupFrames.slice(index,index+3);
   await page.evaluate(frames=>__ironVow.start({seed:4242,frames}),frames);
   await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
   await page.evaluate(()=>{const r=IronVowRenderer.get();r.render=()=>{};r.readRenderTargetPixels=()=>{};});
  }
  assert.equal(await page.evaluate(()=>__sceneWebglContexts),1,'One actual WebGL context across every currently live chassis');
  await page.evaluate(()=>__qaStopNativeFrames());
  const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
  await page.evaluate(()=>{
   // No mock bones or animation inputs. Only discard the unobserved GPU submission in this CPU correctness run.
   const renderer=IronVowRenderer.get();renderer.render=()=>{};renderer.readRenderTargetPixels=()=>{};
   window.__qa={ticks:0,anomalies:[],keys:new Set(),feet:new Map(),motion:new Map(),frames:new Set(),weapons:new Set(),observedWeaponIds:new Set(),observedShields:new Set(),actualModels:new Map(),commands:[],commandErrors:[],circleCandidates:0,combatSeen:0,objects:new Map(),combatCounts:{}};
   window.__qaStartScenario=({seed,frames,contract,loadouts})=>{
    __ironVow.start({seed,frames,contract});
    for(const [i,assignment] of loadouts.entries()){
     const frame=frames[i],unit=battle.units.find(u=>u.team==='ally'&&u.index===i),saved=save.units[i];
     if(unit?.frame!==frame)throw Error('Campaign loadout has no matching allied unit at slot '+i);
     const loadout=stockHull(frame);
     if(assignment.slot!=='factory'){
      if(!save.owned.includes(assignment.id))save.owned.push(assignment.id);
      if(assignment.slot==='primary')loadout.weapon=assignment.id;
      else if(assignment.slot==='melee')loadout.melee=assignment.id;
      else if(assignment.slot==='shield'){loadout.shield=assignment.id;loadout.melee=null;}
      else throw Error('Unknown campaign loadout slot '+assignment.slot);
     }
     delete saved.shield;delete unit.shield;
     Object.assign(saved,loadout);
     if(!validHull(saved,frame,save.owned))throw Error('Campaign selected an illegal loadout '+assignment.id+' for '+FRAMES[frame].name);
     Object.assign(unit,{weapon:loadout.weapon,melee:loadout.melee??null,shield:loadout.shield});
    }
   };
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
   const rasterContexts=new WeakSet();
   const omitRaster=context=>{if(!context||rasterContexts.has(context))return;rasterContexts.add(context);__qa.rasterContexts++;
    // Keep transforms, text metrics, source masks, image decoding and every readback intact.
    // Only discard paints into already-measured output canvases. Scratch canvases are untouched.
    for(const name of ['drawImage','fill','stroke','fillRect','strokeRect','clearRect','fillText','strokeText','putImageData'])context[name]=()=>{__qa.rasterOmitted++;};
   };
   const afterFrame=()=>{if(__qa.cpuRaster){omitRaster(ctx);for(const [id,record] of IronVowScene.models){const canvas=record.object?.material?.map?.image;
    if(canvas instanceof HTMLCanvasElement&&IronVowBillboards.ready(id)&&IronVowBillboards.bounds(id,IronVowScene.camera))omitRaster(canvas.getContext('2d'));
   }}
    const s=__ironVow.snapshot(),q=__qa;
    if(q.observedBattle!==battle){
     if(!s.ready)return;
     q.observedBattle=battle;
    }
    q.ticks++;
   for(const unit of battle?.units||[]){for(const id of [unit.weapon,unit.melee,unit.shoulder])if(id)q.observedWeaponIds.add(id);const shield=equippedShield(unit);if(shield?.id)q.observedShields.add(shield.id);}
    for(const [id,record] of IronVowScene.models){const unit=battle?.units.find(unit=>unit.id===id);if(!unit||!IronVowScene.isLive(unit))continue;q.actualModels.set(id,{id,frame:unit.frame,live:true,registered:true,hasEntry:Boolean(record?.entry),armed:Boolean(record?.entry?.armed),object:Boolean(record?.object)});}
    IronVowSceneDiagnostics.observe(q,s,IronVowScene);
   };
   window.__qa.observe=afterFrame;
   const schedule=fn=>{const id=setTimeout(()=>{fn(performance.now());if(fn===draw)afterFrame();},1000/30);if(fn===draw)window.__qaFrameTimer=id;return id;};
   window.requestAnimationFrame=schedule;
   schedule(draw);
  });
  async function readyForProbe(){
   for(let attempt=0;attempt<120;attempt++){
    await page.clock.runFor(100);
    if(await page.evaluate(()=>IronVowScene.ready))return;
   }
   throw Error('Disposable probe scene did not finish loading');
  }
  // Validate the observer against real bone/state corruption in separate disposable scenes.
  // These anomalies are evidence that the checks work, never part of the ordinary campaign result.
  for(const type of skipProbes?[]:['nan','footGround','footSlide','bounds','overlap','stuck','ikReach']){
   await page.evaluate(()=>{__ironVow.start({seed:4242,frames:[5,8,0]});});await readyForProbe();
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
  const scenarios=campaign.scenarioPlan({liveFrames:report.liveFrames,workshopWeapons:combatGate?report.weaponCatalog.workshopItems:[],shieldItems:combatGate?report.weaponCatalog.shields:[],startIndex,count,totalBattles:campaign.DEFAULT_BATTLES});
  for(const planned of scenarios){
   const wallStart=Date.now(),caseIndex=rasterPair?startIndex:planned.index,scenario=rasterPair?campaign.scenarioPlan({liveFrames:report.liveFrames,workshopWeapons:combatGate?report.weaponCatalog.workshopItems:[],shieldItems:combatGate?report.weaponCatalog.shields:[],startIndex:caseIndex,count:1,totalBattles:campaign.DEFAULT_BATTLES})[0]:planned;
   const {seed,frames,contract,loadouts}=scenario,weapons=combatGate?scenario.weapons:null,workshopAssignedWeapons=combatGate?scenario.workshopAssignedWeapons:[],shieldAssigned=combatGate?scenario.shieldAssigned:[];
   const fingerprint=campaign.scenarioFingerprint({source,scenario,liveFrames:report.liveFrames,workshopWeapons:report.weaponCatalog.workshop,combatGate,formal,phase3FinalReady,cpuRaster,skipProbes,tileOverride});
   const cached=resumeCampaign?campaign.readCompleted(scratchDirectory,{commit:source.commit,seed,fingerprint}):null;
   if(cached){report.battles.push(cached.battle);persist();console.log('SKIP completed seed '+seed+' for commit '+source.commit);continue;}
   if(rasterPair&&planned.index===startIndex){
    await page.evaluate(options=>__qaStartScenario(options),{seed,frames,contract,loadouts});await page.clock.runFor(100);
    const deadline=Date.now()+120000;while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<deadline,'Exact paired scenario warmed');await page.clock.runFor(34);await new Promise(r=>setTimeout(r,20));}
   }
   await page.evaluate(({seed,frames,contract,loadouts,weapons,cpuRaster,rasterPair})=>{
    if(rasterPair){let n=(seed^0xabc123)>>>0;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};clearTimeout(__qaFrameTimer);last=performance.now();requestAnimationFrame(draw);}
    __qa.cpuRaster=cpuRaster;__qa.rasterOmitted=0;__qa.rasterContexts=0;__qa.ticks=0;__qa.anomalies=[];__qa.keys.clear();__qa.feet.clear();__qa.motion.clear();__qa.frames.clear();__qa.weapons.clear();__qa.observedWeaponIds.clear();__qa.observedShields.clear();__qa.actualModels.clear();__qa.commands=[];__qa.commandErrors=[];__qa.circleCandidates=0;__qa.combatSeen=0;__qa.objects.clear();__qa.combatCounts={};__qa.combatTrace=[];__qa.maximumLaunchAimError=0;__qa.aimClearance={calls:0,infeasibleCount:0,minimumDiscriminant:null,minimumTravel:null,samples:[]};__qa.combatGate=Boolean(weapons);
    __qaStartScenario({seed,frames,contract,loadouts});
   },{seed,frames,contract,loadouts,weapons,cpuRaster:cpuRaster||rasterPair&&planned.index>startIndex,rasterPair});
   await page.clock.runFor(100);
   // Each contract may introduce a temporary enemy atlas not present in the warmup.
   // Let real decoding finish while advancing the controlled animation clock.
   const readyDeadline=Date.now()+120000;
   while(!await page.evaluate(()=>IronVowScene.ready)){
    assert.ok(Date.now()<readyDeadline,'Battle assets did not become ready within 120 seconds');
    await page.clock.runFor(34);await new Promise(resolve=>setTimeout(resolve,20));
   }
   if(captureMode&&seed===4264)await page.evaluate(()=>{
    __qa.counterCapture=null;const combat=IronVowScene.combat,launch=combat.launch;
    combat.launch=function(a,t,w,...rest){const result=launch.call(this,a,t,w,...rest),event=combat.history.at(-1);
     if(!__qa.counterCapture&&a.id==='ally1'&&t.id==='enemy1'&&w.id==='parallax'&&battle.phase==='enemy'&&distance(a,t)<=1&&event?.type==='launch'){
      const r=IronVowRenderer.get(),oldRender=r.render,oldRead=r.readRenderTargetPixels,dpr=r.getPixelRatio(),target=r.getRenderTarget(),restores=[];
      const contexts=[ctx,...[...IronVowScene.models.values()].map(v=>v.object?.material?.map?.image).filter(c=>c instanceof HTMLCanvasElement).map(c=>c.getContext('2d'))];
      try{
       for(const c of contexts)for(const name of ['drawImage','fill','stroke','fillRect','strokeRect','clearRect','fillText','strokeText','putImageData']){restores.push([c,name,c[name]]);c[name]=CanvasRenderingContext2D.prototype[name];}
       r.render=__qaActualRender;r.readRenderTargetPixels=__qaActualRead;IronVowBillboards.invalidate();for(const u of battle.units)if(!IronVowScene.isLive(u))IronVowBillboards.get(u,clock);
       r.setPixelRatio(1);r.setSize(innerWidth,innerHeight,false);r.setRenderTarget(null);r.clear();r.render(IronVowScene.scene,IronVowScene.camera);
       __qa.counterCapture={clock,turn:battle.turn,phase:battle.phase,event:{...event},incoming:combat.history.filter(e=>e.type==='impact'&&e.actor==='enemy1'&&e.target==='ally1'&&e.time<=event.time).at(-1),units:JSON.parse(JSON.stringify(battle.units)),camera:{position:IronVowScene.camera.position.toArray(),quaternion:IronVowScene.camera.quaternion.toArray(),fov:IronVowScene.camera.fov},viewport:{width:innerWidth,height:innerHeight,dpr:1,pixelWidth:r.domElement.width,pixelHeight:r.domElement.height},renderPolicy:'One real full-resolution Three.js renderer-canvas submission/readback immediately after the real near Parallax counter launch. Temporary body output paints restored and refreshed at the same clock. UI canvas excluded; ordinary advances omit unobserved GPU/output raster. No game HP/AP/rule RNG changes or performance claim.',png:r.domElement.toDataURL('image/png')};
      }finally{for(const [c,name,method]of restores)c[name]=method;r.render=oldRender;r.readRenderTargetPixels=oldRead;r.setPixelRatio(dpr);r.setSize(innerWidth,innerHeight,false);r.setRenderTarget(target);}
     }
     return result;
    };
   });
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
   const result=await page.evaluate(()=>({terrainSeed:battle?.terrainSeed??save.sortie?.terrainSeed,ticks:__qa.ticks,anomalies:__qa.anomalies,frames:[...__qa.frames],weapons:[...__qa.weapons],observedWeaponIds:[...__qa.observedWeaponIds],observedShields:[...__qa.observedShields],actualModels:[...__qa.actualModels.values()],commands:__qa.commands,commandErrors:__qa.commandErrors,circleCandidates:__qa.circleCandidates,combatCounts:__qa.combatCounts,rasterOmitted:__qa.rasterOmitted,rasterContexts:__qa.rasterContexts,combatTrace:__qa.combatTrace,maximumLaunchAimError:__qa.maximumLaunchAimError,aimClearance:__qa.aimClearance,result:__ironVow.snapshot().result}));
   if(captureMode&&seed===4264){const capture=await page.evaluate(()=>__qa.counterCapture);assert.ok(capture,'Real near Parallax counter was captured');const imageFile=path.resolve(process.env.IRON_VOW_SCENE_COUNTER_CAPTURE+'.png'),metadataFile=path.resolve(process.env.IRON_VOW_SCENE_COUNTER_CAPTURE+'.json');fs.writeFileSync(imageFile,Buffer.from(capture.png.split(',')[1],'base64'));delete capture.png;fs.writeFileSync(metadataFile,JSON.stringify({source,seed,imageFile,...capture},null,2)+'\n');}
   const battleReport={seed,frames,contract,assignedWeapons:weapons,workshopAssignedWeapons,shieldAssigned,...result,...(rasterPair?{boneSamples}:{}),terrainSeed,wallMilliseconds:Date.now()-wallStart};
   report.battles.push(battleReport);persist();
   console.log(JSON.stringify({seed,frames,ticks:result.ticks,result:result.result?.win,anomalies:result.anomalies,errors:result.commandErrors}));
   assert.deepEqual(result.commandErrors,[]);assert.deepEqual(result.anomalies,[],'Seed '+seed+' has no scene anomalies');assert.deepEqual(report.errors,[],'Browser errors');assert.ok(result.ticks>0,'No animation ticks checked');
   assert.ok(result.actualModels.every(model=>model.registered&&model.hasEntry&&model.armed&&model.object),'Seed '+seed+' observes every production-live frame in IronVowScene.models');
   if(resumeCampaign)campaign.writeCompleted(scratchDirectory,{commit:source.commit,seed,fingerprint,battle:campaign.compactBattle(battleReport)});
  }
  if(rasterPair){const [baseline,omitted]=report.battles;assert.deepEqual(omitted.commands,baseline.commands,'Paired raster omission preserves every real command');assert.deepEqual(omitted.result,baseline.result,'Paired raster omission preserves real battle outcome');assert.deepEqual(omitted.combatTrace,baseline.combatTrace,'Paired raster omission preserves ordered real combat events and HP');
   assert.equal(omitted.boneSamples.length,baseline.boneSamples.length,'Same settled actual-bone command boundaries');let maximumBoneDelta=0;
   const compare=(a,b)=>{if(typeof a==='number'){maximumBoneDelta=Math.max(maximumBoneDelta,Math.abs(a-b));return;}if(Array.isArray(a)){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)compare(a[i],b[i]);return;}if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))compare(a[k],b[k]);return;}assert.equal(a,b);};compare(baseline.boneSamples,omitted.boneSamples);
   // Procedural idle breath uses a visual random phase; a centimetre-scale pose difference is allowed.
   assert.ok(maximumBoneDelta<.05,'Paired settled actual roots, matrices and ankle poses agree within 5cm/0.05 matrix units: '+maximumBoneDelta);report.rasterPairMaximumBoneDelta=maximumBoneDelta;assert.ok(omitted.rasterOmitted>0,'Paired run really omitted output raster paints');report.rasterPairPassed=true;}
  report.webglContexts=await page.evaluate(()=>__sceneWebglContexts);assert.equal(report.webglContexts,1);
  assert.equal(git('rev-parse','HEAD:dist'),source.distTree,'Application tree stayed immutable during the run');assert.equal(Boolean(git('status','--porcelain','--','dist')),source.distDirty);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),source.checkerSha256,'Checker stayed immutable during the run');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require.resolve('./scene-campaign.cjs'))).digest('hex'),source.campaignSha256,'Campaign helper stayed immutable during the run');
  assert.deepEqual(report.errors,[],'Browser errors');assert.equal(report.battles.flatMap(b=>b.anomalies).length,0,'Scene anomalies');
  const coverage=campaign.coverage(report.battles,report.liveFrames,combatGate?report.weaponCatalog.workshop:[],combatGate?report.weaponCatalog.shields:[]);
  report.chassisCoverage=coverage.chassis;
  const expectedPhase3Frames=report.phase3ExpectedFrames.map(frame=>frame.frame).sort((a,b)=>a-b),observedSnapshots=[...new Set(report.battles.flatMap(battle=>battle.frames))].sort((a,b)=>a-b),observedModels=[...new Set(report.battles.flatMap(battle=>battle.actualModels.filter(model=>model.live&&model.hasEntry&&model.armed&&model.object).map(model=>model.frame)))].sort((a,b)=>a-b);
  report.phase3Coverage={expected:report.phase3ExpectedFrames,live:report.liveFrames.map(({frame,name})=>({frame,name})),observedSnapshots,observedModels,missingLive:report.phase3ExpectedFrames.filter(expected=>!report.liveFrames.some(frame=>frame.frame===expected.frame)).map(({frame})=>frame),missingSnapshots:expectedPhase3Frames.filter(frame=>!observedSnapshots.includes(frame)),missingModels:expectedPhase3Frames.filter(frame=>!observedModels.includes(frame)),lionTrial:report.lionTrial};
  if(startIndex===0&&count*3>=report.liveFrames.filter(frame=>frame.playerHull).length){
   const missingPlayerChassis=coverage.chassis.missing.filter(frame=>report.liveFrames.some(live=>live.frame===frame&&live.playerHull));
   assert.deepEqual(missingPlayerChassis,[],'Every runtime-live player-eligible chassis appears in the campaign');
  }
  if(fullFinalCampaign){
   assert.deepEqual(report.phase3Coverage.missingSnapshots,[],'The final campaign observes every Phase 3 FRAMES chassis in actual snapshots');
   assert.deepEqual(report.phase3Coverage.missingModels,[],'The final campaign observes every Phase 3 FRAMES model in IronVowScene.models');
  }
  if(combatGate){
   report.weaponCoverage={expected:coverage.weapons.expected,assigned:coverage.weapons.assigned,observed:coverage.weapons.observed,commanded:coverage.weapons.commanded,missingAssigned:coverage.weapons.missingAssigned,missingObserved:coverage.weapons.missingObserved,expectedShields:coverage.weapons.expectedShields,assignedShields:coverage.weapons.assignedShields,observedShields:coverage.weapons.observedShields,missingShields:coverage.weapons.missingShields,missingObservedShields:coverage.weapons.missingObservedShields,policy:'Expected IDs come from the current runtime catalogs. The campaign reports Workshop assignments separately from actual equipped snapshots and commanded attacks; built-in, shoulder and shield contacts also have targeted checks.'};
   if(fullFinalCampaign){
    assert.deepEqual(report.weaponCoverage.missingAssigned,[],'Every current Workshop weapon is assigned in the 30-seed campaign');
    assert.deepEqual(report.weaponCoverage.missingObserved,[],'Every current Workshop weapon appears in an actual battle snapshot');
    assert.deepEqual(report.weaponCoverage.missingShields,[],'Every current shield is assigned in the 30-seed campaign');
    assert.deepEqual(report.weaponCoverage.missingObservedShields,[],'Every current shield appears in an actual battle snapshot');
   }
  }
  report.status='passed';
  console.log('PASS '+count+' seeded campaign battles, '+report.battles.reduce((n,b)=>n+b.ticks,0)+' actual-bone ticks');
 }catch(error){report.status='failed';report.runError=String(error);throw error;
 }finally{persist();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
