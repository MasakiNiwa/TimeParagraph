import { Badge, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { IconFingerprint, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { useApiKeyStore } from './apiKeys';
import { biometricAvailable } from './biometric';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 生体認証で解除するボタン(登録済みのときだけ表示) */
function BiometricUnlockButton() {
  const hasBio = useApiKeyStore((s) => s.bio !== null);
  const unlockWithBiometric = useApiKeyStore((s) => s.unlockWithBiometric);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!hasBio || !biometricAvailable()) return null;
  return (
    <Stack gap={4}>
      <Button
        variant="light"
        leftSection={<IconFingerprint size={18} />}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await unlockWithBiometric();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        生体認証で解除
      </Button>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
      <Text size="xs" c="dimmed" ta="center">
        または、パスフレーズを入力
      </Text>
    </Stack>
  );
}

/** 設定ページ: 生体認証の登録・解除 */
function BiometricSettings() {
  const hasBio = useApiKeyStore((s) => s.bio !== null);
  const { enableBiometric, disableBiometric } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!biometricAvailable()) return null;

  if (hasBio)
    return (
      <Group gap="xs">
        <Badge size="sm" variant="light" color="teal" leftSection={<IconFingerprint size={12} />}>
          生体認証で解除できます
        </Badge>
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          onClick={() => {
            if (
              window.confirm('生体認証での解除をやめますか?(パスフレーズでは引き続き解除できます)')
            )
              disableBiometric();
          }}
        >
          生体認証をやめる
        </Button>
      </Group>
    );

  if (!open)
    return (
      <Group>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconFingerprint size={14} />}
          onClick={() => setOpen(true)}
        >
          生体認証で解除できるようにする
        </Button>
      </Group>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || busy) return;
    setBusy(true);
    setError(null);
    try {
      await enableBiometric(pass);
      setOpen(false);
      setPass('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          指紋・顔認証・端末の PIN
          など、この端末の認証(パスキー)で解除できるようにします。確認のため、今のパスフレーズを入力してください。対応していない端末・ブラウザもあります。
        </Text>
        <PasswordInput
          label="今のパスフレーズ"
          value={pass}
          onChange={(e) => {
            setPass(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          autoComplete="current-password"
          autoFocus
        />
        <Group gap="xs">
          <Button type="submit" size="xs" loading={busy} disabled={!pass}>
            登録する
          </Button>
          <Button size="xs" variant="subtle" color="gray" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** ロックを解除するフォーム。設定ページと AI ページで使う */
export function UnlockForm({ autoFocus }: { autoFocus?: boolean }) {
  const unlock = useApiKeyStore((s) => s.unlock);
  const clearAll = useApiKeyStore((s) => s.clearAll);
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || busy) return;
    setBusy(true);
    const ok = await unlock(pass);
    setBusy(false);
    if (ok) setPass('');
    else setError('パスフレーズが違います');
  };

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Stack gap={6}>
        <BiometricUnlockButton />
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <PasswordInput
            style={{ flex: 1 }}
            placeholder="パスフレーズ"
            aria-label="パスフレーズ"
            value={pass}
            onChange={(e) => {
              setPass(e.currentTarget.value);
              setError(null);
            }}
            error={error}
            autoComplete="current-password"
            autoFocus={autoFocus}
          />
          <Button type="submit" loading={busy} leftSection={<IconLockOpen size={16} />}>
            解除
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          パスフレーズを忘れた場合は、
          <Text
            component="button"
            type="button"
            size="xs"
            c="red"
            td="underline"
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            onClick={() => {
              if (
                window.confirm(
                  '暗号化した API キーを削除しますか?キーはもう一度登録し直してください。',
                )
              )
                clearAll();
            }}
          >
            キーを削除して登録し直してください
          </Text>
          。
        </Text>
      </Stack>
    </form>
  );
}

/** 新しいパスフレーズを 2 回入力するフォーム */
function NewPassphraseForm({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  onSubmit: (passphrase: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && pass !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || pass !== confirm || busy) return;
    setBusy(true);
    try {
      await onSubmit(pass);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Stack gap="xs">
        <PasswordInput
          label="パスフレーズ"
          value={pass}
          onChange={(e) => setPass(e.currentTarget.value)}
          autoComplete="new-password"
          autoFocus
        />
        <PasswordInput
          label="パスフレーズ(確認)"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          error={mismatch ? '同じパスフレーズを入力してください' : null}
          autoComplete="new-password"
        />
        <Group gap="xs">
          <Button type="submit" size="xs" loading={busy} disabled={!pass || pass !== confirm}>
            {submitLabel}
          </Button>
          <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
            キャンセル
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** 設定ページ: API キーをパスフレーズで暗号化する */
export function KeyEncryption() {
  const vault = useApiKeyStore((s) => s.vault);
  const locked = useApiKeyStore((s) => s.locked);
  const { enableEncryption, changePassphrase, disableEncryption, lock } = useApiKeyStore();
  const [mode, setMode] = useState<'none' | 'enable' | 'change'>('none');

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" fw={500}>
          API キーの暗号化
        </Text>
        {vault ? (
          <Badge size="sm" variant="light" color="teal" leftSection={<IconLock size={12} />}>
            {locked ? 'ロック中' : '暗号化して保存中'}
          </Badge>
        ) : (
          <Badge size="sm" variant="light" color="gray">
            オフ
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        {
          'パスフレーズで暗号化して保存します(任意)。ページを開くたびにパスフレーズの入力が必要になります。パスフレーズはどこにも保存されないため、忘れるとキーは取り出せません。'
        }
      </Text>

      {locked ? (
        <UnlockForm />
      ) : mode !== 'none' ? (
        <NewPassphraseForm
          submitLabel={mode === 'enable' ? '暗号化する' : '変更する'}
          onCancel={() => setMode('none')}
          onSubmit={async (p) => {
            await (mode === 'enable' ? enableEncryption(p) : changePassphrase(p));
            setMode('none');
          }}
        />
      ) : vault ? (
        <Stack gap="xs">
          <Group gap="xs">
            <Button size="xs" variant="light" leftSection={<IconLock size={14} />} onClick={lock}>
              今すぐロック
            </Button>
            <Button size="xs" variant="default" onClick={() => setMode('change')}>
              パスフレーズを変更
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                if (window.confirm('暗号化をやめて、API キーをそのまま保存しますか?'))
                  disableEncryption();
              }}
            >
              暗号化をやめる
            </Button>
          </Group>
          <BiometricSettings />
        </Stack>
      ) : (
        <Group>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconLock size={14} />}
            onClick={() => setMode('enable')}
          >
            パスフレーズで暗号化する
          </Button>
        </Group>
      )}
    </Stack>
  );
}
