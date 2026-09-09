using System.Collections.Concurrent;

namespace Puzzle.Server.Hub;

/// <summary>
/// Tracks which players are currently online via periodic heartbeats. Players who stop
/// heartbeating drop off after the TTL expires.
///
/// In-memory by design: an approximate count that tolerates restarts is the right trade-off
/// for a counter that changes every second and only needs to be roughly right.
/// </summary>
public sealed class PresenceTracker : IDisposable
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(90);
    private static readonly TimeSpan EvictionInterval = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<string, DateTime> _seen = new();
    private readonly Timer _evictionTimer;

    public PresenceTracker()
    {
        _evictionTimer = new Timer(_ => Evict(), null, EvictionInterval, EvictionInterval);
    }

    public int OnlineCount => _seen.Count;

    public void Touch(string playerId) => _seen[playerId] = DateTime.UtcNow;

    private void Evict()
    {
        var cutoff = DateTime.UtcNow - Ttl;
        foreach (var (key, lastSeen) in _seen)
        {
            if (lastSeen < cutoff)
            {
                _seen.TryRemove(key, out _);
            }
        }
    }

    public void Dispose() => _evictionTimer.Dispose();
}
