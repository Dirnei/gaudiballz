using System.Collections.Frozen;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Puzzle.Server.Levels;

/// <summary>
/// Short shareable codes that unlock a level.
///
/// A code is derived from the level id and a secret, so the set is stable for a given secret
/// and a code that has been shared keeps working. Six characters out of a 31-character
/// alphabet is roughly 887 million codes, but 10,000 of them drawn at random still collide
/// about one time in twenty — so uniqueness is built rather than hoped for: a level whose
/// first candidate is taken is rehashed with a counter until it lands on a free one. The
/// tables are built once at startup, which is also what makes the reverse lookup possible.
/// </summary>
public sealed class LevelCodes
{
    private const int CodeLength = 6;

    /// <summary>Levels beyond this have no code. Far past anything the campaign will reach.</summary>
    public const int MaxLevel = 10_000;

    // No 0/O/1/I/L: a code is meant to be read off one screen and typed into another.
    private const string Alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

    private readonly byte[] _key;
    private readonly string[] _codes;
    private readonly FrozenDictionary<string, int> _levels;

    public LevelCodes(string secret)
    {
        _key = Encoding.UTF8.GetBytes(secret);
        _codes = new string[MaxLevel + 1];

        var taken = new Dictionary<string, int>(MaxLevel, StringComparer.OrdinalIgnoreCase);
        for (var level = 1; level <= MaxLevel; level++)
        {
            var attempt = 0;
            string code;
            while (!taken.TryAdd(code = Generate(level, attempt), level))
            {
                attempt++;
            }

            _codes[level] = code;
        }

        _levels = taken.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>The code for a level, or null for a level too far out to have one.</summary>
    public string? CodeFor(int levelId)
    {
        return levelId >= 1 && levelId <= MaxLevel ? _codes[levelId] : null;
    }

    public int? LevelFor(string code)
    {
        return _levels.TryGetValue(code.Trim(), out var level) ? level : null;
    }

    /// <summary>
    /// The candidate code for a level. Attempt 0 hashes the bare level id; later attempts add
    /// the counter, so resolving a collision stays a pure function of (secret, level).
    /// </summary>
    private string Generate(int levelId, int attempt)
    {
        var id = levelId.ToString(CultureInfo.InvariantCulture);
        var message = attempt == 0 ? id : $"{id}:{attempt.ToString(CultureInfo.InvariantCulture)}";
        var hash = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(message));

        var result = new char[CodeLength];
        for (var i = 0; i < CodeLength; i++)
        {
            result[i] = Alphabet[hash[i] % Alphabet.Length];
        }

        return new string(result);
    }
}
