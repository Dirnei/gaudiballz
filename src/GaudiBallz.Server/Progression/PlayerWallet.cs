using Akka.Actor;
using Akka.Persistence;

namespace GaudiBallz.Server.Progression;

// ---- event types (immutable journal entries) --------------------------------

public enum PointCategory
{
    BaseScore,
    FirstClearBonus,
    NoHintBonus,
    StreakBonus,
    ReplayBonus,
    TimeBeatBonus,
    Migration,
}

public sealed record PointsCredited(
    PointCategory Category,
    int? Level,
    int Amount,
    DateTime Timestamp);

public sealed record PointsAdjusted(
    PointCategory Category,
    int Level,
    int OldAmount,
    int NewAmount,
    DateTime Timestamp);

// ---- commands and queries ---------------------------------------------------

public interface IWalletCommand
{
    public string PlayerId { get; }
}

public sealed record CreditPoints(
    string PlayerId,
    int Level,
    PointCategory Category,
    int Amount) : IWalletCommand;

public sealed record GetBalance(string PlayerId) : IWalletCommand;

public sealed record CreditResult(int NewBalance);

public sealed record BalanceResult(int Balance);

// ---- actor state ------------------------------------------------------------

public sealed record WalletState(int Balance, Dictionary<int, int> LevelBaseCredits)
{
    public static WalletState Empty => new(0, new Dictionary<int, int>());

    public WalletState Apply(PointsCredited evt) =>
        this with
        {
            Balance = Balance + evt.Amount,
            LevelBaseCredits = evt.Category == PointCategory.BaseScore && evt.Level is int level
                ? new Dictionary<int, int>(LevelBaseCredits) { [level] = evt.Amount }
                : LevelBaseCredits,
        };

    public WalletState Apply(PointsAdjusted evt) =>
        this with { Balance = Balance - evt.OldAmount };
}

public sealed record WalletSnapshot(int Balance, Dictionary<int, int> LevelBaseCredits);

// ---- persistent actor -------------------------------------------------------

public sealed class PlayerWalletActor : ReceivePersistentActor
{
    private const int SnapshotInterval = 100;
    private static readonly TimeSpan IdleBeforePassivation = TimeSpan.FromMinutes(10);

    public override string PersistenceId { get; }

    private WalletState _state = WalletState.Empty;
    private long _eventsSinceSnapshot;

    public PlayerWalletActor(string playerId)
    {
        PersistenceId = $"wallet-{playerId}";

        Command<CreditPoints>(HandleCredit);
        Command<GetBalance>(_ => Sender.Tell(new BalanceResult(_state.Balance)));

        Recover<PointsCredited>(evt => _state = _state.Apply(evt));
        Recover<PointsAdjusted>(evt => _state = _state.Apply(evt));
        Recover<SnapshotOffer>(offer =>
        {
            if (offer.Snapshot is WalletSnapshot snap)
            {
                _state = new WalletState(snap.Balance, new Dictionary<int, int>(snap.LevelBaseCredits));
            }
        });

        SetReceiveTimeout(IdleBeforePassivation);
        Command<ReceiveTimeout>(_ =>
            Context.Parent.Tell(new WalletPassivate(playerId)));
    }

    private void HandleCredit(CreditPoints cmd)
    {
        if (cmd.Category == PointCategory.BaseScore)
        {
            if (_state.LevelBaseCredits.TryGetValue(cmd.Level, out var existing))
            {
                if (cmd.Amount <= existing)
                {
                    Sender.Tell(new CreditResult(_state.Balance));
                    return;
                }

                var adjustment = new PointsAdjusted(
                    PointCategory.BaseScore, cmd.Level, existing, cmd.Amount, DateTime.UtcNow);
                var credit = new PointsCredited(
                    PointCategory.BaseScore, cmd.Level, cmd.Amount, DateTime.UtcNow);

                PersistAll(new object[] { adjustment, credit }, evt =>
                {
                    switch (evt)
                    {
                        case PointsAdjusted adj:
                            _state = _state.Apply(adj);
                            break;
                        case PointsCredited cr:
                            _state = _state.Apply(cr);
                            break;
                    }

                    _eventsSinceSnapshot++;
                    if (LastSequenceNr > 0 && _eventsSinceSnapshot >= SnapshotInterval)
                    {
                        SaveSnapshot(new WalletSnapshot(_state.Balance, new Dictionary<int, int>(_state.LevelBaseCredits)));
                        _eventsSinceSnapshot = 0;
                    }

                    if (evt is PointsCredited)
                    {
                        Sender.Tell(new CreditResult(_state.Balance));
                    }
                });
                return;
            }
        }

        var creditEvt = new PointsCredited(cmd.Category, cmd.Level, cmd.Amount, DateTime.UtcNow);
        Persist(creditEvt, e =>
        {
            _state = _state.Apply(e);
            _eventsSinceSnapshot++;
            if (LastSequenceNr > 0 && _eventsSinceSnapshot >= SnapshotInterval)
            {
                SaveSnapshot(new WalletSnapshot(_state.Balance, new Dictionary<int, int>(_state.LevelBaseCredits)));
                _eventsSinceSnapshot = 0;
            }

            Sender.Tell(new CreditResult(_state.Balance));
        });
    }

    public static Props PropsFor(string playerId) =>
        Props.Create(() => new PlayerWalletActor(playerId));
}

internal sealed record WalletPassivate(string PlayerId);

// ---- registry ---------------------------------------------------------------

public sealed class WalletRegistry(IActorRef Ref)
{
    public IActorRef Actor { get; } = Ref;
}

public sealed class WalletRegistryActor : ReceiveActor
{
    private readonly Dictionary<string, IActorRef> _children = [];
    private readonly Dictionary<string, List<(object Message, IActorRef Sender)>> _passivating = [];

    public WalletRegistryActor()
    {
        Receive<IWalletCommand>(command =>
        {
            if (_passivating.TryGetValue(command.PlayerId, out var buffered))
            {
                buffered.Add((command, Sender));
                return;
            }

            ChildFor(command.PlayerId).Forward(command);
        });

        Receive<WalletPassivate>(passivate =>
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
        Props.Create(() => new WalletRegistryActor());

    protected override SupervisorStrategy SupervisorStrategy() =>
        new OneForOneStrategy(3, TimeSpan.FromSeconds(30), _ => Directive.Restart);

    private IActorRef ChildFor(string playerId)
    {
        if (_children.TryGetValue(playerId, out var existing))
        {
            return existing;
        }

        var child = Context.ActorOf(
            PlayerWalletActor.PropsFor(playerId),
            Uri.EscapeDataString(playerId));

        Context.Watch(child);
        _children[playerId] = child;
        return child;
    }
}
