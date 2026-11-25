const navigate=require('./navigate.cjs');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {readGLB}=require('../check-rig-v2.cjs');
module.exports=async function checkRigWorkbench({page,origin,mobile,out}){
 await page.goto(new URL('rig-bench/',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForURL('**/?bench=rig');
 await page.waitForFunction(()=>window.__bench?.state?.metrics);
 const entries=await page.locator('#bench-frame option').evaluateAll(nodes=>nodes.map(node=>[node.value,node.text]));
 const catalog=await page.evaluate(()=>WEAPONS.map(({id,builtIn,shoulder,melee,tactical})=>({id,builtIn,shoulder,melee,tactical})));
 const mounted=new Set();

 assert.equal(entries.length,31);
 for(const [id, name] of [['24','HUSKY'],['25','GIZA'],['26','VYZOV'],['27','NIGHTJAR'],['29','CATAPHRACT']]){
  assert.ok(entries.some(([frame,label])=>frame===id&&label.toUpperCase()===name),name+' has its own bench entry');
 }
 assert.ok(entries.some(([id,name])=>id==='21'&&name==='CAIRN'),'Cairn retains its own bench entry');
 assert.ok(entries.some(([id,name])=>id==='22'&&name==='SALTJACK'));
 assert.ok(entries.some(([id,name])=>id==='23'&&name==='SALT WORKS GARRISON'));
 const models=[];
 for(const [id,name] of entries){
  await page.evaluate(id=>__bench.selectFrame(id),id);
  await page.waitForFunction(id=>__bench.state.frame.toString()===id&&__bench.state.loaded&&__bench.state.metrics?.triangles,id,{timeout:25000});
  const state=await page.evaluate(()=>__bench.state);
  assert.ok(state.metrics.height>1&&state.metrics.feet.every(foot=>Number.isFinite(foot.error)),name);
  models.push(state.model);
 }
 assert.equal(new Set(models).size,31);
 await page.evaluate(()=>__bench.selectFrame(10));
 await page.waitForFunction(()=>__bench.state.clips.length===6);
 if(out&&!mobile)await require('./save-webp.cjs')(page,join(out,'rig-bench.webp'));
 await page.evaluate(()=>__bench.setClip('Walk',0));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 const before=await page.evaluate(()=>__bench.state.authoredAnkles);
 assert.ok(before.every(position=>position?.every(Number.isFinite)));
 await page.evaluate(()=>__bench.setClip('Walk',1.1));
 await page.waitForFunction(before=>__bench.state.authoredAnkles.some((p,i)=>Math.hypot(...p.map((v,j)=>v-before[i][j]))>.01),before);
 await page.evaluate(()=>__bench.setClip(''));
 await page.locator('#bench-primary').selectOption('parallax');
 await page.waitForFunction(()=>__bench.state.weapon==='parallax');
 await page.locator('#bench-melee').selectOption('pike');
 await page.waitForFunction(()=>__bench.state.melee==='pike');
 await page.locator('#bench-shield').selectOption('bulwark-shield');
 await page.waitForFunction(()=>__bench.state.shield&&!__bench.state.melee);
 await page.locator('#bench-shield').selectOption('citadel-shield');
 await page.waitForFunction(()=>__bench.state.shield&&!__bench.state.melee);
 await page.locator('details').filter({hasText:'Damage'}).locator('summary').click();
 await page.locator('#bench-part-left').selectOption('0');
 await page.waitForFunction(()=>__bench.state.health.left===0&&__bench.state.partStates.left===2&&!__bench.state.shield);
 await page.locator('#bench-part-left').selectOption('100');
 await page.locator('details').filter({hasText:'Paint'}).locator('summary').click();
 const colors=['#507f9b','#343e48','#fa9129'];
 for(const [i,color] of colors.entries())await page.locator('#bench-paint-'+i).fill(color);
 await page.waitForFunction(colors=>['paint_primary','paint_secondary','paint_accent'].every((name,i)=>{
  const rgb=new THREE.Color(colors[i]).convertSRGBToLinear().toArray();
  return __bench.samplePaint()[name]?.some(c=>Math.hypot(...c.map((v,j)=>v-rgb[j]))<1e-5);
 }),colors);
 for(const part of ['body','pilot','right','legs']){
  await page.locator('#bench-part-'+part).selectOption('40');
  await page.waitForFunction(part=>__bench.state.partStates[part]===1,part);
  await page.locator('#bench-part-'+part).selectOption('100');
 }
 for(const {id,melee} of catalog.filter(w=>!w.builtIn&&!w.shoulder)){
  const key=melee?'melee':'weapon';
  await page.locator(melee?'#bench-melee':'#bench-primary').selectOption(id);
  await page.waitForFunction(({key,id})=>__bench.state[key]===id,{key,id});
  mounted.add(id);
 }
 await page.locator('details').filter({hasText:'Modules'}).locator('summary').click();
 await page.locator('#bench-legs').selectOption('2');
 await page.waitForFunction(()=>__bench.state.authoredMix?.lower==='basilisk');
 const mix=await page.evaluate(()=>__bench.state.authoredMix);
 assert.equal(mix.upper,'bastion');
 assert.ok(mix.pelvisGap<1e-5);
 await page.locator('#bench-ik').check();
 await page.waitForFunction(()=>__bench.state.ikMarkers===2);
 const rest=await page.evaluate(()=>__bench.state.metrics.feet[0].ankle);
 await page.locator('#bench-walk').click();
 await page.waitForFunction(rest=>Math.abs(__bench.state.metrics.feet[0].ankle[2]-rest[2])>.15,rest);
 const cameras=[];
 for(const view of ['orbit','game','front','side','hip']){
  await page.locator('#bench-view').selectOption(view);
  cameras.push(await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));return __bench.state.camera;}));
 }
 assert.equal(new Set(cameras.map(position=>JSON.stringify(position))).size,5);

 const integrated=[[3,'weapon','morrow'],[4,'weapon','locust'],[4,'melee','pulse-bash'],[11,'melee','breach-gauntlet'],
  [17,'weapon','aegis-cleave'],[17,'melee','aegis-bash'],[18,'weapon','needle-carbine'],[18,'melee','signal-knife'],
  [18,'weapon','flechette-scattergun'],[20,'pod','vesper-shoulder','missile'],[22,'weapon','rifle'],[23,'weapon','rifle'],[23,'weapon','salt-mg'],
  [16,'weapon','reaver-autocannon','rifle'],[27,'weapon','quill-lance'],[28,'weapon','merlin-38'],[29,'weapon','cataphract-cannon']];
 for(const [frame,slot,id,mountId=id] of integrated){
  await page.evaluate(frame=>__bench.selectFrame(frame),frame);
  if(id==='flechette-scattergun'||id==='salt-mg')await page.locator('#bench-primary').selectOption(id);
  if(slot==='pod'){
   const shoulder=page.locator('#bench-shoulder');
   await shoulder.selectOption(id);
   assert.equal(await shoulder.inputValue(),id);
  }
  try{
   await page.waitForFunction(({slot,mountId})=>__bench.state[slot]===mountId,{slot,mountId});
  }catch(error){
   const actual=await page.evaluate(slot=>__bench.state[slot],slot);
   throw Error(`Frame ${frame} ${slot} expected mount ${mountId} for ${id}, got ${actual}`,{cause:error});
  }
  mounted.add(id);
 }
 // These attacks belong to the authored chassis. The campaign rig scenario
 // verifies their real launch and strike contacts without a separate mount.
 const intrinsic=catalog.filter(w=>w.builtIn&&(w.tactical||w.id==='vyzov-knuckle')).map(w=>w.id).sort();
 assert.deepEqual(intrinsic,['four-sword','giza-salvo','vyzov-cross','vyzov-knuckle']);
 assert.deepEqual([...mounted].sort(),catalog.filter(w=>!intrinsic.includes(w.id)).map(w=>w.id).sort(),
  'Every separately mounted catalog weapon mounts');
 await page.evaluate(()=>__bench.selectFrame(5));
 for(const part of ['legs','core','arms']){
  const other=await page.locator('#bench-'+part+' option').evaluateAll(nodes=>nodes.find(n=>n.value!==n.parentElement.value).value);
  await page.locator('#bench-'+part).selectOption(other);
  await page.waitForFunction(({part,other})=>__bench.state.metrics?.mods[part]===Number(other),{part,other});
 }
 for(const level of [1,2,3]){
  await page.locator('#bench-kit').selectOption(String(level));
  await page.waitForFunction(level=>__bench.state.kitMeshes.slice(0,level).every(count=>count>0)&&
   __bench.state.kitMeshes.length===3&&__bench.state.kitMeshes.slice(level).every(count=>count===0),level);
 }
 await page.evaluate(()=>__bench.setView('lineup'));
 await page.waitForFunction(()=>__bench.state.loaded===6);
 const archives={3:'gatecrasher',4:'cicada',11:'hellbreaker',17:'bulwark',18:'scout',20:'shogun'};
 for(const [frame,file] of Object.entries(archives)){
  await page.evaluate(frame=>__bench.selectFrame(frame),frame);
  const expected=readGLB(join(__dirname,'../../dist/rig-bench/prototypes',file+'.glb')).animations.map(c=>c.name);
  await page.locator('#bench-clip-source').selectOption('archive');
  await page.waitForFunction(()=>__bench.state.clipSource==='archive'&&__bench.state.loaded&&__bench.state.metrics?.triangles,null,{timeout:25000});
  const actual=await page.evaluate(()=>__bench.state.clips.map(c=>c.name));
  assert.deepEqual(actual,expected,file+' exposes every original clip');
  await page.locator('#bench-clip').selectOption(actual.at(-1));
  await page.locator('#bench-play-clip').click();
  await page.waitForFunction(()=>__bench.state.clipTime>.08);
 }
 await page.evaluate(()=>__bench.selectFrame(0));
 await page.locator('#bench-clip-source').selectOption('archive');
 await page.waitForFunction(()=>__bench.state.clipSource==='archive'&&__bench.state.loaded);
 const wardenClips=await page.evaluate(()=>__bench.state.clips.map(c=>c.name));
 assert.deepEqual(wardenClips,['Aim','Brace','Melee maul','Melee sweep','Melee thrust','Recoil','Walk']);
 const wardenStep=await page.evaluate(async()=>{
  const clip=__bench.state.clips.find(clip=>clip.name==='Walk'),names=['Bench_Foot_L','Bench_Foot_R'];
  async function sample(time){
   __bench.setClip('Walk',time);await new Promise(resolve=>requestAnimationFrame(resolve));
   return __bench.sampleArchive(names).nodes.filter(node=>names.includes(node.name)).map(node=>node.position);
  }
  return [await sample(0),await sample(clip.duration*.42)];
 });
 assert.equal(wardenStep[0].length,2);
 assert.ok(wardenStep[0].some((p,i)=>Math.hypot(...p.map((v,j)=>v-wardenStep[1][i][j]))>.01));
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-workshop-detail="trials"] > summary').click();
 await page.getByRole('link',{name:'OPEN RIG BENCH'}).click();
 await page.waitForFunction(()=>window.__bench?.state?.loaded&&__bench.state.frame===0);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await navigate(page,'career');
 await page.getByRole('link',{name:'OPEN RIG BENCH'}).click();
 await page.waitForFunction(()=>window.__bench?.state?.loaded);
 console.log(`PASS ${mobile?'touch':'desktop'} Bench roster, native clip, loadout, paint, damage, mixed legs and six-rig lineup`);
 return {frames:entries.length,weapons:[...mounted],authoredMix:mix,prototypeArchives:Object.values(archives),wardenClips,contexts:1};
};
