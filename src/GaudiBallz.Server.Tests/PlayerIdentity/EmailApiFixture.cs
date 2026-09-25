using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;

namespace GaudiBallz.Server.Tests.PlayerIdentity;

public sealed class EmailApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private string _connectionString = string.Empty;

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;
    public FakeEmailSender EmailSender { get; } = new();

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
        builder.UseSetting("Smtp:Host", "fake");
        builder.UseSetting("Smtp:Port", "1025");
        builder.UseSetting("Smtp:From", "test@test.local");

        builder.ConfigureServices(services =>
        {
            services.AddSingleton<IEmailSender>(EmailSender);
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
    }
}

public sealed class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<(string Email, string Code)> _sent = new();

    public string? LastCodeFor(string email) =>
        _sent.Where(s => s.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            .Select(s => s.Code)
            .LastOrDefault();

    public int CountFor(string email) =>
        _sent.Count(s => s.Email.Equals(email, StringComparison.OrdinalIgnoreCase));

    public Task SendCodeAsync(string email, string code, CancellationToken token = default)
    {
        _sent.Enqueue((email, code));
        return Task.CompletedTask;
    }
}
