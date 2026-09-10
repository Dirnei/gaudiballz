using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace GaudiBallz.Server.Tests.Hub;

/// <summary>
/// Verifies that the profile ball colour is propagated into leaderboard and activity feed
/// API responses, following the same denormalization pattern as Username.
/// </summary>
public sealed class HubBallTests : IClassFixture<HubApiFixture>
{
    private readonly HubApiFixture _fixture;

    public HubBallTests(HubApiFixture fixture)
    {
        _fixture = fixture;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private sealed record Anonymous(string PlayerId, string Token, bool IsAnonymous);

    private static async Task<Anonymous> NewPlayerAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/v1/players/anonymous", null, Token);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<Anonymous>(Token))!;
    }

    private async Task<Anonymous> NewAccountAsync(HttpClient client, string? name = null)
    {
        var player = await NewPlayerAsync(client);
        name ??= $"h{Guid.NewGuid():N}"[..12];

        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);

        return player;
    }

    private static HttpRequestMessage Post(string url, string? token, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body),
        };

        if (token is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }

        return request;
    }

    private static HttpRequestMessage Get(string url, string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);

        if (token is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }

        return request;
    }

    private static HttpRequestMessage Put(string url, string? token, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(body),
        };

        if (token is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }

        return request;
    }

    private static async Task CompleteAsync(HttpClient client, string token, int level)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/completions")
        {
            Content = JsonContent.Create(new { level, moves = 20, hints = 0 }),
        };
        request.Headers.Add("Authorization", $"Bearer {token}");

        var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
    }

    // ---- leaderboard includes ball -----------------------------------------

    [Fact]
    public async Task Leaderboard_entries_include_ball_field()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        // Complete a level so the player appears on the leaderboard
        await CompleteAsync(client, account.Token, 1);

        // Set a profile ball
        (await client.SendAsync(
            Put("/api/v1/players/me/ball", account.Token, new { colour = 2 }),
            Token)).EnsureSuccessStatusCode();

        // Complete another level to trigger leaderboard upsert with the ball
        await CompleteAsync(client, account.Token, 2);

        var response = await client.SendAsync(
            Get("/api/hub/leaderboard", account.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var entries = body.GetProperty("entries").EnumerateArray().ToArray();

        // The entries array should have a ball property
        var entry = entries.FirstOrDefault(e =>
            e.GetProperty("playerId").GetString() == account.PlayerId);

        Assert.True(entry.ValueKind != JsonValueKind.Undefined,
            "Player should appear on the leaderboard");
        Assert.True(entry.TryGetProperty("ball", out _),
            "Leaderboard entry should include a ball field");
    }

    [Fact]
    public async Task Leaderboard_viewer_includes_ball_field()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 1);

        // Set ball
        (await client.SendAsync(
            Put("/api/v1/players/me/ball", account.Token, new { colour = 3 }),
            Token)).EnsureSuccessStatusCode();

        // Complete again to trigger leaderboard upsert
        await CompleteAsync(client, account.Token, 2);

        var response = await client.SendAsync(
            Get("/api/hub/leaderboard", account.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var viewer = body.GetProperty("viewer");

        Assert.NotEqual(JsonValueKind.Null, viewer.ValueKind);
        Assert.True(viewer.TryGetProperty("ball", out _),
            "Viewer should include a ball field");
    }

    // ---- activity feed includes ball ---------------------------------------

    [Fact]
    public async Task Activity_feed_entries_include_ball_field()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 1);

        // Set a ball
        (await client.SendAsync(
            Put("/api/v1/players/me/ball", account.Token, new { colour = 1 }),
            Token)).EnsureSuccessStatusCode();

        // Complete another level to produce an activity feed event with the ball
        await CompleteAsync(client, account.Token, 2);

        // Give the fire-and-forget task a moment to settle
        await Task.Delay(500, Token);

        var response = await client.GetAsync("/api/hub/activity-feed", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var events = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var entries = events.EnumerateArray().ToArray();

        Assert.True(entries.Length > 0, "Activity feed should have entries");

        // Every entry should have a ball property
        foreach (var entry in entries)
        {
            Assert.True(entry.TryGetProperty("ball", out _),
                "Activity feed entry should include a ball field");
        }
    }

    // ---- ball change propagates to leaderboard -----------------------------

    [Fact]
    public async Task Changing_ball_updates_leaderboard_entries()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        // Complete levels so leaderboard is populated
        await CompleteAsync(client, account.Token, 1);
        await CompleteAsync(client, account.Token, 2);

        // Set ball to colour 2
        (await client.SendAsync(
            Put("/api/v1/players/me/ball", account.Token, new { colour = 2 }),
            Token)).EnsureSuccessStatusCode();

        // The SetBall endpoint updates leaderboard entries directly
        var response = await client.SendAsync(
            Get("/api/hub/leaderboard", account.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var viewer = body.GetProperty("viewer");

        Assert.NotEqual(JsonValueKind.Null, viewer.ValueKind);
        Assert.Equal(2, viewer.GetProperty("ball").GetInt32());

        // Change the ball to colour 3
        (await client.SendAsync(
            Put("/api/v1/players/me/ball", account.Token, new { colour = 3 }),
            Token)).EnsureSuccessStatusCode();

        response = await client.SendAsync(
            Get("/api/hub/leaderboard", account.Token), Token);
        body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        viewer = body.GetProperty("viewer");

        Assert.NotEqual(JsonValueKind.Null, viewer.ValueKind);
        Assert.Equal(3, viewer.GetProperty("ball").GetInt32());
    }
}
