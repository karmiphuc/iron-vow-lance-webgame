// Native canvas animation evidence. This does not render the HTML interface or replace browser QA.
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');const root=path.resolve(__dirname,'..'),out=process.argv[2]||'/workspace/scratch/iron-vow-animation-frames';fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/inter-100-900.woff2'),'Inter');
const {document}=parseHTML(fs.readFileSync(root+'/dist/index.html','utf8')),native=createCanvas(960,640),dom=document.querySelector('#scene');dom.getContext=()=>native.getContext('2d');Object.defineProperties(dom,{width:{get:()=>native.width,set:v=>native.width=v},height:{get:()=>native.height,set:v=>native.height=v}});
class LocalImage extends Image{set src(v){super.src=fs.readFileSync(path.join(root,'dist',v))}get src(){return super.src}}
class NativeSurface{constructor(w,h){return createCanvas(w,h)}}
const store=new Map(),context={document,Image:LocalImage,OffscreenCanvas:NativeSurface,console,window:{addEventListener:()=>{},matchMedia:()=>({matches:false})},innerWidth:960,innerHeight:640,devicePixelRatio:1,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},requestAnimationFrame:()=>{},setTimeout:r=>{queueMicrotask(r);return 1},clearTimeout:()=>{},URL,Blob,Math:Object.create(Math)};
vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/dist/game.js','utf8'),context);const run=c=>vm.runInContext(c,context);
(async()=>{
 await new Promise(r=>setTimeout(r,250));run("deploy(0);closeModal();battle.units=battle.units.slice(0,3);battle.units.forEach((u,i)=>{u.x=u.vx=3+i*1.5;u.z=u.vz=5;u.face=-1});Math.random=()=>0");
 const times=[],contact=createCanvas(960*3,640*2),cg=contact.getContext('2d');let picks=0;
 for(let frame=0;frame<144;frame++){
  const t=frame/24;run(`clock=${t};frameDt=1/24;scale=95;origin={x:470,y:110};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#18252d';ctx.fillRect(0,0,W,H);`);
  if(frame<30)run(`battle.units.forEach((u,i)=>{const duration=MECH_MOTION[i].step,step=Math.min(2,Math.floor(${t}/duration));u.face=1;if(${t}<duration*3){u.motion={fromX:u.x,fromZ:5-step,toX:u.x,toZ:4-step,start:step*duration,duration,gaitBase:i+step,stepIndex:step,totalSteps:3};u.z=4-step}else{u.motion=null;u.z=u.vz=2}})`);
  if(frame===30)run("battle.units.forEach(u=>{u.vx=u.x;u.vz=u.z;u.motion=null;u.landTime=clock});effects.push({type:'step',x:3,z:4,t:1,mass:1})");
  if(frame===42)run("battle.units.forEach((u,i)=>{u.weapon=['rifle','rail','missile'][i];u.face=-1;u.fireTime=clock})");
  if(frame===65)run("battle.units.forEach((u,i)=>{u.hitTime=clock;u.hitPart=i===1?'legs':'body';u.hitVector={x:1,y:.2}})");
  if(frame===90)run("battle.units[2].alive=false;battle.units[2].deathTime=clock");
  const started=performance.now();run("for(let x=0;x<10;x++)for(let z=0;z<10;z++)textureTile(x,z,true);for(const u of [...battle.units].sort((a,b)=>Number(a.alive)-Number(b.alive))){advanceUnitAnimation(u,clock,frameDt);drawUnit(u,clock)};drawEffects(clock);effects.forEach(e=>e.t-=1/24*1.8);effects=effects.filter(e=>e.t>0)");times.push(performance.now()-started);
  // Caption makes the native-renderer scope explicit in the clip itself.
  const g=native.getContext('2d');g.fillStyle='#131b22';g.fillRect(0,0,960,47);g.fillStyle='#e7e1d3';g.font='16px Inter';g.textAlign='left';g.fillText('IRON VOW / NATIVE ANIMATION PREVIEW',22,29);g.textAlign='right';g.fillStyle='#a4b4bc';g.font='12px Inter';g.fillText(frame<30?'ARTICULATED STRIDE':frame<42?'FOOT PLANT':frame<65?'WEAPON RECOIL':frame<90?'HIT REACTION':'COLLAPSE & SMOKE',938,29);g.textAlign='left';
  fs.writeFileSync(path.join(out,String(frame).padStart(4,'0')+'.png'),native.toBuffer('image/png'));
  if([0,12,28,44,68,108].includes(frame)){cg.drawImage(native,(picks%3)*960,Math.floor(picks/3)*640);picks++}
 }
 fs.writeFileSync(path.join(root,'design/animation-contact-sheet.png'),contact.toBuffer('image/png'));times.sort((a,b)=>a-b);console.log(JSON.stringify({frames:144,width:960,height:640,median_native_ms:times[Math.floor(times.length*.5)],p95_native_ms:times[Math.floor(times.length*.95)],scope:'native canvas only; no browser layout verification'}));
})().catch(e=>{console.error(e);process.exitCode=1});
