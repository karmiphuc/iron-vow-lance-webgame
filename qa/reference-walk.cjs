/* Reference walk checks for docs/reference/claude/rig-bench.html (software WebGL; correctness only, no performance claim).
   1. War-mode soak through the bench's own __bench.runSoak: every invariant check, zero correctness anomalies (frameSpike is host timing and is reported, not asserted).
   2. Bench mode: each of the six leg types walks and stops; the ankle never leaves its IK target.
   3. Game-style motion through VowAnim.animateMech: tile paths with 90° corners at game speed, stop, restart and a blade lunge;
      planted feet never slide, ankles stay on target, foot targets stay within thigh + shin.
   Usage: node qa/reference-walk.cjs [--battles 50] [--seeds 4242,77,90210] [--out directory] */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createServer}=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2),config={battles:50,seeds:[4242,77,90210]};
for(let i=0;i<args.length;i+=2){
 if(args[i]==='--battles')config.battles=Math.max(1,parseInt(args[i+1],10));
 else if(args[i]==='--seeds')config.seeds=args[i+1].split(',').map(Number);
 else if(args[i]==='--out')config.out=path.resolve(args[i+1]);
 else throw Error('Usage: node qa/reference-walk.cjs [--battles 50] [--seeds 4242,77,90210] [--out directory]');
}
const source=fs.readFileSync(path.join(root,'docs/reference/claude/rig-bench.html'));
const evidence={source_sha256:createHash('sha256').update(source).digest('hex'),environment:'Playwright Chromium; software WebGL; correctness only, no performance claim',soaks:[]};

