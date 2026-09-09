using MongoDB.Bson;
using MongoDB.Driver;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Proves the Testcontainers harness and the MongoDB driver work together before any
/// repository depends on them.
///
/// The container runs as a single-node replica set for the same reason
/// <c>docker-compose.yml</c> does: TTL indexes and majority write concern are behaviours
/// the application relies on and a standalone mongod does not provide. Testing against a
/// topology nobody deploys would make this suite worse than useless.
/// </summary>
[Collection(SharedMongo.Name)]
public sealed class MongoHarnessSmokeTests
{
    private readonly IMongoDatabase _database;

    public MongoHarnessSmokeTests(MongoFixture mongo)
    {
        _database = mongo.Database;
    }

    [Fact]
    public async Task Round_trips_a_document()
    {
        var collection = _database.GetCollection<BsonDocument>("round_trip");
        var token = TestContext.Current.CancellationToken;

        await collection.InsertOneAsync(
            new BsonDocument { { "_id", "probe" }, { "value", 42 } },
            cancellationToken: token);

        var found = await collection
            .Find(Builders<BsonDocument>.Filter.Eq("_id", "probe"))
            .FirstOrDefaultAsync(token);

        Assert.NotNull(found);
        Assert.Equal(42, found["value"].AsInt32);
    }

    [Fact]
    public async Task Supports_ttl_indexes()
    {
        var collection = _database.GetCollection<BsonDocument>("ttl_probe");
        var token = TestContext.Current.CancellationToken;

        var name = await collection.Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(
                Builders<BsonDocument>.IndexKeys.Ascending("expiresAt"),
                new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }),
            cancellationToken: token);

        Assert.Equal("expiresAt_1", name);
    }

    [Fact]
    public async Task Honours_majority_write_concern()
    {
        // Every progress-affecting write uses majority concern, so losing a node must not
        // lose a player's cleared level. On a standalone mongod this silently degrades.
        var collection = _database
            .GetCollection<BsonDocument>("majority_probe")
            .WithWriteConcern(WriteConcern.WMajority.With(journal: true));

        await collection.InsertOneAsync(
            new BsonDocument { { "_id", "durable" } },
            cancellationToken: TestContext.Current.CancellationToken);

        var count = await collection.CountDocumentsAsync(
            Builders<BsonDocument>.Filter.Empty,
            cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(1, count);
    }
}
