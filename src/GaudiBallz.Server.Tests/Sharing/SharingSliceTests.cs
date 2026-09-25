using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace GaudiBallz.Server.Tests.Sharing;

/// <summary>
/// Shared results, end to end: a completion is scored, its result id comes back, and the public
/// result endpoint serves what the server scored — never anything the client claims.
/// </summary>
public sealed class SharingSliceTests : IClassFixture<SharingApiFixture>
{
    private readonly SharingApiFixture _fixture;

    public SharingSliceTests(SharingApiFixture fixture)
    {
        _fixture = fixture;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private sealed record Player(string PlayerId, string Token);

    private static async Task<Player> NewPlayerAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/v1/players/anonymous", null, Token);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<Player>(Token))!;
    }

    private async Task RegisterAsync(Player player, string name)
    {
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);
    }

    private static HttpRequestMessage Post(string url, string token, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add("Authorization", $"Bearer {token}");
        return request;
    }

    /// <summary>A level no other test in this class touches, so its leaderboard is ours alone.</summary>
    private static int FreshLevel() => Random.Shared.Next(2_000, 9_000);

    private static async Task<JsonElement> CompleteLevelAsync(
        HttpClient client, Player player, int level, int moves, int hints = 0, int elapsedTimeMs = 30_000)
    {
        var response = await client.SendAsync(
            Post("/api/v1/progress/completions", player.Token,
                new { level, moves, hints, elapsedTimeMs }),
            Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    private static async Task<JsonElement> GetShareAsync(HttpClient client, string id)
    {
        var response = await client.GetAsync($"/api/v1/shares/{id}", Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    // ---- result ids ----------------------------------------------------------

    [Fact]
    public async Task A_level_completion_returns_a_short_result_id()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var body = await CompleteLevelAsync(client, player, FreshLevel(), moves: 40);

        var id = body.GetProperty("shareId").GetString();
        Assert.NotNull(id);
        Assert.InRange(id.Length, 6, 10);
        Assert.Matches("^[A-Za-z0-9]+$", id);
    }

    [Fact]
    public async Task A_daily_completion_returns_a_result_id()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token, new { moves = 20, hints = 0, elapsedTimeMs = 30_000 }),
            Token);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);

        Assert.False(string.IsNullOrEmpty(body.GetProperty("shareId").GetString()));
    }

    [Fact]
    public async Task Each_attempt_gets_its_own_result()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var level = FreshLevel();

        var first = (await CompleteLevelAsync(client, player, level, moves: 40)).GetProperty("shareId").GetString()!;
        var second = (await CompleteLevelAsync(client, player, level, moves: 55)).GetProperty("shareId").GetString()!;

        Assert.NotEqual(first, second);
        Assert.Equal(40, (await GetShareAsync(client, first)).GetProperty("moves").GetInt32());
        Assert.Equal(55, (await GetShareAsync(client, second)).GetProperty("moves").GetInt32());
    }

    // ---- GET /api/v1/shares/{id} ------------------------------------------------

    [Fact]
    public async Task The_result_is_what_the_server_scored()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var level = FreshLevel();

        var completion = await CompleteLevelAsync(client, player, level, moves: 999, hints: 1, elapsedTimeMs: 95_000);
        var share = await GetShareAsync(client, completion.GetProperty("shareId").GetString()!);

        var levelInfo = await client.GetFromJsonAsync<JsonElement>($"/api/v1/levels/{level}", Token);

        Assert.Equal("level", share.GetProperty("kind").GetString());
        Assert.Equal(level, share.GetProperty("level").GetInt32());
        Assert.Equal(levelInfo.GetProperty("code").GetString(), share.GetProperty("code").GetString());
        Assert.Equal(completion.GetProperty("attemptStars").GetInt32(), share.GetProperty("stars").GetInt32());
        Assert.Equal(999, share.GetProperty("moves").GetInt32());
        Assert.Equal(1, share.GetProperty("hints").GetInt32());
        Assert.Equal(95_000, share.GetProperty("elapsedTimeMs").GetInt32());
        Assert.Equal(levelInfo.GetProperty("parMoves").GetInt32(), share.GetProperty("par").GetInt32());
        Assert.Equal(levelInfo.GetProperty("timeTargetMs").GetInt32(), share.GetProperty("timeTargetMs").GetInt32());
    }

    [Fact]
    public async Task The_result_carries_the_starting_board()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var level = FreshLevel();

        var completion = await CompleteLevelAsync(client, player, level, moves: 40);
        var share = await GetShareAsync(client, completion.GetProperty("shareId").GetString()!);
        var levelInfo = await client.GetFromJsonAsync<JsonElement>($"/api/v1/levels/{level}", Token);

        var board = share.GetProperty("board");
        Assert.Equal(levelInfo.GetProperty("capacity").GetInt32(), board.GetProperty("capacity").GetInt32());
        Assert.Equal(levelInfo.GetProperty("tubes").GetRawText(), board.GetProperty("tubes").GetRawText());
    }

    [Fact]
    public async Task An_anonymous_result_names_no_one()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var completion = await CompleteLevelAsync(client, player, FreshLevel(), moves: 40);
        var share = await GetShareAsync(client, completion.GetProperty("shareId").GetString()!);

        Assert.Equal(JsonValueKind.Null, share.GetProperty("player").ValueKind);
    }

    [Fact]
    public async Task A_registered_result_shows_the_current_name_and_ball()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var completion = await CompleteLevelAsync(client, player, FreshLevel(), moves: 40);

        // Registered after sharing: the old link shows who they are now.
        var name = $"s{Guid.NewGuid():N}"[..12];
        await RegisterAsync(player, name);
        await _fixture.Store.SetProfileBallAsync(player.PlayerId, 3, Token);

        var share = await GetShareAsync(client, completion.GetProperty("shareId").GetString()!);

        Assert.Equal(name, share.GetProperty("player").GetProperty("username").GetString());
        Assert.Equal(3, share.GetProperty("player").GetProperty("ball").GetInt32());
    }

    [Fact]
    public async Task Rank_counts_better_entries_and_leaves_out_the_sharers_own()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var level = FreshLevel();

        // 999 moves is always over par: a 1-star result.
        var completion = await CompleteLevelAsync(client, player, level, moves: 999, elapsedTimeMs: 50_000);
        Assert.Equal(1, completion.GetProperty("attemptStars").GetInt32());

        // Two ahead, three behind, and the sharer's own 3-star best that must not count.
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, "a", "a", null, 2, 30, 40_000, null, Token);
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, "b", "b", null, 1, 500, 40_000, null, Token);
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, "c", "c", null, 1, 999, 60_000, null, Token);
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, "d", "d", null, 1, 1_200, 10_000, null, Token);
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, "e", "e", null, 1, 999, 50_000, null, Token);
        await _fixture.Store.UpsertLevelLeaderboardAsync(level, player.PlayerId, "me", null, 3, 20, 10_000, null, Token);

        var share = await GetShareAsync(client, completion.GetProperty("shareId").GetString()!);

        // Ahead: a (more stars) and b (fewer moves). A tie (e) is not ahead.
        Assert.Equal(3, share.GetProperty("rank").GetProperty("position").GetInt32());
        Assert.Equal(6, share.GetProperty("rank").GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task A_daily_result_says_its_date_and_whether_it_is_today()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await client.SendAsync(
            Post("/api/v1/daily/completions", player.Token, new { moves = 20, hints = 0, elapsedTimeMs = 30_000 }),
            Token);
        response.EnsureSuccessStatusCode();
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>(Token)).GetProperty("shareId").GetString()!;

        var share = await GetShareAsync(client, id);
        var today = await client.GetFromJsonAsync<JsonElement>("/api/v1/daily/today", Token);

        Assert.Equal("daily", share.GetProperty("kind").GetString());
        Assert.Equal(
            DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            share.GetProperty("date").GetString());
        Assert.True(share.GetProperty("isToday").GetBoolean());
        Assert.Equal(today.GetProperty("tubes").GetRawText(), share.GetProperty("board").GetProperty("tubes").GetRawText());
        Assert.True(share.GetProperty("rank").GetProperty("position").GetInt32() >= 1);
    }

    [Fact]
    public async Task An_unknown_id_is_not_found()
    {
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/api/v1/shares/doesNotExist", Token);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
