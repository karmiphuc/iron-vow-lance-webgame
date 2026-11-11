/* Filmstrips from the real action/timer paths; no production hooks or timing edits. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFile,execFileSync}=require('node:child_process');
const {promisify}=require('node:util');
const {chromium}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),fetchAsset=promisify(execFile),cache=new Map(),config={kind:'game',label:'current','source-root':root};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i].slice(2);if(!['origin','kind','label','source-root','out','only'].includes(key)||!process.argv[i+1])throw Error('Use --origin URL --out directory [--kind game|bench] [--label name] [--source-root directory] [--only action]');config[key]=process.argv[i+1];}
if(!config.origin||!config.out||!['game','bench'].includes(config.kind)||!/^[a-z0-9-]+$/.test(config.label))throw Error('Supply origin, output, kind and a simple label');
const address=new URL(config.origin);if(!['http:','https:'].includes(address.protocol)||address.username||address.password)throw Error('Use an HTTP(S) origin without credentials');
const weapons=config.kind==='bench'?['rifle','shotgun','missile','rail','blade']:['rifle','shotgun','missile','rail','blade','parallax'];
const actions=[...weapons.map(w=>'attack-'+w),'walk','hit-reaction','destruction'];
if(config.only&&!actions.includes(config.only))throw Error('Unknown motion action');
const output=path.resolve(config.out),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest={kind:config.kind,label:config.label,source:execFileSync('git',['rev-parse','HEAD'],{cwd:config['source-root'],encoding:'utf8'}).trim(),
 runner_sha256:sha(fs.readFileSync(__filename)),environment:'Chromium software WebGL. Fixed 30 Hz frames and controlled real timers; no performance claim.',strips:[],failures:[]};
async function poll(fn,message){const limit=Date.now()+120000;while(Date.now()<limit){if(await fn())return;await new Promise(done=>setTimeout(done,25));}throw Error(message);}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 try{
  for(const action of actions.filter(a=>!config.only||a===config.only)){
   console.log('START '+config.label+' '+action);
   const context=await browser.newContext({viewport:{width:1366,height:1024},deviceScaleFactor:1,reducedMotion:'no-preference',locale:'en-US',timezoneId:'UTC'});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   try{
    if(config.kind==='bench'&&action==='hit-reaction')await context.route(address.href,async route=>{
     const response=await route.fetch(),html=await response.text();
     const marker='const api=window.__bench=window.__bench||{};';assert.ok(html.includes(marker),'Reference War API marker');
     const hook=`${marker}
      api.captureHit=()=>{const b=W.units.find(u=>u.team==='ally'),a=W.units.find(u=>u.team==='enemy');
       for(const u of W.units){u.cd=100;u.fault.hold=2;u.m.cont.visible=u===b||u===a;}select(b);setCam('follow');
       RB.camGoal({az:-.52,el:.32,dist:20,fov:38,tgt:V3(b.x,2.4,b.z),k:4},true);RB.cam.goal.mode='follow';camUpdate(0);
       VA.BT.fx=realFX;applyDamage(b,'body',Math.max(1,Math.round(b.max.body*.05)),a,'rifle');return b.tag;};`;
     await route.fulfill({response,body:html.replace(marker,hook)});
    });
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>r.fulfill({path:path.join(root,'dist/rig-bench/vendor/three.min.js'),contentType:'text/javascript'}));
    await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,async r=>{
     const url=r.request().url();if(!cache.has(url))cache.set(url,fetchAsset('curl',['-fsS','--max-time','30',url],{encoding:'buffer',maxBuffer:8*1024*1024}).then(r=>r.stdout));
     await r.fulfill({body:await cache.get(url),contentType:new URL(url).hostname==='fonts.googleapis.com'?'text/css':'font/woff2'});
    });
    await page.addInitScript(()=>{let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};window.__motionImages=[];const Native=Image;window.Image=new Proxy(Native,{construct(T,args){const image=new T(...args);__motionImages.push(image);return image;}});});
    await page.clock.install({time:new Date('2026-11-11T00:00:00Z')});
    await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+100));
    const response=await page.goto(address.href,{waitUntil:'domcontentloaded',timeout:120000});
    const documentHash=sha(await response.body());
    await page.evaluate(()=>document.fonts.ready);
    await poll(()=>page.evaluate(kind=>kind==='bench'?!!window.RB?.bench?.m:!!document.querySelector('#nav button'),config.kind),'Application did not initialize');
    // Keep real timers under Playwright's clock while presenting one actual rAF
    // at each sample step. Timestamps advance, unlike the old pinned-5000 stub.
    await page.evaluate(()=>{const q=new Map();let id=0;window.requestAnimationFrame=f=>(q.set(++id,f),id);window.cancelAnimationFrame=k=>q.delete(k);window.__motionFrame=()=>{const list=[...q.values()];q.clear();for(const f of list)f(performance.now());};});
    const step=async seconds=>{for(let left=seconds;left>1e-7;){const dt=Math.min(1/30,left);await page.clock.runFor(dt*1000);await page.evaluate(()=>__motionFrame());left-=dt;}};
    await step(1/30);
    await poll(()=>page.evaluate(()=>[...__motionImages,...document.images].every(i=>!i.src||i.complete)),'Initial motion art did not load');
    if(config.kind==='game')await page.evaluate(action=>{
     save=fresh();createBattle(0,false,false,[0]);surveyTerrain(0);selected=0;const a=current(),b=battle.units.find(u=>u.team==='enemy'&&!u.kind);
     battle.units=[a,b];battle.cover.clear();for(const cell of battle.field.cells)cell.level=0;
     Object.assign(a,{x:8,z:10,vx:8,vz:10,heading:headingTo(1,0),attack:null});
     Object.assign(b,{x:9,z:10,vx:9,vz:10,heading:headingTo(-1,0),reacted:true});
     if(action==='walk')Object.assign(b,{x:12,z:10,vx:12,vz:10});
     if(action==='destruction')Object.assign(b,{x:10,z:10,vx:10,vz:10});
     b.hp.body=b.max.body=action==='destruction'?1:10000;
     const kind=action.startsWith('attack-')?action.slice(7):'rifle';if(weapon(kind).melee)a.melee=kind;else a.weapon=kind;
     closeModal();focusBattleCamera(a,true);viewZoom=1.65;battle.busy=true;renderBattle();window.__actors={a,b};
     const plan=planVolley;planVolley=(...args)=>{const random=Math.random;Math.random=()=>0;try{return plan(...args)}finally{Math.random=random;}};
    },action);
    else await page.evaluate(action=>{const B=RB.bench;RB.soundOn=false;B.S.weapon=action.startsWith('attack-')?action.slice(7):'rifle';B.rebuild();B.setView('orbit',true);if(action==='hit-reaction'){__bench.setMode('war');__bench.newBattle(4242);__bench.setRunning(false);}},action);
    await step(1/30);
    await poll(()=>page.evaluate(()=>[...__motionImages,...document.images].every(i=>!i.src||i.complete)),'Action art did not load');
    let start;
    if(config.kind==='game'){
     await page.evaluate(action=>{
      const {a,b}=__actors;window.__motionError=null;
      if(action==='walk')window.__action=moveUnit(a,9,10).catch(e=>{__motionError=e.message;});
      else window.__action=shoot(a,b,'body',weapon(action.startsWith('attack-')?action.slice(7):'rifle')).catch(e=>{__motionError=e.message;});
     },action);
     for(let i=0;i<180;i++){
      const state=await page.evaluate(action=>({error:__motionError,ready:action==='walk'?!!__actors.a.motion:action==='destruction'?!__actors.b.alive:!!__actors.a.attack,
       clock,start:action==='walk'?__actors.a.motion?.start:action==='destruction'?__actors.b.deathTime:__actors.a.attack&&(__actors.a.attack.start+__actors.a.attack.primeDuration+__actors.a.attack.windup)}),action);
      if(state.error)throw Error(state.error);
      if(state.ready){start=state.start;break;}await step(1/30);
     }
     assert.ok(Number.isFinite(start),'Real action started');
     if(action==='destruction')await page.evaluate(()=>focusBattleCamera(__actors.b,true));
     const begin=action.startsWith('attack-')?start-.1:start;
     while((await page.evaluate(()=>clock))<begin-1/60)await step(Math.min(1/30,begin-(await page.evaluate(()=>clock))));
    }else{
     await page.evaluate(action=>{const B=RB.bench;if(action==='walk')B.setWalk(true);else if(action==='destruction')B.wreck();else if(action==='hit-reaction'){window.__captureHitTag=__bench.captureHit();__bench.setRunning(true);}else B.fire();},action);
     const wait=action==='attack-blade'?.36:action.startsWith('attack-')?0:0;
     await step(wait);start=await page.evaluate(()=>VowAnim.BT.clock);
    }
    const frames=[],width=480,height=300,cols=4,count=16;
    const strip=createCanvas(width*cols,(height+24)*Math.ceil(count/cols)),g=strip.getContext('2d');g.fillStyle='#101820';g.fillRect(0,0,strip.width,strip.height);
    const duration=action==='destruction'?2.4:action==='walk'?1.1:action==='hit-reaction'?.8:.5;
    for(let i=0;i<count;i++){
     if(i)await step(duration/(count-1));
     await poll(()=>page.evaluate(()=>[...__motionImages,...document.images].every(image=>!image.src||image.complete)),'A motion-frame image failed to settle');
     const data=await page.evaluate(({kind,action})=>{
      const out=document.createElement('canvas');out.width=480;out.height=300;const c=out.getContext('2d');
      let meta;
      if(kind==='bench'){RB.renderFrame();c.drawImage(RB.R.domElement,0,0,480,300);meta=RB.mode==='war'?{clock:__bench.state.t,subject:__bench.state.units.find(u=>u.tag===window.__captureHitTag)}:{clock:VowAnim.BT.clock,meleeAge:RB.bench.m.melee?.age,deathAge:RB.bench.S.deathAge,fault:RB.bench.m.fault?.beat};}
      else{
       let x=0,y=H*.2,w=W,h=H*.62;
       if(action==='walk'){const p=project(8.5,0,10);x=p.x-320;y=p.y-370;w=640;h=450;}
       c.drawImage(canvas,x,y,w,h,0,0,480,300);
       meta={clock,fireAt:__actors.a.fireTime,phase:activeCinematic?.phase,hp:__actors.b.hp.body,alive:__actors.b.alive,motion:__actors.a.motion?{vx:__actors.a.vx,vz:__actors.a.vz}:null,effects:effects.map(e=>e.type)};
      }
      return {image:out.toDataURL('image/png').split(',')[1],meta};
     },{kind:config.kind,action});
     const bytes=Buffer.from(data.image,'base64'),image=await loadImage(bytes),x=i%cols*width,y=Math.floor(i/cols)*(height+24);
     g.drawImage(image,x,y+24,width,height);g.fillStyle='#e4e6e8';g.font='14px sans-serif';g.fillText((i+1)+' / '+(i*duration/(count-1)).toFixed(3)+' s',x+8,y+17);
     frames.push({...data.meta,png_sha256:sha(bytes)});
    }
    assert.ok(new Set(frames.map(f=>f.png_sha256)).size>=4,'Filmstrip shows distinct frames');assert.deepEqual(errors,[],'Motion page/console errors');
    const release=action==='destruction'?frames[0].clock:frames.find(f=>Number.isFinite(f.fireAt))?.fireAt;
    if(Number.isFinite(release))for(let i=0;i<frames.length;i++){const x=i%cols*width,y=Math.floor(i/cols)*(height+24);g.fillStyle='#101820';g.fillRect(x,y,width,24);g.fillStyle='#e4e6e8';g.fillText((i+1)+' / '+(frames[i].clock-release).toFixed(3)+' s from '+(action==='destruction'?'collapse':'fire'),x+8,y+17);}
    const file=config.label+'-'+action+'.png',bytes=strip.toBuffer('image/png');fs.writeFileSync(path.join(output,file),bytes);
    manifest.strips.push({action,file,sha256:sha(bytes),document_sha256:documentHash,
     ...(config.kind==='bench'&&action==='hit-reaction'?{instrumentation:'Temporary QA API calls existing War applyDamage. Unrelated actors are held and hidden to isolate the reaction; the reference file is unchanged.'}:{}),frames});console.log('SAVED '+file);
   }catch(error){manifest.failures.push({action,error:error.stack});console.error('FAILED '+action+': '+error.message);}
   finally{await context.close();fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');}
  }
 }finally{await browser.close();}
 if(manifest.failures.length)throw Error(manifest.failures.length+' filmstrips failed');
 console.log('Captured '+manifest.strips.length+' real motion filmstrips');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
