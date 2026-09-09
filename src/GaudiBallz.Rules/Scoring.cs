namespace GaudiBallz.Rules;

public static class Scoring
{
    public static (int Stars, int Points) Calculate(int moves, int hints, int? elapsedTimeMs, int par, int timeTargetMs)
    {
        if (hints > 0 || moves > par)
        {
            return (1, 100);
        }

        if (elapsedTimeMs is not null && elapsedTimeMs.Value <= timeTargetMs)
        {
            return (3, 500);
        }

        return (2, 250);
    }
}
