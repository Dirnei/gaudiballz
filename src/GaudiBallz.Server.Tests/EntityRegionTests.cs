using Akka.Actor;
using Akka.TestKit.Xunit;
using GaudiBallz.Server.Progression;
using Servus.Akka.Local;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// The handoff the four hand-rolled registries existed to get right.
///
/// An entity that is stopping has not stopped yet, and a message arriving in that gap must
/// reach its replacement rather than the dead letter office. Nothing observable says when it
/// goes wrong: a completion simply never happened. These tests hold the window open
/// deliberately instead of hoping to land in it.
/// </summary>
public sealed class EntityRegionTests : TestKit
{
    private static readonly string PersistenceConfig = """
        akka.persistence {
            journal.plugin = "akka.persistence.journal.inmem"
            snapshot-store.plugin = "akka.persistence.snapshot-store.inmem"
        }
        """;

    public EntityRegionTests() : base(PersistenceConfig)
    {
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static LocalEntityRegionOptions QuickPassivation => new()
    {
        PassivateIdleEntityAfter = TimeSpan.FromSeconds(1),
        EntityIdStore = new InMemoryEntityIdStore(),
    };

    // ---- a message sent while an entity is stopping is not lost -------------

    [Fact]
    public void A_message_arriving_while_an_entity_passivates_reaches_its_replacement()
    {
        using var release = new ManualResetEventSlim(false);
        var stopping = CreateTestProbe();

        var region = TestRegions.Region(
            Sys,
            _ => Props.Create(() => new LatchedEntityActor(stopping.Ref, release)),
            options: QuickPassivation);

        // Create the entity, then leave it alone so the region's sweep passivates it.
        region.Tell(new Ping("p1", 1));
        ExpectMsg<Pong>(cancellationToken: Token);

        // The entity announces itself from PostStop and then blocks there, so the region is
        // now holding it in the passivating state for as long as the latch is closed.
        stopping.ExpectMsg("stopping", TimeSpan.FromSeconds(10), cancellationToken: Token);

        // This is the message the hand-rolled buffering existed to protect.
        region.Tell(new Ping("p1", 2));

        release.Set();

        var reply = ExpectMsg<Pong>(TimeSpan.FromSeconds(10), cancellationToken: Token);
        Assert.Equal(2, reply.N);
    }

    // ---- an idle entity is stopped and recovers its state on the next message

    [Fact]
    public async Task An_idle_entity_is_passivated_and_recovers_its_state()
    {
        var player = Guid.NewGuid().ToString("N");
        var region = TestRegions.Region(
            Sys, PlayerWalletActor.PropsFor, options: QuickPassivation);

        region.Tell(new CreditPoints(player, 1, PointCategory.BaseScore, 500));
        Assert.Equal(500, ExpectMsg<CreditResult>(cancellationToken: Token).NewBalance);

        // Watch the entity itself, so "it was passivated" is observed rather than assumed.
        var entity = await Sys.ActorSelection(region.Path / player)
            .ResolveOne(TimeSpan.FromSeconds(5), Token);

        Watch(entity);
        ExpectTerminated(entity, TimeSpan.FromSeconds(15), cancellationToken: Token);

        // A fresh entity replays the ledger rather than starting from nothing.
        region.Tell(new GetBalance(player));
        Assert.Equal(500, ExpectMsg<BalanceResult>(
            TimeSpan.FromSeconds(10), cancellationToken: Token).Balance);
    }

    // ---- fixtures -----------------------------------------------------------

    private sealed record Ping(string PlayerId, int N) : IWithEntityId
    {
        public string EntityId => PlayerId;
    }

    private sealed record Pong(int N);

    /// <summary>
    /// Announces that it is stopping and then waits, which holds the region in the
    /// passivating state for as long as the test wants it there.
    /// </summary>
    private sealed class LatchedEntityActor : ReceiveActor
    {
        private readonly IActorRef _stopping;
        private readonly ManualResetEventSlim _release;

        public LatchedEntityActor(IActorRef stopping, ManualResetEventSlim release)
        {
            _stopping = stopping;
            _release = release;

            Receive<Ping>(ping => Sender.Tell(new Pong(ping.N)));
        }

        protected override void PostStop()
        {
            _stopping.Tell("stopping");
            _release.Wait(TimeSpan.FromSeconds(10));
            base.PostStop();
        }
    }
}
