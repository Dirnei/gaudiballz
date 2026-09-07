namespace Puzzle.Rules;

/// <summary>Difficulty inputs. Spare empty tubes dominate; shuffle depth saturates.</summary>
public readonly record struct LevelParameters(int Colours, int Capacity, int SpareTubes, int ShuffleDepth)
{
    public int TubeCount => Colours + SpareTubes;

    /// <summary>
    /// A reasonable default for a given colour count. Depth is set from the board size
    /// rather than exposed as a knob, because past roughly six times the item count the
    /// reachable-state distribution stops changing and deeper shuffling is not harder.
    /// </summary>
    public static LevelParameters ForColours(int colours, int capacity = 4, int spareTubes = 2) =>
        new(colours, capacity, spareTubes, ShuffleDepth: 6 * colours * capacity);
}

/// <summary>A generated level, together with a solution known to work.</summary>
public sealed record Level(
    ulong Seed,
    LevelParameters Parameters,
    Board Board,
    IReadOnlyList<Move> ConstructiveSolution,
    int GeneratorVersion,
    int RulesVersion);

/// <summary>
/// Builds levels by walking backwards from a solved board.
///
/// Solvability is <em>constructed</em>, not tested for. Each backward step is chosen so
/// that its inverse is a legal forward move, so the reversed chain is a working solution by
/// construction. That is what keeps the solver off the correctness path entirely: a solver
/// bug can never produce an unsolvable puzzle, because no solver is consulted.
///
/// The subtlety is that a naive "un-pour" does not give this. A forward pour takes the
/// whole top run (capped by space), so a predecessor has to be shaped such that the forward
/// move moves exactly the items that were pushed back. The two constraints below are what
/// guarantee it.
/// </summary>
public static class LevelGenerator
{
    public const int Version = 1;

    /// <summary>
    /// How many independent walks to try before settling. A walk is short - it deadlocks
    /// long before the nominal depth - so trying several and keeping the best-mixed result
    /// costs little and matters a lot.
    /// </summary>
    private const int Attempts = 48;

    public static Level Generate(ulong seed, LevelParameters parameters)
    {
        Validate(parameters);

        List<byte>[]? bestTubes = null;
        List<Move>? bestPath = null;
        var bestScore = -1;

        for (var attempt = 0; attempt < Attempts; attempt++)
        {
            // Each attempt gets its own stream, derived from the level seed so the whole
            // search stays reproducible.
            var rng = new Pcg32(Pcg32.SplitMix64(seed ^ ((ulong)attempt * 0xA5A5A5A5UL)));
            var (tubes, path) = Walk(rng, parameters);

            var score = Fragmentation(tubes, parameters.Colours);
            if (score > bestScore)
            {
                bestScore = score;
                bestTubes = tubes;
                bestPath = path;
            }
        }

        bestPath!.Reverse();

        var board = Board.Create(
            [.. bestTubes!.Select(t => (IReadOnlyList<byte>)[.. t])],
            parameters.Capacity,
            parameters.Colours);

        return new Level(seed, parameters, board, bestPath, Version, RuleSets.CurrentVersion);
    }

    private static (List<byte>[] Tubes, List<Move> Path) Walk(Pcg32 rng, LevelParameters parameters)
    {
        var tubes = SolvedLayout(parameters);
        var path = new List<Move>(parameters.ShuffleDepth);

        for (var step = 0; step < parameters.ShuffleDepth; step++)
        {
            var candidates = Unmoves(tubes, parameters);
            if (candidates.Count == 0)
            {
                break;
            }

            var chosen = Choose(rng, candidates);
            Apply(tubes, chosen);
            path.Add(new Move((byte)chosen.Receiver, (byte)chosen.Donor));
        }

        return (tubes, path);
    }

    /// <summary>
    /// Picks a reverse step, favouring ones that keep the walk alive.
    ///
    /// A reverse step drops `Count` items of one colour onto a tube showing a different
    /// colour, so the receiver ends with a top run of exactly `Count`. When that is 1, the
    /// receiver can never donate again: taking its single top item would leave a different
    /// colour underneath, which no forward move could have produced. Choosing uniformly
    /// fills the board with dead single-item tops within a dozen steps and leaves a board
    /// that is one move from solved. Weighting toward larger pours keeps donors available.
    /// </summary>
    private static Unmove Choose(Pcg32 rng, List<Unmove> candidates)
    {
        var total = 0;
        foreach (var candidate in candidates)
        {
            total += Weight(candidate);
        }

        var roll = rng.NextBounded(total);
        foreach (var candidate in candidates)
        {
            roll -= Weight(candidate);
            if (roll < 0)
            {
                return candidate;
            }
        }

        return candidates[^1];

        static int Weight(Unmove unmove) => unmove.Count >= 2 ? 6 : 1;
    }

