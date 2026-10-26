import { createTheme, type MantineColorsTuple } from '@mantine/core';

// 彩度を抑えた青灰色。ライト/ダークどちらでも目に優しいアクセント
const calm: MantineColorsTuple = [
  '#eef3f6',
  '#dde5eb',
  '#b9c9d5',
  '#93abbe',
  '#7492aa',
  '#61839e',
  '#567a97',
  '#466883',
  '#3c5c75',
  '#2e4f67',
];

// ダークモード用。コントラストを強くしすぎない、落ち着いた暗色
const dark: MantineColorsTuple = [
  '#c4c8ce', // 本文テキスト
  '#a7acb4',
  '#8a9099',
  '#6c727c',
  '#4f5560',
  '#3a3f48', // 枠線
  '#2b2f36', // 入力欄など
  '#22252b', // 本体背景
  '#1c1f24',
  '#16181c',
];

export const theme = createTheme({
  primaryColor: 'calm',
  primaryShade: { light: 6, dark: 7 },
  colors: { calm, dark },
  defaultRadius: 'md',
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", Meiryo, system-ui, sans-serif',
  headings: { fontWeight: '600' },
  cursorType: 'pointer',
});
