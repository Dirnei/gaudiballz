using Microsoft.Extensions.DependencyInjection;

namespace GaudiBallz.Server.Legal;

public sealed class LegalSlice : ISlice
{
    public static string Name => "legal";

    public static void AddServices(IServiceCollection services) { }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/legal/contact", (IConfiguration config) =>
        {
            var section = config.GetSection("Legal");
            return Results.Ok(new
            {
                name = section["Name"] ?? "",
                street = section["Street"] ?? "",
                city = section["City"] ?? "",
                country = section["Country"] ?? "",
                email = section["Email"] ?? "",
            });
        });
    }
}
