'use strict';
const $=s=>document.querySelector(s), canvas=$('#scene'),ctx=canvas.getContext('2d');
const WEAPONS=[{id:'rifle',name:'Kestrel AR-8',type:'ASSAULT RIFLE',damage:36,range:5,ap:3,weight:14,price:0,desc:'Reliable burst fire. Balanced range and accuracy.'},{id:'shotgun',name:'Breacher SG-4',type:'SCATTER CANNON',damage:60,range:3,ap:3,weight:18,price:1500,desc:'Devastating close-range impact. Close the distance.'},{id:'missile',name:'Vesper MRL',type:'MISSILE POD',damage:45,range:7,ap:4,weight:22,price:2400,desc:'Long-range guided ordnance. Ignores cover penalties.'},{id:'rail',name:'Longbow R-12',type:'RAIL CANNON',damage:70,range:8,ap:5,weight:26,price:3600,desc:'Precision anti-armor fire. Powerful, but demanding.'}];
const FRAMES=[{name:'WARDEN',model:'WDN–07',role:'ASSAULT',color:'#899681',hp:160,arm:92,leg:110,move:4,armor:5},{name:'KESTREL',model:'KST–12',role:'RECON',color:'#b6a37c',hp:126,arm:78,leg:100,move:5,armor:2},{name:'BASILISK',model:'BSK–04',role:'SUPPORT',color:'#708c92',hp:180,arm:100,leg:90,move:3,armor:7}];
const PILOTS=[{name:'Mara Voss',call:'ROOK',skill:'Overdrive',desc:'+2 AP this turn. Once per battle.',color:'#9cae8b'},{name:'Jin Takeda',call:'GHOST',skill:'Deadeye',desc:'Next attack deals 50% more damage. Once per battle.',color:'#c1a477'},{name:'Elena Ortiz',call:'ANCHOR',skill:'Field repair',desc:'Restore 45 body HP. Once per battle.',color:'#83a4ac'}];
const CONTRACTS=[{name:'Ashes of the relay',place:'KARST BASIN · SECTOR 07',tag:'RECOVERY OPERATION',pay:3200,difficulty:1,desc:'A rival lance occupies a decommissioned relay station. Clear the site and recover its navigation core.',enemies:3,color:'#707e60'},{name:'The iron corridor',place:'VANTA INDUSTRIAL · SECTOR 12',tag:'INTERDICTION',pay:4600,difficulty:2,desc:'Intercept an armored patrol before it reaches the refinery. Expect reinforced enemy chassis.',enemies:4,color:'#a07856'},{name:'No quiet frontier',place:'HALCYON OUTSKIRTS · SECTOR 19',tag:'HIGH-RISK CONTRACT',pay:6800,difficulty:3,desc:'A veteran company has claimed the frontier. Break their command lance and make your name.',enemies:5,color:'#658b92'}];
const FIELD_PATCH=50;
const COVER_LAYOUTS=[['2,3','3,3','7,3','7,4','5,6','6,6','2,7','8,7','4,1'],['1,3','2,3','3,3','6,4','7,4','8,4','3,6','4,6','7,7'],['1,4','2,4','7,2','8,2','5,5','6,5','3,7','7,7','4,2']];
function fresh(){return{version:1,day:1,credits:4500,rep:0,wins:0,kills:0,owned:['rifle','missile'],units:FRAMES.map((f,i)=>({weapon:i===2?'missile':'rifle',level:1,xp:0,condition:100,upgrade:0})),history:[]}}
let save;try{save=JSON.parse(localStorage.getItem('iron-vow-career'));if(!validSave(save))save=fresh()}catch{save=fresh()}
save.owned=[...new Set([...save.owned,...save.units.map(u=>u.weapon)])];
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
 battle={contract:CONTRACTS[i],turn:1,phase:'player',units:[],cover:new Set(COVER_LAYOUTS[i]),log:['Lance deployed. Reactor signatures detected.'],busy:false};
 battle.units=[makeUnit(0,'ally',1,8),makeUnit(1,'ally',2,9),makeUnit(2,'ally',0,9),...Array.from({length:CONTRACTS[i].enemies},(_,j)=>makeUnit(j,'enemy',j%3*3+2,Math.floor(j/3)))];
}
function restoreSortie(){
 const saved=save.sortie;if(!saved)return null;
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 let valid=saved.version===1&&integer(saved.contract,0,2)&&integer(saved.turn,1,10000)&&integer(saved.selected,0,2)&&['move','fire'].includes(saved.action)&&['body','left','right','legs'].includes(saved.part)&&typeof saved.enemyPending==='boolean'&&Array.isArray(saved.units);
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
 action=saved.action;targetPart=saved.part;effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;battle.log=['Sortie restored from the last completed action.'];
 return{enemyPending:saved.enemyPending};
}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function money(n){return n.toLocaleString()+' CR'}
function weapon(id){return WEAPONS.find(w=>w.id===id)||WEAPONS[0]}
let noiseBuffer=null;
function sound(type){
 if(muted)return;try{
  audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  const now=audio.currentTime;
  if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*.8,audio.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const boom=type==='boom',step=type==='step',click=type==='click',rail=type==='rail',missile=type==='missile';
  const duration=boom?.55:step?.13:click?.04:rail?.35:missile?.4:.2;
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.setValueAtTime(boom?600:step?350:rail?3400:missile?1400:2200,now);filter.frequency.exponentialRampToValueAtTime(90,now+duration);gain.gain.setValueAtTime(click?.025:boom?.19:step?.075:.12,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start(now);source.stop(now+duration);
  if(boom||step||!click){const o=audio.createOscillator(),g=audio.createGain();o.type=rail?'sawtooth':'sine';o.frequency.setValueAtTime(boom?70:step?85:rail?260:100,now);o.frequency.exponentialRampToValueAtTime(boom?25:rail?80:40,now+duration);g.gain.setValueAtTime(boom?.17:step?.045:.075,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+duration)}
 }catch{}
}
$('#sound').onclick=()=>{muted=!muted;$('#sound').innerHTML=icon(muted?'speaker-slash':'speaker-high');$('#sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');sound('click')};
function icon(name){return `<img class="ui-icon" src="assets/icons/${name}.svg" alt="">`}
function art(name){return 'assets/'+name+'.webp'}
function pilotArt(i){return art('pilot-'+['rook','ghost','anchor'][i])}
const wardenVisuals=window.IRON_VOW_WARDEN_ART||{};
function wardenVisual(frame,loadout,direction){
 return frame===0?wardenVisuals[loadout]?.[direction===1?'right':'left']:undefined;
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
    <div class="command-deck"><div class="selected-chassis"><h1>${f.name}</h1><p>${p.name} / ${f.role} / ${u.condition>=90?'COMBAT READY':u.condition>=30?'OPERATIONAL':'REPAIR REQUIRED'}</p></div>${others.map(({m,i})=>`<button class="deck-unit" data-select="${i}" aria-label="Select ${m.name}"><h3>${m.name}</h3><small>${PILOTS[i].call} / ${m.role}</small></button>`).join('')}<button class="primary deck-cta" data-page="contracts">SELECT CONTRACT ${icon('arrow-right')}</button></div>
    <div class="hangar-footer"><span>INDEPENDENT COMPANY / DAY ${String(save.day).padStart(3,'0')}</span><span>${save.wins} CONTRACTS / ${save.rep} REPUTATION</span><span>CAREER SAVED LOCALLY</span></div>`;
  }
  if(page==='contracts')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">OPERATIONS / AVAILABLE CONTRACTS</div><h1>CHOOSE YOUR BATTLE.</h1></div><p>Three pilots. Three machines.<br>One company to bring home.</p></div><div class="grid">${CONTRACTS.map((c,i)=>`<article class="card"><div class="contract-map"><img src="${art('contract-'+['relay','corridor','frontier'][i])}" alt="${['Rain-soaked mountain relay station','Industrial refinery corridor at dusk','Storm-lit frontier military outpost'][i]}"><span class="contract-number">0${i+1}</span><span class="tag">THREAT ${i+1} / 3</span></div><div class="eyebrow">${c.place}</div><h2>${c.name}</h2><p>${c.desc}</p><div class="rule"></div>${stat('OPERATION',c.tag)}${stat('HOSTILE LANCE',c.enemies+' UNITS')}${stat('CONTRACT PAYMENT',money(c.pay))}<button class="primary full" data-deploy="${i}">ACCEPT & DEPLOY ${icon('arrow-right')}</button><p class="note">${i===0?'Recommended for a new company.':'Reinforced hostiles. Inspect your lance before deployment.'}</p></article>`).join('')}</div><p class="note">MOVE to highlighted ground. FIRE at an enemy subsystem. Spend AP, coordinate your lance, then end your turn.</p></div>`;
  if(page==='workshop')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">ENGINEERING / CHASSIS & LOADOUT</div><h1>BUILT TO ENDURE.</h1></div><p>Refit the machine.<br>Protect the pilot inside.</p></div><div class="lance-tabs">${FRAMES.map((m,i)=>`<button data-select="${i}" class="${i===selected?'active':''}">${m.name}</button>`).join('')}</div><div class="split"><section class="workshop-chassis"><div class="eyebrow">${f.model} / ${f.role} / MK ${u.upgrade+1}</div><img class="unit-render" src="${chassisArt(selected,u.weapon)}" alt="${f.name} armored mech"><div class="workshop-meta"><h2>${f.name}</h2>${selected===0?'<a class="rig-bench-link" href="rig-bench/index.html">OPEN 3D RIG BENCH <span aria-hidden="true">↗</span></a>':''}${stat('BODY / ARMOR',(f.hp+u.upgrade*25)+' HP / '+(f.armor+u.upgrade*2))}${stat('CONDITION',u.condition+'%',u.condition)}<div class="repairs"><button data-patch="${selected}" ${u.condition>=FIELD_PATCH?'disabled':''}>FIELD PATCH · FREE</button><button data-repair="${selected}" ${u.condition===100?'disabled':''}>REPAIR · ${money(repairCost(selected))}</button><button data-upgrade="${selected}" ${u.upgrade>=3?'disabled':''}>${u.upgrade>=3?'MAX REINFORCEMENT':'REINFORCE · '+money(1800+u.upgrade*1200)}</button></div><p class="note">Reinforcement adds 25 body HP and 2 armor. A free field patch restores a damaged chassis to ${FIELD_PATCH}% integrity.</p></div></section><section><div class="eyebrow">PRIMARY HARDPOINT / ${p.call}</div><h2 style="margin-top:12px">THE RIGHT TOOL.</h2><p class="note">Purchase once to unlock a weapon for your company. Equip any unlocked weapon on any chassis.</p><div class="equipment">${WEAPONS.map((a,i)=>{const own=save.owned.includes(a.id)||u.weapon===a.id;return `<button data-equip="${a.id}" class="${u.weapon===a.id?'active':''}"><span class="weapon-index">0${i+1}</span><small>${a.type}</small><h3>${a.name}</h3><small>${a.damage} DMG / ${a.range} RANGE / ${a.ap} AP</small><p style="margin-top:12px;font-size:11px">${a.desc}</p><div class="note">${u.weapon===a.id?'EQUIPPED':own?'EQUIP WEAPON':money(a.price)+' / BUY & EQUIP'}</div></button>`}).join('')}</div><p class="note">${wardenVisual(selected,u.weapon,-1)?'Preview shows the equipped weapon.':'Chassis art shows factory equipment. Equipped weapon stats are listed above.'}</p></section></div></div>`;
  if(page==='pilots')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">PERSONNEL / ACTIVE DUTY</div><h1>HUMAN AT THE CORE.</h1></div><p>Every pilot matters.<br>Each level adds 5% weapon damage.</p></div><div class="grid">${PILOTS.map((p,i)=>{const u=save.units[i];return `<article class="card pilot-card"><div class="pilot-image"><img src="${pilotArt(i)}" alt="Portrait of ${p.name}"></div><div class="pilot-details"><div class="eyebrow">${p.call} / ${FRAMES[i].name}</div><h2>${p.name}</h2>${stat('PILOT LEVEL',String(u.level).padStart(2,'0'))}${stat('EXPERIENCE',u.xp+' / '+(u.level*100),Math.min(100,100*u.xp/(u.level*100)))}<div class="pilot-skill">${icon(['lightning','crosshair','first-aid-kit'][i])}<h3>${p.skill}</h3></div><p>${p.desc}</p><div class="rule"></div><p>${['Former border guard. Holds the line when contracts turn ugly. The first to drop and the last to leave.','A reconnaissance specialist with a quiet reputation. Makes every shot count, especially the impossible ones.','Field engineer turned combat pilot. Keeps the company moving, one repaired reactor at a time.'][i]}</p></div></article>`}).join('')}</div></div>`;
  if(page==='career')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">COMPANY RECORD / ONGOING CAREER</div><h1>LEAVE A MARK.</h1></div><span class="rank">${save.rep>=100?'VETERAN COMPANY':save.rep>=30?'RECOGNIZED LANCE':'INDEPENDENT OUTFIT'}</span></div><div class="career-stats"><div><span class="eyebrow">COMPANY RESERVES</span><h2>${money(save.credits)}</h2><p>Reinvest in weapons, armor and the machines that bring your pilots home.</p></div><div><span class="eyebrow">FULFILLED CONTRACTS</span><h2>${String(save.wins).padStart(2,'0')}</h2><p>${save.kills} enemy machines neutralized. ${save.rep} reputation earned.</p></div><div><span class="eyebrow">DEPLOYMENT DAY</span><h2>${String(save.day).padStart(3,'0')}</h2><p>Progress saves in this browser. Export a backup to carry your company with you.</p></div></div><section class="history"><span class="eyebrow">AFTER-ACTION RECORD</span>${save.history.length?save.history.slice().reverse().map(h=>`<div class="history-row"><span>${h.name}<small>DAY ${String(h.day).padStart(3,'0')}</small></span><b>${h.win?'FULFILLED / +'+money(h.pay):'LANCE WITHDRAWN'}</b></div>`).join(''):'<p style="margin-top:24px">No sorties recorded. Your first contract is waiting.</p>'}<div class="settings"><button id="export">EXPORT CAREER</button><button id="import">IMPORT BACKUP</button><input hidden type="file" id="file" accept="application/json"><button id="reset">NEW CAREER</button><button id="guide">FIELD MANUAL</button></div></section></div>`;
  bind();
  if(page==='hangar'){$('#inspect').onclick=()=>{inspectOpen=!inspectOpen;render()};$('#hangar-manual').onclick=guide;if(inspectOpen)$('#close-inspect').onclick=()=>{inspectOpen=false;render()}}
}
function repairCost(i){return Math.ceil((100-save.units[i].condition)*14)}
function bind(){document.querySelectorAll('[data-patch]').forEach(b=>b.onclick=()=>{save.units[selected].condition=Math.max(FIELD_PATCH,save.units[selected].condition);persist();render();toast('Emergency field patch applied. Full repairs recommended.')});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(!battle){page=b.dataset.page;render();sound('click')}});document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.select;render();sound('click')});document.querySelectorAll('[data-deploy]').forEach(b=>b.onclick=()=>deploy(+b.dataset.deploy));document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{let w=weapon(b.dataset.equip),u=save.units[selected];if(!save.owned.includes(w.id)&&u.weapon!==w.id){if(save.credits<w.price)return toast('Insufficient credits');save.credits-=w.price;save.owned.push(w.id)}u.weapon=w.id;persist();render();toast(w.name+' equipped')});document.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{let cost=repairCost(selected);if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;save.units[selected].condition=100;persist();render();toast('Chassis restored to full integrity')});document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{let u=save.units[selected],cost=1800+u.upgrade*1200;if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;u.upgrade++;persist();render();toast('Chassis reinforcement installed')});if($('#export')){$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iron-vow-career.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{let n=JSON.parse(await e.target.files[0].text());if(!validSave(n))throw Error();save=n;persist();render();toast('Career backup restored')}catch{toast('Invalid career backup')}};$('#reset').onclick=()=>modal('NEW CAREER?','This replaces your company progress in this browser. Export a backup first if you want to keep it.',[{text:'KEEP MY CAREER',fn:closeModal},{text:'START FRESH',fn:()=>{save=fresh();persist();closeModal();render()}}]);$('#guide').onclick=guide}}
function validSave(s){return s&&s.version===1&&Number.isFinite(s.credits)&&s.credits>=0&&Number.isInteger(s.day)&&s.day>0&&Number.isFinite(s.rep)&&Number.isFinite(s.wins)&&Number.isFinite(s.kills)&&Array.isArray(s.owned)&&s.owned.every(x=>WEAPONS.some(w=>w.id===x))&&Array.isArray(s.history)&&s.history.length<=500&&s.history.every(h=>typeof h.name==='string'&&CONTRACTS.some(c=>c.name===h.name)&&Number.isFinite(h.day)&&typeof h.win==='boolean'&&Number.isFinite(h.pay))&&Array.isArray(s.units)&&s.units.length===3&&s.units.every(u=>WEAPONS.some(w=>w.id===u.weapon)&&Number.isSafeInteger(u.level)&&u.level>0&&u.level<10000&&Number.isFinite(u.xp)&&u.xp>=0&&Number.isFinite(u.condition)&&u.condition>=0&&u.condition<=100&&Number.isInteger(u.upgrade)&&u.upgrade>=0&&u.upgrade<=3)}
function modal(title,body,buttons){if($('#modal').hidden)modalReturnFocus=document.activeElement;$('#modal').hidden=false;$('#modal').innerHTML=`<div class="modalbox" role="dialog" aria-modal="true" aria-label="${title}"><div class="eyebrow">IRON VOW / COMMAND UPLINK</div><h1>${title}</h1><div>${body}</div><div class="buttons">${buttons.map((b,i)=>`<button class="${i===buttons.length-1?'primary':''}" id="modal-${i}">${b.text}</button>`).join('')}</div></div>`;buttons.forEach((b,i)=>$('#modal-'+i).onclick=b.fn);$('#modal button').focus()}
function closeModal(){$('#modal').hidden=true;if(modalReturnFocus?.isConnected)modalReturnFocus.focus();modalReturnFocus=null}
function guide(){modal('FIELD MANUAL',`<p>Your objective is to neutralize every enemy. All three pilots act during your turn. Select a unit from the bottom bar or click its mech.</p><p><b>MOVE:</b> Click a blue tile. Movement costs one AP per tile, following a path around cover. Each pilot starts with 8 AP.</p><p><b>FIRE:</b> Select a target part on the right, then click an enemy in the red range overlay. A firing preview shows damage and accuracy. Body destruction disables a mech. Destroying its weapon arm stops attacks; destroyed legs stop movement. Losing the shield arm halves armor.</p><p><b>SKILL:</b> Each pilot can activate their unique skill once per battle. <b>BRACE:</b> Spend 2 AP to halve incoming damage until your next turn.</p><p>Cover reduces hit chance for rifles, shotguns and railguns. Missiles ignore cover. End your turn when you have used your AP. Enemies then move and attack. Withdraw if you need to preserve your machines.</p><p>Complete contracts to earn credits, experience, reputation and salvage. Repair damaged chassis in the workshop before your next sortie. Career progress and completed combat actions save in this browser. Reloading resumes the sortie. If an enemy turn was interrupted, it replays from its start.</p>`,[{text:'UNDERSTOOD',fn:closeModal}])}
// Tactical simulation: part HP, reachable tiles, AP, cover, level scaling and persistent rewards.
function makeUnit(i,team,x,z){let f=FRAMES[i%3],u=team==='ally'?save.units[i]:{upgrade:Math.max(0,battle.contract.difficulty-1),condition:100,level:battle.contract.difficulty,weapon:i%3===2?'missile':i%3===1?'shotgun':'rifle'};let k=team==='ally'?Math.max(.3,u.condition/100):1;let max={body:f.hp+u.upgrade*25,left:f.arm,right:f.arm,legs:f.leg};return{id:team+i,index:i,team,x,z,vx:x,vz:z,frame:i%3,name:team==='ally'?f.name:['JACKAL','RAVEN','MARAUDER'][i%3]+' '+(i+1),weapon:u.weapon,level:u.level,armor:f.armor+u.upgrade*2,max,hp:Object.fromEntries(Object.entries(max).map(([a,b])=>[a,Math.round(b*k)])),ap:8,brace:false,skill:false,boost:false,alive:true}}
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
function hitChance(a,t,part){return Math.min(.98,Math.max(.5,.96-(part==='body'?0:.13)-(inCover(t)&&a.weapon!=='missile'?.19:0)+.015*(a.level-1)))}
function damage(a,t){return Math.max(5,Math.round((weapon(a.weapon).damage*(1+.05*(a.level-1))*(a.boost?1.5:1)-(t.hp.left===0?Math.floor(t.armor/2):t.armor))*(t.brace?.5:1)))}
function addLog(s){battle.log.push(s);battle.log=battle.log.slice(-4)}
function renderBattle(){
  nav();const u=current(),under=hover&&battle.units.find(t=>t.alive&&t.team==='enemy'&&t.x===hover.x&&t.z===hover.z),target=under||battle.units.find(t=>t.alive&&t.id===lockedTarget)||battle.units.find(t=>t.alive&&t.team==='enemy');
  const ready=battle.phase==='player'&&!battle.busy,canFire=u&&u.ap>=weapon(u.weapon).ap&&u.hp.right>0;
  $('#ui').innerHTML=`<div class="battle-top"><span class="eyebrow">${battle.contract.tag}</span><h2>${battle.contract.name}</h2><p>Eliminate the hostile lance.<br>${battle.units.filter(t=>t.team==='enemy'&&t.alive).length} hostile signatures remaining</p><div style="display:flex;gap:16px;margin-top:10px"><button class="icon" id="manual" ${battle.busy?'disabled':''}>MANUAL</button><button class="icon" id="withdraw" ${battle.busy?'disabled':''}>WITHDRAW</button></div></div>
  <div class="turn">ROUND ${String(battle.turn).padStart(2,'0')}<small>${battle.phase==='player'?'YOUR LANCE / TAKE COMMAND':'HOSTILE LANCE / STAND BY'}</small></div>
  <button class="target-toggle" id="target-toggle" aria-expanded="${targetPanelOpen}" aria-controls="target-panel">${icon('crosshair')}<span><strong>${target?.name||'NO TARGET'}</strong><small>SUBSYSTEM DETAILS</small></span></button><aside class="combatpanel" id="target-panel" aria-label="Target subsystem details"><div class="inspect-head"><span class="eyebrow">HOSTILE / TARGET SUBSYSTEM</span><button class="icon close-target" id="close-target" aria-label="Close target details">${icon('x')}</button></div><h3>${target?.name||'AREA SECURED'}</h3>${target?`<div class="combat-target"><img class="enemy" data-visual-key="${wardenVisual(target.frame,target.weapon,unitFacing(target))?.key??''}" src="${chassisArt(target.frame,target.weapon,unitFacing(target))}" alt="Target ${target.name}"></div>`:''}<div class="parts">${['body','right','left','legs'].map(p=>`<button data-part="${p}" class="${p===targetPart?'active':''}" style="--part-hp:${target?100*target.hp[p]/target.max[p]:0}%" aria-pressed="${p===targetPart}"><span>${({body:'BODY',right:'WEAPON ARM',left:'SHIELD ARM',legs:'LEGS'})[p]}</span><b>${target?target.hp[p]+'/'+target.max[p]:'—'}</b></button>`).join('')}</div><div class="note">${target&&u?`${Math.round(hitChance(u,target,targetPart)*100)}% HIT / ${damage(u,target)} DMG<br>${distance(u,target)<=weapon(u.weapon).range?'IN WEAPON RANGE':'OUT OF RANGE'}${inCover(target)?' / IN COVER':''}`:'SELECT A HOSTILE TO INSPECT'}<br>DESTROY BODY TO NEUTRALIZE</div>${u?`<div class="combat-selected"><span class="eyebrow">${PILOTS[u.index].call} / ${u.ap} AP</span><p style="margin-top:7px"><b>${weapon(u.weapon).name}</b><br>${PILOTS[u.index].skill}: ${u.skill?'USED':PILOTS[u.index].desc}</p></div>`:''}</aside>
  <div class="log">${battle.log.map(l=>'<div class="log-line">'+l+'</div>').join('')}</div><div class="hint">${battle.busy?'RESOLVING COMBAT':action==='move'?'MOVE / SELECT HIGHLIGHTED GROUND / 1 AP PER TILE':'FIRE / SELECT HOSTILE / '+(u?weapon(u.weapon).ap:3)+' AP PER ATTACK'}</div>
  <div class="battle-bottom"><div class="unitbuttons">${battle.units.filter(t=>t.team==='ally').map(t=>`<button data-unit="${t.index}" class="${t.index===selected?'active':''}" ${!t.alive||battle.busy?'disabled':''}><img src="${pilotArt(t.index)}" alt="${PILOTS[t.index].call}"><span><b>${t.name}</b><small>${t.alive?t.ap+' AP / '+t.hp.body+' HP':'DISABLED'}</small></span></button>`).join('')}</div><div class="actionbuttons"><button id="move" class="${action==='move'?'active':''}" ${!u||!ready?'disabled':''}>${icon('arrows-out-cardinal')}<span>MOVE <span class="key-hint">M</span></span></button><button id="fire" class="${action==='fire'?'active':''}" ${!u||!ready||!canFire?'disabled':''}>${icon('crosshair')}<span>FIRE <span class="key-hint">F</span></span></button><button id="skill" title="${u?PILOTS[u.index].desc:''}" ${!u||u.skill||!ready||(u.index===2&&u.hp.body===u.max.body)?'disabled':''}>${icon('lightning')}<span>${u?['OVERDRIVE','DEADEYE','REPAIR'][u.index]:'SKILL'} <span class="key-hint">Q</span></span></button><button id="brace" title="Brace: 2 AP, halves incoming damage" ${!u||u.ap<2||u.brace||!ready?'disabled':''}>${icon('shield-chevron')}<span>BRACE <span class="key-hint">/ 2 AP</span></span></button><button id="end" class="primary" ${battle.busy?'disabled':''}>END TURN</button></div></div>`;
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{if(!battle.busy){selected=+b.dataset.unit;renderBattle();persist()}});
  document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{targetPart=b.dataset.part;if(W<760)targetPanelOpen=false;renderBattle();persist()});
  $('#move').onclick=()=>{action='move';renderBattle();persist()};$('#fire').onclick=()=>{action='fire';renderBattle();persist()};$('#skill').onclick=skill;
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
async function shoot(a,t,part){let w=weapon(a.weapon);a.ap-=w.ap;a.face=Math.sign((t.x-t.z)-(a.x-a.z))||a.face||-1;a.fireTime=clock;if(!reducedMotion)combatCamera={x:(a.x+t.x)/2,z:(a.z+t.z)/2,span:distance(a,t),until:clock+.88};effects.push({type:'shot',actor:a.id,target:t.id,part,kind:a.weapon,x:a.x,z:a.z,tx:t.x,tz:t.z,t:1,color:a.weapon==='rail'?'#b5f8ff':a.weapon==='missile'?'#ffbd71':'#e7f58c'});sound(a.weapon);await delay(a.weapon==='missile'?480:260);if(Math.random()>hitChance(a,t,part)){effects.push({type:'text',x:t.x,z:t.z,t:1,text:'MISS'});addLog(a.name+' missed '+t.name+'.')}else{let d=damage(a,t);t.hitTime=clock;t.hitPart=part;t.hitDamage=d;const hitX=(t.x-t.z)-(a.x-a.z),hitY=((t.x+t.z)-(a.x+a.z))*.5,hitLength=Math.hypot(hitX,hitY)||1;t.hitVector={x:hitX/hitLength,y:hitY/hitLength};shake=Math.max(shake,a.weapon==='rail'?7:4);t.hp[part]=Math.max(0,t.hp[part]-d);effects.push({type:'boom',target:t.id,part,x:t.x,z:t.z,t:1,big:false});effects.push({type:'text',x:t.x,z:t.z,t:1,text:'−'+d+' '+part.toUpperCase()});addLog(a.name+' → '+t.name+' / '+part+' −'+d);sound('boom');if(t.hp.body<=0){t.alive=false;t.deathTime=clock;effects.push({type:'boom',target:t.id,part:'body',x:t.x,z:t.z,t:1,big:true});addLog(t.name+' neutralized.');if(a.team==='ally'){save.kills++;save.units[a.index].xp+=35}}else if(t.hp[part]===0)addLog(t.name+': '+part+' destroyed.');}a.boost=false;await delay(t.alive?420:760)}
function checkEnd(){if(!battle)return true;if(!battle.units.some(u=>u.alive&&u.team==='enemy')){finish(true);return true}if(!battle.units.some(u=>u.alive&&u.team==='ally')){finish(false);return true}return false}
async function endTurn(){if(!battle||battle.busy)return;persist(true);targetPanelOpen=false;battle.busy=true;battle.phase='enemy';battle.units.filter(u=>u.team==='enemy'&&u.alive).forEach(u=>{u.ap=8;u.brace=false});renderBattle();for(let e of battle.units.filter(u=>u.team==='enemy'&&u.alive)){let allies=battle.units.filter(u=>u.team==='ally'&&u.alive);if(!allies.length)break;let t=allies.sort((a,b)=>distance(e,a)-distance(e,b))[0],w=weapon(e.weapon);if(distance(e,t)>w.range&&e.hp.legs>0){let possible=[...paths(e)].filter(([key,cost])=>cost<=8-w.ap).map(([key,cost])=>{let [x,z]=key.split(',').map(Number);return{x,z,cost,d:Math.abs(t.x-x)+Math.abs(t.z-z)}}).sort((a,b)=>a.d-b.d);if(possible[0]&&possible[0].d<distance(e,t))await moveUnit(e,possible[0].x,possible[0].z,possible[0].cost)}while(e.ap>=w.ap&&e.hp.right>0&&distance(e,t)<=w.range&&t.alive){await shoot(e,t,'body');renderBattle();if(checkEnd())return}if(e.hp.right===0)addLog(e.name+' cannot fire: weapon arm destroyed.');await delay(200)}if(checkEnd())return;battle.turn++;battle.phase='player';battle.busy=false;battle.units.filter(u=>u.team==='ally'&&u.alive).forEach(u=>{u.ap=8;u.brace=false});if(!current())selected=battle.units.find(u=>u.alive&&u.team==='ally').index;addLog('Round '+battle.turn+'. Your lance has the initiative.');renderBattle();persist()}
function finish(win){let b=battle,c=b.contract;let salvage=win?450+c.difficulty*200:0,pay=win?c.pay+salvage:0;save.credits+=pay;save.rep+=win?c.difficulty*10:0;if(win)save.wins++;b.units.filter(u=>u.team==='ally').forEach(u=>{let s=save.units[u.index];s.condition=Math.max(12,Math.round(100*(u.hp.body+u.hp.right+u.hp.left+u.hp.legs)/(u.max.body+u.max.right+u.max.left+u.max.legs)));s.xp+=win?70:20;while(s.xp>=s.level*100){s.xp-=s.level*100;s.level++}});save.history.push({name:c.name,day:save.day,win,pay});save.history=save.history.slice(-100);save.day++;battle=null;persist();page='career';render();modal(win?'CONTRACT FULFILLED.':'LANCE EXTRACTED.',`<p>${win?'The field is yours. Your pilots return with hard-earned experience and recovered enemy components.':'Your pilots have been recovered. The machines need work. There will be another contract.'}</p>${stat('CONTRACT PAYMENT',money(win?c.pay:0))}${stat('SALVAGE SOLD',money(salvage))}${stat('REPUTATION',win?'+'+c.difficulty*10:'UNCHANGED')}<p class="note">Damage persists. Visit the workshop to restore your lance.</p>`,[{text:'COMPANY RECORD',fn:closeModal},{text:'REPAIR & REFIT',fn:()=>{closeModal();page='workshop';render()}}])}
// Pre-rendered 2.5D battlefield: original raster art, depth ordering and live game effects.
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),scale=50,origin={x:0,y:0},shake=0,combatCamera=null,cameraBlend=0,viewZoom=1,frameDt=1/60;
const artImages={},artMasks={},enemyArt={},reducedMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const legacyChassis=FRAMES.map(frame=>frame.name.toLowerCase());
const bakedChassis=Object.values(wardenVisuals).flatMap(views=>Object.values(views).map(view=>view.key));
const mechArtKeys=new Set([...legacyChassis,...bakedChassis]);
for(const key of [...mechArtKeys,'concrete','barricade','contract-relay','contract-corridor','contract-frontier']){
 const im=new Image();im.decoding='async';artImages[key]=im;
 im.onload=()=>{
  if(mechArtKeys.has(key)&&typeof OffscreenCanvas==='function'){
   try{
    const mask=new OffscreenCanvas(128,128),g=mask.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0,128,128);artMasks[key]=g.getImageData(0,0,128,128);
    const tint=new OffscreenCanvas(384,384),tg=tint.getContext('2d');
    tg.filter='sepia(.33) saturate(.7) brightness(.83)';tg.drawImage(im,0,0,384,384);enemyArt[key]=tint;
   }catch{}
  }
  if(battle){
   const target=$('.combat-target img');
   if(target?.dataset.visualKey===key)target.src=art(key);
  }else if(page==='workshop'&&wardenVisual(selected,save.units[selected].weapon,-1)?.key===key){
   const preview=$('.unit-render');if(preview)preview.src=art(key);
  }
 };
 im.onerror=()=>{console.warn('Unable to load game artwork:',key);if(!bakedChassis.includes(key))toast('Artwork could not load. Refresh to retry.')};im.src=art(key);
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
function hangar(t){rain(t);}
function textureTile(x,z,inside){const im=artImages.concrete,p=project(x-.5,0,z-.5);if(imageReady(im)){const size=256,sx=((x*7+z*3+99)%3)*256,sy=((x*3+z*11+99)%3)*256;ctx.save();ctx.translate(p.x,p.y);ctx.transform(scale*.866/size,scale*.42/size,-scale*.866/size,scale*.42/size,0,0);ctx.drawImage(im,sx,sy,256,256,0,0,size,size);ctx.restore();tile(x,z,inside?'#20344516':'#0c192cb3',inside?'#acb9bd1f':null)}else tile(x,z,'#293943','#c3d1db15')}
function unitFacing(u){return u.face??(u.team==='enemy'?1:-1)}
function activeWardenVisual(u){
 const visual=wardenVisual(u.frame,u.weapon,unitFacing(u));
 return visual&&imageReady(artImages[visual.key])?visual:undefined;
}
function spriteFlip(u,visual=activeWardenVisual(u)){return !visual&&unitFacing(u)!==(u.frame===1?1:-1)}
const motionImages={};
function wardenMotionFrame(u,visual,pose){
 const atlas=visual?.motion;
 if(!atlas||reducedMotion||!u.alive)return;
 let image=motionImages[atlas.key];
 if(!image){
  image=motionImages[atlas.key]=new Image();
  image.decoding='async';
  image.src=art(atlas.key);
 }
 if(!imageReady(image))return;
 let frame;
 if(pose.walk>.12){
  const cycle=((pose.cycle%2)+2)%2;
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(cycle*atlas.gait.length/2))];
 }else{
  const kick=pose.recoil*(u.weapon==='rail'?1.35:.8)*(1-pose.brace*.4);
  if(kick>.11)frame=atlas.kick.reduce((best,f)=>Math.abs(f.level-kick)<Math.abs(best.level-kick)?f:best);
 }
 return {atlas,image,frame};
}
function remainingPose(pose,baked){
 return baked&&(pose.walk||pose.recoil)?{...pose,walk:0,recoil:0}:pose;
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
function advanceUnitAnimation(u,t,dt){
 const m=u.motion;
 if(m){const p=clamp01((t-m.start)/m.duration),q=p*p*(3-2*p);u.vx=m.fromX+(m.toX-m.fromX)*q;u.vz=m.fromZ+(m.toZ-m.fromZ)*q}
 else{u.vx=u.x;u.vz=u.z}
 u.braceBlend=(u.braceBlend??0)+((u.brace?1:0)-(u.braceBlend??0))*(1-Math.exp(-dt*13));
}
function animationPose(u,t,visual=activeWardenVisual(u)){
 const rig=visual||MECH_MOTION[u.frame],m=u.motion,phase=m?clamp01((t-m.start)/m.duration):0;
 const cycle=m?m.gaitBase+phase:0,routePhase=m?(m.stepIndex+phase)/m.totalSteps:0;
 const walk=m&&!reducedMotion?smoothRange(0,.12,routePhase)*(1-smoothRange(.87,1,routePhase)):0;
 const flip=spriteFlip(u,visual),facing=flip?-1:1,frameSize=[2.18,2.1,2.35][u.frame];
 const dx=m?((m.toX-m.fromX)-(m.toZ-m.fromZ))*.866/frameSize*facing:0;
 const dy=m?((m.toX-m.fromX)+(m.toZ-m.fromZ))*.42/frameSize:0;
 let recoil=0;const age=t-(u.fireTime??-100);
 if(!reducedMotion){for(const beat of(u.weapon==='rifle'?[0,.085,.17]:[0]))recoil+=dampedImpulse(age-beat,45,u.weapon==='rail'?12:19)}
 const impactAge=t-(u.hitTime??-100),impact=!reducedMotion?dampedImpulse(impactAge,28,11):0;
 const death=u.alive?0:reducedMotion?1:clamp01((t-(u.deathTime??t-1))/.72);
 const landAge=t-(u.landTime??-100),land=!reducedMotion&&landAge>=0&&landAge<.4?Math.sin(landAge*30)*Math.exp(-landAge*15):0;
 return{rig,flip,nativeDirection:visual?unitFacing(u):u.frame===1?1:-1,phase,cycle,walk,dx,dy,recoil,impact,death,land,brace:u.braceBlend??(u.brace?1:0),idle:reducedMotion?0:Math.sin(t*1.4+u.index*2.1)*.0014,impactX:(u.hitVector?.x||0)*facing,impactY:u.hitVector?.y||0};
}
function deformMechVertex(u,x,y,pose){
 const{rig}=pose,leg=smoothRange(rig.hip-.035,rig.hip+.065,y),torso=1-leg;
 const right=smoothRange(rig.split-.045,rig.split+.045,x),left=1-right;
 let px=x,py=y;
 const nativeDirection=pose.nativeDirection,recoilScale=({rifle:.025,shotgun:.047,missile:.021,rail:.062})[u.weapon]||.025;
 const kick=pose.recoil*recoilScale*(1-pose.brace*.4),hipX=rig.split,hipY=rig.hip;
 const tilt=(-nativeDirection*kick*.9)+pose.impact*pose.impactX*.033+pose.walk*pose.dx*Math.sin(Math.PI*pose.phase)*.045;
 const rx=x-hipX,ry=y-hipY;
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
 if(pose.death>0)py+=Math.sin(pose.death*Math.PI)*.045*torso;
 return{x:px,y:py};
}
function drawMeshTriangle(im,source,dest){
 const [a,b,c]=source,[p,q,r]=dest,sx=b.x-a.x,sy=b.y-a.y,tx=c.x-a.x,ty=c.y-a.y,det=sx*ty-tx*sy;
 if(Math.abs(det)<1e-8)return;
 const ax=((q.x-p.x)*ty-(r.x-p.x)*sy)/det,bx=((q.y-p.y)*ty-(r.y-p.y)*sy)/det;
 const cx=(sx*(r.x-p.x)-tx*(q.x-p.x))/det,dx=(sx*(r.y-p.y)-tx*(q.y-p.y))/det;
 const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 ctx.save();ctx.beginPath();for(let i=0;i<3;i++){const v=dest[i],vx=v.x-center.x,vy=v.y-center.y,len=Math.hypot(vx,vy)||1;const x=v.x+vx/len*.24,y=v.y+vy/len*.24;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.clip();
 ctx.transform(ax,bx,cx,dx,p.x-ax*a.x-cx*a.y,p.y-bx*a.x-dx*a.y);ctx.drawImage(im,0,0);ctx.restore();
}
function drawArticulatedMech(im,u,w,h,pose){
 const columns=w>210?9:6,rows=w>210?13:10,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
 const source=[],dest=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const x=i/columns,y=j/rows,v=deformMechVertex(u,x,y,pose);source.push({x:x*iw,y:y*ih});dest.push({x:(v.x-.5)*w,y:(v.y-1)*h});
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
  drawMeshTriangle(im,[source[a],source[b],source[d]],[dest[a],dest[b],dest[d]]);
  drawMeshTriangle(im,[source[a],source[d],source[c]],[dest[a],dest[d],dest[c]]);
 }
}
function mechAttachmentPoint(u,part='muzzle',t=clock){
 const visual=activeWardenVisual(u),b=unitBounds(u,visual),pose=animationPose(u,t,visual),rig=pose.rig;
 const locations={body:[rig.split,.34],right:[u.frame===1?.38:.30,.46],left:[.81,.39],legs:[rig.split,.79]};
 const baked=wardenMotionFrame(u,visual,pose),sample=baked?.frame?.[part];
 const source=visual?.[part]||(part==='muzzle'?(u.weapon==='missile'?[u.frame===2?.36:.69,.16]:rig.muzzle):(locations[part]||locations.body));
 const p=sample?{x:sample[0],y:sample[1]}:deformMechVertex(u,source[0],source[1],remainingPose(pose,baked));
 return{x:b.x+(pose.flip?1-p.x:p.x)*b.w,y:b.y+p.y*b.h};
}
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
 const im=u.team==='enemy'&&enemyArt[key]?enemyArt[key]:original;
 ctx.save();ctx.fillStyle=u.alive?'#050c12aa':'#090e13c9';ctx.beginPath();ctx.ellipse(p.x,p.y+scale*.025,scale*(.67+pose.brace*.05),scale*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!imageReady(original))return;
 ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h);if(pose.flip)ctx.scale(-1,1);
 if(u.team==='enemy'&&(baked?.frame||!enemyArt[key]))ctx.filter='sepia(.33) saturate(.7) brightness(.83)';
 if(!u.alive){const fall=smoothRange(.16,1,pose.death);ctx.globalAlpha=1-.32*fall;ctx.translate(scale*.18*fall,0);ctx.rotate(-.93*fall);ctx.scale(1-.18*fall,1-.18*fall);if(pose.death>=1)ctx.filter='brightness(.35) saturate(.35)'}
 const articulated=!reducedMotion&&(remaining.walk>.001||Math.abs(remaining.recoil)>.008||Math.abs(pose.impact)>.008||pose.brace>.008||(pose.death>0&&pose.death<1));
 if(baked?.frame){
  const {cell,columns}=baked.atlas,index=baked.frame.index;
  ctx.drawImage(baked.image,index%columns*cell,Math.floor(index/columns)*cell,cell,cell,-b.w/2,-b.h,b.w,b.h);
 }else if(articulated)drawArticulatedMech(im,u,b.w,b.h,remaining);
 else{if(u.alive&&!reducedMotion)ctx.rotate(Math.sin(t*.85+u.index)*.001);ctx.drawImage(im,-b.w/2,-b.h,b.w,b.h)}
 ctx.restore();
 if(!u.alive){drawMechSmoke(u,t,true);return}
 if(u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
 if(u.hp.body/u.max.body<.4||u.hp.right===0)drawMechSmoke(u,t);
 const q=project(u.vx,2.35,u.vz),width=Math.max(31,scale*.75);ctx.fillStyle='#0b141dde';ctx.fillRect(q.x-width/2-2,q.y-3,width+4,7);ctx.fillStyle=u.team==='ally'?'#9cbec8':'#d8997e';ctx.fillRect(q.x-width/2,q.y-1,width*u.hp.body/u.max.body,3);ctx.font=(W<760?'9':'10')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=u.team==='ally'?'#d7e3df':'#e5ae98';ctx.shadowColor='#06101a';ctx.shadowBlur=4;ctx.fillText(u.team==='ally'?PILOTS[u.index].call:u.name,q.x,q.y-9);ctx.shadowBlur=0;
}
function drawCover(x,z){const p=project(x,0,z),im=artImages.barricade;if(!imageReady(im))return;ctx.save();ctx.fillStyle='#050c1370';ctx.beginPath();ctx.ellipse(p.x,p.y+scale*.03,scale*.57,scale*.2,0,0,Math.PI*2);ctx.fill();const size=scale*1.65;ctx.drawImage(im,p.x-size*.5,p.y-size*.82,size,size);ctx.restore()}
function drawEffects(t){for(const e of effects){const phase=1-e.t;if(e.type==='shot'){
  const actor=battle.units.find(u=>u.id===e.actor),target=battle.units.find(u=>u.id===e.target),a=actor?mechAttachmentPoint(actor,'muzzle',t):project(e.x,1.4,e.z),b=target?mechAttachmentPoint(target,e.part||'body',t):project(e.tx,1.3,e.tz);ctx.save();ctx.globalAlpha=Math.min(1,e.t*3);ctx.lineCap='round';
  if(e.kind==='missile'){const q=Math.min(1,phase*1.1),x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q-Math.sin(q*Math.PI)*scale*1.1;ctx.strokeStyle='#f0cc9455';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,Math.min(a.y,b.y)-scale*1.2,x,y);ctx.stroke();ctx.shadowColor='#ffbe6b';ctx.shadowBlur=18;ctx.fillStyle='#fff1cd';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}
  else if(e.kind==='rail'){ctx.shadowColor='#a9d9ef';ctx.shadowBlur=15;ctx.strokeStyle='#a0dcf2';ctx.lineWidth=5*e.t;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=1.4;ctx.stroke()}
  else{const total=e.kind==='shotgun'?7:3;for(let i=0;i<total;i++){const q=Math.max(0,Math.min(1,phase*1.5-i*.09)),spread=e.kind==='shotgun'?(i-3)*3:0,x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q+spread*q;ctx.strokeStyle=i%2?'#ffcd8a':'#fff0ba';ctx.shadowColor='#ffb75a';ctx.shadowBlur=10;ctx.lineWidth=e.kind==='shotgun'?1.6:2;ctx.beginPath();ctx.moveTo(x-(b.x-a.x)*.12,y-(b.y-a.y)*.12);ctx.lineTo(x,y);ctx.stroke()}}
  if(phase<.3){ctx.globalAlpha=(1-phase/.3)*.8;ctx.fillStyle='#ffe5a6';ctx.shadowColor='#ffb04d';ctx.shadowBlur=25;ctx.beginPath();ctx.arc(a.x,a.y,scale*.18*(1-phase),0,Math.PI*2);ctx.fill()}ctx.restore();
 }else if(e.type==='boom'){
  const target=battle.units.find(u=>u.id===e.target),p=target?mechAttachmentPoint(target,e.part||'body',t):project(e.x,1.1,e.z),radius=scale*(e.big?1.1:.5);ctx.save();ctx.globalAlpha=e.t;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*(.3+phase));g.addColorStop(0,'#fff8dc');g.addColorStop(.22,'#ffda8f');g.addColorStop(.5,'#f2873c99');g.addColorStop(1,'#b54c1200');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,radius*(.3+phase),0,Math.PI*2);ctx.fill();for(let i=0;i<(e.big?22:13);i++){const angle=i*2.399,v=(.25+(i%5)*.19)*phase*radius*2;ctx.strokeStyle=i%2?'#ffba6c':'#fff2c6';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*v*.65,p.y+Math.sin(angle)*v*.65+phase*phase*scale*.5);ctx.lineTo(p.x+Math.cos(angle)*v,p.y+Math.sin(angle)*v+phase*phase*scale*.5);ctx.stroke()}ctx.restore();
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
 ctx.save();if(!reducedMotion&&shake>.15){ctx.translate(Math.sin(t*110)*shake,Math.cos(t*93)*shake*.5)}
 for(let sum=-5;sum<=24;sum++)for(let x=-3;x<13;x++){const z=sum-x;if(z< -3||z>12)continue;textureTile(x,z,x>=0&&x<10&&z>=0&&z<10)}
 // The playable perimeter is a fine painted ground boundary, not a raised board.
 polygon([project(-.5,.01,-.5),project(9.5,.01,-.5),project(9.5,.01,9.5),project(-.5,.01,9.5)],null,'#b7c1c84a');
 for(let x=0;x<10;x++)for(let z=0;z<10;z++){
  const key=x+','+z;if(reachable?.has(key)&&reachable.get(key)>0)tile(x,z,'#77b4c52a','#9ccdda67',.008);
  if(u&&action==='fire'&&distance(u,{x,z})<=weapon(u.weapon).range)tile(x,z,'#dd9b6b13','#cd9b7230',.008);
  if(hover?.x===x&&hover?.z===z)tile(x,z,'#e7be6e3c','#eac07e',.016);
 }
 for(const unit of battle.units){advanceUnitAnimation(unit,t,frameDt);if(unit.team==='ally'&&unit.alive)tile(unit.vx,unit.vz,selected===unit.index?'#e6b76a2d':'#a0c6d018',selected===unit.index?'#e6b76a':'#83b0c080',.02);else if(unit.alive&&unit.id===lockedTarget)tile(unit.vx,unit.vz,'#d8877330','#d89279',.02)}
 const entities=[...Array.from(battle.cover,key=>{const[x,z]=key.split(',').map(Number);return{x,z,type:'cover'}}),...battle.units.map(u=>({x:u.vx,z:u.vz,type:'unit',u}))].sort((a,b)=>(a.x+a.z-(a.u&&!a.u.alive?2:0))-(b.x+b.z-(b.u&&!b.u.alive?2:0)));
 for(const e of entities)e.type==='cover'?drawCover(e.x,e.z):drawUnit(e.u,t);
 drawEffects(t);ctx.restore();rain(t,true);
 if(['warden','kestrel','basilisk','concrete','barricade'].some(k=>!imageReady(artImages[k]))){ctx.font='11px Inter,Arial,sans-serif';ctx.fillStyle='#e7d5b5';ctx.textAlign='center';ctx.fillText('PREPARING BATTLEFIELD ART…',W/2,H*.6)}
}
function draw(ts){
 const elapsed=Math.max(0,(ts-last)/1000||1/60),dt=Math.min(.05,elapsed);last=ts;clock+=elapsed;frameDt=dt;
 ctx.setTransform(DPR,0,0,DPR,0,0);background();if(battle)battlefield(clock);else if(page==='hangar')hangar(clock);
 effects.forEach(e=>e.t-=elapsed*(e.type==='shot'?(e.kind==='missile'?2:3.5):e.type==='step'?1.8:e.type==='skill'?1.2:1.6));effects=effects.filter(e=>e.t>0);shake*=Math.exp(-dt*13);requestAnimationFrame(draw);
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
canvas.addEventListener('pointerdown',async e=>{if(!battle||battle.busy||!$('#modal').hidden)return;let picked=pick(e.clientX,e.clientY),p=picked?{x:picked.x,z:picked.z}:screenTile(e.clientX,e.clientY),u=current();hover=p;if(picked?.team==='enemy')lockedTarget=picked.id;if(picked?.team==='ally'){selected=picked.index;renderBattle();persist();return}if(!u)return;if(action==='move'){if(picked?.team==='enemy'){action='fire';if(W<760)targetPanelOpen=true;renderBattle();persist();toast('Target acquired. Select a subsystem, then tap again to fire.');return}let cost=paths(u).get(p.x+','+p.z);if(!cost)return toast('Choose a highlighted tile within movement range');battle.busy=true;await moveUnit(u,p.x,p.z,cost);battle.busy=false;renderBattle();persist()}else{if(!picked||picked.team!=='enemy')return toast('Select a hostile mech');let w=weapon(u.weapon);if(u.hp.right<=0)return toast('Weapon arm destroyed. Move or brace to support your lance.');if(u.ap<w.ap)return toast('Not enough AP. Select another unit or end your turn.');if(distance(u,picked)>w.range)return toast('Target out of range. Move closer.');if(picked.hp[targetPart]<=0)return toast('Subsystem already destroyed. Select another target part.');battle.busy=true;renderBattle();await shoot(u,picked,targetPart);if(checkEnd())return;battle.busy=false;renderBattle();persist()}});
document.addEventListener('keydown',e=>{if(!battle||battle.busy||!$('#modal').hidden||e.repeat)return;let key=e.key.toLowerCase();if(['m','f','q','e','1','2','3'].includes(key))e.preventDefault();if(key==='m'){action='move';renderBattle();persist()}if(key==='f'){action='fire';renderBattle();persist()}if(key==='q')skill();if(key==='e')endTurn();if(['1','2','3'].includes(key)){let i=+key-1;if(battle.units.find(u=>u.team==='ally'&&u.index===i&&u.alive)){selected=i;renderBattle();persist()}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#modal').hidden){closeModal();return}if(targetPanelOpen){targetPanelOpen=false;renderBattle();return}}if(e.key==='Tab'&&!$('#modal').hidden){let btns=[...$('#modal').querySelectorAll('button')],first=btns[0],last=btns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('.brand').onclick=e=>{e.preventDefault();if(!battle){page='hangar';render()}};
const resumedSortie=restoreSortie();if(resumedSortie)page='contracts';render();requestAnimationFrame(draw);if(resumedSortie){toast('Sortie resumed. Your company is still in the fight.');if(resumedSortie.enemyPending)void endTurn();}
