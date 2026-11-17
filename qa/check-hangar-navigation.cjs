// Exercise the live game route seam and its HTML-to-3D hotspot adapter without a renderer.
const assert=require('node:assert/strict');
const createSimulation=require('./sim-harness.cjs');

const {sandbox,run,node}=createSimulation();
const navigation=sandbox.window.IronVowHangarNavigation;
assert.ok(navigation,'the live game exposes its hangar navigation seam');
assert.deepEqual(Array.from(navigation.routes),['ship','facilities','crew-cabin']);
const career=run('JSON.stringify({save,selected})');

assert.equal(navigation.go('facilities'),true);
assert.equal(run('page'),'hangar');
assert.equal(run('hangarDeck'),'base');
assert.ok(node('#ui').innerHTML.includes('data-base-room="cabins"'));
assert.equal(navigation.go('crew-cabin'),true);
assert.equal(run('page'),'hangar');
assert.equal(run('hangarDeck'),'base');
assert.ok(node('#ui').innerHTML.includes('data-base-room="cabins" tabindex="-1"'));
run("hangarDeck='mechs';render()");
for(const route of navigation.routes)assert.ok(node('#ui').innerHTML.includes('data-hangar-hotspot="'+route+'"'));
assert.equal(navigation.go('ship'),true);
assert.equal(run('page'),'ship');
assert.equal(sandbox.document.body.dataset.view,'ship');
assert.equal(run('JSON.stringify({save,selected})'),career,'scene navigation preserves the career and selected pilot');
assert.equal(navigation.go('unknown'),false);
assert.equal(navigation.go('toString'),false);

run('battle={phase:"player"}');
assert.equal(navigation.go('ship'),false,'scene navigation is blocked during combat');
assert.equal(run('page'),'ship');
run('battle=null');
run('careerStale=true');
assert.equal(navigation.go('facilities'),false,'scene navigation is blocked when the career is stale');
run('careerStale=false');

const makeElement=id=>{
 const classes=new Set();
 return {dataset:{hangarHotspot:id},style:{left:'12px',top:'6px'},hidden:false,classList:{
  add(name){classes.add(name)},remove(name){classes.delete(name)},contains(name){return classes.has(name)}
 }};
};
const facilities=makeElement('facilities'),ship=makeElement('ship');
const root={querySelectorAll(selector){assert.equal(selector,'[data-hangar-hotspot]');return [facilities,ship]}};
const found=navigation.hotspots(root);
assert.equal(found.facilities,facilities);
assert.equal(found.ship,ship);
let received;
const controller={setHotspots(items){received=items}};
const disconnect=navigation.project(controller,{facilities:[-2,3,5],ship:[7,11,13],'crew-cabin':[17,19,23],toString:[1,2,3]},root);
assert.deepEqual(JSON.parse(JSON.stringify(received.map(item=>item.position))),[[-2,3,5],[7,11,13]],'only visible real HTML elements are projected');
assert.equal(received[0].element,facilities);
assert.equal(facilities.classList.contains('hangar-scene-hotspot'),true);
facilities.hidden=true;facilities.style.left='700px';facilities.style.top='70px';
disconnect();
assert.deepEqual(JSON.parse(JSON.stringify(received)),[]);
assert.equal(facilities.classList.contains('hangar-scene-hotspot'),false,'disconnect removes the overlay styling');
assert.equal(facilities.hidden,false,'disconnect restores visibility after projection clipping');
assert.deepEqual(facilities.style,{left:'12px',top:'6px'},'disconnect restores previous inline offsets');
assert.throws(()=>navigation.project({}, {}, root),/scene controller/i);
assert.throws(()=>navigation.project(controller,{facilities:[1,2,3],ship:[1,2]},root),/Invalid hangar hotspot position/);
assert.equal(facilities.classList.contains('hangar-scene-hotspot'),false,'invalid later anchors do not partially style earlier elements');
assert.equal(ship.classList.contains('hangar-scene-hotspot'),false);
assert.deepEqual(JSON.parse(JSON.stringify(received)),[],'invalid anchors never reach the scene controller');
let failedCalls=0;
assert.throws(()=>navigation.project({setHotspots(){failedCalls++;throw Error('registration rejected')}},{facilities:[1,2,3]},root),/registration rejected/);
assert.equal(failedCalls,2,'failed controller registration is cleared best-effort');
assert.equal(facilities.classList.contains('hangar-scene-hotspot'),false,'failed registration rolls back overlay styling');

console.log('PASS hangar navigation: live Ship/Facilities/Crew Cabin routes, saved career and pilot preservation, combat/stale guards, existing HTML hotspot projection and cleanup');
