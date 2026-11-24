const checkNightjarStop=require('./browser/nightjar-stop.cjs');
const checkPilotClasses=require('./browser/pilot-classes.cjs');
const checkVariableLance=require('./browser/variable-lance.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const sharedScene=require('./browser/shared-scene.cjs'),livePaint=require('./browser/live-paint.cjs'),vehicleLoading=require('./browser/vehicle-loading.cjs');
const {createReadStream,existsSync,mkdtempSync}=require('node:fs');
const {stat}=require('node:fs/promises');
const {createServer}=require('node:http');
const {tmpdir}=require('node:os');
const {extname,join,resolve,sep}=require('node:path');
const {chromium,devices}=require('playwright');
const checkNavigation=require('./browser/navigation.cjs');
const checkCampaign=require('./browser/campaign.cjs');
const checkStartingLance=require('./browser/starting-lance.cjs');
const stockCareer=JSON.stringify(require('./fixtures/stock-career.json'));
const checkLivePortraits=require('./browser/live-portraits.cjs');
const checkWardenRigBench=require('./browser/warden-rig-bench.cjs');
const checkBulwarkBench=require('./browser/bulwark-bench.cjs');
const checkScoutBench=require('./browser/scout-bench.cjs');
const checkShip=require('./browser/ship.cjs');
const checkOverworld=require('./browser/overworld.cjs');
const checkOverworldLiving=require('./browser/overworld-living.cjs');
const checkDirectorate=require('./browser/directorate.cjs');
const checkOverworldPortEvents=require('./browser/overworld-port-events.cjs');
const checkDecisionUI=require('./browser/decision-ui.cjs');
const checkCombatReadability=require('./browser/combat-readability.cjs');
const checkCombatDuel=require('./browser/combat-duel.cjs');
const checkDuelTerrain=require('./browser/duel-terrain.cjs');
const checkHangar=require('./browser/hangar.cjs');
const checkHangarLive=require('./browser/hangar-live.cjs');
const checkWorkshopTurntable=require('./browser/workshop.cjs');
const checkWorkshopPaint=require('./browser/workshop-paint.cjs');
const checkWorkshopPortraits=require('./browser/workshop-portraits.cjs');
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
const checkRosterScale=require('./browser/roster-scale.cjs');
const checkAeroReview=require('./browser/aero-review.cjs');
const checkGizaReview=require('./browser/giza-review.cjs');
const checkHuskyReview=require('./browser/husky-review.cjs');
const checkLimbLoss=require('./browser/limb-loss.cjs');
const checkFieldArt=require('./browser/field-art.cjs');
const checkStockV2=require('./browser/stock-v2.cjs');
const checkMechLoadoutPoses=require('./browser/mech-loadout-poses.cjs');
const checkMeleeGrip=require('./browser/melee-grip.cjs');
const checkAshigaruV2=require('./browser/ashigaru-v2.cjs');
const checkBulwark=require('./browser/bulwark-v2.cjs');
const checkBehemothBudget=require('./browser/behemoth-budget.cjs');
const checkLionTrial=require('./browser/lion-trial.cjs');
const checkShields=require('./browser/shields.cjs');
const checkEquipmentHardpoints=require('./browser/equipment-hardpoints.cjs');
const checkTerrain=require('./browser/terrain.cjs');
const checkRidgeCombat=require('./browser/ridge-combat.cjs');
const checkMovePreview=require('./browser/move-preview.cjs');
const checkPairedWalk=require('./browser/paired-walk.cjs');
const checkMechComputer=require('./browser/mech-computer.cjs');
const checkVehicles=require('./browser/vehicles.cjs');
const checkGatecrasherV2=require('./browser/gatecrasher-v2.cjs');
const checkHellbreakerV2=require('./browser/hellbreaker-v2.cjs');
const checkShogunV2=require('./browser/shogun-v2.cjs');
const checkRigWorkbench=require('./browser/workbench.cjs');
const checkRegionalFrames=require('./browser/regional-frames.cjs');
const checkSaltWorks=require('./browser/salt-works.cjs');
const checkSaltjackMotion=require('./browser/saltjack-motion.cjs');
const checkTacticalSpecials=require('./browser/tactical-specials.cjs');
const checkCampaignNativeRigs=require('./browser/campaign-native-rigs.cjs');
const checkWarMode=require('./browser/war-mode.cjs');
const checkCicadaV2=require('./browser/cicada-v2.cjs');
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

async function checkBrowser(origin,scenarios=[checkLimbLoss,checkFieldArt,checkNavigation,checkCombatReadability,checkCombatDuel,checkDuelTerrain,checkDecisionUI,sharedScene,livePaint,vehicleLoading,checkLivePortraits,checkLionTrial,checkPairedWalk,checkMechComputer,checkMovePreview,checkRidgeCombat,checkTerrain,checkVehicles,checkGatecrasherV2,checkCicadaV2,checkHellbreakerV2,checkShogunV2,checkShields,checkEquipmentHardpoints,checkLineInfantry,checkLineElite,checkInfantryCarry,checkVanguard,checkReaver,checkAero,checkAeroReview,checkRosterScale,checkGizaReview,checkHuskyReview,checkStockV2,checkMechLoadoutPoses,checkMeleeGrip,checkAshigaruV2,checkBulwark,checkBehemothBudget,checkArmory,checkCampaign,checkStartingLance,checkWardenRigBench,checkBulwarkBench,checkScoutBench,checkShip,checkOverworld,checkOverworldLiving,checkDirectorate,checkOverworldPortEvents,checkHangar,checkHangarLive,checkWorkshopTurntable,checkWorkshopPaint,checkWorkshopPortraits,checkCareerTabs,checkDutyRoster,checkBastionGrips,checkWarMode,checkRigWorkbench,checkRegionalFrames,checkSaltWorks,checkSaltjackMotion,checkTacticalSpecials,checkCampaignNativeRigs,checkVariableLance,checkPilotClasses,checkNightjarStop]){
 if(process.env.IRON_VOW_QA_SCENARIOS){const names=process.env.IRON_VOW_QA_SCENARIOS.split(',');scenarios=scenarios.filter(s=>names.includes(s.name));assert.equal(scenarios.length,names.length,'Every requested browser scenario exists');}
 const attempts=Number(process.env.IRON_VOW_QA_ATTEMPTS||3);assert.ok(Number.isInteger(attempts)&&attempts>=1&&attempts<=3);
 const cpuFlows=new Set(['checkPilotClasses','checkCombatDuel','checkPairedWalk','checkMechComputer','checkMovePreview','checkRidgeCombat','checkTerrain','checkLineInfantry','checkLineElite','checkInfantryCarry','checkVanguard','checkReaver','checkAero','checkArmory','checkCampaign','checkShip','checkHangar','checkCareerTabs','checkDutyRoster','checkVariableLance']);
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
   if(scenario!==checkStartingLance)await context.addInitScript(({origin,career})=>{
    if(location.origin===origin&&localStorage.getItem('iron-vow-career')===null)localStorage.setItem('iron-vow-career',career);
   },{origin:url.origin,career:stockCareer});
   const cpuFlow=Boolean(process.env.IRON_VOW_SOFTWARE_QA&&cpuFlows.has(scenario.name));
   if(cpuFlow)await context.addInitScript(()=>{
    // These cases assert UI/rules or temporary 2D sheet data. The separate visual
    // cases and capture workflow always submit real GPU frames. Keep actual game
    // commands, source animation, geometry, picking and image decoding untouched.
    const withoutGPU=fn=>function(...args){const r=IronVowRenderer.get(),render=r.render,read=r.readRenderTargetPixels;r.render=(scene,camera)=>{scene.updateMatrixWorld();camera.updateMatrixWorld();};r.readRenderTargetPixels=()=>{};try{return fn.apply(this,args);}finally{r.render=render;r.readRenderTargetPixels=read;}};
    for(const name of ['IronVowScene','IronVowFoundry'])Object.defineProperty(window,name,{configurable:true,set(api){if(name==='IronVowScene'){const render=api.render;let first=true;api.render=function(...args){if(first){first=false;return render.apply(this,args);}return withoutGPU(render).apply(this,args);};}else for(const method of ['preview','previewAnimated'])api[method]=withoutGPU(api[method]);Object.defineProperty(window,name,{value:api,writable:true,configurable:true});}});
   });
   const page=await context.newPage(),errors=[],consoleErrors=[];
   page.setDefaultTimeout(timeout);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
   page.on('response',res=>{
    if(res.status()>=400&&new URL(res.url()).origin===url.origin)errors.push(res.status()+' '+res.url());
   });
   const tap=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
   try{
    console.log('START '+label);
    await scenario({context,page,mobile,origin:url.href,tap});
    assert.deepEqual(errors,[],'browser and asset errors');
    report.checks.push({name:scenario.name,device:mobile?'touch':'desktop',attempt:attempt+1,status:'passed',renderPolicy:cpuFlow?'UI and rules correctness; first main scene frame submitted, later unobserved GPU draws/readbacks omitted.':'Full GPU rendering'});
    console.log('PASS '+label);
    break;
   }catch(error){
    report.checks.push({name:scenario.name,device:mobile?'touch':'desktop',attempt:attempt+1,status:'failed',error:error.message,assetErrors:errors,consoleErrors});
    console.error(label+' failed: '+error.stack);
    if(consoleErrors.length)console.error('Browser console errors: '+consoleErrors.join('\n'));
    const capture=join(mkdtempSync(join(tmpdir(),'iron-vow-qa-')),'failure.png');
    try{await page.screenshot({path:capture,timeout:3000});console.error('Browser failure screenshot '+capture)}catch{}
    if(attempt<attempts-1)console.error('RETRY '+label+' ('+(attempt+1)+'/'+(attempts-1)+'): '+error.message);
    else throw Error(label+' failed: '+error.message,{cause:error});
   }finally{await context.close()}
  }}}
  const deviceFilter=process.env.IRON_VOW_QA_DEVICES||'both';assert.ok(['desktop','touch','both'].includes(deviceFilter));
  if(deviceFilter==='desktop')await checkDevice(false);
  else if(deviceFilter==='touch')await checkDevice(true);
  else if(process.env.IRON_VOW_QA_SERIAL==='1'){
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
