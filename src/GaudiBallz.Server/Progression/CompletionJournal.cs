using Akka.Actor;
using Akka.Persistence;
using Servus.Akka.Local;

namespace GaudiBallz.Server.Progression;

// ---- events (immutable journal facts, no derived scores) --------------------

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
    int? ProfileBall) : IJournalCommand;

public sealed record CompletionJournaled;

// ---- persistent actor -------------------------------------------------------

public sealed class CompletionJournalActor : ReceivePersistentActor
{
    public override string PersistenceId { get; }

    public CompletionJournalActor(string playerId)
    {
        PersistenceId = $"completions-{playerId}";

        Command<JournalCompletion>(cmd =>
        {
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
                DateTime.UtcNow);

            Persist(evt, _ =>
            {
                Sender.Tell(new CompletionJournaled());
            });
        });

        Recover<LevelCompleted>(_ => { });
        Recover<SnapshotOffer>(_ => { });
    }

    public static Props PropsFor(string playerId) =>
        Props.Create(() => new CompletionJournalActor(playerId));
}
