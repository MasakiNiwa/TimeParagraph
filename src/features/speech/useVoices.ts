import { useEffect, useState } from 'react';
import { speechSupported } from './speechStore';

/** 利用できる声の一覧(日本語の声を先頭に並べる) */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported) return;
    const update = () => {
      const all = speechSynthesis.getVoices();
      const ja = all.filter((v) => v.lang.replace('_', '-').startsWith('ja'));
      setVoices(ja.length ? ja : all);
    };
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}
