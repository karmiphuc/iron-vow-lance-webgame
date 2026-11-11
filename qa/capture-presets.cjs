const viewports=[{width:1366,height:1024},{width:1194,height:834},{width:1376,height:1032},{width:1210,height:834}];
const presets=[
 {id:'hangar',page:'hangar'},
 ...[0,1,2].map(selected=>({id:'workshop-'+selected,page:'workshop',selected})),
 {id:'paint',page:'workshop',selected:0,paint:true},
 {id:'contracts',page:'contracts'},
 ...[1,2,3].map(contract=>({id:'battle-theater-'+(contract-1),contract,overview:true})),
 {id:'selected-move',contract:1},
 ...['rifle','shotgun','missile','rail','blade','parallax'].map(weapon=>({id:'attack-'+weapon,contract:1,weapon})),
 {id:'damaged',contract:1,damage:true},
 {id:'burning-wreck',contract:1,wreck:true},
 {id:'rig-bench',path:'rig-bench/'}
];
// Serialized into the page by Playwright. No production test hooks or save-schema edits.
function setGamePreset(preset){
 save=fresh();battle=null;selected=preset.selected??0;effects=[];clock=5;last=5000-1000/60;
 if(typeof activeCinematic!=='undefined')activeCinematic=null;
 if(preset.page){
  page=preset.page;
  if(preset.paint){save.units[selected].paint='#708657';save.units[selected].trim={s:'#373b38',a:'#c19960'};}
  render();
  if(preset.paint)document.querySelector('.paint-panel')?.scrollIntoView?.({block:'center',behavior:'instant'});
  return;
 }
 page='contracts';createBattle(preset.contract);selected=0;action='move';
 const ally=battle.units.find(u=>u.team==='ally'),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
 if(!ally||!foe)throw Error('Capture fixture requires an ally and a hostile mech');
 if(typeof focusBattleCamera==='function')focusBattleCamera(ally,true);
 if(preset.overview&&typeof fieldCamera!=='undefined')fieldCamera.overview=true;
 if(preset.damage){ally.hp.body=Math.floor(ally.max.body*.35);ally.hitTime=clock-1;}
 if(preset.wreck){
  foe.hp.body=0;foe.alive=false;foe.downReason='body';
  foe.deathTime=clock-1.3*(typeof destructionPace==='function'?destructionPace(foe):1);
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
