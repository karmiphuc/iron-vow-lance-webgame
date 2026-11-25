const assert=require('node:assert/strict');
const selectContract=require('./select-contract.cjs');

module.exports=async function checkContractPay({page,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof pooledContractsPage==='function');
 const quote=await page.evaluate(()=>{
  save.world=worldRules.createWorld(42,save.day);
  save.overworld={port:'mercy',arrears:0};
  contractPortSelection='mercy';
  page='contracts';
  render();
  const offer=availableOffers('mercy').find(o=>CONTRACTS[o.templateIndex].id==='distress-lift');
  const fee=worldContractPay(CONTRACTS[offer.templateIndex],3,offer);
  return {id:offer.id,fee:money(fee),net:money(fee-overworld.operatingRates(save).total)};
 });
 await selectContract(page,{id:quote.id});
 const card=page.locator('.offer-card').filter({has:page.locator('[data-world-offer="'+quote.id+'"]')});
 const payment=container=>container.locator('.stat').filter({hasText:'CONTRACT PAYMENT'}).locator('b').innerText();
 assert.equal(await payment(card),quote.fee);
 assert.match(await card.innerText(),new RegExp('After daily costs · '+quote.net));
 await tap('[data-world-offer="'+quote.id+'"]');
 const modal=page.locator('#modal');
 assert.equal(await payment(modal),quote.fee);
 await tap('#modal-1');
 await page.evaluate(async()=>{await pendingCareerWrite});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(id=>battle?.offer?.id===id,quote.id);
 await page.evaluate(()=>finish(true));
 assert.equal(await payment(modal),quote.fee);
};
