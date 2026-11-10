/* Iron Vow impact/electrical VFX — original procedural canvas adaptation.
 * PixelFX (patch-gg/pixelfx) informed the layered, deterministic visual vocabulary.
 * Stateless closed-form particles: no particle heap or WebGL allocations per shot.
 */
(function(root){
'use strict';
const PI=Math.PI,TAU=2*PI;
const clamp=n=>Math.max(0,Math.min(1,n));
function rand(seed,index){
 let x=(seed+Math.imul(index+1,0x9e3779b9))|0;
 x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;
 x=Math.imul(x,0x846ca68b);x^=x>>>16;
 return (x>>>0)/4294967296;
}
function impact(ctx,{point:p,normal={x:-1,y:-.15},progress=0,kind='rifle',seed=1,scale=42,broken=false}){
 const phase=clamp(progress),age=phase*.44,fade=1-phase;
 const missile=kind==='missile',rail=kind==='rail'||kind==='parallax',pellet=kind==='shotgun',melee=['cleaver','blade','breaker','piledriver','maul','strike'].includes(kind);
 const nx0=normal.x??-1,ny0=normal.y??0,len=Math.hypot(nx0,ny0)||1,nx=nx0/len,ny=ny0/len,tx=-ny,ty=nx;
 const core=rail?'#edffff':'#fff4d6',hot=rail?'#a6eaff':'#ffc17d';
 const mobile=(ctx.canvas?.clientWidth||ctx.canvas?.width||960)<760,count=mobile?(missile?17:pellet?12:rail?11:8):(missile?28:pellet?20:rail?16:13);
 ctx.save();ctx.lineCap='round';
 if(age<.14){
  const q=1-age/.14,r=scale*(missile?.72:pellet?.48:rail?.43:.34)*(.35+.65*(1-q));
  ctx.globalAlpha=q*.92;
  const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
  g.addColorStop(0,'#ffffff');g.addColorStop(.19,core);g.addColorStop(.56,rail?'#61cfff99':'#ffa75d90');g.addColorStop(1,'#ff8d3300');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
 }
 for(let i=0;i<count;i++){
  const a=rand(seed,i*9)*TAU,speed=(1.2+rand(seed,i*9+1)*2.9)*(missile?1.35:melee?.8:1);
  const forward=i<count*.3?1.7+.7*rand(seed,i*9+2):.45+.95*rand(seed,i*9+2);
  const spread=.45+1.22*rand(seed,i*9+3),v=scale*speed;
  const vx=v*(nx*forward+tx*Math.cos(a)*spread),vy=v*(ny*forward+ty*Math.sin(a)*spread);
  const duration=.13+rand(seed,i*9+4)*.27,life=clamp(1-age/duration);if(!life)continue;
  const x=p.x+vx*age,y=p.y+vy*age+scale*4.5*age*age;
  const length=scale*(.04+.085*rand(seed,i*9+5))*life*(i<count*.3?1.5:1);
  const velocity=Math.hypot(vx,vy)||1;
  ctx.globalAlpha=life*(i<count*.3?.95:.75);
  ctx.strokeStyle=i%5===0?core:i%3===0?hot:rail?'#71c9e9':i%2?'#ffdc9f':'#e98b49';
  ctx.lineWidth=Math.max(.7,scale*(i%5===0?.027:.015)*life);
  ctx.beginPath();ctx.moveTo(x-vx/velocity*length,y-vy/velocity*length);ctx.lineTo(x,y);ctx.stroke();
 }
 if(broken&&phase>.16){
  ctx.globalAlpha=(1-phase)*.40;ctx.fillStyle='#77716b';
  for(let i=0;i<4;i++){
   const u=rand(seed,91+i),r=scale*(.035+.06*u+phase*.055);
   ctx.beginPath();ctx.arc(p.x+(u-.5)*scale*.42,p.y-scale*(.10+phase*.42)+(rand(seed,105+i)-.5)*scale*.2,r,0,TAU);ctx.fill();
  }
 }
 ctx.restore();
}
function arc(ctx,{a,b,progress=0,seed=1,scale=42,strength=1}){
 const life=1-clamp(progress);if(life<=0)return;
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<1)return;
 const nx=-dy/length,ny=dx/length,segments=7,frame=Math.floor(progress*.16/.045);
 const points=[];
 for(let i=0;i<=segments;i++){
  const q=i/segments,offset=(i===0||i===segments?0:(rand(seed,frame*29+i)-.5)*2*Math.sin(PI*q)*Math.min(scale*.18,length*.19)*strength);
  points.push({x:a.x+dx*q+nx*offset,y:a.y+dy*q+ny*offset});
 }
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 for(let pass=0;pass<2;pass++){
  ctx.globalAlpha=life*(pass?.95:.32)*strength;
  ctx.strokeStyle=pass?'#e9fcff':'#72d2ff';
  ctx.lineWidth=Math.max(.8,scale*(pass?.022:.07)*strength);
  ctx.shadowBlur=pass?0:Math.min(15,scale*.17);ctx.shadowColor='#5dafff';
  ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(points[i].x,points[i].y):ctx.moveTo(points[i].x,points[i].y);ctx.stroke();
 }
 ctx.shadowBlur=0;ctx.globalAlpha=life*.7;ctx.fillStyle='#c8f5ff';
 for(const p of [a,b]){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,scale*.032*strength),0,TAU);ctx.fill()}
 ctx.restore();
}
function ground(ctx,{point:p,progress=0,scale=42,seed=1,mass=1}){
 const q=clamp(progress),life=1-q;
 ctx.save();ctx.lineCap='round';
 ctx.globalAlpha=life*.38;ctx.strokeStyle='#cfb69b';ctx.lineWidth=Math.max(.7,scale*.021*life);
 ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(.25+q*1.35)*mass,scale*(.05+q*.32)*mass,0,0,TAU);ctx.stroke();
 for(let i=0;i<9;i++){
  const a=PI+(rand(seed,i*5)-.5)*PI*1.8,s=scale*(.5+rand(seed,i*5+1)*1.6)*mass;
  const x=p.x+Math.cos(a)*s*q,y=p.y+Math.sin(a)*s*q*.33+scale*.6*q*q;
  ctx.globalAlpha=life*(i%3===0?.8:.46);ctx.strokeStyle=i%3===0?'#fff1cd':'#efa968';ctx.lineWidth=Math.max(.8,scale*.016*life);
  ctx.beginPath();ctx.moveTo(x-Math.cos(a)*scale*.06*life,y-Math.sin(a)*scale*.025*life);ctx.lineTo(x,y);ctx.stroke();
 }
 ctx.fillStyle='#9e958a';
 for(let i=0;i<5;i++){
  const x=p.x+(rand(seed,41+i)-.5)*scale*1.1*q,y=p.y-scale*q*(.1+rand(seed,51+i)*.7);
  ctx.globalAlpha=life*.19;ctx.beginPath();ctx.arc(x,y,scale*(.045+q*.17),0,TAU);ctx.fill();
 }
 ctx.restore();
}
const api=Object.freeze({impact,arc,ground,rand});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.IronVowVFX=api;
})(typeof window==='object'?window:globalThis);
