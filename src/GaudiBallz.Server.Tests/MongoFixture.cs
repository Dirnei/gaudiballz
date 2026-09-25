using MongoDB.Driver;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests;

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
/// The container is the assembly-wide one in <see cref="SharedMongoContainer"/>; this fixture
/// owns only its own database in it.
///
/// Sharing one database across classes is safe because every test addresses its own data:
/// players are random GUIDs and the smoke tests use collections of their own.
/// </summary>
public sealed class MongoFixture : IAsyncLifetime
{
    public PuzzleStore Store { get; private set; } = null!;

    /// <summary>The same database the store writes to, for assertions about stored shape.</summary>
    public IMongoDatabase Database { get; private set; } = null!;

    public string ConnectionString { get; private set; } = string.Empty;

    public async ValueTask InitializeAsync()
    {
        ConnectionString = await SharedMongoContainer.ConnectionStringAsync();

        var database = $"puzzle_test_{Guid.NewGuid():N}";
        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = ConnectionString,
            Database = database,
        });
        await Store.EnsureIndexesAsync();

        Database = new MongoClient(ConnectionString).GetDatabase(database);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
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
