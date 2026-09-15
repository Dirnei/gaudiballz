using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

[Collection(SharedMongo.Name)]
public sealed class CompletionBonusTests
{
    private readonly PuzzleStore _store;

    public CompletionBonusTests(MongoFixture mongo) => _store = mongo.Store;

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static string UniquePlayer() => Guid.NewGuid().ToString("N");

    private async Task SeedCompletion(string playerId, int level, int hints = 0)
    {
        await _store.RecordCompletionAsync(
            playerId, level, new LevelResult(10, hints, 3, 500), Token);
    }

    // ---- no-hint bonus ----

    [Fact]
    public async Task No_hint_bonus_awarded_when_hints_is_zero()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, false, hints: 0, Token);

        Assert.Equal(50, bonus.NoHintBonus);
    }

    [Fact]
    public async Task No_hint_bonus_denied_when_hints_used()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1, hints: 2);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, false, hints: 2, Token);

        Assert.Equal(0, bonus.NoHintBonus);
    }

    // ---- first-clear bonus ----

    [Fact]
    public async Task First_clear_bonus_awarded_on_first_completion()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: false, hints: 0, Token);

        Assert.Equal(75, bonus.FirstClearBonus);
    }

    [Fact]
    public async Task First_clear_bonus_denied_on_replay()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: true, hints: 0, Token);

        Assert.Equal(0, bonus.FirstClearBonus);
    }

    // ---- streak-day bonus ----

    [Fact]
    public async Task Streak_bonus_awarded_on_first_completion_of_day()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, false, hints: 0, Token);

        Assert.Equal(25, bonus.StreakBonus);
    }

    [Fact]
    public async Task Streak_bonus_denied_on_second_completion_same_day()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);
        await SeedCompletion(id, 2);

        // First completion today: awards streak bonus
        await _store.RecordCompletionBonusAsync(id, 1, null, false, hints: 0, Token);
        // Record daily play to simulate the achievement flow
        await _store.RecordDailyPlayAsync(id, DateTime.UtcNow, Token);

        // Second completion today: no streak bonus
        var bonus = await _store.RecordCompletionBonusAsync(id, 2, null, false, hints: 0, Token);

        Assert.Equal(0, bonus.StreakBonus);
    }

    // ---- replay-per-day cap ----

    [Fact]
    public async Task Replay_bonus_awarded_on_first_replay_of_day()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: true, hints: 0, Token);

        Assert.Equal(10, bonus.ReplayBonus);
    }

    [Fact]
    public async Task Replay_bonus_denied_on_second_replay_same_level_same_day()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);

        // First replay today: gets bonus
        await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: true, hints: 0, Token);

        // Second replay same level same day: no bonus
        var bonus = await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: true, hints: 0, Token);

        Assert.Equal(0, bonus.ReplayBonus);
    }

    [Fact]
    public async Task Replay_bonus_for_different_levels_same_day_both_awarded()
    {
        var id = UniquePlayer();
        await SeedCompletion(id, 1);
        await SeedCompletion(id, 2);

        var bonus1 = await _store.RecordCompletionBonusAsync(id, 1, null, isReplay: true, hints: 0, Token);
        var bonus2 = await _store.RecordCompletionBonusAsync(id, 2, null, isReplay: true, hints: 0, Token);

        Assert.Equal(10, bonus1.ReplayBonus);
        Assert.Equal(10, bonus2.ReplayBonus);
    }
}
