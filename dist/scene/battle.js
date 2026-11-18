/* Shared battle scene. Game state owns rules and movement; this module owns presentation. */
(function(root){
'use strict';
// Keep the clearance verified against actual long-gun/shield endpoints. Close
// framing and continuous surfaces provide scale without moving those endpoints.
const T=root.THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TILE=7.4,HEIGHT=3.4,RISE=1.55;
const CARDINAL=[[1,0],[0,1],[-1,0],[0,-1]];
const ROCK_REPEAT=1.15,CONTACT_BINS=4;
const LIVE=new Set([5,6,7,8,9,12]);
const rigV2=root.IronVowRigV2;
let renderer,kit,scene,camera,battleRef,terrainRef,board,units,overlays,selection,targetRing,sun,pathGroup,combat;
let rockContacts;
let cameraReady=false,lightningAt=4,lightning=0;
const models=new Map(),aimTargets=new Map(),mortarCues=new Map(),groundMeshes=[],coverMeshes=[];
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(V3(0,1,0),0);
const cameraTarget=V3(),cameraPosition=V3();
function isLive(u){
 if(u.kind)return false;
 if(rigV2.applies(u))return Boolean(battleRef?.units.includes(u))||u.frame===0||u.frame===10;
 return !u.lionTrial&&(LIVE.has(u.frame)||root.IronVowCairn?.applies(u.frame)===true);
}
function world(x,z,y){
 const size=battle.size;
 return V3((x-(size.width-1)/2)*TILE,y??surfaceHeight(x,z),(z-(size.depth-1)/2)*TILE);
}
function cellAt(x,z){
 if(x<0||z<0||x>=battle.size.width||z>=battle.size.depth)return;
 return battle.field.cells?terrainCell(x,z):{level:0,material:0,variant:0,links:0};
}
function gradedAccess(x,z,dx,dz){
 // Both tiles derive the same access from the integer edge midpoint.
 let key=Math.imul(x*2+dx,0x45d9f3b)^Math.imul(z*2+dz,0x119de1f3);
 key=Math.imul(key^(key>>>16),0x45d9f3b);
 return ((key^(key>>>16))&7)<2;
}
// The moving chassis blends between levels. Feet sample the visible terraces
// and the occasional graded access that interrupts a bluff.
function surfaceHeight(x,z,renderedGround=false){
 const ix=Math.round(x),iz=Math.round(z),cell=cellAt(ix,iz),level=cell?.level??0;
 let y=level*RISE;
 for(const [direction,[dx,dz]] of CARDINAL.entries()){
  const along=dx?(x-ix)*dx:(z-iz)*dz,across=dx?Math.abs(z-iz):Math.abs(x-ix);
  const other=cellAt(ix+dx,iz+dz);
  if(!other||other.level===level||along<=.25||across>=.25)continue;
  const road=(cell?.links&(1<<direction))&&(other.links&(1<<((direction+2)%4)));
  if(!renderedGround||road||gradedAccess(ix,iz,dx,dz))y+=(other.level-level)*RISE*Math.min(.5,(along-.25)*2);
 }
 return y;
}
function unitRoot(u){
 const point=world(u.vx??u.x,u.vz??u.z);
 // The fixed practice target sits near its tile's edge so the authored Lion
 // strike reaches the target while the feet follow the original floor contacts.
 if(battle.lionTrial&&!u.lionTrial)point.add(V3(battle.units[0].melee==='cleaver'?-3.12:-3.55,0,-.92));
 return point;
}
function groundAt(x,z,includeRock=true){
 const fx=x/TILE+(battle.size.width-1)/2,fz=z/TILE+(battle.size.depth-1)/2,tx=Math.round(fx),tz=Math.round(fz);
 if(tx<0||tz<0||tx>=battle.size.width||tz>=battle.size.depth)return-.18;
 const mesh=groundMeshes[tz*battle.size.width+tx];if(!mesh)return surfaceHeight(fx,fz,true);
 // Interpolate the actual rendered plate triangle, rather than a different analytic surface under the feet.
 const n=mesh.geometry.parameters.widthSegments;
 const u=Math.max(0,Math.min(n,((fx-tx)*TILE/(TILE-.018)+.5)*n)),v=Math.max(0,Math.min(n,((fz-tz)*TILE/(TILE-.018)+.5)*n));
 const ix=Math.min(n-1,Math.floor(u)),iz=Math.min(n-1,Math.floor(v)),a=iz*(n+1)+ix,b=a+n+1,c=b+1,d=a+1,h=mesh.geometry.attributes.position;
 const sx=u-ix,sz=v-iz;
 const y=sx+sz<=1?h.getY(a)+sx*(h.getY(d)-h.getY(a))+sz*(h.getY(b)-h.getY(a)):
  h.getY(c)+(1-sx)*(h.getY(b)-h.getY(c))+(1-sz)*(h.getY(d)-h.getY(c));
 if(!includeRock||!rockContacts)return y;
 const bx=Math.floor((fx+.5)*CONTACT_BINS),bz=Math.floor((fz+.5)*CONTACT_BINS);
 return rockHeightAt(x,z,bx,bz,y);
}
function rockHeightAt(x,z,bx,bz,y){
 const {triangles,bins,columns}=rockContacts;
 const candidates=bins[bz*columns+bx];
 if(!candidates)return y;
 // Only the local projected triangles can support a foot. Use their actual
 // render vertices so a foot on the crest shares its visible contact height.
 for(const i of candidates){
  const ax=triangles[i],az=triangles[i+2];
  const ux=triangles[i+3]-ax,uz=triangles[i+5]-az,vx=triangles[i+6]-ax,vz=triangles[i+8]-az;
  const det=ux*vz-uz*vx;
  const u=((x-ax)*vz-(z-az)*vx)/det,v=(ux*(z-az)-uz*(x-ax))/det;
  if(u>=0&&v>=0&&u+v<=1)y=Math.max(y,(1-u-v)*triangles[i+1]+u*triangles[i+4]+v*triangles[i+7]);
 }
 return y;
}
function indexRockContacts(triangles){
 const columns=battle.size.width*CONTACT_BINS,rows=battle.size.depth*CONTACT_BINS,bins=[];
 const binX=x=>Math.floor(x*CONTACT_BINS/TILE+columns/2);
 const binZ=z=>Math.floor(z*CONTACT_BINS/TILE+rows/2);
 for(let i=0;i<triangles.length;i+=9){
  const ax=triangles[i],az=triangles[i+2],bx=triangles[i+3],bz=triangles[i+5],cx=triangles[i+6],cz=triangles[i+8];
  if(Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax))<1e-7)continue;
  const left=Math.max(0,binX(Math.min(ax,bx,cx))),right=Math.min(columns-1,binX(Math.max(ax,bx,cx)));
  const top=Math.max(0,binZ(Math.min(az,bz,cz))),bottom=Math.min(rows-1,binZ(Math.max(az,bz,cz)));
  for(let z=top;z<=bottom;z++)for(let x=left;x<=right;x++){
   const key=z*columns+x;
   (bins[key]??=[]).push(i);
  }
 }
 return {triangles,bins,columns};
}
function disposeTree(node){
 const seen=new Set();node.traverse(o=>{
  if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}
  for(const material of [o.material].flat().filter(Boolean))if(!seen.has(material)){
   seen.add(material);for(const key of ['map','roughnessMap','normalMap','emissiveMap'])if(material[key]&&!seen.has(material[key])){seen.add(material[key]);material[key].dispose();}material.dispose();
  }
 });
}
function init(){
 if(renderer)return;
 renderer=root.IronVowRenderer.get();
 root.IronVowRenderer.subscribe(({type})=>{if(type==='restored'){clear();cameraReady=false;}});
}
function clear(){
 if(board)root.IronVowEnvironmentAssets?.cancel(board);
 combat?.dispose();combat=null;
 for(const record of models.values())if(record.vehicle)root.IronVowVehicles.release(record.vehicle);
 root.IronVowFoundry?.clearCombat();root.IronVowVehicles.clear();models.clear();aimTargets.clear();mortarCues.clear();
 rigV2.clear();
 if(scene){sun?.shadow.map?.dispose();disposeTree(scene);}
 kit?.dispose();kit=null;scene=null;battleRef=null;rockContacts=null;groundMeshes.length=coverMeshes.length=0;
}
function rockGrain(x,z){
 return Math.sin(x*5.1+z*3.7)*.67+Math.sin(x*13.2-z*11.8)*.33;
}
function crownColor(color,soil,road,links,x,z,localX,localZ){
 let roadWeight=0;
 for(const [direction,[dx,dz]] of CARDINAL.entries()){
  if(!(links&(1<<direction)))continue;
  const along=dx*localX+dz*localZ,across=Math.abs(dx*localZ-dz*localX);
  const width=.19+rockGrain(x,z)*.022;
  const corridor=(1-T.MathUtils.smoothstep(across,width-.08,width+.07))*T.MathUtils.smoothstep(along,-.22,0);
  roadWeight=Math.max(roadWeight,corridor);
 }
 return color.copy(soil).multiplyScalar(.96+rockGrain(x,z)*.11).lerp(road,roadWeight);
}
function plate(x,z,cell,soil,road){
 const geometry=new T.PlaneGeometry(TILE-.018,TILE-.018,8,8);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){
  const px=x+positions.getX(i)/TILE,pz=z+positions.getZ(i)/TILE;
  positions.setY(i,surfaceHeight(px,pz,true));
 }
 const uv=geometry.attributes.uv;
 // World-continuous worn material avoids one painted/stamped panel per cell.
 for(let i=0;i<uv.count;i++)uv.setXY(i,(x+uv.getX(i))/3,(z+uv.getY(i))/3);
 if(cell.level){
  const colors=[],color=new T.Color();
  for(let i=0;i<positions.count;i++){
   const localX=positions.getX(i)/TILE,localZ=positions.getZ(i)/TILE;
   crownColor(color,soil,road,cell.links,x+localX,z+localZ,localX,localZ);
   colors.push(color.r,color.g,color.b);
   uv.setXY(i,(x+localX)*ROCK_REPEAT,(z+localZ)*ROCK_REPEAT);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 }
 geometry.computeVertexNormals();return geometry;
}
function rockCuts(terrainMap,soil,road){
 const positions=[],colors=[],uvs=[],edge=.5-.009/TILE;
 const bands=[1,.75,.61,.29,0],tones=[1,.92,.73,.87,.69];
 const ledges=[0,.032,.005,.059,.101];
 const faces=[[0,1],[1,2],[2,3],[3,4]];
 const color=new T.Color();
 const vertex=({point,uv,shade,tint})=>{
  positions.push(point.x,point.y,point.z);uvs.push(...uv);
  color.copy(tint).multiplyScalar(shade);colors.push(color.r,color.g,color.b);
 };
 const quad=(a,b,c,d)=>{vertex(a);vertex(b);vertex(d);vertex(b);vertex(c);vertex(d);};
 const cornerNormal=(x,z,level)=>{
  let nx=0,nz=0;
  for(const dx of [-.5,.5])for(const dz of [-.5,.5]){
   if((cellAt(x+dx,z+dz)?.level??0)>=level){nx-=dx*2;nz-=dz*2;}
  }
  return [Math.sign(nx),Math.sign(nz)];
 };
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const {level,links}=cellAt(x,z);
  if(!level)continue;
  for(const [dx,dz] of CARDINAL){
   const next=cellAt(x+dx,z+dz),lower=next?.level??0;
   if(level<=lower)continue;
   const tx=-dz,tz=dx;
   const corners=[-.5,.5].map(t=>cornerNormal(x+dx*.5+tx*t,z+dz*.5+tz*t,level));
   const station=t=>{
    const tangent=Math.max(-edge,Math.min(edge,t));
    const localX=dx*edge+tx*tangent,localZ=dz*edge+tz*tangent;
    const seam=world(x+localX,z+localZ,0);
    const opposite=world(x+dx*(1-edge)+tx*tangent,z+dz*(1-edge)+tz*tangent,0);
    const high=groundAt(seam.x,seam.z,false),low=next?groundAt(opposite.x,opposite.z,false):-.18;
    const relief=Math.max(0,high-low);
    // The cut gives way to the existing ramp as the two plates meet.
    const shoulder=T.MathUtils.smoothstep(relief,.024,.9);
    const ex=x+dx*.5+tx*t,ez=z+dz*.5+tz*t;
    const [cx,cz]=corners[t<0?0:1];
    const turn=T.MathUtils.smoothstep(Math.abs(t),.375,.5);
    const nx=T.MathUtils.lerp(dx,cx,turn),nz=T.MathUtils.lerp(dz,cz,turn);
    const grain=rockGrain(ex,ez);
    const overhang=(.075+grain*.055)*shoulder;
    const tint=crownColor(new T.Color(),soil,road,links,x+localX,z+localZ,localX,localZ);
    const root={point:seam.setY(high),uv:[(x+localX)*ROCK_REPEAT,(z+localZ)*ROCK_REPEAT],shade:1,tint};
    const crestY=high-Math.min(relief*.18,(.12-grain*.055)*shoulder);
    const rows=bands.map((fraction,i)=>{
     const spread=overhang+(ledges[i]+grain*.009*i)*shoulder;
     const y=i===bands.length-1?low-.024:low+(crestY-low)*(fraction+grain*.033*Math.sin(fraction*Math.PI));
     const point=world(ex+nx*spread,ez+nz*spread,y);
     // Continue the crown's UVs down the face in the outward direction.
     const unrolled=spread+(crestY-y)/TILE;
     const uv=[(ex+nx*unrolled)*ROCK_REPEAT,(ez+nz*unrolled)*ROCK_REPEAT];
     return {point,uv,shade:1+(tones[i]-1+grain*.059)*shoulder,tint};
    });
    return {root,rows};
   };
   // Include the plate edge vertices and intermediate facets in the rock.
   const stations=Array.from({length:17},(_,i)=>station(i===0?-.5:i===16?.5:(i/8-1)*edge));
   for(let i=1;i<stations.length;i++){
    const a=stations[i-1],b=stations[i];
    quad(a.root,b.root,b.rows[0],a.rows[0]);
    for(const [above,below] of faces)quad(a.rows[above],b.rows[above],b.rows[below],a.rows[below]);
   }
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 geometry.computeVertexNormals();
 rockContacts=indexRockContacts(geometry.attributes.position.array);
 const material=new T.MeshStandardMaterial({map:terrainMap,vertexColors:true,roughness:1,side:T.DoubleSide});
 const mesh=new T.Mesh(geometry,material);
 mesh.name='rock-cut-cliffs';mesh.userData.levelRise=RISE;mesh.receiveShadow=true;
 board.add(mesh);
}
function terrainDetails(){
 const markings=[],ticks=[];
 const quad=(out,a,b,c,d)=>out.push(...a,...b,...d,...b,...c,...d);
 const point=(x,z,y)=>world(x,z,y).toArray();
 const stripe=(out,x,z,dx,dz,lo,hi,w,y)=>{
  const tx=-dz*w,tz=dx*w;
  const p=(t,s)=>point(x+dx*t+tx*s,z+dz*t+tz*s,y);
  quad(out,p(lo,-1),p(lo,1),p(hi,1),p(hi,-1));
 };
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const cell=cellAt(x,z),y=cell.level*RISE;
  for(const [direction,[dx,dz]] of CARDINAL.entries()){
   if(cell.links&(1<<direction)){
    // Roads are continuous across authored links, independent of the tile grid.
    stripe(markings,x,z,dx,dz,.11,.32,.012,y+.032);
   }
  }
  if(!battle.cover.has(x+','+z))for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
   const a=world(x+dx*.47,z+dz*.47,y+.025),b=world(x+dx*.36,z+dz*.47,y+.025),c=world(x+dx*.47,z+dz*.36,y+.025);
   ticks.push(...a.toArray(),...b.toArray(),...a.toArray(),...c.toArray());
  }
 }
 const add=(positions,name,color,opacity=1)=>{
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:kit.C(color),roughness:.95,side:T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1});
  const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.receiveShadow=true;board.add(mesh);return mesh;
 };
 add(markings,'road-markings',0xb7a878,.65);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(ticks,3));
 const grid=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xc1c9ba,transparent:true,opacity:.12,depthWrite:false}));grid.name='tactical-grid-corners';board.add(grid);
}
function build(){
 root.IronVowFoundry.retainPreview();
 clear();init();battleRef=battle;terrainRef=battle.field.cells;kit=root.IronVowSceneKit(renderer);kit.setSize(battle.size.width,battle.size.depth,TILE);
 root.IronVowVehicles.load(battle.units.map(u=>u.kind).filter(Boolean));
 rigV2.load(battle.units);
 const index=Math.max(0,CONTRACTS.indexOf(battle.contract)-1)%3,P=kit.PAL[index];
 scene=new T.Scene();scene.background=kit.C(P.bg);scene.fog=new T.Fog(kit.C(P.fog[0]),P.fog[1],P.fog[2]);scene.environment=kit.envFrom(P.env);
 scene.add(new T.HemisphereLight(kit.C(P.hemi[0]),kit.C(P.hemi[1]),P.hemi[2]));
 sun=new T.DirectionalLight(kit.C(P.sun[0]),P.sun[1]);sun.position.set(...P.dir);sun.castShadow=true;
 const half=Math.max(battle.size.width,battle.size.depth)*TILE*.65;
 Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:1,far:180});
 sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
 const rim=new T.DirectionalLight(kit.C(0x9ab8d0),.6);rim.position.set(30,18,-30);scene.add(rim);
 board=new T.Group();scene.add(board);units=new T.Group();scene.add(units);
 const floor=new T.Mesh(new T.PlaneGeometry(300,300),kit.groundMaterial(P));floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;board.add(floor);
 const terrainMap=kit.imgTex('assets/concrete.webp',[1,1]);
 const rockMap=kit.imgTex('assets/rock-cut.webp',[1,1]);
 const soil=kit.C(index===1?0x8b806a:0x83907b),road=kit.C(index===2?0x7f8981:0x777b79);
 const materials=[
  new T.MeshStandardMaterial({color:kit.C(index===1?0xa49c86:0x8c9b91),map:terrainMap,roughness:.96,metalness:.015}),
  new T.MeshStandardMaterial({vertexColors:true,map:rockMap,roughness:1}),
  new T.MeshStandardMaterial({color:road,map:terrainMap,roughness:.9,metalness:.015})
 ];
 const overlayPositions=[],overlayColors=[],tileIndices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const cell=cellAt(x,z),geometry=plate(x,z,cell,soil,road),p=world(x,z,0),mesh=new T.Mesh(geometry,materials[cell.level?1:cell.links?2:0]);mesh.position.copy(p);mesh.receiveShadow=true;mesh.userData.tile={x,z};board.add(mesh);groundMeshes.push(mesh);
  const positions=geometry.attributes.position,offset=overlayPositions.length/3;
  for(let i=0;i<positions.count;i++){overlayPositions.push(positions.getX(i)+p.x,positions.getY(i)+.025,positions.getZ(i)+p.z);overlayColors.push(1,1,1);}
  tileIndices.push(Array.from(geometry.index.array,v=>v+offset));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(overlayPositions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(overlayColors,3));geometry.setIndex([]);
 overlays=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.38,depthWrite:false,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1}));overlays.userData.indices=tileIndices;overlays.renderOrder=2;scene.add(overlays);
 rockCuts(rockMap,soil,road);terrainDetails();
 const edgeMaterial=kit.MAT.hazard;
 for(const [x,z,w,d] of [[0,-battle.size.depth*TILE/2,battle.size.width*TILE,.3],[0,battle.size.depth*TILE/2,battle.size.width*TILE,.3],[-battle.size.width*TILE/2,0,.3,battle.size.depth*TILE],[battle.size.width*TILE/2,0,.3,battle.size.depth*TILE]]){
  const mesh=new T.Mesh(new T.BoxGeometry(w,.16,d),edgeMaterial);mesh.position.set(x,-.08,z);mesh.receiveShadow=true;board.add(mesh);
 }
 for(const key of battle.cover){const [x,z]=key.split(',').map(Number),cover=kit.buildCover(key,battle.field.cover[key]);cover.position.y=surfaceHeight(x,z);cover.userData.tile={x,z};board.add(cover);cover.userData.bounds=new T.Box3().setFromObject(cover);coverMeshes.push(cover);}
 kit.buildProps(board,index);
 if(root.IronVowEnvironmentAssets)void root.IronVowEnvironmentAssets.populate(board,{width:battle.size.width,depth:battle.size.depth,tile:TILE,theater:['relay','corridor','frontier'][index],coverGroups:coverMeshes});
 const ring=color=>{const m=new T.Mesh(new T.RingGeometry(TILE*.4,TILE*.43,48),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.renderOrder=3;scene.add(m);return m;};
 selection=ring(0xe6b76a);targetRing=ring(0xe2846e);
 pathGroup=new T.Group();scene.add(pathGroup);
 const surface=document.createElement('canvas');surface.width=surface.height=64;const g=surface.getContext('2d');
 g.fillStyle='#fff';g.beginPath();g.moveTo(14,12);g.lineTo(34,32);g.lineTo(14,52);g.lineTo(24,52);g.lineTo(44,32);g.lineTo(24,12);g.closePath();g.fill();
 const chevTexture=new T.CanvasTexture(surface),chevGeometry=new T.PlaneGeometry(1.3,1.3);chevGeometry.rotateX(-Math.PI/2);
 for(let i=0;i<battle.size.width*battle.size.depth;i++){const mesh=new T.Mesh(chevGeometry,new T.MeshBasicMaterial({map:chevTexture,color:0xe6c182,transparent:true,depthWrite:false}));mesh.renderOrder=4;mesh.visible=false;pathGroup.add(mesh);}
 camera=new T.PerspectiveCamera(30,innerWidth/innerHeight,.3,500);cameraReady=false;
 combat=root.IronVowCombat.create(scene,{camera,groundAt,world,partPoint,attachmentPoint,models,isLive,sync:u=>prepareUnit(u,clock)});
 lightningAt=clock+4;lightning=0;
 updateCamera(clock,0);
}
function partPoint(unit,part='body'){
 if(!scene||battleRef!==battle)build();
 if(unit.kind&&models.get(unit.id)?.vehicle)return attachmentPoint(unit,part);
 const entry=models.get(unit.id)?.entry,m=entry?.m;
 if(m?.rig){
  const r=m.rig,node=m.nativeV2?.anchors?.[part]||(part==='pilot'?r.neck:part==='right'?r.arms.R.el:part==='left'?r.arms.L.el:part==='legs'?r.legs[0].kn:r.spine);
  const p=node.getWorldPosition(V3());if(part==='body')p.y+=1.2*(m.scale||1);return p;
 }
 const node=m?.anchors?.[part];if(node)return node.getWorldPosition(V3());
 const height=unit.kind?VEHICLES[unit.kind].altitude*(RISE/TERRAIN_RISE)+.4*HEIGHT:part==='legs'?1:part==='pilot'?5.7:3.8;
 return unitRoot(unit).add(V3(0,height,0));
}
function attachmentPoint(unit,part='body'){
 if(!scene||battleRef!==battle)build();
 const vehicle=models.get(unit.id)?.vehicle;
 if(vehicle)return (part.startsWith('muzzle')?vehicle.muzzle:vehicle.body).getWorldPosition(V3());
 const entry=models.get(unit.id)?.entry,m=entry?.m;
 if(!m)return partPoint(unit,part);
 const mounts=root.IronVowFoundryRig.mountPoints(m),r=m.rig;
 const node=({body:r.spine,pilot:r.neck,right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,
  ...m.nativeV2?.anchors,...mounts,muzzle:entry.primary?.muzzle||mounts.muzzle,muzzle2:entry.primary?.muzzle2||entry.primary?.muzzle||mounts.muzzle2,
  shoulderMuzzle:entry.shoulderWeapon?.muzzle||(entry.primarySocket?entry.primary?.muzzle:mounts.shoulderMuzzle),
  shoulderMuzzle2:entry.shoulderWeapon?.muzzle2||(entry.primarySocket?(entry.primary?.muzzle2||entry.primary?.muzzle):mounts.shoulderMuzzle2),
  meleeTip:entry.secondary?.tip,mortarMuzzle:m.mortar?.muzzle,shield:entry.shield?.face})[part];
 return node?.getWorldPosition(V3())||partPoint(unit,part);
}
function projectWorld(point){const p=point.clone().project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z};}
function labelPoint(unit){
 const record=models.get(unit.id),m=record?.entry?.m;
 if(record?.vehicle)return projectWorld(attachmentPoint(unit,'body').add(V3(0,1.2,0)));
 if(!m)return projectWorld(partPoint(unit,unit.kind?'body':'pilot').add(V3(0,.7,0)));
 const neck=(m.nativeV2?.anchors?.pilot||m.rig.neck).getWorldPosition(V3());
 return projectWorld(neck.add(V3(0,record.headHeight+.7,0)));
}
function updateCamera(t,dt){
 const mobile=innerWidth<760,size=battle.size,fov=mobile?40:30;
 camera.aspect=innerWidth/innerHeight;camera.fov=fov;
 const usable=Math.max(200,innerWidth-(mobile?24:380)),hf=2*Math.atan(Math.tan(fov*Math.PI/360)*usable/innerHeight);
 const fit=Math.max(size.width*TILE*1.3/(2*Math.tan(hf/2)),size.depth*TILE*.9/(2*Math.tan(fov*Math.PI/360)));
 const portrait=innerHeight>innerWidth;
 const fx=portrait&&!mobile?Math.max(1.5,Math.min(fieldCamera.x,size.width-2.5)):fieldCamera.x;
 const fz=portrait&&!mobile?Math.max(1.5,Math.min(fieldCamera.z,size.depth-2.5)):fieldCamera.z;
 const target=fieldCamera.overview?world((size.width-1)/2,(size.depth-1)/2):world(fx,fz);
 const distance=fieldCamera.overview?fit:fit*overviewZoom/Math.max(overviewZoom,viewZoom)*(portrait&&!mobile?.66:.88),az=mobile?0:Math.PI/4,el=mobile?.8:.66;
 const position=target.clone().add(V3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(distance));
 const shot=activeCinematic;
 if(shot&&!reducedMotion){
  const actor=unitRoot(shot.actor),victim=partPoint(shot.target,shot.part),direction=victim.clone().sub(actor).setY(0);
  // On a close shot, move outside the attacker's shoulder so the defender stays visible.
  const close=1-smoothRange(TILE*2,TILE*4,direction.length());
  direction.normalize();const side=V3(direction.z,0,-direction.x);
  target.copy(shot.phase==='result'?victim:victim.clone().lerp(actor,.12));
  position.copy(actor).addScaledVector(direction,-6.5).addScaledVector(side,3.4+3.2*close);position.y=actor.y+6+1.2*close;
 }
 const blend=cameraReady?1-Math.exp(-dt*6):1;cameraTarget.lerp(target,blend);cameraPosition.lerp(position,blend);camera.position.copy(cameraPosition);
 if(!reducedMotion&&shake>.15)camera.position.add(V3(Math.sin(t*110),Math.cos(t*93)*.5,0).multiplyScalar(Math.min(1.4,shake*.03)));
 camera.lookAt(cameraTarget);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);cameraReady=true;
 scene.fog.near=distance*.9;scene.fog.far=distance*2.6;
}
function prepareUnit(u,t){
 let record=models.get(u.id),object;
 if(u.kind){
  if(root.IronVowVehicles.status(u.kind)!=='ready')return;
  if(!record){
   record={vehicle:root.IronVowVehicles.create(u.kind)};models.set(u.id,record);
  }
  root.IronVowVehicles.update(record.vehicle,u,t,world(u.vx,u.vz),displayedHeading(u),reducedMotion,RISE/TERRAIN_RISE);
  object=record.vehicle.object;
 }else{
  const pose=animationPose(u,hitstopTime(u,t)),p=unitRoot(u),goal=aimTargets.get(u.id),airborne=Boolean(u.motion?.jumpjet&&!reducedMotion);
  if(airborne)p.y+=jumpjetHeight(u,t);
  const mortar=mortarCues.get(u.id);if(mortar){pose.mortarAge=t-mortar.at;if(pose.mortarAge>=2.1)mortarCues.delete(u.id);}
  const motion=u.motion,heading=motion?Math.atan2(motion.toX-motion.fromX,motion.toZ-motion.fromZ):(displayedHeading(u)+Math.PI/4);
  const defending=u.alive&&!u.attack&&!motion&&!reducedMotion&&activeCinematic?.target===u;
  const guardPoint=defending?unitRoot(activeCinematic.actor):null;
  const elapsed=record?Math.max(0,Math.min(.05,t-record.previousTime)):1/60;
  const lastGuard=record?.guard??0;
  // The cinematic guard uses the rig's brace pose without changing the unit's Brace action.
  const guard=u.alive&&!reducedMotion?lastGuard+((defending ? .76 : 0)-lastGuard)*(1-Math.exp(-elapsed*12)):0;
  pose.brace=Math.max(pose.brace,guard);
  const speed=record?.previousPosition&&t>record.previousTime?p.distanceTo(record.previousPosition)/(t-record.previousTime):0;
  const aim=goal&&goal.target.alive?partPoint(goal.target,goal.part):p.clone().add(V3(Math.sin(heading)*20,4,Math.cos(heading)*20));
  const targetRoot=goal?unitRoot(goal.target):p.clone();
  const footprint=entry=>{const D=entry?.m.dims,scale=entry?.m.scale||.9;return D?(D.quad?Math.hypot(D.hipX+D.reach*.707,D.hipZ+D.reach*.707)+.55:D.restX+.75)*scale:2;};
  const lungeLimit=goal?Math.min(2.6,Math.max(0,p.clone().sub(targetRoot).setY(0).length()-(footprint(record?.entry)+footprint(models.get(goal.target.id)?.entry))*.8-.2)):0;
  const face=guardPoint?Math.atan2(guardPoint.x-p.x,guardPoint.z-p.z):goal&&!u.lionTrial?Math.atan2(aim.x-p.x,aim.z-p.z):heading;
  pose.heading=heading;pose.reducedMotion=reducedMotion;pose.world={...p,targetRoot,airborne,lungeLimit:reducedMotion?0:lungeLimit,onStep:(...args)=>combat?.step(...args),face,heading,aim,groundAt,speed};
  const custom=rigV2.applies(u)?'rig-v2':undefined;
  const entry=root.IronVowFoundry.draw(u,hitstopTime(u,t),pose,battle,foundryModel(u.frame),custom);
  if(!entry)return;
  object=entry.m.cont;
  if(!record){record={entry};models.set(u.id,record);}else record.entry=entry;
  record.previousPosition=p;record.previousTime=t;record.guard=guard;
 }
 if(object.parent!==units)units.add(object);record.object=object;
 if(!record.proxy){
  const m=record.entry?.m,bounds=m?new T.Box3().setFromObject(m.cont):null,p=unitRoot(u);
  record.height=bounds?Math.max(2,bounds.max.y-p.y):u.kind?4:7.5;
  const headBounds=m&&(m.nativeV2?.bounds('neck')||new T.Box3().setFromObject(m.rig.neck));
  record.headHeight=headBounds?Math.max(0,headBounds.max.y-(m.nativeV2?.anchors?.pilot||m.rig.neck).getWorldPosition(V3()).y):0;
  const proxySize=record.vehicle?[1,1,1]:[Math.max(2,bounds.max.x-bounds.min.x),record.height,Math.max(2,bounds.max.z-bounds.min.z)];
  record.proxy=new T.Mesh(new T.BoxGeometry(...proxySize),new T.MeshBasicMaterial({visible:false}));
  record.proxy.userData.unitId=u.id;units.add(record.proxy);
 }
 if(record.vehicle){
  const bounds=record.vehicle.bounds.clone().applyMatrix4(object.matrixWorld);
  bounds.getCenter(record.proxy.position);bounds.getSize(record.proxy.scale);
 }else record.proxy.position.copy(unitRoot(u)).add(V3(0,record.height/2,0));
 record.proxy.visible=u.alive;record.proxy.updateMatrixWorld(true);
}
function updateOverlays(){
 const selectedUnit=current(),ready=battle.phase==='player'&&!battle.busy;
 const reach=selectedUnit&&ready&&action==='move'?paths(selectedUnit):null,jump=selectedUnit&&ready&&action==='jumpjet';
 const w=selectedUnit&&ready&&action!=='move'&&!jump?selectedWeapon(selectedUnit):null;
 const colors=overlays.geometry.attributes.color,indices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const key=x+','+z,index=z*battle.size.width+x;let color;
  if(reach?.get(key)>0)color=reach.get(key)>freeMovement(selectedUnit)?0xcc9b49:0x77b4c5;
  if(jump&&jumpjetLanding(selectedUnit,x,z))color=0x619fcb;
  if(w&&!battle.cover.has(key)&&distance(selectedUnit,{x,z})>0&&distance(selectedUnit,{x,z})<=weaponRange(w,selectedUnit.training)&&!attackObstruction(selectedUnit,{x,z},w))color=0xc48469;
  if(ready&&hover?.x===x&&hover?.z===z)color=0xe7be6e;
  if(color!==undefined){const c=new T.Color(color);for(const i of new Set(overlays.userData.indices[index]))colors.setXYZ(i,c.r,c.g,c.b);indices.push(...overlays.userData.indices[index]);}
 }
 colors.needsUpdate=true;overlays.geometry.setIndex(indices);
 for(const [ring,u] of [[selection,selectedUnit],[targetRing,battle.units.find(u=>u.alive&&u.id===lockedTarget)]]){ring.visible=Boolean(u);if(u)ring.position.copy(unitRoot(u)).add(V3(0,.04,0));}
 const spot=moveTap??hover,path=selectedUnit&&reach?.get(spot?.x+','+spot?.z)>0?route(selectedUnit,spot.x,spot.z):[];
 let previous=selectedUnit;
 pathGroup.children.forEach((mesh,i)=>{const tile=path[i];mesh.visible=Boolean(tile);if(!tile)return;
  mesh.position.copy(world(tile.x,tile.z)).add(V3(0,.05,0));mesh.rotation.y=-Math.atan2(tile.z-previous.z,tile.x-previous.x);
  mesh.material.color.setHex(i+1>freeMovement(selectedUnit)?0xcc9b49:0xbfe4ee);previous=tile;
 });
}
function render(t,dt){
 init();if(!battle){root.IronVowRenderer.show(false);if(battleRef)clear();return;}
 if(root.IronVowRenderer.lost)return;
 if(battleRef!==battle||terrainRef!==battle.field.cells||!scene)build();
 for(const u of battle.units)prepareUnit(u,t);
 for(const u of battle.units){const cue=mortarCues.get(u.id);if(cue&&!cue.fired&&t-cue.at>=.95){cue.fired=true;const p=attachmentPoint(u,'mortarMuzzle');combat.fx.glow(p,0xffb050,3,.15);combat.fx.smoke(p,4,1.4,0xc4bdb0,.5,.8,1.4,.3);}}
 combat.update(t,dt);updateCamera(t,dt);updateOverlays();
 const storm=Math.max(0,CONTRACTS.indexOf(battle.contract)-1)%3===2;
 if(storm&&!reducedMotion){if(t>=lightningAt){lightning=1;lightningAt=t+kit.random(5,11);}lightning*=Math.exp(-dt*9);sun.intensity=kit.PAL[2].sun[1]+lightning*2.5*(kit.random(0,1)>.3?1:.4);}
 root.IronVowRenderer.show(true);root.IronVowRenderer.resize(innerWidth,innerHeight);
 const shadow=root.IronVowRenderer.quality.shadow;
 if(sun.shadow.mapSize.x!==shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(shadow,shadow);}
 renderer.setRenderTarget(null);renderer.render(scene,camera);root.IronVowPerformance?.recordRender(renderer.info);
}
function project(x,y,z){
 if(!scene||battleRef!==battle)build();const p=world(x,z,y*(RISE/TERRAIN_RISE)).project(camera);
 return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z};
}
function ray(x,y){pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);raycaster.setFromCamera(pointer,camera);return raycaster;}
function screenTile(x,y){
 if(!scene||battleRef!==battle)build();const hit=ray(x,y).intersectObjects(groundMeshes,false)[0];
 const obstacle=ray(x,y).intersectObjects(coverMeshes,true)[0];
 if(obstacle&&(!hit||obstacle.distance<hit.distance)){let o=obstacle.object;while(o&&!o.userData?.blocking)o=o.parent;if(o?.userData.tile)return {...o.userData.tile};}
 if(!hit)return {x:-1,z:-1};return {x:Math.round(hit.point.x/TILE+(battle.size.width-1)/2),z:Math.round(hit.point.z/TILE+(battle.size.depth-1)/2)};
}
function pick(x,y){
 if(!scene||battleRef!==battle)build();const hit=ray(x,y).intersectObjects([...models.values()].map(m=>m.proxy).filter(Boolean),false)[0];return hit?battle.units.find(u=>u.id===hit.object.userData.unitId):null;
}
function pan(dx,dy){
 if(!scene)return;const a=ray(innerWidth/2,innerHeight/2).ray.intersectPlane(plane,V3()),b=ray(innerWidth/2+dx,innerHeight/2+dy).ray.intersectPlane(plane,V3());
 if(!a||!b)return;fieldCamera.x=Math.max(-.5,Math.min(battle.size.width-.5,fieldCamera.x+(a.x-b.x)/TILE));fieldCamera.z=Math.max(-.5,Math.min(battle.size.depth-.5,fieldCamera.z+(a.z-b.z)/TILE));
}
const overviewZoom=.47*3.4/TILE;
root.IronVowScene={isLive,render,project,projectWorld,screenTile,pick,pan,partPoint,attachmentPoint,labelPoint,groundAt,world,clear,overviewZoom,
 get terrainMetrics(){return {tilePitch:TILE,levelRise:RISE,gridStyle:'corner-ticks',surface:'rock-cut-bluffs-with-graded-access'};},
 get covers(){return coverMeshes.map(m=>({min:m.userData.bounds.min.toArray(),max:m.userData.bounds.max.toArray()}));},
 overlayInfo(){return {triangles:overlays.geometry.index.count/3,path:pathGroup.children.filter(m=>m.visible).map(m=>({position:m.position.toArray(),color:m.material.color.getHex()})),selected:selection.visible,target:targetRing.visible};},
 aimAt(actor,victim,part){aimTargets.set(actor.id,{target:victim,part});},
 mortarPresentation(unit,at=clock){if(models.get(unit.id)?.entry?.m?.mortar)mortarCues.set(unit.id,{at,fired:false});},
 get combat(){return combat;},get camera(){return camera;},get scene(){return scene;},get models(){return models;},
 get loadFailed(){return root.IronVowEnvironmentAssets?.status(board)==='error'||Boolean(scene&&battleRef===battle&&battle?.units.some(u=>(
  u.kind?root.IronVowVehicles.status(u.kind):rigV2.status(u)
 )==='error'));},
 get ready(){return Boolean(scene&&!root.IronVowRenderer.lost&&root.IronVowEnvironmentAssets?.status(board)!=='loading'&&battleRef===battle&&battle?.units.every(u=>(
  u.kind?models.get(u.id)?.vehicle:models.get(u.id)?.entry.armed
 )));}
};
})(window);
