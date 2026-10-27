import { useEffect, useState } from 'react';
import { speechSupported } from './speechStore';

/**
 * 声の一覧を整える。日本語の声があればそれだけにし、voiceURI の重複を除く。
 * (Windows の Chrome / Edge などでは、同じ voiceURI の声が複数返ることがある)
 */
export function pickVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const ja = all.filter((v) => v.lang.replace('_', '-').startsWith('ja'));
  const seen = new Set<string>();
  return (ja.length ? ja : all).filter((v) => {
    if (!v.voiceURI || seen.has(v.voiceURI)) return false;
    seen.add(v.voiceURI);
    return true;
  });
}

/** 利用できる声の一覧(日本語の声を優先し、重複を除く) */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported) return;
    const update = () => setVoices(pickVoices(speechSynthesis.getVoices()));
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}
