using Akka.Actor;
using Akka.Persistence;
using Servus.Akka.Local;

namespace GaudiBallz.Server.Progression;

// ---- events (immutable journal facts, no derived scores) --------------------

/// <summary>
/// How an attempt at a level ended. Every attempt ends exactly once, and only a completion
/// counts as a win — see the attempt-outcomes capability.
/// </summary>
public enum AttemptOutcome
{
    Completed,
    Restarted,
    Abandoned,
}

/// <remarks>
/// <c>AttemptId</c> trails the record with a default because events written before attempts
/// were tracked carry no id. They deserialise with a null one and count as a completed
/// attempt that cannot be de-duplicated, which is correct: they were each written once.
/// </remarks>
public sealed record LevelCompleted(
    string PlayerId,
    string? Username,
    int Level,
    int Moves,
    int Hints,
    int Undos,
    bool Restarted,
    int? ElapsedTimeMs,
    int? ProfileBall,
    DateTime Timestamp,
    string? AttemptId = null);

public sealed record AttemptRestarted(
    string PlayerId,
    int Level,
    string AttemptId,
    DateTime Timestamp);

public sealed record AttemptAbandoned(
    string PlayerId,
    int Level,
    string AttemptId,
    DateTime Timestamp);

// ---- commands ---------------------------------------------------------------

public interface IJournalCommand : IWithEntityId
{
    public string PlayerId { get; }

    string IWithEntityId.EntityId => PlayerId;
}

public sealed record JournalCompletion(
    string PlayerId,
    string? Username,
    int Level,
    int Moves,
    int Hints,
    int Undos,
    bool Restarted,
    int? ElapsedTimeMs,
    int? ProfileBall,
    string? AttemptId = null) : IJournalCommand;

/// <summary>Reports an attempt that ended without a completion.</summary>
public sealed record EndAttempt(
    string PlayerId,
    int Level,
    string AttemptId,
    AttemptOutcome Outcome) : IJournalCommand;

public sealed record GetAttemptCounts(string PlayerId) : IJournalCommand;

public sealed record CompletionJournaled;

public sealed record AttemptEnded(int Attempts, int Completions);

public sealed record AttemptCounts(int Attempts, int Completions);

// ---- actor state ------------------------------------------------------------

/// <summary>
/// The running tally, plus enough recent attempt ids to recognise a repeat.
///
/// A departure can be reported twice — the confirmation the player gave and the beacon the
/// closing tab fired — so an ending has to be idempotent. The ids are kept in a bounded
/// window rather than forever: duplicates arrive within seconds of each other, and holding
/// every id a player ever produced would grow without limit for no further protection.
/// </summary>
public sealed record JournalState(int Attempts, int Completions, IReadOnlyList<string> RecentAttemptIds)
{
    private const int RememberedAttempts = 256;

    public static JournalState Empty => new(0, 0, []);

    public bool AlreadyEnded(string? attemptId) =>
        attemptId is not null && RecentAttemptIds.Contains(attemptId);

    public JournalState Ended(string? attemptId, bool completed)
    {
        var remembered = attemptId is null
            ? RecentAttemptIds
            : RecentAttemptIds.Append(attemptId).TakeLast(RememberedAttempts).ToArray();

        return new JournalState(Attempts + 1, Completions + (completed ? 1 : 0), remembered);
    }
}

public sealed record JournalSnapshot(int Attempts, int Completions, string[] RecentAttemptIds);

// ---- persistent actor -------------------------------------------------------

public sealed class CompletionJournalActor : ReceivePersistentActor
{
    private const int SnapshotInterval = 100;

    /// <remarks>
    /// Unchanged deliberately. The actor now records how attempts end rather than only that
    /// they were completed, which makes the name a little narrow, but renaming the id would
    /// orphan every journal already written.
    /// </remarks>
    public override string PersistenceId { get; }

    private JournalState _state = JournalState.Empty;
    private long _eventsSinceSnapshot;

    public CompletionJournalActor(string playerId)
    {
        PersistenceId = $"completions-{playerId}";

        Command<JournalCompletion>(HandleCompletion);
        Command<EndAttempt>(HandleEndAttempt);
        Command<GetAttemptCounts>(_ =>
            Sender.Tell(new AttemptCounts(_state.Attempts, _state.Completions)));

        Recover<LevelCompleted>(evt => _state = _state.Ended(evt.AttemptId, completed: true));
        Recover<AttemptRestarted>(evt => _state = _state.Ended(evt.AttemptId, completed: false));
        Recover<AttemptAbandoned>(evt => _state = _state.Ended(evt.AttemptId, completed: false));
        Recover<SnapshotOffer>(offer =>
        {
            if (offer.Snapshot is JournalSnapshot snap)
            {
                _state = new JournalState(snap.Attempts, snap.Completions, snap.RecentAttemptIds);
            }
        });
    }

    private void HandleCompletion(JournalCompletion cmd)
    {
        if (_state.AlreadyEnded(cmd.AttemptId))
        {
            Sender.Tell(new CompletionJournaled());
            return;
        }

        var evt = new LevelCompleted(
            cmd.PlayerId,
            cmd.Username,
            cmd.Level,
            cmd.Moves,
            cmd.Hints,
            cmd.Undos,
            cmd.Restarted,
            cmd.ElapsedTimeMs,
            cmd.ProfileBall,
            DateTime.UtcNow,
            cmd.AttemptId);

        Persist(evt, e =>
        {
            _state = _state.Ended(e.AttemptId, completed: true);
            MaybeSnapshot();
            Sender.Tell(new CompletionJournaled());
        });
    }

    private void HandleEndAttempt(EndAttempt cmd)
    {
        if (cmd.Outcome == AttemptOutcome.Completed || _state.AlreadyEnded(cmd.AttemptId))
        {
            // A completion arrives through JournalCompletion, which carries the facts about
            // the attempt. Reporting one here would record an ending with none of them.
            Sender.Tell(new AttemptEnded(_state.Attempts, _state.Completions));
            return;
        }

        object evt = cmd.Outcome == AttemptOutcome.Restarted
            ? new AttemptRestarted(cmd.PlayerId, cmd.Level, cmd.AttemptId, DateTime.UtcNow)
            : new AttemptAbandoned(cmd.PlayerId, cmd.Level, cmd.AttemptId, DateTime.UtcNow);

        Persist(evt, _ =>
        {
            _state = _state.Ended(cmd.AttemptId, completed: false);
            MaybeSnapshot();
            Sender.Tell(new AttemptEnded(_state.Attempts, _state.Completions));
        });
    }

    private void MaybeSnapshot()
    {
        _eventsSinceSnapshot++;
        if (LastSequenceNr > 0 && _eventsSinceSnapshot >= SnapshotInterval)
        {
            SaveSnapshot(new JournalSnapshot(
                _state.Attempts, _state.Completions, _state.RecentAttemptIds.ToArray()));
            _eventsSinceSnapshot = 0;
        }
    }

    public static Props PropsFor(string playerId) =>
        Props.Create(() => new CompletionJournalActor(playerId));
}
