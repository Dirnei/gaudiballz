using Puzzle.Rules;

namespace Puzzle.Server.Levels;

/// <summary>
/// Maps a level number onto a seed and difficulty, giving the campaign its shape.
///
/// The curve is deliberately simple for now: colours grow, and the second spare tube is
/// taken away later on because spare tubes affect difficulty far more than anything else.
/// Tuning this against measured solve rates is a later change; getting it playable is this
/// one.
/// </summary>
public static class LevelCatalogue
{
    public static Level Build(int levelId)
    {
        var parameters = ParametersFor(levelId);

        // Mixing the id keeps consecutive levels from feeling related.
        var seed = Pcg32.SplitMix64((ulong)levelId * 0x9E3779B97F4A7C15UL);

        return LevelGenerator.Generate(seed, parameters);
    }

    internal static LevelParameters ParametersFor(int levelId)
    {
        // Ease in: a few gentle boards before the colour count starts climbing.
        var colours = levelId switch
        {
            <= 3 => 3,
            <= 8 => 4,
            <= 15 => 5,
            <= 25 => 6,
            <= 40 => 7,
            <= 60 => 8,
            _ => 9,
        };

        // The single biggest difficulty lever, so it moves last and only once.
        var spareTubes = levelId <= 30 ? 2 : 1;

        return LevelParameters.ForColours(colours, capacity: 4, spareTubes: spareTubes);
    }
}
