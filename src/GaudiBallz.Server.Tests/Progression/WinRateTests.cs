using System.Net.Http.Json;
using System.Text.Json;
using GaudiBallz.Server.Tests.Hub;

namespace GaudiBallz.Server.Tests.Progression;

/// <summary>
/// Win rate as the specs state it: completions over attempts, where restarting or walking
/// away ends an attempt as a loss, and no attempts at all is not the same as no wins.
/// </summary>
[Collection(SharedHubApi.Name)]
public sealed class WinRateTests
{
    private readonly HubApiFixture _fixture;

    public WinRateTests(HubApiFixture fixture)
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

    private async Task<Anonymous> NewAccountAsync(HttpClient client)
    {
        var player = await NewPlayerAsync(client);
        var name = $"r{Guid.NewGuid():N}"[..12];
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);
        return player;
    }

    private static async Task CompleteAsync(HttpClient client, string token, int level, string attemptId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/completions")
        {
            Content = JsonContent.Create(new { level, moves = 20, hints = 0, attemptId }),
        };
        request.Headers.Add("Authorization", $"Bearer {token}");
        (await client.SendAsync(request, Token)).EnsureSuccessStatusCode();
    }

    private static async Task EndAsync(
        HttpClient client, string token, int level, string attemptId, string outcome)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/attempts/end")
        {
            Content = JsonContent.Create(new { level, attemptId, outcome }),
        };
        request.Headers.Add("Authorization", $"Bearer {token}");
        (await client.SendAsync(request, Token)).EnsureSuccessStatusCode();
    }

    private static async Task<JsonElement> StatsAsync(HttpClient client, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/hub/player/stats");
        request.Headers.Add("Authorization", $"Bearer {token}");
        var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    [Fact]
    public async Task Clearing_a_level_first_time_is_a_hundred_percent()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await CompleteAsync(client, player.Token, 1, "a1");

        var stats = await StatsAsync(client, player.Token);
        Assert.Equal(1, stats.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(1, stats.GetProperty("gamesWon").GetInt32());
        Assert.Equal(100, stats.GetProperty("winRate").GetInt32());
    }

    [Fact]
    public async Task Restarting_twice_then_clearing_is_a_third()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await EndAsync(client, player.Token, 1, "a1", "restarted");
        await EndAsync(client, player.Token, 1, "a2", "restarted");
        await CompleteAsync(client, player.Token, 1, "a3");

        var stats = await StatsAsync(client, player.Token);
        Assert.Equal(3, stats.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(1, stats.GetProperty("gamesWon").GetInt32());
        Assert.Equal(33, stats.GetProperty("winRate").GetInt32());
    }

    [Fact]
    public async Task Walking_away_counts_against_the_rate()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await CompleteAsync(client, player.Token, 1, "a1");
        await EndAsync(client, player.Token, 2, "a2", "abandoned");

        var stats = await StatsAsync(client, player.Token);
        Assert.Equal(2, stats.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(1, stats.GetProperty("gamesWon").GetInt32());
        Assert.Equal(50, stats.GetProperty("winRate").GetInt32());
    }

    [Fact]
    public async Task A_player_with_no_attempts_has_no_win_rate()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        var stats = await StatsAsync(client, player.Token);

        // Absent, not zero: they have not lost every game, they have played none.
        Assert.Equal(0, stats.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(JsonValueKind.Null, stats.GetProperty("winRate").ValueKind);
    }

    [Fact]
    public async Task The_leaderboard_reports_attempts_and_a_rate()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await EndAsync(client, player.Token, 1, "a1", "restarted");
        await CompleteAsync(client, player.Token, 1, "a2");

        // The standings are written after the response, so give them a moment to land.
        JsonElement entry = default;
        for (var attempt = 0; attempt < 40; attempt++)
        {
            var board = await client.GetFromJsonAsync<JsonElement>(
                "/api/hub/leaderboard?limit=100", Token);
            entry = board.GetProperty("entries").EnumerateArray()
                .FirstOrDefault(e => e.GetProperty("playerId").GetString() == player.PlayerId);
            if (entry.ValueKind != JsonValueKind.Undefined
                && entry.GetProperty("gamesPlayed").GetInt32() == 2)
            {
                break;
            }

            await Task.Delay(250, Token);
        }

        Assert.NotEqual(JsonValueKind.Undefined, entry.ValueKind);
        Assert.Equal(2, entry.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(1, entry.GetProperty("gamesWon").GetInt32());
        Assert.Equal(50, entry.GetProperty("winRate").GetInt32());
    }

    [Fact]
    public async Task A_period_leaderboard_counts_losses_too()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await CompleteAsync(client, player.Token, 1, "a1");
        await EndAsync(client, player.Token, 2, "a2", "abandoned");

        JsonElement entry = default;
        for (var attempt = 0; attempt < 40; attempt++)
        {
            var board = await client.GetFromJsonAsync<JsonElement>(
                "/api/hub/leaderboard?period=today&limit=100", Token);
            entry = board.GetProperty("entries").EnumerateArray()
                .FirstOrDefault(e => e.GetProperty("playerId").GetString() == player.PlayerId);
            if (entry.ValueKind != JsonValueKind.Undefined
                && entry.GetProperty("gamesPlayed").GetInt32() >= 2)
            {
                break;
            }

            await Task.Delay(250, Token);
        }

        Assert.NotEqual(JsonValueKind.Undefined, entry.ValueKind);
        Assert.Equal(2, entry.GetProperty("gamesPlayed").GetInt32());
        Assert.Equal(1, entry.GetProperty("gamesWon").GetInt32());

        // The bug this change exists to fix: a period row that never counted a win.
        Assert.Equal(50, entry.GetProperty("winRate").GetInt32());
    }
}
