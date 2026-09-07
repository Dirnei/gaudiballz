using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Puzzle.Rules.Tests;

/// <summary>
/// Builds the shared fixture set and checks the committed files match.
///
/// Fixtures are generated rather than hand-written because the interesting cases — every
/// rejection reason, each pour boundary, the split-colour win case — are tedious enough to
/// enumerate by hand that they would be enumerated incompletely.
///
/// Set <c>PUZZLE_REGEN=1</c> to rewrite the files after a deliberate rule change. CI does
/// not set it, so an accidental behaviour change shows up as a failing comparison rather
/// than a silently updated fixture.
/// </summary>
[Trait("Category", "Conformance")]
public sealed class ConformanceGeneratorTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    [Fact]
    public void Committed_fixtures_match_the_current_rules()
    {
        var generated = Build();
        var regenerating = Environment.GetEnvironmentVariable("PUZZLE_REGEN") == "1";

        var manifestFiles = new SortedDictionary<string, string>(StringComparer.Ordinal);

        foreach (var (name, file) in generated)
        {
            var json = JsonSerializer.Serialize(file, FixtureJson.Options) + "\n";
            var path = Path.Combine(FixtureDirectory, name);

            if (regenerating)
            {
                Directory.CreateDirectory(FixtureDirectory);
                File.WriteAllText(path, json, new UTF8Encoding(false));
            }
            else
            {
                Assert.True(File.Exists(path),
                    $"Fixture {name} is missing. Run with PUZZLE_REGEN=1 to generate it.");
                Assert.True(
                    Normalise(File.ReadAllText(path)) == Normalise(json),
                    $"Fixture {name} does not match current behaviour. Either the rules "
                    + $"changed unintentionally, or they changed deliberately and the "
                    + $"fixtures need regenerating with PUZZLE_REGEN=1 plus a manifest "
                    + $"version bump.");
            }

            manifestFiles[name] = Sha256(Normalise(json));
        }

        if (regenerating)
        {
            WriteManifest(manifestFiles);
        }
    }

    /// <summary>
    /// Every requirement the spec names must be exercised by at least one fixture, so a
    /// rule cannot be added without fixtures backing it.
    /// </summary>
    [Fact]
    public void Every_requirement_is_covered_by_a_fixture()
    {
        string[] required = ["legality", "pour-amount", "win", "enumeration"];
        var covered = Build().Values.Select(f => f.Requirement).ToHashSet(StringComparer.Ordinal);

        var missing = required.Where(r => !covered.Contains(r)).ToArray();

        Assert.True(missing.Length == 0,
            $"No fixture cites these requirements: {string.Join(", ", missing)}.");
    }

    internal static string FixtureDirectory =>
        Path.Combine(RepositoryRoot, "conformance", "v1");

    internal static string RepositoryRoot =>
        typeof(ConformanceGeneratorTests).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .Single(a => a.Key == "RepositoryRoot")
            .Value!;

    private static string Normalise(string text) => text.Replace("\r\n", "\n", StringComparison.Ordinal);

    private static string Sha256(string text) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(text)));

    private static void WriteManifest(SortedDictionary<string, string> files)
    {
        var manifest = new
        {
            rulesVersion = RuleSets.CurrentVersion,
            generatorVersion = 1,
            description =
                "Shared behavioural fixtures for the C# and TypeScript rules engines. Both "
                + "suites run against these files and both block merges. Each file cites the "
                + "requirement it exercises from the sort-puzzle-rules capability spec.",
            files,
        };

        File.WriteAllText(
            Path.Combine(FixtureDirectory, "MANIFEST.json"),
            JsonSerializer.Serialize(manifest, FixtureJson.Options) + "\n",
            new UTF8Encoding(false));
    }

    // ---------- fixture construction ----------

    internal static Dictionary<string, FixtureFile> Build() => new(StringComparer.Ordinal)
    {
        ["legality.json"] = new FixtureFile("legality", BuildLegality()),
        ["pour-amount.json"] = new FixtureFile("pour-amount", BuildPourAmount()),
        ["win.json"] = new FixtureFile("win", BuildWin()),
        ["enumeration.json"] = new FixtureFile("enumeration", BuildEnumeration()),
    };

    private static BoardShape Shape(Board board) => new(
        [.. board.Tubes.Select(t => (IReadOnlyList<byte>)[.. Enumerable.Range(0, t.Count).Select(s => t.ColourAt(s))])],
        board.Capacity,
        board.ColourCount);

    private static Board Make(int capacity, int colours, params string[] tubes) =>
        Board.Create(
            [.. tubes.Select(t => (IReadOnlyList<byte>)[.. t.Select(c => (byte)(c - '0'))])],
            capacity,
            colours);

    private static FixtureCase MoveCase(string id, Board board, Move move)
    {
        var rejection = Rules.Validate(board, move);
        var applied = Rules.TryApply(board, move, out var result, out var moved);

        return new FixtureCase(
            id,
            Shape(board),
            new MoveShape(move.From, move.To),
            new ExpectShape(
                Rejection: rejection.ToString(),
                MovedCount: applied ? moved : 0,
                ResultBoard: applied ? Shape(result) : null));
    }

    private static List<FixtureCase> BuildLegality()
    {
        // Digits are colour numbers; each tube reads bottom to top.
        var mixed = Make(4, 2, "112", "122", "1", "2");
        var solved = Make(4, 2, "1111", "2222", "", "");
        var uniform = Make(4, 2, "11", "1122", "22", "");

        return
        [
            MoveCase("legal-matching-colour", mixed, new Move(0, 1)),
            MoveCase("reject-colour-mismatch", mixed, new Move(2, 1)),
            MoveCase("reject-destination-full", solved, new Move(1, 0)),
            MoveCase("reject-source-empty", solved, new Move(2, 3)),
            MoveCase("reject-same-tube", mixed, new Move(0, 0)),
            MoveCase("reject-tube-out-of-range", mixed, new Move(0, 9)),
            // Legal but achieves nothing. The rule most likely to be over-restricted.
            MoveCase("legal-useless-onto-empty", uniform, new Move(0, 3)),
        ];
    }

    private static List<FixtureCase> BuildPourAmount() =>
    [
        // Run shorter than the space available.
        MoveCase("whole-run-fits", Make(4, 2, "211", "221", "12", ""), new Move(0, 3)),
        // Run exactly equal to the space available.
        MoveCase("run-exactly-fills", Make(4, 2, "2211", "221", "1", ""), new Move(0, 1)),
        // Run longer than the space: the pour still happens, partially.
        MoveCase("partial-pour-space-of-one", Make(4, 2, "2111", "221", "2", ""), new Move(0, 1)),
        // Only the topmost run travels, never what sits beneath it.
        MoveCase("only-topmost-run-moves", Make(4, 2, "122", "112", "1", "2"), new Move(0, 3)),
    ];

    private static List<FixtureCase> BuildWin()
    {
        FixtureCase WinCase(string id, Board board) => new(
            id, Shape(board), null, new ExpectShape(Solved: Rules.IsSolved(board)));

        return
        [
            WinCase("solved-all-full-and-uniform", Make(4, 2, "1111", "2222", "", "")),
            // The clause that is easiest to omit: uniform but not full is not finished.
            WinCase("not-solved-colour-split-across-partial-tubes", Make(4, 2, "11", "11", "2222", "")),
            WinCase("not-solved-mixed-tube", Make(4, 2, "1112", "1222", "", "")),
            WinCase("not-solved-single-partial-tube", Make(4, 2, "111", "2222", "1", "")),
        ];
    }

    private static List<FixtureCase> BuildEnumeration()
    {
        FixtureCase EnumCase(string id, Board board) => new(
            id,
            Shape(board),
            null,
            new ExpectShape(Moves: [.. Rules.LegalMoves(board).Select(m => new MoveShape(m.From, m.To))]));

        return
        [
            EnumCase("order-by-source-then-destination", Make(4, 2, "112", "122", "1", "2")),
            EnumCase("empty-tubes-are-valid-destinations", Make(4, 2, "1111", "222", "2", "")),
            EnumCase("solved-board-still-enumerates", Make(4, 2, "1111", "2222", "", "")),
        ];
    }
}
