using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Sharing;

/// <summary>
/// The public page behind a shared result link.
///
/// Results are recorded by the completion endpoints as they score, so this slice only reads.
/// It needs no actor: a shared result is written once and never changes, so there is no state
/// to own and nothing to serialise access to. Not output-cached either, because the player's
/// name and the result's rank move after it was recorded.
/// </summary>
public sealed class SharingSlice : ISlice
{
    public static string Name => "sharing";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var codes = endpoints.ServiceProvider.GetRequiredService<LevelCodes>();
        var group = endpoints.MapGroup("/api/v1/shares").WithTags("Sharing");

        group.MapGet("/{id}", async (string id, PuzzleStore store, CancellationToken token) =>
        {
            var result = await store.FindSharedResultAsync(id, token);
            if (result is null)
            {
                return Results.NotFound();
            }

            var player = await store.FindPlayerAsync(result.PlayerId, token);
            var who = player is { IsAnonymous: false, Username: not null }
                ? new { username = player.Username, ball = player.ProfileBall }
                : null;

            if (result is { Kind: "daily", Date: not null })
            {
                var date = DateOnly.ParseExact(result.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture);
                var (position, total) = await store.RankDailyResultAsync(
                    result.Date, result.PlayerId, result.Stars, result.Moves, result.ElapsedTimeMs, token);

                return Results.Ok(new
                {
                    kind = "daily",
                    date = result.Date,
                    isToday = date == DateOnly.FromDateTime(DateTime.UtcNow),
                    stars = result.Stars,
                    moves = result.Moves,
                    hints = result.Hints,
                    elapsedTimeMs = result.ElapsedTimeMs,
                    par = result.Par,
                    timeTargetMs = result.TimeTargetMs,
                    player = who,
                    board = BoardOf(DailyChallenge.BoardForDate(date)),
                    rank = new { position, total },
                });
            }

            var levelId = result.Level!.Value;
            var (levelPosition, levelTotal) = await store.RankLevelResultAsync(
                levelId, result.PlayerId, result.Stars, result.Moves, result.ElapsedTimeMs, token);

            return Results.Ok(new
            {
                kind = "level",
                level = levelId,
                code = codes.CodeFor(levelId),
                stars = result.Stars,
                moves = result.Moves,
                hints = result.Hints,
                elapsedTimeMs = result.ElapsedTimeMs,
                par = result.Par,
                timeTargetMs = result.TimeTargetMs,
                player = who,
                board = BoardOf(LevelCatalogue.Build(levelId)),
                rank = new { position = levelPosition, total = levelTotal },
            });
        })
        .WithName("GetSharedResult");
    }

    /// <summary>The starting board, in the same shape the level and daily endpoints serve it.</summary>
    private static object BoardOf(Level level) => new
    {
        tubes = level.Board.Tubes
            .Select(t => Enumerable.Range(0, t.Count).Select(s => (int)t.ColourAt(s)).ToArray())
            .ToArray(),
        capacity = level.Board.Capacity,
    };
}
