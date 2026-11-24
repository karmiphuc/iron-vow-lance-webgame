const assert=require('node:assert/strict');
module.exports=async function checkDirectorate({page,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await tap('[data-campaign-board]');
 await tap('#modal-1');
 const dialog=page.getByRole('dialog',{name:'DIRECTORATE CAMPAIGN'});
 assert.match(await dialog.innerText(),/Blind the Divide.*Day 6/s);
 await tap('[data-campaign-project="signals"]');
 assert.match(await dialog.innerText(),/Signals network.*Ready Day 3/s);
 assert.equal(await page.locator('[data-campaign-project="workshop"]').isDisabled(),true);
 await tap('#modal-0');
 for(let n=0;n<2;n++){
  await tap('[data-chart-hold]');
  await tap('[data-overworld-confirm]');
 }
 await tap('[data-campaign-board]');
 assert.match(await dialog.innerText(),/Glasswatch \/ Cinder Junction/);
 assert.match(await dialog.innerText(),/Signals network.*Online/s);
 await page.reload({waitUntil:'domcontentloaded'});
 await tap('[data-campaign-board]');
 assert.match(await dialog.innerText(),/Signals network.*Online/s);
 await tap('#modal-0');
};
