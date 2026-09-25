import { useSyncExternalStore } from 'react';
import { getVolume, isMuted, setMuted, setVolume, subscribe } from './sounds';

/** The game's sound settings, kept in step across every mounted board. */
export function useSoundSetting() {
  const muted = useSyncExternalStore(subscribe, isMuted, isMuted);
  const volume = useSyncExternalStore(subscribe, getVolume, getVolume);
  return {
    muted,
    volume,
    toggle: () => setMuted(!isMuted()),
    setVolume,
  } as const;
}
