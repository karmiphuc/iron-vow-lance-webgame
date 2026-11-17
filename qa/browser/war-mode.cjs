const assert=require('node:assert/strict');
const runWar=require('../war-driver.cjs');

module.exports=async function checkWarMode({page,origin,mobile,out}){
 await page.addInitScript(()=>{
  localStorage.setItem('iron-vow-career','war-browser-fixture');
  window.careerDBOpens=0;
  const open=indexedDB.open.bind(indexedDB);
  indexedDB.open=(name,...options)=>{
   if(name==='iron-vow-career')window.careerDBOpens++;
   return open(name,...options);
  };
 });
 await page.goto(new URL('rig-bench/',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('a[href="?bench=war"]').click();
 await page.waitForURL('**/?bench=war');
 await page.waitForFunction(()=>window.__bench&&IronVowScene.ready,null,{timeout:120000});
 const scene=await page.evaluate(()=>({
  contexts:IronVowRenderer.metrics().contexts,
  ready:IronVowScene.ready,
  objects:IronVowScene.models.size,
  dbOpens:window.careerDBOpens,
  storage:localStorage.getItem('iron-vow-career'),
  controlsFit:[...document.querySelectorAll('.battle-links > *')].every(control=>
   control.getBoundingClientRect().right<=document.querySelector('.battle-top').getBoundingClientRect().right)
 }));
 assert.deepEqual([scene.contexts,scene.ready,scene.dbOpens,scene.storage],[1,true,0,'war-browser-fixture']);
 assert.ok(scene.objects>=6&&scene.controlsFit,JSON.stringify(scene));
 if(out&&!mobile)await require('./save-webp.cjs')(page,require('node:path').join(out,'war.webp'));
 const probes=await page.evaluate(()=>{
  const checkpoint=JSON.stringify(__ironVow.checkpoint()),checks=Object.keys(__bench.checks);
  return {checks,detected:checks.map(key=>__bench.inject(key)?.type),unchanged:checkpoint===JSON.stringify(__ironVow.checkpoint())};
 });
 assert.equal(probes.checks.length,19);
 assert.deepEqual(probes.detected,probes.checks);
 assert.equal(probes.unchanged,true);
 await page.getByRole('button',{name:'REPORT',exact:true}).click();
 await page.locator('#war-probe').selectOption('muzzleFar');
 await page.getByRole('button',{name:'RUN PROBE'}).click();
 assert.equal(await page.locator('#war-probe-result').textContent(),'muzzleFar detected');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.getByRole('button',{name:'COPY REPORT'}).click();
 const copied=await page.waitForFunction(async()=>Boolean(await navigator.clipboard.readText()));
 assert.ok(await copied.jsonValue());
 assert.ok(await page.evaluate(async()=>JSON.parse(await navigator.clipboard.readText()).diagnostics.ticks)>0);
 await page.getByRole('button',{name:'CLOSE',exact:true}).click();
 await page.clock.install({time:new Date('2026-11-16T12:00:00Z')});
 async function waitForReport(button,frames=320){
  for(let tick=0;tick<=frames;tick++){
   const result=await page.evaluate(button=>button
    ? (!__bench.running&&__bench.eventLog().length?{report:__bench.state}:null)
    : window.warResult??null,button);
   if(result){
    assert.equal(result.error,undefined,result.error);
    return result.report;
   }
   await page.clock.runFor(2000);
  }
  throw Error(await page.evaluate(()=>JSON.stringify({turn:__bench.state?.turn,events:__bench.eventLog().length,running:__bench.running})));
 }
 const parity=[];
 // Scattered hits finish Picket in round three; keep corridor bounded at two rounds.
 for(const options of [{seed:42,contract:0,maxTurns:3},{seed:42,contract:2,maxTurns:2}]){
  const expected=await runWar(options);
  const button=options.contract===0;
  await page.evaluate(options=>__bench.newBattle(options),options);
  if(button)await page.locator('#run-war').click();
  else await page.evaluate(()=>{
   window.warResult=null;
   void __bench.step().then(first=>{
    if(first.done||!first.event)throw Error('Missing first production action');
    return __bench.run();
   }).then(report=>window.warResult={report},error=>window.warResult={error:error.message});
  });
  const actual=await waitForReport(button);
  const diagnostics=await page.evaluate(()=>__bench.diagnostics());
  assert.ok(diagnostics.ticks>0&&diagnostics.combat.impact>0,JSON.stringify(diagnostics));
  assert.deepEqual(diagnostics.anomalies,[],JSON.stringify(diagnostics.anomalies));
  assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)),`seed ${options.seed} theater contract ${options.contract}`);
  parity.push({seed:options.seed,contract:options.contract,actions:actual.events.length,ticks:diagnostics.ticks});
  assert.deepEqual(actual.size,{width:18,depth:20});
  assert.ok(Number.isInteger(actual.terrainSeed)&&actual.events.some(action=>action.action==='endTurn'));
  assert.ok(actual.events.some(action=>action.log.some(line=>/returns fire|counters in melee/.test(line))));
  if(options.contract===0){assert.equal(actual.unfinished,false);assert.equal(actual.result.win,true);}
  else {
   assert.equal(actual.turn,3);
   assert.ok(actual.units.some(unit=>unit.kind==='tank'&&!unit.alive));
   assert.ok(actual.units.some(unit=>unit.kind==='helicopter'&&!unit.alive));
   assert.ok(actual.units.some(unit=>unit.team==='ally'&&unit.hp.body<unit.max.body));
  }
 }
 const count=Number(process.env.IRON_VOW_WAR_SOAK_BATTLES??2),turns=Number(process.env.IRON_VOW_WAR_SOAK_TURNS??1);
 await page.evaluate(({count,turns})=>{
  window.warResult=null;
  void __bench.runSoak(count,42,{maxTurns:turns}).then(report=>window.warResult={report},error=>window.warResult={error:error.message});
 },{count,turns});
 const soak=await waitForReport(false,Math.max(320,count*turns*200));
 assert.deepEqual(soak.seeds,Array.from({length:count},(_,i)=>42+i*7919));
 assert.equal(soak.battles,count);
 assert.deepEqual(soak.anomalies,[],JSON.stringify(soak.anomalies));
 assert.ok(soak.ticks>5&&Object.keys(soak.chassisWeapon).length&&Object.keys(soak.legsWeapon).length&&Object.keys(soak.theaterChassis).length);
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),'war-browser-fixture');
 console.log(`PASS 19 War fault probes and ${count} seeded soak encounters, up to ${turns} turns · ${soak.ticks} observed frames · zero anomalies · outcomes ${JSON.stringify(soak.winners)}`);
 console.log('PASS War mode uses game commands on two theaters with matching results, reactions, tank and gunship damage and untouched career storage');
 return {parity,probes:probes.checks,contexts:1,soak};
};
