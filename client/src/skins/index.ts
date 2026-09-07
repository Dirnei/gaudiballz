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
 * The thirteen colours, in the order levels introduce them.
 *
 * The order is the product decision - red, green, blue, yellow, orange, violet, pink,
 * light blue, light green, magenta, black, white, gray - and a level using N colours takes
 * the first N, so early levels only ever see the top of the list.
 *
 * Only the exact shade of each was tuned, by hill-climbing over variants of every name to
 * maximise the smallest perceptual distance in CIE Lab, taken as the worst case across
 * normal vision, protanopia and deuteranopia. The closest pair is 17.4 (pink against gray),
 * then yellow against orange at 18.9. An earlier palette built from one Tailwind weight per
 * hue measured 1.8 at ten colours - two shades nobody could separate.
 *
 * Black, white and gray are what make this hold up. Every hue sits somewhere on the colour
 * wheel and they crowd each other as more are added; neutrals sit off the wheel entirely and
 * separate by lightness, which is also what survives colour blindness.
 *
 * Changing the order changes every level's appearance, so it is not a free edit.
 */
export const PALETTE = [
  '#00000000', // unused; colours are 1-based
  '#D92B20', // 1  red
  '#2FA84A', // 2  green
  '#007AFF', // 3  blue
  '#FFD60A', // 4  yellow
  '#FF8A1E', // 5  orange
  '#8E3FC0', // 6  violet
  '#FF66B2', // 7  pink
  '#7FDBFF', // 8  light blue
  '#A8E86A', // 9  light green
  '#B5179E', // 10 magenta
  '#2C2C2E', // 11 black
  '#FFFFFF', // 12 white
  '#7C7C82', // 13 gray
] as const;

/**
 * The pale colours carry a stripe as well as a hue.
 *
 * Light blue, light green, yellow and white all sit at the top of the lightness range, so
 * they arrive together in the late game and read as one washed-out group even though their
 * measured separation is fine. A stripe gives them a second thing to differ by, and the
 * angle differs per colour so the pattern itself distinguishes them rather than just marking
 * them all as "pale".
 *
 * This is also the accessibility answer: with a pattern doing part of the work, the game
 * stays readable for someone who cannot separate the hues at all.
 */
const STRIPE_ANGLE: Readonly<Record<number, number>> = {
  4: 90, // yellow      — vertical
  8: 45, // light blue  — leaning right
  9: -45, // light green — leaning left
  12: 0, // white       — horizontal
};

/**
 * A sphere, built from the flat colour: a specular highlight up and left, a bounce of
 * shading below, and a contact shadow. This is what separates "a coloured circle" from
 * something that looks like an object in a tube.
 */
export function ballStyle(colour: number): React.CSSProperties {
  const fill = PALETTE[colour] ?? PALETTE[1];
  const angle = STRIPE_ANGLE[colour];

  const layers = [
    'radial-gradient(circle at 33% 27%, rgba(255,255,255,0.34), rgba(255,255,255,0) 42%)',
    'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.30), rgba(0,0,0,0) 50%)',
  ];

  if (angle !== undefined) {
    // Dark enough to read on a pale ball, light enough not to become a colour of its own.
    layers.unshift(
      `repeating-linear-gradient(${angle}deg,` +
        ' rgba(0,0,0,0.19) 0px, rgba(0,0,0,0.19) 3px,' +
        ' rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)',
    );
  }

  return {
    borderRadius: '9999px',
    backgroundColor: fill,
    backgroundImage: layers.join(','),
    boxShadow:
      'inset 0 -2px 5px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.22)',
  };
}

/** True when this colour is told apart by pattern as well as hue. */
export function hasStripes(colour: number): boolean {
  return colour in STRIPE_ANGLE;
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
