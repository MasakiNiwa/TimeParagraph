import { expect, it } from 'vitest';
import { escapeHtml } from './escapeHtml';
it('グラフのラベルから HTML 要素や属性を作れないようにする', () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & \'引用\'')).toBe(
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;引用&#39;',
  );
});
