using System.Collections.Immutable;
using System.Globalization;
using Akka.Actor;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Hub;

public sealed class HubSlice : ISlice
{
    public static string Name => "gaming-hub";

    public static void AddServices(IServiceCollection services)
    {
        services.AddSingleton<PresenceTracker>();
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/hub").WithTags("Hub");

        group.MapGet("/leaderboard", async (
            HttpContext http,
            PuzzleStore store,
            PlayerTokens tokens,
            string? period,
            int? offset,
            int? limit) =>
        {
            var take = limit is >= 1 and <= 100 ? limit.Value : 20;
            var skip = offset is >= 0 ? offset.Value : 0;

            var periodKey = ResolvePeriod(period);

            var entries = await store.QueryLeaderboardAsync(periodKey, skip, take);

            var allTimeXp = periodKey is not null
                ? await store.GetAllTimeXpAsync(entries.Select(e => e.PlayerId))
                : null;

            var shaped = entries.Select((e, i) => new
            {
                rank = skip + i + 1,
                playerId = e.PlayerId,
                username = e.Username,
                ball = e.ProfileBall,
                totalPoints = e.TotalPoints,
                allTimeXp = allTimeXp is not null && allTimeXp.TryGetValue(e.PlayerId, out var xp)
                    ? xp
                    : e.TotalPoints,
                gamesPlayed = e.GamesPlayed,
                gamesWon = e.GamesWon,
            }).ToArray();

            var playerId = tokens.Verify(BearerFrom(http));
            object? viewer = null;
            if (playerId is not null)
            {
                var (rank, entry) = await store.GetPlayerRankAsync(playerId, periodKey);
                if (entry is not null)
                {
                    var viewerAllTimeXp = entry.TotalPoints;
                    if (periodKey is not null)
                    {
                        var xpMap = await store.GetAllTimeXpAsync([playerId]);
                        if (xpMap.TryGetValue(playerId, out var vxp))
                        {
                            viewerAllTimeXp = vxp;
                        }
                    }

                    viewer = new
                    {
                        rank,
                        playerId = entry.PlayerId,
                        username = entry.Username,
                        ball = entry.ProfileBall,
                        totalPoints = entry.TotalPoints,
                        allTimeXp = viewerAllTimeXp,
                        gamesPlayed = entry.GamesPlayed,
                        gamesWon = entry.GamesWon,
                    };
                }
            }

            return Results.Ok(new { entries = shaped, viewer });
        });

        group.MapGet("/community-stats", [OutputCache(Duration = 30)] async (
            PuzzleStore store,
            PresenceTracker presence) =>
        {
            long solvedToday;
            long activeThisWeek;
            Dictionary<DateTime, int> dailyActivity;

            try
            {
                solvedToday = await store.CountSolvedTodayAsync();
                activeThisWeek = await store.CountActivePlayersThisWeekAsync();
                dailyActivity = await store.GetGlobalDailyActivityAsync();
            }
            catch
            {
                solvedToday = 0;
                activeThisWeek = 0;
                dailyActivity = new();
            }

            var allActivity = await store.GetGlobalDailyActivityAsync(days: 365);

            var today = DateTime.UtcNow.Date;
            var historyStart = today.AddDays(-27);
            var dailyHistory = Enumerable.Range(0, 28)
                .Select(i => historyStart.AddDays(i))
                .Select(d => new
                {
                    date = d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    count = dailyActivity.GetValueOrDefault(d, 0),
                })
                .ToArray();

            var weekStart = today.AddDays(-(int)(today.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)today.DayOfWeek - 1));
            var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var gamesThisWeek = allActivity.Where(kv => kv.Key >= weekStart).Sum(kv => kv.Value);
            var gamesThisMonth = allActivity.Where(kv => kv.Key >= monthStart).Sum(kv => kv.Value);
            var gamesAllTime = allActivity.Sum(kv => kv.Value);

            return Results.Ok(new
            {
                onlineCount = presence.OnlineCount,
                solvedToday,
                activeThisWeek,
                dailyHistory,
                gamesThisWeek,
                gamesThisMonth,
                gamesAllTime,
            });
        });

