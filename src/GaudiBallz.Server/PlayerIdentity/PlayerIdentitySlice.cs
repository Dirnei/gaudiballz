using System.Buffers.Text;
using System.Collections.Concurrent;
using Akka.Actor;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.Extensions.DependencyInjection;
using GaudiBallz.Server.Achievements;
using GaudiBallz.Server.Persistence;

namespace GaudiBallz.Server.PlayerIdentity;

/// <summary>
/// Who a player is: an anonymous record from first launch, passkeys they can attach, and
/// optionally an email address for signing in with a one-time code.
///
/// Everything this capability needs lives in this folder. There is no password anywhere in
/// it, and nothing that prompts — the endpoints exist and wait to be called.
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

        group.MapGet("/me", async (HttpContext http, PuzzleStore store, PlayerTokens tokens,
                                    IServiceProvider services, CancellationToken token) =>
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
                ball = player.ProfileBall,
                email = player.Email,
                emailVerified = player.EmailVerified,
                emailEnabled = IsEmailEnabled(services),
            });
        });

        // Checked before the device is asked for a passkey, so a taken name is reported
        // while the player is still typing rather than after the ceremony.
        group.MapGet("/username-available", async (string username, PuzzleStore store, CancellationToken token) =>
        {
            var problem = UsernameProblem(username);
            if (problem is not null)
            {
                return Results.Ok(new { available = false, reason = problem.Message, code = problem.Code });
            }

            var taken = await store.FindByUsernameAsync(username, token) is not null;
            return Results.Ok(new
            {
                available = !taken,
                reason = taken ? "That name is taken." : null,
                code = taken ? "username-taken" : (string?)null,
            });
        });

        MapEnrolment(group);
        MapSignIn(group);
        MapEmailEndpoints(group);
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
                        return Results.BadRequest(new { error = problem.Message, code = problem.Code });
                    }

                    // Claimed here rather than after the ceremony: the unique index is the
                    // authority, so a name taken between the availability check and now is
                    // caught before the player's device is troubled.
                    if (!await store.TryClaimUsernameAsync(playerId, request.Username, token))
                    {
                        return Results.Conflict(new { error = "That name is taken.", code = "username-taken" });
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
                   PuzzleStore store, PlayerTokens tokens, AchievementRegistry achievements,
                   CancellationToken token) =>
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

                achievements.Actor.Tell(new EvaluateRetroactive(playerId), ActorRefs.NoSender);

                return Results.Ok(new { enrolled = true });
            });

        group.MapGet("/passkeys", async (HttpContext http, PuzzleStore store,
                   PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var credentials = await store.CredentialsForAsync(playerId, token);
                return Results.Ok(credentials.Select(c => new
                {
                    id = c.Id,
                    createdAt = c.CreatedAt,
                    lastUsedAt = c.LastUsedAt,
                }));
            });

        group.MapDelete("/passkeys/{credentialId}", async (HttpContext http, string credentialId,
                   PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var credentials = await store.CredentialsForAsync(playerId, token);
                var player = await store.FindPlayerAsync(playerId, token);
                var hasEmail = player?.Email is not null;

                if (credentials.Count <= 1 && !hasEmail)
                {
                    return Results.BadRequest(new { error = "Cannot delete your only passkey without an email linked.", code = "last-passkey" });
                }

                var deleted = await store.DeleteCredentialAsync(credentialId, playerId, token);
                return deleted
                    ? Results.Ok(new { deleted = true })
                    : Results.NotFound();
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
                   PlayerTokens tokens, IServiceProvider services, CancellationToken token) =>
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

                return Results.Ok(ToPlayerResponse(
                    account!, tokens.Issue(credential.PlayerId), IsEmailEnabled(services)));
            });
    }

    private static void MapEmailEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/email/enabled", (IServiceProvider services) =>
            Results.Ok(new { enabled = IsEmailEnabled(services) }));

        group.MapPost("/email/add/begin",
            async (HttpContext http, EmailRequest request, PuzzleStore store,
                   PlayerTokens tokens, EmailCodeStore codes, IServiceProvider services,
                   CancellationToken token) =>
            {
                var sender = services.GetService<IEmailSender>();
                if (sender is null)
                {
                    return Results.BadRequest(new { error = "Email is not configured.", code = "email-disabled" });
                }

                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                if (!IsValidEmail(request.Email))
                {
                    return Results.BadRequest(new { error = "Invalid email address.", code = "email-invalid" });
                }

                var player = await store.FindPlayerAsync(playerId, token);
                var changingEmail = player?.Email is not null
                    && PuzzleStore.NormaliseKey(player.Email) != PuzzleStore.NormaliseKey(request.Email);

                if (changingEmail || player?.Email is null)
                {
                    var linked = await store.LinkEmailAsync(playerId, request.Email, token);
                    if (!linked)
                    {
                        return Results.Conflict(new { error = "That email is already in use.", code = "email-taken" });
                    }
                }

                return SendCodeOrCooldown(codes, sender, request.Email);
            });

        group.MapPost("/email/add/verify",
            async (HttpContext http, CodeRequest request, PuzzleStore store,
                   PlayerTokens tokens, EmailCodeStore codes, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var player = await store.FindPlayerAsync(playerId, token);
                if (player?.Email is null)
                {
                    return Results.BadRequest(new { error = "No email to verify.", code = "no-pending" });
                }

                if (player.EmailVerified)
                {
                    return Results.Ok(new { verified = true });
                }

                var result = codes.Verify(player.Email, request.Code);
                if (!result.Valid)
                {
                    return Results.Ok(new { verified = false, error = CodeErrorMessage(result.Error), code = result.Error });
                }

                await store.VerifyEmailAsync(playerId, token);

                return Results.Ok(new { verified = true });
            });

        group.MapPost("/email/remove",
            async (HttpContext http, PuzzleStore store, PlayerTokens tokens, CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                await store.RemoveEmailAsync(playerId, token);
                return Results.Ok(new { removed = true });
            });

        group.MapPost("/email/signin/begin",
            async (EmailRequest request, PuzzleStore store, EmailCodeStore codes,
                   IServiceProvider services, CancellationToken token) =>
            {
                var sender = services.GetService<IEmailSender>();
                if (sender is null)
                {
                    return Results.BadRequest(new { error = "Email is not configured.", code = "email-disabled" });
                }

                var player = await store.FindByVerifiedEmailAsync(request.Email, token);
                if (player is not null)
                {
                    var codeResult = codes.Create(request.Email);
                    if (codeResult.Created)
                    {
                        _ = sender.SendCodeAsync(request.Email, codeResult.Code, CancellationToken.None);
                    }
                }

                return Results.Ok(new { sent = true });
            });

        group.MapPost("/email/signin/finish",
            async (EmailSignInRequest request, PuzzleStore store,
                   PlayerTokens tokens, EmailCodeStore codes, IServiceProvider services,
                   CancellationToken token) =>
            {
                var result = codes.Verify(request.Email, request.Code);
                if (!result.Valid)
                {
                    return Results.Unauthorized();
                }

                var player = await store.FindByVerifiedEmailAsync(request.Email, token);
                if (player is null)
                {
                    return Results.Unauthorized();
                }

                return Results.Ok(ToPlayerResponse(
                    player, tokens.Issue(player.Id), IsEmailEnabled(services)));
            });

        group.MapPost("/email/register",
            async (HttpContext http, EmailRegisterRequest request, PuzzleStore store,
                   PlayerTokens tokens, EmailCodeStore codes, IServiceProvider services,
                   CancellationToken token) =>
            {
                var sender = services.GetService<IEmailSender>();
                if (sender is null)
                {
                    return Results.BadRequest(new { error = "Email is not configured.", code = "email-disabled" });
                }

                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var problem = UsernameProblem(request.Username);
                if (problem is not null)
                {
                    return Results.BadRequest(new { error = problem.Message, code = problem.Code });
                }

                if (!IsValidEmail(request.Email))
                {
                    return Results.BadRequest(new { error = "Invalid email address.", code = "email-invalid" });
                }

                var existingEmail = await store.FindByEmailAsync(request.Email, token);
                if (existingEmail is not null)
                {
                    return Results.Conflict(new { error = "That email is already in use.", code = "email-taken" });
                }

                if (!await store.TryClaimUsernameAsync(playerId, request.Username, token))
                {
                    return Results.Conflict(new { error = "That name is taken.", code = "username-taken" });
                }

                var linked = await store.LinkEmailAsync(playerId, request.Email, token);
                if (!linked)
                {
                    return Results.Conflict(new { error = "That email is already in use.", code = "email-taken" });
                }

                return SendCodeOrCooldown(codes, sender, request.Email);
            });

        group.MapPost("/email/register/verify",
            async (HttpContext http, CodeRequest request, PuzzleStore store,
                   PlayerTokens tokens, EmailCodeStore codes, AchievementRegistry achievements,
                   CancellationToken token) =>
            {
                var playerId = tokens.Verify(BearerFrom(http));
                if (playerId is null)
                {
                    return Results.Unauthorized();
                }

                var player = await store.FindPlayerAsync(playerId, token);
                if (player?.Email is null)
                {
                    return Results.BadRequest(new { error = "No email to verify.", code = "no-pending" });
                }

                var result = codes.Verify(player.Email, request.Code);
                if (!result.Valid)
                {
                    return Results.Ok(new { enrolled = false, error = CodeErrorMessage(result.Error), code = result.Error });
                }

                await store.VerifyEmailAsync(playerId, token);
                await store.MarkEnrolledAsync(playerId, token);
                achievements.Actor.Tell(new EvaluateRetroactive(playerId), ActorRefs.NoSender);

                return Results.Ok(new { enrolled = true });
            });
    }

    private static string CodeErrorMessage(string? error) => error switch
    {
        "expired" => "That code has expired. Please request a new one.",
        "too-many-attempts" => "Too many attempts. Please request a new code.",
        "invalid" => "Incorrect code.",
        "no-pending" => "No code was requested for this email.",
        _ => "Verification failed.",
    };

    private static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var trimmed = email.Trim();
        var at = trimmed.IndexOf('@', StringComparison.Ordinal);
        return at > 0 && at < trimmed.Length - 1 && trimmed.IndexOf('@', at + 1) < 0;
    }

    public sealed record RegisterRequest(string Username);

    public sealed record EmailRequest(string Email);

    public sealed record CodeRequest(string Code);

    public sealed record EmailSignInRequest(string Email, string Code);

    public sealed record EmailRegisterRequest(string Username, string Email);

    /// <summary>A validation problem with a human-readable message and a stable machine code.</summary>
    private sealed record ValidationProblem(string Message, string Code);

    /// <summary>What is wrong with this username, or null when nothing is.</summary>
    private static ValidationProblem? UsernameProblem(string? username)
    {
        var trimmed = username?.Trim() ?? string.Empty;

        if (trimmed.Length < 3)
        {
            return new("A name needs at least 3 characters.", "username-too-short");
        }

        if (trimmed.Length > 20)
        {
            return new("A name can be at most 20 characters.", "username-too-long");
        }

        // Letters, digits, and a couple of separators. Deliberately narrow: a name that is
        // shown to the player should not be able to hide characters they cannot see.
        return trimmed.All(c => char.IsLetterOrDigit(c) || c is '-' or '_')
            ? null
            : new("Use letters, numbers, hyphens or underscores.", "username-invalid-chars");
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

    private static bool IsEmailEnabled(IServiceProvider services) =>
        services.GetService<IEmailSender>() is not null;

    private static IResult SendCodeOrCooldown(EmailCodeStore codes, IEmailSender sender, string email)
    {
        var result = codes.Create(email);
        if (!result.Created)
        {
            return Results.Ok(new { sent = false, error = "Please wait before requesting another code.", code = "cooldown" });
        }

        _ = sender.SendCodeAsync(email, result.Code, CancellationToken.None);
        return Results.Ok(new { sent = true });
    }

    private static PlayerResponse ToPlayerResponse(
        PlayerDocument player, string token, bool emailEnabled) =>
        new(player.Id, token, player.IsAnonymous, player.Username, player.ProfileBall,
            player.Email, player.EmailVerified, emailEnabled);

    internal sealed record PlayerResponse(
        string PlayerId,
        string Token,
        bool IsAnonymous,
        string? Username,
        int? Ball,
        string? Email,
        bool EmailVerified,
        bool EmailEnabled);
}
