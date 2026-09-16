using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests;

[Collection(SharedMongo.Name)]
public sealed class LevelLeaderboardTests
{
    private readonly PuzzleStore _store;

    public LevelLeaderboardTests(MongoFixture mongo)
    {
        _store = mongo.Store;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Upsert_creates_an_entry_for_a_new_player()
    {
        var playerId = Guid.NewGuid().ToString("N");
        var level = Random.Shared.Next(10_000, 20_000);

        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Alice", null, 3, 10, 5000, null, Token);

        var entries = await _store.GetLevelLeaderboardAsync(level, null, token: Token);
        var entry = Assert.Single(entries, e => e.PlayerId == playerId);
        Assert.Equal(3, entry.BestStars);
        Assert.Equal(10, entry.BestMoves);
        Assert.Equal(5000, entry.BestTimeMs);
    }

    [Fact]
    public async Task A_better_result_updates_the_entry()
    {
        var playerId = Guid.NewGuid().ToString("N");
        var level = Random.Shared.Next(20_000, 30_000);

        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Bob", null, 2, 15, 8000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Bob", null, 3, 12, 6000, null, Token);

        var entries = await _store.GetLevelLeaderboardAsync(level, null, token: Token);
        var entry = Assert.Single(entries, e => e.PlayerId == playerId);
        Assert.Equal(3, entry.BestStars);
        Assert.Equal(12, entry.BestMoves);
    }

    [Fact]
    public async Task A_worse_result_does_not_overwrite()
    {
        var playerId = Guid.NewGuid().ToString("N");
        var level = Random.Shared.Next(30_000, 40_000);

        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Carol", null, 3, 10, 5000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Carol", null, 2, 8, 4000, null, Token);

        var entries = await _store.GetLevelLeaderboardAsync(level, null, token: Token);
        var entry = Assert.Single(entries, e => e.PlayerId == playerId);
        Assert.Equal(3, entry.BestStars);
        Assert.Equal(10, entry.BestMoves);
    }

    [Fact]
    public async Task All_three_periods_are_written()
    {
        var playerId = Guid.NewGuid().ToString("N");
        var level = Random.Shared.Next(40_000, 50_000);

        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Dave", null, 2, 12, 7000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Dave", "2026-W38", 2, 12, 7000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, playerId, "Dave", "2026-09-16", 2, 12, 7000, null, Token);

        var allTime = await _store.GetLevelLeaderboardAsync(level, null, token: Token);
        var weekly = await _store.GetLevelLeaderboardAsync(level, "2026-W38", token: Token);
        var daily = await _store.GetLevelLeaderboardAsync(level, "2026-09-16", token: Token);

        Assert.Single(allTime, e => e.PlayerId == playerId);
        Assert.Single(weekly, e => e.PlayerId == playerId);
        Assert.Single(daily, e => e.PlayerId == playerId);
    }

    [Fact]
    public async Task Leaderboard_is_sorted_by_stars_desc_moves_asc_time_asc()
    {
        var level = Random.Shared.Next(50_000, 60_000);
        var p1 = Guid.NewGuid().ToString("N");
        var p2 = Guid.NewGuid().ToString("N");
        var p3 = Guid.NewGuid().ToString("N");

        await _store.UpsertLevelLeaderboardAsync(level, p1, "Low", null, 1, 8, 3000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, p2, "High", null, 3, 10, 5000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, p3, "Mid", null, 3, 10, 4000, null, Token);

        var entries = await _store.GetLevelLeaderboardAsync(level, null, token: Token);

        Assert.Equal("Mid", entries[0].Username);
        Assert.Equal("High", entries[1].Username);
        Assert.Equal("Low", entries[2].Username);
    }

    [Fact]
    public async Task Player_rank_returns_correct_position()
    {
        var level = Random.Shared.Next(60_000, 70_000);
        var p1 = Guid.NewGuid().ToString("N");
        var p2 = Guid.NewGuid().ToString("N");
        var p3 = Guid.NewGuid().ToString("N");

        await _store.UpsertLevelLeaderboardAsync(level, p1, "First", null, 3, 8, 3000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, p2, "Second", null, 3, 10, 5000, null, Token);
        await _store.UpsertLevelLeaderboardAsync(level, p3, "Third", null, 2, 6, 2000, null, Token);

        var (rank, entry) = await _store.GetLevelPlayerRankAsync(level, p2, null, Token);

        Assert.NotNull(entry);
        Assert.Equal(2, rank);
        Assert.Equal("Second", entry.Username);
    }

    [Fact]
    public async Task Player_rank_returns_null_for_missing_player()
    {
        var level = Random.Shared.Next(70_000, 80_000);
        var missing = Guid.NewGuid().ToString("N");

        var (rank, entry) = await _store.GetLevelPlayerRankAsync(level, missing, null, Token);

        Assert.Equal(0, rank);
        Assert.Null(entry);
    }

    [Fact]
    public async Task GetAllTimeXpAsync_returns_xp_for_batch()
    {
        var p1 = Guid.NewGuid().ToString("N");
        var p2 = Guid.NewGuid().ToString("N");
        var missing = Guid.NewGuid().ToString("N");

        await _store.UpsertLeaderboardAsync(p1, "Alpha", 5000, 10, 8, token: Token);
        await _store.UpsertLeaderboardAsync(p2, "Beta", 12000, 20, 15, token: Token);

        var result = await _store.GetAllTimeXpAsync([p1, p2, missing], Token);

        Assert.Equal(5000, result[p1]);
        Assert.Equal(12000, result[p2]);
        Assert.False(result.ContainsKey(missing));
    }
}
