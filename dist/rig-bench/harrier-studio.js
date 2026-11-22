(() => {
  const T=THREE, $=id=>document.getElementById(id);
  const renderer=new T.WebGLRenderer({canvas:$('studio'),antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;
  renderer.physicallyCorrectLights=true;renderer.shadowMap.type=T.VSMShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputEncoding=T.sRGBEncoding;
  const scene=new T.Scene(), gray=new T.Color(0x8a8e94).convertSRGBToLinear();
  scene.background=gray;
  // Broad room reflections separate metallic bearings from the graphite castings.
  const room=new T.Scene();room.background=new T.Color(.31,.32,.34);
  for(const [x,y,z,w,h,intensity] of [[-3,3,2,3,5,2],[3,2,-3,2,4,1.5],[1,4,2,3,1,.9]]) {
    const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity)}));
    card.position.set(x,y,z);card.lookAt(0,1,0);room.add(card);
  }
  const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.08).texture;pmrem.dispose();
  const camera=new T.PerspectiveCamera(26,1,.01,40);
  const controls=new T.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=11;controls.maxPolarAngle=Math.PI*.51;
  function resetCamera() {
    controls.target.set(0,1.15,0);camera.position.set(2.96,1.57,5.86);controls.update();
  }
  resetCamera();
  const {root,joints,materials}=HarrierRig.buildTrueMech();scene.add(root);
  for(const m of Object.values(materials))m.envMapIntensity=.48;
  const animator=new HarrierRig.MechAnimator(joints);
  const {floor:ground}=HarrierRig.lightStudio(scene);
  // Preserve depth occlusion under the cowl while extracting just the optic in HDR.
  const rt=()=>new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,format:T.RGBAFormat});
  const glow=new T.EffectComposer(renderer,rt());glow.renderToScreen=false;
  glow.addPass(new T.RenderPass(scene,camera));
  const bloom=new T.UnrealBloomPass(new T.Vector2(1,1),.45,.3,1.1);glow.addPass(bloom);
  // BloomPass includes its input. Keep only its blurred, additive contribution.
  const composite=new T.EffectComposer(renderer,rt());composite.addPass(new T.RenderPass(scene,camera));
  const output=new T.ShaderPass({uniforms:{tDiffuse:{value:null},halo:{value:null}},
    vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tDiffuse,halo;varying vec2 v;void main(){gl_FragColor=vec4(texture2D(tDiffuse,v).rgb+texture2D(halo,v).rgb,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'});
  composite.addPass(output);
  const black=new T.MeshBasicMaterial({color:0, toneMapped:false}),bg=new T.Color(0);
  const others=[], pieces=[];
  root.traverse(o=>{if(o.isMesh){pieces.push(o);if(o.material!==materials.optic)others.push([o,o.material]);}});
  const poseBase=new Map(),offsets=new Map(),roughness=new Map();
  for(const [k,j] of Object.entries(joints)) {poseBase.set(j,j.rotation.clone());$('joint').add(new Option(j.name,k));}
  for(const [name,mat] of Object.entries(materials)){roughness.set(name,mat.roughness);$('material').add(new Option(mat.name,name));}
  $('joint').value='lElbow';
  function syncSliders(){
    const values=offsets.get($('joint').value)||[0,0,0];
    ['rx','ry','rz'].forEach((id,i)=>$(id).value=values[i]);
    $('roughness').value=materials[$('material').value].roughness;
  }
  $('joint').onchange=$('material').onchange=syncSliders;
  for(const id of ['rx','ry','rz'])$(id).oninput=()=>offsets.set($('joint').value,['rx','ry','rz'].map(id=>Number($(id).value)));
  $('roughness').oninput=()=>{materials[$('material').value].roughness=Number($('roughness').value);};
  let walking=false;
  function mode(value){walking=value;$('walk').setAttribute('aria-pressed',String(value));$('pose').setAttribute('aria-pressed',String(!value));}
  $('pose').onclick=()=>mode(false);$('walk').onclick=()=>mode(true);
  $('reset').onclick=()=>{offsets.clear();mode(false);animator.phase=0;for(const [k,v] of roughness)materials[k].roughness=v;
    $('speed').value=.85;$('strafe').value=0;resetCamera();syncSliders();};
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
    camera.zoom=Math.min(1,innerWidth/innerHeight*1.55);camera.updateProjectionMatrix();
    glow.setSize(innerWidth,innerHeight);composite.setSize(innerWidth,innerHeight);}
  addEventListener('resize',resize);resize();syncSliders();
  const feet=pieces.filter(m=>m.name.includes('toe cap')||m.name.includes('heel spur'));
  const v=new T.Vector3();let last=performance.now();
  function frame(now) {
    const dt=Math.min(.06,(now-last)/1000);last=now;
    for(const [j,e] of poseBase)j.rotation.copy(e);
    animator.update(dt,walking?+$('speed').value:0,walking?+$('strafe').value:0);
    for(const [id,[x,y,z]] of offsets){const r=joints[id].rotation;r.x+=x;r.y+=y;r.z+=z;}
    root.position.y=0;root.updateMatrixWorld(true);
    let sole=Infinity;
    for(const m of feet){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)sole=Math.min(sole,v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).y);}
    root.position.y=-sole;controls.update();
    renderer.toneMapping=T.NoToneMapping;ground.visible=false;scene.background=bg;
    for(const [mesh] of others)mesh.material=black;
    glow.render();for(const [mesh,material] of others)mesh.material=material;
    scene.background=gray;ground.visible=true;
    output.uniforms.halo.value=bloom.renderTargetsHorizontal[0].texture;
    // Keep scene values linear until the final display pass.
    for(const m of Object.values(materials))m.toneMapped=false;
    renderer.toneMapping=T.ACESFilmicToneMapping;composite.render();requestAnimationFrame(frame);
  }
  window.harrierStudio={root,joints,materials,renderer,bloom,controls,camera,animator};requestAnimationFrame(frame);
})();
