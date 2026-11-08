'use strict';
const $=s=>document.querySelector(s), canvas=$('#scene'),ctx=canvas.getContext('2d');
const WEAPONS=[{id:'rifle',name:'Kestrel AR-8',type:'ASSAULT RIFLE',damage:36,range:5,ap:3,weight:14,price:0,desc:'Reliable burst fire. Balanced range and accuracy.'},{id:'shotgun',name:'Breacher SG-4',type:'SCATTER CANNON',damage:60,range:3,ap:3,weight:18,price:1500,desc:'Devastating close-range impact. Close the distance.'},{id:'missile',name:'Vesper MRL',type:'MISSILE POD',damage:45,range:7,ap:4,weight:22,price:2400,desc:'Long-range guided ordnance. Ignores cover penalties.'},{id:'rail',name:'Longbow R-12',type:'RAIL CANNON',damage:70,range:8,ap:5,weight:26,price:3600,desc:'Precision anti-armor fire. Powerful, but demanding.'},
 {id:'hailstorm',name:'Hailstorm M-8',type:'ROTARY GUN',damage:49,range:5,ap:4,weight:21,price:2200,desc:'Spins up for sustained fire at medium range.'},
 {id:'rampart',name:'Rampart AC-40',type:'AUTOCANNON',damage:61,range:6,ap:5,weight:25,price:2900,desc:'A single heavy shell with a longer reach than the scatter cannon.'},
 {id:'breaker',name:'Breaker Maul',type:'IMPACT MAUL',damage:66,range:1,ap:4,weight:20,price:1600,melee:true,desc:'An overhead strike for heavy damage against adjacent targets.'},
 {id:'cleaver',name:'Arc Cleaver',type:'HEATED BLADE',damage:40,range:1,ap:2,weight:12,price:1200,melee:true,desc:'A quick sweep for repeated strikes against an adjacent target.'},
 {id:'piledriver',name:'Piledriver',type:'HYDRAULIC RAM',damage:59,range:1,ap:3,weight:18,price:2100,melee:true,desc:'A powered point-blank thrust that punches through armor.'}
];
const HOSTILE_PAINT='#cf3f4b',HOSTILE_FILTER='grayscale(1) sepia(1) saturate(4.6) hue-rotate(312deg) brightness(.82)';
const PAINT_PRESETS=[['Factory',null],['Bone','#c6bd9f'],['Olive','#708657'],['Slate','#577eac'],['Sand','#c19960'],['Graphite','#555e69'],['Ivory','#d9ddd5']];
const RANGED=WEAPONS.filter(w=>!w.melee),MELEE=WEAPONS.filter(w=>w.melee);
const validPaint=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const FRAMES=[{name:'WARDEN',model:'WDN–07',role:'ASSAULT',color:'#899681',hp:160,arm:92,leg:110,move:4,armor:5},{name:'KESTREL',model:'KST–12',role:'RECON',color:'#b6a37c',hp:126,arm:78,leg:100,move:5,armor:2},{name:'BASILISK',model:'BSK–04',role:'SUPPORT',color:'#708c92',hp:180,arm:100,leg:90,move:3,armor:7}];
const PILOTS=[{name:'Mara Voss',call:'ROOK',skill:'Overdrive',desc:'+2 AP this turn. Once per battle.',color:'#9cae8b'},{name:'Jin Takeda',call:'GHOST',skill:'Deadeye',desc:'Next attack deals 50% more damage. Once per battle.',color:'#c1a477'},{name:'Elena Ortiz',call:'ANCHOR',skill:'Field repair',desc:'Restore 45 body HP. Once per battle.',color:'#83a4ac'}];
const CONTRACTS=[{name:'Ashes of the relay',place:'KARST BASIN · SECTOR 07',tag:'RECOVERY OPERATION',pay:3200,difficulty:1,desc:'A rival lance occupies a decommissioned relay station. Clear the site and recover its navigation core.',enemies:3,color:'#707e60'},{name:'The iron corridor',place:'VANTA INDUSTRIAL · SECTOR 12',tag:'INTERDICTION',pay:4600,difficulty:2,desc:'Intercept an armored patrol before it reaches the refinery. Expect reinforced enemy chassis.',enemies:4,color:'#a07856'},{name:'No quiet frontier',place:'HALCYON OUTSKIRTS · SECTOR 19',tag:'HIGH-RISK CONTRACT',pay:6800,difficulty:3,desc:'A veteran company has claimed the frontier. Break their command lance and make your name.',enemies:5,color:'#658b92'}];
const FIELD_PATCH=50;
const FIELDS=[
 {ground:'relay',label:'BASALT RIDGE / RELAY SHIELDS',grid:'#c1c3a92b',border:'#cdc49b7a',
  cover:{'2,3':'ridge-rock','3,3':'ridge-rock','7,3':'ridge-rock','7,4':'relay-shield','5,6':'relay-shield','6,6':'relay-shield','2,7':'ridge-rock','8,7':'ridge-rock','4,1':'relay-shield'}},
 {ground:'corridor',label:'REFINERY YARD / CARGO & POWER',grid:'#cbc7b62e',border:'#e2b5759c',
  cover:{'1,3':'cargo','2,3':'cargo','3,3':'transformer','6,4':'transformer','7,4':'transformer','8,4':'cargo','3,6':'cargo','4,6':'cargo','7,7':'transformer'}},
 {ground:'frontier',label:'FROZEN RUNOFF / WOODS & BUNKERS',grid:'#c6dbd52b',border:'#bbd4d091',
  cover:{'1,4':'conifer','2,4':'conifer','7,2':'conifer','8,2':'bunker','5,5':'conifer','6,5':'conifer','3,7':'bunker','7,7':'bunker','4,2':'conifer'}}
];
function fresh(){return{version:1,day:1,credits:4500,rep:0,wins:0,kills:0,owned:['rifle','missile'],units:FRAMES.map((f,i)=>({weapon:i===2?'missile':'rifle',level:1,xp:0,condition:100,upgrade:0})),history:[]}}
let save;try{save=JSON.parse(localStorage.getItem('iron-vow-career'));if(!validSave(save))save=fresh()}catch{save=fresh()}
save.owned=[...new Set([...save.owned,...save.units.flatMap(u=>[u.weapon,u.melee].filter(Boolean))])];
let page=window.location?.search==='?view=workshop'?'workshop':'hangar',selected=0,battle=null,action='move',targetPart='body',effects=[],hover=null,clock=0,last=0,muted=true,audio=null,toastTimer,inspectOpen=false,lockedTarget=null,targetPanelOpen=false,modalReturnFocus=null;
function persist(enemyPending=false){
 try{
  if(battle&&battle.phase==='player'&&!battle.busy)save.sortie=captureSortie(enemyPending);
  else if(!battle)delete save.sortie;
  localStorage.setItem('iron-vow-career',JSON.stringify(save));
 }catch{toast('Storage unavailable. Keep this tab open to retain your career.')}
}
function captureSortie(enemyPending=false){
 return{version:1,contract:CONTRACTS.indexOf(battle.contract),turn:battle.turn,selected,action,part:targetPart,enemyPending,
  units:battle.units.map(u=>({x:u.x,z:u.z,face:u.face??(u.team==='enemy'?1:-1),hp:{body:u.hp.body,left:u.hp.left,right:u.hp.right,legs:u.hp.legs},ap:u.ap,brace:u.brace,skill:u.skill,boost:u.boost}))};
}
function createBattle(i){
 const field=FIELDS[i];
 battle={contract:CONTRACTS[i],field,turn:1,phase:'player',units:[],cover:new Set(Object.keys(field.cover)),log:['Lance deployed. Reactor signatures detected.'],busy:false};
 battle.units=[makeUnit(0,'ally',1,8),makeUnit(1,'ally',2,9),makeUnit(2,'ally',0,9),...Array.from({length:CONTRACTS[i].enemies},(_,j)=>makeUnit(j,'enemy',j%3*3+2,Math.floor(j/3)))];
}
function restoreSortie(){
 const saved=save.sortie;if(!saved)return null;
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 let valid=saved.version===1&&integer(saved.contract,0,2)&&integer(saved.turn,1,10000)&&integer(saved.selected,0,2)&&['move','fire','strike'].includes(saved.action)&&['body','left','right','legs'].includes(saved.part)&&typeof saved.enemyPending==='boolean'&&Array.isArray(saved.units);
 if(valid){
  createBattle(saved.contract);valid=saved.units.length===battle.units.length;const occupiedTiles=new Set();
  for(let i=0;valid&&i<saved.units.length;i++){
   const state=saved.units[i],u=battle.units[i];valid=!!state&&integer(state.x,0,9)&&integer(state.z,0,9)&&(state.face===undefined||state.face===1||state.face===-1)&&!battle.cover.has(state.x+','+state.z)&&integer(state.ap,0,u.team==='ally'&&u.index===0?10:8)&&typeof state.brace==='boolean'&&typeof state.skill==='boolean'&&typeof state.boost==='boolean'&&state.hp&&['body','left','right','legs'].every(p=>integer(state.hp[p],0,u.max[p]));
   if(!valid)break;const key=state.x+','+state.z,alive=state.hp.body>0;if(alive&&occupiedTiles.has(key)){valid=false;break}if(alive)occupiedTiles.add(key);
   u.face=state.face??(u.team==='enemy'?1:-1);u.x=u.vx=state.x;u.z=u.vz=state.z;u.hp={body:state.hp.body,left:state.hp.left,right:state.hp.right,legs:state.hp.legs};u.ap=state.ap;u.brace=state.brace;u.skill=state.skill;u.boost=state.boost;u.alive=alive;
  }
  valid=valid&&battle.units.some(u=>u.team==='ally'&&u.alive)&&battle.units.some(u=>u.team==='enemy'&&u.alive);
 }
 if(!valid){battle=null;delete save.sortie;persist();return null}
 battle.turn=saved.turn;selected=saved.selected;if(!current())selected=battle.units.find(u=>u.team==='ally'&&u.alive).index;
 action=saved.action==='strike'&&!current()?.melee?'move':saved.action;targetPart=saved.part;effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;battle.log=['Sortie restored from the last completed action.'];
 return{enemyPending:saved.enemyPending};
}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function money(n){return n.toLocaleString()+' CR'}
function weapon(id){return WEAPONS.find(w=>w.id===id)||WEAPONS[0]}
function selectedWeapon(u,mode=action){return u&&(mode==='strike'?(u.melee?weapon(u.melee):null):weapon(u.weapon))}
function canUseWeapon(u,w){return Boolean(u&&w&&u.ap>=w.ap&&u.hp[w.melee?'left':'right']>0)}
function equipmentChoices(u,options){
 return options.map(w=>{
  const equipped=(w.melee?u.melee:u.weapon)===w.id;
  const owned=save.owned.includes(w.id)||equipped;
  const preview=arsenal.weapons?.[w.id]?.left?.key;
  return `<button data-equip="${w.id}" class="${equipped?'active':''}" aria-pressed="${equipped}"><small>${w.type}</small><h3>${w.name}</h3>${preview?`<img class="weapon-card-art" alt="" src="${art(preview)}" loading="lazy" decoding="async">`:''}<small>${w.damage} DMG / ${w.range} RANGE / ${w.ap} AP</small><p>${w.desc}</p><div class="note">${equipped?'EQUIPPED':owned?'EQUIP WEAPON':money(w.price)+' / BUY & EQUIP'}</div></button>`;
 }).join('');
}
function workshopPaint(u){
 return `<div class="paint-panel"><div class="eyebrow">CERAMIC PLATE PAINT</div><div class="paint-swatches">${PAINT_PRESETS.map(([name,color])=>`<button class="paint-swatch" data-paint="${color||''}" aria-pressed="${(u.paint||null)===color}" style="--swatch:${color||'#b0a88d'}"><span></span>${name}</button>`).join('')}<label class="paint-custom">Custom <input id="custom-paint" type="color" aria-label="Custom plate paint" value="${u.paint||'#c6bd9f'}"></label></div><p class="note">Paint is free and saved per chassis. Hostile units use red identification paint.</p></div>`;
}
let noiseBuffer=null;
function sound(type){
 if(muted)return;try{
  audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  const now=audio.currentTime;
  if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*.8,audio.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const boom=['boom','breaker','piledriver','rampart'].includes(type),step=type==='step',click=type==='click',rail=type==='rail',missile=type==='missile';
  const duration=boom?.55:step?.13:click?.04:rail?.35:missile?.4:.2;
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.setValueAtTime(boom?600:step?350:rail?3400:missile?1400:2200,now);filter.frequency.exponentialRampToValueAtTime(90,now+duration);gain.gain.setValueAtTime(click?.025:boom?.19:step?.075:.12,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start(now);source.stop(now+duration);
  if(boom||step||!click){const o=audio.createOscillator(),g=audio.createGain();o.type=rail?'sawtooth':'sine';o.frequency.setValueAtTime(boom?70:step?85:rail?260:100,now);o.frequency.exponentialRampToValueAtTime(boom?25:rail?80:40,now+duration);g.gain.setValueAtTime(boom?.17:step?.045:.075,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+duration)}
 }catch{}
}
$('#sound').onclick=()=>{muted=!muted;$('#sound').innerHTML=icon(muted?'speaker-slash':'speaker-high');$('#sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');sound('click')};
function icon(name){return `<img class="ui-icon" src="assets/icons/${name}.svg" alt="">`}
function art(name){return 'assets/'+name+'.webp'}
function pilotArt(i){return art('pilot-'+['rook','ghost','anchor'][i])}
const wardenVisuals=window.IRON_VOW_WARDEN_ART||{},arsenal=window.IRON_VOW_ARSENAL||{};
function wardenVisual(frame,loadout,direction){
 const face=direction===1?'right':'left';
 const modular=arsenal.chassis?.[frame]?.[face],legacy=frame===0?wardenVisuals[loadout]?.[face]:undefined;
 return failedArt.has(modular?.key)?legacy:modular||legacy;
}
function chassisArt(i,loadout,direction=-1){
 const visual=wardenVisual(i,loadout,direction);
 return art(visual&&imageReady(artImages[visual.key])?visual.key:FRAMES[i].name.toLowerCase());
}
function nav(){document.body.dataset.targetPanel=targetPanelOpen?'open':'closed';document.body.dataset.view=battle?'combat':page; $('#nav').innerHTML=['hangar','contracts','workshop','pilots','career'].map(p=>`<button data-page="${p}" class="${p===page?'active':''}" ${battle?'disabled':''}>${p.toUpperCase()}</button>`).join('');$('#credits').textContent=money(save.credits);$('#day').textContent='DAY '+String(save.day).padStart(3,'0');}
function stat(name,val,ratio){return `<div class="stat"><span>${name}</span><b>${val}</b></div>${ratio!==undefined?`<div class="bar"><i style="width:${ratio}%"></i></div>`:''}`}
function render(){
  nav(); $('#hangar-art').style.objectPosition=['28% center','62% center','95% center'][selected]; if(battle){renderBattle();return}
  const f=FRAMES[selected],u=save.units[selected],p=PILOTS[selected],w=weapon(u.weapon);
  if(page==='hangar'){
    const others=FRAMES.map((m,i)=>({m,i})).filter(v=>v.i!==selected);
    $('#ui').innerHTML=`<div class="hangar-status"><span class="status-dot"></span><span>HANGAR 04 / LANCE ONLINE</span><span>HALCYON · LOCAL TIME 19:42</span></div>
    <div class="hangar-top-right"><button class="icon" id="inspect">${icon('info')} UNIT DETAILS</button><button class="icon" id="hangar-manual">${icon('binoculars')} FIELD MANUAL</button></div>
    <div class="hangar-hotspots" aria-label="Select a mech in the hangar">${FRAMES.map((m,i)=>`<button data-select="${i}" aria-label="Select ${m.name}" aria-pressed="${i===selected}"><span>${m.name} / ${m.role}</span></button>`).join('')}</div>
    ${inspectOpen?`<aside class="unit-inspect"><div class="inspect-head"><span class="eyebrow">CHASSIS 0${selected+1} / ${f.model}</span><button id="close-inspect" class="icon" aria-label="Close unit details">${icon('x')}</button></div><h2>${f.name}</h2><p class="note">${f.role} · PILOT LEVEL ${u.level}</p><div class="rule"></div>${stat('BODY INTEGRITY',f.hp+u.upgrade*25+' HP')}${stat('ARMOR',f.armor+u.upgrade*2)}${stat('MOBILITY',f.move+' TILES')}${stat('WEAPON',w.name)}${stat('CONDITION',u.condition+'%',u.condition)}<div class="pilot"><img class="pilot-thumb" src="${pilotArt(selected)}" alt="${p.name}"><div>${p.name}<small>${p.call} / ${p.skill}</small></div></div><button class="full" data-page="workshop">${icon('wrench')} OPEN WORKSHOP</button><p class="note">${p.desc}</p></aside>`:''}
    ${!inspectOpen&&wardenVisual(0,'rifle',-1)?`<a class="hangar-rig-preview" href="rig-bench/"><img src="${art(wardenVisual(0,'rifle',-1).key)}" alt="" width="66" height="66"><span><strong>WARDEN MARK II</strong><small>VIEW RIG IN MOTION</small></span></a>`:''}
    <div class="command-deck"><div class="selected-chassis"><h1>${f.name}</h1><p>${p.name} / ${f.role} / ${u.condition>=90?'COMBAT READY':u.condition>=30?'OPERATIONAL':'REPAIR REQUIRED'}</p></div>${others.map(({m,i})=>`<button class="deck-unit" data-select="${i}" aria-label="Select ${m.name}"><h3>${m.name}</h3><small>${PILOTS[i].call} / ${m.role}</small></button>`).join('')}<button class="primary deck-cta" data-page="contracts">SELECT CONTRACT ${icon('arrow-right')}</button></div>
    <div class="hangar-footer"><span>INDEPENDENT COMPANY / DAY ${String(save.day).padStart(3,'0')}</span><span>${save.wins} CONTRACTS / ${save.rep} REPUTATION</span><span>CAREER SAVED LOCALLY</span></div>`;
  }
  if(page==='contracts')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">OPERATIONS / AVAILABLE CONTRACTS</div><h1>CHOOSE YOUR BATTLE.</h1></div><p>Three pilots. Three machines.<br>One company to bring home.</p></div><div class="grid">${CONTRACTS.map((c,i)=>`<article class="card"><div class="contract-map"><img src="${art('contract-'+['relay','corridor','frontier'][i])}" alt="${['Rain-soaked mountain relay station','Industrial refinery corridor at dusk','Storm-lit frontier military outpost'][i]}"><span class="contract-number">0${i+1}</span><span class="tag">THREAT ${i+1} / 3</span></div><div class="eyebrow">${c.place}</div><h2>${c.name}</h2><p>${c.desc}</p><div class="rule"></div>${stat('OPERATION',c.tag)}${stat('HOSTILE LANCE',c.enemies+' UNITS')}${stat('CONTRACT PAYMENT',money(c.pay))}<button class="primary full" data-deploy="${i}">ACCEPT & DEPLOY ${icon('arrow-right')}</button><p class="note">${i===0?'Recommended for a new company.':'Reinforced hostiles. Inspect your lance before deployment.'}</p></article>`).join('')}</div><p class="note">MOVE to highlighted ground. FIRE at an enemy subsystem. Spend AP, coordinate your lance, then end your turn.</p></div>`;
  if(page==='workshop')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">ENGINEERING / CHASSIS & LOADOUT</div><h1>BUILT TO ENDURE.</h1></div><p>Refit the machine.<br>Protect the pilot inside.</p></div>
  <div class="lance-tabs">${FRAMES.map((m,i)=>`<button data-select="${i}" class="${i===selected?'active':''}">${m.name}</button>`).join('')}</div>
  <div class="split"><section class="workshop-chassis"><div class="eyebrow">${f.model} / ${f.role} / MK ${u.upgrade+1}</div>
  ${arsenal.chassis?.[selected]?`<canvas class="unit-render" id="paint-preview" width="640" height="640" role="img" aria-label="${f.name} paint and loadout preview"></canvas>`:`<img class="unit-render" src="${chassisArt(selected,u.weapon)}" alt="${f.name} armored mech">`}
  <div class="workshop-meta"><h2>${f.name}</h2>${workshopPaint(u)}
  ${selected===0?'<a class="rig-bench-link" href="rig-bench/index.html">OPEN 3D RIG BENCH</a>':''}${stat('BODY / ARMOR',(f.hp+u.upgrade*25)+' HP / '+(f.armor+u.upgrade*2))}${stat('CONDITION',u.condition+'%',u.condition)}
  <div class="repairs"><button data-patch="${selected}" ${u.condition>=FIELD_PATCH?'disabled':''}>FIELD PATCH · FREE</button><button data-repair="${selected}" ${u.condition===100?'disabled':''}>REPAIR · ${money(repairCost(selected))}</button><button data-upgrade="${selected}" ${u.upgrade>=3?'disabled':''}>${u.upgrade>=3?'MAX REINFORCEMENT':'REINFORCE · '+money(1800+u.upgrade*1200)}</button></div><p class="note">Reinforcement adds 25 body HP and 2 armor. A free field patch restores a damaged chassis to ${FIELD_PATCH}% integrity.</p></div></section>
  <section><div class="eyebrow">LOADOUT / ${p.call}</div><h2 class="loadout-title">THE RIGHT TOOL.</h2><p class="note">Unlock weapons once for the company, then equip them on any chassis.</p>
  <h3 class="loadout-slot">PRIMARY / RANGED</h3><div class="equipment">${equipmentChoices(u,RANGED)}</div>
  <h3 class="loadout-slot">SECONDARY / MELEE</h3><p class="note">Strike uses the left arm against an adjacent hostile.</p><div class="equipment">${equipmentChoices(u,MELEE)}</div>
  ${u.melee?'<button class="remove-melee" id="remove-melee">UNEQUIP MELEE</button>':''}</section></div></div>`;
  if(page==='pilots')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">PERSONNEL / ACTIVE DUTY</div><h1>HUMAN AT THE CORE.</h1></div><p>Every pilot matters.<br>Each level adds 5% weapon damage.</p></div><div class="grid">${PILOTS.map((p,i)=>{const u=save.units[i];return `<article class="card pilot-card"><div class="pilot-image"><img src="${pilotArt(i)}" alt="Portrait of ${p.name}"></div><div class="pilot-details"><div class="eyebrow">${p.call} / ${FRAMES[i].name}</div><h2>${p.name}</h2>${stat('PILOT LEVEL',String(u.level).padStart(2,'0'))}${stat('EXPERIENCE',u.xp+' / '+(u.level*100),Math.min(100,100*u.xp/(u.level*100)))}<div class="pilot-skill">${icon(['lightning','crosshair','first-aid-kit'][i])}<h3>${p.skill}</h3></div><p>${p.desc}</p><div class="rule"></div><p>${['Former border guard. Holds the line when contracts turn ugly. The first to drop and the last to leave.','A reconnaissance specialist with a quiet reputation. Makes every shot count, especially the impossible ones.','Field engineer turned combat pilot. Keeps the company moving, one repaired reactor at a time.'][i]}</p></div></article>`}).join('')}</div></div>`;
  if(page==='career')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">COMPANY RECORD / ONGOING CAREER</div><h1>LEAVE A MARK.</h1></div><span class="rank">${save.rep>=100?'VETERAN COMPANY':save.rep>=30?'RECOGNIZED LANCE':'INDEPENDENT OUTFIT'}</span></div><div class="career-stats"><div><span class="eyebrow">COMPANY RESERVES</span><h2>${money(save.credits)}</h2><p>Reinvest in weapons, armor and the machines that bring your pilots home.</p></div><div><span class="eyebrow">FULFILLED CONTRACTS</span><h2>${String(save.wins).padStart(2,'0')}</h2><p>${save.kills} enemy machines neutralized. ${save.rep} reputation earned.</p></div><div><span class="eyebrow">DEPLOYMENT DAY</span><h2>${String(save.day).padStart(3,'0')}</h2><p>Progress saves in this browser. Export a backup to carry your company with you.</p></div></div><section class="history"><span class="eyebrow">AFTER-ACTION RECORD</span>${save.history.length?save.history.slice().reverse().map(h=>`<div class="history-row"><span>${h.name}<small>DAY ${String(h.day).padStart(3,'0')}</small></span><b>${h.win?'FULFILLED / +'+money(h.pay):'LANCE WITHDRAWN'}</b></div>`).join(''):'<p style="margin-top:24px">No sorties recorded. Your first contract is waiting.</p>'}<div class="settings"><button id="export">EXPORT CAREER</button><button id="import">IMPORT BACKUP</button><input hidden type="file" id="file" accept="application/json"><button id="reset">NEW CAREER</button><button id="guide">FIELD MANUAL</button></div></section></div>`;
  bind();
  if(page==='workshop')bindWorkshop();
  if(page==='hangar'){$('#inspect').onclick=()=>{inspectOpen=!inspectOpen;render()};$('#hangar-manual').onclick=guide;if(inspectOpen)$('#close-inspect').onclick=()=>{inspectOpen=false;render()}}
}
function repairCost(i){return Math.ceil((100-save.units[i].condition)*14)}
function bind(){document.querySelectorAll('[data-patch]').forEach(b=>b.onclick=()=>{save.units[selected].condition=Math.max(FIELD_PATCH,save.units[selected].condition);persist();render();toast('Emergency field patch applied. Full repairs recommended.')});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(!battle){page=b.dataset.page;render();sound('click')}});document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.select;render();sound('click')});document.querySelectorAll('[data-deploy]').forEach(b=>b.onclick=()=>deploy(+b.dataset.deploy));document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{let w=weapon(b.dataset.equip),u=save.units[selected];if(!save.owned.includes(w.id)&&(w.melee?u.melee:u.weapon)!==w.id){if(save.credits<w.price)return toast('Insufficient credits');save.credits-=w.price;save.owned.push(w.id)}u[w.melee?'melee':'weapon']=w.id;persist();render();toast(w.name+' equipped')});document.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{let cost=repairCost(selected);if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;save.units[selected].condition=100;persist();render();toast('Chassis restored to full integrity')});document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{let u=save.units[selected],cost=1800+u.upgrade*1200;if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;u.upgrade++;persist();render();toast('Chassis reinforcement installed')});if($('#export')){$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iron-vow-career.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{let n=JSON.parse(await e.target.files[0].text());if(!validSave(n))throw Error();save=n;persist();render();toast('Career backup restored')}catch{toast('Invalid career backup')}};$('#reset').onclick=()=>modal('NEW CAREER?','This replaces your company progress in this browser. Export a backup first if you want to keep it.',[{text:'KEEP MY CAREER',fn:closeModal},{text:'START FRESH',fn:()=>{save=fresh();persist();closeModal();render()}}]);$('#guide').onclick=guide}}
function validSave(s){return s&&s.version===1&&Number.isFinite(s.credits)&&s.credits>=0&&Number.isInteger(s.day)&&s.day>0&&Number.isFinite(s.rep)&&Number.isFinite(s.wins)&&Number.isFinite(s.kills)&&Array.isArray(s.owned)&&s.owned.every(x=>WEAPONS.some(w=>w.id===x))&&Array.isArray(s.history)&&s.history.length<=500&&s.history.every(h=>typeof h.name==='string'&&CONTRACTS.some(c=>c.name===h.name)&&Number.isFinite(h.day)&&typeof h.win==='boolean'&&Number.isFinite(h.pay))&&Array.isArray(s.units)&&s.units.length===3&&s.units.every(u=>u&&RANGED.some(w=>w.id===u.weapon)&&(u.melee==null||MELEE.some(w=>w.id===u.melee))&&(u.paint==null||validPaint(u.paint))&&Number.isSafeInteger(u.level)&&u.level>0&&u.level<10000&&Number.isFinite(u.xp)&&u.xp>=0&&Number.isFinite(u.condition)&&u.condition>=0&&u.condition<=100&&Number.isInteger(u.upgrade)&&u.upgrade>=0&&u.upgrade<=3)}
function modal(title,body,buttons){if($('#modal').hidden)modalReturnFocus=document.activeElement;$('#modal').hidden=false;$('#modal').innerHTML=`<div class="modalbox" role="dialog" aria-modal="true" aria-label="${title}"><div class="eyebrow">IRON VOW / COMMAND UPLINK</div><h1>${title}</h1><div>${body}</div><div class="buttons">${buttons.map((b,i)=>`<button class="${i===buttons.length-1?'primary':''}" id="modal-${i}">${b.text}</button>`).join('')}</div></div>`;buttons.forEach((b,i)=>$('#modal-'+i).onclick=b.fn);$('#modal button').focus()}
function closeModal(){$('#modal').hidden=true;if(modalReturnFocus?.isConnected)modalReturnFocus.focus();modalReturnFocus=null}
function guide(){modal('FIELD MANUAL',`<p>Your objective is to neutralize every enemy. All three pilots act during your turn. Select a unit from the bottom bar or click its mech.</p><p><b>MOVE:</b> Click a blue tile. Movement costs one AP per tile, following a path around cover. Each pilot starts with 8 AP.</p><p><b>STRIKE (X):</b> Equip a melee weapon in the Workshop, then strike an adjacent hostile. Melee uses the left arm and has its own AP cost.</p><p><b>FIRE:</b> Select a target part on the right, then click an enemy in the red range overlay. A firing preview shows damage and accuracy. Body destruction disables a mech. Destroying its right arm disables ranged fire. Destroying its legs stops movement. Losing the shield arm halves armor.</p><p><b>SKILL:</b> Each pilot can activate their unique skill once per battle. <b>BRACE:</b> Spend 2 AP to halve incoming damage until your next turn.</p><p>Raised terrain blocks movement. The small shield on a blue tile means moving there gives cover from most ranged attacks. Missiles ignore cover. End your turn when you have used your AP. Enemies then move and attack. Withdraw if you need to preserve your machines.</p><p>Complete contracts to earn credits, experience, reputation and salvage. Repair damaged chassis in the workshop before your next sortie. Career progress and completed combat actions save in this browser. Reloading resumes the sortie. If an enemy turn was interrupted, it replays from its start.</p>`,[{text:'UNDERSTOOD',fn:closeModal}])}
// Tactical simulation: part HP, reachable tiles, AP, cover, level scaling and persistent rewards.
function makeUnit(i,team,x,z){let f=FRAMES[i%3],u=team==='ally'?save.units[i]:{upgrade:Math.max(0,battle.contract.difficulty-1),condition:100,level:battle.contract.difficulty,weapon:i%3===2?'missile':i%3===1?'shotgun':'rifle'};let k=team==='ally'?Math.max(.3,u.condition/100):1;let max={body:f.hp+u.upgrade*25,left:f.arm,right:f.arm,legs:f.leg};return{id:team+i,index:i,team,x,z,vx:x,vz:z,frame:i%3,name:team==='ally'?f.name:['JACKAL','RAVEN','MARAUDER'][i%3]+' '+(i+1),weapon:u.weapon,melee:u.melee??null,paint:team==='enemy'?HOSTILE_PAINT:u.paint??null,level:u.level,armor:f.armor+u.upgrade*2,max,hp:Object.fromEntries(Object.entries(max).map(([a,b])=>[a,Math.round(b*k)])),ap:8,brace:false,skill:false,boost:false,alive:true}}
function deploy(i){
 if(save.units.some(u=>u.condition<30)){
  modal('REPAIR REQUIRED','<p>One or more chassis have less than 30% integrity. Repair them in the workshop before deploying.</p>',[{text:'OPEN WORKSHOP',fn:()=>{closeModal();page='workshop';selected=save.units.findIndex(u=>u.condition<30);render()}}]);return;
 }
 createBattle(i);selected=0;action='move';targetPart='body';effects=[];hover=null;lockedTarget=null;combatCamera=null;cameraBlend=0;viewZoom=1;targetPanelOpen=false;
 persist();render();sound('click');if(save.history.length===0)guide();
}
function current(){return battle?.units.find(u=>u.team==='ally'&&u.index===selected&&u.alive)}
function occupied(x,z){return battle.units.some(u=>u.alive&&u.x===x&&u.z===z)}
function paths(u){let max=Math.min(u.ap,u.hp.legs>0?FRAMES[u.frame].move:0),m=new Map([[u.x+','+u.z,0]]),queue=[[u.x,u.z]];for(let k=0;k<queue.length;k++){let [x,z]=queue[k],d=m.get(x+','+z);if(d>=max)continue;for(let [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){let a=x+dx,b=z+dz,key=a+','+b;if(a<0||b<0||a>9||b>9||m.has(key)||battle.cover.has(key)||occupied(a,b))continue;m.set(key,d+1);queue.push([a,b])}}return m}
function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)}
function inCover(t){return [[1,0],[-1,0],[0,1],[0,-1]].some(([x,z])=>battle.cover.has((t.x+x)+','+(t.z+z)))}
function hitChance(a,t,part,w=weapon(a.weapon)){return Math.min(.98,Math.max(.5,.96-(part==='body'?0:.13)-(inCover(t)&&w.id!=='missile'&&!w.melee?.19:0)+.015*(a.level-1)))}
function damage(a,t,w=weapon(a.weapon)){const armor=t.hp.left===0?Math.floor(t.armor/2):t.armor;return Math.max(5,Math.round((w.damage*(1+.05*(a.level-1))*(a.boost?1.5:1)-armor*(w.id==='piledriver'?.25:1))*(t.brace?.5:1)))}
function addLog(s){battle.log.push(s);battle.log=battle.log.slice(-4)}
function renderBattle(){
  nav();const u=current(),under=hover&&battle.units.find(t=>t.alive&&t.team==='enemy'&&t.x===hover.x&&t.z===hover.z),target=under||battle.units.find(t=>t.alive&&t.id===lockedTarget)||battle.units.find(t=>t.alive&&t.team==='enemy');
  const ready=battle.phase==='player'&&!battle.busy,canFire=canUseWeapon(u,selectedWeapon(u,'fire')),canStrike=canUseWeapon(u,selectedWeapon(u,'strike')),chosen=selectedWeapon(u)||selectedWeapon(u,'fire');
  $('#ui').innerHTML=`<div class="battle-top"><span class="eyebrow">${battle.contract.tag}</span><h2>${battle.contract.name}</h2><p class="field-terrain">${battle.field.label}</p><p>Eliminate the hostile lance.<br>${battle.units.filter(t=>t.team==='enemy'&&t.alive).length} hostile signatures remaining</p><div style="display:flex;gap:16px;margin-top:10px"><button class="icon" id="manual" ${battle.busy?'disabled':''}>MANUAL</button><button class="icon" id="withdraw" ${battle.busy?'disabled':''}>WITHDRAW</button></div></div>
  <div class="turn">ROUND ${String(battle.turn).padStart(2,'0')}<small>${battle.phase==='player'?'YOUR LANCE / TAKE COMMAND':'HOSTILE LANCE / STAND BY'}</small></div>
  <button class="target-toggle" id="target-toggle" aria-expanded="${targetPanelOpen}" aria-controls="target-panel">${icon('crosshair')}<span><strong>${target?.name||'NO TARGET'}</strong><small>SUBSYSTEM DETAILS</small></span></button><aside class="combatpanel" id="target-panel" aria-label="Target subsystem details"><div class="inspect-head"><span class="eyebrow">HOSTILE / TARGET SUBSYSTEM</span><button class="icon close-target" id="close-target" aria-label="Close target details">${icon('x')}</button></div><h3>${target?.name||'AREA SECURED'}</h3>${target?`<div class="combat-target"><img class="enemy" data-visual-key="${wardenVisual(target.frame,target.weapon,unitFacing(target))?.key??''}" src="${chassisArt(target.frame,target.weapon,unitFacing(target))}" alt="Target ${target.name}"></div>`:''}<div class="parts">${['body','right','left','legs'].map(p=>`<button data-part="${p}" class="${p===targetPart?'active':''}" style="--part-hp:${target?100*target.hp[p]/target.max[p]:0}%" aria-pressed="${p===targetPart}"><span>${({body:'BODY',right:'WEAPON ARM',left:'SHIELD ARM',legs:'LEGS'})[p]}</span><b>${target?target.hp[p]+'/'+target.max[p]:'—'}</b></button>`).join('')}</div><div class="note">${target&&u?`${Math.round(hitChance(u,target,targetPart,chosen)*100)}% HIT / ${damage(u,target,chosen)} DMG<br>${distance(u,target)<=chosen.range?'IN WEAPON RANGE':'OUT OF RANGE'}${inCover(target)&&!chosen.melee?' / IN COVER':''}`:'SELECT A HOSTILE TO INSPECT'}<br>DESTROY BODY TO NEUTRALIZE</div>${u?`<div class="combat-selected"><span class="eyebrow">${PILOTS[u.index].call} / ${u.ap} AP</span><p style="margin-top:7px"><b>${chosen.name}</b><br>${PILOTS[u.index].skill}: ${u.skill?'USED':PILOTS[u.index].desc}</p></div>`:''}</aside>
  <div class="log">${battle.log.map(l=>'<div class="log-line">'+l+'</div>').join('')}</div><div class="hint">${battle.busy?'RESOLVING COMBAT':action==='move'?'MOVE / SELECT HIGHLIGHTED GROUND / 1 AP PER TILE':(action==='strike'?'STRIKE / ADJACENT HOSTILE / ':'FIRE / SELECT HOSTILE / ')+(chosen?.ap??3)+' AP PER ATTACK'}</div>
  <div class="battle-bottom"><div class="unitbuttons">${battle.units.filter(t=>t.team==='ally').map(t=>`<button data-unit="${t.index}" class="${t.index===selected?'active':''}" ${!t.alive||battle.busy?'disabled':''}><img src="${pilotArt(t.index)}" alt="${PILOTS[t.index].call}"><span><b>${t.name}</b><small>${t.alive?t.ap+' AP / '+t.hp.body+' HP':'DISABLED'}</small></span></button>`).join('')}</div><div class="actionbuttons"><button id="move" class="${action==='move'?'active':''}" ${!u||!ready?'disabled':''}>${icon('arrows-out-cardinal')}<span>MOVE <span class="key-hint">M</span></span></button><button id="fire" class="${action==='fire'?'active':''}" ${!u||!ready||!canFire?'disabled':''}>${icon('crosshair')}<span>FIRE <span class="key-hint">F</span></span></button><button id="strike" class="${action==='strike'?'active':''}" ${!ready||!canStrike?'disabled':''}>${icon('crosshair')}<span>STRIKE <span class="key-hint">X</span></span></button><button id="skill" title="${u?PILOTS[u.index].desc:''}" ${!u||u.skill||!ready||(u.index===2&&u.hp.body===u.max.body)?'disabled':''}>${icon('lightning')}<span>${u?['OVERDRIVE','DEADEYE','REPAIR'][u.index]:'SKILL'} <span class="key-hint">Q</span></span></button><button id="brace" title="Brace: 2 AP, halves incoming damage" ${!u||u.ap<2||u.brace||!ready?'disabled':''}>${icon('shield-chevron')}<span>BRACE <span class="key-hint">/ 2 AP</span></span></button><button id="end" class="primary" ${battle.busy?'disabled':''}>END TURN</button></div></div>`;
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{if(!battle.busy){selected=+b.dataset.unit;if(action==='strike'&&!current()?.melee)action='move';renderBattle();persist()}});
  document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{targetPart=b.dataset.part;if(W<760)targetPanelOpen=false;renderBattle();persist()});
  $('#move').onclick=()=>{action='move';renderBattle();persist()};$('#fire').onclick=()=>{action='fire';renderBattle();persist()};$('#strike').onclick=()=>{if(canStrike){action='strike';renderBattle();persist()}};$('#skill').onclick=skill;
  $('#brace').onclick=()=>{if(u&&u.ap>=2&&!u.brace&&!battle.busy){u.ap-=2;u.brace=true;u.braceTime=clock;addLog(u.name+' braced for incoming fire.');renderBattle();persist()}};
  $('#end').onclick=endTurn;$('#manual').onclick=guide;$('#target-toggle').onclick=()=>{targetPanelOpen=!targetPanelOpen;renderBattle();if(targetPanelOpen)$('#close-target').focus()};$('#close-target').onclick=()=>{targetPanelOpen=false;renderBattle();$('#target-toggle').focus()};
  $('#withdraw').onclick=()=>{if(battle.busy)return;modal('BREAK CONTACT?','<p>Withdraw your lance. You retain earned experience, but forfeit payment and salvage. Combat damage persists.</p>',[{text:'STAY & FIGHT',fn:closeModal},{text:'WITHDRAW',fn:()=>{closeModal();finish(false)}}])};
}
function skill(){
 const u=current();if(!u||u.skill||battle.busy)return;
 if(u.index===2&&u.hp.body===u.max.body){toast('Body integrity is already full. Keep this repair for later.');return}
 u.skill=true;u.skillTime=clock;effects.push({type:'skill',kind:u.index,x:u.x,z:u.z,t:1});if(u.index===0)u.ap+=2;if(u.index===1)u.boost=true;
 if(u.index===2){const restored=Math.min(45,u.max.body-u.hp.body);u.hp.body+=restored;effects.push({type:'heal',x:u.x,z:u.z,t:1,text:'+'+restored+' REPAIR'})}
 addLog(PILOTS[u.index].call+' activated '+PILOTS[u.index].skill+'.');sound('click');renderBattle();persist();
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function route(u,x,z){
 const m=paths(u),end=x+','+z;if(!m.has(end))return[];let path=[],a=x,b=z;
 while(a!==u.x||b!==u.z){path.unshift({x:a,z:b});let prev=[[a+1,b],[a-1,b],[a,b+1],[a,b-1]].find(([q,r])=>m.get(q+','+r)===m.get(a+','+b)-1);if(!prev)return[];[a,b]=prev}return path;
}
async function moveUnit(u,x,z,cost){
 const steps=route(u,x,z);if(!steps.length)return;u.ap-=steps.length;
 const duration=reducedMotion?.12:MECH_MOTION[u.frame].step,gaitBase=u.walkCount||0;
 for(let i=0;i<steps.length;i++){
  const p=steps[i],fromX=u.x,fromZ=u.z;u.face=Math.sign((p.x-fromX)-(p.z-fromZ))||u.face||-1;
  u.x=p.x;u.z=p.z;u.motion={fromX,fromZ,toX:p.x,toZ:p.z,start:clock,duration,gaitBase:gaitBase+i,stepIndex:i,totalSteps:steps.length};
  await delay(duration*1000);u.vx=p.x;u.vz=p.z;u.motion=null;u.landTime=clock;
  effects.push({type:'step',x:p.x,z:p.z,t:1,mass:MECH_MOTION[u.frame].mass,side:(gaitBase+i)%2?1:-1});sound('step');
  if(!reducedMotion&&u.frame===2)shake=Math.max(shake,.85);
 }
 u.walkCount=gaitBase+steps.length;
}
async function shoot(a,t,part,w=weapon(a.weapon)){
 const profile=ATTACK_PROFILES[w.id];a.ap-=w.ap;a.face=Math.sign((t.x-t.z)-(a.x-a.z))||a.face||-1;
 a.attack={kind:w.id,start:clock,fireAt:null,releaseAt:null};
 if(!reducedMotion)combatCamera={x:(a.x+t.x)/2,z:(a.z+t.z)/2,span:distance(a,t),until:clock+profile.raise+profile.beats.at(-1)+profile.travel+profile.recover+.15};
 await delay(reducedMotion?60:profile.raise*1000);
 a.fireTime=clock;a.attack.fireAt=clock;
 const flight=profile.beats.at(-1)+profile.travel;
 effects.push({type:'shot',actor:a.id,target:t.id,part,kind:w.id,x:a.x,z:a.z,tx:t.x,tz:t.z,t:1,born:clock,life:flight+.12,origins:[],impact:freezeAttachment(t,part)});sound(w.id);
 await delay(flight*1000);
 a.attack.releaseAt=clock;
 if(Math.random()>hitChance(a,t,part,w)){effects.push({type:'text',x:t.x,z:t.z,t:1,text:'MISS'});addLog(a.name+' missed '+t.name+'.')}
 else{
  const d=damage(a,t,w);t.hitTime=clock;t.hitPart=part;t.hitDamage=d;const hitX=(t.x-t.z)-(a.x-a.z),hitY=((t.x+t.z)-(a.x+a.z))*.5,hitLength=Math.hypot(hitX,hitY)||1;
  t.hitVector={x:hitX/hitLength,y:hitY/hitLength};shake=Math.max(shake,w.id==='rail'||w.id==='breaker'?7:4);t.hp[part]=Math.max(0,t.hp[part]-d);
  effects.push({type:'boom',target:t.id,part,x:t.x,z:t.z,t:1,big:false});effects.push({type:'text',x:t.x,z:t.z,t:1,text:'−'+d+' '+part.toUpperCase()});addLog(a.name+' → '+t.name+' / '+part+' −'+d);sound('boom');
  if(t.hp.body<=0){beginDestruction(t);addLog(t.name+' neutralized.');if(a.team==='ally'){save.kills++;save.units[a.index].xp+=35}}
  else if(t.hp[part]===0)addLog(t.name+': '+part+' destroyed.');
 }
 a.boost=false;await delay(t.alive?profile.recover*1000:reducedMotion?350:DESTRUCTION.end*1000);a.attack=null;
}
function checkEnd(){if(!battle)return true;if(!battle.units.some(u=>u.alive&&u.team==='enemy')){finish(true);return true}if(!battle.units.some(u=>u.alive&&u.team==='ally')){finish(false);return true}return false}
async function endTurn(){if(!battle||battle.busy)return;persist(true);targetPanelOpen=false;battle.busy=true;battle.phase='enemy';battle.units.filter(u=>u.team==='enemy'&&u.alive).forEach(u=>{u.ap=8;u.brace=false});renderBattle();for(let e of battle.units.filter(u=>u.team==='enemy'&&u.alive)){let allies=battle.units.filter(u=>u.team==='ally'&&u.alive);if(!allies.length)break;let t=allies.sort((a,b)=>distance(e,a)-distance(e,b))[0],w=weapon(e.weapon);if(distance(e,t)>w.range&&e.hp.legs>0){let possible=[...paths(e)].filter(([key,cost])=>cost<=8-w.ap).map(([key,cost])=>{let [x,z]=key.split(',').map(Number);return{x,z,cost,d:Math.abs(t.x-x)+Math.abs(t.z-z)}}).sort((a,b)=>a.d-b.d);if(possible[0]&&possible[0].d<distance(e,t))await moveUnit(e,possible[0].x,possible[0].z,possible[0].cost)}while(e.ap>=w.ap&&e.hp.right>0&&distance(e,t)<=w.range&&t.alive){await shoot(e,t,'body');renderBattle();if(checkEnd())return}if(e.hp.right===0)addLog(e.name+' cannot fire: weapon arm destroyed.');await delay(200)}if(checkEnd())return;battle.turn++;battle.phase='player';battle.busy=false;battle.units.filter(u=>u.team==='ally'&&u.alive).forEach(u=>{u.ap=8;u.brace=false});if(!current())selected=battle.units.find(u=>u.alive&&u.team==='ally').index;addLog('Round '+battle.turn+'. Your lance has the initiative.');renderBattle();persist()}
function finish(win){let b=battle,c=b.contract;let salvage=win?450+c.difficulty*200:0,pay=win?c.pay+salvage:0;save.credits+=pay;save.rep+=win?c.difficulty*10:0;if(win)save.wins++;b.units.filter(u=>u.team==='ally').forEach(u=>{let s=save.units[u.index];s.condition=Math.max(12,Math.round(100*(u.hp.body+u.hp.right+u.hp.left+u.hp.legs)/(u.max.body+u.max.right+u.max.left+u.max.legs)));s.xp+=win?70:20;while(s.xp>=s.level*100){s.xp-=s.level*100;s.level++}});save.history.push({name:c.name,day:save.day,win,pay});save.history=save.history.slice(-100);save.day++;battle=null;persist();page='career';render();modal(win?'CONTRACT FULFILLED.':'LANCE EXTRACTED.',`<p>${win?'The field is yours. Your pilots return with hard-earned experience and recovered enemy components.':'Your pilots have been recovered. The machines need work. There will be another contract.'}</p>${stat('CONTRACT PAYMENT',money(win?c.pay:0))}${stat('SALVAGE SOLD',money(salvage))}${stat('REPUTATION',win?'+'+c.difficulty*10:'UNCHANGED')}<p class="note">Damage persists. Visit the workshop to restore your lance.</p>`,[{text:'COMPANY RECORD',fn:closeModal},{text:'REPAIR & REFIT',fn:()=>{closeModal();page='workshop';render()}}])}
// Pre-rendered 2.5D battlefield: original raster art, depth ordering and live game effects.
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),scale=50,origin={x:0,y:0},shake=0,combatCamera=null,cameraBlend=0,viewZoom=1,frameDt=1/60;
const decodedArt=new Set(),failedArt=new Set(),artImages={},artMasks={},enemyArt={},reducedMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const legacyChassis=FRAMES.map(frame=>frame.name.toLowerCase());
const bakedChassis=[...Object.values(wardenVisuals),...(arsenal.chassis||[])].flatMap(views=>Object.values(views).map(view=>view.key));
const mechArtKeys=new Set([...legacyChassis,...bakedChassis]);
for(const key of [...mechArtKeys,'concrete','barricade','contract-relay','contract-corridor','contract-frontier','warden-base','kestrel-base','basilisk-base']){
 const im=new Image();im.decoding='async';artImages[key]=im;
 im.onload=()=>{
  decodedArt.add(key);
  if(mechArtKeys.has(key)&&typeof OffscreenCanvas==='function'){
   try{
    const mask=new OffscreenCanvas(128,128),g=mask.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0,128,128);artMasks[key]=g.getImageData(0,0,128,128);
    const tint=new OffscreenCanvas(384,384),tg=tint.getContext('2d');
    tg.filter=HOSTILE_FILTER;tg.drawImage(im,0,0,384,384);enemyArt[key]=tint;
   }catch{}
  }
  for(let frame=0;frame<3;frame++)buildRigidParts(frame);
  if(battle){
   const target=$('.combat-target img');
   if(target?.dataset.visualKey===key)target.src=art(key);
  }else if(page==='workshop'&&wardenVisual(selected,save.units[selected].weapon,-1)?.key===key){
   const preview=$('.unit-render');if(preview?.tagName==='IMG')preview.src=art(key);else drawWorkshopPreview();
  }else if(page==='workshop'&&key===legacyChassis[selected])drawWorkshopPreview();
 };
 im.onerror=()=>{failedArt.add(key);console.warn('Unable to load game artwork:',key);if(!bakedChassis.includes(key))toast('Artwork could not load. Refresh to retry.')};im.src=art(key);
}
function imageReady(im){return im&&im.complete&&im.naturalWidth>0}
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'}
window.addEventListener('resize',resize);resize();
function project(x,y,z){return{x:origin.x+(x-z)*scale*.866,y:origin.y+(x+z)*scale*.42-y*scale}}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke()}}
function tile(x,z,color,stroke,y=0){polygon([[x-.5,y,z-.5],[x+.5,y,z-.5],[x+.5,y,z+.5],[x-.5,y,z+.5]].map(p=>project(...p)),color,stroke)}
function coverImage(im,x,y,w,h){const r=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*r,ih=im.naturalHeight*r;ctx.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
function background(){ctx.clearRect(0,0,W,H);if(battle){ctx.fillStyle='#141f29';ctx.fillRect(0,0,W,H);const im=artImages['contract-'+['relay','corridor','frontier'][CONTRACTS.indexOf(battle.contract)]];if(imageReady(im)){ctx.save();ctx.globalAlpha=.22;coverImage(im,0,0,W,H);ctx.restore()}ctx.fillStyle='#101c2877';ctx.fillRect(0,0,W,H)}}
function rain(t,combat=false){if(reducedMotion)return;ctx.save();ctx.strokeStyle=combat?'#b9d3e316':'#d1e0e323';ctx.lineWidth=.7;ctx.beginPath();const count=W<760?35:90;for(let i=0;i<count;i++){const x=(i*191.33+t*22)%(W+40)-20,y=(i*103.7+t*(145+i%5*15))%H;if(!combat&&x<W*.46)continue;ctx.moveTo(x,y);ctx.lineTo(x-2,y+13)}ctx.stroke();ctx.restore()}
function fieldAtmosphere(t,field){
 if(reducedMotion)return;
 if(field.ground==='relay'){rain(t,true);return}
 ctx.save();
 if(field.ground==='frontier'){
  ctx.fillStyle='#d0e3e44d';ctx.beginPath();
  for(let i=0;i<(W<760?22:48);i++){
   const x=(i*113.7+t*(10+i%4*3))%(W+12)-6,y=(i*71.9+t*(21+i%5*8))%(H+12)-6,r=.55+i%4*.22;
   ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);
  }
  ctx.fill();
 }else{
  ctx.strokeStyle='#e7ad6539';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<18;i++){
   const x=(i*173.8+t*(12+i%3*8))%W,y=H-(i*97.5+t*(35+i%5*15))%H;
   ctx.moveTo(x,y);ctx.lineTo(x+3,y-5);
  }
  ctx.stroke();
 }
 ctx.restore();
}
function hangar(t){rain(t);}
function drawTerrain(field){
 const ground=moduleImage('ground-'+field.ground);
 const image=imageReady(ground)?ground:artImages.concrete;
 const floor=(x,z)=>project(x,0,z);
 const area=(x1,z1,x2,z2)=>[floor(x1,z1),floor(x2,z1),floor(x2,z2),floor(x1,z2)];
 if(imageReady(image)){
  const anchor=floor(-3.5,-3.5),step=16*scale/image.naturalWidth;
  ctx.save();ctx.translate(anchor.x,anchor.y);
  ctx.transform(step*.866,step*.42,-step*.866,step*.42,0,0);
  ctx.drawImage(image,0,0);ctx.restore();
 }else polygon(area(-3.5,-3.5,12.5,12.5),'#293943');
 ctx.beginPath();
 for(let i=.5;i<9.5;i++){
  const a=floor(i,-.5),b=floor(i,9.5),c=floor(-.5,i),d=floor(9.5,i);
  ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);
 }
 ctx.lineWidth=.6;ctx.strokeStyle=field.grid;ctx.stroke();
 polygon(area(-.5,-.5,9.5,9.5),null,field.border);
}
function drawCoverMarker(x,z){
 const p=project(x,0,z),r=Math.max(2,scale*.070),y=p.y+scale*.13;
 polygon([{x:p.x-r,y:y-r*.62},{x:p.x+r,y:y-r*.62},{x:p.x+r*.76,y:y+r*.38},
  {x:p.x,y:y+r},{x:p.x-r*.76,y:y+r*.38}],'#12292bc9','#9fcdbece');
}
function unitFacing(u){return u.face??(u.team==='enemy'?1:-1)}
function activeWardenVisual(u){
 const visual=wardenVisual(u.frame,u.weapon,unitFacing(u));
 return visual&&imageReady(artImages[visual.key])?visual:undefined;
}
function spriteFlip(u,visual=activeWardenVisual(u)){return !visual&&unitFacing(u)!==(u.frame===1?1:-1)}
const motionImages={};
function wardenMotionFrame(u,visual,pose){
 const atlas=visual?.motion;
 if(!atlas||reducedMotion)return;
 let image=motionImages[atlas.key];
 if(!image){
  image=motionImages[atlas.key]=new Image();
  image.decoding='async';
  image.src=art(atlas.key);
 }
 if(!imageReady(image))return;
 let frame;
 if(!u.alive&&atlas.death?.length){
  frame=atlas.death.reduce((best,f)=>Math.abs(f.level-pose.kneel)<Math.abs(best.level-pose.kneel)?f:best);
 }else if(pose.strikeKind&&atlas[pose.strikeKind]?.length){
  frame=atlas[pose.strikeKind].reduce((best,f)=>Math.abs(f.level-pose.strikeProgress)<Math.abs(best.level-pose.strikeProgress)?f:best);
 }else if(pose.walk>.12){
  const cycle=((pose.cycle%2)+2)%2;
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(cycle*atlas.gait.length/2))];
 }else{
  const kick=pose.recoil*(u.weapon==='rail'?1.35:.8)*(1-pose.brace*.4);
  if(kick>.11)frame=atlas.kick.reduce((best,f)=>Math.abs(f.level-kick)<Math.abs(best.level-kick)?f:best);
  else if(pose.aim>.12&&atlas.aim?.length)frame=atlas.aim.reduce((best,f)=>Math.abs(f.level-pose.aim)<Math.abs(best.level-pose.aim)?f:best);
 }
 return {atlas,image,frame};
}
function remainingPose(pose,baked){
 return baked?.frame?{...pose,walk:0,recoil:0}:pose;
}
function unitBounds(u,visual=activeWardenVisual(u)){const p=project(u.vx,0,u.vz),size=scale*([2.18,2.1,2.35][u.frame])*(visual?.scale??1);return{x:p.x-size*(visual?.groundX??.5),y:p.y-size*(visual?.ground??.94),w:size,h:size}}
// A small skinned mesh articulates the existing armor art without new image requests.
const MECH_MOTION=[
 {step:.31,hip:.59,split:.52,foot:[.96,.98],mass:1,muzzle:[.075,.565]},
 {step:.25,hip:.51,split:.51,foot:[.94,.98],mass:.65,muzzle:[.625,.43]},
 {step:.38,hip:.57,split:.60,foot:[.98,.87],mass:1.45,muzzle:[.25,.49]}
];
const clamp01=v=>Math.max(0,Math.min(1,v));
function smoothRange(a,b,v){const p=clamp01((v-a)/(b-a));return p*p*(3-2*p)}
function dampedImpulse(age,frequency=35,decay=15){return age>=0&&age<.8?Math.sin(age*frequency)*Math.exp(-age*decay):0}
const ATTACK_PROFILES={
 rifle:{raise:.23,beats:[0,.09,.18],travel:.10,recover:.34},
 shotgun:{raise:.28,beats:[0],travel:.12,recover:.43},
 rail:{raise:.39,beats:[0],travel:.075,recover:.47},
 missile:{raise:.35,beats:[0,.17],travel:.42,recover:.39},
 hailstorm:{raise:.36,beats:[0,.06,.12,.18,.24,.30,.36],travel:.09,recover:.39},
 rampart:{raise:.31,beats:[0],travel:.13,recover:.48},
 breaker:{raise:.47,beats:[0],travel:.19,recover:.51,melee:true},
 cleaver:{raise:.21,beats:[0],travel:.16,recover:.30,melee:true},
 piledriver:{raise:.32,beats:[0],travel:.18,recover:.39,melee:true}
};
const DESTRUCTION={kneelEnd:.56,fallEnd:.92,blast:1.05,end:1.92};
const UPPER_RIG=[
 {grip:[.59,.435],weapon:[[.035,.515],[.75,.305],[.85,.40],[.60,.49],[.56,.61],[.43,.59],[.43,.52],[.11,.625]],
 arms:[[[.31,.29],[.27,.40],[.355,.475],.068],[[.79,.28],[.815,.445],[.60,.445],.080]],
 pads:[[.30,.19,.17,.115],[.775,.20,.155,.125]],legs:[[[.42,.595],[.345,.775],[.285,.965]],[[.69,.59],[.70,.79],[.735,.98]]]},
 {grip:[.44,.385],weapon:[[.30,.315],[.675,.39],[.665,.48],[.52,.465],[.485,.53],[.405,.51],[.405,.445],[.285,.41]],
 arms:[[[.35,.255],[.30,.35],[.405,.39],.052],[[.665,.275],[.69,.405],[.52,.425],.055]],
 pads:[[.32,.235,.105,.12],[.66,.245,.11,.115]],legs:[[[.43,.51],[.36,.72],[.30,.94]],[[.62,.51],[.665,.755],[.70,.98]]]},
 {grip:[.40,.45],weapon:[],arms:[[[.265,.295],[.235,.43],[.27,.535],.075],[[.755,.30],[.80,.42],[.83,.52],.072]],
 pads:[[.335,.15,.20,.145],[.755,.16,.20,.14]],legs:[[[.475,.57],[.385,.75],[.42,.98]],[[.71,.575],[.70,.735],[.775,.875]]]}
];
const dist2=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function rotatePoint(v,pivot,angle){const x=v.x-pivot[0],y=v.y-pivot[1],c=Math.cos(angle),s=Math.sin(angle);return{x:pivot[0]+x*c-y*s,y:pivot[1]+x*s+y*c}}
function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],q=clamp01(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));return Math.hypot(x-a[0]-q*dx,y-a[1]-q*dy)}
function capsuleWeight(x,y,a,b,r){return 1-smoothRange(r*.72,r,segmentDistance(x,y,a,b))}
function polygonWeight(x,y,points){
 if(!points.length)return 0;let inside=false,edge=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  edge=Math.min(edge,segmentDistance(x,y,a,b));
 }
 return inside?1:1-smoothRange(0,.018,edge);
}
function solveJoint(chain,newHip,newFoot){
 const[h,k,f]=chain,l1=dist2(h,k),l2=dist2(k,f),dx=newFoot[0]-newHip[0],dy=newFoot[1]-newHip[1],raw=Math.hypot(dx,dy)||1;
 const d=Math.max(Math.abs(l1-l2)+.0001,Math.min(l1+l2-.0001,raw)),nx=dx/raw,ny=dy/raw;
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const oldCross=(f[0]-h[0])*(k[1]-h[1])-(f[1]-h[1])*(k[0]-h[0]),sign=oldCross>=0?1:-1;
 const knee=[newHip[0]+nx*along-ny*height*sign,newHip[1]+ny*along+nx*height*sign];
 return{hip:newHip,knee,foot:[newHip[0]+nx*d,newHip[1]+ny*d],upper:Math.atan2(knee[1]-newHip[1],knee[0]-newHip[0])-Math.atan2(k[1]-h[1],k[0]-h[0]),lower:Math.atan2(newFoot[1]-knee[1],newFoot[0]-knee[0])-Math.atan2(f[1]-k[1],f[0]-k[0])};
}
function boneMap(v,origin,destination,angle){const r=rotatePoint(v,origin,angle);return{x:r.x+destination[0]-origin[0],y:r.y+destination[1]-origin[1]}}
function upperPose(u,pose){
 const rig=UPPER_RIG[u.frame],native=u.frame===1?1:-1;
 const gunKick=pose.recoil*({rifle:.040,shotgun:.070,rail:.085,missile:.023}[u.weapon]||.04)*(1-pose.brace*.3);
 const angle=-native*(pose.aim*.29+gunKick*.50)+native*pose.kneel*.25;
 const shift={x:-native*gunKick,y:pose.kneel*.012-pose.aim*.008};
 const weaponPoint=v=>{const p=rotatePoint(v,rig.grip,angle);return{x:p.x+shift.x,y:p.y+shift.y}};
 const arms=rig.arms.map((chain,i)=>{
  const s=chain[0],w=chain[2];let target=weaponPoint({x:w[0],y:w[1]});
  if(u.frame===2){const a=(i?1:-1)*(pose.aim*.10+pose.kneel*.14);target=rotatePoint({x:w[0],y:w[1]},s,a);target.y+=pose.kneel*.025}
  const sway=pose.walk*Math.sin(pose.cycle*Math.PI)*(i?1:-1)*.012;
  const shoulder=[s[0]+sway,s[1]+pose.recoil*.008+pose.kneel*.015];
  return solveJoint(chain,shoulder,[target.x,target.y]);
 });
 return{rig,angle,shift,weaponPoint,arms};
}
function articulateUpperVertex(u,x,y,pose){
 const v={x,y},upper=pose.upper,rig=upper.rig;if(y>pose.rig.hip+.10)return{x,y,coverage:0};
 let sx=0,sy=0,total=0,coverage=0;
 for(let i=0;i<2;i++){
  const chain=rig.arms[i],joint=upper.arms[i],radius=chain[3];
  const upperWeight=capsuleWeight(x,y,chain[0],chain[1],radius),lowerWeight=capsuleWeight(x,y,chain[1],chain[2],radius*.96);
  const a=boneMap(v,chain[0],joint.hip,joint.upper),b=boneMap(v,chain[1],joint.knee,joint.lower);
  sx+=(a.x-x)*upperWeight+(b.x-x)*lowerWeight;sy+=(a.y-y)*upperWeight+(b.y-y)*lowerWeight;total+=upperWeight+lowerWeight;coverage=Math.max(coverage,upperWeight,lowerWeight);
 }
 let p={x:x+sx/Math.max(1,total),y:y+sy/Math.max(1,total)};
 for(let i=0;i<2;i++){
  const pad=rig.pads[i],d=Math.hypot((x-pad[0])/pad[2],(y-pad[1])/pad[3]),weight=1-smoothRange(.72,1.04,d);
  if(!weight)continue;
  const native=u.frame===1?1:-1,padRecoil=u.frame===2&&u.weapon==='missile'?(pose.podRecoil[i]||0):pose.recoil,angle=(i?1:-1)*(pose.walk*Math.sin(pose.cycle*Math.PI)*.025+padRecoil*.065)+(-native)*pose.aim*(u.frame===2?.105:.045)+pose.kneel*(i?.08:-.08);
  const q=rotatePoint(v,rig.arms[i][0],angle);q.y+=padRecoil*.012+pose.kneel*.02;
  p.x+=(q.x-p.x)*weight;p.y+=(q.y-p.y)*weight;coverage=Math.max(coverage,weight);
 }
 const weaponWeight=u.frame===2?0:polygonWeight(x,y,rig.weapon);
 if(weaponWeight){const q=upper.weaponPoint(v);p.x+=(q.x-p.x)*weaponWeight;p.y+=(q.y-p.y)*weaponWeight;coverage=Math.max(coverage,weaponWeight)}
 return{x:p.x,y:p.y,coverage};
}
function destructionStyle(u){return u.deathStyle||(u.frame===1?'fall':'kneel')}
function destructionRoot(u,pose){
 const fall=destructionStyle(u)==='fall'?smoothRange(.42,.96,pose.deathAge):0;
 return{x:fall*.03,y:0,angle:-fall*1.12,scale:1-fall*.12};
}
function deformDestructionVertex(u,x,y,p,pose,legWeight,rightWeight){
 if(pose.kneel<=0)return p;
 const rig=UPPER_RIG[u.frame],drop=pose.kneel*(destructionStyle(u)==='fall'?.105:.205),forward=(u.frame===1?1:-1)*pose.kneel*.025;
 const torso=1-legWeight;let result={x:p.x+forward*torso,y:p.y+drop*torso};
 for(let side=0;side<2;side++){
  const chain=rig.legs[side],rear=side===0?pose.kneel:0,fold=destructionStyle(u)==='fall'?.3:1,newFoot=[chain[2][0]+rear*.20*fold,chain[2][1]-rear*.12*fold],joint=solveJoint(chain,[chain[0][0]+forward,chain[0][1]+drop],newFoot);
  const upper=boneMap({x,y},chain[0],joint.hip,joint.upper),lower=boneMap({x,y},chain[1],joint.knee,joint.lower);
  const knee=smoothRange(chain[1][1]-.035,chain[1][1]+.04,y),foot=smoothRange(chain[2][1]-.075,chain[2][1]-.018,y);
  let q={x:upper.x+(lower.x-upper.x)*knee,y:upper.y+(lower.y-upper.y)*knee};const heel=boneMap({x,y},chain[2],newFoot,rear*.28*fold);q.x+=(heel.x-q.x)*foot;q.y+=(heel.y-q.y)*foot;
  const weight=(side?rightWeight:1-rightWeight)*legWeight;result.x+=(q.x-p.x)*weight;result.y+=(q.y-p.y)*weight;
 }
 return result;
}
function mechSourcePoint(u,x,y,pose){
 const b=unitBounds(u),p=deformMechVertex(u,x,y,pose),root=destructionRoot(u,pose),lx=(p.x-.5)*b.w,ly=(p.y-1)*b.h,c=Math.cos(root.angle),s=Math.sin(root.angle);
 const dx=(lx*c-ly*s)*root.scale+root.x*b.w,dy=(lx*s+ly*c)*root.scale+root.y*b.h;
 return{x:b.x+b.w/2+(spriteFlip(u)?-dx:dx),y:b.y+b.h+dy};
}
function beginDestruction(u){
 u.alive=false;u.deathTime=clock;u.deathStyle=destructionStyle(u);u.deathEvents=0;u.attack=null;
 if(!reducedMotion&&combatCamera)combatCamera.until=clock+DESTRUCTION.end+.12;
}
function updateDestruction(u,t){
 if(u.alive||!Number.isFinite(u.deathTime))return;const age=t-u.deathTime;if(age>DESTRUCTION.end+.5)return;
 if(age>=DESTRUCTION.kneelEnd&&!(u.deathEvents&8)){u.deathEvents=(u.deathEvents||0)|8;if(!reducedMotion&&age-DESTRUCTION.kneelEnd<.3){effects.push({type:'step',x:u.x,z:u.z,t:1,mass:MECH_MOTION[u.frame].mass*1.5,side:-1});shake=Math.max(shake,2*MECH_MOTION[u.frame].mass);sound('step')}}
 const cues=[{at:.67,big:false},{at:DESTRUCTION.blast,big:true},{at:1.28,big:false}];
 for(let i=0;i<cues.length;i++){
  const cue=cues[i],flag=1<<i;if(age<cue.at||(u.deathEvents&flag))continue;u.deathEvents=(u.deathEvents||0)|flag;
  if(age-cue.at>.6||reducedMotion)continue;
  const anchor=freezeAttachment(u,'body',u.deathTime+cue.at);
  effects.push({type:'detonation',x:u.x,z:u.z,anchor,t:1-(age-cue.at)/.85,big:cue.big,seed:u.index+u.frame*7});
  if(cue.big){sound('boom');shake=Math.max(shake,9*MECH_MOTION[u.frame].mass)}
 }
}
function drawDestructionDebris(u,t,pose){
 const age=pose.deathAge-DESTRUCTION.blast;if(age<0&&!reducedMotion)return;
 const q=reducedMotion?1:clamp01(age/.72),fade=reducedMotion?1:smoothRange(0,.13,age),b=unitBounds(u),visual=activeWardenVisual(u);
 const source=visual?artImages[visual.key]:rigidParts[u.frame]?.wreck||artImages[legacyChassis[u.frame]];if(!source)return;
 const hostile=u.team==='enemy',im=visual?.modular?paintedSprite(source,visual.key,u.paint,hostile):hostile?(enemyArt[visual?.key||u.frame]||source):source;
 const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,ground=project(u.vx,0,u.vz);
 ctx.save();ctx.globalAlpha=fade*.7;ctx.fillStyle='#080e13';ctx.beginPath();ctx.ellipse(ground.x,ground.y,scale*.92,scale*.32,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const pieces=[[.33,.24,.39,.33],[.16,.08,.28,.23],[.65,.10,.25,.25],[.2,.67,.25,.28],[.6,.68,.25,.25]];
 const blastPose=animationPose(u,(u.deathTime??t-DESTRUCTION.end)+DESTRUCTION.blast);
 for(let i=0;i<pieces.length;i++){
  const r=pieces[i],seed=(u.index+1)*1.73+i*2.399,range=scale*(i===0?.16:.5+(i%3)*.2),end={x:ground.x+Math.cos(seed)*range,y:ground.y+Math.sin(seed)*range*.32};
  const start=mechSourcePoint(u,r[0]+r[2]/2,r[1]+r[3]/2,blastPose),ease=1-(1-q)**2;
  const x=start.x+(end.x-start.x)*ease,y=start.y+(end.y-start.y)*ease-Math.sin(Math.PI*q)*scale*(i===0?.25:.7);
  ctx.save();ctx.globalAlpha=fade*(1-q*.2);ctx.filter=hostile&&im===source?HOSTILE_FILTER+' brightness(.55)':!visual&&rigidParts[u.frame]?'none':'brightness(.4) saturate(.65)';ctx.translate(x,y);ctx.rotate(Math.sin(seed)*1.3*q);const size=.9-q*.16;
  ctx.drawImage(im,r[0]*iw,r[1]*ih,r[2]*iw,r[3]*ih,-r[2]*b.w*size/2,-r[3]*b.h*size/2,r[2]*b.w*size,r[3]*b.h*size);ctx.restore();
 }
}

const rigidParts={};
function renderSurface(w,h){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
 if(typeof document.createElement==='function'){const c=document.createElement('canvas');if(c.getContext){c.width=w;c.height=h;return c}}return null;
}
const moduleImages={},paintedImages=new Map();
function moduleImage(key){
 if(!moduleImages[key]){
  const image=new Image();moduleImages[key]=image;image.decoding='async';
  image.onload=()=>{if(page==='workshop'&&!battle)drawWorkshopPreview()};
  image.src=art(key);
 }
 return moduleImages[key];
}
function paintedSprite(image,key,paint,hostile=false){
 if(!paint||!imageReady(image))return image;
 const id=key+paint+(hostile?"hostile":"");
 if(paintedImages.has(id))return paintedImages.get(id);
 const mask=moduleImage(key+'-paint');
 if(!imageReady(mask))return image;
 const width=image.naturalWidth,height=image.naturalHeight;
 try{
  const surface=renderSurface(width,height),g=surface.getContext('2d',{willReadFrequently:true});
  g.drawImage(mask,0,0);const maskData=g.getImageData(0,0,width,height).data;
  g.clearRect(0,0,width,height);g.drawImage(image,0,0);
  const color=g.getImageData(0,0,width,height),pixels=color.data;
  const rgb=[1,3,5].map(offset=>parseInt(paint.slice(offset,offset+2),16));
  for(let i=0;i<pixels.length;i+=4){
   if((!maskData[i]&&!hostile)||!pixels[i+3])continue;
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
   const ceramic=maskData[i]/255*smoothRange(18,56,light);
   const weight=Math.max(ceramic,hostile?.42*smoothRange(38,131,light):0);
   for(let c=0;c<3;c++){
    const tone=Math.min(255,rgb[c]*(light/171)**.86);
    pixels[i+c]+=(tone-pixels[i+c])*weight;
   }
  }
  g.putImageData(color,0,0);
  if(paintedImages.size>=18)paintedImages.delete(paintedImages.keys().next().value);
  paintedImages.set(id,surface);return surface;
 }catch{return image}
}
function spritePoint(bounds,point=[.5,.36]){
 return {x:bounds.x+point[0]*bounds.w,y:bounds.y+point[1]*bounds.h};
}
function weaponMount(visual,frame,bounds,id,direction,strike=0){
 const slot=arsenal.weapons?.[id]?.[direction===1?'right':'left'];
 if(!slot)return;
 const asset=id==='piledriver'&&strike>=.61&&strike<=.81&&slot.extended?slot.extended:slot;
 const isMelee=weapon(id).melee;
 const grip=spritePoint(bounds,isMelee?frame.gripL:frame.gripR);
 const axis=spritePoint(bounds,isMelee?(id==='piledriver'?frame.ramL:frame.axisL):frame.axisR);
 const angle=Math.atan2(axis.y-grip.y,axis.x-grip.x)-Math.atan2(asset.axis[1]-asset.grip[1],asset.axis[0]-asset.grip[0]);
 return {asset,grip,angle,scale:bounds.w/visual.ortho/asset.pixelsPerMetre};
}
function weaponPoint(mount,part){
 const {asset,grip,angle,scale:ratio}=mount,p=asset[part]||asset.muzzle||asset.tip||asset.axis;
 const x=(p[0]-asset.grip[0])*ratio,y=(p[1]-asset.grip[1])*ratio;
 return {x:grip.x+x*Math.cos(angle)-y*Math.sin(angle),y:grip.y+x*Math.sin(angle)+y*Math.cos(angle)};
}
function drawWeaponModule(g,mount){
 if(!mount)return;
 const {asset,grip,angle,scale:ratio}=mount,image=moduleImage(asset.key);
 if(!imageReady(image))return;
 g.save();g.translate(grip.x,grip.y);g.rotate(angle);g.scale(ratio,ratio);
 g.drawImage(image,-asset.grip[0],-asset.grip[1]);g.restore();
}
function drawWorkshopPreview(){
 const canvas=$('#paint-preview');if(!canvas)return;
 const g=canvas.getContext('2d'),u=save.units[selected],visual=wardenVisual(selected,u.weapon,-1);
 const image=artImages[visual?.key],loaded=imageReady(image),size=canvas.width;
 g.clearRect(0,0,size,size);
 if(!loaded){
  const fallback=artImages[legacyChassis[selected]];
  if(imageReady(fallback))g.drawImage(fallback,size*.06,size*.06,size*.88,size*.88);
  return;
 }
 const bounds={x:0,y:0,w:size,h:size};
 g.drawImage(visual.modular?paintedSprite(image,visual.key,u.paint):image,0,0,size,size);
 if(visual.modular){
  if(!(selected===2&&u.weapon==='missile'))drawWeaponModule(g,weaponMount(visual,visual,bounds,u.weapon,-1));
  if(u.melee)drawWeaponModule(g,weaponMount(visual,visual,bounds,u.melee,-1));
 }
}
function bindWorkshop(){
 const buttons=[...document.querySelectorAll('[data-paint]')],custom=$('#custom-paint'),u=save.units[selected];
 const mark=()=>buttons.forEach(button=>button.setAttribute('aria-pressed',String((u.paint||'')===button.dataset.paint)));
 for(const button of buttons)button.onclick=()=>{
  const color=button.dataset.paint;
  if(color){u.paint=color;custom.value=color}else{delete u.paint;custom.value='#c6bd9f'}
  mark();persist();drawWorkshopPreview();
 };
 custom.oninput=()=>{if(validPaint(custom.value)){u.paint=custom.value;mark();drawWorkshopPreview()}};
 custom.onchange=()=>{if(validPaint(custom.value)){u.paint=custom.value;mark();persist();drawWorkshopPreview()}};
 const remove=$('#remove-melee');
 if(remove)remove.onclick=()=>{delete u.melee;persist();render();toast('Melee weapon unequipped')};
 drawWorkshopPreview();
}
function partLabel(x,y,frame){
 const rig=UPPER_RIG[frame];
 if(y>MECH_MOTION[frame].hip+.10)return-1;if(y>MECH_MOTION[frame].hip-.03&&x>MECH_MOTION[frame].split-.20&&x<MECH_MOTION[frame].split+.18)return-1;
 if(frame!==2&&polygonWeight(x,y,rig.weapon)>.4)return 0;
 let pad=-1,padDistance=Infinity;for(let i=0;i<2;i++){const p=rig.pads[i],d=Math.hypot((x-p[0])/p[2],(y-p[1])/p[3]);if(d<1.34&&y<p[1]+(frame===2?.15:frame===1?.08:.115)&&d<padDistance){pad=i+1;padDistance=d}}
 if(pad>=0)return pad;
 let label=-1,best=1.5;for(let i=0;i<2;i++){const a=rig.arms[i];for(let j=0;j<2;j++){const d=segmentDistance(x,y,a[j],a[j+1])/a[3];if(d<best){best=d;label=3+i*2+j}}}return label;
}
function buildRigidParts(frame){
 if(rigidParts[frame])return;
 const key=FRAMES[frame].name.toLowerCase(),original=artImages[key],clean=artImages[key+'-base'];if(!decodedArt.has(key)||!decodedArt.has(key+'-base'))return;
 const size=W<760?256:512,source=renderSurface(size,size),base=renderSurface(size,size);if(!source||!base)return;
 const sg=source.getContext('2d',{willReadFrequently:true}),bg=base.getContext('2d',{willReadFrequently:true});sg.drawImage(original,0,0,size,size);bg.drawImage(clean,0,0,size,size);
 const src=sg.getImageData(0,0,size,size),dst=bg.getImageData(0,0,size,size),labels=new Int8Array(size*size);labels.fill(-1);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const index=y*size+x,o=index*4;if(src.data[o+3]<12)continue;
  const label=partLabel(x/size,y/size,frame);if(label<0)continue;
  const difference=Math.max(Math.abs(src.data[o]-dst.data[o]),Math.abs(src.data[o+1]-dst.data[o+1]),Math.abs(src.data[o+2]-dst.data[o+2]));
  if(src.data[o+3]-dst.data[o+3]>24||difference>24)labels[index]=label;
 }
 const parts=[],counts=[],removed=new Uint8Array(size*size),masks=Array.from({length:7},()=>new Uint8Array(size*size));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const label=labels[y*size+x];if(label<0)continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=0&&a<size&&b>=0&&b<size)masks[label][b*size+a]=1}}
 for(let label=0;label<7;label++){
  const c=renderSurface(size,size),g=c.getContext('2d'),pixels=g.createImageData(size,size);let count=0;
  for(let index=0;index<size*size;index++){
   if(!masks[label][index])continue;const o=index*4;if(src.data[o+3]<8)continue;pixels.data[o]=src.data[o];pixels.data[o+1]=src.data[o+1];pixels.data[o+2]=src.data[o+2];pixels.data[o+3]=src.data[o+3];removed[index]=1;count++;
  }
  g.putImageData(pixels,0,0);parts.push(c);counts.push(count);
 }
 const body=renderSurface(size,size),bodyContext=body.getContext('2d'),bodyPixels=bodyContext.createImageData(size,size);for(let i=0;i<size*size;i++){const data=removed[i]?dst.data:src.data;for(let c=0;c<4;c++)bodyPixels.data[i*4+c]=data[i*4+c]}bodyContext.putImageData(bodyPixels,0,0);
 const tinted=renderSurface(size,size),tg=tinted.getContext('2d');tg.filter=HOSTILE_FILTER;tg.drawImage(body,0,0,size,size);
 const wreck=renderSurface(size,size),wg=wreck.getContext('2d');wg.filter='brightness(.4) saturate(.55)';wg.drawImage(original,0,0,size,size);
 if(!enemyArt[frame]){const full=renderSurface(size,size),fg=full.getContext('2d');fg.filter=HOSTILE_FILTER;fg.drawImage(original,0,0,size,size);enemyArt[frame]=full}if(!artMasks[frame])artMasks[frame]=src;
 const enemyParts=parts.map(part=>{const c=renderSurface(size,size),g=c.getContext('2d');g.filter=HOSTILE_FILTER;g.drawImage(part,0,0);return c});rigidParts[frame]={parts,enemyParts,wreck,base:body,enemyBase:tinted,counts};
}
function mapTorsoPoint(u,p,pose){
 const native=u.frame===1?1:-1,recoilScale=({rifle:.025,shotgun:.047,missile:.021,rail:.062})[u.weapon]||.025;
 const kick=pose.recoil*recoilScale*.32*(1-pose.brace*.4),angle=-native*kick*.9+pose.impact*pose.impactX*.033+pose.walk*pose.dx*Math.sin(Math.PI*pose.phase)*.045;
 const q=rotatePoint(p,[pose.rig.split,pose.rig.hip],angle);q.x+=-native*kick+pose.impact*pose.impactX*.025;
 q.y+=pose.idle+pose.brace*.027+pose.land*.013*pose.rig.mass+pose.impact*pose.impactY*.018-Math.sin(Math.PI*pose.phase)**2*.008*pose.walk;
 if(pose.kneel){q.x+=(u.frame===1?1:-1)*pose.kneel*.025;q.y+=pose.kneel*(destructionStyle(u)==='fall'?.105:.205)}return q;
}
function rigidPartPoint(u,index,v,pose){
 const upper=pose.upper,rig=upper.rig;let q;
 if(index===0)q=upper.weaponPoint(v);
 else if(index===1||index===2){
  const i=index-1,native=u.frame===1?1:-1,padRecoil=u.frame===2&&u.weapon==='missile'?(pose.podRecoil[i]||0):pose.recoil,angle=(i?1:-1)*(pose.walk*Math.sin(pose.cycle*Math.PI)*.025+padRecoil*.065)-native*pose.aim*(u.frame===2?.105:.045)+pose.kneel*(i?.08:-.08);
  q=rotatePoint(v,rig.arms[i][0],angle);q.y+=padRecoil*.012+pose.kneel*.02;
 }else{const i=Math.floor((index-3)/2),lower=(index-3)%2,chain=rig.arms[i],joint=upper.arms[i];q=lower?boneMap(v,chain[1],joint.knee,joint.lower):boneMap(v,chain[0],joint.hip,joint.upper)}
 return mapTorsoPoint(u,q,pose);
}
function drawRigidUpper(u,w,h,pose){
 const cache=rigidParts[u.frame];if(!cache)return;
 for(const index of[3,5,4,6,1,2,0]){
  if(!cache.counts[index])continue;
  const a=rigidPartPoint(u,index,{x:0,y:0},pose),b=rigidPartPoint(u,index,{x:1,y:0},pose),c=rigidPartPoint(u,index,{x:0,y:1},pose),im=(u.team==='enemy'?cache.enemyParts:cache.parts)[index],size=im.width;
  ctx.save();ctx.filter='none';
  ctx.transform((b.x-a.x)*w/size,(b.y-a.y)*h/size,(c.x-a.x)*w/size,(c.y-a.y)*h/size,(a.x-.5)*w,(a.y-1)*h);ctx.drawImage(im,0,0);ctx.restore();
 }
}

