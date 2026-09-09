using FsCheck.Xunit;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Properties rather than examples, because this is the first part of the project where a
/// bug loses a player's work instead of showing a wrong number. A merge that quietly drops
/// a level would be invisible until someone noticed their progress had gone backwards.
/// </summary>
public sealed class PlayerProgressTests
{
    /// <summary>Same levels, same results — order and identity are irrelevant.</summary>
    private static bool Same(PlayerProgress a, PlayerProgress b) =>
        a.Levels.Count == b.Levels.Count
        && a.Levels.All(pair =>
            b.Levels.TryGetValue(pair.Key, out var other) && other == pair.Value);

    private static PlayerProgress Build(int[] levels, int[] moves, int[] hints)
    {
        var progress = PlayerProgress.Empty;
        for (var i = 0; i < levels.Length; i++)
        {
            var level = 1 + Math.Abs(levels[i] % 200);
            var move = 1 + Math.Abs((i < moves.Length ? moves[i] : i) % 300);
            var hint = Math.Abs((i < hints.Length ? hints[i] : 0) % 20);
            progress = progress.With(level, new LevelResult(move, hint));
        }

        return progress;
    }

    [Property(MaxTest = 300)]
    public bool Merging_is_commutative(int[] la, int[] ma, int[] ha, int[] lb, int[] mb, int[] hb)
    {
        var a = Build(la, ma, ha);
        var b = Build(lb, mb, hb);

        return Same(a.MergedWith(b), b.MergedWith(a));
    }

    [Property(MaxTest = 300)]
    public bool Merging_is_idempotent(int[] la, int[] ma, int[] ha, int[] lb, int[] mb, int[] hb)
    {
        var a = Build(la, ma, ha);
        var b = Build(lb, mb, hb);

        var once = a.MergedWith(b);
        return Same(once.MergedWith(b), once);
    }

    [Property(MaxTest = 300)]
    public bool Merging_never_loses_a_level(int[] la, int[] ma, int[] ha, int[] lb, int[] mb, int[] hb)
    {
        var a = Build(la, ma, ha);
        var b = Build(lb, mb, hb);
        var merged = a.MergedWith(b);

        return a.Levels.Keys.All(merged.Levels.ContainsKey)
               && b.Levels.Keys.All(merged.Levels.ContainsKey);
    }

    [Property(MaxTest = 300)]
    public bool Merging_never_worsens_a_result(int[] la, int[] ma, int[] ha, int[] lb, int[] mb, int[] hb)
    {
        var a = Build(la, ma, ha);
        var b = Build(lb, mb, hb);
        var merged = a.MergedWith(b);

        foreach (var (level, mine) in a.Levels)
        {
            var after = merged.Levels[level];
            if (after.Moves > mine.Moves || after.Hints > mine.Hints
                || after.Stars < mine.Stars || after.Points < mine.Points)
            {
                return false;
            }
        }

        return true;
    }

    [Property(MaxTest = 200)]
    public bool Recording_the_same_attempt_twice_changes_nothing(int level, int moves, int hints)
    {
        var id = 1 + Math.Abs(level % 200);
        var result = new LevelResult(1 + Math.Abs(moves % 300), Math.Abs(hints % 20));

        var once = PlayerProgress.Empty.With(id, result);
        return Same(once.With(id, result), once);
    }

    [Fact]
    public void A_better_attempt_replaces_the_record()
    {
        var progress = PlayerProgress.Empty
            .With(7, new LevelResult(40, 3))
            .With(7, new LevelResult(31, 1));

        Assert.Equal(new LevelResult(31, 1), progress.Levels[7]);
    }

    [Fact]
    public void A_worse_attempt_does_not()
    {
        var progress = PlayerProgress.Empty
            .With(7, new LevelResult(31, 1))
            .With(7, new LevelResult(48, 5));

        Assert.Equal(new LevelResult(31, 1), progress.Levels[7]);
    }

    /// <summary>
    /// The two measures are kept independently. A run that used fewer moves and a run that
    /// used fewer hints are both worth something, and choosing one attempt whole would
    /// discard what the player earned in the other.
    /// </summary>
    [Fact]
    public void Fewest_moves_and_fewest_hints_are_kept_separately()
    {
        var progress = PlayerProgress.Empty
            .With(7, new LevelResult(31, 6))
            .With(7, new LevelResult(45, 0));

        Assert.Equal(new LevelResult(31, 0), progress.Levels[7]);
    }

    [Fact]
    public void Best_keeps_max_stars_and_max_points()
    {
        var progress = PlayerProgress.Empty
            .With(7, new LevelResult(31, 6, Stars: 2, Points: 250))
            .With(7, new LevelResult(45, 0, Stars: 3, Points: 500));

        var result = progress.Levels[7];
        Assert.Equal(31, result.Moves);
        Assert.Equal(0, result.Hints);
        Assert.Equal(3, result.Stars);
        Assert.Equal(500, result.Points);
    }

    [Fact]
    public void Worse_stars_do_not_replace()
    {
        var progress = PlayerProgress.Empty
            .With(7, new LevelResult(12, 0, Stars: 3, Points: 500))
            .With(7, new LevelResult(10, 1, Stars: 1, Points: 100));

        var result = progress.Levels[7];
        Assert.Equal(10, result.Moves);
        Assert.Equal(0, result.Hints);
        Assert.Equal(3, result.Stars);
        Assert.Equal(500, result.Points);
    }

    [Fact]
    public void Total_points_sums_best_per_level()
    {
        var progress = PlayerProgress.Empty
            .With(1, new LevelResult(10, 0, Stars: 3, Points: 500))
            .With(2, new LevelResult(15, 0, Stars: 2, Points: 250))
            .With(3, new LevelResult(20, 1, Stars: 1, Points: 100));

        Assert.Equal(850, progress.TotalPoints);
    }

    [Fact]
    public void Total_points_is_zero_for_empty_progress()
    {
        Assert.Equal(0, PlayerProgress.Empty.TotalPoints);
    }

    [Fact]
    public void Default_stars_are_zero()
    {
        var result = new LevelResult(10, 0);
        Assert.Equal(0, result.Stars);
        Assert.Equal(0, result.Points);
    }

    [Fact]
    public void Merging_two_devices_keeps_both_sides()
    {
        var phone = PlayerProgress.Empty
            .With(1, new LevelResult(12, 0))
            .With(2, new LevelResult(20, 1));

        var desktop = PlayerProgress.Empty
            .With(2, new LevelResult(18, 4))
            .With(3, new LevelResult(30, 0));

        var merged = phone.MergedWith(desktop);

        Assert.Equal(3, merged.LevelsCompleted);
        Assert.Equal(new LevelResult(12, 0), merged.Levels[1]);
        Assert.Equal(new LevelResult(18, 1), merged.Levels[2]);
        Assert.Equal(new LevelResult(30, 0), merged.Levels[3]);
    }
}
