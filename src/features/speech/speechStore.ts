import { create } from 'zustand';
import type { Block } from '@/domain/document';
import { splitSentences } from '@/domain/sentences';
import { useSettingsStore } from '@/features/settings/settingsStore';

export type SpeechStatus = 'idle' | 'playing' | 'paused';

interface SpeechState {
  status: SpeechStatus;
  /** 読み上げ中(または一時停止中)のブロック */
  currentId: string | null;
}

export const useSpeechStore = create<SpeechState>(() => ({ status: 'idle', currentId: null }));

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

interface QueueItem {
  blockId: string;
  sentences: string[];
}

let queue: QueueItem[] = [];
let blockIdx = 0;
let sentenceIdx = 0;
/** cancel 後に古い発話の onend が届いても無視するための世代番号 */
let generation = 0;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const { voiceURI } = useSettingsStore.getState().settings.speech;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.voiceURI === voiceURI) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith('ja') && v.default) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith('ja'))
  );
}

function speakCurrent() {
  const gen = ++generation;
  const item = queue[blockIdx];
  if (!item) {
    stop();
    return;
  }
  useSpeechStore.setState({ status: 'playing', currentId: item.blockId });
  const sentence = item.sentences[sentenceIdx];
  if (sentence === undefined) {
    blockIdx++;
    sentenceIdx = 0;
    speakCurrent();
    return;
  }
  const u = new SpeechSynthesisUtterance(sentence);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'ja-JP';
  u.rate = useSettingsStore.getState().settings.speech.rate;
  const advance = () => {
    if (gen !== generation) return;
    sentenceIdx++;
    speakCurrent();
  };
  u.onend = advance;
  u.onerror = (e) => {
    if (gen !== generation || e.error === 'interrupted' || e.error === 'canceled') return;
    console.warn('読み上げエラー', e.error);
    advance();
  };
  speechSynthesis.speak(u);
}

/** 指定したブロックから読み上げを始める */
export function speakFrom(blocks: Block[], startId?: string) {
  if (!speechSupported) return;
  const { readHeadings } = useSettingsStore.getState().settings.speech;
  queue = blocks
    .filter((b) => b.text.trim() && (b.kind === 'paragraph' || readHeadings))
    .map((b) => ({ blockId: b.id, sentences: splitSentences(b.text) }));
  const start = startId ? queue.findIndex((q) => q.blockId === startId) : 0;
  blockIdx = Math.max(0, start);
  sentenceIdx = 0;
  speechSynthesis.cancel();
  speakCurrent();
}

/** 一時停止(ブラウザの pause は不安定なため、停止して位置を覚えておく) */
export function pause() {
  if (useSpeechStore.getState().status !== 'playing') return;
  generation++;
  speechSynthesis.cancel();
  useSpeechStore.setState({ status: 'paused' });
}

export function resume() {
  if (useSpeechStore.getState().status !== 'paused') return;
  speakCurrent();
}

export function stop() {
  generation++;
  if (speechSupported) speechSynthesis.cancel();
  queue = [];
  useSpeechStore.setState({ status: 'idle', currentId: null });
}

export function skip(delta: number) {
  if (useSpeechStore.getState().status === 'idle') return;
  blockIdx = Math.min(Math.max(0, blockIdx + delta), queue.length - 1);
  sentenceIdx = 0;
  speechSynthesis.cancel();
  speakCurrent();
}
