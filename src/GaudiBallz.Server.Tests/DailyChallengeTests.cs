using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// The daily board is derived from the date alone and must be identical every time. These
/// tests exercise the derivation rather than the level generator, which has its own suite.
/// </summary>
public sealed class DailyChallengeTests
{
    [Fact]
    public void Same_date_produces_the_same_board()
    {
        var date = new DateOnly(2026, 9, 15);

        var first = DailyChallenge.BoardForDate(date);
        var second = DailyChallenge.BoardForDate(date);

        Assert.Equal(first.Board, second.Board);
    }

    [Fact]
    public void Different_dates_produce_different_boards()
    {
        var monday = DailyChallenge.BoardForDate(new DateOnly(2026, 9, 14));
        var tuesday = DailyChallenge.BoardForDate(new DateOnly(2026, 9, 15));

        Assert.NotEqual(monday.Board, tuesday.Board);
    }

    [Fact]
    public void Board_has_expected_parameters()
    {
        var level = DailyChallenge.BoardForDate(new DateOnly(2026, 9, 15));

        Assert.Equal(6, level.Board.ColourCount);
        Assert.Equal(4, level.Board.Capacity);
        Assert.Equal(8, level.Board.TubeCount); // 6 colour + 2 spare
    }

    [Fact]
    public void Board_is_solvable()
    {
        var rules = RuleSets.Current;
        var level = DailyChallenge.BoardForDate(new DateOnly(2026, 9, 15));
        var board = level.Board;

        foreach (var move in level.ConstructiveSolution)
        {
            Assert.True(rules.TryApply(board, move, out board, out _));
        }

        Assert.True(rules.IsSolved(board));
    }

    [Fact]
    public void Time_target_is_par_times_three_seconds()
    {
        var level = DailyChallenge.BoardForDate(new DateOnly(2026, 9, 15));
        var expected = level.ConstructiveSolution.Count * 3 * 1000;

        Assert.Equal(expected, DailyChallenge.TimeTargetMs(level));
    }
}
