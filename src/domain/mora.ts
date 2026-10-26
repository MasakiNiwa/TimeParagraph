/**
 * モーラ(拍)数の計算。日本語の発話時間は文字数よりモーラ数に比例するため、
 * 文字数ベースより精度の高い推定ができる。
 */

const SMALL_KANA = /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮㇰ-ㇿ]/u;
const KANA = /[ぁ-ゖァ-ヺーヽヾゝゞ]/u;
const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヵヶ]/u;
const DIGIT = /[0-9\uff10-\uff19]/u;
const LATIN = /[A-Za-z\uff21-\uff3a\uff41-\uff5a]/u;
/** 読点など短い間(1 拍相当) */
const SHORT_PAUSE = /[、,\uff0c・:;\uff1a\uff1b]/u;
/** 句点など長めの間(2 拍相当) */
const LONG_PAUSE = /[。.\uff0e!?\uff01\uff1f…]/u;

/** 区切り記号を間の長さ(拍)に換算する */
export function punctuationMora(ch: string): number {
  if (LONG_PAUSE.test(ch)) return 2;
  if (SHORT_PAUSE.test(ch)) return 1;
  return 0;
}

/** カナ文字列のモーラ数(拗音の小書き文字は前の文字と合わせて 1 拍) */
export function countKanaMora(kana: string): number {
  let n = 0;
  for (const ch of kana) {
    if (SMALL_KANA.test(ch)) continue;
    if (KANA.test(ch)) n += 1;
    else n += punctuationMora(ch);
  }
  return n;
}

/**
 * 辞書を使わない簡易推定。漢字は平均的な読みの長さ(約 1.8 拍)で換算する。
 * 英数字は読み方が多様なため概算。
 */
export function estimateMoraHeuristic(text: string): number {
  let n = 0;
  let latinRun = 0;
  const flushLatin = () => {
    // 英単語はおおよそ 1 文字 0.7 拍(例: meeting → ミーティング 5 拍)
    if (latinRun > 0) n += Math.max(1, latinRun * 0.7);
    latinRun = 0;
  };
  for (const ch of text) {
    if (LATIN.test(ch)) {
      latinRun++;
      continue;
    }
    flushLatin();
    if (SMALL_KANA.test(ch)) continue;
    if (KANA.test(ch)) n += 1;
    else if (KANJI.test(ch)) n += 1.8;
    else if (DIGIT.test(ch)) n += 1.5;
    else n += punctuationMora(ch);
  }
  flushLatin();
  return Math.round(n * 10) / 10;
}

/** 形態素解析のトークン(必要な情報だけ) */
export interface MorphToken {
  surface: string;
  pos: string;
  /** 発音(カタカナ)。不明なら undefined */
  pronunciation?: string;
  reading?: string;
}

/** 形態素解析結果からモーラ数を数える。読みのない語は簡易推定で補う */
export function countMoraFromTokens(tokens: MorphToken[]): number {
  let n = 0;
  for (const t of tokens) {
    const yomi = [t.pronunciation, t.reading].find((y) => y && y !== '*');
    if (yomi) n += countKanaMora(yomi);
    else if (t.pos === '記号') n += [...t.surface].reduce((a, c) => a + punctuationMora(c), 0);
    else n += estimateMoraHeuristic(t.surface);
  }
  return Math.round(n * 10) / 10;
}
