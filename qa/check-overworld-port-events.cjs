const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const saved=sim=>JSON.parse(sim.storage.get('iron-vow-career'));
const json=(sim,expression)=>JSON.parse(sim.run(`JSON.stringify(${expression})`));
const setWorld=(sim,seed)=>sim.run(`save.world=worldRules.createWorld(${seed},save.day);persist()`);

// The port service APIs price against the selected port, but commit only while moored there.
const services=simulate({random:()=>0});setWorld(services,2);
services.run(`save.units[0].condition=50;save.ship={levels:{repair:1}};save.credits=100000;persist()`);
const baseRepair=services.run('Math.ceil((100-save.units[0].condition)*14*80/100)');
assert.equal(services.run('portRepairCost("active:0","picket")'),Math.ceil(baseRepair*.97),'Picket applies its local repair profile');
services.run('save.world=worldRules.setStanding(save.world,"picket",-100);persist()');
assert.equal(services.run('portRepairCost("active:0","picket")'),Math.ceil(baseRepair*.97*1.2),'negative standing removes the market discount and raises repair price');
services.run('save.world=worldRules.setStanding(save.world,"picket",100);persist()');
const positiveRepair=Math.ceil(baseRepair*.97*.8),repairCredits=services.run('save.credits');
assert.equal(services.run('portRepairCost("active:0","picket")'),positiveRepair,'positive standing increases repair discount');
const remoteBefore=JSON.stringify(saved(services));
assert.equal(services.run('repairPortHull("active:0","relay")'),false,'a remote port cannot service an active hull');
assert.equal(services.run('repairPortHull("bogus","picket")'),false,'an unknown hull key cannot be serviced');
assert.deepEqual(saved(services),JSON.parse(remoteBefore),'rejected repairs do not alter career state');
assert.equal(services.run('repairPortHull("active:0","picket")'),true,'local active hull repairs succeed');
assert.equal(services.run('save.units[0].condition'),100);
assert.equal(services.run('save.credits'),repairCredits-positiveRepair);
assert.equal(services.run('repairPortHull("active:0","picket")'),false,'a full hull cannot be charged twice');
const picket= json(services,'portServicesData("picket")');
assert.equal(picket.local,true);
assert.equal(picket.discountPercent,20,'neutral market discount plus positive standing is reported');
const sidewinder=picket.items.find(item=>item.id==='sidewinder');
assert(sidewinder);
const sidewinderBase=services.run('WEAPONS.find(item=>item.id==="sidewinder").price');
assert.equal(sidewinder.price,Math.round(sidewinderBase*.8),'market quotes apply the standing discount');
const localBuyBefore=services.run('save.credits');
assert.equal(services.run('buyPortWeapon("sidewinder","picket")'),true,'locally stocked weapon purchase succeeds');
assert.equal(services.run('save.credits'),localBuyBefore-sidewinder.price);
assert(services.run('save.owned.includes("sidewinder")'));
const remoteMarket=json(services,'portServicesData("relay")');
assert.equal(remoteMarket.local,false,'remote services are marked read-only');
const remoteBuyBefore=JSON.stringify(saved(services));
assert.equal(services.run('buyPortWeapon("watchman","relay")'),false,'remote stocked weapons cannot be bought');
assert.equal(services.run('buyPortHull(9,"relay")'),false,'remote stocked frames cannot be bought');
assert.deepEqual(saved(services),JSON.parse(remoteBuyBefore),'rejected remote market actions do not mutate the save');

// A stocked reserve frame can be bought and repaired only after travelling to its market.
assert.equal(services.run('travelTo("relay")'),true,'the company can reach the frame market');
const relay=json(services,'portServicesData("relay")'),watchman=relay.items.find(item=>item.id==='watchman');
assert(relay.local&&watchman);
assert.equal(services.run('buyPortWeapon("watchman","relay")'),true,'locally stocked Relay weapon purchase succeeds');
assert.equal(services.run('buyPortHull(9,"relay")'),true,'locally stocked Relay frame purchase succeeds');
assert(services.run('save.reserve[9]&&save.reserve[9].condition===100'));
services.run('save.reserve[9].condition=40;persist()');
const reserveRepair=services.run('portRepairCost("reserve:9","relay")');
assert.equal(reserveRepair,Math.ceil(Math.ceil(60*14*.8)*.86),'reserve repair uses the installed Repair Deck and Relay profile');
const reserveCredits=services.run('save.credits');
assert.equal(services.run('repairPortHull("reserve:9","relay")'),true);
assert.equal(services.run('save.reserve[9].condition'),100);
assert.equal(services.run('save.credits'),reserveCredits-reserveRepair);
assert.equal(services.run('buyPortWeapon("cerberus","relay")'),false,'an item outside local stock cannot be purchased');
assert.equal(services.run('validSave(save)'),true,'service and market transactions preserve a valid career');

