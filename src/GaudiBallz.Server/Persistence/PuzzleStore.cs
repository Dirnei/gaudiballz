using MongoDB.Driver;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Persistence;

public sealed class MongoOptions
{
    public string ConnectionString { get; set; } = "mongodb://localhost:27017/?replicaSet=rs0";
    public string Database { get; set; } = "puzzle";
}

/// <summary>
/// Everything that touches MongoDB.
///
/// Every write here is expressed so that repeating it is harmless: upserts with
/// <c>$setOnInsert</c>, and bests with <c>$min</c>. That is deliberate — a retried request,
/// a restarted actor, or two devices submitting at once must not be able to lose work or
/// inflate a count, and pushing that into the update operators means there is no
/// read-modify-write window to lose it in.
/// </summary>
public sealed class PuzzleStore
{
    private readonly IMongoCollection<PlayerDocument> _players;
    private readonly IMongoCollection<CredentialDocument> _credentials;
    private readonly IMongoCollection<ProgressDocument> _progress;
    private readonly IMongoCollection<AchievementDocument> _achievements;
    private readonly IMongoCollection<BadgeDocument> _badges;
    private readonly IMongoCollection<DailyPlayDocument> _dailyPlay;
    private readonly IMongoCollection<GameStartDocument> _gameStarts;
    private readonly IMongoCollection<LeaderboardDocument> _leaderboard;
    private readonly IMongoCollection<DailyResultDocument> _dailyResults;
    private readonly IMongoCollection<LevelLeaderboardDocument> _levelLeaderboard;
    private readonly IMongoDatabase _database;

    public PuzzleStore(MongoOptions options)
    {
        BsonRegistration.Register();

        // Short timeouts on purpose. When the database is unreachable a request must fail
        // in a moment rather than hanging on the driver's thirty-second default: the game
        // stays playable without a database, and the client queues what it could not send.
        // A request that hangs looks like the game is broken; one that fails fast does not.
        var settings = MongoClientSettings.FromConnectionString(options.ConnectionString);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(2);
        settings.ConnectTimeout = TimeSpan.FromSeconds(2);
        settings.SocketTimeout = TimeSpan.FromSeconds(5);

        _database = new MongoClient(settings).GetDatabase(options.Database);

        // Progress is what a player would notice losing, so it is written with majority
        // acknowledgement rather than fire-and-forget.
        var durable = new MongoCollectionSettings
        {
            WriteConcern = WriteConcern.WMajority.With(journal: true),
        };

        _players = _database.GetCollection<PlayerDocument>("players", durable);
        _credentials = _database.GetCollection<CredentialDocument>("credentials", durable);
        _progress = _database.GetCollection<ProgressDocument>("progress", durable);
        _achievements = _database.GetCollection<AchievementDocument>("player_achievements", durable);
        _badges = _database.GetCollection<BadgeDocument>("player_badges", durable);
        _dailyPlay = _database.GetCollection<DailyPlayDocument>("daily_play", durable);
        _gameStarts = _database.GetCollection<GameStartDocument>("game_starts", durable);
        _leaderboard = _database.GetCollection<LeaderboardDocument>("leaderboard", durable);
        _dailyResults = _database.GetCollection<DailyResultDocument>("daily_results", durable);
        _levelLeaderboard = _database.GetCollection<LevelLeaderboardDocument>("level_leaderboard", durable);
    }

    /// <summary>Idempotent: creating an index that already exists is a no-op.</summary>
    public async Task EnsureIndexesAsync(CancellationToken token = default)
    {
        await _credentials.Indexes.CreateOneAsync(
            new CreateIndexModel<CredentialDocument>(
                Builders<CredentialDocument>.IndexKeys.Ascending(c => c.PlayerId),
                new CreateIndexOptions { Name = "credentials_by_player" }),
            cancellationToken: token);

        await _players.Indexes.CreateOneAsync(
            new CreateIndexModel<PlayerDocument>(
                Builders<PlayerDocument>.IndexKeys.Ascending(p => p.LastSeenAt),
                new CreateIndexOptions { Name = "players_by_last_seen" }),
            cancellationToken: token);

        // Uniqueness enforced here rather than by a check-then-write, which would let two
        // registrations racing for the same name both pass their check. Sparse, because
        // anonymous players have no username and every one of them would otherwise collide
        // on null.
        await _players.Indexes.CreateOneAsync(
            new CreateIndexModel<PlayerDocument>(
                Builders<PlayerDocument>.IndexKeys.Ascending(p => p.UsernameKey),
                new CreateIndexOptions { Name = "players_by_username", Unique = true, Sparse = true }),
            cancellationToken: token);

        await _players.Indexes.CreateOneAsync(
            new CreateIndexModel<PlayerDocument>(
                Builders<PlayerDocument>.IndexKeys.Ascending(p => p.EmailKey),
                new CreateIndexOptions { Name = "players_by_email", Unique = true, Sparse = true }),
            cancellationToken: token);

        // Progress, achievements and daily_play need no secondary index: their composite ids
        // serve the per-player range scan off the primary key.

        await _leaderboard.Indexes.CreateOneAsync(
            new CreateIndexModel<LeaderboardDocument>(
                Builders<LeaderboardDocument>.IndexKeys.Descending(l => l.TotalPoints),
                new CreateIndexOptions { Name = "leaderboard_by_points" }),
            cancellationToken: token);

        await _dailyResults.Indexes.CreateOneAsync(
            new CreateIndexModel<DailyResultDocument>(
                Builders<DailyResultDocument>.IndexKeys
                    .Ascending(d => d.Date)
                    .Descending(d => d.Stars)
                    .Ascending(d => d.Moves)
                    .Ascending(d => d.ElapsedTimeMs),
                new CreateIndexOptions { Name = "daily_results_by_date" }),
            cancellationToken: token);

        await _levelLeaderboard.Indexes.CreateOneAsync(
            new CreateIndexModel<LevelLeaderboardDocument>(
                Builders<LevelLeaderboardDocument>.IndexKeys
                    .Ascending(l => l.Level)
                    .Ascending(l => l.Period)
                    .Descending(l => l.BestStars)
                    .Ascending(l => l.BestMoves)
                    .Ascending(l => l.BestTimeMs),
                new CreateIndexOptions { Name = "level_leaderboard_by_rank" }),
            cancellationToken: token);
    }

