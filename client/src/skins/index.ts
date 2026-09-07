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
 * Chosen by measurement, not by taste.
 *
 * The first attempt used one Tailwind 500-weight per hue, which meant every colour sat at
 * nearly the same lightness and differed only in hue. Measured in CIE Lab, and simulating
 * the two common forms of colour blindness, the worst pair among the first ten came out at
 * a perceptual distance of 1.8 - indistinguishable - and the whole set spanned only 26
 * points of lightness.
 *
 * This palette was searched for instead: the six canonical colours were brute-forced over
 * variants of each hue, then the remainder chosen greedily to maximise the smallest
 * perceptual distance. The worst pair is 21 at every count up to twelve, across normal
 * vision, protanopia and deuteranopia, and lightness spans 69 points - so the colours stay
 * separable even where hue perception does not help, and a screenshot in greyscale is
 * still readable.
 *
 * Order matters: a level with N colours uses the first N entries, so the most separable
 * colours are used earliest. Changing the order changes every level's appearance.
 */
export const PALETTE = [
  '#00000000', // unused; colours are 1-based
  '#B3261E', // red
  '#2979FF', // blue
  '#2E9E4F', // green
  '#FFE95C', // yellow
  '#4A148C', // violet
  '#E65100', // orange
  '#81D4FA', // sky
  '#546E7A', // slate
  '#EFE7D2', // cream
  '#5D4037', // cocoa
  '#FFCC80', // apricot
  '#B0BEC5', // silver
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
      'radial-gradient(circle at 33% 27%, rgba(255,255,255,0.34), rgba(255,255,255,0) 42%)',
      'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.30), rgba(0,0,0,0) 50%)',
    ].join(','),
    boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.25)',
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
