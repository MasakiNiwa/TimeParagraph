import { describe, expect, it } from 'vitest';
import { pickVoices } from './useVoices';

const voice = (voiceURI: string, lang: string) =>
  ({ voiceURI, name: voiceURI, lang, default: false, localService: true }) as SpeechSynthesisVoice;

describe('pickVoices', () => {
  it('同じ voiceURI の声が複数あっても 1 つにまとめる(Windows で発生)', () => {
    const ayumi = 'Microsoft Ayumi - Japanese (Japan)';
    const list = pickVoices([
      voice(ayumi, 'ja-JP'),
      voice(ayumi, 'ja-JP'),
      voice('Haruka', 'ja-JP'),
    ]);
    expect(list.map((v) => v.voiceURI)).toEqual([ayumi, 'Haruka']);
  });

  it('日本語の声があれば日本語だけ、なければすべてを返す', () => {
    expect(pickVoices([voice('a', 'en-US'), voice('b', 'ja_JP')]).map((v) => v.voiceURI)).toEqual([
      'b',
    ]);
    expect(pickVoices([voice('a', 'en-US'), voice('a', 'en-US')]).map((v) => v.voiceURI)).toEqual([
      'a',
    ]);
  });
});
