using Akka.Actor;
using Akka.Hosting;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Rules;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Hub;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;

namespace GaudiBallz.Server.Progression;

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
    private static readonly TimeSpan WalletAskTimeout = TimeSpan.FromSeconds(2);

    public static string Name => "level-progression";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/progress").WithTags("Progress");

        group.MapGet("/", async (HttpContext http, IRequiredActor<PlayerRegion> registry, PlayerTokens tokens, IRequiredActor<WalletRegion> wallet) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is null)
            {
                return Results.Unauthorized();
            }

            var snapshot = await registry.ActorRef.Ask<ProgressSnapshot>(new LoadProgress(playerId), AskTimeout);
            var walletBalance = await TryGetBalanceAsync(wallet, playerId);

            return Results.Ok(Shape(snapshot, walletBalance));
        });

        // Reports an attempt that ended without a completion. A completion arrives through
        // /completions instead, because it carries the facts the journal records with it.
        group.MapPost("/attempts/end",
            async (HttpContext http, EndAttemptRequest request, PlayerTokens tokens,
                   PuzzleStore store, IRequiredActor<CompletionJournalRegion> journal,
                   IRequiredActor<WalletRegion> wallet) =>
            {
                // sendBeacon cannot set an Authorization header, so a tab closing mid-attempt
                // has nowhere to put the token but the body.
                var playerId = tokens.Verify(BearerFrom(http) ?? request.Token);
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                if (request.Level < 1 || string.IsNullOrWhiteSpace(request.AttemptId))
                {
                    return Results.BadRequest(new { error = "An attempt ending needs a level and an attempt id.", code = "attempt-invalid" });
                }

                var outcome = request.Outcome?.ToLowerInvariant() switch
                {
                    "restarted" => AttemptOutcome.Restarted,
                    "abandoned" => AttemptOutcome.Abandoned,
                    _ => (AttemptOutcome?)null,
                };

                if (outcome is null)
                {
                    return Results.BadRequest(new { error = "An attempt ends as restarted or abandoned.", code = "attempt-outcome-invalid" });
                }

                try
                {
                    // The actor ignores an id it has already closed, so a duplicate beacon
                    // and a confirmed departure both land here and only one is counted.
                    var counts = await journal.ActorRef.Ask<AttemptEnded>(
                        new EndAttempt(playerId, request.Level, request.AttemptId, outcome.Value),
                        AskTimeout);

                    // A loss should show up without waiting for the player's next clear, so
                    // the standings are refreshed here too. Best-effort: a player who is not
                    // on the leaderboard at all has nothing to refresh.
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var player = await store.FindPlayerAsync(playerId);
                            if (player is not { IsAnonymous: false, Username: not null })
                            {
                                return;
                            }

                            var progress = await store.LoadProgressAsync(playerId);
                            await store.UpsertLeaderboardAsync(
                                playerId, player.Username,
                                await TryGetBalanceAsync(wallet, playerId) ?? progress.TotalPoints,
                                counts.Attempts, counts.Completions, player.ProfileBall);

                            var now = DateTime.UtcNow;
                            foreach (var period in new[] { IsoWeek(now), now.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture) })
                            {
                                await store.UpsertPeriodLeaderboardAsync(
                                    playerId, player.Username, period, 0, player.ProfileBall, won: false);
                            }
                        }
                        catch
                        {
                            // Standings are best-effort; never fail a departure for them.
                        }
                    });

                    return Results.Ok(new { attempts = counts.Attempts, completions = counts.Completions });
                }
                catch (TaskCanceledException)
                {
                    // Losing a loss is better than failing a departure the player already made.
                    return Results.Ok(new { attempts = (int?)null, completions = (int?)null });
                }
            });

        group.MapPost("/completions",
            async (HttpContext http, CompletionRequest request, IRequiredActor<PlayerRegion> registry,
                   PlayerTokens tokens, PuzzleStore store, IRequiredActor<AchievementRegion> achievements,
                   PresenceTracker presence, IRequiredActor<CompletionJournalRegion> journal,
                   IRequiredActor<WalletRegion> wallet) =>
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

                var before = await registry.ActorRef.Ask<ProgressSnapshot>(
                    new LoadProgress(playerId), AskTimeout);
                var isReplay = before.Progress.Levels.TryGetValue(request.Level, out var prev) && prev.Stars > 0;
                var previousPoints = prev.Points;
                var starDelta = Math.Max(0, attemptPoints - previousPoints);

                var snapshot = await registry.ActorRef.Ask<ProgressSnapshot>(
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
                        var result = await achievements.ActorRef.Ask<AchievementResult>(
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

                // Journal: record raw completion facts for event sourcing (fire-and-forget)
                journal.ActorRef.Tell(new JournalCompletion(
                    playerId,
                    player?.Username,
                    request.Level,
                    request.Moves,
                    request.Hints,
                    request.UndoCount ?? 0,
                    request.Restarted ?? false,
                    request.ElapsedTimeMs,
                    player?.ProfileBall,
                    request.AttemptId));

                // Wallet: credit each earning (fire-and-forget)
                wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.BaseScore, attemptPoints));
                if (bonus.FirstClearBonus > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.FirstClearBonus, bonus.FirstClearBonus));
                }

                if (bonus.NoHintBonus > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.NoHintBonus, bonus.NoHintBonus));
                }

                if (bonus.StreakBonus > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.StreakBonus, bonus.StreakBonus));
                }

                if (bonus.ReplayBonus > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.ReplayBonus, bonus.ReplayBonus));
                }

                if (bonus.TimeBonus > 0)
                {
                    wallet.ActorRef.Tell(new CreditPoints(playerId, request.Level, PointCategory.TimeBeatBonus, bonus.TimeBonus));
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

                            var leaderboardXp = await TryGetBalanceAsync(wallet, playerId)
                                ?? updatedProgress.TotalPoints + bonus.Total;

                            // Attempts and wins, not distinct levels: a level cleared on the
                            // third try is three games played and one won.
                            var counts = await TryGetAttemptCountsAsync(journal, playerId);

                            await store.UpsertLeaderboardAsync(
                                playerId, player.Username,
                                leaderboardXp,
                                counts?.Attempts ?? updatedProgress.LevelsCompleted,
                                counts?.Completions ?? updatedProgress.Levels.Values.Count(r => r.Stars > 0),
                                ball);

                            var weekPeriod = IsoWeek(DateTime.UtcNow);
                            var dayPeriod = DateTime.UtcNow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

                            // Unconditional, where it used to be skipped unless the attempt
                            // earned points. A period's games played and win rate have to
                            // count the attempts that earned nothing, or every period reads
                            // as though the player never lost.
                            var earnedThisAttempt = starDelta + bonus.Total;
                            await store.UpsertPeriodLeaderboardAsync(playerId, player.Username, weekPeriod, earnedThisAttempt, ball, won: true);
                            await store.UpsertPeriodLeaderboardAsync(playerId, player.Username, dayPeriod, earnedThisAttempt, ball, won: true);

                            var timeMs = request.ElapsedTimeMs ?? 0;
                            await store.UpsertLevelLeaderboardAsync(
                                request.Level, playerId, player.Username, null,
                                attemptStars, request.Moves, timeMs, ball);

                            await store.UpsertLevelLeaderboardAsync(
                                request.Level, playerId, player.Username, weekPeriod,
                                attemptStars, request.Moves, timeMs, ball);

                            await store.UpsertLevelLeaderboardAsync(
                                request.Level, playerId, player.Username, dayPeriod,
                                attemptStars, request.Moves, timeMs, ball);

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
            async (HttpContext http, MergeRequest request, IRequiredActor<PlayerRegion> registry, PlayerTokens tokens) =>
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

                var snapshot = await registry.ActorRef.Ask<ProgressSnapshot>(
                    new MergeDeviceProgress(playerId, incoming), AskTimeout);

                return Results.Ok(Shape(snapshot));
            });
    }

    /// <summary>
    /// The wallet ledger is the authority for total XP. When it can't answer in time the
    /// caller falls back to the progress-derived total rather than failing the request.
    /// </summary>
    internal static async Task<int?> TryGetBalanceAsync(IRequiredActor<WalletRegion> wallet, string playerId)
    {
        try
        {
            var balance = await wallet.ActorRef.Ask<BalanceResult>(new GetBalance(playerId), WalletAskTimeout);
            return balance.Balance;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// The attempt tally, or null when the journal cannot answer in time.
    ///
    /// Same shape as the wallet's balance lookup: the counts are worth waiting a moment for
    /// and never worth failing a request over.
    /// </summary>
    internal static async Task<AttemptCounts?> TryGetAttemptCountsAsync(
        IRequiredActor<CompletionJournalRegion> journal, string playerId)
    {
        try
        {
            return await journal.ActorRef.Ask<AttemptCounts>(
                new GetAttemptCounts(playerId), WalletAskTimeout);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>The period key for a week, matching the one the hub queries by.</summary>
    private static string IsoWeek(DateTime utc)
    {
        var calendar = System.Globalization.CultureInfo.InvariantCulture.Calendar;
        var week = calendar.GetWeekOfYear(
            utc, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        return $"{utc.Year}-W{week:D2}";
    }

    private static object Shape(ProgressSnapshot snapshot, int? walletBalance = null)
    {
        var totalPoints = walletBalance ?? snapshot.Progress.TotalPoints;
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
        int? ParMoves = null,
        /// <summary>Identifies the attempt this completion closes, so it is counted once.</summary>
        string? AttemptId = null);

    /// <param name="Token">
    /// Carried in the body for the unload beacon, which cannot set request headers. Ignored
    /// when an Authorization header is present.
    /// </param>
    public sealed record EndAttemptRequest(
        int Level,
        string AttemptId,
        string? Outcome,
        string? Token = null);

    public sealed record MergeEntry(int Level, int Moves, int Hints, int Stars = 0, int Points = 0);

    public sealed record MergeRequest(IReadOnlyList<MergeEntry> Levels);
}
