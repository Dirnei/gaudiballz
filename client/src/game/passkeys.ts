/**
 * Passkeys, through the browser's own WebAuthn API.
 *
 * No password anywhere, and no username or email to sign in with: credentials are
 * discoverable, so the browser offers the right one and the server resolves the account
 * from it.
 */

import { API, authHeaders, remember, type Identity } from './identity';

/** Why passkeys cannot be used here, or null when they can. */
export type PasskeyBlocker = 'unsupported' | 'insecure-context' | null;

/**
 * Checked before anything is offered, so the reason is stated rather than discovered as a
 * failure halfway through.
 *
 * The insecure-context case is the common one in practice: browsers refuse WebAuthn on
 * plain HTTP other than localhost, so opening the game from another device over a local
 * network cannot enrol until it is served over HTTPS.
 */
export function passkeyBlocker(): PasskeyBlocker {
  if (typeof PublicKeyCredential === 'undefined') {
    return 'unsupported';
  }
  if (!window.isSecureContext) {
    return 'insecure-context';
  }
  return null;
}

export function blockerMessage(blocker: PasskeyBlocker): string | null {
  switch (blocker) {
    case 'unsupported':
      return 'This browser can’t do passkeys, so there’s nothing to set up here.';
    case 'insecure-context':
      return 'Passkeys need a secure connection. This works on the computer running the game, but not over a plain network address.';
    default:
      return null;
  }
}

/** WebAuthn speaks ArrayBuffers; the wire speaks base64url. */
function toBuffer(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Attaches a passkey to the player already playing, so nothing completed beforehand is
 * lost.
 */
export async function enrol(): Promise<boolean> {
  const begin = await fetch(`${API}/api/v1/players/passkey/enrol/begin`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!begin.ok) {
    return false;
  }

  const options = await begin.json();

  const created = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      user: { ...options.user, id: toBuffer(options.user.id) },
      excludeCredentials: (options.excludeCredentials ?? []).map(
        (c: { id: string; type: string }) => ({ ...c, id: toBuffer(c.id) }),
      ),
    },
  })) as PublicKeyCredential | null;

  if (created === null) {
    return false;
  }

  const attestation = created.response as AuthenticatorAttestationResponse;

  const finish = await fetch(`${API}/api/v1/players/passkey/enrol/finish`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: created.id,
      rawId: toBase64Url(created.rawId),
      type: created.type,
      extensions: created.getClientExtensionResults(),
      response: {
        attestationObject: toBase64Url(attestation.attestationObject),
        clientDataJSON: toBase64Url(attestation.clientDataJSON),
      },
    }),
  });

  return finish.ok;
}

/**
 * Signs in on any device. Returns the identity now in use, or null when the credential is
 * not one we know — an unknown passkey is refused rather than quietly becoming a new
 * account, which would orphan whatever it was meant to reach.
 */
export async function signIn(): Promise<Identity | null> {
  const begin = await fetch(`${API}/api/v1/players/passkey/signin/begin`, { method: 'POST' });
  if (!begin.ok) {
    return null;
  }

  const options = await begin.json();

  const assertion = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      // Empty on purpose: the authenticator picks, so there is nothing to type.
      allowCredentials: [],
    },
  })) as PublicKeyCredential | null;

  if (assertion === null) {
    return null;
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  const finish = await fetch(`${API}/api/v1/players/passkey/signin/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: assertion.id,
      rawId: toBase64Url(assertion.rawId),
      type: assertion.type,
      extensions: assertion.getClientExtensionResults(),
      response: {
        authenticatorData: toBase64Url(response.authenticatorData),
        clientDataJSON: toBase64Url(response.clientDataJSON),
        signature: toBase64Url(response.signature),
        userHandle: response.userHandle === null ? null : toBase64Url(response.userHandle),
      },
    }),
  });

  if (!finish.ok) {
    return null;
  }

  const identity = (await finish.json()) as Identity;
  remember(identity);
  return identity;
}
