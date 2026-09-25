import { useTranslation } from 'react-i18next';
import { TUBE_STYLE, ballStyle } from '../skins';

interface BoardPreviewProps {
  /** Each tube bottom-up, as the level endpoints serve it. */
  readonly tubes: readonly (readonly number[])[];
  readonly capacity: number;
}

/**
 * A picture of a board: the same tubes and balls as play, with none of play's tap, drag, focus
 * or animation. Something to look at, so it is one image to assistive technology rather than a
 * row of buttons that do nothing.
 */
export function BoardPreview({ tubes, capacity }: BoardPreviewProps) {
  const { t } = useTranslation();

  return (
    <div
      role="img"
      aria-label={t('shared.boardLabel')}
      className="flex flex-wrap justify-center gap-2"
      style={{ '--ball': '1.4rem', '--gap': '0.2rem' } as React.CSSProperties}
    >
      {tubes.map((items, tube) => (
        <div
          key={tube}
          data-tube
          className="flex flex-col-reverse items-center"
          style={{ ...TUBE_STYLE, gap: 'var(--gap)', padding: 'calc(var(--gap) * 1.4)' }}
        >
          {Array.from({ length: capacity }, (_, slot) => (
            <div key={slot} style={{ width: 'var(--ball)', height: 'var(--ball)' }}>
              {items[slot] !== undefined && (
                <div data-ball className="h-full w-full" style={ballStyle(items[slot])} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
