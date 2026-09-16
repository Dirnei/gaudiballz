using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests.Progression;

/// <summary>
/// Proves the ledger, not the stored per-level point fields, is what the API reports.
///
/// In normal operation the two agree, so a test that only completes a level cannot tell
/// which one answered. These tests push an extra credit into the ledger that no level
/// record accounts for, and then insist the API reports the larger, ledger-derived number.
/// </summary>
public sealed class WalletAuthorityTests : IClassFixture<WalletAuthorityFixture>
{
    private readonly WalletAuthorityFixture _fixture;

    public WalletAuthorityTests(WalletAuthorityFixture fixture)
    {
        _fixture = fixture;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    /// <summary>A credit with no matching level record, so the ledger outruns the progress total.</summary>
    private const int LedgerOnlyCredit = 1000;

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
        var name = $"w{Guid.NewGuid():N}"[..12];

        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);

        return player;
    }

    private static async Task CompleteAsync(HttpClient client, string token, int level)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/progress/completions")
        {
            Content = JsonContent.Create(new { level, moves = 20, hints = 0 }),
        };
        request.Headers.Add("Authorization", $"Bearer {token}");

        (await client.SendAsync(request, Token)).EnsureSuccessStatusCode();
    }

    private static async Task<JsonElement> GetProgressAsync(HttpClient client, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/progress/");
        request.Headers.Add("Authorization", $"Bearer {token}");

        var response = await client.SendAsync(request, Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    /// <summary>The total the old progress-derived path would have produced, and the fallback.</summary>
    private async Task<int> ProgressDerivedTotalAsync(string playerId) =>
        (await _fixture.Store.LoadProgressAsync(playerId, Token)).TotalPoints;

    // ---- 4.1 the progress endpoint reports the ledger balance ----------------

    [Fact]
    public async Task Progress_endpoint_reports_the_wallet_balance()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        await CompleteAsync(client, player.Token, 1);
        var balance = await _fixture.CreditAsync(
            player.PlayerId, 900, PointCategory.Migration, LedgerOnlyCredit);

        var body = await GetProgressAsync(client, player.Token);

        Assert.Equal(balance, body.GetProperty("totalPoints").GetInt32());

        // And it is genuinely the ledger answering: the level records fall short by the
        // credit no level accounts for.
        Assert.Equal(
            balance - LedgerOnlyCredit,
            await ProgressDerivedTotalAsync(player.PlayerId));
    }

    [Fact]
    public async Task Progress_rank_is_computed_from_the_wallet_balance()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        await CompleteAsync(client, player.Token, 1);
        var balance = await _fixture.CreditAsync(
            player.PlayerId, 900, PointCategory.Migration, LedgerOnlyCredit);

        var body = await GetProgressAsync(client, player.Token);
        var rank = body.GetProperty("rank");

        var (tier, subLevel) = RankTier.FromXp(balance);
        Assert.Equal(balance, rank.GetProperty("currentXp").GetInt32());
        Assert.Equal(tier.ToString().ToLowerInvariant(), rank.GetProperty("tier").GetString());
        Assert.Equal(subLevel, rank.GetProperty("subLevel").GetInt32());
        Assert.Equal(RankTier.NextThreshold(balance), rank.GetProperty("nextThreshold").GetInt32());
    }

    [Fact]
    public async Task Player_stats_endpoint_reports_the_wallet_balance()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        await CompleteAsync(client, player.Token, 1);
        var balance = await _fixture.CreditAsync(
            player.PlayerId, 900, PointCategory.Migration, LedgerOnlyCredit);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/hub/player/stats");
        request.Headers.Add("Authorization", $"Bearer {player.Token}");

        var response = await client.SendAsync(request, Token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(balance, body.GetProperty("totalPoints").GetInt32());
        Assert.Equal(balance, body.GetProperty("rank").GetProperty("currentXp").GetInt32());
    }

    // ---- 4.2 the fallback when the wallet cannot answer ----------------------

    [Fact]
    public async Task Progress_endpoint_falls_back_when_the_wallet_is_unavailable()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);

        await CompleteAsync(client, player.Token, 1);
        var balance = await _fixture.CreditAsync(
            player.PlayerId, 900, PointCategory.Migration, LedgerOnlyCredit);

        _fixture.CloseWallet();
        try
        {
            // GetProgressAsync asserts a 200, so no error reaches the client either.
            var body = await GetProgressAsync(client, player.Token);
            var reported = body.GetProperty("totalPoints").GetInt32();

            // The ledger was not consulted: its number never appears.
            Assert.NotEqual(balance, reported);

            // What stands in is derived from the level records the same response carries.
            Assert.Equal(
                body.GetProperty("levels").EnumerateArray()
                    .Sum(l => l.GetProperty("points").GetInt32()),
                reported);

            Assert.Equal(reported, body.GetProperty("rank").GetProperty("currentXp").GetInt32());
        }
        finally
        {
            _fixture.OpenWallet();
        }
    }

    // ---- 4.3 the leaderboard follows the ledger ------------------------------

    [Fact]
    public async Task Leaderboard_upsert_uses_the_wallet_balance()
    {
        var client = _fixture.CreateClient();
        var player = await NewAccountAsync(client);

        // Credit before the completion, so the balance the upsert reads is already ahead
        // of anything the level records can explain.
        await _fixture.CreditAsync(player.PlayerId, 900, PointCategory.Migration, LedgerOnlyCredit);

        await CompleteAsync(client, player.Token, 1);

        var balance = await WaitForLeaderboardAsync(player.PlayerId);
        Assert.Equal(await _fixture.BalanceOfAsync(player.PlayerId), balance);

        Assert.Equal(
            balance - LedgerOnlyCredit,
            await ProgressDerivedTotalAsync(player.PlayerId));
    }

    /// <summary>The leaderboard upsert is fire-and-forget, so the entry arrives after the response.</summary>
    private async Task<int> WaitForLeaderboardAsync(string playerId)
    {
        for (var attempt = 0; attempt < 40; attempt++)
        {
            var (_, entry) = await _fixture.Store.GetPlayerRankAsync(playerId, null, Token);
            if (entry is not null)
            {
                return entry.TotalPoints;
            }

            await Task.Delay(250, Token);
        }

        Assert.Fail("The leaderboard entry never appeared.");
        return 0;
    }
}
