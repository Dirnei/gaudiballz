/**
 * The game's sound effects, generated in the browser rather than played from files.
 *
 * Six short sounds, picked by ear on an audition page and carried over from it unchanged
 * except for one thing: the drop now rises with the fill level, which the audition's clack
 * did not do. Synthesis means nothing to download or cache for offline play, and lets the
 * drop's pitch follow the board exactly.
 *
 * Every call is best-effort, like the haptics: a browser without audio, a blocked context or
 * a missing device makes these quiet no-ops, and nothing here can fail a move.
 */

export type SoundName = 'pickup' | 'drop' | 'full' | 'solved' | 'invalid' | 'undo';

// ---- settings: on/off and volume -------------------------------------------------

const STORAGE_KEY = 'gaudi-sound';
const VOLUME_KEY = 'gaudi-sound-volume';
const DEFAULT_VOLUME = 0.8;

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

function readVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    const value = stored === null ? NaN : Number(stored);
    return Number.isFinite(value) ? clamp(value) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

let muted = readMuted();
let volume = readVolume();
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on');
  } catch {
    // Private browsing or blocked storage: the choice holds for this visit only.
  }
  listeners.forEach((listener) => listener());
}

export function getVolume(): number {
  return volume;
}

/** Sets the master volume, 0 to 1, applied at once to anything still sounding. */
export function setVolume(next: number): void {
  volume = clamp(next);
  if (master !== null) {
    master.gain.value = volume;
  }
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Private browsing or blocked storage: the choice holds for this visit only.
  }
  listeners.forEach((listener) => listener());
}

/** Registers a listener for setting changes; returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- synthesis --------------------------------------------------------------------

let context: AudioContext | null = null;
let master: GainNode | null = null;

/** The shared context, created on first use - which is always inside a tap, click or key. */
function audio(): AudioContext | null {
  if (context === null) {
    const Ctor = globalThis.AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = volume;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') {
    void context.resume();
  }
  return context;
}

type Partials = readonly (readonly [number, number])[];

/**
 * A struck glass: a fundamental plus the inharmonic partials that make it ring like glass
 * rather than beep like a sine.
 */
function strike(
  ctx: AudioContext,
  freq: number,
  at: number,
  { gain = 0.28, decay = 0.35, partials = [[1, 1], [2.76, 0.35], [5.4, 0.12]] as Partials } = {},
): void {
  const t0 = ctx.currentTime + at;
  for (const [mult, level] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * level, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay / Math.sqrt(mult));
    osc.connect(g).connect(master!);
    osc.start(t0);
    osc.stop(t0 + decay + 0.05);
  }
}

function noise(
  ctx: AudioContext,
  at: number,
  dur: number,
  { from, to, q = 2, gain = 0.4 }: { from: number; to: number; q?: number; gain?: number },
): void {
  const t0 = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = q;
  band.frequency.setValueAtTime(from, t0);
  band.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(band).connect(g).connect(master!);
  src.start(t0);
}

function sweep(
  ctx: AudioContext,
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  { gain = 0.3, at = 0, lowpass }: { gain?: number; at?: number; lowpass?: number } = {},
): void {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let out: AudioNode = osc.connect(g);
  if (lowpass !== undefined) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    out = out.connect(lp);
  }
  out.connect(master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/**
 * C major pentatonic from C5 up. Every step sounds fine next to every other, which is what
 * lets the chords and runs be built from any of them without ever sounding wrong.
 */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

/**
 * How much higher a drop sounds, given the balls in the receiving flask after the pour: two
 * semitones per ball above the first, the same step the auditioned samples rose by.
 */
export function dropPitch(ballsAfter: number): number {
  return Math.pow(2, (2 * Math.max(0, ballsAfter - 1)) / 12);
}

const VOICES: Record<SoundName, (ctx: AudioContext, level: number, at: number) => void> = {
  // Soft pop.
  pickup: (ctx, _level, at) => sweep(ctx, 'sine', 480, 1150, 0.07, { gain: 0.35, at }),
  // Marble clack, rising with the fill level.
  drop: (ctx, level, at) => {
    const k = dropPitch(level);
    noise(ctx, at, 0.03, { from: 3200 * k, to: 2400 * k, q: 3, gain: 0.5 });
    strike(ctx, 920 * k, at, { gain: 0.12, decay: 0.08 });
  },
  // Chord bloom.
  full: (ctx, _level, at) => [0, 2, 4].forEach((n, i) => strike(ctx, PENTA[5 + n], at + i * 0.055, { gain: 0.2, decay: 0.6 })),
  // Pentatonic run.
  solved: (ctx, _level, at) => [0, 1, 2, 3, 4, 5, 6, 7].forEach((n, i) =>
    strike(ctx, PENTA[n + 2], at + i * 0.07, { gain: 0.2, decay: i === 7 ? 1.2 : 0.4 })),
  // Double buzz.
  invalid: (ctx, _level, at) => {
    sweep(ctx, 'square', 120, 110, 0.07, { gain: 0.12, at, lowpass: 900 });
    sweep(ctx, 'square', 120, 110, 0.07, { gain: 0.12, at: at + 0.1, lowpass: 900 });
  },
  // Tick down.
  undo: (ctx, _level, at) => {
    strike(ctx, PENTA[8], at, { gain: 0.18, decay: 0.15 });
    strike(ctx, PENTA[6], at + 0.08, { gain: 0.18, decay: 0.2 });
  },
};

/**
 * Plays one of the game's sounds, unless sound is off.
 *
 * @param level for `drop`, the balls in the receiving flask after the pour.
 * @param at seconds from now to start, so a follow-up sound lands just after the one before.
 */
export function playSound(name: SoundName, level = 1, at = 0): void {
  if (muted) return;
  try {
    const ctx = audio();
    if (ctx === null) return;
    VOICES[name](ctx, level, at);
  } catch {
    // No device, a closed context, a browser quirk: never worth failing a move over.
  }
}
