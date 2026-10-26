/** テキストをファイルとしてダウンロードさせる */
export function downloadText(fileName: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** ファイル名に使えない文字を置き換える */
export function safeFileName(name: string): string {
  return (name.trim() || 'timeparagraph').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}
