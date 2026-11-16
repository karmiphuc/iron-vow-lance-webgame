// Shared combat rules extracted from game.js.
// Dependencies supply the host's current combat state and seeded random source.
(function(root){
 'use strict';
 function createCombatRules({weapon,inCover,distance,limbPart,hasMechSkill,launchesMissiles,highGroundAim,dodgeChance,battleUnits,deadeyePower,damagedArmor,braceReduction,activeShield,volleyBudget,ASHIGARU_FRAME,VANGUARD_FRAME,SHOGUN_FRAME,FREE_HAND_COUNTER}){
const chargedLimbShot=(a,w,part,reaction)=>Boolean(a.breach&&!reaction&&!w.melee&&limbPart(part));
function mechAim(a,t,w,reaction){
 const state=a.mechState,spot=t.mechState?.spot,direct=!w.melee&&!launchesMissiles(w);
 return (!reaction&&direct&&hasMechSkill(a,0)&&!state?.fired&&!state?.moved ? .06 : 0)+
  (!w.melee&&spot?.team===a.team&&spot.source!==a.id ? .05 : 0)-
  (direct&&state?.disrupted ? .10 : 0)-
  (reaction&&state?.basilisk ? .15 : 0)+
  (a.frame!==ASHIGARU_FRAME&&hasMechSkill(a,ASHIGARU_FRAME)&&(w.melee?distance(a,t)===1:distance(a,t)>=2) ? .05 : 0);
}
function hitChance(a,t,part,w=weapon(a.weapon),reaction=false){
 const training=a.training,aim=(w.melee?training?.meleeHit:training?.rangedHit)??0;
 const cockpit=part==='pilot'?(training?.pilotHit??0):0;
 const cover=inCover(t)&&w.id!=='missile'&&!w.guided&&!w.melee&&!(a.brace&&training?.braceAim)?.19:0;
 const falloff=w.falloff?Math.max(0,distance(a,t)-w.falloff.start)*w.falloff.step:0;
 const support=(a.team==='ally'?(t.painted?.aim??0):0)+(reaction?0:a.order?.aim??0);
 const breachAim=(chargedLimbShot(a,w,part,reaction)?training?.breachAim??0:0)+mechAim(a,t,w,reaction);
 const accuracy=Math.min(.98,Math.max(part==='pilot'?.32:.5,.96-(part==='body'?0:part==='pilot'?.27:.13)-(a.max.pilot&&a.hp.pilot<a.max.pilot*.5?.10:0)-cover-falloff+.015*(a.level-1)+aim+(w.aim??0)+cockpit+support+breachAim+highGroundAim(a,t,w)-(a.blackout?.aim??0)));
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
 const amount=partDamage(a,t,w.scatter&&part==='pilot'?'body':part,w,reaction);
 return volleyBudget(w,amount);
}
 return {chargedLimbShot,mechAim,hitChance,shieldProtection,damage,partDamage,attackBudget};
 }
 function createVolleyPlanner({hitChance,dodgeChance,activeShield,targetParts,attackBudget,ruleRandom,BURST_AIM_SHARE}){
function planVolley(a,t,aimed,w,reaction){
 const chance=hitChance(a,t,aimed,w,reaction),dodge=dodgeChance(t);
 const shield=activeShield(t),parts=targetParts(t).filter(part=>t.hp[part]>0);
 const other=parts.filter(part=>part!==aimed),spread=[aimed,...other],count=w.burst||1;
 const shell=w.scatter?ruleRandom():null;
 const rounds=[],hits=new Map();
 let evades=0,landed=0;
 for(let i=0;i<count;i++){
  const roll=shell??ruleRandom(),dodged=dodge>0&&roll>=1-dodge,hit=!dodged&&roll<=chance;
  let part=aimed;
  if(w.scatter)part=spread[i%spread.length];
  else if(w.burst&&hit&&other.length&&roll>chance*BURST_AIM_SHARE){
   const spreadIndex=Math.floor((roll/chance-BURST_AIM_SHARE)/(1-BURST_AIM_SHARE)*other.length);
   part=other[Math.min(other.length-1,spreadIndex)];
  }
  if(shield&&hit)part='left';
  rounds.push({part,hit});
  if(dodged)evades++;
  if(hit){landed++;hits.set(part,(hits.get(part)??0)+1)}
 }
 const budget=attackBudget(a,t,aimed,w,reaction);
 const total=landed?Math.max(1,Math.round(budget*landed/count)):0;
 // Round the aggregate once. Armor and the attack's bonuses are charged once
 // per action, and a landed scatter shell reserves a point for every live part.
 const minimum=w.scatter&&landed?1:0;
 const weight=(part,rounds)=>rounds*(w.burst&&part==='pilot'&&aimed!=='pilot'?.5:1);
 const weights=[...hits].reduce((sum,[part,n])=>sum+weight(part,n),0);
 let used=0,passed=0;
 const impacts=[];
 for(const [part,n] of hits){
  passed+=weight(part,n);
  const next=Math.round((total-minimum*hits.size)*passed/weights);
  const amount=minimum+next-used;used=next;
  if(amount>0)impacts.push({part,amount});
 }
 return {rounds,impacts,landed,dodged:evades===count,guard:Boolean(shield&&landed)};
}
 return planVolley;
 }
 function createReactionRules({isArmed,equippedShield,counterRange,unitWeapon,distance,scoutWeapon,attackObstruction,meleeWeapon,BULWARK_FRAME,ASHIGARU_FRAME,FREE_HAND_COUNTER}){
function reactionStatus(u){
 if(!u?.alive||u.kind)return 'UNAVAILABLE';
 if(u.blackout)return 'JAMMED';
 if(u.reacted)return 'USED';
 if(u.frame===BULWARK_FRAME)return isArmed(u)?'READY':'UNAVAILABLE';
 return u.hp.left>0&&!equippedShield(u)||u.hp.right>0&&counterRange(unitWeapon(u),u.training,u.brace)>0?'READY':'UNAVAILABLE';
}
function reactionWeapon(defender,attacker){
 if(reactionStatus(defender)!=='READY'||!attacker?.alive)return null;
 if(defender.frame===ASHIGARU_FRAME)return distance(defender,attacker)<=2?scoutWeapon(defender,attacker,true):null;
 const range=distance(defender,attacker),close=range===1&&defender.hp.left>0&&!equippedShield(defender)&&!attackObstruction(defender,attacker,FREE_HAND_COUNTER);
 if(defender.frame===BULWARK_FRAME){
  const bash=meleeWeapon(defender),cut=unitWeapon(defender);
  return range===1&&!attackObstruction(defender,attacker,cut)?(defender.hp.left>0?bash:defender.hp.right>0?cut:null):null;
 }
 if(close&&defender.melee)return meleeWeapon(defender);
 const ranged=unitWeapon(defender),reach=counterRange(ranged,defender.training,defender.brace);
 if(defender.hp.right>0&&reach&&range<=reach&&!attackObstruction(defender,attacker,ranged))return ranged;
 return close?FREE_HAND_COUNTER:null;
}
 return {reactionStatus,reactionWeapon};
 }
 function createEnemyTurn({getBattle,ROUND_AP,resetMovement,renderBattle,unitWeapon,distance,meleeWeapon,scoutWeapon,targetParts,canUseWeapon,attackObstruction,combatRange,launchesMissiles,hasMechSkill,paths,movementLimit,canJumpjet,jumpjetDestination,useJumpjet,moveUnit,engage,aiPart,checkEnd,isArmed,addLog,VANGUARD_FRAME,BULWARK_FRAME,ASHIGARU_FRAME,AERO_FRAME,CITADEL_FRAME}){
function enemyAttackWeapon(u,t,primary){
 const battle=getBattle();
 if(u.frame===ASHIGARU_FRAME)return scoutWeapon(u,t);
 const range=distance(u,t),strike=range===1?meleeWeapon(u):null;
 const candidates=u.frame===BULWARK_FRAME&&battle.turn%2?[primary,strike]:[strike,primary];
 return candidates.find(w=>w&&range<=combatRange(u,t,w)&&(u.kind?u.ap>=w.ap:canUseWeapon(u,w))&&!attackObstruction(u,t,w)&&!(launchesMissiles(w)&&hasMechSkill(u,CITADEL_FRAME)&&u.mechState?.lock?.turn===battle.turn));
}
async function runEnemyTurn(){
 const battle=getBattle();
 const enemies=battle.units.filter(u=>u.team==='enemy'&&u.alive);
 enemies.forEach(u=>{u.ap=ROUND_AP-(u.blackout?.ap??0);u.brace=false;resetMovement(u)});renderBattle();
 for(const enemy of enemies){
  const allies=battle.units.filter(u=>u.team==='ally'&&u.alive);
  if(!allies.length)break;
  const primary=unitWeapon(enemy);
  allies.sort((a,b)=>distance(enemy,a)-distance(enemy,b));
  let target=allies[0];
  const vanguard=enemy.frame===VANGUARD_FRAME,bulwark=enemy.frame===BULWARK_FRAME,scout=enemy.frame===ASHIGARU_FRAME;
  const strike=meleeWeapon(enemy);
  const chase=(vanguard||enemy.frame===AERO_FRAME||scout&&enemy.hp.right<=0)&&canUseWeapon(enemy,strike)?strike:primary;
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
   await engage(enemy,target,aiPart(enemy,target,w),w);renderBattle();
   if(checkEnd())return true;
   if(enemy.kind)break;
  }
  if(!isArmed(enemy))addLog(enemy.name+(bulwark||scout||enemy.frame===AERO_FRAME?' cannot attack: both weapon arms destroyed.':' cannot fire: weapon arm destroyed.'));
 }
 return false;
}
 return {enemyAttackWeapon,runEnemyTurn};
 }
 root.IRON_VOW_SIM=Object.freeze({createCombatRules,createVolleyPlanner,createReactionRules,createEnemyTurn});
})(typeof window==='undefined'?globalThis:window);
