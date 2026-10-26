export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  author: string;
  url: string;
  text: string;
}

/** ビルド時に scripts/generate-licenses.mjs が生成する一覧を遅延読み込みする */
export async function loadLicenses(): Promise<LicenseEntry[]> {
  const mod = await import('@/generated/licenses.json');
  return mod.default as LicenseEntry[];
}
