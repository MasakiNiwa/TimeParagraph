import { Group, Loader, SegmentedControl } from '@mantine/core';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useDocumentStore } from '@/features/editor/documentStore';
import { stop } from '@/features/speech/speechStore';
import { RehearsalPanel } from './RehearsalPanel';
import { SpeechPanel } from './SpeechPanel';

type Mode = 'speech' | 'rehearsal';

export function PracticePage() {
  const doc = useDocumentStore((s) => s.doc);
  const [mode, setMode] = useState<Mode>('rehearsal');

  if (!doc) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <PageContainer title={doc.title || '無題の原稿'}>
      <SegmentedControl
        value={mode}
        onChange={(v) => {
          stop();
          setMode(v as Mode);
        }}
        data={[
          { value: 'rehearsal', label: 'リハーサル(計測)' },
          { value: 'speech', label: '読み上げ' },
        ]}
        fullWidth
      />
      {mode === 'speech' ? <SpeechPanel /> : <RehearsalPanel />}
    </PageContainer>
  );
}
