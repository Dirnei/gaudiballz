using System.Collections.Frozen;
using System.Security.Cryptography;
using System.Text;

namespace Puzzle.Server.Levels;

public sealed class LevelCodes
{
    private const int CodeLength = 6;
    private const int MaxLevel = 10_000;
    private const string Alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

    private readonly byte[] _key;
    private readonly FrozenDictionary<string, int> _reverseLookup;

    public LevelCodes(string secret)
    {
        _key = Encoding.UTF8.GetBytes(secret);

        var lookup = new Dictionary<string, int>(MaxLevel, StringComparer.OrdinalIgnoreCase);
        for (var level = 1; level <= MaxLevel; level++)
        {
            lookup[Generate(level)] = level;
        }

        _reverseLookup = lookup.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
    }

    public string CodeFor(int levelId)
    {
        return Generate(levelId);
    }

    public int? LevelFor(string code)
    {
        return _reverseLookup.TryGetValue(code.Trim(), out var level) ? level : null;
    }

    private string Generate(int levelId)
    {
        var hash = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(levelId.ToString(System.Globalization.CultureInfo.InvariantCulture)));

        var result = new char[CodeLength];
        for (var i = 0; i < CodeLength; i++)
        {
            result[i] = Alphabet[hash[i] % Alphabet.Length];
        }

        return new string(result);
    }
}
