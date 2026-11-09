const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkVanguard({page,mobile,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'GRAVEMAW',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>.5});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="2"]');
 await tap('#modal-1');
 await tap('#modal-0');
 const art=await page.evaluate(async()=>{
  const u=battle.units.find(u=>u.frame===VANGUARD_FRAME);
  const atlas=window.IRON_VOW_FOUNDRY_ART[8];
  const images=atlas.variants.map(key=>motionImages[key]);
  await Promise.all(images.map(image=>image.decode()));
  const frames=[foundryRender(u,clock)];
  const original={...u.hp};
  u.hp.right=0;frames.push(foundryRender(u,clock));
  u.hp.right=original.right;u.hp.left=0;frames.push(foundryRender(u,clock));
  u.hp.right=0;frames.push(foundryRender(u,clock));
  u.hp=original;
  const walker={...u,attack:null,motion:{start:0,duration:1,gaitBase:0,stepIndex:0,totalSteps:1,
   fromX:u.x,fromZ:u.z,toX:u.x+1,toZ:u.z}};
  const {cell}=atlas,legTop=Math.floor(cell*.67),legHeight=Math.floor(cell*.28);
  const layer=new OffscreenCanvas(cell,legHeight),g=layer.getContext('2d',{willReadFrequently:true});
  const walk=Array.from({length:8},(_,i)=>{
   const pose=foundryRender(walker,(i+.5)/8);
   g.clearRect(0,0,cell,legHeight);
   g.drawImage(pose.surface,pose.index%4*cell,Math.floor(pose.index/4)*cell+legTop,
    cell,legHeight,0,0,cell,legHeight);
   return {index:pose.index,pixels:g.getImageData(0,0,cell,legHeight).data};
  });
  const legChange=walk.map(({pixels})=>{
   let changed=0,occupied=0;
   for(let i=3;i<pixels.length;i+=4){
    const a=walk[0].pixels[i]>=128,b=pixels[i]>=128;
    occupied+=Number(a||b);changed+=Number(a!==b);
   }
   return changed/occupied;
  });
  const fixture=[...paths(u)].find(([key,n])=>n===4&&!battle.cover.has(key)&&!occupied(...key.split(',').map(Number)));
  if(!fixture)throw Error('No pursuit fixture within four reachable steps.');
  const [x,z]=fixture[0].split(',').map(Number),a=current();
  for(const other of battle.units)if(other!==u&&other!==a){other.alive=false;other.hp.body=0}
  Math.random=()=>0;
  a.max.body=a.hp.body=500;
  a.max.pilot=a.hp.pilot=500;
  Object.assign(a,{x,z,vx:x,vz:z});
  const types=frames.map(f=>images.indexOf(f.surface));
  return {types,model:u.name,paint:u.paint,pre:distance(u,a),index:frames[0].index,
   walk:walk.map(pose=>pose.index),legChange,
   primary:frames[0].primary,secondary:frames[0].secondary,tip:frames[0].anchors.meleeTip,
   muzzle:frames[0].anchors.muzzle,atlasFrames:atlas.frames.length};
 });
 assert.deepEqual(art.types,[0,1,2,3]);
 assert.equal(art.model,'GRAVEMAW 2');
 assert.equal(art.paint,null);
 assert.equal(art.pre,4);
 assert.ok(art.primary&&art.secondary&&art.tip.every(Number.isFinite)&&art.muzzle.every(Number.isFinite));
 assert.ok(art.atlasFrames>=30);
 assert.deepEqual(art.walk,[0,1,2,3,4,5,6,7],'walking selects each of the eight gait cells');
 assert.ok(art.legChange.filter(change=>change>.08).length>=4,
  'Gravemaw should lift and swing its legs through the gait: '+JSON.stringify(art.legChange));
 await tap('#end');
 await page.waitForFunction(()=>activeCinematic?.actor.frame===VANGUARD_FRAME&&activeCinematic.phase==='fire');
 const contact=await page.evaluate(()=>({weapon:activeCinematic.actor.attack.kind,
   range:distance(activeCinematic.actor,activeCinematic.target)}));
 assert.deepEqual(contact,{weapon:'piledriver',range:1});
 if(process.env.IRON_VOW_VANGUARD_PROOF){
  await page.screenshot({path:join(process.env.IRON_VOW_VANGUARD_PROOF,mobile?'vanguard-touch.png':'vanguard-desktop.png')});
 }
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy);
 assert.ok(await page.evaluate(()=>battle.log.some(line=>line.startsWith('GRAVEMAW 2 → WARDEN'))&&
  Object.keys(current().hp).some(part=>current().hp[part]<current().max[part])));
 console.log('PASS Vanguard pursuit, Piledriver cinematic and independently disarmed atlases');
};

