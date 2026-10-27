import { useEffect } from 'react';

/** 画面復帰時に OS が解除したロックも取得し直す */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    let requesting = false;
    const hidden = () => document.visibilityState === 'hidden';
    const acquire = async () => {
      if (cancelled || requesting || hidden() || (lock && !lock.released)) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled || hidden()) await next.release();
        else lock = next;
      } catch {
        // 非対応・省電力モードなどでは計測自体は続ける
      } finally {
        requesting = false;
      }
    };
    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
