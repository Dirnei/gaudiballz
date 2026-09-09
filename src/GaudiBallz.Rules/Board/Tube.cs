namespace GaudiBallz.Rules;

/// <summary>
/// A stack of coloured items, filled and emptied from the top only.
///
/// Items are packed one per byte into a <see cref="ulong"/>, bottom slot in the least
/// significant byte. Colour 0 means "no item", so colours are numbered from 1. That keeps
/// a tube a copy-by-value type with no allocation, which matters because applying a move
/// returns a new board rather than mutating one.
/// </summary>
public readonly struct Tube : IEquatable<Tube>
{
    /// <summary>The largest capacity a tube can have, set by the packing above.</summary>
    public const int MaxCapacity = 8;

    private readonly ulong _packed;

    private Tube(ulong packed) => _packed = packed;

    public static Tube Empty => new(0);

    /// <summary>Builds a tube from its contents, bottom item first.</summary>
    public static Tube FromBottomUp(ReadOnlySpan<byte> items)
    {
        if (items.Length > MaxCapacity)
        {
            throw new ArgumentException(
                $"A tube holds at most {MaxCapacity} items, got {items.Length}.", nameof(items));
        }

        ulong packed = 0;
        for (var slot = 0; slot < items.Length; slot++)
        {
            var colour = items[slot];
            if (colour == 0)
            {
                throw new ArgumentException(
                    "Colour 0 marks an empty slot and cannot be stored.", nameof(items));
            }

            packed |= (ulong)colour << (8 * slot);
        }

        return new Tube(packed);
    }

    public int Count
    {
        get
        {
            var count = 0;
            var packed = _packed;
            while (packed != 0)
            {
                count++;
                packed >>= 8;
            }

            return count;
        }
    }

    public bool IsEmpty => _packed == 0;

    /// <summary>The colour of the top item, or 0 when the tube is empty.</summary>
    public byte TopColour
    {
        get
        {
            var count = Count;
            return count == 0 ? (byte)0 : ColourAt(count - 1);
        }
    }

    /// <summary>The colour in a slot, counting from 0 at the bottom.</summary>
    public byte ColourAt(int slot) => (byte)(_packed >> (8 * slot));

    /// <summary>
    /// How many items of the top colour sit on top of the stack. Zero for an empty tube.
    /// This is what a pour picks up.
    /// </summary>
    public int TopRunLength
    {
        get
        {
            var count = Count;
            if (count == 0)
            {
                return 0;
            }

            var colour = ColourAt(count - 1);
            var run = 1;
            for (var slot = count - 2; slot >= 0 && ColourAt(slot) == colour; slot--)
            {
                run++;
            }

            return run;
        }
    }

    /// <summary>True when the tube holds one colour only. An empty tube is not uniform.</summary>
    public bool IsUniform => !IsEmpty && TopRunLength == Count;

    /// <summary>Returns a tube with <paramref name="amount"/> items of a colour added on top.</summary>
    public Tube Push(byte colour, int amount)
    {
        var packed = _packed;
        var slot = Count;
        for (var i = 0; i < amount; i++, slot++)
        {
            packed |= (ulong)colour << (8 * slot);
        }

        return new Tube(packed);
    }

    /// <summary>Returns a tube with <paramref name="amount"/> items removed from the top.</summary>
    public Tube Pop(int amount)
    {
        var packed = _packed;
        var slot = Count - 1;
        for (var i = 0; i < amount; i++, slot--)
        {
            packed &= ~(0xFFUL << (8 * slot));
        }

        return new Tube(packed);
    }

    public bool Equals(Tube other) => _packed == other._packed;

    public override bool Equals(object? obj) => obj is Tube other && Equals(other);

    public override int GetHashCode() => _packed.GetHashCode();

    public static bool operator ==(Tube left, Tube right) => left.Equals(right);

    public static bool operator !=(Tube left, Tube right) => !left.Equals(right);

    internal ulong Packed => _packed;
}
