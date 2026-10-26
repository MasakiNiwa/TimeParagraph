/**
 * 文単位に分割する。読み上げ(ブラウザによっては長文の発話が途中で止まる)や
 * 文ごとの分析に使う。区切り文字は前の文に含める。
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '\n') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
    if (/[。．.!?！？]/u.test(ch)) {
      // 閉じかっこが続く場合はそれも含める
      while (i + 1 < chars.length && /[」』)）"”]/u.test(chars[i + 1])) buf += chars[++i];
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
