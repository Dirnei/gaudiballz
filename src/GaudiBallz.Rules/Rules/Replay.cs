namespace GaudiBallz.Rules;

public enum ReplayVerdict
{
    Solved,
    IllegalMove,
    NotSolved,
}

/// <summary>What replaying a move list showed. For an illegal move, which one and why.</summary>
public readonly record struct ReplayOutcome(ReplayVerdict Verdict, int? MoveIndex, MoveRejection Rejection)
{
    public static ReplayOutcome Solved => new(ReplayVerdict.Solved, null, MoveRejection.None);

    public static ReplayOutcome NotSolved => new(ReplayVerdict.NotSolved, null, MoveRejection.None);

    public static ReplayOutcome Illegal(int index, MoveRejection rejection) =>
        new(ReplayVerdict.IllegalMove, index, rejection);
}

/// <summary>
/// Replays a submitted move list on a starting board: the check that makes "client plays,
/// server verifies" true.
///
/// Built only from <see cref="IRuleSet.Validate"/>, <see cref="IRuleSet.TryApply"/> and
/// <see cref="IRuleSet.IsSolved"/>, which the conformance fixtures already prove both engines
/// agree on, so it adds no rule behaviour of its own and needs no fixture of its own.
/// </summary>
public static class Replay
{
    public static ReplayOutcome Verify(IRuleSet rules, Board start, IReadOnlyList<Move> moves)
    {
        var board = start;

        for (var i = 0; i < moves.Count; i++)
        {
            var rejection = rules.Validate(board, moves[i]);
            if (rejection != MoveRejection.None || !rules.TryApply(board, moves[i], out board, out _))
            {
                return ReplayOutcome.Illegal(i, rejection);
            }
        }

        return rules.IsSolved(board) ? ReplayOutcome.Solved : ReplayOutcome.NotSolved;
    }
}
