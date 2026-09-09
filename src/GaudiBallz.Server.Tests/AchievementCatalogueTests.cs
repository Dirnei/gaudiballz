using System.Collections.Immutable;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

public sealed class AchievementCatalogueTests
{
    private static PlayerProgress ProgressWith(int levels, int hints = 0)
    {
        var progress = PlayerProgress.Empty;
        for (var i = 1; i <= levels; i++)
        {
            progress = progress.With(i, new LevelResult(10, hints));
        }

        return progress;
    }

    private static List<DailyPlayDocument> DaysFrom(DateTime start, int count)
    {
        var docs = new List<DailyPlayDocument>();
        for (var i = 0; i < count; i++)
        {
            var date = start.AddDays(i);
            docs.Add(new DailyPlayDocument
            {
                Id = $"player#{date:yyyy-MM-dd}",
                PlayerId = "player",
                Date = date,
                CompletionCount = 1,
            });
        }

        return docs;
    }

    private static CompletionContext MakeContext(
        PlayerProgress? progress = null,
        IReadOnlyList<DailyPlayDocument>? dailyPlay = null,
        ImmutableHashSet<string>? alreadyAwarded = null,
        int level = 1, int moves = 10, int hints = 0,
        int undoCount = 0, bool restarted = false, string? sessionId = null,
        int colourCount = 4, int parMoves = 15) =>
        new(
            "player", level, moves, hints,
            new AttemptMetadata(undoCount, restarted, sessionId, colourCount, parMoves),
            progress ?? PlayerProgress.Empty,
            dailyPlay ?? [],
            alreadyAwarded ?? []);

    // ---- milestones ----

    [Theory]
    [InlineData(1, "milestone-1")]
    [InlineData(5, "milestone-5")]
    [InlineData(10, "milestone-10")]
    [InlineData(25, "milestone-25")]
    [InlineData(50, "milestone-50")]
    [InlineData(100, "milestone-100")]
    [InlineData(150, "milestone-150")]
    public void Milestone_awarded_at_threshold(int levels, string expectedId)
    {
        var ctx = MakeContext(progress: ProgressWith(levels));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains(expectedId, awards);
    }

    [Fact]
    public void Milestone_not_awarded_below_threshold()
    {
        var ctx = MakeContext(progress: ProgressWith(4));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("milestone-5", awards);
    }

    [Fact]
    public void Replaying_does_not_inflate_milestones()
    {
        var progress = ProgressWith(9);
        // "Replay" level 3 — it's already in the map, so count stays 9
        progress = progress.With(3, new LevelResult(8, 0));
        var ctx = MakeContext(progress: progress);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("milestone-10", awards);
    }

    // ---- perfection ----

    [Fact]
    public void Under_par_awarded_at_par()
    {
        var ctx = MakeContext(moves: 12, parMoves: 12);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("under-par", awards);
    }

    [Fact]
    public void Under_par_awarded_below_par()
    {
        var ctx = MakeContext(moves: 10, parMoves: 15);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("under-par", awards);
    }

    [Fact]
    public void Under_par_not_awarded_above_par()
    {
        var ctx = MakeContext(moves: 20, parMoves: 15);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("under-par", awards);
    }

    [Fact]
    public void No_hint_10_awarded_at_threshold()
    {
        var ctx = MakeContext(progress: ProgressWith(10, hints: 0));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("no-hint-10", awards);
    }

    [Fact]
    public void No_hint_25_awarded_at_threshold()
    {
        var ctx = MakeContext(progress: ProgressWith(25, hints: 0));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("no-hint-25", awards);
    }

    [Fact]
    public void Purist_40_awarded_at_threshold()
    {
        var ctx = MakeContext(progress: ProgressWith(40, hints: 0));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("purist-40", awards);
    }

    private static PlayerProgress ProgressWithBelowParLevels(int count)
    {
        var progress = PlayerProgress.Empty;
        for (var i = 1; i <= count; i++)
        {
            var par = LevelCatalogue.Build(i).ConstructiveSolution.Count;
            progress = progress.With(i, new LevelResult(par, 0));
        }

        return progress;
    }

    [Fact]
    public void Speed_demon_awarded_when_5_levels_at_or_below_par()
    {
        var progress = ProgressWithBelowParLevels(5);
        var ctx = MakeContext(progress: progress);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("speed-demon", awards);
    }

    [Fact]
    public void Speed_demon_not_awarded_below_threshold()
    {
        var progress = ProgressWithBelowParLevels(4);
        var ctx = MakeContext(progress: progress);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("speed-demon", awards);
    }

    [Fact]
    public void Speed_demon_progress_reports_count()
    {
        var progress = ProgressWithBelowParLevels(3);
        var count = AchievementCatalogue.ProgressFor("speed-demon", progress, []);
        Assert.Equal(3, count);
    }

