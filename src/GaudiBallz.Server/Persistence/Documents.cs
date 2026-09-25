using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace GaudiBallz.Server.Persistence;

/// <summary>
/// A player. Anonymous from first launch; passkeys attach to this same record rather than
/// creating a new one, so signing up never loses what came before.
/// </summary>
public sealed class PlayerDocument
{
    public string Id { get; set; } = string.Empty;
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastSeenAt { get; set; }

    /// <summary>False once the account has been registered with a username and a passkey.</summary>
    public bool IsAnonymous { get; set; } = true;

    /// <summary>What the player called the account. Null while anonymous.</summary>
    public string? Username { get; set; }

    /// <summary>
    /// The username lowercased, which is what the unique index is on.
    ///
    /// Uniqueness is case-insensitive because two accounts differing only in capitalisation
    /// would look identical everywhere they are shown, which defeats the point of naming
    /// them. Stored rather than computed so the index can enforce it.
    /// </summary>
    public string? UsernameKey { get; set; }

    /// <summary>
    /// Which of the game's colours the player chose to represent their account, or null when
    /// they never chose one.
    ///
    /// Null is what makes this deployable without a migration: every account that existed
    /// before the picker did has no field here, which reads as null, which means the colour
    /// keeps being derived from the username exactly as it was. Clearing a choice removes
    /// the field again rather than writing the derived value, so an account that goes back
    /// to the derived ball keeps following its username afterwards.
    /// </summary>
    public int? ProfileBall { get; set; }

    public string? Email { get; set; }

    public string? EmailKey { get; set; }

    public bool EmailVerified { get; set; }
}

/// <summary>
/// One passkey. A player may have several, so a second device can be enrolled directly
/// rather than depending on the platform syncing credentials.
///
/// The credential id is the document id, which makes "this credential belongs to exactly
/// one account" a property of the database rather than of the code.
/// </summary>
public sealed class CredentialDocument
{
    /// <summary>Base64url of the raw credential id.</summary>
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public byte[] PublicKey { get; set; } = [];
    public byte[] UserHandle { get; set; } = [];

    /// <summary>
    /// Guards against a cloned authenticator: a counter that goes backwards means the same
    /// credential is in two places.
    /// </summary>
    public uint SignCount { get; set; }

    public string? AttestationFormat { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}

/// <summary>
/// One level's best result for one player.
///
/// A document per level rather than a map inside the player, so two devices submitting at
/// once update different documents and cannot lose one another's work. The composite id
/// also lets every level for a player be read by an id range scan, so this collection needs
/// no secondary index despite being the largest.
/// </summary>
public sealed class ProgressDocument
{
    /// <summary>"{playerId}#{level:D6}" — sorts by player then level.</summary>
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public int Level { get; set; }
    public int BestMoves { get; set; }
    public int BestHints { get; set; }
    public int BestStars { get; set; }
    public int BestPoints { get; set; }
    public int BestTimeMs { get; set; }
    public int BonusPoints { get; set; }
    public DateTime? LastReplayBonusDate { get; set; }
    public DateTime FirstCompletedAt { get; set; }
    public DateTime LastCompletedAt { get; set; }

    public static string KeyFor(string playerId, int level) => $"{playerId}#{level:D6}";
}

/// <summary>
/// One achievement awarded to one player.
///
/// Composite id follows the same pattern as progress: "{playerId}#{achievementId}", so a
/// range scan on the primary key returns everything for one player.
/// </summary>
public sealed class AchievementDocument
{
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string AchievementId { get; set; } = string.Empty;
    public DateTime AwardedAt { get; set; }

    public static string KeyFor(string playerId, string achievementId) =>
        $"{playerId}#{achievementId}";
}

/// <summary>
/// One badge awarded to one player. Same lifecycle as achievements: evaluated on completion,
/// awarded once, never revoked.
/// </summary>
public sealed class BadgeDocument
{
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string BadgeId { get; set; } = string.Empty;
    public DateTime AwardedAt { get; set; }

    public static string KeyFor(string playerId, string badgeId) =>
        $"{playerId}#{badgeId}";
}

/// <summary>
/// One calendar day on which a player completed at least one level.
///
/// Composite id: "{playerId}#{yyyy-MM-dd}". One document per player per UTC day, upserted
/// with $inc so concurrent completions on the same day cannot lose each other.
/// </summary>
public sealed class DailyPlayDocument
{
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int CompletionCount { get; set; }

