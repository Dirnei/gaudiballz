import { useTranslation } from 'react-i18next';
import { TIER_COLOURS, type TierName } from './rank';

export function RankBadge({ tier, subLevel, className }: { tier: TierName; subLevel: number; className?: string }) {
  const { t } = useTranslation();
  const colour = TIER_COLOURS[tier];
  const label = t(`rank.${tier}`);

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${className ?? ''}`} style={{ color: colour }}>
      {label}&nbsp;{subLevel}
    </span>
  );
}
