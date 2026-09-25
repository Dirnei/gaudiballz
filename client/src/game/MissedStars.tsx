import { useTranslation } from 'react-i18next';
import { formatTime } from './LiveTimer';
import { type AttemptNumbers, missedStarReasons, type MissedStarReason } from './missedStarReasons';

interface MissedStarsProps {
  /** The stars the server awarded; it stays the authority on whether anything was missed. */
  readonly stars: number;
  readonly attempt: AttemptNumbers;
}

/** One line per condition the attempt missed for 3 stars, shown under the stars on a win. */
export function MissedStars({ stars, attempt }: MissedStarsProps) {
  const { t } = useTranslation();

  if (stars >= 3) return null;

  const reasons = missedStarReasons(attempt);
  if (reasons.length === 0) return null;

  function label(reason: MissedStarReason): string {
    switch (reason.kind) {
      case 'hints':
        return t('game.missedHint');
      case 'moves':
        return t('game.missedMoves', { count: reason.over });
      case 'time':
        return t('game.missedTime', { time: formatTime(reason.overSeconds * 1000) });
    }
  }

  return (
    <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
      {reasons.map((reason) => (
        <li key={reason.kind}>{label(reason)}</li>
      ))}
    </ul>
  );
}
