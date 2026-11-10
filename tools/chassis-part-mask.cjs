const {spawnSync}=require('node:child_process');
const {existsSync,mkdtempSync,writeFileSync,unlinkSync,rmdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');

// The low three bits identify a part. No part is encoded as black.
const parts=['body','pilot','right','left','legs'];
const colors=Array.from({length:6},(_,id)=>[id&1?255:0,id&2?255:0,id&4?255:0]);
function damageMeshes(rig){
 const ids=new Map();
 for(const [i,part] of parts.entries())for(const {m} of rig.build.parts[part]){
  if(ids.has(m)&&ids.get(m)!==i+1)throw Error('Mesh has multiple damage parts: '+m.name);
  ids.set(m,i+1);
 }
 // The damage map explicitly owns painted plates and detachable components.
 // Rigid hardware without a damage material inherits its mechanical assembly.
 const joints=new Map([[rig.build.root,1],[rig.rig.neck,2]]);
 for(const [side,part] of [['R',3],['L',4]]){
  const {sh,paul}=rig.rig.arms[side];
  joints.set(sh,part);joints.set(paul,part);
 }
 for(const {hip} of rig.rig.legs)joints.set(hip,5);
 for(const {g} of rig.rig.skirts)joints.set(g,5);
 rig.build.root.traverse(o=>{
  if(!o.isMesh||ids.has(o))return;
  for(let parent=o.parent;parent;parent=parent.parent){
   if(joints.has(parent)){ids.set(o,joints.get(parent));break}
  }
 });
 return ids;
}
function partColor(id){
 return colors[id];
}
function normalizeMask(pixels){
 for(let i=0;i<pixels.length;i+=4){
  // Round the flat interpolated channels back to their exact source values.
  for(let c=0;c<3;c++)pixels[i+c]=pixels[i+c]>=128?255:0;
  if(!pixels[i]&&!pixels[i+1]&&!pixels[i+2])pixels[i+3]=0;
 }
 return pixels;
}
function savePartMask(canvas,path){
 const dir=mkdtempSync(join(tmpdir(),'iron-vow-mask-')),png=join(dir,'mask.png');
 writeFileSync(png,canvas.toBuffer('image/png'));
 try{
  const sprite=path.replace(/-parts\.webp$/,'.webp');
  const result=spawnSync(process.env.IRON_VOW_PYTHON||'python',[
   '-c',[
    'import sys',
    'from PIL import Image, ImageChops',
    'mask = Image.open(sys.argv[1]).convert("RGBA")',
    'if len(sys.argv) > 3:',
    '    alpha = Image.open(sys.argv[3]).convert("RGBA").getchannel("A")',
    '    if alpha.size != mask.size: raise ValueError("Part mask dimensions differ from its sprite")',
    '    mask.putalpha(ImageChops.multiply(mask.getchannel("A"), alpha))',
    'mask.save(sys.argv[2], lossless=True, method=6)',
   ].join('\n'),png,path,...(existsSync(sprite)?[sprite]:[])
  ],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error('Part mask encoding failed: '+path);
 }finally{unlinkSync(png);rmdirSync(dir)}
}

// Same projection, depth and pixel-center rules as foundry-raster.cpp.
function rasterPixels(values,size){
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
 return pixels;
}
module.exports={damageMeshes,partColor,normalizeMask,savePartMask,rasterPixels};
