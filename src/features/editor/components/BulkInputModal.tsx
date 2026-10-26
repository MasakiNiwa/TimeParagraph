import { Button, Group, Modal, SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';
import { textToBlocks } from '@/domain/document';
import { useDocumentStore } from '../documentStore';

export function BulkInputModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const blocks = textToBlocks(text);

  const apply = () => {
    const s = useDocumentStore.getState();
    if (!s.doc || blocks.length === 0) return;
    if (mode === 'replace') {
      s.setBlocks(blocks);
    } else {
      // 空の段落は取り除いてから末尾に追加する
      const kept = s.doc.blocks.filter((b) => b.kind !== 'paragraph' || b.text.trim() !== '');
      s.setBlocks([...kept, ...blocks]);
    }
    setText('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="テキストから一括入力" size="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          空行で区切ると別のパラグラフになります。「# 」で始まる行は見出しになります。
        </Text>
        <Textarea
          autosize
          minRows={8}
          maxRows={16}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder={'# はじめに\n本日はお集まりいただき…\n\n今日お話しするのは…'}
          data-autofocus
        />
        <Group justify="space-between">
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as 'append' | 'replace')}
            data={[
              { value: 'append', label: '末尾に追加' },
              { value: 'replace', label: '置き換え' },
            ]}
          />
          <Text size="sm" c="dimmed">
            {blocks.length} ブロック
          </Text>
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={apply} disabled={blocks.length === 0}>
            取り込む
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
