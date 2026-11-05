/* Original Fastlap Three.js engine, car, PBR textures and ribbon construction.
   No elapsed-time animation: render(progress) is a pure scroll pose update. */
import { THREE as T, buildCar, loadOriginalCar, RoomEnvironment, RGBELoader } from './vendor/fastlap-engine.mjs';
import { buildJourney, clamp, smooth } from './drive-geometry.mjs';
export function createScene(canvas, rows, assetURL, invalidate, onModel, onFailure) {
  const journey = buildJourney(rows);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#0e0e10');
  scene.fog = new T.Fog('#0e0e10', 55, 230);
  const camera = new T.PerspectiveCamera(58, 1, .1, 400);
  const environment = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = environment.fromScene(room, .04);
  scene.environment = env.texture; scene.environmentIntensity = .45;
  room.dispose?.();
  scene.add(new T.HemisphereLight(0xc8d9ec, 0x191518, 1.2));
  const sun = new T.DirectionalLight(0xffe8ce, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 70 });
  sun.shadow.bias = -.0002; sun.shadow.normalBias = .015;
  scene.add(sun, sun.target);
  const rim = new T.DirectionalLight(0xa0b8ff, 1.2); rim.position.set(-40, 25, -30); scene.add(rim);
  let disposed = false;
  const resources = new Set();
  const keep = resource => { resources.add(resource); return resource; };
  const standard = (color, extra = {}) => keep(new T.MeshStandardMaterial({ color, roughness: .85, side: T.DoubleSide, ...extra }));
  const roadMaterial = standard(0x333338);
  const grassMaterial = standard(0x263222);
  const red = standard(0xe10a1e), white = standard(0xeeeeee), metal = standard(0x303039, { metalness: .65, roughness: .4 });
  const stripes = standard(0xffffff, { vertexColors: true });
  const green = standard(0x22c55e), purple = standard(0xa855f7), black = standard(0x08080a);
  const markerGeometry = keep(new T.BoxGeometry(.13, 1.5, .13));
  const finishGeometry = keep(new T.PlaneGeometry(.5, .5));
  const segments = Math.min(16000, Math.max(300, Math.ceil(journey.length / .75)));
  const frames = Array.from({ length: segments + 1 }, (_, i) => journey.sample(i / segments * journey.length));
  // Same sampled cross sections for asphalt, kerbs, runoff and rails.
  function ribbon(left, right, height, material, alternating = false, wall = false) {
    const pos = [], uv = [], index = [];
    frames.forEach((f, i) => {
      for (const [edge, offset] of [left, right].entries()) {
        const p = f.position.clone().addScaledVector(f.right, offset).addScaledVector(f.up, wall ? edge * height : height);
        pos.push(p.x, p.y, p.z); uv.push(wall ? edge : (offset - left) / (right - left), i / segments);
      }
      if (i < segments) { const k = i * 2; index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const geometry = keep(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(index); geometry.computeVertexNormals();
    // Flat vertex colors preserve hard stripe boundaries with one draw call,
    // instead of one material group (draw call) per track segment.
    let renderedGeometry = geometry;
    if (alternating) {
      renderedGeometry = keep(geometry.toNonIndexed());
      const colors = new Float32Array(segments * 6 * 3);
      for (let i = 0; i < segments; i++) {
        const color = material[Math.floor(i / 3) % 2].color;
        for (let vertex = 0; vertex < 6; vertex++) color.toArray(colors, (i * 6 + vertex) * 3);
      }
      renderedGeometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      resources.delete(geometry); geometry.dispose();
    }
    const mesh = new T.Mesh(renderedGeometry, alternating ? stripes : material); mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  ribbon(-3, 3, 0, roadMaterial);
  ribbon(-3.55, -3, .035, [red, white], true); ribbon(3, 3.55, .035, [red, white], true);
  ribbon(-3, -2.9, .008, white); ribbon(2.9, 3, .008, white);
  ribbon(-25, -3.55, -.025, grassMaterial); ribbon(3.55, 25, -.025, grassMaterial);
  ribbon(-5.7, -5.4, .52, [red, white], true); ribbon(5.4, 5.7, .52, [red, white], true);
  for (const edge of [-5.7, -5.4, 5.4, 5.7]) ribbon(edge, edge, .52, [red, white], true, true);
  // Rating-colored centre rail is flush with the asphalt, never above the tyres.
  const rail = ribbon(-.045, .045, .006, keep(new T.MeshBasicMaterial({ vertexColors: true })));
  const min = Math.min(...rows.map(r => r.rating)), max = Math.max(...rows.map(r => r.rating));
  const colors = []; let rowIndex = 0;
  frames.forEach((_, i) => {
    const distance = i / segments * journey.length;
    while (rowIndex < rows.length - 1 && journey.checkpoints[rowIndex + 1].distance <= distance) rowIndex++;
    const color = new T.Color().setHSL(.33 - .33 * (rows[rowIndex].rating - min) / Math.max(1, max - min), .8, .55);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  });
  rail.geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const box = keep(new T.BoxGeometry(1, 1, 1));
  function block(group, size, position, material) {
    const mesh = new T.Mesh(box, material); mesh.scale.set(...size); mesh.position.set(...position); group.add(mesh); return mesh;
  }
  function gate(distance, material, height = 4.5) {
    const group = new T.Group(), f = journey.sample(distance);
    group.position.copy(f.position); group.quaternion.copy(f.rotation);
    block(group, [.22, height, .22], [-4.1, height / 2, 0], metal);
    block(group, [.22, height, .22], [4.1, height / 2, 0], metal);
    block(group, [8.5, .5, .3], [0, height, 0], material); scene.add(group); return group;
  }
  const peakIndex = rows.reduce((best, row, i) => row.rating > rows[best].rating ? i : best, 0);
  const peakGate = gate(journey.checkpoints[peakIndex].distance, red, 6);
  const lamp = keep(new T.MeshBasicMaterial({ color: 0xff3344 }));
  for (let i = -2; i <= 2; i++) block(peakGate, [.45, .6, .2], [i * .8, 6.7, 0], lamp);
  let bestBand = Math.floor(rows[0].rating / 500);
  journey.checkpoints.forEach((row, i) => {
    const f = journey.sample(row.distance);
    const marker = new T.Mesh(markerGeometry, row.delta === null ? white : row.delta >= 0 ? green : red);
    marker.position.copy(f.position).addScaledVector(f.right, (i % 2 ? 1 : -1) * 4.3); marker.position.y += .75;
    scene.add(marker);
    const band = Math.floor(row.rating / 500);
    row.milestone = band > bestBand ? `${band * 500}+ RATING` : '';
    row.peak = i === peakIndex;
    if (row.milestone && !row.peak) gate(row.distance, purple);
    bestBand = Math.max(bestBand, band);
  });
  gate(journey.end - 4, white);
  for (let z = 0; z < 2; z++) for (let x = 0; x < 12; x++) {
    const f = journey.sample(journey.end - 4 + z * .5);
    const square = new T.Mesh(finishGeometry, (z + x) % 2 ? white : black);
    square.rotation.x = -Math.PI / 2;
    square.position.copy(f.position).addScaledVector(f.right, -2.75 + x * .5); square.position.y += .012; scene.add(square);
  }
  // Original model loader keeps the original procedural 3D car if loading fails.
  const car = buildCar(String(Math.min(rows.length, 999)), 'navy', false); scene.add(car.group);
  const modelReady = loadOriginalCar(car, assetURL('assets/models/rb22.glb'), () => !disposed).then(ok => {
    if (!ok || disposed) return;
    // Imported model is already nose-forward (+Z). Normalize its tyre contact
    // plane in local coordinates, before the group receives its track pose.
    const model = car.body.children[0];
    car.group.position.set(0, 0, 0); car.group.quaternion.identity(); car.group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model, true);
    model.position.y -= bounds.min.y / car.group.scale.y;
    model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    onModel(true); invalidate();
  }).catch(() => { if (!disposed) { onModel(false); invalidate(); } });
  const loader = new T.TextureLoader();
  function texture(name, color, x, y, apply) {
    loader.load(assetURL(`assets/${name}`), map => {
      if (disposed) { map.dispose(); return; }
      keep(map); if (color) map.colorSpace = T.SRGBColorSpace;
      map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(x, y);
      map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); apply(map); invalidate();
    }, undefined, () => {});
  }
  texture('asphalt-diff.jpg', true, 6 / 2.2, journey.length / 2.2, map => { roadMaterial.map = map; roadMaterial.color.setHex(0xaaaaaa); roadMaterial.needsUpdate = true; });
  texture('asphalt-nor.jpg', false, 6 / 2.2, journey.length / 2.2, map => { roadMaterial.normalMap = map; roadMaterial.normalScale.set(.6, .6); roadMaterial.needsUpdate = true; });
  texture('asphalt-rough.jpg', false, 6 / 2.2, journey.length / 2.2, map => { roadMaterial.roughnessMap = map; roadMaterial.needsUpdate = true; });
  texture('grass-diff.jpg', true, 5, journey.length / 6, map => { grassMaterial.map = map; grassMaterial.color.setHex(0x556644); grassMaterial.needsUpdate = true; });
  new RGBELoader().load(assetURL('assets/night-sky.hdr'), map => {
    if (disposed) { map.dispose(); return; }
    keep(map); map.mapping = T.EquirectangularReflectionMapping;
    scene.background = map; scene.backgroundIntensity = .18; scene.backgroundBlurriness = .04; invalidate();
  }, undefined, () => {});
  const contextLost = event => { event.preventDefault(); if (!disposed) onFailure(); };
  canvas.addEventListener('webglcontextlost', contextLost);
  function render(progress) {
    if (disposed) return;
    const distance = journey.distanceAt(progress), f = journey.sample(distance);
    car.group.position.copy(f.position); car.group.quaternion.copy(f.rotation);
    car.spin.forEach(wheel => { wheel.rotation.x = distance / (.36 * .72); });
    const ahead = journey.sample(distance + 2).forward;
    const turn = Math.atan2(f.forward.x * ahead.z - f.forward.z * ahead.x, f.forward.dot(ahead));
    car.steer.forEach(wheel => { wheel.rotation.y = clamp(-turn * 2, -.3, .3); });
    // No body bob, independent camera lerp, velocity accumulation or time orbit.
    const intro = 1 - smooth(progress / .13), finish = smooth((progress - .96) / .04);
    const behind = f.forward.clone().negate().applyAxisAngle(f.up, finish * .65 + intro * .38);
    camera.position.copy(f.position).addScaledVector(behind, 7.5 + intro * 6).addScaledVector(f.up, 2.8 + intro * 3.7);
    camera.lookAt(f.position.clone().addScaledVector(f.forward, 5 - finish * 5).addScaledVector(f.up, .55));
    sun.position.copy(f.position).add(new T.Vector3(14, 24, 12)); sun.target.position.copy(f.position);
    renderer.render(scene, camera);
    return { distance, frame: f, camera, journey, peakIndex };
  }
  function resize(width, height) {
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function dispose() {
    if (disposed) return; disposed = true;
    canvas.removeEventListener('webglcontextlost', contextLost);
    scene.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      for (const material of object.material ? [].concat(object.material) : []) {
        resources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      }
    });
    resources.forEach(resource => resource.dispose()); env.dispose(); environment.dispose();
    sun.shadow.dispose(); resources.clear();
    renderer.dispose(); renderer.forceContextLoss();
  }
  return { render, resize, dispose, journey, modelReady };
}
