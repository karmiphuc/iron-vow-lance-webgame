/* The game's sole WebGL context. Scenes and render targets share this owner. */
(function(root){
'use strict';
const T=root.THREE;
let renderer,canvas,lost=false,generation=0;
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
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,2));
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;notify('lost');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;generation++;notify('restored');});
  return renderer;
 }catch(error){canvas.remove();renderer=null;fatal(error);throw error;}
}
root.IronVowRenderer={get,fatal,
 get lost(){return lost;},get generation(){return generation;},
 subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
 show(visible){get();canvas.style.display=visible?'block':'none';},
 metrics(){return renderer?{contexts:1,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}:{contexts:0,geometries:0,textures:0};}
};
})(window);
