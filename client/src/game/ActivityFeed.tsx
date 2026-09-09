import { useEffect, useState } from 'react';
import { API } from './identity';

interface FeedEvent {
  readonly username: string;
  readonly eventType: string;
  readonly detail: string;
  readonly timestamp: string;
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/hub/activity-feed?limit=8`);
        if (res.ok && !cancelled) setEvents(await res.json() as FeedEvent[]);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (events.length === 0) return null;

  return (
    <div>
      <h2
        className="mb-3 text-lg font-bold tracking-tight text-white"
        style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        Live Activity
      </h2>
      <div
        className="rounded-2xl px-4 py-2"
        style={{
          backgroundImage:
            'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
            ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
            'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderTopColor: 'rgba(255,255,255,0.22)',
        }}
      >
        {events.map((ev, i) => (
          <div
            key={`${ev.username}-${ev.timestamp}-${i}`}
            className="flex items-start gap-2.5 border-b border-white/6 py-2.5 last:border-b-0"
          >
            <span
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full"
              style={{ background: ballColor(ev.username) }}
            />
            <div className="flex-1 text-sm leading-snug">
              <strong
                className="font-semibold text-slate-200"
                style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
              >
                {ev.username}
              </strong>{' '}
              <span className="text-slate-400">{ev.detail}</span>
            </div>
            <span className="flex-shrink-0 text-xs text-slate-600">{relativeTime(ev.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
