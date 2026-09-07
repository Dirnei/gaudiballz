using Microsoft.Extensions.DependencyInjection;

namespace Puzzle.Server;

/// <summary>
/// How a slice plugs into the application.
///
/// The composition root knows only this interface, so adding a capability means adding a
/// folder and two lines in Program.cs - never editing a shared endpoint file, a shared DI
/// module and a shared actor registry. That locality is the whole point of slicing.
/// </summary>
public interface ISlice
{
    /// <summary>A stable name, used in startup diagnostics.</summary>
    public static abstract string Name { get; }

    /// <summary>Registers the slice's services, actors and repositories.</summary>
    public static abstract void AddServices(IServiceCollection services);

    /// <summary>Maps the slice's HTTP surface.</summary>
    public static abstract void MapEndpoints(IEndpointRouteBuilder endpoints);
}