    public static string KeyFor(string playerId, DateTime utcDate) =>
        $"{playerId}#{utcDate:yyyy-MM-dd}";
}

/// <summary>
/// How many games a player started on one calendar day, finished or not.
///
/// Kept apart from <see cref="DailyPlayDocument"/> on purpose: streaks and "active this week"
/// read whether a completion row exists at all, and a day of only unfinished games must not
/// look like a day played to them. Same composite id and $inc upsert as that document.
/// </summary>
public sealed class GameStartDocument
{
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int Starts { get; set; }

    public static string KeyFor(string playerId, DateTime utcDate) =>
        $"{playerId}#{utcDate:yyyy-MM-dd}";
}

/// <summary>
/// One entry in the leaderboard materialized view. Upserted on each completion that changes
/// the player's point total, so reads are a simple index scan.
/// </summary>
public sealed class LeaderboardDocument
{
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public int? ProfileBall { get; set; }
    public int TotalPoints { get; set; }
    public int GamesPlayed { get; set; }
    public int GamesWon { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// All-time entries have no period. Weekly/daily entries are keyed by a period string
    /// like "2026-W37" or "2026-09-09".
    /// </summary>
    public string? Period { get; set; }

    public static string AllTimeKey(string playerId) => playerId;
    public static string PeriodKey(string playerId, string period) => $"{playerId}#{period}";
}

/// <summary>
/// One event in the activity feed. Stored in a capped collection so old events are
/// evicted automatically.
///
/// New events store structured data in <see cref="Kind"/> and <see cref="Params"/> so
/// clients can localise them. Legacy events (written before structured storage) have no
/// <c>Kind</c> and carry only a pre-formatted <see cref="Detail"/> string.
/// </summary>
public sealed class ActivityFeedDocument
{
    public ObjectId Id { get; set; }
    public string PlayerId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int? ProfileBall { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }

    /// <summary>Structured event kind, e.g. "level-cleared", "new-record", "achievement-earned". Null for legacy events.</summary>
    public string? Kind { get; set; }

    /// <summary>Structured parameters for the event. Null for legacy events.</summary>
    public Dictionary<string, object>? Params { get; set; }
}

/// <summary>
/// One daily challenge result for one player on one day.
///
/// Composite id: "{playerId}#{yyyy-MM-dd}". An upsert keeps the better result, so a player
/// who replays the daily sees their best attempt rather than their latest.
/// </summary>
public sealed class DailyResultDocument
{
    /// <summary>"{playerId}#{yyyy-MM-dd}"</summary>
    public string Id { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string? Username { get; set; }
    public int? ProfileBall { get; set; }
    public int Moves { get; set; }
    public int Hints { get; set; }
    public int Stars { get; set; }
    public int Points { get; set; }
    public int ElapsedTimeMs { get; set; }
    public DateTime Timestamp { get; set; }

    public static string KeyFor(string playerId, string date) => $"{playerId}#{date}";
}

/// <summary>
/// One scored attempt, kept so it can be shown on its own public page.
///
/// Written once when the server scores a completion and never changed, so a shared link shows
/// exactly what was scored. It stores numbers only: who the player is now is looked up when the
/// page is viewed, and the board is regenerated from the level or date.
/// </summary>
public sealed class SharedResultDocument
{
    /// <summary>The short random id in the link.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>"level" or "daily".</summary>
    public string Kind { get; set; } = string.Empty;

    /// <summary>The campaign level; null for a daily.</summary>
    public int? Level { get; set; }

    /// <summary>The daily's UTC date as yyyy-MM-dd; null for a level.</summary>
    public string? Date { get; set; }

