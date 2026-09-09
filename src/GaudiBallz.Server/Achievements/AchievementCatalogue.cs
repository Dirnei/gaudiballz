using System.Collections.Immutable;
using GaudiBallz.Server.Levels;
using GaudiBallz.Server.Persistence;
using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Achievements;

public enum AchievementCategory { Milestone, Perfection, Streak, Calendar, Exploration }

public sealed record AchievementDefinition(
    string Id,
    string Name,
    string Description,
    AchievementCategory Category,
    int? Threshold);

public sealed record AttemptMetadata(
    int UndoCount,
    bool Restarted,
    string? SessionId,
    int ColourCount,
    int ParMoves);

public sealed record CompletionContext(
    string PlayerId,
    int Level,
    int Moves,
    int Hints,
    AttemptMetadata Metadata,
    PlayerProgress Progress,
    IReadOnlyList<DailyPlayDocument> DailyPlay,
    ImmutableHashSet<string> AlreadyAwarded);

public static class AchievementCatalogue
{
    public static IReadOnlyList<AchievementDefinition> All { get; } = BuildCatalogue();

    private static ImmutableArray<AchievementDefinition> BuildCatalogue() =>
    [
        // Milestones
        new("milestone-1",   "First Steps",        "Complete 1 level",    AchievementCategory.Milestone, 1),
        new("milestone-5",   "Getting Started",    "Complete 5 levels",   AchievementCategory.Milestone, 5),
        new("milestone-10",  "Double Digits",      "Complete 10 levels",  AchievementCategory.Milestone, 10),
        new("milestone-25",  "Halfway There",      "Complete 25 levels",  AchievementCategory.Milestone, 25),
        new("milestone-50",  "Half Century",       "Complete 50 levels",  AchievementCategory.Milestone, 50),
        new("milestone-100", "Century",            "Complete 100 levels", AchievementCategory.Milestone, 100),
        new("milestone-150", "Veteran",            "Complete 150 levels", AchievementCategory.Milestone, 150),

        // Perfection
        new("under-par",       "Under Par",       "Complete a level at or below par moves",              AchievementCategory.Perfection, null),
        new("no-hint-10",      "Flawless Ten",    "Complete 10 levels without using any hints",          AchievementCategory.Perfection, 10),
        new("no-hint-25",      "No Help Needed",  "Complete 25 levels without using any hints",          AchievementCategory.Perfection, 25),
        new("purist-40",       "Purist",          "Complete 40 levels without using any hints or undos", AchievementCategory.Perfection, 40),
        new("speed-demon",     "Speed Demon",     "Complete 5 levels at or below par moves",             AchievementCategory.Perfection, 5),

        // Streaks
        new("streak-2",  "Two-Day Streak",      "Play on 2 consecutive days",  AchievementCategory.Streak, 2),
        new("streak-7",  "Week Warrior",         "Play on 7 consecutive days",  AchievementCategory.Streak, 7),
        new("streak-14", "Fortnight",            "Play on 14 consecutive days", AchievementCategory.Streak, 14),
        new("streak-30", "Monthly Dedication",   "Play on 30 consecutive days", AchievementCategory.Streak, 30),

        // Calendar
        new("full-week", "Full Week", "Complete at least one level on every day of a calendar week", AchievementCategory.Calendar, null),

        // Exploration
        new("restart-complete", "Restart Resilience", "Restart a level and then complete it",                  AchievementCategory.Exploration, null),
        new("all-hints-used",   "Hint Apprentice",    "Use all hints in a single level and still complete it", AchievementCategory.Exploration, null),
        new("deep-diver",       "Deep Diver",         "Complete a level with 6 or more colours",               AchievementCategory.Exploration, null),
        new("marathon",         "Marathon",            "Complete 10 levels in a single session",                AchievementCategory.Exploration, 10),
    ];

    public static IReadOnlyList<string> Evaluate(CompletionContext ctx)
    {
        var newAwards = new List<string>();

        foreach (var achievement in All)
        {
            if (ctx.AlreadyAwarded.Contains(achievement.Id))
            {
                continue;
            }

            if (IsEarned(achievement.Id, ctx))
            {
                newAwards.Add(achievement.Id);
            }
        }

        return newAwards;
    }

    public static IReadOnlyList<string> EvaluateRetroactive(
        PlayerProgress progress,
        IReadOnlyList<DailyPlayDocument> dailyPlay,
        ImmutableHashSet<string> alreadyAwarded)
    {
        var ctx = new CompletionContext(
            PlayerId: "",
            Level: 0,
            Moves: 0,
            Hints: 0,
            Metadata: new AttemptMetadata(0, false, null, 0, 0),
            Progress: progress,
            DailyPlay: dailyPlay,
            AlreadyAwarded: alreadyAwarded);

        var newAwards = new List<string>();

        foreach (var achievement in All)
        {
            if (alreadyAwarded.Contains(achievement.Id))
            {
                continue;
            }

            if (IsEarnedRetroactive(achievement.Id, ctx))
            {
                newAwards.Add(achievement.Id);
            }
        }

        return newAwards;
    }

