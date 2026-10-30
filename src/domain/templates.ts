import { z } from 'zod';
import { createBlock, type Block } from './document';
import { getRole } from './roles';

/** 構成テンプレートの 1 項目(見出し、または段落の枠) */
export const TemplateItemSchema = z.object({
  kind: z.enum(['heading', 'paragraph']),
  /** 見出しの文言。段落では段落のタイトル */
  text: z.string().catch(''),
  role: z.string().nullable().catch(null),
  /** 段落に表示する書き方の案内。空ならタイプの既定の案内 */
  hint: z.string().catch(''),
});
export type TemplateItem = z.infer<typeof TemplateItemSchema>;

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().catch(''),
  items: z.array(TemplateItemSchema).min(1),
});
export type Template = z.infer<typeof TemplateSchema>;

const h = (text: string, role: string | null = null): TemplateItem => ({
  kind: 'heading',
  text,
  role,
  hint: '',
});
const p = (role: string, hint = ''): TemplateItem => ({ kind: 'paragraph', text: '', role, hint });

/** 組み込みのテンプレート */
export const builtInTemplates: Template[] = [
  {
    id: 'prep',
    name: 'PREP 法',
    description: '結論 → 理由 → 具体例 → 結論。短い発言・意見表明に',
    items: [
      p('claim', '結論:最初に一番伝えたいことを言い切る'),
      p('reason', '理由:なぜそう言えるのか'),
      p('example', '具体例:理由を裏付ける事例・体験'),
      p('summary', '結論(再):最初の結論をもう一度'),
    ],
  },
  {
    id: 'sds',
    name: 'SDS 法',
    description: '要点 → 詳細 → 要点。報告・説明を手短に',
    items: [
      p('claim', '要点:話の全体像を一言で'),
      p('detail', '詳細:内容を順に説明'),
      p('summary', '要点(再):もう一度まとめる'),
    ],
  },
  {
    id: 'paragraph-writing',
    name: 'パラグラフライティング',
    description: '総論 → 各論(3 つ)→ 結論。各段落は最初の文で要点を言い切る',
    items: [
      h('総論', 'claim'),
      p('claim', '話全体の結論と、これから話す要点の数を最初に言う'),
      h('各論 1', 'detail'),
      p('reason', '最初の文で 1 つ目の要点を言い切り、続けて理由・説明を話す'),
      p('example', '要点を支える具体例・データ'),
      h('各論 2', 'detail'),
      p('reason', '最初の文で 2 つ目の要点を言い切り、続けて理由・説明を話す'),
      p('example', '要点を支える具体例・データ'),
      h('各論 3', 'detail'),
      p('reason', '最初の文で 3 つ目の要点を言い切り、続けて理由・説明を話す'),
      p('example', '要点を支える具体例・データ'),
      h('結論', 'summary'),
      p('summary', '総論の結論をもう一度。各論の要点を短く振り返る'),
      p('action'),
    ],
  },
  {
    id: 'problem-solution',
    name: '問題解決型プレゼン',
    description: '課題 → 原因 → 解決策 → 効果 → 呼びかけ。提案に',
    items: [
      h('はじめに', 'intro'),
      p('intro'),
      p('agenda'),
      h('課題', 'problem'),
      p('problem'),
      p('data', '課題の大きさを示す数字や事実'),
      h('原因', 'reason'),
      p('reason'),
      h('解決策', 'solution'),
      p('solution'),
      p('example', '解決策がうまくいく根拠・事例'),
      p('counter'),
      h('まとめ', 'summary'),
      p('summary'),
      p('action'),
    ],
  },
  {
    id: 'report',
    name: '業務報告',
    description: '結論 → 経緯 → 現状 → 今後。会議での報告に',
    items: [
      h('結論', 'claim'),
      p('claim', '報告の結論(順調/遅れ/相談事項など)'),
      h('経緯', 'detail'),
      p('detail', 'これまでの経緯'),
      h('現状', 'data'),
      p('data', '現在の状況・数字'),
      h('今後', 'action'),
      p('action', '今後の予定・お願いしたいこと'),
    ],
  },
  {
    id: 'lecture',
    name: '講義・研修',
    description: '導入 → 目標 → 本論(3 つ)→ まとめ → 質疑',
    items: [
      h('導入', 'intro'),
      p('intro'),
      p('agenda', '今日のゴールと流れ'),
      h('ポイント 1', 'detail'),
      p('detail'),
      p('example'),
      h('ポイント 2', 'detail'),
      p('detail'),
      p('example'),
      h('ポイント 3', 'detail'),
      p('detail'),
      p('example'),
      h('まとめ', 'summary'),
      p('summary'),
      h('質疑応答', 'qa'),
      p('qa'),
    ],
  },
  {
    id: 'self-intro',
    name: '自己紹介',
    description: '名前・所属 → 経歴 → 得意なこと → ひとこと',
    items: [
      p('intro', '名前・所属'),
      p('detail', 'これまでの経歴・担当していること'),
      p('example', '得意なこと・最近の取り組み(エピソード)'),
      p('action', 'ひとこと(よろしくお願いします、など)'),
    ],
  },
];

/** テンプレートからブロックを作る。段落は空のまま、書き方の案内を付ける */
export function templateToBlocks(t: Template): Block[] {
  return t.items.map((item) =>
    item.kind === 'heading'
      ? createBlock({ kind: 'heading', text: item.text, role: item.role })
      : createBlock({
          title: item.text,
          role: item.role,
          hint: item.hint || getRole(item.role)?.hint || '',
        }),
  );
}

/**
 * 原稿の構成をテンプレートにする。見出しの文言・段落のタイトル・タイプ・案内は残し、段落の本文は含めない。
 * 本文・タイトル・タイプのどれもない段落は省く(構成として意味がないため)。
 */
export function blocksToTemplate(blocks: Block[], name: string, id: string): Template {
  const items: TemplateItem[] = blocks
    .filter((b) => b.kind === 'heading' || b.role || b.title.trim() || b.text.trim())
    .map((b) =>
      b.kind === 'heading'
        ? { kind: 'heading', text: b.text, role: b.role, hint: '' }
        : { kind: 'paragraph', text: b.title, role: b.role, hint: b.hint },
    );
  return { id, name, description: '', items: items.length ? items : [p('detail')] };
}
