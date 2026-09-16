using Servus.Akka.Local;

namespace GaudiBallz.Server.Progression;

/// <summary>Settings shared by every per-player entity region.</summary>
public static class EntityRegions
{
    /// <summary>How long an entity sits unused before the region stops it.</summary>
    public static readonly TimeSpan IdleBeforePassivation = TimeSpan.FromMinutes(10);

    /// <summary>
    /// The entity id store is stated rather than left to the default, because the choice
    /// matters: a store that remembers ids reloads and respawns every one of them when the
    /// region starts, so each deploy would recover every player who ever played, all at
    /// once. Nothing here needs an entity before its first message arrives.
    /// </summary>
    public static LocalEntityRegionOptions Options() => new()
    {
        PassivateIdleEntityAfter = IdleBeforePassivation,
        EntityIdStore = new InMemoryEntityIdStore(),
    };
}

/// <summary>
/// Keys for the local entity regions in the actor registry.
///
/// These name the region, not the entity: what an endpoint injects is the doorway to every
/// player's wallet, not one wallet. Keying on the entity actor type would read as the
/// latter at each call site, so a marker per region keeps <c>IRequiredActor&lt;T&gt;</c>
/// honest about what it hands back.
/// </summary>
public sealed class PlayerRegion;

/// <inheritdoc cref="PlayerRegion"/>
public sealed class WalletRegion;

/// <inheritdoc cref="PlayerRegion"/>
public sealed class CompletionJournalRegion;
