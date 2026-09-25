using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests.Hub;

/// <summary>
/// The real application against a real MongoDB, for hub integration tests.
/// </summary>
public sealed class HubApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private string _connectionString = string.Empty;

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        _connectionString = await SharedMongoContainer.ConnectionStringAsync();

        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _connectionString,
            Database = _database,
        });
        await Store.EnsureIndexesAsync();
        await Store.EnsureActivityFeedCollectionAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Mongo:ConnectionString", _connectionString);
        builder.UseSetting("Mongo:Database", _database);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
    }
}

/// <summary>
/// Groups the API test classes that need the real application, so they share one instance
/// of it and one MongoDB between them.
///
/// Shared for the same reason <c>SharedMongo</c> exists: an <c>IClassFixture</c> is built per
/// class, so three classes meant three replica sets starting at once and one of them losing
/// the race. Sharing is safe because every test here addresses its own randomly-named player.
/// </summary>
[CollectionDefinition(Name)]
public sealed class SharedHubApi : ICollectionFixture<HubApiFixture>
{
    public const string Name = "hub-api";
}
