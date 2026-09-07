namespace Puzzle.Rules;

/// <summary>
/// PCG-XSH-RR 64/32, implemented here rather than taken from the platform.
///
/// A level's identity is (seed, parameters, generator version). If seed → board ever
/// shifts, every stored level silently becomes a different puzzle and every player's
/// progress points at content that no longer exists.
///
/// <see cref="System.Random"/> cannot be used for this: the algorithm behind its seeded
/// constructor is a compatibility artifact that Microsoft does not guarantee stable across
/// runtime versions, and the parameterless one is seeded from OS entropy by design.
///
/// The bounded draw below uses rejection sampling. That choice is part of the contract,
/// not an implementation detail — two correct PCG implementations using different bounding
/// methods produce different sequences from the same seed.
/// </summary>
public sealed class Pcg32
{
    private const ulong Multiplier = 6364136223846793005UL;

    private ulong _state;
    private readonly ulong _increment;

    public Pcg32(ulong seed)
    {
        _increment = (SplitMix64(seed) << 1) | 1UL;
        _state = 0UL;
        NextUInt32();
        _state += SplitMix64(seed ^ 0x9E3779B97F4A7C15UL);
        NextUInt32();
    }

    public uint NextUInt32()
    {
        var old = _state;
        _state = (old * Multiplier) + _increment;

        var xorshifted = (uint)(((old >> 18) ^ old) >> 27);
        var rot = (int)(old >> 59);

        return System.Numerics.BitOperations.RotateRight(xorshifted, rot);
    }

    /// <summary>Uniform in [0, bound). Rejection sampling; see the type remarks.</summary>
    public uint NextBounded(uint bound)
    {
        if (bound == 0)
        {
            throw new ArgumentOutOfRangeException(nameof(bound), "Bound must be positive.");
        }

        var threshold = (uint)(-(int)bound) % bound;
        while (true)
        {
            var value = NextUInt32();
            if (value >= threshold)
            {
                return value % bound;
            }
        }
    }

    public int NextBounded(int bound) => (int)NextBounded((uint)bound);

    /// <summary>Mixes a seed so that adjacent seeds produce unrelated streams.</summary>
    public static ulong SplitMix64(ulong seed)
    {
        var z = seed + 0x9E3779B97F4A7C15UL;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9UL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBUL;
        return z ^ (z >> 31);
    }
}
