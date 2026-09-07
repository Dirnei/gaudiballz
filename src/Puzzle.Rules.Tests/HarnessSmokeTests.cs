using FsCheck.Xunit;

namespace Puzzle.Rules.Tests;

/// <summary>
/// Confirms the property-based testing harness is wired before anything depends on it.
/// The domain is verified by properties rather than examples — generated levels must
/// always be solvable, generation must be bytewise deterministic — so FsCheck failing to
/// load would silently reduce the whole suite to nothing.
///
/// These are placeholders in substance but not in purpose: they are deleted once real
/// properties in the same project exercise the same machinery.
/// </summary>
public sealed class HarnessSmokeTests
{
    [Fact]
    public void Xunit_runs()
    {
        Assert.True(true);
    }

    [Property]
    public bool FsCheck_generates_integers(int n)
    {
        return n + 0 == n;
    }

    [Property(MaxTest = 50)]
    public bool FsCheck_generates_and_shrinks_collections(int[] values)
    {
        return values.Length >= 0;
    }
}
