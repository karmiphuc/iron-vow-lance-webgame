'use strict';
const data=window.IRON_VOW_AERO_STRIKES;
const byId=id=>document.getElementById(id);
const canvas=byId('motion'),g=canvas.getContext('2d'),slider=byId('time'),play=byId('play');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hp={body:100,pilot:100,right:100,left:100,legs:100};
let active='cleaver',elapsed=0, previous, playing=false, request=0, loadSerial=0;

function duration(){
 const {raise,travel,recover}=data[active].timing;
 return raise+travel+recover;
}
function setPlaying(value){
 playing=value;previous=undefined;
 play.textContent=value?'Pause':'Play';
 cancelAnimationFrame(request);
 if(value)request=requestAnimationFrame(tick);
}
function draw(){
 const {raise,travel,recover}=data[active].timing,contact=raise+travel;
 const progress=elapsed<=contact?.7*elapsed/contact:.7+.3*(elapsed-contact)/recover;
 const unit={id:'aero-review/'+active,frame:19,team:'enemy',alive:true,weapon:'rifle',melee:active,hp,max:hp};
 const pose={strikeKind:elapsed>0?active:null,strikeProgress:progress};
 const image=IronVowFoundry.previewAnimated(unit,performance.now()/1000,pose,11,'rig-v2');
 g.clearRect(0,0,canvas.width,canvas.height);
 if(image)g.drawImage(image.surface,0,0,canvas.width,canvas.height);
 const impact=elapsed>=contact&&elapsed<contact+.095;
 const phase=byId('phase');
 phase.textContent=elapsed===0?'GUARD':elapsed<raise?'WINDUP':elapsed<contact?'DRIVE':impact?'IMPACT':'RECOVER';
 phase.dataset.impact=String(impact);
 canvas.dataset.progress=progress.toFixed(3);
 slider.value=String(Math.round(elapsed/duration()*1000));
 byId('clock').value=elapsed.toFixed(2)+' s';
}
function tick(now){
 if(previous!==undefined)elapsed=Math.min(duration(),elapsed+(now-previous)/1000);
 previous=now;draw();
 if(elapsed<duration())request=requestAnimationFrame(tick);
 else setPlaying(false);
}
async function select(id,autoplay){
 const serial=++loadSerial;
 setPlaying(false);active=id;elapsed=0;play.disabled=true;slider.disabled=true;
 byId('status').textContent='Loading strike…';
 byId('detail').textContent=data[id].detail;
 for(const button of byId('weapons').children)button.setAttribute('aria-pressed',String(button.dataset.weapon===id));
 const [loaded]=await IronVowRigV2.load([{frame:19}],'preview');
 if(serial!==loadSerial)return;
 if(!loaded){byId('status').textContent='Aero could not load. Select a weapon to retry.';return;}
 play.disabled=false;slider.disabled=false;byId('status').textContent='';
 draw();setPlaying(autoplay&&!reduced.matches);
}
for(const [id,weapon] of Object.entries(data)){
 const button=document.createElement('button');button.type='button';button.dataset.weapon=id;
 const name=document.createElement('strong');name.textContent=weapon.name;
 const move=document.createElement('small');move.textContent=weapon.move;
 button.append(name,move);button.onclick=()=>select(id,true);byId('weapons').append(button);
}
play.onclick=()=>{if(elapsed>=duration()){elapsed=0;draw()}setPlaying(!playing)};
slider.oninput=()=>{setPlaying(false);elapsed=Number(slider.value)/1000*duration();draw()};
const requested=new URLSearchParams(location.search).get('weapon');
IronVowRenderer.subscribe(({type})=>{if(type==='restored')draw()});
select(Object.hasOwn(data,requested)?requested:'cleaver',false);
