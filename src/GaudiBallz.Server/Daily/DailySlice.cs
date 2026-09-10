using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;

namespace GaudiBallz.Server.Daily;

/// <summary>
/// One puzzle a day, the same for everyone.
///
/// The board is derived from the UTC date alone, so it needs no storage and can be cached
/// hard. Completions record a best-per-player result, and a per-day leaderboard shows who
/// did it quickest.
/// </summary>
public sealed class DailySlice : ISlice
{
    public static string Name => "daily-challenge";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/daily").WithTags("Daily");

        group.MapGet("/today", () =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var level = DailyChallenge.BoardForDate(today);
            var par = level.ConstructiveSolution.Count;
            var timeTargetMs = DailyChallenge.TimeTargetMs(level);

            return Results.Ok(new
            {
                date = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                tubes = level.Board.Tubes
                    .Select(t => Enumerable.Range(0, t.Count).Select(s => (int)t.ColourAt(s)).ToArray())
                    .ToArray(),
                capacity = level.Board.Capacity,
                colourCount = level.Board.ColourCount,
                parMoves = par,
                timeTargetMs,
            });
        })
        .WithName("GetDailyChallenge")
        .CacheOutput(policy => policy.Expire(TimeSpan.FromMinutes(5)));

        group.MapPost("/completions",
            async (HttpContext http, DailyCompletionRequest request,
                   PuzzleStore store, PlayerTokens tokens) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                if (request.Moves < 1 || request.Hints < 0)
                {
                    return Results.BadRequest(new { error = "A completion needs a move count." });
                }

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var dateStr = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

                var level = DailyChallenge.BoardForDate(today);
                var par = level.ConstructiveSolution.Count;
                var timeTargetMs = DailyChallenge.TimeTargetMs(level);

                var (stars, points) = Scoring.Calculate(
                    request.Moves, request.Hints, request.ElapsedTimeMs, par, timeTargetMs);

                var player = await store.FindPlayerAsync(playerId);
                var username = player is { IsAnonymous: false } ? player.Username : null;
                var ball = player?.ProfileBall;

                var isNewBest = await store.UpsertDailyResultAsync(
                    playerId, dateStr, username,
                    request.Moves, request.Hints, stars, points, request.ElapsedTimeMs ?? 0,
                    ball);

                // Record for streak tracking
                await store.RecordDailyPlayAsync(playerId, DateTime.UtcNow);

                // Activity feed for registered players
                if (player is { IsAnonymous: false, Username: not null })
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await store.RecordStructuredActivityAsync(
                                playerId, player.Username, "daily_complete",
                                $"completed the daily challenge in {request.Moves} moves",
                                "daily-completed",
                                new Dictionary<string, object>
                                {
                                    ["date"] = dateStr,
                                    ["moves"] = request.Moves,
                                    ["stars"] = stars,
                                },
                                ball);
                        }
                        catch
                        {
                            // Activity feed is best-effort.
                        }
                    });
                }

                return Results.Ok(new { stars, points, isNewBest });
            });

        group.MapGet("/leaderboard",
            async (HttpContext http, PuzzleStore store, PlayerTokens tokens, string? date) =>
            {
                string dateStr;
                if (date is not null)
                {
                    if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                            DateTimeStyles.None, out _))
                    {
                        return Results.BadRequest(new { error = "Date must be yyyy-MM-dd." });
                    }

                    dateStr = date;
                }
                else
                {
                    dateStr = DateOnly.FromDateTime(DateTime.UtcNow)
                        .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }

                var entries = await store.GetDailyLeaderboardAsync(dateStr);
                var playerIds = entries.Select(e => e.PlayerId);

                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is not null)
                {
                    playerIds = playerIds.Append(playerId);
                }

                var balls = await store.GetProfileBallsAsync(playerIds);

                var shaped = entries.Select((e, i) =>
                {
                    balls.TryGetValue(e.PlayerId, out var ball);
                    return new
                    {
                        rank = i + 1,
                        username = e.Username,
                        ball,
                        stars = e.Stars,
                        moves = e.Moves,
                        elapsedTimeMs = e.ElapsedTimeMs,
                        points = e.Points,
                    };
                }).ToArray();

                object? viewer = null;
                if (playerId is not null)
                {
                    var result = await store.FindDailyResultAsync(playerId, dateStr);
                    if (result is not null)
                    {
                        balls.TryGetValue(playerId, out var viewerBall);
                        viewer = new
                        {
                            ball = viewerBall,
                            stars = result.Stars,
                            moves = result.Moves,
                            elapsedTimeMs = result.ElapsedTimeMs,
                            points = result.Points,
                        };
                    }
                }

                return Results.Ok(new { entries = shaped, viewer });
            });
    }

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }

    public sealed record DailyCompletionRequest(int Moves, int Hints, int? ElapsedTimeMs = null);
}
