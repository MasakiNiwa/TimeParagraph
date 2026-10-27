import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

afterEach(() => vi.unstubAllGlobals());
it('画面が戻ったときに解除済みの Wake Lock を取得し直す', async () => {
  const first = { released: false, release: vi.fn(async () => {}) };
  const second = { released: false, release: vi.fn(async () => {}) };
  const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  vi.stubGlobal('navigator', { wakeLock: { request } });
  const { unmount } = renderHook(() => useWakeLock(true));
  await act(async () => {});
  expect(request).toHaveBeenCalledTimes(1);
  first.released = true;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(request).toHaveBeenCalledTimes(2);
  unmount();
  expect(second.release).toHaveBeenCalledTimes(1);
});
