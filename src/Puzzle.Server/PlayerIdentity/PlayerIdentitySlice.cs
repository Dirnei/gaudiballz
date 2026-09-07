using Microsoft.Extensions.DependencyInjection;

namespace Puzzle.Server.PlayerIdentity;

/// <summary>
/// Anonymous player creation, optional account linking, and the token exchange that lets
/// progress follow a player from phone to desktop.
///
/// Everything this capability needs lives in this folder - endpoints, actor, documents,
/// repository, domain logic - so a change to identity touches nothing else. Behaviour
/// arrives in the add-player-identity change; this establishes the shape.
/// </summary>
public sealed class PlayerIdentitySlice : ISlice
{
    public static string Name => "player-identity";

    public static void AddServices(IServiceCollection services)
    {
        // Repositories, the session actor and the token service register here.
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/players").WithTags("Players");

        // Placeholder so the wiring is exercised end to end before behaviour exists.
        group.MapGet("/slice", () => Results.Ok(new { slice = Name }));
    }
}
