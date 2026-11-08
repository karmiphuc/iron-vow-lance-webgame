'use strict';
const $=s=>document.querySelector(s), canvas=$('#scene'),ctx=canvas.getContext('2d');
const WEAPONS=[{id:'rifle',name:'Kestrel AR-8',type:'ASSAULT RIFLE',damage:36,range:5,ap:3,weight:14,price:0,desc:'Reliable burst fire. Balanced range and accuracy.'},{id:'shotgun',name:'Breacher SG-4',type:'SCATTER CANNON',damage:60,range:3,ap:3,weight:18,price:1500,desc:'Devastating close-range impact. Close the distance.'},{id:'missile',name:'Vesper MRL',type:'MISSILE POD',damage:45,range:7,ap:4,weight:22,price:2400,desc:'Long-range guided ordnance. Ignores cover penalties.'},{id:'rail',name:'Longbow R-12',type:'RAIL CANNON',damage:70,range:8,ap:5,weight:26,price:3600,desc:'Precision anti-armor fire. Powerful, but demanding.'},
 {id:'hailstorm',name:'Hailstorm M-8',type:'ROTARY GUN',damage:49,range:5,ap:4,weight:21,price:2200,desc:'Spins up for sustained fire at medium range.'},
 {id:'rampart',name:'Rampart AC-40',type:'AUTOCANNON',damage:61,range:6,ap:5,weight:25,price:2900,desc:'A single heavy shell with a longer reach than the scatter cannon.'},
 {id:'breaker',name:'Breaker Maul',type:'IMPACT MAUL',damage:66,range:1,ap:4,weight:20,price:1600,melee:true,desc:'An overhead strike for heavy damage against adjacent targets.'},
 {id:'cleaver',name:'Arc Cleaver',type:'HEATED BLADE',damage:40,range:1,ap:2,weight:12,price:1200,melee:true,desc:'A quick sweep for repeated strikes against an adjacent target.'},
 {id:'piledriver',name:'Piledriver',type:'HYDRAULIC RAM',damage:59,range:1,ap:3,weight:18,price:2100,melee:true,desc:'A powered point-blank thrust that punches through armor.'},
 {id:'blade',name:'Raijin HB-9',type:'HEAT BLADE',damage:64,range:1,ap:3,weight:16,price:2200,melee:true,desc:'A planted step and a committed lunge. Ignores cover against adjacent targets.'},
 {id:'morrow',name:'Morrow AC-2',type:'TWIN AUTOCANNON',damage:59,range:6,ap:4,builtIn:true,desc:'Two staggered shells from a sliding carriage. Designed to break a line at medium range.'},
 {id:'locust',name:'Locust MRL-24',type:'GUIDED MISSILE RACKS',damage:47,range:8,ap:4,builtIn:true,guided:true,desc:'Alternating launches from the two shoulder racks. Guided missiles ignore cover penalties.'},
 {id:'breach-gauntlet',name:'Breach Gauntlet',type:'ACTUATED GRIPPER',damage:53,range:1,ap:3,builtIn:true,melee:true,desc:'A braced punch from the left gripper. Strongest when the enemy closes in.'},
 {id:'pulse-bash',name:'Pulse Bash',type:'EMITTER STRIKE',damage:33,range:1,ap:2,builtIn:true,melee:true,desc:'A quick close-range strike with the left emitter housing.'}
];
const FREE_HAND_COUNTER={id:'free-hand',damage:10,range:1,ap:0,melee:true};
const HOSTILE_PAINT='#cf3f4b';
const PAINT_PRESETS=[['Factory',null],['Bone','#c6bd9f'],['Olive','#708657'],['Slate','#577eac'],['Sand','#c19960'],['Graphite','#555e69'],['Ivory','#d9ddd5']];
const RANGED=WEAPONS.filter(w=>!w.melee&&!w.builtIn),MELEE=WEAPONS.filter(w=>w.melee&&!w.builtIn);
const validPaint=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const FRAMES=[{name:'WARDEN',model:'WDN–07',role:'ASSAULT',color:'#899681',hp:160,arm:92,leg:110,move:4,armor:5},{name:'KESTREL',model:'KST–12',role:'RECON',color:'#b6a37c',hp:126,arm:78,leg:100,move:5,armor:2},{name:'BASILISK',model:'BSK–04',role:'SUPPORT',color:'#708c92',hp:180,arm:100,leg:90,move:3,armor:7}];
const PILOTS=[{name:'Mara Voss',call:'ROOK',skill:'Overdrive',desc:'+2 AP this turn. Once per battle.',color:'#9cae8b'},{name:'Jin Takeda',call:'GHOST',skill:'Deadeye',desc:'Next attack deals 50% more damage. Once per battle.',color:'#c1a477'},{name:'Elena Ortiz',call:'ANCHOR',skill:'Field repair',desc:'Restore 45 body HP. Once per battle.',color:'#83a4ac'}];
const HIRES=[
 {name:'Nadi Sato',call:'SCOUT',skill:'Target Paint',desc:'Mark a hostile within 6 tiles. The next allied attack gains 20 percentage points of accuracy. Once per battle.',color:'#9fc19a',glyph:'binoculars',fee:1100},
 {name:'Dax Mercer',call:'MARSHAL',skill:'Command Relay',desc:'Spend 1 AP to order another pilot within 5 tiles. Their next paid attack this round costs up to 2 AP less. Once per battle.',color:'#d3b07b',glyph:'shield-chevron',fee:1500},
 {name:'Inez Calder',call:'SAPPER',skill:'Breach Charge',desc:'Spend 1 AP to prime a ranged limb shot. It gains 60% weapon power and ignores half the armor. A hit stops that counter. Once per battle.',color:'#eaa675',glyph:'lightning',fee:1400},
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
   {id:'cockpit-read',name:'Cockpit Read',label:'+10 percentage points to cockpit hit chance',effects:{pilotHit:.10}},
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
    {id:'scout-shot',name:'Precision Optics',label:'+10 percentage points when targeting a pilot',effects:{pilotHit:.10}},
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
    {id:'sapper-twin',name:'Twin Charge',label:'Prime two ranged limb shots at once',effects:{breachShots:2}}
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
 {name:'GATECRASHER',model:'HV–09',role:'BREACH',color:'#a94e3c',hp:198,arm:112,leg:116,move:2,armor:8,
  native:'gatecrasher',weapon:'morrow',melee:'breach-gauntlet',brief:'Built to take the first hit. Put its heavy armor in the lane and let the twin cannon work.'},
 {name:'CICADA',model:'ML–14',role:'FIRE SUPPORT',color:'#81885e',hp:148,arm:84,leg:95,move:3,armor:4,
  native:'cicada',weapon:'locust',melee:'pulse-bash',brief:'The company’s longest reach. Keep the launch racks behind the line and fire across cover.'}
);
// Foundry IDs are appended so older career assignments and backups retain their meaning.
FRAMES.push(
 {name:'VALKYRIE',model:'VLK–01',role:'STRIKER',color:'#c9ccd0',hp:135,arm:85,leg:95,move:5,armor:3,foundry:3,cost:3600,weapon:'rifle'},
 {name:'ONI',model:'ONI–09',role:'DUELIST',color:'#8a3a40',hp:150,arm:105,leg:100,move:5,armor:4,foundry:4,cost:3200,weapon:'rifle',melee:'blade'},
 {name:'BEHEMOTH',model:'BHM–22',role:'ARTILLERY',color:'#8f8a68',hp:210,arm:90,leg:150,move:3,armor:8,foundry:5,cost:4400,weapon:'missile'},
 {name:'AEGIS',model:'AGS–07',role:'ASSAULT',color:'#899681',hp:165,arm:94,leg:108,move:4,armor:5,foundry:0,cost:2600,weapon:'rifle'},
 {name:'SHRIKE',model:'SHK–12',role:'RECON',color:'#b6a37c',hp:118,arm:76,leg:103,move:5,armor:2,foundry:1,cost:2400,weapon:'shotgun'},
 {name:'BASTION',model:'BST–04',role:'HEAVY SUPPORT',color:'#708c92',hp:188,arm:100,leg:105,move:3,armor:7,foundry:2,cost:3000,weapon:'rifle',rig:'bastion'}
);
const BASTION_FRAME=FRAMES.length-1;
const playerHull=frame=>Boolean(FRAMES[frame]&&!FRAMES[frame].enemyOnly);
const bastionRig=unit=>FRAMES[unit.frame]?.rig==='bastion';
const PART_LABEL={body:'BODY',pilot:'PILOT',right:'WEAPON ARM',left:'LEFT ARM',legs:'LEGS'};
const HELLBREAKER=FRAMES.length;
FRAMES.push({...FRAMES[3],name:'HELLBREAKER',model:'HV–09X',role:'HOSTILE BREACH',
 native:'hellbreaker',salvageOnly:true,brief:'Enemy breach chassis. Recover a wreck on No quiet frontier and rebuild it in the Workshop.'});
const PILOT_HP=[70,55,80];
const CREW_HP=[...PILOT_HP,60,72,67,61,76];
const CITADEL_FRAME=FRAMES.push({...FRAMES[BASTION_FRAME],name:'CITADEL',model:'CTD–04',weapon:'missile',rig:null,enemyOnly:true})-1;
const ENEMY_NAMES=['JACKAL','RAVEN','MARAUDER','GATEBREAKER','LOCUST','SERAPH','RONIN','TITAN','SENTINEL','RAZOR','CITADEL'];
const FOUNDRY_HOSTILES={corridor:[1,6,8,9],frontier:[7,6,5,CITADEL_FRAME,2]};
const foundryModel=frame=>FRAMES[frame]?.foundry;
const pilotFrame=(i,career=save)=>career.units[i].frame??i;
const CONTRACTS=[
 {id:'picket',field:0,name:'Picket sweep',place:'KARST BASIN · OUTER PERIMETER',tag:'PATROL INTERCEPT',pay:2000,fixedPay:true,difficulty:1,desc:'Break a light security patrol. Its lead mech may have armor and air support.',
  deployment:[[6,10],['tank',4,13],['tank',7,14],['helicopter',9,15]]},
 {id:'relay',field:0,name:'Ashes of the relay',place:'KARST BASIN · SECTOR 07',tag:'RECOVERY OPERATION',pay:3200,difficulty:1,desc:'A rival lance occupies a decommissioned relay station. Clear the site and recover its navigation core.',legacyMechs:3,
  deployment:[[6,10],[13,6],[16,3],['tank',4,13],['helicopter',10,16]]},
 {id:'corridor',field:1,name:'The iron corridor',place:'VANTA INDUSTRIAL · SECTOR 12',tag:'INTERDICTION',pay:4600,difficulty:2,desc:'Intercept an armored patrol before it reaches the refinery. Expect reinforced enemy chassis.',legacyMechs:4,
  deployment:[[7,11],[14,6],[15,15],[4,4],['tank',4,14],['helicopter',11,17],['tank',9,8]]},
 {id:'frontier',field:2,name:'No quiet frontier',place:'HALCYON OUTSKIRTS · SECTOR 19',tag:'HIGH-RISK CONTRACT',pay:6800,difficulty:3,desc:'A veteran company has claimed the frontier. Break their command lance and make your name.',legacyMechs:5,
  deployment:[[7,12],[12,6],[15,15],[4,4],[14,2],['tank',4,14],['helicopter',10,16],['tank',12,10],['helicopter',9,3]]}
];
const OLD_SORTIE_CONTRACTS=['relay','corridor','frontier'];
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
  {name:'Service Gantry',cost:2000,wins:1,rep:0,perk:'Parked hulls +12 integrity after wins · repairs −20%',detail:'Maintenance crews service hulls that stay aboard during a sortie.'},
  {name:'Machine Shop',cost:4800,wins:2,rep:20,perk:'Parked +24 · deployed +8 after wins · repairs −30%',detail:'The fabrication line stages replacement armor before the recovery shuttle returns.'}
 ]},
 crew:{name:'Crew Deck',glyph:'first-aid-kit',tiers:[
  {name:'Medbay',cost:1900,wins:1,rep:0,perk:'Wounded pilots recover after 1 rested sortie',detail:'Incapacitated pilots start with 65% pilot HP until rested. Medbay halves the normal two-sortie rest.'},
  {name:'Simulator Pods',cost:4000,wins:2,rep:20,perk:'Benched pilots +25 XP per win · field recovery',detail:'Reserves drill aboard ship. A wounded pilot also recovers after a sortie if they return conscious.'}
 ]}
};
const shipLevel=(facility,career=save)=>career.ship?.levels?.[facility]??0;
const woundDays=(id,career=save)=>career.wounds?.[id]??0;
function woundLabel(id){
 const days=Math.ceil(woundDays(id)/(shipLevel('crew')?2:1));
 return days?'WOUNDED · '+days+' REST '+(days===1?'SORTIE':'SORTIES'):'';
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
 ]}
};
const HANGAR_SERVICE_COST=350;
const hangarLevel=(room,career=save)=>career.hangar?.levels?.[room]??0;
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
 sizes[i]=1+(sizes[i]+Math.floor(Math.random()*2))%3;
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
const unitWeapon=u=>u.kind?VEHICLES[u.kind].gun:weapon(u.weapon);
const isArmed=u=>u.kind||u.hp.right>0;
const chassisMobility=(frame,legacy=false,training)=>frame.move+(legacy?0:1)+(training?.move??0);
const mobility=u=>u.kind?VEHICLES[u.kind].move:chassisMobility(FRAMES[u.frame],battle.legacy,u.training);
const mobile=u=>u.kind||u.hp.legs>0;
const freeMovement=u=>u&&u.alive&&mobile(u)&&!u.actionPhase?(u.moveLeft??mobility(u)):0;
const extraMovement=u=>Boolean(u?.alive&&mobile(u)&&u.ap>=EXTRA_MOVE_AP&&!u.extraStep);
const movementLimit=u=>freeMovement(u)+Number(extraMovement(u));
const spent=u=>Boolean(u?.alive&&u.ap===0&&(!movementLimit(u)||
 !neighborTiles(u.x,u.z).some(([x,z])=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!occupied(x,z))));
