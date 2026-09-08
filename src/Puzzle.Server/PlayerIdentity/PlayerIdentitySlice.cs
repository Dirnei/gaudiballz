using System.Buffers.Text;
using System.Collections.Concurrent;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.Extensions.DependencyInjection;
using Puzzle.Server.Persistence;

namespace Puzzle.Server.PlayerIdentity;

/// <summary>
/// Who a player is: an anonymous record from first launch, and passkeys they can attach and
/// sign in with later.
///
/// Everything this capability needs lives in this folder. There is no password anywhere in
/// it, no email field, and nothing that prompts — the endpoints exist and wait to be called.
/// </summary>
public sealed class PlayerIdentitySlice : ISlice
{
    public static string Name => "player-identity";

    public static void AddServices(IServiceCollection services)
    {
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/players").WithTags("Players");

        // First launch. No body, no fields, nothing to fill in.
        group.MapPost("/anonymous", async (PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
        {
            var playerId = Guid.NewGuid().ToString("N");
            await store.CreateAnonymousPlayerAsync(playerId, token);

            return Results.Ok(new
            {
                playerId,
                token = tokens.Issue(playerId),
                isAnonymous = true,
            });
        });

        group.MapGet("/me", async (HttpContext http, PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
        {
            var playerId = tokens.Verify(BearerFrom(http));
            if (playerId is null)
            {
                return Results.Unauthorized();
            }

            var player = await store.FindPlayerAsync(playerId, token);
            if (player is null)
            {
                return Results.Unauthorized();
            }

            await store.TouchPlayerAsync(playerId, token);

            return Results.Ok(new
            {
                playerId = player.Id,
                isAnonymous = player.IsAnonymous,
                username = player.Username,

                // Null when the player never chose one, which is what tells the client to
                // fall back to the colour derived from the username.
                ball = player.ProfileBall,
            });
        });

        // Checked before the device is asked for a passkey, so a taken name is reported
        // while the player is still typing rather than after the ceremony.
        group.MapGet("/username-available", async (string username, PuzzleStore store, CancellationToken token) =>
        {
            var problem = UsernameProblem(username);
            if (problem is not null)
            {
                return Results.Ok(new { available = false, reason = problem });
            }

            var taken = await store.FindByUsernameAsync(username, token) is not null;
            return Results.Ok(new
            {
                available = !taken,
                reason = taken ? "That name is taken." : null,
            });
        });

        MapEnrolment(group);
        MapSignIn(group);
    }

    /// <summary>
    /// Attaching a passkey to the player already playing.
    ///
    /// The credential joins the existing record, so nothing completed before enrolling is
    /// lost — which is the whole reason anonymous identity is a real server record rather
    /// than something promoted at signup time.
    /// </summary>
    private static void MapEnrolment(RouteGroupBuilder group)
    {
        group.MapPost("/passkey/enrol/begin",
            async (HttpContext http, RegisterRequest request, IFido2 fido2, PuzzleStore store,
                   PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var player = await store.FindPlayerAsync(playerId, token);
                if (player is null)
                {
                    return Results.Unauthorized();
                }

                // Only needed when the account has no name yet; a second passkey on an
                // existing account keeps the one it already has.
                if (player.Username is null)
                {
                    var problem = UsernameProblem(request.Username);
                    if (problem is not null)
                    {
                        return Results.BadRequest(new { error = problem });
                    }

                    // Claimed here rather than after the ceremony: the unique index is the
                    // authority, so a name taken between the availability check and now is
                    // caught before the player's device is troubled.
                    if (!await store.TryClaimUsernameAsync(playerId, request.Username, token))
                    {
                        return Results.Conflict(new { error = "That name is taken." });
                    }
                }

                var existing = await store.CredentialsForAsync(playerId, token);

                var options = fido2.RequestNewCredential(new RequestNewCredentialParams
                {
                    User = new Fido2User
                    {
                        Id = System.Text.Encoding.UTF8.GetBytes(playerId),
                        // No email, no username to choose. The display name is the game's,
                        // not a field anyone has to fill in.
                        Name = player.Username ?? request.Username,
                        DisplayName = player.Username ?? request.Username,
                    },
                    ExcludeCredentials = [.. existing.Select(c =>
                        new PublicKeyCredentialDescriptor(Base64Url.DecodeFromChars(c.Id)))],
                    AuthenticatorSelection = new AuthenticatorSelection
                    {
                        // Discoverable, so signing in later needs no username.
                        ResidentKey = ResidentKeyRequirement.Required,
                        UserVerification = UserVerificationRequirement.Preferred,
                    },
                    AttestationPreference = AttestationConveyancePreference.None,
                });

                Pending[playerId] = options.ToJson();
                return Results.Ok(options);
            });

        group.MapPost("/passkey/enrol/finish",
            async (HttpContext http, AuthenticatorAttestationRawResponse response, IFido2 fido2,
                   PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null || !Pending.TryRemove(playerId, out var stored))
                {
                    return Results.Unauthorized();
                }

                var options = CredentialCreateOptions.FromJson(stored);

                var credential = await fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
                {
                    AttestationResponse = response,
                    OriginalOptions = options,
                    IsCredentialIdUniqueToUserCallback = async (args, _) =>
                        await store.FindCredentialAsync(Base64Url.EncodeToString(args.CredentialId), token) is null,
                }, token);

                await store.AddCredentialAsync(new CredentialDocument
                {
                    Id = Base64Url.EncodeToString(credential.Id),
                    PlayerId = playerId,
                    PublicKey = credential.PublicKey,
                    UserHandle = credential.User.Id,
                    SignCount = credential.SignCount,
                    AttestationFormat = credential.AttestationFormat,
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow,
                }, token);

                await store.MarkEnrolledAsync(playerId, token);

                return Results.Ok(new { enrolled = true });
            });
    }

