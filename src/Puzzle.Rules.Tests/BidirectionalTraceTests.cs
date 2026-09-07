using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Puzzle.Rules.Tests;

/// <summary>
/// Closes the direction the fixtures leave open.
///
/// Every other fixture in <c>conformance/v1/</c> is generated from this engine, so passing
/// them proves the TypeScript engine matches a snapshot of C# — on inputs whoever wrote the
/// generator happened to think of. It cannot catch the two engines sharing a misreading of
/// the spec, because C# defined the expected answers.
///
/// Here the flow runs the other way. <c>replay-inputs.json</c> is a set of boards and move
/// sequences; the TypeScript suite replays them and commits its own answers to
/// <c>ts-replay.json</c>; this test replays the same inputs in C# and asserts the two agree.
/// A divergence now fails on whichever side moved.
/// </summary>
[Trait("Category", "Conformance")]
public sealed class BidirectionalTraceTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    public sealed record ReplayInput(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("board")] BoardShape Board,
        [property: JsonPropertyName("moves")] IReadOnlyList<MoveShape> Moves);

    public sealed record ReplayStep(
        [property: JsonPropertyName("rejection")] string Rejection,
        [property: JsonPropertyName("movedCount")] int MovedCount,
        [property: JsonPropertyName("legalMoveCount")] int LegalMoveCount,
        [property: JsonPropertyName("solved")] bool Solved,
        [property: JsonPropertyName("board")] BoardShape Board);

    public sealed record ReplayResult(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("steps")] IReadOnlyList<ReplayStep> Steps);

    [Fact]
    public void The_typescript_engine_agrees_with_this_one()
    {
        var inputsPath = Path.Combine(FixtureDirectory, "replay-inputs.json");
        var tracePath = Path.Combine(FixtureDirectory, "ts-replay.json");

        Assert.True(File.Exists(inputsPath),
            $"Missing {inputsPath}. Run the conformance generator with PUZZLE_REGEN=1.");
        Assert.True(File.Exists(tracePath),
            $"Missing {tracePath}. Run the client suite with PUZZLE_REGEN=1 to record what "
            + $"the TypeScript engine does.");

        var inputs = JsonSerializer.Deserialize<List<ReplayInput>>(File.ReadAllText(inputsPath))!;
        var fromTypeScript = JsonSerializer.Deserialize<List<ReplayResult>>(File.ReadAllText(tracePath))!;

        Assert.Equal(inputs.Count, fromTypeScript.Count);

        for (var i = 0; i < inputs.Count; i++)
        {
            var mine = Replay(inputs[i]);
            var theirs = fromTypeScript[i];

            Assert.Equal(mine.Id, theirs.Id);
            Assert.True(mine.Steps.Count == theirs.Steps.Count,
                $"{mine.Id}: this engine produced {mine.Steps.Count} steps, TypeScript {theirs.Steps.Count}.");

            for (var step = 0; step < mine.Steps.Count; step++)
            {
                Assert.True(
                    Describe(mine.Steps[step]) == Describe(theirs.Steps[step]),
                    $"{mine.Id} step {step}: the engines disagree.\n"
                    + $"  C#:         {Describe(mine.Steps[step])}\n"
                    + $"  TypeScript: {Describe(theirs.Steps[step])}");
            }
        }
    }

    /// <summary>Emits the shared inputs. Set PUZZLE_REGEN=1 after a deliberate rule change.</summary>
    [Fact]
    public void Replay_inputs_are_committed_and_current()
    {
        var generated = BuildInputs();
        var json = Normalise(JsonSerializer.Serialize(generated, FixtureJson.Options)) + "\n";
        var path = Path.Combine(FixtureDirectory, "replay-inputs.json");

        if (Environment.GetEnvironmentVariable("PUZZLE_REGEN") == "1")
        {
            Directory.CreateDirectory(FixtureDirectory);
            File.WriteAllText(path, json, new UTF8Encoding(false));
            return;
        }

        Assert.True(File.Exists(path), $"Missing {path}. Run with PUZZLE_REGEN=1.");
        Assert.True(
            Normalise(File.ReadAllText(path)) == json,
            "replay-inputs.json is stale. Regenerate with PUZZLE_REGEN=1, then re-record the "
            + "TypeScript side too, or the two will be comparing different inputs.");
    }

    /// <summary>
    /// System.Text.Json indents with the platform newline, so both writing and comparing
    /// go through this. Without it the committed file differs between a Windows developer
    /// and Linux CI, and the freshness check fails for no real reason.
    /// </summary>
    private static string Normalise(string text) =>
        text.Replace("\r\n", "\n", StringComparison.Ordinal);

    private static string Describe(ReplayStep s) =>
        $"{s.Rejection} moved={s.MovedCount} legal={s.LegalMoveCount} solved={s.Solved} "
        + $"board={string.Join("|", s.Board.Tubes.Select(t => string.Concat(t.Select(c => (char)('0' + c)))))}";

    private static ReplayResult Replay(ReplayInput input)
    {
        var board = Board.Create(input.Board.Tubes, input.Board.Capacity, input.Board.ColourCount);
        var steps = new List<ReplayStep>();

        foreach (var move in input.Moves)
        {
            var m = new Move((byte)move.From, (byte)move.To);
            var rejection = Rules.Validate(board, m);
            var applied = Rules.TryApply(board, m, out var next, out var moved);

            if (applied)
            {
                board = next;
            }

            steps.Add(new ReplayStep(
                rejection.ToString(),
                applied ? moved : 0,
                Rules.LegalMoves(board).Count,
                Rules.IsSolved(board),
                Shape(board)));
        }

        return new ReplayResult(input.Id, steps);
    }

    /// <summary>
    /// Real levels replayed along their own solution, plus deliberate illegal moves spliced
    /// in, so the trace covers rejections as well as successful pours.
    /// </summary>
    private static List<ReplayInput> BuildInputs()
    {
        var inputs = new List<ReplayInput>();

        foreach (var (colours, capacity, spare) in new[] { (3, 4, 2), (5, 4, 2), (7, 4, 1), (8, 6, 1) })
        {
            for (ulong seed = 0; seed < 3; seed++)
            {
                var level = LevelGenerator.Generate(
                    seed * 2654435761UL + 17UL,
                    LevelParameters.ForColours(colours, capacity, spare));

                var moves = new List<MoveShape>();
                var step = 0;
                foreach (var move in level.ConstructiveSolution)
                {
                    // Splice in moves that must be rejected, so both engines are compared on
                    // refusals and not only on successes.
                    if (step % 5 == 2)
                    {
                        moves.Add(new MoveShape(0, 0));
                    }

                    moves.Add(new MoveShape(move.From, move.To));
                    step++;
                }

                inputs.Add(new ReplayInput(
                    $"c{colours}-cap{capacity}-spare{spare}-seed{seed}",
                    Shape(level.Board),
                    moves));
            }
        }

        return inputs;
    }

    private static BoardShape Shape(Board board) => new(
        [.. board.Tubes.Select(t =>
            (IReadOnlyList<byte>)[.. Enumerable.Range(0, t.Count).Select(s => t.ColourAt(s))])],
        board.Capacity,
        board.ColourCount);

    private static string FixtureDirectory => Path.Combine(
        typeof(BidirectionalTraceTests).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .Single(a => a.Key == "RepositoryRoot").Value!,
        "conformance", "v1");
}
