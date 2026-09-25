/** A daily's UTC date ("2026-09-25") as the player's language writes it, e.g. "Sep 25". */
export function formatDailyDate(dateStr: string, lng: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString(lng, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}
