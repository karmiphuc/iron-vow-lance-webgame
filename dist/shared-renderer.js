/* The game's sole WebGL context. Scenes and render targets share this owner. */
(function(root){
'use strict';
const T=root.THREE;
let renderer,canvas,lost=false,generation=0,visible=false,low=false,width=0,height=0,ratio=0;
const samples=[];
const listeners=new Set();
function notify(type){for(const listener of listeners)listener({type,generation});}
function fatal(error){
 const box=document.getElementById('webgl-required')||document.createElement('div');
 box.id='webgl-required';box.setAttribute('role','alert');
 box.textContent='WebGL is required to render Iron Vow. Reload this page to retry.';
 Object.assign(box.style,{position:'fixed',inset:'35% 15% auto',zIndex:'10001',padding:'24px',background:'#101820',color:'#f1dfc1'});
 if(!box.isConnected)document.body.appendChild(box);
 console.error(error);
}
function get(){
 if(renderer)return renderer;
 if(!T)throw Error('three.js must load before the shared renderer');
 canvas=document.createElement('canvas');canvas.id='world-scene';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',display:'none'});
 document.body.insertBefore(canvas,document.getElementById('scene'));
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;notify('lost');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;generation++;notify('restored');});
  return renderer;
 }catch(error){canvas.remove();renderer=null;fatal(error);throw error;}
}
root.IronVowRenderer={get,fatal,
 resize(w,h){const r=Math.min(root.devicePixelRatio||1,low?1.5:2);if(r!==ratio){renderer.setPixelRatio(r);ratio=r;}if(w!==width||h!==height){renderer.setSize(w,h,false);width=w;height=h;}},
 observeFrame(ms){if(!visible||lost||low||!Number.isFinite(ms)||ms<=0)return;samples.push(ms);if(samples.length<180)return;const steady=samples.slice(60).sort((a,b)=>a-b);if(steady[Math.ceil(steady.length*.95)-1]>16.7)low=true;samples.length=0;},
 get quality(){return{tier:low?'low':'high',pixelRatioCap:low?1.5:2,shadow:low?1024:2048};},
 get lost(){return lost;},get generation(){return generation;},
 subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
 show(value){get();visible=value;canvas.style.display=value?'block':'none';},
 metrics(){return renderer?{contexts:1,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,quality:low?'low':'high',generation}:{contexts:0,geometries:0,textures:0};}
};
})(window);
