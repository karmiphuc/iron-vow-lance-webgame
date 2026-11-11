const {parseHTML}=require('linkedom');
const {createCanvas,Image}=require('@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.resolve(__dirname,'../dist');
const {document}=parseHTML(fs.readFileSync(path.join(dist,'index.html'),'utf8'));
const scene=document.querySelector('#scene');
scene.getContext=()=>createCanvas(390,844).getContext('2d');
const canvasPrototype=Object.getPrototypeOf(scene),surfaces=new WeakMap();
canvasPrototype.getContext=function(){
 if(!surfaces.has(this))surfaces.set(this,createCanvas(+this.getAttribute('width'),+this.getAttribute('height')));
 return surfaces.get(this).getContext('2d');
};
Object.defineProperty(canvasPrototype,'width',{get(){return +this.getAttribute('width')},set(value){this.setAttribute('width',value)}});
const decoded=new Set();
class LocalImage extends Image {
 set src(url){
  const callback=this.onload;
  this.onload=()=>{decoded.add(url);callback?.()};
  super.src=fs.readFileSync(path.join(dist,url));
 }
}
const storage=new Map();
const context={document,decoded,Image:LocalImage,OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h)}},window:{location:{search:'?view=workshop'},addEventListener(){},matchMedia:()=>({matches:false})},
 console,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},innerWidth:390,innerHeight:844,devicePixelRatio:1,
 requestAnimationFrame(){},setTimeout:fn=>queueMicrotask(fn),clearTimeout(){},Math:Object.create(Math)};
vm.createContext(context);
const run=source=>vm.runInContext(source,context);
const click=selector=>{const node=document.querySelector(selector);assert.ok(node&&!node.disabled,selector);node.click()};
const ready=async condition=>{for(let i=0;i<100;i++){if(run(condition))return;await new Promise(resolve=>setTimeout(resolve,25))}assert.fail(condition)};
for(const file of ['warden-visuals.js','arsenal-visuals.js','armory-visuals.js','theater-layouts.js','prototype-combat.js','scene/billboards.js','game.js'])run(fs.readFileSync(path.join(dist,file),'utf8'));

