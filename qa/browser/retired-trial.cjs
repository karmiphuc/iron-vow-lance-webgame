const assert=require('node:assert/strict');

module.exports=async function checkRetiredTrial({page,origin}){
 const requests=[];
 page.on('request',request=>requests.push(request.url()));
 await page.goto(new URL('?lion=cleaver',origin).href);
 await page.locator('#nav button').first().waitFor({state:'attached'});
 assert.equal(await page.evaluate(()=>Boolean(battle)),false,'The old trial link opens the career');
 await page.goto(new URL('?bench=rig&frame=lion',origin).href);
 await page.waitForFunction(()=>window.__bench?.state?.loaded);
 const roster=await page.locator('#bench-frame option').allTextContents();
 assert.ok(roster.includes('CATAPHRACT')&&!roster.includes('LION'));
 assert.equal(requests.some(url=>/rig-v2-lion\.js|\/lion\.glb/.test(url)),false);
};
