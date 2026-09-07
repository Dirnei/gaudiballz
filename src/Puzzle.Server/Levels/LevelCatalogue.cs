using Puzzle.Rules;

namespace Puzzle.Server.Levels;

/// <summary>
/// Maps a level number onto a seed and difficulty, giving the campaign its shape.
///
/// The bands below are measured rather than guessed. Walking generated solutions and
/// counting the legal moves available at each step:
///
///   two spare tubes: 5.5-7.7 options, 12-27% of positions down to three or fewer
///   one spare tube:  2.0-3.0 options, 75-95% of positions down to three or fewer
///
/// Removing a spare tube is therefore not a harder level, it is a different game, and it
/// lands as a wall wherever it is placed. An earlier version dropped it at level 31 with no
/// other change and the result was brutal - and worse, flat: every level from 31 to 200
/// measured the same, so the back half had no progression at all.
///
/// Two things soften it here. The drop happens once, at level 50, so it reads as a new
/// chapter rather than a random spike. And it comes with deeper tubes, which measurably buy
/// some of the freedom back:
///
///   one spare, 8 colours, capacity 5:  80% of positions tight
///   one spare, 9 colours, capacity 5:  68% of positions tight
///   one spare, 10 colours, capacity 4: 80% of positions tight
///
/// which is counter-intuitive and worth stating plainly: on a one-spare board, adding
/// colours and depth both INCREASE the options available, because they add places to put
/// things. So the campaign steps the colour count up at the moment it takes the tube away.
///
/// Before that point, colours carry the curve on their own. Across 3 to 11 colours the
/// solution length grows from roughly 12 moves to 39 while the number of options stays
/// around six, so levels get longer and more tangled without becoming punishing.
/// </summary>
public static class LevelCatalogue
{
    /// <summary>Where the campaign gives up its second spare tube, for good.</summary>
    public const int OneSpareTubeFrom = 50;

    public static Level Build(int levelId)
    {
        var parameters = ParametersFor(levelId);

        // Mixing the id keeps consecutive levels from feeling related.
        var seed = Pcg32.SplitMix64((ulong)levelId * 0x9E3779B97F4A7C15UL);

        return LevelGenerator.Generate(seed, parameters);
    }

    public static LevelParameters ParametersFor(int levelId)
    {
        if (levelId < OneSpareTubeFrom)
        {
            // Colours alone, on a forgiving board. Bands widen as they go: later colours
            // add more work each and need longer to settle before the next step up.
            var colours = levelId switch
            {
                <= 3 => 3,
                <= 8 => 4,
                <= 15 => 5,
                <= 24 => 6,
                <= 35 => 7,
                _ => 8,
            };

            return LevelParameters.ForColours(colours, capacity: 4, spareTubes: 2);
        }

        // One spare tube from here, and the transition deliberately lands on the gentlest
        // one-spare configuration there is. Measured, because it is counter-intuitive: with
        // only one spare tube, MORE colours and deeper tubes both raise the number of
        // options rather than lowering it. Nine colours at capacity 5 measures 68% tight
        // against 80% for eight colours at capacity 5, so easing in means stepping the
        // colour count up at the same moment, not down.
        var lateColours = levelId switch
        {
            <= 67 => 9,
            <= 100 => 10,
            _ => 11,
        };

        // Depth comes back off later, which is what tightens the endgame: capacity 4 with a
        // single spare is the most constrained board the generator makes.
        var lateCapacity = levelId <= 85 ? 5 : 4;

        return LevelParameters.ForColours(lateColours, lateCapacity, spareTubes: 1);
    }

    /// <summary>
    /// A short note when a level changes the rules of engagement, so a step up reads as
    /// intended rather than as the game breaking. Null on ordinary levels.
    /// </summary>
    public static string? ChapterNote(int levelId)
    {
        if (levelId == OneSpareTubeFrom)
        {
            return "One spare tube from here — but the tubes are deeper.";
        }

        if (levelId == 86)
        {
            return "Shorter tubes. No more room to breathe.";
        }

        if (levelId < OneSpareTubeFrom
            && ParametersFor(levelId).Colours > ParametersFor(levelId - 1).Colours
            && levelId > 1)
        {
            return $"A new colour joins — {ParametersFor(levelId).Colours} to sort.";
        }

        return null;
    }
}
