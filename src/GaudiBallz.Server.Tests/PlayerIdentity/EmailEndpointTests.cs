using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.PlayerIdentity;

namespace GaudiBallz.Server.Tests.PlayerIdentity;

public sealed class EmailEndpointTests : IClassFixture<EmailApiFixture>
{
    private readonly EmailApiFixture _fixture;

    public EmailEndpointTests(EmailApiFixture fixture) => _fixture = fixture;

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
        var name = $"p{Guid.NewGuid():N}"[..12];
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(player.PlayerId, name, Token));
        await _fixture.Store.MarkEnrolledAsync(player.PlayerId, Token);
        return player;
    }

    private static HttpRequestMessage Post(string url, object body, string? token = null)
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

    private static HttpRequestMessage Get(string url, string? token = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (token is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }
        return request;
    }

    private static async Task<JsonElement> JsonBody(HttpResponseMessage response)
    {
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    // ---- Task 2.1: DI registration ----------------------------------------

    [Fact]
    public void Email_sender_is_registered_when_smtp_is_configured()
    {
        using var scope = _fixture.Services.CreateScope();
        var sender = scope.ServiceProvider.GetService<IEmailSender>();
        Assert.NotNull(sender);
    }

    [Fact]
    public void Email_sender_is_not_registered_without_smtp_config()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var scope = factory.Services.CreateScope();
        var sender = scope.ServiceProvider.GetService<IEmailSender>();
        Assert.Null(sender);
    }

    // ---- Task 5.1: Email-add endpoints ------------------------------------

    [Fact]
    public async Task Email_enabled_returns_true_when_smtp_configured()
    {
        var client = _fixture.CreateClient();
        var response = await client.GetAsync("/api/v1/players/email/enabled", Token);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("enabled").GetBoolean());
    }

    [Fact]
    public async Task Add_begin_sends_code_to_email()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        var response = await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("sent").GetBoolean());

        await Task.Delay(50, Token);
        Assert.NotNull(_fixture.EmailSender.LastCodeFor(email));
    }

    [Fact]
    public async Task Add_verify_links_email_to_account()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);
        await Task.Delay(50, Token);

        var code = _fixture.EmailSender.LastCodeFor(email)!;

        var response = await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code }, account.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("verified").GetBoolean());

        var me = await client.SendAsync(Get("/api/v1/players/me", account.Token), Token);
        var meBody = await JsonBody(me);
        Assert.Equal(email, meBody.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Duplicate_email_is_refused()
    {
        var client = _fixture.CreateClient();
        var email = $"{Guid.NewGuid():N}@test.local";

        var account1 = await NewAccountAsync(client);
        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account1.Token), Token);
        await Task.Delay(50, Token);
        var code1 = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code = code1 }, account1.Token), Token);

        var account2 = await NewAccountAsync(client);
        var response = await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account2.Token), Token);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Email_uniqueness_is_case_insensitive()
    {
        var client = _fixture.CreateClient();
        var local = Guid.NewGuid().ToString("N");
        var email = $"{local}@test.local";
        var emailUpper = $"{local.ToUpperInvariant()}@TEST.LOCAL";

        var account1 = await NewAccountAsync(client);
        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account1.Token), Token);
        await Task.Delay(50, Token);
        var code = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code }, account1.Token), Token);

        var account2 = await NewAccountAsync(client);
        var response = await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email = emailUpper }, account2.Token), Token);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Remove_email_unlinks_it()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);
        await Task.Delay(50, Token);
        var code = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code }, account.Token), Token);

        var removeResponse = await client.SendAsync(
            Post("/api/v1/players/email/remove", new { }, account.Token), Token);
        Assert.Equal(HttpStatusCode.OK, removeResponse.StatusCode);

        var me = await client.SendAsync(Get("/api/v1/players/me", account.Token), Token);
        var meBody = await JsonBody(me);
        Assert.Equal(JsonValueKind.Null, meBody.GetProperty("email").ValueKind);
    }

    // ---- Task 6.1: Email sign-in endpoints --------------------------------

    [Fact]
    public async Task Signin_begin_returns_success_for_unknown_email()
    {
        var client = _fixture.CreateClient();
        var email = $"unknown-{Guid.NewGuid():N}@test.local";

        var response = await client.SendAsync(
            Post("/api/v1/players/email/signin/begin", new { email }), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("sent").GetBoolean());
    }

    [Fact]
    public async Task Signin_finish_issues_token_for_valid_code()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);
        await Task.Delay(50, Token);
        var addCode = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code = addCode }, account.Token), Token);

        await client.SendAsync(
            Post("/api/v1/players/email/signin/begin", new { email }), Token);
        await Task.Delay(50, Token);
        var signinCode = _fixture.EmailSender.LastCodeFor(email)!;

        var response = await client.SendAsync(
            Post("/api/v1/players/email/signin/finish", new { email, code = signinCode }), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.Equal(account.PlayerId, body.GetProperty("playerId").GetString());
        Assert.False(body.GetProperty("isAnonymous").GetBoolean());
    }

    [Fact]
    public async Task Signin_finish_refuses_wrong_code()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);
        await Task.Delay(50, Token);
        var addCode = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code = addCode }, account.Token), Token);

        await client.SendAsync(
            Post("/api/v1/players/email/signin/begin", new { email }), Token);

        var response = await client.SendAsync(
            Post("/api/v1/players/email/signin/finish", new { email, code = "000000" }), Token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Signin_code_cannot_be_reused()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/add/begin", new { email }, account.Token), Token);
        await Task.Delay(50, Token);
        var addCode = _fixture.EmailSender.LastCodeFor(email)!;
        await client.SendAsync(
            Post("/api/v1/players/email/add/verify", new { code = addCode }, account.Token), Token);

        await client.SendAsync(
            Post("/api/v1/players/email/signin/begin", new { email }), Token);
        await Task.Delay(50, Token);
        var signinCode = _fixture.EmailSender.LastCodeFor(email)!;

        var first = await client.SendAsync(
            Post("/api/v1/players/email/signin/finish", new { email, code = signinCode }), Token);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.SendAsync(
            Post("/api/v1/players/email/signin/finish", new { email, code = signinCode }), Token);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
    }

    // ---- Task 7.1: Email registration endpoints ---------------------------

    [Fact]
    public async Task Register_claims_username_and_sends_code()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var username = $"r{Guid.NewGuid():N}"[..12];
        var email = $"{Guid.NewGuid():N}@test.local";

        var response = await client.SendAsync(
            Post("/api/v1/players/email/register",
                 new { username, email }, player.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("sent").GetBoolean());

        await Task.Delay(50, Token);
        Assert.NotNull(_fixture.EmailSender.LastCodeFor(email));
    }

    [Fact]
    public async Task Register_verify_completes_registration()
    {
        var client = _fixture.CreateClient();
        var player = await NewPlayerAsync(client);
        var username = $"r{Guid.NewGuid():N}"[..12];
        var email = $"{Guid.NewGuid():N}@test.local";

        await client.SendAsync(
            Post("/api/v1/players/email/register",
                 new { username, email }, player.Token), Token);
        await Task.Delay(50, Token);
        var code = _fixture.EmailSender.LastCodeFor(email)!;

        var response = await client.SendAsync(
            Post("/api/v1/players/email/register/verify",
                 new { code }, player.Token), Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonBody(response);
        Assert.True(body.GetProperty("enrolled").GetBoolean());

        var me = await client.SendAsync(Get("/api/v1/players/me", player.Token), Token);
        var meBody = await JsonBody(me);
        Assert.False(meBody.GetProperty("isAnonymous").GetBoolean());
        Assert.Equal(email, meBody.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Register_refuses_taken_username()
    {
        var client = _fixture.CreateClient();
        var name = $"r{Guid.NewGuid():N}"[..12];

        var first = await NewPlayerAsync(client);
        Assert.True(await _fixture.Store.TryClaimUsernameAsync(first.PlayerId, name, Token));

        var second = await NewPlayerAsync(client);
        var response = await client.SendAsync(
            Post("/api/v1/players/email/register",
                 new { username = name, email = $"{Guid.NewGuid():N}@test.local" }, second.Token), Token);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await JsonBody(response);
        Assert.Equal("username-taken", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Me_includes_email_and_emailEnabled()
    {
        var client = _fixture.CreateClient();
        var account = await NewAccountAsync(client);

        var response = await client.SendAsync(Get("/api/v1/players/me", account.Token), Token);
        var body = await JsonBody(response);

        Assert.True(body.GetProperty("emailEnabled").GetBoolean());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("email").ValueKind);
    }
}
