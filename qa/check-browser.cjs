const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const sharedScene=require('./browser/shared-scene.cjs'),livePaint=require('./browser/live-paint.cjs'),billboards=require('./browser/billboards.cjs');
const {createReadStream,existsSync,mkdtempSync}=require('node:fs');
const {stat}=require('node:fs/promises');
const {createServer}=require('node:http');
const {tmpdir}=require('node:os');
const {extname,join,resolve,sep}=require('node:path');
const {chromium,devices}=require('playwright');
const checkCampaign=require('./browser/campaign.cjs');
const checkWardenRigBench=require('./browser/warden-rig-bench.cjs');
const checkBulwarkBench=require('./browser/bulwark-bench.cjs');
const checkScoutBench=require('./browser/scout-bench.cjs');
const checkShip=require('./browser/ship.cjs');
const checkHangar=require('./browser/hangar.cjs');
const checkCareerTabs=require('./browser/career-tabs.cjs');
const checkDutyRoster=require('./browser/duty-roster.cjs');
const checkBastionGrips=require('./browser/bastion.cjs');
const checkArmory=require('./browser/armory.cjs');
const checkLineInfantry=require('./browser/line-infantry.cjs');
const checkInfantryCarry=require('./browser/infantry-carry.cjs');
const checkLineElite=require('./browser/line-elite.cjs');
const checkVanguard=require('./browser/vanguard.cjs');
const checkReaver=require('./browser/reaver.cjs');
const checkAero=require('./browser/aero.cjs');
const checkLionTrial=require('./browser/lion-trial.cjs');
const checkShields=require('./browser/shields.cjs');
const checkTerrain=require('./browser/terrain.cjs');
const checkRidgeCombat=require('./browser/ridge-combat.cjs');
const checkMovePreview=require('./browser/move-preview.cjs');
const checkPairedWalk=require('./browser/paired-walk.cjs');
const checkMechComputer=require('./browser/mech-computer.cjs');
const dist=resolve(__dirname,'../dist');

const types={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2',
 '.glb':'model/gltf-binary','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'
};

async function serve(){
 const server=createServer(async(req,res)=>{
  try{
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   let file=resolve(dist,'.'+path);
   if(file!==dist&&!file.startsWith(dist+sep)){res.writeHead(403).end();return}
   if((await stat(file)).isDirectory())file=join(file,'index.html');
   const info=await stat(file);
   if(!info.isFile()){res.writeHead(404).end();return}
   res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Content-Length':info.size});
   if(req.method==='HEAD'){res.end();return}
   createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404).end()}
 });
 await new Promise((ready,fail)=>server.once('error',fail).listen(0,'127.0.0.1',ready));
 return server;
}

function browserPath(){
 if(process.env.IRON_VOW_CHROME)return resolve(process.env.IRON_VOW_CHROME);
 if(existsSync(chromium.executablePath()))return undefined;
 return [
  ...['ProgramFiles','ProgramFiles(x86)','LOCALAPPDATA'].filter(key=>process.env[key])
   .map(key=>join(process.env[key],'Google','Chrome','Application','chrome.exe')),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome','/usr/bin/chromium'
 ].find(existsSync);
}

