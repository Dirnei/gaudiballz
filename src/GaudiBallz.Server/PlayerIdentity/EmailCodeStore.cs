using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace GaudiBallz.Server.PlayerIdentity;

public sealed class EmailCodeStore
{
    private readonly ConcurrentDictionary<string, PendingCode> _codes = new();
    private readonly TimeProvider _time;

    private static readonly TimeSpan CodeTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(60);
    private const int MaxAttempts = 5;

    public EmailCodeStore(TimeProvider? time = null)
    {
        _time = time ?? TimeProvider.System;
    }

    public sealed record CreateResult(string Code, bool Created, string? Error = null);

    public CreateResult Create(string email)
    {
        var key = Normalise(email);
        CleanExpired();

        if (_codes.TryGetValue(key, out var existing) && !IsExpired(existing))
        {
            var elapsed = _time.GetUtcNow() - existing.CreatedAt;
            if (elapsed < Cooldown)
            {
                return new CreateResult(string.Empty, false, "cooldown");
            }
        }

        var code = Random.Shared.Next(100_000, 999_999).ToString(System.Globalization.CultureInfo.InvariantCulture);
        var hashed = Hash(code);

        _codes[key] = new PendingCode(hashed, _time.GetUtcNow(), 0);
        return new CreateResult(code, true);
    }

    public sealed record VerifyResult(bool Valid, string? PlayerId = null, string? Error = null);

    public VerifyResult Verify(string email, string code)
    {
        var key = Normalise(email);

        if (!_codes.TryGetValue(key, out var pending))
        {
            return new VerifyResult(false, Error: "no-pending");
        }

        if (IsExpired(pending))
        {
            _codes.TryRemove(key, out _);
            return new VerifyResult(false, Error: "expired");
        }

        if (pending.Attempts >= MaxAttempts)
        {
            _codes.TryRemove(key, out _);
            return new VerifyResult(false, Error: "too-many-attempts");
        }

        _codes[key] = pending with { Attempts = pending.Attempts + 1 };

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(Hash(code)),
                Encoding.UTF8.GetBytes(pending.CodeHash)))
        {
            return new VerifyResult(false, Error: "invalid");
        }

        _codes.TryRemove(key, out _);
        return new VerifyResult(true);
    }

    public void Remove(string email) => _codes.TryRemove(Normalise(email), out _);

    private bool IsExpired(PendingCode code) =>
        (_time.GetUtcNow() - code.CreatedAt) > CodeTtl;

    private void CleanExpired()
    {
        foreach (var (key, code) in _codes)
        {
            if (IsExpired(code))
            {
                _codes.TryRemove(key, out _);
            }
        }
    }

    internal static string Normalise(string email) => email.Trim().ToLowerInvariant();

    private static string Hash(string code)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(code));
        return Convert.ToHexStringLower(bytes);
    }

    private sealed record PendingCode(string CodeHash, DateTimeOffset CreatedAt, int Attempts);
}
