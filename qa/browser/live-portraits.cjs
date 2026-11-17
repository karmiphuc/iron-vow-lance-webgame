const assert=require('node:assert/strict');

module.exports=async function checkLivePortraits({page,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 const cards=page.locator('.bay-card img');
 async function checkedCards(){
  await cards.evaluateAll(images=>images.forEach(image=>{image.loading='eager';}));
  await page.waitForFunction(()=>{
   const images=[...document.querySelectorAll('.bay-card img')];
   return images.length>0&&images.every(image=>image.complete&&image.naturalWidth===640&&image.naturalHeight===640);
  },null,{timeout:120000});
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
