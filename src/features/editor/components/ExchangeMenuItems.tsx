import { Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBraces,
  IconClipboardText,
  IconFileDownload,
  IconFileUpload,
  IconMarkdown,
} from '@tabler/icons-react';
import { useRef } from 'react';
import { exportJson, exportMarkdown, exportTimedText, importDocument } from '@/domain/exchange';
import { downloadText, safeFileName } from '@/lib/download';
import { useDocumentStore } from '../documentStore';
import { importAndOpenDocument, runDocumentAction } from '../persistence';
import { useEstimate } from '../useEstimate';

/** 原稿メニューに入れる、書き出し・取り込みの項目 */
export function ExchangeMenuItems() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { estimate } = useEstimate();
  const doc = () => useDocumentStore.getState().doc!;
  const name = () => safeFileName(doc().title);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    let content: string;
    try {
      content = await file.text();
    } catch {
      notifications.show({
        color: 'red',
        message: 'ファイルを読み込めませんでした。もう一度選び直してください。',
      });
      return;
    }
    const r = importDocument(content, file.name);
    if (!r.ok) {
      notifications.show({ color: 'red', message: `取り込めませんでした: ${r.error}` });
      return;
    }
    if (!(await runDocumentAction(() => importAndOpenDocument(r.doc)))) return;
    notifications.show({ message: `「${r.doc.title}」を取り込みました` });
  };

  return (
    <>
      <Menu.Label>書き出し</Menu.Label>
      <Menu.Item
        leftSection={<IconMarkdown size={16} />}
        onClick={() => downloadText(`${name()}.md`, exportMarkdown(doc()), 'text/markdown')}
      >
        Markdown(.md)
      </Menu.Item>
      <Menu.Item
        leftSection={<IconFileDownload size={16} />}
        onClick={() => downloadText(`${name()}_時間つき.txt`, exportTimedText(doc(), estimate))}
      >
        時間つきテキスト(.txt)
      </Menu.Item>
      <Menu.Item
        leftSection={<IconBraces size={16} />}
        onClick={() =>
          downloadText(`${name()}.timeparagraph.json`, exportJson(doc()), 'application/json')
        }
      >
        バックアップ(.json)
      </Menu.Item>
      <Menu.Item
        leftSection={<IconClipboardText size={16} />}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(exportTimedText(doc(), estimate));
            notifications.show({ message: '時間つきテキストをコピーしました' });
          } catch {
            notifications.show({
              color: 'red',
              message: 'コピーできませんでした。時間つきテキストの書き出しをご利用ください。',
            });
          }
        }}
      >
        時間つきテキストをコピー
      </Menu.Item>
      <Menu.Label>取り込み</Menu.Label>
      <Menu.Item
        leftSection={<IconFileUpload size={16} />}
        closeMenuOnClick={false}
        onClick={() => fileRef.current?.click()}
      >
        ファイルから取り込む(.md / .txt / .json)
      </Menu.Item>
      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt,.json,text/plain,text/markdown,application/json"
        hidden
        onChange={(e) => {
          void onFile(e.currentTarget.files?.[0]);
          e.currentTarget.value = '';
        }}
      />
    </>
  );
}
