import { z } from 'zod';

/** リハーサルで計測した 1 段落分の記録 */
export const LapSchema = z.object({
  blockId: z.string(),
  /** 段落の冒頭(一覧表示用) */
  excerpt: z.string(),
  /** 実際にかかった時間(秒)。次の段落へ進むまでの間を含む */
  actualSec: z.number(),
  /** 推定時間(秒)。話す時間 + 後の間 */
  estimatedSec: z.number(),
  /** 推定の後の間(秒) */
  pauseSec: z.number(),
  /** 文字数または拍数を段落の速さの倍率で割ったもの(話速の補正に使う) */
  weightedUnits: z.number(),
});
export type Lap = z.infer<typeof LapSchema>;

export const RehearsalSchema = z.object({
  id: z.string(),
  docId: z.string(),
  docTitle: z.string(),
  startedAt: z.number(),
  /** 計測時の推定方式と話速 */
  method: z.string(),
  unitsPerMinute: z.number(),
  laps: z.array(LapSchema),
  totalSec: z.number(),
  estimatedTotalSec: z.number(),
  /** 最後まで通したか(途中終了なら false) */
  completed: z.boolean(),
  /** 計測方法: 自分で話した(manual)/ 読み上げで計測した(speech)。古い記録にはない */
  source: z.enum(['manual', 'speech']).optional(),
  /** 読み上げで計測したときの読み上げ速度 */
  speechRate: z.number().optional(),
});
export type Rehearsal = z.infer<typeof RehearsalSchema>;

/**
 * 実測から自分の話す速さ(単位/分)を求める。
 * 推定の間を差し引いた時間で割る。計測が短すぎる場合は null。
 */
export function calibrateSpeed(laps: Lap[], minSpeakSec = 10): number | null {
  let units = 0;
  let speakSec = 0;
  for (const l of laps) {
    units += l.weightedUnits;
    speakSec += Math.max(0, l.actualSec - l.pauseSec);
  }
  if (speakSec < minSpeakSec || units <= 0) return null;
  // 設定の刻みに合わせて 5 単位で丸める
  return Math.round(((units / speakSec) * 60) / 5) * 5;
}
