'use strict';
const data=window.IRON_VOW_AERO_STRIKES,atlas=window.IRON_VOW_AERO_ART;
const byId=id=>document.getElementById(id);
const canvas=byId('motion'),g=canvas.getContext('2d'),slider=byId('time'),play=byId('play');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let active='cleaver', image, elapsed=0, previous, playing=false, request=0, loadSerial=0;

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
 const clip=atlas.strikes[active],levels=clip.levels;
 const index=levels.findIndex((level,i)=>i===levels.length-1||progress<=(level+levels[i+1])/2);
 g.clearRect(0,0,canvas.width,canvas.height);
 const floor=canvas.height*atlas.ground;
 g.fillStyle='#10171988';g.beginPath();g.ellipse(canvas.width*.52,floor,90,13,0,0,Math.PI*2);g.fill();
 if(image){
  const size=atlas.cell;
  g.drawImage(image,index%4*size,Math.floor(index/4)*size,size,size,0,0,canvas.width,canvas.height);
 }
 const impact=elapsed>=contact&&elapsed<contact+.095;
 const phase=byId('phase');
 phase.textContent=elapsed===0?'GUARD':elapsed<raise?'WINDUP':elapsed<contact?'DRIVE':impact?'IMPACT':'RECOVER';
 phase.dataset.impact=String(impact);
 canvas.dataset.frame=String(index);
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
 setPlaying(false);active=id;elapsed=0;image=null;draw();play.disabled=true;slider.disabled=true;
 byId('status').textContent='Loading strike…';
 byId('detail').textContent=data[id].detail;
 for(const button of byId('weapons').children)button.setAttribute('aria-pressed',String(button.dataset.weapon===id));
 const next=new Image();next.src='../assets/'+atlas.strikes[id].key+'.webp';
 try{
  await next.decode();
  if(serial!==loadSerial)return;
  image=next;play.disabled=false;slider.disabled=false;byId('status').textContent='';
  draw();setPlaying(autoplay&&!reduced.matches);
 }catch{
  if(serial===loadSerial)byId('status').textContent='The strike art did not load. Select the weapon to retry.';
 }
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
select(Object.hasOwn(data,requested)?requested:'cleaver',false);
