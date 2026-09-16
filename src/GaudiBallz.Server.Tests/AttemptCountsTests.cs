using Akka.Actor;
using Akka.TestKit.Xunit;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// The tally behind win rate.
///
/// The counts have to survive two things the API cannot: a departure reported twice, once by
/// the player confirming it and once by the closing tab's beacon, and a restart that ends one
/// attempt while beginning another.
/// </summary>
public sealed class AttemptCountsTests : TestKit
{
    private static readonly string PersistenceConfig = """
        akka.persistence {
            journal.plugin = "akka.persistence.journal.inmem"
            snapshot-store.plugin = "akka.persistence.snapshot-store.inmem"
        }
        """;

    public AttemptCountsTests() : base(PersistenceConfig)
    {
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private IActorRef Journal(string playerId, string? name = null) =>
        Sys.ActorOf(CompletionJournalActor.PropsFor(playerId), name);

    private static JournalCompletion Completion(string playerId, int level, string attemptId) =>
        new(playerId, "player", level, 20, 0, 0, false, 30_000, null, attemptId);

    private AttemptCounts CountsOf(IActorRef journal, string playerId)
    {
        journal.Tell(new GetAttemptCounts(playerId));
        return ExpectMsg<AttemptCounts>(cancellationToken: Token);
    }

    [Fact]
    public void A_completion_counts_as_a_won_attempt()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        journal.Tell(Completion(player, 1, "a1"));
        ExpectMsg<CompletionJournaled>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(1, counts.Attempts);
        Assert.Equal(1, counts.Completions);
    }

    [Fact]
    public void A_restart_counts_as_a_lost_attempt()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Restarted));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(1, counts.Attempts);
        Assert.Equal(0, counts.Completions);
    }

    [Fact]
    public void Restarting_then_clearing_is_one_loss_and_one_win()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Restarted));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        journal.Tell(Completion(player, 1, "a2"));
        ExpectMsg<CompletionJournaled>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(2, counts.Attempts);
        Assert.Equal(1, counts.Completions);
    }

    [Fact]
    public void Abandoning_counts_as_a_lost_attempt()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        journal.Tell(new EndAttempt(player, 3, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(1, counts.Attempts);
        Assert.Equal(0, counts.Completions);
    }

    [Fact]
    public void An_ending_reported_twice_is_counted_once()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        // The confirmation and the unload beacon both report the same departure.
        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);
        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(1, counts.Attempts);
    }

    [Fact]
    public void A_completion_does_not_also_count_as_an_abandonment()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player);

        journal.Tell(Completion(player, 1, "a1"));
        ExpectMsg<CompletionJournaled>(cancellationToken: Token);

        // Leaving the level after finishing it must not charge a loss for the same attempt.
        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        var counts = CountsOf(journal, player);
        Assert.Equal(1, counts.Attempts);
        Assert.Equal(1, counts.Completions);
    }

    [Fact]
    public void Counts_survive_recovery_from_the_journal()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player, "journal-first");

        journal.Tell(Completion(player, 1, "a1"));
        ExpectMsg<CompletionJournaled>(cancellationToken: Token);
        journal.Tell(new EndAttempt(player, 2, "a2", AttemptOutcome.Restarted));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        Watch(journal);
        Sys.Stop(journal);
        ExpectTerminated(journal, cancellationToken: Token);

        var recovered = Journal(player, "journal-second");
        var counts = CountsOf(recovered, player);
        Assert.Equal(2, counts.Attempts);
        Assert.Equal(1, counts.Completions);
    }

    [Fact]
    public void A_duplicate_is_still_recognised_after_recovery()
    {
        var player = Guid.NewGuid().ToString("N");
        var journal = Journal(player, "dedupe-first");

        journal.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        Watch(journal);
        Sys.Stop(journal);
        ExpectTerminated(journal, cancellationToken: Token);

        var recovered = Journal(player, "dedupe-second");
        recovered.Tell(new EndAttempt(player, 1, "a1", AttemptOutcome.Abandoned));
        ExpectMsg<AttemptEnded>(cancellationToken: Token);

        var counts = CountsOf(recovered, player);
        Assert.Equal(1, counts.Attempts);
    }

    [Fact]
    public void A_player_with_no_attempts_counts_none()
    {
        var player = Guid.NewGuid().ToString("N");

        var counts = CountsOf(Journal(player), player);
        Assert.Equal(0, counts.Attempts);
        Assert.Equal(0, counts.Completions);
    }
}
