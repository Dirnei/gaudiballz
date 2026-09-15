import { API, authHeaders, parseIdentityResponse, type Identity, type IdentityResponse } from './identity';

async function postForSend(
  url: string,
  body: unknown,
  auth: boolean,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const headers: HeadersInit = auth
      ? authHeaders({ 'Content-Type': 'application/json' })
      : { 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { sent?: boolean; error?: string; code?: string };
    if (!response.ok || data.sent === false) {
      return { sent: false, error: data.code ?? data.error };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: 'network' };
  }
}

export async function checkEmailEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${API}/api/v1/players/email/enabled`);
    if (!response.ok) return false;
    const data = (await response.json()) as { enabled: boolean };
    return data.enabled;
  } catch {
    return false;
  }
}

export function addEmailBegin(email: string): Promise<{ sent: boolean; error?: string }> {
  return postForSend(`${API}/api/v1/players/email/add/begin`, { email }, true);
}

export async function addEmailVerify(code: string): Promise<{ verified: boolean; error?: string }> {
  try {
    const response = await fetch(`${API}/api/v1/players/email/add/verify`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ code }),
    });
    const data = (await response.json()) as { verified?: boolean; error?: string; code?: string };
    if (!data.verified) {
      return { verified: false, error: data.code ?? data.error };
    }
    return { verified: true };
  } catch {
    return { verified: false, error: 'network' };
  }
}

export async function removeEmail(): Promise<boolean> {
  try {
    const response = await fetch(`${API}/api/v1/players/email/remove`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function emailSignInBegin(email: string): Promise<{ sent: boolean; error?: string }> {
  return postForSend(`${API}/api/v1/players/email/signin/begin`, { email }, false);
}

export async function emailSignInFinish(
  email: string,
  code: string,
): Promise<Identity | null> {
  try {
    const response = await fetch(`${API}/api/v1/players/email/signin/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!response.ok) return null;
    return parseIdentityResponse((await response.json()) as IdentityResponse);
  } catch {
    return null;
  }
}

export function emailRegisterBegin(
  username: string,
  email: string,
): Promise<{ sent: boolean; error?: string }> {
  return postForSend(`${API}/api/v1/players/email/register`, { username, email }, true);
}

export async function emailRegisterVerify(code: string): Promise<{ enrolled: boolean; error?: string }> {
  try {
    const response = await fetch(`${API}/api/v1/players/email/register/verify`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; code?: string };
      return { enrolled: false, error: data.code ?? data.error };
    }
    return { enrolled: true };
  } catch {
    return { enrolled: false, error: 'network' };
  }
}
