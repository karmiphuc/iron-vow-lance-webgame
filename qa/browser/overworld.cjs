const assert=require('node:assert/strict');

module.exports=async function checkOverworld({page,mobile,origin,tap}){
 const nav=view=>tap('#nav [data-page="'+view+'"]');
 const snapshot=()=>page.evaluate(async()=>{
  await pendingCareerWrite;
  return JSON.parse(localStorage.getItem(CAREER_STORAGE));
 });
 const noOverflow=async selector=>assert.ok(
  await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1),
  selector+' fits the viewport'
 );
 if(mobile)await page.setViewportSize({width:320,height:735});
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-page="overworld"]').first().waitFor();
 const initial=await page.evaluate(()=>({credits:save.credits,day:save.day,overworld:save.overworld}));
 assert.equal(initial.credits,4500);
 assert.equal(initial.day,1);
 assert.equal(initial.overworld?.port||'picket','picket');

 // Local contracts still open the assignment rather than plotting a course.
 await nav('contracts');
 await tap('[data-deploy="0"]');
 await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).waitFor();
 await noOverflow('.modalbox');
 await tap('#modal-0');

 // A remote contract selects a destination; it must not deploy or advance time.
 await tap('[data-deploy="1"]');
 await page.locator('[data-overworld-port="relay"]').waitFor();
 assert.equal(await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).count(),0);
 assert.equal(await page.evaluate(()=>!!battle),false);
 let state=await snapshot();
 assert.equal(state.day,1);
 assert.equal(state.credits,4500);
 assert.equal(state.overworld?.port||'picket','picket');
 await noOverflow('#ui');

 // Cancel leaves the career untouched. Explicitly select Relay and travel.
 await tap('[data-overworld-travel]');
 await page.getByRole('dialog',{name:'CONFIRM TRANSIT'}).waitFor();
 await noOverflow('.modalbox');
 await tap('#modal-0');
 state=await snapshot();
 assert.equal(state.day,1);
 assert.equal(state.credits,4500);
 assert.equal(state.overworld?.port||'picket','picket');
 await tap('[data-overworld-port="relay"]');
 await tap('[data-overworld-travel]');
 await page.getByRole('dialog',{name:'CONFIRM TRANSIT'}).waitFor();
 await tap('#modal-1');
 await page.waitForFunction(()=>save.overworld?.port==='relay');
 state=await snapshot();
 assert.equal(state.day,2);
 assert.equal(state.credits,3990);
 assert.equal(state.overworld.port,'relay');
 assert.equal(state.overworld.arrears,0);
 assert.equal(state.overworld.lastExpense.total,510);
 assert.equal(state.overworld.lastExpense.destination,'relay');
 assert.equal(state.overworld.lastExpense.days,1);
 assert.equal(state.overworld.lastExpense.fuel,120);
 assert.equal(state.overworld.lastExpense.wages+state.overworld.lastExpense.ship+state.overworld.lastExpense.hulls,390);
 assert.equal(await page.evaluate(()=>!!battle),false);
 await noOverflow('#ui');

 // The arrival is durable and navigation remains usable after a reload.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ship-banner').waitFor();
 const reloaded=await snapshot();
 assert.equal(reloaded.day,2);
 assert.equal(reloaded.credits,3990);
 assert.deepEqual(reloaded.overworld,state.overworld);
 assert.match(await page.locator('#ui').innerText(),/relay/i);
 await noOverflow('#ui');
 await tap('[data-page="overworld"]');
 await page.locator('[data-overworld-port="relay"]').waitFor();
 await nav('contracts');
 await tap('[data-deploy="1"]');
 await page.getByRole('dialog',{name:'SORTIE ASSIGNMENT'}).waitFor();
 await tap('#modal-1');
 await tap('#modal-0');
 await tap('#withdraw');
 await tap('#modal-1');
 const debrief=page.getByRole('dialog',{name:'LANCE EXTRACTED.'});
 assert.match(await debrief.innerText(),/CREW WAGES[\s\S]*210 CR[\s\S]*SHIP UPKEEP[\s\S]*75 CR[\s\S]*HULL UPKEEP[\s\S]*105 CR/);
 const afterWithdrawal=await snapshot();
 assert.equal(afterWithdrawal.day,3);
 assert.equal(afterWithdrawal.credits,3600);
 assert.equal(afterWithdrawal.overworld.lastExpense.kind,'sortie');
 assert.equal(afterWithdrawal.overworld.lastExpense.paid,390);
 assert.equal(afterWithdrawal.overworld.port,'relay');
 await tap('#modal-0');
};
