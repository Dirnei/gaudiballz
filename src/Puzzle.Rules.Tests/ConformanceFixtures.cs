using System.Text.Json;
using System.Text.Json.Serialization;

namespace Puzzle.Rules.Tests;

/// <summary>
/// The shape of the shared fixture files. Both this suite and the TypeScript suite read
/// them, so these names are a wire contract and changing one is a breaking change.
/// </summary>
public sealed record FixtureFile(
    [property: JsonPropertyName("requirement")] string Requirement,
    [property: JsonPropertyName("cases")] IReadOnlyList<FixtureCase> Cases);

public sealed record FixtureCase(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("board")] BoardShape Board,
    [property: JsonPropertyName("move")] MoveShape? Move,
    [property: JsonPropertyName("expect")] ExpectShape Expect);

public sealed record BoardShape(
    [property: JsonPropertyName("tubes")] IReadOnlyList<IReadOnlyList<byte>> Tubes,
    [property: JsonPropertyName("capacity")] int Capacity,
    [property: JsonPropertyName("colourCount")] int ColourCount);

public sealed record MoveShape(
    [property: JsonPropertyName("from")] int From,
    [property: JsonPropertyName("to")] int To);

public sealed record ExpectShape(
    [property: JsonPropertyName("rejection")] string? Rejection = null,
    [property: JsonPropertyName("movedCount")] int? MovedCount = null,
    [property: JsonPropertyName("resultBoard")] BoardShape? ResultBoard = null,
    [property: JsonPropertyName("solved")] bool? Solved = null,
    [property: JsonPropertyName("moves")] IReadOnlyList<MoveShape>? Moves = null);

public static class FixtureJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}
