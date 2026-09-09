namespace GaudiBallz.Rules;

/// <summary>
/// The rules of the puzzle, versioned.
///
/// Two implementations of these rules exist - this one and the TypeScript engine in
/// client/src/engine - and the fixtures in conformance/v1/ hold them in step. The
/// capability spec, not either implementation, is the arbiter between them.
/// </summary>
public interface IRuleSet
{
    public int Version { get; }

    /// <summary>Why the move is illegal, or <see cref="MoveRejection.None"/>.</summary>
    public MoveRejection Validate(Board board, Move move);

    /// <summary>
    /// Applies a legal move, returning the resulting board and how many items moved.
    /// Returns false and leaves <paramref name="result"/> as the original board when the
    /// move is illegal.
    /// </summary>
    public bool TryApply(Board board, Move move, out Board result, out int movedCount);

    /// <summary>Legal moves in a deterministic order: by source, then by destination.</summary>
    public IReadOnlyList<Move> LegalMoves(Board board);

    public bool IsSolved(Board board);
}

/// <summary>
/// Resolves a rule set by version.
///
/// A version that has been released must remain available indefinitely: a player running
/// a stale cached build has to be judged by the rules they actually played, not by rules
/// published afterwards. So entries are added here and never removed.
/// </summary>
public static class RuleSets
{
    /// <summary>The version new play is issued under.</summary>
    public const int CurrentVersion = 1;

    private static readonly Dictionary<int, IRuleSet> ByVersion = new()
    {
        [1] = new RuleSetV1(),
    };

    public static IRuleSet Current => ByVersion[CurrentVersion];

    /// <summary>
    /// Returns the rule set for a version. Throws rather than falling back to the current
    /// version: verifying a submission under rules it was not played under would silently
    /// reject legitimate wins.
    /// </summary>
    public static IRuleSet Get(int version) =>
        ByVersion.TryGetValue(version, out var ruleSet)
            ? ruleSet
            : throw new UnknownRuleSetVersionException(version);

    public static bool IsKnown(int version) => ByVersion.ContainsKey(version);
}

public sealed class UnknownRuleSetVersionException(int version)
    : Exception($"Rule set version {version} is not known, so a submission declaring it cannot be verified.")
{
    public int Version { get; } = version;
}
