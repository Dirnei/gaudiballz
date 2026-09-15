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
 * light blue, light green, magenta, black, white, camo - and a level using N colours takes
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
  '#4C5A41', // 13 camo (woodland green base)
] as const;

/**
 * What to call each colour, in the same order.
 *
 * The palette was tuned to stay separable under protanopia and deuteranopia, and a picker
 * that identified its options by colour alone would throw that away at the one screen where
 * the player is choosing between colours specifically. These are the accessible names of the
 * picker's controls, and they are what a locked ball's hint reads out with.
 */
export const COLOUR_NAMES = [
  '', // unused; colours are 1-based
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Violet',
  'Pink',
  'Light blue',
  'Light green',
  'Magenta',
  'Black',
  'White',
  'Camo',
] as const;

/** What this colour is called, for anything that has to say it in words. */
export function colourName(colour: number): string {
  return COLOUR_NAMES[colour] ?? `Colour ${colour}`;
}

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
const SWIRL: Readonly<
  Record<number, { arms: number; phase: number; light?: string; dark?: string }>
> = {
  4: { arms: 6, phase: 0 }, // yellow
  8: { arms: 4, phase: 22 }, // light blue
  12: { arms: 5, phase: 40 }, // white
};

/**
 * Rings: concentric circular bands in a second colour, like latitude lines on a globe.
 *
 * A repeating-radial-gradient from an off-centre origin produces rings that curve with
 * the sphere. The band width and gap are percentages of the ball radius.
 */
const RINGS: Readonly<
  Record<number, { colour: string; band: number; gap: number }>
> = {
  9: { colour: 'rgba(0,100,55,0.50)', band: 5, gap: 10 },
};

/**
 * Hearts: small heart shapes scattered across the ball surface.
 *
 * Where the swirl and rings serve accessibility (distinguishing pale colours under colour
 * blindness), the hearts are purely decorative — magenta is already distinctive. They give
 * the late-game palette a bit of personality.
 *
 * Each entry positions a heart by translate + scale over the standard 24-unit heart path,
 * biased toward the specular highlight so the pattern curves with the sphere.
 */
const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

type ShapeEntry = readonly { x: number; y: number; s: number }[];

const SHAPES: Readonly<
  Record<number, { path: string; entries: ShapeEntry }>
> = {
  10: { path: HEART_PATH, entries: [{ x: 16, y: 12, s: 2.8 }] },
};

function svgShapeLayer(shapePath: string, entries: ShapeEntry): string {
  const uses = entries
    .map(
      (h) =>
        `<use href='%23s' transform='translate(${h.x},${h.y}) scale(${h.s})'/>`,
    )
    .join('');
  return (
    `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<defs><path id='s' d='${shapePath}'/></defs>` +
    `<g fill='rgba(255,255,255,0.28)'>${uses}</g></svg>")`
  );
}

/**
 * Tiles: a repeating checkerboard rotated 45° into a diamond grid — the classic 1960s
 * diner floor. On the black ball the tiles are white at low opacity, so the ball still
 * reads as dark but gains a distinctive texture.
 */
function tileLayer(size: number, fill: string): string {
  const half = size / 2;
  return (
    `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<defs><pattern id='p' width='${size}' height='${size}' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>` +
    `<rect width='${half}' height='${half}' fill='${fill}'/>` +
    `<rect x='${half}' y='${half}' width='${half}' height='${half}' fill='${fill}'/>` +
    `</pattern></defs>` +
    `<rect width='100' height='100' fill='url(%23p)'/></svg>")`
  );
}

const TILES: Readonly<Record<number, string>> = {
  11: tileLayer(32, 'rgba(255,255,255,0.75)'),
};

