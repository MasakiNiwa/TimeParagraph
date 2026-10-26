/// <reference lib="webworker" />
// 形態素解析(kuromoji)を UI スレッドから切り離して実行する Web Worker
import * as Comlink from 'comlink';
import kuromoji from 'kuromoji';
import BrowserDictionaryLoader from 'kuromoji/src/loader/BrowserDictionaryLoader.js';
import { countMoraFromTokens } from '@/domain/mora';

/**
 * 辞書の読み込みを fetch + DecompressionStream に置き換える。
 * サーバーが Content-Encoding: gzip を付けて配信した場合(ブラウザが展開済み)にも対応するため、
 * gzip のマジックナンバーを見て必要なときだけ展開する。
 */
BrowserDictionaryLoader.prototype.loadArrayBuffer = (url, callback) => {
  fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      const buf = await res.arrayBuffer();
      const head = new Uint8Array(buf, 0, 2);
      if (head[0] !== 0x1f || head[1] !== 0x8b) return buf;
      const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).arrayBuffer();
    })
    .then(
      (buf) => callback(null, buf),
      (err) => callback(err, null),
    );
};

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

let tokenizer: Promise<Tokenizer> | null = null;

function load(dicPath: string): Promise<Tokenizer> {
  tokenizer ??= new Promise<Tokenizer>((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, t) => (err ? reject(err) : resolve(t)));
  }).catch((e) => {
    tokenizer = null;
    throw e;
  });
  return tokenizer;
}

export interface MorphResult {
  mora: number;
  tokenCount: number;
}

const api = {
  async init(dicPath: string): Promise<void> {
    await load(dicPath);
  },
  async analyze(dicPath: string, texts: string[]): Promise<MorphResult[]> {
    const t = await load(dicPath);
    return texts.map((text) => {
      const tokens = t.tokenize(text);
      return {
        mora: countMoraFromTokens(
          tokens.map((k) => ({
            surface: k.surface_form,
            pos: k.pos,
            pronunciation: k.pronunciation,
            reading: k.reading,
          })),
        ),
        tokenCount: tokens.length,
      };
    });
  },
};

export type MorphWorkerApi = typeof api;

Comlink.expose(api);
