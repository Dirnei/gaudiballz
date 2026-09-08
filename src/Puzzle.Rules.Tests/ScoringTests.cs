using Puzzle.Rules;

namespace Puzzle.Rules.Tests;

public sealed class ScoringTests
{
    [Fact]
    public void Under_par_and_fast_earns_3_stars()
    {
        var (stars, points) = Scoring.Calculate(moves: 10, hints: 0, elapsedTimeMs: 25_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(3, stars);
        Assert.Equal(500, points);
    }

    [Fact]
    public void Under_par_but_slow_earns_2_stars()
    {
        var (stars, points) = Scoring.Calculate(moves: 10, hints: 0, elapsedTimeMs: 45_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(2, stars);
        Assert.Equal(250, points);
    }

    [Fact]
    public void Exactly_at_par_and_time_target_earns_3_stars()
    {
        var (stars, points) = Scoring.Calculate(moves: 12, hints: 0, elapsedTimeMs: 30_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(3, stars);
        Assert.Equal(500, points);
    }

    [Fact]
    public void Over_par_earns_1_star()
    {
        var (stars, points) = Scoring.Calculate(moves: 15, hints: 0, elapsedTimeMs: 10_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(1, stars);
        Assert.Equal(100, points);
    }

    [Fact]
    public void Hints_cap_at_1_star_regardless_of_moves_and_time()
    {
        var (stars, points) = Scoring.Calculate(moves: 8, hints: 1, elapsedTimeMs: 10_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(1, stars);
        Assert.Equal(100, points);
    }

    [Fact]
    public void Multiple_hints_still_cap_at_1_star()
    {
        var (stars, points) = Scoring.Calculate(moves: 8, hints: 3, elapsedTimeMs: 10_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(1, stars);
        Assert.Equal(100, points);
    }

    [Fact]
    public void Zero_hints_allows_full_rating()
    {
        var (stars, _) = Scoring.Calculate(moves: 10, hints: 0, elapsedTimeMs: 20_000, par: 12, timeTargetMs: 30_000);
        Assert.Equal(3, stars);
    }

    [Fact]
    public void Null_elapsed_time_caps_at_2_stars()
    {
        var (stars, points) = Scoring.Calculate(moves: 10, hints: 0, elapsedTimeMs: null, par: 12, timeTargetMs: 30_000);
        Assert.Equal(2, stars);
        Assert.Equal(250, points);
    }

    [Fact]
    public void Null_elapsed_time_with_over_par_earns_1_star()
    {
        var (stars, points) = Scoring.Calculate(moves: 15, hints: 0, elapsedTimeMs: null, par: 12, timeTargetMs: 30_000);
        Assert.Equal(1, stars);
        Assert.Equal(100, points);
    }

    [Fact]
    public void Null_elapsed_time_with_hints_earns_1_star()
    {
        var (stars, points) = Scoring.Calculate(moves: 10, hints: 1, elapsedTimeMs: null, par: 12, timeTargetMs: 30_000);
        Assert.Equal(1, stars);
        Assert.Equal(100, points);
    }
}
