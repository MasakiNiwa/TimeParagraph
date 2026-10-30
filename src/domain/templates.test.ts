import { describe, expect, it } from 'vitest';
import { createBlock } from './document';
import { getRole } from './roles';
import { blocksToTemplate, builtInTemplates, TemplateSchema, templateToBlocks } from './templates';

describe('templates', () => {
  it('組み込みテンプレートはすべて有効で、使っているタイプが定義済み', () => {
    for (const t of builtInTemplates) {
      expect(TemplateSchema.safeParse(t).success).toBe(true);
      for (const item of t.items) if (item.role) expect(getRole(item.role)).toBeDefined();
    }
  });

  it('テンプレートから、見出しと案内つきの空の段落を作る', () => {
    const blocks = templateToBlocks(builtInTemplates.find((t) => t.id === 'prep')!);
    expect(blocks.map((b) => [b.kind, b.role, b.text])).toEqual([
      ['paragraph', 'claim', ''],
      ['paragraph', 'reason', ''],
      ['paragraph', 'example', ''],
      ['paragraph', 'summary', ''],
    ]);
    expect(blocks[0].hint).toContain('結論');
    expect(new Set(blocks.map((b) => b.id)).size).toBe(4);
  });

  it('タイプの既定の案内を使う', () => {
    const lecture = templateToBlocks(builtInTemplates.find((t) => t.id === 'lecture')!);
    expect(lecture[1].hint).toBe(getRole('intro')!.hint);
  });

  it('原稿の構成をテンプレートにする(本文は含めない)', () => {
    const t = blocksToTemplate(
      [
        createBlock({ kind: 'heading', text: '導入', role: 'intro' }),
        createBlock({ text: '秘密の本文', role: 'claim' }),
        createBlock({ text: '' }),
        createBlock({ text: 'タイプなしの本文' }),
        createBlock({ title: '要点のメモ', role: 'reason' }),
      ],
      'マイ構成',
      'my',
    );
    expect(t.items).toEqual([
      { kind: 'heading', text: '導入', role: 'intro', hint: '' },
      { kind: 'paragraph', text: '', role: 'claim', hint: '' },
      { kind: 'paragraph', text: '', role: null, hint: '' },
      { kind: 'paragraph', text: '要点のメモ', role: 'reason', hint: '' },
    ]);
    expect(JSON.stringify(t)).not.toContain('秘密');
    expect(templateToBlocks(t)[3].title).toBe('要点のメモ');
  });
});
