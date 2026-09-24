using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GaudiBallz.Server.Tests.Hub;

namespace GaudiBallz.Server.Tests.Progression;

/// <summary>
/// Reporting an attempt that ended without a completion.
///
/// The endpoint has to tolerate being told the same thing twice and being called without a
/// header, because the two callers are a player confirming a departure and a tab closing
/// underneath them.
/// </summary>
[Collection(SharedHubApi.Name)]
public sealed class AttemptEndpointTests
{
    private readonly HubApiFixture _fixture;

    public AttemptEndpointTests(HubApiFixture fixture)
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

    private static async Task<HttpResponseMessage> EndAsync(
        HttpClient client, string? bearer, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/attempts/end")
        {
            Content = JsonContent.Create(body),
        };
        if (bearer is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {bearer}");
        }

        return await client.SendAsync(request, Token);
    }

    private static async Task<(int Attempts, int Completions)> CountsOf(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        return (body.GetProperty("attempts").GetInt32(), body.GetProperty("completions").GetInt32());
    }

    private static async Task<HttpResponseMessage> StartAsync(
        HttpClient client, string? bearer, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/attempts/start")
        {
            Content = JsonContent.Create(body),
        };
        if (bearer is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {bearer}");
        }

        return await client.SendAsync(request, Token);
    }

    [Theory]
    [InlineData("campaign")]
    [InlineData("daily")]
    public async Task A_started_game_is_counted_for_today(string mode)
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await StartAsync(client, player.Token, new { mode });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var start = Assert.Single(await _fixture.Store.LoadGameStartsAsync(player.PlayerId, Token));
        Assert.Equal(1, start.Starts);
        Assert.Equal(DateTime.UtcNow.Date, start.Date);
    }

    [Fact]
    public async Task Starting_a_game_needs_a_token()
    {
        var client = _fixture.CreateClient();

        var response = await StartAsync(client, null, new { mode = "campaign" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Starting_a_game_in_an_unknown_mode_is_refused()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await StartAsync(client, player.Token, new { mode = "arcade" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await _fixture.Store.LoadGameStartsAsync(player.PlayerId, Token));
    }

    [Fact]
    public async Task An_abandoned_attempt_is_recorded_as_a_loss()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await EndAsync(client, player.Token,
            new { level = 1, attemptId = "a1", outcome = "abandoned" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (attempts, completions) = await CountsOf(response);
        Assert.Equal(1, attempts);
        Assert.Equal(0, completions);
    }

    [Fact]
    public async Task A_restarted_attempt_is_recorded_as_a_loss()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await EndAsync(client, player.Token,
            new { level = 4, attemptId = "a1", outcome = "restarted" });

        var (attempts, completions) = await CountsOf(response);
        Assert.Equal(1, attempts);
        Assert.Equal(0, completions);
    }

    [Fact]
    public async Task Reporting_the_same_ending_twice_changes_nothing()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var body = new { level = 1, attemptId = "dup", outcome = "abandoned" };

        var first = await CountsOf(await EndAsync(client, player.Token, body));
        var second = await CountsOf(await EndAsync(client, player.Token, body));

        Assert.Equal(1, first.Attempts);
        Assert.Equal(first.Attempts, second.Attempts);
    }

    [Fact]
    public async Task The_token_may_arrive_in_the_body_for_the_unload_beacon()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        // No Authorization header, because sendBeacon cannot set one.
        var response = await EndAsync(client, null,
            new { level = 2, attemptId = "beacon", outcome = "abandoned", token = player.Token });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, (await CountsOf(response)).Attempts);
    }

    [Fact]
    public async Task An_unauthenticated_call_is_rejected()
    {
        var client = _fixture.CreateClient();

        var response = await EndAsync(client, null,
            new { level = 1, attemptId = "a1", outcome = "abandoned" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_unknown_outcome_is_rejected()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await EndAsync(client, player.Token,
            new { level = 1, attemptId = "a1", outcome = "finished" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Leaving_a_level_after_completing_it_records_no_further_attempt()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var completion = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/completions")
        {
            Content = JsonContent.Create(new { level = 1, moves = 20, hints = 0, attemptId = "a1" }),
        };
        completion.Headers.Add("Authorization", $"Bearer {player.Token}");
        (await client.SendAsync(completion, Token)).EnsureSuccessStatusCode();

        // The completion closed this attempt; walking away afterwards must not charge a loss.
        var response = await EndAsync(client, player.Token,
            new { level = 1, attemptId = "a1", outcome = "abandoned" });

        var (attempts, completions) = await CountsOf(response);
        Assert.Equal(1, attempts);
        Assert.Equal(1, completions);
    }
}