function resetMovement(u){u.moveLeft=mobility(u);u.actionPhase=false;u.extraStep=false}
function startAction(u){u.moveLeft=0;u.actionPhase=true}
const chassisParts=(frame,hull,training)=>({body:frame.hp+hull.upgrade*25+(training?.body??0),right:frame.arm,left:frame.arm,legs:frame.leg});
const chassisArmor=(frame,hull,training)=>frame.armor+hull.upgrade*2+(training?.armor??0);
const damagedArmor=armor=>Math.floor(armor/2);
const deploymentHP=(max,condition)=>Math.round(max*Math.max(.3,condition/100));
const roundAP=training=>ROUND_AP+(training?.roundAP??0);
const weaponAP=(w,training)=>w.ap-(w.melee?(training?.strikeAP??0):0);
const weaponRange=(w,training)=>w.range+(w.melee?0:(training?.range??0));
const launchesMissiles=w=>w.id==='missile'||ATTACK_PROFILES[w.id]?.effect==='missile';
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
 if(i===SAPPER)return `${training?.breachShots??1} charged limb shot(s). +${Math.round(100*(training?.breachPower??.60))}% power, ignores ${Math.round(100*(training?.breachPierce??.50))}% armor. Hits deny counters.${training?.breachRefund?' Limb destruction refunds attack AP.':''}`;
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
function fresh(){return{version:1,day:1,credits:4500,rep:0,wins:0,kills:0,owned:['rifle','missile'],units:PILOTS.map((_,i)=>({...stockHull(i),level:1,xp:0})),history:[]}}
const learnedTraining=(i,career=save)=>career.training?.[i]??[];
const earnedTraining=level=>TRAINING_POINT_LEVELS.filter(rank=>rank<=level).length;
const nextLevelXP=level=>level>=5&&level<10?400+(level-5)*25:level*100;
const trainingPoints=i=>earnedTraining(save.units[i].level)-learnedTraining(i).length;
const totalTrainingPoints=()=>PILOTS.reduce((total,_,i)=>total+trainingPoints(i),0);
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
 const id=pilotId(kind),incoming=save.reservePilots?.[id];
 if(!incoming)return false;
 const unit=save.units[i];
 save.reservePilots[pilotId(pilotClass(i))]={level:unit.level,xp:unit.xp,training:learnedTraining(i)};
 save.training??=LANCE_SLOTS.map(()=>[]);
 save.training[i]=incoming.training;
 Object.assign(unit,{pilotId:id,level:incoming.level,xp:incoming.xp});
 delete save.reservePilots[id];persist();return true;
}
const CAREER_STORAGE='iron-vow-career';
let save,storedCareer=null,careerStale=false;
try{storedCareer=localStorage.getItem(CAREER_STORAGE);save=loadCareer(JSON.parse(storedCareer))??fresh()}catch{save=fresh()}
save.owned=[...new Set([...save.owned,...save.units.flatMap(u=>[u.weapon,u.melee]).filter(id=>id&&!weapon(id).builtIn)])];
const entryPage={'?view=hangar':'hangar','?view=mechs':'hangar','?view=contracts':'contracts','?view=inn':'inn','?view=workshop':'workshop','?view=pilots':'pilots','?view=journal':'journal','?view=wiki':'journal'}[window.location?.search]??'ship';
let workshopView='assigned',hangarDeck=window.location?.search==='?view=mechs'?'mechs':'base';
let journalPage=window.location?.search==='?view=wiki'?'wiki':'orders';
let page=entryPage,selected=0,battle=null,action='move',targetPart='body',effects=[],hover=null,clock=0,last=0,muted=false,audio=null,toastTimer,inspectOpen=false,lockedTarget=null,targetPanelOpen=false,modalReturnFocus=null;
try{muted=localStorage.getItem('iron-vow-sound')==='off'}catch{}
function careerIsCurrent(){
 if(careerStale)return false;
 if(localStorage.getItem(CAREER_STORAGE)===storedCareer)return true;
 closeHelp();
 modal('CAREER UPDATED','<p>Another tab saved progress. Reload this tab to continue from the latest checkpoint.</p>',[
  {text:'RELOAD CAREER',fn:()=>window.location.reload()}
 ]);
 careerStale=true;
 for(const selector of ['header','#ui','#scene','#skip-shot'])$(selector).inert=true;
 return false;
}
function persist(enemyPending=false){
 try{
  if(!careerIsCurrent())return;
  if(battle&&battle.phase==='player'&&!battle.busy)save.sortie=captureSortie(enemyPending);
  else if(!battle)delete save.sortie;
  const snapshot=JSON.stringify(save);
  localStorage.setItem(CAREER_STORAGE,snapshot);
  storedCareer=snapshot;
 }catch{toast('Storage unavailable. Keep this tab open to retain your career.')}
}
function captureSortie(enemyPending=false){
 return{version:battle.aux||battle.launchAP?8:7,contract:battle.contract.id,legacy:battle.legacy,stockHostiles:battle.stockHostiles,slots:battle.slots,turn:battle.turn,selected,action,part:targetPart,enemyPending,
  ...(battle.aux?{aux:battle.aux}:{}),...(battle.launchAP?{launchAP:battle.launchAP}:{}),
  ...(battle.frontierHellbreaker?{frontierHellbreaker:true}:{}),
  units:battle.units.map(u=>({x:u.x,z:u.z,face:u.face??(u.team==='enemy'?1:-1),heading:u.heading??defaultHeading(u),moveLeft:u.moveLeft,actionPhase:u.actionPhase,extraStep:u.extraStep,reacted:!!u.reacted,hp:{...u.hp},ap:u.ap,brace:u.brace,skill:u.skill,boost:u.boost,painted:u.painted,order:u.order,breach:u.breach,blackout:u.blackout,recoveryUsed:u.recoveryUsed}))};
}
function dispatchSizes(){
 if(save.dispatch?.day!==save.day){
  save.dispatch={day:save.day,sizes:CONTRACTS.map(()=>1+Math.floor(Math.random()*3))};
  persist();
 }
 return save.dispatch.sizes;
}
function sortieSpawns(contract,count){
 if(count===3)return contract.deployment;
 const mechs=contract.deployment.filter(spawn=>spawn.length===2),vehicles=contract.deployment.filter(spawn=>spawn.length===3);
 if(count===1)return [...mechs.slice(0,1),...vehicles.slice(0,contract.id==='picket'?0:1)];
 return [...mechs.slice(0,2),...vehicles.slice(0,mechs.length===1?2:1)];
}
function hostileFrame(i,contract,stock=false,hellbreaker=false){
 return i===0&&hellbreaker?HELLBREAKER:(stock?null:FOUNDRY_HOSTILES[contract.id])?.[i]??i%3;
}
function contractIntel(i,count){
 const level=hangarLevel('recon');
 if(!level)return '';
 const contract=CONTRACTS[i],scanUsed=save.hangar.scanDay===save.day;
 const hostiles=sortieSpawns(contract,count).map((spawn,index)=>spawn.length===3?VEHICLES[spawn[0]].name:FRAMES[hostileFrame(index,contract,false,contract.id==='frontier')].name);
 return `<details class="contract-intel"><summary>HOSTILE MANIFEST</summary><ul>${hostiles.map(name=>'<li>'+name+'</li>').join('')}</ul></details>
  ${level===2?`<button class="rescan-contract" data-rescan="${i}" ${scanUsed||save.credits<HANGAR_SERVICE_COST?'disabled':''}>${scanUsed?'SURVEY USED TODAY':'RESURVEY · '+money(HANGAR_SERVICE_COST)}</button>`:''}`;
}
const contractPay=(contract,count,tier=shipLevel('office'))=>Math.round(contract.pay*[0,.65,.85,1][count]*[1,1.15,1.25][tier]);
const validSlots=slots=>Array.isArray(slots)&&slots.length>=1&&slots.length<=3&&new Set(slots).size===slots.length&&slots.every(i=>LANCE_SLOTS.includes(i));
function validAux(aux){
 return !!aux&&shipLevel('drop')===2&&pilotKind(aux.pilotId)>=0&&Object.hasOwn(save.reservePilots??{},aux.pilotId)&&
  Number.isInteger(aux.frame)&&!!FRAMES[aux.frame]&&(save.reserve?.[aux.frame]?.condition??0)>=30;
}
function createBattle(i,legacy=false,stockHostiles=legacy,slots=LANCE_SLOTS,frontierHellbreaker=true,aux=null,launchAP=Number(!legacy&&shipLevel('drop')>0)){
 const contract=CONTRACTS[i],field=FIELDS[contract.field];
 const layout=theaterLayouts?.[contract.field]?.cover||field.cover;
 const cover=legacy?field.cover:layout;
 battle={contract,field:{...field,cover},size:legacy?{width:10,depth:10}:NEW_BOARD,legacy,stockHostiles,slots:aux?[...slots,AUX_SLOT]:[...slots],aux,launchAP,turn:1,phase:'player',units:[],cover:new Set(Object.keys(cover)),log:['Lance deployed. Reactor signatures detected.'],busy:false};
 battle.frontierHellbreaker=!legacy&&!stockHostiles&&contract.id==='frontier'&&frontierHellbreaker;
 const allies=legacy?[[1,8],[2,9],[0,9]]:[[1,16],[2,18],[0,18]];
 const enemies=legacy?Array.from({length:contract.legacyMechs},(_,j)=>[j%3*3+2,Math.floor(j/3)]):sortieSpawns(contract,slots.length);
 battle.units=slots.map((slot,index)=>makeUnit(slot,'ally',...allies[index]));
 if(aux)battle.units.push(makeUnit(AUX_SLOT,'ally',3,18));
 for(const unit of battle.units){unit.ap+=launchAP;resetMovement(unit);preloadNativeMotion(unit.frame,unit.paint)}
 for(const [index,spawn] of enemies.entries()){
  const [kind,x,z]=spawn.length===3?spawn:[null,...spawn];
  const unit=kind?makeVehicle(kind,index,x,z):makeUnit(index,'enemy',x,z);
  if(!unit.kind)preloadNativeMotion(unit.frame,unit.paint);
  if(!legacy)unit.face=Math.sign((allies[0][0]-allies[0][1])-(x-z))||-1;
  resetMovement(unit);
  battle.units.push(unit);
 }
 for(const unit of battle.units){
  preloadTravel(unit);
  const contact=battle.units.filter(other=>other.team!==unit.team).reduce((near,other)=>!near||distance(unit,other)<distance(unit,near)?other:near,null);
  unit.heading=headingTo(contact.x-unit.x,contact.z-unit.z);unit.face=Math.sign(Math.sin(unit.heading));
 }
 focusBattleCamera(battle.units[0],true);
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
 let valid=[1,2,3,4,5,6,7,8].includes(saved.version)&&validSlots(regular)&&shipValid&&(!legacy||slots.length===3)&&typeof legacy==='boolean'&&(saved.version<4||typeof saved.stockHostiles==='boolean')&&contractIndex>=0&&(!legacy||CONTRACTS[contractIndex].legacyMechs>0)&&integer(saved.turn,1,10000)&&slots.includes(saved.selected)&&['move','fire','strike'].includes(saved.action)&&['body','pilot','left','right','legs'].includes(saved.part)&&typeof saved.enemyPending==='boolean'&&Array.isArray(saved.units);
 valid=valid&&(saved.frontierHellbreaker===undefined||saved.frontierHellbreaker===true&&saved.version>=7&&!legacy&&!saved.stockHostiles&&contractId==='frontier');
 if(valid){
  createBattle(contractIndex,legacy,saved.version<4||saved.stockHostiles===true,regular,saved.frontierHellbreaker===true,aux,launchAP);valid=saved.units.length===battle.units.length;const occupiedTiles=new Set();
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
   if(!valid)break;const key=state.x+','+state.z,alive=state.hp.body>0&&(u.kind||(state.hp.pilot??1)>0);if(alive&&occupiedTiles.has(key)){valid=false;break}if(alive)occupiedTiles.add(key);
   u.face=state.face??(u.team==='enemy'?1:-1);u.x=u.vx=state.x;u.z=u.vz=state.z;u.hp=Object.fromEntries(targetParts(u).map(part=>[part,state.hp[part]??u.max[part]]));u.ap=state.ap;u.brace=state.brace;u.skill=state.skill;u.boost=state.boost;u.alive=alive;u.downReason=alive?null:u.hp.body>0?'pilot':'body';
   if(saved.version>=5){u.heading=FIELD_HEADINGS[headingIndex(state.heading)];u.face=Math.sign(Math.sin(u.heading));u.moveLeft=state.moveLeft;u.actionPhase=state.actionPhase;u.extraStep=state.extraStep;u.reacted=state.reacted}
   else{u.heading=defaultHeading(u);if(u.ap<8||u.brace){startAction(u);u.extraStep=true}}
  }
  valid=valid&&battle.units.some(u=>u.team==='ally'&&u.alive)&&battle.units.some(u=>u.team==='enemy'&&u.alive);
 }
 if(!valid){battle=null;delete save.sortie;persist();return null}
 battle.turn=saved.turn;selected=saved.selected;if(!current()||spent(current()))selected=battle.units.find(u=>u.team==='ally'&&u.alive&&!spent(u))?.index??selected;
 action=saved.action==='strike'&&!current()?.melee?'move':saved.action;targetPart=saved.part;effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;focusBattleCamera(current(),true);battle.log=['Sortie restored from the last completed action.'];
 return{enemyPending:saved.enemyPending};
}
function toast(s){if(careerStale)return;$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function money(n){return n.toLocaleString()+' CR'}
function weapon(id){return WEAPONS.find(w=>w.id===id)||WEAPONS[0]}
function selectedWeapon(u,mode=action){return u&&(mode==='strike'?(u.melee?weapon(u.melee):null):weapon(u.weapon))}
const paidAttackAP=(u,w)=>Math.max(1,weaponAP(w,u.training)-(u.order?.discount??0));
function canUseWeapon(u,w){return Boolean(u&&w&&u.ap>=paidAttackAP(u,w)&&u.hp[w.melee?'left':'right']>0)}
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
 if(battle||!hangarLevel('personnel')||!pilot||trainingStatus(pilotKind(id),skill,pilot.training,pilot.level)!=='TRAIN')return false;
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
function counterSummary(primary,melee,training){
 const range=counterRange(primary,training),close=melee?'Adjacent melee':'Adjacent free hand';
 return range?range+' tiles or '+close.toLowerCase():close+(melee?'':' · 5–10 DMG');
}
function workshopStats(i,frame,hull,training=trainingEffects(i)){
 const kind=pilotClass(i),parts=chassisParts(frame,hull,training),armor=chassisArmor(frame,hull,training),primary=weapon(hull.weapon),melee=hull.melee&&weapon(hull.melee),pilot=CREW[kind];
 const reach=weaponRange(primary,training);
 const stats=[
  ['Free movement',chassisMobility(frame,false,training)+' tiles',MOVE_HELP],
  ['Extra movement','1 tile / '+EXTRA_MOVE_AP+' AP','One extra tile per round with working legs. It uses the last of your free movement.'],
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
   <div>${icon('crosshair')} <span><b>Strike</b> ${melee?`${weaponAP(melee,training)} AP<small>${melee.name} · adjacent</small>`:'<small>No melee equipped</small>'}</span></div>
   <div>${icon('shield-chevron')} <span><b>Brace</b> ${braceCost(training)} AP<small>Blocks ${Math.round(braceReduction(training)*100)}% damage</small></span></div>
   <div>${icon('lightning')} <span><b>${pilot.skill}</b> ${skillCost(kind,training)} AP<small>${kind===RETRIEVER&&recoveryUses(training)===2?'Twice':'Once'} per battle</small></span>${infoTip(pilot.skill,skillDescription(kind,training))}</div>
   <div>${icon('arrow-u-up-left')} <span><b>Counter</b> 0 AP<small>1 / round · ${counterSummary(primary,melee,training)}</small></span>${infoTip('counterattack',COUNTER_HELP+(training.reactionPower?' This pilot gains 25% counterattack power.':'')+(training.braceCounterRange&&counterRange(primary,training)?' While Braced, ranged reach is '+counterRange(primary,training,true)+' tiles.':''))}</div>
  </div>
 </section>`;
}
function equipmentChoices(u,options,training){
 return options.map(w=>{
  const equipped=(w.melee?u.melee:u.weapon)===w.id;
  const owned=save.owned.includes(w.id)||equipped;
  const preview=w.id==='blade'?'foundry-raijin':arsenal.weapons?.[w.id]?.left?.key;
  return `<div class="equipment-option"><button data-equip="${w.id}" class="${equipped?'active':''}" aria-pressed="${equipped}"><small>${w.type}</small><h3>${w.name}</h3>${preview?`<img class="weapon-card-art" alt="" src="${art(preview)}" loading="lazy" decoding="async">`:''}<small>${w.damage} BASE DMG / ${weaponRange(w,training)} RANGE / ${weaponAP(w,training)} AP</small><div class="note">${equipped?'EQUIPPED':owned?'EQUIP WEAPON':money(w.price)+' / BUY & EQUIP'}</div></button>${infoTip(w.name,w.desc)}</div>`;
 }).join('');
}
const hullSlot=frame=>LANCE_SLOTS.findIndex(i=>pilotFrame(i)===frame);
const hullOwned=frame=>hullSlot(frame)>=0||Boolean(save.reserve?.[frame]);
const hullOnMarket=frame=>playerHull(frame)&&!FRAMES[frame].salvageOnly&&!hullOwned(frame);
const rebuildPrice=frame=>Math.max(400,Math.round((FRAMES[frame].cost??1500)*.35/50)*50);
const scrapPrice=frame=>Math.round(rebuildPrice(frame)*.45/25)*25;
function acquireHull(frame,salvaged=false){
 if(battle||!playerHull(frame)||hullOwned(frame)||(salvaged?!save.salvage?.[frame]:!hullOnMarket(frame)))return false;
 const price=salvaged?rebuildPrice(frame):FRAMES[frame].cost??0;
 if(save.credits<price)return false;
 const hull={...stockHull(frame),condition:salvaged?rebuildIntegrity():100};
 (save.reserve??={})[frame]=hull;
 save.credits-=price;
 if(salvaged)takeSalvage(frame);
 for(const id of [hull.weapon,hull.melee])if(id&&!weapon(id).builtIn&&!save.owned.includes(id))save.owned.push(id);
 persist();return true;
}
function takeSalvage(frame){
 if(--save.salvage[frame]===0)delete save.salvage[frame];
}
function recycleHullBody(frame){
 if(battle||!playerHull(frame)||!save.salvage?.[frame])return false;
 takeSalvage(frame);save.credits+=scrapPrice(frame);persist();return true;
}
function workshopTabs(){
 const counts={assigned:3,storage:Object.keys(save.reserve??{}).length,market:FRAMES.filter((_,i)=>hullOnMarket(i)).length,salvage:Object.values(save.salvage??{}).reduce((sum,n)=>sum+n,0)};
 return `<div class="reference-tabs bay-tabs" aria-label="Workshop bays">${Object.entries(counts).map(([view,count])=>`<button type="button" data-bay="${view}" aria-pressed="${workshopView===view}">${view} <b>${count}</b></button>`).join('')}</div>`;
}
function chassisAssignments(i,training){
 const assigned=pilotFrame(i),view=workshopView;
 const choices=FRAMES.map((frame,index)=>{
  if(!playerHull(index))return '';
  const slot=hullSlot(index),reserve=save.reserve?.[index],bodies=save.salvage?.[index]??0;
  if(view==='assigned'&&slot<0||view==='storage'&&!reserve||view==='market'&&!hullOnMarket(index)||view==='salvage'&&!bodies)return '';
  const salvaged=view==='salvage',hull=salvaged?stockHull(index):slot>=0?save.units[slot]:reserve??stockHull(index);
  const {body,right,legs}=chassisParts(frame,hull,training);
  const primary=weapon(hull.weapon),melee=hull.melee&&weapon(hull.melee);
  return `<article class="bay-card">
   <img src="${frame.rig==='bastion'?art('bastion-bst04'):frame.foundry!=null?art('foundry-'+frame.foundry+'-front'):chassisArt(index,hull.weapon,1)}" alt="" loading="lazy">
   <span class="eyebrow">${frame.model} / ${frame.role}</span><h3>${frame.name}</h3>
   <p>${salvaged?bodies+' recovered '+(bodies===1?'body':'bodies')+' · '+rebuildIntegrity()+'% rebuilt':hull.condition+'% integrity'}${slot>=0&&!salvaged?' · '+pilotProfile(slot).call:''}</p>
   <dl><div><dt>Free move</dt><dd>${chassisMobility(frame,false,training)}</dd></div><div><dt>Armor</dt><dd>${chassisArmor(frame,hull,training)}</dd></div><div><dt>Body</dt><dd>${body}</dd></div><div><dt>Each arm</dt><dd>${right}</dd></div><div><dt>Legs</dt><dd>${legs}</dd></div><div><dt>Fire AP</dt><dd>${weaponAP(primary,training)}</dd></div></dl>
   <small>${primary.name} · ${weaponRange(primary,training)} tiles</small>
   <small>${melee?melee.name+' · '+weaponAP(melee,training)+' AP':'No melee'}</small>
   <small>Counter · ${counterSummary(primary,melee,training)} · 0 AP</small>
   <div class="bay-actions">${salvaged?`<button data-rebuild="${index}" ${hullOwned(index)||save.credits<rebuildPrice(index)?'disabled':''}>${hullOwned(index)?'HULL OWNED':'REBUILD · '+money(rebuildPrice(index))}</button><button data-recycle="${index}">RECYCLE · +${money(scrapPrice(index))}</button>`:view==='market'?`<button data-buy-hull="${index}" ${save.credits<(frame.cost??0)?'disabled':''}>${frame.cost?'BUY · '+money(frame.cost):'CLAIM TO STORAGE'}</button>`:`<button data-chassis="${index}" aria-pressed="${index===assigned}" ${index===assigned?'disabled':''}>${index===assigned?'SELECTED':slot>=0?'SWAP WITH '+pilotProfile(slot).call:'ASSIGN TO '+pilotProfile(i).call}</button>`}</div>
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
 if(FRAMES[frame].salvageOnly&&other<0&&!save.reserve?.[frame])return false;
 const cost=other<0&&!save.reserve?.[frame]?(FRAMES[frame].cost||0):0;
 if(save.credits<cost)return false;
 const reserve=save.reserve??={};
 const hull=({weapon,melee,paint,trim,condition,upgrade})=>({weapon,melee,paint,trim,condition,upgrade});
 const next=other>=0?hull(save.units[other]):reserve[frame]||stockHull(frame);
 if(other>=0){
   save.units[other]={...save.units[other],...hull(u),frame:previous};
 }else{
  reserve[previous]=hull(u);delete reserve[frame];save.credits-=cost;
  if(cost)for(const id of [next.weapon,next.melee]){
   if(id&&!weapon(id).builtIn&&!save.owned.includes(id))save.owned.push(id);
  }
 }
  save.units[i]={...u,...hull(next),frame};
 preloadNativeMotion(frame,next.paint);
 persist();
 return true;
}
function builtInLoadout(u,training){
 return [weapon(u.weapon),weapon(u.melee)].map(w=>`<article class="fixed-loadout"><div class="stat-heading"><span class="eyebrow">${w.melee?'SECONDARY / STRIKE':'PRIMARY / FIRE'}</span>${infoTip(w.name,w.desc)}</div><h3>${w.name}</h3><small>${w.damage} BASE DMG / ${weaponRange(w,training)} RANGE / ${weaponAP(w,training)} AP</small></article>`).join('');
}
function workshopPaint(u){
 const trim=foundryModel(pilotFrame(selected))!=null?'<div class="foundry-trim">'+[['s','Secondary','#343b42'],['a','Accent','#e08e3b']].map(([k,label,color])=>`<label class="paint-custom">${label} <input data-trim="${k}" type="color" aria-label="${label} paint" value="${u.trim?.[k]||color}"></label>`).join('')+'<button id="reset-trim" type="button">FACTORY TRIM</button></div>':'';
 return `<div class="paint-panel"><div class="eyebrow">CERAMIC PLATE PAINT</div><div class="paint-swatches">${PAINT_PRESETS.map(([name,color])=>`<button class="paint-swatch" data-paint="${color||''}" aria-pressed="${(u.paint||null)===color}" style="--swatch:${color||'#b0a88d'}"><span></span>${name}</button>`).join('')}<label class="paint-custom">Custom <input id="custom-paint" type="color" aria-label="Custom plate paint" value="${u.paint||'#c6bd9f'}"></label></div><div class="inline-help"><small>FREE · SAVED PER CHASSIS</small>${infoTip('plate paint','Hostiles use red identification paint.')}</div>${trim}</div>`;
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
 sequence.skipped=true;sequence.resume?.();closeAttackCamera(sequence);
}
function beginAttackCamera(actor,target,w,part){
 if(!battle.busy||reducedMotion||!attackCameraEnabled||document.hidden)return null;
 if(actor.team==='enemy'&&battle.hostileCameraUsed)return null;
 if(actor.team==='enemy')battle.hostileCameraUsed=true;
 const sequence={actor,target,w,part,start:clock,phase:'aim',result:'',skipped:false,resume:null};
 activeCinematic=sequence;duckMusic();document.body.dataset.shot='active';$('#skip-shot').hidden=false;
 const aimCue=foundryModel(actor.frame)===5&&!w.melee&&actor.hp.legs>0?' braces on its front knees and aims at ':
  actor.attack?.primeDuration?' steps forward and aims at ':' aiming at ';
 $('#shot-status').textContent=actor.name+aimCue+target.name;
 for(const [unit,face] of [[actor,1],[target,-1]]){
  const subject={...unit,face};
  if(unit.kind)moduleImage(vehicleKey(subject));
  else{const visual=activeWardenVisual(subject);if(visual)wardenMotionFrame(subject,visual,animationPose(subject,clock,visual))}
 }
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
const combatSamples=new Map();
const COMBAT_CUES={
 missileArm:'pod-arm',rocketLaunch:'rocket-launch',armorImpact:'armor-hit',
 heavyImpact:'heavy-hit',missileImpact:'missile-hit',boom:'missile-hit'
};
function loadCombatSamples(){
 for(const file of new Set(Object.values(COMBAT_CUES))){
  fetch(asset('assets/audio/'+file+'.wav'))
   .then(response=>{if(response.ok)return response.arrayBuffer();throw Error('Audio unavailable')})
   .then(bytes=>audio.decodeAudioData(bytes))
   .then(buffer=>combatSamples.set(file,buffer))
   .catch(()=>{});
 }
}
function playCombatSample(cue,at,volume,rate=1,pan=0){
 const buffer=combatSamples.get(COMBAT_CUES[cue]);
 if(!buffer)return false;
 const source=audio.createBufferSource(),gain=audio.createGain();
 source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;
 source.connect(gain);
 if(pan&&audio.createStereoPanner){
  const position=audio.createStereoPanner();position.pan.value=pan;
  gain.connect(position);position.connect(soundBus);
 }else gain.connect(soundBus);
 source.start(at);
 return true;
}
function startAudio(unlock=true){
 if(muted)return;
 try{
  if(!audio){
   audio=new(window.AudioContext||window.webkitAudioContext)();
   audio.onstatechange=syncMusic;
  }
  if(unlock&&(audio.state==='suspended'||audio.state==='interrupted'))audio.resume().then(syncMusic).catch(()=>{});
  syncMusic();
 }catch{}
}
function sound(type,cueVolume=1){
 if(muted)return;
 try{
  startAudio();
  if(!audio)return;
  if(!soundBus){
   soundBus=audio.createGain();soundBus.gain.value=.62;
   const compressor=audio.createDynamicsCompressor();
   compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=6;
   soundBus.connect(compressor);compressor.connect(audio.destination);
   if(typeof fetch==='function')loadCombatSamples();
  }
  const now=audio.currentTime+.005;
  const rate=type==='boom'?.78:1;
  if(playCombatSample(type,now,cueVolume*rate,rate))return;
  if(type==='missile'||type==='locust'){
   const beats=ATTACK_PROFILES[type].beats;
   const pitch=type==='locust'?1.12:1;
   if(playCombatSample('rocketLaunch',now,1,pitch,-.22)){
    playCombatSample('rocketLaunch',now+beats[1],.93,pitch*.90,.22);
    return;
   }
  }
  if(!noiseBuffer){
   noiseBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*1.2),audio.sampleRate);
   const samples=noiseBuffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  const tone=(at,duration,from,to,volume,wave='sine')=>{
   const oscillator=audio.createOscillator(),gain=audio.createGain();
   oscillator.type=wave;oscillator.frequency.setValueAtTime(from,at);
   oscillator.frequency.exponentialRampToValueAtTime(to,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*cueVolume,at+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(soundBus);oscillator.start(at);oscillator.stop(at+duration+.01);
  };
  const noise=(at,duration,frequency,end,volume,filterType='lowpass')=>{
   const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
   source.buffer=noiseBuffer;filter.type=filterType;filter.frequency.setValueAtTime(frequency,at);
   filter.frequency.exponentialRampToValueAtTime(end,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*cueVolume,at+.005);
   gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   source.connect(filter);filter.connect(gain);gain.connect(soundBus);source.start(at);source.stop(at+duration+.01);
  };
  const thump=(at,weight=1)=>{tone(at,.27,95,34,.18*weight);noise(at,.20,1000,180,.13*weight);tone(at+.025,.12,410,180,.045*weight,'triangle')};
  const gun=(at,weight=1)=>{noise(at,.16,3300,240,.18*weight);tone(at,.18,145,42,.16*weight);noise(at+.035,.19,1300,180,.045*weight)};
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
  const explosion=(at,scale=1)=>{
   // Initial crack, pressure wave, turbulent fireball and scattered fragments.
   noise(at,.075,6000,850,.32*scale);
   tone(at,.45,155,36,.30*scale);
   noise(at+.015,.85,1900,105,.29*scale);
   noise(at+.045,.70,850,170,.17*scale,'bandpass');
   tone(at+.035,.80,69,25,.19*scale);
   for(const [delay,pitch] of [[.09,2400],[.16,1750],[.25,2800],[.37,1450]]){
    tone(at+delay,.12,pitch,pitch*.42,.025*scale,'triangle');
    noise(at+delay,.10,4200,900,.035*scale,'bandpass');
   }
  };
  if(type==='boom'){explosion(now,.78);return}
  if(type==='missileArm'){
   tone(now,.22,112,220,.055,'triangle');
   noise(now+.025,.18,380,1150,.08,'bandpass');
   tone(now+.175,.06,710,250,.10,'triangle');
   return;
  }
  if(type==='armorImpact'){thump(now,.8);noise(now,.065,5300,750,.16);return}
  if(type==='missileImpact'){explosion(now,1.15);return}
  if(type==='heavyImpact'){
   noise(now,.09,5700,1100,.24);
   tone(now,.36,170,38,.25);
   noise(now+.015,.50,1750,150,.19);
   tone(now+.025,.23,830,190,.075,'triangle');
   return;
  }
  if(type==='rifle'){[0,.09,.18].forEach(t=>gun(now+t,.8));return}
  if(type==='hailstorm'){for(let i=0;i<7;i++)gun(now+i*.06,.62);tone(now,.48,90,155,.025,'sawtooth');return}
  if(type==='shotgun'){gun(now,1.35);noise(now+.035,.32,2000,200,.12);return}
  if(type==='rampart'){gun(now,1.5);tone(now+.035,.42,85,30,.13);return}
  if(type==='morrow'){[0,.299].forEach(t=>{gun(now+t,1.35);tone(now+t+.02,.31,94,32,.11)});return}
  if(type==='rail'){tone(now,.32,1450,240,.07,'sawtooth');noise(now,.3,5000,350,.12,'bandpass');tone(now+.015,.4,150,35,.16);return}
  if(type==='missile'||type==='locust'){
   for(const beat of ATTACK_PROFILES[type].beats){
    const ignition=now+beat;
    noise(ignition,.065,6100,1250,.29);
    tone(ignition+.008,.22,180,65,.25);
    noise(ignition+.036,.44,1600,230,.27);
    noise(ignition+.066,.46,630,210,.16,'bandpass');
   }
   return;
  }
  if(type==='cleaver'||type==='blade'){noise(now,.22,550,3500,.11,'bandpass');tone(now+.08,.2,1250,460,.05,'triangle');return}
  if(type==='breaker'){noise(now,.18,420,2100,.10,'bandpass');thump(now+.13,1.15);return}
  if(type==='breach-gauntlet'||type==='pulse-bash'||type===FREE_HAND_COUNTER.id){noise(now,.19,490,2100,.085,'bandpass');thump(now+.18,type==='breach-gauntlet'?1.1:.65);return}
  if(type==='piledriver'){noise(now,.12,700,2500,.07,'bandpass');thump(now+.12,1.2);tone(now+.13,.2,610,120,.08,'square')}
 }catch{}
}
const musicBuffers=new Map();
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
 if(musicBus)musicBus.gain.setTargetAtTime(activeCinematic?.15:.26,audio.currentTime,.12);
}
function updateSoundButton(){
 $('#sound').innerHTML=icon(muted?'speaker-slash':'speaker-high');
 $('#sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');
}
$('#sound').onclick=()=>{
 muted=!muted;
 try{localStorage.setItem('iron-vow-sound',muted?'off':'on')}catch{}
 if(soundBus)soundBus.gain.setTargetAtTime(muted?.0001:.62,audio.currentTime,.01);
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
 return pilot.glyph?`<span class="pilot-emblem ${style}" style="--pilot-color:${pilot.color}" aria-label="${pilot.call} insignia">${icon(pilot.glyph)}</span>`:`<img class="${style}" src="${pilotArt(kind)}" alt="${pilot.name}">`;
}
function shipPage(){
 const project=save.ship?.project;
 const queued=project&&SHIP_DECK[project.facility].tiers[shipLevel(project.facility)];
 return `<div class="page ship-page"><div class="ship-content">
  <div class="ship-banner"><div><div class="eyebrow">HALCYON / MERCENARY CARRIER</div><h1>IVS HALYARD.</h1><p>Ship command · ${save.rep} reputation</p></div>
   <div class="ship-actions"><button data-hangar-deck="mechs">MECH BAY</button><button class="primary" data-page="contracts">CONTRACTS ${icon('arrow-right')}</button></div>
  </div>
  <section class="ship-queue" aria-label="Engineering queue"><div><span class="eyebrow">ENGINEERING QUEUE</span><h2>${queued?queued.name:'Bay available'}</h2></div>
   <div class="ship-progress"><span class="tag">${queued?project.wins+' WIN'+(project.wins===1?'':'S')+' LEFT':'0 / 1 PROJECTS'}</span>${queued?`<progress aria-label="Construction progress" max="${queued.wins}" value="${queued.wins-project.wins}"></progress>`:infoTip('Engineering queue','The ship can work on one project at a time. Fulfilled contracts advance construction.')}</div>
  </section>
  <div class="ship-grid">${Object.entries(SHIP_DECK).map(([id,facility])=>{
   const rank=shipLevel(id),current=facility.tiers[rank-1],next=facility.tiers[rank],planned=rank===0?facility.tiers[1]:null;
   const building=project?.facility===id;
   const disabled=project?'QUEUE OCCUPIED':next&&save.rep<next.rep?'REPUTATION TOO LOW':next&&save.credits<next.cost?'INSUFFICIENT CREDITS':'';
   return `<article class="ship-facility" data-facility="${id}">
    <div class="ship-facility-head">${icon(facility.glyph)}<h2>${facility.name}</h2><span class="tag">MK ${rank} / ${facility.tiers.length}</span></div>
    <div class="ship-current"><small>${current?current.name+' ONLINE':'STANDARD ISSUE'}</small><span>${current?current.perk:'No ship bonus'}</span></div>
    ${next?`<div class="ship-next"><div class="ship-next-title"><h3>${next.name}</h3>${infoTip(next.name,next.detail)}</div><p>${next.perk}</p>
     <div class="ship-build"><span>${next.wins} WIN${next.wins===1?'':'S'}${next.rep?' · '+next.rep+' REP':''}</span><button type="button" data-build-facility="${id}" ${disabled?'disabled':''}>${building?'IN CONSTRUCTION':disabled||'BUILD · '+money(next.cost)}</button>${disabled&&!building?`<small>${money(next.cost)}</small>`:''}</div></div>`:'<div class="ship-next"><span class="eyebrow">FULLY OUTFITTED</span></div>'}
    ${planned?`<div class="ship-plan"><div><small>MK II</small><b>${planned.name}</b><span>${planned.perk}</span></div>${infoTip(planned.name,money(planned.cost)+' · '+planned.rep+' REP · '+planned.wins+' wins. '+planned.detail)}</div>`:''}
   </article>`;
  }).join('')}</div>
 </div></div>`;
}
function bindShip(){
 for(const button of document.querySelectorAll('[data-build-facility]'))button.onclick=()=>{
  const id=button.dataset.buildFacility,name=SHIP_DECK[id].tiers[shipLevel(id)].name;
  if(queueShipUpgrade(id)){render();$('.ship-queue h2')?.scrollIntoView({block:'nearest'});toast(name+' queued.')}
 };
}
function hangarRoster(){
 const level=hangarLevel('personnel'),used=save.hangar?.treatmentDay===save.day;
 const roster=[
  ...LANCE_SLOTS.map(i=>({id:pilotId(pilotClass(i)),pilot:save.units[i],slot:i})),
  ...Object.entries(save.reservePilots??{}).map(([id,pilot])=>({id,pilot}))
 ];
 return `<section class="base-roster" aria-label="Hangar crew">
  <div class="base-roster-head"><div><span class="eyebrow">PERSONNEL ANNEX</span><h2>Duty roster</h2></div><button data-page="inn">HIRING DESK</button></div>
  ${level===2?`<p class="base-roster-status">${used?'Trauma Ward · next treatment after a sortie':'Trauma Ward · 1 treatment available'}</p>`:''}
  <div class="base-roster-list">${roster.map(({id,pilot,slot})=>{
   const kind=pilotKind(id),wound=woundLabel(id),reserve=slot===undefined;
   const points=reserve?earnedTraining(pilot.level)-pilot.training.length:0;
   return `<article class="base-pilot">${pilotMark(kind,'pilot-thumb')}
    <div><strong>${CREW[kind].call}</strong><small>${reserve?'RESERVE':'ACTIVE · '+FRAMES[pilotFrame(slot)].name} / LV ${pilot.level}</small>${wound?`<small class="wound-status">${wound}</small>`:''}</div>
    <div class="base-pilot-actions">${reserve&&level?`<button data-reserve-training="${id}">TRAIN · ${points} PT</button>`:''}
     ${wound&&level===2?`<button data-pilot-treatment="${id}" ${used||save.credits<HANGAR_SERVICE_COST?'disabled':''}>TREAT · ${money(HANGAR_SERVICE_COST)}</button>`:''}
    </div></article>`;
  }).join('')}</div></section>`;
}
function hangarPage(){
 const project=save.hangar?.project;
 const queued=project&&HANGAR_ROOMS[project.room].tiers[hangarLevel(project.room)];
 return `<div class="page base-page"><div class="ship-content">
  <div class="ship-banner base-banner"><div><div class="eyebrow">HALCYON / FORWARD BASE 04</div><h1>HANGAR.</h1><p>Company facilities · ${save.rep} reputation</p></div>
   <div class="ship-actions"><button data-hangar-deck="mechs">MECH BAY</button><button class="primary" data-page="workshop">WORKSHOP ${icon('arrow-right')}</button></div>
  </div>
  <section class="ship-queue base-queue" aria-label="Hangar construction"><div><span class="eyebrow">FACILITY CONSTRUCTION</span><h2>${queued?queued.name:'Crew available'}</h2></div>
   <div class="ship-progress"><span class="tag">${queued?project.wins+' WIN'+(project.wins===1?'':'S')+' LEFT':'0 / 1 PROJECTS'}</span>
    ${queued?`<progress aria-label="Hangar construction progress" max="${queued.wins}" value="${queued.wins-project.wins}"></progress>`:infoTip('Hangar construction','The Hangar has its own construction crew. You can build here while the Ship is upgrading. Contract wins advance both projects.')}</div>
  </section>
  <div class="base-grid">${Object.entries(HANGAR_ROOMS).map(([id,room])=>{
   const level=hangarLevel(id),current=room.tiers[level-1],next=room.tiers[level],later=level===0?room.tiers[1]:null;
   const building=project?.room===id;
   const blocked=project?'CREW BUSY':next&&save.rep<next.rep?'REPUTATION TOO LOW':next&&save.credits<next.cost?'INSUFFICIENT CREDITS':'';
   return `<article class="ship-facility base-room" data-base-room="${id}">
    <div class="ship-facility-head">${icon(room.glyph)}<h2>${room.name}</h2><span class="tag">TIER ${level} / 2</span></div>
    <div class="ship-current"><small>${current?current.name+' ONLINE':'STANDARD FACILITY'}</small><span>${current?.perk??'Ready for expansion'}</span></div>
    ${next?`<div class="ship-next"><div class="ship-next-title"><h3>${next.name}</h3>${infoTip(next.name,next.detail)}</div><p>${next.perk}</p>
     <div class="ship-build"><span>${next.wins} WIN${next.wins===1?'':'S'}${next.rep?' · '+next.rep+' REP':''}</span>
      <button type="button" data-build-room="${id}" ${blocked?'disabled':''}>${building?'IN CONSTRUCTION':blocked||'BUILD · '+money(next.cost)}</button>
      ${blocked&&!building?`<small>${money(next.cost)}</small>`:''}</div></div>`:'<div class="ship-next"><span class="eyebrow">FULLY OUTFITTED</span></div>'}
    ${later?`<div class="ship-plan"><div><small>TIER II</small><b>${later.name}</b><span>${later.perk}</span></div>${infoTip(later.name,money(later.cost)+' · '+later.rep+' REP · '+later.wins+' wins. '+later.detail)}</div>`:''}
   </article>`;
  }).join('')}</div>
  ${hangarRoster()}
 </div></div>`;
}
function bindHangar(){
 for(const button of document.querySelectorAll('[data-hangar-deck]'))button.onclick=()=>{
  page='hangar';hangarDeck=button.dataset.hangarDeck;render();sound('click');
  $(hangarDeck==='mechs'?'#inspect':'[data-hangar-deck="mechs"]')?.focus();
 };
 for(const button of document.querySelectorAll('[data-build-room]'))button.onclick=()=>{
  const room=button.dataset.buildRoom,name=HANGAR_ROOMS[room].tiers[hangarLevel(room)].name;
  if(queueHangarUpgrade(room)){render();$('.base-queue h2')?.scrollIntoView({block:'nearest'});toast(name+' queued in the Hangar.')}
 };
 for(const button of document.querySelectorAll('[data-reserve-training]'))button.onclick=()=>trainingTree(button.dataset.reserveTraining);
 for(const button of document.querySelectorAll('[data-pilot-treatment]'))button.onclick=()=>{
  const id=button.dataset.pilotTreatment;
  if(treatPilot(id)){render();$('.base-roster-head')?.scrollIntoView({block:'nearest'});toast(CREW[pilotKind(id)].call+' cleared for duty.')}
 };
}
function spaceInn(){
 const slots=LANCE_SLOTS.map(i=>`<div class="inn-slot">${pilotMark(pilotClass(i),'pilot-thumb')}<span><small>SEAT 0${i+1} / ${FRAMES[pilotFrame(i)].name}</small><b>${pilotProfile(i).call}</b></span><span>LV ${save.units[i].level}</span></div>`).join('');
 const crew=CREW.map((pilot,kind)=>{
  if(LANCE_SLOTS.some(i=>pilotClass(i)===kind))return '';
  const reserve=save.reservePilots?.[pilotId(kind)];
  if(!reserve&&!pilot.fee)return '';
  return `<article class="inn-pilot">
   ${pilotMark(kind,'pilot-thumb')}<div><span class="eyebrow">${reserve?'RESERVE · LV '+reserve.level:'AVAILABLE FOR HIRE'}</span><h3>${pilot.call}</h3><small>${pilot.name} · ${pilot.skill}</small>${woundLabel(pilotId(kind))?`<small class="wound-status">${woundLabel(pilotId(kind))}</small>`:''}</div>
   ${infoTip(pilot.skill,pilot.desc)}
   <button ${reserve?'data-seat':'data-hire'}="${kind}" ${!reserve&&save.credits<pilot.fee?'disabled':''}>${reserve?'ASSIGN SEAT':'HIRE · '+money(pilot.fee)}</button>
  </article>`;
 }).join('');
 return `<div class="page inn-page"><div class="pagehead"><div><div class="eyebrow">HALCYON / FREEPORT 04</div><h1>SPACE INN.</h1></div><p>Mercenary exchange<br>${money(save.credits)} on hand</p></div>
  <div class="inn-links" aria-label="Freeport services"><button data-page="contracts">${icon('binoculars')} CONTRACT BOARD</button><button data-dock="market">${icon('wrench')} MECH MARKET</button><button data-dock="storage">${icon('shield-chevron')} STORAGE</button><button data-page="pilots">${icon('lightning')} TRAIN PILOTS</button></div>
  <div class="inn-grid"><section class="inn-board"><div class="stat-heading"><h2>Hiring desk</h2>${infoTip('pilot reserves','Hires start in reserve. Assign a seat to swap its pilot. XP and training follow the pilot. The chassis, weapons and paint stay in the seat.')}</div>${crew}</section>
  <section class="inn-board"><div class="stat-heading"><h2>Active lance</h2><span class="tag">3 SEATS</span></div>${slots}</section></div>
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
const wardenVisuals=window.IRON_VOW_WARDEN_ART||{},arsenal=window.IRON_VOW_ARSENAL||{},prototypes=window.IRON_VOW_PROTOTYPES||{};
const wardenUpgrade=window.WARDEN_FIDELITY;
function wardenVisual(frame,loadout,direction,stock=false){
 const face=direction===1?'right':'left';
 const native=prototypes[FRAMES[frame]?.native]?.[face];
 if(native)return native;
 const modular=(frame===0&&!stock?wardenUpgrade?.views[face]:null)||arsenal.chassis?.[frame]?.[face],legacy=frame===0?wardenVisuals[loadout]?.[face]:undefined;
 return failedArt.has(modular?.key)?legacy:modular||legacy;
}
function chassisArt(i,loadout,direction=-1,stock=false){
 if(i===BASTION_FRAME)return art('bastion-bst04');
 const model=foundryModel(i);if(model!=null)return art('foundry-'+model);
 const visual=wardenVisual(i,loadout,direction,stock);
 return art(visual&&(visual.native||imageReady(artImages[visual.key]))?visual.key:FRAMES[i].name.toLowerCase());
}
function targetPortraitKey(target){
 const model=foundryModel(target.frame);
 if(model!=null)return window.IRON_VOW_FOUNDRY_ART?.[model]?.views?.[0]?.key??'';
 return wardenVisual(target.frame,target.weapon,unitFacing(target))?.key??'';
}
function nav(){const points=battle?0:totalTrainingPoints();closeHelp();syncMusic();document.body.dataset.targetPanel=targetPanelOpen?'open':'closed';document.body.dataset.view=battle?'combat':page; $('#nav').innerHTML=['ship','hangar','contracts','inn','workshop','pilots','career','journal'].map(p=>`<button data-page="${p}" ${p==='journal'?'aria-label="Field Journal"':''} class="${p===page?'active':''}" ${battle?'disabled':''}>${p==='inn'?'INN':p.toUpperCase()}${p==='pilots'&&points?`<span class="training-badge" title="${points} training points available">${points}</span>`:''}</button>`).join('');$('#credits').textContent=money(save.credits);$('#day').textContent='DAY '+String(save.day).padStart(3,'0');}
function stat(name,val,ratio){return `<div class="stat"><span>${name}</span><b>${val}</b></div>${ratio!==undefined?`<div class="bar"><i style="width:${ratio}%"></i></div>`:''}`}
function render(){
  nav(); $('#hangar-art').style.objectPosition=['28% center','62% center','95% center'][selected]; if(battle){renderBattle();return}
  const frame=pilotFrame(selected),f=FRAMES[frame],u=save.units[selected],p=pilotProfile(selected),w=weapon(u.weapon),training=trainingEffects(selected);
  if(page==='ship')$('#ui').innerHTML=shipPage();
  if(page==='hangar'&&hangarDeck==='base')$('#ui').innerHTML=hangarPage();
  if(page==='hangar'&&hangarDeck==='mechs'){
    const lineup=PILOTS.map((_,i)=>({m:FRAMES[pilotFrame(i)],i}));
    const others=lineup.filter(v=>v.i!==selected);
    $('#ui').innerHTML=`${(f.native||f.foundry!=null)?`<div class="prototype-hangar" aria-hidden="true">${f.foundry!=null?'<canvas id="foundry-hangar" width="640" height="640"></canvas>':`<img src="${chassisArt(frame,u.weapon,1)}" alt="">`}</div>`:''}<div class="hangar-status"><span class="status-dot"></span><span>HANGAR 04 / LANCE ONLINE</span><span>HALCYON · LOCAL TIME 19:42</span></div>
    <div class="hangar-top-right"><button class="icon" data-hangar-deck="base">FACILITIES</button><button class="icon" data-page="ship">SHIP</button><button class="icon" id="inspect">${icon('info')} UNIT DETAILS</button></div>
    <div class="hangar-hotspots" aria-label="Select a mech in the hangar">${lineup.map(({m,i})=>`<button data-select="${i}" aria-label="Select ${m.name}" aria-pressed="${i===selected}"><span>${m.name} / ${m.role}</span></button>`).join('')}</div>
    ${inspectOpen?`<aside class="unit-inspect"><div class="inspect-head"><span class="eyebrow">CHASSIS 0${selected+1} / ${f.model}</span><button id="close-inspect" class="icon" aria-label="Close unit details">${icon('x')}</button></div><h2>${f.name}</h2><p class="note">${f.role} · PILOT LEVEL ${u.level}</p><div class="rule"></div>${stat('BODY INTEGRITY',chassisParts(f,u,training).body+' HP')}${stat('ARMOR',chassisArmor(f,u,training))}${stat('MOBILITY',(chassisMobility(f,false,training))+' TILES')}${stat('WEAPON',w.name)}${stat('CONDITION',u.condition+'%',u.condition)}<div class="pilot">${pilotMark(pilotClass(selected),'pilot-thumb')}<div>${p.name}<small>${p.call} / ${p.skill}</small></div></div><button class="full" data-page="workshop">${icon('wrench')} OPEN WORKSHOP</button><p class="note">${skillDescription(selected,training)}</p></aside>`:''}
    ${!inspectOpen&&wardenVisual(0,'rifle',-1)?`<a class="hangar-rig-preview" href="rig-bench/"><img src="${art(wardenVisual(0,'rifle',-1).key)}" alt="" width="66" height="66"><span><strong>WARDEN MARK II</strong><small>VIEW RIG IN MOTION</small></span></a>`:''}
    <div class="command-deck"><div class="selected-chassis"><h1>${f.name}</h1><p>${p.name} / ${f.role} / ${u.condition>=90?'COMBAT READY':u.condition>=30?'OPERATIONAL':'REPAIR REQUIRED'}</p></div>${others.map(({m,i})=>`<button class="deck-unit" data-select="${i}" aria-label="Select ${m.name}"><h3>${m.name}</h3><small>${pilotProfile(i).call} / ${m.role}</small></button>`).join('')}<button class="primary deck-cta" data-page="contracts">SELECT CONTRACT ${icon('arrow-right')}</button></div>
    <div class="hangar-footer"><span>INDEPENDENT COMPANY / DAY ${String(save.day).padStart(3,'0')}</span><span>${save.wins} CONTRACTS / ${save.rep} REPUTATION</span><span>CAREER SAVED LOCALLY</span></div>`;
  }
  if(page==='inn')$('#ui').innerHTML=spaceInn();
  if(page==='contracts'){const sizes=dispatchSizes();$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">OPERATIONS / AVAILABLE CONTRACTS</div><h1>CHOOSE YOUR BATTLE.</h1></div><p>ACTIVE LANCE<br>${PILOTS.map((_,i)=>FRAMES[pilotFrame(i)].name).join(' / ')}</p></div><div class="grid contract-grid">${CONTRACTS.map((c,i)=>`<article class="card"><div class="contract-map"><img src="${art('contract-'+FIELDS[c.field].ground)}" alt="${['Rain-soaked mountain relay station','Industrial refinery corridor at dusk','Storm-lit frontier military outpost'][c.field]}"><span class="contract-number">0${i+1}</span><span class="tag">THREAT ${i+1} / ${CONTRACTS.length}</span></div><div class="eyebrow">${c.place}</div><h2>${c.name}</h2><p>${c.desc}</p><div class="rule"></div>${stat('OPERATION',c.tag)}${stat('SORTIE SIZE',sizes[i]+' MECH'+(sizes[i]===1?'':'S')+(shipLevel('drop')===2?' + AUX OPTION':''))}${stat('HOSTILE CONTACTS',sortieSpawns(c,sizes[i]).length+' UNITS')}${stat('CONTRACT PAYMENT',money(contractPay(c,sizes[i])))}${contractIntel(i,sizes[i])}<button class="primary full" data-deploy="${i}">PREPARE SORTIE ${icon('arrow-right')}</button><p class="note">${c.fixedPay?'Fixed payout. Recommended for a new company.':i===1?'Armored patrol with possible air support.':'Reinforced hostiles. Inspect your lance before deployment.'}</p></article>`).join('')}</div><p class="note">MOVE to highlighted ground. FIRE at an enemy subsystem. Spend AP, coordinate your lance, then end your turn.</p></div>`;}
  if(page==='workshop')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">ENGINEERING / CHASSIS & LOADOUT</div><h1>BUILT TO ENDURE.</h1></div></div>
   ${workshopTabs()}
  <div class="lance-tabs" aria-label="Select pilot">${LANCE_SLOTS.map(i=>`<button data-select="${i}" class="${i===selected?'active':''}" aria-pressed="${i===selected}"><small>${pilotProfile(i).call}</small>${FRAMES[pilotFrame(i)].name}</button>`).join('')}</div>
  ${chassisAssignments(selected,training)}
   ${workshopView==='assigned'?`${workshopStats(selected,f,u,training)}
  <div class="split"><section class="workshop-chassis"><div class="eyebrow">${f.model} / ${f.role} / MK ${u.upgrade+1}</div>
  ${arsenal.chassis?.[frame]||f.native||f.foundry!=null?`<canvas class="unit-render" id="paint-preview" width="640" height="640" role="img" aria-label="${f.name} paint and loadout preview"></canvas>`:`<img class="unit-render" src="${chassisArt(frame,u.weapon)}" alt="${f.name} armored mech">`}
  <div class="workshop-meta"><h2>${f.name}</h2>${f.foundry!=null?'<button class="rotate-foundry" id="rotate-foundry" type="button">ROTATE PREVIEW</button>':''}${frame===BASTION_FRAME?'<div class="reference-tabs" aria-label="Bastion grip motion tests"><button type="button" id="bastion-test-rifle">TEST RIFLE</button><button type="button" id="bastion-test-melee">TEST MELEE</button></div>':''}${workshopPaint(u)}
  ${frame===0?'<a class="rig-bench-link" href="rig-bench/index.html">OPEN 3D RIG BENCH</a>':''}<a class="rig-bench-link" href="rig-bench/prototypes/">OPEN PROTOTYPE BAY</a>${stat('CONDITION',u.condition+'%',u.condition)}
  <div class="repairs"><button data-patch="${selected}" ${u.condition>=patchLimit()?'disabled':''}>FIELD PATCH · FREE</button><button data-repair="${selected}" ${u.condition===100?'disabled':''}>REPAIR · ${money(repairCost(selected))}</button><button data-upgrade="${selected}" ${u.upgrade>=3?'disabled':''}>${u.upgrade>=3?'MAX REINFORCEMENT':'REINFORCE · '+money(1800+u.upgrade*1200)}</button></div><div class="inline-help"><small>+25 BODY HP · +2 ARMOR PER MK</small>${infoTip('chassis maintenance','A free field patch restores a damaged hull to '+patchLimit()+'% integrity. Repair restores it to 100%.')}</div></div></section>
  <section><div class="eyebrow">LOADOUT / ${p.call}</div>${f.native?`<h2 class="loadout-title">FACTORY ARMAMENT.</h2><div class="inline-help"><small>INTEGRATED WEAPONS</small>${infoTip(f.name,f.brief)}</div>${builtInLoadout(u,training)}`:`<h2 class="loadout-title">THE RIGHT TOOL.</h2><div class="inline-help"><small>COMPANY ARMORY</small>${infoTip('company armory','Unlock each weapon once for the whole company.')}</div>
  <h3 class="loadout-slot">PRIMARY / RANGED</h3><div class="equipment">${equipmentChoices(u,RANGED,training)}</div>
  <h3 class="loadout-slot">SECONDARY / MELEE</h3><div class="equipment">${equipmentChoices(u,MELEE,training)}</div>
   ${u.melee?'<button class="remove-melee" id="remove-melee">UNEQUIP MELEE</button>':''}`}</section></div>`:''}</div>`;
  if(page==='pilots')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">PERSONNEL / ACTIVE DUTY</div><h1>HUMAN AT THE CORE.</h1></div><p>${totalTrainingPoints()} TRAINING PT AVAILABLE<br>+5% WEAPON POWER PER LEVEL</p></div>
   <div class="grid">${LANCE_SLOTS.map(i=>{const kind=pilotClass(i),pilot=CREW[kind];
    const u=save.units[i],points=trainingPoints(i);
    return `<article class="card pilot-card"><div class="pilot-image">${pilotMark(kind)}</div><div class="pilot-details">
     <div class="eyebrow">${pilot.call} / ${FRAMES[pilotFrame(i)].name}</div><h2>${pilot.name}</h2>${woundLabel(pilotId(kind))?`<span class="tag wound-status">${woundLabel(pilotId(kind))}</span>`:''}
     ${stat('PILOT LEVEL',String(u.level).padStart(2,'0'))}${stat('EXPERIENCE',u.xp+' / '+(nextLevelXP(u.level)),Math.min(100,100*u.xp/(nextLevelXP(u.level))))}
      <div class="pilot-skill">${icon(pilot.glyph??['lightning','crosshair','first-aid-kit'][kind])}<h3>${pilot.skill}</h3>${infoTip(pilot.skill,skillDescription(kind,trainingEffects(i)))}</div>
     <button type="button" id="train-pilot-${i}" data-train-pilot="${i}" class="training-open ${points?'primary':''}">
      TRAINING TREE <span>${points} PT</span>
     </button></div></article>`;
   }).join('')}</div></div>`;
  if(page==='career')$('#ui').innerHTML=`<div class="page"><div class="pagehead"><div><div class="eyebrow">COMPANY RECORD / ONGOING CAREER</div><h1>LEAVE A MARK.</h1></div><span class="rank">${save.rep>=100?'VETERAN COMPANY':save.rep>=30?'RECOGNIZED LANCE':'INDEPENDENT OUTFIT'}</span></div><div class="career-stats"><div><span class="eyebrow">COMPANY RESERVES</span><h2>${money(save.credits)}</h2><p>Reinvest in weapons, armor and the machines that bring your pilots home.</p></div><div><span class="eyebrow">FULFILLED CONTRACTS</span><h2>${String(save.wins).padStart(2,'0')}</h2><p>${save.kills} enemy machines neutralized. ${save.rep} reputation earned.</p></div><div><span class="eyebrow">DEPLOYMENT DAY</span><h2>${String(save.day).padStart(3,'0')}</h2><p>Progress saves in this browser. Export a backup to carry your company with you.</p></div></div><section class="history"><span class="eyebrow">AFTER-ACTION RECORD</span>${save.history.length?save.history.slice().reverse().map(h=>`<div class="history-row"><span>${h.name}<small>DAY ${String(h.day).padStart(3,'0')}</small></span><b>${h.win?'FULFILLED / +'+money(h.pay):'LANCE WITHDRAWN'}</b></div>`).join(''):'<p style="margin-top:24px">No sorties recorded. Your first contract is waiting.</p>'}<div class="settings"><button id="export">EXPORT CAREER</button><button id="import">IMPORT BACKUP</button><input hidden type="file" id="file" accept="application/json"><button id="attack-camera" aria-pressed="${attackCameraEnabled}">ATTACK CAM ${attackCameraEnabled?'ON':'OFF'}</button><button id="reset">NEW CAREER</button></div></section></div>`;
  if(page==='journal')$('#ui').innerHTML=`<div class="page journal-page"><div class="pagehead"><div><div class="eyebrow">OPERATIONS / REFERENCE</div><h1>FIELD JOURNAL.</h1></div></div>${journalMarkup(journalPage)}</div>`;
  bind();
  if(page==='pilots')document.querySelectorAll('[data-train-pilot]').forEach(button=>button.onclick=()=>trainingTree(+button.dataset.trainPilot));
  if(page==='workshop')bindWorkshop();
   if(page==='inn')bindInn();
  if(page==='ship')bindShip();
  if(page==='ship'||page==='hangar')bindHangar();
  if(page==='contracts')for(const button of document.querySelectorAll('[data-rescan]'))button.onclick=()=>{
   const i=Number(button.dataset.rescan);
   if(rerollDispatch(i)){render();$(`[data-deploy="${i}"]`)?.focus();toast('New approach surveyed. Dispatch updated.')}
  };
  if(page==='hangar'&&hangarDeck==='mechs'){drawFoundryHangar();$('#inspect').onclick=()=>{inspectOpen=!inspectOpen;render()};if(inspectOpen)$('#close-inspect').onclick=()=>{inspectOpen=false;render()}}
  if(page==='journal')bindJournal($('#ui'));
}
function repairCost(i){return Math.ceil((100-save.units[i].condition)*14*[100,80,70][shipLevel('repair')]/100)}
function bind(){document.querySelectorAll('[data-patch]').forEach(b=>b.onclick=()=>{save.units[selected].condition=Math.max(patchLimit(),save.units[selected].condition);persist();render();toast('Emergency field patch applied. Full repairs recommended.')});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(!battle){page=b.dataset.page;if(page==='workshop')workshopView='assigned';if(page==='hangar')hangarDeck='base';render();sound('click')}});document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.select;render();sound('click')});document.querySelectorAll('[data-deploy]').forEach(b=>b.onclick=()=>prepareSortie(+b.dataset.deploy));document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{let w=weapon(b.dataset.equip),u=save.units[selected];if(w.builtIn||FRAMES[pilotFrame(selected)].native)return;if(!save.owned.includes(w.id)&&(w.melee?u.melee:u.weapon)!==w.id){if(save.credits<w.price)return toast('Insufficient credits');save.credits-=w.price;save.owned.push(w.id)}u[w.melee?'melee':'weapon']=w.id;persist();render();toast(w.name+' equipped')});document.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{let cost=repairCost(selected);if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;save.units[selected].condition=100;persist();render();toast('Chassis restored to full integrity')});document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{let u=save.units[selected],cost=1800+u.upgrade*1200;if(save.credits<cost)return toast('Insufficient credits');save.credits-=cost;u.upgrade++;persist();render();toast('Chassis reinforcement installed')});if($('#export')){$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iron-vow-career.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{let n=JSON.parse(await e.target.files[0].text());const restored=importCareer(n);toast(restored?'Career and active sortie restored':n.version===2&&n.sortie?'Foundry career imported. Start a new sortie.':'Career backup restored')}catch{toast('Invalid career backup')}};$('#reset').onclick=()=>modal('NEW CAREER?','This replaces your company progress in this browser. Export a backup first if you want to keep it.',[{text:'KEEP MY CAREER',fn:closeModal},{text:'START FRESH',fn:()=>{save=fresh();persist();closeModal();render()}}]);
 $('#attack-camera').onclick=()=>{attackCameraEnabled=!attackCameraEnabled;try{localStorage.setItem('iron-vow-attack-camera',attackCameraEnabled?'on':'off')}catch{}render()};
 }}
