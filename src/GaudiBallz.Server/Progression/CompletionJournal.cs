using Akka.Actor;
using Akka.Persistence;

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

public interface IJournalCommand
{
    public string PlayerId { get; }
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
    private static readonly TimeSpan IdleBeforePassivation = TimeSpan.FromMinutes(10);

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

        SetReceiveTimeout(IdleBeforePassivation);
        Command<ReceiveTimeout>(_ =>
            Context.Parent.Tell(new JournalPassivate(playerId)));
    }

    public static Props PropsFor(string playerId) =>
        Props.Create(() => new CompletionJournalActor(playerId));
}

internal sealed record JournalPassivate(string PlayerId);

// ---- registry ---------------------------------------------------------------

public sealed class CompletionJournalRegistry(IActorRef Ref)
{
    public IActorRef Actor { get; } = Ref;
}

public sealed class CompletionJournalRegistryActor : ReceiveActor
{
    private readonly Dictionary<string, IActorRef> _children = [];
    private readonly Dictionary<string, List<(object Message, IActorRef Sender)>> _passivating = [];

    public CompletionJournalRegistryActor()
    {
        Receive<IJournalCommand>(command =>
        {
            if (_passivating.TryGetValue(command.PlayerId, out var buffered))
            {
                buffered.Add((command, Sender));
                return;
            }

            ChildFor(command.PlayerId).Forward(command);
        });

        Receive<JournalPassivate>(passivate =>
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

    public static Props PropsFor() =>
        Props.Create(() => new CompletionJournalRegistryActor());

    protected override SupervisorStrategy SupervisorStrategy() =>
        new OneForOneStrategy(3, TimeSpan.FromSeconds(30), _ => Directive.Restart);

    private IActorRef ChildFor(string playerId)
    {
        if (_children.TryGetValue(playerId, out var existing))
        {
            return existing;
        }

        var child = Context.ActorOf(
            CompletionJournalActor.PropsFor(playerId),
            Uri.EscapeDataString(playerId));

        Context.Watch(child);
        _children[playerId] = child;
        return child;
    }
}
