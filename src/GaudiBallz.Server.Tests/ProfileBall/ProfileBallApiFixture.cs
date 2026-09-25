using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests.ProfileBall;

/// <summary>
/// The real application against a real MongoDB.
///
/// The gate being tested is the server's, so a test that stubbed out either half would only
/// prove the stub. The store is exposed alongside the HTTP client for one job: turning a
/// player into an account. Enrolment goes through WebAuthn, which cannot be driven from a
/// test, and faking a credential would test the fake rather than the gate.
/// </summary>
public sealed class ProfileBallApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
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
