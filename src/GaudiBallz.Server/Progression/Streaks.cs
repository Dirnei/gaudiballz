namespace GaudiBallz.Server.Progression;

/// <summary>
/// A player's day streak as of one UTC day.
/// </summary>
/// <param name="Current">Played days in the unbroken run, 0 when it is broken.</param>
/// <param name="Best">Played days in the longest unbroken run.</param>
/// <param name="CoveredNow">Missed days that held freezes are covering but have not been spent on yet.</param>
/// <param name="HeldShown">Freezes held, less the ones <paramref name="CoveredNow"/> will spend.</param>
/// <param name="LastActiveDay">The latest played or frozen day, if any.</param>
public sealed record StreakState(int Current, int Best, int CoveredNow, int HeldShown, DateOnly? LastActiveDay);

/// <summary>
/// Day streaks over played days (a completion that UTC day) and frozen days (a missed day a
/// streak freeze covered). A run is unbroken when every day in it is played or frozen, and its
/// length counts played days only, so a freeze keeps a streak without extending it.
/// </summary>
public static class Streaks
{
    public const int MaxHeldFreezes = 2;
    public const int DaysPerFreeze = 7;

    public static StreakState Compute(
        IEnumerable<DateOnly> played, IEnumerable<DateOnly> frozen, int held, DateOnly today)
    {
        var playedSet = played.ToHashSet();
        var runs = Runs(playedSet, frozen);
        if (runs.Count == 0)
        {
            return new StreakState(0, 0, 0, held, null);
        }

        var best = runs.Max(r => r.Length);
        var last = runs[^1];

        // Today only counts as missed once it is over.
        var gap = today.DayNumber - last.End.DayNumber - 1;
        if (gap <= 0)
        {
            return new StreakState(last.Length, best, 0, held, last.End);
        }

        return gap <= held
            ? new StreakState(last.Length, best, gap, held - gap, last.End)
            : new StreakState(0, best, 0, held, last.End);
    }

    /// <summary>
    /// Length of the latest run however long ago it ended. Achievements are evaluated right
    /// after a completion, when the latest run is the current one.
    /// </summary>
    public static int LatestRun(IEnumerable<DateOnly> played, IEnumerable<DateOnly> frozen)
    {
        var runs = Runs(played.ToHashSet(), frozen);
        return runs.Count == 0 ? 0 : runs[^1].Length;
    }

    public static int BestRun(IEnumerable<DateOnly> played, IEnumerable<DateOnly> frozen)
    {
        var runs = Runs(played.ToHashSet(), frozen);
        return runs.Count == 0 ? 0 : runs.Max(r => r.Length);
    }

    private readonly record struct StreakRun(DateOnly End, int Length);

    private static List<StreakRun> Runs(HashSet<DateOnly> played, IEnumerable<DateOnly> frozen)
    {
        var days = played.Union(frozen).Order().ToList();
        var runs = new List<StreakRun>();
        var length = 0;

        for (var i = 0; i < days.Count; i++)
        {
            if (i > 0 && days[i].DayNumber - days[i - 1].DayNumber != 1)
            {
                runs.Add(new StreakRun(days[i - 1], length));
                length = 0;
            }

            if (played.Contains(days[i]))
            {
                length++;
            }
        }

        if (days.Count > 0)
        {
            runs.Add(new StreakRun(days[^1], length));
        }

        return runs;
    }
}
