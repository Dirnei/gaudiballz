using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests;

[Collection(SharedMongo.Name)]
public sealed class HubStoreTests
{
    private readonly PuzzleStore _store;

    public HubStoreTests(MongoFixture mongo) => _store = mongo.Store;

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    // ---- leaderboard --------------------------------------------------------

    [Fact]
    public async Task Leaderboard_upsert_creates_and_updates_entry()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.UpsertLeaderboardAsync(id, "Alice", 500, 3, 2, Token);

        var entries = await _store.QueryLeaderboardAsync(null, 0, 100, Token);
        var alice = entries.Find(e => e.PlayerId == id);
        Assert.NotNull(alice);
        Assert.Equal(500, alice.TotalPoints);
        Assert.Equal("Alice", alice.Username);

        await _store.UpsertLeaderboardAsync(id, "Alice", 1000, 5, 4, Token);
        entries = await _store.QueryLeaderboardAsync(null, 0, 100, Token);
        alice = entries.Find(e => e.PlayerId == id);
        Assert.NotNull(alice);
        Assert.Equal(1000, alice.TotalPoints);
    }

    [Fact]
    public async Task Leaderboard_is_sorted_descending_by_points()
    {
        var id1 = Guid.NewGuid().ToString("N");
        var id2 = Guid.NewGuid().ToString("N");
        await _store.UpsertLeaderboardAsync(id1, "Low", 100, 1, 1, Token);
        await _store.UpsertLeaderboardAsync(id2, "High", 9999, 10, 8, Token);

        var entries = await _store.QueryLeaderboardAsync(null, 0, 100, Token);
        var lowIdx = entries.FindIndex(e => e.PlayerId == id1);
        var highIdx = entries.FindIndex(e => e.PlayerId == id2);
        Assert.True(highIdx < lowIdx);
    }

    [Fact]
    public async Task Player_rank_is_computed_correctly()
    {
        var id1 = Guid.NewGuid().ToString("N");
        var id2 = Guid.NewGuid().ToString("N");
        await _store.UpsertLeaderboardAsync(id1, "Top", 50000, 100, 90, Token);
        await _store.UpsertLeaderboardAsync(id2, "Second", 40000, 80, 60, Token);

        var (rank1, _) = await _store.GetPlayerRankAsync(id1, null, Token);
        var (rank2, _) = await _store.GetPlayerRankAsync(id2, null, Token);
        Assert.True(rank1 < rank2);
    }

    [Fact]
    public async Task Period_leaderboard_is_separate_from_all_time()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.UpsertLeaderboardAsync(id, "Player", 1000, 5, 3, Token);
        await _store.UpsertPeriodLeaderboardAsync(id, "Player", "2026-W37", 200, Token);

        var allTime = await _store.QueryLeaderboardAsync(null, 0, 100, Token);
        var weekly = await _store.QueryLeaderboardAsync("2026-W37", 0, 100, Token);

        var allEntry = allTime.Find(e => e.PlayerId == id);
        var weekEntry = weekly.Find(e => e.PlayerId == id);

        Assert.NotNull(allEntry);
        Assert.Equal(1000, allEntry.TotalPoints);
        Assert.NotNull(weekEntry);
        Assert.Equal(200, weekEntry.TotalPoints);
    }

    // ---- activity feed ------------------------------------------------------

    [Fact]
    public async Task Activity_feed_records_and_retrieves_events()
    {
        await _store.EnsureActivityFeedCollectionAsync(Token);

        var id = Guid.NewGuid().ToString("N");
        await _store.RecordActivityAsync(id, "TestUser", "level_clear", "cleared Level 5", Token);
        await _store.RecordActivityAsync(id, "TestUser", "achievement", "earned First Steps", Token);

        var events = await _store.GetRecentActivityAsync(10, Token);
        Assert.True(events.Count >= 2);
        Assert.Contains(events, e => e.Detail == "cleared Level 5");
        Assert.Contains(events, e => e.Detail == "earned First Steps");
    }

    [Fact]
    public async Task Activity_feed_does_not_include_aggregate_stats()
    {
        await _store.EnsureActivityFeedCollectionAsync(Token);

        var id = Guid.NewGuid().ToString("N");
        await _store.RecordActivityAsync(id, "PrivacyTest", "level_clear", "cleared Level 10", Token);

        var events = await _store.GetRecentActivityAsync(100, Token);
        var entry = events.Find(e => e.Username == "PrivacyTest");

        Assert.NotNull(entry);
        Assert.DoesNotContain("totalPoints", entry.Detail);
        Assert.DoesNotContain("winRate", entry.Detail);
    }

    // ---- structured activity feed -------------------------------------------

    [Fact]
    public async Task Structured_activity_stores_kind_and_params()
    {
        await _store.EnsureActivityFeedCollectionAsync(Token);

        var id = Guid.NewGuid().ToString("N");
        await _store.RecordStructuredActivityAsync(
            id, "StructTest", "level_clear", "cleared Level 7 in 15 moves",
            "level-cleared",
            new Dictionary<string, object> { ["level"] = 7, ["moves"] = 15 },
            Token);

        var events = await _store.GetRecentActivityAsync(50, Token);
        var entry = events.Find(e => e.Username == "StructTest" && e.PlayerId == id);

        Assert.NotNull(entry);
        Assert.Equal("level-cleared", entry.Kind);
        Assert.NotNull(entry.Params);
        Assert.Equal(7, Convert.ToInt32(entry.Params["level"], System.Globalization.CultureInfo.InvariantCulture));
        Assert.Equal(15, Convert.ToInt32(entry.Params["moves"], System.Globalization.CultureInfo.InvariantCulture));
        // Detail is kept as fallback
        Assert.Equal("cleared Level 7 in 15 moves", entry.Detail);
    }

    [Fact]
    public async Task Legacy_activity_has_null_kind_and_params()
    {
        await _store.EnsureActivityFeedCollectionAsync(Token);

        var id = Guid.NewGuid().ToString("N");
        await _store.RecordActivityAsync(id, "LegacyTest", "level_clear", "cleared Level 3", Token);

        var events = await _store.GetRecentActivityAsync(50, Token);
        var entry = events.Find(e => e.Username == "LegacyTest" && e.PlayerId == id);

        Assert.NotNull(entry);
        Assert.Null(entry.Kind);
        Assert.Null(entry.Params);
        Assert.Equal("cleared Level 3", entry.Detail);
    }

    [Fact]
    public async Task Structured_achievement_earned_stores_achievement_id()
    {
        await _store.EnsureActivityFeedCollectionAsync(Token);

        var id = Guid.NewGuid().ToString("N");
        await _store.RecordStructuredActivityAsync(
            id, "AchTest", "achievement", "earned First Steps",
            "achievement-earned",
            new Dictionary<string, object> { ["achievementId"] = "milestone-1", ["achievementName"] = "First Steps" },
            Token);

        var events = await _store.GetRecentActivityAsync(50, Token);
        var entry = events.Find(e => e.Username == "AchTest" && e.PlayerId == id);

        Assert.NotNull(entry);
        Assert.Equal("achievement-earned", entry.Kind);
        Assert.Equal("milestone-1", entry.Params!["achievementId"]?.ToString());
    }

    // ---- community stats ----------------------------------------------------

    [Fact]
    public async Task Solved_today_counts_completions_on_current_date()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.RecordDailyPlayAsync(id, DateTime.UtcNow, Token);

        var count = await _store.CountSolvedTodayAsync(Token);
        Assert.True(count >= 1);
    }

    [Fact]
    public async Task Active_this_week_counts_distinct_players()
    {
        var id1 = Guid.NewGuid().ToString("N");
        var id2 = Guid.NewGuid().ToString("N");
        var today = DateTime.UtcNow;

        await _store.RecordDailyPlayAsync(id1, today, Token);
        await _store.RecordDailyPlayAsync(id1, today, Token);
        await _store.RecordDailyPlayAsync(id2, today, Token);

        var count = await _store.CountActivePlayersThisWeekAsync(Token);
        Assert.True(count >= 2);
    }
}
