# TimeParagraph

パラグラフ単位で話す時間と内容を考えるエディタ

会議・ミーティング・講義などで話す内容をパラグラフごとに組み立てながら、各パラグラフを話すのにかかる時間を推定し、全体の所要時間を計算します。

**公開ページ:** https://masakiniwa.github.io/TimeParagraph/

## 開発

Node.js 22 以上が必要です。

```bash
npm install
npm run dev        # 開発サーバー
npm test           # テスト
npm run lint       # Lint
npm run typecheck  # 型チェック
npm run build      # 本番ビルド(dist/)
```

`main` ブランチへのマージで GitHub Actions が GitHub Pages へ自動デプロイします。

## ドキュメント

- [ロードマップ](docs/ROADMAP.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)

## ライセンス

[MIT License](LICENSE)

利用しているライブラリのライセンスは、アプリのヘルプページ「クレジット」または配布物の `THIRD_PARTY_LICENSES.txt` で確認できます。
