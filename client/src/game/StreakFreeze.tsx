import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Remembers which gap's notice was dismissed, by the last played day before it. */
const DISMISSED_KEY = 'streakNoticeDismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(anchorDay: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, anchorDay);
  } catch { /* the notice just shows again next time */ }
}

function Snowflake({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1v14M1.9 4.5l12.2 7M1.9 11.5l12.2-7M6 2.5L8 4l2-1.5M6 13.5L8 12l2 1.5"
        stroke="#7DD3FC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** How many streak freezes the player holds, next to their streak. Nothing when none. */
export function StreakFreezeBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;

  return (
    <span
      role="img"
      aria-label={t('streakFreeze.held', { count })}
      title={t('streakFreeze.explain')}
      className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/12 px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-sky-300"
    >
      <Snowflake />
      {count}
    </span>
  );
}

/**
 * Tells the player once per gap that freezes kept their streak alive. Dismissing it is
 * remembered on this device until a new gap opens.
 */
export function StreakSavedNotice({
  savedDays, streak, freezesLeft, anchorDay,
}: {
  savedDays: number; streak: number; freezesLeft: number; anchorDay: string | null;
}) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => anchorDay !== null && readDismissed() === anchorDay);

  if (savedDays <= 0 || dismissed) return null;

  const dismiss = () => {
    if (anchorDay) writeDismissed(anchorDay);
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl p-3.5"
      style={{
        backgroundImage:
          'radial-gradient(120% 90% at 0% 0%, rgba(125,211,252,0.16) 0%, rgba(19,28,54,0.9) 60%)',
        border: '1px solid rgba(125,211,252,0.28)',
      }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-sky-400/12">
        <Snowflake size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
          {t('streakFreeze.savedTitle')}
        </div>
        <p className="mt-0.5 text-xs text-slate-300">
          {t('streakFreeze.savedBody', { count: savedDays, streak })}{' '}
          <span className="whitespace-nowrap text-slate-500">· {t('streakFreeze.left', { count: freezesLeft })}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('streakFreeze.dismiss')}
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
