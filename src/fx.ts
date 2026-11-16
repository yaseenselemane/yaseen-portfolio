// Global motion layer: preloader, decoding headings, cursor, magnetic buttons, hop numerals, tint, mini-map.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

export const HEX = '0123456789ABCDEF';
export const fine = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;

/** Headings arrive as packets: lines rise from a mask while hex glyphs decode into the real letters. */
export function decode(el: HTMLElement, onReady?: (tl: gsap.core.Timeline) => void) {
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'ln',
    aria: 'auto',
    autoSplit: true,
    onSplit(self) {
      const tl = gsap.timeline({ paused: true });
      self.lines.forEach((ln, i) => {
        const text = ln.textContent ?? '';
        tl.from(ln, { yPercent: 110, duration: 0.9, ease: 'expo.out' }, i * 0.09)
          .to(ln, { duration: 1.2, scrambleText: { text, chars: HEX, revealDelay: 0.25, speed: 0.7 }, ease: 'none' }, i * 0.09);
      });
      el.style.visibility = 'visible';
      onReady?.(tl);
      return tl;
    },
  });
}

/** Black screen, real load counter, then the packet drops to become the route origin. */
export function preloader(originPoint: () => { x: number; y: number }): Promise<void> {
  const el = document.querySelector<HTMLElement>('.preloader')!;
  if (!root.classList.contains('preload')) return Promise.resolve();
  const n = el.querySelector<HTMLElement>('[data-pre-n]')!;
  const dot = el.querySelector<HTMLElement>('.pre-packet')!;
  const t0 = performance.now();
  // Real work: every font face the page asked for, plus the window load event.
  let pageLoaded = document.readyState === 'complete';
  addEventListener('load', () => (pageLoaded = true), { once: true });
  return new Promise((resolve) => {
    const step = () => {
      const faces = [...document.fonts];
      const done = faces.filter((f) => f.status === 'loaded').length + (pageLoaded ? 1 : 0);
      const pct = Math.round((done / (faces.length + 1)) * 100);
      n.textContent = `${pct}%`;
      const t = performance.now() - t0;
      if ((pct >= 100 && t > 500) || t > 1500) return finish();
      requestAnimationFrame(step);
    };
    const finish = () => {
      n.textContent = '100%';
      const o = originPoint();
      const r = dot.getBoundingClientRect();
      gsap.timeline({
        onComplete: () => {
          root.classList.remove('preload');
          try { sessionStorage.setItem('preloaded', '1'); } catch { /* private mode */ }
          resolve();
        },
      })
        .to(el.querySelector('p'), { opacity: 0, y: -12, duration: 0.25 })
        .to(dot, { x: o.x - (r.left + r.width / 2), y: o.y - (r.top + r.height / 2), scale: 0.6, duration: 0.45, ease: 'expo.in' }, '<')
        .to(el, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.3 })
        .set(el, { display: 'none' });
    };
    requestAnimationFrame(step);
  });
}

/** Amber packet cursor with a trailing ring that grows and labels links. Pointer devices only. */
export function cursor() {
  if (!fine) return;
  const dot = Object.assign(document.createElement('div'), { className: 'cur-dot' });
  const ring = Object.assign(document.createElement('div'), { className: 'cur-ring' });
  const label = document.createElement('span');
  ring.append(label);
  document.body.append(ring, dot);
  root.classList.add('has-cursor');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('a, button, [data-cursor]');
    ring.classList.toggle('big', !!t);
    label.textContent = t ? (t.dataset.cursor ?? (t.tagName === 'A' ? 'OPEN' : '')) : '';
  });
  document.addEventListener('pointerleave', () => gsap.set([dot, ring], { opacity: 0 }));
  document.addEventListener('pointerenter', () => gsap.set([dot, ring], { opacity: 1 }));
}

/** Elements drift toward the pointer while it is over them. */
export function magnetic(els: Iterable<HTMLElement>, pull = 0.35) {
  if (!fine) return;
  for (const el of els) {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * pull);
      y((e.clientY - r.top - r.height / 2) * pull);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  }
}

/** Outlined 01..08 behind each hop, on their own scroll speed and stretched by scroll velocity. */
export function numerals(lenis: Lenis) {
  const els = gsap.utils.toArray<HTMLElement>('.numeral');
  els.forEach((el) => {
    gsap.fromTo(el, { yPercent: 30 }, {
      yPercent: -60, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  const stretch = gsap.utils.toArray<HTMLElement>('.numeral, [data-stretch]');
  let w = 100;
  gsap.ticker.add(() => {
    const target = 100 + Math.min(25, Math.abs(lenis.velocity) * 0.9);
    const next = w + (target - w) * 0.12;
    if (Math.abs(next - w) < 0.05) return;
    w = next;
    for (const el of stretch) el.style.fontVariationSettings = `'wdth' ${w.toFixed(1)}`;
  });
}

/** Each hop shifts the background tint so the journey has places. */
export function tints() {
  const tint = ['#0B0E14', '#0B0F15', '#0D0F12', '#0C0D15', '#0F0D0C', '#0A1013', '#0C0E16', '#0E0C10', '#0B0E14'];
  gsap.utils.toArray<HTMLElement>('.hop').forEach((h, i) => {
    ScrollTrigger.create({
      trigger: h, start: 'top 50%', end: 'bottom 50%',
      onToggle: (s) => s.isActive && gsap.to(root, { '--tint': tint[i + 1], duration: 1.2, overwrite: true }),
      onLeaveBack: () => i === 0 && gsap.to(root, { '--tint': tint[0], duration: 1.2, overwrite: true }),
    });
  });
}

/** HUD mini-map: one dot per hop, filled as reached. Clicks are plain anchors, which Lenis glides to. */
export function minimap() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.minimap a')];
  return (i: number) => links[i]?.classList.add('on');
}
