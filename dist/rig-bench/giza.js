(async () => {
 const canvas = document.querySelector('canvas');
 const viewport = canvas.parentElement;
 const controls = document.querySelector('footer');
 const viewLabel = document.querySelector('label');
 const viewSelect = document.querySelector('#view');
 const status = document.querySelector('#status');
 const T = THREE;
 const vector = (x, y, z) => new T.Vector3(x, y, z);
 const scene = new T.Scene();
 scene.background = new T.Color(0x99a6aa);
 scene.fog = new T.FogExp2(0x99a6aa, .016);
 const renderer = new T.WebGLRenderer({canvas, antialias:true});
 renderer.setPixelRatio(Math.min(2, devicePixelRatio));
 renderer.outputEncoding = T.sRGBEncoding;
 renderer.toneMapping = T.ACESFilmicToneMapping;
 renderer.toneMappingExposure = .91;
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = T.PCFSoftShadowMap;
 const camera = new T.OrthographicCamera();
 scene.add(new T.HemisphereLight(0xe5f1ff, 0x766e62, .78));

 function addLight(position, color, intensity, castsShadow = false) {
  const light = new T.DirectionalLight(color, intensity);
  light.position.set(...position);
  light.castShadow = castsShadow;
  if (castsShadow) {
   light.shadow.mapSize.set(2048, 2048);
   Object.assign(light.shadow.camera, {left:-10, right:10, top:10, bottom:-10});
   light.shadow.normalBias = .008;
   light.shadow.bias = -.00015;
  }
  scene.add(light);
 }

 addLight([-5, 9, 5], 0xffedcd, 2, true);
 addLight([4, 5, -5], 0xc4e1ff, 1.8);
 addLight([3, 4, 6], 0xd6e8ff, .29);
 const studio = new T.Scene();
 studio.background = new T.Color(0x687074);
 const panel = new T.PlaneGeometry(5, 5);
 const panelMaterial = new T.MeshBasicMaterial({color:0xffffff, side:T.DoubleSide});
 for (const position of [[-3, 5, 4], [4, 4, -1]]) {
  const reflector = new T.Mesh(panel, panelMaterial);
  reflector.position.set(...position);
  reflector.lookAt(0, 2, 0);
  studio.add(reflector);
 }
 const pmrem = new T.PMREMGenerator(renderer);
 scene.environment = pmrem.fromScene(studio, .04).texture;
 pmrem.dispose();
 panel.dispose();
 panelMaterial.dispose();

 const floor = new T.Mesh(
  new T.PlaneGeometry(500, 500),
  new T.MeshStandardMaterial({color:0x435158, roughness:.89})
 );
 floor.rotation.x = -Math.PI / 2;
 floor.receiveShadow = true;
 scene.add(floor);
 const grid = new T.GridHelper(80, 80, 0x506168, 0x506168);
 grid.position.y = .005;
 grid.material.opacity = .30;
 grid.material.transparent = true;
 scene.add(grid);

 const asset = await new T.GLTFLoader().loadAsync('giza.glb');
 const model = asset.scene;
 scene.add(model);
 model.traverse(object => {
  if (object.isMesh) object.castShadow = object.receiveShadow = true;
 });
 const chassis = model.getObjectByName('Chassis');
 const pelvis = model.getObjectByName('Pelvis');
 const hip = vector(0, 0, 0);
 const mixer = new T.AnimationMixer(model);
 const clips = new Map(asset.animations.map(clip => [clip.name, clip]));
 const views = {
  quarter:[-.49, .15, 7.2],
  front:[.005, .075, 7.25],
  side:[-Math.PI / 2, .07, 7.2],
  rear:[2.7, .14, 7.2],
  board:[.73, .62, 11.2]
 };
 let azimuth, elevation, span, mode, action, drag;
 let time = 0;
 let previousTime = performance.now();
 let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
 let width = 0;
 let height = 0;
 const motionButtons = new Map();

 function setView(key) {
  [azimuth, elevation, span] = views[key];
 }

 function play(key) {
  action?.stop();
  mode = key;
  time = 0;
  action = mixer.clipAction(clips.get(key));
  action.reset();
  action.setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  for (const [name, button] of motionButtons) {
   button.setAttribute('aria-pressed', String(name === key));
  }
 }

 for (const name of clips.keys()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = name;
  button.onclick = () => {
   paused = false;
   play(name);
  };
  motionButtons.set(name, button);
  controls.insertBefore(button, viewLabel);
 }
 setView(viewSelect.value);
 viewSelect.onchange = () => setView(viewSelect.value);
 play('Ready');

 canvas.onpointerdown = event => {
  drag = [event.clientX, event.clientY];
  canvas.setPointerCapture(event.pointerId);
 };
 canvas.onlostpointercapture = () => { drag = null; };
 canvas.onpointermove = event => {
  if (!drag) return;
  azimuth -= (event.clientX - drag[0]) * .008;
  elevation = Math.max(-.04, Math.min(1.28, elevation + (event.clientY - drag[1]) * .006));
  drag = [event.clientX, event.clientY];
 };
 canvas.addEventListener('wheel', event => {
  event.preventDefault();
  span = Math.max(3, Math.min(14, span * Math.exp(event.deltaY * .001)));
 }, {passive:false});

 function render() {
  const nextWidth = viewport.clientWidth;
  const nextHeight = viewport.clientHeight;
  if (!nextWidth || !nextHeight) return;
  if (width !== nextWidth || height !== nextHeight) {
   width = nextWidth;
   height = nextHeight;
   renderer.setSize(width, height, false);
  }
  const aspect = width / height;
  const size = Math.max(span, span * .72 / aspect);
  Object.assign(camera, {
   left:-size * aspect / 2, right:size * aspect / 2, top:size / 2, bottom:-size / 2, near:.1, far:120
  });
  camera.updateProjectionMatrix();
  model.updateMatrixWorld(true);
  const target = vector(0, 2.85, chassis.position.z);
  if (mode === 'Fall') {
   // Follow the pelvis through the drop while leaving both feet in frame.
   const settle = Math.min(1, Math.max(0, (time - .55) / .8));
   const follow = settle * settle * (3 - 2 * settle);
   pelvis.getWorldPosition(hip);
   target.set(hip.x * .55, 2.85 - 1.45 * follow, hip.z);
  }
  const offset = vector(
   Math.sin(azimuth) * Math.cos(elevation),
   Math.sin(elevation),
   Math.cos(azimuth) * Math.cos(elevation)
  );
  camera.position.copy(target).addScaledVector(offset, 17);
  camera.lookAt(target);
  renderer.render(scene, camera);
 }

 function frame(now) {
  if (!paused) time += Math.min(.1, (now - previousTime) / 1000);
  const duration = clips.get(mode).duration;
  if (mode !== 'Fall' && time > duration + .28) time = 0;
  action.paused = true;
  action.time = Math.min(duration, time);
  mixer.update(0);
  render();
  previousTime = now;
  requestAnimationFrame(frame);
 }
 render();
 status.hidden = true;
 requestAnimationFrame(frame);
})().catch(error => {
 document.querySelector('#status').textContent = 'The Giza viewer could not load. Return to Rig Bench or reload to try again.';
 console.error(error);
});