    public string PlayerId { get; set; } = string.Empty;
    public int Moves { get; set; }
    public int Hints { get; set; }
    public int Stars { get; set; }
    public int ElapsedTimeMs { get; set; }
    public int Par { get; set; }
    public int TimeTargetMs { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// The moves that solved the board, as [from, to] pairs, once the server has replayed them.
    /// Null for a completion from an older build that sent none: that one has no replay.
    /// </summary>
    public int[][]? MoveList { get; set; }

    /// <summary>Whether <see cref="MoveList"/> was replayed and found to solve the board.</summary>
    public bool Verified { get; set; }
}

/// <summary>
/// One entry in the per-level leaderboard materialized view. Keyed by
/// "{level:D6}#{playerId}#{period|'alltime'}". The Akka.Streams projection upserts this
/// with a dominance check so only the best result per (level, player, period) is kept.
/// </summary>
public sealed class LevelLeaderboardDocument
{
    public string Id { get; set; } = string.Empty;
    public int Level { get; set; }
    public string PlayerId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public int? ProfileBall { get; set; }
    public string? Period { get; set; }
    public int BestStars { get; set; }
    public int BestMoves { get; set; }
    public int BestTimeMs { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static string Key(int level, string playerId, string? period) =>
        $"{level:D6}#{playerId}#{period ?? "alltime"}";
}

/// <summary>
/// Registers class maps explicitly rather than relying on automatic mapping, which changes
/// behaviour silently when a property is renamed or reordered.
/// </summary>
public static class BsonRegistration
{
    private static bool _registered;
    private static readonly Lock Gate = new();

    public static void Register()
    {
        lock (Gate)
        {
            if (_registered)
            {
                return;
            }

            BsonClassMap.RegisterClassMap<PlayerDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(p => p.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);

                // Omitted entirely when absent, not written as null.
                //
                // A sparse unique index skips documents where the field does not exist — but
                // the driver writes an explicit null by default, so the field *does* exist and
                // every anonymous player collides on null. Dropping the field is what makes
                // the sparse index behave the way it reads.
                map.GetMemberMap(p => p.Username).SetIgnoreIfNull(true);
                map.GetMemberMap(p => p.UsernameKey).SetIgnoreIfNull(true);

                // Same treatment, different reason: nothing indexes this, but an account
                // that never chose a ball should look on disk exactly like one from before
                // the picker existed.
                map.GetMemberMap(p => p.ProfileBall).SetIgnoreIfNull(true);
                map.GetMemberMap(p => p.Email).SetIgnoreIfNull(true);
                map.GetMemberMap(p => p.EmailKey).SetIgnoreIfNull(true);
            });

            BsonClassMap.RegisterClassMap<CredentialDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(c => c.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<ProgressDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(p => p.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.GetMemberMap(p => p.LastReplayBonusDate).SetIgnoreIfNull(true);
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<AchievementDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(a => a.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<BadgeDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(b => b.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<DailyPlayDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(d => d.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<GameStartDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(d => d.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
            });

            BsonClassMap.RegisterClassMap<LeaderboardDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(l => l.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
                map.GetMemberMap(l => l.Username).SetIgnoreIfNull(true);
                map.GetMemberMap(l => l.ProfileBall).SetIgnoreIfNull(true);
                map.GetMemberMap(l => l.Period).SetIgnoreIfNull(true);
            });

            BsonClassMap.RegisterClassMap<ActivityFeedDocument>(map =>
            {
                map.AutoMap();
                map.SetIgnoreExtraElements(true);
                map.GetMemberMap(a => a.Kind).SetIgnoreIfNull(true);
                map.GetMemberMap(a => a.ProfileBall).SetIgnoreIfNull(true);
                map.GetMemberMap(a => a.Params).SetIgnoreIfNull(true);
            });

            BsonClassMap.RegisterClassMap<DailyResultDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(d => d.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
                map.GetMemberMap(d => d.Username).SetIgnoreIfNull(true);
                map.GetMemberMap(d => d.ProfileBall).SetIgnoreIfNull(true);
            });

            BsonClassMap.RegisterClassMap<LevelLeaderboardDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(l => l.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
                map.GetMemberMap(l => l.Username).SetIgnoreIfNull(true);
                map.GetMemberMap(l => l.ProfileBall).SetIgnoreIfNull(true);
                map.GetMemberMap(l => l.Period).SetIgnoreIfNull(true);
            });

            BsonClassMap.RegisterClassMap<SharedResultDocument>(map =>
            {
                map.AutoMap();
                map.MapIdMember(s => s.Id).SetSerializer(new StringSerializer(BsonType.String));
                map.SetIgnoreExtraElements(true);
                map.GetMemberMap(s => s.Level).SetIgnoreIfNull(true);
                map.GetMemberMap(s => s.Date).SetIgnoreIfNull(true);
                map.GetMemberMap(s => s.MoveList).SetIgnoreIfNull(true);
            });

            _registered = true;
        }
    }
}
