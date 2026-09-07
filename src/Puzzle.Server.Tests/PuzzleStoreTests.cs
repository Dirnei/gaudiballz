using MongoDB.Driver;
using Puzzle.Server.Persistence;
using Puzzle.Server.Progression;
using Testcontainers.MongoDb;

namespace Puzzle.Server.Tests;

/// <summary>
/// Against a real MongoDB, because the behaviour being relied on lives in the update
/// operators rather than in our code. A fake would happily agree with whatever we assumed
/// <c>$min</c> does.
/// </summary>
public sealed class PuzzleStoreTests : IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder("mongo:8")
        .WithReplicaSet()
        .Build();

    private PuzzleStore _store = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        _store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _container.GetConnectionString(),
            Database = $"puzzle_test_{Guid.NewGuid():N}",
        });
        await _store.EnsureIndexesAsync();
    }

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Creating_indexes_twice_is_harmless()
    {
        await _store.EnsureIndexesAsync(Token);
        await _store.EnsureIndexesAsync(Token);
    }

    [Fact]
    public async Task An_anonymous_player_round_trips()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.CreateAnonymousPlayerAsync(id, Token);

        var found = await _store.FindPlayerAsync(id, Token);

        Assert.NotNull(found);
        Assert.True(found.IsAnonymous);
    }

    [Fact]
    public async Task A_completion_is_recorded_and_read_back()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.RecordCompletionAsync(id, 7, new LevelResult(31, 2), Token);

        var progress = await _store.LoadProgressAsync(id, Token);

        Assert.Equal(new LevelResult(31, 2), progress.Levels[7]);
    }

    [Fact]
    public async Task A_worse_attempt_cannot_overwrite_a_better_one()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.RecordCompletionAsync(id, 7, new LevelResult(31, 1), Token);
        await _store.RecordCompletionAsync(id, 7, new LevelResult(48, 6), Token);

        var progress = await _store.LoadProgressAsync(id, Token);

        Assert.Equal(new LevelResult(31, 1), progress.Levels[7]);
    }

    [Fact]
    public async Task Submitting_the_same_completion_twice_changes_nothing()
    {
        var id = Guid.NewGuid().ToString("N");
        var result = new LevelResult(22, 0);

        await _store.RecordCompletionAsync(id, 3, result, Token);
        var once = await _store.LoadProgressAsync(id, Token);

        await _store.RecordCompletionAsync(id, 3, result, Token);
        var twice = await _store.LoadProgressAsync(id, Token);

        Assert.Equal(once.Levels[3], twice.Levels[3]);
        Assert.Equal(once.LevelsCompleted, twice.LevelsCompleted);
    }

    /// <summary>
    /// The property the whole design rests on: two devices submitting at the same moment
    /// must not lose either result. There is no read-modify-write here to lose it in.
    /// </summary>
    [Fact]
    public async Task Concurrent_completions_do_not_lose_a_result()
    {
        var id = Guid.NewGuid().ToString("N");

        await Task.WhenAll(
            Enumerable.Range(0, 20).Select(i =>
                _store.RecordCompletionAsync(id, 5, new LevelResult(50 - i, 10 - (i % 10)), Token)));

        var progress = await _store.LoadProgressAsync(id, Token);

        // The best of everything submitted, whatever order they landed in.
        Assert.Equal(31, progress.Levels[5].Moves);
        Assert.Equal(1, progress.Levels[5].Hints);
    }

    [Fact]
    public async Task Progress_reads_back_only_for_the_player_asked_for()
    {
        var mine = Guid.NewGuid().ToString("N");
        var theirs = Guid.NewGuid().ToString("N");

        await _store.RecordCompletionAsync(mine, 1, new LevelResult(10, 0), Token);
        await _store.RecordCompletionAsync(theirs, 2, new LevelResult(20, 0), Token);

        var progress = await _store.LoadProgressAsync(mine, Token);

        Assert.Equal(1, progress.LevelsCompleted);
        Assert.True(progress.Levels.ContainsKey(1));
    }

    [Fact]
    public async Task Merging_a_device_into_an_account_keeps_both_sides()
    {
        var account = Guid.NewGuid().ToString("N");
        await _store.RecordCompletionAsync(account, 1, new LevelResult(12, 0), Token);
        await _store.RecordCompletionAsync(account, 2, new LevelResult(25, 3), Token);

        var device = PlayerProgress.Empty
            .With(2, new LevelResult(18, 5))
            .With(3, new LevelResult(30, 1));

        await _store.MergeProgressAsync(account, device, Token);
        var merged = await _store.LoadProgressAsync(account, Token);

        Assert.Equal(3, merged.LevelsCompleted);
        Assert.Equal(new LevelResult(12, 0), merged.Levels[1]);
        Assert.Equal(new LevelResult(18, 3), merged.Levels[2]);
        Assert.Equal(new LevelResult(30, 1), merged.Levels[3]);
    }

    [Fact]
    public async Task A_credential_belongs_to_exactly_one_account()
    {
        var player = Guid.NewGuid().ToString("N");
        var credentialId = Guid.NewGuid().ToString("N");

        await _store.AddCredentialAsync(new CredentialDocument
        {
            Id = credentialId,
            PlayerId = player,
            PublicKey = [1, 2, 3],
            UserHandle = [4, 5, 6],
            CreatedAt = DateTime.UtcNow,
            LastUsedAt = DateTime.UtcNow,
        }, Token);

        var found = await _store.FindCredentialAsync(credentialId, Token);
        Assert.Equal(player, found!.PlayerId);

        // The credential id is the document id, so a second account cannot claim it.
        await Assert.ThrowsAsync<MongoWriteException>(() =>
            _store.AddCredentialAsync(new CredentialDocument
            {
                Id = credentialId,
                PlayerId = Guid.NewGuid().ToString("N"),
            }, Token));
    }

    [Fact]
    public async Task A_username_can_be_claimed_and_found()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.CreateAnonymousPlayerAsync(id, Token);

        Assert.True(await _store.TryClaimUsernameAsync(id, "Dirnei", Token));

        var found = await _store.FindByUsernameAsync("Dirnei", Token);
        Assert.Equal(id, found!.Id);
        Assert.Equal("Dirnei", found.Username);
    }

    [Fact]
    public async Task A_taken_username_is_refused()
    {
        var first = Guid.NewGuid().ToString("N");
        var second = Guid.NewGuid().ToString("N");
        var name = $"taken{Guid.NewGuid():N}"[..12];

        await _store.CreateAnonymousPlayerAsync(first, Token);
        await _store.CreateAnonymousPlayerAsync(second, Token);

        Assert.True(await _store.TryClaimUsernameAsync(first, name, Token));
        Assert.False(await _store.TryClaimUsernameAsync(second, name, Token));
    }

    /// <summary>
    /// Two names differing only in capitalisation would look identical everywhere they are
    /// shown, so the index is on the lowercased form.
    /// </summary>
    [Fact]
    public async Task Capitalisation_does_not_make_a_name_free()
    {
        var first = Guid.NewGuid().ToString("N");
        var second = Guid.NewGuid().ToString("N");
        var name = $"case{Guid.NewGuid():N}"[..12];

        await _store.CreateAnonymousPlayerAsync(first, Token);
        await _store.CreateAnonymousPlayerAsync(second, Token);

        Assert.True(await _store.TryClaimUsernameAsync(first, name.ToLowerInvariant(), Token));
        Assert.False(await _store.TryClaimUsernameAsync(second, name.ToUpperInvariant(), Token));
    }

    /// <summary>
    /// The reason uniqueness is an index rather than a lookup: a check-then-write lets two
    /// registrations racing for the same name both pass their check.
    /// </summary>
    [Fact]
    public async Task Only_one_of_many_racing_claims_succeeds()
    {
        var name = $"race{Guid.NewGuid():N}"[..12];
        var players = Enumerable.Range(0, 8).Select(_ => Guid.NewGuid().ToString("N")).ToArray();

        foreach (var id in players)
        {
            await _store.CreateAnonymousPlayerAsync(id, Token);
        }

        var results = await Task.WhenAll(
            players.Select(id => _store.TryClaimUsernameAsync(id, name, Token)));

        Assert.Equal(1, results.Count(claimed => claimed));
    }

    [Fact]
    public async Task Anonymous_players_do_not_collide_on_having_no_username()
    {
        // The index is sparse; without that every anonymous player would clash on null.
        foreach (var _ in Enumerable.Range(0, 5))
        {
            await _store.CreateAnonymousPlayerAsync(Guid.NewGuid().ToString("N"), Token);
        }
    }

    [Fact]
    public async Task Enrolling_marks_the_player_no_longer_anonymous()
    {
        var id = Guid.NewGuid().ToString("N");
        await _store.CreateAnonymousPlayerAsync(id, Token);

        await _store.MarkEnrolledAsync(id, Token);

        var player = await _store.FindPlayerAsync(id, Token);
        Assert.False(player!.IsAnonymous);
    }
}
