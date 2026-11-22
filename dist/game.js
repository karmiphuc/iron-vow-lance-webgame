'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene');
let ctx=canvas.getContext('2d');
// The default rule RNG is unchanged; the required scene-test API can seed it independently of visual noise.
let ruleRandom=()=>Math.random();
const WEAPONS=[{id:'rifle',name:'Kestrel AR-8',type:'ASSAULT RIFLE',burst:8,damage:36,range:5,ap:3,weight:14,price:0,desc:'Reliable burst fire. Balanced range and accuracy.'},{id:'shotgun',name:'Breacher SG-4',type:'SCATTER CANNON',burst:12,scatter:true,damage:60,range:3,ap:3,weight:18,price:1500,desc:'A landed shell throws pellets that each roll their own hit location unless a shield blocks it.'},{id:'missile',rounds:2,name:'Vesper MRL',type:'MISSILE POD',damage:45,range:7,ap:4,weight:22,price:2400,desc:'Guided ordnance ignores cover penalties. The launcher cannot counter.'},{id:'rail',name:'Longbow R-12',type:'RAIL CANNON',damage:70,range:8,ap:5,weight:26,price:3600,desc:'Precision anti-armor fire. Powerful, but demanding.'},
 {id:'hailstorm',name:'Hailstorm M-8',type:'ROTARY GUN',burst:12,damage:49,range:5,ap:4,weight:21,price:2200,desc:'Spins up for sustained fire at medium range.'},
 {id:'rampart',name:'Rampart AC-40',type:'AUTOCANNON',damage:61,range:6,ap:5,weight:25,price:2900,desc:'A single heavy shell with a longer reach than the scatter cannon.'},
 {id:'breaker',name:'Breaker Maul',type:'IMPACT MAUL',damage:66,range:1,ap:4,weight:20,price:1600,melee:true,desc:'An overhead strike for heavy damage against adjacent targets.'},
 {id:'cleaver',name:'Arc Cleaver',type:'HEATED BLADE',damage:40,range:1,ap:2,weight:12,price:1200,melee:true,desc:'A quick sweep for repeated strikes against an adjacent target.'},
 {id:'piledriver',name:'Piledriver',type:'HYDRAULIC RAM',damage:59,range:1,ap:3,weight:18,price:2100,melee:true,pierce:.75,desc:'A powered point-blank thrust that ignores 75% of armor.'},
 {id:'blade',name:'Raijin HB-9',type:'HEAT BLADE',damage:64,range:1,ap:3,weight:16,price:2200,melee:true,desc:'A planted step and a committed lunge. Ignores cover against adjacent targets.'},
 {id:'sidewinder',name:'Sidewinder SM-2',type:'SUBMACHINE GUN',burst:12,damage:25,range:4,ap:2,weight:10,price:900,motion:'rifle',falloff:{start:2,step:.05},desc:'A low-AP burst for close work. Beyond 2 tiles, each extra tile costs 5 more accuracy points.'},
 {id:'trident',name:'Trident BR-5',type:'BULLPUP CARBINE',burst:8,damage:43,range:5,ap:3,weight:16,price:2000,motion:'rifle',desc:'A premium service carbine. Hits harder than Kestrel at the same reach and AP.'},
 {id:'forge',name:'Forge SG-12',type:'SLUG SHOTGUN',burst:12,scatter:true,damage:61,range:2,ap:3,weight:21,price:2300,motion:'rampart',pierce:.55,desc:'A landed shell sends 12 slugs into randomly rolled parts, punching through 55% of the target’s armor.'},
 {id:'ember',name:'Ember PC-4',type:'PLASMA SHOTGUN',burst:12,scatter:true,damage:53,range:4,ap:3,weight:19,price:2800,motion:'rail',desc:'A single discharge fans out into 12 plasma bolts, each rolling its own hit location on a hit.'},
 {id:'watchman',name:'Watchman DMR-8',type:'MARKSMAN RIFLE',damage:47,range:8,ap:4,weight:17,price:2600,motion:'rampart',aim:.08,desc:'A stabilised optic adds 8 percentage points of accuracy. Lower impact per shot than Longbow.'},
 {id:'falcon',name:'Falcon AC-7',type:'FIELD AUTOCANNON',damage:57,range:7,ap:4,weight:23,price:3200,motion:'rampart',aim:-.08,desc:'Fires for 1 AP less than Rampart. Heavy vibration costs 8 percentage points of accuracy.'},
 {id:'cerberus',rounds:2,name:'Cerberus RP-6',type:'ROCKET POD',damage:76,range:6,ap:5,weight:29,price:3900,motion:'missile',desc:'An unguided two-rocket salvo. Cover reduces accuracy and the launcher cannot counter.'},
 {id:'obelisk',name:'Obelisk R-9',type:'SIEGE RAIL',damage:90,range:9,ap:6,weight:32,price:4800,motion:'rail',desc:'A long accelerator delivers the largest single shot at a steep AP cost.'},
 {id:'rivet',name:'Rivet MG-12',type:'UNDER-CARRY MACHINE GUN',burst:12,damage:60,range:5,ap:4,weight:24,price:8600,rep:120,motion:'hailstorm',falloff:{start:3,step:.05},desc:'A belt-fed gun slung below the fist. Beyond 3 tiles, each extra tile costs 5 more accuracy points.'},
 {id:'parallax',name:'Parallax SR-10',type:'UNDER-CARRY SNIPER',damage:78,range:10,ap:6,weight:28,price:13500,rep:180,motion:'rail',aim:.06,pierce:.30,desc:'A 10-tile accelerator rifle with +6 aim and 30% armor pierce. Ridges block its shots.'},
 {id:'hatchet',name:'Cinder Hatchet',type:'BREACHING AXE',damage:47,range:1,ap:2,weight:13,price:1950,melee:true,motion:'cleaver',desc:'A premium breaching axe. Hits harder than Arc Cleaver at the same AP.'},
 {id:'pike',name:'Pilum Pike',type:'PILE BUNKER',damage:52,range:1,ap:3,weight:15,price:1750,melee:true,motion:'piledriver',pierce:.90,desc:'A lower-cost alternative to Piledriver. Its lighter strike ignores 90% of armor.'},
 {id:'tonfa',name:'Ward Tonfa',type:'IMPACT BATON',damage:32,range:1,ap:2,weight:9,price:900,melee:true,motion:'cleaver',aim:.13,desc:'A controlled strike with 13 extra percentage points of accuracy. Best for hitting a specific part.'},
 {id:'anchor-hammer',name:'Anchor Hammer',type:'SIEGE HAMMER',damage:86,range:1,ap:5,weight:27,price:2750,melee:true,motion:'breaker',desc:'A slow overhead blow with a heavy counterweight. Commit to a single decisive strike.'},
 {id:'morrow',rounds:2,name:'Morrow AC-2',type:'TWIN AUTOCANNON',damage:59,range:6,ap:4,builtIn:true,desc:'Two staggered shells from a sliding carriage. Designed to break a line at medium range.'},
 {id:'locust',rounds:2,name:'Locust MRL-24',type:'GUIDED MISSILE RACKS',damage:47,range:8,ap:4,builtIn:true,guided:true,desc:'Alternating launches from the two shoulder racks. Guided missiles ignore cover penalties.'},
 {id:'breach-gauntlet',name:'Breach Gauntlet',type:'ACTUATED GRIPPER',damage:53,range:1,ap:3,builtIn:true,melee:true,desc:'A braced punch from the left gripper. Strongest when the enemy closes in.'},
 {id:'pulse-bash',name:'Pulse Bash',type:'EMITTER STRIKE',damage:33,range:1,ap:2,builtIn:true,melee:true,desc:'A quick close-range strike with the left emitter housing.'},
 {id:'aegis-cleave',name:'Charged Arc Cleaver',type:'REACTOR CLEAVE',damage:38,range:1,ap:5,builtIn:true,melee:true,hand:'right'},
 {id:'aegis-bash',name:'Charged Shield Bash',type:'HYDRAULIC IMPACT',damage:40,range:1,ap:5,builtIn:true,melee:true},
 {id:'needle-carbine',name:'Needle carbine',type:'SCOUT CARBINE',burst:8,damage:23,range:5,ap:5,builtIn:true,effect:'rifle',scout:'carbine'},
 {id:'flechette-scattergun',name:'Flechette scattergun',type:'SCOUT SCATTERGUN',burst:12,scatter:true,damage:31,range:2,ap:5,builtIn:true,effect:'shotgun',scout:'scatter'},
 {id:'signal-knife',name:'Signal knife',type:'SCOUT KNIFE',damage:26,range:1,ap:5,builtIn:true,effect:'cleaver',scout:'knife',melee:true,pierce:.4},
 {id:'vesper-shoulder',rounds:2,name:'Vesper Shoulder Pod',type:'GUIDED MISSILE POD',damage:45,range:7,ap:4,price:2400,shoulder:true,desc:'Launch guided missiles across cover from a compatible right-shoulder mount.'}
];
const FREE_HAND_COUNTER={id:'free-hand',damage:10,range:1,ap:0,melee:true};
const BURST_BONUS=1.15;
const volleyBudget=(w,amount)=>w.burst?Math.round(amount*BURST_BONUS):amount;
const burstLabel=w=>w.scatter?w.burst+' PELLETS':w.burst?w.burst+' RD BURST':'';
const SHIELDS=[
 {id:'bulwark-shield',name:'Bulwark B-2',type:'STEEL BUCKLER',reduction:.20,price:950,desc:'Stamped plate on a shock-isolated grip. Freeport escort crews fit it for close work.'},
 {id:'citadel-shield',name:'Citadel T-6',type:'CERAMIC TOWER SHIELD',reduction:.35,price:2200,desc:'Stacked ceramic and a replaceable impact bar, built for breach crews under heavy fire.'}
];
const shieldItem=id=>SHIELDS.find(item=>item.id===id);
const AEGIS_TOWER={id:'aegis-tower',name:'Aegis Tower Shield',reduction:.20};
const equippedShield=u=>u?.frame===BULWARK_FRAME?AEGIS_TOWER:shieldItem(u?.shield);
const activeShield=u=>u?.alive&&u.hp.left>0?equippedShield(u):undefined;
const shieldPercent=shield=>Math.round(shield.reduction*100)+'%';
const SHIELD_HELP='Every landed hit goes to the left arm for 0 AP, from any direction. The arm takes reduced damage and absorbs the whole hit that breaks it. A shield occupies the melee slot. Repair the arm to restore the shield.';
const HOSTILE_LIVERIES=[
 ['#626d4f','#373b38'],['#515e4d','#64696b'],
 ['#626a6d','#373c3e'],['#686967','#623b40'],
 ['#383b3e','#56634b'],['#3e4142','#6c4046'],
 ['#6f3d43','#404641'],['#683a40','#676c69']
];
// Three-channel reference liveries and swatches from mercenary-command.html:76–77.
const PAINT_SWATCHES=['#4f5839','#7a7556','#9a8b68','#c9d0d4','#d9dcd8','#52606a','#2b4f9e','#1f2a3a','#2c2d33','#18191c','#7a3428','#c0283a','#e0621a','#f0b030','#c99a2a','#5fd4c4'];
const PAINT_PRESETS=[
 ['Factory',null,null,null],
 ['Field Olive','#4f5839','#343a28','#e0621a'],['Dune','#9a8b68','#5c5446','#d0702a'],
 ['Slate','#52606a','#323c43','#f0b030'],['Arctic','#c9d0d4','#6c7880','#2f9fd0'],
 ['Federation','#d9dcd8','#2b4f9e','#c8302a'],['Oni Crimson','#474a51','#1e1f23','#c0283a'],
 ['Midnight','#1f2a3a','#0f141c','#5fd4c4'],['Hazard','#c99a2a','#2a2a28','#1e1e1c'],['Rust','#7a3428','#3a2420','#d9b45a'],
 ['Bone plates','#c6bd9f','#534c43','#e08e3b'],['Olive plates','#708657','#39432c','#d7a458'],
 ['Slate plates','#577eac','#303a4b','#d09450'],['Sand plates','#c19960','#5c4936','#f0b030'],
 ['Graphite plates','#555e69','#2c3036','#79bac8'],['Ivory plates','#d9ddd5','#6c7880','#c8302a'],
 // The original plate picker displayed #b0a88d on its Factory chip.
 ['Neutral plates','#b0a88d','#343b42','#e08e3b']
];
const PAINT_CHANNELS=[['p','Primary','#c6bd9f'],['s','Secondary','#343b42'],['a','Accent','#e08e3b']];
const fieldPaint=window.IronVowFieldPaint;
const paintChannel=(u,channel)=>(channel==='p'?u.paint:u.trim?.[channel])?.toLowerCase()??null;
const activeLivery=(u,preset)=>PAINT_CHANNELS.every(([channel],index)=>paintChannel(u,channel)===preset[index+1]);
function setPaintChannel(u,channel,color){
 if(channel==='p'){if(color)u.paint=color;else delete u.paint;return;}
 if(color)(u.trim??={})[channel]=color;
 else if(u.trim){delete u.trim[channel];if(!Object.keys(u.trim).length)delete u.trim;}
}
const RANGED=WEAPONS.filter(w=>!w.melee&&!w.builtIn&&!w.shoulder),MELEE=WEAPONS.filter(w=>w.melee&&!w.builtIn);
const ARMORY_CLASSES={assault:'Assault',strike:'Strike',melee:'Melee',shields:'Shields'};
const armoryClass=w=>w.melee?'melee':w.range>=6?'strike':'assault';
const armoryOptions=Object.fromEntries(Object.keys(ARMORY_CLASSES).map(key=>[key,
 key==='shields'?SHIELDS:[...RANGED,...MELEE].filter(w=>armoryClass(w)===key).sort((a,b)=>a.price-b.price)
]));
const validPaint=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const FRAMES=[{name:'WARDEN',model:'WDN–07',role:'ASSAULT',color:'#899681',hp:160,arm:92,leg:110,move:4,armor:5,cost:75000},{name:'KESTREL',model:'KST–12',role:'RECON',color:'#b6a37c',hp:126,arm:78,leg:100,move:5,armor:2,cost:50000},{name:'BASILISK',model:'BSK–04',role:'SUPPORT',color:'#708c92',hp:180,arm:100,leg:90,move:3,armor:7,cost:105000}];
const PILOTS=[{name:'Mara Voss',call:'ROOK',skill:'Overdrive',desc:'+2 AP this turn. Once per battle.',color:'#9cae8b'},{name:'Jin Takeda',call:'GHOST',skill:'Deadeye',desc:'Next attack deals 50% more damage. Once per battle.',color:'#c1a477'},{name:'Elena Ortiz',call:'ANCHOR',skill:'Field repair',desc:'Restore 45 body HP. Once per battle.',color:'#83a4ac'}];
const HIRES=[
 {name:'Nadi Sato',call:'SCOUT',skill:'Target Paint',desc:'Mark a hostile within 6 tiles. The next allied attack gains 20 percentage points of accuracy. Once per battle.',color:'#9fc19a',glyph:'binoculars',fee:1100},
 {name:'Dax Mercer',call:'MARSHAL',skill:'Command Relay',desc:'Spend 1 AP to order another pilot within 5 tiles. Their next paid attack this round costs up to 2 AP less. Once per battle.',color:'#d3b07b',glyph:'shield-chevron',fee:1500},
 {name:'Inez Calder',call:'SAPPER',skill:'Breach Charge',desc:'Spend 1 AP to prime a ranged charged shot that strikes arms and legs. It gains 60% weapon power and ignores half the armor. A hit stops that counter. Once per battle.',color:'#eaa675',glyph:'lightning',fee:1400},
 {id:'signal',name:'Lio Vega',call:'SIGNAL OFFICER',skill:'Blackout',desc:'Spend 1 AP to jam a hostile within 6 tiles. It cannot counter and loses 20 accuracy points this round. Once per battle.',color:'#9daee2',glyph:'binoculars',fee:1700},
 {name:'Tess Kade',call:'RETRIEVER',skill:'Recovery Rig',desc:'Spend 2 AP to restore 30 HP to the weakest damaged arm or legs on yourself or an ally within 3 tiles. Revives disabled limbs. Once per battle.',color:'#80c6c2',glyph:'wrench',fee:1500}
];
const CREW=[...PILOTS,...HIRES],LANCE_SLOTS=[0,1,2];
const AUX_SLOT=3;
const SAPPER=5,SIGNAL=6,RETRIEVER=7;
const pilotId=i=>CREW[i].id??CREW[i].call.toLowerCase();
const pilotKind=id=>CREW.findIndex((_,kind)=>pilotId(kind)===id);
const pilotClass=(i,career=save)=>pilotKind(career.units[i].pilotId??pilotId(i));
const pilotProfile=i=>CREW[pilotClass(i)];
const TRAINING_LEVELS=[1,3,5,6,8,10],TRAINING_POINT_LEVELS=[1,2,3,4,5,6,8,10],DOCTRINE_RANK=2;
const PILOT_TREES=[
 [
  {name:'Vanguard',glyph:'arrows-out-cardinal',nodes:[
   {id:'pathfinder',name:'Pathfinder',label:'+1 free tile',effects:{move:1}},
   {id:'point-plate',name:'Point Plate',label:'+2 armor',effects:{armor:2}},
   {id:'redline',name:'Redline',label:'Overdrive grants +4 AP',effects:{overdrive:2}},
   {id:'marching-orders',name:'Marching Orders',label:'Overdrive keeps your remaining free movement',effects:{overdriveMove:true}},
   {id:'brace-drill',name:'Brace Drill',label:'Brace costs 1 AP',effects:{braceAP:1}},
   {id:'spearhead',name:'Spearhead',label:'Overdrive also Braces for free',effects:{overdriveBrace:true}}
  ]},
  {name:'Breacher',glyph:'crosshair',nodes:[
   {id:'close-quarters',name:'Close Quarters',label:'+15% melee power',effects:{meleePower:.15}},
   {id:'breach-drill',name:'Breach Drill',label:'+10 percentage points to melee hit chance',effects:{meleeHit:.10}},
   {id:'follow-through',name:'Follow Through',label:'Strike costs 1 less AP',effects:{strikeAP:1}},
   {id:'close-guard',name:'Close Guard',label:'A successful Strike also Braces',effects:{strikeBrace:true}},
   {id:'breach-point',name:'Breach Point',label:'Melee bypasses at least half of armor',effects:{meleePierce:.5}},
   {id:'momentum',name:'Momentum',label:'A Strike that disables a unit refunds 1 AP',effects:{strikeRefund:1}}
  ]}
 ],
 [
  {name:'Marksman',glyph:'crosshair',nodes:[
   {id:'sighter',name:'Sighter',label:'+8 percentage points to ranged hit chance',effects:{rangedHit:.08}},
   {id:'ballistics',name:'Ballistics',label:'+10% ranged power',effects:{rangedPower:.10}},
   {id:'rangefinder',name:'Rangefinder',label:'+1 tile of ranged reach',effects:{range:1}},
   {id:'set-aim',name:'Set Aim',label:'Ranged fire ignores cover penalties while Braced',effects:{braceAim:true}},
   {id:'deep-watch',name:'Deep Watch',label:'+1 tile of ranged counter reach',effects:{counterRange:1}},
   {id:'clean-exit',name:'Clean Exit',label:'A ranged Deadeye kill refunds the shot’s AP',effects:{deadeyeRefund:true}}
  ]},
  {name:'Saboteur',glyph:'lightning',nodes:[
   {id:'weak-points',name:'Weak Points',label:'+15% power against arms and legs',effects:{limbPower:.15}},
   {id:'cockpit-read',name:'Cockpit Read',label:'+2 percentage points cockpit hit chance per attack',effects:{pilotHit:.10}},
   {id:'killshot',name:'Killshot',label:'Deadeye doubles attack power',effects:{deadeye:.50}},
   {id:'system-pierce',name:'System Pierce',label:'Hits on arms or legs bypass at least half of armor',effects:{limbPierce:.5}},
   {id:'signal-jam',name:'Signal Jam',label:'Destroy an arm to stop that attack’s counter',effects:{armJam:true}},
   {id:'cascade',name:'Cascade',label:'Deadeye stays primed when your attack destroys a limb',effects:{deadeyeCascade:true}}
  ]}
 ],
 [
  {name:'Engineer',glyph:'wrench',nodes:[
   {id:'bulkhead',name:'Bulkhead',label:'+20 maximum body HP',effects:{body:20}},
   {id:'spare-parts',name:'Spare Parts',label:'Field Repair restores up to 65 body HP',effects:{repair:20}},
   {id:'rebuild',name:'Rebuild',label:'Field Repair also restores up to 30 HP to the weakest damaged limb',effects:{limbRepair:30}},
   {id:'service-shield',name:'Service Shield',label:'Field Repair also Braces',effects:{repairBrace:true}},
   {id:'depot-crew',name:'Depot Crew',label:'Field Repair can restore 30 HP to each damaged limb',effects:{repairAll:true}},
   {id:'failsafe',name:'Failsafe',label:'An unused Field Repair triggers on lethal body damage',effects:{repairFailsafe:true}}
  ]},
  {name:'Sentinel',glyph:'shield-chevron',nodes:[
   {id:'reserve-cell',name:'Reserve Cell',label:'+1 AP at the start of each round',effects:{roundAP:1}},
   {id:'reactive-brace',name:'Reactive Brace',label:'Brace blocks 65% of incoming damage',effects:{brace:.15}},
   {id:'return-fire',name:'Return Fire',label:'+25% counterattack power',effects:{reactionPower:.25}},
   {id:'guard-arc',name:'Guard Arc',label:'While Braced, ranged counters reach 2 tiles farther',effects:{braceCounterRange:2}},
   {id:'counterguard',name:'Counterguard',label:'Firing a counter also Braces',effects:{counterBrace:true}},
   {id:'shield-net',name:'Shield Net',label:'While Braced, adjacent allies take 20% less damage',effects:{shieldNet:.2}}
  ]}
  ],
  [
   {name:'Spotter',glyph:'crosshair',nodes:[
    {id:'scout-optics',name:'Long Glass',label:'+2 tiles Target Paint range',effects:{paintRange:2}},
    {id:'scout-grid',name:'Grid Reference',label:'+10 percentage points Target Paint accuracy',effects:{paintAim:.10}},
    {id:'scout-track',name:'Persistent Track',label:'Target Paint covers 2 allied attacks',effects:{paintShots:2}},
    {id:'scout-shot',name:'Precision Optics',label:'+2 percentage points cockpit hit chance per attack',effects:{pilotHit:.10}},
    {id:'scout-breach',name:'Weak Point',label:'Painted targets take 20% more allied weapon damage',effects:{paintPower:.20}},
    {id:'scout-lock',name:'Perfect Track',label:'Target Paint covers 3 allied attacks',effects:{paintShots:3}}
   ]},
   {name:'Outrider',glyph:'arrows-out-cardinal',nodes:[
    {id:'scout-stride',name:'Trailblazer',label:'+1 free movement tile',effects:{move:1}},
    {id:'scout-armor',name:'Skirmish Plating',label:'+2 armor',effects:{armor:2}},
    {id:'scout-drift',name:'Silent Mark',label:'Target Paint keeps free movement',effects:{paintMove:true}},
    {id:'scout-screen',name:'Recon Screen',label:'Target Paint also Braces',effects:{paintBrace:true}},
    {id:'scout-range',name:'Forward Observer',label:'+1 tile ranged reach',effects:{range:1}},
    {id:'scout-sprint',name:'Ghost Trail',label:'+2 free movement tiles total',effects:{move:2}}
   ]}
  ],
  [
   {name:'Fire Director',glyph:'crosshair',nodes:[
    {id:'marshal-link',name:'Wideband',label:'+2 tiles Command Relay range',effects:{relayRange:2}},
    {id:'marshal-aim',name:'Fire Solution',label:'Ordered attacks gain 12 percentage points of accuracy',effects:{relayAim:.12}},
    {id:'marshal-volley',name:'Rolling Volley',label:'Command Relay covers 2 paid attacks',effects:{relayShots:2}},
    {id:'marshal-power',name:'Concentrate Fire',label:'Ordered attacks gain 20% weapon power',effects:{relayPower:.20}},
    {id:'marshal-comm',name:'Signal Corps',label:'Command Relay costs 0 AP',effects:{relayFree:true}},
    {id:'marshal-barrage',name:'Grand Battery',label:'Command Relay discounts up to 3 AP per attack',effects:{relayDiscount:3}}
   ]},
   {name:'Maneuver',glyph:'arrows-out-cardinal',nodes:[
    {id:'marshal-step',name:'Lead the Advance',label:'+1 free movement tile',effects:{move:1}},
    {id:'marshal-body',name:'Command Plating',label:'+25 body HP',effects:{body:25}},
    {id:'marshal-shield',name:'Hold the Line',label:'Command Relay also Braces the ordered ally',effects:{relayBrace:true}},
    {id:'marshal-lane',name:'Clear the Lane',label:'Command Relay keeps the Marshal’s free movement',effects:{relayMove:true}},
    {id:'marshal-budget',name:'Double Time',label:'+1 AP every round',effects:{roundAP:1}},
    {id:'marshal-vector',name:'Moving Fire',label:'Ordered attack keeps the ally’s free movement',effects:{relayKeepMove:true}}
   ]}
  ],
  [
   {name:'Breaker',glyph:'crosshair',nodes:[
    {id:'sapper-shaped',name:'Shaped Charge',label:'Breach Charge power bonus rises to 80%',effects:{breachPower:.80}},
    {id:'sapper-fuse',name:'Fuse Cutter',label:'+15 accuracy points on charged shots',effects:{breachAim:.15}},
    {id:'sapper-drill',name:'Drill Head',label:'Charged shots ignore 75% of armor',effects:{breachPierce:.75}},
    {id:'sapper-core',name:'Tandem Core',label:'Breach Charge power bonus rises to 100%',effects:{breachPower:1}},
    {id:'sapper-gap',name:'Armor Gap',label:'Charged shots ignore all armor',effects:{breachPierce:1}},
    {id:'sapper-twin',name:'Twin Charge',label:'Prime two charged shots at once',effects:{breachShots:2}}
   ]},
   {name:'Mobile Demolition',glyph:'arrows-out-cardinal',nodes:[
    {id:'sapper-route',name:'Breach Route',label:'+1 free movement tile',effects:{move:1}},
    {id:'sapper-liner',name:'Blast Liner',label:'+25 body HP',effects:{body:25}},
    {id:'sapper-flow',name:'Running Fuse',label:'Priming and firing a charge keep free movement',effects:{breachMove:true}},
    {id:'sapper-shield',name:'Blast Shield',label:'Priming a charge also Braces',effects:{breachBrace:true}},
    {id:'sapper-reach',name:'Stand-off Kit',label:'+1 tile ranged reach',effects:{range:1}},
    {id:'sapper-impulse',name:'Controlled Demolition',label:'A charged shot that destroys a limb refunds its attack AP',effects:{breachRefund:true}}
   ]}
  ],
  [
   {name:'Jammer',glyph:'binoculars',nodes:[
    {id:'signal-band',name:'Wideband Array',label:'+2 tiles Blackout range',effects:{blackoutRange:2}},
    {id:'signal-noise',name:'Noise Floor',label:'Blackout penalty rises to 30 accuracy points',effects:{blackoutAim:.30}},
    {id:'signal-load',name:'System Load',label:'Blackout drains 2 AP on the enemy turn',effects:{blackoutAP:2}},
    {id:'signal-null',name:'Null Channel',label:'Blackout penalty rises to 40 accuracy points',effects:{blackoutAim:.40}},
    {id:'signal-horizon',name:'Over the Horizon',label:'Blackout range gains 3 tiles total',effects:{blackoutRange:3}},
    {id:'signal-denial',name:'Total Denial',label:'Blackout drains 4 AP on the enemy turn',effects:{blackoutAP:4}}
   ]},
   {name:'Screen',glyph:'shield-chevron',nodes:[
    {id:'signal-march',name:'Marching Array',label:'+1 free movement tile',effects:{move:1}},
    {id:'signal-harden',name:'Hardened Cab',label:'+25 body HP',effects:{body:25}},
    {id:'signal-shield',name:'Screening Pulse',label:'Using Blackout also Braces',effects:{blackoutBrace:true}},
    {id:'signal-passive',name:'Passive Array',label:'Blackout costs 0 AP',effects:{blackoutFree:true}},
    {id:'signal-roam',name:'Roaming Screen',label:'Blackout keeps free movement',effects:{blackoutMove:true}},
    {id:'signal-anchor',name:'Lock the Drive',label:'Blackout also stops enemy movement for the round',effects:{blackoutHold:true}}
   ]}
  ],
  [
   {name:'Rescue Crew',glyph:'first-aid-kit',nodes:[
    {id:'retriever-reach',name:'Reach Arm',label:'+2 tiles Recovery Rig range',effects:{recoveryRange:2}},
    {id:'retriever-spares',name:'Spare Actuators',label:'Recovery Rig restores up to 45 HP',effects:{recoveryHP:45}},
    {id:'retriever-triage',name:'Triage Rig',label:'Recovery Rig restores every damaged limb',effects:{recoveryAll:true}},
    {id:'retriever-cover',name:'Recovery Screen',label:'The recovered unit also Braces',effects:{recoveryBrace:true}},
    {id:'retriever-servo',name:'Heavy Servos',label:'Recovery Rig restores up to 60 HP per limb',effects:{recoveryHP:60}},
    {id:'retriever-refit',name:'Field Refit',label:'Recovered limbs finish at 75% HP or higher',effects:{recoveryFloor:.75}}
   ]},
   {name:'Wreck Tech',glyph:'wrench',nodes:[
    {id:'retriever-bounty',name:'Salvage License',label:'+300 CR if the Retriever survives a win',effects:{wreckBonus:300}},
    {id:'retriever-route',name:'Clear a Route',label:'+1 free movement tile',effects:{move:1}},
    {id:'retriever-rolling',name:'Rolling Repair',label:'Recovery Rig keeps free movement',effects:{recoveryMove:true}},
    {id:'retriever-patch',name:'Hot Swap',label:'Recovery Rig restores up to 50 HP',effects:{recoveryHP:50}},
    {id:'retriever-lift',name:'Heavy Lift',label:'Recover a second wreck if present and the Retriever survives the win',effects:{wreckExtra:1}},
    {id:'retriever-second',name:'Second Chance',label:'Use Recovery Rig twice per battle',effects:{recoveryTwice:true}}
   ]}
  ]
];
FRAMES.push(
 {name:'GATECRASHER',model:'HV–09',role:'BREACH',color:'#a94e3c',hp:198,arm:112,leg:116,move:2,armor:8,cost:350000,
  native:'gatecrasher',weapon:'morrow',brief:'The twin cannon is standard. Fit an Arc Cleaver or a right-shoulder Vesper pod in the Workshop.'},
 {name:'CICADA',model:'ML–14',role:'FIRE SUPPORT',color:'#81885e',hp:148,arm:84,leg:95,move:3,armor:4,cost:300000,
  native:'cicada',weapon:'locust',melee:'pulse-bash',brief:'The integrated Locust racks fire guided missiles across cover. Keep the launcher behind the line.'}
);
// Foundry IDs are appended so older career assignments and backups retain their meaning.
FRAMES.push(
 {name:'VALKYRIE',model:'VLK–01',role:'STRIKER',color:'#c9ccd0',hp:135,arm:85,leg:95,move:5,armor:3,foundry:3,cost:180000,weapon:'rifle'},
 {name:'ONI',model:'ONI–09',role:'DUELIST',color:'#8a3a40',hp:150,arm:105,leg:100,move:5,armor:4,foundry:4,cost:205000,weapon:'rifle',melee:'blade'},
 {name:'BEHEMOTH',model:'BHM–22',role:'ARTILLERY',color:'#8f8a68',hp:210,arm:90,leg:150,move:3,armor:8,foundry:5,cost:400000,weapon:'missile'},
 {name:'AEGIS',model:'AGS–07',role:'ASSAULT',color:'#899681',hp:165,arm:94,leg:108,move:4,armor:5,foundry:0,cost:145000,weapon:'rifle'},
 {name:'SHRIKE',model:'SHK–12',role:'RECON',color:'#b6a37c',hp:118,arm:76,leg:103,move:5,armor:2,foundry:1,cost:50000,weapon:'shotgun'},
 {name:'BASTION',model:'BST–04',role:'HEAVY SUPPORT',color:'#708c92',hp:188,arm:100,leg:105,move:3,armor:7,foundry:2,cost:260000,weapon:'rifle',rig:'bastion'}
);
const BASTION_FRAME=FRAMES.length-1;
const playerHull=frame=>Boolean(FRAMES[frame]&&(!FRAMES[frame].enemyOnly||FRAMES[frame].salvageOnly||FRAMES[frame].captureOnly));
const breachLoadout=frame=>{
 const model=FRAMES[frame]?.native;
 return model==='gatecrasher'||model==='shogun';
};
const openHands=frame=>playerHull(frame)&&(!FRAMES[frame].native||FRAMES[frame].native==='cicada')&&!FRAMES[frame].fixedWeapons&&!FRAMES[frame].captureOnly;
const canFitShield=frame=>breachLoadout(frame)||openHands(frame);
const bastionRig=unit=>FRAMES[unit.frame]?.rig==='bastion';
const PART_LABEL={body:'BODY',pilot:'PILOT',right:'WEAPON ARM',left:'LEFT ARM',legs:'LEGS'};
const HELLBREAKER=FRAMES.length;
FRAMES.push({...FRAMES[3],name:'HELLBREAKER',model:'HV–09X',role:'HOSTILE BREACH',cost:400000,
 native:'hellbreaker',melee:'breach-gauntlet',salvageOnly:true,brief:'Enemy breach chassis. Recover a wreck on No quiet frontier and rebuild it in the Workshop.'});
const PILOT_HP=[70,55,80];
const CREW_HP=[...PILOT_HP,60,72,67,61,76];
const CITADEL_FRAME=FRAMES.push({...FRAMES[BASTION_FRAME],name:'CITADEL',model:'CTD–04',weapon:'missile',rig:null,enemyOnly:true,salvageOnly:true,fixedWeapons:true})-1;
const LINE_INFANTRY_FRAME=FRAMES.push({name:'LINE INFANTRY',model:'LI-01',role:'STANDARD',color:'#7b8259',
 hp:151,arm:87,leg:98,move:4,armor:4,weapon:'rifle',foundry:6,enemyOnly:true,captureOnly:true,fixedWeapons:true})-1;
const LINE_ELITE_FRAME=FRAMES.push({name:'LINE INFANTRY ELITE',model:'LI-02',role:'ELITE',color:'#526e86',
 hp:185,arm:104,leg:112,move:3,armor:8,weapon:'rifle',foundry:7,enemyOnly:true,captureOnly:true,fixedWeapons:true})-1;
const INFANTRY_PRIMARIES=['rifle','trident','shotgun'];
const isLineInfantry=u=>u.team==='enemy'&&(u.frame===LINE_INFANTRY_FRAME||u.frame===LINE_ELITE_FRAME);
const VANGUARD_FRAME=FRAMES.push({name:'GRAVEMAW',model:'MECH-01',role:'CLOSE ASSAULT',color:'#386047',
 hp:165,arm:88,leg:103,move:3,armor:6,cost:230000,weapon:'hailstorm',melee:'piledriver',foundry:8,enemyOnly:true,salvageOnly:true,fixedWeapons:true,fixedLivery:true})-1;
const REAVER_FRAME=FRAMES.push({name:'REAVER',model:'RV-04',role:'MEDIUM+',color:'#a1242c',
 hp:172,arm:98,leg:114,move:4,armor:6,cost:190000,weapon:'rifle',foundry:9,enemyOnly:true,salvageOnly:true,fixedWeapons:true})-1;
const BULWARK_FRAME=FRAMES.push({name:'BULWARK-AEGIS',model:'M02',role:'MELEE GUARD',color:'#415946',
 hp:166,arm:86,leg:110,move:3,armor:6,cost:245000,weapon:'aegis-cleave',melee:'aegis-bash',foundry:10,enemyOnly:true,salvageOnly:true,fixedWeapons:true})-1;
const ASHIGARU_FRAME=FRAMES.push({name:'ASHIGARU',model:'IV-S07',role:'HOSTILE SCOUT',color:'#385644',
 hp:82,arm:45,leg:72,move:6,armor:1,cost:95000,weapon:'needle-carbine',melee:'signal-knife',foundry:12,enemyOnly:true,salvageOnly:true,fixedWeapons:true,fixedLivery:true})-1;
const AERO_FRAME=FRAMES.push({name:'AERO',model:'IV-03',role:'ELITE RECON',color:'#385647',
 hp:134,arm:84,leg:108,move:6,armor:3,cost:400000,weapon:'rifle',melee:'blade',
 foundry:11,noSalvage:true,fixedLivery:true,dodge:.15,jumpjet:true})-1;
const SHOGUN_FRAME=FRAMES.push({name:'SHOGUN',model:'HV–12',role:'FLAGSHIP ASSAULT',color:'#3978a8',
 hp:238,arm:124,leg:138,move:3,armor:10,cost:500000,weapon:'morrow',native:'shogun',
 brief:'A flagship assault chassis with layered armor and a planted stride. The Morrow twin cannon is standard.'})-1;
const CAIRN_FRAME=FRAMES.push({name:'CAIRN',model:'CRN–01',role:'LINE ASSAULT',color:'#899aa2',
 hp:155,arm:94,leg:105,move:4,armor:5,cost:180000,weapon:'rifle',foundry:3,rig:'cairn',
 brief:'A compact rifle chassis with cast shoulders and slate field camouflage.'})-1;
const MECH_SIGNATURES={
 0:['Steady Aim','First direct shot before moving gains +6 aim.'],
 1:['High Spot','A hit from high ground gives the next allied shot +5 aim.'],
 2:['Counter Screen','A missile hit gives the immediate counter −15 aim.'],
 3:['Breach Salvo','Direct fire cuts Brace reduction by 15 points.'],
 4:['Relay Guidance','Missiles gain +1 range against painted targets.'],
 5:['Fire and Fade','Take one free step after firing each turn.'],
 6:['Riposte','Melee counters deal +20% damage.'],
 7:['Siege Anchor','First missile salvo while braced deals +15% damage.'],
 8:['Shield Lock','First braced shield block takes 20% less arm damage.'],
 9:['Close Scatter','Adjacent scatter shots deal +15% damage.'],
 [BASTION_FRAME]:['Covering Fire','Use your counter to return fire for an adjacent ally.'],
 [HELLBREAKER]:['Brace Breaker','Melee hits remove the target’s Brace.'],
 [CITADEL_FRAME]:['Marked Barrage','Mark a tile one turn before firing a missile barrage.'],
 [VANGUARD_FRAME]:['Charge','Melee deals +20% damage after moving at least two tiles.'],
 [REAVER_FRAME]:['Suppressing Fire','A direct hit to the weapon arm gives the target’s next shot −10 aim.'],
 [BULWARK_FRAME]:['Shield Bash','Bulwark’s bash pushes the target one tile. Other frames push with melee hits. Requires a clear destination.'],
 [ASHIGARU_FRAME]:['Range Discipline','Ashigaru switches to flechettes up close. Other frames gain +5 aim on adjacent strikes or ranged shots from two or more tiles.'],
 [AERO_FRAME]:['Jumpjet','Jump up to five tiles for 2 AP, once per sortie.'],
 [SHOGUN_FRAME]:['Siegebreaker','Direct fire cuts Brace reduction by 20 points.'],
 [CAIRN_FRAME]:['Braced Aim','Direct shots gain +4 aim while braced.']
};
const MECH_LEARN_KILLS=5,MECH_MASTERY_KILLS=25;
function hasMechSkill(u,frame){return Boolean(u?.mechSkills&&(u.frame===frame||u.mechSkills.includes(frame)))}
const AERO_MELEE=['cleaver','breaker','piledriver','blade'];
const JUMPJET_RANGE=5,JUMPJET_AP=2;
const JUMPJET_HELP='Leap over cover and units to a clear tile within '+JUMPJET_RANGE+' tiles. Costs '+JUMPJET_AP+' AP. Once per sortie. Requires working legs.';
const dailyAeroMelee=()=>AERO_MELEE[(save.day-1)%AERO_MELEE.length];
const chassisEvade=frame=>frame.dodge??.08;
const dodgeChance=u=>u&&!u.kind&&FRAMES[u.frame]?chassisEvade(FRAMES[u.frame]):0;
const salvageableHull=frame=>playerHull(frame)&&!FRAMES[frame].noSalvage&&!FRAMES[frame].captureOnly;
const ENEMY_NAMES=['JACKAL','RAVEN','MARAUDER','GATEBREAKER','LOCUST','SERAPH','RONIN','TITAN','SENTINEL','RAZOR','CITADEL'];
const FOUNDRY_HOSTILES={corridor:[1,6,8,9],frontier:[7,6,5,CITADEL_FRAME,2]};
const RELAY_LEADS=[0,1,2,9,8];
const dailyRelayLead=()=>RELAY_LEADS[(save.day-1)%RELAY_LEADS.length];
const foundryModel=frame=>FRAMES[frame]?.foundry;
const pilotFrame=(i,career=save)=>career.units[i].frame??i;
const CONTRACTS=[
 {id:'picket',field:0,name:'Picket sweep',place:'KARST BASIN · OUTER PERIMETER',tag:'PATROL INTERCEPT',pay:2000,fixedPay:true,difficulty:1,desc:'Break a light security patrol. Three-mech sorties face an Ashigaru scout with armor and air support.',
  deployment:[[6,10],['tank',4,13],['tank',7,14],['helicopter',9,15]]},
 {id:'relay',field:0,name:'Ashes of the relay',place:'KARST BASIN · SECTOR 07',tag:'RECOVERY OPERATION',pay:3200,difficulty:1,desc:'Clear the relay station and recover its navigation core. Multi-mech sorties face Aero with a rotating melee loadout.',legacyMechs:3,
  deployment:[[6,10],[13,6],[16,3],['tank',4,13],['helicopter',10,16]]},
 {id:'corridor',field:1,name:'The iron corridor',place:'VANTA INDUSTRIAL · SECTOR 12',tag:'INTERDICTION',pay:4600,difficulty:2,desc:'Intercept an armored patrol before it reaches the refinery. Expect Line Infantry Elite, Gravemaw at two or more seats, and a Reaver at three.',legacyMechs:4,
  deployment:[[7,11],[14,6],[15,15],[4,4],['tank',4,14],['helicopter',11,17],['tank',9,8]]},
 {id:'frontier',field:2,name:'No quiet frontier',place:'HALCYON OUTSKIRTS · SECTOR 19',tag:'HIGH-RISK CONTRACT',pay:6800,difficulty:3,desc:'Break the veteran command lance. Two- and three-mech sorties face a Gravemaw escort. Three-mech sorties also face a Reaver and a Bulwark-Aegis guard.',legacyMechs:5,
  deployment:[[7,12],[12,6],[15,15],[4,4],[14,2],['tank',4,14],['helicopter',10,16],['tank',12,10],['helicopter',9,3]]}
];
const OLD_SORTIE_CONTRACTS=['relay','corridor','frontier'];
const overworld=window.IronVowOverworld,worldRules=window.IronVowWorld;
const classicNetwork={ports:overworld.PORTS,routes:overworld.ROUTES};
const livingNetwork=worldRules?{ports:worldRules.PORTS,routes:worldRules.ROUTES}:classicNetwork;
const careerNetwork=(career=save)=>career.world?livingNetwork:classicNetwork;
const portName=id=>livingNetwork.ports.find(port=>port.id===id)?.name;
function companyPort(career=save){
 if(career.overworld)return career.overworld.port;
 const checkpoint=career.sortie?.contract;
 const checkpointPort=Number.isInteger(checkpoint)?OLD_SORTIE_CONTRACTS[checkpoint]:checkpoint;
 if(portName(checkpointPort))return checkpointPort;
 const last=career.history.at(-1)?.name;
 return CONTRACTS.find(contract=>contract.name===last)?.id??'picket';
}
function ensureWorld(){
 if(!worldRules||careerStale)return null;
 if(save.world)return save.world;
 let seed=42;
 if(window.crypto?.getRandomValues){const values=new Uint32Array(1);window.crypto.getRandomValues(values);seed=values[0];}
 save.world=worldRules.createWorld(seed,save.day);persist();return save.world;
}
function availableOffers(port,arrivalDay=save.day){
 const world=ensureWorld();
 return world?worldRules.offersAt(world,port,arrivalDay)??[]:[];
}
function worldOfferById(id){
 const world=ensureWorld();
 if(!world)return null;
 for(const port of worldRules.PORTS){const offer=worldRules.offersAt(world,port.id).find(offer=>offer.id===id);if(offer)return offer;}
 return null;
}
function acceptedOffer(offer){
 const {id,templateIndex,port,postedDay,expiryDay,payPercent}=offer;
 return Object.freeze({id,templateIndex,port,postedDay,expiryDay,payPercent,acceptedDay:save.day});
}
function validAcceptedOffer(offer,career=save){
 if(!career.world||!offer||typeof offer!=='object'||!Number.isSafeInteger(offer.acceptedDay)||offer.acceptedDay>career.day||offer.acceptedDay<offer.postedDay||offer.acceptedDay>offer.expiryDay)return false;
 const origin=worldRules.createWorld(career.world.seed,offer.postedDay);
 const expected=origin&&worldRules.offersAt(origin,offer.port)?.find(item=>item.id===offer.id);
 return !!expected&&['id','templateIndex','port','postedDay','expiryDay','payPercent'].every(key=>offer[key]===expected[key]);
}
function worldContractPay(contract,count,offer,tier=shipLevel('office')){
 return Math.round(contractPay(contract,count,tier)*(offer?.payPercent??100)/100);
}
function scoutWorldOffer(id){
 if(battle||careerStale||save.credits<90)return false;
 const world=ensureWorld(),offer=worldOfferById(id);
 if(!world||!offer)return false;
 const next=worldRules.scoutOffer(world,id);
 if(!next)return false;
 save.credits-=90;save.world=next;persist();return true;
}
function holdAtPort(){
 if(save.transit||battle||careerStale||!Number.isSafeInteger(save.day+1))return false;
 const world=ensureWorld(),next=world&&worldRules.advanceWorld(world,save.day+1);
 if(!next)return false;
 const rates=overworld.operatingRates(save),rest=overworld.travelRest(save,1);
 const settled=overworld.settleExpenses(save.credits,save.overworld?.arrears??0,rates.total),port=companyPort();
 save.units=rest.units;if(save.reserve)save.reserve=rest.reserve;if(save.wounds)save.wounds=rest.wounds;
 save.day++;save.credits=settled.credits;save.world=next;delete save.dispatch;
 save.overworld={port,arrears:settled.arrears,lastExpense:{kind:'hold',day:save.day,days:1,fuel:0,...rates,paid:settled.paid,arrearsPaid:settled.arrearsPaid}};
 persist();return true;
}
function prepareWorldOffer(id){
 const offer=worldOfferById(id);
 if(!offer||battle||careerStale)return false;
 if(offer.port!==companyPort()){showOverworld(offer.port);return false;}
 prepareSortie(offer.templateIndex,offer);return true;
}
function bindWorldContracts(){
 for(const button of document.querySelectorAll('[data-world-offer]'))button.onclick=()=>prepareWorldOffer(button.dataset.worldOffer);
 for(const button of document.querySelectorAll('[data-scout-offer]'))button.onclick=()=>{
  if(scoutWorldOffer(button.dataset.scoutOffer)){render();toast('Contact report received.');}
 };
}
function pooledContractsPage(){
 if(save.transit)return `<div class="page"><div class="pagehead"><div><div class="eyebrow">IVS HALYARD / DISPATCH</div><h1>TRANSIT REPORT</h1></div></div><p>Review the crossing before accepting another contract.</p><button class="primary" data-page="overworld">REVIEW TRANSIT</button></div>`;
 const port=contractPortSelection??companyPort(),local=port===companyPort(),offers=availableOffers(port),sizes=dispatchSizes();
 return `<div class="page"><div class="pagehead"><div><div class="eyebrow">${portName(port)} / DISPATCH</div><h1>CONTRACT BOARD</h1></div><button data-page="overworld">CHART TABLE ${icon('arrow-right')}</button></div>
  <div class="grid contract-grid">${offers.map(offer=>{
   const contract=CONTRACTS[offer.templateIndex],size=sizes[offer.templateIndex],contacts=sortieSpawns(contract,size).filter(spawn=>spawn.length===2).length;
   const revealed=offer.scouted||local&&hangarLevel('recon')>0;
   const intel=revealed?contacts+' MECH'+(contacts===1?'':'S'):Math.min(contacts,offer.intel.minMechs)+'–'+Math.max(contacts,offer.intel.maxMechs)+' MECHS';
   return `<article class="card offer-card"><div class="eyebrow">${contract.tag} · ${local?'LOCAL':'REMOTE'}</div><h2>${contract.name}</h2><p>${contract.desc}</p>
    <div class="offer-terms">${stat('PAYMENT',money(worldContractPay(contract,size,offer)))}${stat('EXPIRES','DAY '+offer.expiryDay)}${stat('LANCE',size+' MECH'+(size===1?'':'S')+(shipLevel('drop')===2?' + AUX OPTION':''))}${stat('CONTACTS',intel+(contract.difficulty>=2&&!revealed?' · HEAVY LIKELY':''))}</div>
    ${revealed?`<div class="offer-intel">${contractIntel(offer.templateIndex,size,{reveal:offer.scouted,local})}</div>`:`<button type="button" data-scout-offer="${offer.id}" ${save.credits<90?'disabled':''}>SCOUT · 90 CR</button>`}
    <button class="primary full" data-deploy="${offer.templateIndex}" data-world-offer="${offer.id}">${local?'PREPARE SORTIE':'PLOT COURSE'} ${icon('arrow-right')}</button></article>`;
  }).join('')||'<div class="offer-empty"><h2>No open offers</h2><p>Check another mooring or hold for the next dispatch.</p><button data-page="overworld">OPEN CHART</button></div>'}</div></div>`;
}
function travelTo(destination,from=companyPort(),expectedCost,path=[from,destination],withEvents=false){
 if(save.transit||battle||careerStale||(!careerDB&&!careerIsCurrent())||from!==companyPort())return false;
 if(!Array.isArray(path)||path[0]!==from||path.at(-1)!==destination)return false;
 const quote=overworld.itineraryQuote(path,overworld.operatingRates(save),save.credits,save.overworld?.arrears??0,careerNetwork());
 if(!quote||quote.total>save.credits||expectedCost!==undefined&&quote.total!==expectedCost||!Number.isSafeInteger(save.day+quote.days))return false;
 const queued=save.world&&withEvents?worldRules.queueTransitEvents(save.world,path):save.world;
 if(save.world&&!queued)return false;
 const nextWorld=queued?worldRules.advanceWorld(queued,save.day+quote.days):null;
 const transit=queued?.pendingEvents.length?{path:[...path],departureDay:save.day,arrivalDay:save.day+quote.days,choices:{}}:null;
 if(save.world&&!nextWorld)return false;
 const rest=overworld.travelRest(save,quote.days);
 if(nextWorld)save.world=nextWorld;
 if(transit)save.transit=transit;
 save.units=rest.units;
 if(save.reserve)save.reserve=rest.reserve;
 if(save.wounds)save.wounds=rest.wounds;
 save.credits-=quote.total;save.day+=quote.days;delete save.dispatch;
 const {days,fuel,wages,ship,hulls,total}=quote;
 save.overworld={port:destination,arrears:save.overworld?.arrears??0,
  lastExpense:{kind:'travel',day:save.day,destination,days,fuel,wages,ship,hulls,total,paid:total,arrearsPaid:0}};
 persist();return true;
}

// The posting and the itinerary define every incident. The save stores choices only
// while a report is open, so a reload cannot apply a reward or a delay twice.
function validTransit(career){
 const t=career.transit,w=career.world;
 if(t===undefined)return !w?.pendingEvents.length;
 if(!w||!t||typeof t!=='object'||Array.isArray(t)||!Array.isArray(t.path)||t.path.length<2||t.path.length>livingNetwork.ports.length||new Set(t.path).size!==t.path.length||
  !Number.isSafeInteger(t.departureDay)||t.departureDay<1||!Number.isSafeInteger(t.arrivalDay)||!t.choices||typeof t.choices!=='object'||Array.isArray(t.choices)||career.sortie||!w.pendingEvents.length)return false;
 let days=0;
 for(let i=1;i<t.path.length;i++){
  const leg=livingNetwork.routes.find(r=>r.from===t.path[i-1]&&r.to===t.path[i]||r.to===t.path[i-1]&&r.from===t.path[i]);
  if(!leg)return false;days+=leg.days;
 }
 if(t.arrivalDay!==t.departureDay+days||career.overworld?.port!==t.path.at(-1))return false;
 const origin=worldRules.createWorld(w.seed,t.departureDay),events=origin&&worldRules.transitEvents(origin,t.path);
 if(!events||Object.keys(t.choices).some(id=>!events.some(e=>e.id===id)))return false;
 let delay=0,pending=false;
 for(const event of events){
  if(!Object.hasOwn(t.choices,event.id)){pending=true;continue;}
  if(pending)return false;
  const choice=event.choices.find(c=>c.id===t.choices[event.id]);if(!choice)return false;delay+=choice.delayDays;
 }
 return career.day===t.arrivalDay+delay&&JSON.stringify(w.pendingEvents)===JSON.stringify(events.filter(e=>!Object.hasOwn(t.choices,e.id)).map(e=>e.id));
}
function canUsePort(port){
 return !battle&&!careerStale&&!save.transit&&port===companyPort()&&!!(careerDB||careerIsCurrent());
}
function equipmentRoll(key){
 let hash=2166136261;
 for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return (hash^(hash>>>16))>>>0;
}
function portStock(port){
 const seed=save.world?.seed??0,profile=worldRules.portProfile(seed,port);
 if(!profile)return null;
 const stock=new Set([...profile.weapons,'rifle',...(port==='picket'?['shotgun','missile']:[]),'bulwark-shield','citadel-shield']);
 const rotation=WEAPONS.filter(w=>!w.builtIn&&!w.shoulder&&!stock.has(w.id));
 const key=[seed,port,save.day].join('/');
 rotation.sort((a,b)=>equipmentRoll(key+a.id)-equipmentRoll(key+b.id));
 return {...profile,weapons:[...stock,...rotation.slice(0,2).map(w=>w.id)]};
}
const itemId=id=>id==='vesper-shoulder'?'missile':id;
const equipmentItem=id=>shieldItem(itemId(id))||WEAPONS.find(w=>w.id===itemId(id)&&!w.builtIn);
const equipmentPrice=item=>item.id==='rifle'?600:item.price;
const portableItems=(hull,frame=hull.frame)=>[frame===REAVER_FRAME?null:hull.weapon,hull.melee,hull.shoulder,hull.shield].map(itemId).filter(id=>equipmentItem(id));
const fittedItems=career=>[...career.units.flatMap((hull,i)=>portableItems(hull,pilotFrame(i,career))),...Object.entries(career.reserve??{}).flatMap(([frame,hull])=>portableItems(hull,Number(frame)))];
function stockFittedGear(career){
 for(const id of new Set(fittedItems(career))){
  const shortage=-availableCopies(id,career);
  if(shortage>0)career.owned.push(...Array(shortage).fill(id));
 }
}
const copies=(items,id)=>items.filter(item=>itemId(item)===itemId(id)).length;
const availableCopies=(id,career=save)=>copies(career.owned,id)-copies(fittedItems(career),id);
function migrateEquipment(career){
 if(career.itemInventory)return career;
 career.owned=[...new Set(career.owned.map(itemId))];
 stockFittedGear(career);
 career.itemInventory=true;
 return career;
}
const localEquipment=id=>portStock(companyPort())?.weapons.includes(itemId(id));
function equipmentOffer(id){
 const item=equipmentItem(id),stock=localEquipment(id),price=equipmentPrice(item);
 const reason=!stock?'NOT IN PORT STOCK':save.rep<(item.rep??0)?'UNLOCKS AT '+item.rep+' REP':save.credits<price?money(price)+' REQUIRED':'';
 return {price,reason,free:Math.max(0,availableCopies(id))};
}
function portStockPrice(base,port){return Math.round(base*(.9-(save.world?.standings[port]??0)/1000));}
function portHull(key){
 const active=/^active:([0-2])$/.exec(key),stored=/^reserve:(\d+)$/.exec(key);
 if(active){const slot=Number(active[1]);return {hull:save.units[slot],frame:pilotFrame(slot)};}
 if(stored&&String(Number(stored[1]))===stored[1]&&save.reserve?.[stored[1]])return {hull:save.reserve[stored[1]],frame:Number(stored[1])};
 return null;
}
function portRepairCost(key,port=companyPort()){
 const entry=portHull(key),profile=portStock(port);
 if(!entry||!profile)return null;
 const base=Math.ceil((100-entry.hull.condition)*14*[100,80,70][shipLevel('repair')]/100);
 return Math.ceil(base*profile.repairPercent/100*(1-(save.world.standings[port]??0)/500));
}
function repairPortHull(key,port=companyPort()){
 if(!canUsePort(port))return false;
 const entry=portHull(key),price=portRepairCost(key,port);
 if(!entry||entry.hull.condition>=100||price===null||save.credits<price)return false;
 save.credits-=price;entry.hull.condition=100;persist();return true;
}
function purchaseWeapon(id,price){
 const item=equipmentItem(id);
 if(!item||save.rep<(item.rep??0)||!Number.isSafeInteger(price)||price<0||save.credits<price)return false;
 save.credits-=price;save.owned.push(itemId(id));return true;
}
function buyPortWeapon(id,port=companyPort()){
 if(!canUsePort(port)||!portStock(port)?.weapons.includes(id))return false;
 const item=equipmentItem(id);
 if(!item||!purchaseWeapon(id,portStockPrice(equipmentPrice(item),port)))return false;
 persist();return true;
}
function buyPortHull(frame,port=companyPort()){
 return Number.isInteger(frame)&&canUsePort(port)&&acquireHull(frame,false,port);
}
function portServicesData(port=overworldSelection??companyPort()){
 const profile=portStock(port);if(!profile)return null;
 const hulls=save.units.map((hull,i)=>({key:'active:'+i,name:FRAMES[pilotFrame(i)].name,condition:hull.condition}));
 for(const [frame,hull] of Object.entries(save.reserve??{}))hulls.push({key:'reserve:'+frame,name:FRAMES[frame].name+' · Stored',condition:hull.condition});
 if(!hulls.some(h=>h.key===portHullSelection))portHullSelection=hulls[0]?.key;
 const local=port===companyPort(),hull=portHull(portHullSelection),repairCost=portRepairCost(portHullSelection,port);
 const repairReason=!local?'Moor here':hull?.hull.condition>=100?'Full integrity':save.credits<repairCost?'Insufficient credits':'';
 const items=[...profile.weapons.map(id=>{const w=equipmentItem(id),price=portStockPrice(equipmentPrice(w),port),reason=save.rep<(w.rep??0)?'Requires '+w.rep+' reputation':save.credits<price?'Insufficient credits':'';
  return {kind:'weapon',id,name:w.name,price,copies:copies(save.owned,id),disabled:!!reason,reason};}),
  ...profile.frames.map(id=>{const f=FRAMES[id],price=portStockPrice(f.cost,port),reason=!hullOwned(id)&&!hullOnMarket(id)?'Salvage only':save.credits<price?'Insufficient credits':'';
   return {kind:'frame',id,name:f.name,price,owned:hullOwned(id),disabled:!!reason,reason};})];
 return {name:portName(port),faction:profile.faction,standing:save.world.standings[port]??0,local,tab:portSheetTab,discountPercent:10+(save.world.standings[port]??0)/10,hulls,selectedHull:portHullSelection,repairCost,repairDisabled:!!repairReason,repairReason,items,credits:save.credits};
}
const TRANSIT_COPY={
 distress:['Distress beacon','A stranded crew requests supplies.'],salvage:['Drifting salvage','Recover a derelict cargo sling at the cost of hull wear.'],
 toll:['Toll blockade','A local checkpoint demands a crossing fee.'],weather:['Storm crossing','The plotted leg crossed a storm front.'],patrol:['Patrol contact','An armed patrol intercepted this leg.']
};
const TRANSIT_CHOICES={help:'Send supplies',pass:'Pass by',recover:'Recover cargo',leave:'Leave it',pay:'Pay toll',detour:'Take detour',supplies:'Use supplies',brace:'Brace through',wait:'Wait it out',bribe:'Pay patrol',run:'Run blockade'};
function transitEventData(){
 const event=save.transit&&worldRules.pendingEvents(save.world)?.[0];if(!event)return null;
 const [title,description]=TRANSIT_COPY[event.kind],rates=overworld.operatingRates(save);
 return {id:event.id,kind:event.kind,title,description:description+' '+portName(event.from)+' → '+portName(event.to)+'.',choices:event.choices.map(choice=>{
  const consequences=[];
  if(choice.credits)consequences.push((choice.credits>0?'+':'−')+money(Math.abs(choice.credits)));
  if(choice.hullCondition)consequences.push('All hulls '+choice.hullCondition+'%');
  if(choice.delayDays)consequences.push('+'+choice.delayDays+'d · '+money(rates.total*choice.delayDays)+' upkeep · service & rest');
  if(choice.rep)consequences.push('Local standing +'+choice.rep);
  return {id:choice.id,label:TRANSIT_CHOICES[choice.id],detail:consequences.join(' · ')||'No cost',disabled:save.credits+choice.credits<0};
 })};
}
function resolveTransitEvent(id,choiceId){
 if(battle||careerStale||!save.transit||!validTransit(save)||(!careerDB&&!careerIsCurrent()))return false;
 // Resolve in route order. A stale button cannot resolve a later report.
 if(save.world.pendingEvents[0]!==id)return false;
 const result=worldRules.resolveEvent(save.world,id,choiceId);if(!result)return false;
 const effect=result.effect,day=save.day+effect.delayDays,credits=save.credits+effect.credits;
 if(!Number.isSafeInteger(day)||!Number.isFinite(credits)||credits<0||credits>Number.MAX_SAFE_INTEGER)return false;
 const rest=overworld.travelRest(save,effect.delayDays),rates=overworld.operatingRates(save);
 let world=worldRules.advanceWorld(result.world,day);if(!world)return false;
 if(effect.rep)world=worldRules.setStanding(world,effect.port,Math.max(-100,Math.min(100,(world.standings[effect.port]??0)+effect.rep)));
 const settlement=overworld.settleExpenses(credits,save.overworld?.arrears??0,rates.total*effect.delayDays);
 const wear=hull=>({...hull,condition:Math.max(0,Math.min(100,hull.condition+effect.hullCondition))});
 save.units=rest.units.map(wear);if(save.reserve)save.reserve=Object.fromEntries(Object.entries(rest.reserve).map(([key,hull])=>[key,wear(hull)]));if(save.wounds)save.wounds=rest.wounds;
 save.credits=effect.delayDays?settlement.credits:credits;save.day=day;save.world=world;
 if(effect.delayDays){save.overworld={port:companyPort(),arrears:settlement.arrears,lastExpense:{kind:'hold',day,days:effect.delayDays,fuel:0,...rates,paid:settlement.paid,arrearsPaid:settlement.arrearsPaid}};delete save.dispatch;}
 save.transit={...save.transit,choices:{...save.transit.choices,[id]:choiceId}};
 if(!world.pendingEvents.length)delete save.transit;
 persist();return true;
}
function bindPortServices(){
 for(const opener of document.querySelectorAll('[data-port-services]'))opener.onclick=()=>{if(save.transit||overworldDeparture)return;portSheetOpen=true;portSheetTab='services';render();$('[data-port-close]')?.focus({preventScroll:true});};
 const close=()=>{portSheetOpen=false;render();$('[data-port-services]')?.focus({preventScroll:true});};
 const closeButton=$('[data-port-close]');if(closeButton)closeButton.onclick=close;
 const sheet=document.querySelector('.port-services');if(sheet)sheet.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}};
 for(const tab of document.querySelectorAll('[data-port-tab]')){
  const select=key=>{portSheetTab=key;render();$('[data-port-tab="'+key+'"]')?.focus({preventScroll:true});};
  tab.onclick=()=>select(tab.dataset.portTab);
  tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?'services':e.key==='End'?'market':tab.dataset.portTab==='services'?'market':'services');}};
 }
 const hull=$('[data-port-hull]');if(hull)hull.onchange=()=>{portHullSelection=hull.value;render();$('[data-port-hull]')?.focus({preventScroll:true});};
 const repair=$('[data-port-repair]');if(repair)repair.onclick=()=>{if(repairPortHull(portHullSelection,overworldSelection)){render();toast('Chassis restored to full integrity.');$('[data-port-hull]')?.focus({preventScroll:true});}};
 for(const button of document.querySelectorAll('[data-port-buy-weapon],[data-port-buy-frame]'))button.onclick=()=>{
  const bought=button.dataset.portBuyWeapon!==undefined?buyPortWeapon(button.dataset.portBuyWeapon,overworldSelection):buyPortHull(Number(button.dataset.portBuyFrame),overworldSelection);
  if(bought){const scroll=document.querySelector('.port-services-body')?.scrollTop??0;render();const body=document.querySelector('.port-services-body');if(body)body.scrollTop=scroll;toast('Added to company inventory.');$('[data-port-tab="market"]')?.focus({preventScroll:true});}
 };
 for(const button of document.querySelectorAll('[data-transit-choice]'))button.onclick=()=>{
  if(resolveTransitEvent(button.dataset.eventId,button.dataset.transitChoice)){render();toast(save.transit?'Next transit report.':'Transit report closed.');($('[data-transit-choice]:not(:disabled)')||$('[data-port-services]'))?.focus({preventScroll:true});}
 };
}

function settleSortieCosts(port){
 const rates=overworld.operatingRates(save);
 const {credits,arrears,paid,arrearsPaid}=overworld.settleExpenses(save.credits,save.overworld?.arrears??0,rates.total);
 const receipt={kind:'sortie',day:save.day,days:1,fuel:0,...rates,paid,arrearsPaid};
 save.credits=credits;save.overworld={port,arrears,lastExpense:receipt};
 return receipt;
}
const FIELD_PATCH=50;
const SHIP_DECK={
 drop:{name:'Drop Control',glyph:'lightning',tiers:[
  {name:'Hot Drop Beacons',cost:2200,wins:1,rep:0,perk:'+1 AP on round 1',detail:'Precharge allied reactors as the lance drops.'},
  {name:'Auxiliary Cradle',cost:10500,wins:2,rep:30,perk:'+1 optional reserve mech per sortie',detail:'Launch a spare pilot and hull from reserve. The rolled seats, enemies and pay use the original lance.'}
 ]},
 office:{name:'Contracts Office',glyph:'binoculars',tiers:[
  {name:'Broker Uplink',cost:1800,wins:1,rep:0,perk:'+15% base contract pay',detail:'Direct dispatch traffic earns better terms with clients.'},
  {name:'Letters of Marque',cost:5300,wins:2,rep:20,perk:'+25% base contract pay total',detail:'Certified recovery rights give the company leverage at the bargaining table.'}
 ]},
 repair:{name:'Repair Deck',glyph:'wrench',tiers:[
  {name:'Service Gantry',cost:2000,wins:1,rep:0,perk:'Parked hulls +12 integrity per transit day or win · repairs −20%',detail:'Maintenance crews service hulls that stay aboard during a sortie.'},
  {name:'Machine Shop',cost:4800,wins:2,rep:20,perk:'Transit and parked +24 · deployed +8 after wins · repairs −30%',detail:'The fabrication line stages replacement armor before the recovery shuttle returns.'}
 ]},
 crew:{name:'Crew Deck',glyph:'first-aid-kit',tiers:[
  {name:'Medbay',cost:1900,wins:1,rep:0,perk:'Wounded pilots recover after 1 rest day or sortie',detail:'Incapacitated pilots start with 65% pilot HP until rested. Medbay halves the normal two-sortie rest.'},
  {name:'Simulator Pods',cost:4000,wins:2,rep:20,perk:'Benched pilots +25 XP per win · field recovery',detail:'Reserves drill aboard ship. A wounded pilot also recovers after a sortie if they return conscious.'}
 ]}
};
const shipLevel=(facility,career=save)=>career.ship?.levels?.[facility]??0;
const woundDays=(id,career=save)=>career.wounds?.[id]??0;
function woundLabel(id){
 const days=Math.ceil(woundDays(id)/(shipLevel('crew')?2:1));
 return days?'WOUNDED · '+days+' REST '+(days===1?'DAY':'DAYS'):'';
}
function queueShipUpgrade(facility){
 if(battle||!Object.hasOwn(SHIP_DECK,facility)||save.ship?.project)return false;
 const next=SHIP_DECK[facility].tiers[shipLevel(facility)];
 if(!next||save.rep<next.rep||save.credits<next.cost)return false;
 const ship=save.ship??={levels:{}};
 ship.project={facility,wins:next.wins};save.credits-=next.cost;persist();return true;
}
const HANGAR_ROOMS={
 fabrication:{name:'Fabrication Bay',glyph:'wrench',tiers:[
  {name:'Salvage Line',cost:2100,wins:1,rep:0,perk:'Rebuild at 70% integrity · patch stored hulls',detail:'Open damaged frames on the bench. Rebuilds enter Storage at 70% instead of 55%. Field patches work on stored hulls.'},
  {name:'Heavy Foundry',cost:4400,wins:2,rep:25,perk:'Rebuild at 85% · field patches to 65%',detail:'Machined armor seats and refurbished joints improve rebuilt hulls. Free patches raise damaged assigned and stored hulls to 65%.'}
 ]},
 personnel:{name:'Personnel Annex',glyph:'first-aid-kit',tiers:[
  {name:'Reserve Academy',cost:1600,wins:1,rep:0,perk:'Spend training points on reserve pilots',detail:'Train reserve pilots here without changing the lance. Their skills follow them onto the field, including the auxiliary seat.'},
  {name:'Trauma Ward',cost:3600,wins:2,rep:20,perk:'Clear one pilot wound per day for 350 CR',detail:'Treat an active or reserve pilot immediately. Use it to keep a specialist fit for an urgent contract.'}
 ]},
 recon:{name:'Recon Cell',glyph:'binoculars',tiers:[
  {name:'Signal Mast',cost:1500,wins:1,rep:0,perk:'Reveal enemy rosters on the contract board',detail:'Identify enemy chassis, armor support and aircraft before choosing a lance.'},
  {name:'Survey Drones',cost:3300,wins:2,rep:20,perk:'Reroll one contract’s capacity per day for 350 CR',detail:'Survey a different approach. The new capacity is one of the other two values from 1 to 3. Pay and enemy presence follow the new roll.'}
 ]},
 cabins:{name:'Crew Cabins',glyph:'shield-chevron',tiers:[
  {name:'Crew Bunks',cost:1600,wins:1,rep:0,perk:'4 active pilots',detail:'Open a berth for a relief pilot. Put a hired pilot on active duty below to train them and select them in sortie prep.'},
  {name:'Officer Cabins',cost:3600,wins:2,rep:20,perk:'5 active pilots',detail:'House a second relief pilot. Use the expanded duty roster to rotate wounded pilots and bring the right skills.'},
  {name:'Lance Quarters',cost:5600,wins:2,rep:40,perk:'6 active pilots',detail:'House three relief pilots. Contracts roll 1 to 3 regular mech slots, which you can fill with pilots from your active roster.'}
 ]}
};
const HANGAR_SERVICE_COST=350;
const hangarLevel=(room,career=save)=>career.hangar?.levels?.[room]??0;
const dutyRoster=(career=save)=>career.duty??[];
const activeCapacity=(career=save)=>LANCE_SLOTS.length+hangarLevel('cabins',career);
const activeRosterIds=()=>[...LANCE_SLOTS.map(i=>pilotId(pilotClass(i))),...dutyRoster()];
function setPilotDuty(id,active){
 if(battle||!Object.hasOwn(save.reservePilots??{},id))return false;
 const current=dutyRoster();
 if(active===current.includes(id)||active&&activeRosterIds().length>=activeCapacity())return false;
 save.duty=active?[...current,id]:current.filter(pilot=>pilot!==id);
 persist();return true;
}
const patchLimit=()=>hangarLevel('fabrication')===2?65:FIELD_PATCH;
const rebuildIntegrity=()=>[55,70,85][hangarLevel('fabrication')];
function queueHangarUpgrade(room){
 if(battle||save.hangar?.project||!Object.hasOwn(HANGAR_ROOMS,room))return false;
 const next=HANGAR_ROOMS[room].tiers[hangarLevel(room)];
 if(!next||save.rep<next.rep||save.credits<next.cost)return false;
 (save.hangar??={levels:{}}).project={room,wins:next.wins};
 save.credits-=next.cost;persist();return true;
}
function advanceHangar(){
 const job=save.hangar?.project;
 if(!job||--job.wins>0)return;
 const room=job.room,level=hangarLevel(room);
 save.hangar.levels[room]=level+1;
 delete save.hangar.project;
 return HANGAR_ROOMS[room].tiers[level].name;
}
function treatPilot(id){
 if(battle||hangarLevel('personnel')!==2||save.hangar.treatmentDay===save.day||!Object.hasOwn(save.wounds??{},id)||save.credits<HANGAR_SERVICE_COST)return false;
 delete save.wounds[id];
 save.hangar.treatmentDay=save.day;save.credits-=HANGAR_SERVICE_COST;persist();return true;
}
function rerollDispatch(i){
 if(battle||!Number.isInteger(i)||!CONTRACTS[i]||hangarLevel('recon')!==2||save.hangar.scanDay===save.day||save.credits<HANGAR_SERVICE_COST)return false;
 const sizes=dispatchSizes();
 sizes[i]=1+(sizes[i]+Math.floor(ruleRandom()*2))%3;
 save.hangar.scanDay=save.day;save.credits-=HANGAR_SERVICE_COST;persist();return true;
}
function patchStoredHull(frame){
 if(!Number.isInteger(frame)||!FRAMES[frame])return false;
 const hull=save.reserve?.[frame];
 if(battle||!hangarLevel('fabrication')||!hull||hull.condition>=patchLimit())return false;
 hull.condition=patchLimit();persist();return true;
}
const VEHICLES={
 tank:{name:'JAVELIN TANK',hp:64,armor:5,move:4,step:.18,xp:20,altitude:0,wreckAt:.18,muzzle:[.11105,.76273],center:[.52,.674],gun:{id:'rampart',name:'85 mm cannon',damage:27,range:5,ap:4}},
 helicopter:{name:'KITE GUNSHIP',hp:43,armor:1,move:6,step:.15,xp:25,altitude:.82,wreckAt:.48,muzzle:[.28168,.75768],center:[.45,.584],gun:{id:'rifle',name:'Chin autocannon',damage:19,range:5,ap:4}}
};
const NEW_BOARD={width:18,depth:20};
const ROUND_AP=8,EXTRA_MOVE_AP=1,BRACE_AP=2;
const theaterLayouts=window.IRON_VOW_THEATERS;
const dimensions=()=>battle?.size||NEW_BOARD;
function onBoard(x,z){const {width,depth}=dimensions();return x>=0&&x<width&&z>=0&&z<depth}
function canReachTarget(w,target){return !(w.melee&&target.kind==='helicopter')}
const asset=path=>window.IRON_VOW_INLINE_ASSETS?.[path]||path;
const targetParts=u=>u?.kind?['body']:['body','pilot','right','left','legs'];
const REAVER_AUTOCANNON={...weapon('rifle'),burst:0,name:'RV-04 Autocannon',type:'AUTOCANNON'};
const EMPTY_HAND=Object.freeze({id:'unarmed',name:'Free hand',type:'EMPTY',range:0,ap:0,damage:0,weight:0});
const unitWeapon=u=>u.kind?VEHICLES[u.kind].gun:u.frame===REAVER_FRAME?REAVER_AUTOCANNON:u.weapon==null||launcherId(u.weapon)?shoulderWeapon(u)??EMPTY_HAND:weapon(u.weapon);
const isArmed=u=>u.kind||[unitWeapon(u),shoulderWeapon(u),meleeWeapon(u)].some(w=>workingWeapon(u,w));
const chassisMobility=(frame,legacy=false,training)=>frame.move+(legacy?0:1)+(training?.move??0);
const mobility=u=>u.kind?VEHICLES[u.kind].move:chassisMobility(FRAMES[u.frame],battle.legacy,u.training);
const mobile=u=>u.kind||u.hp.legs>0;
const freeMovement=u=>u&&u.alive&&mobile(u)?u.mechState?.valkyrieStep?1:!u.actionPhase?(u.moveLeft??mobility(u)):0:0;
const extraMovement=u=>Boolean(u?.alive&&mobile(u)&&u.ap>=EXTRA_MOVE_AP&&!u.extraStep);
const movementLimit=u=>freeMovement(u)+Number(extraMovement(u));
const spent=u=>Boolean(u?.alive&&u.ap===0&&(!movementLimit(u)||
 !neighborTiles(u.x,u.z).some(([x,z])=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!occupied(x,z))));
function resetMovement(u){u.moveLeft=mobility(u);u.actionPhase=false;u.extraStep=false;if(u.mechState)for(const key of ['moved','fired','valkyrieUsed','valkyrieStep','behemothUsed','aegisUsed'])delete u.mechState[key]}
function startAction(u){u.moveLeft=0;u.actionPhase=true}
const chassisParts=(frame,hull,training)=>({body:frame.hp+hull.upgrade*25+(training?.body??0),right:frame.arm,left:frame.arm,legs:frame.leg});
const chassisArmor=(frame,hull,training)=>frame.armor+hull.upgrade*2+(training?.armor??0);
const damagedArmor=armor=>Math.floor(armor/2);
const deploymentHP=(max,condition)=>Math.round(max*Math.max(.3,condition/100));
const roundAP=training=>ROUND_AP+(training?.roundAP??0);
const weaponAP=(w,training)=>w.ap-(w.melee?(training?.strikeAP??0):0);
const weaponRange=(w,training)=>w.range+(w.melee?0:(training?.range??0));
const launchesMissiles=w=>w?.id==='missile'||ATTACK_PROFILES[w?.id]?.effect==='missile';
const mechState=u=>u.mechState??={};
const combatRange=(u,t,w)=>weaponRange(w,u.training)+(hasMechSkill(u,4)&&launchesMissiles(w)&&t?.painted?1:0);
const counterRange=(w,training,braced=false)=>launchesMissiles(w)?0:weaponRange(w,training)+(training?.counterRange??0)+(braced?(training?.braceCounterRange??0):0);
const braceCost=training=>BRACE_AP-(training?.braceAP??0);
const braceReduction=training=>.5+(training?.brace??0);
const overdriveAP=training=>2+(training?.overdrive??0);
const deadeyePower=training=>1.5+(training?.deadeye??0);
const repairAmount=training=>45+(training?.repair??0);
const limbPart=part=>part==='right'||part==='left'||part==='legs';
const recoveryUses=training=>training?.recoveryTwice?2:1;
const recoveryRange=training=>3+(training?.recoveryRange??0);
function skillDescription(i,training){
 if(i===3)return `Mark within ${6+(training?.paintRange??0)} tiles. ${training?.paintShots??1} allied attack(s) gain +${Math.round((.20+(training?.paintAim??0))*100)} accuracy points${training?.paintPower?' and +20% weapon power':''}. Once per battle.`;
 if(i===4)return `Order an ally within ${5+(training?.relayRange??0)} tiles. Their next ${training?.relayShots??1} paid attack(s) this round cost up to ${training?.relayDiscount??2} AP less (min 1). Once per battle.`;
 if(i===SAPPER)return `${training?.breachShots??1} charged shot(s) that strike arms and legs. +${Math.round(100*(training?.breachPower??.60))}% power, ignores ${Math.round(100*(training?.breachPierce??.50))}% armor. Hits deny counters.${training?.breachRefund?' Limb destruction refunds attack AP.':''}`;
 if(i===SIGNAL)return `Jam a hostile within ${6+(training?.blackoutRange??0)} tiles for the round. No counters, −${Math.round(100*(training?.blackoutAim??.20))} accuracy points${training?.blackoutAP?', −'+training.blackoutAP+' AP':''}${training?.blackoutHold?', no movement':''}.`;
 if(i===RETRIEVER)return `Restore ${training?.recoveryHP??30} HP to ${training?.recoveryAll?'each damaged limb':'the weakest damaged limb'} within ${recoveryRange(training)} tiles${training?.recoveryFloor?' (75% HP minimum)':''}. ${recoveryUses(training)} use(s) per battle.`;
 if(!training?.overdrive&&!training?.deadeye&&!training?.deadeyeRefund&&!training?.repair&&!training?.limbRepair)return PILOTS[i].desc;
 const descriptions=[
  '+'+overdriveAP(training)+' AP this turn.'+(training?.overdriveMove?' Keeps free movement.':'')+(training?.overdriveBrace?' Also Braces.':''),
  'Next attack gains '+Math.round((deadeyePower(training)-1)*100)+'% power.'+(training?.deadeyeCascade?' Stays primed on limb destruction.':training?.deadeyeRefund?' A ranged kill refunds the shot’s AP.':''),
  'Restore up to '+repairAmount(training)+' body HP.'+(training?.limbRepair?' Also restore '+training.limbRepair+' HP to '+(training.repairAll?'each':'the weakest')+' damaged limb.':'')+(training?.repairBrace?' Also Braces.':'')+(training?.repairFailsafe?' Triggers on lethal body damage if unused.':'')
 ];
 return descriptions[i]+' Once per battle.';
}
const FIELDS=[
 {ground:'relay',label:'BASALT RIDGE / RELAY SHIELDS',grid:'#c1c3a92b',border:'#cdc49b7a',
  cover:{'2,3':'ridge-rock','3,3':'ridge-rock','7,3':'ridge-rock','7,4':'relay-shield','5,6':'relay-shield','6,6':'relay-shield','2,7':'ridge-rock','8,7':'ridge-rock','4,1':'relay-shield'}},
 {ground:'corridor',label:'REFINERY YARD / CARGO & POWER',grid:'#cbc7b62e',border:'#e2b5759c',
  cover:{'1,3':'cargo','2,3':'cargo','3,3':'transformer','6,4':'transformer','7,4':'transformer','8,4':'cargo','3,6':'cargo','4,6':'cargo','7,7':'transformer'}},
 {ground:'frontier',label:'FROZEN RUNOFF / WOODS & BUNKERS',grid:'#c6dbd52b',border:'#bbd4d091',
  cover:{'1,4':'conifer','2,4':'conifer','7,2':'conifer','8,2':'bunker','5,5':'conifer','6,5':'conifer','3,7':'bunker','7,7':'bunker','4,2':'conifer'}}
];
function stockHull(i){
 const frame=FRAMES[i];
 return{weapon:frame.weapon||(i===2?'missile':'rifle'),melee:frame.melee,condition:100,upgrade:0};
}
function fresh(){return{version:1,day:1,credits:4500,rep:0,wins:0,kills:0,itemInventory:true,owned:['rifle','rifle','missile'],units:PILOTS.map((_,i)=>({...stockHull(i),level:1,xp:0})),history:[]}}
const mechKills=(pilot,frame,career=save)=>career.mechMastery?.[pilotId(pilot)]?.kills[frame]??0;
const mechSlotCount=kills=>kills>=MECH_MASTERY_KILLS?2:1;
function enableMechComputers(){
 battle.mechComputers=true;
 for(const u of battle.units){
  if(u.kind)continue;
  u.mechSkills=u.team==='ally'?(save.mechMastery?.[pilotId(u.pilot)]?.slots?.[u.frame]??[]).filter(Number.isInteger):[];
 }
}
function recordMechKill(a,t){
 if(!battle.mechComputers||t.team!=='enemy'||t.kind||!MECH_SIGNATURES[a.frame])return;
 const before=mechKills(a.pilot,a.frame);
 if(before>=MECH_MASTERY_KILLS)return;
 const mastery=save.mechMastery??={};
 const record=mastery[pilotId(a.pilot)]??={kills:{}};
 const kills=record.kills[a.frame]=before+1;
 if(kills===MECH_LEARN_KILLS)addLog(CREW[a.pilot].call+' learned '+MECH_SIGNATURES[a.frame][0]+'.');
 if(kills===MECH_MASTERY_KILLS)addLog(CREW[a.pilot].call+' reached Mech Mastery in '+FRAMES[a.frame].name+'.');
}
function equipMechSkill(pilot,frame,slot,skill){
 if(battle||!hullOwned(frame)||!MECH_SIGNATURES[frame]||!Number.isInteger(slot)||slot<0||slot>=mechSlotCount(mechKills(pilot,frame)))return false;
 const record=save.mechMastery?.[pilotId(pilot)];
 if(!record||skill!==null&&(!MECH_SIGNATURES[skill]||skill===frame||mechKills(pilot,skill)<MECH_LEARN_KILLS))return false;
 const slots=[...(record.slots?.[frame]??[])];
 if(skill!==null&&slots.some((equipped,i)=>i!==slot&&equipped===skill))return false;
 while(slots.length<=slot)slots.push(null);
 slots[slot]=skill;
 while(slots.length&&slots.at(-1)===null)slots.pop();
 (record.slots??={})[frame]=slots;
 persist();
 return true;
}
function openMechComputer(pilot,frame){
 if(battle)return;
 const frames=FRAMES.map((_,i)=>i).filter(i=>MECH_SIGNATURES[i]&&hullOwned(i));
 if(!frames.includes(frame))frame=frames[0];
 const draw=()=>{
  const record=save.mechMastery?.[pilotId(pilot)],kills=mechKills(pilot,frame);
  const [signature,description]=MECH_SIGNATURES[frame];
  const slots=record?.slots?.[frame]??[],capacity=mechSlotCount(kills);
  const learned=Object.keys(record?.kills??{}).map(Number).filter(id=>id!==frame&&record.kills[id]>=MECH_LEARN_KILLS);
  modal('MECH COMPUTER',`<section class="mech-computer">
   <label>CHASSIS · ${CREW[pilot].call}<select id="computer-chassis">${frames.map(id=>`<option value="${id}" ${id===frame?'selected':''}>${FRAMES[id].name}</option>`).join('')}</select></label>
   <div class="computer-signature"><small>BUILT-IN</small><b>${signature}</b><p>${description}</p></div>
   <div class="computer-progress"><span>${kills>=MECH_LEARN_KILLS?'SKILL LEARNED':kills+' / '+MECH_LEARN_KILLS+' TO LEARN'}</span><span>${capacity===2?'MECH MASTERY':kills+' / '+MECH_MASTERY_KILLS+' MASTERY'}</span></div>
   ${[0,1].map(i=>i>=capacity?'<div class="computer-lock">SLOT 2 · MECH MASTERY REQUIRED</div>':`<label>COMPUTER SLOT ${i+1}<select data-mech-slot="${i}"><option value="">EMPTY</option>${learned.map(id=>`<option value="${id}" ${slots[i]===id?'selected':''} ${slots[1-i]===id?'disabled':''}>${MECH_SIGNATURES[id][0]}</option>`).join('')}</select>${slots[i]!=null?`<small>${MECH_SIGNATURES[slots[i]][1]}</small>`:''}</label>`).join('')}
   ${learned.length?'':'<p>Neutralize 5 enemy mechs with this pilot in a chassis to learn its skill. Equip it in a different chassis.</p>'}
  </section>`,[{text:'DONE',fn:()=>{closeModal();render()}}]);
  $('#computer-chassis').onchange=e=>{frame=Number(e.target.value);draw();$('#computer-chassis').focus()};
  for(const select of document.querySelectorAll('[data-mech-slot]'))select.onchange=()=>{
   const slot=Number(select.dataset.mechSlot);
   equipMechSkill(pilot,frame,slot,select.value===''?null:Number(select.value));draw();
   $(`[data-mech-slot="${slot}"]`)?.focus();
  };
 };
 draw();
}
const learnedTraining=(i,career=save)=>career.training?.[i]??[];
const earnedTraining=level=>TRAINING_POINT_LEVELS.filter(rank=>rank<=level).length;
const nextLevelXP=level=>level>=5&&level<10?400+(level-5)*25:level*100;
const trainingPoints=i=>earnedTraining(save.units[i].level)-learnedTraining(i).length;
const reliefTrainingPoints=id=>earnedTraining(save.reservePilots[id].level)-save.reservePilots[id].training.length;
const totalTrainingPoints=()=>LANCE_SLOTS.reduce((total,i)=>total+trainingPoints(i),0)+dutyRoster().reduce((total,id)=>total+reliefTrainingPoints(id),0);
function trainingStatus(i,id,learned,level){
 const branches=PILOT_TREES[i],branch=branches?.find(path=>path.nodes.some(node=>node.id===id));
 if(!branch)return 'UNKNOWN';
 const rank=branch.nodes.findIndex(node=>node.id===id);
 if(learned.includes(id))return 'LEARNED';
 const doctrine=branches.find(path=>learned.includes(path.nodes[DOCTRINE_RANK].id));
 if(rank>=DOCTRINE_RANK&&doctrine&&doctrine!==branch)return rank===DOCTRINE_RANK?'CAPSTONE CHOSEN':'OTHER DOCTRINE';
 if(level<TRAINING_LEVELS[rank])return 'LEVEL '+TRAINING_LEVELS[rank];
 if(rank===1&&!branches.some(path=>learned.includes(path.nodes[0].id)))return 'NEEDS LV 1 SKILL';
 if(rank>1&&!learned.includes(branch.nodes[rank-1].id))return 'PREVIOUS RANK';
 if(learned.length>=earnedTraining(level))return 'NEEDS 1 POINT';
 return 'TRAIN';
}
function trainingEffects(i){
 return effectsForTraining(pilotClass(i),learnedTraining(i));
}
function effectsForTraining(kind,learned){
 const effects={};
 for(const path of PILOT_TREES[kind])for(const node of path.nodes)if(learned.includes(node.id))Object.assign(effects,node.effects);
 return effects;
}
function learnTraining(i,id){
 if(battle||!save.units[i]||trainingStatus(pilotClass(i),id,learnedTraining(i),save.units[i].level)!=='TRAIN')return false;
 save.training??=PILOTS.map(()=>[]);
 save.training[i].push(id);
 persist();
 return true;
}
function restoreTraining(record){
 const clean=(kind,level,source)=>{
  const learned=[];
  if(Array.isArray(source))for(const id of source.slice(0,TRAINING_POINT_LEVELS.length)){
   if(trainingStatus(kind,id,learned,level)==='TRAIN')learned.push(id);
  }
  return learned;
 };
 if(record.training!==undefined)record.training=LANCE_SLOTS.map(i=>clean(pilotClass(i,record),record.units[i].level,record.training?.[i]));
 if(record.reservePilots)for(const [id,pilot] of Object.entries(record.reservePilots)){
  pilot.training=clean(CREW.findIndex((_,i)=>pilotId(i)===id),pilot.level,pilot.training);
 }
 return record;
}
function hirePilot(kind){
 const pilot=CREW[kind];
 if(battle||!pilot?.fee||save.credits<pilot.fee)return false;
 const id=pilotId(kind);
 if(save.reservePilots?.[id]||LANCE_SLOTS.some(i=>pilotClass(i)===kind))return false;
 (save.reservePilots??={})[id]={level:1,xp:0,training:[]};
 save.credits-=pilot.fee;persist();return true;
}
function assignPilot(i,kind){
 if(battle||!save.units[i]||!CREW[kind])return false;
 const id=pilotId(kind);
 if(!Object.hasOwn(save.reservePilots??{},id))return false;
 seatPilot(i,id);persist();return true;
}
function seatPilot(i,id){
 const from=LANCE_SLOTS.find(slot=>pilotId(pilotClass(slot))===id);
 if(from===i)return;
 const previous=pilotId(pilotClass(i)),unit=save.units[i];
 const outgoing={level:unit.level,xp:unit.xp,training:learnedTraining(i)};
 const incoming=from===undefined?save.reservePilots[id]:{level:save.units[from].level,xp:save.units[from].xp,training:learnedTraining(from)};
 save.training??=LANCE_SLOTS.map(()=>[]);
 save.training[i]=incoming.training;
 Object.assign(unit,{pilotId:id,level:incoming.level,xp:incoming.xp});
 if(from!==undefined){
  save.training[from]=outgoing.training;
  Object.assign(save.units[from],{pilotId:previous,level:outgoing.level,xp:outgoing.xp});
 }else{
  save.reservePilots[previous]=outgoing;
  delete save.reservePilots[id];
  const berth=dutyRoster().indexOf(id);
  if(berth>=0)save.duty[berth]=previous;
 }
}
const CAREER_STORAGE='iron-vow-career';
const PENDING_CAREER_STORAGE=CAREER_STORAGE+'-pending';
const LION_TRIAL_WEAPONS=['cleaver','hatchet','breaker'];
const benchMode=/(?:^|[?&])bench=(rig|war)(?:&|$)/.exec(window.location?.search??'')?.[1];
const benchRig=benchMode==='rig',benchWar=benchMode==='war';
const lionTrial=/(?:^|[?&])lion=(cleaver|hatchet|breaker)(?:&|$)/.exec(window.location?.search??'')?.[1];
let save,storedCareer=null,careerStale=false,careerDB=null,databaseCareer;
let pendingCareerWrite=Promise.resolve();
const queuedCareerWrites=[];
if(!benchWar&&!benchRig)try{storedCareer=localStorage.getItem(CAREER_STORAGE)}catch{}
function loadStoredCareer(raw){
 try{save=loadCareer(JSON.parse(raw))??fresh()}catch{save=fresh()}
}
if(lionTrial||benchWar||benchRig)save=fresh();
else loadStoredCareer(storedCareer);
const entryPage={'?view=ship':'ship','?view=career':'career','?view=hangar':'hangar','?view=mechs':'hangar','?view=contracts':'contracts','?view=overworld':'overworld','?view=inn':'inn','?view=workshop':'workshop','?view=pilots':'pilots','?view=journal':'journal','?view=wiki':'journal'}[window.location?.search]??'overworld';
let workshopView='assigned',hangarDeck=window.location?.search==='?view=mechs'?'mechs':'base';
let armoryGroup='assault';
let journalPage=window.location?.search==='?view=wiki'?'wiki':'orders';
let page=entryPage,selected=0,battle=null,action='move',effects=[],hover=null,clock=0,last=0,muted=false,audio=null,toastTimer,inspectOpen=false,lockedTarget=null,targetPanelOpen=false,modalReturnFocus=null;
let moveTap=null,overworldSelection=null,overworldRouteKey=null,overworldConfirmation=null,overworldDeparture=null,overworldHoldPreview=false,contractPortSelection=null,portSheetOpen=false,portSheetTab='services',portHullSelection='active:0';
try{muted=localStorage.getItem('iron-vow-sound')==='off'}catch{}
function pauseCareer(title,body){
 if(careerStale)return;
 closeHelp();
 modal(title,body,[
  {text:'RELOAD CAREER',fn:()=>window.location.reload()}
 ]);
 careerStale=true;
 for(const selector of ['header','#ui','#scene','#skip-shot'])$(selector).inert=true;
}
function pauseStaleCareer(){
 pauseCareer('CAREER UPDATED','<p>Another tab saved progress. Reload this tab to continue from the latest checkpoint.</p>');
}
function careerIsCurrent(){
 if(careerStale)return false;
 if(localStorage.getItem(CAREER_STORAGE)===storedCareer)return true;
 pauseStaleCareer();
 return false;
}
function openCareerDB(){
 return new Promise((resolve,reject)=>{
  const request=window.indexedDB.open(CAREER_STORAGE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('career');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
function readCareerDB(db){
 return new Promise((resolve,reject)=>{
  const request=db.transaction('career').objectStore('career').get(CAREER_STORAGE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
function writeCareerDB(snapshot){
 if(careerStale)return;
 return new Promise((resolve,reject)=>{
  const transaction=careerDB.transaction('career','readwrite');
  const store=transaction.objectStore('career'),check=store.get(CAREER_STORAGE);
  let applied=false;
  const accept=()=>{
   applied=true;
   // Keep the legacy localStorage copy current and notify other tabs.
   try{localStorage.setItem(CAREER_STORAGE,snapshot)}catch{}
  };
  // Compare the saved checkpoint inside the same transaction as the write.
  check.onsuccess=()=>{
   if(check.result===snapshot){accept();return}
   if(check.result!==databaseCareer||databaseCareer===undefined&&!careerIsCurrent())return;
   store.put(snapshot,CAREER_STORAGE).onsuccess=accept;
  };
  transaction.oncomplete=()=>{
   if(applied)databaseCareer=storedCareer=snapshot;
   else pauseStaleCareer();
   resolve();
  };
  transaction.onabort=()=>reject(transaction.error);
 });
}
function stashCareerWrites(){
 try{
  const storage=window.sessionStorage;
  if(!queuedCareerWrites.length){storage.removeItem(PENDING_CAREER_STORAGE);return}
  storage.setItem(PENDING_CAREER_STORAGE,JSON.stringify({
   base:databaseCareer??null,legacy:storedCareer,snapshots:queuedCareerWrites
  }));
 }catch{}
}
function queueCareerWrite(snapshot){
 queuedCareerWrites.push(snapshot);
 stashCareerWrites();
 pendingCareerWrite=pendingCareerWrite.then(()=>writeCareerDB(snapshot)).catch(()=>{
  toast('Storage unavailable. Keep this tab open to retain your career.');
 }).finally(()=>{
  queuedCareerWrites.shift();
  stashCareerWrites();
 });
 return pendingCareerWrite;
}
async function restorePendingCareer(){
 let raw;
 try{
  const saved=JSON.parse(window.sessionStorage.getItem(PENDING_CAREER_STORAGE));
  const snapshots=saved?.snapshots;
  if(Array.isArray(snapshots)&&snapshots.every(snapshot=>typeof snapshot==='string')){
   const prior=databaseCareer??storedCareer;
   const expected=databaseCareer===undefined?saved.legacy:saved.base;
   if(prior===expected||snapshots.includes(prior))raw=snapshots.at(-1);
   if(raw!==undefined&&!loadCareer(JSON.parse(raw)))raw=undefined;
  }
 }catch{raw=undefined}
 if(raw===undefined||raw===databaseCareer){stashCareerWrites();return}
 await queueCareerWrite(raw);
 if(!careerStale&&databaseCareer===raw)loadStoredCareer(raw);
}
function persist(enemyPending=false){
 if(lionTrial||benchWar||benchRig)return;
 const warn=()=>toast('Storage unavailable. Keep this tab open to retain your career.');
 try{
  if(careerStale||!careerDB&&!careerIsCurrent())return;
  if(battle&&battle.phase==='player'&&!battle.busy)save.sortie=captureSortie(enemyPending);
  else if(!battle)delete save.sortie;
  const snapshot=JSON.stringify(save);
  if(careerDB)return queueCareerWrite(snapshot);
  localStorage.setItem(CAREER_STORAGE,snapshot);
  storedCareer=snapshot;
 }catch{warn()}
}
function captureSortie(enemyPending=false){
 return{version:battle.aux||battle.launchAP?8:7,contract:battle.contract.id,legacy:battle.legacy,stockHostiles:battle.stockHostiles,slots:battle.slots,turn:battle.turn,selected,action:action==='jumpjet'?'move':action,part:'body',enemyPending,
  ...(battle.offer?{offer:{...battle.offer}}:{}),
  ...(battle.aux?{aux:battle.aux}:{}),...(battle.launchAP?{launchAP:battle.launchAP}:{}),
  ...(battle.frontierHellbreaker?{frontierHellbreaker:true}:{}),
  ...(battle.picketLineInfantry?{picketLineInfantry:true}:{}),
  ...(battle.corridorElite?{corridorElite:true}:{}),
  ...(battle.hardVanguard?{hardVanguard:true}:{}),
  ...(battle.reaverHostiles?{reaverHostiles:true}:{}),
  ...(battle.bulwarkHostile?{bulwarkHostile:true}:{}),
  ...(battle.ashigaruHostile?{ashigaruHostile:true}:{}),
  ...(battle.aeroMelee?{aeroMelee:battle.aeroMelee}:{}),
  ...(battle.relayLead?{relayLead:battle.relayLead}:{}),
  ...(battle.terrainSeed!==null?{terrainSeed:battle.terrainSeed}:{}),
  ...(battle.mechComputers?{mechComputers:true}:{}),
  units:battle.units.map(u=>({surrendered:u.surrendered||undefined,infantryWeapon:isLineInfantry(u)&&u.weapon!=='rifle'&&INFANTRY_PRIMARIES.includes(u.weapon)?u.weapon:undefined,x:u.x,z:u.z,face:u.face??(u.team==='enemy'?1:-1),heading:u.heading??defaultHeading(u),moveLeft:u.moveLeft,actionPhase:u.actionPhase,extraStep:u.extraStep,reacted:!!u.reacted,hp:{...u.hp},ap:u.ap,brace:u.brace,skill:u.skill,boost:u.boost,painted:u.painted,order:u.order,breach:u.breach,blackout:u.blackout,recoveryUsed:u.recoveryUsed,jumpjetUsed:u.jumpjetUsed||undefined,mechState:u.mechState&&Object.keys(u.mechState).length?u.mechState:undefined}))};
}
function dispatchSizes(){
 if(save.dispatch?.day!==save.day){
  save.dispatch={day:save.day,sizes:CONTRACTS.map(()=>1+Math.floor(ruleRandom()*3))};
  persist();
 }
 return save.dispatch.sizes;
}
function sortieSpawns(contract,count,ashigaru=true){
 if(count===3&&ashigaru&&contract.id==='picket')
  return contract.deployment.map((spawn,i)=>i===1?spawn.slice(1):spawn);
 if(count===3)return contract.deployment;
 const mechs=contract.deployment.filter(spawn=>spawn.length===2),vehicles=contract.deployment.filter(spawn=>spawn.length===3);
 if(count===1)return [...mechs.slice(0,1),...vehicles.slice(0,contract.id==='picket'?0:1)];
 return [...mechs.slice(0,2),...vehicles.slice(0,mechs.length===1?2:1)];
}
const reaverSlot=contract=>contract.id==='corridor'?2:contract.id==='frontier'?4:-1;
function hostileFrame(i,contract,stock=false,hellbreaker=false,picketLineInfantry=true,corridorElite=true,hardVanguard=true,reaverHostiles=true,bulwarkHostile=true,aeroMelee=null,relayLead=0){
 if(i===0&&!stock&&contract.id==='relay')return relayLead;
 if(i===1&&!stock&&contract.id==='picket')return ASHIGARU_FRAME;
 if(i===2&&!stock&&bulwarkHostile&&contract.id==='frontier')return BULWARK_FRAME;
 if(i===1&&!stock&&contract.id==='relay'&&aeroMelee)return AERO_FRAME;
 if(i===1&&!stock&&hardVanguard&&contract.difficulty>=2)return VANGUARD_FRAME;
 if(i===0&&!stock){
  if(picketLineInfantry&&contract.id==='picket')return LINE_INFANTRY_FRAME;
  if(corridorElite&&contract.id==='corridor')return LINE_ELITE_FRAME;
 }
 if(!stock&&reaverHostiles&&i===reaverSlot(contract))return REAVER_FRAME;
 return i===0&&hellbreaker?HELLBREAKER:(stock?null:FOUNDRY_HOSTILES[contract.id])?.[i]??i%3;
}
function contractIntel(i,count,{reveal=false,local=true}={}){
 const level=hangarLevel('recon');
 if(!reveal&&(!local||!level))return '';
 const contract=CONTRACTS[i],scanUsed=save.hangar?.scanDay===save.day;
 const aero=contract.id==='relay'&&count>1?dailyAeroMelee():null;
 const hostiles=sortieSpawns(contract,count).map((spawn,index)=>{
  if(spawn.length===3)return VEHICLES[spawn[0]].name;
  const frame=hostileFrame(index,contract,false,contract.id==='frontier',true,true,true,count===3,count===3,aero,dailyRelayLead());
  return FRAMES[frame].name+(frame===AERO_FRAME?' · '+weapon(aero).name:'');
 });
 return `<details class="contract-intel"><summary>HOSTILE MANIFEST</summary><ul>${hostiles.map(name=>'<li>'+name+'</li>').join('')}</ul></details>
  ${local&&level===2?`<button class="rescan-contract" data-rescan="${i}" ${scanUsed||save.credits<HANGAR_SERVICE_COST?'disabled':''}>${scanUsed?'SURVEY USED TODAY':'RESURVEY · '+money(HANGAR_SERVICE_COST)}</button>`:''}`;
}
const contractPay=(contract,count,tier=shipLevel('office'))=>Math.round(contract.pay*[0,.65,.85,1][count]*[1,1.15,1.25][tier]);
const validSlots=slots=>Array.isArray(slots)&&slots.length>=1&&slots.length<=3&&new Set(slots).size===slots.length&&slots.every(i=>LANCE_SLOTS.includes(i));
function validAux(aux){
 return !!aux&&shipLevel('drop')===2&&pilotKind(aux.pilotId)>=0&&Object.hasOwn(save.reservePilots??{},aux.pilotId)&&
  Number.isInteger(aux.frame)&&playerHull(aux.frame)&&(save.reserve?.[aux.frame]?.condition??0)>=30;
}
function createBattle(i,legacy=false,stockHostiles=legacy,slots=LANCE_SLOTS,frontierHellbreaker=true,aux=null,launchAP=Number(!legacy&&shipLevel('drop')>0),picketLineInfantry=true,corridorElite=true,hardVanguard=true,reaverHostiles=true,bulwarkHostile=true,ashigaruHostile=true,aeroMelee=dailyAeroMelee(),relayLead=dailyRelayLead()){
 const contract=CONTRACTS[i],field=FIELDS[contract.field];
 const layout=theaterLayouts?.[contract.field]?.cover||field.cover;
 const cover=legacy?field.cover:layout;
 battle={contract,field:{...field,cover},size:legacy?{width:10,depth:10}:NEW_BOARD,legacy,stockHostiles,slots:aux?[...slots,AUX_SLOT]:[...slots],aux,launchAP,terrainSeed:null,turn:1,phase:'player',units:[],cover:new Set(Object.keys(cover)),log:['Lance deployed. Reactor signatures detected.'],busy:false};
 battle.frontierHellbreaker=!legacy&&!stockHostiles&&contract.id==='frontier'&&frontierHellbreaker;
 battle.picketLineInfantry=!legacy&&!stockHostiles&&contract.id==='picket'&&picketLineInfantry;
 battle.corridorElite=!legacy&&!stockHostiles&&contract.id==='corridor'&&corridorElite;
 battle.hardVanguard=!legacy&&!stockHostiles&&contract.difficulty>=2&&slots.length>=2&&hardVanguard;
 battle.reaverHostiles=!legacy&&!stockHostiles&&reaverSlot(contract)>=0&&slots.length===3&&reaverHostiles;
 battle.bulwarkHostile=!legacy&&!stockHostiles&&contract.id==='frontier'&&slots.length===3&&bulwarkHostile;
 battle.ashigaruHostile=!legacy&&!stockHostiles&&contract.id==='picket'&&slots.length===3&&ashigaruHostile;
 battle.aeroMelee=!legacy&&!stockHostiles&&contract.id==='relay'&&slots.length>=2?aeroMelee:null;
 battle.relayLead=!legacy&&!stockHostiles&&contract.id==='relay'?relayLead:0;
 const allies=legacy?[[1,8],[2,9],[0,9]]:[[1,16],[2,18],[0,18]];
 const enemies=legacy?Array.from({length:contract.legacyMechs},(_,j)=>[j%3*3+2,Math.floor(j/3)]):sortieSpawns(contract,slots.length,battle.ashigaruHostile);
 battle.units=slots.map((slot,index)=>makeUnit(slot,'ally',...allies[index]));
 if(aux)battle.units.push(makeUnit(AUX_SLOT,'ally',3,18));
 for(const unit of battle.units){unit.ap+=launchAP;resetMovement(unit)}
 for(const [index,spawn] of enemies.entries()){
  const [kind,x,z]=spawn.length===3?spawn:[null,...spawn];
  const unit=kind?makeVehicle(kind,index,x,z):makeUnit(index,'enemy',x,z);
  if(!legacy)unit.face=Math.sign((allies[0][0]-allies[0][1])-(x-z))||-1;
  resetMovement(unit);
  battle.units.push(unit);
 }
 for(const unit of battle.units){
  const contact=battle.units.filter(other=>other.team!==unit.team).reduce((near,other)=>!near||distance(unit,other)<distance(unit,near)?other:near,null);
  unit.heading=headingTo(contact.x-unit.x,contact.z-unit.z);unit.face=Math.sign(Math.sin(unit.heading));
 }
 focusBattleCamera(battle.units[0],true);
}
function surveyTerrain(seed){
 const {contract,size,units}=battle;
 const deployment=[...contract.deployment.map(spawn=>spawn.slice(-2)),...units.map(u=>[u.x,u.z])];
 const {cells,cover}=window.ironVowTerrain(contract.field,seed,size,deployment);
 battle.terrainSeed=seed;
 battle.field={...battle.field,cells,cover};
 battle.cover=new Set(Object.keys(cover));
}
function makeVehicle(kind,index,x,z){
 const {name,hp,armor,gun}=VEHICLES[kind],tier=battle.contract.difficulty-1,body=hp+tier*8;
 return{id:'enemy'+index,index,kind,team:'enemy',x,z,vx:x,vz:z,name:name+' '+(index+1),weapon:gun.id,level:1,armor:armor+tier,hp:{body},max:{body},ap:ROUND_AP,brace:false,skill:false,boost:false,alive:true};
}
function restoreSortie(){
 const saved=save.sortie;if(!saved)return null;
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const currentVersion=saved.version>=3;
 const legacy=currentVersion?saved.legacy:saved.version===1;
 const contractId=currentVersion?saved.contract:integer(saved.contract,0,OLD_SORTIE_CONTRACTS.length-1)?OLD_SORTIE_CONTRACTS[saved.contract]:null;
 const contractIndex=CONTRACTS.findIndex(c=>c.id===contractId);
 const slots=saved.version>=6?saved.slots:LANCE_SLOTS;
 const aux=saved.version===8?saved.aux??null:null,launchAP=saved.version===8?saved.launchAP??0:0;
 const regular=aux&&Array.isArray(slots)?slots.slice(0,-1):slots;
 const shipValid=saved.version!==8||!legacy&&integer(launchAP,0,Number(shipLevel('drop')>0))&&(!aux||Array.isArray(slots)&&slots.at(-1)===AUX_SLOT&&validAux(aux));
 let valid=[1,2,3,4,5,6,7,8].includes(saved.version)&&validSlots(regular)&&shipValid&&(!legacy||slots.length===3)&&typeof legacy==='boolean'&&(saved.version<4||typeof saved.stockHostiles==='boolean')&&contractIndex>=0&&(!legacy||CONTRACTS[contractIndex].legacyMechs>0)&&integer(saved.turn,1,10000)&&slots.includes(saved.selected)&&['move','fire','strike','missile'].includes(saved.action)&&typeof saved.enemyPending==='boolean'&&Array.isArray(saved.units);
 valid=valid&&(saved.frontierHellbreaker===undefined||saved.frontierHellbreaker===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='frontier');
 valid=valid&&(saved.picketLineInfantry===undefined||saved.picketLineInfantry===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='picket');
 valid=valid&&(saved.corridorElite===undefined||saved.corridorElite===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='corridor');
 valid=valid&&(saved.hardVanguard===undefined||saved.hardVanguard===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&
  CONTRACTS[contractIndex]?.difficulty>=2&&regular.length>=2);
 valid=valid&&(saved.reaverHostiles===undefined||saved.reaverHostiles===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&reaverSlot(CONTRACTS[contractIndex])>=0&&regular.length===3);
 valid=valid&&(saved.bulwarkHostile===undefined||saved.bulwarkHostile===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&
  contractId==='frontier'&&regular.length===3);
 valid=valid&&(saved.ashigaruHostile===undefined||saved.ashigaruHostile===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='picket'&&regular.length===3);
 valid=valid&&(saved.aeroMelee===undefined||saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='relay'&&
  regular.length>=2&&AERO_MELEE.includes(saved.aeroMelee));
 valid=valid&&(saved.relayLead===undefined||saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='relay'&&RELAY_LEADS.includes(saved.relayLead));
 valid=valid&&(saved.terrainSeed===undefined||saved.version>=7&&!legacy&&integer(saved.terrainSeed,0,0xffffffff));
 valid=valid&&(saved.mechComputers===undefined||saved.mechComputers===true&&saved.version>=7&&!legacy);
 valid=valid&&(saved.offer===undefined||!legacy&&validAcceptedOffer(saved.offer)&&saved.offer.templateIndex===contractIndex);
 if(valid){
  createBattle(contractIndex,legacy,saved.version<4||saved.stockHostiles===true,regular,saved.frontierHellbreaker===true,aux,launchAP,saved.picketLineInfantry===true,saved.corridorElite===true,saved.hardVanguard===true,saved.reaverHostiles===true,saved.bulwarkHostile===true,saved.ashigaruHostile===true,saved.aeroMelee??null,saved.relayLead??0);
  if(saved.offer)battle.offer=Object.freeze({...saved.offer});
  if(saved.terrainSeed!==undefined)surveyTerrain(saved.terrainSeed);
  if(saved.mechComputers)enableMechComputers();
  valid=saved.units.length===battle.units.length;const occupiedTiles=new Set();
  for(let i=0;valid&&i<saved.units.length;i++){
   const state=saved.units[i],u=battle.units[i];
   const keptLaunchAP=u.team==='ally'&&(saved.turn===1||state?.hp?.body===0||state?.hp?.pilot===0);
   const maxAP=roundAP(u.training)+(u.pilot===0?overdriveAP(u.training):0)+(keptLaunchAP?launchAP:0);
   valid=!!state&&integer(state.x,0,battle.size.width-1)&&integer(state.z,0,battle.size.depth-1)&&(state.face===undefined||state.face===1||state.face===-1)&&!battle.cover.has(state.x+','+state.z)&&integer(state.ap,0,maxAP)&&typeof state.brace==='boolean'&&typeof state.skill==='boolean'&&typeof state.boost==='boolean'&&state.hp&&targetParts(u).every(p=>p==='pilot'&&saved.version<4&&state.hp.pilot===undefined||integer(state.hp[p],0,u.max[p]));
   if(valid&&saved.version>=5)valid=integer(state.moveLeft,0,mobility(u))&&typeof state.actionPhase==='boolean'&&typeof state.extraStep==='boolean'&&(!state.actionPhase||state.moveLeft===0)&&(!state.extraStep||state.actionPhase)&&typeof state.reacted==='boolean'&&Number.isFinite(state.heading)&&Math.abs(state.heading)<=Math.PI;
   if(valid&&saved.version>=6){
    const {painted,order}=state;
    valid=(painted===undefined||u.team==='enemy'&&painted&&integer(painted.shots,1,3)&&[.20,.30].includes(painted.aim)&&[0,.20].includes(painted.power))&&
     (order===undefined||u.team==='ally'&&order&&integer(order.shots,1,2)&&integer(order.discount,2,3)&&[0,.12].includes(order.aim)&&[0,.20].includes(order.power)&&typeof order.keepMove==='boolean');
    if(valid){u.painted=painted;u.order=order}
   }
   if(valid&&saved.version>=7){
    const {breach,blackout,recoveryUsed}=state,uses=recoveryUses(u.training);
    valid=(breach===undefined||u.pilot===SAPPER&&state.skill&&integer(breach,1,u.training?.breachShots??1))&&
     (blackout===undefined||u.team==='enemy'&&blackout&&[.20,.30,.40].includes(blackout.aim)&&[0,2,4].includes(blackout.ap)&&typeof blackout.hold==='boolean')&&
     (u.pilot===RETRIEVER?(recoveryUsed===undefined&&!state.skill||integer(recoveryUsed,1,uses)&&state.skill===(recoveryUsed===uses)):recoveryUsed===undefined);
    if(valid){u.breach=breach;u.blackout=blackout;u.recoveryUsed=recoveryUsed}
   }
   if(valid&&state.infantryWeapon!==undefined){
    valid=isLineInfantry(u)&&INFANTRY_PRIMARIES.includes(state.infantryWeapon);
    if(valid)u.weapon=state.infantryWeapon;
   }
   if(valid&&state.jumpjetUsed!==undefined)valid=saved.version>=7&&(FRAMES[u.frame]?.jumpjet===true||hasMechSkill(u,AERO_FRAME))&&state.jumpjetUsed===true;
   if(valid&&state.mechState!==undefined){
    valid=saved.mechComputers&&validMechState(state.mechState);
    if(valid)u.mechState={...state.mechState};
   }
   if(valid&&state.surrendered!==undefined)valid=state.surrendered===true&&u.team==='enemy'&&!u.kind&&state.hp.body>0&&state.hp.pilot>0;
   if(!valid)break;const key=state.x+','+state.z,alive=!state.surrendered&&state.hp.body>0&&(u.kind||(state.hp.pilot??1)>0);if(alive&&occupiedTiles.has(key)){valid=false;break}if(alive)occupiedTiles.add(key);
   u.jumpjetUsed=state.jumpjetUsed===true;
   u.face=state.face??(u.team==='enemy'?1:-1);u.x=u.vx=state.x;u.z=u.vz=state.z;u.hp=Object.fromEntries(targetParts(u).map(part=>[part,state.hp[part]??u.max[part]]));u.ap=state.ap;u.brace=state.brace;u.skill=state.skill;u.boost=state.boost;u.alive=alive;u.surrendered=state.surrendered;u.downReason=alive?null:state.surrendered?'surrender':u.hp.body>0?'pilot':'body';
   if(saved.version>=5){u.heading=FIELD_HEADINGS[headingIndex(state.heading)];u.face=Math.sign(Math.sin(u.heading));u.moveLeft=state.moveLeft;u.actionPhase=state.actionPhase;u.extraStep=state.extraStep;u.reacted=state.reacted}
   else{u.heading=defaultHeading(u);if(u.ap<8||u.brace){startAction(u);u.extraStep=true}}
  }
  valid=valid&&battle.units.some(u=>u.team==='ally'&&u.alive)&&battle.units.some(u=>u.team==='enemy'&&u.alive);
 }
 if(!valid){battle=null;delete save.sortie;persist();return null}
 battle.turn=saved.turn;selected=saved.selected;if(!current()||spent(current()))selected=battle.units.find(u=>u.team==='ally'&&u.alive&&!spent(u))?.index??selected;
 action=(saved.action==='strike'&&!current()?.melee||saved.action==='missile'&&!shoulderWeapon(current()))?'move':saved.action;effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;focusBattleCamera(current(),true);battle.log=['Sortie restored from the last completed action.'];
 return{enemyPending:saved.enemyPending};
}
function toast(s){if(careerStale)return;$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function money(n){return n.toLocaleString()+' CR'}
function weapon(id){return WEAPONS.find(w=>w.id===id)||WEAPONS[0]}
const weaponMotion=id=>{const w=weapon(id);return w.motion??w.effect??id};
function meleeWeapon(u){return u.melee&&(u.meleeHand==='right'||u.frame===BULWARK_FRAME||!equippedShield(u))?weapon(u.melee):null}
function launcherId(id){return ['missile','cerberus','locust','vesper-shoulder'].includes(id);}
function shoulderWeapon(u){
 const id=u?.shoulder??(launcherId(u?.weapon)?u.weapon:null);
 return launcherId(id)?weapon(itemId(id)):FRAMES[u?.frame]?.native==='cicada'?weapon('locust'):null;
}
function selectedWeapon(u,mode=action,target=null){
 if(!u)return;
 if(mode==='strike')return meleeWeapon(u);
 if(mode==='missile')return shoulderWeapon(u);
 if(target&&u.frame===ASHIGARU_FRAME){
  const scatter=weapon('flechette-scattergun');
  if(distance(u,target)<=combatRange(u,target,scatter)&&canUseWeapon(u,scatter))return scatter;
 }
 return unitWeapon(u);
}
const paidAttackAP=(u,w)=>Math.max(1,weaponAP(w,u.training)-(u.order?.discount??0));
function weaponSubsystem(u,w){return launcherId(w.id)?'body':w===REAVER_AUTOCANNON&&u.hp.right<=0?'left':w.hand||(w.melee?(w.id===u.melee&&u.meleeHand==='right'?'right':'left'):'right')}
const workingWeapon=(u,w)=>Boolean(w&&w!==EMPTY_HAND&&u.hp[weaponSubsystem(u,w)]>0);
function canUseWeapon(u,w){return Boolean(u&&workingWeapon(u,w)&&(!u.lionTrial||w.melee&&LION_TRIAL_WEAPONS.includes(w.id))&&u.ap>=paidAttackAP(u,w))}
function scoutWeapon(u,target,reaction=false){
 const range=distance(u,target);
 return [meleeWeapon(u),weapon('flechette-scattergun'),unitWeapon(u)].find(w=>w&&range<=w.range&&
  !attackObstruction(u,target,w)&&(reaction?u.hp[weaponSubsystem(u,w)]>0:canUseWeapon(u,w)));
}
function infoTip(label,description){
 const escaped=description.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 return `<button type="button" class="info-tip" aria-label="Help for ${label}" data-help="${escaped}">${icon('info')}</button>`;
}
const helpHint=()=>`<span class="info-hint">${icon('info')} <span class="mouse-help">Hover or focus for help</span><span class="touch-help">Tap or hold for help</span></span>`;
const MOVE_HELP='Move with working legs. Fire, Strike, Brace and most pilot skills end the free allowance.';
const COUNTER_HELP='One reaction per round for 0 AP. Equipped melee strikes adjacent ground attackers first. Guns return fire in range. Missile launchers cannot counter. A working free hand can punch an adjacent ground attacker for 5–10 damage if no weapon can reply.';
const FOUNDATION_HELP='Either level 1 skill opens both level 3 skills.';
function learnReserveTraining(id,skill){
 const pilot=save.reservePilots?.[id];
 if(battle||!pilot||!dutyRoster().includes(id)&&!hangarLevel('personnel')||trainingStatus(pilotKind(id),skill,pilot.training,pilot.level)!=='TRAIN')return false;
 pilot.training.push(skill);persist();return true;
}
function trainingTree(i,advanced){
 const reserve=typeof i==='string';
 const kind=reserve?pilotKind(i):pilotClass(i),pilot=CREW[kind];
 const level=reserve?save.reservePilots[i].level:save.units[i].level;
 const learned=reserve?save.reservePilots[i].training:learnedTraining(i);
 advanced??=level>=6&&PILOT_TREES[kind].some(path=>learned.includes(path.nodes[DOCTRINE_RANK].id));
 const start=advanced?DOCTRINE_RANK+1:0,end=advanced?TRAINING_LEVELS.length:DOCTRINE_RANK+1;
 const paths=PILOT_TREES[kind].map(path=>`<section class="training-path" aria-label="${path.name}">
  <h2>${icon(path.glyph)} ${path.name}</h2>
  <ol>${path.nodes.slice(start,end).map((node,index)=>{
   const rank=start+index;
    const status=trainingStatus(kind,node.id,learned,level);
   return `<li><button type="button" data-learn="${node.id}" data-training-state="${status}" ${status==='TRAIN'?'':'disabled'}>
    <span class="training-rank">LV ${TRAINING_LEVELS[rank]}${rank===DOCTRINE_RANK?' · DOCTRINE':rank===TRAINING_LEVELS.length-1?' · MASTERY':''}</span>
    <strong>${node.name}</strong><span class="training-effect">${node.label}</span>
    <span class="training-state">${status==='TRAIN'?'TRAIN · 1 PT':status}</span>
   </button></li>`;
  }).join('')}</ol>
 </section>`).join('');
 modal(pilot.call+' TRAINING',`<div class="stat-heading training-head">
   <span>LEVEL ${level} · ${earnedTraining(level)-learned.length} PT AVAILABLE</span><span>ONE DOCTRINE ${infoTip('pilot training','Earn one point at levels 1 through 6, then at 8 and 10. '+FOUNDATION_HELP+' Your level 5 doctrine opens its advanced ranks.')}</span>
  </div><div class="reference-tabs" aria-label="Training ranks">
   <button type="button" data-training-stage="foundation" aria-pressed="${!advanced}">FOUNDATION · 1–5</button>
   <button type="button" data-training-stage="advanced" aria-pressed="${advanced}">ADVANCED · 6–10</button>
  </div>${advanced?'':`<small class="training-rule">${FOUNDATION_HELP}</small>`}<div class="training-paths${advanced?'':' shared-foundation'}">${paths}</div>`,[{text:'DONE',fn:closeModal}]);
 document.querySelectorAll('[data-training-stage]').forEach(button=>button.onclick=()=>trainingTree(i,button.dataset.trainingStage==='advanced'));
 $('#modal .modalbox').scrollTop=0;
 $('#modal [data-training-stage][aria-pressed="true"]')?.focus({preventScroll:true});
 document.querySelectorAll('[data-learn]').forEach(button=>button.onclick=()=>{
  if(!(reserve?learnReserveTraining(i,button.dataset.learn):learnTraining(i,button.dataset.learn)))return;
  sound('click');render();
  modalReturnFocus=$(reserve?`[data-reserve-training="${i}"]`:'#train-pilot-'+i);
  trainingTree(i,advanced);
  $('#modal [data-learn]:not([disabled])')?.focus();
 });
}
function counterSummary(primary,melee,training,shield){
 const range=counterRange(primary,training),close=melee?'Adjacent melee':'Adjacent free hand';
 if(shield)return range?range+' tiles · ranged':'Unavailable';
 return range?range+' tiles or '+close.toLowerCase():close+(melee?'':' · 5–10 DMG');
}
function workshopStats(i,frame,hull,training=trainingEffects(i)){
 const loadout={...hull,frame:pilotFrame(i)};
 const kind=pilotClass(i),parts=chassisParts(frame,hull,training),armor=chassisArmor(frame,hull,training),primary=unitWeapon(loadout),melee=meleeWeapon(loadout),shield=equippedShield(loadout),pilot=CREW[kind];
 const reach=weaponRange(primary,training);
 const stats=[
  ['Free movement',chassisMobility(frame,false,training)+' tiles',MOVE_HELP],
  ['Extra movement','1 tile / '+EXTRA_MOVE_AP+' AP','One extra tile per round with working legs. It uses the last of your free movement.'],
  ...(frame.dodge?[['Dodge',Math.round(frame.dodge*100)+'%','Chance to evade an incoming round or shell.']]:[]),
  ...(frame.jumpjet?[['Jumpjet',JUMPJET_RANGE+' tiles / '+JUMPJET_AP+' AP',JUMPJET_HELP]]:[]),
  ['Armor',armor,'Losing the left arm reduces armor to '+damagedArmor(armor)+'.'],
  ['AP per round',roundAP(training)],
  ...Object.entries(parts).map(([part,max])=>[PART_LABEL[part],deploymentHP(max,hull.condition)+' / '+max+' HP']),
  ['Pilot',CREW_HP[kind]+' HP']
 ];
 return `<section class="workshop-stats" aria-label="Sortie stats">
  <div class="stat-heading"><span class="eyebrow">${frame.name} / SORTIE STATS</span>${helpHint()}</div>
  <div class="stat-key"><span>${hull.condition}% condition</span><span>Part HP · deployment / max</span></div>
  <dl>${stats.map(([label,value,help])=>`<div><dt>${label}</dt><dd>${value}</dd>${help?infoTip(label,help):''}</div>`).join('')}</dl>
  ${hull.condition<30?'<div class="repair-warning">Repair to 30% condition to deploy.</div>':''}
  <div class="workshop-actions">
   <div>${icon('crosshair')} <span><b>Fire</b> ${weaponAP(primary,training)} AP<small>${primary.name} · ${reach} tiles</small></span></div>
   ${melee||!shield?`<div>${icon('crosshair')} <span><b>Melee</b> ${melee?`${weaponAP(melee,training)} AP<small>${melee.name} · adjacent</small>`:'<small>No melee equipped</small>'}</span></div>`:''}
   ${shield?`<div>${icon('shield-chevron')} <span><b>Shield</b> 0 AP<small>${shield.name} · −${shieldPercent(shield)} arm damage</small></span>${infoTip('shield',SHIELD_HELP)}</div>`:''}
   <div>${icon('shield-chevron')} <span><b>Brace</b> ${braceCost(training)} AP<small>Blocks ${Math.round(braceReduction(training)*100)}% damage</small></span></div>
   <div>${icon('lightning')} <span><b>${pilot.skill}</b> ${skillCost(kind,training)} AP<small>${kind===RETRIEVER&&recoveryUses(training)===2?'Twice':'Once'} per battle</small></span>${infoTip(pilot.skill,skillDescription(kind,training))}</div>
   <div>${icon('arrow-u-up-left')} <span><b>Counter</b> 0 AP<small>1 / round · ${counterSummary(primary,melee,training,shield)}</small></span>${infoTip('counterattack',COUNTER_HELP+(training.reactionPower?' This pilot gains 25% counterattack power.':'')+(training.braceCounterRange&&counterRange(primary,training)?' While Braced, ranged reach is '+counterRange(primary,training,true)+' tiles.':''))}</div>
  </div>
 </section>`;
}
const armorySlot=w=>launcherId(w.id)?'shoulder':w.melee?'melee':'weapon';
const slotItem=(u,w)=>armorySlot(w)==='shoulder'?u.shoulder??(launcherId(u.weapon)?u.weapon:null):u[armorySlot(w)];
function fitButton(w,equipped,offer){
 const text=equipped?'EQUIPPED':offer.free?'EQUIP · '+offer.free+' FREE':offer.reason||'BUY & EQUIP · '+money(offer.price);
 return `<button type="button" data-equip="${w.id}" aria-pressed="${equipped}" ${equipped||!offer.free&&offer.reason?'disabled':''}>${text}</button>`;
}
const armoryReach=(w,training)=>w.melee?'Adjacent':weaponRange(w,training)+' tiles';
function equipmentPicture(kind,id){
 const url=window.IronVowFoundry?.equipmentThumbnail(kind,id);
 return `<img class="weapon-card-art" data-equipment-kind="${kind}" data-equipment-id="${id}" alt=""${url?' src="'+url+'"':''} loading="lazy" decoding="async">`;
}
function armoryCard(u,w,training){
 const equipped=itemId(slotItem(u,w))===itemId(w.id),offer=equipmentOffer(w.id);
 const rightOption=w.melee&&openHands(pilotFrame(selected))&&!u.shield&&u.meleeHand!=='right';
 const disabled=Boolean(!equipped&&!offer.free&&offer.reason);
 const special=w.shoulder||launchesMissiles(w)?'CANNOT COUNTER':w.pierce?`${Math.round(w.pierce*100)}% ARMOR PIERCE`:w.aim?`${w.aim>0?'+':''}${Math.round(w.aim*100)} AIM`:'';
 const trait=[burstLabel(w),special].filter(Boolean).join(' · ');
 return `<article class="armory-card${equipped?' active':''}" data-weapon-card="${w.id}" tabindex="-1">
   <div class="armory-card-head"><span class="eyebrow">${w.type}</span>${infoTip(w.name,w.desc)}</div>
   <h3>${w.name}</h3>
   ${equipmentPicture('weapon',w.id)}
   <dl><div><dt>${w.burst?'MAX DMG':'DMG'}</dt><dd>${volleyBudget(w,w.damage)}</dd></div><div><dt>REACH</dt><dd>${w.melee?'1 tile':armoryReach(w,training)}</dd></div><div><dt>AP</dt><dd>${weaponAP(w,training)}</dd></div></dl>
   <div class="armory-card-foot">${trait?`<span class="armory-trait">${trait}</span>`:''}
    ${fitButton(w,equipped,offer)}
    ${rightOption?`<button type="button" data-equip-right="${w.id}" ${disabled?'disabled':''}>${equipped?'MOVE TO RIGHT HAND':offer.free?'EQUIP RIGHT HAND':'BUY FOR RIGHT HAND'}</button>`:''}
   </div>
  </article>`;
}
function shieldCard(u,shield){
 const equipped=u.shield===shield.id;
 return `<article class="armory-card${equipped?' active':''}" data-shield-card="${shield.id}" tabindex="-1">
  <div class="armory-card-head"><span class="eyebrow">${shield.type}</span>${infoTip(shield.name,shield.desc+' '+SHIELD_HELP)}</div>
  <h3>${shield.name}</h3>
  ${equipmentPicture('shield',shield.id)}
  <dl><div><dt>BLOCK</dt><dd>Always</dd></div><div><dt>ARM DMG</dt><dd>−${shieldPercent(shield)}</dd></div><div><dt>AP</dt><dd>0</dd></div></dl>
  <div class="armory-card-foot"><span class="armory-trait">LEFT HAND</span>
   ${fitButton(shield,equipped,equipmentOffer(shield.id))}
   ${equipped?'<button class="remove-melee" id="remove-shield" type="button">UNEQUIP</button>':''}
  </div>
 </article>`;
}
function workshopArmory(u,training){
 const owned=save.owned.length;
 const shield=equippedShield(u),rack=shoulderWeapon(u);
 const mounted=[u.meleeHand==='right'?meleeWeapon(u):launcherId(u.weapon)||!u.weapon?null:weapon(u.weapon),shield||(!u.meleeHand?meleeWeapon(u):null)];
 if(rack)mounted.push(rack);
 const limits={assault:'UNDER 6 TILES',strike:'6+ TILES',melee:'ADJACENT',shields:'AUTO-BLOCK'};
 const guarding=armoryGroup==='shields';
 const cards=armoryOptions[armoryGroup].filter(w=>FRAMES[pilotFrame(selected)].native!=='cicada'||!launcherId(w.id)).map(w=>guarding?shieldCard(u,w):armoryCard(u,w,training)).join('');
 return `<section class="workshop-armory" aria-label="Company armory">
  <div class="armory-title"><div><span class="eyebrow">COMPANY ARMORY</span><h2>Weapons</h2></div><span class="tag">${owned} ITEMS</span></div>
  <div class="armory-mounted" aria-label="Equipped loadout">${mounted.map((w,index)=>`<div><span class="eyebrow">${index===2?'SHOULDER / MISSILES':index?'LEFT HAND / '+(shield?'SHIELD':'MELEE'):u.meleeHand==='right'?'RIGHT HAND / MELEE':'RIGHT HAND / FIRE'}</span>
   <b>${w?w.name:'Free hand'}</b><small>${w&&w===shield?'Auto-block · −'+shieldPercent(w)+' arm damage':w?volleyBudget(w,w.damage)+(w.burst?' MAX DMG · ':' DMG · ')+armoryReach(w,training)+' · '+weaponAP(w,training)+' AP':'5–10 DMG · Adjacent counter'}</small>
   ${w&&w.id===u.melee&&!w.builtIn?'<button class="remove-melee" id="remove-melee" type="button">UNEQUIP</button>':index===2&&!w.builtIn?'<button class="remove-melee" id="remove-shoulder" type="button">UNEQUIP</button>':!index&&w&&!w.melee?'<button class="remove-melee" id="remove-primary" type="button">UNEQUIP</button>':''}</div>`).join('')}</div>
  <div class="armory-class-tabs" aria-label="Weapon classes">${Object.entries(ARMORY_CLASSES).map(([key,label])=>`<button type="button" data-armory-class="${key}" aria-pressed="${armoryGroup===key}">
   <b>${label} <span>${armoryOptions[key].length}</span></b><small>${limits[key]}</small>
  </button>`).join('')}</div>
  <div class="inline-help armory-help"><small>${guarding?'ALL HITS → LEFT ARM':'BASE DAMAGE · TRAINED REACH & AP'}</small>${guarding?infoTip('shield interception',SHIELD_HELP):infoTip('armory classes','Strike weapons start at 6 tiles of base range. Assault weapons have shorter base range. Each fitted weapon uses one inventory copy. Right-hand melee replaces that hand’s gun and leaves the left hand free for a shield. Missile launchers use the shoulder.')}<button type="button" id="armory-preview" class="armory-jump">MECH PREVIEW ↓</button></div>
  <div class="armory-grid${guarding?' armory-shields':''}" aria-label="${guarding?'Shields':ARMORY_CLASSES[armoryGroup]+' weapons'}">${cards}</div>
 </section>`;
}
function keepShoulder(hull){
 if(launcherId(hull.weapon)){hull.shoulder??=hull.weapon;hull.weapon=null;}
}
function equipWeapon(id,hand){
 const shield=shieldItem(id),w=shield||WEAPONS.find(entry=>entry.id===id),frame=pilotFrame(selected),u=save.units[selected];
 if(battle||!w||w.builtIn||!(openHands(frame)||breachLoadout(frame)||fixedPrimaryOptions(frame).includes(id)||fixedMeleeOption(frame)===id)||
    (FRAMES[frame].native==='cicada'&&launcherId(id))||
    (shield?!canFitShield(frame):breachLoadout(frame)&&!['cleaver','missile','vesper-shoulder'].includes(id)))return false;
 const slot=shield?'shield':armorySlot(w),current=shield?u.shield:slotItem(u,w);
 const same=itemId(current)===itemId(id);
 if(same&&(!w.melee||hand!=='right'||u.meleeHand==='right'))return false;
 if(shield&&u.melee&&breachLoadout(frame))return toast('Unequip the left-hand cleaver first');
 if(w.melee&&u.shield&&breachLoadout(frame))return toast('Unequip the left-hand shield first');
 const offer=equipmentOffer(id);
 if(!same&&!offer.free){
  if(offer.reason)return toast(offer.reason);
  if(!purchaseWeapon(id,offer.price))return false;
 }
 if(openHands(frame)){
  keepShoulder(u);
  if(shield&&u.melee==='pulse-bash')delete u.melee;
  if((shield&&u.melee)||(w.melee&&(u.shield||hand==='right'))){u.meleeHand='right';u.weapon=null;}
  if(slot==='weapon'&&u.meleeHand==='right'){delete u.melee;delete u.meleeHand;}
 }
 u[slot]=id;persist();refreshArmory(`[data-${shield?'shield':'weapon'}-card="${id}"]`);toast(w.name+' equipped');
 return true;
}
function fixedMeleeOption(frame){return FRAMES[frame].fixedWeapons&&equipmentItem(FRAMES[frame].melee)?FRAMES[frame].melee:null;}
function fixedPrimaryOptions(frame){
 if(FRAMES[frame].captureOnly)return INFANTRY_PRIMARIES;
 return FRAMES[frame].fixedWeapons&&frame!==REAVER_FRAME&&equipmentItem(FRAMES[frame].weapon)?[FRAMES[frame].weapon]:[];
}
const hullSlot=frame=>LANCE_SLOTS.findIndex(i=>pilotFrame(i)===frame);
const hullOwned=frame=>hullSlot(frame)>=0||Boolean(save.reserve?.[frame]);
const hullOnMarket=frame=>playerHull(frame)&&!FRAMES[frame].salvageOnly&&!FRAMES[frame].captureOnly&&FRAMES[frame].cost>0&&!hullOwned(frame);
const rebuildPrice=frame=>Math.max(400,Math.round((FRAMES[frame].cost??1500)*.35/50)*50);
const scrapPrice=frame=>Math.round(rebuildPrice(frame)*.45/25)*25;
function acquireHull(frame,salvaged=false,localPort=null){
 const intact=salvaged&&Boolean(save.captured?.[frame]);
 if(battle||!playerHull(frame)||hullOwned(frame)||(salvaged?!intact&&(!salvageableHull(frame)||!save.salvage?.[frame]):!hullOnMarket(frame)))return false;
 if(localPort!==null&&(salvaged||!canUsePort(localPort)||!portStock(localPort)?.frames.includes(frame)))return false;
 const price=intact?0:salvaged?rebuildPrice(frame):localPort===null?FRAMES[frame].cost:portStockPrice(FRAMES[frame].cost,localPort);
 if(save.credits<price)return false;
 const hull={...stockHull(frame),condition:salvaged&&!intact?rebuildIntegrity():100};
 // Captured hulls keep their integrated systems. Portable gear was awarded separately.
 if(intact){
  if(openHands(frame))keepShoulder(hull);
  for(const slot of ['weapon','melee','shoulder']){
   if(slot==='weapon'&&frame===REAVER_FRAME)continue;
   if(equipmentItem(hull[slot])&&availableCopies(hull[slot])<=0)hull[slot]=slot==='weapon'?null:undefined;
  }
 }
 (save.reserve??={})[frame]=hull;
 save.credits-=price;
 if(salvaged)takeSalvage(frame,intact);
 if(!intact)save.owned.push(...portableItems(hull,frame));
 persist();return true;
}
function takeSalvage(frame,intact=false){
 const stock=intact?save.captured:save.salvage;
 if(--stock[frame]===0)delete stock[frame];
}
function recycleHullBody(frame){
 const intact=Boolean(save.captured?.[frame]);
 if(battle||!intact&&(!salvageableHull(frame)||!save.salvage?.[frame]))return false;
 takeSalvage(frame,intact);save.credits+=scrapPrice(frame);persist();return true;
}
function workshopTabs(){
 const counts={assigned:3,storage:Object.keys(save.reserve??{}).length,market:FRAMES.filter((_,i)=>hullOnMarket(i)).length,salvage:[...Object.values(save.salvage??{}),...Object.values(save.captured??{})].reduce((sum,n)=>sum+n,0)};
 return `<div class="reference-tabs bay-tabs" aria-label="Workshop bays">${Object.entries(counts).map(([view,count])=>`<button type="button" data-bay="${view}" aria-pressed="${workshopView===view}">${view} <b>${count}</b></button>`).join('')}</div>`;
}
function chassisAssignments(i,training){
 const assigned=pilotFrame(i),view=workshopView;
 const choices=FRAMES.map((frame,index)=>{
  if(!playerHull(index))return '';
  const slot=hullSlot(index),reserve=save.reserve?.[index],intact=save.captured?.[index]??0;
  const bodies=(salvageableHull(index)?save.salvage?.[index]??0:0)+intact;
  if(view==='assigned'&&slot<0||view==='storage'&&!reserve||view==='market'&&!hullOnMarket(index)||view==='salvage'&&!bodies)return '';
  const salvaged=view==='salvage',hull=salvaged?stockHull(index):slot>=0?save.units[slot]:reserve??stockHull(index);
  const {body,right,legs}=chassisParts(frame,hull,training);
  const loadout={...hull,frame:index},primary=unitWeapon(loadout),melee=meleeWeapon(loadout),shield=equippedShield(loadout);
  return `<article class="bay-card"${view==='storage'?` data-stored-hull-card="${index}" tabindex="-1" aria-label="${frame.name}"`:''}>
   <img ${chassisPicture(index,hull,1)} alt="" loading="lazy">
   <span class="eyebrow">${frame.model} / ${frame.role}</span><h3>${frame.name}</h3>
   <p>${salvaged?intact?intact+' intact · '+bodies+' recovered':bodies+' recovered '+(bodies===1?'body':'bodies')+' · '+rebuildIntegrity()+'% rebuilt':hull.condition+'% integrity'}${slot>=0&&!salvaged?' · '+pilotProfile(slot).call:''}</p>
   <dl><div><dt>Free move</dt><dd>${chassisMobility(frame,false,training)}</dd></div><div><dt>Armor</dt><dd>${chassisArmor(frame,hull,training)}</dd></div><div><dt>Body</dt><dd>${body}</dd></div><div><dt>Each arm</dt><dd>${right}</dd></div><div><dt>Legs</dt><dd>${legs}</dd></div><div><dt>Fire AP</dt><dd>${weaponAP(primary,training)}</dd></div></dl>
   <small>${primary.name} · ${weaponRange(primary,training)} tiles</small>
   <small>${shield?shield.name+' · −'+shieldPercent(shield)+' arm damage':melee?melee.name+' · '+weaponAP(melee,training)+' AP':'No melee'}</small>
   <small>Counter · ${counterSummary(primary,melee,training,shield)} · 0 AP</small>
   ${frame.jumpjet?'<small>Jumpjet · '+JUMPJET_RANGE+' tiles / '+JUMPJET_AP+' AP · once per sortie</small>':''}
   ${frame.dodge?'<small>Dodge · '+Math.round(frame.dodge*100)+'% per incoming round or shell</small>':''}
   <div class="bay-actions">${salvaged?`<button data-rebuild="${index}" ${hullOwned(index)||!intact&&save.credits<rebuildPrice(index)?'disabled':''}>${hullOwned(index)?'HULL OWNED':intact?'RECOVER INTACT':'REBUILD · '+money(rebuildPrice(index))}</button><button data-recycle="${index}">RECYCLE · +${money(scrapPrice(index))}</button>`:view==='market'?`<button data-buy-hull="${index}" ${save.credits<frame.cost?'disabled':''}>BUY · ${money(frame.cost)}</button>`:`<button data-chassis="${index}" aria-pressed="${index===assigned}" ${index===assigned?'disabled':''}>${index===assigned?'SELECTED':slot>=0?'SWAP WITH '+pilotProfile(slot).call:'ASSIGN TO '+pilotProfile(i).call}</button>`}</div>
   ${view==='storage'&&hangarLevel('fabrication')&&hull.condition<patchLimit()?`<button data-patch-storage="${index}">FIELD PATCH · ${patchLimit()}%</button>`:''}
  </article>`;
 }).join('');
 const empty={storage:'Storage is empty. Buy or rebuild a hull, or swap in a stored machine.',market:'Every catalogued hull is already owned.',salvage:'Clear a sortie to recover an enemy mech body.'};
 return `<section class="chassis-assignment" aria-label="Chassis comparison"><div class="stat-heading"><span class="eyebrow">COMPARE WITH ${pilotProfile(i).call}</span>${infoTip('chassis comparison','Stats use the selected pilot’s training. Free move is in tiles and part HP is maximum. Weapons, paint and condition stay with a swapped hull.'+(view==='salvage'?' Rebuild puts a stock hull into Storage at '+rebuildIntegrity()+'% integrity.':'')+(view==='market'?' Purchases go to Storage.':''))}</div>
  <p class="bay-rules">${roundAP(training)} AP per round · Extra tile ${EXTRA_MOVE_AP} AP · Brace ${braceCost(training)} AP</p>
  ${choices?`<div class="bay-grid">${choices}</div>`:`<p class="bay-empty">${empty[view]}</p>`}
  ${view==='market'?'<a class="rig-bench-link" href="foundry/studio.html">INSPECT FOUNDRY MODELS →</a>':''}
 </section>`;
}
function assignChassis(i,frame,allowSwap=false){
 if(battle||!PILOTS[i]||!Number.isInteger(frame)||!playerHull(frame))return false;
 const u=save.units[i],previous=pilotFrame(i);
 if(previous===frame)return false;
 const other=PILOTS.findIndex((_,slot)=>pilotFrame(slot)===frame);
 if(other>=0&&!allowSwap)return false;
 const purchase=other<0&&!save.reserve?.[frame];
 if(purchase&&!hullOnMarket(frame))return false;
 const cost=purchase?FRAMES[frame].cost:0;
 if(save.credits<cost)return false;
 const reserve=save.reserve??={};
 const hull=({weapon,melee,meleeHand,shoulder,shield,paintFinish,paint,trim,condition,upgrade})=>({weapon,melee,meleeHand,shoulder,shield,paintFinish,paint,trim,condition,upgrade});
 const next=other>=0?hull(save.units[other]):reserve[frame]||stockHull(frame);
 if(other>=0){
   save.units[other]={...save.units[other],...hull(u),frame:previous};
 }else{
  reserve[previous]=hull(u);delete reserve[frame];save.credits-=cost;
  if(purchase)save.owned.push(...portableItems(next,frame));
 }
  save.units[i]={...u,...hull(next),frame};
 persist();
 return true;
}
function builtInLoadout(u,training,frame){
 const loadout={...u,frame};
 const fixed=[unitWeapon(loadout),!breachLoadout(frame)&&meleeWeapon(loadout)].filter(w=>w&&w!==EMPTY_HAND).map(w=>`<article class="fixed-loadout"><div class="stat-heading"><span class="eyebrow">${w.melee&&w.hand!=='right'?'LEFT HAND':'PRIMARY'} / ${ARMORY_CLASSES[armoryClass(w)]}</span>${infoTip(w.name,w.desc||'Factory weapon.')}</div><h3>${w.name}</h3><small>${w.damage} BASE DMG / ${armoryReach(w,training)} / ${weaponAP(w,training)} AP</small></article>`).join('');
 if(!breachLoadout(frame)){
  const refits=[...fixedPrimaryOptions(frame),fixedMeleeOption(frame)].filter(Boolean);
  return fixed+(refits.length?'<div class="armory-grid">'+refits.map(id=>armoryCard(u,weapon(id),training)).join('')+'</div>':'')+
   (equipmentItem(u.weapon)&&fixedPrimaryOptions(frame).length?'<button class="remove-melee" id="remove-primary" type="button">UNEQUIP PRIMARY</button>':'')+
   (u.melee&&fixedMeleeOption(frame)?'<button class="remove-melee" id="remove-melee" type="button">UNEQUIP MELEE</button>':'');
 }
 return fixed+`<div class="armory-grid armory-kits">
  <div><h3 class="loadout-slot">LEFT HAND / MELEE</h3>${armoryCard(u,weapon('cleaver'),training)}
   ${u.melee?'<button class="remove-melee" id="remove-melee" type="button">UNEQUIP CLEAVER</button>':''}</div>
  <div><h3 class="loadout-slot">RIGHT SHOULDER / STRIKE</h3>${armoryCard(u,weapon('vesper-shoulder'),training)}
   ${u.shoulder?'<button class="remove-melee" id="remove-shoulder" type="button">UNEQUIP POD</button>':''}</div>
 </div><div class="inline-help armory-help"><small>LEFT HAND / SHIELD</small>${infoTip('shield interception',SHIELD_HELP)}</div>
 <div class="armory-grid armory-shields" aria-label="Shields">${SHIELDS.map(shield=>shieldCard(u,shield)).join('')}</div>`;
}
function workshopPaint(u){
 const fixed=FRAMES[pilotFrame(selected)].fixedLivery;
 const finish=fieldPaint.finish(u);
 const finishes=Object.entries(fieldPaint.finishes).filter(([key])=>!fixed||key!=='solid').map(([key,label])=>
  `<button type="button" class="paint-swatch livery-swatch" data-paint-finish="${key}" ${key==='factory'&&!fixed?'data-livery="0"':''} aria-pressed="${finish===key}">${label}</button>`).join('');
 const finishControls=`<fieldset class="livery-presets"><legend>Finish</legend><div class="paint-swatches paint-finishes">${finishes}</div></fieldset>`;
 if(fixed)return `<div class="paint-panel">${finishControls}<small>FACTORY LIVERY COLORS</small></div>`;
 const presets=PAINT_PRESETS.slice(1).map((preset,index)=>{
  const [name,p,s,a]=preset;
  const chips=[p,s,a].map(color=>`<i style="--swatch:${color}"></i>`).join('');
  return `<button type="button" class="paint-swatch livery-swatch" data-paint="${p}" data-livery="${index+1}" aria-pressed="${activeLivery(u,preset)}"><span class="livery-colors" aria-hidden="true">${chips}</span>${name}</button>`;
 }).join('');
 const channels=PAINT_CHANNELS.map(([channel,label,factory])=>{
  const chosen=paintChannel(u,channel);
  const swatches=PAINT_SWATCHES.map(hex=>`<button type="button" data-paint-channel="${channel}" data-paint-color="${hex}" aria-label="${label} ${hex}" title="${hex}" aria-pressed="${chosen===hex}" style="--swatch:${hex}"></button>`).join('');
  return `<fieldset class="paint-channel"><legend>${label}</legend><div class="channel-swatches">${swatches}</div>
   <label class="paint-custom">Custom <input ${channel==='p'?'id="custom-paint"':`data-trim="${channel}"`} data-custom-channel="${channel}" type="color" aria-label="${label} paint" value="${chosen||factory}"></label></fieldset>`;
 }).join('');
 return `<div class="paint-panel">${finishControls}
  <details class="workshop-disclosure" data-workshop-detail="paint-colors" ${bindWorkshop.disclosures?.['paint-colors']?'open':''}>
   <summary>Custom colors</summary><fieldset class="livery-presets"><legend>Color presets</legend><div class="paint-swatches">${presets}</div></fieldset>${channels}
  </details><div class="inline-help"><small>FREE · SAVED PER CHASSIS</small>${infoTip('plate paint','Choose a pattern or restore the original finish with Factory. Custom colors carry over to patterned finishes.')}</div></div>`;
}
let noiseBuffer=null,attackCameraEnabled=true;
try{attackCameraEnabled=localStorage.getItem('iron-vow-attack-camera')!=='off'}catch{}
let activeCinematic=null;
function closeAttackCamera(sequence){
 if(activeCinematic!==sequence)return;
 activeCinematic=null;duckMusic();delete document.body.dataset.shot;$('#skip-shot').hidden=true;$('#shot-status').textContent='';
}
function skipAttackCamera(){
 const sequence=activeCinematic;if(!sequence)return;
 effects=effects.filter(e=>e.type!=='shot'||e.actor!==sequence.actor.id||e.born!==sequence.fireAt);
 window.IronVowScene?.combat?.clear();
 sequence.skipped=true;sequence.resume?.();closeAttackCamera(sequence);
}
function beginAttackCamera(actor,target,w,part){
 if(!battle.busy||reducedMotion||!attackCameraEnabled||document.hidden)return null;
 const sequence={actor,target,w,part,start:clock,phase:'aim',result:'',skipped:false,resume:null};
 activeCinematic=sequence;duckMusic();document.body.dataset.shot='active';$('#skip-shot').hidden=false;
 $('#shot-status').textContent=actor.name+' prepares to attack '+target.name;
 return sequence;
}
function waitAttack(ms,sequence){
 if(sequence?.skipped)return Promise.resolve();
 if(!sequence)return delay(ms);
 return new Promise(resolve=>{
  let timer;
  const done=()=>{clearTimeout(timer);if(sequence.resume===done)sequence.resume=null;resolve()};
  sequence.resume=done;timer=setTimeout(done,ms);
 });
}
let soundBus=null;
function playSample(buffer,at,volume,rate=1,pan=0){
 if(!buffer)return false;
 const source=audio.createBufferSource(),gain=audio.createGain();
 source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;
 source.connect(gain);
 if(pan&&audio.createStereoPanner){
  const position=audio.createStereoPanner();position.pan.value=pan;
  gain.connect(position);position.connect(soundBus);
 }else gain.connect(soundBus);
 source.start(at);
 return source;
}
function startAudio(unlock=true){
 if(muted)return;
 try{
  if(!audio){
   audio=new(window.AudioContext||window.webkitAudioContext)();
   audio.onstatechange=syncMusic;
   soundBus=audio.createGain();soundBus.gain.value=.72;
   const compressor=audio.createDynamicsCompressor();
   compressor.threshold.value=-9;compressor.knee.value=7;compressor.ratio.value=4;
   soundBus.connect(compressor);compressor.connect(audio.destination);
   gunBankLoad=loadGunBank().finally(()=>{gunBankLoad=null});
   if(typeof fetch==='function')loadMachinerySamples();
  }
  if(unlock&&(audio.state==='suspended'||audio.state==='interrupted'))audio.resume().then(syncMusic).catch(()=>{});
  syncMusic();
 }catch{}
}
function combatAudioPan(unit,sequence,fieldPan){
 if(!sequence||sequence.skipped)return fieldPan;
 const axis=sequence.cameraAxis;
 if(axis)return (axis.actor===unit.id?1:-1)*axis.sign*.36;
 return (unit===sequence.actor?-1:1)*(sequence.reaction?-1:1)*.36;
}
function sound(type,cueVolume=1,shot=null){
 if(muted)return;
 try{
  startAudio();
  if(!audio)return;
  const now=audio.currentTime+.005;
  if(playGunMix(type,now,cueVolume,shot??{}))return;
  if(!noiseBuffer){
   noiseBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*1.2),audio.sampleRate);
   const samples=noiseBuffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  const pan=shot?.pan??0;
  let output=soundBus;
  if(pan&&audio.createStereoPanner){
   output=audio.createStereoPanner();output.pan.value=pan;output.connect(soundBus);
  }
  const tone=(at,duration,from,to,volume,wave='sine')=>{
   const oscillator=audio.createOscillator(),gain=audio.createGain();
   oscillator.type=wave;oscillator.frequency.setValueAtTime(from,at);
   oscillator.frequency.exponentialRampToValueAtTime(to,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*cueVolume,at+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(output);oscillator.start(at);oscillator.stop(at+duration+.01);
  };
  const noise=(at,duration,frequency,end,volume,filterType='lowpass')=>{
   const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
   source.buffer=noiseBuffer;filter.type=filterType;filter.frequency.setValueAtTime(frequency,at);
   filter.frequency.exponentialRampToValueAtTime(end,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*cueVolume,at+.005);
   gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   source.connect(filter);filter.connect(gain);gain.connect(output);source.start(at);source.stop(at+duration+.01);
  };
  const thump=(at,weight=1)=>{tone(at,.27,95,34,.18*weight);noise(at,.20,1000,180,.13*weight);tone(at+.025,.12,410,180,.045*weight,'triangle')};
  const clank=(at,weight=1)=>{
   tone(at,.16,153,60,.15*weight);
   noise(at,.065,3100,840,.24*weight,'bandpass');
   tone(at+.005,.12,492,395,.085*weight,'triangle');
  };
  const machinery=(cue,at,level,rate)=>playSample(machinerySamples.get(cue),at,level*cueVolume,rate,pan);
  if(type==='braceLift'){
   machinery('servo',now,.42,shot.rate);
   noise(now,.22,950,2200,.16,'bandpass');return;
  }
  if(type==='bracePlant'){
   machinery(cueVolume<.95?'foot-a':'foot-heavy',now,.62,shot.rate);
   clank(now+.007,.82);
   machinery('vent',now+.11,.22,shot.rate);return;
  }
  if(type==='weaponLock'){
   machinery('arm',now,.29,shot.rate);
   clank(now+.045,.43);return;
  }
  if(type==='partFailure'){
   if(shot.part==='shield'){
    for(const [pitch,level] of [[526,.12],[819,.083],[1438,.049]])tone(now,.31,pitch,pitch*.95,level,'triangle');
    clank(now+.064,.34);
   }else if(shot.part==='legs'){
    clank(now,.85);noise(now+.025,.24,1900,220,.23,'bandpass');
    tone(now+.03,.19,380,115,.10,'triangle');machinery('vent',now+.09,.35,.77);
   }else{
    tone(now,.28,755,117,.11,'triangle');noise(now+.024,.24,2180,705,.16,'bandpass');
    clank(now+.18,.38);
   }
   return;
  }
  if(type==='vehicleShutdown'){
   if(shot.material==='tank'){
    for(const [i,offset] of [0,.032,.078,.138].entries())clank(now+offset,.68-i*.12);
    noise(now,.22,730,165,.22,'bandpass');
   }else{
    for(const [i,offset] of [0,.049,.105,.175,.265,.382].entries()){
     noise(now+offset,.095,440-i*35,140,.30-i*.025,'bandpass');
     tone(now+offset,.09,100-i*7,40,.12);
    }
    noise(now+.35,.14,2700,540,.22,'bandpass');
   }
   return;
  }
  if(type==='vehicleGround'){
   const tank=shot.material==='tank';
   clank(now,tank?1.28:1.12);clank(now+.24,tank?.44:.56);
   clank(now+.40,.30);return;
  }
  if(type==='click'){tone(now,.06,820,610,.025,'triangle');return}
  if(type==='hydraulic'){
   tone(now,.24,150,325,.071,'triangle');
   tone(now+.018,.20,315,455,.026,'sawtooth');
   noise(now+.012,.23,630,1900,.095,'bandpass');
   noise(now+.086,.16,3100,850,.058,'bandpass');
   tone(now+.145,.09,465,188,.044,'triangle');
   return;
  }
  if(type==='step'){
   thump(now,1.05);tone(now,.34,71,28,.20);
   noise(now,.075,4900,1150,.10,'bandpass');
   tone(now+.036,.15,550,176,.056,'triangle');
   noise(now+.052,.18,950,175,.073);return;
  }
  if(type==='prime'){
   noise(now,.16,1460,360,.055,'bandpass');
   tone(now,.19,104,62,.043,'triangle');
   tone(now+.026,.085,760,245,.034,'square');return;
  }
  if(type==='track'){
   noise(now,.24,990,320,.075,'bandpass');
   for(let i=0;i<3;i++)tone(now+i*.047,.085,105+i*14,54,.05,'triangle');
   return;
  }
  if(type==='rotor'){tone(now,.23,92,115,.031,'triangle');noise(now,.25,390,200,.048,'bandpass');return}
  if(type==='cleaver'||type==='blade'){noise(now,.22,550,3500,.11,'bandpass');tone(now+.08,.2,1250,460,.05,'triangle');return}
  if(type==='breaker'){noise(now,.18,420,2100,.10,'bandpass');thump(now+.13,1.15);return}
  if(type==='breach-gauntlet'||type==='pulse-bash'||type===FREE_HAND_COUNTER.id){noise(now,.19,490,2100,.085,'bandpass');thump(now+.18,type==='breach-gauntlet'?1.1:.65);return}
  if(type==='piledriver'){noise(now,.12,700,2500,.07,'bandpass');thump(now+.12,1.2);tone(now+.13,.2,610,120,.08,'square')}
 }catch{}
}
const musicBuffers=new Map();
const MACHINERY_MIX={liftGain:.306,liftRate:.784,stepGain:.936,stepRate:.8176,ventGain:.36,ventRate:.9296,
 bootGain:.89,idleGain:.16};
const machinerySamples=new Map();
let machineryVoice=null,startedMachinery=null;
function loadMachinerySamples(){
 for(const cue of ['servo','arm','foot-heavy','foot-a','vent','boot','idle']){
  fetch(asset('assets/audio/mech-'+cue+'.wav'))
   .then(response=>{if(response.ok)return response.arrayBuffer();throw Error('Machinery audio unavailable')})
   .then(bytes=>audio.decodeAudioData(bytes))
   .then(buffer=>{machinerySamples.set(cue,buffer);if(cue==='boot'||cue==='idle')syncMachinery()})
   .catch(()=>{});
 }
}
function syncMachinery(){
 if(!audio||!soundBus)return;
 const sortie=muted||document.hidden||['suspended','interrupted','closed'].includes(audio.state)?null:battle;
 if(machineryVoice?.sortie===sortie)return;
 const now=audio.currentTime;
 if(machineryVoice){
  const {gain,idle,boot}=machineryVoice;
  gain.gain.setTargetAtTime(0,now,.04);idle.stop(now+.18);
  boot?.stop(now+.18);
  machineryVoice=null;
 }
 const idleBuffer=machinerySamples.get('idle'),bootBuffer=machinerySamples.get('boot');
 if(!sortie||!idleBuffer||!bootBuffer)return;
 const gain=audio.createGain(),idle=audio.createBufferSource(),mix=MACHINERY_MIX;
 gain.gain.setValueAtTime(0,now);gain.connect(soundBus);
 idle.buffer=idleBuffer;idle.loop=true;idle.connect(gain);idle.start(now);
 let boot;
 if(startedMachinery!==sortie){
  const bootAt=now+.005,bootEnd=bootAt+bootBuffer.duration;
  gain.gain.setValueAtTime(0,Math.max(bootAt,bootEnd-.18));
  boot=playSample(bootBuffer,bootAt,mix.bootGain);
  startedMachinery=sortie;
  gain.gain.linearRampToValueAtTime(mix.idleGain,bootEnd);
 }else gain.gain.linearRampToValueAtTime(mix.idleGain,now+.35);
 machineryVoice={sortie,gain,idle,boot};
}
// scene/combat.js calls this on each real foot plant of a live rig: the planted foot lands, then the trailing foot's actuators lift it.
window.IronVowFootPlant=(u,side,amount=1)=>{
 if(amount<.9)return;   // settle and catch-up shuffles stay silent
 gaitSound(u,'land',side);
 const motion=u.motion;
 if(motion)setTimeout(()=>{if(u.motion===motion&&!reducedMotion&&battle?.units.includes(u))gaitSound(u,'lift',-side);},90/(motion.playbackRate??1));
};
function gaitSound(u,kind,side){
 if(muted||document.hidden)return;
 const mix=MACHINERY_MIX,pan=side*.13,now=(audio?.currentTime??0)+.005;
 if(kind==='arm'){
  const mass=MECH_MOTION[u.frame].mass;
  const weight=Math.min(1.15,.55+mass*.35),pitch=Math.min(1.15,1.12/mass**.28);
  if(!playSample(machinerySamples.get('arm'),now,.42*.83*weight,.94*pitch,pan))
   sound('hydraulic',mass*.42);
  return;
 }
 if(kind==='lift'){
  if(!playSample(machinerySamples.get('servo'),now,mix.liftGain,mix.liftRate,pan))
   sound('hydraulic',.65);
  return;
 }
 if(!playSample(machinerySamples.get('foot-heavy'),now,mix.stepGain,mix.stepRate,pan))
  sound('step');
 playSample(machinerySamples.get('vent'),now+.085,mix.ventGain,mix.ventRate,pan);
}
let musicRequest=null,musicVoice=null,musicBus=null;
function musicBuffer(track){
 if(!musicBuffers.has(track)){
  const decoded=fetch(asset('assets/audio/'+track+'-score.mp3'))
   .then(response=>{if(response.ok)return response.arrayBuffer();throw Error('Score unavailable')})
   .then(bytes=>audio.decodeAudioData(bytes)).catch(()=>null);
  musicBuffers.set(track,decoded);
 }
 return musicBuffers.get(track);
}
function syncMusic(){
 syncMachinery();
 if(!audio||typeof fetch!=='function')return;
 const track=muted||document.hidden?null:battle?'mission':'hangar';
 if(track&&(audio.state==='suspended'||audio.state==='interrupted'))return;
 if(musicRequest?.track===track||(!musicRequest&&!track))return;
 const request=track?{track}:null;
 musicRequest=request;
 const previous=musicVoice;
 musicVoice=null;
 if(previous){
  const now=audio.currentTime;
  previous.gain.gain.setTargetAtTime(0,now,.08);
  previous.source.stop(now+.34);
 }
 if(!track)return;
 if(!musicBus){
  musicBus=audio.createGain();musicBus.gain.value=.26;musicBus.connect(audio.destination);
 }
 musicBuffer(track==='mission'?'hangar':'mission');
 musicBuffer(track).then(buffer=>{
  if(musicRequest!==request)return;
  if(!buffer){musicBuffers.delete(track);musicRequest=null;return}
  const source=audio.createBufferSource(),gain=audio.createGain(),now=audio.currentTime;
  source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(musicBus);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(track==='mission'?.65:.83,now+.45);
  source.start(now);
  musicVoice={source,gain};
 });
}
function duckMusic(){
 if(musicBus)musicBus.gain.setTargetAtTime(activeCinematic?.095:.26,audio.currentTime,.12);
}
function updateSoundButton(){
 $('#sound').innerHTML=icon(muted?'speaker-slash':'speaker-high');
 $('#sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');
}
$('#sound').onclick=()=>{
 muted=!muted;
 try{localStorage.setItem('iron-vow-sound',muted?'off':'on')}catch{}
 if(soundBus)soundBus.gain.setTargetAtTime(muted?.0001:.72,audio.currentTime,.01);
 updateSoundButton();
 sound('click');
 syncMusic();
};
for(const event of ['click','keydown'])document.addEventListener(event,e=>{if(e.isTrusted)startAudio()},true);
updateSoundButton();
function icon(name){return `<img class="ui-icon" src="${asset('assets/icons/'+name+'.svg')}" alt="">`}
function art(name){return asset('assets/'+name+'.webp')}
function pilotArt(i){return art('pilot-'+['rook','ghost','anchor'][i])}
function pilotMark(kind,style=''){
 const pilot=CREW[kind];
 const portrait=kind<PILOTS.length?pilotArt(kind):asset('assets/pilot-'+pilotId(kind)+'.png');
 return `<img class="${style}${kind<PILOTS.length?'':' recruit-portrait'}" src="${portrait}" alt="${pilot.name}">`;
}
function pilotCard(kind,u,training,assignment,control,points){
 const pilot=CREW[kind],wound=woundLabel(pilotId(kind)),next=nextLevelXP(u.level);
 return `<article class="card pilot-card"><div class="pilot-image">${pilotMark(kind)}</div><div class="pilot-details">
  <div class="eyebrow">${pilot.call} / ${assignment}</div><h2>${pilot.name}</h2>${wound?`<span class="tag wound-status">${wound}</span>`:''}
  ${stat('PILOT LEVEL',String(u.level).padStart(2,'0'))}${stat('EXPERIENCE',u.xp+' / '+next,Math.min(100,100*u.xp/next))}
  <div class="pilot-skill">${icon(pilot.glyph??['lightning','crosshair','first-aid-kit'][kind])}<h3>${pilot.skill}</h3>${infoTip(pilot.skill,skillDescription(kind,training))}</div>
  <button type="button" ${control} class="training-open ${points?'primary':''}">TRAINING TREE <span>${points} PT</span></button>
  <button type="button" class="computer-open" data-mech-pilot="${kind}">MECH COMPUTER</button>
 </div></article>`;
}
function paymentRange(contract){
 const low=contractPay(contract,1),high=contractPay(contract,3);
 return low===high?money(low):low.toLocaleString()+'–'+money(high);
}
function showOverworld(destination=companyPort(),routeKey=null){
 if(battle||careerStale)return;
 ensureWorld();
 overworldSelection=careerNetwork().ports.some(port=>port.id===destination)?destination:companyPort();
 overworldHoldPreview=false;portSheetOpen=false;
 if(save.transit)overworldSelection=companyPort();
 overworldRouteKey=routeKey;overworldConfirmation=null;page='overworld';render();
}
function chartRouteOptions(from,destination){
 const rates=overworld.operatingRates(save);
 const network=careerNetwork();
 const routes=overworld.routeOptions(from,destination,network).map(path=>{
  const quote=overworld.itineraryQuote(path,rates,save.credits,save.overworld?.arrears??0,network);
  const stop=network.ports.find(port=>port.id===path[1]);
  return {...quote,key:path.join('>'),label:path.length===2?'Express':'Via '+stop.name.split(' ')[0]};
 }).sort((a,b)=>a.days-b.days||a.total-b.total);
 if(routes.length<=3)return routes;
 const cheapest=[...routes].sort((a,b)=>a.total-b.total||a.days-b.days)[0];
 const choices=[...new Map([routes[0],cheapest].map(route=>[route.key,route])).values()];
 if(choices.length===1)choices.push(routes[1]);
 return choices;
}
function chartData(){
 const world=ensureWorld(),network=careerNetwork(),departure=overworldDeparture;
 const current=departure?.from??companyPort(),selected=overworldSelection??current;
 const routeOptions=chartRouteOptions(current,selected);
 const planned=save.transit?null:routeOptions.find(route=>route.key===overworldRouteKey)??(save.transit?null:routeOptions[0]);
 const rates=overworld.operatingRates(save);
 const holdSettlement=overworldHoldPreview?overworld.settleExpenses(save.credits,save.overworld?.arrears??0,rates.total):null;
 const quote=overworldHoldPreview?{days:1,fuel:0,...rates,cashAfterArrival:holdSettlement.credits,path:[]}:departure?.quote??planned??null;
 const rest=quote?overworld.travelRest(save,departure?0:quote.days):{units:save.units,wounds:save.wounds??{}};
 const readiness=save.units.map((unit,i)=>({name:FRAMES[pilotFrame(i)].name,pilot:pilotProfile(i).call,
  before:departure?.before[i]??unit.condition,condition:rest.units[i].condition,wound:rest.wounds[pilotId(pilotClass(i))]??0}));
 const sensorRange=4.5+shipLevel('office')*2.5;
 const origin=network.ports.find(port=>port.id===current);
 const markers=world?worldRules.markersAt(world).filter(marker=>Math.hypot((marker.x*100-origin.x)*.22,(marker.y*100-origin.y)*.17)<=sensorRange):[];
 const offers=world?availableOffers(selected,save.day+(quote?.days??0)):[];
 return {ports:network.ports,routes:network.routes,current,selected,path:quote?.path??[],pathKey:quote?.path.join('>')??'',routeOptions,quote,
  day:departure?.day??save.day,credits:save.credits,arrears:save.overworld?.arrears??0,readiness,
  confirming:!!overworldConfirmation,departing:!!departure,departure,holding:overworldHoldPreview,contractCount:offers.length,arrivingContracts:offers.filter(offer=>offer.availableOnArrival).length,markers,sensorRange,sensorPort:current,holdArrears:holdSettlement?.arrears??0,
  portServices:portSheetOpen&&!departure&&!save.transit?portServicesData(selected):null,transitEvent:!departure?transitEventData():null,
  sceneReady:window.IronVowChart?.snapshot().shipReady??false};
}
function chartQuoteKey(data){
 return JSON.stringify([data.path,save.day,save.credits,save.overworld,save.units,save.reserve,save.wounds,overworld.operatingRates(save)]);
}
function overworldPage(){return window.IronVowOverworldView.render(chartData());}
function bindOverworld(){
 const data=chartData();
 bindPortServices();
 window.IronVowChart?.show($('#chart-viewport'),data,{selectPort:id=>{if(!overworldDeparture&&!save.transit)showOverworld(id);},selectRoute:key=>{if(!overworldDeparture&&!save.transit)showOverworld(overworldSelection,key);}});
 for(const button of document.querySelectorAll('[data-overworld-port]'))button.onclick=()=>{
  if(overworldDeparture||save.transit)return;
  const id=button.dataset.overworldPort;
  showOverworld(id);$(`[data-overworld-port="${id}"]`)?.focus({preventScroll:true});
 };
 for(const button of document.querySelectorAll('[data-overworld-route-option]'))button.onclick=()=>{
  if(overworldDeparture||save.transit)return;
  showOverworld(overworldSelection,button.dataset.overworldRouteOption);
  $(`[data-overworld-route-option="${button.dataset.overworldRouteOption}"]`)?.focus({preventScroll:true});
 };
 if($('[data-chart-reset]'))$('[data-chart-reset]').onclick=()=>window.IronVowChart?.reset();
 const contracts=$('[data-chart-contracts]');
 if(contracts)contracts.onclick=()=>{if(overworldDeparture||save.transit)return;contractPortSelection=overworldSelection;page='contracts';render();};
 const hold=$('[data-chart-hold]');
 if(hold)hold.onclick=()=>{if(save.transit)return;overworldHoldPreview=true;overworldConfirmation=chartQuoteKey(chartData());render();$('[data-overworld-confirm]')?.focus();};
 const cancel=$('[data-overworld-cancel]');
 if(cancel)cancel.onclick=()=>{overworldConfirmation=null;overworldHoldPreview=false;render();($('[data-overworld-travel]')||$('[data-chart-hold]'))?.focus();};
 const travel=$('[data-overworld-travel]');
 if(travel)travel.onclick=()=>{
  if(overworldDeparture||save.transit||battle||careerStale)return;
  const current=chartData();
  if(!current.quote||current.quote.cashAfterArrival<0)return;
  const key=chartQuoteKey(current);
  if(!overworldConfirmation){overworldConfirmation=key;render();$('[data-overworld-confirm]')?.focus();return;}
  if(overworldConfirmation!==key){overworldConfirmation=null;render();toast('Course updated. Review the forecast.');return;}
  if(overworldHoldPreview){
   if(holdAtPort()){overworldHoldPreview=false;overworldConfirmation=null;render();toast('One day held at '+portName(companyPort())+'.');}
   return;
  }
  const day=save.day,before=save.units.map(unit=>unit.condition),quote=current.quote;
  if(!travelTo(current.selected,current.current,quote.total,current.path,true)){
   overworldConfirmation=null;render();toast('Transit is no longer available.');return;
  }
  overworldConfirmation=null;
  overworldDeparture={from:current.current,path:current.path,quote,day,before,startedAt:performance.now(),duration:reducedMotion?200:1400};
  render();
 };
}
function contractsPage(){
 if(worldRules)return pooledContractsPage();
 const current=companyPort(),sizes=dispatchSizes(),rates=overworld.operatingRates(save);
 return `<div class="page"><div class="pagehead"><div><div class="eyebrow">OPERATIONS / ${portName(current)}</div><h1>CHOOSE YOUR BATTLE.</h1></div><button data-page="overworld">CHART TABLE ${icon('arrow-right')}</button></div>
  <div class="grid contract-grid">${CONTRACTS.map((contract,i)=>{
   const local=current===contract.id,size=sizes[i],payment=contractPay(contract,size);
   return `<article class="card"><div class="contract-map"><img src="${art('contract-'+FIELDS[contract.field].ground)}" alt="${['Rain-soaked mountain relay station','Industrial refinery corridor at dusk','Storm-lit frontier military outpost'][contract.field]}"><span class="contract-number">0${i+1}</span><span class="tag">${local?'DOCKED HERE':'REMOTE CONTRACT'}</span></div>
    <div class="eyebrow">${contract.place}</div><h2>${contract.name}</h2><p>${contract.desc}</p><div class="rule"></div>${stat('OPERATION',contract.tag)}${stat('THREAT',contract.difficulty+' / 3')}
    ${local?stat('SORTIE SIZE',size+' MECH'+(size===1?'':'S')+(shipLevel('drop')===2?' + AUX OPTION':''))+stat('HOSTILE CONTACTS',sortieSpawns(contract,size).length+' UNITS')+
     stat('CONTRACT PAYMENT',money(payment))+stat('OPERATING COSTS',money(rates.total))+contractIntel(i,size):stat('PORT',portName(contract.id))+stat('ESTIMATED PAYMENT',paymentRange(contract))}
    <button class="${local?'primary ':''}full" data-deploy="${i}">${local?'PREPARE SORTIE':'PLOT COURSE'} ${icon('arrow-right')}</button></article>`;
  }).join('')}</div></div>`;
}
function shipPage(){
 const project=save.ship?.project;
 const queued=project&&SHIP_DECK[project.facility].tiers[shipLevel(project.facility)];
 const ui=shipPage.uiState??={selected:project?.facility??'drop'};
 const seats=LANCE_SLOTS.map(slot=>{
  const frame=pilotFrame(slot),hull=save.units[slot],wound=woundLabel(pilotId(pilotClass(slot)));
  return `<article class="ship-seat"><img ${chassisPicture(frame,hull)} alt="" width="60" height="60" loading="lazy"><div><small>SEAT 0${slot+1} · ${pilotProfile(slot).call}</small><b>${FRAMES[frame].name}</b><small class="${wound?'wound-status':''}">${hull.condition}% INTEGRITY${wound?' · '+wound:''}</small></div></article>`;
 }).join('');
 return `<div class="page ship-page"><div class="ship-content">
  <div class="ship-banner"><div><div class="eyebrow">HEAVY-LIFT AIRSHIP / DAY ${save.day}</div><h1>IVS HALYARD.</h1><p>Docked at ${portName(companyPort())} · ${money(overworld.operatingRates(save).total)} per day · ${save.rep} reputation</p></div>
   <div class="ship-actions"><button data-hangar-deck="mechs">MECH BAY</button><button class="navigation-quiet" data-primary="bridge">← Back to Bridge</button></div>
  </div>
  <section class="ship-readiness" aria-label="Lance readiness"><div class="facility-section-heading"><h2>Lance readiness</h2><span class="eyebrow">${LANCE_SLOTS.length} MECH SEATS</span></div><div class="ship-seats">${seats}</div></section>
  <section class="ship-queue" aria-label="Engineering queue"><div><span class="eyebrow">ENGINEERING QUEUE</span><h2>${queued?queued.name:'Ready for a project'}</h2></div>
   <div class="ship-progress"><span class="tag">${queued?project.wins+' WIN'+(project.wins===1?'':'S')+' LEFT':'1 PROJECT SLOT'}</span>${queued?`<progress aria-label="Construction progress" max="${queued.wins}" value="${queued.wins-project.wins}"></progress>`:infoTip('Engineering queue','The ship can work on one project at a time. Fulfilled contracts advance construction.')}</div>
  </section>
  <div class="facility-section-heading"><h2>Ship upgrades</h2><span class="eyebrow">SELECT A DECK</span></div>
  <div class="ship-grid facility-list">${Object.entries(SHIP_DECK).map(([id,facility])=>{
   const rank=shipLevel(id),current=facility.tiers[rank-1],next=facility.tiers[rank],future=facility.tiers.slice(rank+1);
   const building=project?.facility===id;
   const disabled=project?'QUEUE OCCUPIED':next&&save.rep<next.rep?'REPUTATION TOO LOW':next&&save.credits<next.cost?'INSUFFICIENT CREDITS':'';
   return `<article class="ship-facility" data-facility="${id}"><details class="facility-disclosure" name="ship-facilities" data-ship-facility-detail="${id}"${ui.selected===id?' open':''}>
    <summary class="facility-summary">${icon(facility.glyph)}<span class="facility-summary-title"><strong>${facility.name}</strong><small>${building?'IN CONSTRUCTION · '+project.wins+' WINS LEFT':current?current.name+' online':'Standard issue'}</small></span><span class="facility-summary-meta"><span class="tag">MK ${rank} / ${facility.tiers.length}</span><small>${building?'PROJECT ACTIVE':next?'NEXT · '+money(next.cost):'FULLY OUTFITTED'}</small></span><span class="facility-chevron" aria-hidden="true">+</span></summary>
    <div class="facility-body"><div class="ship-current"><small>${current?current.name+' ONLINE':'STANDARD ISSUE'}</small><span>${current?current.perk:'No ship bonus'}</span></div>
    ${next?`<div class="ship-next"><span class="eyebrow">${building?'CURRENT PROJECT':'NEXT UPGRADE'}</span><div class="ship-next-title"><h3>${next.name}</h3></div><p>${next.perk}</p><p class="facility-explanation">${next.detail}</p>
     <div class="ship-build"><span>${money(next.cost)} · ${next.wins} WIN${next.wins===1?'':'S'}${next.rep?' · '+next.rep+' REP':''}</span><button type="button" data-build-facility="${id}" ${disabled?'disabled':''}>${building?'IN CONSTRUCTION':disabled||'BUILD · '+money(next.cost)}</button></div></div>`:'<div class="ship-next"><span class="eyebrow">FULLY OUTFITTED</span></div>'}
    ${future.length?`<details class="facility-future"><summary>Future upgrades · ${future.length}</summary>${future.map(planned=>`<div class="ship-plan"><div><b>${planned.name}</b><span>${planned.perk}</span><small>${money(planned.cost)} · ${planned.rep} REP · ${planned.wins} WINS</small><p>${planned.detail}</p></div></div>`).join('')}</details>`:''}
    </div></details></article>`;
  }).join('')}</div>
 </div></div>`;
}
function bindShip(){
 const ui=shipPage.uiState;
 for(const detail of document.querySelectorAll('[data-ship-facility-detail]'))detail.addEventListener('toggle',()=>{
  if(!detail.isConnected)return;
  if(detail.open){
   ui.selected=detail.dataset.shipFacilityDetail;
   for(const other of document.querySelectorAll('[data-ship-facility-detail]'))if(other!==detail&&other.open)other.open=false;
  }else if(ui.selected===detail.dataset.shipFacilityDetail)ui.selected=null;
 });
 for(const button of document.querySelectorAll('[data-build-facility]'))button.onclick=()=>{
  const id=button.dataset.buildFacility,name=SHIP_DECK[id].tiers[shipLevel(id)].name;
  if(queueShipUpgrade(id)){ui.selected=id;render();$(`[data-ship-facility-detail="${id}"] > summary`)?.focus({preventScroll:true});$('.ship-queue h2')?.scrollIntoView({block:'nearest'});toast(name+' queued.')}
 };
}
function openStoredHull(frame){
 if(battle||careerStale||!Number.isInteger(frame)||!Object.hasOwn(save.reserve??{},frame))return false;
 if(!$('#modal').hidden)closeModal();
 page='workshop';workshopView='storage';render();
 const card=$(`[data-stored-hull-card="${frame}"]`);
 card?.scrollIntoView({block:'nearest'});
 card?.focus({preventScroll:true});
 return true;
}
function chooseStoredHull(){
 if(battle||careerStale)return;
 const hulls=Object.entries(save.reserve??{});
 if(!hulls.length)return;
 const choices=hulls.map(([frame,hull])=>`<button type="button" data-open-stored-hull="${frame}"><b>${FRAMES[frame].name}</b><small>${hull.condition}% integrity</small></button>`).join('');
 modal('RESERVE HULLS',`<div class="seat-choices">${choices}</div>`,[{text:'CANCEL',fn:closeModal}]);
 for(const button of document.querySelectorAll('[data-open-stored-hull]'))button.onclick=()=>{
  if(openStoredHull(Number(button.dataset.openStoredHull)))sound('click');
 };
 $('[data-open-stored-hull]').focus();
}
function hangarRoster(){
 const level=hangarLevel('personnel'),used=save.hangar?.treatmentDay===save.day;
 const active=dutyRoster(),full=activeRosterIds().length>=activeCapacity();
 const roster=[
  ...LANCE_SLOTS.map(i=>({id:pilotId(pilotClass(i)),pilot:save.units[i],slot:i})),
  ...Object.entries(save.reservePilots??{}).map(([id,pilot])=>({id,pilot}))
 ];
 const wounded=roster.filter(({id})=>woundDays(id)>0).length;
 return `<details class="base-roster crew-disclosure" data-crew-roster${hangarPage.uiState?.crew?' open':''}>
  <summary class="crew-summary"><span><strong>Crew roster</strong><small>${roster.length} PILOTS · ${wounded?wounded+' WOUNDED':'NO WOUNDS'}</small></span><span class="tag" id="duty-count">${activeRosterIds().length} / ${activeCapacity()} ACTIVE</span><span class="facility-chevron" aria-hidden="true">+</span></summary><div class="crew-body">
  <div class="base-roster-head"><div><span class="eyebrow">PERSONNEL ANNEX</span><h2>Duty roster</h2></div><button data-page="inn">HIRING DESK</button></div>
  ${level===2?`<p class="base-roster-status">${used?'Trauma Ward · next treatment tomorrow':'Trauma Ward · 1 treatment available'}</p>`:''}
  <div class="base-roster-list">${roster.map(({id,pilot,slot})=>{
   const kind=pilotKind(id),wound=woundLabel(id),unseated=slot===undefined,onDuty=active.includes(id);
   const mech=unseated?'':`<img class="duty-mech" ${chassisPicture(pilotFrame(slot),save.units[slot])} alt="" width="45" height="45" loading="lazy">`;
   return `<article class="base-pilot" data-duty-pilot="${id}">${pilotMark(kind,'pilot-thumb')}
    <div><strong>${CREW[kind].call}</strong><small>${unseated?(onDuty?'ACTIVE · RELIEF':'RESERVE'):'ACTIVE · '+FRAMES[pilotFrame(slot)].name} / LV ${pilot.level}</small>${wound?`<small class="wound-status">${wound}</small>`:''}</div>
    <div class="base-pilot-actions">${mech}${unseated&&(onDuty||level)?`<button data-reserve-training="${id}">TRAIN · ${reliefTrainingPoints(id)} PT</button>`:''}
     ${unseated&&hangarLevel('cabins')?`<button data-pilot-duty="${id}" data-activate="${!onDuty}" aria-label="${onDuty?'Move '+CREW[kind].call+' to reserve':'Activate '+CREW[kind].call}" ${!onDuty&&full?'disabled':''}>${onDuty?'TO RESERVE':full?'CABINS FULL':'ACTIVATE'}</button>`:''}
     ${wound&&level===2?`<button data-pilot-treatment="${id}" ${used||save.credits<HANGAR_SERVICE_COST?'disabled':''}>TREAT · ${money(HANGAR_SERVICE_COST)}</button>`:''}
    </div></article>`;
  }).join('')}</div></div></details>`;
}
function hangarPage(){
 const project=save.hangar?.project;
 const queued=project&&HANGAR_ROOMS[project.room].tiers[hangarLevel(project.room)];
 const ui=hangarPage.uiState??={selected:project?.room??'fabrication',crew:false};
 return `<div class="page base-page"><div class="ship-content">
  <div class="ship-banner base-banner"><div><div class="eyebrow">${portName(companyPort())} / COMPANY FACILITIES</div><h1>HANGAR.</h1><p>${save.rep} reputation · ${money(save.credits)} available</p></div>
   <div class="ship-actions"><button data-hangar-deck="mechs">MECH BAY</button><button class="primary" data-page="workshop">WORKSHOP ${icon('arrow-right')}</button></div>
  </div>
  <section class="ship-queue base-queue" aria-label="Hangar construction"><div><span class="eyebrow">FACILITY CONSTRUCTION</span><h2>${queued?queued.name:'Ready for a project'}</h2></div>
   <div class="ship-progress"><span class="tag">${queued?project.wins+' WIN'+(project.wins===1?'':'S')+' LEFT':'1 PROJECT SLOT'}</span>
    ${queued?`<progress aria-label="Hangar construction progress" max="${queued.wins}" value="${queued.wins-project.wins}"></progress>`:infoTip('Hangar construction','The Hangar has its own construction crew. You can build here while the Ship is upgrading. Contract wins advance both projects.')}</div>
  </section>
  <div class="facility-section-heading"><h2>Facilities</h2><span class="eyebrow">SELECT A ROOM</span></div>
  <div class="base-grid facility-list">${Object.entries(HANGAR_ROOMS).map(([id,room])=>{
   const level=hangarLevel(id),current=room.tiers[level-1],next=room.tiers[level],future=room.tiers.slice(level+1);
   const building=project?.room===id;
   const blocked=project?'CREW BUSY':next&&save.rep<next.rep?'REPUTATION TOO LOW':next&&save.credits<next.cost?'INSUFFICIENT CREDITS':'';
   return `<article class="ship-facility base-room" data-base-room="${id}"${id==='cabins'?' tabindex="-1"':''}><details class="facility-disclosure" name="hangar-facilities" data-hangar-room-detail="${id}"${ui.selected===id?' open':''}>
    <summary class="facility-summary">${icon(room.glyph)}<span class="facility-summary-title"><strong>${room.name}</strong><small>${building?'IN CONSTRUCTION · '+project.wins+' WINS LEFT':current?current.name+' online':'Ready for expansion'}</small></span><span class="facility-summary-meta"><span class="tag">TIER ${level} / ${room.tiers.length}</span><small>${building?'PROJECT ACTIVE':next?'NEXT · '+money(next.cost):'FULLY OUTFITTED'}</small></span><span class="facility-chevron" aria-hidden="true">+</span></summary>
    <div class="facility-body"><div class="ship-current"><small>${current?current.name+' ONLINE':'STANDARD FACILITY'}</small><span>${current?.perk??'Ready for expansion'}</span></div>
    ${next?`<div class="ship-next"><span class="eyebrow">${building?'CURRENT PROJECT':'NEXT UPGRADE'}</span><div class="ship-next-title"><h3>${next.name}</h3></div><p>${next.perk}</p><p class="facility-explanation">${next.detail}</p>
     <div class="ship-build"><span>${money(next.cost)} · ${next.wins} WIN${next.wins===1?'':'S'}${next.rep?' · '+next.rep+' REP':''}</span>
      <button type="button" data-build-room="${id}" ${blocked?'disabled':''}>${building?'IN CONSTRUCTION':blocked||'BUILD · '+money(next.cost)}</button></div></div>`:'<div class="ship-next"><span class="eyebrow">FULLY OUTFITTED</span></div>'}
    ${future.length?`<details class="facility-future"><summary>Future upgrades · ${future.length}</summary>${future.map(later=>`<div class="ship-plan"><div><b>${later.name}</b><span>${later.perk}</span><small>${money(later.cost)} · ${later.rep} REP · ${later.wins} WINS</small><p>${later.detail}</p></div></div>`).join('')}</details>`:''}
   </div></details></article>`;
  }).join('')}</div>
  ${hangarRoster()}
 </div></div>`;
}
function bindHangar(){
 const ui=hangarPage.uiState;
 for(const detail of document.querySelectorAll('[data-hangar-room-detail]'))detail.addEventListener('toggle',()=>{
  if(!detail.isConnected)return;
  if(detail.open){
   ui.selected=detail.dataset.hangarRoomDetail;
   for(const other of document.querySelectorAll('[data-hangar-room-detail]'))if(other!==detail&&other.open)other.open=false;
  }else if(ui.selected===detail.dataset.hangarRoomDetail)ui.selected=null;
 });
 const crew=$('[data-crew-roster]');
 if(crew)crew.addEventListener('toggle',()=>{if(crew.isConnected)ui.crew=crew.open;});
 const reserves=$('#hangar-reserves');
 if(reserves)reserves.onclick=chooseStoredHull;
 for(const button of document.querySelectorAll('[data-hangar-deck]'))button.onclick=()=>{
  if(button.dataset.hangarDeck==='base'){navigateHangarRoute('facilities');return;}
  page='hangar';hangarDeck=button.dataset.hangarDeck;render();sound('click');
  $('#inspect')?.focus();
 };
 for(const button of document.querySelectorAll('[data-build-room]'))button.onclick=()=>{
  const room=button.dataset.buildRoom,name=HANGAR_ROOMS[room].tiers[hangarLevel(room)].name;
  if(queueHangarUpgrade(room)){ui.selected=room;render();$(`[data-hangar-room-detail="${room}"] > summary`)?.focus({preventScroll:true});$('.base-queue h2')?.scrollIntoView({block:'nearest'});toast(name+' queued in the Hangar.')}
 };
 for(const button of document.querySelectorAll('[data-reserve-training]'))button.onclick=()=>trainingTree(button.dataset.reserveTraining);
 for(const button of document.querySelectorAll('[data-pilot-duty]'))button.onclick=()=>{
  const id=button.dataset.pilotDuty,top=$('.base-page').scrollTop;
  if(setPilotDuty(id,button.dataset.activate==='true')){
   render();$('.base-page').scrollTop=top;
   $(`[data-pilot-duty="${id}"]`)?.focus({preventScroll:true});
  }
 };
 for(const button of document.querySelectorAll('[data-pilot-treatment]'))button.onclick=()=>{
  const id=button.dataset.pilotTreatment;
  if(treatPilot(id)){ui.crew=true;render();($(`[data-pilot-treatment="${id}"]`)||$('[data-crew-roster] > summary'))?.focus({preventScroll:true});$('.base-roster-head')?.scrollIntoView({block:'nearest'});toast(CREW[pilotKind(id)].call+' cleared for duty.')}
 };
}
function spaceInn(){
 const slots=LANCE_SLOTS.map(i=>`<div class="inn-slot">${pilotMark(pilotClass(i),'pilot-thumb')}<span><small>SEAT 0${i+1} / ${FRAMES[pilotFrame(i)].name}</small><b>${pilotProfile(i).call}</b></span><span>LV ${save.units[i].level}</span></div>`).join('');
 const crew=CREW.map((pilot,kind)=>{
  if(LANCE_SLOTS.some(i=>pilotClass(i)===kind))return '';
  const reserve=save.reservePilots?.[pilotId(kind)];
  if(!reserve&&!pilot.fee)return '';
  return `<article class="inn-pilot">
   ${pilotMark(kind,'pilot-thumb')}<div><span class="eyebrow">${reserve?(dutyRoster().includes(pilotId(kind))?'ACTIVE RELIEF':'RESERVE')+' · LV '+reserve.level:'AVAILABLE FOR HIRE'}</span><h3>${pilot.call}</h3><small>${pilot.name} · ${pilot.skill}</small>${woundLabel(pilotId(kind))?`<small class="wound-status">${woundLabel(pilotId(kind))}</small>`:''}</div>
   ${infoTip(pilot.skill,pilot.desc)}
   <button ${reserve?'data-seat':'data-hire'}="${kind}" ${!reserve&&save.credits<pilot.fee?'disabled':''}>${reserve?'ASSIGN SEAT':'HIRE · '+money(pilot.fee)}</button>
  </article>`;
 }).join('');
 return `<div class="page inn-page"><div class="pagehead"><div><div class="eyebrow">${portName(companyPort())} / MERCENARY EXCHANGE</div><h1>SPACE INN.</h1></div><p>${money(save.credits)} on hand</p></div>
  <div class="inn-links" aria-label="Freeport services"><button data-page="contracts">${icon('binoculars')} CONTRACT BOARD</button><button data-dock="market">${icon('wrench')} MECH MARKET</button><button data-dock="storage">${icon('shield-chevron')} STORAGE</button><button data-page="pilots">${icon('lightning')} TRAIN PILOTS</button></div>
  <div class="inn-grid"><section class="inn-board"><div class="stat-heading"><h2>Hiring desk</h2>${infoTip('pilot reserves','Hires start in reserve. Assign a seat to swap its pilot. XP and training follow the pilot. The chassis, weapons and paint stay in the seat.')}</div>${crew}</section>
  <section class="inn-board"><div class="stat-heading"><h2>Active lance</h2><span class="tag">3 MECH SEATS</span></div>${slots}
   <button class="full inn-duty" data-page="hangar">DUTY ROSTER · ${activeRosterIds().length} / ${activeCapacity()} ACTIVE</button></section></div>
 </div>`;
}
function bindInn(){
 for(const button of document.querySelectorAll('[data-hire]'))button.onclick=()=>{
  const kind=Number(button.dataset.hire);
  if(hirePilot(kind)){render();$(`[data-seat="${kind}"]`)?.focus();toast(CREW[kind].call+' joined the reserve roster.')}
 };
 for(const button of document.querySelectorAll('[data-seat]'))button.onclick=()=>{
  const kind=Number(button.dataset.seat);
  modal('ASSIGN '+CREW[kind].call,'<div class="seat-choices">'+LANCE_SLOTS.map(i=>`<button type="button" data-assign-pilot="${i}"><b>SEAT 0${i+1} · ${FRAMES[pilotFrame(i)].name}</b><small>${pilotProfile(i).call} moves to reserve</small></button>`).join('')+'</div>',[{text:'CANCEL',fn:closeModal}]);
  for(const choice of document.querySelectorAll('[data-assign-pilot]'))choice.onclick=()=>{
   const i=Number(choice.dataset.assignPilot);
   if(assignPilot(i,kind)){closeModal();render();toast(CREW[kind].call+' assigned to '+FRAMES[pilotFrame(i)].name+'.')}
  };
 };
 for(const button of document.querySelectorAll('[data-dock]'))button.onclick=()=>{
  workshopView=button.dataset.dock;page='workshop';render();
 };
}
function mechPortrait(frame,hull,direction){
 return window.IronVowFoundry?.portrait({...hull,frame},foundryModel(frame),direction>0?1:0);
}
function chassisPicture(frame,hull,direction=-1){
 const portrait=mechPortrait(frame,hull,direction);
 if(!portrait)return '';
 return 'data-rig-portrait="'+portrait.key+'"'+(portrait.url?' src="'+portrait.url+'"':'');
}
window.addEventListener?.('rig-portrait-ready',e=>{
 const {key,url}=e.detail;
 for(const image of document.querySelectorAll('img[data-rig-portrait]')){
  if(image.dataset.rigPortrait===key)image.src=url;
 }
});
// Navigation belongs to three persistent departments. Journal is a utility and
// snapshots local view state rather than changing the career/save schema.
let journalOrigin=null;
function navigationParent(view=page){
 if(view==='journal')return journalOrigin?.parent??'company';
 return ['overworld','contracts','ship'].includes(view)?'bridge':['hangar','workshop'].includes(view)?'bay':'company';
}
function openJournal(){
 if(battle||careerStale||page==='journal')return;
 journalOrigin={page,parent:navigationParent(),chartView:page==='overworld'?window.IronVowChart?.snapshot():null,hangarDeck,workshopView,selected,
  overworldSelection,overworldRouteKey,overworldConfirmation,overworldHoldPreview,
  contractPortSelection,portSheetOpen,portSheetTab,portHullSelection,inspectOpen,
  focus:document.activeElement,scroll:$('#ui').scrollTop,pageScroll:$('#ui .page')?.scrollTop??0,
  details:[...$('#ui').querySelectorAll('details')].map(detail=>detail.open)};
 page='journal';render();$('#journal-back')?.focus({preventScroll:true});
}
function returnFromJournal(){
 if(battle||page!=='journal')return;
 const origin=journalOrigin;
 page=origin?.page??'pilots';
 if(origin){
  ({hangarDeck,workshopView,selected,overworldSelection,overworldRouteKey,
   overworldConfirmation,overworldHoldPreview,contractPortSelection,portSheetOpen,
   portSheetTab,portHullSelection,inspectOpen}=origin);
 }
 render();
 if(origin){
  $('#ui').querySelectorAll('details').forEach((detail,i)=>{detail.open=!!origin.details[i]});
  if(origin.chartView)window.IronVowChart?.restoreView?.(origin.chartView);
  $('#ui').scrollTop=origin.scroll;const content=$('#ui .page');if(content)content.scrollTop=origin.pageScroll;
 }
 (origin?.focus?.isConnected?origin.focus:$('#field-journal'))?.focus({preventScroll:true});
 journalOrigin=null;
}
function navigatePrimary(destination){
 if(battle||careerStale)return;
 journalOrigin=null;
 if(destination==='bridge'){showOverworld();}
 else{page=destination==='bay'?'hangar':'pilots';if(destination==='bay')hangarDeck='mechs';render();}
 $(`#nav [data-primary="${destination}"]`)?.focus({preventScroll:true});sound('click');
}
function navigationContext(){
 const returns={contracts:['bridge','Bridge'],workshop:['bay','Mech Bay'],inn:['company','Company'],career:['company','Company']};
 const back=returns[page]??(page==='hangar'&&hangarDeck==='base'?['bay','Mech Bay']:null);
 if(back){
  $('#ui').innerHTML=$('#ui').innerHTML.replace(/(<div class="page[^"]*">)/,`$1<button type="button" class="navigation-back navigation-quiet" data-primary="${back[0]}">← Back to ${back[1]}</button>`);
 }
}
function nav(){
 const points=battle?0:totalTrainingPoints(),parent=navigationParent();closeHelp();syncMusic();
 document.body.dataset.targetPanel=targetPanelOpen?'open':'closed';document.body.dataset.view=battle?'combat':page;document.body.dataset.navigationParent=parent;document.body.dataset.hangarView=hangarDeck;document.body.dataset.workshopMode=workshopView;
 $('#nav').innerHTML=[['bridge','Bridge'],['bay','Mech Bay'],['company','Company']].map(([id,label])=>`<button type="button" data-primary="${id}" class="${id===parent?'active':''}" ${id===parent?'aria-current="page"':''} ${battle?'disabled':''}>${label}${id==='company'&&points?`<span class="training-badge" title="${points} training points available">${points}</span>`:''}</button>`).join('');
 const journal=$('#field-journal');if(journal){journal.disabled=!!battle;journal.setAttribute('aria-pressed',String(page==='journal'));journal.onclick=openJournal;}
 $('#credits').textContent=money(save.credits);$('#day').textContent='DAY '+String(save.day).padStart(3,'0');
}

function stat(name,val,ratio){return `<div class="stat"><span>${name}</span><b>${val}</b></div>${ratio!==undefined?`<div class="bar"><i style="width:${ratio}%"></i></div>`:''}`}
function render(){
 if(benchRig)return;
  if(page!=='overworld'||battle){window.IronVowChart?.close();if(page!=='journal'){overworldDeparture=null;overworldConfirmation=null;portSheetOpen=false;}}
  nav(); if(battle){window.IronVowWorkshop?.close();syncHangar();renderBattle();return}
  const frame=pilotFrame(selected),f=FRAMES[frame],u=save.units[selected],p=pilotProfile(selected),w=unitWeapon({...u,frame}),training=trainingEffects(selected);
  const previewOpen=page==='workshop'&&workshopView==='assigned';
  if(!previewOpen)window.IronVowWorkshop?.close();
  window.IronVowFoundry?.retainPreview?.(previewOpen?frame:undefined);
  if(page==='ship')$('#ui').innerHTML=shipPage();
  if(page==='overworld')$('#ui').innerHTML=overworldPage();
  if(page==='hangar'&&hangarDeck==='base')$('#ui').innerHTML=hangarPage();
  if(page==='hangar'&&hangarDeck==='mechs'){
    const lineup=PILOTS.map((_,i)=>({m:FRAMES[pilotFrame(i)],i}));
    const others=lineup.filter(v=>v.i!==selected);
    $('#ui').innerHTML=`<div class="hangar-status"><span class="status-dot"></span><span>MECH BAY / LANCE ONLINE</span><span>${portName(companyPort())}</span></div>
    <div class="hangar-top-right"><button class="icon" data-hangar-hotspot="facilities" data-hangar-deck="base">FACILITIES</button><button class="icon" id="hangar-overview">OVERVIEW</button>${Object.keys(save.reserve??{}).length?'<button class="icon" id="hangar-reserves">RESERVES</button>':''}<button class="icon" id="inspect">${icon('info')} UNIT DETAILS</button></div>
    ${inspectOpen?`<aside class="unit-inspect"><div class="inspect-head"><span class="eyebrow">CHASSIS 0${selected+1} / ${f.model}</span><button id="close-inspect" class="icon" aria-label="Close unit details">${icon('x')}</button></div><h2>${f.name}</h2><p class="note">${f.role} · PILOT LEVEL ${u.level}</p><div class="rule"></div>${stat('BODY INTEGRITY',chassisParts(f,u,training).body+' HP')}${stat('ARMOR',chassisArmor(f,u,training))}${stat('MOBILITY',(chassisMobility(f,false,training))+' TILES')}${stat('WEAPON',w.name)}${stat('CONDITION',u.condition+'%',u.condition)}<div class="pilot">${pilotMark(pilotClass(selected),'pilot-thumb')}<div>${p.name}<small>${p.call} / ${p.skill}</small></div></div><button class="full" data-page="workshop">${icon('wrench')} OPEN WORKSHOP</button><p class="note">${skillDescription(selected,training)}</p></aside>`:''}
    ${!inspectOpen?`<a class="hangar-rig-preview" href="?bench=rig"><img ${chassisPicture(0,stockHull(0))} alt="" width="66" height="66"><span><strong>WARDEN MARK II</strong><small>VIEW RIG IN MOTION</small></span></a>`:''}
    <div class="command-deck"><div class="selected-chassis"><h1>${f.name}</h1><p>${p.name} / ${f.role} / ${u.condition>=90?'COMBAT READY':u.condition>=30?'OPERATIONAL':'REPAIR REQUIRED'}</p></div>${others.map(({m,i})=>`<button class="deck-unit" data-select="${i}" aria-label="Select ${m.name}"><h3>${m.name}</h3><small>${pilotProfile(i).call} / ${m.role}</small></button>`).join('')}<button class="primary deck-cta" data-page="workshop">REFIT ${icon('arrow-right')}</button></div>
    <div class="hangar-footer"><span>INDEPENDENT COMPANY / DAY ${String(save.day).padStart(3,'0')}</span><span>${save.wins} CONTRACTS / ${save.rep} REPUTATION</span><span>CAREER SAVED LOCALLY</span></div>`;
  }
  if(page==='inn')$('#ui').innerHTML=spaceInn();
  if(page==='contracts')$('#ui').innerHTML=contractsPage();
  if(page==='workshop')$('#ui').innerHTML=`<div class="page workshop-page"><div class="pagehead"><div><div class="eyebrow">ENGINEERING / CHASSIS & LOADOUT</div><h1>WORKSHOP.</h1></div></div>
   ${workshopTabs()}
  <div class="lance-tabs" aria-label="Select pilot">${LANCE_SLOTS.map(i=>`<button data-select="${i}" class="${i===selected?'active':''}" aria-pressed="${i===selected}"><small>${pilotProfile(i).call}</small>${FRAMES[pilotFrame(i)].name}</button>`).join('')}</div>
   ${workshopView==='assigned'?`
  <div class="split workshop-refit">
  <section class="workshop-chassis" tabindex="-1" aria-label="Selected mech"><div class="workshop-preview-heading"><span class="eyebrow">${f.model} / ${f.role} / MK ${u.upgrade+1}</span>${f.native||f.fixedWeapons?'':'<button type="button" id="armory-back" class="armory-jump">WEAPONS →</button>'}</div>
  <div class="workshop-selected"><h2>${f.name}</h2><p>${p.call} · ${u.condition>=90?'COMBAT READY':u.condition>=30?'OPERATIONAL':'REPAIR REQUIRED'}</p></div>
  <div class="unit-render" id="paint-preview" tabindex="0" role="group" aria-label="${f.name} turntable. Drag or use arrow keys to rotate. Pinch, plus or minus to zoom. Double tap or Home to reset."></div>
  <div class="workshop-meta"><button class="rotate-foundry" id="rotate-foundry" type="button">ROTATE PREVIEW</button>${stat('INTEGRITY',u.condition+'%',u.condition)}
  <div class="repairs"><button data-patch="${selected}" ${u.condition>=patchLimit()?'disabled':''}>FIELD PATCH · FREE</button><button data-repair="${selected}" ${u.condition===100?'disabled':''}>REPAIR · ${money(repairCost(selected))}</button>${infoTip('chassis maintenance','A free field patch restores a damaged hull to '+patchLimit()+'% integrity. Repair restores it to 100%.')}</div>
  ${u.condition<30?'<div class="repair-warning">Repair to 30% integrity to deploy.</div>':''}
  <details class="workshop-disclosure" data-workshop-detail="paint" ${bindWorkshop.disclosures?.paint?'open':''}><summary>Paint</summary>${workshopPaint(u)}</details>
  <details class="workshop-disclosure" data-workshop-detail="trials" ${bindWorkshop.disclosures?.trials?'open':''}><summary>Reinforcement & trials</summary><button data-upgrade="${selected}" ${u.upgrade>=3?'disabled':''}>${u.upgrade>=3?'MAX REINFORCEMENT':'REINFORCE · '+money(1800+u.upgrade*1200)}</button><p class="note">+25 BODY HP · +2 ARMOR PER MK</p>${frame===BASTION_FRAME?'<div class="reference-tabs" aria-label="Bastion loadout motion tests"><button type="button" id="bastion-test-rifle">TEST FIRE</button><button type="button" id="bastion-test-melee">TEST STRIKE</button></div>':''}<a class="rig-bench-link" href="?bench=rig&amp;frame=${frame}">OPEN RIG BENCH</a><a class="rig-bench-link" href="?lion=cleaver">LION WEAPONS TRIAL</a></details>
  </div></section>
  ${!openHands(frame)?`<section class="workshop-armory"><div class="eyebrow">LOADOUT / ${p.call}</div><h2 class="loadout-title">FACTORY ARMAMENT.</h2><div class="inline-help"><small>INTEGRATED WEAPONS</small>${infoTip(f.name,f.brief||'This chassis keeps its factory weapons.')}</div>${builtInLoadout(u,training,frame)}</section>`:workshopArmory(u,training)}
  </div>
  <details class="workshop-disclosure workshop-wide-detail" data-workshop-detail="compare" ${bindWorkshop.disclosures?.compare?'open':''}><summary>Compare chassis</summary>${chassisAssignments(selected,training)}</details>
  <details class="workshop-disclosure workshop-wide-detail" data-workshop-detail="stats" ${bindWorkshop.disclosures?.stats?'open':''}><summary>Sortie stats & computer</summary>${workshopStats(selected,f,u,training)}${MECH_SIGNATURES[frame]?`<button class="computer-open" type="button" data-mech-pilot="${pilotClass(selected)}">MECH COMPUTER · ${MECH_SIGNATURES[frame][0]}</button>`:''}</details>`:chassisAssignments(selected,training)}</div>`;
  if(page==='pilots')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">COMPANY / PILOTS</div><h1>HUMAN AT THE CORE.</h1><div class="company-context" role="group" aria-label="Company services"><button data-page="inn">Hiring Desk</button><button data-page="career">Career Record</button></div></div><p>${totalTrainingPoints()} TRAINING PT AVAILABLE<br>+5% WEAPON POWER PER LEVEL</p></div>
   <div class="grid">${LANCE_SLOTS.map(i=>pilotCard(pilotClass(i),save.units[i],trainingEffects(i),FRAMES[pilotFrame(i)].name,`id="train-pilot-${i}" data-train-pilot="${i}"`,trainingPoints(i))).join('')}
   ${dutyRoster().map(id=>{
    const kind=pilotKind(id),u=save.reservePilots[id];
    return pilotCard(kind,u,effectsForTraining(kind,u.training),'RELIEF PILOT',`data-reserve-training="${id}"`,reliefTrainingPoints(id));
   }).join('')}</div></div>`;
  if(page==='career')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">COMPANY RECORD / ONGOING CAREER</div><h1>LEAVE A MARK.</h1><a class="rig-bench-link" href="?bench=rig">OPEN RIG BENCH</a></div><span class="rank">${save.rep>=100?'VETERAN COMPANY':save.rep>=30?'RECOGNIZED LANCE':'INDEPENDENT OUTFIT'}</span></div><div class="career-stats"><div><span class="eyebrow">COMPANY RESERVES</span><h2>${money(save.credits)}</h2><p>Reinvest in weapons, armor and the machines that bring your pilots home.</p></div><div><span class="eyebrow">FULFILLED CONTRACTS</span><h2>${String(save.wins).padStart(2,'0')}</h2><p>${save.kills} enemy machines neutralized. ${save.rep} reputation earned.</p></div><div><span class="eyebrow">DEPLOYMENT DAY</span><h2>${String(save.day).padStart(3,'0')}</h2><p>Progress saves in this browser. Export a backup to carry your company with you.</p></div></div><section class="history"><span class="eyebrow">AFTER-ACTION RECORD</span>${save.history.length?save.history.slice().reverse().map(h=>`<div class="history-row"><span>${h.name}<small>DAY ${String(h.day).padStart(3,'0')}</small></span><b>${h.win?'FULFILLED / +'+money(h.pay):'LANCE WITHDRAWN'}</b></div>`).join(''):'<p style="margin-top:24px">No sorties recorded. Your first contract is waiting.</p>'}<div class="settings"><button id="export">EXPORT CAREER</button><button id="import">IMPORT BACKUP</button><input hidden type="file" id="file" accept="application/json"><button id="attack-camera" aria-pressed="${attackCameraEnabled}">ATTACK CAM ${attackCameraEnabled?'ON':'OFF'}</button><button id="reset">NEW CAREER</button></div></section></div>`;
  if(page==='journal')$('#ui').innerHTML=`<div class="page journal-page"><button type="button" id="journal-back" class="navigation-quiet">← Back to ${journalOrigin?({bridge:'Bridge',bay:'Mech Bay',company:'Company'}[journalOrigin.parent]):'Company'}</button><div class="pagehead"><div><div class="eyebrow">OPERATIONS / REFERENCE</div><h1>FIELD JOURNAL.</h1></div></div>${journalMarkup(journalPage)}</div>`;
  navigationContext();
  window.IronVowArmoryUI?.enhance(document);
  window.IronVowMenus?.enhance(document);
  bind();
  for(const button of document.querySelectorAll('[data-mech-pilot]'))button.onclick=()=>{
   const kind=Number(button.dataset.mechPilot),slot=LANCE_SLOTS.find(i=>pilotClass(i)===kind);
   openMechComputer(kind,slot===undefined?undefined:pilotFrame(slot));
  };
  if(page==='pilots')document.querySelectorAll('[data-train-pilot],[data-reserve-training]').forEach(button=>button.onclick=()=>trainingTree(button.dataset.reserveTraining??Number(button.dataset.trainPilot)));
  if(page==='workshop')bindWorkshop();
   if(page==='inn')bindInn();
  if(page==='ship')bindShip();
  if(page==='overworld')bindOverworld();
  if(page==='ship'||page==='hangar')bindHangar();
  if(page==='contracts'&&worldRules)bindWorldContracts();
  if(page==='contracts')for(const button of document.querySelectorAll('[data-rescan]'))button.onclick=()=>{
   const i=Number(button.dataset.rescan);
   if(rerollDispatch(i)){render();$(`[data-deploy="${i}"]`)?.focus();toast('New approach surveyed. Dispatch updated.')}
  };
  if(page==='hangar'&&hangarDeck==='mechs'){
   $('#hangar-overview').onclick=()=>window.IronVowHangarRuntime?.overview();

   $('#inspect').onclick=()=>{inspectOpen=!inspectOpen;render()};if(inspectOpen)$('#close-inspect').onclick=()=>{inspectOpen=false;render()}}
  if(page==='journal')bindJournal($('#ui'));
  syncHangar();
}
function syncHangar(){
 const active=!battle&&(page==='hangar'||page==='ship');
 window.IronVowHangarRuntime?.sync(active?{
  career:save,selected,mechBay:page==='hangar'&&hangarDeck==='mechs',model:foundryModel,
  onSelect(slot){if(careerStale||!LANCE_SLOTS.includes(slot))return;selected=slot;render();sound('click');},
  onReserve(frame){if(openStoredHull(frame))sound('click');},
  project:projectHangarHotspots
 }:null);
}
function repairCost(i){return Math.ceil((100-save.units[i].condition)*14*[100,80,70][shipLevel('repair')]/100)}
function navigateHangarRoute(route){
 const targets={
  ship:{page:'ship'},
  facilities:{page:'hangar',deck:'base',focus:'[data-hangar-deck="mechs"]'},
  'crew-cabin':{page:'hangar',deck:'base',focus:'[data-base-room="cabins"]'}
 };
 if(!Object.hasOwn(targets,route)||battle||careerStale)return false;
 const target=targets[route];
 if(route==='crew-cabin')hangarPage.uiState={...(hangarPage.uiState??{}),selected:'cabins',crew:true};
 page=target.page;if(target.deck)hangarDeck=target.deck;
 render();sound('click');
 if(target.focus){
  const focus=$(target.focus);
  focus?.scrollIntoView?.({block:route==='crew-cabin'?'center':'nearest'});
  focus?.focus?.({preventScroll:true});
 }
 return true;
}
function hangarHotspots(root=document){
 const elements=Object.create(null);
 for(const element of root.querySelectorAll('[data-hangar-hotspot]')){
  const id=element.dataset.hangarHotspot;
  if(Object.hasOwn(elements,id))throw Error('Duplicate hangar hotspot: '+id);
  elements[id]=element;
 }
 return elements;
}
function projectHangarHotspots(controller,positions,root=document){
 if(!controller||typeof controller.setHotspots!=='function')throw Error('A hangar scene controller is required');
 if(!positions||typeof positions!=='object'||Array.isArray(positions))throw Error('Hangar hotspot positions are required');
 const elements=hangarHotspots(root),items=[];
 for(const [id,position] of Object.entries(positions)){
  if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Invalid hangar hotspot position: '+id);
  const element=elements[id];if(!element)continue;
  items.push({element,position:[...position]});
 }
 const previous=items.map(({element})=>({
  element,projected:element.classList.contains('hangar-scene-hotspot'),
  hidden:element.hidden,left:element.style.left,top:element.style.top
 }));
 const restore=()=>{
  for(const {element,projected,hidden,left,top} of previous){
   if(!projected)element.classList.remove('hangar-scene-hotspot');
   element.hidden=hidden;element.style.left=left??'';element.style.top=top??'';
  }
 };
 try{
  for(const item of items)item.element.classList.add('hangar-scene-hotspot');
  controller.setHotspots(items);
 }catch(error){
  restore();
  try{controller.setHotspots([])}catch{}
  throw error;
 }
 let connected=true;
 return ()=>{
  if(!connected)return;
  connected=false;restore();controller.setHotspots([]);
 };
}
window.IronVowHangarNavigation=Object.freeze({
 routes:Object.freeze(['ship','facilities','crew-cabin']),
 go:navigateHangarRoute,
 hotspots:hangarHotspots,
 project:projectHangarHotspots
});
function bind(){
 document.querySelectorAll('[data-primary]').forEach(button=>button.onclick=()=>navigatePrimary(button.dataset.primary));
 if($('#journal-back'))$('#journal-back').onclick=returnFromJournal;
 document.querySelectorAll('[data-patch]').forEach(b=>b.onclick=()=>{save.units[selected].condition=Math.max(patchLimit(),save.units[selected].condition);persist();render();toast('Emergency field patch applied. Full repairs recommended.')});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(battle)return;const destination=b.dataset.page;if(destination==='journal'){openJournal();return;}journalOrigin=null;if(destination==='ship'){navigateHangarRoute('ship');return;}if(destination==='hangar'){navigateHangarRoute('facilities');return;}if(destination==='overworld'){showOverworld();sound('click');return;}if(destination==='contracts')contractPortSelection=companyPort();page=destination;if(page==='workshop')workshopView='assigned';render();sound('click')});document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.select;render();sound('click')});document.querySelectorAll('[data-deploy]').forEach(b=>b.onclick=()=>prepareSortie(+b.dataset.deploy));document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>equipWeapon(b.dataset.equip));document.querySelectorAll('[data-equip-right]').forEach(b=>b.onclick=()=>equipWeapon(b.dataset.equipRight,'right'));document.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{let cost=repairCost(selected);if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;save.units[selected].condition=100;persist();render();toast('Chassis restored to full integrity')});document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{let u=save.units[selected],cost=1800+u.upgrade*1200;if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;u.upgrade++;persist();render();toast('Chassis reinforcement installed')});if($('#export')){$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iron-vow-career.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{let n=JSON.parse(await e.target.files[0].text());const restored=importCareer(n);toast(restored?'Career and active sortie restored':n.version===2&&n.sortie?'Foundry career imported. Start a new sortie.':'Career backup restored')}catch{toast('Invalid career backup')}};$('#reset').onclick=()=>modal('NEW CAREER?','This replaces your company progress in this browser. Export a backup first if you want to keep it.',[{text:'KEEP MY CAREER',fn:closeModal},{text:'START FRESH',fn:()=>{save=fresh();overworldSelection=null;persist();closeModal();render()}}]);
 $('#attack-camera').onclick=()=>{attackCameraEnabled=!attackCameraEnabled;try{localStorage.setItem('iron-vow-attack-camera',attackCameraEnabled?'on':'off')}catch{}render()};
 }}
function validHull(u,frame,owned=[]){
 const f=FRAMES[frame];
 if(!u||!playerHull(frame))return false;
 const modular=openHands(frame);
 const slotValid=u.shoulder==null||modular&&(f.native==='cicada'?u.shoulder==='locust':['missile','cerberus','vesper-shoulder'].includes(u.shoulder))||breachLoadout(frame)&&['vesper-shoulder','missile'].includes(u.shoulder);
 const meleeValid=modular?(u.melee==null||MELEE.some(w=>w.id===u.melee)||f.native==='cicada'&&u.melee==='pulse-bash'):
  breachLoadout(frame)?(u.melee==null||frame===3&&u.melee==='breach-gauntlet'||u.melee==='cleaver'&&owned.some(id=>itemId(id)==='cleaver')):u.melee===f.melee||u.melee==null&&Boolean(fixedMeleeOption(frame));
 const rightMelee=u.meleeHand==='right';
 const handValid=u.meleeHand==null||rightMelee&&modular&&MELEE.some(w=>w.id===u.melee)&&(u.weapon===null||launcherId(u.weapon));
 const shieldValid=u.shield==null||canFitShield(frame)&&(u.melee==null||rightMelee)&&shieldItem(u.shield)&&owned.includes(u.shield);
 const rangedValid=modular?(u.weapon===null||RANGED.some(w=>w.id===u.weapon)||f.native==='cicada'&&u.weapon==='locust'):
  f.native||f.fixedWeapons?u.weapon===f.weapon||fixedPrimaryOptions(frame).length>0&&(u.weapon===null||fixedPrimaryOptions(frame).includes(u.weapon)):RANGED.some(w=>w.id===u.weapon);
 return shieldValid&&slotValid&&meleeValid&&handValid&&rangedValid&&
  (u.paintFinish===undefined||fieldPaint.valid(u.paintFinish))&&(u.paint==null||validPaint(u.paint))&&
  (u.trim==null||!!u.trim&&typeof u.trim==='object'&&['s','a'].every(k=>u.trim[k]==null||validPaint(u.trim[k])))&&Number.isFinite(u.condition)&&u.condition>=0&&u.condition<=100&&
  Number.isInteger(u.upgrade)&&u.upgrade>=0&&u.upgrade<=3;
}
function validSave(s){
 if(!s||s.version!==1||!Number.isFinite(s.credits)||s.credits<0||!Number.isInteger(s.day)||s.day<1||
    ![s.rep,s.wins,s.kills].every(Number.isFinite)||!Array.isArray(s.owned)||
    !s.owned.every(id=>shieldItem(id)||WEAPONS.some(w=>w.id===id&&!w.builtIn))||!Array.isArray(s.history)||s.history.length>500||
    !s.history.every(h=>h&&CONTRACTS.some(c=>c.name===h.name)&&Number.isFinite(h.day)&&typeof h.win==='boolean'&&Number.isFinite(h.pay))||
    !Array.isArray(s.units)||s.units.length!==PILOTS.length)return false;
 if(!s.units.every((u,i)=>u&&Number.isInteger(pilotFrame(i,s))&&validHull(u,pilotFrame(i,s),s.owned)&&
    Number.isSafeInteger(u.level)&&u.level>0&&u.level<10000&&Number.isFinite(u.xp)&&u.xp>=0))return false;
 const frames=new Set(s.units.map((_,i)=>pilotFrame(i,s)));
 if(frames.size!==PILOTS.length)return false;
 const pilots=new Set(LANCE_SLOTS.map(i=>pilotClass(i,s)));
 if(pilots.has(-1)||pilots.size!==LANCE_SLOTS.length)return false;
 if(s.reservePilots!==undefined&&!validRecord(s.reservePilots,([id,p])=>{
  const kind=pilotKind(id);
  return kind>=0&&!pilots.has(kind)&&p&&Number.isSafeInteger(p.level)&&p.level>0&&p.level<10000&&Number.isFinite(p.xp)&&p.xp>=0&&Array.isArray(p.training);
 }))return false;
 if(s.ship!==undefined&&!validShip(s))return false;
 if(s.world!==undefined&&(!worldRules?.validWorld(s.world)||s.world.day!==s.day))return false;
 if(!validTransit(s))return false;
 if(s.overworld!==undefined&&(!overworld.validState(s.overworld,careerNetwork(s).ports)||s.overworld.lastExpense?.day>s.day))return false;
 if(s.hangar!==undefined&&!validHangar(s))return false;
 if(s.duty!==undefined&&(!Array.isArray(s.duty)||s.duty.length>hangarLevel('cabins',s)||
    new Set(s.duty).size!==s.duty.length||!s.duty.every(id=>typeof id==='string'&&Object.hasOwn(s.reservePilots??{},id))))return false;
 if(s.wounds!==undefined&&!validRecord(s.wounds,([id,days])=>(pilots.has(pilotKind(id))||Object.hasOwn(s.reservePilots??{},id))&&[1,2].includes(days)))return false;
 if(s.salvage!==undefined&&!validRecord(s.salvage,([id,count])=>String(Number(id))===id&&salvageableHull(Number(id))&&Number.isSafeInteger(count)&&count>0))return false;
 if(s.dispatch!==undefined&&(!s.dispatch||s.dispatch.day!==s.day||!Array.isArray(s.dispatch.sizes)||s.dispatch.sizes.length!==CONTRACTS.length||!s.dispatch.sizes.every(n=>Number.isInteger(n)&&n>=1&&n<=3)))return false;
 if(s.mechMastery!==undefined&&!validMechMastery(s,pilots))return false;
 if(s.itemInventory!==undefined&&s.itemInventory!==true)return false;
 if(s.captured!==undefined&&!validRecord(s.captured,([id,count])=>String(Number(id))===id&&playerHull(Number(id))&&Number.isSafeInteger(count)&&count>0))return false;
 const reserveValid=s.reserve===undefined||!!s.reserve&&typeof s.reserve==='object'&&!Array.isArray(s.reserve)&&Object.entries(s.reserve).every(([key,u])=>{
  const i=Number(key);
  return Number.isInteger(i)&&String(i)===key&&!frames.has(i)&&validHull(u,i,s.owned);
 });
 return reserveValid&&(!s.itemInventory||fittedItems(s).every(id=>availableCopies(id,s)>=0));
}
function validRecord(record,check){return Boolean(record&&typeof record==='object'&&!Array.isArray(record)&&Object.entries(record).every(check))}
function validMechMastery(career,pilots){
 const frameKey=key=>String(Number(key))===key&&playerHull(Number(key))&&MECH_SIGNATURES[key];
 return validRecord(career.mechMastery,([id,record])=>{
  if(!(pilots.has(pilotKind(id))||Object.hasOwn(career.reservePilots??{},id))||!record)return false;
  if(!validRecord(record.kills,([key,kills])=>frameKey(key)&&Number.isInteger(kills)&&kills>=1&&kills<=MECH_MASTERY_KILLS))return false;
  return record.slots===undefined||validRecord(record.slots,([key,slots])=>{
   if(!frameKey(key)||!Array.isArray(slots)||slots.length>mechSlotCount(record.kills[key]??0))return false;
   const equipped=slots.filter(skill=>skill!==null);
   return new Set(equipped).size===equipped.length&&equipped.every(skill=>
    Number.isInteger(skill)&&skill!==Number(key)&&frameKey(String(skill))&&record.kills[skill]>=MECH_LEARN_KILLS);
  });
 });
}
function validMechState(state){
 return validRecord(state,([key,value])=>{
  if(key==='moved')return Number.isInteger(value)&&value>=0&&value<=battle.size.width*battle.size.depth;
  if(key==='spot')return value&&battle.units.some(u=>u.id===value.source&&u.team===value.team);
  if(key==='lock')return value&&Number.isInteger(value.x)&&Number.isInteger(value.z)&&onBoard(value.x,value.z)&&Number.isInteger(value.turn)&&value.turn>=1&&value.turn<=10000;
  return ['fired','valkyrieUsed','valkyrieStep','behemothUsed','aegisUsed','disrupted','basilisk'].includes(key)&&typeof value==='boolean';
 });
}
function validShip(career){
 const ship=career.ship;
 if(!ship||!validRecord(ship.levels,([name,level])=>Object.hasOwn(SHIP_DECK,name)&&[1,2].includes(level)))return false;
 const job=ship.project;
 if(job===undefined)return true;
 if(!job||!Object.hasOwn(SHIP_DECK,job.facility))return false;
 const next=SHIP_DECK[job.facility].tiers[shipLevel(job.facility,career)];
 return !!next&&Number.isInteger(job.wins)&&job.wins>=1&&job.wins<=next.wins;
}
function validHangar(career){
 const base=career.hangar;
 if(!base||!validRecord(base.levels,([room,level])=>Object.hasOwn(HANGAR_ROOMS,room)&&Number.isInteger(level)&&level>=1&&level<=HANGAR_ROOMS[room].tiers.length))return false;
 for(const day of [base.treatmentDay,base.scanDay])if(day!==undefined&&(!Number.isInteger(day)||day<1||day>career.day))return false;
 const job=base.project;
 if(job===undefined)return true;
 if(!job||!Object.hasOwn(HANGAR_ROOMS,job.room))return false;
 const next=HANGAR_ROOMS[job.room].tiers[hangarLevel(job.room,career)];
 return !!next&&Number.isInteger(job.wins)&&job.wins>=1&&job.wins<=next.wins;
}
function loadCareer(record){
 if(record?.version!==2){
  if(!validSave(record))return null;
  migrateEquipment(record);
  const gatecrasher=record.units.find((_,i)=>pilotFrame(i,record)===3)??record.reserve?.[3];
  if(gatecrasher?.melee==='breach-gauntlet')delete gatecrasher.melee;
  return restoreTraining(record);
 }
 // The donor uses indices 0–5 for its machines, in a different order from Sites.
 const frameMap=[8,9,10,5,6,7];
 if(!Array.isArray(record.mechs)||record.mechs.length<3||record.mechs.length>frameMap.length||
    !Array.isArray(record.units)||record.units.length!==PILOTS.length)return null;
 const frames=new Set();
 const hulls=record.mechs.map(m=>{
  if(!m||!Number.isInteger(m.frame)||frameMap[m.frame]===undefined||frames.has(m.frame))return null;
  frames.add(m.frame);
  const frame=frameMap[m.frame],paint=m.paint;
  if(paint!=null&&(!paint||!['p','s','a'].every(k=>validPaint(paint[k]))))return null;
  return{frame,weapon:m.weapon==='blade'?FRAMES[frame].weapon:m.weapon,
   melee:m.weapon==='blade'?'blade':undefined,paint:paint?.p,trim:paint?{s:paint.s,a:paint.a}:undefined,
   condition:m.condition,upgrade:m.upgrade};
 });
 if(hulls.some(hull=>!hull)||!record.units.every(u=>u&&Number.isInteger(u.mech)&&hulls[u.mech]))return null;
 const assigned=new Set(record.units.map(u=>u.mech));
 if(assigned.size!==PILOTS.length)return null;
 const units=record.units.map(u=>({...hulls[u.mech],level:u.level,xp:u.xp}));
 const reserve=Object.fromEntries(hulls.filter((_,i)=>!assigned.has(i)).map(({frame,...hull})=>[frame,hull]));
 const {day,credits,rep,wins,kills,history,owned}=record;
 const migrated={version:1,day,credits,rep,wins,kills,history,owned,units,reserve};
 if(!validSave(migrated))return null;
 return migrateEquipment(migrated);
}
function importCareer(record){
 if(battle)throw Error('A sortie is active');
 const imported=loadCareer(record);
 if(!imported)throw Error('Invalid career backup');
 save=imported;overworldSelection=null;
 const restored=restoreSortie();
 if(restored)page='contracts';else if(save.transit)page='overworld';
 persist(restored?.enemyPending);
 render();
 if(restored?.enemyPending)void endTurn();
 return Boolean(restored);
}
function modal(title,body,buttons){if(careerStale)return;moveTap=null;if($('#modal').hidden)modalReturnFocus=document.activeElement;$('#modal').hidden=false;$('#modal').innerHTML=`<div class="modalbox" role="dialog" aria-modal="true" aria-label="${title}"><div class="eyebrow">IRON VOW / COMMAND UPLINK</div><h1>${title}</h1><div>${body}</div><div class="buttons">${buttons.map((b,i)=>`<button class="${i===buttons.length-1?'primary':''}" id="modal-${i}">${b.text}</button>`).join('')}</div></div>`;buttons.forEach((b,i)=>$('#modal-'+i).onclick=b.fn);$('#modal-0').focus()}
function closeModal(){if(careerStale)return;closeHelp();$('#modal').hidden=true;if(modalReturnFocus?.isConnected)modalReturnFocus.focus();modalReturnFocus=null}
function quickOrders(){
 const topics=[
  ['arrows-out-cardinal','Move','Free tiles, then +1 tile for '+EXTRA_MOVE_AP+' AP',MOVE_HELP+' Cross terraces on foot. Obstacles block movement and give cover to adjacent units. Drag to pan, or use the map and zoom controls.'],
  ['crosshair','Fire','Pick a hostile and fire','Every round that hits rolls its own location: about 55% body, 25% arms, 20% legs and a small chance of the cockpit. Destroyed parts are skipped. High ground gives direct fire +10 aim. Ridges block guns, while missiles arc over them. Body or cockpit loss disables a mech. Arms and legs affect weapons, armor and movement.'],
  ['crosshair','Strike','Adjacent ground targets','Equip melee in the Workshop. Strike needs a working arm on the equipped side. Gunships require ranged attacks and can cross cover. Missiles ignore cover.'],
  ['shield-chevron','Brace','1–2 AP · blocks 50% or more','Brace lasts until your next turn. Training can reduce the cost. Pilot skills can be used once per battle.'],
  ['shield-chevron','Shield','0 AP · all hits go to the left arm',SHIELD_HELP],
  ['arrow-u-up-left','Counter','0 AP · 1 per round',COUNTER_HELP],
  ['lightning','End turn','The hostile lance acts','Select deployed units in the bottom bar. Neutralize all enemies to win. Tanks and gunships have hull HP and award pilot XP.'],
  ['wrench','Refit','Repair between sorties','Contracts earn credits, XP and reputation. Withdraw to bring surviving machines home. The career and completed actions save in this browser. An interrupted enemy phase restarts on reload.'],
  ['binoculars','Attack camera','Skip with Escape','Switch the camera off in Career if you prefer the tactical view.']
 ];
 return `<div class="stat-heading"><span class="eyebrow">QUICK ORDERS</span>${helpHint()}</div>
  <div class="manual-topics">${topics.map(([glyph,label,summary,description])=>`<div>${icon(glyph)}<span><b>${label}</b><small>${summary}</small></span>${infoTip(label,description)}</div>`).join('')}</div>`;
}
function pilotWiki(){
 const roles=['Assault','Fire control','Field support','Reconnaissance','Tactical command','Subsystem demolition','Electronic warfare','Field recovery'];
 const tactics=[
  ['Advance under cover and turn Overdrive into an assault window.','Fight adjacent to conserve AP and break armor.'],
  ['Brace before long shots and reserve Deadeye for a kill.','Disable arms and legs to interrupt retaliation and maintain Deadeye.'],
  ['Hold Field Repair for major damage or let Failsafe spend it automatically.','Brace next to allies to protect the line and extend counter reach.'],
  ['Paint the target that matters most before the squad fires.','Paint from cover, then move or fire before the enemy closes.'],
  ['Order an ally carrying an expensive weapon while they still have AP.','Order the front-line ally to brace or let them fire before moving.'],
  ['Prime to damage a random intact arm or leg. A charged hit cancels the immediate counter.','Move, fire a charged shot and use the rest of your movement to break contact.'],
  ['Jam a heavy gun before committing the lance. Drain its AP before the enemy acts.','Stop a close-range enemy from advancing while your lance moves into cover.'],
  ['Restore a disabled weapon arm or legs to get a sidelined mech back into the fight.','Take the field and survive to bring extra wrecks back to the Workshop.']
 ];
 return `<section class="pilot-wiki" aria-label="Pilot classes and skills">
  <div class="stat-heading"><h2>Pilot classes &amp; skills</h2>${infoTip('training ranks',FOUNDATION_HELP+' Training points are earned at levels 1 through 6, then at 8 and 10. Your level 5 doctrine unlocks ranks 6, 8 and 10 in its path.')}</div>
  ${CREW.map((pilot,i)=>`<details class="wiki-pilot"><summary><b>${pilot.call}</b><span>${roles[i]} · ${pilot.skill}</span></summary>
   <div class="wiki-profile"><div class="wiki-profile-head">${pilotMark(i,'pilot-thumb')}<div><span class="eyebrow">${pilot.name} / SIGNATURE SKILL</span><p><b>${pilot.skill}</b> · ${pilot.desc}</p></div></div>
    <div class="wiki-paths">${PILOT_TREES[i].map((path,index)=>`<section aria-label="${path.name}">
     <h3>${icon(path.glyph)} ${path.name}</h3><p>${tactics[i][index]}</p>
     <ol>${path.nodes.map((node,rank)=>`<li><small>LV ${TRAINING_LEVELS[rank]}${rank===DOCTRINE_RANK?' · DOCTRINE':''}</small><b>${node.name}</b><span>${node.label}</span></li>`).join('')}</ol>
    </section>`).join('')}</div>
   </div></details>`).join('')}
  <p class="pilot-credit">Recruit portraits by <a href="https://sakpix.itch.io/cyberpunk-portrait-pack-free-200-sci-fi-character-portraits">SakPix</a> · Cyberpunk Portrait Pack (Free Edition)</p>
 </section>`;
}
function journalMarkup(section){
 return `<div class="reference-tabs" aria-label="Field Journal sections">
  <button type="button" data-journal="orders" aria-pressed="${section==='orders'}">${icon('binoculars')} QUICK ORDERS</button>
  <button type="button" data-journal="wiki" aria-pressed="${section==='wiki'}">${icon('info')} PILOT WIKI</button>
 </div>${section==='wiki'?pilotWiki():quickOrders()}`;
}
function bindJournal(root,inSortie=false){
 root.querySelectorAll('[data-journal]').forEach(button=>button.onclick=()=>{
  const section=button.dataset.journal;
  if(inSortie)guide(section);
  else{journalPage=section;render()}
  $(`[data-journal="${section}"]`)?.focus({preventScroll:true});
 });
}
function guide(section='orders'){
 closeHelp();modal('FIELD JOURNAL',journalMarkup(section),[{text:'UNDERSTOOD',fn:closeModal}]);
 bindJournal($('#modal'),true);
}
// Tactical simulation: part HP, reachable tiles, AP, cover, level scaling and persistent rewards.
function hostileLivery(frame,index){
 // Mix the saved contract roll with the encounter and unit identity so reloads keep the same colors.
 const key=[save.day,battle.contract.id,save.dispatch?.sizes.join(''),frame,index].join('/');
 let hash=2166136261;
 for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return HOSTILE_LIVERIES[((hash^(hash>>>16))>>>0)%HOSTILE_LIVERIES.length];
}
function makeUnit(i,team,x,z){
 const ally=team==='ally',aux=ally&&i===AUX_SLOT?battle.aux:null;
 const frame=aux?aux.frame:ally?pilotFrame(i):hostileFrame(i,battle.contract,battle.stockHostiles,battle.frontierHellbreaker,battle.picketLineInfantry,battle.corridorElite,battle.hardVanguard,battle.reaverHostiles,battle.bulwarkHostile,battle.aeroMelee,battle.relayLead),f=FRAMES[frame];
 const u=aux?save.reserve[frame]:ally?save.units[i]:{...stockHull(frame),upgrade:Math.max(0,battle.contract.difficulty-1),level:battle.contract.difficulty,
  weapon:f.weapon||['rifle','shotgun','missile'][i%3]};
 const pilot=aux?pilotKind(aux.pilotId):ally?pilotClass(i):undefined,crew=aux?save.reservePilots[aux.pilotId]:u;
 const training=aux?effectsForTraining(pilot,crew.training):ally?trainingEffects(i):undefined;
 const {body,...limbs}=chassisParts(f,u,training);
 const max={body,pilot:ally?CREW_HP[pilot]:PILOT_HP[i%PILOT_HP.length],...limbs};
 const hp=Object.fromEntries(Object.entries(max).map(([part,n])=>[part,part==='pilot'?n:deploymentHP(n,u.condition)]));
 if(ally&&woundDays(pilotId(pilot)))hp.pilot=Math.ceil(max.pilot*.65);
 const [paint,secondary]=f.fixedLivery?[null]:ally?[u.paint??null]:frame===REAVER_FRAME||frame===BULWARK_FRAME?[null]:hostileLivery(frame,i);
 const melee=!ally&&frame===AERO_FRAME?battle.aeroMelee:u.melee??null;
 return{id:team+i,index:i,team,pilot,x,z,vx:x,vz:z,frame,name:ally?f.name:(ENEMY_NAMES[frame]??f.name)+' '+(i+1),weapon:u.weapon,melee,meleeHand:u.meleeHand,shoulder:u.shoulder,shield:u.shield,
  paintFinish:ally?u.paintFinish:'block',paint,trim:ally&&!f.fixedLivery?u.trim:secondary?{s:secondary}:null,upgrade:u.upgrade,level:crew.level,training,armor:chassisArmor(f,u,training),max,hp,ap:roundAP(training),brace:false,skill:false,boost:false,alive:true};
}
const sortiePilot=u=>u.index===AUX_SLOT?save.reservePilots[battle.aux.pilotId]:save.units[u.index];
const sortieHull=u=>u.index===AUX_SLOT?save.reserve[u.frame]:save.units[u.index];
function auxiliaryChoices(){
 if(shipLevel('drop')<2)return '';
 const pilots=Object.entries(save.reservePilots??{}),hulls=Object.entries(save.reserve??{}).filter(([,hull])=>hull.condition>=30);
 if(!pilots.length||!hulls.length)return '<p class="note">Auxiliary Cradle ready · Keep one unseated pilot and one stored hull at 30% integrity or better.</p>';
 return `<fieldset class="auxiliary-choices"><legend>Auxiliary Cradle</legend>
  <label class="aux-enable"><input type="checkbox" id="use-aux"> Deploy one reserve mech</label>
  <label>Available pilot<select id="aux-pilot">${pilots.map(([id,p])=>`<option value="${id}">${CREW[pilotKind(id)].call} · LV ${p.level}${woundDays(id)?' · WOUNDED':''}</option>`).join('')}</select></label>
  <label>Stored hull<select id="aux-frame">${hulls.map(([frame,h])=>`<option value="${frame}">${FRAMES[frame].name} · ${h.condition}%</option>`).join('')}</select></label>
 </fieldset>`;
}
function prepareSortie(i,offer=null){
 const contract=CONTRACTS[i],contractPort=offer?.port??contract?.id;
 if(save.transit){showOverworld();toast('Review the transit report before deploying.');return;}
 if(battle||careerStale||!contract)return;
 if(companyPort()!==contractPort){showOverworld(contractPort);return;}
 const size=dispatchSizes()[i],ready=LANCE_SLOTS.filter(slot=>save.units[slot].condition>=30),chosen=new Set(ready.slice(0,size));
 const active=dutyRoster().length?activeRosterIds():[];
 const draft=new Map(LANCE_SLOTS.map(slot=>[slot,pilotId(pilotClass(slot))]));
 const selectedCrew=()=>[...chosen].sort().map(slot=>draft.get(slot));
 const options=active.map(id=>`<option value="${id}">${CREW[pilotKind(id)].call}${woundDays(id)?' · WOUNDED':''}</option>`).join('');
 modal('SORTIE ASSIGNMENT',`<div class="stat-heading"><span class="eyebrow">${CONTRACTS[i].name} / ${size} SEAT${size===1?'':'S'}</span>${infoTip('sortie seats','Contract capacity is rolled for each company day. Select the required number of operational mechs. Pilots who stay aboard recover from wounds. A wounded pilot starts combat at 65% pilot HP.'+(active.length?' Pilot changes apply when you deploy. Displaced pilots stay on the active roster.':''))}</div>
  <div class="seat-choices">${LANCE_SLOTS.map(slot=>{
   const frame=FRAMES[pilotFrame(slot)].name,canFly=ready.includes(slot),pilot=pilotProfile(slot);
   return `<div class="sortie-seat"><button type="button" data-sortie-seat="${slot}" aria-pressed="${chosen.has(slot)}" ${!canFly?'disabled':''}><b>${frame}${active.length?'':' · '+pilot.call}</b><small>${save.units[slot].condition}% INTEGRITY${canFly?'':' · REPAIR NEEDED'}${!active.length&&woundDays(draft.get(slot))?' · '+woundLabel(draft.get(slot)):''}</small></button>
    ${active.length&&canFly?`<label class="sortie-crew">Pilot<select data-sortie-pilot="${slot}" aria-label="Pilot for ${frame}">${options}</select></label>`:''}</div>`;
  }).join('')}</div>
  ${ready.length>=size?auxiliaryChoices():''}
  <p class="note" id="sortie-count" aria-live="polite"></p>`,
  [{text:'CANCEL',fn:closeModal},...(ready.length<size?[{text:'OPEN WORKSHOP',fn:()=>openRepair(LANCE_SLOTS.find(slot=>!ready.includes(slot)))}]:[
   {text:'DEPLOY',fn:()=>{if(chosen.size===size&&!battle&&!careerStale&&companyPort()===contractPort){
    if(offer&&!worldOfferById(offer.id)){closeModal();render();return toast('That offer has expired.');}
    const aux=$('#use-aux')?.checked?{pilotId:$('#aux-pilot').value,frame:Number($('#aux-frame').value)}:null;
    closeModal();deploy(i,false,[...chosen].sort(),aux,active.length?selectedCrew():null,offer);
   }}}
  ])]);
 const buttons=[...document.querySelectorAll('[data-sortie-seat]')],launch=ready.length>=size?$('#modal-1'):null;
 const selectors=[...document.querySelectorAll('[data-sortie-pilot]')],auxPilot=$('#aux-pilot'),useAux=$('#use-aux');
 const sync=()=>{
  for(const button of buttons)button.setAttribute('aria-pressed',String(chosen.has(Number(button.dataset.sortieSeat))));
  const picked=selectedCrew();
  for(const select of selectors){
   const slot=Number(select.dataset.sortiePilot);
   select.value=draft.get(slot);
   select.disabled=!chosen.has(slot);
   select.parentElement.hidden=select.disabled;
   for(const option of select.options)option.disabled=option.value!==select.value&&picked.includes(option.value);
  }
  if(auxPilot){
   for(const option of auxPilot.options)option.disabled=picked.includes(option.value);
   const first=[...auxPilot.options].find(option=>!option.disabled);
   if(!auxPilot.value||picked.includes(auxPilot.value))auxPilot.value=first?.value??'';
   useAux.disabled=!first;
   if(!first)useAux.checked=false;
  }
  if(launch)launch.disabled=chosen.size!==size;
  $('#sortie-count').textContent=ready.length<size?'Repair additional hulls to meet the required seats.':chosen.size+' / '+size+' selected'+(useAux?.checked?' + 1 AUX':'')+(useAux?.disabled?' · No unseated auxiliary pilot available':'');
 };
 for(const button of buttons)button.onclick=()=>{
  const slot=Number(button.dataset.sortieSeat);
  if(!chosen.delete(slot)){
   if(chosen.size===size)chosen.delete(chosen.values().next().value);
   const picked=selectedCrew();
   if(active.length&&picked.includes(draft.get(slot)))draft.set(slot,active.find(id=>!picked.includes(id)));
   chosen.add(slot);
  }
  sync();
 };
 for(const select of selectors)select.onchange=()=>{
  draft.set(Number(select.dataset.sortiePilot),select.value);sync();
 };
 if(useAux)useAux.onchange=sync;
 sync();
}
function openRepair(slot){
 closeModal();page='workshop';workshopView='assigned';selected=slot;render();
}
function deploy(i,legacy=false,slots=LANCE_SLOTS,aux=null,crew=null,offer=null){
 if(save.transit||battle||!CONTRACTS[i]||!validSlots(slots))return;
 if(crew!==null){
  const active=activeRosterIds();
  if(legacy||!dutyRoster().length||!Array.isArray(crew)||crew.length!==slots.length||
     new Set(crew).size!==crew.length||!crew.every(id=>active.includes(id)))return toast('Select one active pilot per mech.');
 }
 if(aux&&(legacy||!validAux(aux)||crew?.includes(aux.pilotId)))return toast('The auxiliary seat requires a separate pilot and an operational stored hull.');
 const damaged=slots.find(slot=>save.units[slot].condition<30);
 if(damaged!==undefined){
  modal('REPAIR REQUIRED','<p>A selected chassis has less than 30% integrity.</p>',[{text:'OPEN WORKSHOP',fn:()=>openRepair(damaged)}]);return;
 }
 let nextWorld;
 if(offer){
  const current=worldOfferById(offer.id);
  if(!current||current.templateIndex!==i||current.port!==companyPort())return toast('That offer is no longer available.');
  offer=acceptedOffer(current);nextWorld=worldRules.consumeOffer(save.world,offer.id);
  if(!nextWorld)return;
 }
 if(crew)slots.forEach((slot,index)=>seatPilot(slot,crew[index]));
 createBattle(i,legacy,legacy,slots,true,aux);
 if(offer){save.world=nextWorld;battle.offer=offer;}
 if(!legacy){
  const seed=Math.floor(ruleRandom()*4294967296);
  surveyTerrain(seed);
  for(const u of battle.units)if(isLineInfantry(u))u.weapon=INFANTRY_PRIMARIES[(seed+u.index)%INFANTRY_PRIMARIES.length];
  enableMechComputers();
 }
 selected=slots[0];action='move';effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;
 persist();render();sound('click');if(save.history.length===0)guide();
}
function current(){return battle?.units.find(u=>u.team==='ally'&&u.index===selected&&u.alive)}
function startLionTrial(id){
 if(!lionTrial||battle?.busy||!LION_TRIAL_WEAPONS.includes(id))return;
 createBattle(0,false,true,[0],false,null,0);
 const [lion,target]=battle.units;
 battle.lionTrial=true;
 battle.contract={...battle.contract,name:'LION WEAPONS TRIAL'};
 battle.units=[lion,target];
 battle.cover.clear();battle.field.cover={};
 Object.assign(lion,{lionTrial:true,name:'LION',melee:id,shield:null});
 Object.assign(target,{name:'PRACTICE TARGET',x:lion.x+1,z:lion.z,vx:lion.x+1,vz:lion.z,reacted:true});
 target.max.body=target.hp.body=200;
 lion.heading=headingTo(1,0);lion.face=1;
 target.heading=headingTo(-1,0);target.face=-1;
 battle.log=['Training range ready. Select Strike, then tap the adjacent target.'];
 selected=0;action='strike';effects=[];hover=null;lockedTarget=target.id;targetPanelOpen=false;
 focusBattleCamera(lion,true);
 render();
}
const {occupied,neighborTiles,paths,route,distance,inCover,ridgeBlocks,attackObstruction,highGroundAim}=window.IRON_VOW_SIM.createTerrainRules({
 getBattle:()=>battle,onBoard,movementLimit,terrainCell,helicopterHeight:()=>VEHICLES.helicopter.altitude/TERRAIN_RISE,
 canReachTarget,launchesMissiles
});
function canJumpjet(u){
 return Boolean(u?.alive&&(FRAMES[u.frame]?.jumpjet||hasMechSkill(u,AERO_FRAME))&&u.hp.legs>0&&u.ap>=JUMPJET_AP&&!u.jumpjetUsed);
}
function jumpjetLanding(u,x,z){
 return canJumpjet(u)&&onBoard(x,z)&&distance(u,{x,z})<=JUMPJET_RANGE&&
  !battle.cover.has(x+','+z)&&!occupied(x,z);
}
function jumpjetDestination(u,target){
 if(!canJumpjet(u))return null;
 let best=null,closest=distance(u,target);
 for(let x=u.x-JUMPJET_RANGE;x<=u.x+JUMPJET_RANGE;x++){
  for(let z=u.z-JUMPJET_RANGE;z<=u.z+JUMPJET_RANGE;z++){
   const d=distance(target,{x,z});
   if(d>=closest||!jumpjetLanding(u,x,z))continue;
   best={x,z,d};closest=d;
  }
 }
 return best;
}
const {hitOdds,shotsPerAttack,roundWeight}=window.IRON_VOW_SIM;
const {chargedLimbShot,shotPart,mechAim,hitChance,shieldProtection,damage,partDamage,attackBudget}=window.IRON_VOW_SIM.createCombatRules({weapon,armoryClass,inCover,distance,limbPart,hasMechSkill,launchesMissiles,highGroundAim,dodgeChance,battleUnits:()=>battle?.units,deadeyePower,damagedArmor,braceReduction,activeShield,volleyBudget,ASHIGARU_FRAME,VANGUARD_FRAME,SHOGUN_FRAME,CAIRN_FRAME,FREE_HAND_COUNTER});
let planVolley=window.IRON_VOW_SIM.createVolleyPlanner({hitChance,dodgeChance,activeShield,targetParts,attackBudget,ruleRandom:()=>ruleRandom(),chargedLimbShot});
function shotContacts(w,profile,rounds,impacts){
 const spread=w.scatter?(reducedMotion?.021:.046):0;
 const contacts=(rounds.length>1?rounds:profile.beats.map(()=>rounds[0])).map(({part,hit,critical},index)=>({
  part,hit,critical,index,amount:0,travel:profile.travel+index*spread,
  at:profile.travel+index*spread+(profile.beats[index]??0)
 }));
 // Spread each part's already-rounded damage over its own contacts.
 for(const {part,amount} of impacts){
  const hits=contacts.filter(contact=>contact.hit&&contact.part===part);
  const weight=contact=>roundWeight(contact,rounds.length);
  const total=hits.reduce((sum,contact)=>sum+weight(contact),0);
  let assigned=0, cumulative=0;
  for(const contact of hits){
   cumulative+=weight(contact);
   const next=Math.round(amount*cumulative/total);
   contact.amount=next-assigned;assigned=next;
  }
 }
 return contacts;
}
function displayedAttackOdds(a,t,w){
 const odds=hitOdds(hitChance(a,t,shotPart(a,w,false),w),dodgeChance(t));
 return {hit:Math.round(odds.hit*100),crit:Math.round(odds.crit*100)};
}
function attackPreview(a,t,w){
 // Nobody aims: a normal shot is rolled against the body, and each landed round then rolls its own location.
 const {hit,crit}=displayedAttackOdds(a,t,w),multi=shotsPerAttack(w)>1;
 const damage=attackBudget(a,t,shotPart(a,w,false),w);
 const odds=hit+'%'+(w.scatter?' SHELL':multi?'/ROUND':' HIT');
 return odds+(crit?' · '+crit+'% CRIT'+(multi?'/ROUND':''):'')+' · '+damage+(w.scatter?' SPREAD':crit?' BASE DMG':' DMG');
}
function barrageTarget(u){
 const lock=u.mechState?.lock;
 if(!lock||lock.turn>=battle.turn)return null;
 return battle.units.find(t=>t.alive&&t.team!==u.team&&t.x===lock.x&&t.z===lock.z)??null;
}
function barrageStatus(u,t,w){
 if(!hasMechSkill(u,CITADEL_FRAME)||!launchesMissiles(w))return '';
 if(u.mechState?.lock?.turn===battle.turn)return 'BARRAGE NEXT ROUND';
 const marked=barrageTarget(u);
 if(marked&&distance(u,marked)<=combatRange(u,marked,w))return marked===t?'':'FIRE AT MARKER';
 return 'MARK TILE';
}
function addLog(s){battle.log.push(s);battle.log=battle.log.slice(-4)}
const HEALTH_ROWS=[['body'],['left','right'],['legs','pilot']];
const HULL_HEALTH_ROWS=[HEALTH_ROWS[0]];
const HEALTH_LABEL={body:'BODY',left:'L ARM',right:'R ARM',legs:'LEGS',pilot:'PILOT'};
const HEALTH_COLORS={sound:'#9cddd5',low:'#ffcc83',down:'#f7a69a'};
const healthRows=u=>u?.kind?HULL_HEALTH_ROWS:HEALTH_ROWS;
const healthTone=ratio=>ratio===0?'down':ratio<.4?'low':'sound';
function targetHealthMarkup(target){
 const rows=healthRows(target).map(row=>`<div class="hp-row">${row.map(part=>{
  const hp=target?.hp[part],max=target?.max[part],ratio=target?clamp01(hp/max):0;
  const tone=target?healthTone(ratio):'sound';
  const partName=part==='right'?'RIGHT ARM':PART_LABEL[part];
  const title=target?`${partName} ${hp} / ${max} HP`:partName;
  return `<div class="part-health" data-part="${part}" data-health="${tone}" style="--part-hp:${100*ratio}%;--hp-ink:${HEALTH_COLORS[tone]}" role="group" aria-label="${title}" title="${title}"><span>${HEALTH_LABEL[part]}</span><b>${target?hp+'/'+max:'—'}</b></div>`;
 }).join('')}</div>`).join('');
 return `<div class="parts" role="group" aria-label="Subsystem health">${rows}</div>`;
}
function renderBattle(){
  moveTap=null;
  nav();const u=current(),under=hover&&battle.units.find(t=>t.alive&&t.team==='enemy'&&t.x===hover.x&&t.z===hover.z),target=under||battle.units.find(t=>t.alive&&t.id===lockedTarget)||battle.units.find(t=>t.alive&&t.team==='enemy');
  const targetReaction=reactionStatus(target),counter=target&&u?reactionWeapon(target,u):null;
  const counterStatus=counter?'READY / '+(counter===FREE_HAND_COUNTER?'FREE HAND':counter.melee?'MELEE':'RANGED'):
   targetReaction==='READY'?'OUT OF REACH':targetReaction;
  const targetShield=activeShield(target);
  const targetStatus=[target?.frame===REAVER_FRAME?FRAMES[REAVER_FRAME].role:'',targetShield?'SHIELD':'',target?.blackout?'JAMMED':'',target?.painted?'PAINTED ×'+target.painted.shots:''].filter(Boolean).join(' · ');
  battlefieldReady=window.IronVowScene?.ready!==false;
  battlefieldLoadFailed=Boolean(window.IronVowScene?.loadFailed);
  const ready=battle.phase==='player'&&!battle.busy&&battlefieldReady,canMove=Boolean(u&&movementLimit(u)),canFire=canUseWeapon(u,selectedWeapon(u,'fire')),canStrike=canUseWeapon(u,selectedWeapon(u,'strike')),chosen=selectedWeapon(u,action,target)||selectedWeapon(u,'fire',target);
  const obstruction=u&&target?attackObstruction(u,target,chosen):'';
  const inRange=Boolean(u&&target&&distance(u,target)<=combatRange(u,target,chosen));
  const elevationAim=inRange?highGroundAim(u,target,chosen):0;
  const shotStatus=obstruction||(!inRange?'OUT OF RANGE':
   [elevationAim?'HIGH GROUND +'+Math.round(elevationAim*100)+' AIM':'',launchesMissiles(chosen)&&ridgeBlocks(u,target)?'ARC OVER RIDGE':'',inCover(target)&&!chosen.melee&&!launchesMissiles(chosen)?'COVER':''].filter(Boolean).join(' · ')||'IN RANGE');
  const barrage=u&&target?barrageStatus(u,target,chosen):'';
  const shotPreview=inRange&&!obstruction?(barrage||attackPreview(u,target,chosen)+(targetShield?' → LEFT ARM':'')):'';
  const contacts=battle.units.filter(t=>t.team==='enemy'&&t.alive).length;
  const missile=shoulderWeapon(u),canMissile=canUseWeapon(u,missile);
  const lionLoadout=battle.lionTrial?`<div class="lion-trial-loadout" role="group" aria-label="Lion trial weapon">
   ${LION_TRIAL_WEAPONS.map(id=>`<button type="button" data-lion-weapon="${id}" aria-pressed="${u?.melee===id}" ${battle.busy?'disabled':''}>${weapon(id).name}</button>`).join('')}
  </div>`:'';
  const jetButton=FRAMES[u?.frame]?.jumpjet||hasMechSkill(u,AERO_FRAME)?`<button id="jumpjet" class="${action==='jumpjet'?'active':''}" aria-pressed="${action==='jumpjet'}" aria-label="${u.jumpjetUsed?'Jumpjet used':'Jumpjet'}" title="${JUMPJET_HELP}" ${ready&&canJumpjet(u)?'':'disabled'}>${icon('lightning')}<span>JUMPJET <span class="key-hint">${u.jumpjetUsed?'USED':JUMPJET_AP+' AP'}</span></span></button>`:'';
  const warControls=benchWar?`<button type="button" class="icon" id="run-war" ${battle.busy||window.__bench.running?'disabled':''}>RUN WAR</button><button type="button" class="icon" id="war-report">REPORT</button><a class="icon" href="?bench=rig">RIG BENCH</a>`:'';
  $('#ui').innerHTML=`<div class="battle-top"><h2>${battle.contract.name}</h2><p>${battle.lionTrial?'PRACTICE RANGE':contacts+' '+(contacts===1?'HOSTILE':'HOSTILES')}</p><div class="battle-links">${warControls}<button class="icon" id="manual" ${battle.busy?'disabled':''}>JOURNAL</button><button class="icon" id="withdraw" ${battle.busy?'disabled':''}>${battle.lionTrial?'EXIT TRIAL':'WITHDRAW'}</button></div>${lionLoadout}</div>
  ${tacticalMapMarkup()}
  <div class="turn">ROUND ${battle.turn} <small>${battle.phase==='player'?'YOUR TURN':'ENEMY TURN'}</small></div>
  <button class="target-toggle" id="target-toggle" aria-expanded="${targetPanelOpen}" aria-controls="target-panel">
   ${icon('crosshair')}<span><strong>${target?.name||'NO TARGET'}</strong><small>${shotPreview?shotStatus+' · '+shotPreview:shotStatus}<span class="target-detail-label">DETAILS</span></small></span>
  </button>
  <aside class="combatpanel" id="target-panel" aria-label="Target subsystem details">
   <div class="inspect-head">
    ${target?`<div class="combat-target"><img class="${target.kind?'vehicle-target':'enemy foundry-target'}" data-target-id="${target.id}" alt="Target ${target.name}"></div>`:''}
    <div class="target-name"><h3>${target?.name||'NO TARGET'}</h3>${targetStatus?`<span class="combat-status">${targetStatus}</span>`:''}</div>
    <button class="icon close-target" id="close-target" aria-label="Close target details">${icon('x')}</button>
   </div>
   ${targetHealthMarkup(target)}
   ${u&&target?`<div class="shot-readout"><b>${shotPreview||shotStatus}</b>${shotPreview&&shotStatus!=='IN RANGE'?`<small>${shotStatus}</small>`:''}</div>`:''}
   ${target&&!target.kind?`<div class="reaction-row"><span class="note reaction-status">${icon('arrow-u-up-left')} COUNTER ${counterStatus}</span>${infoTip('target counterattack',COUNTER_HELP)}</div>`:''}
  </aside>
  <div class="log">${battle.log.slice(-2).map(l=>'<div class="log-line">'+l+'</div>').join('')}</div>
  <div class="hint"><span id="field-hint">${battlefieldLoadFailed?'BATTLEFIELD MODEL FAILED TO LOAD':!window.IronVowScene?.ready?'LOADING BATTLEFIELD':battle.busy?'RESOLVING':action==='jumpjet'?'PICK LANDING':action==='move'?(u?freeMovement(u)+' FREE MOVE'+(extraMovement(u)?' · +1 TILE / '+EXTRA_MOVE_AP+' AP':''):'SELECT MECH'):chosen?chosen.name+' · '+paidAttackAP(u,chosen)+' AP'+(chargedLimbShot(u,chosen,'body',false)?' · CHARGED':''):'SELECT MECH'}</span><div id="move-preview" class="move-preview" role="status" hidden></div></div>
  <div class="battle-bottom"><div class="unitbuttons">${battle.units.filter(t=>t.team==='ally').map(t=>`<button data-unit="${t.index}" class="${t.index===selected?'active':''} ${spent(t)?'spent':''}" ${!t.alive||spent(t)||battle.busy?'disabled':''}>${pilotMark(t.pilot,'pilot-thumb')}<span><b>${t.name}</b><small>${t.alive?(spent(t)?'SPENT / ':t.ap+' AP / '+freeMovement(t)+' MOVE<br>')+'REACTION '+reactionStatus(t)+(equippedShield(t)?'<br><strong class="shield-status">SHIELD '+(activeShield(t)?t.hp.left+'/'+t.max.left+' ARM HP':'ARM LOST')+'</strong>':'')+(t.order||t.breach?'<br><strong class="unit-status">'+[t.order?'ORDERED':'',t.breach?'CHARGE ×'+t.breach:''].filter(Boolean).join(' / ')+'</strong>':''):t.downReason==='pilot'?'PILOT DOWN':'DISABLED'}</small></span></button>`).join('')}</div><div class="actionbuttons"><button id="move" class="${action==='move'?'active':''}" ${!u||!ready||!canMove?'disabled':''}>${icon('arrows-out-cardinal')}<span>MOVE <span class="key-hint">M</span></span></button>${jetButton}<button id="fire" class="${action==='fire'?'active':''}" ${!u||!ready||!canFire?'disabled':''}>${icon('crosshair')}<span>FIRE <span class="key-hint">F</span></span></button><button id="strike" class="${action==='strike'?'active':''}" ${!ready||!canStrike?'disabled':''}>${icon('crosshair')}<span>STRIKE <span class="key-hint">X</span></span></button>${missile?`<button id="missile" class="${action==='missile'?'active':''}" ${!ready||!canMissile?'disabled':''} title="${missile.name}">${icon('crosshair')}<span>MISSILE</span></button>`:''}<button id="skill" aria-label="${u?CREW[u.pilot].skill:'Pilot skill'}" title="${u?skillDescription(u.pilot,u.training):''}" ${!u||spent(u)||u.skill||!ready||u.ap<skillCost(u.pilot,u.training)||(targetedSkill(u.pilot)&&!supportTargets(u).length)||(u.pilot===SAPPER&&u.hp.right<=0)||(u.pilot===2&&u.hp.body===u.max.body&&!repairableLimbs(u).length)?'disabled':''}>${icon('lightning')}<span>${u?['OVERDRIVE','DEADEYE','REPAIR','PAINT','RELAY','CHARGE','BLACKOUT','RECOVER'][u.pilot]:'SKILL'} <span class="key-hint">Q</span></span></button><button id="brace" title="Brace: ${braceCost(u?.training)} AP, blocks ${Math.round(braceReduction(u?.training)*100)}% damage" ${!u||u.ap<braceCost(u.training)||u.brace||!ready?'disabled':''}>${icon('shield-chevron')}<span>BRACE <span class="key-hint">/ ${braceCost(u?.training)} AP</span></span></button><button id="end" class="primary" ${battle.busy||window.IronVowScene?.ready===false?'disabled':''}>END TURN</button></div></div>`;
  window.IronVowMenus?.combatLayout($('#ui'));
  refreshTargetPortrait();
  bindTacticalMap();
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{if(!battle.busy)selectUnit(+b.dataset.unit)});
  $('#move').onclick=()=>{if(canMove){action='move';renderBattle();persist()}};$('#fire').onclick=()=>{action='fire';renderBattle();persist()};$('#strike').onclick=()=>{if(canStrike){action='strike';renderBattle();persist()}};$('#skill').onclick=skill;
  if(jetButton)$('#jumpjet').onclick=()=>{if(canJumpjet(u)){action=action==='jumpjet'?'move':'jumpjet';targetPanelOpen=false;hover=null;renderBattle()}};
  if(missile)$('#missile').onclick=()=>{if(canMissile){action='missile';renderBattle();persist()}};
  $('#brace').onclick=()=>{if(u&&u.ap>=braceCost(u.training)&&!u.brace&&!battle.busy){startAction(u);u.ap-=braceCost(u.training);braceUnit(u);addLog(u.name+' braced for incoming fire.');focusNextReady();renderBattle();persist()}};
  $('#end').onclick=endTurn;$('#manual').onclick=()=>guide();$('#target-toggle').onclick=()=>{targetPanelOpen=!targetPanelOpen;renderBattle();if(targetPanelOpen)$('#close-target').focus()};$('#close-target').onclick=()=>{targetPanelOpen=false;renderBattle();$('#target-toggle').focus()};
  if(benchWar){
   $('#run-war').onclick=()=>{
    const run=window.__bench.run();renderBattle();
    run.catch(error=>toast(error.message)).finally(()=>{if(battle)renderBattle();});
   };
   $('#war-report').onclick=showWarReport;
  }
  $('#withdraw').onclick=()=>{if(battle.busy)return;if(battle.lionTrial){window.location.href='?bench=rig&frame=lion';return}modal('BREAK CONTACT?','<p>Withdraw your lance. You retain earned experience, but forfeit payment and salvage. Combat damage persists.</p>',[{text:'STAY & FIGHT',fn:closeModal},{text:'WITHDRAW',fn:()=>{closeModal();finish(false)}}])};
  if(battle.lionTrial){
   $('#end').textContent='RESET TARGET';
   for(const button of document.querySelectorAll('[data-lion-weapon]'))
    button.onclick=()=>startLionTrial(button.dataset.lionWeapon);
  }
}
function braceUnit(u){
 if(u.brace)return;
 u.brace=true;u.braceTime=clock;
 if(!u.kind)gaitSound(u,'arm',0);
}
function repairableLimbs(u){
 if(!u.training?.limbRepair)return [];
 const parts=['right','left','legs'].filter(part=>u.hp[part]<u.max[part]);
 if(u.training.repairAll)return parts;
 return parts.sort((a,b)=>u.hp[a]/u.max[a]-u.hp[b]/u.max[b]).slice(0,1);
}
function fieldRepair(u,limbs=repairableLimbs(u)){
 let restored=Math.min(repairAmount(u.training),u.max.body-u.hp.body);u.hp.body+=restored;
 for(const part of limbs){const amount=Math.min(u.training.limbRepair,u.max[part]-u.hp[part]);u.hp[part]+=amount;restored+=amount}
 if(u.training?.repairBrace)braceUnit(u);
 effects.push({type:'heal',x:u.x,z:u.z,t:1,text:'+'+restored+' REPAIR'});
}
function skillCost(kind,training){
 if(kind===RETRIEVER)return 2;
 return Number(kind===SAPPER||kind===SIGNAL&&!training?.blackoutFree||kind===4&&!training?.relayFree);
}
const hostileSkill=kind=>kind===3||kind===SIGNAL;
const targetedSkill=kind=>kind>=3&&kind!==SAPPER;
function recoveryParts(target,training){
 const parts=['right','left','legs'].filter(part=>target.hp[part]<target.max[part]);
 return training?.recoveryAll?parts:parts.sort((a,b)=>target.hp[a]/target.max[a]-target.hp[b]/target.max[b]).slice(0,1);
}
function recoverLimbs(target,training){
 let restored=0;
 for(const part of recoveryParts(target,training)){
  const before=target.hp[part],floor=Math.ceil(target.max[part]*(training?.recoveryFloor??0));
  target.hp[part]=Math.min(target.max[part],Math.max(floor,before+(training?.recoveryHP??30)));
  restored+=target.hp[part]-before;
 }
 if(training?.recoveryBrace)braceUnit(target);
 effects.push({type:'heal',x:target.x,z:target.z,t:1,text:'+'+restored+' REPAIR'});
}
function supportTargets(u){
 const kind=u.pilot,t=u.training,team=hostileSkill(kind)?'enemy':'ally';
 const range=kind===RETRIEVER?recoveryRange(t):kind===SIGNAL?6+(t?.blackoutRange??0):kind===3?6+(t?.paintRange??0):5+(t?.relayRange??0);
 return battle.units.filter(target=>target.alive&&target.team===team&&distance(u,target)<=range&&
  (kind===RETRIEVER?recoveryParts(target,t).length>0:target!==u));
}
function useSupportSkill(u,target){
 if(!battle||battle.busy||!u||u!==current()||!targetedSkill(u.pilot)||u.skill||u.ap<skillCost(u.pilot,u.training)||!supportTargets(u).includes(target))return false;
 const t=u.training,kind=u.pilot;
 u.ap-=skillCost(kind,t);
 if(kind===3){
  if(!t?.paintMove)startAction(u);
  target.painted={shots:t?.paintShots??1,aim:(20+(t?.paintAim?10:0))/100,power:t?.paintPower??0};
  if(t?.paintBrace)braceUnit(u);
 }else if(kind===4){
  if(!t?.relayMove)startAction(u);
  target.order={shots:t?.relayShots??1,discount:t?.relayDiscount??2,aim:t?.relayAim??0,power:t?.relayPower??0,keepMove:!!t?.relayKeepMove};
  if(t?.relayBrace)braceUnit(target);
 }else if(kind===SIGNAL){
  if(!t?.blackoutMove)startAction(u);
  target.blackout={aim:t?.blackoutAim??.20,ap:t?.blackoutAP??0,hold:!!t?.blackoutHold};
  if(t?.blackoutBrace)braceUnit(u);
 }else{
  if(!t?.recoveryMove)startAction(u);
  recoverLimbs(target,t);
  u.recoveryUsed=(u.recoveryUsed??0)+1;
 }
 u.skill=kind!==RETRIEVER||u.recoveryUsed>=recoveryUses(t);u.skillTime=clock;
 const verb=kind===3?' painted ':kind===4?' ordered ':kind===SIGNAL?' jammed ':' recovered ';
 addLog(CREW[kind].call+verb+target.name+'.');
 closeModal();sound('click');renderBattle();persist();return true;
}
function chooseSupportTarget(u){
 const kind=u.pilot,targets=supportTargets(u),pilot=CREW[kind];
 if(!targets.length){toast(kind===RETRIEVER?'No damaged limbs in Recovery Rig range.':'No target in '+pilot.skill+' range.');return}
 modal(pilot.skill.toUpperCase(),`<div class="stat-heading"><span class="eyebrow">${skillCost(kind,u.training)} AP / SELECT ${hostileSkill(kind)?'HOSTILE':'ALLY'}</span>${infoTip(pilot.skill,skillDescription(kind,u.training))}</div>
  <div class="seat-choices">${targets.map((target,i)=>`<button type="button" data-support-target="${i}"><b>${target.name}${target===u?' · SELF':''}</b><small>${distance(u,target)} tiles away${kind===4?' · '+target.ap+' AP':kind===RETRIEVER?' · '+recoveryParts(target,u.training).map(part=>PART_LABEL[part]).join(' / '):''}</small></button>`).join('')}</div>`,[{text:'CANCEL',fn:closeModal}]);
 for(const button of document.querySelectorAll('[data-support-target]'))button.onclick=()=>useSupportSkill(u,targets[Number(button.dataset.supportTarget)]);
}
function skill(){
 const u=current();if(!u||u.skill||battle.busy||spent(u)||u.ap<skillCost(u.pilot,u.training))return;
 if(targetedSkill(u.pilot)){chooseSupportTarget(u);return}
 if(u.pilot===SAPPER&&u.hp.right<=0){toast('Repair the weapon arm to prime Breach Charge.');return}
 const limbs=u.pilot===2?repairableLimbs(u):[];
 if(u.pilot===2&&u.hp.body===u.max.body&&!limbs.length){toast('No repairable damage. Save this skill for later.');return}
 if(!u.training?.overdriveMove&&!u.training?.breachMove)startAction(u);
 u.skill=true;u.skillTime=clock;effects.push({type:'skill',kind:u.pilot,x:u.x,z:u.z,t:1});
 if(u.pilot===0){u.ap+=overdriveAP(u.training);if(u.training?.overdriveBrace)braceUnit(u)}
 if(u.pilot===1)u.boost=true;
 if(u.pilot===2)fieldRepair(u,limbs);
 if(u.pilot===SAPPER){u.ap-=skillCost(u.pilot,u.training);u.breach=u.training?.breachShots??1;if(u.training?.breachBrace)braceUnit(u)}
 addLog(CREW[u.pilot].call+' activated '+CREW[u.pilot].skill+'.');sound('click');renderBattle();persist();
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function useJumpjet(u,x,z){
 if(!jumpjetLanding(u,x,z))return false;
 u.jumpjetUsed=true;
 u.ap-=JUMPJET_AP;
 const fromX=u.x,fromZ=u.z;
 if(u.mechSkills)mechState(u).moved=(u.mechState.moved??0)+distance(u,{x,z});
 const turning=turnToward(u,x-fromX,z-fromZ);
 if(turning)await turning;
 const duration=reducedMotion?.12:.70;
 u.x=x;u.z=z;
 u.motion={fromX,fromZ,toX:x,toZ:z,start:clock,duration,jumpjet:true,gaitBase:0,stepIndex:0,totalSteps:1};
 sound('hydraulic',.95);
 await delay(duration*1000);
 u.vx=x;u.vz=z;u.motion=null;u.landTime=clock;
 if(!reducedMotion)effects.push({type:'step',x,z,t:1,mass:.95});
 sound('step',.85);
 addLog(u.name+' used Jumpjet.');
 return true;
}
async function moveUnit(u,x,z){
 const steps=route(u,x,z);
 if(!steps.length)return;
 spendMovement(u,steps.length);
 const twoStep=!u.kind&&!reducedMotion;
 // Playback is separate from the gait's authored time, stride and mass.
 const playbackRate=twoStep&&!u.lionTrial?3:1;
 const duration=reducedMotion?.12:u.kind?VEHICLES[u.kind].step:walkTileDuration(u)/playbackRate;
 const gaitBase=u.walkCount||0;
 const segments=[];
 if(twoStep){
  let fromX=u.x,fromZ=u.z;
  for(let i=0;i<steps.length;){
   const dx=steps[i].x-fromX,dz=steps[i].z-fromZ;
   let end=i+1;
   while(end<steps.length&&steps[end].x-steps[end-1].x===dx&&steps[end].z-steps[end-1].z===dz)end++;
   const length=end-i;
   for(let step=i;step<end;step++)segments[step]={index:step-i,length};
   fromX=steps[end-1].x;fromZ=steps[end-1].z;i=end;
  }
 }
 for(let i=0;i<steps.length;i++){
  const p=steps[i],fromX=u.x,fromZ=u.z;
  const turning=turnToward(u,p.x-fromX,p.z-fromZ);if(turning)await turning;
  u.x=p.x;u.z=p.z;u.motion={fromX,fromZ,toX:p.x,toZ:p.z,start:clock,duration,playbackRate,gaitBase:gaitBase+i,stepIndex:i,totalSteps:steps.length,segment:segments[i]};
  if(twoStep)u.motion.stepBeats=0;
  if(u.kind)sound(u.kind==='tank'?'track':'rotor');
  else{
   u.motion.gaitCues=walkSoundMarkers(u.motion,twoStep);
   advanceGaitCues(u,0);
  }
  await delay(duration*1000);
  if(twoStep)twoStepContacts(u,1);
  advanceGaitCues(u,1);
  u.vx=p.x;u.vz=p.z;u.motion=null;
  if(!twoStep||segments[i].index===segments[i].length-1)u.landTime=clock;
  if(!twoStep&&!u.kind)effects.push({type:'step',x:p.x,z:p.z,t:1,mass:MECH_MOTION[u.frame].mass,side:FRAMES[u.frame].native?-1:(gaitBase+i)%2?1:-1});
 }
 u.walkCount=gaitBase+steps.length;
}
async function shoot(a,t,part,w=unitWeapon(a),reaction=false,sequence){
 window.IronVowScene?.aimAt(a,t,part);
 if(t.kind)part='body';
 if(attackObstruction(a,t,w))return;
 const ownsCamera=sequence===undefined&&!reaction;
 if(ownsCamera)sequence=beginAttackCamera(a,t,w,part);
 try{
 if(sequence&&!sequence.skipped){
  Object.assign(sequence,{actor:a,target:t,w,part,reaction,phase:'aim',result:'',resultAt:null,fireAt:null,contacts:null,contact:null});
  if(reaction)$('#shot-status').textContent=a.name+(w.melee?' prepares a return strike.':' prepares to return fire.');
 }
 const profile=attackProfile(a,w.id),power=profile.power,effectKind=profile.effect||w.id,rockets=effectKind==='missile';
 const weaponVoice=a.kind==='tank'?'javelin':a.kind==='helicopter'?'kite':w.id;
 const shotPan=()=>combatAudioPan(a,sequence,(a.face||1)*-.23);
 const hitPan=()=>combatAudioPan(t,sequence,(a.face||1)*.24);
 const braceMass=Math.min(1.24,.64+(MECH_MOTION[a.frame]?.mass??1)*.35);
 const braceRate=1.10/braceMass;
 if(!muted&&gunBankLoad)await gunBankLoad;
 const aeroStrike=a.frame===AERO_FRAME&&AERO_MELEE.includes(w.id);
 const lionStrike=a.lionTrial&&LION_TRIAL_WEAPONS.includes(w.id);
 const {paid,charged}=spendAttack(a,w,part,reaction);
 const turning=turnToward(a,t.x-a.x,t.z-a.z,sequence);if(turning)await turning;
 const shoulder=launcherId(w.id)&&w.id!=='locust',clip=w.melee?'strike':'fire';
 const plantedCleaver=breachLoadout(a.frame)&&w.id==='cleaver';
 const native=!lionStrike&&!shoulder&&!a.kind&&FRAMES[a.frame].native?NATIVE_ATTACK_TIMING[clip]:null;
 const plantedBastion=a.brace&&bastionRig(a);
 const plantedWarden=a.brace&&a.hp.legs>0&&a.frame===0&&a.team==='ally';
 const braceTimeLeft=Math.max(0,WARDEN_BRACE_DURATION-(clock-(a.braceTime??-100)));
 // Under the attack camera the step-up and the raised-gun hold get a readable beat (CINEMATIC_PACE); field and reaction fire keep theirs.
 const paced=Boolean(sequence&&!sequence.skipped&&!reaction&&!reducedMotion);
 const basePrime=!lionStrike&&!aeroStrike&&!w.scout&&!power&&!plantedCleaver&&!a.kind&&a.hp.legs>0&&!reducedMotion?
  (plantedWarden?braceTimeLeft:plantedBastion?Math.max(0,1.22-(clock-(a.braceTime??-100))):reaction?.40:ATTACK_STEP.duration):0;
 const primeDuration=basePrime*(paced?CINEMATIC_PACE.step:1);
 const cameraWindup=!lionStrike&&!aeroStrike&&!w.scout&&!power&&sequence&&!reaction;
 const aimHold=paced&&!native&&cameraWindup?CINEMATIC_PACE.aimHold:0;
 const windup=reducedMotion?.06:native?native.cue*native.duration:profile.raise+(cameraWindup?(basePrime?.12:.51):0)+aimHold;
 const raise=primeDuration+windup;
 a.attack={kind:w.id,start:clock,fireAt:null,releaseAt:null,primeDuration,windup,native:native?{...native,clip}:null,
  ...(power?{stage:'pullback'}:{})};
 if(primeDuration&&!sequence?.skipped)sound('braceLift',braceMass,{pan:shotPan(),rate:braceRate});
 if(primeDuration){
  await waitAttack(primeDuration*1000,sequence);
  if(!sequence?.skipped){
   effects.push({type:'step',actor:a.id,x:a.x,z:a.z,t:1,mass:MECH_MOTION[a.frame].mass,attackPlant:true});
   sound('bracePlant',braceMass,{pan:shotPan(),rate:braceRate});
   sound('weaponLock',braceMass,{pan:shotPan(),rate:braceRate});
  }
 }
 const armTime=rockets?Math.min(windup,.28):0;
 if(armTime){
  if(windup>armTime)await waitAttack((windup-armTime)*1000,sequence);
  if(!sequence?.skipped)sound('missileArm',windup<.28?.55:1,{pan:shotPan()});
 }
 if(profile.charge&&!reducedMotion&&!sequence?.skipped){
  sound('parallax-charge',1,{pan:shotPan()});
  if(sequence)$('#shot-status').textContent=a.name+' charges the Parallax.';
 }
 if(power&&!reducedMotion){
  if(!sequence?.skipped)sound('hydraulic',1.2);
  const pull=windup*.68;
  await waitAttack(pull*1000,sequence);
  a.attack.stage='charge';
  if(!sequence?.skipped){sound('prime',1.26);if(sequence)$('#shot-status').textContent=a.name+' stores energy for '+w.name+'.';}
  await waitAttack((windup-pull)*1000,sequence);
 }else await waitAttack((armTime||windup)*1000,sequence);
 a.fireTime=clock;a.attack.fireAt=clock;
 if(power)a.attack.stage='release';
 if(sequence){sequence.phase='fire';sequence.fireAt=clock}
 const {rounds,impacts,landed,dodged,guard}=planVolley(a,t,part,w,reaction);
 const contacts=shotContacts(w,profile,rounds,impacts),flight=contacts.at(-1).at;
 if(sequence)sequence.contacts=contacts;
 recordVolley(a,t,w,reaction,guard);
 const hit=landed>0,actual=impacts.find(impact=>impact.part===part)?.part??impacts[0]?.part??part;
 if(sequence&&guard)sequence.part='shield';
 // A volley that misses entirely is telegraphed on the defender (Front Mission 3): it sidesteps a dodge, or ducks and twists under a
 // plain miss, timed so the rounds pass where it stood. Display only: the unit's tile and every rule stay unchanged.
 if(!hit&&!sequence?.skipped)beginEvade(t,a,dodged,clock+Math.max(0,contacts[0].at-EVADE.lead));
 const impact=freezeAttachment(t,guard?'shield':actual);
 if(!hit){impact.ox+=.55*(a.face||1);impact.oy-=.38}
 const anchors=new Map();
 const projectiles=contacts.map(({part:targetPart,hit:connected},index)=>{
  const key=connected&&guard?'shield':targetPart;
  if(!anchors.has(key))anchors.set(key,freezeAttachment(t,key));
  const p=anchors.get(key);
  return connected?p:{...p,ox:p.ox+(.55+.06*(index%4))*(a.face||1),oy:p.oy-(.22+.09*(index%5))};
 });
 if(!sequence?.skipped)effects.push({type:'shot',actor:a.id,target:t.id,part:actual,kind:w.id,x:a.x,z:a.z,tx:t.x,tz:t.z,t:1,born:clock,life:flight+.12,origins:[],impact,projectiles,contacts});
 const shots=profile.beats.map((at,index)=>({at,index,report:true}));
 const timeline=[...shots,...contacts].sort((x,y)=>x.at-y.at);
 if(aeroStrike&&!reducedMotion&&a.hp.legs>0){
  const plant=Math.max(0,Math.min(flight,(profile.raise+profile.travel)*(.59/.70)-profile.raise));
  timeline.splice(1,0,{at:plant,plant:true});
 }
 const disabled=[];
 let d=0,lost=0,last=0;
 const hitX=(t.x-t.z)-(a.x-a.z),hitY=((t.x+t.z)-(a.x+a.z))*.5,hitLength=Math.hypot(hitX,hitY)||1;
 for(const event of timeline){
  if(event.at>last)await waitAttack((event.at-last)*1000,sequence);
  last=event.at;
  const rate=[1,.956,1.027,.981][event.index%4];
  if(event.report){
   if(sequence?.skipped)continue;
   window.IronVowScene?.combat?.launch(a,t,w,event.index,contacts,guard);
   if(profile.melee)sound(power?.sound||weaponMotion(w.id));
   else sound('gunReport',event.index?.93:1,{weaponVoice,
    rate:rockets?(event.index?.90:1):rate,travel:profile.travel,lastReport:event.index===profile.beats.length-1,
    pan:rockets?shotPan()+(event.index%2?.12:-.12):shotPan()});
   continue;
  }
  if(event.plant){
   if(!sequence?.skipped){
    effects.push({type:'step',actor:a.id,x:a.x,z:a.z,t:1,mass:MECH_MOTION[a.frame].mass,attackPlant:true});
    sound('step',MECH_MOTION[a.frame].mass);
   }
   continue;
  }
  if(sequence)sequence.contact=event;
  if(rockets&&!sequence?.skipped)sound(event.hit?'missileImpact':'groundBlast',event.index?.83:.71,{pan:hitPan()});
  if(!event.hit)continue;
  const broken=applyImpact(t,event);
  if(!sequence?.skipped)window.IronVowScene?.combat?.landed(a,t,w,event,guard);
  d+=event.amount;lost+=event.damage;
  if(broken)disabled.push(event.part);
  t.hitTime=clock;t.hitPart=event.part;t.hitParts=[event.part];t.hitDamage=event.damage;
  t.hitVector={x:hitX/hitLength,y:hitY/hitLength};
  if(sequence?.skipped)continue;
  const light=Boolean(w.burst);
  effects.push({type:'boom',target:t.id,part:event.part,x:t.x,z:t.z,t:1,light,broken,big:Boolean(power&&!reducedMotion),
   ...(guard?{shieldImpact:impact}:{})});
  shake=Math.max(shake,power?.shake??(broken?6:light?2.8:4));
  if(broken&&limbPart(event.part))sound('partFailure',.85,{part:guard?'shield':event.part,pan:hitPan()});
  if(!rockets){
   const heavy=profile.melee||!light&&['rail','rampart','shotgun'].includes(effectKind);
   sound(guard?'shieldImpact':heavy?'heavyImpact':'armorImpact',light?(broken?.94:w.scatter?.57:.83):1,{weaponVoice,material:t.kind,rate,pan:hitPan()});
  }
 }
 a.attack.releaseAt=clock;
 if(power)a.attack.stage='impact';
 if(sequence){sequence.phase='result';sequence.resultAt=clock;}
 let jammed=false,keepBoost=false;
 if(!hit){
  const result=dodged?'DODGE':'MISS';
  if(sequence)sequence.result=result;
  effects.push({type:'text',x:t.x,z:t.z,t:1,text:result});
  addLog(dodged?t.name+' dodged '+a.name+'’s attack.':a.name+' missed '+t.name+'.');
 }else{
  const label=guard?'SHIELD / LEFT ARM':t.kind?'HULL':PART_LABEL[actual];
  const failsafe=disabled.includes('body')&&t.training?.repairFailsafe&&!t.skill;
  if(failsafe){t.skill=true;t.skillTime=clock;fieldRepair(t)}
  const broken=guard&&t.hp.left===0;
  const crits=rounds.filter(round=>round.critical).length;
  const critLabel=crits?(rounds.length>1?' · '+crits+' CRIT':' · CRIT'):'';
  const volleyText=landed+'/'+rounds.length+(w.scatter?' PELLETS':' HITS')+' / −'+lost+' HP';
  if(sequence)sequence.result=(broken?'SHIELD ARM LOST':guard?'BLOCKED · −'+d+' LEFT ARM':failsafe?'FAILSAFE':t.hp.body<=0?'TARGET DOWN':t.hp.pilot===0?'PILOT DOWN':disabled.length?'SYSTEM DISABLED':rounds.length>1?volleyText:'−'+d+' '+label)+critLabel;
  effects.push({type:'text',x:t.x,z:t.z,t:1,text:(broken?'SHIELD ARM LOST':guard?'BLOCK · −'+d:rounds.length>1?volleyText:'−'+d+' '+label)+critLabel});
  const report=w.burst&&!guard?impacts.map(({part,amount})=>(t.kind?'HULL':PART_LABEL[part])+' −'+amount).join(' · '):label+' −'+d;
  addLog(a.name+(w.scout?' · '+w.name:'')+' → '+t.name+' / '+report+critLabel);
  if(failsafe)addLog(t.name+' triggered Failsafe.');
  if(!reaction&&w.melee&&a.training?.strikeBrace)braceUnit(a);
  if(t.hp.body<=0||t.hp.pilot===0){
   beginDestruction(t,t.hp.body>0?'pilot':'body',sequence);addLog(t.name+(t.downReason==='pilot'?': pilot down.': ' neutralized.'));
   if(a.team==='ally'){save.kills++;sortiePilot(a).xp+=t.kind?VEHICLES[t.kind].xp:35;recordMechKill(a,t)}
   if(!reaction){
     const refund=w.melee?(a.training?.strikeRefund??0):a.boost&&a.training?.deadeyeRefund?paid:0;
    if(refund){a.ap+=refund;addLog(a.name+' recovered '+refund+' AP.')}
   }
  }
  else if(disabled.length)addLog(t.name+(broken?': shield arm lost.':': '+disabled.map(p=>PART_LABEL[p]).join(' / ')+' destroyed.'));
   if(!reaction&&disabled.some(limbPart)){
    jammed=Boolean(a.training?.armJam&&disabled.some(p=>p==='right'||p==='left'));
    if(charged&&a.training?.breachRefund){a.ap+=paid;addLog(a.name+' recovered '+paid+' AP.')}
   keepBoost=Boolean(a.boost&&a.training?.deadeyeCascade);
  }
   if(charged)jammed=true;
 }
 recordHit(a,t,w,hit,impacts,charged,reaction);
 const hitstop=w.melee?.085:0;
 if(hit&&hitstop&&!reducedMotion&&!sequence?.skipped){
  a.hitstop=t.hitstop={at:clock,until:clock+hitstop};
  await waitAttack(hitstop*1000,sequence);
 }
 if(power){a.attack.resumeAt=clock;a.attack.stage='recovery';}
 if(sequence&&!sequence.skipped)$('#shot-status').textContent='Impact. '+sequence.result;
 a.boost=keepBoost;
 const recover=native&&!reducedMotion?Math.max(.12,native.duration-windup-flight):profile.recover;
 a.attack.returnAt=clock+recover;
 const settle=recover+(primeDuration?ATTACK_STEP.returnDuration:0);
 const recovery=t.alive?settle:reducedMotion?.35:Math.max(settle,t.kind?.84:DESTRUCTION.end*destructionPace(t));
 // The cinematic pacing lengthens the lead-in only; the result beat after the last round keeps its designed length.
 const pacedLead=primeDuration-basePrime+aimHold;
 const cinematicHold=w.scout&&t.alive?1.2-raise-flight:t.alive&&reaction?.5:(t.alive?2.43:2.66)-(raise-pacedLead)-flight;
 const hold=sequence?Math.max(recovery,cinematicHold):recovery;
 await waitAttack(hold*1000,sequence);
 if(hit&&w.melee&&hasMechSkill(a,BULWARK_FRAME)&&(a.frame!==BULWARK_FRAME||w.id==='aegis-bash')&&t.alive&&distance(a,t)===1){
  const x=2*t.x-a.x,z=2*t.z-a.z;
  if(onBoard(x,z)&&!battle.cover.has(x+','+z)&&!occupied(x,z)){t.x=t.vx=x;t.z=t.vz=z;addLog(t.name+' pushed back.')}
 }
 return jammed;
 }finally{
  a.attack=null;
  if(ownsCamera&&sequence)closeAttackCamera(sequence);
 }
}
const {reactionStatus,reactionWeapon}=window.IRON_VOW_SIM.createReactionRules({isArmed,equippedShield,counterRange,unitWeapon,distance,scoutWeapon,attackObstruction,meleeWeapon,workingWeapon,BULWARK_FRAME,ASHIGARU_FRAME,FREE_HAND_COUNTER});
const {barrageRestriction,engage:resolveExchange,spendMovement,spendAttack,recordVolley,applyImpact,recordHit,completeRound}=window.IRON_VOW_SIM.createCombatTransactions({
 getBattle:()=>battle,launchesMissiles,hasMechSkill,CITADEL_FRAME,barrageTarget,distance,combatRange,
 attackObstruction,mechState,paidAttackAP,startAction,addLog,toast,
 beginAttackCamera:(...args)=>beginAttackCamera(...args),closeAttackCamera,shoot,
 BASTION_FRAME,unitWeapon,counterRange,reactionStatus,reactionWeapon,FREE_HAND_COUNTER,braceUnit,
 freeMovement,EXTRA_MOVE_AP,chargedLimbShot,REAVER_FRAME,HELLBREAKER,roundAP,resetMovement,highGroundAim
});
function engage(attacker,defender,part,weapon){if(!attacker?.alive||!defender?.alive)return Promise.resolve(null);return resolveExchange(attacker,defender,part,weapon)}
function surrenderEligible(u,opponents){
 if(u.kind||!u.alive)return false;
 if(u.hp.body/u.max.body<=.25||u.hp.pilot/u.max.pilot<=.25)return true;
 const range=[unitWeapon(u),shoulderWeapon(u)].some(w=>w&&!w.melee&&workingWeapon(u,w));
 const strike=[meleeWeapon(u),unitWeapon(u)].find(w=>w?.melee&&workingWeapon(u,w));
 if(range)return false;
 return !strike||u.hp.legs<=0&&!opponents.some(target=>distance(u,target)===1&&!attackObstruction(u,target,strike));
}
// A saved enemy phase keeps the same roll after reload.
let captureRandom=u=>equipmentRoll([save.world?.seed??0,battle.terrainSeed??0,battle.contract.id,save.day,battle.turn,u.index,'surrender'].join('/'))/0x100000000;
function trySurrender(u,opponents){
 if(!surrenderEligible(u,opponents)||captureRandom(u)>=.30)return false;
 u.alive=false;u.surrendered=true;u.downReason='surrender';u.ap=0;
 addLog(u.name+' surrendered.');
 effects.push({type:'text',x:u.x,z:u.z,t:1,text:'SURRENDERED'});
 return true;
}
function checkEnd(){if(!battle)return true;if(!battle.units.some(u=>u.alive&&u.team==='enemy')){finish(true);return true}if(!battle.units.some(u=>u.alive&&u.team==='ally')){finish(false);return true}return false}
const {runEnemyTurn}=window.IRON_VOW_SIM.createEnemyTurn({
 getBattle:()=>battle,ROUND_AP,VANGUARD_FRAME,BULWARK_FRAME,ASHIGARU_FRAME,AERO_FRAME,CITADEL_FRAME,
 unitWeapon,targetParts,combatRange,launchesMissiles,movementLimit,isArmed,shoulderWeapon,workingWeapon,trySurrender,
 resetMovement:(u)=>resetMovement(u),renderBattle:()=>renderBattle(),
 distance:(a,b)=>distance(a,b),meleeWeapon:(u)=>meleeWeapon(u),scoutWeapon:(u,t)=>scoutWeapon(u,t),
 canUseWeapon:(u,w)=>canUseWeapon(u,w),attackObstruction:(u,t,w)=>attackObstruction(u,t,w),
 hasMechSkill:(u,frame)=>hasMechSkill(u,frame),paths:(u)=>paths(u),
 canJumpjet:(u)=>canJumpjet(u),jumpjetDestination:(u,t)=>jumpjetDestination(u,t),
 useJumpjet:(u,x,z)=>useJumpjet(u,x,z),moveUnit:(u,x,z,cost)=>moveUnit(u,x,z,cost),
 engage:(u,t,p,w)=>engage(u,t,p,w),
 checkEnd:()=>checkEnd(),addLog:(line)=>addLog(line),
});
async function endTurn(){
 if(!battle||battle.busy||careerStale)return;
 if(battle.lionTrial){startLionTrial(current()?.melee??lionTrial);return}
 if(action==='jumpjet')action='move';
 const saving=persist(true);
 targetPanelOpen=false;battle.busy=true;battle.phase='enemy';
 await saving;
 if(careerStale)return;
 if(await runEnemyTurn())return;
 if(checkEnd())return;
 completeRound();
 if(!current()||spent(current())){selected=battle.units.find(u=>u.alive&&u.team==='ally').index;focusBattleCamera(current())}
 addLog('Round '+battle.turn+'. Your lance has the initiative.');renderBattle();persist();
}
function debriefXP(pilot,kind,amount,promotions){
 const before=pilot.level;
 pilot.xp+=amount;
 while(pilot.xp>=nextLevelXP(pilot.level)){pilot.xp-=nextLevelXP(pilot.level);pilot.level++}
 if(pilot.level>before)promotions.push(CREW[kind].call+' LV '+pilot.level);
}
function settleShip(win,allies,promotions){
 const deployed=new Map(allies.map(u=>[pilotId(u.pilot),u]));
 const crew=shipLevel('crew');
 for(const [id,days] of Object.entries(save.wounds??{})){
  const unit=deployed.get(id);
  if(unit&&!(crew===2&&unit.hp.pilot>0))continue;
  const remaining=days-(crew?2:1);
  if(remaining>0)save.wounds[id]=remaining;
  else delete save.wounds[id];
 }
 for(const unit of allies)if(unit.hp.pilot===0)(save.wounds??={})[pilotId(unit.pilot)]=2;
 if(!win)return {};
 if(crew===2){
  for(const i of LANCE_SLOTS)if(!deployed.has(pilotId(pilotClass(i))))debriefXP(save.units[i],pilotClass(i),25,promotions);
  for(const [id,pilot] of Object.entries(save.reservePilots??{}))if(!deployed.has(id))debriefXP(pilot,pilotKind(id),25,promotions);
 }
 let serviced=0;
 const repair=shipLevel('repair');
 if(repair){
  const flown=new Set(allies.map(u=>u.frame));
  const hulls=[...LANCE_SLOTS.map(i=>[pilotFrame(i),save.units[i]]),...Object.entries(save.reserve??{})];
  for(const [frame,hull] of hulls){
   const gain=flown.has(Number(frame))?(repair===2?8:0):repair*12;
   if(!gain||hull.condition===100)continue;
   hull.condition=Math.min(100,hull.condition+gain);serviced++;
  }
 }
 let online;
 const project=save.ship?.project;
 if(project&&--project.wins===0){
  const tier=shipLevel(project.facility);
  online=SHIP_DECK[project.facility].tiers[tier].name;
  save.ship.levels[project.facility]=tier+1;
  delete save.ship.project;
 }
 return {serviced,online};
}
function finish(win){
 if(battle.lionTrial){battle.busy=false;startLionTrial(current()?.melee??lionTrial);return}
 const b=battle,c=b.contract,promotions=[];
 const retriever=win?b.units.find(u=>u.pilot===RETRIEVER&&u.alive):null;
 const surrendered=win?b.units.filter(u=>u.surrendered&&u.team==='enemy'):[];
 const gear=surrendered.flatMap(u=>portableItems(u));
 for(const u of surrendered){
  const captured=save.captured??={};
  captured[u.frame]=(captured[u.frame]??0)+1;
 }
 if(win&&!b.legacy&&!benchWar){
  const roll=equipmentRoll([save.world?.seed??0,b.terrainSeed??0,save.day,c.id].join('/'));
  const stock=portStock(b.offer?.port??c.id)?.weapons??[];
  if(stock.length&&roll%5<2)gear.push(stock[Math.floor(roll/5)%stock.length]);
 }
 save.owned.push(...gear);
 const newHull=frame=>!hullOwned(frame)&&!save.salvage?.[frame];
 const recovered=win?b.units.filter(u=>u.team==='enemy'&&!u.kind&&!u.alive&&!u.surrendered&&salvageableHull(u.frame)&&
  (b.mechComputers||!FRAMES[u.frame].enemyOnly))
  .sort((a,z)=>Number(newHull(z.frame))-Number(newHull(a.frame))||
   Number(Boolean(FRAMES[z.frame].salvageOnly))-Number(Boolean(FRAMES[a.frame].salvageOnly))||
   z.hp.body/z.max.body-a.hp.body/a.max.body)
  .slice(0,1+(retriever?.training?.wreckExtra??0)):[];
 for(const wreck of recovered){const bodies=save.salvage??={};bodies[wreck.frame]=(bodies[wreck.frame]??0)+1}
 const seats=b.slots.filter(slot=>slot!==AUX_SLOT).length;
 const reward=win?worldContractPay(c,seats,b.offer):0;
 const premium=win?reward-worldContractPay(c,seats,b.offer,0):0;
 const salvage=win&&!c.fixedPay?450+c.difficulty*200+(b.legacy?0:180*b.units.filter(u=>u.kind).length):0;
 const recoveryBonus=retriever?.training?.wreckBonus??0,pay=reward+salvage+recoveryBonus;
 save.credits+=pay;save.rep+=win?c.difficulty*10:0;if(win)save.wins++;
 const costs=benchWar?null:settleSortieCosts(b.offer?.port??c.id);
 const allies=b.units.filter(u=>u.team==='ally');
 for(const u of allies){
  const hull=sortieHull(u);
  hull.condition=Math.max(12,Math.round(100*(u.hp.body+u.hp.right+u.hp.left+u.hp.legs)/(u.max.body+u.max.right+u.max.left+u.max.legs)));
  debriefXP(sortiePilot(u),u.pilot,win?70:20,promotions);
 }
 const {serviced,online}=settleShip(win,allies,promotions);
 const baseOnline=win?advanceHangar():null;
 save.history.push({name:c.name,day:save.day,win,pay,...(b.offer?{offerId:b.offer.id,port:b.offer.port}:{})});save.history=save.history.slice(-100);save.day++;delete save.dispatch;
 if(save.world){
  if(b.offer){const standing=save.world.standings[b.offer.port]??0;save.world=worldRules.setStanding(save.world,b.offer.port,Math.max(-100,Math.min(100,standing+(win?2:-1))));}
  save.world=worldRules.advanceWorld(save.world,save.day);
 }
 battle=null;if(selected===AUX_SLOT)selected=0;
 window.IronVowScene?.clear?.();persist();page='career';render();
 const buttons=[{text:'COMPANY RECORD',fn:closeModal},{text:'REPAIR & REFIT',fn:()=>{closeModal();page='workshop';workshopView='assigned';render()}}];
 if(benchWar)buttons.unshift({text:'WAR REPORT',fn:showWarReport});
 if(recovered.length||surrendered.length)buttons.push({text:'VIEW SALVAGE',fn:()=>{closeModal();page='workshop';workshopView='salvage';render()}});
 const points=totalTrainingPoints();
 if(points)buttons.push({text:'TRAIN PILOTS · '+points+' PT',fn:()=>{closeModal();page='pilots';render()}});
 if(online)buttons.push({text:'SHIP DECK',fn:()=>{closeModal();navigateHangarRoute('ship')}});
 if(baseOnline)buttons.push({text:'HANGAR',fn:()=>{closeModal();navigateHangarRoute('facilities')}});
 modal(win?'CONTRACT FULFILLED.':'LANCE EXTRACTED.',`<p>${win?c.fixedPay?'Patrol cleared. Your pilots return with hard-earned experience.':'The field is yours. Your pilots return with experience and recovered enemy components.':'Your pilots have been recovered. Combat damage persists.'}</p>
  ${stat('CONTRACT PAYMENT',money(reward))}${c.fixedPay?'':stat('SCRAP BONUS',money(salvage))}${recoveryBonus?stat('RECOVERY BONUS',money(recoveryBonus)):''}${recovered.length?stat('RECOVERED '+(recovered.length===1?'BODY':'BODIES'),recovered.map(wreck=>FRAMES[wreck.frame].name).join(' · ')):''}${surrendered.length?stat('INTACT CAPTURES',surrendered.map(u=>FRAMES[u.frame].name).join(' · ')):''}${gear.length?stat('EQUIPMENT RECOVERED',gear.map(id=>equipmentItem(id).name).join(' · ')):''}${stat('REPUTATION',win?'+'+c.difficulty*10:'UNCHANGED')}
  ${costs?stat('CREW WAGES',money(costs.wages))+stat('SHIP UPKEEP',money(costs.ship))+stat('HULL UPKEEP',money(costs.hulls))+
   (costs.arrearsPaid?stat('ARREARS PAID',money(costs.arrearsPaid)):'')+(save.overworld.arrears?stat('OPERATING ARREARS',money(save.overworld.arrears)):'')+
   stat('NET CREDITS',money(pay-costs.paid-costs.arrearsPaid)):''}
  ${premium?stat('SHIP PREMIUM INCLUDED','+'+money(premium)):''}${serviced?stat('HULLS SERVICED',serviced):''}${online?stat('SHIP UPGRADE ONLINE',online):''}
  ${baseOnline?stat('HANGAR FACILITY ONLINE',baseOnline):''}
  ${promotions.length?stat('PROMOTED',promotions.join(' · ')):''}`,buttons);
}
// Canvas overlay for tactical labels, markers and floating text.
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),scale=50,origin={x:0,y:0},shake=0,viewZoom=1,frameDt=1/60;
const fieldCamera={x:1,z:16,overview:false};
const motionPreference=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
let reducedMotion=!!motionPreference?.matches;
motionPreference?.addEventListener?.('change',e=>{reducedMotion=e.matches;if(reducedMotion)skipAttackCamera()});
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,W<760?1.5:2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=W<760?'medium':'high'}
window.addEventListener('resize',resize);resize();
const TERRAIN_RISE=.19;
function terrainCell(x,z){
 const {width,depth}=battle.size;
 if(x>=0&&z>=0&&x<width&&z<depth)return battle.field.cells[z*width+x];
}
function terrainHeight(x,z){
 if(!battle?.field.cells)return 0;
 const ax=Math.floor(x),az=Math.floor(z);
 const fx=clamp01((x-ax-.32)/.36),fz=clamp01((z-az-.32)/.36);
 const height=(a,b)=>terrainCell(a,b)?.level??0;
 return TERRAIN_RISE*((1-fz)*((1-fx)*height(ax,az)+fx*height(ax+1,az))+
  fz*((1-fx)*height(ax,az+1)+fx*height(ax+1,az+1)));
}
function projectPlane(x,y,z){if(battle&&window.IronVowScene)return window.IronVowScene.project(x,y,z);return{x:origin.x+(x-z)*scale*.866,y:origin.y+(x+z)*scale*.42-y*scale}}
function project(x,y,z){return projectPlane(x,y+terrainHeight(x,z),z)}
function polygon(points,fill,stroke,width=.7){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function tileCorners(x,z,y){return [projectPlane(x-.5,y,z-.5),projectPlane(x+.5,y,z-.5),projectPlane(x+.5,y,z+.5),projectPlane(x-.5,y,z+.5)]}
function tile(x,z,color,stroke,y=0,width=.7){polygon(tileCorners(x,z,y+terrainHeight(x,z)),color,stroke,width)}
function targetingTile(x,z,locked=false){
 const y=locked?.025:.010,width=locked?2.3:1.25;
 tile(x,z,locked?'#ef9b4266':'#e7a34c3d','#291a14b8',y,width+1.5);
 tile(x,z,null,locked?'#ffe5a5':'#f1bf72c9',y,width);
}
function coverImage(im,x,y,w,h){const r=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*r,ih=im.naturalHeight*r;ctx.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}


function drawCoverMarker(x,z){
 const p=project(x,0,z),r=Math.max(2,scale*.070),y=p.y+scale*.13;
 polygon([{x:p.x-r,y:y-r*.62},{x:p.x+r,y:y-r*.62},{x:p.x+r*.76,y:y+r*.38},
  {x:p.x,y:y+r},{x:p.x-r*.76,y:y+r*.38}],'#12292bc9','#9fcdbece');
}
function unitFacing(u){return u.face??(u.team==='enemy'?1:-1)}
const FIELD_HEADINGS=[Math.PI/4,3*Math.PI/4,-3*Math.PI/4,-Math.PI/4];
function headingIndex(angle){
 return (Math.round((angle-Math.PI/4)/(Math.PI/2))+4)%4;
}
function defaultHeading(u){return unitFacing(u)*Math.PI/4}
function headingTo(dx,dz,current){
 const horizontal=Math.abs(dx),depth=Math.abs(dz);
 if(!horizontal&&!depth)return current??FIELD_HEADINGS[0];
 const x=dx>0?FIELD_HEADINGS[0]:FIELD_HEADINGS[2];
 const z=dz<0?FIELD_HEADINGS[1]:FIELD_HEADINGS[3];
 if(horizontal===depth&&(current===x||current===z))return current;
 return horizontal>=depth?x:z;
}
function displayedHeading(u){return u.headingOverride??u.heading??defaultHeading(u)}
function turnToward(u,dx,dz,sequence){
 const from=displayedHeading(u),to=headingTo(dx,dz,from);
 if(from===to)return null;
 u.heading=to;u.face=Math.sign(Math.sin(to));
 if(reducedMotion||sequence?.skipped)return null;
 // A short anticipation beat, with no in-between facing.
 u.turning=true;
 if(u.kind)sound(u.kind==='tank'?'track':'rotor',.48);
 else sound('hydraulic',.42);
 return waitAttack(100,sequence).then(()=>{u.turning=false});
}


function jumpjetHeight(u,t){
 if(reducedMotion||!u.motion?.jumpjet)return 0;
 const progress=clamp01((t-u.motion.start)/u.motion.duration);
 return 1.35*Math.sin(progress*Math.PI);
}

// Chassis weight and stride timing for combat movement and audio.
const MECH_MOTION=[
 {step:.31,mass:1},
 {step:.25,mass:.65},
 {step:.38,mass:1.45},
 {step:.63,mass:1.56},
 {step:.52,mass:1.11},
 ...[[.53,.90],[.64,1.24],[.68,1.52],[.56,1.08],[.49,.73],[.94,1.44]].map(([step,mass])=>(
  {step,mass}))
];
MECH_MOTION[HELLBREAKER]=MECH_MOTION[3];
MECH_MOTION[CITADEL_FRAME]={...MECH_MOTION[BASTION_FRAME],step:.66};
MECH_MOTION[LINE_INFANTRY_FRAME]={...MECH_MOTION[0],step:.44};
MECH_MOTION[LINE_ELITE_FRAME]={...MECH_MOTION[LINE_INFANTRY_FRAME],step:.52,mass:1.28};
MECH_MOTION[VANGUARD_FRAME]={...MECH_MOTION[3],step:.57};
MECH_MOTION[REAVER_FRAME]={...MECH_MOTION[0],step:.54};
MECH_MOTION[BULWARK_FRAME]={...MECH_MOTION[3],step:.55,mass:1.5};
MECH_MOTION[ASHIGARU_FRAME]={...MECH_MOTION[LINE_INFANTRY_FRAME],step:.29,mass:.72};
MECH_MOTION[AERO_FRAME]={...MECH_MOTION[LINE_INFANTRY_FRAME],step:.43,mass:.89};
MECH_MOTION[CAIRN_FRAME]={...MECH_MOTION[0]};
MECH_MOTION[SHOGUN_FRAME]={...MECH_MOTION[3],mass:1.66};
const clamp01=v=>Math.max(0,Math.min(1,v));
function smoothRange(a,b,v){const p=clamp01((v-a)/(b-a));return p*p*(3-2*p)}
function dampedImpulse(age,frequency=35,decay=15){return age>=0&&age<.8?Math.sin(age*frequency)*Math.exp(-age*decay):0}
const ATTACK_PROFILES={
 rifle:{raise:.23,beats:[0,.09,.18],travel:.10,recover:.34},
 shotgun:{raise:.28,beats:[0],travel:.12,recover:.43},
 rail:{raise:.39,beats:[0],travel:.075,recover:.47},
 missile:{raise:.35,beats:[0,.17],travel:1.0,recover:.39},   // lofted 45-degree flight (was .42 on a flat arc)
 hailstorm:{raise:.36,beats:[0,.06,.12,.18,.24,.30,.36],travel:.09,recover:.39},
 rampart:{raise:.31,beats:[0],travel:.13,recover:.48},
 rivet:{raise:.28,beats:[0],interval:.072,travel:.095,recover:.38,effect:'hailstorm',feed:true},
 parallax:{raise:.72,beats:[0],travel:.075,recover:.56,effect:'rail',charge:true},
 breaker:{raise:.47,beats:[0],travel:.19,recover:.51,melee:true},
 cleaver:{raise:.21,beats:[0],travel:.16,recover:.30,melee:true},
 blade:{raise:.38,beats:[0],travel:.08,recover:.55,melee:true,effect:'cleaver'},
 piledriver:{raise:.32,beats:[0],travel:.18,recover:.39,melee:true},
 morrow:{raise:.784,beats:[0,.298667],travel:.14,recover:.48,effect:'rampart',alternate:true},
 locust:{raise:.784,beats:[0,.298667],travel:1.05,recover:.39,effect:'missile',alternate:true},   // lofted (was .46)
 'breach-gauntlet':{raise:.357,beats:[0],travel:.21,recover:.41,melee:true,effect:'breaker'},
 'pulse-bash':{raise:.357,beats:[0],travel:.21,recover:.33,melee:true,effect:'cleaver'},
 'aegis-cleave':{raise:1.08,beats:[0],travel:.29,recover:.70,melee:true,
  power:{clip:'cleave',anchor:'bladeCore',color:'#ff754d',sound:'cleaver',hitstop:.095,shake:7}},
 'aegis-bash':{raise:1.12,beats:[0],travel:.29,recover:.70,melee:true,
  power:{clip:'bash',anchor:'shieldCore',color:'#96edc0',sound:'breaker',hitstop:.13,shake:9}},
 'needle-carbine':{raise:7/24,beats:[0],travel:.095,recover:.36,effect:'rifle',cue:7,contact:10},
 'flechette-scattergun':{raise:3/24,beats:[0,.25],travel:.08,recover:.26,effect:'shotgun',cue:3,contact:11},
 'signal-knife':{raise:.35,beats:[0],travel:.12,recover:.42,melee:true,effect:'cleaver',cue:16,contact:21},
 [FREE_HAND_COUNTER.id]:{raise:.21,beats:[0],travel:.12,recover:.26,melee:true}
};
for(const w of WEAPONS)if(w.motion&&!ATTACK_PROFILES[w.id])ATTACK_PROFILES[w.id]={...ATTACK_PROFILES[w.motion],effect:w.scatter?'shotgun':w.motion};
const VOLLEY_PROFILES=Object.fromEntries(WEAPONS.filter(w=>w.burst).map(w=>[
 w.id,{...ATTACK_PROFILES[w.id],beats:w.scatter?[0]:Array.from({length:w.burst},(_,i)=>i*(ATTACK_PROFILES[w.id].interval??(w.burst===12?.082:.105)))}
]));
const LION_STRIKE_TIMING={raise:15/24,travel:3/24,recover:13/24};
function attackProfile(actor,id){
 const volley=actor&&!actor.kind&&actor.frame!==REAVER_FRAME?VOLLEY_PROFILES[id]:null;
 const profile=volley??ATTACK_PROFILES[id],strike=actor?.frame===AERO_FRAME&&window.IRON_VOW_AERO_STRIKES?.[id];
 if(actor?.lionTrial&&LION_TRIAL_WEAPONS.includes(id))return {...profile,...LION_STRIKE_TIMING};
 return strike?{...profile,...strike.timing}:profile;
}
// Integrated chassis share the authored fire and strike cue timings.
const NATIVE_ATTACK_TIMING={
 fire:{duration:56/30,cue:.42,beatGap:.298667},
 strike:{duration:1.05,cue:.34},
};
const ATTACK_STEP={duration:.60,returnDuration:.35};
// Attack-camera pacing (owner, 2026-11-18: the brace, step-up and priming went by too fast to read). Step-up 0.6 s -> 0.96 s; the gun
// then holds raised and steady 0.45 s longer before the first round. Native GLB fire clips keep their authored cue timing.
const CINEMATIC_PACE={step:1.6,aimHold:.45};
const DESTRUCTION={kneelEnd:.56,fallEnd:.92,blast:1.05,end:1.92};
function destructionPace(u){
 if(u.frame===ASHIGARU_FRAME)return .82;
 if(u.frame===REAVER_FRAME)return 1.22;
 return MECH_MOTION[u.frame]?.mass>=1.4?1.55:1;
}
function destructionAge(u,t){return Number.isFinite(u.deathTime)?(t-u.deathTime)/destructionPace(u):DESTRUCTION.end}
function destructionStyle(u){return u.deathStyle||(u.frame===1||FRAMES[u.frame]?.native||destructionPace(u)>=1.5?'fall':'kneel')}

function beginDestruction(u,reason='body',sequence=null){
 if(u.kind&&reason==='body'&&!reducedMotion&&!sequence?.skipped){
  sound('vehicleShutdown',1,{material:u.kind,pan:combatAudioPan(u,sequence,(u.face||1)*.20)});
 }
 u.downReason=reason;
 u.alive=false;if(lockedTarget===u.id)lockedTarget=null;u.deathTime=clock;u.deathStyle=u.kind?'vehicle':destructionStyle(u);u.deathEvents=0;u.attack=null;
}
function updateDestruction(u,t){
 if(u.alive||u.downReason==='pilot'||!Number.isFinite(u.deathTime))return;
 if(u.kind){
  const elapsed=t-u.deathTime-VEHICLES[u.kind].wreckAt;
  if(elapsed>=0&&!u.deathEvents){
   u.deathEvents=1;
   if(!reducedMotion&&elapsed<.55){
    effects.push({type:'detonation',x:u.x,z:u.z,t:1-elapsed/.85,big:true,seed:u.index,anchor:freezeAttachment(u,'body',t)});
    const pan=combatAudioPan(u,activeCinematic,(u.face||1)*.20);
    sound('vehicleGround',1,{material:u.kind,pan});
    sound('boom',u.kind==='tank'?.77:.62,{pan});
    shake=Math.max(shake,u.kind==='helicopter'?5:4);
   }
  }
  return;
 }
 const age=destructionAge(u,t),pace=destructionPace(u),mass=MECH_MOTION[u.frame].mass;
 if(age>DESTRUCTION.end+.5)return;
 if(age>=DESTRUCTION.kneelEnd&&!(u.deathEvents&8)){u.deathEvents=(u.deathEvents||0)|8;if(!reducedMotion&&age-DESTRUCTION.kneelEnd<.3){effects.push({type:'step',x:u.x,z:u.z,t:1,mass:MECH_MOTION[u.frame].mass*1.5,side:-1});shake=Math.max(shake,2*MECH_MOTION[u.frame].mass);sound('step')}}
 if(pace>=1.5&&age>=DESTRUCTION.fallEnd&&!(u.deathEvents&16)){
  u.deathEvents|=16;
  if(!reducedMotion&&age-DESTRUCTION.fallEnd<.25){
   effects.push({type:'step',x:u.x,z:u.z,t:1,mass:mass*2.2,side:1,deathImpact:true});
   shake=Math.max(shake,4.5*mass);sound('step');
  }
 }
 const cues=[{at:.67,big:false},{at:DESTRUCTION.blast,big:true},{at:1.28,big:false}];
 for(let i=0;i<cues.length;i++){
  const cue=cues[i],flag=1<<i;if(age<cue.at||(u.deathEvents&flag))continue;u.deathEvents=(u.deathEvents||0)|flag;
  if((age-cue.at)*pace>.6||reducedMotion)continue;
  const at=u.deathTime+cue.at*pace,anchor=freezeAttachment(u,'body',at);
  effects.push({type:'detonation',x:u.x,z:u.z,anchor,at,t:1-(age-cue.at)*pace/.85,big:cue.big,seed:u.index+u.frame*7});
  if(cue.big){sound('boom');shake=Math.max(shake,9*MECH_MOTION[u.frame].mass)}
 }
}


function refreshTargetPortrait(){
 if(!targetPanelOpen)return;
 const image=$('.combat-target img[data-target-id]');
 const target=battle?.units.find(u=>u.id===image?.dataset.targetId);
 if(!target)return;
 const facing=unitFacing(target);
 if(target.kind){
  const url=window.IronVowFoundry?.vehicleThumbnail(target.kind,facing);
  if(url&&image.src!==url)image.src=url;
  return;
 }
 const portrait=mechPortrait(target.frame,target,facing);
 if(!portrait)return;
 if(image.dataset.rigPortrait!==portrait.key){
  image.dataset.rigPortrait=portrait.key;
  if(!portrait.url)image.removeAttribute('src');
 }
 if(portrait.url&&image.src!==portrait.url)image.src=portrait.url;
}

window.addEventListener?.('rig-art-ready',()=>{
 if(battle){refreshTargetPortrait();return;}
 for(const image of document.querySelectorAll('img[data-equipment-id]:not([src])')){
  const url=window.IronVowFoundry?.equipmentThumbnail(image.dataset.equipmentKind,image.dataset.equipmentId);
  if(url)image.src=url;
 }
});
function testBastionGrip(melee){
 const unit={...save.units[selected],frame:BASTION_FRAME,index:selected,team:'ally',alive:true,ap:8,x:0,z:0,vx:0,vz:0};
 if(melee){unit.melee??='cleaver';unit.shield=null;}
 const kind=melee?unit.melee:unit.weapon,profile=attackProfile(unit,kind),fireAt=.6+profile.raise,releaseAt=fireAt+profile.travel;
 const duration=releaseAt+profile.recover+ATTACK_STEP.returnDuration;
 window.IronVowWorkshop?.play(unit,(actor,t)=>{
  actor.attack={kind,start:0,primeDuration:.6,windup:profile.raise,fireAt:t>=fireAt?fireAt:null,releaseAt:t>=releaseAt?releaseAt:undefined};
  actor.fireTime=t>=fireAt?fireAt:undefined;
  return animationPose(actor,t);
 },duration);
}
function drawWorkshopPreview(){
 const host=$('#paint-preview');
 if(!host)return;
 const frame=pilotFrame(selected);
 window.IronVowWorkshop?.show(host,{...save.units[selected],frame,index:selected},foundryModel(frame));
}
function refreshArmory(focus){
 const top=$('#ui .page')?.scrollTop||0;
 render();
 const view=$('#ui .page');
 if(view)view.scrollTop=top;
 $(focus)?.focus({preventScroll:true});
}
function bindWorkshop(){
 const u=save.units[selected];
 // View preferences stay in memory; career data and loadout rules are unchanged.
 bindWorkshop.disclosures??={};
 for(const detail of document.querySelectorAll('[data-workshop-detail]'))detail.ontoggle=()=>{
  if(detail.isConnected)bindWorkshop.disclosures[detail.dataset.workshopDetail]=detail.open;
 };
 for(const button of document.querySelectorAll('[data-armory-class]'))button.onclick=()=>{
  armoryGroup=button.dataset.armoryClass;
  refreshArmory(`[data-armory-class="${armoryGroup}"]`);
 };
 const preview=$('#armory-preview'),back=$('#armory-back');
 if(preview)preview.onclick=()=>{
  const chassis=$('.workshop-chassis');
  for(let detail=chassis.closest('details');detail;detail=detail.parentElement?.closest('details'))detail.open=true;
  chassis.scrollIntoView({block:'start'});chassis.focus({preventScroll:true});
 };
 if(back)back.onclick=()=>{
  const tab=$('[data-armory-class][aria-pressed="true"]');
  const armory=$('.workshop-armory');
  for(let detail=armory.closest('details');detail;detail=detail.parentElement?.closest('details'))detail.open=true;
  armory.scrollIntoView({block:'start'});tab?.focus({preventScroll:true});
 };
 for(const button of document.querySelectorAll('[data-bay]'))button.onclick=()=>{
  workshopView=button.dataset.bay;render();$(`[data-bay="${workshopView}"]`)?.focus();
 };
 for(const button of document.querySelectorAll('[data-buy-hull],[data-rebuild],[data-recycle]'))button.onclick=()=>{
  const frame=Number(button.dataset.buyHull??button.dataset.rebuild??button.dataset.recycle),recycle=button.dataset.recycle!==undefined;
  if(recycle?recycleHullBody(frame):acquireHull(frame,button.dataset.rebuild!==undefined)){
   if(!recycle)workshopView='storage';
   render();$(`[data-bay="${workshopView}"]`)?.focus();toast(FRAMES[frame].name+(recycle?' body recycled.':' moved to storage.'));
  }
 };
 for(const button of document.querySelectorAll('[data-patch-storage]'))button.onclick=()=>{
  const frame=Number(button.dataset.patchStorage);
  if(patchStoredHull(frame)){render();$('[data-bay="storage"]')?.focus();toast(FRAMES[frame].name+' field patched.')}
 };
 for(const button of document.querySelectorAll('[data-chassis]'))button.onclick=()=>{
  const frame=Number(button.dataset.chassis);
  const pageScroll=$('#ui .page')?.scrollTop||0;
  if(assignChassis(selected,frame,true)){
   workshopView='assigned';render();sound('click');toast(pilotProfile(selected).call+' assigned to '+FRAMES[frame].name);
   const workshop=$('#ui .page');if(workshop)workshop.scrollTop=pageScroll;
   $(`.lance-tabs [data-select="${selected}"]`)?.focus({preventScroll:true});
  }else if(FRAMES[frame].cost>save.credits)toast('Insufficient credits');
 };
 const finishes=[...document.querySelectorAll('[data-paint-finish]')];
 const presets=[...document.querySelectorAll('[data-livery]')].filter(button=>button.dataset.livery!=='0');
 const swatches=[...document.querySelectorAll('[data-paint-channel]')];
 const pickers=[...document.querySelectorAll('[data-custom-channel]')];
 const showPaint=()=>{
  for(const button of finishes)button.setAttribute('aria-pressed',String(fieldPaint.finish(u)===button.dataset.paintFinish));
  for(const button of presets)button.setAttribute('aria-pressed',String(activeLivery(u,PAINT_PRESETS[button.dataset.livery])));
  for(const button of swatches)button.setAttribute('aria-pressed',String(paintChannel(u,button.dataset.paintChannel)===button.dataset.paintColor));
  for(const picker of pickers){
   const channel=picker.dataset.customChannel;
   picker.value=paintChannel(u,channel)??PAINT_CHANNELS.find(([key])=>key===channel)[2];
  }
  drawWorkshopPreview();
 };
 for(const button of finishes)button.onclick=()=>{
  u.paintFinish=button.dataset.paintFinish;
  if(u.paintFinish==='factory'){delete u.paint;delete u.trim;}
  showPaint();persist();
 };
 const customPaint=()=>{if(u.paintFinish==='factory')delete u.paintFinish;};
 for(const button of presets)button.onclick=()=>{
  const preset=PAINT_PRESETS[button.dataset.livery];
  customPaint();
  PAINT_CHANNELS.forEach(([channel],index)=>setPaintChannel(u,channel,preset[index+1]));
  showPaint();persist();
 };
 for(const button of swatches)button.onclick=()=>{
  customPaint();setPaintChannel(u,button.dataset.paintChannel,button.dataset.paintColor);showPaint();persist();
 };
 for(const picker of pickers){
  const update=()=>{if(validPaint(picker.value)){customPaint();setPaintChannel(u,picker.dataset.customChannel,picker.value);showPaint();}};
  picker.oninput=update;picker.onchange=()=>{update();persist();};
 }
 const rotate=$('#rotate-foundry');
 if(rotate)rotate.onclick=()=>window.IronVowWorkshop?.rotate();
 const testRifle=$('#bastion-test-rifle'),testMelee=$('#bastion-test-melee');
 if(testRifle)testRifle.onclick=()=>testBastionGrip(false);
 if(testMelee)testMelee.onclick=()=>testBastionGrip(true);
 const remove=$('#remove-melee');
 if(remove)remove.onclick=()=>{delete u.melee;delete u.meleeHand;persist();refreshArmory(breachLoadout(pilotFrame(selected))?'[data-equip="cleaver"]':`[data-armory-class="${armoryGroup}"]`);toast('Melee weapon unequipped')};
 const removePrimary=$('#remove-primary');
 if(removePrimary)removePrimary.onclick=()=>{u.weapon=null;persist();refreshArmory('[data-armory-class="assault"]');};
 const removeShoulder=$('#remove-shoulder');
 if(removeShoulder)removeShoulder.onclick=()=>{keepShoulder(u);delete u.shoulder;persist();refreshArmory('[data-equip="vesper-shoulder"]');toast('Shoulder pod unequipped')};
 const removeShield=$('#remove-shield');
 if(removeShield)removeShield.onclick=()=>{
  const id=u.shield;delete u.shield;persist();refreshArmory(`[data-equip="${id}"]`);toast('Shield unequipped');
 };
 drawWorkshopPreview();
}
const WARDEN_BRACE_DURATION=.58;

function fieldStepProgress(phase,segment){
 if(!segment||segment.length===1)return phase*phase*(3-2*phase);
 if(segment.index===0)return phase*phase*(2-phase);
 if(segment.index===segment.length-1)return phase+phase*phase*(1-phase);
 return phase;
}

function twoStepContacts(u,progress){
 const m=u.motion,mass=MECH_MOTION[u.frame].mass;
 while(m.stepBeats<2&&progress+1e-6>=(m.stepBeats+1)/2){
  const q=++m.stepBeats/2;
  effects.push({type:'step',actor:u.id,x:m.fromX+(m.toX-m.fromX)*q,z:m.fromZ+(m.toZ-m.fromZ)*q,t:1,mass,side:q===.5?1:-1});
 }
}

// Seconds per tile for a walking hull on the 7.4 m board (foundry/walk-tuning.js); the bare .22 + 1.3 x step was tuned for 3.4 m tiles.
function walkTileDuration(u){
 const base=.22+1.3*MECH_MOTION[u.frame].step,tuning=window.IronVowWalk;
 if(!tuning||u.lionTrial)return base;
 return tuning.tileDuration(u.frame,base,window.IronVowScene?.models?.get(u.id)?.entry?.m?.dims.stride);
}
function walkSoundMarkers(m,doubleStep){
 if(doubleStep)return [{at:0,side:1},{at:.5,side:1,land:true},{at:.5,side:-1},{at:1,side:-1,land:true}];
 const side=m.gaitBase%2?1:-1;
 return [{at:0,side},{at:1,side,land:true}];
}
function advanceGaitCues(u,phase){
 const m=u.motion;
 if(!m?.gaitCues?.length)return;
 // Keep timed cues available for frames where the live rig is unavailable.
 const scene=window.IronVowScene;
 const live=!reducedMotion&&scene?.isLive(u)&&scene.models.get(u.id)?.entry;
 const progress=m.segment&&!reducedMotion?fieldStepProgress(phase,m.segment):phase;
 while(m.gaitCues[0]?.at<=progress+.000001){
  const marker=m.gaitCues.shift();
  if(!live)gaitSound(u,marker.land?'land':'lift',marker.side);
 }
}
// reach in tiles (7.4 m): a dodge hops about 1.6 m back and aside; a plain miss sways about 0.5 m while the hull ducks (scene/combat.js evade)
const EVADE={lead:.24,dodge:{reach:.22,out:.2,hold:.5,back:1.05},miss:{reach:.07,out:.14,hold:.42,back:.8}};
const evades=new WeakMap();   // display-only; kept off the unit so saves never carry it
function beginEvade(u,attacker,dodged,at){
 if(reducedMotion||u.kind||!u.alive||u.hp.legs<=0)return;
 const dx=u.x-attacker.x,dz=u.z-attacker.z,length=Math.hypot(dx,dz)||1;
 let side=(u.x+u.z+battle.turn)%2?1:-1;   // alternates by tile and turn; flips to stay on the board
 if(!onBoard(Math.round(u.x-dz/length*side),Math.round(u.z+dx/length*side)))side=-side;
 // back along the line of fire as well as aside, so the hop reads from the side-on duel camera too
 const x=-dz/length*side*.8+dx/length*.6,z=dx/length*side*.8+dz/length*.6;
 // Rigs with an authored dodge clip (Aero) play it in place: their clip keeps the ankles planted, and a hop would drag them.
 const authored=Boolean(dodged&&window.IronVowScene?.models?.get(u.id)?.entry?.m?.nativeV2?.dodge);
 evades.set(u,{at,dodged,side,x,z,kicked:false,authored});
}
// Sidestep offset in tiles for the displayed position: out fast, hold while the rounds pass, settle back.
function evadeOffset(u,t){
 const e=evades.get(u);if(!e)return 0;
 const p=e.dodged?EVADE.dodge:EVADE.miss,age=t-e.at;
 if(reducedMotion||!u.alive||u.hp.legs<=0||age>=p.back){evades.delete(u);return 0;}
 if(age<0)return 0;
 if(!e.kicked){e.kicked=true;window.IronVowScene?.combat?.evade?.(u,e);}
 if(e.authored)return 0;
 const reach=age<p.out?smoothRange(0,p.out,age):age<p.hold?1:1-smoothRange(p.hold,p.back,age);
 return p.reach*reach;
}
function advanceUnitAnimation(u,t,dt){
 const m=u.motion;
 if(m){
  const p=clamp01((t-m.start)/m.duration),q=fieldStepProgress(p,m.segment);
  u.vx=m.fromX+(m.toX-m.fromX)*q;u.vz=m.fromZ+(m.toZ-m.fromZ)*q;
  if(m.stepBeats!=null)twoStepContacts(u,q);
  advanceGaitCues(u,p);
 }
 else{const off=evadeOffset(u,t),e=evades.get(u);u.vx=u.x+(e?.x??0)*off;u.vz=u.z+(e?.z??0)*off}
 updateDestruction(u,t);
 if(u.brace&&u.frame===0&&u.team==='ally'){
  u.braceBlend=reducedMotion?1:clamp01((t-(u.braceTime??-100))/WARDEN_BRACE_DURATION);
 }else u.braceBlend=(u.braceBlend??0)+((u.brace?1:0)-(u.braceBlend??0))*(1-Math.exp(-dt*13));
}
function weaponRigPose(profile,age){
 const weaponKick=profile.beats.reduce((peak,beat)=>{
  const dt=age-beat;
  return Math.max(peak,smoothRange(0,.035,dt)*(1-smoothRange(.035,.18,dt)));
 },0);
 return {weaponKick,weaponSpin:smoothRange(0,.3,age)};
}
function firingPose(u,t){
 const attack=u.attack,profile=ATTACK_PROFILES[u.weapon];
 if(reducedMotion||attack?.kind!==u.weapon||!(profile?.feed||profile?.charge))return;
 const age=Number.isFinite(attack.fireAt)?t-attack.fireAt:-1;
 if(profile.feed){
  const round=Math.floor((age+1e-7)/profile.interval);
  if(round<0||round>=weapon(u.weapon).burst)return {weaponKick:0,weaponFeed:0};
  const phase=Math.max(0,(age-round*profile.interval)/profile.interval);
  return {weaponKick:1-smoothRange(.13,.67,phase),weaponFeed:phase};
 }
 const charge=age<0?smoothRange(0,attack.windup,t-attack.start-attack.primeDuration):1-smoothRange(0,.19,age);
 const kick=age<0?0:1-smoothRange(0,.13,age);
 return {weaponKick:kick,weaponCharge:charge};
}
function animationPose(u,t){
 const m=u.motion,phase=m?clamp01((t-m.start)/m.duration):0;
 const stride=m?.stepBeats!=null?fieldStepProgress(phase,m.segment):phase;
 const cycle=m?m.gaitBase+stride:0,routePhase=m?(m.stepIndex+stride)/m.totalSteps:0;
 const walk=m&&!reducedMotion?smoothRange(0,.12,routePhase)*(1-smoothRange(.87,1,routePhase)):0;
 const attack=u.attack,profile=attackProfile(u,attack?.kind||u.weapon);
 const strikeKind=profile.melee?attack?.kind:null;
 const primeDuration=attack?.primeDuration||0,windupAge=attack?t-attack.start-primeDuration:0;
 const returnAt=attack?.returnAt??((attack?.releaseAt??0)+profile.recover);
 let primePhase=null,primeProgress=0;
 if(primeDuration){
  if(windupAge<0&&!Number.isFinite(attack.fireAt)){
   primePhase='step';primeProgress=clamp01(1+windupAge/primeDuration);
  }else if(Number.isFinite(attack.releaseAt)&&t>=returnAt){
   primePhase='return';primeProgress=1-clamp01((t-returnAt)/ATTACK_STEP.returnDuration);
  }else{
   primePhase='planted';primeProgress=1;
  }
 }
 let aim=attack&&!strikeKind?smoothRange(0,profile.raise*(profile.charge ? .58 : 1),windupAge):0;
 if(attack&&Number.isFinite(attack.releaseAt))aim*=1-smoothRange(0,profile.recover,t-attack.releaseAt);
 let strikeProgress=0;
 if(strikeKind){
  const windup=.7*profile.raise/(profile.raise+profile.travel);
  strikeProgress=Number.isFinite(attack.releaseAt)?.7+.3*clamp01((t-attack.releaseAt)/profile.recover):
   Number.isFinite(attack.fireAt)?windup+(.7-windup)*clamp01((t-attack.fireAt)/profile.travel):
   windup*clamp01(windupAge/profile.raise);
 }
 let recoil=0;const age=t-(u.fireTime??-100);
 const motion=weaponMotion(attack?.kind??u.weapon);
 if(!strikeKind&&!reducedMotion)for(const beat of profile.beats)recoil+=dampedImpulse(age-beat,motion==='missile'?32:42,motion==='rail'?12:18);
 const impactAge=t-(u.hitTime??-100),impact=!reducedMotion?dampedImpulse(impactAge,28,11):0;
 const deathAge=u.alive?-1:destructionAge(u,t),death=u.alive||u.downReason==='pilot'||u.surrendered?0:reducedMotion?1:clamp01(deathAge/DESTRUCTION.end);
 const kneel=u.alive?0:reducedMotion?1:smoothRange(.04,DESTRUCTION.kneelEnd,deathAge);
 const explosion=u.alive||u.downReason==='pilot'||u.surrendered?0:reducedMotion?1:smoothRange(DESTRUCTION.blast-.02,DESTRUCTION.blast+.15,deathAge);
 const landAge=t-(u.landTime??-100),land=!reducedMotion&&landAge>=0&&landAge<.4?Math.sin(landAge*30)*Math.exp(-landAge*15):0;
 const pose={time:t,strikeKind,strikeProgress,primePhase,primeProgress,phase,cycle,walk,recoil,impact,death,deathAge,kneel,
  explosion,aim:reducedMotion?(u.attack?1:0):aim,land,brace:u.braceBlend??(u.brace?1:0)};
 if(!reducedMotion&&!strikeKind&&attack?.kind===u.weapon&&window.IRON_VOW_EXPANSION_RIG?.[u.weapon])
  Object.assign(pose,firingPose(u,t)||weaponRigPose(profile,age));
 return pose;
}

// Field readout over each mech (owner, 2026-11-18: the boxed per-part table took too much screen and broke immersion).
// Unfocused hulls show one thin body bar; the selected, locked or hovered hull shows one slim row of part pips and its call
// sign. Exact numbers stay in the target panel and unit inspect. Nothing is drawn while the attack camera plays.
function drawUnitReadout(u,height=2.35){
 if(activeCinematic&&!reducedMotion)return;
 const q=window.IronVowScene?.ready?window.IronVowScene.labelPoint(u):project(u.vx,height,u.vz),ally=u.team==='ally';
 const focused=(ally&&u.index===selected)||u.id===lockedTarget||(hover?.x===u.x&&hover?.z===u.z);
 const parts=focused?healthRows(u).flat():['body'],gap=2,barHeight=focused?3:2;
 const width=focused?Math.max(44,Math.min(60,scale*.55)):Math.max(22,Math.min(34,scale*.32));
 const x=q.x-width/2,y=q.y+4,cellWidth=(width-(parts.length-1)*gap)/parts.length;
 ctx.fillStyle='#0b141d99';ctx.fillRect(x-1,y-1,width+2,barHeight+2);
 for(const [column,part] of parts.entries()){
  const left=x+column*(cellWidth+gap),ratio=clamp01(u.hp[part]/u.max[part]),tone=healthTone(ratio);
  ctx.fillStyle=tone==='down'?'#57363899':'#293e4a99';ctx.fillRect(left,y,cellWidth,barHeight);
  ctx.fillStyle=HEALTH_COLORS[tone];ctx.fillRect(left,y,cellWidth*ratio,barHeight);
 }
 if(!focused)return;
 ctx.font=(W<760?'9':'10')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=ally?'#d7e3df':'#e5ae98';
 ctx.shadowColor='#06101a';ctx.shadowBlur=4;ctx.fillText(ally?CREW[u.pilot].call:u.name,q.x,y-5);ctx.shadowBlur=0;
}
function hitstopTime(u,t){
 return u.hitstop&&t>=u.hitstop.at&&t<u.hitstop.until?u.hitstop.at:t;
}
function mechAttachmentPoint(u,part='muzzle',t=clock){
 if(!window.IronVowScene)return project(u.vx,1,u.vz);
 return window.IronVowScene.projectWorld(window.IronVowScene.attachmentPoint(u,part,t));
}
function freezeAttachment(u,part,t=clock){const p=mechAttachmentPoint(u,part,t),base=project(u.vx,0,u.vz);return{x:u.vx,z:u.vz,ox:(p.x-base.x)/scale,oy:(p.y-base.y)/scale}}
function shotMuzzle(actor,id,index){
 const alternate=(id==='missile'||id==='cerberus'||ATTACK_PROFILES[id]?.alternate)&&index%2;
 const shoulder=actor.shoulder&&shoulderWeapon(actor)?.id===id;
 return shoulder?(alternate?'shoulderMuzzle2':'shoulderMuzzle'):(alternate?'muzzle2':'muzzle');
}

function drawEffects(t){for(const e of effects){
 if(e.type!=='text'&&e.type!=='heal')continue;
 const phase=1-e.t,p=project(e.x,2.6+phase*.6,e.z);ctx.save();ctx.globalAlpha=Math.min(1,e.t*3);ctx.fillStyle=e.type==='heal'?'#bbd8c9':'#f5dbb1';ctx.font='600 '+(W<760?'9':'12')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.shadowColor='#07111a';ctx.shadowBlur=6;ctx.fillText(e.text,p.x,p.y);ctx.restore();
}}
function focusBattleCamera(u,reset=false){
 if(!u)return;
 fieldCamera.x=u.x;fieldCamera.z=u.z;fieldCamera.overview=false;
 if(reset)viewZoom=1;
}
function tacticalMapMarkup(){
 const {width,depth}=battle.size;
 const pins=battle.units.filter(u=>u.alive).map(u=>{
  const label=u.kind==='tank'?'T':u.kind==='helicopter'?'H':u.team==='ally'?String(u.index+1):'';
  return `<span class="map-pin ${u.team} ${u.kind||''}" style="--map-x:${100*(u.x+.5)/width}%;--map-z:${100*(u.z+.5)/depth}%;" aria-hidden="true">${label}</span>`;
 }).join('');
 const disabled=battle.busy?'disabled':'';
 return `<div class="field-navigation" aria-label="Tactical map"><div class="map-tools"><button type="button" id="map-overview" aria-pressed="${fieldCamera.overview}" ${disabled}>${fieldCamera.overview?'CLOSE VIEW':'OVERVIEW'}</button><button type="button" id="map-center" title="Center on selected unit" aria-label="Center on selected unit" ${disabled}>◎</button></div><div class="map-tools map-zoom"><button type="button" id="map-zoom-out" aria-label="Zoom out" ${disabled}>−</button><button type="button" id="map-zoom-in" aria-label="Zoom in" ${disabled}>+</button></div><button type="button" id="map-radar" class="map-radar" aria-label="Pan the battlefield using the tactical map" ${disabled}>${pins}<span class="map-focus" aria-hidden="true"></span></button><span class="map-caption">${width} × ${depth}</span></div>`;
}
function bindTacticalMap(){
 $('#map-overview').onclick=()=>{
  if(battle.busy)return;
  fieldCamera.overview=!fieldCamera.overview;hover=null;renderBattle();
 };
 $('#map-center').onclick=()=>{if(!battle.busy){focusBattleCamera(current(),true);hover=null;renderBattle()}};
 $('#map-zoom-out').onclick=()=>zoomField(.73);
 $('#map-zoom-in').onclick=()=>zoomField(1/.73);
 $('#map-radar').onclick=e=>{
  if(battle.busy)return;
  if(!e.detail){fieldCamera.overview=!fieldCamera.overview;renderBattle();return}
  const rect=e.currentTarget.getBoundingClientRect(),{width,depth}=battle.size;
  fieldCamera.x=clamp01((e.clientX-rect.left)/rect.width)*width-.5;
  fieldCamera.z=clamp01((e.clientY-rect.top)/rect.height)*depth-.5;
  fieldCamera.overview=false;hover=null;renderBattle();
 };
}
function panField(dx,dy){window.IronVowScene.pan(dx,dy);hover=moveTap=null;}
function fieldScale(){
 const mobile=W<760,{width,depth}=battle.size;
 const span=width+depth;
 const usableWidth=W-(mobile?30:Math.min(390,W*.32));
 const usableHeight=H-(mobile?270:245);
 const fit=Math.max(5,Math.min(usableWidth/(span*.866),usableHeight/(span*.42+3)));
 const base=mobile?Math.min(W/12,H/19):Math.min((W-365)/18,(H-225)/10.7);
 return {fit,close:2*Math.max(mobile?24:33,base)};
}
function zoomField(factor){
 if(!battle||battle.busy)return;
 const {fit,close}=fieldScale();
 const minimum=window.IronVowScene?.overviewZoom??fit/close,from=fieldCamera.overview?minimum:viewZoom;
 viewZoom=Math.min(1.65,Math.max(minimum,from*factor));
 if(fieldCamera.overview){
  if(viewZoom===minimum)return;
  fieldCamera.x=(battle.size.width-1)/2;fieldCamera.z=(battle.size.depth-1)/2;
  fieldCamera.overview=false;renderBattle();
 }
 hover=moveTap=null;setFieldProjection();
}
function setFieldProjection(cinematicPush=0){
 const mobile=W<760,{width,depth}=battle.size,overview=fieldCamera.overview;
 const {fit,close}=fieldScale();
 scale=overview?fit:Math.max(fit,close*viewZoom);
 let x=overview?(width-1)/2:fieldCamera.x,z=overview?(depth-1)/2:fieldCamera.z;
 if(cinematicPush){
  const actor=activeCinematic.actor;
  x+=(actor.vx-x)*cinematicPush;z+=(actor.vz-z)*cinematicPush;
  scale*=1+.35*cinematicPush;
 }
 const centerX=mobile?W*.5:overview?W*.5-30:W*.51;
 origin={x:centerX-(x-z)*scale*.866,y:H*(mobile?.55:.53)-(x+z)*scale*.42+(overview?0:terrainHeight(x,z)*scale)};
 const radar=$('.map-focus');
 if(radar?.style){
  radar.style.left=100*(fieldCamera.x+.5)/width+'%';
  radar.style.top=100*(fieldCamera.z+.5)/depth+'%';
 }
}
const MOVE_SHOT_STYLE={
 clear:{color:'#b0e4ef',glyph:'✓',label:'Clear'},
 high:{color:'#ffdb8d',glyph:'↑',label:'High'},
 blocked:{color:'#f3a09a',glyph:'×',label:'Ridge'},
 arc:{color:'#c6c2ff',glyph:'⤴',label:'Arc'},
 mark:{color:'#ffbe86',glyph:'◎',label:'Barrage'}
};
function previewMoveShots(u,spot,cost){
 const from={...u,x:spot.x,z:spot.z,ap:u.ap-(cost>freeMovement(u)?EXTRA_MOVE_AP:0),mechState:{...u.mechState,moved:(u.mechState?.moved??0)+cost}};
 const guns=[selectedWeapon(from,'fire'),shoulderWeapon(from)].filter(w=>canUseWeapon(from,w));
 const shots=[];
 for(const target of battle.units){
  if(target.team!=='enemy'||!target.alive)continue;
  const range=distance(from,target);
  const weapons=from.frame===ASHIGARU_FRAME?[selectedWeapon(from,'fire',target)].filter(w=>canUseWeapon(from,w)):guns;
  const inRange=weapons.filter(w=>range<=combatRange(from,target,w));
  if(!inRange.length)continue;
  const w=inRange.find(gun=>!attackObstruction(from,target,gun));
  const barrage=w&&barrageStatus(from,target,w);
  const state=!w?'blocked':barrage?'mark':highGroundAim(from,target,w)?'high':launchesMissiles(w)&&ridgeBlocks(from,target)?'arc':'clear';
  const odds=w&&!barrage?displayedAttackOdds(from,target,w):{hit:null,crit:0};
  shots.push({target,state,...odds});
 }
 return {shots,canFire:guns.length>0};
}
let movePreviewMarkup='';
function showMovePreview(spot,preview){
 const panel=$('#move-preview'),hint=$('#field-hint');
 if(!panel||!hint)return;
 if(!spot){
  if(!panel.hidden){panel.hidden=true;hint.hidden=false}
  return;
 }
 const labels=preview.shots.map(({target,state,hit,crit})=>{
  const {color,glyph,label}=MOVE_SHOT_STYLE[state];
  return `<span class="move-contact" data-shot="${state}" style="--shot-color:${color}"><b aria-hidden="true">${glyph}</b> ${target.name} <span class="move-hit">${hit===null?'—':hit+'%'+(crit?' · '+crit+'% CRIT':'')}</span> <small>${label}</small></span>`;
 }).join('');
 const markup=`<div class="move-contacts">${labels||(preview.canFire?'NO TARGET IN RANGE':'NO SHOT')}</div>${moveTap?'<span class="move-confirm">TAP AGAIN TO MOVE</span>':''}`;
 if(!panel.hidden&&movePreviewMarkup===markup)return;
 movePreviewMarkup=markup;panel.innerHTML=markup;panel.hidden=false;hint.hidden=true;
}
function drawMovePreview(spot,shots){
 tile(spot.x,spot.z,'#b5e3ee30','#d8f9ff',.028,1.8);
 const start=project(spot.x,.04,spot.z);
 ctx.save();
 for(const {target,state} of shots){
  const end=project(target.vx,.04+(target.kind==='helicopter'?VEHICLES.helicopter.altitude:0),target.vz);
  const {color}=MOVE_SHOT_STYLE[state];
  ctx.strokeStyle=color;ctx.lineWidth=1.35;
  ctx.setLineDash(state==='blocked'?[4,5]:[]);
  ctx.beginPath();ctx.moveTo(start.x,start.y);
  if(state==='arc')ctx.quadraticCurveTo((start.x+end.x)/2,Math.min(start.y,end.y)-scale*.8,end.x,end.y);
  else ctx.lineTo(end.x,end.y);
  ctx.stroke();ctx.setLineDash([]);
  tile(target.vx,target.vz,null,color,.025,1.5);
 }
 ctx.restore();
}
let battlefieldReady=false,battlefieldLoadFailed=false;
function battlefield(t){
 setFieldProjection();for(const unit of battle.units)advanceUnitAnimation(unit,t,frameDt);
 window.IronVowScene.render(t,frameDt);
 if(battlefieldReady!==window.IronVowScene.ready||battlefieldLoadFailed!==window.IronVowScene.loadFailed)renderBattle();
 const u=current(),reachable=u&&battle.phase==='player'&&!battle.busy&&action==='move'?paths(u):null;
 const moveTile=reachable&&!targetPanelOpen&&$('#modal').hidden?(moveTap??hover):null,cost=moveTile&&reachable.get(moveTile.x+','+moveTile.z);
 const preview=cost>0?previewMoveShots(u,moveTile,cost):null;showMovePreview(preview?moveTile:null,preview);
 for(const unit of battle.units)if(unit.alive)drawUnitReadout(unit,(unit.kind?1.2:2.35)+jumpjetHeight(unit,t));
 if(reachable)for(const [key,cost] of reachable)if(cost>0){const [x,z]=key.split(',').map(Number);if(inCover({x,z}))drawCoverMarker(x,z);}
 if(cost>0){const p=project(moveTile.x,.15,moveTile.z);ctx.fillStyle='#0b141ddd';ctx.fillRect(p.x-28,p.y-26,56,18);ctx.fillStyle='#bfe4ee';ctx.font='600 11px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.fillText(cost+' AP',p.x,p.y-13);}
 drawEffects(t);
}


const ATTACK_PART_LABEL={body:'BODY',pilot:'PILOT',right:'R ARM',left:'L ARM',legs:'LEGS'};

function drawAttackCamera(){
 const sequence=activeCinematic;if(!sequence)return;
 const width=Math.min(W-32,460),x=16,y=H-72;
 const status=sequence.result||(sequence.phase==='aim'?'AIMING':sequence.part==='shield'?'SHIELD':'FIRING');
 ctx.save();ctx.fillStyle='#101820dc';ctx.fillRect(x,y,width,44);
 ctx.fillStyle='#e9bf7d';ctx.textAlign='left';ctx.font='700 12px Inter,Arial,sans-serif';
 ctx.fillText(sequence.actor.name+' / '+sequence.w.name,x+12,y+17,width-24);
 ctx.fillStyle='#e2e9e6';ctx.font='600 11px Inter,Arial,sans-serif';
 ctx.fillText(sequence.target.name+' · '+status,x+12,y+33,width-24);ctx.restore();
}
let canvasMode=null,warDiagnostics;
function draw(ts){
 const warStart=warDiagnostics?performance.now():0;
 window.IronVowPerformance?.begin(ts);
 const elapsed=Math.max(0,(ts-last)/1000||1/60),dt=Math.min(.05,elapsed);last=ts;clock+=elapsed;frameDt=dt;
 window.IronVowRenderer?.observeFrame(elapsed*1000);
 const mode=battle?'battle':page==='overworld'?'chart':page==='hangar'||page==='ship'?'hangar':page==='workshop'&&workshopView==='assigned'?'workshop':'static';
 if(mode!=='workshop'&&canvasMode==='workshop')window.IronVowWorkshop?.close();
 if(mode==='battle'||mode!==canvasMode){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
 }
 if(mode==='battle'){
  if(canvasMode!=='battle')syncHangar();
  battlefield(clock);if(activeCinematic)drawAttackCamera();
 }else if(mode==='chart'){
  window.IronVowChart?.render(clock,dt,W,H,reducedMotion);
  if(window.IronVowChart?.snapshot().shipReady){const status=$('.chart-load-status');if(status)status.textContent='';}
  if(overworldDeparture&&performance.now()-overworldDeparture.startedAt>=overworldDeparture.duration){
   overworldDeparture=null;render();$('[data-transit-choice]:not(:disabled)')?.focus({preventScroll:true});toast('Moored at '+portName(companyPort())+'.');
  }
 }else if(mode==='hangar')window.IronVowHangarRuntime?.render(clock,dt,canvas.getBoundingClientRect(),reducedMotion);
 else if(mode==='workshop')window.IronVowWorkshop?.paint(clock,dt,W,H,reducedMotion);
 else if(mode!==canvasMode)window.IronVowRenderer?.show(false);
 canvasMode=mode;
 if(warDiagnostics&&battle&&window.IronVowScene.ready)warDiagnostics.sample(window.__ironVow.snapshot(),performance.now()-warStart);
 effects.forEach(e=>e.t-=elapsed*(e.type==='shot'?1/(e.life||.4):e.type==='detonation'?1/.85:e.light&&!e.broken?5:e.type==='step'?1.8:e.type==='skill'?1.2:1.6));effects=effects.filter(e=>e.t>0);shake*=Math.exp(-dt*13);window.IronVowPerformance?.end(ts);requestAnimationFrame(draw);
}
canvas.addEventListener('wheel',e=>{if(!battle||battle.busy)return;e.preventDefault();zoomField(e.deltaY<0?1.12:1/1.12)},{passive:false});
function screenTile(x,y){return window.IronVowScene.screenTile(x,y);}


// Wrecks keep their hit proxies (they block shots and cover), but a destroyed unit is never a pick: tapping one must not lock or fire on it.
function pick(x,y){const u=window.IronVowScene.pick(x,y);return u?.alive?u:null;}
let pointerGesture=null,pinchGesture=null;
const fieldPointers=new Map();
let hangarTap;
canvas.addEventListener('pointerdown',e=>{
 if(!battle&&!careerStale&&$('#modal').hidden&&page==='hangar'&&hangarDeck==='mechs'&&e.isPrimary&&e.button===0)
  hangarTap={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointercancel',()=>{hangarTap=null;});
canvas.addEventListener('pointerup',e=>{
 const tap=hangarTap;hangarTap=null;
 if(!tap||tap.id!==e.pointerId||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8||!$('#modal').hidden)return;
 window.IronVowHangarRuntime?.pick(e.clientX,e.clientY,canvas.getBoundingClientRect());
});
canvas.addEventListener('pointerdown',e=>{
 if(!battle||battle.busy||window.IronVowScene?.ready===false||!$('#modal').hidden||e.button>0)return;
 fieldPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(fieldPointers.size===2){const [a,b]=[...fieldPointers.values()];pinchGesture={distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};pointerGesture=null;hover=moveTap=null;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);return;}
 pointerGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};
 canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!battle||battle.busy||!$('#modal').hidden)return;
 if(fieldPointers.has(e.pointerId))fieldPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinchGesture){
  if(fieldPointers.size===2){const [a,b]=[...fieldPointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
   zoomField(distance/Math.max(1,pinchGesture.distance));if(!fieldCamera.overview)panField(x-pinchGesture.x,y-pinchGesture.y);pinchGesture={distance,x,y};}
  hover=moveTap=null;e.preventDefault();return;
 }
 const gesture=pointerGesture;
 if(gesture&&gesture.id===e.pointerId){
  if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8)gesture.drag=true;
  if(gesture.drag){hover=moveTap=null;if(!fieldCamera.overview)panField(e.clientX-gesture.x,e.clientY-gesture.y)}
  gesture.x=e.clientX;gesture.y=e.clientY;
  if(gesture.drag)return;
 }
 if(e.pointerType==='touch')return;
 moveTap=null;
 const picked=pick(e.clientX,e.clientY),tile=screenTile(e.clientX,e.clientY),u=current();
 const through=picked?.team==='ally'&&u&&action==='move'&&paths(u).get(tile.x+','+tile.z);
 const p=picked&&!through?{x:picked.x,z:picked.z}:tile;
 const changed=!hover||hover.x!==p.x||hover.z!==p.z;hover=p;
 if(changed&&picked?.team==='enemy')renderBattle();
});
canvas.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hover=null});
canvas.addEventListener('pointercancel',e=>{fieldPointers.delete(e.pointerId);if(!fieldPointers.size)pinchGesture=null;pointerGesture=hover=moveTap=null});
function selectUnit(index){
 const unit=battle.units.find(u=>u.team==='ally'&&u.index===index&&u.alive&&!spent(u));
 if(!unit)return;
 selected=index;focusBattleCamera(unit);
 if(action==='jumpjet')action='move';
 if((action==='strike'&&!unit.melee)||(action==='missile'&&!shoulderWeapon(unit))||(action==='move'&&!movementLimit(unit)))action='fire';
 renderBattle();persist();
}
function focusNextReady(){
 const u=current();
 if(u&&!spent(u))return;
 const ready=battle.units.find(v=>v.team==='ally'&&v.alive&&!spent(v));
 if(ready){selected=ready.index;focusBattleCamera(ready);action=movementLimit(ready)?'move':'fire'}
}
canvas.addEventListener('pointerup',async e=>{
 fieldPointers.delete(e.pointerId);if(pinchGesture){if(!fieldPointers.size)pinchGesture=null;pointerGesture=null;return;}
 const gesture=pointerGesture;pointerGesture=null;
 if(!gesture||gesture.id!==e.pointerId||gesture.drag||!battle||battle.busy||!$('#modal').hidden)return;
 const u=current(),picked=pick(e.clientX,e.clientY),tile=screenTile(e.clientX,e.clientY);
 if(action==='jumpjet'){
  if(!jumpjetLanding(u,tile.x,tile.z))return toast('Choose a clear highlighted landing tile.');
  battle.busy=true;action='move';renderBattle();
  await useJumpjet(u,tile.x,tile.z);focusBattleCamera(u);
  battle.busy=false;focusNextReady();renderBattle();persist();return;
 }
 // A reachable ground tile takes precedence over an ally's silhouette overhanging it.
 const walk=u&&action==='move'?paths(u).get(tile.x+','+tile.z):0;
 if(picked?.team==='ally'&&!walk){selectUnit(picked.index);return}
 if(!u||spent(u))return;
 const p=picked?.team==='enemy'?picked:tile;
 hover={x:p.x,z:p.z};
 if(picked?.team==='enemy')lockedTarget=picked.id;
 if(action==='move'){
  if(picked?.team==='enemy'){
   action='fire';
   renderBattle();
   persist();
   if(W>760)toast('Target acquired. Fire when ready.');
   return;
  }
  if(!walk){moveTap=null;return toast(battle.cover.has(tile.x+','+tile.z)?'BLOCKED · '+({'ridge-rock':'Rock outcrop','relay-shield':'Relay barrier',cargo:'Cargo structure',transformer:'Transformer',conifer:'Trees',bunker:'Bunker'}[battle.field.cover[tile.x+','+tile.z]]||'Obstacle')+' · blocks movement':'Choose a highlighted tile within movement range')}
  if(e.pointerType==='touch'){
   hover=null;
   if(moveTap?.x!==tile.x||moveTap?.z!==tile.z){moveTap=tile;return}
  }
  moveTap=hover=null;
  battle.busy=true;await moveUnit(u,tile.x,tile.z);focusBattleCamera(u);
 }else{
  if(picked?.team!=='enemy')return toast('Select a hostile contact');
  const w=selectedWeapon(u,action,picked);
  if(!w)return toast('Equip a melee weapon in Workshop.');
  if(u.hp[weaponSubsystem(u,w)]<=0)return toast(w.melee?'Melee arm destroyed. Switch to fire.':'Weapon arm destroyed. Move or brace to support your lance.');
 if(u.ap<paidAttackAP(u,w))return toast('Not enough AP. Select another unit or end your turn.');
  const obstruction=attackObstruction(u,picked,w);
  if(obstruction){renderBattle();return toast(obstruction==='AIRBORNE'?'Use ranged fire.':'Ridge blocks fire.')}
  if(distance(u,picked)>combatRange(u,picked,w))return toast(w.melee?'Strike requires an adjacent target.':'Target out of range. Move closer.');
  battle.busy=true;renderBattle();await engage(u,picked,'body',w);
  if(checkEnd())return;
 }
 battle.busy=false;focusNextReady();renderBattle();persist();
});
document.addEventListener('keydown',e=>{
 if(!battle||battle.busy||window.IronVowScene?.ready===false||!$('#modal').hidden||e.repeat)return;
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 const key=e.key.toLowerCase(),u=current();
 if(!['m','f','x','q','e','1','2','3','4'].includes(key))return;
 e.preventDefault();
 if(key==='e'){endTurn();return}
 if(['1','2','3','4'].includes(key)){selectUnit(+key-1);return}
 if(!u||spent(u))return;
 if(key==='q'){skill();return}
 if(key==='m'&&movementLimit(u))action='move';
 else if(key==='f'&&canUseWeapon(u,selectedWeapon(u,'fire')))action='fire';
 else if(key==='x'&&canUseWeapon(u,selectedWeapon(u,'strike')))action='strike';
 else return;
 renderBattle();persist();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeCinematic){skipAttackCamera();return}if(!$('#modal').hidden){closeModal();return}if(!battle&&page==='journal'){e.preventDefault();returnFromJournal();return}if(targetPanelOpen){targetPanelOpen=false;renderBattle();$('#target-toggle').focus();return}moveTap=null}if(e.key==='Tab'&&!$('#modal').hidden){let btns=[...$('#modal').querySelectorAll('button')],first=btns[0],last=btns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('.brand').onclick=e=>{e.preventDefault();if(!battle)navigatePrimary('bridge')};
$('#skip-shot').onclick=skipAttackCamera;
let helpAnchor=null,helpPress=null,helpTimer;
function cancelHelpPress(){clearTimeout(helpTimer);helpPress=null}
function closeHelp(){
 cancelHelpPress();
 if(!helpAnchor)return;
 helpAnchor.removeAttribute('aria-describedby');helpAnchor=null;$('#game-help').hidden=true;
}
function showHelp(anchor){
 if(!anchor.isConnected||helpAnchor===anchor)return;
 closeHelp();
 const box=$('#game-help'),rect=anchor.getBoundingClientRect();
 helpAnchor=anchor;box.textContent=anchor.dataset.help;box.hidden=false;
 const left=Math.max(8,Math.min(innerWidth-box.offsetWidth-8,rect.left+(rect.width-box.offsetWidth)/2));
 const top=rect.bottom+box.offsetHeight+8<=innerHeight?rect.bottom:Math.max(8,rect.top-box.offsetHeight);
 box.style.left=left+'px';box.style.top=top+'px';
 anchor.setAttribute('aria-describedby','game-help');
}
const helpControl=target=>target?.closest?.('[data-help]');
document.addEventListener('pointerdown',e=>{
 cancelHelpPress();
 const anchor=helpControl(e.target);
 if(!anchor){if(!$('#game-help').contains(e.target))closeHelp();return}
 if(e.pointerType==='mouse'||e.isPrimary===false)return;
 helpPress={id:e.pointerId,x:e.clientX,y:e.clientY};
 helpTimer=setTimeout(()=>showHelp(anchor),450);
});
document.addEventListener('pointermove',e=>{
 if(helpPress?.id===e.pointerId&&Math.hypot(e.clientX-helpPress.x,e.clientY-helpPress.y)>8)cancelHelpPress();
});
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,e=>{if(helpPress?.id===e.pointerId)cancelHelpPress()});
document.addEventListener('contextmenu',e=>{if(helpControl(e.target))e.preventDefault()});
document.addEventListener('click',e=>{const anchor=helpControl(e.target);if(anchor)showHelp(anchor)});
document.addEventListener('focusin',e=>{const anchor=helpControl(e.target);if(anchor&&!helpPress)showHelp(anchor)});
document.addEventListener('focusout',e=>{if(e.target===helpAnchor)closeHelp()});
document.addEventListener('pointerover',e=>{const anchor=helpControl(e.target);if(anchor&&e.pointerType==='mouse')showHelp(anchor)});
document.addEventListener('pointerout',e=>{
 if(e.pointerType!=='mouse'||!helpAnchor||document.activeElement===helpAnchor)return;
 const box=$('#game-help');
 if((helpAnchor.contains(e.target)||box.contains(e.target))&&!helpAnchor.contains(e.relatedTarget)&&!box.contains(e.relatedTarget))closeHelp();
});
document.addEventListener('scroll',closeHelp,true);
window.addEventListener('resize',closeHelp);
window.addEventListener('blur',closeHelp);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&helpAnchor){e.preventDefault();e.stopImmediatePropagation();closeHelp()}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){closeHelp();skipAttackCamera()}syncMusic()});
function checkExternalCareer(){
 if(careerStale)return;
 if(!careerDB){try{careerIsCurrent()}catch{}return}
 const pending=pendingCareerWrite;
 void pending.then(async()=>{
  const latest=await readCareerDB(careerDB);
  if(pending!==pendingCareerWrite)return;
  if(latest!==databaseCareer)pauseStaleCareer();
  else if(databaseCareer===undefined)careerIsCurrent();
 }).catch(()=>{});
}
function startGame(){
 if(careerStale)return;
 if(lionTrial){startLionTrial(lionTrial);startAudio(false);requestAnimationFrame(draw);return}
 const resumedSortie=restoreSortie();if(resumedSortie)page='contracts';else if(save.transit)page='overworld';render();startAudio(false);requestAnimationFrame(draw);
 if(resumedSortie){toast('Sortie resumed. Your company is still in the fight.');if(resumedSortie.enemyPending)void endTurn()}
 window.addEventListener('storage',event=>{
  if(event.storageArea===localStorage&&(event.key===CAREER_STORAGE||event.key===null))checkExternalCareer();
 });
 window.addEventListener('pageshow',event=>{if(event.persisted)checkExternalCareer()});
}
if(window.indexedDB&&!lionTrial&&!benchWar&&!benchRig){
 void openCareerDB().then(async db=>{
  databaseCareer=await readCareerDB(db);
  careerDB=db;
  if(databaseCareer!==undefined)loadStoredCareer(databaseCareer);
  await restorePendingCareer();
 }).then(startGame,()=>pauseCareer('CAREER STORAGE UNAVAILABLE','<p>The saved career could not be opened. Reload to retry before continuing.</p>'));
}else if(!benchWar&&!benchRig)startGame();

// Deterministic test seam: commands call the real game operations and snapshots read actual scene bones.
window.__ironVow=(()=>{
 let seed=0,pending=null;
 const rng=value=>{let n=value>>>0;return()=>{n=(n+0x6d2b79f5)|0;let t=Math.imul(n^(n>>>15),1|n);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};};
 const unit=id=>{const u=battle?.units.find(u=>u.id===id);if(!u)throw Error('Unknown unit '+id);return u;};
 function command(fn){if(pending)throw Error('A game operation is still pending');pending=Promise.resolve().then(fn);pending.finally(()=>{pending=null;}).catch(()=>{});return pending;}
 function start(options={}){
  if(pending)throw Error('Finish the current game operation before starting another battle');
  skipAttackCamera();closeModal();seed=options.seed??0;ruleRandom=rng(seed);save=fresh();battle=null;effects=[];clock=0;selected=0;page='contracts';
  for(const [i,frame] of (options.frames||[]).entries()){if(!FRAMES[frame]||!save.units[i])throw Error('Invalid scene fixture frame');save.units[i].frame=frame;}
  for(const [i,loadout] of (options.loadouts||[]).entries()){
   const frame=pilotFrame(i),owned=[...save.owned,...portableItems(loadout)];
   if(!save.units[i]||!validHull(loadout,frame,owned))throw Error('Invalid sanctioned War loadout');
   Object.assign(save.units[i],loadout);stockFittedGear(save);
  }
  stockFittedGear(save);
  deploy(options.contract??1);closeModal();
  if(options.weapons)for(const [i,id] of options.weapons.entries()){
   const u=battle.units.find(u=>u.team==='ally'&&u.index===i),w=WEAPONS.find(w=>w.id===id&&!w.builtIn&&!w.shoulder);
   if(!u||!w)throw Error('Invalid campaign weapon fixture');if(!save.owned.includes(id))save.owned.push(id);
   const saved=save.units[i];if(w.melee){u.melee=saved.melee=id;u.weapon=saved.weapon='rifle';delete u.shield;delete saved.shield;}else u.weapon=saved.weapon=id;
  }
  stockFittedGear(save);
  return snapshot();
 }
 function snapshot(){
  return {seed,time:clock,terrainSeed:battle?.terrainSeed,busy:Boolean(battle?.busy),pending:Boolean(pending),phase:battle?.phase,turn:battle?.turn,size:battle?.size,result:!battle?save.history.at(-1):null,ready:window.IronVowScene.ready,renderer:window.IronVowRenderer.metrics(),covers:window.IronVowScene.covers,
   units:(battle?.units||[]).map(u=>{const record=window.IronVowScene.models.get(u.id),m=record?.entry?.m,feet=[],footprint=[];
    if(m?.rig)for(let i=0;i<m.rig.legs.length;i++){const leg=m.rig.legs[i],state=m.legs[i],p=leg.an.getWorldPosition(new THREE.Vector3());
     const contact=state.kneeContact&&leg.kneeShoe?.localToWorld(new THREE.Vector3(0,-.3155,.035));
     const box=m.nativeV2?.bounds('ankle.'+leg.side)||new THREE.Box3().setFromObject(leg.an);if(!box.isEmpty())for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])footprint.push([x,z]);
     feet.push({side:leg.side,ankle:p.toArray(),hip:leg.hip.getWorldPosition(new THREE.Vector3()).toArray(),reach:((leg.legA??m.dims.legA)+(leg.legB??m.dims.legB))*m.scale,target:state.foot.toArray(),plant:state.planted.toArray(),swing:state.swing||state.poseLift,settle:Boolean(state.settle),ankleHeight:m.dims.ankleH*m.scale,ground:window.IronVowScene.groundAt(p.x,p.z),kneeContact:contact?{point:contact.toArray(),ground:window.IronVowScene.groundAt(contact.x,contact.z)}:null});}
    let finite=true;m?.cont.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))finite=false;});
    const partVisual=m?Object.fromEntries(Object.entries(m.partState).map(([part,state])=>{const detachable=m.build.parts[part].filter(e=>e.detach);return[part,{state,detachable:detachable.length,visible:detachable.filter(e=>e.m.visible).length}];})):null;
    const entry=record?.entry,primary=(u.attack?.kind==='missile'&&entry?.shoulderWeapon)||entry?.primary;
    const muzzle=primary?.muzzle?.getWorldPosition(new THREE.Vector3()),barrel=primary?.muzzle?.getWorldDirection(new THREE.Vector3());
    const firing=Boolean(u.alive&&u.hp[primary?.subsystem||'right']>0&&Number.isFinite(u.attack?.fireAt)&&m?.aim.blend>.95);
    const weaponAimError=firing&&muzzle&&barrel?barrel.angleTo(m.aim.point.clone().sub(muzzle)):null;
    const muzzleDistance=firing&&muzzle?(primary.bounds?.()||new THREE.Box3().setFromObject(primary.model)).distanceToPoint(muzzle):null;
    const D=m?.dims,radius=D?(D.quad?Math.hypot(D.hipX+D.reach*.707,D.hipZ+D.reach*.707)+.55:D.restX+.75)*m.scale:1;
    return {id:u.id,frame:u.frame,weapon:u.weapon,melee:u.melee,partVisual,weaponAimError,muzzleDistance,weaponArchetype:primary?window.IronVowWeaponFX.get(primary===entry.shoulderWeapon?'missile':u.weapon).archetype:null,weaponMounted:primary?primary.mount.parent===(primary.carrier||entry.primarySocket||m.rig.arms.R.so):false,armed:entry?.armed,primaryAsset:primary?.id,kind:u.kind,team:u.team,alive:u.alive,hp:{...u.hp},max:{...u.max},ap:u.ap,x:u.x,z:u.z,vx:u.vx,vz:u.vz,moving:Boolean(u.motion),attacking:Boolean(u.attack),motion:u.motion?{fromX:u.motion.fromX,fromZ:u.motion.fromZ,toX:u.motion.toX,toZ:u.motion.toZ,start:u.motion.start,duration:u.motion.duration}:null,live:window.IronVowScene.isLive(u),object:record?.object?.uuid,root:record?.object?.position.toArray(),matrix:m?.cont.matrixWorld.toArray(),finite,radius,footprint,feet};
   })};
 }
 function rulesSnapshot(){
  return {terrainSeed:battle?.terrainSeed??null,turn:battle?.turn??null,size:battle?.size??null,
   theater:battle?.contract.field??null,result:battle?null:save.history.at(-1)??null,log:battle?.log.slice()??[],
   units:(battle?.units??[]).map(({id,frame,weapon,melee,shield,shoulder,kind,team,alive,hp,max,ap,x,z,reacted})=>
    ({id,frame:frame??null,weapon,melee:melee??null,shield:shield??null,shoulder:shoulder??null,kind:kind??null,team,alive,
     hp:{...hp},max:{...max},ap,x,z,reacted:Boolean(reacted)}))};
 }
 return {start,snapshot,rulesSnapshot,contractCount:CONTRACTS.length,
  loadCareer(record){if(pending)throw Error('Finish the current operation before loading a fixture');skipAttackCamera();closeModal();battle=null;effects=[];clock=0;return importCareer(record);},
  checkpoint(){return battle?captureSortie():null;},
  move(id,x,z){return command(async()=>{const u=unit(id);if(u.team!=='ally'||battle.phase!=='player'||battle.busy||!paths(u).get(x+','+z))throw Error('Illegal test move');selected=u.index;battle.busy=true;await moveUnit(u,x,z);battle.busy=false;renderBattle();});},
  attack(id,targetId,_part,mode='fire'){return command(async()=>{const u=unit(id),target=unit(targetId),w=selectedWeapon(u,mode,target);
   if(u.team!=='ally'||target.team!=='enemy'||!u.alive||!target.alive||battle.phase!=='player'||battle.busy||!w||!canUseWeapon(u,w)||attackObstruction(u,target,w)||barrageRestriction(u,target,w)||distance(u,target)>combatRange(u,target,w))throw Error('Illegal test attack');
   selected=u.index;battle.busy=true;await engage(u,target,'body',w);if(!checkEnd()){battle.busy=false;renderBattle();}
  });},
  choices(id){const u=unit(id),enemies=battle.units.filter(t=>t.alive&&t.team!==u.team),w=unitWeapon(u);
   return {attacks:enemies.flatMap(target=>['fire','strike','missile'].flatMap(mode=>{const weapon=selectedWeapon(u,mode,target);
    return weapon&&canUseWeapon(u,weapon)&&!attackObstruction(u,target,weapon)&&!barrageRestriction(u,target,weapon)&&distance(u,target)<=combatRange(u,target,weapon)?[{target:target.id,part:'body',mode,weapon:weapon.id,hp:target.hp.body}]:[];})),
    moves:[...paths(u)].filter(([,cost])=>cost>0).map(([key,cost])=>{const[x,z]=key.split(',').map(Number);return{x,z,cost,score:Math.min(...enemies.map(t=>Math.max(0,distance({x,z},t)-w.range)*20+(attackObstruction({...u,x,z},t,w)?12+distance({x,z},t)*2:0)))+cost*.5};}),
    currentScore:Math.min(...enemies.map(t=>Math.max(0,distance(u,t)-w.range)*20+(attackObstruction(u,t,w)?12+distance(u,t)*2:0)))};
  },
  endTurn(){return command(()=>endTurn());},
  legalMoves(id){return [...paths(unit(id))].map(([key,cost])=>{const [x,z]=key.split(',').map(Number);return{x,z,cost};});},
  project(id,part='body'){const p=window.IronVowScene.partPoint(unit(id),part).project(window.IronVowScene.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},
  get pending(){return Boolean(pending);}
 };
})();

function showWarReport(){
 const bench=window.__bench;
 modal('WAR REPORT','<pre id="war-report-data"></pre><label>Fault probe<select id="war-probe"></select></label><output id="war-probe-result"></output>',[
  {text:'CLOSE',fn:closeModal},
  {text:'COPY REPORT',fn:()=>{void navigator.clipboard.writeText(bench.report()).then(()=>toast('War report copied'),()=>toast('Copy unavailable'));}},
  {text:'RUN PROBE',fn:()=>{
   try{const result=bench.inject($('#war-probe').value);$('#war-probe-result').textContent=result?result.type+' detected':'Probe produced no anomaly';}
   catch(error){$('#war-probe-result').textContent=error.message;}
  }},
  {text:'SOAK 10',fn:()=>{closeModal();void bench.runSoak(10,bench.state.seed).then(report=>toast(report.battles+' battles · '+report.anomalies.length+' anomalies'),error=>toast(error.message));}}
 ]);
 $('#war-report-data').textContent=bench.report();
 const picker=$('#war-probe');
 for(const [id,label] of Object.entries(bench.checks))picker.add(new Option(label,id));
}
if(benchWar){
 document.body.classList.add('rig-bench-war');
 attackCameraEnabled=false;
 const diagnostics=window.IronVowSceneDiagnostics;
 warDiagnostics=diagnostics.createObserver(window.IronVowScene);
 const driver=window.IRON_VOW_SIM.createWarDriver(window.__ironVow,{
  reset:()=>warDiagnostics.reset(),
  async ready(){while(!window.IronVowScene.ready)await new Promise(requestAnimationFrame);}
 });
 let soaking=false,stop=false,lastSoak;
 const owned=[...WEAPONS.filter(w=>!w.builtIn).map(w=>w.id),...SHIELDS.map(shield=>shield.id)];
 const playable=FRAMES.map((_,id)=>id).filter(playerHull);
 function fixtures(index){
  const frames=LANCE_SLOTS.map((_,slot)=>playable[(index*LANCE_SLOTS.length+slot)%playable.length]);
  const loadouts=frames.map((frame,slot)=>{
   const stock=stockHull(frame),candidates=[stock,
    ...RANGED.map(w=>({...stock,weapon:w.id})),...MELEE.map(w=>({...stock,melee:w.id})),
    ...SHIELDS.map(shield=>({...stock,melee:null,shield:shield.id})),
    {...stock,shoulder:'vesper-shoulder'}
   ].filter(hull=>validHull(hull,frame,owned));
   return candidates[(index*5+slot*3)%candidates.length];
  });
  return {frames,loadouts};
 }

 async function runSoak(count=10,seed=42,options={}){
  if(soaking||driver.running)throw Error('A War run is already in progress');
  if(!Number.isInteger(count)||count<1)throw Error('Soak count must be a positive integer');
  const result={battles:0,ticks:0,seeds:[],winners:{},anomalies:[],chassisWeapon:{},legsWeapon:{},theaterChassis:{}};
  const add=(matrix,key)=>{matrix[key]=(matrix[key]??0)+1;};
  soaking=true;stop=false;
  try{
   for(let i=0;i<count&&!stop;i++){
    const fit=options.frames||options.weapons||options.loadouts?{}:fixtures(i);
    const report=await driver.runBattle({...fit,...options,seed:(seed+i*7919)>>>0,
     contract:options.contract??i%window.__ironVow.contractCount});
    const measured=warDiagnostics.report();
    result.seeds.push(report.seed);result.battles++;result.ticks+=measured.ticks;
    add(result.winners,report.result?report.result.win?'ally':'enemy':'unfinished');
    for(const anomaly of measured.anomalies)result.anomalies.push({seed:report.seed,...anomaly});
    for(const rig of measured.rigs){
     const legs=rig.legs??rig.frame;
     for(const id of new Set([rig.weapon,rig.melee].filter(Boolean))){
      add(result.chassisWeapon,rig.frame+'|'+id);add(result.legsWeapon,legs+'|'+id);
     }
     add(result.theaterChassis,report.theater+'|'+rig.frame);
    }
   }
   lastSoak=result;
   return result;
  }finally{soaking=false;}
 }
 window.__bench=Object.assign(driver,{checks:diagnostics.checks,inject:warDiagnostics.inject,
  diagnostics:warDiagnostics.report,runSoak,stopSoak:()=>{stop=true;},
  report:()=>JSON.stringify({state:driver.state,diagnostics:warDiagnostics.report(),soak:lastSoak},null,2)});
 driver.newBattle({seed:42});
 requestAnimationFrame(draw);
}

if(benchRig){
 const prototypeArchives={3:'gatecrasher',4:'cicada',[HELLBREAKER]:'hellbreaker',[BULWARK_FRAME]:'bulwark',[ASHIGARU_FRAME]:'scout',[SHOGUN_FRAME]:'shogun'};
 const frames=FRAMES.map((frame,id)=>({
  id,frame:id,name:frame.name,model:frame.foundry,rig:frame.rig,
  mix:frame.foundry!=null&&frame.rig!=='cairn'&&!window.IronVowRigV2.applies({frame:id}),
  authored:window.IronVowRigV2.applies({frame:id}),quad:id===REAVER_FRAME,
  stock:stockHull(id),fixed:Boolean(frame.native||frame.fixedWeapons||id===LINE_INFANTRY_FRAME||id===LINE_ELITE_FRAME),
  primaries:id===LINE_INFANTRY_FRAME||id===LINE_ELITE_FRAME?INFANTRY_PRIMARIES:
   id===ASHIGARU_FRAME?['needle-carbine','flechette-scattergun']:undefined,
  melees:breachLoadout(id)?['cleaver']:undefined,
  shield:canFitShield(id),pod:breachLoadout(id),
  archive:id===0?'rig-bench/warden-painted.glb':prototypeArchives[id]?'rig-bench/prototypes/'+prototypeArchives[id]+'.glb':null
 }));
 frames.push({id:'lion',frame:0,lionTrial:true,name:'LION',fixed:true,authored:true,quad:false,stock:{weapon:'rifle',melee:'cleaver',upgrade:0},melees:LION_TRIAL_WEAPONS});
 const request=new URLSearchParams(window.location.search);
 window.IronVowBench.mount({frames,weapons:WEAPONS,shields:SHIELDS,attackProfile,weaponRigPose,sound,
  initialFrame:request.get('frame'),initialArchive:request.get('source')==='archive'});
}
