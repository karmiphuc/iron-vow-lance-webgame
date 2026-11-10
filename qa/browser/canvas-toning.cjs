const assert=require('node:assert/strict');
module.exports=async function checkCanvasToning({page,origin}){
 await page.addInitScript(()=>{
  for(const Context of [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D])
   if(Context)Object.defineProperty(Context.prototype,'filter',{configurable:true,get(){return 'none'},set(){}});
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const result=await page.evaluate(()=>{
  const surface=renderSurface(100,100),prior=ctx,priorScale=scale;
  ctx=surface.getContext('2d');scale=20;
  try{
   drawToned({x:10,y:10,w:70,h:70},.37,.42,()=>{ctx.fillStyle='rgb(120,200,80)';ctx.fillRect(20,20,50,50)});
   const tone=[...ctx.getImageData(40,40,1,1).data],outside=[...ctx.getImageData(5,5,1,1).data];
   ctx.clearRect(0,0,100,100);
   const paint=()=>{ctx.fillStyle='#80b080';ctx.fillRect(15,15,70,70)};
   const anchors={body:{x:50,y:45},pilot:{x:50,y:22},right:{x:25,y:45},left:{x:75,y:45},legs:{x:50,y:75}};
   const u={alive:true,index:0,hp:{body:100,pilot:100,right:0,left:100,legs:100},max:{body:100,pilot:100,right:100,left:100,legs:100}};
   paint();drawPartTints(u,1,paint,part=>anchors[part]);
   const damaged=[...ctx.getImageData(25,45,1,1).data],healthy=[...ctx.getImageData(75,45,1,1).data];
   u.hitTime=1;u.hitPart='right';drawPartTints(u,1.1,paint,part=>anchors[part]);
   const flash=[...ctx.getImageData(25,45,1,1).data];
   return {filterWorks:FILTER_OK,tone,outside,damaged,healthy,flash,restored:ctx===surface.getContext('2d')};
  }finally{ctx=prior;scale=priorScale}
 });
 assert.equal(result.filterWorks,false,'pixel detection rejects an ignored canvas filter');
 assert.ok(result.tone[1]<90&&result.tone[3]===255,'filterless tone darkens the painted sprite');
 assert.equal(result.outside[3],0,'filterless tone preserves the silhouette');
 assert.ok(result.damaged[1]<result.healthy[1]-25,'damage darkens the selected part only');
 assert.ok(result.flash[1]>result.damaged[1],'a damaged part still flashes when hit');
 assert.equal(result.restored,true,'nested painting restores its context');
};
