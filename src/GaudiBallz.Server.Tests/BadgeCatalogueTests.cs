using System.Collections.Immutable;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

public sealed class BadgeCatalogueTests
{
    private static PlayerProgress ProgressWithThreeStars(int from, int to)
    {
        var progress = PlayerProgress.Empty;
        for (var i = from; i <= to; i++)
        {
            progress = progress.With(i, new LevelResult(10, 0, 3, 500));
        }

        return progress;
    }

    private static PlayerProgress ProgressWithMixedStars(int from, int to, int threeStarUpTo)
    {
        var progress = PlayerProgress.Empty;
        for (var i = from; i <= to; i++)
        {
            var stars = i <= threeStarUpTo ? 3 : 2;
            var points = stars == 3 ? 500 : 250;
            progress = progress.With(i, new LevelResult(10, 0, stars, points));
        }

        return progress;
    }

    // ---- star milestones ----

    [Fact]
    public void Star_1_50_awarded_when_all_three_starred()
    {
        var progress = ProgressWithThreeStars(1, 50);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.Contains("star-1-50", awards);
    }

    [Fact]
    public void Star_1_50_not_awarded_when_partially_complete()
    {
        var progress = ProgressWithThreeStars(1, 38);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.DoesNotContain("star-1-50", awards);
    }

    [Fact]
    public void Star_51_100_awarded_when_all_three_starred()
    {
        var progress = ProgressWithThreeStars(1, 100);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.Contains("star-51-100", awards);
    }

    [Fact]
    public void Star_101_150_awarded_when_all_three_starred()
    {
        var progress = ProgressWithThreeStars(1, 150);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.Contains("star-101-150", awards);
    }

    [Fact]
    public void Star_all_awarded_when_every_level_three_starred()
    {
        var progress = ProgressWithThreeStars(1, 73);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.Contains("star-all", awards);
    }

    [Fact]
    public void Star_all_not_awarded_when_one_level_below_three_stars()
    {
        var progress = ProgressWithMixedStars(1, 73, threeStarUpTo: 72);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.DoesNotContain("star-all", awards);
    }

    [Fact]
    public void Star_milestone_shows_progress()
    {
        var progress = ProgressWithThreeStars(1, 38);
        Assert.Equal(38, BadgeCatalogue.ProgressFor("star-1-50", progress));
    }

    [Fact]
    public void Already_awarded_badge_is_not_repeated()
    {
        var progress = ProgressWithThreeStars(1, 50);
        var already = ImmutableHashSet.Create("star-1-50");
        var awards = BadgeCatalogue.Evaluate(progress, already);
        Assert.DoesNotContain("star-1-50", awards);
    }

    // ---- colour mastery ----

    [Fact]
    public void Colour_mastery_4_awarded_when_levels_6_14_three_starred()
    {
        var progress = ProgressWithThreeStars(6, 14);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.Contains("colour-4", awards);
    }

    [Fact]
    public void Colour_mastery_4_not_awarded_when_partially_complete()
    {
        var progress = ProgressWithThreeStars(6, 10);
        var awards = BadgeCatalogue.Evaluate(progress, []);
        Assert.DoesNotContain("colour-4", awards);
    }

    [Fact]
    public void Colour_mastery_progress_shows_count()
    {
        var progress = ProgressWithThreeStars(6, 10);
        Assert.Equal(5, BadgeCatalogue.ProgressFor("colour-4", progress));
    }

    [Fact]
    public void Colour_mastery_12_is_rare()
    {
        var badge = BadgeCatalogue.All.First(b => b.Id == "colour-12");
        Assert.True(badge.IsRare);
    }

    [Fact]
    public void Star_all_is_rare()
    {
        var badge = BadgeCatalogue.All.First(b => b.Id == "star-all");
        Assert.True(badge.IsRare);
    }

    [Fact]
    public void Catalogue_has_unique_ids()
    {
        var ids = BadgeCatalogue.All.Select(b => b.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public void Catalogue_has_14_badges()
    {
        Assert.Equal(14, BadgeCatalogue.All.Count);
    }
}