        group.MapGet("/player/stats", async (
            HttpContext http,
            PuzzleStore store,
            PlayerTokens tokens,
            PlayerRegistry registry) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is null)
            {
                return Results.Unauthorized();
            }

            var player = await store.FindPlayerAsync(playerId);
            if (player is null)
            {
                return Results.Unauthorized();
            }

            var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                new LoadProgress(playerId), TimeSpan.FromSeconds(5));
            var progress = snapshot.Progress;

            var dailyPlay = await store.LoadDailyPlayAsync(playerId);
            var currentStreak = CalculateStreak(dailyPlay);
            var bestStreak = CalculateBestStreak(dailyPlay);

            var today = DateTime.UtcNow.Date;
            var weekStart = today.AddDays(-(int)(today.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)today.DayOfWeek - 1));
            var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var gamesThisWeek = dailyPlay.Where(d => d.Date >= weekStart).Sum(d => d.CompletionCount);
            var gamesThisMonth = dailyPlay.Where(d => d.Date >= monthStart).Sum(d => d.CompletionCount);
            var gamesAllTime = dailyPlay.Sum(d => d.CompletionCount);

            var historyStart = today.AddDays(-27);
            var dailyLookup = dailyPlay
                .Where(d => d.Date >= historyStart)
                .ToDictionary(d => d.Date, d => d.CompletionCount);
            var dailyHistory = Enumerable.Range(0, 28)
                .Select(i => historyStart.AddDays(i))
                .Select(d => new { date = d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), count = dailyLookup.GetValueOrDefault(d, 0) })
                .ToArray();

            var gamesPlayed = progress.LevelsCompleted;
            var gamesWon = progress.Levels.Values.Count(r => r.Stars > 0);
            var winRate = gamesPlayed > 0 ? (int)Math.Round(100.0 * gamesWon / gamesPlayed) : 0;

            var bestMoves = progress.Levels.Count > 0
                ? progress.Levels.MinBy(p => p.Value.Moves)
                : default;

            var (globalRank, _) = await store.GetPlayerRankAsync(playerId, null);

            var achievements = await store.LoadAchievementsAsync(playerId);

            var (rankTier, rankSubLevel) = RankTier.FromXp(progress.TotalPoints);
            var nextThreshold = RankTier.NextThreshold(progress.TotalPoints);

            var badges = await store.LoadBadgesAsync(playerId);
            var earnedBadgeIds = badges.Select(b => b.BadgeId).ToHashSet();

            var catchUp = BadgeCatalogue.Evaluate(
                progress, earnedBadgeIds.ToImmutableHashSet());
            foreach (var badgeId in catchUp)
            {
                await store.AwardBadgeAsync(playerId, badgeId);
                earnedBadgeIds.Add(badgeId);
            }

            var badgeShelf = BadgeCatalogue.All.Select(b => new
            {
                id = b.Id,
                name = b.Name,
                description = b.Description,
                category = b.Category.ToString().ToLowerInvariant(),
                earned = earnedBadgeIds.Contains(b.Id),
                progress = earnedBadgeIds.Contains(b.Id) ? (int?)null : BadgeCatalogue.ProgressFor(b.Id, progress),
                threshold = b.Threshold,
                isRare = b.IsRare,
            }).ToArray();

            return Results.Ok(new
            {
                totalPoints = progress.TotalPoints,
                gamesPlayed,
                gamesWon,
                winRate,
                highestLevel = progress.HighestCompleted,
                bestMoves = bestMoves.Value.Moves,
                bestMovesLevel = bestMoves.Key,
                gamesThisWeek,
                gamesThisMonth,
                gamesAllTime,
                dailyHistory,
                currentStreak,
                bestStreak,
                globalRank,
                levelsCompleted = progress.LevelsCompleted,
                totalLevels = 50,
                achievementsEarned = achievements.Count,
                username = player.Username,
                rank = new
                {
                    tier = rankTier.ToString().ToLowerInvariant(),
                    subLevel = rankSubLevel,
                    currentXp = progress.TotalPoints,
                    nextThreshold,
                },
                badges = badgeShelf,
            });
        });

        group.MapGet("/activity-feed", async (PuzzleStore store, int? limit) =>
        {
            var count = limit is > 0 and <= 50 ? limit.Value : 20;

            List<ActivityFeedDocument> events;
            try
            {
                events = await store.GetRecentActivityAsync(count);
            }
            catch
            {
                events = [];
            }

            var balls = await store.GetProfileBallsAsync(events.Select(e => e.PlayerId));

            return Results.Ok(events.Select(e =>
            {
                balls.TryGetValue(e.PlayerId, out var ball);
                return e.Kind is not null
                    ? (object)new
                    {
                        username = e.Username,
                        ball,
                        eventType = e.EventType,
                        kind = e.Kind,
                        @params = e.Params,
                        detail = e.Detail,
                        timestamp = e.Timestamp,
                    }
                    : new
                    {
                        username = e.Username,
                        ball,
                        eventType = e.EventType,
                        kind = "legacy",
                        text = e.Detail,
                        timestamp = e.Timestamp,
                    };
            }));
        });

        group.MapGet("/level-leaderboard", async (
            HttpContext http,
            PuzzleStore store,
            PlayerTokens tokens,
            int level,
            string? period) =>
        {
            if (level < 1)
            {
                return Results.BadRequest(new { error = "Level must be at least 1." });
            }

            var periodKey = period switch
            {
                "week" => WeekPeriod(),
                "today" => DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                _ => (string?)null,
            };

            var entries = await store.GetLevelLeaderboardAsync(level, periodKey);

            var allTimeXp = await store.GetAllTimeXpAsync(entries.Select(e => e.PlayerId));

            var shaped = entries.Select((e, i) => new
            {
                rank = i + 1,
                playerId = e.PlayerId,
                username = e.Username,
                ball = e.ProfileBall,
                stars = e.BestStars,
                moves = e.BestMoves,
                timeMs = e.BestTimeMs,
                allTimeXp = allTimeXp.GetValueOrDefault(e.PlayerId, 0),
            }).ToArray();

            var playerId = tokens.Verify(BearerFrom(http));
            object? viewer = null;
            if (playerId is not null)
            {
                var (rank, entry) = await store.GetLevelPlayerRankAsync(level, playerId, periodKey);
                if (entry is not null)
                {
                    viewer = new
                    {
                        rank,
                        stars = entry.BestStars,
                        moves = entry.BestMoves,
                        timeMs = entry.BestTimeMs,
                    };
                }
            }

            return Results.Ok(new { entries = shaped, viewer });
        });

        group.MapPost("/heartbeat", (
            HttpContext http,
            PlayerTokens tokens,
            PresenceTracker presence) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is not null)
            {
                presence.Touch(playerId);
            }

            return Results.Ok();
        });
    }

    private static string? ResolvePeriod(string? period) => period switch
    {
        "week" => WeekPeriod(),
        "today" => DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        _ => null,
    };

    private static string WeekPeriod()
    {
        var today = DateTime.UtcNow.Date;
        var cal = CultureInfo.InvariantCulture.Calendar;
        var week = cal.GetWeekOfYear(today, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        return $"{today.Year}-W{week:D2}";
    }

    private static int CalculateStreak(List<DailyPlayDocument> dailyPlay)
    {
        if (dailyPlay.Count == 0)
        {
            return 0;
        }

        var dates = dailyPlay
            .Select(d => d.Date.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        var today = DateTime.UtcNow.Date;
        if (dates[0] != today && dates[0] != today.AddDays(-1))
        {
            return 0;
        }

        var streak = 1;
        for (var i = 1; i < dates.Count; i++)
        {
            if (dates[i - 1] - dates[i] == TimeSpan.FromDays(1))
            {
                streak++;
            }
            else
            {
                break;
            }
        }

        return streak;
    }

    private static int CalculateBestStreak(List<DailyPlayDocument> dailyPlay)
    {
        if (dailyPlay.Count == 0)
        {
            return 0;
        }

        var dates = dailyPlay
            .Select(d => d.Date.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        var best = 1;
        var current = 1;

        for (var i = 1; i < dates.Count; i++)
        {
            if (dates[i] - dates[i - 1] == TimeSpan.FromDays(1))
            {
                current++;
                best = Math.Max(best, current);
            }
            else
            {
                current = 1;
            }
        }

        return best;
    }

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }
}
