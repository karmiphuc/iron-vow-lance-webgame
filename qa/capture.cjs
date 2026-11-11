/* Fixed-viewport visual baselines. Operates only on an explicitly supplied server. */
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFile,execFileSync}=require('node:child_process');
const {promisify}=require('node:util');
const {viewports,presets,setGamePreset}=require('./capture-presets.cjs');
const fetchPublicAsset=promisify(execFile),referenceAssets=new Map();
function options(args){
 const result={out:path.resolve(__dirname,'../design/baseline'),label:'current'};
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(flag==='--plan'){result.plan=true;continue;}if(flag==='--details'){result.details=true;continue;}if(flag==='--resume'){result.resume=true;continue;}
  if(!['--origin','--reference-game','--reference-bench','--out','--label','--preset','--asset-delay-ms','--source-root'].includes(flag)||!args[i+1])throw Error('Unknown/missing capture option: '+flag);
  result[flag.slice(2)]=args[++i];
 }
 if(!/^[a-z0-9-]+$/.test(result.label))throw Error('Use a simple alphanumeric capture label');
 if(result.preset&&!presets.some(p=>p.id===result.preset))throw Error('Unknown preset: '+result.preset);
 if(result['asset-delay-ms']!==undefined&&(!Number.isInteger(Number(result['asset-delay-ms']))||Number(result['asset-delay-ms'])<0||Number(result['asset-delay-ms'])>5000))throw Error('Use an asset delay between 0 and 5000 ms');
 for(const key of ['origin','reference-game','reference-bench'])if(result[key]){
  const url=new URL(result[key]);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP(S) URL without credentials');
 }
 return result;
}
async function capture(config){
 const selected=presets.filter(p=>(!config.preset||p.id===config.preset)&&(!config.details||p.paintChannel||p.detailPart||p.wreck));
 const plan={viewports,presets:selected};
 if(config.plan){console.log(JSON.stringify(plan,null,2));return;}
 if(!config.origin)throw Error('Supply --origin from your supported preview; this runner never starts a server');
 const sourceRoot=path.resolve(config['source-root']||path.join(__dirname,'..'));
 for(const cwd of new Set([__dirname,sourceRoot]))if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd,encoding:'utf8'}).trim())throw Error('Commit tracked source changes before capturing, so the manifest SHA identifies the source');
 const {chromium}=require('playwright');
 const executablePath=process.env.IRON_VOW_CHROME||(!fs.existsSync(chromium.executablePath())&&['/usr/bin/chromium','/usr/bin/google-chrome'].find(fs.existsSync))||undefined;
 let browser;
 const output=path.resolve(config.out);fs.mkdirSync(output,{recursive:true});
 const manifest={label:config.label,source:execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim(),runner_source:execFileSync('git',['rev-parse','HEAD'],{cwd:__dirname,encoding:'utf8'}).trim(),runner_sha256:createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),asset_delay_ms:Number(config['asset-delay-ms']||0),
  environment:'Headless Chromium. Software WebGL is correctness evidence, not device performance.',captures:[],retries:[],failures:[]};
 const previous=config.resume&&fs.existsSync(path.join(output,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8')):null;
 if(previous&&previous.source!==manifest.source)throw Error('Resume requires the same committed source');
 if(previous){const digest=createHash('sha256').update(JSON.stringify(previous)).digest('hex');fs.writeFileSync(path.join(output,'prior-'+digest+'.json'),JSON.stringify(previous,null,2)+'\n');manifest.previous_manifest='prior-'+digest+'.json';}
 const documentHashes=new Map();
 const jobs=selected.map(preset=>({source:config.label,preset,url:new URL(preset.path??'',config.origin).href}));
 if(config['reference-game'])for(const preset of selected.filter(p=>p.page||p.contract!==undefined&&!p.weapon))
  jobs.push({source:'reference-game',preset,url:config['reference-game']});
 if(config['reference-bench']&&(!config.preset||config.preset==='rig-bench'))
  jobs.push({source:'reference-bench',preset:{id:'rig-bench',path:'rig-bench/'},url:config['reference-bench']});
 manifest.expected_capture_count=jobs.length*viewports.length;
 const checkpoint=()=>{
  manifest.status=manifest.captures.length===manifest.expected_capture_count&&!manifest.failures.length?'complete':'incomplete';
  const temp=path.join(output,'manifest.json.tmp');
  fs.writeFileSync(temp,JSON.stringify(manifest,null,2)+'\n');
  fs.renameSync(temp,path.join(output,'manifest.json'));
 };
 try{
  browser=await chromium.launch({executablePath,args:['--enable-unsafe-swiftshader']});
  for(const viewport of viewports)for(const job of jobs)for(let attempt=0;attempt<2;attempt++){
   const retained=previous?.captures.find(c=>c.source===job.source&&c.preset===job.preset.id&&c.viewport.width===viewport.width&&c.viewport.height===viewport.height);
   if(retained&&fs.existsSync(path.join(output,retained.file))){
    const pngHash=createHash('sha256').update(fs.readFileSync(path.join(output,retained.file))).digest('hex');
    if(retained.png_sha256&&retained.png_sha256!==pngHash)throw Error('Retained screenshot hash mismatch: '+retained.file);
    if(!documentHashes.has(job.url)){const response=await fetch(job.url);if(!response.ok)throw Error('Cannot verify resumed source');documentHashes.set(job.url,createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'));}
    if(retained.document_sha256!==documentHashes.get(job.url))throw Error('Served document changed since the retained capture');
    manifest.captures.push({...retained,png_sha256:pngHash,retained:true});checkpoint();console.log('REUSE '+retained.file);break;
   }
   console.log('START '+job.source+' '+viewport.width+'x'+viewport.height+' '+job.preset.id);
   const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference',locale:'en-US',timezoneId:'UTC'});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
   if(config['asset-delay-ms'])await context.route(/-parts\.webp(?:\?|$)/,async route=>{await new Promise(done=>setTimeout(done,Number(config['asset-delay-ms'])));await route.continue();});
   page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
   page.on('requestfailed',request=>errors.push('Request failed: '+request.url().slice(0,180)));
   try{
    if(job.source.startsWith('reference-')){
     const vendor=fs.readFileSync(path.resolve(__dirname,'../dist/rig-bench/vendor/three.min.js'),'utf8');
     const shim='\n;(()=>{const Native=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Native,{construct(Type,args){const renderer=new Type(...args),render=renderer.render;renderer.render=function(...args){if(!window.__captureAdvanceOnly)return render.apply(this,args);};return renderer;}});})();';
     await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',route=>route.fulfill({body:vendor+shim,contentType:'text/javascript'}));
     manifest.reference_advance_policy='All 30 Hz CPU animation updates execute. Intermediate WebGL draws during unrecorded static time advances are omitted; the final frame renders normally. Motion filmstrips use their separate unmodified render path.';
     await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,async route=>{
      const url=route.request().url();
      try{
       if(!referenceAssets.has(url))referenceAssets.set(url,fetchPublicAsset('curl',['-fsS','--max-time','30',url],{encoding:'buffer',maxBuffer:8*1024*1024}).then(result=>result.stdout));
       await route.fulfill({body:await referenceAssets.get(url),contentType:new URL(url).hostname==='fonts.googleapis.com'?'text/css':'font/woff2'});
      }catch{errors.push('Reference font could not be fetched: '+url);await route.abort();}
     });
    }
    await page.addInitScript(()=>{
     let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
     const frames=new Map();let id=0;
     window.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};
     window.cancelAnimationFrame=key=>frames.delete(key);
     window.__captureTick=(time=5000)=>{const queued=[...frames.values()];frames.clear();for(const callback of queued)callback(time);};
     window.__capturePending=0;
     const fetchNative=window.fetch.bind(window);
     window.fetch=(...args)=>{window.__capturePending++;return fetchNative(...args).finally(()=>window.__capturePending--);};
     const sendNative=XMLHttpRequest.prototype.send;
     XMLHttpRequest.prototype.send=function(...args){
      window.__capturePending++;this.addEventListener('loadend',()=>window.__capturePending--,{once:true});
      try{return sendNative.apply(this,args);}catch(error){window.__capturePending--;throw error;}
     };
     const NativeImage=window.Image;window.__captureImages=new Set();
     const getContext=HTMLCanvasElement.prototype.getContext;window.__captureWebGL=new WeakMap();
     HTMLCanvasElement.prototype.getContext=function(...args){const context=getContext.apply(this,args);if(context&&/^(webgl2?|experimental-webgl)$/.test(args[0]))window.__captureWebGL.set(this,context);return context;};
     window.__captureActiveImages=()=>{const images=[];for(const ref of window.__captureImages){const image=ref.deref();if(image)images.push(image);else window.__captureImages.delete(ref);}return images;};
     window.Image=new Proxy(NativeImage,{construct(target,args){const image=new target(...args);window.__captureImages.add(new WeakRef(image));return image;}});
    });
    const response=await page.goto(job.url,{waitUntil:'domcontentloaded',timeout:120000});
    const documentHash=createHash('sha256').update(await response.body()).digest('hex');
    await page.evaluate(()=>document.fonts.ready);
    if(!job.preset.path){
     if(job.source==='reference-game'&&job.preset.paint){
      await page.evaluate(preset=>{save=fresh();battle=null;selected=0;effects=[];clock=5;last=5000-1000/60;page='workshop';const u=save.units[0];u.paint={p:'#708657',s:'#373b38',a:'#c19960'};if(preset.paintChannel){u.frame=3;u.paint[preset.paintChannel]=preset.paintChannel==='p'?'#be5143':preset.paintChannel==='s'?'#5c82b3':'#dfb92f';}render();document.querySelector('section.paint')?.scrollIntoView({block:'center',behavior:'instant'});},job.preset);
     }else{
      const fixture={...job.preset};
      if(job.source==='reference-game'&&fixture.contract!==undefined){
       const name={1:'Ashes of the relay',2:'The iron corridor',3:'No quiet frontier'}[fixture.contract];
       fixture.contract=await page.evaluate(name=>CONTRACTS.findIndex(c=>c.name.toLowerCase()===name.toLowerCase()),name);
       if(fixture.contract<0)throw Error('Reference theater not found: '+name);
      }
      await page.evaluate(setGamePreset,fixture);
     }
    }
    // The contact flash requests a part mask lazily. Warm that state before the
    // final shot, so a slow mask response cannot leave the screenshot incomplete.
    if(job.preset.weapon)await page.evaluate(()=>{activeCinematic.target.hitTime=5-.06;activeCinematic.target.hitPart='body';});
    // Render once to request lazy art, then wait for all art and repeat. Fixed game clock.
    for(let pass=0;pass<4;pass++){
     await page.evaluate(()=>{if(typeof clock!=='undefined'){clock=5;last=5000-1000/60;}window.__captureTick();});
     await page.waitForFunction(()=>window.__capturePending===0&&[...window.__captureActiveImages(),...document.images].every(image=>!image.src||image.complete),null,{polling:50,timeout:120000});
    }
    if(job.preset.path&&job.source!=='reference-bench'){
     await page.waitForFunction(()=>document.body.dataset.rigModel==='painted',null,{polling:50,timeout:120000});
     await page.evaluate(()=>window.__captureTick());
    }
    if(job.preset.weapon)await page.evaluate(()=>{
     const sequence=activeCinematic,target=sequence.target;
     target.hitTime=5-.06;target.hitPart='body';
     effects.push({type:'boom',target:target.id,part:'body',x:target.x,z:target.z,t:.82,
      light:Boolean(sequence.w.burst),broken:false,fxKind:weaponMotion(sequence.w.id),fxSeed:101,nx:-1,ny:-.2});
     clock=5;last=5000-1000/60;window.__captureTick();
    });
    if(job.preset.advanceSeconds){
     await page.evaluate(seconds=>{window.__captureAdvanceOnly=true;try{for(let i=1;i<=Math.ceil(seconds*30);i++)window.__captureTick(5000+i*1000/30);}finally{window.__captureAdvanceOnly=false;}},job.preset.advanceSeconds);
     await page.waitForFunction(()=>window.__capturePending===0&&[...window.__captureActiveImages(),...document.images].every(image=>!image.src||image.complete),null,{polling:50,timeout:120000});
     await page.evaluate(seconds=>window.__captureTick(5000+(Math.ceil(seconds*30)+1)*1000/30),job.preset.advanceSeconds);
     await page.waitForFunction(()=>window.__capturePending===0&&[...window.__captureActiveImages(),...document.images].every(image=>!image.src||image.complete),null,{polling:50,timeout:120000});
    }
    const broken=await page.evaluate(()=>[...window.__captureActiveImages(),...document.images].filter(image=>image.src&&(!image.complete||!image.naturalWidth)).map(image=>image.src));
    let webglSample;
    if(job.preset.path)webglSample=await page.evaluate(()=>{
     // Sample immediately after a real render: non-preserved WebGL buffers can
     // otherwise clear between tasks even when the compositor retains the frame.
     window.__captureTick();
     const canvas=document.getElementById('c'),gl=window.__captureWebGL.get(canvas);
     if(!gl||gl.isContextLost())throw Error('Rig Bench WebGL context is unavailable or lost');
     const sample=document.createElement('canvas');sample.width=sample.height=32;
     const g=sample.getContext('2d');g.drawImage(canvas,0,0,32,32);
     const pixels=g.getImageData(0,0,32,32).data;let bright=0;
     for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>16)bright++;
     if(bright<64)throw Error('Rig Bench WebGL canvas is blank: '+bright+'/1024 non-black samples');
     return {non_black_samples:bright,total_samples:1024,context_lost:false};
    });
    if(broken.length)throw Error('Unloaded/broken images: '+JSON.stringify(broken));
    if(errors.length)throw Error(errors.join('\n'));
    const filename=job.source+'/'+viewport.width+'x'+viewport.height+'/'+job.preset.id+'.png';
    fs.mkdirSync(path.dirname(path.join(output,filename)),{recursive:true});
    await page.screenshot({path:path.join(output,filename),animations:'disabled',timeout:120000});
    manifest.captures.push({source:job.source,preset:job.preset.id,viewport,file:filename,document_sha256:documentHash,png_sha256:createHash('sha256').update(fs.readFileSync(path.join(output,filename))).digest('hex'),attempt:attempt+1,...(webglSample?{webgl_sample:webglSample}:{})});
    checkpoint();
    console.log('SAVED '+filename);
    break;
   }catch(error){const failure={source:job.source,preset:job.preset.id,viewport,error:error.message};if(attempt===0){console.error('RETRY '+job.source+' '+job.preset.id+': '+error.message);manifest.retries.push(failure);}else{console.error('FAILED '+job.source+' '+job.preset.id+': '+error.message);manifest.failures.push(failure);}checkpoint();}
   finally{await context.close();}
  }
 }finally{
  await browser?.close();
  checkpoint();
 }
 const sources=[...new Set(manifest.captures.map(c=>c.source))];
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=viewports.flatMap(v=>selected.map(p=>'<tr><th>'+p.id+'<br>'+v.width+'×'+v.height+'</th>'+sources.map(s=>{
  const match=manifest.captures.find(c=>c.source===s&&c.preset===p.id&&c.viewport.width===v.width&&c.viewport.height===v.height);
  return '<td>'+(match?'<a href="'+escape(match.file)+'"><img loading="lazy" width="420" src="'+escape(match.file)+'"></a>':'No matching capture')+'</td>';
 }).join('')+'</tr>'));
 fs.writeFileSync(path.join(output,'contact-sheet.html'),'<!doctype html><meta charset="utf-8"><title>Iron Vow captures</title><style>body{background:#111;color:#eee;font:14px system-ui}td,th{padding:8px;vertical-align:top}img{max-width:35vw}</style><h1>Iron Vow captures</h1><p>Source '+escape(manifest.source)+'. Check manifest.json for failures.</p><table><tr><th>Preset</th>'+sources.map(s=>'<th>'+s+'</th>').join('')+'</tr>'+rows.join('')+'</table>');
 if(manifest.failures.length)throw Error(manifest.failures.length+' captures failed; see manifest.json');
 console.log('Captured '+manifest.captures.length+' views in '+output);
}
if(require.main===module)capture(options(process.argv.slice(2))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={options,capture};
