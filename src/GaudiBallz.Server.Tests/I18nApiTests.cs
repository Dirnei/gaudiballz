using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Verifies that API responses include the fields clients need for localisation:
/// stable keys alongside human-readable English text, and machine-readable error codes.
/// </summary>
public sealed class I18nApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public I18nApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    // ---- level response includes noteKey -----------------------------------

    [Fact]
    public async Task Level_at_one_spare_boundary_includes_spare_tube_noteKey()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            $"/api/v1/levels/{LevelCatalogue.OneSpareTubeFrom}", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal("spare-tube", body.GetProperty("noteKey").GetString());
        // The human-readable note is still present.
        Assert.False(string.IsNullOrEmpty(body.GetProperty("chapterNote").GetString()));
    }

    [Fact]
    public async Task Level_111_includes_shorter_tubes_noteKey()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/levels/111", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal("shorter-tubes", body.GetProperty("noteKey").GetString());
    }

    [Fact]
    public async Task Ordinary_level_has_null_noteKey()
    {
        var client = _factory.CreateClient();

        // Level 2 has no chapter note.
        var response = await client.GetAsync("/api/v1/levels/2", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("noteKey").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("chapterNote").ValueKind);
    }

    // ---- level code validation error includes code -------------------------

    [Fact]
    public async Task Invalid_level_code_includes_error_code()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/levels/unlock", new { code = "ZZZZZZ" }, Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal("invalid-level-code", body.GetProperty("code").GetString());
        // The human-readable error text is still present.
        Assert.False(string.IsNullOrEmpty(body.GetProperty("error").GetString()));
    }

    // ---- username validation errors include code ---------------------------

    [Fact]
    public async Task Too_short_username_includes_code()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/api/v1/players/username-available?username=ab", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.False(body.GetProperty("available").GetBoolean());
        Assert.Equal("username-too-short", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Too_long_username_includes_code()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/api/v1/players/username-available?username=abcdefghijklmnopqrstuvwxyz", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.False(body.GetProperty("available").GetBoolean());
        Assert.Equal("username-too-long", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Invalid_chars_username_includes_code()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/api/v1/players/username-available?username=no spaces!", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.False(body.GetProperty("available").GetBoolean());
        Assert.Equal("username-invalid-chars", body.GetProperty("code").GetString());
    }
}
