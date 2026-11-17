// The network field: a fixed Canvas 2D cloud of nodes and links behind the page.
// Pointer is a signal source, scroll speed is warp, the first scroll dives into a node,
// and at the destination the nodes fly together to spell YASEEN.
import { gsap } from 'gsap';
import type Lenis from 'lenis';

type Node = { x: number; y: number; z: number; tx: number; ty: number; sx: number; sy: number; sz: number; on: boolean };
type Packet = { a: number; b: number; t: number; v: number };

const AMBER = '255,178,36';
const MUTED = '138,147,166';
// Colour strings cached per 5% alpha step, so drawing a node allocates nothing.
const shade = (rgb: string) => Array.from({ length: 21 }, (_, i) => `rgba(${rgb},${i / 20})`);
const AMBERS = shade(AMBER), GREYS = shade(MUTED);
const pick = (set: string[], a: number) => set[Math.max(0, Math.min(20, Math.round(a * 20)))];

export function field(lenis: Lenis) {
  const cv = document.createElement('canvas');
  cv.className = 'field';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d', { alpha: true })!;

  let W = 0, H = 0, dpr = 1;
  let nodes: Node[] = [];
  let links: [number, number][] = [];
  let letterDots: { x: number; y: number }[] = [];
  let dotR = 2;
  let packets: Packet[] = [];
  let targets: { x: number; y: number }[] = [];
  let count = 0;
  const state = { morph: 0, intro: 0 };
  const pointer = { x: -9999, y: -9999 };
  let angle = 0, warp = 0, last = performance.now();
  let frames = 0, slowSum = 0;

  function seed(n: number) {
    count = n;
    nodes = Array.from({ length: n }, () => ({
      x: (Math.random() * 2 - 1) * 2.4, y: (Math.random() * 2 - 1) * 1.5, z: (Math.random() * 2 - 1) * 2,
      tx: 0, ty: 0, sx: 0, sy: 0, sz: 1, on: false,
    }));
    // Each node links to its two nearest neighbours (computed once; n is small).
    links = [];
    nodes.forEach((p, i) => {
      const near = nodes
        .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const o of near) if (o.j > i) links.push([i, o.j]);
    });
    packets = Array.from({ length: Math.round(n / 14) }, () => newPacket());
    assignTargets();
  }

  function newPacket(): Packet {
    const [a, b] = links[(Math.random() * links.length) | 0] ?? [0, 0];
    return { a, b, t: 0, v: 0.004 + Math.random() * 0.01 };
  }

  /** Sample points from YASEEN drawn to an offscreen canvas; every node gets one. */
  function assignTargets() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d')!;
    const size = Math.min(W * (W < 600 ? 0.19 : 0.15), H * 0.22);
    o.font = `900 ${size}px Archivo, Arial Black, sans-serif`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillText('YASEEN', W / 2, H * 0.7); // lower band: the contact links land there only after it loosens
    const data = o.getImageData(0, 0, W, H).data;
    const ink = (x: number, y: number) => data[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 128;
    // Pick a grid spacing that yields about one point per node, so the letters read as even dots.
    let area = 0;
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if (ink(x, y)) area += 16;
    if (!area) return;
    const step = Math.max(3, Math.sqrt(area / nodes.length));
    const pts: { x: number; y: number }[] = [];
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) if (ink(x, y)) pts.push({ x, y });
    gsap.utils.shuffle(pts);
    targets = pts;
    nodes.forEach((n, i) => {
      const p = pts[i % pts.length];
      n.tx = p.x;
      n.ty = p.y;
    });
    // A fine, even dot grid fills the letters once the nodes land, so the name reads at any width.
    const fine = Math.max(3, size / 15);
    dotR = Math.max(1.6, fine * 0.42);
    letterDots = [];
    for (let y = fine / 2; y < H; y += fine) for (let x = fine / 2; x < W; x += fine) if (ink(x, y)) letterDots.push({ x, y });
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(W * H > 1e6 ? 1.25 : 1.5, devicePixelRatio || 1); // big screens get fewer pixels per node

    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // About 90 nodes on a phone, 260 on a desktop.
    const n = Math.round(Math.min(260, Math.max(90, ((W * H) / (1440 * 900)) * 260)));
    if (n !== count) seed(n); else assignTargets();
  }

  function draw(now: number) {
    const dt = Math.min(64, now - last);
    last = now;
    const rc = document.documentElement.classList;
    // Only one heavy canvas at a time: the field rests behind the globe and the WorkProof stage.
    if (document.hidden || rc.contains('field-rest') || rc.contains('globe-on')) return;

    // Budget: if frames average over 24 ms, halve the node count (once warmed up).
    frames++; slowSum += dt;
    if (frames === 90) {
      if (slowSum / frames > 24 && count > 50) seed(Math.round(count / 2));
      frames = 0; slowSum = 0;
    }

    const v = Math.abs(lenis.velocity);
    warp += (Math.min(60, v) - warp) * 0.08;
    angle += dt * 0.00005 * (1 + warp * 0.05);
    const dive = Math.min(1, scrollY / (H * 0.9));
    const fly = scrollY * 0.0012;
    const f = Math.max(W, H) * 0.62 * (1 + dive * dive * 0.8);
    const cx = W / 2, cy = H / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const m = state.morph;

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = state.intro;

    // Project: rotate around Y, fly forward with scroll (wrapping depth), perspective divide.
    for (const n of nodes) {
      const x = n.x * ca - n.z * sa;
      let z = n.x * sa + n.z * ca;
      z = ((z - fly + 2) % 4 + 4) % 4 - 2; // wrap depth into [-2, 2)
      const s = f / (3.2 + z);
      let sx = cx + x * s, sy = cy + n.y * s;
      if (m > 0) { sx += (n.tx - sx) * m; sy += (n.ty - sy) * m; }
      n.sx = sx; n.sy = sy; n.sz = s / f; // sz ~ nearness, 0.2 (far) .. 0.85 (near)
      const dx = sx - pointer.x, dy = sy - pointer.y;
      n.on = dx * dx + dy * dy < 150 * 150;
    }

    // Links, faded by depth and dissolved while the name forms.
    const linkA = 0.22 * (1 - m);
    if (linkA > 0.01) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${MUTED},${linkA})`;
      ctx.beginPath();
      for (const [a, b] of links) {
        const p = nodes[a], q = nodes[b];
        if (Math.abs(p.sz - q.sz) > 0.25) continue; // one end wrapped to the far side
        ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy);
      }
      ctx.stroke();
    }

    if (m > 0.6) {
      ctx.fillStyle = pick(AMBERS, ((m - 0.6) / 0.4) * 0.9);
      for (const d of letterDots) ctx.fillRect(d.x - dotR / 2, d.y - dotR / 2, dotR, dotR);
    }

    // Pointer as a signal source: nearby nodes link to it.
    ctx.strokeStyle = `rgba(${AMBER},0.35)`;
    ctx.beginPath();
    for (const n of nodes) if (n.on) { ctx.moveTo(n.sx, n.sy); ctx.lineTo(pointer.x, pointer.y); }
    ctx.stroke();

    // Nodes; with warp they stretch into streaks toward the viewer.
    const streak = warp * 0.9 * (1 - m);
    for (const n of nodes) {
      const near = n.sz;
      const r = (0.6 + near * 2.2) * (1 - m) + m * 3.2;
      const a = n.on || m > 0.5 ? 0.95 : 0.25 + near * 0.6;
      const col = pick(n.on || m > 0.5 ? AMBERS : GREYS, a);
      if (streak > 1) {
        const ux = n.sx - cx, uy = n.sy - cy;
        const k = (streak * near * 0.02);
        ctx.strokeStyle = col;
        ctx.lineWidth = r;
        ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(n.sx + ux * k, n.sy + uy * k); ctx.stroke();
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(n.sx - r / 2, n.sy - r / 2, r, r);
      }
    }

    // Packets racing along links.
    if (m < 0.6) {
      for (const p of packets) {
        p.t += p.v * (1 + warp * 0.08) * (dt / 16);
        if (p.t >= 1) Object.assign(p, newPacket());
        const a = nodes[p.a], b = nodes[p.b];
        if (!a || !b || Math.abs(a.sz - b.sz) > 0.25) continue;
        const x = a.sx + (b.sx - a.sx) * p.t, y = a.sy + (b.sy - a.sy) * p.t;
        ctx.fillStyle = `rgba(${AMBER},0.18)`;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(${AMBER},1)`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
      }
    }

    // Hero -> hop 1: the camera dives into one node, which opens into the page.
    if (dive > 0 && dive < 1 && !rc.contains('has-globe')) {
      const e = dive * dive * dive;
      const R = 4 + e * Math.hypot(W, H);
      ctx.globalAlpha = state.intro * (1 - dive);
      ctx.strokeStyle = `rgba(${AMBER},0.9)`;
      ctx.lineWidth = 1 + e * 6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(${AMBER},${0.06 * (1 - dive)})`;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  addEventListener('resize', () => resize());
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; pointer.x = t.clientX; pointer.y = t.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
  gsap.ticker.add(() => draw(performance.now()));
  document.fonts.ready.then(assignTargets); // re-sample once Archivo is in

  return {
    show: () => gsap.to(state, { intro: 1, duration: 1.6, ease: 'power2.out' }),
    /** Spell YASEEN, hold it for 2.4 s, then loosen back into a network. Returns the timeline. */
    finale: () =>
      gsap.timeline()
        .to(state, { morph: 1, duration: 1.6, ease: 'power3.inOut', overwrite: true })
        .addLabel('hold')
        .to(state, { morph: 0, duration: 2, ease: 'power2.inOut' }, 'hold+=2.4'),
    reset: () => gsap.to(state, { morph: 0, duration: 1, overwrite: true }),
    targets: () => targets.length,
  };
}
