using GaudiBallz.Server.PlayerIdentity;
using Microsoft.Extensions.Time.Testing;

namespace GaudiBallz.Server.Tests;

public sealed class EmailCodeStoreTests
{
    private readonly FakeTimeProvider _time = new(DateTimeOffset.UtcNow);

    private EmailCodeStore CreateStore() => new(_time);

    [Fact]
    public void Create_returns_six_digit_code()
    {
        var store = CreateStore();

        var result = store.Create("player@example.com");

        Assert.True(result.Created);
        Assert.Matches(@"^\d{6}$", result.Code);
    }

    [Fact]
    public void Verify_correct_code_returns_valid()
    {
        var store = CreateStore();
        var created = store.Create("player@example.com");

        var result = store.Verify("player@example.com", created.Code);

        Assert.True(result.Valid);
        Assert.Null(result.Error);
    }

    [Fact]
    public void Verify_wrong_code_returns_invalid()
    {
        var store = CreateStore();
        store.Create("player@example.com");

        var result = store.Verify("player@example.com", "000000");

        Assert.False(result.Valid);
        Assert.Equal("invalid", result.Error);
    }

    [Fact]
    public void Verify_expired_code_returns_expired()
    {
        var store = CreateStore();
        store.Create("player@example.com");

        _time.Advance(TimeSpan.FromMinutes(11));

        var result = store.Verify("player@example.com", "123456");

        Assert.False(result.Valid);
        Assert.Equal("expired", result.Error);
    }

    [Fact]
    public void Verify_used_code_cannot_be_reused()
    {
        var store = CreateStore();
        var created = store.Create("player@example.com");

        var first = store.Verify("player@example.com", created.Code);
        Assert.True(first.Valid);

        var second = store.Verify("player@example.com", created.Code);
        Assert.False(second.Valid);
        Assert.Equal("no-pending", second.Error);
    }

    [Fact]
    public void Verify_too_many_attempts_invalidates_code()
    {
        var store = CreateStore();
        var created = store.Create("player@example.com");

        for (var i = 0; i < 5; i++)
        {
            var bad = store.Verify("player@example.com", "000000");
            Assert.False(bad.Valid);
        }

        var result = store.Verify("player@example.com", created.Code);
        Assert.False(result.Valid);
        Assert.Equal("too-many-attempts", result.Error);
    }

    [Fact]
    public void Create_during_cooldown_refuses()
    {
        var store = CreateStore();
        store.Create("player@example.com");

        _time.Advance(TimeSpan.FromSeconds(30));

        var result = store.Create("player@example.com");

        Assert.False(result.Created);
        Assert.Equal("cooldown", result.Error);
    }

    [Fact]
    public void Create_after_cooldown_succeeds()
    {
        var store = CreateStore();
        store.Create("player@example.com");

        _time.Advance(TimeSpan.FromSeconds(61));

        var result = store.Create("player@example.com");

        Assert.True(result.Created);
        Assert.Matches(@"^\d{6}$", result.Code);
    }
}
