/** 秒を「m:ss」または「h:mm:ss」形式にする */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 秒を「3分20秒」のような読みやすい形式にする */
export function formatDurationJa(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}時間${m}分${r}秒`;
  if (m > 0) return `${m}分${r}秒`;
  return `${r}秒`;
}

/**
 * 入力された時間を秒にする。「1:30」「90」(秒)「1分30秒」「2分」「45秒」に対応。
 * 全角数字・全角コロンも受け付ける。読めないときは null
 */
export function parseDuration(input: string): number | null {
  const s = input
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ':');
  if (!s) return null;
  let m = /^(\d+):(\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  if (/^\d+$/.test(s)) return Number(s);
  m = /^(?:(\d+)\s*分)?\s*(?:(\d+)\s*秒)?$/.exec(s);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return null;
}
