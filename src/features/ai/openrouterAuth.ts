/**
 * 「OpenRouter でログイン」(OAuth PKCE)。サーバーなしでユーザー自身の API キーを受け取る。
 * 1. code_verifier を作って保存し、OpenRouter の認可ページへ移動する
 * 2. 戻ってきた URL の ?code= と保存した code_verifier を送り、API キーを受け取る
 */
const AUTH_URL = 'https://openrouter.ai/auth';
const KEY_URL = 'https://openrouter.ai/api/v1/auth/keys';
const STORAGE_KEY = 'timeparagraph:openrouter-pkce';
/** 認可ページから戻るまでの有効期限 */
const PKCE_TTL_MS = 15 * 60 * 1000;

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createCodeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** 戻り先。ハッシュ(#/settings など)を除いたアプリの URL */
export function callbackUrl(loc: Pick<Location, 'origin' | 'pathname'> = location): string {
  return `${loc.origin}${loc.pathname}`;
}

/** 認可ページへ移動する(戻ってくると handleOpenRouterCallback が処理する) */
export async function startOpenRouterLogin() {
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier, createdAt: Date.now() }));
  const params = new URLSearchParams({
    callback_url: callbackUrl(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  location.assign(`${AUTH_URL}?${params}`);
}

export type CallbackResult =
  { status: 'none' } | { status: 'success'; key: string } | { status: 'error'; message: string };

/**
 * 起動時に呼ぶ。URL に ?code= があり、このアプリが始めたログインなら API キーと交換する。
 * 処理後は URL から code を取り除く(再読み込みで二重に使わないように)。
 */
export async function handleOpenRouterCallback(
  fetchImpl: typeof fetch = fetch,
): Promise<CallbackResult> {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  if (!code) return { status: 'none' };

  let saved: { verifier?: string; createdAt?: number } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    saved = null;
  }
  // このアプリが始めたログインでなければ触らない
  if (!saved?.verifier) return { status: 'none' };

  localStorage.removeItem(STORAGE_KEY);
  url.searchParams.delete('code');
  // 画面の移動はルーター側で行う(ここでは URL から code を消すだけ)
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

  if (!saved.createdAt || Date.now() - saved.createdAt > PKCE_TTL_MS)
    return { status: 'error', message: 'ログインの有効期限が切れました。もう一度お試しください。' };

  try {
    const res = await fetchImpl(KEY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: saved.verifier,
        code_challenge_method: 'S256',
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = (await res.json()) as { key?: unknown };
    if (typeof json.key !== 'string' || !json.key)
      throw new Error('API キーを受け取れませんでした');
    return { status: 'success', key: json.key };
  } catch (e) {
    return {
      status: 'error',
      message: `OpenRouter のログインに失敗しました: ${e instanceof Error ? e.message : e}`,
    };
  }
}
