import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function formatTime(ms: number): string {
  const seconds = ms / 1000;
  return seconds.toFixed(1);
}

interface LiveTimerProps {
  readonly elapsedMs: () => number;
  readonly running: boolean;
  readonly className?: string;
  readonly timeTargetMs?: number;
}

export function LiveTimer({ elapsedMs, running, className, timeTargetMs }: LiveTimerProps) {
  const { t } = useTranslation();
  const spanRef = useRef<HTMLSpanElement>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    function update() {
      if (spanRef.current) {
        spanRef.current.textContent = formatTime(elapsedMs());
      }
    }

    clearInterval(intervalRef.current);
    update();

    if (running) {
      intervalRef.current = setInterval(update, 100);
    }

    return () => clearInterval(intervalRef.current);
  }, [elapsedMs, running]);

  return (
    <span className={className}>
      <span ref={spanRef}>{formatTime(elapsedMs())}</span>
      {timeTargetMs != null && (
        <span className="text-slate-400">{t('timer.seconds')} {t('timer.target', { time: formatTime(timeTargetMs) })}</span>
      )}
      {timeTargetMs == null && <span className="text-slate-400">{t('timer.seconds')}</span>}
    </span>
  );
}

export { formatTime };
