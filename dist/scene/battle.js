/* Shared battle scene. Game state owns rules and movement; this module owns presentation. */
(function(root){
'use strict';
// Keep the clearance verified against actual long-gun/shield endpoints. Close
// framing and continuous surfaces provide scale without moving those endpoints.
const T=root.THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TILE=7.4,HEIGHT=3.4,RISE=2.8;
const CARDINAL=[[1,0],[0,1],[-1,0],[0,-1]];
const ROCK_REPEAT=1.15,CONTACT_BINS=4;
const LIVE=new Set([5,6,7,8,9,12]);
const rigV2=root.IronVowRigV2;
let renderer,kit,scene,camera,battleRef,terrainRef,board,units,overlays,selection,targetRing,sun,pathGroup,combat;
let rockContacts,cliffMesh;
let cameraReady=false,duelSky=null,duelSequence,duelSetup,lightningAt=4,lightning=0;
const models=new Map(),aimTargets=new Map(),mortarCues=new Map(),nativeCues=new Map(),groundMeshes=[],coverMeshes=[];
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
 root.IronVowFoundry?.clearCombat();root.IronVowVehicles.clear();models.clear();aimTargets.clear();mortarCues.clear();nativeCues.clear();
 rigV2.clear();
 if(scene){sun?.shadow.map?.dispose();disposeTree(scene);}
 kit?.dispose();kit=null;scene=null;battleRef=null;rockContacts=null;cliffMesh=null;groundMeshes.length=coverMeshes.length=0;
}
function rockGrain(x,z){
 return Math.sin(x*5.1+z*3.7)*.67+Math.sin(x*13.2-z*11.8)*.33;
}
function roadCoverage(links,x,z,localX,localZ){
 let coverage=0;
 for(const [direction,[dx,dz]] of CARDINAL.entries()){
  if(!(links&(1<<direction)))continue;
  const along=dx*localX+dz*localZ,across=Math.abs(dx*localZ-dz*localX);
  const width=.20+rockGrain(x,z)*.025;
  coverage=Math.max(coverage,(1-T.MathUtils.smoothstep(across,width-.07,width+.085))*T.MathUtils.smoothstep(along,-.20,0));
 }
 return coverage;
}
function crownColor(color,soil,road,links,x,z,localX,localZ){
 return color.copy(soil).multiplyScalar(.96+rockGrain(x,z)*.11).lerp(road,roadCoverage(links,x,z,localX,localZ));
}
function plate(x,z,cell){
 const geometry=new T.PlaneGeometry(TILE-.018,TILE-.018,8,8);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position,weights=[];
 for(let i=0;i<positions.count;i++){
  const localX=positions.getX(i)/TILE,localZ=positions.getZ(i)/TILE,px=x+localX,pz=z+localZ;
  positions.setY(i,surfaceHeight(px,pz,true));
  weights.push(roadCoverage(cell.links,px,pz,localX,localZ),cell.level*.5,0);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(weights,3));
 geometry.computeVertexNormals();return geometry;
}
function rockCuts(terrainMap,soil,road){
 const positions=[],colors=[],uvs=[],faceTiles=[],edge=.5-.009/TILE;
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
   const firstFace=positions.length/9;
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
    const overhang=(.085+grain*.066+.045*Math.sin(ex*2.8-ez*4.2))*shoulder;
    const tint=crownColor(new T.Color(),soil,road,links,x+localX,z+localZ,localX,localZ);
    const root={point:seam.setY(high),uv:[(x+localX)*ROCK_REPEAT,(z+localZ)*ROCK_REPEAT],shade:1,tint};
    const crestY=high-Math.min(relief*.18,(.12-grain*.055)*shoulder);
    const rows=bands.map((fraction,i)=>{
     const spread=overhang+(ledges[i]+grain*.014*i)*shoulder;
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
   for(let i=firstFace;i<positions.length/9;i++)faceTiles.push(z*battle.size.width+x);
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
 mesh.name='rock-cut-cliffs';mesh.userData.levelRise=RISE;mesh.castShadow=mesh.receiveShadow=true;
 mesh.userData.faceTiles=new Uint16Array(faceTiles);cliffMesh=mesh;board.add(mesh);
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
 add(markings,'road-markings',0xb7a878,.31);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(ticks,3));
 const grid=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xc1c9ba,transparent:true,opacity:.085,depthWrite:false}));grid.name='tactical-grid-corners';board.add(grid);
}
// Low-profile painted markings stay below silhouettes in the tactical camera.
// Raised works sit on existing cover footprints so their collision is legible.
function distressLandmarks(key){
 const plan=root.IRON_VOW_DISTRESS_MAPS?.[key];
 if(!plan)return;
 const pieces=new Map(),marker=0x85e0c7,steel=0x536063,timber=0x8a735e,signal=0xe7a84b;
 const block=(x,z,y,w,h,d,color,roll=0)=>{
  const pos=world(x,z);
  pos.y+=y;
  const q=new T.Quaternion().setFromAxisAngle(V3(0,0,1),roll);
  if(!pieces.has(color))pieces.set(color,[]);
  pieces.get(color).push(new T.Matrix4().compose(pos,q,V3(w,h,d)));
 };
 for(const [x,z] of plan.goal){
  // Corner brackets mark each individual cell that can receive a survivor.
  for(const dx of [-1,1])for(const dz of [-1,1]){
   block(x+dx*.32,z+dz*.41,.12,1.45,.12,.22,marker);
   block(x+dx*.41,z+dz*.32,.12,.22,.12,1.45,marker);
  }
 }
 if(key==='crossing'){
  for(let z=8;z<=14;z++){
   for(const x of [7.79,8.21])block(x,z,.09,.15,.14,TILE,steel);
   for(const offset of [-.35,0,.35])block(8,z+offset,.055,4.5,.09,.36,timber);
  }
  // Abutments and guard posts mark the edges of the viaduct.
  for(const x of [7.52,9.48])for(let z=10;z<=12;z++){
   block(x,z,.55,.19,.26,TILE,steel);
   block(x,z,.37,.32,.74,.32,signal);
  }
 }else if(key==='lift'){
  for(const x of [7,10]){
   if(!battle.cover.has(x+',12'))continue;
   for(const dz of [-.23,.23]){
    block(x,12+dz,3.3,.55,6.6,.55,signal);
    block(x,12+dz,5.5,.59,.6,.59,steel);
   }
   block(x,12,6.6,1.6,.48,4.1,steel);
  }
  // Overhead bridge crane across the bay. Slender steel leaves sightlines
  // open and its two supports occupy the transformer cells.
  block(8.5,12,7.1,TILE*3+.9,.65,1.5,signal);
  block(8.7,12,6.62,2.4,.5,1.9,steel);
  for(const x of [8,9])for(const z of [12,13]){
   block(x,z,.05,3.2,.08,.26,steel);
  }
 }else{
  for(const [x,z] of [[5,13],[12,9]]){
   if(!battle.cover.has(x+','+z))continue;
   block(x,z,3.55,4.6,.48,2.9,steel);
   for(const dx of [-.24,.24])block(x+dx,z,4.1,.28,1.1,2.8,signal);
   block(x,z,4.55,3.8,.4,2.4,timber);
  }
  for(const [x,z] of [[4,8],[6,13],[13,7],[6,17]]){
   for(const offset of [-.22,.22])block(x+offset,z,.1,.22,.12,2.1,signal);
  }
 }
 const group=new T.Group(),geo=new T.BoxGeometry(1,1,1);
 group.name='distress-'+key+'-infrastructure';
 for(const [color,matrices] of pieces){
  const mat=new T.MeshStandardMaterial({color:kit.C(color),metalness:.26,roughness:.75});
  if(color===marker){mat.emissive=kit.C(color);mat.emissiveIntensity=.35;}
  const mesh=new T.InstancedMesh(geo,mat,matrices.length);
  matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
  mesh.frustumCulled=false;mesh.receiveShadow=true;group.add(mesh);
 }
 board.add(group);
}
function build(){
 root.IronVowFoundry.retainPreview();
 clear();init();battleRef=battle;terrainRef=battle.field.cells;kit=root.IronVowSceneKit(renderer);kit.setSize(battle.size.width,battle.size.depth,TILE);
 root.IronVowVehicles.load(battle.units.map(u=>u.kind).filter(Boolean));
 rigV2.load(battle.units);
 const index=battle.contract.field,P=kit.PAL[index];
 scene=new T.Scene();scene.background=kit.C(P.bg);scene.fog=new T.Fog(kit.C(P.fog[0]),P.fog[1],P.fog[2]);scene.environment=kit.envFrom(P.env);
 scene.add(new T.HemisphereLight(kit.C(P.hemi[0]),kit.C(P.hemi[1]),P.hemi[2]));
 sun=new T.DirectionalLight(kit.C(P.sun[0]),P.sun[1]);sun.name='theater-sun';sun.castShadow=true;
 const half=Math.max(battle.size.width,battle.size.depth)*TILE*.65;
 // Keep the low sun outside the map so its shadow camera covers both ends.
 const lightDistance=half*1.55;
 sun.position.set(...P.dir).setLength(lightDistance);
 Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:1,far:lightDistance+half*1.45});
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00017;sun.shadow.normalBias=.025;scene.add(sun);
 const rim=new T.DirectionalLight(kit.C(0x9ab8d0),.6);rim.position.set(30,18,-30);scene.add(rim);
 // FM3 battle scenes sit against open sky. From the duel's low angles the board's dark void would fill the top half, so a
 // theater-tinted sky dome shows only while the duel camera plays (the tactical view is unchanged); fog meets its horizon.
 {const SKY=[[0x9fb4c2,0x3e5a70],[0xc9a27a,0x5b4436],[0x8fb2b3,0x2f4f5c]][index],geo=new T.SphereGeometry(420,32,16),pos=geo.attributes.position,col=[];
  const low=new T.Color(SKY[0]),high=new T.Color(SKY[1]),c=new T.Color();
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/420;c.copy(low).lerp(high,Math.min(1,Math.max(0,y)*1.6));col.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new T.Float32BufferAttribute(col,3));
  duelSky=new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));
  duelSky.userData={horizon:low.clone(),fog:scene.fog.color.clone()};duelSky.visible=false;duelSky.renderOrder=-10;scene.add(duelSky);}
 board=new T.Group();scene.add(board);units=new T.Group();scene.add(units);
 const terrainMap=kit.imgTex('assets/terrain/karst-soil.webp',[1,1],'assets/rock-cut.webp');
 const rockMap=kit.imgTex('assets/rock-cut.webp',[1,1]);
 const soil=kit.C(0xb4b09f),road=kit.C(P.road);
 const material=kit.fieldSurface(new T.MeshStandardMaterial({map:terrainMap,vertexColors:true,roughness:1}),rockMap,index);
 const floorGeo=new T.PlaneGeometry(420,420);
 floorGeo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(12),3));
 const floor=new T.Mesh(floorGeo,material);floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;board.add(floor);
 const overlayPositions=[],overlayColors=[],tileIndices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const cell=cellAt(x,z),geometry=plate(x,z,cell),p=world(x,z,0),mesh=new T.Mesh(geometry,material);mesh.position.copy(p);mesh.receiveShadow=true;mesh.userData.tile={x,z};board.add(mesh);groundMeshes.push(mesh);
  const positions=geometry.attributes.position,offset=overlayPositions.length/3;
  for(let i=0;i<positions.count;i++){overlayPositions.push(positions.getX(i)+p.x,positions.getY(i)+.025,positions.getZ(i)+p.z);overlayColors.push(1,1,1);}
  tileIndices.push(Array.from(geometry.index.array,v=>v+offset));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(overlayPositions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(overlayColors,3));geometry.setIndex([]);
 overlays=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.20,depthWrite:false,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1}));overlays.userData.indices=tileIndices;overlays.renderOrder=2;scene.add(overlays);
 rockCuts(rockMap,soil,road);terrainDetails();
 if(battle.contract.distress)distressLandmarks(battle.contract.distress);
 const edgeMaterial=kit.MAT.hazard;
 for(const [x,z,w,d] of [[0,-battle.size.depth*TILE/2,battle.size.width*TILE,.3],[0,battle.size.depth*TILE/2,battle.size.width*TILE,.3],[-battle.size.width*TILE/2,0,.3,battle.size.depth*TILE],[battle.size.width*TILE/2,0,.3,battle.size.depth*TILE]]){
  const mesh=new T.Mesh(new T.BoxGeometry(w,.16,d),edgeMaterial);mesh.position.set(x,-.08,z);mesh.receiveShadow=true;board.add(mesh);
 }
 for(const key of battle.cover){const [x,z]=key.split(',').map(Number),cover=kit.buildCover(key,battle.field.cover[key],rockMap);cover.position.y=surfaceHeight(x,z);cover.userData.tile={x,z};board.add(cover);cover.userData.bounds=new T.Box3().setFromObject(cover);coverMeshes.push(cover);}
 kit.buildProps(board,index);kit.buildLandscape(board,index,rockMap);
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
  meleeTip:entry.secondary?.tip,mortarMuzzle:m.mortar?.muzzle??m.nativeV2?.anchors?.mortarMuzzle,shield:entry.shield?.face})[part];
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
// The duel camera's preferred side: toward the open board, so it does not end up off the field.
function cameraSide(actor,direction){
 const centre=world((battle.size.width-1)/2,(battle.size.depth-1)/2).sub(actor);
 return V3(direction.z,0,-direction.x).dot(centre)>=0?1:-1;
}
// Duel camera sightlines. Everything on the board can hide a mech from the low duel lens: cover, props, the landscape, and
// since the v121 terrain (2.8 m terraces) the ground plates and rock-cut cliffs too, so none of them is skipped. Lines and
// see-through overlays never block. The last 1.2 m before the subject point is ignored (its own armour and footing).
const duelRay=new T.Raycaster();
// A view must see the hull from waist to head: one sample can pass under a rock overhang while the body above it is hidden, and
// a ray aimed exactly where a check looks can graze a lip, so the samples run from below mid-body up to the head.
const SIGHT_HEIGHTS=[.35,.5,.65,.85];
function visibleChain(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
function sightBlocked(from,to){
 const toward=to.clone().sub(from),length=toward.length();
 duelRay.set(from,toward.normalize());duelRay.far=Math.max(0,length-1.2);
 return duelRay.intersectObjects(board.children,true).some(h=>!h.object.isLine&&!h.object.isPoints&&
  !(h.object.material?.transparent&&(h.object.material.opacity??1)<.5)&&visibleChain(h.object));
}
// Lowest safe lens height at a point: above the rendered ground (rock overhangs included) everywhere within the near-plane's
// reach, so the lens never sits inside a terrace or skims a cliff lip.
function lensFloor(at){
 let top=groundAt(at.x,at.z);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;top=Math.max(top,groundAt(at.x+Math.cos(a)*1.8,at.z+Math.sin(a)*1.8));}
 return top+1.1;
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
 let duelSubjects,setup,roll=0;
 if(shot&&!reducedMotion){
  /* FM3 duel grammar (owner, 2026-11-22): every beat frames ONE mech, big and from below; no over-the-shoulder foreground,
     no wide two-shot. Brace (aim) and release frame the attacker; a flight shot runs down the lane only when the round is in
     the air long enough to read; the hit shot frames the defender. Screen direction follows FM3's HUD: the ally sits on the
     left facing right, the enemy on the right facing left, through return fire too. */
  const actor=unitRoot(shot.actor),victim=partPoint(shot.target,'body'),direction=victim.clone().sub(actor).setY(0);
  const span=Math.max(TILE*.8,direction.length());direction.normalize();
  const halfV=fov*Math.PI/360,halfH=Math.atan(Math.tan(halfV)*camera.aspect);
  const contacts=shot.contacts||[],firstHit=contacts[0]?.at??0,lastHit=contacts.at(-1)?.at??firstHit,since=shot.fireAt==null?0:t-shot.fireAt;
  const flight=firstHit>=.4&&!shot.w?.melee;
  let key='brace';
  if(shot.phase==='fire'){
   if(flight)key=since<.3?'release':since<firstHit-.1?'flight':'hit';
   // a burst: hold the shooter for the first part of it, then cut to the target for the rest of the impacts
   else key=since<Math.min(Math.max(.35,lastHit*.45),Math.max(.12,lastHit-.25))?'release':'hit';
  }else if(shot.phase==='result')key='hit';
  const rot=(v,a)=>V3(v.x*Math.cos(a)+v.z*Math.sin(a),0,-v.x*Math.sin(a)+v.z*Math.cos(a));
  const up=V3(0,1,0);
  // One mech fills a little over half the frame height (the strip below takes the rest), three-quarter front, lens at a third of its height looking up at it.
  const single=(unit,facing,angle,lift,push)=>{
   const record=models.get(unit.id),h=record?.height??6,base=unitRoot(unit);
   const center=record?.vehicle?record.vehicle.body.getWorldPosition(V3()):base.clone().add(V3(0,h*.5,0));
   const dist=h/(1.0*Math.tan(halfV))*push,want=unit.team==='ally'?1:-1;
   for(const s of [1,-1]){
    const at=center.clone().addScaledVector(rot(facing,s*angle),dist);at.y=Math.max(center.y-h*.16+lift,lensFloor(at)+lift*.5);
    // lead room: the subject sits a little behind centre, space ahead of where it faces
    const look=center.clone().addScaledVector(facing,dist*Math.tan(halfH)*.22);
    const right=look.clone().sub(at).normalize().cross(up);
    if(Math.sign(right.dot(facing))===want)return {look,at,subjects:SIGHT_HEIGHTS.map(f=>center.clone().add(V3(0,h*(f-.5),0))),side:s};
   }
  };
  const pose=(beat,lift,wide,pull=1)=>{
   const angle=(beat==='hit'?.62:.7)+wide*.35;
   if(beat==='hit')return single(shot.target,direction.clone().negate(),angle,lift,pull);
   const brace=single(shot.actor,direction,angle,lift,(beat==='release'?.94:1)*pull);
   if(beat!=='flight')return brace;
   // beside the lane, almost halfway along: the defender ahead at a readable size (a quarter of the frame or more, even on a
   // 7-tile shot) as the rounds arc in, the launcher toward the frame edge
   const record=models.get(shot.actor.id),h=record?.height??6,want=shot.actor.team==='ally'?1:-1;
   // whatever the viewport's lens, never sit farther from the defender than keeps it at ~30% of the frame height
   const th=models.get(shot.target.id)?.height??6,reach=th/(2*.3*Math.tan(halfV));
   for(const s of [1,-1]){
    const at=actor.clone().addScaledVector(direction,span*.45*pull).addScaledVector(V3(direction.z,0,-direction.x),s*(span*.26+6)*(1+.4*wide));at.y=actor.y+h*.9+lift;
    const gap=V3(victim.x-at.x,0,victim.z-at.z),far=gap.length();
    if(far>reach)at.addScaledVector(gap,(far-reach)/far);
    at.y=Math.max(at.y,lensFloor(at)+lift*.5);
    // lean the lens toward the launcher only as far as keeps the defender well inside a narrow (portrait) frame
    const toVictim=V3(victim.x-at.x,0,victim.z-at.z).normalize();let look;
    for(let k=.2;k>=0;k-=.02){look=victim.clone().lerp(actor,Math.max(0,k));const d=V3(look.x-at.x,0,look.z-at.z).normalize();if(Math.acos(Math.min(1,d.dot(toVictim)))<=halfH*.45)break;}
    look.y=actor.y+h*.5;
    if(Math.sign(look.clone().sub(at).normalize().cross(up).dot(direction))===want)return {look,at,subjects:[victim,...SIGHT_HEIGHTS.map(f=>V3(victim.x,unitRoot(shot.target).y+th*f,victim.z))]};
   }
  };
  shot.cameraBeat=key;   // read by qa/browser/combat-duel.cjs
  const plans=shot.cameraPlans??={},pair=shot.actor.id+'>'+shot.target.id;setup=pair+':'+key;
  // occlusion, computed once per beat: keep the side (screen direction holds) and try, in order of how little the shot changes,
  // a raised lens, a wider swing, a closer lens (in front of a ledge), then a high crane. The first view that sees the subject's
  // body and head wins; failing that, the view that sees most of it, preferring the earlier (gentler) one.
  plans[setup]??=(()=>{
   const options=[[0,0,1],[3,0,1],[0,1,1],[6,0,1],[3,1,1],[0,2,1],[0,0,.72],[6,1,1],[3,0,.72],[10,0,1],[3,2,1],[10,1,1],[6,2,1],[10,2,1],[16,1,.85],[24,1,.8]];
   let best=null;
   for(const [lift,wide,pull] of options){
    const c=pose(key,lift,wide,pull),seen=c.subjects.filter(p=>!sightBlocked(c.at,p)).length;
    if(seen===c.subjects.length)return {lift,wide,pull,clear:true};
    if(!best||seen>best.seen)best={lift,wide,pull,seen};
   }
   return {...best,clear:false};
  })();
  shot.cameraClear=plans[setup].clear;   // read by QA
  const chosen=pose(key,plans[setup].lift,plans[setup].wide,plans[setup].pull);
  target.copy(chosen.look);position.copy(chosen.at);duelSubjects=chosen.subjects;
  // release: a 5 degree Dutch tilt toward the line of fire, as FM3's firing shots lean
  if(key==='release')roll=(shot.actor.team==='ally'?-1:1)*5*Math.PI/180;
 }
 // Cut on the action cue. Damping only applies within a shot or on the tactical board.
 const sequence=setup?shot:null,cut=duelSequence!==sequence||duelSetup!==setup;
 duelSequence=sequence;duelSetup=setup;
 const blend=cameraReady&&!cut?1-Math.exp(-dt*6):1;
 cameraTarget.lerp(target,blend);cameraPosition.lerp(position,blend);camera.position.copy(cameraPosition);
 if(!reducedMotion&&shake>.15)camera.position.add(V3(Math.sin(t*110),Math.cos(t*93)*.5,0).multiplyScalar(Math.min(1.4,shake*.03)));
 camera.lookAt(cameraTarget);if(roll)camera.rotateZ(roll);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);cameraReady=true;
 const duelDistance=duelSubjects?Math.max(...duelSubjects.map(point=>camera.position.distanceTo(point)))+8:0;
 scene.fog.near=Math.max(distance*.9,duelDistance);
 scene.fog.far=duelSubjects?Math.max(distance*2.6,duelDistance+20):distance*2.6;
}
function prepareUnit(u,t){
 let record=models.get(u.id),object;
 if(u.kind){
  if(root.IronVowVehicles.status(u.kind)===undefined)root.IronVowVehicles.load([u.kind]);
  if(root.IronVowVehicles.status(u.kind)!=='ready')return;
  if(!record){
   record={vehicle:root.IronVowVehicles.create(u.kind)};models.set(u.id,record);
  }
  const attackGoal=u.attack&&aimTargets.get(u.id);
  const target=attackGoal?partPoint(attackGoal.target,attackGoal.part):null;
  const {recoil,impact}=animationPose(u,hitstopTime(u,t));
  root.IronVowVehicles.update(record.vehicle,u,t,world(u.vx,u.vz),displayedHeading(u),reducedMotion,
   RISE/TERRAIN_RISE,{target,recoil,impact});
  object=record.vehicle.object;
 }else{
  if(rigV2.applies(u)&&rigV2.status(u)===undefined)void rigV2.load([u]);
  const pose=animationPose(u,hitstopTime(u,t)),p=unitRoot(u),airborne=Boolean(u.motion?.jumpjet&&!reducedMotion);
  if(airborne)p.y+=jumpjetHeight(u,t);
  const mortar=mortarCues.get(u.id);if(mortar){pose.mortarAge=t-mortar.at;if(pose.mortarAge>=2.1)mortarCues.delete(u.id);}
  const ability=nativeCues.get(u.id);
  if(ability){if(t-ability.at<ability.duration&&u.alive)pose.nativeAbility=ability;else nativeCues.delete(u.id);}
  const motion=u.motion,heading=motion?Math.atan2(motion.toX-motion.fromX,motion.toZ-motion.fromZ):(displayedHeading(u)+Math.PI/4);
  const defending=u.alive&&!u.attack&&!motion&&!reducedMotion&&activeCinematic?.target===u;
  const guardPoint=defending?unitRoot(activeCinematic.actor):null;
  const saltWorks=u.frame===SALTJACK_FRAME||u.frame===SALT_WORKS_GARRISON_FRAME;
  const selectedContact=saltWorks&&u.alive&&!u.attack&&!motion&&action==='fire'&&u===current()&&
   battle.units.find(target=>target.alive&&target.team!==u.team&&target.id===lockedTarget);
  const readyContact=selectedContact||(saltWorks&&defending&&activeCinematic.actor.alive?activeCinematic.actor:null);
  const attackGoal=!saltWorks||u.attack?aimTargets.get(u.id):null;
  const goal=readyContact?{target:readyContact,part:'body'}:attackGoal;
  const acquiredShot=saltWorks&&u.attack&&!pose.strikeKind&&u===current()&&attackGoal?.target.alive&&attackGoal.target.id===lockedTarget;
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
  const face=!u.alive?(u.deathYaw??heading):guardPoint?Math.atan2(guardPoint.x-p.x,guardPoint.z-p.z):goal&&!u.lionTrial?Math.atan2(aim.x-p.x,aim.z-p.z):heading;
  pose.heading=heading;pose.reducedMotion=reducedMotion;pose.world={...p,targetRoot,airborne,targeting:Boolean(readyContact||acquiredShot),lungeLimit:reducedMotion?0:lungeLimit,onStep:(...args)=>combat?.step(u,...args),face,heading,aim,groundAt,speed};
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
 const reach=selectedUnit&&ready&&action==='move'?movementPlans(selectedUnit):null,jump=selectedUnit&&ready&&action==='jumpjet';
 const w=selectedUnit&&ready&&action!=='move'&&action!=='tactical'&&!jump?selectedWeapon(selectedUnit):null;
 const plan=ready?currentTacticalPlan():null;
 const footprint=plan&&new Set(plan.tiles.map(tile=>tile.x+','+tile.z));
 const danger=plan&&new Set(plan.friendly.map(actor=>actor.x+','+actor.z));
 const colors=overlays.geometry.attributes.color,indices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const key=x+','+z,index=z*battle.size.width+x;let color;
  const move=reach?.get(key);
  if(move?.tiles)color=move.elevationAP?0xcc9b49:0x77b4c5;
  if(jump&&jumpjetLanding(selectedUnit,x,z))color=0x619fcb;
  if(w&&!battle.cover.has(key)&&distance(selectedUnit,{x,z})>0&&distance(selectedUnit,{x,z})<=weaponRange(w,selectedUnit.training)&&!attackObstruction(selectedUnit,{x,z},w))color=0xc48469;
  if(ready&&hover?.x===x&&hover?.z===z)color=0xe7be6e;
  if(footprint?.has(key))color=danger.has(key)?0xff665b:0xefb557;
  if(color!==undefined){const c=kit.C(color);for(const i of new Set(overlays.userData.indices[index]))colors.setXYZ(i,c.r,c.g,c.b);indices.push(...overlays.userData.indices[index]);}
 }
 colors.needsUpdate=true;overlays.geometry.setIndex(indices);overlays.material.opacity=plan?.32:.20;
 for(const [ring,u] of [[selection,selectedUnit],[targetRing,battle.units.find(u=>u.alive&&u.id===lockedTarget)]]){ring.visible=Boolean(u);if(u)ring.position.copy(unitRoot(u)).add(V3(0,.04,0));}
 const spot=moveTap??hover,move=spot&&reach?.get(spot.x+','+spot.z);
 const path=move?.tiles?route(selectedUnit,spot.x,spot.z,move):[];
 let previous=selectedUnit;
 pathGroup.children.forEach((mesh,i)=>{const tile=path[i];mesh.visible=Boolean(tile);if(!tile)return;
  mesh.position.copy(world(tile.x,tile.z)).add(V3(0,.05,0));mesh.rotation.y=-Math.atan2(tile.z-previous.z,tile.x-previous.x);
  mesh.material.color.setHex(elevationCost(selectedUnit,previous.x,previous.z,tile.x,tile.z)?0xcc9b49:0xbfe4ee);previous=tile;
 });
}
function render(t,dt){
 init();if(!battle){root.IronVowRenderer.show(false);if(battleRef)clear();return;}
 if(root.IronVowRenderer.lost)return;
 if(battleRef!==battle||terrainRef!==battle.field.cells||!scene)build();
 for(const u of battle.units)prepareUnit(u,t);
 // While the duel camera plays, only the two combatants are drawn; everything else returns when it closes.
 const duel=!reducedMotion&&activeCinematic?[activeCinematic.actor,activeCinematic.target]:null;
 for(const u of battle.units){
  const object=models.get(u.id)?.object;if(!object)continue;
  const hide=u.extracted||Boolean(duel&&!duel.includes(u));
  if(hide&&object.visible){object.visible=false;object.userData.duelHidden=true;}
  else if(!hide&&object.userData.duelHidden){object.visible=true;object.userData.duelHidden=false;}
 }
 for(const u of battle.units){const cue=mortarCues.get(u.id);if(cue&&!cue.fired&&t-cue.at>=.95){cue.fired=true;const p=attachmentPoint(u,'mortarMuzzle');combat.fx.glow(p,0xffb050,3,.15);combat.fx.smoke(p,4,1.4,0xc4bdb0,.5,.8,1.4,.3);}}
 combat.update(t,dt);updateCamera(t,dt);updateOverlays();
 if(duel){selection.visible=false;targetRing.visible=false;}
 if(duelSky){duelSky.visible=Boolean(duel);duelSky.position.copy(camera.position);scene.fog.color.copy(duel?duelSky.userData.horizon:duelSky.userData.fog);}
 const storm=battle.contract.field===2;
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
 if(!scene||battleRef!==battle)build();
 const pickRay=ray(x,y),hit=pickRay.intersectObjects(groundMeshes,false)[0],wall=pickRay.intersectObject(cliffMesh,false)[0];
 const obstacle=pickRay.intersectObjects(coverMeshes,true)[0];
 if(obstacle&&obstacle.distance<Math.min(hit?.distance??Infinity,wall?.distance??Infinity)){
  let o=obstacle.object;while(o&&!o.userData?.blocking)o=o.parent;if(o?.userData.tile)return {...o.userData.tile};
 }
 if(wall&&wall.distance<(hit?.distance??Infinity)){
  const tile=cliffMesh.userData.faceTiles[wall.faceIndex];return {x:tile%battle.size.width,z:Math.floor(tile/battle.size.width)};
 }
 return hit?{...hit.object.userData.tile}:{x:-1,z:-1};
}
function pick(x,y){
 if(!scene||battleRef!==battle)build();
 const proxies=battle.units.filter(u=>u.alive).map(u=>models.get(u.id)?.proxy).filter(Boolean);
 const hit=ray(x,y).intersectObjects(proxies,false)[0];
 return hit?battle.units.find(u=>u.id===hit.object.userData.unitId):null;
}
function pan(dx,dy){
 if(!scene)return;const a=ray(innerWidth/2,innerHeight/2).ray.intersectPlane(plane,V3()),b=ray(innerWidth/2+dx,innerHeight/2+dy).ray.intersectPlane(plane,V3());
 if(!a||!b)return;fieldCamera.x=Math.max(-.5,Math.min(battle.size.width-.5,fieldCamera.x+(a.x-b.x)/TILE));fieldCamera.z=Math.max(-.5,Math.min(battle.size.depth-.5,fieldCamera.z+(a.z-b.z)/TILE));
}
const overviewZoom=.47*3.4/TILE;
root.IronVowScene={mechYaw:u=>models.get(u.id)?.entry?.m.yaw,isLive,render,project,projectWorld,screenTile,pick,pan,partPoint,attachmentPoint,labelPoint,groundAt,world,clear,overviewZoom,
 get terrainMetrics(){return {tilePitch:TILE,levelRise:RISE,gridStyle:'corner-ticks',surface:'rock-cut-bluffs-with-graded-access'};},
 get covers(){return coverMeshes.map(m=>({min:m.userData.bounds.min.toArray(),max:m.userData.bounds.max.toArray()}));},
 overlayInfo(){return {triangles:overlays.geometry.index.count/3,path:pathGroup.children.filter(m=>m.visible).map(m=>({position:m.position.toArray(),color:m.material.color.getHex()})),selected:selection.visible,target:targetRing.visible};},
 aimAt(actor,victim,part){aimTargets.set(actor.id,{target:victim,part});},
 mortarPresentation(unit,at=clock){if(models.get(unit.id)?.entry?.m?.mortar)mortarCues.set(unit.id,{at,fired:false});},
 nativeAbility(unit,name,at=clock,target){
  const duration=name==='giza-salvo'?3.12:name==='vyzov-cross'?1.4:0;
  if(!duration)return false;
  nativeCues.set(unit.id,{name,at,duration});
  if(name==='giza-salvo'&&target?.hp)aimTargets.set(unit.id,{target,part:'body'});
  return true;
 },
 crossMortar(unit,tiles,flight){return combat?.crossMortar(unit,tiles,flight)??false;},
 get combat(){return combat;},get camera(){return camera;},get scene(){return scene;},get models(){return models;},
 get loadFailed(){return root.IronVowEnvironmentAssets?.status(board)==='error'||Boolean(scene&&battleRef===battle&&battle?.units.some(u=>(
  u.kind?root.IronVowVehicles.status(u.kind):rigV2.status(u)
 )==='error'));},
 get ready(){return Boolean(scene&&!root.IronVowRenderer.lost&&root.IronVowEnvironmentAssets?.status(board)!=='loading'&&battleRef===battle&&battle?.units.every(u=>(
  u.kind?models.get(u.id)?.vehicle:models.get(u.id)?.entry.armed
 )));}
};
})(window);
