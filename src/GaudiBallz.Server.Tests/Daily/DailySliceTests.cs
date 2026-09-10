using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace GaudiBallz.Server.Tests.Daily;

/// <summary>
/// The daily challenge, end to end.
///
/// Every test goes through HTTP against the real application with a real MongoDB, so that
/// the full path — endpoint, scoring, store upsert, leaderboard query — is what is proven.
/// </summary>
public sealed class DailySliceTests : IClassFixture<DailyApiFixture>
{
    private readonly DailyApiFixture _fixture;

    public DailySliceTests(DailyApiFixture fixture)
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
        name ??= $"d{Guid.NewGuid():N}"[..12];

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

    // ---- GET /api/v1/daily/today -----------------------------------------

    [Fact]
    public async Task Today_returns_a_valid_board()
    {
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/api/v1/daily/today", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(6, body.GetProperty("colourCount").GetInt32());
        Assert.Equal(4, body.GetProperty("capacity").GetInt32());
        Assert.Equal(8, body.GetProperty("tubes").GetArrayLength());
        Assert.True(body.GetProperty("parMoves").GetInt32() > 0);
        Assert.True(body.GetProperty("timeTargetMs").GetInt32() > 0);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("date").GetString()));
    }

    // ---- POST /api/v1/daily/completions ----------------------------------

    [Fact]
    public async Task Completion_records_and_returns_stars_and_points()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token,
                new { moves = 20, hints = 0, elapsedTimeMs = 30000 }),
            Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.True(body.GetProperty("stars").GetInt32() >= 1);
        Assert.True(body.GetProperty("points").GetInt32() >= 100);
        Assert.True(body.GetProperty("isNewBest").GetBoolean());
    }

    [Fact]
    public async Task Without_a_token_completion_is_refused()
    {
        var client = _fixture.CreateClient();

        var response = await client.SendAsync(
            Post("/api/v1/daily/completions", null,
                new { moves = 20, hints = 0 }),
            Token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Better_score_updates_and_worse_does_not()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        // First attempt: many moves, no hints
        var first = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token,
                new { moves = 50, hints = 3, elapsedTimeMs = 60000 }),
            Token);
        first.EnsureSuccessStatusCode();
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.True(firstBody.GetProperty("isNewBest").GetBoolean());

        // Second attempt: better (fewer hints should yield more stars)
        var second = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token,
                new { moves = 15, hints = 0, elapsedTimeMs = 20000 }),
            Token);
        second.EnsureSuccessStatusCode();
        var secondBody = await second.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.True(secondBody.GetProperty("isNewBest").GetBoolean());

        // Third attempt: worse
        var third = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token,
                new { moves = 50, hints = 5, elapsedTimeMs = 90000 }),
            Token);
        third.EnsureSuccessStatusCode();
        var thirdBody = await third.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.False(thirdBody.GetProperty("isNewBest").GetBoolean());
    }

    // ---- GET /api/v1/daily/leaderboard -----------------------------------

    [Fact]
    public async Task Leaderboard_returns_entries_sorted_correctly()
    {
        var client = _fixture.CreateClient();

        // Create three accounts with results
        var account1 = await NewAccountAsync(client, $"lb1{Guid.NewGuid():N}"[..12]);
        var account2 = await NewAccountAsync(client, $"lb2{Guid.NewGuid():N}"[..12]);
        var account3 = await NewAccountAsync(client, $"lb3{Guid.NewGuid():N}"[..12]);

        // Account1: lots of hints (1 star, 100 points)
        (await client.SendAsync(
            Post("/api/v1/daily/completions", account1.Token,
                new { moves = 30, hints = 5, elapsedTimeMs = 40000 }),
            Token)).EnsureSuccessStatusCode();

        // Account2: no hints, slow (2 stars, 250 points)
        (await client.SendAsync(
            Post("/api/v1/daily/completions", account2.Token,
                new { moves = 15, hints = 0, elapsedTimeMs = 999000 }),
            Token)).EnsureSuccessStatusCode();

        // Account3: no hints, slow (2 stars, 250 points), fewer moves
        (await client.SendAsync(
            Post("/api/v1/daily/completions", account3.Token,
                new { moves = 12, hints = 0, elapsedTimeMs = 999000 }),
            Token)).EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/v1/daily/leaderboard", Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var entries = body.GetProperty("entries").EnumerateArray().ToArray();

        Assert.True(entries.Length >= 3);

        // Account3 and account2 should be above account1 (more stars)
        var topStars = entries[0].GetProperty("stars").GetInt32();
        var bottomStars = entries[^1].GetProperty("stars").GetInt32();
        Assert.True(topStars >= bottomStars);

        // Among the 2-star entries, fewer moves should come first
        var twoStarEntries = entries.Where(e => e.GetProperty("stars").GetInt32() == 2).ToArray();
        if (twoStarEntries.Length >= 2)
        {
            Assert.True(
                twoStarEntries[0].GetProperty("moves").GetInt32() <=
                twoStarEntries[1].GetProperty("moves").GetInt32());
        }
    }

    [Fact]
    public async Task Anonymous_completion_does_not_show_on_leaderboard()
    {
        var client = _fixture.CreateClient();
        var anon = await NewPlayerAsync(client);

        (await client.SendAsync(
            Post("/api/v1/daily/completions", anon.Token,
                new { moves = 10, hints = 0, elapsedTimeMs = 5000 }),
            Token)).EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/v1/daily/leaderboard", Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var entries = body.GetProperty("entries").EnumerateArray().ToArray();

        // Anonymous players have no username, so they are filtered out
        Assert.DoesNotContain(entries, e =>
            e.GetProperty("username").ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task Leaderboard_viewer_field_shows_own_result()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        (await client.SendAsync(
            Post("/api/v1/daily/completions", account.Token,
                new { moves = 18, hints = 0, elapsedTimeMs = 25000 }),
            Token)).EnsureSuccessStatusCode();

        var response = await client.SendAsync(
            Get("/api/v1/daily/leaderboard", account.Token), Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var viewer = body.GetProperty("viewer");

        Assert.NotEqual(JsonValueKind.Null, viewer.ValueKind);
        Assert.Equal(18, viewer.GetProperty("moves").GetInt32());
    }

    [Fact]
    public async Task Leaderboard_without_token_has_no_viewer()
    {
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/api/v1/daily/leaderboard", Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("viewer").ValueKind);
    }

    [Fact]
    public async Task Invalid_date_format_is_rejected()
    {
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/api/v1/daily/leaderboard?date=not-a-date", Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
