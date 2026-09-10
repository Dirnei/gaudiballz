import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from './identity';

interface CommunityStats {
  readonly onlineCount: number;
  readonly solvedToday: number;
  readonly activeThisWeek: number;
}

export function StatsRibbon() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/hub/community-stats`);
        if (res.ok && !cancelled) setStats(await res.json() as CommunityStats);
      } catch { /* silent — stats are a nice-to-have */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 py-4">
      <Chip>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {t('community.playingNow', { count: stats.onlineCount.toLocaleString() })}
      </Chip>
      <Chip>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-rose-400" />
          <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-rose-400" />
        </svg>
        {t('community.solvedToday', { count: stats.solvedToday.toLocaleString() })}
      </Chip>
      <Chip>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z" fill="#FACC15" />
        </svg>
        {t('community.playersThisWeek', { count: stats.activeThisWeek.toLocaleString() })}
      </Chip>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/4 px-3 py-1.5 text-sm font-semibold tabular-nums text-slate-400 ring-1 ring-white/6">
      {children}
    </span>
  );
}
