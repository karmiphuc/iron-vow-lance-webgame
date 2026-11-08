const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'design');
GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/inter-100-900.woff2'),'Inter');
const {document}=parseHTML(fs.readFileSync(root+'/dist/index.html','utf8'));const native=createCanvas(1440,1024),domCanvas=document.querySelector('#scene');domCanvas.getContext=()=>native.getContext('2d');Object.defineProperties(domCanvas,{width:{get:()=>native.width,set:v=>native.width=v},height:{get:()=>native.height,set:v=>native.height=v}});
class LocalImage extends Image{set src(v){super.src=fs.readFileSync(path.join(root,'dist',v))}get src(){return super.src}}
class NativeSurface{constructor(w,h){return createCanvas(w,h)}}
const storage=new Map(),warnings=[];const context={document,Image:LocalImage,OffscreenCanvas:NativeSurface,console:{log:console.log,warn:(...a)=>warnings.push(a.join(' ')),error:console.error},window:{addEventListener:()=>{},matchMedia:()=>({matches:false})},innerWidth:1440,innerHeight:1024,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:()=>{},setTimeout:r=>{queueMicrotask(r);return 1},clearTimeout:()=>{},URL,Blob,Math:Object.create(Math)};
vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/dist/warden-visuals.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/dist/game.js','utf8'),context);const run=c=>vm.runInContext(c,context),get=s=>document.querySelector(s),click=s=>{let b=get(s);assert.ok(b,'Missing '+s);assert.ok(!b.disabled,'Disabled '+s);b.click()};
(async()=>{for(let attempt=0;attempt<100;attempt++){if(run('decodedArt.size===Object.keys(artImages).length&&Object.keys(rigidParts).length===3'))break;await new Promise(r=>setTimeout(r,50))}assert.equal(run('Object.keys(rigidParts).length'),3);assert.ok(run('rigidParts[0].counts[0]')>1000);assert.ok(run('rigidParts[1].counts[1]')>1000);assert.equal(run("Object.values(artImages).every(imageReady)"),true);assert.equal(warnings.length,0);assert.equal(document.body.dataset.view,'hangar');assert.equal(document.querySelectorAll('#nav button').length,5);assert.equal(document.querySelectorAll('.hangar-hotspots button').length,3);
click('#inspect');assert.ok(get('.unit-inspect'));click('[data-select="1"]');assert.match(get('.selected-chassis').textContent,/KESTREL/);assert.match(get('.unit-inspect').textContent,/Jin Takeda/);click('#close-inspect');assert.equal(get('.unit-inspect'),null);
click('[data-page="workshop"]');click('[data-select="0"]');
assert.equal(get('.rig-bench-link').getAttribute('href'),'rig-bench/index.html');
assert.equal(get('.unit-render').getAttribute('src'),'assets/warden-rifle-left.webp');
click('[data-page="contracts"]');assert.equal(document.querySelectorAll('[data-deploy]').length,3);click('[data-deploy="0"]');assert.equal(run('battle.units.length'),8);assert.equal(get('#modal').hidden,false);click('#modal-0');assert.equal(get('#modal').hidden,true);
assert.equal(run("activeWardenVisual(current()).key"),'warden-rifle-left');
run("current().face=1;current().weapon='rail'");
assert.equal(run("activeWardenVisual(current()).key"),'warden-rail-right');
assert.equal(run("spriteFlip(current())"),false);
assert.equal(run("activeWardenVisual(current()).motion.aim.length"),3);
assert.equal(run("activeWardenVisual(current()).motion.death.length"),5);
assert.ok(run("mechAttachmentPoint(current(),'muzzle').x>project(current().vx,0,current().vz).x"));
run("wardenMotionFrame(current(),activeWardenVisual(current()),animationPose(current(),0))");
await new Promise(r=>setTimeout(r,100));
assert.ok(run(`(()=>{const u=current(),visual=activeWardenVisual(u);u.attack={start:0};const aim=wardenMotionFrame(u,visual,animationPose(u,.4));u.attack=null;u.alive=false;u.deathTime=0;const death=wardenMotionFrame(u,visual,animationPose(u,.6));u.alive=true;return aim.frame.index>=15&&death.frame.index>=18&&death.frame.body[1]>visual.body[1]+.06})()`));
assert.equal(run(`(()=>{
 const u=current(),visual=activeWardenVisual(u);
 const at=.10;
 u.motion={fromX:u.x,fromZ:u.z,toX:u.x+1,toZ:u.z,start:0,duration:.31,gaitBase:1,stepIndex:0,totalSteps:1};
 const baked=wardenMotionFrame(u,visual,animationPose(u,at));
 const b=unitBounds(u,visual),muzzle=mechAttachmentPoint(u,'muzzle',at);
 u.motion=null;
 if(!baked?.frame||!visual.motion.gait.includes(baked.frame))return false;
 return Math.hypot(muzzle.x-(b.x+b.w*baked.frame.muzzle[0]),muzzle.y-(b.y+b.h*baked.frame.muzzle[1]))<1e-6;
})()`),true);
assert.equal(run(`(()=>{
 const u=current(),visual=activeWardenVisual(u);
 u.fireTime=0;
 const baked=wardenMotionFrame(u,visual,animationPose(u,.035));
 delete u.fireTime;
 return visual.motion.kick.includes(baked?.frame);
})()`),true);
assert.equal(run("(()=>{const u=current(),key=activeWardenVisual(u).key,image=artImages[key];artImages[key]=null;try{return activeWardenVisual(u)===undefined&&spriteFlip(u)}finally{artImages[key]=image}})()"),true);
run("current().weapon='rifle';current().face=-1");
for(let i=0;i<8;i++)run('draw('+(i*16.67)+')');fs.writeFileSync(out+'/battlefield-native-desktop.png',native.toBuffer('image/png'));assert.equal(document.querySelectorAll('[data-part]').length,4);assert.equal(document.querySelectorAll('[data-unit]').length,3);
click('[data-unit="0"]');click('#skill');assert.equal(run('current().ap'),10);assert.equal(get('#skill').disabled,true);click('#brace');assert.equal(run('current().ap'),8);assert.equal(run('current().brace'),true);click('#fire');assert.equal(run('action'),'fire');click('[data-part="right"]');assert.equal(run('targetPart'),'right');
// Native canvas snapshots exercise real image decoding and rendering, not a browser.
run("selected=0;battle.units[0].x=3;battle.units[0].z=5;battle.units[0].vx=3;battle.units[0].vz=5;battle.units[3].x=5;battle.units[3].z=4;battle.units[3].vx=5;battle.units[3].vz=4;lockedTarget=battle.units[3].id;Math.random=()=>0");await run("shoot(current(),battle.units[3],'right')");assert.ok(run('battle.units[3].hp.right')<run('battle.units[3].max.right'));run('renderBattle();draw(280)');fs.writeFileSync(out+'/battlefield-native-engaged.png',native.toBuffer('image/png'));
context.innerWidth=390;context.innerHeight=844;run('resize();draw(320)');fs.writeFileSync(out+'/battlefield-native-mobile.png',native.toBuffer('image/png'));run('renderBattle()');click('#target-toggle');assert.equal(document.body.dataset.targetPanel,'open');click('[data-part="left"]');assert.equal(document.body.dataset.targetPanel,'closed');assert.equal(run('targetPart'),'left');context.innerWidth=1440;context.innerHeight=1024;run('resize();renderBattle()');
click('#withdraw');click('#modal-1');assert.equal(run('battle'),null);assert.equal(get('#modal').hidden,false);click('#modal-1');assert.equal(document.body.dataset.view,'workshop');click('[data-equip="shotgun"]');assert.equal(run('save.units[selected].weapon'),'shotgun');assert.equal(run('save.credits'),3000);click('[data-upgrade]');assert.equal(run('save.units[selected].upgrade'),1);assert.equal(run('save.credits'),1200);click('[data-page="pilots"]');assert.equal(document.querySelectorAll('.pilot-image img').length,3);click('[data-page="career"]');assert.equal(document.querySelectorAll('.history-row').length,1);assert.ok(storage.has('iron-vow-career'));
let refs=[...document.querySelectorAll('img[src]')].map(x=>x.getAttribute('src'));for(const a of refs)assert.ok(fs.existsSync(path.join(root,'dist',a)),a);assert.equal(warnings.length,0);run("save.credits=0;save.units[0].condition=12;selected=0;page='workshop';render()");click('[data-patch]');assert.equal(run('save.units[0].condition'),50);assert.equal(run('save.credits'),0);
console.log('PASS: actual DOM navigation, hangar selection/details, contract deployment, manual modal, combat controls, skills, brace, subsystem targeting/damage, withdrawal, workshop purchase/upgrade, pilots, career record, local images; native canvas snapshots at 1440x1024 and 390x844. Browser CSS/layout/console QA is not covered.');})().catch(e=>{console.error(e);process.exitCode=1});
