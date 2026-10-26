import { IconFileText, IconMicrophone, IconSettings } from '@tabler/icons-react';
import type { ComponentType } from 'react';

/** ナビゲーションに表示するページ。ページを増やすときはここに追加する */
export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number | string; stroke?: number }>;
}

export const navItems: NavItem[] = [
  { path: '/', label: 'エディタ', icon: IconFileText },
  { path: '/practice', label: '練習', icon: IconMicrophone },
  { path: '/settings', label: '設定', icon: IconSettings },
];
