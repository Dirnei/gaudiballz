import { useTranslation } from 'react-i18next';
import { PALETTE } from '../skins';

interface BadgeData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly earned: boolean;
  readonly progress: number | null;
  readonly threshold: number | null;
  readonly isRare: boolean;
}

export function BadgeShelf({ badges }: { badges: readonly BadgeData[] }) {
  const { t } = useTranslation();

  const starMilestones = badges.filter((b) => b.category === 'starmilestone');
  const colourMastery = badges.filter((b) => b.category === 'colourmastery');
  const achievements = badges.filter((b) => b.category === 'achievement');

  const groups = [
    { label: t('badges.starMilestones'), items: starMilestones },
    { label: t('badges.colourMastery'), items: colourMastery },
  ];
  if (achievements.length > 0) {
    groups.push({ label: t('badges.achievements'), items: achievements });
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{t('badges.title')}</h3>
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="mb-3 text-sm font-medium text-slate-400">{group.label}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.items.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  const { t } = useTranslation();
  const earned = badge.earned;

  return (
    <div
      className={`flex gap-3 rounded-xl border px-3 py-3 ${
        earned
          ? badge.isRare
            ? 'border-violet-500/40 bg-violet-500/10'
            : 'border-white/10 bg-white/5'
          : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        earned
          ? badge.isRare ? 'bg-violet-500/20' : 'bg-white/8'
          : 'bg-white/4'
      }`}>
        <BadgeIcon id={badge.id} category={badge.category} earned={earned} isRare={badge.isRare} />
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-medium leading-tight ${earned ? 'text-white' : 'text-slate-500'}`}>
          {badge.name}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {earned ? (
            badge.description
          ) : badge.threshold != null && badge.progress != null ? (
            t('badges.progress', { current: badge.progress, total: badge.threshold })
          ) : (
            badge.description
          )}
        </div>
      </div>
    </div>
  );
}

const svgProps = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': true as const };

function BadgeIcon({ id, category, earned, isRare }: { id: string; category: string; earned: boolean; isRare: boolean }) {
  if (category === 'starmilestone') {
    return <StarMilestoneIcon id={id} earned={earned} isRare={isRare} />;
  }
  if (category === 'colourmastery') {
    return <ColourMasteryIcon id={id} earned={earned} isRare={isRare} />;
  }
  return <AchievementIcon earned={earned} />;
}

function StarMilestoneIcon({ id, earned, isRare }: { id: string; earned: boolean; isRare: boolean }) {
  const fill = !earned ? '#475569' : isRare ? '#A78BFA' : '#FACC15';
  const starPath = 'M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8z';

  if (id === 'star-all') {
    return (
      <svg {...svgProps}>
        <path d={starPath} fill={fill} />
        {earned && (
          <>
            <circle cx="3.5" cy="4" r="0.8" fill={fill} opacity="0.6" />
            <circle cx="16.5" cy="4" r="0.8" fill={fill} opacity="0.6" />
            <circle cx="4" cy="16" r="0.6" fill={fill} opacity="0.4" />
            <circle cx="16" cy="16" r="0.6" fill={fill} opacity="0.4" />
          </>
        )}
      </svg>
    );
  }

  const count = id === 'star-1-50' ? 1 : id === 'star-51-100' ? 2 : 3;

  if (count === 1) {
    return <svg {...svgProps}><path d={starPath} fill={fill} /></svg>;
  }

  if (count === 2) {
    return (
      <svg {...svgProps}>
        <path d="M7 3l1.8 3.6 4 .6-2.9 2.8.7 3.8L7 12l-3.6 2.8.7-3.8L1.2 8.2l4-.6z" fill={fill} />
        <path d="M13 3l1.8 3.6 4 .6-2.9 2.8.7 3.8L13 12l-3.6 2.8.7-3.8-2.9-2.8 4-.6z" fill={fill} opacity="0.7" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <path d="M5 4l1.3 2.7 3 .4-2.2 2.1.5 2.8L5 10.5 2.4 12l.5-2.8L.7 7.1l3-.4z" fill={fill} />
      <path d="M10 2l1.3 2.7 3 .4-2.2 2.1.5 2.8L10 8.5 7.4 10l.5-2.8-2.2-2.1 3-.4z" fill={fill} opacity="0.8" />
      <path d="M15 4l1.3 2.7 3 .4-2.2 2.1.5 2.8L15 10.5 12.4 12l.5-2.8-2.2-2.1 3-.4z" fill={fill} opacity="0.6" />
    </svg>
  );
}

function ColourMasteryIcon({ id, earned, isRare }: { id: string; earned: boolean; isRare: boolean }) {
  const numStr = id.replace('colour-', '');
  const colourCount = parseInt(numStr, 10) || 3;

  const colours: string[] = [];
  for (let i = 1; i <= colourCount; i++) {
    colours.push(PALETTE[i] ?? '#666');
  }

  const radius = 2.2;
  const cx = 10;
  const cy = 10;
  const ringRadius = colourCount <= 4 ? 4.5 : colourCount <= 7 ? 5.5 : 6.5;

  return (
    <svg {...svgProps}>
      {colours.map((colour, i) => {
        const angle = (i / colours.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * ringRadius;
        const y = cy + Math.sin(angle) * ringRadius;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={radius}
            fill={earned ? colour : '#475569'}
            opacity={earned ? 1 : 0.5}
          />
        );
      })}
      {isRare && earned && (
        <circle cx={cx} cy={cy} r={1.5} fill="#A78BFA" opacity="0.8" />
      )}
    </svg>
  );
}

function AchievementIcon({ earned }: { earned: boolean }) {
  const fill = earned ? '#FACC15' : '#475569';
  return (
    <svg {...svgProps}>
      <path d="M10 2l1.5 3 3.5.5-2.5 2.5.5 3.5L10 10l-3 1.5.5-3.5L5 5.5 8.5 5z" fill={fill} />
      <rect x="7" y="13" width="6" height="2" rx="1" fill={fill} opacity="0.6" />
      <rect x="8" y="15.5" width="4" height="1.5" rx="0.75" fill={fill} opacity="0.4" />
    </svg>
  );
}
