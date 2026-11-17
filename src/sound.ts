// Every sound is synthesised with the Web Audio API: no audio files. Nothing plays until the visitor
// turns sound on (the choice is remembered); master volume is low and everything stops while the tab is hidden.
let ctx: AudioContext | null = null;
let master: GainNode;
let humGain: GainNode;
let humFilter: BiquadFilterNode;
let noise: AudioBuffer;
let on = false;

function boot() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  // A very low hum: two quiet oscillators through a low-pass that opens with scroll speed.
  humFilter = ctx.createBiquadFilter();
  humFilter.type = 'lowpass';
  humFilter.frequency.value = 180;
  humGain = ctx.createGain();
  humGain.gain.value = 0.05;
  humFilter.connect(humGain).connect(master);
  for (const [f, type, g] of [[55, 'sine', 0.8], [82.4, 'triangle', 0.25]] as const) {
    const o = ctx.createOscillator();
    const v = ctx.createGain();
    o.type = type; o.frequency.value = f; v.gain.value = g;
    o.connect(v).connect(humFilter);
    o.start();
  }
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

/** An envelope on a fresh gain node: quick attack, exponential release. */
function env(peak: number, attack: number, release: number) {
  const g = ctx!.createGain();
  const t = ctx!.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  g.connect(master);
  return g;
}

function osc(type: OscillatorType, from: number, to: number, dur: number, out: AudioNode) {
  const o = ctx!.createOscillator();
  const t = ctx!.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  o.connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}

function burst(filter: BiquadFilterType, from: number, to: number, dur: number, out: AudioNode) {
  const s = ctx!.createBufferSource();
  const f = ctx!.createBiquadFilter();
  const t = ctx!.currentTime;
  s.buffer = noise;
  f.type = filter;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  s.connect(f).connect(out);
  s.start(t); s.stop(t + dur + 0.05);
}

const live = () => on && ctx?.state === 'running';

export const sound = {
  get on() { return on; },
  /** Call from a user gesture (a click) so the browser lets audio start. */
  set(v: boolean) {
    on = v;
    try { localStorage.setItem('sound', v ? 'on' : 'off'); } catch { /* storage blocked */ }
    if (v) { boot(); ctx!.resume(); } else ctx?.suspend();
  },
  speed(v: number) {
    if (!live()) return;
    const k = Math.min(1, Math.abs(v) / 40);
    humGain.gain.setTargetAtTime(0.05 + k * 0.12, ctx!.currentTime, 0.2);
    humFilter.frequency.setTargetAtTime(180 + k * 520, ctx!.currentTime, 0.2);
  },
  tick() { if (live()) osc('sine', 1500, 1500, 0.05, env(0.12, 0.004, 0.06)); },
  clunk() {
    if (!live()) return;
    burst('lowpass', 900, 120, 0.14, env(0.7, 0.003, 0.16));
    osc('sine', 90, 45, 0.28, env(0.8, 0.004, 0.3));
  },
  chirp() { if (live()) osc('sine', 380, 1600, 0.25, env(0.18, 0.01, 0.3)); },
  whoosh(level = 0.3) { if (live()) burst('bandpass', 300, 2600, 0.45, env(level, 0.12, 0.38)); },
  swell() {
    if (!live()) return;
    const f = ctx!.createBiquadFilter();
    const t = ctx!.currentTime;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 2);
    f.connect(env(0.16, 2, 1.6));
    osc('sawtooth', 110, 110, 3.6, f);
    osc('sawtooth', 110.7, 110.7, 3.6, f);
    osc('sine', 55, 55, 3.6, f);
  },
};

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
});

// Remembered "on": the browser still needs a gesture before audio can start, so wait for the first one.
try {
  if (localStorage.getItem('sound') === 'on') {
    const start = () => sound.set(true);
    for (const e of ['pointerdown', 'keydown', 'touchend']) addEventListener(e, start, { once: true, capture: true });
  }
} catch { /* storage blocked: sound stays off */ }
