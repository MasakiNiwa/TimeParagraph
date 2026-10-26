// kuromoji の辞書を public/ にコピーする(Git 管理外。dev / build 時に自動実行)
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/kuromoji/dict');
const dest = join(root, 'public/dict/kuromoji');

if (!existsSync(src)) {
  console.error('kuromoji の辞書が見つかりません。npm install を実行してください。');
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('dict: copied kuromoji dictionary');
