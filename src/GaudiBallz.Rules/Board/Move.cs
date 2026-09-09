namespace GaudiBallz.Rules;

/// <summary>A pour from one tube to another, both addressed by position from zero.</summary>
public readonly record struct Move(byte From, byte To)
{
    public override string ToString() => $"{From}->{To}";
}

/// <summary>Why a move was rejected. Named so a failing fixture points at a rule.</summary>
public enum MoveRejection
{
    None = 0,
    SameTube,
    TubeOutOfRange,
    SourceEmpty,
    DestinationFull,
    ColourMismatch,
}
