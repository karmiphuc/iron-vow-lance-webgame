/* Real reference-build checks. Optional captures are software-WebGL correctness evidence. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createServer}=require('node:http');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),fetchAsset=promisify(execFile),cache=new Map();
const args=process.argv.slice(2),config={};
for(let i=0;i<args.length;i+=2){
 if(args[i]==='--soak-only'){config.soakOnly=true;i--;continue;}
 if(!['--out','--baseline'].includes(args[i])||!args[i+1])throw Error('Usage: node qa/reference-vfx.cjs [--out directory] [--baseline rig-bench.html] [--soak-only]');
 config[args[i].slice(2)]=path.resolve(args[i+1]);
}
const source=fs.readFileSync(path.join(root,'docs/reference/claude/rig-bench.html'));
const baseline=config.baseline&&fs.readFileSync(config.baseline);
if(config.soakOnly&&!baseline)throw Error('--soak-only requires --baseline; no comparison can pass without a baseline');
const evidence={source_sha256:createHash('sha256').update(source).digest('hex'),environment:'Playwright Chromium; software WebGL; no device performance claim',checks:[],captures:[]};
async function main(){
 const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/baseline'&&baseline?baseline:source);});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
  async function open({touch=false,reduced=false,before=false}={}){
   const context=await browser.newContext({viewport:touch?{width:1194,height:834}:{width:1366,height:1024},deviceScaleFactor:1,hasTouch:touch,isMobile:touch,reducedMotion:reduced?'reduce':'no-preference'});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>r.fulfill({path:path.join(root,'dist/rig-bench/vendor/three.min.js'),contentType:'text/javascript'}));
   await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,async r=>{
    const url=r.request().url();
    if(!cache.has(url))cache.set(url,fetchAsset('curl',['-fsS','--max-time','30',url],{encoding:'buffer',maxBuffer:8*1024*1024}).then(v=>v.stdout));
    await r.fulfill({body:await cache.get(url),contentType:new URL(url).hostname==='fonts.googleapis.com'?'text/css':'font/woff2'});
   });
   await page.addInitScript(()=>{
    let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const frames=[];window.requestAnimationFrame=f=>(frames.push(f),frames.length);window.cancelAnimationFrame=()=>{};
    window.__referenceTick=t=>{for(const f of frames.splice(0))f(t);};
   });
   await page.goto('http://127.0.0.1:'+server.address().port+(before?'/baseline':'/current'),{waitUntil:'domcontentloaded',timeout:120000});
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>{RB.soundOn=false;window.__referenceTick(0);
    window.__stepReference=seconds=>{for(let left=seconds;left>1e-8;){const dt=Math.min(1/60,left);RB.bench.update(dt);RB.bench.camUpdate(dt);left-=dt;}};
   });
   return {context,page,errors};
  }
  async function screenshot(page,name){
   if(!config.out)return;
   await page.evaluate(()=>RB.renderFrame());
   fs.mkdirSync(config.out,{recursive:true});
   const file=name+'.png';await page.screenshot({path:path.join(config.out,file),timeout:120000});
   evidence.captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(config.out,file))).digest('hex')});
  }
  if(!config.soakOnly)for(const touch of [false,true]){
   const {context,page,errors}=await open({touch});
   try{
    for(const [kind,bursts,n] of [['rifle',3,13],['shotgun',1,20],['missile',3,28],['rail',1,16],['blade',1,18]]){
     const traces=await page.evaluate(kind=>{
      const B=RB.bench,VA=VowAnim;VA.clearPending();VA.BT.hitstop=0;B.S.weapon=kind;B.rebuild();__stepReference(1/60);
      const traces=[],spray=B.fx.spray;B.fx.spray=(...a)=>{traces.push({n:a[2],speed:a[3],cone:a[4],direction:a[1].toArray()});return spray(...a);};
      B.fire();__stepReference(1.7);B.fx.spray=spray;return traces;
     },kind);
     assert.equal(traces.length,bursts,kind+' landed rounds use the impact profile');
     for(const t of traces){assert.equal(t.n,Math.round(n*(touch?.6:1)));assert.ok(t.direction.every(Number.isFinite));assert.ok(t.direction[2]<0,'spray points back toward the shooter');}
     evidence.checks.push({device:touch?'touch':'desktop',kind,bursts:traces.length,particlesPerBurst:traces[0].n});
     if(!touch&&config.out){
      await page.evaluate(kind=>{const B=RB.bench;__stepReference(10);VowAnim.clearPending();B.rebuild();B.setView('orbit',true);__stepReference(1/60);
       VowAnim.impact(VowAnim.partPoint(B.m,'body'),new THREE.Vector3(0,.3,1),kind);},kind);
      let previous=0;
      for(const ms of [16,100,250]){await page.evaluate(dt=>__stepReference(dt),(ms-previous)/1000);await screenshot(page,kind+'-'+ms+'ms');previous=ms;}
     }
    }
    const critical=await page.evaluate(()=>{
     const B=RB.bench;VowAnim.clearPending();VowAnim.BT.hitstop=0;B.S.weapon='rifle';B.rebuild();B.setPart('body',1);
     let arcs=0;const arc=B.fx.arc;B.fx.arc=(...a)=>{arcs++;return arc(...a);};__stepReference(8);B.fx.arc=arc;return arcs;
    });
    assert.ok(critical>0,'critical damage produces natural arcs');
    const arcPixels=await page.evaluate(()=>{
     const T=THREE,R=RB.R,scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,1, -1,.1,20);
     scene.background=new T.Color(0);camera.position.set(0,0,8);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
     const fx=VowAnim.FX(scene,{arcs:1,lights:1,glow:1,fire:1,smoke:1,sparks:1,debris:1,streaks:1});
     const cover=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshBasicMaterial({color:0x555555}));cover.position.z=1;scene.add(cover);
     const target=new T.WebGLRenderTarget(256,128),pixels=new Uint8Array(256*128*4),samples=[];
     try{
      fx.arc(new T.Vector3(-1,0,0),new T.Vector3(1,0,0),1,1);fx.update(1/60);
      for(const state of ['exposed','behind-cover','in-front-of-cover']){
       cover.visible=state!=='exposed';if(state==='in-front-of-cover')cover.position.z=-1;
       R.setRenderTarget(target);R.render(scene,camera);R.readRenderTargetPixels(target,0,0,256,128,pixels);
       let blue=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>pixels[i]+20&&pixels[i+2]>pixels[i+1]+10)blue++;
       const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
       const image=canvas.getContext('2d').createImageData(256,128);
       for(let y=0;y<128;y++)image.data.set(pixels.subarray((127-y)*1024,(128-y)*1024),y*1024);
       canvas.getContext('2d').putImageData(image,0,0);samples.push({state,bluePixels:blue,png:canvas.toDataURL('image/png').split(',')[1]});
      }
     }finally{
      R.setRenderTarget(null);target.dispose();const disposed=new Set();scene.traverse(o=>{if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}for(const m of [o.material].flat().filter(Boolean))if(!disposed.has(m)){disposed.add(m);m.dispose();}});
     }
     return samples;
    });
    for(const {state,bluePixels,png} of arcPixels){
     evidence.checks.push({device:touch?'touch':'desktop',arcVisibility:state,bluePixels});
     if(config.out){fs.mkdirSync(config.out,{recursive:true});const file=(touch?'touch':'desktop')+'-arc-'+state+'.png';fs.writeFileSync(path.join(config.out,file),Buffer.from(png,'base64'));evidence.captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(config.out,file))).digest('hex')});}
    }
    assert.ok(arcPixels[0].bluePixels>100,'exposed electrical arc is visibly blue');
    assert.equal(arcPixels[1].bluePixels,0,'opaque foreground cover hides the electrical arc');
    assert.ok(arcPixels[2].bluePixels>100,'the same arc remains visible in front of cover');
    await page.evaluate(()=>{
     const B=RB.bench;B.rebuild();B.setPart('body',1);let fired=false;const original=B.fx.arc;
     B.fx.arc=(...args)=>{fired=true;return original(...args);};
     try{for(let i=0;i<600&&!fired;i++)__stepReference(1/60);if(!fired)throw Error('Natural critical arc never appeared');}finally{B.fx.arc=original;}
    });
    await screenshot(page,(touch?'touch':'desktop')+'-natural-critical-arc');
    const collapse=await page.evaluate(()=>{
     const B=RB.bench;B.rebuild();VowAnim.BT.hitstop=0;__stepReference(1/60);
     const count={arc:0,airwave:0,dustwave:0},original={};
     for(const key of Object.keys(count)){original[key]=B.fx[key];B.fx[key]=(...a)=>{count[key]++;return original[key](...a);};}
     B.setPart('body',2);__stepReference(.94);const before={...count};__stepReference(.04);const after={...count};
     for(const key of Object.keys(count))B.fx[key]=original[key];return {before,after};
    });
    assert.equal(collapse.before.dustwave,1,'initial body explosion has one dust wall');
    assert.equal(collapse.after.dustwave,2,'one additional ground-slam dust wall at 0.95 seconds');
    assert.equal(collapse.after.airwave,2,'explosion and ground slam each have one air shockwave');
    assert.ok(collapse.after.arc>0,'body collapse has electrical beats');
    if(!touch)await screenshot(page,'collapse-ground-slam');
    evidence.checks.push({device:touch?'touch':'desktop',naturalCriticalArcs:critical,collapse});
    assert.deepEqual(errors,[],'reference page/console errors');
    console.log('PASS '+(touch?'touch':'desktop')+' reference impact hooks, critical arcs and collapse');
   }finally{await context.close();}
  }
  if(!config.soakOnly){
   const {context,page,errors}=await open({reduced:true});
   try{
    const arcs=await page.evaluate(()=>{const B=RB.bench;let arcs=0;const arc=B.fx.arc;B.fx.arc=(...a)=>{arcs++;return arc(...a);};B.setPart('body',1);__stepReference(8);B.setPart('body',2);__stepReference(2);return arcs;});
    assert.equal(arcs,0,'reduced motion suppresses critical and collapse arcs');assert.deepEqual(errors,[]);evidence.checks.push({reducedMotion:true,arcs});
   }finally{await context.close();}
  }
  if(baseline){
   const runs=[];
   for(const before of [true,false]){
    const {context,page,errors}=await open({before});
    try{
     console.log('START 3-battle soak '+(before?'baseline':'current'));
     const result=await page.evaluate(async()=>{const r=await __bench.runSoak(3,4242,{render:false});return {battles:r.battles,ticks:r.ticks,simSeconds:r.simSeconds,seeds:r.seeds,winners:r.winners,byType:r.byType,anomalies:r.anomalies};});
     assert.deepEqual(errors,[]);runs.push(result);
    }finally{await context.close();}
   }
   const correctness=r=>({...r,byType:Object.fromEntries(Object.entries(r.byType).filter(([k])=>k!=='frameSpike')),anomalies:r.anomalies.filter(a=>a.type!=='frameSpike')});
   assert.deepEqual(correctness(runs[1]),correctness(runs[0]),'seeded outcomes and existing correctness anomalies match the previous reference');
   evidence.soak={seed:4242,battles:3,baseline:runs[0],current:runs[1],timingNote:'All raw anomalies are retained. frameSpike depends on host scheduling and is excluded from deterministic equality; no performance claim'};
  }
  evidence.status='passed';
  console.log(config.soakOnly?'PASS 3-battle reference seeded comparison':'PASS reference VFX: all five real hit hooks, touch particle counts, natural critical/collapse arcs, ground slam, reduced motion'+(baseline?', 3-battle seeded comparison':''));
 }finally{
  evidence.status??='incomplete';
  if(config.out){fs.mkdirSync(config.out,{recursive:true});fs.writeFileSync(path.join(config.out,'manifest.json'),JSON.stringify(evidence,null,2)+'\n');}
  await browser?.close();await new Promise(done=>server.close(done));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
