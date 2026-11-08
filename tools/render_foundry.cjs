// Run via: c++ -O3 -std=c++17 tools/foundry-raster.cpp -o /tmp/foundry-raster
// npm ci --prefix qa && node tools/render_foundry.cjs /tmp/foundry-raster
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const {createCanvas,ImageData}=require('../qa/node_modules/@napi-rs/canvas');
const T=require('../dist/rig-bench/vendor/three.min.js');
global.THREE=T;
global.window={THREE:T};
global.document={createElement:()=>createCanvas(1,1)};
require('../dist/rig-bench/vendor/GLTFLoader.js');
require('../dist/foundry/production-arsenal.js');
require('../dist/foundry/chassis.js');
require('../dist/foundry/rig-motion.js');
const {V3,worldSpan,ground,buildRig,animateMech,setPartState,wreckMech,mountPoints}=window.IronVowFoundryRig;
const size=320, assetDir=require('node:path').resolve(__dirname,'../dist/assets');
const defaults=[['rifle'],['shotgun'],['missile'],['rifle'],['rifle','blade'],['missile']];
const names=['Aegis','Shrike','Bastion','Valkyrie','Oni','Behemoth'];
const lights=[V3(-.5,.85,.65).normalize(),V3(.7,.38,-.8).normalize()];
const color=new T.Color(),normalMatrix=new T.Matrix3();
const pos=V3(),normal=V3(),textureCache=new WeakMap();

