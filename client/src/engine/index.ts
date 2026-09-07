/**
 * The rules engine: board model, legal-move rule, move application, win detection.
 *
 * This module imports nothing from React, the DOM, or the network, and the lint config
 * enforces that. It is one half of a cross-language pair — the other half is
 * `Puzzle.Domain` in C# — and the two are held in step by the shared fixtures in
 * `conformance/v1/`. Keeping it a pure function of its inputs is what makes that
 * possible.
 *
 * The rules themselves arrive in the next change, written against `docs/RULES.md` rather
 * than improvised here.
 */

/** Bumped whenever rule behaviour changes. Submitted with every solution so the server
 *  verifies against the rules the client actually played. */
export const RULES_VERSION = 1;
