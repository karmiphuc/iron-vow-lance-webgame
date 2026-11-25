const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const sim=simulate({random:()=>0}),run=sim.run;
const quote=(id,seats,tier=0,percent=100)=>run(
 `worldContractPay(CONTRACTS.find(c=>c.id===${JSON.stringify(id)}),${seats},{payPercent:${percent}},${tier})`
);
const solo=['picket','salt-works','whiteout-patrol','blind-crossing'];
const hard=[['corridor',4,6850],['frontier',5,9800],['distress-lift',3,7950],['distress-crossing',3,8600],['distress-quarry',3,9000]];
for(const [id,seats,fee] of hard){
 assert.equal(quote(id,seats),fee,id);
 assert.ok(quote(id,seats,0,90)>2*Math.max(...solo.map(id=>quote(id,1,0,110))),id+' pays more than twice the top solo quote even at the worst dispatch rate');
}
assert.equal(quote('salt-works',1),2250);
assert.equal(quote('salt-works',3),2250,'fixed-seat contracts price the required lance');
assert.equal(quote('picket',1),2000);
assert.equal(quote('picket',3),4350,'posted Picket prices the full enemy force');
assert.equal(quote('corridor',4)-quote('corridor',3),500,'four-seat operation earns a larger fee for the same hostile roster');
assert.equal(quote('frontier',5)-quote('frontier',3),1400,'five-seat operation prices the two extra seats and the wave');
assert.equal(quote('rail-air',3,2,110),0,'interception stays unpaid even with all modifiers');
assert.equal(quote('corridor',4,2,90),Math.round(Math.round(6850*1.25)*.9));

run(`save.world=worldRules.createWorld(42,save.day);save.overworld={port:'mercy',arrears:0};
 const offer=availableOffers('mercy').find(o=>CONTRACTS[o.templateIndex].id==='distress-lift');
 const fee=worldContractPay(CONTRACTS[offer.templateIndex],3,offer);
 const costs=overworld.operatingRates(save).total;
 contractPortSelection='mercy';`);
const fee=run('fee'),costs=run('costs');
assert.ok(run('pooledContractsPage()').includes('CONTRACT PAYMENT</span><b>'+fee.toLocaleString()+' CR'));
assert.ok(run('pooledContractsPage()').includes('After daily costs · '+(fee-costs).toLocaleString()+' CR'));
run('deploy(offer.templateIndex,false,[0,1,2],null,null,offer)');
const resumed=simulate({storage:new Map(sim.storage)});
assert.equal(resumed.run("battle.units.filter(u=>u.team==='enemy').length"),7);
const start=resumed.run('save.credits');
assert.equal(resumed.run('worldContractPay(battle.contract,3,battle.offer)'),fee);
const bonus=resumed.run('regionalReward(battle.offer,battle.offer.acceptedDay)?.credits??0');
resumed.run('finish(true)');
assert.equal(resumed.run('save.history.at(-1).pay'),fee+bonus);
assert.equal(resumed.run('save.credits'),start+fee+bonus-costs);
assert.ok(resumed.node('#modal').innerHTML.includes('CONTRACT PAYMENT</span><b>'+fee.toLocaleString()+' CR'));
console.log('PASS contract fee ladder, modifiers, board estimate, and exact seven-contact payout after reload');
