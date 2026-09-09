using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests.ProfileBall;

/// <summary>
/// The profile ball, end to end.
///
/// The dimming in the picker is a courtesy; this is the gate. Every test here goes through
/// HTTP so that what is proven is what a client — or anything else holding a token — can
/// actually do.
/// </summary>
public sealed class ProfileBallSliceTests : IClassFixture<ProfileBallApiFixture>
{
    private readonly ProfileBallApiFixture _fixture;

    public ProfileBallSliceTests(ProfileBallApiFixture fixture)
    {
        _fixture = fixture;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private sealed record Anonymous(string PlayerId, string Token, bool IsAnonymous);

    /// <summary>A player with a token, still anonymous.</summary>
    private static async Task<Anonymous> NewPlayerAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/v1/players/anonymous", null, Token);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<Anonymous>(Token))!;
    }

    /// <summary>
    /// A player promoted to an account. Done through the store because the HTTP route into
    /// it is a passkey ceremony, which a test cannot perform.
    /// </summary>
    private async Task<Anonymous> NewAccountAsync(HttpClient client)
    {
        var player = await NewPlayerAsync(client);
        var name = $"p{Guid.NewGuid():N}"[..12];

        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);

        return player;
    }

    private static HttpRequestMessage SetBall(string? token, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/v1/players/me/ball")
        {
            Content = JsonContent.Create(body),
        };

        if (token is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }

        return request;
    }

    private static async Task<int?> BallOnAccountAsync(HttpClient client, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/players/me");
        request.Headers.Add("Authorization", $"Bearer {token}");

        var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var ball = body.GetProperty("ball");

        return ball.ValueKind == JsonValueKind.Null ? null : ball.GetInt32();
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

    // ---- the table -------------------------------------------------------

    [Fact]
    public async Task The_unlock_table_is_public_and_covers_the_whole_palette()
    {
        // No token: the campaign's shape is the same for everyone and is not private.
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/api/v1/profile/balls", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var balls = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        var entries = balls.EnumerateArray().ToArray();

        Assert.Equal(13, entries.Length);
        Assert.Equal(
            Enumerable.Range(1, 13),
            entries.Select(e => e.GetProperty("colour").GetInt32()));

        var levels = entries.Select(e => e.GetProperty("unlocksAtLevel").GetInt32()).ToArray();
        Assert.Equal(levels.Order(), levels);
        Assert.Equal(1, levels[0]);
    }

    [Fact]
    public async Task The_unlock_table_matches_the_campaign_curve()
    {
        var client = _fixture.CreateClient();

        var balls = await client.GetFromJsonAsync<JsonElement>("/api/v1/profile/balls", Token);

        foreach (var entry in balls.EnumerateArray())
        {
            var colour = entry.GetProperty("colour").GetInt32();
            var level = entry.GetProperty("unlocksAtLevel").GetInt32();

            Assert.Equal(
                LevelCatalogue.ColourUnlocks.Single(u => u.Colour == colour).UnlocksAtLevel,
                level);
        }
    }

    // ---- who may set one -------------------------------------------------

    [Fact]
    public async Task Without_a_token_setting_a_ball_is_refused()
    {
        var client = _fixture.CreateClient();

        var response = await client.SendAsync(SetBall(null, new { colour = 1 }), Token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_junk_token_is_refused()
    {
        var client = _fixture.CreateClient();

        var response = await client.SendAsync(SetBall("not-a-real-token", new { colour = 1 }), Token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// A ball says which account you are on, so there has to be an account. An anonymous
    /// player holds a token but is not one.
    /// </summary>
    [Fact]
    public async Task An_anonymous_player_cannot_set_a_ball()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        await CompleteAsync(client, player.Token, 1);

        var response = await client.SendAsync(SetBall(player.Token, new { colour = 1 }), Token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ---- what may be set -------------------------------------------------

    [Fact]
    public async Task A_colour_outside_the_palette_is_refused()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        await CompleteAsync(client, account.Token, 200);

        foreach (var colour in new[] { 0, -1, 14, 999 })
        {
            var response = await client.SendAsync(SetBall(account.Token, new { colour }), Token);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task An_unearned_colour_is_refused_and_leaves_the_previous_one_alone()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 1);
        (await client.SendAsync(SetBall(account.Token, new { colour = 2 }), Token))
            .EnsureSuccessStatusCode();

        // Colour 6 arrives at level 26, and this account has finished level 1.
        var response = await client.SendAsync(SetBall(account.Token, new { colour = 6 }), Token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(2, await BallOnAccountAsync(client, account.Token));
    }

    [Fact]
    public async Task An_earned_colour_is_kept_and_read_back()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 30);

        var response = await client.SendAsync(SetBall(account.Token, new { colour = 6 }), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(6, await BallOnAccountAsync(client, account.Token));
    }

    /// <summary>
    /// The floor of the gate. Finishing level 1 earns the three colours it contains and
    /// nothing beyond them, which is what stops a fresh account taking whatever it likes.
    /// </summary>
    [Fact]
    public async Task Finishing_level_one_earns_exactly_three_colours()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 1);

        foreach (var colour in new[] { 1, 2, 3 })
        {
            var allowed = await client.SendAsync(SetBall(account.Token, new { colour }), Token);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
            Assert.Equal(colour, await BallOnAccountAsync(client, account.Token));
        }

        var refused = await client.SendAsync(SetBall(account.Token, new { colour = 4 }), Token);

        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        Assert.Equal(3, await BallOnAccountAsync(client, account.Token));
    }

    /// <summary>
    /// Registering earns nothing on its own, and neither does reaching a level — a level code
    /// raises what a player may open without their having played any of it. Only a recorded
    /// completion moves this, which is why an account with none is refused all thirteen.
    /// </summary>
    [Fact]
    public async Task An_account_that_has_completed_nothing_can_take_no_colour()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        foreach (var colour in Enumerable.Range(1, 13))
        {
            var response = await client.SendAsync(SetBall(account.Token, new { colour }), Token);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        Assert.Null(await BallOnAccountAsync(client, account.Token));
    }

    // ---- clearing --------------------------------------------------------

    [Fact]
    public async Task Clearing_is_allowed_whatever_the_account_has_earned()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        await CompleteAsync(client, account.Token, 1);
        (await client.SendAsync(SetBall(account.Token, new { colour = 3 }), Token))
            .EnsureSuccessStatusCode();

        var response = await client.SendAsync(
            SetBall(account.Token, new { colour = (int?)null }), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(await BallOnAccountAsync(client, account.Token));
    }

    [Fact]
    public async Task A_new_account_reports_no_ball()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        Assert.Null(await BallOnAccountAsync(client, account.Token));
    }

    // ---- the slice itself ------------------------------------------------

    [Fact]
    public void Announces_a_stable_slice_name()
    {
        Assert.Equal("profile-ball", Server.ProfileBall.ProfileBallSlice.Name);
    }
}
