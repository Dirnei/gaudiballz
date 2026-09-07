using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Puzzle.Server.Persistence;

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
    public DateTime FirstCompletedAt { get; set; }
    public DateTime LastCompletedAt { get; set; }

    public static string KeyFor(string playerId, int level) => $"{playerId}#{level:D6}";
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
                map.SetIgnoreExtraElements(true);
            });

            _registered = true;
        }
    }
}
