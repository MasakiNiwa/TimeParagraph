import {
  Accordion,
  Anchor,
  Badge,
  Code,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { loadLicenses, type LicenseEntry } from './licenses';

export function Credits() {
  const [entries, setEntries] = useState<LicenseEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadLicenses().then(setEntries, () => setError(true));
  }, []);

  if (error) return <Text c="red">ライセンス情報を読み込めませんでした。</Text>;
  if (!entries) return <Loader size="sm" />;

  return (
    <Stack gap="sm">
      <Text size="sm">
        このアプリは以下のオープンソースソフトウェアを利用しています。開発者の皆様に感謝いたします。
        一覧は{' '}
        <Anchor href={`${import.meta.env.BASE_URL}THIRD_PARTY_LICENSES.txt`} target="_blank">
          THIRD_PARTY_LICENSES.txt
        </Anchor>{' '}
        でも確認できます。
      </Text>
      <Accordion multiple defaultValue={[]} variant="contained">
        {entries.map((e) => (
          <Accordion.Item key={`${e.name}@${e.version}`} value={`${e.name}@${e.version}`}>
            <Accordion.Control>
              <Group gap="xs" wrap="nowrap" justify="space-between" pr="xs">
                <Text size="sm" truncate>
                  {e.name}{' '}
                  <Text span size="xs" c="dimmed">
                    v{e.version}
                  </Text>
                </Text>
                <Badge variant="light" size="sm" style={{ flexShrink: 0 }}>
                  {e.license}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {e.author && <Text size="xs">作者: {e.author}</Text>}
                {e.url && (
                  <Anchor href={e.url} target="_blank" rel="noopener noreferrer" size="xs">
                    {e.url}
                  </Anchor>
                )}
                {e.text ? (
                  <ScrollArea.Autosize mah={240}>
                    <Code block style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
                      {e.text}
                    </Code>
                  </ScrollArea.Autosize>
                ) : (
                  <Text size="xs" c="dimmed">
                    ライセンス本文はパッケージに同梱されていません({e.license})。
                  </Text>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
