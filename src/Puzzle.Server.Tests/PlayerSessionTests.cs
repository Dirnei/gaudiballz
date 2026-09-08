using Akka.Actor;
using Akka.TestKit.Xunit;
using Puzzle.Server.Persistence;
using Puzzle.Server.Progression;

namespace Puzzle.Server.Tests;

/// <summary>
/// Tests the property the actor exists for: commands for one player are handled one at a
/// time, so a completion cannot be lost to a race.
///
/// Against a real store rather than a fake, because the guarantee is a joint one — the
/// actor serialises, and the update operators make each write safe on its own.
/// </summary>
[Collection(SharedMongo.Name)]
public sealed class PlayerSessionTests : TestKit
{
    private readonly PuzzleStore _store;

    // The actor system stays per test — a fresh one is what keeps the probes clean — while
    // the database behind it is shared, because building that was the expensive half.
    public PlayerSessionTests(MongoFixture mongo)
    {
        _store = mongo.Store;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public void A_completion_is_recorded_and_reflected_in_the_snapshot()
    {
        var registry = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        var player = Guid.NewGuid().ToString("N");

        registry.Tell(new RecordCompletion(player, 4, new LevelResult(19, 1)));

        var snapshot = ExpectMsg<ProgressSnapshot>(cancellationToken: Token);
        Assert.Equal(new LevelResult(19, 1), snapshot.Progress.Levels[4]);
    }

    [Fact]
    public void Commands_are_handled_one_at_a_time_so_nothing_is_lost()
    {
        var registry = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        var player = Guid.NewGuid().ToString("N");

        // Fired without waiting, so they queue in the mailbox rather than arriving in turn.
        for (var i = 0; i < 25; i++)
        {
            registry.Tell(new RecordCompletion(player, 1 + (i % 5), new LevelResult(60 - i, 9 - (i % 9))));
        }

        for (var i = 0; i < 25; i++)
        {
            ExpectMsg<ProgressSnapshot>(TimeSpan.FromSeconds(15), cancellationToken: Token);
        }

        registry.Tell(new LoadProgress(player));
        var final = ExpectMsg<ProgressSnapshot>(TimeSpan.FromSeconds(15), cancellationToken: Token);

        Assert.Equal(5, final.Progress.LevelsCompleted);

        // Level 1 was submitted at i = 0, 5, 10, 15, 20; the best of those must survive.
        Assert.Equal(40, final.Progress.Levels[1].Moves);
    }

    [Fact]
    public void Progress_is_reloaded_after_the_actor_stops()
    {
        var player = Guid.NewGuid().ToString("N");

        var first = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        first.Tell(new RecordCompletion(player, 9, new LevelResult(27, 0)));
        ExpectMsg<ProgressSnapshot>(cancellationToken: Token);
        Sys.Stop(first);

        // A completely fresh registry, as though the process had restarted.
        var second = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        second.Tell(new LoadProgress(player));

        var snapshot = ExpectMsg<ProgressSnapshot>(TimeSpan.FromSeconds(15), cancellationToken: Token);
        Assert.Equal(new LevelResult(27, 0), snapshot.Progress.Levels[9]);
    }

    [Fact]
    public void Merging_a_device_keeps_both_sides()
    {
        var registry = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        var player = Guid.NewGuid().ToString("N");

        registry.Tell(new RecordCompletion(player, 1, new LevelResult(12, 0)));
        ExpectMsg<ProgressSnapshot>(cancellationToken: Token);

        var device = PlayerProgress.Empty
            .With(1, new LevelResult(20, 3))
            .With(2, new LevelResult(30, 1));

        registry.Tell(new MergeDeviceProgress(player, device));
        var snapshot = ExpectMsg<ProgressSnapshot>(TimeSpan.FromSeconds(15), cancellationToken: Token);

        Assert.Equal(2, snapshot.Progress.LevelsCompleted);
        Assert.Equal(new LevelResult(12, 0), snapshot.Progress.Levels[1]);
        Assert.Equal(new LevelResult(30, 1), snapshot.Progress.Levels[2]);
    }

    [Fact]
    public void Two_players_do_not_interfere()
    {
        var registry = Sys.ActorOf(PlayerRegistryActor.PropsFor(_store));
        var a = Guid.NewGuid().ToString("N");
        var b = Guid.NewGuid().ToString("N");

        registry.Tell(new RecordCompletion(a, 1, new LevelResult(10, 0)));
        ExpectMsg<ProgressSnapshot>(cancellationToken: Token);
        registry.Tell(new RecordCompletion(b, 2, new LevelResult(20, 0)));
        ExpectMsg<ProgressSnapshot>(cancellationToken: Token);

        registry.Tell(new LoadProgress(a));
        var snapshot = ExpectMsg<ProgressSnapshot>(cancellationToken: Token);

        Assert.Equal(1, snapshot.Progress.LevelsCompleted);
        Assert.True(snapshot.Progress.Levels.ContainsKey(1));
    }
}
