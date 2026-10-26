import { useEffect } from 'react';

/** active の間、画面が自動で消えないようにする(対応ブラウザのみ) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release();
    };
  }, [active]);
}
