using Akka.Actor;
using Akka.Configuration;
using Fido2NetLib;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Daily;
using GaudiBallz.Server.Hub;
using GaudiBallz.Server.Legal;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.PlayerIdentity;
using GaudiBallz.Server.ProfileBall;
using GaudiBallz.Server.Progression;
using Microsoft.Extensions.FileProviders;
using Microsoft.Net.Http.Headers;

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
var akkaConfig = ConfigurationFactory.ParseString($@"
    akka.persistence {{
        journal {{
            plugin = ""akka.persistence.journal.mongodb""
            mongodb {{
                class = ""Akka.Persistence.MongoDb.Journal.MongoDbJournal, Akka.Persistence.MongoDb""
                connection-string = ""{mongo.ConnectionString}""
                database = ""{mongo.Database}""
                collection = ""journal""
                auto-initialize = true
                event-adapters {{
                    tagging = ""Akka.Persistence.Journal.EventAdapters+IdentityEventAdapter, Akka.Persistence""
                }}
            }}
        }}
        snapshot-store {{
            plugin = ""akka.persistence.snapshot-store.mongodb""
            mongodb {{
                class = ""Akka.Persistence.MongoDb.Snapshot.MongoDbSnapshotStore, Akka.Persistence.MongoDb""
                connection-string = ""{mongo.ConnectionString}""
                database = ""{mongo.Database}""
                collection = ""snapshots""
                auto-initialize = true
            }}
        }}
    }}
");
var actors = ActorSystem.Create("puzzle", akkaConfig);
builder.Services.AddSingleton(actors);
builder.Services.AddSingleton(new PlayerRegistry(
    actors.ActorOf(PlayerRegistryActor.PropsFor(store), "players")));

builder.Services.AddSingleton(new AchievementRegistry(
    actors.ActorOf(AchievementRegistryActor.PropsFor(store), "achievements")));

builder.Services.AddSingleton(new CompletionJournalRegistry(
    actors.ActorOf(CompletionJournalRegistryActor.PropsFor(), "completion-journal")));

builder.Services.AddSingleton(new WalletRegistry(
    actors.ActorOf(WalletRegistryActor.PropsFor(), "wallets")));

builder.Services.AddHostedService<LevelLeaderboardProjection>();

builder.Services.AddSingleton(new LevelCodes(
    builder.Configuration["LevelCodes:Secret"]
    ?? "local-development-level-code-secret"));

// ---- email (conditional) -------------------------------------------------

var smtpHost = builder.Configuration["Smtp:Host"];
if (!string.IsNullOrEmpty(smtpHost))
{
    var smtp = new SmtpOptions
    {
        Host = smtpHost,
        Port = int.TryParse(builder.Configuration["Smtp:Port"], out var p) ? p : 587,
        Username = builder.Configuration["Smtp:Username"],
        Password = builder.Configuration["Smtp:Password"],
        From = builder.Configuration["Smtp:From"] ?? "noreply@example.com",
    };
    builder.Services.AddSingleton(smtp);
    builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
}

builder.Services.AddSingleton<EmailCodeStore>();

// ---- slices ---------------------------------------------------------------

PlayerIdentitySlice.AddServices(builder.Services);
ProgressionSlice.AddServices(builder.Services);
LevelsSlice.AddServices(builder.Services);
ProfileBallSlice.AddServices(builder.Services);
AchievementsSlice.AddServices(builder.Services);
HubSlice.AddServices(builder.Services);
DailySlice.AddServices(builder.Services);
LegalSlice.AddServices(builder.Services);

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

// Vite fingerprints JS/CSS into /assets/ with content hashes — immutable forever.
// Everything else (index.html, manifest, icons) must revalidate so deploys land immediately.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? "";
        if (path.StartsWith("/assets/", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers[HeaderNames.CacheControl] =
                "public, max-age=31536000, immutable";
        }
        else
        {
            ctx.Context.Response.Headers[HeaderNames.CacheControl] = "no-cache";
        }
    }
});

// Default cache policy: API responses get no-store (data changes constantly), everything
// else gets no-cache (revalidate on every request). Static files served through
// UseStaticFiles already have Cache-Control set by OnPrepareResponse above, so the
// ContainsKey guard skips them.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        if (!context.Response.Headers.ContainsKey(HeaderNames.CacheControl))
        {
            var path = context.Request.Path.Value ?? "";
            context.Response.Headers[HeaderNames.CacheControl] =
                path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
                    ? "no-store"
                    : "no-cache";
        }
        return Task.CompletedTask;
    });
    await next();
});

// Liveness only. Readiness would need a database ping, and the game deliberately stays
// playable when the database is down - only recording progress fails, which the client
// queues.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

PlayerIdentitySlice.MapEndpoints(app);
ProgressionSlice.MapEndpoints(app);
LevelsSlice.MapEndpoints(app);
ProfileBallSlice.MapEndpoints(app);
AchievementsSlice.MapEndpoints(app);
HubSlice.MapEndpoints(app);
DailySlice.MapEndpoints(app);
LegalSlice.MapEndpoints(app);

// Anything that is not an API route or a real file is the SPA: the client owns its own
// routing, so a deep link has to reach index.html rather than 404.
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>
/// Exposed so <c>WebApplicationFactory</c> can boot the real application in integration
/// tests rather than a reconstruction of it.
/// </summary>
public partial class Program;
