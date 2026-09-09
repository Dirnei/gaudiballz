using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

public sealed class LevelCodesTests
{
    private const string TestSecret = "test-secret-for-level-codes";
    private readonly LevelCodes _codes = new(TestSecret);

    [Fact]
    public void Same_level_always_returns_the_same_code()
    {
        var first = _codes.CodeFor(42);
        var second = _codes.CodeFor(42);

        Assert.Equal(first, second);
    }

    /// <summary>
    /// This secret makes levels 4899 and 9164 hash to the same candidate code, which is the
    /// case the rehash-on-collision loop exists for. Roughly one secret in twenty does this,
    /// so without it the suite would only be testing that this particular secret got lucky.
    /// </summary>
    [Fact]
    public void Colliding_candidates_are_resolved_into_unique_codes()
    {
        var codes = new LevelCodes("collides-16");

        Assert.NotEqual(codes.CodeFor(4899), codes.CodeFor(9164));
        Assert.Equal(4899, codes.LevelFor(codes.CodeFor(4899)!));
        Assert.Equal(9164, codes.LevelFor(codes.CodeFor(9164)!));
    }

    [Fact]
    public void Levels_beyond_the_table_have_no_code()
    {
        Assert.Null(_codes.CodeFor(LevelCodes.MaxLevel + 1));
        Assert.Null(_codes.CodeFor(0));
    }

    [Fact]
    public void First_10000_levels_have_unique_codes()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var level = 1; level <= 10_000; level++)
        {
            var code = _codes.CodeFor(level)!;
            Assert.True(seen.Add(code), $"Level {level} collides with an earlier level: {code}");
        }
    }

    [Fact]
    public void Codes_are_at_most_6_characters()
    {
        for (var level = 1; level <= 10_000; level++)
        {
            var code = _codes.CodeFor(level)!;
            Assert.True(code.Length <= 6, $"Level {level} code is {code.Length} characters: {code}");
        }
    }

    [Fact]
    public void Codes_contain_no_ambiguous_characters()
    {
        var ambiguous = new HashSet<char> { '0', 'O', '1', 'I', 'l' };

        for (var level = 1; level <= 10_000; level++)
        {
            var code = _codes.CodeFor(level)!;
            foreach (var ch in code)
            {
                Assert.DoesNotContain(ch, ambiguous);
            }
        }
    }

    [Fact]
    public void Valid_code_returns_correct_level()
    {
        var code = _codes.CodeFor(50)!;
        var level = _codes.LevelFor(code);

        Assert.Equal(50, level);
    }

    [Fact]
    public void Invalid_code_returns_null()
    {
        var level = _codes.LevelFor("ZZZZZZ");

        Assert.Null(level);
    }

    [Fact]
    public void Validation_is_case_insensitive()
    {
        var code = _codes.CodeFor(50)!;
        var lower = _codes.LevelFor(code.ToLowerInvariant());
        var upper = _codes.LevelFor(code.ToUpperInvariant());

        Assert.Equal(50, lower);
        Assert.Equal(50, upper);
    }

    [Fact]
    public void Whitespace_is_trimmed()
    {
        var code = _codes.CodeFor(50)!;
        var level = _codes.LevelFor($"  {code}  ");

        Assert.Equal(50, level);
    }
}
