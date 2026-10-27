import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { SpeedNumberInput } from './SpeedNumberInput';

beforeAll(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
});
afterEach(cleanup);
it('途中の桁では設定を変えず、確定時に範囲内の値を渡す', () => {
  const update = vi.fn();
  render(
    <MantineProvider>
      <SpeedNumberInput value={300} onChange={update} isChars />
    </MantineProvider>,
  );
  const input = screen.getByRole('textbox', { name: '話す速さの数値' });
  fireEvent.change(input, { target: { value: '1' } });
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '1200' } });
  fireEvent.blur(input);
  expect(update).toHaveBeenCalledWith(1000);
});
it('空欄で確定しても既存の設定を失わない', () => {
  const update = vi.fn();
  render(
    <MantineProvider>
      <SpeedNumberInput value={420} onChange={update} isChars={false} />
    </MantineProvider>,
  );
  const input = screen.getByRole('textbox', { name: '話す速さの数値' });
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(update).toHaveBeenCalledWith(420);
});
