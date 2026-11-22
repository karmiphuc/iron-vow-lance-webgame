const assert=require('node:assert/strict');

module.exports=async function checkLimbLoss({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.evaluate(()=>__ironVow.start({seed:4242,contract:1}));
 const ready=()=>page.waitForFunction(()=>battle?.units.filter(u=>u.frame===0).length===2&&battle.units.filter(u=>u.frame===0).every(u=>IronVowScene.models.get(u.id)?.entry?.armed),null,{timeout:120000});
 await ready();
 const damage=await page.evaluate(async()=>{
  const [hit,twin]=battle.units.filter(u=>u.frame===0);
  for(const part of ['left','legs'])applyImpact(hit,{part,amount:hit.hp[part]});
  IronVowScene.render(clock,.016);
  await persist();
  return {otherArm:hit.hp.right,otherUnit:twin.hp.left,alive:hit.alive};
 });
 assert.ok(damage.alive&&damage.otherArm>0&&damage.otherUnit>0);
 for(const reload of [false,true]){
  if(reload){await page.reload({waitUntil:'domcontentloaded'});await ready();}
  const poses=await page.evaluate(()=>battle.units.filter(u=>u.frame===0).map(u=>{
   const m=IronVowScene.models.get(u.id).entry.m;
   const visible=mesh=>{for(let o=mesh;o;o=o.parent)if(!o.visible)return false;return true;};
   const counts=Object.fromEntries(['left','right','body'].map(part=>[part,m.build.parts[part].filter(e=>visible(e.m)).length]));
   return {counts,height:m.rig.pelvis.position.y/m.dims.py,mobile:Boolean(mobile(u)),canFire:canUseWeapon(u,unitWeapon(u))};
  }));
  const [hit,twin]=poses;
  assert.equal(hit.counts.left,0,'Every left-arm mesh, including the pauldron, disappears');
  assert.ok(hit.counts.right>0&&hit.counts.body>0&&hit.canFire&&twin.counts.left>0);
  assert.ok(!hit.mobile&&hit.height<.68&&twin.mobile&&twin.height>.75,JSON.stringify(poses));
 }
};
