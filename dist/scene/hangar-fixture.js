/* Development-only fixture; stable game frame IDs are used without changing the game catalog. */
(function(){
'use strict';
const T=THREE,R=IronVowFoundryRig,models={5:3,6:4,7:5,8:0,9:1,12:2};
IronVowWardenRig.load('rig-bench/warden-painted.glb','rig-bench/warden-painted-motion.json').catch(console.warn);
const catalog={create(unit){
 const holder=new T.Group();let rig=null;
 function build(){
  if(rig)return;
  rig=unit.frame===0?IronVowWardenRig.build('ally',unit.paint,{}):unit.frame===10?IronVowBastion.buildRuntime('ally',unit.paint):R.buildRig(models[unit.frame],'ally',unit.paint,null,null,null);
  if(!rig)return;holder.add(rig.cont);
  if(unit.condition<.3)for(const part of R.parts)R.setPartState(rig,part,1);
 }
 return {object:holder,update({time,dt,selected}){build();if(!rig)return;
   const look=selected&&time%9<1.6;rig.aim.until=look?time+.3:-1;rig.aim.blend=look?.35:0;rig.aim.point.set(Math.sin(time*.7)*8,6,20);
   R.animateMech(rig,{pos:new T.Vector3(),ground:0,face:.3,heading:.3,moving:false,speed:0,stepLen:2,brace:0,alive:true,bodyRatio:1,pilotRatio:1,noPlant:true},dt,time);
   if(unit.frame===0)IronVowWardenRig.afterAnimate(rig);else if(unit.frame===10)IronVowBastion.afterAnimate(rig);
  },dispose(){if(!rig)return;const materials=new Set([rig.build.visorMat,rig.build.stackMat,...(rig.build.ownedMaterials||[])]);if(rig.live)for(const entries of Object.values(rig.build.parts))for(const entry of entries)materials.add(entry.m.material);rig.body.traverse(o=>{if(o.userData.foundryMerged)o.geometry.dispose();});if(rig.live)VowChassis.releaseOwnedMaterials(materials);else materials.forEach(m=>m?.dispose());}};
}};
const roster=[0,5,6,7,8,9,10,12].map((frame,id)=>({id,frame,condition:id===1?.2:1}));let seats=3;
const hangar=IronVowHangar.create({catalog,onSelect:id=>document.querySelector('#selection').textContent=`Selected ${id}`,onReserve:id=>document.querySelector('#selection').textContent=`Open Workshop for ${id}`});
function assign(){hangar.setRoster({active:roster.slice(0,seats),reserve:roster.slice(seats),seatCount:seats});}assign();
hangar.setHotspots([{element:document.querySelector('#facility'),position:[20,2,-11]}]);
document.querySelector('#seat').onclick=()=>{seats=seats===3?4:3;assign();};
window.addEventListener('pointerup',e=>{if(e.target.closest('button'))return;hangar.pick(e.clientX,e.clientY,{left:0,top:0,width:innerWidth,height:innerHeight});});
let last=performance.now();function tick(now){const dt=(now-last)/1000;last=now;hangar.render(now/1000,dt,innerWidth,innerHeight);hangar.placeHotspots({left:0,top:0,width:innerWidth,height:innerHeight});requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();
