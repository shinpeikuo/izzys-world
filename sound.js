// Sound effects and music, all made by the tablet itself with Web Audio. There are no
// sound files to download and nothing to license. Each sound is a few simple tones or a
// puff of noise; each place has a short tune that loops.

const MUSIC_VOLUME = 0.13;
const SFX_VOLUME = 0.5;

let ctx = null;
let musicGain = null;
let sfxGain = null;
let noiseBuffer = null;
const state = { music: true, sfx: true, track: null, step: 0, nextTime: 0 };

function ensure() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  musicGain = ctx.createGain();
  musicGain.gain.value = state.music ? MUSIC_VOLUME : 0;
  musicGain.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = state.sfx ? SFX_VOLUME : 0;
  sfxGain.connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  setInterval(scheduleMusic, 50);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  return ctx;
}

// Browsers only allow sound after the first touch, so the game calls this on every touch.
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
}

export function setEnabled({ music, sfx }) {
  if (music !== undefined) state.music = music;
  if (sfx !== undefined) state.sfx = sfx;
  if (!ctx) return;
  musicGain.gain.setTargetAtTime(state.music ? MUSIC_VOLUME : 0, ctx.currentTime, 0.1);
  sfxGain.gain.setTargetAtTime(state.sfx ? SFX_VOLUME : 0, ctx.currentTime, 0.05);
}

// --- Building blocks ---

// A note: frequency `freq` at time `t` for `dur` seconds, optionally sliding to `to`.
function tone(freq, t, dur, { type = 'sine', vol = 0.3, to = null, dest = sfxGain, filter = null } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.value = filter.freq;
    f.Q.value = filter.q || 1;
    osc.connect(f);
    node = f;
  }
  node.connect(gain).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  return osc;
}

// A puff of noise through a filter whose frequency slides from `from` to `to`.
function noise(t, dur, { vol = 0.3, from = 1000, to = from, type = 'bandpass', q = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(gain).connect(sfxGain);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// --- Sound effects ---

const SOUNDS = {
  tap: (t) => tone(660, t, 0.08, { to: 990, vol: 0.2 }),
  pickup: (t) => tone(420, t, 0.12, { to: 820, vol: 0.22, type: 'triangle' }),
  drop: (t) => { tone(320, t, 0.14, { to: 150, vol: 0.3 }); noise(t, 0.08, { vol: 0.08, from: 600 }); },
  trash: (t) => { noise(t, 0.35, { vol: 0.25, from: 2500, to: 300 }); tone(520, t, 0.3, { to: 120, vol: 0.12, type: 'triangle' }); },
  sparkle: (t) => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.18, { type: 'triangle', vol: 0.12 })),
  boing: (t) => tone(260, t, 0.22, { to: 620, vol: 0.22, type: 'triangle' }),
  click: (t) => { tone(1500, t, 0.03, { type: 'square', vol: 0.08 }); tone(700, t + 0.04, 0.04, { type: 'square', vol: 0.06 }); },
  steam: (t) => noise(t, 0.8, { vol: 0.15, from: 5000, to: 2500, type: 'highpass' }),
  whoosh: (t) => noise(t, 0.35, { vol: 0.2, from: 300, to: 1800, q: 2 }),
  open: (t) => tone(500, t, 0.09, { to: 760, vol: 0.15, type: 'triangle' }),
  bark: (t) => [0, 0.2].forEach((d) => {
    tone(430, t + d, 0.13, { to: 240, vol: 0.35, type: 'sawtooth', filter: { freq: 1300 } });
    noise(t + d, 0.06, { vol: 0.15, from: 900 });
  }),
  meow: (t) => {
    const osc = tone(520, t, 0.6, { vol: 0.25, type: 'sawtooth', filter: { type: 'bandpass', freq: 1400, q: 2.5 } });
    osc.frequency.linearRampToValueAtTime(820, t + 0.25);
    osc.frequency.linearRampToValueAtTime(560, t + 0.6);
  },
  peacock: (t) => [0, 0.5].forEach((d) => {
    const osc = tone(950, t + d, 0.42, { vol: 0.18, type: 'square', filter: { freq: 2600 } });
    osc.frequency.linearRampToValueAtTime(1450, t + d + 0.15);
    osc.frequency.linearRampToValueAtTime(1050, t + d + 0.42);
  }),
};

export function play(name) {
  if (!state.sfx || !ensure() || ctx.state !== 'running') return;
  SOUNDS[name](ctx.currentTime + 0.01);
}

// --- Music: one short looping tune per place ---
// Each tune is a list of eighth notes (semitones above `root`, or null for a rest),
// with a bass line under it. A note lasts until the next one starts.

const _ = null;
const TRACKS = {
  world: {
    bpm: 112, root: 67, wave: 'triangle',
    lead: [7, _, 4, _, 0, _, 4, _, 7, _, 12, _, 11, _, 7, _, 9, _, 7, _, 4, _, 2, _, 4, _, 2, _, 0, _, _, _],
    bass: [-12, _, _, _, -7, _, _, _, -12, _, _, _, -5, _, _, _, -7, _, _, _, -10, _, _, _, -5, _, _, _, -12, _, _, _],
  },
  house: {
    bpm: 96, root: 72, wave: 'triangle',
    lead: [0, _, 4, _, 7, _, 4, _, 5, _, 9, _, 7, _, _, _, 4, _, 5, _, 7, _, 12, _, 11, _, 7, _, 5, _, _, _],
    bass: [-24, _, _, _, -17, _, _, _, -19, _, _, _, -12, _, _, _, -20, _, _, _, -17, _, _, _, -17, _, _, _, -24, _, _, _],
  },
  cafe: {
    bpm: 104, root: 65, wave: 'sine',
    lead: [0, _, 2, 4, _, 7, _, 4, 9, _, 7, _, 4, _, 2, _, 0, _, 2, 4, _, 9, _, 7, 5, _, 4, _, 2, _, 0, _],
    bass: [-12, _, -8, _, -5, _, -3, _, -10, _, -7, _, -3, _, -5, _, -12, _, -8, _, -5, _, -8, _, -5, _, -7, _, -10, _, -12, _],
  },
  castle: {
    bpm: 84, root: 62, wave: 'triangle',
    lead: [12, _, 15, 17, 19, _, 17, 15, 14, _, 12, _, 10, _, 12, _, 12, _, 15, 17, 19, _, 22, 21, 19, _, 17, _, 15, _, 14, _],
    bass: [-12, _, _, _, _, _, _, _, -14, _, _, _, -5, _, _, _, -12, _, _, _, _, _, _, _, -5, _, _, _, -10, _, _, _],
  },
};

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function setTrack(name) {
  if (state.track === name) return;
  state.track = name;
  state.step = 0;
  state.nextTime = 0;
}

function scheduleMusic() {
  const track = TRACKS[state.track];
  if (!track || ctx.state !== 'running') return;
  const eighth = 30 / track.bpm;
  if (state.nextTime < ctx.currentTime) state.nextTime = ctx.currentTime + 0.1;
  while (state.nextTime < ctx.currentTime + 0.25) {
    const i = state.step % track.lead.length;
    for (const [line, wave, vol] of [[track.lead, track.wave, 0.5], [track.bass, 'sine', 0.6]]) {
      const n = line[i];
      if (n === null) continue;
      let len = 1;
      while (len < 8 && line[(i + len) % line.length] === null) len++;
      tone(midi(track.root + n), state.nextTime, eighth * len * 0.95, { type: wave, vol, dest: musicGain });
    }
    state.nextTime += eighth;
    state.step++;
  }
}
