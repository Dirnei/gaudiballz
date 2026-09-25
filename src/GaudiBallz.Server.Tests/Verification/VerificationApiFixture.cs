using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using MongoDB.Driver;
using GaudiBallz.Server.Persistence;
using Testcontainers.MongoDb;

namespace GaudiBallz.Server.Tests.Verification;

/// <summary>
/// The real application against a real MongoDB, for completion verification tests. It exposes
/// the database as well, so a test can prove a rejected completion left no trace anywhere.
/// </summary>
public sealed class VerificationApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder("mongo:8")
        .WithReplicaSet()
        .Build();

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;

    public IMongoDatabase Database { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _container.GetConnectionString(),
            Database = _database,
        });
        await Store.EnsureIndexesAsync();

        Database = new MongoClient(_container.GetConnectionString()).GetDatabase(_database);
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
