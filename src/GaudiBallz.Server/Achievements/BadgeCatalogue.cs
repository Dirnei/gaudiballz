using System.Collections.Immutable;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Achievements;

public enum BadgeCategory { StarMilestone, ColourMastery }

public sealed record BadgeDefinition(
    string Id,
    string Name,
    string Description,
    BadgeCategory Category,
    int? Threshold,
    bool IsRare = false);

public static class BadgeCatalogue
{
    public static readonly (int Colours, int From, int To)[] ColourBands =
    [
        (3, 1, 5),
        (4, 6, 14),
        (5, 15, 25),
        (6, 26, 38),
        (7, 39, 49),
        (8, 50, 70),
        (9, 71, 90),
        (10, 91, 110),
        (11, 111, 130),
        (12, 131, 150),
    ];

    public static IReadOnlyList<BadgeDefinition> All { get; } = BuildCatalogue();

    private static ImmutableArray<BadgeDefinition> BuildCatalogue()
    {
        var badges = ImmutableArray.CreateBuilder<BadgeDefinition>();

        badges.Add(new("star-1-50", "Star Collector I", "3-star all levels 1–50", BadgeCategory.StarMilestone, 50));
        badges.Add(new("star-51-100", "Star Collector II", "3-star all levels 51–100", BadgeCategory.StarMilestone, 50));
        badges.Add(new("star-101-150", "Star Collector III", "3-star all levels 101–150", BadgeCategory.StarMilestone, 50));
        badges.Add(new("star-all", "Perfectionist", "3-star every level", BadgeCategory.StarMilestone, null, IsRare: true));

        foreach (var (colours, from, to) in ColourBands)
        {
            var count = to - from + 1;
            var isRare = colours == 12;
            badges.Add(new($"colour-{colours}", $"Master of {colours} Colours",
                $"3-star all {colours}-colour levels ({from}–{to})",
                BadgeCategory.ColourMastery, count, isRare));
        }

        return badges.ToImmutable();
    }

    public static IReadOnlyList<string> Evaluate(PlayerProgress progress, ImmutableHashSet<string> alreadyAwarded)
    {
        var newAwards = new List<string>();

        foreach (var badge in All)
        {
            if (alreadyAwarded.Contains(badge.Id))
            {
                continue;
            }

            if (IsEarned(badge.Id, progress))
            {
                newAwards.Add(badge.Id);
            }
        }

        return newAwards;
    }

    private static bool IsEarned(string id, PlayerProgress progress) => id switch
    {
        "star-1-50" => AllThreeStarred(progress, 1, 50),
        "star-51-100" => AllThreeStarred(progress, 51, 100),
        "star-101-150" => AllThreeStarred(progress, 101, 150),
        "star-all" => progress.HighestCompleted > 0 && AllThreeStarred(progress, 1, progress.HighestCompleted),
        _ when id.StartsWith("colour-", StringComparison.Ordinal) => IsColourMasteryEarned(id, progress),
        _ => false,
    };

    private static bool IsColourMasteryEarned(string id, PlayerProgress progress)
    {
        var colourStr = id["colour-".Length..];
        if (!int.TryParse(colourStr, out var colours))
        {
            return false;
        }

        foreach (var (c, from, to) in ColourBands)
        {
            if (c == colours)
            {
                return AllThreeStarred(progress, from, to);
            }
        }

        return false;
    }

    private static bool AllThreeStarred(PlayerProgress progress, int from, int to)
    {
        for (var level = from; level <= to; level++)
        {
            if (!progress.Levels.TryGetValue(level, out var result) || result.Stars < 3)
            {
                return false;
            }
        }

        return true;
    }

    public static int ProgressFor(string badgeId, PlayerProgress progress) => badgeId switch
    {
        "star-1-50" => CountThreeStarred(progress, 1, 50),
        "star-51-100" => CountThreeStarred(progress, 51, 100),
        "star-101-150" => CountThreeStarred(progress, 101, 150),
        "star-all" => progress.HighestCompleted > 0
            ? CountThreeStarred(progress, 1, progress.HighestCompleted)
            : 0,
        _ when badgeId.StartsWith("colour-", StringComparison.Ordinal) => ColourMasteryProgress(badgeId, progress),
        _ => 0,
    };

    private static int ColourMasteryProgress(string badgeId, PlayerProgress progress)
    {
        var colourStr = badgeId["colour-".Length..];
        if (!int.TryParse(colourStr, out var colours))
        {
            return 0;
        }

        foreach (var (c, from, to) in ColourBands)
        {
            if (c == colours)
            {
                return CountThreeStarred(progress, from, to);
            }
        }

        return 0;
    }

    private static int CountThreeStarred(PlayerProgress progress, int from, int to)
    {
        var count = 0;
        for (var level = from; level <= to; level++)
        {
            if (progress.Levels.TryGetValue(level, out var result) && result.Stars >= 3)
            {
                count++;
            }
        }

        return count;
    }
}
