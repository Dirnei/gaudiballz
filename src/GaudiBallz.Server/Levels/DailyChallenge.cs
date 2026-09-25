using GaudiBallz.Rules;

namespace GaudiBallz.Server.Levels;

/// <summary>
/// One puzzle a day, the same for everyone.
///
/// The board is derived from the UTC date alone — no database, no state — so it can be
/// cached hard, served to anonymous players and regenerated on any node.
/// </summary>
public static class DailyChallenge
{
    /// <summary>How many boards to generate before picking one.</summary>
    private const int Candidates = 14;

    /// <summary>
    /// Mid-range difficulty: 6 colours, capacity 4, 2 spare tubes.
    /// Equivalent to about level 30 in the campaign.
    /// </summary>
    public static readonly LevelParameters Parameters =
        LevelParameters.ForColours(colours: 6, capacity: 4, spareTubes: 2);

    /// <summary>
    /// Target tightness for the daily board, matching ~level 30:
    /// 0.10 + (29/48 * 0.26) ~ 0.26.
    /// </summary>
    private const double TargetTightness = 0.26;

    /// <summary>
    /// Boards already generated, by date. Every daily completion now replays its moves on the
    /// day's board, and generating one runs <see cref="Candidates"/> boards, so the result is kept.
    /// Only yesterday's and today's stay: older ones are dropped as a new day is added.
    /// </summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<DateOnly, Level> Cache = new();

    public static Level BoardForDate(DateOnly date)
    {
        if (Cache.TryGetValue(date, out var cached))
        {
            return cached;
        }

        var level = Generate(date);
        Cache[date] = level;

        foreach (var old in Cache.Keys.Where(d => d < date.AddDays(-1)))
        {
            Cache.TryRemove(old, out _);
        }

        return level;
    }

    private static Level Generate(DateOnly date)
    {
        var dateInt = (ulong)(date.Year * 10000 + date.Month * 100 + date.Day);

        Level? best = null;
        var bestDistance = double.MaxValue;

        for (var candidate = 0; candidate < Candidates; candidate++)
        {
            var seed = Pcg32.SplitMix64(
                (dateInt * 0x9E3779B97F4A7C15UL) ^ ((ulong)candidate * 0xD1B54A32D192ED03UL));

            var level = LevelGenerator.Generate(seed, Parameters);
            var distance = Math.Abs(LevelCatalogue.Tightness(level) - TargetTightness);

            if (distance < bestDistance)
            {
                bestDistance = distance;
                best = level;
            }
        }

        return best!;
    }

    /// <summary>Par moves times 3 seconds, same formula as the 2-spare-tube campaign.</summary>
    public static int TimeTargetMs(Level level) =>
        level.ConstructiveSolution.Count * 3 * 1000;
}
