// Select through the actual offer tabs before interacting with a hidden offer.
module.exports=async function selectContract(page,{template,id}){
 const choices=page.locator(id?`[data-contract-select="${id}"]`:`[data-contract-template="${template}"]`);
 const choice=choices.first();
 if(await choice.count()&&await choice.getAttribute('aria-selected')!=='true'){if(await page.evaluate(()=>navigator.maxTouchPoints>0))await choice.tap();else await choice.click();}
};
