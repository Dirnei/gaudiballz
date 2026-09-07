using FsCheck.Xunit;

namespace Puzzle.Rules.Tests;

/// <summary>
/// The load-bearing test here is <see cref="Every_generated_level_is_solvable"/>. It runs
/// on every generated case rather than a sample, and it is exhaustive rather than
/// statistical because solvability is constructed: the generator hands out a solution with
/// every level, so replaying that solution either works or the construction is broken.
/// </summary>
public sealed class LevelGeneratorTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>Seeds are arbitrary; parameters stay in the range levels actually ship in.</summary>
    private static LevelParameters ParametersFor(int raw)
    {
        var colours = 2 + Math.Abs(raw % 8);
        var capacity = 3 + Math.Abs(raw / 8 % 2);
        var spare = 1 + Math.Abs(raw / 16 % 2);
        return LevelParameters.ForColours(colours, capacity, spare);
    }

    [Property(MaxTest = 300)]
    public bool Every_generated_level_is_solvable(ulong seed, int rawParameters)
    {
        var level = LevelGenerator.Generate(seed, ParametersFor(rawParameters));

        var board = level.Board;
        foreach (var move in level.ConstructiveSolution)
        {
            if (!Rules.TryApply(board, move, out board, out _))
            {
                return false;
            }
        }

        return Rules.IsSolved(board);
    }

    [Property(MaxTest = 200)]
    public bool Generation_is_deterministic(ulong seed, int rawParameters)
    {
        var parameters = ParametersFor(rawParameters);

        var first = LevelGenerator.Generate(seed, parameters);
        var second = LevelGenerator.Generate(seed, parameters);

        return first.Board.Equals(second.Board)
               && first.ConstructiveSolution.SequenceEqual(second.ConstructiveSolution);
    }

    [Property(MaxTest = 200)]
    public bool Generated_boards_are_structurally_valid(ulong seed, int rawParameters)
    {
        var parameters = ParametersFor(rawParameters);
        var level = LevelGenerator.Generate(seed, parameters);

        // Board.Create already enforces the colour counts, so reaching here means the
        // generator conserved every item. This checks the shape it was asked for.
        return level.Board.TubeCount == parameters.TubeCount
               && level.Board.Capacity == parameters.Capacity
               && level.Board.ColourCount == parameters.Colours;
    }

    [Property(MaxTest = 200)]
    public bool A_generated_level_does_not_start_solved(ulong seed, int rawParameters)
    {
        var level = LevelGenerator.Generate(seed, ParametersFor(rawParameters));

        // A level that is already solved is not a puzzle. With a shuffle depth of several
        // times the item count this should never happen.
        return !Rules.IsSolved(level.Board);
    }

    [Property(MaxTest = 100)]
    public bool Different_seeds_give_different_boards(int rawParameters)
    {
        // Deliberately restricted to boards with a large state space. At the small end -
        // two colours and capacity three - only a handful of distinct boards exist, so
        // repeats are the arithmetic rather than a broken generator.
        var colours = 5 + Math.Abs(rawParameters % 5);
        var parameters = LevelParameters.ForColours(colours);

        var distinct = Enumerable.Range(0, 25)
            .Select(i => LevelGenerator.Generate((ulong)i, parameters).Board)
            .Distinct()
            .Count();

        // Collisions are possible in principle; a generator ignoring its seed is not.
        return distinct >= 24;
    }

    [Fact]
    public void A_known_seed_produces_a_stable_board()
    {
        // Guards the determinism contract across machines and runtime versions. If this
        // changes, every published level silently became a different puzzle.
        var level = LevelGenerator.Generate(12345UL, LevelParameters.ForColours(4));

        var rendered = string.Join(
            "|",
            level.Board.Tubes.Select(t =>
                string.Concat(Enumerable.Range(0, t.Count).Select(s => (char)('0' + t.ColourAt(s))))));

        Assert.Equal(GoldenBoardForSeed12345, rendered);
    }

    /// <summary>Regenerate deliberately and never by accident; see the test above.</summary>
    private const string GoldenBoardForSeed12345 = "13|23|31|4224|341|421";

    [Theory]
    [InlineData(0, 4, 2)]
    [InlineData(4, 1, 2)]
    [InlineData(4, 4, 0)]
    public void Invalid_parameters_are_refused(int colours, int capacity, int spare)
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => LevelGenerator.Generate(1UL, new LevelParameters(colours, capacity, spare, 10)));
    }
}
