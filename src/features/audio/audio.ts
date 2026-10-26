// Web Audio: CC0 samples (public/audio/CREDITS.md) plus synthesised gate, AC hum and outdoor ambience.
// The context starts on the "Masuk" click (browsers block audio before a user gesture).

type Sample = 'door-open' | 'door-close' | 'latch' | 'cloth' | 'switch' | 'click' | 'toggle' | 'step0' | 'step1' | 'step2' | 'step3';

let ctx: AudioContext | null = null;
let master: GainNode;
const buffers = new Map<Sample, AudioBuffer>();
let noise: AudioBuffer;
let ambient: { wind: GainNode; birds: GainNode; crickets: GainNode; hum: GainNode } | null = null;
let muted = false;

export function initAudio(on: boolean) {
  muted = !on;
  if (ctx) return;
  try {
    ctx = new AudioContext();
  } catch {
    return; // no Web Audio: the tour works silently
  }
  // some browsers still start suspended; any later tap or key resumes it
  const resume = () => { if (ctx?.state === 'suspended') void ctx.resume(); };
  window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume);
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const names: Sample[] = ['door-open', 'door-close', 'latch', 'cloth', 'switch', 'click', 'toggle', 'step0', 'step1', 'step2', 'step3'];
  for (const n of names) {
    fetch(`/audio/${n}.mp3`).then((r) => r.arrayBuffer()).then((b) => ctx!.decodeAudioData(b)).then((buf) => buffers.set(n, buf))
      .catch(() => { /* a missing sound must not break the tour */ });
  }
  startAmbient();
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  if (ctx && !m && ctx.state === 'suspended') void ctx.resume();
}

export function play(name: Sample, volume = 1, rate = 1) {
  const buf = buffers.get(name);
  if (!ctx || !buf || muted) return;
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = volume;
  s.connect(g).connect(master); s.start();
}

let stepIndex = 0;
export const footstep = () => play(`step${stepIndex++ % 4}` as Sample, 0.35, 0.95 + Math.random() * 0.1);

/** Sliding gate: low rumble of filtered noise with a latch click at the end. */
export function gate(seconds = 1.6) {
  if (!ctx || muted) return;
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
  const g = ctx.createGain(); const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.15);
  g.gain.setValueAtTime(0.5, t + seconds - 0.2); g.gain.linearRampToValueAtTime(0, t + seconds);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + seconds);
  setTimeout(() => play('latch', 0.7), seconds * 1000 - 100);
}

function loopNoise(type: BiquadFilterType, freq: number, q = 1) {
  const s = ctx!.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx!.createGain(); g.gain.value = 0;
  s.connect(f).connect(g).connect(master); s.start();
  return g;
}

function startAmbient() {
  const wind = loopNoise('lowpass', 400);
  const hum = loopNoise('bandpass', 120, 2);
  // crickets: a 4.5 kHz tone gated by a fast LFO
  const osc = ctx!.createOscillator(); osc.frequency.value = 4500;
  const lfo = ctx!.createOscillator(); lfo.frequency.value = 28;
  const gate = ctx!.createGain(); gate.gain.value = 0;
  const depth = ctx!.createGain(); depth.gain.value = 0.5;
  lfo.connect(depth).connect(gate.gain);
  const crickets = ctx!.createGain(); crickets.gain.value = 0;
  osc.connect(gate).connect(crickets).connect(master); osc.start(); lfo.start();
  const birds = ctx!.createGain(); birds.gain.value = 0; birds.connect(master);
  ambient = { wind, birds, crickets, hum };
  chirpLoop();
}

/** Short sine sweeps at random intervals; audible only by day and outdoors (birds gain). */
function chirpLoop() {
  if (!ctx || !ambient) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    const t0 = t + i * 0.12; const f0 = 2600 + Math.random() * 1800;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t0 + 0.07);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.linearRampToValueAtTime(0, t0 + 0.08);
    o.connect(g).connect(ambient.birds); o.start(t0); o.stop(t0 + 0.1);
  }
  setTimeout(chirpLoop, 1500 + Math.random() * 5000);
}

/** Called a few times per second: outdoors louder than indoors, birds by day, crickets by night, AC hum near an AC. */
export function updateAmbient(inside: boolean, night: number, acNear: number) {
  if (!ctx || !ambient) return;
  const t = ctx.currentTime; const out = inside ? 0.25 : 1;
  ambient.wind.gain.setTargetAtTime(0.05 * out, t, 0.5);
  ambient.birds.gain.setTargetAtTime((1 - night) * out, t, 0.5);
  ambient.crickets.gain.setTargetAtTime(0.012 * night * out, t, 0.5);
  ambient.hum.gain.setTargetAtTime(0.06 * acNear, t, 0.3);
}
