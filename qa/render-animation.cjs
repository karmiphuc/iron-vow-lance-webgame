// Native canvas animation evidence. This does not render the HTML interface or replace browser QA.
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');const root=path.resolve(__dirname,'..'),out=process.argv[2]||'/workspace/scratch/iron-vow-animation-frames';fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/inter-100-900.woff2'),'Inter');
const {document}=parseHTML(fs.readFileSync(root+'/dist/index.html','utf8')),native=createCanvas(960,640),dom=document.querySelector('#scene');dom.getContext=()=>native.getContext('2d');Object.defineProperties(dom,{width:{get:()=>native.width,set:v=>native.width=v},height:{get:()=>native.height,set:v=>native.height=v}});
class LocalImage extends Image{set src(v){super.src=fs.readFileSync(path.join(root,'dist',v))}get src(){return super.src}}
class NativeSurface{constructor(w,h){return createCanvas(w,h)}}
const store=new Map(),context={document,Image:LocalImage,OffscreenCanvas:NativeSurface,console,window:{addEventListener:()=>{},matchMedia:()=>({matches:false})},innerWidth:960,innerHeight:640,devicePixelRatio:1,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},requestAnimationFrame:()=>{},setTimeout:r=>{queueMicrotask(r);return 1},clearTimeout:()=>{},URL,Blob,Math:Object.create(Math)};
vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/dist/warden-visuals.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/dist/game.js','utf8'),context);const run=c=>vm.runInContext(c,context);
(async()=>{
 for(let attempt=0;attempt<100;attempt++){if(run('decodedArt.size===Object.keys(artImages).length&&Object.keys(rigidParts).length===3'))break;await new Promise(r=>setTimeout(r,50))}if(!run('decodedArt.size===Object.keys(artImages).length&&Object.keys(rigidParts).length===3'))throw Error('Animation assets did not finish decoding');console.log('Rigid part pixels:',run('Object.values(rigidParts).map(c=>c.counts)'));run("deploy(0);closeModal();Math.random=()=>0");
 run("for(const views of Object.values(wardenVisuals))for(const visual of Object.values(views)){const im=motionImages[visual.motion.key]=new Image();im.src=art(visual.motion.key)}");await new Promise(r=>setTimeout(r,300));
 const stages=[{actor:0,target:1,weapon:'rifle',label:'RIFLE / ARM AIM + BURST'},{actor:1,target:0,weapon:'rail',label:'RAIL / SHOULDER LOAD + RELEASE'},{actor:2,target:0,weapon:'missile',label:'MISSILE / POD LAUNCH'},{actor:2,target:0,weapon:'missile',death:true,label:'KNEEL / REACTOR BLAST'},{actor:0,target:1,weapon:'rifle',death:true,label:'FALL / REACTOR BLAST'}];
 const times=[],stageTimes=[[],[],[],[],[]],contact=createCanvas(960*3,640*2),cg=contact.getContext('2d'),frames=372;
 const picks=new Map([[8,0],[83,1],[162,2],[249,3],[327,4],[263,5]]);let currentStage=-1,fired=false,hit=false;
 for(let frame=0;frame<frames;frame++){
  const t=frame/24,stageIndex=Math.min(4,Math.floor(t/3.1)),stage=stages[stageIndex];
  run(`clock=${t};frameDt=1/24;scale=150;origin={x:400,y:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#18252d';ctx.fillRect(0,0,W,H);`);
  if(stageIndex!==currentStage){currentStage=stageIndex;fired=hit=false;run(`battle.units=[makeUnit(${stage.actor},'ally',3,4),makeUnit(${stage.target},'enemy',5,3)];battle.units[0].weapon='${stage.weapon}';battle.units[0].face=1;battle.units[1].face=-1;battle.units[0].attack={kind:'${stage.weapon}',start:clock,fireAt:null,releaseAt:null};effects=[]`)}
  const profile=run(`ATTACK_PROFILES['${stage.weapon}']`),actorStart=run('battle.units[0].attack?.start??-100');
  if(!fired&&t-actorStart>=profile.raise){fired=true;run(`(()=>{const a=battle.units[0],target=battle.units[1],profile=ATTACK_PROFILES[a.weapon];a.fireTime=clock;a.attack.fireAt=clock;effects.push({type:'shot',actor:a.id,target:target.id,part:'body',kind:a.weapon,x:a.x,z:a.z,tx:target.x,tz:target.z,t:1,born:clock,life:profile.beats.at(-1)+profile.travel+.12,origins:[],impact:freezeAttachment(target,'body')})})()`)}
  if(fired&&!hit&&t-run('battle.units[0].fireTime')>=profile.beats.at(-1)+profile.travel){
   hit=true;run(`battle.units[0].attack.releaseAt=clock;battle.units[1].hitTime=clock;battle.units[1].hitPart='body';battle.units[1].hitVector={x:1,y:.2};effects.push({type:'boom',target:battle.units[1].id,part:'body',x:5,z:3,t:1,big:false})`);
   if(stage.death)run('battle.units[1].hp.body=0;beginDestruction(battle.units[1])');else run('battle.units[1].hp.body-=35');
  }
  const started=performance.now();run("for(let x=0;x<10;x++)for(let z=0;z<10;z++)textureTile(x,z,true);for(const u of [...battle.units].sort((a,b)=>Number(a.alive)-Number(b.alive))){advanceUnitAnimation(u,clock,frameDt);drawUnit(u,clock)}drawEffects(clock);effects.forEach(e=>e.t-=1/24*(e.type==='shot'?1/e.life:e.type==='detonation'?1/.85:1.6));effects=effects.filter(e=>e.t>0)");const elapsed=performance.now()-started;times.push(elapsed);stageTimes[stageIndex].push(elapsed);
  const g=native.getContext('2d');g.fillStyle='#131b22';g.fillRect(0,0,960,47);g.textAlign='left';g.fillStyle='#e7e1d3';g.font='14px Inter';g.fillText('IRON VOW / STAGED NATIVE GAME RENDER',20,29);g.textAlign='right';g.fillStyle='#a4b4bc';g.font='12px Inter';g.fillText(stage.label,940,29);g.textAlign='left';
  fs.writeFileSync(path.join(out,String(frame).padStart(4,'0')+'.png'),native.toBuffer('image/png'));
  if(picks.has(frame)){const slot=picks.get(frame);cg.drawImage(native,(slot%3)*960,Math.floor(slot/3)*640)}
 }
 fs.writeFileSync(path.join(root,'design/animation-contact-sheet.png'),contact.toBuffer('image/png'));times.sort((a,b)=>a-b);console.log(JSON.stringify({frames,width:960,height:640,median_native_ms:times[Math.floor(times.length*.5)],p95_native_ms:times[Math.floor(times.length*.95)],stage_ms:stageTimes.map(list=>{list.sort((a,b)=>a-b);return{median:list[Math.floor(list.length*.5)],p95:list[Math.floor(list.length*.95)]}}),scope:'staged native game renderer; no browser layout verification'}));
})().catch(e=>{console.error(e);process.exitCode=1});