    public async Task<PlayerDocument> CreateAnonymousPlayerAsync(
        string playerId, CancellationToken token = default)
    {
        var now = DateTime.UtcNow;
        var player = new PlayerDocument
        {
            Id = playerId,
            CreatedAt = now,
            LastSeenAt = now,
            IsAnonymous = true,
        };

        await _players.InsertOneAsync(player, cancellationToken: token);
        return player;
    }

    public Task<PlayerDocument?> FindPlayerAsync(string playerId, CancellationToken token = default) =>
        _players.Find(p => p.Id == playerId).FirstOrDefaultAsync(token)!;

    public async Task<Dictionary<string, int?>> GetProfileBallsAsync(
        IEnumerable<string> playerIds, CancellationToken token = default)
    {
        var ids = playerIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new();
        }
        var players = await _players
            .Find(Builders<PlayerDocument>.Filter.In(p => p.Id, ids))
            .Project(p => new { p.Id, p.ProfileBall })
            .ToListAsync(token);
        return players.ToDictionary(p => p.Id, p => p.ProfileBall);
    }

    public async Task<Dictionary<string, int>> GetAllTimeXpAsync(
        IEnumerable<string> playerIds, CancellationToken token = default)
    {
        var ids = playerIds.Distinct().Select(LeaderboardDocument.AllTimeKey).ToList();
        if (ids.Count == 0)
        {
            return new();
        }

        var entries = await _leaderboard
            .Find(Builders<LeaderboardDocument>.Filter.In(l => l.Id, ids))
            .Project(l => new { l.PlayerId, l.TotalPoints })
            .ToListAsync(token);
        return entries.ToDictionary(e => e.PlayerId, e => e.TotalPoints);
    }

    public Task TouchPlayerAsync(string playerId, CancellationToken token = default) =>
        _players.UpdateOneAsync(
            p => p.Id == playerId,
            Builders<PlayerDocument>.Update.Set(p => p.LastSeenAt, DateTime.UtcNow),
            cancellationToken: token);

    /// <summary>
    /// Sets, or clears, the ball that represents this account.
    ///
    /// Clearing unsets the field rather than writing null, so a player who goes back to the
    /// derived colour leaves a document identical to one that never chose at all. Last write
    /// wins on purpose: this is one player on one screen setting one field, and there is no
    /// better result to keep the way there is for a completion.
    /// </summary>
    public Task SetProfileBallAsync(string playerId, int? colour, CancellationToken token = default) =>
        _players.UpdateOneAsync(
            p => p.Id == playerId,
            colour is null
                ? Builders<PlayerDocument>.Update.Unset(p => p.ProfileBall)
                : Builders<PlayerDocument>.Update.Set(p => p.ProfileBall, colour),
            cancellationToken: token);

    /// <summary>
    /// Records a completion, keeping the better result.
    ///
    /// <c>$min</c> does the comparison in the database, so a slower attempt arriving after a
    /// faster one cannot overwrite it and two devices racing cannot lose either result.
    /// </summary>
    public Task RecordCompletionAsync(
        string playerId, int level, LevelResult result, CancellationToken token = default)
    {
        var now = DateTime.UtcNow;

        return _progress.UpdateOneAsync(
            p => p.Id == ProgressDocument.KeyFor(playerId, level),
            Builders<ProgressDocument>.Update
                .SetOnInsert(p => p.PlayerId, playerId)
                .SetOnInsert(p => p.Level, level)
                .SetOnInsert(p => p.FirstCompletedAt, now)
                .Min(p => p.BestMoves, result.Moves)
                .Min(p => p.BestHints, result.Hints)
                .Max(p => p.BestStars, result.Stars)
                .Max(p => p.BestPoints, result.Points)
                .Set(p => p.LastCompletedAt, now),
            new UpdateOptions { IsUpsert = true },
            token);
    }

    public async Task<PlayerProgress> LoadProgressAsync(
        string playerId, CancellationToken token = default)
    {
        // Range scan over the composite id, served by the primary index alone.
        var documents = await _progress
            .Find(Builders<ProgressDocument>.Filter.And(
                Builders<ProgressDocument>.Filter.Gte(p => p.Id, $"{playerId}#"),
                Builders<ProgressDocument>.Filter.Lt(p => p.Id, $"{playerId}$")))
            .ToListAsync(token);

        var progress = PlayerProgress.Empty;
        foreach (var document in documents)
        {
            progress = progress.With(document.Level, new LevelResult(
                document.BestMoves, document.BestHints, document.BestStars, document.BestPoints,
                document.BestTimeMs, document.BonusPoints));
        }

        return progress;
    }

    public async Task<CompletionBonusResult> RecordCompletionBonusAsync(
        string playerId, int level, int? elapsedTimeMs, bool isReplay, int hints,
        CancellationToken token = default)
    {
        var key = ProgressDocument.KeyFor(playerId, level);
        var today = DateTime.UtcNow.Date;
        var doc = await _progress.Find(p => p.Id == key).FirstOrDefaultAsync(token);

        var replayBonus = 0;
        if (isReplay)
        {
            var lastReplayDate = doc?.LastReplayBonusDate?.Date;
            if (lastReplayDate != today)
            {
                replayBonus = 10;
            }
        }

        var timeBonus = 0;
        if (elapsedTimeMs is > 0)
        {
            var currentBest = doc?.BestTimeMs ?? 0;
            if (currentBest > 0 && elapsedTimeMs.Value < currentBest)
            {
                timeBonus = 40;
            }
        }

        var noHintBonus = hints == 0 ? 50 : 0;
        var firstClearBonus = !isReplay ? 75 : 0;

        var streakBonus = 0;
        var dailyPlayKey = DailyPlayDocument.KeyFor(playerId, today);
        var dailyDoc = await _dailyPlay.Find(d => d.Id == dailyPlayKey).FirstOrDefaultAsync(token);
        if (dailyDoc is null)
        {
            streakBonus = 25;
        }

        var totalBonus = replayBonus + timeBonus + noHintBonus + firstClearBonus + streakBonus;

        var updates = new List<UpdateDefinition<ProgressDocument>>();

        if (elapsedTimeMs is > 0)
        {
            var currentBest = doc?.BestTimeMs ?? 0;
            if (currentBest == 0 || elapsedTimeMs.Value < currentBest)
            {
                updates.Add(Builders<ProgressDocument>.Update.Set(p => p.BestTimeMs, elapsedTimeMs.Value));
            }
        }

        if (replayBonus > 0)
        {
            updates.Add(Builders<ProgressDocument>.Update.Set(p => p.LastReplayBonusDate, today));
        }

        if (totalBonus > 0)
        {
            updates.Add(Builders<ProgressDocument>.Update.Inc(p => p.BonusPoints, totalBonus));
        }

        if (updates.Count > 0)
        {
            await _progress.UpdateOneAsync(
                p => p.Id == key,
                Builders<ProgressDocument>.Update.Combine(updates),
                cancellationToken: token);
        }

        return new CompletionBonusResult(replayBonus, timeBonus, noHintBonus, firstClearBonus, streakBonus);
    }

    /// <summary>
    /// Folds one player's progress into another, keeping the better result per level.
    ///
    /// Used when a device with local progress signs in to an existing account. Because every
    /// write is a <c>$min</c>, running this twice is harmless.
    /// </summary>
    public async Task MergeProgressAsync(
        string playerId, PlayerProgress incoming, CancellationToken token = default)
    {
        foreach (var (level, result) in incoming.Levels)
        {
            await RecordCompletionAsync(playerId, level, result, token);
        }
    }

    public Task AddCredentialAsync(CredentialDocument credential, CancellationToken token = default) =>
        _credentials.InsertOneAsync(credential, cancellationToken: token);

    public Task<CredentialDocument?> FindCredentialAsync(
        string credentialId, CancellationToken token = default) =>
        _credentials.Find(c => c.Id == credentialId).FirstOrDefaultAsync(token)!;

    public Task<List<CredentialDocument>> CredentialsForAsync(
        string playerId, CancellationToken token = default) =>
        _credentials.Find(c => c.PlayerId == playerId).ToListAsync(token);

    public async Task<bool> DeleteCredentialAsync(
        string credentialId, string playerId, CancellationToken token = default)
    {
        var result = await _credentials.DeleteOneAsync(
            c => c.Id == credentialId && c.PlayerId == playerId,
            cancellationToken: token);
        return result.DeletedCount > 0;
    }

    public Task UpdateSignCountAsync(
        string credentialId, uint signCount, CancellationToken token = default) =>
        _credentials.UpdateOneAsync(
            c => c.Id == credentialId,
            Builders<CredentialDocument>.Update
                .Set(c => c.SignCount, signCount)
                .Set(c => c.LastUsedAt, DateTime.UtcNow),
            cancellationToken: token);

    public static string NormaliseKey(string value) => value.Trim().ToLowerInvariant();

    public Task<PlayerDocument?> FindByUsernameAsync(
        string username, CancellationToken token = default)
    {
        var key = NormaliseKey(username);
        return _players.Find(p => p.UsernameKey == key).FirstOrDefaultAsync(token)!;
    }

    /// <summary>
    /// Claims a username for a player.
    ///
    /// Returns false when it is taken. The duplicate-key error from the unique index is the
    /// authority, not the lookup before it: between checking and writing, someone else can
    /// take the name.
    /// </summary>
    public async Task<bool> TryClaimUsernameAsync(
        string playerId, string username, CancellationToken token = default)
    {
        try
        {
            var result = await _players.UpdateOneAsync(
                p => p.Id == playerId,
                Builders<PlayerDocument>.Update
                    .Set(p => p.Username, username.Trim())
                    .Set(p => p.UsernameKey, NormaliseKey(username)),
                cancellationToken: token);

            return result.MatchedCount > 0;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }


    public Task<PlayerDocument?> FindByEmailAsync(string email, CancellationToken token = default)
    {
        var key = NormaliseKey(email);
        return _players.Find(p => p.EmailKey == key).FirstOrDefaultAsync(token)!;
    }

    public Task<PlayerDocument?> FindByVerifiedEmailAsync(string email, CancellationToken token = default)
    {
        var key = NormaliseKey(email);
        return _players.Find(p => p.EmailKey == key && p.EmailVerified).FirstOrDefaultAsync(token)!;
    }

    public async Task<bool> LinkEmailAsync(
        string playerId, string email, CancellationToken token = default)
    {
        try
        {
            var result = await _players.UpdateOneAsync(
                p => p.Id == playerId,
                Builders<PlayerDocument>.Update
                    .Set(p => p.Email, email.Trim())
                    .Set(p => p.EmailKey, NormaliseKey(email))
                    .Set(p => p.EmailVerified, false),
                cancellationToken: token);

            return result.MatchedCount > 0;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

    public Task VerifyEmailAsync(string playerId, CancellationToken token = default) =>
        _players.UpdateOneAsync(
            p => p.Id == playerId,
            Builders<PlayerDocument>.Update.Set(p => p.EmailVerified, true),
            cancellationToken: token);

    public Task RemoveEmailAsync(string playerId, CancellationToken token = default) =>
        _players.UpdateOneAsync(
            p => p.Id == playerId,
            Builders<PlayerDocument>.Update
                .Unset(p => p.Email)
                .Unset(p => p.EmailKey)
                .Set(p => p.EmailVerified, false),
            cancellationToken: token);

    public Task MarkEnrolledAsync(string playerId, CancellationToken token = default) =>
        _players.UpdateOneAsync(
            p => p.Id == playerId,
            Builders<PlayerDocument>.Update.Set(p => p.IsAnonymous, false),
            cancellationToken: token);

    // ---- achievements --------------------------------------------------------

    /// <summary>
    /// Awards an achievement. Idempotent: the timestamp is set on insert only, so
    /// awarding twice keeps the original date.
    /// </summary>
    public Task AwardAchievementAsync(
        string playerId, string achievementId, CancellationToken token = default)
    {
        var now = DateTime.UtcNow;
        return _achievements.UpdateOneAsync(
            a => a.Id == AchievementDocument.KeyFor(playerId, achievementId),
            Builders<AchievementDocument>.Update
                .SetOnInsert(a => a.PlayerId, playerId)
                .SetOnInsert(a => a.AchievementId, achievementId)
                .SetOnInsert(a => a.AwardedAt, now),
            new UpdateOptions { IsUpsert = true },
            token);
    }

    public async Task<List<AchievementDocument>> LoadAchievementsAsync(
        string playerId, CancellationToken token = default) =>
        await _achievements
            .Find(Builders<AchievementDocument>.Filter.And(
                Builders<AchievementDocument>.Filter.Gte(a => a.Id, $"{playerId}#"),
                Builders<AchievementDocument>.Filter.Lt(a => a.Id, $"{playerId}$")))
            .ToListAsync(token);

    /// <summary>
    /// Records that a completion happened on a given UTC day. Concurrent calls on the
    /// same day increment rather than overwrite.
    /// </summary>
    public Task RecordDailyPlayAsync(
        string playerId, DateTime utcDate, CancellationToken token = default) =>
        _dailyPlay.UpdateOneAsync(
            d => d.Id == DailyPlayDocument.KeyFor(playerId, utcDate),
            Builders<DailyPlayDocument>.Update
                .SetOnInsert(d => d.PlayerId, playerId)
                .SetOnInsert(d => d.Date, utcDate.Date)
                .Inc(d => d.CompletionCount, 1),
            new UpdateOptions { IsUpsert = true },
            token);

    /// <summary>
    /// Records that a game started on a given UTC day, however it ends. Concurrent calls on
    /// the same day increment rather than overwrite.
    /// </summary>
    public Task RecordGameStartAsync(
        string playerId, DateTime utcDate, CancellationToken token = default) =>
        _gameStarts.UpdateOneAsync(
            d => d.Id == GameStartDocument.KeyFor(playerId, utcDate),
            Builders<GameStartDocument>.Update
                .SetOnInsert(d => d.PlayerId, playerId)
                .SetOnInsert(d => d.Date, utcDate.Date)
                .Inc(d => d.Starts, 1),
            new UpdateOptions { IsUpsert = true },
            token);

    public async Task<List<GameStartDocument>> LoadGameStartsAsync(
        string playerId, CancellationToken token = default) =>
        await _gameStarts
            .Find(Builders<GameStartDocument>.Filter.And(
                Builders<GameStartDocument>.Filter.Gte(d => d.Id, $"{playerId}#"),
                Builders<GameStartDocument>.Filter.Lt(d => d.Id, $"{playerId}$")))
            .ToListAsync(token);

    public async Task<List<DailyPlayDocument>> LoadDailyPlayAsync(
        string playerId, CancellationToken token = default) =>
        await _dailyPlay
            .Find(Builders<DailyPlayDocument>.Filter.And(
                Builders<DailyPlayDocument>.Filter.Gte(d => d.Id, $"{playerId}#"),
                Builders<DailyPlayDocument>.Filter.Lt(d => d.Id, $"{playerId}$")))
            .ToListAsync(token);

    // ---- badges -------------------------------------------------------------

    public Task AwardBadgeAsync(
        string playerId, string badgeId, CancellationToken token = default) =>
        _badges.UpdateOneAsync(
            b => b.Id == BadgeDocument.KeyFor(playerId, badgeId),
            Builders<BadgeDocument>.Update
                .SetOnInsert(b => b.PlayerId, playerId)
                .SetOnInsert(b => b.BadgeId, badgeId)
                .SetOnInsert(b => b.AwardedAt, DateTime.UtcNow),
            new UpdateOptions { IsUpsert = true },
            token);

    public async Task<List<BadgeDocument>> LoadBadgesAsync(
        string playerId, CancellationToken token = default) =>
        await _badges
            .Find(Builders<BadgeDocument>.Filter.And(
                Builders<BadgeDocument>.Filter.Gte(b => b.Id, $"{playerId}#"),
                Builders<BadgeDocument>.Filter.Lt(b => b.Id, $"{playerId}$")))
            .ToListAsync(token);

    // ---- leaderboard --------------------------------------------------------

    public Task UpsertLeaderboardAsync(
        string playerId, string? username, int totalPoints, int gamesPlayed, int gamesWon,
        int? profileBall = null, CancellationToken token = default)
    {
        var now = DateTime.UtcNow;

        return _leaderboard.UpdateOneAsync(
            l => l.Id == LeaderboardDocument.AllTimeKey(playerId),
            Builders<LeaderboardDocument>.Update
                .SetOnInsert(l => l.PlayerId, playerId)
                .Set(l => l.Username, username)
                .Set(l => l.ProfileBall, profileBall)
                .Set(l => l.TotalPoints, totalPoints)
                .Set(l => l.GamesPlayed, gamesPlayed)
                .Set(l => l.GamesWon, gamesWon)
                .Set(l => l.UpdatedAt, now),
            new UpdateOptions { IsUpsert = true },
            token);
    }

    /// <param name="won">
    /// Whether the attempt being recorded ended in a completion. A period row counts the
    /// attempts made inside that period, so a restart or an abandonment arrives here too,
    /// adding to games played without adding to games won.
    /// </param>
    public Task UpsertPeriodLeaderboardAsync(
        string playerId, string? username, string period, int periodPoints,
        int? profileBall = null, bool won = true, CancellationToken token = default)
    {
        var now = DateTime.UtcNow;

        return _leaderboard.UpdateOneAsync(
            l => l.Id == LeaderboardDocument.PeriodKey(playerId, period),
            Builders<LeaderboardDocument>.Update
                .SetOnInsert(l => l.PlayerId, playerId)
                .Set(l => l.Username, username)
                .Set(l => l.ProfileBall, profileBall)
                .Set(l => l.Period, period)
                .Inc(l => l.TotalPoints, periodPoints)
                .Inc(l => l.GamesPlayed, 1)
                // Counted here rather than read from a total, because a period's wins are by
                // definition the attempts made inside it, which no running tally tracks.
                .Inc(l => l.GamesWon, won ? 1 : 0)
                .Set(l => l.UpdatedAt, now),
            new UpdateOptions { IsUpsert = true },
            token);
    }

    public async Task<List<LeaderboardDocument>> QueryLeaderboardAsync(
        string? period, int offset, int limit, CancellationToken token = default)
    {
        var filter = period is null
            ? Builders<LeaderboardDocument>.Filter.Eq(l => l.Period, null)
            : Builders<LeaderboardDocument>.Filter.Eq(l => l.Period, period);

        return await _leaderboard
            .Find(filter)
            .SortByDescending(l => l.TotalPoints)
            .Skip(offset)
            .Limit(limit)
            .ToListAsync(token);
    }

    /// <summary>
    /// Updates the profile ball on all leaderboard entries for a player, so a ball change
    /// is reflected without waiting for the next completion.
    /// </summary>
    public Task UpdateLeaderboardBallAsync(
        string playerId, int? ball, CancellationToken token = default) =>
        _leaderboard.UpdateManyAsync(
            l => l.PlayerId == playerId,
            Builders<LeaderboardDocument>.Update.Set(l => l.ProfileBall, ball),
            cancellationToken: token);

    public async Task<(int Rank, LeaderboardDocument? Entry)> GetPlayerRankAsync(
        string playerId, string? period, CancellationToken token = default)
    {
        var id = period is null
            ? LeaderboardDocument.AllTimeKey(playerId)
            : LeaderboardDocument.PeriodKey(playerId, period);

        var entry = await _leaderboard.Find(l => l.Id == id).FirstOrDefaultAsync(token);
        if (entry is null)
        {
            return (0, null);
        }

        var periodFilter = period is null
            ? Builders<LeaderboardDocument>.Filter.Eq(l => l.Period, null)
            : Builders<LeaderboardDocument>.Filter.Eq(l => l.Period, period);

        var rank = await _leaderboard.CountDocumentsAsync(
            Builders<LeaderboardDocument>.Filter.And(
                periodFilter,
                Builders<LeaderboardDocument>.Filter.Gt(l => l.TotalPoints, entry.TotalPoints)),
            cancellationToken: token);

        return ((int)rank + 1, entry);
    }

    // ---- per-level leaderboard -----------------------------------------------

    public async Task UpsertLevelLeaderboardAsync(
        int level, string playerId, string? username, string? period,
        int stars, int moves, int timeMs, int? profileBall,
        CancellationToken token = default)
    {
        var key = LevelLeaderboardDocument.Key(level, playerId, period);
        var existing = await _levelLeaderboard.Find(l => l.Id == key).FirstOrDefaultAsync(token);

        if (existing is not null)
        {
            var dominated = stars > existing.BestStars
                || (stars == existing.BestStars && moves < existing.BestMoves)
                || (stars == existing.BestStars && moves == existing.BestMoves && timeMs < existing.BestTimeMs);

            if (!dominated)
            {
                return;
            }
        }

        await _levelLeaderboard.UpdateOneAsync(
            l => l.Id == key,
            Builders<LevelLeaderboardDocument>.Update
                .SetOnInsert(l => l.Level, level)
                .SetOnInsert(l => l.PlayerId, playerId)
                .Set(l => l.Username, username)
                .Set(l => l.ProfileBall, profileBall)
                .Set(l => l.Period, period)
                .Set(l => l.BestStars, stars)
                .Set(l => l.BestMoves, moves)
                .Set(l => l.BestTimeMs, timeMs)
                .Set(l => l.UpdatedAt, DateTime.UtcNow),
            new UpdateOptions { IsUpsert = true },
            token);
    }

    public async Task<List<LevelLeaderboardDocument>> GetLevelLeaderboardAsync(
        int level, string? period, int limit = 10, CancellationToken token = default)
    {
        var filter = Builders<LevelLeaderboardDocument>.Filter.And(
            Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Level, level),
            period is null
                ? Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Period, null)
                : Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Period, period));

        return await _levelLeaderboard
            .Find(filter)
            .SortByDescending(l => l.BestStars)
            .ThenBy(l => l.BestMoves)
            .ThenBy(l => l.BestTimeMs)
            .Limit(limit)
            .ToListAsync(token);
    }

    public async Task<(int Rank, LevelLeaderboardDocument? Entry)> GetLevelPlayerRankAsync(
        int level, string playerId, string? period, CancellationToken token = default)
    {
        var key = LevelLeaderboardDocument.Key(level, playerId, period);
        var entry = await _levelLeaderboard.Find(l => l.Id == key).FirstOrDefaultAsync(token);
        if (entry is null)
        {
            return (0, null);
        }

        var levelFilter = Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Level, level);
        var periodFilter = period is null
            ? Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Period, null)
            : Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Period, period);

        var betterFilter = Builders<LevelLeaderboardDocument>.Filter.Or(
            Builders<LevelLeaderboardDocument>.Filter.Gt(l => l.BestStars, entry.BestStars),
            Builders<LevelLeaderboardDocument>.Filter.And(
                Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.BestStars, entry.BestStars),
                Builders<LevelLeaderboardDocument>.Filter.Lt(l => l.BestMoves, entry.BestMoves)),
            Builders<LevelLeaderboardDocument>.Filter.And(
                Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.BestStars, entry.BestStars),
                Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.BestMoves, entry.BestMoves),
                Builders<LevelLeaderboardDocument>.Filter.Lt(l => l.BestTimeMs, entry.BestTimeMs)));

        var rank = await _levelLeaderboard.CountDocumentsAsync(
            Builders<LevelLeaderboardDocument>.Filter.And(levelFilter, periodFilter, betterFilter),
            cancellationToken: token);

        return ((int)rank + 1, entry);
    }

    // ---- activity feed ------------------------------------------------------

    public async Task EnsureActivityFeedCollectionAsync(CancellationToken token = default)
    {
        var collections = await _database.ListCollectionNamesAsync(cancellationToken: token);
        var names = await collections.ToListAsync(token);

        if (!names.Contains("activity_feed"))
        {
            await _database.CreateCollectionAsync(
                "activity_feed",
                new CreateCollectionOptions { Capped = true, MaxSize = 4 * 1024 * 1024, MaxDocuments = 5000 },
                token);
        }
    }

    public Task RecordActivityAsync(
        string playerId, string username, string eventType, string detail,
        int? profileBall = null, CancellationToken token = default)
    {
        var collection = _database.GetCollection<ActivityFeedDocument>("activity_feed");
        return collection.InsertOneAsync(new ActivityFeedDocument
        {
            PlayerId = playerId,
            Username = username,
            ProfileBall = profileBall,
            EventType = eventType,
            Detail = detail,
            Timestamp = DateTime.UtcNow,
        }, cancellationToken: token);
    }

    /// <summary>
    /// Records a structured activity event with a kind and typed parameters, so clients
    /// can localise the message. The <paramref name="detail"/> is kept as a fallback for
    /// clients that do not yet understand the structured format.
    /// </summary>
    public Task RecordStructuredActivityAsync(
        string playerId, string username, string eventType, string detail,
        string kind, Dictionary<string, object> parameters,
        int? profileBall = null, CancellationToken token = default)
    {
        var collection = _database.GetCollection<ActivityFeedDocument>("activity_feed");
        return collection.InsertOneAsync(new ActivityFeedDocument
        {
            PlayerId = playerId,
            Username = username,
            ProfileBall = profileBall,
            EventType = eventType,
            Detail = detail,
            Kind = kind,
            Params = parameters,
            Timestamp = DateTime.UtcNow,
        }, cancellationToken: token);
    }

    public async Task<List<ActivityFeedDocument>> GetRecentActivityAsync(
        int limit, CancellationToken token = default)
    {
        var collection = _database.GetCollection<ActivityFeedDocument>("activity_feed");
        return await collection
            .Find(Builders<ActivityFeedDocument>.Filter.Empty)
            .SortByDescending(a => a.Id)
            .Limit(limit)
            .ToListAsync(token);
    }

    // ---- daily challenge ----------------------------------------------------

    /// <summary>
    /// Upserts a daily challenge result, keeping the better attempt: highest stars, then
    /// fewest moves, then fastest time. The comparison is in code rather than <c>$min</c>
    /// because a single operator cannot express a three-tier preference.
    /// </summary>
    public async Task<bool> UpsertDailyResultAsync(
        string playerId, string date, string? username,
        int moves, int hints, int stars, int points, int elapsedTimeMs,
        int? profileBall = null, CancellationToken token = default)
    {
        var key = DailyResultDocument.KeyFor(playerId, date);
        var existing = await _dailyResults.Find(d => d.Id == key).FirstOrDefaultAsync(token);

        if (existing is not null)
        {
            var dominated = stars > existing.Stars
                || (stars == existing.Stars && moves < existing.Moves)
                || (stars == existing.Stars && moves == existing.Moves && elapsedTimeMs < existing.ElapsedTimeMs);

            if (!dominated)
            {
                return false;
            }
        }

        var now = DateTime.UtcNow;

        await _dailyResults.UpdateOneAsync(
            d => d.Id == key,
            Builders<DailyResultDocument>.Update
                .SetOnInsert(d => d.PlayerId, playerId)
                .SetOnInsert(d => d.Date, date)
                .Set(d => d.Username, username)
                .Set(d => d.ProfileBall, profileBall)
                .Set(d => d.Moves, moves)
                .Set(d => d.Hints, hints)
                .Set(d => d.Stars, stars)
                .Set(d => d.Points, points)
                .Set(d => d.ElapsedTimeMs, elapsedTimeMs)
                .Set(d => d.Timestamp, now),
            new UpdateOptions { IsUpsert = true },
            token);

        return true;
    }

    public async Task<DailyResultDocument?> FindDailyResultAsync(
        string playerId, string date, CancellationToken token = default) =>
        await _dailyResults
            .Find(d => d.Id == DailyResultDocument.KeyFor(playerId, date))
            .FirstOrDefaultAsync(token);

    /// <summary>
    /// Where a player stands on one day's board, counting everyone ahead of them rather than
    /// scanning the board itself — the board is capped at ten, and a player outside it still
    /// wants to know their number.
    ///
    /// "Ahead" is the same three-tier order the board sorts by, and it excludes players with
    /// no username for the same reason the board does: they are not on it to be ahead of.
    /// </summary>
    public async Task<(int Rank, DailyResultDocument? Entry)> GetDailyPlayerRankAsync(
        string playerId, string date, CancellationToken token = default)
    {
        var entry = await _dailyResults
            .Find(d => d.Id == DailyResultDocument.KeyFor(playerId, date))
            .FirstOrDefaultAsync(token);

        if (entry is null)
        {
            return (0, null);
        }

        var betterFilter = Builders<DailyResultDocument>.Filter.Or(
            Builders<DailyResultDocument>.Filter.Gt(d => d.Stars, entry.Stars),
            Builders<DailyResultDocument>.Filter.And(
                Builders<DailyResultDocument>.Filter.Eq(d => d.Stars, entry.Stars),
                Builders<DailyResultDocument>.Filter.Lt(d => d.Moves, entry.Moves)),
            Builders<DailyResultDocument>.Filter.And(
                Builders<DailyResultDocument>.Filter.Eq(d => d.Stars, entry.Stars),
                Builders<DailyResultDocument>.Filter.Eq(d => d.Moves, entry.Moves),
                Builders<DailyResultDocument>.Filter.Lt(d => d.ElapsedTimeMs, entry.ElapsedTimeMs)));

        var rank = await _dailyResults.CountDocumentsAsync(
            Builders<DailyResultDocument>.Filter.And(
                Builders<DailyResultDocument>.Filter.Eq(d => d.Date, date),
                Builders<DailyResultDocument>.Filter.Ne(d => d.Username, null),
                betterFilter),
            cancellationToken: token);

        return ((int)rank + 1, entry);
    }

    public async Task<List<DailyResultDocument>> GetDailyLeaderboardAsync(
        string date, int limit = 10, CancellationToken token = default) =>
        await _dailyResults
            .Find(Builders<DailyResultDocument>.Filter.And(
                Builders<DailyResultDocument>.Filter.Eq(d => d.Date, date),
                Builders<DailyResultDocument>.Filter.Ne(d => d.Username, null)))
            .SortByDescending(d => d.Stars)
            .ThenBy(d => d.Moves)
            .ThenBy(d => d.ElapsedTimeMs)
            .Limit(limit)
            .ToListAsync(token);

    // ---- community stats ----------------------------------------------------

    public async Task<long> CountSolvedTodayAsync(CancellationToken token = default)
    {
        var today = DateTime.UtcNow.Date;
        var docs = await _dailyPlay
            .Find(d => d.Date == today)
            .ToListAsync(token);

        return docs.Sum(d => (long)d.CompletionCount);
    }

    public async Task<long> CountActivePlayersThisWeekAsync(CancellationToken token = default)
    {
        var today = DateTime.UtcNow.Date;
        var dayOfWeek = today.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)today.DayOfWeek - 1;
        var monday = today.AddDays(-dayOfWeek);

        var docs = await _dailyPlay
            .Find(d => d.Date >= monday && d.Date <= today)
            .ToListAsync(token);

        return docs.Select(d => d.PlayerId).Distinct().Count();
    }

    /// <summary>
    /// Games played per UTC day, for one player or (with no player) for everyone.
    ///
    /// A game counts when it starts. Starts have only been recorded since that rule arrived,
    /// so a day with no starts falls back to its completions - which is what "games played"
    /// meant then - instead of reading as zero. For the community the switch is per day: once
    /// any start is recorded on a day, that day is counted by starts.
    /// </summary>
    public async Task<Dictionary<DateTime, int>> GetGamesPlayedByDayAsync(
        string? playerId, DateTime? since = null, CancellationToken token = default)
    {
        var startFilter = Builders<GameStartDocument>.Filter.Empty;
        var playFilter = Builders<DailyPlayDocument>.Filter.Empty;

        if (playerId is not null)
        {
            startFilter &= Builders<GameStartDocument>.Filter.Gte(d => d.Id, $"{playerId}#")
                & Builders<GameStartDocument>.Filter.Lt(d => d.Id, $"{playerId}$");
            playFilter &= Builders<DailyPlayDocument>.Filter.Gte(d => d.Id, $"{playerId}#")
                & Builders<DailyPlayDocument>.Filter.Lt(d => d.Id, $"{playerId}$");
        }

        if (since is not null)
        {
            startFilter &= Builders<GameStartDocument>.Filter.Gte(d => d.Date, since.Value.Date);
            playFilter &= Builders<DailyPlayDocument>.Filter.Gte(d => d.Date, since.Value.Date);
        }

        var starts = (await _gameStarts.Find(startFilter).ToListAsync(token))
            .GroupBy(d => d.Date)
            .ToDictionary(g => g.Key, g => g.Sum(d => d.Starts));
        var completions = (await _dailyPlay.Find(playFilter).ToListAsync(token))
            .GroupBy(d => d.Date)
            .ToDictionary(g => g.Key, g => g.Sum(d => d.CompletionCount));

        var games = new Dictionary<DateTime, int>(completions);
        foreach (var (day, count) in starts)
        {
            games[day] = count;
        }

        return games;
    }

    public async Task<List<(string PlayerId, PlayerProgress Progress)>> LoadAllProgressForMigrationAsync(
        CancellationToken token = default)
    {
        var allDocs = await _progress.Find(_ => true).ToListAsync(token);
        var grouped = allDocs.GroupBy(d => d.PlayerId);
        var result = new List<(string, PlayerProgress)>();

        foreach (var group in grouped)
        {
            var progress = PlayerProgress.Empty;
            foreach (var doc in group)
            {
                progress = progress.With(doc.Level, new LevelResult(
                    doc.BestMoves, doc.BestHints, doc.BestStars, doc.BestPoints,
                    doc.BestTimeMs, doc.BonusPoints));
            }

            if (progress.TotalPoints > 0)
            {
                result.Add((group.Key, progress));
            }
        }

        return result;
    }

    // ---- leaderboard backfill -----------------------------------------------

    public async Task BackfillLeaderboardAsync(CancellationToken token = default)
    {
        var existing = await _leaderboard.CountDocumentsAsync(
            Builders<LeaderboardDocument>.Filter.Eq(l => l.Period, null),
            cancellationToken: token);
        if (existing > 0)
        {
            return;
        }

        var players = await _players
            .Find(p => !p.IsAnonymous)
            .ToListAsync(token);

        foreach (var player in players)
        {
            var progress = await LoadProgressAsync(player.Id, token);
            if (progress.Levels.Count == 0)
            {
                continue;
            }

            var gamesPlayed = progress.Levels.Count;
            var gamesWon = progress.Levels.Values.Count(r => r.Stars >= 1);

            await UpsertLeaderboardAsync(
                player.Id, player.Username, progress.TotalPoints, gamesPlayed, gamesWon,
                player.ProfileBall, token);
        }
    }

    public async Task BackfillLevelLeaderboardAsync(CancellationToken token = default)
    {
        var existing = await _levelLeaderboard.CountDocumentsAsync(
            Builders<LevelLeaderboardDocument>.Filter.Eq(l => l.Period, null),
            cancellationToken: token);
        if (existing > 0)
        {
            return;
        }

        var players = await _players
            .Find(p => !p.IsAnonymous)
            .ToListAsync(token);

        foreach (var player in players)
        {
            var progress = await LoadProgressAsync(player.Id, token);
            foreach (var (level, result) in progress.Levels)
            {
                var built = Levels.LevelCatalogue.Build(level);
                var par = built.ConstructiveSolution.Count;
                var timeTarget = Levels.LevelCatalogue.TimeTargetMs(level);
                var (stars, _) = Rules.Scoring.Calculate(result.Moves, result.Hints, result.BestTimeMs, par, timeTarget);

                await UpsertLevelLeaderboardAsync(
                    level, player.Id, player.Username, null,
                    stars, result.Moves, result.BestTimeMs, player.ProfileBall, token);
            }
        }
    }
}

public readonly record struct CompletionBonusResult(
    int ReplayBonus, int TimeBonus, int NoHintBonus, int FirstClearBonus, int StreakBonus)
{
    public int Total => ReplayBonus + TimeBonus + NoHintBonus + FirstClearBonus + StreakBonus;
}