const SVG_OVERLAY: Readonly<Record<number, string>> = {
  7: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<ellipse cx='50' cy='48' rx='30' ry='22' fill='rgba(255,255,255,0.25)' stroke='rgba(0,0,0,0.22)' stroke-width='2'/>` +
    `<ellipse cx='37' cy='48' rx='8' ry='10' fill='rgba(0,0,0,0.35)' transform='rotate(-8 37 48)'/>` +
    `<ellipse cx='63' cy='48' rx='8' ry='10' fill='rgba(0,0,0,0.35)' transform='rotate(8 63 48)'/>` +
    `</svg>")`,
  13: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 329.3 329.3'><path d='M 329.29883,3.0585938 303.66211,26.373047 230.11328,47.789062 115.8457,39.644531 0,54.886719 V 135.27148 L 127.20898,158.20312 0,175.25195 v 58.95117 l 43.244141,0.92969 c 10.101001,12.36742 16.09853,16.89029 23.042968,15.6836 6.944437,-1.20669 18.30886,9.6534 27.462891,9.95507 9.15403,0.30168 20.83273,-7.53962 33.45898,-6.03125 12.62625,1.50835 20.51842,6.63477 35.66993,6.63477 15.15149,0 34.0907,-5.73164 45.13867,-9.95508 11.04797,-4.22342 30.93359,-7.23984 30.93359,-9.35156 0,-2.11172 -6.94451,-5.72952 -18.93945,-9.34961 -11.99494,-3.62009 -21.78009,-17.19851 -13.88867,-28.66211 7.8914,-11.4636 14.20514,-19.00541 37.24804,-13.87695 23.04291,5.12845 49.55872,1.50926 56.1875,-0.30078 5.34923,-1.46065 18.38967,-3.42142 29.74024,-3.8418 z M 308.55664,250.28906 c -8.11027,-0.5271 -17.28488,2.11231 -20.04687,4.75196 -4.41919,4.22343 -5.99646,19.00593 9.4707,26.24609 8.33562,3.9019 20.46954,4.43037 31.31836,6.03125 V 261.7168 c -3.48866,-1.36245 -6.6395,-3.38081 -8.90821,-6.375 -2.48579,-3.28071 -6.96782,-4.73648 -11.83398,-5.05274 z' fill='%234e3b2d'/><path d='m 309.26367,89.734375 c -10.55437,0.602238 -34.40476,13.638875 -41.58594,20.501955 -8.83838,8.44687 -33.46045,13.87796 -42.29882,17.49805 -8.83838,3.62008 -24.93784,11.46273 -53.03125,10.85937 -28.09341,-0.60334 -38.50943,-3.61914 -49.87305,-3.61914 -11.36363,0 -30.30286,-9.6543 -36.931641,-9.6543 -6.628782,0 -30.619703,4.82813 -40.720703,4.82813 -8.912869,0 -25.443497,-9.62156 -44.822266,-6.08594 v 65.3418 c 24.406542,-1.61698 42.476887,-3.16379 50.820312,-6.46289 9.154031,-3.62009 31.250407,-6.03393 42.929688,-5.12891 11.67928,0.90503 26.19902,7.84393 35.98438,8.44727 9.78534,0.60335 13.88875,9.95363 32.82812,11.76367 18.93938,1.81005 32.19853,-8.74699 15.46875,-8.44532 -16.72977,0.30167 -36.61719,-15.08516 -36.61719,-19.30859 0,-4.22343 16.73074,-15.68559 25.88477,-12.36719 9.15403,3.31841 39.14013,1.20591 47.97851,4.22266 8.83837,3.01674 41.66748,3.31759 50.50586,-3.01758 8.83837,-6.33514 11.99446,-12.97015 8.83789,-14.47851 -3.15655,-1.50837 -3.47184,4.82528 -19.57031,5.12695 -16.09847,0.30168 -31.88221,6.63811 -34.0918,-2.41211 -2.20959,-9.0502 22.72787,-19.00603 37.24805,-19.60937 14.52019,-0.60335 21.14945,-1.50822 30.61914,-9.95508 9.46968,-8.44687 28.72418,-18.704254 25.25195,-26.246097 -0.65104,-1.414097 -2.37882,-1.937806 -4.81445,-1.798828 z M 67.503906,214.64453 c -1.698502,-0.033 -3.465832,0.0472 -5.320312,0.27344 -14.835843,1.81005 -23.67336,8.44726 -28.408203,8.44726 -4.734845,0 -10.41675,-3.01779 -14.835938,-0.30273 C 15.574557,225.12958 7.6376187,226.65818 0,223.81641 v 31.59765 c 11.41413,-4.98726 26.419463,-12.8675 40.404297,-12.13867 17.361095,0.90503 22.412047,-3.31803 38.826172,-2.11133 16.414124,1.20669 34.089371,-1.20748 38.824221,-6.33594 4.73483,-5.12844 -2.83918,-14.17773 -17.35938,-14.17773 -12.705158,0 -21.30189,-5.77489 -33.191404,-6.00586 z M 0,310.20703 v 14.99219 c 5.6439338,4.70972 6.5980906,5.29575 6.9453125,-1.67774 C 7.1448073,319.51285 4.0542888,314.0576 0,310.20703 Z m 190.92383,2.99024 c -7.91645,0.27214 -16.91895,2.12217 -26.78321,5.79882 l -0.84374,10.30469 h 60.69335 c -5.20309,-10.56371 -16.83747,-16.66141 -33.0664,-16.10351 z' fill='%2383795d'/><path d='M 66.396484,0 C 67.102047,1.0991659 67.898231,2.2438777 68.8125,3.4453125 76.38825,13.400547 84.596313,17.622387 82.386719,25.767578 80.177125,33.912771 62.816313,36.024836 47.980469,37.533203 33.144625,39.041574 14.203875,47.187657 14.519531,37.232422 14.835188,27.277187 26.19986,14.606298 15.783203,7.0644531 5.3665471,-0.47739233 4.7349844,17.020876 2.5253906,21.847656 1.7501389,23.54065 0.9343425,25.492532 0,27.457031 V 75.886719 C 12.823219,71.027364 18.314625,71.818962 13.257812,80.976562 7.2603435,91.836822 -0.31493753,106.31508 8.5234375,101.48828 17.361812,96.661506 26.200094,78.260036 33.144531,72.226562 c 6.944438,-6.033473 24.305125,-7.240858 27.777344,-12.972656 3.472219,-5.731803 4.418125,-3.620188 2.839844,6.636719 -1.578282,10.25691 10.41811,13.878668 12.943359,6.035156 2.525251,-7.843522 17.992157,-11.464739 26.199222,-18.101562 8.20706,-6.636823 14.51956,-6.032468 6.3125,3.621093 -8.20706,9.653558 -1.89291,17.797717 5.36718,20.814454 7.2601,3.016737 10.10108,-5.127858 18.93946,-15.384766 8.83837,-10.256908 9.46905,-9.957745 6.3125,1.505859 -3.15657,11.463599 5.3652,15.991285 13.57226,5.734375 8.20706,-10.256902 9.46964,-3.921932 12.31055,-0.603515 2.84091,3.318406 5.99923,3.921081 9.78711,-2.414063 3.78788,-6.335151 11.04687,2.11217 11.04687,5.128906 0,3.016737 -8.83896,19.307611 -1.89453,26.246094 6.94445,6.938504 17.04645,7.240004 13.57422,-0.603515 -3.47221,-7.843513 8.20793,-5.130156 6.94531,-27.152344 -1.26262,-22.022181 10.73074,-16.891906 19.88477,-14.478516 9.15403,2.41339 11.68038,8.447266 24.30664,8.447266 12.62625,0 23.35789,-2.715003 18.62305,7.240234 -4.73484,9.95524 -0.94579,19.306641 3.78906,19.306641 4.73485,0 14.83549,-12.670316 15.4668,-21.117188 0.63132,-8.44686 -0.63135,-24.739561 8.20703,-22.326172 8.14822,2.22494 23.32759,8.89605 33.84375,11.841797 V 31.375 c -4.5044,1.611724 -5.75,0.246736 -5.75,-5.908203 0,-5.395809 2.12706,-10.129889 5.75,-12.412109 V 0 h -5.76563 c -2.65529,4.6587603 -6.21745,9.982432 -26.18554,17.322266 -24.62119,9.050213 -57.13233,21.116294 -65.97071,21.417968 -8.83837,0.301674 -15.46715,-6.033371 -39.45703,-6.636718 -23.98987,-0.603347 -41.03678,4.224609 -48.29687,4.224609 -7.2601,0 -34.40518,-9.050678 -41.34961,-15.6875 C 98.55041,17.082519 92.329909,8.5027765 87.271484,0 Z m 5.607422,285.08203 c -4.605375,-0.22684 -8.872734,1.44511 -12.029297,4.65039 -5.0505,5.12846 -16.414796,4.52623 -20.833984,7.54297 -4.419188,3.01674 -7.5745,15.38488 -12.625,19.30664 -5.050501,3.92177 -1.895329,12.97321 10.099609,11.46485 11.994937,-1.50838 16.414938,-6.93929 23.359375,-6.33594 6.944438,0.60334 14.83561,-8.14687 22.095703,-6.03516 7.260094,2.11173 3.473281,4.5273 -2.839843,7.8457 -2.706606,1.4227 -4.871213,3.66596 -5.853516,5.77735 h 24.314453 c 1.144323,-0.78192 2.11112,-1.60211 2.687504,-2.45899 2.8409,-4.22343 20.83289,-2.1121 31.88086,2.11133 0.25095,0.0959 0.54799,0.24409 0.80664,0.34766 h 38.87695 c -1.18478,-12.23251 -4.05313,-17.02033 -16.00977,-22.36914 -14.83584,-6.63683 -24.62078,-6.03595 -27.77734,-12.3711 -3.15657,-6.33514 -17.67711,-6.63409 -23.99023,-4.2207 -6.313133,2.4134 -16.098082,1.50859 -23.673832,-2.71484 -2.840907,-1.5838 -5.725058,-2.40492 -8.488282,-2.54102 z' fill='%231d1c1f'/></svg>")`,
};

