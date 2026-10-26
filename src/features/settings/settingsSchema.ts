import { z } from 'zod';

/** 欠落・型不一致のときは各項目の既定値で埋めたオブジェクトにフォールバックする */
function section<T extends z.ZodRawShape>(shape: T) {
  const obj = z.object(shape);
  return obj.catch(() => obj.parse({}));
}

/**
 * アプリ設定のスキーマ。
 * 各項目に `.catch()` で既定値を持たせ、古い保存データや壊れた値を読み込んでも
 * 不足分・不正値だけが既定値に置き換わるようにしている(項目追加に強い)。
 */
export const SettingsSchema = z.object({
  estimation: section({
    /** 1分あたりに話す文字数(日本語のアナウンサーでおよそ 300 字/分) */
    charsPerMinute: z.number().min(50).max(1000).catch(300),
    /** パラグラフ間の間(秒) */
    paragraphPauseSec: z.number().min(0).max(30).catch(1),
  }),
  editor: section({
    fontSize: z.enum(['sm', 'md', 'lg']).catch('md'),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;

export function parseSettings(input: unknown): Settings {
  const result = SettingsSchema.safeParse(input ?? {});
  return result.success ? result.data : SettingsSchema.parse({});
}

export const defaultSettings: Settings = parseSettings({});
