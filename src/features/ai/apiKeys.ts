import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createVaultKey,
  openVault,
  sealVault,
  VaultSchema,
  type Vault,
  type VaultKey,
} from './keyVault';
import type { AiProviderId } from './providers';
import {
  BioSchema,
  BiometricError,
  registerBiometric,
  unlockWithBiometric,
  type Bio,
} from './biometric';

type Keys = Partial<Record<AiProviderId, string>>;

/**
 * API キー。このブラウザの localStorage にだけ保存し、各 AI サービスへ直接送信する。
 * 設定(settings)とは分けて保存し、設定の書き出しなどに含まれないようにしている。
 *
 * 任意でパスフレーズによる暗号化ができる。暗号化中は暗号文(vault)だけを保存し、
 * 平文のキーはロックを解除したあとメモリ上にだけ持つ(ページを開き直すと再びロックされる)。
 */
interface ApiKeyState {
  /** 使えるキー(暗号化中でロックされているときは空) */
  keys: Keys;
  /** 暗号化して保存したキー。null なら平文で保存している */
  vault: Vault | null;
  /** 暗号化されていて、まだロックを解除していない */
  locked: boolean;
  /** ロック中に受け取ったキー(OpenRouter のログインなど)。解除したときに保存する */
  pending: Keys;
  setKey: (provider: AiProviderId, key: string) => void;
  clearAll: () => void;
  enableEncryption: (passphrase: string) => Promise<void>;
  /** パスフレーズが違うときは false */
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  changePassphrase: (passphrase: string) => Promise<void>;
  disableEncryption: () => void;
  /** 生体認証で解除するための情報(暗号化したパスフレーズ)。null なら未登録 */
  bio: Bio | null;
  /** 生体認証を登録する。パスフレーズが違うときは BiometricError */
  enableBiometric: (passphrase: string) => Promise<void>;
  disableBiometric: () => void;
  /** 生体認証で解除する。失敗したときは BiometricError */
  unlockWithBiometric: () => Promise<void>;
}

const KeysSchema = z.record(z.string(), z.string());

/** 解除中の暗号鍵。取り出せない形で、メモリにだけ持つ */
let vaultKey: VaultKey | null = null;
/** 暗号化の書き込みを順番に行う */
let sealing: Promise<void> = Promise.resolve();

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set, get) => {
      /** 今のキーを暗号化し直して保存する */
      const reseal = () => {
        sealing = sealing
          .then(async () => {
            const vk = vaultKey;
            if (!vk || !get().vault) return;
            const vault = await sealVault(vk, get().keys);
            // 待っている間にロック・暗号化の解除・鍵の変更があったら書き込まない
            if (vaultKey === vk && get().vault) set({ vault });
          })
          .catch(() => undefined);
        return sealing;
      };

      return {
        keys: {},
        vault: null,
        locked: false,
        pending: {},
        bio: null,
        setKey: (provider, key) => {
          const value = key.trim();
          if (get().locked) {
            set((s) => ({ pending: { ...s.pending, [provider]: value } }));
            return;
          }
          set((s) => ({ keys: { ...s.keys, [provider]: value } }));
          if (get().vault) void reseal();
        },
        clearAll: () => {
          vaultKey = null;
          set({ keys: {}, vault: null, locked: false, pending: {}, bio: null });
        },
        enableEncryption: async (passphrase) => {
          const vk = await createVaultKey(passphrase);
          const vault = await sealVault(vk, get().keys);
          vaultKey = vk;
          set({ vault, locked: false });
        },
        unlock: async (passphrase) => {
          const vault = get().vault;
          if (!vault) return true;
          const opened = await openVault(vault, passphrase);
          const parsed = KeysSchema.safeParse(opened?.value);
          if (!opened || !parsed.success) return false;
          vaultKey = opened.vk;
          const pending = get().pending;
          set({ keys: { ...(parsed.data as Keys), ...pending }, locked: false, pending: {} });
          if (Object.keys(pending).length > 0) await reseal();
          return true;
        },
        lock: () => {
          if (!get().vault) return;
          vaultKey = null;
          set({ keys: {}, locked: true });
        },
        changePassphrase: async (passphrase) => {
          if (get().locked || !get().vault) return;
          vaultKey = await createVaultKey(passphrase);
          // 生体認証は古いパスフレーズを暗号化しているので、登録し直してもらう
          set({ bio: null });
          await reseal();
        },
        disableEncryption: () => {
          if (get().locked) return;
          vaultKey = null;
          set({ vault: null, bio: null });
        },
        enableBiometric: async (passphrase) => {
          const vault = get().vault;
          if (!vault || get().locked) return;
          // 登録する前に、パスフレーズが正しいことを確かめる
          if (!(await openVault(vault, passphrase)))
            throw new BiometricError('パスフレーズが違います。');
          const bio = await registerBiometric(passphrase);
          if (get().vault) set({ bio });
        },
        disableBiometric: () => set({ bio: null }),
        unlockWithBiometric: async () => {
          const bio = get().bio;
          if (!bio) throw new BiometricError('生体認証が登録されていません。');
          const passphrase = await unlockWithBiometric(bio);
          if (!(await get().unlock(passphrase)))
            throw new BiometricError(
              '生体認証の情報が古くなっています。パスフレーズで解除し、登録し直してください。',
            );
        },
      };
    },
    {
      name: 'timeparagraph:ai-keys',
      version: 2,
      // 暗号化中は暗号文だけを保存する
      partialize: (s): Partial<ApiKeyState> =>
        s.vault ? { vault: s.vault, bio: s.bio } : { keys: s.keys },
      migrate: (persisted) => persisted as Partial<ApiKeyState>,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { keys?: unknown; vault?: unknown; bio?: unknown };
        const vault = VaultSchema.safeParse(p.vault);
        const bio = BioSchema.safeParse(p.bio);
        if (vault.success)
          return {
            ...current,
            vault: vault.data,
            bio: bio.success ? bio.data : null,
            keys: {},
            locked: true,
          };
        const keys = KeysSchema.safeParse(p.keys);
        return { ...current, vault: null, keys: keys.success ? (keys.data as Keys) : {} };
      },
    },
  ),
);
