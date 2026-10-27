import { create } from 'zustand';
import type { Block } from '@/domain/document';
import { splitSentences } from '@/domain/sentences';
import { useSettingsStore } from '@/features/settings/settingsStore';

export type SpeechStatus = 'idle' | 'playing' | 'paused';

interface SpeechState {
  status: SpeechStatus;
  /** 読み上げ中(または一時停止中)のブロック */
  currentId: string | null;
  /** 読み上げで時間を計測中か */
  measuring: boolean;
  error: string | null;
}

export const useSpeechStore = create<SpeechState>(() => ({
  status: 'idle',
  currentId: null,
  measuring: false,
  error: null,
}));

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

interface QueueItem {
  blockId: string;
  sentences: string[];
  /** 段落の後に入れる間(秒) */
  pauseAfterSec: number;
}

/** 読み上げ計測の結果。laps は段落ごとの時間(読み上げ時間 + 段落の後の間) */
export type MeasureDone = (laps: number[], completed: boolean) => void;

let queue: QueueItem[] = [];
let blockIdx = 0;
let sentenceIdx = 0;
/** cancel 後に古い発話の onend が届いても無視するための世代番号 */
let generation = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;
let gap: { remainingMs: number; startedAt: number | null } | null = null;

/** 計測用の状態 */
let measure: {
  onDone: MeasureDone;
  laps: number[];
  /** 現在の段落の読み上げ開始時刻 */
  blockStart: number | null;
  /** 現在の文の読み上げ開始時刻 */
  sentenceStart: number | null;
  /** 一時停止などで計測から除く時間(ms) */
  excludedMs: number;
} | null = null;

/** 一時停止した時刻(停止中の時間を計測から除くため) */
let pausedAt: number | null = null;

const now = () => performance.now();

function pickVoice(): SpeechSynthesisVoice | undefined {
  const { voiceURI } = useSettingsStore.getState().settings.speech;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.voiceURI === voiceURI) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith('ja') && v.default) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith('ja'))
  );
}

function clearPauseTimer() {
  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = null;
}

function updateGap() {
  if (gap?.startedAt !== null && gap?.startedAt !== undefined) {
    gap.remainingMs = Math.max(0, gap.remainingMs - (now() - gap.startedAt));
    gap.startedAt = null;
  }
}

function resumeGap() {
  if (!gap) return;
  const gen = generation;
  gap.startedAt = now();
  useSpeechStore.setState({ status: 'playing' });
  pauseTimer = setTimeout(() => {
    if (gen !== generation) return;
    gap = null;
    speakCurrent();
  }, gap.remainingMs);
}

function finishMeasure(completed: boolean) {
  const m = measure;
  measure = null;
  useSpeechStore.setState({ measuring: false });
  if (m && gap && m.laps.length) {
    updateGap();
    m.laps[m.laps.length - 1] = Math.max(0, m.laps.at(-1)! - gap.remainingMs / 1000);
  }
  m?.onDone(m.laps, completed);
}

/** 段落を読み終えたとき: 計測を記録し、間を置いて次の段落へ */
function onBlockEnd(gen: number) {
  const item = queue[blockIdx];
  if (measure && measure.blockStart !== null) {
    const speakMs = now() - measure.blockStart - measure.excludedMs;
    measure.laps.push(Math.max(0, speakMs) / 1000 + item.pauseAfterSec);
    measure.blockStart = null;
    measure.sentenceStart = null;
    measure.excludedMs = 0;
  }
  blockIdx++;
  sentenceIdx = 0;
  if (blockIdx >= queue.length) {
    stop(true);
    return;
  }
  if (gen !== generation) return;
  gap = { remainingMs: item.pauseAfterSec * 1000, startedAt: null };
  resumeGap();
}

function speakCurrent() {
  clearPauseTimer();
  const gen = ++generation;
  const item = queue[blockIdx];
  if (!item) {
    stop(true);
    return;
  }
  useSpeechStore.setState({ status: 'playing', currentId: item.blockId });
  const sentence = item.sentences[sentenceIdx];
  if (sentence === undefined) {
    onBlockEnd(gen);
    return;
  }
  const u = new SpeechSynthesisUtterance(sentence);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'ja-JP';
  u.rate = useSettingsStore.getState().settings.speech.rate;
  const markStart = () => {
    if (!measure) return;
    const t = now();
    measure.blockStart ??= t;
    measure.sentenceStart = t;
  };
  markStart();
  u.onstart = () => {
    // 文の実際の発話開始時刻(一時停止時に読み直す分を除くために使う)
    if (gen === generation && measure) measure.sentenceStart = now();
  };
  const advance = () => {
    if (gen !== generation) return;
    sentenceIdx++;
    if (sentenceIdx >= item.sentences.length) onBlockEnd(gen);
    else speakCurrent();
  };
  u.onend = advance;
  u.onerror = (e) => {
    if (gen !== generation || e.error === 'interrupted' || e.error === 'canceled') return;
    console.warn('読み上げエラー', e.error);
    useSpeechStore.setState({
      error: '読み上げに失敗しました。声や端末の音声設定を確認して、もう一度お試しください。',
    });
    stop(false);
  };
  try {
    speechSynthesis.speak(u);
  } catch (error) {
    console.warn('読み上げを開始できませんでした', error);
    useSpeechStore.setState({
      error: '読み上げを開始できませんでした。声や端末の音声設定を確認してください。',
    });
    stop(false);
  }
}

