const assert=require('node:assert/strict');

// Regression (owner report, 2026-11-23): since the v121 terrain (2.8 m terraces), a duel fought beside a cliff could put the low
// duel lens inside the neighbouring terrace or behind its lip, so the screen showed rock and no mechs. These are real map
// positions where the prior build failed: contract 0 / seed 77 put the lens 1.3 m under a terrace for brace, release and the
// return hit; contract 1 / seed 78 hid the shooter's body behind a cliff overhang. Every beat must keep the lens above the ground around it and see the subject's body and head past terrain,
// cliffs, cover and props.
const CASES=[
 {contract:0,seed:77,ally:[10,4],enemy:[13,9]},
 {contract:0,seed:77,ally:[4,6],enemy:[5,10]},
 // a rock overhang between lens and hull: a single mid-body sample slipped under it while the body above was hidden
 {contract:1,seed:78,ally:[9,2],enemy:[14,0]}
];
const BEATS=[['brace','aim',null],['release','fire',.1],['flight','fire',.35],['hit','result',null]];

module.exports=async function checkDuelTerrain({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);
 const report=[];
 for(const c of CASES){
  await page.evaluate(({contract,seed})=>{__ironVow.start({seed,contract,frames:[0,1,2]});IronVowScene.clear();IronVowScene.render(clock,1);},c);
  await page.waitForFunction(()=>IronVowScene.ready&&battle.units.every(u=>!u.alive||u.kind||IronVowScene.models.get(u.id)?.entry),null,{timeout:600000});
  const rows=await page.evaluate(({c,BEATS})=>{
   const T=THREE,S=IronVowScene,mechs=battle.units.filter(u=>!u.kind&&u.alive),ally=mechs.find(u=>u.team==='ally'),enemy=mechs.find(u=>u.team==='enemy');
   const [ax,az]=c.ally,[tx,tz]=c.enemy;
   for(const [u,x,z] of [[ally,ax,az],[enemy,tx,tz]])Object.assign(u,{x,z,vx:x,vz:z});
   ally.heading=headingTo(tx-ax,tz-az);enemy.heading=headingTo(ax-tx,az-tz);
   const board=S.scene.children.find(o=>o.type==='Group'),ray=new T.Raycaster(),rows=[];
   const shown=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};
   const blocker=(from,to)=>{const dir=to.clone().sub(from),len=dir.length();ray.set(from,dir.normalize());ray.far=len-1.2;
    const hit=ray.intersectObject(board,true).find(h=>!h.object.isLine&&!h.object.isPoints&&!(h.object.material?.transparent&&(h.object.material.opacity??1)<.5)&&shown(h.object));
    return hit?(hit.object.name||(hit.object.userData?.tile?'ground plate':hit.object.parent?.name||hit.object.type))+' at '+hit.distance.toFixed(1)+' m':null;};
   let n=0;
   for(const [actor,target] of [[ally,enemy],[enemy,ally]])for(const [beat,phase,since] of BEATS){
    const t=clock+100+n++*10;
    activeCinematic={actor,target,w:unitWeapon(actor),phase,part:'body',fireAt:since==null?(phase==='result'?t-2:null):t-since,contacts:[{at:.6}]};
    S.render(t,1);S.render(t+.001,1);
    const shot=activeCinematic,subject=shot.cameraBeat==='hit'||shot.cameraBeat==='flight'?target:actor,h=S.models.get(subject.id)?.height??6;
    const cam=S.camera.position.clone(),w=S.world(subject.vx,subject.vz);
    let ground=S.groundAt(cam.x,cam.z);for(let i=0;i<8;i++){const a=i*Math.PI/4;ground=Math.max(ground,S.groundAt(cam.x+Math.cos(a)*1.2,cam.z+Math.sin(a)*1.2));}
    rows.push({who:actor===ally?'ally':'enemy',beat:shot.cameraBeat,lens:+(cam.y-ground).toFixed(2),body:blocker(cam,new T.Vector3(w.x,w.y+h*.5,w.z)),head:blocker(cam,new T.Vector3(w.x,w.y+h*.85,w.z)),clear:shot.cameraClear});
   }
   activeCinematic=null;S.render(clock,1);return rows;
  },{c,BEATS});
  for(const r of rows){
   const at=`contract ${c.contract} ${c.ally}->${c.enemy} ${r.who} ${r.beat}`;
   assert.ok(r.lens>=.5,`${at}: the duel lens sits above the ground around it (clearance ${r.lens} m)`);
   assert.equal(r.body,null,`${at}: the subject's body is in sight, not behind ${r.body}`);
   assert.equal(r.head,null,`${at}: the subject's head is in sight, not behind ${r.head}`);
  }
  report.push(...rows.map(r=>({...c,...r})));
 }
 return {beats:report.length};
};
