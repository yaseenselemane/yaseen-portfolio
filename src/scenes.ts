// Directed scenes per hop. Each one only adds motion on top of the static page, which stays complete without it.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Draggable } from 'gsap/Draggable';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrollTrigger, TextPlugin, DrawSVGPlugin, MotionPathPlugin, Draggable, ScrambleTextPlugin);
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
    const dpr = 0.75; // the demo video is 960 px wide; more canvas pixels would only cost frames
    W = innerWidth; H = innerHeight;
    last = '';
    mask.width = Math.round(W * dpr); mask.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '900 100px Archivo, sans-serif';
    size = (W * 0.9 * 100) / ctx.measureText(WORD).width;
    ctx.font = `900 ${size}px Archivo, sans-serif`;
    // Zoom origin: on the thick stem of the K, so the letter (the video window) swallows the screen.
    ox = W / 2 - ctx.measureText(WORD).width / 2 + ctx.measureText('WOR').width + ctx.measureText('K').width * 0.17;
    oy = H / 2;
  };
  let last = '';
  const paint = () => {
    if (!view.live || mask.style.visibility === 'hidden') return;
    const src: CanvasImageSource = video.readyState >= 2 ? video : poster;
    // Repaint only when the frame, the zoom or the fade changed.
    const key = `${video.currentTime.toFixed(2)}|${view.zoom.toFixed(3)}|${view.fade.toFixed(2)}|${src === video}`;
    if (key === last) return;
    last = key;
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
  ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onToggle: (s) => { view.live = s.isActive; last = ''; } });

  gsap.matchMedia().add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, (ctx) => {
    const wide = ctx.conditions!.wide;
    let onUp = () => {};
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: wide ? '+=260%' : '+=150%',
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
        // The stage covers the screen, so the network field behind it can rest.
        onToggle: (self) => { pinFade(self); root.classList.toggle('field-rest', self.isActive); },
        onUpdate: () => onUp(),
      },
    });
    tl.fromTo(view, { fade: 0.55 }, { fade: 1, duration: 0.12 })
      .fromTo(view, { zoom: 1 }, { zoom: wide ? 70 : 90, duration: 0.5, ease: 'power3.in' })
      .set(mask, { autoAlpha: 0 })
      .set(view, { live: false })
      .fromTo(slam.children[0], { scale: 3.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.12, ease: 'expo.in' })
      .to(dim, { opacity: 0.55, duration: 0.12 }, '<')
      .fromTo(stage, { x: -14 }, { x: 0, duration: 0.08, ease: 'elastic.out(1, 0.2)' })
      .fromTo(slam.children[1], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.1 }, '<')
      .to({}, { duration: 0.15 });
    if (wide) {
      const panels = track.children;
      tl.addLabel('reel')
        .to(slam, { yPercent: -60, autoAlpha: 0, duration: 0.2 })
        .to(dim, { opacity: 0.8, duration: 0.2 }, '<')
        .set(reel, { autoAlpha: 1 }, '<0.05')
        .fromTo(track, { x: () => innerWidth }, { x: () => -(track.scrollWidth - innerWidth * 0.55), duration: 1 }, '<0.05')
        .fromTo(panels, { rotateY: -38, z: -200, transformPerspective: 1300 }, { rotateY: 24, z: 80, duration: 1, stagger: 0.04 }, '<');
      // Behind the reel the video sits under an 80% dim: hide and pause it there to save the frames.
      onUp = () => {
        const behind = tl.time() > tl.labels.reel + 0.2;
        video.style.visibility = behind ? 'hidden' : '';
        if (behind && !video.paused) video.pause();
        else if (!behind && video.paused && view.live) video.play().catch(() => {});
      };
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

/** Hop 2: the Devland network draws itself, then a staff packet is denied at R1 and a security packet reaches the NVR. */
export function devland() {
  const fig = document.querySelector<SVGSVGElement>('.devland svg')!;
  const q = (s: string) => [...fig.querySelectorAll(s)];
  const staff = fig.querySelector('.dv-pkt.staff')!, sec = fig.querySelector('.dv-pkt.sec')!;
  gsap.set(q('.dv-grp rect, .dv-box rect, .dv-lines path'), { drawSVG: '0%' });
  gsap.set(q('text'), { autoAlpha: 0 });
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: fig, start: 'top 80%', end: 'bottom 25%', scrub: 0.6 },
  })
    .to(q('.dv-grp rect'), { drawSVG: '100%', duration: 0.6, stagger: 0.1 })
    .to(q('.dv-box rect'), { drawSVG: '100%', duration: 0.4, stagger: 0.05 }, '<0.2')
    .to(q('.dv-box text, .dv-grp text'), { autoAlpha: 1, duration: 0.2, stagger: 0.03 }, '<0.2')
    .to(q('.dv-lines path'), { drawSVG: '100%', duration: 0.5, stagger: 0.06 }, '<')
    .set(staff, { autoAlpha: 1 })
    .to(staff, { motionPath: { path: '#dv-staff', align: '#dv-staff', alignOrigin: [0.5, 0.5] }, duration: 1 })
    .fromTo(fig.querySelector('.deny'), { autoAlpha: 0, scale: 2.4, transformOrigin: '0% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.15, ease: 'expo.in' })
    .to(staff, { fill: '#ff5c5c', scale: 2, autoAlpha: 0, duration: 0.3 })
    .to(fig.querySelector('.r1 rect'), { stroke: '#ff5c5c', duration: 0.1 }, '<')
    .set(sec, { autoAlpha: 1 })
    .to(sec, { motionPath: { path: '#dv-sec', align: '#dv-sec', alignOrigin: [0.5, 0.5] }, duration: 1.6 })
    .to(fig.querySelector('.r1 rect'), { stroke: '#8a93a6', duration: 0.1 }, '<0.3')
    .fromTo(fig.querySelector('.allow'), { autoAlpha: 0, scale: 2.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.15, ease: 'expo.in' })
    .to(fig.querySelector('.nvr rect'), { stroke: '#3ddc97', fill: 'rgba(61,220,151,0.15)', duration: 0.2 }, '<');
}

/** Hop 5: drag (or press) the patch cable from YOU into the switch; the ports light and Play it wakes up. */
export function patchCable() {
  const rack = document.querySelector<HTMLElement>('[data-rack]')!;
  rack.hidden = false;
  const you = rack.querySelector<HTMLElement>('[data-you]')!;
  const ports = [...rack.querySelectorAll<HTMLElement>('.rk-ports i')];
  const plug = rack.querySelector<HTMLButtonElement>('.rk-plug')!;
  const svg = rack.querySelector<SVGSVGElement>('.rk-cable')!;
  const path = svg.querySelector('path')!;
  const status = rack.querySelector<HTMLElement>('.rk-status')!;
  const play = rack.parentElement!.querySelector<HTMLElement>('.btn')!;
  let a = { x: 0, y: 0 }, rest = { x: 0, y: 0 }, goal = { x: 0, y: 0 }, linked = false, dragged = false;

  const centre = (e: Element) => {
    const r = e.getBoundingClientRect(), k = rack.getBoundingClientRect();
    return { x: r.left - k.left + r.width / 2, y: r.top - k.top + r.height / 2 };
  };
  // Cable from the YOU port to the plug, sagging more the further it reaches.
  const draw = () => {
    const b = centre(plug);
    const sag = 24 + Math.hypot(b.x - a.x, b.y - a.y) * 0.3;
    path.setAttribute('d', `M${a.x},${a.y} C${a.x + 30},${a.y + sag} ${b.x - 30},${b.y + sag} ${b.x},${b.y}`);
  };
  const layout = () => {
    const k = rack.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${k.width} ${k.height}`);
    a = centre(you);
    a.x += you.offsetWidth / 2;
    const p0 = centre(ports[0]);
    rest = { x: a.x + 40, y: a.y + 44 };
    goal = p0;
    const at = linked ? goal : rest;
    gsap.set(plug, { x: at.x - plug.offsetWidth / 2, y: at.y - plug.offsetHeight / 2 });
    draw();
  };
  const moveTo = (p: { x: number; y: number }, ease: string, onComplete?: () => void) =>
    gsap.to(plug, { x: p.x - plug.offsetWidth / 2, y: p.y - plug.offsetHeight / 2, duration: 0.7, ease, onUpdate: draw, onComplete });

  const connect = () => {
    if (linked) return;
    linked = true;
    drag.disable();
    moveTo(goal, 'power3.out', () => {
      gsap.timeline()
        .to(ports, { backgroundColor: '#3ddc97', boxShadow: '0 0 10px rgba(61,220,151,0.9)', duration: 0.12, stagger: 0.07 })
        .to(status, { text: 'link up · ready to play', duration: 0.6, ease: 'none' }, 0.1)
        .add(() => { play.classList.add('lit'); rack.classList.add('up'); });
      plug.setAttribute('aria-label', 'Cable patched. Link up.');
    });
  };

  const drag = Draggable.create(plug, {
    type: 'x,y', bounds: rack,
    onPress: () => (dragged = false),
    onDrag() { dragged = true; draw(); },
    onRelease() {
      if (!dragged) return;
      const b = centre(plug);
      if (Math.hypot(b.x - goal.x, b.y - goal.y) < 44) connect();
      else moveTo(rest, 'elastic.out(1, 0.45)');
    },
  })[0];
  // Tap, click or Enter/Space patches it in one go.
  plug.addEventListener('click', () => { if (!dragged) connect(); });

  layout();
  document.fonts.ready.then(layout);
  new ResizeObserver(layout).observe(rack);
}

/** Hop 6: rows flood amber; on a pointer a preview panel follows and skews with speed, on touch the centred row lights. */
export function buildRows(fine: boolean) {
  const rows = [...document.querySelectorAll<HTMLElement>('.rows li')];
  if (!fine) {
    rows.forEach((li) => ScrollTrigger.create({ trigger: li, start: 'top 58%', end: 'bottom 42%', toggleClass: 'active' }));
    return;
  }
  const panel = el('div', 'bp-panel');
  panel.setAttribute('aria-hidden', 'true');
  document.body.append(panel);
  const px = gsap.quickTo(panel, 'x', { duration: 0.45, ease: 'power3' });
  const py = gsap.quickTo(panel, 'y', { duration: 0.45, ease: 'power3' });
  const skew = gsap.quickTo(panel, 'skewX', { duration: 0.4, ease: 'power3' });
  const rot = gsap.quickTo(panel, 'rotate', { duration: 0.6, ease: 'power3' });
  let lastX = 0;
  const show = (li: HTMLElement) => {
    const t = (s: string) => li.querySelector(s)?.textContent ?? '';
    panel.innerHTML = `<b>${t('.name')}</b><p>${t('.line')}</p><div>${t('.stack')}</div><div class="bp-path">${li.dataset.repo || 'no public link'}</div>`;
    gsap.to(panel, { autoAlpha: 1, scale: 1, duration: 0.3, overwrite: 'auto' });
  };
  const hide = () => gsap.to(panel, { autoAlpha: 0, scale: 0.9, duration: 0.25, overwrite: 'auto' });
  rows.forEach((li) => {
    li.addEventListener('pointerenter', () => show(li));
    li.addEventListener('focusin', () => {
      const r = li.getBoundingClientRect();
      px(Math.min(innerWidth - 320, r.right - 320)); py(r.top - 40);
      show(li);
    });
    li.addEventListener('focusout', hide);
  });
  document.querySelector('.rows')!.addEventListener('pointerleave', hide);
  addEventListener('pointermove', (e) => {
    const vx = e.clientX - lastX;
    lastX = e.clientX;
    // Keep the panel on screen: flip to the left of the pointer near the right edge.
    px(e.clientX + (e.clientX > innerWidth - 360 ? -330 : 28));
    py(e.clientY - 60);
    skew(gsap.utils.clamp(-18, 18, -vx * 0.6));
    rot(gsap.utils.clamp(-6, 6, vx * 0.2));
  }, { passive: true });
}

/** Hop 7: the capture streams in row by row with a live counter; the selected packet drives a hex dump. */
export function labsCapture(wide: () => boolean) {
  const pcap = document.querySelector<HTMLElement>('.pcap')!;
  const rows = [...pcap.querySelectorAll<HTMLTableRowElement>('tbody tr')];
  const count = pcap.querySelector<HTMLElement>('.cap-n')!;
  const final = count.textContent!;
  gsap.set(rows, { autoAlpha: 0, x: -12 });
  ScrollTrigger.create({
    trigger: pcap, start: 'top 75%', once: true,
    onEnter: () => {
      gsap.to(rows, {
        autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.22, ease: 'power2.out',
        onStart: () => (count.textContent = 'capturing... 0 packets'),
      });
      rows.forEach((_, i) => gsap.delayedCall(i * 0.22 + 0.2, () => {
        count.textContent = i === rows.length - 1 ? final : `capturing... ${i + 1} packets`;
        if (i === 0 && wide()) select(0);
      }));
    },
  });

  // Hex dump of the real bytes of "<source>: <info>", 8 per line, decoding in.
  const dump = el('aside', 'hexdump');
  dump.setAttribute('aria-hidden', 'true');
  pcap.append(dump);
  pcap.classList.add('has-hex');
  const enc = new TextEncoder();
  const select = (i: number) => {
    if (!wide()) return;
    const r = rows[i];
    rows.forEach((x) => x.classList.toggle('sel', x === r));
    const cell = (c: string) => r.querySelector(c)!.textContent!;
    const bytes = [...enc.encode(`${cell('.src')}: ${cell('.info')}`)];
    const lines: string[] = [];
    for (let o = 0; o < bytes.length; o += 8) {
      const chunk = bytes.slice(o, o + 8);
      const hex = chunk.map((b) => b.toString(16).padStart(2, '0')).join(' ').padEnd(23, ' ');
      const ascii = chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
      lines.push(`${o.toString(16).padStart(4, '0')}  ${hex}  ${ascii}`);
    }
    dump.innerHTML = `<div class="hx-head">Frame ${i + 1}: ${cell('.proto')} · ${bytes.length} bytes</div>` +
      lines.map(() => '<div class="hx-line"></div>').join('');
    dump.querySelectorAll<HTMLElement>('.hx-line').forEach((ln, k) =>
      gsap.to(ln, { duration: 0.6, delay: k * 0.04, scrambleText: { text: lines[k], chars: '0123456789abcdef', speed: 0.8 } }));
  };
  rows.forEach((r, i) => {
    r.addEventListener('pointerenter', () => select(i));
    r.addEventListener('focusin', () => select(i));
  });
}
