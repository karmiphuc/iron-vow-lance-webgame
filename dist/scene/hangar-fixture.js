/* Development-only fixture; stable game frame IDs are used without changing the game catalog. */
(function(){
'use strict';
const roster=[0,5,6,7,8,9,10,12].map((frame,id)=>({id,frame,model:({5:3,6:4,7:5,8:0,9:1,12:2})[frame],weapon:'rifle',melee:frame===6?'blade':undefined,condition:id===1?.2:1}));
let seats=3,catalog,hangar;
function assign(){hangar.setRoster({active:roster.slice(0,seats),reserve:roster.slice(seats),seatCount:seats});catalog.load(roster);}
function mount(camera){
 catalog=IronVowHangarCatalog.create();
 hangar=IronVowHangar.create({catalog,onSelect:id=>document.querySelector('#selection').textContent=`Selected ${id}`,onReserve:(id,frame)=>{
  const status=document.querySelector('#selection');status.textContent=`Open Workshop for ${id}`;status.dataset.reserveFrame=frame;
 }});
 assign();hangar.setHotspots([{element:document.querySelector('#facility'),position:[-8,2,-3]}]);
 hangar.restoreCamera(camera);window.__hangarFixture=hangar;
}
mount();
IronVowRenderer.subscribe(({type})=>{if(type!=='restored')return;const camera=hangar.cameraState();hangar.dispose();catalog.dispose();mount(camera);});
document.querySelector('#overview').onclick=()=>hangar.overview();
document.querySelector('#seat').onclick=()=>{seats=seats===3?4:3;assign();};
window.addEventListener('pointerup',e=>{if(e.target.closest('button'))return;hangar.pick(e.clientX,e.clientY,{left:0,top:0,width:innerWidth,height:innerHeight});});
window.__hangarFixturePaused=window.__hangarFixturePaused??false;
let last=performance.now();function tick(now){const dt=(now-last)/1000;last=now;if(!window.__hangarFixturePaused){hangar.render(now/1000,dt,innerWidth,innerHeight);hangar.placeHotspots({left:0,top:0,width:innerWidth,height:innerHeight});}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();
