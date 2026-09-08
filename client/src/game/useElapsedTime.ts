import { useCallback, useEffect, useRef } from 'react';

export interface ElapsedTimeControls {
  readonly elapsedMs: () => number;
  readonly start: () => void;
  readonly stop: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly reset: () => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'stopped';

export function useElapsedTime(): ElapsedTimeControls {
  const stateRef = useRef<TimerState>('idle');
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef(0);

  const start = useCallback(() => {
    if (stateRef.current !== 'idle') {
      return;
    }
    stateRef.current = 'running';
    startedAtRef.current = performance.now();
  }, []);

  const stop = useCallback(() => {
    if (stateRef.current === 'running') {
      accumulatedRef.current += performance.now() - startedAtRef.current;
    }
    stateRef.current = 'stopped';
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current !== 'running') {
      return;
    }
    accumulatedRef.current += performance.now() - startedAtRef.current;
    stateRef.current = 'paused';
  }, []);

  const resume = useCallback(() => {
    if (stateRef.current !== 'paused') {
      return;
    }
    stateRef.current = 'running';
    startedAtRef.current = performance.now();
  }, []);

  const reset = useCallback(() => {
    stateRef.current = 'idle';
    accumulatedRef.current = 0;
    startedAtRef.current = 0;
  }, []);

  const elapsedMs = useCallback(() => {
    if (stateRef.current === 'running') {
      return Math.round(accumulatedRef.current + (performance.now() - startedAtRef.current));
    }
    return Math.round(accumulatedRef.current);
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [pause, resume]);

  return { elapsedMs, start, stop, pause, resume, reset };
}
