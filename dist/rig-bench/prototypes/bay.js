"use strict";

const chassis = {
  gatecrasher: {
    name: "Gatecrasher", serial: "HV-09", role: "Heavy assault",
    summary: "An Arc Cleaver in the left hand and a Vesper pod over the right shoulder round out the twin forearm cannon.",
    weapon: "Morrow AC-2 / Arc Cleaver / Vesper MRL",
    deploy: "The hips settle, the cannon arm rises, and the articulated gripper tightens.",
    fire: "The cannon carriage slides twice while the hips and shoulders absorb the recoil.",
    strike: "The torso coils, drives the cleaver through the target lane, and returns to guard with both feet planted.",
  },
  hellbreaker: {
    name: "Hellbreaker", serial: "HV-09X", role: "Hostile breach",
    summary: "The original assault hull now serves the Frontier hostiles. Recover a wreck to rebuild it in the Workshop.",
    weapon: "Twin recoil cannon",
    deploy: "The hips settle, the cannon arm rises, and the articulated gripper tightens.",
    fire: "The cannon carriage slides twice while the hips and shoulders absorb the recoil.",
  },
  cicada: {
    name: "Cicada", serial: "ML-14", role: "Missile support",
    summary: "A low olive walker with a faceted violet cockpit, splayed feet, and twin twelve-cell launch racks.",
    weapon: "Dual twelve-cell pods",
    deploy: "Both blast shutters swing clear as the launchers elevate and the chassis braces.",
    fire: "The launchers kick left, then right, while the planted legs carry the load.",
  },
};
const descriptions = {
  Idle: "The optics scan while the chassis shifts its weight over planted feet.",
  Walk: "Alternating steps keep each sole level through contact. Watch the knees and side rams.",
};
const byId = (id) => document.getElementById(id);
const chassisButtons = [...document.querySelectorAll("[data-chassis]")];
const clipButtons = [...document.querySelectorAll("[data-clip]")];
const cameraButtons = [...document.querySelectorAll("[data-camera]")];
const canvas = byId("view");
const viewport = canvas.parentElement;
const still = byId("still");
const scrubber = byId("time");
const playButton = byId("play");
const rigButton = byId("rig");
const status = byId("status");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const cameraPresets = { front: 0, threequarter: .50, rear: Math.PI };
const assets = new Map();

let activeChassis = "gatecrasher";
let activeClip = "Idle";
let loadSerial = 0;
let renderer, scene, camera, loader, model, skeleton, mixer, action;
let playing = false;
let showRig = false;
let azimuth = cameraPresets.threequarter;
let elevation = .19;
let distanceScale = 1;
let orbitPointer = null;

function setPlaying(value) {
  playing = value;
  playButton.textContent = value ? "Pause" : "Play";
  playButton.setAttribute("aria-label", value ? "Pause motion" : "Play motion");
}

function setControls(ready) {
  viewport.classList.toggle("live", ready);
  still.hidden = ready;
  canvas.hidden = !ready;
  for (const button of [...clipButtons, ...cameraButtons, playButton, rigButton]) {
    button.disabled = !ready;
  }
  const strike = clipButtons.find((button) => button.dataset.clip === "Strike");
  strike.hidden = activeChassis !== "gatecrasher";
  scrubber.disabled = !ready;
}

function showTrial() {
  const meta = chassis[activeChassis];
  byId("trial").textContent = descriptions[activeClip] || meta[activeClip.toLowerCase()];
  for (const button of clipButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.clip === activeClip));
  }
}

function updateClock() {
  const seconds = action?.time || 0;
  const duration = action?.getClip().duration || 1;
  scrubber.value = String(Math.round(1000 * seconds / duration));
  scrubber.setAttribute("aria-valuetext", seconds.toFixed(2) + " seconds");
  byId("clock").textContent = seconds.toFixed(2) + " s";
}

