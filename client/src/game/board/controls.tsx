import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export function hintLabel(remaining: number, cooldownEnd: number | null, stuck: boolean, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (remaining === 0) {
    return t('game.hintNoHints');
  }
  const action = stuck ? t('game.hintTakeBack') : t('game.hintShowMove');
  const left = t('game.hintRemaining', { count: remaining });
  if (cooldownEnd !== null) {
    return `${action}, ${left} — ${t('game.hintAvailableShortly')}`;
  }
  return `${action}, ${left}`;
}

export function CooldownSweep({ end, duration }: { end: number; duration: number }) {
  const [readAt, setReadAt] = useState(() => Date.now());

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setReadAt(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const elapsed = Math.min(duration, Math.max(0, duration - (end - readAt)));

  return (
    <svg
      aria-hidden
      viewBox="0 0 56 56"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full -rotate-90"
    >
      <circle
        key={readAt}
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="rgba(56,189,248,0.65)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          ['--cooldown-circumference' as string]: `${circumference}`,
          animation: `hint-cooldown ${duration}ms linear forwards`,
          animationDelay: `-${elapsed}ms`,
        }}
      />
    </svg>
  );
}

export function ControlButton({
  label,
  text,
  onClick,
  disabled,
  children,
  badge,
}: {
  label: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 700, damping: 26 }}
      className="relative flex flex-col items-center gap-1 rounded-2xl bg-white/8 px-3 py-2.5 text-slate-200 ring-1 ring-white/10 transition-colors disabled:opacity-30"
    >
      {children}
      <span className="text-[0.6rem] font-medium uppercase tracking-wider text-slate-400">{text}</span>
      {badge !== undefined && (
        <span
          className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.55rem] font-semibold tabular-nums ${
            badge === 0
              ? 'bg-slate-700 text-slate-500'
              : 'bg-slate-900 text-slate-200 ring-1 ring-white/15'
          }`}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );
}
