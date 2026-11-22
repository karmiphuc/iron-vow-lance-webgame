const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const arrived=require('./fixtures/overworld-relay.json');
const restedArrival=require('./fixtures/overworld-transit-rest.json');
const legacy=require('./fixtures/v55-corridor.json');

const key='iron-vow-career';
const load=record=>simulate({storage:new Map([[key,JSON.stringify(record)]]),random:()=>0});
const saved=sim=>JSON.parse(sim.storage.get(key));
const snapshot=sim=>JSON.parse(sim.run('JSON.stringify(save)'));
const roundTrip=sim=>load(saved(sim));
const withoutWorld=record=>{const {world,itemInventory,...legacyFields}=record;legacyFields.owned=[...new Set(legacyFields.owned)];return legacyFields};
const quote=(sim,path)=>JSON.parse(sim.run(`JSON.stringify(window.IronVowOverworld.itineraryQuote(${JSON.stringify(path)},window.IronVowOverworld.operatingRates(save),save.credits,save.overworld?.arrears??0))`));
const travel=(sim,destination,from,cost,path)=>sim.run(`travelTo(${JSON.stringify(destination)},${JSON.stringify(from)},${cost===undefined?'undefined':cost},${JSON.stringify(path)})`);

const company=simulate({random:()=>0});
assert.equal(company.run('companyPort()'),'picket');

// A plotted choice is a read-only forecast. Vanta has an express and a Relay stopover.
const routeBefore=snapshot(company);
assert.deepEqual(quote(company,['picket','corridor']),{
 path:['picket','corridor'],days:1,fuel:850,wages:210,ship:75,hulls:105,total:1240,cashAfterArrival:3260,arrears:0
});
assert.deepEqual(quote(company,['picket','relay','corridor']),{
 path:['picket','relay','corridor'],days:2,fuel:300,wages:420,ship:150,hulls:210,total:1080,cashAfterArrival:3420,arrears:0
});
assert.deepEqual(snapshot(company),routeBefore,'forecasting does not mutate the career');
assert.equal(company.run('travelTo("frontier")'),false,'legacy single-hop calls still reject destinations with no direct route');
assert.equal(company.run('travelTo("relay","picket",511)'),false,'a stale direct quote cannot be charged');
assert.deepEqual(snapshot(company),routeBefore,'rejected direct travel leaves the save untouched');

// Keep the existing one-hop Relay workflow and its additive save fixture.
company.run('prepareSortie(1)');
assert.equal(company.run('page'),'overworld');
assert.equal(company.run('overworldSelection'),'relay');
assert.equal(company.run('battle'),null);
assert.equal(company.run('save.day'),1);
assert.equal(company.run('save.dispatch'),undefined,'route planning does not refresh contracts');
company.run('dispatchSizes()');
assert.equal(company.run('travelTo("relay","picket",510)'),true);
assert.equal(company.run('save.dispatch'),undefined,'arriving on a new day expires the dispatch');
const relaySaved=saved(company);
assert.equal(relaySaved.day,2);
assert.equal(relaySaved.credits,3990);
assert.equal(relaySaved.overworld.lastExpense.total,510);
assert.equal(relaySaved.overworld.lastExpense.destination,'relay');
assert.equal(Object.hasOwn(relaySaved,'reserve'),false,'travel preserves absent reserve data');
assert.equal(Object.hasOwn(relaySaved,'wounds'),false,'travel preserves absent wound data');
assert.deepEqual(withoutWorld(relaySaved),arrived,'the original Relay save fields remain unchanged');
assert.deepEqual(relaySaved.world,JSON.parse(company.run('JSON.stringify(window.IronVowWorld.createWorld(42,2))')),'chart entry created the fixed test world and transit advanced it');
assert.equal(company.run('travelTo("relay","picket",510)'),false,'a stale confirmation cannot debit twice');
assert.deepEqual(saved(company),relaySaved);
assert.deepEqual(saved(roundTrip(company)),relaySaved,'the full world survives a save reload');

const imported=simulate();
assert.equal(imported.run(`importCareer(${JSON.stringify(arrived)})`),false,'travel fixture has no active sortie');
assert.deepEqual(withoutWorld(saved(imported)),arrived);
assert.equal(Object.hasOwn(saved(imported),'world'),false,'legacy import does not create a world before chart entry');
imported.run('showOverworld("relay")');
const importedOnChart=saved(imported);
assert.deepEqual(withoutWorld(importedOnChart),arrived,'opening the chart leaves legacy fields byte-for-byte intact');
assert.deepEqual(importedOnChart.world,JSON.parse(imported.run('JSON.stringify(window.IronVowWorld.createWorld(42,2))')));
assert.deepEqual(saved(roundTrip(imported)),importedOnChart,'the lazily added world round-trips exactly');