function camera(elevation,targetY=3.55,span=worldSpan){
 const cam=new T.OrthographicCamera(-span/2,span/2,span/2,-span/2,.1,100);
 cam.position.set(0,Math.sin(elevation)*25+targetY,Math.cos(elevation)*25);
 cam.lookAt(0,targetY,0);cam.updateMatrixWorld(true);
 return cam;
}
function texel(map,u,v){
 if(!map?.image?.getContext)return null;
 let data=textureCache.get(map.image);
 if(!data){data=map.image.getContext('2d').getImageData(0,0,map.image.width,map.image.height);textureCache.set(map.image,data)}
 u=(u*map.repeat.x)%1;v=(v*map.repeat.y)%1;
 const index=(Math.min(data.height-1,Math.floor((1-((v+1)%1))*data.height))*data.width+Math.floor(((u+1)%1)*data.width))*4;
 return data.data.subarray(index,index+4);
}
function raster(rig,cam,center=.84,fitGround=true,paintMask=false){
 rig.cont.updateMatrixWorld(true);
 const pivot=V3().project(cam),offset=fitGround?center-(.5-pivot.y*.5):0,values=[];
 rig.cont.traverseVisible(o=>{
  if(!o.isMesh)return;
  const {geometry:g,material:m,matrixWorld}=o;
  if(Array.isArray(m))return;
  const a=g.attributes,n=g.index?.count??a.position.count;
  normalMatrix.getNormalMatrix(matrixWorld);
  const palette=rig.build?.pal;
  const layer=paintMask&&palette&&m.userData.paint?['p','s','a'].findIndex(k=>m.color.equals(new T.Color(palette[k]).convertSRGBToLinear())):-1;
  for(let i=0;i<n;i+=3){
   const sample=[0,1,2].map(k=>g.index?g.index.getX(i+k):i+k);
   const uv=a.uv&&sample.reduce(([u,v],j)=>[u+a.uv.getX(j)/3,v+a.uv.getY(j)/3],[0,0]);
   const tex=uv&&texel(m.map,...uv);
   if(tex&&tex[3]<92)continue;
   for(const j of sample){
    pos.fromBufferAttribute(a.position,j).applyMatrix4(matrixWorld).project(cam);
    normal.fromBufferAttribute(a.normal,j).applyMatrix3(normalMatrix).normalize();
    const warm=Math.max(0,normal.dot(lights[0])),cool=Math.max(0,normal.dot(lights[1]));
    if(paintMask){
     values.push((.5+pos.x*.5)*size,(.5-pos.y*.5+offset)*size,pos.z,layer===0?255:0,layer===1?255:0,layer===2?255:0);
     continue;
    }
    color.copy(m.color||new T.Color(1,1,1));
    if(tex){const f=1/255;color.multiply(new T.Color(tex[0]*f,tex[1]*f,tex[2]*f).convertSRGBToLinear())}
    color.r=color.r*(.42+warm*.85+cool*.26)+warm*.055;
    color.g=color.g*(.47+warm*.73+cool*.34)+warm*.050;
    color.b=color.b*(.53+warm*.59+cool*.49)+warm*.041;
    if(m.emissive&&m.emissiveIntensity)color.add(m.emissive.clone().multiplyScalar(m.emissiveIntensity*.22));
    color.convertLinearToSRGB();
    values.push((.5+pos.x*.5)*size,(.5-pos.y*.5+offset)*size,pos.z,color.r*255,color.g*255,color.b*255);
   }
  }
 });
 const header=Buffer.alloc(8);header.writeInt32LE(size);header.writeInt32LE(values.length/18,4);
 const result=spawnSync(process.argv[2],[],{input:Buffer.concat([header,Buffer.from(new Float32Array(values).buffer)]),maxBuffer:2*1024*1024});
 if(result.status!==0||result.stdout.length!==size*size*4)throw Error('Foundry raster failed');
 const canvas=createCanvas(size,size);
 canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.stdout),size,size),0,0);
 return canvas;
}
function save(canvas,key){fs.writeFileSync(assetDir+'/'+key+'.webp',canvas.toBuffer('image/webp',90))}
function pose(m,face,overrides={}){
 animateMech(m,{pos:V3(),face,heading:face,noPlant:true,alive:true,brace:0,...overrides},1/60,0);
 m.cont.rotation.y=face;
}
function points(m,cam,fitGround=true){
 const {rig}=m,mounts=mountPoints(m);
 m.cont.updateMatrixWorld(true);
 const objects={...mounts,body:rig.spine,pilot:rig.neck,legs:rig.legs[0].kn,left:rig.arms.L.el,right:rig.arms.R.el,leadFoot:rig.legs[1].an};
 const origin=V3().project(cam);
 return Object.fromEntries(Object.entries(objects).map(([k,o])=>{
  const p=o.getWorldPosition(V3()).project(cam);
  const y=fitGround?ground-(p.y-origin.y)*.5:.5-p.y*.5;
  return [k,[+(.5+(p.x-origin.x)*.5).toFixed(4),+y.toFixed(4)]];
 }));
}
async function render(){
const glb=fs.readFileSync(require('node:path').join(__dirname,'../dist/rig-bench/weapons.glb'));
const arsenal=window.IronVowProductionArsenal;
const production=await arsenal.load(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength));
const cam=camera(.46),visuals=[];
for(const [model,[weapon,melee]] of defaults.entries()){
 const m=buildRig(model,'ally');
 const primary=arsenal.mount(production,weapon,m.rig.arms.R.so);
 const secondary=melee?arsenal.mount(production,melee,m.rig.arms.L.so):null;
 if(secondary)primary.mount.visible=false;
 pose(m,-.76);save(raster(m,cam),'foundry-'+model);
 const views=[];
 for(const [view,angle,elevation,target,span] of [['field',-.76,.46,3.55,worldSpan],['front',0,.12,3.55,9.4],['side',Math.PI/2,.10,3.55,9.4],['hip',-.45,.14,2.75,4.2],['back',Math.PI,.10,3.55,9.4],['other-side',-Math.PI/2,.10,3.55,9.4]]){
  const viewCamera=camera(elevation,target,span),key='foundry-'+model+(view==='field'?'':'-'+view);
  pose(m,angle);
  if(view!=='field')save(raster(m,viewCamera,ground,false),key);
  if(['field','side','back','other-side'].includes(view)){
   primary.mount.visible=false;
   if(secondary)secondary.mount.visible=false;
   const fit=view==='field',fittedKey=key+'-fit';
   save(raster(m,viewCamera,ground,fit),fittedKey);
   save(raster(m,viewCamera,ground,fit,true),fittedKey+'-paint');
   views.push({key:fittedKey,ortho:span/1.4,direction:angle>0?1:-1,...points(m,viewCamera,fit)});
   primary.mount.visible=!secondary;
   if(secondary)secondary.mount.visible=true;
  }
 }
 const atlas=createCanvas(size*4,size*5),g=atlas.getContext('2d'),maskAtlas=createCanvas(size*4,size*5),masks=maskAtlas.getContext('2d'),face=-.76;
 const motion=buildRig(model,'ally');
 const frames=[];
 const push=name=>{
  const index=frames.length;
  const x=index%4*size,y=Math.floor(index/4)*size;
  g.drawImage(raster(motion,cam),x,y);
  masks.drawImage(raster(motion,cam,ground,true,true),x,y);
  frames.push({name,...points(motion,cam)});
 };
 for(let i=0;i<8;i++){
  pose(motion,face);
  const {rig,dims}=motion;
  for(const [j,leg] of rig.legs.entries()){
   const phase=(i/8+(leg.phase??j*.5))%1;
   const z=(phase<.5?.82-3.28*phase:-.82+3.28*(phase-.5));
   const y=phase<.5?0:Math.sin(Math.PI*(phase-.5)*2)*dims.lift*.68;
   window.VowChassis.solveLeg(rig,dims,leg,V3(leg.restX,dims.ankleH+y,leg.restZ+z));
  }
  rig.pelvis.position.y-=.09+.10*Math.cos(i/8*Math.PI*4);
  push('walk');
 }
 for(let i=1;i<=3;i++){
  pose(motion,face);
  const {rig,dims}=motion,leg=rig.legs[1],p=i/3;
  window.VowChassis.solveLeg(rig,dims,leg,V3(leg.restX,dims.ankleH+Math.sin(Math.PI*p)*.45,leg.restZ+p*.85));
  push('prime');
 }
 motion.aim.until=1;motion.aim.blend=1;motion.aim.point.set(Math.sin(face)*20,3.7,Math.cos(face)*20);
 pose(motion,face);push('aim');
 motion.recoil=.42;pose(motion,face);push('recoil');
 motion.aim.until=-1;motion.aim.blend=0;motion.recoil=0;
 for(const [age,reach] of [[.30,-.14],[.46,.90],[.84,.51]]){
  motion.melee={age};
  pose(motion,face,{pos:V3(Math.sin(face)*reach,0,Math.cos(face)*reach)});push('strike');
 }
 motion.melee=null;
 pose(motion,face);push('idle');
 pose(motion,face,{alive:false,down:'pilot',deathAge:2});push('pilot');
 for(const part of ['body','right','left'])setPartState(motion,part,2);
 wreckMech(motion);pose(motion,face,{alive:false,down:'body',deathAge:2});push('wreck');
 save(atlas,'foundry-'+model+'-motion');
 save(maskAtlas,'foundry-'+model+'-motion-paint');
 visuals.push({key:'foundry-'+model+'-motion',cell:size,frames,views});
 console.log(names[model],frames.length+' poses');
}
const mix=window.VowChassis.build(3,'ally',null,null,{legs:5,core:3,arms:3});
const group=new T.Group();group.add(mix.root);group.rotation.y=-.6;
for(const leg of mix.rig.legs)window.VowChassis.solveLeg(mix.rig,mix.dims,leg,V3(leg.restX,mix.dims.ankleH,leg.restZ));
save(raster({cont:group},cam),'foundry-modular');
const raijin=new T.Group();
const weapon=arsenal.mount(production,'blade',raijin);
const weaponCamera=camera(.30,0,5.2);
const weaponViews={};
for(const [side,direction] of [['left',-1],['right',1]]){
 raijin.rotation.y=direction*1.22;weapon.model.position.z=-1.38;
 const key=side==='left'?'foundry-raijin':'foundry-raijin-right';
 save(raster({cont:raijin},weaponCamera,ground,false),key);
 const point=o=>{
  const p=o.getWorldPosition(V3()).project(weaponCamera);
  return [(.5+p.x*.5)*size,(.5-p.y*.5)*size];
 };
 const grip=new T.Object3D();weapon.model.add(grip);raijin.updateMatrixWorld(true);
 weaponViews[side]={key,grip:point(grip),axis:point(weapon.base),tip:point(weapon.tip),pixelsPerMetre:size/5.2*3.2};
 weapon.model.remove(grip);
}
fs.writeFileSync(assetDir+'/../foundry/baked.js','window.IRON_VOW_FOUNDRY_ART='+JSON.stringify(visuals)+';\nwindow.IRON_VOW_RAIJIN_ART='+JSON.stringify(weaponViews)+';\n');
}
render().catch(error=>{console.error(error);process.exitCode=1});
