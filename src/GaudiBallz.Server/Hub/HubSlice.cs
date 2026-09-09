using System.Globalization;
using Akka.Actor;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.DependencyInjection;
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

            var shaped = entries.Select((e, i) => new
            {
                rank = skip + i + 1,
                playerId = e.PlayerId,
                username = e.Username,
                totalPoints = e.TotalPoints,
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
                    viewer = new
                    {
                        rank,
                        playerId = entry.PlayerId,
                        username = entry.Username,
                        totalPoints = entry.TotalPoints,
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

            try
            {
                solvedToday = await store.CountSolvedTodayAsync();
                activeThisWeek = await store.CountActivePlayersThisWeekAsync();
            }
            catch
            {
                solvedToday = 0;
                activeThisWeek = 0;
            }

            return Results.Ok(new
            {
                onlineCount = presence.OnlineCount,
                solvedToday,
                activeThisWeek,
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

            var gamesPlayed = progress.LevelsCompleted;
            var gamesWon = progress.Levels.Values.Count(r => r.Stars > 0);
            var winRate = gamesPlayed > 0 ? (int)Math.Round(100.0 * gamesWon / gamesPlayed) : 0;

            var bestMoves = progress.Levels.Count > 0
                ? progress.Levels.MinBy(p => p.Value.Moves)
                : default;

            var (globalRank, _) = await store.GetPlayerRankAsync(playerId, null);

            var achievements = await store.LoadAchievementsAsync(playerId);

            return Results.Ok(new
            {
                totalPoints = progress.TotalPoints,
                gamesPlayed,
                gamesWon,
                winRate,
                highestLevel = progress.HighestCompleted,
                bestMoves = bestMoves.Value.Moves,
                bestMovesLevel = bestMoves.Key,
                currentStreak,
                bestStreak,
                globalRank,
                levelsCompleted = progress.LevelsCompleted,
                totalLevels = 50,
                achievementsEarned = achievements.Count,
                username = player.Username,
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

            return Results.Ok(events.Select(e => new
            {
                username = e.Username,
                eventType = e.EventType,
                detail = e.Detail,
                timestamp = e.Timestamp,
            }));
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
