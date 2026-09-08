using Akka.Actor;
using Akka.TestKit.Xunit;
using Puzzle.Server.Achievements;
using Puzzle.Server.Persistence;
using Puzzle.Server.Progression;

namespace Puzzle.Server.Tests;

[Collection(SharedMongo.Name)]
public sealed class AchievementActorTests : TestKit
{
    private readonly PuzzleStore _store;

    public AchievementActorTests(MongoFixture mongo)
    {
        _store = mongo.Store;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static AttemptMetadata DefaultMetadata =>
        new(UndoCount: 0, Restarted: false, SessionId: null, ColourCount: 4, ParMoves: 15);

    private async Task<string> RegisteredPlayerWithCompletions(int levels)
    {
        var playerId = Guid.NewGuid().ToString("N");
        await _store.CreateAnonymousPlayerAsync(playerId, Token);
        await _store.MarkEnrolledAsync(playerId, Token);

        for (var i = 1; i <= levels; i++)
        {
            await _store.RecordCompletionAsync(playerId, i, new LevelResult(10, 0), Token);
        }

        return playerId;
    }

    [Fact]
    public async Task Completion_event_awards_milestone_achievements()
    {
        var playerId = await RegisteredPlayerWithCompletions(10);

        var registry = Sys.ActorOf(AchievementRegistryActor.PropsFor(_store));

        registry.Tell(new CompletionEvent(
            playerId, 10, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: false));

        var result = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        var ids = result.NewAwards.Select(a => a.Id).ToList();
        Assert.Contains("milestone-1", ids);
        Assert.Contains("milestone-5", ids);
        Assert.Contains("milestone-10", ids);
        Assert.DoesNotContain("milestone-25", ids);
    }

    [Fact]
    public async Task Duplicate_completion_does_not_re_award()
    {
        var playerId = await RegisteredPlayerWithCompletions(5);

        var registry = Sys.ActorOf(AchievementRegistryActor.PropsFor(_store));

        registry.Tell(new CompletionEvent(
            playerId, 5, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: false));
        var first = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        Assert.True(first.NewAwards.Count > 0);

        registry.Tell(new CompletionEvent(
            playerId, 5, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: false));
        var second = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        Assert.Empty(second.NewAwards);
    }

    [Fact]
    public async Task Anonymous_player_gets_empty_result()
    {
        var playerId = Guid.NewGuid().ToString("N");

        var registry = Sys.ActorOf(AchievementRegistryActor.PropsFor(_store));

        registry.Tell(new CompletionEvent(
            playerId, 1, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: true));

        var result = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        Assert.Empty(result.NewAwards);
    }

    [Fact]
    public async Task Retroactive_evaluation_awards_accumulated_milestones()
    {
        var playerId = await RegisteredPlayerWithCompletions(12);

        var registry = Sys.ActorOf(AchievementRegistryActor.PropsFor(_store));

        registry.Tell(new EvaluateRetroactive(playerId));

        // EvaluateRetroactive is fire-and-forget; give it time to write.
        await Task.Delay(3000, Token);

        var awards = await _store.LoadAchievementsAsync(playerId, Token);
        var ids = awards.Select(a => a.AchievementId).ToHashSet();

        Assert.Contains("milestone-1", ids);
        Assert.Contains("milestone-5", ids);
        Assert.Contains("milestone-10", ids);
        Assert.DoesNotContain("milestone-25", ids);
    }

    [Fact]
    public async Task Registry_routes_to_correct_child()
    {
        var playerA = await RegisteredPlayerWithCompletions(3);
        var playerB = await RegisteredPlayerWithCompletions(7);

        var registry = Sys.ActorOf(AchievementRegistryActor.PropsFor(_store));

        registry.Tell(new CompletionEvent(
            playerA, 3, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: false));
        var resultA = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        registry.Tell(new CompletionEvent(
            playerB, 7, new LevelResult(10, 0), DefaultMetadata, IsAnonymous: false));
        var resultB = ExpectMsg<AchievementResult>(TimeSpan.FromSeconds(15),
            cancellationToken: Token);

        var idsA = resultA.NewAwards.Select(a => a.Id).ToHashSet();
        var idsB = resultB.NewAwards.Select(a => a.Id).ToHashSet();

        Assert.DoesNotContain("milestone-5", idsA);
        Assert.Contains("milestone-5", idsB);
    }
}
