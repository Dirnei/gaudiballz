using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using Puzzle.Rules;
using Puzzle.Server.Achievements;
using Puzzle.Server.Levels;
using Puzzle.Server.Persistence;
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
                   PlayerTokens tokens, PuzzleStore store, AchievementRegistry achievements) =>
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
                var previousPoints = before.Progress.Levels.TryGetValue(request.Level, out var prev)
                    ? prev.Points : 0;
                var starDelta = Math.Max(0, attemptPoints - previousPoints);

                var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                    new RecordCompletion(playerId, request.Level, levelResult),
                    AskTimeout);

                var (replayBonus, timeBonus) = await store.RecordCompletionBonusAsync(
                    playerId, request.Level, request.ElapsedTimeMs, isReplay);

                var newAchievements = Array.Empty<object>();

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
                    }
                    catch (TaskCanceledException)
                    {
                        // Timeout — achievements still awarded asynchronously
                    }
                }

                return Results.Ok(ShapeCompletion(
                    snapshot, attemptStars, attemptPoints, starDelta, replayBonus, timeBonus, newAchievements));
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

    private static object Shape(ProgressSnapshot snapshot) => new
    {
        levelsCompleted = snapshot.Progress.LevelsCompleted,
        highestCompleted = snapshot.Progress.HighestCompleted,
        totalPoints = snapshot.Progress.TotalPoints,
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

    private static object ShapeCompletion(
        ProgressSnapshot snapshot, int attemptStars, int attemptPoints,
        int starDelta, int replayBonus, int timeBonus, object[] newAchievements) => new
    {
        levelsCompleted = snapshot.Progress.LevelsCompleted,
        highestCompleted = snapshot.Progress.HighestCompleted,
        totalPoints = snapshot.Progress.TotalPoints + replayBonus + timeBonus,
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
        replayBonus,
        timeBonus,
        newAchievements,
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
