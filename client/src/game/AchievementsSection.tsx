import type { Achievement, AchievementState } from './achievements';

interface AchievementsSectionProps {
  readonly state: AchievementState | null;
}

const CATEGORY_ORDER = ['milestone', 'perfection', 'streak', 'calendar', 'exploration'];

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Milestones',
  perfection: 'Perfection',
  streak: 'Streaks',
  calendar: 'Calendar',
  exploration: 'Exploration',
};

function AchievementRow({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
        achievement.earned
          ? 'bg-amber-500/10 ring-1 ring-amber-400/20'
          : 'opacity-50'
      }`}
    >
      <span className="mt-0.5 text-base">{achievement.earned ? '🏆' : '🔒'}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${achievement.earned ? 'text-amber-200' : 'text-slate-400'}`}>
          {achievement.name}
        </p>
        <p className="text-xs text-slate-500">{achievement.description}</p>
        {!achievement.earned && achievement.threshold !== null && achievement.progress !== null && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-white/10">
              <div
                className="h-1 rounded-full bg-amber-400/40"
                style={{ width: `${Math.min(100, (achievement.progress / achievement.threshold) * 100)}%` }}
              />
            </div>
            <span className="text-[0.65rem] tabular-nums text-slate-500">
              {achievement.progress} / {achievement.threshold}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AchievementsSection({ state }: AchievementsSectionProps) {
  if (state === null) {
    return (
      <div className="py-4 text-center text-sm text-slate-500">Loading achievements...</div>
    );
  }

  const earned = state.achievements.filter((a) => a.earned).length;
  const grouped = new Map<string, Achievement[]>();
  for (const a of state.achievements) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Achievements</h3>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-300 ring-1 ring-amber-400/20">
          {earned} / {state.achievements.length}
        </span>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat);
        if (!items || items.length === 0) {
          return null;
        }

        return (
          <div key={cat}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="space-y-1.5">
              {items.map((a) => (
                <AchievementRow key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
