const assert=require('node:assert/strict');

module.exports=async function checkWarden({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const lane=mobile?[1,0]:[0,1];
 await page.evaluate(([dx,dz])=>{
  save=fresh();deploy(0,false,[0]);
  const ally=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const occupied=battle.units.filter(u=>u!==ally&&u!==foe);
  const clear=(x,z)=>!battle.cover.has(x+','+z)&&!occupied.some(u=>u.x===x&&u.z===z);
  const cells=[];
  for(let x=4;x<battle.size.width-4;x++)for(let z=4;z<battle.size.depth-4;z++){
   if([0,1,2,3,4].every(i=>clear(x+i*dx,z+i*dz)))cells.push({x,z});
  }
  cells.sort((a,b)=>Math.abs(a.x-7)+Math.abs(a.z-7)-Math.abs(b.x-7)-Math.abs(b.z-7));
  const {x,z}=cells[0];
  ally.x=ally.vx=x;ally.z=ally.vz=z;
  ally.heading=headingTo(dx,dz);ally.face=Math.sign(Math.sin(ally.heading));
  foe.x=foe.vx=x+4*dx;foe.z=foe.vz=z+4*dz;foe.reacted=true;
  lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();
  Math.random=()=>0;
  window.wardenQA={ally,foe,x,z,move:{x:x+2*dx,z:z+2*dz},samples:[]};
  window.wardenSample=()=>{
   const view=travelVisual(ally,clock);
   if(!view)return null;
   const {atlas,source,row,points}=view;
   return {row,cell:source.cell,left:points.soleL,right:points.soleR,
    recoil:row>=atlas.special.braceKick&&row<atlas.special.braceAim,
    shot:activeCinematic?.phase,
    close:wardenMotionFrame({...ally,face:1},wardenVisual(ally.frame,ally.weapon,1),animationPose(ally,clock))?.atlas.cell};
  };
  setInterval(()=>{const frame=window.wardenSample();if(frame)window.wardenQA.samples.push(frame)},20);
 },lane);
 await tap('#modal-0');
 await page.waitForFunction(()=>window.wardenSample()?.cell===272);
 const facings=await page.evaluate(async()=>{
  const unit=window.wardenQA.ally,atlas=travelAtlas(unit);
  const assets=FIELD_HEADINGS.map((_,i)=>travelDetail(unit,atlas,i));
  await Promise.all(assets.map(({image})=>image.decode()));
  return assets.map(({key,image})=>[key,image.naturalWidth]);
 });
 assert.equal(new Set(facings.map(([key])=>key)).size,4);
 assert.ok(facings.every(([,width])=>width===4080));
 const click=({x,y})=>mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
 await tap('#move');
 await click(await page.evaluate(()=>project(window.wardenQA.move.x,0,window.wardenQA.move.z)));
 await page.waitForFunction(()=>{
  const {ally,move}=window.wardenQA;
  return !battle.busy&&ally.x===move.x&&ally.z===move.z;
 });
 const ready=await page.evaluate(()=>window.wardenSample());
 await tap('#brace');
 await page.waitForFunction(()=>window.wardenQA.ally.braceBlend===1);
 const brace=await page.evaluate(()=>window.wardenSample());
 assert.equal(brace.cell,272);
 assert.deepEqual(brace.left,ready.left,'left boot stays planted');
 assert.ok(Math.hypot(brace.right[0]-ready.right[0],brace.right[1]-ready.right[1])>.06,'right boot advances');
 await tap('#fire');
 const target=await page.evaluate(()=>{
  const {foe}=window.wardenQA,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
  }
  throw Error('No exposed target');
 });
 await click(target);
 if(!mobile&&process.env.WARDEN_HANDS_PROOF){
  await page.waitForFunction(()=>activeCinematic?.phase==='fire');
  await page.screenshot({path:require('node:path').join(process.env.WARDEN_HANDS_PROOF,'ranged-battle.png')});
 }
 await page.waitForFunction(()=>!battle.busy&&window.wardenQA.foe.hp.body<window.wardenQA.foe.max.body);
 const frames=await page.evaluate(()=>window.wardenQA.samples);
 const recoil=frames.filter(frame=>frame.recoil);
 assert.ok(recoil.length>0);
 for(const frame of recoil){
  assert.deepEqual(frame.left,brace.left);
  assert.deepEqual(frame.right,brace.right);
 }
 if(!mobile)assert.ok(frames.some(frame=>frame.shot==='fire'&&frame.close===448));
};
