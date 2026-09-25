using Akka.Actor;
using Akka.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests.Progression;

/// <summary>
/// The real application against a real MongoDB, with the wallet reachable through a gate
/// the test can close. Closing it is how "the wallet is unavailable" is expressed: the gate
/// swallows the message, the Ask times out, and the endpoint takes its fallback path.
/// </summary>
public sealed class WalletAuthorityFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private string _connectionString = string.Empty;

    private readonly string _database = $"puzzle_test_{Guid.NewGuid():N}";

    public PuzzleStore Store { get; private set; } = null!;

    /// <summary>The gate in front of the wallet region, for opening and closing it.</summary>
    public IActorRef Gate => Services.GetRequiredService<IRequiredActor<WalletRegion>>().ActorRef;

    public async ValueTask InitializeAsync()
    {
        _connectionString = await SharedMongoContainer.ConnectionStringAsync();

        Store = new PuzzleStore(new MongoOptions
        {
            ConnectionString = _connectionString,
            Database = _database,
        });
        await Store.EnsureIndexesAsync();
        await Store.EnsureActivityFeedCollectionAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Mongo:ConnectionString", _connectionString);
        builder.UseSetting("Mongo:Database", _database);

        // The application registers IRequiredActor<T> as an open generic, so this closed
        // registration comes later and wins. Endpoints resolve the gate believing it to be
        // the wallet region; the gate forwards to the real one until a test closes it.
        builder.ConfigureServices(services =>
            services.AddSingleton<IRequiredActor<WalletRegion>>(sp => new GatedRegion(sp)));
    }

    /// <summary>
    /// Hands endpoints the gate in place of the region they asked for.
    ///
    /// The gate is built on first use rather than when this is constructed. Every hosted
    /// service is constructed before any of them starts, so at construction time the actor
    /// system has not run its registrations yet and asking the registry for the region
    /// throws. Akka.Hosting's own implementation defers for the same reason.
    /// </summary>
    private sealed class GatedRegion(IServiceProvider services) : IRequiredActor<WalletRegion>
    {
        private readonly Lazy<IActorRef> _gate = new(() =>
        {
            var system = services.GetRequiredService<ActorSystem>();
            var region = services.GetRequiredService<ActorRegistry>().Get<WalletRegion>();

            return system.ActorOf(WalletGateActor.PropsFor(region), "wallet-gate");
        });

        public IActorRef ActorRef => _gate.Value;

        public Task<IActorRef> GetAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(ActorRef);
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
