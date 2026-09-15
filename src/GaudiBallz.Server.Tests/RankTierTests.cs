using GaudiBallz.Server.Progression;

namespace GaudiBallz.Server.Tests;

public sealed class RankTierTests
{
    // ---- FromXp ----

    [Fact]
    public void Zero_xp_is_Bronze_1()
    {
        var (tier, sub) = RankTier.FromXp(0);
        Assert.Equal(Tier.Bronze, tier);
        Assert.Equal(1, sub);
    }

    [Theory]
    [InlineData(0, Tier.Bronze, 1)]
    [InlineData(7_999, Tier.Bronze, 1)]
    [InlineData(8_000, Tier.Bronze, 2)]
    [InlineData(16_000, Tier.Bronze, 3)]
    [InlineData(72_000, Tier.Bronze, 10)]
    [InlineData(79_999, Tier.Bronze, 10)]
    public void Bronze_sub_levels(long xp, Tier expectedTier, int expectedSub)
    {
        var (tier, sub) = RankTier.FromXp(xp);
        Assert.Equal(expectedTier, tier);
        Assert.Equal(expectedSub, sub);
    }

    [Fact]
    public void Silver_entry_at_80k()
    {
        var (tier, sub) = RankTier.FromXp(80_000);
        Assert.Equal(Tier.Silver, tier);
        Assert.Equal(1, sub);
    }

    [Theory]
    [InlineData(80_000, Tier.Silver, 1)]
    [InlineData(119_999, Tier.Silver, 1)]
    [InlineData(120_000, Tier.Silver, 2)]
    [InlineData(440_000, Tier.Silver, 10)]
    [InlineData(479_999, Tier.Silver, 10)]
    public void Silver_sub_levels(long xp, Tier expectedTier, int expectedSub)
    {
        var (tier, sub) = RankTier.FromXp(xp);
        Assert.Equal(expectedTier, tier);
        Assert.Equal(expectedSub, sub);
    }

    [Fact]
    public void Gold_entry_at_480k()
    {
        var (tier, sub) = RankTier.FromXp(480_000);
        Assert.Equal(Tier.Gold, tier);
        Assert.Equal(1, sub);
    }

    [Theory]
    [InlineData(480_000, Tier.Gold, 1)]
    [InlineData(531_999, Tier.Gold, 1)]
    [InlineData(532_000, Tier.Gold, 2)]
    [InlineData(948_000, Tier.Gold, 10)]
    [InlineData(999_999, Tier.Gold, 10)]
    public void Gold_sub_levels(long xp, Tier expectedTier, int expectedSub)
    {
        var (tier, sub) = RankTier.FromXp(xp);
        Assert.Equal(expectedTier, tier);
        Assert.Equal(expectedSub, sub);
    }

    [Fact]
    public void Platinum_entry_at_1M()
    {
        var (tier, sub) = RankTier.FromXp(1_000_000);
        Assert.Equal(Tier.Platinum, tier);
        Assert.Equal(1, sub);
    }

    [Theory]
    [InlineData(1_000_000, Tier.Platinum, 1)]
    [InlineData(1_059_999, Tier.Platinum, 1)]
    [InlineData(1_060_000, Tier.Platinum, 2)]
    [InlineData(1_540_000, Tier.Platinum, 10)]
    [InlineData(1_599_999, Tier.Platinum, 10)]
    public void Platinum_sub_levels(long xp, Tier expectedTier, int expectedSub)
    {
        var (tier, sub) = RankTier.FromXp(xp);
        Assert.Equal(expectedTier, tier);
        Assert.Equal(expectedSub, sub);
    }

    [Fact]
    public void Diamond_entry_at_1_6M()
    {
        var (tier, sub) = RankTier.FromXp(1_600_000);
        Assert.Equal(Tier.Diamond, tier);
        Assert.Equal(1, sub);
    }

    [Theory]
    [InlineData(1_600_000, Tier.Diamond, 1)]
    [InlineData(1_679_999, Tier.Diamond, 1)]
    [InlineData(1_680_000, Tier.Diamond, 2)]
    [InlineData(1_920_000, Tier.Diamond, 5)]
    [InlineData(2_000_000, Tier.Diamond, 5)]
    [InlineData(5_000_000, Tier.Diamond, 5)]
    public void Diamond_sub_levels_and_cap(long xp, Tier expectedTier, int expectedSub)
    {
        var (tier, sub) = RankTier.FromXp(xp);
        Assert.Equal(expectedTier, tier);
        Assert.Equal(expectedSub, sub);
    }

    [Fact]
    public void Mid_tier_value_Gold_5()
    {
        var (tier, sub) = RankTier.FromXp(700_000);
        Assert.Equal(Tier.Gold, tier);
        // (700_000 - 480_000) / 52_000 = 220_000 / 52_000 = 4.23 → sub 5
        Assert.Equal(5, sub);
    }

    // ---- NextThreshold ----

    [Fact]
    public void NextThreshold_for_Bronze_1()
    {
        Assert.Equal(8_000L, RankTier.NextThreshold(0));
    }

    [Fact]
    public void NextThreshold_for_Silver_1()
    {
        Assert.Equal(120_000L, RankTier.NextThreshold(80_000));
    }

    [Fact]
    public void NextThreshold_at_max_rank_returns_null()
    {
        Assert.Null(RankTier.NextThreshold(2_000_000));
    }

    // ---- Rank-up detection ----

    [Fact]
    public void No_rank_change_when_xp_stays_in_same_sub_level()
    {
        var result = RankTier.DetectRankUp(1_000, 5_000);
        Assert.Equal(RankUpKind.None, result.Kind);
    }

    [Fact]
    public void Sub_level_up_detected()
    {
        var result = RankTier.DetectRankUp(7_000, 9_000);
        Assert.Equal(RankUpKind.SubLevel, result.Kind);
        Assert.Equal(Tier.Bronze, result.OldTier);
        Assert.Equal(1, result.OldSubLevel);
        Assert.Equal(Tier.Bronze, result.NewTier);
        Assert.Equal(2, result.NewSubLevel);
    }

    [Fact]
    public void Tier_promotion_detected()
    {
        var result = RankTier.DetectRankUp(79_000, 81_000);
        Assert.Equal(RankUpKind.TierPromotion, result.Kind);
        Assert.Equal(Tier.Bronze, result.OldTier);
        Assert.Equal(10, result.OldSubLevel);
        Assert.Equal(Tier.Silver, result.NewTier);
        Assert.Equal(1, result.NewSubLevel);
    }

    [Fact]
    public void Multi_sub_level_jump_is_still_sub_level_up()
    {
        var result = RankTier.DetectRankUp(0, 24_000);
        Assert.Equal(RankUpKind.SubLevel, result.Kind);
        Assert.Equal(Tier.Bronze, result.NewTier);
        Assert.Equal(4, result.NewSubLevel);
    }

    [Fact]
    public void No_change_at_max_rank()
    {
        var result = RankTier.DetectRankUp(2_500_000, 3_000_000);
        Assert.Equal(RankUpKind.None, result.Kind);
    }
}
