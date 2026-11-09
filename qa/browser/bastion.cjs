const assert=require('node:assert/strict');
async function checkBastionGrips({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'load'});
 await page.evaluate(()=>{save.credits+=FRAMES[BASTION_FRAME].cost;render()});
 await tap('[data-bay="market"]');
 assert.equal(await page.locator('[data-buy-hull="12"]').count(),0,'Citadel is absent from the market');
 await tap('[data-buy-hull="10"]');
 await tap('[data-bay="storage"]');
 await tap('[data-chassis="10"]');
 await tap('[data-bay="assigned"]');
 assert.equal(await page.evaluate(()=>save.units[0].weapon),'rifle');
 await page.waitForFunction(()=>window.IronVowFoundry?.previewBastion({weapon:'rifle',melee:'cleaver'},0)?.secondary?.tip);
 const fittings=await page.evaluate(()=>{
  const out={};
  for(const melee of ['cleaver','blade','breaker','piledriver']){
   const e=window.IronVowFoundry.previewBastion({weapon:'rifle',melee},0);
   const left=e.secondary;
   const grip=melee==='piledriver'?e.m.sockets.ram:e.m.sockets.L;
   const dist=left.adapter.getWorldPosition(new THREE.Vector3()).distanceTo(grip.getWorldPosition(new THREE.Vector3()));
   const muzzle=e.primary.muzzle.getWorldPosition(new THREE.Vector3());
   const right=e.m.sockets.R.getWorldPosition(new THREE.Vector3());
   const rightContact=e.primary.grip.getWorldPosition(new THREE.Vector3()).distanceTo(right);
   out[melee]={left:dist,tip:!!left.tip,visible:left.mount.visible,
      surface:e.surface.width,rifle:muzzle.distanceTo(right),rightContact};
  }
  return out;
 });
 for(const item of Object.values(fittings)){
  assert.ok(item.left<1e-6&&item.tip&&item.visible,'melee stays seated at its own left-hand socket');
  assert.ok(item.rifle>2.4&&item.rifle<3,'carbine mounted at measured right grip');
  assert.ok(item.rightContact<1e-6,'physical pistol grip sits on the hand socket');
  assert.equal(item.surface,mobile?704:896);
 }
 await tap('#bastion-test-melee');
 await page.waitForFunction(()=>+document.querySelector('#paint-preview').dataset.rigFrame>278);
 const startPixels=await page.locator('#paint-preview').evaluate(c=>c.toDataURL());
 await page.waitForFunction(()=>+document.querySelector('#paint-preview').dataset.rigFrame>302);
 assert.notEqual(await page.locator('#paint-preview').evaluate(c=>c.toDataURL()),startPixels,'Workshop melee actually changes the visible pose');
 await tap('[data-armory-class="melee"]');
 await tap('[data-equip="cleaver"]');
 assert.equal(await page.evaluate(()=>save.units[0].melee),'cleaver');
 await checkBastionSelection(page,mobile);
 await page.evaluate(()=>{
  battle=null;deploy(0,false,[0]);
  Math.random=()=>0;
  const a=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  foe.x=foe.vx=a.x;foe.z=foe.vz=a.z-1;foe.reacted=true;
  lockedTarget=foe.id;focusBattleCamera(a,true);renderBattle();persist();
  window.bastionStrikeTrace={target:foe.id,frames:[],tips:[],visible:[],wrist:[],feet:[]};
  const render=window.IronVowFoundry.draw;
  window.IronVowFoundry.draw=(u,...args)=>{
   const live=render(u,...args);
   if(u===a&&u.attack?.kind==='cleaver'&&live?.secondary?.tip){
    const pos=name=>live.m.body.worldToLocal(live.m.body.getObjectByName(name).getWorldPosition(new THREE.Vector3())).toArray();
    bastionStrikeTrace.wrist.push(pos('HandL'));
    bastionStrikeTrace.feet.push([pos('FootR'),pos('FootL'),live.frame]);
   }
   return live;
  };
  const base=mechAttachmentPoint;
  mechAttachmentPoint=(u,key,t=clock)=>{
   const point=base(u,key,t);
   if(u===a&&key==='meleeTip'&&u.attack?.kind==='cleaver'){
    const live=foundryRender(u,t,true);
    if(live?.secondary?.tip){
     const expected=spritePoint(recoilingBounds(u,unitBounds(u),t),live.anchors.meleeTip);
     bastionStrikeTrace.tips.push(Math.hypot(point.x-expected.x,point.y-expected.y));
     bastionStrikeTrace.frames.push(live.frame);
     bastionStrikeTrace.visible.push(live.secondary.mount.visible);
    }
   }
   return point;
  };
 });
 await tap('#modal-0');
 await tap('#brace');
 await page.waitForFunction(()=>clock-current().braceTime>1.25);
 await tap('#strike');
 if(mobile)await tap('#target-toggle');
 await tap('[data-part="body"]');
 const target=await page.evaluate(()=>{
  const foe=battle.units.find(u=>u.id===bastionStrikeTrace.target),b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
  }
  throw Error('No exposed target');
 });
 await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
 await page.waitForFunction(()=>current().attack?.fireAt!=null);
 if(!mobile&&process.env.BASTION_QA_PROOF)await page.screenshot({path:process.env.BASTION_QA_PROOF});
 await page.waitForFunction(()=>!battle.busy&&!current().attack);
 const result=await page.evaluate(()=>{
  const foe=battle.units.find(u=>u.id===bastionStrikeTrace.target);
  return {damage:foe.max.body-foe.hp.body,...bastionStrikeTrace};
 });
 assert.ok(result.damage>0,'left-hand strike caused damage');
 assert.ok(result.frames.some(f=>f>=299&&f<=321),'braced strike uses the planted left-hand clip');
 const span=points=>Math.max(...points.map(p=>Math.hypot(...p.map((x,i)=>x-points[0][i]))));
 assert.ok(span(result.wrist)>.48,'left elbow drives visible wrist travel: '+span(result.wrist));
 const planted=result.feet.filter(p=>p[2]>=273&&p[2]<=321);
 const drift=planted.length?Math.max(...[0,1].map(i=>span(planted.map(p=>p[i])))):Infinity;
 assert.ok(drift<.001,'both feet remain planted through the strike: '+drift);
 assert.ok(result.tips.length&&Math.max(...result.tips)<.001&&result.visible.every(Boolean),'strike trail follows the rendered blade tip');
 console.log('PASS Bastion HD '+(mobile?'touch-emulated':'desktop')+' melee',result.damage,'damage,',result.tips.length,'tip samples');
}
async function checkBastionSelection(page,mobile){
 await page.evaluate(()=>{
  createBattle(0,false,false,[0,1]);
  const bastion=battle.units[0];
  selected=1;action='fire';hover=null;
  focusBattleCamera(bastion,true);renderBattle();
 });
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 const points=await page.evaluate(()=>{
  const bastion=battle.units[0];
  const bounds=unitBounds(bastion),live=foundryRender(bastion,clock,true);
  const {width,height}=live.surface;
  const pixels=live.surface.getContext('2d').getImageData(0,0,width,height).data;
  const stock=artMasks[window.IRON_VOW_FOUNDRY_ART[foundryModel(bastion.frame)].views[0].key];
  const alpha=(x,y)=>pixels[(Math.floor(y*height)*width+Math.floor(x*width))*4+3];
  const found={};
  for(let row=6;row<94;row++)for(let col=6;col<94;col++){
   const x=Math.round(bounds.x+bounds.w*col/100),y=Math.round(bounds.y+bounds.h*row/100);
   if(document.elementFromPoint(x,y)!==canvas)continue;
   const px=(x-bounds.x)/bounds.w,py=(y-bounds.y)/bounds.h;
   const stockX=unitFacing(bastion)>0?1-px:px;
   const stockAlpha=stock.data[(Math.floor(py*stock.height)*stock.width+Math.floor(stockX*stock.width))*4+3];
   const samples=[alpha(px,py),alpha(px-.015,py),alpha(px+.015,py),alpha(px,py-.015),alpha(px,py+.015)];
   if(stockAlpha<35&&samples.every(a=>a>230))found.armor??={x,y};
   if(stockAlpha>80&&samples.every(a=>a<10))found.empty??={x,y};
  }
  return {...found,bounds,center:document.elementFromPoint(bounds.x+bounds.w/2,bounds.y+bounds.h/2)?.outerHTML.slice(0,150)};
 });
 assert.ok(points.armor&&points.empty,'fixture contains armor and empty space that differ from the old silhouette: '+JSON.stringify(points));
 const click=({x,y})=>mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
 await click(points.empty);
 assert.equal(await page.evaluate(()=>selected),1,'empty space inside the Bastion sprite does not select it');
 await click(points.armor);
 assert.equal(await page.evaluate(()=>selected),0,'visible Bastion armor selects it');
 await page.evaluate(()=>{
  const contact=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  contact.frame=BASTION_FRAME;contact.name=FRAMES[BASTION_FRAME].name;
  lockedTarget=contact.id;hover=null;renderBattle();
 });
 const portrait=page.locator('.combat-target img');
 assert.match(await portrait.getAttribute('src'),/\/bastion-bst04\.webp(?:\?|$)/);
 assert.equal(await portrait.getAttribute('data-visual-key'),'bastion-bst04','combat portrait uses the replacement hull');
 await portrait.evaluate(image=>image.decode());
}
module.exports=checkBastionGrips;
