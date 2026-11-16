import './style.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { decode, preloader, cursor, magnetic, numerals, tints, minimap } from './fx.ts';
import { field } from './field.ts';
import { workproof } from './scenes.ts';

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
const lit = $<SVGPathElement>('.lit', svg);
const glow = $<SVGPathElement>('.lit-glow', svg);
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
      d += ` L${cx},${a} C${cx},${a + k} ${x},${b - k} ${x},${b}`;
      cx = x;
    }
    d += ` L${x},${ny}`;
    pts.push({ x, y: ny });
  });
  for (const el of [track, lit, glow]) el.setAttribute('d', d);
  len = track.getTotalLength();
  lit.style.strokeDasharray = glow.style.strokeDasharray = `${len} ${len}`;

  const n = Math.max(2, Math.ceil(len / 6));
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
    lit.style.strokeDashoffset = '0';
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

  lit.style.strokeDashoffset = glow.style.strokeDashoffset = String(len - l);
  const q = pointAt(l);
  for (const c of [packet, halo]) { c.setAttribute('cx', String(q.x)); c.setAttribute('cy', String(q.y)); }

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

function tick() {
  hudHop.textContent = `hop ${reached.filter(Boolean).length}/${hops.length}`;
  hudT.textContent = `${elapsed().toFixed(1)} s`;
}

new ResizeObserver(() => build()).observe(page);

// ---------- the full experience ----------
if (!reduce) {
  const lenis = new Lenis({ anchors: { duration: 1.6 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  addEventListener('scroll', () => {
    if (!startedAt && scrollY > 0) { startedAt = performance.now(); root.classList.add('scrolled'); }
    update();
  }, { passive: true });
  setInterval(() => { if (startedAt && !doneAt) tick(); }, 100);

  // Copy rises in from a slight blur, once.
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 70)),
  });

  let net: ReturnType<typeof field> | undefined;
  safe('field', () => { net = field(lenis); });

  // Destination: the nodes spell YASEEN, the summary types out with the real time, the contact links land last.
  safe('destination', () => {
    const [summary, reply, contact] = gsap.utils.toArray<HTMLElement>('[data-dest]');
    gsap.set([reply, ...contact.children], { opacity: 0, y: 40 });
    gsap.set(summary, { opacity: 0 });
    addEventListener('trace-complete', ((e: CustomEvent<number>) => {
      const text = `Trace complete. 8 hops, ${e.detail.toFixed(1)} s, 0% packet loss.`;
      const tl = net?.finale() ?? gsap.timeline();
      tl.set(summary, { opacity: 1, text: '' }, 1.2)
        .to(summary, { text, duration: text.length * 0.035, ease: 'none' }, 1.2)
        .to(reply, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '>-0.2')
        .to(contact.children, { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'elastic.out(1, 0.6)' }, '>-0.4');
    }) as EventListener, { once: true });
  });

  safe('workproof', workproof);
  safe('cursor', cursor);
  safe('magnetic', () => magnetic(document.querySelectorAll<HTMLElement>('.btn, .big')));
  safe('numerals', () => numerals(lenis));
  safe('tints', tints);
  safe('minimap', () => { onReach = minimap(); });

  // Headings: hero decodes after the preloader, hop titles as they arrive.
  const pre = preloader(() => {
    const r = svg.getBoundingClientRect();
    return { x: r.left + Number(cue.getAttribute('cx')), y: r.top + y0 };
  }).catch(() => root.classList.remove('preload'));
  pre.then(() => net?.show());
  document.fonts.ready.then(() => safe('decode', () => {
    decode($<HTMLElement>('h1'), (tl) => { pre.then(() => tl.play()); });
    document.querySelectorAll<HTMLElement>('h2[data-decode]').forEach((h2) =>
      decode(h2, (tl) => ScrollTrigger.create({ trigger: h2, start: 'top 85%', once: true, onEnter: () => tl.play() })));
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
