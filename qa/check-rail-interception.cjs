const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

function railCareer(){
 const sim=simulate();
 sim.run(`save.day=5;save.world=worldRules.createWorld(42,5);save.credits=100000;persist();`);
 return sim;
}

const campaign=railCareer();
assert.equal(campaign.run(`worldRules.blockades(save.world,save.history,4).length`),0);
assert.equal(campaign.run(`worldRules.blockades(save.world,save.history).length`),2);
assert.equal(campaign.run(`worldRules.blockades(save.world,save.history).every((patrol,index)=>
 patrol.port!==worldRules.blockades(save.world,save.history,9)[index].port)`),true);
assert.equal(campaign.run(`JSON.stringify(worldRules.blockades(save.world,[]))!==
 JSON.stringify(worldRules.blockades(worldRules.createWorld(13,5),[]))`),true);
assert.equal(campaign.run(`const routes=chartRouteOptions('picket','iron');
 routes.some(route=>route.encounter?.port==='brine'&&route.path.at(-1)==='brine')&&
 routes.some(route=>!route.encounter&&route.path.at(-1)==='iron')`),true);
assert.equal(campaign.run(`const course=chartRouteOptions('picket','brine').find(route=>route.encounter);
 travelTo('brine','picket',course.total,course.path,true)`),true);
const onArrival=simulate({storage:campaign.storage});
assert.equal(onArrival.run(`battle?.contract.id`),'rail-air');
assert.equal(onArrival.run(`battle?.units.some(unit=>unit.kind==='helicopter')`),true);
assert.equal(onArrival.run(`JSON.parse(localStorage.getItem('iron-vow-career')).interception.port`),'brine');
const resumed=simulate({storage:campaign.storage});
assert.equal(resumed.run(`battle?.interception.id`),'occupation:air:5');
resumed.run(`const creditsBefore=save.credits, winsBefore=save.wins, xpBefore=save.units[0].xp;
 for(const unit of battle.units.filter(unit=>unit.team==='enemy')){unit.alive=false;if(unit.kind)unit.hp.body=0;else unit.hp.pilot=0;}
 finish(true);`);
assert.equal(resumed.run(`save.credits===creditsBefore&&save.history.at(-1).pay===0&&save.wins===winsBefore`),true);
assert.equal(resumed.run(`save.units[0].xp>xpBefore`),true);
assert.equal(resumed.run(`Object.values(save.salvage??{}).some(count=>count>0)`),true);
assert.equal(resumed.run(`companyPort()==='brine'&&!save.interception&&
 !worldRules.blockades(save.world,save.history).some(patrol=>patrol.kind==='air')`),true);
assert.equal(resumed.run(`worldRules.blockades(save.world,save.history,9).length`),2);

const losing=railCareer();
assert.equal(losing.run(`const retreatCourse=chartRouteOptions('picket','brine').find(option=>option.encounter);
 travelTo('brine','picket',retreatCourse.total,retreatCourse.path,true);render();const reserve=save.credits;finish(false);
 !save.interception&&companyPort()==='picket'&&save.credits===reserve&&
 worldRules.blockades(save.world,save.history).some(patrol=>patrol.port==='brine')`),true);

console.log('PASS two rotating patrols, route interception, save/resume, zero-credit XP and salvage, and withdrawal');
