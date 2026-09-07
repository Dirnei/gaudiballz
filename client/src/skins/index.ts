/**
 * Presentation only — how a board looks, never how it behaves.
 *
 * This layer used to offer three "skins" that differed by a single border-radius, which
 * advertised variety and delivered none. It is one look now, done properly. The boundary
 * survives because it is still the right one: the engine deals in colour indices and knows
 * nothing about any of this, so a genuine second look (hex nuts on a bolt, yarn loops on a
 * pin) can be added later without touching a rule.
 */

/**
 * Chosen for distinguishability, not prettiness: the puzzle is unplayable if two colours
 * read alike, and around one in twelve men has some colour vision deficiency. Hues are
 * spread widely and lightness varies as well as hue, so items stay separable even when hue
 * perception does not help.
 */
export const PALETTE = [
  '#00000000', // unused; colours are 1-based
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48', // rose
] as const;

/**
 * A sphere, built from the flat colour: a specular highlight up and left, a bounce of
 * shading below, and a contact shadow. This is what separates "a coloured circle" from
 * something that looks like an object in a tube.
 */
export function ballStyle(colour: number): React.CSSProperties {
  const fill = PALETTE[colour] ?? PALETTE[1];

  return {
    borderRadius: '9999px',
    backgroundColor: fill,
    backgroundImage: [
      'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.55), rgba(255,255,255,0) 45%)',
      'radial-gradient(circle at 50% 118%, rgba(0,0,0,0.38), rgba(0,0,0,0) 52%)',
    ].join(','),
    boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.45)',
  };
}

/** The glass tube: a bright left edge, a dim body, a softer right edge. */
export const TUBE_STYLE: React.CSSProperties = {
  borderRadius: '0.5rem 0.5rem 1.4rem 1.4rem',
  backgroundImage: [
    'linear-gradient(100deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 22%,' +
      ' rgba(255,255,255,0.02) 68%, rgba(255,255,255,0.09) 100%)',
  ].join(','),
  border: '1px solid rgba(255,255,255,0.14)',
  borderTop: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.28)',
};