    /// <summary>
    /// Signing in on another device. No username, no email, no recovery code: the browser
    /// offers a discoverable credential and the account is resolved from it.
    /// </summary>
    private static void MapSignIn(RouteGroupBuilder group)
    {
        group.MapPost("/passkey/signin/begin", (IFido2 fido2) =>
        {
            var options = fido2.GetAssertionOptions(new GetAssertionOptionsParams
            {
                // Empty: the authenticator decides which credential to offer.
                AllowedCredentials = [],
                UserVerification = UserVerificationRequirement.Preferred,
            });

            var challenge = Base64Url.EncodeToString(options.Challenge);
            PendingAssertions[challenge] = options.ToJson();

            return Results.Ok(options);
        });

        group.MapPost("/passkey/signin/finish",
            async (AuthenticatorAssertionRawResponse response, IFido2 fido2, PuzzleStore store,
                   PlayerTokens tokens, CancellationToken token) =>
            {
                // Fido2 v4 hands the credential id back already base64url-encoded, which
                // is the same form the credential is stored under.
                var credentialId = response.Id;
                var credential = await store.FindCredentialAsync(credentialId, token);
                if (credential is null)
                {
                    // An unknown credential is refused outright. It must not quietly become
                    // a new account, or a failed sign-in would silently orphan progress.
                    return Results.Unauthorized();
                }

                var stored = PendingAssertions.Keys
                    .Select(k => PendingAssertions.TryGetValue(k, out var json) ? (k, json) : (k, null))
                    .FirstOrDefault(pair => pair.Item2 is not null);

                if (stored.Item2 is null)
                {
                    return Results.Unauthorized();
                }

                PendingAssertions.TryRemove(stored.k, out _);

                var result = await fido2.MakeAssertionAsync(new MakeAssertionParams
                {
                    AssertionResponse = response,
                    OriginalOptions = AssertionOptions.FromJson(stored.Item2),
                    StoredPublicKey = credential.PublicKey,
                    StoredSignatureCounter = credential.SignCount,
                    IsUserHandleOwnerOfCredentialIdCallback = (_, _) => Task.FromResult(true),
                }, token);

                await store.UpdateSignCountAsync(credentialId, result.SignCount, token);

                var account = await store.FindPlayerAsync(credential.PlayerId, token);

                return Results.Ok(new
                {
                    playerId = credential.PlayerId,
                    token = tokens.Issue(credential.PlayerId),
                    isAnonymous = false,
                    username = account?.Username,

                    // Signing in on a second device is exactly where the chosen ball has to
                    // arrive with the account rather than being derived again locally.
                    ball = account?.ProfileBall,
                });
            });
    }

    public sealed record RegisterRequest(string Username);

    /// <summary>What is wrong with this username, or null when nothing is.</summary>
    private static string? UsernameProblem(string? username)
    {
        var trimmed = username?.Trim() ?? string.Empty;

        if (trimmed.Length < 3)
        {
            return "A name needs at least 3 characters.";
        }

        if (trimmed.Length > 20)
        {
            return "A name can be at most 20 characters.";
        }

        // Letters, digits, and a couple of separators. Deliberately narrow: a name that is
        // shown to the player should not be able to hide characters they cannot see.
        return trimmed.All(c => char.IsLetterOrDigit(c) || c is '-' or '_')
            ? null
            : "Use letters, numbers, hyphens or underscores.";
    }

    private static string? BearerFrom(HttpContext http)
    {
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..]
            : null;
    }

    /// <summary>
    /// Challenges in flight. In memory because they live for seconds and a restart mid-flow
    /// costs the player one retry; persisting them would be machinery for nothing.
    /// </summary>
    private static readonly ConcurrentDictionary<string, string> Pending = new();

    private static readonly ConcurrentDictionary<string, string> PendingAssertions = new();
}
