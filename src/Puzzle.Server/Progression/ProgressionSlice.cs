using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using Puzzle.Server.PlayerIdentity;

namespace Puzzle.Server.Progression;

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
            async (HttpContext http, CompletionRequest request, PlayerRegistry registry, PlayerTokens tokens) =>
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

                var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                    new RecordCompletion(playerId, request.Level, new LevelResult(request.Moves, request.Hints)),
                    AskTimeout);

                return Results.Ok(Shape(snapshot));
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
                        incoming = incoming.With(entry.Level, new LevelResult(entry.Moves, entry.Hints));
                    }
                }

                var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                    new MergeDeviceProgress(playerId, incoming), AskTimeout);

                return Results.Ok(Shape(snapshot));
            });
    }

    private static object Shape(ProgressSnapshot snapshot) => new
    {
        levelsCompleted = snapshot.Progress.LevelsCompleted,
        highestCompleted = snapshot.Progress.HighestCompleted,
        levels = snapshot.Progress.Levels
            .OrderBy(pair => pair.Key)
            .Select(pair => new { level = pair.Key, moves = pair.Value.Moves, hints = pair.Value.Hints })
            .ToArray(),
    };

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }

    public sealed record CompletionRequest(int Level, int Moves, int Hints);

    public sealed record MergeEntry(int Level, int Moves, int Hints);

    public sealed record MergeRequest(IReadOnlyList<MergeEntry> Levels);
}
