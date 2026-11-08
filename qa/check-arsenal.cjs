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
for(const file of ['warden-visuals.js','arsenal-visuals.js','game.js'])run(fs.readFileSync(path.join(dist,file),'utf8'));

(async()=>{
 await ready('decodedArt.size===Object.keys(artImages).length');
 assert.equal(document.querySelectorAll('[data-equip]').length,9);
 const weaponPreviews=[...document.querySelectorAll('[data-equip] .weapon-card-art')];
 assert.equal(weaponPreviews.length,9);
 for(const preview of weaponPreviews)assert.ok(fs.existsSync(path.join(dist,preview.getAttribute('src'))));
 click('[data-paint="#577eac"]');await ready("decoded.has('assets/warden-chassis-left-paint.webp')");
 assert.equal(run("JSON.parse(localStorage.getItem('iron-vow-career')).units[0].paint"),'#577eac');
 assert.ok(run("paintedImages.has('warden-chassis-left#577eac')"));
 click('[data-equip="hailstorm"]');click('[data-equip="cleaver"]');
 assert.equal(run("save.units[0].weapon+' '+save.units[0].melee"),'hailstorm cleaver');
 click('[data-select="1"]');assert.equal(run('save.units[1].paint'),undefined);
 const custom=document.querySelector('#custom-paint');custom.value='#335544';custom.oninput();custom.onchange();
 assert.equal(run('save.units[1].paint'),'#335544');
 click('[data-select="2"]');assert.ok(run("wardenVisual(selected,'missile',-1).podR"));
 run('save.credits=20000');
 for(const id of ['breaker','piledriver','rampart'])click('[data-equip="'+id+'"]');
 click('#remove-melee');assert.equal(run('save.units[2].melee'),undefined);
 run("createBattle(0);selected=0;action='move';renderBattle();Math.random=()=>0");
 assert.ok(run("battle.units.filter(u=>u.team==='enemy').every(u=>u.paint===HOSTILE_PAINT&&activeWardenVisual(u).modular)"));
 click('#strike');assert.equal(run('action'),'strike');
 run('persist()');
 assert.equal(run("JSON.parse(localStorage.getItem('iron-vow-career')).sortie.action"),'strike');
 for(const id of ['breaker','cleaver','piledriver','hailstorm','rampart']){
  assert.ok(await run(`(async()=>{
   const u=current(),target=battle.units[3],w=weapon('${id}');u.ap=8;target.hp.left=target.max.left;
   await shoot(u,target,'left',w);
   return u.ap===8-w.ap&&target.hp.left<target.max.left&&effects.at(-3).kind===w.id;
  })()`),id);
 }
 assert.equal(run(`(()=>{
  const v=activeWardenVisual(current()),bounds=unitBounds(current(),v);
  const idle=weaponMount(v,v,bounds,'piledriver',unitFacing(current()),0);
  const hit=weaponMount(v,v,bounds,'piledriver',unitFacing(current()),.7);
  return !idle.asset.key.includes('extended')&&hit.asset.key.includes('extended');
 })()`),true);
 assert.ok(run("arsenal.chassis.every(views=>Object.values(views).every(v=>MELEE.every(w=>v.motion[w.id].some(p=>p.level===.7))))"));
 for(const [index,name] of ['relay','corridor','frontier'].entries()){
  run(`createBattle(${index});action='move';battlefield(clock)`);
  await ready(`decoded.has('assets/ground-${name}.webp') && Object.values(battle.field.cover).every(prop=>decoded.has('assets/cover-'+prop+'.webp'))`);
  assert.equal(run('battle.field.ground'),name);
  assert.equal(run('new Set(Object.values(battle.field.cover)).size'),2);
  assert.ok(run(`Array.from(battle.cover).every(key=>{
   const [x,z]=key.split(',').map(Number);
   return !paths(current()).has(key)&&inCover({x:x-1,z});
  })`));
  run('battlefield(clock)');
 }
 console.log('PASS: nine weapon previews, per-chassis paint, red hostiles, independent loadouts, strike saves, new attack AP/damage, Piledriver extension, and all three terrain sets with matching cover and pathing.');
})().catch(error=>{console.error(error);process.exitCode=1});
