import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { JSONValue, LanguageModel } from 'ai';
import type { Settings } from '@/features/settings/settingsSchema';

export type AiProviderId = Settings['ai']['provider'];

export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** API キーの取得ページ */
  keyUrl: string;
  keyHint: string;
  /** 設定で使うモデル名のキー */
  modelSetting: 'googleModel' | 'openaiModel' | 'anthropicModel';
  /** 一覧を取得できないときの候補 */
  suggestedModels: string[];
  createModel: (apiKey: string, modelId: string) => LanguageModel;
  /** 利用できるモデルの一覧を API から取得する */
  listModels: (apiKey: string) => Promise<string[]>;
  /** 思考過程をストリームで受け取るためのオプション */
  thinkingOptions: Record<string, Record<string, JSONValue>>;
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const ANTHROPIC_BROWSER_HEADERS = {
  // ブラウザから直接呼び出すために必要(キーはユーザー自身のもの)
  'anthropic-dangerous-direct-browser-access': 'true',
};

export const aiProviders: Record<AiProviderId, AiProvider> = {
  google: {
    id: 'google',
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'Google AI Studio で無料の API キーを作成できます(無料枠あり)。',
    modelSetting: 'googleModel',
    suggestedModels: ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-pro-latest'],
    createModel: (apiKey, modelId) => createGoogle({ apiKey })(modelId),
    thinkingOptions: { google: { thinkingConfig: { includeThoughts: true } } },
    listModels: async (apiKey) => {
      const json = (await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`,
      )) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      return (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .filter((id) => id.startsWith('gemini') && !/image|tts|audio|embedding|live/.test(id));
    },
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'OpenAI Platform で API キーを作成します(従量課金)。',
    modelSetting: 'openaiModel',
    suggestedModels: ['gpt-5.5', 'gpt-5.4-mini'],
    createModel: (apiKey, modelId) => createOpenAI({ apiKey })(modelId),
    thinkingOptions: { openai: { reasoningSummary: 'auto' } },
    listModels: async (apiKey) => {
      const json = (await getJson('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })) as { data?: { id: string }[] };
      return (json.data ?? [])
        .map((m) => m.id)
        .filter(
          (id) =>
            /^(gpt|o\d|chatgpt)/.test(id) &&
            !/audio|realtime|image|tts|transcribe|search|embedding|moderation/.test(id),
        )
        .sort()
        .reverse();
    },
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'Anthropic Console で API キーを作成します(従量課金)。',
    modelSetting: 'anthropicModel',
    suggestedModels: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
    createModel: (apiKey, modelId) =>
      createAnthropic({ apiKey, headers: ANTHROPIC_BROWSER_HEADERS })(modelId),
    thinkingOptions: { anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } },
    listModels: async (apiKey) => {
      const json = (await getJson('https://api.anthropic.com/v1/models?limit=100', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          ...ANTHROPIC_BROWSER_HEADERS,
        },
      })) as { data?: { id: string }[] };
      return (json.data ?? []).map((m) => m.id);
    },
  },
};
