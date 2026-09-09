using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Guards the shape of the campaign, not just its validity.
///
/// These exist because of a real bug: levels 51 and 52 had identical settings and measured
/// 40% and 76% tight, because whichever board the seed happened to produce was shipped. A
/// level being solvable says nothing about whether it belongs where it sits.
/// </summary>
public sealed class DifficultyCurveTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>
    /// Share of positions along the level's solution offering three or fewer legal moves.
    /// The same measure the catalogue selects on, recomputed here so the test would catch
    /// the selection being removed or broken.
    /// </summary>
    private static double Tightness(int levelId)
    {
        var level = LevelCatalogue.Build(levelId);
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

    [Fact]
    public void Difficulty_rises_across_the_campaign()
    {
        int[] checkpoints = [5, 25, 45, 60, 90, 120, 160];
        var measured = checkpoints.Select(Tightness).ToArray();

        for (var i = 1; i < measured.Length; i++)
        {
            Assert.True(
                measured[i] > measured[i - 1],
                $"Level {checkpoints[i]} ({measured[i]:P0} tight) is not harder than "
                + $"level {checkpoints[i - 1]} ({measured[i - 1]:P0}). The campaign should "
                + $"climb, not plateau.");
        }
    }

    [Fact]
    public void Neighbouring_levels_do_not_lurch()
    {
        // Level 50 is the deliberate exception: it gives up a spare tube, which is a step
        // change by design and is announced to the player.
        var offenders = new List<string>();

        for (var levelId = 3; levelId <= 130; levelId++)
        {
            if (levelId == LevelCatalogue.OneSpareTubeFrom)
            {
                continue;
            }

            var jump = Math.Abs(Tightness(levelId) - Tightness(levelId - 1));
            if (jump > 0.22)
            {
                offenders.Add($"L{levelId - 1}->L{levelId} jumps {jump:P0}");
            }
        }

        Assert.True(offenders.Count == 0,
            "Difficulty should not lurch between neighbouring levels: "
            + string.Join(", ", offenders.Take(6)));
    }

    [Theory]
    [InlineData(50, 70)]
    [InlineData(111, 130)]
    public void Levels_in_one_band_feel_alike(int from, int to)
    {
        var values = Enumerable.Range(from, to - from + 1).Select(Tightness).ToArray();
        var spread = values.Max() - values.Min();

        Assert.True(spread <= 0.25,
            $"Levels {from}-{to} share the same settings but their difficulty spans "
            + $"{spread:P0} ({values.Min():P0} to {values.Max():P0}). That is seed luck "
            + $"rather than design.");
    }

    [Fact]
    public void A_level_always_yields_the_same_board()
    {
        // Candidate selection must stay deterministic, or a level id stops meaning one
        // puzzle and any future progress or verification breaks.
        foreach (var levelId in new[] { 1, 37, 52, 99, 151 })
        {
            Assert.Equal(LevelCatalogue.Build(levelId).Board, LevelCatalogue.Build(levelId).Board);
        }
    }
}
