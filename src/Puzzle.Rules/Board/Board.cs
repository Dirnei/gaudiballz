using System.Collections.Immutable;

namespace Puzzle.Rules;

/// <summary>
/// A puzzle board: an ordered set of tubes sharing a capacity and a colour count.
///
/// Immutable. Applying a move returns a new board rather than mutating this one, which is
/// what lets the solver explore branches without undo bookkeeping and lets the verifier be
/// a fold over a move list.
/// </summary>
public sealed class Board : IEquatable<Board>
{
    /// <summary>Comfortably above any level this game ships; keeps a board small.</summary>
    public const int MaxTubes = 16;

    private readonly ImmutableArray<Tube> _tubes;

    private Board(ImmutableArray<Tube> tubes, int capacity, int colourCount)
    {
        _tubes = tubes;
        Capacity = capacity;
        ColourCount = colourCount;
    }

    public int Capacity { get; }

    public int ColourCount { get; }

    public int TubeCount => _tubes.Length;

    public Tube this[int index] => _tubes[index];

    public ImmutableArray<Tube> Tubes => _tubes;

    /// <summary>
    /// Builds a board from its tubes, each given bottom item first, and validates the
    /// structural rules: bounds on size, and exactly <paramref name="capacity"/> items of
    /// every colour.
    /// </summary>
    public static Board Create(IReadOnlyList<IReadOnlyList<byte>> tubes, int capacity, int colourCount)
    {
        ArgumentNullException.ThrowIfNull(tubes);

        if (capacity is < 1 or > Tube.MaxCapacity)
        {
            throw new ArgumentOutOfRangeException(nameof(capacity),
                $"Capacity must be between 1 and {Tube.MaxCapacity}, got {capacity}.");
        }

        if (tubes.Count is < 1 or > MaxTubes)
        {
            throw new ArgumentOutOfRangeException(nameof(tubes),
                $"A board holds between 1 and {MaxTubes} tubes, got {tubes.Count}.");
        }

        if (colourCount is < 1 or > 255)
        {
            throw new ArgumentOutOfRangeException(nameof(colourCount),
                $"Colour count must be between 1 and 255, got {colourCount}.");
        }

        var counts = new int[colourCount + 1];
        var builder = ImmutableArray.CreateBuilder<Tube>(tubes.Count);
        Span<byte> items = stackalloc byte[Tube.MaxCapacity];

        foreach (var contents in tubes)
        {
            if (contents.Count > capacity)
            {
                throw new ArgumentException(
                    $"A tube holds at most {capacity} items, got {contents.Count}.", nameof(tubes));
            }

            var slice = items[..contents.Count];
            for (var i = 0; i < contents.Count; i++)
            {
                var colour = contents[i];
                if (colour < 1 || colour > colourCount)
                {
                    throw new ArgumentException(
                        $"Colour {colour} is outside 1..{colourCount}.", nameof(tubes));
                }

                counts[colour]++;
                slice[i] = colour;
            }

            builder.Add(Tube.FromBottomUp(slice));
        }

        for (var colour = 1; colour <= colourCount; colour++)
        {
            if (counts[colour] != capacity)
            {
                throw new ArgumentException(
                    $"Every colour must appear exactly {capacity} times; colour {colour} "
                    + $"appears {counts[colour]} times.", nameof(tubes));
            }
        }

        return new Board(builder.MoveToImmutable(), capacity, colourCount);
    }

    /// <summary>Returns a board with one tube replaced. Used when applying a move.</summary>
    internal Board With(int firstIndex, Tube first, int secondIndex, Tube second)
    {
        var tubes = _tubes.ToBuilder();
        tubes[firstIndex] = first;
        tubes[secondIndex] = second;
        return new Board(tubes.MoveToImmutable(), Capacity, ColourCount);
    }

    public bool Equals(Board? other) =>
        other is not null
        && Capacity == other.Capacity
        && ColourCount == other.ColourCount
        && _tubes.AsSpan().SequenceEqual(other._tubes.AsSpan());

    public override bool Equals(object? obj) => Equals(obj as Board);

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(Capacity);
        foreach (var tube in _tubes)
        {
            hash.Add(tube);
        }

        return hash.ToHashCode();
    }
}
