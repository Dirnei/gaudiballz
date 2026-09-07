using Akka.Actor;
using Puzzle.Server.Persistence;

namespace Puzzle.Server.Progression;

/// <summary>Everything addressed to one player carries their id, so it can be routed.</summary>
public interface IPlayerCommand
{
    public string PlayerId { get; }
}

public sealed record RecordCompletion(string PlayerId, int Level, LevelResult Result) : IPlayerCommand;

public sealed record LoadProgress(string PlayerId) : IPlayerCommand;

public sealed record MergeDeviceProgress(string PlayerId, PlayerProgress Incoming) : IPlayerCommand;

public sealed record ProgressSnapshot(PlayerProgress Progress);

internal sealed record Passivate(string PlayerId);

/// <summary>
/// One actor per player, and the reason Akka is in this project.
///
/// Merging and recording both read the current best and write a better one. Doing that from
/// several requests at once is a read-modify-write race, and the usual answers — a
/// distributed lock, or optimistic concurrency with a retry loop — are considerably more
/// machinery than a mailbox. Handling one command at a time per player removes the race
/// rather than detecting it.
///
/// The actor holds no authoritative state: progress is loaded from MongoDB and every write
/// goes straight back. A supervisor restart therefore loses nothing, which is what makes
/// restarting a safe response to any failure here.
/// </summary>
public sealed class PlayerSessionActor : ReceiveActor, IWithStash
{
    private static readonly TimeSpan IdleBeforePassivation = TimeSpan.FromMinutes(10);

    private readonly string _playerId;
    private readonly PuzzleStore _store;
    private PlayerProgress _progress = PlayerProgress.Empty;

    public IStash Stash { get; set; } = null!;

    public PlayerSessionActor(string playerId, PuzzleStore store)
    {
        _playerId = playerId;
        _store = store;

        Become(Loading);
    }

    public static Props PropsFor(string playerId, PuzzleStore store) =>
        Props.Create(() => new PlayerSessionActor(playerId, store));

    protected override void PreStart()
    {
        // Commands arriving before the load finishes are stashed, not dropped.
        _store.LoadProgressAsync(_playerId)
            .PipeTo(Self, success: p => new ProgressSnapshot(p), failure: ex => new Status.Failure(ex));
    }

    private void Loading()
    {
        Receive<ProgressSnapshot>(snapshot =>
        {
            _progress = snapshot.Progress;
            Become(Ready);
            Stash.UnstashAll();
            Context.SetReceiveTimeout(IdleBeforePassivation);
        });

        Receive<Status.Failure>(failure =>
            // Let the supervisor restart us; PreStart will load again. Nothing is lost
            // because nothing authoritative lives here.
            throw new PlayerSessionLoadException(_playerId, failure.Cause));

        ReceiveAny(_ => Stash.Stash());
    }

    private void Ready()
    {
        Receive<LoadProgress>(_ => Sender.Tell(new ProgressSnapshot(_progress)));

        Receive<RecordCompletion>(command =>
        {
            var sender = Sender;
            _progress = _progress.With(command.Level, command.Result);

            _store.RecordCompletionAsync(command.PlayerId, command.Level, command.Result)
                .PipeTo(sender, Self,
                    success: () => new ProgressSnapshot(_progress),
                    failure: ex => new Status.Failure(ex));
        });

        Receive<MergeDeviceProgress>(command =>
        {
            var sender = Sender;
            _progress = _progress.MergedWith(command.Incoming);

            _store.MergeProgressAsync(command.PlayerId, command.Incoming)
                .PipeTo(sender, Self,
                    success: () => new ProgressSnapshot(_progress),
                    failure: ex => new Status.Failure(ex));
        });

        Receive<ReceiveTimeout>(_ => Context.Parent.Tell(new Passivate(_playerId)));
    }
}

public sealed class PlayerSessionLoadException(string playerId, Exception cause)
    : Exception($"Could not load progress for player {playerId}.", cause);

/// <summary>
/// Routes commands to the actor for their player, creating it on demand and stopping it
/// when idle.
///
/// A hand-rolled miniature of cluster sharding's passivation protocol. Messages arriving
/// while a child is stopping are buffered and delivered to its replacement rather than
/// dropped, which is the part that is easy to get wrong and impossible to notice until a
/// completion goes missing.
/// </summary>
public sealed class PlayerRegistryActor : ReceiveActor
{
    private readonly PuzzleStore _store;
    private readonly Dictionary<string, IActorRef> _children = [];
    private readonly Dictionary<string, List<(object Message, IActorRef Sender)>> _passivating = [];

    public PlayerRegistryActor(PuzzleStore store)
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

        Receive<Passivate>(passivate =>
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
        Props.Create(() => new PlayerRegistryActor(store));

    protected override SupervisorStrategy SupervisorStrategy() =>
        // Restarting reloads from the database, and nothing authoritative lives in the
        // actor, so restart is always a safe answer to a failure here.
        new OneForOneStrategy(3, TimeSpan.FromSeconds(30), _ => Directive.Restart);

    private IActorRef ChildFor(string playerId)
    {
        if (_children.TryGetValue(playerId, out var existing))
        {
            return existing;
        }

        var child = Context.ActorOf(
            PlayerSessionActor.PropsFor(playerId, _store),
            Uri.EscapeDataString(playerId));

        Context.Watch(child);
        _children[playerId] = child;
        return child;
    }
}
