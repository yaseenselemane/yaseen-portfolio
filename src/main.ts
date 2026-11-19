import './style.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { decode, preloader, cursor, magnetic, numerals, tints, minimap, fine } from './fx.ts';
import { field } from './field.ts';
import { sound } from './sound.ts';
import { workproof, checkpoint, devland, patchCable, buildRows, labsCapture } from './scenes.ts';

declare global {
  interface Window { __route?: boolean }
}
window.__route = true;
gsap.registerPlugin(ScrollTrigger, TextPlugin);

const SVG = 'http://www.w3.org/2000/svg';
const root = document.documentElement;
const reduce = !root.classList.contains('motion');
const $ = <T extends Element>(s: string, r: ParentNode = document) => r.querySelector(s) as T;

/** Run one piece of the motion layer; if it throws, show everything rather than leave it hidden. */
export function safe(name: string, fn: () => void) {
  try { fn(); } catch (e) { root.classList.add('fx-failed'); console.error(`[${name}]`, e); }
}

// ---------- motion switch (works in both modes) ----------
const setMotion = (v: 'on' | 'off') => {
  let stored = true;
  try { localStorage.setItem('motion', v); } catch { stored = false; }
  const u = new URL(location.href);
  u.searchParams.delete('motion');
  if (v === 'on' && !stored) u.search = '?motion'; // storage blocked: fall back to the URL switch
  location.replace(u.href);
};
document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach((b) =>
  b.addEventListener('click', () => setMotion(b.dataset.motion as 'on' | 'off')));
if (reduce) {
  const ask = $<HTMLElement>('.motion-ask');
  let pref: string | null = null;
  try { pref = localStorage.getItem('motion'); } catch { /* ignore */ }
  if (pref === 'off') $<HTMLElement>('[data-ask-text]').textContent = 'Motion is off.';
  ask.hidden = false;
}

// ---------- the route ----------
const page = $<HTMLElement>('.page');
const svg = $<SVGSVGElement>('.route');
const track = $<SVGPathElement>('.track', svg);
const litLayer = $<SVGGElement>('.lit-chunks', svg);
// The lit route is one short path per hop, so a scroll frame only repaints the piece under the packet,
// not a path as tall as the whole page.
// With motion on, the route is drawn on a screen-sized canvas instead: each scroll frame paints only the
// visible pixels. A page-tall SVG repainted every frame was the main cause of dropped frames on desktop.
const rcv = reduce ? null : Object.assign(document.createElement('canvas'), { className: 'route route-canvas' });
const rctx = rcv?.getContext('2d') ?? null;
if (rcv) { rcv.setAttribute('aria-hidden', 'true'); page.prepend(rcv); }
let trackPath: Path2D | null = null;
let routePts: { x: number; y: number }[] = [];
let chunks: { lit: SVGPathElement; glow: SVGPathElement; start: number; len: number; off: string }[] = [];
const packet = $<SVGCircleElement>('.packet', svg);
const halo = $<SVGCircleElement>('.halo', svg);
const cue = $<SVGCircleElement>('.cue', svg);
const nodeLayer = $<SVGGElement>('.nodes', svg);
const originEl = $<HTMLElement>('[data-origin]');
const hops = [...document.querySelectorAll<HTMLElement>('.hop')];
const hudHop = $<HTMLElement>('[data-hud-hop]');
const hudT = $<HTMLElement>('[data-hud-t]');
const total = $<HTMLElement>('[data-total]');

// Samples map path length <-> y so the tip can follow the scroll.
let len = 0;
let xs = new Float32Array(0);
let ys = new Float32Array(0);
let nodeLens: number[] = [];
let nodes: SVGCircleElement[] = [];
let y0 = 0;
const reached = hops.map(() => false);
let onReach: (i: number) => void = () => {};

let startedAt = 0;
let doneAt = 0;
export const elapsed = () => (startedAt ? ((doneAt || performance.now()) - startedAt) / 1000 : 0);

function rel(el: Element) {
  const p = page.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
}

