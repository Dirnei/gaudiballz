using Puzzle.Rules;
using Puzzle.Server.Levels;

namespace Puzzle.Server.Tests;

/// <summary>
/// Checks the levels players actually receive, not synthetic parameters.
///
/// <see cref="Puzzle.Rules"/> proves the generator solvable across arbitrary inputs; this
/// proves the campaign curve never asks for a combination that breaks it. The two are
/// worth keeping separate: a difficulty curve is edited far more often than a generator,
/// and it is the likelier source of a bad level.
/// </summary>
public sealed class LevelCatalogueTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>Deep enough to cover every step of the curve, including past its last band.</summary>
    private static IEnumerable<int> CampaignLevels() => Enumerable.Range(1, 200);

    [Fact]
    public void Every_campaign_level_is_solvable()
    {
        var failures = new List<string>();

        foreach (var levelId in CampaignLevels())
        {
            var level = LevelCatalogue.Build(levelId);
            var board = level.Board;

            var replayed = true;
            foreach (var move in level.ConstructiveSolution)
            {
                if (!Rules.TryApply(board, move, out board, out _))
                {
                    failures.Add($"level {levelId}: illegal move {move} in its own solution");
                    replayed = false;
                    break;
                }
            }

            if (replayed && !Rules.IsSolved(board))
            {
                failures.Add($"level {levelId}: solution replayed but board is not solved");
            }
        }

        Assert.True(failures.Count == 0, string.Join("; ", failures.Take(5)));
    }

    [Fact]
    public void No_campaign_level_starts_solved()
    {
        var alreadySolved = CampaignLevels()
            .Where(id => Rules.IsSolved(LevelCatalogue.Build(id).Board))
            .ToArray();

        Assert.True(alreadySolved.Length == 0,
            $"These levels need no moves at all: {string.Join(", ", alreadySolved)}.");
    }

    [Fact]
    public void Every_campaign_level_has_at_least_one_move_available()
    {
        // A board with no legal move would be unplayable regardless of solvability.
        var stuck = CampaignLevels()
            .Where(id => Rules.LegalMoves(LevelCatalogue.Build(id).Board).Count == 0)
            .ToArray();

        Assert.True(stuck.Length == 0, $"These levels open with no legal move: {string.Join(", ", stuck)}.");
    }

    [Fact]
    public void The_curve_never_exceeds_the_board_limits()
    {
        foreach (var levelId in CampaignLevels())
        {
            var parameters = LevelCatalogue.ParametersFor(levelId);

            Assert.True(parameters.TubeCount <= Board.MaxTubes,
                $"Level {levelId} asks for {parameters.TubeCount} tubes.");
            Assert.True(parameters.Capacity <= Tube.MaxCapacity,
                $"Level {levelId} asks for capacity {parameters.Capacity}.");
            Assert.True(parameters.SpareTubes >= 1,
                $"Level {levelId} leaves no spare tube.");
        }
    }

    [Fact]
    public void Levels_are_reproducible()
    {
        // The same id must always give the same board: progress and any future verification
        // both depend on a level id meaning exactly one puzzle, forever.
        foreach (var levelId in new[] { 1, 7, 30, 31, 99, 200 })
        {
            var first = LevelCatalogue.Build(levelId);
            var second = LevelCatalogue.Build(levelId);

            Assert.Equal(first.Board, second.Board);
        }
    }
}
