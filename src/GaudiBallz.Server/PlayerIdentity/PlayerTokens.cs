using System.Security.Cryptography;
using System.Text;

namespace GaudiBallz.Server.PlayerIdentity;

/// <summary>
/// The bearer token a browser keeps to prove which player it is.
///
/// Deliberately minimal: a player id and a signature over it, with no expiry. There is
/// nothing sensitive behind it — no email, no payment, no personal data, only which puzzle
/// levels someone has finished — and an expiring token would log players out of a game they
/// never signed in to.
///
/// The signing key lives in configuration. Losing or rotating it invalidates every
/// anonymous session, which is why enrolling a passkey is the thing that makes an account
/// durable rather than the token.
/// </summary>
public sealed class PlayerTokens(string signingKey)
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(signingKey);

    public string Issue(string playerId)
    {
        var payload = Base64Url(Encoding.UTF8.GetBytes(playerId));
        return $"{payload}.{Base64Url(Sign(payload))}";
    }

    /// <summary>Returns the player id, or null when the token is absent or not ours.</summary>
    public string? Verify(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var separator = token.IndexOf('.', StringComparison.Ordinal);
        if (separator <= 0 || separator == token.Length - 1)
        {
            return null;
        }

        var payload = token[..separator];
        var signature = token[(separator + 1)..];

        // Fixed-time comparison: a token check that leaks timing is a token check that can
        // be brute-forced a byte at a time.
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(Base64Url(Sign(payload)))))
        {
            return null;
        }

        try
        {
            return Encoding.UTF8.GetString(FromBase64Url(payload));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private byte[] Sign(string payload) =>
        HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += (padded.Length % 4) switch { 2 => "==", 3 => "=", _ => string.Empty };
        return Convert.FromBase64String(padded);
    }
}