async function checkBrowser(origin,scenarios=[sharedScene,livePaint,billboards,checkLionTrial,checkPairedWalk,checkMechComputer,checkMovePreview,checkRidgeCombat,checkTerrain,checkShields,checkLineInfantry,checkLineElite,checkInfantryCarry,checkVanguard,checkReaver,checkAero,checkArmory,checkCampaign,checkWardenRigBench,checkBulwarkBench,checkScoutBench,checkShip,checkHangar,checkCareerTabs,checkDutyRoster,checkBastionGrips]){
 if(process.env.IRON_VOW_QA_SCENARIOS){const names=process.env.IRON_VOW_QA_SCENARIOS.split(',');scenarios=scenarios.filter(s=>names.includes(s.name));assert.equal(scenarios.length,names.length,'Every requested browser scenario exists');}
 const attempts=Number(process.env.IRON_VOW_QA_ATTEMPTS||3);assert.ok(Number.isInteger(attempts)&&attempts>=1&&attempts<=3);
 const cpuFlows=new Set(['checkPairedWalk','checkMechComputer','checkMovePreview','checkRidgeCombat','checkTerrain','checkLineInfantry','checkLineElite','checkInfantryCarry','checkVanguard','checkReaver','checkAero','checkArmory','checkCampaign','checkShip','checkHangar','checkCareerTabs','checkDutyRoster']);
 const timeout=Number(process.env.IRON_VOW_QA_TIMEOUT_MS??15000);
 if(!Number.isFinite(timeout)||timeout<1000||timeout>120000)throw Error('IRON_VOW_QA_TIMEOUT_MS must be between 1000 and 120000.');
 const server=origin?null:await serve();
 const git=(...args)=>execFileSync('git',args,{cwd:resolve(__dirname,'..'),encoding:'utf8'}).trim();
 const report={started:new Date().toISOString(),commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),distDirty:Boolean(git('status','--porcelain','--','dist')),runnerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),softwareBehaviorDPR:process.env.IRON_VOW_SOFTWARE_QA?.5:null,scenarios:scenarios.map(s=>({name:s.name,sha256:crypto.createHash('sha256').update(s.toString()).digest('hex')})),checks:[],status:'incomplete'};
 let browser;
 try{
  const url=new URL(origin??`http://127.0.0.1:${server.address().port}/`);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS game URL.');
  const executablePath=browserPath();
  if(!executablePath&&!existsSync(chromium.executablePath()))throw Error('Install Chromium with npx playwright install chromium in qa, or set IRON_VOW_CHROME.');
  browser=await chromium.launch({executablePath,args:['--enable-unsafe-swiftshader']});
  // Short animation stages can be missed by software-rendered CI frames. Retry in
  // fresh storage/contexts without relaxing any assertion; persistent failures fail.
  async function checkDevice(mobile){for(const scenario of scenarios){for(let attempt=0;attempt<attempts;attempt++){
   const label=(mobile?'mobile touch':'desktop')+' '+scenario.name;
   const context=await browser.newContext({
    ...(mobile?{...devices['iPhone 13'],deviceScaleFactor:1}:{viewport:{width:1440,height:1000}}),
    // Behavioral software-GL runs reduce resolution; capture.cjs retains its declared resolution.
    ...(process.env.IRON_VOW_SOFTWARE_QA?{deviceScaleFactor:.5}:{}),
    reducedMotion:'reduce'
   });
   const cpuFlow=Boolean(process.env.IRON_VOW_SOFTWARE_QA&&cpuFlows.has(scenario.name));
   if(cpuFlow)await context.addInitScript(()=>{
    // These cases assert UI/rules or temporary 2D sheet data. The separate visual
    // cases and capture workflow always submit real GPU frames. Keep actual game
    // commands, source animation, geometry, picking and image decoding untouched.
    const withoutGPU=fn=>function(...args){const r=IronVowRenderer.get(),render=r.render,read=r.readRenderTargetPixels;r.render=(scene,camera)=>{scene.updateMatrixWorld();camera.updateMatrixWorld();};r.readRenderTargetPixels=()=>{};try{return fn.apply(this,args);}finally{r.render=render;r.readRenderTargetPixels=read;}};
    for(const name of ['IronVowScene','IronVowFoundry'])Object.defineProperty(window,name,{configurable:true,set(api){if(name==='IronVowScene'){const render=api.render;let first=true;api.render=function(...args){if(first){first=false;return render.apply(this,args);}return withoutGPU(render).apply(this,args);};}else for(const method of ['preview','previewAnimated'])api[method]=withoutGPU(api[method]);Object.defineProperty(window,name,{value:api,writable:true,configurable:true});}});
   });
   const page=await context.newPage(),errors=[];
   page.setDefaultTimeout(timeout);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',res=>{
    if(res.status()>=400&&new URL(res.url()).origin===url.origin)errors.push(res.status()+' '+res.url());
   });
   const tap=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
   try{
    console.log('START '+label);
    await scenario({context,page,mobile,origin:url.href,tap});
    assert.deepEqual(errors,[],'browser and asset errors');
    report.checks.push({name:scenario.name,device:mobile?'touch':'desktop',attempt:attempt+1,status:'passed',renderPolicy:cpuFlow?'UI/rules/sheet correctness; first main scene frame submitted, later unobserved GPU draws/readbacks omitted.':'Full GPU rendering'});
    console.log('PASS '+label);
    break;
   }catch(error){
    report.checks.push({name:scenario.name,device:mobile?'touch':'desktop',attempt:attempt+1,status:'failed',error:error.message,assetErrors:errors});
    console.error(label+' failed: '+error.stack);
    const capture=join(mkdtempSync(join(tmpdir(),'iron-vow-qa-')),'failure.png');
    try{await page.screenshot({path:capture,timeout:3000});console.error('Browser failure screenshot '+capture)}catch{}
    if(attempt<attempts-1)console.error('RETRY '+label+' ('+(attempt+1)+'/'+(attempts-1)+'): '+error.message);
    else throw Error(label+' failed: '+error.message,{cause:error});
   }finally{await context.close()}
  }}}
  if(process.env.IRON_VOW_QA_SERIAL==='1'){
   await checkDevice(false);
   await checkDevice(true);
  }else{
   const results=await Promise.allSettled([checkDevice(false),checkDevice(true)]);
   for(const result of results)if(result.status==='rejected')throw result.reason;
  }
  report.status='complete';
 }finally{
  report.ended=new Date().toISOString();if(process.env.IRON_VOW_QA_REPORT){const file=resolve(process.env.IRON_VOW_QA_REPORT);fs.writeFileSync(file+'.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
  try{await browser?.close()}finally{if(server)await new Promise(done=>server.close(done))}
 }
}

if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length!==0&&(args.length!==2||args[0]!=='--url')){
  console.error('Usage: node qa/check-browser.cjs [--url https://example.com/]');
  process.exitCode=64;
 }else checkBrowser(args[1]).catch(error=>{console.error(error);process.exitCode=1});
}
module.exports=checkBrowser;
