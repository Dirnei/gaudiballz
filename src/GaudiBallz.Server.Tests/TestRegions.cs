using Akka.Actor;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;
using Servus.Akka.Local;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// The same local entity regions the host wires, for tests that drive one directly.
///
/// Tests go through a region rather than straight to an entity on purpose: routing,
/// creation on demand and passivation are the region's job, and a test that addressed an
/// entity by hand would prove nothing about the path production traffic actually takes.
/// </summary>
internal static class TestRegions
{
    public static IActorRef Player(ActorSystem system, PuzzleStore store, string? name = null) =>
        Region(system, id => PlayerSessionActor.PropsFor(id, store), name);

    public static IActorRef Achievements(ActorSystem system, PuzzleStore store, string? name = null) =>
        Region(system, id => AchievementEvaluatorActor.PropsFor(id, store), name);

    public static IActorRef Wallet(ActorSystem system, string? name = null) =>
        Region(system, PlayerWalletActor.PropsFor, name);

    public static IActorRef Region(
        ActorSystem system,
        Func<string, Props> entityProps,
        string? name = null,
        LocalEntityRegionOptions? options = null) =>
        system.ActorOf(
            Props.Create(() => new LocalEntityRegionActor(
                entityProps, new EntityIdExtractor(), options ?? EntityRegions.Options())),
            name);
}