function setClip(name, autoplay) {
  activeClip = name;
  showTrial();
  if (mixer) {
    mixer.stopAllAction();
    action = mixer.clipAction(assets.get(activeChassis).animations.find((clip) => clip.name === name));
    if (name === "Strike") {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.reset().play();
    mixer.update(0);
  }
  setPlaying(Boolean(action) && autoplay);
  updateClock();
}

function updateCamera() {
  const height = activeChassis === "cicada" ? 5.3 : 6;
  const aspect = camera.aspect;
  const distance = height * (aspect < 1 ? 2.05 / Math.max(.72, aspect) : 1.83) * distanceScale;
  const target = height * .47;
  camera.position.set(
    Math.sin(azimuth) * Math.cos(elevation) * distance,
    target + Math.sin(elevation) * distance,
    Math.cos(azimuth) * Math.cos(elevation) * distance
  );
  camera.lookAt(0, target, 0);
}

function sizeViewport() {
  const { clientWidth: width, clientHeight: height } = viewport;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateCamera();
}

function setupStudio(T) {
  const studio = new T.Scene();
  studio.background = new T.Color(0x42484c);
  const softbox = (width, height, x, y, z, color, brightness) => {
    const light = new T.Mesh(new T.PlaneGeometry(width, height),
      new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(brightness) }));
    light.position.set(x, y, z);
    light.lookAt(0, 2, 0);
    studio.add(light);
  };
  softbox(8, 6, 4, 7, 5, 0xffe2be, 1.9);
  softbox(5, 5, -5, 4, 2, 0xc5e5ff, 1.1);
  softbox(7, 5, 2, 6, -5, 0xffac68, 2.2);
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, .06).texture;
  pmrem.dispose();
  studio.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      obj.material.dispose();
    }
  });
  scene.add(new T.HemisphereLight(0xf4f5ff, 0x414446, .39));
  for (const [color, strength, position] of [
    [0xffe4c5, 1.55, [4, 7, 6]], [0xc5e9ff, .55, [-5, 4, 3]], [0xffb584, 1.4, [3, 5, -5]],
  ]) {
    const light = new T.DirectionalLight(color, strength);
    light.position.set(...position);
    scene.add(light);
  }
  const pad = new T.Mesh(new T.CylinderGeometry(3.5, 3.65, .12, 72),
    new T.MeshStandardMaterial({ color: 0x11191b, metalness: .22, roughness: .83 }));
  pad.position.y = -.065;
  scene.add(pad);
  const grid = new T.GridHelper(35, 35, 0x3d4b51, 0x263135);
  grid.position.y = -.14;
  scene.add(grid);
  const rim = new T.Mesh(new T.RingGeometry(3.29, 3.32, 72), new T.MeshBasicMaterial({ color: 0x9c5b37 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -.003;
  scene.add(rim);
  const shadow = document.createElement("canvas");
  shadow.width = shadow.height = 128;
  const ctx = shadow.getContext("2d");
  const falloff = ctx.createRadialGradient(64, 64, 4, 64, 64, 63);
  falloff.addColorStop(0, "#080a0bd6");
  falloff.addColorStop(.50, "#080a0b8a");
  falloff.addColorStop(1, "#080a0b00");
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, 128, 128);
  const contact = new T.Mesh(new T.PlaneGeometry(6, 4),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadow), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .001;
  scene.add(contact);
}

function createViewer() {
  const T = window.THREE;
  if (!T?.GLTFLoader) return false;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .94;
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x20282c, .045);
    camera = new T.PerspectiveCamera(38, 1, .1, 70);
    loader = new T.GLTFLoader();
    setupStudio(T);
    new ResizeObserver(sizeViewport).observe(viewport);
    const clock = new T.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), .05);
      if (playing && mixer) {
        mixer.update(dt);
        updateClock();
      }
      if (model) renderer.render(scene, camera);
    });
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      setPlaying(false);
      setControls(false);
      status.textContent = "Still preview · 3D context lost";
    });
    canvas.addEventListener("webglcontextrestored", () => selectChassis(activeChassis));
    return true;
  } catch (error) {
    console.warn("Prototype Bay could not initialize 3D.", error);
    renderer?.dispose();
    renderer = undefined;
    return false;
  }
}

