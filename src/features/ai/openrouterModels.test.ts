import { describe, expect, it } from 'vitest';
import {
  filterModels,
  formatContext,
  formatPrice,
  groupByVendor,
  parseOpenRouterModels,
  shortModelName,
} from './openrouterModels';

const json = {
  data: [
    {
      id: 'google/gemini-3.5-flash',
      name: 'Google: Gemini 3.5 Flash',
      context_length: 1048576,
      pricing: { prompt: '0.0000003', completion: '0.0000025' },
      supported_parameters: ['tools', 'reasoning', 'temperature'],
    },
    {
      id: 'meta-llama/llama-4-scout:free',
      name: 'Meta: Llama 4 Scout (free)',
      context_length: 128000,
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: ['tools'],
    },
    { id: 'acme/no-tools', name: 'Acme', pricing: null, supported_parameters: null },
    { name: 'id がない項目' },
  ],
};

describe('parseOpenRouterModels', () => {
  const models = parseOpenRouterModels(json);

  it('料金・ツール対応・思考対応・無料を読み取り、壊れた項目は捨てる', () => {
    expect(models).toHaveLength(3);
    expect(models[0]).toMatchObject({
      vendor: 'google',
      tools: true,
      reasoning: true,
      free: false,
    });
    expect(models[0].promptPrice).toBeCloseTo(0.3);
    expect(models[1]).toMatchObject({ free: true, tools: true, reasoning: false });
    expect(models[2]).toMatchObject({ tools: false, promptPrice: null, free: false });
  });

  it('絞り込み・提供元ごとのまとめ・表示用の整形', () => {
    const f = { query: '', freeOnly: false, toolsOnly: true, reasoningOnly: false };
    expect(filterModels(models, f).map((m) => m.id)).toEqual([
      'google/gemini-3.5-flash',
      'meta-llama/llama-4-scout:free',
    ]);
    expect(filterModels(models, { ...f, freeOnly: true }).map((m) => m.vendor)).toEqual([
      'meta-llama',
    ]);
    expect(filterModels(models, { ...f, query: 'GEMINI flash' })).toHaveLength(1);
    expect(groupByVendor(models).map(([v]) => v)).toEqual(['acme', 'google', 'meta-llama']);
    expect(shortModelName('google/gemini-3.5-flash')).toBe('gemini-3.5-flash');
    expect(formatPrice(models[0])).toBe('$0.30 / $2.5');
    expect(formatPrice(models[1])).toBe('無料');
    expect(formatContext(1048576)).toBe('1.0M');
    expect(formatContext(128000)).toBe('128K');
  });

  it('想定外の応答では空の一覧', () => {
    expect(parseOpenRouterModels(null)).toEqual([]);
    expect(parseOpenRouterModels({ data: 'x' })).toEqual([]);
  });
});
