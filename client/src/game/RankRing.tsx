import { TIER_COLOURS, type TierName } from './rank';

export function RankRing({ tier, children, size = 40 }: { tier: TierName; children: React.ReactNode; size?: number }) {
  const colour = TIER_COLOURS[tier];
  const ringWidth = Math.max(2, Math.round(size * 0.08));

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size + ringWidth * 2,
        height: size + ringWidth * 2,
        boxShadow: `0 0 0 ${ringWidth}px ${colour}`,
      }}
    >
      {children}
    </div>
  );
}
