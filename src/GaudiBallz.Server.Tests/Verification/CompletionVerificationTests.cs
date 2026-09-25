using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests.Verification;

/// <summary>
/// Completions count only when their moves replay to a solved board.
///
/// Every test goes through HTTP against the real application and a real MongoDB, and every
/// rejection is checked for what it must not leave behind: progress, a shared result, a daily
/// result, a leaderboard entry.
/// </summary>
public sealed class CompletionVerificationTests : IClassFixture<VerificationApiFixture>
{
    private readonly VerificationApiFixture _fixture;

    public CompletionVerificationTests(VerificationApiFixture fixture)
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

    private async Task<Player> NewAccountAsync(HttpClient client)
    {
        var player = await NewPlayerAsync(client);
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, $"v{Guid.NewGuid():N}"[..12], Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);
        return player;
    }

    private static HttpRequestMessage Post(string url, string token, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add("Authorization", $"Bearer {token}");
        return request;
    }

    /// <summary>A level no other test in this class touches.</summary>
    private static int FreshLevel() => Random.Shared.Next(2_000, 9_000);

    private static int[][] SolutionFor(int level) =>
        [.. LevelCatalogue.Build(level).ConstructiveSolution.Select(m => new[] { (int)m.From, m.To })];

    private static int[][] TodaysDailySolution() =>
        [.. DailyChallenge.BoardForDate(DateOnly.FromDateTime(DateTime.UtcNow))
            .ConstructiveSolution.Select(m => new[] { (int)m.From, m.To })];

    private async Task<long> SharedResultsFor(string playerId) =>
        await _fixture.Database.GetCollection<BsonDocument>("shared_results")
            .CountDocumentsAsync(Builders<BsonDocument>.Filter.Eq("PlayerId", playerId), cancellationToken: Token);

    private static async Task<int> LevelsCompletedAsync(HttpClient client, Player player)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/progress/");
        request.Headers.Add("Authorization", $"Bearer {player.Token}");
        var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        return body.GetProperty("levels").GetArrayLength();
    }

    private static async Task AssertRejectedAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(code, body.GetProperty("code").GetString());
    }

    // ---- campaign -------------------------------------------------------------

    [Fact]
    public async Task A_real_solution_is_accepted_and_scored_on_the_claimed_count()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var level = FreshLevel();
        var solution = SolutionFor(level);

        var response = await client.SendAsync(Post("/api/v1/progress/completions", player.Token, new
        {
            level,
            moves = solution.Length + 3,
            hints = 0,
            elapsedTimeMs = 30_000,
            moveList = solution,
            rulesVersion = 1,
        }), Token);

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);

        // Three over par: one star, scored on the claimed count, not the list length.
        Assert.Equal(1, body.GetProperty("attemptStars").GetInt32());

        var share = await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/shares/{body.GetProperty("shareId").GetString()}", Token);
        Assert.Equal(solution.Length + 3, share.GetProperty("moves").GetInt32());
        Assert.Equal(JsonSerializer.Serialize(solution), share.GetProperty("moveList").GetRawText());
    }

    public static TheoryData<string> CampaignRejections =>
        ["illegal-move", "not-solved", "move-count-too-low", "too-many-moves", "unknown-rules-version"];

    [Theory]
    [MemberData(nameof(CampaignRejections))]
    public async Task A_bad_campaign_completion_is_rejected_and_leaves_nothing_behind(string code)
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);
        var level = FreshLevel();
        var solution = SolutionFor(level);

        var (moves, list, rulesVersion) = Broken(code, solution);

        var response = await client.SendAsync(Post("/api/v1/progress/completions", player.Token, new
        {
            level,
            moves,
            hints = 0,
            elapsedTimeMs = 30_000,
            moveList = list,
            rulesVersion,
        }), Token);

        await AssertRejectedAsync(response, code);

        // Hub projections are written in the background; give them the chance to be wrong.
        await Task.Delay(300, Token);

        Assert.Equal(0, await LevelsCompletedAsync(client, player));
        Assert.Equal(0, await SharedResultsFor(player.PlayerId));
        var (rank, _) = await _fixture.Store.GetLevelPlayerRankAsync(level, player.PlayerId, null, Token);
        Assert.Equal(0, rank);
    }

    [Fact]
    public async Task A_campaign_completion_without_moves_is_accepted_as_before_but_has_no_replay()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await client.SendAsync(Post("/api/v1/progress/completions", player.Token, new
        {
            level = FreshLevel(),
            moves = 40,
            hints = 0,
            elapsedTimeMs = 30_000,
        }), Token);

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var share = await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/shares/{body.GetProperty("shareId").GetString()}", Token);

        Assert.Equal(JsonValueKind.Null, share.GetProperty("moveList").ValueKind);
    }

    // ---- daily ------------------------------------------------------------------

    [Fact]
    public async Task A_real_daily_solution_is_accepted()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var solution = TodaysDailySolution();

        var response = await client.SendAsync(Post("/api/v1/daily/completions", player.Token, new
        {
            moves = solution.Length,
            hints = 0,
            elapsedTimeMs = 30_000,
            moveList = solution,
            rulesVersion = 1,
        }), Token);

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var share = await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/shares/{body.GetProperty("shareId").GetString()}", Token);

        Assert.Equal(JsonSerializer.Serialize(solution), share.GetProperty("moveList").GetRawText());
    }

    [Theory]
    [MemberData(nameof(CampaignRejections))]
    public async Task A_bad_daily_completion_is_rejected_and_leaves_nothing_behind(string code)
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        var (moves, list, rulesVersion) = Broken(code, TodaysDailySolution());

        var response = await client.SendAsync(Post("/api/v1/daily/completions", player.Token, new
        {
            moves,
            hints = 0,
            elapsedTimeMs = 30_000,
            moveList = list,
            rulesVersion,
        }), Token);

        await AssertRejectedAsync(response, code);

        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        Assert.Null(await _fixture.Store.FindDailyResultAsync(player.PlayerId, today, Token));
        Assert.Equal(0, await SharedResultsFor(player.PlayerId));
    }

    [Fact]
    public async Task A_daily_completion_without_moves_is_accepted_as_before()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        var response = await client.SendAsync(Post("/api/v1/daily/completions", player.Token, new
        {
            moves = 25,
            hints = 0,
            elapsedTimeMs = 30_000,
        }), Token);

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var share = await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/shares/{body.GetProperty("shareId").GetString()}", Token);

        Assert.Equal(JsonValueKind.Null, share.GetProperty("moveList").ValueKind);
    }

    /// <summary>A completion broken in exactly the way the code names, built from a real solution.</summary>
    private static (int Moves, int[][] List, int RulesVersion) Broken(string code, int[][] solution) => code switch
    {
        // A pour from a tube onto itself is never legal.
        "illegal-move" => (solution.Length + 1, [solution[0], [0, 0], .. solution[1..]], 1),
        // Only the first move: no generated level is one pour from solved. (Dropping just the last
        // move is not enough, since a constructive solution can already be solved before its end.)
        "not-solved" => (1, solution[..1], 1),
        "move-count-too-low" => (solution.Length - 1, solution, 1),
        "too-many-moves" => (2_001, [.. Enumerable.Repeat(solution[0], 2_001)], 1),
        "unknown-rules-version" => (solution.Length, solution, 99),
        _ => throw new ArgumentOutOfRangeException(nameof(code)),
    };
}
