using Akka.Actor;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;
using Testcontainers.MongoDb;

namespace GaudiBallz.Server.Tests.Progression;

/// <summary>
/// The real application against a real MongoDB, with the wallet reachable through a gate
/// the test can close. Closing it is how "the wallet is unavailable" is expressed: the gate
/// swallows the message, the Ask times out, and the endpoint takes its fallback path.
/// </summary>
public sealed class WalletAuthorityFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder("mongo:8")
        .WithReplicaSet()
        .Build();

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;

    /// <summary>The gate in front of the wallet registry, for opening and closing it.</summary>
    public IActorRef Gate => Services.GetRequiredService<WalletRegistry>().Actor;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _container.GetConnectionString(),
            Database = _database,
        });
        await Store.EnsureIndexesAsync();
        await Store.EnsureActivityFeedCollectionAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Mongo:ConnectionString", _container.GetConnectionString());
        builder.UseSetting("Mongo:Database", _database);

        // Registered after the application's own WalletRegistry, so this one wins.
        builder.ConfigureServices(services =>
            services.AddSingleton(sp =>
            {
                var system = sp.GetRequiredService<ActorSystem>();
                var registry = system.ActorOf(WalletRegistryActor.PropsFor(), "gated-wallets");
                return new WalletRegistry(
                    system.ActorOf(WalletGateActor.PropsFor(registry), "wallet-gate"));
            }));
    }

    public void CloseWallet() => Gate.Tell(WalletGateActor.Close.Instance);

    public void OpenWallet() => Gate.Tell(WalletGateActor.Open.Instance);

    /// <summary>Reads a player's balance straight from the ledger, bypassing the API.</summary>
    public async Task<int> BalanceOfAsync(string playerId)
    {
        var result = await Gate.Ask<BalanceResult>(
            new GetBalance(playerId), TimeSpan.FromSeconds(5));
        return result.Balance;
    }

    /// <summary>Credits the ledger and waits for the write, so the balance is settled.</summary>
    public async Task<int> CreditAsync(string playerId, int level, PointCategory category, int amount)
    {
        var result = await Gate.Ask<CreditResult>(
            new CreditPoints(playerId, level, category, amount), TimeSpan.FromSeconds(5));
        return result.NewBalance;
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _container.DisposeAsync();
    }
}

/// <summary>
/// Passes wallet traffic through when open and drops it when closed. Dropping rather than
/// replying with an error is deliberate: an unreachable actor is silence, and silence is
/// what the fallback path has to survive.
/// </summary>
public sealed class WalletGateActor : ReceiveActor
{
    public sealed record Close
    {
        public static Close Instance { get; } = new();
    }

    public sealed record Open
    {
        public static Open Instance { get; } = new();
    }

    public WalletGateActor(IActorRef registry)
    {
        var closed = false;

        Receive<Close>(_ => closed = true);
        Receive<Open>(_ => closed = false);
        Receive<IWalletCommand>(command =>
        {
            if (!closed)
            {
                registry.Forward(command);
            }
        });
    }

    public static Props PropsFor(IActorRef registry) =>
        Props.Create(() => new WalletGateActor(registry));
}
