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
 function createTerrainRules({getBattle,onBoard,movementLimit,freeMovement=movementLimit,extraMoveAP=1,terrainCell,helicopterHeight,canReachTarget,launchesMissiles}){
  function occupied(x,z){return getBattle().units.some(u=>u.alive&&u.x===x&&u.z===z)}
  const neighborTiles=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
  const reverseStepOrder=(p,x,z)=>p.x>x?0:p.x<x?1:p.z>z?2:3;
  const terrainLevel=(x,z)=>getBattle()?.field?.cells?(terrainCell(x,z)?.level??0):0;
  const elevationCost=(u,x,z,a,b)=>u.kind==='helicopter'?0:Number(terrainLevel(x,z)!==terrainLevel(a,b));
  function movementPlans(u,flight=false){
   const {cover}=getBattle(),limit=movementLimit(u),free=freeMovement(u);
   const origin={x:u.x,z:u.z,tiles:0,ap:0,elevationAP:0};
   const start=u.x+','+u.z,best=new Map([[start,origin]]);
   let frontier=new Map([[start,origin]]);
   const priorElevation=new Map([[start,0]]);
   // Mobility and AP are separate budgets. Keep the cheapest route at each
   // step count so a short climb and a longer flat detour can both compete.
   for(let tiles=1;tiles<=limit&&frontier.size;tiles++){
    const next=new Map();
    for(const plan of frontier.values())for(const [x,z] of neighborTiles(plan.x,plan.z)){
     const key=x+','+z;
     if(!onBoard(x,z)||occupied(x,z)||(u.kind!=='helicopter'&&cover.has(key)))continue;
     const elevationAP=plan.elevationAP+elevationCost(u,plan.x,plan.z,x,z);
     const ap=elevationAP+(tiles>free?extraMoveAP:0);
     if(ap>(u.ap??Infinity)||elevationAP>=(priorElevation.get(key)??Infinity))continue;
     const incumbent=next.get(key);
     if(incumbent&&(ap>incumbent.ap||ap===incumbent.ap&&
       reverseStepOrder(plan,x,z)>=reverseStepOrder(incumbent.previous,x,z)))continue;
     next.set(key,{x,z,tiles,elevationAP,ap,previous:plan});
    }
    for(const [key,plan] of next){
     priorElevation.set(key,plan.elevationAP);
     if(plan.ap<(best.get(key)?.ap??Infinity))best.set(key,plan);
    }
    frontier=next;
   }
   if(u.kind==='helicopter'&&!flight)for(const key of cover)best.delete(key);
   return best;
  }
  function paths(u,flight=false){return new Map([...movementPlans(u,flight)].map(([key,plan])=>[key,plan.tiles]));}
  function route(u,x,z,plan=movementPlans(u).get(x+','+z)){
   const steps=[];
   for(let node=plan;node?.previous;node=node.previous)steps.unshift({x:node.x,z:node.z});
   return steps;
  }
  function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)}
  function inCover(t){return t.kind!=='helicopter'&&neighborTiles(t.x,t.z).some(([x,z])=>getBattle().cover.has(x+','+z))}
  const HIGH_GROUND_AIM=.20;
  const fireLevel=u=>terrainLevel(u.x,u.z)+(u.kind==='helicopter'?helicopterHeight():0);
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
   return HIGH_GROUND_AIM*Math.min(3,Math.max(0,terrainLevel(a.x,a.z)-terrainLevel(t.x,t.z)));
  }
  return {occupied,neighborTiles,paths,route,movementPlans,elevationCost,terrainLevel,distance,inCover,ridgeBlocks,attackObstruction,highGroundAim};
 }
 function createCombatRules({weapon,armoryClass,inCover,distance,limbPart,hasMechSkill,launchesMissiles,highGroundAim,dodgeChance,battleUnits,deadeyePower,damagedArmor,braceReduction,activeShield,volleyBudget,ASHIGARU_FRAME,VANGUARD_FRAME,SHOGUN_FRAME,CAIRN_FRAME,LINE_INFANTRY_FRAME,LINE_ELITE_FRAME,SALTJACK_FRAME,SALT_WORKS_GARRISON_FRAME,HUSKY_FRAME,GIZA_FRAME,VYZOV_FRAME,FREE_HAND_COUNTER}){
// A primed Breach Charge turns the next ranged shot into a charged shot whatever part is passed.
const chargedLimbShot=(a,w,part,reaction)=>Boolean(a.breach&&!reaction&&!w.melee);
// Part whose accuracy a shot uses: charged shots keep the old limb accuracy, every other shot uses the body.
const shotPart=(a,w,reaction)=>chargedLimbShot(a,w,'body',reaction)?'right':'body';
function specialtyAim(a,t,w,direct){
 if(!direct)return 0;
 let aim=0;
 if(hasMechSkill(a,LINE_INFANTRY_FRAME)&&battleUnits()?.some(ally=>ally.id!==a.id&&ally.alive&&!ally.kind&&ally.team===a.team&&distance(a,ally)===1))aim+=.05;
 if(w.burst&&distance(a,t)>=4&&hasMechSkill(a,SALTJACK_FRAME))aim+=.06;
 if(inCover(a)&&hasMechSkill(a,SALT_WORKS_GARRISON_FRAME))aim+=.08;
 if(a.mechState?.moved&&distance(a,t)<=3&&hasMechSkill(a,HUSKY_FRAME))aim+=.08;
 if(!a.mechState?.moved&&distance(a,t)>=5&&hasMechSkill(a,GIZA_FRAME))aim+=.06;
 return aim;
}
function mechAim(a,t,w,reaction){
 const state=a.mechState,spot=t.mechState?.spot,direct=!w.melee&&!launchesMissiles(w);
 return specialtyAim(a,t,w,direct)+(!reaction&&direct&&hasMechSkill(a,0)&&!state?.fired&&!state?.moved ? .06 : 0)+
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
 let protection=0;
 for(const guardian of battleUnits()??[]){
  if(guardian.team===target.team&&guardian!==target&&guardian.alive&&guardian.brace&&guardian.training?.shieldNet&&distance(guardian,target)===1)
   protection=Math.max(protection,guardian.training.shieldNet);
 }
 return protection;
}
function damage(a,t,w=weapon(a.weapon),part='body',reaction=false){
 const training=a.training,weaponPower=(w.melee?training?.meleePower:training?.rangedPower)??0;
 const limb=limbPart(part),limbPower=limb?(training?.limbPower??0):0;
 const reactionPower=(reaction?(training?.reactionPower??0):0)+
  (reaction&&w.melee&&hasMechSkill(a,6)?.20:0)+
  (w.melee&&t.brace&&hasMechSkill(a,VYZOV_FRAME)?.15:0)+
  (reaction&&!w.melee&&a.brace&&hasMechSkill(a,LINE_ELITE_FRAME)?.10:0)+
  (a.brace&&launchesMissiles(w)&&hasMechSkill(a,7)&&!a.mechState?.behemothUsed?.15:0)+
  (w.scatter&&distance(a,t)===1&&hasMechSkill(a,9)?.15:0)+
  (!reaction&&w.melee&&hasMechSkill(a,VANGUARD_FRAME)&&a.mechState?.moved>=2&&!a.mechState.chargeUsed?.20:0);
 const support=(a.team==='ally'?(t.painted?.power??0):0)+(reaction?0:a.order?.power??0);
 const charged=chargedLimbShot(a,w,part,reaction),breachPower=charged?training?.breachPower??.60:0;
 const power=w.damage*(1+.05*(a.level-1))*(a.boost?deadeyePower(training):1)*(1+weaponPower+limbPower+reactionPower+support+breachPower);
 const armor=t.hp.left===0?damagedArmor(t.armor):t.armor;
 const pierce=Math.max(w.pierce??0,w.melee?(training?.meleePierce??0):0,limb?(training?.limbPierce??0):0,charged?training?.breachPierce??.50:0);
 const bracePiercing=!w.melee&&!launchesMissiles(w)?(Math.max(hasMechSkill(a,SHOGUN_FRAME)?.20:0,hasMechSkill(a,3)?(distance(a,t)<=4?.25:.15):0)):0;
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
  if(amount>0)impacts.push({part,amount:Math.min(amount,w.maxImpact??Infinity)});
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
 function createEnemyTurn({
  getBattle,ROUND_AP,resetMovement,renderBattle,unitWeapon,distance,meleeWeapon,scoutWeapon,canUseWeapon,
  attackObstruction,combatRange,launchesMissiles,hasMechSkill,paths,movementPlans,movementLimit,canJumpjet,jumpjetDestination,
  useJumpjet,moveUnit,engage,checkEnd,isArmed,addLog,shoulderWeapon=()=>null,workingWeapon=()=>true,
  trySurrender=()=>false,tryTactical,tacticalRange=()=>0,VANGUARD_FRAME,BULWARK_FRAME,ASHIGARU_FRAME,AERO_FRAME,CITADEL_FRAME,
  doctrine=()=>null,paidAttackAP=(_,w)=>w.ap,freeMovement=movementLimit,extraMoveAP=1,jumpjetAP=2,
  braceCost=()=>2,braceUnit=u=>{u.brace=true},startAction=()=>{},barrageTarget=()=>null,
  inCover=()=>false,highGroundAim=()=>0,reactionWeapon=()=>null,
  forecast=(_,t,w)=>({part:'body',damage:w.damage??10})
 }){
  const weapons=(u,primary=unitWeapon(u))=>[...new Set([primary,meleeWeapon(u),shoulderWeapon(u)])].filter(w=>w&&(u.kind||workingWeapon(u,w)));
  const paid=(u,w)=>u.kind?w.ap:paidAttackAP(u,w);
  const inReach=(u,t,w)=>distance(u,t)<=combatRange(u,t,w)&&!attackObstruction(u,t,w);
  function candidates(u,t,primary){
   const turn=getBattle().turn;
   if(u.frame===ASHIGARU_FRAME){
    const w=scoutWeapon(u,t);
    return w?[w]:[];
   }
   return weapons(u,primary).filter(w=>{
    if(!inReach(u,t,w)||(u.kind?u.ap<w.ap:!canUseWeapon(u,w)))return false;
    if(!launchesMissiles(w)||!hasMechSkill(u,CITADEL_FRAME))return true;
    if(u.mechState?.lock?.turn===turn)return false;
    const marked=barrageTarget(u);
    return !marked||marked===t||!inReach(u,marked,w);
   });
  }
  function shotValue(u,t,w){
   const {part,damage}=forecast(u,t,w);
   const hp=t.hp?.[part]??100,threat=weapons(t).length>0;
   // Fire can land on any live part. Prefer exposed, damaged targets without treating a finish as guaranteed.
   const exposed=t.kind||part==='left'?damage:damage*.55;
   const finish=hp>0?Math.min(1,exposed/hp):0;
   const counter=reactionWeapon(t,u);
   const response=counter?forecast(t,u,counter,true).damage:0;
   const bodyRisk=u.hp?.body>0&&response>=u.hp.body*.65?.55:.27;
   const count=u.kind?1:Math.max(1,Math.floor(u.ap/Math.max(1,paid(u,w))));
   const marking=launchesMissiles(w)&&hasMechSkill(u,CITADEL_FRAME)&&barrageTarget(u)!==t;
   const closeStrike=w.melee&&doctrine(u)?.[1]==='push'?10:0;
   const preference=u.frame===BULWARK_FRAME&&w.melee&&((getBattle().turn%2===1)===(w===unitWeapon(u)))?5:0;
   return (damage*(marking?.64:1)+4+(threat?5:0)+13*finish+preference+closeStrike)*(1+.55*(count-1))-response*bodyRisk;
  }
  function bestAttack(u,opponents,primary){
   let best=null;
   for(const t of opponents)for(const w of candidates(u,t,primary)){
    const value=shotValue(u,t,w);
    if(!best||value>best.value)best={target:t,weapon:w,value};
   }
   return best;
  }
  function enemyAttackWeapon(u,t,primary){return bestAttack(u,[t],primary)?.weapon;}
  function positionValue(u,opponents,friends,role){
   const [preferred,style]=role;
   const armed=weapons(u),near=Math.min(...opponents.map(t=>distance(u,t)));
   const weaponReach=Math.max(1,...armed.map(w=>w.range));
   const hasStrike=armed.some(w=>w.melee),hasRanged=armed.some(w=>!w.melee);
   const reach=!hasRanged?1:preferred===1&&!hasStrike?Math.min(4,weaponReach):Math.min(preferred,weaponReach);
   const shot=bestAttack(u,opponents);
   if(style==='patrol')return {shot,value:(shot?40:0)-near*8};
   const approach=Math.min(...opponents.flatMap(t=>armed.map(w=>{
    const obstruction=attackObstruction(u,t,w);
    if(obstruction==='AIRBORNE')return Infinity;
    return Math.max(0,distance(u,t)-Math.min(reach,combatRange(u,t,w)))+(obstruction==='RIDGE BLOCK'?2:0);
   })));
   const spacing=style==='push'?9:style==='mobile'?3:2;
   const cover=inCover(u)?(style==='screen'||style==='anchor'?7:3):0;
   const support=style==='escort'&&friends.some(friend=>!friend.kind&&distance(friend,u)===1)?7:0;
   const height=style==='high'?Math.max(0,...opponents.map(t=>armed[0]?highGroundAim(u,t,armed[0])*70:0)):0;
   const safe=style==='screen'||style==='mobile'?Math.max(0,reach-near)*2:0;
   const value=shot?32+shot.value:-8*approach;
   return {shot,value:value-spacing*Math.abs(reach-near)+cover+support+height-safe};
  }
  function bestPosition(u,opponents,friends,role){
   const armed=weapons(u);
   opponents=opponents.filter(t=>armed.some(w=>attackObstruction(u,t,w)!=='AIRBORNE'));
   if(!opponents.length)return {cost:0};
   let best={...positionValue(u,opponents,friends,role),x:u.x,z:u.z,cost:0};
   const [,style]=role;
   const currentShot=best.shot,front=Math.min(...opponents.map(t=>distance(u,t)));
   function consider(x,z,cost,ap,jet=false){
    if(u.ap<ap)return;
    const moved=jet?distance(u,{x,z}):cost;
    const next={...u,x,z,ap:u.ap-ap,mechState:{...u.mechState,moved:(u.mechState?.moved??0)+moved}};
    const result=positionValue(next,opponents,friends,role);
    if(currentShot){
     const pressured=opponents.some(t=>distance(u,t)<=2);
     const gainsHeight=style==='high'&&result.shot&&
      highGroundAim(next,result.shot.target,result.shot.weapon)>highGroundAim(u,currentShot.target,currentShot.weapon);
     const reposition=style==='push'&&!currentShot.weapon.melee||style==='mobile'||(style==='screen'&&pressured)||gainsHeight;
     if(!reposition)return;
    }
    const target=result.shot?.target,scout=u.frame===ASHIGARU_FRAME&&u.hp.right>0;
    // Ground assault units commit to the front line instead of running past it for a softer target.
    const bypass=style==='push'&&target?Math.max(0,distance(u,target)-front)*12:0;
    const originRange=target?distance(u,target):0,range=target?distance(next,target):0;
    const overextend=scout&&originRange>3?Math.max(0,3-range)*25:0;
    const leaveKnife=scout&&originRange===1&&range>1&&armed.some(w=>w.melee)?14:0;
    const value=result.value-cost*.75-ap*2-overextend-leaveKnife-bypass;
    if(value>best.value)best={...result,value,x,z,cost,jet};
   }
   if(movementPlans){
    for(const plan of movementPlans(u).values())if(plan.tiles)consider(plan.x,plan.z,plan.tiles,plan.ap);
   }else if(movementLimit(u)>0)for(const [key,cost] of paths(u)){
    if(cost===0)continue;
    const [x,z]=key.split(',').map(Number);
    consider(x,z,cost,cost>freeMovement(u)?extraMoveAP:0);
   }
   if((!best.shot||role[1]==='push'&&!best.shot.weapon.melee)&&canJumpjet(u))for(const t of opponents){
    const landing=jumpjetDestination(u,t);
    if(landing)consider(landing.x,landing.z,1,jumpjetAP,true);
   }
   return best;
  }
  function braceIfUseful(u,opponents,attack){
   if(u.kind||u.brace||u.ap<braceCost(u))return;
   const cost=braceCost(u);
   if(attack){
    const w=attack.weapon,ap=paid(u,w);
    const anchor=hasMechSkill(u,7)&&launchesMissiles(w)||hasMechSkill(u,8);
    if(!anchor||Math.floor((u.ap-cost)/ap)!==Math.floor(u.ap/ap))return;
   }else if(doctrine(u)?.[1]!=='anchor'||!opponents.some(t=>weapons(t).some(w=>inReach(t,u,w))))return;
   u.ap-=cost;startAction(u);braceUnit(u);addLog(u.name+' braces.');
  }
  async function runEnemyTurn(){
   const battle=getBattle();
   const enemies=battle.units.filter(u=>u.team==='enemy'&&u.alive);
   // The solo introductory contract needs room for a first pilot to learn movement and cover.
   const soloPatrol=battle.contract?.id==='picket'&&(battle.operation?.recommended??battle.slots?.length)===1;
   const opponents=()=>battle.units.filter(u=>u.team==='ally'&&u.alive);
   for(const u of enemies){u.ap=ROUND_AP-(u.blackout?.ap??0);u.brace=false;resetMovement(u);}
   renderBattle();
   for(const enemy of enemies){
    if(!enemy.alive)continue;
    let allies=opponents();
    if(!allies.length)break;
    if(trySurrender(enemy,allies)){if(checkEnd())return true;continue;}
    const arms=weapons(enemy);
    const patrol=enemy.frame===VANGUARD_FRAME||enemy.frame===BULWARK_FRAME||enemy.frame===ASHIGARU_FRAME;
    const detection=soloPatrol?12:Math.max(patrol?8:5,tacticalRange(enemy),...arms.map(w=>w.range+Number(!enemy.kind)));
    const active=battle.legacy||
     allies.some(t=>distance(enemy,t)<=detection)||
     Object.keys(enemy.hp).some(part=>enemy.hp[part]<enemy.max?.[part]);
    if(!active)continue;
    if(!isArmed(enemy)){addLog(enemy.name+' cannot attack: weapons disabled.');continue;}
    const role=soloPatrol?[unitWeapon(enemy)?.range??3,'patrol']:doctrine(enemy)??[unitWeapon(enemy)?.range??3,'hold'];
    const friends=enemies.filter(u=>u!==enemy&&u.alive);
    if(!enemy.blackout?.hold&&!(soloPatrol&&bestAttack(enemy,allies))){
     const position=bestPosition(enemy,allies,friends,role);
     if(position.jet)await useJumpjet(enemy,position.x,position.z);
     else if(position.cost)await moveUnit(enemy,position.x,position.z,position.cost);
    }
    if(tryTactical&&await tryTactical(enemy,allies)){
     renderBattle();
     if(checkEnd())return true;
     if(!enemy.alive)continue;
     allies=opponents();
    }
    let choice=bestAttack(enemy,allies);
    if(!soloPatrol)braceIfUseful(enemy,allies,choice);
    while(enemy.alive&&choice){
     const before=enemy.ap;
     await engage(enemy,choice.target,'body',choice.weapon);renderBattle();
     if(checkEnd())return true;
     if(enemy.kind||enemy.ap>=before)break;
     allies=opponents();
     choice=bestAttack(enemy,allies);
    }
    if(!enemy.alive)continue;
    if(enemy.mechState?.valkyrieStep&&!enemy.blackout?.hold){
     const position=bestPosition(enemy,allies,friends,role);
     if(position.cost&&!position.jet)await moveUnit(enemy,position.x,position.z,position.cost);
    }
    if(!soloPatrol)braceIfUseful(enemy,allies,null);
   }
   renderBattle();
   return false;
  }
  return {enemyAttackWeapon,runEnemyTurn};
 }
 // Commands own gameplay mutations. The host supplies presentation, persistence and the current board.
 function createCombatTransactions({
  getBattle,launchesMissiles,hasMechSkill,CITADEL_FRAME,barrageTarget,distance,combatRange,
  attackObstruction,mechState,paidAttackAP,startAction,addLog,toast,
  beginAttackCamera,closeAttackCamera,shoot,BASTION_FRAME,unitWeapon,counterRange,reactionStatus,reactionWeapon,FREE_HAND_COUNTER,braceUnit,
  freeMovement,EXTRA_MOVE_AP,chargedLimbShot,REAVER_FRAME,HELLBREAKER,VANGUARD_FRAME,roundAP,resetMovement,highGroundAim
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
  function spendMovement(u,tiles,elevationAP=0){
   u.ap-=elevationAP;
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
   if(!reaction&&w.melee&&hasMechSkill(a,VANGUARD_FRAME)&&a.mechState?.moved>=2)a.mechState.chargeUsed=true;
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
