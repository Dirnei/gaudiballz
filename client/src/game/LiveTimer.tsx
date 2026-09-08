import { useEffect, useRef } from 'react';

function formatTime(ms: number): string {
  const seconds = ms / 1000;
  return seconds.toFixed(3);
}

interface LiveTimerProps {
  readonly elapsedMs: () => number;
  readonly running: boolean;
  readonly className?: string;
  readonly timeTargetMs?: number;
}

export function LiveTimer({ elapsedMs, running, className, timeTargetMs }: LiveTimerProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    function tick() {
      if (spanRef.current) {
        spanRef.current.textContent = formatTime(elapsedMs());
      }
      if (running) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    if (running) {
      rafRef.current = requestAnimationFrame(tick);
    } else if (spanRef.current) {
      spanRef.current.textContent = formatTime(elapsedMs());
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [elapsedMs, running]);

  return (
    <span className={className}>
      <span ref={spanRef}>{formatTime(elapsedMs())}</span>
      {timeTargetMs != null && (
        <span className="text-slate-400">s / {formatTime(timeTargetMs)}s</span>
      )}
      {timeTargetMs == null && <span className="text-slate-400">s</span>}
    </span>
  );
}

export { formatTime };
