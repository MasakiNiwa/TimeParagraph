import { z } from 'zod';

/**
 * API キーをパスフレーズで暗号化して保存するための小さな仕組み。
 * パスフレーズから PBKDF2(SHA-256)で鍵を作り、AES-GCM で暗号化する(Web Crypto API)。
 * パスフレーズ自体はどこにも保存しない。
 */

export const VaultSchema = z.object({
  v: z.literal(1),
  /** PBKDF2 の反復回数 */
  iter: z.number().int().positive(),
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
});
export type Vault = z.infer<typeof VaultSchema>;

/** OWASP の推奨値(PBKDF2-HMAC-SHA256) */
export const DEFAULT_ITERATIONS = 600_000;

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** パスフレーズから暗号鍵を作る。鍵は取り出せない(non-extractable)形でメモリにだけ持つ */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface VaultKey {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
}

export async function createVaultKey(
  passphrase: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<VaultKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await deriveKey(passphrase, salt, iterations), salt, iterations };
}

/** 値を暗号化する。毎回新しい IV を使う */
export async function sealVault(vk: VaultKey, value: unknown): Promise<Vault> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vk.key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return {
    v: 1,
    iter: vk.iterations,
    salt: toB64(vk.salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(data)),
  };
}

/** 復号する。パスフレーズが違う(または壊れている)ときは null */
export async function openVault(
  vault: Vault,
  passphrase: string,
): Promise<{ value: unknown; vk: VaultKey } | null> {
  const salt = fromB64(vault.salt);
  const key = await deriveKey(passphrase, salt, vault.iter);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(vault.iv) as BufferSource },
      key,
      fromB64(vault.data) as BufferSource,
    );
    return {
      value: JSON.parse(new TextDecoder().decode(plain)),
      vk: { key, salt, iterations: vault.iter },
    };
  } catch {
    return null;
  }
}
