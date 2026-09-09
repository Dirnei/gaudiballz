using FsCheck.Xunit;

namespace GaudiBallz.Rules.Tests;

/// <summary>
/// Properties that must hold for every board the game can produce, not just the handful an
/// example test names.
///
/// Boards come from the generator and are then walked a random distance along their own
/// solution, so the states under test are ones a player could actually reach rather than
/// synthetic arrangements.
/// </summary>
public sealed class RuleSetPropertyTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    private static Board BoardFrom(ulong seed, int rawParameters, int walk)
    {
        var colours = 3 + Math.Abs(rawParameters % 7);
        var capacity = 3 + Math.Abs(rawParameters / 7 % 2);
        var spare = 1 + Math.Abs(rawParameters / 14 % 2);

        var level = LevelGenerator.Generate(seed, LevelParameters.ForColours(colours, capacity, spare));

        var board = level.Board;
        var steps = level.ConstructiveSolution.Count == 0
            ? 0
            : Math.Abs(walk) % level.ConstructiveSolution.Count;

        for (var i = 0; i < steps; i++)
        {
            Rules.TryApply(board, level.ConstructiveSolution[i], out board, out _);
        }

        return board;
    }

    private static int[] ColourCounts(Board board)
    {
        var counts = new int[board.ColourCount + 1];
        for (var tube = 0; tube < board.TubeCount; tube++)
        {
            for (var slot = 0; slot < board[tube].Count; slot++)
            {
                counts[board[tube].ColourAt(slot)]++;
            }
        }

        return counts;
    }

    [Property(MaxTest = 200)]
    public bool Every_legal_move_conserves_every_colour(ulong seed, int rawParameters, int walk)
    {
        var board = BoardFrom(seed, rawParameters, walk);
        var before = ColourCounts(board);

        foreach (var move in Rules.LegalMoves(board))
        {
            Rules.TryApply(board, move, out var after, out _);
            if (!ColourCounts(after).SequenceEqual(before))
            {
                return false;
            }
        }

        return true;
    }

    [Property(MaxTest = 200)]
    public bool No_move_can_overfill_or_empty_below_nothing(ulong seed, int rawParameters, int walk)
    {
        var board = BoardFrom(seed, rawParameters, walk);

        foreach (var move in Rules.LegalMoves(board))
        {
            Rules.TryApply(board, move, out var after, out var moved);

            if (moved < 1)
            {
                return false;
            }

            for (var tube = 0; tube < after.TubeCount; tube++)
            {
                if (after[tube].Count > after.Capacity || after[tube].Count < 0)
                {
                    return false;
                }
            }
        }

        return true;
    }

    [Property(MaxTest = 200)]
    public bool Enumeration_lists_every_legal_move_exactly_once(ulong seed, int rawParameters, int walk)
    {
        var board = BoardFrom(seed, rawParameters, walk);
        var enumerated = Rules.LegalMoves(board);

        if (enumerated.Distinct().Count() != enumerated.Count)
        {
            return false;
        }

        // Cross-check against brute force over every ordered pair of tubes.
        var expected = new List<Move>();
        for (byte from = 0; from < board.TubeCount; from++)
        {
            for (byte to = 0; to < board.TubeCount; to++)
            {
                if (Rules.Validate(board, new Move(from, to)) == MoveRejection.None)
                {
                    expected.Add(new Move(from, to));
                }
            }
        }

        return enumerated.SequenceEqual(expected);
    }

    [Property(MaxTest = 200)]
    public bool Solvedness_depends_only_on_the_board(ulong seed, int rawParameters, int walk)
    {
        var board = BoardFrom(seed, rawParameters, walk);

        // Reaching the same contents by a different route must give the same verdict, so
        // the win condition cannot come to depend on move history.
        var rebuilt = Board.Create(
            [.. board.Tubes.Select(t =>
                (IReadOnlyList<byte>)[.. Enumerable.Range(0, t.Count).Select(s => t.ColourAt(s))])],
            board.Capacity,
            board.ColourCount);

        return Rules.IsSolved(board) == Rules.IsSolved(rebuilt);
    }
}
