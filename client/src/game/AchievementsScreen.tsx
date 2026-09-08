import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { Achievement, AchievementState } from './achievements';
import type { Identity } from './identity';

interface AchievementsScreenProps {
  readonly identity: Identity | null;
  readonly state: AchievementState | null;
  readonly onBack: () => void;
}

const CATEGORY_ORDER = ['milestone', 'perfection', 'streak', 'calendar', 'exploration'];

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Milestones',
  perfection: 'Perfection',
  streak: 'Streaks',
  calendar: 'Calendar',
  exploration: 'Exploration',
};

const CATEGORY_ICONS: Record<string, string> = {
  milestone: '📊',
  perfection: '✨',
  streak: '🔥',
  calendar: '📅',
  exploration: '🧭',
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 transition-colors ${
        achievement.earned
          ? 'bg-amber-500/10 ring-1 ring-amber-400/20'
          : 'bg-white/4 ring-1 ring-white/6'
      }`}
    >
      <span className="mt-0.5 text-xl">{achievement.earned ? '🏆' : '🔒'}</span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            achievement.earned ? 'text-amber-200' : 'text-slate-400'
          }`}
        >
          {achievement.name}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {achievement.description}
        </p>
        {!achievement.earned &&
          achievement.threshold !== null &&
          achievement.progress !== null && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 rounded-full bg-white/8">
                <div
                  className="h-1.5 rounded-full bg-amber-400/50 transition-all"
                  style={{
                    width: `${Math.min(100, (achievement.progress / achievement.threshold) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[0.7rem] tabular-nums text-slate-500">
                {achievement.progress}/{achievement.threshold}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

function OverallProgress({ state }: { state: AchievementState }) {
  const earned = state.achievements.filter((a) => a.earned).length;
  const total = state.achievements.length;
  const pct = total > 0 ? (earned / total) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/8">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Overall progress</span>
        <span className="text-sm font-semibold tabular-nums text-amber-300">
          {earned} / {total}
        </span>
      </div>
      <div className="mt-2.5 h-2 rounded-full bg-white/8">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AchievementsScreen({ identity, state, onBack }: AchievementsScreenProps) {
  const loggedIn = identity !== null && !identity.isAnonymous;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack]);

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-2xl flex-1 flex-col">
        <header className="flex items-center gap-3 px-5 pt-3">
          <motion.button
            type="button"
            aria-label="Back to menu"
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 700, damping: 26 }}
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-slate-200 ring-1 ring-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
          </motion.button>
          <h1 className="text-lg font-semibold tracking-tight text-white">Achievements</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {!loggedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <span className="text-4xl">🏆</span>
              <p className="mt-4 text-base font-semibold text-slate-300">
                Achievements are for registered players
              </p>
              <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-slate-500">
                Create an account to start earning achievements and track your progress.
              </p>
            </div>
          ) : state === null ? (
            <div className="flex items-center justify-center py-20">
              <motion.div
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="text-sm text-slate-400"
              >
                Loading achievements...
              </motion.div>
            </div>
          ) : (
            <div className="space-y-5">
              <OverallProgress state={state} />

              {CATEGORY_ORDER.map((cat) => {
                const items = state.achievements.filter((a) => a.category === cat);
                if (items.length === 0) {
                  return null;
                }

                const categoryEarned = items.filter((a) => a.earned).length;

                return (
                  <section key={cat}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </h2>
                      <span className="text-[0.65rem] tabular-nums text-slate-600">
                        {categoryEarned}/{items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((a) => (
                        <AchievementCard key={a.id} achievement={a} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
