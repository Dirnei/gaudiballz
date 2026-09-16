using Akka.Actor;
using Akka.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Persistence;

/// <summary>
/// Creates the MongoDB indexes in the background, retrying until the database is there.
///
/// Deliberately not part of startup. Levels are pure computation, so the game is playable
/// with no database at all — only recording progress fails, and the client queues that.
/// Refusing to boot would turn a degraded service into an outage, and would mean a slow
/// database on start took the whole game down with it.
///
/// Creating an index that already exists is a no-op, so retrying costs nothing and the
/// service converges whenever the database appears.
/// </summary>
public sealed partial class IndexInitializer(
    PuzzleStore store, IRequiredActor<WalletRegion> wallet, ILogger<IndexInitializer> logger)
    : BackgroundService
{
    private static readonly TimeSpan BetweenAttempts = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await store.EnsureIndexesAsync(stoppingToken);
                await store.EnsureActivityFeedCollectionAsync(stoppingToken);
                await store.BackfillLeaderboardAsync(stoppingToken);
                await store.BackfillLevelLeaderboardAsync(stoppingToken);
                await BackfillWalletsAsync(stoppingToken);
                IndexesReady(logger);
                return;
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                NotReady(logger, ex.GetType().Name);
                await Task.Delay(BetweenAttempts, stoppingToken);
            }
        }
    }

    private async Task BackfillWalletsAsync(CancellationToken token)
    {
        List<(string PlayerId, PlayerProgress Progress)> players;
        try
        {
            players = await store.LoadAllProgressForMigrationAsync(token);
        }
        catch
        {
            return;
        }

        foreach (var (playerId, progress) in players)
        {
            try
            {
                var balance = await wallet.ActorRef.Ask<BalanceResult>(
                    new GetBalance(playerId), TimeSpan.FromSeconds(5), token);
                if (balance.Balance > 0)
                {
                    continue;
                }
            }
            catch
            {
                continue;
            }

            foreach (var (level, result) in progress.Levels)
            {
                if (result.Points > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, level, PointCategory.BaseScore, result.Points));
                }

                if (result.BonusPoints > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, level, PointCategory.Migration, result.BonusPoints));
                }
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "MongoDB indexes are in place.")]
    private static partial void IndexesReady(ILogger logger);

    [LoggerMessage(
        Level = LogLevel.Warning,
        Message = "MongoDB is not ready ({Reason}). The game is playable; progress will not be recorded until it is.")]
    private static partial void NotReady(ILogger logger, string reason);
}
