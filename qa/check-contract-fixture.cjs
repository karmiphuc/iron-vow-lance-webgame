const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ensureContractOffer=require('./browser/contract-fixture.cjs');

async function check(port,day,template,first){
 const context=vm.createContext({window:{},save:{day,overworld:{port,arrears:0}},battle:null,pendingCareerWrite:Promise.resolve(),persist(){},companyPort(){return context.save.overworld.port}});
 vm.runInContext(fs.readFileSync(require.resolve('../dist/overworld-world.js'),'utf8'),context);
 context.worldRules=context.window.IronVowWorld;
 const page={evaluate(fn,args){context.args=args;return vm.runInContext(`(${fn.toString()})(args)`,context)}};
 const result=await ensureContractOffer(page,template);
 const offers=context.worldRules.offersAt(context.save.world,port);
 assert.equal(result.port,port);
 assert.equal(result.day,day);
 assert.ok(offers.some(offer=>offer.templateIndex===template),`${port} day ${day} has template ${template}`);
 if(first)assert.equal(offers[0].templateIndex,template,`${port} day ${day} prefers first offer`);
}
(async()=>{
 for(let day=1;day<=5;day++)await check('picket',day,0,true);
 await check('corridor',1,2,true);
 await check('frontier',1,3,false);
 console.log('PASS deterministic contract fixture: Picket days 1–5, Corridor 2, Frontier 3');
})().catch(error=>{console.error(error);process.exitCode=1});
