/* Diagnostic-only frame and WebGL counters. Enable with ?perf. */
(function(root){
'use strict';
function createSampler(capacity=120){
 let samples=[],previous=null,calls=0,triangles=0,memory={contexts:0,geometries:0,textures:0};
 return {
  reset(){samples=[];previous=null;calls=triangles=0;},
  begin(now){
   if(previous!==null&&now>previous){samples.push(now-previous);if(samples.length>capacity)samples.shift();}
   previous=now;calls=triangles=0;
  },
  record(info){calls+=info.render.calls;triangles+=info.render.triangles;},
  end(value){memory={...value};},
  report(){
   const ordered=[...samples].sort((a,b)=>a-b),percentile=q=>ordered.length?ordered[Math.ceil(ordered.length*q)-1]:null;
   return {samples:samples.length,fps:samples.length?1000/(samples.reduce((a,b)=>a+b,0)/samples.length):null,
    frameMs:{p50:percentile(.5),p95:percentile(.95)},calls,triangles,...memory};
  }
 };
}
if(typeof module==='object'&&module.exports){module.exports={createSampler};return;}
if(!new URLSearchParams(root.location.search).has('perf'))return;
const sampler=createSampler(),panel=document.createElement('pre');
panel.id='iron-vow-perf';panel.setAttribute('aria-label','Rendering performance');
Object.assign(panel.style,{position:'fixed',bottom:'8px',left:'8px',zIndex:'10000',margin:'0',padding:'8px',
 background:'#07111ae8',color:'#d9e8d8',font:'12px monospace',pointerEvents:'none',whiteSpace:'pre-wrap'});
document.body.appendChild(panel);
let lastPaint=-Infinity;
root.IronVowPerformance={
 begin(now){if(document.hidden){sampler.reset();return;}sampler.begin(now);},
 recordRender(info){sampler.record(info);},
 end(now){
  sampler.end(root.IronVowFoundry?.metrics?.()??{contexts:0,geometries:0,textures:0});
  if(now-lastPaint<500)return;lastPaint=now;
  const r=sampler.report(),number=n=>n===null?'—':n.toFixed(1);
  panel.textContent=`FPS ${number(r.fps)} · frame ms p50 ${number(r.frameMs.p50)} / p95 ${number(r.frameMs.p95)}\n`+
   `WebGL calls ${r.calls} · triangles ${r.triangles}\nGeometries ${r.geometries} · textures ${r.textures} · contexts ${r.contexts}\n`+
   'Current compositor: Canvas 2D + offscreen WebGL. Device measurements required.';
 },
 snapshot:()=>sampler.report()
};
document.addEventListener('visibilitychange',()=>sampler.reset());
})(typeof window==='object'?window:globalThis);
