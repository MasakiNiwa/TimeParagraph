import { expect, it } from 'vitest';
import { parseDuration } from './format';

it('いろいろな書き方の時間を秒にする', () => {
  expect(parseDuration('1:30')).toBe(90);
  expect(parseDuration('90')).toBe(90);
  expect(parseDuration('1分30秒')).toBe(90);
  expect(parseDuration('2分')).toBe(120);
  expect(parseDuration('45秒')).toBe(45);
  expect(parseDuration('１：０５')).toBe(65);
  expect(parseDuration('1:02:03')).toBe(3723);
  expect(parseDuration('')).toBeNull();
  expect(parseDuration('abc')).toBeNull();
  expect(parseDuration('分')).toBeNull();
});
