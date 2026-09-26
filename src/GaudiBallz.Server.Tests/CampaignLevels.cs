using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Every campaign level, generated once and in parallel before the tests that walk them run.
///
/// <see cref="LevelCatalogue.Build"/> caches, so whichever test first touched all 200 levels
/// used to pay for generating them one after another: about nine seconds on one core, and the
/// longest stretch of the whole server run. Generation is independent per level (each has its own
/// seed and random source) and the cache is concurrent, so spreading it over every core costs
/// the tests nothing: they still check every level, and find it already built.
///
/// Used as a class fixture by the classes that walk the campaign. The work is shared between
/// them through the static task, and the classes that don't need levels start without waiting.
/// </summary>
public sealed class CampaignLevels : IAsyncLifetime
{
    /// <summary>The campaign as the level tests know it: levels 1 to 200.</summary>
    public const int Count = 200;

    private static readonly Lazy<Task> Built = new(() => Task.Run(() =>
        Parallel.For(1, Count + 1, levelId => LevelCatalogue.Build(levelId))));

    public static IEnumerable<int> All() => Enumerable.Range(1, Count);

    public async ValueTask InitializeAsync() => await Built.Value;

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
