using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using Puzzle.Server.Persistence;
using Puzzle.Server.PlayerIdentity;

namespace Puzzle.Server.Achievements;

public sealed class AchievementsSlice : ISlice
{
    private static readonly TimeSpan AskTimeout = TimeSpan.FromSeconds(5);

    public static string Name => "player-achievements";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/achievements").WithTags("Achievements");

        group.MapGet("/", async (HttpContext http, PlayerTokens tokens, PuzzleStore store,
                                  AchievementRegistry registry) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is null)
            {
                return Results.Unauthorized();
            }

            var player = await store.FindPlayerAsync(playerId);
            if (player is null or { IsAnonymous: true })
            {
                return Results.Unauthorized();
            }

            var existingDocs = await store.LoadAchievementsAsync(playerId);
            var awarded = existingDocs.ToDictionary(d => d.AchievementId, d => d.AwardedAt);

            var progress = await store.LoadProgressAsync(playerId);
            var dailyPlay = await store.LoadDailyPlayAsync(playerId);

            var achievements = AchievementCatalogue.All.Select(def =>
            {
                var earned = awarded.TryGetValue(def.Id, out var awardedAt);
                return new
                {
                    id = def.Id,
                    name = def.Name,
                    description = def.Description,
                    category = def.Category.ToString().ToLowerInvariant(),
                    earned,
                    awardedAt = earned ? awardedAt : (DateTime?)null,
                    threshold = def.Threshold,
                    progress = def.Threshold is not null
                        ? AchievementCatalogue.ProgressFor(def.Id, progress, dailyPlay)
                        : (int?)null,
                };
            }).ToArray();

            return Results.Ok(new { achievements });
        });
    }

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }
}
