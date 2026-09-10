import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TUBE_STYLE, ballStyle } from '../skins';

interface TubeProps {
  readonly ref?: React.Ref<HTMLButtonElement>;
  readonly items: readonly number[];
  readonly capacity: number;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly complete: boolean;
  readonly dropTarget?: boolean;
  readonly tubeIndex?: number;
  readonly onTap: () => void;
  readonly onPointerDown?: (e: React.PointerEvent) => void;
}

/**
 * One tube, filled bottom-up.
 *
 * Balls animate in and out rather than travelling between tubes: the engine models a board
 * as colours in slots, not as identified objects, so there is no stable identity to follow
 * along a path. A spring on entry reads as the ball dropping into place, which is the part
 * that actually makes a pour feel good.
 */
export function Tube({ ref, items, capacity, selected, focused, complete, dropTarget, tubeIndex, onTap, onPointerDown }: TubeProps) {
  const slots = Array.from({ length: capacity }, (_, i) => items[i]);

  // A one-shot celebration the moment a tube fills, rather than a permanent style. The
  // reward should land on the move that earned it.
  const wasComplete = useRef(complete);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (complete && !wasComplete.current) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 620);
      return () => clearTimeout(timer);
    }
    wasComplete.current = complete;
    return undefined;
  }, [complete]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onPointerDown ? undefined : onTap}
      onPointerDown={onPointerDown}
      data-tube-index={tubeIndex}
      aria-label={`Tube holding ${items.length} of ${capacity}${complete ? ', complete' : ''}`}
      aria-pressed={selected}
      className="flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-0"
      style={{ padding: 'var(--gap)', borderRadius: '1rem', touchAction: 'none' }}
    >
      {/* Reserved space so tubes never shift as the selection moves between them. */}
      <div className="flex h-3 items-center">
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 5, scaleX: 0.4 }}
              animate={{ opacity: 1, y: 0, scaleX: 1 }}
              exit={{ opacity: 0, y: 5, scaleX: 0.4 }}
              className="h-1.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.95)]"
              style={{ width: 'calc(var(--ball) * 0.8)' }}
            />
          )}
        </AnimatePresence>
      </div>

      <motion.div
        animate={{
          y: selected ? -6 : 0,
          scale: justCompleted ? [1, 1.09, 1] : 1,
          opacity: complete && !justCompleted ? 0.66 : 1,
        }}
        transition={
          justCompleted
            ? { duration: 0.45, times: [0, 0.35, 1], ease: 'easeOut' }
            : { type: 'spring', stiffness: 500, damping: 32 }
        }
        className="flex flex-col-reverse items-center"
        style={{
          ...TUBE_STYLE,
          gap: 'var(--gap)',
          padding: 'calc(var(--gap) * 1.4)',
          ...(dropTarget
            ? { boxShadow: `${TUBE_STYLE.boxShadow}, 0 0 0 2px rgba(56,189,248,0.6), 0 0 16px rgba(56,189,248,0.25)` }
            : focused
              ? { boxShadow: `${TUBE_STYLE.boxShadow}, 0 0 0 2px rgba(250,204,21,0.7)` }
              : complete
                ? { boxShadow: `${TUBE_STYLE.boxShadow}, 0 0 0 1px rgba(255,255,255,0.18)` }
                : null),
        }}
      >
        {slots.map((colour, slot) => (
          <div key={slot} style={{ width: 'var(--ball)', height: 'var(--ball)' }}>
            <AnimatePresence initial={false}>
              {colour !== undefined && (
                <motion.div
                  key={colour}
                  initial={{ y: -18, scale: 0.78, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: -14, scale: 0.78, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 660, damping: 27 }}
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
