import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callbackUrl,
  createCodeChallenge,
  createCodeVerifier,
  handleOpenRouterCallback,
} from './openrouterAuth';

const STORAGE_KEY = 'timeparagraph:openrouter-pkce';

describe('PKCE', () => {
  it('RFC 7636 の例と同じ code_challenge を作る', async () => {
    expect(await createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('code_verifier は URL に使える 43 文字', () => {
    expect(createCodeVerifier()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('戻り先はハッシュを含まないアプリの URL', () => {
    expect(callbackUrl({ origin: 'https://a.github.io', pathname: '/TimeParagraph/' })).toBe(
      'https://a.github.io/TimeParagraph/',
    );
  });
});

describe('handleOpenRouterCallback', () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, '', '/TimeParagraph/');
  });

  const okFetch = vi.fn(async () => new Response(JSON.stringify({ key: 'sk-or-test' })));

  it('code がなければ何もしない', async () => {
    expect(await handleOpenRouterCallback(okFetch)).toEqual({ status: 'none' });
  });

  it('このアプリが始めたログインでなければ code に触らない', async () => {
    history.replaceState(null, '', '/TimeParagraph/?code=abc');
    expect(await handleOpenRouterCallback(okFetch)).toEqual({ status: 'none' });
    expect(location.search).toBe('?code=abc');
  });

  it('code と code_verifier を送って API キーを受け取り、URL から code を消す', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier: 'v', createdAt: Date.now() }));
    history.replaceState(null, '', '/TimeParagraph/?code=abc');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ key: 'sk-or-test' })));
    expect(await handleOpenRouterCallback(fetchMock)).toEqual({
      status: 'success',
      key: 'sk-or-test',
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      code: 'abc',
      code_verifier: 'v',
      code_challenge_method: 'S256',
    });
    expect(location.search).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('期限切れや失敗はエラーとして返す', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier: 'v', createdAt: 0 }));
    history.replaceState(null, '', '/TimeParagraph/?code=abc');
    expect((await handleOpenRouterCallback(okFetch)).status).toBe('error');

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier: 'v', createdAt: Date.now() }));
    history.replaceState(null, '', '/TimeParagraph/?code=abc');
    const bad = vi.fn(async () => new Response('no', { status: 403, statusText: 'Forbidden' }));
    const r = await handleOpenRouterCallback(bad);
    expect(r).toMatchObject({ status: 'error' });
  });
});
