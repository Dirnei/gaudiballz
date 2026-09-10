using GaudiBallz.Rules;
using GaudiBallz.Server.Levels;

namespace GaudiBallz.Server.Tests;

/// <summary>
/// Checks the levels players actually receive, not synthetic parameters.
///
/// <see cref="GaudiBallz.Rules"/> proves the generator solvable across arbitrary inputs; this
/// proves the campaign curve never asks for a combination that breaks it. The two are
/// worth keeping separate: a difficulty curve is edited far more often than a generator,
/// and it is the likelier source of a bad level.
/// </summary>
public sealed class LevelCatalogueTests
{
    private static readonly IRuleSet Rules = RuleSets.Current;

    /// <summary>Deep enough to cover every step of the curve, including past its last band.</summary>
    private static IEnumerable<int> CampaignLevels() => Enumerable.Range(1, 200);

    [Fact]
    public void Every_campaign_level_is_solvable()
    {
        var failures = new List<string>();

        foreach (var levelId in CampaignLevels())
        {
            var level = LevelCatalogue.Build(levelId);
            var board = level.Board;

            var replayed = true;
            foreach (var move in level.ConstructiveSolution)
            {
                if (!Rules.TryApply(board, move, out board, out _))
                {
                    failures.Add($"level {levelId}: illegal move {move} in its own solution");
                    replayed = false;
                    break;
                }
            }

            if (replayed && !Rules.IsSolved(board))
            {
                failures.Add($"level {levelId}: solution replayed but board is not solved");
            }
        }

        Assert.True(failures.Count == 0, string.Join("; ", failures.Take(5)));
    }

    [Fact]
    public void No_campaign_level_starts_solved()
    {
        var alreadySolved = CampaignLevels()
            .Where(id => Rules.IsSolved(LevelCatalogue.Build(id).Board))
            .ToArray();

        Assert.True(alreadySolved.Length == 0,
            $"These levels need no moves at all: {string.Join(", ", alreadySolved)}.");
    }

    [Fact]
    public void Every_campaign_level_has_at_least_one_move_available()
    {
        // A board with no legal move would be unplayable regardless of solvability.
        var stuck = CampaignLevels()
            .Where(id => Rules.LegalMoves(LevelCatalogue.Build(id).Board).Count == 0)
            .ToArray();

        Assert.True(stuck.Length == 0, $"These levels open with no legal move: {string.Join(", ", stuck)}.");
    }

    [Fact]
    public void The_curve_never_exceeds_the_board_limits()
    {
        foreach (var levelId in CampaignLevels())
        {
            var parameters = LevelCatalogue.ParametersFor(levelId);

            Assert.True(parameters.TubeCount <= Board.MaxTubes,
                $"Level {levelId} asks for {parameters.TubeCount} tubes.");
            Assert.True(parameters.Capacity <= Tube.MaxCapacity,
                $"Level {levelId} asks for capacity {parameters.Capacity}.");
            Assert.True(parameters.SpareTubes >= 1,
                $"Level {levelId} leaves no spare tube.");
        }
    }

    [Fact]
    public void Levels_are_reproducible()
    {
        // The same id must always give the same board: progress and any future verification
        // both depend on a level id meaning exactly one puzzle, forever.
        foreach (var levelId in new[] { 1, 7, 30, 31, 99, 200 })
        {
            var first = LevelCatalogue.Build(levelId);
            var second = LevelCatalogue.Build(levelId);

            Assert.Equal(first.Board, second.Board);
        }
    }

    /// <summary>
    /// The unlock table is the campaign curve read the other way round: instead of "how many
    /// colours does level 26 have", it answers "which level first shows colour 6". It exists
    /// so the client can gate the profile ball picker without reimplementing the curve, which
    /// would put a second copy of a campaign decision in a second language.
    /// </summary>
    [Fact]
    public void Each_colour_unlocks_at_the_first_level_containing_it()
    {
        foreach (var unlock in LevelCatalogue.ColourUnlocks)
        {
            Assert.True(
                LevelCatalogue.ParametersFor(unlock.UnlocksAtLevel).Colours >= unlock.Colour,
                $"Colour {unlock.Colour} is said to unlock at level {unlock.UnlocksAtLevel}, "
                + "which does not contain it.");

            if (unlock.UnlocksAtLevel > 1)
            {
                Assert.True(
                    LevelCatalogue.ParametersFor(unlock.UnlocksAtLevel - 1).Colours < unlock.Colour,
                    $"Colour {unlock.Colour} is said to unlock at level {unlock.UnlocksAtLevel}, "
                    + "but the level before it already contains it.");
            }
        }
    }

    [Fact]
    public void The_table_covers_every_colour_the_campaign_uses()
    {
        var colours = LevelCatalogue.ColourUnlocks.Select(u => u.Colour).ToArray();

        Assert.Equal(13, colours.Length);
        Assert.Equal(Enumerable.Range(1, 13), colours);
    }

