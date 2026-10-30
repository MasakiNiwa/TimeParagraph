import { blockLabel, type Block } from './document';
import type { DocumentEstimate } from './estimate';
import { splitSentences } from './sentences';

/**
 * パラグラフライティングの点検。
 * - 1 つの段落では 1 つのトピックだけを話す
 * - 段落の最初の文(トピックセンテンス)で、その段落の要点を言い切る
 * - 続く文(サポート)で、要点を説明・具体化する
 * - 最初の文だけを順に読んでも(縦読み)、話の筋が通るようにする
 * 判定は目安で、話し方に合わせて調整できるよう、しきい値をまとめておく。
 */
export const PW_LIMITS = {
  /** トピックセンテンスの長さの目安(字)。これより長いと要点がぼやけやすい */
  topicChars: 60,
  /** 1 段落の文の数の目安。これより多いと複数のトピックが混ざりやすい */
  maxSentences: 7,
  /** 1 段落の長さの目安(秒)。聞き手が 1 つの要点として受け取れる長さ */
  maxSec: 90,
} as const;

export type PwIssueKind =
  'no-title' | 'long-topic' | 'single-sentence' | 'too-many-sentences' | 'too-long';

export const PW_ISSUE_LABELS: Record<PwIssueKind, string> = {
  'no-title': '要点(タイトル)が未設定',
  'long-topic': '最初の文が長い',
  'single-sentence': '説明の文がない',
  'too-many-sentences': '文が多い',
  'too-long': '段落が長い',
};

export const PW_ISSUE_HINTS: Record<PwIssueKind, string> = {
  'no-title': 'この段落で言いたいことを一言でタイトルに書くと、トピックがぶれにくくなります。',
  'long-topic': `最初の文は ${PW_LIMITS.topicChars} 字程度までに。要点だけを先に言い切り、説明は次の文へ回します。`,
  'single-sentence': '要点を支える説明・理由・具体例の文を足すか、前後の段落とまとめます。',
  'too-many-sentences': '複数のトピックが混ざっていないか確認し、必要なら段落を分けます。',
  'too-long': `${PW_LIMITS.maxSec} 秒を超える段落は、聞き手が要点を見失いやすくなります。分割を検討します。`,
};

export interface ParagraphCheck {
  blockId: string;
  /** 段落の通し番号(1 始まり) */
  index: number;
  label: string;
  title: string;
  /** 最初の文 */
  topic: string;
  sentenceCount: number;
  sec: number;
  issues: PwIssueKind[];
}

/** 段落の最初の文(トピックセンテンス) */
export function topicSentence(text: string): string {
  return splitSentences(text)[0] ?? '';
}

export function checkParagraphs(blocks: Block[], est: DocumentEstimate): ParagraphCheck[] {
  const out: ParagraphCheck[] = [];
  let index = 0;
  for (const b of blocks) {
    if (b.kind !== 'paragraph') continue;
    index++;
    if (!b.text.trim()) continue;
    const sentences = splitSentences(b.text);
    const topic = sentences[0] ?? '';
    const e = est.byId.get(b.id);
    const sec = e?.speakSec ?? 0;
    const issues: PwIssueKind[] = [];
    if (!b.title.trim()) issues.push('no-title');
    if ([...topic].length > PW_LIMITS.topicChars) issues.push('long-topic');
    if (sentences.length === 1) issues.push('single-sentence');
    if (sentences.length > PW_LIMITS.maxSentences) issues.push('too-many-sentences');
    if (sec > PW_LIMITS.maxSec) issues.push('too-long');
    out.push({
      blockId: b.id,
      index,
      label: blockLabel(b, 20),
      title: b.title.trim(),
      topic,
      sentenceCount: sentences.length,
      sec,
      issues,
    });
  }
  return out;
}

/** 縦読み用のテキスト。見出しと、各段落の要点(タイトル、なければ最初の文)を並べる */
export function skimText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading') {
      if (b.text.trim()) lines.push(`■ ${b.text.trim()}`);
      continue;
    }
    const topic = b.title.trim() || topicSentence(b.text);
    if (topic) lines.push(`・${topic}`);
  }
  return lines.join('\n');
}
