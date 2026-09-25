using GaudiBallz.Server.Tests;
using Testcontainers.MongoDb;

[assembly: AssemblyFixture(typeof(SharedMongoContainer))]

namespace GaudiBallz.Server.Tests;

/// <summary>
/// The one MongoDB every test in this assembly talks to.
///
/// Each fixture used to start a replica set of its own: eight containers booting at once at the
/// start of a run, each initiating a replica set, a few seconds apiece and occasionally one of
/// them dying mid-initiation under the load, which failed every test that fixture served. One
/// container, started on first use, pays that once and has nothing to race.
///
/// Isolation is unchanged: every fixture still works in a database of its own with a random name,
/// and the tests inside a fixture already address their own random players.
///
/// Registered as an assembly fixture so xUnit disposes it when the run ends. Fixtures reach it
/// through the static accessor, because a collection fixture can't take it as a constructor
/// argument.
/// </summary>
public sealed class SharedMongoContainer : IAsyncLifetime
{
    private static readonly Lazy<Task<MongoDbContainer>> Started = new(StartAsync);

    /// <summary>The connection string of the shared replica set, starting it on first use.</summary>
    public static async Task<string> ConnectionStringAsync() =>
        (await Started.Value).GetConnectionString();

    private static async Task<MongoDbContainer> StartAsync()
    {
        // A single-node replica set rather than a standalone mongod, for the same reason
        // docker-compose.yml uses one: majority write concern and TTL indexes are behaviours
        // this application relies on and a standalone silently does without.
        var container = new MongoDbBuilder("mongo:8")
            .WithReplicaSet()
            .Build();
        await container.StartAsync();
        return container;
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        if (Started.IsValueCreated)
        {
            await (await Started.Value).DisposeAsync();
        }
    }
}
