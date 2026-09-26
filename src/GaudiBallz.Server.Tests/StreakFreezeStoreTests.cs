using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Settlement against a real MongoDB, because the once-per-day gate and the version check
/// live in the update filters.
/// </summary>
[Collection(SharedMongo.Name)]
public sealed class StreakFreezeStoreTests(MongoFixture mongo)
{
    private readonly PuzzleStore _store = mongo.Store;

    private static readonly DateOnly Start = new(2026, 8, 3);

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static string NewPlayer() => Guid.NewGuid().ToString("N");

    private static DateTime At(DateOnly day) => day.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);

    /// <summary>A completion on <paramref name="day"/>, as the completion endpoints record it.</summary>
    private async Task Complete(string player, DateOnly day)
    {
        await _store.RecordDailyPlayAsync(player, At(day), Token);
        await _store.SettleStreakAsync(player, At(day), Token);
    }

    /// <summary>Completes one level a day for <paramref name="days"/> days and returns the day after.</summary>
    private async Task<DateOnly> PlayDays(string player, DateOnly from, int days)
    {
        for (var i = 0; i < days; i++)
        {
            await Complete(player, from.AddDays(i));
        }

        return from.AddDays(days);
    }

    private async Task<int> Held(string player) =>
        (await _store.LoadStreakFreezeAsync(player, Token))?.Held ?? 0;

    private async Task<StreakState> StreakOn(string player, DateOnly day)
    {
        var played = await _store.LoadDailyPlayAsync(player, Token);
        var freeze = await _store.LoadStreakFreezeAsync(player, Token);
        return Streaks.Compute(
            played.Select(d => DateOnly.FromDateTime(d.Date)),
            freeze?.FrozenDays.Select(DateOnly.FromDateTime) ?? [],
            freeze?.Held ?? 0,
            day);
    }

    [Fact]
    public async Task Seventh_played_day_earns_a_freeze()
    {
        var player = NewPlayer();

        var day7 = await PlayDays(player, Start, 6);
        Assert.Equal(0, await Held(player));

        await Complete(player, day7);
        Assert.Equal(1, await Held(player));
    }

    [Fact]
    public async Task Fourteenth_day_earns_a_second_and_the_twenty_first_is_lost_at_the_cap()
    {
        var player = NewPlayer();

        await PlayDays(player, Start, 14);
        Assert.Equal(2, await Held(player));

        await PlayDays(player, Start.AddDays(14), 7);
        Assert.Equal(2, await Held(player));
    }

    [Fact]
    public async Task Several_completions_on_the_seventh_day_earn_one_freeze()
    {
        var player = NewPlayer();
        var day7 = await PlayDays(player, Start, 6);

        for (var i = 0; i < 4; i++)
        {
            await Complete(player, day7);
        }

        Assert.Equal(1, await Held(player));
    }

    [Fact]
    public async Task One_missed_day_is_covered_and_spent_on_the_next_completion()
    {
        var player = NewPlayer();
        var missed = await PlayDays(player, Start, 10);

        await Complete(player, missed.AddDays(1));

        Assert.Equal(0, await Held(player));
        var freeze = await _store.LoadStreakFreezeAsync(player, Token);
        Assert.Equal([missed], freeze!.FrozenDays.Select(DateOnly.FromDateTime));
        Assert.Equal(11, (await StreakOn(player, missed.AddDays(1))).Current);
    }

    [Fact]
    public async Task Two_missed_days_are_covered_by_two_freezes()
    {
        var player = NewPlayer();
        var missed = await PlayDays(player, Start, 14);

        await Complete(player, missed.AddDays(2));

        Assert.Equal(0, await Held(player));
        Assert.Equal(15, (await StreakOn(player, missed.AddDays(2))).Current);
    }

    [Fact]
    public async Task Gap_longer_than_freezes_held_breaks_the_streak_and_keeps_them()
    {
        var player = NewPlayer();
        var missed = await PlayDays(player, Start, 10);

        await Complete(player, missed.AddDays(2));

        Assert.Equal(1, await Held(player));
        Assert.Empty((await _store.LoadStreakFreezeAsync(player, Token))!.FrozenDays);
        Assert.Equal(1, (await StreakOn(player, missed.AddDays(2))).Current);
    }

    [Fact]
    public async Task Frozen_day_does_not_count_toward_the_next_freeze()
    {
        var player = NewPlayer();
        var afterFirstRun = await PlayDays(player, Start, 7);           // earns 1
        var missed = await PlayDays(player, afterFirstRun.AddDays(2), 6); // gap of 2 breaks, keeps 1

        await Complete(player, missed.AddDays(1));                        // covered, streak 7

        Assert.Equal(7, (await StreakOn(player, missed.AddDays(1))).Current);
        Assert.Equal(1, await Held(player)); // spent 1, earned 1
    }

    [Fact]
    public async Task Parallel_completions_on_the_seventh_day_earn_exactly_one_freeze()
    {
        var player = NewPlayer();
        var day7 = await PlayDays(player, Start, 6);

        await _store.RecordDailyPlayAsync(player, At(day7), Token);
        await Task.WhenAll(Enumerable.Range(0, 8)
            .Select(_ => _store.SettleStreakAsync(player, At(day7), Token)));

        Assert.Equal(1, await Held(player));
    }
}
