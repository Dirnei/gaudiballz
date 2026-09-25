import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { TUBE_STYLE, ballStyle } from '../skins';
import type { Move } from '../engine';

interface BoardPreviewProps {
  /** Each tube bottom-up, as the level endpoints serve it. */
  readonly tubes: readonly (readonly number[])[];
  readonly capacity: number;
  /** A pour to point out, during a replay: its source and destination tubes are ringed. */
  readonly highlight?: Move | null;
  /** Whether balls spring in and out as the board changes. Off for a still picture or reduced motion. */
  readonly animate?: boolean;
}

const RING = {
  from: '0 0 0 2px rgba(251,191,36,0.85), 0 0 14px rgba(251,191,36,0.35)',
  to: '0 0 0 2px rgba(56,189,248,0.85), 0 0 14px rgba(56,189,248,0.35)',
} as const;

/**
 * A picture of a board: the same tubes and balls as play, with none of play's tap, drag or
 * focus. Something to look at, so it is one image to assistive technology rather than a row of
 * buttons that do nothing.
 *
 * During a replay the balls spring in and out with the same motion as the game's own tubes, and
 * the pour being shown has its two tubes ringed: amber where the balls came from, blue where they
 * went.
 */
export function BoardPreview({ tubes, capacity, highlight = null, animate = false }: BoardPreviewProps) {
  const { t } = useTranslation();

  return (
    <div
      role="img"
      aria-label={t('shared.boardLabel')}
      className="flex flex-wrap justify-center gap-2"
      style={{ '--ball': '1.4rem', '--gap': '0.2rem' } as React.CSSProperties}
    >
      {tubes.map((items, tube) => {
        const role = highlight?.from === tube ? 'from' : highlight?.to === tube ? 'to' : undefined;
        return (
          <div
            key={tube}
            data-tube
            data-highlight={role}
            className="flex flex-col-reverse items-center"
            style={{
              ...TUBE_STYLE,
              gap: 'var(--gap)',
              padding: 'calc(var(--gap) * 1.4)',
              ...(role ? { boxShadow: `${TUBE_STYLE.boxShadow}, ${RING[role]}` } : null),
            }}
          >
            {Array.from({ length: capacity }, (_, slot) => (
              <div key={slot} style={{ width: 'var(--ball)', height: 'var(--ball)' }}>
                <AnimatePresence initial={false}>
                  {items[slot] !== undefined && (
                    <motion.div
                      key={items[slot]}
                      data-ball
                      initial={animate ? { y: -14, scale: 0.78, opacity: 0 } : false}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={animate ? { y: -12, scale: 0.78, opacity: 0 } : { opacity: 0, transition: { duration: 0 } }}
                      transition={{ type: 'spring', stiffness: 660, damping: 27 }}
                      className="h-full w-full"
                      style={ballStyle(items[slot])}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
