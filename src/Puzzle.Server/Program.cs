using Puzzle.Server.PlayerIdentity;

var builder = WebApplication.CreateBuilder(args);

// Each slice registers itself. Adding a capability is a folder plus two lines here.
PlayerIdentitySlice.AddServices(builder.Services);

var app = builder.Build();

// Liveness only. Readiness gains a MongoDB ping and an actor-system check once those
// exist; probing dependencies before there are any would be theatre.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

PlayerIdentitySlice.MapEndpoints(app);

app.Run();

/// <summary>
/// Exposed so <c>WebApplicationFactory</c> boots the real application in tests rather
/// than a reconstruction of it.
/// </summary>
public partial class Program;
