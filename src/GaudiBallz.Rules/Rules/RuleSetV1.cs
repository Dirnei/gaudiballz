namespace GaudiBallz.Rules;

/// <summary>
/// Version 1 of the rules. See the sort-puzzle-rules capability spec; the requirement each
/// member implements is named in its comment so a failing fixture points at a rule.
/// </summary>
public sealed class RuleSetV1 : IRuleSet
{
    public int Version => 1;

    /// <summary>Requirement: Move legality.</summary>
    public MoveRejection Validate(Board board, Move move)
    {
        ArgumentNullException.ThrowIfNull(board);

        if (move.From >= board.TubeCount || move.To >= board.TubeCount)
        {
            return MoveRejection.TubeOutOfRange;
        }

        if (move.From == move.To)
        {
            return MoveRejection.SameTube;
        }

        var source = board[move.From];
        if (source.IsEmpty)
        {
            return MoveRejection.SourceEmpty;
        }

        var destination = board[move.To];
        if (destination.Count >= board.Capacity)
        {
            return MoveRejection.DestinationFull;
        }

        // An empty destination accepts any colour. A move that merely relocates a
        // single-colour tube onto an empty one is legal but useless: that is the player's
        // to avoid, not the rules' to forbid.
        if (!destination.IsEmpty && destination.TopColour != source.TopColour)
        {
            return MoveRejection.ColourMismatch;
        }

        return MoveRejection.None;
    }

    /// <summary>Requirement: Pour amount.</summary>
    public bool TryApply(Board board, Move move, out Board result, out int movedCount)
    {
        ArgumentNullException.ThrowIfNull(board);

        if (Validate(board, move) != MoveRejection.None)
        {
            result = board;
            movedCount = 0;
            return false;
        }

        var source = board[move.From];
        var destination = board[move.To];

        // As many as fit: a pour that cannot take the whole run still moves what it can,
        // and the remainder stays behind. It is not rejected.
        var space = board.Capacity - destination.Count;
        movedCount = Math.Min(source.TopRunLength, space);

        var colour = source.TopColour;
        result = board.With(
            move.From, source.Pop(movedCount),
            move.To, destination.Push(colour, movedCount));

        return true;
    }

    /// <summary>Requirement: Move enumeration order.</summary>
    public IReadOnlyList<Move> LegalMoves(Board board)
    {
        ArgumentNullException.ThrowIfNull(board);

        var moves = new List<Move>();
        for (byte from = 0; from < board.TubeCount; from++)
        {
            for (byte to = 0; to < board.TubeCount; to++)
            {
                var move = new Move(from, to);
                if (Validate(board, move) == MoveRejection.None)
                {
                    moves.Add(move);
                }
            }
        }

        return moves;
    }

    /// <summary>Requirement: Win condition.</summary>
    public bool IsSolved(Board board)
    {
        ArgumentNullException.ThrowIfNull(board);

        for (var i = 0; i < board.TubeCount; i++)
        {
            var tube = board[i];
            if (tube.IsEmpty)
            {
                continue;
            }

            // Uniform is not enough. Without the fullness check, one colour split across
            // two uniform-but-partial tubes would read as solved.
            if (!tube.IsUniform || tube.Count != board.Capacity)
            {
                return false;
            }
        }

        return true;
    }
}
