/**
 * The rules engine: board model, legal-move rule, move application, win detection.
 *
 * Imports nothing from React, the DOM, or the network, and the lint config enforces that.
 * It is one half of a cross-language pair - the other half is `GaudiBallz.Rules` in C# - held
 * in step by the shared fixtures in `conformance/v1/`.
 */

export * from './board';
export * from './rules';
export * from './history';
export * from './solver';
