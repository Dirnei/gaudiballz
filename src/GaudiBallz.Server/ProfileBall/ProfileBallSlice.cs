using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.ProfileBall;

/// <summary>
/// Which of the game's balls represents an account.
///
/// Two endpoints, and they are deliberately different in kind. The unlock table is the
/// campaign's shape — identical for everyone, unchanging for a given build, and no more
/// private than the levels themselves, so it needs no token and caches at the edge. Setting
/// a ball is per-player and gated.
///
/// The gate lives here rather than only in the picker. A dimmed ball is a courtesy to the
/// player; a refused request is the actual rule, and it is the only one of the two that
/// survives someone holding a token and a text editor.
/// </summary>
public sealed class ProfileBallSlice : ISlice
{
    private static readonly TimeSpan AskTimeout = TimeSpan.FromSeconds(5);

    public static string Name => "profile-ball";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/profile/balls", () => Results.Ok(
                LevelCatalogue.ColourUnlocks
                    .Select(unlock => new
                    {
                        colour = unlock.Colour,
                        unlocksAtLevel = unlock.UnlocksAtLevel,
                    })
                    .ToArray()))
            .WithTags("Profile")
            .WithName("GetProfileBalls")
            // Fixed for the lifetime of the build, exactly like a level.
            .CacheOutput(policy => policy.Expire(TimeSpan.FromDays(365)));

        endpoints.MapPut("/api/v1/players/me/ball",
                async (HttpContext http,
                    SetBallRequest request,
                    PuzzleStore store,
                    PlayerRegistry registry,
                    PlayerTokens tokens,
                    CancellationToken token) =>
                {
                    var playerId = tokens.Verify(BearerFrom(http));
                    if (playerId is null)
                    {
                        return Results.Unauthorized();
                    }

                    var player = await store.FindPlayerAsync(playerId, token);
                    if (player is null)
                    {
                        return Results.Unauthorized();
                    }

                    // A ball names an account. An anonymous player has a record but not an
                    // account, which is also why the picker is not offered to one.
                    if (player.IsAnonymous)
                    {
                        return Results.StatusCode(StatusCodes.Status403Forbidden);
                    }

                    // Clearing is never gated: going back to the name-derived colour asks for
                    // nothing the player has to have earned.
                    if (request.Colour is null)
                    {
                        await store.SetProfileBallAsync(playerId, null, token);
                        await store.UpdateLeaderboardBallAsync(playerId, null, token);
                        return Results.Ok(new { ball = (int?)null });
                    }

                    var colour = request.Colour.Value;
                    if (colour < 1 || colour > LevelCatalogue.MaxColour)
                    {
                        return Results.BadRequest(new { error = "That is not one of the game's colours." });
                    }

                    var snapshot = await registry.Actor.Ask<ProgressSnapshot>(
                        new LoadProgress(playerId), AskTimeout, token);

                    var unlocksAt = LevelCatalogue.ColourUnlocks
                        .Single(unlock => unlock.Colour == colour)
                        .UnlocksAtLevel;

                    if (unlocksAt > snapshot.Progress.HighestCompleted)
                    {
                        return Results.StatusCode(StatusCodes.Status403Forbidden);
                    }

                    await store.SetProfileBallAsync(playerId, colour, token);
                    await store.UpdateLeaderboardBallAsync(playerId, colour, token);
                    return Results.Ok(new { ball = (int?)colour });
                })
            .WithTags("Profile")
            .WithName("SetProfileBall");
    }

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }

    /// <summary>Null clears the choice; anything else names a colour.</summary>
    public sealed record SetBallRequest(int? Colour);
}
