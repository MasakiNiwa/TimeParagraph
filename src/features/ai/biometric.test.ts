import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BiometricError, registerBiometric, unlockWithBiometric } from './biometric';

vi.mock('./keyVault', async (orig) => {
  const m = await orig<typeof import('./keyVault')>();
  return { ...m, createVaultKey: (p: string) => m.createVaultKey(p, 1000) };
});

/** 認証器の代わり。PRF は「認証器の秘密 + salt」の SHA-256 で再現する */
function fakeAuthenticator(opts: { prfAtCreate?: boolean; prf?: boolean; cancel?: boolean } = {}) {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const prf = async (salt: BufferSource) => {
    const s = new Uint8Array(salt instanceof ArrayBuffer ? salt : (salt as Uint8Array).buffer);
    return crypto.subtle.digest('SHA-256', new Uint8Array([...secret, ...s]));
  };
  const cred = (rawId: ArrayBuffer, first?: ArrayBuffer, enabled?: boolean) => ({
    rawId,
    getClientExtensionResults: () =>
      opts.prf === false ? {} : { prf: { enabled, ...(first ? { results: { first } } : {}) } },
  });
  const rawId = crypto.getRandomValues(new Uint8Array(16)).buffer;
  const create = vi.fn(async ({ publicKey }: CredentialCreationOptions) => {
    if (opts.cancel) throw new DOMException('cancel', 'NotAllowedError');
    const salt = (publicKey!.extensions as { prf: { eval: { first: BufferSource } } }).prf.eval
      .first;
    return cred(rawId, opts.prfAtCreate ? await prf(salt) : undefined, true);
  });
  const get = vi.fn(async ({ publicKey }: CredentialRequestOptions) => {
    if (opts.cancel) throw new DOMException('cancel', 'NotAllowedError');
    const salt = (publicKey!.extensions as { prf: { eval: { first: BufferSource } } }).prf.eval
      .first;
    return cred(rawId, await prf(salt));
  });
  vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {});
  Object.defineProperty(navigator, 'credentials', { value: { create, get }, configurable: true });
  return { create, get };
}

afterEach(() => vi.unstubAllGlobals());

describe('biometric', () => {
  it('登録した認証器でパスフレーズを取り出せる(登録時に PRF が返らない端末も)', async () => {
    for (const prfAtCreate of [true, false]) {
      const auth = fakeAuthenticator({ prfAtCreate });
      const bio = await registerBiometric('ひみつ');
      expect(bio.data).not.toContain('ひみつ');
      expect(auth.get).toHaveBeenCalledTimes(prfAtCreate ? 0 : 1);
      expect(await unlockWithBiometric(bio)).toBe('ひみつ');
    }
  });

  it('別の認証器では取り出せない', async () => {
    fakeAuthenticator();
    const bio = await registerBiometric('ひみつ');
    fakeAuthenticator();
    await expect(unlockWithBiometric(bio)).rejects.toBeInstanceOf(BiometricError);
  });

  it('PRF 非対応・キャンセルは分かるメッセージにする', async () => {
    fakeAuthenticator({ prf: false });
    await expect(registerBiometric('p')).rejects.toThrow(/PRF/);
    fakeAuthenticator({ cancel: true });
    await expect(registerBiometric('p')).rejects.toThrow(/キャンセル/);
  });
});

describe('useApiKeyStore の生体認証', () => {
  let store: typeof import('./apiKeys').useApiKeyStore;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    store = (await import('./apiKeys')).useApiKeyStore;
  });

  it('登録して、開き直したあと生体認証で解除できる', async () => {
    fakeAuthenticator();
    store.getState().setKey('google', 'secret-1');
    await store.getState().enableEncryption('pass');
    await expect(store.getState().enableBiometric('wrong')).rejects.toThrow(
      'パスフレーズが違います',
    );
    await store.getState().enableBiometric('pass');
    expect(localStorage.getItem('timeparagraph:ai-keys')).not.toContain('pass"');
    vi.resetModules();
    store = (await import('./apiKeys')).useApiKeyStore;
    expect(store.getState().locked).toBe(true);
    expect(store.getState().bio).not.toBeNull();
    await store.getState().unlockWithBiometric();
    expect(store.getState().keys).toEqual({ google: 'secret-1' });
  });

  it('パスフレーズを変えると生体認証は登録し直しになる', async () => {
    fakeAuthenticator();
    await store.getState().enableEncryption('pass');
    await store.getState().enableBiometric('pass');
    await store.getState().changePassphrase('new');
    expect(store.getState().bio).toBeNull();
  });
});
