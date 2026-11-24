const assert=require('node:assert/strict');
const createSimulation=require('./sim-harness.cjs');

const sim=createSimulation();
const result=sim.run(`(()=>{
 const world=worldRules.createWorld(42,1);
 const {next}=worldRules.railPressure(world,[]);
 const resolved=[{win:true,offerId:'offer:relay:1:0',port:'relay',day:4}];
 const later=worldRules.advanceWorld(world,5);
 const leg=network=>network.routes.find(route=>route.from==='relay'&&route.to==='corridor');
 const regular=leg(worldRules.railNetwork(world,[]));
 const charged=leg(worldRules.railNetwork(later,[]));
 const reopened=leg(worldRules.railNetwork(later,resolved));
 const trusted=leg(worldRules.railNetwork(worldRules.setStanding(world,'relay',6),[]));
 const relay={port:'relay',postedDay:1};
 const reward=[1,2,3].map(day=>worldRules.regionalReward(relay,day,[]).available);
 const alreadyClaimed=worldRules.regionalReward(relay,2,[{...resolved[0],day:2}]);
 const loss={...resolved[0],win:false};
 return JSON.stringify({next,regular,charged,reopened,trusted,reward,alreadyClaimed,failedToCounter:worldRules.railPressure(later,[loss]).active?.name});
})()`);
const values=JSON.parse(result);
assert.equal(values.next.port,'relay');
assert.equal(values.next.until,4);
assert.equal(values.charged.fuel,values.regular.fuel+550);
assert.equal(values.reopened.fuel,values.regular.fuel);
assert.equal(values.trusted.fuel,135);
assert.deepEqual(values.reward,[true,true,false]);
assert.equal(values.alreadyClaimed.available,false);
assert.equal(values.failedToCounter,'Relay blockade');
assert.equal(sim.run(`(()=>{
 save.world=worldRules.createWorld(42,5);
 save.day=5;
 save.overworld={port:'relay',arrears:0};
 const quote=chartRouteOptions('relay','corridor').find(route=>route.path.length===2);
 const before=save.credits;
 const moved=travelTo('corridor','relay',quote.total,quote.path);
 return moved&&save.day===6&&save.credits===before-quote.total&&validSave(save);
})()`),true,'The charged fare is the same fare shown and saved');
const battleSim=createSimulation();
assert.equal(battleSim.run(`(()=>{
 save.world=worldRules.createWorld(42,1);
 const offer=availableOffers('picket')[0];
 createBattle(offer.templateIndex,false,false,[0],false);
 battle.offer=acceptedOffer(offer);
 const baseline=worldContractPay(battle.contract,1,battle.offer)+(battle.contract.fixedPay?0:450+battle.contract.difficulty*200+180*battle.units.filter(unit=>unit.kind).length);
 finish(true);
 return save.history.at(-1).pay-baseline;
})()`),650,'First timely Karst contract pays the supply bonus');
console.log('PASS rail forecast and fare parity, counter/expiry, standing discount, and tactical payout');