function validHull(u,frame){
 const f=FRAMES[frame];
 return !!u&&playerHull(frame)&&(f.native?u.weapon===f.weapon&&u.melee===f.melee:
  RANGED.some(w=>w.id===u.weapon)&&(u.melee==null||MELEE.some(w=>w.id===u.melee)))&&
  (u.paint==null||validPaint(u.paint))&&(u.trim==null||!!u.trim&&typeof u.trim==='object'&&['s','a'].every(k=>u.trim[k]==null||validPaint(u.trim[k])))&&Number.isFinite(u.condition)&&u.condition>=0&&u.condition<=100&&
  Number.isInteger(u.upgrade)&&u.upgrade>=0&&u.upgrade<=3;
}
function validSave(s){
 if(!s||s.version!==1||!Number.isFinite(s.credits)||s.credits<0||!Number.isInteger(s.day)||s.day<1||
    ![s.rep,s.wins,s.kills].every(Number.isFinite)||!Array.isArray(s.owned)||
    !s.owned.every(id=>WEAPONS.some(w=>w.id===id&&!w.builtIn))||!Array.isArray(s.history)||s.history.length>500||
    !s.history.every(h=>h&&CONTRACTS.some(c=>c.name===h.name)&&Number.isFinite(h.day)&&typeof h.win==='boolean'&&Number.isFinite(h.pay))||
    !Array.isArray(s.units)||s.units.length!==PILOTS.length)return false;
 if(!s.units.every((u,i)=>u&&Number.isInteger(pilotFrame(i,s))&&validHull(u,pilotFrame(i,s))&&
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
 if(s.hangar!==undefined&&!validHangar(s))return false;
 if(s.wounds!==undefined&&!validRecord(s.wounds,([id,days])=>(pilots.has(pilotKind(id))||Object.hasOwn(s.reservePilots??{},id))&&[1,2].includes(days)))return false;
 if(s.salvage!==undefined&&!validRecord(s.salvage,([id,count])=>String(Number(id))===id&&playerHull(Number(id))&&Number.isSafeInteger(count)&&count>0))return false;
 if(s.dispatch!==undefined&&(!s.dispatch||s.dispatch.day!==s.day||!Array.isArray(s.dispatch.sizes)||s.dispatch.sizes.length!==CONTRACTS.length||!s.dispatch.sizes.every(n=>Number.isInteger(n)&&n>=1&&n<=3)))return false;
 if(s.reserve===undefined)return true;
 return !!s.reserve&&typeof s.reserve==='object'&&!Array.isArray(s.reserve)&&Object.entries(s.reserve).every(([key,u])=>{
  const i=Number(key);
  return Number.isInteger(i)&&String(i)===key&&!frames.has(i)&&validHull(u,i);
 });
}
function validRecord(record,check){return Boolean(record&&typeof record==='object'&&!Array.isArray(record)&&Object.entries(record).every(check))}
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
 if(!base||!validRecord(base.levels,([room,level])=>Object.hasOwn(HANGAR_ROOMS,room)&&[1,2].includes(level)))return false;
 for(const day of [base.treatmentDay,base.scanDay])if(day!==undefined&&(!Number.isInteger(day)||day<1||day>career.day))return false;
 const job=base.project;
 if(job===undefined)return true;
 if(!job||!Object.hasOwn(HANGAR_ROOMS,job.room))return false;
 const next=HANGAR_ROOMS[job.room].tiers[hangarLevel(job.room,career)];
 return !!next&&Number.isInteger(job.wins)&&job.wins>=1&&job.wins<=next.wins;
}
function loadCareer(record){
 if(record?.version!==2)return validSave(record)?restoreTraining(record):null;
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
 migrated.owned=[...new Set([...owned,...hulls.flatMap(h=>[h.weapon,h.melee]).filter(Boolean)])];
 return migrated;
}
function importCareer(record){
 if(battle)throw Error('A sortie is active');
 const imported=loadCareer(record);
 if(!imported)throw Error('Invalid career backup');
 save=imported;
 const restored=restoreSortie();
 if(restored)page='contracts';
 persist(restored?.enemyPending);
 render();
 if(restored?.enemyPending)void endTurn();
 return Boolean(restored);
}
function modal(title,body,buttons){if(careerStale)return;if($('#modal').hidden)modalReturnFocus=document.activeElement;$('#modal').hidden=false;$('#modal').innerHTML=`<div class="modalbox" role="dialog" aria-modal="true" aria-label="${title}"><div class="eyebrow">IRON VOW / COMMAND UPLINK</div><h1>${title}</h1><div>${body}</div><div class="buttons">${buttons.map((b,i)=>`<button class="${i===buttons.length-1?'primary':''}" id="modal-${i}">${b.text}</button>`).join('')}</div></div>`;buttons.forEach((b,i)=>$('#modal-'+i).onclick=b.fn);$('#modal-0').focus()}
function closeModal(){if(careerStale)return;closeHelp();$('#modal').hidden=true;if(modalReturnFocus?.isConnected)modalReturnFocus.focus();modalReturnFocus=null}
function quickOrders(){
 const topics=[
  ['arrows-out-cardinal','Move','Free tiles, then +1 tile for '+EXTRA_MOVE_AP+' AP',MOVE_HELP+' Drag to pan or tap the map. Raised terrain blocks movement. Shielded tiles grant cover.'],
  ['crosshair','Fire','Choose a subsystem, then fire','Body or pilot loss disables a mech. Cockpit shots are harder and deal half damage. Destroy the weapon arm to stop fire, legs to stop movement, or the left arm to halve armor.'],
  ['crosshair','Strike','Adjacent ground targets','Equip melee in the Workshop. Strike needs a working left arm. Gunships require ranged attacks and can cross cover. Missiles ignore cover.'],
  ['shield-chevron','Brace','1–2 AP · blocks 50% or more','Brace lasts until your next turn. Training can reduce the cost. Pilot skills can be used once per battle.'],
  ['arrow-u-up-left','Counter','0 AP · 1 per round',COUNTER_HELP],
  ['lightning','End turn','The hostile lance acts','Select your three units in the bottom bar. Neutralize all enemies to win. Tanks and gunships have hull HP and award pilot XP.'],
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
  ['Paint a hard-to-hit subsystem target before the squad fires.','Paint from cover, then move or fire before the enemy closes.'],
  ['Order an ally carrying an expensive weapon while they still have AP.','Order the front-line ally to brace or let them fire before moving.'],
  ['Prime before targeting a protected weapon arm. A charged hit cancels the immediate counter.','Move, shoot a limb and use the rest of your movement to break contact.'],
  ['Jam a heavy gun before committing the lance. Drain its AP before the enemy acts.','Stop a close-range enemy from advancing while your lance moves into cover.'],
  ['Restore a disabled weapon arm or legs to get a sidelined mech back into the fight.','Take the field and survive to bring extra wrecks back to the Workshop.']
 ];
 return `<section class="pilot-wiki" aria-label="Pilot classes and skills">
  <div class="stat-heading"><h2>Pilot classes &amp; skills</h2>${infoTip('training ranks',FOUNDATION_HELP+' Training points are earned at levels 1 through 6, then at 8 and 10. Your level 5 doctrine unlocks ranks 6, 8 and 10 in its path.')}</div>
  ${CREW.map((pilot,i)=>`<details class="wiki-pilot"><summary><b>${pilot.call}</b><span>${roles[i]} · ${pilot.skill}</span></summary>
   <div class="wiki-profile"><span class="eyebrow">${pilot.name} / SIGNATURE SKILL</span><p><b>${pilot.skill}</b> · ${pilot.desc}</p>
    <div class="wiki-paths">${PILOT_TREES[i].map((path,index)=>`<section aria-label="${path.name}">
     <h3>${icon(path.glyph)} ${path.name}</h3><p>${tactics[i][index]}</p>
     <ol>${path.nodes.map((node,rank)=>`<li><small>LV ${TRAINING_LEVELS[rank]}${rank===DOCTRINE_RANK?' · DOCTRINE':''}</small><b>${node.name}</b><span>${node.label}</span></li>`).join('')}</ol>
    </section>`).join('')}</div>
   </div></details>`).join('')}
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
function makeUnit(i,team,x,z){
 const ally=team==='ally',aux=ally&&i===AUX_SLOT?battle.aux:null;
 const frame=aux?aux.frame:ally?pilotFrame(i):hostileFrame(i,battle.contract,battle.stockHostiles,battle.frontierHellbreaker),f=FRAMES[frame];
 const u=aux?save.reserve[frame]:ally?save.units[i]:{...stockHull(frame),upgrade:Math.max(0,battle.contract.difficulty-1),level:battle.contract.difficulty,
  weapon:f.weapon||['rifle','shotgun','missile'][i%3]};
 const pilot=aux?pilotKind(aux.pilotId):ally?pilotClass(i):undefined,crew=aux?save.reservePilots[aux.pilotId]:u;
 const training=aux?effectsForTraining(pilot,crew.training):ally?trainingEffects(i):undefined;
 const {body,...limbs}=chassisParts(f,u,training);
 const max={body,pilot:ally?CREW_HP[pilot]:PILOT_HP[i%PILOT_HP.length],...limbs};
 const hp=Object.fromEntries(Object.entries(max).map(([part,n])=>[part,part==='pilot'?n:deploymentHP(n,u.condition)]));
 if(ally&&woundDays(pilotId(pilot)))hp.pilot=Math.ceil(max.pilot*.65);
 return{id:team+i,index:i,team,pilot,x,z,vx:x,vz:z,frame,name:ally?f.name:(ENEMY_NAMES[frame]??f.name)+' '+(i+1),weapon:u.weapon,melee:u.melee??null,
  paint:ally?u.paint??null:HOSTILE_PAINT,trim:ally?u.trim:null,upgrade:u.upgrade,level:crew.level,training,armor:chassisArmor(f,u,training),max,hp,ap:roundAP(training),brace:false,skill:false,boost:false,alive:true};
}
const sortiePilot=u=>u.index===AUX_SLOT?save.reservePilots[battle.aux.pilotId]:save.units[u.index];
const sortieHull=u=>u.index===AUX_SLOT?save.reserve[u.frame]:save.units[u.index];
function auxiliaryChoices(){
 if(shipLevel('drop')<2)return '';
 const pilots=Object.entries(save.reservePilots??{}),hulls=Object.entries(save.reserve??{}).filter(([,hull])=>hull.condition>=30);
 if(!pilots.length||!hulls.length)return '<p class="note">Auxiliary Cradle ready · Keep one reserve pilot and one stored hull at 30% integrity or better.</p>';
 return `<fieldset class="auxiliary-choices"><legend>Auxiliary Cradle</legend>
  <label class="aux-enable"><input type="checkbox" id="use-aux"> Deploy one reserve mech</label>
  <label>Reserve pilot<select id="aux-pilot">${pilots.map(([id,p])=>`<option value="${id}">${CREW[pilotKind(id)].call} · LV ${p.level}${woundDays(id)?' · WOUNDED':''}</option>`).join('')}</select></label>
  <label>Stored hull<select id="aux-frame">${hulls.map(([frame,h])=>`<option value="${frame}">${FRAMES[frame].name} · ${h.condition}%</option>`).join('')}</select></label>
 </fieldset>`;
}
function prepareSortie(i){
 if(battle)return;
 const size=dispatchSizes()[i],ready=LANCE_SLOTS.filter(slot=>save.units[slot].condition>=30),chosen=new Set(ready.slice(0,size));
 modal('SORTIE ASSIGNMENT',`<div class="stat-heading"><span class="eyebrow">${CONTRACTS[i].name} / ${size} SEAT${size===1?'':'S'}</span>${infoTip('sortie seats','Contract capacity is rolled for each company day. Select the required number of operational mechs. Pilots who stay aboard recover from wounds. A wounded pilot starts combat at 65% pilot HP.')}</div>
  <div class="seat-choices">${LANCE_SLOTS.map(slot=>`<button type="button" data-sortie-seat="${slot}" aria-pressed="${chosen.has(slot)}" ${!ready.includes(slot)?'disabled':''}><b>${FRAMES[pilotFrame(slot)].name} · ${pilotProfile(slot).call}</b><small>${save.units[slot].condition}% INTEGRITY${ready.includes(slot)?'':' · REPAIR NEEDED'}${woundDays(pilotId(pilotClass(slot)))?' · '+woundLabel(pilotId(pilotClass(slot))):''}</small></button>`).join('')}</div>
  ${ready.length>=size?auxiliaryChoices():''}
  <p class="note" id="sortie-count" aria-live="polite"></p>`,
  [{text:'CANCEL',fn:closeModal},...(ready.length<size?[{text:'OPEN WORKSHOP',fn:()=>openRepair(LANCE_SLOTS.find(slot=>!ready.includes(slot)))}]:[
   {text:'DEPLOY',fn:()=>{if(chosen.size===size&&!battle){
    const aux=$('#use-aux')?.checked?{pilotId:$('#aux-pilot').value,frame:Number($('#aux-frame').value)}:null;
    closeModal();deploy(i,false,[...chosen].sort(),aux);
   }}}
  ])]);
 const buttons=[...document.querySelectorAll('[data-sortie-seat]')],launch=ready.length>=size?$('#modal-1'):null;
 const sync=()=>{
  for(const button of buttons)button.setAttribute('aria-pressed',String(chosen.has(Number(button.dataset.sortieSeat))));
  if(launch)launch.disabled=chosen.size!==size;
  $('#sortie-count').textContent=ready.length<size?'Repair additional hulls to meet the required seats.':chosen.size+' / '+size+' selected'+($('#use-aux')?.checked?' + 1 AUX':'');
 };
 for(const button of buttons)button.onclick=()=>{
  const slot=Number(button.dataset.sortieSeat);
  if(!chosen.delete(slot)){
   if(chosen.size===size)chosen.delete(chosen.values().next().value);
   chosen.add(slot);
  }
  sync();
 };
 if($('#use-aux'))$('#use-aux').onchange=sync;
 sync();
}
function openRepair(slot){
 closeModal();page='workshop';workshopView='assigned';selected=slot;render();
}
function deploy(i,legacy=false,slots=LANCE_SLOTS,aux=null){
 if(battle||!CONTRACTS[i]||!validSlots(slots))return;
 if(aux&&(legacy||!validAux(aux)))return toast('The auxiliary seat requires a reserve pilot and an operational stored hull.');
 const damaged=slots.find(slot=>save.units[slot].condition<30);
 if(damaged!==undefined){
  modal('REPAIR REQUIRED','<p>A selected chassis has less than 30% integrity.</p>',[{text:'OPEN WORKSHOP',fn:()=>openRepair(damaged)}]);return;
 }
 createBattle(i,legacy,legacy,slots,true,aux);selected=slots[0];action='move';targetPart='body';effects=[];hover=null;lockedTarget=null;targetPanelOpen=false;
 persist();render();sound('click');if(save.history.length===0)guide();
}
function current(){return battle?.units.find(u=>u.team==='ally'&&u.index===selected&&u.alive)}
function occupied(x,z){return battle.units.some(u=>u.alive&&u.x===x&&u.z===z)}
const neighborTiles=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
function paths(u,flight=false){
 const max=movementLimit(u),costs=new Map([[u.x+','+u.z,0]]),queue=[[u.x,u.z]];
 for(let k=0;k<queue.length;k++){
  const [x,z]=queue[k],cost=costs.get(x+','+z);
  if(cost>=max)continue;
  for(const [a,b] of neighborTiles(x,z)){
   const key=a+','+b;
   if(!onBoard(a,b)||costs.has(key)||occupied(a,b)||(u.kind!=='helicopter'&&battle.cover.has(key)))continue;
   costs.set(key,cost+1);queue.push([a,b]);
  }
 }
 if(u.kind==='helicopter'&&!flight)for(const key of battle.cover)costs.delete(key);
 return costs;
}
function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)}
function inCover(t){return t.kind!=='helicopter'&&neighborTiles(t.x,t.z).some(([x,z])=>battle.cover.has(x+','+z))}
const chargedLimbShot=(a,w,part,reaction)=>Boolean(a.breach&&!reaction&&!w.melee&&limbPart(part));
function hitChance(a,t,part,w=weapon(a.weapon),reaction=false){
 const training=a.training,aim=(w.melee?training?.meleeHit:training?.rangedHit)??0;
 const cockpit=part==='pilot'?(training?.pilotHit??0):0;
 const cover=inCover(t)&&w.id!=='missile'&&!w.guided&&!w.melee&&!(a.brace&&training?.braceAim)?.19:0;
 const support=(a.team==='ally'?(t.painted?.aim??0):0)+(reaction?0:a.order?.aim??0);
 const breachAim=chargedLimbShot(a,w,part,reaction)?training?.breachAim??0:0;
 return Math.min(.98,Math.max(part==='pilot'?.32:.5,.96-(part==='body'?0:part==='pilot'?.27:.13)-(a.max.pilot&&a.hp.pilot<a.max.pilot*.5?.10:0)-cover+.015*(a.level-1)+aim+cockpit+support+breachAim-(a.blackout?.aim??0)));
}
function shieldProtection(target){
 if(target.team!=='ally')return 0;
 const guardian=battle?.units?.find(u=>u.training?.shieldNet);
 return guardian&&guardian!==target&&guardian.alive&&guardian.brace&&distance(guardian,target)===1?guardian.training.shieldNet:0;
}
function damage(a,t,w=weapon(a.weapon),part='body',reaction=false){
 const training=a.training,weaponPower=(w.melee?training?.meleePower:training?.rangedPower)??0;
 const limb=limbPart(part),limbPower=limb?(training?.limbPower??0):0;
 const reactionPower=reaction?(training?.reactionPower??0):0;
 const support=(a.team==='ally'?(t.painted?.power??0):0)+(reaction?0:a.order?.power??0);
 const charged=chargedLimbShot(a,w,part,reaction),breachPower=charged?training?.breachPower??.60:0;
 const power=w.damage*(1+.05*(a.level-1))*(a.boost?deadeyePower(training):1)*(1+weaponPower+limbPower+reactionPower+support+breachPower);
 const armor=t.hp.left===0?damagedArmor(t.armor):t.armor;
 const pierce=Math.max(w.id==='piledriver'?.75:0,w.melee?(training?.meleePierce??0):0,limb?(training?.limbPierce??0):0,charged?training?.breachPierce??.50:0);
 const amount=Math.max(5,Math.round((power-armor*(1-pierce))*(t.brace?1-braceReduction(t.training):1)*(1-shieldProtection(t))));
 return w===FREE_HAND_COUNTER?Math.min(amount,10):amount;
}
function partDamage(a,t,part,w,reaction=false){
 const amount=damage(a,t,w,part,reaction);
 return part==='pilot'?Math.max(3,Math.round(amount*.5)):amount;
}
function aiPart(a,t,w){
 let choice='body',best=0;
 for(const p of t.kind?['body']:['body','pilot','right','legs']){
  if(t.hp[p]<=0)continue;
  const value=hitChance(a,t,p,w)/Math.ceil(t.hp[p]/partDamage(a,t,p,w))*({body:1,pilot:1.02,right:.43,legs:.24})[p];
  if(value>best){choice=p;best=value}
 }
 return choice;
}
function addLog(s){battle.log.push(s);battle.log=battle.log.slice(-4)}
function renderBattle(){
  nav();const u=current(),under=hover&&battle.units.find(t=>t.alive&&t.team==='enemy'&&t.x===hover.x&&t.z===hover.z),target=under||battle.units.find(t=>t.alive&&t.id===lockedTarget)||battle.units.find(t=>t.alive&&t.team==='enemy');
  if(u&&!battle.busy&&action!=='move'&&u.hp.legs>0&&!reducedMotion){
   for(const face of [1,-1]){
    const atlas=wardenVisual(u.frame,u.weapon,face)?.attackMotion;
    if(atlas)attackMotionImage(atlas,u.paint);
   }
  }
  const aimPart=targetParts(target).includes(targetPart)?targetPart:'body';
  const targetReaction=reactionStatus(target),counter=target&&u?reactionWeapon(target,u):null;
  const targetStatus=[target?.blackout?'JAMMED':'',target?.painted?'PAINTED · '+target.painted.shots:''].filter(Boolean).join(' / ');
  const ready=battle.phase==='player'&&!battle.busy,canMove=Boolean(u&&movementLimit(u)),canFire=canUseWeapon(u,selectedWeapon(u,'fire')),canStrike=canUseWeapon(u,selectedWeapon(u,'strike')),chosen=selectedWeapon(u)||selectedWeapon(u,'fire');
  $('#ui').innerHTML=`<div class="battle-top"><span class="eyebrow">${battle.contract.tag}</span><h2>${battle.contract.name}</h2><p class="field-terrain">${battle.field.label}</p><p>Eliminate all hostile contacts.<br>${battle.units.filter(t=>t.team==='enemy'&&t.alive).length} hostile signatures remaining</p><div style="display:flex;gap:16px;margin-top:10px"><button class="icon" id="manual" ${battle.busy?'disabled':''}>JOURNAL</button><button class="icon" id="withdraw" ${battle.busy?'disabled':''}>WITHDRAW</button></div></div>
  ${tacticalMapMarkup()}
  <div class="turn">ROUND ${String(battle.turn).padStart(2,'0')}<small>${battle.phase==='player'?'YOUR LANCE / TAKE COMMAND':'HOSTILE LANCE / STAND BY'}</small></div>
  <button class="target-toggle" id="target-toggle" aria-expanded="${targetPanelOpen}" aria-controls="target-panel">${icon('crosshair')}<span><strong>${target?.name||'NO TARGET'}</strong><small>${targetStatus||'SUBSYSTEM DETAILS'}</small></span></button><aside class="combatpanel" id="target-panel" aria-label="Target subsystem details"><div class="inspect-head"><span class="eyebrow">HOSTILE / TARGET SUBSYSTEM</span><button class="icon close-target" id="close-target" aria-label="Close target details">${icon('x')}</button></div><h3>${target?.name||'AREA SECURED'}</h3>${targetStatus?`<span class="combat-status">${targetStatus}</span>`:''}${target?`<div class="combat-target"><img class="${target.kind?'vehicle-target':foundryModel(target.frame)!=null?'enemy foundry-target':'enemy'}" data-target-id="${target.id}" data-visual-key="${target.kind?'':targetPortraitKey(target)}" src="${target.kind?art(vehicleKey(target)):chassisArt(target.frame,target.weapon,unitFacing(target),true)}" alt="Target ${target.name}"></div>`:''}<div class="parts">${targetParts(target).map(p=>`<button data-part="${p}" class="${p===aimPart?'active':''}" style="--part-hp:${target?100*target.hp[p]/target.max[p]:0}%" aria-pressed="${p===aimPart}"><span>${target?.kind?'HULL':PART_LABEL[p]}</span><b>${target?target.hp[p]+'/'+target.max[p]:'—'}</b></button>`).join('')}</div><div class="note">${target&&u?`${Math.round(hitChance(u,target,aimPart,chosen)*100)}% HIT / ${partDamage(u,target,aimPart,chosen)} DMG<br>${!canReachTarget(chosen,target)?'AIRBORNE / USE RANGED FIRE':distance(u,target)<=weaponRange(chosen,u.training)?'IN WEAPON RANGE':'OUT OF RANGE'}${inCover(target)&&!chosen.melee?' / IN COVER':''}`:'SELECT A HOSTILE TO INSPECT'}<br>${target?.kind?'DESTROY HULL TO NEUTRALIZE':'DISABLE BODY OR PILOT'}</div>${target&&!target.kind?`<div class="reaction-row"><span class="note reaction-status">${icon('arrow-u-up-left')} COUNTER ${targetReaction}${counter?' / '+(counter===FREE_HAND_COUNTER?'FREE HAND':counter.melee?'MELEE':'RANGED'):targetReaction==='READY'&&u?' / OUT OF REACH':''}</span>${infoTip('target counterattack',COUNTER_HELP)}</div>`:''}${u?`<div class="combat-selected"><span class="eyebrow">${CREW[u.pilot].call} / ${u.ap} AP</span><p style="margin-top:7px"><b>${chosen.name}</b><br>${CREW[u.pilot].skill}: ${u.skill?'USED':skillDescription(u.pilot,u.training)}</p></div>`:''}</aside>
  <div class="log">${battle.log.map(l=>'<div class="log-line">'+l+'</div>').join('')}</div><div class="hint">${battle.busy?'RESOLVING COMBAT':action==='move'?(u?('MOVE / '+freeMovement(u)+' FREE'+(extraMovement(u)?' / +1 TILE FOR '+EXTRA_MOVE_AP+' AP':'')+(u.actionPhase?' / ACTION PHASE':'')):'MOVE / SELECT A READY MECH'):(action==='strike'?'STRIKE / ADJACENT HOSTILE / ':'FIRE / SELECT HOSTILE / ')+(chosen?paidAttackAP(u,chosen):3)+' AP PER ATTACK'+(u&&chargedLimbShot(u,chosen,aimPart,false)?' / CHARGED':'')}</div>
  <div class="battle-bottom"><div class="unitbuttons">${battle.units.filter(t=>t.team==='ally').map(t=>`<button data-unit="${t.index}" class="${t.index===selected?'active':''} ${spent(t)?'spent':''}" ${!t.alive||spent(t)||battle.busy?'disabled':''}>${pilotMark(t.pilot,'pilot-thumb')}<span><b>${t.name}</b><small>${t.alive?(spent(t)?'SPENT / ':t.ap+' AP / '+freeMovement(t)+' MOVE<br>')+'REACTION '+reactionStatus(t)+(t.order||t.breach?'<br><strong class="unit-status">'+[t.order?'ORDERED':'',t.breach?'CHARGE ×'+t.breach:''].filter(Boolean).join(' / ')+'</strong>':''):t.downReason==='pilot'?'PILOT DOWN':'DISABLED'}</small></span></button>`).join('')}</div><div class="actionbuttons"><button id="move" class="${action==='move'?'active':''}" ${!u||!ready||!canMove?'disabled':''}>${icon('arrows-out-cardinal')}<span>MOVE <span class="key-hint">M</span></span></button><button id="fire" class="${action==='fire'?'active':''}" ${!u||!ready||!canFire?'disabled':''}>${icon('crosshair')}<span>FIRE <span class="key-hint">F</span></span></button><button id="strike" class="${action==='strike'?'active':''}" ${!ready||!canStrike?'disabled':''}>${icon('crosshair')}<span>STRIKE <span class="key-hint">X</span></span></button><button id="skill" aria-label="${u?CREW[u.pilot].skill:'Pilot skill'}" title="${u?skillDescription(u.pilot,u.training):''}" ${!u||spent(u)||u.skill||!ready||u.ap<skillCost(u.pilot,u.training)||(targetedSkill(u.pilot)&&!supportTargets(u).length)||(u.pilot===SAPPER&&u.hp.right<=0)||(u.pilot===2&&u.hp.body===u.max.body&&!repairableLimbs(u).length)?'disabled':''}>${icon('lightning')}<span>${u?['OVERDRIVE','DEADEYE','REPAIR','PAINT','RELAY','CHARGE','BLACKOUT','RECOVER'][u.pilot]:'SKILL'} <span class="key-hint">Q</span></span></button><button id="brace" title="Brace: ${braceCost(u?.training)} AP, blocks ${Math.round(braceReduction(u?.training)*100)}% damage" ${!u||u.ap<braceCost(u.training)||u.brace||!ready?'disabled':''}>${icon('shield-chevron')}<span>BRACE <span class="key-hint">/ ${braceCost(u?.training)} AP</span></span></button><button id="end" class="primary" ${battle.busy?'disabled':''}>END TURN</button></div></div>`;
  refreshTargetPortrait();
  bindTacticalMap();
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{if(!battle.busy)selectUnit(+b.dataset.unit)});
  document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{targetPart=b.dataset.part;if(W<=760)targetPanelOpen=false;renderBattle();if(W<=760)$('#target-toggle').focus();persist()});
  $('#move').onclick=()=>{if(canMove){action='move';renderBattle();persist()}};$('#fire').onclick=()=>{action='fire';renderBattle();persist()};$('#strike').onclick=()=>{if(canStrike){action='strike';renderBattle();persist()}};$('#skill').onclick=skill;
  $('#brace').onclick=()=>{if(u&&u.ap>=braceCost(u.training)&&!u.brace&&!battle.busy){startAction(u);u.ap-=braceCost(u.training);braceUnit(u);addLog(u.name+' braced for incoming fire.');focusNextReady();renderBattle();persist()}};
  $('#end').onclick=endTurn;$('#manual').onclick=()=>guide();$('#target-toggle').onclick=()=>{targetPanelOpen=!targetPanelOpen;renderBattle();if(targetPanelOpen)$('#close-target').focus()};$('#close-target').onclick=()=>{targetPanelOpen=false;renderBattle();$('#target-toggle').focus()};
  $('#withdraw').onclick=()=>{if(battle.busy)return;modal('BREAK CONTACT?','<p>Withdraw your lance. You retain earned experience, but forfeit payment and salvage. Combat damage persists.</p>',[{text:'STAY & FIGHT',fn:closeModal},{text:'WITHDRAW',fn:()=>{closeModal();finish(false)}}])};
}
function braceUnit(u){
 if(u.brace)return;
 u.brace=true;u.braceTime=clock;
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
function route(u,x,z){
 const m=paths(u,true),end=x+','+z;if(!m.has(end)||battle.cover.has(end))return[];let path=[],a=x,b=z;
 while(a!==u.x||b!==u.z){path.unshift({x:a,z:b});let prev=[[a+1,b],[a-1,b],[a,b+1],[a,b-1]].find(([q,r])=>m.get(q+','+r)===m.get(a+','+b)-1);if(!prev)return[];[a,b]=prev}return path;
}
async function moveUnit(u,x,z){
 const steps=route(u,x,z);
 if(!steps.length)return;
 const free=Math.min(freeMovement(u),steps.length);
 u.moveLeft=freeMovement(u)-free;
 if(steps.length>free){startAction(u);u.extraStep=true;u.ap-=EXTRA_MOVE_AP}
 const grounded=travelAtlas(u)?.grounded;
 if(!grounded&&!u.kind&&FRAMES[u.frame].native&&!reducedMotion)await readyNativeMotion(u);
 const travel=preloadTravel(u);
 if(travel&&!imageReady(travel)&&travel.decode)await Promise.race([travel.decode().catch(()=>{}),delay(900)]);
 const paintedGait=upgradedWardenTravel(travelAtlas(u));
 const duration=reducedMotion?.12:grounded?1.40:paintedGait?1.06:u.kind?VEHICLES[u.kind].step:MECH_MOTION[u.frame].step,gaitBase=u.walkCount||0;
 const segments=[];
 if(paintedGait||grounded){
  let fromX=u.x,fromZ=u.z;
  for(let i=0;i<steps.length;){
   const dx=steps[i].x-fromX,dz=steps[i].z-fromZ;
   let end=i+1;
   while(end<steps.length&&steps[end].x-steps[end-1].x===dx&&steps[end].z-steps[end-1].z===dz)end++;
   const length=end-i,paces=wardenPaces(length,gaitBase+i,Boolean(grounded));
   for(let step=i;step<end;step++)segments[step]={index:step-i,length,paces};
   fromX=steps[end-1].x;fromZ=steps[end-1].z;i=end;
  }
 }
 for(let i=0;i<steps.length;i++){
  const p=steps[i],fromX=u.x,fromZ=u.z;
  const turning=turnToward(u,p.x-fromX,p.z-fromZ);if(turning)await turning;
  if(grounded){
   const detail=travelDetail(u,grounded,headingIndex(displayedHeading(u)));
   const images=[detail.image,u.paint&&moduleImage(detail.key+'-paint')].filter(image=>image?.decode&&!imageReady(image));
   if(images.length)await Promise.race([Promise.allSettled(images.map(image=>image.decode())),delay(1400)]);
  }
  const mass=u.kind?1:MECH_MOTION[u.frame].mass;
  sound(u.kind?(u.kind==='tank'?'track':'rotor'):'hydraulic',mass);
  u.x=p.x;u.z=p.z;u.motion={fromX,fromZ,toX:p.x,toZ:p.z,start:clock,duration,gaitBase:gaitBase+i,stepIndex:i,totalSteps:steps.length,segment:segments[i]};
  if(grounded&&!reducedMotion){
   u.motion.contacts=segments[i].paces.filter(pace=>pace.to>segments[i].index&&pace.to<=segments[i].index+1);
  }
  if(!grounded&&!u.kind&&FRAMES[u.frame].native&&!reducedMotion){
   await delay(duration*500);
   effects.push({type:'step',x:(fromX+p.x)/2,z:(fromZ+p.z)/2,t:1,mass:MECH_MOTION[u.frame].mass,side:1});
   sound('step',mass*.84);
   sound('hydraulic',mass*.72);
   await delay(duration*500);
  }else await delay(duration*1000);
  u.vx=p.x;u.vz=p.z;u.motion=null;u.landTime=clock;
  if(!u.kind&&(!grounded||reducedMotion)){effects.push({type:'step',x:p.x,z:p.z,t:1,mass:MECH_MOTION[u.frame].mass,side:FRAMES[u.frame].native?-1:(gaitBase+i)%2?1:-1});sound('step',mass)}
  if(!reducedMotion&&!u.kind&&(u.frame===2||u.frame===3||u.frame===HELLBREAKER||foundryModel(u.frame)!=null))shake=Math.max(shake,MECH_MOTION[u.frame].mass*.75);
 }
 u.walkCount=gaitBase+steps.length;
}
async function shoot(a,t,part,w=unitWeapon(a),reaction=false){
 if(t.kind)part='body';
 if(!canReachTarget(w,t))return;
 const profile=ATTACK_PROFILES[w.id],effectKind=profile.effect||w.id,rockets=effectKind==='missile';
 if(!a.kind&&FRAMES[a.frame].native&&!reducedMotion)await readyNativeMotion(a);
 const paid=reaction?0:paidAttackAP(a,w),charged=chargedLimbShot(a,w,part,reaction);
 if(!reaction){if(!a.order?.keepMove&&!(charged&&a.training?.breachMove))startAction(a);a.ap-=paid}
 const turning=turnToward(a,t.x-a.x,t.z-a.z);if(turning)await turning;
 const clip=w.melee?'strike':'fire',native=!a.kind&&wardenVisual(a.frame,a.weapon,a.face,a.team==='enemy')?.timing?.[clip];
 const plantedBastion=a.brace&&bastionRig(a);
 const plantedWarden=a.brace&&a.hp.legs>0&&upgradedWardenTravel(travelAtlas(a));
 const braceTimeLeft=Math.max(0,WARDEN_BRACE_DURATION-(clock-(a.braceTime??-100)));
 const primeDuration=!a.kind&&a.hp.legs>0&&!reducedMotion?
  (plantedWarden?braceTimeLeft:plantedBastion?Math.max(0,1.22-(clock-(a.braceTime??-100))):reaction?.40:ATTACK_STEP.duration):0;
 a.attack={kind:w.id,start:clock,fireAt:null,releaseAt:null,primeDuration,native:native?{...native,clip}:null};
 if(primeDuration){
  sound('hydraulic',MECH_MOTION[a.frame].mass);
  const visual=activeWardenVisual(a);
  if(visual)wardenMotionFrame(a,visual,animationPose(a,clock,visual));
 }
 const sequence=reaction?null:beginAttackCamera(a,t,w,part);
 const windup=reducedMotion?.06:native?native.cue*native.duration:profile.raise+(sequence?(primeDuration?.12:.51):0),raise=primeDuration+windup;
 try{
 if(primeDuration){
  await waitAttack(primeDuration*1000,sequence);
  if(!sequence?.skipped){
   effects.push({type:'step',actor:a.id,x:a.x,z:a.z,t:1,mass:MECH_MOTION[a.frame].mass,attackPlant:true});
   sound('step',MECH_MOTION[a.frame].mass);
   sound('prime',MECH_MOTION[a.frame].mass);
  }
 }
 const armTime=rockets?Math.min(windup,.28):0;
 if(armTime){
  if(windup>armTime)await waitAttack((windup-armTime)*1000,sequence);
  if(!sequence?.skipped)sound('missileArm',windup<.28?.55:1);
 }
 await waitAttack((armTime||windup)*1000,sequence);
 a.fireTime=clock;a.attack.fireAt=clock;
 if(sequence){sequence.phase='fire';sequence.fireAt=clock}
 const flight=profile.beats.at(-1)+profile.travel;
 const hit=Math.random()<=hitChance(a,t,part,w,reaction);
 const impact=freezeAttachment(t,part);
 if(!hit){impact.ox+=.55*(a.face||1);impact.oy-=.38}
 effects.push({type:'shot',actor:a.id,target:t.id,part,kind:w.id,x:a.x,z:a.z,tx:t.x,tz:t.z,t:1,born:clock,life:flight+.12,origins:[],impact});sound(w.id);
 const lastBeat=profile.beats.at(-1);
 if(rockets){
  await waitAttack(profile.travel*1000,sequence);
  if(!sequence?.skipped)sound('missileImpact',.62);
 }
 await waitAttack((rockets?lastBeat:flight)*1000,sequence);
 a.attack.releaseAt=clock;
 if(sequence){sequence.phase='result';sequence.impactAt=clock}
 let jammed=false,keepBoost=false;
 if(!hit){
  if(sequence)sequence.result='MISS';
  if(rockets)sound('missileImpact',.83);
  effects.push({type:'text',x:t.x,z:t.z,t:1,text:'MISS'});addLog(a.name+' missed '+t.name+'.');
 }else{
  const d=partDamage(a,t,part,w,reaction),label=t.kind?'HULL':PART_LABEL[part];t.hitTime=clock;t.hitPart=part;t.hitDamage=d;const hitX=(t.x-t.z)-(a.x-a.z),hitY=((t.x+t.z)-(a.x+a.z))*.5,hitLength=Math.hypot(hitX,hitY)||1;
  const before=t.hp[part];
  t.hitVector={x:hitX/hitLength,y:hitY/hitLength};shake=Math.max(shake,w.id==='rail'||w.id==='breaker'?7:4);t.hp[part]=Math.max(0,before-d);
  const failsafe=part==='body'&&t.hp.body===0&&t.training?.repairFailsafe&&!t.skill;
  if(failsafe){t.skill=true;t.skillTime=clock;fieldRepair(t)}
  if(sequence)sequence.result=failsafe?'FAILSAFE':t.hp.pilot===0?'PILOT DOWN':t.hp.body<=0?'TARGET DOWN':t.hp[part]===0?'SYSTEM DISABLED':'−'+d+' '+label;
  effects.push({type:'boom',target:t.id,part,x:t.x,z:t.z,t:1,big:false});effects.push({type:'text',x:t.x,z:t.z,t:1,text:'−'+d+' '+label});addLog(a.name+' → '+t.name+' / '+label+' −'+d);sound(rockets?'missileImpact':profile.melee||['rail','rampart','shotgun'].includes(effectKind)?'heavyImpact':'armorImpact');
  if(failsafe)addLog(t.name+' triggered Failsafe.');
  if(!reaction&&w.melee&&a.training?.strikeBrace)braceUnit(a);
  if(t.hp.body<=0||t.hp.pilot===0){
   beginDestruction(t,t.hp.body>0?'pilot':'body');addLog(t.name+(t.downReason==='pilot'?': pilot down.': ' neutralized.'));
   if(a.team==='ally'){save.kills++;sortiePilot(a).xp+=t.kind?VEHICLES[t.kind].xp:35}
   if(!reaction){
     const refund=w.melee?(a.training?.strikeRefund??0):a.boost&&a.training?.deadeyeRefund?paid:0;
    if(refund){a.ap+=refund;addLog(a.name+' recovered '+refund+' AP.')}
   }
  }
  else if(t.hp[part]===0)addLog(t.name+': '+part+' destroyed.');
   if(!reaction&&before>0&&t.hp[part]===0&&limbPart(part)){
    jammed=Boolean(a.training?.armJam&&part!=='legs');
    if(charged&&a.training?.breachRefund){a.ap+=paid;addLog(a.name+' recovered '+paid+' AP.')}
   keepBoost=Boolean(a.boost&&a.training?.deadeyeCascade);
  }
   if(charged)jammed=true;
 }
 if(charged&&--a.breach===0)delete a.breach;
 if(!reaction&&a.order&&--a.order.shots===0)delete a.order;
 if(a.team==='ally'&&t.painted&&(--t.painted.shots===0||!t.alive))delete t.painted;
 if(hit&&w.id==='blade'&&!reducedMotion){
  a.hitstop=t.hitstop={at:clock,until:clock+.085};
  await waitAttack(85,sequence);
 }
 if(sequence&&!sequence.skipped)$('#shot-status').textContent='Impact. '+sequence.result;
 a.boost=keepBoost;
 const recover=native&&!reducedMotion?Math.max(.12,native.duration-windup-flight):profile.recover;
 a.attack.returnAt=clock+recover;
 const settle=recover+(primeDuration?ATTACK_STEP.returnDuration:0);
 const recovery=t.alive?settle:reducedMotion?.35:Math.max(settle,t.kind?.84:DESTRUCTION.end);
 const hold=sequence?Math.max(settle,(t.alive?2.43:2.66)-raise-flight):recovery;
 await waitAttack(hold*1000,sequence);
 if(sequence)closeAttackCamera(sequence);
 if(recovery>hold)await waitAttack((recovery-hold)*1000,sequence);
 return jammed;
 }finally{
  a.attack=null;
  if(sequence)closeAttackCamera(sequence);
 }
}
function reactionStatus(u){
 if(!u?.alive||u.kind)return 'UNAVAILABLE';
 if(u.blackout)return 'JAMMED';
 if(u.reacted)return 'USED';
 return u.hp.left>0||u.hp.right>0&&counterRange(unitWeapon(u),u.training,u.brace)>0?'READY':'UNAVAILABLE';
}
function reactionWeapon(defender,attacker){
 if(reactionStatus(defender)!=='READY'||!attacker?.alive)return null;
 const range=distance(defender,attacker),close=range===1&&defender.hp.left>0&&canReachTarget(FREE_HAND_COUNTER,attacker);
 if(close&&defender.melee)return weapon(defender.melee);
 const ranged=unitWeapon(defender),reach=counterRange(ranged,defender.training,defender.brace);
 if(defender.hp.right>0&&reach&&range<=reach)return ranged;
 return close?FREE_HAND_COUNTER:null;
}
async function engage(attacker,defender,part,w){
 if(await shoot(attacker,defender,part,w)){addLog(defender.name+' counter jammed.');return}
 const counter=reactionWeapon(defender,attacker);
 if(!counter)return;
 defender.reacted=true;
 addLog(defender.name+(counter===FREE_HAND_COUNTER?' counters with a free hand.':counter.melee?' counters in melee.':' returns fire.'));
 await shoot(defender,attacker,'body',counter,true);
 if(defender.training?.counterBrace)braceUnit(defender);
}
function checkEnd(){if(!battle)return true;if(!battle.units.some(u=>u.alive&&u.team==='enemy')){finish(true);return true}if(!battle.units.some(u=>u.alive&&u.team==='ally')){finish(false);return true}return false}
async function endTurn(){
 if(!battle||battle.busy)return;
 persist(true);targetPanelOpen=false;battle.busy=true;battle.phase='enemy';battle.hostileCameraUsed=false;
 const enemies=battle.units.filter(u=>u.team==='enemy'&&u.alive);
 enemies.forEach(u=>{u.ap=ROUND_AP-(u.blackout?.ap??0);u.brace=false;resetMovement(u)});renderBattle();
 for(const enemy of enemies){
  const allies=battle.units.filter(u=>u.team==='ally'&&u.alive);
  if(!allies.length)break;
  const target=allies.sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0],primary=unitWeapon(enemy);
  const alert=battle.legacy||distance(enemy,target)<=(enemy.kind==='helicopter'?11:12)||targetParts(enemy).some(p=>enemy.hp[p]<enemy.max[p]);
  if(!alert)continue;
  if(!enemy.blackout?.hold&&distance(enemy,target)>primary.range&&movementLimit(enemy)>0){
   const options=[...paths(enemy)].map(([key,cost])=>{
    const [x,z]=key.split(',').map(Number);
    return{x,z,cost,d:distance(target,{x,z})};
   }).sort((a,b)=>a.d-b.d||a.cost-b.cost);
   const next=options[0];
   if(next&&next.d<distance(enemy,target))await moveUnit(enemy,next.x,next.z,next.cost);
  }
  while(enemy.alive&&target.alive){
   const strike=enemy.melee&&distance(enemy,target)===1?weapon(enemy.melee):null;
   const w=strike&&canUseWeapon(enemy,strike)?strike:primary;
   if(enemy.ap<w.ap||(!enemy.kind&&!canUseWeapon(enemy,w))||distance(enemy,target)>w.range)break;
   await engage(enemy,target,aiPart(enemy,target,w),w);renderBattle();
   if(checkEnd())return;
   if(enemy.kind)break;
  }
  if(!isArmed(enemy))addLog(enemy.name+' cannot fire: weapon arm destroyed.');
 }
 if(checkEnd())return;
 battle.turn++;battle.phase='player';battle.busy=false;
 battle.units.forEach(u=>{u.reacted=false;delete u.order;delete u.blackout;if(u.team==='ally'&&u.alive){u.ap=roundAP(u.training);u.brace=false;resetMovement(u)}});
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
 const b=battle,c=b.contract,promotions=[];
 const retriever=win?b.units.find(u=>u.pilot===RETRIEVER&&u.alive):null;
 const recovered=win?b.units.filter(u=>u.team==='enemy'&&!u.kind&&!u.alive&&playerHull(u.frame))
  .sort((a,z)=>Number(Boolean(FRAMES[z.frame].salvageOnly))-Number(Boolean(FRAMES[a.frame].salvageOnly))||z.hp.body-a.hp.body)
  .slice(0,1+(retriever?.training?.wreckExtra??0)):[];
 for(const wreck of recovered){const bodies=save.salvage??={};bodies[wreck.frame]=(bodies[wreck.frame]??0)+1}
 const seats=b.slots.filter(slot=>slot!==AUX_SLOT).length;
 const reward=win?contractPay(c,seats):0;
 const premium=win?reward-contractPay(c,seats,0):0;
 const salvage=win&&!c.fixedPay?450+c.difficulty*200+(b.legacy?0:180*b.units.filter(u=>u.kind).length):0;
 const recoveryBonus=retriever?.training?.wreckBonus??0,pay=reward+salvage+recoveryBonus;
 save.credits+=pay;save.rep+=win?c.difficulty*10:0;if(win)save.wins++;
 const allies=b.units.filter(u=>u.team==='ally');
 for(const u of allies){
  const hull=sortieHull(u);
  hull.condition=Math.max(12,Math.round(100*(u.hp.body+u.hp.right+u.hp.left+u.hp.legs)/(u.max.body+u.max.right+u.max.left+u.max.legs)));
  debriefXP(sortiePilot(u),u.pilot,win?70:20,promotions);
 }
 const {serviced,online}=settleShip(win,allies,promotions);
 const baseOnline=win?advanceHangar():null;
 save.history.push({name:c.name,day:save.day,win,pay});save.history=save.history.slice(-100);save.day++;delete save.dispatch;
 battle=null;if(selected===AUX_SLOT)selected=0;
 window.IronVowFoundry?.clearCombat();persist();page='career';render();
 const buttons=[{text:'COMPANY RECORD',fn:closeModal},{text:'REPAIR & REFIT',fn:()=>{closeModal();page='workshop';workshopView='assigned';render()}}];
 if(recovered.length)buttons.push({text:'VIEW SALVAGE',fn:()=>{closeModal();page='workshop';workshopView='salvage';render()}});
 const points=totalTrainingPoints();
 if(points)buttons.push({text:'TRAIN PILOTS · '+points+' PT',fn:()=>{closeModal();page='pilots';render()}});
 if(online)buttons.push({text:'SHIP DECK',fn:()=>{closeModal();page='ship';render()}});
 if(baseOnline)buttons.push({text:'HANGAR',fn:()=>{closeModal();page='hangar';hangarDeck='base';render()}});
 modal(win?'CONTRACT FULFILLED.':'LANCE EXTRACTED.',`<p>${win?c.fixedPay?'Patrol cleared. Your pilots return with hard-earned experience.':'The field is yours. Your pilots return with experience and recovered enemy components.':'Your pilots have been recovered. Combat damage persists.'}</p>
  ${stat('CONTRACT PAYMENT',money(reward))}${c.fixedPay?'':stat('SCRAP BONUS',money(salvage))}${recoveryBonus?stat('RECOVERY BONUS',money(recoveryBonus)):''}${recovered.length?stat('RECOVERED '+(recovered.length===1?'BODY':'BODIES'),recovered.map(wreck=>FRAMES[wreck.frame].name).join(' · ')):''}${stat('REPUTATION',win?'+'+c.difficulty*10:'UNCHANGED')}
  ${premium?stat('SHIP PREMIUM INCLUDED','+'+money(premium)):''}${serviced?stat('HULLS SERVICED',serviced):''}${online?stat('SHIP UPGRADE ONLINE',online):''}
  ${baseOnline?stat('HANGAR FACILITY ONLINE',baseOnline):''}
  ${promotions.length?stat('PROMOTED',promotions.join(' · ')):''}`,buttons);
}
// Pre-rendered 2.5D battlefield: original raster art, depth ordering and live game effects.
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),scale=50,origin={x:0,y:0},shake=0,viewZoom=1,frameDt=1/60;
const fieldCamera={x:1,z:16,overview:false};
const decodedArt=new Set(),failedArt=new Set(),artImages={},artMasks={};
const motionPreference=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
let reducedMotion=!!motionPreference?.matches;
motionPreference?.addEventListener?.('change',e=>{reducedMotion=e.matches;if(reducedMotion)skipAttackCamera()});
const legacyChassis=FRAMES.map(frame=>frame.rig==='bastion'?'bastion-bst04':frame.foundry!=null?'foundry-'+frame.foundry:frame.native?prototypes[frame.native]?.left.key:frame.name.toLowerCase());
const bakedChassis=[...Object.values(wardenVisuals),...(arsenal.chassis||[]),...(wardenUpgrade?[wardenUpgrade.views]:[]),...Object.values(prototypes)].flatMap(views=>Object.values(views).map(view=>view.key));
const mechArtKeys=new Set([...legacyChassis.filter(Boolean),...bakedChassis]);
for(const key of [...mechArtKeys,'concrete','barricade','contract-relay','contract-corridor','contract-frontier','warden-base','kestrel-base','basilisk-base']){
 const im=new Image();im.decoding='async';artImages[key]=im;
 im.onload=()=>{
  decodedArt.add(key);
  if(mechArtKeys.has(key)&&typeof OffscreenCanvas==='function'){
   try{
    const mask=new OffscreenCanvas(128,128),g=mask.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0,128,128);artMasks[key]=g.getImageData(0,0,128,128);
   }catch{}
  }
  for(let frame=0;frame<3;frame++)buildRigidParts(frame);
  if(battle){
   const target=$('.combat-target img');
    if(target?.dataset.visualKey===key)refreshTargetPortrait();
  }else if(page==='workshop'&&wardenVisual(selected,save.units[selected].weapon,-1)?.key===key){
   const preview=$('.unit-render');if(preview?.tagName==='IMG')preview.src=art(key);else drawWorkshopPreview();
  }else if(page==='workshop'&&key===legacyChassis[selected])drawWorkshopPreview();
 };
 im.onerror=()=>{failedArt.add(key);console.warn('Unable to load game artwork:',key);if(!bakedChassis.includes(key))toast('Artwork could not load. Refresh to retry.')};im.src=art(key);
}
function imageReady(im){return im&&im.complete&&im.naturalWidth>0}
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,W<760?1.5:2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=W<760?'medium':'high'}
window.addEventListener('resize',resize);resize();
function project(x,y,z){return{x:origin.x+(x-z)*scale*.866,y:origin.y+(x+z)*scale*.42-y*scale}}
function polygon(points,fill,stroke,width=.7){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function tile(x,z,color,stroke,y=0,width=.7){polygon([[x-.5,y,z-.5],[x+.5,y,z-.5],[x+.5,y,z+.5],[x-.5,y,z+.5]].map(p=>project(...p)),color,stroke,width)}
function targetingTile(x,z,locked=false){
 const y=locked?.025:.010,width=locked?2.3:1.25;
 tile(x,z,locked?'#ef9b4266':'#e7a34c3d','#291a14b8',y,width+1.5);
 tile(x,z,null,locked?'#ffe5a5':'#f1bf72c9',y,width);
}
function coverImage(im,x,y,w,h){const r=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*r,ih=im.naturalHeight*r;ctx.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
function background(){ctx.clearRect(0,0,W,H);if(battle){ctx.fillStyle='#141f29';ctx.fillRect(0,0,W,H);const im=artImages['contract-'+battle.field.ground];if(imageReady(im)){ctx.save();ctx.globalAlpha=.22;coverImage(im,0,0,W,H);ctx.restore()}ctx.fillStyle='#101c2877';ctx.fillRect(0,0,W,H)}}
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
 const {width,depth}=battle.size;
 const floor=(x,z)=>project(x,0,z);
 const area=(x1,z1,x2,z2)=>[floor(x1,z1),floor(x2,z1),floor(x2,z2),floor(x1,z2)];
 if(imageReady(image)){
  const anchor=floor(-3.5,-3.5),sx=24*scale/image.naturalWidth,sz=26*scale/image.naturalHeight;
  ctx.save();ctx.translate(anchor.x,anchor.y);
  ctx.transform(sx*.866,sx*.42,-sz*.866,sz*.42,0,0);
  ctx.drawImage(image,0,0);ctx.restore();
 }else polygon(area(-3.5,-3.5,20.5,22.5),'#293943');
 ctx.beginPath();
 for(let i=.5;i<width-.5;i++){const a=floor(i,-.5),b=floor(i,depth-.5);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
 for(let i=.5;i<depth-.5;i++){const a=floor(-.5,i),b=floor(width-.5,i);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
 ctx.lineWidth=.6;ctx.strokeStyle=field.grid;ctx.stroke();
 polygon(area(-.5,-.5,width-.5,depth-.5),null,field.border);
}
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
function turnToward(u,dx,dz){
 const from=displayedHeading(u),to=headingTo(dx,dz,from);
 if(from===to)return null;
 u.heading=to;u.face=Math.sign(Math.sin(to));
 if(reducedMotion)return null;
 // A short anticipation beat, with no in-between facing.
 u.turning=true;
 if(u.kind)sound(u.kind==='tank'?'track':'rotor',.48);
 else sound('hydraulic',.42);
 return delay(100).then(()=>{u.turning=false});
}
function activeWardenVisual(u){
 if(u.kind)return;
 const visual=wardenVisual(u.frame,u.weapon,unitFacing(u),u.team==='enemy');
 return visual&&(visual.native||imageReady(artImages[visual.key]))?visual:undefined;
}
function spriteFlip(u,visual=activeWardenVisual(u)){return !visual&&unitFacing(u)!==(u.frame===1?1:-1)}
const motionImages={};
function motionImage(atlas){
 let image=motionImages[atlas.key];
 if(!image){
  image=motionImages[atlas.key]=new Image();
  image.decoding='async';
  image.src=art(atlas.key);
 }
 return image;
}
function preloadNativeMotion(frame,paint){
 const atlas=window.IRON_VOW_FOUNDRY_ART?.[foundryModel(frame)];
 if(atlas){
  if(atlas.views?.[0])moduleImage(atlas.views[0].key);
  if(paint)moduleImage(atlas.key+'-paint');
  return [motionImage(atlas)];
 }
 const views=prototypes[FRAMES[frame]?.native];
 return views?Object.values(views).map(visual=>{
  if(paint)moduleImage(visual.motion.key+'-paint');
  return motionImage(visual.motion);
 }):[];
}
async function readyNativeMotion(u){
 const missing=preloadNativeMotion(u.frame,u.paint).filter(im=>!imageReady(im)&&im.decode);
 if(missing.length)await Promise.race([Promise.allSettled(missing.map(im=>im.decode())),delay(1400)]);
}
function attackMotionImage(atlas,paint){
 if(paint)moduleImage(atlas.key+'-paint');
 return motionImage(atlas);
}
function nearestFrame(frames,level){
 return frames?.length?frames.reduce((best,frame)=>Math.abs(frame.level-level)<Math.abs(best.level-level)?frame:best):undefined;
}
function wardenMotionFrame(u,visual,pose){
 if(reducedMotion||!visual)return;
 const {motion:atlas,attackMotion}=visual;
 const strike=pose.strikeKind==='blade'||pose.strikeKind===FREE_HAND_COUNTER.id?'cleaver':pose.strikeKind;
 if(visual.native){
  if(!u.alive||(!u.attack?.native&&!u.motion))return;
  const image=motionImage(atlas);
  if(!imageReady(image))return;
  const native=u.attack?.native;
  if(native){
   if(pose.primePhase==='step'||pose.primePhase==='return'){
    const index=Math.min(atlas.gait.length-1,Math.floor(pose.primeProgress*atlas.gait.length/2));
    return {atlas,image,frame:atlas.gait[index]};
   }
   const {cue,duration,clip}=native,{start,fireAt,primeDuration}=u.attack;
   const progress=Number.isFinite(fireAt)?cue+(pose.time-fireAt)/duration:Math.min(cue,(pose.time-start-primeDuration)/duration);
   return{atlas,image,frame:nearestFrame(atlas[clip],clamp01(progress))};
  }
  return{atlas,image,frame:atlas.gait[Math.floor((pose.cycle%1)*atlas.gait.length)]};
 }
 if(visual.motion?.brace&&u.alive&&u.brace&&u.hp.legs>0&&!u.motion){
  const image=motionImage(atlas);
  if(imageReady(image)){
   const kick=Math.abs(pose.recoil);
   const frame=pose.brace<1?nearestFrame(atlas.brace,pose.brace):
    kick>.08?nearestFrame(atlas.braceKick,kick):
    pose.aim>.12?nearestFrame(atlas.braceAim,pose.aim):atlas.brace.at(-1);
   return {atlas,image,frame};
  }
 }
 const kick=pose.recoil*(u.weapon==='rail'?1.35:.8)*(1-pose.brace*.4);
 if(u.alive&&pose.primePhase&&attackMotion){
  const image=attackMotionImage(attackMotion,u.paint);
  if(imageReady(image)){
   let frame=nearestFrame(attackMotion.prime,pose.primeProgress);
   if(pose.primePhase==='planted'){
    if(pose.strikeKind)frame=nearestFrame(attackMotion[strike],pose.strikeProgress)||frame;
    else if(kick>.11)frame=nearestFrame(attackMotion.kick,kick)||frame;
    else frame=nearestFrame(attackMotion.aim,pose.aim)||frame;
   }
   return {atlas:attackMotion,image,frame};
  }
 }
 if(!atlas)return;
 const image=motionImage(atlas);
 if(!imageReady(image))return;
 let frame;
 if(!u.alive&&atlas.death?.length){
  frame=nearestFrame(atlas.death,pose.kneel);
 }else if(pose.primePhase&&pose.primePhase!=='planted'&&pose.primeProgress>0&&atlas.gait?.length){
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(pose.primeProgress*atlas.gait.length/2))];
 }else if(pose.strikeKind&&atlas[strike]?.length){
  frame=nearestFrame(atlas[strike],pose.strikeProgress);
 }else if(pose.walk>.12&&atlas.gait?.length){
  const cycle=((pose.cycle%2)+2)%2;
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(cycle*atlas.gait.length/2))];
 }else{
  if(kick>.11)frame=nearestFrame(atlas.kick,kick);
  else if(pose.aim>.12)frame=nearestFrame(atlas.aim,pose.aim);
 }
 return {atlas,image,frame};
}
function remainingPose(pose,baked){
 return baked?.frame?{...pose,walk:0,recoil:0}:pose;
}
const MECH_SIZE=[2.18,2.1,2.35,2.46,2.46,3.18,3.23,3.18,3.21,3.12,3.23];
MECH_SIZE[HELLBREAKER]=MECH_SIZE[3];
MECH_SIZE[CITADEL_FRAME]=MECH_SIZE[BASTION_FRAME];
function unitBounds(u,visual=activeWardenVisual(u)){const p=project(u.vx,0,u.vz),size=scale*MECH_SIZE[u.frame]*(visual?.scale??1);return{x:p.x-size*(visual?.groundX??.5),y:p.y-size*(visual?.ground??(foundryModel(u.frame)!=null?.84:.94)),w:size,h:size}}
// A small skinned mesh articulates the existing armor art without new image requests.
const MECH_MOTION=[
 {step:.31,hip:.59,split:.52,foot:[.96,.98],mass:1,muzzle:[.075,.565]},
 {step:.25,hip:.51,split:.51,foot:[.94,.98],mass:.65,muzzle:[.625,.43]},
 {step:.38,hip:.57,split:.60,foot:[.98,.87],mass:1.45,muzzle:[.25,.49]},
 {step:.63,hip:.58,split:.5,foot:[.89,.89],mass:1.56,muzzle:[.25,.49]},
 {step:.52,hip:.58,split:.5,foot:[.89,.89],mass:1.11,muzzle:[.38,.26]},
 ...[[.53,.90],[.64,1.24],[.68,1.52],[.56,1.08],[.49,.73],[.94,1.44]].map(([step,mass])=>(
  {step,mass,hip:.51,split:.5,foot:[.83,.84],muzzle:[.26,.46]}))
];
MECH_MOTION[HELLBREAKER]=MECH_MOTION[3];
MECH_MOTION[CITADEL_FRAME]={...MECH_MOTION[BASTION_FRAME],step:.66};
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
 blade:{raise:.38,beats:[0],travel:.08,recover:.55,melee:true,effect:'cleaver'},
 piledriver:{raise:.32,beats:[0],travel:.18,recover:.39,melee:true},
 morrow:{raise:.784,beats:[0,.298667],travel:.14,recover:.48,effect:'rampart',alternate:true},
 locust:{raise:.784,beats:[0,.298667],travel:.46,recover:.39,effect:'missile',alternate:true},
 'breach-gauntlet':{raise:.357,beats:[0],travel:.21,recover:.41,melee:true,effect:'breaker'},
 'pulse-bash':{raise:.357,beats:[0],travel:.21,recover:.33,melee:true,effect:'cleaver'},
 [FREE_HAND_COUNTER.id]:{raise:.21,beats:[0],travel:.12,recover:.26,melee:true}
};
const ATTACK_STEP={duration:.60,returnDuration:.35};
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
 const rig=UPPER_RIG[u.frame]||UPPER_RIG[0],native=u.frame===1?1:-1;
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
function destructionStyle(u){return u.deathStyle||(u.frame===1||FRAMES[u.frame]?.native?'fall':'kneel')}
function destructionRoot(u,pose){
 const fall=destructionStyle(u)==='fall'?smoothRange(.42,.96,pose.deathAge):0;
 return{x:fall*.03,y:0,angle:-fall*1.12,scale:1-fall*.12};
}
function deformDestructionVertex(u,x,y,p,pose,legWeight,rightWeight){
 if(pose.kneel<=0)return p;
 const rig=UPPER_RIG[u.frame]||UPPER_RIG[0],drop=pose.kneel*(destructionStyle(u)==='fall'?.105:.205),forward=(u.frame===1?1:-1)*pose.kneel*.025;
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
function beginDestruction(u,reason='body'){
 u.downReason=reason;
 u.alive=false;u.deathTime=clock;u.deathStyle=u.kind?'vehicle':destructionStyle(u);u.deathEvents=0;u.attack=null;
 if(u.kind)moduleImage(vehicleKey(u,true));
}
function updateDestruction(u,t){
 if(u.alive||u.downReason==='pilot'||!Number.isFinite(u.deathTime))return;const age=t-u.deathTime;if(age>DESTRUCTION.end+.5)return;
 if(u.kind){
  const elapsed=age-VEHICLES[u.kind].wreckAt;
  if(elapsed>=0&&!u.deathEvents){
   u.deathEvents=1;
   if(!reducedMotion&&elapsed<.55){
    effects.push({type:'detonation',x:u.x,z:u.z,t:1-elapsed/.85,big:true,seed:u.index,anchor:freezeAttachment(u,'body',t)});
    sound('boom');shake=Math.max(shake,u.kind==='helicopter'?5:4);
   }
  }
  return;
 }
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
 const im=visual?.modular||visual?.native?paintedSprite(source,visual.key,u.paint):source;
 const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,ground=project(u.vx,0,u.vz);
 ctx.save();ctx.globalAlpha=fade*.7;ctx.fillStyle='#080e13';ctx.beginPath();ctx.ellipse(ground.x,ground.y,scale*.92,scale*.32,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const pieces=[[.33,.24,.39,.33],[.16,.08,.28,.23],[.65,.10,.25,.25],[.2,.67,.25,.28],[.6,.68,.25,.25]];
 const blastPose=animationPose(u,(u.deathTime??t-DESTRUCTION.end)+DESTRUCTION.blast);
 for(let i=0;i<pieces.length;i++){
  const r=pieces[i],seed=(u.index+1)*1.73+i*2.399,range=scale*(i===0?.16:.5+(i%3)*.2),end={x:ground.x+Math.cos(seed)*range,y:ground.y+Math.sin(seed)*range*.32};
  const start=mechSourcePoint(u,r[0]+r[2]/2,r[1]+r[3]/2,blastPose),ease=1-(1-q)**2;
  const x=start.x+(end.x-start.x)*ease,y=start.y+(end.y-start.y)*ease-Math.sin(Math.PI*q)*scale*(i===0?.25:.7);
  ctx.save();ctx.globalAlpha=fade*(1-q*.2);ctx.filter=!visual&&rigidParts[u.frame]?'none':'brightness(.4) saturate(.65)';ctx.translate(x,y);ctx.rotate(Math.sin(seed)*1.3*q);const size=.9-q*.16;
  ctx.drawImage(im,r[0]*iw,r[1]*ih,r[2]*iw,r[3]*ih,-r[2]*b.w*size/2,-r[3]*b.h*size/2,r[2]*b.w*size,r[3]*b.h*size);ctx.restore();
 }
}

const rigidParts={};
function renderSurface(w,h){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
 if(typeof document.createElement==='function'){const c=document.createElement('canvas');if(c.getContext){c.width=w;c.height=h;return c}}return null;
}
const moduleImages={},paintedImages=new Map(),paintedPortraits=new WeakMap();
function moduleImage(key){
 if(!moduleImages[key]){
  const image=new Image();moduleImages[key]=image;image.decoding='async';
  image.onload=()=>{
   if(key.startsWith('hostile-')||/^foundry-\d-fit$/.test(key)){
    try{
     const mask=renderSurface(112,112)?.getContext('2d',{willReadFrequently:true});
     if(mask){mask.drawImage(image,0,0,112,112);artMasks[key]=mask.getImageData(0,0,112,112)}
    }catch{}
   }
   if(page==='workshop'&&!battle)drawWorkshopPreview();
   if(page==='hangar'&&!battle)drawFoundryHangar();
    if(battle){
     const portraitKey=$('.combat-target img')?.dataset.visualKey;
     if(key===portraitKey||key===portraitKey+'-paint')refreshTargetPortrait();
    }
  };
  image.src=art(key);
 }
 return moduleImages[key];
}
function paintedSprite(image,key,paint){
 if(!paint||!imageReady(image))return image;
 const id=key+paint;
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
   if(maskData[i]<16||!pixels[i+3])continue;
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
   const weight=maskData[i]/255*smoothRange(18,56,light);
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
function foundryPaint(image,key,paint,trim){
 if((!paint&&!trim)||!imageReady(image))return image;
 const id=[key,paint,trim?.s,trim?.a].join('/');
 if(paintedImages.has(id))return paintedImages.get(id);
 const mask=moduleImage(key+'-paint');
 if(!imageReady(mask))return image;
 const {naturalWidth:width,naturalHeight:height}=image;
 try{
  const surface=renderSurface(width,height),g=surface.getContext('2d',{willReadFrequently:true});
  g.drawImage(mask,0,0);
  const masks=g.getImageData(0,0,width,height).data;
  g.clearRect(0,0,width,height);g.drawImage(image,0,0);
  const color=g.getImageData(0,0,width,height),pixels=color.data;
  const shades=[paint,trim?.s,trim?.a].map(hex=>hex&&[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)));
  for(let i=0;i<pixels.length;i+=4){
   if(!pixels[i+3])continue;
   const layer=masks[i]>.85*255?0:masks[i+1]>.85*255?1:masks[i+2]>.85*255?2:-1;
   const rgb=shades[layer];if(!rgb)continue;
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
   const exposure=(light/(layer===1?98:layer===2?125:181))**.70;
   for(let c=0;c<3;c++)pixels[i+c]=Math.min(255,rgb[c]*exposure);
  }
  g.putImageData(color,0,0);
  if(paintedImages.size>=12)paintedImages.delete(paintedImages.keys().next().value);
  paintedImages.set(id,surface);return surface;
 }catch{return image}
}
function refreshTargetPortrait(){
 const portrait=$('.combat-target img[data-target-id]'),key=portrait?.dataset.visualKey;
 if(!key)return;
 const target=battle?.units.find(u=>u.id===portrait.dataset.targetId);
 if(!target||target.kind)return;
 const foundry=foundryModel(target.frame)!=null,base=foundry?moduleImage(key):artImages[key];
 if(!imageReady(base))return;
 const visual=wardenVisual(target.frame,target.weapon,unitFacing(target));
 const image=foundry?foundryPaint(base,key,target.paint,target.trim):
  visual?.modular||visual?.native?paintedSprite(base,key,target.paint):base;
 if(image===base){portrait.src=art(key);return}
 if(!paintedPortraits.has(image)){
  const preview=document.createElement('canvas');preview.width=preview.height=192;
  const g=preview.getContext?.('2d');
  if(!g||typeof preview.toDataURL!=='function')return;
  g.drawImage(image,0,0,192,192);paintedPortraits.set(image,preview.toDataURL());
 }
 portrait.src=paintedPortraits.get(image);
}
function spritePoint(bounds,point=[.5,.36]){
 return {x:bounds.x+point[0]*bounds.w,y:bounds.y+point[1]*bounds.h};
}
function weaponMount(visual,frame,bounds,id,direction,strike=0){
 const side=direction===1?'right':'left';
 const slot=id==='blade'?window.IRON_VOW_RAIJIN_ART?.[side]||arsenal.weapons?.cleaver?.[side]:arsenal.weapons?.[id]?.[side];
 if(!slot)return;
 const asset=id==='piledriver'&&strike>=.61&&strike<=.81&&slot.extended?slot.extended:slot;
 const isMelee=weapon(id).melee;
 const grip=spritePoint(bounds,isMelee?frame.gripL:frame.gripR);
 const axis=spritePoint(bounds,isMelee?(id==='piledriver'?(frame.ramL||frame.axisL):frame.axisL):frame.axisR);
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
function foundryMount(anchors,bounds,id,direction,progress=0,ortho=8){
 if(!id||!anchors?.gripR||!anchors?.gripL)return null;
 // Raijin was rendered in the Foundry's own model scale. Other weapons share the Site arsenal scale.
 return weaponMount({ortho:id==='blade'?ortho*1.4/3.2:ortho},anchors,bounds,id,direction,progress);
}
let foundryPreviewAngle=0;
let bastionPreviewDemo=0;
window.addEventListener?.('bastion-art-ready',()=>{if(page==='workshop'&&!battle)drawWorkshopPreview();else if(page==='hangar'&&!battle)drawFoundryHangar()});
function drawFoundryPreview(canvas,u,model,angle,previewFrame){
 if(pilotFrame(selected)===BASTION_FRAME){
  const live=window.IronVowFoundry?.previewBastion?.(u,angle,previewFrame);
  const image=live?.surface||artImages['bastion-bst04'];
  if(!live&&!imageReady(image))return;
  const g=canvas.getContext('2d');
  g.imageSmoothingQuality='high';
  if(live)canvas.dataset.rigFrame=String(live.frame);
  g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(image,0,0,canvas.width,canvas.height);
  return;
 }
 const view=window.IRON_VOW_FOUNDRY_ART?.[model]?.views?.[angle];
 const key=view?.key||'foundry-'+model,base=moduleImage(key);
 if(!imageReady(base))return;
 const size=canvas.width,g=canvas.getContext('2d');
 const rendered=foundryPaint(base,key,u.paint,u.trim);
 g.clearRect(0,0,size,size);g.drawImage(rendered,0,0,size,size);
 if(view){
  const bounds={x:0,y:0,w:size,h:size};
  drawWeaponModule(g,foundryMount(view,bounds,u.weapon,view.direction,0,view.ortho));
  drawWeaponModule(g,foundryMount(view,bounds,u.melee,view.direction,0,view.ortho));
 }
}
function testBastionGrip(melee){
 const canvas=$('#paint-preview'),serial=++bastionPreviewDemo;
 if(!canvas)return;
 const unit={...save.units[selected]};
 if(melee)unit.melee??='cleaver';else unit.weapon='rifle';
 const startFrame=melee?273:161;
 let start;
 const tick=time=>{
  if(serial!==bastionPreviewDemo||battle||page!=='workshop'||canvas!==$('#paint-preview'))return;
  start??=time;
  const progress=clamp01((time-start)/2200);
  drawFoundryPreview(canvas,unit,2,foundryPreviewAngle,startFrame+48*progress);
  if(progress<1)requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function drawFoundryHangar(){
 const canvas=$('#foundry-hangar');
 if(canvas&&canvas.getContext)drawFoundryPreview(canvas,save.units[selected],foundryModel(pilotFrame(selected)),0);
}
function drawWorkshopPreview(){
 const canvas=$('#paint-preview');if(!canvas)return;
 const g=canvas.getContext('2d'),u=save.units[selected],frame=pilotFrame(selected),visual=wardenVisual(frame,u.weapon,-1);
 const image=artImages[visual?.key],loaded=imageReady(image),size=canvas.width,model=foundryModel(frame);
 if(model!=null){drawFoundryPreview(canvas,u,model,foundryPreviewAngle);return}
 g.clearRect(0,0,size,size);
 if(!loaded){
  const fallback=artImages[legacyChassis[frame]];
  if(imageReady(fallback))g.drawImage(fallback,size*.06,size*.06,size*.88,size*.88);
  return;
 }
 const bounds={x:0,y:0,w:size,h:size};
 g.drawImage(visual.modular||visual.native?paintedSprite(image,visual.key,u.paint):image,0,0,size,size);
 if(visual.modular){
  if(!(frame===2&&u.weapon==='missile'))drawWeaponModule(g,weaponMount(visual,visual,bounds,u.weapon,-1));
  if(u.melee)drawWeaponModule(g,weaponMount(visual,visual,bounds,u.melee,-1));
 }
}
function bindWorkshop(){
 const buttons=[...document.querySelectorAll('[data-paint]')],custom=$('#custom-paint'),u=save.units[selected];
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
 if(!custom)return;
 const mark=()=>buttons.forEach(button=>button.setAttribute('aria-pressed',String((u.paint||'')===button.dataset.paint)));
 for(const button of buttons)button.onclick=()=>{
  const color=button.dataset.paint;
  if(color){u.paint=color;custom.value=color}else{delete u.paint;custom.value='#c6bd9f'}
  mark();persist();drawWorkshopPreview();
 };
 custom.oninput=()=>{if(validPaint(custom.value)){u.paint=custom.value;mark();drawWorkshopPreview()}};
 custom.onchange=()=>{if(validPaint(custom.value)){u.paint=custom.value;mark();persist();drawWorkshopPreview()}};
 for(const input of document.querySelectorAll('[data-trim]')){
  const update=()=>{if(validPaint(input.value)){(u.trim??={})[input.dataset.trim]=input.value;drawWorkshopPreview()}};
  input.oninput=update;input.onchange=()=>{update();persist()};
 }
 const resetTrim=$('#reset-trim');
 if(resetTrim)resetTrim.onclick=()=>{delete u.trim;persist();render()};
 const rotate=$('#rotate-foundry');
 if(rotate)rotate.onclick=()=>{foundryPreviewAngle=(foundryPreviewAngle+1)%4;drawWorkshopPreview()};
 const testRifle=$('#bastion-test-rifle'),testMelee=$('#bastion-test-melee');
 if(testRifle)testRifle.onclick=()=>testBastionGrip(false);
 if(testMelee)testMelee.onclick=()=>testBastionGrip(true);
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
 const wreck=renderSurface(size,size),wg=wreck.getContext('2d');wg.filter='brightness(.4) saturate(.55)';wg.drawImage(original,0,0,size,size);
 if(!artMasks[frame])artMasks[frame]=src;
 rigidParts[frame]={parts,wreck,base:body,counts};
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
  const a=rigidPartPoint(u,index,{x:0,y:0},pose),b=rigidPartPoint(u,index,{x:1,y:0},pose),c=rigidPartPoint(u,index,{x:0,y:1},pose),im=cache.parts[index],size=im.width;
  ctx.save();ctx.filter='none';
  ctx.transform((b.x-a.x)*w/size,(b.y-a.y)*h/size,(c.x-a.x)*w/size,(c.y-a.y)*h/size,(a.x-.5)*w,(a.y-1)*h);ctx.drawImage(im,0,0);ctx.restore();
 }
}

const WARDEN_BRACE_DURATION=.58;

function wardenPaces(tiles,firstSide,breach=false){
 // Six ticks per tile. Breach hulls take three compact paces per tile.
 const odd=tiles%2;
 const strides=breach?Array(tiles*3).fill(2):odd?[3,3]:[];
 if(!breach)for(let i=odd;i<tiles;i+=2)strides.push(4,4,4);
 let contact=0;
 return [...strides,0].map((next,index)=>{
  const previous=strides[index-1]??0;
  const suffix=next===3||(!next&&previous===3)?'Half':'';
  const stage=!previous?'start'+suffix:!next?'settle'+suffix:
    previous===3&&next===4?'bridge':'stride'+suffix;
  const phase={from:(contact-previous/2)/6,to:(contact+next/2)/6,kind:stage+((firstSide+index)%2?'R':'L')};
  contact+=next;
  return phase;
 });
}

function fieldStepProgress(phase,segment){
 if(!segment||segment.length===1)return phase*phase*(3-2*phase);
 if(segment.index===0)return phase*phase*(2-phase);
 if(segment.index===segment.length-1)return phase+phase*phase*(1-phase);
 return phase;
}

function advanceUnitAnimation(u,t,dt){
 const m=u.motion;
 if(m){const p=clamp01((t-m.start)/m.duration),q=fieldStepProgress(p,m.segment);u.vx=m.fromX+(m.toX-m.fromX)*q;u.vz=m.fromZ+(m.toZ-m.fromZ)*q}
 else{u.vx=u.x;u.vz=u.z}
 if(m?.contacts?.length){
  const data=travelAtlas(u).grounded,heading=headingIndex(displayedHeading(u));
  const progress=m.segment.index+fieldStepProgress(clamp01((t-m.start)/m.duration),m.segment);
  while(m.contacts[0]?.to<=progress+.000001){
   const pace=m.contacts.shift(),q=pace.to-m.segment.index;
   const points=data.points[data.walk[pace.kind]+data.samples-1][heading];
   const [x,y]=points['foot'+pace.kind.at(-1)];
   const mass=MECH_MOTION[u.frame].mass;
   effects.push({type:'step',x:m.fromX+(m.toX-m.fromX)*q,z:m.fromZ+(m.toZ-m.fromZ)*q,
    ox:(x-.5)*data.span/3.65,oy:(y-data.ground)*data.span/3.65,t:1,mass});
   sound('step',mass*.78);
  }
 }
 updateDestruction(u,t);
 if(u.brace&&upgradedWardenTravel(travelAtlas(u))){
  u.braceBlend=reducedMotion?1:clamp01((t-(u.braceTime??-100))/WARDEN_BRACE_DURATION);
 }else u.braceBlend=(u.braceBlend??0)+((u.brace?1:0)-(u.braceBlend??0))*(1-Math.exp(-dt*13));
}
function animationPose(u,t,visual=activeWardenVisual(u)){
 const rig=visual||MECH_MOTION[u.frame],m=u.motion,phase=m?clamp01((t-m.start)/m.duration):0;
 const cycle=m?m.gaitBase+phase:0,routePhase=m?(m.stepIndex+phase)/m.totalSteps:0;
 const walk=m&&!reducedMotion?smoothRange(0,.12,routePhase)*(1-smoothRange(.87,1,routePhase)):0;
 const flip=spriteFlip(u,visual),facing=flip?-1:1,frameSize=MECH_SIZE[u.frame];
 const dx=m?((m.toX-m.fromX)-(m.toZ-m.fromZ))*.866/frameSize*facing:0;
 const dy=m?((m.toX-m.fromX)+(m.toZ-m.fromZ))*.42/frameSize:0;
 const attack=u.attack,profile=ATTACK_PROFILES[attack?.kind||u.weapon];
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
 let aim=attack&&!strikeKind?smoothRange(0,profile.raise,windupAge):0;
 if(attack&&Number.isFinite(attack.releaseAt))aim*=1-smoothRange(0,profile.recover,t-attack.releaseAt);
 let strikeProgress=0;
 if(strikeKind){
  const windup=.7*profile.raise/(profile.raise+profile.travel);
  strikeProgress=Number.isFinite(attack.releaseAt)?.7+.3*clamp01((t-attack.releaseAt)/profile.recover):
   Number.isFinite(attack.fireAt)?windup+(.7-windup)*clamp01((t-attack.fireAt)/profile.travel):
   windup*clamp01(windupAge/profile.raise);
 }
 let recoil=0;const age=t-(u.fireTime??-100);
 if(!strikeKind&&!reducedMotion)for(const beat of profile.beats)recoil+=dampedImpulse(age-beat,u.weapon==='missile'?32:42,u.weapon==='rail'?12:18);
 const impactAge=t-(u.hitTime??-100),impact=!reducedMotion?dampedImpulse(impactAge,28,11):0;
 const deathAge=u.alive?-1:t-(u.deathTime??t-DESTRUCTION.end),death=u.alive||u.downReason==='pilot'?0:reducedMotion?1:clamp01(deathAge/DESTRUCTION.end);
 const kneel=u.alive?0:reducedMotion?1:smoothRange(.04,DESTRUCTION.kneelEnd,deathAge);
 const explosion=u.alive||u.downReason==='pilot'?0:reducedMotion?1:smoothRange(DESTRUCTION.blast-.02,DESTRUCTION.blast+.15,deathAge);
 const landAge=t-(u.landTime??-100),land=!reducedMotion&&landAge>=0&&landAge<.4?Math.sin(landAge*30)*Math.exp(-landAge*15):0;
 const pose={rig,flip,strikeKind,strikeProgress,primePhase,primeProgress,nativeDirection:visual?unitFacing(u):u.frame===1?1:-1,phase,cycle,walk,dx,dy,recoil,impact,death,deathAge,kneel,explosion,aim:reducedMotion?0:aim,land,brace:u.braceBlend??(u.brace?1:0),idle:reducedMotion||spent(u)?0:Math.sin(t*1.4+u.index*2.1)*.0014,impactX:(u.hitVector?.x||0)*facing,impactY:u.hitVector?.y||0};
 pose.time=t;pose.podRecoil=profile.beats.map(beat=>reducedMotion||strikeKind?0:dampedImpulse(age-beat,32,18));pose.upper=upperPose(u,pose);return pose;
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
 if(pose.primeProgress>0&&!activeWardenVisual(u)){
  const lead=nativeDirection>0?right:left,foot=smoothRange(rig.hip,1,y);
  px+=nativeDirection*(lead*leg*foot*.10+torso*.025)*smoothRange(.08,.85,pose.primeProgress);
  py-=lead*leg*foot*.065*Math.sin(Math.PI*smoothRange(.08,.85,pose.primeProgress));
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
function recoilingBounds(u,b,t){
 if(reducedMotion||!u.alive||(u.brace&&u.hp.legs>0&&upgradedWardenTravel(travelAtlas(u))))return b;
 if(FRAMES[u.frame]?.native&&u.attack?.primeDuration){
  const pose=animationPose(u,t,activeWardenVisual(u)),q=pose.primeProgress;
  const progress=q*q*(3-2*q);
  b={...b,x:b.x+unitFacing(u)*scale*.19*progress,y:b.y-scale*.025*progress};
 }
 if(!u.hitVector)return b;
 const age=t-(u.hitTime??-2);
 if(age<0||age>.55)return b;
 const kick=(1-Math.exp(-age*90))*Math.exp(-age*10)*Math.cos(age*16)*scale*.26;
 return{...b,x:b.x+kick*u.hitVector.x,y:b.y+kick*u.hitVector.y*.55};
}
function vehicleKey(u,wreck=false){return (wreck?'wreck-':'hostile-')+u.kind+'-'+(unitFacing(u)>0?'right':'left')}
function vehicleDeathAge(u,t){return Number.isFinite(u.deathTime)?Math.max(0,t-u.deathTime):Infinity}
function vehicleWreckVisible(u,t){return !u.alive&&(reducedMotion||vehicleDeathAge(u,t)>=VEHICLES[u.kind].wreckAt)}
function vehicleBounds(u,t){
 const spec=VEHICLES[u.kind];
 const lift=spec.altitude*(u.alive?1:reducedMotion?0:1-smoothRange(0,spec.wreckAt,vehicleDeathAge(u,t)));
 const bob=lift>0&&!reducedMotion&&u.alive?Math.sin(t*6+u.index)*.045:0;
 const p=project(u.vx,lift+bob,u.vz),size=scale*3.9192;
 const recoil=reducedMotion||!u.alive?0:dampedImpulse(t-(u.fireTime??-100),36,15)*unitFacing(u)*scale*.11;
 return recoilingBounds(u,{x:p.x-size*.5-recoil,y:p.y-size*.72,w:size,h:size},t);
}
function vehicleAttachment(u,part,t){
 const view=travelVisual(u,t);
 if(view)return spritePoint(view.bounds,view.points[part]||view.points.body);
 const spec=VEHICLES[u.kind],source=part.startsWith('muzzle')?spec.muzzle:spec.center;
 return spritePoint(vehicleBounds(u,t),[unitFacing(u)>0?1-source[0]:source[0],source[1]]);
}
function travelAtlas(u){
 if(!u.kind&&u.frame===0&&u.team==='ally'&&wardenUpgrade)return wardenUpgrade.travel;
 const f=FRAMES[u.frame];
 if(f?.rig==='bastion')return null;
 return window.IRON_VOW_TRAVEL?.[u.kind||(f?.foundry!=null?'foundry-'+f.foundry:f?.native||f?.name.toLowerCase())];
}
function upgradedWardenTravel(atlas){return Boolean(atlas&&atlas===wardenUpgrade?.travel)}

function travelDetail(u,atlas,heading){
 const key=atlas?.detail?.keys[heading];
 if(!key)return null;
 if(u.paint||u.trim)moduleImage(key+'-paint');
 return {key,image:motionImage({key})};
}

function preloadTravel(u){
 const atlas=travelAtlas(u);
 if(!atlas)return null;
 const detail=travelDetail(u,atlas.grounded||atlas,headingIndex(displayedHeading(u)));
 if(detail)return detail.image;
 if(u.paint||u.trim)moduleImage(atlas.key+'-paint');
 return motionImage(atlas);
}
function travelVisual(u,t){
 if(!u.alive||u.headingOverride!==undefined)return null;
 const atlas=travelAtlas(u);
 if(!atlas)return null;
 const angle=displayedHeading(u),direction=Math.sin(angle)<0?-1:1;
 const heading=headingIndex(angle);
 const phase=u.motion?clamp01((t-u.motion.start)/u.motion.duration):0;
 const detail=travelDetail(u,atlas.grounded||atlas,heading);
 if(atlas.grounded&&imageReady(detail?.image)){
  const data=atlas.grounded,{cell,columns}=data.detail;
  const motion=u.motion,segment=motion?.segment;
  let row=u.attack?1:0,x=u.vx,z=u.vz;
  if(segment&&!reducedMotion){
   const distance=segment.index+fieldStepProgress(phase,segment);
   const pace=segment.paces.find(step=>distance<=step.to)??segment.paces.at(-1);
   const frame=Math.round(clamp01((distance-pace.from)/(pace.to-pace.from))*(data.samples-1));
   row=data.walk[pace.kind]+frame;
   // Draw at the sampled root distance so the planted sole stays fixed.
   const q=pace.from+(pace.to-pace.from)*frame/(data.samples-1)-segment.index;
   x=motion.fromX+(motion.toX-motion.fromX)*q;
   z=motion.fromZ+(motion.toZ-motion.fromZ)*q;
  }
  const p=project(x,0,z),size=scale*data.span/3.65;
  const bounds=recoilingBounds(u,{x:p.x-size*.5,y:p.y-size*data.ground,w:size,h:size},t);
  const source={key:detail.key,cell,x:row%columns,y:Math.floor(row/columns),idleX:0};
  const strike=u.attack&&ATTACK_PROFILES[u.attack.kind].melee?animationPose(u,t):null;
  return {atlas,image:detail.image,source,bounds,row,heading,points:data.points[row][heading],direction,strike,grounded:true};
 }
 const gait=u.motion?(FRAMES[u.frame]?.native?phase:((u.motion.gaitBase+phase)/2)%1):0;
 const prime=u.attack?.primeDuration?clamp01((t-u.attack.start)/u.attack.primeDuration):0;
 const stockRow=u.kind?0:u.motion&&!reducedMotion?1+Math.min(5,Math.floor(gait*6)):
  prime>0&&prime<1?1+Math.min(5,Math.floor(prime*6)):u.attack?7:0;
 const revised=upgradedWardenTravel(atlas);
 let row=stockRow;
 if(revised){
  const pose=animationPose(u,t),special=atlas.special;
  if(u.motion&&!reducedMotion){
   const segment=u.motion.segment??{index:0,length:1,paces:wardenPaces(1,u.motion.gaitBase)};
   const distance=segment.index+fieldStepProgress(phase,segment);
   const pace=segment.paces.find(step=>distance<=step.to)??segment.paces.at(-1);
   const progress=(distance-pace.from)/(pace.to-pace.from);
   row=atlas.walk[pace.kind]+Math.round(clamp01(progress)*(atlas.samples-1));
  }else if(u.brace&&u.hp.legs>0){
   const recoil=Math.abs(pose.recoil);
   const step=Math.round(pose.brace*atlas.braceSamples);
   row=pose.brace<1?(step?special.brace+step-1:0):
    recoil>.08?special.braceKick+Math.min(2,Math.floor(recoil*3)):
    pose.aim>.12?special.braceAim+Math.min(2,Math.floor(pose.aim*3)):special.brace+atlas.braceSamples-1;
  }else{
   const recoil=Math.abs(pose.recoil);
   row=recoil>.08?special.kick+Math.min(2,Math.floor(recoil*3)):
    pose.aim>.12?special.aim+Math.min(2,Math.floor(pose.aim*3)):0;
  }
 }
 const high=!atlas.grounded&&imageReady(detail?.image);
 const image=high?detail.image:motionImage(atlas);
 if(!imageReady(image))return null;
 const cell=high?atlas.detail.cell:atlas.cell;
 const index=4*row+heading;
 const source=high?{key:detail.key,cell,x:row%atlas.detail.columns,y:Math.floor(row/atlas.detail.columns),idleX:0}:
  {key:atlas.key,cell,x:revised?index%atlas.columns:heading,y:revised?Math.floor(index/atlas.columns):row,idleX:heading};
 const points=atlas.points[row][heading];
 const strike=u.attack&&ATTACK_PROFILES[u.attack.kind].melee?animationPose(u,t):null;
 let bounds;
 if(u.kind)bounds=vehicleBounds(u,t);
 else{
  const ground=project(u.vx,0,u.vz),size=scale*atlas.span/3.65;
  const stride=scale*((revised?0:prime)*.15+(strike?.strikeProgress?Math.sin(strike.strikeProgress*Math.PI)*.22:0));
  bounds={x:ground.x-size*.5+Math.sin(angle)*stride,y:ground.y-size*atlas.ground+Math.cos(angle)*stride*.44,w:size,h:size};
  bounds=recoilingBounds(u,bounds,t);
 }
 return {atlas,image,source,bounds,row,heading,points,direction,strike};
}
function travelMount(view,u,id,progress=0){
 const mount=foundryMount(view.points,view.bounds,id,view.direction,progress,
  foundryModel(u.frame)!=null?view.atlas.span/1.4:view.atlas.span);
 if(mount&&view.strike&&id===u.attack.kind)mount.angle+=view.direction*(.9-1.85*smoothRange(.36,.78,progress));
 return mount;
}
const PART_TINTS=[['body',.35,.27],['pilot',.20,.16],['right',.24,.29],['left',.24,.29],['legs',.32,.37]];
function drawPartTints(u,t,paint,anchor,scorch=true){
 if(u.kind||!u.alive)return;
 const age=t-(u.hitTime??-Infinity),hit=age>=0&&age<.72?u.hitPart:null;
 if(!hit&&!scorch)return;
 for(const [part,width,height] of PART_TINTS){
  if(!u.max[part])continue;
  const flash=part===hit,health=u.hp[part]/u.max[part];
  if(!flash&&(!scorch||health>=.5))continue;
  const p=anchor(part);
  if(!p)continue;
  // Repaint within the struck area so the tint respects the sprite's silhouette.
  ctx.save();
  ctx.beginPath();ctx.ellipse(p.x,p.y,scale*width,scale*height,0,0,Math.PI*2);ctx.clip();
  ctx.globalAlpha*=flash?.9*(1-age/.72):.52+.36*(1-health);
  const filter=ctx.filter;
  ctx.filter=(filter&&filter!=='none'?filter+' ':'')+(flash?'brightness(1.95) saturate(.48)':'brightness(.35) saturate(.60)');
  paint();
  ctx.restore();
 }
}
function drawTravel(u,t,view){
 const {atlas,image,source,bounds,heading}=view,p=project(u.vx,0,u.vz),{cell}=source;
 const foundry=foundryModel(u.frame)!=null;
 const body=foundry?foundryPaint(image,atlas.key,u.paint,u.trim):paintedSprite(image,source.key,u.paint);
 ctx.save();ctx.fillStyle='#060d148c';ctx.beginPath();
 ctx.ellipse(p.x,p.y,scale*(u.kind||foundryModel(u.frame)===5?.76:.62),scale*.22,0,0,Math.PI*2);ctx.fill();
 if(view.grounded){
  const contacts=view.points.planted?[view.points.planted]:[view.points.footL,view.points.footR];
  ctx.fillStyle='#060d149e';
  for(const anchor of contacts){
   const foot=spritePoint(bounds,anchor);
   ctx.beginPath();ctx.ellipse(foot.x,foot.y,scale*.24,scale*.09,0,0,Math.PI*2);ctx.fill();
  }
 }
 const painted=upgradedWardenTravel(atlas);
 const behind=painted&&(heading===1||heading===2);
 if(behind&&u.hp.right>0)drawWeaponModule(ctx,travelMount(view,u,u.weapon));
 const paint=()=>ctx.drawImage(body,source.x*cell,source.y*cell,cell,cell,bounds.x,bounds.y,bounds.w,bounds.h);
 paint();
 drawPartTints(u,t,paint,part=>view.points[part]&&spritePoint(bounds,view.points[part]));
 ctx.restore();
 if(!behind&&!u.kind&&u.hp.right>0&&!(u.frame===2&&u.weapon==='missile')){
  drawWeaponModule(ctx,travelMount(view,u,u.weapon));
 }
 if(u.hp.left>0&&(view.strike||(foundry&&u.melee&&foundryModel(u.frame)===4&&!u.attack))){
  drawWeaponModule(ctx,travelMount(view,u,view.strike?u.attack.kind:u.melee,view.strike?.strikeProgress));
 }
 if(!u.kind&&u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
 if(u.hp.body/u.max.body<.4)drawMechSmoke(u,t);
 drawUnitReadout(u,u.kind?1.5+VEHICLES[u.kind].altitude:2.30);
}
function drawVehicle(u,t,close=false){
 const wreck=vehicleWreckVisible(u,t)?moduleImage(vehicleKey(u,true)):null;
 const wreckReady=imageReady(wreck),image=wreckReady?wreck:moduleImage(vehicleKey(u));
 const bounds=vehicleBounds(u,t),spec=VEHICLES[u.kind];
 const p=project(u.vx,0,u.vz),altitude=spec.altitude;
 ctx.save();
 ctx.fillStyle=u.alive?(altitude?'#06101670':'#050c12a0'):'#0a1117a8';
 ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(altitude?.78:.66),scale*(altitude?.24:.23),0,0,Math.PI*2);ctx.fill();
 if(imageReady(image)){
  if(!u.alive&&!wreckReady){
   ctx.filter='brightness(.60) saturate(.42)';
   if(altitude&&!reducedMotion&&!vehicleWreckVisible(u,t)){
    const x=bounds.x+bounds.w*.5,y=bounds.y+bounds.h*.65;
    ctx.translate(x,y);ctx.rotate(unitFacing(u)*.36*smoothRange(0,spec.wreckAt,vehicleDeathAge(u,t)));ctx.translate(-x,-y);
   }
  }
  ctx.drawImage(image,bounds.x,bounds.y,bounds.w,bounds.h);
 }
 ctx.restore();
 if(!u.alive||u.hp.body/u.max.body<.35)drawMechSmoke(u,t,!u.alive);
 if(!close&&u.alive)drawUnitReadout(u,1.5+altitude);
}
function drawUnitReadout(u,height=2.35){
 const q=project(u.vx,height,u.vz),width=Math.max(27,scale*.75);
 ctx.fillStyle='#0b141dde';ctx.fillRect(q.x-width/2-2,q.y-3,width+4,7);
 ctx.fillStyle=u.team==='ally'?'#9cbec8':'#d8997e';ctx.fillRect(q.x-width/2,q.y-1,width*u.hp.body/u.max.body,3);
 ctx.font=(W<760?'9':'10')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=u.team==='ally'?'#d7e3df':'#e5ae98';
 ctx.shadowColor='#06101a';ctx.shadowBlur=4;ctx.fillText(u.team==='ally'?CREW[u.pilot].call:u.name,q.x,q.y-9);ctx.shadowBlur=0;
}
function hitstopTime(u,t){
 return u.hitstop&&t>=u.hitstop.at&&t<u.hitstop.until?u.hitstop.at:t;
}
function mechAttachmentPoint(u,part='muzzle',t=clock){
 t=hitstopTime(u,t);
 if(part==='meleeTip'&&u.attack?.kind===FREE_HAND_COUNTER.id)part='left';
 if(u.kind)return vehicleAttachment(u,part,t);
 const live=foundryRender(u,t,true),travel=!live&&travelVisual(u,t);
 if(travel){
  if(part==='meleeTip'){
   const blade=travelMount(travel,u,u.attack?.kind||u.melee,travel.strike?.strikeProgress);
   return blade?weaponPoint(blade,'tip'):spritePoint(travel.bounds,travel.points.left||travel.points.body);
  }
  const mount=part.startsWith('muzzle')&&!(u.frame===2&&u.weapon==='missile')?travelMount(travel,u,u.weapon):null;
  if(mount)return weaponPoint(mount,part);
  return spritePoint(travel.bounds,travel.points[part]||travel.points.muzzle||travel.points.body);
 }
 const foundry=live||foundryRender(u,t);
 if(foundry){
  const bounds=recoilingBounds(u,unitBounds(u),t),facing=unitFacing(u),strike=part==='meleeTip';
  if(strike||part.startsWith('muzzle')){
   const production=Boolean(strike?foundry.secondary:foundry.primary);
   if(production&&foundry.anchors[part])return spritePoint(bounds,foundry.anchors[part]);
   const mount=foundryMount(foundry.anchors,bounds,strike?u.melee:u.weapon,facing,foundry.strikeProgress);
   if(mount)return weaponPoint(mount,strike?'tip':part);
  }
  return spritePoint(bounds,foundry.anchors[part]||foundry.anchors.body);
 }
 const visual=activeWardenVisual(u),raw=unitBounds(u,visual),b=visual?.modular||visual?.native?recoilingBounds(u,raw,t):raw,pose=animationPose(u,t,visual),rig=pose.rig;
 const locations={body:[rig.split,.34],pilot:[rig.split,.21],right:[u.frame===1?.38:.30,.46],left:[.81,.39],legs:[rig.split,.79]};
 const baked=wardenMotionFrame(u,visual,pose),frame=baked?.frame||visual;
 if(visual?.native){
  const p=frame[part]||visual[part]||(part==='pilot'?[frame.body[0],frame.body[1]-.14]:frame.body);
  if(u.alive)return spritePoint(b,p);
  const root=destructionRoot(u,pose),q=rotatePoint({x:(p[0]-.5)*root.scale,y:(p[1]-1)*root.scale},[0,0],root.angle);
  return spritePoint(b,[q.x+.5+root.x,q.y+1+root.y]);
 }
 if(part==='leadFoot'&&!frame?.leadFoot){const p=project(u.vx,0,u.vz);return{x:p.x+unitFacing(u)*scale*.22,y:p.y}}
 if(!visual){const source=part.startsWith('muzzle')?(u.weapon==='missile'?[u.frame===2?(part==='muzzle2'?.76:.36):(part==='muzzle2'?.29:.69),.16]:rig.muzzle):(locations[part]||locations.body);return mechSourcePoint(u,source[0],source[1],pose)}
 if(visual.modular){
  if(part==='meleeTip'||part.startsWith('muzzle')){
   const melee=part==='meleeTip',id=melee?(pose.strikeKind||u.melee):u.weapon;
   if(!melee&&u.frame===2&&id==='missile')return spritePoint(b,part==='muzzle2'?frame.podL:frame.podR);
   const mount=weaponMount(visual,frame,b,id,unitFacing(u),pose.strikeProgress);
   if(mount)return weaponPoint(mount,melee?'tip':part);
  }
  return spritePoint(b,frame[part]||visual[part]||(part==='pilot'?[frame.body[0],frame.body[1]-.14]:frame.body));
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
function foundryRender(u,t,liveOnly=false){
 const model=foundryModel(u.frame);
 if(model==null)return null;
 const poseTime=hitstopTime(u,t);
 const pose=animationPose(u,poseTime);
 pose.heading=displayedHeading(u);pose.cinematic=u.headingOverride!==undefined;pose.reducedMotion=reducedMotion;
 const live=window.IronVowFoundry?.draw(u,poseTime,pose,battle,model,FRAMES[u.frame]?.rig);
 if(live)return {...live,strikeProgress:pose.strikeProgress};
 if(liveOnly)return null;
 if(bastionRig(u))return {surface:artImages['bastion-bst04'],cell:0,anchors:{body:[.50,.46],pilot:[.50,.29],right:[.31,.59],left:[.70,.59],legs:[.50,.72],muzzle:[.20,.53],leadFoot:[.43,.84]},flip:false,baked:true,primary:true};
 const atlas=window.IRON_VOW_FOUNDRY_ART?.[model];
 if(!atlas||atlas.frames.length<19)return null;
 const image=motionImage(atlas);
 const index=!u.alive?u.downReason==='pilot'?17:18:
  pose.strikeKind&&pose.primePhase!=='step'?13+Math.min(2,Math.floor(pose.strikeProgress*3)):
  Math.abs(pose.recoil)>.05?12:pose.aim>.35?11:
  pose.primeProgress>0?8+Math.min(2,Math.floor(pose.primeProgress*3)):
  u.motion&&!reducedMotion?Math.floor(pose.cycle*8)%8:16;
 const flip=unitFacing(u)>0,frame=atlas.frames[index];
 const anchors=flip?Object.fromEntries(Object.entries(frame).filter(([,p])=>Array.isArray(p)).map(([k,[x,y]])=>[k,[1-x,y]])):frame;
 const loaded=imageReady(image),key=loaded?atlas.key:legacyChassis[u.frame],base=loaded?image:artImages[key];
 const surface=loaded?foundryPaint(base,key,u.paint,u.trim):base;
 return {surface,cell:loaded?atlas.cell:0,index,anchors,flip,baked:true,strikeProgress:pose.strikeProgress};
}
function drawUnit(u,t,close=false){
 const inactive=spent(u)&&!u.attack&&!u.motion&&!u.turning;
 if(!inactive){drawUnitBody(u,t,close);return}
 ctx.save();
 try{ctx.filter='brightness(.37) saturate(.42)';drawUnitBody(u,t,close)}
 finally{ctx.restore()}
}
function drawUnitBody(u,t,close){
 t=hitstopTime(u,t);
 const live=foundryRender(u,t,true),travel=!close&&!live&&travelVisual(u,t);
 if(travel){drawTravel(u,t,travel);return}
 if(u.kind){drawVehicle(u,t,close);return}
 const visual=activeWardenVisual(u),p=project(u.vx,0,u.vz),raw=unitBounds(u,visual),b=visual?.modular||visual?.native||foundryModel(u.frame)!=null?recoilingBounds(u,raw,t):raw,pose=animationPose(u,t,visual);
 const key=visual?.key||legacyChassis[u.frame],original=artImages[key];
 const foundry=live||foundryRender(u,t);
 if(foundry){
  ctx.save();ctx.fillStyle='#050c12ac';ctx.beginPath();
  ctx.ellipse(p.x,p.y+scale*.025,scale*(foundryModel(u.frame)===5?.92:.64),scale*.22,0,0,Math.PI*2);ctx.fill();
  if(foundry.surface&&(!foundry.baked||imageReady(foundry.surface)||typeof foundry.surface.getContext==='function')){
   const paint=()=>{
    ctx.save();ctx.translate(b.x+b.w/2,b.y);if(foundry.flip)ctx.scale(-1,1);
    if(foundry.cell){
     const {cell,index}=foundry;
     ctx.drawImage(foundry.surface,index%4*cell,Math.floor(index/4)*cell,cell,cell,-b.w/2,0,b.w,b.h);
    }else ctx.drawImage(foundry.surface,-b.w/2,0,b.w,b.h);
    ctx.restore();
   };
   paint();
   drawPartTints(u,t,paint,part=>foundry.anchors[part]&&spritePoint(b,foundry.anchors[part]),foundry.baked);
  }
  ctx.restore();
  if(u.alive){
   const facing=unitFacing(u);
   ctx.save();
   if(u.hp.right>0&&!foundry.primary)drawWeaponModule(ctx,foundryMount(foundry.anchors,b,u.weapon,facing));
   if(u.hp.left>0&&!foundry.secondary&&(pose.strikeKind||(foundryModel(u.frame)===4&&pose.aim<.2)))drawWeaponModule(ctx,foundryMount(foundry.anchors,b,u.melee,facing,foundry.strikeProgress));
   ctx.restore();
  }
  if(!u.alive&&u.downReason!=='pilot')drawMechSmoke(u,t,true);
  if(u.alive&&u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
  if(u.alive&&!close)drawUnitReadout(u,foundryModel(u.frame)===5?2.12:2.35);
  return;
 }
 const baked=wardenMotionFrame(u,visual,pose),remaining=remainingPose(pose,baked);
 const body=baked?.frame?baked.image:original,bodyKey=baked?.frame?baked.atlas.key:key;
 const im=visual?.modular||visual?.native?paintedSprite(body,bodyKey,u.paint):body;
 ctx.save();ctx.fillStyle=u.alive?'#050c12aa':'#090e13c9';ctx.beginPath();ctx.ellipse(p.x,p.y+scale*.025,scale*(.67+pose.brace*.05),scale*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!imageReady(original))return;
 if(!u.alive&&pose.explosion>=1){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true);return}
 ctx.save();
 const articulated=!reducedMotion&&(pose.walk>.001||pose.primeProgress>0||Math.abs(pose.recoil)>.008||Math.abs(pose.impact)>.008||pose.brace>.008||pose.aim>.001||(!u.alive&&pose.explosion<1));
 const paint=()=>{
  ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h);if(pose.flip)ctx.scale(-1,1);
  if(!u.alive){const root=u.downReason==='pilot'?{x:0,y:pose.kneel*.075,angle:pose.kneel*.12,scale:1-pose.kneel*.1}:destructionRoot(u,pose);ctx.globalAlpha=u.downReason==='pilot'?.65:1-pose.explosion;ctx.translate(root.x*b.w,root.y*b.h);ctx.rotate(root.angle);ctx.scale(root.scale,root.scale)}
  if(baked?.frame){const {cell,columns}=baked.atlas,index=baked.frame.index;ctx.drawImage(im,index%columns*cell,Math.floor(index/columns)*cell,cell,cell,-b.w/2,-b.h,b.w,b.h)}
  else if(articulated&&!visual&&rigidParts[u.frame]){const cache=rigidParts[u.frame],bodyPose={...pose,baseOnly:true};drawArticulatedMech(im,u,b.w,b.h,bodyPose,cache.base);drawRigidUpper(u,b.w,b.h,pose)}
  else if(articulated&&!visual?.modular&&!visual?.native&&foundryModel(u.frame)==null)drawArticulatedMech(im,u,b.w,b.h,{...remaining,baseOnly:true});
  else{if(u.alive&&!reducedMotion&&!spent(u))ctx.rotate(Math.sin(t*.85+u.index)*.001);ctx.drawImage(im,-b.w/2,-b.h,b.w,b.h)}
  ctx.restore();
 };
 paint();
 drawPartTints(u,t,paint,part=>mechAttachmentPoint(u,part,t));
 ctx.restore();
 if(!u.alive){if(u.downReason!=='pilot'){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true)}return}
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
 if(!close)drawUnitReadout(u);
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
 const kind=profile.effect||e.kind;
 const impact=e.impact?resolveAttachment(e.impact):project(e.tx,1.3,e.tz);
 if(profile.melee){
  if(!actor||age>profile.travel)return;
  const tip=mechAttachmentPoint(actor,'meleeTip',t),previous=mechAttachmentPoint(actor,'meleeTip',t-.06);
  const strength=Math.sin(Math.PI*clamp01(age/profile.travel));
  ctx.save();ctx.lineCap='round';ctx.globalAlpha=strength*.8;
  ctx.shadowBlur=12;ctx.shadowColor=kind==='cleaver'?'#ff632b':'#ffc585';
  ctx.strokeStyle=kind==='cleaver'?'#ffb27a':'#e8d8ba';ctx.lineWidth=kind==='breaker'?4:2;
  ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.restore();
  return;
 }
 for(let i=0;i<profile.beats.length;i++){
  const since=age-profile.beats[i];if(since<0||since>.65)continue;
  if(!e.origins[i])e.origins[i]=actor?freezeAttachment(actor,(kind==='missile'||profile.alternate)&&i%2?'muzzle2':'muzzle',e.born+profile.beats[i]):{x:e.x,z:e.z,ox:0,oy:-1.4};
  const a=resolveAttachment(e.origins[i]),p=since/profile.travel;
  ctx.save();ctx.lineCap='round';
  if(p>=0&&p<=1){
   if(kind==='missile'){
    const x=a.x+(impact.x-a.x)*p,y=a.y+(impact.y-a.y)*p-Math.sin(p*Math.PI)*scale*1.25;
    ctx.strokeStyle='#e1d2b34d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+impact.x)/2,Math.min(a.y,impact.y)-scale*1.25,x,y);ctx.stroke();
    ctx.fillStyle='#fff0bb';ctx.shadowColor='#ffb765';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(x,y,Math.max(2,scale*.055),0,Math.PI*2);ctx.fill();
    for(let j=1;j<=4;j++){const q=Math.max(0,p-j*.045),sx=a.x+(impact.x-a.x)*q,sy=a.y+(impact.y-a.y)*q-Math.sin(q*Math.PI)*scale*1.25;ctx.globalAlpha=(1-j/5)*.25;ctx.fillStyle='#c1b8a5';ctx.beginPath();ctx.arc(sx,sy,scale*(.025+j*.015),0,Math.PI*2);ctx.fill()}
   }else if(kind==='rail'){
    ctx.globalAlpha=1-p*.65;ctx.shadowColor='#b3e9f4';ctx.shadowBlur=16;ctx.strokeStyle='#8ec7dc';ctx.lineWidth=5*(1-p*.7);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(impact.x,impact.y);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#f5ffff';ctx.lineWidth=1.5;ctx.stroke();
   }else{
    for(let pellet=0;pellet<(kind==='shotgun'?7:1);pellet++){
     const spread=kind==='shotgun'?(pellet-3)*scale*.075:0,x=a.x+(impact.x-a.x)*p,y=a.y+(impact.y-a.y)*p+spread*p;
     ctx.strokeStyle=pellet%2?'#fff0c4':'#e9b971';ctx.lineWidth=kind==='shotgun'?1.4:2;ctx.shadowColor='#eab36b';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(x-(impact.x-a.x)*.10,y-(impact.y-a.y)*.10);ctx.lineTo(x,y);ctx.stroke();
    }
   }
  }
  if(since<.055&&!reducedMotion){
   ctx.globalAlpha=1-since/.055;ctx.shadowColor='#f6bf72';ctx.shadowBlur=20;ctx.fillStyle='#fff0c5';ctx.beginPath();ctx.arc(a.x,a.y,scale*(kind==='shotgun'?.20:kind==='rampart'?.16:.11),0,Math.PI*2);ctx.fill();
   const angle=Math.atan2(impact.y-a.y,impact.x-a.x);ctx.translate(a.x,a.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-scale*.07);ctx.lineTo(scale*.33,0);ctx.lineTo(0,scale*.07);ctx.fill();
  }
  ctx.restore();
  if(['rifle','shotgun','hailstorm','rampart'].includes(kind)&&since<.55&&!reducedMotion){
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

function drawEffects(t,subject=null,plantOnly=false){for(const e of effects){
 if(plantOnly){
  if(!e.attackPlant||e.actor!==subject.id)continue;
 }else if(subject&&(e.x!==subject.x||e.z!==subject.z||!['boom','detonation'].includes(e.type)))continue;
 const phase=1-e.t;if(e.type==='shot'){drawAttackEffect(e,t);
 }else if(e.type==='boom'){
  const target=subject||battle.units.find(u=>u.id===e.target),p=target?mechAttachmentPoint(target,e.part||'body',t):project(e.x,1.1,e.z),radius=scale*(e.big?1.1:.5);ctx.save();ctx.globalAlpha=e.t;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*(.3+phase));g.addColorStop(0,'#fff8dc');g.addColorStop(.22,'#ffda8f');g.addColorStop(.5,'#f2873c99');g.addColorStop(1,'#b54c1200');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,radius*(.3+phase),0,Math.PI*2);ctx.fill();for(let i=0;i<(e.big?22:13);i++){const angle=i*2.399,v=(.25+(i%5)*.19)*phase*radius*2;ctx.strokeStyle=i%2?'#ffba6c':'#fff2c6';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*v*.65,p.y+Math.sin(angle)*v*.65+phase*phase*scale*.5);ctx.lineTo(p.x+Math.cos(angle)*v,p.y+Math.sin(angle)*v+phase*phase*scale*.5);ctx.stroke()}ctx.restore();
 }else if(e.type==='detonation'){drawDetonation(e,t);
 }else if(e.type==='step'){
  const actor=e.attackPlant&&(subject||battle.units.find(u=>u.id===e.actor));
  const p=actor?mechAttachmentPoint(actor,'leadFoot',t):project(e.x,0,e.z),mass=e.mass||1;
  p.x+=(e.ox||0)*scale;p.y+=(e.oy||0)*scale;
  ctx.save();ctx.globalAlpha=e.t*.34;ctx.strokeStyle='#c0d4dc';ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(p.x+(e.side||0)*scale*.15,p.y,scale*phase*.62*mass,scale*phase*.2*mass,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<5;i++){const angle=i*2.4;ctx.globalAlpha=e.t*.16;ctx.fillStyle='#aabdc6';ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*phase*scale*.5,p.y+Math.sin(angle)*phase*scale*.14-phase*scale*.12,scale*(.025+phase*.055)*mass,0,Math.PI*2);ctx.fill()}ctx.restore();
 }else if(e.type==='skill'){
  const p=project(e.x,0,e.z);ctx.save();ctx.globalAlpha=e.t*.65;ctx.strokeStyle=['#e8bc77','#b1d7e6','#b6d8c5'][e.kind]??CREW[e.kind].color;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(.35+phase*.9),scale*(.13+phase*.3),0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 else{const p=project(e.x,2.6+phase*.6,e.z);ctx.save();ctx.globalAlpha=Math.min(1,e.t*3);ctx.fillStyle=e.type==='heal'?'#bbd8c9':'#f5dbb1';ctx.font='600 '+(W<760?'9':'12')+'px Inter,Arial,sans-serif';ctx.textAlign='center';ctx.shadowColor='#07111a';ctx.shadowBlur=6;ctx.fillText(e.text,p.x,p.y);ctx.restore()}
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
 return `<div class="field-navigation" aria-label="Tactical map"><div class="map-tools"><button type="button" id="map-overview" aria-pressed="${fieldCamera.overview}" ${battle.busy?'disabled':''}>${fieldCamera.overview?'CLOSE VIEW':'OVERVIEW'}</button><button type="button" id="map-center" title="Center on selected unit" aria-label="Center on selected unit" ${battle.busy?'disabled':''}>◎</button></div><button type="button" id="map-radar" class="map-radar" aria-label="Pan the battlefield using the tactical map" ${battle.busy?'disabled':''}>${pins}<span class="map-focus" aria-hidden="true"></span></button><span class="map-caption">${width} × ${depth} / DRAG TO PAN</span></div>`;
}
function bindTacticalMap(){
 $('#map-overview').onclick=()=>{
  if(battle.busy)return;
  fieldCamera.overview=!fieldCamera.overview;hover=null;renderBattle();
 };
 $('#map-center').onclick=()=>{if(!battle.busy){focusBattleCamera(current(),true);hover=null;renderBattle()}};
 $('#map-radar').onclick=e=>{
  if(battle.busy)return;
  if(!e.detail){fieldCamera.overview=!fieldCamera.overview;renderBattle();return}
  const rect=e.currentTarget.getBoundingClientRect(),{width,depth}=battle.size;
  fieldCamera.x=clamp01((e.clientX-rect.left)/rect.width)*width-.5;
  fieldCamera.z=clamp01((e.clientY-rect.top)/rect.height)*depth-.5;
  fieldCamera.overview=false;hover=null;renderBattle();
 };
}
function panField(dx,dy){
 const horizontal=dx/(scale*.866),vertical=dy/(scale*.42),{width,depth}=battle.size;
 fieldCamera.x=Math.max(-.5,Math.min(width-.5,fieldCamera.x-(horizontal+vertical)/2));
 fieldCamera.z=Math.max(-.5,Math.min(depth-.5,fieldCamera.z-(vertical-horizontal)/2));
 hover=null;
}
function setFieldProjection(){
 const mobile=W<760,{width,depth}=battle.size,overview=fieldCamera.overview;
 const span=width+depth;
 const usableWidth=W-(mobile?30:Math.min(390,W*.32));
 const usableHeight=H-(mobile?270:245);
 const fit=Math.max(7,Math.min(usableWidth/(span*.866),usableHeight/(span*.42+3)));
 const base=mobile?Math.min(W/12,H/19):Math.min((W-365)/18,(H-225)/10.7);
 scale=overview?fit:Math.max(mobile?24:33,base)*viewZoom;
 const x=overview?(width-1)/2:fieldCamera.x,z=overview?(depth-1)/2:fieldCamera.z;
 origin={x:W*(mobile?.5:.51)-(x-z)*scale*.866,y:H*(mobile?.55:.53)-(x+z)*scale*.42};
 const radar=$('.map-focus');
 if(radar?.style){
  radar.style.left=100*(fieldCamera.x+.5)/width+'%';
  radar.style.top=100*(fieldCamera.z+.5)/depth+'%';
 }
}
function battlefield(t){
 setFieldProjection();
 const u=current(),reachable=u&&battle.phase==='player'&&!battle.busy&&action==='move'?paths(u):null;
 const targetingWeapon=u&&!spent(u)&&battle.phase==='player'&&!battle.busy&&action!=='move'?selectedWeapon(u):null;
 const targetingRange=targetingWeapon?weaponRange(targetingWeapon,u.training):0;
 ctx.save();if(!reducedMotion&&shake>.15){ctx.translate(Math.sin(t*110)*shake,Math.cos(t*93)*shake*.5)}
 drawTerrain(battle.field);
 for(let x=0;x<battle.size.width;x++)for(let z=0;z<battle.size.depth;z++){
  const key=x+','+z;
  if(reachable?.get(key)>0){
   const paid=reachable.get(key)>freeMovement(u);
   tile(x,z,paid?'#cc9b492b':'#77b4c533',paid?'#e3b875ce':'#9ccdda80',.008,paid?1.15:.7);
   if(inCover({x,z}))drawCoverMarker(x,z);
  }
  if(targetingWeapon&&!battle.cover.has(key)){
   const range=distance(u,{x,z});
   if(range>0&&range<=targetingRange)targetingTile(x,z,hover?.x===x&&hover?.z===z);
  }else if(!battle.busy&&hover?.x===x&&hover?.z===z)tile(x,z,'#e7be6e3c','#eac07e',.016);
 }
 for(const unit of battle.units){advanceUnitAnimation(unit,t,frameDt);if(unit.team==='ally'&&unit.alive&&!spent(unit))tile(unit.vx,unit.vz,selected===unit.index?'#e6b76a2d':'#a0c6d018',selected===unit.index?'#e6b76a':'#83b0c080',.02);else if(unit.alive&&unit.id===lockedTarget&&!battle.busy){
  if(targetingWeapon&&canReachTarget(targetingWeapon,unit)&&distance(u,unit)<=targetingRange)targetingTile(unit.vx,unit.vz,true);
  else tile(unit.vx,unit.vz,'#d8877330','#d89279',.02,1.35);
 }}
 const entities=[...Array.from(battle.cover,key=>{const[x,z]=key.split(',').map(Number);return{x,z,type:'cover',model:battle.field.cover[key]}}),...battle.units.map(u=>({x:u.vx,z:u.vz,type:'unit',u}))].sort((a,b)=>(a.x+a.z-(a.u&&!a.u.alive?2:0))-(b.x+b.z-(b.u&&!b.u.alive?2:0)));
 for(const e of entities){
  const p=project(e.x,0,e.z);
  if(p.x<-scale*2||p.x>W+scale*2||p.y<-scale||p.y>H+scale*4)continue;
  if(e.type==='cover')drawCover(e.x,e.z,e.model);
  else drawUnit(e.u,t);
 }
 drawEffects(t);ctx.restore();fieldAtmosphere(t,battle.field);
 if(['warden','kestrel','basilisk','concrete','barricade'].some(k=>!imageReady(artImages[k]))){ctx.font='11px Inter,Arial,sans-serif';ctx.fillStyle='#e7d5b5';ctx.textAlign='center';ctx.fillText('PREPARING BATTLEFIELD ART…',W/2,H*.6)}
}
function drawCinematicFire(sequence,actor,pane,t){
 const profile=ATTACK_PROFILES[sequence.w.id],age=t-(sequence.fireAt??-100);
 if(sequence.phase==='aim'||age<0)return;
 if(profile.melee){
  if(age>profile.travel)return;
  const tip=mechAttachmentPoint(actor,'meleeTip',t),trail=mechAttachmentPoint(actor,'meleeTip',t-.04);
  ctx.save();ctx.globalAlpha=Math.sin(clamp01(age/profile.travel)*Math.PI)*.75;
  ctx.strokeStyle='#efac78';ctx.lineWidth=3;ctx.shadowColor='#e5884b';ctx.shadowBlur=13;
  ctx.beginPath();ctx.moveTo(trail.x,trail.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.restore();
  return;
 }
 for(const [i,beat] of profile.beats.entries()){
  const time=age-beat;
  const missile=sequence.w.id==='locust'||sequence.w.id==='missile';
  if(time<0||time>(missile?.32:.17))continue;
  const p=mechAttachmentPoint(actor,(sequence.w.id==='missile'||profile.alternate)&&i%2?'muzzle2':'muzzle',missile?sequence.fireAt+beat:t);
  if(missile){
   const flight=time/.32,reach=flight*pane.w*.48,lift=Math.sin(flight*Math.PI*.7)*scale*.78;
   const x=p.x+reach,y=p.y-lift;
   ctx.save();ctx.lineCap='round';ctx.globalAlpha=1-flight*.82;
   ctx.strokeStyle='#c6b5a9';ctx.lineWidth=1+scale*.018;
   ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+reach*.35,p.y-lift*.72,x,y);ctx.stroke();
   ctx.fillStyle='#ffebb7';ctx.shadowColor='#ff863b';ctx.shadowBlur=17;
   ctx.beginPath();ctx.ellipse(x,y,scale*.073,scale*.031,-.38,0,Math.PI*2);ctx.fill();
   ctx.restore();continue;
  }
  const strength=1-time/.17,reach=pane.w*.56*clamp01(time/.12),rail=sequence.w.id==='rail';
  ctx.save();ctx.globalAlpha=strength;ctx.lineCap='round';
  ctx.shadowBlur=rail?16:10;ctx.shadowColor=rail?'#8bd4ec':'#f3a55d';
  ctx.strokeStyle=rail?'#c7f0f7':'#f9cd8e';ctx.lineWidth=rail?3:2;
  ctx.beginPath();ctx.moveTo(p.x+Math.max(0,reach-scale*.44),p.y-reach*.03);ctx.lineTo(p.x+reach+scale*.10,p.y-reach*.03-scale*.035);ctx.stroke();
  if(time<.065){ctx.fillStyle=rail?'#c9f5ff':'#ffe6b0';ctx.beginPath();ctx.arc(p.x,p.y,scale*(.05+strength*.05),0,Math.PI*2);ctx.fill()}
  ctx.restore();
 }
}
function drawAttackPane(sequence,pane,subject,attacker,t){
 const actor={...subject,face:attacker?1:-1,headingOverride:(attacker?1:-1)*Math.PI/4};
 const previousOrigin=origin,previousScale=scale;
 const zoom=.94+.08*smoothRange(0,.29,t-sequence.start);
 const airborne=subject.kind==='helicopter';
 const heightLimit=airborne?(pane.h*.88-49)/2.48:pane.h/(subject.kind?2.25:foundryModel(subject.frame)!=null?3.45:FRAMES[subject.frame]?.native?3.10:2.92);
 scale=Math.max(10,Math.min(pane.w/(subject.kind?3.25:4.08),heightLimit)*zoom);
 const settle=airborne&&!subject.alive?smoothRange(0,VEHICLES.helicopter.wreckAt,vehicleDeathAge(subject,t)):0;
 const painted=upgradedWardenTravel(travelAtlas(subject));
 const feetX=pane.x+pane.w*(attacker?.44:.55);
 const feetY=pane.y+pane.h*(airborne?.88-.14*settle:subject.kind?.74:painted?.75:.82);
 origin={x:feetX-(subject.vx-subject.vz)*scale*.866,y:feetY-(subject.vx+subject.vz)*scale*.42};
 const hot=attacker?sequence.phase!=='result':sequence.phase==='result';
 ctx.save();
 try{
  ctx.beginPath();ctx.rect(pane.x,pane.y,pane.w,pane.h);ctx.clip();
  ctx.fillStyle='#15222c';ctx.fillRect(pane.x,pane.y,pane.w,pane.h);
  drawTerrain(battle.field);
  const veil=ctx.createLinearGradient(0,pane.y,0,pane.y+pane.h);
  veil.addColorStop(0,'#101c28e8');veil.addColorStop(.53,'#101c285a');veil.addColorStop(1,'#0d151bb0');
  ctx.fillStyle=veil;ctx.fillRect(pane.x,pane.y,pane.w,pane.h);
  drawUnit(actor,t,true);
  if(attacker){drawEffects(t,actor,true);drawCinematicFire(sequence,actor,pane,t)}
  else drawEffects(t,actor);
  if(!hot){ctx.fillStyle='#10192438';ctx.fillRect(pane.x,pane.y,pane.w,pane.h)}
  ctx.fillStyle='#101820d9';ctx.fillRect(pane.x,pane.y,pane.w,43);
  ctx.fillStyle=hot?'#e9bf7d':'#8fa5ad';ctx.textAlign='left';ctx.font='700 10px Inter,Arial,sans-serif';
  const priming=subject.attack?.primeDuration&&t-subject.attack.start<subject.attack.primeDuration;
  ctx.fillText(attacker?'01 / '+(sequence.phase==='aim'?(priming?'STEP & PRIME':'WINDUP'):sequence.phase==='fire'?'RELEASE':'RECOVERY'):'02 / '+(sequence.phase==='result'?'IMPACT':'TARGET'),pane.x+13,pane.y+15);
  ctx.fillStyle='#f2eee3';ctx.font='700 14px Inter,Arial,sans-serif';
  ctx.fillText(subject.name,pane.x+13,pane.y+34);
  ctx.fillStyle='#101820e8';ctx.fillRect(pane.x,pane.y+pane.h-31,pane.w,31);
  ctx.fillStyle=hot?'#f3d19a':'#aec0c3';ctx.font='600 11px Inter,Arial,sans-serif';
  const detail=attacker?sequence.w.name:sequence.result||(subject.kind?'HULL':sequence.part.toUpperCase());
  ctx.fillText(detail,pane.x+13,pane.y+pane.h-11);
 }finally{ctx.restore();origin=previousOrigin;scale=previousScale}
 ctx.strokeStyle=hot?'#d8ad65aa':'#8faeb14d';ctx.lineWidth=1;
 ctx.strokeRect(pane.x+.5,pane.y+.5,pane.w-1,pane.h-1);
}
function drawAttackCamera(t){
 const sequence=activeCinematic;
 const stacked=W<640&&H>W,margin=stacked?12:Math.max(18,W*.095),gap=stacked?6:8;
 const width=W-2*margin,height=stacked?H*.69:Math.min(H*.61,width*.42);
 const y=Math.max(stacked?88:50,(H-height)*.51);
 const panes=stacked?
  [{x:margin,y,w:width,h:(height-gap)/2},{x:margin,y:y+(height+gap)/2,w:width,h:(height-gap)/2}]:
  [{x:margin,y,w:(width-gap)/2,h:height},{x:margin+(width+gap)/2,y,w:(width-gap)/2,h:height}];
 ctx.save();ctx.fillStyle='#060d15de';ctx.fillRect(0,0,W,H);
 drawAttackPane(sequence,panes[0],sequence.actor,true,t);
 drawAttackPane(sequence,panes[1],sequence.target,false,t);ctx.restore();
}
let canvasMode=null,lastHangarPaint=-Infinity;
function draw(ts){
 const elapsed=Math.max(0,(ts-last)/1000||1/60),dt=Math.min(.05,elapsed);last=ts;clock+=elapsed;frameDt=dt;
 const mode=battle?'battle':page==='hangar'&&!reducedMotion?'hangar':'static';
 const repaint=mode==='battle'||mode!==canvasMode||(mode==='hangar'&&ts-lastHangarPaint>=32);
 if(repaint){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  background();
  if(battle){battlefield(clock);if(activeCinematic)drawAttackCamera(clock)}
  else if(mode==='hangar'){hangar(clock);lastHangarPaint=ts}
  canvasMode=mode;
 }
 effects.forEach(e=>e.t-=elapsed*(e.type==='shot'?1/(e.life||.4):e.type==='detonation'?1/.85:e.type==='step'?1.8:e.type==='skill'?1.2:1.6));effects=effects.filter(e=>e.t>0);shake*=Math.exp(-dt*13);requestAnimationFrame(draw);
}
canvas.addEventListener('wheel',e=>{if(!battle||battle.busy)return;e.preventDefault();fieldCamera.overview=false;viewZoom=Math.min(1.65,Math.max(.70,viewZoom*(e.deltaY<0?1.08:.925)))},{passive:false});
function screenTile(clientX,clientY){let sx=(clientX-origin.x)/(scale*.866),sy=(clientY-origin.y)/(scale*.42);return{x:Math.round((sx+sy)/2),z:Math.round((sy-sx)/2)}}
function pick(clientX,clientY){
 const units=battle.units.filter(u=>u.alive&&(u.team!=='ally'||!spent(u))).sort((a,b)=>(b.vx+b.vz)-(a.vx+a.vz));
 for(const u of units){const visual=activeWardenVisual(u),view=travelVisual(u,clock),b=view?.bounds||(u.kind?vehicleBounds(u,clock):unitBounds(u,visual)),px=(clientX-b.x)/b.w,py=(clientY-b.y)/b.h;if(px<0||py<0||px>1||py>1)continue;
 const foundry=window.IRON_VOW_FOUNDRY_ART?.[foundryModel(u.frame)];
 const travel=view;
 if(travel){
  const b=travel.bounds,px=(clientX-b.x)/b.w,py=(clientY-b.y)/b.h;
  if(px<0||py<0||px>=1||py>=1)continue;
  const key=travel.atlas.key+'/'+travel.heading;
  let mask=artMasks[key];
  if(!mask){
   try{
    const size=52,{cell,idleX}=travel.source,g=renderSurface(size,size)?.getContext('2d',{willReadFrequently:true});
    if(g){g.drawImage(travel.image,idleX*cell,0,cell,cell,0,0,size,size);mask=artMasks[key]=g.getImageData(0,0,size,size)}
   }catch{}
  }
  if(mask?mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>35:
   Math.abs(px-.5)<.31&&py>.2&&py<.88)return u;
  continue;
 }
 const mask=artMasks[foundry?.views?.[0]?.key]||artMasks[u.kind?vehicleKey(u):visual?.key||legacyChassis[u.frame]];
 if(u.kind){
  if(mask){
   const ix=Math.min(mask.width-1,Math.floor(px*mask.width)),iy=Math.min(mask.height-1,Math.floor(py*mask.height));
   let opaque=false;
   for(let y=Math.max(0,iy-2);y<=Math.min(mask.height-1,iy+2)&&!opaque;y++)
    for(let x=Math.max(0,ix-2);x<=Math.min(mask.width-1,ix+2)&&!opaque;x++)
     opaque=mask.data[(y*mask.width+x)*4+3]>55;
   if(opaque)return u;
  }else{
   const x=unitFacing(u)>0?1-px:px;
   if(x>=.22&&x<=.73&&py>=.49&&py<=.79)return u;
  }
  continue;
 }
 if(mask){const ix=Math.min(mask.width-1,Math.floor(((foundryModel(u.frame)!=null?unitFacing(u)>0:spriteFlip(u,visual))?1-px:px)*mask.width)),iy=Math.min(mask.height-1,Math.floor(py*mask.height));if(mask.data[(iy*mask.width+ix)*4+3]<35)continue}
 else if(Math.abs(px-.5)>.36||(foundryModel(u.frame)!=null&&(py<.25||py>.87)))continue;return u}return null;
}
let pointerGesture=null,drawerTap=null;
canvas.addEventListener('pointerdown',e=>{
 drawerTap=null;
 if(!battle||battle.busy||!$('#modal').hidden||e.button>0)return;
 pointerGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};
 canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!battle||battle.busy||!$('#modal').hidden)return;
 const gesture=pointerGesture;
 if(gesture&&gesture.id===e.pointerId){
  if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8)gesture.drag=true;
  if(gesture.drag&&!fieldCamera.overview)panField(e.clientX-gesture.x,e.clientY-gesture.y);
  gesture.x=e.clientX;gesture.y=e.clientY;
  if(gesture.drag)return;
 }
 if(e.pointerType==='touch')return;
 const picked=pick(e.clientX,e.clientY),tile=screenTile(e.clientX,e.clientY),u=current();
 const through=picked?.team==='ally'&&u&&action==='move'&&paths(u).get(tile.x+','+tile.z);
 const p=picked&&!through?{x:picked.x,z:picked.z}:tile;
 const changed=!hover||hover.x!==p.x||hover.z!==p.z;hover=p;
 if(changed&&picked?.team==='enemy')renderBattle();
});
canvas.addEventListener('pointercancel',()=>{pointerGesture=null});
canvas.addEventListener('click',()=>{
 const tap=drawerTap;drawerTap=null;
 if(!tap||tap!==battle||battle.busy||action!=='fire'||!$('#modal').hidden)return;
 targetPanelOpen=true;renderBattle();
});
function selectUnit(index){
 const unit=battle.units.find(u=>u.team==='ally'&&u.index===index&&u.alive&&!spent(u));
 if(!unit)return;
 selected=index;focusBattleCamera(unit);
 if((action==='strike'&&!unit.melee)||(action==='move'&&!movementLimit(unit)))action='fire';
 renderBattle();persist();
}
function focusNextReady(){
 const u=current();
 if(u&&!spent(u))return;
 const ready=battle.units.find(v=>v.team==='ally'&&v.alive&&!spent(v));
 if(ready){selected=ready.index;focusBattleCamera(ready);action=movementLimit(ready)?'move':'fire'}
}
canvas.addEventListener('pointerup',async e=>{
 const gesture=pointerGesture;pointerGesture=null;
 if(!gesture||gesture.id!==e.pointerId||gesture.drag||!battle||battle.busy||!$('#modal').hidden)return;
 const u=current(),picked=pick(e.clientX,e.clientY),tile=screenTile(e.clientX,e.clientY);
 // A reachable ground tile takes precedence over an ally's silhouette overhanging it.
 const walk=u&&action==='move'?paths(u).get(tile.x+','+tile.z):0;
 if(picked?.team==='ally'&&!walk){selectUnit(picked.index);return}
 if(!u||spent(u))return;
 const p=picked?.team==='enemy'?picked:tile;
 hover={x:p.x,z:p.z};
 if(picked?.team==='enemy')lockedTarget=picked.id;
 if(action==='move'){
  if(picked?.team==='enemy'){
   // The drawer can cover the tap point. Open it from the resulting canvas click.
   action='fire';
   if(W<=760&&!targetPanelOpen)drawerTap=battle;
   else renderBattle();
   persist();
   if(W>760)toast('Target acquired. Select a subsystem, then fire.');
   return;
  }
  if(!walk)return toast('Choose a highlighted tile within movement range');
  battle.busy=true;await moveUnit(u,tile.x,tile.z);focusBattleCamera(u);
 }else{
  if(picked?.team!=='enemy')return toast('Select a hostile contact');
  const w=selectedWeapon(u);
  if(!w)return toast('Equip a melee weapon in Workshop.');
  if(u.hp[w.melee?'left':'right']<=0)return toast(w.melee?'Melee arm destroyed. Switch to fire.':'Weapon arm destroyed. Move or brace to support your lance.');
 if(u.ap<paidAttackAP(u,w))return toast('Not enough AP. Select another unit or end your turn.');
  if(!canReachTarget(w,picked))return toast('Gunships require ranged fire.');
  if(distance(u,picked)>weaponRange(w,u.training))return toast(w.melee?'Strike requires an adjacent target.':'Target out of range. Move closer.');
  const part=targetParts(picked).includes(targetPart)?targetPart:'body';
  if(picked.hp[part]<=0)return toast('Subsystem already destroyed. Select another target part.');
  battle.busy=true;renderBattle();await engage(u,picked,part,w);
  if(checkEnd())return;
 }
 battle.busy=false;focusNextReady();renderBattle();persist();
});
document.addEventListener('keydown',e=>{
 if(!battle||battle.busy||!$('#modal').hidden||e.repeat)return;
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeCinematic){skipAttackCamera();return}if(!$('#modal').hidden){closeModal();return}if(targetPanelOpen){targetPanelOpen=false;renderBattle();$('#target-toggle').focus();return}}if(e.key==='Tab'&&!$('#modal').hidden){let btns=[...$('#modal').querySelectorAll('button')],first=btns[0],last=btns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('.brand').onclick=e=>{e.preventDefault();if(!battle){page='ship';render()}};
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
window.addEventListener('storage',event=>{
 if(event.storageArea===localStorage&&(event.key===CAREER_STORAGE||event.key===null))careerIsCurrent();
});
window.addEventListener('pageshow',event=>{
 if(event.persisted)try{careerIsCurrent()}catch{}
});
const resumedSortie=restoreSortie();if(resumedSortie)page='contracts';render();startAudio(false);requestAnimationFrame(draw);if(resumedSortie){toast('Sortie resumed. Your company is still in the fight.');if(resumedSortie.enemyPending)void endTurn();}
