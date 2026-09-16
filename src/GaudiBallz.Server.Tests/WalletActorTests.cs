using Akka.Actor;
using Akka.Persistence;
using Akka.TestKit.Xunit;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

public sealed class WalletActorTests : TestKit
{
    private static readonly string PersistenceConfig = """
        akka.persistence {
            journal.plugin = "akka.persistence.journal.inmem"
            snapshot-store.plugin = "akka.persistence.snapshot-store.inmem"
        }
        """;

    public WalletActorTests() : base(PersistenceConfig)
    {
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private IActorRef CreateWallet(string? playerId = null) =>
        Sys.ActorOf(PlayerWalletActor.PropsFor(playerId ?? Guid.NewGuid().ToString("N")));

    [Fact]
    public void Base_score_credit_updates_balance()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));

        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(500, result.NewBalance);
    }

    [Fact]
    public void Bonus_credit_updates_balance()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.FirstClearBonus, 75));

        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(575, result.NewBalance);
    }

    [Fact]
    public void Duplicate_base_score_with_lower_amount_is_a_no_op()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 250));

        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(500, result.NewBalance);
    }

    [Fact]
    public void Improved_base_score_produces_adjustment_and_credit()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 250));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));

        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(500, result.NewBalance);
    }

    [Fact]
    public void GetBalance_returns_current_balance()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.NoHintBonus, 50));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new GetBalance("p1"));

        var result = ExpectMsg<BalanceResult>(cancellationToken: Token);
        Assert.Equal(550, result.Balance);
    }

    [Fact]
    public void Recovery_from_journal_restores_state()
    {
        var playerId = Guid.NewGuid().ToString("N");
        var wallet = Sys.ActorOf(PlayerWalletActor.PropsFor(playerId), "wallet-first");

        wallet.Tell(new CreditPoints(playerId, 1, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints(playerId, 1, PointCategory.FirstClearBonus, 75));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        Watch(wallet);
        Sys.Stop(wallet);
        ExpectTerminated(wallet, cancellationToken: Token);

        var recovered = Sys.ActorOf(PlayerWalletActor.PropsFor(playerId), "wallet-second");

        recovered.Tell(new GetBalance(playerId));
        var result = ExpectMsg<BalanceResult>(cancellationToken: Token);
        Assert.Equal(575, result.Balance);
    }

    [Fact]
    public void Sequential_credits_for_base_score_and_bonuses_accumulate()
    {
        var wallet = CreateWallet();
        var pid = "p1";

        wallet.Tell(new CreditPoints(pid, 5, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints(pid, 5, PointCategory.FirstClearBonus, 75));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints(pid, 5, PointCategory.NoHintBonus, 50));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints(pid, 5, PointCategory.StreakBonus, 25));
        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(650, result.NewBalance);
    }

    [Fact]
    public void Replay_without_star_improvement_does_not_change_base_score()
    {
        var wallet = CreateWallet();
        var pid = "p1";

        wallet.Tell(new CreditPoints(pid, 3, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        // Replay earns 1 star (100 XP) — lower than existing 500
        wallet.Tell(new CreditPoints(pid, 3, PointCategory.BaseScore, 100));
        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(500, result.NewBalance);
    }

    [Fact]
    public void WalletState_accumulates_base_score_and_migration_credits()
    {
        var state = WalletState.Empty;

        state = state.Apply(new PointsCredited(PointCategory.BaseScore, 1, 500, DateTime.UtcNow));
        state = state.Apply(new PointsCredited(PointCategory.BaseScore, 2, 250, DateTime.UtcNow));
        state = state.Apply(new PointsCredited(PointCategory.Migration, 1, 125, DateTime.UtcNow));
        state = state.Apply(new PointsCredited(PointCategory.Migration, 2, 50, DateTime.UtcNow));

        Assert.Equal(925, state.Balance);
        Assert.Equal(500, state.LevelBaseCredits[1]);
        Assert.Equal(250, state.LevelBaseCredits[2]);
    }

    [Fact]
    public void Equal_base_score_is_also_a_no_op()
    {
        var wallet = CreateWallet();

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));
        ExpectMsg<CreditResult>(cancellationToken: Token);

        wallet.Tell(new CreditPoints("p1", 1, PointCategory.BaseScore, 500));
        var result = ExpectMsg<CreditResult>(cancellationToken: Token);
        Assert.Equal(500, result.NewBalance);
    }
}
