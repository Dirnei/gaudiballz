using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.Tests.Hub;

/// <summary>
/// Streak freezes through the real endpoints: completions settle them, and the stats view
/// reports them, for anonymous players as much as registered ones.
/// </summary>
[Collection(SharedHubApi.Name)]
public sealed class StreakFreezeApiTests(HubApiFixture fixture)
{
    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    private sealed record Anonymous(string PlayerId, string Token, bool IsAnonymous);

    private static async Task<Anonymous> NewPlayerAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/v1/players/anonymous", null, Token);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Anonymous>(Token))!;
    }

    private static async Task<JsonElement> SendAsync(HttpClient client, HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        request.Headers.Add("Authorization", $"Bearer {token}");
        var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    private static Task<JsonElement> CompleteLevelAsync(HttpClient client, string token, int level = 1) =>
        SendAsync(client, HttpMethod.Post, "/api/v1/progress/completions", token,
            new { level, moves = 30, hints = 0 });

    private static Task<JsonElement> StatsAsync(HttpClient client, string token) =>
        SendAsync(client, HttpMethod.Get, "/api/hub/player/stats", token);

    private async Task SeedPlayedDays(string playerId, DateOnly lastDay, int count)
    {
        for (var i = 0; i < count; i++)
        {
            await fixture.Store.RecordDailyPlayAsync(
                playerId, lastDay.AddDays(-i).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), Token);
        }
    }

    [Fact]
    public async Task Anonymous_campaign_completion_records_the_day_and_settles()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        await CompleteLevelAsync(client, player.Token);

        var played = await fixture.Store.LoadDailyPlayAsync(player.PlayerId, Token);
        Assert.Contains(played, d => DateOnly.FromDateTime(d.Date) == Today);
        var freeze = await fixture.Store.LoadStreakFreezeAsync(player.PlayerId, Token);
        Assert.Equal(Today, DateOnly.FromDateTime(freeze!.SettledThrough!.Value));
    }

    [Fact]
    public async Task Anonymous_player_earns_the_streak_bonus_once_a_day()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var first = await CompleteLevelAsync(client, player.Token, level: 1);
        var second = await CompleteLevelAsync(client, player.Token, level: 2);

        Assert.Equal(25, first.GetProperty("streakBonus").GetInt32());
        Assert.Equal(0, second.GetProperty("streakBonus").GetInt32());
    }

    [Fact]
    public async Task Seventh_day_completion_through_the_api_earns_a_freeze()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        await SeedPlayedDays(player.PlayerId, Today.AddDays(-1), 6);

        await CompleteLevelAsync(client, player.Token);

        var stats = await StatsAsync(client, player.Token);
        Assert.Equal(7, stats.GetProperty("currentStreak").GetInt32());
        Assert.Equal(1, stats.GetProperty("streakFreezes").GetInt32());
    }

    [Fact]
    public async Task Daily_challenge_completion_settles_too()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        await SeedPlayedDays(player.PlayerId, Today.AddDays(-1), 6);

        await SendAsync(client, HttpMethod.Post, "/api/v1/daily/completions", player.Token,
            new { moves = 20, hints = 0, elapsedTimeMs = 30000 });

        var freeze = await fixture.Store.LoadStreakFreezeAsync(player.PlayerId, Token);
        Assert.Equal(1, freeze!.Held);
    }

    [Fact]
    public async Task Covered_streak_is_reported_before_playing_again()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        // Ten days played up to two days ago, then yesterday missed, holding 2.
        await SeedPlayedDays(player.PlayerId, Today.AddDays(-2), 10);
        await fixture.Database.GetCollection<StreakFreezeDocument>("streak_freeze").InsertOneAsync(new StreakFreezeDocument
        {
            Id = player.PlayerId,
            Held = 2,
            SettledThrough = Today.AddDays(-2).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            Version = 1,
        }, cancellationToken: Token);

        var stats = await StatsAsync(client, player.Token);

        Assert.Equal(10, stats.GetProperty("currentStreak").GetInt32());
        Assert.Equal(1, stats.GetProperty("streakFreezes").GetInt32());
        Assert.Equal(1, stats.GetProperty("streakSavedDays").GetInt32());
        Assert.Equal(
            Today.AddDays(-2).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            stats.GetProperty("streakAnchorDay").GetString());
    }

    [Fact]
    public async Task Covered_day_earns_no_streak_bonus()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        await SeedPlayedDays(player.PlayerId, Today.AddDays(-2), 10);
        await fixture.Database.GetCollection<StreakFreezeDocument>("streak_freeze").InsertOneAsync(new StreakFreezeDocument
        {
            Id = player.PlayerId,
            Held = 1,
            SettledThrough = Today.AddDays(-2).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            Version = 1,
        }, cancellationToken: Token);

        var completion = await CompleteLevelAsync(client, player.Token);

        // Today's play earns its own streak bonus; yesterday, covered by the freeze, earns none.
        Assert.Equal(25, completion.GetProperty("streakBonus").GetInt32());
        var expectedXp = completion.GetProperty("totalPoints").GetInt32();
        var totalXp = 0;
        for (var i = 0; i < 50 && totalXp != expectedXp; i++)
        {
            totalXp = (await StatsAsync(client, player.Token)).GetProperty("totalPoints").GetInt32();
            if (totalXp != expectedXp)
            {
                await Task.Delay(100, Token);
            }
        }

        Assert.Equal(expectedXp, totalXp);
        Assert.Equal(0, (await fixture.Store.LoadStreakFreezeAsync(player.PlayerId, Token))!.Held);
    }

    [Fact]
    public async Task Stats_report_no_freezes_for_a_new_player()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var stats = await StatsAsync(client, player.Token);

        Assert.Equal(0, stats.GetProperty("streakFreezes").GetInt32());
        Assert.Equal(0, stats.GetProperty("streakSavedDays").GetInt32());
    }

    [Fact]
    public async Task Freezes_survive_account_linking()
    {
        var client = fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        await SeedPlayedDays(player.PlayerId, Today.AddDays(-1), 6);
        await CompleteLevelAsync(client, player.Token);

        await fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);

        var stats = await StatsAsync(client, player.Token);
        Assert.Equal(1, stats.GetProperty("streakFreezes").GetInt32());
        Assert.Equal(7, stats.GetProperty("currentStreak").GetInt32());
    }
}