function advanceUnitAnimation(u,t,dt){
 const m=u.motion;
 if(m){const p=clamp01((t-m.start)/m.duration),q=p*p*(3-2*p);u.vx=m.fromX+(m.toX-m.fromX)*q;u.vz=m.fromZ+(m.toZ-m.fromZ)*q}
 else{u.vx=u.x;u.vz=u.z}
 updateDestruction(u,t);
 u.braceBlend=(u.braceBlend??0)+((u.brace?1:0)-(u.braceBlend??0))*(1-Math.exp(-dt*13));
}
function animationPose(u,t,visual=activeWardenVisual(u)){
 const rig=visual||MECH_MOTION[u.frame],m=u.motion,phase=m?clamp01((t-m.start)/m.duration):0;
 const cycle=m?m.gaitBase+phase:0,routePhase=m?(m.stepIndex+phase)/m.totalSteps:0;
 const walk=m&&!reducedMotion?smoothRange(0,.12,routePhase)*(1-smoothRange(.87,1,routePhase)):0;
 const flip=spriteFlip(u,visual),facing=flip?-1:1,frameSize=[2.18,2.1,2.35][u.frame];
 const dx=m?((m.toX-m.fromX)-(m.toZ-m.fromZ))*.866/frameSize*facing:0;
 const dy=m?((m.toX-m.fromX)+(m.toZ-m.fromZ))*.42/frameSize:0;
 const attack=u.attack,profile=ATTACK_PROFILES[attack?.kind||u.weapon];
 const strikeKind=profile.melee?attack.kind:null;
 let aim=attack&&!strikeKind?smoothRange(0,profile.raise,t-attack.start):0;
 if(attack&&Number.isFinite(attack.releaseAt))aim*=1-smoothRange(0,profile.recover,t-attack.releaseAt);
 let strikeProgress=0;
 if(strikeKind){
  const windup=.7*profile.raise/(profile.raise+profile.travel);
  strikeProgress=Number.isFinite(attack.releaseAt)?.7+.3*clamp01((t-attack.releaseAt)/profile.recover):
   Number.isFinite(attack.fireAt)?windup+(.7-windup)*clamp01((t-attack.fireAt)/profile.travel):
   windup*clamp01((t-attack.start)/profile.raise);
 }
 let recoil=0;const age=t-(u.fireTime??-100);
 if(!strikeKind&&!reducedMotion)for(const beat of profile.beats)recoil+=dampedImpulse(age-beat,u.weapon==='missile'?32:42,u.weapon==='rail'?12:18);
 const impactAge=t-(u.hitTime??-100),impact=!reducedMotion?dampedImpulse(impactAge,28,11):0;
 const deathAge=u.alive?-1:t-(u.deathTime??t-DESTRUCTION.end),death=u.alive?0:reducedMotion?1:clamp01(deathAge/DESTRUCTION.end);
 const kneel=u.alive?0:reducedMotion?1:smoothRange(.04,DESTRUCTION.kneelEnd,deathAge);
 const explosion=u.alive?0:reducedMotion?1:smoothRange(DESTRUCTION.blast-.02,DESTRUCTION.blast+.15,deathAge);
 const landAge=t-(u.landTime??-100),land=!reducedMotion&&landAge>=0&&landAge<.4?Math.sin(landAge*30)*Math.exp(-landAge*15):0;
 const pose={rig,flip,strikeKind,strikeProgress,nativeDirection:visual?unitFacing(u):u.frame===1?1:-1,phase,cycle,walk,dx,dy,recoil,impact,death,deathAge,kneel,explosion,aim:reducedMotion?0:aim,land,brace:u.braceBlend??(u.brace?1:0),idle:reducedMotion?0:Math.sin(t*1.4+u.index*2.1)*.0014,impactX:(u.hitVector?.x||0)*facing,impactY:u.hitVector?.y||0};
 pose.podRecoil=profile.beats.map(beat=>reducedMotion||strikeKind?0:dampedImpulse(age-beat,32,18));pose.upper=upperPose(u,pose);return pose;
}
function deformMechVertex(u,x,y,pose){
 const{rig}=pose,upper=pose.baseOnly||activeWardenVisual(u)?{x,y,coverage:0}:articulateUpperVertex(u,x,y,pose),leg=smoothRange(rig.hip-.035,rig.hip+.065,y)*(1-upper.coverage),torso=1-leg;
 const right=smoothRange(rig.split-.045,rig.split+.045,x),left=1-right;
 let px=upper.x,py=upper.y;
 const nativeDirection=pose.nativeDirection,recoilScale=({rifle:.025,shotgun:.047,missile:.021,rail:.062})[u.weapon]||.025;
 const kick=pose.recoil*recoilScale*.32*(1-pose.brace*.4),hipX=rig.split,hipY=rig.hip;
 const tilt=(-nativeDirection*kick*.9)+pose.impact*pose.impactX*.033+pose.walk*pose.dx*Math.sin(Math.PI*pose.phase)*.045;
 const rx=px-hipX,ry=py-hipY;
 px+=((rx*Math.cos(tilt)-ry*Math.sin(tilt))-rx)*torso;
 py+=((rx*Math.sin(tilt)+ry*Math.cos(tilt))-ry)*torso;
 px+=(-nativeDirection*kick+pose.impact*pose.impactX*.025)*torso;
 py+=(pose.idle+pose.brace*.027+pose.land*.013*MECH_MOTION[u.frame].mass+pose.impact*pose.impactY*.018)*torso;
 if(pose.walk){
  for(let side=0;side<2;side++){
   const weight=side?right:left,phase=((pose.cycle+side)%2+2)%2,swing=phase<1;
   const stride=swing?-.5+smoothRange(0,1,phase):1.5-phase;
   const lift=swing?Math.sin(Math.PI*phase):0,foot=smoothRange(rig.hip+.015,rig.foot[side],y);
   const knee=Math.sin(Math.PI*clamp01((y-rig.hip)/(rig.foot[side]-rig.hip)));
   px+=weight*leg*pose.walk*(pose.dx*stride*.62*foot+(side?1:-1)*lift*.012*knee);
   py+=weight*leg*pose.walk*(pose.dy*stride*.62*foot-lift*.064*foot-lift*.01*knee);
  }
  py-=Math.sin(Math.PI*pose.phase)**2*.008*torso*pose.walk;
 }
 if(pose.brace){const knee=Math.sin(Math.PI*clamp01((y-rig.hip)/(1-rig.hip)));px+=(right-left)*.012*knee*leg*pose.brace}
 if(u.hitPart==='legs')py+=pose.impact*.035*leg*Math.sin(Math.PI*clamp01((y-rig.hip)/(1-rig.hip)));
 return pose.death>0?deformDestructionVertex(u,x,y,{x:px,y:py},pose,leg,right):{x:px,y:py};
}
function drawMeshTriangle(im,source,dest,renderWidth=im.naturalWidth||im.width,renderHeight=im.naturalHeight||im.height){
 const [a,b,c]=source,[p,q,r]=dest,sx=b.x-a.x,sy=b.y-a.y,tx=c.x-a.x,ty=c.y-a.y,det=sx*ty-tx*sy;
 if(Math.abs(det)<1e-8)return;
 const ax=((q.x-p.x)*ty-(r.x-p.x)*sy)/det,bx=((q.y-p.y)*ty-(r.y-p.y)*sy)/det;
 const cx=(sx*(r.x-p.x)-tx*(q.x-p.x))/det,dx=(sx*(r.y-p.y)-tx*(q.y-p.y))/det;
 const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 ctx.save();ctx.beginPath();for(let i=0;i<3;i++){const v=dest[i],vx=v.x-center.x,vy=v.y-center.y,len=Math.hypot(vx,vy)||1;const x=v.x+vx/len*.24,y=v.y+vy/len*.24;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.clip();
 ctx.transform(ax,bx,cx,dx,p.x-ax*a.x-cx*a.y,p.y-bx*a.x-dx*a.y);ctx.drawImage(im,0,0,renderWidth,renderHeight);ctx.restore();
}
function drawArticulatedMech(im,u,w,h,pose,upperTexture=null){
 const upperActive=pose.aim>.001||Math.abs(pose.recoil)>.008||pose.death>0,columns=pose.baseOnly?(u.alive?(pose.walk>.001?(w>210?9:6):3):6):upperActive?(w>210?13:10):(w>210?9:6),rows=pose.baseOnly?(u.alive?(pose.walk>.001?(w>210?13:10):10):14):upperActive?(w>210?18:15):(w>210?13:10),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
 const source=[],dest=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const x=i/columns,y=j/rows,v=deformMechVertex(u,x,y,pose);source.push({x:x*iw,y:y*ih});dest.push({x:(v.x-.5)*w,y:(v.y-1)*h});
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1,texture=upperTexture&&(j+.5)/rows<pose.rig.hip+.08?upperTexture:im;
  drawMeshTriangle(texture,[source[a],source[b],source[d]],[dest[a],dest[b],dest[d]],iw,ih);
  drawMeshTriangle(texture,[source[a],source[d],source[c]],[dest[a],dest[d],dest[c]],iw,ih);
 }
}
function mechAttachmentPoint(u,part='muzzle',t=clock){
 const visual=activeWardenVisual(u),b=unitBounds(u,visual),pose=animationPose(u,t,visual),rig=pose.rig;
 const locations={body:[rig.split,.34],right:[u.frame===1?.38:.30,.46],left:[.81,.39],legs:[rig.split,.79]};
 if(!visual){const source=part.startsWith('muzzle')?(u.weapon==='missile'?[u.frame===2?(part==='muzzle2'?.76:.36):(part==='muzzle2'?.29:.69),.16]:rig.muzzle):(locations[part]||locations.body);return mechSourcePoint(u,source[0],source[1],pose)}
 const baked=wardenMotionFrame(u,visual,pose),frame=baked?.frame||visual;
 if(visual.modular){
  if(part==='meleeTip'||part.startsWith('muzzle')){
   const melee=part==='meleeTip',id=melee?(pose.strikeKind||u.melee):u.weapon;
   if(!melee&&u.frame===2&&id==='missile')return spritePoint(b,part==='muzzle2'?frame.podL:frame.podR);
   const mount=weaponMount(visual,frame,b,id,unitFacing(u),pose.strikeProgress);
   if(mount)return weaponPoint(mount,melee?'tip':part);
  }
  return spritePoint(b,frame[part]||visual[part]||frame.body);
 }
 const source=frame[part]||visual[part]||locations[part]||visual.body;
 if(baked?.frame&&u.alive)return{x:b.x+(pose.flip?1-source[0]:source[0])*b.w,y:b.y+source[1]*b.h};
 return mechSourcePoint(u,source[0],source[1],{...remainingPose(pose,baked),baseOnly:true,kneel:baked?.frame?0:pose.kneel});
}
function freezeAttachment(u,part,t=clock){const p=mechAttachmentPoint(u,part,t),base=project(u.vx,0,u.vz);return{x:u.vx,z:u.vz,ox:(p.x-base.x)/scale,oy:(p.y-base.y)/scale}}
function resolveAttachment(a){const p=project(a.x,0,a.z);return{x:p.x+a.ox*scale,y:p.y+a.oy*scale}}
function drawMechSmoke(u,t,destroyed=false){
 const age=t-(u.deathTime??t-20);if(destroyed&&age>9)return;
 const p=destroyed?project(u.vx,.35,u.vz):mechAttachmentPoint(u,u.hp.right===0?'right':'body',t);
 ctx.save();const count=destroyed?6:3;
 for(let i=0;i<count;i++){const v=(t*.38+i/count)%1,fade=destroyed?Math.exp(-Math.max(0,age)*.22):1;ctx.globalAlpha=(1-v)*fade*(destroyed?.3:.18);ctx.fillStyle=destroyed?'#a9a8a0':'#aebbc4';ctx.beginPath();ctx.arc(p.x+Math.sin(i*3+t*.7)*scale*(.07+v*.14),p.y-v*scale*(destroyed?1.2:.8),scale*(.045+v*.16),0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
function drawUnit(u,t){
 const visual=activeWardenVisual(u),p=project(u.vx,0,u.vz),b=unitBounds(u,visual),pose=animationPose(u,t,visual);
 const key=visual?.key||legacyChassis[u.frame],original=artImages[key];
 const baked=wardenMotionFrame(u,visual,pose),remaining=remainingPose(pose,baked);
 const body=baked?.frame?baked.image:original,bodyKey=baked?.frame?baked.atlas.key:key;
 const im=visual?.modular?paintedSprite(body,bodyKey,u.paint,u.team==='enemy'):u.team==='enemy'&&!baked?.frame&&enemyArt[key]?enemyArt[key]:body;
 const tintFallback=u.team==='enemy'&&im===body;
 ctx.save();ctx.fillStyle=u.alive?'#050c12aa':'#090e13c9';ctx.beginPath();ctx.ellipse(p.x,p.y+scale*.025,scale*(.67+pose.brace*.05),scale*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!imageReady(original))return;
 if(!u.alive&&pose.explosion>=1){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true);return}
 ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h);if(pose.flip)ctx.scale(-1,1);
 if(tintFallback)ctx.filter=HOSTILE_FILTER;
 if(!u.alive){const root=destructionRoot(u,pose);ctx.globalAlpha=1-pose.explosion;ctx.translate(root.x*b.w,root.y*b.h);ctx.rotate(root.angle);ctx.scale(root.scale,root.scale)}
 const articulated=!reducedMotion&&(pose.walk>.001||Math.abs(pose.recoil)>.008||Math.abs(pose.impact)>.008||pose.brace>.008||pose.aim>.001||(!u.alive&&pose.explosion<1));
 if(baked?.frame){const {cell,columns}=baked.atlas,index=baked.frame.index;ctx.drawImage(im,index%columns*cell,Math.floor(index/columns)*cell,cell,cell,-b.w/2,-b.h,b.w,b.h)}
 else if(articulated&&!visual&&rigidParts[u.frame]){const cache=rigidParts[u.frame],bodyPose={...pose,baseOnly:true};drawArticulatedMech(im,u,b.w,b.h,bodyPose,u.team==='enemy'?cache.enemyBase:cache.base);drawRigidUpper(u,b.w,b.h,pose)}
 else if(articulated&&!visual?.modular)drawArticulatedMech(im,u,b.w,b.h,{...remaining,baseOnly:true});
 else{if(u.alive&&!reducedMotion)ctx.rotate(Math.sin(t*.85+u.index)*.001);ctx.drawImage(im,-b.w/2,-b.h,b.w,b.h)}
 ctx.restore();
 if(!u.alive){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true);return}
 if(visual?.modular){
  const frame=baked?.frame||visual,face=unitFacing(u);
  if(u.hp.right>0&&!(u.frame===2&&u.weapon==='missile'))drawWeaponModule(ctx,weaponMount(visual,frame,b,u.weapon,face));
  if(u.hp.left>0&&u.melee&&(pose.strikeKind||(action==='strike'&&current()===u))){
   drawWeaponModule(ctx,weaponMount(visual,frame,b,u.melee,face,pose.strikeProgress));
  }
 }
 if(u.attack&&!pose.strikeKind&&u.weapon==='rail'&&!Number.isFinite(u.attack.fireAt)&&!reducedMotion){const muzzle=mechAttachmentPoint(u,'muzzle',t);ctx.save();ctx.globalAlpha=pose.aim*.8;ctx.fillStyle='#b1e7ed';ctx.shadowColor='#8ac8e5';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(muzzle.x,muzzle.y,scale*(.025+pose.aim*.065),0,Math.PI*2);ctx.fill();ctx.restore()}
 if(u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
 if(u.hp.body/u.max.body<.4||u.hp.right===0)drawMechSmoke(u,t);
 const q=project(u.vx,2.35,u.vz),width=Math.max(31,scale*.75);ctx.fillStyle='#0b141dde';ctx.fillRect(q.x-width/2-2,q.y-3,width+4,7);ctx.fillStyle=u.team==='ally'?'#9cbec8':'#d8997e';ctx.fillRect(q.x-width/2,q.y-1,width*u.hp.body/u.max.body,3);ctx.font=(W<760?'9':'10')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=u.team==='ally'?'#d7e3df':'#e5ae98';ctx.shadowColor='#06101a';ctx.shadowBlur=4;ctx.fillText(u.team==='ally'?PILOTS[u.index].call:u.name,q.x,q.y-9);ctx.shadowBlur=0;
}
function drawCover(x,z,type){
 const sprite=moduleImage('cover-'+type),modern=imageReady(sprite);
 const image=modern?sprite:artImages.barricade;
 if(!imageReady(image))return;
 const p=project(x,0,z);
 ctx.save();
 ctx.fillStyle='#0b111577';ctx.beginPath();
 ctx.ellipse(p.x+scale*.09,p.y+scale*.035,scale*.58,scale*.19,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#10171965';ctx.beginPath();
 ctx.ellipse(p.x,p.y,scale*.37,scale*.115,0,0,Math.PI*2);ctx.fill();
 const size=scale*(modern?3.1843:1.65);
 ctx.translate(p.x,p.y);
 if(modern&&(type==='ridge-rock'||type==='conifer')&&(x+z)%2===1)ctx.scale(-1,1);
 if(modern&&type==='ridge-rock')ctx.filter='brightness(.75) saturate(.83)';
 ctx.drawImage(image,-size*.5,-size*(modern?.72:.82),size,size);
 ctx.restore();
}
function drawAttackEffect(e,t){
 const actor=battle.units.find(u=>u.id===e.actor),profile=ATTACK_PROFILES[e.kind],age=t-e.born;
 const impact=e.impact?resolveAttachment(e.impact):project(e.tx,1.3,e.tz);
 if(profile.melee){
  if(!actor||age>profile.travel)return;
  const tip=mechAttachmentPoint(actor,'meleeTip',t),previous=mechAttachmentPoint(actor,'meleeTip',t-.06);
  const strength=Math.sin(Math.PI*clamp01(age/profile.travel));
  ctx.save();ctx.lineCap='round';ctx.globalAlpha=strength*.8;
  ctx.shadowBlur=12;ctx.shadowColor=e.kind==='cleaver'?'#ff632b':'#ffc585';
  ctx.strokeStyle=e.kind==='cleaver'?'#ffb27a':'#e8d8ba';ctx.lineWidth=e.kind==='breaker'?4:2;
  ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.restore();
  return;
 }
 for(let i=0;i<profile.beats.length;i++){
  const since=age-profile.beats[i];if(since<0||since>.65)continue;
  if(!e.origins[i])e.origins[i]=actor?freezeAttachment(actor,e.kind==='missile'&&i%2?'muzzle2':'muzzle',e.born+profile.beats[i]):{x:e.x,z:e.z,ox:0,oy:-1.4};
  const a=resolveAttachment(e.origins[i]),p=since/profile.travel;
  ctx.save();ctx.lineCap='round';
  if(p>=0&&p<=1){
   if(e.kind==='missile'){
    const x=a.x+(impact.x-a.x)*p,y=a.y+(impact.y-a.y)*p-Math.sin(p*Math.PI)*scale*1.25;
    ctx.strokeStyle='#e1d2b34d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+impact.x)/2,Math.min(a.y,impact.y)-scale*1.25,x,y);ctx.stroke();
    ctx.fillStyle='#fff0bb';ctx.shadowColor='#ffb765';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(x,y,Math.max(2,scale*.055),0,Math.PI*2);ctx.fill();
    for(let j=1;j<=4;j++){const q=Math.max(0,p-j*.045),sx=a.x+(impact.x-a.x)*q,sy=a.y+(impact.y-a.y)*q-Math.sin(q*Math.PI)*scale*1.25;ctx.globalAlpha=(1-j/5)*.25;ctx.fillStyle='#c1b8a5';ctx.beginPath();ctx.arc(sx,sy,scale*(.025+j*.015),0,Math.PI*2);ctx.fill()}
   }else if(e.kind==='rail'){
    ctx.globalAlpha=1-p*.65;ctx.shadowColor='#b3e9f4';ctx.shadowBlur=16;ctx.strokeStyle='#8ec7dc';ctx.lineWidth=5*(1-p*.7);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(impact.x,impact.y);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#f5ffff';ctx.lineWidth=1.5;ctx.stroke();
   }else{
    for(let pellet=0;pellet<(e.kind==='shotgun'?7:1);pellet++){
     const spread=e.kind==='shotgun'?(pellet-3)*scale*.075:0,x=a.x+(impact.x-a.x)*p,y=a.y+(impact.y-a.y)*p+spread*p;
     ctx.strokeStyle=pellet%2?'#fff0c4':'#e9b971';ctx.lineWidth=e.kind==='shotgun'?1.4:2;ctx.shadowColor='#eab36b';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(x-(impact.x-a.x)*.10,y-(impact.y-a.y)*.10);ctx.lineTo(x,y);ctx.stroke();
    }
   }
  }
  if(since<.055&&!reducedMotion){
   ctx.globalAlpha=1-since/.055;ctx.shadowColor='#f6bf72';ctx.shadowBlur=20;ctx.fillStyle='#fff0c5';ctx.beginPath();ctx.arc(a.x,a.y,scale*(e.kind==='shotgun'?.20:.11),0,Math.PI*2);ctx.fill();
   const angle=Math.atan2(impact.y-a.y,impact.x-a.x);ctx.translate(a.x,a.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-scale*.07);ctx.lineTo(scale*.33,0);ctx.lineTo(0,scale*.07);ctx.fill();
  }
  ctx.restore();
  if(['rifle','shotgun','hailstorm','rampart'].includes(e.kind)&&since<.55&&!reducedMotion){
   ctx.save();const x=a.x+scale*.45*since,y=a.y-scale*.7*since+scale*1.4*since*since;ctx.translate(x,y);ctx.rotate(since*19+i);ctx.globalAlpha=1-since/.55;ctx.fillStyle='#d8b982';ctx.fillRect(-2,-.8,4,1.6);ctx.restore();
  }
 }
}
function drawDetonation(e,t){
 const p=resolveAttachment(e.anchor),phase=1-e.t,radius=scale*(e.big?1.55:.56),size=radius*(.35+phase*.9);
 ctx.save();ctx.globalAlpha=Math.min(1,e.t*2);const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,size);
 g.addColorStop(0,'#fff8d8');g.addColorStop(.13,'#ffe7a1');g.addColorStop(.42,'#f39b4dcc');g.addColorStop(.74,'#b94f2890');g.addColorStop(1,'#2a211e00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();
 if(e.big){for(let i=0;i<6;i++){const angle=i*2.399+e.seed,spread=radius*(.12+phase*.4),x=p.x+Math.cos(angle)*spread,y=p.y+Math.sin(angle)*spread*.6-phase*radius*.45,r=radius*(.16+phase*.29);ctx.globalAlpha=e.t*.5;const fire=ctx.createRadialGradient(x,y,0,x,y,r);fire.addColorStop(0,phase<.45?'#ffce78':'#c98349');fire.addColorStop(.45,phase<.45?'#e97c36cc':'#61524acc');fire.addColorStop(1,'#332b2500');ctx.fillStyle=fire;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}}
 for(let i=0;i<(e.big?30:12);i++){
  const angle=i*2.399+e.seed*.3,v=radius*(.4+(i%7)*.14)*phase*2.3,x=p.x+Math.cos(angle)*v,y=p.y+Math.sin(angle)*v+phase*phase*scale*.7;
  ctx.strokeStyle=i%3?'#ffc778':'#fff3d0';ctx.lineWidth=i%3?1.1:1.8;ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*scale*.08,y-Math.sin(angle)*scale*.08);ctx.lineTo(x,y);ctx.stroke();
 }
 if(e.big){const ground=project(e.x,0,e.z);ctx.globalAlpha=e.t*.7;ctx.strokeStyle='#e8c294';ctx.lineWidth=2*e.t;ctx.beginPath();ctx.ellipse(ground.x,ground.y,scale*(.4+phase*2.5),scale*(.13+phase*.8),0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}

function drawEffects(t){for(const e of effects){const phase=1-e.t;if(e.type==='shot'){drawAttackEffect(e,t);
 }else if(e.type==='boom'){
  const target=battle.units.find(u=>u.id===e.target),p=target?mechAttachmentPoint(target,e.part||'body',t):project(e.x,1.1,e.z),radius=scale*(e.big?1.1:.5);ctx.save();ctx.globalAlpha=e.t;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*(.3+phase));g.addColorStop(0,'#fff8dc');g.addColorStop(.22,'#ffda8f');g.addColorStop(.5,'#f2873c99');g.addColorStop(1,'#b54c1200');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,radius*(.3+phase),0,Math.PI*2);ctx.fill();for(let i=0;i<(e.big?22:13);i++){const angle=i*2.399,v=(.25+(i%5)*.19)*phase*radius*2;ctx.strokeStyle=i%2?'#ffba6c':'#fff2c6';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*v*.65,p.y+Math.sin(angle)*v*.65+phase*phase*scale*.5);ctx.lineTo(p.x+Math.cos(angle)*v,p.y+Math.sin(angle)*v+phase*phase*scale*.5);ctx.stroke()}ctx.restore();
 }else if(e.type==='detonation'){drawDetonation(e,t);
 }else if(e.type==='step'){
  const p=project(e.x,0,e.z),mass=e.mass||1;ctx.save();ctx.globalAlpha=e.t*.34;ctx.strokeStyle='#c0d4dc';ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(p.x+(e.side||0)*scale*.15,p.y,scale*phase*.62*mass,scale*phase*.2*mass,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<5;i++){const angle=i*2.4;ctx.globalAlpha=e.t*.16;ctx.fillStyle='#aabdc6';ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*phase*scale*.5,p.y+Math.sin(angle)*phase*scale*.14-phase*scale*.12,scale*(.025+phase*.055)*mass,0,Math.PI*2);ctx.fill()}ctx.restore();
 }else if(e.type==='skill'){
  const p=project(e.x,0,e.z);ctx.save();ctx.globalAlpha=e.t*.65;ctx.strokeStyle=['#e8bc77','#b1d7e6','#b6d8c5'][e.kind];ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(.35+phase*.9),scale*(.13+phase*.3),0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 else{const p=project(e.x,2.6+phase*.6,e.z);ctx.save();ctx.globalAlpha=Math.min(1,e.t*3);ctx.fillStyle=e.type==='heal'?'#bbd8c9':'#f5dbb1';ctx.font='600 '+(W<760?'9':'12')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.shadowColor='#07111a';ctx.shadowBlur=6;ctx.fillText(e.text,p.x,p.y);ctx.restore()}
}}
function battlefield(t){
 const mobile=W<760;scale=mobile?Math.min(W/18,H/22):Math.min((W-450)/17.5,(H-250)/10.7);scale=Math.max(16,scale);const baseScale=scale,baseOrigin={x:W*(mobile?.5:.52),y:H*(mobile?.44:.3)};const goal=combatCamera&&t<combatCamera.until?1:0;cameraBlend+=(goal-cameraBlend)*(1-Math.exp(-frameDt*9));const zoom=mobile?1.25:Math.min(2.1,(W-420)/(baseScale*(combatCamera?.span||4)*.866+baseScale*2.2));scale=baseScale*viewZoom*(1+(zoom-1)*cameraBlend);const focusX=combatCamera?.x??4.5,focusZ=combatCamera?.z??4.5;origin={x:baseOrigin.x+((W*.52-(focusX-focusZ)*scale*.866)-baseOrigin.x)*cameraBlend,y:baseOrigin.y+((H*(mobile?.5:.57)-(focusX+focusZ)*scale*.42+scale*.7)-baseOrigin.y)*cameraBlend};
 const u=current(),reachable=u&&battle.phase==='player'&&!battle.busy&&action==='move'?paths(u):null;
 const attackRange=action==='move'?0:selectedWeapon(u)?.range??0;
 ctx.save();if(!reducedMotion&&shake>.15){ctx.translate(Math.sin(t*110)*shake,Math.cos(t*93)*shake*.5)}
 drawTerrain(battle.field);
 for(let x=0;x<10;x++)for(let z=0;z<10;z++){
  const key=x+','+z;
  if(reachable?.get(key)>0){
   tile(x,z,'#77b4c533','#9ccdda80',.008);
   if(inCover({x,z}))drawCoverMarker(x,z);
  }
  if(attackRange&&distance(u,{x,z})<=attackRange)tile(x,z,'#dd9b6b13','#cd9b7230',.008);
  if(hover?.x===x&&hover?.z===z)tile(x,z,'#e7be6e3c','#eac07e',.016);
 }
 for(const unit of battle.units){advanceUnitAnimation(unit,t,frameDt);if(unit.team==='ally'&&unit.alive)tile(unit.vx,unit.vz,selected===unit.index?'#e6b76a2d':'#a0c6d018',selected===unit.index?'#e6b76a':'#83b0c080',.02);else if(unit.alive&&unit.id===lockedTarget)tile(unit.vx,unit.vz,'#d8877330','#d89279',.02)}
 const entities=[...Array.from(battle.cover,key=>{const[x,z]=key.split(',').map(Number);return{x,z,type:'cover',model:battle.field.cover[key]}}),...battle.units.map(u=>({x:u.vx,z:u.vz,type:'unit',u}))].sort((a,b)=>(a.x+a.z-(a.u&&!a.u.alive?2:0))-(b.x+b.z-(b.u&&!b.u.alive?2:0)));
 for(const e of entities)e.type==='cover'?drawCover(e.x,e.z,e.model):drawUnit(e.u,t);
 drawEffects(t);ctx.restore();fieldAtmosphere(t,battle.field);
 if(['warden','kestrel','basilisk','concrete','barricade'].some(k=>!imageReady(artImages[k]))){ctx.font='11px Inter,Arial,sans-serif';ctx.fillStyle='#e7d5b5';ctx.textAlign='center';ctx.fillText('PREPARING BATTLEFIELD ART…',W/2,H*.6)}
}
function draw(ts){
 const elapsed=Math.max(0,(ts-last)/1000||1/60),dt=Math.min(.05,elapsed);last=ts;clock+=elapsed;frameDt=dt;
 ctx.setTransform(DPR,0,0,DPR,0,0);background();if(battle)battlefield(clock);else if(page==='hangar')hangar(clock);
 effects.forEach(e=>e.t-=elapsed*(e.type==='shot'?1/(e.life||.4):e.type==='detonation'?1/.85:e.type==='step'?1.8:e.type==='skill'?1.2:1.6));effects=effects.filter(e=>e.t>0);shake*=Math.exp(-dt*13);requestAnimationFrame(draw);
}
canvas.addEventListener('wheel',e=>{if(!battle||battle.busy)return;e.preventDefault();viewZoom=Math.min(1.5,Math.max(.8,viewZoom*(e.deltaY<0?1.08:.925)))},{passive:false});
function screenTile(clientX,clientY){let sx=(clientX-origin.x)/(scale*.866),sy=(clientY-origin.y)/(scale*.42);return{x:Math.round((sx+sy)/2),z:Math.round((sy-sx)/2)}}
function pick(clientX,clientY){
 const units=battle.units.filter(u=>u.alive).sort((a,b)=>(b.vx+b.vz)-(a.vx+a.vz));
 for(const u of units){const visual=activeWardenVisual(u),b=unitBounds(u,visual),px=(clientX-b.x)/b.w,py=(clientY-b.y)/b.h;if(px<0||py<0||px>1||py>1)continue;
 const mask=artMasks[visual?.key||legacyChassis[u.frame]];if(mask){const ix=Math.min(mask.width-1,Math.floor((spriteFlip(u,visual)?1-px:px)*mask.width)),iy=Math.min(mask.height-1,Math.floor(py*mask.height));if(mask.data[(iy*mask.width+ix)*4+3]<35)continue}
 else if(Math.abs(px-.5)>.36)continue;return u}return null;
}
canvas.addEventListener('pointermove',e=>{if(!battle)return;let picked=pick(e.clientX,e.clientY),p=picked?{x:picked.x,z:picked.z}:screenTile(e.clientX,e.clientY);let changed=!hover||hover.x!==p.x||hover.z!==p.z;hover=p;if(changed&&picked?.team==='enemy')renderBattle()});
canvas.addEventListener('pointerdown',async e=>{if(!battle||battle.busy||!$('#modal').hidden)return;let picked=pick(e.clientX,e.clientY),p=picked?{x:picked.x,z:picked.z}:screenTile(e.clientX,e.clientY),u=current();hover=p;if(picked?.team==='enemy')lockedTarget=picked.id;if(picked?.team==='ally'){selected=picked.index;if(action==='strike'&&!current()?.melee)action='move';renderBattle();persist();return}if(!u)return;if(action==='move'){if(picked?.team==='enemy'){action='fire';if(W<760)targetPanelOpen=true;renderBattle();persist();toast('Target acquired. Select a subsystem, then tap again to fire.');return}let cost=paths(u).get(p.x+','+p.z);if(!cost)return toast('Choose a highlighted tile within movement range');battle.busy=true;await moveUnit(u,p.x,p.z,cost);battle.busy=false;renderBattle();persist()}else{if(!picked||picked.team!=='enemy')return toast('Select a hostile mech');const w=selectedWeapon(u);if(!w)return toast('Equip a melee weapon in Workshop.');if(u.hp[w.melee?'left':'right']<=0)return toast(w.melee?'Melee arm destroyed. Switch to fire.':'Weapon arm destroyed. Move or brace to support your lance.');if(u.ap<w.ap)return toast('Not enough AP. Select another unit or end your turn.');if(distance(u,picked)>w.range)return toast(w.melee?'Strike requires an adjacent target.':'Target out of range. Move closer.');if(picked.hp[targetPart]<=0)return toast('Subsystem already destroyed. Select another target part.');battle.busy=true;renderBattle();await shoot(u,picked,targetPart,w);if(checkEnd())return;battle.busy=false;renderBattle();persist()}});
document.addEventListener('keydown',e=>{if(!battle||battle.busy||!$('#modal').hidden||e.repeat)return;let key=e.key.toLowerCase();if(['m','f','x','q','e','1','2','3'].includes(key))e.preventDefault();if(key==='m'){action='move';renderBattle();persist()}if(key==='f'){action='fire';renderBattle();persist()}if(key==='x'&&canUseWeapon(current(),selectedWeapon(current(),'strike'))){action='strike';renderBattle();persist()}if(key==='q')skill();if(key==='e')endTurn();if(['1','2','3'].includes(key)){let i=+key-1;if(battle.units.find(u=>u.team==='ally'&&u.index===i&&u.alive)){selected=i;if(action==='strike'&&!current()?.melee)action='move';renderBattle();persist()}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#modal').hidden){closeModal();return}if(targetPanelOpen){targetPanelOpen=false;renderBattle();return}}if(e.key==='Tab'&&!$('#modal').hidden){let btns=[...$('#modal').querySelectorAll('button')],first=btns[0],last=btns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('.brand').onclick=e=>{e.preventDefault();if(!battle){page='hangar';render()}};
const resumedSortie=restoreSortie();if(resumedSortie)page='contracts';render();requestAnimationFrame(draw);if(resumedSortie){toast('Sortie resumed. Your company is still in the fight.');if(resumedSortie.enemyPending)void endTurn();}
