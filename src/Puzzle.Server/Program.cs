using Akka.Actor;
using Fido2NetLib;
using Puzzle.Server.Levels;
using Puzzle.Server.Persistence;
using Puzzle.Server.PlayerIdentity;
using Puzzle.Server.ProfileBall;
using Puzzle.Server.Progression;

var builder = WebApplication.CreateBuilder(args);

// ---- infrastructure -------------------------------------------------------

var mongo = new MongoOptions();
builder.Configuration.GetSection("Mongo").Bind(mongo);
var store = new PuzzleStore(mongo);
builder.Services.AddSingleton(store);
builder.Services.AddHostedService<IndexInitializer>();

builder.Services.AddSingleton(new PlayerTokens(
    builder.Configuration["Auth:SigningKey"]
    // Fine for local play: the only thing behind a token is which puzzles someone finished.
    // A deployment that matters supplies its own, and rotating it only costs anonymous
    // sessions their token — enrolled passkeys still resolve to the same account.
    ?? "local-development-signing-key-not-for-anything-that-matters"));

builder.Services.AddFido2(options =>
{
    options.ServerDomain = builder.Configuration["Passkeys:Domain"] ?? "localhost";
    options.ServerName = "Sort Puzzle";
    options.Origins = (builder.Configuration["Passkeys:Origins"] ?? "http://localhost:8123,http://localhost:5175")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .ToHashSet();
});

// One actor system, one registry. The registry creates a session actor per player on demand
// and stops it when idle.
var actors = ActorSystem.Create("puzzle");
builder.Services.AddSingleton(actors);
builder.Services.AddSingleton(new PlayerRegistry(
    actors.ActorOf(PlayerRegistryActor.PropsFor(store), "players")));

builder.Services.AddSingleton(new LevelCodes(
    builder.Configuration["LevelCodes:Secret"]
    ?? "local-development-level-code-secret"));

// ---- slices ---------------------------------------------------------------

PlayerIdentitySlice.AddServices(builder.Services);
ProgressionSlice.AddServices(builder.Services);
LevelsSlice.AddServices(builder.Services);
ProfileBallSlice.AddServices(builder.Services);

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

// Liveness only. Readiness would need a database ping, and the game deliberately stays
// playable when the database is down - only recording progress fails, which the client
// queues.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

PlayerIdentitySlice.MapEndpoints(app);
ProgressionSlice.MapEndpoints(app);
LevelsSlice.MapEndpoints(app);
ProfileBallSlice.MapEndpoints(app);

// Anything that is not an API route or a real file is the SPA: the client owns its own
// routing, so a deep link has to reach index.html rather than 404.
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>
/// Exposed so <c>WebApplicationFactory</c> can boot the real application in integration
/// tests rather than a reconstruction of it.
/// </summary>
public partial class Program;