    private static bool IsEarned(string id, CompletionContext ctx) => id switch
    {
        "milestone-1"   => ctx.Progress.LevelsCompleted >= 1,
        "milestone-5"   => ctx.Progress.LevelsCompleted >= 5,
        "milestone-10"  => ctx.Progress.LevelsCompleted >= 10,
        "milestone-25"  => ctx.Progress.LevelsCompleted >= 25,
        "milestone-50"  => ctx.Progress.LevelsCompleted >= 50,
        "milestone-100" => ctx.Progress.LevelsCompleted >= 100,
        "milestone-150" => ctx.Progress.LevelsCompleted >= 150,

        "under-par" => ctx.Metadata.ParMoves > 0 && ctx.Moves <= ctx.Metadata.ParMoves,

        "no-hint-10"  => CountLevelsWithZeroHints(ctx.Progress) >= 10,
        "no-hint-25"  => CountLevelsWithZeroHints(ctx.Progress) >= 25,
        "purist-40"   => CountPuristLevels(ctx.Progress) >= 40,
        "speed-demon" => CountBelowParLevels(ctx.Progress) >= 5,

        "streak-2"  => CurrentStreak(ctx.DailyPlay) >= 2,
        "streak-7"  => CurrentStreak(ctx.DailyPlay) >= 7,
        "streak-14" => CurrentStreak(ctx.DailyPlay) >= 14,
        "streak-30" => CurrentStreak(ctx.DailyPlay) >= 30,

        "full-week" => HasFullWeek(ctx.DailyPlay),

        "restart-complete" => ctx.Metadata.Restarted,
        "all-hints-used"   => ctx.Hints >= 3,
        "deep-diver"       => ctx.Metadata.ColourCount >= 6,
        "marathon"         => false,

        _ => false,
    };

    private static bool IsEarnedRetroactive(string id, CompletionContext ctx) => id switch
    {
        "milestone-1"   => ctx.Progress.LevelsCompleted >= 1,
        "milestone-5"   => ctx.Progress.LevelsCompleted >= 5,
        "milestone-10"  => ctx.Progress.LevelsCompleted >= 10,
        "milestone-25"  => ctx.Progress.LevelsCompleted >= 25,
        "milestone-50"  => ctx.Progress.LevelsCompleted >= 50,
        "milestone-100" => ctx.Progress.LevelsCompleted >= 100,
        "milestone-150" => ctx.Progress.LevelsCompleted >= 150,
        "no-hint-10"    => CountLevelsWithZeroHints(ctx.Progress) >= 10,
        "no-hint-25"    => CountLevelsWithZeroHints(ctx.Progress) >= 25,
        "purist-40"     => CountPuristLevels(ctx.Progress) >= 40,
        "streak-2"      => CurrentStreak(ctx.DailyPlay) >= 2,
        "streak-7"      => CurrentStreak(ctx.DailyPlay) >= 7,
        "streak-14"     => CurrentStreak(ctx.DailyPlay) >= 14,
        "streak-30"     => CurrentStreak(ctx.DailyPlay) >= 30,
        "full-week"     => HasFullWeek(ctx.DailyPlay),
        _ => false,
    };

    internal static int CountLevelsWithZeroHints(PlayerProgress progress) =>
        progress.Levels.Values.Count(r => r.Hints == 0);

    internal static int CountPuristLevels(PlayerProgress progress) =>
        progress.Levels.Values.Count(r => r.Hints == 0);

    internal static int CountBelowParLevels(PlayerProgress progress) =>
        progress.Levels.Count(pair =>
            pair.Value.Moves <= LevelCatalogue.Build(pair.Key).ConstructiveSolution.Count);

    internal static int CurrentStreak(IReadOnlyList<DailyPlayDocument> dailyPlay)
    {
        if (dailyPlay.Count == 0)
        {
            return 0;
        }

        var dates = dailyPlay
            .Select(d => d.Date.Date)
            .Distinct()
            .OrderDescending()
            .ToList();

        var streak = 1;
        for (var i = 1; i < dates.Count; i++)
        {
            if (dates[i - 1] - dates[i] == TimeSpan.FromDays(1))
            {
                streak++;
            }
            else
            {
                break;
            }
        }

        return streak;
    }

    internal static bool HasFullWeek(IReadOnlyList<DailyPlayDocument> dailyPlay)
    {
        if (dailyPlay.Count < 7)
        {
            return false;
        }

        var dates = dailyPlay
            .Select(d => d.Date.Date)
            .ToHashSet();

        foreach (var date in dates)
        {
            var monday = date.AddDays(-(((int)date.DayOfWeek + 6) % 7));
            var allPresent = true;
            for (var i = 0; i < 7; i++)
            {
                if (!dates.Contains(monday.AddDays(i)))
                {
                    allPresent = false;
                    break;
                }
            }

            if (allPresent)
            {
                return true;
            }
        }

        return false;
    }

    public static int ProgressFor(string achievementId, PlayerProgress progress,
        IReadOnlyList<DailyPlayDocument> dailyPlay) => achievementId switch
    {
        "milestone-1" or "milestone-5" or "milestone-10" or "milestone-25"
            or "milestone-50" or "milestone-100" or "milestone-150" =>
            progress.LevelsCompleted,
        "no-hint-10" or "no-hint-25" => CountLevelsWithZeroHints(progress),
        "purist-40" => CountPuristLevels(progress),
        "speed-demon" => CountBelowParLevels(progress),
        "streak-2" or "streak-7" or "streak-14" or "streak-30" => CurrentStreak(dailyPlay),
        _ => 0,
    };
}
