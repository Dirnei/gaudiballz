using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests.Daily;

/// <summary>
/// The real application against a real MongoDB, for daily challenge integration tests.
/// </summary>
public sealed class DailyApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
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
