const assert=require('node:assert/strict');
const createSimulation=require('./sim-harness.cjs');

(async()=>{
 const sim=createSimulation({random:()=>0}),{run}=sim;
 const groups={
  assault:['sidewinder','trident','forge','ember','rivet'],
  strike:['watchman','falcon','cerberus','obelisk','parallax'],
  melee:['hatchet','pike','tonfa','anchor-hammer']
 };
 assert.equal(run('WEAPONS.filter(w=>w.motion).length'),14);
 const legacy=[
  ['rifle',36,5,3,0],['shotgun',60,3,3,1500],['missile',45,7,4,2400],
  ['rail',70,8,5,3600],['hailstorm',49,5,4,2200],['rampart',61,6,5,2900],
  ['breaker',66,1,4,1600],['cleaver',40,1,2,1200],['piledriver',59,1,3,2100],['blade',64,1,3,2200]
 ];
 const signature=run("JSON.stringify(WEAPONS.filter(w=>!w.motion&&!w.builtIn&&!w.shoulder).map(w=>[w.id,w.damage,w.range,w.ap,w.price]))");
 assert.deepEqual(JSON.parse(signature),legacy,'the new armory preserves all ten original weapon stat lines');
 run('createBattle(0,false,false,[0]);const attacker=current(),foe=battle.units.find(u=>u.team==="enemy"&&!u.kind);foe.hp.body=foe.max.body=1000');
 for(const [group,ids] of Object.entries(groups))for(const id of ids){
  assert.equal(run(`armoryClass(weapon('${id}'))`),group,id);
  assert.ok(await run(`(async()=>{
   const w=weapon('${id}');attacker.ap=ROUND_AP;
   const health=()=>w.scatter?Object.values(foe.hp).reduce((sum,hp)=>sum+hp,0):foe.hp.body;
   const hp=health();
   if(w.melee)attacker.melee=w.id;else attacker.weapon=w.id;
   effects=[];await shoot(attacker,foe,'body',w);
   return ATTACK_PROFILES[w.id].melee===w.melee&&attacker.ap===ROUND_AP-w.ap
    &&hp-health()===Math.round(damage(attacker,foe,w)*(w.burst?1.15:1))&&effects.some(e=>e.type==='shot'&&e.kind===w.id);
  })()`),id+' uses its own damage, AP, profile and impact');
 }
 assert.ok(run(`(()=>{
  const rocket=weapon('cerberus'),vesper=weapon('missile');
  const cover=battle.cover;battle.cover=new Set();
  const clear=hitChance(attacker,foe,'left',rocket);
  battle.cover.add((foe.x+1)+','+foe.z);
  const covered=hitChance(attacker,foe,'left',rocket);
  const guided=hitChance(attacker,foe,'left',vesper);
  battle.cover=cover;
  return Math.abs(clear-covered-.19*(1-dodgeChance(foe)))<1e-9&&guided===clear&&counterRange(rocket,{range:1,counterRange:1})===0
   &&shotMuzzle(attacker,'cerberus',0)==='muzzle'&&shotMuzzle(attacker,'cerberus',1)==='muzzle2';
 })()`),'Cerberus respects cover, locks out counters and uses its own muzzle');
 assert.ok(run(`(()=>{
  attacker.weapon='cerberus';attacker.melee=null;attacker.reacted=false;
  foe.x=attacker.x+2;foe.z=attacker.z;
  if(reactionWeapon(attacker,foe)!==null)return false;
  foe.x=attacker.x+1;
  if(reactionWeapon(attacker,foe)!==FREE_HAND_COUNTER)return false;
  attacker.melee='pike';
  return reactionWeapon(attacker,foe)?.id==='pike';
 })()`),'adjacent free hand and lance still counter');
 assert.ok(run(`(()=>{
  foe.armor=20;foe.hp.left=40;foe.brace=false;
  battle.cover=new Set();foe.x=attacker.x+2;
  const near=hitChance(attacker,foe,'left',weapon('sidewinder'));
  foe.x=attacker.x+4;
  const far=hitChance(attacker,foe,'left',weapon('sidewinder'));
  return damage(attacker,foe,weapon('forge'))===52&&damage(attacker,foe,weapon('pike'))===50&&damage(attacker,foe,weapon('piledriver'))===54
   &&Math.abs(near-far-.10*(1-dodgeChance(foe)))<1e-9
   &&weaponRange(weapon('trident'),{range:1})===6&&armoryClass(weapon('trident'))==='assault';
 })()`),'piercing and trained range apply independently of classification');
 const career=createSimulation();
 career.run(`save.credits=12000;equipWeapon('obelisk');equipWeapon('pike');equipWeapon('obelisk');
  createBattle(0,false,false,[0]);selected=0;action='strike';persist()`);
 const resumed=createSimulation({storage:new Map(career.storage)});
 assert.equal(resumed.run('current().weapon+" "+current().melee+" "+action'),'obelisk pike strike');
 assert.equal(resumed.run('save.credits'),5450,'owned weapons are charged once');
 assert.ok(resumed.run("save.owned.includes('obelisk')&&save.owned.includes('pike')"));
 assert.equal(resumed.run('JSON.stringify(captureSortie())'),career.run('JSON.stringify(captureSortie())'));
 const veteran=createSimulation();
 const arm=veteran.run;
 arm("save.credits=50000;save.rep=119;equipWeapon('rivet');equipWeapon('parallax')");
 assert.equal(arm('save.credits'),50000);
 assert.equal(arm("save.owned.includes('rivet')||save.owned.includes('parallax')"),false);
 arm("save.rep=120;equipWeapon('rivet');selected=1;save.rep=179;equipWeapon('parallax')");
 assert.equal(arm('save.credits'),41400);
 assert.equal(arm("save.owned.includes('parallax')"),false);
 arm("save.rep=180;equipWeapon('parallax');equipWeapon('parallax');deploy(1,false,[0,1]);closeModal()");
 const late=createSimulation({storage:new Map(veteran.storage)}).run;
 assert.equal(late('save.credits'),27900);
 assert.equal(late("battle.units.slice(0,2).map(u=>u.weapon).join(' ')"),'rivet parallax');
 assert.equal(late('JSON.stringify(captureSortie())'),arm('JSON.stringify(captureSortie())'));
 console.log('PASS 14 expansion weapons, firing, reputation gates, one-time purchase, and exact save resume.');
})().catch(error=>{console.error(error);process.exitCode=1});
