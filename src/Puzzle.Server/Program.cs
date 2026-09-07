using Puzzle.Server.Levels;
using Puzzle.Server.PlayerIdentity;

var builder = WebApplication.CreateBuilder(args);

// Each slice registers itself. Adding a capability is a folder plus two lines here.
PlayerIdentitySlice.AddServices(builder.Services);
LevelsSlice.AddServices(builder.Services);

builder.Services.AddOutputCache();

// The client is served from a different origin in development.
builder.Services.AddCors(options => options.AddDefaultPolicy(
    policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseOutputCache();

// Kestrel serves the built client itself - no reverse proxy in front. In development the
// client runs on its own Vite server instead and wwwroot simply does not exist.
app.UseDefaultFiles();
app.UseStaticFiles();

// Liveness only. Readiness gains a MongoDB ping and an actor-system check once those
// exist; probing dependencies before there are any would be theatre.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

PlayerIdentitySlice.MapEndpoints(app);
LevelsSlice.MapEndpoints(app);

// Anything that is not an API route or a real file is the SPA: the client owns its own
// routing, so a deep link has to reach index.html rather than 404.
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>
/// Exposed so <c>WebApplicationFactory</c> boots the real application in tests rather
/// than a reconstruction of it.
/// </summary>
public partial class Program;
