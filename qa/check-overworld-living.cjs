const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const key='iron-vow-career';
const load=record=>simulate({storage:new Map([[key,JSON.stringify(record)]]),random:()=>0});
const saved=sim=>JSON.parse(sim.storage.get(key));
const json=(sim,expression)=>JSON.parse(sim.run(`JSON.stringify(${expression})`));
const clone=value=>JSON.parse(JSON.stringify(value));

function quoteWorldPath(sim,path){
 const rates=json(sim,'window.IronVowOverworld.operatingRates(save)');
 const routes=json(sim,'window.IronVowWorld.ROUTES');
 let days=0,fuel=0;
 for(let i=1;i<path.length;i++){
  const leg=routes.find(route=>route.from===path[i-1]&&route.to===path[i]||route.from===path[i]&&route.to===path[i-1]);
  assert(leg,`missing living-world route ${path[i-1]} -> ${path[i]}`);
  days+=leg.days;fuel+=leg.fuel;
 }
 const wages=rates.wages*days,ship=rates.ship*days,hulls=rates.hulls*days;
 return{days,fuel,wages,ship,hulls,total:fuel+wages+ship+hulls};
}
const travel=(sim,to,from,path,cost)=>sim.run(`travelTo(${JSON.stringify(to)},${JSON.stringify(from)},${cost},${JSON.stringify(path)})`);

// A new career gets one durable fallback world; forecasts and reloads do not reroll it.
const bootstrap=simulate({random:()=>0});
bootstrap.run('ensureWorld()');
const world0=saved(bootstrap).world;
assert(world0,'ensureWorld stores the world on the career');
assert.equal(world0.seed,42,'VMs without crypto use the fixed fallback seed');
assert.equal(world0.day,saved(bootstrap).day);
const picketOffers=json(bootstrap,'availableOffers("picket")');
assert(picketOffers.length>=1,'the opening port has an approachable first-period offer');
assert.equal(picketOffers[0].templateIndex,0);
const opening=picketOffers[0];
assert.equal(opening.postedDay,1);
assert.equal(opening.expiryDay,4);
const beforeForecast=JSON.stringify(saved(bootstrap));
const atExpiry=json(bootstrap,`availableOffers("picket",${opening.expiryDay})`).find(offer=>offer.id===opening.id);
const afterExpiry=json(bootstrap,`availableOffers("picket",${opening.expiryDay+1})`).find(offer=>offer.id===opening.id);
assert.equal(atExpiry.availableOnArrival,true,'arrival on the inclusive expiry day keeps the offer');
assert.equal(afterExpiry.availableOnArrival,false,'an offer is forecast as expired after its expiry day');
assert.equal(JSON.stringify(saved(bootstrap)),beforeForecast,'offer forecasts do not mutate or reroll the save');

const reopened=load(saved(bootstrap));
assert.deepEqual(saved(reopened).world,world0,'the same world seed and day survive reload');
assert.deepEqual(json(reopened,'availableOffers("picket")'),picketOffers,'reload preserves the offer IDs and terms');
const staleWorld=clone(saved(bootstrap));
staleWorld.day++;
assert.equal(bootstrap.run(`validSave(${JSON.stringify(staleWorld)})`),false,'save and world days must match');
const rewoundWorld=clone(saved(bootstrap));
rewoundWorld.world.day++;
assert.equal(bootstrap.run(`validSave(${JSON.stringify(rewoundWorld)})`),false,'a future world cannot be imported into an older career day');
assert.equal(bootstrap.run('window.IronVowWorld.advanceWorld(window.IronVowWorld.advanceWorld(save.world,save.day+1),save.day)'),null,'world time cannot move backwards');

// The two added ports are connected to the career network and every market entry names a real item.
const portIds=json(bootstrap,'window.IronVowWorld.PORTS.map(port=>port.id)');
assert(portIds.includes('ridge'));
assert(portIds.includes('haven'));
const invalidMarket=json(bootstrap,`window.IronVowWorld.PORTS.some(port=>{
 const market=window.IronVowWorld.portProfile(save.world.seed,port.id);
 return !market||!market.frames.every(id=>Number.isInteger(id)&&FRAMES[id]!==undefined)||
  !market.weapons.every(id=>WEAPONS.some(item=>item.id===id&&!item.builtIn));
})`);
assert.equal(invalidMarket,false,'all port stock IDs resolve to real purchasable frames and weapons');

