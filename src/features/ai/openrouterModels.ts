/** OpenRouter のモデル一覧(料金・ツール対応などの情報つき) */
export interface OpenRouterModel {
  id: string;
  name: string;
  /** 提供元(id の「/」より前。例: google) */
  vendor: string;
  contextLength: number;
  /** 100 万トークンあたりの料金(USD)。不明なら null */
  promptPrice: number | null;
  completionPrice: number | null;
  free: boolean;
  /** アプリの機能(ツール)を呼び出せるか */
  tools: boolean;
  /** 思考(reasoning)に対応しているか */
  reasoning: boolean;
}

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

interface RawModel {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown } | null;
  supported_parameters?: unknown;
}

const perMillion = (v: unknown): number | null => {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n * 1_000_000 : null;
};

/** API の応答をアプリで使う形に変換する。形のおかしい項目は捨てる */
export function parseOpenRouterModels(json: unknown): OpenRouterModel[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];
  const out: OpenRouterModel[] = [];
  for (const raw of data as RawModel[]) {
    if (typeof raw?.id !== 'string' || !raw.id) continue;
    const params = Array.isArray(raw.supported_parameters)
      ? raw.supported_parameters.filter((p): p is string => typeof p === 'string')
      : [];
    const promptPrice = perMillion(raw.pricing?.prompt);
    const completionPrice = perMillion(raw.pricing?.completion);
    out.push({
      id: raw.id,
      name: typeof raw.name === 'string' && raw.name ? raw.name : raw.id,
      vendor: raw.id.includes('/') ? raw.id.split('/')[0] : 'other',
      contextLength: typeof raw.context_length === 'number' ? raw.context_length : 0,
      promptPrice,
      completionPrice,
      free: raw.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0),
      tools: params.includes('tools'),
      reasoning: params.includes('reasoning') || params.includes('include_reasoning'),
    });
  }
  return out;
}

/** モデル一覧はキーなしで取得できる */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(OPENROUTER_MODELS_URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return parseOpenRouterModels(await res.json());
}

export interface ModelFilter {
  query: string;
  freeOnly: boolean;
  toolsOnly: boolean;
  reasoningOnly: boolean;
}

export function filterModels(models: OpenRouterModel[], f: ModelFilter): OpenRouterModel[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return models.filter(
    (m) =>
      (!f.freeOnly || m.free) &&
      (!f.toolsOnly || m.tools) &&
      (!f.reasoningOnly || m.reasoning) &&
      words.every((w) => m.id.toLowerCase().includes(w) || m.name.toLowerCase().includes(w)),
  );
}

/** 提供元ごとにまとめ、提供元の名前順・モデル名順に並べる */
export function groupByVendor(models: OpenRouterModel[]): [string, OpenRouterModel[]][] {
  const groups = new Map<string, OpenRouterModel[]>();
  for (const m of models) groups.set(m.vendor, [...(groups.get(m.vendor) ?? []), m]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([v, ms]) => [v, ms.sort((a, b) => a.name.localeCompare(b.name))]);
}

/** 表示用の短い名前(例: google/gemini-3.5-flash → gemini-3.5-flash) */
export const shortModelName = (id: string) =>
  id.includes('/') ? id.slice(id.indexOf('/') + 1) : id;

export function formatPrice(m: OpenRouterModel): string {
  if (m.free) return '無料';
  if (m.promptPrice === null || m.completionPrice === null) return '料金不明';
  const f = (n: number) => (n >= 10 ? n.toFixed(0) : n >= 1 ? n.toFixed(1) : n.toFixed(2));
  return `$${f(m.promptPrice)} / $${f(m.completionPrice)}`;
}

export function formatContext(n: number): string {
  if (!n) return '';
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
    : `${Math.round(n / 1000)}K`;
}
