import { z } from 'zod';

/**
 * 生体認証(Web Authentication API)で API キーのロックを解除する仕組み。
 *
 * WebAuthn の「本人確認できた」という結果だけでは保存データを守れないため、PRF 拡張を使う。
 * PRF は認証器(指紋・顔認証などの端末の機能)の中だけにある秘密から、入力(salt)に応じた
 * 32 バイトの値を計算する。この値から AES-GCM の鍵を作り、パスフレーズを暗号化して保存する。
 * 解除時は生体認証で同じ値を計算し直してパスフレーズを取り出し、通常どおり復号する。
 */

export const BioSchema = z.object({
  v: z.literal(1),
  credentialId: z.string(),
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
});
export type Bio = z.infer<typeof BioSchema>;

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** このブラウザが WebAuthn に対応しているか(PRF に対応しているかは登録してみるまで分からない) */
export function biometricAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

export class BiometricError extends Error {}

interface PrfResults {
  prf?: { enabled?: boolean; results?: { first?: BufferSource } };
}

function prfOutput(cred: PublicKeyCredential | null): Uint8Array | null {
  const ext = cred?.getClientExtensionResults() as PrfResults | undefined;
  const first = ext?.prf?.results?.first;
  if (!first) return null;
  // instanceof ArrayBuffer は別の realm の値で偽になるため、isView で判定する
  const bytes = ArrayBuffer.isView(first)
    ? new Uint8Array(first.buffer, first.byteOffset, first.byteLength)
    : new Uint8Array(first);
  // PRF の出力は 32 バイト。短すぎる値は鍵にしない
  return bytes.length >= 16 ? bytes : null;
}

/** PRF の出力から暗号鍵を作る(HKDF-SHA256) */
async function keyFromPrf(prf: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', prf as BufferSource, 'HKDF', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('timeparagraph:api-key-unlock'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** 登録済みの認証器で PRF の値を計算する(ここで生体認証が求められる) */
async function evaluatePrf(credentialId: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  let cred: PublicKeyCredential | null;
  try {
    cred = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: 'public-key', id: credentialId as BufferSource }],
        userVerification: 'required',
        timeout: 60_000,
        extensions: {
          prf: { eval: { first: salt as BufferSource } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (e) {
    throw new BiometricError(
      e instanceof DOMException && e.name === 'NotAllowedError'
        ? '生体認証がキャンセルされたか、時間切れになりました(この端末に登録した認証情報がない場合も同じ表示になります)。'
        : `生体認証に失敗しました(${e instanceof Error ? e.message : String(e)})`,
    );
  }
  const out = prfOutput(cred);
  if (!out)
    throw new BiometricError('この端末・ブラウザの認証器は、鍵の作成(PRF)に対応していません。');
  return out;
}

/**
 * 生体認証を登録し、パスフレーズをその認証器でしか取り出せない形で暗号化する。
 * 端末によっては登録とは別に、もう一度認証が求められる。
 */
export async function registerBiometric(passphrase: string): Promise<Bio> {
  if (!biometricAvailable())
    throw new BiometricError('このブラウザは生体認証(WebAuthn)に対応していません。');
  const salt = random(32);
  let cred: PublicKeyCredential | null;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'TimeParagraph' },
        user: { id: random(16), name: 'TimeParagraph', displayName: 'TimeParagraph の API キー' },
        challenge: random(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (e) {
    throw new BiometricError(
      e instanceof DOMException && e.name === 'NotAllowedError'
        ? '登録がキャンセルされたか、時間切れになりました。'
        : `生体認証の登録に失敗しました(${e instanceof Error ? e.message : String(e)})`,
    );
  }
  if (!cred) throw new BiometricError('生体認証の登録に失敗しました。');
  const credentialId = new Uint8Array(cred.rawId);
  const ext = cred.getClientExtensionResults() as PrfResults;
  if (ext.prf?.enabled === false || (!ext.prf && !prfOutput(cred)))
    throw new BiometricError(
      'この端末・ブラウザの認証器は、鍵の作成(PRF)に対応していないため使えません。パスフレーズで解除してください。',
    );
  // 登録時に値が返らない認証器では、続けて認証して計算する
  const prf = prfOutput(cred) ?? (await evaluatePrf(credentialId, salt));
  const key = await keyFromPrf(prf);
  const iv = random(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(passphrase),
  );
  return {
    v: 1,
    credentialId: toB64(credentialId),
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(data)),
  };
}

/** 生体認証でパスフレーズを取り出す */
export async function unlockWithBiometric(bio: Bio): Promise<string> {
  const prf = await evaluatePrf(fromB64(bio.credentialId), fromB64(bio.salt));
  const key = await keyFromPrf(prf);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(bio.iv) as BufferSource },
      key,
      fromB64(bio.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new BiometricError(
      '生体認証の情報が一致しません。パスフレーズで解除し、登録し直してください。',
    );
  }
}