function build() {
  const desktop = innerWidth >= 900;
  const p = page.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${p.width} ${p.height}`);
  svg.setAttribute('width', String(p.width));
  svg.setAttribute('height', String(p.height));

  const wrap = rel(originEl.parentElement!);
  const xL = wrap.x + (desktop ? 40 : 24);
  const xR = wrap.x + wrap.w - 40;
  const o = rel(originEl);
  y0 = o.y + o.h / 2;

  let d = `M${xL},${y0}`;
  let cd = d;
  const cds: string[] = [];
  let cx = xL;
  const pts = [{ x: xL, y: y0 }];
  hops.forEach((h, i) => {
    const x = desktop && i % 2 ? xR : xL; // even hops ride the right lane on desktop
    // A pinned hop sits fixed inside its spacer; measure from the spacer so geometry ignores the pin state.
    const box = h.parentElement?.classList.contains('pin-spacer') ? h.parentElement : h;
    const top = rel(box).y;
    const tr = h.querySelector('[data-node]')!.getBoundingClientRect();
    const ny = top + (tr.top - h.getBoundingClientRect().top) + tr.height / 2;
    if (x !== cx) {
      // Cross lanes inside the section's empty top padding, never over text.
      const a = top + 32, b = ny - 56, k = (b - a) / 2;
      const seg = ` L${cx},${a} C${cx},${a + k} ${x},${b - k} ${x},${b}`;
      d += seg; cd += seg;
      cx = x;
    }
    d += ` L${x},${ny}`;
    cds.push(cd + ` L${x},${ny}`);
    cd = `M${x},${ny}`;
    pts.push({ x, y: ny });
  });
  track.setAttribute('d', d);
  trackPath = new Path2D(d);
  routePts = pts;
  len = track.getTotalLength();
  litLayer.replaceChildren();
  let start = 0;
  chunks = cds.map((cd) => {
    const [glow, lit] = ['lit-glow', 'lit'].map((cls) => {
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('class', cls);
      p.setAttribute('d', cd);
      litLayer.append(p);
      return p;
    });
    const L = lit.getTotalLength();
    lit.style.strokeDasharray = glow.style.strokeDasharray = `${L} ${L}`;
    lit.style.strokeDashoffset = glow.style.strokeDashoffset = String(L);
    const c = { lit, glow, start, len: L, off: String(L) };
    start += L;
    return c;
  });

  const n = Math.max(2, Math.ceil(len / 24)); // 24 px samples: linear interpolation between them is exact on straight runs
  xs = new Float32Array(n + 1);
  ys = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const q = track.getPointAtLength((i / n) * len);
    xs[i] = q.x;
    ys[i] = q.y;
  }

  nodeLayer.replaceChildren();
  nodes = pts.map((q, i) => {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('cx', String(q.x));
    c.setAttribute('cy', String(q.y));
    c.setAttribute('r', i ? '6' : '4');
    nodeLayer.append(c);
    return c;
  });
  cue.setAttribute('cx', String(xL));
  cue.setAttribute('cy', String(y0));
  nodeLens = pts.map((q) => lenAtY(q.y));
  update();
}

function lenAtY(y: number) {
  if (y <= ys[0]) return 0;
  const last = ys.length - 1;
  if (y >= ys[last]) return len;
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (ys[m] < y) lo = m; else hi = m;
  }
  const f = ys[hi] === ys[lo] ? 0 : (y - ys[lo]) / (ys[hi] - ys[lo]);
  return ((lo + f) / last) * len;
}

function pointAt(l: number) {
  const last = xs.length - 1;
  const i = Math.min(last, (l / len) * last);
  const lo = Math.floor(i), hi = Math.min(last, lo + 1), f = i - lo;
  return { x: xs[lo] + (xs[hi] - xs[lo]) * f, y: ys[lo] + (ys[hi] - ys[lo]) * f };
}

function update() {
  if (!len) return;
  if (reduce) {
    for (const c of chunks) c.lit.style.strokeDashoffset = '0';
    nodes.forEach((c) => c.classList.add('on'));
    return;
  }
  const s = scrollY, vh = innerHeight;
  const pageTop = page.getBoundingClientRect().top + s;
  // Tip starts on the hero prompt and eases into following 60% of the viewport over the first screen.
  const startV = y0 + pageTop;
  const tip = s - pageTop + startV + (0.6 * vh - startV) * Math.min(1, s / vh);
  const atBottom = s >= root.scrollHeight - vh - 2;
  const l = atBottom ? len : lenAtY(tip);

  for (const c of chunks) {
    const off = String(Math.round(Math.min(c.len, Math.max(0, c.start + c.len - l))));
    if (off !== c.off) { c.off = off; c.lit.style.strokeDashoffset = c.glow.style.strokeDashoffset = off; }
  }
  const q = pointAt(l);
  if (rctx) drawRoute(l, q);
  else for (const c of [packet, halo]) { c.setAttribute('cx', String(q.x)); c.setAttribute('cy', String(q.y)); }

  nodes[0]?.classList.add('on');
  hops.forEach((h, i) => {
    if (reached[i] || l < nodeLens[i + 1] - 1) return;
    reached[i] = true;
    nodes[i + 1].classList.add('on');
    h.querySelector('[data-t]')!.textContent = `${elapsed().toFixed(1)} s`;
    onReach(i);
    if (i === hops.length - 1) {
      doneAt = performance.now();
      total.querySelector('b')!.textContent = elapsed().toFixed(1);
      total.hidden = false;
      tick();
      dispatchEvent(new CustomEvent('trace-complete', { detail: elapsed() }));
    }
  });
}

function drawRoute(l: number, q: { x: number; y: number }) {
  if (!rcv || !rctx || !trackPath) return;
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (rcv.width !== Math.round(W * dpr) || rcv.height !== Math.round(H * dpr)) {
    rcv.width = Math.round(W * dpr); rcv.height = Math.round(H * dpr);
  }
  const r = page.getBoundingClientRect();
  const c = rctx;
  c.setTransform(dpr, 0, 0, dpr, r.left * dpr, r.top * dpr); // page coordinates -> screen
  c.clearRect(-r.left, -r.top, W, H);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = 1.5; c.strokeStyle = '#232a38';
  c.stroke(trackPath);
  if (l > 0) {
    c.setLineDash([l, len + 10]);
    c.lineWidth = 8; c.strokeStyle = 'rgba(255,178,36,0.16)'; c.stroke(trackPath);
    c.lineWidth = 1.5; c.strokeStyle = '#ffb224'; c.stroke(trackPath);
    c.setLineDash([]);
  }
  routePts.forEach((p, i) => {
    const on = nodes[i]?.classList.contains('on');
    if (on) { c.fillStyle = 'rgba(255,178,36,0.22)'; c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.fill(); }
    c.beginPath(); c.arc(p.x, p.y, i ? 6 : 4, 0, 7);
    c.fillStyle = on ? '#ffb224' : '#0b0e14'; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = on ? '#ffb224' : '#8a93a6'; c.stroke();
  });
  if (!startedAt) {
    // Scroll cue: a ring pulsing out of the origin until the first scroll.
    const k = (performance.now() % 1600) / 1600;
    c.globalAlpha = 1 - k; c.lineWidth = 1.5; c.strokeStyle = '#ffb224';
    c.beginPath(); c.arc(routePts[0].x, routePts[0].y, 6 * (0.6 + 2.6 * k), 0, 7); c.stroke();
    c.globalAlpha = 1;
  }
  c.fillStyle = 'rgba(255,178,36,0.18)'; c.beginPath(); c.arc(q.x, q.y, 18, 0, 7); c.fill();
  c.fillStyle = '#ffb224'; c.beginPath(); c.arc(q.x, q.y, 5, 0, 7); c.fill();
}

function tick() {
  hudHop.textContent = `hop ${reached.filter(Boolean).length}/${hops.length}`;
  hudT.textContent = `${elapsed().toFixed(1)} s`;
}

// Rebuild once per burst of size changes, and only when the size really changed: a rebuild samples the whole route.
let lastSize = '', buildTimer = 0;
new ResizeObserver(([e]) => {
  const size = `${Math.round(e.contentRect.width)}x${Math.round(e.contentRect.height)}`;
  if (size === lastSize) return;
  const first = !lastSize;
  lastSize = size;
  clearTimeout(buildTimer);
  if (first) build(); else buildTimer = window.setTimeout(build, 180);
}).observe(page);

// ---------- the full experience ----------
if (!reduce) {
  const lenis = new Lenis({ lerp: 0.16, anchors: { duration: 1.2 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => { lenis.raf(t * 1000); sound.speed(lenis.velocity); });
  gsap.ticker.lagSmoothing(0);

  addEventListener('scroll', () => {
    if (!startedAt && scrollY > 0) { startedAt = performance.now(); root.classList.add('scrolled'); }
    update();
  }, { passive: true });
  setInterval(() => { if (startedAt && !doneAt) tick(); }, 100);
  gsap.ticker.add(() => { if (!startedAt) update(); }); // keeps the scroll cue pulsing until the first scroll

  // Copy rises in from a slight blur, once.
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 70)),
  });

  let net: ReturnType<typeof field> | undefined;
  safe('field', () => { net = field(lenis); });

  // The globe is its own lazy chunk: only with motion on and working WebGL. The headline never waits for it.
  const webgl = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  })();
  if (webgl) {
    import('./globe.ts')
      .then((m) => m.globe({ onDive: () => sound.whoosh(0.45) }))
      .catch((e) => { root.classList.remove('has-globe', 'globe-on'); console.error('[globe]', e); });
  }

  // Destination: the nodes spell YASEEN, the summary types out with the real time, the contact links land last.
  // Coming back to the destination replays the name; the copy dims during the hold so the letters read.
  safe('destination', () => {
    const [summary, reply, contact] = gsap.utils.toArray<HTMLElement>('[data-dest]');
    gsap.set([reply, ...contact.children], { opacity: 0, y: 40 });
    gsap.set(summary, { opacity: 0 });
    let done = false;
    addEventListener('trace-complete', ((e: CustomEvent<number>) => {
      const text = `Trace complete. 8 hops, ${e.detail.toFixed(1)} s, 0% packet loss.`;
      sound.swell();
      const tl = net?.finale() ?? gsap.timeline().addLabel('hold');
      // Hold the summary's height while it retypes, so the page never resizes mid-finale.
      tl.set(summary, { minHeight: summary.offsetHeight }, 0)
        .set(summary, { opacity: 1, text: '' }, 1.2)
        .to(summary, { text, duration: text.length * 0.035, ease: 'none' }, 1.2)
        .to(reply, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 'hold+=2.4')
        .to(contact.children, { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'elastic.out(1, 0.6)' }, '>-0.4')
        .add(() => (done = true));
    }) as EventListener, { once: true });
    ScrollTrigger.create({
      trigger: '#destination', start: 'top 40%',
      onEnter: () => { if (!done || !net) return; sound.swell(); net.finale().to([summary, reply, contact], { opacity: 0.12, duration: 0.6 }, 0).to([summary, reply, contact], { opacity: 1, duration: 0.8 }, 'hold+=2.4'); },
      onLeaveBack: () => net?.reset(),
    });
  });

  safe('devland', devland);
  safe('checkpoint', checkpoint);
  safe('workproof', workproof);
  safe('patch', patchCable);
  safe('builds', () => buildRows(fine));
  safe('labs', () => labsCapture(() => innerWidth >= 900));
  // Sound toggle: off by default, remembered. The click itself is the gesture that lets audio start.
  safe('sound', () => {
    const b = $<HTMLButtonElement>('[data-sound]');
    let stored = false;
    try { stored = localStorage.getItem('sound') === 'on'; } catch { /* storage blocked */ }
    const show = (v: boolean) => { b.textContent = v ? 'sound on' : 'sound off'; b.setAttribute('aria-pressed', String(v)); };
    show(stored);
    b.addEventListener('click', () => { sound.set(b.getAttribute('aria-pressed') !== 'true'); show(sound.on); });
  });

  safe('cursor', cursor);
  safe('magnetic', () => magnetic(document.querySelectorAll<HTMLElement>('.btn, .big')));
  safe('numerals', () => numerals(lenis));
  safe('tints', tints);
  safe('minimap', () => {
    const mark = minimap();
    // Each arrival sweeps an amber scan line down the screen (under 600 ms, never blocks scroll).
    const wipe = Object.assign(document.createElement('div'), { className: 'wipe' });
    wipe.setAttribute('aria-hidden', 'true');
    document.body.append(wipe);
    onReach = (i) => {
      mark(i);
      sound.tick();
      sound.whoosh(0.12);
      gsap.fromTo(wipe, { yPercent: -100, autoAlpha: 1 }, { yPercent: 100 + 100 * (innerHeight / wipe.offsetHeight), duration: 0.55, ease: 'power2.inOut', overwrite: true, onComplete: () => gsap.set(wipe, { autoAlpha: 0 }) });
      dispatchEvent(new CustomEvent('hop-reached', { detail: i }));
    };
  });

  // Headings: hero decodes after the preloader, hop titles as they arrive.
  const pre = preloader(() => {
    const r = svg.getBoundingClientRect();
    return { x: r.left + Number(cue.getAttribute('cx')), y: r.top + y0 };
  }).catch(() => root.classList.remove('preload'));
  pre.then(() => net?.show());
  document.fonts.ready.then(() => safe('decode', () => {
    decode($<HTMLElement>('h1'), (tl) => { pre.then(() => tl.play()); });
    document.querySelectorAll<HTMLElement>('h2[data-decode]').forEach((h2) =>
      decode(h2, (tl) => ScrollTrigger.create({ trigger: h2, start: 'top 96%', once: true, onEnter: () => tl.play() })));
  }));

  // Demo video plays only while on screen.
  const video = document.querySelector<HTMLVideoElement>('video[data-autoplay]');
  if (video) {
    video.controls = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => (video.controls = true));
      else video.pause();
    }, { threshold: 0.2 }).observe(video);
  }
}
