/**
 * 段落・見出しの「内容のタイプ」。構成を見える化し、テンプレートや AI への指示に使う。
 * 色は Mantine のカラー名。id は保存データに残るので変えないこと。
 */
export interface RoleDef {
  id: string;
  label: string;
  color: string;
  /** 空の段落に表示する書き方の案内 */
  hint: string;
}

export const roles: RoleDef[] = [
  { id: 'intro', label: '導入', color: 'blue', hint: '聞き手を引き込む一言や、今日の話の概要' },
  { id: 'agenda', label: '予告', color: 'cyan', hint: 'これから話す流れ・ポイントの数' },
  { id: 'problem', label: '問題提起', color: 'orange', hint: '聞き手が抱えている課題や疑問' },
  { id: 'claim', label: '結論・主張', color: 'red', hint: '一番伝えたいことを一言で' },
  { id: 'reason', label: '理由', color: 'grape', hint: 'なぜそう言えるのか' },
  { id: 'example', label: '具体例', color: 'teal', hint: '体験談・事例・たとえ話' },
  { id: 'data', label: 'データ', color: 'indigo', hint: '数字・調査結果・根拠となる事実' },
  { id: 'detail', label: '詳細・説明', color: 'gray', hint: '手順・仕組み・補足の説明' },
  {
    id: 'counter',
    label: '反論への対応',
    color: 'pink',
    hint: '予想される疑問・反対意見と、その答え',
  },
  { id: 'solution', label: '解決策', color: 'green', hint: '課題に対する具体的な打ち手' },
  { id: 'transition', label: 'つなぎ', color: 'gray', hint: '次の話題への橋渡し' },
  { id: 'summary', label: 'まとめ', color: 'violet', hint: '要点の振り返り' },
  { id: 'action', label: '呼びかけ', color: 'yellow', hint: '聞き手にしてほしい次の行動' },
  { id: 'qa', label: '質疑応答', color: 'lime', hint: '想定される質問と回答' },
];

const byId = new Map(roles.map((r) => [r.id, r]));

export function getRole(id: string | null | undefined): RoleDef | undefined {
  return id ? byId.get(id) : undefined;
}
