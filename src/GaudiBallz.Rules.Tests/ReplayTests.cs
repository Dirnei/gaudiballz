using System.Reflection;
using System.Text.Json;

namespace GaudiBallz.Rules.Tests;

/// <summary>
/// Replaying a submitted move list: the check the server runs before a completion counts.
///
/// Tied to the shared <c>replay-inputs.json</c> so the verdict is worked out on the same boards
/// and move sequences the two engines are already proven to agree on.
/// </summary>
public sealed class ReplayTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    private static Board BoardOf(BoardShape shape) =>
        Board.Create(shape.Tubes, shape.Capacity, shape.ColourCount);

    private static List<BidirectionalTraceTests.ReplayInput> Inputs()
    {
        var path = Path.Combine(
            typeof(ReplayTests).Assembly
                .GetCustomAttributes<AssemblyMetadataAttribute>()
                .Single(a => a.Key == "RepositoryRoot").Value!,
            "conformance", "v1", "replay-inputs.json");

        return JsonSerializer.Deserialize<List<BidirectionalTraceTests.ReplayInput>>(File.ReadAllText(path))!;
    }

    [Fact]
    public void Every_fixture_sequence_gets_the_verdict_stepping_through_it_gives()
    {
        foreach (var input in Inputs())
        {
            var board = BoardOf(input.Board);
            var moves = input.Moves.Select(m => new Move((byte)m.From, (byte)m.To)).ToList();

            // Worked out step by step with the engine, independently of Replay.
            ReplayOutcome expected = ReplayOutcome.NotSolved;
            var current = board;
            for (var i = 0; i < moves.Count; i++)
            {
                var rejection = Rules.Validate(current, moves[i]);
                if (rejection != MoveRejection.None)
                {
                    expected = ReplayOutcome.Illegal(i, rejection);
                    break;
                }

                Rules.TryApply(current, moves[i], out current, out _);
                if (i == moves.Count - 1 && Rules.IsSolved(current))
                {
                    expected = ReplayOutcome.Solved;
                }
            }

            Assert.Equal(expected, Replay.Verify(Rules, board, moves));
        }
    }

    [Fact]
    public void A_fixture_solution_without_the_spliced_refusals_is_solved()
    {
        foreach (var input in Inputs())
        {
            var moves = input.Moves
                .Where(m => m.From != m.To)
                .Select(m => new Move((byte)m.From, (byte)m.To))
                .ToList();

            Assert.Equal(ReplayOutcome.Solved, Replay.Verify(Rules, BoardOf(input.Board), moves));
        }
    }

    [Fact]
    public void An_illegal_move_reports_its_index_and_why()
    {
        var input = Inputs()[0];
        var moves = input.Moves.Select(m => new Move((byte)m.From, (byte)m.To)).ToList();
        var firstRefusal = moves.FindIndex(m => m.From == m.To);

        var outcome = Replay.Verify(Rules, BoardOf(input.Board), moves);

        Assert.Equal(ReplayVerdict.IllegalMove, outcome.Verdict);
        Assert.Equal(firstRefusal, outcome.MoveIndex);
        Assert.Equal(MoveRejection.SameTube, outcome.Rejection);
    }

    [Fact]
    public void Legal_moves_that_stop_short_are_not_solved()
    {
        var input = Inputs()[0];
        var moves = input.Moves
            .Where(m => m.From != m.To)
            .Select(m => new Move((byte)m.From, (byte)m.To))
            .ToList();

        Assert.Equal(ReplayOutcome.NotSolved, Replay.Verify(Rules, BoardOf(input.Board), moves[..^1]));
    }

    [Fact]
    public void No_moves_on_an_unsolved_board_is_not_solved()
    {
        var input = Inputs()[0];

        Assert.Equal(ReplayOutcome.NotSolved, Replay.Verify(Rules, BoardOf(input.Board), []));
    }
}
