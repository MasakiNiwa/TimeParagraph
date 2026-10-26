// kuromoji が辞書の URL 組み立てに使う Node.js の path.join だけをブラウザ向けに提供する
export function join(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, '')))
    .join('/');
}

export default { join };
