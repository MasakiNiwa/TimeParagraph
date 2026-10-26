// 本番依存パッケージのライセンス情報を収集し、ヘルプページ用 JSON と
// 配布物同梱用の THIRD_PARTY_LICENSES.txt を生成する。
// npm 以外から取り込んだ資産(辞書データなど)は scripts/extra-licenses.json に手動で記載する。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf-8'));
const extras = JSON.parse(readFileSync(join(root, 'scripts/extra-licenses.json'), 'utf-8'));

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.|-|$)/i;

function readLicenseText(dir) {
  if (!existsSync(dir)) return '';
  const files = readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f))
    .sort();
  return files.map((f) => readFileSync(join(dir, f), 'utf-8').trim()).join('\n\n');
}

function repoUrl(pkg) {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!repo) return pkg.homepage ?? '';
  return repo
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^([\w-]+\/[\w.-]+)$/, 'https://github.com/$1');
}

const byName = new Map();
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path || meta.dev || meta.devOptional) continue;
  const dir = join(root, path);
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const key = `${pkg.name}@${pkg.version}`;
  if (byName.has(key)) continue;
  byName.set(key, {
    name: pkg.name,
    version: pkg.version,
    license: typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'UNKNOWN'),
    author: typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name ?? ''),
    url: repoUrl(pkg),
    text: readLicenseText(dir),
  });
}

const entries = [...byName.values(), ...extras].sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(join(root, 'src/generated'), { recursive: true });
writeFileSync(join(root, 'src/generated/licenses.json'), JSON.stringify(entries, null, 2));

const txt = entries
  .map(
    (e) =>
      `${e.name}@${e.version} (${e.license})\n${e.url}\n\n${e.text || '(license text not bundled)'}`,
  )
  .join(`\n\n${'-'.repeat(72)}\n\n`);
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(
  join(root, 'public/THIRD_PARTY_LICENSES.txt'),
  `TimeParagraph - Third Party Licenses\n\n${'='.repeat(72)}\n\n${txt}\n`,
);

console.log(`licenses: ${entries.length} packages`);
