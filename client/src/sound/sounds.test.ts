import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'gaudi-sound';

/** A stand-in AudioContext that counts the voices it is asked to start. */
function fakeAudio() {
  const started: string[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const node = (kind: string) => ({
    kind,
    connect: vi.fn(function connect(this: unknown, next: unknown) { return next; }),
    start: vi.fn(() => started.push(kind)),
    stop: vi.fn(),
    frequency: param(),
    gain: param(),
    Q: param(),
    type: '',
    buffer: null,
  });
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume = vi.fn();
    createOscillator = () => node('osc');
    createGain = () => node('gain');
    createBiquadFilter = () => node('filter');
    createBufferSource = () => node('noise');
    createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
  }
  return { FakeContext, started };
}

async function freshModule() {
  vi.resetModules();
  return import('./sounds');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sound setting', () => {
  it('is on for a player who never chose', async () => {
    const { isMuted } = await freshModule();

    expect(isMuted()).toBe(false);
  });

  it('remembers muting across visits', async () => {
    const first = await freshModule();
    first.setMuted(true);

    const later = await freshModule();

    expect(later.isMuted()).toBe(true);
  });

  it('falls back to on when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { isMuted, setMuted } = await freshModule();

    expect(isMuted()).toBe(false);
    expect(() => setMuted(true)).not.toThrow();
    expect(isMuted()).toBe(true);
  });

  it('tells every listener when it changes', async () => {
    const { setMuted, subscribe } = await freshModule();
    const a = vi.fn();
    const b = vi.fn();
    subscribe(a);
    const stopB = subscribe(b);
    stopB();

    setMuted(true);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('off');
  });
});

describe('playing', () => {
  it('starts voices when sound is on', async () => {
    const { FakeContext, started } = fakeAudio();
    vi.stubGlobal('AudioContext', FakeContext);
    const { playSound } = await freshModule();

    playSound('pickup');

    expect(started.length).toBeGreaterThan(0);
  });

  it('plays nothing while muted', async () => {
    const { FakeContext, started } = fakeAudio();
    vi.stubGlobal('AudioContext', FakeContext);
    const { playSound, setMuted } = await freshModule();
    setMuted(true);

    for (const name of ['pickup', 'drop', 'full', 'solved', 'invalid', 'undo'] as const) {
      playSound(name, 2);
    }

    expect(started).toEqual([]);
  });

  it('is a quiet no-op where the browser has no audio', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const { playSound } = await freshModule();

    expect(() => playSound('drop', 1)).not.toThrow();
  });

  it('never lets a failing audio call reach the game', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('no device'); } });
    const { playSound } = await freshModule();

    expect(() => playSound('solved')).not.toThrow();
  });
});

describe('drop pitch', () => {
  it('rises with every ball in the receiving flask', async () => {
    const { dropPitch } = await freshModule();

    const pitches = [1, 2, 3, 4].map(dropPitch);

    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(new Set(pitches).size).toBe(4);
  });

  it('is the same for equally full flasks', async () => {
    const { dropPitch } = await freshModule();

    expect(dropPitch(3)).toBe(dropPitch(3));
  });
});

describe('volume', () => {
  it('is 80% for a player who never chose', async () => {
    const { getVolume } = await freshModule();

    expect(getVolume()).toBe(0.8);
  });

  it('remembers the volume across visits', async () => {
    const first = await freshModule();
    first.setVolume(0.4);

    const later = await freshModule();

    expect(later.getVolume()).toBe(0.4);
  });

  it('keeps the volume between 0 and 1', async () => {
    const { getVolume, setVolume } = await freshModule();

    setVolume(3);
    expect(getVolume()).toBe(1);
    setVolume(-1);
    expect(getVolume()).toBe(0);
  });

  it('falls back to the default when the stored value is nonsense', async () => {
    localStorage.setItem('gaudi-sound-volume', 'loud');
    const { getVolume } = await freshModule();

    expect(getVolume()).toBe(0.8);
  });

  it('drives the loudness of every sound, live', async () => {
    const gains: { value: number }[] = [];
    const { FakeContext } = fakeAudio();
    class Recording extends FakeContext {
      createGain = () => {
        const g = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
        gains.push(g);
        return { connect: vi.fn((n: unknown) => n), gain: g } as never;
      };
    }
    vi.stubGlobal('AudioContext', Recording);
    const { playSound, setVolume } = await freshModule();
    setVolume(0.5);

    playSound('pickup');
    // The first gain made is the master the whole game plays through.
    expect(gains[0].value).toBe(0.5);

    setVolume(0.25);
    expect(gains[0].value).toBe(0.25);
  });

  it('tells listeners when the volume changes', async () => {
    const { setVolume, subscribe } = await freshModule();
    const listener = vi.fn();
    subscribe(listener);

    setVolume(0.3);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
