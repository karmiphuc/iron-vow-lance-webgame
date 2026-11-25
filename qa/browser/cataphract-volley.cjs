const assert=require('node:assert/strict');
module.exports=async function checkCataphractVolley({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));await page.goto(origin);await page.waitForFunction(()=>!!window.__ironVow);
 await page.evaluate(()=>__ironVow.start({seed:42,contract:CONTRACTS.findIndex(c=>c.id==='iron-redoubt')}));
 await page.waitForFunction(()=>IronVowScene.ready&&IronVowScene.models.get('enemy0')?.entry?.m?.nativeV2?.artillery,null,{timeout:40000});
 await page.evaluate(()=>{
 const cat=battle.units.find(u=>u.frame===CATAPHRACT_FRAME),target=current();
 cat.x=cat.vx=5;target.x=target.vx=9;cat.z=cat.vz=target.z=target.vz=8;target.reacted=true;cat.ap=6;battle.cover.clear();
 for(const cell of battle.field.cells)cell.level=0;target.hp.body=target.max.body=500;
 window.probe={state:'firing',base:IronVowScene.models.get(cat.id).entry.m.rig.pelvis.position.y,lowest:Infinity};
 const sample=()=>{probe.lowest=Math.min(probe.lowest,IronVowScene.models.get(cat.id).entry.m.rig.pelvis.position.y);if(probe.state==='firing')requestAnimationFrame(sample);};sample();
 enemyTactical(cat,[target]).then(()=>{probe.state='done';probe.used=cat.tacticalUsed;probe.ap=cat.ap;}).catch(e=>probe.state=e.stack);
 });
 await page.waitForFunction(()=>probe.state!=='firing',null,{timeout:55000});
 const result=await page.evaluate(()=>({...probe,shots:IronVowScene.combat.history.filter(e=>e.type==='launch'&&e.weapon==='four-sword').map(e=>({socket:e.socket,mounted:e.mounted,error:e.aimError})),model:IronVowScene.models.get('enemy0').entry.m.live}));
 assert.ok(result.used);assert.equal(new Set(result.shots.map(shot=>shot.socket)).size,4);assert.equal(result.model,'cataphract');assert.equal(result.state,'done');assert.equal(result.ap,0);assert.equal(result.shots.length,4);assert.ok(result.shots.every(e=>e.mounted&&e.error<.05));assert.ok(result.lowest<result.base-.75);
};
