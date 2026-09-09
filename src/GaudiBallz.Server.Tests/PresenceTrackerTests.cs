using GaudiBallz.Server.Hub;

namespace GaudiBallz.Server.Tests;

public sealed class PresenceTrackerTests : IDisposable
{
    private readonly PresenceTracker _tracker = new();

    [Fact]
    public void Online_count_starts_at_zero()
    {
        Assert.Equal(0, _tracker.OnlineCount);
    }

    [Fact]
    public void Touch_increments_online_count()
    {
        _tracker.Touch("player-1");
        Assert.Equal(1, _tracker.OnlineCount);
    }

    [Fact]
    public void Touching_same_player_twice_does_not_double_count()
    {
        _tracker.Touch("player-1");
        _tracker.Touch("player-1");
        Assert.Equal(1, _tracker.OnlineCount);
    }

    [Fact]
    public void Distinct_players_are_counted_separately()
    {
        _tracker.Touch("player-1");
        _tracker.Touch("player-2");
        _tracker.Touch("player-3");
        Assert.Equal(3, _tracker.OnlineCount);
    }

    public void Dispose() => _tracker.Dispose();
}
