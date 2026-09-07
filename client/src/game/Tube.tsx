import { AnimatePresence, motion } from 'motion/react';
import { TUBE_STYLE, ballStyle } from '../skins';

interface TubeProps {
  readonly items: readonly number[];
  readonly capacity: number;
  readonly selected: boolean;
  readonly complete: boolean;
  readonly onTap: () => void;
}

/**
 * One tube, filled bottom-up.
 *
 * Balls animate in and out rather than travelling between tubes: the engine models a board
 * as colours in slots, not as identified objects, so there is no stable identity to animate
 * along a path. A spring on entry reads as the ball dropping into place, which is the part
 * that actually makes a pour feel good.
 */
export function Tube({ items, capacity, selected, complete, onTap }: TubeProps) {
  const slots = Array.from({ length: capacity }, (_, i) => items[i]);

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`Tube holding ${items.length} of ${capacity}${complete ? ', complete' : ''}`}
      aria-pressed={selected}
      className="flex touch-manipulation flex-col items-center gap-1.5 rounded-2xl px-1 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      {/* Reserved space so tubes never shift as the selection moves between them. */}
      <div className="flex h-3 items-center">
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="h-1.5 w-7 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
            />
          )}
        </AnimatePresence>
      </div>

      <motion.div
        animate={{
          y: selected ? -5 : 0,
          // A finished tube dims slightly and stops competing for attention.
          opacity: complete ? 0.62 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="flex flex-col-reverse items-center gap-1 p-1.5"
        style={{
          ...TUBE_STYLE,
          ...(complete
            ? { boxShadow: `${TUBE_STYLE.boxShadow}, 0 0 0 1px rgba(255,255,255,0.16)` }
            : null),
        }}
      >
        {slots.map((colour, slot) => (
          <div key={slot} className="h-8 w-8 sm:h-9 sm:w-9">
            <AnimatePresence initial={false}>
              {colour !== undefined && (
                <motion.div
                  key={colour}
                  initial={{ y: -16, scale: 0.8, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: -12, scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 640, damping: 28 }}
                  className="h-full w-full"
                  style={ballStyle(colour)}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>
    </button>
  );
}
