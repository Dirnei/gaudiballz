import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkEmailEnabled,
  addEmailBegin,
  addEmailVerify,
  removeEmail,
  emailSignInBegin,
  emailSignInFinish,
  emailRegisterBegin,
  emailRegisterVerify,
} from './emailLogin';

function ok(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

function fail(status: number, body: unknown = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('emailLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('checkEmailEnabled', () => {
    it('returns true when enabled', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ enabled: true })));
      expect(await checkEmailEnabled()).toBe(true);
    });

    it('returns false when disabled', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ enabled: false })));
      expect(await checkEmailEnabled()).toBe(false);
    });

    it('returns false on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      expect(await checkEmailEnabled()).toBe(false);
    });
  });

  describe('addEmailBegin', () => {
    it('returns sent:true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ sent: true })));
      const result = await addEmailBegin('test@example.com');
      expect(result.sent).toBe(true);
    });

    it('returns error code on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(409, { code: 'email-taken' })));
      const result = await addEmailBegin('taken@example.com');
      expect(result.sent).toBe(false);
      expect(result.error).toBe('email-taken');
    });
  });

  describe('addEmailVerify', () => {
    it('returns verified:true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ verified: true })));
      const result = await addEmailVerify('123456');
      expect(result.verified).toBe(true);
    });

    it('returns error on invalid code', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ verified: false, code: 'invalid' })));
      const result = await addEmailVerify('000000');
      expect(result.verified).toBe(false);
      expect(result.error).toBe('invalid');
    });
  });

  describe('removeEmail', () => {
    it('returns true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ removed: true })));
      expect(await removeEmail()).toBe(true);
    });

    it('returns false on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(500)));
      expect(await removeEmail()).toBe(false);
    });
  });

  describe('emailSignInBegin', () => {
    it('returns sent:true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ sent: true })));
      const result = await emailSignInBegin('user@example.com');
      expect(result.sent).toBe(true);
    });

    it('returns sent:false with error on throttle', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(429, { code: 'cooldown' })));
      const result = await emailSignInBegin('user@example.com');
      expect(result.sent).toBe(false);
      expect(result.error).toBe('cooldown');
    });
  });

  describe('emailSignInFinish', () => {
    it('returns identity on valid code', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          ok({
            playerId: 'p1',
            token: 'tok',
            isAnonymous: false,
            username: 'alice',
            ball: null,
            email: 'alice@example.com',
            emailEnabled: true,
          }),
        ),
      );

      const identity = await emailSignInFinish('alice@example.com', '123456');
      expect(identity).not.toBeNull();
      expect(identity!.playerId).toBe('p1');
      expect(identity!.username).toBe('alice');
      expect(identity!.email).toBe('alice@example.com');
    });

    it('returns null on invalid code', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(401)));
      const identity = await emailSignInFinish('alice@example.com', '000000');
      expect(identity).toBeNull();
    });
  });

  describe('emailRegisterBegin', () => {
    it('returns sent:true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ sent: true })));
      const result = await emailRegisterBegin('newuser', 'new@example.com');
      expect(result.sent).toBe(true);
    });

    it('returns error on taken username', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(409, { code: 'username-taken' })));
      const result = await emailRegisterBegin('taken', 'new@example.com');
      expect(result.sent).toBe(false);
      expect(result.error).toBe('username-taken');
    });
  });

  describe('emailRegisterVerify', () => {
    it('returns enrolled:true on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(ok({ enrolled: true })));
      const result = await emailRegisterVerify('123456');
      expect(result.enrolled).toBe(true);
    });

    it('returns error on expired code', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(400, { code: 'expired' })));
      const result = await emailRegisterVerify('123456');
      expect(result.enrolled).toBe(false);
      expect(result.error).toBe('expired');
    });
  });
});
