const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=process.env.IRON_VOW_QA_OUTPUT;
if(out)fs.mkdirSync(out,{recursive:true});
const capture=(name,canvas)=>{if(out)fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png'))};
GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/inter-100-900.woff2'),'Inter');
const {document}=parseHTML(fs.readFileSync(root+'/dist/index.html','utf8'));const native=createCanvas(1440,1024),domCanvas=document.querySelector('#scene');domCanvas.getContext=()=>native.getContext('2d');Object.defineProperties(domCanvas,{width:{get:()=>native.width,set:v=>native.width=v},height:{get:()=>native.height,set:v=>native.height=v}});
class LocalImage extends Image{set src(v){super.src=fs.readFileSync(path.join(root,'dist',v))}get src(){return super.src}}
class NativeSurface{constructor(w,h){return createCanvas(w,h)}}
const storage=new Map([['iron-vow-career',JSON.stringify(require('./fixtures/stock-career.json'))]]),warnings=[];const context={document,Image:LocalImage,OffscreenCanvas:NativeSurface,console:{log:console.log,warn:(...a)=>warnings.push(a.join(' ')),error:console.error},window:{location:{search:'?view=ship'},addEventListener:()=>{},matchMedia:()=>({matches:false})},innerWidth:1440,innerHeight:1024,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:()=>{},setTimeout:r=>{queueMicrotask(r);return 1},clearTimeout:()=>{},URL,Blob,Math:Object.create(Math)};
vm.createContext(context);for(const file of ['theater-layouts.js','combat-simulation.js','overworld-world.js','overworld.js','overworld-view.js','foundry/field-paint.js','gun-audio.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);const run=c=>vm.runInContext(c,context),get=s=>document.querySelector(s),click=s=>{let b=get(s);assert.ok(b,'Missing '+s);assert.ok(!b.disabled,'Disabled '+s);b.click()};
function checkHangarNavigation(){
 const navigation=context.window.IronVowHangarNavigation;
 assert.ok(navigation);
 assert.deepEqual(Array.from(navigation.routes),['ship','facilities','crew-cabin']);
 run('ensureWorld()'); // Initialize the chart's lazy world before comparing navigation-only changes.
 const careerBeforeRoutes=run('JSON.stringify({save,selected})');
 let destinations=navigation.hotspots();
 assert.equal(destinations.facilities,get('[data-hangar-hotspot="facilities"]'));
 assert.deepEqual(Object.keys(destinations),['facilities']);

 const projected=[];
 const unproject=navigation.project({setHotspots:items=>projected.push(items)},
  {facilities:[1,2,3],ship:[4,5,6],'crew-cabin':[7,8,9]});
 assert.deepEqual(Array.from(projected[0],item=>Array.from(item.position)),[[1,2,3]]);
 assert.equal(projected[0][0].element,get('[data-hangar-hotspot="facilities"]'));
 assert.ok(get('[data-hangar-hotspot="facilities"]').classList.contains('hangar-scene-hotspot'));
 unproject();
 assert.deepEqual(JSON.parse(JSON.stringify(projected[1])),[]);
 assert.equal(get('[data-hangar-hotspot="facilities"]').classList.contains('hangar-scene-hotspot'),false);
 assert.throws(()=>navigation.project({setHotspots(){}},{ship:[1,2]}),/Invalid hangar hotspot position/);

 assert.equal(navigation.go('crew-cabin'),true);
 assert.equal(document.body.dataset.view,'hangar');
 assert.ok(get('[data-base-room="cabins"]'));
 assert.equal(navigation.hotspots()['crew-cabin'],undefined);
 assert.equal(run('JSON.stringify({save,selected})'),careerBeforeRoutes);
 click('[data-hangar-deck="mechs"]');
 click('#nav [data-primary="bridge"]');click('[data-page="ship"]');
 assert.equal(document.body.dataset.view,'ship');
 assert.equal(run('JSON.stringify({save,selected})'),careerBeforeRoutes);
 click('#nav [data-primary="bay"]');click('[data-hangar-deck="base"]');
 assert.equal(document.querySelectorAll('.base-room').length,4);
 assert.equal(run('JSON.stringify({save,selected})'),careerBeforeRoutes);
}
(async()=>{assert.equal(warnings.length,0);assert.equal(document.body.dataset.view,'ship');assert.equal(document.querySelectorAll('#nav button').length,3,'Primary navigation');assert.equal(document.querySelectorAll('.ship-facility').length,4);click('[data-hangar-deck="mechs"]');assert.equal(document.querySelectorAll('.command-deck [data-select]').length,2);assert.equal(document.querySelectorAll('[data-hangar-hotspot]').length,1,'Facilities is the Mech Bay hotspot');
checkHangarNavigation();
click('#field-journal');assert.equal(document.body.dataset.view,'journal');
assert.equal(document.querySelectorAll('.manual-topics > div').length,10);
assert.match(document.querySelector('.manual-topics').textContent,/all hits go to the left arm/);
click('[data-journal="wiki"]');assert.equal(document.querySelectorAll('.wiki-pilot').length,8);
assert.equal(document.querySelectorAll('.wiki-paths li').length,144);
click('#nav [data-primary="bay"]');click('[data-hangar-deck="base"]');
assert.equal(document.body.dataset.view,'hangar');assert.equal(document.querySelectorAll('.base-room').length,4);
click('[data-hangar-deck="mechs"]');
click('#inspect');assert.ok(get('.unit-inspect'));click('[data-select="1"]');assert.match(get('.selected-chassis').textContent,/KESTREL/);assert.match(get('.unit-inspect').textContent,/Jin Takeda/);click('#close-inspect');assert.equal(get('.unit-inspect'),null);
click('[data-page="workshop"]');click('[data-select="0"]');
assert.equal(get('.rig-bench-link').getAttribute('href'),'?bench=rig&frame=0');

run('save.dispatch={day:save.day,sizes:[3,2,1,3]}');click('#nav [data-primary="bridge"]');click('[data-chart-contracts]');assert.equal(document.querySelectorAll('[data-world-offer]').length,2);click('[data-deploy="0"]');assert.equal(run('battle'),null);click('#modal-1');assert.equal(run('battle.units.length'),7);assert.equal(get('#modal').hidden,false);click('#modal-0');assert.equal(get('#modal').hidden,true);
assert.equal(document.querySelectorAll('[data-part]').length,5);assert.equal(document.querySelectorAll('.parts button, .parts [aria-pressed]').length,0,'target part health is read-only: nothing to aim');assert.equal(document.querySelectorAll('[data-unit]').length,3);
click('[data-unit="0"]');run('current().ap=12');click('#skill');assert.equal(run('current().ap'),14);assert.equal(get('#skill').disabled,true);click('#brace');assert.equal(run('current().ap'),12);assert.equal(run('current().brace'),true);click('#fire');assert.equal(run('action'),'fire');assert.equal(run("typeof targetPart"),'undefined','no player part selection state');
// UI and game-command assertions only. Real scene rendering and captures run in Chromium.
run("selected=0;battle.units[0].x=3;battle.units[0].z=5;battle.units[0].vx=3;battle.units[0].vz=5;battle.units[3].x=4;battle.units[3].z=5;battle.units[3].vx=4;battle.units[3].vz=5;lockedTarget=battle.units[3].id;Math.random=()=>0");await run("shoot(current(),battle.units[3],'body')");assert.ok(run('battle.units[3].hp.body')<run('battle.units[3].max.body'));run('renderBattle()');
context.innerWidth=390;context.innerHeight=844;run('resize()');run('renderBattle()');click('#target-toggle');assert.equal(document.body.dataset.targetPanel,'open');assert.equal(document.querySelectorAll('button[data-part]').length,0);click('#close-target');assert.equal(document.body.dataset.targetPanel,'closed');context.innerWidth=1440;context.innerHeight=1024;run('resize();renderBattle()');
click('#withdraw');click('#modal-1');assert.equal(run('battle'),null);assert.equal(get('#modal').hidden,false);assert.match(get('#modal').textContent,/CREW WAGES/);assert.equal(run('save.overworld.lastExpense.total'),390);click('#modal-1');assert.equal(document.body.dataset.view,'workshop');click('[data-equip="shotgun"]');assert.equal(run('save.units[selected].weapon'),'shotgun');assert.equal(run('save.credits'),2610);click('[data-upgrade]');assert.equal(run('save.units[selected].upgrade'),1);assert.equal(run('save.credits'),810);click('#nav [data-primary="company"]');assert.equal(document.querySelectorAll('.pilot-image img').length,3);click('[data-page="career"]');assert.equal(document.querySelectorAll('.history-row').length,1);assert.ok(storage.has('iron-vow-career'));
let refs=[...document.querySelectorAll('img[src]')].map(x=>x.getAttribute('src'));for(const a of refs)assert.ok(fs.existsSync(path.join(root,'dist',a)),a);assert.equal(warnings.length,0);run("save.credits=0;save.units[0].condition=12;selected=0;page='workshop';render()");click('[data-patch]');assert.equal(run('save.units[0].condition'),50);assert.equal(run('save.credits'),0);
console.log('PASS: actual DOM navigation, hangar selection/details, contract deployment, manual modal, combat controls, skills, brace, read-only target part health, damage, withdrawal, workshop purchase/upgrade, pilots, career record, local images; desktop and mobile DOM layouts (3D rendering checked separately).');})().catch(e=>{console.error(e);process.exitCode=1});
