const viewports=[{width:1366,height:1024},{width:1194,height:834},{width:1376,height:1032},{width:1210,height:834}];
const presets=[
 {id:'hangar',page:'hangar'},
 ...[0,1,2].map(selected=>({id:'workshop-'+selected,page:'workshop',selected})),
 {id:'paint',page:'workshop',selected:0,paint:true},
 ...['p','s','a'].map(paintChannel=>({id:'paint-'+({p:'primary',s:'secondary',a:'accent'}[paintChannel]),page:'workshop',selected:0,paint:true,paintChannel})),
 {id:'contracts',page:'contracts'},
 ...[1,2,3].map(contract=>({id:'battle-theater-'+(contract-1),contract,overview:true})),
 {id:'selected-move',contract:1},
 ...['rifle','shotgun','missile','rail','blade','parallax'].map(weapon=>({id:'attack-'+weapon,contract:1,weapon})),
 {id:'damaged',contract:1,damage:true,detailPart:'body',detailLevel:1,advanceSeconds:1},
 {id:'damage-healthy',contract:1,detailPart:'body',detailLevel:0,advanceSeconds:1},
 {id:'damage-body-destroyed',contract:1,detailPart:'body',detailLevel:2,advanceSeconds:2},
 ...['right','legs'].flatMap(detailPart=>[1,2].map(detailLevel=>({id:'damage-'+detailPart+(detailLevel===1?'-damaged':'-destroyed'),contract:1,detailPart,detailLevel,advanceSeconds:1}))),
 {id:'burning-wreck',contract:1,wreck:true,advanceSeconds:2},
 ...[0,5,6,7,8,9,10,12].map(liveFrame=>({id:'live-frame-'+liveFrame,contract:1,liveFrame})),
 {id:'rig-bench',path:'rig-bench/'}
];
// Serialized into the page by Playwright. No production test hooks or save-schema edits.
function setGamePreset(preset){
 save=fresh();battle=null;selected=preset.selected??0;effects=[];clock=5;last=5000-1000/60;
 if(typeof activeCinematic!=='undefined')activeCinematic=null;
 if(preset.page){
  page=preset.page;
  if(preset.paint){
   const u=save.units[selected];u.paint='#708657';u.trim={s:'#373b38',a:'#c19960'};
   if(preset.paintChannel){u.frame=5;if(preset.paintChannel==='p')u.paint='#be5143';else u.trim[preset.paintChannel]=preset.paintChannel==='s'?'#5c82b3':'#dfb92f';}
  }
  render();
  if(preset.paint)document.querySelector('.paint-panel')?.scrollIntoView?.({block:'center',behavior:'instant'});
  return;
 }
 page='contracts';createBattle(preset.contract);selected=0;action='move';
 const ally=battle.units.find(u=>u.team==='ally'),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
 if(preset.liveFrame!==undefined){ally.frame=preset.liveFrame;ally.weapon=FRAMES[ally.frame].weapon;ally.melee=FRAMES[ally.frame].melee;}
 if(!ally||!foe)throw Error('Capture fixture requires an ally and a hostile mech');
 if(typeof focusBattleCamera==='function')focusBattleCamera(ally,true);
 if(preset.overview&&typeof fieldCamera!=='undefined')fieldCamera.overview=true;
 if(preset.detailPart){
  const part=preset.detailPart,level=preset.detailLevel;
  ally.hp[part]=level===2?0:level===1?Math.floor(ally.max[part]*.35):ally.max[part];
  if(part==='body'&&level===2){ally.alive=false;ally.downReason='body';ally.deathTime=clock;}
  if(typeof focusBattleCamera==='function')focusBattleCamera(ally,true);viewZoom=1.65;
  if(typeof beginAttackCamera==='function'){
   battle.busy=true;const sequence=beginAttackCamera(foe,ally,weapon('rifle'),part);sequence.phase='result';
  }else if(typeof combatCamera!=='undefined'){combatCamera={x:ally.x,z:ally.z,span:2,until:clock+100};cameraBlend=1;}
 }
 if(preset.wreck){
  battle.cover.clear();battle.units=[ally,foe];foe.x=foe.vx=ally.x+2;foe.z=foe.vz=ally.z;
  foe.hp.body=0;foe.alive=false;foe.downReason='body';
  foe.deathTime=clock;
  if(typeof focusBattleCamera==='function')focusBattleCamera(foe,true);
  viewZoom=1.65;
  if(typeof combatCamera!=='undefined'){combatCamera={x:foe.x,z:foe.z,span:2,until:clock+100};cameraBlend=1;}
 }
 if(preset.weapon){
  if(typeof beginAttackCamera!=='function')throw Error('No matching attack-camera preset in this reference');
  const w=weapon(preset.weapon),profile=attackProfile(ally,w.id);
  if(w.melee)ally.melee=w.id;else ally.weapon=w.id;
  ally.fireTime=clock-.08;
  ally.attack={kind:w.id,start:clock-profile.raise-.08,fireAt:clock-.08,releaseAt:null,primeDuration:0,windup:profile.raise};
  battle.busy=true;
  const sequence=beginAttackCamera(ally,foe,w,'body');
  if(!sequence)throw Error('Attack camera did not open; capture requires full motion');
  sequence.start=clock-.5;sequence.phase='fire';sequence.fireAt=clock-.08;
 }
 render();
}
module.exports={viewports,presets,setGamePreset};
