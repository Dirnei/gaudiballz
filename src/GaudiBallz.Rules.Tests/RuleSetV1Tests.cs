namespace GaudiBallz.Rules.Tests;

/// <summary>
/// Behaviour tests for rule set version 1, following the sort-puzzle-rules capability
/// spec. Each section names the requirement it covers.
/// </summary>
public sealed class RuleSetV1Tests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>
    /// Builds a capacity-4, two-colour board. Each string is one tube read bottom to top,
    /// 'r' red and 'b' blue; an empty string is an empty tube.
    /// </summary>
    private static Board Board4x2(params string[] tubes)
    {
        var parsed = tubes
            .Select(tube => tube.Select(c => (byte)(c == 'r' ? 1 : 2)).ToArray())
            .Cast<IReadOnlyList<byte>>()
            .ToArray();

        return Board.Create(parsed, capacity: 4, colourCount: 2);
    }

    // ---------- Requirement: Board structure ----------

    [Fact]
    public void Top_item_and_run_reflect_stack_order()
    {
        var board = Board4x2("rbb", "rrb", "r", "b");

        Assert.Equal(2, board[0].TopColour);
        Assert.Equal(2, board[0].TopRunLength);
        Assert.Equal(1, board[1].TopRunLength);
    }

    [Fact]
    public void Board_rejects_a_colour_that_does_not_appear_capacity_times()
    {
        // Three reds and five blues: the totals add up, but the board is still invalid.
        var ex = Assert.Throws<ArgumentException>(() => Board4x2("rrrb", "bbbb"));

        Assert.Contains("exactly 4 times", ex.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(9)]
    public void Board_rejects_capacity_outside_bounds(int capacity)
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => Board.Create([new byte[] { 1 }], capacity, colourCount: 1));
    }

    // ---------- Requirement: Move legality ----------

    [Fact]
    public void Pouring_onto_a_matching_colour_is_legal()
    {
        var board = Board4x2("rrb", "rbb", "r", "b");

        Assert.Equal(MoveRejection.None, Rules.Validate(board, new Move(0, 1)));
    }

    [Fact]
    public void Pouring_onto_a_different_colour_is_rejected_and_changes_nothing()
    {
        // Tube 2 has a red on top; tube 1 has a blue on top and room to spare.
        var board = Board4x2("rrb", "rbb", "r", "b");

        Assert.Equal(MoveRejection.ColourMismatch, Rules.Validate(board, new Move(2, 1)));
        Assert.False(Rules.TryApply(board, new Move(2, 1), out var result, out var moved));
        Assert.Equal(0, moved);
        Assert.Equal(board, result);
    }

    [Fact]
    public void Pouring_into_a_full_tube_is_rejected_even_when_colours_match()
    {
        // Worth recording: "full destination whose top colour matches" cannot occur on a
        // valid board. A full tube holds `capacity` items, and each colour has exactly
        // `capacity` items in total, so a full single-colour tube holds every item of that
        // colour and no source can have one on top. Fullness is therefore only ever
        // reachable alongside a colour mismatch, and this asserts fullness wins.
        var board = Board4x2("bbbb", "rrrr", "", "");

        Assert.Equal(MoveRejection.DestinationFull, Rules.Validate(board, new Move(1, 0)));
    }

    [Fact]
    public void Pouring_from_an_empty_tube_is_rejected()
    {
        var board = Board4x2("rrrr", "bbbb", "", "");

        Assert.Equal(MoveRejection.SourceEmpty, Rules.Validate(board, new Move(2, 3)));
    }

    [Fact]
    public void A_tube_cannot_pour_into_itself()
    {
        var board = Board4x2("rrrb", "rbbb", "", "");

        Assert.Equal(MoveRejection.SameTube, Rules.Validate(board, new Move(0, 0)));
    }

    [Fact]
    public void A_tube_outside_the_board_is_rejected()
    {
        var board = Board4x2("rrrb", "rbbb", "", "");

        Assert.Equal(MoveRejection.TubeOutOfRange, Rules.Validate(board, new Move(0, 9)));
    }

    /// <summary>
    /// The rule most likely to be over-restricted by mistake: moving a single-colour tube
    /// onto an empty one achieves nothing, but achieving nothing is not illegal.
    /// </summary>
    [Fact]
    public void A_useless_move_onto_an_empty_tube_is_still_legal()
    {
        var board = Board4x2("rr", "rrbb", "bb", "");

        Assert.Equal(MoveRejection.None, Rules.Validate(board, new Move(0, 3)));
    }

    // ---------- Requirement: Pour amount ----------

    [Fact]
    public void The_whole_run_moves_when_it_fits()
    {
        // Source top run is 2 red; the empty destination has room for all of it.
        var board = Board4x2("brr", "bbr", "rb", "");

        Assert.True(Rules.TryApply(board, new Move(0, 3), out var result, out var moved));
        Assert.Equal(2, moved);
        Assert.Equal(1, result[0].Count);
        Assert.Equal(2, result[3].Count);
    }

    /// <summary>
    /// The decision that most distinguishes this rule set from a stricter one: a pour that
    /// does not fit still happens, and the remainder stays behind.
    /// </summary>
    [Fact]
    public void A_partial_pour_moves_as_many_as_fit_and_is_not_rejected()
    {
        // Source top run is 3 red; destination has a red on top and room for exactly 1.
        var board = Board4x2("brrr", "bbr", "b", "");

        Assert.True(Rules.TryApply(board, new Move(0, 1), out var result, out var moved));
        Assert.Equal(1, moved);
        Assert.Equal(3, result[0].Count);
        Assert.Equal(4, result[1].Count);
        Assert.Equal(1, result[0].TopColour);
    }

    [Fact]
    public void Only_the_topmost_run_moves()
    {
        var board = Board4x2("rbb", "rrb", "r", "b");

        Assert.True(Rules.TryApply(board, new Move(0, 3), out var result, out var moved));
        Assert.Equal(2, moved);
        Assert.Equal(1, result[0].Count);
        Assert.Equal(1, result[0].TopColour);
    }

    [Fact]
    public void Items_are_conserved_by_a_move()
    {
        var board = Board4x2("rbb", "rrb", "r", "b");
        Rules.TryApply(board, new Move(0, 3), out var result, out _);

        Assert.Equal(CountOf(board, 1), CountOf(result, 1));
        Assert.Equal(CountOf(board, 2), CountOf(result, 2));
    }

    // ---------- Requirement: Win condition ----------

    [Fact]
    public void A_board_with_every_colour_gathered_and_full_is_solved()
    {
        Assert.True(Rules.IsSolved(Board4x2("rrrr", "bbbb", "", "")));
    }

    /// <summary>
    /// The clause that is easiest to omit. Two uniform but partial tubes of one colour
    /// must not read as solved.
    /// </summary>
    [Fact]
    public void A_colour_split_across_two_partial_tubes_is_not_solved()
    {
        Assert.False(Rules.IsSolved(Board4x2("rr", "rr", "bbbb", "")));
    }

    [Fact]
    public void A_mixed_tube_is_not_solved()
    {
        Assert.False(Rules.IsSolved(Board4x2("rrrb", "rbbb", "", "")));
    }

    // ---------- Requirement: Move enumeration order ----------

    [Fact]
    public void Moves_are_ordered_by_source_then_destination()
    {
        var board = Board4x2("rrb", "rbb", "r", "b");
        var keys = Rules.LegalMoves(board).Select(m => (m.From * 100) + m.To).ToArray();

        Assert.Equal(keys.OrderBy(k => k).ToArray(), keys);
    }

    [Fact]
    public void Enumeration_is_repeatable_and_contains_only_legal_moves()
    {
        var board = Board4x2("rrb", "rbb", "r", "b");

        Assert.Equal(Rules.LegalMoves(board), Rules.LegalMoves(board));
        Assert.All(
            Rules.LegalMoves(board),
            move => Assert.Equal(MoveRejection.None, Rules.Validate(board, move)));
    }

    // ---------- Requirement: Rule set versioning ----------

    [Fact]
    public void A_rule_set_is_resolved_by_version()
    {
        Assert.Equal(1, RuleSets.Get(1).Version);
    }

    [Fact]
    public void An_unknown_version_is_refused_rather_than_defaulted()
    {
        // Falling back to the current rules would silently reject wins that were played
        // legitimately under an older build.
        Assert.Throws<UnknownRuleSetVersionException>(() => RuleSets.Get(99));
        Assert.False(RuleSets.IsKnown(99));
    }

    private static int CountOf(Board board, byte colour)
    {
        var total = 0;
        for (var tube = 0; tube < board.TubeCount; tube++)
        {
            for (var slot = 0; slot < board[tube].Count; slot++)
            {
                if (board[tube].ColourAt(slot) == colour)
                {
                    total++;
                }
            }
        }

        return total;
    }
}
