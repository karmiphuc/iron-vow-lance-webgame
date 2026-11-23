const assert=require('node:assert/strict');
global.window={};
require('../dist/overworld-world.js');
const W=window.IronVowWorld;
const world=W.createWorld(12345,1),snapshot=JSON.stringify(world);
assert(W.validWorld(world));
assert(W.validOptionalWorld(undefined));
assert.equal(W.validOptionalWorld(null),false);
assert.equal(W.PORTS.length,6);
assert.equal(W.ROUTES.length,8);
assert.deepEqual(W.createWorld(12345,1),world);
const offers=W.offersAt(world,'picket');
assert(offers.length>=1&&offers.length<=3);
assert.equal(offers[0].templateIndex,0);
for(let seed=0;seed<100;seed++)assert.equal(W.offersAt(W.createWorld(seed,1),'picket')[0].templateIndex,0);
for(let seed=0;seed<40;seed++)for(let day=1;day<=81;day+=4){
 const state=W.createWorld(seed,day),all=W.PORTS.flatMap(port=>{
  const local=W.offersAt(state,port.id);
  const featured=local.filter(offer=>offer.templateIndex===4);
  assert.equal(featured.length,Number(port.id==='corridor'));
  assert(local.length-featured.length<=3);
  assert.equal(new Set(local.map(o=>o.templateIndex)).size,local.length);
  return local;
 });
 assert(all.length>=1);
}
const saltWorks=W.offersAt(world,'corridor').find(offer=>offer.templateIndex===4);
assert.equal(saltWorks.id,'offer:corridor:1:3');
assert(!W.offersAt(W.consumeOffer(world,saltWorks.id),'corridor').some(offer=>offer.id===saltWorks.id));
assert(offers.every(o=>o.templateIndex>=0&&o.templateIndex<4&&o.postedDay===1&&o.expiryDay===4));
assert(W.offersAt(world,'picket',4).every(o=>o.availableOnArrival));
assert(W.offersAt(world,'picket',5).every(o=>!o.availableOnArrival));
const consumed=W.consumeOffer(world,offers[0].id);
const scouted=W.scoutOffer(world,offers[0].id);
assert(W.offersAt(scouted,'picket')[0].scouted);
assert(!W.offersAt(world,'picket')[0].scouted);
assert.deepEqual(JSON.parse(JSON.stringify(scouted)).scouted,[offers[0].id]);
assert.equal(W.scoutOffer(scouted,offers[0].id),null);
assert.equal(W.scoutOffer(consumed,offers[0].id),null);
assert.equal(W.scoutOffer(world,'offer:picket:1:99'),null);
assert.deepEqual(W.consumeOffer(scouted,offers[0].id).scouted,[]);
assert.deepEqual(W.advanceWorld(scouted,4).scouted,[offers[0].id]);
assert.deepEqual(W.advanceWorld(scouted,5).scouted,[]);
assert.equal(W.validWorld({...world,scouted:[offers[0].id,offers[0].id]}),false);
assert.equal(W.validWorld({...world,scouted:['offer:picket:1:99']}),false);
assert.equal(W.validWorld({...consumed,scouted:[offers[0].id]}),false);
assert(!W.offersAt(consumed,'picket').some(o=>o.id===offers[0].id));
assert.equal(W.consumeOffer(consumed,offers[0].id),null);
assert.deepEqual(W.offersAt(JSON.parse(JSON.stringify(consumed)),'picket'),W.offersAt(consumed,'picket'));
assert.equal(W.advanceWorld(consumed,0),null);
const next=W.advanceWorld(consumed,5);
assert(!W.offersAt(next,'picket').some(o=>o.id===offers[0].id));
assert.deepEqual(next.consumed,[]);
assert.equal(W.advanceWorld(next,1),null);
const counts=new Set();
for(let day=5;day<=200;day+=4)counts.add(W.offersAt(W.advanceWorld(world,day),'picket').length);
assert.deepEqual([...counts].sort(),[0,1,2,3]);
assert.deepEqual(W.markersAt(world,10),W.markersAt(world,10));
assert.notDeepEqual(W.markersAt(world,10),W.markersAt(world,11));
for(const day of [1,10,11,Number.MAX_SAFE_INTEGER]){
 const markers=W.markersAt(world,day);
 assert.deepEqual(markers,W.markersAt(JSON.parse(JSON.stringify(world)),day));
 for(const marker of markers){
  const from=W.PORTS.find(p=>p.id===marker.from),to=W.PORTS.find(p=>p.id===marker.to);
  let idHash=0;
  for(const c of marker.id)idHash=(Math.imul(idHash,31)+c.charCodeAt(0))>>>0;
  assert.equal(marker.fraction,.2+(((day%61)*17+idHash%41)%61)/100);
  assert(marker.fraction>=.2&&marker.fraction<=.8);
  assert(marker.x>=Math.min(from.x,to.x)/100&&marker.x<=Math.max(from.x,to.x)/100);
  assert(marker.y>=Math.min(from.y,to.y)/100&&marker.y<=Math.max(from.y,to.y)/100);
 }
}
assert.notEqual(W.markersAt(world,10)[0].fraction,W.markersAt(world,11)[0].fraction);
assert.deepEqual(W.portProfile(12345,'ridge'),W.portProfile(12345,'ridge'));
assert.deepEqual(W.portProfile(12345,'corridor').frames,[6,7,8,22]);
assert(W.portProfile(12345,'relay').weapons.includes('watchman'));
assert.notDeepEqual(W.portProfile(12345,'picket').weapons,W.portProfile(12345,'frontier').weapons);
const catalog=JSON.parse(require('./sim-harness.cjs')().run('JSON.stringify(WEAPONS.filter(w=>!w.builtIn&&!w.shoulder).map(w=>w.id))'));
const stock=W.PORTS.flatMap(port=>W.portProfile(12345,port.id).weapons);
assert.deepEqual([...new Set(stock)].sort(),catalog.sort());
assert.deepEqual(W.PORTS.map(port=>W.portProfile(12345,port.id).faction),
 ['Karst Wardens','Relay Union','Vanta Combine','Halcyon Guard','Ridge Freeholders','Haven Salvors']);
