using Akka;
using Akka.Actor;
using Akka.Persistence.MongoDb.Query;
using Akka.Persistence.Query;
using Akka.Streams;
using Akka.Streams.Dsl;
using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Progression;

public sealed partial class LevelLeaderboardProjection : BackgroundService
{
    private readonly ActorSystem _system;
    private readonly PuzzleStore _store;
    private readonly ILogger<LevelLeaderboardProjection> _logger;

    public LevelLeaderboardProjection(
        ActorSystem system, PuzzleStore store, ILogger<LevelLeaderboardProjection> logger)
    {
        _system = system;
        _store = store;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var readJournal = PersistenceQuery.Get(_system)
            .ReadJournalFor<MongoDbReadJournal>(MongoDbReadJournal.Identifier);

        var materializer = _system.Materializer();

        var source = readJournal.AllEvents(Offset.NoOffset());

        await source
            .Where(env => env.Event is LevelCompleted)
            .SelectAsync(1, async env =>
            {
                var evt = (LevelCompleted)env.Event;
                await ProjectCompletionAsync(evt);
                return Done.Instance;
            })
            .RunWith(Sink.Ignore<Done>(), materializer)
            .WaitAsync(stoppingToken);
    }

    private async Task ProjectCompletionAsync(LevelCompleted evt)
    {
        if (evt.Username is null)
        {
            return;
        }

        try
        {
            var level = LevelCatalogue.Build(evt.Level);
            var par = level.ConstructiveSolution.Count;
            var timeTarget = LevelCatalogue.TimeTargetMs(evt.Level);
            var (stars, _) = Scoring.Calculate(evt.Moves, evt.Hints, evt.ElapsedTimeMs, par, timeTarget);

            var weekPeriod = IsoWeekString(evt.Timestamp);
            var dayPeriod = evt.Timestamp.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

            var timeMs = evt.ElapsedTimeMs ?? 0;

            await _store.UpsertLevelLeaderboardAsync(
                evt.Level, evt.PlayerId, evt.Username, null,
                stars, evt.Moves, timeMs, evt.ProfileBall);

            await _store.UpsertLevelLeaderboardAsync(
                evt.Level, evt.PlayerId, evt.Username, weekPeriod,
                stars, evt.Moves, timeMs, evt.ProfileBall);

            await _store.UpsertLevelLeaderboardAsync(
                evt.Level, evt.PlayerId, evt.Username, dayPeriod,
                stars, evt.Moves, timeMs, evt.ProfileBall);
        }
        catch (Exception ex)
        {
            ProjectionFailed(_logger, evt.PlayerId, evt.Level, ex);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning,
        Message = "Failed to project level completion for player {PlayerId} level {Level}")]
    private static partial void ProjectionFailed(ILogger logger, string playerId, int level, Exception ex);

    private static string IsoWeekString(DateTime utc)
    {
        var cal = System.Globalization.CultureInfo.InvariantCulture.Calendar;
        var week = cal.GetWeekOfYear(utc, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        return $"{utc.Year}-W{week:D2}";
    }
}