    /// <summary>
    /// Colour boundaries beyond the minimum. A solved board scores 0; a thoroughly mixed
    /// one approaches one run per item. This is what "well shuffled" means here, and it
    /// predicts difficulty far better than how many steps the walk managed.
    /// </summary>
    private static int Fragmentation(List<byte>[] tubes, int colours)
    {
        var runs = 0;
        foreach (var tube in tubes)
        {
            for (var slot = 0; slot < tube.Count; slot++)
            {
                if (slot == 0 || tube[slot] != tube[slot - 1])
                {
                    runs++;
                }
            }
        }

        return runs - colours;
    }

    private static void Validate(LevelParameters p)
    {
        if (p.Colours < 1 || p.Colours > 255)
        {
            throw new ArgumentOutOfRangeException(nameof(p), "Colours must be between 1 and 255.");
        }

        if (p.Capacity < 2 || p.Capacity > Tube.MaxCapacity)
        {
            throw new ArgumentOutOfRangeException(nameof(p),
                $"Capacity must be between 2 and {Tube.MaxCapacity}.");
        }

        if (p.SpareTubes < 1)
        {
            // With no spare tube almost nothing is reachable, and the few boards that are
            // tend to be trivial rather than hard.
            throw new ArgumentOutOfRangeException(nameof(p), "At least one spare tube is required.");
        }

        if (p.TubeCount > Board.MaxTubes)
        {
            throw new ArgumentOutOfRangeException(nameof(p),
                $"A board holds at most {Board.MaxTubes} tubes, asked for {p.TubeCount}.");
        }
    }

    private static List<byte>[] SolvedLayout(LevelParameters p)
    {
        var tubes = new List<byte>[p.TubeCount];
        for (var colour = 1; colour <= p.Colours; colour++)
        {
            tubes[colour - 1] = [.. Enumerable.Repeat((byte)colour, p.Capacity)];
        }

        for (var spare = 0; spare < p.SpareTubes; spare++)
        {
            tubes[p.Colours + spare] = [];
        }

        return tubes;
    }

    /// <summary>One backward step: move <c>Count</c> items from Donor onto Receiver.</summary>
    private readonly record struct Unmove(int Donor, int Receiver, int Count);

    private static List<Unmove> Unmoves(List<byte>[] tubes, LevelParameters p)
    {
        var candidates = new List<Unmove>();

        for (var donor = 0; donor < tubes.Length; donor++)
        {
            var from = tubes[donor];
            if (from.Count == 0)
            {
                continue;
            }

            var colour = from[^1];
            var run = 1;
            for (var slot = from.Count - 2; slot >= 0 && from[slot] == colour; slot--)
            {
                run++;
            }

            for (var take = 1; take <= run; take++)
            {
                // Constraint A: after removing `take`, the donor must still be a legal
                // destination for the forward move — either it still shows the same colour
                // on top, or it is empty.
                if (take == run && from.Count != run)
                {
                    continue;
                }

                for (var receiver = 0; receiver < tubes.Length; receiver++)
                {
                    if (receiver == donor)
                    {
                        continue;
                    }

                    var to = tubes[receiver];
                    if (to.Count + take > p.Capacity)
                    {
                        continue;
                    }

                    // Constraint B: the receiver must be empty or show a different colour,
                    // so that in the predecessor its top run is exactly `take`. Otherwise
                    // the forward pour would carry more items than were pushed back.
                    if (to.Count > 0 && to[^1] == colour)
                    {
                        continue;
                    }

                    candidates.Add(new Unmove(donor, receiver, take));
                }
            }
        }

        return candidates;
    }

    private static void Apply(List<byte>[] tubes, Unmove unmove)
    {
        var from = tubes[unmove.Donor];
        var to = tubes[unmove.Receiver];
        var colour = from[^1];

        for (var i = 0; i < unmove.Count; i++)
        {
            from.RemoveAt(from.Count - 1);
            to.Add(colour);
        }
    }
}