    [Fact]
    public void Hints_used_prevents_no_hint_achievement()
    {
        var ctx = MakeContext(progress: ProgressWith(10, hints: 1));
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("no-hint-10", awards);
    }

    // ---- streaks ----

    [Theory]
    [InlineData(2, "streak-2")]
    [InlineData(7, "streak-7")]
    [InlineData(14, "streak-14")]
    [InlineData(30, "streak-30")]
    public void Streak_awarded_at_threshold(int days, string expectedId)
    {
        var dailyPlay = DaysFrom(new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), days);
        var ctx = MakeContext(dailyPlay: dailyPlay);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains(expectedId, awards);
    }

    [Fact]
    public void Broken_streak_resets()
    {
        var dailyPlay = new List<DailyPlayDocument>();
        // Mon, Tue (streak = 2)
        dailyPlay.AddRange(DaysFrom(new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc), 2));
        // Skip Wed, then Thu (streak resets to 1)
        dailyPlay.Add(new DailyPlayDocument
        {
            Id = "player#2026-09-10",
            PlayerId = "player",
            Date = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
            CompletionCount = 1,
        });

        var streak = AchievementCatalogue.CurrentStreak(dailyPlay);
        Assert.Equal(1, streak);
    }

    [Fact]
    public void Multiple_completions_on_same_day_count_as_one()
    {
        var dailyPlay = new List<DailyPlayDocument>
        {
            new()
            {
                Id = "player#2026-09-08",
                PlayerId = "player",
                Date = new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc),
                CompletionCount = 5,
            },
        };

        var streak = AchievementCatalogue.CurrentStreak(dailyPlay);
        Assert.Equal(1, streak);
    }

    // ---- calendar week ----

    [Fact]
    public void Full_week_awarded_when_all_seven_days_present()
    {
        // Mon Sep 7 2026 through Sun Sep 13 2026
        var dailyPlay = DaysFrom(new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc), 7);
        Assert.True(AchievementCatalogue.HasFullWeek(dailyPlay));
    }

    [Fact]
    public void Full_week_not_awarded_with_six_days()
    {
        // Mon through Sat only (missing Sunday)
        var dailyPlay = DaysFrom(new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc), 6);
        Assert.False(AchievementCatalogue.HasFullWeek(dailyPlay));
    }

    // ---- exploration ----

    [Fact]
    public void Restart_complete_awarded_when_restarted()
    {
        var ctx = MakeContext(restarted: true);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("restart-complete", awards);
    }

    [Fact]
    public void Restart_complete_not_awarded_without_restart()
    {
        var ctx = MakeContext(restarted: false);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("restart-complete", awards);
    }

    [Fact]
    public void All_hints_used_awarded_at_3_hints()
    {
        var ctx = MakeContext(hints: 3);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("all-hints-used", awards);
    }

    [Fact]
    public void Deep_diver_awarded_at_6_colours()
    {
        var ctx = MakeContext(colourCount: 6);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.Contains("deep-diver", awards);
    }

    [Fact]
    public void Deep_diver_not_awarded_below_6_colours()
    {
        var ctx = MakeContext(colourCount: 5);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("deep-diver", awards);
    }

    // ---- already awarded ----

    [Fact]
    public void Already_awarded_achievements_are_not_re_awarded()
    {
        var ctx = MakeContext(
            progress: ProgressWith(10),
            alreadyAwarded: ["milestone-1", "milestone-5", "milestone-10"]);
        var awards = AchievementCatalogue.Evaluate(ctx);
        Assert.DoesNotContain("milestone-1", awards);
        Assert.DoesNotContain("milestone-5", awards);
        Assert.DoesNotContain("milestone-10", awards);
    }

    // ---- retroactive ----

    [Fact]
    public void Retroactive_awards_milestones()
    {
        var progress = ProgressWith(12);
        var awards = AchievementCatalogue.EvaluateRetroactive(progress, [], []);
        Assert.Contains("milestone-1", awards);
        Assert.Contains("milestone-5", awards);
        Assert.Contains("milestone-10", awards);
        Assert.DoesNotContain("milestone-25", awards);
    }

    [Fact]
    public void Retroactive_awards_streaks()
    {
        var dailyPlay = DaysFrom(new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), 7);
        var awards = AchievementCatalogue.EvaluateRetroactive(PlayerProgress.Empty, dailyPlay, []);
        Assert.Contains("streak-2", awards);
        Assert.Contains("streak-7", awards);
    }

    // ---- catalogue completeness ----

    [Fact]
    public void Catalogue_has_21_achievements()
    {
        Assert.Equal(21, AchievementCatalogue.All.Count);
    }

    [Fact]
    public void All_ids_are_unique()
    {
        var ids = AchievementCatalogue.All.Select(a => a.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }
}