async function main(){
 const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(source);});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
  async function open(){
   const context=await browser.newContext({viewport:{width:1366,height:1024},deviceScaleFactor:1});
   await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>r.fulfill({path:path.join(root,'dist/rig-bench/vendor/three.min.js'),contentType:'text/javascript'}));
   await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({body:'',contentType:'text/css'}));
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(1800000);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{
    let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const frames=[];window.requestAnimationFrame=f=>(frames.push(f),frames.length);window.cancelAnimationFrame=()=>{};
    window.__referenceTick=t=>{for(const f of frames.splice(0))f(t);};
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:120000});
   await page.evaluate(()=>{RB.soundOn=false;window.__referenceTick(0);});
   return {context,page,errors};
  }

  // 1. War soak
  for(const seed of config.seeds){
   const {context,page,errors}=await open();
   try{
    console.log(`START ${config.battles}-battle War soak, seed ${seed}`);
    const r=await page.evaluate(async([n,s])=>{const r=await __bench.runSoak(n,s,{render:false});
     return {seed:s,ikFix:r.ikFix,battles:r.battles,ticks:r.ticks,simSeconds:+r.simSeconds.toFixed(1),winners:r.winners,byType:r.byType,
      coverage:{legsWeapon:Object.keys(r.legsWeapon).length,chassisWeapon:Object.keys(r.chassisWeapon).length,combos:Object.keys(r.combos).length},
      anomalies:r.anomalies.map(a=>({type:a.type,battle:a.battle,seed:a.seed,t:a.t,unit:a.unit,build:a.build,detail:a.detail}))};},[config.battles,seed]);
    assert.deepEqual(errors,[]);evidence.soaks.push(r);
    const correctness=r.anomalies.filter(a=>a.type!=='frameSpike');
    console.log(`  ${r.battles} battles, ${r.ticks} ticks, winners ${JSON.stringify(r.winners)}, anomalies ${JSON.stringify(r.byType)}`);
    for(const a of correctness)console.log(`  ${a.type} · seed ${a.seed} · ${a.unit} ${a.build} · ${a.detail}`);
   }finally{await context.close();}
  }

  // 2 + 3. Bench walk and game-style tile walk
  {const {context,page,errors}=await open();
   try{
    evidence.benchWalk=await page.evaluate(()=>{RB.setMode('bench');const out={};
     for(let f=0;f<6;f++){RB.bench.setChassis(f);RB.bench.S.walking=true;let mx=0;
      for(let k=0;k<360;k++){RB.bench.update(1/60);if(k>60)for(const e of RB.bench.ikErrors())mx=Math.max(mx,e.cm);}
      RB.bench.S.walking=false;for(let k=0;k<120;k++){RB.bench.update(1/60);for(const e of RB.bench.ikErrors())mx=Math.max(mx,e.cm);}
      out[RB.NAMES[f]]={maxAnkleErrorCm:+mx.toFixed(2)};}
     return out;});
    evidence.tileWalk=await page.evaluate(()=>{const VA=window.VowAnim,T=THREE,V3=(x,y,z)=>new T.Vector3(x,y,z),BS=VA.BS,TILE=VA.TILE,scene=new T.Scene(),out={};
     for(let f=0;f<6;f++){const path=[[0,0],[3,0],[3,3],[1,3],[1,-1],[4,-1]];
      const m=VA.makeMech(f,'ally','rifle',0,null,null,{legs:f,core:f,arms:f});m.scale=BS;m.cont.scale.setScalar(BS);RB.prepMech(m);scene.add(m.cont);
      const speed=TILE/VA.MECH_MOTION_STEP[f],dt=1/60,D=m.dims,reach=(D.legA+D.legB)*BS,prev=m.legs.map(()=>({p:false,a:V3()})),h=V3(),a=V3();let t=0;const R={slide:0,err:0,over:-9};
      const frame=(pos,moving,heading)=>{VA.animateMech(m,{pos,moving,speed,stepLen:VA.STEP,heading,face:heading,brace:0,alive:true,ground:0},dt,t);t+=dt;
       m.rig.legs.forEach((l,i)=>{const L=m.legs[i];l.an.getWorldPosition(a);l.hip.getWorldPosition(h);R.over=Math.max(R.over,h.distanceTo(L.foot)-reach);R.err=Math.max(R.err,a.distanceTo(L.foot));
        const planted=!L.swing&&!L.settle;if(planted){if(prev[i].p)R.slide=Math.max(R.slide,Math.hypot(a.x-prev[i].a.x,a.z-prev[i].a.z));else prev[i].a.copy(a);}prev[i].p=planted;});};
      let pos=V3(0,0,0),heading=0;for(let k=0;k<60;k++)frame(pos,false,0);
      for(let pass=0;pass<2;pass++){for(let s=1;s<path.length;s++){const A=path[s-1],B=path[s],dx=(B[0]-A[0])*TILE,dz=(B[1]-A[1])*TILE;heading=Math.atan2(dx,dz);
        const n=Math.round(Math.hypot(dx,dz)/speed/dt);for(let k=1;k<=n;k++){pos=V3(A[0]*TILE+dx*k/n,0,A[1]*TILE+dz*k/n);frame(pos,true,heading);}}
       for(let k=0;k<90;k++)frame(pos,false,heading);path.reverse();}
      const dummy={cont:new T.Group()};dummy.cont.position.set(pos.x+Math.sin(heading)*6,0,pos.z+Math.cos(heading)*6);m.melee={age:0,target:dummy};
      for(let k=0;k<80;k++){const age=k*dt,kk=VA.lungeK(age),tc=dummy.cont.position,ddx=tc.x-pos.x,ddz=tc.z-pos.z,dd=Math.hypot(ddx,ddz),L=Math.max(0,Math.min(dd-2.4,2.6));
       if(m.melee)m.melee.age=age;frame(V3(pos.x+ddx/dd*L*kk,0,pos.z+ddz/dd*L*kk),false,heading);}
      m.melee=null;for(let k=0;k<90;k++)frame(pos,false,heading);
      out[RB.NAMES[f]]={maxPlantedSlideCm:+(R.slide*100).toFixed(2),maxAnkleErrorCm:+(R.err*100).toFixed(2),maxOverReachCm:+(Math.max(0,R.over)*100).toFixed(2)};scene.remove(m.cont);}
     return out;});
    assert.deepEqual(errors,[]);
   }finally{await context.close();}}

  console.log('Bench walk (max ankle → IK target, cm): '+JSON.stringify(evidence.benchWalk));
  console.log('Game-style tile walk: '+JSON.stringify(evidence.tileWalk));
  for(const [k,v] of Object.entries(evidence.benchWalk))assert.ok(v.maxAnkleErrorCm<1,`${k}: bench walk ankle leaves its IK target by ${v.maxAnkleErrorCm} cm`);
  for(const [k,v] of Object.entries(evidence.tileWalk)){
   assert.ok(v.maxPlantedSlideCm<1,`${k}: planted foot slid ${v.maxPlantedSlideCm} cm`);
   assert.ok(v.maxAnkleErrorCm<1,`${k}: ankle ${v.maxAnkleErrorCm} cm from its IK target`);
   assert.ok(v.maxOverReachCm<3,`${k}: foot target ${v.maxOverReachCm} cm beyond thigh + shin`);}
  const walkTypes=['footGround','footSlide','ikReach','kneeDir'];
  const all=evidence.soaks.flatMap(s=>s.anomalies.filter(a=>a.type!=='frameSpike'));
  evidence.correctnessAnomalies=all.length;
  assert.equal(all.filter(a=>walkTypes.includes(a.type)).length,0,'no foot, reach or knee anomalies in the War soak');
  assert.equal(all.length,0,`War soak correctness anomalies: ${all.length}`);
  evidence.status='passed';
  console.log(`PASS reference walk: ${evidence.soaks.reduce((n,s)=>n+s.battles,0)} War battles with zero correctness anomalies, bench walk and game-style tile walk on all six leg types`);
 }finally{
  evidence.status??='failed';
  if(config.out){fs.mkdirSync(config.out,{recursive:true});fs.writeFileSync(path.join(config.out,'walk-manifest.json'),JSON.stringify(evidence,null,2)+'\n');}
  await browser?.close();await new Promise(done=>server.close(done));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
