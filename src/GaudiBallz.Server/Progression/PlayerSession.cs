using Akka.Actor;
using GaudiBallz.Server.Persistence;
using Servus.Akka.Local;

namespace GaudiBallz.Server.Progression;

/// <summary>Everything addressed to one player carries their id, so it can be routed.</summary>
public interface IPlayerCommand : IWithEntityId
{
    public string PlayerId { get; }

    /// <summary>The entity region routes on this; for every player command it is the player.</summary>
    string IWithEntityId.EntityId => PlayerId;
}

public sealed record RecordCompletion(string PlayerId, int Level, LevelResult Result) : IPlayerCommand;

public sealed record LoadProgress(string PlayerId) : IPlayerCommand;

public sealed record MergeDeviceProgress(string PlayerId, PlayerProgress Incoming) : IPlayerCommand;

public sealed record ProgressSnapshot(PlayerProgress Progress);

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
    }
}

public sealed class PlayerSessionLoadException(string playerId, Exception cause)
    : Exception($"Could not load progress for player {playerId}.", cause);
