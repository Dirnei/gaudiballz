using GaudiBallz.Rules;

namespace GaudiBallz.Server.Verification;

/// <summary>
/// The check a completion passes before anything about it is written: its moves, replayed on
/// the level's own starting board, must be legal and end solved.
///
/// Plain code rather than an actor. Replaying at most <see cref="MaxMoves"/> pours on a board of
/// a few dozen cells takes well under a millisecond, has no state, and needs no ordering against
/// anything else, so it runs inline in the request.
/// </summary>
public static partial class CompletionVerifier
{
    /// <summary>Far above any real solution; it only bounds the work a single request can ask for.</summary>
    public const int MaxMoves = 2_000;

    /// <summary>
    /// Checks a submitted move list. Returns a 400 result naming why it failed, or null when it
    /// passed or when there is no list to check (a completion queued by an older build, which is
    /// accepted unverified). On success <paramref name="verified"/> holds the list.
    /// </summary>
    public static IResult? Check(
        Level level, int claimedMoves, int[][]? moveList, int? rulesVersion, ILogger logger,
        out int[][]? verified)
    {
        verified = null;
        var rejection = Evaluate(level, claimedMoves, moveList, rulesVersion, ref verified);
        if (rejection is not null)
        {
            // Logged with its code, so a client bug that starts dropping or adding moves shows up
            // as a burst of one code rather than as players quietly losing completions.
            LogRejected(logger, rejection.Value.Code);
            return Results.BadRequest(new { error = rejection.Value.Error, code = rejection.Value.Code, moveIndex = rejection.Value.MoveIndex });
        }

        return null;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Completion rejected: {Code}")]
    private static partial void LogRejected(ILogger logger, string code);

    private readonly record struct Rejection(string Code, string Error, int? MoveIndex);

    private static Rejection? Evaluate(
        Level level, int claimedMoves, int[][]? moveList, int? rulesVersion, ref int[][]? verified)
    {
        if (moveList is null)
        {
            return null;
        }

        if (moveList.Length > MaxMoves)
        {
            return Reject("too-many-moves", $"A completion can carry at most {MaxMoves} moves.");
        }

        if (claimedMoves < moveList.Length)
        {
            return Reject("move-count-too-low", "The move count is lower than the moves it took.");
        }

        var version = rulesVersion ?? 1;
        if (!RuleSets.IsKnown(version))
        {
            return Reject("unknown-rules-version", $"Rule set version {version} is not known.");
        }

        var moves = new List<Move>(moveList.Length);
        for (var i = 0; i < moveList.Length; i++)
        {
            var pair = moveList[i];
            if (pair is not [var from and >= 0 and <= byte.MaxValue, var to and >= 0 and <= byte.MaxValue])
            {
                return Reject("illegal-move", $"Move {i} is not a pair of tube numbers.", i);
            }

            moves.Add(new Move((byte)from, (byte)to));
        }

        var outcome = Replay.Verify(RuleSets.Get(version), level.Board, moves);
        switch (outcome.Verdict)
        {
            case ReplayVerdict.IllegalMove:
                return Reject("illegal-move", $"Move {outcome.MoveIndex} is not allowed ({outcome.Rejection}).", outcome.MoveIndex);
            case ReplayVerdict.NotSolved:
                return Reject("not-solved", "The moves do not solve the board.");
            default:
                verified = moveList;
                return null;
        }
    }

    private static Rejection Reject(string code, string error, int? moveIndex = null) =>
        new(code, error, moveIndex);
}