(async()=>{
 await ready('decodedArt.size===Object.keys(artImages).length');
 const tab=group=>click('[data-armory-class="'+group+'"]');
 const listed=new Set();
 for(const [group,count] of Object.entries({assault:8,strike:8,melee:8})){
  tab(group);
  const cards=[...document.querySelectorAll('[data-weapon-card]')];
  assert.equal(cards.length,count);
  for(const card of cards){
   const id=card.dataset.weaponCard,preview=card.querySelector('.weapon-card-art');
   assert.ok(preview&&fs.existsSync(path.join(dist,preview.getAttribute('src'))),id);
   assert.equal(run(`armoryClass(weapon('${id}'))`),group,id);
   listed.add(id);
  }
 }
 assert.equal(listed.size,24);
 click('[data-paint="#577eac"]');await ready("decoded.has('assets/warden-chassis-left-paint.webp')");
 assert.equal(run("JSON.parse(localStorage.getItem('iron-vow-career')).units[0].paint"),'#577eac');
 assert.ok(run("paintedImages.has('warden-chassis-left#577eac')"));
 tab('assault');click('[data-equip="hailstorm"]');tab('melee');click('[data-equip="cleaver"]');
 assert.equal(run("save.units[0].weapon+' '+save.units[0].melee"),'hailstorm cleaver');
 click('[data-select="1"]');assert.equal(run('save.units[1].paint'),undefined);
 const custom=document.querySelector('#custom-paint');custom.value='#335544';custom.oninput();custom.onchange();
 assert.equal(run('save.units[1].paint'),'#335544');
 click('[data-select="2"]');assert.ok(run("wardenVisual(selected,'missile',-1).podR"));
 run('save.credits=20000;render()');
 for(const id of ['breaker','piledriver'])click('[data-equip="'+id+'"]');
 tab('strike');click('[data-equip="rampart"]');
 click('#remove-melee');assert.equal(run('save.units[2].melee'),undefined);
 run("createBattle(0,false,true);selected=0;action='move';renderBattle();Math.random=()=>0");
 assert.ok(run("battle.units.filter(u=>u.team==='enemy'&&!u.kind).every(u=>HOSTILE_LIVERIES.some(([p,s])=>u.paint===p&&u.trim.s===s)&&activeWardenVisual(u).modular)"));
 click('#strike');assert.equal(run('action'),'strike');
 run('persist()');
 assert.equal(run("JSON.parse(localStorage.getItem('iron-vow-career')).sortie.action"),'strike');
 for(const id of ['breaker','cleaver','piledriver','hailstorm','rampart']){
  assert.ok(await run(`(async()=>{
   const u=current(),target=battle.units[3],w=weapon('${id}');u.ap=8;target.hp.left=target.max.left;
   const effectStart=effects.length;
   await shoot(u,target,'left',w);
   return u.ap===8-w.ap&&target.hp.left<target.max.left&&
    effects.slice(effectStart).some(effect=>effect.type==='shot'&&effect.kind===w.id);
  })()`),id);
 }
 // Piledriver extension now uses the real 3D spike; check-production-weapons covers it.
 assert.ok(run("arsenal.chassis.every(views=>Object.values(views).every(v=>MELEE.every(w=>v.motion[w.id==='blade'?'cleaver':weaponMotion(w.id)].some(p=>p.level===.7))))"));
 for(const [frame,views] of JSON.parse(run('JSON.stringify(arsenal.chassis)')).entries()){
  if(frame===0)continue; // Warden's sprite assertions are replaced by actual-bone checks.
  for(const [view,visual] of Object.entries(views)){
   const {attackMotion:atlas}=visual;
   const {prime,aim,kick,breaker,cleaver,piledriver}=atlas;
   assert.equal(prime.length,9);
   for(const suffix of ['', '-paint'])assert.ok(fs.existsSync(path.join(dist,'assets',atlas.key+suffix+'.webp')));
   const start=prime[0],plant=prime.at(-1);
   assert.ok((plant.leadFoot[0]-start.leadFoot[0])*(view==='right'?1:-1)>.04,atlas.key);
   assert.ok(Math.min(...prime.map(f=>f.leadFoot[1]))<Math.min(start.leadFoot[1],plant.leadFoot[1])-.03,atlas.key);
   for(const f of [...prime,...aim,...kick,...breaker,...cleaver,...piledriver])assert.deepEqual(f.rearFoot,start.rearFoot,atlas.key);
   for(const f of [...aim,...kick,...breaker,...cleaver,...piledriver])assert.deepEqual(f.leadFoot,plant.leadFoot,atlas.key);
   assert.ok([breaker,cleaver,piledriver].every(m=>m.some(f=>f.level===.7)),atlas.key);
   run(`selected=${frame};current().face=${view==='right'?1:-1};current().attack={kind:'rifle',start:0,primeDuration:.60};drawUnitBody(current(),.3)`);
   await ready(`decoded.has('assets/${atlas.key}.webp')`);
   assert.equal(run("wardenMotionFrame(current(),activeWardenVisual(current()),animationPose(current(),.3)).frame.level"),.5);
   run("current().attack.fireAt=.9;current().attack.releaseAt=1.1");
   assert.equal(run("animationPose(current(),1.25).primePhase"),'planted');
   assert.equal(run("animationPose(current(),1.6).primePhase"),'return');
   run("current().attack=null");
  }
 }
 for(const [index,name] of ['relay','corridor','frontier'].entries()){
  run(`effects=[];createBattle(${index+1});fieldCamera.overview=true;action='move'`);
  assert.equal(run('battle.field.ground'),name);
  assert.equal(run('new Set(Object.values(battle.field.cover)).size'),2);
  assert.ok(run(`Array.from(battle.cover).every(key=>{
   const [x,z]=key.split(',').map(Number);
   return !paths(current()).has(key)&&inCover({x:x-1,z});
  })`));
 }
 console.log('PASS: remaining billboard attack atlases, 24 classified weapon previews, chassis paint and hostile liveries, independent loadouts, strike saves, attack AP/damage, Piledriver extension, and three theater rules with cover and pathing.');
})().catch(error=>{console.error(error);process.exitCode=1});
