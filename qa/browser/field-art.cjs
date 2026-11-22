const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {join}=require('node:path');
const navigate=require('./navigate.cjs');
const selectContract=require('./select-contract.cjs');
const ensureContractOffer=require('./contract-fixture.cjs');

module.exports=async function checkFieldArt({page,origin,tap,mobile}){
 const screenshots=process.env.IRON_VOW_FIELD_ART_CAPTURES;
 const label=mobile?'touch':'desktop';
 const capture=async view=>{
  if(!screenshots)return;
  mkdirSync(screenshots,{recursive:true});
  await page.screenshot({path:join(screenshots,`${view}-${label}.jpg`),type:'jpeg',quality:90});
 };
 const shaderErrors=[];
 page.on('console',message=>{
  if(message.type()==='error'&&/WebGLProgram|shader/i.test(message.text()))
   shaderErrors.push(message.text().split('\n').slice(0,4).join('\n'));
 });
 const finish='[data-paint-finish="worn"]';
 const openPaint=async()=>{
  if(!await page.locator('[data-workshop-detail="paint"]').evaluate(panel=>panel.open))
   await tap('[data-workshop-detail="paint"] > summary');
 };
 const finishOnMech=()=>page.waitForFunction(()=>{
  const unit=battle?.units.find(unit=>unit.team==='ally'&&unit.frame===0);
  const mech=battle?IronVowScene.models.get(unit?.id)?.entry?.m.cont:IronVowWorkshop.snapshot()?.entry?.m.cont;
  let coated=false;
  mech?.traverse(node=>{
   if(node.material?.name==='paint_primary'&&node.material.userData.fieldFinish==='worn'&&node.material.roughness===.64)coated=true;
  });
  return coated;
 },null,{timeout:60000});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await openPaint();
 await tap(finish);
 assert.equal(await page.locator(finish).getAttribute('aria-pressed'),'true');
 await finishOnMech();
 await page.reload({waitUntil:'domcontentloaded'});
 await finishOnMech();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('iron-vow-career')).units[0].paintFinish),'worn');
 await openPaint();
 assert.equal(await page.locator(finish).getAttribute('aria-pressed'),'true');
 if(screenshots)await page.locator(finish).scrollIntoViewIfNeeded();
 await capture('workshop');
 await ensureContractOffer(page,0);
 await navigate(page,'contracts',tap,mobile);
 await selectContract(page,{template:0});
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 await tap('#modal-0');
 await finishOnMech();
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:60000});
 const scene=await page.evaluate(()=>{
  const scene=IronVowScene.scene,sun=scene.getObjectByName('theater-sun');
  const terrain=scene.getObjectByName('rock-cut-cliffs');
  const board=terrain.parent;
  return {field:battle.contract.field,sunAngle:Math.atan2(sun.position.y,Math.hypot(sun.position.x,sun.position.z)),
   sky:scene.background.getHex(),fog:scene.fog.color.getHex(),cliffShadow:terrain.castShadow,
   terrainMaterial:board.children.some(mesh=>mesh.isMesh&&mesh.userData.tile&&
    mesh.material.customProgramCacheKey().includes('fieldStrata')),units:battle.units.length};
 });
 assert.equal(scene.field,0);
 assert(scene.sunAngle>.35&&scene.sunAngle<.49,'Karst Basin uses the low field-trial light');
 assert.equal(scene.sky,scene.fog);
 assert.equal(scene.cliffShadow,true);
 assert.equal(scene.terrainMaterial,true);
 assert(scene.units>1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await capture('sortie');
 assert.deepEqual(shaderErrors,[]);
};
