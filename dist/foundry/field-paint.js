/* Field finishes from the approved paint study (paint.js:5–107).
 * Projection uses bind coordinates so paint follows the armor as the rig moves. */
(function(root){
'use strict';
const finishes=Object.freeze({block:'Block camo',splinter:'Splinter',survey:'Survey grid',factory:'Factory',solid:'Solid colors'});
const frames=['warden','kestrel','basilisk','gatecrasher','cicada','valk','oni','behemoth','aegis','shrike','bastion',
 'hellbreaker','citadel','infantry','elite','gravemaw','reaver','bulwark','ashigaru','aero','shogun','cairn'];
const iron=['#a09283','#897c70','#665e59','#c9b9a6','#716465','#a15c50'];
const olive=['#949984','#80866f','#636d5d','#b9bb9e','#647468','#aaa281'];
const sand=['#b2a38b','#998c78','#777567','#cabea6','#78796b','#986957'];
const blue=['#939ea3','#7b8993','#586a77','#bfcbc8','#586c81','#a88769'];
// Primary plate, disruptive patch, dark patch, light marks, secondary plate, accent.
const palettes={
 warden:['#969883','#787d69','#595f53','#b8baa4','#626958','#908c77'],
 oni:['#797b7b','#626764','#494d4c','#999b8b','#50585a','#aa514e'],
 shrike:['#a8a18a','#888975','#696d61','#c6c3a7','#747769','#ba965e'],
 basilisk:['#87969a','#6f8083','#526468','#a7b5ac','#596e72','#b9a273'],
 valk:['#c7c9be','#acb5ab','#84938e','#e0deca','#456587','#b55e52'],
 cairn:['#899aa2','#707f86','#586962','#aab7b6','#41505a','#a39b76'],
 kestrel:sand,gatecrasher:iron,cicada:olive,behemoth:sand,aegis:olive,bastion:blue,hellbreaker:iron,citadel:blue,
 infantry:olive,elite:blue,gravemaw:olive,reaver:iron,bulwark:olive,ashigaru:olive,aero:olive,shogun:blue,lion:sand
};
const blocks=[
 [[-50,12],[65,12],[65,32],[104,32],[104,67],[54,67],[54,84],[-50,84]],
 [[150,95],[238,95],[238,114],[286,114],[286,165],[215,165],[215,180],[167,180],[167,148],[150,148]],
 [[54,196],[101,196],[101,177],[143,177],[143,221],[107,221],[107,244],[54,244]]
];
const darkBlocks=[
 [[12,35],[48,35],[48,49],[69,49],[69,65],[26,65],[26,57],[12,57]],
 [[178,139],[227,139],[227,156],[209,156],[209,166],[178,166]]
];
const splinters=[
 [[-48,82],[5,37],[64,37],[99,6],[125,6],[89,54],[56,54],[10,97]],
 [[82,169],[133,113],[166,112],[213,73],[247,73],[206,127],[177,128],[136,169]],
 [[-26,242],[21,197],[58,197],[94,161],[123,161],[89,209],[59,210],[30,242]]
];
const darkSplinters=[
 [[3,83],[51,45],[76,45],[47,67],[35,67],[16,83]],
 [[152,148],[183,116],[197,116],[178,140],[165,141],[158,148]]
];
const repeats={block:'.58',splinter:'.49',survey:'.52'};
const textures=new Map();
const programs=new WeakMap();
const valid=finish=>typeof finish==='string'&&Object.hasOwn(finishes,finish);
const hasColor=unit=>Boolean(unit.paint||unit.trim?.s||unit.trim?.a);
const finish=unit=>valid(unit.paintFinish)?unit.paintFinish:hasColor(unit)?'solid':'block';

function mix(left,right,amount){
 const a=parseInt(left.slice(1),16),b=parseInt(right.slice(1),16);
 return '#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-amount)+((b>>shift)&255)*amount).toString(16).padStart(2,'0')).join('');
}
function palette(unit){
 const [base,patch,dark,light,secondary,accent]=palettes[unit.lionTrial?'lion':frames[unit.frame]]||palettes.warden;
 const primary=unit.paint;
 return [primary||base,primary?mix(primary,'#303b3b',.22):patch,primary?mix(primary,'#202726',.44):dark,
  primary?mix(primary,'#eee2c1',.29):light,unit.trim?.s||secondary,unit.trim?.a||accent];
}
function patternTexture(palette,finish,role){
 const T=root.THREE;
 const [base,mid,dark,light,secondary]=palette;
 const primary=role==='p';
 const bg=primary?base:secondary,patch=primary?mid:mix(secondary,base,.34),cut=primary?dark:mix(secondary,'#313b3e',.33);
 const key=[finish,bg,patch,cut,light,base].join('/');
 const shared=textures.get(key);
 if(shared){shared.count++;return shared;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const g=canvas.getContext('2d');g.scale(2,2);
 g.fillStyle=bg;g.fillRect(0,0,256,256);
 function polygon(points,color,dx,dy){
  g.fillStyle=color;g.beginPath();
  for(const [index,[x,y]] of points.entries()){
   if(index===0)g.moveTo(x+dx,y+dy);
   else g.lineTo(x+dx,y+dy);
  }
  g.closePath();g.fill();
 }
 const angled=finish==='splinter',survey=finish==='survey';
 const shapes=angled?splinters:blocks,cutouts=angled?darkSplinters:darkBlocks;
 const patchColor=survey?mix(bg,patch,.62):patch,cutColor=survey?mix(bg,cut,.43):cut;
 for(const dx of [-256,0,256])for(const dy of [-256,0,256]){
  for(const points of shapes)polygon(points,patchColor,dx,dy);
  for(const points of cutouts)polygon(points,cutColor,dx,dy);
 }
 if(survey){
  g.lineWidth=1.6;g.strokeStyle=mix(bg,cut,.73);g.beginPath();
  for(let index=0;index<4;index++){
   g.moveTo(16+48*index,32);g.lineTo(16+48*index,110+(index%2)*32);
   g.moveTo(16,32+index*28);g.lineTo(160-(index%2)*44,32+index*28);
  }
  g.stroke();g.fillStyle=mix(bg,light,.70);
  for(const [x,y] of [[16,32],[112,60],[64,116],[160,88]]){
   g.fillRect(x-4,y-.8,8,1.6);g.fillRect(x-.8,y-4,1.6,8);
  }
 }
 if(finish==='block'){
  g.fillStyle=mix(light,base,.30);g.fillRect(106,184,3.8,18);g.fillRect(112,184,1.4,18);
 }
 // Small scuffs and mottling fade into the mipmaps at the tactical camera distance.
 let seed=6351;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let index=0;index<135;index++){
  const x=random()*256,y=random()*256,radius=6+random()*16;
  const fog=g.createRadialGradient(x,y,0,x,y,radius);
  fog.addColorStop(0,index%2?'rgba(61,53,36,.075)':'rgba(244,226,193,.07)');
  fog.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=fog;g.fillRect(x-radius,y-radius,2*radius,2*radius);
 }
 for(let index=0;index<2700;index++){
  g.fillStyle=index%3?'rgba(25,32,30,.10)':'rgba(243,236,214,.20)';
  g.fillRect(random()*256,random()*256,.4+random()*1.2,.35+random()*.65);
 }
 for(let index=0;index<30;index++){
  g.fillStyle=index%3?'rgba(55,59,55,.25)':'rgba(230,226,204,.50)';
  g.fillRect(random()*256,random()*256,.6+random()*5,.54);
 }
 const texture=new T.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;
 // The shader decodes sRGB after sampling.
 texture.encoding=T.LinearEncoding;
 const pattern={texture,count:1,release(){
  if(--pattern.count===0){texture.dispose();textures.delete(key);}
 }};
 textures.set(key,pattern);return pattern;
}
function channel(material){
 const name=material.name;
 if(name==='basilisk_atlas'||name==='warden_atlas')return 'atlas';
 if(name==='paint_accent')return 'a';
 if(['paint_primary','Stamped olive steel','Warm ceramic'].includes(name))return 'p';
 if(name==='paint_secondary'||/^weapon_armor_/.test(name)||/^armory_(sand_casting|olive|blue_slate|ceramic)$/.test(name))return 's';
 return null;
}
const atlasMask={
 basilisk_atlas:'smoothstep(.035,.09,swatch.b-swatch.r)*smoothstep(.115,.22,swatch.b)*(1.-smoothstep(.39,.49,swatch.b))',
 warden_atlas:'smoothstep(.045,.12,swatch.r-swatch.b)*smoothstep(.06,.13,swatch.g-swatch.b)*(1.-smoothstep(.12,.21,swatch.r-swatch.g))'
};
function coat(original,palette,finish,role){
 const material=original.clone(),atlas=role==='atlas',accent=role==='a';
 material.userData.fieldFinish=finish;
 if(atlas)material.userData.paint=true;
 material.metalness=atlas?original.metalness:(accent ? .28 : .19);
 material.roughness=atlas?original.roughness:.81;
 material.envMapIntensity=.54;
 if(accent){
  material.color.set(palette[5]).convertSRGBToLinear();
  return material;
 }
 const pattern=patternTexture(palette,finish,atlas?'p':role);
 const release=()=>{
  material.removeEventListener('dispose',release);
  pattern.release();
 };
 material.addEventListener('dispose',release);
 material.color.set(0xffffff);
 const declarations='varying vec3 fieldP; varying vec3 fieldN;\n';
 function bind(target,scorchMap,fade=1){
  target.onBeforeCompile=(shader,renderer)=>{
   original.onBeforeCompile.call(target,shader,renderer);
   shader.uniforms.fieldInk={value:pattern.texture};
   shader.vertexShader=declarations+shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nfieldP=position; fieldN=normal;');
   shader.fragmentShader='uniform sampler2D fieldInk; '+declarations+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 fieldAxis=abs(normalize(fieldN));
   vec2 fieldUV=fieldAxis.z>=max(fieldAxis.x,fieldAxis.y)?fieldP.xy:fieldAxis.x>=fieldAxis.y?fieldP.zy:fieldP.xz;
   {
   vec2 pat=fieldUV * ${repeats[finish]} + vec2(.143,.246);
   vec3 ink=texture2D(fieldInk,pat).rgb;
   ink=mix(ink/12.92,pow((ink+.055)/1.055,vec3(2.4)),step(vec3(.04045),ink));
   vec3 underneath=diffuseColor.rgb ${scorchMap?'/ '+fade:''};
   vec3 coating=ink*mix(vec3(.85),vec3(1.06),clamp(underneath,0.,1.));
   ${atlas?`vec3 swatch=pow(max(underneath,vec3(.00001)),vec3(1.0/2.2));
   float coverage=${atlasMask[original.name]};
   diffuseColor.rgb=mix(underneath,coating*(.83+.34*swatch.g),coverage);`:'diffuseColor.rgb=coating;'}
   }`);
   if(scorchMap){
    shader.uniforms.fieldScorch={value:scorchMap};
    // Burn marks sit over the painted finish and markings. The atlas and its
    // color mask still sample the original art before the burn layer is added.
    shader.fragmentShader='uniform sampler2D fieldScorch;\n'+shader.fragmentShader.replace('#include <alphamap_fragment>',`
    float fieldBurn=texture2D(fieldScorch,fieldUV * .71 + vec2(.23,.48)).r;
    diffuseColor.rgb *= ${fade} * mix(vec3(.31,.28,.25),vec3(.98,.95,.89),clamp(fieldBurn * 1.8,0.,1.));
    #include <alphamap_fragment>`);
   }
  };
  target.customProgramCacheKey=()=>original.customProgramCacheKey()+'|field-paint|'+finish+'|'+(atlas?original.name:role)+'|'+fade;
 }
 bind(material);
 programs.set(material,bind);
 return material;
}
function scorch(base,damaged,scorchMap,fade){
 const bind=programs.get(base);
 if(!bind)return false;
 bind(damaged,scorchMap,fade);
 return true;
}
function create(unit){
 const selected=finish(unit);
 if(!Object.hasOwn(repeats,selected))return null;
 const colors=palette(unit),covered=new WeakSet();
 return (object,owned)=>{
  if(!object||covered.has(object))return;
  covered.add(object);
  const materials=new Map();
  object.traverse(mesh=>{
   const original=mesh.isMesh&&mesh.material;
   if(!original||original.userData?.fieldFinish)return;
   const role=channel(original);
   if(!role)return;
   if(!materials.has(original)){
    const material=coat(original,colors,selected,role);
    materials.set(original,material);
    owned.push(material);
   }
   mesh.material=materials.get(original);
  });
 };
}
root.IronVowFieldPaint={finishes,valid,finish,create,scorch};
})(window);
