import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlock } from '@/domain/document';

/** 1 文字 100ms で読み上げる偽の音声合成 */
function installFakeSpeech() {
  let timers: ReturnType<typeof setTimeout>[] = [];
  class Utterance {
    onstart?: () => void;
    onend?: () => void;
    onerror?: () => void;
    voice = null;
    lang = '';
    rate = 1;
    constructor(public text: string) {}
  }
  const synth = {
    speak: (u: Utterance) => {
      timers.push(
        setTimeout(() => {
          u.onstart?.();
          timers.push(setTimeout(() => u.onend?.(), [...u.text].length * 100));
        }, 0),
      );
    },
    cancel: () => {
      timers.forEach(clearTimeout);
      timers = [];
    },
    getVoices: () => [],
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
}

describe('measureBySpeech', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    installFakeSpeech();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const blocks = [createBlock({ text: 'あいうえ。' }), createBlock({ text: 'かきく。' })];
  const pauses = new Map([
    [blocks[0].id, 1],
    [blocks[1].id, 1],
  ]);

  it('段落ごとの読み上げ時間に間を加えて記録する(最後の段落の後の間は含めない)', async () => {
    const speech = await import('./speechStore');
    const done = vi.fn();
    speech.measureBySpeech(blocks, pauses, done);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(done).toHaveBeenCalledTimes(1);
    const [laps, completed] = done.mock.calls[0];
    expect(completed).toBe(true);
    expect(laps[0]).toBeCloseTo(0.5 + 1, 1);
    expect(laps[1]).toBeCloseTo(0.4, 1);
    expect(speech.useSpeechStore.getState().status).toBe('idle');
  });

  it('一時停止していた時間と読み直した分は計測に含めない', async () => {
    const speech = await import('./speechStore');
    const done = vi.fn();
    speech.measureBySpeech(blocks, pauses, done);
    await vi.advanceTimersByTimeAsync(300); // 1 段落目の途中
    speech.pause();
    await vi.advanceTimersByTimeAsync(5000);
    speech.resume();
    await vi.advanceTimersByTimeAsync(10_000);
    const [laps] = done.mock.calls[0];
    expect(laps[0]).toBeCloseTo(1.5, 1);
  });

  it('途中で停止すると、それまでの記録を途中までとして返す', async () => {
    const speech = await import('./speechStore');
    const done = vi.fn();
    speech.measureBySpeech(blocks, pauses, done);
    await vi.advanceTimersByTimeAsync(1700); // 2 段落目の途中
    speech.stop();
    expect(done).toHaveBeenCalledWith([expect.closeTo(1.5, 1)], false);
  });

  it('前後へ移動すると計測を中止する(記録なし)', async () => {
    const speech = await import('./speechStore');
    const done = vi.fn();
    speech.measureBySpeech(blocks, pauses, done);
    await vi.advanceTimersByTimeAsync(100);
    speech.skip(1);
    expect(done).toHaveBeenCalledWith([], false);
    speech.stop();
  });
});