const ports=simulate({random:()=>0});
ports.run('ensureWorld()');
let path=['picket','ridge'],quote=quoteWorldPath(ports,path);
assert.equal(travel(ports,'ridge','picket',path,quote.total),true,'the company can reach Ridge Mast');
assert.equal(ports.run('save.overworld.port'),'ridge');
assert.equal(ports.run('save.day'),1+quote.days);
assert.equal(ports.run('save.world.day'),ports.run('save.day'));
path=['ridge','haven'];quote=quoteWorldPath(ports,path);
assert.equal(travel(ports,'haven','ridge',path,quote.total),true,'the company can continue to Haven Reach');
assert.equal(ports.run('save.overworld.port'),'haven');
assert.equal(ports.run('save.world.day'),ports.run('save.day'));
const beforeStaleTravel=JSON.stringify(saved(ports));
assert.equal(travel(ports,'ridge','ridge',['ridge','haven'],quote.total),false,'a stale origin cannot charge a second route');
assert.equal(JSON.stringify(saved(ports)),beforeStaleTravel);
const portsReloaded=load(saved(ports));
assert.deepEqual(saved(portsReloaded).world,saved(ports).world);
assert.deepEqual(json(portsReloaded,'availableOffers("haven")'),json(ports,'availableOffers("haven")'));

// Scouting is a one-time paid action and its state persists.
const scout=simulate({random:()=>0});
scout.run('ensureWorld()');
const scoutOffer=json(scout,'availableOffers("picket")[0]');
const scoutCredits=scout.run('save.credits');
assert.equal(scout.run(`scoutWorldOffer(${JSON.stringify(scoutOffer.id)})`),true);
assert.equal(scout.run('save.credits'),scoutCredits-90);
assert(json(scout,'save.world.scouted').includes(scoutOffer.id));
assert.equal(json(scout,'availableOffers("picket")[0]').scouted,true);
const scoutedSave=JSON.stringify(saved(scout));
assert.equal(scout.run(`scoutWorldOffer(${JSON.stringify(scoutOffer.id)})`),false,'a second scout click is rejected');
assert.equal(JSON.stringify(saved(scout)),scoutedSave,'a rejected second click cannot charge again');
assert.deepEqual(saved(load(saved(scout))).world,saved(scout).world,'scouted intel survives reload');

// Holding advances one day, applies one day of rest/service, and records unpaid operating costs as arrears.
const wait=simulate({random:()=>0});
wait.run(`ensureWorld();save.units[0].condition=40;save.ship={levels:{repair:1}};save.wounds={rook:2,ghost:1};persist()`);
const waitBefore=saved(wait),waitRates=json(wait,'window.IronVowOverworld.operatingRates(save)');
assert.equal(wait.run('holdAtPort()'),true);
const waited=saved(wait);
assert.equal(waited.day,waitBefore.day+1);
assert.equal(waited.world.day,waited.day);
assert.equal(waited.credits,waitBefore.credits-waitRates.total);
assert.equal(waited.units[0].condition,52,'one held day applies one Repair Deck service tick');
assert.deepEqual(waited.wounds,{rook:1},'one held day advances wound recovery once');

const arrears=simulate({random:()=>0});
arrears.run('ensureWorld();save.credits=100;save.overworld={port:"picket",arrears:55};persist()');
const dailyCost=json(arrears,'window.IronVowOverworld.operatingRates(save).total');
const expectedSettlement=json(arrears,`window.IronVowOverworld.settleExpenses(100,55,${dailyCost})`);
assert.equal(arrears.run('holdAtPort()'),true);
assert.equal(arrears.run('save.credits'),expectedSettlement.credits);
assert.equal(arrears.run('save.overworld.arrears'),expectedSettlement.arrears);
assert.equal(arrears.run('save.world.day'),arrears.run('save.day'));

