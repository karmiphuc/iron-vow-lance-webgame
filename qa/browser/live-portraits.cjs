const assert=require('node:assert/strict');
const waitForLivePortraits=require('./portrait-readiness.cjs');

module.exports=async function checkLivePortraits({page,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 async function checkedCards(){
  const cards=await waitForLivePortraits(page,'.bay-card img');
  const images=await cards.evaluateAll(cards=>cards.map(image=>[image.dataset.rigPortrait,image.src]));
  assert.ok(images.every(([key,src])=>key&&src.startsWith('data:image/png;base64,')));
  assert.equal(images.length,new Set(images.map(([key])=>key)).size);
  const residency=await page.evaluate(()=>FRAMES.filter((_,frame)=>IronVowRigV2.status({frame},'portrait')).length);
  assert.equal(residency,0,'The card cache keeps rendered pixels and releases its source GLBs');
  return images.length;
 }
 assert.equal(await checkedCards(),3,'All assigned mechs show their own live portraits');
 await page.evaluate(()=>{save.rep=100;render()});
 await tap('[data-bay="market"]');
 assert.ok(await checkedCards()>=10,'The market shows its expanded hull catalog');
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
};
