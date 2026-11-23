/* Bench controls adapted from docs/reference/claude/rig-bench.html:237–329 and :2281–2339. */
(function(root){
'use strict';
const T=root.THREE,foundry=root.IronVowFoundry,rigV2=root.IronVowRigV2;
const parts=['body','pilot','right','left','legs'];
const VIEWS=[
 ['orbit','Orbit',-.52,.1,19,40,3.25],['game','Game camera',Math.PI/4,.66,25,30,3.3],
 ['front','Front',0,.06,26,30,3.7],['side','Side',-Math.PI/2,.06,26,30,3.7],
 ['hip','Hip',.42,.06,7,34,2.5],['lineup','Lineup',.16,.12,54,32,2.8]
];
// Prototype Bay's archived Scout actions keep their fitted attachment and flash beats.
const SCOUT_ACTIONS={Fire:{weapon:'carbine',flashes:[.29]},Burst:{weapon:'scatter',flashes:[.125,.375]},Strike:{weapon:'knife',flashes:[]}};
const COLOR_DEFAULTS=['#c6bd9f','#343e48','#e19b32'];
const vector=()=>new T.Vector3();
const option=(value,label)=>new Option(label,value);
function mount({frames,weapons,shields,attackProfile,weaponRigPose,sound,initialFrame,initialArchive}){
 const $=id=>document.getElementById(id),lookup=new Map(frames.map(frame=>[String(frame.id),frame]));
 const inventory=new Map(weapons.map(weapon=>[weapon.id,weapon]));
 const kits=frames.filter(frame=>frame.mix).slice(0,6);
 const cameras=new Map(VIEWS.map(view=>[view[0],view]));
 const camera=new T.PerspectiveCamera(40,1,.1,150),target=vector();
 const ground=new T.GridHelper(80,80,0x3c545e,0x263840);ground.position.y=-.025;
 const flashGeometry=new T.IcosahedronGeometry(.12,0),flashMaterial=new T.MeshBasicMaterial({color:0xffc179});
 const markers=new T.Group(),markerGeometry=new T.SphereGeometry(.077,8,6),markerMaterial=new T.MeshBasicMaterial({color:0x5fd4c4});
 for(let i=0;i<4;i++)markers.add(new T.Mesh(markerGeometry,markerMaterial));
 const effectRoot=new T.Group(),rigGeometry=new T.BufferGeometry(),rigLines=new T.LineSegments(rigGeometry,
  new T.LineBasicMaterial({color:0x78ddce,depthTest:false,transparent:true,opacity:.9}));
 const linePositions=new Float32Array(3*1024);
 rigGeometry.setAttribute('position',new T.BufferAttribute(linePositions,3));
 rigLines.frustumCulled=false;rigLines.renderOrder=50;
 let effects,showRig=false,audioEnabled=false,shotIndex=0,shotReports=0,strikeReports=0,contactSent=false,held;
 const health=Object.fromEntries(parts.map(part=>[part,100]));
 let frame=lookup.get(String(initialFrame))??frames[0],lowerFrame=frame,unit,modules,entry,lowerEntry,entries=[],lastStats,view='orbit',group='all',az=-.52,el=.1,dist=19;
 let time=0,prior,walk=false,advance=0,aim=false,fire=-Infinity,strike=-Infinity,clip='',clipTime=0,clipList='',drag;
 let showMarkers=false,paint={},paintFinish,team='ally',frameRequest,metricsAt=-Infinity;
 let clipSource='current',archive=null,archiveRequest=0,archiveError='',playing=false,lastArchiveSample='',firePod=false;
 document.body.dataset.view='rig-bench';
 document.body.classList.add('rig-bench-v3');
 $('ui').innerHTML=`
 <section class="bench-controls" aria-label="Rig Bench controls">
  <div class="bench-heading"><h1>Rig Bench</h1><a href="?bench=war">War</a><a href="?bench=war&amp;trial=salt-works">Salt Works Trial</a><a class="bench-model-review" href="rig-bench/giza.html">Giza model</a><a class="bench-model-review" href="rig-bench/husky.html">Husky model</a><a href="?view=workshop">Workshop</a></div>
  <label>Chassis<select id="bench-frame"></select></label>
  <details open><summary>Loadout</summary><div class="bench-fields">
   <label>Primary<select id="bench-primary"></select></label><label>Melee<select id="bench-melee"></select></label>
   <label>Shield<select id="bench-shield"></select></label><label>Shoulder<select id="bench-shoulder"></select></label>
   <label>Kit<select id="bench-kit"></select></label>
  </div></details>
  <details><summary>Modules</summary><div class="bench-fields">
   <label>Legs<select id="bench-legs"></select></label><label>Core<select id="bench-core"></select></label>
   <label>Arms<select id="bench-arms"></select></label><label>Show<select id="bench-group"></select></label>
  </div></details>
  <details><summary>Paint</summary><div class="bench-fields">
   <label>Team<select id="bench-team"></select></label>
   <label>Finish<select id="bench-finish">${Object.entries(root.IronVowFieldPaint.finishes).map(([id,name])=>
    `<option value="${id}">${name}</option>`).join('')}</select></label>
   ${['Primary','Secondary','Accent'].map((label,i)=>`<label>${label}<input id="bench-paint-${i}" type="color" value="${COLOR_DEFAULTS[i]}"></label>`).join('')}
   <button id="bench-factory" type="button">Factory colors</button>
  </div></details>
  <details><summary>Damage</summary><div class="bench-fields" id="bench-parts"></div></details>
  <details open><summary>Motion and view</summary><div class="bench-fields">
   <label>Camera<select id="bench-view"></select></label><label>Clip source<select id="bench-clip-source"></select></label>
   <label>Authored clip<select id="bench-clip"></select></label><button id="bench-play-clip" type="button" disabled>Play clip</button>
   <label>Clip time<input id="bench-time" type="range" min="0" max="0" value="0" step=".001" disabled></label>
   <label class="bench-check"><input id="bench-ik" type="checkbox">IK targets</label>
   <label class="bench-check"><input id="bench-rig" type="checkbox">Rig lines</label>
  </div><div class="bench-actions">
   <button id="bench-walk" type="button" aria-pressed="false">Walk</button>
   <button id="bench-aim" type="button" aria-pressed="false">Aim</button>
   <button id="bench-fire" type="button">Fire</button><button id="bench-strike" type="button">Strike</button>
   <button id="bench-fire-pod" type="button" hidden>Fire pod</button>
   <button id="bench-sound" type="button" aria-pressed="false">Sound</button>
  </div></details>
  <details open><summary>Specs &amp; metrics</summary><output id="bench-metrics"></output></details>
  <p id="bench-status" role="status"></p>
 </section>`;
 const select=(id,items,value)=>{const node=$(id);node.replaceChildren(...items.map(([key,label])=>option(key,label)));node.value=value;};
 const arsenalIds=pool=>pool.map(weapon=>[weapon.id,weapon.name]);
 const stockList=ids=>ids.filter(Boolean).map(id=>[id,inventory.get(id)?.name||id]);
 const owned=()=>({body:100,pilot:100,right:100,left:100,legs:100});
 function applyPart(id,hp){
  if(!parts.includes(id)||![0,40,100].includes(hp))throw Error('Invalid Bench part state');
  health[id]=hp;$('bench-part-'+id).value=hp;
 }
 function compatibleLegs(upper){
  return frames.filter(candidate=>candidate.authored&&candidate.quad===upper.quad);
 }
 function refreshLoadout(){
  const guns=frame.fixed?stockList(frame.primaries||[frame.stock.weapon]):arsenalIds(weapons.filter(w=>!w.builtIn&&!w.shoulder&&!w.melee));
  const melee=frame.fixed?stockList(frame.melees||[frame.stock.melee]):arsenalIds(weapons.filter(w=>!w.builtIn&&!w.shoulder&&w.melee));
  select('bench-primary',guns,unit.weapon);
  select('bench-melee',[['','Empty'],...melee],unit.melee??'');
  select('bench-shield',[['','Empty'],...shields.filter(()=>frame.shield).map(s=>[s.id,s.name])],unit.shield??'');
  select('bench-shoulder',[['','Empty'],...arsenalIds(weapons.filter(w=>w.shoulder&&frame.pod))],unit.shoulder??'');
  $('bench-fire-pod').hidden=!frame.pod;$('bench-fire-pod').disabled=!unit.shoulder||clipSource==='archive';
  select('bench-kit',[0,1,2,3].slice(0,frame.mix?4:1).map(i=>[i,i?'Kit '+i:'Factory']),unit.upgrade);
  for(const key of ['legs','core','arms']){
   const control=$('bench-'+key),authored=frame.authored&&key==='legs';
   const choices=frame.mix?kits.map(f=>[f.model,f.name]):authored?compatibleLegs(frame).map(f=>[f.id,f.name]):[[frame.model??0,frame.name]];
   select('bench-'+key,choices,authored?lowerFrame.id:modules?.[key]??frame.model??0);
   control.parentElement.hidden=key!=='legs'&&!frame.mix;
   control.disabled=clipSource==='archive'||!frame.mix&&(!authored||choices.length<2);
  }
 }
 function reset(frameChanged=false){
  foundry.clearInspection(frameChanged);
  entry=null;lowerEntry=null;entries=[];advance=0;fire=strike=-Infinity;effects?.clear();
 }
 function availableClips(){return (clipSource==='archive'?archive?.clips:entry?.m.nativeV2?.clips)??[];}
 function setClip(name,time=0){
  const found=availableClips().find(clip=>clip.name===name);
  clip=found?.name??'';clipTime=found?Math.min(found.duration,Math.max(0,time)):0;
  $('bench-clip').value=clip;
  playing=false;$('bench-play-clip').disabled=!found;$('bench-play-clip').textContent='Play clip';
  $('bench-time').disabled=!found;$('bench-time').max=found?.duration??0;$('bench-time').value=clipTime;
  if(!clip&&entry)entry.m.nativeV2?.scrub?.();
  lastArchiveSample='';
 }
 function releaseArchive(){
  if(!archive)return;
  const flashes=[];
  archive.source.traverse(node=>{if(node.userData.archiveFlash)flashes.push(node);});
  for(const flash of flashes)flash.parent.remove(flash);
  archive.dispose();
 }
 async function setClipSource(source){
  if(source!=='current'&&!(source==='archive'&&frame.archive))throw Error('Unknown Bench clip source');
  const request=++archiveRequest;
  clipSource=source;$('bench-clip-source').value=source;
  clipList='';setClip('');releaseArchive();archive=null;archiveError='';
  const archived=source==='archive';
  for(const id of ['walk','aim','fire','strike','team','group','kit','ik','finish','factory','paint-0','paint-1','paint-2',...parts.map(p=>'part-'+p)]){
   $('bench-'+id).disabled=archived;
  }
  $('bench-fire-pod').disabled=archived||!unit?.shoulder;
  if(unit)refreshLoadout();
  if(!archived){$('bench-clip').disabled=false;return;}
  setView('orbit');walk=false;aim=false;
  $('bench-clip').disabled=true;
  try{
   const asset=await rigV2.loadClipArchive(frame.archive);
   if(archiveRequest!==request){asset.dispose();return;}
   archive=asset;
   if(frame.archive.endsWith('/scout.glb'))asset.source.traverse(node=>{
    if(!node.userData.scout_muzzle)return;
    const flash=new T.Mesh(flashGeometry,flashMaterial);
    flash.userData.archiveFlash=node.userData.scout_muzzle;
    node.add(flash);
   });
   updateClipList();setClip(asset.clips[0]?.name);
  }catch(error){if(archiveRequest===request)archiveError='Could not load the archived clips.';}
  finally{if(archiveRequest===request)$('bench-clip').disabled=false;}
 }
 function selectFrame(id){
  const next=lookup.get(String(id));if(!next)throw Error('Unknown Bench frame '+id);
  void setClipSource('current');
  frame=lowerFrame=next;$('bench-frame').value=id;walk=false;aim=false;
  select('bench-clip-source',[['current','Live rig'],...(frame.archive?[['archive','Authored archive']]:[])],'current');
  $('bench-walk').setAttribute('aria-pressed','false');$('bench-aim').setAttribute('aria-pressed','false');
  for(const id of parts)applyPart(id,100);
  unit={id:'bench-main',index:0,frame:next.frame,rig:next.rig,lionTrial:next.lionTrial,team,...next.stock};
  modules=frame.mix?{core:frame.model,arms:frame.model,legs:frame.model}:undefined;
  group='all';$('bench-group').value='all';setClip('');clipList='';
  reset(true);refreshLoadout();
 }
 function setView(name){
  if(!cameras.has(name))throw Error('Unknown Bench camera '+name);
  if(view==='lineup'||name==='lineup')reset();
  view=name;$('bench-view').value=view;
  [, ,az,el,dist]=cameras.get(view);
 }
 function updateClipList(){
  const clips=availableClips(),key=clipSource+'|'+clips.map(c=>c.name).join('|');
  if(key===clipList)return;
  clipList=key;select('bench-clip',[...(clipSource==='archive'?[]:[['','Live pose']]),...clips.map(c=>[c.name,c.name])],clip);
 }
 function modelUnit(source,x,z,withHealth){
  const hp=withHealth?{...health}:owned();
  return {...source,team,inspectWeapon:source.weapon,paintFinish,paint:paint.p,trim:{s:paint.s,a:paint.a},alive:hp.body>0&&hp.pilot>0,
   downReason:hp.pilot<=0?'pilot':undefined,face:0,hp,max:owned(),x,z,
   motion:withHealth&&walk&&!clip&&hp.legs>0&&hp.body>0&&hp.pilot>0?{toX:x,toZ:z+1}:null};
 }
 function modelPose(source,x,z,isActive){
  const primary=inventory.get(source.weapon),gun=firePod?inventory.get('missile'):primary;
  const melee=primary?.melee&&fire>strike&&!firePod?primary:inventory.get(source.melee);
  const strikeAt=melee===primary?fire:strike;
  const age=time-fire,hit=time-strikeAt,profile=gun&&!gun.melee?attackProfile(source,gun.id):null;
  const beats=profile?.beats??[],firing=isActive&&source.alive&&source.hp[firePod?'body':'right']>0&&profile&&age>=0&&age<profile.raise+(beats.at(-1)??0)+profile.travel+profile.recover;
  const striking=isActive&&source.alive&&melee&&source.hp[melee.hand??'left']>0&&hit>=0&&hit<1.1;
  if(firing||striking)source.attack={kind:striking?melee.id:gun.id,start:striking?strikeAt:fire};
  const muzzleAge=age-(profile?.raise??0);
  const recoil=beats.reduce((peak,beat)=>Math.max(peak,Math.max(0,1-Math.abs(muzzleAge-beat)*15)),0);
  const motion=root.IronVowFoundryRig.MEL,contact=motion.hit;
  const strikeProgress=!striking?0:hit<contact?.7*hit/contact:.7+.3*(hit-contact)/(motion.end-contact);
  if(source.id==='bench-main')held={firing,striking,muzzleAge,hit,profile,gun,melee};
  return {world:{x,y:0,z,face:0,heading:0,speed:source.motion?2.6:0,groundAt:()=>0,
   targetRoot:new T.Vector3(x,0,z+7.4),aim:new T.Vector3(x,3.65,z+12)},
   modules:isActive?modules:undefined,clip:isActive?clip:'',clipTime,heading:0,phase:0,primeProgress:0,
   aim:isActive&&(aim||firing)?1:0,recoil,impact:0,land:0,brace:0,
   strikeKind:striking?melee.id:null,strikeProgress,
   deathAge:source.alive?0:2,explosion:source.alive?0:1,
   ...(firing?weaponRigPose(profile,muzzleAge):{})};
 }
 function effectCue(id){if(audioEnabled)sound(id);}
 function stageEffects(dt){
  if(!entry||!held)return;
  const {m}=entry,{firing,striking,profile,muzzleAge,gun,hit,melee}=held;
  if((firing||striking)&&!effects)effects=root.IronVowEffects.create(effectRoot,{camera,contactsExternal:true});
  if(firing){
   const barrel=firePod?entry.shoulderWeapon:entry.primary;
   const archetype=root.IronVowWeaponFX.get(gun.id).archetype;
   while(barrel?.muzzle&&shotIndex<profile.beats.length&&muzzleAge>=profile.beats[shotIndex]){
    const index=shotIndex++,marker=barrel.muzzles?.[index%barrel.muzzles.length]??(index%2&&barrel.muzzle2?barrel.muzzle2:barrel.muzzle);
    const origin=marker.getWorldPosition(vector()),target=origin.clone().addScaledVector(marker.getWorldDirection(vector()),10);
    effects.fireFX(m,target,archetype,'body',{origin,target,at:time,flight:profile.travel,arrival:p=>effects.explode(p,false)});
    shotReports++;effectCue(gun.id);
   }
  }
  if(striking&&entry.secondary?.tip&&m.melee){
   effects.meleeUpdate(m,time,dt);
   if(!contactSent&&hit>=root.IronVowFoundryRig.MEL.hit){
    contactSent=true;strikeReports++;
    const tip=entry.secondary.tip.getWorldPosition(vector());
    effects.impact(tip,m.cont.position.clone().sub(tip),'blade');
    effectCue(melee.id);
   }
  }
  effects?.update(time,dt);
 }
 function updateRigLines(archived){
  let i=0;
  function segment(parent,node){
   if(!parent||!node||i+6>linePositions.length)return;
   parent.getWorldPosition(vector()).toArray(linePositions,i);
   node.getWorldPosition(vector()).toArray(linePositions,i+3);i+=6;
  }
  if(archived){
   archive?.source.traverse(node=>{if(node.isBone||node.name.startsWith('Bench_'))segment(node.parent,node);});
  }else if(entry){
   const {rig}=entry.m,lower=(lowerEntry??entry).m.rig;
   segment(rig.pelvis,rig.spine);segment(rig.spine,rig.neck);
   for(const arm of Object.values(rig.arms)){segment(rig.spine,arm.sh);segment(arm.sh,arm.el);segment(arm.el,arm.wr);segment(arm.wr,arm.so);}
   for(const leg of lower.legs){segment(lower.pelvis,leg.hip);segment(leg.hip,leg.kn);segment(leg.kn,leg.an);}
  }
  rigGeometry.attributes.position.needsUpdate=true;rigGeometry.setDrawRange(0,i/3);
 }
 function cameraAt(){
  const mobile=innerWidth/innerHeight<1;
  const [, , , , ,fov,center]=cameras.get(view);
  camera.aspect=innerWidth/innerHeight;camera.fov=fov;
  camera.updateProjectionMatrix();
  const y=view==='hip'?(entry?.m.rig.pelvis.position.y??3)-.4:center;
  target.set(0,y,view==='lineup'?0:advance);
  const d=dist*(mobile?(view==='lineup'?1.17:1.32):1);
  camera.position.set(Math.sin(az)*Math.cos(el)*d,Math.sin(el)*d,Math.cos(az)*Math.cos(el)*d).add(target);
  camera.lookAt(target);
 }
 function isLeg(mesh){return (mesh.userData.part??mesh.geometry.userData.part)==='legs';}
 function alignUpper(upper,lower){
  // Join both authored assemblies at the actual animated pelvis. Each
  // source retains its bone weights, measurements and per-part geometry.
  const source=upper.m.rig.pelvis.matrixWorld,target=lower.m.rig.pelvis.matrixWorld;
  upper.m.cont.applyMatrix4(target.clone().multiply(source.clone().invert()));
  upper.m.cont.updateMatrixWorld(true);
 }
 function metrics(){
  if((!entry&&!archive)||!lastStats)return null;
  const m=entry?.m,bounds=new T.Box3();
  const add=(object,filter)=>object.traverseVisible(node=>{if(node.isMesh&&filter(node)){
   if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
   bounds.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
  }});
  if(archive)add(archive.source,()=>true);
  else if(lowerEntry){add(m.cont,node=>!isLeg(node));add(lowerEntry.m.cont,isLeg);}
  else add(m.cont,()=>true);
  if(archive)return {triangles:lastStats.triangles,drawCalls:lastStats.calls,height:bounds.max.y-bounds.min.y,feet:[]};
  const lower=lowerEntry?.m??m;
  const feet=lower.rig.legs.map(({side,an},i)=>({side,ankle:an.getWorldPosition(vector()).toArray(),
   target:lower.legs[i].foot.toArray(),error:an.getWorldPosition(vector()).distanceTo(lower.legs[i].foot)}));
  const stance=Math.max(...feet.map(f=>f.ankle[0]))-Math.min(...feet.map(f=>f.ankle[0]));
  return {triangles:lastStats.triangles,drawCalls:lastStats.calls,height:bounds.max.y-bounds.min.y,
   hipWidth:lower.dims.hipX*2*lower.scale,stance,feet,mods:{...m.build.mods}};
 }
 function draw(timestamp){
  const dt=Math.min(.05,Math.max(0,(timestamp-(prior??timestamp))/1000));prior=timestamp;time+=dt;
  if(playing){
   const duration=availableClips().find(c=>c.name===clip)?.duration??0;
   clipTime=Math.min(clipTime+dt,duration);$('bench-time').value=clipTime;
   if(clipTime>=duration){playing=false;$('bench-play-clip').textContent='Play clip';}
  }
  const archived=clipSource==='archive',lineup=!archived&&view==='lineup',mobile=innerWidth<innerHeight;
  if(!archived&&walk&&!clip&&!lineup&&health.legs>0&&health.body>0&&health.pilot>0)advance+=dt*2.6;
  const source=modelUnit(unit,0,advance,true);
  lowerEntry=null;
  if(archived){
   entries=[];
   const key=clip+'|'+clipTime+'|'+unit.melee+'|'+unit.shoulder;
   if(archive&&key!==lastArchiveSample){
    lastArchiveSample=key;archive.sample(clip,clipTime);
    // Preserve the optional mount and scout action fits from Prototype Bay's bay.js:139–168.
    archive.source.traverse(node=>{
     const name=node.name.replace(/[^a-z0-9]/gi,'');
     if(frame.pod&&name==='HardpointL')node.visible=unit.melee==='cleaver'||clip==='Strike';
     if(frame.pod&&name==='ShoulderHardpointR')node.visible=unit.shoulder==='vesper-shoulder';
     const scout=SCOUT_ACTIONS[clip];
     if(node.userData.scout_weapon)node.visible=node.userData.scout_weapon===(scout?.weapon??'carbine');
     if(node.userData.archiveFlash)node.visible=scout?.weapon===node.userData.archiveFlash&&
      scout.flashes.some(at=>clipTime>=at&&clipTime<at+.055);
    });
   }
  }else if(lineup){
   entries=kits.map((kit,i)=>{
    const x=mobile?((i%3)-1)*6.6:(i-(kits.length-1)/2)*7.4,z=mobile?(i<3?4:-5):0;
    const sample=modelUnit({id:'bench-line-'+kit.id,index:i,frame:kit.frame,...kit.stock},x,z,false);
    return foundry.inspect(sample,kit.model,time,modelPose(sample,x,z,false));
   }).filter(Boolean);
  }else{
   entry=foundry.inspect(source,frame.model,time,modelPose(source,0,advance,true));
   entries=entry?[entry]:[];
   if(entry&&!clip&&frame.authored&&lowerFrame!==frame){
    const lower=modelUnit({id:'bench-lower',index:0,frame:lowerFrame.frame,lionTrial:lowerFrame.lionTrial,...lowerFrame.stock},0,advance,true);
    lowerEntry=foundry.inspect(lower,lowerFrame.model,time,modelPose(lower,0,advance,true));
    if(lowerEntry){alignUpper(entry,lowerEntry);entries.push(lowerEntry);}
   }
   updateClipList();
  }
  ground.position.z=Math.round(advance/10)*10;
  const objects=[ground,...entries.map(e=>e.m.cont)],hidden=[];
  if(archived&&archive)objects.push(archive.source);
  const hide=(object,visible)=>object.traverseVisible(node=>{
   if(node.isMesh&&!visible(node)){node.visible=false;hidden.push(node);}
  });
  if(!lineup&&!archived&&entry){
   if(lowerEntry){
    hide(entry.m.cont,node=>group!=='legs'&&!isLeg(node));
    hide(lowerEntry.m.cont,node=>group!=='upper'&&isLeg(node));
   }else if(group!=='all')hide(entry.m.cont,node=>isLeg(node)===(group==='legs'));
  }
  if(showMarkers&&!lineup&&!archived&&entry&&!clip){
   markers.children.forEach((marker,i)=>{
    const leg=(lowerEntry?.m??entry.m).legs[i];marker.visible=Boolean(leg);
    if(leg)marker.position.copy(leg.foot);
   });
   objects.push(markers);
  }
  cameraAt();
  if(!lineup&&!archived&&!clip){stageEffects(dt);if(effects)objects.push(effectRoot);}
  if(showRig&&!lineup){updateRigLines(archived);objects.push(rigLines);}
  lastStats=foundry.renderInspection(objects,camera);
  for(const node of hidden)node.visible=true;
  const status=rigV2.status(source,'bench');
  if(time-metricsAt>.15){
   metricsAt=time;
   const m=metrics();
   $('bench-status').textContent=archived?(archiveError||(archive?'':'Loading archived clips…')):
    (entries.length?'':status==='error'?'Could not load the rig.':'Loading rig…');
   $('bench-metrics').textContent=m?`${m.triangles.toLocaleString()} triangles · ${m.drawCalls} draws
${m.height.toFixed(2)} m height${archived?'':` · ${m.stance.toFixed(2)} m stance · ${m.hipWidth.toFixed(2)} m hip width`}
${clip?'':m.feet.map(f=>`${f.side}: ${(f.error*100).toFixed(1)} cm IK`).join(' · ')}`:'';
  }
  frameRequest=requestAnimationFrame(draw);
 }
 select('bench-frame',frames.map(frame=>[frame.id,frame.name]),frame.id);
 select('bench-view',VIEWS.map(([id,label])=>[id,label]),view);
 select('bench-team',[['ally','Ally'],['enemy','Enemy']],team);
 select('bench-group',[['all','Full rig'],['upper','Upper'],['legs','Legs']],group);
 select('bench-clip',[['','Live pose']],'');
 $('bench-parts').innerHTML=parts.map(part=>`<label>${part}<select id="bench-part-${part}"></select></label>`).join('');
 for(const id of parts){
  select('bench-part-'+id,[[100,'Intact'],[40,'Damaged'],[0,'Destroyed']],100);
  $('bench-part-'+id).onchange=e=>{const wasAlive=health.body>0&&health.pilot>0;applyPart(id,Number(e.target.value));if(!wasAlive&&health.body>0&&health.pilot>0)reset();};
 }
 $('bench-frame').onchange=e=>selectFrame(e.target.value);
 $('bench-view').onchange=e=>setView(e.target.value);
 $('bench-group').onchange=e=>{group=e.target.value;};
 $('bench-ik').onchange=e=>{showMarkers=e.target.checked;};
 $('bench-rig').onchange=e=>{showRig=e.target.checked;};
 $('bench-sound').onclick=e=>{audioEnabled=!audioEnabled;e.target.setAttribute('aria-pressed',String(audioEnabled));};
 for(const [id,key] of [['primary','weapon'],['melee','melee'],['shield','shield'],['shoulder','shoulder'],['kit','upgrade']]){
  $('bench-'+id).onchange=e=>{
   unit[key]=key==='upgrade'?Number(e.target.value):e.target.value||null;
   if(key==='shield'&&unit.shield)unit.melee=null;
   if(key==='melee'&&unit.melee)unit.shield=null;
   reset();refreshLoadout();
  };
 }
 for(const slot of ['legs','core','arms'])$('bench-'+slot).onchange=e=>{
  if(modules){modules[slot]=Number(e.target.value);reset();return;}
  lowerFrame=lookup.get(e.target.value);reset(true);
 };
 $('bench-team').onchange=e=>{team=e.target.value;reset();};
 function selectFinish(selected){
  paintFinish=selected;$('bench-finish').value=selected;
  if(paintFinish==='factory'){
   paint={};for(const [i,color] of COLOR_DEFAULTS.entries())$('bench-paint-'+i).value=color;
  }
  reset();
 }
 $('bench-finish').onchange=e=>selectFinish(e.target.value);
 for(const [i,key] of ['p','s','a'].entries())$('bench-paint-'+i).onchange=e=>{
  if(!paintFinish||paintFinish==='factory'){
   paintFinish='solid';$('bench-finish').value='solid';
  }
  paint[key]=e.target.value;reset();
 };
 $('bench-factory').onclick=()=>selectFinish('factory');
 $('bench-clip-source').onchange=e=>void setClipSource(e.target.value);
 $('bench-clip').onchange=e=>setClip(e.target.value);
 $('bench-play-clip').onclick=()=>{
  if(!clip)return;
  playing=!playing;
  if(playing&&clipTime>=Number($('bench-time').max))clipTime=0;
  $('bench-play-clip').textContent=playing?'Pause clip':'Play clip';
 };
 $('bench-time').oninput=e=>{clipTime=Number(e.target.value);};
 $('bench-walk').onclick=e=>{setClip('');walk=!walk;e.target.setAttribute('aria-pressed',String(walk));};
 $('bench-aim').onclick=e=>{setClip('');aim=!aim;e.target.setAttribute('aria-pressed',String(aim));};
 $('bench-fire').onclick=()=>{setClip('');firePod=false;fire=time;shotIndex=0;contactSent=false;};
 $('bench-fire-pod').onclick=()=>{setClip('');firePod=true;fire=time;shotIndex=0;};
 $('bench-strike').onclick=()=>{setClip('');strike=time;contactSent=false;};
 const canvas=root.IronVowRenderer.get().domElement;
 canvas.setAttribute('aria-label','Mech viewport. Drag to orbit or scroll to zoom.');
 canvas.removeAttribute('aria-hidden');
 canvas.onpointerdown=e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(drag?.id!==e.pointerId)return;if(view!=='orbit')setView('orbit');
  az-=(e.clientX-drag.x)*.007;el=Math.min(1.25,Math.max(-.16,el+(e.clientY-drag.y)*.006));drag.x=e.clientX;drag.y=e.clientY;};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
 canvas.onwheel=e=>{e.preventDefault();dist=Math.min(95,Math.max(5,dist*Math.exp(e.deltaY*.001)));};
 selectFrame(frame.id);
 if(initialArchive&&frame.archive)void setClipSource('archive');
 function sampleArchive(names=[]){
  if(!archive)return null;
  const nodes=[];
  archive.source.traverse(node=>{
   if(node.isBone||names.includes(node.name)||Object.keys(node.userData).length)nodes.push({
    name:node.name,parent:node.parent?.name,visible:node.visible,tags:{...node.userData},
    parentTags:{...node.parent?.userData},position:node.getWorldPosition(vector()).toArray(),
    parentPosition:node.parent?.getWorldPosition(vector()).toArray()
   });
  });
  return {nodes,clip,time:clipTime,duration:Math.max(0,...availableClips().filter(c=>c.name===clip).map(c=>c.duration))};
 }
 function weaponMounts(){
  if(!entry)return null;
  const {arms}=entry.m.rig;
  function socket(weapon,carrier){
   if(!weapon?.mount)return null;
   return {id:weapon.id,seated:weapon.mount.parent===carrier,
    point:carrier.getWorldPosition(vector()).toArray()};
  }
  return {primary:socket(entry.primary,entry.primary?.carrier??entry.primarySocket??arms.R.so),
   melee:socket(entry.secondary,entry.secondary?.carrier??arms.L.so)};
 }
 function samplePaint(){
  const matched={};
  entry?.m.cont.traverseVisible(node=>{
   for(const material of [node.material].flat())if(material?.name?.startsWith('paint_'))
    (matched[material.name]??=[]).push(material.color.toArray());
  });
  return matched;
 }
 root.__bench={selectFrame,setView,setClip,setClipSource,sampleArchive,samplePaint,get state(){return {roster:frames.map(f=>f.id),frame:frame.id,loaded:clipSource==='archive'?Number(Boolean(archive)):entries.length,view,clip,clipSource,clipTime,group,
  model:frame.rig??entry?.m.live??frame.model,authoredMix:lowerEntry?{
   upper:entry.m.live,lower:lowerEntry.m.live,
   pelvisGap:entry.m.rig.pelvis.getWorldPosition(vector()).distanceTo(lowerEntry.m.rig.pelvis.getWorldPosition(vector()))
  }:null,clips:availableClips().map(c=>({name:c.name,duration:c.duration})),
  bones:entry?.m.rig.legs.map(l=>l.an.matrixWorld.toArray())??[],
  authoredAnkles:entry?.m.nativeV2?['ankleL','ankleR'].map(name=>entry.m.nativeV2.source.getObjectByName(name)?.getWorldPosition(vector()).toArray()):[],health:{...health},paint:{...paint},weapon:entry?.primary?.id,
  melee:entry?.secondary?.id,shield:Boolean(entry?.shield?.mount.visible),pod:entry?.shoulderWeapon?.id,
  camera:camera.position.toArray(),shots:shotReports,strikes:strikeReports,rigLines:showRig?rigGeometry.drawRange.count/2:0,ikMarkers:showMarkers&&!clip?markers.children.filter(marker=>marker.visible).length:0,
  partStates:entry?{...entry.m.partState}:null,mounts:weaponMounts(),kitMeshes:entry?.m.build.kits.map(group=>group.filter(mesh=>mesh.visible).length)??[],metrics:metrics()};}};
 root.addEventListener('pagehide',event=>{if(event.persisted)return;
  cancelAnimationFrame(frameRequest);foundry.clearInspection(true);archiveRequest++;releaseArchive();
  ground.geometry.dispose();ground.material.dispose();markerGeometry.dispose();markerMaterial.dispose();flashGeometry.dispose();flashMaterial.dispose();
  effects?.dispose();rigGeometry.dispose();rigLines.material.dispose();});
 frameRequest=requestAnimationFrame(draw);
}
root.IronVowBench={mount};
})(window);
