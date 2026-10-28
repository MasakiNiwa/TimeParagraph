import { Badge, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { useApiKeyStore } from './apiKeys';

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
