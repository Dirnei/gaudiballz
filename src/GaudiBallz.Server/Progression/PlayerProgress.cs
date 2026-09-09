using System.Collections.Immutable;

namespace GaudiBallz.Server.Progression;

/// <summary>How a level went. Moves/Hints: lower is better. Stars/Points: higher is better.</summary>
public readonly record struct LevelResult(
    int Moves, int Hints, int Stars = 0, int Points = 0,
    int BestTimeMs = 0, int BonusPoints = 0)
{
    public LevelResult Best(LevelResult other) =>
        new(Math.Min(Moves, other.Moves),
            Math.Min(Hints, other.Hints),
            Math.Max(Stars, other.Stars),
            Math.Max(Points, other.Points),
            BestTimeMs == 0 ? other.BestTimeMs
                : other.BestTimeMs == 0 ? BestTimeMs
                : Math.Min(BestTimeMs, other.BestTimeMs),
            Math.Max(BonusPoints, other.BonusPoints));
}

/// <summary>
/// What a player has completed.
///
/// Deliberately a map from level to best result and nothing else: no timestamps, no
/// ordering, no "current level" that two devices could disagree about. That shape is what
/// makes merging a per-key fold with no conflict policy to get wrong.
/// </summary>
public sealed record PlayerProgress(ImmutableDictionary<int, LevelResult> Levels)
{
    public static PlayerProgress Empty { get; } =
        new(ImmutableDictionary<int, LevelResult>.Empty);

    public int LevelsCompleted => Levels.Count;

    /// <summary>The furthest level reached, or 0 when nothing is completed.</summary>
    public int HighestCompleted => Levels.Count == 0 ? 0 : Levels.Keys.Max();

    public int TotalPoints => Levels.Values.Sum(r => r.Points + r.BonusPoints);

    /// <summary>
    /// Records a completion, keeping the better result when the level was already done.
    ///
    /// Idempotent by construction: recording the same attempt twice gives the same map, so
    /// a retried submission cannot inflate anything.
    /// </summary>
    public PlayerProgress With(int level, LevelResult result) =>
        new(Levels.SetItem(
            level,
            Levels.TryGetValue(level, out var existing) ? existing.Best(result) : result));

    /// <summary>
    /// Combines two sets of progress, keeping the better result for every level either side
    /// has.
    ///
    /// Commutative and idempotent, which is what lets a merge be retried, duplicated, or run
    /// from either direction without losing work. Two devices signing in cannot cost a
    /// player something they have already done.
    /// </summary>
    public PlayerProgress MergedWith(PlayerProgress other)
    {
        var merged = Levels.ToBuilder();

        foreach (var (level, result) in other.Levels)
        {
            merged[level] = merged.TryGetValue(level, out var mine) ? mine.Best(result) : result;
        }

        return new PlayerProgress(merged.ToImmutable());
    }
}
