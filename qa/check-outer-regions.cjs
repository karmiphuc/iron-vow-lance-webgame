const assert=require('node:assert/strict');
const sim=require('./sim-harness.cjs')();
assert.equal(sim.run(`(()=>{
 const world=worldRules.createWorld(42,1);
 const network=worldRules.railNetwork(world,[]);
 const freight=worldRules.freightToday(world),shared=network.routes.filter(route=>route.shared);
 return network.ports.every(port=>port.id==='picket'||overworld.routeOptions('picket',port.id,network).length>0)&&
   shared.length===1&&shared[0].from===freight.from&&shared[0].discount>0&&
   worldRules.freightToday(worldRules.advanceWorld(world,2)).from+'>'+worldRules.freightToday(worldRules.advanceWorld(world,2)).to!==freight.from+'>'+freight.to&&
   worldRules.portProfile(42,'mercy').repairPercent===75;
})()`),true,'Every railhead is reachable, freight rotates, and Mercy has cheap repairs');
assert.equal(sim.run(`(()=>{
 save.world=worldRules.createWorld(42,1);save.overworld={port:'iron',arrears:0};
 const offer=availableOffers('iron')[0],size=CONTRACTS[offer.templateIndex].seats??dispatchSizes()[offer.templateIndex];
 deploy(offer.templateIndex,false,LANCE_SLOTS.slice(0,size),null,null,offer);
 if(!battle||battle.launchAP!==1||!battle.units.filter(u=>u.team==='ally').every(u=>u.ap===Math.min(BASE_AP+1,apCapacity(u))))return false;
 const snapshot=JSON.stringify(captureSortie());
 battle=null;
 return Boolean(restoreSortie())&&JSON.stringify(captureSortie())===snapshot;
})()`),true,'A real Iron Pass sortie gets staging AP and preserves it after reload');
console.log('PASS expanded network connectivity, rotating freight, repair specialization and restored tactical staging');
