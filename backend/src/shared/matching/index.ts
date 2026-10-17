export { canonicalIngredient } from './ingredients';
export { parseBranded, parseGeneric, detectForm, detectRelease, strengthsEqual } from './parse';
export type { ParsedProduct, ParsedIngredient, Strength, Form, Release } from './parse';
export { scoreMatch, bestMatch } from './match';
export type { MatchTier, MatchResult } from './match';