/**
 * A sphere, built from the flat colour: a specular highlight up and left, a bounce of
 * shading below, and a contact shadow. This is what separates "a coloured circle" from
 * something that looks like an object in a tube.
 */
export function ballStyle(colour: number): React.CSSProperties {
  const fill = PALETTE[colour] ?? PALETTE[1];
  const swirl = SWIRL[colour];
  const rings = RINGS[colour];
  const shape = SHAPES[colour];
  const tiles = TILES[colour];
  const overlay = SVG_OVERLAY[colour];

  const layers = [
    'radial-gradient(circle at 33% 27%, rgba(255,255,255,0.34), rgba(255,255,255,0) 42%)',
    'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.30), rgba(0,0,0,0) 50%)',
  ];

  if (swirl !== undefined) {
    const step = 360 / (swirl.arms * 2);

    const light = swirl.light ?? 'rgba(255,255,255,0.26)';
    const dark = swirl.dark ?? 'rgba(0,0,0,0.13)';

    layers.splice(
      1,
      0,
      `repeating-conic-gradient(from ${swirl.phase}deg at 38% 34%,` +
        ` ${light} 0deg, ${light} ${step}deg,` +
        ` ${dark} ${step}deg, ${dark} ${step * 2}deg)`,
    );
  }

  if (rings !== undefined) {
    const step = rings.band + rings.gap;
    const f = 1.5; // feather: smooth the edges to avoid pixelation
    layers.splice(
      1,
      0,
      `repeating-radial-gradient(circle at 38% 34%,` +
        ` transparent 0, transparent ${rings.gap - f}%,` +
        ` ${rings.colour} ${rings.gap + f}%, ${rings.colour} ${step - f}%,` +
        ` transparent ${step + f}%)`,
    );
  }

  if (shape !== undefined) {
    layers.splice(1, 0, svgShapeLayer(shape.path, shape.entries));
  }

  if (tiles !== undefined) {
    layers.splice(1, 0, tiles);
  }

  if (overlay !== undefined) {
    layers.splice(1, 0, overlay);
  }

  const hasSvg = layers.some((l) => l.startsWith('url('));

  return {
    borderRadius: '9999px',
    backgroundColor: fill,
    backgroundImage: layers.join(','),
    ...(hasSvg
      ? {
          backgroundSize: layers
            .map((l) => (l.startsWith('url(') ? '100% 100%' : 'auto'))
            .join(', '),
        }
      : {}),
    boxShadow:
      'inset 0 -2px 5px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.22)',
  };
}

/**
 * The same ball, seen through a shadow.
 *
 * Deliberately not greyscale. A locked ball has to stay recognisably the object it will
 * become, because that is what makes the picker read as a collection with a road ahead
 * rather than as a row of empty slots — and full desaturation would render eleven of the
 * thirteen identical.
 *
 * The swirls survive, because they are how someone who cannot separate the pale hues tells
 * them apart, and that need does not go away because the ball is not earned yet.
 */
export function lockedBallStyle(colour: number): React.CSSProperties {
  return {
    ...ballStyle(colour),
    filter: 'saturate(0.4) brightness(0.42) contrast(0.9)',
    boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
  };
}

/**
 * A CSS background value for a small coloured dot representing a player.
 *
 * This is the flat palette colour — no specular highlight, no swirl, no shadow. It is meant
 * for the 14 px circles next to names on leaderboards and activity feeds, where the full
 * `ballStyle` would be wasted and its box-shadow would interfere with row layout.
 */
export function ballDotStyle(colour: number): string {
  return PALETTE[colour] ?? PALETTE[1];
}

/** True when this colour is told apart by pattern as well as hue. */
export function hasSwirl(colour: number): boolean {
  return colour in SWIRL || colour in RINGS;
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
