// Rebuild the geometry mask for Bastion's 896px factory fallback still.
const assert=require('node:assert/strict');
const {join}=require('node:path');
const checkBrowser=require('../qa/check-browser.cjs');
const {createCanvas,loadImage}=require('../qa/node_modules/@napi-rs/canvas');
const {normalizeMask,savePartMask}=require('./chassis-part-mask.cjs');

async function bakeBastion({page,mobile,origin}){
 if(mobile)return;
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.IronVowFoundry?.previewBastion({weapon:'rifle'},0,50)?.primary?.muzzle);
 const {png,iou,coverage}=await page.evaluate(async()=>{
  const T=window.THREE,{worldSpan,ground}=window.IronVowFoundryRig;
  const names=['body','pilot','right','left','legs'],hp=Object.fromEntries(names.map(name=>[name,100]));
  const unit={id:'bastion-mask',team:'ally',alive:true,weapon:'rifle',hp,max:hp};
  const entry=window.IronVowFoundry.draw(unit,0,{previewFrame:50,heading:-.65},{},2,'bastion');
  const size=896,still=new Image();
  still.src=art('bastion-bst04');await still.decode();
  if(still.width!==size||still.height!==size||entry.surface.width!==size)throw Error('Bastion still size changed');
  const sheet=document.createElement('canvas');sheet.width=sheet.height=size;
  const g=sheet.getContext('2d',{willReadFrequently:true});
  g.drawImage(still,0,0);const reference=g.getImageData(0,0,size,size).data;
  g.clearRect(0,0,size,size);g.drawImage(entry.surface,0,0);
  const beauty=g.getImageData(0,0,size,size).data;
  const camera=new T.OrthographicCamera(-worldSpan/2,worldSpan/2,worldSpan/2,-worldSpan/2,.1,100);
  camera.position.set(0,Math.sin(.46)*25+3.55,25);camera.lookAt(0,3.55,0);camera.updateMatrixWorld(true);
  const center=new T.Vector3().project(camera);
  const renderer=new T.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});
  renderer.setSize(size,size,false);renderer.setClearColor(0,0);
  const scene=new T.Scene(),materials=new Map(),originals=new Map();
  entry.m.cont.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const id=names.indexOf(mesh.parent.userData.part||mesh.userData.part)+1;
   const color=new T.Color(Number(Boolean(id&1)),Number(Boolean(id&2)),Number(Boolean(id&4)));
   const material=old=>{
    const key=id+':'+old.side;
    if(!materials.has(key))materials.set(key,new T.MeshBasicMaterial({color,side:old.side,toneMapped:false}));
    return materials.get(key);
   };
   originals.set(mesh,mesh.material);
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(material):material(mesh.material);
  });
  scene.add(entry.m.cont);
  try{
   renderer.render(scene,camera);
   g.clearRect(0,0,size,size);g.imageSmoothingEnabled=false;
   g.drawImage(renderer.domElement,0,size*(ground-(.5-center.y*.5)));
  }finally{
   scene.remove(entry.m.cont);
   for(const [mesh,material] of originals)mesh.material=material;
   for(const material of materials.values())material.dispose();
   renderer.dispose();
  }
  const output=g.getImageData(0,0,size,size),data=output.data,coverage=Array(5).fill(0);
  let intersection=0,union=0;
  for(let i=0;i<data.length;i+=4){
   const a=reference[i+3]>127,b=beauty[i+3]>127;
   if(a||b)union++;
   if(a&&b)intersection++;
   const id=(data[i]>127?1:0)|(data[i+1]>127?2:0)|(data[i+2]>127?4:0);
   if(id>0&&id<=5&&data[i+3]&&reference[i+3]){
    data[i+3]=reference[i+3];coverage[id-1]++;
   }else data[i+3]=0;
  }
  g.putImageData(output,0,0);
  return {png:sheet.toDataURL('image/png'),iou:intersection/union,coverage};
 });
 assert.ok(iou>.995,'Bastion factory pose registration: '+iou);
 assert.ok(coverage.every(n=>n>500),'Bastion has all five damage assignments: '+coverage);
 const image=await loadImage(Buffer.from(png.split(',')[1],'base64'));
 const canvas=createCanvas(image.width,image.height),g=canvas.getContext('2d');
 g.drawImage(image,0,0);
 const pixels=g.getImageData(0,0,canvas.width,canvas.height);
 normalizeMask(pixels.data);
 g.putImageData(pixels,0,0);
 savePartMask(canvas,join(__dirname,'../dist/assets/bastion-bst04-parts.webp'));
 console.log('Bastion factory mask',iou.toFixed(5),'silhouette IoU, part pixels',coverage);
}

checkBrowser(null,[bakeBastion]).catch(error=>{console.error(error);process.exitCode=1});
