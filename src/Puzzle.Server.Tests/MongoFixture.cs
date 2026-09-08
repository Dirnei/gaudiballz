using MongoDB.Driver;
using Puzzle.Server.Persistence;
using Testcontainers.MongoDb;

namespace Puzzle.Server.Tests;

/// <summary>
/// One MongoDB, shared by every test class that needs one.
///
/// It is shared because the setup, not the database, was the cost. xUnit constructs a test
/// class once per test method, so an <c>IAsyncLifetime</c> on the class itself runs for every
/// test in it: a fresh client with replica-set discovery to do, a fresh database, and a fresh
/// pass of index creation. Measured on <c>PuzzleStoreTests</c>, that was 5.8 seconds per test
/// and 113 seconds for the class — against 10 seconds for the thirteen API tests next door,
/// which already shared their fixture.
///
/// The container itself was never the problem: a single-node replica set is ready in about a
/// second and a half, and a hundred writes at majority-with-journal cost 311 ms. Neither the
/// topology nor the write concern is worth weakening to save test time.
///
/// Sharing one database across classes is safe because every test addresses its own data:
/// players are random GUIDs and the smoke tests use collections of their own.
/// </summary>
public sealed class MongoFixture : IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder("mongo:8")
        // A single-node replica set rather than a standalone mongod, for the same reason
        // docker-compose.yml uses one: majority write concern and TTL indexes are behaviours
        // this application relies on and a standalone silently does without.
        .WithReplicaSet()
        .Build();

    public PuzzleStore Store { get; private set; } = null!;

    /// <summary>The same database the store writes to, for assertions about stored shape.</summary>
    public IMongoDatabase Database { get; private set; } = null!;

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        var database = $"puzzle_test_{Guid.NewGuid():N}";
        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _container.GetConnectionString(),
            Database = database,
        });
        await Store.EnsureIndexesAsync();

        Database = new MongoClient(_container.GetConnectionString()).GetDatabase(database);
    }

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();
}

/// <summary>
/// Groups the classes that share the database above. Everything in this collection runs
/// sequentially, which is the trade for paying the setup once instead of once per test.
/// </summary>
[CollectionDefinition(Name)]
public sealed class SharedMongo : ICollectionFixture<MongoFixture>
{
    public const string Name = "mongo";
}
