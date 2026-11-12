const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkReaver({page,mobile,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'REAVER',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>0;save.dispatch={day:save.day,sizes:[1,1,3,3]}});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="2"]');
 await tap('#modal-1');
 await tap('#modal-0');
 const result=await page.evaluate(async()=>{
  const foe=battle.units.find(u=>u.frame===REAVER_FRAME),ally=current();
  await Promise.all(REAVER_ATLASES.map(key=>motionImages[key].decode()));
  const atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(foe.frame)];
  const hd=atlas.cell===640&&REAVER_ATLASES.every(key=>motionImages[key].naturalWidth===2560&&motionImages[key].naturalHeight===3200);
  const [right,left]=[foe.hp.right,foe.hp.left];
  const variants=[[0,0],[0,left],[right,0],[right,left]].map(([r,l],i)=>{
   foe.hp.right=r;foe.hp.left=l;
   const view=foundryRender(foe,clock,true);
   return view.surface===motionImages[REAVER_ATLASES[i]]&&view.primary&&view.secondary;
  });
  const x=foe.x,z=foe.z+1;
  battle.cover.delete(x+','+z);
  ally.x=ally.vx=x;ally.z=ally.vz=z;
  for(const other of battle.units)if(other!==foe&&other!==ally){other.alive=false;other.hp.body=0}
  lockedTarget=foe.id;renderBattle();
  return {contract:battle.contract.id,team:foe.team,name:foe.name,paint:foe.paint,trim:foe.trim,variants,hd};
 });
 assert.deepEqual(result,{contract:'corridor',team:'enemy',name:'REAVER 3',paint:null,trim:null,variants:[true,true,true,true],hd:true});
 assert.match(await page.locator('#target-toggle').textContent(),/MEDIUM\+/);
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 await tap('#end');
 await page.waitForFunction(()=>activeCinematic?.actor.frame===REAVER_FRAME&&activeCinematic.phase==='aim'&&foundryRender(activeCinematic.actor,clock,true).index===11);
 await page.waitForFunction(()=>activeCinematic?.actor.frame===REAVER_FRAME&&activeCinematic.phase==='fire');
 const firing=await page.evaluate(()=>{
  const {actor:unit,target,part}=activeCinematic,view=foundryRender(unit,clock,true);
  return {frame:view.index,muzzle:view.anchors.muzzle,weapon:unitWeapon(unit).name,target:target.id,part,hp:target.hp[part]};
 });
 assert.equal(firing.frame,12);
 assert.ok(firing.muzzle.every(Number.isFinite));
 assert.equal(firing.weapon,'RV-04 Autocannon');
 if(process.env.IRON_VOW_REAVER_PROOF){
  await page.screenshot({path:join(process.env.IRON_VOW_REAVER_PROOF,mobile?'reaver-touch.png':'reaver-desktop.png')});
 }
 await page.waitForFunction(({target,part,hp})=>battle?.units.find(u=>u.id===target)?.hp[part]<hp,firing);
 await page.waitForFunction(()=>!battle?.busy);
};
