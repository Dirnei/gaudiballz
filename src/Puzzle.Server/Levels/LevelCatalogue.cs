using System.Collections.Concurrent;
using Puzzle.Rules;

namespace Puzzle.Server.Levels;

/// <summary>
/// Maps a level number onto a difficulty, and picks which generated board the player
/// actually gets.
///
/// Those are two separate jobs and the second is easy to overlook. Parameters set the shape
/// of the campaign; choosing among candidate boards is what stops neighbouring levels
/// swinging wildly. Without it, levels 51 and 52 measured 40% and 76% tight on identical
/// settings — same band, but one of them a wall. Across levels 50-70 the spread ran from
/// 32% to 87%, which is luck, not design.
///
/// PARAMETERS. Measured by walking generated solutions and counting the legal moves
/// available at each step:
///
///   two spare tubes: 5.5-7.7 options, 12-27% of positions down to three or fewer
///   one spare tube:  2.0-3.0 options, 75-95% of positions down to three or fewer
///
/// Removing a spare tube is not a harder level, it is a different game, and it lands as a
/// wall wherever it is placed. It happens once, at level 50, and arrives with deeper tubes —
/// counter-intuitive but measured: on a one-spare board extra colours and extra depth both
/// ADD places to put things, so eight colours at capacity 6 measures 62% tight against 80%
/// at capacity 4. Before level 50, colours carry the curve alone on a forgiving board.
/// </summary>
public static class LevelCatalogue
{
    /// <summary>Where the campaign gives up its second spare tube, for good.</summary>
    public const int OneSpareTubeFrom = 50;

    /// <summary>
    /// How many boards to generate before picking one. Each is cheap, the whole selection
    /// costs a few milliseconds, and levels are immutable so the result caches hard.
    /// </summary>
    private const int Candidates = 14;

    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>
    /// Levels are immutable and the same handful get requested constantly, so building one
    /// twice is pure waste. Selection also costs fourteen generations now, which makes the
    /// cache worth more than it was.
    /// </summary>
    private static readonly ConcurrentDictionary<int, Level> Cache = new();

    public static Level Build(int levelId) => Cache.GetOrAdd(levelId, Select);

    private static Level Select(int levelId)
    {
        var parameters = ParametersFor(levelId);
        var target = TargetTightness(levelId);

        Level? best = null;
        var bestDistance = double.MaxValue;

        for (var candidate = 0; candidate < Candidates; candidate++)
        {
            // Mixing the id keeps consecutive levels from feeling related; mixing the
            // candidate index keeps the whole search reproducible.
            var seed = Pcg32.SplitMix64(
                ((ulong)levelId * 0x9E3779B97F4A7C15UL) ^ ((ulong)candidate * 0xD1B54A32D192ED03UL));

            var level = LevelGenerator.Generate(seed, parameters);
            var distance = Math.Abs(Tightness(level) - target);

            if (distance < bestDistance)
            {
                bestDistance = distance;
                best = level;
            }
        }

        return best!;
    }

    /// <summary>
    /// The share of positions along a level's solution where three or fewer moves are legal.
    ///
    /// This predicts how a level feels far better than how many moves it takes. A long level
    /// with plenty of options is relaxing; a short one with almost none is vicious, because
    /// every tap is a decision that can lose the board.
    /// </summary>
    private static double Tightness(Level level)
    {
        var board = level.Board;
        var total = 0;
        var tight = 0;

        foreach (var move in level.ConstructiveSolution)
        {
            total++;
            if (Rules.LegalMoves(board).Count <= 3)
            {
                tight++;
            }

            Rules.TryApply(board, move, out board, out _);
        }

        return total == 0 ? 0 : tight / (double)total;
    }

    /// <summary>
    /// What a level at this point in the campaign should feel like. Rises smoothly inside
    /// each regime so difficulty climbs rather than lurching between neighbours. The two
    /// regimes get separate ramps because their achievable ranges barely overlap — a
    /// one-spare board cannot be made relaxing.
    /// </summary>
    private static double TargetTightness(int levelId)
    {
        if (levelId < OneSpareTubeFrom)
        {
            var progress = Math.Clamp((levelId - 1) / (double)(OneSpareTubeFrom - 2), 0, 1);
            return 0.10 + (progress * 0.26);
        }

        var late = Math.Clamp((levelId - OneSpareTubeFrom) / 110.0, 0, 1);
        return 0.45 + (late * 0.40);
    }

