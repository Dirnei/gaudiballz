using Microsoft.Extensions.DependencyInjection;
using Puzzle.Rules;

namespace Puzzle.Server.Levels;

/// <summary>
/// Serves levels. A level is a seed plus difficulty parameters, so nothing is stored: the
/// board is regenerated on demand and is identical every time.
///
/// Level content is immutable and identical for everyone, so it needs no player, no
/// database and no actor - which is also why it can be cached hard at the edge.
/// </summary>
public sealed class LevelsSlice : ISlice
{
    public static string Name => "levels";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var codes = endpoints.ServiceProvider.GetRequiredService<LevelCodes>();
        var group = endpoints.MapGroup("/api/v1/levels").WithTags("Levels");

        group.MapGet("/{levelId:int}", (int levelId) =>
        {
            if (levelId < 1)
            {
                return Results.NotFound();
            }

            var level = LevelCatalogue.Build(levelId);

            return Results.Ok(new
            {
                levelId,
                tubes = level.Board.Tubes
                    .Select(t => Enumerable.Range(0, t.Count).Select(s => (int)t.ColourAt(s)).ToArray())
                    .ToArray(),
                capacity = level.Board.Capacity,
                colourCount = level.Board.ColourCount,
                rulesVersion = level.RulesVersion,
                generatorVersion = level.GeneratorVersion,
                parMoves = level.ConstructiveSolution.Count,
                timeTargetMs = LevelCatalogue.TimeTargetMs(levelId),
                spareTubes = level.Parameters.SpareTubes,
                chapterNote = LevelCatalogue.ChapterNote(levelId),
                code = codes.CodeFor(levelId),
            });
        })
        .WithName("GetLevel")
        // Immutable: the same id always yields the same board.
        .CacheOutput(policy => policy.Expire(TimeSpan.FromDays(365)));

        group.MapPost("/unlock", (UnlockRequest request) =>
        {
            var levelId = codes.LevelFor(request.Code);
            return levelId is null
                ? Results.BadRequest(new { error = "Invalid level code." })
                : Results.Ok(new { levelId });
        })
        .WithName("UnlockLevel");
    }

    private sealed record UnlockRequest(string Code);
}
