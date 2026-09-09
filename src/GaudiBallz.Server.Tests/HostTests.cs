using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Proves the integration harness boots the real application rather than a
/// reconstruction of it. Once endpoints exist, these tests exercise the paths that are
/// only correct end to end: idempotent submission under concurrency, index creation
/// across restarts, and the offline sync batch.
/// </summary>
public sealed class ApiHarnessSmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ApiHarnessSmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Application_starts_and_reports_healthy()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/healthz", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_route_returns_not_found()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/no-such-endpoint", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
