import * as Comlink from 'comlink';
import { create } from 'zustand';
import type { MorphWorkerApi } from '@/workers/morph.worker';

export type MorphStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MorphState {
  status: MorphStatus;
  /** 解析結果が増えるたびに増える(推定の再計算トリガー) */
  version: number;
}

export const useMorphStore = create<MorphState>(() => ({ status: 'idle', version: 0 }));

const DIC_PATH = `${import.meta.env.BASE_URL}dict/kuromoji/`;
const CACHE_LIMIT = 3000;

/** テキスト → モーラ数。編集のたびに増えるので上限を超えたら古いものから捨てる */
const cache = new Map<string, number>();
const inflight = new Set<string>();
let worker: Comlink.Remote<MorphWorkerApi> | null = null;

function getWorker() {
  if (!worker) {
    const w = new Worker(new URL('../../workers/morph.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker = Comlink.wrap<MorphWorkerApi>(w);
  }
  return worker;
}

export function getCachedMora(text: string): number | undefined {
  return cache.get(text);
}

/** 未解析のテキストを Worker で解析し、結果をキャッシュする */
export async function analyzeTexts(texts: string[]) {
  const todo = [...new Set(texts)].filter((t) => !cache.has(t) && !inflight.has(t));
  if (todo.length === 0) return;
  todo.forEach((t) => inflight.add(t));
  if (useMorphStore.getState().status !== 'ready') useMorphStore.setState({ status: 'loading' });
  try {
    const results = await getWorker().analyze(DIC_PATH, todo);
    todo.forEach((t, i) => cache.set(t, results[i].mora));
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    useMorphStore.setState((s) => ({ status: 'ready', version: s.version + 1 }));
  } catch (e) {
    console.error('形態素解析に失敗しました', e);
    useMorphStore.setState({ status: 'error' });
  } finally {
    todo.forEach((t) => inflight.delete(t));
  }
}
