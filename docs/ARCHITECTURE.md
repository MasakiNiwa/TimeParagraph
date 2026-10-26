# アーキテクチャ

## 技術スタック

- Vite + React + TypeScript
- UI: Mantine(ダークモード / Accordion / AppShell)
- 状態管理: Zustand(設定は localStorage に永続化)+ zundo(元に戻す/やり直す)
- 保存: Dexie(IndexedDB)に原稿を自動保存
- 並べ替え: dnd-kit
- スキーマ: Zod(保存データ・取込データ・AI 入出力の検証を一元化)
- ルーティング: React Router(GitHub Pages のため HashRouter)

## ディレクトリ構成

```
src/
  app/            レイアウト・ナビゲーション定義(routes.tsx にページを追加)
  components/     汎用 UI(CollapsibleSections など)
  domain/         UI に依存しないロジック(文書スキーマ・時間推定・整形)
  features/       機能単位のモジュール
    editor/       パラグラフエディタ
    settings/     設定(スキーマ・ストア・ページ)
    help/         ヘルプ・クレジット
  lib/            アプリ情報などの共通処理
  generated/      ビルド時に生成(Git 管理外)
scripts/          ビルド用スクリプト
```

## 設計方針

- **スキーマに既定値を持たせる**: 設定は `.catch()` で項目ごとに既定値を持つため、項目の追加・削除をしても古い保存データを安全に読み込めます。
- **ナビゲーションは定義駆動**: `src/app/routes.tsx` の `navItems` に追加すると、PC のサイドバーとスマホの下部ナビの両方に反映されます。
- **折りたたみセクション**: 設定・ヘルプは `CollapsibleSections` で構成し、既定はすべて閉じた状態です。

## 文書モデル

`src/domain/document.ts` で Zod スキーマとして定義しています。

- ブロック(`paragraph` / `heading`)のフラットな配列。見出しがセクションの区切りになります。
- 段落ごとに `speedFactor`(話す速さの倍率)、`pauseAfterSec`(後の間)、`note`(話さないメモ)を持ちます。
- `schemaVersion` を持ち、`parseDocument` で読み込み時の検証・移行を行います。

## 時間推定

`src/domain/estimate.ts` の `Estimator` インターフェースで推定方式を差し替えられます(現在は文字数ベース)。
`estimateDocument` が段落ごとの所要時間・開始時刻・合計を、`summarizeSections` が見出しごとの合計を返します。

## 状態と履歴

- `features/editor/documentStore.ts` が編集操作(追加・分割・結合・移動・クリアなど)をすべて持ちます。
- 同じ段落への連続入力は 1 秒以内なら 1 つの履歴にまとめます。
- `features/editor/persistence.ts` が起動時の読み込みと変更の自動保存(400ms デバウンス)を担当します。

## ライセンス管理

- アプリ本体: MIT(`LICENSE`)
- 依存ライブラリ: `npm run licenses`(`dev` / `build` 時に自動実行)が `package-lock.json` の本番依存からライセンス情報を収集し、
  - `src/generated/licenses.json`(ヘルプページのクレジット表示用)
  - `public/THIRD_PARTY_LICENSES.txt`(配布物に同梱)

  を生成します。

- npm 以外から取り込んだ資産(辞書データなど)は `scripts/extra-licenses.json` に手動で追記します。
