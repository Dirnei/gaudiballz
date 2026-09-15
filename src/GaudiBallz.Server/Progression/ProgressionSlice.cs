using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Rules;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Hub;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;

namespace GaudiBallz.Server.Progression;

/// <summary>Registered by the host so endpoints can reach the player registry actor.</summary>
public sealed class PlayerRegistry(IActorRef Ref)
{
    public IActorRef Actor { get; } = Ref;
}

/// <summary>
/// What a player has completed.
///
/// Every request goes through the player's session actor rather than touching the database
/// directly, so two devices submitting at once are serialised per player instead of racing.
/// </summary>
public sealed class ProgressionSlice : ISlice
{
    private static readonly TimeSpan AskTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan AchievementAskTimeout = TimeSpan.FromSeconds(2);

    public static string Name => "level-progression";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/progress").WithTags("Progress");

        group.MapGet("/", async (HttpContext http, PlayerRegistry registry, PlayerTokens tokens) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is null)
            {
                return Results.Unauthorized();
            }

            var snapshot = await registry.Actor.Ask<ProgressSnapshot>(new LoadProgress(playerId), AskTimeout);
            return Results.Ok(Shape(snapshot));
        });

        group.MapPost("/completions",
            async (HttpContext http, CompletionRequest request, PlayerRegistry registry,
                   PlayerTokens tokens, PuzzleStore store, AchievementRegistry achievements,
                   PresenceTracker presence) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                if (request.Level < 1 || request.Moves < 1 || request.Hints < 0)
                {
                    return Results.BadRequest(new { error = "A completion needs a level and a move count." });
                }

                var level = LevelCatalogue.Build(request.Level);
                var par = level.ConstructiveSolution.Count;
                var timeTargetMs = LevelCatalogue.TimeTargetMs(request.Level);
                var (attemptStars, attemptPoints) = Scoring.Calculate(
                    request.Moves, request.Hints, request.ElapsedTimeMs, par, timeTargetMs);

                var levelResult = new LevelResult(request.Moves, request.Hints, attemptStars, attemptPoints);

                var before = await registry.Actor.Ask<ProgressSnapshot>(
                    new LoadProgress(playerId), AskTimeout);
                var isReplay = before.Progress.Levels.TryGetValue(request.Level, out var prev) && prev.Stars > 0;
                var previousPoints = prev.Points;
                var starDelta = Math.Max(0, attemptPoints - previousPoints);

                var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                    new RecordCompletion(playerId, request.Level, levelResult),
                    AskTimeout);

                var bonus = await store.RecordCompletionBonusAsync(
                    playerId, request.Level, request.ElapsedTimeMs, isReplay, request.Hints);

                var oldXp = before.Progress.TotalPoints;
                var newXp = snapshot.Progress.TotalPoints + bonus.Total;
                var rankUp = RankTier.DetectRankUp(oldXp, newXp);

                var newAchievements = Array.Empty<object>();
                var newBadges = Array.Empty<object>();

                var player = await store.FindPlayerAsync(playerId);
                if (player is { IsAnonymous: false })
                {
                    var metadata = new AttemptMetadata(
                        request.UndoCount ?? 0,
                        request.Restarted ?? false,
                        request.SessionId,
                        request.ColourCount ?? 0,
                        request.ParMoves ?? 0);

                    try
                    {
                        var result = await achievements.Actor.Ask<AchievementResult>(
                            new CompletionEvent(playerId, request.Level,
                                levelResult,
                                metadata, false),
                            AchievementAskTimeout);

                        newAchievements = result.NewAwards
                            .Select(a => (object)new { id = a.Id, name = a.Name })
                            .ToArray();

                        newBadges = result.NewBadges
                            .Select(b => (object)new { id = b.Id, name = b.Name })
                            .ToArray();
                    }
                    catch (TaskCanceledException)
                    {
                        // Timeout — achievements still awarded asynchronously
                    }
                }

                // Hub: update leaderboard and activity feed (fire-and-forget, never blocks the response)
                if (player is { IsAnonymous: false, Username: not null })
                {
                    var updatedProgress = snapshot.Progress;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var ball = player.ProfileBall;

                            await store.UpsertLeaderboardAsync(
                                playerId, player.Username,
                                updatedProgress.TotalPoints + bonus.Total,
                                updatedProgress.LevelsCompleted,
                                updatedProgress.Levels.Values.Count(r => r.Stars > 0),
                                ball);

                            var earnedThisAttempt = starDelta + bonus.Total;
                            if (earnedThisAttempt > 0)
                            {
                                var weekPeriod = $"{DateTime.UtcNow.Year}-W{System.Globalization.CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(DateTime.UtcNow, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday):D2}";
                                var dayPeriod = DateTime.UtcNow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

                                await store.UpsertPeriodLeaderboardAsync(playerId, player.Username, weekPeriod, earnedThisAttempt, ball);
                                await store.UpsertPeriodLeaderboardAsync(playerId, player.Username, dayPeriod, earnedThisAttempt, ball);
                            }

                            await store.RecordStructuredActivityAsync(
                                playerId, player.Username, "level_clear",
                                $"cleared Level {request.Level} in {request.Moves} moves",
                                "level-cleared",
                                new Dictionary<string, object> { ["level"] = request.Level, ["moves"] = request.Moves },
                                ball);

                            if (starDelta > 0 && !isReplay)
                            {
                                await store.RecordStructuredActivityAsync(
                                    playerId, player.Username, "new_record",
                                    $"set a new record on Level {request.Level}",
                                    "new-record",
                                    new Dictionary<string, object> { ["level"] = request.Level },
                                    ball);
                            }

                            foreach (var ach in newAchievements)
                            {
                                var achId = ach.GetType().GetProperty("id")?.GetValue(ach)?.ToString() ?? "";
                                var achName = ach.GetType().GetProperty("name")?.GetValue(ach)?.ToString() ?? "an achievement";
                                await store.RecordStructuredActivityAsync(
                                    playerId, player.Username, "achievement",
                                    $"earned {achName}",
                                    "achievement-earned",
                                    new Dictionary<string, object> { ["achievementId"] = achId, ["achievementName"] = achName },
                                    ball);
                            }
                        }
                        catch
                        {
                            // Hub updates are best-effort; never fail a completion for them.
                        }
                    });
                }

                return Results.Ok(ShapeCompletion(
                    snapshot, attemptStars, attemptPoints, starDelta, bonus,
                    rankUp, newAchievements, newBadges));
            });

        // Used once, when a device with local progress signs in to an existing account.
        group.MapPost("/merge",
            async (HttpContext http, MergeRequest request, PlayerRegistry registry, PlayerTokens tokens) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var incoming = PlayerProgress.Empty;
                foreach (var entry in request.Levels)
                {
                    if (entry.Level >= 1 && entry.Moves >= 1 && entry.Hints >= 0)
                    {
                        incoming = incoming.With(entry.Level, new LevelResult(entry.Moves, entry.Hints, entry.Stars, entry.Points));
                    }
                }

                var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                    new MergeDeviceProgress(playerId, incoming), AskTimeout);

                return Results.Ok(Shape(snapshot));
            });
    }

    private static object Shape(ProgressSnapshot snapshot)
    {
        var totalPoints = snapshot.Progress.TotalPoints;
        var (tier, subLevel) = RankTier.FromXp(totalPoints);
        var nextThreshold = RankTier.NextThreshold(totalPoints);

        return new
        {
            levelsCompleted = snapshot.Progress.LevelsCompleted,
            highestCompleted = snapshot.Progress.HighestCompleted,
            totalPoints,
            rank = new
            {
                tier = tier.ToString().ToLowerInvariant(),
                subLevel,
                currentXp = totalPoints,
                nextThreshold,
            },
            levels = snapshot.Progress.Levels
                .OrderBy(pair => pair.Key)
                .Select(pair => new
                {
                    level = pair.Key,
                    moves = pair.Value.Moves,
                    hints = pair.Value.Hints,
                    stars = pair.Value.Stars,
                    points = pair.Value.Points,
                })
                .ToArray(),
        };
    }

    private static object ShapeCompletion(
        ProgressSnapshot snapshot, int attemptStars, int attemptPoints,
        int starDelta, CompletionBonusResult bonus, RankUpEvent rankUp,
        object[] newAchievements, object[] newBadges) => new
    {
        levelsCompleted = snapshot.Progress.LevelsCompleted,
        highestCompleted = snapshot.Progress.HighestCompleted,
        totalPoints = snapshot.Progress.TotalPoints + bonus.Total,
        levels = snapshot.Progress.Levels
            .OrderBy(pair => pair.Key)
            .Select(pair => new
            {
                level = pair.Key,
                moves = pair.Value.Moves,
                hints = pair.Value.Hints,
                stars = pair.Value.Stars,
                points = pair.Value.Points,
            })
            .ToArray(),
        attemptStars,
        attemptPoints,
        starDelta,
        replayBonus = bonus.ReplayBonus,
        timeBonus = bonus.TimeBonus,
        noHintBonus = bonus.NoHintBonus,
        firstClearBonus = bonus.FirstClearBonus,
        streakBonus = bonus.StreakBonus,
        rankUp = rankUp.Kind == RankUpKind.None ? null : new
        {
            kind = rankUp.Kind == RankUpKind.TierPromotion ? "tierPromotion" : "subLevel",
            oldTier = rankUp.OldTier.ToString().ToLowerInvariant(),
            oldSubLevel = rankUp.OldSubLevel,
            newTier = rankUp.NewTier.ToString().ToLowerInvariant(),
            newSubLevel = rankUp.NewSubLevel,
        },
        newAchievements,
        newBadges,
    };

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }

    public sealed record CompletionRequest(
        int Level, int Moves, int Hints,
        int? ElapsedTimeMs = null,
        int? UndoCount = null,
        bool? Restarted = null,
        string? SessionId = null,
        int? ColourCount = null,
        int? ParMoves = null);

    public sealed record MergeEntry(int Level, int Moves, int Hints, int Stars = 0, int Points = 0);

    public sealed record MergeRequest(IReadOnlyList<MergeEntry> Levels);
}