assert.equal(W.portProfile(1,'unknown'),null);
const route=['picket','relay','corridor'];
const eventWorld=Array.from({length:500},(_,seed)=>W.createWorld(seed,1)).find(state=>W.transitEvents(state,route).length===2);
assert(eventWorld);
const forecast=W.transitEvents(eventWorld,route);
assert.equal(forecast.length,2);
assert(forecast.every(e=>e.choices.length>=2&&e.choices.length<=3));
assert.equal(W.resolveEvent(eventWorld,forecast[0].id,forecast[0].choices[0].id),null);
const queued=W.queueTransitEvents(eventWorld,route);
assert.deepEqual(W.pendingEvents(queued),forecast);
assert.equal(W.queueTransitEvents(queued,route),null);
assert.equal(W.resolveEvent(queued,forecast[0].id,'unknown'),null);
const resolved=W.resolveEvent(queued,forecast[0].id,forecast[0].choices[0].id);
assert.deepEqual(resolved.effect,{credits:forecast[0].choices[0].credits,hullCondition:forecast[0].choices[0].hullCondition,delayDays:forecast[0].choices[0].delayDays,rep:forecast[0].choices[0].rep,port:'relay'});
assert.equal(W.resolveEvent(resolved.world,forecast[0].id,forecast[0].choices[0].id),null);
assert.equal(W.pendingEvents(JSON.parse(JSON.stringify(resolved.world))).length,1);
const bothResolved=W.resolveEvent(resolved.world,forecast[1].id,forecast[1].choices[0].id).world;
assert.deepEqual(W.pendingEvents(W.queueTransitEvents(bothResolved,route)),[]);
assert.equal(W.resolveEvent(JSON.parse(JSON.stringify(bothResolved)),forecast[0].id,forecast[0].choices[0].id),null);
const later=W.advanceWorld(resolved.world,2);
assert(W.validWorld(later));
const remaining=W.resolveEvent(later,forecast[1].id,forecast[1].choices[0].id);
assert(W.validWorld(remaining.world));
assert.equal(W.resolveEvent(remaining.world,forecast[1].id,forecast[1].choices[0].id),null);
assert.equal(W.advanceWorld(remaining.world,1),null);
assert(!W.transitEvents(remaining.world,route).some(event=>event.id===forecast[0].id));
const kinds=new Set();let eligible=0,total=0,nonTrigger;
for(let seed=0;seed<100;seed++)for(let day=1;day<=30;day++){
 const state=W.createWorld(seed,day);
 for(const leg of W.ROUTES){
  total++;
  const events=W.transitEvents(state,[leg.from,leg.to]);
  if(!events.length){nonTrigger??={state,leg};continue;}
  eligible++;
  const event=events[0];kinds.add(event.kind);
  assert(event.choices.length>=2&&event.choices.length<=3);
  assert(event.choices.some(choice=>choice.credits>=0));
  if(event.kind==='weather'||event.kind==='patrol'){
   const markerKind=event.kind==='weather'?'storm':'patrol';
   assert(W.markersAt(state,event.legDay).some(marker=>marker.kind===markerKind&&marker.from===leg.from&&marker.to===leg.to));
  }
 }
}
assert.deepEqual([...kinds].sort(),['distress','patrol','salvage','toll','weather']);
assert(eligible/total>.28&&eligible/total<.38);
const invalidId=`event:${nonTrigger.state.day}:${nonTrigger.state.day}:0:${nonTrigger.leg.from}:${nonTrigger.leg.to}`;
assert.equal(W.validWorld({...nonTrigger.state,pendingEvents:[invalidId]}),false);
assert.equal(W.resolveEvent(nonTrigger.state,invalidId,'pass'),null);
assert.deepEqual(W.pendingEvents(W.queueTransitEvents(nonTrigger.state,[nonTrigger.leg.from,nonTrigger.leg.to])),[]);
assert.equal(forecast[1].legDay,forecast[0].legDay+1);
assert.equal(W.transitEvents(world,['picket','frontier']),null);
assert.equal(W.transitEvents(world,['picket','relay','picket']),null);
assert.equal(W.validWorld({...world,seed:-1}),false);
assert.equal(W.validWorld({...world,consumed:['offer:picket:1:99']}),false);
assert.equal(W.validWorld({...world,pendingEvents:['event:1:0:picket:frontier']}),false);
assert.equal(W.validWorld({...world,extra:true}),false);
assert.equal(W.validWorld({...consumed,consumed:[offers[0].id,offers[0].id]}),false);
assert.equal(W.validWorld({...queued,pendingEvents:[forecast[0].id,forecast[0].id]}),false);
assert.equal(W.validWorld({...resolved.world,resolvedEvents:[forecast[0].id,forecast[0].id]}),false);
assert.equal(W.validWorld({...queued,pendingEvents:[forecast[0].id],resolvedEvents:[forecast[0].id]}),false);
assert.equal(W.validWorld({...world,standings:{picket:101}}),false);
assert.equal(W.validWorld({...world,standings:{unknown:1}}),false);
const limit=Number.MAX_SAFE_INTEGER;
const nearLimit=W.createWorld(42,limit-2);
assert(W.validWorld(nearLimit));
const atLimit=W.advanceWorld(nearLimit,limit);
assert(W.validWorld(atLimit));
for(const port of W.PORTS)for(const o of W.offersAt(atLimit,port.id)){
 assert(Number.isSafeInteger(o.postedDay)&&Number.isSafeInteger(o.expiryDay));
 assert(o.postedDay<=limit&&o.expiryDay===limit);
}
assert(W.markersAt(atLimit,limit));
assert(W.transitEvents(atLimit,['picket','relay']));
assert.equal(W.advanceWorld(atLimit,limit+1),null);
assert.equal(JSON.stringify(world),snapshot);
console.log('Overworld world: all checks passed');
