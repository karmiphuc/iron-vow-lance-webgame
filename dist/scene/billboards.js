/* The single temporary sheet adapter, removed when Phase 3 makes every frame live. */
(function(root){
'use strict';
const T=root.THREE,cache=new Map(),SIZE=512,SCALE=96;
let drawing=false;
function get(u,t){
 if(root.IronVowScene.isLive(u))throw Error('Live frames cannot enter the billboard adapter');
 let entry=cache.get(u.id);
 if(!entry){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:false}));sprite.center.set(.5,.16);sprite.scale.set(SIZE/SCALE*3.4,SIZE/SCALE*3.4,1);
  entry={canvas,texture,sprite};cache.set(u.id,entry);
 }
 const stamp=JSON.stringify([u.frame,u.kind,u.paint,u.trim,u.weapon,u.melee,u.shield,u.hp,u.alive,u.heading,u.attack,u.motion?Math.floor(t*24):null,!u.alive?Math.floor(t*24):null]);
 if(stamp!==entry.stamp){
  const saved={ctx,origin,scale};drawing=true;
  try{
   ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,SIZE,SIZE);scale=SCALE;
   origin={x:SIZE/2-(u.vx-u.vz)*SCALE*.866,y:SIZE*.84-(u.vx+u.vz)*SCALE*.42+terrainHeight(u.vx,u.vz)*SCALE};
   if(u.kind)drawVehicle(u,t);else drawUnitBody(u,t,true);
   entry.texture.needsUpdate=true;entry.stamp=stamp;
  }finally{ctx=saved.ctx;origin=saved.origin;scale=saved.scale;drawing=false;}
 }
 return entry.sprite;
}
function clear(){for(const entry of cache.values()){entry.sprite.removeFromParent();entry.texture.dispose();entry.sprite.material.dispose();}cache.clear();}
root.IronVowBillboards={get,clear,get drawing(){return drawing;}};
})(window);