function buildQueue(blocks: Block[], filter: (b: Block) => boolean, pauses?: Map<string, number>) {
  const defaultPause = useSettingsStore.getState().settings.estimation.paragraphPauseSec;
  return blocks
    .filter((b) => b.text.trim() && filter(b))
    .map((b) => ({
      blockId: b.id,
      sentences: splitSentences(b.text),
      pauseAfterSec:
        b.kind === 'heading' ? 0.5 : (pauses?.get(b.id) ?? b.pauseAfterSec ?? defaultPause),
    }));
}

function start(startIndex: number) {
  blockIdx = Math.max(0, startIndex);
  sentenceIdx = 0;
  generation++;
  clearPauseTimer();
  gap = null;
  pausedAt = null;
  useSpeechStore.setState({ error: null });
  speechSynthesis.cancel();
  speakCurrent();
}

/** 指定したブロックから読み上げを始める */
export function speakFrom(blocks: Block[], startId?: string) {
  if (!speechSupported) return;
  if (measure) finishMeasure(false);
  const { readHeadings } = useSettingsStore.getState().settings.speech;
  queue = buildQueue(blocks, (b) => b.kind === 'paragraph' || readHeadings);
  start(startId ? queue.findIndex((q) => q.blockId === startId) : 0);
}

/**
 * 原稿の最初から読み上げて、段落ごとの時間を計測する。見出しは読まない。
 * pauses は段落ごとの後の間(秒)。推定と同じ値を使うと比較しやすい。
 */
export function measureBySpeech(blocks: Block[], pauses: Map<string, number>, onDone: MeasureDone) {
  if (!speechSupported) return;
  if (measure) finishMeasure(false);
  queue = buildQueue(blocks, (b) => b.kind === 'paragraph', pauses);
  // 最後の段落の後には間を入れない(推定と同じ)
  if (queue.length) queue[queue.length - 1].pauseAfterSec = 0;
  measure = { onDone, laps: [], blockStart: null, sentenceStart: null, excludedMs: 0 };
  useSpeechStore.setState({ measuring: true });
  start(0);
}

/** 一時停止(ブラウザの pause は不安定なため、停止して位置を覚えておく) */
export function pause() {
  if (useSpeechStore.getState().status !== 'playing') return;
  generation++;
  clearPauseTimer();
  updateGap();
  speechSynthesis.cancel();
  if (measure) {
    // 途中まで読んだ文は再開時に読み直すので、その分を計測から除く
    if (measure.sentenceStart !== null) measure.excludedMs += now() - measure.sentenceStart;
    measure.sentenceStart = null;
    pausedAt = now();
  }
  useSpeechStore.setState({ status: 'paused' });
}

export function resume() {
  if (useSpeechStore.getState().status !== 'paused') return;
  // 段落の途中で止めた場合だけ、止めていた時間を除く(段落の間で止めた場合は次の段落から計測)
  if (measure && pausedAt !== null && measure.blockStart !== null)
    measure.excludedMs += now() - pausedAt;
  pausedAt = null;
  if (gap) resumeGap();
  else speakCurrent();
}

/** 停止する。計測中なら、そこまでの記録を「途中まで」として返す */
export function stop(completed = false) {
  generation++;
  clearPauseTimer();
  if (speechSupported) speechSynthesis.cancel();
  queue = [];
  useSpeechStore.setState({ status: 'idle', currentId: null });
  if (measure) finishMeasure(completed);
  gap = null;
  pausedAt = null;
}

/** 計測を結果を返さずに取りやめる(ページを離れたときなど) */
export function cancelMeasure() {
  measure = null;
  useSpeechStore.setState({ measuring: false });
}

/** 前後の段落へ移動する(計測中は計測を中止する) */
export function skip(delta: number) {
  if (useSpeechStore.getState().status === 'idle') return;
  if (measure) {
    const m = measure;
    measure = null;
    useSpeechStore.setState({ measuring: false });
    m.onDone([], false);
  }
  blockIdx = Math.min(Math.max(0, blockIdx + delta), queue.length - 1);
  sentenceIdx = 0;
  generation++;
  clearPauseTimer();
  gap = null;
  speechSynthesis.cancel();
  speakCurrent();
}
