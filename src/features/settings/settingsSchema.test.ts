import { describe, expect, it } from 'vitest';
import { defaultSettings, parseSettings } from './settingsSchema';

describe('parseSettings', () => {
  it('空入力では既定値を返す', () => {
    expect(parseSettings(undefined)).toEqual(defaultSettings);
    expect(defaultSettings.estimation.charsPerMinute).toBe(300);
  });

  it('不足項目や不正値だけを既定値で補う', () => {
    const s = parseSettings({ estimation: { charsPerMinute: 'x', paragraphPauseSec: 2 } });
    expect(s.estimation.charsPerMinute).toBe(300);
    expect(s.estimation.paragraphPauseSec).toBe(2);
    expect(s.editor.fontSize).toBe('md');
  });

  it('壊れたデータでも既定値にフォールバックする', () => {
    expect(parseSettings('broken')).toEqual(defaultSettings);
  });
});

describe('estimation method', () => {
  it('既定は文字数、未知の方式は既定に戻す', () => {
    expect(defaultSettings.estimation.method).toBe('chars');
    expect(defaultSettings.estimation.morasPerMinute).toBe(420);
    expect(parseSettings({ estimation: { method: 'unknown' } }).estimation.method).toBe('chars');
    expect(parseSettings({ estimation: { method: 'morph' } }).estimation.method).toBe('morph');
  });
});
