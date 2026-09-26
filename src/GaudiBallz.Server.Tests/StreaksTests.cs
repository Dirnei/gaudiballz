using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

public sealed class StreaksTests
{
    private static readonly DateOnly Today = new(2026, 9, 26);

    private static DateOnly[] Run(DateOnly lastDay, int count) =>
        Enumerable.Range(0, count).Select(i => lastDay.AddDays(-i)).ToArray();

    private static StreakState Compute(
        IEnumerable<DateOnly> played, IEnumerable<DateOnly>? frozen = null, int held = 0) =>
        Streaks.Compute(played, frozen ?? [], held, Today);

    // ---- existing behaviour ----

    [Fact]
    public void No_play_is_no_streak()
    {
        var state = Compute([]);
        Assert.Equal(0, state.Current);
        Assert.Equal(0, state.Best);
    }

    [Fact]
    public void Played_today_and_before_counts_every_day()
    {
        Assert.Equal(5, Compute(Run(Today, 5)).Current);
    }

    [Fact]
    public void Streak_ending_yesterday_is_still_alive()
    {
        var state = Compute(Run(Today.AddDays(-1), 4));
        Assert.Equal(4, state.Current);
        Assert.Equal(0, state.CoveredNow);
    }

    [Fact]
    public void Missed_day_without_freezes_breaks_the_streak()
    {
        var state = Compute(Run(Today.AddDays(-2), 4));
        Assert.Equal(0, state.Current);
        Assert.Equal(4, state.Best);
    }

    [Fact]
    public void Broken_streak_restarts_at_one()
    {
        // Mon, Tue, skip Wed, Thu
        var played = new[] { Today.AddDays(-3), Today.AddDays(-2), Today };
        Assert.Equal(1, Compute(played).Current);
    }

    [Fact]
    public void Several_completions_on_one_day_count_once()
    {
        Assert.Equal(1, Compute([Today, Today, Today]).Current);
    }

    // ---- freezes cover missed days ----

    [Fact]
    public void One_missed_day_is_covered_before_playing_again()
    {
        var state = Compute(Run(Today.AddDays(-2), 10), held: 2);
        Assert.Equal(10, state.Current);
        Assert.Equal(1, state.CoveredNow);
        Assert.Equal(1, state.HeldShown);
    }

    [Fact]
    public void Two_missed_days_are_covered_by_two_freezes()
    {
        var state = Compute(Run(Today.AddDays(-3), 10), held: 2);
        Assert.Equal(10, state.Current);
        Assert.Equal(2, state.CoveredNow);
        Assert.Equal(0, state.HeldShown);
    }

    [Fact]
    public void Gap_longer_than_freezes_breaks_and_keeps_them()
    {
        var state = Compute(Run(Today.AddDays(-3), 10), held: 1);
        Assert.Equal(0, state.Current);
        Assert.Equal(0, state.CoveredNow);
        Assert.Equal(1, state.HeldShown);
    }

    [Fact]
    public void Today_is_not_missed_yet()
    {
        var state = Compute(Run(Today.AddDays(-1), 3), held: 2);
        Assert.Equal(0, state.CoveredNow);
        Assert.Equal(2, state.HeldShown);
    }

    // ---- frozen days keep the streak but don't extend it ----

    [Fact]
    public void Frozen_day_bridges_without_adding()
    {
        // 10 played, 1 frozen, then played today
        var played = Run(Today.AddDays(-2), 10).Append(Today);
        var state = Compute(played, frozen: [Today.AddDays(-1)]);
        Assert.Equal(11, state.Current);
    }

    [Fact]
    public void Frozen_day_alone_does_not_add_before_playing()
    {
        // 5 played, then yesterday frozen, today not played yet
        var state = Compute(Run(Today.AddDays(-2), 5), frozen: [Today.AddDays(-1)]);
        Assert.Equal(5, state.Current);
        Assert.Equal(0, state.CoveredNow);
    }

    [Fact]
    public void Best_streak_spans_a_frozen_day()
    {
        // 8 played, 1 frozen, 4 played, then two missed days broke it
        var secondRunEnd = Today.AddDays(-3);
        var played = Run(secondRunEnd, 4).Concat(Run(secondRunEnd.AddDays(-5), 8));
        var state = Compute(played, frozen: [secondRunEnd.AddDays(-4)]);
        Assert.Equal(0, state.Current);
        Assert.Equal(12, state.Best);
    }

    [Fact]
    public void Latest_run_ignores_the_clock()
    {
        var played = Run(new DateOnly(2026, 9, 10), 3);
        Assert.Equal(3, Streaks.LatestRun(played, []));
    }
}