// Apply two transit days of repair and wound rest once, including stored hulls.
const rested=simulate({random:()=>0});
rested.run(`save.units[0].condition=25;save.units[1].condition=95;save.units[2].condition=30;
 save.ship={levels:{repair:1,crew:1}};save.owned.push('blade');
 save.reserve={'6':{weapon:'rifle',melee:'blade',condition:40,upgrade:0}};save.owned.push('rifle');
 save.wounds={rook:2,ghost:1};persist()`);
rested.run('ensureWorld()');
const viaPath=['picket','relay','corridor'];
const restQuote=quote(rested,viaPath);
assert.deepEqual(restQuote,{
 path:viaPath,days:2,fuel:300,wages:420,ship:230,hulls:240,total:1190,cashAfterArrival:3310,arrears:0
});
const beforeRejectedTravel=JSON.stringify(saved(rested));
assert.equal(travel(rested,'corridor','picket',restQuote.total+1,viaPath),false,'a stale itinerary quote is rejected');
assert.equal(travel(rested,'corridor','picket',restQuote.total,['picket','relay','picket','corridor']),false,'a repeated-port itinerary is rejected');
assert.equal(JSON.stringify(saved(rested)),beforeRejectedTravel,'failed route attempts do not apply rest or charges');
assert.equal(travel(rested,'corridor','picket',restQuote.total,viaPath),true);
const restedWithWorld=saved(rested);
assert.deepEqual(withoutWorld(restedWithWorld),restedArrival,'two travel days retain the old rest, charge and hull values');
assert.deepEqual(restedWithWorld.world,JSON.parse(rested.run('JSON.stringify(window.IronVowWorld.createWorld(42,3))')),'the world advances by the itinerary duration');
assert.equal(travel(rested,'corridor','picket',restQuote.total,viaPath),false,'the same itinerary cannot be charged or rested twice');
assert.deepEqual(saved(rested),restedWithWorld);
assert.deepEqual(saved(roundTrip(rested)),restedWithWorld,'the repaired arrival and world survive a save round trip');

// Repair Deck tier two applies its per-day service, capped at full condition.
const tierTwo=simulate({random:()=>0});
tierTwo.run(`save.units[0].condition=40;save.units[1].condition=95;save.wounds={rook:2,ghost:1};
 save.ship={levels:{repair:2}};persist()`);
tierTwo.run('ensureWorld()');
const tierTwoQuote=quote(tierTwo,viaPath);
assert.equal(tierTwoQuote.total,1160);
assert.equal(travel(tierTwo,'corridor','picket',tierTwoQuote.total,viaPath),true);
const tierTwoArrival=saved(tierTwo);
assert.equal(tierTwoArrival.world.day,tierTwoArrival.day,'Repair Deck transit advances the world and career together');
assert.equal(tierTwoArrival.units[0].condition,88,'tier two repairs 24 integrity per travel day');
assert.equal(tierTwoArrival.units[1].condition,100,'service cannot exceed full condition');
assert.deepEqual(tierTwoArrival.wounds,{});

// Insufficient cash and an active legacy sortie reject travel without side effects.
const recovery=simulate({random:()=>0});
recovery.run('save.credits=100;save.units[0].condition=25;save.wounds={rook:2};persist()');
const poorBefore=JSON.stringify(saved(recovery));
assert.equal(travel(recovery,'corridor','picket',undefined,viaPath),false,'cash in hand must cover the itinerary');
assert.equal(JSON.stringify(saved(recovery)),poorBefore,'insufficient funds do not advance day, debit cash, or apply rest');

const legacyBattle=load(legacy);
assert.equal(legacyBattle.run('companyPort()'),'corridor','an older active checkpoint resolves to its port');
const legacyBefore=JSON.stringify(saved(legacyBattle));
assert.equal(legacyBattle.run('travelTo("frontier")'),false,'transit cannot interrupt a legacy sortie');
assert.equal(JSON.stringify(saved(legacyBattle)),legacyBefore,'legacy migration reads do not charge past days');
assert.equal(load({...arrived,overworld:undefined,history:[{name:'No quiet frontier',day:1,win:false,pay:0}]}).run('companyPort()'),'frontier');

recovery.run('createBattle(0,false,false,[0]);finish(false);closeModal()');
assert.equal(recovery.run('save.day'),2);
assert.equal(recovery.run('save.credits'),0);
assert.equal(recovery.run('save.overworld.arrears'),290);
assert.equal(recovery.run('save.overworld.lastExpense.paid'),100);
const recovering=roundTrip(recovery);
recovering.run('createBattle(0,false,false,[0]);finish(true);closeModal()');
assert.equal(recovering.run('save.history.at(-1).pay'),1300,'after-action pay stays gross');
assert.equal(recovering.run('save.overworld.lastExpense.arrearsPaid'),290);
assert.equal(recovering.run('save.overworld.arrears'),0);
assert.equal(recovering.run('save.credits'),620);
assert.equal(roundTrip(recovering).run('save.credits'),620,'reopening does not charge a second day');
console.log('PASS overworld itineraries, transit rest, additive career restore, daily costs and arrears recovery');
