// Directed scenes per hop. Each one only adds motion on top of the static page, which stays complete without it.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(ScrollTrigger, TextPlugin);
const root = document.documentElement;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') =>
  Object.assign(document.createElement(tag), { className: cls, innerHTML: html });

/** While a scene is pinned, the page route would slide past its fixed hop header, so it fades out. */
export const pinFade = (self: ScrollTrigger) => root.classList.toggle('in-pin', self.isActive);

/** Hop 4: the demo plays inside the letters, the camera dives through a stem, 2ND PLACE slams, the screens fly past. */
export function workproof() {
  const sec = document.querySelector<HTMLElement>('#workproof')!;
  const video = sec.querySelector<HTMLVideoElement>('video')!;
  const award = sec.querySelector<HTMLElement>('.award')!;
  const shots = [...sec.querySelectorAll<HTMLElement>('.shots figure')];

  const stage = el('div', 'wp-stage');
  stage.setAttribute('aria-hidden', 'true');
  const screen = el('div', 'wp-video');
  screen.append(video);
  // The letters are a canvas: the video frame is clipped into WORKPROOF each tick (no blend-mode GPU quirks).
  const mask = el('canvas', 'wp-mask') as HTMLCanvasElement;
  const dim = el('div', 'wp-dim');
  const slam = el('div', 'wp-slam', `<b>2ND PLACE</b><span>${award.querySelector('.place')!.textContent!.replace(/^2nd place, /, '')} · ${award.querySelector('.note')!.textContent}</span>`);
  const reel = el('div', 'wp-reel');
  const track = el('div', 'wp-track');
  shots.forEach((f) => {
    const p = el('figure', f.classList.contains('phone') ? 'panel device' : 'panel');
    p.innerHTML = f.innerHTML;
    p.querySelector('img')!.loading = 'eager';
    track.append(p);
  });
  reel.append(track);
  stage.append(screen, mask, dim, slam, reel);
  award.after(stage);
  // Open on the product itself (the first seconds of the demo are statistics slides).
  video.addEventListener('loadedmetadata', () => { if (video.currentTime < 1) video.currentTime = 36; }, { once: true });
  sec.classList.add('wp-staged');

  const poster = Object.assign(new Image(), { src: video.poster });
  const view = { zoom: 1, fade: 0.6, live: false };
  const ctx = mask.getContext('2d')!;
  const WORD = 'WORKPROOF';
  let W = 0, H = 0, size = 0, ox = 0, oy = 0;
  const layout = () => {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    mask.width = Math.round(W * dpr); mask.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '900 100px Archivo, sans-serif';
    size = (W * 0.9 * 100) / ctx.measureText(WORD).width;
    ctx.font = `900 ${size}px Archivo, sans-serif`;
    // Zoom origin: on the thick stem of the K, so the letter (the video window) swallows the screen.
    ox = W / 2 - ctx.measureText(WORD).width / 2 + ctx.measureText('WOR').width + ctx.measureText('K').width * 0.17;
    oy = H / 2;
  };
  const paint = () => {
    if (!view.live) return;
    const src: CanvasImageSource = video.readyState >= 2 ? video : poster;
    const sw = (src as HTMLVideoElement).videoWidth || poster.naturalWidth || 16;
    const sh = (src as HTMLVideoElement).videoHeight || poster.naturalHeight || 9;
    const k = Math.max(W / sw, H / sh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(view.zoom, view.zoom); ctx.translate(-ox, -oy);
    ctx.font = `900 ${size}px Archivo, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(WORD, W / 2, H / 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-in';
    ctx.globalAlpha = view.fade;
    try { ctx.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k); } catch { /* frame not ready */ }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, W, H);
  };
  layout();
  document.fonts.ready.then(layout);
  addEventListener('resize', layout);
  gsap.ticker.add(paint);
  ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onToggle: (s) => (view.live = s.isActive) });

  gsap.matchMedia().add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, (ctx) => {
    const wide = ctx.conditions!.wide;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: wide ? '+=260%' : '+=150%',
        pin: true, scrub: 0.6, onToggle: pinFade, invalidateOnRefresh: true,
      },
    });
    tl.fromTo(view, { fade: 0.55 }, { fade: 1, duration: 0.12 })
      .fromTo(view, { zoom: 1 }, { zoom: wide ? 70 : 90, duration: 0.5, ease: 'power3.in' })
      .set(mask, { autoAlpha: 0 })
      .fromTo(slam.children[0], { scale: 3.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.12, ease: 'expo.in' })
      .to(dim, { opacity: 0.55, duration: 0.12 }, '<')
      .fromTo(stage, { x: -14 }, { x: 0, duration: 0.08, ease: 'elastic.out(1, 0.2)' })
      .fromTo(slam.children[1], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.1 }, '<')
      .to({}, { duration: 0.15 });
    if (wide) {
      const panels = track.children;
      tl.to(slam, { yPercent: -60, autoAlpha: 0, duration: 0.2 })
        .to(dim, { opacity: 0.8, duration: 0.2 }, '<')
        .set(reel, { autoAlpha: 1 }, '<0.05')
        .fromTo(track, { x: () => innerWidth }, { x: () => -(track.scrollWidth - innerWidth * 0.55), duration: 1 }, '<0.05')
        .fromTo(panels, { rotateY: -38, z: -200 }, { rotateY: 24, z: 80, duration: 1, stagger: 0.04 }, '<');
    }
    return () => gsap.set([mask, slam, slam.children, dim, stage, track, reel], { clearProps: 'all' });
  });
}

/** Hop 3: each certification is evaluated at the gate (types out, scan, PERMIT stamp), then the gate splits open. */
export function checkpoint() {
  const sec = document.querySelector<HTMLElement>('#certifications')!;
  const gate = sec.querySelector<HTMLElement>('.wrap')!;
  const head = gate.querySelector<HTMLElement>('.acl-head')!;
  // Screen readers keep the full rule text; the typed copy is decoration.
  gate.querySelectorAll<HTMLElement>('.cert .name').forEach((n) => {
    n.insertAdjacentHTML('afterend', `<span class="sr-only">${n.textContent}</span>`);
    n.setAttribute('aria-hidden', 'true');
    n.dataset.full = n.textContent ?? '';
  });
  gate.querySelectorAll('.acl li').forEach((li) =>
    li.insertAdjacentHTML('beforeend', '<i class="scan" aria-hidden="true"></i><b class="stamp" aria-hidden="true">PERMIT</b>'));
  head.insertAdjacentHTML('beforeend', ' <span class="gate-status" aria-hidden="true">· evaluating</span>');

  // The right half of the gate is a copy that only appears when the gate splits.
  const half = gate.cloneNode(true) as HTMLElement;
  half.classList.add('gate-half');
  half.setAttribute('aria-hidden', 'true');
  half.inert = true;
  half.querySelector('h2')?.removeAttribute('data-decode');
  half.querySelector('h2')?.removeAttribute('id');
  half.querySelectorAll('[data-reveal]').forEach((e) => e.removeAttribute('data-reveal'));
  sec.append(half);
  const both = (s: string) => [...gate.querySelectorAll(s), ...half.querySelectorAll(s)];
  const lis = [gate.querySelectorAll('.acl li'), half.querySelectorAll('.acl li')];

  gsap.matchMedia().add('(min-width: 0px)', () => {
    gsap.set(half, { autoAlpha: 0 });
    gsap.set(both('.acl li'), { opacity: 0.18 });
    gsap.set(both('.cert .name'), { text: '' });
    gsap.set(both('.permit, .stamp'), { autoAlpha: 0 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, pin: true, scrub: 0.5, invalidateOnRefresh: true, onToggle: pinFade,
        start: () => (sec.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'),
        end: () => `+=${innerHeight * (innerWidth < 900 ? 1.7 : 2.1)}`,
      },
    });
    lis[0].forEach((_, i) => {
      const pair = (s: string) => [lis[0][i].querySelector(s), lis[1][i].querySelector(s)];
      const li = [lis[0][i], lis[1][i]];
      tl.to(li, { opacity: 1, duration: 0.15 })
        .call(() => both('.gate-status').forEach((s) => (s.textContent = `· evaluating ${i + 1}/4`)))
        .to(pair('.cert .name'), { text: { value: (lis[0][i].querySelector('.name') as HTMLElement).dataset.full! }, duration: 0.6 })
        .fromTo(pair('.scan'), { xPercent: -100, autoAlpha: 1 }, { xPercent: 420, duration: 0.35 }, '<0.3')
        .set(pair('.scan'), { autoAlpha: 0 })
        .fromTo(pair('.stamp'), { scale: 2.8, rotate: -24, autoAlpha: 0 }, { scale: 1, rotate: -8, autoAlpha: 1, duration: 0.12, ease: 'expo.in' })
        .to(pair('.permit'), { autoAlpha: 1, duration: 0.05 }, '<')
        .fromTo(li, { backgroundColor: 'rgba(61, 220, 151, 0.28)' }, { backgroundColor: 'rgba(61, 220, 151, 0)', duration: 0.3 })
        .fromTo([gate, half], { x: -10 }, { x: 0, duration: 0.25, ease: 'elastic.out(1, 0.25)' }, '<');
    });
    tl.call(() => both('.gate-status').forEach((s) => (s.textContent = '· 4/4 permit, open')))
      .to({}, { duration: 0.25 })
      .set(half, { autoAlpha: 1, clipPath: 'inset(0 0 0 50%)' })
      .set(gate, { clipPath: 'inset(0 50% 0 0)' })
      .to(gate, { xPercent: -55, autoAlpha: 0, duration: 0.8, ease: 'power2.in' })
      .to(half, { xPercent: 55, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, '<');
    return () => gsap.set([gate, half, ...both('.acl li, .permit, .stamp, .scan, .cert .name')], { clearProps: 'all' });
  });
}