// Accept on the final valid day, checkpoint/reload, then pay the saved offer exactly once.
const contract=simulate({random:()=>0});
contract.run('ensureWorld()');
const initialOffer=json(contract,'availableOffers("picket")[0]');
assert(initialOffer);
for(let i=0;i<3;i++)assert.equal(contract.run('holdAtPort()'),true);
assert.equal(contract.run('save.day'),initialOffer.expiryDay);
const expiringOffer=json(contract,`availableOffers("picket").find(offer=>offer.id===${JSON.stringify(initialOffer.id)})`);
assert.equal(expiringOffer.availableOnArrival,true);
// The simulation DOM does not construct native select option collections.
contract.node('#aux-pilot').options=[];
contract.node('#use-aux').checked=false;
contract.run(`prepareWorldOffer(${JSON.stringify(initialOffer.id)})`);
assert.match(contract.node('#modal').innerHTML,/SORTIE ASSIGNMENT/,'an on-site offer opens the standard assignment flow');
contract.node('#modal-1').onclick();
assert.equal(contract.run('Boolean(battle&&battle.offer)'),true,'deployment accepts the offered contract');
assert.equal(contract.run('Object.isFrozen(battle.offer)'),true,'accepted terms are held as an immutable snapshot');
const checkpoint=saved(contract),offerSnapshot=checkpoint.sortie.offer;
assert(offerSnapshot);
assert.equal(offerSnapshot.id,initialOffer.id);
assert.equal(offerSnapshot.port,'picket');
assert.equal(offerSnapshot.postedDay,initialOffer.postedDay);
assert.equal(offerSnapshot.expiryDay,initialOffer.expiryDay);
assert.equal(offerSnapshot.payPercent,initialOffer.payPercent);
assert.equal(offerSnapshot.acceptedDay,initialOffer.expiryDay);
assert(checkpoint.world.consumed.includes(initialOffer.id),'the offer is consumed when deployment is accepted');

const invalidOffer=clone(checkpoint);
invalidOffer.sortie.offer.payPercent++;
const invalidRestore=simulate({random:()=>0});
invalidRestore.run(`save=${JSON.stringify(invalidOffer)};battle=null;restoreSortie()`);
assert.equal(invalidRestore.run('battle===null'),true,'restore rejects terms that differ from the seeded offer');
const invalidAcceptedDay=clone(checkpoint);
invalidAcceptedDay.sortie.offer.acceptedDay=invalidAcceptedDay.sortie.offer.expiryDay+1;
const lateRestore=simulate({random:()=>0});
lateRestore.run(`save=${JSON.stringify(invalidAcceptedDay)};battle=null;restoreSortie()`);
assert.equal(lateRestore.run('battle===null'),true,'restore rejects an offer accepted after expiry');

const resumed=load(checkpoint);
assert.equal(resumed.run('Boolean(battle&&battle.offer)'),true,'an accepted offer survives an active-sortie checkpoint');
assert.equal(resumed.run('Object.isFrozen(battle.offer)'),true);
const seatCount=checkpoint.sortie.slots.length;
const expectedPay=resumed.run(`Math.round(contractPay(CONTRACTS[${initialOffer.templateIndex}],${seatCount})*${initialOffer.payPercent}/100)`);
const finishCost=json(resumed,'window.IronVowOverworld.operatingRates(save).total');
resumed.run('finish(true);closeModal()');
const paid=saved(resumed);
assert.equal(paid.history.at(-1).name,'Picket sweep','dynamic work keeps the static history contract name');
assert.equal(paid.history.at(-1).offerId,initialOffer.id);
assert.equal(paid.history.at(-1).port,'picket');
assert.equal(paid.history.at(-1).pay,expectedPay,'the accepted offer multiplier is applied once to the contract reward');
assert.equal(paid.credits,checkpoint.credits+expectedPay-finishCost,'the payout is credited once before daily operating costs');
assert.equal(paid.day,initialOffer.expiryDay+1);
assert.equal(paid.world.day,paid.day);
assert.equal(paid.overworld.port,'picket','finishing preserves the offer port');
assert.equal(paid.sortie,undefined,'finished dynamic offer metadata is cleared');
const paidAgain=load(paid);
assert.equal(paidAgain.run('battle'),null);
assert.equal(saved(paidAgain).credits,paid.credits,'reloading a finished sortie cannot pay it twice');
assert.deepEqual(saved(paidAgain).history,paid.history);

console.log('PASS living-world career save, offers, travel, markets, scouting, wait and sortie payout');
