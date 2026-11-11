/* Development-only fixture; stable game frame IDs are used without changing the game catalog. */
(function(){
'use strict';
const catalog=IronVowHangarCatalog.create();
const roster=[0,5,6,7,8,9,10,12].map((frame,id)=>({id,frame,weapon:'rifle',melee:frame===6?'blade':undefined,condition:id===1?.2:1}));let seats=3;
const hangar=IronVowHangar.create({catalog,onSelect:id=>document.querySelector('#selection').textContent=`Selected ${id}`,onReserve:id=>document.querySelector('#selection').textContent=`Open Workshop for ${id}`});
function assign(){hangar.setRoster({active:roster.slice(0,seats),reserve:roster.slice(seats),seatCount:seats});}assign();
hangar.setHotspots([{element:document.querySelector('#facility'),position:[-8,2,-3]}]);
document.querySelector('#overview').onclick=()=>hangar.overview();
document.querySelector('#seat').onclick=()=>{seats=seats===3?4:3;assign();};
window.addEventListener('pointerup',e=>{if(e.target.closest('button'))return;hangar.pick(e.clientX,e.clientY,{left:0,top:0,width:innerWidth,height:innerHeight});});
window.__hangarFixture=hangar;
window.__hangarFixturePaused=window.__hangarFixturePaused??false;
let last=performance.now();function tick(now){const dt=(now-last)/1000;last=now;if(!window.__hangarFixturePaused){hangar.render(now/1000,dt,innerWidth,innerHeight);hangar.placeHotspots({left:0,top:0,width:innerWidth,height:innerHeight});}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();
