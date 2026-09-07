using System.Collections.Immutable;

namespace Puzzle.Server.Progression;

/// <summary>How a level went. Lower is better on both counts.</summary>
public readonly record struct LevelResult(int Moves, int Hints)
{
    /// <summary>
    /// The better of two attempts, taken per measure rather than picking one attempt whole.
    ///
    /// A run that used fewer moves and a run that used fewer hints are both worth keeping,
    /// and choosing between them would throw away something the player earned.
    /// </summary>
    public LevelResult Best(LevelResult other) =>
        new(Math.Min(Moves, other.Moves), Math.Min(Hints, other.Hints));
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
