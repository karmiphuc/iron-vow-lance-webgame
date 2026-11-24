/* A physical relief chart aboard the Halyard. Uses the sole shared renderer.
 * Viewport/scissor ownership follows scene/workshop.js:114–155, which adapts
 * docs/reference/claude/mercenary-command.html:2078–2110. Terrain is deterministic
 * code-native geometry, including the ground transports.
 */
(function (root) {
  'use strict';
  const T = root.THREE, owner = root.IronVowRenderer;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const linear = hex => new T.Color(hex).convertSRGBToLinear();
  const colors = { steel: 0x20272a, industry: 0x5d6260, frontier: 0xaa8560, amber: 0xe5b66d, cyan: 0x9ec8c3 };
  let host, data, callbacks, stage, events, pinch, routeSignature, worldSignature;
  let zoom = 1, tilt = .80, yaw = -.04, panX = 0, panZ = 0;
  const pointers = new Map();
  const catalogKey = ports => JSON.stringify((ports || []).map(({ id, x, y }) => [id, x, y]));
  const portPosition = port => new T.Vector3((port.x - 50) * .22, 0, (port.y - 50) * .17);
  // One elevation field feeds the relief, port anchors, route clearance and sensor ring.
  const shelf = .13;
  const coastAt = x => 4.15 + Math.sin(x * .40 + .4) * .66 + Math.sin(x * 1.08) * .30 + Math.sin(x * 2.45) * .12;
  const riverAt = z => 1.7 + Math.sin(z * .73) * .74 + Math.sin(z * 1.61) * .23;
  const ridgeAt = x => -1.0 + Math.sin(x * .46) * .78;
  const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
  const ripple = (x, z) => Math.sin(x * 2.7 + z * 1.5) * Math.cos(z * 2.1 - x * .73);
  function terrainNoise(x, z) {
    function cell(i, j) {
      let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263);
      h = Math.imul(h ^ h >>> 13, 1274126177);
      return ((h ^ h >>> 16) >>> 0) / 0xffffffff;
    }
    const i = Math.floor(x), j = Math.floor(z), u = smooth(x - i), v = smooth(z - j);
    const a = cell(i, j) * (1 - u) + cell(i + 1, j) * u;
    const b = cell(i, j + 1) * (1 - u) + cell(i + 1, j + 1) * u;
    return (a * (1 - v) + b * v) * 2 - 1;
  }
  function heightAt(x, z) {
    const coast = coastAt(x) - z;
    const estuary = Math.abs(x - riverAt(z)) - (.12 + Math.max(0, z) * .067);
    const bank = smooth(Math.min(coast, estuary * 1.65) / .50);
    if (!bank) return shelf;
    const range = Math.exp(-Math.pow((z - ridgeAt(x)) / 1.36, 2));
    const folds = .58 + .20 * Math.sin(x * 1.38 + z * 1.8) + .13 * ripple(x, z)
      + .09 * Math.sin(x * 5.1 - z * 3.8);
    const karst = Math.exp(-((x + 7.4) ** 2 / 5.8 + (z - 2.0) ** 2 / 1.8));
    const uplands = .24 + range * (1.16 + folds * 1.47) + karst * (.32 + folds * .67)
      + smooth((x - 4) / 5) * .53 + .07 * ripple(x, z);
    return shelf + bank * uplands;
  }
  function disposeTree(object) {
    const geometries = new Set(), materials = new Set();
    object.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) materials.add(m); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  }
  function buildStage() {
    const renderer = owner.get(), scene = new T.Scene();
    scene.background = new T.Color(0x111c22);
    scene.fog = new T.Fog(0x10191d, 65, 140);
    const camera = new T.PerspectiveCamera(35, 1, .1, 180);
    const materials = {};
    function mat(name, color, metalness = 0) {
      return materials[name] ||= new T.MeshStandardMaterial({ color: linear(color), roughness: .84, metalness });
    }
    const steel = mat('steel', colors.steel, .55), land = mat('land', colors.land), dark = mat('industry', colors.industry, .25);
    const pale = mat('pale', 0xc3bfa5), ochre = mat('ochre', colors.frontier), black = mat('black', 0x111b1d);
    function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
      const o = new T.Mesh(geometry, material); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    }
    function box(parent, w, h, d, material, x, y, z) { return mesh(parent, new T.BoxGeometry(w, h, d), material, x, y, z); }
    function beam(parent, a, b, width, material) {
      const delta = new T.Vector3().subVectors(b, a), o = box(parent, width, delta.length(), width, material, 0, 0, 0);
      o.position.copy(a).add(b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return o;
    }
    scene.add(new T.HemisphereLight(linear(0xdbe4dc), linear(0x182125), .65));
    const light = new T.DirectionalLight(linear(0xffead8), 1.75); light.position.set(-12, 10, -4); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024); Object.assign(light.shadow.camera, { left: -15, right: 15, top: 11, bottom: -11, near: 1, far: 40 });
    light.shadow.normalBias = .036; light.shadow.radius = 3; scene.add(light);
    const rim = new T.DirectionalLight(linear(0x91bcc8), .55); rim.position.set(7, 8, -10); scene.add(rim);
    // Thick chamfered table rim, with an inset water surface rather than a floating diagram.
    const outline = new T.Shape();
    outline.moveTo(-11.6, -6.7); outline.lineTo(11.6, -6.7); outline.lineTo(12, -6.3); outline.lineTo(12, 6.3);
    outline.lineTo(11.6, 6.7); outline.lineTo(-11.6, 6.7); outline.lineTo(-12, 6.3); outline.lineTo(-12, -6.3); outline.closePath();
    const slab = new T.ExtrudeGeometry(outline, { depth: .56, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .12, bevelThickness: .12 });
    slab.rotateX(-Math.PI / 2); mesh(scene, slab, steel, 0, -.6, 0);
    // Recessed relief insert, gasket, brushed metal rail and flush deck screws.
    const gasket = mat('gasket', 0x111818), rail = mat('rail', 0x667571, .65);
    box(scene, 22.76, .19, 12.14, gasket, 0, -.01, 0);
    const screws = new T.InstancedMesh(new T.CylinderGeometry(.049, .049, .016, 8), rail, 24);
    const screw = new T.Matrix4();
    let fastener = 0;
    for (const z of [-6.28, 6.28]) {
      box(scene, 22.92, .052, .075, rail, 0, .03, z);
      for (let x = -10.45; x <= 10.5; x += 1.9) screws.setMatrixAt(fastener++, screw.makeTranslation(x, .066, z));
    }
    scene.add(screws);
    for (const x of [-11.49, 11.49]) box(scene, .075, .052, 12.55, rail, x, .03, 0);

    // Lithographic terrain colors follow elevation, moisture and exposed rock.
    const vertices = [], uvs = [], indices = [], nx = 164, nz = 88;
    const deep = linear(0x173039), shoal = linear(0x41666a), silt = linear(0x9d997a);
    const grass = linear(0x68755a), stone = linear(0xa39a81), cliff = linear(0x626962);
    const dry = linear(0x886b50), c = new T.Color();
    const width = 22.56, depth = 11.94;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz, x = (u - .5) * width, z = (v - .5) * depth;
      vertices.push(x, heightAt(x, z), z);
      uvs.push(u, v);
      if (i < nx && j < nz) { const k = j * (nx + 1) + i; indices.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2); }
    }
    // Bake the fine vegetation and rock variation once, independent of mesh resolution.
    const texWidth = 1024, texHeight = 512, pixels = new Uint8Array(texWidth * texHeight * 4);
    for (let j = 0; j < texHeight; j++) for (let i = 0; i < texWidth; i++) {
      const x = ((i + .5) / texWidth - .5) * width, z = ((j + .5) / texHeight - .5) * depth;
      const h = heightAt(x, z), grain = terrainNoise(x * 1.4, z * 1.4), shore = coastAt(x) - z;
      const mottling = terrainNoise(x * 4.2, z * 4.2) * .55 + terrainNoise(x * 10.7, z * 10.7) * .30 + terrainNoise(x * 27.6, z * 27.6) * .15;
      if (h < shelf + .02) {
        c.lerpColors(deep, shoal, 1 - smooth(-shore / 1.75)).multiplyScalar(.93 + grain * .055 + mottling * .08);
      } else {
        const slope = Math.hypot(heightAt(x + .07, z) - heightAt(x - .07, z),
          heightAt(x, z + .07) - heightAt(x, z - .07)) / .14;
        c.lerpColors(grass, stone, smooth((h - .64) / 1.63 + grain * .20 + mottling * .20));
        c.lerp(dry, smooth((x - 1) / 10) * (1 - smooth((h - 1.1) / 1.4)) * .86);
        c.lerp(cliff, smooth((slope - .42) / 1.65) * .64);
        c.lerp(silt, (1 - smooth((h - shelf) / .34)) * .70);
        c.multiplyScalar(.92 + .11 * grain + .25 * mottling);
      }
      c.convertLinearToSRGB();
      const k = (j * texWidth + i) * 4;
      pixels[k] = clamp(c.r, 0, 1) * 255; pixels[k + 1] = clamp(c.g, 0, 1) * 255; pixels[k + 2] = clamp(c.b, 0, 1) * 255; pixels[k + 3] = 255;
    }
    const reliefMap = new T.DataTexture(pixels, texWidth, texHeight, T.RGBAFormat);
    reliefMap.encoding = T.sRGBEncoding; reliefMap.magFilter = T.LinearFilter;
    reliefMap.minFilter = T.LinearMipmapLinearFilter; reliefMap.generateMipmaps = true; reliefMap.needsUpdate = true;
    const terrain = new T.BufferGeometry();
    terrain.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    terrain.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    terrain.setIndex(indices); terrain.computeVertexNormals();
    mesh(scene, terrain, new T.MeshStandardMaterial({ map: reliefMap, roughness: .88 }));

    // Bridge surrounds sit behind and beneath the chart, leaving the terrain unobstructed.
    const bulkhead = mat('bulkhead', 0x28343a, .4), trim = mat('trim', 0x526063, .52);
    const deck = mat('deck', 0x151d20, .15);
    box(scene, 52, .24, 19, deck, 0, -1.28, .6);
    box(scene, 35, 1.18, .6, bulkhead, 0, -.48, -8.9);
    box(scene, 35, .14, .76, trim, 0, .16, -8.9);
    for (const x of [-15, -8, 0, 8, 15]) {
      beam(scene, new T.Vector3(x, .12, -8.9), new T.Vector3(x * .91, 8.8, -10.6), .25, bulkhead);
    }
    box(scene, 35, .29, .56, bulkhead, 0, 8.8, -10.6);
    const skyGeometry = new T.PlaneGeometry(90, 55, 56, 30);
    const skyPositions = skyGeometry.attributes.position, skyColors = [];
    const zenith = linear(0x223b4c), horizon = linear(0xb3bab1), cloud = linear(0x849795);
    for (let i = 0; i < skyPositions.count; i++) {
      const x = skyPositions.getX(i), y = skyPositions.getY(i);
      const mist = Math.exp(-Math.pow((y + 6) / 5.8, 2));
      const layer = smooth((Math.sin(x * .16 + y * .74) + Math.sin(x * .34 - y * 1.12) * .58) * .55);
      c.lerpColors(zenith, horizon, mist * .82).lerp(cloud, layer * (.12 + mist * .26));
      skyColors.push(c.r, c.g, c.b);
    }
    skyGeometry.setAttribute('color', new T.Float32BufferAttribute(skyColors, 3));
    const sky = mesh(scene, skyGeometry, new T.MeshBasicMaterial({ vertexColors: true, fog: false }), 0, -4, -19);
    sky.castShadow = sky.receiveShadow = false;
    const ports = {}, portHits = [];
    for (const port of data.ports) {
      const p = portPosition(port), base = heightAt(p.x, p.z) + .08 + (port.id === 'ridge' ? .48 : 0), town = new T.Group(); town.position.set(p.x, base, p.z); scene.add(town);
      box(town, port.id === 'ridge' ? .8 : 1.55, .1, 1.4, dark, 0, 0, 0);
      if (port.id === 'picket') {
        // Three exposed limestone benches and a quarry crane.
        for (let i = 0; i < 3; i++) box(town, 1.2 - i * .22, .18, .42, pale, -.4, .08 + i * .16, -.65 - i * .18);
        beam(town, new T.Vector3(-.75, .1, .25), new T.Vector3(-.75, 1.05, .25), .055, dark);
        beam(town, new T.Vector3(-.75, 1.05, .25), new T.Vector3(.15, 1.05, .25), .055, dark);
      } else if (port.id === 'relay') {
        for (const x of [-.56, .56]) for (const z of [-.3, .3]) beam(town, new T.Vector3(x, 0, z), new T.Vector3(x * .3, 1.35, z * .3), .045, dark);
        for (let i = 0; i < 3; i++) beam(town, new T.Vector3(-.5 + i * .1, i * .4, -.3), new T.Vector3(.4 - i * .1, (i + 1) * .4, -.2), .03, dark);
        for (const x of [-.65, .6]) { const dish = mesh(town, new T.SphereGeometry(.27, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), pale, x, .55, .42); dish.rotation.z = .6; }
      } else if (port.id === 'corridor') {
        for (const z of [-.65, .1]) { box(town, 1.7, .38, .48, dark, -.2, .22, z); const roof = mesh(town, new T.CylinderGeometry(.25, .25, 1.7, 10, 1, false, 0, Math.PI), dark, -.2, .41, z); roof.rotation.z = Math.PI / 2; }
        for (const x of [-.8, .8]) { box(town, .065, .8, .065, ochre, x, .4, .8); } box(town, 1.75, .06, .08, ochre, 0, .8, .8);
      } else if (port.id === 'ridge') {
        // Narrow limestone spur with a service bridge and a small relay head.
        box(town, .63, .75, 1.25, pale, 0, -.42, -.05);
        box(town, 1.75, .10, .31, dark, -.42, .11, -.45);
        for (const z of [-.58, -.32]) {
          beam(town, new T.Vector3(-1.2, .35, z), new T.Vector3(.42, .35, z), .035, pale);
          for (const x of [-1.1, -.35, .35]) box(town, .035, .26, .035, dark, x, .22, z);
        }
        box(town, .4, .36, .45, dark, -.15, .24, -.1);
        const relay = mesh(town, new T.ConeGeometry(.18, .25, 10), pale, -.18, .58, -.12);
        relay.rotation.z = -.6;
      } else if (port.id === 'haven') {
        // Coastal carrier cradle and a cantilever loading crane over the water.
        box(town, 1.8, .2, .55, pale, 0, -.1, -.42);
        for (const x of [-.65, .65]) {
          box(town, .10, .48, 1.25, dark, x, .14, .3);
          beam(town, new T.Vector3(x, .38, -.1), new T.Vector3(x * .5, .12, .65), .07, ochre);
        }
        box(town, .11, 1.12, .11, ochre, -.65, .6, -.45);
        beam(town, new T.Vector3(-.65, 1.16, -.45), new T.Vector3(.74, 1.16, .2), .075, ochre);
        beam(town, new T.Vector3(.7, 1.16, .18), new T.Vector3(.7, .38, .18), .018, pale);
      } else {
        box(town, 1.75, .25, 1.35, ochre, 0, .1, 0);
        for (const x of [-.65, .65]) for (const z of [-.45, .45]) box(town, .27, .65, .27, ochre, x, .48, z);
        box(town, 1.1, .45, .15, ochre, 0, .45, -.49); box(town, .5, .55, .48, dark, .05, .52, 0);
      }
      // A signal mast marks each railhead.
      const mastZ = .30;
      mesh(town, new T.CylinderGeometry(.065, .13, 1.12, 8), dark, 0, .64, mastZ);
      box(town, .56, .065, .09, pale, 0, 1.13, mastZ);
      mesh(town, new T.SphereGeometry(.10, 10, 6), materials.beacon ||= new T.MeshStandardMaterial({ color: linear(0xeab26c), emissive: linear(0xeab26c), emissiveIntensity: .6 }), 0, 1.25, mastZ);
      // Native chart taps hit the physical mast before any route underneath it.
      const mastHit = new T.Mesh(new T.CylinderGeometry(.30, .34, 1.5, 8), new T.MeshBasicMaterial({ visible: false }));
      mastHit.position.set(0, .7, mastZ); mastHit.userData.portId = port.id; town.add(mastHit); portHits.push(mastHit);
      ports[port.id] = { point: new T.Vector3(p.x, base + 1.3, p.z + mastZ), ground: new T.Vector3(p.x, base, p.z) };
    }
    const routeGroup = new T.Group(), sensorGroup = new T.Group(), markerGroup = new T.Group(), ship = new T.Group();
    scene.add(routeGroup, sensorGroup, markerGroup, ship);
    const state = { renderer, scene, camera, ports, portHits, routeGroup, sensorGroup, markerGroup, catalog: catalogKey(data.ports), markerPositions: [], sensorRadius: 0, ship, routeHits: [], shipReady: false, light, reliefMap };
    stage = state;
    // Small relief-table model of the locomotive, workshop car and low-loader.
    for (const [index, x] of [1.0,0,-1.0].entries()) {
      box(ship,.88,.10,.46,dark,x,.15,0);
      for (const end of [-.29,.29]) for (const side of [-.225,.225]) {
        const wheel=mesh(ship,new T.CylinderGeometry(.095,.095,.055,10),black,x+end,.09,side);
        wheel.rotation.x=Math.PI/2;
      }
      if(index<2){
        box(ship,.78,index===0?.33:.36,.39,index===0?ochre:steel,x,.37,0);
        box(ship,.79,.055,.43,dark,x,.56,0);
        box(ship,.065,.09,.39,pale,x+.36,.41,0);
      }else{
        box(ship,.62,.30,.31,steel,x,.36,0);
        box(ship,.32,.17,.35,ochre,x-.06,.52,0);
        box(ship,.72,.035,.42,pale,x,.21,0);
      }
      if(index<2)box(ship,.18,.075,.12,dark,x-.5,.16,0);
    }
    const lowLoader=new T.Group();
    scene.add(lowLoader);
    box(lowLoader,1.36,.12,.48,dark,-.05,.16,0);
    box(lowLoader,.33,.32,.41,ochre,.47,.33,0);
    box(lowLoader,.065,.10,.33,pale,.64,.40,0);
    box(lowLoader,.53,.31,.34,steel,-.29,.36,0);
    for(const axle of [-.60,-.36,.48])for(const side of [-.235,.235]){
      const wheel=mesh(lowLoader,new T.CylinderGeometry(.115,.115,.09,10),black,axle,.11,side);
      wheel.rotation.x=Math.PI/2;
    }
    lowLoader.visible=false;
    state.lowLoader=lowLoader;
    ship.scale.setScalar(.72);
    state.shipReady = true;
    if (host) host.dataset.halyard = 'ready';
    updateRoutes();
    updateWorld();
  }
  function pathPoints(path, offset = 0) {
    const result = [];
    for (let n = 1; n < path.length; n++) {
      const a = stage.ports[path[n - 1]]?.ground, b = stage.ports[path[n]]?.ground;
      if (!a || !b) continue;
      for (let j = 0; j <= 28; j++) {
        const p = a.clone().lerp(b, j / 28); p.z += offset; p.y = Math.max(heightAt(p.x, p.z) + .26, .52); result.push(p);
      }
    }
    return result;
  }
  function updateRoutes() {
    if (!stage) return;
    disposeTree(stage.routeGroup); stage.routeGroup.clear(); stage.routeHits = [];
    const selected = (data.path || []).join('>');
    function add(path, color, radius, dashed, key, offset = 0) {
      const points = pathPoints(path, offset); if (points.length < 2) return;
      const curve = new T.CatmullRomCurve3(points);
      const geometry = new T.TubeGeometry(curve, 100, dashed ? .045 : radius, 6, false);
      const line = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: linear(color), transparent: true, opacity: key ? 1 : .4, depthTest: !key, depthWrite: false, toneMapped: false }));
      if (dashed) {
        // A mesh dash pattern keeps the alternate leg readable on small screens.
        geometry.clearGroups();
        const segmentIndices = 6 * 6;
        for (let segment = 0; segment < 100; segment += 4) geometry.addGroup(segment * segmentIndices, Math.min(2, 100 - segment) * segmentIndices, 0);
        line.material = [line.material];
      }
      if (key) {
        const underGeometry = new T.TubeGeometry(curve, 100, dashed ? .075 : radius + .035, 6, false);
        const underMaterial = new T.MeshBasicMaterial({ color: linear(0x172326), depthTest: false, toneMapped: false });
        if (dashed) { underGeometry.clearGroups(); for (const group of geometry.groups) underGeometry.addGroup(group.start, group.count, 0); }
        const under = new T.Mesh(underGeometry, dashed ? [underMaterial] : underMaterial);
        under.renderOrder = 5; stage.routeGroup.add(under);
      }
      line.renderOrder = key ? 6 : 4;
      stage.routeGroup.add(line);
      if (key) {
        const hit = new T.Mesh(new T.TubeGeometry(curve, 40, .18, 5, false), new T.MeshBasicMaterial({ visible: false }));
        hit.userData.pathKey = key; stage.routeGroup.add(hit); stage.routeHits.push(hit);
      }
    }
    for (const route of data.routes) add([route.from, route.to], route.toll ? 0xd5856a : 0x91a4a0, route.toll ? .046 : .019, !!route.road, null);
    for (const option of data.routeOptions || []) {
      const path = option.path || option, key = option.key || path.join('>');
      if (key !== selected) add(path, colors.cyan, .02, true, key, .10);
    }
    if (data.path?.length > 1) add(data.path, colors.amber, .055, false, selected);
    routeSignature = JSON.stringify([data.routes, data.path, data.routeOptions]);
  }
  function worldKey() {
    return JSON.stringify([data.markers || [], data.sensorRange, data.sensorPort || data.current]);
  }
  function updateWorld() {
    if (!stage) return;
    for (const group of [stage.markerGroup, stage.sensorGroup]) { disposeTree(group); group.clear(); }
    stage.markerPositions = [];
    function stroke(parent, points, color, opacity = 1, dashed = false) {
      const geometry = new T.BufferGeometry().setFromPoints(points);
      const material = dashed
        ? new T.LineDashedMaterial({ color: linear(color), dashSize: .18, gapSize: .15, transparent: true, opacity, depthTest: false, toneMapped: false })
        : new T.LineBasicMaterial({ color: linear(color), transparent: true, opacity, depthTest: false, toneMapped: false });
      const line = new T.Line(geometry, material); line.renderOrder = 8;
      if (dashed) line.computeLineDistances(); parent.add(line); return line;
    }
    const sensor = stage.ports[data.sensorPort || data.current]?.ground;
    const radius = Number.isFinite(data.sensorRange) ? clamp(data.sensorRange, 0, 30) : 0;
    stage.sensorRadius = radius;
    if (sensor && radius > 0) {
      // Split the coverage ring at the physical table edge; it never spills into the room.
      let points = [];
      for (let i = 0; i <= 160; i++) {
        const angle = i / 160 * Math.PI * 2, x = sensor.x + Math.cos(angle) * radius, z = sensor.z + Math.sin(angle) * radius;
        if (Math.abs(x) > 11.1 || Math.abs(z) > 5.9) { if (points.length > 1) stroke(stage.sensorGroup, points, colors.cyan, .38, true); points = []; continue; }
        points.push(new T.Vector3(x, heightAt(x, z) + .12, z));
      }
      if (points.length > 1) stroke(stage.sensorGroup, points, colors.cyan, .38, true);
    }
    for (const marker of data.markers || []) {
      const a = stage.ports[marker.from]?.ground, b = stage.ports[marker.to]?.ground;
      if (!a || !b || !['storm', 'patrol'].includes(marker.kind)) continue;
      // Day-indexed movement is reproducible after reload and independent of frame rate.
      let hash = 0; for (const c of marker.id || marker.kind) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
      const fraction = Number.isFinite(marker.fraction) ? clamp(marker.fraction, 0, 1)
        : .2 + ((((marker.day || data.day || 1) % 61) * 17 + hash % 41) % 61) / 100;
      const point = a.clone().lerp(b, fraction); point.y = heightAt(point.x, point.z) + .55;
      const group = new T.Group(); group.position.copy(point); group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      group.userData = { id: marker.id, kind: marker.kind, day: marker.day, fraction };
      stage.markerGroup.add(group);
      if (marker.kind === 'storm') {
        const cloudMaterial = new T.MeshStandardMaterial({ color: linear(0x719397), roughness: 1, transparent: true, opacity: .48, depthWrite: false });
        for (let i = 0; i < 5; i++) {
          const cloud = new T.Mesh(new T.SphereGeometry(.38, 12, 7), cloudMaterial);
          cloud.position.set((i - 2) * .29, .18 + Math.sin(i * 1.9) * .06, 0); cloud.scale.set(1, .42, .7); group.add(cloud);
        }
        const front = [];
        for (let i = 0; i <= 24; i++) { const x = -.95 + i / 24 * 1.9; front.push(new T.Vector3(x, -.18, -.30 + Math.sin(i / 24 * Math.PI) * .17)); }
        stroke(group, front, colors.cyan, .85);
        stroke(group, [new T.Vector3(-.08, .24, 0), new T.Vector3(-.22, -.07, 0), new T.Vector3(.03, -.04, 0), new T.Vector3(-.04, -.34, 0)], colors.amber);
      } else {
        // Three small swept patrol craft in a clear wedge formation.
        const patrolMaterial = new T.MeshStandardMaterial({ color: linear(0x9f6a56), roughness: .8 });
        for (const [x, z] of [[0, -.35], [-.35, .12], [.35, .12]]) {
          const shape = new T.ConeGeometry(.14, .44, 4); shape.rotateX(Math.PI / 2);
          const craft = new T.Mesh(shape, patrolMaterial); craft.position.set(x, .1, z); craft.scale.x = .7; group.add(craft);
        }
        stroke(group, [new T.Vector3(-.65, -.18, .48), new T.Vector3(0, -.18, -.66), new T.Vector3(.65, -.18, .48)], 0xc38b70, .8);
      }
      // A small route hazard diamond connects the scene silhouette to its affected leg.
      const diamond = [new T.Vector3(0, -.30, -.19), new T.Vector3(.16, -.30, 0), new T.Vector3(0, -.30, .19), new T.Vector3(-.16, -.30, 0), new T.Vector3(0, -.30, -.19)];
      stroke(group, diamond, marker.kind === 'storm' ? colors.cyan : 0xc38b70);
      stage.markerPositions.push({ id: marker.id, kind: marker.kind, from: marker.from, to: marker.to, day: marker.day, fraction, x: point.x, y: point.y, z: point.z });
    }
    worldSignature = worldKey();
  }
  function reset() { zoom = 1; tilt = .80; yaw = -.04; panX = panZ = 0; }
  function attach(element) {
    events?.abort(); pointers.clear(); pinch = null; host = element;
    if (!host) return;
    events = new AbortController(); const options = { signal: events.signal };
    host.style.touchAction = 'none';
    host.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a, input') || e.button > 0) return;
      host.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
      if (pointers.size === 2) { const [a, b] = pointers.values(); a.moved = b.moved = true; pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x), zoom, tilt, yaw }; }
    }, options);
    host.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.moved ||= Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 5; p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 1 && p.moved) { panX = clamp(panX - dx * .018 / zoom, -3, 3); panZ = clamp(panZ - dy * .02 / zoom, -2, 2); }
      if (pointers.size === 2 && pinch) { const [a, b] = pointers.values(); zoom = clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance), .8, 1.65); let angle = Math.atan2(b.y - a.y, b.x - a.x) - pinch.angle; angle = Math.atan2(Math.sin(angle), Math.cos(angle)); tilt = clamp(pinch.tilt + angle * .35, .65, 1.1); yaw = clamp(pinch.yaw + angle * .12, -.22, .22); }
    }, options);
    function up(e) {
      const p = pointers.get(e.pointerId); pointers.delete(e.pointerId); pinch = null;
      if (!p || p.moved || e.type !== 'pointerup' || !stage) return;
      const rect = host.getBoundingClientRect(), ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), stage.camera);
      const portHit = ray.intersectObjects(stage.portHits)[0];
      if (portHit) { callbacks?.selectPort?.(portHit.object.userData.portId); return; }
      const hit = ray.intersectObjects(stage.routeHits)[0]; if (hit) callbacks?.selectRoute?.(hit.object.userData.pathKey);
    }
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(type, up, options);
    host.addEventListener('wheel', e => { if (e.target.closest('button')) return; e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * .001), .8, 1.65); }, { ...options, passive: false });
    host.addEventListener('keydown', e => {
      if (e.target.closest('button')) return;
      const action = { Home: reset, '+': () => zoom = clamp(zoom + .1, .8, 1.65), '-': () => zoom = clamp(zoom - .1, .8, 1.65), ArrowLeft: () => panX = clamp(panX - .5, -3, 3), ArrowRight: () => panX = clamp(panX + .5, -3, 3), ArrowUp: () => panZ = clamp(panZ - .5, -2, 2), ArrowDown: () => panZ = clamp(panZ + .5, -2, 2) }[e.key];
      if (action) { e.preventDefault(); action(); }
    }, options);
  }
  function show(element, next, actions) {
    if (!element) { close(); return; }
    data = next; callbacks = actions;
    if (host !== element) attach(element);
    if (stage && stage.catalog !== catalogKey(data.ports)) dropStage();
    if (stage && JSON.stringify([data.routes, data.path, data.routeOptions]) !== routeSignature) updateRoutes();
    if (stage && worldKey() !== worldSignature) updateWorld();
  }
  function projectPorts() {
    if (!host || !stage) return {};
    const frame = host.getBoundingClientRect(), result = {}, placed = [], gap = 5;
    const intersects = (a, b) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
    const blocked = [...(host.parentElement?.querySelectorAll('.chart-heading, .chart-port-card, .chart-reset') || [])]
      .map(element => { const r = element.getBoundingClientRect(); return { left: r.left - frame.left, right: r.right - frame.left, top: r.top - frame.top, bottom: r.bottom - frame.top }; });
    const labels = Object.entries(stage.ports).map(([id, port], index) => {
      const projected = port.point.clone().project(stage.camera);
      const anchor = { x: (projected.x * .5 + .5) * frame.width, y: (-projected.y * .5 + .5) * frame.height };
      const button = host.querySelector('[data-overworld-port="' + id + '"]');
      const bounds = button?.getBoundingClientRect();
      return { id, index, anchor, button, width: Math.max(44, bounds?.width || 44), height: Math.max(44, bounds?.height || 44), visible: Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 };
    });
    const priority = id => id === data.current ? 0 : id === data.selected ? 1 : 2;
    labels.sort((a, b) => priority(a.id) - priority(b.id) || a.index - b.index);
    for (const label of labels) {
      const { id, anchor, button, width, height, visible } = label;
      const preferred = { left: anchor.x - width / 2, top: anchor.y + (id === data.current ? 10 : -height - 5) };
      const candidates = [preferred];
      // Nearby placements first; wider rings are a deterministic fallback when panned.
      for (const radius of [18, 36, 60, 88, 120, 160]) {
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          candidates.push({ left: preferred.left + dx * radius, top: preferred.top + dy * radius });
        }
      }
      function rectangle(candidate) {
        const left = clamp(candidate.left, 7, Math.max(7, frame.width - width - 7));
        const top = clamp(candidate.top, 7, Math.max(7, frame.height - height - 7));
        return { left, top, right: left + width, bottom: top + height, width, height };
      }
      let rect;
      for (const candidate of candidates) {
        const next = rectangle(candidate);
        if (![...blocked, ...placed].some(other => intersects(next, other))) { rect = next; break; }
      }
      // A full viewport scan handles dense zoomed/panned views without hiding controls.
      if (!rect) {
        const free = [];
        for (let top = 7; top + height <= frame.height - 7; top += 12) for (let left = 7; left + width <= frame.width - 7; left += 12) {
          const next = rectangle({ left, top });
          if (![...blocked, ...placed].some(other => intersects(next, other))) free.push(next);
        }
        free.sort((a, b) => Math.hypot(a.left - preferred.left, a.top - preferred.top) - Math.hypot(b.left - preferred.left, b.top - preferred.top));
        rect = free[0] || rectangle(preferred);
      }
      const overlaps = placed.filter(other => intersects(rect, other)).map(other => other.id);
      const blockedCount = blocked.filter(other => intersects(rect, other)).length;
      const displacement = Math.hypot(rect.left - preferred.left, rect.top - preferred.top);
      result[id] = { x: anchor.x, y: anchor.y, visible, rect, displacement, overlaps, blockedCount };
      if (visible) placed.push({ ...rect, id });
      if (button) {
        button.style.transform = 'none'; button.style.left = rect.left + 'px'; button.style.top = rect.top + 'px'; button.style.visibility = visible ? 'visible' : 'hidden';
        let leader = host.querySelector('[data-chart-port-leader="' + id + '"]');
        if (!leader && host.ownerDocument) {
          leader = host.ownerDocument.createElement('span'); leader.dataset.chartPortLeader = id; leader.setAttribute('aria-hidden', 'true');
          Object.assign(leader.style, { position: 'absolute', height: '1px', background: '#91aaa780', pointerEvents: 'none', transformOrigin: '0 50%', zIndex: '0' }); host.prepend(leader);
        }
        if (leader) {
          const x = clamp(anchor.x, rect.left, rect.right), y = clamp(anchor.y, rect.top, rect.bottom);
          Object.assign(leader.style, { display: visible && displacement > 8 ? 'block' : 'none', left: anchor.x + 'px', top: anchor.y + 'px', width: Math.hypot(x - anchor.x, y - anchor.y) + 'px', transform: 'rotate(' + Math.atan2(y - anchor.y, x - anchor.x) + 'rad)' });
        }
      }
    }
    stage.labelLayout = result;
    return result;
  }
  function render(time, dt, width, height, reducedMotion) {
    if (!host || owner.lost) return;
    const frame = host.getBoundingClientRect(), page = host.closest('.page')?.getBoundingClientRect() || frame;
    const left = Math.max(0, page.left, frame.left), right = Math.min(width, page.right, frame.right), top = Math.max(0, page.top, frame.top), bottom = Math.min(height, page.bottom, frame.bottom);
    if (right - left < 1 || bottom - top < 1) return;
    if (!stage) buildStage();
    const { renderer, scene, camera, ship } = stage;
    camera.aspect = frame.width / frame.height;
    const portrait = camera.aspect < 1.15;
    const elevation = portrait ? Math.max(tilt, 1.12) : tilt;
    const azimuth = yaw + (portrait ? .74 : 0);
    // Fit the complete table in both orientations, keeping the lip in foreground.
    const distance = Math.max(23.5, (portrait ? 42 : 39) / camera.aspect) / zoom;
    camera.position.set(panX + Math.sin(azimuth) * Math.cos(elevation) * distance, Math.sin(elevation) * distance, panZ + Math.cos(elevation) * Math.cos(azimuth) * distance);
    camera.lookAt(panX, 0, panZ); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const current = stage.ports[data.current]?.ground;
    ship.visible=true;stage.lowLoader.visible=false;
    if (current) {
      ship.position.copy(current); ship.position.x += 1.0; ship.position.z += .1; ship.position.y = Math.max(heightAt(ship.position.x,ship.position.z)+.26,.52);
      if (data.departure?.path?.length > 1) {
        const departure = data.departure;
        const progress = clamp((performance.now() - departure.startedAt) / Math.max(1, departure.duration || 1400), 0, 1);
        const waypoints = departure.path.map(id => stage.ports[id]?.ground).filter(Boolean);
        const lengths = waypoints.slice(1).map((point, i) => point.distanceTo(waypoints[i]));
        const total = lengths.reduce((sum, length) => sum + length, 0);
        let remaining = progress * total;
        for (let i = 0; i < lengths.length; i++) {
          if (remaining <= lengths[i] || i === lengths.length - 1) {
            const fraction = clamp(remaining / Math.max(.001, lengths[i]), 0, 1);
            ship.position.copy(waypoints[i]).lerp(waypoints[i + 1], fraction);
            ship.position.y = Math.max(heightAt(ship.position.x,ship.position.z)+.26,.52);
            const from=departure.path[i],to=departure.path[i+1];
            const edge=data.routes.find(route=>route.from===from&&route.to===to||route.to===from&&route.from===to);
            const direction = new T.Vector3().subVectors(waypoints[i + 1], waypoints[i]);
            ship.rotation.y = Math.atan2(-direction.z, direction.x);
            if(edge?.road){
              ship.visible=false;stage.lowLoader.visible=true;
              stage.lowLoader.position.copy(ship.position);
              stage.lowLoader.rotation.y=ship.rotation.y;
            }
            break;
          }
          remaining -= lengths[i];
        }
      } else ship.rotation.y = 0;
    }
    if (stage.shipReady) host.dataset.halyard = 'ready';
    projectPorts(); owner.show(true); owner.resize(width, height);
    const target = renderer.getRenderTarget(), viewport = renderer.getViewport(new T.Vector4()), scissor = renderer.getScissor(new T.Vector4()), scissorTest = renderer.getScissorTest();
    try {
      renderer.setRenderTarget(null); renderer.setScissorTest(false); renderer.clear();
      renderer.setViewport(frame.left, height - frame.bottom, frame.width, frame.height);
      renderer.setScissor(left, height - bottom, right - left, bottom - top); renderer.setScissorTest(true); renderer.render(scene, camera);
      root.IronVowPerformance?.recordRender(renderer.info);
    } finally { renderer.setRenderTarget(target); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest); }
  }
  function dropStage() { if (stage) { disposeTree(stage.scene); stage.light.shadow.map?.dispose(); stage.reliefMap.dispose(); stage = null; } routeSignature = worldSignature = null; }
  // Journal restores only the five finite camera values, within interaction limits.
  function restoreView(view) {
    if (!view || !['zoom', 'tilt', 'yaw', 'panX', 'panZ'].every(key => Number.isFinite(view[key]))) return false;
    zoom = clamp(view.zoom, .8, 1.65); tilt = clamp(view.tilt, .65, 1.1);
    yaw = clamp(view.yaw, -.22, .22); panX = clamp(view.panX, -3, 3); panZ = clamp(view.panZ, -2, 2);
    projectPorts(); return true;
  }
  function close() { attach(null); dropStage(); data = callbacks = null; reset(); }
  owner.subscribe(({ type }) => { if (type === 'restored') dropStage(); });
  root.IronVowChart = { show, render, close, reset, restoreView, projectPorts, snapshot: () => ({ zoom, tilt, yaw, panX, panZ, ready: !!stage, shipReady: !!stage?.shipReady, portCount: Object.keys(stage?.ports || {}).length, markers: (stage?.markerPositions || []).map(marker => ({ ...marker })), sensorRange: stage?.sensorRadius || 0, labelLayout: stage?.labelLayout || {} }) };
})(window);
