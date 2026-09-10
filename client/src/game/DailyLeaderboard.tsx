import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, authHeaders } from './identity';

interface DailyLeaderboardEntry {
  readonly rank: number;
  readonly playerId: string;
  readonly username: string;
  readonly moves: number;
  readonly elapsedTimeMs: number;
  readonly stars: number;
}

interface DailyLeaderboardResponse {
  readonly entries: DailyLeaderboardEntry[];
  readonly viewer: DailyLeaderboardEntry | null;
}

const BALL_COLORS = [
  'linear-gradient(135deg,#3B82F6,#2563EB)',
  'linear-gradient(135deg,#EF4444,#DC2626)',
  'linear-gradient(135deg,#10B981,#059669)',
  'linear-gradient(135deg,#F59E0B,#D97706)',
  'linear-gradient(135deg,#A855F7,#7C3AED)',
  'linear-gradient(135deg,#EC4899,#DB2777)',
  'linear-gradient(135deg,#06B6D4,#0891B2)',
  'linear-gradient(135deg,#F97316,#EA580C)',
];

function ballColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return BALL_COLORS[Math.abs(hash) % BALL_COLORS.length];
}

function formatElapsed(ms: number): string {
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

export function DailyLeaderboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<DailyLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/v1/daily/leaderboard`, { headers: authHeaders() });
        if (res.ok && !cancelled) setData(await res.json() as DailyLeaderboardResponse);
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-white" style={fredoka}>
        {t('daily.leaderboardTitle')}
      </h2>

      {loading && !data && (
        <p className="mt-4 text-center text-sm text-slate-500">{t('leaderboard.loading')}</p>
      )}

      {data && data.entries.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">{t('leaderboard.empty')}</p>
      )}

      {data && data.entries.length > 0 && (
        <div className="mt-3 space-y-1">
          {data.entries.map((e) => {
            const isViewer = data.viewer?.playerId === e.playerId;
            return (
              <div
                key={e.playerId}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                style={{
                  background: isViewer ? 'rgba(147,51,234,0.12)' : 'rgba(255,255,255,0.04)',
                  border: isViewer ? '1px solid rgba(147,51,234,0.4)' : '1px solid transparent',
                }}
              >
                <span className="w-6 text-right text-sm font-bold tabular-nums text-slate-500" style={fredoka}>
                  {e.rank}
                </span>
                <span
                  className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                  style={{ background: ballColor(e.username) }}
                />
                <span
                  className="flex-1 truncate text-sm font-semibold"
                  style={{ ...fredoka, color: isViewer ? '#A855F7' : undefined }}
                >
                  {e.username}
                  {isViewer && <span className="text-xs text-slate-500"> {t('leaderboard.you')}</span>}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={`text-xs ${i <= e.stars ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                  ))}
                </div>
                <span className="text-xs tabular-nums text-slate-400">
                  {e.moves}m
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {formatElapsed(e.elapsedTimeMs)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Viewer's own result, if not already in the top list */}
      {data?.viewer && !data.entries.some((e) => e.playerId === data.viewer!.playerId) && (
        <div className="mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.4)' }}>
          <p className="text-xs font-semibold text-violet-300" style={fredoka}>
            {t('daily.yourResult')} — #{data.viewer.rank}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <span>{data.viewer.moves}m</span>
            <span className="text-slate-500">·</span>
            <span>{formatElapsed(data.viewer.elapsedTimeMs)}</span>
            <span className="text-slate-500">·</span>
            <span>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= data.viewer!.stars ? 'text-amber-400' : 'text-slate-700'}>★</span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
