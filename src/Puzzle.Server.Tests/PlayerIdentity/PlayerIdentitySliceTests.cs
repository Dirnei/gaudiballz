
namespace Puzzle.Server.Tests.PlayerIdentity;

/// <summary>
/// Tests live beside the slice they cover, under src/, so the whole capability — its
/// behaviour and the tests pinning it down — reviews as one directory.
/// </summary>
public sealed class PlayerIdentitySliceTests
{
    [Fact]
    public void Announces_a_stable_slice_name()
    {
        // The name appears in startup diagnostics and telemetry, so it is part of the
        // slice's contract rather than a label.
        Assert.Equal("player-identity", Server.PlayerIdentity.PlayerIdentitySlice.Name);
    }
}
