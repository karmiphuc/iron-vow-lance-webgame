// Shared combat rules extracted from game.js.
// Dependencies supply the host's current combat state and seeded random source.
(function(root){
 'use strict';
 // Front Mission 3 style hit location. Every landed round rolls its own location.
 // Shares are of the live, non-cockpit parts and renormalise when a part is destroyed.
 const HIT_LOCATION=Object.freeze({body:.55,left:.125,right:.125,legs:.20});
 // Chance per attack that strikes the body that one of its body rounds hits the cockpit instead. Training adds pilotHit*PILOT_HIT_TRAINING.
 const PILOT_HIT_BASE=.03,PILOT_HIT_TRAINING=.2,PILOT_HIT_MIN=.01,PILOT_HIT_MAX=.05;
 const HIT_CAP=.99;
 const shotsPerAttack=w=>w.burst||w.rounds||1;
 const hitOdds=(accuracy,dodge=0)=>({
  hit:Math.min(HIT_CAP,1-dodge,accuracy),
  crit:Math.min(1,Math.max(0,accuracy-HIT_CAP))
 });
 const roundWeight=(round,count)=>round.critical?(count>1?2:1.5):1;
 const BREACH_LIMBS=Object.freeze(['right','left','legs']);
 const pilotHitChance=training=>Math.min(PILOT_HIT_MAX,Math.max(PILOT_HIT_MIN,PILOT_HIT_BASE+(training?.pilotHit??0)*PILOT_HIT_TRAINING));
 function createTerrainRules({getBattle,onBoard,movementLimit,terrainCell,helicopterHeight,canReachTarget,launchesMissiles}){
  function occupied(x,z){return getBattle().units.some(u=>u.alive&&u.x===x&&u.z===z)}
  const neighborTiles=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
  function paths(u,flight=false){
   const {cover}=getBattle();
   const max=movementLimit(u),costs=new Map([[u.x+','+u.z,0]]),queue=[[u.x,u.z]];
   for(let k=0;k<queue.length;k++){
    const [x,z]=queue[k],cost=costs.get(x+','+z);
    if(cost>=max)continue;
    for(const [a,b] of neighborTiles(x,z)){
     const key=a+','+b;
     if(!onBoard(a,b)||costs.has(key)||occupied(a,b)||(u.kind!=='helicopter'&&cover.has(key)))continue;
     costs.set(key,cost+1);queue.push([a,b]);
    }
   }
   if(u.kind==='helicopter'&&!flight)for(const key of cover)costs.delete(key);
   return costs;
  }
  function route(u,x,z){
   const costs=paths(u,true),end=x+','+z;
   if(!costs.has(end)||getBattle().cover.has(end))return [];
   const steps=[];
   let a=x,b=z;
   while(a!==u.x||b!==u.z){
    steps.unshift({x:a,z:b});
    const previous=neighborTiles(a,b).find(([q,r])=>costs.get(q+','+r)===costs.get(a+','+b)-1);
    if(!previous)return [];
    [a,b]=previous;
   }
   return steps;
  }
  function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)}
  function inCover(t){return t.kind!=='helicopter'&&neighborTiles(t.x,t.z).some(([x,z])=>getBattle().cover.has(x+','+z))}
  const HIGH_GROUND_AIM=.10;
  const terrainLevel=u=>getBattle()?.field.cells?(terrainCell(u.x,u.z)?.level??0):0;
  const fireLevel=u=>terrainLevel(u)+(u.kind==='helicopter'?helicopterHeight():0);
  function ridgeBlocks(a,t){
   if(!getBattle()?.field.cells||a.x===t.x&&a.z===t.z)return false;
   const dx=t.x-a.x,dz=t.z-a.z,nx=Math.abs(dx),nz=Math.abs(dz),sx=Math.sign(dx),sz=Math.sign(dz);
   const from=fireLevel(a),start=from+.5,rise=fireLevel(t)-from;
   let x=a.x,z=a.z,ix=0,iz=0;
   // Cross each tile between the endpoints. A ray touching only a corner passes.
   while(x!==t.x||z!==t.z){
    const tx=(ix+.5)/nx,tz=(iz+.5)/nz;
    const enter=Math.min(tx,tz);
    if(tx<=tz){x+=sx;ix++}
    if(tz<=tx){z+=sz;iz++}
    if(x===t.x&&z===t.z)break;
    const exit=Math.min((ix+.5)/nx,(iz+.5)/nz);
    if(terrainCell(x,z)?.level>start+rise*(rise>0?enter:exit)+1e-9)return true;
   }
   return false;
  }
  function attackObstruction(a,t,w){
   if(!canReachTarget(w,t))return 'AIRBORNE';
   return !w.melee&&!launchesMissiles(w)&&ridgeBlocks(a,t)?'RIDGE BLOCK':'';
  }
  function highGroundAim(a,t,w){
   if(a.kind||t.kind==='helicopter'||w.melee||launchesMissiles(w))return 0;
   return HIGH_GROUND_AIM*Math.min(3,Math.max(0,terrainLevel(a)-terrainLevel(t)));
  }
  return {occupied,neighborTiles,paths,route,distance,inCover,ridgeBlocks,attackObstruction,highGroundAim};
 }
 function createCombatRules({weapon,armoryClass,inCover,distance,limbPart,hasMechSkill,launchesMissiles,highGroundAim,dodgeChance,battleUnits,deadeyePower,damagedArmor,braceReduction,activeShield,volleyBudget,ASHIGARU_FRAME,VANGUARD_FRAME,SHOGUN_FRAME,CAIRN_FRAME,HARRIER_FRAME,FREE_HAND_COUNTER}){
// A primed Breach Charge turns the next ranged shot into a charged shot whatever part is passed.
const chargedLimbShot=(a,w,part,reaction)=>Boolean(a.breach&&!reaction&&!w.melee);
// Part whose accuracy a shot uses: charged shots keep the old limb accuracy, every other shot uses the body.
const shotPart=(a,w,reaction)=>chargedLimbShot(a,w,'body',reaction)?'right':'body';
function mechAim(a,t,w,reaction){
 const state=a.mechState,spot=t.mechState?.spot,direct=!w.melee&&!launchesMissiles(w);
 return (!reaction&&direct&&hasMechSkill(a,0)&&!state?.fired&&!state?.moved ? .06 : 0)+
  (direct&&hasMechSkill(a,HARRIER_FRAME)&&distance(a,t)===1 ? .04 : 0)+
  (direct&&a.brace&&hasMechSkill(a,CAIRN_FRAME) ? .04 : 0)+
  (!w.melee&&spot?.team===a.team&&spot.source!==a.id ? .05 : 0)-
  (direct&&state?.disrupted ? .10 : 0)-
  (reaction&&state?.basilisk ? .15 : 0)+
  (a.frame!==ASHIGARU_FRAME&&hasMechSkill(a,ASHIGARU_FRAME)&&(w.melee?distance(a,t)===1:distance(a,t)>=2) ? .05 : 0);
}
function hitChance(a,t,part,w=weapon(a.weapon),reaction=false){
 const training=a.training,aim=(w.melee?training?.meleeHit:training?.rangedHit)??0;
 const cockpit=part==='pilot'?(training?.pilotHit??0):0;
 const cover=inCover(t)&&w.id!=='missile'&&!w.guided&&!w.melee&&!(a.brace&&training?.braceAim)?.19:0;
 const range=distance(a,t);
 const falloff=(shotsPerAttack(w)>1&&armoryClass(w)==='assault'?.02*range:0)+
  (w.falloff?Math.max(0,range-w.falloff.start)*w.falloff.step:0);
 const support=(a.team==='ally'?(t.painted?.aim??0):0)+(reaction?0:a.order?.aim??0);
 const breachAim=(chargedLimbShot(a,w,part,reaction)?training?.breachAim??0:0)+mechAim(a,t,w,reaction);
 const accuracy=Math.max(part==='pilot'?.32:.5,.96-(part==='body'?0:part==='pilot'?.27:.13)-(a.max.pilot&&a.hp.pilot<a.max.pilot*.5?.10:0)-cover-falloff+.015*(a.level-1)+aim+(w.aim??0)+cockpit+support+breachAim+highGroundAim(a,t,w)-(a.blackout?.aim??0));
 return accuracy*(1-dodgeChance(t));
}
function shieldProtection(target){
 if(target.team!=='ally')return 0;
 const guardian=battleUnits()?.find(u=>u.training?.shieldNet);
 return guardian&&guardian!==target&&guardian.alive&&guardian.brace&&distance(guardian,target)===1?guardian.training.shieldNet:0;
}
function damage(a,t,w=weapon(a.weapon),part='body',reaction=false){
 const training=a.training,weaponPower=(w.melee?training?.meleePower:training?.rangedPower)??0;
 const limb=limbPart(part),limbPower=limb?(training?.limbPower??0):0;
 const reactionPower=(reaction?(training?.reactionPower??0):0)+
  (reaction&&w.melee&&hasMechSkill(a,6)?.20:0)+
  (a.brace&&launchesMissiles(w)&&hasMechSkill(a,7)&&!a.mechState?.behemothUsed?.15:0)+
  (w.scatter&&distance(a,t)===1&&hasMechSkill(a,9)?.15:0)+
  (w.melee&&hasMechSkill(a,VANGUARD_FRAME)&&a.mechState?.moved>=2?.20:0);
 const support=(a.team==='ally'?(t.painted?.power??0):0)+(reaction?0:a.order?.power??0);
 const charged=chargedLimbShot(a,w,part,reaction),breachPower=charged?training?.breachPower??.60:0;
 const power=w.damage*(1+.05*(a.level-1))*(a.boost?deadeyePower(training):1)*(1+weaponPower+limbPower+reactionPower+support+breachPower);
 const armor=t.hp.left===0?damagedArmor(t.armor):t.armor;
 const pierce=Math.max(w.pierce??0,w.melee?(training?.meleePierce??0):0,limb?(training?.limbPierce??0):0,charged?training?.breachPierce??.50:0);
 const bracePiercing=!w.melee&&!launchesMissiles(w)?(hasMechSkill(a,SHOGUN_FRAME)?.20:hasMechSkill(a,3)?.15:0):0;
 const brace=t.brace?Math.max(0,braceReduction(t.training)-bracePiercing):0;
 const amount=Math.max(5,Math.round((power-armor*(1-pierce))*(1-brace)*(1-shieldProtection(t))));
 return w===FREE_HAND_COUNTER?Math.min(amount,10):amount;
}
function partDamage(a,t,part,w,reaction=false){
 const amount=damage(a,t,w,part,reaction);
 const shield=activeShield(t);
 if(shield)return Math.max(5,Math.round(amount*(1-shield.reduction)*(t.brace&&hasMechSkill(t,8)&&!t.mechState?.aegisUsed?.8:1)));
 return part==='pilot'?Math.max(3,Math.round(amount*.5)):amount;
}
function attackBudget(a,t,part,w,reaction=false){
 const amount=partDamage(a,t,part,w,reaction);
 return volleyBudget(w,amount);
}
 return {chargedLimbShot,shotPart,mechAim,hitChance,shieldProtection,damage,partDamage,attackBudget};
 }
 function createVolleyPlanner({hitChance,dodgeChance,activeShield,targetParts,attackBudget,ruleRandom,chargedLimbShot=()=>false}){
// Weighted pick from [[part,weight]] using one draw. Callers pass only live parts, so the weights renormalise.
function pickWeighted(entries,roll){
 const total=entries.reduce((sum,[,weight])=>sum+weight,0);
 let edge=0;
 for(const [part,weight] of entries){edge+=weight/total;if(roll<edge)return part}
 return entries.at(-1)[0];
}
function planVolley(a,t,aimed,w,reaction){
 const charged=chargedLimbShot(a,w,aimed,reaction);
 // Nobody aims: normal shots roll to hit against the body. Charged shots keep limb accuracy.
 const dodge=dodgeChance(t),odds=hitOdds(hitChance(a,t,charged?'right':'body',w,reaction),dodge);
 const shield=activeShield(t),live=targetParts(t).filter(part=>t.hp[part]>0);
 const limbs=charged?BREACH_LIMBS.filter(part=>live.includes(part)):[];
 const frame=(charged?limbs:live.filter(part=>part!=='pilot')).map(part=>[part,HIT_LOCATION[part]??0]).filter(([,weight])=>weight>0);
 const table=!frame.length?[['body',1]]:frame;
 const pilotChance=!charged&&live.includes('pilot')?pilotHitChance(a.training):0;
 const count=shotsPerAttack(w);
 const shell=w.scatter?ruleRandom():null;
 const rounds=[],hits=new Map();
 let evades=0,landed=0;
 for(let i=0;i<count;i++){
  const roll=shell??ruleRandom(),dodged=dodge>0&&roll>=1-dodge,hit=!dodged&&roll<odds.hit;
  let part=table[0][0];
  if(shield&&hit)part='left';
  else if(hit&&table.length>1)part=pickWeighted(table,ruleRandom());
  // Ordinary rounds use the upper end of their hit interval for crits.
  // Pellets share a shell hit roll, so their crit checks roll separately.
  const critical=hit&&odds.crit>0&&(w.scatter?ruleRandom():roll/odds.hit)>=1-odds.crit;
  rounds.push(critical?{part,hit,critical}:{part,hit});
  if(dodged)evades++;
  if(hit){landed++;hits.set(part,(hits.get(part)??0)+1)}
 }
 // Cockpit: one check per attack, only when the attack struck the body. On a hit, one body round becomes a cockpit round.
 if(pilotChance>0&&hits.get('body')&&ruleRandom()>=1-pilotChance){
  const r=rounds.find(r=>r.hit&&r.part==='body');r.part='pilot';
  hits.set('body',hits.get('body')-1);if(!hits.get('body'))hits.delete('body');hits.set('pilot',1);
 }
 // Each part is charged its own bonuses (limb training on limbs, halving on the cockpit)
 // for the rounds that landed on it. A part that was struck always takes at least 1.
 const impacts=[];
 for(const part of hits.keys()){
  const weight=rounds.reduce((sum,r)=>r.hit&&r.part===part?sum+roundWeight(r,count):sum,0);
  const amount=Math.max(1,Math.round(attackBudget(a,t,part,w,reaction)*weight/count));
  if(amount>0)impacts.push({part,amount});
 }
 return {rounds,impacts,landed,dodged:evades===count,guard:Boolean(shield&&landed)};
}
 return planVolley;
 }
 function createReactionRules({isArmed,equippedShield,counterRange,unitWeapon,distance,scoutWeapon,attackObstruction,meleeWeapon,workingWeapon=(u,w)=>w&&u.hp[w.melee?'left':'right']>0,BULWARK_FRAME,ASHIGARU_FRAME,FREE_HAND_COUNTER}){
function reactionStatus(u){
 if(!u?.alive||u.kind)return 'UNAVAILABLE';
 if(u.blackout)return 'JAMMED';
 if(u.reacted)return 'USED';
 if(u.frame===BULWARK_FRAME)return isArmed(u)?'READY':'UNAVAILABLE';
 return u.meleeHand==='right'&&workingWeapon(u,meleeWeapon(u))||u.hp.left>0&&!equippedShield(u)||workingWeapon(u,unitWeapon(u))&&counterRange(unitWeapon(u),u.training,u.brace)>0?'READY':'UNAVAILABLE';
}
function reactionWeapon(defender,attacker){
 if(reactionStatus(defender)!=='READY'||!attacker?.alive)return null;
 if(defender.frame===ASHIGARU_FRAME)return distance(defender,attacker)<=2?scoutWeapon(defender,attacker,true):null;
 const range=distance(defender,attacker),close=range===1&&defender.hp.left>0&&!equippedShield(defender)&&!attackObstruction(defender,attacker,FREE_HAND_COUNTER);
 if(defender.frame===BULWARK_FRAME){
  const bash=meleeWeapon(defender),cut=unitWeapon(defender);
  return range===1&&!attackObstruction(defender,attacker,cut)?(defender.hp.left>0?bash:defender.hp.right>0?cut:null):null;
 }
 const melee=meleeWeapon(defender);
 if(range===1&&(defender.melee||defender.meleeHand==='right')&&workingWeapon(defender,melee)&&!attackObstruction(defender,attacker,melee))return melee;
 const ranged=unitWeapon(defender),reach=counterRange(ranged,defender.training,defender.brace);
 if(workingWeapon(defender,ranged)&&reach&&range<=reach&&!attackObstruction(defender,attacker,ranged))return ranged;
 return close?FREE_HAND_COUNTER:null;
}
 return {reactionStatus,reactionWeapon};
 }
 function createEnemyTurn({getBattle,ROUND_AP,resetMovement,renderBattle,unitWeapon,distance,meleeWeapon,scoutWeapon,targetParts,canUseWeapon,attackObstruction,combatRange,launchesMissiles,hasMechSkill,paths,movementLimit,canJumpjet,jumpjetDestination,useJumpjet,moveUnit,engage,checkEnd,isArmed,addLog,shoulderWeapon=()=>null,workingWeapon=()=>true,trySurrender=()=>false,VANGUARD_FRAME,BULWARK_FRAME,ASHIGARU_FRAME,AERO_FRAME,CITADEL_FRAME}){
function enemyAttackWeapon(u,t,primary){
 const battle=getBattle();
 if(u.frame===ASHIGARU_FRAME)return scoutWeapon(u,t);
 const range=distance(u,t),strike=range===1?meleeWeapon(u):null;
 const candidates=u.frame===BULWARK_FRAME&&battle.turn%2?[primary,strike]:[strike,primary,shoulderWeapon(u)];
 return candidates.find(w=>w&&range<=combatRange(u,t,w)&&(u.kind?u.ap>=w.ap:canUseWeapon(u,w))&&!attackObstruction(u,t,w)&&!(launchesMissiles(w)&&hasMechSkill(u,CITADEL_FRAME)&&u.mechState?.lock?.turn===battle.turn));
}
async function runEnemyTurn(){
 const battle=getBattle();
 const enemies=battle.units.filter(u=>u.team==='enemy'&&u.alive);
 enemies.forEach(u=>{u.ap=ROUND_AP-(u.blackout?.ap??0);u.brace=false;resetMovement(u)});renderBattle();
 for(const enemy of enemies){
  const allies=battle.units.filter(u=>u.team==='ally'&&u.alive);
  if(!allies.length)break;
  if(trySurrender(enemy,allies)){if(checkEnd())return true;continue;}
  const primary=unitWeapon(enemy);
  allies.sort((a,b)=>distance(enemy,a)-distance(enemy,b));
  let target=allies[0];
  const vanguard=enemy.frame===VANGUARD_FRAME,bulwark=enemy.frame===BULWARK_FRAME,scout=enemy.frame===ASHIGARU_FRAME;
  const strike=meleeWeapon(enemy);
  const chase=(!workingWeapon(enemy,primary)||vanguard||enemy.frame===AERO_FRAME||scout&&enemy.hp.right<=0)&&canUseWeapon(enemy,strike)?strike:workingWeapon(enemy,primary)?primary:shoulderWeapon(enemy)??primary;
  const chaseRange=chase.range;
  if(attackObstruction(enemy,target,chase)==='RIDGE BLOCK')target=allies.find(ally=>enemyAttackWeapon(enemy,ally,primary))??target;
  const blocked=attackObstruction(enemy,target,chase)==='RIDGE BLOCK'&&!enemyAttackWeapon(enemy,target,primary);
  const alert=vanguard||bulwark||scout||battle.legacy||distance(enemy,target)<=(enemy.kind==='helicopter'?11:12)||targetParts(enemy).some(p=>enemy.hp[p]<enemy.max[p]);
  if(!alert)continue;
  if(!enemy.blackout?.hold&&(distance(enemy,target)>chaseRange||blocked)&&(movementLimit(enemy)>0||canJumpjet(enemy))){
   const options=[...paths(enemy)].map(([key,cost])=>{
    const [x,z]=key.split(',').map(Number);
    const d=distance(target,{x,z});
    return{x,z,cost,d,clear:blocked&&d<=chaseRange&&!attackObstruction({...enemy,x,z},target,chase)};
   }).sort((a,b)=>Number(b.clear)-Number(a.clear)||(scout&&enemy.hp.right>0?Math.abs(a.d-3)-Math.abs(b.d-3)||a.cost-b.cost:a.d-b.d||a.cost-b.cost));
   const next=options[0];
   const jet=next?.d>chaseRange?jumpjetDestination(enemy,target):null;
   if(jet&&jet.d<next.d)await useJumpjet(enemy,jet.x,jet.z);
   else if(next&&(next.clear||next.d<distance(enemy,target)))await moveUnit(enemy,next.x,next.z,next.cost);
  }
  while(enemy.alive&&target.alive){
   const w=enemyAttackWeapon(enemy,target,primary);
   if(!w)break;
   await engage(enemy,target,'body',w);renderBattle();
   if(checkEnd())return true;
   if(enemy.kind)break;
  }
  if(!isArmed(enemy))addLog(enemy.name+(bulwark||scout||enemy.frame===AERO_FRAME?' cannot attack: both weapon arms destroyed.':' cannot fire: weapon arm destroyed.'));
 }
 return false;
}
 return {enemyAttackWeapon,runEnemyTurn};
 }
 // Commands own gameplay mutations. The host supplies presentation, persistence and the current board.
 function createCombatTransactions({
  getBattle,launchesMissiles,hasMechSkill,CITADEL_FRAME,barrageTarget,distance,combatRange,
  attackObstruction,mechState,paidAttackAP,startAction,addLog,toast,
  beginAttackCamera,closeAttackCamera,shoot,BASTION_FRAME,unitWeapon,counterRange,reactionStatus,reactionWeapon,FREE_HAND_COUNTER,braceUnit,
  freeMovement,EXTRA_MOVE_AP,chargedLimbShot,REAVER_FRAME,HELLBREAKER,roundAP,resetMovement,highGroundAim
 }){
  function barrageRestriction(attacker,defender,w){
   if(!launchesMissiles(w)||!hasMechSkill(attacker,CITADEL_FRAME))return null;
   if(attacker.mechState?.lock?.turn===getBattle().turn)return 'pending';
   const marked=barrageTarget(attacker);
   return marked&&attacker.team==='ally'&&defender!==marked&&distance(attacker,marked)<=combatRange(attacker,marked,w)?'marked':null;
  }

  async function engage(attacker,defender,part,w){
   if(attackObstruction(attacker,defender,w))return;
   if(launchesMissiles(w)&&hasMechSkill(attacker,CITADEL_FRAME)){
    const state=mechState(attacker),restriction=barrageRestriction(attacker,defender,w);
    if(restriction==='pending'){addLog(attacker.name+' awaits its marked barrage next round.');return}
    const marked=barrageTarget(attacker);
    if(marked&&distance(attacker,marked)<=combatRange(attacker,marked,w)){
     if(restriction==='marked'){toast('Fire at the marked tile.');return}
     defender=marked;part=marked.hp[part]>0?part:'body';delete state.lock;
    }else{
     state.lock={x:defender.x,z:defender.z,turn:getBattle().turn};
     attacker.ap-=paidAttackAP(attacker,w);startAction(attacker);
     addLog(attacker.name+' marks tile '+defender.x+', '+defender.z+' for a missile barrage next round.');return;
    }
   }
   const sequence=beginAttackCamera(attacker,defender,w,part);
   const before=Object.values(defender.hp).reduce((sum,hp)=>sum+hp,0);
   try{
    const jammed=await shoot(attacker,defender,part,w,false,sequence);
    if(Object.values(defender.hp).reduce((sum,hp)=>sum+hp,0)<before){
     for(const guardian of getBattle().units){
      if(!attacker.alive)break;
      if(guardian===defender||guardian.team!==defender.team||!hasMechSkill(guardian,BASTION_FRAME)||distance(guardian,defender)!==1)continue;
      const ranged=unitWeapon(guardian),reach=counterRange(ranged,guardian.training,guardian.brace);
      if(reactionStatus(guardian)!=='READY'||guardian.hp.right<=0||ranged.melee||!reach||distance(guardian,attacker)>reach||attackObstruction(guardian,attacker,ranged))continue;
      guardian.reacted=true;addLog(guardian.name+' covers its adjacent ally.');
      await shoot(guardian,attacker,'body',ranged,true,sequence);
     }
    }
    if(jammed){addLog(defender.name+' counter jammed.');return}
    const counter=reactionWeapon(defender,attacker);
    if(!counter)return;
    defender.reacted=true;
    addLog(defender.name+(counter===FREE_HAND_COUNTER?' counters with a free hand.':counter.melee?' counters in melee.':' returns fire.'));
    await shoot(defender,attacker,'body',counter,true,sequence);
    if(defender.training?.counterBrace)braceUnit(defender);
   }finally{
    if(defender.mechState)delete defender.mechState.basilisk;
    if(sequence)closeAttackCamera(sequence);
   }
  }
  function spendMovement(u,tiles){
   if(u.mechSkills)mechState(u).moved=(u.mechState.moved??0)+tiles;
   const free=Math.min(freeMovement(u),tiles);
   u.moveLeft=freeMovement(u)-free;
   if(u.mechState?.valkyrieStep){delete u.mechState.valkyrieStep;u.moveLeft=0}
   if(tiles>free){startAction(u);u.extraStep=true;u.ap-=EXTRA_MOVE_AP}
  }
  function spendAttack(a,w,part,reaction){
   const paid=reaction?0:paidAttackAP(a,w),charged=chargedLimbShot(a,w,part,reaction);
   if(!reaction){if(!a.order?.keepMove&&!(charged&&a.training?.breachMove))startAction(a);a.ap-=paid}
   return {paid,charged};
  }
  function recordVolley(a,t,w,reaction,guard){
   if(!reaction&&!w.melee&&a.mechSkills){
    const state=mechState(a);
    if(!launchesMissiles(w))state.fired=true;
    if(hasMechSkill(a,5)&&!state.valkyrieUsed){state.valkyrieUsed=true;state.valkyrieStep=true}
   }
   if(!w.melee&&!launchesMissiles(w)&&a.mechState)delete a.mechState.disrupted;
   if(a.brace&&launchesMissiles(w)&&hasMechSkill(a,7))mechState(a).behemothUsed=true;
   if(!w.melee&&t.mechState?.spot?.team===a.team&&t.mechState.spot.source!==a.id)delete t.mechState.spot;
   if(guard&&t.brace&&hasMechSkill(t,8))mechState(t).aegisUsed=true;
  }
  function applyImpact(t,event){
    const before=t.hp[event.part];
    t.hp[event.part]=Math.max(0,before-event.amount);
    event.before=before;event.after=t.hp[event.part];event.damage=before-t.hp[event.part];
   return before>0&&event.after===0;
  }
  function recordHit(a,t,w,hit,impacts,charged,reaction){
   if(hit){
    if(!w.melee&&highGroundAim(a,t,w)>0&&hasMechSkill(a,1))mechState(t).spot={source:a.id,team:a.team};
    if(!reaction&&launchesMissiles(w)&&hasMechSkill(a,2))mechState(t).basilisk=true;
    if(!w.melee&&!launchesMissiles(w)&&impacts.some(impact=>impact.part==='right')&&hasMechSkill(a,REAVER_FRAME))mechState(t).disrupted=true;
    if(w.melee&&hasMechSkill(a,HELLBREAKER))t.brace=false;
   }
   if(charged&&--a.breach===0)delete a.breach;
   if(!reaction&&a.order&&--a.order.shots===0)delete a.order;
   if(a.team==='ally'&&t.painted&&(--t.painted.shots===0||!t.alive))delete t.painted;
  }
  function completeRound(){
   const battle=getBattle();
   battle.turn++;battle.phase='player';battle.busy=false;
   battle.units.forEach(u=>{u.reacted=false;delete u.order;delete u.blackout;if(u.team==='ally'&&u.alive){u.ap=roundAP(u.training);u.brace=false;resetMovement(u)}});
  }
  return {barrageRestriction,engage,spendMovement,spendAttack,recordVolley,applyImpact,recordHit,completeRound};
 }
 // War's autonomous target/movement policy follows the Rig Bench reference
 // (docs/reference/claude/rig-bench.html:2680-2701). All legal choices,
 // effects on combat state and reactions come from the host's game commands.
 function createWarDriver(game,{ready,reset}={}){
  let settings,board,state,sequence,events=[],working=false;
  function report(){
   return state?{...settings,...state,...board,unfinished:state.units.length>0,events:events.slice()}:null;
  }
  async function issue(event,command){
   const turn=state.turn;
   await command();
   state=game.rulesSnapshot();
   const record={turn,...event,log:state.log};
   events.push(record);
   return record;
  }
  const alive=id=>state.units.some(unit=>unit.id===id&&unit.alive);
  async function* commands(){
   for(let round=0;round<settings.maxTurns&&state.units.length;round++){
    for(const {id} of state.units.filter(unit=>unit.team==='ally'&&unit.alive)){
     if(!alive(id))continue;
     let choices=game.choices(id);
     const move=choices.moves.filter(option=>option.score<choices.currentScore)
      .sort((a,b)=>a.score-b.score||a.cost-b.cost||a.x-b.x||a.z-b.z)[0];
     if(move)yield await issue({actor:id,action:'move',x:move.x,z:move.z},()=>game.move(id,move.x,move.z));
     for(let attacks=0;alive(id);attacks++){
      choices=game.choices(id);
      const attack=choices.attacks.sort((a,b)=>a.hp-b.hp||a.target.localeCompare(b.target)||a.mode.localeCompare(b.mode))[0];
      if(!attack)break;
      if(attacks>=32)throw Error('Attack action limit exceeded');
      const {target,part,mode,weapon}=attack;
      yield await issue({actor:id,action:'attack',target,part,mode,weapon},()=>game.attack(id,target,part,mode));
     }
    }
    if(state.units.length)yield await issue({action:'endTurn'},()=>game.endTurn());
   }
  }
  function newBattle({seed=1,contract=0,maxTurns=30,...loadout}={}){
   if(working)throw Error('Finish the current War operation before starting another battle');
   if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be a uint32');
   if(!Number.isInteger(contract)||contract<0||contract>=game.contractCount)throw Error('Invalid contract');
   if(!Number.isInteger(maxTurns)||maxTurns<1)throw Error('maxTurns must be a positive integer');
   reset?.();game.start({...loadout,seed,contract});
   settings={seed,contract,maxTurns};
   state=game.rulesSnapshot();
   const {terrainSeed,size,theater}=state;
   board={terrainSeed,size,theater};events=[];sequence=commands();
   return report();
  }
  async function operate(operation){
   if(!sequence)throw Error('Start a War battle first');
   if(working)throw Error('A War operation is already running');
   working=true;
   try{if(state.units.length)await ready?.();return await operation();}
   finally{working=false;}
  }
  function step(){
   return operate(async()=>{const {done,value}=await sequence.next();return {done,event:value??null,state:report()};});
  }
  function run(){
   return operate(async()=>{
    // Consume the same commands as single-step, starting at the current yield.
    while(!(await sequence.next()).done){}
    return report();
   });
  }
  async function runBattle(options){
   newBattle(options);
   return run();
  }
  return {newBattle,step,run,runBattle,eventLog:()=>events.slice(),get state(){return report();},get running(){return working;}};
 }
 root.IRON_VOW_SIM=Object.freeze({hitOdds,shotsPerAttack,roundWeight,HIT_LOCATION,PILOT_HIT_BASE,PILOT_HIT_MIN,PILOT_HIT_MAX,pilotHitChance,createTerrainRules,createCombatRules,createVolleyPlanner,createReactionRules,createEnemyTurn,createCombatTransactions,createWarDriver});
})(typeof window==='undefined'?globalThis:window);