    public static LevelParameters ParametersFor(int levelId)
    {
        if (levelId < OneSpareTubeFrom)
        {
            var colours = levelId switch
            {
                <= 5 => 3,
                <= 14 => 4,
                <= 25 => 5,
                <= 38 => 6,
                _ => 7,
            };

            return LevelParameters.ForColours(colours, capacity: 4, spareTubes: 2);
        }

        var (lateColours, lateCapacity) = levelId switch
        {
            <= 70 => (8, 6),
            <= 90 => (9, 5),
            <= 110 => (10, 5),
            <= 130 => (11, 4),
            <= 150 => (12, 4),
            _ => (13, 4),
        };

        return LevelParameters.ForColours(lateColours, lateCapacity, spareTubes: 1);
    }

    /// <summary>
    /// The earliest level whose board contains this colour.
    ///
    /// Colours are 1-based and match the palette the client draws, which is ordered by when
    /// the campaign introduces each one.
    /// </summary>
    public readonly record struct ColourUnlock(int Colour, int UnlocksAtLevel);

    /// <summary>
    /// How far the walk below is allowed to go. The curve flattens long before this, so the
    /// cap never bites in practice — it is here so that editing the curve can never turn
    /// startup into a hang.
    /// </summary>
    private const int UnlockWalkCap = 1000;

    /// <summary>
    /// Every colour the campaign uses, with the level that first shows it.
    ///
    /// This is <see cref="ParametersFor"/> read backwards. A level with N colours contains
    /// exactly colours 1..N — that is a property of the generator, which fills from the front
    /// of the palette — so the first level to reach N is the level that introduces colour N.
    ///
    /// It exists because the client needs to say "unlocks at level 26" next to a ball, and
    /// the only alternative is a second copy of this curve written in TypeScript. The curve
    /// is a campaign decision rather than a rule, so it has no conformance fixtures behind
    /// it and a second copy would drift silently.
    ///
    /// Computed once: the curve is a switch over the level id and cannot change at runtime.
    /// </summary>
    public static readonly IReadOnlyList<ColourUnlock> ColourUnlocks =
        BuildColourUnlocks(levelId => ParametersFor(levelId).Colours, UnlockWalkCap);

    /// <summary>The highest colour the campaign ever puts on a board.</summary>
    public static int MaxColour => ColourUnlocks.Count;

    /// <summary>
    /// Walks levels upward, recording where each new colour first appears.
    ///
    /// Takes the curve as an argument rather than reading it directly so the walk's own
    /// termination can be tested against a curve that never stops growing.
    /// </summary>
    internal static IReadOnlyList<ColourUnlock> BuildColourUnlocks(Func<int, int> coloursAt, int cap)
    {
        var unlocks = new List<ColourUnlock>();
        var highest = 0;

        for (var levelId = 1; levelId <= cap; levelId++)
        {
            var colours = coloursAt(levelId);

            for (var colour = highest + 1; colour <= colours; colour++)
            {
                unlocks.Add(new ColourUnlock(colour, levelId));
            }

            if (colours > highest)
            {
                highest = colours;
            }
        }

        return unlocks;
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

        if (levelId == 111)
        {
            return "Shorter tubes. No more room to breathe.";
        }

        if (levelId > 1
            && levelId < OneSpareTubeFrom
            && ParametersFor(levelId).Colours > ParametersFor(levelId - 1).Colours)
        {
            return $"A new colour joins — {ParametersFor(levelId).Colours} to sort.";
        }

        return null;
    }

    public static int TimeTargetMs(int levelId)
    {
        var level = Build(levelId);
        var par = level.ConstructiveSolution.Count;
        var secondsPerMove = levelId < OneSpareTubeFrom ? 3 : 4;
        return par * secondsPerMove * 1000;
    }
}
