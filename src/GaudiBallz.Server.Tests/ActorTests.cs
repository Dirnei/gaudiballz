using Akka.Actor;
using Akka.TestKit.Xunit;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Confirms the Akka TestKit is wired and that an actor system can start, send and
/// receive under the runner. This is the check behind the xUnit v3 decision: the v3
/// TestKit ships as Akka.TestKit.Xunit (unsuffixed), and Akka.Hosting.TestKit depends on
/// it, so a v2 pairing puts two FactAttributes in scope and nothing compiles.
/// </summary>
public sealed class HarnessSmokeTests : TestKit
{
    [Fact]
    public void Actor_system_starts_and_round_trips_a_message()
    {
        var echo = Sys.ActorOf(Props.Create(() => new EchoActor()), "echo");

        echo.Tell("ping");

        ExpectMsg("ping", cancellationToken: TestContext.Current.CancellationToken);
    }

    [Fact]
    public void TestProbe_observes_a_forwarded_message()
    {
        var probe = CreateTestProbe();
        var forwarder = Sys.ActorOf(Props.Create(() => new ForwardingActor(probe.Ref)), "forwarder");

        forwarder.Tell("payload");

        probe.ExpectMsg("payload", cancellationToken: TestContext.Current.CancellationToken);
    }

    private sealed class EchoActor : ReceiveActor
    {
        public EchoActor()
        {
            ReceiveAny(message => Sender.Tell(message));
        }
    }

    private sealed class ForwardingActor : ReceiveActor
    {
        public ForwardingActor(IActorRef target)
        {
            ReceiveAny(target.Forward);
        }
    }
}
