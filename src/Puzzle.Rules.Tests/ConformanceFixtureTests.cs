using System.Reflection;
using System.Text.Json;

namespace Puzzle.Rules.Tests;

/// <summary>
/// The C# half of the cross-language conformance gate. Its TypeScript twin lives at
/// <c>client/src/engine/conformance.test.ts</c> and reads the same files.
///
/// Both suites run against the committed fixtures in <c>conformance/v1/</c>, and both
/// block merges. This is the highest-value test in the repository, because the failure
/// mode it guards is a player solving a puzzle and the server telling them they did not.
///
/// Change 2 fills the fixtures in. Until then these assert that the manifest exists, is
/// well formed, and agrees with the rule set version — so the gate is wired and cannot
/// rot unnoticed while it is still empty.
/// </summary>
[Trait("Category", "Conformance")]
public sealed class ConformanceFixtureTests
{
    [Fact]
    public void Manifest_exists_and_declares_the_rule_set_version()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(ManifestPath));
        var root = document.RootElement;

        Assert.Equal(1, root.GetProperty("rulesVersion").GetInt32());
        Assert.Equal(1, root.GetProperty("generatorVersion").GetInt32());
        Assert.Equal(JsonValueKind.Object, root.GetProperty("files").ValueKind);
    }

    [Fact]
    public void Every_declared_fixture_file_is_present()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(ManifestPath));
        var directory = Path.GetDirectoryName(ManifestPath)!;

        var missing = document.RootElement.GetProperty("files")
            .EnumerateObject()
            .Select(property => property.Name)
            .Where(name => !File.Exists(Path.Combine(directory, name)))
            .ToArray();

        Assert.True(
            missing.Length == 0,
            $"The manifest lists fixture files that are not on disk: {string.Join(", ", missing)}. "
            + $"A fixture the C# suite cannot read is a fixture that silently stops guarding "
            + $"engine divergence.");
    }

    private static string ManifestPath
    {
        get
        {
            var root = typeof(ConformanceFixtureTests).Assembly
                .GetCustomAttributes<AssemblyMetadataAttribute>()
                .Single(a => a.Key == "RepositoryRoot")
                .Value!;

            return Path.GetFullPath(Path.Combine(root, "conformance", "v1", "MANIFEST.json"));
        }
    }
}
