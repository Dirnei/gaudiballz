/**
 * Presentation only. A skin maps an abstract colour index to a rendered item — a ball, a
 * nut, a loop of thread — and supplies the container shape around it.
 *
 * Adding a skin must require no engine or game changes. That constraint is the point:
 * it is the structural test that the layering actually held, and it is what lets one
 * engine be "ball sort", "nut sort" and "thread jam" at once.
 */

export type SkinId = 'balls' | 'nuts' | 'threads';

export const DEFAULT_SKIN: SkinId = 'balls';
