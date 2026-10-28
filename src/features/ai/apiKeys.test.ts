import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openVault, sealVault, createVaultKey } from './keyVault';

// テストでは反復回数を減らして速くする
vi.mock('./keyVault', async (orig) => {
  const m = await orig<typeof import('./keyVault')>();
  return { ...m, createVaultKey: (p: string) => m.createVaultKey(p, 1000) };
});

const STORAGE_KEY = 'timeparagraph:ai-keys';
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')?.state;

describe('keyVault', () => {
  it('同じパスフレーズで復号でき、違うと null', async () => {
    const vk = await createVaultKey('あいことば');
    const vault = await sealVault(vk, { google: 'secret-key-123' });
    expect(vault.data).not.toContain('secret-key');
    expect((await openVault(vault, 'あいことば'))?.value).toEqual({ google: 'secret-key-123' });
    expect(await openVault(vault, 'ちがう')).toBeNull();
  });

  it('毎回別の IV で暗号化する', async () => {
    const vk = await createVaultKey('p');
    const a = await sealVault(vk, {});
    const b = await sealVault(vk, {});
    expect(a.iv).not.toBe(b.iv);
  });
});

describe('useApiKeyStore の暗号化', () => {
  let store: typeof import('./apiKeys').useApiKeyStore;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    store = (await import('./apiKeys')).useApiKeyStore;
  });

  const flush = () => new Promise((r) => setTimeout(r, 50));

  it('暗号化すると平文のキーを保存しない', async () => {
    store.getState().setKey('google', ' secret-1 ');
    expect(stored().keys).toEqual({ google: 'secret-1' });
    await store.getState().enableEncryption('pass');
    expect(stored().keys).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('secret-1');
    expect(store.getState().keys.google).toBe('secret-1');
  });

  it('ロックと解除、解除後の変更も暗号化して保存する', async () => {
    store.getState().setKey('google', 'secret-1');
    await store.getState().enableEncryption('pass');
    store.getState().lock();
    expect(store.getState().keys).toEqual({});
    expect(await store.getState().unlock('wrong')).toBe(false);
    expect(store.getState().locked).toBe(true);
    expect(await store.getState().unlock('pass')).toBe(true);
    store.getState().setKey('openai', 'secret-2');
    await flush();
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('secret-2');
    const opened = await openVault(stored().vault, 'pass');
    expect(opened?.value).toEqual({ google: 'secret-1', openai: 'secret-2' });
  });

  it('開き直すとロックされていて、ロック中に受け取ったキーは解除時に保存する', async () => {
    store.getState().setKey('google', 'secret-1');
    await store.getState().enableEncryption('pass');
    vi.resetModules();
    store = (await import('./apiKeys')).useApiKeyStore;
    expect(store.getState().locked).toBe(true);
    expect(store.getState().keys).toEqual({});
    store.getState().setKey('openrouter', 'or-key');
    expect(store.getState().keys).toEqual({});
    expect(await store.getState().unlock('pass')).toBe(true);
    expect(store.getState().keys).toEqual({ google: 'secret-1', openrouter: 'or-key' });
    expect((await openVault(stored().vault, 'pass'))?.value).toEqual({
      google: 'secret-1',
      openrouter: 'or-key',
    });
  });

  it('パスフレーズの変更と暗号化の解除', async () => {
    store.getState().setKey('google', 'secret-1');
    await store.getState().enableEncryption('old');
    await store.getState().changePassphrase('new');
    expect(await openVault(stored().vault, 'old')).toBeNull();
    expect((await openVault(stored().vault, 'new'))?.value).toEqual({ google: 'secret-1' });
    store.getState().disableEncryption();
    expect(stored()).toEqual({ keys: { google: 'secret-1' } });
  });

  it('すべて削除すると暗号文も消える', async () => {
    store.getState().setKey('google', 'secret-1');
    await store.getState().enableEncryption('pass');
    store.getState().lock();
    store.getState().clearAll();
    expect(store.getState().locked).toBe(false);
    expect(stored()).toEqual({ keys: {} });
  });

  it('以前の形式(平文)のキーをそのまま読み込む', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { keys: { google: 'old' } }, version: 1 }),
    );
    vi.resetModules();
    store = (await import('./apiKeys')).useApiKeyStore;
    expect(store.getState().keys).toEqual({ google: 'old' });
    expect(store.getState().locked).toBe(false);
  });
});
