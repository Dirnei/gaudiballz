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
 * The pale colours carry a swirl as well as a hue.
 *
 * Light blue, light green, yellow and white all sit at the top of the lightness range, so
 * they arrive together in the late game and read as one washed-out group even though their
 * measured separation is fine. A pattern gives them a second thing to differ by.
 *
 * The swirl is a conic gradient offset toward the specular highlight, which makes it curve
 * with the sphere rather than sitting flat across it. The number of arms differs per colour,
 * so the pattern itself distinguishes them rather than only marking them all as pale — and
 * counting arms works even for someone who cannot separate the hues at all.
 *
 * Two-tone: a light arm with a faint dark one between. White alone on a pale ball is barely
 * there, and dark alone reads as dirt — pairing them gives the swirl definition without
 * either problem, and the ball still looks lit rather than marked.
 */
const SWIRL: Readonly<Record<number, { arms: number; phase: number }>> = {
  4: { arms: 6, phase: 0 }, // yellow
  8: { arms: 4, phase: 22 }, // light blue
  9: { arms: 7, phase: 12 }, // light green
  12: { arms: 5, phase: 40 }, // white
};

/**
 * A sphere, built from the flat colour: a specular highlight up and left, a bounce of
 * shading below, and a contact shadow. This is what separates "a coloured circle" from
 * something that looks like an object in a tube.
 */
export function ballStyle(colour: number): React.CSSProperties {
  const fill = PALETTE[colour] ?? PALETTE[1];
  const swirl = SWIRL[colour];

  const layers = [
    'radial-gradient(circle at 33% 27%, rgba(255,255,255,0.34), rgba(255,255,255,0) 42%)',
    'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.30), rgba(0,0,0,0) 50%)',
  ];

  if (swirl !== undefined) {
    const step = 360 / (swirl.arms * 2);

    // Inserted beneath the specular highlight so the swirl looks like it is in the ball
    // rather than painted on the front of it.
    layers.splice(
      1,
      0,
      `repeating-conic-gradient(from ${swirl.phase}deg at 38% 34%,` +
        ` rgba(255,255,255,0.26) 0deg, rgba(255,255,255,0.26) ${step}deg,` +
        ` rgba(0,0,0,0.13) ${step}deg, rgba(0,0,0,0.13) ${step * 2}deg)`,
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
export function hasSwirl(colour: number): boolean {
  return colour in SWIRL;
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

/**
 * A ball colour derived from a name, so an account is recognisable at a glance by the same
 * pieces the game is made of rather than by a generic avatar.
 *
 * Stable for a given name and spread across the palette; the neutrals at the end are
 * skipped because a grey or white ball reads as "no account" rather than as someone's.
 */
export function colourForName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  const vivid = 10; // red through magenta; black, white and grey are excluded
  return 1 + (hash % vivid);
}
