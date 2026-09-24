using System.Net.Http.Json;
using System.Text.Json;

namespace GaudiBallz.Server.Tests.Hub;

/// <summary>
/// "Games played" counts every game started, while everything that means "played to the end"
/// - streaks and the first-clear bonus - stays on completions.
/// </summary>
[Collection(SharedHubApi.Name)]
public sealed class GamesPlayedTests
{
    private readonly HubApiFixture _fixture;

    public GamesPlayedTests(HubApiFixture fixture)
    {
        _fixture = fixture;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private sealed record Anonymous(string PlayerId, string Token, bool IsAnonymous);

    private async Task<Anonymous> NewAccountAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/v1/players/anonymous", null, Token);
        response.EnsureSuccessStatusCode();
        var player = (await response.Content.ReadFromJsonAsync<Anonymous>(Token))!;
        var name = $"g{Guid.NewGuid():N}"[..12];
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);
        return player;
    }

    private static async Task StartAsync(HttpClient client, string token, string mode = "campaign")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/attempts/start")
        {
            Content = JsonContent.Create(new { mode }),
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

    private static int Today(JsonElement stats)
    {
        var history = stats.GetProperty("dailyHistory");
        return history[history.GetArrayLength() - 1].GetProperty("count").GetInt32();
    }

    [Fact]
    public async Task A_restart_and_a_clear_count_as_two_games_and_one_streak_day()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        // Start, restart (which starts again), then clear: the clear writes the day's
        // completion row, as the completion flow does.
        await StartAsync(client, player.Token);
        await StartAsync(client, player.Token);
        await _fixture.Store.RecordDailyPlayAsync(player.PlayerId, DateTime.UtcNow, Token);

        var stats = await StatsAsync(client, player.Token);

        Assert.Equal(2, Today(stats));
        Assert.Equal(2, stats.GetProperty("gamesThisWeek").GetInt32());
        Assert.Equal(2, stats.GetProperty("gamesThisMonth").GetInt32());
        Assert.Equal(2, stats.GetProperty("gamesAllTime").GetInt32());
        Assert.Equal(1, stats.GetProperty("currentStreak").GetInt32());
    }

    [Fact]
    public async Task Daily_challenge_games_count_too()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await StartAsync(client, player.Token, "daily");
        await StartAsync(client, player.Token, "daily");

        Assert.Equal(2, Today(await StatsAsync(client, player.Token)));
    }

    [Fact]
    public async Task Unfinished_games_alone_do_not_make_a_streak()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await StartAsync(client, player.Token);

        var stats = await StatsAsync(client, player.Token);

        Assert.Equal(1, Today(stats));
        Assert.Equal(0, stats.GetProperty("currentStreak").GetInt32());
        Assert.Equal(0, stats.GetProperty("bestStreak").GetInt32());
    }

    [Fact]
    public async Task An_unfinished_game_does_not_use_up_the_first_clear_bonus()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await StartAsync(client, player.Token);
        await _fixture.Store.RecordCompletionAsync(
            player.PlayerId, 1, new GaudiBallz.Server.Progression.LevelResult(10, 0, 3, 500), Token);

        var bonus = await _fixture.Store.RecordCompletionBonusAsync(
            player.PlayerId, 1, null, false, hints: 0, Token);

        Assert.Equal(25, bonus.StreakBonus);
    }
}
