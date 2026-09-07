using System.Reflection;
using System.Xml.Linq;

namespace Puzzle.Rules.Tests;

/// <summary>
/// Guards the one boundary in this repository worth enforcing mechanically:
/// <c>Puzzle.Rules</c> depends on nothing.
///
/// The engine has a TypeScript twin in <c>client/src/engine</c>, and the conformance
/// fixtures only hold the two in step if its behaviour is a pure function of its inputs.
/// The moment it takes a dependency on Akka, Mongo or ASP.NET, that stops being true and
/// the fixtures quietly stop meaning anything.
///
/// Checked two ways because neither alone is sufficient: reflection sees what the code
/// actually uses (including anything transitive), while reading the project file sees
/// what was declared — and the compiler emits no reference for a package that is declared
/// but not yet used, which is exactly the window in which a boundary is easiest to breach.
/// </summary>
public sealed class DependencyBoundaryTests
{
    private static readonly string[] PlatformPrefixes =
    [
        "System", "netstandard", "mscorlib", "Microsoft.CSharp",
    ];

    [Fact]
    public void Rules_declares_no_dependencies()
    {
        var project = XDocument.Load(Path.Combine(RepositoryRoot, "src", "Puzzle.Rules", "Puzzle.Rules.csproj"));

        var declared = project.Descendants("PackageReference")
            .Concat(project.Descendants("ProjectReference"))
            .Concat(project.Descendants("FrameworkReference"))
            .Select(e => e.Attribute("Include")?.Value ?? "?")
            .ToArray();

        Assert.True(
            declared.Length == 0,
            $"Puzzle.Rules must declare no dependencies, but declares: {string.Join(", ", declared)}. "
            + "It is one half of a cross-language pair and has to stay a pure function of its inputs.");
    }

    [Fact]
    public void Rules_uses_nothing_outside_the_base_class_library()
    {
        var directory = Path.GetDirectoryName(typeof(DependencyBoundaryTests).Assembly.Location)!;
        var path = Path.Combine(directory, "Puzzle.Rules.dll");

        Assert.True(File.Exists(path), $"Expected Puzzle.Rules.dll at {path}.");

        var external = Assembly.LoadFrom(path).GetReferencedAssemblies()
            .Select(a => a.Name!)
            .Where(name => !PlatformPrefixes.Any(prefix =>
                name.Equals(prefix, StringComparison.Ordinal)
                || name.StartsWith(prefix + ".", StringComparison.Ordinal)))
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        Assert.True(
            external.Length == 0,
            $"Puzzle.Rules must use only the base class library, but references: {string.Join(", ", external)}.");
    }

    private static string RepositoryRoot =>
        typeof(DependencyBoundaryTests).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .Single(a => a.Key == "RepositoryRoot")
            .Value!;
}
