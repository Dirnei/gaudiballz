using System.Collections.Immutable;
using Akka.Actor;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Achievements;

// ---- messages ----------------------------------------------------------------

public sealed record CompletionEvent(
    string PlayerId,
    int Level,
    LevelResult Result,
    AttemptMetadata Metadata,
    bool IsAnonymous) : IPlayerCommand
{
    string IPlayerCommand.PlayerId => PlayerId;
}

public sealed record EvaluateRetroactive(string PlayerId) : IPlayerCommand
{
    string IPlayerCommand.PlayerId => PlayerId;
}

public sealed record AchievementResult(
    IReadOnlyList<AwardedAchievement> NewAwards,
    IReadOnlyList<AwardedBadge> NewBadges);

public sealed record AwardedAchievement(string Id, string Name);

public sealed record AwardedBadge(string Id, string Name);

// ---- evaluator per player ----------------------------------------------------

public sealed class AchievementEvaluatorActor : ReceiveActor
{
    private readonly Dictionary<string, HashSet<int>> _sessionLevels = [];

    public AchievementEvaluatorActor(string playerId, PuzzleStore store)
    {
        ReceiveAsync<CompletionEvent>(async command =>
        {
            var sender = Sender;

            if (command.IsAnonymous)
            {
                sender.Tell(new AchievementResult([], []));
                return;
            }

            try
            {
                await store.RecordDailyPlayAsync(command.PlayerId, DateTime.UtcNow);

                var progress = await store.LoadProgressAsync(command.PlayerId);
                var dailyPlay = await store.LoadDailyPlayAsync(command.PlayerId);
                var existingDocs = await store.LoadAchievementsAsync(command.PlayerId);
                var alreadyAwarded = existingDocs
                    .Select(d => d.AchievementId)
                    .ToImmutableHashSet();

                var ctx = new CompletionContext(
                    command.PlayerId,
                    command.Level,
                    command.Result.Moves,
                    command.Result.Hints,
                    command.Metadata,
                    progress,
                    dailyPlay,
                    alreadyAwarded);

                var newIds = AchievementCatalogue.Evaluate(ctx);
                var newAwards = new List<AwardedAchievement>();

                foreach (var id in newIds)
                {
                    await store.AwardAchievementAsync(command.PlayerId, id);
                    var def = AchievementCatalogue.All.First(a => a.Id == id);
                    newAwards.Add(new AwardedAchievement(id, def.Name));
                }

                if (!alreadyAwarded.Contains("marathon") && command.Metadata.SessionId is { } sid)
                {
                    if (!_sessionLevels.TryGetValue(sid, out var levels))
                    {
                        levels = [];
                        _sessionLevels[sid] = levels;
                    }
                    levels.Add(command.Level);

                    if (levels.Count >= 10)
                    {
                        await store.AwardAchievementAsync(command.PlayerId, "marathon");
                        var def = AchievementCatalogue.All.First(a => a.Id == "marathon");
                        newAwards.Add(new AwardedAchievement("marathon", def.Name));
                    }
                }

                var newBadges = new List<AwardedBadge>();
                try
                {
                    var existingBadgeDocs = await store.LoadBadgesAsync(command.PlayerId);
                    var alreadyAwardedBadges = existingBadgeDocs
                        .Select(b => b.BadgeId)
                        .ToImmutableHashSet();

                    var newBadgeIds = BadgeCatalogue.Evaluate(progress, alreadyAwardedBadges);
                    foreach (var badgeId in newBadgeIds)
                    {
                        await store.AwardBadgeAsync(command.PlayerId, badgeId);
                        var badgeDef = BadgeCatalogue.All.First(b => b.Id == badgeId);
                        newBadges.Add(new AwardedBadge(badgeId, badgeDef.Name));
                    }
                }
                catch
                {
                    // Badge evaluation failure is non-blocking
                }

                sender.Tell(new AchievementResult(newAwards, newBadges));
            }
            catch
            {
                sender.Tell(new AchievementResult([], []));
            }
        });

        ReceiveAsync<EvaluateRetroactive>(async command =>
        {
            try
            {
                var progress = await store.LoadProgressAsync(command.PlayerId);
                var dailyPlay = await store.LoadDailyPlayAsync(command.PlayerId);
                var existingDocs = await store.LoadAchievementsAsync(command.PlayerId);
                var alreadyAwarded = existingDocs
                    .Select(d => d.AchievementId)
                    .ToImmutableHashSet();

                var newIds = AchievementCatalogue.EvaluateRetroactive(progress, dailyPlay, alreadyAwarded);

                foreach (var id in newIds)
                {
                    await store.AwardAchievementAsync(command.PlayerId, id);
                }
            }
            catch
            {
                // Retroactive failure is silent — achievements will be evaluated on the next completion.
            }
        });
    }

    public static Props PropsFor(string playerId, PuzzleStore store) =>
        Props.Create(() => new AchievementEvaluatorActor(playerId, store));
}
/// <summary>
/// Key for the achievement entity region in the actor registry.
/// See <see cref="GaudiBallz.Server.Progression.PlayerRegion"/> for why the marker names the
/// region rather than the entity.
/// </summary>
public sealed class AchievementRegion;