// Multiple queued reports require a strict route-order prefix across reloads.
const prefix=simulate({random:()=>0});setWorld(prefix,10);
const multiPath=['picket','relay','corridor'];
assert.equal(prefix.run(`travelTo("corridor","picket",undefined,${JSON.stringify(multiPath)},true)`),true);
const queuedTransit=saved(prefix),multiEvents=json(prefix,'worldRules.pendingEvents(save.world)');
assert.equal(multiEvents.length,2,'the fixed seed produces two route incidents');
assert.deepEqual(queuedTransit.transit.choices,{});
const [firstEvent,secondEvent]=multiEvents;
assert.equal(prefix.run(`resolveTransitEvent(${JSON.stringify(secondEvent.id)},"leave")`),false,'a later report cannot resolve before the first');
const outOfOrder=JSON.parse(JSON.stringify(queuedTransit));outOfOrder.transit.choices[secondEvent.id]='leave';
assert.equal(prefix.run(`validTransit(${JSON.stringify(outOfOrder)})`),false,'save validation rejects a non-prefix event choice');
assert.equal(prefix.run(`validSave(${JSON.stringify(outOfOrder)})`),false,'invalid out-of-order report state is not importable');
assert.equal(prefix.run(`resolveTransitEvent(${JSON.stringify(firstEvent.id)},"run")`),true);
assert.deepEqual(json(prefix,'save.transit.choices'),{[firstEvent.id]:'run'});
const prefixReload=simulate({storage:new Map(prefix.storage),random:()=>0});
assert.equal(prefixReload.run('validSave(save)'),true,'a valid partial report prefix survives reload');
assert.deepEqual(json(prefixReload,'save.transit.choices'),{[firstEvent.id]:'run'});
assert.equal(prefixReload.run(`resolveTransitEvent(${JSON.stringify(secondEvent.id)},"recover")`),true,'the next report resolves after reload');
const resolved= saved(prefixReload),resolvedSnapshot=JSON.stringify(resolved);
assert.equal(resolved.transit,undefined,'the final report closes the transit state');
assert.equal(resolved.credits,queuedTransit.credits+250,'the salvage reward is applied once');
assert.equal(resolved.units[0].condition,90,'each route incident applies hull wear once');
assert.equal(prefixReload.run(`resolveTransitEvent(${JSON.stringify(secondEvent.id)},"recover")`),false,'a resolved report cannot be replayed');
assert.equal(JSON.stringify(saved(prefixReload)),resolvedSnapshot,'replay rejection leaves the career unchanged');

// Unaffordable toll choices leave the report untouched; fractional legacy credits remain valid.
const fractional=simulate({random:()=>0});setWorld(fractional,2);
assert.equal(fractional.run('travelTo("ridge","picket",undefined,["picket","ridge"],true)'),true);
const toll=json(fractional,'worldRules.pendingEvents(save.world)[0]');
fractional.run('save.credits=100;persist()');
const poorSnapshot=JSON.stringify(saved(fractional));
assert.equal(fractional.run(`resolveTransitEvent(${JSON.stringify(toll.id)},"pay")`),false,'an unaffordable event choice is rejected');
assert.equal(JSON.stringify(saved(fractional)),poorSnapshot,'failed event payment leaves the pending report unchanged');
fractional.run('save.credits=10000.5;persist()');
assert.equal(fractional.run(`resolveTransitEvent(${JSON.stringify(toll.id)},"pay")`),true,'fractional credits can resolve an affordable event');
assert.equal(fractional.run('save.credits'),9800.5);
assert.equal(fractional.run('validSave(save)'),true,'fractional credits remain valid in the saved career');
assert.equal(fractional.run(`resolveTransitEvent(${JSON.stringify(toll.id)},"pay")`),false,'the toll cannot be paid twice');

// Delay costs one extra day of upkeep, rest and wound recovery, then clears once.
const delay=simulate({random:()=>0});setWorld(delay,2);
delay.run('save.units[0].condition=50;save.ship={levels:{repair:1}};save.wounds={rook:2};persist()');
const crossingCost=json(delay,'overworld.itineraryQuote(["picket","ridge"],overworld.operatingRates(save),save.credits,0,careerNetwork()).total');
delay.run(`save.credits=${crossingCost};persist()`);
assert.equal(delay.run('travelTo("ridge","picket",undefined,["picket","ridge"],true)'),true);
assert.equal(delay.run('save.credits'),0,'the route consumes the last available credits');
assert.equal(delay.run('save.units[0].condition'),62,'travel applies the first Repair Deck rest tick');
assert.deepEqual(json(delay,'save.wounds'),{rook:1},'travel advances wound recovery once');
const daily=json(delay,'window.IronVowOverworld.operatingRates(save).total');
const delayEvent=json(delay,'worldRules.pendingEvents(save.world)[0]');
assert.equal(delay.run(`resolveTransitEvent(${JSON.stringify(delayEvent.id)},"detour")`),true,'the detour choice extends the crossing');
assert.equal(delay.run('save.day'),3);
assert.equal(delay.run('save.world.day'),3);
assert.equal(delay.run('save.credits'),0,'unpaid delay costs do not create negative cash');
assert.equal(delay.run('save.overworld.arrears'),daily,'an unaffordable delay records upkeep as arrears');
assert.equal(delay.run('save.overworld.lastExpense.paid'),0,'the delayed day records a zero cash payment');
assert.equal(delay.run('save.units[0].condition'),74,'the delay applies a second rest tick');
assert.deepEqual(json(delay,'save.wounds'),{},'the delay completes wound recovery exactly once');
assert.equal(delay.run('save.overworld.lastExpense.kind'),'hold');
assert.equal(delay.run(`resolveTransitEvent(${JSON.stringify(delayEvent.id)},"detour")`),false,'a delayed event cannot be replayed');
assert.equal(delay.run('validSave(save)'),true,'the delayed arrival remains a valid career save');

console.log('PASS deterministic port events, services, market transactions, ordered reports and delayed transit');
