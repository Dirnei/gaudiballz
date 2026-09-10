using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using GaudiBallz.Server.Persistence;
using Testcontainers.MongoDb;

namespace GaudiBallz.Server.Tests.Daily;

/// <summary>
/// The real application against a real MongoDB, for daily challenge integration tests.
/// </summary>
public sealed class DailyApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder("mongo:8")
        .WithReplicaSet()
        .Build();

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _container.GetConnectionString(),
            Database = _database,
        });
        await Store.EnsureIndexesAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Mongo:ConnectionString", _container.GetConnectionString());
        builder.UseSetting("Mongo:Database", _database);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _container.DisposeAsync();
    }
}