async function selectChassis(id) {
  const serial = ++loadSerial;
  const meta = chassis[id];
  const preferredClip = activeClip;
  activeChassis = id;
  setPlaying(false);
  setControls(false);
  byId("geometry").textContent = "—";
  still.src = "./" + id + ".webp";
  still.alt = meta.name + " inspection render";
  for (const key of ["name", "role", "summary", "weapon", "serial"]) byId(key).textContent = meta[key];
  for (const button of chassisButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.chassis === id));
  }
  showTrial();
  if (!renderer) {
    status.textContent = "Still preview · WebGL unavailable";
    return;
  }
  status.textContent = "Loading chassis";
  try {
    let asset = assets.get(id);
    if (!asset) {
      asset = await loader.loadAsync("./" + id + ".glb");
      const clipNames = new Set(asset.animations.map((clip) => clip.name));
      if (!clipButtons.every((button) => (button.dataset.clip === "Strike" && id !== "gatecrasher") || clipNames.has(button.dataset.clip))) {
        throw new Error("Required motion clips are missing");
      }
      assets.set(id, asset);
    }
    if (serial !== loadSerial) return;
    if (skeleton) {
      scene.remove(skeleton);
      skeleton.geometry.dispose();
      skeleton.material.dispose();
    }
    if (model) {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      scene.remove(model);
    }
    model = asset.scene;
    let triangles = 0;
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.isSkinnedMesh) obj.frustumCulled = false;
      const geometry = obj.geometry;
      triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    });
    byId("geometry").textContent = triangles.toLocaleString("en-US") + " triangles";
    scene.add(model);
    skeleton = new THREE.SkeletonHelper(model);
    const colors = skeleton.geometry.attributes.color;
    for (let i = 0; i < colors.count; i++) {
      colors.setXYZ(i, i % 2 ? .18 : .58, .96, i % 2 ? .82 : .93);
    }
    skeleton.material.depthTest = false;
    skeleton.material.transparent = true;
    skeleton.material.opacity = .92;
    skeleton.renderOrder = 10;
    skeleton.visible = showRig;
    scene.add(skeleton);
    mixer = new THREE.AnimationMixer(model);
    mixer.addEventListener("finished", () => setPlaying(false));
    setClip(asset.animations.some((clip) => clip.name === preferredClip) ? preferredClip : "Idle", !reduceMotion.matches);
    setControls(true);
    sizeViewport();
    renderer.render(scene, camera);
    status.textContent = "Live 3D · Rig online";
  } catch (error) {
    if (serial !== loadSerial) return;
    setControls(false);
    status.textContent = "Still preview · Model unavailable";
    console.warn("Prototype Bay could not load " + id, error);
  }
}

for (const button of chassisButtons) {
  button.addEventListener("click", () => selectChassis(button.dataset.chassis));
}
for (const button of clipButtons) {
  button.addEventListener("click", () => setClip(button.dataset.clip, !reduceMotion.matches));
}
for (const button of cameraButtons) {
  button.addEventListener("click", () => {
    azimuth = cameraPresets[button.dataset.camera];
    elevation = .19;
    distanceScale = 1;
    updateCamera();
  });
}
playButton.addEventListener("click", () => {
  if (action?.time >= action?.getClip().duration) action.reset().play();
  setPlaying(!playing);
});
rigButton.addEventListener("click", () => {
  showRig = !showRig;
  skeleton.visible = showRig;
  rigButton.setAttribute("aria-pressed", String(showRig));
});
scrubber.addEventListener("input", () => {
  setPlaying(false);
  action.time = Math.min(action.getClip().duration - .0001,
    action.getClip().duration * Number(scrubber.value) / 1000);
  mixer.update(0);
  updateClock();
});
reduceMotion.addEventListener("change", (event) => {
  if (event.matches) setPlaying(false);
});
canvas.addEventListener("pointerdown", (event) => {
  if (orbitPointer !== null) return;
  orbitPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(orbitPointer.id);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId !== orbitPointer?.id) return;
  azimuth -= (event.clientX - orbitPointer.x) * .009;
  elevation = Math.min(1.2, Math.max(-.12, elevation + (event.clientY - orbitPointer.y) * .008));
  orbitPointer.x = event.clientX;
  orbitPointer.y = event.clientY;
  updateCamera();
});
canvas.addEventListener("lostpointercapture", () => { orbitPointer = null; });
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  distanceScale = Math.min(1.65, Math.max(.67, distanceScale * Math.exp(event.deltaY * .001)));
  updateCamera();
}, { passive: false });

createViewer();
selectChassis(activeChassis);
