// node tools/render_travel.cjs /tmp/foundry-raster /tmp/vehicle-models
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync,execFileSync}=require('node:child_process');
const {createCanvas,loadImage,ImageData}=require('../qa/node_modules/@napi-rs/canvas');
const T=require('../dist/rig-bench/vendor/three.min.js');
const dist=path.join(__dirname,'../dist'),size=176,columns=4;
global.THREE=T;global.self=global;global.window={THREE:T};
global.document={createElement:()=>createCanvas(1,1)};
global.createImageBitmap=async blob=>{
 const im=await loadImage(Buffer.from(await blob.arrayBuffer())),canvas=createCanvas(im.width,im.height);
 canvas.getContext('2d').drawImage(im,0,0);return canvas;
};
require('../dist/rig-bench/vendor/GLTFLoader.js');
require('../dist/foundry/chassis.js');
require('../dist/foundry/rig-motion.js');
const {V3,buildRig,animateMech,mountPoints}=window.IronVowFoundryRig;
const stock=['warden','kestrel','basilisk'],native=['gatecrasher','cicada','hellbreaker'];
const knownTiles=[[0,7,8,12,15],[0,7,8,12,15],[0,7,12,15]];
const texCache=new WeakMap(),materials=new WeakMap();
const normalMat=new T.Matrix3(),p=V3(),n=V3();
const shadeLight=V3(-.43,.83,.36).normalize();
const glTF=async filename=>{
 const b=fs.readFileSync(filename);
 const result=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',resolve,reject));
 result.scene.traverse(o=>{if(typeof o.userData.name==='string')o.name=o.userData.name});
 return result;
};
function texel(map,u,v){
 const image=map?.image;if(!image?.getContext)return null;
 let data=texCache.get(image);
 if(!data){data=image.getContext('2d').getImageData(0,0,image.width,image.height);texCache.set(image,data)}
 const x=Math.min(data.width-1,Math.max(0,Math.floor(u*data.width)));
 const y=Math.min(data.height-1,Math.max(0,Math.floor((map.flipY?1-v:v)*data.height)));
 return data.data.subarray((y*data.width+x)*4,(y*data.width+x)*4+4);
}
function paletteSlot(spec,m,uv){
 if(spec.stock!==undefined){
  const tile=Math.min(3,Math.floor(uv[0]*4))+4*Math.min(3,Math.floor(uv[1]*4));
  return m.map&&knownTiles[spec.stock].includes(tile)?0:-1;
 }
 if(spec.native)return /ceramic|armor|plate|badge/i.test(m.name)?0:-1;
 if(spec.foundry&&m.userData.paint){
  return ['p','s','a'].findIndex(k=>m.color.equals(new T.Color(spec.foundry.build.pal[k]).convertSRGBToLinear()));
 }
 return -1;
}
function geometry(root,spec){
 root.updateMatrixWorld(true);
 const data=[];
 root.traverseVisible(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  if(o.isSkinnedMesh)o.skeleton.update();
  const a=o.geometry.attributes,index=o.geometry.index,m=o.material,count=index?.count??a.position.count;
  normalMat.getNormalMatrix(o.matrixWorld);
  let material=materials.get(m);
  if(!material){material={color:m.color||new T.Color(1,1,1),emissive:m.emissive?.clone().multiplyScalar((m.emissiveIntensity||0)*.24)};materials.set(m,material)}
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
   const uv=a.uv?ids.reduce(([x,y],j)=>[x+a.uv.getX(j)/3,y+a.uv.getY(j)/3],[0,0]):[0,0];
   const tex=texel(m.map,...uv);if(m.transparent&&tex&&tex[3]<112)continue;
   const color=material.color.clone();
   if(tex)color.multiply(new T.Color(tex[0]/255,tex[1]/255,tex[2]/255).convertSRGBToLinear());
   if(material.emissive)color.add(material.emissive);
   const slot=paletteSlot(spec,m,uv);
   for(const j of ids){
    p.fromBufferAttribute(a.position,j);if(o.isSkinnedMesh)o.boneTransform(j,p);p.applyMatrix4(o.matrixWorld);
    n.fromBufferAttribute(a.normal,j).applyMatrix3(normalMat).normalize();
    const light=Math.max(0,n.dot(shadeLight));
    const tone=color.clone().multiplyScalar(.53+.89*light).addScalar(.019+.025*light).convertLinearToSRGB();
    data.push(p.x,p.y,p.z,tone.r*255,tone.g*255,tone.b*255,slot);
   }
  }
 });
 return data;
}
function projectPoint(x,y,z,angle,span,ground){
 const c=Math.cos(angle),s=Math.sin(angle),forward=-x*s+z*c,elevation=.452;
 return [(.5+(x*c+z*s)/span)*size,(ground-(y*Math.cos(elevation)-forward*Math.sin(elevation))/span)*size,-forward*Math.cos(elevation)-y*Math.sin(elevation)];
}
function raster(values){
 const depth=new Float32Array(size*size).fill(Infinity),pixels=new Uint8ClampedArray(size*size*4);
 for(let i=0;i<values.length;i+=18){
  const ax=values[i],ay=values[i+1],az=values[i+2],bx=values[i+6],by=values[i+7],bz=values[i+8],cx=values[i+12],cy=values[i+13],cz=values[i+14];
  const dx=bx-ax,dy=by-ay,ex=cx-ax,ey=cy-ay,area=dx*ey-dy*ex;
  if(Math.abs(area)<.00001)continue;
  const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(size-1,Math.ceil(Math.max(ax,bx,cx)));
  const top=Math.max(0,Math.floor(Math.min(ay,by,cy))),bottom=Math.min(size-1,Math.ceil(Math.max(ay,by,cy)));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   const px=x+.5-ax,py=y+.5-ay,u=(px*ey-py*ex)/area,w=(dx*py-dy*px)/area,t=1-u-w;
   if(Math.min(u,w,t)<0)continue;
   const z=t*az+u*bz+w*cz,p=y*size+x;
   if(z>=depth[p])continue;
   depth[p]=z;
   for(let c=0;c<3;c++)pixels[p*4+c]=t*values[i+3+c]+u*values[i+9+c]+w*values[i+15+c];
   pixels[p*4+3]=255;
  }
 }
 return new ImageData(pixels,size,size);
}
function draw(data,angle,span,ground,mask=false){
 const values=new Float32Array(data.length/7*6);
 for(let i=0,j=0;i<data.length;i+=7,j+=6){
  const [x,y,z]=projectPoint(data[i],data[i+1],data[i+2],angle,span,ground);
  values[j]=x;values[j+1]=y;values[j+2]=z;
  for(let c=0;c<3;c++)values[j+3+c]=mask?data[i+6]===c?255:0:data[i+3+c];
 }
 if(process.argv[2]==='-')return raster(values);
 const head=Buffer.alloc(8);head.writeInt32LE(size);head.writeInt32LE(values.length/18,4);
 const out=spawnSync(process.argv[2],[],{input:Buffer.concat([head,Buffer.from(values.buffer)]),maxBuffer:2*1024*1024});
 if(out.status!==0||out.stdout.length!==size*size*4)throw Error('Directional raster failed');
 return new ImageData(new Uint8ClampedArray(out.stdout),size,size);
}
function named(root,name){const o=root.getObjectByName(name);if(!o)throw Error('Missing '+name);return o}
function stockPose(root,pose){
 const rotate=(name,x=0,y=0,z=0)=>named(root,name).rotation.set(x,y,z);
 named(root,'pelvis').position.set(...pose.pelvis.position);
 rotate('pelvis',0,0,pose.pelvis.roll);
 rotate('spine',pose.spinePitch,pose.left?.ty??0);
 for(const [i,leg] of pose.legs.entries()){
  const side='LR'[i];rotate('hip.'+side,...leg.hip);rotate('knee.'+side,leg.knee);rotate('ankle.'+side,...leg.ankle);
 }
 rotate('shoulder.R',...pose.gun.shoulder);rotate('elbow.R',pose.gun.elbow);rotate('wrist.R',pose.gun.wrist);
 rotate('pauldron.R',pose.gun.shoulder[0]*.28,0,pose.gun.shoulder[2]*.4);
 rotate('shoulder.L',pose.leftShoulder);rotate('elbow.L',-.64);rotate('wrist.L',.06);
 root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.name.startsWith('piston.')||!o.name.endsWith('.a'))return;
  const other=root.getObjectByName(o.name.slice(0,-1)+'b');
  if(!other)return;
  const turn=(part,target)=>{
   const d=target.getWorldPosition(V3()).sub(part.getWorldPosition(V3())).normalize().applyQuaternion(part.parent.getWorldQuaternion(new T.Quaternion()).invert());
   part.quaternion.setFromUnitVectors(V3(0,-1,0),d);
  };
  turn(o,other);turn(other,o);
 });
}
function stockPoints(root){
 const arm=side=>{
  const socket=named(root,'socket.'+side);
  return [socket.getWorldPosition(V3()),socket.localToWorld(V3(0,-1,0))];
 };
 const [gripR,axisR]=arm('R'),[gripL,axisL]=arm('L');
 const podR=root.getObjectByName('pod.R'),podL=root.getObjectByName('pod.L');
 return {gripR,axisR,gripL,axisL,...(podR&&podL?{muzzle:podR.getWorldPosition(V3()),muzzle2:podL.getWorldPosition(V3())}:{}),body:named(root,'spine').localToWorld(V3(0,.9,.55)),
  pilot:named(root,'spine').localToWorld(V3(0,2,.6)),legs:named(root,'knee.L').getWorldPosition(V3()),
  left:named(root,'elbow.L').getWorldPosition(V3()),right:named(root,'elbow.R').getWorldPosition(V3()),leadFoot:named(root,'ankle.L').getWorldPosition(V3())};
}
function foundryPose(m,row){
 const r=m.rig,D=m.dims,phase=(row-1)/6;
 m.aim.blend=row===7?1:0;m.aim.until=row===7?1:-1;m.aim.point.set(0,4,20);
 animateMech(m,{pos:V3(),face:0,heading:0,noPlant:true,alive:true,brace:0},1/60,0);
 if(row>0&&row<=6){
  for(const [i,leg] of r.legs.entries()){
   const q=(phase+(leg.phase??i*.5))%1;
   window.VowChassis.solveLeg(r,D,leg,V3(leg.restX,D.ankleH+(q<.5?0:Math.sin((q-.5)*2*Math.PI)*D.lift),leg.restZ+(q<.5?.82-3.28*q:-.82+3.28*(q-.5))));
  }
  r.pelvis.position.y-=.08+.08*Math.cos(phase*4*Math.PI);
 }
 m.cont.updateMatrixWorld(true);
 const refs={...mountPoints(m),body:r.spine,pilot:r.neck,left:r.arms.L.el,right:r.arms.R.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an};
 return Object.fromEntries(Object.entries(refs).map(([key,o])=>[key,o.getWorldPosition(V3())]));
}
function nativePoints(root,model){
 const get=name=>root.getObjectByName(name)?.getWorldPosition(V3());
 const muzzle=get('Muzzle.Upper')||get('Muzzle.L')||get('Muzzle')||V3(0,4,2);
 const muzzle2=get('Muzzle.Lower')||get('Muzzle.R')||V3(.7,4,2);
 return {body:get('Torso')||V3(0,3.6,0),pilot:get('Optics')||V3(0,5.2,0),right:get('Elbow.R')||V3(-1.2,3,0),
  left:get('Elbow.L')||V3(1.2,3,0),legs:get('Knee.L')||get('Shin.L')||V3(.6,1.3,0),muzzle,muzzle2,leadFoot:get('Foot.L')||V3(.55,0,0)};
}
async function bake(spec){
 let root,sample,span,ground=.84,rows=8;
 if(spec.stock!==undefined){
  const {scene}=await glTF(path.join(dist,'rig-bench',spec.key+'.glb'));root=scene;span=9.65;
  const poses=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'sample_warden_motion.cjs'),'--arsenal','--model',spec.key]));
  sample=row=>{stockPose(root,row===0?poses.idle:row===7?poses.aims[2].pose:poses.gait[(row-1)*2]);root.updateMatrixWorld(true);return stockPoints(root)};
 }else if(spec.native){
  const {scene,animations}=await glTF(path.join(dist,'rig-bench/prototypes',spec.key+'.glb'));root=scene;
  span=10.2;const mixer=new T.AnimationMixer(root);
  sample=row=>{
   mixer.stopAllAction();
   const clip=animations.find(c=>c.name===(row===0?'Idle':row===7?'Fire':'Walk'));
   mixer.clipAction(clip).play();mixer.setTime(clip.duration*(row===0?0:row===7?.42:(row-1)/6));root.updateMatrixWorld(true);
   return nativePoints(root,spec.key);
  };
 }else if(spec.vehicle){
  const {scene}=await glTF(path.join(process.argv[3],spec.key+'.glb'));root=scene;span=3.2;ground=.72;rows=1;
  sample=()=>({body:named(root,'body').getWorldPosition(V3()),muzzle:named(root,'muzzle').getWorldPosition(V3())});
 }else{
  const m=buildRig(spec.model,'ally');spec.foundry=m;root=m.cont;span=11.2;sample=row=>foundryPose(m,row);
 }
 const canvas=createCanvas(columns*size,rows*size),g=canvas.getContext('2d');
 const mask=spec.vehicle?null:createCanvas(columns*size,rows*size),mg=mask?.getContext('2d');
 const points=[];
 for(let row=0;row<rows;row++){
  const anchors=sample(row),triangles=geometry(root,spec);
  points.push([]);
  for(let column=0;column<columns;column++){
   const angle=(1+2*column)*Math.PI/4;
   g.putImageData(draw(triangles,angle,span,ground),column*size,row*size);
   if(mg)mg.putImageData(draw(triangles,angle,span,ground,true),column*size,row*size);
   points[row].push(Object.fromEntries(Object.entries(anchors).map(([k,v])=>{
    const [x,y]=projectPoint(v.x,v.y,v.z,angle,span,ground);
    return [k,[+(x/size).toFixed(4),+(y/size).toFixed(4)]];
   })));
  }
 }
 const key='grid-travel-'+spec.key,save=(img,suffix)=>fs.writeFileSync(path.join(dist,'assets',key+suffix+'.webp'),img.toBuffer('image/webp',91));
 save(canvas,'');if(mask)save(mask,'-paint');
 console.log(key,rows*columns+' cells');
 return {key,span,ground,cell:size,columns,points};
}
(async()=>{
 const specs=[...stock.map((key,i)=>({key,stock:i})),...native.map(key=>({key,native:true})),
  ...Array.from({length:6},(_,model)=>({key:'foundry-'+model,model})),...['tank','helicopter'].map(key=>({key,vehicle:true}))];
 const only=process.argv[4],previous=path.join(dist,'grid-travel-visuals.js');
 const output=only?JSON.parse(fs.readFileSync(previous,'utf8').trim().replace(/^window.IRON_VOW_TRAVEL=/,'').replace(/;$/,'')):{};
 for(const spec of specs)if(!only||spec.key===only)output[spec.key]=await bake(spec);
 fs.writeFileSync(path.join(dist,'grid-travel-visuals.js'),'window.IRON_VOW_TRAVEL='+JSON.stringify(output)+';\n');
})().catch(error=>{console.error(error);process.exitCode=1});
