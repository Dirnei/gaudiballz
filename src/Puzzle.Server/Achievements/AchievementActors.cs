using System.Collections.Immutable;
using Akka.Actor;
using Puzzle.Server.Persistence;
using Puzzle.Server.Progression;

namespace Puzzle.Server.Achievements;

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

public sealed record AchievementResult(IReadOnlyList<AwardedAchievement> NewAwards);

public sealed record AwardedAchievement(string Id, string Name);

internal sealed record AchievementPassivate(string PlayerId);

// ---- evaluator per player ----------------------------------------------------

public sealed class AchievementEvaluatorActor : ReceiveActor
{
    private static readonly TimeSpan IdleBeforePassivation = TimeSpan.FromMinutes(10);

    private readonly Dictionary<string, HashSet<int>> _sessionLevels = [];

    public AchievementEvaluatorActor(string playerId, PuzzleStore store)
    {
        ReceiveAsync<CompletionEvent>(async command =>
        {
            var sender = Sender;

            if (command.IsAnonymous)
            {
                sender.Tell(new AchievementResult([]));
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

                sender.Tell(new AchievementResult(newAwards));
            }
            catch
            {
                sender.Tell(new AchievementResult([]));
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

        Receive<ReceiveTimeout>(_ => Context.Parent.Tell(new AchievementPassivate(playerId)));

        Context.SetReceiveTimeout(IdleBeforePassivation);
    }

    public static Props PropsFor(string playerId, PuzzleStore store) =>
        Props.Create(() => new AchievementEvaluatorActor(playerId, store));
}

// ---- registry ----------------------------------------------------------------

public sealed class AchievementRegistryActor : ReceiveActor
{
    private readonly PuzzleStore _store;
    private readonly Dictionary<string, IActorRef> _children = [];
    private readonly Dictionary<string, List<(object Message, IActorRef Sender)>> _passivating = [];

    public AchievementRegistryActor(PuzzleStore store)
    {
        _store = store;

        Receive<IPlayerCommand>(command =>
        {
            if (_passivating.TryGetValue(command.PlayerId, out var buffered))
            {
                buffered.Add((command, Sender));
                return;
            }

            ChildFor(command.PlayerId).Forward(command);
        });

        Receive<AchievementPassivate>(passivate =>
        {
            if (_children.TryGetValue(passivate.PlayerId, out var child))
            {
                _passivating[passivate.PlayerId] = [];
                Context.Stop(child);
            }
        });

        Receive<Terminated>(terminated =>
        {
            var playerId = _children
                .Where(pair => pair.Value.Equals(terminated.ActorRef))
                .Select(pair => pair.Key)
                .FirstOrDefault();

            if (playerId is null)
            {
                return;
            }

            _children.Remove(playerId);

            if (_passivating.Remove(playerId, out var buffered) && buffered.Count > 0)
            {
                var replacement = ChildFor(playerId);
                foreach (var (message, sender) in buffered)
                {
                    replacement.Tell(message, sender);
                }
            }
        });
    }

    public static Props PropsFor(PuzzleStore store) =>
        Props.Create(() => new AchievementRegistryActor(store));

    protected override SupervisorStrategy SupervisorStrategy() =>
        new OneForOneStrategy(3, TimeSpan.FromSeconds(30), _ => Directive.Restart);

    private IActorRef ChildFor(string playerId)
    {
        if (_children.TryGetValue(playerId, out var existing))
        {
            return existing;
        }

        var child = Context.ActorOf(
            AchievementEvaluatorActor.PropsFor(playerId, _store),
            Uri.EscapeDataString(playerId));

        Context.Watch(child);
        _children[playerId] = child;
        return child;
    }
}

public sealed class AchievementRegistry(IActorRef Ref)
{
    public IActorRef Actor { get; } = Ref;
}
