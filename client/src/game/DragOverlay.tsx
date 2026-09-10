import { ballStyle } from '../skins';
import type { Point } from './useDrag';

interface DragOverlayProps {
  readonly colours: readonly number[];
  readonly position: Point;
}

export function DragOverlay({ colours, position }: DragOverlayProps) {
  if (colours.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="flex flex-col-reverse items-center" style={{ gap: 'var(--gap, 3px)' }}>
        {colours.map((colour, i) => (
          <div
            key={i}
            style={{
              width: 'var(--ball, 28px)',
              height: 'var(--ball, 28px)',
              ...ballStyle(colour),
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            }}
          />
        ))}
      </div>
    </div>
  );
}
