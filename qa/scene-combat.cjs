/* Real game commands and Three.js scene nodes, controlled at 30 Hz.
 * CPU action coverage: GPU submissions/readbacks omitted; images are checked separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const source={commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),distDirty:Boolean(git('status','--porcelain','--','dist')),checkerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')};
const url=process.env.IRON_VOW_URL||'http://127.0.0.1:5177/';
const out=path.resolve(process.env.IRON_VOW_COMBAT_REPORT||'combat-actions.json');
(async()=>{
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 const report={url,source,motion:process.env.IRON_VOW_COMBAT_MOTION==='full'?'full':'reduced',renderPolicy:'Actual rules, rigs, materials, sockets and FX pools; controlled 30 Hz. Unobserved GPU draws/readbacks omitted, with real scene/camera matrix updates. No performance claim.',cases:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1194,height:834},deviceScaleFactor:.5,hasTouch:process.env.IRON_VOW_COMBAT_MOTION!=='full',reducedMotion:process.env.IRON_VOW_COMBAT_MOTION==='full'?'no-preference':'reduce'});
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.addInitScript(()=>{
   Object.defineProperty(window,'IronVowRenderer',{configurable:true,set(api){const get=api.get;api.get=function(){const r=get();if(!r.__cpuActionQA){r.__cpuActionQA=true;r.render=(s,c)=>{s.updateMatrixWorld();c.updateMatrixWorld();};r.readRenderTargetPixels=()=>{};}return r;};Object.defineProperty(window,'IronVowRenderer',{value:api,configurable:true});}});
   const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),frames=new Set();
   window.requestAnimationFrame=fn=>{const id=request(t=>{frames.delete(id);fn(t);});frames.add(id);return id;};
   window.__stopCombatFrames=()=>{for(const id of frames)cancel(id);frames.clear();};
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ironVow);
  await page.evaluate(()=>__stopCombatFrames());
  const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
  await page.evaluate(()=>{requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/30);last=performance.now();requestAnimationFrame(draw);});
  const catalog=await page.evaluate(()=>WEAPONS.map(w=>({id:w.id,melee:Boolean(w.melee),shoulder:Boolean(w.shoulder)})));
  for(const [index,item] of catalog.entries()){
   if(index<Number(process.env.IRON_VOW_COMBAT_START_INDEX||0)||process.env.IRON_VOW_COMBAT_PRESENTATION_ONLY==='1'||process.env.IRON_VOW_COMBAT_WEAPONS&&!process.env.IRON_VOW_COMBAT_WEAPONS.split(',').includes(item.id))continue;
   const frame=item.shoulder?20:[0,5,6,7,8,9,10,12][index%8];
   console.log('START '+item.id+' frame '+frame);
   const fixture=await page.evaluate(({item,index,frame})=>{
    __ironVow.start({seed:4242+index,frames:[frame],contract:0});
    const a=current(),target=battle.units.find(u=>u.team==='enemy'),w=item.shoulder?weapon('missile'):weapon(item.id);
    battle.units=[a,target];battle.cover.clear();for(const cell of battle.field.cells)cell.level=0;
    Object.assign(a,{x:3,z:15,vx:3,vz:15,weapon:item.melee?'rifle':w.id,melee:item.melee?w.id:null,shield:null,brace:false,ap:8});
    if(item.shoulder)a.shoulder='vesper-shoulder';
    const targetX=3+Math.min(3,w.range);Object.assign(target,{x:targetX,z:15,vx:targetX,vz:15});
    for(const key of Object.keys(target.hp)){target.hp[key]=1000;target.max[key]=1000;}
    target.counter=true;ruleRandom=()=>0;action=item.shoulder?'missile':item.melee?'strike':'fire';
    IronVowScene.clear();IronVowScene.render(clock,1);
    window.__combatActionError=null;
    return {actor:a.id,target:target.id,mode:action,before:{...target.hp},beats:attackProfile(a,w.id).beats.length,contacts:w.burst||attackProfile(a,w.id).beats.length};
   },{item,index,frame});
   const readyBy=Date.now()+120000;
   while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<readyBy,'Assets ready for '+item.id);await page.clock.runFor(34);await new Promise(resolve=>setTimeout(resolve,20));}
   await page.evaluate(f=>{void __ironVow.attack(f.actor,f.target,'body',f.mode).catch(e=>window.__combatActionError=String(e));},fixture);
   for(let i=0;i<1000&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.runFor(34);
   const result=await page.evaluate(f=>({pending:Boolean(__ironVow.pending),error:window.__combatActionError,after:{...battle.units.find(u=>u.id===f.target).hp},events:IronVowScene.combat.history.filter(e=>e.actor===f.actor)}),fixture);
   const impacts=result.events.filter(e=>e.type==='impact'),launches=result.events.filter(e=>e.type==='launch');
   const entry={weapon:item.id,frame,...fixture,...result};report.cases.push(entry);
   assert.equal(result.error,null,item.id+' real command');assert.equal(result.pending,false,item.id+' completed');
   assert.equal(impacts.length,fixture.contacts,item.id+' one hook per landed round/contact');
   assert.ok(impacts.every(e=>e.point.every(Number.isFinite)&&e.back.every(Number.isFinite)),item.id+' finite actual contact');
   const delta=Object.keys(fixture.before).reduce((n,key)=>n+fixture.before[key]-result.after[key],0);
   assert.equal(impacts.reduce((n,e)=>n+e.damage,0),delta,item.id+' contact hooks match actual HP loss');assert.ok(delta>0,item.id+' deals actual damage');
   if(!item.melee){
    assert.equal(launches.length,fixture.beats,item.id+' own logical firing beats');
    if(!item.shoulder)assert.ok(launches.every(e=>e.mounted),item.id+' uses the actual weapon mount');
    const kind=await page.evaluate(id=>IronVowWeaponFX.get(id).archetype,item.id);
    if(kind!=='missile')assert.ok(launches.every(e=>e.aimError!==null&&e.aimError<.12),item.id+' actual barrel aims at the contact: '+JSON.stringify(launches.map(e=>e.aimError)));
   }
   if(await page.evaluate(id=>IronVowWeaponFX.get(id).archetype==='missile',item.id)){const arrivals=result.events.filter(e=>e.type==='arrival');assert.equal(arrivals.length,fixture.beats,item.id+' each missile arrives once');for(const e of arrivals)assert.ok(Math.hypot(...e.point.map((n,i)=>n-e.expected[i]))<1e-8,item.id+' exact arrival endpoint');}
   fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('PASS '+item.id+' '+impacts.length+' contacts, '+delta+' HP');
  }
  // Presentation fixtures mutate setup only; commands, HP transitions and renderer nodes stay real.
  const prepare=async shield=>{
   await page.evaluate(shield=>{
    __ironVow.start({seed:4713,frames:[5],contract:0});const a=current(),t=battle.units.find(u=>u.team==='enemy');
    battle.units=[a,t];battle.cover.clear();for(const cell of battle.field.cells)cell.level=0;
    Object.assign(a,{x:3,z:15,vx:3,vz:15,weapon:'rifle',melee:null,shield:null,ap:8});
    Object.assign(t,{frame:5,x:5,z:15,vx:5,vz:15,weapon:'rifle',shield:shield?'bulwark-shield':null,counter:true,reacted:false});
    for(const u of [a,t])for(const key of Object.keys(u.hp))u.hp[key]=u.max[key]=1000;
    ruleRandom=()=>0;IronVowScene.clear();IronVowScene.render(clock,1);window.__combatActionError=null;
   },shield);
   const deadline=Date.now()+120000;while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<deadline,'Presentation fixture assets');await page.clock.runFor(34);await new Promise(r=>setTimeout(r,20));}
  };
  await prepare(true);
  const shield=await page.evaluate(()=>{
   const a=current(),t=battle.units.find(u=>u.team==='enemy');const before={...t.hp};
   void __ironVow.attack(a.id,t.id,'body','fire').catch(e=>window.__combatActionError=String(e));
   let lockout;try{__ironVow.endTurn();lockout=false;}catch(e){lockout=/still pending/.test(String(e));}
   return {before,lockout};
  });
  for(let i=0;i<1000&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.runFor(34);
  Object.assign(shield,await page.evaluate(()=>({after:{...battle.units.find(u=>u.team==='enemy').hp},events:IronVowScene.combat.history,error:window.__combatActionError})));
  assert.equal(shield.error,null);assert.equal(shield.lockout,true,'A real second command is locked out while attacking');
  const shieldHits=shield.events.filter(e=>e.type==='impact'&&e.actor==='ally0');
  assert.ok(shieldHits.length>0&&shieldHits.every(e=>e.shield),'Actual shield contacts');
  assert.ok(shield.after.left<shield.before.left&&shield.after.body===shield.before.body,'Shield damage reaches the left arm only');
  report.shieldAndLockout=shield;
  await prepare(false);
  await page.evaluate(()=>{const a=current(),t=battle.units.find(u=>u.team==='enemy');void __ironVow.attack(a.id,t.id,'body','fire').catch(e=>window.__combatActionError=String(e));});
  for(let i=0;i<1000&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.runFor(34);
  report.counter=await page.evaluate(()=>({events:IronVowScene.combat.history,error:window.__combatActionError,reacted:battle.units.find(u=>u.team==='enemy').reacted}));
  assert.equal(report.counter.error,null);assert.equal(report.counter.reacted,true);assert.ok(report.counter.events.some(e=>e.type==='impact'&&e.actor!=='ally0'),'Real return fire has landed contact');
  await prepare(false);
  // Launcher users cannot return ranged fire; this exercises the existing missile rule.
  await page.evaluate(()=>{const t=battle.units.find(u=>u.team==='enemy');t.weapon='missile';t.reacted=false;IronVowScene.clear();IronVowScene.render(clock,1);});
  report.missileCounter=await page.evaluate(()=>{const a=current(),t=battle.units.find(u=>u.team==='enemy');return {range:counterRange(unitWeapon(t),t.training,t.brace),weapon:reactionWeapon(t,a)?.id||null};});
  assert.equal(report.missileCounter.range,0);assert.equal(report.missileCounter.weapon,null,'Missile cannot counter at ranged distance');
  await prepare(false);
  // Use the real jump operation on a live rig with the Aero skill, recording its physical airborne root.
  await page.evaluate(()=>{const a=current();a.mechSkills=[AERO_FRAME];window.__jumpDone=false;window.__jumpSamples=[];const render=IronVowScene.render;IronVowScene.render=function(...args){const result=render.apply(this,args);if(a.motion?.jumpjet||Number.isFinite(a.landTime)&&clock>=a.landTime&&clock-a.landTime<.6){const r=IronVowScene.models.get(a.id);__jumpSamples.push({time:clock,y:r.object.position.y,ground:IronVowScene.groundAt(r.object.position.x,r.object.position.z),height:jumpjetHeight(a,clock),airborne:Boolean(a.motion?.jumpjet),feet:__ironVow.snapshot().units.find(u=>u.id===a.id).feet});}return result;};void useJumpjet(a,3,12).then(()=>__jumpDone=true);});
  for(let i=0;i<200&&!await page.evaluate(()=>__jumpDone);i++)await page.clock.runFor(34);
  await page.clock.runFor(650);
  report.jumpjet=await page.evaluate(()=>({done:__jumpDone,samples:__jumpSamples,land:current().landTime,motion:Boolean(current().motion),reduced:reducedMotion}));
  assert.equal(report.jumpjet.done,true);assert.equal(report.jumpjet.motion,false);assert.ok(Number.isFinite(report.jumpjet.land),'Actual landing timestamp');
  if(!report.jumpjet.reduced){
   const peak=report.jumpjet.samples.filter(s=>s.airborne&&s.height>1);
   assert.ok(peak.length&&peak.every(s=>s.y-s.ground>1),'Real live rig root leaves the ground');
   assert.ok(peak.every(s=>s.feet.every(f=>f.ankle[1]-f.ground-f.ankleHeight>.8)),'Actual ankles leave terrain near jump peak');
  }
  assert.ok(report.jumpjet.samples.every(s=>s.feet.every(f=>Math.hypot(...f.ankle.map((n,i)=>n-f.target[i]))<.02&&Math.hypot(...f.hip.map((n,i)=>n-f.target[i]))<f.reach+.01)),'Airborne and landing ankles track reachable goals');
  const landed=report.jumpjet.samples.filter(s=>!s.airborne&&s.time-report.jumpjet.land>.45);
  assert.ok(landed.length&&landed.every(s=>s.feet.every(f=>Math.abs(f.ankle[1]-f.ground-f.ankleHeight)<.02)),'Actual ankles return to terrain after landing');
  // Mortar remains a presentation-only announced-future cue, with no added damage rules.
  await page.evaluate(()=>{__ironVow.start({seed:4713,frames:[7],contract:0});battle.cover.clear();IronVowScene.clear();IronVowScene.render(clock,1);});
  {const deadline=Date.now()+120000;while(!await page.evaluate(()=>IronVowScene.ready)){assert.ok(Date.now()<deadline,'Mortar assets');await page.clock.runFor(34);await new Promise(r=>setTimeout(r,20));}}
  await page.evaluate(()=>{const a=current(),m=IronVowScene.models.get(a.id).entry.m;if(!m.mortar)throw Error('Actual mortar rig missing');window.__mortar={before:battle.units.map(u=>({id:u.id,hp:{...u.hp}})),at:clock,rest:m.mortar.elevation.rotation.x,glows:[]};const fx=IronVowScene.combat.fx,glow=fx.glow;fx.glow=function(p,...args){__mortar.glows.push({time:clock,point:p.toArray(),expected:IronVowScene.attachmentPoint(a,'mortarMuzzle').toArray()});return glow.call(this,p,...args);};IronVowScene.mortarPresentation(a);});
  await page.clock.runFor(700);
  report.mortar=await page.evaluate(()=>({...__mortar,elevation:IronVowScene.models.get(current().id).entry.m.mortar.elevation.rotation.x}));
  assert.ok(Math.abs(report.mortar.elevation-report.mortar.rest)>.1,'Actual mortar elevation prepares the cue');
  await page.clock.runFor(1700);
  Object.assign(report.mortar,await page.evaluate(()=>({after:battle.units.map(u=>({id:u.id,hp:{...u.hp}})),glows:__mortar.glows})));
  assert.deepEqual(report.mortar.after,report.mortar.before,'Future mortar presentation changes no HP');assert.equal(report.mortar.glows.length,1,'Mortar emits exactly one muzzle cue');
  assert.ok(Math.hypot(...report.mortar.glows[0].point.map((n,i)=>n-report.mortar.glows[0].expected[i]))<1e-8,'Mortar cue uses its real muzzle');
  await prepare(false);
  // Observe actual pooled FX through call-through wrappers; never fabricate an event record.
  await page.evaluate(()=>{
   const fx=IronVowScene.combat.fx;window.__fxCalls=[];
   for(const key of ['smoke','fire','arc','crawl','joint','dustwave']){const original=fx[key];fx[key]=function(...args){__fxCalls.push({type:key,time:clock});return original.apply(this,args);};}
   const t=battle.units.find(u=>u.team==='enemy');t.hp.right=0;t.hp.body=200;IronVowScene.render(clock,1);
  });
  report.damageVisuals=await page.evaluate(()=>{const u=__ironVow.snapshot().units.find(u=>u.team==='enemy');return {hp:u.hp,max:u.max,parts:u.partVisual};});
  assert.equal(report.damageVisuals.parts.right.state,2);assert.equal(report.damageVisuals.parts.right.visible,0);assert.equal(report.damageVisuals.parts.body.state,1);
  await page.clock.runFor(2500);
  report.critical=await page.evaluate(()=>({calls:__fxCalls.slice(),motion:reducedMotion}));
  assert.ok(report.critical.calls.some(e=>e.type==='smoke'),'Critical damage emits real smoke');
  await page.evaluate(()=>{const t=battle.units.find(u=>u.team==='enemy');t.hp.body=0;t.downReason='body';beginDestruction(t,'body');__fxCalls=[];});
  const deathStart=await page.evaluate(()=>clock);
  await page.clock.runFor(15000);
  report.wreck=await page.evaluate(start=>{const t=battle.units.find(u=>u.team==='enemy'),r=IronVowScene.models.get(t.id);return {start,time:clock,alive:t.alive,attacking:Boolean(t.attack),object:r.object.uuid,visible:r.object.visible,calls:__fxCalls,parts:__ironVow.snapshot().units.find(u=>u.id===t.id).partVisual};},deathStart);
  assert.equal(report.wreck.alive,false);assert.equal(report.wreck.attacking,false);assert.equal(report.wreck.visible,true,'Persistent real wreck object');
  const smoke=report.wreck.calls.filter(e=>e.type==='smoke').map(e=>e.time-deathStart);
  assert.ok(smoke.some(age=>age>13&&age<14),'Wreck continues smoking until fourteen seconds');assert.ok(smoke.every(age=>age<14.05),'Wreck smoke stops at fourteen seconds');
  if(report.motion==='full')assert.ok(report.wreck.calls.some(e=>['arc','crawl','joint'].includes(e.type)),'Full-motion staged electrical collapse');
  // Change the media preference in the same live browser and assert the runtime listener reacts.
  const opposite=report.motion==='full'?'reduce':'no-preference';await page.emulateMedia({reducedMotion:opposite});
  await page.waitForFunction(want=>reducedMotion===want,opposite==='reduce');
  report.dynamicReducedMotion=await page.evaluate(()=>({reduced:reducedMotion,touch:matchMedia('(pointer: coarse)').matches}));
  console.log('PASS real shield interception, pending-command lockout, counter, damage materials, staged wreck and fourteen-second smoke, dynamic reduced motion');
  assert.equal(git('rev-parse','HEAD:dist'),source.distTree,'Application tree stayed immutable during action run');assert.equal(Boolean(git('status','--porcelain','--','dist')),source.distDirty);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),source.checkerSha256,'Checker stayed immutable during action run');
  assert.deepEqual(report.errors,[]);report.status='passed';
 }finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log('PASS requested catalog weapons: actual commands, beats, mounts, aim, landed contacts and HP');
})().catch(e=>{console.error(e);process.exitCode=1;});
