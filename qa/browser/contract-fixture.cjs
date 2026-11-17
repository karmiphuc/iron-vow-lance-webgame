// Choose a real, deterministic offer while preserving the UI deployment path.
module.exports=async function ensureContractOffer(page,template,port){
 return page.evaluate(async({template,port})=>{
  if(battle||save.transit)throw Error('Cannot replace world during a battle or transit');
  if(port)save.overworld={port,arrears:0};
  const local=companyPort();
  let fallback=null;
  for(let seed=0;seed<10000;seed++){
   const world=worldRules.createWorld(seed,save.day);
   const offers=worldRules.offersAt(world,local);
   if(offers[0]?.templateIndex===template){
    save.world=world;persist();await pendingCareerWrite;return {seed,port:local,day:save.day};
   }
   if(!fallback&&offers.some(offer=>offer.templateIndex===template))fallback={seed,world};
  }
  if(fallback){save.world=fallback.world;persist();await pendingCareerWrite;return {seed:fallback.seed,port:local,day:save.day};}
  throw Error('No deterministic local offer for '+local+' template '+template);
 },{template,port});
};