    [Fact]
    public void The_first_board_a_player_sees_earns_three_colours()
    {
        // Level 1 has three colours, so finishing it earns exactly those three and no more.
        // This is the floor of the whole gate: without it a new account has nothing at all.
        var atLevelOne = LevelCatalogue.ColourUnlocks
            .Where(u => u.UnlocksAtLevel == 1)
            .Select(u => u.Colour)
            .ToArray();

        Assert.Equal([1, 2, 3], atLevelOne);
    }

    [Fact]
    public void Unlock_levels_never_go_backwards()
    {
        // A later colour arriving earlier than an earlier one would mean the palette order
        // and the campaign order had come apart, and the picker would read as shuffled.
        var levels = LevelCatalogue.ColourUnlocks.Select(u => u.UnlocksAtLevel).ToArray();

        Assert.Equal(levels.Order(), levels);
    }

    [Fact]
    public void The_walk_stops_at_its_cap_rather_than_running_on()
    {
        // A curve that never stops adding colours must not hang startup. The cap is the
        // termination guarantee, so it is worth a test that does not depend on the real
        // curve happening to plateau.
        var runaway = LevelCatalogue.BuildColourUnlocks(levelId => levelId, cap: 50);

        Assert.Equal(50, runaway.Count);
        Assert.Equal(new LevelCatalogue.ColourUnlock(50, 50), runaway[^1]);
    }

    [Fact]
    public void A_flat_curve_yields_one_entry_per_colour()
    {
        var flat = LevelCatalogue.BuildColourUnlocks(_ => 3, cap: 500);

        Assert.Equal(
            [
                new LevelCatalogue.ColourUnlock(1, 1),
                new LevelCatalogue.ColourUnlock(2, 1),
                new LevelCatalogue.ColourUnlock(3, 1),
            ],
            flat);
    }

    // ---- chapter note keys ------------------------------------------------

    [Fact]
    public void Chapter_note_key_is_spare_tube_at_the_one_spare_boundary()
    {
        Assert.Equal("spare-tube", LevelCatalogue.ChapterNoteKey(LevelCatalogue.OneSpareTubeFrom));
    }

    [Fact]
    public void Chapter_note_key_is_shorter_tubes_at_level_111()
    {
        Assert.Equal("shorter-tubes", LevelCatalogue.ChapterNoteKey(111));
    }

    [Fact]
    public void Chapter_note_key_is_new_colour_when_a_colour_is_added()
    {
        // Level 6 introduces the fourth colour (3 -> 4).
        Assert.Equal("new-colour", LevelCatalogue.ChapterNoteKey(6));
    }

    [Fact]
    public void Chapter_note_key_is_null_for_ordinary_levels()
    {
        // Level 2 has the same colours as level 1 and no structural change.
        Assert.Null(LevelCatalogue.ChapterNoteKey(2));
    }

    [Fact]
    public void Chapter_note_key_matches_chapter_note_nullity()
    {
        // Every level that has a note also has a key, and vice versa.
        foreach (var levelId in CampaignLevels())
        {
            var note = LevelCatalogue.ChapterNote(levelId);
            var key = LevelCatalogue.ChapterNoteKey(levelId);

            Assert.True(
                (note is null) == (key is null),
                $"Level {levelId}: note is {(note is null ? "null" : "present")} but key is {(key is null ? "null" : "present")}.");
        }
    }

    // ---- time targets ---------------------------------------------------

    [Fact]
    public void Two_spare_regime_uses_par_times_3_seconds()
    {
        var level = LevelCatalogue.Build(1);
        var par = level.ConstructiveSolution.Count;
        var expected = par * 3 * 1000;

        Assert.Equal(expected, LevelCatalogue.TimeTargetMs(1));
    }

    [Fact]
    public void One_spare_regime_uses_par_times_4_seconds()
    {
        var level = LevelCatalogue.Build(LevelCatalogue.OneSpareTubeFrom);
        var par = level.ConstructiveSolution.Count;
        var expected = par * 4 * 1000;

        Assert.Equal(expected, LevelCatalogue.TimeTargetMs(LevelCatalogue.OneSpareTubeFrom));
    }

    [Fact]
    public void Time_target_boundary_at_level_49_vs_50()
    {
        var level49 = LevelCatalogue.Build(49);
        var level50 = LevelCatalogue.Build(50);

        var target49 = LevelCatalogue.TimeTargetMs(49);
        var target50 = LevelCatalogue.TimeTargetMs(50);

        Assert.Equal(level49.ConstructiveSolution.Count * 3 * 1000, target49);
        Assert.Equal(level50.ConstructiveSolution.Count * 4 * 1000, target50);
    }

    [Fact]
    public void Easy_levels_have_lower_time_targets_than_hard_levels()
    {
        var target1 = LevelCatalogue.TimeTargetMs(1);
        var target100 = LevelCatalogue.TimeTargetMs(100);

        Assert.True(target1 < target100,
            $"Level 1 target ({target1}ms) should be lower than level 100 ({target100}ms).");
    }
}
