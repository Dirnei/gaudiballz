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

            return Results.Ok(new { playerId = player.Id, isAnonymous = player.IsAnonymous });
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
            async (HttpContext http, IFido2 fido2, PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var existing = await store.CredentialsForAsync(playerId, token);

                var options = fido2.RequestNewCredential(new RequestNewCredentialParams
                {
                    User = new Fido2User
                    {
                        Id = System.Text.Encoding.UTF8.GetBytes(playerId),
                        // No email, no username to choose. The display name is the game's,
                        // not a field anyone has to fill in.
                        Name = $"Sort Puzzle ({playerId[..6]})",
                        DisplayName = "Sort Puzzle",
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

                return Results.Ok(new
                {
                    playerId = credential.PlayerId,
                    token = tokens.Issue(credential.PlayerId),
                    isAnonymous = false,
                });
            });
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
