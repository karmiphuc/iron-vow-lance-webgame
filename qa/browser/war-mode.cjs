const assert=require('node:assert/strict');
const runWar=require('../war-driver.cjs');

module.exports=async function checkWarMode({page,origin}){
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
 await page.locator('a[href="../?bench=war"]').click();
 await page.waitForURL('**/?bench=war');
 await page.waitForFunction(()=>window.__bench&&IronVowScene.ready,null,{timeout:120000});
 const scene=await page.evaluate(()=>({
  contexts:IronVowRenderer.metrics().contexts,
  ready:IronVowScene.ready,
  objects:IronVowScene.models.size,
  dbOpens:window.careerDBOpens,
  storage:localStorage.getItem('iron-vow-career')
 }));
 assert.deepEqual([scene.contexts,scene.ready,scene.dbOpens,scene.storage],[1,true,0,'war-browser-fixture']);
 assert.ok(scene.objects>=6,JSON.stringify(scene));
 await page.clock.install({time:new Date('2026-11-16T12:00:00Z')});
 async function waitForReport(button){
  for(let tick=0;tick<=320;tick++){
   const result=await page.evaluate(button=>button
    ? (!__bench.running&&__bench.eventLog().length?{report:__bench.state}:null)
    : window.warResult??null,button);
   if(result){
    assert.equal(result.error,undefined,result.error);
    return result.report;
   }
   await page.clock.fastForward(2000);
  }
  throw Error(await page.evaluate(()=>JSON.stringify({turn:__bench.state?.turn,events:__bench.eventLog().length,running:__bench.running})));
 }
 for(const options of [{seed:42,contract:0,maxTurns:2},{seed:42,contract:2,maxTurns:2}]){
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
  assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)),`seed ${options.seed} theater contract ${options.contract}`);
  assert.deepEqual(actual.size,{width:18,depth:20});
  assert.ok(Number.isInteger(actual.terrainSeed)&&actual.events.some(action=>action.action==='endTurn'));
  assert.ok(actual.events.some(action=>action.log.some(line=>/returns fire|counters in melee/.test(line))));
  if(options.contract===0)assert.equal(actual.result.win,true);
  else {
   assert.equal(actual.turn,3);
   assert.ok(actual.units.some(unit=>unit.kind==='tank'&&!unit.alive));
   assert.ok(actual.units.some(unit=>unit.kind==='helicopter'&&!unit.alive));
   assert.ok(actual.units.some(unit=>unit.team==='ally'&&unit.hp.body<unit.max.body));
  }
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),'war-browser-fixture');
 console.log('PASS War mode uses game commands on two theaters with matching results, reactions, tank and gunship damage and untouched career storage');
};
