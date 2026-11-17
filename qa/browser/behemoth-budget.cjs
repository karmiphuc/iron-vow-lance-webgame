const assert=require('node:assert/strict');
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
module.exports=async function checkBehemothBudget({page,origin}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>__ironVow.start({seed:4242,frames:[7],weapons:['hailstorm']}));
 await page.waitForFunction(()=>{const u=battle?.units.find(x=>x.team==='ally'&&x.frame===7);return u&&IronVowScene.isLive(u)&&IronVowScene.models.get(u.id)?.entry?.armed},null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const u=battle.units.find(x=>x.team==='ally'&&x.frame===7),entry=IronVowScene.models.get(u.id).entry,m=entry.m;
  const count=()=>{let n=0;m.cont.traverseVisible(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});return n};
  const triangles=count(),parts=Object.fromEntries(Object.entries(m.build.parts).map(([p,a])=>[p,a.length])),mortar=m.rig.spine.getObjectByName('mortar.muzzle');
  battle.cover.clear();const step=__ironVow.legalMoves(u.id).find(p=>p.cost===1&&p.x===u.x+1&&p.z===u.z);if(!step)throw Error('Missing Behemoth step');
  const samples=[];let moving=true;const sampled=new Promise(resolve=>{function frame(){if(!moving){resolve();return}if(u.motion)samples.push(m.rig.legs.map((leg,i)=>{const p=leg.an.getWorldPosition(new THREE.Vector3()),s=m.legs[i];return {p:p.toArray(),goal:p.distanceTo(s.foot),swing:s.swing,settle:Boolean(s.settle),plant:s.planted.toArray()}}));requestAnimationFrame(frame)}requestAnimationFrame(frame)});
  try{await moveUnit(u,step.x,step.z)}finally{moving=false}await sampled;
  const enemy=battle.units.find(x=>x.team==='enemy'&&!x.kind);for(const other of battle.units)if(other!==u&&other!==enemy){other.alive=false;other.hp.body=0}Object.assign(u,{x:6,z:6,vx:6,vz:6});Object.assign(enemy,{x:6,z:8,vx:6,vz:8});enemy.max.body=enemy.hp.body=10000;enemy.max.pilot=enemy.hp.pilot=10000;ruleRandom=()=>0;
  await engage(u,enemy,'body',unitWeapon(u));const hit=IronVowScene.combat.history.some(e=>e.actor===u.id&&e.type==='impact'&&e.damage>0);
  return {triangles,parts,mortar:!!mortar,legCount:m.rig.legs.length,samples,hit};
 });
 assert.ok(result.triangles<=60000&&result.mortar&&result.legCount===4&&Object.values(result.parts).every(n=>n>0),JSON.stringify({triangles:result.triangles,parts:result.parts,mortar:result.mortar,legCount:result.legCount}));
 assert.ok(result.hit,'Actual Behemoth weapon deals damage');assert.ok(result.samples.length>=2&&result.samples.some(x=>x.some(f=>f.swing)));
 let planted=0;for(const [i,feet] of result.samples.entries())for(const [j,f] of feet.entries()){assert.ok(f.goal<.10,JSON.stringify(f));const prev=result.samples[i-1]?.[j];if(!prev||f.swing||f.settle||prev.swing||prev.settle||dist(f.plant,prev.plant)>1e-5)continue;assert.ok(dist(f.p,prev.p)<.01,JSON.stringify(f));planted++;}assert.ok(planted>0);
 console.log('PASS Behemoth GPU equipped geometry, four-leg ground movement and real Hailstorm damage');return {triangles:result.triangles,planted};
};
