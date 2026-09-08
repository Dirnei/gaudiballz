using MongoDB.Driver;
using Puzzle.Server.Progression;

namespace Puzzle.Server.Persistence;

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
    private readonly IMongoCollection<DailyPlayDocument> _dailyPlay;

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

        var database = new MongoClient(settings).GetDatabase(options.Database);

        // Progress is what a player would notice losing, so it is written with majority
        // acknowledgement rather than fire-and-forget.
        var durable = new MongoCollectionSettings
        {
            WriteConcern = WriteConcern.WMajority.With(journal: true),
        };

        _players = database.GetCollection<PlayerDocument>("players", durable);
        _credentials = database.GetCollection<CredentialDocument>("credentials", durable);
        _progress = database.GetCollection<ProgressDocument>("progress", durable);
        _achievements = database.GetCollection<AchievementDocument>("player_achievements", durable);
        _dailyPlay = database.GetCollection<DailyPlayDocument>("daily_play", durable);
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

        // Progress, achievements and daily_play need no secondary index: their composite ids
        // serve the per-player range scan off the primary key.
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
            progress = progress.With(document.Level, new LevelResult(document.BestMoves, document.BestHints));
        }

        return progress;
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

    public Task UpdateSignCountAsync(
        string credentialId, uint signCount, CancellationToken token = default) =>
        _credentials.UpdateOneAsync(
            c => c.Id == credentialId,
            Builders<CredentialDocument>.Update
                .Set(c => c.SignCount, signCount)
                .Set(c => c.LastUsedAt, DateTime.UtcNow),
            cancellationToken: token);

    /// <summary>Lowercased for comparison; the display form keeps what the player typed.</summary>
    public static string NormaliseUsername(string username) => username.Trim().ToLowerInvariant();

    public Task<PlayerDocument?> FindByUsernameAsync(
        string username, CancellationToken token = default)
    {
        var key = NormaliseUsername(username);
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
                    .Set(p => p.UsernameKey, NormaliseUsername(username)),
                cancellationToken: token);

            return result.MatchedCount > 0;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

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

    public async Task<List<DailyPlayDocument>> LoadDailyPlayAsync(
        string playerId, CancellationToken token = default) =>
        await _dailyPlay
            .Find(Builders<DailyPlayDocument>.Filter.And(
                Builders<DailyPlayDocument>.Filter.Gte(d => d.Id, $"{playerId}#"),
                Builders<DailyPlayDocument>.Filter.Lt(d => d.Id, $"{playerId}$")))
            .ToListAsync(token);
}
