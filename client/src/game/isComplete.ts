export function isComplete(tube: readonly number[], capacity: number): boolean {
  return tube.length === capacity && tube.every((colour) => colour === tube[0]);
}
