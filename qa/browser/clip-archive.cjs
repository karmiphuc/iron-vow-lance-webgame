const {join}=require('node:path');
const {readGLB}=require('../check-rig-v2.cjs');
const assert=require('node:assert/strict');

module.exports=async function archiveHarness(page,origin){
 await page.goto(new URL('?bench=rig',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__bench?.state?.loaded);
 async function select(frame,file){
  await page.locator('#bench-frame').selectOption(String(frame));
  await page.locator('#bench-clip-source').selectOption('archive');
  await page.waitForFunction(()=>__bench.state.clipSource==='archive'&&__bench.state.loaded);
  const expected=readGLB(join(__dirname,'../../dist/rig-bench/prototypes',file+'.glb')).animations.map(clip=>clip.name);
  assert.deepEqual(await page.evaluate(()=>__bench.state.clips.map(clip=>clip.name)),expected);
 }
 async function scrub(name,fraction){
  await page.locator('#bench-clip').selectOption(name);
  return page.evaluate(async fraction=>{
   const input=document.querySelector('#bench-time');
   input.value=Number(input.max)*fraction;
   input.dispatchEvent(new Event('input',{bubbles:true}));
   await new Promise(resolve=>requestAnimationFrame(resolve));
   return __bench.sampleArchive();
  },fraction);
 }
 return {select,scrub};
};
