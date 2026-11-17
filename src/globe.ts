// The hero globe: a dotted Earth (Natural Earth land mask), a pulsing Soweto beacon, looping great-circle arcs,
// and a camera dive into Soweto on the first scroll that hands over to the Canvas 2D field.
// Loaded as its own chunk, only when motion is on and WebGL works.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { latLonToVec3, SOWETO } from './geo.ts';

const AMBER = 0xffb224;
// Decoration only: arcs to major cities on other continents. No labels, no claims about traffic.
const CITIES: [number, number][] = [
  [51.51, -0.13], [40.71, -74.01], [-23.55, -46.63], [35.68, 139.69],
  [-33.87, 151.21], [19.08, 72.88], [1.35, 103.82], [34.05, -118.24],
];

const v3 = (lat: number, lon: number, r = 1) => new THREE.Vector3(...latLonToVec3(lat, lon, r));

/** A soft radial sprite: the glow is faked with additive sprites, no post-processing. */
function glowTexture(inner = 'rgba(255,214,140,1)', mid = 'rgba(255,178,36,0.45)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner); grad.addColorStop(0.25, mid); grad.addColorStop(1, 'rgba(255,178,36,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill();
  return new THREE.CanvasTexture(c);
}

async function landPoints(count: number) {
  // fetch + createImageBitmap: not subject to the browser's lazy-image interventions that can break img.decode().
  const img = await createImageBitmap(await (await fetch('/land-mask.png')).blob());
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  // Fibonacci sphere: even spacing; keep the points that fall on land (about 27% of the sphere).
  const total = Math.round(count / 0.27);
  const pts: number[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total && pts.length / 3 < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / total;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lon = ((((i * ga) * 180) / Math.PI) % 360) - 180;
    const px = Math.floor(((lon + 180) / 360) * width), py = Math.floor(((90 - lat) / 180) * height);
    if (data[(py * width + px) * 4] > 127) pts.push(...latLonToVec3(lat, lon, 1.004));
  }
  // Shuffle so halving the draw range under load keeps an even spread.
  const n = pts.length / 3;
  for (let i = n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    for (let k = 0; k < 3; k++) [pts[i * 3 + k], pts[j * 3 + k]] = [pts[j * 3 + k], pts[i * 3 + k]];
  }
  return new Float32Array(pts);
}

export async function globe(opts: { onDive?: () => void }) {
  const root = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'globe';
  canvas.setAttribute('aria-hidden', 'true');
  const flash = Object.assign(document.createElement('div'), { className: 'globe-flash' });
  document.body.prepend(canvas, flash);
  root.classList.add('has-globe');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const world = new THREE.Group();
  const earth = new THREE.Group();
  world.add(earth);
  scene.add(world);

  // Dark core (writes depth, so dots on the far side stay hidden).
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0c1119 })));

  // Land dots.
  const phone = innerWidth * innerHeight < 600_000;
  const positions = await landPoints(phone ? 6000 : 14000);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
    size: phone ? 0.02 : 0.013, map: dotTexture(), alphaTest: 0.4, color: 0x9aa6bd, transparent: true, opacity: 0.9, depthWrite: false,
  }));
  earth.add(dots);
  let drawn = positions.length / 3;

  // Fresnel rim (atmosphere), additive.
  world.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0,0.0,1.0))), 4.0); gl_FragColor = vec4(1.0, 0.74, 0.32, 1.0) * i * 0.9; }',
    }),
  ));

  // Faint stars.
  const starPos = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(25 + Math.random() * 20);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.09, color: 0x8a93a6, transparent: true, opacity: 0.55, depthWrite: false })));

  // Soweto beacon: a glowing point and expanding rings.
  const glow = glowTexture();
  const home = v3(...SOWETO, 1.006);
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  beacon.position.copy(home);
  earth.add(beacon);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 48),
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    m.position.copy(home);
    m.lookAt(home.clone().multiplyScalar(2));
    earth.add(m);
    return m;
  });

  // Great-circle arcs with a bright head, staggered and looping.
  const SEG = 64;
  const arcs = CITIES.map(([lat, lon], i) => {
    const a = home.clone().normalize(), b = v3(lat, lon).normalize();
    const ang = a.angleTo(b);
    const pts = new Float32Array((SEG + 1) * 3);
    const q = new THREE.Vector3();
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      // slerp on the sphere, lifted by a sine so long hops arc higher
      q.copy(a).multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(b.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
      q.normalize().multiplyScalar(1.005 + Math.sin(Math.PI * t) * (0.08 + 0.32 * (ang / Math.PI)));
      pts.set([q.x, q.y, q.z], s * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    head.scale.setScalar(0.07);
    earth.add(line, head);
    return { line, head, pts, offset: i * 0.55, dur: 2.6 + (i % 3) * 0.5 };
  });

  // Orientation: Africa faces the viewer and the globe sways slowly; the dive turns Soweto to the camera.
  const front = new THREE.Vector3(0, 0, 1);
  const qAfrica = new THREE.Quaternion().setFromUnitVectors(v3(2, 22).normalize(), front);
  const qSoweto = new THREE.Quaternion().setFromUnitVectors(home.clone().normalize(), front);
  const qSway = new THREE.Quaternion(), qIdle = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  let W = 0, H = 0, camZ = 4.2, base = new THREE.Vector3();
  const layout = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const narrow = W / H < 0.9;
    camZ = narrow ? 6.6 : 5.4;
    base = narrow ? new THREE.Vector3(0, 0.85, 0) : new THREE.Vector3(1.35, 0.05, 0);
  };
  layout();
  addEventListener('resize', layout);

  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const t0 = performance.now();
  let last = t0, frames = 0, sum = 0, dived = false, shown = 0;
  gsap.to({}, { duration: 1.4, onUpdate() { shown = this.progress(); } });

  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    const p = Math.min(1, scrollY / (innerHeight * 0.9));
    const on = p < 1 && !document.hidden;
    root.classList.toggle('globe-on', p < 1);
    if (!on) {
      // A fast scroll can jump straight past the dive: hide whatever frame was last drawn.
      canvas.style.opacity = '0';
      flash.style.opacity = '0';
      if (!dived && p >= 1) { dived = true; opts.onDive?.(); }
      return; // off screen: no rendering at all
    }
    if (p < 0.98) dived = false;

    // Frame guard, same as the field: over 24 ms on average, draw half the dots.
    frames++; sum += dt;
    if (frames === 90) {
      if (sum / frames > 24 && drawn > 1500) { drawn = Math.floor(drawn / 2); dotGeo.setDrawRange(0, drawn); }
      frames = 0; sum = 0;
    }

    const t = (now - t0) / 1000;
    qSway.setFromAxisAngle(yAxis, Math.sin(t * 0.12) * 0.45 + pointer.x * 0.25);
    qIdle.copy(qSway).multiply(qAfrica);
    earth.quaternion.copy(qIdle).slerp(qSoweto, smooth(0, 0.45, p));
    world.position.copy(base).multiplyScalar(1 - smooth(0, 0.4, p));
    world.position.y += pointer.y * -0.05 * (1 - p);
    const dive = smooth(0.3, 1, p);
    camera.position.set(0, 0, camZ + (1.06 - camZ) * dive * dive);
    camera.lookAt(0, 0, 0);
    world.lookAt(camera.position); // +z of the globe faces the camera, wherever the globe sits
    canvas.style.opacity = String(shown * (1 - smooth(0.88, 1, p)));
    flash.style.opacity = String(Math.max(0, 1 - Math.abs(p - 0.9) / 0.1) * 0.85);

    // Beacon pulse and rings.
    beacon.scale.setScalar(0.09 + Math.sin(t * 4) * 0.02);
    rings.forEach((r, i) => {
      const k = (t * 0.6 + i / 3) % 1;
      r.scale.setScalar(0.02 + k * 0.16);
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
    });
    // Arcs: a comet that grows from Soweto, runs to the city, then drains away.
    for (const a of arcs) {
      const k = ((t + a.offset) % (a.dur + 1.2)) / a.dur;
      const head = Math.min(1, k), tail = Math.max(0, Math.min(1, k - 0.45));
      a.line.geometry.setDrawRange(Math.floor(tail * SEG), Math.max(0, Math.ceil((head - tail) * SEG) + 1));
      const s = Math.min(SEG, Math.floor(head * SEG));
      a.head.position.set(a.pts[s * 3], a.pts[s * 3 + 1], a.pts[s * 3 + 2]);
      (a.head.material as THREE.SpriteMaterial).opacity = k <= 1 ? 1 : Math.max(0, 1 - (k - 1) * 4);
    }

    renderer.render(scene, camera);
  });
}
